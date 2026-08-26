// product-search v31 — o Postar Agora do Mercado Livre
// v31 (26/08): so o timeout do wa-engine, de 25 s para 70 s. Ver o comentario
//   dentro de fetchMercadoLivre — MEDIDO, o mesmo link levou de 4 s a 51,6 s.
// v30 (26/08, MEDIDO em producao antes de escrever uma linha): o Erico reportou
//   "o Postar Agora parou de coletar as informacoes automaticas, verifique
//   tambem da Shopee e Amazon; comecou depois que inserimos a Shein".
//   MEDICAO, na sessao logada dele, com os links dele:
//     Shopee  (i.217167158.19297725115)  -> success=true, nome + foto            OK
//     Amazon  (/dp/B079VW5KTT com https) -> success=true, 75,90 / 89,90, foto    OK
//     ML      (/p/MLB45819230)           -> success=true, nome + precos + foto   OK
//     ML      (/up/MLBU4110581108)       -> success=FALSE em ~400 ms             FALHA
//   Ou seja: a Shein NAO quebrou Shopee nem Amazon — o codigo das duas nao foi
//   tocado desde a v27 e as duas leem hoje. Dois defeitos reais apareceram:
//   (1) /up/MLBU<digitos> sem item_id no query string morria em "MLB nao
//       encontrado no link" — ver extractMlbId abaixo. O wa-engine tinha o MESMO
//       defeito e devolvia HTTP 400; consertado la tambem em 26/08, e depois
//       disso ele LEU o produto (Cooktop Itatiaia, R$ 276,44 de R$ 589,99);
//   (2) o fallback Microlink do ML ACEITAVA a pagina de desafio antibot como se
//       fosse o produto — medido 5x em 26/08 01:15-01:19, success=true com
//       name="Por seguranca, complete esta etapa". Ver o filtro `desafios`.
//   O terceiro achado e de FRONTEND, nao desta funcao: as 18:46 o painel mandou
//   url="amazon.com.br/..." SEM https, esta funcao devolveu 400 (correto) e a
//   tela traduziu isso como "Amazon requer PA-API" (errado). O 400 agora sai
//   com motivo="url_sem_protocolo" e texto que diz o que fazer.
//
// product-search v29 — Shein: Microlink genérico mentia "success" (P44)
// v29 (25/08, mesma sessão, MEDIDO): Érico testou a v28 com link real de
//   produto (216706267.html) e o resultado veio ERRADO — nome e imagem da
//   HOME da Shein, não do produto, com success:true. Log real conferido por
//   `query_logs`: o fetch direto NUNCA acha og:title (SPA sem SSR de meta —
//   confirmado, não é bloqueio de IP como a v28 supôs) e cai sempre no
//   Microlink, que devolve a página genérica em vez de renderizar o JS da
//   página de produto — mesmo defeito de fundo da P25 (Shopee avulsa).
//   CONSERTO: `consultarSheinMicrolink` agora reprova o resultado quando (a)
//   o id do produto ("-p-<digitos>.html") na URL pedida não bate com o da
//   URL que o Microlink resolveu, ou (b) o título é um dos genéricos
//   conhecidos da Shein. Imagem em `data:` (o placeholder de "sem imagem" do
//   Microlink) também é descartada. Sem essas defesas, "success:true" com
//   nome da loja no lugar do produto é PIOR que falha — o usuário não
//   percebe e posta errado.
//   ⚠️ NÃO RESOLVIDO: com o fetch direto sempre vazio e o Microlink sempre
//   genérico para produto real, a Shein PROVAVELMENTE fica sem leitura
//   nenhuma na prática — só sem mentir sobre isso agora. Ler de verdade exige
//   renderizar o JS da página (Scrape.do com render, ou equivalente), que é
//   decisão de custo, não só código. P44 parte 1 continua ABERTA.
//
// product-search v28 — a Shein passa a ser lida no Postar Agora (P44, parte 1 de 5)
// v28 (25/08): ate aqui a Shein caia no generico "Loja sem integracao automatica.
//   Preencha manualmente.", junto com AliExpress, Magalu, Natura e Terabyte (P44).
//   CONSERTO, saida (a) da P44: leitor generico por og:title/og:image + preco do
//   JSON-LD (schema.org Product/offers.price) que a pagina do produto expõe pra
//   SEO/compartilhamento social — NAO e scraping de layout especifico, e o mesmo
//   par de tags que qualquer robo de previa (WhatsApp, Facebook) ja le.
//   Duas tentativas, em ordem: (1) fetch direto da pagina, UA de navegador —
//   pode falhar se a Shein bloquear o IP do Supabase, o que NAO foi medido
//   ainda; (2) Microlink como reforco, mesmo fallback ja usado no Mercado Livre.
//   Preco e OPCIONAL: se o JSON-LD nao trouxer numero valido, devolve titulo e
//   foto sem preco — nao inventa numero, mesma regra do "de" da Shopee (P32).
//   ⚠️ NAO MEDIDO EM PRODUCAO — precisa de um link real de produto da Shein
//   aberto pelo Postar Agora depois do deploy. Ver P44 no ESTADO_ATUAL.md.
//   AliExpress, Magalu, Natura e Terabyte continuam SEM leitor — a P44 fecha só
//   quando as 5 estiverem cobertas; esta e a primeira.
//
// product-search v27 — a Shopee volta a ser lida no Postar Agora
// v27 (04/08, noite): o leitor da Shopee so conhecia /product/LOJA/ITEM. Ver o
//   comentario de urlLimpaPelaResolveLink. Junto: shp.ee no detectStore e motivo
//   em campo proprio, para a tela parar de traduzir "link nao reconhecido" como
//   "faltam credenciais".
// product-search v26 — a Amazon passa a ser lida no Postar Agora
// v26 (04/08): ate aqui esta funcao tinha DOIS ramos de loja, Mercado Livre e
//   Shopee. Amazon, AliExpress, Magalu, Shein, Natura e Terabyte caiam no
//   "Loja sem integracao automatica. Preencha manualmente." — nunca houve
//   leitor para elas neste caminho.
//   MEDIDO nos logs de 04/08, tentativas do Erico: 3504 ms para um link de ML
//   (busca real) contra 140-164 ms para os outros (retorno imediato, sem falar
//   com loja nenhuma). O tempo separa os dois casos sem ambiguidade.
//   ASSIMETRIA que motivou o conserto: o Clone Post automatico JA lia Amazon,
//   porque a clone-ingest v15 tem leitor proprio de pagina (P21). Duas
//   implementacoes da mesma coisa no mesmo repo, com capacidades diferentes —
//   o Postar Agora recusava a loja que o Clone Post lia sem dificuldade.
//   CONSERTO: o leitor `consultarAmazonDireto` da clone-ingest foi copiado
//   VERBATIM para ca, com as funcoes de que depende. Ver o comentario do bloco.
//   NOTA de versao: o cabecalho dizia v25 e os console.log diziam v24. Os dois
//   passam a dizer v26. Numero de versao continua nao sendo prova de nada.
//
// product-search v25 — a Shopee para de devolver um "de" que nao existe (P32)
// v25 (01/08, noite): MEDIDO em producao, 3 de 3 capturas reais de Shopee
//   chegaram com price_original IGUAL a price e ainda assim um desconto de 53%,
//   42% e 35%. Os produtos entraram no rodizio do grupo e o post sairia
//   "De R$ 56,80 por R$ 56,80 - 53% OFF".
//   A causa estava aqui: `price_from` era preenchido com `node.price`, que NAO
//   e o preco anterior — e o preco de venda, o mesmo valor que `priceMin`. A
//   consulta GraphQL nem pede o preco original; a API so informa a TAXA
//   (`priceDiscountRate`). Ou seja, o campo carregava um numero que nunca foi um
//   "de", e nada no caminho conciliava os dois.
//   CONSERTO: nao mandar `price_from` nenhum para a Shopee. Se a loja nao diz
//   qual era o preco antes, a plataforma nao afirma — mesma regra do buybox da
//   Amazon, que devolve null quando as duas testemunhas nao concordam. O selo de
//   desconto continua, porque esse a API afirma.
//   DESCARTADO de proposito: calcular price/(1-taxa). Devolveria o riscado, mas
//   seria numero DEDUZIDO e nao lido, sujeito a arredondamento — exatamente a
//   classe de erro que a P21 e a P30 fecharam do outro lado.
// v24 — conserta a assinatura da Shopee E o campo inexistente
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
  // v27: shp.ee e o encurtador oficial da Shopee e NAO contem a string "shopee".
  // Sem esta linha um link legitimo da Shopee cai em "outras" e o usuario recebe
  // "Loja sem integracao automatica. Preencha manualmente."
  if (u.includes("shopee") || u.includes("s.shopee") || u.includes("shp.ee")) return "shopee";
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
// Suporta: /MLB-3542413057, /MLB3542413057 (path), /up/MLBU...?item_id=MLB3542413057
// (query) e, desde a v30, /up/MLBU4110581108 sem item_id nenhum.
function extractMlbId(url: string): string | null {
  const pathMatch = url.match(/MLB[-_]?(\d+)/i);
  if (pathMatch) return pathMatch[1];
  try {
    const qs = new URL(url).searchParams.get("item_id") ?? "";
    const qsMatch = qs.match(/MLB[-_]?(\d+)/i);
    if (qsMatch) return qsMatch[1];
  } catch { }
  // v30: /up/MLBU<digitos> e um id LEGITIMO do ML ("user product") e NAO contem
  // nenhum MLB<digitos> em lugar nenhum da URL — por isso caia aqui em null e a
  // funcao devolvia "MLB nao encontrado no link" em ~400 ms, sem sequer tentar o
  // wa-engine. MEDIDO em 26/08 com o link do Erico
  // (.../cooktop-fogao-itatiaia-.../up/MLBU4110581108): 4 tentativas, 375-500 ms,
  // falha instantanea em todas. A v17 so cobriu /up/MLBU...?item_id=MLB..., que
  // traz o item id no query string; este formato NAO traz.
  // O id extraido nao monta URL nenhuma — o wa-engine recebe a URL ORIGINAL desde
  // a v19 —, ele so alimenta dedup, log de cota e mensagem de erro. Por isso
  // devolver "U<digitos>" e correto e nao colide com item id de verdade: o
  // `MLB${mlb}` dos chamadores remonta exatamente "MLBU4110581108".
  // Checado DEPOIS do item_id de proposito, para nao roubar a vez do caso da v17.
  const up = url.match(/MLBU[-_]?(\d+)/i);
  if (up) return `U${up[1]}`;
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
      // v31 (26/08, MEDIDO): 25 s era curto demais. Na mesma tarde, o MESMO link
      // (/up/MLBU4110581108) atraves do MESMO wa-engine levou 4,0 s / 13,3 s /
      // 17,6 s / 51,6 s em chamadas seguidas — o Scrape.do com super=true varia
      // muito em pagina de ML. O corte de 25 s abortava uma leitura que estava
      // funcionando, e a tela dizia "preencha manualmente" com o dado a caminho.
      // NAO era token morto: os dois tokens pessoais do usuario foram testados
      // isoladamente e leram o produto (17,6 s e 4,0 s, ok=true).
      // 70 s cobre a cauda medida com folga e fica bem abaixo do limite de parede
      // da Edge Function. O frontend precisa acompanhar (abort de 90 s la).
      }, 70000);
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
        // v30: MEDIDO em 26/08 01:15-01:19, cinco vezes seguidas — o Microlink
        // devolveu a pagina de DESAFIO ANTIBOT do ML e o filtro deixou passar:
        // success=true com name="Por seguranca, complete esta etapa", sem preco.
        // Mesma classe de erro da Shein v28/v29 (falso positivo e PIOR que falha:
        // o usuario nao percebe e posta o titulo do captcha como nome do
        // produto). Comparacao por INCLUSAO, nao por igualdade, porque o titulo
        // do desafio varia de sufixo.
        const desafios = [
          "complete esta etapa",
          "por seguranca, complete",
          "verifique que você não é um robô",
          "verifique que voce nao e um robo",
          "algo salió mal",
          "algo salio mal",
        ];
        const nomeLower = name.toLowerCase().trim();
        const isGenericTitle = generic.some(g => nomeLower === g) || desafios.some(g => nomeLower.includes(g));
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

