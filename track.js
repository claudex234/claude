// track.js — tracking pixel standalone. Se carga vía:
//   <script src="https://.../track.js?s=<slug>" async></script>
// pegado en cualquier sitio externo. Al cargar registra un hit en el
// backend con UA, dispositivo, OS, idioma, timezone, geo (best-effort),
// query params del host y meta (screen, hardware). Sin dependencias.
//
// ES5 a propósito para máxima compatibilidad. Errores se tragan.
(function () {
  try {
    var script = document.currentScript;
    if (!script) {
      var ss = document.getElementsByTagName("script");
      script = ss[ss.length - 1];
    }
    var src = (script && script.src) || "";
    var m = src.match(/[?&]s=([A-Za-z0-9_-]+)/);
    var slug = m && m[1];
    if (!slug) return;

    var SUPABASE_URL = "https://epyzxfchztyplrckxgku.supabase.co";
    var KEY = "sb_publishable_Kp51g56NtEMf2RRaj_0jtQ_QYjVB-o8";

    var ua = navigator.userAgent || "";
    var lang = navigator.language || null;
    var tz = null;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}

    // Mini UA parser (subset de lib/ua_parser.js).
    function detectOS(s) {
      if (/Windows NT 11/.test(s)) return "Windows 11";
      if (/Windows NT 10/.test(s)) return "Windows 10/11";
      if (/Windows NT/.test(s))    return "Windows";
      if (/iPhone|iPad|iPod/.test(s)) {
        var k = s.match(/OS (\d+)[._](\d+)/);
        return k ? "iOS " + k[1] + "." + k[2] : "iOS";
      }
      if (/Mac OS X/.test(s)) {
        var k2 = s.match(/Mac OS X (\d+)[._](\d+)/);
        return k2 ? "macOS " + k2[1] + "." + k2[2] : "macOS";
      }
      if (/Android/.test(s)) {
        var k3 = s.match(/Android (\d+(?:\.\d+)?)/);
        return k3 ? "Android " + k3[1] : "Android";
      }
      if (/CrOS/.test(s)) return "ChromeOS";
      if (/Linux/.test(s)) return "Linux";
      return "Desconocido";
    }
    function detectBrowser(s) {
      if (/Edg\//.test(s)) return "Edge";
      if (/SamsungBrowser/.test(s)) return "Samsung Internet";
      if (/OPR\//.test(s)) return "Opera";
      if (/Chrome/.test(s) && !/Edg|OPR/.test(s)) return "Chrome";
      if (/Firefox/.test(s)) return "Firefox";
      if (/Safari/.test(s) && !/Chrome/.test(s)) return "Safari";
      return "Browser";
    }
    function detectDevice(s) {
      if (/iPhone/.test(s)) return "iPhone";
      if (/iPad/.test(s))   return "iPad";
      if (/Android/.test(s) && /Mobile/.test(s)) {
        var k = s.match(/;\s*([^;)]+?)\s+Build/);
        return k ? k[1].trim() : "Android";
      }
      if (/Android/.test(s)) return "Tablet Android";
      if (/Macintosh|Mac OS X/.test(s)) return "Mac";
      if (/Windows/.test(s)) return "PC";
      if (/Linux/.test(s))   return "Linux";
      return "Desconocido";
    }

    var dispositivo = detectDevice(ua) + " · " + detectBrowser(ua);
    var os = detectOS(ua);

    // Query params del host page (donde está embebido el snippet).
    var queryObj = null;
    try {
      var p = new URLSearchParams(location.search);
      var q = {};
      p.forEach(function (v, k) { q[k] = v; });
      if (Object.keys(q).length) queryObj = q;
    } catch (e) {}

    function post(body) {
      try {
        fetch(SUPABASE_URL + "/rest/v1/rpc/track_hit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": KEY,
            "Authorization": "Bearer " + KEY,
          },
          body: JSON.stringify(body),
          keepalive: true,
        }).catch(function () {});
      } catch (e) {}
    }

    function send(geo) {
      post({
        p_slug: slug,
        p_user_agent: ua,
        p_dispositivo: dispositivo,
        p_os: os,
        // Referrer = URL del host (página donde está pegado el snippet).
        p_referrer: (location && location.href) || null,
        p_idioma: lang,
        p_timezone: tz,
        p_pais: geo && geo.country ? geo.country : null,
        p_ciudad: null,
        p_region: null,
        p_query: queryObj,
        p_meta: meta,
      });
    }

    // Reúne todo el fingerprint pasivo (sin permisos).
    function gpuInfo() {
      try {
        var c = document.createElement("canvas");
        var gl = c.getContext("webgl") || c.getContext("experimental-webgl");
        if (!gl) return {};
        var ext = gl.getExtension("WEBGL_debug_renderer_info");
        if (!ext) return {};
        return {
          gpu_vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || null,
          gpu_renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || null,
        };
      } catch (e) { return {}; }
    }
    function browserVer() {
      var u = ua, tests = [
        [/Edg\/([\d.]+)/, "Edge"],
        [/OPR\/([\d.]+)/, "Opera"],
        [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
        [/Chrome\/([\d.]+)/, "Chrome", /Edg|OPR|SamsungBrowser/],
        [/Firefox\/([\d.]+)/, "Firefox"],
        [/Version\/([\d.]+).*Safari\//, "Safari", /Chrome|Edg|OPR/],
      ];
      for (var i = 0; i < tests.length; i++) {
        var t = tests[i];
        if (t[2] && t[2].test(u)) continue;
        var m = u.match(t[0]);
        if (m) return { browser_name: t[1], browser_version: m[1] };
      }
      return {};
    }
    var conn = navigator.connection || {};
    var meta = {
      upstream_referrer: document.referrer || null,
      screen: (screen.width || 0) + "x" + (screen.height || 0),
      viewport: (window.innerWidth || 0) + "x" + (window.innerHeight || 0),
      pixel_ratio: window.devicePixelRatio || 1,
      color_depth: screen.colorDepth || null,
      orientation: (screen.orientation && screen.orientation.type) || null,
      hwc: navigator.hardwareConcurrency || null,
      ram_gb: navigator.deviceMemory || null,
      touch_points: navigator.maxTouchPoints || 0,
      net_type: conn.effectiveType || conn.type || null,
      net_downlink_mbps: conn.downlink || null,
      net_rtt_ms: conn.rtt || null,
      net_save_data: conn.saveData || false,
      online: navigator.onLine,
      languages: (navigator.languages || []).slice(0, 4),
      do_not_track: navigator.doNotTrack || null,
      cookies_enabled: navigator.cookieEnabled,
      pdf_viewer: !!navigator.pdfViewerEnabled,
      webdriver: !!navigator.webdriver,
      vendor: navigator.vendor || null,
      via: "pixel",
    };
    var bv = browserVer();
    for (var k in bv) meta[k] = bv[k];
    var gi = gpuInfo();
    for (var k2 in gi) meta[k2] = gi[k2];

    // Enriquece os con User-Agent Client Hints (Chrome/Edge) para
    // distinguir Win10 vs Win11. Best-effort; si no soporta, no hace nada.
    var uad = navigator.userAgentData;
    if (uad && uad.getHighEntropyValues) {
      try {
        uad.getHighEntropyValues(["platformVersion"]).then(function (h) {
          if (uad.platform === "Windows" && h.platformVersion) {
            var major = parseInt(h.platformVersion.split(".")[0], 10);
            if (isFinite(major)) os = major >= 13 ? "Windows 11" : "Windows 10";
          }
        }).catch(function(){});
      } catch (e) {}
    }

    // Geo best-effort con timeout corto. Si falla / tarda, mandamos sin geo.
    var done = false;
    var to = setTimeout(function () { if (!done) { done = true; send(null); } }, 1500);
    try {
      fetch("https://api.country.is/", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (g) { if (!done) { done = true; clearTimeout(to); send(g); } })
        .catch(function () { if (!done) { done = true; clearTimeout(to); send(null); } });
    } catch (e) {
      if (!done) { done = true; clearTimeout(to); send(null); }
    }
  } catch (e) {}
})();
