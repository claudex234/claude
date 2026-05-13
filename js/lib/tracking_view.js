// Render del bloque de tracking en el detalle de la proforma:
// sesión actual (si está abierta ahora), stats, sparkline 30 días,
// heatmap por zona y tabla de aperturas.

import { fmtTime, escapeHtml as e, ago } from "./utils.js";
import { isLiveApertura } from "../data/api/aperturas.js";

// === Agregados ============================================================

const trackingStats = (aperturas) => {
  const reales = aperturas.filter((a) => !a.meta?.bloqueado);
  const ips = new Set(reales.map((a) => a.ip).filter(Boolean));
  const total_s = reales.reduce((s, a) => s + (a.duracion_s || 0), 0);
  return {
    aperturas: reales.length,
    ips: ips.size,
    total_s,
    ultima: reales[0]?.abierta_at || null,
    impresiones: reales.filter((a) => a.impresion).length,
    descargas: reales.filter((a) => a.descarga).length,
    reenvios: reales.filter((a) => a.reenvio).length,
    bloqueadas: aperturas.filter((a) => a.meta?.bloqueado).length,
  };
};

const aggregateZonas = (aperturas) => {
  const acc = { encabezado: 0, items: 0, totales: 0, terminos: 0 };
  for (const a of aperturas) {
    const z = a.zonas_s || {};
    for (const k of Object.keys(acc)) acc[k] += z[k] || 0;
  }
  return acc;
};

// === Subcomponentes (HTML strings) =======================================

const statsGrid = (s) => `
  <div class="stat-grid" style="margin-bottom:16px">
    <div class="stat">
      <div class="stat-label">Aperturas</div>
      <div class="stat-value">${s.aperturas}</div>
      <div class="stat-delta">${s.ips} IP${s.ips === 1 ? "" : "s"} únicas</div>
    </div>
    <div class="stat">
      <div class="stat-label">Tiempo total leído</div>
      <div class="stat-value">${fmtTime(s.total_s)}</div>
      <div class="stat-delta">Última: ${ago(s.ultima)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Reenvíos</div>
      <div class="stat-value">${s.reenvios}</div>
      <div class="stat-delta">${s.bloqueadas} bloqueadas por país</div>
    </div>
    <div class="stat">
      <div class="stat-label">Impresiones</div>
      <div class="stat-value">${s.impresiones}</div>
      <div class="stat-delta">${s.descargas} descargas</div>
    </div>
  </div>`;

const sparkline = (aperturas) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return { date: d, count: 0 };
  });
  for (const a of aperturas) {
    if (!a.abierta_at) continue;
    const d = new Date(a.abierta_at);
    d.setHours(0, 0, 0, 0);
    const idx = 29 - Math.round((today - d) / 86400000);
    if (idx >= 0 && idx < 30) days[idx].count++;
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  const bw = 7, gap = 3, w = 30 * (bw + gap) - gap, h = 40;
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title">Aperturas por día · últimos 30</div></div>
      <div class="card-body" style="padding:14px 16px">
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="display:block;max-width:${w}px">
          ${days.map((d, i) => {
            const bh = Math.max(1, Math.round((d.count / max) * (h - 2)));
            const y = h - bh, x = i * (bw + gap);
            const fill = d.count > 0 ? "var(--accent)" : "var(--border)";
            return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${fill}" rx="1"><title>${d.date.toISOString().slice(0, 10)} · ${d.count}</title></rect>`;
          }).join("")}
        </svg>
      </div>
    </div>`;
};

const heatmapZonas = (aperturas) => {
  const z = aggregateZonas(aperturas);
  const total = z.encabezado + z.items + z.totales + z.terminos;
  if (total === 0) return "";
  const labels = { encabezado: "Encabezado", items: "Ítems", totales: "Totales", terminos: "Términos" };
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title">Tiempo por zona de la hoja</div></div>
      <div class="card-body">
        ${Object.entries(labels).map(([k, l]) => {
          const pct = Math.round((z[k] / total) * 100);
          return `
            <div style="display:grid;grid-template-columns:90px 1fr 100px;align-items:center;gap:12px;padding:6px 0">
              <div style="font-size:12.5px;color:var(--text-2)">${l}</div>
              <div style="background:var(--bg-soft);height:14px;border-radius:7px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:var(--accent);transition:width .3s"></div>
              </div>
              <div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);text-align:right">${pct}% · ${fmtTime(z[k])}</div>
            </div>`;
        }).join("")}
      </div>
    </div>`;
};

const aperturasRow = (a) => {
  const lugar = [a.ciudad, a.pais].filter(Boolean).join(", ") || "—";
  const bloqueada = !!a.meta?.bloqueado;
  return `
    <tr class="row" style="${bloqueada ? "opacity:.55" : ""}">
      <td style="font-family:var(--font-mono);font-size:11.5px">${a._whenLabel}</td>
      <td>
        <div style="font-size:12.5px">${e(a.dispositivo || "—")}</div>
        <div style="font-size:11px;color:var(--text-mute);margin-top:2px">${e(lugar)} · ${e(a.os || "")}</div>
      </td>
      <td style="text-align:right;font-family:var(--font-mono);font-size:12px">${fmtTime(a.duracion_s || 0)}</td>
      <td style="text-align:right;font-family:var(--font-mono);font-size:12px">${a.scroll_pct || 0}%</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${bloqueada ? '<span class="badge" style="font-size:10px;color:var(--danger);border-color:var(--danger)">bloqueada</span>' : ""}
          ${a.reenvio ? '<span class="badge badge-warn" style="font-size:10px">reenvío</span>' : ""}
          ${a.impresion ? '<span class="badge" style="font-size:10px">impresión</span>' : ""}
          ${a.descarga ? '<span class="badge" style="font-size:10px">descarga</span>' : ""}
          ${a.print_screen_attempts > 0 ? `<span class="badge" style="font-size:10px;color:var(--danger)">prntscr ${a.print_screen_attempts}</span>` : ""}
          ${a.clicks > 0 ? `<span class="badge" style="font-size:10px">${a.clicks} clicks</span>` : ""}
        </div>
      </td>
    </tr>`;
};

