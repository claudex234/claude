// Manager de planillas (skins). Lista skins, permite crearlas, editarlas
// (HTML en textarea), marcarlas como default y eliminarlas.

import { html, raw, el, on, escapeHtml as e } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { SKINS } from "../data/skins.js";
import { upsertSkin, deleteSkin, setDefaultSkin, fetchSkins } from "../data/api.js";
import { resolvePlanillaHtml, renderPlanillaWith } from "../lib/planillas.js";
import { toast } from "../lib/toast.js";

const slugify = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

// Datos de ejemplo livianos para el preview en miniatura.
const SAMPLE_DATA = {
  numero: "PRF-2026-0001",
  fecha: "08/05/2026",
  emisor: {
    razonSocial: "EDUBOARD EIRL",
    ruc: "20603573758",
    firmante: "Manuel Dueñas Cazani",
    logoSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 36"><g fill="none" stroke="#0a0a0a" stroke-width="2"><line x1="8" y1="1" x2="162" y2="1"/><line x1="169" y1="8" x2="169" y2="28"/><line x1="8" y1="35" x2="162" y2="35"/><line x1="1" y1="8" x2="1" y2="28"/><path d="M8 1 Q 1 1 1 8"/><path d="M162 1 Q 169 1 169 8"/><path d="M8 35 Q 1 35 1 28"/><path d="M162 35 Q 169 35 169 28"/></g><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-size="18" font-family="system-ui" fill="#0a0a0a" letter-spacing="3"><tspan font-weight="700">EDU</tspan><tspan>BOARD</tspan></text></svg>',
    cuentas: [{ banco: "BCP", moneda: "Soles", numero: "194-…", cci: "002 …" }],
  },
  cliente: { razon: "Cliente Demo S.A.C.", ruc: "20512345678", contacto: "María Q.", email: "demo@x.pe", telefono: "+51 987 654 321" },
  terminos: { tiempoEntrega: "07 días", lugarEntrega: "Lima", garantia: "2 años", validez: 15, condiciones: "T/T" },
  items: [{ qty: 1, precio: "8,500.00", total: "8,500.00", nombre: "Pantalla PRO 75″", codigo: "PRO", imagen: "", specs: ["4K UHD", "Android 13"], specsHighlight: ["RAM 8 GB", "IA educativa"], incluye: ["Cable USB", "Manual"] }],
  totales: { subtotal: "8,500.00", igv: "1,530.00", total: "10,030.00" },
  showBloques: true,
  bloques: { servicios: ["Entrega e instalación"], noIncluido: ["Cables eléctricos"] },
};

const skinCard = (s) => `
  <div class="skin-card${s.activa ? " skin-card-active" : ""}" data-codigo="${e(s.codigo)}">
    <div class="skin-card-preview" data-preview-for="${e(s.codigo)}">
      <div class="skin-card-loading">Cargando…</div>
    </div>
    <div class="skin-card-body">
      <div class="skin-card-row">
        <div>
          <div class="skin-card-name">${e(s.nombre)}</div>
          <div class="skin-card-code">${e(s.codigo)}</div>
        </div>
        ${s.activa ? '<span class="badge badge-accent">Default</span>' : ""}
      </div>
      ${s.desc ? `<div class="skin-card-desc">${e(s.desc)}</div>` : ""}
      <div class="skin-card-actions">
        <button class="btn btn-sm" data-action="edit" data-id="${e(s.id)}">${raw(icon("edit", 11))} Editar</button>
        ${!s.activa ? `<button class="btn btn-sm" data-action="default" data-id="${e(s.id)}">Marcar default</button>` : ""}
        <button class="btn btn-sm" data-action="duplicate" data-id="${e(s.id)}">Duplicar</button>
        <button class="btn btn-sm" data-action="delete" data-id="${e(s.id)}" style="color:var(--danger)">${raw(icon("trash", 11))}</button>
      </div>
    </div>
  </div>`;