// ── v27 · a Shopee so era lida em UM formato de URL ────────────────────────
// A P26 ensinou a resolve-link a reconhecer os formatos da Shopee em 01/08 e a
// normalizar todos para /product/LOJA/ITEM. Esta funcao nao recebeu aquela
// licao, e o Postar Agora fala so com ela: link copiado do app ("-i.LOJA.ITEM"),
// link com primeiro segmento variavel e link encurtado (s.shopee.com.br,
// shp.ee) morriam todos em "IDs do produto nao encontrados".
// MEDIDO em 04/08 com link real do Erico: 4 dos 5 formatos conhecidos falhavam,
// inclusive o mais comum, que e o que o site entrega ao copiar.
//
// NAO reimplementamos o reconhecimento aqui, de proposito. Copiar um SUBCONJUNTO
// dos formatos e pior do que nao copiar nenhum: da aparencia de cobertura e
// deixa de fora justamente o caso que a P26 descobriu (primeiro segmento
// variavel). Copia parcial aqui seria gemea da P43.
async function urlLimpaPelaResolveLink(url: string, authHeader: string | null): Promise<string | null> {
  // Preferir o JWT de quem chamou: ele JA passou pelo verify_jwt desta funcao,
  // entao e garantidamente aceito pela resolve-link. A SERVICE_ROLE fica de
  // reserva e pode nao ser JWT em projeto com chave nova — autenticar so por ela
  // daria 401 silencioso, e o conserto viraria mecanismo que nao executa nada.
  const cred = authHeader && authHeader.startsWith("Bearer ") ? authHeader : (SERVICE_ROLE ? `Bearer ${SERVICE_ROLE}` : "");
  if (!SUPABASE_URL || !cred) return null;
  try {
    const r = await fw(`${SUPABASE_URL}/functions/v1/resolve-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": cred },
      body: JSON.stringify({ url }),
    }, 12000);
    if (!r.ok) { console.warn(`[shopee] resolve-link respondeu HTTP ${r.status}`); return null; }
    const d = await r.json();
    if (!d?.ok) { console.warn(`[shopee] resolve-link recusou: ${d?.error ?? "sem motivo"}`); return null; }
    // `url` e a forma NORMALIZADA (/product/LOJA/ITEM). `resolved` e so o
    // pos-redirecionamento e pode continuar em qualquer um dos outros formatos.
    return String(d.url ?? "") || null;
  } catch (e) {
    console.warn(`[shopee] resolve-link falhou: ${(e as Error).message}`);
    return null;
  }
}

async function fetchShopee(url: string, appId: string, appSecret: string, authHeader: string | null): Promise<any> {
  let itemId: string | undefined, shopId: string | undefined;
  let m = url.match(/\/product\/(\d+)\/(\d+)/);
  if (!m) {
    const limpa = await urlLimpaPelaResolveLink(url, authHeader);
    if (limpa) {
      console.log(`[shopee] v27 normalizou pela resolve-link: ${limpa}`);
      m = limpa.match(/\/product\/(\d+)\/(\d+)/);
    }
  }
  if (m) { shopId = m[1]; itemId = m[2]; }
  if (!itemId || !shopId) return { success: false, store: "shopee", motivo: "link_nao_reconhecido", error: "esse link da Shopee nao aponta pra um produto (nao achei o par LOJA/ITEM na URL). Abra a oferta e copie o link da pagina do produto." };
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
    // v25/P32: `price_from` NAO e enviado, de proposito. `node.price` e o preco
    // de venda (mesmo valor de `priceMin`), nao o preco anterior. `undefined`
    // aqui quer dizer "a Shopee nao informa o de" — e quem le nao inventa um.
    price_to: node.priceMin ? String(node.priceMin) : undefined,
    commission_rate: node.commissionRate,
    discount_pct: node.priceDiscountRate ? Math.round(node.priceDiscountRate) : undefined,
    rating: node.ratingStar, sales: node.sales, short_link: node.offerLink,
    product_link: node.productLink,
  };
}


// ── Amazon lida da pagina (copiado da clone-ingest v15 · P21) ─────────────
//
// COPIA VERBATIM, e a duplicacao e consciente. O certo seria um modulo
// compartilhado, mas cada Edge Function do projeto e deployada com o seu proprio
// array de `files`, e a clone-ingest tem 72 KB — reemitir aquele arquivo para
// extrair um trecho e exatamente o tipo de operacao que ja colocou codigo errado
// em producao aqui. Duplicar e o risco menor HOJE; unificar e trabalho de sessao
// limpa, com as duas funcoes abertas lado a lado.
//
// SE MEXER AQUI, MEXA NOS DOIS LUGARES. A divergencia entre duas implementacoes
// da mesma leitura ja mordeu este repo mais de uma vez (o "de" da Shopee, que o
// Radar lia certo e a product-search lia errado).
const AMZ_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const AMZ_TIMEOUT_MS = 15000;

function numeroDaLoja(s: string): number | null {
  const n = Number(String(s ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function precoAmazon(html: string): { por: number | null; de: number | null } {
  const vazio = { por: null, de: null };

  // 1. Ancora. Sem o div do buybox nao ha preco a afirmar.
  const p = html.indexOf('<div id="corePriceDisplay_desktop_feature_div"');
  if (p < 0) return vazio;
  const bloco = html.slice(p, p + 4000);

  // 2. Duas testemunhas independentes do MESMO numero: o rotulo de
  // acessibilidade e o preco visivel. Discordancia entre elas nao vira palpite,
  // vira recusa — a pagina da Amazon tem preco de parcela, de assinatura e de
  // vendedor alternativo no mesmo HTML, e pegar o errado publica o errado.
  const mRotulo = bloco.match(/id="apex-pricetopay-accessibility-label"[\s\S]{0,300}?>[^0-9<]*([\d.]+,\d{2})/);
  const mInteiro = bloco.match(/a-price-whole">([\d.]+)/);
  const mCentavos = bloco.match(/a-price-fraction">(\d{2})/);
  if (!mRotulo || !mInteiro || !mCentavos) return vazio;

  const viaRotulo = numeroDaLoja(mRotulo[1]);
  const viaVisivel = numeroDaLoja(`${mInteiro[1]},${mCentavos[1]}`);
  if (viaRotulo === null || viaVisivel === null || viaRotulo !== viaVisivel) return vazio;

  // 3. O "de" e opcional e so vale se for maior que o "por".
  const mBase = bloco.match(/basisPrice[\s\S]{0,250}?([\d.]+,\d{2})/);
  const de = mBase ? numeroDaLoja(mBase[1]) : null;
  return { por: viaRotulo, de: de !== null && de > viaRotulo ? de : null };
}

function imagemAmazon(html: string): string {
  const p = html.indexOf('id="landingImage"');
  if (p < 0) return "";
  // A tag do landingImage passa de 1,3 KB por causa do data-a-dynamic-image, e o
  // src pode vir ANTES do id — por isso a janela abre para tras tambem.
  const janela = html.slice(Math.max(p - 4000, 0), p + 8000);
  const tag = janela.match(/<img[^>]*id="landingImage"[^>]*>/);
  if (!tag) return "";
  const m = tag[0].match(/images\/I\/([A-Za-z0-9+_-]+)\./);
  if (!m) return "";
  return `https://m.media-amazon.com/images/I/${m[1]}._AC_SL1500_.jpg`;
}

// Lista curta de proposito. Decodificar de menos deixa "&amp;" aparecendo no
// post; um unescape generico decodificaria tambem o que nao devia. O "&amp;"
// vai por ULTIMO: antes dele, "&amp;lt;" viraria "<".
function textoDeHtml(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d{2,5});/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

function tituloAmazon(html: string): string {
  const m = html.match(/<span[^>]*id="productTitle"[^>]*>([\s\S]{1,600}?)<\/span>/);
  if (!m) return "";
  return textoDeHtml(m[1].replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim().slice(0, 120);
}

async function consultarAmazonDireto(url: string): Promise<any> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), AMZ_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": AMZ_UA,
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: c.signal,
    });
    if (!r.ok) return { success: false, source: "amazon-pagina", store: "amazon", error: `a Amazon respondeu HTTP ${r.status}` };

    const html = await r.text();

    // PROVA DE QUE A PAGINA E CONFIAVEL, antes de ler qualquer coisa. Status 200
    // nao basta e ja mordeu este projeto duas vezes: captcha da Amazon volta 200
    // com ~4 KB, e o fetch a partir do Postgres devolveu 200 com 3 bytes de
    // corpo. Sem productTitle nada e afirmado — nem preco, nem foto, nem titulo.
    if (!html.includes('id="productTitle"')) {
      return {
        success: false, source: "amazon-pagina", store: "amazon",
        error: html.length < 8000 ? "a Amazon devolveu bloqueio/captcha" : "pagina da Amazon sem productTitle",
      };
    }
    if (html.includes('id="outOfStock"')) {
      return { success: false, source: "amazon-pagina", store: "amazon", error: "produto fora de estoque na Amazon" };
    }

    const titulo = tituloAmazon(html);
    if (!titulo) return { success: false, source: "amazon-pagina", store: "amazon", error: "productTitle presente mas vazio" };

    const { por, de } = precoAmazon(html);
    // Preco sem as duas testemunhas e preco nao confirmado, e nao publicar preco
    // nao confirmado e o motivo desta funcao existir.
    if (por === null) {
      return { success: false, source: "amazon-pagina", store: "amazon", error: "o buybox da Amazon nao confirmou o preco (duas testemunhas)" };
    }

    const img = imagemAmazon(html);
    return {
      success: true, source: "amazon-pagina", store: "amazon",
      name: titulo, title: titulo,
      image: img, thumbnail: img,
      price_to: por, price: por, price_from: de,
      availability: "disponivel",
    };
  } catch (e) {
    return { success: false, source: "amazon-pagina", store: "amazon", error: `a Amazon nao respondeu: ${(e as Error).message}` };
  } finally { clearTimeout(t); }
}

