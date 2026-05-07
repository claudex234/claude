import { html, raw, el, on } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { TEMPLATES } from "../data/metrics.js";
import { SKINS } from "../data/productos.js";

const skinPreview = (s) => {
  const fontFam = s.cover.font === "serif" ? '"Fraunces", serif'
    : s.cover.font === "mono" ? '"JetBrains Mono", monospace'
    : '"Inter", sans-serif';
  return `
    <div style="height:180px;background:${s.cover.bg};padding:14px 16px;display:flex;flex-direction:column;gap:8px;font-family:${fontFam};position:relative;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="width:36px;height:6px;background:${s.cover.accent};margin-bottom:4px;border-radius:1px"></div>
          <div style="width:60px;height:4px;background:${s.cover.accent};opacity:.4;border-radius:1px"></div>
        </div>
        <div style="font-size:8px;color:${s.cover.accent};font-weight:700;letter-spacing:1px">PROFORMA</div>
      </div>
      <div style="font-size:11px;font-weight:700;color:${s.cover.accent};margin-top:4px">Cliente Demo S.A.C.</div>
      <div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">
        ${[80,65,90,55].map(w => `
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="width:${w}%;height:3px;background:${s.cover.accent};opacity:.25;border-radius:1px"></div>
            <div style="width:22px;height:3px;background:${s.cover.accent};opacity:.5;border-radius:1px"></div>
          </div>
        `).join("")}
      </div>
      <div style="margin-top:auto;padding-top:8px;border-top:1px solid ${s.cover.accent}33;display:flex;justify-content:space-between;align-items:center">
        <div style="width:30px;height:4px;background:${s.cover.accent};opacity:.6;border-radius:1px"></div>
        <div style="font-size:10px;font-weight:700;color:${s.cover.accent}">S/ 12,400</div>
      </div>
    </div>
  `;
};

export const render = (root) => {
  let tab = "skins";

  const buildSkins = () => html`
    <div style="padding:12px 14px;background:var(--info-soft);border:1px solid var(--info);border-radius:var(--radius);margin-bottom:16px;font-size:12.5px;display:flex;gap:10px;align-items:center">
      ${raw(icon("palette", 14))}
      <div style="flex:1">El skin define cómo se ve el PDF que recibe el cliente. Puedes asignar uno por defecto y cambiarlo por proforma.</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:16px">
      ${raw(SKINS.map(s => `
        <div class="card" style="padding:0;overflow:hidden;cursor:pointer;border-color:${s.activa?"var(--accent)":"var(--border)"};border-width:${s.activa?2:1}px">
          ${skinPreview(s)}
          <div style="padding:14px;position:relative">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
              <div style="min-width:0">
                <div style="font-size:14px;font-weight:650">${s.nombre}</div>
                <div style="font-size:11.5px;color:var(--text-3);margin-top:2px;line-height:1.4">${s.desc}</div>
              </div>
              ${s.activa ? '<span class="badge badge-accent" style="flex-shrink:0">Activo</span>' : ''}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
              <span style="font-size:11px;color:var(--text-mute)">${s.uso} proformas con este skin</span>
              <div style="display:flex;gap:6px">
                <button class="btn btn-sm">${icon("edit", 11)} Editar</button>
                ${!s.activa ? '<button class="btn btn-sm btn-primary">Usar</button>' : ''}
              </div>
            </div>
          </div>
        </div>
      `).join(""))}
    </div>
  `;

  const buildContent = () => html`
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:16px">
      ${raw(TEMPLATES.map(t => `
        <div class="card" style="padding:0;cursor:pointer">
          <div style="height:100px;background:${t.default ? "linear-gradient(135deg, var(--accent), var(--accent-strong))" : "var(--bg-sunken)"};border-radius:var(--radius) var(--radius) 0 0;display:grid;place-items:center;color:${t.default ? "white" : "var(--text-mute)"};position:relative">
            ${icon("template", 32)}
            ${t.default ? '<span style="position:absolute;top:10px;right:10px;font-size:10px;padding:2px 8px;background:rgba(255,255,255,.2);border-radius:999px;color:white;font-weight:600">POR DEFECTO</span>' : ''}
          </div>
          <div style="padding:16px">
            <div style="font-size:14px;font-weight:600;margin-bottom:4px">${t.nombre}</div>
            <div style="font-size:12px;color:var(--text-3);display:flex;justify-content:space-between">
              <span>${t.items} líneas</span><span>${t.uso} usos</span>
            </div>
          </div>
        </div>
      `).join(""))}
    </div>
  `;

  const build = () => el(html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Plantillas</h1>
          <p class="page-sub">Skins visuales para tus proformas y plantillas de contenido reutilizables.</p>
        </div>
        <button class="btn btn-primary">${raw(icon("plus"))} ${tab === "skins" ? "Nuevo skin" : "Nueva plantilla"}</button>
      </div>
      <div style="display:flex;gap:4px;padding:4px;background:var(--bg-soft);border-radius:var(--radius-sm);margin-bottom:20px;width:fit-content">
        ${raw([{id:"skins",l:"Skins visuales",c:SKINS.length},{id:"contenido",l:"Plantillas de contenido",c:TEMPLATES.length}].map(t => `
          <button class="btn btn-sm" data-tab="${t.id}" style="
            background:${tab === t.id ? "var(--surface)" : "transparent"};border:none;
            box-shadow:${tab === t.id ? "var(--shadow-sm)" : "none"};
            color:${tab === t.id ? "var(--text)" : "var(--text-3)"};
            font-weight:${tab === t.id ? 600 : 500}">${t.l} <span style="margin-left:4px;color:var(--text-mute)">${t.c}</span></button>
        `).join(""))}
      </div>
      ${raw(tab === "skins" ? buildSkins() : buildContent())}
    </div>
  `);

  let node = build();
  root.appendChild(node);

  const wire = (target) => {
    on(target, "click", "[data-tab]", (_, btn) => {
      tab = btn.dataset.tab;
      const next = build(); node.replaceWith(next); node = next; wire(node);
    });
  };
  wire(node);
};
