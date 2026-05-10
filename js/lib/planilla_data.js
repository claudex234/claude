// Arma el shape `data` que consumen las planillas. Tiene tres adapters
// según la fuente:
//   - fromEditorState  → state interno del generador (productos en memoria)
//   - fromRpcPayload   → payload del RPC público (snake_case)
//   - fromDetail       → fila Supabase + items + cliente (visor de impresión)
//
// Todos producen el MISMO shape, así una sola planilla sirve para los 3
// caminos sin caso especial.

import { fmtMoney, fmtDate } from "./utils.js";
import { EMISOR, BLOQUES_PANTALLA } from "../data/empresa.js";

const money = (n) => fmtMoney(n).replace("S/ ", "");

const baseTerminos = (override = {}) => ({
  tiempoEntrega: override.tiempoEntrega || EMISOR.defaults.tiempoEntrega,
  lugarEntrega: override.lugarEntrega || EMISOR.defaults.lugarEntrega,
  garantia: override.garantia || EMISOR.defaults.garantia,
  validez: override.validez ?? 15,
  condiciones: override.condiciones || EMISOR.defaults.condiciones,
});

const baseBloques = () => ({
  servicios: BLOQUES_PANTALLA.servicios,
  noIncluido: BLOQUES_PANTALLA.noIncluido,
});

// Para el editor (PRODUCTOS catálogo en memoria, totales sobre la marcha).
export const fromEditorState = (s, PRODUCTOS, totals) => ({
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
  terminos: baseTerminos({
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
export const fromRpcPayload = (payload) => {
  const p = payload.proforma;
  const c = payload.cliente || {};
  return {
    numero: p.numero,
    fecha: fmtDate(p.emitida),
    emisor: EMISOR,
    cliente: {
      razon: c.razon_social || "—",
      ruc: c.ruc, contacto: c.contacto, email: c.email, telefono: c.telefono,
    },
    terminos: baseTerminos(),
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
// de productos.codigo en cada item.
export const fromDetail = (detail) => {
  const p = detail.proforma;
  const c = detail.cliente || {};
  return {
    numero: p.numero,
    fecha: fmtDate(p.emitida),
    emisor: EMISOR,
    cliente: {
      razon: c.razon_social || "—",
      ruc: c.ruc, contacto: c.contacto, email: c.email, telefono: c.telefono,
    },
    terminos: baseTerminos(),
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
