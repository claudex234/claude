// Visor público de proformas — accesible vía #/p/<slug> sin auth.
// Renderiza la hoja A4 a pantalla completa con protecciones para
// disuadir capturas/descargas. (Bloquear capturas 100% es imposible
// en un browser; esto sólo dificulta y deja huella.)
import { supabase } from "../lib/supabase.js";
import { fmtMoney, escapeHtml as e } from "../lib/utils.js";
import { EMISOR, BLOQUES_PANTALLA } from "../data/empresa.js";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const money = (n) => fmtMoney(n).replace("S/ ", "");

const slugFromHash = () => {
  const m = location.hash.match(/^#\/?p\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
};

const fetchProforma = async (slug) => {
  const { data, error } = await supabase.rpc("get_public_proforma", { p_slug: slug });
  if (error) throw error;
  return data;
};

const logApertura = (slug) => {
  supabase.rpc("log_public_apertura", { p_slug: slug, p_user_agent: navigator.userAgent }).catch(() => {});
};

const itemRowHtml = (it) => {
  const ref = it.producto || {};
  const hi = (ref.specs_highlight || []).map((x) => `<div>${e(x)}</div>`).join("");
  const specs = (ref.specs || []).map((x) => `<div>${e(x)}</div>`).join("");
  const incluye = (ref.incluye || []).map((x) => `<div>${e(x)}</div>`).join("");
  return `
    <tr>
      <td class="pv-num">${it.qty}</td>
      <td>
        <div class="pv-item-title">${e(it.descripcion || ref.nombre || "")}</div>
        ${hi ? `<div class="pv-item-hi">${hi}</div>` : ""}
        ${specs ? `<div class="pv-item-specs">${specs}</div>` : ""}
        ${incluye ? `<div class="pv-incluye-title">INCLUIDO EN EL PAQUETE</div><div class="pv-item-specs">${incluye}</div>` : ""}
      </td>
      <td class="pv-num pv-right">S/ ${money(it.precio_unit)}</td>
      <td class="pv-num pv-right pv-strong">S/ ${money(it.total)}</td>
    </tr>`;
};

const renderViewer = (data, slug) => {
  const p = data.proforma;
  const c = data.cliente || {};
  const items = data.items || [];
  const showBloques = items.length > 0;

  // Marca de agua: slug + timestamp + UA acortado. Cualquier captura llevará
  // este texto repetido en diagonal.
  const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
  const wm = `${slug.slice(0, 8)} · ${ts}`;

  return `
    <div class="vp-shell">
      <div class="vp-watermark" aria-hidden="true">
        ${Array.from({ length: 60 }, () => `<span>${e(wm)}</span>`).join("")}
      </div>
      <header class="vp-bar">
        <div class="vp-bar-emisor">
          <div class="pv-logo-mark">N</div>
          <div>
            <div class="vp-bar-name">${e(EMISOR.razonSocial)}</div>
            <div class="vp-bar-meta">Proforma ${e(p.numero)}</div>
          </div>
        </div>
        <div class="vp-bar-warn" title="No se permite capturar ni descargar este documento">
          🔒 Vista protegida · ${e(slug)}
        </div>
      </header>

      <main class="vp-stage">
        <div class="vp-fit">
          <div class="pv-doc">
            <article class="pv-page">
              <header class="pv-header">
                <div class="pv-emisor">
                  <div class="pv-logo-mark">N</div>
                  <div>
                    <div class="pv-emisor-name">${e(EMISOR.razonSocial)}</div>
                    <div class="pv-emisor-meta">RUC ${e(EMISOR.ruc)} · ${e(EMISOR.email)} · ${e(EMISOR.telefono)}</div>
                  </div>
                </div>
                <div class="pv-doc-meta">
                  <div class="pv-doc-label">DOCUMENTO</div>
                  <div class="pv-doc-numero">${e(p.numero)}</div>
                  <div class="pv-doc-fecha">${fmtDate(p.emitida)}</div>
                </div>
              </header>
              <h2 class="pv-title">${e(p.asunto || "Proforma")}</h2>
              <div class="pv-grid-2">
                <section class="pv-card">
                  <div class="pv-card-label">CLIENTE</div>
                  <div class="pv-card-strong">${e(c.razon_social || "—")}</div>
                  ${c.ruc ? `<div class="pv-card-row">RUC ${e(c.ruc)}</div>` : ""}
                  ${c.contacto ? `<div class="pv-card-row">${e(c.contacto)}</div>` : ""}
                  ${c.email ? `<div class="pv-card-row">${e(c.email)}</div>` : ""}
                  ${c.telefono ? `<div class="pv-card-row">${e(c.telefono)}</div>` : ""}
                </section>
                <section class="pv-card">
                  <div class="pv-card-label">TÉRMINOS</div>
                  <dl class="pv-terms">
                    <dt>Tiempo entrega</dt><dd>${e(EMISOR.defaults.tiempoEntrega)}</dd>
                    <dt>Lugar entrega</dt><dd>${e(EMISOR.defaults.lugarEntrega)}</dd>
                    <dt>Garantía</dt><dd>${e(EMISOR.defaults.garantia)}</dd>
                    <dt>Validez</dt><dd>${fmtDate(p.validez)}</dd>
                    <dt>Condiciones</dt><dd>${e(EMISOR.defaults.condiciones)}</dd>
                  </dl>
                </section>
              </div>
              <table class="pv-items">
                <thead>
                  <tr>
                    <th class="pv-th-num">CANT</th><th>DESCRIPCIÓN</th>
                    <th class="pv-right">P. UND</th><th class="pv-right">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>${items.map(itemRowHtml).join("")}</tbody>
              </table>
              <div class="pv-totales">
                <div><span>Subtotal</span><b>S/ ${money(p.subtotal)}</b></div>
                <div><span>IGV (18%)</span><b>S/ ${money(p.igv)}</b></div>
                <div class="pv-total-row"><span>Total</span><b>S/ ${money(p.total)}</b></div>
              </div>
              <div class="pv-page-foot">1 / 2</div>
            </article>
            <article class="pv-page">
              ${showBloques ? `
                <div class="pv-grid-2">
                  <section class="pv-block pv-block-ok">
                    <div class="pv-block-title">SERVICIOS INCLUIDOS</div>
                    ${BLOQUES_PANTALLA.servicios.map((x) => `<div>· ${e(x)}</div>`).join("")}
                  </section>
                  <section class="pv-block pv-block-no">
                    <div class="pv-block-title">NO INCLUIDO</div>
                    ${BLOQUES_PANTALLA.noIncluido.map((x) => `<div>· ${e(x)}</div>`).join("")}
                  </section>
                </div>` : ""}
              <section class="pv-cuentas">
                <div class="pv-card-label">CUENTAS BANCARIAS</div>
                ${EMISOR.cuentas.map((b) => `
                  <div class="pv-cuenta"><b>${e(b.banco)} ${e(b.moneda)}:</b> ${e(b.numero)} · <b>CCI</b> ${e(b.cci)}</div>
                `).join("")}
                <div class="pv-cuenta-pago"><b>Forma de pago:</b> ${e(EMISOR.defaults.formaPago)}</div>
              </section>
              <div class="pv-firma">
                <div class="pv-firma-label">Atentamente,</div>
                <div class="pv-firma-name">${e(EMISOR.firmante)}</div>
              </div>
              <div class="pv-page-foot">2 / 2</div>
            </article>
          </div>
        </div>
      </main>

      <div class="vp-blackout" aria-hidden="true">
        <div class="vp-blackout-text">Vista pausada — esta página oculta el contenido cuando no está en foco</div>
      </div>
    </div>
  `;
};

const PAGE_W = 794;

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

export const render = async (root) => {
  document.body.classList.add("vp-public");
  const slug = slugFromHash();
  if (!slug) {
    root.innerHTML = `<div class="vp-error">Link inválido.</div>`;
    return () => document.body.classList.remove("vp-public");
  }

  root.innerHTML = `<div class="vp-loading">Cargando proforma…</div>`;

  let data;
  try {
    data = await fetchProforma(slug);
  } catch (err) {
    root.innerHTML = `<div class="vp-error">No pude cargar este documento.<br><small>${e(err.message || "")}</small></div>`;
    return () => document.body.classList.remove("vp-public");
  }
  if (!data) {
    root.innerHTML = `<div class="vp-error">Este link expiró o no existe.</div>`;
    return () => document.body.classList.remove("vp-public");
  }

  // Registrar la apertura (no-blocking)
  logApertura(slug);

  root.innerHTML = renderViewer(data, slug);
  const cleanupProt = installProtections(root);

  const ro = new ResizeObserver(() => fitDoc(root));
  ro.observe(root.querySelector(".vp-stage"));
  requestAnimationFrame(() => fitDoc(root));

  return () => {
    ro.disconnect();
    cleanupProt();
  };
};
