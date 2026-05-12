// Parser ligero de navigator.userAgent. Heurísticas suficientes para
// distinguir dispositivos comunes; no compite con bibliotecas grandes.
// Devuelve { dispositivo, os } amigables: "iPhone 14 · Safari" / "iOS 17".

const detectOS = (ua) => {
  if (/Windows NT 11/.test(ua)) return "Windows 11";
  if (/Windows NT 10/.test(ua)) return "Windows 10";
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
