// Mega Links BR · Edge Function "product-refresh" v16
// v16: o preco "de" passa a ser reconciliado em toda leitura bem-sucedida da
//      loja, e nao apenas quando o "por" varia mais que a tolerancia. Ver o
//      comentario no laco principal: o La Roche ficou com "de R$116,99" sobre um
//      "por" de R$114,86 que a loja nao mostra.
//
// v15: PRECO E IMAGEM DA AMAZON, MEDIDOS. A v14 deixou isto de proposito como
//      pendencia: "a pagina tem varias ocorrencias de a-price-whole (variacoes,
//      produtos relacionados) e nao ha como provar qual e a do buybox sem medir".
//      Foi medido em 30/07/2026 e a pendencia fecha aqui.
//
//      O CAMINHO ERRADO, DERRUBADO NO TESTE. O candidato obvio era o campo
//      estruturado <input id="twister-plus-price-data-price" value="...">: existe
//      nos 4 produtos, valor numerico limpo, some nos esgotados. Passaria por
//      todos os testes menos um -- no Calvin Klein Euphoria ele diz 399.99
//      enquanto o buybox exibe R$ 379,99. Campo bem nomeado nao e campo
//      conferido: 3 de 4 acertos publicariam preco errado no grupo da cliente.
//
//      A REGRA QUE FICOU, com 19 observacoes (3 rodadas x 4 vivos, 2 rodadas x
//      2 esgotados, 3 ASINs inexistentes):
//
//        1. Ancorar em <div id="corePriceDisplay_desktop_feature_div".
//           MEDIDO: o div existe 12/12 nos produtos vivos e NAO existe 4/4 nos
//           esgotados nem 3/3 nos 404. A presenca do div JA E a prova de buybox
//           -- o mesmo papel que o schema.org faz no ML e o productTitle faz para
//           a confiabilidade da pagina. Fora do div nao se le preco: o primeiro
//           "priceToPay" do HTML inteiro do Kit Rapunzel devolve 52,67, que e
//           preco de bloco promocional, e nao o buybox de 58,52.
//
//        2. DUAS TESTEMUNHAS DENTRO DO DIV, e so afirma se concordarem:
//             a) id="apex-pricetopay-accessibility-label"  -> " R$ 379,99 "
//             b) a-price-whole + a-price-fraction          -> "379" + "99"
//           MEDIDO: concordam 12/12. O rotulo (a) aparece 4 vezes no HTML do Kit
//           Rapunzel e 1 vez dentro do div -- por isso ancorar vem antes de ler.
//           Discordancia devolve null: pagina que mudou de layout nao vira palpite.
//
//        3. Armadilha registrada: o PRIMEIRO class="a-offscreen" dentro do div
//           contem um espaco em branco (0x20), nao o preco. "Primeira ocorrencia
//           de classe generica" nao e regra; id semantico dentro de bloco ancorado e.
//
//      PRECO "DE" (basisPrice): lido do mesmo bloco, na mesma leitura, e so vale se
//      for MAIOR que o "por". Quando a loja nao mostra "de", o "de" antigo e apagado
//      em vez de mantido: o Kärcher tinha "de R$329" vindo do texto do TaNaMao
//      enquanto a loja mostra de R$459 por R$279,90. Manter um "de" de terceiro ao
//      lado de um "por" medido publica um desconto que nunca existiu -- e o mesmo
//      motivo pelo qual o parser da clone-ingest se recusa a inverter
//      "De R$29,90 por R$59,90".
//
//      IMAGEM: ancorada em id="landingImage" (unico, 6/6), o id da imagem sai da
//      tag e a URL e remontada como ._AC_SL1500_.jpg -- mesma normalizacao que o
//      ML ja recebe na variante -O. MEDIDO que resolve: 5 ids reais devolvem
//      image/jpeg com Content-Length de 20 KB a 190 KB; id inventado devolve 400.
//      Cuidado registrado: baixar imagem e medir length() do corpo NAO serve para
//      conferir -- JPEG tem byte nulo no offset 4 e o tamanho aparece como 7.
//      Content-Length e o que se le.
//      A imagem so PREENCHE campo vazio; nunca troca imagem que ja existe.
//
// v14: DETECCAO DE PRODUTO FORA DO AR NA AMAZON. Ate a v13 o detector so cobria
//      Mercado Livre, e produto de qualquer outra loja era pulado com
//      "ainda sem verificador" -- ponto cego que ja aparecia para o cliente,
//      porque monitoramento e argumento de venda do Pro pra cima.
//
//      MEDIDO em 30/07/2026, nos dois sentidos, como foi feito com o ML:
//        estado      | HTTP | id="productTitle" | add-to-cart | id="outOfStock"
//        ------------|------|-------------------|-------------|----------------
//        vivo (x5)   | 200  | sim               | SIM         | nao
//        esgotado    | 200  | sim               | NAO         | SIM
//        removido    | 404  | nao               | nao         | nao
//        captcha     | 200  | NAO               | nao         | nao
//
//      Duas hipoteses cairam no teste, as duas do mesmo jeito que a do ML caiu:
//        * casar frase NAO funciona: a pagina VIVA da Lavadora Karcher traz
//          "Em estoque" E "Indisponivel no momento" no mesmo HTML.
//        * outOfStockBuyBox NAO serve: aparece em pagina de produto disponivel.
//
// v13: o aviso de produto fora do ar passa a sair da CONEXAO ADMIN.
// v12: monitoramento passa a ser feature de plano (Pro pra cima).
// v11: DETECCAO DE PRODUTO FORA DO AR no Mercado Livre (schema.org availability).
// v10: orcamento de tempo (DEADLINE de relogio por rodada).
// v9 : verifica preco pelo wa-engine em vez de chamar a scrape.do direto.
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

