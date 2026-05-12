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

export {
  fetchUserSettings,
  saveUserSettings,
} from "./api/settings.js";

export {
  fetchAperturas,
} from "./api/aperturas.js";

export {
  upsertProducto,
  archiveProducto,
  restoreProducto,
  fetchProductos,
  uploadProductoImagen,
} from "./api/productos.js";

export {
  fetchTrackingPages,
  fetchTrackingPage,
  fetchHitsByPage,
  upsertTrackingPage,
  deleteTrackingPage,
} from "./api/tracking.js";
