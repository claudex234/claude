import { html, raw, el, on } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { currentRoute } from "../lib/router.js";
import { signOut } from "../lib/auth.js";
import { APP_VERSION, clearCacheAndReload } from "../lib/version.js";

const titleFor = (name) => ({
  proformas: "Proformas",
  generador: "Nueva proforma",
  productos: "Productos",
  stock: "Stock",
  adjuntos: "Adjuntos",
  templates: "Plantillas",
  competidores: "Competidores",
  config: "Configuración",
}[name] || "Proformas");

export const mountTopbar = (container) => {
  const build = () => {
    const { name, params } = currentRoute();
    const crumbId = (name === "generador") && params?.[0] ? params[0] : null;
    const titleOverride = name === "generador" && params?.[0] ? "Editar proforma" : null;
    const node = el(html`
      <div class="topbar">
        <button class="btn btn-ghost btn-icon topbar-hamburger" data-action="drawer" title="Menú" aria-label="Abrir menú">${raw(icon("menu", 18))}</button>
        <div class="crumb">
          <span style="text-transform:capitalize">${titleOverride || titleFor(name)}</span>
          ${crumbId ? raw(`${icon("chevron", 11)}<b>${crumbId}</b>`) : ""}
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-icon" title="Borrar caché y recargar" data-action="clear-cache">${raw(icon("refresh"))}</button>
          <span class="topbar-ver" title="Versión de la app">v${APP_VERSION}</span>
          <button class="btn btn-ghost btn-icon" title="Tweaks" data-action="tweaks">${raw(icon("settings"))}</button>
          <button class="btn btn-ghost topbar-signout" title="Cerrar sesión" data-action="signout" style="font-size:12px">Salir</button>
        </div>
      </div>
    `);
    on(node, "click", "[data-action='drawer']", () => document.body.classList.toggle("drawer-open"));
    on(node, "click", "[data-action='tweaks']", () => document.dispatchEvent(new CustomEvent("tweaks:toggle")));
    on(node, "click", "[data-action='clear-cache']", async () => {
      if (confirm("Borrar caché local y recargar? Vas a tener que iniciar sesión de nuevo.")) {
        await clearCacheAndReload();
      }
    });
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
