import { html, raw, el, on, fmtMoney } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { PRODUCTOS } from "../data/productos.js";
import { PROFORMAS } from "../data/proformas.js";
import { navigate } from "../lib/router.js";
import { createProforma, nextNumero } from "../data/api.js";
import { supabase } from "../lib/supabase.js";
import { toast } from "../lib/toast.js";
import { EMISOR, FORMAS_PAGO, BLOQUES_PANTALLA } from "../data/empresa.js";
import { parsePaste, PRODUCT_CODES } from "../lib/parser.js";

const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

const STATE_DEFAULT = () => ({
  numero: "PRF-…-…",
  estado: "borrador",
  raw: "",
  asunto: "Pantallas interactivas - 3 unidades",
  cliente: { razonSocial: "", ruc: "", contacto: "", email: "", telefono: "" },
  productos: [],
  terminos: {
    validez: EMISOR.defaults.validezDias,
    formaPago: EMISOR.defaults.formaPago,
    tiempoEntrega: EMISOR.defaults.tiempoEntrega,
  },
  publicSlug: null,
  emitidaIso: new Date().toISOString().slice(0, 10),
});

const totals = (productos) => {
  const subtotal = productos.reduce((a, p) => a + p.qty * p.precio, 0);
  const igv = +(subtotal * 0.18).toFixed(2);
  const total = +(subtotal + igv).toFixed(2);
  return { subtotal, igv, total };
};

