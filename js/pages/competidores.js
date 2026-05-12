// Pestaña Competidores — manager de páginas rastreadas (link/html/pixel)
// y vista de detalle con hits por página.

import { html, raw, el, on, fmtTime, fmtDateTime, ago, escapeHtml as e } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { toast } from "../lib/toast.js";
import { copyAndToast } from "../lib/share.js";
import {
  fetchTrackingPages, fetchTrackingPage, fetchHitsByPage,
  upsertTrackingPage, deleteTrackingPage,
} from "../data/api.js";

const trackerUrl = (slug) => `${location.origin}${location.pathname}#/t/${slug}`;

// Snippet a copiar para el tipo pixel — un <script> que pega el cliente
// en cualquier página externa.
const pixelSnippet = (slug) =>
  `<script src="${location.origin}${location.pathname}track.js?s=${slug}" async><\/script>`;

const TIPO_LABEL = { pixel: "Pixel", link: "Link", html: "HTML" };

// =========================================================
// Form (crear / editar) y lista
// =========================================================

const emptyForm = () => ({
  id: null, nombre: "", tipo: "link", slug: "",
  destino_url: "", contenido_html: "", nota: "", activa: true,
});

const fromRow = (r) => ({
  id: r.id,
  nombre: r.nombre || "",
  tipo: r.tipo || "link",
  slug: r.slug || "",
  destino_url: r.destino_url || "",
  contenido_html: r.contenido_html || "",
  nota: r.nota || "",
  activa: r.activa !== false,
});

