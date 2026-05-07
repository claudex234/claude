import { html, raw, el, on, storage } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { fmtMoney, fmtTime } from "../lib/utils.js";
import { METRICS } from "../data/metrics.js";
import { PROFORMAS } from "../data/proformas.js";
import { navigate } from "../lib/router.js";

const DEFAULT_LAYOUT = [
  { id: "stats", row: 0 },
  { id: "chart", row: 1, col: 0 },
  { id: "clientes", row: 1, col: 1 },
  { id: "recientes", row: 2, col: 0 },
  { id: "insights", row: 2, col: 1 },
];

const loadLayout = () => storage.get("dash-layout-v1", DEFAULT_LAYOUT);
const saveLayout = (l) => storage.set("dash-layout-v1", l);

const dragHandle = () => `<span class="dash-handle" title="Arrastra para reordenar" style="display:inline-flex">${icon("drag", 14)}</span>`;

const chartCard = (m) => {
  const max = Math.max(...m.aperturasDia);
  return html`
    <div class="card-header">
      <div class="card-title" style="display:flex;align-items:center;gap:6px">${raw(dragHandle())}Aperturas diarias · 30 días</div>
      <div style="display:flex;gap:4px;padding:3px;background:var(--bg-soft);border-radius:var(--radius-sm)">
        ${raw(["7d","30d","90d"].map((p,i) => `<button class="btn btn-sm" style="background:${i===1?"var(--surface)":"transparent"};border:none;box-shadow:${i===1?"var(--shadow-sm)":"none"};padding:3px 8px">${p}</button>`).join(""))}
      </div>
    </div>
    <div class="card-body">
      <div style="display:grid;grid-template-columns:repeat(${m.aperturasDia.length}, 1fr);gap:3px;align-items:flex-end;height:200px">
        ${raw(m.aperturasDia.map((v,i) => `<div title="Día ${i+1}: ${v} aperturas" style="height:${(v/max)*100}%;background:${i===m.aperturasDia.length-1?"var(--accent)":"var(--accent-soft)"};border-radius:3px 3px 0 0;min-height:4px;cursor:pointer"></div>`).join(""))}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--text-mute);font-family:var(--font-mono)">
        <span>5 abr</span><span>15 abr</span><span>25 abr</span><span>5 may</span>
      </div>
    </div>
  `;
};

const clientesCard = (m) => {
  const maxAp = Math.max(...m.topClientes.map(x => x.aperturas));
  return html`
    <div class="card-header">
      <div class="card-title" style="display:flex;align-items:center;gap:6px">${raw(dragHandle())}${raw(icon("flame", 13))} Clientes más activos</div>
    </div>
    <div class="card-body" style="padding:0">
      ${raw(m.topClientes.map((c, i) => `
        <div style="padding:12px 16px;border-bottom:${i<m.topClientes.length-1?"1px solid var(--border)":"none"}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.nombre}</div>
            <div style="font-size:12.5px;font-family:var(--font-mono);color:var(--text-2);flex-shrink:0;margin-left:8px">
              <span style="font-weight:700">${c.aperturas}</span> · ${fmtTime(c.tiempo)}
            </div>
          </div>
          <div class="heat-bar"><div class="heat-fill" style="width:${(c.aperturas/maxAp)*100}%"></div></div>
        </div>
      `).join(""))}
    </div>
  `;
};

const recientesCard = () => {
  const recientes = PROFORMAS.slice(0, 5);
  return html`
    <div class="card-header">
      <div class="card-title" style="display:flex;align-items:center;gap:6px">${raw(dragHandle())}Proformas recientes</div>
      <button class="btn btn-sm" data-action="ver-todas">Ver todas</button>
    </div>
    <div class="card-body" style="padding:0">
      ${raw(recientes.map((p, i) => `
        <div data-proforma="${p.id}" style="padding:12px 16px;border-bottom:${i<recientes.length-1?"1px solid var(--border)":"none"};display:grid;grid-template-columns:1fr auto auto;gap:16px;align-items:center;cursor:pointer">
          <div style="min-width:0">
            <div style="font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.cliente}</div>
            <div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);margin-top:2px">${p.id} · ${fmtMoney(p.monto)}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            ${p.aperturas > 0 ? `<span class="badge">${icon("eye", 10)} ${p.aperturas}</span>` : ""}
            ${p.reenvios > 0 ? `<span class="badge badge-warn">${icon("forward", 10)} ${p.reenvios}</span>` : ""}
            ${p.estado === "enviada" ? `<span class="badge badge-info">enviada</span>` : ""}
          </div>
          <div style="font-size:11.5px;color:var(--text-mute);text-align:right;white-space:nowrap">${p.ultimaVista}</div>
        </div>
      `).join(""))}
    </div>
  `;
};

const insightsCard = () => {
  const items = [
    { i: "forward", t: "Innova Schools reenvió la proforma 4 veces", s: "Probablemente está siendo evaluada por el comité. Buen momento para llamar." },
    { i: "rotate", t: "Universidad Continental abrió 23 veces", s: "23 aperturas en 5 días desde 3 ciudades. Considera ofrecer una demo." },
    { i: "clock", t: "8 proformas vencen esta semana", s: "Por valor total de S/ 287k. Reenvía con un recordatorio." },
  ];
  return html`
    <div class="card-header" style="border-bottom:none">
      <div class="card-title" style="display:flex;align-items:center;gap:6px">${raw(dragHandle())}${raw(icon("sparkle", 14))} Insights de la semana</div>
    </div>
    <div class="card-body" style="padding-top:0">
      ${raw(items.map((it, i) => `
        <div style="padding:10px 0;border-top:${i>0?"1px solid var(--border)":"none"};display:flex;gap:10px">
          <div style="width:28px;height:28px;border-radius:8px;background:var(--surface);border:1px solid var(--border);display:grid;place-items:center;flex-shrink:0;color:var(--accent-strong)">${icon(it.i, 13)}</div>
          <div>
            <div style="font-size:13px;font-weight:600">${it.t}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px;line-height:1.4">${it.s}</div>
          </div>
        </div>
      `).join(""))}
    </div>
  `;
};

