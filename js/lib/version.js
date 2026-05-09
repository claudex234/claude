// Versión de la app (bumpeala manual en cada deploy).
export const APP_VERSION = "0.8.1";

// Limpia el estado local y fuerza una recarga sin caché.
export const clearCacheAndReload = async () => {
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {}
  }
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}
  }
  // bust cache de assets agregando un timestamp; navegación completa = no bf-cache
  const url = new URL(location.href);
  url.searchParams.set("_v", String(Date.now()));
  location.replace(url.toString());
};
