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

// Fecha ISO (yyyy-mm-dd o full timestamp) → dd/mm/yyyy. Si no parsea
// devuelve el string tal cual; si viene null/undefined devuelve un guión.
export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Versión con hora: "dd/mm HH:MM" para el listado de aperturas.
export const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
};

// "hace 5m", "hace 2h", "hace 3d".
export const ago = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
};

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
