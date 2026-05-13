import { html, raw, el, on } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { state, set } from "../lib/store.js";
import { navigate, currentRoute } from "../lib/router.js";
import { PROFORMAS } from "../data/proformas.js";
import { supabase } from "../lib/supabase.js";

const MAIN = [
  { id: "proformas", icon: "list", label: "Proformas", badge: () => String(PROFORMAS.length || "") },
  { id: "generador", icon: "plus", label: "Nueva proforma" },
];
const CATALOGO = [
  { id: "productos", icon: "box", label: "Productos" },
  { id: "stock", icon: "package", label: "Stock" },
  { id: "adjuntos", icon: "paperclip", label: "Adjuntos" },
  { id: "templates", icon: "template", label: "Plantillas" },
];
const SEGUIMIENTO = [
  { id: "competidores", icon: "eye", label: "Competidores" },
];
const OTROS = [
  { id: "config", icon: "settings", label: "Configuración" },
];

const renderItem = (it, activePage, collapsed, extraActive = false) => {
  const badge = typeof it.badge === "function" ? it.badge() : it.badge;
  return html`
    <button class="nav-item ${activePage === it.id || extraActive ? "active" : ""}" data-route="${it.id}" ${collapsed ? raw(`title="${it.label}"`) : ""}>
      ${raw(icon(it.icon))}
      ${collapsed ? "" : raw(`<span>${it.label}</span>`)}
      ${badge && !collapsed ? raw(`<span class="nav-badge">${badge}</span>`) : ""}
    </button>
  `;
};

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
        ${collapsed ? raw('<div style="height:8px"></div>') : raw('<div class="nav-section">Seguimiento</div>')}
        ${raw(SEGUIMIENTO.map(it => renderItem(it, name, collapsed)).join(""))}
        ${collapsed ? raw('<div style="height:8px"></div>') : raw('<div class="nav-section">Otros</div>')}
        ${raw(OTROS.map(it => renderItem(it, name, collapsed)).join(""))}
        <div class="user-card" data-user-card>
          <div class="avatar" data-user-avatar>—</div>
          ${collapsed ? "" : raw(`
            <div style="min-width:0;flex:1">
              <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-user-name>—</div>
              <div style="font-size:11.5px;color:var(--text-mute)" data-user-email>—</div>
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

  // Hidrata la user-card con datos del auth (email del usuario).
  const hydrateUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || "—";
      const initials = (email[0] || "?").toUpperCase() + (email.split("@")[0]?.[1] || "").toUpperCase();
      const avatar = node.querySelector("[data-user-avatar]");
      const name = node.querySelector("[data-user-name]");
      const mail = node.querySelector("[data-user-email]");
      if (avatar) avatar.textContent = initials;
      if (name) name.textContent = email.split("@")[0] || "—";
      if (mail) mail.textContent = email;
    } catch {}
  };
  hydrateUser();

  const rerender = () => {
    const next = build();
    node.replaceWith(next);
    node = next;
    hydrateUser();
  };

  document.addEventListener("route:change", rerender);
  document.addEventListener("store:sidebarCollapsed", rerender);
};
