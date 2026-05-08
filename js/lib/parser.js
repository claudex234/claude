// Parser de "smart paste": extrae cliente + productos de texto crudo
// pegado en libre forma. Heurísticas afinadas para Perú.
//
// RUC (SUNAT): 11 dígitos. Primer par identifica el tipo:
//   10 = persona natural con negocio
//   15 = no domiciliados (raro)
//   17 = misiones diplomáticas (raro)
//   20 = empresa  ← lo "super seguro" para clientes empresa
// Aceptamos 10, 15, 17 y 20 al parsear; marcamos rucSeguro si empieza por 20.
//
// Teléfono PE:
//   Móvil: 9 + 8 dígitos (9XX XXX XXX), opcional +51
//   Fijo: prefijo de área (1 dígito Lima, 2 provincias) + 6-7 dígitos.
//   Ejemplos válidos: "+51 987 654 321", "987654321", "01 234 5678",
//                     "(01) 234-5678", "044 123456".
//
// Empresa: termina en sufijo corporativo o empieza por palabra educativa.
//   Sufijos: SAC, SA, SAA, SRL, EIRL, LTDA (con o sin puntos).
//   Educativas: COLEGIO, INSTITUTO, UNIVERSIDAD, ESCUELA, IE, IEP, CETPRO,
//               CEBE, INSTITUCIÓN.

const RX_RUC_ANY  = /\b(10|15|17|20)\d{9}\b/;
const RX_RUC_SAFE = /\b20\d{9}\b/; // RUC de empresa (más confiable)

const RX_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

// Móvil PE: opcional +51, opcional separadores, 9 + 8 dígitos.
const RX_TEL_MOBILE = /(?:\+?51[\s-]?)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/;
// Fijo PE: requiere separador explícito (espacio, guión) o paréntesis
// alrededor del prefijo. Esto evita que confunda un RUC (11 dígitos
// pegados) con un teléfono fijo.
//   "01 234 5678", "(044) 123-4567", "+51 1 234 5678" → match
//   "20512345678" (RUC pelado) → no match
const RX_TEL_FIJO = /(?:\+?51[\s-]+)?(?:\(0?[1-9]\d?\)\s*|0?[1-9]\d?[\s-]+)\d{3}[\s-]?\d{3,4}\b/;

// Sufijos corporativos al final de la línea (con o sin puntos).
const RX_CORP_END = /\b(S\.?A\.?C\.?|S\.?A\.?A\.?|S\.?A\.?|E\.?I\.?R\.?L\.?|S\.?R\.?L\.?|S\.?C\.?R\.?L\.?|LTDA\.?)\.?\s*$/i;
// Detección permisiva (en cualquier parte de la línea): para casos donde la
// razón social viene seguida de RUC u otra info en la misma línea.
const RX_CORP_ANY = /\b(S\.?A\.?C\.?|S\.?A\.?A\.?|S\.?A\.?|E\.?I\.?R\.?L\.?|S\.?R\.?L\.?|S\.?C\.?R\.?L\.?|LTDA\.?)\b/i;

// Inicios "educativos": IE/IEP/Colegio/Universidad/etc.
const RX_EDU_START = /^(I\.?E\.?P?\.?|COLEGIO|INSTITUTO|INSTITUCI[ÓO]N|UNIVERSIDAD|ESCUELA|CETPRO|CEBE|CUNA|JARD[IÍ]N|NIDO)\b/i;

// Etiquetas tipo "RUC: …", "Tel: …", "Att: …" — las stripeamos antes de parsear.
const RX_LABEL_PREFIX = /^(?:R\.?U\.?C\.?|Atenci[óo]n|Att?e?\.?|Contacto|Tel[éef]?\.?|Telefono|Tel[éef]ono|Cel(?:ular)?|M[oó]vil|Email|Correo|E-mail|Mail|Direcci[óo]n|Raz[óo]n\s+social|Empresa|Cliente)\s*[:\-]\s*/i;

const stripLabel = (line) => line.replace(RX_LABEL_PREFIX, "").trim();

const PRODUCT_CODES = ["PLUS", "PRO", "ELITE"];
const RX_PRODUCT = /^(\d{1,3})?(PLUS|PRO|ELITE)(\d{3,7})?$/;

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
    // Fijo. Lima 1 dígito de área + 7; provincias 2 + 6.
    if (digits.length === 8) return `+51 ${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`;
    return `+51 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return raw.trim();
};

const looksLikePerson = (line) => {
  const t = line.trim();
  if (!t) return false;
  if (RX_CORP_ANY.test(t)) return false;
  if (RX_EDU_START.test(t)) return false;
  if (RX_EMAIL.test(t)) return false;
  if (RX_TEL_MOBILE.test(t) || RX_TEL_FIJO.test(t)) return false;
  if (RX_RUC_ANY.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  // Mayoría de palabras capitalizadas.
  const cap = words.filter((w) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ.']*$/.test(w));
  return cap.length >= Math.max(2, Math.floor(words.length * 0.6));
};

const looksLikeEmpresa = (line) => RX_CORP_END.test(line) || RX_EDU_START.test(line) || RX_CORP_ANY.test(line);

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

    // 2) Email (puede convivir con otra info en la misma línea)
    if (!out.email) {
      const m = t.match(RX_EMAIL);
      if (m) out.email = m[0];
    }

    // 3) RUC PRIMERO (más específico que teléfono). Si lo encontramos en
    //    la línea, removemos esos dígitos del texto de trabajo para que
    //    el detector de teléfono no los confunda. Bug clásico: un RUC
    //    "20603463545" terminaba detectado como fijo "0603463545".
    if (!out.ruc) {
      const m = t.match(RX_RUC_ANY);
      if (m) {
        out.ruc = m[0];
        out.rucSeguro = RX_RUC_SAFE.test(m[0]);
        const rest = t.replace(m[0], "").trim().replace(/^[\s.,\-:]+/, "");
        if (!out.razonSocial && rest && looksLikeEmpresa(rest)) out.razonSocial = rest;
        // Quitar el RUC del texto antes de seguir buscando teléfono.
        t = t.replace(m[0], "").trim();
      }
    }

    // 4) Teléfono — preferimos móvil > fijo
    if (!out.telefono) {
      const mobile = t.match(RX_TEL_MOBILE);
      if (mobile) {
        out.telefono = normalizeTel(mobile[0]);
      } else {
        const fijo = t.match(RX_TEL_FIJO);
        if (fijo) out.telefono = normalizeTel(fijo[0]);
      }
    }

    // 5) Razón social por sufijo / educativo
    if (!out.razonSocial && looksLikeEmpresa(t)) {
      out.razonSocial = t.replace(/^\s*\d{11}\s*/, "").trim();
      continue;
    }

    // 6) Contacto (persona)
    if (!out.contacto && looksLikePerson(t)) {
      out.contacto = t;
      continue;
    }
  }

  // Fallback: si no detectamos razón social, primera línea no vacía con algo
  // que parezca nombre (no email/tel/ruc/producto).
  if (!out.razonSocial) {
    const candidate = lines
      .map((l) => stripLabel(l.trim()))
      .find((l) => {
        if (!l) return false;
        if (RX_EMAIL.test(l) || RX_TEL_MOBILE.test(l) || RX_TEL_FIJO.test(l)) return false;
        if (RX_RUC_ANY.test(l)) return false;
        if (RX_PRODUCT.test(l.toUpperCase().replace(/\s+/g, ""))) return false;
        return true;
      });
    if (candidate) out.razonSocial = candidate;
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
