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
//
// IMPORTANTE: este resolver lo usa también el visor público (bootPublic
// no llama loadAll, por lo que SKINS está vacío). Por eso intentamos
// el archivo si el código está en FILE_BACKED ANTES de fallar por
// 'skin no encontrado en catálogo'.
export const resolvePlanilla = async (codigo) => {
  const skin = findSkinByCodigo(codigo);

  // Contenido completo en DB: listo.
  if (skin?.html && skin?.css) {
    return { html: skin.html, css: skin.css, empty: false };
  }
  const fromDb = { html: skin?.html || null, css: skin?.css || null };

  // Si el código es file-backed, completamos con el archivo. Sirve
  // tanto para el admin (SKINS lleno) como para el visor (SKINS vacío).
  if (FILE_BACKED.has(codigo)) {
    const fromFile = await fetchSkinFiles(codigo).catch(() => ({ html: "", css: "" }));
    const html = fromDb.html || fromFile.html;
    const css = fromDb.css || fromFile.css;
    if (html || css) return { html, css, empty: false };
  }

  // Skin existe en DB pero sin contenido todavía (creada vía UI).
  if (skin) {
    return {
      html: fromDb.html || "",
      css: fromDb.css || "",
      empty: !(fromDb.html || fromDb.css),
    };
  }

  // Skin desconocida. Último recurso: corporate.
  if (codigo !== "corporate") return resolvePlanilla("corporate");
  return { html: "", css: "", empty: true };
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
