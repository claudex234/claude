// track-hit — wrapper server-side de la RPC track_hit (Competidores).
// Misma idea que open-apertura: lee IP real del request, geolocaliza con
// ip-api.com server-side, llama a la RPC con p_ip/p_pais.
//
// verify_jwt=false: la llaman anónimos (pixel embebido en sitios externos
// o el renderer público #/t/<slug>). track_hit RPC ya está grant a anon.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

const clientIp = (req: Request): string | null => {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || null;
};

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
      pais: j.countryCode || null,
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
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const slug = typeof body.slug === "string" ? body.slug : null;
  if (!slug) return json({ error: "slug requerido" }, 400);

  const ip = clientIp(req);
  const geo = ip ? await geolocate(ip) : null;

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.rpc("track_hit", {
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
    p_query: body.query ?? null,
    p_meta: meta,
    p_ip: ip,
  });

  if (error) return json({ error: error.message }, 500);
  return json({ id: data ?? null });
});
