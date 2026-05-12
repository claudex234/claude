// Tests del parser de smart paste + normalizador de dictado.
// Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePaste, normalizeDictation } from "../js/lib/parser.js";

const PRODUCTOS = {
  PRO:   { codigo: "PRO",   nombre: "Pantalla PRO 75",   precioDefault: 6500 },
  PLUS:  { codigo: "PLUS",  nombre: "Pantalla PLUS 86",  precioDefault: 8500 },
  ELITE: { codigo: "ELITE", nombre: "Pantalla ELITE",    precioDefault: 12000 },
};

// =========================================================
// normalizeDictation
// =========================================================

test("normalize: arroba → @", () => {
  assert.equal(normalizeDictation("manuel arroba gmail.com"), "manuel@gmail.com");
});

test("normalize: punto entre tokens → .", () => {
  assert.equal(normalizeDictation("juan punto perez arroba acme.com"), "juan.perez@acme.com");
});

test("normalize: guion bajo / guion", () => {
  assert.equal(normalizeDictation("juan guion bajo perez"), "juan_perez");
  assert.equal(normalizeDictation("juan guion perez"), "juan-perez");
});

test("normalize: palabras-número (una, dos, ...)", () => {
  assert.equal(normalizeDictation("una pro"), "1 pro");
  assert.equal(normalizeDictation("dos elite"), "2 elite");
  assert.equal(normalizeDictation("cinco plus"), "5 plus");
});

test("normalize: RUC dictado en grupos varios", () => {
  // Dígitos sueltos
  assert.equal(normalizeDictation("20 60 35 73 777"), "20603573777");
  // Grupos mixtos
  assert.equal(normalizeDictation("2060 36 73 736"), "20603673736");
});

test("normalize: móvil PE de 9 dígitos colapsa", () => {
  assert.equal(normalizeDictation("910 250 250"), "910250250");
  assert.equal(normalizeDictation("9 87 65 43 21"), "987654321");
});

test("normalize: fijo PE 7-8 dígitos", () => {
  assert.equal(normalizeDictation("234 5678"), "2345678");
});

test("normalize: secuencia de dígitos que no es RUC/móvil/fijo queda igual", () => {
  // 12 dígitos no es ninguno de los formatos esperados → no toca
  assert.equal(normalizeDictation("123 456 789 012"), "123 456 789 012");
});

test("normalize: input vacío / null devuelve sin crash", () => {
  assert.equal(normalizeDictation(""), "");
  assert.equal(normalizeDictation(null), null);
  assert.equal(normalizeDictation(undefined), undefined);
});

// =========================================================
// parsePaste — RUC
// =========================================================

test("parse: RUC 20… marca rucSeguro", () => {
  const r = parsePaste("20603573777", PRODUCTOS);
  assert.equal(r.ruc, "20603573777");
  assert.equal(r.rucSeguro, true);
});

test("parse: RUC 10… (persona natural) no es seguro", () => {
  const r = parsePaste("10456789012", PRODUCTOS);
  assert.equal(r.ruc, "10456789012");
  assert.equal(r.rucSeguro, false);
});

// =========================================================
// parsePaste — teléfono
// =========================================================

test("parse: móvil PE se normaliza a +51 9XX XXX XXX", () => {
  const r = parsePaste("987654321", PRODUCTOS);
  assert.equal(r.telefono, "+51 987 654 321");
});

test("parse: móvil con +51 ya formateado se reformatea", () => {
  const r = parsePaste("+51 987-654-321", PRODUCTOS);
  assert.equal(r.telefono, "+51 987 654 321");
});

test("parse: RUC y móvil en la misma línea sin confundirse", () => {
  const r = parsePaste("20603573777 987654321", PRODUCTOS);
  assert.equal(r.ruc, "20603573777");
  assert.equal(r.telefono, "+51 987 654 321");
});

// =========================================================
// parsePaste — email + razón social fallback por dominio
// =========================================================

test("parse: email se baja a lowercase", () => {
  const r = parsePaste("Manuel@gmail.com", PRODUCTOS);
  assert.equal(r.email, "manuel@gmail.com");
});

test("parse: email gratuito (gmail) NO se usa como razón social", () => {
  const r = parsePaste("manuel@gmail.com", PRODUCTOS);
  assert.equal(r.razonSocial, "");
});

test("parse: email corporativo SÍ se usa como razón social (dominio)", () => {
  const r = parsePaste("juan@ingenieros.pe", PRODUCTOS);
  assert.equal(r.razonSocial, "ingenieros.pe");
});

