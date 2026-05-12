import { html, raw, el } from "../lib/utils.js";
import { icon } from "../lib/icons.js";

const FILES = [
  { nombre: "Ficha técnica ED88PP-86 (PLUS).pdf", tipo: "pdf", tam: "2.4 MB", fecha: "2026-04-22", proforma: "PRF-2026-0141", asociadoA: "PLUS" },
  { nombre: "Ficha técnica ED88PP-75 (PRO).pdf", tipo: "pdf", tam: "2.1 MB", fecha: "2026-04-22", proforma: "PRF-2026-0141", asociadoA: "PRO" },
  { nombre: "Certificado de garantía 3 años.pdf", tipo: "pdf", tam: "0.8 MB", fecha: "2026-03-12", proforma: "PRF-2026-0140", asociadoA: "ELITE" },
  { nombre: "Render aula híbrida.png", tipo: "image", tam: "1.6 MB", fecha: "2026-04-10", proforma: "PRF-2026-0140" },
  { nombre: "Cronograma de instalación Innova.xlsx", tipo: "doc", tam: "120 KB", fecha: "2026-04-26", proforma: "PRF-2026-0141" },
  { nombre: "Presentación comercial Q2 2026.pdf", tipo: "pdf", tam: "5.2 MB", fecha: "2026-04-01", proforma: null },
];

const iconFor = (t) => t === "image" ? "image" : t === "doc" ? "file" : "file";

export const render = (root) => {
  const node = el(html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Adjuntos</h1>
          <p class="page-sub">${FILES.length} archivos · fichas técnicas, certificados y material comercial</p>
        </div>
      </div>

      <div class="card" style="background:var(--bg-soft);border:1px dashed var(--border);padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:var(--text-3)">
        Vista preview. La funcionalidad real (subir desde productos,
        adjuntar a proformas, trackear clicks en el visor) está en
        desarrollo.
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:14px">
        ${raw(FILES.map(f => `
          <div class="card" style="padding:14px;display:flex;gap:12px;align-items:flex-start">
            <div style="width:44px;height:44px;border-radius:10px;background:var(--accent-soft);display:grid;place-items:center;color:var(--accent-strong);flex-shrink:0">${icon(iconFor(f.tipo), 20)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;line-height:1.35;word-break:break-word">${f.nombre}</div>
              <div style="font-size:11px;color:var(--text-mute);font-family:var(--font-mono);margin-top:4px">${f.tam} · ${f.fecha}</div>
              <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                ${f.proforma ? `<span class="badge" style="font-size:10.5px">${f.proforma}</span>` : ''}
                ${f.asociadoA ? `<span class="badge badge-accent" style="font-size:10.5px">${f.asociadoA}</span>` : ''}
              </div>
            </div>
            <button class="btn-icon btn-ghost" title="Más">${icon("more", 14)}</button>
          </div>
        `).join(""))}
      </div>
    </div>
  `);
  root.appendChild(node);
};
