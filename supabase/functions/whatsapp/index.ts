// Mega Links BR · Edge Function "whatsapp"
// Proxy autenticado (JWT Supabase) para o motor Baileys.
// Esconde o token do engine do front-end. Ações: generate-qr, check-admin.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ENGINE_URL = Deno.env.get("WA_ENGINE_URL");
const ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
async function passthrough(r: Response) {
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!ENGINE_URL) {
      return json({
        error: "wa_engine_not_configured",
        hint: "Defina WA_ENGINE_URL e WA_ENGINE_TOKEN nas variaveis da Edge Function.",
      }, 503);
    }
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = body.action;

    if (action === "generate-qr") {
      const r = await fetch(`${ENGINE_URL}/generate-qr`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${ENGINE_TOKEN}` },
        body: JSON.stringify({ phone: body.phone }),
      });
      return passthrough(r);
    }

    if (action === "check-admin") {
      const link = encodeURIComponent(String(body.link ?? ""));
      const r = await fetch(`${ENGINE_URL}/check-admin?link=${link}`, {
        headers: { authorization: `Bearer ${ENGINE_TOKEN}` },
      });
      return passthrough(r);
    }

    return json({ error: "unknown_action", actions: ["generate-qr", "check-admin"] }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
