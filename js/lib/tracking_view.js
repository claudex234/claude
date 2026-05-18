// Render del bloque de tracking en el detalle de la proforma:
// hero del visitante actual + score de engagement + tag de tipo +
// stats resumidas y tabla de aperturas.

import { fmtTime, fmtDateTime, escapeHtml as e, ago } from "./utils.js";
import { isLiveApertura } from "../data/api/aperturas.js";
import { icon } from "./icons.js";
import { infoTip } from "./popover.js";

// === Helpers de presentación ============================================

// Decide qué icono mostrar para el dispositivo (laptop/smartphone/tablet).
const deviceTypeIcon = (a) => {
  const d = (a.dispositivo || "") + " " + (a.os || "");
  if (/iPhone|iPod/.test(d)) return "smartphone";
  if (/iPad/.test(d)) return "tablet";
  if (/Mobile|Android/.test(d) && !/Tablet/.test(d)) return "smartphone";
  if (/Tablet/.test(d)) return "tablet";
  return "laptop";
};

// Estado de <details> persistido en localStorage. El panel re-renderiza
// con cada poll del live indicator y perdíamos el estado de apertura.
// Cualquier <details data-persist-key="X"> graba "1"/"0" en esa key.
// Listener instalado en captura porque toggle no burbujea.
const isOpen = (key, defaultOpen) => {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultOpen;
    return v !== "0";
  } catch { return defaultOpen; }
};
let _toggleHooked = false;
const hookDetailsToggle = () => {
  if (_toggleHooked || typeof document === "undefined") return;
  _toggleHooked = true;
  document.addEventListener("toggle", (ev) => {
    const el = ev.target;
    const k = el && el.dataset && el.dataset.persistKey;
    if (k) { try { localStorage.setItem(k, el.open ? "1" : "0"); } catch {} }
  }, true);
};

// Browser freshness: descartado en favor de honestidad.
//
// Por qué no se calcula ya: Chrome desde 2023 CONGELA el UA string a
// "Chrome 110" por anti-fingerprinting, así que browser_version del UA
// es una mentira persistente. La única fuente confiable es UA-CH
// (browser_version_full), que solo Chromium-based exponen — Firefox y
// Safari NO. Cualquier cálculo "X meses desactualizado" sería ruleta
// (cliente con Chrome 140 real podría aparecer como "30 meses atrás").
//
// Además, manteníamos una tabla LATEST_BROWSERS hardcoded que envejecía
// con el código y nadie bumpea. Net: el label engañaba más que ayudaba.
const browserFreshness = () => null;

// Score 0-100 combinando duración (40), scroll (40), clicks (20).
const engagementScore = (a) => {
  const duracion = a.duracion_s || 0;
  const scroll = a.scroll_pct || 0;
  const clicks = a.clicks || 0;
  return Math.round(
    Math.min(duracion / 120, 1) * 40 +
    (scroll / 100) * 40 +
    Math.min(clicks / 10, 1) * 20
  );
};

const engagementClass = (s) => s >= 60 ? "high" : (s >= 30 ? "medium" : "low");

// Clasifica al visitante con un tag prominente.
const classifyVisitor = (a) => {
  const meta = a.meta || {};
  if (meta.bloqueado) return { label: "Bloqueada", cls: "tag-blocked", tip: null };
  if (meta.webdriver) return { label: "Bot / automation", cls: "tag-bot", tip: "Detectado solo por navigator.webdriver=true. Bots con stealth plugins lo evaden." };
  if (a.pais && a.pais !== "PE") return { label: "Visita extranjera", cls: "tag-foreigner" };
  const duracion = a.duracion_s || 0;
  const clicks = a.clicks || 0;
  if (duracion >= 30 && clicks >= 2) return { label: "Cliente activo", cls: "tag-active" };
  if (duracion >= 10) return { label: "Cliente", cls: "tag-client" };
  // < 5s era el umbral original, pero la carga inicial del visor en
  // mobile low-end ya consume 3-5s. Subimos a 8s para que un cliente
  // que abre y mira "un segundo" no quede etiquetado como rebote duro.
  if (duracion < 8) return { label: "Rebote", cls: "tag-bounce" };
  return { label: "Visitante", cls: "tag-client" };
};

