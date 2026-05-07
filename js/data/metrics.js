export const METRICS = {
  enviadasMes: 47,
  vistasMes: 38,
  tasaApertura: 81,
  montoEnviado: 1847500,
  montoVisto: 1432800,
  promedioVistas: 4.2,
  promedioTiempo: 312,
  aperturasDia: [3,5,2,7,4,6,8,5,3,9,11,7,4,6,8,12,9,7,5,8,11,14,9,6,8,10,13,8,7,11],
  topClientes: [
    { nombre: "Universidad Continental", aperturas: 23, tiempo: 5430 },
    { nombre: "Colegio Innova Schools", aperturas: 12, tiempo: 3120 },
    { nombre: "Colegio Trilce", aperturas: 15, tiempo: 2890 },
    { nombre: "I.E.P. San Agustín", aperturas: 7, tiempo: 1842 },
  ],
};

export const TEMPLATES = [
  { id: "tpl-1", nombre: "Pantallas interactivas - Educación", uso: 23, default: true, items: 5 },
  { id: "tpl-2", nombre: "Aulas híbridas (premium)", uso: 12, default: false, items: 8 },
  { id: "tpl-3", nombre: "Laboratorio de cómputo", uso: 8, default: false, items: 6 },
  { id: "tpl-4", nombre: "Sala de capacitación corporativa", uso: 5, default: false, items: 4 },
  { id: "tpl-5", nombre: "Mantenimiento y soporte anual", uso: 3, default: false, items: 3 },
];
