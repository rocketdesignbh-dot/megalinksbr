// Mega Links BR · Edge Function "send-post" v14
// v14: passa a respeitar dois campos que ja existiam no banco e na interface,
//      mas que nenhum codigo lia:
//      - expired      -> produto marcado como fora do ar pelo product-refresh
//                        nunca mais e disparado (antes ia pro grupo com link morto);
//      - scheduled_at -> o agendamento escolhido no formulario passa a valer:
//                        o produto so entra no rodizio a partir da data marcada.
//      A resposta agora informa quantos produtos foram pulados por cada motivo.
// v13: guarda contra re-afiliar/re-encurtar short links proprios (com ou sem www).
// v12: ENCURTAMENTO NO DISPARO. O link postado passa a ser sempre encurtado
//      (megalinksbr.com.br/r/CODE) usando o user_id do DONO do grupo — o mesmo
//      padrão do "Postar Agora". Antes o Post Automático regenerava o link de
//      afiliado mas postava a URL longa, ignorando o encurtamento configurado.
// v11: AUTO-FLAG de sessão morta.
// v10: registra o erro real do canal em scheduled_posts.error.
// v9:  corrige o payload enviado para a telegram-send (chat_id / text / image_url).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET  = Deno.env.get("CRON_SECRET") ?? "";
const ENGINE_URL   = Deno.env.get("WA_ENGINE_URL") ?? "";
const ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

const SHORT_DOMAIN = "https://megalinksbr.com.br";

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

function ehSessaoMorta(status: number, corpo: string): boolean {
  if (status !== 404) return false;
  const c = corpo.toLowerCase();
  return c.includes("sess") && (
    c.includes("não encontrada") || c.includes("nao encontrada") ||
    c.includes("not found")      || c.includes("não pareada") ||
    c.includes("nao pareada")    || c.includes("not paired")
  );
}

async function lerCorpo(r: Response): Promise<string> {
  try { return (await r.text()).replace(/\s+/g, " ").trim(); } catch { return ""; }
}

function descreverExcecao(canal: string, e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return `${canal}: ${msg.replace(/\s+/g, " ").trim().slice(0, 160)}`;
}

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

// Reconhece nossos próprios short links (com ou sem www) — eles nunca devem ser
// re-afiliados nem re-encurtados. Produtos antigos ficaram com /r/ salvo em
// original_url por causa do bug de ordem (encurtava antes de afiliar).
function ehLinkCurtoProprio(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") === "megalinksbr.com.br" && u.pathname.startsWith("/r/");
  } catch { return false; }
}

// ── Encurtamento (mesmo padrão do Postar Agora) ────────────────────────────────
function gerarCode(len = 7): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Encurta no MOMENTO do disparo usando o user_id do DONO do grupo (o usuário logado
// que cadastrou o produto) — assim o clique é atribuído a ele em link_clicks.
// Reaproveita o code já existente para a mesma URL: o cron roda a cada poucos minutos
// e não pode criar uma linha nova de short_links a cada disparo do mesmo produto.
async function encurtarLink(sb: any, userId: string, url: string): Promise<string> {
  if (!url) return url;
  if (ehLinkCurtoProprio(url)) return url;
  try {
    const { data: existing } = await sb.from("short_links")
      .select("code").eq("long_url", url).eq("user_id", userId).limit(1).maybeSingle();
    if (existing?.code) return `${SHORT_DOMAIN}/r/${existing.code}`;

    let code = gerarCode();
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await sb.from("short_links").select("code").eq("code", code).maybeSingle();
      if (!clash) break;
      code = gerarCode();
    }
    const { error } = await sb.from("short_links")
      .insert({ code, long_url: url, destination: url, user_id: userId });
    if (error) { console.warn("[short-link] insert falhou:", error.message); return url; }
    return `${SHORT_DOMAIN}/r/${code}`;
  } catch (e) {
    console.warn("[short-link] erro:", e instanceof Error ? e.message : String(e));
    return url;
  }
}

async function carregarCredenciais(sb: any, userId: string): Promise<Record<string, Record<string, string>>> {
  const map: Record<string, Record<string, string>> = {};
  try {
    const { data } = await sb.from("affiliate_credentials").select("store, credentials").eq("user_id", userId);
    for (const row of data ?? []) {
      if (row.store && row.credentials) map[row.store] = row.credentials;
    }
  } catch { /* cai no link original */ }
  return map;
}

