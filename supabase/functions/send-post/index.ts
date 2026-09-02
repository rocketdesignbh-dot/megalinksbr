// Mega Links BR · Edge Function "send-post" v23
// v23: TRES mudancas pedidas pelo Erico em 02/09, todas sobre ORDEM e RITMO do
//      rodizio automatico. Nenhuma toca o envio em si.
//
//      (a) "Post em Loop" mudou de SIGNIFICADO. Ate a v22 ele mandava na ORDEM
//          (marcado = sorteio aleatorio a cada disparo) e o rodizio nunca
//          parava nos dois casos. Agora a ordem e SEMPRE a de cadastro
//          (products.position, o cursor_index de sempre) e o checkbox manda em
//          PARAR OU RECOMECAR ao chegar no fim da lista:
//            marcado   -> volta ao 1o produto e recomeca (rodizio infinito,
//                         que e exatamente o que a plataforma inteira faz hoje)
//            desmarcado-> PARA de postar ate entrar produto novo no grupo
//          O Math.random() da selecao SUMIU -- e junto com ele o resorteio da
//          v21 (nunca repetir o post imediatamente anterior), que existia so
//          para consertar o sorteio. Ordem sequencial nao repete por
//          construcao, entao a consulta extra a scheduled_posts saiu.
//          ⚠️ MIGRACAO OBRIGATORIA ANTES DO DEPLOY: `loop_enabled` estava false
//          em 22 de 24 grupos (resetado em 26/08 pela v20) e com o significado
//          novo false quer dizer "para no fim da lista". Subir esta versao sem
//          gravar loop_enabled=true faria a base inteira emudecer depois de uma
//          passada. Ver ESTADO_ATUAL, REVISAO 119.
//
//      (b) "Nao repetir produto" (niche_groups.no_repeat_daily, coluna nova,
//          default false). Ligado, produto que ja saiu HOJE neste grupo e
//          pulado ate a virada do dia em Brasilia -- o mesmo todayBR que o teto
//          diario ja usa. Desligado (padrao), nada muda. So consulta o banco
//          quando a flag esta ligada.
//
//      (c) Fim de semana no modo NORMAL (niche_groups.weekend_enabled, coluna
//          nova, default TRUE). O modo inteligente ja tinha isso desde a v19
//          (smart_weekend); o modo de intervalo fixo postava sabado e domingo
//          sem opcao. Default true de proposito: nascer false pararia o fim de
//          semana de todo mundo sem ninguem pedir.
// v22: "Excluir automaticamente após postar" (niche_groups.delete_after_post,
//      checkbox novo ao lado de Post Automático/Post em Loop). Pedido do
//      Érico: em grupo com muitos produtos, deixar o produto sumir do rodízio
//      assim que sair no disparo, abrindo espaço (dentro do limite do plano)
//      para cadastrar produtos novos sem ter que apagar manualmente os
//      antigos. So dispara quando o post de fato SAIU (groupSent>0) -- post
//      que falhou em todo canal preserva o produto. `product_id` em
//      `scheduled_posts`/`clone_posts` e `on delete set null` (conferido no
//      banco antes de codar): apagar o produto NÃO apaga o histórico da
//      postagem que acabou de sair, só zera a referência. Sem confirmação
//      no cliente além do texto do checkbox -- é toggle de configuração do
//      grupo, não uma ação de apagar avulsa; quem liga já leu "não tem
//      desfazer".
// v21: LOOP SEM REPETIR O ÚLTIMO POST. Reportado pelo Érico: participantes de
//      grupo de WhatsApp reclamando de post repetido. Medido em produção (grupo
//      "Achadinhos Geral", loop_enabled=true, 22 produtos ativos, 4 dias): 10 de
//      113 disparos (8,8%) postaram o MESMO produto que o disparo imediatamente
//      anterior -- Math.random() por disparo, sem memória do que saiu por último,
//      então nada impedia sortear duas vezes seguidas o mesmo índice. Grupos em
//      ordem sequencial (loop_enabled=false) no mesmo período: 0 repetições em
//      125 disparos, porque o cursor sempre avança -- confirma que o defeito é
//      exclusivo do modo Loop. Conserto: no modo Loop, se o sorteio bater com o
//      product_id do último "sent" do grupo, resorteia dentro dos (total-1)
//      restantes -- nunca reenvia o post anterior em seguida. Só consulta
//      scheduled_posts quando loop_enabled=true e o grupo tem mais de 1 produto
//      elegível; não muda nada para quem usa ordem sequencial (comportamento
//      intacto, cursor_index como sempre).
// v20: "Post em Loop". O checkbox existia na tela desde sempre mas nunca foi
//      salvo nem lido em lugar nenhum -- clicar nele nao fazia nada. Agora:
//      desmarcado (padrao) posta na ORDEM em que os produtos foram cadastrados
//      (cursor_index, comportamento historico); marcado, sorteia um produto a
//      cada disparo em vez de seguir a ordem. Isso NAO tem relacao com o
//      rodizio nunca parar -- o Post Automatico sempre reinicia a lista ao
//      chegar no fim (cursor % total), com ou sem Loop ligado; Loop e so
//      sobre ORDEM, nao sobre parar/continuar. loop_enabled ja existia no
//      banco com default true e todo mundo em true -- resetado pra false em
//      26/08 antes de ligar esta leitura, senao a plataforma inteira passava
//      a postar em ordem aleatoria da noite pro dia sem ninguem ter pedido.
// v19: HORARIOS INTELIGENTES. O grupo pode trocar "intervalo fixo dentro de uma
//      janela de horas" por tres janelas de maior audiencia (07:00-09:00,
//      12:00-13:30, 19:00-21:00) com os produtos divididos entre elas. Elite
//      pra cima. Quando ligado, start_hour, end_hour e interval_minutes ficam
//      inertes. Default false em todo mundo: subir esta versao nao muda o
//      comportamento de ninguem ate alguem ligar o toggle.
// v18: o teto diario de disparo automatico passa a vir de plan_features
//      (auto_posts_daily) em vez de ficar cravado como "starter = 1". As tres
//      fontes discordavam: a tabela dizia que o Starter NAO tinha automacao, o
//      PLAN_FALLBACK dizia que tinha, e aqui havia um if pelo nome do plano.
//      Se a leitura da tabela falhar, cai no que sempre valeu (starter = 1/dia)
//      -- nunca em "sem limite".
// v17: Mercado Livre liberado no plano Starter.
// v16: timeout do wa-engine subiu de 10s para 20s nas chamadas /send-group e
//      /send. Motivo medido: em 29/07 as duas rodadas do cron das 11:32 UTC
//      falharam com "The signal has been aborted" -- o AbortController de 10s
//      cortou a espera enquanto o Baileys ainda baixava a imagem do produto.
//      O post provavelmente chegou ao grupo; o painel e que marcou failed.
//      Telegram continua em 10s (nao baixa midia pela VPS).
//      20s e nao 30s de proposito: a funcao percorre todos os grupos em
//      sequencia na mesma invocacao e o cron roda a cada minuto -- timeout
//      alto demais em um canal lento segura a fila inteira.
// v15: validade da oferta.
//      - valid_until   -> depois dessa data o produto sai do rodizio;
//      - never_expires -> isenta o produto da validade acima. NAO isenta de
//                         expired: se o marketplace diz que o produto acabou,
//                         ele sai de qualquer forma. O usuario pode abrir mao
//                         de uma politica nossa, nunca da realidade.
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

