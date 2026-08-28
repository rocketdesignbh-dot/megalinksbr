// Mega Links BR · Edge Function "radar" v33
// v33 (28/08): a Shopee para de ter o preco anterior DERIVADO da taxa (P32).
//   Ver o bloco sobre o fetchShopeeKw. `price_original = price` quando nao ha
//   preco anterior conhecido — mesma convencao do ML e da Amazon. O selo de
//   desconto fica; o riscado some sozinho, porque o card so risca se de > por.
// v32: Amazon com zero resultado deixa de ser reportada como "0 ofertas encontradas".
// Medimos o comportamento: a Amazon atende uma ou duas requisicoes vindas da VPS e
// depois passa a devolver pagina vazia -- inclusive para a MESMA palavra que acabou
// de funcionar. Ou seja, zero resultado da Amazon quase nunca significa "esse produto
// nao existe", significa "fui bloqueado". Como o wa-engine faz `return []` sem
// reportar o HTTP, a unica coisa que sabemos aqui e a lista vazia -- entao tratamos
// como bloqueio provavel e dizemos isso, em vez de deixar o usuario achando que a
// loja nao tem o produto. A correcao definitiva e sair do scraping (PA-API).
// v31: TTL da Amazon de 6h -> 24h (sem cron de coleta, 6h deixava o Radar vazio).
// v30: score da Amazon normalizado. Antes usava scoreOf(desconto,0,0,0), e como
// commission/sales/rating entram como 0 o teto matematico da Amazon era 45 pts —
// ela nunca aparecia ao lado de ML/Shopee em listas ordenadas por score.
// Agora scoreNorm() reescala sobre as dimensoes REALMENTE disponiveis, e
// rating/sales vindos do wa-engine sao aproveitados quando existirem.
// v29: corrige lookupde credencial Shopee para aceitar "ID de Afiliado" como fallback para "App Key"
// (AppID = ID de Afiliado — são o mesmo valor no painel Shopee Affiliate).
// v28: corrigido ORDER BY created_at DESC que priorizava a credencial mais recente sem App Key/Secret.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET  = Deno.env.get("CRON_SECRET") ?? "";
const WA_ENGINE_URL = Deno.env.get("WA_ENGINE_URL") || "https://megalinksbr-wa-engine.fwezsn.easypanel.host";
const WA_ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

const ML_REQUEST_COST = Number(Deno.env.get("ML_REQUEST_COST") ?? "10");
const ML_DAILY_CAP = Number(Deno.env.get("ML_DAILY_CAP") ?? "20");
const ML_MONTHLY_CAP = Number(Deno.env.get("ML_MONTHLY_CAP") ?? "600");
const KEYWORD_DEDUP_HOURS = Number(Deno.env.get("ML_KEYWORD_DEDUP_HOURS") ?? "24");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

function scoreOf(d: number, c: number, s: number, r: number) {
  return Math.round((Math.min(d,90)/90*0.45+Math.min(c,30)/30*0.25+Math.min(s,10000)/10000*0.2+Math.min(r,5)/5*0.1)*100);
}

// Score normalizado: reescala sobre as dimensoes que a fonte REALMENTE fornece.
// Fontes sem dado de comissao/vendas/avaliacao (ex.: Amazon) nao sao mais punidas
// por dado ausente — so por dado ruim. Um item sem nenhuma dimensao valida = 0.
function scoreNorm(dims: Array<{ v: number; max: number; w: number }>): number {
  const avail = dims.filter(d => Number.isFinite(d.v) && d.v > 0 && d.max > 0);
  if (!avail.length) return 0;
  const wTotal = avail.reduce((s, d) => s + d.w, 0);
  if (wTotal <= 0) return 0;
  const raw = avail.reduce((s, d) => s + (Math.min(d.v, d.max) / d.max) * d.w, 0);
  return Math.round((raw / wTotal) * 100);
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}

const ML_KEYWORDS_DEFAULT = ["fone bluetooth","skincare","perfume importado","air fryer","tenis esportivo","smartwatch","furadeira","caixa de som bluetooth"];

function pickRotatingKeyword(): string {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 0)).getTime()) / 86400000);
  const half = now.getUTCHours() >= 15 ? 1 : 0;
  const idx = (dayOfYear * 2 + half) % ML_KEYWORDS_DEFAULT.length;
  return ML_KEYWORDS_DEFAULT[idx];
}

