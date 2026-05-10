// Contenedor mutable. Lo rellena `js/data/loader.js` desde Supabase.
export const PROFORMAS = [];

// Arma el shape que vive en memoria (lo que consumen listado y otros
// componentes) a partir de la fila devuelta por createProforma/updateProforma
// más el contexto del editor (cliente, slug, etc.). Centralizado acá para
// que el generador no tenga que repetir el objeto literal en cada flujo.
export const toMemoryProforma = ({ proforma, slug = null, cliente, items, total, skinCodigo, asunto }) => ({
  id: proforma.numero,
  proformaId: proforma.id,
  slug,
  skinCodigo,
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
  paginas: 0,
  descargas: 0,
  impresiones: 0,
  reenvios: 0,
  giroscopio: false,
  asunto: asunto || "",
});
