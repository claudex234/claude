import { html, raw, el, on, fmtMoney, fmtTime } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { PROFORMAS } from "../data/proformas.js";
import { PROFORMAS_PRODUCTOS } from "../data/productos.js";
import { navigate } from "../lib/router.js";
import { toast } from "../lib/toast.js";

const publicLinkFor = (slug) => `${location.origin}${location.pathname}#/p/${slug}`;

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "vista", label: "Vistas" },
  { id: "enviada", label: "Sin abrir" },
];
const PROD_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "PRO", label: "PRO" },
  { id: "PLUS", label: "PLUS" },
  { id: "ELITE", label: "ELITE" },
];

export const render = (root) => {
  let state = { search: "", filter: "todas", productFilter: "todos", sort: "recientes", selected: new Set() };

  const compute = () => {
    let arr = PROFORMAS.filter(p => {
      if (state.filter === "vista" && p.estado !== "vista") return false;
      if (state.filter === "enviada" && p.estado !== "enviada") return false;
      if (state.productFilter !== "todos") {
        const prods = PROFORMAS_PRODUCTOS[p.id] || {};
        if (!Object.keys(prods).includes(state.productFilter)) return false;
      }
      const q = state.search.toLowerCase();
      if (q && !(p.cliente.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))) return false;
      return true;
    });
    if (state.sort === "actividad") arr = [...arr].sort((a, b) => b.aperturas - a.aperturas);
    if (state.sort === "monto") arr = [...arr].sort((a, b) => b.monto - a.monto);
    return arr;
  };

  const counts = {
    todas: PROFORMAS.length,
    vista: PROFORMAS.filter(p => p.estado === "vista").length,
    enviada: PROFORMAS.filter(p => p.estado === "enviada").length,
  };

  const renderRow = (p) => {
    const prods = PROFORMAS_PRODUCTOS[p.id] || {};
    const prodCode = Object.entries(prods).map(([k, v]) => `${v}${k}`).join(" + ");
    const checked = state.selected.has(p.id);
    return html`
      <tr class="row" data-id="${p.id}" style="cursor:pointer">
        <td data-stop><input type="checkbox" data-check ${checked ? raw('checked') : ''}></td>
        <td>
          <div class="cell-strong">${p.cliente}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
            <span style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono)">${p.telefono}</span>
          </div>
        </td>
        <td>
          <div style="font-size:13px;font-weight:600;font-family:var(--font-mono)">${prodCode || "—"}</div>
          <div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);margin-top:2px">${fmtMoney(p.monto)}</div>
        </td>
        <td style="text-align:right">
          ${p.estado === "vista" ? raw(`
            <div style="font-size:12.5px;color:var(--text-2)">${p.ultimaVista}</div>
            <div style="font-size:11.5px;color:var(--text-mute);margin-top:2px;display:flex;align-items:center;gap:4px;justify-content:flex-end">
              <span>${fmtTime(p.tiempoTotal)}</span><span style="color:var(--text-mute)">·</span>${icon("eye", 11)} ${p.aperturas}
            </div>
          `) : raw('<span style="font-size:12.5px;color:var(--text-mute)">Sin abrir</span>')}
        </td>
        <td>
          ${p.estado === "vista"
            ? raw('<span class="badge badge-info" style="font-size:10.5px"><span class="badge-dot"></span>Vista</span>')
            : raw('<span class="badge" style="font-size:10.5px">Enviada</span>')}
        </td>
        <td data-stop>
          <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center">
            ${p.slug
              ? raw(`<button class="btn-icon btn-ghost" title="Copiar link público" data-action="copy-link" data-slug="${p.slug}">${icon("link", 14)}</button>`)
              : raw(`<button class="btn-icon btn-ghost" title="Sin link público (no enviada)" disabled style="opacity:.3">${icon("link", 14)}</button>`)}
            <button class="btn-icon btn-ghost" title="Eliminar" style="color:var(--danger);opacity:.7">${raw(icon("trash", 14))}</button>
          </div>
        </td>
      </tr>
    `;
  };

  const build = () => {
    const filtered = compute();
    return el(html`
      <div class="page fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Proformas</h1>
            <p class="page-sub">${PROFORMAS.length} proformas · ${counts.vista} vistas por el cliente</p>
          </div>
          <div style="display:flex;gap:8px">
            ${state.selected.size > 0 ? raw(`
              <span style="align-self:center;font-size:12.5px;color:var(--text-3);margin-right:4px">${state.selected.size} seleccionada${state.selected.size !== 1 ? "s" : ""}</span>
              <button class="btn">${icon("refresh", 13)} Actualizar estado</button>
              <button class="btn" style="color:var(--danger)">${icon("trash", 13)} Eliminar</button>
            `) : ""}
            <button class="btn">${raw(icon("download"))} Exportar</button>
            <button class="btn btn-primary" data-action="nueva">${raw(icon("plus"))} Nueva proforma</button>
          </div>
        </div>

        <div class="card" style="margin-bottom:16px">
          <div style="padding:12px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <div style="position:relative;flex:1 1 280px;max-width:360px">
              <input class="input" data-search placeholder="Buscar cliente o número de proforma…" value="${state.search}" style="padding-left:32px">
              <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-mute);pointer-events:none;display:flex">${raw(icon("search", 14))}</span>
            </div>
            <div style="display:flex;gap:4px;padding:3px;background:var(--bg-soft);border-radius:var(--radius-sm)">
              ${raw(FILTERS.map(f => `<button class="btn btn-sm" data-filter="${f.id}" style="
                background:${state.filter === f.id ? "var(--surface)" : "transparent"};
                border:none;
                box-shadow:${state.filter === f.id ? "var(--shadow-sm)" : "none"};
                color:${state.filter === f.id ? "var(--text)" : "var(--text-3)"};
                font-weight:${state.filter === f.id ? 600 : 500}">${f.label} <span style="color:var(--text-mute);margin-left:4px">${counts[f.id]}</span></button>`).join(""))}
            </div>
            <div style="display:flex;gap:4px;padding:3px;background:var(--bg-soft);border-radius:var(--radius-sm)">
              ${raw(PROD_FILTERS.map(f => `<button class="btn btn-sm" data-pfilter="${f.id}" style="
                background:${state.productFilter === f.id ? "var(--surface)" : "transparent"};
                border:none;
                box-shadow:${state.productFilter === f.id ? "var(--shadow-sm)" : "none"};
                color:${state.productFilter === f.id ? "var(--text)" : "var(--text-3)"};
                font-weight:${state.productFilter === f.id ? 600 : 500}">${f.label}</button>`).join(""))}
            </div>
            <div style="margin-left:auto;font-size:12px;color:var(--text-mute)">
              Ordenar:
              <select data-sort style="border:none;background:transparent;font-weight:600;color:var(--text-2);cursor:pointer">
                <option value="recientes" ${state.sort === "recientes" ? raw("selected") : ""}>Más recientes</option>
                <option value="actividad" ${state.sort === "actividad" ? raw("selected") : ""}>Más actividad</option>
                <option value="monto" ${state.sort === "monto" ? raw("selected") : ""}>Mayor monto</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th style="width:36px"></th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th style="text-align:right">Última vista</th>
                  <th>Estado</th>
                  <th style="width:80px"></th>
                </tr>
              </thead>
              <tbody>
                ${raw(filtered.map(renderRow).join(""))}
              </tbody>
            </table>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:12px;color:var(--text-3)">
          <span>Mostrando ${filtered.length} de ${PROFORMAS.length}</span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm" disabled style="opacity:.5">← Anterior</button>
            <button class="btn btn-sm">Siguiente →</button>
          </div>
        </div>
      </div>
    `);
  };

  let node = build();
  root.appendChild(node);

  const refresh = () => {
    const next = build();
    node.replaceWith(next);
    node = next;
    wire(node);
  };

  const wire = (target) => {
    on(target, "click", "[data-action='nueva']", () => navigate("generador"));
    on(target, "click", "[data-action='copy-link']", async (e, btn) => {
      const url = publicLinkFor(btn.dataset.slug);
      try { await navigator.clipboard.writeText(url); toast("Link copiado", { type: "ok" }); }
      catch { toast(url, { type: "info", ms: 6000 }); }
    });
    on(target, "click", "[data-filter]", (_, btn) => { state.filter = btn.dataset.filter; refresh(); });
    on(target, "click", "[data-pfilter]", (_, btn) => { state.productFilter = btn.dataset.pfilter; refresh(); });
    on(target, "input", "[data-search]", (e) => {
      state.search = e.target.value;
      const cursor = e.target.selectionStart;
      refresh();
      requestAnimationFrame(() => {
        const inp = node.querySelector("[data-search]");
        if (inp) { inp.focus(); inp.setSelectionRange(cursor, cursor); }
      });
    });
    on(target, "change", "[data-sort]", (e) => { state.sort = e.target.value; refresh(); });
    on(target, "click", "tr.row", (e, tr) => {
      if (e.target.closest("[data-stop]")) return;
      navigate("detalle/" + tr.dataset.id);
    });
    on(target, "change", "[data-check]", (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;
      if (e.target.checked) state.selected.add(tr.dataset.id);
      else state.selected.delete(tr.dataset.id);
      refresh();
    });
  };

  wire(node);
};
