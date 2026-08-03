// Mega Links BR · Edge Function "clone-ingest" — Clone Post Fase 2 (captura automatica)
//
// O wa-engine escuta os grupos-fonte cadastrados em clone_sources e manda pra ca
// cada mensagem capturada. Aqui acontece tudo o que na Fase 1 rodava no navegador:
// resolver o link, descartar o afiliado alheio, buscar preco/imagem e montar o
// link do dono. O navegador nao participa, entao nada pode depender de CREDS_STATE.
//
// POST /functions/v1/clone-ingest
// Authorization: Bearer <WA_ENGINE_TOKEN>          (mesmo padrao da wa-heartbeat)
// { "messages": [ { "sessionPhone", "jid", "msgId", "text", "ts" } ], "dryRun": false }
// { "action": "jids" }     -> lista de grupos a escutar, pro engine filtrar na origem
// { "action": "reparse" }  -> reaplica o fallback de texto nas capturas failed
//
// Decisoes que valem a pena estarem escritas aqui:
//
//  * SEMPRE 'pending'. Mesmo que o Grupo de Oferta tenha clone_auto_approve
//    ligado. Na Fase 1 o dono viu o preview antes de salvar; aqui nao ha ninguem
//    no circuito, e um titulo errado publicado no grupo da cliente nao se desfaz.
//
//  * Trava de plano propria (plan_features.clone_auto, Elite pra cima). O
//    clone_post da Fase 1 continua sendo Pro pra cima. A captura automatica
//    gasta credito sozinha, sem ninguem olhando — por isso a trava separada.
//
//  * Teto diario por fonte (clone_sources.max_per_day). Cada captura vira uma
//    product-search; no ML isso e Scrape.do a 10 creditos. Sem teto, uma fonte
//    movimentada queima a quota do mes numa tarde.
//
//  * Dois caminhos de entrada, os dois fail-closed:
//      - Bearer WA_ENGINE_TOKEN  -> o wa-engine, mesmo padrao da wa-heartbeat.
//        O container nao tem CRON_SECRET no ambiente, entao usar so x-cron-secret
//        obrigaria a mexer no EasyPanel pra estrear a funcao.
//      - x-cron-secret           -> teste e cron. E o unico segredo que existe no
//        vault, ou seja, o unico jeito de exercitar esta funcao pelo Postgres.
//
//  * Isolamento entre contas. A fonte e localizada pelo JID do grupo, e o mesmo
//    JID pode estar cadastrado por usuarios diferentes — duas clientes na mesma
//    comunidade de ofertas e situacao comum, nao excecao. Toda captura so vale se
//    o numero que capturou estiver em whatsapp_instances DO DONO da fonte. O
//    engine escuta com todas as sessoes do container, entao a captura da sessao
//    de A pode chegar aqui carimbada para uma fonte de B: e aqui que ela morre.
//
//  * Nunca devolve "vazio" onde poderia devolver "falhou": cada mensagem sai do
//    lote com um status nomeado e um motivo legivel.
//
//  * v5 — fallback de texto. A primeira captura real (30/07, grupo "TaNaMao")
//    trouxe 4 links da Amazon: os 4 resolveram, os 4 tiveram o afiliado alheio
//    trocado pelo do dono, e os 4 morreram em 'failed' porque a Amazon nao tem
//    enriquecimento automatico. O texto postado pelo grupo-fonte JA TRAZIA
//    titulo, preco de/por e cupom. Quando a loja nao responde, a oferta e lida do
//    texto e marcada com data_source='message' — dado copiado de terceiro, nao
//    conferido na loja. A tela de revisao mostra essa diferenca ao dono.
//
//  * v6 — conserto do contador do reparse em dryRun. A linha era
//        out.push({ id, status: "recuperaria", ...patch })
//    e `patch` traz status:'pending' (o valor que sera gravado). Como o spread
//    vem DEPOIS do rotulo, ele sobrescrevia "recuperaria" por "pending", e o
//    filtro seguinte — que conta "recuperado" ou "recuperaria" — devolvia 0
//    mesmo com todas as linhas recuperaveis. Nao enganava quem lia o corpo
//    inteiro (os resultados apareciam completos), so o numero do topo, que e
//    justamente o que se olha primeiro.
//    A licao e velha conhecida deste projeto: espalhar um objeto por cima de
//    campos ja escritos apaga o que estava la. Aqui o `status` do patch e o
//    estado FUTURO da linha no banco; o `status` do resultado e o ROTULO do que
//    aconteceu nesta rodada. Dois significados no mesmo nome, num objeto so.
//
//  * v7 — o veredito passa a ser GRAVADO (clone_ingest_log). Ate a v6 cada
//    mensagem saia daqui com um status nomeado e um motivo legivel... dentro da
//    resposta HTTP, que o engine descartava depois de logar o contador `salvos`.
//    MEDIDO em 30/07: a fonte "TaNaMao" capturou 4 ofertas entre 08:11 e 08:41 e
//    nada nas 3h45 seguintes, e nao havia como distinguir "o grupo ficou quieto"
//    de "chegaram 12 mensagens e todas foram recusadas por repeticao". Nao ter
//    resposta pra isso e o mesmo defeito de fundo do `price_changed` e do
//    `expired`: dado calculado que nao chega a nenhuma tela.
//    O log guarda o VEREDITO, nunca o texto da mensagem — o conteudo e de
//    terceiro e ja mora em clone_posts.source_text quando a captura vinga.
//    E falha ao gravar o log nao derruba a ingestao: ele existe pra explicar o
//    que aconteceu, nao pra decidir o que acontece.

//  * v10 — Horarios Inteligentes na captura. REVERTIDO na v12, ver abaixo.

//  * v11 — auto-publicacao por fonte (clone_sources.auto_publish). A captura
//    vira produto do grupo sem passar pela fila, MAS so quando a loja confirmou
//    os dados (data_source === "store"). Captura que caiu no fallback de ler do
//    texto da mensagem continua indo para revisao mesmo com o auto ligado: o
//    preco ali e o que um terceiro digitou, nao o que a loja respondeu, e preco
//    errado publicado no grupo da cliente nao se desfaz. Isso afrouxa o "SEMPRE
//    pending" da v1 sem abrir mao do motivo dele.
//    Nao posta na hora: insere em products e o send-post publica no proximo
//    disparo, respeitando intervalo, janela e Horarios Inteligentes.

//  * v12 — a captura VOLTA A RODAR 24h. O gate de Horarios Inteligentes que a
//    v10 colocou aqui foi removido; ele fica so no send-post, que e onde a
//    janela significa alguma coisa.
//    O motivo e assimetria de custo, e ela nao e obvia: a mensagem no grupo
//    fonte NAO VOLTA. Recusar a captura por horario nao adia a oferta, apaga
//    ela. Ja o disparo pode esperar — a oferta fica na fila e sai na proxima
//    janela intacta. Gate no lado errado troca "posta mais tarde" por "perdeu".
//    MEDIDO em 31/07: entre 10:36 e 10:45 a fonte "Melhores Ofertas" recusou 3
//    mensagens por 'fora_da_janela'. Nenhuma delas voltou ao meio-dia.
//    O argumento original do gate era economia de credito. Quem limita credito
//    e o max_per_day da fonte, que conta capturas e nao horas — a janela nao
//    economizava nada que o teto ja nao economizasse, so escolhia QUAIS ofertas
//    perder, e escolhia mal (as de fora da janela, nao as piores).
//    clone_sources.smart_schedule e smart_weekend ficam na tabela sem leitor.
//    niche_groups.smart_schedule, que e o do send-post, continua valendo.

//  * v17 — P36: pre-filtro por dominio do link cru, ANTES da resolve-link.
//    Complementa a v16 sem substituir: quando o dominio cru ja responde qual e
//    a loja e ela nao esta em lojas_permitidas, a mensagem morre aqui e a
//    resolve-link nao e chamada. Quando o dominio nao responde (encurtador
//    generico), nada muda — segue para a resolve-link como na v16.
//    As duas recusas ficam distinguiveis no log pelo prefixo do motivo,
//    [pre-filtro] e [pos-filtro]. E de proposito: sem isso nao ha como medir se
//    o pre-filtro pega alguma coisa. Ver DOMINIOS_LOJA.

