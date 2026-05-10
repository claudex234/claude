import { fmtMoney, on, escapeHtml as e, el } from "../lib/utils.js";
import { PRODUCTOS } from "../data/productos.js";
import { PROFORMAS } from "../data/proformas.js";
import { navigate } from "../lib/router.js";
import { createProforma, updateProforma, nextNumero, ensurePublicLink, fetchProformaDetail } from "../data/api.js";
import { supabase } from "../lib/supabase.js";
import { toast } from "../lib/toast.js";
import { EMISOR, FORMAS_PAGO, BLOQUES_PANTALLA } from "../data/empresa.js";
import { parsePaste, PRODUCT_CODES } from "../lib/parser.js";
import { renderPlanilla } from "../lib/planillas.js";
import { SKINS, defaultSkinCodigo } from "../data/skins.js";

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
  skinCodigo: defaultSkinCodigo(),
  emitidaIso: new Date().toISOString().slice(0, 10),
  isEdit: false,
});

const totals = (productos) => {
  const subtotal = productos.reduce((a, p) => a + p.qty * p.precio, 0);
  const igv = +(subtotal * 0.18).toFixed(2);
  return { subtotal, igv, total: +(subtotal + igv).toFixed(2) };
};

// ====== Preview (hoja A4) ======
// Construye el shape `data` que consumen las planillas (ver
// /planillas/<codigo>/index.html para los tokens disponibles).
const buildData = (s) => {
  const t = totals(s.productos);
  return {
    numero: s.numero,
    fecha: fmtDate(s.emitidaIso),
    emisor: EMISOR,
    cliente: {
      razon: s.cliente.razonSocial || "—",
      ruc: s.cliente.ruc,
      contacto: s.cliente.contacto,
      email: s.cliente.email,
      telefono: s.cliente.telefono,
    },
    terminos: {
      tiempoEntrega: s.terminos.tiempoEntrega,
      lugarEntrega: EMISOR.defaults.lugarEntrega,
      garantia: EMISOR.defaults.garantia,
      validez: s.terminos.validez,
      condiciones: EMISOR.defaults.condiciones,
    },
    items: s.productos.map((p) => {
      const ref = PRODUCTOS[p.modelo] || {};
      return {
        qty: p.qty,
        precio: money(p.precio),
        total: money(p.qty * p.precio),
        nombre: p.nombre,
        codigo: ref.codigo || p.modelo,
        imagen: ref.imagen,
        specs: ref.specs || [],
        specsHighlight: ref.specsHighlight || [],
        incluye: ref.incluye || [],
      };
    }),
    totales: {
      subtotal: money(t.subtotal),
      igv: money(t.igv),
      total: money(t.total),
    },
    showBloques: s.productos.length > 0,
    bloques: {
      servicios: BLOQUES_PANTALLA.servicios,
      noIncluido: BLOQUES_PANTALLA.noIncluido,
    },
  };
};

