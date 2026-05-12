// API de páginas rastreadas (pestaña Competidores) y sus hits.
import { supabase } from "../../lib/supabase.js";
import { requireUser, randomSlug } from "./helpers.js";

const TYPES = new Set(["pixel", "link", "html"]);

export const fetchTrackingPages = async () => {
  const { data, error } = await supabase
    .from("tracking_pages")
    .select("*, hits:tracking_hits(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // Embed devuelve [{count}]; aplanamos a número.
  return (data || []).map((p) => ({
    ...p,
    hits_count: p.hits?.[0]?.count || 0,
  }));
};

export const fetchTrackingPage = async (id) => {
  const { data, error } = await supabase
    .from("tracking_pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const fetchHitsByPage = async (pageId) => {
  const { data, error } = await supabase
    .from("tracking_hits")
    .select("*")
    .eq("page_id", pageId)
    .order("abierta_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const upsertTrackingPage = async ({
  id, nombre, tipo, slug, destino_url, contenido_html, nota, activa = true,
}) => {
  const user = await requireUser();
  if (!nombre?.trim()) throw new Error("Falta el nombre");
  if (!TYPES.has(tipo)) throw new Error(`Tipo inválido: ${tipo}`);
  if (tipo === "link" && !destino_url?.trim()) throw new Error("Falta la URL de destino");
  if (tipo === "html" && !contenido_html?.trim()) throw new Error("Falta el HTML");

  const payload = {
    nombre: nombre.trim(),
    tipo,
    slug: slug?.trim() || randomSlug().slice(0, 10),
    destino_url: tipo === "link" ? destino_url.trim() : null,
    contenido_html: tipo === "html" ? contenido_html : null,
    nota: nota?.trim() || null,
    activa: !!activa,
  };

  if (id) {
    const { data, error } = await supabase
      .from("tracking_pages")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("tracking_pages")
    .insert({ ...payload, owner_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteTrackingPage = async (id) => {
  const { error } = await supabase.from("tracking_pages").delete().eq("id", id);
  if (error) throw error;
};
