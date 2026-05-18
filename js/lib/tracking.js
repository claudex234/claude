// Tracking del visor público — orquesta open_apertura + ticks + cleanup.
// Es defensivo: si el RPC falla o el browser bloquea sendBeacon, el
// visor sigue funcionando.

import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase.js";
import { parseUA, enrichUA } from "./ua_parser.js";
import { collectDeviceInfo } from "./device_fingerprint.js";

// Zonas geométricas de la hoja A4 (4 franjas horizontales del 25%).
// La asignación semántica depende de la planilla, pero geométricamente
// estos nombres cubren los casos típicos del layout PRF.
const ZONA_NAMES = ["encabezado", "items", "totales", "terminos"];

// Overlay 4 divs invisibles sobre la hoja y observa con IntersectionObserver
// cuáles están visibles (>30%). Devuelve un Set vivo y un dispose().
const installZones = (viewerRoot) => {
  const page = viewerRoot?.querySelector(".pv-page");
  const stage = viewerRoot?.querySelector(".vp-stage");
  const visible = new Set();
  if (!page) return { visible, dispose: () => {} };

  if (getComputedStyle(page).position === "static") {
    page.style.position = "relative";
  }
  const overlays = ZONA_NAMES.map((name, i) => {
    const d = document.createElement("div");
    d.dataset.zona = name;
    d.style.cssText = `position:absolute;left:0;right:0;top:${i * 25}%;height:25%;pointer-events:none;z-index:0;`;
    page.appendChild(d);
    return d;
  });
  const io = new IntersectionObserver((entries) => {
    for (const ent of entries) {
      const name = ent.target.dataset.zona;
      if (ent.isIntersecting && ent.intersectionRatio > 0.3) visible.add(name);
      else visible.delete(name);
    }
  }, { root: stage || null, threshold: [0, 0.3, 0.6, 1] });
  overlays.forEach((d) => io.observe(d));
  return {
    visible,
    dispose: () => { io.disconnect(); overlays.forEach((d) => d.remove()); },
  };
};

