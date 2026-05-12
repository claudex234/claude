// Helpers para los links públicos de proformas.

import { copyToClipboard } from "./clipboard.js";
import { toast } from "./toast.js";

// Construye la URL pública para un slug, respetando el path del deploy.
export const publicUrl = (slug) =>
  `${location.origin}${location.pathname}#/p/${slug}`;

// Copia el url al portapapeles y muestra el toast adecuado. Devuelve
// true si se logró copiar, false si solo se mostró.
export const copyAndToast = async (url, { ok = "Link copiado", info = "Link" } = {}) => {
  const copied = await copyToClipboard(url);
  toast(copied ? `${ok} · ${url}` : `${info} · ${url}`, {
    type: copied ? "ok" : "info",
    ms: 7000,
  });
  return copied;
};
