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

  const refit = () => {
    if (!container) return;
    const fit = container.querySelector(fitSelector);
    const doc = container.querySelector(docSelector);
    if (!fit || !doc) return;
    const cw = container.clientWidth - paddingX;
    if (cw <= 0) return;
    const scale = Math.max(minScale, Math.min(maxScale, cw / PAGE_W));
    doc.style.transformOrigin = "top left";
    doc.style.transform = `scale(${scale})`;
    fit.style.width = (PAGE_W * scale) + "px";
    fit.style.height = (doc.scrollHeight * scale) + "px";
  };

  const ro = new ResizeObserver(refit);
  ro.observe(container);
  requestAnimationFrame(refit);

  return {
    update: refit,
    dispose: () => ro.disconnect(),
  };
};
