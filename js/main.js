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
const isPrintRoute = () => /^#\/?print\//.test(location.hash);
const isTrackerRoute = () => /^#\/?t\//.test(location.hash);

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

// Renderer público de páginas rastreadas: auth-free, sin layout.
const bootTracker = async () => {
  app.innerHTML = `<div style="display:grid;place-items:center;height:100vh;color:#666;font:14px system-ui">Cargando…</div>`;
  try {
    const { render } = await import("./pages/tracker.js");
    app.innerHTML = "";
    let cleanup = await render(app);
    window.addEventListener("hashchange", async () => {
      if (!isTrackerRoute()) { location.reload(); return; }
      if (typeof cleanup === "function") cleanup();
      app.innerHTML = "";
      cleanup = await render(app);
    });
  } catch (err) {
    console.error("[bootTracker]", err);
    app.innerHTML = `<div style="padding:24px;font:13px system-ui;color:#a30">Error: ${err?.message || err}</div>`;
  }
};

const bootPrint = async () => {
  await waitForSession(app);
  app.innerHTML = "";
  const { render } = await import("./pages/print.js");
  const params = location.hash.replace(/^#\/?/, "").split("/").slice(1);
  await render(app, { params, navigate: () => {} });
};

const boot = async () => {
  if (isPublicRoute()) return bootPublic();
  if (isPrintRoute()) return bootPrint();
  if (isTrackerRoute()) return bootTracker();

  // 1) Gate de autenticación: bloquea hasta tener sesión.
  await waitForSession(app);

  // Registrar la IP del admin para que el visor público sepa "esto somos
  // nosotros mismos" y no trackee la apertura. Fire-and-forget.
  import("./lib/supabase.js").then(({ supabase }) =>
    supabase.functions.invoke("record-my-ip").catch(() => {})
  );

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
      <div class="drawer-backdrop" data-action="close-drawer" aria-hidden="true"></div>
    </div>
  `;

  mountSidebar(document.getElementById("sidebar-host"));
  mountTopbar(document.getElementById("topbar-host"));
  mountTweaks(document.getElementById("tweaks-host"));
  setOutlet(document.getElementById("route-outlet"));

  // Mobile drawer: cierra al click en backdrop, al navegar y con ESC.
  const closeDrawer = () => document.body.classList.remove("drawer-open");
  document.querySelector(".drawer-backdrop")?.addEventListener("click", closeDrawer);
  document.addEventListener("route:change", closeDrawer);
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeDrawer(); });

  registerRoute("config", () => import("./pages/config.js"));
  registerRoute("empresas", () => import("./pages/empresas.js"));
  registerRoute("proformas", () => import("./pages/listado.js"));
  registerRoute("generador", () => import("./pages/generador.js"));
  registerRoute("productos", () => import("./pages/productos.js"));
  registerRoute("stock", () => import("./pages/stock.js"));
  registerRoute("adjuntos", () => import("./pages/adjuntos.js"));
  registerRoute("templates", () => import("./pages/templates.js"));
  registerRoute("competidores", () => import("./pages/competidores.js"));

  // replaceState (no hashchange) para evitar doble renderRoute en arranque.
  if (!location.hash) history.replaceState(null, "", "#/proformas");
  renderRoute();
};

boot();
