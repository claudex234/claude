// open-apertura — wrapper server-side de la RPC open_apertura.
//
// Por qué existe: la geo del visitante (país) NO debe venir del cliente,
// es falsificable. Esta función lee la IP real del request, la geolocaliza
// server-side via ip-api.com, y recién ahí llama a open_apertura con el
// país resuelto + flags de proxy/hosting. El cliente ya no manda país.
//
// verify_jwt=false: la llaman visitantes anónimos del visor público,
// igual que la RPC open_apertura (grant a anon). No hay nada que
// autenticar — el slug es la única credencial.
//
// Deploy: vía MCP de Supabase (deploy_edge_function) o `supabase functions
// deploy open-apertura --no-verify-jwt`.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Usamos SERVICE_ROLE para que la RPC reconozca al caller como trusted
// y acepte p_ip/p_pais resueltos server-side. Si llamáramos con anon,
// la RPC ignora esos params y el gate solo_pe queda inerte (cualquiera
// podría llamar directo a la RPC con p_pais='PE' bypaseando el bloqueo).
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// IP real del cliente. x-forwarded-for puede traer varias (proxychain);
// la primera es el origen.
const clientIp = (req: Request): string | null => {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || null;
};

// Geo server-side via ip-api.com (free: HTTP, sin key, 45 req/min por IP
// de origen — acá la IP de origen es la del edge runtime de Supabase).
// Devuelve null si no se pudo resolver; el caller NO bloquea en ese caso.
const geolocate = async (ip: string) => {
  try {
    const fields =
      "status,countryCode,country,city,regionName,proxy,hosting,mobile,as,isp";
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=${fields}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.status !== "success") return null;
    return {
      // Uppercase defensivo: ip-api devuelve ISO-3166-alpha2 en mayúscula,
      // pero si algún día cambian el case el gate solo_pe se rompería en
      // silencio (compara contra 'PE' literal).
      pais: (j.countryCode || "").toUpperCase() || null,
      pais_nombre: j.country || null,
      ciudad: j.city || null,
      region: j.regionName || null,
      proxy: !!j.proxy,
      hosting: !!j.hosting,
      mobile: !!j.mobile,
      asn: j.as || null,
      isp: j.isp || null,
    };
  } catch {
    return null;
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const slug = typeof body.slug === "string" ? body.slug : null;
  if (!slug) return json({ error: "slug requerido" }, 400);

  const ip = clientIp(req);
  const geo = ip ? await geolocate(ip) : null;

  // meta = fingerprint del cliente + enriquecimiento geo server-side.
  const meta = (body.meta && typeof body.meta === "object")
    ? body.meta as Record<string, unknown>
    : {};
  meta.geo = {
    source: "ip-api",
    resolved: !!geo,
    proxy: geo?.proxy ?? null,
    hosting: geo?.hosting ?? null,
    mobile_net: geo?.mobile ?? null,
    asn: geo?.asn ?? null,
    isp: geo?.isp ?? null,
  };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.rpc("open_apertura", {
    p_slug: slug,
    p_user_agent: body.user_agent ?? null,
    p_dispositivo: body.dispositivo ?? null,
    p_os: body.os ?? null,
    p_referrer: body.referrer ?? null,
    p_idioma: body.idioma ?? null,
    p_timezone: body.timezone ?? null,
    p_pais: geo?.pais ?? null,
    p_ciudad: geo?.ciudad ?? null,
    p_region: geo?.region ?? null,
    p_meta: meta,
    p_ip: ip,
  });

  if (error) return json({ error: error.message }, 500);

  // data === null ⇒ open_apertura bloqueó por solo_pe (país != PE).
  return json({ id: data ?? null, blocked: data === null });
});
