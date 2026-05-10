// API de clientes: alta, edición, borrado, listado.
import { supabase } from "../../lib/supabase.js";
import { requireUser } from "./helpers.js";

export const upsertCliente = async ({ id, razon_social, ruc, contacto, cargo, email, telefono }) => {
  const user = await requireUser();
  if (!razon_social?.trim()) throw new Error("Falta la razón social");
  const payload = {
    razon_social: razon_social.trim(),
    ruc: ruc?.trim() || null,
    contacto: contacto?.trim() || null,
    cargo: cargo?.trim() || null,
    email: email?.trim() || null,
    telefono: telefono?.trim() || null,
  };
  if (id) {
    const { data, error } = await supabase.from("clientes").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...payload, owner_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Si tiene proformas asociadas, supabase rechaza por FK. La UI traduce
// el error de violación a un mensaje legible.
export const deleteCliente = async (id) => {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw error;
};

export const fetchClientes = async () => {
  const { data, error } = await supabase.from("clientes").select("*").order("razon_social");
  if (error) throw error;
  return data || [];
};
