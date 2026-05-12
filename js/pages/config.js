// Configuración — settings globales por usuario. Persiste en
// user_settings de Supabase.
import { html, raw, el, on } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { fetchUserSettings, saveUserSettings } from "../data/api.js";
import { toast } from "../lib/toast.js";

const DISCLOSURE_OPTS = [
  { v: "off",   l: "Sin aviso",  d: "No se muestra ningún aviso al cliente." },
  { v: "soft",  l: "Aviso suave (default)", d: "Una frase chica en el pie del visor." },
  { v: "toast", l: "Banner inicial", d: "Banner arriba que el cliente cierra con un click." },
  { v: "modal", l: "Modal bloqueante", d: "Modal que pide aceptar antes de ver el documento." },
];

const toggle = (on) => `
  <button class="toggle ${on ? "on" : ""}" data-toggle role="switch" aria-checked="${on}" style="
    width:36px;height:20px;border-radius:10px;border:none;
    background:${on ? "var(--accent)" : "var(--border-strong)"};
    position:relative;cursor:pointer;transition:background .15s;padding:0">
    <span style="position:absolute;top:2px;left:${on?18:2}px;width:16px;height:16px;border-radius:50%;background:white;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
  </button>`;

export const render = async (root) => {
  let settings = { publico_solo_pe: false, privacy_disclosure: "soft" };

  // Carga inicial
  try {
    settings = await fetchUserSettings();
  } catch (err) {
    console.warn("[config] fetchUserSettings:", err);
  }

  const build = () => el(html`
    <div class="page fade-in" style="max-width:760px">
      <div class="page-header">
        <div>
          <h1 class="page-title">Configuración</h1>
          <p class="page-sub">Preferencias del visor público y privacidad.</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title">${raw(icon("shield", 13))} Acceso al visor público</div></div>
        <div class="card-body" style="padding:0">
          <div style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:16px">
            <div>
              <div style="font-size:13.5px;font-weight:600">Solo visible desde Perú</div>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px;max-width:520px">
                Los links públicos solo se cargan si el visitante está geolocalizado en Perú.
                Fuera del país se ve un mensaje de bloqueo (la apertura queda registrada para auditoría).
                <br><em style="color:var(--text-mute)">Nota: la geo se hace en el cliente y puede falsificarse editando el navegador. Es disuasivo, no defensivo.</em>
              </div>
            </div>
            ${raw(toggle(settings.publico_solo_pe))}
            <input type="hidden" data-field="publico_solo_pe" value="${settings.publico_solo_pe}">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Aviso de privacidad al cliente</div></div>
        <div class="card-body" style="padding:0">
          ${raw(DISCLOSURE_OPTS.map(o => `
            <label style="padding:12px 16px;display:flex;gap:12px;align-items:flex-start;border-bottom:1px solid var(--border);cursor:pointer">
              <input type="radio" name="privacy" value="${o.v}" ${o.v === settings.privacy_disclosure ? "checked" : ""}
                data-field="privacy_disclosure" style="margin-top:3px">
              <div>
                <div style="font-size:13.5px;font-weight:600">${o.l}</div>
                <div style="font-size:12px;color:var(--text-3);margin-top:2px">${o.d}</div>
              </div>
            </label>
          `).join(""))}
        </div>
      </div>
    </div>
  `);

  let node = build();
  root.appendChild(node);

  const save = async (patch) => {
    try {
      const saved = await saveUserSettings(patch);
      settings = { ...settings, ...patch };
      toast("Guardado", { type: "ok", ms: 1500 });
      return saved;
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude guardar", { type: "err" });
    }
  };

  // Toggle: solo PE
  on(node, "click", "[data-toggle]", async (_, btn) => {
    const newVal = !btn.classList.contains("on");
    btn.classList.toggle("on", newVal);
    btn.style.background = newVal ? "var(--accent)" : "var(--border-strong)";
    btn.setAttribute("aria-checked", String(newVal));
    const dot = btn.querySelector("span");
    if (dot) dot.style.left = (newVal ? 18 : 2) + "px";
    await save({ publico_solo_pe: newVal });
  });

  // Radio: nivel de aviso
  on(node, "change", "input[name='privacy']", async (ev) => {
    const v = ev.target.value;
    if (!DISCLOSURE_OPTS.some(o => o.v === v)) return;
    await save({ privacy_disclosure: v });
  });
};