//  * v16 — P31: filtro de loja por fonte (clone_sources.lojas_permitidas).
//    Grupo-fonte que presta para uma loja e nao para outra e o caso comum, nao a
//    excecao. MEDIDO em 01/08 na "Melhores Ofertas da Internet", com o campo de
//    teste de clonabilidade: link de Shopee clona, link de Mercado Livre nao —
//    aquele grupo posta vitrine de afiliado, que nao leva a produto nenhum. Sem
//    filtro, a plataforma gasta uma resolve-link por mensagem, 24h por dia, para
//    sempre recusar; com filtro, o dono desliga a metade que nao presta e fica
//    com a que presta, em vez de ter que largar o grupo inteiro.
//    ONDE o filtro mora importa: DEPOIS da resolve-link (que e quem sabe qual e
//    a loja — o link chega encurtado e o dominio cru nao responde isso) e ANTES
//    da product-search, que e onde o Scrape.do custa 10 creditos no ML.
//    ARRAY VAZIO = TODAS. E o default, entao nenhuma fonte existente muda de
//    comportamento. "Nenhuma loja permitida" nao e estado alcancavel: fonte que
//    recusa tudo e fonte desativada, e para isso ja existe o `active`.
//
//  * v15 — P21: a Amazon passa a ser LIDA DA PAGINA, nao do texto da mensagem.
//    MEDIDO em 01/08: as 14 capturas que o Clone Post ja produziu na vida tem
//    data_source='message', todas Amazon. O preco publicado no grupo da cliente
//    era o que o grupo-fonte digitou, nunca conferido no anuncio. O contraste
//    esta na propria base: os mesmos produtos, depois de passarem pelo
//    product-refresh, mudaram de 251,91 -> 279,90 (Karcher), 285,30 -> 379,99
//    (Calvin Klein), 52,67 -> 58,52 (Kit Rapunzel). Tres de quatro errados.
//    O enriquecimento de loja nao e qualidade de dado: e a unica protecao
//    contra um grupo-fonte que erra. Sem ele a plataforma republica o erro de
//    terceiro com a marca do cliente.
//    O conserto nao foi escrever leitor novo — ele ja existia e funcionava. Ver
//    consultarAmazonDireto.
//
//  * v15 — P20: o clone_ingest_log passa a guardar host e caminho do link que
//    falhou, e a loja detectada. Ate a v14 dava para contar "10 recusas de
//    Shopee" e nao dava para saber QUAIS, nem reproduzir uma — foi exatamente
//    isso que atrasou o diagnostico da Shopee por dois dias. Nunca o texto da
//    mensagem: conteudo de terceiro so mora em clone_posts.source_text, e so
//    quando a captura vinga.
//
//  * v13/v14 — foto virou requisito da captura. Quando a loja nao devolve imagem,
//    tenta o og:image da pagina (Microlink); se ainda assim nao vier, a captura
//    e RECUSADA com status 'sem_imagem' em vez de virar oferta muda no grupo.
//    O que motivou: 14 capturas seguidas sem foto nenhuma, porque a
//    product-search pendura para a Amazon e o fallback de texto nao tem de onde
//    tirar foto. Ver o comentario do buscarFotoOg para o que foi medido.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WA_ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";
const CRON_SECRET     = Deno.env.get("CRON_SECRET") ?? "";
const WA_ENGINE_URL   = Deno.env.get("WA_ENGINE_URL") || "https://megalinksbr-wa-engine.fwezsn.easypanel.host";

// Janela do dedupe por link. O mesmo produto reaparece em grupo de oferta o
// tempo todo; sem janela, o Grupo de Oferta enche de repetido.
const DEDUPE_DAYS = Number(Deno.env.get("CLONE_DEDUPE_DAYS") ?? "7");
// Mensagem antiga (reentrega do Baileys apos reconnect) nao vira oferta nova.
const MAX_MSG_AGE_MIN = Number(Deno.env.get("CLONE_MAX_MSG_AGE_MIN") ?? "60");
const MAX_MSGS_POR_LOTE = 20;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// resolve-link fala "mercadolivre"; o enum marketplace do banco fala "mercado_livre".
// Ja custou uma investigacao antes — a traducao mora aqui, num lugar so.
const STORE_ENUM: Record<string, string> = {
  mercadolivre: "mercado_livre",
  shopee: "shopee",
  amazon: "amazon",
  aliexpress: "aliexpress",
  magalu: "magalu",
  shein: "shein",
  natura: "natura",
  terabyte: "terabyte",
};

const STORE_LABEL: Record<string, string> = {
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
  amazon: "Amazon",
  aliexpress: "AliExpress",
  magalu: "Magalu",
  shein: "Shein",
  natura: "Natura",
  terabyte: "TerabyteShop",
};

// ── v17 · P36 · pre-filtro por dominio do link cru ────────────────────────
// A v16 filtra por loja DEPOIS da resolve-link, que e quem sabe qual e a loja.
// Isso custa uma resolve-link por mensagem que a fonte ja tinha dito que nao
// queria. MEDIDO em 03/08: 104 recusas em 7 dias de vitrine de afiliado do
// Mercado Livre nas duas fontes, onde o ML nem esta em lojas_permitidas — e 94
// delas sao o MESMO link, /social/vw20240830181031.
//
// ⚠️ O QUE ISTO AINDA NAO SABE, e precisa ser dito antes de alguem comemorar:
// o clone_ingest_log guarda o host DEPOIS do redirecionamento
// (`resolved || original`), entao nao ha como saber se aquelas 104 chegaram
// escritas como mercadolivre.com.br ou como um encurtador. As capturas que
// vingaram no mesmo grupo vem de s.shopee.com.br, amzlink.to e link.amazon —
// todas encurtadas. Se as recusas tambem vierem, este filtro pega ZERO.
// Por isso a recusa de pre-filtro carrega o prefixo [pre-filtro] no motivo e o
// host CRU em link_host: a leitura de 04/08 separa uma coisa da outra sem
// depender de inferencia.
//
// Regra conservadora de proposito: so recusa quando TODOS os links do texto
// tem dominio reconhecido E nenhum deles esta nas lojas permitidas. Um unico
// link desconhecido (encurtador generico, boaoferta.me) faz a mensagem seguir
// para a resolve-link exatamente como antes. Recusar por engano uma loja
// permitida e pior que gastar a resolve.
const DOMINIOS_LOJA: Array<[string, string]> = [
  ["mercadolivre.com.br", "mercadolivre"],
  ["mercadolivre.com", "mercadolivre"],
  ["mercadolibre.com", "mercadolivre"],
  ["meli.la", "mercadolivre"],
  ["shopee.com.br", "shopee"],
  ["shp.ee", "shopee"],
  ["amazon.com.br", "amazon"],
  ["amazon.com", "amazon"],
  ["amzn.to", "amazon"],
  ["amzlink.to", "amazon"],
  ["link.amazon", "amazon"],
  ["a.co", "amazon"],
];

// Casa por sufixo: s.shopee.com.br e produto.mercadolivre.com.br precisam cair
// no mesmo balde que o dominio raiz. Devolve null para tudo que nao reconhece —
// null aqui quer dizer "nao sei", nunca "nao e loja".
function lojaDoDominio(host: unknown): string | null {
  const h = String(host ?? "").trim().toLowerCase().replace(/^www\./, "");
  if (!h) return null;
  for (const [dom, loja] of DOMINIOS_LOJA) {
    if (h === dom || h.endsWith("." + dom)) return loja;
  }
  return null;
}