// ── Shein — leitor generico por og:title/og:image + JSON-LD (v28 · P44) ────
//
// NAO e leitor especifico de layout, como o da Amazon acima. E o par de tags
// que a propria pagina expõe para robo de previa social (og:*) mais o preco do
// schema.org Product que ela embute para SEO — os mesmos dados que o WhatsApp
// le quando alguem cola um link da Shein no chat. Por isso serve tambem, no
// futuro, de base para AliExpress/Magalu/Natura/Terabyte — mas HOJE so a
// Shein chama isto, e cada loja tem que ser medida com link real antes de
// entrar aqui (P44 pede as 5, nao decidiu tratar todas iguais sem medir).
const SHEIN_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const SHEIN_TIMEOUT_MS = 12000;

function decodeEntidadesHtml(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

// Le uma meta tag OG/Twitter aceitando as duas ordens de atributo
// (property antes ou depois de content) — paginas de loja variam nisso.
function metaTag(html: string, prop: string): string {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i");
  const m1 = html.match(re1);
  if (m1) return decodeEntidadesHtml(m1[1]).trim();
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i");
  const m2 = html.match(re2);
  return m2 ? decodeEntidadesHtml(m2[1]).trim() : "";
}

// Preco do bloco <script type="application/ld+json">, formato schema.org
// Product/Offer. NAO deduz nada: so devolve numero se achar `price` valido em
// algum node do JSON — mesma regra do "de" da Shopee, undefined em vez de
// palpite quando a pagina nao afirma o preco neste formato.
function precoJsonLd(html: string): number | null {
  const blocos = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const bloco of blocos) {
    const corpo = bloco.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    let data: any;
    try { data = JSON.parse(corpo); } catch { continue; }
    const nodes = Array.isArray(data) ? data : (Array.isArray(data?.["@graph"]) ? data["@graph"] : [data]);
    for (const node of nodes) {
      const offers = node?.offers;
      const candidatos = Array.isArray(offers) ? offers : [offers];
      for (const of of candidatos) {
        const raw = of?.price ?? of?.lowPrice;
        if (raw === undefined || raw === null || raw === "") continue;
        const n = Number(String(raw).replace(",", "."));
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
  }
  return null;
}

async function consultarSheinDireto(url: string): Promise<any> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), SHEIN_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: c.signal,
      headers: { "User-Agent": SHEIN_UA, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5" },
    });
    if (!r.ok) { console.warn(`[shein] pagina direta respondeu HTTP ${r.status}`); return null; }
    const html = await r.text();
    const titulo = metaTag(html, "og:title") || metaTag(html, "twitter:title");
    if (!titulo) { console.warn("[shein] pagina direta sem og:title — provavel bloqueio ou SPA sem SSR de meta"); return null; }
    const imagem = metaTag(html, "og:image") || metaTag(html, "twitter:image");
    const preco = precoJsonLd(html);
    return {
      success: true, source: "shein-pagina", store: "shein",
      name: titulo, title: titulo,
      image: imagem, thumbnail: imagem,
      price_to: preco !== null ? preco : undefined,
      affiliate_url: url,
    };
  } catch (e) {
    console.warn(`[shein] fetch direto falhou: ${(e as Error).message}`);
    return null;
  } finally { clearTimeout(t); }
}

