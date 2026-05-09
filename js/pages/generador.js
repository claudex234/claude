import { fmtMoney, on, escapeHtml as e, el } from "../lib/utils.js";
import { PRODUCTOS } from "../data/productos.js";
import { PROFORMAS } from "../data/proformas.js";
import { navigate } from "../lib/router.js";
import { createProforma, nextNumero, ensurePublicLink } from "../data/api.js";
import { supabase } from "../lib/supabase.js";
import { toast } from "../lib/toast.js";
import { EMISOR, FORMAS_PAGO, BLOQUES_PANTALLA } from "../data/empresa.js";
import { parsePaste, PRODUCT_CODES } from "../lib/parser.js";
import { annotate } from "https://esm.sh/rough-notation@0.5.1";

const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const money = (n) => fmtMoney(n).replace("S/ ", "");

const initialState = () => ({
  numero: "PRF-…",
  estado: "borrador",
  raw: "",
  asunto: "Pantallas interactivas - 3 unidades",
  cliente: { razonSocial: "", ruc: "", contacto: "", email: "", telefono: "" },
  rucSeguro: false,
  productos: [],
  terminos: {
    validez: EMISOR.defaults.validezDias,
    formaPago: EMISOR.defaults.formaPago,
    tiempoEntrega: EMISOR.defaults.tiempoEntrega,
  },
  publicSlug: null,
  proformaId: null, // uuid devuelto por createProforma; null hasta primer guardado
  emitidaIso: new Date().toISOString().slice(0, 10),
});

const totals = (productos) => {
  const subtotal = productos.reduce((a, p) => a + p.qty * p.precio, 0);
  const igv = +(subtotal * 0.18).toFixed(2);
  return { subtotal, igv, total: +(subtotal + igv).toFixed(2) };
};

// ====== Preview (hoja A4) ======
const itemRowHtml = (p) => {
  const ref = PRODUCTOS[p.modelo] || {};
  // Specs destacadas: cada una su propio <div data-hl>. El contenedor
  // es flex-column con align-items:flex-start (cada hijo se ajusta al
  // ancho del texto) y gap (espacio vertical para que los strokes de
  // Rough Notation no se solapen).
  const hi = (ref.specsHighlight || []).map((x) => `<div data-hl>${e(x)}</div>`).join("");
  const specs = (ref.specs || []).map((x) => `<div>${e(x)}</div>`).join("");
  const incluye = (ref.incluye || []).map((x) => `<div>${e(x)}</div>`).join("");
  return `
    <tr>
      <td>
        <div class="pv-item-title">${e(p.nombre)}</div>
        ${hi ? `<div class="pv-item-hi">${hi}</div>` : ""}
        ${specs ? `<div class="pv-item-specs">${specs}</div>` : ""}
        ${incluye ? `<div class="pv-incluye-title">INCLUIDO EN EL PAQUETE</div><div class="pv-item-specs">${incluye}</div>` : ""}
      </td>
      <td class="pv-c">
        ${ref.imagen ? `<img class="pv-item-img" src="${e(ref.imagen)}" alt="${e(ref.codigo || p.modelo)}">` : ""}
        ${ref.codigo ? `<div class="pv-item-codigo">${e(ref.codigo)}</div>` : ""}
      </td>
      <td class="pv-num pv-c pv-strong">${p.qty}</td>
      <td class="pv-num pv-right">${money(p.precio)}</td>
      <td class="pv-num pv-right pv-strong">${money(p.qty * p.precio)}</td>
    </tr>`;
};

