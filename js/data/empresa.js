// Datos del emisor para el PDF. Hardcodeados por ahora; mover a tabla
// `empresa_config` cuando haga falta editarlos sin redeploy.
//
// Para reemplazar el logo: pegá el SVG de tu logo en `logoSvg` (literal con
// el <svg ...> ... </svg> entero). Conviene que tenga viewBox y no width/height
// fijos para que escale solo dentro del contenedor.

// Logo: todo negro, "EDU" más grande/grueso que "BOARD".
const PLACEHOLDER_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" preserveAspectRatio="xMinYMid meet">
  <text x="0" y="44" font-family="'Inter', system-ui, sans-serif"
        fill="#0a0a0a" letter-spacing="-0.5">
    <tspan font-size="42" font-weight="900">EDU</tspan><tspan font-size="32" font-weight="600" dx="4">BOARD</tspan>
  </text>
</svg>
`.trim();

export const EMISOR = {
  razonSocial: "EDUBOARD EIRL",
  tagline: "Pizarras Digitales Interactivas",
  subtagline: "¡Educación Divertida y eficaz!",
  ruc: "20603573758",
  email: "ventas@eduboard.pe",
  telefono: "923 932 995",
  firmante: "Manuel Dueñas Cazani",
  ciudad: "Lima",
  logoSvg: PLACEHOLDER_LOGO_SVG,
  cuentas: [
    { banco: "BCP", moneda: "Soles", numero: "194-1234567-0-12", cci: "002 194 001234567012 31" },
    { banco: "BBVA", moneda: "Soles", numero: "0011 0123 0200456789", cci: "011 123 000200456789 46" },
  ],
  defaults: {
    validezDias: 15,
    tiempoEntrega: "07 días calendario",
    lugarEntrega: "Lima, agencia, según OC",
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
    "Extensiones, cables, otras instalaciones",
    "Reforzamientos de pared o drywall",
    "Computadoras u otros equipos, hardware o software",
  ],
};