function linkFinalDoProduto(product: any, credsMap: Record<string, Record<string, string>>): string {
  const original = product.original_url || product.affiliate_url || "";
  if (!original) return product.affiliate_url || "";
  // Já é um short link nosso (produto salvo pelo fluxo antigo): posta como está.
  if (ehLinkCurtoProprio(original)) return original;
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
  let totalExpirados = 0, totalAgendados = 0;
  const instanciasDerrubadas: string[] = [];

  for (const group of groups) {
    const userPlan = planMap[group.user_id] || "starter";
    const planAllowed = PLAN_MARKETPLACES[userPlan] ?? null;

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

    const credsMap = await carregarCredenciais(sb, group.user_id);
    const lojasComCredencial = new Set(Object.keys(credsMap).filter((store) => {
      const c = credsMap[store];
      return c && Object.values(c).some((v) => v && String(v).trim());
    }));

    const { data: allProducts } = await sb.from("products")
      .select("id, title, source, affiliate_url, original_url, image_url, price, price_original, price_suffix, price_installment, coupon_code, cta_text, cta_random, description, expired, scheduled_at")
      .eq("niche_group_id", group.id).order("position");
    if (!allProducts?.length) { totalSkipped++; continue; }

    const agoraMs = now.getTime();
    let puladosExpirados = 0, puladosAgendados = 0;

    const products = allProducts.filter((p: any) => {
      const src = p.source ?? "manual";
      if (planAllowed !== null && !planAllowed.includes(src)) return false;
      // v14: produto que o product-refresh marcou como fora do ar nunca e disparado.
      // Antes este campo era gravado e nunca lido -- o link morto ia pro grupo igual.
      if (p.expired === true) { puladosExpirados++; return false; }
      // v14: agendamento do formulario ("📅 Agendamento"). Antes tambem era gravado
      // e nunca lido, entao o produto entrava no rodizio na hora, ignorando a data.
      if (p.scheduled_at) {
        const quando = new Date(p.scheduled_at).getTime();
        if (Number.isFinite(quando) && quando > agoraMs) { puladosAgendados++; return false; }
      }
      return true;
    });

    totalExpirados += puladosExpirados;
    totalAgendados += puladosAgendados;

    if (!products.length) {
      totalSkipped++;
      // Registra o motivo real em vez de falhar em silencio.
      if (puladosExpirados || puladosAgendados) {
        const motivo = [
          puladosExpirados ? `${puladosExpirados} fora do ar` : "",
          puladosAgendados ? `${puladosAgendados} aguardando agendamento` : "",
        ].filter(Boolean).join(" e ");
        await sb.from("scheduled_posts").insert({
          user_id: group.user_id, group_id: group.id, product_id: allProducts[0].id,
          status: "skipped", scheduled_for: now.toISOString(), sent_at: null, is_manual: false,
          error: `Nenhum produto disponivel agora: ${motivo}.`,
        });
      }
      continue;
    }

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
    // 1º regenera a afiliação com as credenciais ATUAIS, 2º encurta com o user_id do dono.
    product.affiliate_url = await encurtarLink(sb, group.user_id, linkFinalDoProduto(product, credsMap));
    const msg = montarTexto(product);
    let groupSent = 0, groupFailed = 0;
    const falhas: string[] = [];

    if (ENGINE_URL) {
      const { data: instance } = await sb.from("whatsapp_instances").select("id, phone").eq("user_id", group.user_id).eq("status", "connected").maybeSingle();
      if (!instance) {
        falhas.push("WhatsApp: nenhuma instância conectada — repareie o aparelho");
        groupFailed++;
      } else {
        const phoneClean = instance.phone.replace(/\D/g, "");
        let sessaoMorta = false;

        const derrubarInstancia = async (detalhe: string) => {
          sessaoMorta = true;
          await sb.from("whatsapp_instances")
            .update({ status: "disconnected", idle_since: now.toISOString(), disconnect_requested_at: now.toISOString() })
            .eq("id", instance.id);
          instanciasDerrubadas.push(instance.phone);
          falhas.push(`WhatsApp ${instance.phone}: sessão caiu no wa-engine — marcada como desconectada. Repareie o QR Code. (${detalhe.slice(0,120)})`);
        };

        const { data: waGroups } = await sb.from("whatsapp_groups").select("group_jid, name").eq("niche_group_id", group.id);
        for (const wg of waGroups ?? []) {
          if (sessaoMorta) { groupFailed++; continue; }
          if (!wg.group_jid) { falhas.push(`WA grupo "${wg.name ?? "?"}": sem group_jid`); groupFailed++; continue; }
          const rotulo = `WA grupo "${wg.name ?? wg.group_jid}"`;
          try {
            const r = await fetchWithTimeout(`${ENGINE_URL}/send-group`, { method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${ENGINE_TOKEN}`}, body:JSON.stringify({ sessionPhone:phoneClean, groupId:wg.group_jid, text:msg, imageUrl:product.image_url||undefined, userId:group.user_id }) });
            if (!r.ok) {
              const corpo = await lerCorpo(r);
              groupFailed++;
              if (ehSessaoMorta(r.status, corpo)) { await derrubarInstancia(corpo); }
              else { const d = `${rotulo}: HTTP ${r.status} — ${corpo.slice(0,160)}`; console.error(`[WA-GRUPO] ${d}`); falhas.push(d); }
              continue;
            }
            groupSent++;
          } catch(e) { const d = descreverExcecao(rotulo, e); console.error(`[WA-GRUPO] ${d}`); falhas.push(d); groupFailed++; }
        }

        const { data: waChannels } = await sb.from("whatsapp_channels").select("channel_whatsapp_id, channel_link").eq("niche_group_id", group.id);
        for (const ch of waChannels ?? []) {
          const channelId = ch.channel_whatsapp_id || ch.channel_link;
          if (!channelId) continue;
          if (sessaoMorta) { groupFailed++; continue; }
          const rotulo = `WA canal "${channelId}"`;
          try {
            const r = await fetchWithTimeout(`${ENGINE_URL}/send`, { method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${ENGINE_TOKEN}`}, body:JSON.stringify({ sessionPhone:phoneClean, channelId, text:msg, imageUrl:product.image_url||undefined, userId:group.user_id }) });
            if (!r.ok) {
              const corpo = await lerCorpo(r);
              groupFailed++;
              if (ehSessaoMorta(r.status, corpo)) { await derrubarInstancia(corpo); }
              else { const d = `${rotulo}: HTTP ${r.status} — ${corpo.slice(0,160)}`; console.error(`[WA-CANAL] ${d}`); falhas.push(d); }
              continue;
            }
            groupSent++;
          } catch(e) { const d = descreverExcecao(rotulo, e); console.error(`[WA-CANAL] ${d}`); falhas.push(d); groupFailed++; }
        }
      }
    }

    const { data: tgChannels } = await sb.from("telegram_channels").select("chat_id, username").eq("niche_group_id", group.id);
    for (const tg of tgChannels ?? []) {
      const chatId = tg.chat_id || tg.username; if (!chatId) continue;
      const rotulo = `Telegram "${chatId}"`;
      try {
        const payload: Record<string,unknown> = { action:"send", chat_id: chatId, text: msg };
        if (product.image_url) payload.image_url = product.image_url;
        const r = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/telegram-send`, { method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${SERVICE_ROLE}`}, body:JSON.stringify(payload) });
        if (!r.ok) { const corpo = await lerCorpo(r); const d = `${rotulo}: HTTP ${r.status} — ${corpo.slice(0,160)}`; console.error(`[TG] ${d}`); falhas.push(d); groupFailed++; continue; }
        const d = await r.json();
        if (!d.ok && !d.success) { const t = `${rotulo}: ${String(d.error ?? "telegram error").slice(0,160)}`; console.error(`[TG] ${t}`); falhas.push(t); groupFailed++; continue; }
        groupSent++;
      } catch(e) { const d = descreverExcecao(rotulo, e); console.error(`[TG] ${d}`); falhas.push(d); groupFailed++; }
    }

    const erroDetalhado = groupFailed > 0
      ? `${groupFailed} canais falharam — ${falhas.join(" | ")}`.slice(0, 1000)
      : null;

    await sb.from("scheduled_posts").insert({ user_id:group.user_id, group_id:group.id, product_id:product.id, status:groupSent>0?"sent":"failed", scheduled_for:now.toISOString(), sent_at:groupSent>0?now.toISOString():null, is_manual:false, error:erroDetalhado });
    await sb.from("niche_groups").update({ cursor_index:nextCursor, last_post_at:now.toISOString() }).eq("id", group.id);
    totalSent += groupSent; totalFailed += groupFailed;
  }

  return new Response(JSON.stringify({ groups:groups.length, sent:totalSent, failed:totalFailed, skipped:totalSkipped, blocked:totalBlocked, pulados_expirados:totalExpirados, pulados_agendados:totalAgendados, instancias_derrubadas:instanciasDerrubadas }), { headers:{"content-type":"application/json"} });
});
