// resolve-link v5 - resolve o link de um post copiado de outro grupo (Clone Post)
//
// v5 (31/07, noite) - TERCEIRO formato de URL de produto da Shopee: /{loja}/LOJA/ITEM.
//   MEDIDO: https://s.shopee.com.br/4AykYR6yxu (link gerado pelo Radar DESTA
//   plataforma) redireciona para
//   https://shopee.com.br/opaanlp/1006215031/24442629738?...
//   O primeiro segmento e o slug da loja e VARIA - nao e a palavra "product".
//   A v4 so casava /product/LOJA/ITEM e -i.LOJA.ITEM, entao recusava com
//   "nao tem o codigo -i.LOJA.ITEM" uma pagina de produto legitima, com loja e
//   item visiveis na propria URL. Era a nossa propria oferta sendo rejeitada.
//   O item 24442629738 esta em radar_offers (Senbenbao X55, R$ 12,51, -65%),
//   ou seja, veio do catalogo de ofertas da Shopee - nao era link ruim.
//
//   O casamento e ESTRITO de proposito: exatamente 3 segmentos, os dois ultimos
//   so digitos e com 6+ digitos cada, e o primeiro segmento fora de uma lista de
//   caminhos conhecidos da Shopee que nao sao loja. Regra frouxa aqui nao erra
//   recusando: erra ACEITANDO uma pagina que nao e produto, e ai o erro so
//   aparece la na frente, na product-search, com mensagem que nao aponta pra ca.
//
// Medido com dois posts reais (29/07):
//  - go.promozone.ai/shopee/lld73p -> SPA que so redireciona por JavaScript.
//    Nem UA de bot (facebookexternalhit, WhatsApp) nem Microlink chegam ao destino.
//    Nao da pra resolver no servidor: agora devolve instrucao de abrir e copiar.
//  - meli.la/2Jx7X1x -> 2 saltos ate /social/<afiliado>, que e a VITRINE do afiliado,
//    nao a pagina de um produto. Depois cai em /gz/webdevice/config?go=<url>.
//    Agora desembrulha o ?go= e explica que vitrine nao tem produto pra clonar.
// v3: loja detectada pelo DOMINIO (nao pelo path) e segue redirect de qualquer
//    encurtador, inclusive de dominio proprio.
// v2: acumula parametros de afiliado de todos os saltos.
// Regra: NUNCA devolver vazio no lugar de "falhou" - todo erro traz stage + motivo.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_HOPS = 8;
const HOP_TIMEOUT_MS = 8000;

const AFFILIATE_PARAMS = [
  "affiliate_id", "af_sub1", "af_sub2", "af_sub3", "af_sub4", "af_sub5",
  "af_click_lookback", "af_viewthrough_lookback", "pid", "xptdk", "uls_trackid",
  "utm_content", "af_siteid", "is_retargeting", "af_channel",
  "matt_tool", "matt_word", "matt_medium", "matt_campaign", "matt_source",
  "forceInApp", "ref", "tracking_id", "quantity",
  "tag", "ascsubtag", "linkCode", "linkId", "creative", "creativeASIN",
  "camp", "ref_", "smid", "psc", "th",
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_id",
  "gclid", "fbclid", "sourceId", "partner_id", "publisher_id", "aff_id",
];

const MARKETPLACE_HOSTS: Record<string, string> = {
  "shopee.com.br": "shopee",
  "mercadolivre.com.br": "mercadolivre",
  "mercadolibre.com": "mercadolivre",
  "mercadolivre.com": "mercadolivre",
  "amazon.com.br": "amazon",
  "amazon.com": "amazon",
  "aliexpress.com": "aliexpress",
  "magazineluiza.com.br": "magalu",
  "magazinevoce.com.br": "magalu",
  "shein.com": "shein",
  "shein.com.br": "shein",
  "natura.com.br": "natura",
  "terabyteshop.com.br": "terabyte",
};