async function processMercadoLivre(keywords: string[], debug: string[]): Promise<{rows:any[];error?:string}> {
  const kws = keywords.length > 0 ? keywords : [pickRotatingKeyword()];
  if (!WA_ENGINE_TOKEN) {
    return { rows: [], error: "WA_ENGINE_TOKEN nao configurado nos secrets do Supabase" };
  }
  try {
    const r = await fetchWithTimeout(`${WA_ENGINE_URL}/ml-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WA_ENGINE_TOKEN}` },
      body: JSON.stringify({ keywords: kws, limit: 20 }),
    }, 45000);
    debug.push(`wa-engine /ml-search: HTTP ${r.status}`);
    if (!r.ok) {
      const t = await r.text().catch(()=> "");
      return { rows: [], error: `wa-engine /ml-search HTTP ${r.status}: ${t.slice(0,200)}` };
    }
    const d = await r.json();
    if (Array.isArray(d.errors) && d.errors.length) debug.push(...d.errors.map((e:string)=>`wa-engine: ${e}`));
    const rows = Array.isArray(d.results) ? d.results : [];
    debug.push(`ML via wa-engine: ${rows.length} itens (kws: ${kws.join(", ")})`);
    return { rows };
  } catch(e) {
    return { rows: [], error: `wa-engine /ml-search exc: ${String(e).slice(0,150)}` };
  }
}

const SHOPEE_KW = ["fone bluetooth","air fryer","smartwatch","luminaria led","caixa de som"];

/* P32 vale AQUI TAMBEM (28/08 · REVISAO 95).
   Esta funcao derivava o preco anterior com `price/(1-disc/100)` — exatamente a
   conta que a P32 descartou na product-search em 01/08. Resultado: a mesma
   plataforma afirmava duas coisas diferentes sobre a mesma loja, e o Radar saia
   com um riscado que a Shopee nunca disse. 60 de 60 ofertas de Shopee no banco
   batiam com a formula ao centavo; Amazon (23 de 25) e ML (99 de 117) NAO batem,
   porque essas duas leem o riscado real da pagina.

   MEDIDO em 28/08, HUAWEI FreeBuds Pro 5 (item 44507205958):
     API de afiliado ... priceMin 949 · priceDiscountRate 44 (INTEIRO)
     derivado .......... 949/(1-0,44) = R$ 1.694,64
     real, afirmado pela loja .......... R$ 1.699,00
     erro .............. R$ 4,36
   A taxa vem arredondada para inteiro; por isso a conta nunca fecha. Um SDK de
   terceiros para esta mesma API diz o mesmo: nao ha campo de preco anterior no
   schema, e a estimativa "can differ slightly because priceDiscountRate may be
   rounded".

   `price_original = price` e a MESMA convencao do Mercado Livre (`original ||
   price`) e da Amazon (`savingBasis || price`): sem preco anterior conhecido,
   repete-se o atual. O frontend so risca quando `de > por`, entao o riscado some
   sozinho. O SELO DE DESCONTO FICA — esse a API afirma.

   O "de" real EXISTE em `/api/v4/pdp/get_pc` -> `price_before_discount` (medido
   no mesmo item: 169900000 = R$ 1.699,00), mas essa rota e antibot: a segunda
   chamada seguida caiu em captcha (`scene=crawler_item`), e o `fetchShopeeFeed`
   logo abaixo, que ja usa essa familia de API, nao produz nenhuma linha hoje.
   Le-la exigiria proxy pago. Decisao do Erico em 28/08: parar de derivar agora,
   avaliar a rota lida depois.
*/
async function fetchShopeeKw(kw: string, ak: string, as_: string): Promise<any[]> {
  const expires = new Date(Date.now()+6*3600*1000).toISOString();
  try {
    const query=`{ productOfferV2(keyword:"${kw.replace(/"/g,"")}", sortType:2, page:1, limit:10){ nodes{ itemId shopId productName priceMin priceDiscountRate imageUrl offerLink productLink commissionRate ratingStar sales shopName } } }`;
    const payload=JSON.stringify({query}); const ts=Math.floor(Date.now()/1000);
    const sig=await sha256Hex(ak+ts+payload+as_);
    const r=await fetchWithTimeout("https://open-api.affiliate.shopee.com.br/graphql",{method:"POST",headers:{"content-type":"application/json","Authorization":`SHA256 Credential=${ak},Timestamp=${ts},Signature=${sig}`},body:payload},6000);
    if(!r.ok)return[];
    const d=await r.json(); if(d.errors)return[];
    return(d?.data?.productOfferV2?.nodes??[]).map((n:any)=>{ const price=Number(n.priceMin??0),disc=Number(n.priceDiscountRate??0),comm=Number(n.commissionRate??0),orig=price; return{source:"shopee",item_id:String(n.itemId),shop_id:String(n.shopId??""),title:n.productName,keyword:kw,category:kw,price,price_original:orig,discount_pct:Math.round(disc),commission_rate:comm,rating:Number(n.ratingStar??0),sales:Number(n.sales??0),shop_name:n.shopName||"Shopee",image_url:n.imageUrl,product_link:n.productLink,affiliate_url:n.offerLink,score:scoreOf(disc,comm*100,Number(n.sales??0),Number(n.ratingStar??0)),fetched_at:new Date().toISOString(),expires_at:expires}; });
  } catch{return[];}
}