// Todos os links http(s) do texto, na ordem. A pontuacao final e aparada porque
// grupo de oferta escreve "confira: https://x.com/y." e o ponto entra na URL.
function linksDoTexto(texto: unknown): string[] {
  const achados = String(texto ?? "").match(/https?:\/\/[^\s<>"'\)\]]+/gi) || [];
  return achados.map((u) => u.replace(/[.,;:!?]+$/, "")).filter(Boolean);
}

// Planos com captura automatica, caso plan_features esteja indisponivel.
// Piso, nao fonte da verdade: a tabela sobrescreve (licao do PLAN_FALLBACK).
const CLONE_AUTO_FALLBACK: Record<string, boolean> = {
  starter: false, pro: false, elite: true, premium: true,
};

function hojeSP(): string {
  // Contador diario no fuso de quem opera, nao em UTC: senao o teto vira as 21h.
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function sufixoFone(raw: unknown): string {
  const n = String(raw ?? "").replace(/\D/g, "");
  return n ? n.slice(-8) : "";
}

function normalizarJid(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════════
// Fallback: ler a oferta do proprio texto da mensagem
// ═══════════════════════════════════════════════════════════════════════
// Isto NAO e fonte da verdade. Preco lido do texto e preco que um terceiro
// DIGITOU, nao preco conferido na loja — por isso quem usa marca
// data_source='message' e o dono revisa antes de publicar.

type OfertaTexto = {
  title: string | null;
  price: number | null;           // "por" — o que o cliente paga
  price_original: number | null;  // "de"  — preco riscado
  discount_pct: number | null;
  coupon_code: string | null;
  price_installment: string | null;
  campos: string[];               // o que de fato saiu do texto, pra auditoria
};

// "1.299,00" -> 1299   "400,00" -> 400   "89,90" -> 89.9   "89" -> 89
// O caso traicoeiro e o ponto sozinho: "1.299" e milhar, "89.90" e decimal.
// Decide pelo tamanho do ultimo grupo — 3 digitos e milhar.
function numeroBr(raw: string): number | null {
  let s = String(raw ?? "").trim().replace(/\s/g, "");
  if (!s) return null;
  const temPonto = s.includes(".");
  const temVirgula = s.includes(",");
  if (temVirgula) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (temPonto) {
    const partes = s.split(".");
    const ultima = partes[partes.length - 1];
    if (partes.length > 2 || ultima.length === 3) s = partes.join("");
    // 1 ou 2 digitos depois do ponto: e decimal, deixa como esta
  }
  const n = parseFloat(s);
  if (!isFinite(n) || n <= 0) return null;
  // Oferta de grupo de WhatsApp acima de 1 milhao e erro de parse, nao oferta.
  if (n > 1000000) return null;
  return Math.round(n * 100) / 100;
}

// Tira a formatacao do WhatsApp (*negrito*, ~riscado~, _italico_, ```mono```)
function semFormato(s: string): string {
  return String(s ?? "")
    .replace(/```/g, "")
    .replace(/[*~_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const RE_PRECO = /R\$\s*([\d][\d.,]*)/gi;
// "12x", "5x de R$ 50,00", "3x sem juros", "em 10x"
const RE_PARCELA = /(?:em\s*)?(\d{1,2})\s*x(?:\s*(?:de\s*)?R\$\s*[\d][\d.,]*)?(?:\s*sem\s*juros)?/gi;

function acharParcelamento(texto: string): { rotulo: string | null; mascarado: string } {
  let rotulo: string | null = null;
  const mascarado = texto.replace(RE_PARCELA, (m) => {
    const limpo = semFormato(m).replace(/^em\s+/i, "");
    // O primeiro parcelamento encontrado vale; o resto so precisa sair do caminho
    // pra nao ser lido como preco ("12x de R$ 50" nao e "de R$ 50").
    if (!rotulo && /\d/.test(limpo)) rotulo = limpo;
    return "   ";
  });
  return { rotulo, mascarado };
}

// Em grupo de oferta o nome do produto quase sempre vem em *negrito*. A linha de
// cima costuma ser chamada ("ESSE E DIFERENCIADO", "SOU DEFENSORA DO POD") — se
// ela virar titulo, o post sai sem dizer o que esta vendendo.
function candidatoRuim(s: string): boolean {
  const t = semFormato(s);
  if (t.length < 6) return true;
  if (/R\$/i.test(t)) return true;                 // e preco, nao nome
  if (/^\d{1,2}\s*x\b/i.test(t)) return true;      // parcelamento
  if (/\bcupom\b/i.test(t)) return true;
  if (/^https?:/i.test(t)) return true;
  if (!/[a-zA-ZÀ-ſ]{3}/.test(t)) return true;      // sem palavra de verdade
  return false;
}

function soCaixaAlta(s: string): boolean {
  const letras = s.replace(/[^a-zA-ZÀ-ſ]/g, "");
  return letras.length > 3 && letras === letras.toUpperCase();
}

function acharTitulo(texto: string): string | null {
  // 1) negrito do WhatsApp
  const negritos: string[] = [];
  for (const m of texto.matchAll(/\*([^*\n]{2,160})\*/g)) negritos.push(m[1]);
  const bons = negritos.map(semFormato).filter((s) => !candidatoRuim(s));
  if (bons.length) {
    // o mais longo tem mais chance de ser o nome completo do produto
    bons.sort((a, b) => b.length - a.length);
    return bons[0].slice(0, 120);
  }
  // 2) sem negrito: linha mais informativa, chamada em caixa alta em ultimo lugar
  const linhas = texto.split(/\n+/).map(semFormato).filter((l) => l && !candidatoRuim(l));
  if (!linhas.length) return null;
  const normais = linhas.filter((l) => !soCaixaAlta(l));
  const pool = normais.length ? normais : linhas;
  pool.sort((a, b) => b.length - a.length);
  return pool[0].slice(0, 120);
}

function acharCupom(texto: string): string | null {
  const re = /cupom\s*(?:de\s*desconto\s*)?[:\-–]?\s*[`*~_\s]*([A-Za-z0-9][A-Za-z0-9._-]{2,24})/i;
  const m = texto.match(re);
  if (!m) return null;
  const c = m[1].replace(/[`*~_.\-]+$/, "").toUpperCase();
  if (c.length < 3 || c.length > 25) return null;
  // Palavra de ligacao capturada por acidente ("cupom no carrinho", "cupom da loja")
  if (/^(NO|NA|DO|DA|DE|EM|COM|PARA|SEM|AQUI|LINK|ACIMA|ABAIXO|EXCLUSIVO|LOJA)$/.test(c)) return null;
  return c;
}

function acharPrecos(textoOriginal: string): { de: number | null; por: number | null } {
  const { mascarado } = acharParcelamento(textoOriginal);

  // Riscado do WhatsApp em cima de um preco e o sinal mais confiavel de "de".
  let de: number | null = null;
  const risc = mascarado.match(/~[^~\n]*?R\$\s*([\d][\d.,]*)[^~\n]*?~/i);
  if (risc) de = numeroBr(risc[1]);

  // Rotulos. O "de" exige fronteira de palavra pra nao casar dentro de outra
  // palavra, e o parcelamento ja saiu do texto antes de chegar aqui.
  if (de == null) {
    const mDe = mascarado.match(/\bde\b\s*[:\-–]?\s*[~*`\s]*R\$\s*([\d][\d.,]*)/i);
    if (mDe) de = numeroBr(mDe[1]);
  }
  let por: number | null = null;
  const mPor = mascarado.match(/\b(?:por|apenas|agora|s[oó])\b\s*[:\-–]?\s*[~*`\s]*R\$\s*([\d][\d.,]*)/i);
  if (mPor) por = numeroBr(mPor[1]);

  const todos: number[] = [];
  for (const m of mascarado.matchAll(RE_PRECO)) {
    const n = numeroBr(m[1]);
    if (n != null) todos.push(n);
  }

  if (por == null) {
    if (de != null) {
      const outros = todos.filter((n) => n !== de);
      if (outros.length) por = Math.min(...outros);
    } else if (todos.length === 1) {
      por = todos[0];
    } else if (todos.length > 1) {
      de = Math.max(...todos);
      por = Math.min(...todos);
    }
  } else if (de == null && todos.length > 1) {
    const outros = todos.filter((n) => n !== por);
    if (outros.length) {
      const maior = Math.max(...outros);
      if (maior > (por as number)) de = maior;
    }
  }

  // "De" menor ou igual ao "Por" e mensagem incoerente. NAO inverter: trocar os
  // dois transformaria "De R$ 29,90 por R$ 59,90" (erro de quem digitou) num
  // desconto de 50% que nunca existiu, e isso iria pro grupo da cliente. Preco
  // errado publicado nao se desfaz. Fica so o "por" e o desconto nao e afirmado.
  if (de != null && por != null && de <= por) de = null;

  return { de, por };
}

function lerOfertaDoTexto(texto: string): OfertaTexto {
  const t = String(texto ?? "");
  const campos: string[] = [];

  const title = acharTitulo(t);
  if (title) campos.push("title");

  const { de, por } = acharPrecos(t);
  if (por != null) campos.push("price");
  if (de != null) campos.push("price_original");

  const coupon_code = acharCupom(t);
  if (coupon_code) campos.push("coupon_code");

  const { rotulo } = acharParcelamento(t);
  // "5x" sozinho nao informa nada; so vale parcelamento que diz valor ou "sem juros"
  const price_installment = rotulo && /R\$|sem\s*juros/i.test(rotulo) ? rotulo : null;
  if (price_installment) campos.push("price_installment");

  const discount_pct = de != null && por != null && por < de
    ? Math.round((1 - por / de) * 100)
    : null;
  if (discount_pct != null) campos.push("discount_pct");

  return { title, price: por, price_original: de, discount_pct, coupon_code, price_installment, campos };
}

// ── Link de afiliado, porte servidor do prGerarLinkAfil() do index.html ──
// Mesmas regras, mesma ordem. Se divergir do frontend, o mesmo produto sai com
// atribuicao diferente dependendo do caminho — por isso o espelho e literal.
function montarLinkAfiliado(link: string, store: string, cred: Record<string, string>): string {
  const valor = (k: string) => String(cred[k] ?? "").trim();

  if (store === "shopee") {
    const afId = valor("ID de Afiliado");
    if (!afId) return link;
    // Formato oficial de redirecionamento com atribuicao. Pendurar af_sub1 no
    // link original (jeito antigo) NAO gera atribuicao real.
    const limpo = link.split("#")[0];
    return `https://s.shopee.com.br/an_redir?origin_link=${encodeURIComponent(limpo)}&affiliate_id=${encodeURIComponent(afId)}`;
  }

  if (store === "mercadolivre") {
    const limpo = link.split("#")[0].split("%23")[0];
    const mattTool = valor("matt_tool ID");
    const etiqueta = valor("Etiqueta ML");
    if (!mattTool && !etiqueta) return limpo;
    try {
      const u = new URL(limpo);
      if (mattTool) u.searchParams.set("matt_tool", mattTool);
      if (etiqueta) u.searchParams.set("matt_word", etiqueta);
      u.searchParams.set("matt_medium", "affiliates");
      return u.toString();
    } catch { return limpo; }
  }

  if (store === "amazon") {
    // Especificamente o ID de Associado — pegar "o primeiro campo preenchido"
    // colaria a Access Key no parametro tag.
    const tag = valor("ID de Associado");
    if (!tag) return link;
    try { const u = new URL(link); u.searchParams.set("tag", tag); return u.toString(); }
    catch { return link; }
  }

  const qualquer = Object.values(cred).map((v) => String(v ?? "").trim()).find(Boolean) || "";
  if (!qualquer) return link;
  try { const u = new URL(link); u.searchParams.set("ref", qualquer); return u.toString(); }
  catch { return link; }
}

// Credenciais no formato que a product-search espera (espelho do prColetarCredenciais).
function montarCredenciaisBusca(porLoja: Record<string, Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  const sp = porLoja["shopee"] ?? {};
  const appKey = String(sp["App Key"] ?? sp["ID de Afiliado"] ?? "").trim();
  const appSecret = String(sp["App Secret"] ?? "").trim();
  if (appKey) out.shopee_app_id = appKey;
  if (appSecret) out.shopee_app_secret = appSecret;

  const az = porLoja["amazon"] ?? {};
  if (az["ACCESS KEY"]) out.amazon_access_key = String(az["ACCESS KEY"]).trim();
  if (az["SECRET KEY"]) out.amazon_secret_key = String(az["SECRET KEY"]).trim();
  if (az["ID de Associado"]) out.amazon_partner_tag = String(az["ID de Associado"]).trim();
  return out;
}

function contemAlguma(texto: string, termos: string[]): boolean {
  const t = texto.toLowerCase();
  return termos.some((k) => k && t.includes(String(k).toLowerCase().trim()));
}

async function chamarFuncao(slug: string, body: unknown, timeoutMs = 30000): Promise<any> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: c.signal,
    });
    const txt = await r.text();
    try { return JSON.parse(txt); }
    catch { return { ok: false, success: false, error: `${slug} devolveu HTTP ${r.status}: ${txt.slice(0, 160)}` }; }
  } catch (e) {
    return { ok: false, success: false, error: `${slug} nao respondeu: ${(e as Error).message}` };
  } finally { clearTimeout(t); }
}

