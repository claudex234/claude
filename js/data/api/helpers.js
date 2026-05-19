// Helpers compartidos por las APIs de Supabase. No exportar directo a
// las páginas — pasan por los módulos especializados.
import { supabase } from "../../lib/supabase.js";

export const requireUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión expirada. Volvé a entrar.");
  return user;
};

// Slug aleatorio corto y URL-safe para los links públicos.
export const randomSlug = () => {
  const a = new Uint8Array(9);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);
};

// Busca un cliente por RUC (si está) o razón social. Si existe, devuelve
// su id; si no, lo crea.
//
// Antes hacía SELECT → INSERT en cliente con race condition: dos
// guardados concurrentes con mismo RUC duplicaban el cliente. Ahora la
// RPC usa ON CONFLICT atómico contra el unique index parcial
// clientes_owner_ruc_uq.
//
// _userId queda por compatibilidad de firma — la RPC resuelve owner_id
// via auth.uid().
// eslint-disable-next-line no-unused-vars
export const findOrCreateCliente = async (_userId, { razon_social, ruc, contacto, email, telefono }) => {
  const { data, error } = await supabase.rpc("find_or_create_cliente", {
    p_razon_social: razon_social || "",
    p_ruc: ruc || null,
    p_contacto: contacto || null,
    p_email: email || null,
    p_telefono: telefono || null,
  });
  if (error) throw error;
  return data;
};

// codigo (string) → uuid (de tabla productos), para escribir items.
export const resolveProductoIds = async (codigos) => {
  if (!codigos.length) return {};
  const { data, error } = await supabase
    .from("productos")
    .select("id, codigo")
    .in("codigo", codigos);
  if (error) throw error;
  return Object.fromEntries((data || []).map((p) => [p.codigo, p.id]));
};

// Subtotal/IGV/total para una lista de items {qty, precio}.
export const computeTotals = (items) => {
  const subtotal = items.reduce((a, it) => a + it.qty * it.precio, 0);
  const igv = +(subtotal * 0.18).toFixed(2);
  const total = +(subtotal + igv).toFixed(2);
  return { subtotal, igv, total };
};

// codigo de planilla → uuid del skin (FK). Devuelve null si no se encuentra.
export const resolveSkinId = async (codigo) => {
  if (!codigo) return null;
  const { data } = await supabase
    .from("skins").select("id").eq("codigo", codigo).limit(1).maybeSingle();
  return data?.id || null;
};