const editorMarkup = (skin) => {
  const isNew = !skin.id;
  return `
    <div class="skin-editor-shell" data-skin-editor>
      <header class="skin-editor-bar">
        <div>
          <div class="skin-editor-title">${isNew ? "Nueva planilla" : "Editar planilla"}</div>
          <div class="skin-editor-sub">${e(skin.nombre || "(sin nombre)")} · <span class="mono">${e(skin.codigo || "?")}</span></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn" data-action="upload">${raw(icon("download", 13))} Subir HTML</button>
          <button class="btn" data-action="cancel">Cancelar</button>
          <button class="btn btn-primary" data-action="save">${raw(icon("send", 13))} Guardar</button>
        </div>
      </header>
      <div class="skin-editor-grid">
        <aside class="skin-editor-meta">
          <label class="gen-field"><span>Nombre</span><input class="input" data-meta="nombre" value="${e(skin.nombre || "")}"></label>
          <label class="gen-field"><span>Código</span><input class="input" data-meta="codigo" value="${e(skin.codigo || "")}" placeholder="ej. minimal"></label>
          <label class="gen-field"><span>Descripción</span><textarea class="input" data-meta="descripcion" rows="3">${e(skin.desc || "")}</textarea></label>
          <label class="gen-field" style="flex-direction:row;align-items:center;gap:8px">
            <input type="checkbox" data-meta="activa" ${skin.activa ? "checked" : ""}>
            <span style="text-transform:none;letter-spacing:0">Marcar como default</span>
          </label>
          <details style="margin-top:14px;font-size:11.5px;color:var(--text-3)">
            <summary style="cursor:pointer">Tokens disponibles</summary>
            <pre style="font-size:10.5px;line-height:1.5;background:var(--bg-soft);padding:8px;border-radius:4px;overflow:auto;white-space:pre-wrap">{{numero}}, {{fecha}}
{{emisor.razonSocial}}, {{emisor.ruc}}
{{!emisor.logoSvg}}, {{emisor.firmante}}
{{cliente.razon}}, {{cliente.ruc}}, ...

{{#each items}}
  {{nombre}}, {{qty}}, {{precio}}, {{total}}
  {{codigo}}, {{!imagen}}
  {{#each specs}}{{this}}{{/each}}
  {{#each specsHighlight}}{{this}}{{/each}}
  {{#each incluye}}{{this}}{{/each}}
{{/each}}

{{totales.subtotal}}, {{totales.igv}}, {{totales.total}}
{{#if showBloques}}…{{/if}}
{{#each bloques.servicios}}…{{/each}}
{{#each emisor.cuentas}}…{{/each}}</pre>
          </details>
          <input type="file" data-file accept=".html,text/html" style="display:none">
        </aside>
        <div class="skin-editor-code">
          <textarea class="skin-editor-textarea" data-html spellcheck="false">${e(skin.html || "")}</textarea>
        </div>
        <div class="skin-editor-preview" data-preview>
          <div style="padding:24px;color:var(--text-mute);font-size:12px">El preview aparece al editar.</div>
        </div>
      </div>
    </div>`;
};

const renderMiniPreview = async (codigo, container) => {
  try {
    const tpl = await resolvePlanillaHtml(codigo);
    const inner = renderPlanillaWith(tpl, SAMPLE_DATA);
    container.innerHTML = `<div class="skin-mini-doc"><article class="skin-mini-page">${inner}</article></div>`;
    requestAnimationFrame(() => {
      const page = container.querySelector(".skin-mini-page");
      if (!page) return;
      const scale = container.clientWidth / 794;
      page.style.transform = `scale(${scale})`;
      page.style.transformOrigin = "top left";
    });
  } catch (err) {
    container.innerHTML = `<div style="padding:14px;color:var(--danger);font-size:11px">${e(err.message || err)}</div>`;
  }
};

