// Configuración — settings globales por usuario. Persiste en
// user_settings de Supabase. Por ahora un solo toggle: "solo PE".
import { html, raw, el, on } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { fetchUserSettings, saveUserSettings } from "../data/api.js";
import { toast } from "../lib/toast.js";

const toggle = (on) => `
  <button class="toggle ${on ? "on" : ""}" data-toggle role="switch" aria-checked="${on}" style="
    width:36px;height:20px;border-radius:10px;border:none;
    background:${on ? "var(--accent)" : "var(--border-strong)"};
    position:relative;cursor:pointer;transition:background .15s;padding:0">
    <span style="position:absolute;top:2px;left:${on?18:2}px;width:16px;height:16px;border-radius:50%;background:white;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
  </button>`;

export const render = async (root) => {
  let settings = { publico_solo_pe: false };
  try { settings = await fetchUserSettings(); }
  catch (err) { console.warn("[config] fetchUserSettings:", err); }

  const node = el(html`
    <div class="page fade-in" style="max-width:760px">
      <div class="page-header">
        <div>
          <h1 class="page-title">Configuración</h1>
          <p class="page-sub">Preferencias del visor público.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">${raw(icon("shield", 13))} Acceso al visor público</div></div>
        <div class="card-body" style="padding:0">
          <div style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:16px">
            <div>
              <div style="font-size:13.5px;font-weight:600">Solo visible desde Perú</div>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px;max-width:520px">
                Los links públicos solo se cargan si el visitante está geolocalizado en Perú.
                Fuera del país se ve un mensaje de bloqueo y la apertura queda registrada para auditoría.
                <br><em style="color:var(--text-mute)">La geo se hace en el cliente y puede falsificarse editando el navegador. Es disuasivo, no defensivo.</em>
              </div>
            </div>
            ${raw(toggle(settings.publico_solo_pe))}
          </div>
        </div>
      </div>
    </div>
  `);
  root.appendChild(node);

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
      toast("Guardado", { type: "ok", ms: 1500 });
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude guardar", { type: "err" });
    }
  });
};
