// Mega Links BR · Edge Function "group-blast" v10 — Sub-ID da Shopee (17/09)
// v10: o link nativo da Shopee do Disparo Manual passa a sair carimbado com o
//      sub_id quando o usuario tem rotulo cadastrado (Config Afiliados ->
//      Shopee -> Sub-ID). Slot 1 = rotulo, slot 2 = "grupo". Sem rotulo, nada
//      muda: continua o `productOfferV2.offerLink` de sempre.
// Mega Links BR · Edge Function "group-blast" v8 — "De/Por" no disparo manual
// v8: O Disparo Manual (Starter, este arquivo) nunca mostrava o preço "De"
//     riscado — só o preço atual e, quando havia, "X% OFF". O `send-post`
//     (Post Automático) já monta "~De R$X~ por R$Y" desde sempre
//     (`montarTexto`); aqui era outra função (`montarMsg`), sem essa linha, e
//     o select nem trazia `price_original`/`price_suffix` pra montar. Corrigido:
//     select passa a trazer os dois campos, e `montarMsg` monta a mesma linha
//     "De/Por" do `send-post` quando há price_original > price. Sem "de"
//     disponível, cai no comportamento antigo (% OFF, ou só o preço). `montarOg`
//     (prévia do link) também passa a usar price_original em vez de
//     discount_pct, mesmo critério do send-post, agora que o dado está em mãos.
// v7: ROTEAMENTO POR DESTINO (fatia 2, REVISAO 129, 03/09). Grupo WA vinculado
//     a uma conexao especifica (whatsapp_groups.instance_id) dispara por ELA
//     em vez de sempre pela principal. instance_id nulo segue o caminho de
//     sempre (phoneClean da principal). Mesmo padrao aplicado ao send-post v27.
// v6: mesmo conserto do send-post v26. `encurtarLink` aqui tambem inseria
//     short_links sem og_title/og_description/og_image -- ganha um `og`
//     opcional (montado do produto, com discount_pct em vez de
//     price_original porque e o campo que este disparo realmente seleciona)
//     e completa por UPDATE no caminho de reuso quando o registro encontrado
//     ainda nao tem og_title. Aplicado por CIMA da v5 (multi-conexao
//     WhatsApp, is_primary) -- nenhuma linha dela foi tocada.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENGINE_URL = Deno.env.get("WA_ENGINE_URL") ?? "";
const ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

const BLAST_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1x por 24h corridas
const SHORT_DOMAIN = "https://megalinksbr.com.br";

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

// Reconhece nossos próprios short links (com ou sem www) — eles nunca devem ser
// re-afiliados nem re-encurtados. Produtos antigos ficaram com /r/ salvo em
// original_url por causa do bug de ordem (encurtava antes de afiliar).
function ehLinkCurtoProprio(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") === "megalinksbr.com.br" && u.pathname.startsWith("/r/");
  } catch { return false; }
}

