// Parser ligero de navigator.userAgent. Heurísticas suficientes para
// distinguir dispositivos comunes; no compite con bibliotecas grandes.
// Devuelve { dispositivo, os } amigables: "iPhone 14 · Safari" / "iOS 17".
//
// IMPORTANTE Windows 10 vs 11: el UA string reporta "Windows NT 10.0"
// para AMBOS (Microsoft mantuvo el string por compatibilidad). La única
// forma fiable de distinguir es User-Agent Client Hints (Chrome/Edge):
//   navigator.userAgentData.getHighEntropyValues(["platformVersion"])
// devuelve "13.0.0" o superior para Windows 11. Usá `enrichUA()` (async)
// para obtener ese dato refinado.

const detectOS = (ua) => {
  if (/Windows NT 11/.test(ua)) return "Windows 11";
  // Sin Client Hints no sabemos si es 10 u 11 — etiquetamos genérico.
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Windows NT 6\.3/.test(ua)) return "Windows 8.1";
  if (/Windows NT/.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/.test(ua)) {
    const m = ua.match(/OS (\d+)[._](\d+)/);
    return m ? `iOS ${m[1]}.${m[2]}` : "iOS";
  }
  if (/Mac OS X/.test(ua)) {
    const m = ua.match(/Mac OS X (\d+)[._](\d+)/);
    return m ? `macOS ${m[1]}.${m[2]}` : "macOS";
  }
  if (/Android/.test(ua)) {
    const m = ua.match(/Android (\d+(?:\.\d+)?)/);
    return m ? `Android ${m[1]}` : "Android";
  }
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Desconocido";
};

const detectBrowser = (ua) => {
  if (/Edg\//.test(ua)) return "Edge";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Brave/.test(ua)) return "Brave";
  if (/Chrome/.test(ua) && !/Edg|OPR|Brave/.test(ua)) return "Chrome";
  if (/Firefox/.test(ua)) return "Firefox";
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
  return "Browser";
};

const detectDevice = (ua) => {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/iPod/.test(ua)) return "iPod";
  if (/Android/.test(ua) && /Mobile/.test(ua)) {
    const m = ua.match(/;\s*([^;)]+?)\s+Build/);
    return m ? m[1].trim() : "Android";
  }
  if (/Android/.test(ua)) return "Tablet Android";
  if (/Macintosh|Mac OS X/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "PC";
  if (/Linux/.test(ua)) return "Linux";
  return "Desconocido";
};

export const parseUA = (ua = navigator.userAgent) => {
  const device = detectDevice(ua);
  const browser = detectBrowser(ua);
  const os = detectOS(ua);
  return {
    dispositivo: `${device} · ${browser}`,
    os,
    isMobile: /Mobi|Android|iPhone|iPad|iPod/.test(ua),
  };
};

// Enriquece el resultado de parseUA() con User-Agent Client Hints
// (Chrome 90+, Edge, Brave, Opera). Resuelve la ambigüedad Win10/11 y
// agrega el modelo real del dispositivo Android cuando está disponible.
// Falla silencioso en browsers que no soportan UA-CH (Firefox, Safari).
export const enrichUA = async (base) => {
  try {
    const uad = navigator.userAgentData;
    if (!uad?.getHighEntropyValues) return base;
    const hints = await uad.getHighEntropyValues(["platformVersion", "model"]);
    // Windows: platformVersion mayor >= 13 → Windows 11. Menor → 10.
    if (uad.platform === "Windows" && hints.platformVersion) {
      const major = parseInt(hints.platformVersion.split(".")[0], 10);
      if (Number.isFinite(major)) {
        base.os = major >= 13 ? "Windows 11" : "Windows 10";
      }
    }
    // Android: hint.model trae el nombre comercial real (ej. "SM-A546B").
    if (hints.model && /Android/.test(uad.platform || "")) {
      const browser = base.dispositivo.split("·")[1]?.trim() || "Chrome";
      base.dispositivo = `${hints.model} · ${browser}`;
    }
  } catch {}
  return base;
};
