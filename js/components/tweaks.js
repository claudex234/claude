import { html, raw, el, on } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { state, set } from "../lib/store.js";
import { navigate, currentRoute } from "../lib/router.js";

const THEMES = [
  { value: "dark", label: "Oscuro (default)" },
  { value: "stripe", label: "Stripe (claro azul)" },
  { value: "warm", label: "Cálido (serif)" },
  { value: "mono", label: "Mono (Linear)" },
];

const PAGES = [
  { id: "dashboard", l: "Dashboard" },
  { id: "proformas", l: "Listado" },
  { id: "generador", l: "Generador" },
  { id: "detalle", l: "Detalle + tracking ★" },
  { id: "templates", l: "Plantillas" },
  { id: "productos", l: "Productos" },
  { id: "stock", l: "Stock" },
  { id: "adjuntos", l: "Adjuntos" },
  { id: "config", l: "Configuración" },
];

export const mountTweaks = (container) => {
  const build = () => {
    const { name } = currentRoute();
    const open = state.tweaksOpen;
    const node = el(html`
      <aside class="tweaks-panel ${open ? "open" : ""}" style="${open ? "" : "display:none"}">
        <div class="tweaks-header">
          <div class="tweaks-title">Tweaks</div>
          <button class="btn btn-ghost btn-icon" data-action="close" title="Cerrar">${raw(icon("x"))}</button>
        </div>
        <div class="tweaks-body">
          <div class="tweak-section">
            <div class="tweak-section-title">Estilo visual</div>
            <label class="field-label">Tema</label>
            <select class="input" data-action="theme">
              ${raw(THEMES.map(t => `<option value="${t.value}" ${state.theme === t.value ? "selected" : ""}>${t.label}</option>`).join(""))}
            </select>
          </div>
          <div class="tweak-section">
            <div class="tweak-section-title">Navegación</div>
            <div style="display:grid;gap:6px">
              ${raw(PAGES.map(p => `
                <button class="btn btn-sm" data-route="${p.id}" style="
                  justify-content:flex-start;
                  background:${name === p.id ? "var(--accent-soft)" : "transparent"};
                  border-color:${name === p.id ? "var(--accent)" : "var(--border)"};
                  color:${name === p.id ? "var(--accent-strong)" : "var(--text-2)"};
                  font-weight:${name === p.id ? 600 : 500};
                ">${p.l}</button>
              `).join(""))}
            </div>
          </div>
        </div>
      </aside>
    `);

    on(node, "click", "[data-action='close']", () => set({ tweaksOpen: false }));
    on(node, "change", "[data-action='theme']", (e) => {
      set({ theme: e.target.value });
      document.documentElement.setAttribute("data-theme", e.target.value);
    });
    on(node, "click", "[data-route]", (_, btn) => navigate(btn.dataset.route));
    return node;
  };

  let node = build();
  container.replaceChildren(node);

  const rerender = () => {
    const next = build();
    node.replaceWith(next);
    node = next;
  };
  document.addEventListener("route:change", rerender);
  document.addEventListener("store:tweaksOpen", rerender);
  document.addEventListener("store:theme", rerender);
  document.addEventListener("tweaks:toggle", () => set({ tweaksOpen: !state.tweaksOpen }));
};