// Combina downlink + RTT en una etiqueta legible.
// El effectiveType de la Network Info API ('slow-2g','2g','3g','4g') NO
// distingue cable/wifi/celular — '4g' significa simplemente "rápida"
// y se devuelve para Ethernet también. Por eso anteponemos "≈" y el
// title aclara la limitación de la API.
const NET_LABELS = { "slow-2g": "lenta", "2g": "2G", "3g": "3G", "4g": "rápida" };
const NET_TOOLTIP = "Velocidad estimada por la Network Information API del browser. NO distingue Wi-Fi, Ethernet, 4G ni 5G — solo el rango aproximado de velocidad. JS no puede saber qué tipo de red usa el visitante.";
const formatNetwork = (meta) => {
  if (!meta.net_type) return null;
  const label = NET_LABELS[meta.net_type] || meta.net_type.toUpperCase();
  const parts = [label];
  if (meta.net_downlink_mbps != null) parts.push(`${meta.net_downlink_mbps} Mbps`);
  if (meta.net_rtt_ms != null) parts.push(`${meta.net_rtt_ms}ms`);
  return parts.join(" · ");
};

// Limpia el string del GPU. Chrome/Edge en Windows lo envuelven en ANGLE:
//   "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002684) Direct3D11 vs_5_0 ps_5_0)"
// → "NVIDIA GeForce RTX 4070". Otros browsers/SO suelen devolver el
// nombre del GPU directo y limpio.
const cleanGpu = (raw) => {
  if (!raw) return null;
  let s = String(raw).trim();
  const angle = s.match(/^ANGLE\s*\(([^]*)\)$/);
  if (angle) {
    let inner = angle[1];
    inner = inner.replace(/^[^,]+,\s*/, "");                      // vendor prefix
    inner = inner.replace(/\s*\(0x[0-9a-f]+\)/i, "");              // device id
    inner = inner.replace(/\s+(Direct3D\d+|D3D\d+|Vulkan|Metal|OpenGL)\b.*$/i, ""); // backend tail
    s = inner.trim();
  }
  return s.replace(/\s+/g, " ").trim() || null;
};

// Línea de hardware para el hero: CPU cores · RAM · GPU (limpio + truncado).
// '≥X GB' porque deviceMemory devuelve buckets (ver tooltip en details).
const formatHardware = (meta) => {
  const parts = [];
  if (meta.hwc) parts.push(`${meta.hwc} cores`);
  if (meta.ram_gb) parts.push(`≥${meta.ram_gb} GB RAM`);
  const gpu = cleanGpu(meta.gpu_renderer);
  if (gpu) parts.push(gpu.length > 36 ? gpu.slice(0, 33) + "…" : gpu);
  return parts.length ? parts.join(" · ") : null;
};
const HW_TOOLTIP = "Datos de las APIs del browser. 'cores' puede estar capado en iOS. 'RAM' es un bucket (≥) no el valor real. GPU puede estar enmascarado en navegadores con privacy fuerte.";

// === Agregados ============================================================

const trackingStats = (aperturas) => {
  const reales = aperturas.filter((a) => !a.meta?.bloqueado);
  const ips = new Set(reales.map((a) => a.ip).filter(Boolean));
  const total_s = reales.reduce((s, a) => s + (a.duracion_s || 0), 0);
  return {
    aperturas: reales.length,
    ips: ips.size,
    total_s,
    ultima: reales[0]?.abierta_at || null,
    impresiones: reales.filter((a) => a.impresion).length,
    descargas: reales.filter((a) => a.descarga).length,
    reenvios: reales.filter((a) => a.reenvio).length,
    bloqueadas: aperturas.filter((a) => a.meta?.bloqueado).length,
  };
};

// === Subcomponentes (HTML strings) =======================================

