// Catálogo de productos en memoria. Lo rellena `data/loader.js` desde
// la tabla `productos`. Las páginas leen este objeto por código.

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

export const FALLBACK_IMAGE = PANTALLA_SVG;

export const PRODUCTOS = {};

// TODO: pendiente de eliminar — nunca se popula y siempre devuelve {}.
// Mantenerlo evita romper loader.js y listado.js mientras se confirma.
export const PROFORMAS_PRODUCTOS = {};

// Fila de la tabla `productos` → shape de memoria.
export const adaptProducto = (row) => ({
  codigo: row.codigo,
  nombre: row.nombre,
  tamano: row.tamano || "",
  precioDefault: Number(row.precio_default) || 0,
  tipo: row.tipo || "pantalla",
  imagen: row.imagen_url || FALLBACK_IMAGE,
  specsHighlight: row.specs_highlight || [],
  specs: row.specs || [],
  incluye: row.incluye || [],
});