const renderPreview = (s) => {
  const t = totals(s.productos);
  const c = s.cliente;
  const tm = s.terminos;
  const showBloques = s.productos.length > 0;

  return `
    <div class="pv-doc">
      <article class="pv-page">
        <header class="pv-header">
          <div class="pv-emisor">
            <div class="pv-logo-svg">${EMISOR.logoSvg}</div>
            <div class="pv-emisor-meta">
              <div class="pv-emisor-name">${e(EMISOR.razonSocial)}</div>
              <div class="pv-emisor-ruc">RUC ${e(EMISOR.ruc)}</div>
            </div>
          </div>
          <div class="pv-doc-meta">
            <div class="pv-eyebrow">Cotización</div>
            <div class="pv-mono pv-mono-strong">${e(s.numero)}</div>
            <div class="pv-muted">${fmtDate(s.emitidaIso)}</div>
          </div>
        </header>

        <h2 class="pv-title">Cotización</h2>

        <div class="pv-grid-2">
          <section class="pv-card">
            <div class="pv-card-label">CLIENTE</div>
            <div class="pv-card-strong">${e(c.razonSocial || "—")}</div>
            ${c.ruc ? `<div class="pv-card-row">RUC ${e(c.ruc)}</div>` : ""}
            ${c.contacto ? `<div class="pv-card-row">${e(c.contacto)}</div>` : ""}
            ${c.email ? `<div class="pv-card-row">${e(c.email)}</div>` : ""}
            ${c.telefono ? `<div class="pv-card-row">${e(c.telefono)}</div>` : ""}
          </section>
          <section class="pv-card">
            <div class="pv-card-label">TÉRMINOS</div>
            <dl class="pv-terms">
              <dt>Tiempo entrega</dt><dd>${e(tm.tiempoEntrega)}</dd>
              <dt>Lugar entrega</dt><dd>${e(EMISOR.defaults.lugarEntrega)}</dd>
              <dt>Garantía</dt><dd>${e(EMISOR.defaults.garantia)}</dd>
              <dt>Validez</dt><dd>${tm.validez} días</dd>
              <dt>Condiciones</dt><dd>${e(EMISOR.defaults.condiciones)}</dd>
            </dl>
          </section>
        </div>

        <table class="pv-items">
          <colgroup>
            <col class="col-desc"><col class="col-img"><col class="col-qty"><col class="col-p"><col class="col-pt">
          </colgroup>
          <thead>
            <tr>
              <th>DESCRIPCIÓN</th>
              <th class="pv-c">IMAGEN</th>
              <th class="pv-c">CANT</th>
              <th class="pv-right">P.</th>
              <th class="pv-right">PT</th>
            </tr>
          </thead>
          <tbody>
            ${s.productos.length
              ? s.productos.map(itemRowHtml).join("")
              : `<tr><td colspan="5" class="pv-empty">Agregá productos para verlos acá</td></tr>`}
          </tbody>
        </table>

        <div class="pv-totales">
          <div><span>Subtotal</span><b>S/ ${money(t.subtotal)}</b></div>
          <div><span>IGV (18%)</span><b>S/ ${money(t.igv)}</b></div>
          <div class="pv-total-row"><span>Total</span><b>S/ ${money(t.total)}</b></div>
        </div>

        ${showBloques ? `
          <div class="pv-grid-2">
            <section class="pv-block pv-block-ok">
              <div class="pv-block-title">SERVICIOS INCLUIDOS</div>
              ${BLOQUES_PANTALLA.servicios.map((x) => `<div>· ${e(x)}</div>`).join("")}
            </section>
            <section class="pv-block pv-block-no">
              <div class="pv-block-title">NO INCLUIDO</div>
              ${BLOQUES_PANTALLA.noIncluido.map((x) => `<div>· ${e(x)}</div>`).join("")}
            </section>
          </div>` : ""}

        <section class="pv-cuentas">
          <div class="pv-card-label">CUENTAS BANCARIAS</div>
          ${EMISOR.cuentas.map((b) => `
            <div class="pv-cuenta"><b>${e(b.banco)} ${e(b.moneda)}:</b> ${e(b.numero)} · <b>CCI</b> ${e(b.cci)}</div>
          `).join("")}
        </section>

        <div class="pv-firma">
          <div class="pv-firma-label">Atentamente,</div>
          <div class="pv-firma-name">${e(EMISOR.firmante)}</div>
        </div>
      </article>
    </div>`;
};

