// API de proformas: alta, edición, link público, fetch de detalle.
// Uso: import { createProforma, ... } from "../data/api.js"; (barrel)
import { supabase } from "../../lib/supabase.js";
import {
  requireUser, randomSlug, findOrCreateCliente,
  resolveProductoIds, resolveSkinId, computeTotals,
} from "./helpers.js";

// Próximo correlativo PRF-YYYY-NNNN para el usuario actual.
// Antes calculaba SELECT max() + 1 en cliente → race condition con dos
// pestañas guardando concurrente (unique violation crash). Ahora la
// RPC usa una tabla counter con UPDATE atómico.
// El param userId queda por compatibilidad — la RPC lo resuelve via auth.uid().
// eslint-disable-next-line no-unused-vars
export const nextNumero = async (_userId) => {
  const { data, error } = await supabase.rpc("next_proforma_numero");
  if (error) throw error;
  return data;
};

const buildItemRows = (proformaId, items, productoIds) =>
  items.map((it, i) => ({
    proforma_id: proformaId,
    producto_id: productoIds[it.modelo] || null,
    qty: it.qty,
    descripcion: it.nombre,
    precio_unit: it.precio,
    total: it.qty * it.precio,
    posicion: i,
  }));

// items = [{ qty, modelo, nombre, precio }]
// cliente = { razonSocial, ruc, contacto, email, telefono }
// skinCodigo = "corporate" | "warm" | …
export const createProforma = async ({ estado, cliente, asunto, items, skinCodigo, empresaId = null, adjuntosExcluidos = [] }) => {
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
  const totals = computeTotals(items);
  const skin_id = await resolveSkinId(skinCodigo);

  const today = new Date().toISOString().slice(0, 10);
  const validez = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const { data: prof, error } = await supabase
    .from("proformas")
    .insert({
      numero, cliente_id, asunto: asunto || null, estado,
      emitida: today, validez,
      ...totals, moneda: "PEN",
      skin_id,
      empresa_id: empresaId || null,
      adjuntos_excluidos: adjuntosExcluidos,
      owner_id: user.id,
    })
    .select()
    .single();
  if (error) throw error;

  const codes = [...new Set(items.map((i) => i.modelo).filter(Boolean))];
  const productoIds = await resolveProductoIds(codes);
  const { error: e2 } = await supabase
    .from("proforma_items")
    .insert(buildItemRows(prof.id, items, productoIds));
  if (e2) throw e2;

  // Para los flujos antiguos donde estado=enviada generaba slug automático.
  // Hoy el flujo principal es 'borrador' + ensurePublicLink aparte; lo
  // mantenemos por si algún día volvemos a separar el "enviar".
  let slug = null;
  if (estado === "enviada") {
    slug = randomSlug();
    const { error: e3 } = await supabase
      .from("proforma_links")
      .insert({ proforma_id: prof.id, slug });
    if (e3) throw e3;
  }

  return { proforma: prof, slug, totals };
};

// Edita una proforma existente. Reemplaza todos los items (borra + inserta)
// y actualiza cliente/totales/skin/asunto. No cambia el numero ni emitida.
// estado: si viene, se actualiza; si no, queda como estaba.
export const updateProforma = async (proformaId, { cliente, asunto, items, skinCodigo, estado, empresaId, adjuntosExcluidos }) => {
  if (!proformaId) throw new Error("Falta proformaId");
  if (!Array.isArray(items) || !items.length) throw new Error("Agregá al menos un ítem");
  const user = await requireUser();

  const cliente_id = await findOrCreateCliente(user.id, {
    razon_social: cliente.razonSocial,
    ruc: cliente.ruc,
    contacto: cliente.contacto,
    email: cliente.email,
    telefono: cliente.telefono,
  });
  const totals = computeTotals(items);
  const skin_id = await resolveSkinId(skinCodigo);

  const patch = { cliente_id, asunto: asunto || null, ...totals, skin_id };
  if (estado) patch.estado = estado;
  if (empresaId !== undefined) patch.empresa_id = empresaId || null;
  if (Array.isArray(adjuntosExcluidos)) patch.adjuntos_excluidos = adjuntosExcluidos;

  const { data: prof, error } = await supabase
    .from("proformas")
    .update(patch)
    .eq("id", proformaId).eq("owner_id", user.id)
    .select()
    .single();
  if (error) throw error;

  // Reemplazo total de items: la edición es destructiva sobre la lista.
  // proforma_items no tiene owner_id; RLS filtra via FK proforma_id.
  const { error: eDel } = await supabase.from("proforma_items")
    .delete().eq("proforma_id", proformaId);
  if (eDel) throw eDel;

  const codes = [...new Set(items.map((i) => i.modelo).filter(Boolean))];
  const productoIds = await resolveProductoIds(codes);
  const { error: eIns } = await supabase
    .from("proforma_items")
    .insert(buildItemRows(proformaId, items, productoIds));
  if (eIns) throw eIns;

  return { proforma: prof, totals };
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

// Trae todo lo necesario para la vista de detalle/edición/print.
// Acepta `numero` (PRF-2026-0001) o uuid.
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

  const [clienteRes, itemsRes, linkRes, skinRes, empresaRes] = await Promise.all([
    prof.cliente_id
      ? supabase.from("clientes").select("*").eq("id", prof.cliente_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("proforma_items").select("*, productos(codigo)").eq("proforma_id", prof.id).order("posicion"),
    supabase.from("proforma_links").select("slug").eq("proforma_id", prof.id).limit(1),
    prof.skin_id
      ? supabase.from("skins").select("codigo, nombre").eq("id", prof.skin_id).maybeSingle()
      : Promise.resolve({ data: null }),
    prof.empresa_id
      ? supabase.from("empresas").select("*").eq("id", prof.empresa_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    proforma: prof,
    cliente: clienteRes.data || null,
    items: itemsRes.data || [],
    slug: linkRes.data?.[0]?.slug || null,
    skin: skinRes.data || null,
    empresa: empresaRes.data || null,
  };
};
