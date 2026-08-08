/**
 * mega-results — API de leitura de metricas (doc 05 secao 6).
 *
 * POST /mega-results/metrics/query
 *
 * Le exclusivamente megaresults.rollup_daily. Nada de varrer fact_transaction:
 * a razao de o rollup existir e o dashboard responder rapido (doc 04 secao 9).
 *
 * SEGURANCA: o escopo do usuario vem de RLS, nao de parametro. O token do
 * chamador e repassado ao PostgREST, que valida a assinatura e aplica
 * `owner_id = auth.uid()`. Esta funcao NAO decodifica JWT por conta propria nem
 * usa a service_role — com service_role o filtro de dono viraria
 * responsabilidade deste arquivo, e um `ownerId` vindo do corpo da requisicao
 * seria confiado. (A funcao `analytics` deste mesmo projeto faz exatamente isso:
 * `atob` no payload sem verificar assinatura e depois service_role. Vale
 * revisitar; aqui nao se repete o padrao.)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const TZ = 'America/Sao_Paulo';
const CURRENCY = 'BRL';
const SENTINELA = '00000000-0000-0000-0000-000000000000';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

/** Hoje no fuso do produto, nao no fuso do runtime (que e UTC). */
function hojeSP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function somaDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`); // meio-dia evita virada por DST
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diffDias(de: string, ate: string): number {
  const ms = Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`);
  return Math.round(ms / 86400000) + 1;
}

/** {preset} ou {from,to}. O periodo e sempre fechado nos dois extremos. */
function resolvePeriodo(p: Record<string, string> = {}): { from: string; to: string } {
  if (p.from && p.to) return { from: p.from, to: p.to };
  const hoje = hojeSP();
  switch (p.preset || 'last_30d') {
    case 'today':      return { from: hoje, to: hoje };
    case 'yesterday':  return { from: somaDias(hoje, -1), to: somaDias(hoje, -1) };
    case 'last_7d':    return { from: somaDias(hoje, -6), to: hoje };
    case 'last_30d':   return { from: somaDias(hoje, -29), to: hoje };
    case 'this_month': return { from: `${hoje.slice(0, 7)}-01`, to: hoje };
    case 'last_month': {
      const primeiro = `${hoje.slice(0, 7)}-01`;
      const fim = somaDias(primeiro, -1);
      return { from: `${fim.slice(0, 7)}-01`, to: fim };
    }
    default:           return { from: somaDias(hoje, -29), to: hoje };
  }
}

const COLUNAS =
  'day, store, campaign_id, category_id, product_id, clicks, orders, items,' +
  'orders_approved, orders_pending, orders_cancelled, orders_unpaid,' +
  'gross_revenue, refund_amount, commission_approved, commission_pending,' +
  'commission_rejected, ad_spend';

type Linha = Record<string, string | number>;

const n = (v: string | number | null | undefined) => Number(v ?? 0);

function zerado() {
  return {
    clicks: 0, orders: 0, items: 0,
    orders_approved: 0, orders_pending: 0, orders_cancelled: 0, orders_unpaid: 0,
    gross_revenue: 0, refund_amount: 0,
    commission_approved: 0, commission_pending: 0, commission_rejected: 0,
    ad_spend: 0,
  };
}

function acumula(alvo: Record<string, number>, l: Linha) {
  for (const k of Object.keys(alvo)) alvo[k] += n(l[k]);
  return alvo;
}

/**
 * Metricas derivadas. Divisao por zero devolve `null`, e nao 0: nao ha
 * conversao "de 0%" quando nao houve clique — dizer 0 seria inventar um dado
 * ruim onde a resposta honesta e "nao da para calcular".
 */
function derivadas(b: Record<string, number>) {
  const projetada = b.commission_approved + b.commission_pending;
  const liquida = b.gross_revenue - b.refund_amount;
  return {
    ...b,
    commission_projected: projetada,
    net_revenue: liquida,
    conversion_rate: b.clicks > 0 ? b.orders / b.clicks : null,
    epc: b.clicks > 0 ? projetada / b.clicks : null,
    aov: b.orders > 0 ? b.gross_revenue / b.orders : null,
    // Sem integracao de Ads o ad_spend e sempre 0; ROI fica null em vez de
    // fingir lucro infinito.
    roi: b.ad_spend > 0 ? (b.commission_approved - b.ad_spend) / b.ad_spend : null,
    net_profit: b.ad_spend > 0 ? b.commission_approved - b.ad_spend : null,
  };
}

function comparaTotais(atual: Record<string, number | null>, anterior: Record<string, number | null>) {
  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(atual)) {
    const p = anterior[k];
    const mudou = typeof v === 'number' && typeof p === 'number' && p !== 0
      ? ((v - p) / Math.abs(p)) * 100
      : null;
    saida[k] = { value: v, previous: p ?? null, changePct: mudou === null ? null : Number(mudou.toFixed(2)) };
  }
  return saida;
}

const CAMPO_DIM: Record<string, string> = {
  store: 'store',
  campaign: 'campaign_id',
  category: 'category_id',
  product: 'product_id',
};