// ====== Preview (lado derecho, "PDF") ======
const renderPreview = (s) => {
  const { subtotal, igv, total } = totals(s.productos);
  const { cliente, terminos } = s;
  const bloquesPantalla = s.productos.some((p) => PRODUCTOS[p.modelo]?.tipo !== "no-pantalla");

  const itemRow = (p, i) => {
    const ref = PRODUCTOS[p.modelo] || {};
    const highlight = (ref.specsHighlight || []).map((x) => `<div class="pv-spec-hi">${escHtml(x)}</div>`).join("");
    const specs = (ref.specs || []).map((x) => `<div class="pv-spec">${escHtml(x)}</div>`).join("");
    const incluye = (ref.incluye || []).map((x) => `<div class="pv-spec">${escHtml(x)}</div>`).join("");
    return `
      <tr>
        <td class="pv-num">${p.qty}</td>
        <td>
          <div class="pv-item-title">${escHtml(p.nombre)}</div>
          ${highlight ? `<div class="pv-item-hi">${highlight}</div>` : ""}
          ${specs ? `<div class="pv-item-specs">${specs}</div>` : ""}
          ${incluye ? `<div class="pv-incluye-title">INCLUIDO EN EL PAQUETE</div><div class="pv-item-specs">${incluye}</div>` : ""}
        </td>
        <td class="pv-num pv-right">S/ ${fmtMoney(p.precio).replace("S/ ", "")}</td>
        <td class="pv-num pv-right pv-strong">S/ ${fmtMoney(p.qty * p.precio).replace("S/ ", "")}</td>
      </tr>`;
  };

  return html`
    <div class="pv-doc">
      <div class="pv-page">
        <header class="pv-header">
          <div class="pv-emisor">
            <div class="pv-logo-mark">N</div>
            <div>
              <div class="pv-emisor-name">${escHtml(EMISOR.razonSocial)}</div>
              <div class="pv-emisor-meta">RUC ${EMISOR.ruc}  ·  ${EMISOR.email}  ·  ${EMISOR.telefono}</div>
            </div>
          </div>
          <div class="pv-doc-meta">
            <div class="pv-doc-label">DOCUMENTO</div>
            <div class="pv-doc-numero">${s.numero}</div>
            <div class="pv-doc-fecha">${fmtDate(s.emitidaIso)}</div>
          </div>
        </header>

        <h2 class="pv-title">Proforma</h2>

        <div class="pv-grid-2">
          <section class="pv-card">
            <div class="pv-card-label">CLIENTE</div>
            <div class="pv-card-strong">${escHtml(cliente.razonSocial || "—")}</div>
            ${cliente.ruc ? `<div class="pv-card-row">RUC ${escHtml(cliente.ruc)}</div>` : ""}
            ${cliente.contacto ? `<div class="pv-card-row">${escHtml(cliente.contacto)}</div>` : ""}
            ${cliente.email ? `<div class="pv-card-row">${escHtml(cliente.email)}</div>` : ""}
            ${cliente.telefono ? `<div class="pv-card-row">${escHtml(cliente.telefono)}</div>` : ""}
          </section>
          <section class="pv-card">
            <div class="pv-card-label">TÉRMINOS</div>
            <div class="pv-terms">
              <div><span>Tiempo entrega</span><b>${escHtml(terminos.tiempoEntrega)}</b></div>
              <div><span>Lugar entrega</span><b>${escHtml(EMISOR.defaults.lugarEntrega)}</b></div>
              <div><span>Garantía</span><b>${escHtml(EMISOR.defaults.garantia)}</b></div>
              <div><span>Validez</span><b>${terminos.validez} días</b></div>
              <div><span>Condiciones</span><b>${escHtml(EMISOR.defaults.condiciones)}</b></div>
            </div>
          </section>
        </div>

        <table class="pv-items">
          <thead>
            <tr>
              <th class="pv-th-num">CANT</th>
              <th>DESCRIPCIÓN</th>
              <th class="pv-th-num pv-right">P. UND</th>
              <th class="pv-th-num pv-right">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${raw(s.productos.length
              ? s.productos.map(itemRow).join("")
              : `<tr><td colspan="4" class="pv-empty">Agregá productos para verlos acá</td></tr>`)}
          </tbody>
        </table>

        <div class="pv-totales">
          <div><span>Subtotal</span><b>S/ ${fmtMoney(subtotal).replace("S/ ", "")}</b></div>
          <div><span>IGV (18%)</span><b>S/ ${fmtMoney(igv).replace("S/ ", "")}</b></div>
          <div class="pv-total-row"><span>Total</span><b>S/ ${fmtMoney(total).replace("S/ ", "")}</b></div>
        </div>

        <div class="pv-page-foot">1 / 2</div>
      </div>

      <div class="pv-page">
        ${bloquesPantalla ? `
          <div class="pv-grid-2">
            <section class="pv-block pv-block-ok">
              <div class="pv-block-title">SERVICIOS INCLUIDOS</div>
              ${BLOQUES_PANTALLA.servicios.map((x) => `<div>· ${escHtml(x)}</div>`).join("")}
            </section>
            <section class="pv-block pv-block-no">
              <div class="pv-block-title">NO INCLUIDO</div>
              ${BLOQUES_PANTALLA.noIncluido.map((x) => `<div>· ${escHtml(x)}</div>`).join("")}
            </section>
          </div>
        ` : ""}

        <section class="pv-cuentas">
          <div class="pv-card-label">CUENTAS BANCARIAS</div>
          ${EMISOR.cuentas.map((c) => `
            <div class="pv-cuenta">
              <b>${escHtml(c.banco)} ${escHtml(c.moneda)}:</b> ${escHtml(c.numero)}
              · <b>CCI</b> ${escHtml(c.cci)}
            </div>`).join("")}
          <div class="pv-cuenta-pago"><b>Forma de pago:</b> ${escHtml(terminos.formaPago)}</div>
        </section>

        <div class="pv-firma">
          <div class="pv-firma-label">Atentamente,</div>
          <div class="pv-firma-name">${escHtml(EMISOR.firmante)}</div>
        </div>

        <div class="pv-page-foot">2 / 2</div>
      </div>
    </div>
  `;
};