// Abre la apertura vía la edge function open-apertura. La geo (país) se
// resuelve server-side desde la IP real del request — no falsificable —
// así que el cliente ya NO manda país. La función devuelve el id de la
// apertura, o blocked=true si el owner exige solo-PE y el visitante no
// está en Perú. Si falla la red, devuelve error=true y el visor sigue
// funcionando sin tracking.
const openApertura = async ({ slug, ua, fingerprint }) => {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/open-apertura`, {
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
        meta: fingerprint,
      }),
    });
    if (!r.ok) return { id: null, blocked: false, error: true };
    const j = await r.json();
    return { id: j.id ?? null, blocked: !!j.blocked, error: false };
  } catch {
    return { id: null, blocked: false, error: true };
  }
};

// Suma 1 al contador de cambios de orientación significativos (Δ > 15°).
// iOS 13+ requiere permiso explícito que ya solicitamos antes.
const installGyro = (state) => {
  if (typeof DeviceOrientationEvent === "undefined") return () => {};
  let last = null;
  const onOrient = (ev) => {
    const cur = { a: ev.alpha || 0, b: ev.beta || 0, g: ev.gamma || 0 };
    if (last) {
      const d = Math.max(Math.abs(cur.a - last.a), Math.abs(cur.b - last.b), Math.abs(cur.g - last.g));
      if (d > 15) state.gyro_events++;
    }
    last = cur;
  };
  window.addEventListener("deviceorientation", onOrient, { passive: true });
  return () => window.removeEventListener("deviceorientation", onOrient);
};

// Pide permiso para giroscopio (iOS). En otros browsers es no-op.
const requestGyroPermission = async () => {
  try {
    const fn = window.DeviceOrientationEvent && window.DeviceOrientationEvent.requestPermission;
    if (typeof fn === "function") await fn();
  } catch {}
};

// startTracking({ slug, root })
// Devuelve { dispose } para cleanup al cambiar de hash/destruir el visor.
// Si la apertura está bloqueada por país (publico_solo_pe), llama onBlocked.
export const startTracking = async ({ slug, root, onBlocked }) => {
  const ua = await enrichUA(parseUA());
  const fingerprint = await collectDeviceInfo();

  const { id: aperturaId, blocked } = await openApertura({ slug, ua, fingerprint });

  // blocked=true → owner exige PE y la geo server-side dio país != PE.
  // La fila ya quedó en DB con meta.bloqueado=true para auditoría.
  if (blocked) {
    if (typeof onBlocked === "function") onBlocked();
    return { dispose: () => {} };
  }

  // Sin id (edge function falló) → el visor sigue funcionando sin tracking.
  if (!aperturaId) return { dispose: () => {} };

  const state = {
    duracion_s: 0,
    scroll_pct: 0,
    clicks: 0,
    gyro_events: 0,
    print_screen_attempts: 0,
    descarga: false,
    impresion: false,
    zonas: {},
    // (x, y) normalizado 0-1 sobre la hoja A4, con t = seg desde apertura.
    // Cap a 200 para no inflar el jsonb si alguien clickea como loco.
    clicks_xy: [],
    // {x, y, s, t} — eventos de zoom (pinch o ctrl+wheel). Cap a 50.
    zooms: [],
  };
  const MAX_CLICKS_XY = 200;
  const MAX_ZOOMS = 50;

  // Overlays de zonas — solo cuando hay tracking real.
  const zones = installZones(root);

  // Timer: cuenta cuando la pestaña está visible y la ventana tiene foco.
  // El mismo tick incrementa la duración total y cada zona visible.
  let active = !document.hidden && document.hasFocus();
  let timerId = null;
  const tickTimer = () => {
    if (!active) return;
    state.duracion_s++;
    zones.visible.forEach((name) => {
      state.zonas[name] = (state.zonas[name] || 0) + 1;
    });
  };
  const startTimer = () => { if (!timerId) timerId = setInterval(tickTimer, 1000); };
  const stopTimer = () => { if (timerId) { clearInterval(timerId); timerId = null; } };
  startTimer();

  const onVis = () => {
    active = !document.hidden && document.hasFocus();
    if (active) startTimer(); else stopTimer();
  };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("focus", onVis);
  window.addEventListener("blur", onVis);

  // Scroll % — sobre el viewport. La hoja A4 puede no scrollear, pero el
  // wrapper sí; medimos contra documentElement.
  const onScroll = () => {
    const el = document.scrollingElement || document.documentElement;
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    const pct = Math.min(100, Math.round((el.scrollTop / max) * 100));
    if (pct > state.scroll_pct) state.scroll_pct = pct;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Clicks dentro del visor — contador + coords normalizadas (0-1)
  // relativas a la hoja A4. getBoundingClientRect ya devuelve coords
  // post-transform:scale, así que (clientX - rect.left)/rect.width es
  // exacto sin compensar por el escalado del a4_fit.
  const onClick = (ev) => {
    state.clicks++;
    const page = root?.querySelector(".pv-page") || root?.querySelector(".vp-doc, .pv-doc");
    if (page && state.clicks_xy.length < MAX_CLICKS_XY) {
      const r = page.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const x = (ev.clientX - r.left) / r.width;
        const y = (ev.clientY - r.top) / r.height;
        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
          state.clicks_xy.push({
            x: +x.toFixed(4),
            y: +y.toFixed(4),
            t: state.duracion_s,
          });
        }
      }
    }
  };
  if (root) root.addEventListener("click", onClick, { capture: true });

  // Zoom — pinch (visualViewport.scale) y ctrl+wheel (desktop).
  let lastScale = 1;
  const recordZoom = (scale, clientX, clientY) => {
    if (state.zooms.length >= MAX_ZOOMS) return;
    const page = root?.querySelector(".pv-page") || root?.querySelector(".vp-doc, .pv-doc");
    if (!page) return;
    const r = page.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    state.zooms.push({
      x: +Math.max(0, Math.min(1, x)).toFixed(4),
      y: +Math.max(0, Math.min(1, y)).toFixed(4),
      s: +scale.toFixed(2),
      t: state.duracion_s,
    });
  };
  const onVisualViewport = () => {
    const vv = window.visualViewport;
    if (!vv) return;
    if (Math.abs(vv.scale - lastScale) < 0.05) return;
    lastScale = vv.scale;
    // Centro del viewport visible como aproximación del foco del zoom.
    recordZoom(vv.scale, vv.offsetLeft + vv.width / 2, vv.offsetTop + vv.height / 2);
  };
  window.visualViewport?.addEventListener("resize", onVisualViewport);
  const onWheel = (ev) => {
    if (!ev.ctrlKey) return;
    const dir = ev.deltaY < 0 ? 1.1 : 0.9;
    lastScale = lastScale * dir;
    recordZoom(lastScale, ev.clientX, ev.clientY);
  };
  window.addEventListener("wheel", onWheel, { passive: true });

  // Impresión real (Ctrl+P o menu → file → print)
  const onBeforePrint = () => { state.impresion = true; flush(); };
  window.addEventListener("beforeprint", onBeforePrint);

  // PrintScreen / Ctrl+S — best effort. Disparan a veces; cuando lo hacen
  // limpiamos clipboard si podemos y contamos el intento.
  const onKey = (ev) => {
    const k = (ev.key || "").toLowerCase();
    if (k === "printscreen" || ev.key === "PrintScreen") {
      state.print_screen_attempts++;
      try { navigator.clipboard?.writeText(""); } catch {}
    }
    if ((ev.ctrlKey || ev.metaKey) && k === "s") {
      state.descarga = true;
    }
  };
  document.addEventListener("keydown", onKey, true);

  // Gyro (móvil)
  if (ua.isMobile) requestGyroPermission();
  const disposeGyro = installGyro(state);

  // Heartbeat: cada 5s mando el snapshot actual.
  const HEARTBEAT_MS = 5000;
  // Flag para abortar flushes en vuelo o programados tras dispose.
  // Sin esto: el setTimeout inicial o un flush async pendiente podía
  // mandar un tick post-dispose y re-abrir la sesión "live" en el admin.
  let disposed = false;
  const flush = async (useBeacon = false) => {
    if (disposed && !useBeacon) return;
    // useBeacon = true ⇒ es el tick final al cerrar la pestaña. Marcamos
    // p_closing=true para que el server ponga ultima_actividad_at en el
    // pasado y el admin vea "no live" instantáneo.
    const body = {
      p_id: aperturaId,
      p_duracion_s: state.duracion_s,
      p_scroll_pct: state.scroll_pct,
      p_clicks: state.clicks,
      p_gyro_events: state.gyro_events,
      p_print_screen_attempts: state.print_screen_attempts,
      p_descarga: state.descarga,
      p_impresion: state.impresion,
      p_zonas: Object.keys(state.zonas).length ? state.zonas : null,
      p_clicks_xy: state.clicks_xy.length ? state.clicks_xy : null,
      p_zooms: state.zooms.length ? state.zooms : null,
      // Refrescamos device/os/UA en cada tick: si el visor se cargó
      // antes de un deploy con detección mejorada (UA-CH), una sesión
      // existente se corrige sola al próximo heartbeat.
      p_user_agent: navigator.userAgent || null,
      p_dispositivo: ua.dispositivo,
      p_os: ua.os,
      p_closing: !!useBeacon,
    };
    if (useBeacon) {
      // Al cerrar la pestaña: fetch con keepalive (más fiable que
      // sendBeacon porque permite headers custom — apikey requerido).
      try {
        const url = `${SUPABASE_URL}/rest/v1/rpc/tick_apertura`;
        const headers = {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        };
        fetch(url, { method: "POST", body: JSON.stringify(body), headers, keepalive: true }).catch(() => {});
      } catch {}
      return;
    }
    try { await supabase.rpc("tick_apertura", body); } catch {}
  };
  // Primer tick a 1s (registra que la sesión existe rápido) y luego
  // cada HEARTBEAT_MS. Esto permite al admin ver "abierta ahora" casi
  // de inmediato.
  const firstTick = setTimeout(() => flush(false), 1000);
  const heartbeat = setInterval(() => flush(false), HEARTBEAT_MS);

  // Cierre de pestaña / navegación
  const onUnload = () => flush(true);
  window.addEventListener("pagehide", onUnload);
  window.addEventListener("beforeunload", onUnload);

  return {
    dispose: () => {
      disposed = true;
      clearTimeout(firstTick);
      stopTimer();
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("blur", onVis);
      window.removeEventListener("scroll", onScroll);
      if (root) root.removeEventListener("click", onClick, { capture: true });
      window.visualViewport?.removeEventListener("resize", onVisualViewport);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("beforeprint", onBeforePrint);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      disposeGyro();
      zones.dispose();
      flush(true);
    },
  };
};

