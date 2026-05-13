import { html, raw, el, on, fmtMoney, fmtTime, fmtDate, ago, escapeHtml as e } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { PROFORMAS } from "../data/proformas.js";
import { navigate } from "../lib/router.js";
import { toast } from "../lib/toast.js";
import { ensurePublicLink, fetchProformaDetail, fetchAperturas } from "../data/api.js";
import { publicUrl, copyAndToast } from "../lib/share.js";
import { renderTracking } from "../lib/tracking_view.js";

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "vista", label: "Vistas" },
  { id: "borrador", label: "Sin abrir" },
];

const PAGE_SIZE = 50;

// Detecta si el viewport es lo bastante ancho para mostrar el panel.
// En mobile/tablet seguimos navegando al detalle completo.
const wideEnough = () => window.innerWidth > 1180;

export const render = (root) => {
  let state = {
    search: "",
    filter: "todas",
    sort: "recientes",
    page: 0,
    selectedId: null,        // numero de la proforma seleccionada
    detail: null,            // resultado de fetchProformaDetail
    aperturas: null,         // resultado de fetchAperturas
    detailLoading: false,
    detailError: null,
  };

  const compute = () => {
    let arr = PROFORMAS.filter(p => {
      if (state.filter === "vista" && p.estado !== "vista") return false;
      if (state.filter === "borrador" && p.estado !== "borrador") return false;
      const q = state.search.toLowerCase();
      if (q && !(p.cliente.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))) return false;
      return true;
    });
    if (state.sort === "actividad") arr = [...arr].sort((a, b) => b.aperturas - a.aperturas);
    if (state.sort === "monto") arr = [...arr].sort((a, b) => b.monto - a.monto);
    return arr;
  };

  const counts = () => ({
    todas: PROFORMAS.length,
    vista: PROFORMAS.filter(p => p.estado === "vista").length,
    borrador: PROFORMAS.filter(p => p.estado === "borrador").length,
  });

  const renderRow = (p) => html`
    <tr class="row ${state.selectedId === p.id ? "row-selected" : ""}" data-id="${p.id}" style="cursor:pointer">
      <td>
        <div class="cell-strong">${p.cliente}</div>
        ${p.telefono ? raw(`<div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);margin-top:2px">${p.telefono}</div>`) : ""}
      </td>
      <td>
        <div style="font-size:13px;font-weight:600">${p.items} ${p.items === 1 ? "ítem" : "ítems"}</div>
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
          : raw('<span class="badge" style="font-size:10.5px">Sin abrir</span>')}
      </td>
      <td data-stop>
        <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center">
          <button class="btn btn-sm" data-action="link" data-id="${p.id}"
            title="${p.slug ? "Copiar link público" : "Generar y copiar link público"}"
            style="font-size:11px;padding:4px 9px;font-weight:600;${p.slug ? "color:var(--accent-strong)" : ""}">
            ${raw(icon("link", 11))} ${p.slug ? "Link" : "Generar"}
          </button>
        </div>
      </td>
    </tr>
  `;

  // -----------------------------------------------------------------
  // Panel lateral (tracking inline)
  // -----------------------------------------------------------------
  const renderAside = () => {
    if (!state.selectedId) {
      return `
        <div class="proforma-split-empty">
          <div>
            <div style="font-size:13px;font-weight:600;margin-bottom:4px">Sin proforma seleccionada</div>
            <div>Click en una fila para ver su tracking acá.</div>
          </div>
        </div>`;
    }
    if (state.detailLoading || (!state.detail && !state.detailError)) {
      return `<div class="proforma-split-empty">Cargando…</div>`;
    }
    if (state.detailError) {
      return `<div class="proforma-split-empty" style="color:var(--danger)">${e(state.detailError)}</div>`;
    }
    const d = state.detail;
    const p = d.proforma;
    const c = d.cliente || {};
    const aperturasReales = (state.aperturas || []).filter((a) => !a.meta?.bloqueado);
    const ultima = aperturasReales[0]?.abierta_at;
    return `
      <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
          <div style="min-width:0;flex:1">
            <div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono)">${e(p.numero)}</div>
            <div style="font-size:15px;font-weight:650;line-height:1.3">${e(c.razon_social || p.numero)}</div>
          </div>
          <div style="display:flex;gap:4px">
            ${d.slug
              ? `<button class="btn btn-sm" data-action="aside-copy-link" title="Copiar link público">${icon("link", 12)}</button>`
              : `<button class="btn btn-sm" data-action="aside-gen-link" title="Generar link público">${icon("link", 12)}</button>`}
            <button class="btn btn-sm" data-action="aside-pdf" title="PDF">${icon("download", 12)}</button>
            <button class="btn btn-sm btn-primary" data-action="aside-ver" title="Ver detalle completo">Ver →</button>
          </div>
        </div>
        ${p.estado === "vista" ? `
          <div style="display:flex;gap:6px;align-items:center;font-size:11.5px;color:var(--text-3)">
            <span class="badge badge-info" style="font-size:10px"><span class="badge-dot"></span>Vista</span>
            ${ultima ? `<span>· ${ago(ultima)}</span>` : ""}
          </div>` : `
          <div style="font-size:11.5px;color:var(--text-mute)">
            ${p.estado === "borrador" ? "Sin abrir todavía" : e(p.estado)} · emitida ${fmtDate(p.emitida)}
          </div>`}
        ${d.slug ? `
          <div style="margin-top:10px;display:flex;gap:6px;align-items:center;background:var(--bg-soft);padding:6px 8px;border-radius:6px;font-family:var(--font-mono);font-size:11px">
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-2)">${e(publicUrl(d.slug))}</span>
            <button class="btn-icon btn-ghost" data-action="aside-copy-link" title="Copiar">${icon("copy", 11)}</button>
            <a class="btn-icon btn-ghost" href="${e(publicUrl(d.slug))}" target="_blank" rel="noopener" title="Abrir">${icon("link", 11)}</a>
          </div>` : ""}
      </div>
      <div style="padding:14px 16px">
        ${renderTracking(state.aperturas || [])}
      </div>`;
  };

  // -----------------------------------------------------------------
  // Build de la página completa
  // -----------------------------------------------------------------
  const build = () => {
    const filtered = compute();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.page >= totalPages) state.page = totalPages - 1;
    if (state.page < 0) state.page = 0;
    const start = state.page * PAGE_SIZE;
    const pageRows = filtered.slice(start, start + PAGE_SIZE);
    const c = counts();
    return el(html`
      <div class="page fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Proformas</h1>
            <p class="page-sub">${PROFORMAS.length} proformas · ${c.vista} vistas por el cliente</p>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" data-action="nueva">${raw(icon("plus"))} Nueva proforma</button>
          </div>
        </div>

        <div class="proforma-split">
          <div class="proforma-split-list">
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
                    font-weight:${state.filter === f.id ? 600 : 500}">${f.label} <span style="color:var(--text-mute);margin-left:4px">${c[f.id]}</span></button>`).join(""))}
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
                      <th>Cliente</th>
                      <th>Ítems / monto</th>
                      <th style="text-align:right">Última vista</th>
                      <th>Estado</th>
                      <th style="width:120px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${raw(pageRows.map(renderRow).join(""))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-3)">
              <span>Mostrando ${start + 1}–${start + pageRows.length} de ${filtered.length}${filtered.length !== PROFORMAS.length ? ` (de ${PROFORMAS.length} en total)` : ""}</span>
              ${totalPages > 1 ? raw(`
                <div style="display:flex;gap:6px;align-items:center">
                  <button class="btn btn-sm" data-action="prev-page" ${state.page === 0 ? "disabled" : ""}>← Anterior</button>
                  <span style="font-family:var(--font-mono);font-size:11.5px">${state.page + 1} / ${totalPages}</span>
                  <button class="btn btn-sm" data-action="next-page" ${state.page >= totalPages - 1 ? "disabled" : ""}>Siguiente →</button>
                </div>`) : ""}
            </div>
          </div>

          <aside class="proforma-split-aside" data-aside>
            ${raw(renderAside())}
          </aside>
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

  // Solo refresca el aside (no toca la tabla → no perdés foco/scroll).
  const refreshAside = () => {
    const aside = node.querySelector("[data-aside]");
    if (aside) aside.innerHTML = renderAside();
  };

  // Marca la fila seleccionada en la tabla sin remontar todo.
  const refreshSelection = () => {
    node.querySelectorAll("tr.row").forEach((tr) => {
      tr.classList.toggle("row-selected", tr.dataset.id === state.selectedId);
    });
  };

  // -----------------------------------------------------------------
  // Selección de fila → carga detail/aperturas
  // -----------------------------------------------------------------
  const selectRow = async (id) => {
    // En mobile/tablet preferimos navegar al detalle completo.
    if (!wideEnough()) { navigate("detalle/" + id); return; }
    if (state.selectedId === id) return; // ya está cargado
    state.selectedId = id;
    state.detail = null;
    state.aperturas = null;
    state.detailError = null;
    state.detailLoading = true;
    refreshSelection();
    refreshAside();
    try {
      const detail = await fetchProformaDetail(id);
      if (state.selectedId !== id) return; // el usuario clickeó otra
      if (!detail) {
        state.detailError = `No se encontró ${id}`;
        state.detailLoading = false;
        refreshAside();
        return;
      }
      const aperturas = await fetchAperturas(detail.proforma.id).catch(() => []);
      if (state.selectedId !== id) return;
      state.detail = detail;
      state.aperturas = aperturas;
      state.detailLoading = false;
      refreshAside();
    } catch (err) {
      console.warn("[listado] selectRow:", err);
      state.detailError = err.message || String(err);
      state.detailLoading = false;
      refreshAside();
    }
  };

  // -----------------------------------------------------------------
  // Wiring de eventos
  // -----------------------------------------------------------------
  const wire = (target) => {
    on(target, "click", "[data-action='nueva']", () => navigate("generador"));

    on(target, "click", "[data-action='link']", async (e, btn) => {
      const id = btn.dataset.id;
      const proforma = PROFORMAS.find((p) => p.id === id);
      if (!proforma) return;
      if (!proforma.proformaId) {
        toast("Esta proforma no se guardó en la base. Recargá la página.", { type: "err" });
        return;
      }
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = proforma.slug ? "Copiando…" : "Generando…";
      try {
        const wasNew = !proforma.slug;
        if (wasNew) proforma.slug = await ensurePublicLink(proforma.proformaId);
        const url = publicUrl(proforma.slug);
        await copyAndToast(url, { ok: "Link copiado", info: "Link listo" });
        if (wasNew) window.open(url, "_blank", "noopener");
        refresh();
      } catch (err) {
        console.error(err);
        toast(err.message || "No pude generar el link", { type: "err" });
        btn.disabled = false;
        btn.innerHTML = original;
      }
    });

    on(target, "click", "[data-filter]", (_, btn) => { state.filter = btn.dataset.filter; state.page = 0; refresh(); });
    on(target, "input", "[data-search]", (e) => {
      state.search = e.target.value;
      state.page = 0;
      const cursor = e.target.selectionStart;
      refresh();
      requestAnimationFrame(() => {
        const inp = node.querySelector("[data-search]");
        if (inp) { inp.focus(); inp.setSelectionRange(cursor, cursor); }
      });
    });
    on(target, "change", "[data-sort]", (e) => { state.sort = e.target.value; state.page = 0; refresh(); });
    on(target, "click", "[data-action='prev-page']", () => { state.page = Math.max(0, state.page - 1); refresh(); });
    on(target, "click", "[data-action='next-page']", () => { state.page = state.page + 1; refresh(); });

    on(target, "click", "tr.row", (e, tr) => {
      if (e.target.closest("[data-stop]")) return;
      selectRow(tr.dataset.id);
    });

    // ----- Aside actions -----
    on(target, "click", "[data-action='aside-ver']", () => {
      if (state.selectedId) navigate("detalle/" + state.selectedId);
    });
    on(target, "click", "[data-action='aside-pdf']", () => {
      if (!state.selectedId) return;
      window.open(`${location.origin}${location.pathname}#/print/${state.selectedId}`, "_blank", "noopener");
    });
    on(target, "click", "[data-action='aside-copy-link']", async () => {
      if (!state.detail?.slug) return;
      await copyAndToast(publicUrl(state.detail.slug));
    });
    on(target, "click", "[data-action='aside-gen-link']", async () => {
      if (!state.detail) return;
      try {
        const slug = await ensurePublicLink(state.detail.proforma.id);
        state.detail.slug = slug;
        const url = publicUrl(slug);
        await copyAndToast(url, { ok: "Link copiado", info: "Link generado" });
        window.open(url, "_blank", "noopener");
        // Sincronizar PROFORMAS en memoria (la fila ya tiene id)
        const rec = PROFORMAS.find((p) => p.proformaId === state.detail.proforma.id);
        if (rec) rec.slug = slug;
        refreshAside();
      } catch (err) {
        toast(err.message || "No pude generar", { type: "err" });
      }
    });
  };

  wire(node);
};
