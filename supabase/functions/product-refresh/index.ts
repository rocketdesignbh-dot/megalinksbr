// Mega Links BR · Edge Function "product-refresh" v14
// v14: DETECCAO DE PRODUTO FORA DO AR NA AMAZON. Ate a v13 o detector so cobria
//      Mercado Livre, e produto de qualquer outra loja era pulado com
//      "ainda sem verificador" -- ponto cego que ja aparecia para o cliente,
//      porque monitoramento e argumento de venda do Pro pra cima. A captura
//      automatica de 30/07 trouxe 4 produtos Amazon de uma vez e tornou isso
//      concreto.
//
//      MEDIDO em 30/07/2026, nos dois sentidos, como foi feito com o ML:
//        estado      | HTTP | id="productTitle" | add-to-cart | id="outOfStock"
//        ------------|------|-------------------|-------------|----------------
//        vivo (x5)   | 200  | sim               | SIM         | nao
//        esgotado    | 200  | sim               | NAO         | SIM   (Echo Dot 3a, 3 rodadas)
//        removido    | 404  | nao               | nao         | nao
//        captcha     | 200  | NAO               | nao         | nao   (2 de 4 requisicoes)
//
//      Duas hipoteses cairam no teste, as duas do mesmo jeito que a do ML caiu:
//        * casar frase NAO funciona: a pagina VIVA da Lavadora Karcher traz
//          "Em estoque" E "Indisponivel no momento" no mesmo HTML.
//        * outOfStockBuyBox NAO serve: aparece em pagina de produto disponivel.
//
//      A Amazon responde direto, sem proxy: a consulta NAO gasta credito de
//      Scrape.do nem ocupa o pool compartilhado. O preco disso e o captcha em
//      ~metade das rodadas, e por isso "desconhecido" e estado de primeira
//      classe: nao conta strike, nao zera contador, nao expira nada.
//
//      NAO le preco da Amazon de proposito. A pagina tem varias ocorrencias de
//      a-price-whole (variacoes, produtos relacionados) e nao ha como provar qual
//      e a do buybox sem medir. Preco errado publicado no grupo da cliente nao se
//      desfaz -- entao esta rodada confere disponibilidade e deixa o preco como
//      estava. Pendencia separada, para ser medida em vez de chutada.
//
// v13: o aviso de produto fora do ar passa a sair da CONEXAO ADMIN
//      (revops_admin_whatsapp, +55 31 7354-5214) para o numero da usuaria.
//      A v11/v12 mandava da sessao dela para ela mesma: isso cai na conversa
//      "consigo mesma" do WhatsApp, nao parece vir da plataforma, e o engine
//      respondia 200 sem provar entrega. O aviso do Yara Lattafa sumiu assim.
//      Agora a resposta guarda o messageId; sem ele, nao contamos como enviado.
// v12: monitoramento passa a ser feature de plano (Pro pra cima). Starter posta ML
//      desde 30/07, mas nao tem verificacao -- e assim o custo de Scrape.do fica
//      com quem paga por ele.
//
// v11 — DETECCAO DE PRODUTO FORA DO AR. Ate a v10 esta funcao so verificava preco e
//       nunca marcava expired, porque o /ml-product devolvia ok:false tanto para
//       antibot quanto para produto morto e nao dava para distinguir. Isso deixava um
//       ponto cego: o campo expired era lido pela send-post e pelo frontend, mas
//       ninguem nunca o escrevia -- produto fora do ar seguia sendo postado para
//       sempre. Foi assim com o "Perfume Arabe Yara Lattafa" da Patricia.
//
//       O /ml-product v2 agora devolve `availability` a partir do JSON-LD da pagina:
//         MEDIDO 29/07/2026, mesma origem (Scrape.do super=true), nos dois sentidos:
//           anuncio morto -> "availability":".../OutOfStock", "price":0
//           anuncio vivo  -> "availability":".../InStock",    "price":150.82
//         Nos dois casos o <h1 ui-pdp-title> existe -- por isso a checagem por titulo,
//         que era a unica, dava o anuncio morto como saudavel.
//
//       REGRA DE SEGURANCA: sao precisas DUAS rodadas consecutivas de "indisponivel"
//       para marcar expired. Uma leitura isolada nunca expira nada. A v7 marcou o
//       catalogo inteiro de uma vez por confiar em sinal fraco; a diferenca aqui e que
//       o sinal e um par chave/valor do schema.org, nao uma frase traduzida -- a pagina
//       do ML embute um dicionario i18n com "Esta pagina nao esta disponivel", e casar
//       texto solto nesse HTML acusa produto bom como morto.
//
// v10 — orcamento de tempo (DEADLINE de relogio por rodada).
// v9  — verifica preco pelo wa-engine em vez de chamar a scrape.do direto.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPA_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPA_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const WA_ENGINE_URL = Deno.env.get('WA_ENGINE_URL') || 'https://megalinksbr-wa-engine.fwezsn.easypanel.host';
const WA_ENGINE_TOKEN = Deno.env.get('WA_ENGINE_TOKEN') ?? '';

