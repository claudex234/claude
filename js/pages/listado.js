import { html, raw, el, on, fmtMoney, fmtTime } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { PROFORMAS } from "../data/proformas.js";
import { navigate } from "../lib/router.js";
import { toast } from "../lib/toast.js";
import { ensurePublicLink } from "../data/api.js";
import { copyToClipboard } from "../lib/clipboard.js";

const publicLinkFor = (slug) => `${location.origin}${location.pathname}#/p/${slug}`;

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "vista", label: "Vistas" },
  { id: "borrador", label: "Sin abrir" },
];

export const render = (root) => {
  let state = { search: "", filter: "todas", sort: "recientes" };

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

  const counts = {
    todas: PROFORMAS.length,
    vista: PROFORMAS.filter(p => p.estado === "vista").length,
    borrador: PROFORMAS.filter(p => p.estado === "borrador").length,
  };

  const renderRow = (p) => html`
    <tr class="row" data-id="${p.id}" style="cursor:pointer">
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
                  <th style="width:140px"></th>
                </tr>
              </thead>
              <tbody>
                ${raw(filtered.map(renderRow).join(""))}
              </tbody>
            </table>
          </div>
        </div>

        <div style="margin-top:12px;font-size:12px;color:var(--text-3)">
          Mostrando ${filtered.length} de ${PROFORMAS.length}
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
        const url = publicLinkFor(proforma.slug);
        const copied = await copyToClipboard(url);
        toast(copied ? `Link copiado · ${url}` : `Link listo · ${url}`, { type: "ok", ms: 7000 });
        if (wasNew) window.open(url, "_blank", "noopener");
        refresh();
      } catch (err) {
        console.error(err);
        toast(err.message || "No pude generar el link", { type: "err" });
        btn.disabled = false;
        btn.innerHTML = original;
      }
    });
    on(target, "click", "[data-filter]", (_, btn) => { state.filter = btn.dataset.filter; refresh(); });
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
  };

  wire(node);
};
