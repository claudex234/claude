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
import { startTracking } from "../lib/tracking.js";
import { installProtections } from "../lib/visor_protection.js";

const slugFromHash = () => {
  const m = location.hash.match(/^#\/?p\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
};

const fetchProforma = async (slug) => {
  const { data, error } = await supabase.rpc("get_public_proforma", { p_slug: slug });
  if (error) throw error;
  return data;
};

const showBlocked = (root) => {
  root.innerHTML = `
    <div class="vp-error">
      <div style="max-width:520px;text-align:center">
        <div style="font-size:18px;font-weight:600;color:#e2e8f0;margin-bottom:10px">Esta vista no está disponible en tu región</div>
        <div style="font-size:13px;color:#8a8f9a">El emisor de este documento restringió el acceso a Perú.</div>
      </div>
    </div>`;
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

  // Tracking real (geo + open_apertura + heartbeat). Si el owner exige
  // PE y no estamos en PE, mostramos pantalla de bloqueo y desmontamos.
  let blocked = false;
  const track = await startTracking({
    slug,
    root,
    onBlocked: () => { blocked = true; },
  });
  if (blocked) {
    a4.dispose();
    cleanupProt();
    track.dispose();
    showBlocked(root);
    return () => document.body.classList.remove("vp-public");
  }

  return () => {
    a4.dispose();
    cleanupProt();
    track.dispose();
  };
};
