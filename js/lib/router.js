// Router por hash. Cada ruta es una clave que mapea a un módulo de página.
const routes = new Map();
let outlet = null;
let currentCleanup = null;

export const registerRoute = (key, loader) => routes.set(key, loader);
export const setOutlet = (node) => { outlet = node; };

export const currentRoute = () => {
  const h = location.hash.replace(/^#\/?/, "");
  const [name, ...rest] = h.split("/");
  return { name: name || "dashboard", params: rest };
};

export const navigate = (path) => {
  if (location.hash === "#/" + path) renderRoute();
  else location.hash = "#/" + path;
};

export const renderRoute = async () => {
  if (!outlet) return;
  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch {}
    currentCleanup = null;
  }
  const { name, params } = currentRoute();
  const loader = routes.get(name) || routes.get("dashboard");
  outlet.innerHTML = "";
  const mod = await loader();
  const result = mod.render(outlet, { params, navigate });
  if (typeof result === "function") currentCleanup = result;
  // Notificar a otros (sidebar, topbar)
  document.dispatchEvent(new CustomEvent("route:change", { detail: { name, params } }));
};

window.addEventListener("hashchange", renderRoute);