// ====== Editor (lado izquierdo) ======
const detectionChips = (det, productos) => {
  const chip = (label, ok) =>
    `<span class="chip ${ok ? "chip-ok" : "chip-mute"}">${ok ? "✓" : "·"} ${label}</span>`;
  return [
    chip("RUC", det.ruc),
    chip("Email", det.email),
    chip("Teléfono", det.telefono),
    chip("Contacto", det.contacto),
    productos.length
      ? `<span class="chip chip-ok">✓ ${productos.length} producto${productos.length > 1 ? "s" : ""}</span>`
      : "",
  ].join(" ");
};

const productoRow = (p, i) => {
  const ref = PRODUCTOS[p.modelo] || {};
  const incluye = (ref.incluye || []).length;
  const specs = (ref.specs || []).length;
  return `
    <div class="prod-row" data-prod-row="${i}">
      <input type="number" min="1" class="prod-qty" data-fp="qty" data-i="${i}" value="${p.qty}">
      <div class="prod-info">
        <div class="prod-name">${escHtml(p.nombre)}</div>
        <details class="prod-detail">
          <summary>Ver descripción completa</summary>
          <div class="prod-detail-body">${specs} specs · ${incluye} accesorios</div>
        </details>
      </div>
      <input type="number" min="0" class="prod-price" data-fp="precio" data-i="${i}" value="${p.precio}">
      <div class="prod-total">${fmtMoney(p.qty * p.precio)}</div>
      <button class="prod-del" data-action="rm-prod" data-i="${i}" title="Quitar">×</button>
    </div>`;
};