// Resumen en texto plano (antes era un grid de 4 cards). Las cifras claves
// quedan en negrita, los detalles secundarios en mute.
const statsSummary = (s) => `
  <div class="tracking-summary">
    <div><strong>${s.aperturas}</strong> aperturas · <span class="mute">${s.ips} IP${s.ips === 1 ? "" : "s"} únicas</span></div>
    <div><strong>${fmtTime(s.total_s)}</strong> leído total · <span class="mute">última ${ago(s.ultima)}</span></div>
    <div><strong>${s.reenvios}</strong> con IP distinta · <span class="mute">${s.bloqueadas} bloqueadas por país</span></div>
    <div><strong>${s.impresiones}</strong> impresiones · <span class="mute">${s.descargas} descargas</span></div>
  </div>`;

const aperturasRow = (a) => {
  const lugar = [a.ciudad, a.pais].filter(Boolean).join(", ") || "—";
  const bloqueada = !!a.meta?.bloqueado;
  return `
    <tr class="row" style="${bloqueada ? "opacity:.55" : ""}">
      <td style="font-family:var(--font-mono);font-size:11.5px">${a._whenLabel}</td>
      <td>
        <div style="font-size:12.5px">${e(a.dispositivo || "—")}</div>
        <div style="font-size:11px;color:var(--text-mute);margin-top:2px">${e(lugar)} · ${e(a.os || "")}</div>
      </td>
      <td style="text-align:right;font-family:var(--font-mono);font-size:12px">${fmtTime(a.duracion_s || 0)}</td>
      <td style="text-align:right;font-family:var(--font-mono);font-size:12px">${a.scroll_pct || 0}%</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${bloqueada ? '<span class="badge" style="font-size:10px;color:var(--danger);border-color:var(--danger)">bloqueada</span>' : ""}
          ${a.impresion ? `<span class="badge" style="font-size:10px">impresión${infoTip("Disparó el evento beforeprint (Ctrl+P o menú → Imprimir). NO detecta capturas del SO ni guardado como PDF desde el menú nativo de Safari mobile.")}</span>` : ""}
          ${a.descarga ? `<span class="badge" style="font-size:10px">Ctrl+S${infoTip("Solo detecta Ctrl+S / Cmd+S. NO detecta PrintScreen, screenshot del SO, foto al monitor, o guardado desde el menú nativo del browser.")}</span>` : ""}
          ${a.print_screen_attempts > 0 ? `<span class="badge" style="font-size:10px;color:var(--danger)">prntscr ${a.print_screen_attempts}${infoTip("Tecla PrintScreen detectada (solo desktop). En mobile las screenshots del SO no son detectables desde JS.")}</span>` : ""}
          ${a.clicks > 0 ? `<span class="badge" style="font-size:10px">${a.clicks} clicks${infoTip("Cualquier click dentro del visor — incluye watermark, botones del browser, etc. No solo sobre el contenido.")}</span>` : ""}
        </div>
      </td>
    </tr>`;
};

const aperturasTable = (aperturas) => `
  <details class="card collapsible-card" data-persist-key="tracking_aperturas_open"${isOpen("tracking_aperturas_open", true) ? " open" : ""}>
    <summary class="card-header card-summary"><div class="card-title">Aperturas · ${aperturas.length}</div></summary>
    <div class="card-body" style="padding:0;max-height:520px;overflow-y:auto">
      <table class="table" style="margin:0">
        <thead>
          <tr>
            <th style="width:130px">Cuándo</th>
            <th>Dispositivo / lugar</th>
            <th style="width:80px;text-align:right">Tiempo</th>
            <th style="width:80px;text-align:right">Scroll</th>
            <th style="width:180px">Flags</th>
          </tr>
        </thead>
        <tbody>
          ${aperturas.map(aperturasRow).join("")}
        </tbody>
      </table>
    </div>
  </details>`;

// === Export principal ====================================================

// Card "Sesión actual" — datos del último visitante (dispositivo, OS,
// IP, ubicación, idioma, timezone, pantalla, CPU cores, referrer).
// Si la apertura es reciente (<30s), muestra el badge verde pulsante
// "Abierta ahora".
// Fila de tabla helper: solo emite si val no es null/undefined/"".
// `tip` (opcional): tooltip que aclara limitaciones del dato (ej. la
// API JS de RAM devuelve un bucket, no la RAM real).
const row = (label, val, mono = false, tip = null) => {
  if (val === null || val === undefined || val === "" || val === "—") return "";
  return `<tr>
    <td style="color:var(--text-3);width:140px">${label}${tip ? infoTip(tip) : ""}</td>
    <td${mono ? ' style="font-family:var(--font-mono);font-size:11.5px"' : ""}>${e(String(val))}</td>
  </tr>`;
};

