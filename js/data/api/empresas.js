// API de empresas: CRUD + upload de logo. Cada usuario puede tener
// varias empresas (distintas razón social / RUC / cuentas bancarias).
// Una se marca como default (la que se asigna a proformas sin elegir).

import { supabase } from "../../lib/supabase.js";
import { requireUser } from "./helpers.js";

const BUCKET = "empresa-logos";

export const fetchEmpresas = async () => {
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at");
  if (error) throw error;
  return data || [];
};

// Crea/actualiza. `id` opcional. Devuelve la fila DB.
export const upsertEmpresa = async (patch) => {
  const user = await requireUser();
  const row = {
    nombre: (patch.nombre || patch.razon_social || "Mi empresa").trim(),
    razon_social: patch.razon_social?.trim() || null,
    ruc: patch.ruc?.trim() || null,
    direccion: patch.direccion?.trim() || null,
    telefono: patch.telefono?.trim() || null,
    email: patch.email?.trim() || null,
    firmante_nombre: patch.firmante_nombre?.trim() || null,
    firmante_cargo: patch.firmante_cargo?.trim() || null,
    tagline: patch.tagline?.trim() || null,
    subtagline: patch.subtagline?.trim() || null,
    ciudad: patch.ciudad?.trim() || null,
    logo_svg: patch.logo_svg || null,
    logo_url: patch.logo_url || null,
    cuentas: Array.isArray(patch.cuentas) ? patch.cuentas : [],
  };
  if (patch.id) {
    const { data, error } = await supabase.from("empresas")
      .update(row).eq("id", patch.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("empresas")
    .insert({ ...row, owner_id: user.id })
    .select().single();
  if (error) throw error;
  return data;
};

export const deleteEmpresa = async (id) => {
  const { error } = await supabase.from("empresas").delete().eq("id", id);
  if (error) throw error;
};

// Marca una empresa como default. El índice único parcial obliga a
// limpiar el flag previo antes de setear el nuevo.
export const setDefaultEmpresa = async (id) => {
  const user = await requireUser();
  const { error: eClr } = await supabase.from("empresas")
    .update({ is_default: false })
    .eq("owner_id", user.id).eq("is_default", true);
  if (eClr) throw eClr;
  const { error } = await supabase.from("empresas")
    .update({ is_default: true }).eq("id", id);
  if (error) throw error;
};

// Sube un archivo de logo. Path: <user_id>/<empresa_id>/<ts>.<ext>.
// Devuelve la URL pública. Si `empresaId` es null se usa "_new" como
// carpeta temporal (luego al guardar la empresa el URL queda asociado).
export const uploadEmpresaLogo = async (empresaId, file) => {
  if (!file) throw new Error("Falta el archivo");
  const user = await requireUser();
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const folder = empresaId || "_new";
  const path = `${user.id}/${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};
