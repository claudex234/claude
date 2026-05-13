// API de proforma_aperturas (read-only desde el admin). RLS permite leer
// solo las aperturas de proformas propias.
import { supabase } from "../../lib/supabase.js";

// Ventana en segundos para considerar una apertura "abierta ahora".
// Como el visor envía heartbeat cada 5s + tick inicial al primer
// segundo, 30s de tolerancia cubre cualquier hiccup de red.
export const LIVE_WINDOW_S = 30;

const isLiveTs = (iso) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && (Date.now() - t) < LIVE_WINDOW_S * 1000;
};

export const isLiveApertura = (a) => isLiveTs(a?.ultima_actividad_at);

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

// Devuelve un Set con los proforma_id que tienen al menos una apertura
// con actividad reciente (LIVE_WINDOW_S). El listado polletea esto cada
// pocos segundos para mostrar el indicador verde.
export const fetchLiveProformaIds = async () => {
  const since = new Date(Date.now() - LIVE_WINDOW_S * 1000).toISOString();
  const { data, error } = await supabase
    .from("proforma_aperturas")
    .select("link_id, ultima_actividad_at, proforma_links(proforma_id)")
    .gt("ultima_actividad_at", since);
  if (error) throw error;
  const set = new Set();
  for (const r of data || []) {
    const pid = r.proforma_links?.proforma_id;
    if (pid) set.add(pid);
  }
  return set;
};
