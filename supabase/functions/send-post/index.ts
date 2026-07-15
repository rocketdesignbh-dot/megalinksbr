// Mega Links BR · Edge Function "send-post" v8
// + regenera o link de afiliado no momento do post (usa credenciais atuais do usuário)
// + respeita gate de marketplaces por PLANO (Starter/Pro) — mantido
// + pula produto sem credencial de afiliado configurada para a loja — mantido
// + Starter: 1 disparo automático por dia por grupo — mantido
// - REMOVIDO: filtro por "Lojas ativas" do grupo (coluna niche_groups.marketplaces não existe
//   mais — foi renomeada para active_stores e a função nunca foi atualizada, causando 500 em
//   toda chamada do cron desde então). A funcionalidade de "lojas ativas" por grupo foi
//   descontinuada no frontend; um grupo agora é dedicado a uma loja por convenção (nomeie o
//   grupo pela loja e adicione só produtos dela).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET  = Deno.env.get("CRON_SECRET") ?? "";
const ENGINE_URL   = Deno.env.get("WA_ENGINE_URL") ?? "";
const ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

const LOJAS_QUE_EXIGEM_CREDENCIAL = new Set([
  "shopee", "amazon", "mercado_livre", "aliexpress",
  "magalu", "awin", "shein", "natura", "terabyte",
]);

const PLAN_MARKETPLACES: Record<string, string[] | null> = {
  starter: ["shopee", "manual", "outra"],
  pro:     ["shopee", "mercado_livre", "amazon", "manual", "outra"],
  elite:   null,
  premium: null,
  infinity: null,
};

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

// Gera o link de afiliado personalizado do usuário a partir do link original do produto.
// Espelha a lógica do frontend (prGerarLinkAfil no index.html) para garantir que o Post
// Automático sempre use o link mais atual com as credenciais do usuário — mesmo que elas
// tenham sido configuradas DEPOIS de o produto já estar salvo no grupo.
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

// Busca de uma vez todas as credenciais de afiliado do usuário (cache por grupo processado).
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
// affiliate_url = fallback para produtos antigos salvos antes de original_url existir.
function linkFinalDoProduto(product: any, credsMap: Record<string, Record<string, string>>): string {
  const original = product.original_url || product.affiliate_url || "";
  if (!original) return product.affiliate_url || "";
  if (!product.source || product.source === "manual") return product.affiliate_url || original;
  const cred = credsMap[product.source] || null;
  return gerarLinkAfiliado(original, product.source, cred) || product.affiliate_url || original;
}

function montarTexto(p: {
  title: string; price: number | null; price_original: number | null;
  price_suffix: string | null; price_installment: string | null;
  coupon_code: string | null; cta_text: string | null; cta_random: boolean | null;
  affiliate_url: string; source: string | null; description: string | null;
}): string {
  const brl = (v: number) => v.toFixed(2).replace(".", ",");
  const cta = p.cta_random ? sortearCta() : (p.cta_text || sortearCta());
  let extra1 = "", extra2 = "", extra3 = "";
  if (p.description) { try { const d = JSON.parse(p.description); extra1=d.extra1||""; extra2=d.extra2||""; extra3=d.extra3||""; } catch {/**/} }
  const porStr = p.price ? `R$ ${brl(Number(p.price))}` : "";
  const sufStr = p.price_suffix ? ` ${p.price_suffix}` : "";
  const deStr  = p.price_original ? `~De R$ ${brl(Number(p.price_original))}~ por ` : "";
  const lojaLabel: Record<string,string> = { shopee:"Shopee", mercado_livre:"Mercado Livre", amazon:"Amazon", aliexpress:"AliExpress", magalu:"Magalu", shein:"Shein", awin:"AWIN", natura:"Natura", terabyte:"TerabyteShop" };
  const loja = p.source ? (lojaLabel[p.source] ?? "") : "";
  const linhas: string[] = [];
  linhas.push("🔥 OFERTA RELÂMPAGO 🔥"); linhas.push(p.title);
  if (porStr) linhas.push(`💸 ${deStr}${porStr}${sufStr}`);
  if (p.price_installment) linhas.push(`💳 ${p.price_installment}`);
  if (extra1) linhas.push(`📦 ${extra1}`);
  if (extra2) linhas.push(`🚚 ${extra2}`);
  if (p.coupon_code) linhas.push(`🏷️ Utilize o cupom: ${p.coupon_code}`);
  linhas.push(""); linhas.push(cta);
  if (loja) linhas.push(`🛒 ${loja}`);
  linhas.push(`Compre Aqui 👉 ${p.affiliate_url}`);
  let texto = linhas.join("\n");
  if (extra3) texto += `\n\n🔗 ${extra3}`;
  return texto;
}

