// API de alto nivel para planillas/skins. Combina:
//   - el engine de plantillas (template_engine.js)
//   - el catálogo de skins en memoria (data/skins.js)
//   - fallback a archivos /planillas/<codigo>/{template.html,styles.css}
//     cuando un skin no tiene html/css en la base (autoría externa con git).
//
// La salida final del render es un string HTML que incluye un <style>
// inline scopeado a la clase .pl-<codigo>, seguido del HTML rendereado.
// El llamador no se preocupa por inyectar el CSS aparte.

import { renderTemplate } from "./template_engine.js";
import { SKINS, findSkinByCodigo } from "../data/skins.js";

const fileCache = new Map();

const fetchSkinFiles = async (codigo) => {
  if (fileCache.has(codigo)) return fileCache.get(codigo);
  const base = location.pathname.replace(/[^/]*$/, "");
  const dir = `${base}planillas/${codigo}`;
  const [htmlRes, cssRes] = await Promise.all([
    fetch(`${dir}/template.html`, { cache: "no-cache" }),
    fetch(`${dir}/styles.css`, { cache: "no-cache" }),
  ]);
  if (!htmlRes.ok) throw new Error(`No pude cargar ${dir}/template.html (${htmlRes.status})`);
  const html = await htmlRes.text();
  const css = cssRes.ok ? await cssRes.text() : "";
  const pair = { html, css };
  fileCache.set(codigo, pair);
  return pair;
};

// Devuelve { html, css } de la planilla. Prefiere los guardados en DB; si
// falta alguno cae a leer el archivo de disco como fallback.
export const resolvePlanilla = async (codigo) => {
  const skin = findSkinByCodigo(codigo) || findSkinByCodigo("corporate");
  const code = skin?.codigo || "corporate";
  const fromDb = { html: skin?.html || null, css: skin?.css || null };
  if (fromDb.html && fromDb.css) return fromDb;
  // Falta alguno → leemos archivo y rellenamos lo que falte.
  const fromFile = await fetchSkinFiles(code).catch(() => ({ html: "", css: "" }));
  return {
    html: fromDb.html ?? fromFile.html,
    css: fromDb.css ?? fromFile.css,
  };
};

// Combina CSS + HTML rendereado en un solo bloque listo para innerHTML.
const combine = ({ html, css }, data) => {
  const inner = renderTemplate(html || "", data);
  return css ? `<style>${css}</style>${inner}` : inner;
};

export const renderPlanilla = async (codigo, data) => {
  const pair = await resolvePlanilla(codigo);
  return combine(pair, data);
};

// Para visor público que recibe html+css crudos por el RPC.
export const renderPlanillaWith = ({ html, css }, data) => combine({ html, css }, data);

export { SKINS };