// ── Mercado Livre com a credencial pessoal do dono ──────────────────────
// A product-search descobre de quem e a busca lendo o "sub" do JWT, e nos
// chamamos com service role, que nao tem sub. Por ali o Scrape.do pessoal do
// dono seria ignorado e a captura automatica queimaria a quota compartilhada
// (40 creditos/dia para a base inteira). Quando o dono tem credencial propria,
// falamos direto com o /ml-product; sem credencial, a product-search continua
// sendo o caminho — e ela ja cuida da quota, do dedupe e do fallback Microlink.
async function buscarMlDireto(url: string, cred: { token: string; token2: string; cookie: string }): Promise<any> {
  let endpoint = `${WA_ENGINE_URL}/ml-product?url=${encodeURIComponent(url)}`;
  if (cred.cookie) endpoint += `&userMlCookie=${encodeURIComponent(cred.cookie)}`;
  if (cred.token) endpoint += `&userScrapeToken=${encodeURIComponent(cred.token)}`;
  if (cred.token2) endpoint += `&userScrapeToken2=${encodeURIComponent(cred.token2)}`;
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 30000);
  try {
    const r = await fetch(endpoint, { headers: { "Authorization": `Bearer ${WA_ENGINE_TOKEN}` }, signal: c.signal });
    const d = await r.json().catch(() => null);
    if (!d) return { success: false, error: `wa-engine devolveu HTTP ${r.status} sem JSON` };
    // Traduz para o formato da product-search, que e o que o resto do fluxo le.
    return {
      success: !!d.ok && !!d.title,
      source: "ml-product",
      name: d.name ?? d.title, title: d.title,
      image: d.image ?? "", thumbnail: d.image ?? "",
      price_to: d.price_to, price_from: d.price_from,
      price: d.price_to, discount_pct: d.discount_pct,
      availability: d.availability,
      error: d.ok ? undefined : (d.error ?? "o ML nao devolveu o produto"),
    };
  } catch (e) {
    return { success: false, error: `wa-engine nao respondeu: ${(e as Error).message}` };
  } finally { clearTimeout(t); }
}

// ── v15 · P21 · a Amazon lida DA PAGINA ──────────────────────────────────
// O conserto aqui NAO e um leitor novo: ele ja existe no projeto, funciona, e a
// clone-ingest simplesmente nao o usava. O product-refresh le a Amazon por
// fetch direto, sem Scrape.do e sem custo de credito, exigindo duas testemunhas
// independentes do buybox — 12/12 de acerto medido em 30/07. Medido de novo em
// 01/08 14:24 UTC, com o product-refresh v17 em producao: leu a pagina do
// Karcher em 1,9 s e devolveu R$ 360,91 (o clone tinha publicado R$ 251,91).
//
// A clone-ingest chamava a product-search, que NAO TEM ramo de Amazon nenhum (o
// if cobre mercadolivre e shopee) e pendura mais de 90 s. O chamarFuncao
// abortava em 30 s, a loja "falhava", e a oferta caia no fallback de texto. Ou
// seja: o caminho certo estava a duas funcoes de distancia o tempo todo.
//
// As funcoes abaixo sao a porta desse leitor para ca, com um acrescimo: o
// titulo. O product-refresh so precisava saber que o productTitle EXISTE (e a
// prova de que a pagina e confiavel); aqui ele e o titulo que vai para o post,
// e e ele que substitui as linhas de texto que ja viraram "10% OFF" e uma URL
// crua na fila de revisao.
const AMZ_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const AMZ_TIMEOUT_MS = 15000;

// Numero vindo do HTML pt-BR da loja: aqui o ponto e SEMPRE separador de
// milhar. Nao confundir com numeroBr() la em cima, que trata texto DIGITADO por
// gente e por isso precisa decidir pelo tamanho do ultimo grupo. A ambiguidade
// existe la e nao existe aqui — por isso sao duas funcoes e nao uma.
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

// Devolve no formato da product-search, que e o que o resto do fluxo le — mesma
// traducao que o buscarMlDireto faz. Assim o unico ponto do arquivo que sabe da
// Amazon e este; nada mais muda de forma.
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
    if (!r.ok) return { success: false, source: "amazon-pagina", error: `a Amazon respondeu HTTP ${r.status}` };

    const html = await r.text();

    // PROVA DE QUE A PAGINA E CONFIAVEL, antes de ler qualquer coisa. Status 200
    // nao basta e ja mordeu este projeto duas vezes: captcha da Amazon volta 200
    // com ~4 KB, e o fetch a partir do Postgres devolveu 200 com 3 bytes de
    // corpo. Sem productTitle nada e afirmado — nem preco, nem foto, nem titulo.
    if (!html.includes('id="productTitle"')) {
      return {
        success: false, source: "amazon-pagina",
        error: html.length < 8000 ? "a Amazon devolveu bloqueio/captcha" : "pagina da Amazon sem productTitle",
      };
    }
    if (html.includes('id="outOfStock"')) {
      return { success: false, source: "amazon-pagina", error: "produto fora de estoque na Amazon" };
    }

    const titulo = tituloAmazon(html);
    if (!titulo) return { success: false, source: "amazon-pagina", error: "productTitle presente mas vazio" };

    const { por, de } = precoAmazon(html);
    // Preco sem as duas testemunhas e preco nao confirmado — e nao publicar
    // preco nao confirmado e o motivo desta funcao existir. Devolver o titulo da
    // loja com o preco do texto tambem nao serve: data_source e um campo so, nao
    // ha como gravar "titulo da loja, preco da mensagem". Entao recusa inteiro e
    // o fallback de texto assume, marcado como sempre foi.
    if (por === null) {
      return { success: false, source: "amazon-pagina", error: "o buybox da Amazon nao confirmou o preco (duas testemunhas)" };
    }

    const img = imagemAmazon(html);
    return {
      success: true, source: "amazon-pagina",
      name: titulo, title: titulo,
      image: img, thumbnail: img,
      price_to: por, price: por, price_from: de,
      availability: "disponivel",
    };
  } catch (e) {
    return { success: false, source: "amazon-pagina", error: `a Amazon nao respondeu: ${(e as Error).message}` };
  } finally { clearTimeout(t); }
}

