// Barrel: re-exporta las APIs de Supabase divididas por dominio.
// Los módulos vivos están en data/api/{proformas,clientes,skins}.js
// más data/api/helpers.js (no exportado a páginas).
export {
  nextNumero,
  createProforma,
  updateProforma,
  ensurePublicLink,
  fetchProformaDetail,
} from "./api/proformas.js";

export {
  upsertCliente,
  deleteCliente,
  fetchClientes,
} from "./api/clientes.js";

export {
  upsertSkin,
  deleteSkin,
  setDefaultSkin,
  fetchSkins,
} from "./api/skins.js";
