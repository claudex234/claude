// Detalle de una proforma — datos reales desde Supabase, incluyendo
// el tracking de aperturas del link público.

import { html, raw, el, on, fmtMoney, fmtTime, fmtDate, escapeHtml as e } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { navigate } from "../lib/router.js";
import { fetchProformaDetail, ensurePublicLink, fetchAperturas } from "../data/api.js";
import { toast } from "../lib/toast.js";
import { copyToClipboard } from "../lib/clipboard.js";

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
};

const ago = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const days = Math.floor(h / 24);
  return `hace ${days}d`;
};

// Sparkline 30 días: bars verticales con cantidad de aperturas por día.
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
    const diff = Math.round((today - d) / 86400000);
    const idx = 29 - diff;
    if (idx >= 0 && idx < 30) days[idx].count++;
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  const bw = 7, gap = 3, w = 30 * (bw + gap) - gap, h = 40;
  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="display:block;max-width:${w}px">
      ${days.map((d, i) => {
        const bh = Math.max(1, Math.round((d.count / max) * (h - 2)));
        const y = h - bh;
        const x = i * (bw + gap);
        const fill = d.count > 0 ? "var(--accent)" : "var(--border)";
        return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${fill}" rx="1"><title>${d.date.toISOString().slice(0,10)} · ${d.count}</title></rect>`;
      }).join("")}
    </svg>`;
};

// Suma de segundos por zona a través de todas las aperturas.
const aggregateZonas = (aperturas) => {
  const acc = { encabezado: 0, items: 0, totales: 0, terminos: 0 };
  for (const a of aperturas) {
    const z = a.zonas_s || {};
    for (const k of Object.keys(acc)) acc[k] += z[k] || 0;
  }
  return acc;
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

const trackingStats = (aperturas) => {
  const reales = aperturas.filter((a) => !a.meta?.bloqueado);
  const ips = new Set(reales.map((a) => a.ip).filter(Boolean));
  const total_s = reales.reduce((s, a) => s + (a.duracion_s || 0), 0);
  const ultima = reales[0]?.abierta_at || null;
  const impresiones = reales.filter((a) => a.impresion).length;
  const descargas = reales.filter((a) => a.descarga).length;
  const reenvios = reales.filter((a) => a.reenvio).length;
  const bloqueadas = aperturas.filter((a) => a.meta?.bloqueado).length;
  return { aperturas: reales.length, ips: ips.size, total_s, ultima, impresiones, descargas, reenvios, bloqueadas };
};

const trackingSection = (aperturas) => {
  if (!aperturas || !aperturas.length) {
    return raw(`<div class="card">
      <div class="card-header"><div class="card-title">Tracking</div></div>
      <div class="card-body" style="text-align:center;padding:32px 24px;color:var(--text-mute);font-size:13px">
        Sin aperturas todavía. Cuando el cliente abra el link verás acá hora, dispositivo, ciudad y comportamiento.
      </div>
    </div>`);
  }
  const s = trackingStats(aperturas);
  return raw(`
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
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title">Aperturas por día · últimos 30</div></div>
      <div class="card-body" style="padding:14px 16px">${sparkline(aperturas)}</div>
    </div>

    ${heatmapZonas(aperturas)}

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
            ${aperturas.map((a) => {
              const lugar = [a.ciudad, a.pais].filter(Boolean).join(", ") || "—";
              const bloqueada = !!a.meta?.bloqueado;
              return `
                <tr class="row" style="${bloqueada ? "opacity:.55" : ""}">
                  <td style="font-family:var(--font-mono);font-size:11.5px">${fmtDateTime(a.abierta_at)}</td>
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
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `);
};

const skeleton = () => html`
  <div class="page fade-in">
    <div class="page-header">
      <div>
        <button class="btn btn-sm" data-action="back" style="margin-bottom:8px">← Volver al listado</button>
        <h1 class="page-title" style="color:var(--text-mute)">Cargando…</h1>
      </div>
    </div>
  </div>`;

const errorView = (msg) => html`
  <div class="page fade-in">
    <div class="page-header">
      <div>
        <button class="btn btn-sm" data-action="back" style="margin-bottom:8px">← Volver al listado</button>
        <h1 class="page-title">No se encontró la proforma</h1>
        <p class="page-sub" style="color:var(--danger)">${msg}</p>
      </div>
    </div>
  </div>`;

const view = (d, aperturas) => {
  const p = d.proforma;
  const c = d.cliente || {};
  const items = d.items || [];
  const total = Number(p.total) || 0;
  const subtotal = Number(p.subtotal) || 0;
  const igv = Number(p.igv) || 0;
  const numItems = items.length;

  return html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <button class="btn btn-sm" data-action="back" style="margin-bottom:8px">← Volver al listado</button>
          <h1 class="page-title">${p.numero}</h1>
          <p class="page-sub">${c.razon_social || "—"}${p.asunto ? ` · ${p.asunto}` : ""}</p>
        </div>
        <div style="display:flex;gap:8px">
          ${d.slug
            ? raw(`<button class="btn" data-action="copy-link">${icon("link", 13)} Copiar link</button>`)
            : raw(`<button class="btn" data-action="gen-link">${icon("link", 13)} Generar página</button>`)}
          <button class="btn" data-action="pdf">${raw(icon("download"))} PDF</button>
          <button class="btn btn-primary" data-action="edit">${raw(icon("edit"))} Editar</button>
        </div>
      </div>

      <div class="stat-grid" style="margin-bottom:20px">
        <div class="stat">
          <div class="stat-label">Estado</div>
          <div class="stat-value" style="font-size:18px;text-transform:capitalize">${p.estado || "—"}</div>
          <div class="stat-delta">Emitida ${fmtDate(p.emitida)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Validez</div>
          <div class="stat-value" style="font-size:18px">${fmtDate(p.validez)}</div>
          <div class="stat-delta">${d.skin ? `Skin · ${d.skin.codigo}` : "Skin default"}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Ítems</div>
          <div class="stat-value">${numItems}</div>
          <div class="stat-delta">${p.moneda || "PEN"}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total</div>
          <div class="stat-value" style="font-family:var(--font-mono);font-size:22px">${fmtMoney(total, p.moneda)}</div>
          <div class="stat-delta">IGV incluido</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px;margin-bottom:20px">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Ítems · ${numItems}</div>
            <div style="font-size:12px;color:var(--text-mute)">Emitida ${fmtDate(p.emitida)} · Vence ${fmtDate(p.validez)}</div>
          </div>
          <div class="card-body" style="padding:0">
            ${numItems === 0 ? raw(`<div style="padding:24px;color:var(--text-mute);text-align:center;font-size:13px">Sin ítems cargados.</div>`) : raw(`
            <table class="table" style="margin:0">
              <thead><tr><th style="width:50px">Cant.</th><th>Descripción</th><th style="text-align:right">P. unit.</th><th style="text-align:right">Total</th></tr></thead>
              <tbody>
                ${items.map((it) => `
                  <tr>
                    <td style="font-family:var(--font-mono)">${it.qty}</td>
                    <td>${e(it.descripcion || "")}</td>
                    <td style="text-align:right;font-family:var(--font-mono)">${fmtMoney(it.precio_unit, p.moneda)}</td>
                    <td style="text-align:right;font-family:var(--font-mono);font-weight:600">${fmtMoney(it.total, p.moneda)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
            <div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
              <div style="min-width:240px">
                <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span style="color:var(--text-3)">Subtotal</span><span style="font-family:var(--font-mono)">${fmtMoney(subtotal, p.moneda)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span style="color:var(--text-3)">IGV 18%</span><span style="font-family:var(--font-mono)">${fmtMoney(igv, p.moneda)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:8px 0;border-top:1px solid var(--border);margin-top:6px"><span>Total</span><span style="font-family:var(--font-mono)">${fmtMoney(total, p.moneda)}</span></div>
              </div>
            </div>`)}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Cliente</div></div>
          <div class="card-body">
            <div style="font-size:14px;font-weight:650;margin-bottom:2px">${e(c.razon_social || "—")}</div>
            ${c.ruc ? raw(`<div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);margin-bottom:14px">RUC ${e(c.ruc)}</div>`) : raw(`<div style="margin-bottom:14px"></div>`)}
            <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 12px;font-size:12.5px">
              ${c.contacto ? raw(`
                <div style="color:var(--text-mute);text-transform:uppercase;font-size:10.5px;letter-spacing:.4px;font-weight:600">Contacto</div>
                <div>${e(c.contacto)}${c.cargo ? ` <span style="color:var(--text-3)">· ${e(c.cargo)}</span>` : ""}</div>`) : ""}
              ${c.email ? raw(`
                <div style="color:var(--text-mute);text-transform:uppercase;font-size:10.5px;letter-spacing:.4px;font-weight:600">Email</div>
                <div style="font-family:var(--font-mono);font-size:12px">${e(c.email)}</div>`) : ""}
              ${c.telefono ? raw(`
                <div style="color:var(--text-mute);text-transform:uppercase;font-size:10.5px;letter-spacing:.4px;font-weight:600">Teléfono</div>
                <div style="font-family:var(--font-mono);font-size:12px">${e(c.telefono)}</div>`) : ""}
              ${!c.contacto && !c.email && !c.telefono ? raw(`<div style="grid-column:1/-1;color:var(--text-mute);font-size:12px">Sin datos de contacto.</div>`) : ""}
            </div>
          </div>
        </div>
      </div>

      ${trackingSection(aperturas)}
    </div>`;
};

export const render = async (root, ctx) => {
  const idParam = (ctx?.params && ctx.params[0]) || null;
  const node = el(skeleton());
  root.appendChild(node);

  on(node, "click", "[data-action='back']", () => navigate("proformas"));

  if (!idParam) {
    const next = el(errorView("Falta el identificador en la URL."));
    on(next, "click", "[data-action='back']", () => navigate("proformas"));
    node.replaceWith(next);
    return;
  }

  let detail;
  try {
    detail = await fetchProformaDetail(idParam);
  } catch (err) {
    console.error("[detalle]", err);
    const next = el(errorView(err.message || String(err)));
    on(next, "click", "[data-action='back']", () => navigate("proformas"));
    node.replaceWith(next);
    return;
  }
  if (!detail) {
    const next = el(errorView(`No existe ${idParam}.`));
    on(next, "click", "[data-action='back']", () => navigate("proformas"));
    node.replaceWith(next);
    return;
  }

  // Aperturas — paralelizadas, no bloquean el primer render del detalle.
  let aperturas = [];
  try { aperturas = await fetchAperturas(detail.proforma.id); }
  catch (err) { console.warn("[detalle] fetchAperturas:", err); }

  const next = el(view(detail, aperturas));
  node.replaceWith(next);

  const publicUrl = (slug) => `${location.origin}${location.pathname}#/p/${slug}`;

  on(next, "click", "[data-action='back']", () => navigate("proformas"));
  on(next, "click", "[data-action='edit']", () => navigate("generador/" + detail.proforma.numero));
  on(next, "click", "[data-action='copy-link']", async () => {
    if (!detail.slug) return;
    const url = publicUrl(detail.slug);
    const ok = await copyToClipboard(url);
    toast(ok ? `Link copiado · ${url}` : `Link · ${url}`, { type: ok ? "ok" : "info", ms: 7000 });
  });
  on(next, "click", "[data-action='gen-link']", async (ev) => {
    const btn = ev.target.closest("button");
    if (btn) { btn.disabled = true; btn.textContent = "Generando…"; }
    try {
      const slug = await ensurePublicLink(detail.proforma.id);
      detail.slug = slug;
      const url = publicUrl(slug);
      const ok = await copyToClipboard(url);
      toast(ok ? `Link copiado · ${url}` : `Link generado · ${url}`, { type: "ok", ms: 7000 });
      window.open(url, "_blank", "noopener");
      // Mutar el botón a 'Copiar link' (mismo handler de copy-link).
      if (btn) {
        btn.disabled = false;
        btn.dataset.action = "copy-link";
        btn.innerHTML = `${icon("link", 13)} Copiar link`;
      }
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude generar la página", { type: "err" });
      if (btn) { btn.disabled = false; btn.innerHTML = `${icon("link", 13)} Generar página`; }
    }
  });
  on(next, "click", "[data-action='pdf']", () => {
    // Abre la vista de impresión interna en pestaña nueva.
    const url = `${location.origin}${location.pathname}#/print/${detail.proforma.numero}`;
    window.open(url, "_blank", "noopener");
  });
};
