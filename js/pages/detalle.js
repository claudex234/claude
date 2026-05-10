// Detalle de una proforma — datos reales desde Supabase.
// La sección de tracking queda con placeholders hasta que cableemos
// proforma_aperturas (último item del roadmap).

import { html, raw, el, on, fmtMoney, escapeHtml as e } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { navigate } from "../lib/router.js";
import { fetchProformaDetail } from "../data/api.js";
import { toast } from "../lib/toast.js";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
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

const view = (d) => {
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
          ${d.slug ? raw(`<button class="btn" data-action="copy-link">${icon("forward", 13)} Copiar link público</button>`) : ""}
          <button class="btn">${raw(icon("download"))} PDF</button>
          <button class="btn btn-primary">${raw(icon("edit"))} Editar</button>
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

      <div class="card">
        <div class="card-header">
          <div class="card-title">Tracking</div>
          <div style="font-size:12px;color:var(--text-mute)">pendiente de cablear</div>
        </div>
        <div class="card-body" style="text-align:center;padding:32px 24px;color:var(--text-mute);font-size:13px">
          La tabla <code>proforma_aperturas</code> todavía no recibe datos.<br>
          Cuando se active, acá vas a ver IPs, dispositivos, tiempo por página y reenvíos.
        </div>
      </div>
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

  const next = el(view(detail));
  node.replaceWith(next);

  on(next, "click", "[data-action='back']", () => navigate("proformas"));
  on(next, "click", "[data-action='copy-link']", async () => {
    if (!detail.slug) return;
    const url = `${location.origin}${location.pathname}#/p/${detail.slug}`;
    try {
      await navigator.clipboard?.writeText(url);
      toast(`Link copiado · ${url}`, { type: "ok", ms: 6000 });
    } catch {
      toast(`Link · ${url}`, { type: "info", ms: 8000 });
    }
  });
};
