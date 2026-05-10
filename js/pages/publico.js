// Visor público de proformas — accesible vía #/p/<slug> sin auth.
// Renderiza la hoja A4 a pantalla completa con protecciones para
// disuadir capturas/descargas. (Bloquear capturas 100% es imposible
// en un browser; esto sólo dificulta y deja huella.)
import { supabase } from "../lib/supabase.js";
import { escapeHtml as e } from "../lib/utils.js";
import { EMISOR } from "../data/empresa.js";
import { renderPlanilla, renderPlanillaWith } from "../lib/planillas.js";
import { mountA4Fit } from "../lib/a4_fit.js";
import { fromRpcPayload } from "../lib/planilla_data.js";

const slugFromHash = () => {
  const m = location.hash.match(/^#\/?p\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
};

const fetchProforma = async (slug) => {
  const { data, error } = await supabase.rpc("get_public_proforma", { p_slug: slug });
  if (error) throw error;
  return data;
};

const logApertura = async (slug) => {
  try {
    await supabase.rpc("log_public_apertura", { p_slug: slug, p_user_agent: navigator.userAgent });
  } catch (err) {
    console.warn("[publico] log_public_apertura falló:", err);
  }
};

const renderViewer = async (payload, slug) => {
  const p = payload.proforma;
  const data = fromRpcPayload(payload);
  const inner = (payload.skin_html || payload.skin_css)
    ? renderPlanillaWith({ html: payload.skin_html, css: payload.skin_css }, data)
    : await renderPlanilla(payload.skin_codigo || "corporate", data);
  // Watermark off por defecto. Se activa con `?wm=1` en la URL del visor
  // para shares sensibles donde sí queremos dejar huella en una captura.
  const wmEnabled = /[?&]wm=1\b/.test(location.hash) || /[?&]wm=1\b/.test(location.search);
  const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
  const wm = `${slug.slice(0, 8)} · ${ts}`;
  return `
    <div class="vp-shell">
      ${wmEnabled ? `<div class="vp-watermark" aria-hidden="true">${Array.from({ length: 60 }, () => `<span>${e(wm)}</span>`).join("")}</div>` : ""}
      <header class="vp-bar">
        <div class="vp-bar-emisor">
          <div>
            <div class="vp-bar-name">${e(EMISOR.razonSocial)}</div>
            <div class="vp-bar-meta">Proforma ${e(p.numero)}</div>
          </div>
        </div>
        <div class="vp-bar-warn" title="No se permite capturar ni descargar este documento">
          Vista protegida · ${e(slug)}
        </div>
      </header>
      <main class="vp-stage">
        <div class="vp-fit">
          <div class="pv-doc">
            <article class="pv-page">${inner}</article>
          </div>
        </div>
      </main>
      <div class="vp-blackout" aria-hidden="true">
        <div class="vp-blackout-text">Vista pausada — esta página oculta el contenido cuando no está en foco</div>
      </div>
    </div>`;
};

const installProtections = (root) => {
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
  // Right-click
  root.addEventListener("contextmenu", stop);
  // Drag (de imágenes/texto)
  root.addEventListener("dragstart", stop);
  // Selección
  root.addEventListener("selectstart", stop);
  root.addEventListener("copy", stop);
  root.addEventListener("cut", stop);

  // Atajos de descarga/impresión/copy
  const onKey = (ev) => {
    const k = (ev.key || "").toLowerCase();
    if ((ev.ctrlKey || ev.metaKey) && ["s", "p", "c", "a", "u", "x"].includes(k)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    // PrintScreen — best effort: limpiar clipboard si existe
    if (k === "printscreen" || ev.key === "PrintScreen") {
      try { navigator.clipboard?.writeText(""); } catch {}
    }
    // F12 / Ctrl+Shift+I / Cmd+Opt+I (devtools)
    if (k === "f12") ev.preventDefault();
    if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && (k === "i" || k === "j" || k === "c")) {
      ev.preventDefault();
    }
  };
  document.addEventListener("keydown", onKey, true);

  // Ocultar al perder foco / visibilidad / cambio de pestaña
  const setHidden = (on) => document.body.classList.toggle("vp-hidden", on);
  const onBlur = () => setHidden(true);
  const onFocus = () => setHidden(false);
  const onVis = () => setHidden(document.hidden);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVis);

  return () => {
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVis);
    document.body.classList.remove("vp-hidden", "vp-public");
  };
};

const showError = (root, title, detail) => {
  root.innerHTML = `
    <div class="vp-error">
      <div style="max-width:520px">
        <div style="font-size:16px;font-weight:600;color:#f87171;margin-bottom:8px">${e(title)}</div>
        ${detail ? `<div style="font-size:12px;color:#8a8f9a;font-family:var(--font-mono);background:#11141a;padding:10px 14px;border-radius:6px;border:1px solid #262b35;text-align:left;white-space:pre-wrap">${e(detail)}</div>` : ""}
        <div style="margin-top:14px;font-size:12px;color:#5e6a82">Si esto persiste, mostrale este mensaje a quien te mandó el link.</div>
      </div>
    </div>
  `;
};

export const render = async (root) => {
  document.body.classList.add("vp-public");
  const slug = slugFromHash();
  if (!slug) {
    showError(root, "Link inválido", "La URL no contiene un slug válido.");
    return () => document.body.classList.remove("vp-public");
  }

  root.innerHTML = `<div class="vp-loading">Cargando proforma…</div>`;

  let data;
  try {
    data = await fetchProforma(slug);
  } catch (err) {
    console.error("[publico] fetchProforma falló:", err);
    showError(root, "No pude cargar este documento.", `${err?.message || err}\n\nslug: ${slug}`);
    return () => document.body.classList.remove("vp-public");
  }
  if (!data) {
    showError(root, "Este link expiró o no existe.", `slug: ${slug}`);
    return () => document.body.classList.remove("vp-public");
  }

  // Registrar la apertura — fire-and-forget; errores van a la consola.
  logApertura(slug);

  // Renderizar — si tira excepción, la mostramos en pantalla en vez de
  // dejar la página colgada en "Cargando…".
  let html;
  try {
    html = await renderViewer(data, slug);
  } catch (err) {
    console.error("[publico] renderViewer falló:", err, "data:", data);
    showError(root, "Error al renderizar el documento.", `${err?.message || err}\n\n${err?.stack || ""}`);
    return () => document.body.classList.remove("vp-public");
  }

  root.innerHTML = html;
  const cleanupProt = installProtections(root);

  const stage = root.querySelector(".vp-stage");
  const a4 = stage ? mountA4Fit(stage, { paddingX: 64, maxScale: 1.4, fitSelector: ".vp-fit" }) : { dispose: () => {} };

  return () => {
    a4.dispose();
    cleanupProt();
  };
};
