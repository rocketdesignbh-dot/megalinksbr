// Mega Links BR · Edge Function "group-blast" v3 — regenera link de afiliado no momento do post
// Disparo manual imediato de TODOS os produtos de um Grupo de Oferta.
// Uso: planos sem automação 24/7 (ex.: Starter) — limitado a 1x/24h por grupo.
// Ignora start_hour/end_hour/loop/interval propositalmente (é um disparo único, não automação).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENGINE_URL = Deno.env.get("WA_ENGINE_URL") ?? "";
const ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

const BLAST_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1x por 24h corridas

const CTAS = [
  "⚡ Corre! Esse preço dura minutos.",
  "🛒 Toque no link antes que esgote!",
  "💸 Cupom ativo SÓ HOJE — aproveita!",
  "🔥 Oferta relâmpago! Não perca essa.",
  "😱 Achei esse preço e vim compartilhar!",
  "🎯 Melhor preço que encontrei hoje.",
  "✅ Testei e aprovei — vale muito a pena!",
  "🚀 Limitado! Corra antes que acabe.",
];
function sortearCta(): string {
  return CTAS[Math.floor(Math.random() * CTAS.length)];
}

async function fetchWithTimeout(url: string, opts: RequestInit, ms = 10000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

// Gera o link de afiliado personalizado do usuário a partir do link original do produto.
// Espelha a lógica do frontend (prGerarLinkAfil no index.html) para garantir que o Post
// Automático e o Disparo Manual sempre usem o link mais atual com as credenciais do usuário
// — mesmo que elas tenham sido configuradas DEPOIS de o produto já estar salvo no grupo.
function gerarLinkAfiliado(url: string, store: string | null, cred: Record<string, string> | null): string {
  if (!url) return url;
  if (!cred || !store) return url;
  const val = (k: string) => String(cred[k] || "").trim();

  if (store === "shopee") {
    const afId = val("ID de Afiliado");
    if (!afId) return url;
    const clean = url.split("#")[0];
    return `https://s.shopee.com.br/an_redir?origin_link=${encodeURIComponent(clean)}&affiliate_id=${encodeURIComponent(afId)}`;
  }

  const anyId = Object.values(cred).find((v) => v && String(v).trim()) || "";
  if (!anyId) return url;

  try {
    if (store === "mercado_livre") {
      const clean = url.split("#")[0].split("%23")[0];
      const mattTool = val("matt_tool ID");
      const etiqueta = val("Etiqueta ML");
      if (!mattTool && !etiqueta) return clean;
      const u = new URL(clean);
      if (mattTool) u.searchParams.set("matt_tool", mattTool);
      if (etiqueta) u.searchParams.set("matt_word", etiqueta);
      u.searchParams.set("matt_medium", "affiliates");
      return u.toString();
    }
    if (store === "amazon") {
      const tag = val("ID de Associado");
      if (!tag) return url;
      const u = new URL(url);
      u.searchParams.set("tag", tag);
      return u.toString();
    }
    const u = new URL(url);
    u.searchParams.set("ref", String(anyId));
    return u.toString();
  } catch {
    return url + (url.includes("?") ? "&" : "?") + "ref=" + encodeURIComponent(String(anyId));
  }
}

// Busca de uma vez todas as credenciais de afiliado do usuário (cache por request).
async function carregarCredenciais(sb: any, userId: string): Promise<Record<string, Record<string, string>>> {
  const map: Record<string, Record<string, string>> = {};
  try {
    const { data } = await sb.from("affiliate_credentials").select("store, credentials").eq("user_id", userId);
    for (const row of data ?? []) {
      if (row.store && row.credentials) map[row.store] = row.credentials;
    }
  } catch {
    // sem credenciais carregadas → cai no link original em linkFinalDoProduto
  }
  return map;
}

// Resolve o link final a ser postado: regenera com as credenciais atuais quando possível.
// original_url = link cru salvo no cadastro do produto (sem afiliação).
// affiliate_url = fallback para produtos antigos salvos antes desta função existir.
function linkFinalDoProduto(product: any, credsMap: Record<string, Record<string, string>>): string {
  const original = product.original_url || product.affiliate_url || "";
  if (!original) return product.affiliate_url || "";
  if (!product.source || product.source === "manual") return product.affiliate_url || original;
  const cred = credsMap[product.source] || null;
  return gerarLinkAfiliado(original, product.source, cred) || product.affiliate_url || original;
}


function montarMsg(product: any, credsMap: Record<string, Record<string, string>>): string {
  const cta = product.cta_random ? sortearCta() : (product.cta_text || "");
  const priceStr = product.price ? `R$ ${Number(product.price).toFixed(2).replace(".", ",")}` : "";
  const discStr = product.discount_pct ? `🔥 ${product.discount_pct}% OFF` : "";
  const cupomStr = product.coupon_code ? `🏷️ Utilize o cupom: ${product.coupon_code}` : "";
  // Regenera o link de afiliado com as credenciais ATUAIS do usuário (podem ter sido
  // configuradas depois de o produto ter sido salvo no grupo).
  const linkFinal = linkFinalDoProduto(product, credsMap);
  return [
    product.title,
    discStr && priceStr ? `${discStr} — ${priceStr}` : discStr || priceStr,
    cupomStr,
    cta,
    linkFinal,
  ].filter(Boolean).join("\n");
}

type DestinoStat = { key: string; type: "wa_grupo" | "wa_canal" | "telegram"; label: string; sent: number; failed: number; last_error: string | null };

function pegarDestino(stats: Map<string, DestinoStat>, key: string, type: DestinoStat["type"], label: string): DestinoStat {
  let d = stats.get(key);
  if (!d) { d = { key, type, label, sent: 0, failed: 0, last_error: null }; stats.set(key, d); }
  return d;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  const sbAuth = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: userData, error: userErr } = await sbAuth.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const userId = userData.user.id;

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const groupId = body?.group_id;
  if (!groupId) return new Response(JSON.stringify({ error: "group_id obrigatório" }), { status: 400 });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Plano do usuário — bloqueia quem já tem automação 24/7 (deve usar o toggle de automação, não isso aqui)
  const { data: profile } = await sb
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  const PLANOS_SEM_AUTOMACAO = ["starter"];
  if (!profile || !PLANOS_SEM_AUTOMACAO.includes(profile.plan)) {
    return new Response(JSON.stringify({ error: "Disparo manual disponível apenas para o plano Starter. Planos superiores usam a automação 24/7." }), { status: 403 });
  }

  // Grupo — confirma dono
  const { data: group, error: gErr } = await sb
    .from("niche_groups")
    .select("id, user_id, name, last_post_at")
    .eq("id", groupId)
    .maybeSingle();
  if (gErr || !group || group.user_id !== userId) {
    return new Response(JSON.stringify({ error: "Grupo não encontrado." }), { status: 404 });
  }

  // Limite de 1x/24h
  const lastPost = group.last_post_at ? new Date(group.last_post_at).getTime() : 0;
  const elapsed = Date.now() - lastPost;
  if (lastPost && elapsed < BLAST_COOLDOWN_MS) {
    const horasRestantes = Math.ceil((BLAST_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
    return new Response(JSON.stringify({
      error: `Você já disparou esse grupo hoje. Tente novamente em ${horasRestantes}h, ou faça upgrade para postagem ilimitada.`,
      cooldown: true,
      hours_left: horasRestantes,
    }), { status: 429 });
  }

  // Produtos do grupo
  const { data: products } = await sb
    .from("products")
    .select("id, title, affiliate_url, original_url, source, image_url, price, discount_pct, coupon_code, cta_text, cta_random")
    .eq("niche_group_id", groupId)
    .order("position");

  if (!products?.length) {
    return new Response(JSON.stringify({ error: "Esse grupo ainda não tem produtos." }), { status: 400 });
  }

  const credsMap = await carregarCredenciais(sb, userId);

  // Destinos
  const { data: instance } = await sb
    .from("whatsapp_instances")
    .select("phone")
    .eq("user_id", userId)
    .eq("status", "connected")
    .maybeSingle();

  const { data: waGroups } = await sb
    .from("whatsapp_groups")
    .select("group_jid, name")
    .eq("niche_group_id", groupId);

  const { data: waChannels } = await sb
    .from("whatsapp_channels")
    .select("channel_whatsapp_id, channel_link")
    .eq("niche_group_id", groupId);

  const { data: tgChannels } = await sb
    .from("telegram_channels")
    .select("chat_id, username")
    .eq("niche_group_id", groupId);

  const temDestino = (instance && ENGINE_URL && ((waGroups?.length ?? 0) > 0 || (waChannels?.length ?? 0) > 0)) || (tgChannels?.length ?? 0) > 0;
  if (!temDestino) {
    return new Response(JSON.stringify({ error: "Configure ao menos um destino (grupo/canal WhatsApp ou Telegram) antes de disparar." }), { status: 400 });
  }

  if (!instance && ENGINE_URL && ((waGroups?.length ?? 0) > 0 || (waChannels?.length ?? 0) > 0) && !(tgChannels?.length ?? 0)) {
    return new Response(JSON.stringify({ error: "Seu WhatsApp está desconectado. Reconecte antes de disparar." }), { status: 400 });
  }

  const stats = new Map<string, DestinoStat>();
  let totalSent = 0, totalFailed = 0;
  const phoneClean = instance?.phone ? instance.phone.replace(/\D/g, "") : "";
  const perProdutoErros: { produto: string; erros: string[] }[] = [];

  for (const product of products) {
    const msg = montarMsg(product, credsMap);
    let sent = 0, failed = 0;
    const errosProduto: string[] = [];

    if (instance && ENGINE_URL) {
      for (const wg of waGroups ?? []) {
        if (!wg.group_jid) continue;
        const d = pegarDestino(stats, `wag:${wg.group_jid}`, "wa_grupo", wg.name || wg.group_jid);
        try {
          const r = await fetchWithTimeout(`${ENGINE_URL}/send-group`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${ENGINE_TOKEN}` },
            body: JSON.stringify({ sessionPhone: phoneClean, groupId: wg.group_jid, text: msg, imageUrl: product.image_url || undefined, userId }),
          });
          if (!r.ok) throw new Error(`engine respondeu ${r.status}`);
          sent++; d.sent++;
        } catch (e) {
          const msgErr = e instanceof Error ? e.message : String(e);
          console.error(`[WA-GRUPO] grupo ${groupId} jid ${wg.group_jid}:`, e);
          failed++; d.failed++; d.last_error = msgErr;
          errosProduto.push(`${d.label}: ${msgErr}`);
        }
      }
      for (const ch of waChannels ?? []) {
        const channelId = ch.channel_whatsapp_id || ch.channel_link;
        if (!channelId) continue;
        const d = pegarDestino(stats, `wac:${channelId}`, "wa_canal", ch.channel_link || channelId);
        try {
          const r = await fetchWithTimeout(`${ENGINE_URL}/send`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${ENGINE_TOKEN}` },
            body: JSON.stringify({ sessionPhone: phoneClean, channelId, text: msg, imageUrl: product.image_url || undefined, userId }),
          });
          if (!r.ok) throw new Error(`engine respondeu ${r.status}`);
          sent++; d.sent++;
        } catch (e) {
          const msgErr = e instanceof Error ? e.message : String(e);
          console.error(`[WA-CANAL] grupo ${groupId} canal ${channelId}:`, e);
          failed++; d.failed++; d.last_error = msgErr;
          errosProduto.push(`${d.label}: ${msgErr}`);
        }
      }
    }

    for (const tg of tgChannels ?? []) {
      const chatId = tg.chat_id || tg.username;
      if (!chatId) continue;
      const d = pegarDestino(stats, `tg:${chatId}`, "telegram", tg.username || chatId);
      try {
        const payload: Record<string, unknown> = { action: "send", chatId };
        if (product.image_url) {
          payload.type = "photo"; payload.photo = product.image_url; payload.caption = msg;
        } else {
          payload.type = "text"; payload.text = msg;
        }
        const r = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/telegram-send`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_ROLE}` },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`tg-send respondeu ${r.status}`);
        const dResp = await r.json();
        if (!dResp.ok && !dResp.success) throw new Error(dResp.error ?? "erro desconhecido no Telegram");
        sent++; d.sent++;
      } catch (e) {
        const msgErr = e instanceof Error ? e.message : String(e);
        console.error(`[TG] grupo ${groupId} chat ${chatId}:`, e);
        failed++; d.failed++; d.last_error = msgErr;
        errosProduto.push(`${d.label}: ${msgErr}`);
      }
    }

    if (errosProduto.length) perProdutoErros.push({ produto: product.title, erros: errosProduto });

    await sb.from("scheduled_posts").insert({
      user_id: userId,
      group_id: groupId,
      product_id: product.id,
      status: sent > 0 ? "sent" : "failed",
      scheduled_for: new Date().toISOString(),
      sent_at: sent > 0 ? new Date().toISOString() : null,
      error: failed > 0 ? errosProduto.join(" | ").slice(0, 500) : null,
    });

    totalSent += sent;
    totalFailed += failed;
  }

  await sb.from("niche_groups").update({ last_post_at: new Date().toISOString() }).eq("id", groupId);

  return new Response(JSON.stringify({
    products: products.length,
    sent: totalSent,
    failed: totalFailed,
    destinos: Array.from(stats.values()),
    produtos_com_erro: perProdutoErros.slice(0, 20),
  }), { headers: { "content-type": "application/json" } });
});
