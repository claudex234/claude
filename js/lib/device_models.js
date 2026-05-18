// Diccionario de códigos de modelo → nombre comercial.
//
// Origen: los códigos vienen de UA-CH (`getHighEntropyValues({model})`)
// en Chrome/Edge/Samsung Internet/Brave/Opera sobre Android. Apple NO
// expone el modelo (privacy iOS — siempre 'iPhone' genérico).
//
// Matching: los códigos Samsung llevan sufijo de región (B europa,
// U usa, W canada, etc.) — el mapping ignora el último carácter.
// Para Xiaomi/Redmi los códigos son exactos.
//
// Cómo agregar: cuando aparezca un modelo nuevo en tracking que se vea
// como código crudo (ej. "SM-Xxxx"), buscar en GSMArena el nombre
// comercial y agregar la línea. Sin sufijo de región.

const MAP = {
  // ---- Samsung Galaxy S series ----
  "SM-G980": "Galaxy S20",         "SM-G985": "Galaxy S20+",        "SM-G988": "Galaxy S20 Ultra",
  "SM-G991": "Galaxy S21",         "SM-G996": "Galaxy S21+",        "SM-G998": "Galaxy S21 Ultra",
  "SM-S901": "Galaxy S22",         "SM-S906": "Galaxy S22+",        "SM-S908": "Galaxy S22 Ultra",
  "SM-S911": "Galaxy S23",         "SM-S916": "Galaxy S23+",        "SM-S918": "Galaxy S23 Ultra", "SM-S711": "Galaxy S23 FE",
  "SM-S921": "Galaxy S24",         "SM-S926": "Galaxy S24+",        "SM-S928": "Galaxy S24 Ultra", "SM-S721": "Galaxy S24 FE",
  "SM-S931": "Galaxy S25",         "SM-S936": "Galaxy S25+",        "SM-S938": "Galaxy S25 Ultra", "SM-S937": "Galaxy S25 Edge",

  // ---- Samsung Galaxy Z (Fold / Flip) ----
  "SM-F926": "Galaxy Z Fold3",     "SM-F711": "Galaxy Z Flip3",
  "SM-F936": "Galaxy Z Fold4",     "SM-F721": "Galaxy Z Flip4",
  "SM-F946": "Galaxy Z Fold5",     "SM-F731": "Galaxy Z Flip5",
  "SM-F956": "Galaxy Z Fold6",     "SM-F741": "Galaxy Z Flip6",
  "SM-F966": "Galaxy Z Fold7",     "SM-F761": "Galaxy Z Flip7",

  // ---- Samsung Galaxy A (media) ----
  "SM-A325": "Galaxy A32",         "SM-A336": "Galaxy A33", "SM-A346": "Galaxy A34", "SM-A356": "Galaxy A35", "SM-A366": "Galaxy A36",
  "SM-A525": "Galaxy A52",         "SM-A528": "Galaxy A52s", "SM-A536": "Galaxy A53", "SM-A546": "Galaxy A54", "SM-A556": "Galaxy A55", "SM-A566": "Galaxy A56",
  "SM-A736": "Galaxy A73",
  "SM-A045": "Galaxy A04",         "SM-A055": "Galaxy A05", "SM-A065": "Galaxy A06",
  "SM-A145": "Galaxy A14",         "SM-A155": "Galaxy A15", "SM-A165": "Galaxy A16",
  "SM-A245": "Galaxy A24",         "SM-A256": "Galaxy A25",

  // ---- Samsung Galaxy Note (legacy) ----
  "SM-N975": "Galaxy Note10+",     "SM-N981": "Galaxy Note20", "SM-N986": "Galaxy Note20 Ultra",

  // ---- Samsung Tab ----
  "SM-X910": "Galaxy Tab S9 Ultra","SM-X810": "Galaxy Tab S9+", "SM-X710": "Galaxy Tab S9",
  "SM-X916": "Galaxy Tab S10 Ultra","SM-X826": "Galaxy Tab S10+",

  // ---- Xiaomi / Redmi / Poco (códigos exactos, sin sufijo región) ----
  "2201117TG": "Redmi Note 11",    "22101317C": "Redmi Note 12", "23090RA98G": "Redmi Note 13 Pro+",
  "23117RA68G": "Redmi Note 13",   "23117RK66G": "Redmi Note 13 5G",
  "24090RA29L": "Redmi Note 14",   "24117RN76O": "Redmi Note 14 Pro",
  "2201123G": "Xiaomi 12",         "2210132G": "Xiaomi 13", "23116PN5BG": "Xiaomi 13T Pro",
  "23127PN0CG": "Xiaomi 14",       "2405CPX3DG": "Xiaomi 14 Ultra",
  "24129PN74G": "Xiaomi 15",       "2501DPN54G": "Xiaomi 15 Ultra",
  "M2102J20SG": "POCO X3 Pro",     "22041216G": "POCO M4 Pro",
  "23076PC4BI": "POCO F5",         "24069PC21G": "POCO F6",

  // ---- OnePlus ----
  "CPH2451": "OnePlus 11",         "CPH2581": "OnePlus 12", "CPH2661": "OnePlus 13",
  "NE2213": "OnePlus 10 Pro",      "LE2113": "OnePlus 9",

  // ---- Pixel: el UA-CH ya devuelve "Pixel 8 Pro" amigable, no necesita map ----
  // Lo dejamos vacío para no sobreescribir.

  // ---- Motorola ----
  "moto g(50)": "Moto G50",        "moto g(60)": "Moto G60",
  "motorola edge 30": "Edge 30",   "motorola edge 40": "Edge 40", "motorola edge 50 pro": "Edge 50 Pro",
};

// Lookup con strip del sufijo de región para Samsung (SM-XxxxB → SM-Xxxx).
// Para otros vendors compara código exacto.
export const friendlyModel = (raw) => {
  if (!raw) return raw;
  const s = String(raw).trim();
  // Samsung: códigos tipo SM-XddddL (L = letra de región opcional).
  // Strip de la letra final solo si los 4 chars previos son dígitos.
  if (/^SM-[A-Z]\d{3,4}[A-Z]?$/.test(s)) {
    const base = /[A-Z]$/.test(s) && /\d/.test(s[s.length - 2]) ? s.slice(0, -1) : s;
    if (MAP[base]) return MAP[base];
  }
  // Match exacto (Xiaomi, OnePlus, Motorola).
  if (MAP[s]) return MAP[s];
  // Pixel: si UA-CH devolvió "Pixel 8 Pro" directo, lo dejamos.
  if (/^Pixel\b/.test(s)) return s;
  // No match → devolvemos el código crudo (sigue siendo info útil).
  return s;
};