export const render = (root) => {
  let editing = null;

  const buildList = () => html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Plantillas</h1>
          <p class="page-sub">${SKINS.length} skins disponibles. Cada una es un HTML autocontenido con tokens.</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" data-action="new">${raw(icon("plus"))} Nueva planilla</button>
        </div>
      </div>
      <div class="skin-grid">
        ${raw(SKINS.map(skinCard).join(""))}
      </div>
      ${SKINS.length === 0 ? raw('<div class="card" style="padding:24px;text-align:center;color:var(--text-mute)">Sin planillas todavía. Click "Nueva planilla".</div>') : ""}
    </div>
  `;

  let node = el(buildList());
  root.appendChild(node);

  const renderAllPreviews = () => requestAnimationFrame(() => {
    SKINS.forEach((s) => {
      const slot = node.querySelector(`[data-preview-for="${CSS.escape(s.codigo)}"]`);
      if (slot) renderMiniPreview(s.codigo, slot);
    });
  });

  const remountList = () => {
    const next = el(buildList());
    node.replaceWith(next);
    node = next;
    wireList();
    renderAllPreviews();
  };

  const refreshSKINS = async () => {
    const rows = await fetchSkins();
    SKINS.length = 0;
    for (const r of rows) {
      SKINS.push({
        id: r.id, codigo: r.codigo, nombre: r.nombre,
        desc: r.descripcion || "", cover: r.cover || {},
        activa: !!r.activa, html: r.html || null, uso: 0,
      });
    }
  };

  const openEditor = async (skin) => {
    editing = { ...skin };
    if (!editing.html) {
      try { editing.html = await resolvePlanillaHtml(editing.codigo || "corporate"); }
      catch { editing.html = ""; }
    }
    const next = el(editorMarkup(editing));
    node.replaceWith(next);
    node = next;
    wireEditor();
    runPreview();
  };

  const closeEditor = () => { editing = null; remountList(); };

  const runPreview = () => {
    const target = node.querySelector("[data-preview]");
    if (!target) return;
    try {
      const inner = renderPlanillaWith(editing.html || "", SAMPLE_DATA);
      target.innerHTML = `<div class="skin-mini-doc"><article class="skin-mini-page">${inner}</article></div>`;
      requestAnimationFrame(() => {
        const page = target.querySelector(".skin-mini-page");
        if (!page) return;
        const cw = target.clientWidth;
        const scale = Math.min(1, cw / 794);
        page.style.transform = `scale(${scale})`;
        page.style.transformOrigin = "top left";
      });
    } catch (err) {
      target.innerHTML = `<div style="padding:14px;color:var(--danger);font-size:11.5px;font-family:var(--font-mono);white-space:pre-wrap">${e(err.message || err)}</div>`;
    }
  };

  const wireList = () => {
    on(node, "click", "[data-action='new']", () => {
      openEditor({ codigo: "", nombre: "", desc: "", html: "", activa: false });
    });
    on(node, "click", "[data-action='edit']", (_, btn) => {
      const skin = SKINS.find((s) => s.id === btn.dataset.id);
      if (skin) openEditor(skin);
    });
    on(node, "click", "[data-action='duplicate']", async (_, btn) => {
      const skin = SKINS.find((s) => s.id === btn.dataset.id);
      if (!skin) return;
      const html = skin.html || await resolvePlanillaHtml(skin.codigo).catch(() => "");
      openEditor({ codigo: `${skin.codigo}-copy`, nombre: `${skin.nombre} (copia)`, desc: skin.desc, html, activa: false });
    });
    on(node, "click", "[data-action='default']", async (_, btn) => {
      try {
        await setDefaultSkin(btn.dataset.id);
        await refreshSKINS();
        toast("Marcado como default", { type: "ok" });
        remountList();
      } catch (err) { toast(err.message || "Error", { type: "err" }); }
    });
    on(node, "click", "[data-action='delete']", async (_, btn) => {
      const skin = SKINS.find((s) => s.id === btn.dataset.id);
      if (!skin) return;
      if (!confirm(`¿Eliminar la planilla "${skin.nombre}"? Las proformas que la usen volverán al default.`)) return;
      try {
        await deleteSkin(skin.id);
        await refreshSKINS();
        toast("Planilla eliminada", { type: "ok" });
        remountList();
      } catch (err) { toast(err.message || "Error", { type: "err" }); }
    });
  };

  const wireEditor = () => {
    on(node, "click", "[data-action='cancel']", closeEditor);
    on(node, "input", "[data-meta]", (ev) => {
      const k = ev.target.dataset.meta;
      if (k === "activa") editing.activa = ev.target.checked;
      else if (k === "descripcion") editing.desc = ev.target.value;
      else editing[k] = ev.target.value;
    });
    on(node, "input", "[data-html]", (ev) => {
      editing.html = ev.target.value;
      clearTimeout(node._t);
      node._t = setTimeout(runPreview, 250);
    });
    on(node, "click", "[data-action='upload']", () => node.querySelector("[data-file]").click());
    on(node, "change", "[data-file]", async (ev) => {
      const f = ev.target.files?.[0];
      if (!f) return;
      const text = await f.text();
      editing.html = text;
      const ta = node.querySelector("[data-html]");
      if (ta) ta.value = text;
      runPreview();
      toast(`Cargado ${f.name}`, { type: "ok" });
    });
    on(node, "click", "[data-action='save']", async () => {
      if (!editing.codigo?.trim()) editing.codigo = slugify(editing.nombre);
      if (!editing.codigo) { toast("Falta el código", { type: "err" }); return; }
      if (!editing.nombre?.trim()) { toast("Falta el nombre", { type: "err" }); return; }
      try {
        const saved = await upsertSkin({
          id: editing.id,
          codigo: editing.codigo.trim(),
          nombre: editing.nombre.trim(),
          descripcion: editing.desc,
          html: editing.html,
          activa: editing.activa,
        });
        if (editing.activa) await setDefaultSkin(saved.id);
        await refreshSKINS();
        toast("Planilla guardada", { type: "ok" });
        closeEditor();
      } catch (err) { toast(err.message || "Error", { type: "err" }); }
    });
  };

  wireList();
  renderAllPreviews();
};
