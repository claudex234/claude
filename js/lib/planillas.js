// API de alto nivel para planillas/skins. Combina:
//   - el engine de plantillas (template_engine.js)
//   - el catálogo de skins en memoria (data/skins.js)
//   - fallback a archivo /planillas/<codigo>/index.html cuando un skin
//     no tiene html en la base (útil para autoría externa con git).

import { renderTemplate } from "./template_engine.js";
import { SKINS, findSkinByCodigo } from "../data/skins.js";

const fileCache = new Map();

const fetchTemplateFile = async (codigo) => {
  if (fileCache.has(codigo)) return fileCache.get(codigo);
  const base = location.pathname.replace(/[^/]*$/, "");
  const url = `${base}planillas/${codigo}/index.html`;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`No pude cargar /planillas/${codigo}/index.html (${res.status})`);
  const tpl = await res.text();
  fileCache.set(codigo, tpl);
  return tpl;
};

// Devuelve el HTML de la planilla. Prefiere el guardado en DB (skins.html);
// si está vacío, cae al archivo de disco.
export const resolvePlanillaHtml = async (codigo) => {
  const skin = findSkinByCodigo(codigo) || findSkinByCodigo("corporate");
  if (skin?.html) return skin.html;
  return fetchTemplateFile(skin?.codigo || "corporate");
};

// Renderea una planilla. `data` es el shape de datos que la plantilla espera
// (ver una planilla para los tokens disponibles).
export const renderPlanilla = async (codigo, data) => {
  const tpl = await resolvePlanillaHtml(codigo);
  return renderTemplate(tpl, data);
};

// Renderea con HTML literal (para visor público que recibe el html del RPC).
export const renderPlanillaWith = (html, data) => renderTemplate(html, data);

export { SKINS };
