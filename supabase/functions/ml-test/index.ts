// ml-test v1 — testa API ML de dentro do Supabase
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: creds } = await sb.from("affiliate_credentials").select("credentials").eq("store", "mercado_livre").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const accessToken = String(creds?.credentials?.access_token ?? "").trim();

  const results: any = { access_token_presente: !!accessToken };

  // Teste 1: COM token
  try {
    const r = await fetch("https://api.mercadolibre.com/sites/MLB/search?q=fone+bluetooth&limit=3", {
      headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" }
    });
    const body = await r.text();
    results.com_token = { status: r.status, body: body.slice(0, 300) };
  } catch(e) { results.com_token = { error: String(e) }; }

  // Teste 2: SEM token
  try {
    const r = await fetch("https://api.mercadolibre.com/sites/MLB/search?q=fone+bluetooth&limit=3", {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
    });
    const body = await r.text();
    results.sem_token = { status: r.status, body: body.slice(0, 300) };
  } catch(e) { results.sem_token = { error: String(e) }; }

  // Teste 3: /users/me com token
  try {
    const r = await fetch("https://api.mercadolibre.com/users/me", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const body = await r.text();
    results.users_me = { status: r.status, body: body.slice(0, 200) };
  } catch(e) { results.users_me = { error: String(e) }; }

  return new Response(JSON.stringify(results, null, 2), { headers: { ...CORS, "content-type": "application/json" } });
});
