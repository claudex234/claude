// Datos del emisor para el PDF. Hardcodeados por ahora; mover a tabla
// `empresa_config` cuando haga falta editarlos sin redeploy.
//
// Para reemplazar el logo: pegá el SVG de tu logo en `logoSvg` (literal con
// el <svg ...> ... </svg> entero). Conviene que tenga viewBox y no width/height
// fijos para que escale solo dentro del contenedor.

// Logo oficial de EduBoard (port del SVG en duecaz/w2). Caja line-art con
// esquinas redondeadas + texto EDU bold / BOARD regular, todo negro.
const PLACEHOLDER_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 36" preserveAspectRatio="xMinYMid meet" role="img">
  <title>EduBoard</title>
  <g fill="none" stroke="#0a0a0a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
    <line x1="8" y1="1" x2="162" y2="1"/>
    <line x1="169" y1="8" x2="169" y2="28"/>
    <line x1="8" y1="35" x2="162" y2="35"/>
    <line x1="1" y1="8" x2="1" y2="28"/>
    <path d="M8 1 Q 1 1 1 8"/>
    <path d="M162 1 Q 169 1 169 8"/>
    <path d="M8 35 Q 1 35 1 28"/>
    <path d="M162 35 Q 169 35 169 28"/>
  </g>
  <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle"
        font-size="18" font-family="system-ui, sans-serif" fill="#0a0a0a" letter-spacing="3">
    <tspan font-weight="700">EDU</tspan><tspan>BOARD</tspan>
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
