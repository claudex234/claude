// API de proforma_aperturas (read-only desde el admin). RLS permite leer
// solo las aperturas de proformas propias.
import { supabase } from "../../lib/supabase.js";

// Ventana en segundos para considerar una apertura "abierta ahora".
// El visor manda heartbeat cada 5s + tick al cerrar con flag closing
// (que pone ultima_actividad_at en el pasado). 15s = 2 heartbeats + grace.
export const LIVE_WINDOW_S = 15;

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
//
// Usa RPC server-side para que el filtro se evalúe con el reloj del
// server, no del browser: clock skew del admin >15s rompía la detección.
export const fetchLiveProformaIds = async () => {
  const { data, error } = await supabase.rpc("live_proforma_ids", {
    p_window_s: LIVE_WINDOW_S,
  });
  if (error) throw error;
  return new Set(data || []);
};
