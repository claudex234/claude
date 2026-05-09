// Datos del emisor para el PDF. Hardcodeados por ahora; mover a tabla
// `empresa_config` cuando haga falta editarlos sin redeploy.
import { EDUBOARD_LOGO_SVG } from "../lib/proforma_template.js";

export const EMISOR = {
  razonSocial: "EDUBOARD EIRL",
  tagline: "Pizarras Digitales Interactivas",
  subtagline: "¡Educación Divertida y eficaz!",
  ruc: "20603573758",
  email: "ventas@eduboard.pe",
  telefono: "923 932 995",
  firmante: "Manuel Dueñas Cazani",
  ciudad: "Lima",
  logoSvg: EDUBOARD_LOGO_SVG,
  // titularBanco aparece en la sección de cuentas bancarias.
  titularBanco: "EDUBOARD E.I.R.L.",
  cuentas: [
    { banco: "BCP", moneda: "Soles",   numero: "194-2535160-0-76", cci: "00219400253516007699" },
    { banco: "BCP", moneda: "Dólares", numero: "194-2501059-1-31", cci: "00219400250105913198" },
  ],
  defaults: {
    validezDias: 15,
    tiempoEntrega: "07 días calendario",
    lugarEntrega: "Lima, agencia, según OC",
    garantia: "2 años",
    condiciones: "T/T",
    formaPago: "50% adelanto / 50% contra entrega",
    precioIncluyeIGV: true,
  },
};

export const FORMAS_PAGO = [
  "50% adelanto / 50% contra entrega",
  "100% adelanto",
  "Crédito 30 días",
  "Crédito 60 días",
  "Contra entrega",
];

// El paginador en el visor / generador conoce dos sets: serviciosIncluidos y
// noIncluido. Mantengo nombres viejos para compatibilidad y agrego alias.
export const BLOQUES_PANTALLA = {
  servicios: ["Entrega, instalación y capacitación, previa coordinación"],
  serviciosIncluidos: ["Entrega, instalación y capacitación, previa coordinación"],
  noIncluido: [
    "Extensiones, cables, otras instalaciones",
    "Reforzamientos de pared o drywall",
    "Computadoras u otros equipos, hardware o software",
  ],
};
