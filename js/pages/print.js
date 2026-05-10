// Vista de impresión interna (#/print/<numero>). Auth-gated: solo
// nosotros, no los clientes. Renderiza la planilla en formato A4 y
// dispara window.print() al cargar para que el browser ofrezca el
// diálogo de impresión / "Guardar como PDF".

import { escapeHtml as e } from "../lib/utils.js";
import { fetchProformaDetail } from "../data/api.js";
import { renderPlanilla } from "../lib/planillas.js";
import { fromDetail } from "../lib/planilla_data.js";

const showError = (root, msg) => {
  root.innerHTML = `
    <div style="padding:48px;text-align:center;font:14px system-ui;color:#a30b29">
      <div style="font-size:18px;margin-bottom:10px">No pude armar el PDF</div>
      <div style="font-family:ui-monospace,monospace;color:#666;font-size:12px">${e(msg)}</div>
    </div>`;
};

const ensurePrintStyles = () => {
  if (document.getElementById("print-page-styles")) return;
  const s = document.createElement("style");
  s.id = "print-page-styles";
  s.textContent = `
    body.print-mode { background: #ddd; margin: 0; }
    body.print-mode .pp-bar {
      position: sticky; top: 0; z-index: 10;
      background: #1a1d24; color: #fff;
      padding: 10px 18px; display: flex; gap: 10px; align-items: center;
      font: 13px system-ui; border-bottom: 1px solid #000;
    }
    body.print-mode .pp-bar button {
      background: #fff; color: #111; border: 0; padding: 6px 12px;
      border-radius: 4px; font-size: 12.5px; cursor: pointer;
    }
    body.print-mode .pp-bar button.primary { background: #2563eb; color: #fff; }
    body.print-mode .pp-stage {
      padding: 24px; display: grid; place-items: start center;
    }
    body.print-mode .pp-page {
      width: 794px; min-height: 1123px;
      background: #fff; box-shadow: 0 6px 24px rgba(0,0,0,.18);
    }
    @page { size: A4; margin: 0; }
    @media print {
      body.print-mode { background: #fff; }
      body.print-mode .pp-bar { display: none !important; }
      body.print-mode .pp-stage { padding: 0; }
      body.print-mode .pp-page { box-shadow: none; width: 210mm; min-height: 297mm; }
    }
  `;
  document.head.appendChild(s);
};

export const render = async (root, ctx) => {
  const id = ctx?.params?.[0];
  if (!id) { showError(root, "Falta el numero en la URL."); return; }

  ensurePrintStyles();
  document.body.classList.add("print-mode");

  root.innerHTML = `
    <div class="pp-bar">
      <button class="primary" data-action="print">Imprimir / Guardar PDF</button>
      <button data-action="close">Cerrar</button>
      <span style="margin-left:auto;color:#aaa;font-family:ui-monospace,monospace;font-size:12px">${e(id)}</span>
    </div>
    <div class="pp-stage"><div class="pp-page" data-page>Cargando…</div></div>`;

  const close = () => {
    document.body.classList.remove("print-mode");
    if (window.opener) window.close();
    else history.back();
  };
  root.querySelector("[data-action='print']")?.addEventListener("click", () => window.print());
  root.querySelector("[data-action='close']")?.addEventListener("click", close);

  let detail;
  try {
    detail = await fetchProformaDetail(id);
  } catch (err) {
    showError(root, err.message || String(err));
    return () => document.body.classList.remove("print-mode");
  }
  if (!detail) {
    showError(root, `No existe ${id}.`);
    return () => document.body.classList.remove("print-mode");
  }

  try {
    const inner = await renderPlanilla(detail.skin?.codigo || "corporate", fromDetail(detail));
    const page = root.querySelector("[data-page]");
    if (page) page.innerHTML = inner;
  } catch (err) {
    showError(root, err.message || String(err));
    return () => document.body.classList.remove("print-mode");
  }

  // Disparar el diálogo de impresión cuando todo terminó de pintar.
  // Pequeño delay para que las imágenes de la planilla puedan cargar.
  setTimeout(() => { try { window.print(); } catch {} }, 600);

  return () => document.body.classList.remove("print-mode");
};