const BATCH = 12;                 // candidatos carregados por rodada
const MAX_POOL_POR_RODADA = 5;    // teto de chamadas que caem no token da plataforma
const TOLERANCIA_PRECO = 0.05;    // 5%
const DEADLINE_MS = 70000;        // orcamento de relogio da rodada
const TIMEOUT_CONSULTA_MS = 15000;
const STRIKES_PARA_EXPIRAR = 2;   // rodadas consecutivas de "indisponivel"

// Monitoramento de estoque e feature paga (stock_monitor no PLAN_FALLBACK do painel).
// Starter posta Mercado Livre desde 30/07, mas nao tem o produto conferido -- e isso
// tambem protege o pool de creditos do Scrape.do, que e o custo real desta rodada.
const PLANOS_COM_MONITORAMENTO = new Set(['pro', 'elite', 'premium', 'infinity']);

// Lojas que tem verificador. Produto de loja fora desta lista e pulado com motivo,
// nunca marcado como fora do ar -- nao saber nao e prova.
const LOJAS_COM_VERIFICADOR = new Set(['mercado_livre', 'amazon']);

// Preposicao junto do nome de proposito: "no Mercado Livre" / "na Amazon".
// Montar isso na frase daria "no Amazon".
const ONDE_LOJA: Record<string, string> = {
  mercado_livre: 'no Mercado Livre',
  amazon: 'na Amazon',
};

// UA de navegador real. A Amazon devolve captcha para cliente sem UA plausivel,
// e captcha aqui vem com status 200 -- por isso ele nunca e a prova de nada.
const AMZ_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

// Short link nosso: a URL original se perdeu, entao nao da para reconsultar.
function ehLinkCurtoProprio(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') === 'megalinksbr.com.br' && u.pathname.startsWith('/r/');
  } catch { return false; }
}

async function fetchComTimeout(url: string, ms = TIMEOUT_CONSULTA_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { headers: { Authorization: `Bearer ${WA_ENGINE_TOKEN}` }, signal: ctrl.signal });
  } finally { clearTimeout(t); }
}

type Consulta =
  | { estado: 'ok'; preco: number | null; usouPool: boolean; disponibilidade: string; sinal: string }
  | { estado: 'indisponivel'; sinal: string }
  | { estado: 'desconhecido'; motivo: string };

async function consultarML(url: string, cred: { token: string; token2: string; cookie: string }): Promise<Consulta> {
  const qs = new URLSearchParams({ url });
  if (cred.token) qs.set('userScrapeToken', cred.token);
  if (cred.token2) qs.set('userScrapeToken2', cred.token2);
  if (cred.cookie) qs.set('userMlCookie', cred.cookie);
  try {
    const r = await fetchComTimeout(`${WA_ENGINE_URL}/ml-product?${qs.toString()}`);
    const d = await r.json().catch(() => null);

    // O engine reporta indisponibilidade tanto no caminho de sucesso quanto no de
    // erro (404/410 no destino). Por isso este teste vem ANTES do teste de ok.
    if (d?.availability === 'indisponivel') {
      return { estado: 'indisponivel', sinal: String(d?.availabilitySignal ?? 'sem_sinal').slice(0, 60) };
    }

    if (!r.ok || !d?.ok) {
      return { estado: 'desconhecido', motivo: String(d?.error ?? `HTTP ${r.status}`).slice(0, 90) };
    }
    const preco = d.price_to ? Number(String(d.price_to).replace(',', '.')) : null;
    // usingPersonalToken vem do wa-engine: false = consumiu o pool da plataforma.
    const usouPool = d.usingPersonalToken !== true && !cred.cookie;
    return {
      estado: 'ok',
      preco: Number.isFinite(preco as number) ? (preco as number) : null,
      usouPool,
      disponibilidade: String(d?.availability ?? 'desconhecido'),
      sinal: String(d?.availabilitySignal ?? '').slice(0, 60),
    };
  } catch (e) {
    return { estado: 'desconhecido', motivo: `excecao: ${(e instanceof Error ? e.message : String(e)).slice(0, 70)}` };
  }
}

