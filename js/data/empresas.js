// Empresas en memoria. Un usuario puede tener varias (3 empresas
// distintas, distintos RUC). Lo rellena `data/loader.js` desde Supabase.

export const EMPRESAS = [];

export const findEmpresaById = (id) => EMPRESAS.find((e) => e.id === id);
export const defaultEmpresa = () =>
  EMPRESAS.find((e) => e.is_default) || EMPRESAS[0] || null;

// Fila DB → shape de memoria. Las planillas leen estos campos.
export const adaptEmpresa = (row) => ({
  id: row.id,
  nombre: row.nombre || row.razon_social || "—",
  razon_social: row.razon_social || "",
  ruc: row.ruc || "",
  direccion: row.direccion || "",
  telefono: row.telefono || "",
  email: row.email || "",
  firmante_nombre: row.firmante_nombre || "",
  firmante_cargo: row.firmante_cargo || "",
  tagline: row.tagline || "",
  subtagline: row.subtagline || "",
  ciudad: row.ciudad || "",
  logo_svg: row.logo_svg || "",
  logo_url: row.logo_url || "",
  cuentas: Array.isArray(row.cuentas) ? row.cuentas : [],
  is_default: !!row.is_default,
});
