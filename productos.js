// === Catálogo de productos (plantillas de pantallas interactivas) ===
// Códigos compactos: 3PRO6000 = 3 unidades, modelo PRO, precio S/ 6000
// Si solo es "pro" → 1 unidad, modelo PRO, precio default

// SVG placeholder para imagen de producto (pantalla interactiva con bezel + soporte)
const PANTALLA_SVG = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110">
  <defs>
    <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a3a8a"/>
      <stop offset=".5" stop-color="#2563c9"/>
      <stop offset="1" stop-color="#0a1f4d"/>
    </linearGradient>
    <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M8 0H0V8" fill="none" stroke="rgba(255,255,255,.08)" stroke-width=".5"/>
    </pattern>
  </defs>
  <rect x="6" y="6" width="148" height="84" rx="4" fill="#1a1a1a"/>
  <rect x="10" y="10" width="140" height="76" rx="2" fill="url(#scr)"/>
  <rect x="10" y="10" width="140" height="76" rx="2" fill="url(#grid)"/>
  <g opacity=".85" fill="white">
    <rect x="22" y="22" width="42" height="3" rx="1.5"/>
    <rect x="22" y="29" width="28" height="2" rx="1"/>
    <circle cx="118" cy="34" r="10" fill="none" stroke="white" stroke-width="1.5"/>
    <path d="M114 34 L118 38 L124 30" stroke="white" stroke-width="1.5" fill="none"/>
    <rect x="22" y="58" width="50" height="2" rx="1" opacity=".5"/>
    <rect x="22" y="64" width="40" height="2" rx="1" opacity=".5"/>
    <rect x="22" y="70" width="46" height="2" rx="1" opacity=".5"/>
    <rect x="92" y="58" width="48" height="22" rx="2" fill="rgba(255,255,255,.12)"/>
  </g>
  <rect x="74" y="92" width="12" height="3" fill="#1a1a1a"/>
  <rect x="60" y="95" width="40" height="3" rx="1" fill="#2a2a2a"/>