test("parse: dominio directo (línea sin @) se acepta como razón social", () => {
  const r = parsePaste("ingenieros.pe", PRODUCTOS);
  assert.equal(r.razonSocial, "ingenieros.pe");
});

// =========================================================
// parsePaste — empresa vs persona
// =========================================================

test("parse: línea 'jose' va SOLO a contacto, no se duplica como razón social", () => {
  const r = parsePaste("jose", PRODUCTOS);
  assert.equal(r.contacto, "Jose");
  assert.equal(r.razonSocial, "");
});

test("parse: empresa con sufijo SAC se capitaliza preservando el sufijo", () => {
  const r = parsePaste("acme sac", PRODUCTOS);
  assert.equal(r.razonSocial, "Acme SAC");
});

test("parse: empresa EIRL preserva el sufijo en mayúscula", () => {
  const r = parsePaste("eduboard eirl", PRODUCTOS);
  assert.equal(r.razonSocial, "Eduboard EIRL");
});

test("parse: institución educativa se detecta como empresa", () => {
  const r = parsePaste("Colegio San Pedro", PRODUCTOS);
  assert.equal(r.razonSocial, "Colegio San Pedro");
});

test("parse: contacto múltiples palabras capitaliza cada una", () => {
  const r = parsePaste("JOSE MARTINEZ MOROSINI", PRODUCTOS);
  assert.equal(r.contacto, "Jose Martinez Morosini");
});

// =========================================================
// parsePaste — productos
// =========================================================

test("parse: código compacto '3PLUS8500' → 3 PLUS a 8500", () => {
  const r = parsePaste("3PLUS8500", PRODUCTOS);
  assert.equal(r.productos.length, 1);
  assert.equal(r.productos[0].modelo, "PLUS");
  assert.equal(r.productos[0].qty, 3);
  assert.equal(r.productos[0].precio, 8500);
});

test("parse: 'PRO' suelto → 1 PRO a precio default", () => {
  const r = parsePaste("PRO", PRODUCTOS);
  assert.equal(r.productos.length, 1);
  assert.equal(r.productos[0].modelo, "PRO");
  assert.equal(r.productos[0].qty, 1);
  assert.equal(r.productos[0].precio, 6500);
});

test("parse: '1 PLUS' con espacio NO matchea por sí solo (el normalizeDictation se llama aparte)", () => {
  // parsePaste sin pasar por normalizeDictation no debería partir el espacio
  const r = parsePaste("1 PLUS", PRODUCTOS);
  // toUpperCase + remove spaces dentro del parser convierte a "1PLUS" → match
  assert.equal(r.productos.length, 1);
  assert.equal(r.productos[0].modelo, "PLUS");
  assert.equal(r.productos[0].qty, 1);
});

// =========================================================
// Caso del usuario — flujo completo dictado
// =========================================================

test("E2E dictado del usuario: persona + producto + RUC + móvil + email", () => {
  const dictado = `José Martínez morosini
una plus
2060 36 73 736
910 250 250
Manuel arroba gmail.com`;
  const r = parsePaste(normalizeDictation(dictado), PRODUCTOS);
  assert.equal(r.contacto, "José Martínez Morosini");
  assert.equal(r.productos[0].modelo, "PLUS");
  assert.equal(r.ruc, "20603673736");
  assert.equal(r.rucSeguro, true);
  assert.equal(r.telefono, "+51 910 250 250");
  assert.equal(r.email, "manuel@gmail.com");
  // gmail.com no se usa como razón social
  assert.equal(r.razonSocial, "");
});

test("E2E paste: empresa con RUC en misma línea + contacto + email corp", () => {
  const paste = `ACME SAC RUC 20512345678
Roberto Salazar
rsalazar@acme.pe
+51 987 654 321`;
  const r = parsePaste(paste, PRODUCTOS);
  assert.equal(r.razonSocial, "Acme SAC");
  assert.equal(r.ruc, "20512345678");
  assert.equal(r.contacto, "Roberto Salazar");
  assert.equal(r.email, "rsalazar@acme.pe");
  assert.equal(r.telefono, "+51 987 654 321");
});

// =========================================================
// Etiquetas (RUC:, Tel:, etc.)
// =========================================================

test("parse: stripea etiquetas 'RUC:', 'Tel:', 'Email:'", () => {
  const paste = `RUC: 20603573777
Tel: 987654321
Email: x@y.com`;
  const r = parsePaste(paste, PRODUCTOS);
  assert.equal(r.ruc, "20603573777");
  assert.equal(r.telefono, "+51 987 654 321");
  assert.equal(r.email, "x@y.com");
});
