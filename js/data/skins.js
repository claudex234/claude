// Catálogo de skins (planillas) en memoria. Lo rellena `data/loader.js`
// desde la tabla `skins` después del login.

export const SKINS = [];

export const findSkinByCodigo = (codigo) => SKINS.find((s) => s.codigo === codigo);
export const findSkinById = (id) => SKINS.find((s) => s.id === id);
export const defaultSkinCodigo = () =>
  SKINS.find((s) => s.activa)?.codigo || SKINS[0]?.codigo || "corporate";

// Fila de la tabla `skins` → shape de memoria. Conserva tanto el uuid
// (id) como el codigo (clave que usa el resto de la app). html y css
// pueden ser null y caer al fallback de archivos.
export const adaptSkin = (row) => ({
  id: row.id,
  codigo: row.codigo,
  nombre: row.nombre,
  desc: row.descripcion || "",
  cover: row.cover || {},
  activa: !!row.activa,
  html: row.html || null,
  css: row.css || null,
});

