// ml-token-refresh v1
// Renova access_token de todos os usuários ML antes de expirar
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ML_CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
const ML_CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const cronSecret = req.headers.get("x-cron-secret") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (CRON_SECRET && cronSecret !== CRON_SECRET && !(auth.startsWith("Bearer ") && auth.length > 20)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Busca todos os registros ML com refresh_token
  const { data: rows } = await sb
    .from("affiliate_credentials")
    .select("id, credentials")
    .eq("store", "mercado_livre")
    .eq("connected", true);

  if (!rows?.length) {
    return new Response(JSON.stringify({ ok: true, renovados: 0, msg: "Nenhum token ML encontrado" }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  let renovados = 0;
  let erros = 0;
  const detalhes: string[] = [];

  for (const row of rows) {
    const refreshToken = String(row.credentials?.refresh_token || "").trim();
    if (!refreshToken) { detalhes.push(`id=${row.id}: sem refresh_token`); continue; }

    // Verifica se o token ainda é recente (menos de 5h)
    const obtido = row.credentials?.token_obtained_at;
    if (obtido) {
      const idadeMs = Date.now() - new Date(obtido).getTime();
      if (idadeMs < 5 * 3600 * 1000) {
        detalhes.push(`id=${row.id}: token ainda válido (${Math.round(idadeMs/60000)}min)`);
        continue;
      }
    }

    try {
      const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
        method: "POST",
        headers: { "accept": "application/json", "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: ML_CLIENT_ID,
          client_secret: ML_CLIENT_SECRET,
          refresh_token: refreshToken,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        detalhes.push(`id=${row.id}: erro HTTP ${tokenRes.status} — ${err.slice(0,100)}`);
        erros++;
        continue;
      }

      const token = await tokenRes.json();
      await sb.from("affiliate_credentials").update({
        credentials: {
          ...row.credentials,
          access_token: token.access_token,
          refresh_token: token.refresh_token || refreshToken,
          token_obtained_at: new Date().toISOString(),
          token_expires_in: token.expires_in,
        }
      }).eq("id", row.id);

      renovados++;
      detalhes.push(`id=${row.id}: renovado OK (user_ml=${token.user_id})`);
    } catch (e) {
      erros++;
      detalhes.push(`id=${row.id}: exceção — ${String(e)}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, total: rows.length, renovados, erros, detalhes }),
    { headers: { ...CORS, "content-type": "application/json" } }
  );
});