// ====== Editor ======
const productoRowHtml = (p, i) => `
  <div class="prod-row" data-prod-row="${i}">
    <input type="number" min="1" class="prod-qty" data-fp="qty" data-i="${i}" value="${p.qty}">
    <div class="prod-name">${e(p.nombre)}</div>
    <input type="number" min="0" class="prod-price" data-fp="precio" data-i="${i}" value="${p.precio}">
    <div class="prod-total">${fmtMoney(p.qty * p.precio)}</div>
    <button class="prod-del" data-action="rm-prod" data-i="${i}" title="Quitar">×</button>
  </div>`;

const chipHtml = (label, ok) =>
  `<span class="chip ${ok ? "chip-ok" : "chip-mute"}">${ok ? "✓" : "·"} ${label}</span>`;

const renderEditor = (s) => `
  <div class="gen-shell fade-in">
    <header class="gen-bar">
      <div class="gen-bar-title">
        <input class="gen-title-input" data-f="asunto" value="${e(s.asunto)}" placeholder="Asunto">
        <div class="gen-bar-meta">
          <span class="mono">${e(s.numero)}</span>
          <span class="dot">·</span>
          <span class="status status-${s.estado}">${e(s.estado)}</span>
        </div>
      </div>
      <div class="gen-actions">
        <button class="btn btn-sm" data-action="duplicar">Duplicar</button>
        <button class="btn btn-sm" data-action="pdf">PDF</button>
        <button class="btn btn-sm btn-link" data-action="generar-link">${s.publicSlug ? "Copiar link" : "Generar link"}</button>
        <button class="btn btn-sm btn-wsp" data-action="wsp">WhatsApp</button>
        <button class="btn btn-sm btn-primary" data-action="enviar">Enviar al cliente</button>
      </div>
    </header>

    <div class="gen-split">
      <aside class="gen-editor">
        <section class="gen-section">
          <div class="gen-section-head">
            <span class="gen-section-title">✦ PEGÁ DATOS DEL CLIENTE + PRODUCTO</span>
            <span class="gen-section-hint">la última línea = código del producto</span>
          </div>
          <textarea class="gen-paste" data-f="raw" rows="6" placeholder="Pegá razón social, RUC, contacto, email, teléfono, código…">${e(s.raw)}</textarea>
          <div class="gen-chips" data-chips></div>
          <details class="gen-codes">
            <summary>Códigos de producto</summary>
            <div><code>3PLUS8500</code> = 3 PLUS a S/8500 · <code>2PRO</code> = 2 PRO al precio default · <code>ELITE</code> = 1 ELITE</div>
          </details>
        </section>

        <section class="gen-section">
          <div class="gen-section-title">CLIENTE</div>
          <div class="gen-form">
            <label class="gen-field gen-field-full"><span>Razón social</span><input class="input" data-f="razonSocial" value="${e(s.cliente.razonSocial)}"></label>
            <label class="gen-field"><span>RUC</span><input class="input" data-f="ruc" value="${e(s.cliente.ruc)}"></label>
            <label class="gen-field"><span>Contacto</span><input class="input" data-f="contacto" value="${e(s.cliente.contacto)}"></label>
            <label class="gen-field"><span>Email</span><input class="input" data-f="email" value="${e(s.cliente.email)}"></label>
            <label class="gen-field"><span>Teléfono</span><input class="input" data-f="telefono" value="${e(s.cliente.telefono)}"></label>
          </div>
        </section>

        <section class="gen-section">
          <div class="gen-section-head">
            <span class="gen-section-title" data-prod-count>PRODUCTOS (${s.productos.length})</span>
            <div class="gen-quick-add">
              ${PRODUCT_CODES.map((c) => `<button class="chip chip-add" data-action="add-prod" data-code="${c}">+ ${c}</button>`).join("")}
            </div>
          </div>
          <div class="prod-list" data-prod-list>
            ${s.productos.length
              ? s.productos.map(productoRowHtml).join("")
              : `<div class="prod-empty">Sin productos · usá los chips o pegá un código.</div>`}
          </div>
        </section>

        <section class="gen-section">
          <div class="gen-section-title">TÉRMINOS</div>
          <div class="gen-form">
            <label class="gen-field"><span>Validez (días)</span><input type="number" min="1" class="input" data-f="validez" value="${s.terminos.validez}"></label>
            <label class="gen-field"><span>Tiempo de entrega</span><input class="input" data-f="tiempoEntrega" value="${e(s.terminos.tiempoEntrega)}"></label>
            <label class="gen-field gen-field-full"><span>Forma de pago</span>
              <select class="input" data-f="formaPago">
                ${FORMAS_PAGO.map((f) => `<option ${f === s.terminos.formaPago ? "selected" : ""}>${e(f)}</option>`).join("")}
              </select>
            </label>
          </div>
        </section>
      </aside>

      <main class="gen-preview" data-preview><div class="pv-fit">${renderPreview(s)}</div></main>
    </div>
  </div>`;

