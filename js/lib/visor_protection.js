// Protecciones disuasivas del visor público — best-effort, no anti-hacker.
// Bloquea menú contextual, drag/select/copy, atajos comunes de descarga /
// impresión / devtools, y oculta contenido al perder foco/visibilidad.

export const installProtections = (root) => {
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
  root.addEventListener("contextmenu", stop);
  root.addEventListener("dragstart", stop);
  root.addEventListener("selectstart", stop);
  root.addEventListener("copy", stop);
  root.addEventListener("cut", stop);

  const onKey = (ev) => {
    const k = (ev.key || "").toLowerCase();
    // Ctrl+S/P/C/A/U/X — save, print, copy, select-all, view-source, cut
    if ((ev.ctrlKey || ev.metaKey) && ["s", "p", "c", "a", "u", "x"].includes(k)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    // PrintScreen — best effort: limpiar clipboard si está permitido
    if (k === "printscreen" || ev.key === "PrintScreen") {
      try { navigator.clipboard?.writeText(""); } catch {}
    }
    // F12 / Ctrl+Shift+I / J / C — devtools
    if (k === "f12") ev.preventDefault();
    if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && (k === "i" || k === "j" || k === "c")) {
      ev.preventDefault();
    }
  };
  document.addEventListener("keydown", onKey, true);

  // Ocultar contenido al perder foco / cambiar de pestaña.
  const setHidden = (on) => document.body.classList.toggle("vp-hidden", on);
  const onBlur = () => setHidden(true);
  const onFocus = () => setHidden(false);
  const onVis = () => setHidden(document.hidden);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVis);

  return () => {
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVis);
    document.body.classList.remove("vp-hidden", "vp-public");
  };
};