// ── Amazon ──────────────────────────────────────────────────────────────────
// A tabela de sinais medidos esta no cabecalho desta funcao (v14). Diferente do
// ML, aqui falamos direto com a loja: sem wa-engine, sem Scrape.do, sem pool.
async function consultarAmazon(url: string): Promise<Consulta> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_CONSULTA_MS);
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': AMZ_UA,
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });

    // Produto fora do catalogo. MEDIDO: ASIN inexistente devolve 404 com 2,3 KB e
    // "Nao foi possivel encontrar esta pagina". Mesma regra ja adotada no
    // scrapeDoWithFailover: 404/410 do destino e resposta do destino, nao falha de
    // token -- nao adianta tentar de novo.
    if (r.status === 404 || r.status === 410) {
      return { estado: 'indisponivel', sinal: `amazon:http_${r.status}` };
    }
    if (!r.ok) return { estado: 'desconhecido', motivo: `HTTP ${r.status}` };

    const html = await r.text();

    // PROVA DE QUE A PAGINA E CONFIAVEL, antes de qualquer leitura. Status 200 nao
    // basta: 2 de 4 requisicoes voltaram captcha com 200 e 3,9 KB. Sem o
    // productTitle nao ha o que afirmar -- e "desconhecido", nunca "esgotado". Se
    // isto virasse "indisponivel", metade das rodadas mataria produto que esta no ar.
    if (!html.includes('id="productTitle"')) {
      return {
        estado: 'desconhecido',
        motivo: html.length < 8000 ? 'bloqueio/captcha da Amazon' : 'pagina sem productTitle',
      };
    }

    const temBotao = html.includes('id="add-to-cart-button"') || html.includes('id="buy-now-button"');
    const semEstoque = html.includes('id="outOfStock"');

    // So afirma o que foi medido. #outOfStock apareceu nas 3 rodadas do Echo Dot e
    // em nenhum dos 5 produtos vivos: e o sinal positivo de esgotado.
    if (semEstoque) return { estado: 'indisponivel', sinal: 'amazon:outOfStock' };
    if (temBotao) {
      return { estado: 'ok', preco: null, usouPool: false, disponibilidade: 'disponivel', sinal: 'amazon:add_to_cart' };
    }
    // Pagina de produto, sem #outOfStock e sem botao: layout que nao foi medido.
    // Nao inventa veredito -- volta na proxima rodada.
    return { estado: 'desconhecido', motivo: 'pagina de produto sem botao e sem outOfStock' };
  } catch (e) {
    return { estado: 'desconhecido', motivo: `excecao: ${(e instanceof Error ? e.message : String(e)).slice(0, 70)}` };
  } finally {
    clearTimeout(t);
  }
}

