// Datos del emisor para el PDF. Hardcodeados por ahora; mover a tabla
// `empresa_config` cuando haga falta editarlos sin redeploy.
//
// Para reemplazar el logo: pegá el SVG de tu logo en `logoSvg` (literal con
// el <svg ...> ... </svg> entero). Conviene que tenga viewBox y no width/height
// fijos para que escale solo dentro del contenedor.

const PLACEHOLDER_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 60" preserveAspectRatio="xMinYMid meet">
  <rect x="2" y="2" width="216" height="56" rx="4" fill="none" stroke="#e63946" stroke-width="3"/>
  <text x="110" y="38" text-anchor="middle"
        font-family="'Inter', system-ui, sans-serif" font-weight="800"
        font-size="26" letter-spacing="2" fill="#1a1d23">
    <tspan fill="#1a1d23">EDU</tspan><tspan dx="6" fill="#e63946">BOARD</tspan>
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
    "Extensiones, tomas de luz, cables, otras instalaciones eléctricas",
    "Reforzamientos de pared o drywall",
    "Computadoras u otros equipos",
  ],
};
