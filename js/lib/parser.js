// Parser de "smart paste": extrae cliente + productos de texto crudo.
// Detecta RUC (11 dígitos), email, teléfono peruano, razón social (sufijos
// corporativos), nombre de contacto y códigos de producto (PLUS/PRO/ELITE).

const RX_RUC = /\b(\d{11})\b/;
const RX_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const RX_TEL = /(\+?51\s?)?(?:9\d{2}[\s-]?\d{3}[\s-]?\d{3}|\d{3}[\s-]?\d{3}[\s-]?\d{3})/;
const RX_CORP = /(S\.?A\.?C\.?|S\.?A\.?|S\.?R\.?L\.?|E\.?I\.?R\.?L\.?|S\.?A\.?A\.?|LTDA|S\.A\. CERRADA)\b/i;
const RX_PRODUCT_LINE = /^\s*(\d{1,3})?\s*(PLUS|PRO|ELITE)\s*(\d{3,7})?\s*$/i;
const PRODUCT_CODES = ["PLUS", "PRO", "ELITE"];

const looksLikePerson = (line) => {
  const t = line.trim();
  if (!t) return false;
  if (RX_CORP.test(t)) return false;
  if (RX_EMAIL.test(t)) return false;
  if (RX_TEL.test(t)) return false;
  if (RX_RUC.test(t)) return false;
  // 2-4 palabras capitalizadas, sin códigos
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  const cap = words.filter((w) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ.]+$/.test(w));
  return cap.length >= Math.max(2, Math.floor(words.length * 0.6));
};

export const parsePaste = (raw, productos) => {
  const out = {
    razonSocial: "",
    ruc: "",
    contacto: "",
    email: "",
    telefono: "",
    productos: [],
    detected: { razonSocial: false, ruc: false, contacto: false, email: false, telefono: false, productos: false },
  };
  if (!raw || !raw.trim()) return out;

  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Producto compacto "3PLUS8500" / "PRO" / "1ELITE"
    const pm = t.toUpperCase().replace(/\s+/g, "").match(/^(\d{1,3})?(PLUS|PRO|ELITE)(\d{3,7})?$/);
    if (pm) {
      const [, qtyStr, modelo, priceStr] = pm;
      const ref = productos[modelo];
      if (ref) {
        out.productos.push({
          modelo,
          qty: qtyStr ? parseInt(qtyStr, 10) : 1,
          precio: priceStr ? parseInt(priceStr, 10) : ref.precioDefault,
          nombre: ref.nombre,
        });
        continue;
      }
    }

    // Email
    if (!out.email) {
      const m = t.match(RX_EMAIL);
      if (m) { out.email = m[0]; continue; }
    }
    // Teléfono
    if (!out.telefono) {
      const m = t.match(RX_TEL);
      if (m) {
        out.telefono = m[0].replace(/\s+/g, " ").trim();
        // Si la línea es solo teléfono, seguir
        if (t.replace(m[0], "").trim() === "") continue;
      }
    }
    // RUC + (posible razón social en la misma línea: "RUC 20512... Empresa SAC")
    if (!out.ruc) {
      const m = t.match(RX_RUC);
      if (m) {
        out.ruc = m[1];
        // Si la misma línea tiene un sufijo corporativo, la aprovechamos
        const rest = t.replace(m[0], "").replace(/^[\sRUC:.\-]+/i, "").trim();
        if (rest && RX_CORP.test(rest)) out.razonSocial = rest;
        continue;
      }
    }
    // Razón social por sufijo corporativo
    if (!out.razonSocial && RX_CORP.test(t)) {
      out.razonSocial = t.replace(/^RUC\s+\d+\s*/i, "").trim();
      continue;
    }
    // Contacto: nombre de persona
    if (!out.contacto && looksLikePerson(t)) {
      out.contacto = t;
      continue;
    }
  }

  // Si no detectamos razón social, usamos la primera línea no vacía
  if (!out.razonSocial) {
    const first = lines.find((l) => l.trim());
    if (first) out.razonSocial = first.trim();
  }

  out.detected.razonSocial = !!out.razonSocial;
  out.detected.ruc = !!out.ruc;
  out.detected.contacto = !!out.contacto;
  out.detected.email = !!out.email;
  out.detected.telefono = !!out.telefono;
  out.detected.productos = out.productos.length > 0;

  return out;
};

export { PRODUCT_CODES };
