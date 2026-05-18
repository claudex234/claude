// API de adjuntos: PDFs (subidos al bucket producto-adjuntos) y links
// externos. Cada adjunto se asocia a un producto; cuando ese producto
// aparece en una proforma, sus adjuntos se muestran en el visor público.

import { supabase } from "../../lib/supabase.js";
import { requireUser } from "./helpers.js";

const BUCKET = "producto-adjuntos";

// Lista adjuntos de un producto, ordenados por orden + created_at.
export const listAdjuntos = async (productoId) => {
  const { data, error } = await supabase.from("adjuntos")
    .select("*")
    .eq("producto_id", productoId)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
};

// Sube un PDF al bucket y crea la fila en adjuntos.
// Path: <ownerId>/<productoId>/<timestamp>-<safeName>
export const uploadAdjuntoPdf = async (productoId, file) => {
  const user = await requireUser();
  if (!file) throw new Error("Sin archivo");
  if (file.type !== "application/pdf") throw new Error("Solo PDFs por ahora");
  if (file.size > 50 * 1024 * 1024) throw new Error("Máximo 50 MB");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  const path = `${user.id}/${productoId}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await supabase.from("adjuntos").insert({
    owner_id: user.id,
    producto_id: productoId,
    tipo: "pdf",
    nombre: file.name,
    url: pub.publicUrl,
    storage_path: path,
    tamano_bytes: file.size,
    mime: file.type,
  }).select().single();
  if (error) throw error;
  return data;
};

// Crea un adjunto tipo link (URL externa).
export const addAdjuntoLink = async (productoId, { nombre, url, descripcion }) => {
  const user = await requireUser();
  if (!nombre || !url) throw new Error("Nombre y URL requeridos");
  try { new URL(url); } catch { throw new Error("URL inválida"); }

  const { data, error } = await supabase.from("adjuntos").insert({
    owner_id: user.id,
    producto_id: productoId,
    tipo: "link",
    nombre,
    url,
    descripcion: descripcion || null,
  }).select().single();
  if (error) throw error;
  return data;
};

// Borra adjunto: la fila + el archivo en storage si era PDF.
export const removeAdjunto = async (adjunto) => {
  if (adjunto.tipo === "pdf" && adjunto.storage_path) {
    await supabase.storage.from(BUCKET).remove([adjunto.storage_path]).catch(() => {});
  }
  const { error } = await supabase.from("adjuntos").delete().eq("id", adjunto.id);
  if (error) throw error;
};
