// Configuración por usuario. Dos secciones:
//   1. Defaults del generador (validez, forma pago, tiempo entrega…)
//   2. Visor público (Solo Perú)
// Los datos del emisor (razón social, RUC, logo, cuentas…) se gestionan
// en /empresas — un usuario puede tener varias empresas y elegir cuál
// usa en cada proforma.
// Todo persiste en user_settings de Supabase.

import { html, raw, el, on } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { fetchUserSettings, saveUserSettings } from "../data/api.js";
import { toast } from "../lib/toast.js";
import { FORMAS_PAGO, EMISOR } from "../data/empresa.js";

const toggle = (on) => `
  <button class="toggle ${on ? "on" : ""}" data-toggle role="switch" aria-checked="${on}" style="
    width:36px;height:20px;border-radius:10px;border:none;flex-shrink:0;
    background:${on ? "var(--accent)" : "var(--border-strong)"};
    position:relative;cursor:pointer;transition:background .15s;padding:0">
    <span style="position:absolute;top:2px;left:${on?18:2}px;width:16px;height:16px;border-radius:50%;background:white;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
  </button>`;

const debounce = (fn, ms = 600) => {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

export const render = async (root) => {
  let settings = await fetchUserSettings().catch((err) => {
    console.warn("[config] fetchUserSettings:", err);
    return { publico_solo_pe: false, empresa: {}, defaults: {} };
  });

  // Defaults de fallback desde data/empresa.js (placeholders).
  const FB_DEF = {
    validez_dias: EMISOR.defaults.validezDias,
    forma_pago: EMISOR.defaults.formaPago,
    tiempo_entrega: EMISOR.defaults.tiempoEntrega,
    lugar_entrega: EMISOR.defaults.lugarEntrega,
    garantia: EMISOR.defaults.garantia,
    condiciones: EMISOR.defaults.condiciones,
  };

  const defaultInput = (key, label, placeholder, type = "text") => `
    <label class="gen-field">
      <span>${label}</span>
      <input class="input" type="${type}" data-section="defaults" data-key="${key}"
             value="${(settings.defaults?.[key] ?? "")}"
             placeholder="${placeholder || ""}">
    </label>`;

  const formaPagoSelect = `
    <label class="gen-field gen-field-full">
      <span>Forma de pago</span>
      <select class="input" data-section="defaults" data-key="forma_pago">
        <option value="">— (usá el default del sistema)</option>
        ${FORMAS_PAGO.map((f) => `<option value="${f}" ${settings.defaults?.forma_pago === f ? "selected" : ""}>${f}</option>`).join("")}
      </select>
    </label>`;

  const node = el(html`
    <div class="page fade-in" style="max-width:820px">
      <div class="page-header">
        <div>
          <h1 class="page-title">Configuración</h1>
          <p class="page-sub">Datos del emisor, defaults del generador y visor público. Todo se guarda automático.</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-body" style="display:flex;justify-content:space-between;align-items:center;gap:16px">
          <div>
            <div style="font-size:13.5px;font-weight:600">Datos del emisor</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px">
              Ahora se gestionan en la sección <b>Empresas</b> — podés tener varias y elegir cuál usa cada proforma.
            </div>
          </div>
          <a href="#/empresas" class="btn">Ir a Empresas</a>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title">${raw(icon("settings", 13))} Defaults del generador</div></div>
        <div class="card-body">
          <p style="font-size:12px;color:var(--text-3);margin:0 0 12px">
            Valores que prellena el editor al crear una nueva proforma.
          </p>
          <div class="gen-form">
            ${raw(defaultInput("validez_dias", "Validez (días)", FB_DEF.validez_dias, "number"))}
            ${raw(defaultInput("tiempo_entrega", "Tiempo de entrega", FB_DEF.tiempo_entrega))}
            ${raw(defaultInput("lugar_entrega", "Lugar de entrega", FB_DEF.lugar_entrega))}
            ${raw(defaultInput("garantia", "Garantía", FB_DEF.garantia))}
            ${raw(defaultInput("condiciones", "Condiciones comerciales", FB_DEF.condiciones))}
            ${raw(formaPagoSelect)}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">${raw(icon("shield", 13))} Visor público</div></div>
        <div class="card-body" style="padding:0">
          <div style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:16px">
            <div>
              <div style="font-size:13.5px;font-weight:600">Solo visible desde Perú</div>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px;max-width:560px">
                Los links públicos solo se cargan si el visitante está geolocalizado en Perú.
                Fuera del país aparece un mensaje de bloqueo y la apertura queda registrada para auditoría.
                <br><em style="color:var(--text-mute)">La geo se hace en el cliente y puede falsificarse editando el navegador. Es disuasivo, no defensivo.</em>
              </div>
            </div>
            ${raw(toggle(settings.publico_solo_pe))}
          </div>
        </div>
      </div>
    </div>
  `);
  root.replaceChildren(node);

  // Indicador inline de "guardando…"
  const flashSaved = () => {
    let s = node.querySelector("[data-saved-flag]");
    if (!s) {
      s = el(`<div data-saved-flag style="position:fixed;bottom:18px;right:18px;background:var(--accent);color:white;padding:6px 12px;border-radius:6px;font-size:12px;box-shadow:var(--shadow-md);opacity:0;transition:opacity .15s">Guardado</div>`);
      document.body.appendChild(s);
    }
    s.style.opacity = "1";
    clearTimeout(s._t);
    s._t = setTimeout(() => { s.style.opacity = "0"; }, 1200);
  };

  const saveSection = async (section, key, value) => {
    const current = settings[section] || {};
    // Si el value es vacío, lo borramos del objeto (no spamea NULLs).
    const next = { ...current };
    if (value === "" || value === null || value === undefined) delete next[key];
    else next[key] = value;
    try {
      await saveUserSettings({ [section]: next });
      settings[section] = next;
      flashSaved();
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude guardar", { type: "err" });
    }
  };

  const debouncedSave = debounce(saveSection, 600);

  // Inputs de empresa / defaults: autosave debounced.
  on(node, "input", "[data-section]", (ev) => {
    const section = ev.target.dataset.section;
    const key = ev.target.dataset.key;
    let value = ev.target.value;
    if (ev.target.type === "number") value = value === "" ? "" : Number(value);
    debouncedSave(section, key, value);
  });
  on(node, "change", "select[data-section]", (ev) => {
    saveSection(ev.target.dataset.section, ev.target.dataset.key, ev.target.value);
  });

  // Toggle Solo Perú: save inmediato.
  on(node, "click", "[data-toggle]", async (_, btn) => {
    const newVal = !btn.classList.contains("on");
    btn.classList.toggle("on", newVal);
    btn.style.background = newVal ? "var(--accent)" : "var(--border-strong)";
    btn.setAttribute("aria-checked", String(newVal));
    const dot = btn.querySelector("span");
    if (dot) dot.style.left = (newVal ? 18 : 2) + "px";
    try {
      await saveUserSettings({ publico_solo_pe: newVal });
      settings.publico_solo_pe = newVal;
      flashSaved();
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude guardar", { type: "err" });
    }
  });
};
