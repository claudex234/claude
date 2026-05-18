// Escala una hoja A4 (794×1123) para que llene un container,
// como un visor de PDF. El contenido NO se reorganiza, solo cambia
// la escala visual via transform: scale.
//
// Espera la siguiente estructura mínima:
//   container > [paddingFrame?] > .pv-fit > .pv-doc > .pv-page (o equivalente)
//
// Devuelve un objeto con `update()` (forzar refit) y `dispose()` (cleanup).

export const PAGE_W = 794;

export const mountA4Fit = (container, opts = {}) => {
  const {
    docSelector = ".pv-doc",
    fitSelector = ".pv-fit",
    paddingX = 0,        // padding horizontal del container que hay que descontar
    minScale = 0.3,
    maxScale = 1.4,
  } = opts;

  // Estado para detectar no-cambios y romper el loop ResizeObserver↔scale.
  // Sin estos guardas, FancyZones (y cualquier resize rápido) triggerea
  // un ping-pong: container resize → set fit.width/height → si el alto
  // del fit cambia el scrollbar del stage (overflow:auto) entra/sale →
  // clientWidth oscila ±15px → ResizeObserver dispara de nuevo → loop.
  let lastScale = -1;
  let lastFitH = -1;
  let rafId = 0;

  const compute = () => {
    rafId = 0;
    if (!container) return;
    const fit = container.querySelector(fitSelector);
    const doc = container.querySelector(docSelector);
    if (!fit || !doc) return;
    const cw = container.clientWidth - paddingX;
    if (cw <= 0) return;
    const scale = Math.max(minScale, Math.min(maxScale, cw / PAGE_W));
    // Cuantizar: cambios <0.5% no valen un refit (es el rango típico del
    // toggle del scrollbar).
    if (Math.abs(scale - lastScale) < 0.005) return;
    const fitH = doc.scrollHeight * scale;
    if (Math.abs(fitH - lastFitH) < 1 && Math.abs(scale - lastScale) < 0.01) return;
    lastScale = scale;
    lastFitH = fitH;
    doc.style.transformOrigin = "top left";
    doc.style.transform = `scale(${scale})`;
    fit.style.width = (PAGE_W * scale) + "px";
    fit.style.height = fitH + "px";
  };

  // Coalesce: múltiples ResizeObserver callbacks en el mismo frame =
  // un solo compute. Mata el loop sincrónico aún si el guarda de
  // cuantización no aplica.
  const refit = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(compute);
  };

  const ro = new ResizeObserver(refit);
  ro.observe(container);
  requestAnimationFrame(refit);

  return {
    update: refit,
    dispose: () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    },
  };
};
