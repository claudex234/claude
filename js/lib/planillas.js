// Mini motor de plantillas para las planillas de proforma. Una planilla es
// un archivo HTML plano (en /planillas/<codigo>/index.html) con tokens
// estilo Mustache:
//
//   {{var.path}}            sustitución HTML-escaped
//   {{!var.path}}           sustitución cruda (para SVGs / HTML pre-armado)
//   {{#if var.path}}…{{/if}}     bloque condicional
//   {{#each items}}…{{/each}}    loop. Adentro: {{this.x}} o {{x}} directo
//
// El parser maneja anidamiento (each dentro de if dentro de each, etc.).

const get = (obj, path) => {
  if (!path) return undefined;
  if (path === "this") return obj?.this;
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
};

const escHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Devuelve el índice del cierre balanceado `{{/tag}}` para una apertura
// `{{#tag …}}` que arranca en `start` (donde start apunta al char justo
// después del `}}` de apertura). Cuenta anidamiento.
const findClose = (tpl, start, tag) => {
  const open = `{{#${tag}`;
  const close = `{{/${tag}}}`;
  let i = start;
  let depth = 1;
  while (i < tpl.length) {
    const nextOpen = tpl.indexOf(open, i);
    const nextClose = tpl.indexOf(close, i);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + open.length;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      i = nextClose + close.length;
    }
  }
  return -1;
};

const mergeCtx = (parent, item) =>
  (item && typeof item === "object")
    ? { ...parent, this: item, ...item }
    : { ...parent, this: item };

export const renderTemplate = (tpl, data) => {
  let i = 0;
  let out = "";
  while (i < tpl.length) {
    const open = tpl.indexOf("{{", i);
    if (open === -1) { out += tpl.slice(i); break; }
    out += tpl.slice(i, open);
    const close = tpl.indexOf("}}", open + 2);
    if (close === -1) { out += tpl.slice(open); break; }
    const tag = tpl.slice(open + 2, close).trim();
    const after = close + 2;

    if (tag.startsWith("#each ")) {
      const path = tag.slice(6).trim();
      const endBody = findClose(tpl, after, "each");
      if (endBody === -1) { out += tpl.slice(open); break; }
      const body = tpl.slice(after, endBody);
      const arr = get(data, path);
      if (Array.isArray(arr)) {
        out += arr.map((item) => renderTemplate(body, mergeCtx(data, item))).join("");
      }
      i = endBody + "{{/each}}".length;
    } else if (tag.startsWith("#if ")) {
      const path = tag.slice(4).trim();
      const endBody = findClose(tpl, after, "if");
      if (endBody === -1) { out += tpl.slice(open); break; }
      const body = tpl.slice(after, endBody);
      const v = get(data, path);
      const truthy = Array.isArray(v) ? v.length > 0 : !!v;
      if (truthy) out += renderTemplate(body, data);
      i = endBody + "{{/if}}".length;
    } else if (tag.startsWith("!")) {
      // Sustitución cruda
      out += String(get(data, tag.slice(1).trim()) ?? "");
      i = after;
    } else if (tag.startsWith("/") || tag.startsWith("#")) {
      // Tag de cierre/apertura suelto sin par: lo dejamos pasar para
      // que sea visible que falló el parseo (ayuda a debug).
      out += tpl.slice(open, after);
      i = after;
    } else {
      out += escHtml(get(data, tag));
      i = after;
    }
  }
  return out;
};

// === Registro de planillas ============================================
// codigo → URL del archivo HTML. Para agregar una nueva: tirá el HTML
// en /planillas/<codigo>/index.html y registralo acá.
const PLANILLA_FILES = {
  corporate: "planillas/corporate/index.html",
  warm:      "planillas/warm/index.html",
};

const cache = new Map();

const resolveBase = () => `${location.pathname.replace(/[^/]*$/, "")}`;

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

export const PLANILLAS_DISPONIBLES = Object.keys(PLANILLA_FILES);
