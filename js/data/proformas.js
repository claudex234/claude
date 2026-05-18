// Contenedor mutable. Lo rellena `js/data/loader.js` desde Supabase.
export const PROFORMAS = [];

// Fila de la tabla `proformas` (+ índices auxiliares) → shape de memoria
// que consume el listado y el resto de la app. Los campos de tracking
// quedan en cero hasta que se cablee proforma_aperturas.
export const adaptProforma = (row, clientesById, slugByProformaId, skinCodigoById) => {
  const c = row.cliente_id ? clientesById.get(row.cliente_id) : null;
  return {
    id: row.numero,
    proformaId: row.id,
    slug: slugByProformaId.get(row.id) || null,
    skinCodigo: skinCodigoById.get(row.skin_id) || "corporate",
    empresaId: row.empresa_id || null,
    cliente: c?.razon_social || "—",
    contacto: c?.contacto || "",
    ruc: c?.ruc || "",
    email: c?.email || "",
    telefono: c?.telefono || "",
    monto: Number(row.total) || 0,
    moneda: row.moneda || "PEN",
    items: 0,
    emitida: row.emitida || "",
    validez: row.validez || "",
    estado: row.estado || "borrador",
    aperturas: 0,
    tiempoTotal: 0,
    ultimaVista: "—",
    asunto: row.asunto || "",
  };
};

// Arma el shape que vive en memoria (lo que consumen listado y otros
// componentes) a partir de la fila devuelta por createProforma/updateProforma
// más el contexto del editor (cliente, slug, etc.). Centralizado acá para
// que el generador no tenga que repetir el objeto literal en cada flujo.
export const toMemoryProforma = ({ proforma, slug = null, cliente, items, total, skinCodigo, asunto }) => ({
  id: proforma.numero,
  proformaId: proforma.id,
  slug,
  skinCodigo,
  empresaId: proforma.empresa_id || null,
  cliente: cliente.razonSocial,
  contacto: cliente.contacto,
  ruc: cliente.ruc,
  email: cliente.email,
  telefono: cliente.telefono,
  monto: total,
  moneda: "PEN",
  items: Array.isArray(items) ? items.length : (items || 0),
  emitida: proforma.emitida,
  validez: proforma.validez,
  estado: proforma.estado,
  aperturas: 0,
  tiempoTotal: 0,
  ultimaVista: "—",
  asunto: asunto || "",
});