// Renderiza el preview vía la planilla seleccionada. Async porque la
// primera vez se hace fetch del HTML (después la lib lo cachea).
const renderPreview = async (s) => {
  const inner = await renderPlanilla(s.skinCodigo, buildData(s));
  return `<div class="pv-doc"><article class="pv-page">${inner}</article></div>`;
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
        <button class="btn btn-sm" data-action="pdf">PDF</button>
        <button class="btn btn-sm btn-link" data-action="generar-link">${s.publicSlug ? "Copiar link" : "Generar link"}</button>
        <button class="btn btn-sm btn-wsp" data-action="wsp">WhatsApp</button>
        ${s.isEdit
          ? `<button class="btn btn-sm btn-primary" data-action="guardar">Guardar cambios</button>`
          : `<button class="btn btn-sm btn-primary" data-action="enviar">Enviar al cliente</button>`}
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

        <section class="gen-section">
          <div class="gen-section-title">PLANILLA</div>
          <div class="gen-form">
            <label class="gen-field gen-field-full"><span>Skin del PDF</span>
              <select class="input" data-f="skinCodigo">
                ${SKINS.map((sk) =>
                  `<option value="${e(sk.codigo)}"${sk.codigo === s.skinCodigo ? " selected" : ""}>${e(sk.nombre)} · ${e(sk.codigo)}</option>`
                ).join("")}
              </select>
            </label>
          </div>
          <div class="gen-section-hint" style="margin-top:6px">
            Para crear, editar o subir nuevas planillas: tab <b>Plantillas</b>.
          </div>
        </section>
      </aside>

      <main class="gen-preview" data-preview><div class="pv-fit"><div class="pv-doc"><article class="pv-page" style="padding:60px;color:#999">Cargando planilla…</article></div></div></main>
    </div>
  </div>`;

// ====== Mount ======
export const render = (root, ctx) => {
  const s = initialState();
  const editId = ctx?.params?.[0] || null;

  if (editId) {
    s.isEdit = true;
    s.numero = editId; // placeholder hasta cargar
    s.asunto = "";
  }

  // Próximo número (sólo en alta) — no bloquea.
  if (!s.isEdit) {
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
  }

  const node = el(renderEditor(s));
  root.appendChild(node);

  // En modo edición: traer la proforma y rellenar el form.
  if (s.isEdit) {
    (async () => {
      try {
        const detail = await fetchProformaDetail(editId);
        if (!detail) {
          toast(`No existe ${editId}`, { type: "err" });
          navigate("proformas");
          return;
        }
        const p = detail.proforma;
        const c = detail.cliente || {};
        s.proformaId = p.id;
        s.numero = p.numero;
        s.estado = p.estado || "borrador";
        s.asunto = p.asunto || "";
        s.publicSlug = detail.slug || null;
        s.skinCodigo = detail.skin?.codigo || defaultSkinCodigo();
        s.emitidaIso = p.emitida || s.emitidaIso;
        s.cliente = {
          razonSocial: c.razon_social || "",
          ruc: c.ruc || "",
          contacto: c.contacto || "",
          email: c.email || "",
          telefono: c.telefono || "",
        };
        s.rucSeguro = /^20\d{9}$/.test((c.ruc || "").trim());
        s.productos = (detail.items || []).map((it) => {
          const code = it.productos?.codigo || "";
          const ref = PRODUCTOS[code] || {};
          return {
            modelo: code,
            qty: Number(it.qty) || 1,
            precio: Number(it.precio_unit) || 0,
            nombre: it.descripcion || ref.nombre || "",
          };
        });

        // Rehidratar todos los inputs visibles que dependen del state.
        const setVal = (sel, val) => {
          const i = node.querySelector(sel);
          if (i) i.value = val;
        };
        setVal(`[data-f='asunto']`, s.asunto);
        ["razonSocial", "ruc", "contacto", "email", "telefono"].forEach((k) => {
          setVal(`[data-f='${k}']`, s.cliente[k]);
        });
        setVal(`[data-f='skinCodigo']`, s.skinCodigo);
        const meta = node.querySelector(".gen-bar-meta .mono");
        if (meta) meta.textContent = s.numero;
        const status = node.querySelector(".gen-bar-meta .status");
        if (status) {
          status.textContent = s.estado;
          status.className = `status status-${s.estado}`;
        }
        refreshAll();
      } catch (err) {
        console.error("[generador edit]", err);
        toast(err.message || "No pude cargar la proforma", { type: "err" });
      }
    })();
  }

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
  // Primer render asíncrono después de pintar el placeholder.
  requestAnimationFrame(() => { refreshPreview(); });

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

  const refreshPreview = async () => {
    const fit = node.querySelector(".pv-fit");
    if (!fit) return;
    try {
      fit.innerHTML = await renderPreview(s);
    } catch (err) {
      fit.innerHTML = `<div style="padding:24px;color:#a30b29;font-size:12px">Error en la planilla: ${e(err.message || err)}</div>`;
    }
    fitPreview();
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
    else if (f === "skinCodigo") s.skinCodigo = v;
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
        skinCodigo: s.skinCodigo,
      });
      PROFORMAS.unshift({
        id: proforma.numero,
        proformaId: proforma.id,
        slug: slug || null,
        skinCodigo: s.skinCodigo,
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
  on(node, "click", "[data-action='guardar']", async (ev) => {
    if (!validate()) return;
    if (!s.proformaId) { toast("Esperá a que cargue la proforma", { type: "err" }); return; }
    const btns = node.querySelectorAll("[data-action]");
    btns.forEach((b) => (b.disabled = true));
    const btn = ev.target.closest("button");
    const original = btn?.innerHTML;
    if (btn) btn.textContent = "Guardando…";
    try {
      const { proforma, totals: t } = await updateProforma(s.proformaId, {
        cliente: s.cliente,
        asunto: s.asunto,
        items: s.productos,
        skinCodigo: s.skinCodigo,
      });
      // Sincronizar PROFORMAS en memoria
      const rec = PROFORMAS.find((p) => p.proformaId === s.proformaId);
      if (rec) {
        rec.cliente = s.cliente.razonSocial;
        rec.contacto = s.cliente.contacto;
        rec.ruc = s.cliente.ruc;
        rec.email = s.cliente.email;
        rec.telefono = s.cliente.telefono;
        rec.monto = t.total;
        rec.items = s.productos.length;
        rec.asunto = s.asunto;
        rec.skinCodigo = s.skinCodigo;
        rec.estado = proforma.estado;
      }
      toast(`${proforma.numero} actualizada`, { type: "ok" });
      navigate("detalle/" + proforma.numero);
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude guardar", { type: "err" });
      btns.forEach((b) => (b.disabled = false));
      if (btn && original) btn.innerHTML = original;
    }
  });
  on(node, "click", "[data-action='pdf']", () => toast("Export a PDF — próximamente", { type: "info" }));
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
          skinCodigo: s.skinCodigo,
        });
        s.proformaId = proforma.id;
        s.numero = proforma.numero;
        s.publicSlug = slug || null;
        // Reflejar en la barra y el listado
        const m = node.querySelector(".gen-bar-meta .mono");
        if (m) m.textContent = s.numero;
        PROFORMAS.unshift({
          id: proforma.numero, proformaId: proforma.id, slug: null,
          skinCodigo: s.skinCodigo,
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
