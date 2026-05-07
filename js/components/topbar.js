import { html, raw, el, on } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { currentRoute } from "../lib/router.js";
import { signOut } from "../lib/auth.js";

const titleFor = (name) => ({
  dashboard: "Dashboard",
  proformas: "Proformas",
  detalle: "Proformas",
  generador: "Nueva proforma",
  productos: "Productos",
  stock: "Stock",
  adjuntos: "Adjuntos",
  templates: "Plantillas",
  config: "Configuración",
}[name] || "Dashboard");

export const mountTopbar = (container) => {
  const build = () => {
    const { name } = currentRoute();
    const node = el(html`
      <div class="topbar">
        <div class="crumb">
          <span style="text-transform:capitalize">${titleFor(name)}</span>
          ${name === "detalle" ? raw(`${icon("chevron", 11)}<b>PRF-2026-0141</b>`) : ""}
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-icon" title="Buscar" data-action="search">${raw(icon("search"))}</button>
          <button class="btn btn-ghost btn-icon" title="Notificaciones" style="position:relative" data-action="bell">
            ${raw(icon("bell"))}
            <span style="position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:var(--danger)"></span>
          </button>
          <button class="btn btn-ghost btn-icon" title="Tweaks" data-action="tweaks">${raw(icon("settings"))}</button>
          <button class="btn btn-ghost" title="Cerrar sesión" data-action="signout" style="font-size:12px">Salir</button>
        </div>
      </div>
    `);
    on(node, "click", "[data-action='tweaks']", () => document.dispatchEvent(new CustomEvent("tweaks:toggle")));
    on(node, "click", "[data-action='signout']", () => signOut());
    return node;
  };

  let node = build();
  container.replaceChildren(node);

  document.addEventListener("route:change", () => {
    const next = build();
    node.replaceWith(next);
    node = next;
  });
};
