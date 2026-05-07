// Toast minimalista. Container montado on-demand en <body>.
let host = null;

const ensureHost = () => {
  if (host) return host;
  host = document.createElement("div");
  host.className = "toast-host";
  document.body.appendChild(host);
  return host;
};

export const toast = (msg, { type = "info", ms = 3200 } = {}) => {
  const h = ensureHost();
  const node = document.createElement("div");
  node.className = `toast toast-${type}`;
  node.textContent = msg;
  h.appendChild(node);
  requestAnimationFrame(() => node.classList.add("toast-in"));
  setTimeout(() => {
    node.classList.remove("toast-in");
    setTimeout(() => node.remove(), 250);
  }, ms);
};
