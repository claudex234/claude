// Visor público de proformas — accesible vía #/p/<slug> sin auth.
// Renderiza la hoja A4 a pantalla completa con protecciones para
// disuadir capturas/descargas. (Bloquear capturas 100% es imposible
// en un browser; esto sólo dificulta y deja huella.)
import { supabase } from "../lib/supabase.js";
import { escapeHtml as e } from "../lib/utils.js";
import { EMISOR, BLOQUES_PANTALLA } from "../data/empresa.js";
import { renderProformaContent } from "../lib/proforma_template.js";

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

const fmtDateLocal = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Construye el shape `data` + map de productos a partir del payload del RPC.
const buildPublicData = (payload) => {
  const p = payload.proforma;
  const c = payload.cliente || {};
  const productosMap = {};
  const items = (payload.items || []).map((it) => {
    const ref = it.producto;
    if (ref) {
      productosMap[ref.codigo] = {
        codigo: ref.codigo,
        nombre: ref.nombre,
        tipo: ref.tipo || "pantalla",
        imagen: ref.imagen || "",
        specs: ref.specs || [],
        specsHighlight: ref.specs_highlight || [],
        incluye: ref.incluye || [],
      };
    }
    return {
      qty: it.qty,
      modelo: ref?.codigo || it.descripcion,
      precio: Number(it.precio_unit) || 0,
    };
  });
  return {
    productos: productosMap,
    data: {
      numero: p.numero,
      fecha: fmtDateLocal(p.emitida),
      empresa: {
        nombre: EMISOR.razonSocial,
        ruc: EMISOR.ruc,
        contacto: EMISOR.firmante,
        telefono: EMISOR.telefono,
        email: EMISOR.email,
      },
      cliente: {
        razon: c.razon_social || "",
        ruc: c.ruc || "",
        contacto: c.contacto || "",
        email: c.email || "",
        telefono: c.telefono || "",
      },
      terminos: {
        tiempoEntrega: EMISOR.defaults.tiempoEntrega,
        lugarEntrega: EMISOR.defaults.lugarEntrega,
        garantia: EMISOR.defaults.garantia,
        validez: 15,
        condiciones: EMISOR.defaults.condiciones,
      },
      bancos: EMISOR.cuentas.map((b) => ({
        nombre: `${b.banco} ${b.moneda}`,
        cuenta: b.numero,
        cci: b.cci,
      })),
      formaPago: EMISOR.defaults.formaPago,
      titularBanco: EMISOR.titularBanco || EMISOR.razonSocial,
      firma: EMISOR.firmante,
      precioIncluyeIGV: !!EMISOR.defaults.precioIncluyeIGV,
      items,
    },
  };
};

const renderViewer = (payload, slug) => {
  const { data, productos } = buildPublicData(payload);
  const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
  const wm = `${slug.slice(0, 8)} · ${ts}`;
  const content = renderProformaContent(data, productos, BLOQUES_PANTALLA);

  return `
    <div class="vp-shell">
      <div class="vp-watermark" aria-hidden="true">
        ${Array.from({ length: 60 }, () => `<span>${e(wm)}</span>`).join("")}
      </div>
      <header class="vp-bar">
        <div class="vp-bar-emisor">
          <div class="vp-bar-name">${e(EMISOR.razonSocial)}</div>
          <div class="vp-bar-meta">Proforma ${e(payload.proforma.numero)}</div>
        </div>
        <div class="vp-bar-warn" title="No se permite capturar ni descargar este documento">
          🔒 Vista protegida · ${e(slug)}
        </div>
      </header>
      <main class="vp-stage">
        <div class="vp-fit">
          <div class="pv-doc">
            <article class="pv-page">${content}</article>
          </div>
        </div>
      </main>
      <div class="vp-blackout" aria-hidden="true">
        <div class="vp-blackout-text">Vista pausada — esta página oculta el contenido cuando no está en foco</div>
      </div>
    </div>
  `;
};

const PAGE_W = 595;

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

const fitDoc = (root) => {
  const stage = root.querySelector(".vp-stage");
  const fit = root.querySelector(".vp-fit");
  const doc = root.querySelector(".pv-doc");
  if (!stage || !fit || !doc) return;
  const cw = stage.clientWidth - 64;
  if (cw <= 0) return;
  const scale = Math.max(0.3, Math.min(1.4, cw / PAGE_W));
  doc.style.transformOrigin = "top left";
  doc.style.transform = `scale(${scale})`;
  fit.style.width = (PAGE_W * scale) + "px";
  fit.style.height = (doc.scrollHeight * scale) + "px";
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
    html = renderViewer(data, slug);
  } catch (err) {
    console.error("[publico] renderViewer falló:", err, "data:", data);
    showError(root, "Error al renderizar el documento.", `${err?.message || err}\n\n${err?.stack || ""}`);
    return () => document.body.classList.remove("vp-public");
  }

  root.innerHTML = html;
  const cleanupProt = installProtections(root);

  const stage = root.querySelector(".vp-stage");
  const ro = new ResizeObserver(() => fitDoc(root));
  if (stage) ro.observe(stage);
  requestAnimationFrame(() => fitDoc(root));

  return () => {
    ro.disconnect();
    cleanupProt();
  };
};