</svg>
`);

window.PRODUCTOS = {
  PLUS: {
    codigo: "PLUS",
    nombre: 'Pantalla Interactiva táctil 86" ED88PP-86 (PLUS)',
    tamano: '86"',
    precioDefault: 8900,
    tipo: "pantalla",
    imagen: PANTALLA_SVG,
    // specs destacadas (las que van resaltadas en amarillo en la cotización)
    specsHighlight: [
      "CPU Octacore A755 @2.0 GHz (gama alta)",
      "GPU Mali-G610 (tareas gráficas)",
      "NPU 6 TOPS (procesamiento neuronal)",
      "Memoria RAM 16 GB",
      "Almacenamiento 128 GB ampliable",
      "IA educativa: genera clases, preguntas, tarjetas de estudio…",
      "Gestión de usuarios con huella dactilar, cada docente tiene cuentas separadas",
    ],
    specs: [
      "Resolución 4K UHD",
      "Android 13",
      "CPU Octacore A755 @2.0 GHz (gama alta)",
      "GPU Mali-G610 (tareas gráficas)",
      "NPU 6 TOPS (procesamiento neuronal)",
      "Memoria RAM 16 GB",
      "Almacenamiento 128 GB ampliable",
      "IA educativa: genera clases, preguntas, tarjetas de estudio…",
      "Gestión de usuarios con huella dactilar, cada docente tiene cuentas separadas",
      "NFC, huella dactilar, sensor calidad de aire…",
      "Protección antigolpes y antirrayaduras: MOSH 7, IK7",
      "Cámara: 4K, cobertura amplia, ePTZ, autoframing, seguimiento con IA",
      "Micrófono: matriz de 8 cápsulas",
      "20W + 20W con 20W de subwoofer",
      "Entrada y salida HDMI, puerto USB-C full (transmite video, táctil, carga, audio…)",
      "Compartir pantalla hasta 16 usuarios al mismo tiempo",
      "Compatible con Windows, Mac, Android, iPhone, Linux, Chrome OS…",
      "Wi-Fi 6.0 (5 GHz y 2.4 GHz), Wi-Fi Direct, Bluetooth 5.2",
      "2 años de garantía",
      "Marca registrada en Perú",
    ],
    incluye: [
      "01 Cable USB 1.5 mts",
      "01 Cable HDMI 1.5 mts",
      "02 Rotuladores · 01 Borrador",
      "01 Set de anclaje a pared (VESA)",
      "01 Manual de uso de pizarra en español",
      "01 Manual de uso de app de pizarra en español",
      "01 Certificado de garantía",
      "01 Control remoto",
    ],
  },
  PRO: {
    codigo: "PRO",
    nombre: 'Pantalla Interactiva táctil 75" ED88PP-75 (PRO)',
    tamano: '75"',
    precioDefault: 6500,
    tipo: "pantalla",
    imagen: PANTALLA_SVG,
    specsHighlight: [
      "CPU Octacore A755 @1.8 GHz",
      "GPU Mali-G610",
      "Memoria RAM 8 GB",
      "Almacenamiento 64 GB ampliable",
      "IA educativa: genera clases, preguntas, tarjetas de estudio",
      "Gestión de usuarios con huella dactilar",
    ],
    specs: [
      "Resolución 4K UHD",
      "Android 13",
      "CPU Octacore A755 @1.8 GHz",
      "GPU Mali-G610",
      "Memoria RAM 8 GB",
      "Almacenamiento 64 GB ampliable",
      "IA educativa: genera clases, preguntas, tarjetas de estudio",
      "Gestión de usuarios con huella dactilar",
      "NFC, huella dactilar",
      "Protección antigolpes y antirrayaduras: MOSH 7",
      "Cámara: 4K con autoframing",
      "Micrófono: matriz de 6 cápsulas",
      "16W + 16W de potencia",
      "Entrada y salida HDMI, puerto USB-C full",
      "Compartir pantalla hasta 9 usuarios simultáneos",
      "Compatible con Windows, Mac, Android, iPhone, Linux, Chrome OS",
      "Wi-Fi 6.0, Bluetooth 5.2",
      "2 años de garantía",
      "Marca registrada en Perú",
    ],
    incluye: [
      "01 Cable USB 1.5 mts",
      "01 Cable HDMI 1.5 mts",
      "02 Rotuladores · 01 Borrador",
      "01 Set de anclaje a pared (VESA)",
      "01 Manual de uso de pizarra en español",
      "01 Certificado de garantía",
      "01 Control remoto",
    ],
  },
  ELITE: {
    codigo: "ELITE",
    nombre: 'Pantalla Interactiva táctil 98" ED88PP-98 (ELITE)',
    tamano: '98"',
    precioDefault: 12400,
    tipo: "pantalla",
    imagen: PANTALLA_SVG,
    specsHighlight: [
      "CPU Octacore A755 @2.2 GHz (gama premium)",
      "GPU Mali-G610 MP6",
      "NPU 8 TOPS",
      "Memoria RAM 16 GB",
      "Almacenamiento 256 GB ampliable",
      "IA educativa avanzada con generación de contenido",
      "Gestión de usuarios con huella dactilar y reconocimiento facial",
    ],
    specs: [
      "Resolución 4K UHD",
      "Android 13",
      "CPU Octacore A755 @2.2 GHz (gama premium)",
      "GPU Mali-G610 MP6",
      "NPU 8 TOPS",
      "Memoria RAM 16 GB",
      "Almacenamiento 256 GB ampliable",
      "IA educativa avanzada con generación de contenido",
      "Gestión de usuarios con huella dactilar y reconocimiento facial",
      "NFC, huella dactilar, sensor calidad de aire, sensor de luz ambiente",
      "Protección antigolpes y antirrayaduras: MOSH 7, IK10",
      "Cámara: 4K dual con seguimiento por IA",
      "Micrófono: matriz de 12 cápsulas con cancelación de ruido",
      "30W + 30W con 30W de subwoofer",
      "Entrada y salida HDMI 2.1, USB-C full, DisplayPort",
      "Compartir pantalla hasta 32 usuarios al mismo tiempo",
      "Compatible con Windows, Mac, Android, iPhone, Linux, Chrome OS",
      "Wi-Fi 6E, Wi-Fi Direct, Bluetooth 5.3",
      "3 años de garantía",
      "Marca registrada en Perú",
    ],
    incluye: [
      "02 Cables USB 2.0 mts",
      "02 Cables HDMI 2.0 mts",
      "04 Rotuladores · 02 Borradores",
      "01 Set de anclaje a pared motorizado",
      "01 Manual de uso de pizarra en español",
      "01 Manual de uso de app de pizarra en español",
      "01 Certificado de garantía extendida",
      "02 Controles remotos",
    ],
  },
};

// Bloques que se agregan automáticamente cuando hay alguna pantalla en la cotización
window.BLOQUES_PANTALLA = {
  serviciosIncluidos: [
    "Entrega, instalación y capacitación, previa coordinación",
  ],
  noIncluido: [
    "Extensiones, tomas de luz, cables, otras instalaciones eléctricas",
    "Reforzamientos de pared o drywall",
    "Computadoras u otros equipos",
  ],
};

// Parser para "3PRO6000", "1PLUS", "pro"
window.parseProductCode = function(line) {
  const clean = line.trim().toUpperCase().replace(/\s+/g, "");
  if (!clean) return null;
  // Match: opcional cantidad (1-3 dígitos) + modelo (PLUS|PRO|ELITE) + opcional precio (3+ dígitos)
  const m = clean.match(/^(\d{1,3})?(PLUS|PRO|ELITE)(\d{3,7})?$/);
  if (!m) return null;
  const [, qtyStr, modelo, priceStr] = m;
  const producto = window.PRODUCTOS[modelo];
  if (!producto) return null;
  return {
    qty: qtyStr ? parseInt(qtyStr, 10) : 1,
    modelo,
    producto,
    precio: priceStr ? parseInt(priceStr, 10) : producto.precioDefault,
  };
};
