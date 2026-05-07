// Carga datos desde Supabase y los inyecta en los contenedores compartidos
// (PRODUCTOS, SKINS, PROFORMAS, etc.). Se llama una vez tras el login.
import { supabase } from "../lib/supabase.js";
import { PRODUCTOS, SKINS, PROFORMAS_PRODUCTOS, FALLBACK_IMAGE } from "./productos.js";
import { PROFORMAS } from "./proformas.js";
import { TEMPLATES, METRICS } from "./metrics.js";

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

const adaptSkin = (row) => ({
  id: row.codigo,
  nombre: row.nombre,
  desc: row.descripcion || "",
  cover: row.cover || {},
  activa: !!row.activa,
  uso: 0,
});

const adaptTemplate = (row) => ({
  id: row.id,
  nombre: row.nombre,
  uso: row.uso || 0,
  default: !!row.is_default,
  items: Array.isArray(row.items) ? row.items.length : (row.items || 0),
});

const adaptProforma = (row, clientesById) => {
  const c = row.cliente_id ? clientesById.get(row.cliente_id) : null;
  return {
    id: row.numero,
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
  const [productosRes, skinsRes, plantillasRes, clientesRes, proformasRes] = await Promise.all([
    supabase.from("productos").select("*").eq("activo", true).order("precio_default"),
    supabase.from("skins").select("*").order("created_at"),
    supabase.from("plantillas").select("*").order("created_at"),
    supabase.from("clientes").select("*"),
    supabase.from("proformas").select("*").order("created_at", { ascending: false }),
  ]);

  if (productosRes.error) console.error("productos:", productosRes.error);
  if (skinsRes.error) console.error("skins:", skinsRes.error);
  if (plantillasRes.error) console.error("plantillas:", plantillasRes.error);
  if (clientesRes.error) console.error("clientes:", clientesRes.error);
  if (proformasRes.error) console.error("proformas:", proformasRes.error);

  // Productos: mapa por código
  for (const k of Object.keys(PRODUCTOS)) delete PRODUCTOS[k];
  for (const row of productosRes.data || []) {
    PRODUCTOS[row.codigo] = adaptProducto(row);
  }

  // Skins
  SKINS.length = 0;
  for (const row of skinsRes.data || []) SKINS.push(adaptSkin(row));

  // Plantillas
  TEMPLATES.length = 0;
  for (const row of plantillasRes.data || []) TEMPLATES.push(adaptTemplate(row));

  // Clientes (para resolver razón social en proformas)
  const clientesById = new Map();
  for (const row of clientesRes.data || []) clientesById.set(row.id, row);

  // Proformas
  PROFORMAS.length = 0;
  for (const k of Object.keys(PROFORMAS_PRODUCTOS)) delete PROFORMAS_PRODUCTOS[k];
  for (const row of proformasRes.data || []) {
    PROFORMAS.push(adaptProforma(row, clientesById));
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
