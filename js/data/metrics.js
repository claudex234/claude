// Contenedor mutable. `js/data/loader.js` rellena TEMPLATES desde la tabla `plantillas`.
// METRICS por ahora se calcula del lado cliente con ceros hasta tener proformas reales.
export const METRICS = {
  enviadasMes: 0,
  vistasMes: 0,
  tasaApertura: 0,
  montoEnviado: 0,
  montoVisto: 0,
  promedioVistas: 0,
  promedioTiempo: 0,
  aperturasDia: new Array(30).fill(0),
  topClientes: [],
};

export const TEMPLATES = [];
