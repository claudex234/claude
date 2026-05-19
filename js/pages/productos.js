// Productos — catálogo con CRUD desde UI. Editor con tabs Datos/Imagen.
// Imágenes en Supabase Storage (bucket 'productos', público).

import { html, raw, el, on, fmtMoney, escapeHtml as e } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { PRODUCTOS, FALLBACK_IMAGE, adaptProducto } from "../data/productos.js";
import {
  fetchProductos, upsertProducto, archiveProducto, restoreProducto,
  uploadProductoImagen,
  listAdjuntos, uploadAdjuntoPdf, addAdjuntoLink, removeAdjunto,
} from "../data/api.js";
import { toast } from "../lib/toast.js";

const emptyForm = () => ({
  id: null,
  codigo: "", nombre: "", tamano: "", tipo: "pantalla",
  precio_default: 0,
  imagen_url: "",
  specs: [], specs_highlight: [], incluye: [],
  activo: true,
  adjuntos: [],
});

const fmtBytes = (n) => {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const fromRow = (row) => ({
  id: row.id,
  codigo: row.codigo || "",
  nombre: row.nombre || "",
  tamano: row.tamano || "",
  tipo: row.tipo || "pantalla",
  precio_default: Number(row.precio_default) || 0,
  imagen_url: row.imagen_url || "",
  specs: row.specs || [],
  specs_highlight: row.specs_highlight || [],
  incluye: row.incluye || [],
  activo: row.activo !== false,
});

const linesEditor = (label, key, arr) => `
  <label class="gen-field gen-field-full">
    <span>${label} <span style="color:var(--text-mute);text-transform:none;font-weight:400">(una por línea)</span></span>
    <textarea class="input" data-list="${key}" rows="4" style="font-family:var(--font-mono);font-size:12px">${e((arr || []).join("\n"))}</textarea>
  </label>`;

export const render = async (root) => {
  let rows = [];
  let editing = null; // form state cuando hay panel abierto

  // Carga inicial: TODOS los productos (incluso inactivos).
  try { rows = await fetchProductos(); }
  catch (err) { console.warn("[productos]", err); }

  const refreshRows = async () => {
    rows = await fetchProductos();
    // Mantener PRODUCTOS en memoria sincronizado (solo activos, como loader).
    for (const k of Object.keys(PRODUCTOS)) delete PRODUCTOS[k];
    for (const r of rows.filter((r) => r.activo)) PRODUCTOS[r.codigo] = adaptProducto(r);
  };

  const card = (p) => `
    <div class="card" style="padding:0;overflow:hidden;opacity:${p.activo ? 1 : 0.55}">
      <div style="background:#0a1f4d;display:grid;place-items:center;height:160px">
        <img src="${e(p.imagen_url || FALLBACK_IMAGE)}" alt="${e(p.nombre)}" style="width:80%;max-height:140px;object-fit:contain">
      </div>
      <div style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:4px">
          <div style="font-size:13.5px;font-weight:650;line-height:1.3">${e(p.nombre || "—")}</div>
          <span class="badge badge-accent" style="flex-shrink:0;font-family:var(--font-mono);font-size:11px">${e(p.codigo)}</span>
        </div>
        <div style="font-size:11px;color:var(--text-mute);font-family:var(--font-mono);margin-bottom:10px">
          ${e(p.tamano || "")}${p.tamano ? " · " : ""}desde ${fmtMoney(p.precio_default)}
          ${!p.activo ? '· <span style="color:var(--danger)">inactivo</span>' : ""}
        </div>
        <div style="font-size:12px;color:var(--text-2);line-height:1.5;min-height:54px">
          ${(p.specs_highlight || []).slice(0, 3).map((s) => `<div style="margin-bottom:2px">· ${e(s)}</div>`).join("")}
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
          <button class="btn btn-sm" data-action="edit" data-id="${e(p.id)}" style="flex:1">${icon("edit", 11)} Editar</button>
          ${p.activo
            ? `<button class="btn btn-sm" data-action="archive" data-id="${e(p.id)}" style="color:var(--danger)">${icon("trash", 11)}</button>`
            : `<button class="btn btn-sm" data-action="restore" data-id="${e(p.id)}">Restaurar</button>`}
        </div>
      </div>
    </div>`;

  const editorMarkup = (f) => `
    <div class="card" style="padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:650">${f.id ? "Editar producto" : "Nuevo producto"}</div>
          ${f.id ? `<div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);margin-top:2px">${e(f.id)}</div>` : ""}
        </div>
        <button class="btn btn-sm btn-ghost" data-action="close">${icon("x", 14)}</button>
      </div>

      <div class="prod-editor-grid">
        <div>
          <div style="background:#0a1f4d;display:grid;place-items:center;height:160px;border-radius:6px;overflow:hidden;margin-bottom:8px">
            <img data-preview src="${e(f.imagen_url || FALLBACK_IMAGE)}" style="width:90%;max-height:140px;object-fit:contain">
          </div>
          <input type="file" data-file accept="image/*" style="display:none">
          <button class="btn btn-sm" data-action="upload" style="width:100%">${icon("download", 11)} Subir imagen</button>
          ${f.imagen_url ? `<button class="btn btn-sm" data-action="remove-img" style="width:100%;margin-top:6px;color:var(--danger)">Quitar imagen</button>` : ""}
        </div>

        <div class="gen-form">
          <label class="gen-field"><span>Código *</span><input class="input" data-f="codigo" value="${e(f.codigo)}" placeholder="PLUS"></label>
          <label class="gen-field"><span>Tamaño</span><input class="input" data-f="tamano" value="${e(f.tamano)}" placeholder="86″"></label>
          <label class="gen-field gen-field-full"><span>Nombre *</span><input class="input" data-f="nombre" value="${e(f.nombre)}"></label>
          <label class="gen-field"><span>Precio default (S/)</span><input type="number" class="input" data-f="precio_default" value="${f.precio_default}" min="0" step="100"></label>
          <label class="gen-field"><span>Tipo</span><input class="input" data-f="tipo" value="${e(f.tipo)}" placeholder="pantalla"></label>
          ${linesEditor("Specs (técnicas)", "specs", f.specs)}
          ${linesEditor("Specs destacadas (highlight)", "specs_highlight", f.specs_highlight)}
          ${linesEditor("Incluye (accesorios / servicios)", "incluye", f.incluye)}
          <label class="gen-field gen-field-full" style="flex-direction:row;align-items:center;gap:8px">
            <input type="checkbox" data-f="activo" ${f.activo ? "checked" : ""}>
            <span style="text-transform:none;letter-spacing:0;font-size:13px">Activo (visible al generar proformas)</span>
          </label>
        </div>
      </div>

      ${f.id ? adjuntosBlock(f) : `
        <div style="margin-top:18px;padding:14px;background:var(--bg-soft);border-radius:6px;font-size:12px;color:var(--text-mute)">
          ${icon("paperclip", 12)} Guardá el producto primero y vas a poder adjuntarle PDFs y links.
        </div>`}

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px">
        <button class="btn btn-sm" data-action="close">Cancelar</button>
        <button class="btn btn-sm btn-primary" data-action="save">${f.id ? "Guardar" : "Crear"}</button>
      </div>
    </div>`;

  const adjuntoIconFor = (a) => a.tipo === "pdf" ? "file" : "link";
  const adjuntosBlock = (f) => `
    <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:13px;font-weight:600">Adjuntos <span style="color:var(--text-mute);font-weight:400">· ${f.adjuntos.length}</span></div>
        <div style="display:flex;gap:6px">
          <input type="file" data-adj-file accept="application/pdf" style="display:none">
          <button class="btn btn-sm" data-action="adj-upload">${icon("paperclip", 11)} Subir PDF</button>
          <button class="btn btn-sm" data-action="adj-add-link">${icon("link", 11)} Agregar link</button>
        </div>
      </div>
      ${f.adjuntos.length === 0
        ? `<div style="padding:14px;background:var(--bg-soft);border-radius:6px;font-size:12px;color:var(--text-mute);text-align:center">
            Sin adjuntos. Subí un PDF (max 50 MB) o agregá un link externo (YouTube, Drive, etc).
          </div>`
        : `<div style="display:flex;flex-direction:column;gap:6px">
            ${f.adjuntos.map((a) => `
              <div class="card" style="padding:10px 12px;display:flex;align-items:center;gap:10px">
                <div style="color:var(--text-mute);flex-shrink:0">${icon(adjuntoIconFor(a), 14)}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12.5px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(a.nombre)}</div>
                  <div style="font-size:10.5px;color:var(--text-mute);font-family:var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    ${a.tipo === "pdf" ? `PDF · ${fmtBytes(a.tamano_bytes)}` : `link · ${e(a.url)}`}
                  </div>
                </div>
                <a class="btn-icon btn-ghost" href="${e(a.url)}" target="_blank" rel="noopener" title="Abrir">${icon("eye", 12)}</a>
                <button class="btn-icon btn-ghost" data-action="adj-del" data-id="${e(a.id)}" title="Eliminar" style="color:var(--danger)">${icon("trash", 12)}</button>
              </div>`).join("")}
          </div>`}
    </div>`;

  const buildPage = () => html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Productos</h1>
          <p class="page-sub">${rows.length} productos · ${rows.filter((r) => r.activo).length} activos en el catálogo</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" data-action="new">${raw(icon("plus"))} Nuevo producto</button>
        </div>
      </div>

      ${editing ? raw(`<div data-editor style="margin-bottom:18px">${editorMarkup(editing)}</div>`) : ""}

      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:14px">
        ${raw(rows.map(card).join(""))}
      </div>
    </div>`;

  let node = el(buildPage());
  root.appendChild(node);

  const remount = () => {
    const next = el(buildPage());
    node.replaceWith(next);
    node = next;
    wire();
  };

  const openEdit = async (id) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    editing = fromRow(row);
    try { editing.adjuntos = await listAdjuntos(id); } catch (err) { console.warn("[adjuntos]", err); }
    remount();
    node.querySelector("[data-f='codigo']")?.focus();
  };
  const refreshAdjuntos = async () => {
    if (!editing?.id) return;
    try { editing.adjuntos = await listAdjuntos(editing.id); } catch (err) { console.warn("[adjuntos]", err); }
    remount();
  };
  const openNew = () => { editing = emptyForm(); remount(); };
  const close = () => { editing = null; remount(); };

  const wire = () => {
    on(node, "click", "[data-action='new']", openNew);
    on(node, "click", "[data-action='edit']", (_, btn) => openEdit(btn.dataset.id));
    on(node, "click", "[data-action='close']", close);

    on(node, "click", "[data-action='archive']", async (_, btn) => {
      const row = rows.find((r) => r.id === btn.dataset.id);
      if (!row) return;
      if (!confirm(`¿Archivar "${row.nombre}"? Quedará oculto al crear proformas. Las proformas existentes no se modifican.`)) return;
      try {
        await archiveProducto(row.id);
        await refreshRows();
        toast("Producto archivado", { type: "ok" });
        remount();
      } catch (err) { toast(err.message, { type: "err" }); }
    });
    on(node, "click", "[data-action='restore']", async (_, btn) => {
      try {
        await restoreProducto(btn.dataset.id);
        await refreshRows();
        toast("Producto activo de nuevo", { type: "ok" });
        remount();
      } catch (err) { toast(err.message, { type: "err" }); }
    });

    if (!editing) return;

    on(node, "input", "[data-f]", (ev) => {
      const k = ev.target.dataset.f;
      if (k === "activo") editing.activo = ev.target.checked;
      else if (k === "precio_default") editing.precio_default = parseFloat(ev.target.value) || 0;
      else editing[k] = ev.target.value;
    });
    on(node, "input", "[data-list]", (ev) => {
      const k = ev.target.dataset.list;
      editing[k] = ev.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
    });

    // Upload
    on(node, "click", "[data-action='upload']", () => {
      node.querySelector("[data-file]")?.click();
    });
    on(node, "change", "[data-file]", async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const btn = node.querySelector("[data-action='upload']");
      const original = btn?.innerHTML;
      if (btn) { btn.disabled = true; btn.textContent = "Subiendo…"; }
      try {
        const url = await uploadProductoImagen(editing.codigo || "TMP", file);
        editing.imagen_url = url;
        const prev = node.querySelector("[data-preview]");
        if (prev) prev.src = url;
        toast("Imagen subida", { type: "ok" });
      } catch (err) {
        console.error(err);
        toast(err.message || "No pude subir", { type: "err" });
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
      }
    });
    on(node, "click", "[data-action='remove-img']", () => {
      editing.imagen_url = "";
      remount();
    });

    // Adjuntos
    on(node, "click", "[data-action='adj-upload']", () => {
      node.querySelector("[data-adj-file]")?.click();
    });
    on(node, "change", "[data-adj-file]", async (ev) => {
      const file = ev.target.files?.[0];
      if (!file || !editing?.id) return;
      const btn = node.querySelector("[data-action='adj-upload']");
      const original = btn?.innerHTML;
      if (btn) { btn.disabled = true; btn.textContent = "Subiendo…"; }
      try {
        await uploadAdjuntoPdf(editing.id, file);
        toast("PDF subido", { type: "ok" });
        await refreshAdjuntos();
      } catch (err) {
        console.error(err);
        toast(err.message || "No pude subir", { type: "err" });
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
      }
    });
    on(node, "click", "[data-action='adj-add-link']", async () => {
      if (!editing?.id) return;
      const url = prompt("URL del link (YouTube, Drive, manual del fabricante, etc):");
      if (!url) return;
      const nombre = prompt("Nombre visible del link:", url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60));
      if (!nombre) return;
      try {
        await addAdjuntoLink(editing.id, { nombre, url });
        toast("Link agregado", { type: "ok" });
        await refreshAdjuntos();
      } catch (err) { toast(err.message || "No pude agregar", { type: "err" }); }
    });
    on(node, "click", "[data-action='adj-del']", async (_, btn) => {
      const adj = editing?.adjuntos?.find((a) => a.id === btn.dataset.id);
      if (!adj) return;
      if (!confirm(`Eliminar "${adj.nombre}"?`)) return;
      try {
        await removeAdjunto(adj);
        toast("Adjunto eliminado", { type: "ok" });
        await refreshAdjuntos();
      } catch (err) { toast(err.message || "No pude eliminar", { type: "err" }); }
    });

    on(node, "click", "[data-action='save']", async () => {
      if (!editing.codigo?.trim()) { toast("Falta el código", { type: "err" }); return; }
      if (!editing.nombre?.trim()) { toast("Falta el nombre", { type: "err" }); return; }
      try {
        await upsertProducto(editing);
        await refreshRows();
        toast(editing.id ? "Producto actualizado" : "Producto creado", { type: "ok" });
        editing = null;
        remount();
      } catch (err) {
        console.error(err);
        toast(err.message || "No pude guardar", { type: "err" });
      }
    });
  };

  wire();
};