// v28.1 (25/08, MEDIDO): o fetch direto nunca traz og:title — a Shein serve
// SPA sem SSR de meta tag pro fetch de servidor (200, sem bloqueio, so sem a
// tag). Log real: "[shein] pagina direta sem og:title". O fallback Microlink
// RESPONDIA "success" mas devolvia o titulo/imagem GENERICOS do site
// ("Roupas Femininas & Masculinas, Loja de Moda Online | SHEIN", imagem
// placeholder em data:image/svg) em vez do produto pedido — mesmo defeito de
// fundo da P25 (Shopee avulsa: Microlink nao executa o JS que monta a pagina
// de produto, e a Shein tem esse historico com o ML tambem, ver v20).
// Sem este filtro, "success:true" mentia: o usuario postaria o nome da LOJA
// como se fosse o do PRODUTO. Falso positivo e pior que falha — falha o
// usuario ve e preenche a mao; falso positivo ele nao percebe.
// Duas defesas, qualquer uma reprova o resultado:
//  (1) a URL da Shein carrega o ID do produto em "-p-<digitos>.html" — se a
//      URL final que o Microlink resolveu nao contiver esse MESMO id, nao e
//      a pagina do produto.
//  (2) o titulo generico da home/categoria e conhecido e fixo — compara
//      direto. Cobre o caso de a URL final nao vir preenchida.
function idProdutoShein(url: string): string | null {
  const m = url.match(/-p-(\d+)\.html/i);
  return m ? m[1] : null;
}

