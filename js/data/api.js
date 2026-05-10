// Operaciones de escritura sobre Supabase. Las páginas las consumen para
// crear/editar entidades. Las lecturas masivas siguen viviendo en loader.js.
import { supabase } from "../lib/supabase.js";

const requireUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión expirada. Volvé a entrar.");
  return user;
};

const findOrCreateCliente = async (userId, { razon_social, ruc, contacto, email, telefono }) => {
  const rs = (razon_social || "").trim();
  if (!rs) throw new Error("Falta el cliente");
  const cleanRuc = (ruc || "").trim();
  let q = supabase.from("clientes").select("id").eq("owner_id", userId);
  q = cleanRuc ? q.eq("ruc", cleanRuc) : q.eq("razon_social", rs);
  const { data, error } = await q.limit(1);
  if (error) throw error;
  if (data && data.length) {
    const id = data[0].id;
    // Actualizar campos blandos si vinieron datos nuevos
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

const nextNumero = async (userId) => {
  const year = new Date().getFullYear();
  const prefix = `PRF-${year}-`;
  const { data, error } = await supabase
    .from("proformas")
    .select("numero")
    .eq("owner_id", userId)
    .like("numero", `${prefix}%`)
    .order("numero", { ascending: false })
    .limit(1);
  if (error) throw error;
  let n = 1;
  if (data && data.length) {
    const last = parseInt(data[0].numero.slice(prefix.length), 10);
    if (Number.isFinite(last)) n = last + 1;
  }
  return prefix + String(n).padStart(4, "0");
};

const randomSlug = () => {
  const a = new Uint8Array(9);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);
};

const resolveProductoIds = async (codigos) => {
  if (!codigos.length) return {};
  const { data, error } = await supabase
    .from("productos")
    .select("id, codigo")
    .in("codigo", codigos);
  if (error) throw error;
  return Object.fromEntries((data || []).map((p) => [p.codigo, p.id]));
};

export { nextNumero };

// items = [{ qty, modelo, nombre, precio }]
// cliente = { razonSocial, ruc, contacto, email, telefono }
// skinCodigo = "corporate" | "warm" | …
export const createProforma = async ({ estado, cliente, asunto, items, skinCodigo }) => {
  if (!Array.isArray(items) || !items.length) throw new Error("Agregá al menos un ítem");
  const user = await requireUser();
  const cliente_id = await findOrCreateCliente(user.id, {
    razon_social: cliente.razonSocial,
    ruc: cliente.ruc,
    contacto: cliente.contacto,
    email: cliente.email,
    telefono: cliente.telefono,
  });
  const numero = await nextNumero(user.id);

  const subtotal = items.reduce((a, it) => a + it.qty * it.precio, 0);
  const igv = +(subtotal * 0.18).toFixed(2);
  const total = +(subtotal + igv).toFixed(2);

  // Resolver el codigo de planilla → uuid de skin (FK).
  let skin_id = null;
  if (skinCodigo) {
    const { data: skinRow } = await supabase
      .from("skins").select("id").eq("codigo", skinCodigo).limit(1).maybeSingle();
    skin_id = skinRow?.id || null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const validez = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const { data: prof, error } = await supabase
    .from("proformas")
    .insert({
      numero, cliente_id, asunto: asunto || null, estado,
      emitida: today, validez,
      subtotal, igv, total, moneda: "PEN",
      skin_id,
      owner_id: user.id,
    })
    .select()
    .single();
  if (error) throw error;

  const codes = [...new Set(items.map((i) => i.modelo).filter(Boolean))];
  const productoIds = await resolveProductoIds(codes);

  const itemRows = items.map((it, i) => ({
    proforma_id: prof.id,
    producto_id: productoIds[it.modelo] || null,
    qty: it.qty,
    descripcion: it.nombre,
    precio_unit: it.precio,
    total: it.qty * it.precio,
    posicion: i,
  }));
  const { error: e2 } = await supabase.from("proforma_items").insert(itemRows);
  if (e2) throw e2;

  let slug = null;
  if (estado === "enviada") {
    slug = randomSlug();
    const { error: e3 } = await supabase
      .from("proforma_links")
      .insert({ proforma_id: prof.id, slug });
    if (e3) throw e3;
  }

  return { proforma: prof, slug, totals: { subtotal, igv, total } };
};

// Devuelve el slug público existente, o crea uno si no existe.
export const ensurePublicLink = async (proformaId) => {
  if (!proformaId) throw new Error("Falta proformaId");
  const { data: existing, error: e1 } = await supabase
    .from("proforma_links")
    .select("slug")
    .eq("proforma_id", proformaId)
    .limit(1);
  if (e1) throw e1;
  if (existing && existing.length) return existing[0].slug;

  const slug = randomSlug();
  const { error: e2 } = await supabase
    .from("proforma_links")
    .insert({ proforma_id: proformaId, slug });
  if (e2) throw e2;
  return slug;
};

// === Detalle de proforma ==============================================

// Trae todo lo necesario para la vista de detalle: la proforma, el cliente,
// los items, el slug público (si existe) y el código de skin.
// Acepta tanto el `numero` (PRF-2026-0001) como el uuid.
export const fetchProformaDetail = async (idOrNumero) => {
  if (!idOrNumero) throw new Error("Falta id");
  const isUuid = /^[0-9a-f-]{30,}$/i.test(idOrNumero);
  const col = isUuid ? "id" : "numero";
  const { data: prof, error } = await supabase
    .from("proformas")
    .select("*")
    .eq(col, idOrNumero)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!prof) return null;

  const [clienteRes, itemsRes, linkRes, skinRes] = await Promise.all([
    prof.cliente_id
      ? supabase.from("clientes").select("*").eq("id", prof.cliente_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("proforma_items").select("*").eq("proforma_id", prof.id).order("posicion"),
    supabase.from("proforma_links").select("slug").eq("proforma_id", prof.id).limit(1),
    prof.skin_id
      ? supabase.from("skins").select("codigo, nombre").eq("id", prof.skin_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    proforma: prof,
    cliente: clienteRes.data || null,
    items: itemsRes.data || [],
    slug: linkRes.data?.[0]?.slug || null,
    skin: skinRes.data || null,
  };
};

// === Skins / Planillas ================================================

// `activa` se gestiona aparte vía setDefaultSkin para evitar dos defaults
// simultáneos. Acá solo guardamos contenido y metadata.
export const upsertSkin = async ({ id, codigo, nombre, descripcion, html, css }) => {
  const payload = {
    codigo, nombre,
    descripcion: descripcion || null,
    html: html || null,
    css: css || null,
  };
  if (id) {
    const { data, error } = await supabase.from("skins").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("skins").insert(payload).select().single();
  if (error) throw error;
  return data;
};

export const deleteSkin = async (id) => {
  const { error } = await supabase.from("skins").delete().eq("id", id);
  if (error) throw error;
};

export const setDefaultSkin = async (id) => {
  // Solo una activa a la vez. Primero limpiamos las otras y recién después
  // marcamos la nueva — el orden importa para no quedar con dos activas a
  // la vez ni en una ventana breve.
  const { error: e1 } = await supabase.from("skins").update({ activa: false }).neq("id", id);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("skins").update({ activa: true }).eq("id", id);
  if (e2) throw e2;
};

export const fetchSkins = async () => {
  const { data, error } = await supabase.from("skins").select("*").order("created_at");
  if (error) throw error;
  return data || [];
};