const PLANOS_COM_MONITORAMENTO = new Set(['pro', 'elite', 'premium', 'infinity']);
const LOJAS_COM_VERIFICADOR = new Set(['mercado_livre', 'amazon']);

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

// `precoDe` e `imagem` sao undefined quando a loja consultada nem procurou por eles
// (hoje: Mercado Livre). undefined significa "nao olhei"; null significa "olhei e a
// loja nao mostra". A diferenca importa: so o segundo caso pode apagar o valor antigo.
type Consulta =
  | {
      estado: 'ok'; preco: number | null; usouPool: boolean; disponibilidade: string; sinal: string;
      precoDe?: number | null; imagem?: string | null;
    }
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

    if (d?.availability === 'indisponivel') {
      return { estado: 'indisponivel', sinal: String(d?.availabilitySignal ?? 'sem_sinal').slice(0, 60) };
    }
    if (!r.ok || !d?.ok) {
      return { estado: 'desconhecido', motivo: String(d?.error ?? `HTTP ${r.status}`).slice(0, 90) };
    }
    const preco = d.price_to ? Number(String(d.price_to).replace(',', '.')) : null;
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

// ── Leitura da pagina da Amazon ──────────────────────────────────────────
// A justificativa de cada regra esta no cabecalho da v15. Estas funcoes devolvem
// null com folga: nesta rodada, nao ler nada custa uma rodada; ler errado vai
// para o grupo da cliente e nao se desfaz.

