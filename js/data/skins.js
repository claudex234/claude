// Catálogo de skins (planillas) en memoria. Lo rellena `data/loader.js` desde
// la tabla `skins` después del login. Cada skin es:
//   { id (uuid), codigo (text), nombre, descripcion, activa (default), html }

export const SKINS = [];

export const findSkinByCodigo = (codigo) =>
  SKINS.find((s) => s.codigo === codigo);

export const findSkinById = (id) =>
  SKINS.find((s) => s.id === id);

export const defaultSkinCodigo = () =>
  SKINS.find((s) => s.activa)?.codigo || SKINS[0]?.codigo || "corporate";
