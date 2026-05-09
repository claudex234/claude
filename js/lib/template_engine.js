// Engine de plantillas — convierte un string HTML con tokens estilo
// Mustache en HTML final. Usa un walker recursivo que cuenta profundidad
// de bloques anidados.
//
// Tokens soportados:
//   {{path.a.b}}                sustitución HTML-escaped
//   {{!path.a.b}}               sustitución cruda (para SVGs / HTML pre-armado)
//   {{#if path}}…{{/if}}        bloque condicional
//   {{#each list}}…{{/each}}    loop. Adentro: {{this.x}} o {{x}} directo

const get = (obj, path) => {
  if (!path) return undefined;
  if (path === "this") return obj?.this;
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
};

const escHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Devuelve el índice donde arranca el `{{/tag}}` balanceado para una
// apertura `{{#tag …}}` cuyo cuerpo empieza en `start`.
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
      const arr = get(data, path);
      if (Array.isArray(arr)) {
        const body = tpl.slice(after, endBody);
        out += arr.map((item) => renderTemplate(body, mergeCtx(data, item))).join("");
      }
      i = endBody + "{{/each}}".length;
    } else if (tag.startsWith("#if ")) {
      const path = tag.slice(4).trim();
      const endBody = findClose(tpl, after, "if");
      if (endBody === -1) { out += tpl.slice(open); break; }
      const v = get(data, path);
      const truthy = Array.isArray(v) ? v.length > 0 : !!v;
      if (truthy) out += renderTemplate(tpl.slice(after, endBody), data);
      i = endBody + "{{/if}}".length;
    } else if (tag.startsWith("!")) {
      out += String(get(data, tag.slice(1).trim()) ?? "");
      i = after;
    } else if (tag.startsWith("/") || tag.startsWith("#")) {
      // Tag colgado sin par — lo dejamos visible para ayudar al debug.
      out += tpl.slice(open, after);
      i = after;
    } else {
      out += escHtml(get(data, tag));
      i = after;
    }
  }
  return out;
};
