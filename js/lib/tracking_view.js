// Render del bloque de tracking en el detalle de la proforma:
// hero del visitante actual + score de engagement + tag de tipo +
// stats resumidas y tabla de aperturas.

import { fmtTime, escapeHtml as e, ago } from "./utils.js";
import { isLiveApertura } from "../data/api/aperturas.js";
import { icon } from "./icons.js";

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

// Browser freshness: cuántos meses atrás respecto al stable más reciente
// conocido al commit. Si el cliente tiene una versión MAYOR (dev/canary),
// devuelve "actualizado". Si el browser no está en la tabla, null.
// Bumpear estas constantes cada tanto manualmente (release ciclo ~1 mes
// para chromium-based + firefox, ~6 meses para safari).
const LATEST_BROWSERS = {
  "Chrome": 137, "Google Chrome": 137, "Chromium": 137,
  "Microsoft Edge": 137, "Edge": 137,
  "Opera": 122, "Samsung Internet": 27,
  "Firefox": 138, "Safari": 18,
};
const MONTHS_PER_MAJOR = {
  "Chrome": 1, "Google Chrome": 1, "Chromium": 1,
  "Microsoft Edge": 1, "Edge": 1,
  "Opera": 1, "Samsung Internet": 2,
  "Firefox": 1, "Safari": 6,
};
const browserFreshness = (name, versionStr) => {
  if (!name || !versionStr) return null;
  const latest = LATEST_BROWSERS[name];
  const perMajor = MONTHS_PER_MAJOR[name] || 1;
  if (!latest) return null;
  const cur = parseInt(String(versionStr).split(".")[0], 10);
  if (!Number.isFinite(cur)) return null;
  const months = Math.max(0, (latest - cur) * perMajor);
  if (months <= 1) return { cls: "fresh", label: "actualizado" };
  if (months < 6) return { cls: "stale", label: `${months} meses atrás` };
  return { cls: "old", label: `${months} meses desactualizado` };
};

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
  if (meta.bloqueado) return { label: "Bloqueada", cls: "tag-blocked" };
  if (meta.webdriver) return { label: "Bot / automation", cls: "tag-bot" };
  if (a.reenvio) return { label: "Otra IP", cls: "tag-resend" };
  if (a.pais && a.pais !== "PE") return { label: "Visita extranjera", cls: "tag-foreigner" };
  const duracion = a.duracion_s || 0;
  const clicks = a.clicks || 0;
  if (duracion >= 30 && clicks >= 2) return { label: "Cliente activo", cls: "tag-active" };
  if (duracion >= 10) return { label: "Cliente", cls: "tag-client" };
  if (duracion < 5) return { label: "Rebote", cls: "tag-bounce" };
  return { label: "Visitante", cls: "tag-client" };
};

