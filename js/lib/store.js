// Store global muy simple con pub/sub. No frameworks.
import { storage } from "./utils.js";

const listeners = new Set();

const initial = {
  theme: storage.get("theme", "dark"),
  sidebarCollapsed: storage.get("sidebarCollapsed", false),
  tweaksOpen: false,
};

export const state = { ...initial };

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const set = (patch) => {
  Object.assign(state, patch);
  // persistencia opcional por clave
  if ("theme" in patch) storage.set("theme", patch.theme);
  if ("sidebarCollapsed" in patch) storage.set("sidebarCollapsed", patch.sidebarCollapsed);
  listeners.forEach((fn) => fn(state, patch));
  for (const k of Object.keys(patch)) {
    document.dispatchEvent(new CustomEvent("store:" + k, { detail: { value: patch[k], state } }));
  }
};