// ====== Mount ======
export const render = (root) => {
  const s = initialState();

  // Próximo número (no bloquea)
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        s.numero = await nextNumero(user.id);
        const m = node.querySelector(".gen-bar-meta .mono");
        if (m) m.textContent = s.numero;
        refreshPreview();
      }
    } catch (err) { console.warn("nextNumero:", err); }
  })();

  const node = el(renderEditor(s));
  root.appendChild(node);

  // Escala la hoja A4 (794px de ancho) para que llene el ancho disponible.
  // Como un visor PDF: el contenido nunca se reorganiza, sólo cambia la
  // escala visual. Usamos transform: scale + wrapper con dimensiones
  // explícitas para que el layout/scroll coincida con lo que se ve.
  const PAGE_W = 794;
  const fitPreview = () => {
    const container = node.querySelector(".gen-preview");
    const fit = container?.querySelector(".pv-fit");
    const doc = fit?.querySelector(".pv-doc");
    if (!container || !fit || !doc) return;
    const cw = container.clientWidth - 48; // padding lateral
    if (cw <= 0) return;
    const scale = Math.max(0.3, cw / PAGE_W);
    doc.style.transformOrigin = "top left";
    doc.style.transform = `scale(${scale})`;
    // El wrapper ocupa el espacio "post-escala" para que el scroll
    // vertical del container sea correcto.
    fit.style.width = (PAGE_W * scale) + "px";
    fit.style.height = (doc.scrollHeight * scale) + "px";
  };

  const ro = new ResizeObserver(() => fitPreview());
  ro.observe(node.querySelector(".gen-preview"));
  requestAnimationFrame(() => { fitPreview(); applyHighlights(); });

  const refreshChips = () => {
    const target = node.querySelector("[data-chips]");
    if (!target) return;
    const ruc = s.cliente.ruc;
    const rucChip = !ruc
      ? `<span class="chip chip-mute">· RUC</span>`
      : s.rucSeguro
        ? `<span class="chip chip-ok" title="RUC empieza por 20: empresa">✓ RUC</span>`
        : `<span class="chip chip-warn" title="RUC válido pero no empieza por 20 (revisá)">? RUC</span>`;
    target.innerHTML = [
      rucChip,
      chipHtml("Email", !!s.cliente.email),
      chipHtml("Teléfono", !!s.cliente.telefono),
      chipHtml("Contacto", !!s.cliente.contacto),
      s.productos.length ? `<span class="chip chip-ok">✓ ${s.productos.length} producto${s.productos.length > 1 ? "s" : ""}</span>` : "",
    ].join(" ");
  };

  const refreshProductos = () => {
    const list = node.querySelector("[data-prod-list]");
    if (list) {
      list.innerHTML = s.productos.length
        ? s.productos.map(productoRowHtml).join("")
        : `<div class="prod-empty">Sin productos · usá los chips o pegá un código.</div>`;
    }
    const counter = node.querySelector("[data-prod-count]");
    if (counter) counter.textContent = `PRODUCTOS (${s.productos.length})`;
  };

  // Aplica el resaltador estilo marker (Rough Notation) a cada span con
  // data-hl. Cada span se rendea ajustado al ancho de su texto, así el
  // stroke termina donde termina la línea.
  const applyHighlights = () => {
    node.querySelectorAll("[data-hl]").forEach((el) => {
      annotate(el, {
        type: "highlight", color: "#ffe066",
        iterations: 2, animationDuration: 0, padding: [1, 2],
      }).show();
    });
  };

  const refreshPreview = () => {
    const fit = node.querySelector(".pv-fit");
    if (fit) {
      fit.innerHTML = renderPreview(s);
      fitPreview();
      applyHighlights();
    }
  };

  const refreshAll = () => { refreshChips(); refreshProductos(); refreshPreview(); };

  // Un único handler para todos los inputs/selects con data-f.
  const CLIENTE_FIELDS = ["razonSocial", "ruc", "contacto", "email", "telefono"];
  const handleField = (ev) => {
    const t = ev.target;
    const f = t.dataset.f;
    if (!f) return;
    const v = t.value;
    if (f === "raw") {
      s.raw = v;
      const parsed = parsePaste(v, PRODUCTOS);
      CLIENTE_FIELDS.forEach((k) => { s.cliente[k] = parsed[k] || ""; });
      s.rucSeguro = parsed.rucSeguro;
      s.productos = parsed.productos.slice();
      CLIENTE_FIELDS.forEach((k) => {
        const i = node.querySelector(`[data-f='${k}']`);
        if (i) i.value = s.cliente[k];
      });
      refreshAll();
      return;
    }
    if (f === "asunto") s.asunto = v;
    else if (CLIENTE_FIELDS.includes(f)) {
      s.cliente[f] = v;
      if (f === "ruc") s.rucSeguro = /^20\d{9}$/.test(v.trim());
    }
    else if (f === "validez") s.terminos.validez = parseInt(v, 10) || 0;
    else if (f === "formaPago") s.terminos.formaPago = v;
    else if (f === "tiempoEntrega") s.terminos.tiempoEntrega = v;
    refreshChips();
    refreshPreview();
  };
  on(node, "input", "[data-f]", handleField);
  on(node, "change", "[data-f]", handleField);

  // Productos
  on(node, "click", "[data-action='add-prod']", (ev) => {
    const code = ev.target.dataset.code;
    const ref = PRODUCTOS[code];
    if (!ref) return toast(`Falta producto ${code}`, { type: "err" });
    s.productos.push({ modelo: code, qty: 1, precio: ref.precioDefault, nombre: ref.nombre });
    refreshAll();
  });
  on(node, "click", "[data-action='rm-prod']", (ev) => {
    s.productos.splice(parseInt(ev.target.dataset.i, 10), 1);
    refreshAll();
  });
  on(node, "input", "[data-fp]", (ev) => {
    const i = parseInt(ev.target.dataset.i, 10);
    const f = ev.target.dataset.fp;
    const v = parseFloat(ev.target.value) || 0;
    if (!s.productos[i]) return;
    s.productos[i][f] = v;
    const row = node.querySelector(`[data-prod-row='${i}']`);
    if (row) row.querySelector(".prod-total").textContent = fmtMoney(s.productos[i].qty * s.productos[i].precio);
    refreshPreview();
  });

  // Acciones
  const validate = () => {
    if (!s.cliente.razonSocial.trim()) { toast("Falta el cliente", { type: "err" }); return false; }
    if (!s.productos.length) { toast("Agregá al menos un producto", { type: "err" }); return false; }
    return true;
  };

  on(node, "click", "[data-action='enviar']", async (ev) => {
    if (!validate()) return;
    const btns = node.querySelectorAll("[data-action]");
    btns.forEach((b) => (b.disabled = true));
    const btn = ev.target.closest("button");
    const original = btn?.innerHTML;
    if (btn) btn.textContent = "Enviando…";
    try {
      const { proforma, slug, totals: t } = await createProforma({
        estado: "enviada",
        cliente: s.cliente,
        asunto: s.asunto,
        items: s.productos,
      });
      PROFORMAS.unshift({
        id: proforma.numero,
        proformaId: proforma.id,
        slug: slug || null,
        cliente: s.cliente.razonSocial,
        contacto: s.cliente.contacto,
        ruc: s.cliente.ruc,
        email: s.cliente.email,
        telefono: s.cliente.telefono,
        monto: t.total, moneda: "PEN",
        items: s.productos.length,
        emitida: proforma.emitida, validez: proforma.validez, estado: proforma.estado,
        aperturas: 0, tiempoTotal: 0, ultimaVista: "—",
        paginas: 0, descargas: 0, impresiones: 0, reenvios: 0, giroscopio: false,
        asunto: s.asunto,
      });
      s.publicSlug = slug;
      s.proformaId = proforma.id;
      toast(`${proforma.numero} enviada`, { type: "ok" });
      navigate("proformas");
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude guardar", { type: "err" });
      btns.forEach((b) => (b.disabled = false));
      if (btn && original) btn.innerHTML = original;
    }
  });
  on(node, "click", "[data-action='pdf']", () => toast("Export a PDF — próximamente", { type: "info" }));
  on(node, "click", "[data-action='duplicar']", () => toast("Duplicar — próximamente", { type: "info" }));
  // Copy con fallback: navigator.clipboard puede fallar fuera de https
  // o sin user gesture (después de un await).
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch { return false; }
  };

  const publicUrl = (slug) => `${location.origin}${location.pathname}#/p/${slug}`;

  // Genera (o reutiliza) el link público. Si la proforma todavía no se
  // guardó en Supabase, primero la guarda como borrador.
  on(node, "click", "[data-action='generar-link']", async (ev) => {
    if (!validate()) return;
    const btn = ev.target.closest("button");
    const original = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.textContent = s.publicSlug ? "Copiando…" : "Generando…"; }
    try {
      // Si nunca lo guardamos, lo creamos como borrador.
      if (!s.proformaId) {
        const { proforma, slug, totals: t } = await createProforma({
          estado: "borrador",
          cliente: s.cliente,
          asunto: s.asunto,
          items: s.productos,
        });
        s.proformaId = proforma.id;
        s.numero = proforma.numero;
        s.publicSlug = slug || null;
        // Reflejar en la barra y el listado
        const m = node.querySelector(".gen-bar-meta .mono");
        if (m) m.textContent = s.numero;
        PROFORMAS.unshift({
          id: proforma.numero, proformaId: proforma.id, slug: null,
          cliente: s.cliente.razonSocial, contacto: s.cliente.contacto,
          ruc: s.cliente.ruc, email: s.cliente.email, telefono: s.cliente.telefono,
          monto: t.total, moneda: "PEN", items: s.productos.length,
          emitida: proforma.emitida, validez: proforma.validez, estado: "borrador",
          aperturas: 0, tiempoTotal: 0, ultimaVista: "—",
          paginas: 0, descargas: 0, impresiones: 0, reenvios: 0, giroscopio: false,
          asunto: s.asunto,
        });
      }
      // Ahora sí, asegurar el slug público.
      const wasNew = !s.publicSlug;
      if (!s.publicSlug) s.publicSlug = await ensurePublicLink(s.proformaId);
      // Sincronizar en PROFORMAS también
      const rec = PROFORMAS.find((p) => p.proformaId === s.proformaId);
      if (rec) rec.slug = s.publicSlug;

      const url = publicUrl(s.publicSlug);
      const copied = await copyToClipboard(url);
      toast(copied ? `Link copiado · ${url}` : `Link listo · ${url}`, { type: "ok", ms: 7000 });
      if (wasNew) window.open(url, "_blank", "noopener");

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "Copiar link";
      }
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude generar el link", { type: "err" });
      if (btn && original) { btn.disabled = false; btn.innerHTML = original; }
    }
  });
  on(node, "click", "[data-action='wsp']", () => {
    const tel = (s.cliente.telefono || "").replace(/[^\d+]/g, "");
    if (!tel) return toast("Cargá un teléfono primero", { type: "err" });
    const link = s.publicSlug ? publicUrl(s.publicSlug) : "";
    const msg = encodeURIComponent(`Hola ${s.cliente.contacto || ""}, te paso la proforma ${s.numero}: ${s.asunto || ""}.${link ? " " + link : ""}`);
    window.open(`https://wa.me/${tel.replace(/^\+/, "")}?text=${msg}`, "_blank");
  });

  // Cleanup al cambiar de ruta
  return () => ro.disconnect();
};