async function fetchShopeeFeed(): Promise<any[]> {
  const CATS=[{id:100001,name:"Celulares"},{id:100006,name:"Informática"},{id:100018,name:"Eletrodomésticos"},{id:100019,name:"Eletrônicos"}];
  const expires=new Date(Date.now()+3*3600*1000).toISOString();
  const settled=await Promise.allSettled(CATS.map(async cat=>{
    try{
      const r=await fetchWithTimeout(`https://shopee.com.br/api/v4/search/search_items?by=pop&categoryids=${cat.id}&limit=15&newest=0&order=desc&page_type=search&scenario=PAGE_CATEGORY&version=2`,{headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36","Referer":"https://shopee.com.br/","Accept":"application/json","Accept-Language":"pt-BR,pt;q=0.9"}},8000);
      if(!r.ok)return[];
      const d=await r.json();
      return(d?.items??[]).slice(0,10).flatMap((w:any)=>{ const item=w.item_basic??w,price=Number(item.price??0)/100000,orig=Number(item.price_before_discount??0)/100000,disc=orig>price&&orig>0?Math.round((1-price/orig)*100):0; if(disc<10||price<=0)return[]; const iid=String(item.itemid??""),sid=String(item.shopid??""); return[{source:"shopee",item_id:iid,shop_id:sid,title:item.name??"",keyword:cat.name,category:cat.name,price,price_original:orig||price,discount_pct:disc,commission_rate:0,rating:Number(item.item_rating?.rating_star??0),sales:Number(item.sold??0),shop_name:"Shopee",image_url:item.image?`https://cf.shopee.com.br/file/${item.image}`:"",product_link:`https://shopee.com.br/product/${sid}/${iid}`,affiliate_url:`https://shopee.com.br/product/${sid}/${iid}`,score:scoreOf(disc,0,Number(item.sold??0),Number(item.item_rating?.rating_star??0)),fetched_at:new Date().toISOString(),expires_at:expires}]; });
    }catch{return[];}
  }));
  const rows:any[]=[]; for(const r of settled){if(r.status==="fulfilled")rows.push(...(r.value as any[]));} return rows;
}

// Extrai o AppID da credencial Shopee: aceita tanto "App Key" quanto "ID de Afiliado"
// pois no painel da Shopee Affiliate ambos exibem o mesmo número (AppID).
function shopeeAppId(cred: Record<string,string>|null|undefined): string {
  if(!cred) return "";
  return String(cred["App Key"] || cred["ID de Afiliado"] || "").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method==="OPTIONS") return new Response(null,{status:204,headers:CORS});
  try {
    const cronSecret=req.headers.get("x-cron-secret")??"",auth=req.headers.get("authorization")??"";
    if(!(CRON_SECRET&&cronSecret===CRON_SECRET)&&!(auth.startsWith("Bearer ")&&auth.length>20)) return resp({error:"unauthorized"},401);
    let body:any={}; try{body=await req.json();}catch{}
    const sources:string[]=body.sources??["mercado_livre","shopee"];
    const keywords:string[]=Array.isArray(body.keywords)?body.keywords.map(String):[];
    const sb=createClient(SUPABASE_URL,SERVICE_ROLE);
    const results:Record<string,any>={},errors:string[]=[],debug:string[]=[];
    let totalUpserts=0;
    if(keywords.length>0)results.keywords_buscados=keywords;
    results.sources_solicitados=sources;
    const tasks:Promise<void>[]=[];

    if(sources.includes("mercado_livre")){
      tasks.push((async()=>{
        const kws = keywords.length > 0 ? keywords : [pickRotatingKeyword()];
        const isManualSearch = keywords.length > 0;
        const creditsNeeded = kws.length * ML_REQUEST_COST;
        try{
          if (isManualSearch) {
            const since = new Date(Date.now() - KEYWORD_DEDUP_HOURS * 3600 * 1000).toISOString();
            const { data: dup } = await sb.from("radar_ml_quota")
              .select("id").eq("usage_type", "batch")
              .ilike("keyword", kws.join(", ")).gte("created_at", since).limit(1);
            if (dup && dup.length > 0) {
              errors.push(`ML pulado: keyword_repetida — "${kws.join(", ")}" já foi buscado nas últimas ${KEYWORD_DEDUP_HOURS}h.`);
              return;
            }
          }
          const { data: quota, error: qErr } = await sb.rpc("get_radar_ml_quota_status");
          const q = Array.isArray(quota) ? quota[0] : quota;
          const todayBatch = qErr ? 0 : Number(q?.today_batch ?? 0);
          const monthBatch = qErr ? 0 : Number(q?.month_batch ?? 0);
          results.ml_quota = { today_batch: todayBatch, daily_cap: ML_DAILY_CAP, month_batch: monthBatch, monthly_cap: ML_MONTHLY_CAP };
          if (todayBatch + creditsNeeded > ML_DAILY_CAP) {
            errors.push(`ML pulado: limite DIARIO atingido (${todayBatch}/${ML_DAILY_CAP} creditos).`);
            return;
          }
          if (monthBatch + creditsNeeded > ML_MONTHLY_CAP) {
            errors.push(`ML pulado: limite MENSAL atingido (${monthBatch}/${ML_MONTHLY_CAP} creditos).`);
            return;
          }
          const{rows,error}=await processMercadoLivre(kws,debug);
          results.ml_debug=debug;
          if(error){errors.push(error);return;}
          results.ml_encontrados=rows.length;
          await sb.from("radar_ml_quota").insert({ usage_type: "batch", keyword: kws.join(", "), credits_used: creditsNeeded });
          if(rows.length){
            const{error:e}=await sb.from("radar_offers").upsert(rows,{onConflict:"source,item_id"});
            if(e)errors.push(`ML upsert: ${e.message}`);
            else{totalUpserts+=rows.length;results.mercadolivre=rows.length;}
          }
        }catch(e){errors.push(`ML: ${String(e)}`);}
      })());
    }

    if(sources.includes("shopee")){
      tasks.push((async()=>{
        try{
          // v28+v29 FIX: busca TODAS as credenciais conectadas e prioriza a que tem AppID + App Secret.
          // AppID pode estar em "App Key" OU em "ID de Afiliado" (mesmo valor no painel Shopee).
          const{data:allSc}=await sb.from("affiliate_credentials")
            .select("credentials").eq("store","shopee").eq("connected",true);

          // Encontra a primeira credencial com AppID (App Key ou ID de Afiliado) E App Secret
          const scWithKeys = (allSc??[]).find(r => {
            const ak = shopeeAppId(r.credentials);
            const as_ = String(r.credentials?.["App Secret"] ?? "").trim();
            return ak.length > 0 && as_.length > 0;
          });

          const ak  = shopeeAppId(scWithKeys?.credentials);
          const as_ = String(scWithKeys?.credentials?.["App Secret"] ?? "").trim();

          debug.push(`Shopee: ${(allSc??[]).length} credenciais conectadas, modo: ${ak ? "API (AppID+Secret encontrados)" : "feed (scraping — nenhum usuário com AppID+Secret)"}`);

          const rows = ak && as_
            ? (await Promise.all(SHOPEE_KW.map(kw=>fetchShopeeKw(kw,ak,as_)))).flat()
            : await fetchShopeeFeed();

          results.shopee_encontrados = rows.length;
          results.shopee_modo = ak ? "api" : "feed";
          if(rows.length){
            const{error:e}=await sb.from("radar_offers").upsert(rows,{onConflict:"source,item_id"});
            if(e)errors.push(`Shopee upsert: ${e.message}`);
            else{totalUpserts+=rows.length;results[ak?"shopee_api":"shopee_feed"]=rows.length;}
          } else {
            errors.push(`Shopee: 0 produtos retornados (modo: ${ak ? "API" : "feed/scraping"})`);
          }
        }catch(e){errors.push(`Shopee: ${String(e)}`);}
      })());
    }

    if(sources.includes("amazon")){
      tasks.push((async()=>{
        try{
          const{data:ac}=await sb.from("affiliate_credentials").select("credentials").eq("store","amazon").eq("connected",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
          const partnerTag=String(ac?.credentials?.["ID de Associado"]??"").trim();
          const accessKey=String(ac?.credentials?.["ACCESS KEY"]??"").trim();
          const secretKey=String(ac?.credentials?.["SECRET KEY"]??"").trim();
          if(!partnerTag){errors.push("Amazon pulado: nenhum ID de Associado conectado ainda.");return;}
          if(!WA_ENGINE_TOKEN){errors.push("Amazon pulado: WA_ENGINE_TOKEN nao configurado.");return;}
          const amazonKws = keywords.length > 0 ? keywords : undefined;
          const r=await fetchWithTimeout(`${WA_ENGINE_URL}/amazon-search`,{
            method:"POST",
            headers:{"Content-Type":"application/json","Authorization":`Bearer ${WA_ENGINE_TOKEN}`},
            body:JSON.stringify({keywords:amazonKws,limit:15,partnerTag,accessKey,secretKey}),
          },30000);
          if(!r.ok){errors.push(`Amazon: wa-engine HTTP ${r.status}`);return;}
          const d=await r.json();
          if(Array.isArray(d.errors)&&d.errors.length)errors.push(...d.errors.map((e:string)=>`Amazon: ${e}`));
          const rawRows=Array.isArray(d.results)?d.results:[];
          results.amazon_encontrados=rawRows.length;
          results.amazon_method=d.method;
          if(rawRows.length){
            // TTL de 24h: a Amazon nao tem cron de coleta, entao um TTL curto deixava
            // o Radar vazio 6h depois da busca. 24h casa com a janela que o product-refresh
            // ja usa pra reconferir preco -- alem disso o radar_offers nao revalida preco.
            const expires=new Date(Date.now()+24*3600*1000).toISOString();
            let semDesconto=0;
            const rows=rawRows.map((it:any)=>{
              const disc=Number(it.discount_pct||0);
              const rating=Number(it.rating??it.rating_star??0);
              const sales=Number(it.sales??it.reviews??it.review_count??0);
              if(!(disc>0))semDesconto++;
              // v30: score reescalado sobre as dimensoes disponiveis (ver scoreNorm).
              const score=scoreNorm([
                {v:disc,   max:90,    w:0.45},
                {v:sales,  max:10000, w:0.20},
                {v:rating, max:5,     w:0.10},
              ]);
              return {
                source:"amazon", item_id:it.item_id, shop_id:"",
                title:it.title, keyword:(amazonKws?.[0])||"geral", category:"geral",
                price:it.price||0, price_original:it.price_original||it.price||0,
                discount_pct:disc, commission_rate:0, rating, sales,
                shop_name:"Amazon", image_url:it.image_url||"",
                product_link:it.product_link||"", affiliate_url:it.affiliate_url||it.product_link||"",
                score,
                fetched_at:new Date().toISOString(), expires_at:expires,
              };
            });
            // Diagnostico: quantos itens vieram sem preco "de" (o wa-engine nao extraiu o preco original).
            results.amazon_sem_desconto=semDesconto;
            if(semDesconto===rows.length){
              debug.push(`Amazon: nenhum dos ${rows.length} itens veio com preco original — score fica 0 e eles caem no fim da lista. Verificar extracao de price_original no wa-engine /amazon-search.`);
            }
            const{error:e}=await sb.from("radar_offers").upsert(rows,{onConflict:"source,item_id"});
            if(e)errors.push(`Amazon upsert: ${e.message}`);
            else{totalUpserts+=rows.length;results.amazon=rows.length;}
          } else {
            // v32: lista vazia da Amazon = bloqueio, nao ausencia de produto.
            // Comprovado em teste: a mesma palavra que retornou 15 itens devolve 0 na
            // requisicao seguinte. O wa-engine engole o HTTP e responde [], entao aqui
            // so vemos a lista vazia -- mas o padrao e claro o bastante pra nomear.
            results.amazon_bloqueada = true;
            results.amazon_ultimo_sucesso = null;
            try{
              const{data:ultima}=await sb.from("radar_offers")
                .select("fetched_at").eq("source","amazon")
                .order("fetched_at",{ascending:false}).limit(1).maybeSingle();
              if(ultima?.fetched_at)results.amazon_ultimo_sucesso=ultima.fetched_at;
            }catch{}
            errors.push("Amazon bloqueou a consulta — tente daqui a pouco.");
          }
        }catch(e){errors.push(`Amazon: ${String(e)}`);}
      })());
    }

    await Promise.allSettled(tasks);
    results.debug = debug;
    try{await sb.from("radar_offers").delete().lt("expires_at",new Date().toISOString());}catch{}
    return resp({ok:true,upserts:totalUpserts,results,errors});
  }catch(e){return resp({ok:false,error:String(e)},500);}
});
