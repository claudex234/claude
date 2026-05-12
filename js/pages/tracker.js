// Renderer público de páginas rastreadas: #/t/<slug>.
// Funciona auth-free. Trackea + actúa según el tipo de la página.
//   link  → trackea y redirige a destino_url
//   html  → inyecta contenido_html y heartbeat de duración
//   pixel → mini-render (este flujo casi no se usa en SPA; el caso real
//           del pixel es via /track.js inyectado en sitios externos).

import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../lib/supabase.js";
import { parseUA } from "../lib/ua_parser.js";

const slugFromHash = () => {
  const m = location.hash.match(/^#\/?t\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
};

const fetchGeo = async () => {
  try {
    const r = await fetch("https://api.country.is/", { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return { pais: j.country || null };
  } catch { return null; }
};

const parseQuery = () => {
  // ?param=valor (en location.search) o después del hash si el sitio mandó
  // un fragmento con ?: ej #/t/abc?utm=x
  const out = {};
  for (const src of [location.search, location.hash.split("?")[1] ? "?" + location.hash.split("?")[1] : ""]) {
    if (!src) continue;
    const params = new URLSearchParams(src.replace(/^\?/, ""));
    for (const [k, v] of params.entries()) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
};

const showError = (root, msg) => {
  root.innerHTML = `
    <div style="display:grid;place-items:center;height:100vh;padding:24px;text-align:center;font:14px system-ui;color:#666">
      <div>${msg}</div>
    </div>`;
};

export const render = async (root) => {
  const slug = slugFromHash();
  if (!slug) {
    showError(root, "Link inválido.");
    return () => {};
  }

  // 1) Obtener la página
  let page;
  try {
    const { data, error } = await supabase.rpc("get_tracking_page", { p_slug: slug });
    if (error) throw error;
    page = data;
  } catch (err) {
    console.warn("[tracker] get_tracking_page:", err);
  }

  if (!page) {
    showError(root, "Esta página no existe o fue desactivada.");
    return () => {};
  }

  // 2) Registrar el hit en paralelo (no bloqueante)
  const ua = parseUA();
  const geo = await fetchGeo();
  let hitId = null;
  try {
    const { data } = await supabase.rpc("track_hit", {
      p_slug: slug,
      p_user_agent: navigator.userAgent,
      p_dispositivo: ua.dispositivo,
      p_os: ua.os,
      p_referrer: document.referrer || null,
      p_idioma: navigator.language || null,
      p_timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })(),
      p_pais: geo?.pais || null,
      p_ciudad: null,
      p_region: null,
      p_query: parseQuery(),
      p_meta: { screen: `${screen?.width}x${screen?.height}`, hwc: navigator.hardwareConcurrency || null },
    });
    hitId = data;
  } catch (err) {
    console.warn("[tracker] track_hit:", err);
  }

  // 3) Renderizar según tipo
  if (page.tipo === "link") {
    // Pequeño delay para asegurar que el hit se envió.
    root.innerHTML = `
      <div style="display:grid;place-items:center;height:100vh;color:#666;font:14px system-ui">
        Redirigiendo…
      </div>`;
    setTimeout(() => { location.replace(page.destino_url); }, 150);
    return () => {};
  }

  if (page.tipo === "html") {
    // Inyectar el HTML guardado. El usuario es responsable de que sea HTML válido.
    document.documentElement.classList.add("tracker-html");
    root.innerHTML = page.contenido_html || "";

    // Heartbeat de duración cada 8s, parado al perder visibilidad.
    let duracion = 0;
    let active = !document.hidden;
    const ticker = setInterval(() => { if (active) duracion++; }, 1000);
    const onVis = () => { active = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    const heartbeat = setInterval(async () => {
      if (!hitId) return;
      try { await supabase.rpc("tick_tracking_hit", { p_id: hitId, p_duracion_s: duracion }); } catch {}
    }, 8000);

    // Al cerrar / navegar fuera, intento un tick final con keepalive.
    const onUnload = () => {
      if (!hitId) return;
      try {
        const url = `${SUPABASE_URL}/rest/v1/rpc/tick_tracking_hit`;
        const body = JSON.stringify({ p_id: hitId, p_duracion_s: duracion });
        const headers = {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        };
        fetch(url, { method: "POST", body, headers, keepalive: true }).catch(() => {});
      } catch {}
    };
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearInterval(ticker);
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      document.documentElement.classList.remove("tracker-html");
      onUnload();
    };
  }

  // pixel: una página vacía con una marca discreta (no es el uso real del pixel;
  // el uso real es vía /track.js en sitios externos).
  root.innerHTML = `
    <div style="display:grid;place-items:center;height:100vh;color:#999;font:11px monospace">
      <div style="opacity:.3">·</div>
    </div>`;
  return () => {};
};
