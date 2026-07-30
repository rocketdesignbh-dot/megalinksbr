// ml-short-link v8 — domínio próprio (megalinksbr.com.br/r/CODE) via tabela short_links
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHORT_DOMAIN = "https://megalinksbr.com.br"; // ajustar se usar subdomínio dedicado

function generateCode(len = 7): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0,O,1,l,I para evitar confusão
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const { url: longUrl } = await req.json();
    if (!longUrl) return new Response(JSON.stringify({ ok: false, error: "url obrigatória" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Tenta identificar usuário (opcional, não bloqueia se não vier)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const userSb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: { user } } = await userSb.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = user?.id || null;
      } catch (_) {}
    }

    // Verifica se já existe um link curto para essa URL exata (evita duplicatas)
    const { data: existing } = await sb.from("short_links").select("code").eq("long_url", longUrl).maybeSingle();
    if (existing?.code) {
      console.log(`[short-link v8] reusando code existente: ${existing.code}`);
      return new Response(JSON.stringify({ ok: true, short_url: `${SHORT_DOMAIN}/r/${existing.code}` }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Gera novo código único (retry em caso de colisão rara)
    let code = generateCode();
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await sb.from("short_links").select("code").eq("code", code).maybeSingle();
      if (!clash) break;
      code = generateCode();
    }

    const { error } = await sb.from("short_links").insert({ code, long_url: longUrl, user_id: userId });
    if (error) {
      console.warn("[short-link v8] insert falhou:", error.message);
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    console.log(`[short-link v8] criado: ${code} -> ${longUrl.slice(0, 80)}`);
    return new Response(JSON.stringify({ ok: true, short_url: `${SHORT_DOMAIN}/r/${code}` }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
