import { html, raw, el, on, fmtMoney, fmtTime } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { PROFORMA_DETAIL } from "../data/detalle.js";
import { navigate } from "../lib/router.js";

export const render = (root, ctx) => {
  const d = PROFORMA_DETAIL;
  const maxTime = Math.max(...d.pageHeatmap.map(p => p.time));
  const maxTaps = Math.max(...d.pageHeatmap.map(p => p.taps));

  const node = el(html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <button class="btn btn-sm" data-action="back" style="margin-bottom:8px">← Volver al listado</button>
          <h1 class="page-title">${d.id}</h1>
          <p class="page-sub">${d.cliente} · ${d.asunto}</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn">${raw(icon("forward"))} Reenviar</button>
          <button class="btn">${raw(icon("download"))} PDF</button>
          <button class="btn btn-primary">${raw(icon("edit"))} Editar</button>
        </div>
      </div>

      <div class="stat-grid" style="margin-bottom:20px">
        <div class="stat"><div class="stat-label">Aperturas</div><div class="stat-value">${d.stats.aperturas}</div><div class="stat-delta">desde ${d.stats.ipsUnicas} IPs únicas</div></div>
        <div class="stat"><div class="stat-label">Tiempo total leído</div><div class="stat-value">${Math.floor(d.stats.tiempoTotal/60)}<span style="font-size:18px;color:var(--text-3)">m ${d.stats.tiempoTotal%60}s</span></div><div class="stat-delta">${d.stats.dispositivosUnicos} dispositivos</div></div>
        <div class="stat"><div class="stat-label">Reenvíos detectados</div><div class="stat-value">${d.stats.reenvios}</div><div class="stat-delta up">${d.stats.ciudades} ciudades distintas</div></div>
        <div class="stat"><div class="stat-label">Total proforma</div><div class="stat-value" style="font-family:var(--font-mono);font-size:22px">${fmtMoney(d.monto)}</div><div class="stat-delta">${d.descargas || d.stats.descargas} descargas · ${d.stats.impresiones} impresiones</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px;margin-bottom:20px">
        <div class="card">
          <div class="card-header"><div class="card-title">Ítems · ${d.items.length}</div><div style="font-size:12px;color:var(--text-mute)">Emitida ${d.emitida} · Vence ${d.validez}</div></div>
          <div class="card-body" style="padding:0">
            <table class="table" style="margin:0">
              <thead><tr><th style="width:50px">Cant.</th><th>Descripción</th><th style="text-align:right">P. unit.</th><th style="text-align:right">Total</th></tr></thead>
              <tbody>
                ${raw(d.items.map(it => `
                  <tr>
                    <td style="font-family:var(--font-mono)">${it.qty}</td>
                    <td>${it.desc}</td>
                    <td style="text-align:right;font-family:var(--font-mono)">${fmtMoney(it.precio)}</td>
                    <td style="text-align:right;font-family:var(--font-mono);font-weight:600">${fmtMoney(it.total)}</td>
                  </tr>`).join(""))}
              </tbody>
            </table>
            <div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
              <div style="min-width:240px">
                <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span style="color:var(--text-3)">Subtotal</span><span style="font-family:var(--font-mono)">${fmtMoney(d.subtotal)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span style="color:var(--text-3)">IGV 18%</span><span style="font-family:var(--font-mono)">${fmtMoney(d.igv)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:8px 0;border-top:1px solid var(--border);margin-top:6px"><span>Total</span><span style="font-family:var(--font-mono)">${fmtMoney(d.monto)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Cliente</div></div>
          <div class="card-body">
            <div style="font-size:14px;font-weight:650;margin-bottom:2px">${d.cliente}</div>
            <div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);margin-bottom:14px">RUC ${d.ruc}</div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 12px;font-size:12.5px">
              <div style="color:var(--text-mute);text-transform:uppercase;font-size:10.5px;letter-spacing:.4px;font-weight:600">Contacto</div><div>${d.contacto} <span style="color:var(--text-3)">· ${d.cargo}</span></div>
              <div style="color:var(--text-mute);text-transform:uppercase;font-size:10.5px;letter-spacing:.4px;font-weight:600">Email</div><div style="font-family:var(--font-mono);font-size:12px">${d.email}</div>
              <div style="color:var(--text-mute);text-transform:uppercase;font-size:10.5px;letter-spacing:.4px;font-weight:600">Teléfono</div><div style="font-family:var(--font-mono);font-size:12px">${d.telefono}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-header"><div class="card-title">Tiempo por página</div></div>
          <div class="card-body" style="padding:0">
            ${raw(d.pageHeatmap.map(p => `
              <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:24px 1fr auto;gap:10px;align-items:center">
                <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-mute);font-weight:600">p.${p.page}</span>
                <div style="min-width:0">
                  <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.label}</div>
                  <div class="heat-bar" style="margin-top:4px"><div class="heat-fill" style="width:${(p.time/maxTime)*100}%"></div></div>
                </div>
                <div style="font-size:11.5px;color:var(--text-2);font-family:var(--font-mono);text-align:right">${fmtTime(p.time)}<br><span style="color:var(--text-mute)">${p.taps} toques</span></div>
              </div>
            `).join(""))}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Timeline · ${d.timeline.length} eventos</div></div>
          <div class="card-body" style="padding:0;max-height:520px;overflow-y:auto">
            ${raw(d.timeline.map(t => `
              <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:flex-start">
                <div style="width:28px;height:28px;border-radius:8px;background:${t.icon === "send" ? "var(--accent)" : "var(--bg-soft)"};color:${t.icon === "send" ? "white" : "var(--accent-strong)"};display:grid;place-items:center;flex-shrink:0">${icon(t.reenvio ? "forward" : t.icon || "eye", 13)}</div>
                <div style="min-width:0">
                  <div style="font-size:13px;font-weight:600">${t.evento}</div>
                  <div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);margin-top:2px">${t.fecha}</div>
                  ${t.dispositivo ? `<div style="font-size:11.5px;color:var(--text-3);margin-top:3px">${t.dispositivo} · ${t.ciudad || ""}</div>` : ""}
                  ${t.tiempo ? `<div style="font-size:11px;color:var(--text-mute);margin-top:2px">${fmtTime(t.tiempo)} · ${t.ip || ""}</div>` : ""}
                  <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
                    ${t.descarga ? '<span class="badge" style="font-size:10px">descarga</span>' : ""}
                    ${t.impresion ? '<span class="badge" style="font-size:10px">impresión</span>' : ""}
                    ${t.reenvio ? '<span class="badge badge-warn" style="font-size:10px">reenvío</span>' : ""}
                  </div>
                </div>
              </div>
            `).join(""))}
          </div>
        </div>
      </div>
    </div>
  `);
  on(node, "click", "[data-action='back']", () => navigate("proformas"));
  root.appendChild(node);
};
