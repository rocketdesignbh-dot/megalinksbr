// capi-send v1 — relay server-side pra Meta Conversion API (CAPI).
// Recebe um evento do frontend (trackEvent), busca o Pixel ID em marketing_settings,
// le o access token de um secret do Supabase (META_CAPI_ACCESS_TOKEN — nunca fica no banco
// nem em coluna publica), hasheia PII (email) em SHA256 e envia pro graph.facebook.com.
// event_id é compartilhado com o dataLayer/pixel do navegador pra o Meta deduplicar o evento.
// Best-effort: sempre responde 200, mesmo em erro logico (token/pixel ausente), pra nao gerar
// ruido no console do usuario final — o chamador (trackEvent) dispara e esquece (fire-and-forget).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CAPI_TOKEN = Deno.env.get("META_CAPI_ACCESS_TOKEN") ?? "";
const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v21.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapa de eventos internos (usados no trackEvent do front) -> nomes padrao do Meta
const EVENT_MAP: Record<string, string> = {
  cadastro: "CompleteRegistration",
  trial_iniciado: "StartTrial",
  compra: "Purchase",
  assinatura: "Subscribe",
};

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    if (!CAPI_TOKEN) {
      console.warn("[capi-send] META_CAPI_ACCESS_TOKEN não configurado — evento ignorado");
      return new Response(JSON.stringify({ ok: false, error: "META_CAPI_ACCESS_TOKEN não configurado" }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { event_name, email, event_id, event_source_url, fbp, fbc, value, currency } = body || {};

    const metaEvent = EVENT_MAP[String(event_name || "")];
    if (!metaEvent) {
      return new Response(JSON.stringify({ ok: false, error: `evento '${event_name}' não mapeado pra Conversion API` }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const sb = (SUPABASE_URL && SERVICE_ROLE) ? createClient(SUPABASE_URL, SERVICE_ROLE) : null;
    const { data: mkt } = sb ? await sb.from("marketing_settings").select("meta_pixel_id, meta_capi_test_event_code").eq("id", 1).maybeSingle() : { data: null as any };
    const pixelId = mkt?.meta_pixel_id;
    if (!pixelId) {
      return new Response(JSON.stringify({ ok: false, error: "meta_pixel_id não configurado em marketing_settings" }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const userData: Record<string, unknown> = {
      client_ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      client_user_agent: req.headers.get("user-agent") || undefined,
    };
    if (email) userData.em = [await sha256Hex(String(email))];
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    const eventPayload: Record<string, unknown> = {
      event_name: metaEvent,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: event_source_url || undefined,
      event_id: event_id || undefined,
      user_data: userData,
    };
    if (value != null) eventPayload.custom_data = { value, currency: currency || "BRL" };

    const payload: Record<string, unknown> = { data: [eventPayload] };
    if (mkt?.meta_capi_test_event_code) payload.test_event_code = mkt.meta_capi_test_event_code;

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(CAPI_TOKEN)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[capi-send] Meta respondeu erro:", JSON.stringify(d));
      return new Response(JSON.stringify({ ok: false, error: d?.error?.message || `HTTP ${r.status}` }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }
    console.log(`[capi-send] evento enviado: ${metaEvent} pixel=${pixelId} events_received=${d?.events_received}`);
    return new Response(JSON.stringify({ ok: true, meta_response: d }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