async function fetchWithTimeout(url: string, opts: RequestInit, ms = 10000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret") ?? "";
  const auth   = req.headers.get("authorization") ?? "";
  const ok = (CRON_SECRET && secret === CRON_SECRET) || auth === `Bearer ${SERVICE_ROLE}`;
  if (!ok) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  const sb  = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const brHour = ((now.getUTCHours() - 3) % 24 + 24) % 24;
  const todayBR = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: groups, error: gErr } = await sb
    .from("niche_groups")
    .select("id, user_id, name, interval_minutes, start_hour, end_hour, cursor_index, last_post_at")
    .eq("post_auto_enabled", true);
  if (gErr) return new Response(JSON.stringify({ error: gErr.message }), { status: 500 });
  if (!groups?.length) return new Response(JSON.stringify({ processed: 0, msg: "no active groups" }));

  const userIds = [...new Set(groups.map((g: { user_id: string }) => g.user_id))];
  const { data: profiles } = await sb.from("profiles").select("id, plan, is_vip").in("id", userIds);
  const planMap: Record<string, string> = {};
  for (const p of profiles ?? []) planMap[p.id] = p.is_vip ? "elite" : (p.plan || "starter");

  let totalSent = 0, totalFailed = 0, totalSkipped = 0, totalBlocked = 0;

  for (const group of groups) {
    const userPlan = planMap[group.user_id] || "starter";
    const planAllowed = PLAN_MARKETPLACES[userPlan] ?? null;

    // Starter: 1 disparo automático/dia por grupo
    if (userPlan === "starter") {
      const { count: sentToday } = await sb.from("scheduled_posts")
        .select("id", { count: "exact", head: true })
        .eq("group_id", group.id).eq("is_manual", false).eq("status", "sent")
        .gte("sent_at", todayBR + "T00:00:00Z");
      if ((sentToday ?? 0) >= 1) { totalSkipped++; continue; }
    }

    const startH = group.start_hour ?? 0, endH = group.end_hour ?? 23;
    const inWindow = startH <= endH ? brHour >= startH && brHour <= endH : brHour >= startH || brHour <= endH;
    if (!inWindow) { totalSkipped++; continue; }

    const intervalMs = (group.interval_minutes ?? 10) * 60 * 1000;
    const lastPost = group.last_post_at ? new Date(group.last_post_at).getTime() : 0;
    if (Date.now() - lastPost < intervalMs) { totalSkipped++; continue; }

    // Credenciais do usuário — usadas tanto para o gate (pular loja sem credencial)
    // quanto para regenerar o link de afiliado com o valor mais atual.
    const credsMap = await carregarCredenciais(sb, group.user_id);
    const lojasComCredencial = new Set(Object.keys(credsMap).filter((store) => {
      const c = credsMap[store];
      return c && Object.values(c).some((v) => v && String(v).trim());
    }));

    const { data: allProducts } = await sb.from("products")
      .select("id, title, source, affiliate_url, original_url, image_url, price, price_original, price_suffix, price_installment, coupon_code, cta_text, cta_random, description")
      .eq("niche_group_id", group.id).order("position");
    if (!allProducts?.length) { totalSkipped++; continue; }

    const products = allProducts.filter((p: { source: string }) => {
      const src = p.source ?? "manual";
      if (planAllowed !== null && !planAllowed.includes(src)) return false;
      return true;
    });
    if (!products.length) { totalSkipped++; continue; }

    const total = products.length;
    let cursor = (group.cursor_index ?? 0) % total, product = null, tentativas = 0;
    while (tentativas < total) {
      const candidato = products[cursor];
      const src = candidato.source ?? "";
      if (!LOJAS_QUE_EXIGEM_CREDENCIAL.has(src) || lojasComCredencial.has(src)) { product = candidato; break; }
      console.warn(`[BLOQUEADO] grupo=${group.id} source=${src}`);
      totalBlocked++; cursor = (cursor + 1) % total; tentativas++;
    }

    if (!product) {
      totalSkipped++;
      await sb.from("scheduled_posts").insert({ user_id:group.user_id, group_id:group.id, product_id:products[0].id, status:"failed", scheduled_for:now.toISOString(), sent_at:null, is_manual:false, error:"Nenhum produto pôde ser postado: configure suas credenciais." });
      continue;
    }

    const nextCursor = (cursor + 1) % total;
    // Regenera o link de afiliado com as credenciais ATUAIS (independe de quando o produto
    // foi salvo no grupo).
    product.affiliate_url = linkFinalDoProduto(product, credsMap);
    const msg = montarTexto(product);
    let groupSent = 0, groupFailed = 0;

    if (ENGINE_URL) {
      const { data: instance } = await sb.from("whatsapp_instances").select("phone").eq("user_id", group.user_id).eq("status", "connected").maybeSingle();
      if (instance) {
        const phoneClean = instance.phone.replace(/\D/g, "");
        const { data: waGroups } = await sb.from("whatsapp_groups").select("group_jid, name").eq("niche_group_id", group.id);
        for (const wg of waGroups ?? []) {
          if (!wg.group_jid) continue;
          try {
            const r = await fetchWithTimeout(`${ENGINE_URL}/send-group`, { method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${ENGINE_TOKEN}`}, body:JSON.stringify({ sessionPhone:phoneClean, groupId:wg.group_jid, text:msg, imageUrl:product.image_url||undefined, userId:group.user_id }) });
            if (!r.ok) throw new Error(`engine ${r.status}`); groupSent++;
          } catch(e) { console.error(`[WA-GRUPO]`,e); groupFailed++; }
        }
        const { data: waChannels } = await sb.from("whatsapp_channels").select("channel_whatsapp_id, channel_link").eq("niche_group_id", group.id);
        for (const ch of waChannels ?? []) {
          const channelId = ch.channel_whatsapp_id || ch.channel_link;
          if (!channelId) continue;
          try {
            const r = await fetchWithTimeout(`${ENGINE_URL}/send`, { method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${ENGINE_TOKEN}`}, body:JSON.stringify({ sessionPhone:phoneClean, channelId, text:msg, imageUrl:product.image_url||undefined, userId:group.user_id }) });
            if (!r.ok) throw new Error(`engine ${r.status}`); groupSent++;
          } catch(e) { console.error(`[WA-CANAL]`,e); groupFailed++; }
        }
      }
    }

    const { data: tgChannels } = await sb.from("telegram_channels").select("chat_id, username").eq("niche_group_id", group.id);
    for (const tg of tgChannels ?? []) {
      const chatId = tg.chat_id || tg.username; if (!chatId) continue;
      try {
        const payload: Record<string,unknown> = { action:"send", chatId };
        if (product.image_url) { payload.type="photo"; payload.photo=product.image_url; payload.caption=msg; } else { payload.type="text"; payload.text=msg; }
        const r = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/telegram-send`, { method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${SERVICE_ROLE}`}, body:JSON.stringify(payload) });
        if (!r.ok) throw new Error(`tg-send ${r.status}`);
        const d = await r.json(); if (!d.ok && !d.success) throw new Error(d.error ?? "telegram error");
        groupSent++;
      } catch(e) { console.error(`[TG]`,e); groupFailed++; }
    }

    await sb.from("scheduled_posts").insert({ user_id:group.user_id, group_id:group.id, product_id:product.id, status:groupSent>0?"sent":"failed", scheduled_for:now.toISOString(), sent_at:groupSent>0?now.toISOString():null, is_manual:false, error:groupFailed>0?`${groupFailed} canais falharam`:null });
    await sb.from("niche_groups").update({ cursor_index:nextCursor, last_post_at:now.toISOString() }).eq("id", group.id);
    totalSent += groupSent; totalFailed += groupFailed;
  }

  return new Response(JSON.stringify({ groups:groups.length, sent:totalSent, failed:totalFailed, skipped:totalSkipped, blocked:totalBlocked }), { headers:{"content-type":"application/json"} });
});
