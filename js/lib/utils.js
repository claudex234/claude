// Helpers compartidos.

export const fmtMoney = (n, m = "PEN") => {
  const symbol = m === "PEN" ? "S/ " : m === "USD" ? "$ " : "";
  return symbol + Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtTime = (s) => {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m < 60) return `${m}m ${sec}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

export const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);

// Tagged template que devuelve string HTML; valores se escapan automáticamente.
// Para inyectar HTML crudo, usá `raw(str)`.
const RAW = Symbol("raw");
export const raw = (s) => ({ [RAW]: true, value: String(s) });
export const html = (strings, ...values) => {
  let out = "";
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) {
      const v = values[i];
      if (v == null || v === false) return;
      if (Array.isArray(v)) {
        out += v.map(x => (x && x[RAW]) ? x.value : escapeHtml(x)).join("");
      } else if (v && v[RAW]) {
        out += v.value;
      } else {
        out += escapeHtml(v);
      }
    }
  });
  return out;
};

// Convierte string HTML en HTMLElement.
export const el = (htmlStr) => {
  const t = document.createElement("template");
  t.innerHTML = htmlStr.trim();
  return t.content.firstElementChild;
};

// Delegación de eventos: container.on("click", ".selector", handler)
export const on = (root, type, selector, handler) => {
  root.addEventListener(type, (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  });
};

// LocalStorage seguro
export const storage = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};