const yesNo = (v) => v === true ? "Sí" : (v === false ? "No" : null);

// Heatmap mini sobre la hoja A4 (ratio 210:297). Cada click es un dot
// translúcido con mix-blend-mode multiply — overlaps se oscurecen solos
// sin tener que calcular densidad. Zooms se marcan con un "+" azul.
const renderHeatmap = (clicks_xy, zooms) => {
  const clicks = Array.isArray(clicks_xy) ? clicks_xy : [];
  const zoomList = Array.isArray(zooms) ? zooms : [];
  if (!clicks.length && !zoomList.length) return "";
  const dots = clicks.map((c) =>
    `<div class="hm-dot" style="left:${(c.x * 100).toFixed(2)}%;top:${(c.y * 100).toFixed(2)}%"></div>`
  ).join("");
  const marks = zoomList.map((z) =>
    `<div class="hm-zoom" style="left:${(z.x * 100).toFixed(2)}%;top:${(z.y * 100).toFixed(2)}%" title="zoom ×${z.s} @ ${z.t}s">+</div>`
  ).join("");
  return `
    <div class="heatmap-section">
      <div class="heatmap-label">Mapa de interacción · ${clicks.length} click${clicks.length === 1 ? "" : "s"}${zoomList.length ? ` · ${zoomList.length} zoom${zoomList.length === 1 ? "" : "s"}` : ""}</div>
      <div class="heatmap-doc">${dots}${marks}</div>
    </div>`;
};

