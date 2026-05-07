import { html, raw, el, on } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { state, set } from "../lib/store.js";
import { navigate, currentRoute } from "../lib/router.js";

const MAIN = [
  { id: "proformas", icon: "list", label: "Proformas", badge: "47" },
  { id: "generador", icon: "plus", label: "Nueva proforma" },
];
const CATALOGO = [
  { id: "productos", icon: "box", label: "Productos" },
  { id: "stock", icon: "package", label: "Stock", badge: "1" },
  { id: "adjuntos", icon: "paperclip", label: "Adjuntos" },
  { id: "templates", icon: "template", label: "Plantillas" },
];
const OTROS = [
  { id: "config", icon: "settings", label: "Configuración" },
];

const renderItem = (it, activePage, collapsed, extraActive = false) => html`
  <button class="nav-item ${activePage === it.id || extraActive ? "active" : ""}" data-route="${it.id}" ${collapsed ? raw(`title="${it.label}"`) : ""}>
    ${raw(icon(it.icon))}
    ${collapsed ? "" : raw(`<span>${it.label}</span>`)}
    ${it.badge && !collapsed ? raw(`<span class="nav-badge">${it.badge}</span>`) : ""}
  </button>
`;

export const mountSidebar = (container) => {
  const build = () => {
    const { name } = currentRoute();
    const collapsed = state.sidebarCollapsed;
    const detalleActive = name === "detalle";
    const node = el(html`
      <aside class="sidebar ${collapsed ? "sidebar-collapsed" : ""}">
        <div class="brand">
          <div class="brand-mark">P</div>
          ${collapsed ? "" : raw('<div class="brand-name">Proforma</div>')}
          <button class="btn-icon btn-ghost sidebar-toggle" data-action="toggle" title="${collapsed ? "Expandir" : "Colapsar"}" style="margin-left:auto">
            ${raw(`<span style="display:inline-flex;transform:${collapsed ? "none" : "rotate(180deg)"}">${icon("chevron", 14)}</span>`)}
          </button>
        </div>
        ${collapsed ? "" : raw('<div class="nav-section">Principal</div>')}
        ${raw(MAIN.map(it => renderItem(it, name, collapsed, it.id === "proformas" && detalleActive)).join(""))}
        ${collapsed ? raw('<div style="height:8px"></div>') : raw('<div class="nav-section">Catálogo</div>')}
        ${raw(CATALOGO.map(it => renderItem(it, name, collapsed)).join(""))}
        ${collapsed ? raw('<div style="height:8px"></div>') : raw('<div class="nav-section">Otros</div>')}
        ${raw(OTROS.map(it => renderItem(it, name, collapsed)).join(""))}
        <div class="user-card">
          <div class="avatar">DC</div>
          ${collapsed ? "" : raw(`
            <div style="min-width:0;flex:1">
              <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Diego Cazorla</div>
              <div style="font-size:11.5px;color:var(--text-mute)">Plan Pro</div>
            </div>
          `)}
        </div>
      </aside>
    `);

    on(node, "click", "[data-route]", (_, btn) => navigate(btn.dataset.route));
    on(node, "click", "[data-action='toggle']", () => set({ sidebarCollapsed: !state.sidebarCollapsed }));
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
  document.addEventListener("store:sidebar", rerender);
};