const renderCard = (cardId, m) => {
  if (cardId === "chart") return chartCard(m);
  if (cardId === "clientes") return clientesCard(m);
  if (cardId === "recientes") return recientesCard();
  if (cardId === "insights") return insightsCard();
  return "";
};

export const render = (root) => {
  const m = METRICS;
  let layout = loadLayout();

  const findCard = (row, col) => layout.find(x => x.row === row && x.col === col);
  const cardAt = (row, col) => findCard(row, col)?.id;
  const isCustom = () => JSON.stringify(layout) !== JSON.stringify(DEFAULT_LAYOUT);

  const build = () => el(html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Buenos días, Diego</h1>
          <p class="page-sub">Esto es lo que pasa con tus proformas en los últimos 30 días. <span style="color:var(--text-mute)">· Arrastra las tarjetas para reordenar.</span></p>
        </div>
        <div style="display:flex;gap:8px">
          ${isCustom() ? raw(`<button class="btn" data-action="reset" title="Restaurar orden por defecto">${icon("refresh", 13)} Reset</button>`) : ""}
          <button class="btn btn-primary" data-action="nueva">${raw(icon("plus"))} Nueva proforma</button>
        </div>
      </div>

      <div class="stat-grid" style="margin-bottom:20px">
        <div class="stat">
          <div class="stat-label">Proformas enviadas</div>
          <div class="stat-value">${m.enviadasMes}</div>
          <div class="stat-delta up">${raw(icon("arrowUp", 11))} +12% vs. mes pasado</div>
        </div>
        <div class="stat">
          <div class="stat-label">Tasa de apertura</div>
          <div class="stat-value">${m.tasaApertura}<span style="font-size:18px;color:var(--text-3)">%</span></div>
          <div class="stat-delta up">${raw(icon("arrowUp", 11))} +4 pts</div>
        </div>
        <div class="stat">
          <div class="stat-label">Monto enviado</div>
          <div class="stat-value">S/ ${(m.montoEnviado / 1000).toFixed(0)}k</div>
          <div class="stat-delta">${fmtMoney(m.montoVisto)} visto por clientes</div>
        </div>
        <div class="stat">
          <div class="stat-label">Tiempo promedio leyendo</div>
          <div class="stat-value">${Math.floor(m.promedioTiempo/60)}<span style="font-size:18px;color:var(--text-3)">m ${m.promedioTiempo%60}s</span></div>
          <div class="stat-delta up">${m.promedioVistas} aperturas/proforma</div>
        </div>
      </div>

      <div class="dash-row" style="display:grid;grid-template-columns:1.6fr 1fr;gap:20px">
        <div class="dash-card" draggable="true" data-card-id="${cardAt(1,0)}"><div class="card" style="height:100%">${raw(renderCard(cardAt(1,0), m))}</div></div>
        <div class="dash-card" draggable="true" data-card-id="${cardAt(1,1)}"><div class="card" style="height:100%${cardAt(1,1)==="insights"?";background:linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 60%)":""}">${raw(renderCard(cardAt(1,1), m))}</div></div>
      </div>

      <div class="dash-row" style="display:grid;grid-template-columns:1.6fr 1fr;gap:20px;margin-top:20px">
        <div class="dash-card" draggable="true" data-card-id="${cardAt(2,0)}"><div class="card" style="height:100%">${raw(renderCard(cardAt(2,0), m))}</div></div>
        <div class="dash-card" draggable="true" data-card-id="${cardAt(2,1)}"><div class="card" style="height:100%${cardAt(2,1)==="insights"?";background:linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 60%)":""}">${raw(renderCard(cardAt(2,1), m))}</div></div>
      </div>
    </div>
  `);

  let node = build();
  root.appendChild(node);

  const wire = (target) => {
    on(target, "click", "[data-action='reset']", () => { layout = [...DEFAULT_LAYOUT]; saveLayout(layout); refresh(); });
    on(target, "click", "[data-action='nueva']", () => navigate("generador"));
    on(target, "click", "[data-action='ver-todas']", () => navigate("proformas"));
    on(target, "click", "[data-proforma]", (_, btn) => navigate("detalle/" + btn.dataset.proforma));

    on(target, "dragstart", ".dash-card", (e, card) => {
      e.dataTransfer.setData("text/plain", card.dataset.cardId);
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });
    on(target, "dragend", ".dash-card", (_, card) => card.classList.remove("dragging"));
    on(target, "dragover", ".dash-card", (e, card) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; card.classList.add("drag-over"); });
    on(target, "dragleave", ".dash-card", (_, card) => card.classList.remove("drag-over"));
    on(target, "drop", ".dash-card", (e, card) => {
      e.preventDefault();
      card.classList.remove("drag-over");
      const fromId = e.dataTransfer.getData("text/plain");
      const toId = card.dataset.cardId;
      if (!fromId || fromId === toId) return;
      const next = layout.map(x => ({ ...x }));
      const a = next.find(x => x.id === fromId);
      const b = next.find(x => x.id === toId);
      if (!a || !b) return;
      const tmp = { row: a.row, col: a.col };
      a.row = b.row; a.col = b.col;
      b.row = tmp.row; b.col = tmp.col;
      layout = next;
      saveLayout(layout);
      refresh();
    });
  };

  const refresh = () => {
    const next = build();
    node.replaceWith(next);
    node = next;
    wire(node);
  };

  wire(node);
};
