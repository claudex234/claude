import { state } from "./lib/store.js";
import { registerRoute, setOutlet, renderRoute, currentRoute } from "./lib/router.js";
import { mountSidebar } from "./components/sidebar.js";
import { mountTopbar } from "./components/topbar.js";
import { mountTweaks } from "./components/tweaks.js";

// Aplicar tema inicial
document.documentElement.setAttribute("data-theme", state.theme);

// Layout principal
const app = document.getElementById("app");
app.innerHTML = `
  <div class="app">
    <div id="sidebar-host"></div>
    <div class="main">
      <div id="topbar-host"></div>
      <div id="route-outlet"></div>
    </div>
    <div id="tweaks-host"></div>
  </div>
`;

mountSidebar(document.getElementById("sidebar-host"));
mountTopbar(document.getElementById("topbar-host"));
mountTweaks(document.getElementById("tweaks-host"));
setOutlet(document.getElementById("route-outlet"));

// Rutas (lazy)
registerRoute("dashboard", () => import("./pages/dashboard.js"));
registerRoute("config", () => import("./pages/config.js"));
registerRoute("proformas", () => import("./pages/listado.js"));
registerRoute("generador", () => import("./pages/generador.js"));
registerRoute("detalle", () => import("./pages/detalle.js"));
registerRoute("productos", () => import("./pages/productos.js"));
registerRoute("stock", () => import("./pages/stock.js"));
registerRoute("adjuntos", () => import("./pages/adjuntos.js"));
registerRoute("templates", () => import("./pages/templates.js"));

// Fallback de hash inicial
if (!location.hash) location.hash = "#/dashboard";
renderRoute();
