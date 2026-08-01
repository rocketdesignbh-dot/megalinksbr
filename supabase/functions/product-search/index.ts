// product-search v24 — conserta a assinatura da Shopee E o campo inexistente
// v24 (31/07, noite): com a assinatura certa a API passou a de fato LER a
//   consulta, e a primeira coisa que ela disse foi
//   'Cannot query field "shortLink" on type "ProductOfferV2"'. O campo nunca
//   existiu; o nome certo e offerLink (link de afiliado) e productLink (pagina).
//   Esse erro estava ali o tempo todo, escondido atras do 10020: a requisicao
//   morria na assinatura antes de chegar no schema. Um bug tapando o outro.
//   MEDIDO: offerLink do item 24442629738 volta https://s.shopee.com.br/4AykYR6yxu
//   — exatamente o link que originou esta investigacao.
// v23 — conserta a assinatura da API de afiliado da Shopee
// v23 (31/07, noite): a assinatura da Shopee e SHA-256 SIMPLES de
//   appId + timestamp + payload + appSecret. A v22 usava HMAC-SHA256 com o
//   secret como chave. A Shopee respondia {"errors":[{"message":"error [10020]:
//   Invalid Signature"}]} com HTTP 200, o codigo lia d.data (null), nao achava
//   node e devolvia "Produto nao encontrado" — mensagem que aponta pro produto
//   quando o problema era nosso. TODA consulta de Shopee falhava assim.
//   MEDIDO em 31/07 no item 24442629738/loja 1006215031, mesmas credenciais:
//     HMAC        -> error [10020]: Invalid Signature
//     SHA-256     -> Senbenbao X55, R$ 12,51, -65%, imageUrl preenchida
//   A radar/index.ts sempre assinou certo (sha256Hex de concatenacao) e por isso
//   o Radar funcionava enquanto a product-search nao — duas implementacoes da
//   mesma assinatura, uma certa e uma errada, no mesmo repo.
//   Agora erro da API e resultado vazio devolvem mensagens DIFERENTES: foi a
//   mensagem unica que escondeu isso, nao a falha em si.
// v22: busca ml_session_cookie do profile do usuario e repassa ao wa-engine como userMlCookie;
//   o wa-engine tenta esse cookie ANTES do Scrape.do (gratis, sem gastar credito, e nao depende
//   do pool de IPs residenciais do Scrape.do que o ML está bloqueando).
// v21: adiciona log de diagnóstico do payload recebido (debug do 400 "URL inválida")
// v20: filtro reforçado no fallback Microlink (bloqueia idioma/domínio não-BR) — Microlink busca
//   sem geolocalização brasileira; quando o ML detecta IP não-BR, serve a versão em espanhol da
//   página. Agora rejeita se a URL final resolvida não for mercadolivre.com ou se o idioma
//   detectado pelo Microlink não for português.
// v19: passa a URL ORIGINAL do usuario ao wa-engine (nao reconstroi como /p/MLB)
// v18: failover de 2 tokens Scrape.do por usuario (primario + contingencia)
// v17: fix extracao MLB de URLs /up/MLBU... com item_id no query string
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ML_REQUEST_COST = Number(Deno.env.get("ML_REQUEST_COST") ?? "10");
const ML_PRODUCT_MAX_REQUESTS = 1;
const DEDUP_WINDOW_SECONDS = 30;
const MANUAL_DAILY_CAP = Number(Deno.env.get("ML_MANUAL_DAILY_CAP") ?? "40");
const MANUAL_MONTHLY_CAP = Number(Deno.env.get("ML_MANUAL_MONTHLY_CAP") ?? "250");

async function fw(url: string, opts: RequestInit = {}, ms = 10000): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal }); }
  finally { clearTimeout(t); }
}

// Assinatura da API de afiliado da Shopee: SHA-256 simples da concatenacao.
// NAO e HMAC — ver o cabecalho da v23. Web Crypto, sem import de terceiro.
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function detectStore(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("mercadolivre") || u.includes("mercadolibre") || u.includes("produto.mercadol") || /mlb[-_]?\d+/i.test(u)) return "mercadolivre";
  if (u.includes("shopee") || u.includes("s.shopee")) return "shopee";
  if (u.includes("amazon")) return "amazon";
  if (u.includes("aliexpress")) return "aliexpress";
  if (u.includes("magalu") || u.includes("magazineluiza")) return "magalu";
  if (u.includes("natura")) return "natura";
  if (u.includes("shein")) return "shein";
  return "outras";
}

