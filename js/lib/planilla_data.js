// Arma el shape `data` que consumen las planillas. Tiene tres adapters
// según la fuente:
//   - fromEditorState  → state interno del generador (productos en memoria)
//   - fromRpcPayload   → payload del RPC público (snake_case)
//   - fromDetail       → fila Supabase + items + cliente (visor de impresión)
//
// Todos producen el MISMO shape, así una sola planilla sirve para los 3
// caminos sin caso especial.
//
// Emisor: viene del objeto empresa elegido para esa proforma (tabla
// `empresas`). Si no hay empresa asignada/cargada, fallback a EMISOR
// hardcoded (data/empresa.js). Cada empresa tiene su propio logo,
// razón social, RUC y cuentas bancarias.
// Términos: settings.defaults del usuario (globales, no por empresa),
// con overrides per-proforma del editor.

import { fmtMoney, fmtDate } from "./utils.js";
import { EMISOR, BLOQUES_PANTALLA } from "../data/empresa.js";

const money = (n) => fmtMoney(n).replace("S/ ", "");

// Merge del objeto empresa (snake_case desde DB / RPC) con el EMISOR
// hardcoded como último fallback. La forma camelCase es la que esperan
// las planillas. El logo puede venir como SVG inline (logo_svg) o como
// URL de Storage (logo_url); unificamos a `logoSvg` con un <img> en el
// segundo caso para que los templates no cambien.
const logoHtml = (s) => {
  if (s.logo_svg) return s.logo_svg;
  if (s.logo_url) return `<img src="${s.logo_url}" alt="logo" style="max-width:100%;max-height:100%;object-fit:contain">`;
  return EMISOR.logoSvg;
};

const buildEmisor = (empresa) => {
  const s = empresa || {};
  const cuentas = Array.isArray(s.cuentas) && s.cuentas.length ? s.cuentas : EMISOR.cuentas;
  return {
    razonSocial: s.razon_social || EMISOR.razonSocial,
    ruc: s.ruc || EMISOR.ruc,
    direccion: s.direccion || EMISOR.direccion || null,
    telefono: s.telefono || EMISOR.telefono,
    email: s.email || EMISOR.email,
    firmante: s.firmante_nombre || EMISOR.firmante,
    firmanteCargo: s.firmante_cargo || null,
    tagline: s.tagline || EMISOR.tagline,
    subtagline: s.subtagline || EMISOR.subtagline,
    ciudad: s.ciudad || EMISOR.ciudad,
    logoSvg: logoHtml(s),
    cuentas,
  };
};

// Términos: settings.defaults como base, perProforma como override.
const buildTerminos = (defaultsFromSettings, perProforma = {}) => {
  const d = defaultsFromSettings || {};
  return {
    tiempoEntrega: perProforma.tiempoEntrega || d.tiempo_entrega || EMISOR.defaults.tiempoEntrega,
    lugarEntrega: perProforma.lugarEntrega || d.lugar_entrega || EMISOR.defaults.lugarEntrega,
    garantia: perProforma.garantia || d.garantia || EMISOR.defaults.garantia,
    validez: perProforma.validez ?? d.validez_dias ?? 15,
    condiciones: perProforma.condiciones || d.condiciones || EMISOR.defaults.condiciones,
  };
};

const baseBloques = () => ({
  servicios: BLOQUES_PANTALLA.servicios,
  noIncluido: BLOQUES_PANTALLA.noIncluido,
});

// Para el editor (PRODUCTOS catálogo en memoria, totales sobre la marcha).
// ctx = { empresa, defaults }. `empresa` es el objeto completo elegido
// para esta proforma (desde EMPRESAS). `defaults` viene de CONFIG.
export const fromEditorState = (s, PRODUCTOS, totals, ctx = {}) => ({
  numero: s.numero,
  fecha: fmtDate(s.emitidaIso),
  emisor: buildEmisor(ctx.empresa),
  cliente: {
    razon: s.cliente.razonSocial || "—",
    ruc: s.cliente.ruc,
    contacto: s.cliente.contacto,
    email: s.cliente.email,
    telefono: s.cliente.telefono,
  },
  terminos: buildTerminos(ctx.defaults, {
    tiempoEntrega: s.terminos.tiempoEntrega,
    validez: s.terminos.validez,
  }),
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
    subtotal: money(totals.subtotal),
    igv: money(totals.igv),
    total: money(totals.total),
  },
  showBloques: s.productos.length > 0,
  bloques: baseBloques(),
});

// Para el visor público — recibe el payload del RPC (snake_case).
// El RPC ahora incluye `empresa` y `defaults` del owner.
export const fromRpcPayload = (payload) => {
  const p = payload.proforma;
  const c = payload.cliente || {};
  return {
    numero: p.numero,
    fecha: fmtDate(p.emitida),
    emisor: buildEmisor(payload.empresa),
    cliente: {
      razon: c.razon_social || "—",
      ruc: c.ruc, contacto: c.contacto, email: c.email, telefono: c.telefono,
    },
    terminos: buildTerminos(payload.defaults),
    items: (payload.items || []).map((it) => {
      const ref = it.producto || {};
      return {
        qty: it.qty,
        precio: money(it.precio_unit),
        total: money(it.total),
        nombre: it.descripcion || ref.nombre || "",
        codigo: ref.codigo || "",
        imagen: ref.imagen || "",
        specs: ref.specs || [],
        specsHighlight: ref.specs_highlight || [],
        incluye: ref.incluye || [],
      };
    }),
    totales: {
      subtotal: money(p.subtotal),
      igv: money(p.igv),
      total: money(p.total),
    },
    showBloques: (payload.items || []).length > 0,
    bloques: baseBloques(),
  };
};

// Para la vista de impresión interna — fetchProformaDetail con embed
// de productos.codigo y empresas(*) en el detail. ctx = { defaults }.
export const fromDetail = (detail, ctx = {}) => {
  const p = detail.proforma;
  const c = detail.cliente || {};
  return {
    numero: p.numero,
    fecha: fmtDate(p.emitida),
    emisor: buildEmisor(detail.empresa),
    cliente: {
      razon: c.razon_social || "—",
      ruc: c.ruc, contacto: c.contacto, email: c.email, telefono: c.telefono,
    },
    terminos: buildTerminos(ctx.defaults),
    items: (detail.items || []).map((it) => ({
      qty: it.qty,
      precio: money(it.precio_unit),
      total: money(it.total),
      nombre: it.descripcion || "",
      codigo: it.productos?.codigo || "",
      imagen: "",
      specs: [],
      specsHighlight: [],
      incluye: [],
    })),
    totales: {
      subtotal: money(p.subtotal),
      igv: money(p.igv),
      total: money(p.total),
    },
    showBloques: (detail.items || []).length > 0,
    bloques: baseBloques(),
  };
};
