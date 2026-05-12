// API de proforma_aperturas (read-only desde el admin). RLS permite leer
// solo las aperturas de proformas propias.
import { supabase } from "../../lib/supabase.js";

// Trae todas las aperturas de una proforma, ordenadas por fecha desc.
export const fetchAperturas = async (proformaId) => {
  if (!proformaId) return [];
  // Resolvemos los link_id de la proforma y filtramos por ellos.
  const { data: links, error: e1 } = await supabase
    .from("proforma_links")
    .select("id")
    .eq("proforma_id", proformaId);
  if (e1) throw e1;
  const linkIds = (links || []).map((l) => l.id);
  if (!linkIds.length) return [];
  const { data, error } = await supabase
    .from("proforma_aperturas")
    .select("*")
    .in("link_id", linkIds)
    .order("abierta_at", { ascending: false });
  if (error) throw error;
  return data || [];
};