const SHORTENER_HOSTS = ["s.shopee.com.br", "l.shopee.com.br", "shope.ee", "amzn.to", "a.co", "meli.la"];
const SHORTENER_PATHS = ["/sec/", "/an_redir", "/gz/webdevice"];
// Parametros que carregam a url de destino dentro de uma url de rastreio.
const WRAPPER_PARAMS = ["origin_link", "originLink", "go", "url", "redirect", "target", "dest", "u"];

// Primeiros segmentos de path da Shopee que NAO sao slug de loja. Sem esta
// lista, /{qualquer}/DIGITOS/DIGITOS aceitaria caminho de sistema como produto.
const SHOPEE_NAO_LOJA = new Set([
  "product", "search", "shop", "mall", "m", "web", "api", "oauth", "login",
  "cart", "user", "buyer", "seller", "voucher", "campaign", "collections",
  "daily_discover", "flash_sale", "find_similar_products", "universal-link",
  "verify", "checkout", "wallet", "livestream", "video", "feed",
]);

const STORE_LABEL: Record<string, string> = {
  mercadolivre: "Mercado Livre", shopee: "Shopee", amazon: "Amazon",
  aliexpress: "AliExpress", magalu: "Magalu", natura: "Natura", shein: "Shein",
  terabyte: "TerabyteShop", outras: "",
};

function hostOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function detectStore(url: string): string {
  const h = hostOf(url);
  if (!h) return "outras";
  for (const [dom, store] of Object.entries(MARKETPLACE_HOSTS)) {
    if (h === dom || h.endsWith("." + dom)) return store;
  }
  return "outras";
}

function isBlockedHost(url: string): boolean {
  const h = hostOf(url);
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^\[?::1\]?$/.test(h)) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  try { if (!/^https?:$/.test(new URL(url).protocol)) return true; } catch { return true; }
  return false;
}

function precisaSeguir(url: string): boolean {
  const h = hostOf(url);
  if (SHORTENER_HOSTS.includes(h)) return true;
  try {
    const uu = new URL(url);
    const alvo = (uu.pathname + uu.search).toLowerCase();
    if (SHORTENER_PATHS.some((s) => alvo.includes(s))) return true;
  } catch { /* segue */ }
  return detectStore(url) === "outras";
}

function extractUrls(text: string): string[] {
  const raw = text.match(/https?:\/\/[^\s<>"' ]+/gi) || [];
  return raw.map((u) => u.replace(/[)\].,;:!?'"]+$/g, "")).filter(Boolean);
}

// Link de convite de grupo nunca e produto - nao pode ser escolhido como oferta.
const CONVITE_HOSTS = ["chat.whatsapp.com", "t.me", "telegram.me", "sndflw.com", "whatsapp.com"];
function isConvite(url: string): boolean {
  const h = hostOf(url);
  return CONVITE_HOSTS.some((c) => h === c || h.endsWith("." + c));
}

function pickUrl(urls: string[]): string | null {
  const uteis = urls.filter((u) => !isConvite(u));
  if (!uteis.length) return null;
  const marketplace = uteis.find((u) => detectStore(u) !== "outras");
  return marketplace || uteis[0];
}

function affiliateParamsIn(url: string): string[] {
  try {
    const u = new URL(url);
    return AFFILIATE_PARAMS.filter((p) => u.searchParams.has(p));
  } catch { return []; }
}

async function hop(url: string): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), HOP_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET", redirect: "manual",
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: c.signal,
    });
  } finally { clearTimeout(t); }
}