const SHEIN_TITULOS_GENERICOS = [
  "roupas femininas & masculinas, loja de moda online | shein",
  "shein brasil",
  "shein",
];

async function consultarSheinMicrolink(url: string): Promise<any> {
  try {
    const r = await fw(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {}, 8000);
    if (!r.ok) return null;
    const d = await r.json();
    if (d.status !== "success" || !d.data?.title) return null;
    const titulo = String(d.data.title).slice(0, 120);

    const idPedido = idProdutoShein(url);
    const idResolvido = idProdutoShein(String(d.data.url || ""));
    const urlNaoBate = !!idPedido && idResolvido !== idPedido;
    const tituloGenerico = SHEIN_TITULOS_GENERICOS.includes(titulo.toLowerCase().trim());
    if (urlNaoBate || tituloGenerico) {
      console.warn(`[shein] Microlink devolveu pagina generica, nao o produto — id_pedido=${idPedido} id_resolvido=${idResolvido} titulo="${titulo}"`);
      return null;
    }

    // Imagem placeholder do Microlink (SVG inline em data:) nao e foto real —
    // melhor sem foto do que com o icone de "sem imagem".
    const imgUrl = String(d.data.image?.url || "");
    const imagem = imgUrl.startsWith("data:") ? "" : imgUrl;

    return {
      success: true, source: "shein-microlink", store: "shein",
      name: titulo, title: titulo,
      image: imagem, thumbnail: imagem,
      affiliate_url: url,
    };
  } catch (e) {
    console.warn(`[shein] Microlink falhou: ${(e as Error).message}`);
    return null;
  }
}