// ── v15 · P20 · o log passa a dizer QUAL link falhou ─────────────────────
// Guarda host e caminho, nunca o texto da mensagem — conteudo de terceiro so
// mora em clone_posts.source_text, e so quando a captura vinga. A query string
// fica de fora de proposito: e onde vive o id do afiliado alheio e ela nao
// acrescenta nada ao diagnostico. Link que nem parseia nao vira campo: se nao
// da para dizer o que e, nao da para guardar como se soubesse.
function partesDoLink(url: unknown): { host: string | null; path: string | null } {
  const s = String(url ?? "").trim();
  if (!s) return { host: null, path: null };
  try {
    const u = new URL(s);
    return {
      host: u.hostname.replace(/^www\./, "").slice(0, 120),
      path: (u.pathname || "/").slice(0, 300),
    };
  } catch {
    return { host: null, path: null };
  }
}

// ── v13/v14 · foto do produto quando a loja nao responde ──────────────────
// MEDIDO em 31/07: a product-search **pendura** para a Amazon (>90s sem
// resposta, testado no navegador do dono). O chamarFuncao aborta em 30s, entao
// toda captura da Amazon cai no fallback de texto — e texto de WhatsApp nao tem
// foto. Resultado: 14 capturas automaticas seguidas, TODAS sem imagem.
//
// Buscar a pagina direto daqui NAO funciona: medido tambem, a Amazon responde
// HTTP 200 com 3 bytes de corpo para requisicao de datacenter. E bloqueio
// silencioso — 200 nao quer dizer que veio conteudo.
//
// O Microlink renderiza a pagina e devolve o og:image. Medido no mesmo produto:
// status "success" e a foto em m.media-amazon.com, mesma familia das fotos que
// ja existem nos produtos do grupo.
//
// So e chamado quando NAO ha imagem — nao substitui a foto da loja, so cobre o
// buraco. E falha aqui nao explode a ingestao: devolve "" e quem chama decide.
// O Microlink responde status "success" para PAGINA DE ERRO tambem, e a og:image
// dela e o logo do erro. MEDIDO em 31/07 com um ASIN inexistente: veio
// {status:"success", title:"Nao foi possivel encontrar esta pagina",
//  image:".../images/G/32/error/logo._TTD_.png"}. Sem esta checagem o grupo
// receberia o logo de erro da Amazon como foto do produto — pior que nao postar.
// "success" do Microlink significa "consegui ler a pagina", nao "a pagina e um
// produto": mais um caso de resposta positiva que nao responde a pergunta feita.
function fotoPlausivel(img: string, paginaUrl: string): boolean {
  if (!/^https?:\/\//i.test(img)) return false;
  if (/\/error\//i.test(img)) return false;
  if (/(^|[\/._-])(logo|sprite|placeholder|no[-_]?image|default)[._-]/i.test(img)) return false;
  // Na Amazon foto de item vive em /images/I/; /images/G/ e asset de interface.
  if (/(^|\.)amazon\./i.test(paginaUrl) && !/\/images\/I\//i.test(img)) return false;
  return true;
}

async function buscarFotoOg(url: string): Promise<string> {
  if (!url) return "";
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 20000);
  try {
    const r = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: c.signal });
    const d = await r.json().catch(() => null);
    if (!d || d.status !== "success") return "";
    // De proposito NAO cai para d.data.logo: logo da loja nao e foto do produto.
    const img = String(d?.data?.image?.url ?? "").trim();
    return fotoPlausivel(img, url) ? img : "";
  } catch {
    return "";
  } finally { clearTimeout(t); }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  // Fail-closed: sem nenhum segredo configurado, ninguem entra.
  if (!WA_ENGINE_TOKEN && !CRON_SECRET) return json({ ok: false, error: "nenhum segredo configurado" }, 500);
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const cron = (req.headers.get("x-cron-secret") ?? "").trim();
  const autorizado =
    (!!WA_ENGINE_TOKEN && token === WA_ENGINE_TOKEN) ||
    (!!SERVICE_KEY && token === SERVICE_KEY) ||
    (!!CRON_SECRET && cron === CRON_SECRET);
  if (!autorizado) return json({ ok: false, error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid json" }, 400); }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // O wa-engine precisa saber quais grupos escutar, mas fala com o banco pela
  // chave publishable e o RLS de clone_sources so deixa o dono ler. Em vez de
  // colocar a service role dentro do container, ele pergunta a lista por aqui.
  // Devolve so os JIDs — nenhum dado de usuario atravessa.
  // v9 — devolve tambem `donos`: os sufixos de 8 digitos dos telefones que sao
  // donos de alguma fonte ativa. Ate a v8 o engine registrava o listener de clone
  // em TODO socket do container, inclusive na conexao admin da plataforma, que
  // nao e dona de fonte nenhuma. Os dois listeners disputavam a mesma mensagem e
  // o CLONE_VISTAS (Set compartilhado pelo processo) deixava passar so quem
  // chegasse primeiro: quando a admin ganhava a corrida, a captura morria aqui em
  // 'outro_dono' E o dono de verdade ficava bloqueado pelo dedupe. Nao era
  // poluicao de painel, era captura perdida — MEDIDO em 30/07, 1 das 11 linhas
  // do clone_ingest_log.
  //
  // Sufixo de 8 digitos, nunca o numero inteiro: e a mesma chave que a checagem
  // de dono usa la embaixo. E nao e informacao nova pro container — todo telefone
  // em whatsapp_instances e, por definicao, uma sessao que o proprio engine
  // segura. Aqui nao atravessa nenhum id de usuario.
  if (body?.action === "jids") {
    const { data, error } = await sb.from("clone_sources").select("source_jid, user_id").eq("active", true);
    if (error) return json({ ok: false, error: error.message }, 500);
    const jids = [...new Set((data ?? []).map((r) => String(r.source_jid ?? "").trim().toLowerCase()).filter(Boolean))];
    const userIds = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))];
    let donos: string[] = [];
    if (userIds.length) {
      const { data: fones, error: eFones } = await sb
        .from("whatsapp_instances").select("phone").in("user_id", userIds);
      // Fail-open de proposito: sem a lista, o engine mantem o comportamento
      // antigo (escuta com todas as sessoes) e a checagem de dono aqui continua
      // sendo a ultima palavra. Capturar demais e recusar e menos grave que
      // parar de capturar por causa de uma leitura que falhou.
      if (eFones) console.warn(`[clone-ingest/jids] donos nao carregados: ${eFones.message}`);
      else donos = [...new Set((fones ?? []).map((r) => sufixoFone(r.phone)).filter(Boolean))];
    }
    return json({ ok: true, jids, donos });
  }

  // ── action: reparse ───────────────────────────────────────────────
  // Reaplica o fallback de texto nas capturas que morreram em 'failed' por falta
  // de dado da loja. Existe porque a captura nao volta: a mensagem no grupo-fonte
  // ja passou, e o source_text guardado e a unica copia. Sempre que o parser
  // melhorar, isto recupera o que ficou para tras. Nao toca em linha aprovada,
  // rejeitada ou pendente — so em 'failed'.
  if (body?.action === "reparse") {
    const dry = body?.dryRun === true;
    const limite = Math.min(Number(body?.limit ?? 50), 200);
    const q = sb.from("clone_posts")
      .select("id, source_text, title, price, clean_url, store, data_source")
      .eq("status", "failed")
      .not("source_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(limite);
    if (body?.id) q.eq("id", String(body.id));
    const { data: linhas, error: eSel } = await q;
    if (eSel) return json({ ok: false, error: eSel.message }, 500);

    const out: any[] = [];
    for (const l of linhas ?? []) {
      const lido = lerOfertaDoTexto(String(l.source_text ?? ""));
      // Sem titulo E preco nao ha post publicavel: a fila so tem Aprovar e
      // Descartar, nao tem onde digitar o que falta. Continua 'failed', visivel.
      if (!lido.title || lido.price == null) {
        out.push({ id: l.id, status: "sem_dado_no_texto", title: lido.title, price: lido.price, campos: lido.campos });
        continue;
      }
      const patch = {
        status: "pending",
        title: lido.title,
        price: lido.price,
        price_original: lido.price_original,
        discount_pct: lido.discount_pct,
        coupon_code: lido.coupon_code,
        price_installment: lido.price_installment,
        data_source: "message",
        error: null,
      };
      if (dry) {
        // `patch.status` e o estado FUTURO da linha no banco ('pending'); o
        // `status` daqui e o ROTULO do que aconteceu nesta rodada. Espalhar o
        // patch inteiro por cima do rotulo trocava um pelo outro e zerava o
        // contador la embaixo. Tira o status do patch e mantem o resto.
        const { status: _estadoFuturo, ...campos } = patch;
        out.push({ id: l.id, status: "recuperaria", gravaria_status: patch.status, ...campos });
        continue;
      }
      const { error: eUpd } = await sb.from("clone_posts").update(patch).eq("id", l.id);
      out.push(eUpd
        ? { id: l.id, status: "erro", motivo: eUpd.message }
        : { id: l.id, status: "recuperado", title: lido.title, price: lido.price, discount_pct: lido.discount_pct, coupon_code: lido.coupon_code });
    }
    const recuperados = out.filter((r) => r.status === "recuperado" || r.status === "recuperaria").length;
    console.log(`[clone-ingest/reparse] avaliadas=${out.length} recuperados=${recuperados} dryRun=${dry}`);
    return json({ ok: true, dryRun: dry, avaliadas: out.length, recuperados, resultados: out });
  }

  const dryRun = body?.dryRun === true;
  const entradas: any[] = Array.isArray(body?.messages) ? body.messages.slice(0, MAX_MSGS_POR_LOTE) : [];
  if (!entradas.length) return json({ ok: true, recebidas: 0, resultados: [], nota: "lote vazio" });

  const agora = new Date();
  const hoje = hojeSP();
  const resultados: any[] = [];

  // Caches por lote: um grupo-fonte movimentado manda varias mensagens de uma vez
  // e nao faz sentido reler o mesmo plano e as mesmas credenciais toda hora.
  const cachePlano = new Map<string, { permitido: boolean; motivo: string }>();
  const cacheCred = new Map<string, Record<string, Record<string, string>>>();
  const cacheMl = new Map<string, { token: string; token2: string; cookie: string }>();
  const cacheFones = new Map<string, string[]>();

  async function planoPermite(userId: string) {
    if (cachePlano.has(userId)) return cachePlano.get(userId)!;
    let veredito = { permitido: false, motivo: "perfil nao encontrado" };
    const { data: perfil } = await sb
      .from("profiles").select("plan, is_vip, is_admin").eq("id", userId).maybeSingle();
    if (perfil) {
      if (perfil.is_admin || perfil.is_vip) {
        veredito = { permitido: true, motivo: perfil.is_admin ? "admin" : "vip" };
      } else {
        const plano = String(perfil.plan ?? "starter").toLowerCase();
        const { data: feat } = await sb
          .from("plan_features").select("clone_auto").eq("plan", plano).maybeSingle();
        // A tabela sobrescreve o piso apenas quando de fato trouxe a coluna.
        const liberado = (feat && feat.clone_auto !== null && feat.clone_auto !== undefined)
          ? !!feat.clone_auto
          : !!CLONE_AUTO_FALLBACK[plano];
        veredito = liberado
          ? { permitido: true, motivo: plano }
          : { permitido: false, motivo: `captura automatica e Elite pra cima (plano atual: ${plano})` };
      }
    }
    cachePlano.set(userId, veredito);
    return veredito;
  }

  async function credenciaisDe(userId: string) {
    if (cacheCred.has(userId)) return cacheCred.get(userId)!;
    const { data } = await sb
      .from("affiliate_credentials").select("store, credentials").eq("user_id", userId);
    const porLoja: Record<string, Record<string, string>> = {};
    for (const row of data ?? []) {
      const loja = String(row.store ?? "");
      if (!loja) continue;
      // Duas linhas da mesma loja convivem no banco; a primeira preenchida vence.
      porLoja[loja] = { ...(row.credentials ?? {}), ...(porLoja[loja] ?? {}) };
    }
    cacheCred.set(userId, porLoja);
    return porLoja;
  }

  // Numeros de WhatsApp que pertencem a um usuario. E a fonte da verdade do
  // isolamento entre contas: quem prova quem capturou nao e o payload do engine,
  // e o cadastro no banco.
  async function fonesDoDono(userId: string) {
    if (cacheFones.has(userId)) return cacheFones.get(userId)!;
    const { data } = await sb
      .from("whatsapp_instances").select("phone").eq("user_id", userId);
    const sufs = (data ?? []).map((r) => sufixoFone(r.phone)).filter(Boolean);
    cacheFones.set(userId, sufs);
    return sufs;
  }

  // ── Auto-publicacao (v11) ───────────────────────────────────────
  // Espelho server-side do cloneCriarProduto() do index.html. O original roda
  // no NAVEGADOR e por isso nao serve para captura automatica — nao ha ninguem
  // logado no circuito.
  // De proposito NAO encurta o link aqui: a send-post ja encurta todo
  // product.affiliate_url no momento do disparo e o ehLinkCurtoProprio protege
  // contra encurtar duas vezes. Duplicar isso criaria mais um espelho para
  // divergir, e espelho divergente ja custou investigacao neste projeto.
  async function publicarClone(clone: any, fonte: any) {
    try {
      const { data: last } = await sb.from("products")
        .select("position").eq("niche_group_id", fonte.niche_group_id)
        .order("position", { ascending: false }).limit(1).maybeSingle();
      const { data: prod, error } = await sb.from("products").insert({
        niche_group_id: fonte.niche_group_id,
        source: clone.store || "manual",
        position: Number(last?.position ?? 0) + 1,
        title: clone.title,
        affiliate_url: clone.affiliate_url,
        original_url: clone.clean_url,
        image_url: clone.image_url || "",
        price: clone.price,
        price_original: clone.price_original,
        discount_pct: clone.discount_pct,
        coupon_code: clone.coupon_code ?? null,
        price_installment: clone.price_installment ?? null,
        user_id: fonte.user_id,
      }).select("id").maybeSingle();
      if (error) return { ok: false, motivo: error.message };
      return { ok: true, productId: prod?.id ?? null };
    } catch (e) {
      return { ok: false, motivo: (e as Error).message };
    }
  }

  async function credenciaisMlDe(userId: string) {
    if (cacheMl.has(userId)) return cacheMl.get(userId)!;
    const { data } = await sb
      .from("profiles")
      .select("scrape_do_token, scrape_do_token_2, ml_session_cookie")
      .eq("id", userId).maybeSingle();
    const cred = {
      token: String(data?.scrape_do_token ?? "").trim(),
      token2: String(data?.scrape_do_token_2 ?? "").trim(),
      cookie: String(data?.ml_session_cookie ?? "").trim(),
    };
    cacheMl.set(userId, cred);
    return cred;
  }

  for (const msg of entradas) {
    const jid = normalizarJid(msg?.jid);
    const msgId = String(msg?.msgId ?? "").trim();
    const texto = String(msg?.text ?? "").trim();
    const sessionPhone = sufixoFone(msg?.sessionPhone);
    // session_phone entra no rotulo (e nao so na checagem de dono) porque o log
    // precisa dele nas recusas que acontecem ANTES de achar a fonte.
    const rotulo = { jid, msgId, session_phone: sessionPhone };

    if (!jid || !texto) { resultados.push({ ...rotulo, status: "ignorado", motivo: "mensagem sem jid ou sem texto" }); continue; }

    // Reentrega apos reconnect nao vira oferta nova.
    const ts = Number(msg?.ts ?? 0);
    if (ts > 0) {
      const idadeMin = (agora.getTime() - ts * 1000) / 60000;
      if (idadeMin > MAX_MSG_AGE_MIN) {
        resultados.push({ ...rotulo, status: "antiga", motivo: `mensagem de ${Math.round(idadeMin)} min atras` });
        continue;
      }
    }

    const { data: fontes, error: eFontes } = await sb
      .from("clone_sources").select("*").eq("source_jid", jid).eq("active", true);
    if (eFontes) { resultados.push({ ...rotulo, status: "erro", motivo: eFontes.message }); continue; }
    if (!fontes?.length) { resultados.push({ ...rotulo, status: "sem_fonte", motivo: "nenhuma fonte ativa para esse grupo" }); continue; }

    for (const fonte of fontes) {
      const marca: Record<string, unknown> = { ...rotulo, source_id: fonte.id, user_id: fonte.user_id, niche_group_id: fonte.niche_group_id };

      // ── Isolamento entre contas ─────────────────────────────
      // A fonte e procurada SO pelo JID, e JID igual entre contas diferentes e o
      // caso normal: duas clientes podem estar no mesmo grupo de ofertas. Sem a
      // checagem abaixo, a captura feita pela sessao de uma alimentaria a fila da
      // outra — o link de afiliado sairia com a comissao de quem nem viu a oferta.
      // Quem prova de quem e a captura nao e o payload do engine: e o cadastro em
      // whatsapp_instances.
      if (!sessionPhone) {
        resultados.push({ ...marca, status: "sem_sessao", motivo: "captura sem numero de sessao — nao da pra provar de quem e" });
        continue;
      }
      const donos = await fonesDoDono(fonte.user_id);
      if (!donos.includes(sessionPhone)) {
        resultados.push({ ...marca, status: "outro_dono", motivo: "a sessao que capturou nao pertence ao dono da fonte" });
        continue;
      }

      // Dono com mais de um numero pode prender a fonte a um deles.
      if (fonte.session_phone && sufixoFone(fonte.session_phone) !== sessionPhone) {
        resultados.push({ ...marca, status: "outra_sessao", motivo: "fonte presa a outro numero do mesmo dono" });
        continue;
      }

      // Filtros de texto ANTES de gastar credito.
      const bloqueadas: string[] = fonte.blocked_keywords ?? [];
      if (bloqueadas.length && contemAlguma(texto, bloqueadas)) {
        resultados.push({ ...marca, status: "filtro", motivo: "palavra bloqueada" });
        continue;
      }
      const exigidas: string[] = fonte.keywords ?? [];
      if (exigidas.length && !contemAlguma(texto, exigidas)) {
        resultados.push({ ...marca, status: "filtro", motivo: "nenhuma palavra-chave da fonte" });
        continue;
      }

      const plano = await planoPermite(fonte.user_id);
      if (!plano.permitido) { resultados.push({ ...marca, status: "plano", motivo: plano.motivo }); continue; }

      // Teto diario. O contador zera sozinho quando vira o dia em Sao Paulo.
      const usadosHoje = fonte.captured_day === hoje ? Number(fonte.captured_today ?? 0) : 0;
      if (usadosHoje >= Number(fonte.max_per_day ?? 10)) {
        resultados.push({ ...marca, status: "teto", motivo: `teto diario da fonte atingido (${usadosHoje}/${fonte.max_per_day})` });
        continue;
      }

      // Dedupe exato: a mesma mensagem nunca vira dois clones.
      if (msgId) {
        const { data: jaVisto } = await sb
          .from("clone_posts").select("id").eq("source_msg_id", msgId).limit(1);
        if (jaVisto?.length) { resultados.push({ ...marca, status: "duplicado", motivo: "mensagem ja processada" }); continue; }
      }

      // ── v17 · P36 · pre-filtro por dominio do link cru ────────────────
      // Vem ANTES da resolve-link: e o unico ponto do fluxo onde da pra
      // economizar a propria resolve-link. O filtro da v16 continua logo abaixo
      // e continua sendo o que decide de verdade — este aqui so adianta os
      // casos obvios. Ver o comentario de DOMINIOS_LOJA.
      // Array vazio = todas as lojas, entao fonte sem filtro nao muda de
      // comportamento em nada.
      const permitidas: string[] = Array.isArray(fonte.lojas_permitidas)
        ? fonte.lojas_permitidas.map((s: unknown) => String(s ?? "").trim()).filter(Boolean)
        : [];

      if (permitidas.length) {
        const crus = linksDoTexto(texto);
        const lojasCruas = crus.map((u) => lojaDoDominio(partesDoLink(u).host));
        const todosConhecidos = lojasCruas.length > 0 && lojasCruas.every((l) => l !== null);
        const nenhumPermitido = lojasCruas.every((l) => l !== null && !permitidas.includes(l));
        if (todosConhecidos && nenhumPermitido) {
          const loja = String(lojasCruas[0]);
          const alvo = partesDoLink(crus[0]);
          const nomes = permitidas.map((x) => STORE_LABEL[x] || x).join(", ");
          resultados.push({
            ...marca, status: "loja_filtrada", store: loja,
            link_host: alvo.host, link_path: alvo.path,
            motivo: `[pre-filtro] ${STORE_LABEL[loja] || loja} reconhecida pelo dominio cru ${alvo.host} e nao esta nas lojas escolhidas para esta fonte (${nomes}) — a resolve-link nao chegou a ser chamada`,
          });
          continue;
        }
      }

      const resolve = await chamarFuncao("resolve-link", { text: texto });
      if (!resolve?.ok) {
        // v15/P20: a resolve-link devolve `original` e, quando chegou a abrir o
        // link, `resolved` e `store` — inclusive no erro. Preferir o resolvido:
        // encurtador nao diz nada sobre a loja, e "amzlink.to" repetido 40 vezes
        // no log e o mesmo que nao ter log.
        const alvo = partesDoLink(resolve?.resolved || resolve?.original);
        resultados.push({
          ...marca, status: "resolve_falhou", etapa: resolve?.stage ?? "?",
          store: resolve?.store ?? null, link_host: alvo.host, link_path: alvo.path,
          motivo: resolve?.error ?? "resolve-link nao explicou",
        });
        continue;
      }

      const store: string = String(resolve.store ?? "outras");
      const cleanUrl: string = String(resolve.url ?? "");

      // v15/P20: daqui para baixo TODO veredito desta mensagem — recusa ou
      // captura — carrega o link e a loja. Mutar `marca` em vez de repetir os
      // campos em cada push e de proposito: sao oito pontos de saida, e o que
      // falha em lista longa e sempre o item que alguem esqueceu de acrescentar.
      const doLink = partesDoLink(cleanUrl);
      Object.assign(marca, { store, link_host: doLink.host, link_path: doLink.path });

      // ── v16 · P31 · filtro de loja por fonte ─────────────────────────
      // Vem DEPOIS da resolve-link porque so ela sabe qual e a loja: o grupo
      // posta encurtador (meli.la, amzlink.to, s.shopee.com.br) e o dominio cru
      // nao responde a pergunta. Um filtro anterior, por dominio do link cru,
      // economizaria ate a resolve-link — mas nao cobre encurtador generico, e
      // recusar por engano uma loja permitida e pior que gastar a resolve.
      // Vem ANTES da product-search de proposito: e la que o Scrape.do custa.
      // Vem antes tambem do dedupe, que e uma consulta ao banco — nao ha por que
      // perguntar se um link repetido ja foi clonado quando ele nem seria.
      // Array vazio = todas as lojas. Ver o comentario do cabecalho.
      // v17: `permitidas` ja foi calculada acima, no pre-filtro. Uma leitura so
      // do campo, dois pontos de uso — declarar de novo aqui seria erro de
      // compilacao, e recalcular seria convite a divergir.
      if (permitidas.length && !permitidas.includes(store)) {
        const nomes = permitidas.map((x) => STORE_LABEL[x] || x).join(", ");
        resultados.push({
          ...marca, status: "loja_filtrada",
          motivo: `[pos-filtro] ${STORE_LABEL[store] || store} nao esta nas lojas escolhidas para esta fonte (${nomes})`,
        });
        continue;
      }

      // Dedupe por link com janela: o mesmo produto reaparece em grupo de oferta
      // o tempo todo e nao pode entupir o Grupo de Oferta de repetido.
      const desde = new Date(agora.getTime() - DEDUPE_DAYS * 86400000).toISOString();
      const { data: repetido } = await sb
        .from("clone_posts").select("id, created_at")
        .eq("niche_group_id", fonte.niche_group_id)
        .eq("clean_url", cleanUrl)
        .gte("created_at", desde)
        .limit(1);
      if (repetido?.length) {
        resultados.push({ ...marca, status: "duplicado", motivo: `mesmo link ja clonado nesse grupo nos ultimos ${DEDUPE_DAYS} dias` });
        continue;
      }

      const credPorLoja = await credenciaisDe(fonte.user_id);
      const credLoja = credPorLoja[STORE_ENUM[store] ?? store] ?? {};

      // ML com credencial pessoal do dono vai direto ao /ml-product; Amazon vai
      // pelo leitor de pagina (v15/P21); o resto (e o ML sem credencial pessoal)
      // segue pela product-search.
      let busca: any = null;
      if (store === "mercadolivre") {
        const pessoal = await credenciaisMlDe(fonte.user_id);
        if (pessoal.token || pessoal.cookie) busca = await buscarMlDireto(cleanUrl, pessoal);
      } else if (store === "amazon") {
        // Sem "se falhar tenta a product-search": ela nao tem ramo de Amazon,
        // entao acrescentaria 30 s de espera antes do mesmo "nao". Falha aqui cai
        // no fallback de texto com data_source='message', como caia antes.
        busca = await consultarAmazonDireto(cleanUrl);
      }
      if (!busca) {
        busca = await chamarFuncao("product-search", {
          url: cleanUrl,
          credentials: montarCredenciaisBusca(credPorLoja),
        });
      }

      let titulo = String(busca?.name ?? busca?.title ?? "").slice(0, 120);
      let preco = parseFloat(String(busca?.price_to ?? busca?.price ?? "").replace(",", ".")) || null;
      let precoDe = parseFloat(String(busca?.price_from ?? "").replace(",", ".")) || null;
      let imagem = String(busca?.image ?? busca?.thumbnail ?? "");
      let desconto: number | null = busca?.discount_pct ?? null;
      if (!desconto && precoDe && preco && preco < precoDe) desconto = Math.round((1 - preco / precoDe) * 100);

      let cupom: string | null = null;
      let parcelamento: string | null = null;
      let dataSource = "store";
      const erroLoja = busca?.error ?? "sem detalhe";
      const lojaFalhou = !busca?.success || !titulo;

      // ── Fallback: a oferta esta no texto que o grupo-fonte postou ───
      // A Amazon nao tem enriquecimento automatico e devolve "Loja sem integracao
      // automatica" — mas a mensagem capturada traz titulo, de/por e cupom
      // escritos. Jogar a captura fora por falta de um dado que estava na mao e
      // desperdicio: o link ja foi resolvido e o afiliado alheio ja foi trocado.
      // O que vem daqui NAO foi conferido na loja: e copia do que um terceiro
      // digitou. Por isso data_source='message' e a tela avisa o dono.
      if (lojaFalhou) {
        const lido = lerOfertaDoTexto(texto);
        if (lido.title && lido.price != null) {
          titulo = lido.title;
          preco = lido.price;
          precoDe = lido.price_original;
          desconto = lido.discount_pct;
          cupom = lido.coupon_code;
          parcelamento = lido.price_installment;
          dataSource = "message";
        }
      }

      // ── v13/v14 · a foto e requisito, nao enfeite ───────────────────────
      // Decisao do dono, 31/07: "oferta sem foto e descartavel, nao e o objetivo
      // do projeto". Um post de grupo de oferta sem imagem nao para o dedo de
      // ninguem — publicar assim gasta a atencao do grupo sem retorno.
      // Ordem importa: so paga o Microlink quando a loja nao deu foto, e so
      // recusa depois de ter tentado. Recusar antes de tentar perderia oferta
      // boa por falha tecnica da loja, que e justamente o que esta acontecendo.
      if (!imagem) imagem = await buscarFotoOg(cleanUrl);
      if (!imagem) {
        resultados.push({
          ...marca, status: "sem_imagem", store,
          title: titulo || null,
          motivo: "sem foto do produto (a loja nao respondeu e o og:image tambem nao veio) — oferta sem imagem nao vai pro grupo",
        });
        continue;
      }

      // Sem titulo ou sem preco nao ha post publicavel: a fila so tem Aprovar e
      // Descartar, nao tem campo pra digitar o que falta. Registrar como 'failed'
      // com o motivo e melhor que sumir — e o reparse recupera depois.
      const semDados = !titulo || preco == null;

      if (fonte.min_discount != null && !semDados) {
        if (!desconto || desconto < Number(fonte.min_discount)) {
          resultados.push({ ...marca, status: "filtro", motivo: `desconto ${desconto ?? 0}% abaixo do minimo ${fonte.min_discount}%` });
          continue;
        }
      }

      const linkAfiliado = montarLinkAfiliado(cleanUrl, store, credLoja);
      const semCredencial = linkAfiliado === cleanUrl;

      if (dryRun) {
        resultados.push({
          ...marca, status: semDados ? "salvaria_failed" : "salvaria", store,
          title: titulo || null, price: preco, price_original: precoDe, discount_pct: desconto,
          coupon_code: cupom, price_installment: parcelamento, data_source: dataSource,
          image_url: imagem, affiliate_url: linkAfiliado, sem_credencial: semCredencial,
          motivo: semDados
            ? `${erroLoja} — e o texto da mensagem nao trazia titulo e preco`
            : (dataSource === "message" ? `lido do texto da mensagem (a loja respondeu: ${erroLoja})` : "ok"),
        });
        continue;
      }

      const linha = {
        user_id: fonte.user_id,
        niche_group_id: fonte.niche_group_id,
        // SEMPRE pending na Fase 2, mesmo com clone_auto_approve ligado no grupo.
        status: semDados ? "failed" : "pending",
        origin: "auto",
        clone_source_id: fonte.id,
        source_jid: jid,
        source_msg_id: msgId || null,
        source_text: texto.slice(0, 2000),
        source_url: resolve.original ?? null,
        resolved_url: resolve.resolved ?? null,
        clean_url: cleanUrl,
        affiliate_url: linkAfiliado,
        store: STORE_ENUM[store] ?? "manual",
        store_label: resolve.store_label || STORE_LABEL[store] || null,
        stripped_params: resolve.stripped ?? [],
        title: titulo || null,
        price: preco,
        price_original: precoDe,
        discount_pct: desconto,
        coupon_code: cupom,
        price_installment: parcelamento,
        data_source: dataSource,
        image_url: imagem || null,
        error: semDados
          ? `a loja nao devolveu os dados do produto (${erroLoja}) e o texto da mensagem nao trazia titulo e preco`
          : (semCredencial ? "sem credencial dessa loja — o link sairia sem a sua comissao" : null),
        resolved_at: agora.toISOString(),
      };

      const { data: ins, error: eIns } = await sb
        .from("clone_posts").insert(linha).select("id").maybeSingle();

      if (eIns) {
        // O indice unico de source_msg_id e a ultima linha de defesa contra
        // duas entregas simultaneas da mesma mensagem.
        const dup = /duplicate key|unique/i.test(eIns.message);
        resultados.push({ ...marca, status: dup ? "duplicado" : "erro", motivo: eIns.message });
        continue;
      }

      await sb.from("clone_sources").update({
        captured_day: hoje,
        captured_today: usadosHoje + 1,
        last_capture_at: agora.toISOString(),
      }).eq("id", fonte.id);

      // ── Auto-publicacao (v11) ─────────────────────────────────
      // Tres condicoes, todas obrigatorias: a fonte pede, os dados estao
      // completos, e vieram DA LOJA. Faltando qualquer uma, cai na fila como
      // sempre foi.
      if (fonte.auto_publish && !semDados && dataSource === "store" && ins?.id) {
        const pub = await publicarClone(linha, fonte);
        if (pub.ok) {
          await sb.from("clone_posts").update({
            status: "approved",
            product_id: pub.productId,
            approved_at: agora.toISOString(),
            error: null,
          }).eq("id", ins.id);
          resultados.push({
            ...marca, status: "publicado", clone_id: ins.id, product_id: pub.productId,
            store, title: titulo || null, data_source: dataSource,
            motivo: "auto-publicado no rodizio do grupo — sai no proximo disparo do send-post",
          });
          continue;
        }
        // Falhou virar produto: a captura NAO some, fica na fila com o motivo.
        await sb.from("clone_posts").update({
          error: `auto-publicacao falhou: ${pub.motivo}`,
        }).eq("id", ins.id);
        resultados.push({
          ...marca, status: "salvo", clone_id: ins.id, store, title: titulo || null,
          data_source: dataSource,
          motivo: `auto-publicacao falhou (${pub.motivo}) — ficou na fila para revisao`,
        });
        continue;
      }

      resultados.push({
        ...marca, status: semDados ? "salvo_incompleto" : "salvo",
        clone_id: ins?.id ?? null, store, title: titulo || null,
        data_source: dataSource,
        motivo: semDados
          ? `${erroLoja} — e o texto da mensagem nao trazia titulo e preco`
          : (dataSource === "message"
              ? (fonte.auto_publish
                  ? "aguardando revisao — auto-publicacao nao vale para dados lidos do texto da mensagem"
                  : "aguardando revisao — dados lidos do texto da mensagem")
              : "aguardando revisao"),
      });
    }
  }

  const salvos = resultados.filter((r) => r.status === "salvo" || r.status === "salvo_incompleto" || r.status === "publicado").length;
  const publicados = resultados.filter((r) => r.status === "publicado").length;
  const doTexto = resultados.filter((r) => r.data_source === "message").length;
  const semFoto = resultados.filter((r) => r.status === "sem_imagem").length;

  // ── v7 · registro das tentativas ──────────────────────────────────
  // Uma linha por veredito, inclusive (e principalmente) os de recusa: sao eles
  // que respondem "por que nao veio nada hoje". dryRun nao grava — ensaio nao e
  // historico.
  if (!dryRun && resultados.length) {
    const linhas = resultados.map((r) => ({
      source_jid: r.jid || null,
      clone_source_id: r.source_id ?? null,
      user_id: r.user_id ?? null,
      session_phone: r.session_phone || null,
      msg_id: r.msgId || null,
      status: r.status,
      motivo: typeof r.motivo === "string" ? r.motivo.slice(0, 500) : null,
      store: r.store ?? null,
      link_host: r.link_host ?? null,
      link_path: r.link_path ?? null,
      clone_post_id: r.clone_id ?? null,
    }));
    const { error: eLog } = await sb.from("clone_ingest_log").insert(linhas);
    // Fail-open de proposito: perder a explicacao e ruim, perder a captura e pior.
    if (eLog) console.warn(`[clone-ingest] log nao gravado: ${eLog.message}`);
  }

  console.log(`[clone-ingest] recebidas=${entradas.length} salvos=${salvos} publicados=${publicados} lidos_do_texto=${doTexto} sem_foto=${semFoto} dryRun=${dryRun}`);
  return json({ ok: true, dryRun, recebidas: entradas.length, salvos, publicados, sem_foto: semFoto, resultados });
});
