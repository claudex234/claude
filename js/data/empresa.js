// Datos del emisor para el PDF. Hardcodeados por ahora; mover a tabla
// `empresa_config` cuando haga falta editarlos sin redeploy.
export const EMISOR = {
  razonSocial: "Norden Tecnología Educativa SAC",
  ruc: "20512345678",
  email: "ventas@norden.pe",
  telefono: "998 765 432",
  firmante: "Manuel Cárdenas Ríos",
  ciudad: "Lima",
  cuentas: [
    { banco: "BCP", moneda: "Soles", numero: "194-1234567-0-12", cci: "002 194 001234567012 31" },
    { banco: "BBVA", moneda: "Soles", numero: "0011 0123 0200456789", cci: "011 123 000200456789 46" },
  ],
  defaults: {
    validezDias: 15,
    tiempoEntrega: "15 días calendario",
    lugarEntrega: "Lima, según OC",
    garantia: "2 años",
    condiciones: "T/T",
    formaPago: "50% adelanto / 50% contra entrega",
  },
};

export const FORMAS_PAGO = [
  "50% adelanto / 50% contra entrega",
  "100% adelanto",
  "Crédito 30 días",
  "Crédito 60 días",
  "Contra entrega",
];

export const BLOQUES_PANTALLA = {
  servicios: [
    "Entrega, instalación y capacitación, previa coordinación",
  ],
  noIncluido: [
    "Extensiones, tomas de luz, cables, otras instalaciones eléctricas",
    "Reforzamientos de pared o drywall",
    "Computadoras u otros equipos",
  ],
};