// v16: o wa-engine baixa a imagem do produto antes de enviar pelo Baileys.
// Imagem grande ou CDN lenta estoura 10s com facilidade.
const ENGINE_TIMEOUT_MS = 20000;

const LOJAS_QUE_EXIGEM_CREDENCIAL = new Set([
  "shopee", "amazon", "mercado_livre", "aliexpress",
  "magalu", "awin", "shein", "natura", "terabyte",
]);

const PLAN_MARKETPLACES: Record<string, string[] | null> = {
  // ML liberado no Starter em 30/07/2026: o acesso a loja virou aquisicao e o
  // diferencial pago passou a ser o monitoramento de estoque (product-refresh).
  starter: ["shopee", "mercado_livre", "manual", "outra"],
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
  let extra1 = "", extra2 = "", extra3 = "", header = "", emojiDe = "", emojiPor = "";
  if (p.description) { try { const d = JSON.parse(p.description); extra1=d.extra1||""; extra2=d.extra2||""; extra3=d.extra3||""; header=d.header||""; emojiDe=d.emojiDe||""; emojiPor=d.emojiPor||""; } catch {/**/} }
  const headStr = header || "🔥 OFERTA RELÂMPAGO 🔥";
  const porStr = p.price ? `R$ ${brl(Number(p.price))}` : "";
  const sufStr = p.price_suffix ? ` ${p.price_suffix}` : "";
  const deStr  = p.price_original ? `${emojiDe ? emojiDe + " " : ""}~De R$ ${brl(Number(p.price_original))}~ ${emojiPor ? emojiPor + " " : ""}por ` : (emojiPor ? emojiPor + " " : "");
  const lojaLabel: Record<string,string> = { shopee:"Shopee", mercado_livre:"Mercado Livre", amazon:"Amazon", aliexpress:"AliExpress", magalu:"Magalu", shein:"Shein", awin:"AWIN", natura:"Natura", terabyte:"TerabyteShop" };
  const loja = p.source ? (lojaLabel[p.source] ?? "") : "";
  const linhas: string[] = [];
  linhas.push(headStr); linhas.push(p.title);
  if (porStr) linhas.push(`${deStr}${porStr}${sufStr}`);
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

// ══════════════════════════════════════════════════════════════════════
// HORARIOS INTELIGENTES
// ══════════════════════════════════════════════════════════════════════
// Tres janelas fixas, em minutos desde a meia-noite de Brasilia. Nao sao
// configuraveis de proposito: o valor do recurso e justamente o usuario nao
// precisar adivinhar horario. Quando ligado, start_hour, end_hour e
// interval_minutes ficam inertes — as colunas continuam existindo porque
// desligar o modo tem que devolver o grupo ao comportamento antigo.
// `peso` so desempata sobra de divisao: 19-21 e a melhor janela medida, entao
// quando duas janelas disputam o mesmo post que sobrou, ela leva. Sem isso um
// grupo com 1 produto postava 07:05, porque manha e noite tem a mesma duracao
// e o empate caia na primeira da lista.
const JANELAS: Array<{ ini: number; fim: number; nome: string; peso: number }> = [
  { ini:  7 * 60, fim:  9 * 60,      nome: "manha",  peso: 1 },
  { ini: 12 * 60, fim: 13 * 60 + 30, nome: "almoco", peso: 0 },
  { ini: 19 * 60, fim: 21 * 60,      nome: "noite",  peso: 2 },
];

// Piso de 10 min entre dois posts, aplicado aos 330 min de janela. E ele que
// define o teto diario: 12 + 9 + 12 = 33. Sem piso, um grupo Elite com 150
// produtos distribuiria os 150 nos mesmos 330 minutos — um post a cada 2,2
// min, que e flood e provavelmente ban do numero. `auto_posts_daily` nao
// protege disso: e null pra Pro, Elite e Premium.
const SMART_PISO_MIN = 10;
const SMART_MAX_DIA = JANELAS.reduce((t, j) => t + Math.floor((j.fim - j.ini) / SMART_PISO_MIN), 0);

function janelaDe(min: number) {
  return JANELAS.find((j) => min >= j.ini && min < j.fim) ?? null;
}

// Reparte N posts entre as janelas proporcionalmente a duracao de cada uma.
// O resto da divisao vai pras janelas de maior fracao: sem isso N=10 viraria
// 3+2+3=8 e dois posts sumiriam sem ninguem notar.
function cotasPorJanela(N: number): number[] {
  const durs = JANELAS.map((j) => j.fim - j.ini);
  const total = durs.reduce((a, b) => a + b, 0);
  const bruto = durs.map((d) => (N * d) / total);
  const cotas = bruto.map((b) => Math.floor(b));
  let resto = N - cotas.reduce((a, b) => a + b, 0);
  const ordem = bruto
    .map((b, i) => ({ i, frac: b - Math.floor(b) }))
    .sort((a, b) => (b.frac - a.frac) || (JANELAS[b.i].peso - JANELAS[a.i].peso));
  for (let k = 0; resto > 0 && k < ordem.length; k++, resto--) cotas[ordem[k].i]++;
  return cotas;
}

// Quantos posts JA DEVERIAM ter saido ate `min`. Comparar isso com o que de
// fato saiu hoje e o que torna o modo auto-corretivo: se o cron perdeu uma
// batida ou o container reiniciou, a diferenca aparece sozinha e o proximo
// disparo recupera, em vez de o dia terminar com buraco.
//
// Cada post fica no MEIO do seu slot, nunca cravado na virada da janela: as
// 07:00 em ponto o grupo ainda nao levou nada, o primeiro sai as 07:05.
function esperadosAte(N: number, min: number): number {
  if (N <= 0) return 0;
  const cotas = cotasPorJanela(N);
  let esperados = 0;
  JANELAS.forEach((j, w) => {
    const n = cotas[w];
    if (!n) return;
    const passo = (j.fim - j.ini) / n;
    for (let i = 0; i < n; i++) if (j.ini + (i + 0.5) * passo <= min) esperados++;
  });
  return esperados;
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
  // Mesmo deslocamento do todayBR. Minuto (e nao so hora) porque a janela do
  // almoco termina 13:30, e dia da semana pro corte de fim de semana.
  const brNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const brMinutos = brNow.getUTCHours() * 60 + brNow.getUTCMinutes();
  const brDow = brNow.getUTCDay(); // 0 = domingo, 6 = sabado

  const { data: groups, error: gErr } = await sb
    .from("niche_groups")
    .select("id, user_id, name, interval_minutes, start_hour, end_hour, cursor_index, last_post_at, smart_schedule, smart_weekend, loop_enabled, delete_after_post, weekend_enabled, no_repeat_daily")
    .eq("post_auto_enabled", true);
  if (gErr) return new Response(JSON.stringify({ error: gErr.message }), { status: 500 });
  if (!groups?.length) return new Response(JSON.stringify({ processed: 0, msg: "no active groups" }));

  const userIds = [...new Set(groups.map((g: { user_id: string }) => g.user_id))];
  const { data: profiles } = await sb.from("profiles").select("id, plan, is_vip").in("id", userIds);
  const planMap: Record<string, string> = {};
  for (const p of profiles ?? []) planMap[p.id] = p.is_vip ? "elite" : (p.plan || "starter");

  // Teto de disparos automaticos por grupo por dia. null = sem teto.
  // O padrao abaixo e o comportamento historico: se a tabela nao responder, o
  // Starter continua limitado em vez de passar a disparar sem limite.
  const tetoDiario: Record<string, number | null> = { starter: 1 };
  // Horarios Inteligentes e Elite pra cima. Plano sem o recurso cai no modo
  // antigo em vez de parar de postar: quem faz downgrade nao pode ficar mudo.
  const planSmart: Record<string, boolean> = {};
  try {
    const { data: planos } = await sb.from("plan_features").select("plan, auto_posts_daily, smart_schedule");
    for (const pf of planos ?? []) {
      tetoDiario[pf.plan] = pf.auto_posts_daily ?? null;
      planSmart[pf.plan] = !!pf.smart_schedule;
    }
  } catch { /* mantem o padrao acima */ }

  let totalSent = 0, totalFailed = 0, totalSkipped = 0, totalBlocked = 0;
  let totalExpirados = 0, totalAgendados = 0, totalVencidos = 0;
  let totalRepetidos = 0; // v23: pulos por "Nao repetir produto"
  const instanciasDerrubadas: string[] = [];

  for (const group of groups) {
    const userPlan = planMap[group.user_id] || "starter";
    const planAllowed = PLAN_MARKETPLACES[userPlan] ?? null;

    const teto = tetoDiario[userPlan] ?? null;
    if (teto !== null && teto > 0) {
      const { count: sentToday } = await sb.from("scheduled_posts")
        .select("id", { count: "exact", head: true })
        .eq("group_id", group.id).eq("is_manual", false).eq("status", "sent")
        .gte("sent_at", todayBR + "T00:00:00Z");
      if ((sentToday ?? 0) >= teto) { totalSkipped++; continue; }
    }

    const smart = !!group.smart_schedule && (planSmart[userPlan] ?? false);

    if (smart) {
      // Fim de semana desmarcado: nao roda sabado nem domingo. Nao ha
      // fallback pro modo antigo aqui — "nao aplicar no fim de semana"
      // significa nao postar, e nao postar de outro jeito.
      if ((brDow === 0 || brDow === 6) && !group.smart_weekend) { totalSkipped++; continue; }
      // Fora das tres janelas nao ha o que decidir. O quanto postar depende do
      // numero de produtos, que so e conhecido depois do filtro la embaixo.
      if (!janelaDe(brMinutos)) { totalSkipped++; continue; }
    } else {
      // v23: fim de semana no modo normal. `weekend_enabled` nasce TRUE, entao
      // este gate so recusa para quem desmarcou de proposito -- ninguem para de
      // postar no sabado por causa do deploy. Mesma semantica do smart_weekend:
      // "nao aplicar no fim de semana" significa NAO POSTAR, nao postar de
      // outro jeito.
      if ((brDow === 0 || brDow === 6) && group.weekend_enabled === false) { totalSkipped++; continue; }

      const startH = group.start_hour ?? 0, endH = group.end_hour ?? 23;
      const inWindow = startH <= endH ? brHour >= startH && brHour <= endH : brHour >= startH || brHour <= endH;
      if (!inWindow) { totalSkipped++; continue; }

      const intervalMs = (group.interval_minutes ?? 10) * 60 * 1000;
      const lastPost = group.last_post_at ? new Date(group.last_post_at).getTime() : 0;
      if (Date.now() - lastPost < intervalMs) { totalSkipped++; continue; }
    }

    const credsMap = await carregarCredenciais(sb, group.user_id);
    const lojasComCredencial = new Set(Object.keys(credsMap).filter((store) => {
      const c = credsMap[store];
      return c && Object.values(c).some((v) => v && String(v).trim());
    }));

    const { data: allProducts } = await sb.from("products")
      .select("id, title, source, affiliate_url, original_url, image_url, price, price_original, price_suffix, price_installment, coupon_code, cta_text, cta_random, description, expired, scheduled_at, valid_until, never_expires")
      .eq("niche_group_id", group.id).order("position");
    if (!allProducts?.length) { totalSkipped++; continue; }

    const agoraMs = now.getTime();
    let puladosExpirados = 0, puladosAgendados = 0, puladosVencidos = 0;

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
      // v15: validade da oferta. never_expires isenta o produto desta regra --
      // e so desta: o expired acima ja passou e nao tem isencao, porque e fato
      // do marketplace, nao politica nossa.
      if (p.never_expires !== true && p.valid_until) {
        const ate = new Date(p.valid_until).getTime();
        if (Number.isFinite(ate) && ate < agoraMs) { puladosVencidos++; return false; }
      }
      return true;
    });

    totalExpirados += puladosExpirados;
    totalAgendados += puladosAgendados;
    totalVencidos += puladosVencidos;

    if (!products.length) {
      totalSkipped++;
      // Registra o motivo real em vez de falhar em silencio.
      if (puladosExpirados || puladosAgendados || puladosVencidos) {
        const motivo = [
          puladosExpirados ? `${puladosExpirados} fora do ar` : "",
          puladosAgendados ? `${puladosAgendados} aguardando agendamento` : "",
          puladosVencidos ? `${puladosVencidos} com validade vencida` : "",
        ].filter(Boolean).join(", ");
        await sb.from("scheduled_posts").insert({
          user_id: group.user_id, group_id: group.id, product_id: allProducts[0].id,
          status: "skipped", scheduled_for: now.toISOString(), sent_at: null, is_manual: false,
          error: `Nenhum produto disponivel agora: ${motivo}.`,
        });
      }
      continue;
    }

    // ── Horarios Inteligentes: o ritmo sai da conta, nao do relogio ──
    // Aqui `products` ja passou por expirado, agendado e validade, entao o N
    // reflete o que de fato pode ir ao ar hoje. Produto que nao couber hoje
    // entra amanha pelo cursor, que continua de onde parou.
    if (smart) {
      const tetoPlano = teto !== null && teto > 0 ? teto : SMART_MAX_DIA;
      const N = Math.min(products.length, SMART_MAX_DIA, tetoPlano);
      const esperados = esperadosAte(N, brMinutos);
      const { count: enviadosHoje } = await sb.from("scheduled_posts")
        .select("id", { count: "exact", head: true })
        .eq("group_id", group.id).eq("is_manual", false).eq("status", "sent")
        .gte("sent_at", todayBR + "T00:00:00Z");
      if ((enviadosHoje ?? 0) >= esperados) { totalSkipped++; continue; }
    }

    const total = products.length;

    // ── v23: SELECAO DO PRODUTO ─────────────────────────────────────────────
    // A ordem e SEMPRE a de cadastro (products.position, ja aplicado no
    // .order("position") la em cima) percorrida pelo cursor_index. O que o
    // "Post em Loop" decide agora nao e a ordem, e o que acontece ao chegar no
    // FIM da lista:
    //   loop_enabled = true  -> volta ao inicio (% total) e recomeca pra sempre
    //   loop_enabled = false -> PARA de postar ate entrar produto novo
    // O sorteio da v20 e o resorteio da v21 sairam junto: sem Math.random() nao
    // ha como repetir o post anterior, entao a consulta a scheduled_posts que a
    // v21 fazia a cada disparo de grupo em Loop deixou de existir.
    const loop = !!group.loop_enabled;
    const inicio = group.cursor_index ?? 0;

    // "Nao repetir produto" (no_repeat_daily): produto que ja saiu HOJE neste
    // grupo fica de fora ate a virada do dia em Brasilia. Mesmo todayBR do teto
    // diario. So consulta o banco quando a flag esta ligada.
    const postadosHoje = new Set<string>();
    if (group.no_repeat_daily) {
      const { data: jaSairamHoje } = await sb.from("scheduled_posts")
        .select("product_id")
        .eq("group_id", group.id).eq("is_manual", false).eq("status", "sent")
        .gte("sent_at", todayBR + "T00:00:00Z");
      for (const r of jaSairamHoje ?? []) if (r?.product_id) postadosHoje.add(r.product_id);
    }

    // Loop ligado varre a lista inteira a partir do cursor, dando a volta.
    // Loop desligado varre so o que falta do cursor ate o fim -- sem dar a
    // volta, que e o "parar no fim". Com o cursor ja alem do fim a varredura e
    // vazia e o grupo simplesmente nao posta.
    const varredura = loop ? total : Math.max(0, total - inicio);
    let cursor = 0, product = null;
    let bloqueadoPorCredencial = false, puladoPorRepeticao = 0;
    for (let i = 0; i < varredura; i++) {
      const idx = loop ? (inicio + i) % total : inicio + i;
      const candidato = products[idx];
      const src = candidato.source ?? "";
      if (LOJAS_QUE_EXIGEM_CREDENCIAL.has(src) && !lojasComCredencial.has(src)) {
        console.warn(`[BLOQUEADO] grupo=${group.id} source=${src}`);
        bloqueadoPorCredencial = true; totalBlocked++; continue;
      }
      if (postadosHoje.has(candidato.id)) { puladoPorRepeticao++; totalRepetidos++; continue; }
      cursor = idx; product = candidato; break;
    }

    if (!product) {
      totalSkipped++;
      // Credencial faltando continua sendo FALHA visivel: o usuario tem o que
      // consertar. Lista que acabou (loop desligado) ou dia ja cumprido (nao
      // repetir) nao sao falha de ninguem -- ficam quietos, como o gate de
      // horario ja fica.
      if (bloqueadoPorCredencial) {
        await sb.from("scheduled_posts").insert({ user_id:group.user_id, group_id:group.id, product_id:products[0].id, status:"failed", scheduled_for:now.toISOString(), sent_at:null, is_manual:false, error:"Nenhum produto pôde ser postado: configure suas credenciais." });
      } else if (puladoPorRepeticao > 0) {
        console.log(`[NAO-REPETIR] grupo=${group.id} todos os ${puladoPorRepeticao} produtos elegiveis ja sairam hoje`);
      } else {
        console.log(`[FIM-DA-LISTA] grupo=${group.id} cursor=${inicio} total=${total} — Post em Loop desligado, aguardando produto novo`);
      }
      continue;
    }

    // Sem Loop o cursor NAO da a volta: ele para em total, e e isso que segura
    // o rodizio ate entrar produto novo. Com Loop, % total recomeca do 1o.
    const nextCursor = loop ? (cursor + 1) % total : cursor + 1;
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
            const r = await fetchWithTimeout(`${ENGINE_URL}/send-group`, { method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${ENGINE_TOKEN}`}, body:JSON.stringify({ sessionPhone:phoneClean, groupId:wg.group_jid, text:msg, imageUrl:product.image_url||undefined, userId:group.user_id }) }, ENGINE_TIMEOUT_MS);
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
            const r = await fetchWithTimeout(`${ENGINE_URL}/send`, { method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${ENGINE_TOKEN}`}, body:JSON.stringify({ sessionPhone:phoneClean, channelId, text:msg, imageUrl:product.image_url||undefined, userId:group.user_id }) }, ENGINE_TIMEOUT_MS);
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
    // v22: "Excluir automaticamente após postar" (niche_groups.delete_after_post).
    // So apaga em post que de fato saiu (groupSent>0) -- falha em todos os canais
    // nao consome o produto. product_id em scheduled_posts e clone_posts e
    // "on delete set null", entao o historico (inclusive a linha que acabou de
    // ser inserida acima) sobrevive com product_id nulo; so o produto some do
    // rodizio. cursor_index ja foi salvo com o total ANTES da exclusao -- na
    // proxima rodada o total recalculado (products.length) absorve a mudanca
    // sozinho, sem precisar de ajuste aqui.
    if (group.delete_after_post && groupSent > 0) {
      const { error: eDel } = await sb.from("products").delete().eq("id", product.id);
      if (eDel) console.warn(`[EXCLUIR-APOS-POSTAR] grupo=${group.id} produto=${product.id} falhou: ${eDel.message}`);
    }
    totalSent += groupSent; totalFailed += groupFailed;
  }

  return new Response(JSON.stringify({ groups:groups.length, sent:totalSent, failed:totalFailed, skipped:totalSkipped, blocked:totalBlocked, pulados_expirados:totalExpirados, pulados_agendados:totalAgendados, pulados_vencidos:totalVencidos, pulados_repetidos:totalRepetidos, instancias_derrubadas:instanciasDerrubadas }), { headers:{"content-type":"application/json"} });
});
