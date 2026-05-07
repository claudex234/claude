import { state } from "./lib/store.js";
import { registerRoute, setOutlet, renderRoute, currentRoute } from "./lib/router.js";
import { mountSidebar } from "./components/sidebar.js";
import { mountTopbar } from "./components/topbar.js";
import { mountTweaks } from "./components/tweaks.js";
import { makeStub } from "./pages/stub.js";

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
registerRoute("proformas", async () => makeStub("Proformas", "Listado completo con filtros, búsqueda y orden por columnas."));
registerRoute("generador", async () => makeStub("Nueva proforma", "Editor split-view con cliente, ítems y preview en vivo."));
registerRoute("detalle", async () => makeStub("Detalle de proforma", "Tracking de aperturas, timeline, heatmap y movimientos del dispositivo."));
registerRoute("productos", async () => makeStub("Productos", "Catálogo con SKU, precios, costos y categorías."));
registerRoute("stock", async () => makeStub("Stock", "Existencias por producto y movimientos de inventario."));
registerRoute("adjuntos", async () => makeStub("Adjuntos", "Archivos vinculados a cada proforma (fichas, certificados, fotos)."));
registerRoute("templates", async () => makeStub("Plantillas", "Skins visuales para PDF y plantillas de contenido."));

// Fallback de hash inicial
if (!location.hash) location.hash = "#/dashboard";
renderRoute();
