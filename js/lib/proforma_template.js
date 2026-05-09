// Plantilla de la hoja de proforma (port vanilla JS del diseño hecho en
// Claude Designer en la rama `prof`). La usan tanto el preview del editor
// como el visor público.
//
// Forma de los datos de entrada (data):
//   {
//     numero, fecha,
//     empresa: { nombre, ruc, contacto, telefono, email },
//     cliente: { razon, ruc, contacto, email, telefono },
//     terminos: { tiempoEntrega, lugarEntrega, garantia, validez, condiciones },
//     bancos: [{ nombre, cuenta, cci }, ...],
//     formaPago, titularBanco, firma,
//     precioIncluyeIGV: bool,
//     items: [{ qty, modelo, precio }, ...]   // modelo busca en PRODUCTOS
//   }

import { escapeHtml as e } from "./utils.js";

// SVG del logo "EDUBOARD" tipo línea outlined (port del componente JSX).
export const EDUBOARD_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 36" preserveAspectRatio="xMinYMid meet" role="img">
  <title>EduBoard</title>
  <g fill="none" stroke="#0a2540" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
    <line x1="8" y1="1" x2="162" y2="1"/>
    <line x1="169" y1="8" x2="169" y2="28"/>
    <line x1="8" y1="35" x2="162" y2="35"/>
    <line x1="1" y1="8" x2="1" y2="28"/>
    <path d="M8 1 Q 1 1 1 8"/>
    <path d="M162 1 Q 169 1 169 8"/>
    <path d="M8 35 Q 1 35 1 28"/>
    <path d="M162 35 Q 169 35 169 28"/>
  </g>
  <text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle"
        font-size="17" font-weight="700"
        font-family="system-ui, sans-serif" fill="#0a2540" letter-spacing="2">EDUBOARD</text>