const renderEditor = (s) => html`
  <div class="page fade-in gen-page">
    <div class="gen-topbar">
      <div class="gen-title">
        <input class="gen-title-input" data-f="asunto" value="${escHtml(s.asunto)}" placeholder="Asunto de la proforma">
        <div class="gen-title-meta">
          <span class="mono">${s.numero}</span>
          <span class="dot">·</span>
          <span class="status status-${s.estado}">${s.estado}</span>
        </div>
      </div>
      <div class="gen-actions">
        <button class="btn" data-action="duplicar">${raw(icon("copy") || "")} Duplicar</button>
        <button class="btn" data-action="pdf">${raw(icon("download") || "")} PDF</button>
        <button class="btn" data-action="copiar-link" ${s.publicSlug ? "" : "disabled"}>${raw(icon("link") || "")} Copiar link</button>
        <button class="btn btn-wsp" data-action="wsp">WhatsApp</button>
        <button class="btn btn-primary" data-action="enviar">${raw(icon("send"))} Enviar al cliente</button>
      </div>
    </div>

    <div class="gen-split">
      <div class="gen-editor">
        <section class="gen-section">
          <div class="gen-section-head">
            <span class="gen-section-title">✦ PEGA DATOS DEL CLIENTE + PRODUCTO</span>
            <span class="gen-section-hint">la última línea = código del producto</span>
          </div>
          <textarea class="gen-paste" data-f="raw" rows="8" placeholder="Pegá acá: razón social, RUC, contacto, email, teléfono, código de producto…">${escHtml(s.raw)}</textarea>
          <div class="gen-chips" data-chips></div>
          <details class="gen-codes">
            <summary>Códigos de producto</summary>
            <div class="gen-codes-body">
              <code>3PLUS8500</code> = 3 unidades del PLUS a S/8500 c/u ·
              <code>2PRO</code> = 2 PRO al precio default ·
              <code>ELITE</code> = 1 ELITE al default
            </div>
          </details>
        </section>

        <section class="gen-section">
          <div class="gen-section-title">CLIENTE</div>
          <div class="gen-form">
            <div class="gen-field gen-field-full">
              <label class="field-label">Razón social</label>
              <input class="input" data-f="razonSocial" value="${escHtml(s.cliente.razonSocial)}">
            </div>
            <div class="gen-field"><label class="field-label">RUC</label><input class="input" data-f="ruc" value="${escHtml(s.cliente.ruc)}"></div>
            <div class="gen-field"><label class="field-label">Contacto</label><input class="input" data-f="contacto" value="${escHtml(s.cliente.contacto)}"></div>
            <div class="gen-field"><label class="field-label">Email</label><input class="input" data-f="email" value="${escHtml(s.cliente.email)}"></div>
            <div class="gen-field"><label class="field-label">Teléfono</label><input class="input" data-f="telefono" value="${escHtml(s.cliente.telefono)}"></div>
          </div>
        </section>

        <section class="gen-section">
          <div class="gen-section-head">
            <span class="gen-section-title">PRODUCTOS (${s.productos.length})</span>
            <div class="gen-quick-add">
              ${PRODUCT_CODES.map((c) => `<button class="chip chip-add" data-action="add-prod" data-code="${c}">+ ${c}</button>`).join("")}
            </div>
          </div>
          <div class="prod-list" data-prod-list>
            ${raw(s.productos.length
              ? s.productos.map(productoRow).join("")
              : `<div class="prod-empty">Sin productos · usá los chips de arriba o pegá un código en el textarea.</div>`)}
          </div>
        </section>

        <section class="gen-section">
          <div class="gen-section-head">
            <span class="gen-section-title">BLOQUES AUTOMÁTICOS</span>
            ${s.productos.length ? `<span class="gen-section-hint">detectada pantalla interactiva</span>` : ""}
          </div>
          <div class="gen-blocks">
            <div class="gen-block gen-block-ok">
              <div class="gen-block-title">✓ Servicios incluidos</div>
              ${BLOQUES_PANTALLA.servicios.map((x) => `<div>· ${escHtml(x)}</div>`).join("")}
            </div>
            <div class="gen-block gen-block-no">
              <div class="gen-block-title">✗ No incluido</div>
              ${BLOQUES_PANTALLA.noIncluido.map((x) => `<div>· ${escHtml(x)}</div>`).join("")}
            </div>
          </div>
        </section>

        <section class="gen-section">
          <div class="gen-section-title">TÉRMINOS</div>
          <div class="gen-form">
            <div class="gen-field">
              <label class="field-label">Validez (días)</label>
              <input type="number" min="1" class="input" data-f="validez" value="${s.terminos.validez}">
            </div>
            <div class="gen-field">
              <label class="field-label">Forma de pago</label>
              <select class="input" data-f="formaPago">
                ${FORMAS_PAGO.map((f) => `<option ${f === s.terminos.formaPago ? "selected" : ""}>${escHtml(f)}</option>`).join("")}
              </select>
            </div>
            <div class="gen-field">
              <label class="field-label">Tiempo de entrega</label>
              <input class="input" data-f="tiempoEntrega" value="${escHtml(s.terminos.tiempoEntrega)}">
            </div>
          </div>
        </section>

        <div class="gen-track-banner">
          <div class="gen-track-icon">${raw(icon("eye") || "")}</div>
          <div>
            <div class="gen-track-title">Tracking activo en este PDF</div>
            <div class="gen-track-sub">aperturas, IPs, dispositivo, tiempo por página, descargas, reenvíos y giroscopio (Android/iOS).</div>
          </div>
        </div>
      </div>

      <div class="gen-preview" data-preview>
        ${raw(renderPreview(s))}
      </div>
    </div>
  </div>
`;

