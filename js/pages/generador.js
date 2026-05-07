import { html, raw, el, on, fmtMoney } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { PRODUCTOS } from "../data/productos.js";
import { navigate } from "../lib/router.js";

// Parser para "3PRO6000", "1PLUS", "pro"
const parseLine = (line) => {
  const clean = line.trim().toUpperCase().replace(/\s+/g, "");
  if (!clean) return null;
  const m = clean.match(/^(\d{1,3})?(PLUS|PRO|ELITE)(\d{3,7})?$/);
  if (!m) return null;
  const [, qtyStr, modelo, priceStr] = m;
  const producto = PRODUCTOS[modelo];
  if (!producto) return null;
  return {
    qty: qtyStr ? parseInt(qtyStr, 10) : 1,
    modelo,
    nombre: producto.nombre,
    precio: priceStr ? parseInt(priceStr, 10) : producto.precioDefault,
  };
};

export const render = (root) => {
  let cliente = "Colegio Innova Schools";
  let ruc = "20554321987";
  let asunto = "Renovación tecnológica primaria - 24 pantallas";
  let lines = "1PLUS\n2PRO\n1ELITE";

  const items = () => lines.split("\n").map(parseLine).filter(Boolean);

  const buildPreview = () => {
    const its = items();
    const subtotal = its.reduce((a, it) => a + it.qty * it.precio, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    return html`
      <div class="card" style="padding:0;overflow:hidden;height:100%">
        <div style="padding:24px 28px;background:#0a2540;color:white">
          <div style="font-size:10px;letter-spacing:2px;font-weight:700;opacity:.7">PROFORMA</div>
          <div style="font-size:20px;font-weight:700;margin-top:6px">${cliente || "—"}</div>
          <div style="font-size:11px;opacity:.7;font-family:var(--font-mono);margin-top:4px">RUC ${ruc || "—"}</div>
        </div>
        <div style="padding:18px 28px;border-bottom:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-mute);text-transform:uppercase;letter-spacing:.5px;font-weight:600">Asunto</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${asunto || "—"}</div>
        </div>
        <div style="padding:0">
          <table class="table" style="margin:0">
            <thead><tr><th>Cant.</th><th>Descripción</th><th style="text-align:right">P. unit.</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>
              ${raw(its.map(it => `
                <tr>
                  <td style="font-family:var(--font-mono)">${it.qty}</td>
                  <td>${it.nombre}</td>
                  <td style="text-align:right;font-family:var(--font-mono)">${fmtMoney(it.precio)}</td>
                  <td style="text-align:right;font-family:var(--font-mono);font-weight:600">${fmtMoney(it.qty * it.precio)}</td>
                </tr>
              `).join("") || `<tr><td colspan="4" style="color:var(--text-mute);text-align:center;padding:32px">Sin ítems · escribí "1PLUS", "2PRO 6500", "ELITE"…</td></tr>`)}
            </tbody>
          </table>
        </div>
        <div style="padding:18px 28px;display:flex;justify-content:flex-end">
          <div style="min-width:220px">
            <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span style="color:var(--text-3)">Subtotal</span><span style="font-family:var(--font-mono)">${fmtMoney(subtotal)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span style="color:var(--text-3)">IGV 18%</span><span style="font-family:var(--font-mono)">${fmtMoney(igv)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;padding:8px 0;border-top:1px solid var(--border);margin-top:6px"><span>Total</span><span style="font-family:var(--font-mono)">${fmtMoney(total)}</span></div>
          </div>
        </div>
      </div>
    `;
  };

  const build = () => el(html`
    <div class="page fade-in" style="height:calc(100vh - 80px);display:flex;flex-direction:column">
      <div class="page-header">
        <div>
          <h1 class="page-title">Nueva proforma</h1>
          <p class="page-sub">Editor split-view · escribí los productos en formato compacto y se previsualizan en vivo.</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn">Guardar borrador</button>
          <button class="btn btn-primary" data-action="enviar">${raw(icon("send"))} Enviar</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:20px;flex:1;min-height:0">
        <div class="card" style="padding:20px;overflow-y:auto">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div><label class="field-label">Cliente</label><input class="input" data-f="cliente" value="${cliente}"></div>
            <div><label class="field-label">RUC</label><input class="input" data-f="ruc" value="${ruc}"></div>
            <div style="grid-column:1 / -1"><label class="field-label">Asunto</label><input class="input" data-f="asunto" value="${asunto}"></div>
          </div>
          <div style="margin-top:18px">
            <label class="field-label">Ítems (1 por línea: <code style="font-family:var(--font-mono)">2PRO6500</code> = 2× PRO a S/ 6500)</label>
            <textarea class="textarea" data-f="lines" rows="10" style="font-family:var(--font-mono);font-size:13px">${lines}</textarea>
          </div>
          <div style="margin-top:14px;font-size:11.5px;color:var(--text-mute);line-height:1.5">
            Códigos válidos: <code>PLUS</code>, <code>PRO</code>, <code>ELITE</code>. Cantidad opcional al inicio, precio opcional al final.
          </div>
        </div>
        <div data-preview style="overflow-y:auto">
          ${raw(buildPreview())}
        </div>
      </div>
    </div>
  `);

  let node = build();
  root.appendChild(node);

  const refreshPreview = () => {
    const target = node.querySelector("[data-preview]");
    if (target) target.innerHTML = buildPreview();
  };

  on(node, "input", "[data-f]", (e) => {
    const v = e.target.value;
    const f = e.target.dataset.f;
    if (f === "cliente") cliente = v;
    if (f === "ruc") ruc = v;
    if (f === "asunto") asunto = v;
    if (f === "lines") lines = v;
    refreshPreview();
  });
  on(node, "click", "[data-action='enviar']", () => navigate("detalle/PRF-2026-0141"));
};
