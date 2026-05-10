// Helpers compartidos por las APIs de Supabase. No exportar directo a
// las páginas — pasan por los módulos especializados (proformas/clientes/skins).
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

// Busca un cliente por RUC (si está) o razón social. Si existe, le hace
// patch a los campos blandos y devuelve su id. Si no, lo crea.
export const findOrCreateCliente = async (userId, { razon_social, ruc, contacto, email, telefono }) => {
  const rs = (razon_social || "").trim();
  if (!rs) throw new Error("Falta el cliente");
  const cleanRuc = (ruc || "").trim();
  let q = supabase.from("clientes").select("id").eq("owner_id", userId);
  q = cleanRuc ? q.eq("ruc", cleanRuc) : q.eq("razon_social", rs);
  const { data, error } = await q.limit(1);
  if (error) throw error;
  if (data && data.length) {
    const id = data[0].id;
    const patch = {};
    if (contacto) patch.contacto = contacto.trim();
    if (email) patch.email = email.trim();
    if (telefono) patch.telefono = telefono.trim();
    if (cleanRuc) patch.ruc = cleanRuc;
    if (Object.keys(patch).length) {
      await supabase.from("clientes").update(patch).eq("id", id);
    }
    return id;
  }
  const { data: ins, error: e2 } = await supabase
    .from("clientes")
    .insert({
      razon_social: rs,
      ruc: cleanRuc || null,
      contacto: contacto?.trim() || null,
      email: email?.trim() || null,
      telefono: telefono?.trim() || null,
      owner_id: userId,
    })
    .select("id")
    .single();
  if (e2) throw e2;
  return ins.id;
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