const aperturasTable = (aperturas) => `
  <div class="card">
    <div class="card-header"><div class="card-title">Aperturas · ${aperturas.length}</div></div>
    <div class="card-body" style="padding:0;max-height:520px;overflow-y:auto">
      <table class="table" style="margin:0">
        <thead>
          <tr>
            <th style="width:130px">Cuándo</th>
            <th>Dispositivo / lugar</th>
            <th style="width:80px;text-align:right">Tiempo</th>
            <th style="width:80px;text-align:right">Scroll</th>
            <th style="width:180px">Flags</th>
          </tr>
        </thead>
        <tbody>
          ${aperturas.map(aperturasRow).join("")}
        </tbody>
      </table>
    </div>
  </div>`;

// === Export principal ====================================================

import { fmtDateTime } from "./utils.js";

// Card "Sesión actual" — datos del último visitante (dispositivo, OS,
// IP, ubicación, idioma, timezone, pantalla, CPU cores, referrer).
// Si la apertura es reciente (<30s), muestra el badge verde pulsante
// "Abierta ahora".
const sessionCard = (a) => {
  if (!a) return "";
  const live = isLiveApertura(a);
  const meta = a.meta || {};
  const bloqueada = !!meta.bloqueado;
  const lugar = [a.ciudad, a.pais].filter(Boolean).join(", ");
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">Sesión actual · dispositivo</div>
        ${bloqueada
          ? '<span class="badge" style="font-size:10.5px;color:var(--danger);border-color:var(--danger)">Bloqueada por país</span>'
          : live
            ? '<span class="live-pill"><span class="live-dot"></span>Abierta ahora</span>'
            : `<span style="font-size:11px;color:var(--text-mute)">${ago(a.ultima_actividad_at || a.abierta_at)}</span>`}
      </div>
      <div class="card-body" style="padding:0">
        <table class="table" style="margin:0;font-size:12px">
          <tbody>
            <tr><td style="color:var(--text-3);width:130px">Dispositivo</td><td>${e(a.dispositivo || "—")}</td></tr>
            <tr><td style="color:var(--text-3)">Sistema</td><td>${e(a.os || "—")}</td></tr>
            ${meta.screen ? `<tr><td style="color:var(--text-3)">Pantalla</td><td style="font-family:var(--font-mono);font-size:11.5px">${e(meta.screen)}</td></tr>` : ""}
            ${meta.hwc ? `<tr><td style="color:var(--text-3)">CPU cores</td><td>${meta.hwc}</td></tr>` : ""}
            <tr><td style="color:var(--text-3)">IP pública</td><td style="font-family:var(--font-mono);font-size:11.5px">${e(a.ip || "—")}</td></tr>
            <tr><td style="color:var(--text-3)">Ubicación</td><td>${e(lugar || "—")}</td></tr>
            <tr><td style="color:var(--text-3)">Idioma</td><td>${e(a.idioma || "—")}</td></tr>
            <tr><td style="color:var(--text-3)">Zona horaria</td><td style="font-family:var(--font-mono);font-size:11px">${e(a.timezone || "—")}</td></tr>
            ${live ? `<tr><td style="color:var(--text-3)">Mirando hace</td><td>${fmtTime(a.duracion_s || 0)}</td></tr>` : ""}
            ${a.referrer ? `<tr><td style="color:var(--text-3)">Referrer</td><td style="font-size:11px;color:var(--text-2);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e(a.referrer)}">${e(a.referrer)}</td></tr>` : ""}
          </tbody>
        </table>
      </div>
    </div>`;
};

export const renderTracking = (aperturas) => {
  if (!aperturas || !aperturas.length) {
    return `<div class="card">
      <div class="card-header"><div class="card-title">Tracking</div></div>
      <div class="card-body" style="text-align:center;padding:32px 24px;color:var(--text-mute);font-size:13px">
        Sin aperturas todavía. Cuando el cliente abra el link verás acá hora, dispositivo, ciudad y comportamiento.
      </div>
    </div>`;
  }
  // Pre-cómputo de etiqueta de fecha por fila (evita map dentro del template).
  const withLabels = aperturas.map((a) => ({ ...a, _whenLabel: fmtDateTime(a.abierta_at) }));
  // La sesión actual = la apertura MÁS reciente (aunque sea bloqueada).
  // Útil para detectar intentos con VPN: si vemos una bloqueada nueva,
  // sabemos que alguien fuera de PE acaba de intentar entrar.
  const ultima = withLabels[0];
  return [
    sessionCard(ultima),
    statsGrid(trackingStats(withLabels)),
    sparkline(withLabels),
    heatmapZonas(withLabels),
    aperturasTable(withLabels),
  ].join("");
};
