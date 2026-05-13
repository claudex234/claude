// Barrel: re-exporta las APIs de Supabase divididas por dominio.
// Los módulos vivos están en data/api/{proformas,skins,productos,settings,
// aperturas,tracking}.js más data/api/helpers.js (interno).
export {
  nextNumero,
  createProforma,
  updateProforma,
  ensurePublicLink,
  fetchProformaDetail,
} from "./api/proformas.js";

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
  fetchLiveProformaIds,
  isLiveApertura,
  LIVE_WINDOW_S,
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