const sessionCard = (a) => {
  if (!a) return "";
  const live = isLiveApertura(a);
  const meta = a.meta || {};
  const bloqueada = !!meta.bloqueado;
  const lugar = [a.ciudad, a.pais].filter(Boolean).join(", ");
  const browser = meta.browser_name && meta.browser_version
    ? `${meta.browser_name} ${meta.browser_version.split(".")[0]}`
    : (meta.browser_name || null);
  const browserFull = meta.browser_version_full || meta.browser_version || null;
  const fresh = browserFreshness();
  const arch = [meta.arch, meta.bitness && `${meta.bitness}-bit`].filter(Boolean).join(" · ");
  const net = formatNetwork(meta);
  const hw = formatHardware(meta);
  const display = meta.screen
    ? `${meta.screen}${meta.pixel_ratio && meta.pixel_ratio !== 1 ? ` @${meta.pixel_ratio}x` : ""}${meta.color_depth ? ` · ${meta.color_depth}bit` : ""}`
    : null;

  // --- HERO: icono device + título grande + subline + chip país + red ---
  const deviceLabel = (a.dispositivo || "Desconocido").split("·")[0].trim();
  const heroTitle = `${e(deviceLabel)}${browser ? ` · ${e(browser)}` : ""}${fresh ? ` <span class="browser-fresh browser-fresh-${fresh.cls}">${fresh.label}</span>` : ""}`;
  const heroSub = [a.os, arch].filter(Boolean).join(" · ");
  const countryCls = a.pais === "PE" ? "is-pe" : "is-other";
  const hero = `
    <div class="session-hero">
      <div class="session-hero-icon">${icon(deviceTypeIcon(a), 24)}</div>
      <div class="session-hero-main">
        <div class="session-hero-title">
          ${heroTitle}
          ${bloqueada
            ? '<span class="badge" style="font-size:10px;color:var(--danger);border-color:var(--danger)">Bloqueada</span>'
            : live
              ? '<span class="live-pill"><span class="live-dot"></span>Abierta ahora</span>'
              : ""}
        </div>
        ${heroSub ? `<div class="session-hero-sub">${e(heroSub)}</div>` : ""}
        ${lugar || a.ip ? `
          <div class="session-hero-meta">
            ${a.pais ? `<span class="country-chip ${countryCls}">${e(a.pais)}</span>` : ""}
            ${a.ciudad ? `<span>${e(a.ciudad)}</span>` : ""}
            ${a.ip ? `<span style="color:var(--text-mute);font-family:var(--font-mono);font-size:11px">${e(a.ip)}</span>` : ""}
          </div>` : ""}
        ${net ? `<div class="session-hero-meta">${icon("zap", 12)}<span>${e(net)}</span>${infoTip(NET_TOOLTIP)}</div>` : ""}
        ${hw ? `<div class="session-hero-meta">${icon("cpu", 12)}<span>${e(hw)}</span>${infoTip(HW_TOOLTIP)}</div>` : ""}
        ${live ? `<div class="session-hero-meta" style="color:var(--accent-strong);font-weight:600">${icon("eye", 12)}<span>Mirando hace ${fmtTime(a.duracion_s || 0)}</span></div>` : ""}
      </div>
    </div>`;

  // --- TAG visitante + ENGAGEMENT score ---
  const tag = classifyVisitor(a);
  const score = engagementScore(a);
  const scoreCls = engagementClass(score);
  // Aportes de cada señal al score (mismos pesos que engagementScore).
  const duracion = a.duracion_s || 0;
  const scroll = a.scroll_pct || 0;
  const clicks = a.clicks || 0;
  const ptsDur = Math.round(Math.min(duracion / 120, 1) * 40);
  const ptsScr = Math.round((scroll / 100) * 40);
  const ptsClk = Math.round(Math.min(clicks / 10, 1) * 20);
  const tagRow = `
    <div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border)">
      <span class="visitor-tag ${tag.cls}">${tag.label}${tag.tip ? infoTip(tag.tip) : ""}</span>
      <span style="font-size:11px;color:var(--text-mute)">
        ${fmtTime(duracion)} · ${scroll}% scroll · ${clicks} clicks
      </span>
    </div>`;

  // --- HEATMAP: clicks (x,y normalizado) + zooms sobre la hoja A4 ---
  // Los dots usan mix-blend-mode multiply: overlap = más oscuro = hot spot
  // sin tener que calcular densidad. Coords ya vienen en 0-1.
  const heatmap = renderHeatmap(a.clicks_xy, a.zooms);

  const engagement = `
    <div class="engagement">
      <div class="engagement-label">Engagement</div>
      <div class="engagement-bar" title="Duración ${ptsDur}/40 + Scroll ${ptsScr}/40 + Clicks ${ptsClk}/20"><div class="engagement-fill ${scoreCls}" style="width:${score}%"></div></div>
      <div class="engagement-score">${score}</div>
    </div>
    <div class="engagement-breakdown">
      <span><span class="muted">Duración</span> <strong>${ptsDur}</strong>/40 <span class="muted">(${fmtTime(duracion)})</span></span>
      <span><span class="muted">Scroll</span> <strong>${ptsScr}</strong>/40 <span class="muted">(${scroll}%)</span></span>
      <span><span class="muted">Clicks</span> <strong>${ptsClk}</strong>/20 <span class="muted">(${clicks})</span></span>
    </div>`;

  // --- DETALLES técnicos colapsables ---
  const flags = [];
  if (meta.webdriver) flags.push(`<span class="badge" style="font-size:10px;color:var(--danger);border-color:var(--danger)">webdriver/bot${infoTip("navigator.webdriver=true → puppeteer/selenium/playwright con flags default. Bots reales con stealth plugins (puppeteer-stealth, undetected-chromedriver) lo bypasean. Esto detecta solo automation poco sofisticada.")}</span>`);
  if (meta.do_not_track === "1") flags.push('<span class="badge" style="font-size:10px">Do-Not-Track</span>');
  if (meta.net_save_data) flags.push('<span class="badge" style="font-size:10px">Save-Data</span>');
  if (meta.online === false) flags.push('<span class="badge" style="font-size:10px">offline</span>');
  if (meta.touch_points > 0) flags.push(`<span class="badge" style="font-size:10px">touch · ${meta.touch_points}</span>`);

  // Detalles técnicos colapsables. Estado persistido en localStorage
  // ("tracking_details_open") para sobrevivir los re-renders del panel
  // live. Default: cerrado.
  const details = `
    <details class="session-details" data-persist-key="tracking_details_open"${isOpen("tracking_details_open", true) ? " open" : ""}>
      <summary>Detalles técnicos</summary>
      <table class="table" style="margin:0;font-size:12px">
        <tbody>
          ${row("Versión completa", browserFull, true)}
          ${row("Idiomas preferidos", meta.languages?.join(", "))}
          ${row("Zona horaria", a.timezone, true)}
          ${meta.screen ? `<tr><td colspan="2" style="background:var(--bg-soft);font-size:10.5px;color:var(--text-mute);text-transform:uppercase;letter-spacing:.5px;padding:6px 12px">Display</td></tr>` : ""}
          ${row("Pantalla", display, false, "Valor en CSS pixels lógicos, no físicos. Un iPhone con pantalla real 1170×2532 reporta 390×844 porque cada CSS px = 3 px físicos (ver pixel ratio).")}
          ${row("Viewport", meta.viewport, true)}
          ${row("Orientación", meta.orientation)}
          ${meta.hwc || meta.ram_gb || meta.gpu_renderer ? `<tr><td colspan="2" style="background:var(--bg-soft);font-size:10.5px;color:var(--text-mute);text-transform:uppercase;letter-spacing:.5px;padding:6px 12px">Hardware</td></tr>` : ""}
          ${row("CPU cores", meta.hwc, false, "navigator.hardwareConcurrency. En iOS/Safari está capado a 2 incluso en chips con 6+ cores reales. Privacy extensions también pueden falsearlo.")}
          ${row("RAM", meta.ram_gb ? `≥${meta.ram_gb} GB` : null, false, "navigator.deviceMemory devuelve un BUCKET (0.25/0.5/1/2/4/8 GB) por privacy. '8 GB' acá puede ser un equipo con 16, 32 o más. Es el piso, no el valor real.")}
          ${row("GPU vendor", meta.gpu_vendor, false, "WebGL UNMASKED_VENDOR. Safari y Brave en privacy mode pueden devolver un valor genérico o vacío.")}
          ${row("GPU", meta.gpu_renderer, false, "WebGL UNMASKED_RENDERER. Mismo caveat que el vendor — puede estar enmascarado en navegadores con privacy fuerte.")}
          ${flags.length ? `<tr><td style="color:var(--text-3);width:140px">Flags</td><td><div style="display:flex;gap:4px;flex-wrap:wrap">${flags.join("")}</div></td></tr>` : ""}
          ${a.referrer ? `<tr><td style="color:var(--text-3);width:140px">Referrer</td><td style="font-size:11px;color:var(--text-2);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e(a.referrer)}">${e(a.referrer)}</td></tr>` : ""}
        </tbody>
      </table>
    </details>`;

  return `
    <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden">
      ${hero}
      ${tagRow}
      ${engagement}
      ${heatmap}
      ${details}
    </div>`;
};

export const renderTracking = (aperturas) => {
  hookDetailsToggle();
  if (!aperturas || !aperturas.length) {
    return `<div class="card">
      <div class="card-header"><div class="card-title">Tracking</div></div>
      <div class="card-body" style="text-align:center;padding:32px 24px;color:var(--text-mute);font-size:13px">
        Sin aperturas todavía. Cuando el cliente abra el link verás acá hora, dispositivo, ciudad y comportamiento.
      </div>
    </div>`;
  }
  // Pre-cómputo de etiqueta de fecha por fila (evita map dentro del template).
  const withLabels = aperturas.map((a) => ({ ...a, _whenLabel: fmtDateTime(a.abierta_at) }));
  // La sesión actual = la apertura MÁS reciente (aunque sea bloqueada).
  // Útil para detectar intentos con VPN: si vemos una bloqueada nueva,
  // sabemos que alguien fuera de PE acaba de intentar entrar.
  const ultima = withLabels[0];
  return [
    sessionCard(ultima),
    statsSummary(trackingStats(withLabels)),
    aperturasTable(withLabels),
  ].join("");
};
