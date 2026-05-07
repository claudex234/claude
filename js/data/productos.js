export const PROFORMAS_PRODUCTOS = {
  "PRF-2026-0142": { PLUS: 3 },
  "PRF-2026-0141": { PRO: 1, PLUS: 2 },
  "PRF-2026-0140": { ELITE: 2, PLUS: 1 },
  "PRF-2026-0139": { PRO: 4 },
  "PRF-2026-0138": { PRO: 1 },
  "PRF-2026-0137": { PLUS: 2 },
  "PRF-2026-0136": { ELITE: 1 },
  "PRF-2026-0135": { PRO: 3 },
};

const PANTALLA_SVG = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110">
  <defs>
    <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a3a8a"/><stop offset=".5" stop-color="#2563c9"/><stop offset="1" stop-color="#0a1f4d"/>
    </linearGradient>
    <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="rgba(255,255,255,.08)" stroke-width=".5"/></pattern>
  </defs>
  <rect x="6" y="6" width="148" height="84" rx="4" fill="#1a1a1a"/>
  <rect x="10" y="10" width="140" height="76" rx="2" fill="url(#scr)"/>
  <rect x="10" y="10" width="140" height="76" rx="2" fill="url(#grid)"/>
  <rect x="74" y="92" width="12" height="3" fill="#1a1a1a"/>
  <rect x="60" y="95" width="40" height="3" rx="1" fill="#2a2a2a"/>
</svg>`);

export const PRODUCTOS = {
  PLUS: {
    codigo: "PLUS",
    nombre: 'Pantalla Interactiva táctil 86" ED88PP-86 (PLUS)',
    tamano: '86"', precioDefault: 8900, tipo: "pantalla", imagen: PANTALLA_SVG,
    specsHighlight: [
      "CPU Octacore A755 @2.0 GHz (gama alta)",
      "GPU Mali-G610 (tareas gráficas)",
      "NPU 6 TOPS (procesamiento neuronal)",
      "Memoria RAM 16 GB",
      "Almacenamiento 128 GB ampliable",
      "IA educativa: genera clases, preguntas, tarjetas de estudio",
      "Gestión de usuarios con huella dactilar",
    ],
  },
  PRO: {
    codigo: "PRO",
    nombre: 'Pantalla Interactiva táctil 75" ED88PP-75 (PRO)',
    tamano: '75"', precioDefault: 6500, tipo: "pantalla", imagen: PANTALLA_SVG,
    specsHighlight: [
      "CPU Octacore A755 @1.8 GHz",
      "Memoria RAM 8 GB",
      "Almacenamiento 64 GB ampliable",
      "IA educativa: genera clases, preguntas, tarjetas de estudio",
      "Gestión de usuarios con huella dactilar",
    ],
  },
  ELITE: {
    codigo: "ELITE",
    nombre: 'Pantalla Interactiva táctil 98" ED88PP-98 (ELITE)',
    tamano: '98"', precioDefault: 12400, tipo: "pantalla", imagen: PANTALLA_SVG,
    specsHighlight: [
      "CPU Octacore A755 @2.2 GHz (gama premium)",
      "GPU Mali-G610 MP6 · NPU 8 TOPS",
      "Memoria RAM 16 GB",
      "Almacenamiento 256 GB ampliable",
      "IA educativa avanzada con generación de contenido",
      "Huella dactilar y reconocimiento facial",
    ],
  },
};

export const SKINS = [
  { id: "minimal", nombre: "Minimal", desc: "Limpio y directo. Tipografía sans-serif, mucho whitespace.", cover: { bg: "#ffffff", accent: "#0a2540", font: "sans" }, activa: true, uso: 28 },
  { id: "corporate", nombre: "Corporativo", desc: "Header sólido, líneas marcadas. Ideal para sector educativo y gobierno.", cover: { bg: "#1e3a8a", accent: "#fbbf24", font: "sans" }, uso: 12 },
  { id: "warm", nombre: "Cálido", desc: "Tonos tierra, serif para títulos. Más humano y cercano.", cover: { bg: "#fef7ed", accent: "#9a3412", font: "serif" }, uso: 6 },
  { id: "bold", nombre: "Bold", desc: "Tipografía grande, alto contraste.", cover: { bg: "#0f172a", accent: "#f97316", font: "display" }, uso: 4 },
  { id: "editorial", nombre: "Editorial", desc: "Mucho whitespace, tipografía grande, mood premium.", cover: { bg: "#fafaf9", accent: "#000", font: "serif" }, uso: 9 },
  { id: "tech", nombre: "Tech", desc: "Mono para datos, layout denso, vibe SaaS B2B.", cover: { bg: "#0a0a0a", accent: "#10b981", font: "mono" }, uso: 3 },
];
