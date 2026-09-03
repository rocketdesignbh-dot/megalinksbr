// Mega Links BR · Edge Function "product-refresh" v21
// v21 (13/08, P57): ORCAMENTO POR LOJA no lugar de UM lote global.
//
//      A v20 carregava `BATCH = 12` candidatos e deixava todas as lojas
//      disputarem as mesmas 12 vagas. O defeito nao e o numero -- e tratar
//      leituras de custo completamente diferente como se fossem a mesma coisa.
//      MEDIDO em 13/08, no banco:
//
//        loja           | ativos | elegiveis hoje | como e lida             | custo
//        ---------------|--------|----------------|-------------------------|-------
//        amazon         |   57   |       56       | `fetch` DIRETO na pagina| ZERO
//        shopee         |   49   |       47       | nao e lida (sem verif.) | ZERO
//        mercado_livre  |   42   |       35       | wa-engine / Scrape.do   | credito
//
//      A Shopee nao gasta rede nenhuma -- entra na rodada so para receber
//      carimbo -- e mesmo assim ocupava vaga que a Amazon teria usado para ler
//      preco de verdade. Resultado medido nas 8 ultimas rodadas: entre **1 e 7**
//      paginas da Amazon lidas por dia, com 56 esperando. E a premissa que
//      segurava o `BATCH` baixo ("subir isso dobra o consumo de credito") vale
//      so para o ML: `consultarAmazon` nao passa por Scrape.do e nao debita
//      cota de ninguem. Ler a Amazon inteira custa relogio, nao dinheiro.
//
//      Entao: um numero POR BALDE, e nao um numero para todos. A cota de
//      antigos da P34 continua valendo, agora DENTRO de cada balde -- pelo
//      mesmo motivo de sempre: a fila de nulos monopoliza a rodada quando a
//      ingestao entrega mais produto por dia do que o lote.
//
//      A ORDEM dos baldes esta escolhida, nao e acidente: `sem_verificador`
//      (custo zero) -> `mercado_livre` (escasso, com teto proprio) -> `amazon`
//      (o unico que pode estourar o relogio). Assim um corte por DEADLINE
//      nunca deixa o ML sem rodada, e quem for cortado fica com o carimbo
//      velho e volta na FRENTE amanha -- as duas consultas ordenam por
//      `price_checked_at` ascendente.
//
//      `DEADLINE_MS` NAO foi mexido. O orcamento da Amazon foi escolhido para
//      caber nele, e `interrompido_por_tempo` continua sendo o numero que
//      denuncia se nao coube.
//
//      Efeito conferivel na proxima rodada: `candidatos_por_balde` com a
//      Amazon em dezenas (e nao 1 a 7), e `conferidos_amazon` acompanhando.
//      Se `desconhecidos` subir junto com um motivo de captcha, a taxa de
//      bloqueio da Amazon reagiu ao volume -- e ai o numero volta a baixar.
//      Baseline medido em 13/08 para essa comparacao: **zero** captchas em 9
//      dias de rodadas. Os 2-3 `desconhecidos` diarios NAO sao captcha: sao
//      dois produtos de ML com link sem MLB ID, que falham e (por desenho)
//      nao recebem carimbo, entao voltam em TODA rodada.
// v20 (03/08, P34): RESERVA DE COTA NO LOTE. A rodada diaria so alcancava
//      produto recem-criado, e isso foi MEDIDO na rodada de 03/08 09:00 UTC:
//      os 11 carimbos daquela rodada eram TODOS de produtos criados no mesmo
//      dia as 03:25. Nenhum produto antigo entrou.
//
//      A causa nao e bug -- e aritmetica. A ingestao cria produto com
//      `price_checked_at` nulo; o `nullsFirst` da v17 poe TODOS eles na frente
//      da fila; e `BATCH = 12` e menor que a entrada diaria (27 em 03/08, 66
//      em 30/07). A fila de nulos nunca esvazia, entao produto que JA TEM
//      carimbo nunca mais volta a ser conferido. Em 03/08 havia 4 produtos da
//      Amazon parados desde 30/07 14:16 -- quatro dias sem reconferir preco,
//      que e exatamente o defeito que gerou o caso da Patricia (post com preco
//      menor que o da loja).
//
//      O `nullsFirst` NAO estava errado: produto novo, sem preco conferido, e
//      mesmo o mais urgente. O que faltava era a rodada nao ser monopolizada
//      por ele. Duas consultas com cota em vez de uma com ordenacao global:
//      `RESERVA_ANTIGOS` vagas ficam GARANTIDAS para quem ja tem carimbo, e a
//      vaga que um lado nao usar passa para o outro -- o lote nunca encolhe.
//
//      ESCOLHIDO POR ISTO, e nao por ser o mais simples: e a unica saida que
//      NAO aumenta o consumo de leitura. Subir o BATCH ou rodar o cron mais
//      vezes dobraria as chamadas de loja. Em 03/08 o pool ficou em 0 so
//      porque os donos tinham credencial propria -- para dono novo isso vira
//      consumo do credito compartilhado, que e o que o teto de pool protege.
//      `BATCH` continua 12: mesmo custo de hoje, fila que anda.
//
//      Efeito conferivel na proxima rodada: `candidatos_antigos` > 0 e os 4 da
//      Amazon saindo de 30/07. Se `candidatos_antigos` vier 0 com produto
//      antigo represado, a cota nao esta funcionando -- e o numero que prova.
// v19 (02/08): tres mudancas, todas nascidas de uma medicao do mesmo dia.
//      (a) A RODADA PASSA A DEIXAR RASTRO. `product_refresh_runs` guarda uma
//          linha por rodada com os contadores e o `detalhes`. O corpo da
//          resposta so vivia no log do Supabase (24h) e em net._http_response
//          (~6h); em 01/08 e de novo em 02/08 o diagnostico da P29 chegou
//          depois da janela. Nao e enfeite: sem isto, toda pergunta sobre uma
//          rodada tem prazo de validade. Rodada com `productId` NAO grava --
//          e chamada de diagnostico, nao rodada.
//      (b) `preco_sem_leitura_confirmada` deixa de ser so da Amazon. MEDIDO em
//          02/08: 15 de 64 produtos de ML sairam com patch de
//          `{price_checked_at, price_changed:false}` e mais nada -- nem preco,
//          nem "de" -- e mesmo assim entraram em `conferidos`. A causa nao era
//          `precoDe` undefined (consultarML nunca devolve undefined): era
//          `precoNovo` nulo, ou seja, o wa-engine respondeu `ok` sem
//          `price_to`, e a guarda `if (precoNovo && ...)` pulou a
//          reconciliacao inteira em silencio. Leitura vazia contada como
//          sucesso e o defeito que este projeto ja pagou caro ("mecanismo que
//          parece existir e nao executa nada").
//      (c) Quando o "de" e APAGADO por leitura boa, o `discount_pct` vai
//          junto. MEDIDO em 02/08, no primeiro disparo real do ramo da P30: os
//          5 produtos ficaram com `price_original` nulo e `discount_pct` de
//          37, 46, 44, 15 e 10 -- porcentagem orfa, calculada contra um "de"
//          que a propria plataforma acabou de declarar inexistente. O
//          `send-post` nao usa esse campo (o post sai limpo), mas a lista de
//          produtos do painel usa, e o formulario de edicao o regrava.
//          So vale aqui: esta funcao so processa ML e Amazon, onde o desconto
//          e DERIVADO do "de". Na Shopee a API afirma a taxa direto e o selo
//          fica sem "de" de proposito (decisao da P32) -- e a Shopee nunca
//          chega neste laco, entao a decisao nao corre risco por construcao.
//      Contadores novos `de_corrigidos` e `de_apagados`: existem para a
//      pergunta da P30 -- apagamento em massa num dia so e leitura degradada,
//      apagamento pingado e loja tirando desconto. Sem contar os dois, nao ha
//      como distinguir sem reler a base inteira.
// v18 (01/08, P30): consultarML passa a devolver `precoDe` a partir do
//      `price_from` do wa-engine. Ate aqui esta funcao nao devolvia o campo, e
//      como a reconciliacao da v16 exige `!== undefined`, ela NUNCA rodava para o
//      Mercado Livre: o "de" ficava com o valor inteiro antigo (96 no lugar de
//      96,79), sobra do truncamento de centavos que o wa-engine ja consertou.
//      Erico escolheu a saida (a) em 01/08 — repassar e aceitar que o "de" seja
//      APAGADO quando a loja nao mostra preco riscado — com a trava que nenhuma
//      das duas saidas originais tinha: `null` so sai daqui depois de `r.ok` e
//      `d.ok`, ou seja, leitura que DEU CERTO. Leitura que falha sai por
//      'desconhecido', sem `precoDe`, e nao encosta no que esta gravado.
//      A distincao ja estava escrita no tipo `Consulta` desde a v15 e so o ramo
//      da Amazon a usava.
// v17 (01/08): tres mudancas, todas por causa do caso "preco do post menor que o
//      do site" relatado pela Patricia Cella.
//      (a) ORDER BY explicito por price_checked_at, nulos primeiro. A selecao era
//          arbitraria. ATENCAO ao registro honesto: a hipotese de que a falta de
//          ORDER BY causava "rotacao nenhuma" foi levantada e esta ERRADA — quem
//          e conferido ganha price_checked_at e sai do filtro por 24h. A ordem
//          explicita entra por previsibilidade, nao por consertar fome.
//          Por que 3 rodadas do cron conferiram 1 produto so: NAO medido, aberto.
//      (b) os pulos por CONDICAO (sem URL, loja sem verificador, plano sem
//          monitoramento) passam a carimbar price_checked_at. Sem isso, o
//          nullsFirst da (a) poria esses produtos na frente de TODA rodada para
//          sempre — a ordenacao sozinha teria piorado o problema que ela parecia
//          resolver. Pulo por teto de pool e falha de leitura seguem sem carimbo.
//      (c) forcarPreco: grava o preco lido mesmo dentro da tolerancia de 5%.
//          Existe para a correcao pontual do truncamento de centavos do
//          wa-engine (R$ 74,90 gravado como 74 — diferenca de ~1%, que a
//          tolerancia jamais corrigiria). Desligado por padrao; o cron nao usa.
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

