// Parser de "smart paste": extrae cliente + productos de texto crudo
// pegado en libre forma. Heurísticas afinadas para Perú.
//
// Razón social — criterio estricto. Una línea es razón social SOLO si:
//   - termina en sufijo corporativo (SAC, SA, EIRL, SRL, LTDA, …), o
//   - empieza por palabra educativa (COLEGIO, INSTITUTO, IE/IEP, …), o
//   - es un dominio (ej. ingenieros.pe, miempresa.com.pe).
//
// Si después de procesar todo no hay razón social pero sí email
// CORPORATIVO (no gmail/hotmail/etc.), usamos el dominio como razón
// social: "juan@ingenieros.pe" → "ingenieros.pe".
//
// RUC (SUNAT): 11 dígitos. Acepta 10/15/17/20; marcamos rucSeguro si
// empieza por 20 (empresa).
//
// Teléfono PE: móvil 9 + 8 dígitos (opcional +51); fijo prefijo de área
// + 6-7 dígitos. Normalizado a +51 9XX XXX XXX o +51 1 234 5678.

const RX_RUC_ANY  = /\b(10|15|17|20)\d{9}\b/;
const RX_RUC_SAFE = /\b20\d{9}\b/;

const RX_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

// Móvil PE: opcional +51, opcional separadores, 9 + 8 dígitos.
const RX_TEL_MOBILE = /(?:\+?51[\s-]?)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/;
// Fijo PE: requiere separador explícito o paréntesis para no confundir
// con un RUC (11 dígitos pegados).
const RX_TEL_FIJO = /(?:\+?51[\s-]+)?(?:\(0?[1-9]\d?\)\s*|0?[1-9]\d?[\s-]+)\d{3}[\s-]?\d{3,4}\b/;

// Sufijos corporativos al final de la línea.
const RX_CORP_END = /\b(S\.?A\.?C\.?|S\.?A\.?A\.?|S\.?A\.?|E\.?I\.?R\.?L\.?|S\.?R\.?L\.?|S\.?C\.?R\.?L\.?|LTDA\.?)\.?\s*$/i;
// Detección permisiva (en cualquier parte) para razones sociales que
// vienen seguidas de RUC u otra info en la misma línea.
const RX_CORP_ANY = /\b(S\.?A\.?C\.?|S\.?A\.?A\.?|S\.?A\.?|E\.?I\.?R\.?L\.?|S\.?R\.?L\.?|S\.?C\.?R\.?L\.?|LTDA\.?)\b/i;

// Inicios "educativos".
const RX_EDU_START = /^(I\.?E\.?P?\.?|COLEGIO|INSTITUTO|INSTITUCI[ÓO]N|UNIVERSIDAD|ESCUELA|CETPRO|CEBE|CUNA|JARD[IÍ]N|NIDO)\b/i;

// Dominio puro (sin @): "ingenieros.pe", "acme.com.pe", "foo.io".
const RX_DOMAIN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

// Etiquetas tipo "RUC: …", "Tel: …" — las stripeamos antes de parsear.
const RX_LABEL_PREFIX = /^(?:R\.?U\.?C\.?|Atenci[óo]n|Att?e?\.?|Contacto|Tel[éef]?\.?|Telefono|Tel[éef]ono|Cel(?:ular)?|M[oó]vil|Email|Correo|E-mail|Mail|Direcci[óo]n|Raz[óo]n\s+social|Empresa|Cliente)\s*[:\-]\s*/i;

// Proveedores de email gratuitos: si el correo es de uno de estos NO
// usamos su dominio como razón social.
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "hotmail.com", "hotmail.es", "hotmail.com.pe",
  "outlook.com", "outlook.es", "outlook.com.pe",
  "live.com", "msn.com",
  "yahoo.com", "yahoo.es", "yahoo.com.pe",
  "icloud.com", "me.com",
  "aol.com",
  "protonmail.com", "proton.me", "pm.me",
  "gmx.com", "gmx.es", "mail.com",
  "yandex.com", "ya.ru",
  "zoho.com", "fastmail.com",
  "tutanota.com", "tutamail.com",
]);