// ====== Mount ======
export const render = (root) => {
  const s = STATE_DEFAULT();

  // Pre-cargar el próximo número (no bloquea el render)
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        s.numero = await nextNumero(user.id);
        const numTarget = root.querySelector(".gen-title-meta .mono");
        if (numTarget) numTarget.textContent = s.numero;
        refreshPreview();
      }
    } catch (err) { console.warn("nextNumero:", err); }
  })();

  let node = el(renderEditor(s));
  root.appendChild(node);

  const refreshChips = () => {
    const det = {
      razonSocial: !!s.cliente.razonSocial,
      ruc: !!s.cliente.ruc,
      contacto: !!s.cliente.contacto,
      email: !!s.cliente.email,
      telefono: !!s.cliente.telefono,
    };
    const target = node.querySelector("[data-chips]");
    if (target) target.innerHTML = detectionChips(det, s.productos);
  };

  const refreshProductos = () => {
    const target = node.querySelector("[data-prod-list]");
    if (target) {
      target.innerHTML = s.productos.length
        ? s.productos.map(productoRow).join("")
        : `<div class="prod-empty">Sin productos · usá los chips de arriba o pegá un código en el textarea.</div>`;
    }
    const counter = node.querySelector(".gen-section-title");
    // Actualizar todos los contadores que digan "PRODUCTOS"
    node.querySelectorAll(".gen-section-title").forEach((t) => {
      if (t.textContent.startsWith("PRODUCTOS")) t.textContent = `PRODUCTOS (${s.productos.length})`;
    });
  };

  const refreshPreview = () => {
    const target = node.querySelector("[data-preview]");
    if (target) target.innerHTML = renderPreview(s);
  };

  const refreshAll = () => { refreshChips(); refreshProductos(); refreshPreview(); };

  // Smart paste: cuando cambia raw, reparseamos y completamos campos vacíos
  on(node, "input", "[data-f='raw']", (e) => {
    s.raw = e.target.value;
    const parsed = parsePaste(s.raw, PRODUCTOS);
    // Llenar solo lo que esté vacío para no pisar ediciones manuales
    if (parsed.razonSocial && !s.cliente.razonSocial) s.cliente.razonSocial = parsed.razonSocial;
    if (parsed.ruc && !s.cliente.ruc) s.cliente.ruc = parsed.ruc;
    if (parsed.contacto && !s.cliente.contacto) s.cliente.contacto = parsed.contacto;
    if (parsed.email && !s.cliente.email) s.cliente.email = parsed.email;
    if (parsed.telefono && !s.cliente.telefono) s.cliente.telefono = parsed.telefono;
    if (parsed.productos.length) s.productos = parsed.productos.slice();
    // Reflejar en inputs
    const setVal = (sel, v) => { const i = node.querySelector(sel); if (i) i.value = v; };
    setVal("[data-f='razonSocial']", s.cliente.razonSocial);
    setVal("[data-f='ruc']", s.cliente.ruc);
    setVal("[data-f='contacto']", s.cliente.contacto);
    setVal("[data-f='email']", s.cliente.email);
    setVal("[data-f='telefono']", s.cliente.telefono);
    refreshAll();
  });

  // Cliente y términos
  on(node, "input", "[data-f]", (e) => {
    const f = e.target.dataset.f;
    const v = e.target.value;
    if (f === "raw") return;
    if (f === "asunto") s.asunto = v;
    else if (f === "razonSocial") s.cliente.razonSocial = v;
    else if (f === "ruc") s.cliente.ruc = v;
    else if (f === "contacto") s.cliente.contacto = v;
    else if (f === "email") s.cliente.email = v;
    else if (f === "telefono") s.cliente.telefono = v;
    else if (f === "validez") s.terminos.validez = parseInt(v, 10) || 0;
    else if (f === "formaPago") s.terminos.formaPago = v;
    else if (f === "tiempoEntrega") s.terminos.tiempoEntrega = v;
    refreshChips();
    refreshPreview();
  });
  // Selects no disparan "input" en algunos browsers
  on(node, "change", "select[data-f]", (e) => {
    if (e.target.dataset.f === "formaPago") {
      s.terminos.formaPago = e.target.value;
      refreshPreview();
    }
  });

  // Quick-add producto
  on(node, "click", "[data-action='add-prod']", (e) => {
    const code = e.target.dataset.code;
    const ref = PRODUCTOS[code];
    if (!ref) return toast(`No hay producto ${code} cargado`, { type: "err" });
    s.productos.push({ modelo: code, qty: 1, precio: ref.precioDefault, nombre: ref.nombre });
    refreshAll();
  });

  // Quitar producto
  on(node, "click", "[data-action='rm-prod']", (e) => {
    const i = parseInt(e.target.dataset.i, 10);
    s.productos.splice(i, 1);
    refreshAll();
  });

  // Editar qty/precio inline
  on(node, "input", "[data-fp]", (e) => {
    const i = parseInt(e.target.dataset.i, 10);
    const f = e.target.dataset.fp;
    const v = parseFloat(e.target.value) || 0;
    if (!s.productos[i]) return;
    s.productos[i][f] = v;
    // Actualizar solo el total de la fila + preview
    const row = node.querySelector(`[data-prod-row='${i}']`);
    if (row) row.querySelector(".prod-total").textContent = fmtMoney(s.productos[i].qty * s.productos[i].precio);
    refreshPreview();
  });

  // Acciones de la barra superior
  const validate = () => {
    if (!s.cliente.razonSocial.trim()) { toast("Falta el cliente", { type: "err" }); return false; }
    if (!s.productos.length) { toast("Agregá al menos un producto", { type: "err" }); return false; }
    return true;
  };

  const doSave = async (estado, btn) => {
    if (!validate()) return;
    const buttons = node.querySelectorAll("[data-action]");
    buttons.forEach((b) => (b.disabled = true));
    const original = btn?.innerHTML;
    if (btn) btn.textContent = estado === "enviada" ? "Enviando…" : "Guardando…";
    try {
      const { proforma, slug, totals: t } = await createProforma({
        estado,
        cliente: s.cliente,
        asunto: s.asunto,
        items: s.productos,
      });
      PROFORMAS.unshift({
        id: proforma.numero,
        cliente: s.cliente.razonSocial,
        contacto: s.cliente.contacto,
        cargo: "",
        ruc: s.cliente.ruc,
        email: s.cliente.email,
        telefono: s.cliente.telefono,
        monto: t.total,
        moneda: "PEN",
        items: s.productos.length,
        emitida: proforma.emitida,
        validez: proforma.validez,
        estado: proforma.estado,
        aperturas: 0, tiempoTotal: 0, ultimaVista: "—",
        paginas: 0, descargas: 0, impresiones: 0, reenvios: 0,
        giroscopio: false,
        asunto: s.asunto,
      });
      s.numero = proforma.numero;
      s.estado = proforma.estado;
      s.publicSlug = slug;
      toast(estado === "enviada" ? `${proforma.numero} enviada` : `${proforma.numero} guardada`, { type: "ok" });
      navigate("proformas");
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude guardar", { type: "err" });
      buttons.forEach((b) => (b.disabled = false));
      if (btn && original) btn.innerHTML = original;
    }
  };

  on(node, "click", "[data-action='enviar']", (e) => doSave("enviada", e.target.closest("button")));
  on(node, "click", "[data-action='pdf']", () => toast("Export a PDF — próximamente", { type: "info" }));
  on(node, "click", "[data-action='duplicar']", () => toast("Duplicar — próximamente", { type: "info" }));
  on(node, "click", "[data-action='copiar-link']", async () => {
    if (!s.publicSlug) return toast("Primero enviá la proforma para generar el link", { type: "err" });
    const url = `https://duecaz.github.io/test/#/p/${s.publicSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado", { type: "ok" });
    } catch {
      toast(url, { type: "info", ms: 6000 });
    }
  });
  on(node, "click", "[data-action='wsp']", () => {
    const tel = (s.cliente.telefono || "").replace(/[^\d+]/g, "");
    if (!tel) return toast("Cargá un teléfono primero", { type: "err" });
    const link = s.publicSlug ? `https://duecaz.github.io/test/#/p/${s.publicSlug}` : "";
    const msg = encodeURIComponent(
      `Hola ${s.cliente.contacto || ""}, te paso la proforma ${s.numero}: ${s.asunto || ""}.${link ? " " + link : ""}`
    );
    window.open(`https://wa.me/${tel.replace(/^\+/, "")}?text=${msg}`, "_blank");
  });
};