// v9 (P143-b): link nativo da Shopee (API oficial de afiliados, mesma que o
// `product-search` v34/"Postar Agora" usa) também no Disparo Manual. Diferente
// do ML (endpoint não documentado + cookie de sessão pessoal — automatizar
// isso multiplicaria o risco de flag na conta do Érico), a Shopee usa a Open
// API oficial com App Key/App Secret, então é seguro repetir a cada disparo.
// Reconhece o link nativo (s.shopee.com.br/XXXX, sem /an_redir) para NÃO
// reembrulhar no encurtador próprio.
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
// REVISAO 163 — Sub-ID da Shopee no link nativo do disparo. MEDIDO em 17/09 na
// Open API: cada slot vai como um item do array `subIds`, sem hifen (o hifen e
// o separador dos 5 campos) e sem string vazia; o destino resolvido volta com
// utm_content=<slot1>-<slot2>--- e o mmp_pid do afiliado certo. Slot 1 = rotulo
// cadastrado em Config Afiliados -> Shopee -> Sub-ID; slot 2 = "grupo".
// Sem rotulo a mutation nao e chamada e o caminho fica o offerLink de sempre.
function limparSubId(v: unknown): string {
  return String(v ?? "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
}
function subIdsShopee(rotulo: unknown): string[] {
  const r = limparSubId(rotulo);
  return r ? [r, "grupo"] : [];
}
async function shopeeShortLinkComSubId(originUrl: string, appId: string, appSecret: string, subIds: string[]): Promise<string | null> {
  if (!subIds.length || !appId || !appSecret) return null;
  try {
    const lista = subIds.map((s) => JSON.stringify(s)).join(",");
    const query = `mutation{generateShortLink(input:{originUrl:${JSON.stringify(originUrl)},subIds:[${lista}]}){shortLink}}`;
    const ts = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ query });
    const sig = await sha256Hex(`${appId}${ts}${payload}${appSecret}`);
    const r = await fetchWithTimeout("https://open-api.affiliate.shopee.com.br/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `SHA256 Credential=${appId},Timestamp=${ts},Signature=${sig}` },
      body: payload,
    }, 10000);
    if (!r.ok) { console.warn(`[shopee][sub-id] HTTP ${r.status}`); return null; }
    const d = await r.json();
    if (Array.isArray(d?.errors) && d.errors.length) { console.warn(`[shopee][sub-id] API recusou: ${d.errors[0]?.message}`); return null; }
    const link = d?.data?.generateShortLink?.shortLink;
    return typeof link === "string" && link ? link : null;
  } catch (e) {
    console.warn("[shopee][sub-id] falhou:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
async function gerarLinkNativoShopee(url: string, appId: string, appSecret: string, rotuloSubId = ""): Promise<string | null> {
  if (!appId || !appSecret) return null;
  const m = url.split("#")[0].match(/\/product\/(\d+)\/(\d+)/);
  if (!m) return null;
  const shopId = m[1], itemId = m[2];
  try {
    const query = `{ productOfferV2(itemId: ${itemId}, shopId: ${shopId}) { nodes { offerLink } } }`;
    const ts = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ query });
    const sig = await sha256Hex(`${appId}${ts}${payload}${appSecret}`);
    const r = await fetchWithTimeout("https://open-api.affiliate.shopee.com.br/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `SHA256 Credential=${appId},Timestamp=${ts},Signature=${sig}` },
      body: payload,
    }, 10000);
    if (!r.ok) { console.warn(`[shopee-nativo] HTTP ${r.status}`); return null; }
    const d = await r.json();
    if (Array.isArray(d?.errors) && d.errors.length) { console.warn(`[shopee-nativo] API recusou: ${d.errors[0]?.message}`); return null; }
    const offerLink = d?.data?.productOfferV2?.nodes?.[0]?.offerLink || null;
    const subIds = subIdsShopee(rotuloSubId);
    if (subIds.length) {
      const comSubId = await shopeeShortLinkComSubId(`https://shopee.com.br/product/${shopId}/${itemId}`, appId, appSecret, subIds);
      if (comSubId) return comSubId;
    }
    return offerLink;
  } catch (e) {
    console.warn("[shopee-nativo] falhou:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
function ehLinkNativoShopee(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") === "s.shopee.com.br" && !u.pathname.startsWith("/an_redir");
  } catch { return false; }
}

// v8: previa propria (og_title/og_description/og_image) montada a partir do
// PRODUTO deste disparo, agora com price_original (o select já traz), mesmo
// critério do send-post -- antes era discount_pct porque price_original não
// vinha do select.
const LOJA_LABEL: Record<string, string> = { shopee:"Shopee", mercado_livre:"Mercado Livre", amazon:"Amazon", aliexpress:"AliExpress", magalu:"Magalu", shein:"Shein", awin:"AWIN", natura:"Natura", terabyte:"TerabyteShop" };
function montarOg(p: any): { title: string; description: string; image: string } {
  const brl = (v: number) => Number(v).toFixed(2).replace(".", ",");
  const partes: string[] = [];
  if (p.price) partes.push(`R$ ${brl(p.price)}`);
  if (p.price_original && Number(p.price_original) > Number(p.price || 0)) partes.push(`(de R$ ${brl(p.price_original)})`);
  const loja = p.source ? (LOJA_LABEL[p.source] ?? "") : "";
  if (loja) partes.push(loja);
  return {
    title: String(p.title || "").slice(0, 200),
    description: partes.join(" · ").slice(0, 200),
    image: String(p.image_url || ""),
  };
}

// ── Encurtamento (mesmo padrão do Postar Agora) ────────────────────────────────
function gerarCode(len = 7): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Encurta no MOMENTO do disparo usando o user_id do usuário LOGADO que disparou —
// assim o clique é atribuído a ele em link_clicks. Reaproveita o code já existente
// para a mesma URL para não criar uma linha nova de short_links a cada disparo.
// v6: recebe `og` opcional -- grava no insert e completa por UPDATE no reuso
// quando o registro encontrado ainda nao tem og_title.
async function encurtarLink(sb: any, userId: string, url: string, og?: { title: string; description: string; image: string }): Promise<string> {
  if (!url) return url;
  if (ehLinkCurtoProprio(url)) return url;
  try {
    const { data: existing } = await sb.from("short_links")
      .select("code, og_title").eq("long_url", url).eq("user_id", userId).limit(1).maybeSingle();
    if (existing?.code) {
      if (og?.title && !String(existing.og_title ?? "").trim()) {
        sb.from("short_links").update({ og_title: og.title, og_description: og.description || null, og_image: og.image || null }).eq("code", existing.code).then(() => {});
      }
      return `${SHORT_DOMAIN}/r/${existing.code}`;
    }

    let code = gerarCode();
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await sb.from("short_links").select("code").eq("code", code).maybeSingle();
      if (!clash) break;
      code = gerarCode();
    }
    const { error } = await sb.from("short_links")
      .insert({ code, long_url: url, destination: url, user_id: userId, og_title: og?.title || null, og_description: og?.description || null, og_image: og?.image || null });
    if (error) { console.warn("[short-link] insert falhou:", error.message); return url; }
    return `${SHORT_DOMAIN}/r/${code}`;
  } catch (e) {
    console.warn("[short-link] erro:", e instanceof Error ? e.message : String(e));
    return url;
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
async function linkFinalDoProduto(product: any, credsMap: Record<string, Record<string, string>>): Promise<string> {
  const original = product.original_url || product.affiliate_url || "";
  if (!original) return product.affiliate_url || "";
  // Já é um short link nosso (produto salvo pelo fluxo antigo): posta como está.
  if (ehLinkCurtoProprio(original)) return original;
  if (!product.source || product.source === "manual") return product.affiliate_url || original;
  const cred = credsMap[product.source] || null;
  if (product.source === "shopee" && cred) {
    const appId = String(cred["App Key"] || cred["ID de Afiliado"] || "").trim();
    const appSecret = String(cred["App Secret"] || "").trim();
    if (appId && appSecret) {
      const nativo = await gerarLinkNativoShopee(original, appId, appSecret, String(cred["Sub-ID"] || ""));
      if (nativo) return nativo;
    }
  }
  return gerarLinkAfiliado(original, product.source, cred) || product.affiliate_url || original;
}


// linkFinal chega pronto (afiliado com as credenciais ATUAIS + encurtado).
// v8: passa a montar a linha "~De R$X~ por R$Y", mesmo formato do
// `montarTexto` do send-post, quando o produto tem price_original > price.
// Sem "de" disponível, cai no comportamento antigo (% OFF quando há
// discount_pct, senão só o preço) -- ninguém perde o que já tinha.
function montarMsg(product: any, linkFinal: string): string {
  const brl = (v: number) => Number(v).toFixed(2).replace(".", ",");
  const cta = product.cta_random ? sortearCta() : (product.cta_text || "");
  const porStr = product.price ? `R$ ${brl(product.price)}` : "";
  const sufStr = product.price_suffix ? ` ${product.price_suffix}` : "";
  const temDe = product.price_original && Number(product.price_original) > Number(product.price || 0);
  let precoLinha: string;
  if (temDe) {
    precoLinha = porStr ? `~De R$ ${brl(product.price_original)}~ por ${porStr}${sufStr}` : "";
  } else if (product.discount_pct && porStr) {
    precoLinha = `🔥 ${product.discount_pct}% OFF — ${porStr}${sufStr}`;
  } else if (product.discount_pct) {
    precoLinha = `🔥 ${product.discount_pct}% OFF`;
  } else {
    precoLinha = porStr ? `${porStr}${sufStr}` : "";
  }
  const cupomStr = product.coupon_code ? `🏷️ Utilize o cupom: ${product.coupon_code}` : "";
  return [
    product.title,
    precoLinha,
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
    .select("id, title, affiliate_url, original_url, source, image_url, price, price_original, price_suffix, discount_pct, coupon_code, cta_text, cta_random")
    .eq("niche_group_id", groupId)
    .order("position");

  if (!products?.length) {
    return new Response(JSON.stringify({ error: "Esse grupo ainda não tem produtos." }), { status: 400 });
  }

  const credsMap = await carregarCredenciais(sb, userId);

  // Destinos
  // MULTI-CONEXÃO (03/09): `.maybeSingle()` sem limite dá PGRST116 quando o
  // usuário tem DUAS instâncias conectadas — o disparo em massa parava inteiro.
  // Quem dispara é a conexão principal (`is_primary`); `created_at` desempata.
  const { data: instance } = await sb
    .from("whatsapp_instances")
    .select("id, phone")
    .eq("user_id", userId)
    .eq("status", "connected")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: waGroups } = await sb
    .from("whatsapp_groups")
    .select("group_jid, name, instance_id")
    .eq("niche_group_id", groupId);

  // ROTEAMENTO POR DESTINO (fatia 2, REVISAO 129, 03/09): grupo vinculado a
  // uma conexao especifica dispara por ELA, nao pela principal. instance_id
  // nulo continua no caminho de sempre (phoneClean da principal).
  const idsOutraConexaoGrupos = [...new Set((waGroups ?? []).map(g => g.instance_id).filter((id): id is string => !!id && id !== instance?.id))];
  const outrasInstanciasGrupos = idsOutraConexaoGrupos.length
    ? new Map(((await sb.from("whatsapp_instances").select("id, phone, status").in("id", idsOutraConexaoGrupos)).data ?? []).map(i => [i.id, i]))
    : new Map<string, { id: string; phone: string; status: string }>();

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
    // 1º regenera a afiliação com as credenciais ATUAIS (tenta o link nativo da
    // Shopee primeiro), 2º encurta com o user_id do logado — exceto quando já é
    // o link nativo, que sai "cru", sem passar pelo encurtador próprio.
    const linkPreEncurtamento = await linkFinalDoProduto(product, credsMap);
    const linkFinal = ehLinkNativoShopee(linkPreEncurtamento) ? linkPreEncurtamento : await encurtarLink(sb, userId, linkPreEncurtamento, montarOg(product));
    const msg = montarMsg(product, linkFinal);
    let sent = 0, failed = 0;
    const errosProduto: string[] = [];

    if (instance && ENGINE_URL) {
      for (const wg of waGroups ?? []) {
        if (!wg.group_jid) continue;
        const d = pegarDestino(stats, `wag:${wg.group_jid}`, "wa_grupo", wg.name || wg.group_jid);
        const outraConexao = wg.instance_id && wg.instance_id !== instance?.id ? outrasInstanciasGrupos.get(wg.instance_id) : null;
        if (outraConexao && outraConexao.status !== "connected") {
          const msgErr = `conexão vinculada (${outraConexao.phone}) está desconectada`;
          failed++; d.failed++; d.last_error = msgErr;
          errosProduto.push(`${d.label}: ${msgErr}`);
          continue;
        }
        const telAlvo = outraConexao ? outraConexao.phone.replace(/\D/g, "") : phoneClean;
        try {
          const r = await fetchWithTimeout(`${ENGINE_URL}/send-group`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${ENGINE_TOKEN}` },
            body: JSON.stringify({ sessionPhone: telAlvo, groupId: wg.group_jid, text: msg, imageUrl: product.image_url || undefined, userId }),
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
