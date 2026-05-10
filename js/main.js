import { state } from "./lib/store.js";
import { registerRoute, setOutlet, renderRoute } from "./lib/router.js";
import { mountSidebar } from "./components/sidebar.js";
import { mountTopbar } from "./components/topbar.js";
import { mountTweaks } from "./components/tweaks.js";
import { waitForSession } from "./lib/auth.js";
import { loadAll } from "./data/loader.js";

// Aplicar tema inicial
document.documentElement.setAttribute("data-theme", state.theme);

const app = document.getElementById("app");

const isPublicRoute = () => /^#\/?p\//.test(location.hash);

const bootPublic = async () => {
  app.innerHTML = `<div style="display:grid;place-items:center;height:100vh;color:#8a8f9a;font:14px system-ui">Cargando proforma…</div>`;
  try {
    const { render } = await import("./pages/publico.js");
    app.innerHTML = "";
    let cleanup = await render(app);
    window.addEventListener("hashchange", async () => {
      if (!isPublicRoute()) { location.reload(); return; }
      if (typeof cleanup === "function") cleanup();
      app.innerHTML = "";
      cleanup = await render(app);
    });
  } catch (err) {
    console.error("[bootPublic] crash:", err);
    app.innerHTML = `<div style="display:grid;place-items:center;height:100vh;padding:24px;text-align:center;font:13px system-ui;color:#f87171"><div><div style="font-size:16px;margin-bottom:8px">No pude cargar el visor</div><pre style="font-family:ui-monospace,monospace;color:#8a8f9a;background:#11141a;padding:10px;border-radius:6px;text-align:left">${(err?.message || err)}\n${err?.stack || ""}</pre></div></div>`;
  }
};

const boot = async () => {
  if (isPublicRoute()) return bootPublic();

  // 1) Gate de autenticación: bloquea hasta tener sesión.
  await waitForSession(app);

  // 2) Carga inicial de datos desde Supabase.
  try {
    await loadAll();
  } catch (err) {
    console.error("Error cargando datos:", err);
  }

  // 3) Layout principal y rutas.
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

  registerRoute("config", () => import("./pages/config.js"));
  registerRoute("proformas", () => import("./pages/listado.js"));
  registerRoute("generador", () => import("./pages/generador.js"));
  registerRoute("detalle", () => import("./pages/detalle.js"));
  registerRoute("clientes", () => import("./pages/clientes.js"));
  registerRoute("productos", () => import("./pages/productos.js"));
  registerRoute("stock", () => import("./pages/stock.js"));
  registerRoute("adjuntos", () => import("./pages/adjuntos.js"));
  registerRoute("templates", () => import("./pages/templates.js"));

  if (!location.hash) location.hash = "#/proformas";
  renderRoute();
};

boot();