// P57 · ORCAMENTO POR BALDE, no lugar do `BATCH` global da v20. Um balde por
// REGIME DE CUSTO, nao por gosto: ver o cabecalho da v21.
const ORCAMENTO_POR_BALDE: Record<string, number> = {
  sem_verificador: 20,   // nao consulta loja nenhuma, so recebe carimbo. Custo de rede ZERO.
  mercado_livre: 8,      // wa-engine / Scrape.do. Quem nao tem token proprio ainda
                         // esbarra no MAX_POOL_POR_RODADA la embaixo.
  amazon: 45,            // `fetch` direto na pagina: sem Scrape.do, sem credito, so relogio.
};
// Vagas GARANTIDAS, DENTRO do balde, para quem ja tem carimbo (P34). Piso, nao
// teto: vaga que um lado nao usar passa para o outro, e o balde nunca encolhe.
const RESERVA_ANTIGOS: Record<string, number> = {
  sem_verificador: 7,
  mercado_livre: 3,
  amazon: 15,
};
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

// `precoDe` e `imagem` sao undefined quando a loja consultada nem procurou por eles.
// undefined significa "nao olhei"; null significa "olhei e a loja nao mostra". A
// diferenca importa: so o segundo caso pode apagar o valor antigo.
// Desde a P30 (01/08) o Mercado Livre TAMBEM devolve `precoDe` — ele deixou de ser
// exemplo de "nao olhei". Quem nao olha hoje: ninguem, para `precoDe`; `imagem`
// segue exclusiva da Amazon.
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
    const precoOk = Number.isFinite(preco as number) ? (preco as number) : null;

    // ── P30 · o "de" do Mercado Livre ────────────────────────────────────
    // Ate a v17 esta funcao nao devolvia `precoDe`, entao a reconciliacao do "de"
    // (que exige `!== undefined`) NUNCA rodava para o ML: o price_original ficava
    // com o valor inteiro antigo, 96 em vez de 96,79, herdado do truncamento de
    // centavos que o wa-engine ja consertou. O efeito era conservador — o
    // desconto aparecia MENOR do que e — e por isso nao era urgente.
    //
    // Saida (a), escolhida pelo Erico em 01/08: repassar e aceitar que o "de"
    // seja APAGADO quando a loja nao mostra preco riscado. Nao publicar desconto
    // que a loja nao exibe e a mesma regra que fechou o caso La Roche.
    //
    // O que fazia a saida (b) parecer necessaria era o medo de apagar um "de" bom
    // por causa de uma leitura que falhou. Isso nao e escolher entre (a) e (b): e
    // separar dois casos que a pendencia tratava como um so, e o tipo `Consulta`
    // ja tinha a distincao escrita — `undefined` = nao olhei; `null` = olhei e a
    // loja nao mostra. Só o segundo pode apagar. Aqui ja passamos por `r.ok` e
    // `d.ok`, entao a leitura DEU CERTO: `null` daqui e afirmacao, nao ignorancia.
    // Leitura que falha nem chega nesta linha — sai por 'desconhecido' la em cima,
    // sem `precoDe`, e a reconciliacao nao toca no que esta gravado.
    const de = d.price_from ? Number(String(d.price_from).replace(',', '.')) : null;
    // Mesma regra do precoAmazon e do acharPrecos da clone-ingest: "de" que nao e
    // maior que o "por" nao e preco riscado, e publicar isso vira desconto zero ou
    // negativo no grupo da cliente. Vale `null` (apaga), nao o numero incoerente.
    const deOk = (Number.isFinite(de as number) && precoOk !== null && (de as number) > precoOk)
      ? (de as number)
      : null;

    const usouPool = d.usingPersonalToken !== true && !cred.cookie;
    return {
      estado: 'ok',
      preco: precoOk,
      precoDe: deOk,
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

  // MULTI-CONEXÃO (03/09). Este `.maybeSingle()` sem filtro nem limite JÁ
  // estava quebrado antes da fatia 1: as duas contas que tinham 2 linhas
  // (uma conectada + uma antiga desconectada) tomavam PGRST116 aqui, `inst`
  // vinha null e o aviso de produto fora do ar caía calado no telefone do
  // perfil. Agora escolhe a conexão principal conectada, com fallback igual.
  const { data: inst } = await SB.from('whatsapp_instances')
    .select('phone').eq('user_id', dono.id).eq('status', 'connected')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1).maybeSingle();
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
  // Correcao pontual: grava o preco lido mesmo quando a diferenca fica DENTRO da
  // tolerancia de 5%. Existe por causa do truncamento de centavos consertado em
  // 01/08 (R$ 74,90 gravado como 74): a diferenca e de ~1%, entao a tolerancia
  // normal nunca corrigiria — ela preservaria o erro para sempre. Desligada por
  // padrao; o cron diario NAO usa.
  const forcarPreco = body.forcarPreco === true || url0.searchParams.get('forcarPreco') === '1';

  if (!WA_ENGINE_TOKEN) {
    return json({ ok: false, motivo: 'WA_ENGINE_TOKEN nao configurado', nota: 'Nenhum produto foi alterado.' });
  }

  const SB = createClient(SUPA_URL, SUPA_KEY);
  const corte = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // discount_pct entra na v19: sem ele no select, `p.discount_pct` e undefined e a
  // guarda que zera o desconto orfao nunca dispararia -- defeito silencioso, do
  // tipo que so aparece quando alguem for conferir por que nao aconteceu nada.
  const campos = 'id, title, source, price, price_original, discount_pct, image_url, original_url, affiliate_url, user_id, unavailable_strikes';
  let produtos: any[] | null = null;
  let error: { message: string } | null = null;
  // Contam de que fila cada candidato veio. Sem isto nao ha como provar que a
  // cota da P34 disparou -- e "status 200 nao e prova" vale aqui tambem.
  let candidatosNovos = 0;
  let candidatosAntigos = 0;
  // P57: quanto cada balde levou desta rodada. Sem isto nao ha como provar que o
  // orcamento por loja disparou -- é o mesmo papel que `candidatos_antigos` faz
  // para a cota da P34.
  const candidatosPorBalde: Record<string, number> = {};

  if (soProduto) {
    const q = await SB.from('products').select(campos).eq('id', soProduto).limit(1);
    produtos = q.data; error = q.error;
  } else {
    // HISTORICO, porque a razao continua valendo mesmo com o codigo trocado:
    // ate a v19 isto era UMA consulta com `nullsFirst`. A ordem explicita
    // entrou na v17 por previsibilidade (sem ORDER BY nao da para depurar por
    // que um produto sumiu da fila), e o `nullsFirst` so era seguro POR CAUSA
    // do carimbo nos pulos por condicao la embaixo -- sem ele, produto sempre
    // pulado ficaria com carimbo nulo para sempre e ocuparia a frente de TODA
    // rodada. Esse carimbo continua sendo obrigatorio na v21: a fila `novos`
    // de cada balde e exatamente a fila dos nulos, e ela precisa esvaziar.
    // P34 · DUAS FILAS COM COTA, em vez de uma ordenacao global.
    //
    // A consulta unica com `nullsFirst` era correta e mesmo assim causava fome:
    // com a ingestao criando mais produtos por dia do que BATCH, a fila de
    // nulos nunca esvaziava e quem ja tinha carimbo nunca voltava. Medido em
    // 03/08 -- ver o cabecalho da v20.
    //
    // `novos`  : carimbo nulo, os mais ANTIGOS DE CRIACAO primeiro (FIFO). A
    //            ordenacao por created_at entra no lugar do desempate
    //            arbitrario que havia entre nulos: dois produtos criados na
    //            mesma rodada de ingestao empatavam e a escolha era do banco.
    // `antigos`: ja carimbados e vencidos, o mais desatualizado primeiro.
    //
    // As duas pedem o orcamento INTEIRO do balde de proposito: assim um lado
    // curto e coberto pelo outro sem uma terceira consulta.
    // P57 · UM BALDE POR REGIME DE CUSTO, cada um com o seu orcamento.
    //
    // A ordem da lista e a ordem de PROCESSAMENTO la embaixo, e esta escolhida:
    // `sem_verificador` nao toca a rede, `mercado_livre` e escasso mas pequeno,
    // e `amazon` e o unico capaz de estourar o DEADLINE -- entao a Amazon vai
    // por ultimo, e um corte por tempo nunca deixa o ML sem rodada.
    const BALDES: { chave: string; aplicar: (q: any) => any }[] = [
      {
        chave: 'sem_verificador',
        // `source` e enum NOT NULL (`marketplace`, 16 valores) -- conferido em
        // 13/08 --, entao um `not in` cobre todo o resto sem ramo para null.
        // ⚠️ Esta lista sai do mesmo LOJAS_COM_VERIFICADOR de cima de proposito:
        // uma segunda lista escrita a mao seria o risco `mercadolivre`/`mercado_livre`
        // da P31 de novo.
        aplicar: (q: any) => q.not('source', 'in', `(${[...LOJAS_COM_VERIFICADOR].join(',')})`),
      },
      { chave: 'mercado_livre', aplicar: (q: any) => q.eq('source', 'mercado_livre') },
      { chave: 'amazon', aplicar: (q: any) => q.eq('source', 'amazon') },
    ];

    // Duas consultas por balde (novos / antigos), todas em paralelo. Sao leituras
    // de BANCO, nao de loja -- nao custam credito nem relogio de rede.
    // Seis consultas onde a v20 fazia duas: seis vezes zero continua zero.
    const consultas = BALDES.flatMap(({ chave, aplicar }) => {
      const orc = ORCAMENTO_POR_BALDE[chave] ?? 0;
      return [
        aplicar(SB.from('products').select(campos))
          .is('price_checked_at', null)
          .eq('expired', false)
          .order('created_at', { ascending: true })
          .limit(orc),
        aplicar(SB.from('products').select(campos))
          .lt('price_checked_at', corte)
          .eq('expired', false)
          .order('price_checked_at', { ascending: true })
          .limit(orc),
      ];
    });

    const rs: any[] = await Promise.all(consultas);
    const comErro = rs.find((r) => r.error);
    error = comErro ? { message: String(comErro.error?.message ?? comErro.error) } : null;

    const selecionados: any[] = [];
    for (let i = 0; i < BALDES.length; i++) {
      const chave = BALDES[i].chave;
      const orc = ORCAMENTO_POR_BALDE[chave] ?? 0;
      const novos = rs[i * 2]?.data ?? [];
      const antigos = rs[i * 2 + 1]?.data ?? [];

      // A cota e PISO para os antigos, nao teto: sem antigo represado no balde,
      // ele inteiro vai para os novos.
      const vagasAntigos = Math.min(RESERVA_ANTIGOS[chave] ?? 0, antigos.length);
      const doNovos = novos.slice(0, orc - vagasAntigos);
      const doAntigos = antigos.slice(0, orc - doNovos.length);

      candidatosNovos += doNovos.length;
      candidatosAntigos += doAntigos.length;
      candidatosPorBalde[chave] = doNovos.length + doAntigos.length;
      selecionados.push(...doNovos, ...doAntigos);
    }
    produtos = selecionados;
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
  let precosCorrigidos = 0;
  let expirados = 0, suspeitos = 0, reabilitados = 0, conferidosAmazon = 0;
  let imagensPreenchidas = 0, precoSemLeitura = 0;
  let deCorrigidos = 0, deApagados = 0;
  let interrompidoPorTempo = false;
  const detalhes: string[] = [];
  const avisos: string[] = [];

  for (const p of produtos) {
    if (Date.now() - inicio > DEADLINE_MS) { interrompidoPorTempo = true; break; }

    const agora = new Date().toISOString();
    const url = String(p.original_url || p.affiliate_url || '');
    const nome = String(p.title ?? '').slice(0, 38);
    const loja = String(p.source ?? '');

    // Os tres pulos abaixo sao de CONDICAO, nao de falha: consultar a loja nao
    // ia acontecer mesmo. Carimbar price_checked_at aqui nao mente ("foi
    // avaliado", e foi) e tira o produto da fila por 24h, em vez de deixa-lo
    // voltar em toda rodada empurrando os outros para tras. O pulo por teto de
    // pool e a falha de leitura NAO sao carimbados: aqueles precisam voltar ja.
    if (!url || ehLinkCurtoProprio(url)) {
      pulados++; detalhes.push(`- ${nome} — sem URL original consultavel`);
      if (!dryRun) await SB.from('products').update({ price_checked_at: agora }).eq('id', p.id);
      continue;
    }
    if (!LOJAS_COM_VERIFICADOR.has(loja)) {
      pulados++; detalhes.push(`- ${nome} — ${loja || 'sem loja'}: ainda sem verificador`);
      if (!dryRun) await SB.from('products').update({ price_checked_at: agora }).eq('id', p.id);
      continue;
    }

    const perfil = perfilPorDono[p.user_id];
    const planoDono = perfil?.is_vip ? 'elite' : String(perfil?.plan ?? 'starter');
    if (!PLANOS_COM_MONITORAMENTO.has(planoDono)) {
      pulados++; detalhes.push(`- ${nome} — plano ${planoDono}: sem monitoramento de estoque`);
      if (!dryRun) await SB.from('products').update({ price_checked_at: agora }).eq('id', p.id);
      continue;
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
    // Ate a v18 este contador era so da Amazon, e por isso a leitura vazia do ML
    // era invisivel: o produto entrava em `conferidos` sem que nada tivesse sido
    // lido. Os motivos diferem por loja -- na Amazon e desacordo entre as duas
    // testemunhas do buybox, no ML e resposta `ok` sem `price_to` -- mas o efeito
    // e o mesmo e precisa aparecer nos dois.
    if (precoNovo === null) {
      precoSemLeitura++;
      detalhes.push(loja === 'amazon'
        ? `~ ${nome} — disponivel, mas preco nao confirmado pelas duas leituras`
        : `~ ${nome} — loja respondeu sem preco; nada foi reconciliado`);
    }

    if (precoNovo && precoAntigo > 0) {
      const dif = Math.abs(precoNovo - precoAntigo) / precoAntigo;
      if (dif > TOLERANCIA_PRECO) {
        precoMudou++;
        patch.price = precoNovo;
        patch.price_changed = true;
        detalhes.push(`$ ${nome} — ${precoAntigo} -> ${precoNovo}`);
      } else if (forcarPreco && precoNovo !== precoAntigo) {
        // De proposito NAO marca price_changed: acertar centavo nao e "a oferta
        // mudou", e marcar assim poluiria o sinal que a tela usa.
        patch.price = precoNovo;
        precosCorrigidos++;
        detalhes.push(`= ${nome} — ${precoAntigo} -> ${precoNovo} (centavos, dentro da tolerancia)`);
      }
    }

    // O "de" e reconciliado SEMPRE que a loja foi lida, nao so quando o "por" mexeu.
    // A primeira versao disto amarrou os dois e deixou passar o La Roche: preco
    // estavel em 114,86 e um "de" de 116,99 herdado do texto do TaNaMao que a loja
    // nao mostra -- um desconto de 2% que nunca existiu, publicado no grupo.
    // `undefined` e a loja que nem procurou. Desde a v18 (P30) NAO ha mais loja
    // assim para o "de": ML e Amazon procuram as duas. O caso vivo de `undefined`
    // hoje e leitura que falhou, que sai por 'desconhecido' antes de chegar aqui —
    // e e exatamente esse o ponto: quem falhou nao apaga nada.
    // `precoNovo` nulo e leitura que nao passou nas duas testemunhas: tambem nao mexe.
    if (precoNovo && res.precoDe !== undefined) {
      const antes = Number(p.price_original) || null;
      if (antes !== res.precoDe) {
        patch.price_original = res.precoDe;
        detalhes.push(`  de: ${antes ?? 'sem'} -> ${res.precoDe ?? 'sem'} (loja)`);
        if (res.precoDe === null) {
          deApagados++;
          // O desconto destas lojas e DERIVADO do "de". Apagar um e deixar o outro
          // publica porcentagem sem numero que a sustente -- foi o que aconteceu
          // com os 5 primeiros apagamentos reais em 02/08. Zerar junto, e so
          // quando o "de" existia: produto que ja estava sem "de" nao e tocado.
          if (Number(p.discount_pct) > 0) {
            patch.discount_pct = null;
            detalhes.push(`  desconto: ${p.discount_pct}% -> sem (o "de" que o sustentava sumiu)`);
          }
        } else {
          deCorrigidos++;
        }
      }
    }

    if (!patch.price_changed) conferidos++;
    if (!dryRun) await SB.from('products').update(patch).eq('id', p.id);
    else detalhes.push(`  [dry] gravaria: ${JSON.stringify(patch)}`);
  }

  // `conferidos` conta so quem NAO mudou de preco (`if (!patch.price_changed)`),
  // que e contra-intuitivo e ja atrapalhou a leitura de uma rodada: quem mudou de
  // preco foi lido da loja tambem. `lidos_da_loja` responde a pergunta que a gente
  // sempre faz de verdade. O nome antigo fica de pe para nao quebrar leitura velha.
  const lidosDaLoja = conferidos + precoMudou;

  const resposta = {
    ok: true,
    dry_run: dryRun,
    candidatos: produtos.length,
    candidatos_novos: candidatosNovos,
    candidatos_antigos: candidatosAntigos,
    candidatos_por_balde: candidatosPorBalde,
    orcamento_por_balde: ORCAMENTO_POR_BALDE,
    lidos_da_loja: lidosDaLoja,
    conferidos,
    conferidos_amazon: conferidosAmazon,
    preco_mudou: precoMudou,
    preco_sem_leitura_confirmada: precoSemLeitura,
    de_corrigidos: deCorrigidos,
    de_apagados: deApagados,
    imagens_preenchidas: imagensPreenchidas,
    fora_do_ar_confirmado: expirados,
    fora_do_ar_suspeito: suspeitos,
    voltaram_a_ficar_disponiveis: reabilitados,
    desconhecidos,
    pulados,
    precos_corrigidos_por_centavos: precosCorrigidos,
    usos_do_pool_compartilhado: usosDoPool,
    teto_do_pool: MAX_POOL_POR_RODADA,
    strikes_para_expirar: STRIKES_PARA_EXPIRAR,
    interrompido_por_tempo: interrompidoPorTempo,
    duracao_ms: Date.now() - inicio,
    detalhes: detalhes.slice(0, 40),
    avisos,
    nota: dryRun ? 'DRY RUN — nada foi gravado.' : undefined,
  };

  // Rodada com `productId` e diagnostico de um produto so, nao rodada -- gravar
  // isso encheria a tabela de ruido e esconderia justamente o que ela existe para
  // mostrar. Fail-open de proposito, pelo mesmo motivo do clone_ingest_log: falhar
  // ao registrar a rodada nao pode derrubar a rodada.
  if (!soProduto) {
    try {
      await SB.from('product_refresh_runs').insert({
        dry_run: dryRun,
        candidatos: produtos.length,
        lidos_da_loja: lidosDaLoja,
        conferidos,
        preco_mudou: precoMudou,
        preco_sem_leitura_confirmada: precoSemLeitura,
        de_corrigidos: deCorrigidos,
        de_apagados: deApagados,
        pulados,
        desconhecidos,
        interrompido_por_tempo: interrompidoPorTempo,
        duracao_ms: Date.now() - inicio,
        resumo: resposta,
        detalhes,
      });
    } catch (_e) { /* registrar a rodada nunca derruba a rodada */ }
  }

  return json(resposta);
});
