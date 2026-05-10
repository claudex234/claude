// API de skins (planillas).
// `activa` se gestiona aparte vía setDefaultSkin para que nunca queden
// dos defaults a la vez.
import { supabase } from "../../lib/supabase.js";

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

// Limpia el activa de TODAS las otras y recién después marca la nueva.
// El orden importa: si lo hiciéramos al revés quedarían dos activas en
// la ventana entre updates.
export const setDefaultSkin = async (id) => {
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