// Desembrulha url-dentro-de-url (an_redir da Shopee, ?go= do ML, etc).
function unwrap(url: string): string | null {
  try {
    const u = new URL(url);
    for (const p of WRAPPER_PARAMS) {
      const v = u.searchParams.get(p);
      if (v && /^https?:\/\//i.test(v) && v !== url) return v;
    }
  } catch { /* url malformada */ }
  return null;
}

function extractFromHtml(html: string): string | null {
  const meta = html.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"']+)["']/i);
  if (meta && meta[1]) return meta[1].trim();
  const js = html.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
  if (js && js[1] && /^https?:\/\//i.test(js[1])) return js[1].trim();
  const og = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
  if (og && og[1] && /^https?:\/\//i.test(og[1])) return og[1].trim();
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (canonical && canonical[1] && /^https?:\/\//i.test(canonical[1])) return canonical[1].trim();
  // ultimo recurso: qualquer url de marketplace escrita no corpo da pagina
  const qualquer = html.match(/https?:\/\/[^"'\s<>]*(?:shopee\.com\.br|mercadolivre\.com\.br|amazon\.com\.br)[^"'\s<>]*/i);
  if (qualquer && qualquer[0]) return qualquer[0];
  return null;
}

async function followRedirects(startUrl: string) {
  let url = startUrl;
  let hops = 0;
  let spa = false;
  const trail: string[] = [startUrl];
  const seen = new Set<string>(affiliateParamsIn(startUrl));
  const remember = (u: string) => { for (const p of affiliateParamsIn(u)) seen.add(p); };

  for (let i = 0; i < MAX_HOPS; i++) {
    const unwrapped = unwrap(url);
    if (unwrapped && unwrapped !== url) { url = unwrapped; remember(url); trail.push(url); hops++; continue; }
    if (!precisaSeguir(url)) break;
    if (isBlockedHost(url)) throw new Error(`endereco nao permitido: ${hostOf(url)}`);

    const r = await hop(url);
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location");
      if (!loc) throw new Error(`HTTP ${r.status} sem cabecalho Location`);
      url = new URL(loc, url).toString(); remember(url); trail.push(url); hops++; continue;
    }
    if (r.ok) {
      const html = await r.text();
      const next = extractFromHtml(html);
      if (next) {
        const abs = new URL(next, url).toString();
        if (abs !== url) { url = abs; remember(url); trail.push(url); hops++; continue; }
      }
      // Pagina que so monta o destino no navegador (SPA de encurtador).
      spa = /<div id=["']app["']|<div id=["']root["']|redirecionando/i.test(html);
      return { url, hops, seen: [...seen], trail, spa };
    }
    throw new Error(`o encurtador respondeu HTTP ${r.status}`);
  }
  return { url, hops, seen: [...seen], trail, spa };
}

function stripAffiliate(url: string): { url: string; stripped: string[] } {
  try {
    const u = new URL(url);
    const stripped: string[] = [];
    for (const p of AFFILIATE_PARAMS) {
      if (u.searchParams.has(p)) { stripped.push(p); u.searchParams.delete(p); }
    }
    u.hash = "";
    return { url: u.toString(), stripped };
  } catch { return { url, stripped: [] }; }
}

function normalize(url: string, store: string): { url: string; error?: string } {
  try {
    const u = new URL(url);
    if (store === "shopee") {
      if (/\/product\/\d+\/\d+/.test(u.pathname)) return { url: `https://shopee.com.br${u.pathname}` };
      const m = u.pathname.match(/-i\.(\d+)\.(\d+)/);
      if (m) return { url: `https://shopee.com.br/product/${m[1]}/${m[2]}` };
      // v5: /{slug-da-loja}/LOJA/ITEM - o formato que o Radar desta plataforma gera.
      const slug = u.pathname.match(/^\/([^\/]+)\/(\d{6,})\/(\d{6,})\/?$/);
      if (slug && !SHOPEE_NAO_LOJA.has(decodeURIComponent(slug[1]).toLowerCase())) {
        return { url: `https://shopee.com.br/product/${slug[2]}/${slug[3]}` };
      }
      return { url, error: "esse link da Shopee nao aponta pra um produto (nao achei o par LOJA/ITEM na URL). Abra a oferta e copie o link da pagina do produto." };
    }
    if (store === "amazon") {
      const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (m) return { url: `https://www.amazon.com.br/dp/${m[1].toUpperCase()}` };
      return { url, error: "esse link da Amazon nao aponta pra um produto (nao achei o ASIN). Abra a oferta e copie o link da pagina do produto." };
    }
    if (store === "mercadolivre") {
      const hasMlb = /MLB[-_]?\d+/i.test(url) || !!u.searchParams.get("item_id");
      if (hasMlb) return { url };
      if (/^\/(social|perfil|profile|s\/)/i.test(u.pathname)) {
        return { url, error: "esse link leva a VITRINE do afiliado no Mercado Livre, nao a um produto. Abra o link, entre no produto anunciado e copie o link de la." };
      }
      return { url, error: "o link do Mercado Livre nao tem codigo MLB depois de resolvido. Abra a oferta e copie o link da pagina do produto." };
    }
    return { url };
  } catch { return { url, error: "URL invalida depois da limpeza" }; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const { text = "", url: directUrl = "" } = await req.json();
    const source = String(directUrl || text || "").trim();
    if (!source) return json({ ok: false, stage: "input", error: "Nada foi enviado para clonar." }, 400);
    const urls = extractUrls(source);
    const picked = directUrl && /^https?:\/\//i.test(directUrl) ? directUrl : pickUrl(urls);
    if (!picked) {
      const soConvite = urls.length > 0;
      return json({
        ok: false, stage: "extract",
        error: soConvite
          ? "So achei link de convite de grupo nessa mensagem, nenhum link de produto."
          : "Nao encontrei nenhum link na mensagem colada. Copie a mensagem inteira do grupo, incluindo o link.",
      }, 422);
    }
    if (isBlockedHost(picked)) {
      return json({ ok: false, stage: "extract", original: picked, error: "Esse endereco nao pode ser aberto." }, 422);
    }
    let resolved = picked; let hops = 0; let seen: string[] = []; let trail: string[] = []; let spa = false;
    try {
      const r = await followRedirects(picked);
      resolved = r.url; hops = r.hops; seen = r.seen; trail = r.trail; spa = r.spa;
    } catch (e) {
      return json({ ok: false, stage: "redirect", original: picked, error: `Nao consegui abrir o link encurtado: ${(e as Error).message}` }, 502);
    }
    const store = detectStore(resolved);
    if (store === "outras") {
      const host = hostOf(resolved) || "lugar nenhum";
      return json({
        ok: false, stage: spa ? "spa" : "store", original: picked, resolved, hops, trail, spa,
        error: spa
          ? `O encurtador ${host} so revela o destino dentro do navegador — nao da pra resolver por aqui. Toque no link da oferta, espere abrir a loja e cole o link que aparecer na barra de endereco.`
          : `O link terminou em ${host}, que nao e uma loja que a gente sabe ler. Abra a oferta no navegador e cole o link da pagina do produto.`,
      }, 422);
    }
    const { url: cleaned, stripped } = stripAffiliate(resolved);
    const allStripped = [...new Set([...seen, ...stripped])];
    const norm = normalize(cleaned, store);
    if (norm.error) {
      return json({ ok: false, stage: "normalize", original: picked, resolved, store, store_label: STORE_LABEL[store] || "", hops, trail, error: norm.error }, 422);
    }
    console.log(`[resolve-link v5] ok store=${store} hops=${hops} stripped=${allStripped.join(",") || "-"} -> ${norm.url.slice(0, 80)}`);
    return json({
      ok: true, original: picked, resolved, url: norm.url, store,
      store_label: STORE_LABEL[store] || "", hops, trail, stripped: allStripped,
      foreign_affiliate: allStripped.length > 0,
      other_urls: urls.filter((u) => u !== picked).slice(0, 5),
    });
  } catch (e) {
    console.error("[resolve-link v5] FALHOU:", (e as Error).message);
    return json({ ok: false, stage: "server", error: (e as Error).message }, 500);
  }
});