// Combina downlink + RTT en una etiqueta legible.
const formatNetwork = (meta) => {
  if (!meta.net_type) return null;
  const parts = [meta.net_type.toUpperCase()];
  if (meta.net_downlink_mbps != null) parts.push(`${meta.net_downlink_mbps} Mbps`);
  if (meta.net_rtt_ms != null) parts.push(`${meta.net_rtt_ms}ms`);
  return parts.join(" · ");
};

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
          ${a.reenvio ? '<span class="badge badge-warn" style="font-size:10px" title="Apertura desde una IP o UA distinta a la primera">otra IP</span>' : ""}
          ${a.impresion ? '<span class="badge" style="font-size:10px">impresión</span>' : ""}
          ${a.descarga ? '<span class="badge" style="font-size:10px">descarga</span>' : ""}
          ${a.print_screen_attempts > 0 ? `<span class="badge" style="font-size:10px;color:var(--danger)">prntscr ${a.print_screen_attempts}</span>` : ""}
          ${a.clicks > 0 ? `<span class="badge" style="font-size:10px">${a.clicks} clicks</span>` : ""}
        </div>
      </td>
    </tr>`;
};

const aperturasTable = (aperturas) => `
  <div class="card">
    <div class="card-header"><div class="card-title">Aperturas · ${aperturas.length}</div></div>
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
  </div>`;

// === Export principal ====================================================

import { fmtDateTime } from "./utils.js";

// Card "Sesión actual" — datos del último visitante (dispositivo, OS,
// IP, ubicación, idioma, timezone, pantalla, CPU cores, referrer).
// Si la apertura es reciente (<30s), muestra el badge verde pulsante
// "Abierta ahora".
// Fila de tabla helper: solo emite si val no es null/undefined/"".
const row = (label, val, mono = false) => {
  if (val === null || val === undefined || val === "" || val === "—") return "";
  return `<tr>
    <td style="color:var(--text-3);width:140px">${label}</td>
    <td${mono ? ' style="font-family:var(--font-mono);font-size:11.5px"' : ""}>${e(String(val))}</td>
  </tr>`;
};

const yesNo = (v) => v === true ? "Sí" : (v === false ? "No" : null);

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
  const fresh = browserFreshness(meta.browser_name, meta.browser_version);
  const arch = [meta.arch, meta.bitness && `${meta.bitness}-bit`].filter(Boolean).join(" · ");
  const net = formatNetwork(meta);
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
        ${net ? `<div class="session-hero-meta">${icon("wifi", 12)}<span>${e(net)}</span></div>` : ""}
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
      <span class="visitor-tag ${tag.cls}">${tag.label}</span>
      <span style="font-size:11px;color:var(--text-mute)">
        ${fmtTime(duracion)} · ${scroll}% scroll · ${clicks} clicks
      </span>
    </div>`;
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
  if (meta.webdriver) flags.push('<span class="badge" style="font-size:10px;color:var(--danger);border-color:var(--danger)">webdriver/bot</span>');
  if (meta.do_not_track === "1") flags.push('<span class="badge" style="font-size:10px">Do-Not-Track</span>');
  if (meta.net_save_data) flags.push('<span class="badge" style="font-size:10px">Save-Data</span>');
  if (meta.online === false) flags.push('<span class="badge" style="font-size:10px">offline</span>');
  if (meta.touch_points > 0) flags.push(`<span class="badge" style="font-size:10px">touch · ${meta.touch_points}</span>`);

  // Detalles técnicos: siempre visibles. El <details> colapsable se
  // descartó porque se cerraba en cada re-render del panel live.
  const details = `
    <div class="session-details">
      <div class="session-details-title">Detalles técnicos</div>
      <table class="table" style="margin:0;font-size:12px">
        <tbody>
          ${row("Versión completa", browserFull, true)}
          ${row("Idiomas preferidos", meta.languages?.join(", "))}
          ${row("Zona horaria", a.timezone, true)}
          ${meta.screen ? `<tr><td colspan="2" style="background:var(--bg-soft);font-size:10.5px;color:var(--text-mute);text-transform:uppercase;letter-spacing:.5px;padding:6px 12px">Display</td></tr>` : ""}
          ${row("Pantalla", display)}
          ${row("Viewport", meta.viewport, true)}
          ${row("Orientación", meta.orientation)}
          ${meta.hwc || meta.ram_gb || meta.gpu_renderer ? `<tr><td colspan="2" style="background:var(--bg-soft);font-size:10.5px;color:var(--text-mute);text-transform:uppercase;letter-spacing:.5px;padding:6px 12px">Hardware</td></tr>` : ""}
          ${row("CPU cores", meta.hwc)}
          ${row("RAM", meta.ram_gb ? `${meta.ram_gb} GB` : null)}
          ${row("GPU vendor", meta.gpu_vendor)}
          ${row("GPU", meta.gpu_renderer)}
          ${flags.length ? `<tr><td style="color:var(--text-3);width:140px">Flags</td><td><div style="display:flex;gap:4px;flex-wrap:wrap">${flags.join("")}</div></td></tr>` : ""}
          ${a.referrer ? `<tr><td style="color:var(--text-3);width:140px">Referrer</td><td style="font-size:11px;color:var(--text-2);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e(a.referrer)}">${e(a.referrer)}</td></tr>` : ""}
        </tbody>
      </table>
    </div>`;

  return `
    <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden">
      ${hero}
      ${tagRow}
      ${engagement}
      ${details}
    </div>`;
};

export const renderTracking = (aperturas) => {
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
