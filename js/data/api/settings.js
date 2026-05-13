// API de user_settings — config global del usuario.
import { supabase } from "../../lib/supabase.js";
import { requireUser } from "./helpers.js";

const DEFAULTS = {
  publico_solo_pe: false,
  empresa: {},
  defaults: {},
};

export const fetchUserSettings = async () => {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("user_settings")
    .select("publico_solo_pe, empresa, defaults")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return { ...DEFAULTS, ...(data || {}) };
};

// Upsert por user_id. Acepta patch parcial.
export const saveUserSettings = async (patch) => {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
};