async function consultarShein(url: string): Promise<any> {
  const direto = await consultarSheinDireto(url);
  if (direto) return direto;
  const via_microlink = await consultarSheinMicrolink(url);
  if (via_microlink) return via_microlink;
  return {
    success: false, store: "shein", motivo: "leitura_falhou",
    error: "Não consegui ler os dados desse produto na Shein agora. Preencha manualmente — título, preço e foto.",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const { url, credentials = {} } = await req.json();
    console.log(`[product-search v31] payload recebido: url=${JSON.stringify(url)} typeof=${typeof url}`);
    if (!url || !/^https?:\/\//i.test(url))
      return new Response(JSON.stringify({ success: false, motivo: "url_sem_protocolo", error: "O link colado não começa com http:// ou https://. Copie o endereço completo da página do produto." }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

    const store = detectStore(url);
    const authHeader = req.headers.get("authorization");
    const userId = getUserIdFromJwt(authHeader);
    console.log(`[product-search v31] store=${store} url=${url.slice(0, 80)} user=${userId ?? "anon"}`);

    const waEngineUrl = Deno.env.get("WA_ENGINE_URL") || "https://megalinksbr-wa-engine.fwezsn.easypanel.host";
    const waEngineToken = Deno.env.get("WA_ENGINE_TOKEN") || "";
    const sb = (SUPABASE_URL && SERVICE_ROLE) ? createClient(SUPABASE_URL, SERVICE_ROLE) : null;

    let result: any = null;

    if (store === "mercadolivre") {
      result = await fetchMercadoLivre(url, waEngineUrl, waEngineToken, sb, userId);
    } else if (store === "shopee" && credentials.shopee_app_id && credentials.shopee_app_secret) {
      result = await fetchShopee(url, credentials.shopee_app_id, credentials.shopee_app_secret, authHeader);
    } else if (store === "shopee") {
      // v27: ate aqui, credencial faltando caia no generico "Loja sem integracao
      // automatica" — a mesma frase que o link nao reconhecido produzia. Duas
      // causas sem relacao nenhuma com a mesma mensagem e o que escondeu este
      // bug: o Erico TEM as duas chaves e a tela dizia que faltavam.
      const faltando: string[] = [];
      if (!credentials.shopee_app_id) faltando.push("App Key");
      if (!credentials.shopee_app_secret) faltando.push("App Secret");
      result = {
        success: false, store: "shopee", motivo: "credenciais_incompletas", faltando,
        error: `Shopee — faltam dados da sua conta de afiliado: ${faltando.join(" e ")}.`,
      };
    } else if (store === "shein") {
      // v28/P44: leitor generico og:title/og:image + JSON-LD. Ver o bloco
      // `consultarShein` acima — NAO MEDIDO EM PRODUCAO ainda.
      result = await consultarShein(url);
    } else if (store === "amazon") {
      // Le a pagina publica: nao depende das chaves da PA-API, que a maioria dos
      // usuarios nao tem (a aprovacao exige vendas). E o mesmo caminho que o
      // Clone Post automatico ja usava desde a clone-ingest v15.
      result = await consultarAmazonDireto(url);
    }

    if (!result?.success) {
      result = result || { success: false, source: "none", store, motivo: "loja_sem_integracao", error: "Loja sem integração automática. Preencha manualmente." };
    }

    console.log(`[product-search v31] success=${result.success} name=${(result.name || "").slice(0, 40)}`);
    return new Response(JSON.stringify(result), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
