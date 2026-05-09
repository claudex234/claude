// Mini motor de plantillas para las planillas de proforma. La planilla
// es un archivo HTML plano (en /planillas/<codigo>/index.html) con tokens
// estilo Mustache:
//
//   {{var.path}}            sustitución HTML-escaped
//   {{!var.path}}           sustitución cruda (para SVGs, HTML pre-armado)
//   {{#if var.path}}…{{/if}}     bloque condicional
//   {{#each items}}…{{/each}}    loop. Adentro: {{this.x}} o {{x}} directo
//
// Ejemplo:
//   <h2>{{cliente.razon}}</h2>
//   {{#each items}}
//     <li>{{nombre}} — {{precio}}</li>
//   {{/each}}

const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

const escHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const renderTemplate = (tpl, data) => {
  // {{#each path}}...{{/each}} — recursivo para soportar nesting
  tpl = tpl.replace(/\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, path, body) => {
    const arr = get(data, path);
    if (!Array.isArray(arr)) return "";
    return arr.map((item) => {
      const ctx = (item && typeof item === "object")
        ? { ...data, this: item, ...item }
        : { ...data, this: item };
      return renderTemplate(body, ctx);
    }).join("");
  });
  // {{#if path}}...{{/if}}
  tpl = tpl.replace(/\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, path, body) => {
    const v = get(data, path);
    const truthy = Array.isArray(v) ? v.length > 0 : !!v;
    return truthy ? renderTemplate(body, data) : "";
  });
  // {{!path}} → crudo
  tpl = tpl.replace(/\{\{!\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const v = get(data, path);
    return v == null ? "" : String(v);
  });
  // {{path}} → escaped
  tpl = tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => escHtml(get(data, path)));
  return tpl;
};

// === Registro de planillas ============================================
// codigo → URL del archivo HTML. Para agregar una nueva: cae el HTML en
// /planillas/<codigo>/index.html y registralo acá.
const PLANILLA_FILES = {
  corporate: "planillas/corporate/index.html",
  warm:      "planillas/warm/index.html",
};

const cache = new Map();

const resolveBase = () => {
  // Compatible con dev (localhost/) y GH Pages (/test/). Tomamos el
  // pathname del index.html actual.
  return `${location.pathname.replace(/[^/]*$/, "")}`;
};

export const loadPlanilla = async (codigo) => {
  const code = PLANILLA_FILES[codigo] ? codigo : "corporate";
  if (cache.has(code)) return cache.get(code);
  const url = resolveBase() + PLANILLA_FILES[code];
  const tpl = await fetch(url, { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`No pude cargar la planilla ${code} (${r.status})`);
    return r.text();
  });
  cache.set(code, tpl);
  return tpl;
};

export const renderPlanilla = async (codigo, data) => {
  const tpl = await loadPlanilla(codigo);
  return renderTemplate(tpl, data);
};

// Lista de planillas disponibles (para selector en UI).
export const PLANILLAS_DISPONIBLES = Object.keys(PLANILLA_FILES);
