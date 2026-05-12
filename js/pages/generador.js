import { fmtMoney, on, escapeHtml as e, el, raw } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { PRODUCTOS } from "../data/productos.js";
import { PROFORMAS, toMemoryProforma } from "../data/proformas.js";
import { navigate } from "../lib/router.js";
import { createProforma, updateProforma, nextNumero, ensurePublicLink, fetchProformaDetail } from "../data/api.js";
import { supabase } from "../lib/supabase.js";
import { toast } from "../lib/toast.js";
import { EMISOR, FORMAS_PAGO } from "../data/empresa.js";
import { parsePaste, PRODUCT_CODES } from "../lib/parser.js";
import { renderPlanilla } from "../lib/planillas.js";
import { SKINS, defaultSkinCodigo } from "../data/skins.js";
import { mountA4Fit } from "../lib/a4_fit.js";
import { fromEditorState } from "../lib/planilla_data.js";
import { createDictation } from "../lib/dictation.js";
import { publicUrl, copyAndToast } from "../lib/share.js";

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

// Renderiza el preview vía la planilla seleccionada. Async porque la
// primera vez se hace fetch del HTML (después la lib lo cachea).
const renderPreview = async (s) => {
  const inner = await renderPlanilla(s.skinCodigo, fromEditorState(s, PRODUCTOS, totals(s.productos)));
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
        ${s.isEdit
          ? `<button class="btn btn-sm btn-primary" data-action="guardar">Guardar cambios</button>`
          : `<button class="btn btn-sm btn-primary btn-link" data-action="generar-link">${s.publicSlug ? "Copiar link" : "Generar link"}</button>`}
      </div>
    </header>

    <div class="gen-split">
      <aside class="gen-editor">
        <section class="gen-section">
          <div class="gen-section-head">
            <span class="gen-section-title">✦ PEGÁ DATOS DEL CLIENTE + PRODUCTO</span>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="gen-section-hint">la última línea = código del producto</span>
              <div class="mic-wave" data-mic-wave aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
              <button type="button" class="btn btn-sm" data-action="mic" title="Dictar (Web Speech, en español)" style="padding:4px 8px;display:flex;align-items:center;gap:4px">
                ${icon("mic", 13)}
              </button>
            </div>
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

  const a4 = mountA4Fit(node.querySelector(".gen-preview"), { paddingX: 48 });
  const fitPreview = a4.update;
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

  // Dictado por voz — delegado a lib/dictation.js. Conecta el botón mic
  // y el wave con el textarea de paste. El target se resuelve lazy
  // porque el dictation toggle puede llamarse antes del primer click.
  const dict = createDictation({
    target: node.querySelector("[data-f='raw']"),
    button: node.querySelector("[data-action='mic']"),
    wave: node.querySelector("[data-mic-wave]"),
  });
  on(node, "click", "[data-action='mic']", () => dict.toggle());

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
  on(node, "click", "[data-action='pdf']", () => {
    if (!s.proformaId || !s.numero || s.numero === "PRF-…") {
      toast("Guardá la proforma primero (Generar link o Enviar)", { type: "err" });
      return;
    }
    const url = `${location.origin}${location.pathname}#/print/${s.numero}`;
    window.open(url, "_blank", "noopener");
  });
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
        PROFORMAS.unshift(toMemoryProforma({
          proforma, slug: null,
          cliente: s.cliente, items: s.productos, total: t.total,
          skinCodigo: s.skinCodigo, asunto: s.asunto,
        }));
      }
      // Ahora sí, asegurar el slug público.
      const wasNew = !s.publicSlug;
      if (!s.publicSlug) s.publicSlug = await ensurePublicLink(s.proformaId);
      // Sincronizar en PROFORMAS también
      const rec = PROFORMAS.find((p) => p.proformaId === s.proformaId);
      if (rec) rec.slug = s.publicSlug;

      const url = publicUrl(s.publicSlug);
      await copyAndToast(url, { ok: "Link copiado", info: "Link listo" });
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
  // Cleanup al cambiar de ruta
  return () => { a4.dispose(); dict.dispose(); };
};
