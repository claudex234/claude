// Carga datos desde Supabase y los inyecta en los contenedores compartidos
// (PRODUCTOS, SKINS, PROFORMAS). Se llama una vez tras el login.
import { supabase } from "../lib/supabase.js";
import { PRODUCTOS, PROFORMAS_PRODUCTOS, FALLBACK_IMAGE } from "./productos.js";
import { SKINS } from "./skins.js";
import { PROFORMAS } from "./proformas.js";
import { METRICS } from "./metrics.js";

const adaptProducto = (row) => ({
  codigo: row.codigo,
  nombre: row.nombre,
  tamano: row.tamano || "",
  precioDefault: Number(row.precio_default) || 0,
  tipo: row.tipo || "pantalla",
  imagen: row.imagen_url || FALLBACK_IMAGE,
  specsHighlight: row.specs_highlight || [],
  specs: row.specs || [],
  incluye: row.incluye || [],
});

// Skin (planilla). Conserva tanto el uuid (id) como el codigo (clave que
// usa el resto de la app). html y css son los archivos del template
// guardados en DB; pueden ser null y caer al fallback de archivos.
const adaptSkin = (row) => ({
  id: row.id,
  codigo: row.codigo,
  nombre: row.nombre,
  desc: row.descripcion || "",
  cover: row.cover || {},
  activa: !!row.activa,
  html: row.html || null,
  css: row.css || null,
  uso: 0,
});

const adaptProforma = (row, clientesById, slugByProformaId, skinCodigoById) => {
  const c = row.cliente_id ? clientesById.get(row.cliente_id) : null;
  return {
    id: row.numero,
    proformaId: row.id,
    slug: slugByProformaId.get(row.id) || null,
    skinCodigo: skinCodigoById.get(row.skin_id) || "corporate",
    cliente: c?.razon_social || "—",
    contacto: c?.contacto || "",
    cargo: c?.cargo || "",
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
    paginas: 0,
    descargas: 0,
    impresiones: 0,
    reenvios: 0,
    giroscopio: false,
    asunto: row.asunto || "",
  };
};

export const loadAll = async () => {
  const [productosRes, skinsRes, clientesRes, proformasRes, linksRes] = await Promise.all([
    supabase.from("productos").select("*").eq("activo", true).order("precio_default"),
    supabase.from("skins").select("*").order("created_at"),
    supabase.from("clientes").select("*"),
    supabase.from("proformas").select("*").order("created_at", { ascending: false }),
    supabase.from("proforma_links").select("proforma_id, slug"),
  ]);

  if (productosRes.error) console.error("productos:", productosRes.error);
  if (skinsRes.error) console.error("skins:", skinsRes.error);
  if (clientesRes.error) console.error("clientes:", clientesRes.error);
  if (proformasRes.error) console.error("proformas:", proformasRes.error);
  if (linksRes.error) console.error("links:", linksRes.error);

  // Productos: mapa por código
  for (const k of Object.keys(PRODUCTOS)) delete PRODUCTOS[k];
  for (const row of productosRes.data || []) {
    PRODUCTOS[row.codigo] = adaptProducto(row);
  }

  // Skins
  SKINS.length = 0;
  for (const row of skinsRes.data || []) SKINS.push(adaptSkin(row));

  // Clientes (para resolver razón social en proformas)
  const clientesById = new Map();
  for (const row of clientesRes.data || []) clientesById.set(row.id, row);

  // Slugs públicos por proforma
  const slugByProformaId = new Map();
  for (const row of linksRes.data || []) slugByProformaId.set(row.proforma_id, row.slug);

  // Map skin_id (uuid) → codigo (text) para que cada proforma sepa qué planilla usa
  const skinCodigoById = new Map();
  for (const row of skinsRes.data || []) skinCodigoById.set(row.id, row.codigo);

  // Proformas
  PROFORMAS.length = 0;
  for (const k of Object.keys(PROFORMAS_PRODUCTOS)) delete PROFORMAS_PRODUCTOS[k];
  for (const row of proformasRes.data || []) {
    PROFORMAS.push(adaptProforma(row, clientesById, slugByProformaId, skinCodigoById));
  }

  // Métricas mínimas calculadas del lado cliente
  const enviadas = PROFORMAS.filter((p) => p.estado !== "borrador").length;
  const vistas = PROFORMAS.filter((p) => ["vista", "aceptada"].includes(p.estado)).length;
  METRICS.enviadasMes = enviadas;
  METRICS.vistasMes = vistas;
  METRICS.tasaApertura = enviadas ? Math.round((vistas / enviadas) * 100) : 0;
  METRICS.montoEnviado = PROFORMAS.reduce((a, p) => a + (p.estado !== "borrador" ? p.monto : 0), 0);
  METRICS.montoVisto = PROFORMAS.reduce((a, p) => a + (["vista", "aceptada"].includes(p.estado) ? p.monto : 0), 0);
};
