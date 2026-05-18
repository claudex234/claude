// Arma el shape `data` que consumen las planillas. Tiene tres adapters
// según la fuente:
//   - fromEditorState  → state interno del generador (productos en memoria)
//   - fromRpcPayload   → payload del RPC público (snake_case)
//   - fromDetail       → fila Supabase + items + cliente (visor de impresión)
//
// Todos producen el MISMO shape, así una sola planilla sirve para los 3
// caminos sin caso especial.
//
// El emisor y los términos pueden venir de tres fuentes (en orden de
// prioridad):
//   1. user_settings.empresa / user_settings.defaults (configurables desde /config)
//   2. Lo que cargó el usuario en el editor (override por proforma, solo terminos)
//   3. EMISOR hardcoded en data/empresa.js (fallback histórico + cuentas/logo)

import { fmtMoney, fmtDate } from "./utils.js";
import { EMISOR, BLOQUES_PANTALLA } from "../data/empresa.js";

const money = (n) => fmtMoney(n).replace("S/ ", "");

// Merge de settings.empresa (snake_case desde DB) con el EMISOR
// hardcoded. La forma camelCase es la que esperan las planillas.
// Campos NO configurables hoy (logoSvg, cuentas, tagline...) salen de
// EMISOR; el resto, si están en settings, sobreescribe.
const buildEmisor = (empresaFromSettings) => {
  const s = empresaFromSettings || {};
  return {
    razonSocial: s.razon_social || EMISOR.razonSocial,
    ruc: s.ruc || EMISOR.ruc,
    direccion: s.direccion || EMISOR.direccion || null,
    telefono: s.telefono || EMISOR.telefono,
    email: s.email || EMISOR.email,
    firmante: s.firmante_nombre || EMISOR.firmante,
    firmanteCargo: s.firmante_cargo || null,
    tagline: EMISOR.tagline,
    subtagline: EMISOR.subtagline,
    ciudad: EMISOR.ciudad,
    logoSvg: EMISOR.logoSvg,
    cuentas: EMISOR.cuentas,
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
// settings = { empresa, defaults } desde CONFIG (loader.js).
export const fromEditorState = (s, PRODUCTOS, totals, settings = {}) => ({
  numero: s.numero,
  fecha: fmtDate(s.emitidaIso),
  emisor: buildEmisor(settings.empresa),
  cliente: {
    razon: s.cliente.razonSocial || "—",
    ruc: s.cliente.ruc,
    contacto: s.cliente.contacto,
    email: s.cliente.email,
    telefono: s.cliente.telefono,
  },
  terminos: buildTerminos(settings.defaults, {
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
// de productos.codigo en cada item. settings = { empresa, defaults }.
export const fromDetail = (detail, settings = {}) => {
  const p = detail.proforma;
  const c = detail.cliente || {};
  return {
    numero: p.numero,
    fecha: fmtDate(p.emitida),
    emisor: buildEmisor(settings.empresa),
    cliente: {
      razon: c.razon_social || "—",
      ruc: c.ruc, contacto: c.contacto, email: c.email, telefono: c.telefono,
    },
    terminos: buildTerminos(settings.defaults),
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
