// Settings del usuario en memoria. Lo rellena `data/loader.js` tras
// el login. Las páginas leen de acá para conocer empresa y defaults.
// Si los campos están vacíos, el caller hace fallback a EMISOR
// hardcoded (data/empresa.js).
export const CONFIG = {
  publico_solo_pe: false,
  empresa: {},
  defaults: {},
};