// ── Aviso a dona do produto ──────────────────────────────────────────────────
// Sai da conexao ADMIN da plataforma para o numero da usuaria. Falha de aviso NUNCA
// derruba a rodada: o produto ja saiu do rodizio, que e a parte que protege o grupo.
// O aviso e o complemento.
//
// Numero de destino: whatsapp_instances.phone tem prioridade porque ja esta em
// formato internacional e e comprovadamente um WhatsApp ativo. profiles.phone e o
// fallback, mas vem sem codigo do pais (ex.: "11976893472") -- precisa do 55.
function normalizarBR(bruto: string): string | null {
  const d = String(bruto ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length >= 12 && d.startsWith('55')) return d;
  if (d.length === 10 || d.length === 11) return '55' + d;
  return d.length >= 12 ? d : null;
}
async function avisarDona(
  SB: any,
  dono: { id: string; email: string; plan: string; is_vip: boolean; phone: string },
  produto: { title: string; id: string },
  sinal: string,
  ondeLoja: string,
): Promise<string> {
  const nome = String(produto.title ?? '').slice(0, 80);
  const texto =
    `⚠️ Produto fora do ar\n\n` +
    `"${nome}"\n\n` +
    `Este anúncio não está mais disponível ${ondeLoja}, ` +
    `então ele foi removido do rodízio de postagens do seu grupo — ` +
    `assim ninguém recebe um link que não vende.\n\n` +
    `Se o anúncio voltar, é só reativar o produto no painel.`;

  // A send-email so aceita `type` de uma lista fixa de templates -- nao aceita texto
  // livre. O template 'produto_fora_do_ar' e adicionado la; se ainda nao existir, a
  // funcao devolve 400 e isso aparece em `avisos` como email_falhou_400, nunca em
  // silencio.
  async function porEmail(): Promise<string> {
    try {
      const r = await fetch(`${SUPA_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPA_KEY}` },
        body: JSON.stringify({
          type: 'produto_fora_do_ar',
          to: dono.email,
          produto: nome,
        }),
      });
      // A send-email v9 devolve 502 com o motivo real em vez de mascarar com ok:true.
      if (!r.ok) return `email_falhou_${r.status}`;
      return 'email';
    } catch (e) {
      return `email_excecao:${(e instanceof Error ? e.message : String(e)).slice(0, 40)}`;
    }
  }

  // Remetente: a conexao ADMIN da plataforma. Sem ela conectada, cai no e-mail --
  // nunca mandamos a usuaria uma mensagem dela para ela mesma, que foi o desenho
  // anterior e nao chegava a lugar nenhum visivel.
  const { data: admin } = await SB.from('revops_admin_whatsapp')
    .select('phone').eq('status', 'connected')
    .order('last_seen_at', { ascending: false }).limit(1).maybeSingle();

  if (!admin?.phone) return (await porEmail()) === 'email' ? 'email_sem_admin_wa' : 'sem_canal';

  // Destino: instancia WhatsApp da usuaria, senao o telefone do cadastro.
  const { data: inst } = await SB.from('whatsapp_instances')
    .select('phone').eq('user_id', dono.id).maybeSingle();
  const destino = normalizarBR(inst?.phone ?? '') ?? normalizarBR(dono.phone ?? '');

  if (!destino) return (await porEmail()) === 'email' ? 'email_sem_telefone' : 'sem_canal';

  try {
    const r = await fetch(`${WA_ENGINE_URL}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WA_ENGINE_TOKEN}` },
      body: JSON.stringify({
        sessionPhone: admin.phone,   // quem envia: a plataforma
        phoneNumber: destino,        // quem recebe: a usuaria
        message: texto,
        // sem userId de proposito: aviso do sistema nao consome a cota de disparo dela.
      }),
    });
    const d = await r.json().catch(() => null);
    // 200 nao basta: so contamos como enviado se o engine devolver o id da mensagem.
    if (!r.ok || !d?.messageId) {
      const motivo = String(d?.error ?? `http_${r.status}`).slice(0, 30);
      return `whatsapp_falhou:${motivo}`;
    }
    return `whatsapp:${String(d.messageId).slice(0, 12)}`;
  } catch (e) {
    return `whatsapp_excecao:${(e instanceof Error ? e.message : String(e)).slice(0, 40)}`;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const inicio = Date.now();

  const secret = req.headers.get('x-cron-secret') ?? '';
  const auth = req.headers.get('authorization') ?? '';
  if (!((CRON_SECRET && secret === CRON_SECRET) || (SUPA_KEY && auth === `Bearer ${SUPA_KEY}`))) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* sem corpo */ }
  const url0 = new URL(req.url);
  const dryRun = body.dryRun === true || url0.searchParams.get('dryRun') === '1';
  // Permite testar a deteccao sem disparar aviso para cliente real.
  const semAviso = body.semAviso === true || url0.searchParams.get('semAviso') === '1';
  // Permite forcar a checagem de um produto especifico, ignorando a janela de 24h.
  const soProduto = String(body.productId ?? url0.searchParams.get('productId') ?? '').trim();

  if (!WA_ENGINE_TOKEN) {
    return json({ ok: false, motivo: 'WA_ENGINE_TOKEN nao configurado', nota: 'Nenhum produto foi alterado.' });
  }

  const SB = createClient(SUPA_URL, SUPA_KEY);
  const corte = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const campos = 'id, title, source, price, original_url, affiliate_url, user_id, unavailable_strikes';
  let produtos: any[] | null = null;
  let error: { message: string } | null = null;

  if (soProduto) {
    const q = await SB.from('products').select(campos).eq('id', soProduto).limit(1);
    produtos = q.data; error = q.error;
  } else {
    const q = await SB.from('products').select(campos)
      .or(`price_checked_at.is.null,price_checked_at.lt.${corte}`)
      .eq('expired', false)
      .limit(BATCH);
    produtos = q.data; error = q.error;
  }

  if (error) return json({ ok: false, error: error.message }, 500);
  if (!produtos?.length) return json({ ok: true, processados: 0, msg: 'nenhum produto a verificar', dry_run: dryRun });

  // Credenciais do DONO de cada produto: e o token dele que deve pagar a consulta.
  const donos = [...new Set(produtos.map((p) => p.user_id).filter(Boolean))];
  const credPorDono: Record<string, { token: string; token2: string; cookie: string }> = {};
  const perfilPorDono: Record<string, { id: string; email: string; plan: string; is_vip: boolean; phone: string }> = {};
  if (donos.length) {
    const { data: perfis } = await SB.from('profiles')
      .select('id, email, phone, plan, is_vip, scrape_do_token, scrape_do_token_2, ml_session_cookie').in('id', donos);
    for (const pf of perfis ?? []) {
      credPorDono[pf.id] = {
        token: String(pf.scrape_do_token ?? '').trim(),
        token2: String(pf.scrape_do_token_2 ?? '').trim(),
        cookie: String(pf.ml_session_cookie ?? '').trim(),
      };
      perfilPorDono[pf.id] = { id: pf.id, email: String(pf.email ?? ''), phone: String(pf.phone ?? ''), plan: String(pf.plan ?? 'starter'), is_vip: pf.is_vip === true };
    }
  }

  let conferidos = 0, precoMudou = 0, desconhecidos = 0, pulados = 0, usosDoPool = 0;
  let expirados = 0, suspeitos = 0, reabilitados = 0, conferidosAmazon = 0;
  let interrompidoPorTempo = false;
  const detalhes: string[] = [];
  const avisos: string[] = [];

  for (const p of produtos) {
    if (Date.now() - inicio > DEADLINE_MS) { interrompidoPorTempo = true; break; }

    const agora = new Date().toISOString();
    const url = String(p.original_url || p.affiliate_url || '');
    const nome = String(p.title ?? '').slice(0, 38);
    const loja = String(p.source ?? '');

    if (!url || ehLinkCurtoProprio(url)) {
      pulados++; detalhes.push(`- ${nome} — sem URL original consultavel`); continue;
    }
    if (!LOJAS_COM_VERIFICADOR.has(loja)) {
      pulados++; detalhes.push(`- ${nome} — ${loja || 'sem loja'}: ainda sem verificador`); continue;
    }

    const perfil = perfilPorDono[p.user_id];
    const planoDono = perfil?.is_vip ? 'elite' : String(perfil?.plan ?? 'starter');
    if (!PLANOS_COM_MONITORAMENTO.has(planoDono)) {
      pulados++; detalhes.push(`- ${nome} — plano ${planoDono}: sem monitoramento de estoque`); continue;
    }

    let res: Consulta;
    if (loja === 'amazon') {
      // Fala direto com a loja: nao consome credito de Scrape.do nem o pool
      // compartilhado, entao tambem nao passa pelo teto de pool da rodada.
      res = await consultarAmazon(url);
      conferidosAmazon++;
    } else {
      const cred = credPorDono[p.user_id] ?? { token: '', token2: '', cookie: '' };
      const temProprio = !!(cred.token || cred.token2 || cred.cookie);
      if (!temProprio && usosDoPool >= MAX_POOL_POR_RODADA) {
        pulados++; detalhes.push(`- ${nome} — teto do pool compartilhado nesta rodada`); continue;
      }
      res = await consultarML(url, cred);
    }

    // ── Anuncio fora do ar ─────────────────────────────────────────────────────
    if (res.estado === 'indisponivel') {
      const strikes = Number(p.unavailable_strikes ?? 0) + 1;

      if (strikes < STRIKES_PARA_EXPIRAR) {
        suspeitos++;
        detalhes.push(`! ${nome} — fora do ar (${res.sinal}), ${strikes}/${STRIKES_PARA_EXPIRAR} — aguardando confirmacao`);
        if (!dryRun) {
          await SB.from('products')
            .update({ unavailable_strikes: strikes, unavailable_signal: res.sinal, price_checked_at: agora })
            .eq('id', p.id);
        }
        continue;
      }

      expirados++;
      detalhes.push(`X ${nome} — EXPIRADO (${res.sinal}) apos ${strikes} confirmacoes`);
      if (!dryRun) {
        await SB.from('products').update({
          expired: true,
          expired_at: agora,
          unavailable_strikes: strikes,
          unavailable_signal: res.sinal,
          price_checked_at: agora,
        }).eq('id', p.id);

        const dono = perfilPorDono[p.user_id];
        if (dono && !semAviso) {
          const via = await avisarDona(SB, dono, p, res.sinal, ONDE_LOJA[loja] ?? 'na loja');
          avisos.push(`${nome} -> ${via}`);
        }
      }
      continue;
    }

    if (res.estado === 'desconhecido') {
      // Nao mexe em nada, nem no price_checked_at: o produto volta na proxima rodada.
      // Tambem NAO zera os strikes -- nao saber nao e prova de que esta no ar.
      desconhecidos++; detalhes.push(`? ${nome} — ${res.motivo}`); continue;
    }

    if (res.usouPool) usosDoPool++;

    // Voltou a aparecer como disponivel: zera o contador de suspeita.
    const strikesAtuais = Number(p.unavailable_strikes ?? 0);
    const zerar = res.disponibilidade === 'disponivel' && strikesAtuais > 0;
    if (zerar) {
      reabilitados++;
      detalhes.push(`+ ${nome} — voltou a aparecer disponivel, suspeita zerada`);
    }
    const patchStrikes = zerar ? { unavailable_strikes: 0, unavailable_signal: null } : {};

    // Amazon devolve preco null de proposito (ver cabecalho v14): o bloco abaixo
    // e pulado sozinho e o preco gravado continua o que estava.
    const precoNovo = res.preco;
    const precoAntigo = Number(p.price);
    if (precoNovo && precoAntigo > 0) {
      const dif = Math.abs(precoNovo - precoAntigo) / precoAntigo;
      if (dif > TOLERANCIA_PRECO) {
        precoMudou++;
        detalhes.push(`$ ${nome} — ${precoAntigo} -> ${precoNovo}`);
        if (!dryRun) await SB.from('products').update({ price: precoNovo, price_changed: true, price_checked_at: agora, ...patchStrikes }).eq('id', p.id);
        continue;
      }
    }
    conferidos++;
    if (!dryRun) await SB.from('products').update({ price_checked_at: agora, price_changed: false, ...patchStrikes }).eq('id', p.id);
  }

  return json({
    ok: true,
    dry_run: dryRun,
    candidatos: produtos.length,
    conferidos,
    conferidos_amazon: conferidosAmazon,
    preco_mudou: precoMudou,
    fora_do_ar_confirmado: expirados,
    fora_do_ar_suspeito: suspeitos,
    voltaram_a_ficar_disponiveis: reabilitados,
    desconhecidos,
    pulados,
    usos_do_pool_compartilhado: usosDoPool,
    teto_do_pool: MAX_POOL_POR_RODADA,
    strikes_para_expirar: STRIKES_PARA_EXPIRAR,
    interrompido_por_tempo: interrompidoPorTempo,
    duracao_ms: Date.now() - inicio,
    detalhes: detalhes.slice(0, 30),
    avisos,
    nota: dryRun ? 'DRY RUN — nada foi gravado.' : undefined,
  });
});