function brParaNumero(s: string): number | null {
  // "1.299,90" -> 1299.9   O ponto aqui e SEMPRE separador de milhar: estes valores
  // vem do HTML pt-BR da loja, nao de texto digitado por gente (esse caso ambiguo e
  // tratado no parser da clone-ingest, que decide pelo tamanho do ultimo grupo).
  const n = Number(String(s ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function precoAmazon(html: string): { por: number | null; de: number | null } {
  const vazio = { por: null, de: null };

  // 1. Ancora. Sem o div nao ha buybox -- e sem buybox nao ha preco a afirmar.
  const p = html.indexOf('<div id="corePriceDisplay_desktop_feature_div"');
  if (p < 0) return vazio;
  const bloco = html.slice(p, p + 4000);

  // 2. Duas testemunhas independentes do MESMO numero.
  const mRotulo = bloco.match(/id="apex-pricetopay-accessibility-label"[\s\S]{0,300}?>[^0-9<]*([\d.]+,\d{2})/);
  const mInteiro = bloco.match(/a-price-whole">([\d.]+)/);
  const mCentavos = bloco.match(/a-price-fraction">(\d{2})/);
  if (!mRotulo || !mInteiro || !mCentavos) return vazio;

  const viaRotulo = brParaNumero(mRotulo[1]);
  const viaVisivel = brParaNumero(`${mInteiro[1]},${mCentavos[1]}`);
  if (viaRotulo === null || viaVisivel === null || viaRotulo !== viaVisivel) return vazio;

  // 3. O "de" e opcional e so vale se for maior que o "por".
  const mBase = bloco.match(/basisPrice[\s\S]{0,250}?([\d.]+,\d{2})/);
  const de = mBase ? brParaNumero(mBase[1]) : null;
  return { por: viaRotulo, de: de !== null && de > viaRotulo ? de : null };
}

function imagemAmazon(html: string): string | null {
  const p = html.indexOf('id="landingImage"');
  if (p < 0) return null;
  // A tag do landingImage passa de 1,3 KB por causa do data-a-dynamic-image, e o
  // src pode vir antes do id -- por isso a janela abre para tras tambem.
  const janela = html.slice(Math.max(p - 4000, 0), p + 8000);
  const tag = janela.match(/<img[^>]*id="landingImage"[^>]*>/);
  if (!tag) return null;
  const m = tag[0].match(/images\/I\/([A-Za-z0-9+_-]+)\./);
  if (!m) return null;
  return `https://m.media-amazon.com/images/I/${m[1]}._AC_SL1500_.jpg`;
}

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

    if (r.status === 404 || r.status === 410) {
      return { estado: 'indisponivel', sinal: `amazon:http_${r.status}` };
    }
    if (!r.ok) return { estado: 'desconhecido', motivo: `HTTP ${r.status}` };

    const html = await r.text();

    // PROVA DE QUE A PAGINA E CONFIAVEL, antes de qualquer leitura. Status 200 nao
    // basta: captcha volta com 200 e ~3,9 KB. Sem productTitle nada e afirmado --
    // nem disponibilidade, nem preco, nem imagem.
    if (!html.includes('id="productTitle"')) {
      return {
        estado: 'desconhecido',
        motivo: html.length < 8000 ? 'bloqueio/captcha da Amazon' : 'pagina sem productTitle',
      };
    }

    const temBotao = html.includes('id="add-to-cart-button"') || html.includes('id="buy-now-button"');
    const semEstoque = html.includes('id="outOfStock"');

    if (semEstoque) return { estado: 'indisponivel', sinal: 'amazon:outOfStock' };

    if (temBotao) {
      const { por, de } = precoAmazon(html);
      return {
        estado: 'ok',
        preco: por,
        precoDe: de,
        imagem: imagemAmazon(html),
        usouPool: false,
        disponibilidade: 'disponivel',
        sinal: 'amazon:add_to_cart',
      };
    }
    return { estado: 'desconhecido', motivo: 'pagina de produto sem botao e sem outOfStock' };
  } catch (e) {
    return { estado: 'desconhecido', motivo: `excecao: ${(e instanceof Error ? e.message : String(e)).slice(0, 70)}` };
  } finally {
    clearTimeout(t);
  }
}

// ── Aviso a dona do produto ──────────────────────────────────────────────
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
  _sinal: string,
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

  async function porEmail(): Promise<string> {
    try {
      const r = await fetch(`${SUPA_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPA_KEY}` },
        body: JSON.stringify({ type: 'produto_fora_do_ar', to: dono.email, produto: nome }),
      });
      if (!r.ok) return `email_falhou_${r.status}`;
      return 'email';
    } catch (e) {
      return `email_excecao:${(e instanceof Error ? e.message : String(e)).slice(0, 40)}`;
    }
  }

  const { data: admin } = await SB.from('revops_admin_whatsapp')
    .select('phone').eq('status', 'connected')
    .order('last_seen_at', { ascending: false }).limit(1).maybeSingle();

  if (!admin?.phone) return (await porEmail()) === 'email' ? 'email_sem_admin_wa' : 'sem_canal';

  const { data: inst } = await SB.from('whatsapp_instances')
    .select('phone').eq('user_id', dono.id).maybeSingle();
  const destino = normalizarBR(inst?.phone ?? '') ?? normalizarBR(dono.phone ?? '');

  if (!destino) return (await porEmail()) === 'email' ? 'email_sem_telefone' : 'sem_canal';

  try {
    const r = await fetch(`${WA_ENGINE_URL}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WA_ENGINE_TOKEN}` },
      body: JSON.stringify({ sessionPhone: admin.phone, phoneNumber: destino, message: texto }),
    });
    const d = await r.json().catch(() => null);
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
  const semAviso = body.semAviso === true || url0.searchParams.get('semAviso') === '1';
  const soProduto = String(body.productId ?? url0.searchParams.get('productId') ?? '').trim();

  if (!WA_ENGINE_TOKEN) {
    return json({ ok: false, motivo: 'WA_ENGINE_TOKEN nao configurado', nota: 'Nenhum produto foi alterado.' });
  }

  const SB = createClient(SUPA_URL, SUPA_KEY);
  const corte = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const campos = 'id, title, source, price, price_original, image_url, original_url, affiliate_url, user_id, unavailable_strikes';
  let produtos: any[] | null = null;
  let error: { message: string } | null = null;

  if (soProduto) {
    const q = await SB.from('products').select(campos).eq('id', soProduto).limit(1);
    produtos = q.data; error = q.error;
  } else {
    // MEDIDO 01/08: sem ORDER BY, o PostgREST devolve as MESMAS 12 linhas toda
    // rodada enquanto a tabela nao muda. Nao era rotacao lenta — era rotacao
    // NENHUMA: 69 dos 74 produtos ativos nunca tinham sido conferidos, mesmo com
    // o cron rodando. Ordenar por price_checked_at com os nulos primeiro faz o
    // mais desatualizado ser sempre o proximo, e garante que ninguem morre de fome.
    const q = await SB.from('products').select(campos)
      .or(`price_checked_at.is.null,price_checked_at.lt.${corte}`)
      .eq('expired', false)
      .order('price_checked_at', { ascending: true, nullsFirst: true })
      .limit(BATCH);
    produtos = q.data; error = q.error;
  }

  if (error) return json({ ok: false, error: error.message }, 500);
  if (!produtos?.length) return json({ ok: true, processados: 0, msg: 'nenhum produto a verificar', dry_run: dryRun });

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
  let imagensPreenchidas = 0, precoSemLeitura = 0;
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

    // ── Anuncio fora do ar ──────────────────────────────────────────────
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
          expired: true, expired_at: agora, unavailable_strikes: strikes,
          unavailable_signal: res.sinal, price_checked_at: agora,
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
      desconhecidos++; detalhes.push(`? ${nome} — ${res.motivo}`); continue;
    }

    if (res.usouPool) usosDoPool++;

    const strikesAtuais = Number(p.unavailable_strikes ?? 0);
    const zerar = res.disponibilidade === 'disponivel' && strikesAtuais > 0;
    if (zerar) {
      reabilitados++;
      detalhes.push(`+ ${nome} — voltou a aparecer disponivel, suspeita zerada`);
    }

    // Um unico patch por produto. Ate a v14 havia dois caminhos de update com
    // `continue` entre eles, e qualquer campo novo teria que ser repetido nos
    // dois -- e o jeito de esquecer um lado.
    const patch: Record<string, unknown> = { price_checked_at: agora, price_changed: false };
    if (zerar) { patch.unavailable_strikes = 0; patch.unavailable_signal = null; }

    // Imagem: so preenche o que esta vazio. Trocar imagem existente nao foi pedido
    // e a que esta la pode ter sido escolhida a mao.
    if (res.imagem && !String(p.image_url ?? '').trim()) {
      patch.image_url = res.imagem;
      imagensPreenchidas++;
      detalhes.push(`img ${nome} — imagem preenchida pela loja`);
    }

    const precoNovo = res.preco;
    const precoAntigo = Number(p.price);

    // Loja respondeu, pagina confiavel, mas o preco nao passou nas duas testemunhas.
    // Vale contar: se isto subir, o layout mudou e a regra precisa ser remedida.
    if (loja === 'amazon' && precoNovo === null) {
      precoSemLeitura++;
      detalhes.push(`~ ${nome} — disponivel, mas preco nao confirmado pelas duas leituras`);
    }

    if (precoNovo && precoAntigo > 0) {
      const dif = Math.abs(precoNovo - precoAntigo) / precoAntigo;
      if (dif > TOLERANCIA_PRECO) {
        precoMudou++;
        patch.price = precoNovo;
        patch.price_changed = true;
        detalhes.push(`$ ${nome} — ${precoAntigo} -> ${precoNovo}`);
      }
    }

    // O "de" e reconciliado SEMPRE que a loja foi lida, nao so quando o "por" mexeu.
    // A primeira versao disto amarrou os dois e deixou passar o La Roche: preco
    // estavel em 114,86 e um "de" de 116,99 herdado do texto do TaNaMao que a loja
    // nao mostra -- um desconto de 2% que nunca existiu, publicado no grupo.
    // `undefined` e a loja que nem procurou (ML): nesse caso nao se mexe no que existe.
    // `precoNovo` nulo e leitura que nao passou nas duas testemunhas: tambem nao mexe.
    if (precoNovo && res.precoDe !== undefined) {
      const antes = Number(p.price_original) || null;
      if (antes !== res.precoDe) {
        patch.price_original = res.precoDe;
        detalhes.push(`  de: ${antes ?? 'sem'} -> ${res.precoDe ?? 'sem'} (loja)`);
      }
    }

    if (!patch.price_changed) conferidos++;
    if (!dryRun) await SB.from('products').update(patch).eq('id', p.id);
    else detalhes.push(`  [dry] gravaria: ${JSON.stringify(patch)}`);
  }

  return json({
    ok: true,
    dry_run: dryRun,
    candidatos: produtos.length,
    conferidos,
    conferidos_amazon: conferidosAmazon,
    preco_mudou: precoMudou,
    preco_sem_leitura_confirmada: precoSemLeitura,
    imagens_preenchidas: imagensPreenchidas,
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
    detalhes: detalhes.slice(0, 40),
    avisos,
    nota: dryRun ? 'DRY RUN — nada foi gravado.' : undefined,
  });
});
