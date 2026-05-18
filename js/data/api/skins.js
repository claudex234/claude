// API de skins (planillas).
// `activa` se gestiona aparte vía setDefaultSkin para que nunca queden
// dos defaults a la vez.
import { supabase } from "../../lib/supabase.js";
import { requireUser } from "./helpers.js";

export const upsertSkin = async ({ id, codigo, nombre, descripcion, html, css }) => {
  const user = await requireUser();
  const payload = {
    codigo, nombre,
    descripcion: descripcion || null,
    html: html || null,
    css: css || null,
  };
  if (id) {
    // Defense-in-depth: filtrar por owner_id ademas del id. Si las RLS
    // policies fallan, esto evita updates a skins ajenas.
    const { data, error } = await supabase.from("skins")
      .update(payload).eq("id", id).eq("owner_id", user.id).select().single();
    if (error) throw error;
    return data;
  }
  // owner_id obligatorio en insert: la policy skins_insert_own exige
  // owner_id = auth.uid(). Sin esto el insert siempre fallaba con RLS.
  const { data, error } = await supabase.from("skins")
    .insert({ ...payload, owner_id: user.id }).select().single();
  if (error) throw error;
  return data;
};

export const deleteSkin = async (id) => {
  const user = await requireUser();
  const { error } = await supabase.from("skins")
    .delete().eq("id", id).eq("owner_id", user.id);
  if (error) throw error;
};

// Limpia el activa de TODAS las otras del owner y recién después marca
// la nueva. El orden importa: si lo hiciéramos al revés quedarían dos
// activas en la ventana entre updates.
//
// IMPORTANTE: el .neq("id", id) sin filtro por owner_id afectaría
// skins de otros usuarios (las globales con owner_id=null se ignoran
// por la policy de update, pero igual hay que ser explícitos).
export const setDefaultSkin = async (id) => {
  const user = await requireUser();
  const { error: e1 } = await supabase.from("skins")
    .update({ activa: false })
    .eq("owner_id", user.id).neq("id", id);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("skins")
    .update({ activa: true }).eq("id", id).eq("owner_id", user.id);
  if (e2) throw e2;
};

export const fetchSkins = async () => {
  const { data, error } = await supabase.from("skins").select("*").order("created_at");
  if (error) throw error;
  return data || [];
};