function getUserIdFromJwt(authHeader: string | null): string | null {
  try {
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return null;
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    return payload.sub || null;
  } catch { return null; }
}

// Retorna os dois tokens pessoais do usuario [primario, backup] + o cookie de sessao do ML.
// Strings vazias se ausentes.
async function getPersonalMlCredentials(sb: ReturnType<typeof createClient> | null, userId: string | null): Promise<[string, string, string]> {
  if (!sb || !userId) return ["", "", ""];
  try {
    const { data } = await sb.from("profiles").select("scrape_do_token, scrape_do_token_2, ml_session_cookie").eq("id", userId).maybeSingle();
    return [
      String(data?.scrape_do_token ?? "").trim(),
      String(data?.scrape_do_token_2 ?? "").trim(),
      String(data?.ml_session_cookie ?? "").trim(),
    ];
  } catch { return ["", "", ""]; }
}

async function sharedQuotaAvailable(sb: ReturnType<typeof createClient> | null): Promise<{ ok: boolean; today: number; month: number }> {
  if (!sb) return { ok: true, today: 0, month: 0 };
  try {
    const { data, error } = await sb.rpc("get_radar_ml_quota_status");
    if (error) return { ok: true, today: 0, month: 0 };
    const q: any = Array.isArray(data) ? data[0] : data;
    const today = Number(q?.today_manual ?? 0);
    const month = Number(q?.month_manual ?? 0);
    const worstCase = ML_PRODUCT_MAX_REQUESTS * ML_REQUEST_COST;
    const ok = (today + worstCase) <= MANUAL_DAILY_CAP && (month + worstCase) <= MANUAL_MONTHLY_CAP;
    return { ok, today, month };
  } catch { return { ok: true, today: 0, month: 0 }; }
}

async function buscaRecenteDuplicada(sb: ReturnType<typeof createClient> | null, mlb: string): Promise<boolean> {
  if (!sb) return false;
  try {
    const since = new Date(Date.now() - DEDUP_WINDOW_SECONDS * 1000).toISOString();
    const { data } = await sb.from("radar_ml_quota")
      .select("id")
      .eq("usage_type", "manual")
      .eq("keyword", `MLB${mlb}`)
      .gte("created_at", since)
      .limit(1);
    return !!(data && data.length > 0);
  } catch { return false; }
}

async function logSharedUsage(sb: ReturnType<typeof createClient> | null, mlb?: string) {
  try {
    if (!sb) return;
    const credits = ML_PRODUCT_MAX_REQUESTS * ML_REQUEST_COST;
    await sb.from("radar_ml_quota").insert({ usage_type: "manual", keyword: mlb ? `MLB${mlb}` : null, credits_used: credits });
  } catch { }
}

// Extrai o ID numerico do MLB de uma URL do ML.
// Suporta: /MLB-3542413057, /MLB3542413057 (path) e /up/MLBU...?item_id=MLB3542413057 (query).
function extractMlbId(url: string): string | null {
  const pathMatch = url.match(/MLB[-_]?(\d+)/i);
  if (pathMatch) return pathMatch[1];
  try {
    const qs = new URL(url).searchParams.get("item_id") ?? "";
    const qsMatch = qs.match(/MLB[-_]?(\d+)/i);
    if (qsMatch) return qsMatch[1];
  } catch { }
  return null;
}