const ROTULO_DIM: Record<string, { tabela: string; coluna: string }> = {
  campaign: { tabela: 'dim_campaign', coluna: 'display_name' },
  category: { tabela: 'dim_category', coluna: 'name' },
  product: { tabela: 'dim_product', coluna: 'name' },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'UNAUTHORIZED' }, 401);

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } }, db: { schema: 'megaresults' } },
  );

  // deno-lint-ignore no-explicit-any
  let corpo: Record<string, any> = {};
  try {
    corpo = await req.json();
  } catch {
    corpo = {}; // corpo vazio e valido: cai nos defaults (ultimos 30 dias)
  }

  const periodo = resolvePeriodo(corpo.period);
  const dias = diffDias(periodo.from, periodo.to);
  if (!(dias > 0) || dias > 400) {
    return json({ error: 'BAD_PERIOD', message: 'Periodo invalido ou maior que 400 dias.' }, 400);
  }
  const dimensoes: string[] = (corpo.dimensions || []).filter((d: string) => d in CAMPO_DIM);
  const limite = Math.min(Number(corpo.limit) || 50, 500);

  // Periodo anterior de mesmo tamanho, colado no inicio do atual.
  const anterior = { from: somaDias(periodo.from, -dias), to: somaDias(periodo.from, -1) };

  const [atualRes, anteriorRes, sujosRes] = await Promise.all([
    db.from('rollup_daily').select(COLUNAS).gte('day', periodo.from).lte('day', periodo.to),
    db.from('rollup_daily').select(COLUNAS).gte('day', anterior.from).lte('day', anterior.to),
    db.from('rollup_dirty').select('day').gte('day', periodo.from).lte('day', periodo.to).limit(1),
  ]);

  if (atualRes.error) return json({ error: 'DB_ERROR', message: atualRes.error.message }, 500);

  const linhas = (atualRes.data || []) as Linha[];

  // ---- totais e comparacao -------------------------------------------------
  const totaisAtual = derivadas(linhas.reduce((a, l) => acumula(a, l), zerado()));
  const totaisAnterior = derivadas(((anteriorRes.data || []) as Linha[]).reduce((a, l) => acumula(a, l), zerado()));

  // ---- serie por dia -------------------------------------------------------
  const porDia = new Map<string, Record<string, number>>();
  for (const l of linhas) {
    const dia = String(l.day);
    porDia.set(dia, acumula(porDia.get(dia) || zerado(), l));
  }
  // Dia sem movimento vira zero explicito: buraco no meio da serie faz o
  // grafico mentir sobre a forma da curva.
  const series = [];
  for (let d = periodo.from; d <= periodo.to; d = somaDias(d, 1)) {
    series.push({ bucket: d, ...derivadas(porDia.get(d) || zerado()) });
  }

  // ---- breakdown por dimensao ---------------------------------------------
  let breakdown: Record<string, unknown>[] = [];
  if (dimensoes.length) {
    const grupos = new Map<string, { chaves: Record<string, string>; b: Record<string, number> }>();
    for (const l of linhas) {
      const chaves: Record<string, string> = {};
      for (const d of dimensoes) chaves[d] = String(l[CAMPO_DIM[d]]);
      const k = JSON.stringify(chaves);
      const atual = grupos.get(k) || { chaves, b: zerado() };
      acumula(atual.b, l);
      grupos.set(k, atual);
    }

    // Rotulos das dimensoes de dimensao (campanha, categoria, produto) em uma
    // consulta por tipo, e nao uma por linha.
    const rotulos: Record<string, Map<string, string>> = {};
    for (const d of dimensoes) {
      const fonte = ROTULO_DIM[d];
      if (!fonte) continue;
      const ids = [...new Set([...grupos.values()].map((g) => g.chaves[d]))].filter((i) => i !== SENTINELA);
      if (!ids.length) continue;
      const { data } = await db.from(fonte.tabela).select(`id, ${fonte.coluna}`).in('id', ids);
      rotulos[d] = new Map((data || []).map((r: Record<string, string>) => [r.id, r[fonte.coluna]]));
    }

    breakdown = [...grupos.values()]
      .map((g) => {
        const linha: Record<string, unknown> = { ...derivadas(g.b) };
        for (const d of dimensoes) {
          linha[d] = g.chaves[d] === SENTINELA ? null : g.chaves[d];
          if (ROTULO_DIM[d]) {
            linha[`${d}Label`] = g.chaves[d] === SENTINELA
              ? 'Sem atribuicao'
              : rotulos[d]?.get(g.chaves[d]) ?? null;
          }
        }
        return linha;
      })
      .sort((a, b) => Number(b.commission_projected) - Number(a.commission_projected))
      .slice(0, limite);
  }

  return json({
    data: {
      totals: comparaTotais(totaisAtual, totaisAnterior),
      series,
      breakdown,
      meta: {
        timezone: TZ,
        currency: CURRENCY,
        period: periodo,
        comparedTo: anterior,
        computedAt: new Date().toISOString(),
        source: 'rollup_daily',
        // Honestidade sobre completude (doc 05 secao 6): ha dia do periodo ainda
        // na fila de agregacao, entao o numero pode mudar nos proximos minutos.
        partial: (sujosRes.data || []).length > 0,
      },
    },
  });
});