const formMarkup = (f) => `
  <div class="card" style="padding:18px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div>
        <div style="font-size:14px;font-weight:650">${f.id ? "Editar página rastreada" : "Nueva página rastreada"}</div>
        ${f.id ? `<div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);margin-top:2px">${e(f.id)}</div>` : ""}
      </div>
      <button class="btn btn-sm btn-ghost" data-action="close">${icon("x", 14)}</button>
    </div>

    <div class="gen-form">
      <label class="gen-field gen-field-full"><span>Nombre *</span>
        <input class="input" data-f="nombre" value="${e(f.nombre)}" placeholder="ej. Cotización a competidor X">
      </label>
      <label class="gen-field"><span>Tipo</span>
        <select class="input" data-f="tipo">
          <option value="link"  ${f.tipo === "link"  ? "selected" : ""}>Link rastreado</option>
          <option value="html"  ${f.tipo === "html"  ? "selected" : ""}>Página HTML custom</option>
          <option value="pixel" ${f.tipo === "pixel" ? "selected" : ""}>Tracking pixel (snippet)</option>
        </select>
      </label>
      <label class="gen-field"><span>Slug (opcional)</span>
        <input class="input" data-f="slug" value="${e(f.slug)}" placeholder="se genera solo si vacío">
      </label>
      <label class="gen-field gen-field-full" data-only="link" style="${f.tipo === "link" ? "" : "display:none"}">
        <span>URL de destino *</span>
        <input class="input" data-f="destino_url" value="${e(f.destino_url)}" placeholder="https://miempresa.com/precios">
      </label>
      <label class="gen-field gen-field-full" data-only="html" style="${f.tipo === "html" ? "" : "display:none"}">
        <span>HTML *</span>
        <textarea class="input" data-f="contenido_html" rows="10" placeholder="<h1>Cotización…</h1>" style="font-family:var(--font-mono);font-size:12px">${e(f.contenido_html)}</textarea>
      </label>
      <label class="gen-field gen-field-full"><span>Nota interna</span>
        <textarea class="input" data-f="nota" rows="2">${e(f.nota)}</textarea>
      </label>
      <label class="gen-field gen-field-full" style="flex-direction:row;align-items:center;gap:8px">
        <input type="checkbox" data-f="activa" ${f.activa ? "checked" : ""}>
        <span style="text-transform:none;letter-spacing:0;font-size:13px">Activa (los hits se siguen registrando)</span>
      </label>
    </div>

    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px">
      <div>
        ${f.id ? `<button class="btn btn-sm" data-action="delete" style="color:var(--danger)">${icon("trash", 12)} Eliminar</button>` : ""}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" data-action="close">Cancelar</button>
        <button class="btn btn-sm btn-primary" data-action="save">${f.id ? "Guardar" : "Crear"}</button>
      </div>
    </div>
  </div>`;

const row = (p) => `
  <tr class="row" data-id="${e(p.id)}" style="cursor:pointer">
    <td>
      <div class="cell-strong">${e(p.nombre)}</div>
      <div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);margin-top:2px">${e(p.slug)}</div>
    </td>
    <td><span class="badge">${TIPO_LABEL[p.tipo] || p.tipo}</span></td>
    <td style="font-family:var(--font-mono);font-size:12px">${p.hits_count}</td>
    <td>
      ${p.activa
        ? '<span class="badge badge-info" style="font-size:10.5px"><span class="badge-dot"></span>Activa</span>'
        : '<span class="badge" style="font-size:10.5px;opacity:.6">Inactiva</span>'}
    </td>
    <td data-stop>
      <div style="display:flex;gap:6px;justify-content:flex-end">
        <button class="btn btn-sm" data-action="copy" data-slug="${e(p.slug)}" data-tipo="${e(p.tipo)}" title="Copiar ${p.tipo === "pixel" ? "snippet" : "link"}">
          ${icon(p.tipo === "pixel" ? "copy" : "link", 11)}
        </button>
      </div>
    </td>
  </tr>`;

// =========================================================
// Detalle de una página: hits + sparkline + tabla
// =========================================================

const detailView = (page, hits) => {
  const total = hits.length;
  const ips = new Set(hits.map((h) => h.ip).filter(Boolean)).size;
  const dispositivos = new Set(hits.map((h) => h.dispositivo).filter(Boolean)).size;
  const paises = new Set(hits.map((h) => h.pais).filter(Boolean)).size;
  const total_s = hits.reduce((s, h) => s + (h.duracion_s || 0), 0);

  return `
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <button class="btn btn-sm" data-action="back" style="margin-bottom:8px">← Volver</button>
          <h1 class="page-title">${e(page.nombre)}</h1>
          <p class="page-sub">
            <span class="badge">${TIPO_LABEL[page.tipo] || page.tipo}</span>
            · <span class="mono" style="font-family:var(--font-mono)">${e(page.slug)}</span>
            ${page.destino_url ? ` → <a href="${e(page.destino_url)}" target="_blank" rel="noopener" style="color:var(--accent-strong)">${e(page.destino_url)}</a>` : ""}
          </p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn" data-action="copy-share">${icon("link", 13)} ${page.tipo === "pixel" ? "Copiar snippet" : "Copiar link"}</button>
          <button class="btn btn-primary" data-action="edit">${icon("edit", 13)} Editar</button>
        </div>
      </div>

      <div class="stat-grid" style="margin-bottom:16px">
        <div class="stat"><div class="stat-label">Hits</div><div class="stat-value">${total}</div><div class="stat-delta">${ips} IPs únicas</div></div>
        <div class="stat"><div class="stat-label">Dispositivos</div><div class="stat-value">${dispositivos}</div><div class="stat-delta">${paises} países</div></div>
        <div class="stat"><div class="stat-label">Tiempo total</div><div class="stat-value">${fmtTime(total_s)}</div><div class="stat-delta">solo aplica a HTML</div></div>
        <div class="stat"><div class="stat-label">Última visita</div><div class="stat-value" style="font-size:18px">${hits[0] ? ago(hits[0].abierta_at) : "—"}</div></div>
      </div>

      ${page.tipo === "pixel" ? `
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><div class="card-title">Snippet para embeber</div></div>
          <div class="card-body">
            <pre style="background:var(--bg-soft);padding:10px 12px;border-radius:6px;font-size:11.5px;overflow:auto"><code>${e(pixelSnippet(page.slug))}</code></pre>
          </div>
        </div>` : ""}

      <div class="card">
        <div class="card-header"><div class="card-title">Hits · ${total}</div></div>
        <div class="card-body" style="padding:0;max-height:600px;overflow-y:auto">
          ${total === 0 ? '<div style="padding:24px;text-align:center;color:var(--text-mute);font-size:13px">Sin hits aún.</div>' : `
            <table class="table" style="margin:0">
              <thead>
                <tr>
                  <th style="width:120px">Cuándo</th>
                  <th style="width:130px">IP</th>
                  <th>Dispositivo / lugar</th>
                  <th>Referrer</th>
                  <th style="width:90px;text-align:right">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                ${hits.map((h) => `
                  <tr class="row">
                    <td style="font-family:var(--font-mono);font-size:11.5px">${fmtDateTime(h.abierta_at)}</td>
                    <td style="font-family:var(--font-mono);font-size:11.5px">${e(h.ip || "—")}</td>
                    <td>
                      <div style="font-size:12.5px">${e(h.dispositivo || "—")}</div>
                      <div style="font-size:11px;color:var(--text-mute);margin-top:2px">
                        ${e([h.ciudad, h.pais].filter(Boolean).join(", ") || "—")} · ${e(h.os || "")}
                      </div>
                    </td>
                    <td style="font-size:11.5px;color:var(--text-2);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(h.referrer || "—")}</td>
                    <td style="text-align:right;font-family:var(--font-mono);font-size:12px">${fmtTime(h.duracion_s || 0)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>`}
        </div>
      </div>
    </div>`;
};

// =========================================================
// Render principal — lista, abre detail si vino param
// =========================================================

export const render = async (root, ctx) => {
  const pageId = ctx?.params?.[0] || null;

  // ----- Detalle -----
  if (pageId) {
    let page = null, hits = [];
    try {
      page = await fetchTrackingPage(pageId);
      if (page) hits = await fetchHitsByPage(pageId);
    } catch (err) { console.warn("[competidores]", err); }
    if (!page) {
      root.innerHTML = `<div class="page"><p style="padding:24px;color:var(--text-mute)">No se encontró esa página.</p></div>`;
      return;
    }
    const node = el(detailView(page, hits));
    root.appendChild(node);
    on(node, "click", "[data-action='back']", () => location.hash = "#/competidores");
    on(node, "click", "[data-action='edit']", () => {
      // Abre el editor inline volviendo al listado con un flag.
      location.hash = "#/competidores";
      sessionStorage.setItem("competidores:edit", page.id);
    });
    on(node, "click", "[data-action='copy-share']", async () => {
      const text = page.tipo === "pixel" ? pixelSnippet(page.slug) : trackerUrl(page.slug);
      await copyAndToast(text, { ok: page.tipo === "pixel" ? "Snippet copiado" : "Link copiado" });
    });
    return;
  }

  // ----- Lista -----
  let rows = [];
  try { rows = await fetchTrackingPages(); }
  catch (err) { console.warn("[competidores]", err); }

  let editing = null;
  // ¿Venimos del detalle con flag de editar?
  const editId = sessionStorage.getItem("competidores:edit");
  if (editId) {
    sessionStorage.removeItem("competidores:edit");
    const r = rows.find((x) => x.id === editId);
    if (r) editing = fromRow(r);
  }

  const buildPage = () => html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Competidores</h1>
          <p class="page-sub">${rows.length} página${rows.length === 1 ? "" : "s"} rastreada${rows.length === 1 ? "" : "s"}</p>
        </div>
        <button class="btn btn-primary" data-action="new">${raw(icon("plus"))} Nueva página</button>
      </div>

      ${editing ? raw(`<div data-editor style="margin-bottom:18px">${formMarkup(editing)}</div>`) : ""}

      ${rows.length === 0 ? raw('<div class="card" style="padding:24px;text-align:center;color:var(--text-mute);font-size:13px">Sin páginas todavía. Click "Nueva página" para crear el primer link rastreado, HTML embebido o snippet pixel.</div>') : raw(`
        <div class="card" style="padding:0;overflow:hidden">
          <table class="table" style="margin:0">
            <thead>
              <tr>
                <th>Nombre / slug</th>
                <th style="width:90px">Tipo</th>
                <th style="width:70px">Hits</th>
                <th style="width:100px">Estado</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>${rows.map(row).join("")}</tbody>
          </table>
        </div>
      `)}
    </div>`;

  let node = el(buildPage());
  root.appendChild(node);

  const remount = () => {
    const next = el(buildPage());
    node.replaceWith(next);
    node = next;
    wire();
    if (editing) node.querySelector("[data-f='nombre']")?.focus();
  };

  const reloadRows = async () => {
    try { rows = await fetchTrackingPages(); }
    catch (err) { console.warn(err); }
  };

  const updateFormVisibility = () => {
    node.querySelectorAll("[data-only]").forEach((el2) => {
      el2.style.display = (el2.dataset.only === editing?.tipo) ? "" : "none";
    });
  };

  const wire = () => {
    on(node, "click", "[data-action='new']", () => { editing = emptyForm(); remount(); });
    on(node, "click", "[data-action='close']", () => { editing = null; remount(); });

    // Click en fila → ir al detalle
    on(node, "click", "tr.row", (ev, tr) => {
      if (ev.target.closest("[data-stop]") || editing) return;
      location.hash = "#/competidores/" + tr.dataset.id;
    });

    // Copiar desde la fila
    on(node, "click", "[data-action='copy']", async (_, btn) => {
      const slug = btn.dataset.slug;
      const tipo = btn.dataset.tipo;
      const text = tipo === "pixel" ? pixelSnippet(slug) : trackerUrl(slug);
      await copyAndToast(text, { ok: tipo === "pixel" ? "Snippet copiado" : "Link copiado" });
    });

    if (!editing) return;

    on(node, "input", "[data-f]", (ev) => {
      const k = ev.target.dataset.f;
      if (k === "activa") editing.activa = ev.target.checked;
      else editing[k] = ev.target.value;
      if (k === "tipo") updateFormVisibility();
    });
    on(node, "change", "[data-f]", (ev) => {
      if (ev.target.dataset.f === "tipo") updateFormVisibility();
    });

    on(node, "click", "[data-action='save']", async () => {
      try {
        const saved = await upsertTrackingPage(editing);
        await reloadRows();
        editing = null;
        toast("Página guardada", { type: "ok" });
        remount();
        // Si era nueva, copiar el link/snippet automáticamente.
        if (saved?.slug) {
          const text = saved.tipo === "pixel" ? pixelSnippet(saved.slug) : trackerUrl(saved.slug);
          await copyAndToast(text, { ok: saved.tipo === "pixel" ? "Snippet copiado" : "Link copiado" });
        }
      } catch (err) {
        console.error(err);
        toast(err.message || "No pude guardar", { type: "err" });
      }
    });

    on(node, "click", "[data-action='delete']", async () => {
      if (!editing.id) return;
      if (!confirm(`¿Eliminar "${editing.nombre}" y todos sus hits?`)) return;
      try {
        await deleteTrackingPage(editing.id);
        await reloadRows();
        editing = null;
        toast("Eliminada", { type: "ok" });
        remount();
      } catch (err) { toast(err.message || "Error", { type: "err" }); }
    });
  };

  wire();
};
