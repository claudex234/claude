// Carga inicial desde Supabase. Inyecta los contenedores que viven en
// data/{productos,skins,proformas}. Se llama una vez tras el login.
import { supabase } from "../lib/supabase.js";
import { PRODUCTOS, adaptProducto } from "./productos.js";
import { SKINS, adaptSkin } from "./skins.js";
import { PROFORMAS, adaptProforma } from "./proformas.js";

export const loadAll = async () => {
  const [productosRes, skinsRes, clientesRes, proformasRes, linksRes, itemsRes] = await Promise.all([
    supabase.from("productos").select("*").eq("activo", true).order("precio_default"),
    supabase.from("skins").select("*").order("created_at"),
    // Clientes: solo para resolver razón social en proformas. La app no
    // tiene página de clientes, los clientes se crean implícitos al
    // guardar una proforma (findOrCreateCliente).
    supabase.from("clientes").select("id, razon_social, contacto, ruc, email, telefono"),
    supabase.from("proformas").select("*").order("created_at", { ascending: false }),
    supabase.from("proforma_links").select("proforma_id, slug"),
    supabase.from("proforma_items").select("proforma_id"),
  ]);

  for (const [k, r] of Object.entries({ productos: productosRes, skins: skinsRes, clientes: clientesRes, proformas: proformasRes, links: linksRes, items: itemsRes })) {
    if (r.error) console.error(`${k}:`, r.error);
  }

  // Productos (mapa por código)
  for (const k of Object.keys(PRODUCTOS)) delete PRODUCTOS[k];
  for (const row of productosRes.data || []) PRODUCTOS[row.codigo] = adaptProducto(row);

  // Skins
  SKINS.length = 0;
  for (const row of skinsRes.data || []) SKINS.push(adaptSkin(row));

  // Índices auxiliares para adaptProforma
  const clientesById = new Map();
  for (const row of clientesRes.data || []) clientesById.set(row.id, row);

  const slugByProformaId = new Map();
  for (const row of linksRes.data || []) slugByProformaId.set(row.proforma_id, row.slug);

  const skinCodigoById = new Map();
  for (const row of skinsRes.data || []) skinCodigoById.set(row.id, row.codigo);

  const itemsCountByProforma = new Map();
  for (const row of itemsRes.data || []) {
    itemsCountByProforma.set(row.proforma_id, (itemsCountByProforma.get(row.proforma_id) || 0) + 1);
  }

  // Proformas
  PROFORMAS.length = 0;
  for (const row of proformasRes.data || []) {
    const p = adaptProforma(row, clientesById, slugByProformaId, skinCodigoById);
    p.items = itemsCountByProforma.get(row.id) || 0;
    PROFORMAS.push(p);
  }
};
