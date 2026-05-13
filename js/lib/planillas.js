// API de alto nivel para planillas/skins.
//   - engine de templates (template_engine.js)
//   - catálogo en memoria (data/skins.js)
//   - fallback a archivos /planillas/<codigo>/{template.html,styles.css}
//     SOLO para los skins listados en FILE_BACKED. Para skins nuevas
//     creadas vía la UI, el contenido vive solo en DB.
//
// La salida del render incluye un <style> inline scopeado a .pl-<codigo>
// seguido del HTML rendereado.

import { renderTemplate } from "./template_engine.js";
import { SKINS, findSkinByCodigo } from "../data/skins.js";

// Skins que existen como archivos en /planillas/<codigo>/. Cualquier otro
// código que no esté acá NO intenta fetch (evita 404 ruidosos en consola).
const FILE_BACKED = new Set(["corporate", "warm"]);

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

// Devuelve { html, css, empty }. empty=true cuando la skin no tiene ni
// contenido en DB ni archivo asociado — el caller muestra placeholder.
export const resolvePlanilla = async (codigo) => {
  const skin = findSkinByCodigo(codigo);
  if (!skin) {
    // Fallback duro a corporate si el código no existe en SKINS.
    if (codigo !== "corporate") return resolvePlanilla("corporate");
    return { html: "", css: "", empty: true };
  }
  const fromDb = { html: skin.html || null, css: skin.css || null };
  if (fromDb.html && fromDb.css) return { ...fromDb, empty: false };

  // Falta algo en DB. Solo buscamos en disco si está whitelisteada.
  if (!FILE_BACKED.has(skin.codigo)) {
    return {
      html: fromDb.html || "",
      css: fromDb.css || "",
      empty: !(fromDb.html || fromDb.css),
    };
  }
  const fromFile = await fetchSkinFiles(skin.codigo).catch(() => ({ html: "", css: "" }));
  const html = fromDb.html ?? fromFile.html;
  const css = fromDb.css ?? fromFile.css;
  return { html, css, empty: !html && !css };
};

// Combina CSS + HTML rendereado en un bloque listo para innerHTML.
const combine = ({ html, css }, data) => {
  const inner = renderTemplate(html || "", data);
  return css ? `<style>${css}</style>${inner}` : inner;
};

export const renderPlanilla = async (codigo, data) => {
  const pair = await resolvePlanilla(codigo);
  return combine(pair, data);
};

// Para el visor público que recibe html+css crudos por el RPC.
export const renderPlanillaWith = ({ html, css }, data) => combine({ html, css }, data);

export { SKINS };
