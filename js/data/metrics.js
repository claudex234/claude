// Métricas mínimas calculadas del lado cliente. Se llenan en loader.js.
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
