// Popover compartido para los iconitos "i" (info-tip).
//
// Uso: en el HTML poner el resultado de infoTip(texto). El click en el
// icono muestra un popover flotante con el texto. Click afuera lo cierra.
// Mobile-friendly (los `title` HTML nativos NO funcionan al tocar en
// celular, por eso usamos un popover propio).

import { icon } from "./icons.js";
import { raw } from "./utils.js";

let popEl = null;
let installed = false;

const ensurePopover = () => {
  if (popEl) return popEl;
  popEl = document.createElement("div");
  popEl.className = "info-pop";
  popEl.setAttribute("role", "tooltip");
  popEl.style.display = "none";
  document.body.appendChild(popEl);
  return popEl;
};

const hide = () => {
  if (popEl) popEl.style.display = "none";
};

const showAt = (btn, text) => {
  const el = ensurePopover();
  el.textContent = text;
  el.style.display = "block";
  // Reset para medir tamaño limpio antes de posicionar.
  el.style.left = "0px";
  el.style.top = "0px";
  const r = btn.getBoundingClientRect();
  const pr = el.getBoundingClientRect();
  // Centrar horizontalmente sobre el botón, encima si hay lugar,
  // si no debajo. Clampear a viewport con margen 8px.
  let left = r.left + r.width / 2 - pr.width / 2;
  let top = r.top - pr.height - 8;
  if (top < 8) top = r.bottom + 8;
  if (left < 8) left = 8;
  if (left + pr.width > window.innerWidth - 8) left = window.innerWidth - pr.width - 8;
  el.style.left = `${left + window.scrollX}px`;
  el.style.top = `${top + window.scrollY}px`;
};

const install = () => {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest?.("[data-info-text]");
    if (btn) {
      ev.preventDefault();
      ev.stopPropagation();
      const text = btn.getAttribute("data-info-text") || "";
      if (popEl && popEl.style.display === "block" && popEl.textContent === text) {
        hide();
      } else {
        showAt(btn, text);
      }
      return;
    }
    // Click afuera del popover → cerrar.
    if (popEl && popEl.style.display === "block" && !ev.target.closest(".info-pop")) {
      hide();
    }
  }, true);
  window.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
};

// Devuelve HTML para un botón-icono "i" con el texto del tooltip embedded.
// El install() se hace lazy la primera vez que se llama.
export const infoTip = (text) => {
  install();
  if (!text) return "";
  return `<button type="button" class="info-tip" data-info-text="${String(text).replace(/"/g, "&quot;")}" aria-label="Más información">${icon("info", 12)}</button>`;
};

// Helper para usar dentro de templates html`` (devuelve raw).
export const infoTipRaw = (text) => raw(infoTip(text));
