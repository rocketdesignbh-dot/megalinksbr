// r — redirect rápido para links curtos próprios (megalinksbr.com.br/r/CODE)
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.pathname.split("/").filter(Boolean).pop();

  if (!code) {
    return new Response("Link não encontrado", { status: 404 });
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data, error } = await sb.from("short_links").select("long_url").eq("code", code).maybeSingle();

    if (error || !data?.long_url) {
      return new Response("Link não encontrado ou expirado", { status: 404 });
    }

    // Incrementa contador de cliques (não bloqueia o redirect)
    sb.from("short_links").update({ clicks: undefined }).eq("code", code).then(() => {});
    sb.rpc("increment_short_link_clicks", { p_code: code }).catch(() => {});

    return new Response(null, {
      status: 301,
      headers: { "Location": data.long_url, "Cache-Control": "no-cache" },
    });
  } catch (e) {
    return new Response("Erro interno", { status: 500 });
  }
});
