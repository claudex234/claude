// Tracking del visor público — orquesta open_apertura + ticks + cleanup.
// Es defensivo: si el RPC falla o el browser bloquea sendBeacon, el
// visor sigue funcionando.

import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase.js";
import { parseUA } from "./ua_parser.js";

// Endpoint público de geo IP (sin key, sin auth). Si falla devuelve null
// y la app sigue. La geo va al RPC como param p_pais.
const fetchGeo = async () => {
  try {
    const r = await fetch("https://api.country.is/", { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return { pais: j.country || null, ip: j.ip || null };
  } catch {
    return null;
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
  const ua = parseUA();
  const geo = await fetchGeo();

  const payload = {
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
  };

  let aperturaId = null;
  let openOk = false;
  try {
    const { data, error } = await supabase.rpc("open_apertura", payload);
    if (error) {
      console.warn("[tracking] open_apertura error:", error);
    } else {
      aperturaId = data;
      openOk = true;
    }
  } catch (err) {
    console.warn("[tracking] open_apertura crash:", err);
  }

  // Si la RPC devolvió null sin error → owner exige PE y no estamos en PE.
  // La fila ya quedó en DB con meta.bloqueado=true para auditoría.
  if (openOk && aperturaId === null) {
    if (typeof onBlocked === "function") onBlocked();
    return { dispose: () => {} };
  }

  // Si no tenemos id (RPC falló), el visor sigue funcionando sin tracking.
  if (!aperturaId) return { dispose: () => {} };

  const state = {
    duracion_s: 0,
    scroll_pct: 0,
    clicks: 0,
    gyro_events: 0,
    print_screen_attempts: 0,
    descarga: false,
    impresion: false,
  };

  // Timer: cuenta solo cuando la pestaña está visible y la ventana tiene foco.
  let active = !document.hidden && document.hasFocus();
  let timerId = null;
  const tickTimer = () => { if (active) state.duracion_s++; };
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

  // Clicks dentro del visor
  const onClick = () => { state.clicks++; };
  if (root) root.addEventListener("click", onClick, { capture: true });

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

  // Heartbeat: cada 8s mando el snapshot actual.
  const HEARTBEAT_MS = 8000;
  const flush = async (useBeacon = false) => {
    const body = {
      p_id: aperturaId,
      p_duracion_s: state.duracion_s,
      p_scroll_pct: state.scroll_pct,
      p_clicks: state.clicks,
      p_gyro_events: state.gyro_events,
      p_print_screen_attempts: state.print_screen_attempts,
      p_descarga: state.descarga,
      p_impresion: state.impresion,
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
  const heartbeat = setInterval(() => flush(false), HEARTBEAT_MS);

  // Cierre de pestaña / navegación
  const onUnload = () => flush(true);
  window.addEventListener("pagehide", onUnload);
  window.addEventListener("beforeunload", onUnload);

  return {
    dispose: () => {
      stopTimer();
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("blur", onVis);
      window.removeEventListener("scroll", onScroll);
      if (root) root.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("beforeprint", onBeforePrint);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      disposeGyro();
      flush(true);
    },
  };
};

