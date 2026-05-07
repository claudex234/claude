import { html, raw, el, on } from "../lib/utils.js";
import { icon } from "../lib/icons.js";

const trackingItems = [
  { l: "Aperturas e IP", s: "Registrar cada vez que el cliente abre el PDF", on: true },
  { l: "Tiempo por página", s: "Medir cuánto tiempo pasa en cada página del PDF", on: true },
  { l: "Descargas e impresiones", s: "Detectar cuando el cliente descarga o manda imprimir", on: true },
  { l: "Reenvíos", s: "Detectar aperturas desde IPs / dispositivos distintos al original", on: true },
  { l: "Giroscopio (móvil)", s: "Medir rotaciones — útil para detectar si está mostrando el PDF a otra persona", on: true },
  { l: "Geolocalización precisa", s: "Pedir permiso al cliente (no recomendado)", on: false },
];

const notifs = [
  { l: "Email cuando un cliente abre la proforma", on: true },
  { l: "Notificación push para reenvíos detectados", on: true },
  { l: "Resumen diario por email", on: false },
];

const toggle = (on) => `
  <button class="toggle ${on ? "on" : ""}" data-toggle aria-pressed="${on}" style="
    width:36px;height:20px;border-radius:10px;border:none;
    background:${on ? "var(--accent)" : "var(--border-strong)"};
    position:relative;cursor:pointer;transition:background .15s;padding:0">
    <span style="position:absolute;top:2px;left:${on?18:2}px;width:16px;height:16px;border-radius:50%;background:white;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
  </button>
`;

export const render = (root) => {
  const node = el(html`
    <div class="page fade-in" style="max-width:760px">
      <div class="page-header">
        <div>
          <h1 class="page-title">Configuración</h1>
          <p class="page-sub">Datos de tu empresa, branding y preferencias de tracking.</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title">Datos de la empresa</div></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div><label class="field-label">Razón social</label><input class="input" value="Duecaz Tecnología S.A.C."></div>
            <div><label class="field-label">RUC</label><input class="input" value="20601234567"></div>
            <div style="grid-column:1 / -1"><label class="field-label">Dirección</label><input class="input" value="Av. Petit Thouars 5500, Miraflores, Lima"></div>
            <div><label class="field-label">Teléfono</label><input class="input" value="+51 1 555 0123"></div>
            <div><label class="field-label">Email comercial</label><input class="input" value="ventas@duecaz.com"></div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title">${raw(icon("shield", 13))} Tracking del PDF</div></div>
        <div class="card-body" style="padding:0">
          ${raw(trackingItems.map((s, i) => `
            <div style="padding:12px 16px;border-bottom:${i<trackingItems.length-1?"1px solid var(--border)":"none"};display:flex;justify-content:space-between;align-items:center;gap:16px">
              <div>
                <div style="font-size:13.5px;font-weight:600">${s.l}</div>
                <div style="font-size:12px;color:var(--text-3);margin-top:2px">${s.s}</div>
              </div>
              ${toggle(s.on)}
            </div>
          `).join(""))}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Notificaciones</div></div>
        <div class="card-body" style="padding:0">
          ${raw(notifs.map((s, i) => `
            <div style="padding:12px 16px;border-bottom:${i<notifs.length-1?"1px solid var(--border)":"none"};display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:13.5px">${s.l}</div>
              ${toggle(s.on)}
            </div>
          `).join(""))}
        </div>
      </div>
    </div>
  `);

  on(node, "click", "[data-toggle]", (_, btn) => {
    const isOn = btn.classList.toggle("on");
    btn.style.background = isOn ? "var(--accent)" : "var(--border-strong)";
    btn.setAttribute("aria-pressed", String(isOn));
    const dot = btn.querySelector("span");
    if (dot) dot.style.left = (isOn ? 18 : 2) + "px";
  });

  root.appendChild(node);
};