async function fetchMercadoLivre(url: string, waEngineUrl: string, waEngineToken: string, sb: ReturnType<typeof createClient> | null, userId: string | null): Promise<any> {
  const mlb = extractMlbId(url);
  console.log(`[ML] MLB extraido: ${mlb} de ${url.slice(0, 80)}`);
  if (!mlb) return { success: false, store: "mercadolivre", error: "MLB não encontrado no link" };

  const [personalToken, personalToken2, mlCookie] = await getPersonalMlCredentials(sb, userId);
  const hasPersonalToken = !!personalToken;
  const hasMlCookie = !!mlCookie;

  if (!hasPersonalToken && !hasMlCookie) {
    const duplicada = await buscaRecenteDuplicada(sb, mlb);
    if (duplicada) {
      console.log(`[ML] busca duplicada bloqueada para MLB${mlb}`);
      return { success: false, store: "mercadolivre", error: `Já buscando MLB${mlb} — aguarde alguns segundos e tente novamente.` };
    }
  }

  let quota = { ok: true, today: 0, month: 0 };
  if (!hasPersonalToken && !hasMlCookie) {
    quota = await sharedQuotaAvailable(sb);
    console.log(`[ML] quota compartilhada: hoje=${quota.today}/${MANUAL_DAILY_CAP} mes=${quota.month}/${MANUAL_MONTHLY_CAP} ok=${quota.ok}`);
  } else {
    console.log(`[ML] usando credencial pessoal do usuário (cookie=${hasMlCookie ? "sim" : "não"}, scrape.do=${hasPersonalToken ? "sim" : "não"}${personalToken2 ? "+backup" : ""})`);
  }

  if ((hasPersonalToken || hasMlCookie || quota.ok) && waEngineUrl && waEngineToken) {
    if (!hasPersonalToken && !hasMlCookie) await logSharedUsage(sb, mlb);
    console.log(`[ML] Tentando wa-engine /ml-product para MLB${mlb}`);
    try {
      let endpoint = `${waEngineUrl}/ml-product?url=${encodeURIComponent(url)}`;
      if (hasMlCookie) endpoint += `&userMlCookie=${encodeURIComponent(mlCookie)}`;
      if (hasPersonalToken) endpoint += `&userScrapeToken=${encodeURIComponent(personalToken)}`;
      if (personalToken2) endpoint += `&userScrapeToken2=${encodeURIComponent(personalToken2)}`;
      const r = await fw(endpoint, {
        headers: { "Authorization": `Bearer ${waEngineToken}` }
      }, 25000);
      console.log(`[ML] wa-engine HTTP: ${r.status}`);
      if (r.ok) {
        const d = await r.json();
        console.log(`[ML] wa-engine ok=${d.ok} title=${(d.title || "").slice(0, 40)} tokenUsado=${d.tokenUsed || "?"}`);
        if (d.ok && d.title) {
          return {
            success: true, source: "scraping", store: "mercadolivre",
            name: d.name || d.title, title: d.title,
            image: d.image || "", thumbnail: d.image || "",
            price_to: d.price_to, price_from: d.price_from,
            price: d.price_to, discount_pct: d.discount_pct,
            affiliate_url: url,
          };
        }
        if (d.creditsExhausted) {
          return { success: false, store: "mercadolivre", error: d.error || "Créditos do Scrape.do esgotados.", creditsExhausted: true };
        }
      }
    } catch (e) { console.warn("[ML] wa-engine falhou:", (e as Error).message); }
  } else if (!quota.ok) {
    console.log(`[ML] Limite compartilhado atingido — indo pro Microlink`);
  }

  console.log(`[ML] Tentando Microlink para MLB${mlb}`);
  try {
    const r = await fw(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {}, 8000);
    if (r.ok) {
      const d = await r.json();
      if (d.status === "success" && d.data?.title) {
        const name = d.data.title.slice(0, 120);
        const finalUrl = String(d.data.url || "").toLowerCase();
        const lang = String(d.data.lang || "").toLowerCase();
        const generic = ["mercado libre", "mercado livre"];
        const isGenericTitle = generic.some(g => name.toLowerCase().trim() === g);
        const isWrongDomain = !!finalUrl && !finalUrl.includes("mercadolivre.com");
        const isWrongLang = !!lang && !lang.startsWith("pt");
        if (isGenericTitle || isWrongDomain || isWrongLang) {
          console.warn(`[ML] Microlink rejeitado — genérico=${isGenericTitle} domínio_não_br=${isWrongDomain}(${finalUrl}) idioma_não_pt=${isWrongLang}(${lang}) título="${name}"`);
        } else {
          return {
            success: true, source: "scraping", store: "mercadolivre",
            name, title: name,
            image: d.data.image?.url || "", thumbnail: d.data.image?.url || "",
            affiliate_url: url,
          };
        }
      }
    }
  } catch (e) { console.warn("[ML] Microlink falhou:", (e as Error).message); }

  return { success: false, store: "mercadolivre", error: `Não foi possível obter dados do produto MLB${mlb}. Preencha manualmente.` };
}

