// Recolección de datos del dispositivo del visitante, sin pedir permisos.
// Todo se manda al backend en el campo `meta` de la apertura/hit.
//
// Cubre: pantalla, viewport, GPU, hardware, red, locale, browser version,
// arquitectura del CPU, flags de privacidad (DNT, webdriver para bots).

const safeBool = (v) => (v === true || v === false ? v : null);

// Lee architecture/bitness/fullVersionList/model/platformVersion vía
// User-Agent Client Hints (Chrome/Edge/Brave). Devuelve {} en otros browsers.
const clientHints = async () => {
  try {
    const uad = navigator.userAgentData;
    if (!uad?.getHighEntropyValues) return {};
    const h = await uad.getHighEntropyValues([
      "architecture", "bitness", "fullVersionList",
      "model", "platformVersion", "wow64", "uaFullVersion",
    ]);
    const out = {
      arch: h.architecture || null,
      bitness: h.bitness || null,
      wow64: safeBool(h.wow64),
      model_real: h.model || null,
      platform_version: h.platformVersion || null,
      mobile: safeBool(uad.mobile),
    };
    if (Array.isArray(h.fullVersionList)) {
      const primary = h.fullVersionList.find((b) => !/Not[?A_]?Brand/i.test(b.brand));
      if (primary) {
        out.browser_name = primary.brand;
        out.browser_version_full = primary.version;
      }
    } else if (h.uaFullVersion) {
      out.browser_version_full = h.uaFullVersion;
    }
    return out;
  } catch { return {}; }
};

// GPU vendor + renderer vía WebGL. Útil para fingerprint / detectar
// laptops específicos. Falla en browsers sin canvas/webgl.
const gpuInfo = () => {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (!gl) return {};
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return {};
    return {
      gpu_vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || null,
      gpu_renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || null,
    };
  } catch { return {}; }
};

// Browser version parseada del UA string. Fallback para Safari/Firefox
// (no soportan Client Hints).
const browserVersionFromUA = (ua = navigator.userAgent) => {
  const tests = [
    [/Edg\/([\d.]+)/, "Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
    [/Chrome\/([\d.]+)/, "Chrome", /Edg|OPR|SamsungBrowser/],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/Version\/([\d.]+).*Safari\//, "Safari", /Chrome|Edg|OPR/],
  ];
  for (const [rx, name, excl] of tests) {
    if (excl && excl.test(ua)) continue;
    const m = ua.match(rx);
    if (m) return { browser_name: name, browser_version: m[1] };
  }
  return {};
};

export const collectDeviceInfo = async () => {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const base = {
    // --- Display ---
    screen: `${screen.width || 0}x${screen.height || 0}`,
    viewport: `${window.innerWidth || 0}x${window.innerHeight || 0}`,
    pixel_ratio: window.devicePixelRatio || 1,
    color_depth: screen.colorDepth || null,
    orientation: screen.orientation?.type || null,

    // --- Hardware ---
    hwc: navigator.hardwareConcurrency || null,
    ram_gb: navigator.deviceMemory || null,
    touch_points: navigator.maxTouchPoints || 0,

    // --- Red ---
    net_type: c?.effectiveType || c?.type || null,
    net_downlink_mbps: c?.downlink || null,
    net_rtt_ms: c?.rtt || null,
    net_save_data: c?.saveData || false,
    online: navigator.onLine,

    // --- Locale ---
    languages: (navigator.languages || []).slice(0, 4),

    // --- Privacidad / flags ---
    do_not_track: navigator.doNotTrack || null,
    cookies_enabled: navigator.cookieEnabled,
    pdf_viewer: !!navigator.pdfViewerEnabled,
    // bot/automation detection — true si el browser fue automatizado
    // (puppeteer, playwright, selenium con flags por defecto).
    webdriver: !!navigator.webdriver,

    // --- Misc ---
    vendor: navigator.vendor || null,
    via: "visor",
  };
  Object.assign(base, browserVersionFromUA());
  Object.assign(base, gpuInfo());
  Object.assign(base, await clientHints());
  return base;
};
