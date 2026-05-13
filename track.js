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
        p_meta: {
          // Página previa del visitante (de dónde vino al host).
          upstream_referrer: document.referrer || null,
          screen: (screen.width || 0) + "x" + (screen.height || 0),
          hwc: navigator.hardwareConcurrency || null,
          via: "pixel",
        },
      });
    }

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
