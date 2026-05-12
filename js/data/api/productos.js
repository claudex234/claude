// API de productos: alta, edición, soft delete (activo=false), upload
// de imagen al bucket "productos" de Supabase Storage.
import { supabase } from "../../lib/supabase.js";
import { requireUser } from "./helpers.js";

export const upsertProducto = async ({
  id, codigo, nombre, tamano, tipo, precio_default,
  imagen_url, specs, specs_highlight, incluye, activo = true,
}) => {
  const user = await requireUser();
  if (!codigo?.trim()) throw new Error("Falta el código");
  if (!nombre?.trim()) throw new Error("Falta el nombre");
  const payload = {
    codigo: codigo.trim().toUpperCase(),
    nombre: nombre.trim(),
    tamano: tamano?.trim() || null,
    tipo: tipo?.trim() || "pantalla",
    precio_default: Number(precio_default) || 0,
    imagen_url: imagen_url || null,
    specs: Array.isArray(specs) ? specs : [],
    specs_highlight: Array.isArray(specs_highlight) ? specs_highlight : [],
    incluye: Array.isArray(incluye) ? incluye : [],
    activo: !!activo,
  };
  if (id) {
    const { data, error } = await supabase.from("productos")
      .update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("productos")
    .insert({ ...payload, owner_id: user.id })
    .select().single();
  if (error) throw error;
  return data;
};

// Soft delete: marca activo=false. No borramos para no romper proformas
// que referencien al producto via proforma_items.producto_id.
export const archiveProducto = async (id) => {
  const { error } = await supabase.from("productos")
    .update({ activo: false }).eq("id", id);
  if (error) throw error;
};

export const restoreProducto = async (id) => {
  const { error } = await supabase.from("productos")
    .update({ activo: true }).eq("id", id);
  if (error) throw error;
};

// Lista TODOS los productos (activos e inactivos) — para el panel admin.
// El catálogo en memoria de PRODUCTOS solo trae activos (loader.js).
export const fetchProductos = async () => {
  const { data, error } = await supabase.from("productos")
    .select("*").order("precio_default");
  if (error) throw error;
  return data || [];
};

// === Storage ============================================================

const BUCKET = "productos";

// Sube un File al bucket "productos". Path: <user_id>/<codigo>/<filename>.
// Devuelve la URL pública.
export const uploadProductoImagen = async (codigo, file) => {
  if (!file) throw new Error("Falta el archivo");
  const user = await requireUser();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${user.id}/${(codigo || "x").toUpperCase()}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};