</svg>
`.trim();

// Términos técnicos que se ponen en negrita automáticamente dentro de las specs.
const BOLD_TERMS = [
  "CPU", "GPU", "NPU", "RAM", "SSD", "NFC", "huella dactilar",
  "MOSH", "IK7", "IK10", "4K UHD", "Android 13", "ePTZ",
  "USB-C", "USB C full", "HDMI", "Wi-Fi", "Bluetooth", "bluetooth",
  "TOPS", "subwofer", "subwoofer", "VESA", "matriz",
  "Octacore A76+A55", "G610 MC4", "16 GB", "256 GB", "120°",
];
const RX_BOLD = new RegExp(
  "(" + BOLD_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")",
  "gi"
);
const boldify = (text) =>
  e(text).replace(RX_BOLD, (m) => `<b>${m}</b>`);

const fmtNum = (n) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const headerBlock = (data) => `
  <div class="pv-row pv-header-row">
    <div class="pv-header-left">
      <div class="pv-logo-wrap">${EDUBOARD_LOGO_SVG}</div>
      <div class="pv-emisor-meta">
        <div class="pv-emisor-name">${e(data.empresa.nombre)}</div>
        <div class="pv-emisor-ruc">RUC ${e(data.empresa.ruc)}</div>
      </div>
    </div>
    <div class="pv-header-right">
      <div class="pv-eyebrow">Cotización</div>
      <div class="pv-mono pv-mono-strong">${e(data.numero)}</div>
      <div class="pv-muted">${e(data.fecha)}</div>
    </div>
  </div>`;

const titleBlock = () => `<div class="pv-title">Cotización</div>`;

const clientesTerminosBlock = (data) => `
  <div class="pv-grid-2 pv-block-mt">
    <section class="pv-card pv-card-flat">
      <div class="pv-eyebrow">Cliente</div>
      <div class="pv-card-strong">${e(data.cliente.razon || "—")}</div>
      <div class="pv-card-rows">
        ${data.cliente.ruc ? `RUC ${e(data.cliente.ruc)}<br>` : ""}
        ${data.cliente.contacto && data.cliente.contacto !== "—" ? `${e(data.cliente.contacto)}<br>` : ""}
        ${data.cliente.email ? `${e(data.cliente.email)}<br>` : ""}
        ${data.cliente.telefono ? `${e(data.cliente.telefono)}` : ""}
      </div>
    </section>
    <section class="pv-card pv-card-flat">
      <div class="pv-eyebrow">Términos</div>
      <table class="pv-terms-table">
        <tbody>
          <tr><td>Tiempo entrega</td><td>${e(data.terminos.tiempoEntrega)}</td></tr>
          <tr><td>Lugar entrega</td><td>${e(data.terminos.lugarEntrega)}</td></tr>
          <tr><td>Garantía</td><td>${e(data.terminos.garantia)}</td></tr>
          <tr><td>Validez</td><td>${e(data.terminos.validez)} días</td></tr>
          <tr><td>Condiciones</td><td>${e(data.terminos.condiciones)}</td></tr>
        </tbody>
      </table>
    </section>
  </div>`;

const itemsBlock = (data, productos) => {
  const items = (data.items || [])
    .map((it) => ({ ...it, producto: productos[it.modelo] }))
    .filter((it) => it.producto)
    .map((it) => ({ ...it, total: it.qty * it.precio }));

  if (!items.length) {
    return `
      <div class="pv-items-head">
        <div>Descripción</div><div class="pv-c">Imagen ref</div>
        <div class="pv-c">Cant</div><div class="pv-r">P. Und</div><div class="pv-r">Subtotal</div>
      </div>
      <div class="pv-empty">Agregá productos para verlos acá</div>`;
  }

  const rowsHtml = items.map((it) => {
    const p = it.producto;
    const highlightSet = new Set(p.specsHighlight || []);
    const specs = (p.specs || []).map((s) => {
      const hl = highlightSet.has(s);
      return `<div class="pv-spec ${hl ? "pv-spec-hl" : ""}"><span class="pv-bullet">·</span><span>${boldify(s)}</span></div>`;
    }).join("");
    const incluye = (p.incluye || []).map((s) =>
      `<div class="pv-spec"><span class="pv-bullet">·</span><span>${e(s)}</span></div>`
    ).join("");
    const imgUrl = p.imagen || "";
    return `
      <div class="pv-item-row">
        <div class="pv-item-desc">
          <div class="pv-item-name">${e(p.nombre)}</div>
          ${specs}
          ${incluye ? `<div class="pv-incluye-title">Incluido en el paquete</div>${incluye}` : ""}
        </div>
        <div class="pv-item-img">
          ${imgUrl ? `<img src="${e(imgUrl)}" alt="${e(p.codigo || p.nombre)}" loading="lazy">` : ""}
          <div class="pv-item-codigo">${e(p.codigo || "")}</div>
        </div>
        <div class="pv-c pv-mono pv-mono-strong">${it.qty}</div>
        <div class="pv-r pv-mono">${fmtNum(it.precio)}</div>
        <div class="pv-r pv-mono pv-mono-strong">${fmtNum(it.total)}</div>
      </div>`;
  }).join("");

  return `
    <div class="pv-items-head">
      <div>Descripción</div>
      <div class="pv-c">Imagen ref</div>
      <div class="pv-c">Cant</div>
      <div class="pv-r">P. Und</div>
      <div class="pv-r">Subtotal</div>
    </div>
    ${rowsHtml}`;
};

const totalesBlock = (data, productos) => {
  const items = (data.items || [])
    .map((it) => ({ ...it, producto: productos[it.modelo] }))
    .filter((it) => it.producto);
  const subtotal = items.reduce((s, i) => s + i.qty * i.precio, 0);
  const igv = data.precioIncluyeIGV ? 0 : subtotal * 0.18;
  const total = subtotal + igv;
  return `
    <div class="pv-totales">
      ${!data.precioIncluyeIGV ? `
        <div class="pv-totales-row"><div>Subtotal</div><div class="pv-mono">S/ ${fmtNum(subtotal)}</div></div>
        <div class="pv-totales-row"><div>IGV (18%)</div><div class="pv-mono">S/ ${fmtNum(igv)}</div></div>` : ""}
      <div class="pv-totales-final">
        ${data.precioIncluyeIGV ? `<div class="pv-igv-note">* Precios incluyen IGV</div>` : `<div></div>`}
        <div class="pv-totales-total"><div>Total</div><div class="pv-mono">S/ ${fmtNum(total)}</div></div>
      </div>
    </div>`;
};

const bloquesPantallaBlock = (bloques, hasPantalla) => {
  if (!hasPantalla || !bloques) return "";
  const ok = (bloques.servicios || bloques.serviciosIncluidos || []).map((s) => `<div>· ${e(s)}</div>`).join("");
  const no = (bloques.noIncluido || []).map((s) => `<div>· ${e(s)}</div>`).join("");
  return `
    <div class="pv-grid-2 pv-block-mt">
      <div class="pv-card pv-card-flat">
        <div class="pv-eyebrow pv-ok">Servicios incluidos</div>
        ${ok || `<div class="pv-muted">—</div>`}
      </div>
      <div class="pv-card pv-card-flat">
        <div class="pv-eyebrow pv-bad">No incluido</div>
        ${no || `<div class="pv-muted">—</div>`}
      </div>
    </div>`;
};

const cuentasBlock = (data) => {
  const rows = (data.bancos || []).map((b) =>
    `<div><b>${e(b.nombre)}:</b> ${e(b.cuenta)} · <b>CCI:</b> ${e(b.cci)}</div>`
  ).join("");
  return `
    <div class="pv-card pv-card-flat pv-block-mt">
      <div class="pv-eyebrow">Cuentas bancarias</div>
      ${rows}
      <div class="pv-mt-4"><b>A nombre de:</b> ${e(data.titularBanco)}</div>
      <div><b>Forma de pago:</b> ${e(data.formaPago)}</div>
    </div>`;
};

const firmaBlock = (data) => `
  <div class="pv-firma">
    <div class="pv-firma-label">Atentamente,</div>
    <div class="pv-firma-name">${e(data.firma)}</div>
    <div class="pv-firma-cargo">Representante Legal · ${e(data.empresa.nombre)}</div>
  </div>`;

// Renderiza el contenido completo de la hoja como una sola cadena HTML.
// El caller envuelve esto en su propio <article class="pv-page">.
export const renderProformaContent = (data, productos, bloques) => {
  const hasPantalla = (data.items || []).some((it) => productos[it.modelo]?.tipo === "pantalla");
  return [
    headerBlock(data),
    titleBlock(),
    clientesTerminosBlock(data),
    itemsBlock(data, productos),
    totalesBlock(data, productos),
    bloquesPantallaBlock(bloques, hasPantalla),
    cuentasBlock(data),
    firmaBlock(data),
  ].join("");
};