async function fetchShopee(url: string, appId: string, appSecret: string): Promise<any> {
  let itemId: string | undefined, shopId: string | undefined;
  const m = url.match(/\/product\/(\d+)\/(\d+)/);
  if (m) { shopId = m[1]; itemId = m[2]; }
  if (!itemId || !shopId) return { success: false, store: "shopee", error: "IDs do produto não encontrados no link" };
  const query = `{ productOfferV2(itemId: ${itemId}, shopId: ${shopId}) { nodes { itemId shopId productName imageUrl price priceMin priceDiscountRate commissionRate ratingStar sales offerLink productLink } } }`;
  const ts = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ query });
  const sig = await sha256Hex(`${appId}${ts}${payload}${appSecret}`);
  const r = await fw("https://open-api.affiliate.shopee.com.br/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `SHA256 Credential=${appId},Timestamp=${ts},Signature=${sig}` },
    body: payload,
  }, 10000);
  if (!r.ok) return { success: false, store: "shopee", error: `HTTP ${r.status}` };
  const d = await r.json();
  // A Shopee devolve HTTP 200 com {errors:[...]} quando recusa a consulta.
  // Misturar isso com "resultado vazio" foi o que escondeu a assinatura errada.
  if (Array.isArray(d?.errors) && d.errors.length) {
    const msg = String(d.errors[0]?.message ?? "sem mensagem");
    console.warn(`[shopee] a API recusou a consulta: ${msg}`);
    return { success: false, store: "shopee", error: `a Shopee recusou a consulta: ${msg}` };
  }
  const node = d?.data?.productOfferV2?.nodes?.[0];
  if (!node) return { success: false, store: "shopee", error: "esse produto nao esta no catalogo de ofertas da Shopee" };
  return {
    success: true, source: "api", store: "shopee",
    name: node.productName, title: node.productName,
    image: node.imageUrl, thumbnail: node.imageUrl,
    price_from: node.price ? String(node.price) : undefined,
    price_to: node.priceMin ? String(node.priceMin) : undefined,
    commission_rate: node.commissionRate,
    discount_pct: node.priceDiscountRate ? Math.round(node.priceDiscountRate) : undefined,
    rating: node.ratingStar, sales: node.sales, short_link: node.offerLink,
    product_link: node.productLink,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const { url, credentials = {} } = await req.json();
    console.log(`[product-search v24] payload recebido: url=${JSON.stringify(url)} typeof=${typeof url}`);
    if (!url || !/^https?:\/\//i.test(url))
      return new Response(JSON.stringify({ success: false, error: "URL inválida" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

    const store = detectStore(url);
    const authHeader = req.headers.get("authorization");
    const userId = getUserIdFromJwt(authHeader);
    console.log(`[product-search v24] store=${store} url=${url.slice(0, 80)} user=${userId ?? "anon"}`);

    const waEngineUrl = Deno.env.get("WA_ENGINE_URL") || "https://megalinksbr-wa-engine.fwezsn.easypanel.host";
    const waEngineToken = Deno.env.get("WA_ENGINE_TOKEN") || "";
    const sb = (SUPABASE_URL && SERVICE_ROLE) ? createClient(SUPABASE_URL, SERVICE_ROLE) : null;

    let result: any = null;

    if (store === "mercadolivre") {
      result = await fetchMercadoLivre(url, waEngineUrl, waEngineToken, sb, userId);
    } else if (store === "shopee" && credentials.shopee_app_id && credentials.shopee_app_secret) {
      result = await fetchShopee(url, credentials.shopee_app_id, credentials.shopee_app_secret);
    }

    if (!result?.success) {
      result = result || { success: false, source: "none", store, error: "Loja sem integração automática. Preencha manualmente." };
    }

    console.log(`[product-search v24] success=${result.success} name=${(result.name || "").slice(0, 40)}`);
    return new Response(JSON.stringify(result), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
