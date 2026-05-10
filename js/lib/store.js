// Store global. Cambios persistidos en localStorage para las claves
// listadas en PERSIST. Notifica via CustomEvent('store:<key>') para que
// los componentes se re-rendereen.
import { storage } from "./utils.js";

const PERSIST = ["theme", "sidebarCollapsed"];

export const state = {
  theme: storage.get("theme", "dark"),
  sidebarCollapsed: storage.get("sidebarCollapsed", false),
  tweaksOpen: false,
};

export const set = (patch) => {
  Object.assign(state, patch);
  for (const k of Object.keys(patch)) {
    if (PERSIST.includes(k)) storage.set(k, patch[k]);
    document.dispatchEvent(new CustomEvent("store:" + k, { detail: { value: patch[k], state } }));
  }
};
