import { html, raw, el, on, fmtMoney } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { PRODUCTOS } from "../data/productos.js";
import { navigate } from "../lib/router.js";

export const render = (root) => {
  const items = Object.values(PRODUCTOS);
  const node = el(html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Productos</h1>
          <p class="page-sub">${items.length} productos en el catálogo · pantallas interactivas para educación</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn" data-action="adjuntos">${raw(icon("paperclip"))} Adjuntos</button>
          <button class="btn btn-primary">${raw(icon("plus"))} Nuevo producto</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:16px">
        ${raw(items.map(p => `
          <div class="card" style="padding:0;overflow:hidden">
            <div style="background:#0a1f4d;display:grid;place-items:center;height:180px">
              <img src="${p.imagen}" alt="${p.nombre}" style="width:80%;max-height:160px;object-fit:contain">
            </div>
            <div style="padding:16px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:6px">
                <div style="font-size:14px;font-weight:650;line-height:1.3">${p.nombre}</div>
                <span class="badge badge-accent" style="flex-shrink:0;font-family:var(--font-mono);font-size:11px">${p.codigo}</span>
              </div>
              <div style="font-size:11px;color:var(--text-mute);font-family:var(--font-mono);margin-bottom:10px">${p.tamano} · desde ${fmtMoney(p.precioDefault)}</div>
              <div style="font-size:12px;color:var(--text-2);line-height:1.5">
                ${p.specsHighlight.slice(0, 4).map(s => `<div style="margin-bottom:3px">· ${s}</div>`).join("")}
              </div>
              <div style="display:flex;gap:6px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
                <button class="btn btn-sm" style="flex:1">${icon("edit", 11)} Editar</button>
                <button class="btn btn-sm" style="flex:1">${icon("eye", 11)} Vista previa</button>
              </div>
            </div>
          </div>
        `).join(""))}
      </div>
    </div>
  `);
  on(node, "click", "[data-action='adjuntos']", () => navigate("adjuntos"));
  root.appendChild(node);
};
