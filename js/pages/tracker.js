// Renderer público de páginas rastreadas: #/t/<slug>.
// Funciona auth-free. Trackea + actúa según el tipo de la página.
//   link  → trackea y redirige a destino_url
//   html  → inyecta contenido_html y heartbeat de duración
//   pixel → mini-render (este flujo casi no se usa en SPA; el caso real
//           del pixel es via /track.js inyectado en sitios externos).

import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../lib/supabase.js";
import { parseUA, enrichUA } from "../lib/ua_parser.js";
import { collectDeviceInfo } from "../lib/device_fingerprint.js";

const slugFromHash = () => {
  const m = location.hash.match(/^#\/?t\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
};

// Hit a la edge function track-hit. La geo (país/ciudad/región + flags
// proxy/hosting) la resuelve la función desde la IP real del request,
// el cliente ya no manda país. Devuelve el id del hit (o null).
const callTrackHit = async ({ slug, ua, fingerprint, query }) => {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/track-hit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        slug,
        user_agent: navigator.userAgent,
        dispositivo: ua.dispositivo,
        os: ua.os,
        referrer: document.referrer || null,
        idioma: navigator.language || null,
        timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })(),
        query,
        meta: { ...fingerprint, via: "tracker_page" },
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.id ?? null;
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

  // 2) Registrar el hit vía edge function (geo server-side)
  const ua = await enrichUA(parseUA());
  const fingerprint = await collectDeviceInfo();
  const hitId = await callTrackHit({ slug, ua, fingerprint, query: parseQuery() });

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
