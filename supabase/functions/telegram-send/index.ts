// Mega Links BR · Edge Function "telegram-send"
// Envia mensagem para um canal/grupo Telegram via bot @megalinksbr_bot
// Chamada pelo frontend (JWT) ou pg_cron (x-cron-secret)
//
// CORRECAO DE SEGURANCA: antes, qualquer usuario logado podia enviar mensagem
// para QUALQUER chat_id onde o bot estivesse. Agora, quando a chamada vem de um
// usuario comum, exigimos que o chat_id pertenca a um canal cadastrado por ele
// em telegram_channels (admin e cron/service seguem sem restricao).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth
  const secret = req.headers.get("x-cron-secret") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  const isCron = !!CRON_SECRET && secret === CRON_SECRET;
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const isService = !!token && token === SERVICE_ROLE;

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  let userId: string | null = null;
  let isAdmin = false;

  if (!isCron && !isService) {
    if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    userId = user.id;
    const { data: profile } = await sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    isAdmin = profile?.is_admin === true;
  }

  // Verifica se o chat_id pertence ao usuario autenticado.
  async function ownsChat(chatId: string | number): Promise<boolean> {
    if (isCron || isService || isAdmin) return true;
    if (!userId) return false;
    const value = String(chatId);
    const { data } = await sb
      .from("telegram_channels")
      .select("id")
      .eq("user_id", userId)
      .or(`chat_id.eq.${value},username.eq.${value}`)
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "send";

  // ── VALIDAR canal (testar se bot tem acesso) ──
  // Permanece liberado para o usuario logado: e o passo de cadastro de um canal novo,
  // que por definicao ainda nao esta em telegram_channels. Nao envia conteudo.
  if (action === "validate") {
    const { chat_id } = body;
    if (!chat_id) return new Response(JSON.stringify({ error: "chat_id obrigatorio" }), { status: 400, headers: corsHeaders });
    try {
      const r = await fetch(`${TG_API}/getChat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id }),
      });
      const d = await r.json();
      if (!d.ok) return new Response(JSON.stringify({ error: d.description ?? "Bot sem acesso ao canal" }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({
        ok: true,
        name: d.result.title ?? d.result.username ?? chat_id,
        type: d.result.type,
        members: d.result.member_count ?? null,
      }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
    }
  }

  // ── ENVIAR mensagem ──
  if (action === "send") {
    const { chat_id, text, image_url, parse_mode } = body;
    if (!chat_id || !text) return new Response(JSON.stringify({ error: "chat_id e text obrigatorios" }), { status: 400, headers: corsHeaders });

    if (!(await ownsChat(chat_id))) {
      return new Response(JSON.stringify({ error: "forbidden: canal nao pertence a este usuario" }), { status: 403, headers: corsHeaders });
    }

    try {
      let r;
      if (image_url) {
        r = await fetch(`${TG_API}/sendPhoto`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id, photo: image_url, caption: text, parse_mode: parse_mode ?? "HTML" }),
        });
      } else {
        r = await fetch(`${TG_API}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id, text, parse_mode: parse_mode ?? "HTML", disable_web_page_preview: false }),
        });
      }
      const d = await r.json();
      if (!d.ok) return new Response(JSON.stringify({ error: d.description ?? "Erro ao enviar" }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ ok: true, message_id: d.result?.message_id }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: "action invalida" }), { status: 400, headers: corsHeaders });
});