const PRODUCT_CODES = ["PLUS", "PRO", "ELITE"];
const RX_PRODUCT = /^(\d{1,3})?(PLUS|PRO|ELITE)(\d{3,7})?$/;

const stripLabel = (line) => line.replace(RX_LABEL_PREFIX, "").trim();

// Capitaliza palabras: "jose perez" → "Jose Perez".
const titleCase = (s) =>
  s.toLowerCase().replace(/(^|\s|-|')(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

// Como titleCase pero re-mayuscula los sufijos corporativos: "acme sac"
// → "Acme SAC", "eduboard eirl" → "Eduboard EIRL".
const titleCaseRazon = (s) =>
  titleCase(s).replace(/\b(s\.?a\.?c\.?|s\.?a\.?a\.?|s\.?a\.?|e\.?i\.?r\.?l\.?|s\.?r\.?l\.?|s\.?c\.?r\.?l\.?|ltda\.?)\b/gi, m => m.toUpperCase());

const looksLikeEmpresa = (line) =>
  RX_CORP_END.test(line) || RX_EDU_START.test(line) || RX_CORP_ANY.test(line);

const looksLikeDomain = (line) => {
  const t = line.trim();
  return RX_DOMAIN.test(t) && !RX_EMAIL.test(t);
};

const isFreeEmailDomain = (domain) => FREE_EMAIL_DOMAINS.has(domain.toLowerCase());

const looksLikePerson = (line) => {
  const t = line.trim();
  if (!t) return false;
  if (looksLikeEmpresa(t)) return false;
  if (looksLikeDomain(t)) return false;
  if (RX_EMAIL.test(t)) return false;
  if (RX_TEL_MOBILE.test(t) || RX_TEL_FIJO.test(t)) return false;
  if (RX_RUC_ANY.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 5) return false;
  return words.every((w) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ.'-]{2,}$/.test(w));
};

// Normaliza un teléfono al formato "+51 9XX XXX XXX" o "+51 1 234 5678".
const normalizeTel = (raw) => {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+51")) digits = digits.slice(3);
  else if (digits.startsWith("51") && digits.length >= 11) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (/^9\d{8}$/.test(digits)) {
    return `+51 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (/^[1-9]\d{6,7}$/.test(digits)) {
    if (digits.length === 8) return `+51 ${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`;
    return `+51 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return raw.trim();
};

const setRazon = (out, value, isDomain = false) => {
  if (out.razonSocial) return;
  out.razonSocial = isDomain ? value.toLowerCase() : titleCaseRazon(value);
};

export const parsePaste = (raw, productos) => {
  const out = {
    razonSocial: "",
    ruc: "",
    rucSeguro: false,
    contacto: "",
    email: "",
    telefono: "",
    productos: [],
    detected: {},
  };
  if (!raw || !raw.trim()) return out;

  const lines = raw.split(/\r?\n/);

  for (const rawLine of lines) {
    const noLabel = stripLabel(rawLine.trim());
    let t = noLabel;
    if (!t) continue;

    // 1) Código de producto compacto: "3PLUS8500", "PRO", "1ELITE"
    const compact = t.toUpperCase().replace(/\s+/g, "");
    const pm = compact.match(RX_PRODUCT);
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

    // 2) Email
    if (!out.email) {
      const m = t.match(RX_EMAIL);
      if (m) out.email = m[0].toLowerCase();
    }

    // 3) RUC PRIMERO (para no confundirlo con teléfono fijo). Si lo
    //    encontramos en una línea con texto, lo de al lado puede ser
    //    razón social.
    if (!out.ruc) {
      const m = t.match(RX_RUC_ANY);
      if (m) {
        out.ruc = m[0];
        out.rucSeguro = RX_RUC_SAFE.test(m[0]);
        const rest = t.replace(m[0], "").trim().replace(/^[\s.,\-:]+|[\s.,\-:]+$/g, "");
        if (rest && (looksLikeEmpresa(rest) || looksLikeDomain(rest))) {
          setRazon(out, rest, looksLikeDomain(rest));
        }
        t = t.replace(m[0], "").trim();
      }
    }

    // 4) Teléfono — móvil > fijo
    if (!out.telefono) {
      const mobile = t.match(RX_TEL_MOBILE);
      if (mobile) {
        out.telefono = normalizeTel(mobile[0]);
      } else {
        const fijo = t.match(RX_TEL_FIJO);
        if (fijo) out.telefono = normalizeTel(fijo[0]);
      }
    }

    // 5) Razón social explícita: empresa o dominio. Si la línea ES un
    //    dominio puro, lo dejamos lowercase (es una URL).
    if (!out.razonSocial) {
      if (looksLikeEmpresa(t)) {
        setRazon(out, t.replace(/^\s*\d{11}\s*/, "").trim(), false);
        continue;
      }
      if (looksLikeDomain(t)) {
        setRazon(out, t, true);
        continue;
      }
    }

    // 6) Contacto (persona). NO doblamos esta línea como razón social.
    if (!out.contacto && looksLikePerson(t)) {
      out.contacto = titleCase(t);
      continue;
    }
  }

  // 7) Fallback: si no hay razón social pero hay email corporativo,
  //    usamos su dominio. "juan@ingenieros.pe" → razonSocial = "ingenieros.pe".
  if (!out.razonSocial && out.email) {
    const domain = out.email.split("@")[1] || "";
    if (domain && !isFreeEmailDomain(domain)) {
      setRazon(out, domain, true);
    }
  }

  out.detected = {
    razonSocial: !!out.razonSocial,
    ruc: !!out.ruc,
    rucSeguro: out.rucSeguro,
    contacto: !!out.contacto,
    email: !!out.email,
    telefono: !!out.telefono,
    productos: out.productos.length > 0,
  };

  return out;
};

export { PRODUCT_CODES };

// === Normalizador para texto dictado por voz ==========================
// El Web Speech API en español devuelve palabras: 'arroba' por '@',
// 'punto' por '.', dígitos separados por espacios ("dos cero seis…"),
// y números chicos en palabras ('una', 'dos'). Esto los convierte
// para que el parser después los reconozca como RUC/email/qty.

const SPANISH_NUM = {
  cero: "0", uno: "1", una: "1", un: "1",
  dos: "2", tres: "3", cuatro: "4", cinco: "5",
  seis: "6", siete: "7", ocho: "8", nueve: "9", diez: "10",
  once: "11", doce: "12",
};

export const normalizeDictation = (raw) => {
  if (!raw) return raw;
  let t = raw;
  // "manuel arroba gmail.com" → "manuel@gmail.com"
  t = t.replace(/\s*\barroba\b\s*/gi, "@");
  // "ingenieros punto pe" → "ingenieros.pe" (entre tokens alfanuméricos)
  t = t.replace(/(\w)\s+punto\s+(\w)/gi, "$1.$2");
  t = t.replace(/(\w)\s+punto\s+(\w)/gi, "$1.$2"); // segunda pasada por si hay 'a.b.c'
  // "guion" / "guion bajo" en emails: "juan guion bajo perez arroba…"
  t = t.replace(/(\w)\s+gui[óo]n\s+bajo\s+(\w)/gi, "$1_$2");
  t = t.replace(/(\w)\s+gui[óo]n\s+(\w)/gi, "$1-$2");
  // Palabras-número → dígitos (cero-doce). Útil para 'una pro' = '1 pro'.
  t = t.replace(/\b(cero|uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/gi, m => SPANISH_NUM[m.toLowerCase()] || m);
  // Secuencias de dígitos separados por espacios/guiones — si el total
  // es 9 (móvil) u 11 (RUC), los colapsamos a un solo número.
  // Ej: "20 60 35 73 777" (11) → "20603573777"; "910 250 250" (9) → "910250250".
  t = t.replace(/\b\d(?:[\s\-]+\d){4,14}\b/g, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length === 11) return digits;          // RUC
    if (digits.length === 9 && digits[0] === "9") return digits; // móvil PE
    if (digits.length === 8) return digits;           // fijo PE sin 0
    return m;
  });
  return t;
};
