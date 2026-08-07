'use strict';

/**
 * Normalizacao final e deduplicacao (doc 08 §6 e §8).
 *
 * Recebe o objeto canonico ja transformado por mapping.js e produz a linha
 * exatamente no formato que megaresults.ingest_transactions espera.
 */

const crypto = require('crypto');

const TXN_STATUS = new Set(['pending', 'approved', 'cancelled', 'refunded', 'unpaid', 'rejected']);
const ATTRIBUTION = new Set(['direct', 'indirect', 'unknown']);
const BUYER_KIND = new Set(['new', 'returning', 'unknown']);

function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * Chave de deduplicacao de transacao.
 *
 * O identificador natural de uma linha do relatorio e o trio
 * (pedido, item, variacao) — quantidade cobre repeticao do mesmo item.
 * O indice da linha NAO entra: era a falha T05 da referencia, onde reexportar
 * o mesmo periodo em outra ordem gerava chaves novas e duplicava tudo.
 */
function transactionDedupeKey(store, c) {
  const parts = [store, c.externalOrderId || '', c.externalItemId || '', c.externalVariantId || ''];
  return sha256(parts.join('|'));
}

function clickDedupeKey(store, c) {
  return sha256([store, c.externalClickId || ''].join('|'));
}

/**
 * Chave de campanha: canal + os cinco sub ids, normalizados. Determinstica,
 * entao a mesma combinacao sempre cai na mesma dim_campaign.
 */
function campaignKey(c) {
  const norm = (v) => (v == null ? '' : String(v).trim().toLowerCase());
  return [c.channel, c.subId1, c.subId2, c.subId3, c.subId4, c.subId5].map(norm).join('|');
}

function num(v, fallback = null) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * @returns {{row:object|null, issues:Array}}
 */
function normalizeTransaction(canonical, ctx) {
  const c = canonical;
  const issues = [];

  // R2: sem pedido ou sem data a linha nao existe para o modelo.
  if (!c.externalOrderId) {
    issues.push({ severity: 'error', field: 'externalOrderId', code: 'MISSING_REQUIRED', message: 'Linha sem ID do pedido' });
  }
  if (!c.occurredAt) {
    issues.push({ severity: 'error', field: 'occurredAt', code: 'MISSING_REQUIRED', message: 'Linha sem horario do pedido valido' });
  }
  if (issues.length) return { row: null, issues };

  let status = c.status;
  if (!TXN_STATUS.has(status)) {
    issues.push({ severity: 'warning', field: 'status', code: 'UNKNOWN_STATUS', message: `Status "${c.statusRaw || status}" desconhecido; tratado como pendente`, raw_value: c.statusRaw || String(status) });
    status = 'pending';
  }

  const attribution = ATTRIBUTION.has(c.attribution) ? c.attribution : 'unknown';
  const buyerKind = BUYER_KIND.has(c.buyerKind) ? c.buyerKind : 'unknown';

  const grossRevenue = num(c.grossRevenue, 0);
  const commissionNet = num(c.commissionNet, 0);
  const commissionGross = num(c.commissionGross, commissionNet);
  const platformFee = num(c.platformFee, 0);

  // A taxa efetiva nao vem no arquivo — a Shopee entrega taxas por parcela.
  // Derivar aqui e o unico jeito de a coluna commission_rate significar sempre
  // a mesma coisa entre marketplaces.
  let commissionRate = null;
  if (grossRevenue > 0) commissionRate = Number((commissionNet / grossRevenue).toFixed(6));

  // Coerencia: liquido nao deveria exceder o bruto. Quando excede, o arquivo ou
  // o mapeamento esta errado — avisa, mas nao inventa numero.
  if (commissionGross > 0 && commissionNet > commissionGross + 1e-6) {
    issues.push({ severity: 'warning', field: 'commissionNet', code: 'NET_ABOVE_GROSS', message: 'Comissao liquida maior que a comissao bruta do item' });
  }

  const row = {
    dedupeKey: transactionDedupeKey(ctx.store, c),
    externalOrderId: c.externalOrderId,
    externalItemId: c.externalItemId || null,
    externalVariantId: c.externalVariantId || null,
    occurredAt: c.occurredAt,
    clickedAt: c.clickedAt || null,
    approvedAt: c.approvedAt || null,
    status,
    statusRaw: c.statusRaw || '',
    attribution,
    buyerKind,
    currency: c.currency || ctx.currency || 'BRL',
    quantity: num(c.quantity, 1),
    unitPrice: num(c.unitPrice),
    grossRevenue,
    refundAmount: num(c.refundAmount, 0),
    commissionGross,
    platformFee,
    commissionNet,
    commissionRate,
    offerType: c.offerType || null,
    merchantExternalId: c.merchantExternalId || null,
    merchantName: c.merchantName || null,
    merchantType: c.merchantType || null,
    productName: c.productName || null,
    categoryL1: c.categoryL1 || null,
    categoryL2: c.categoryL2 || null,
    categoryL3: c.categoryL3 || null,
    channel: c.channel || null,
    subId1: c.subId1 || null,
    subId2: c.subId2 || null,
    subId3: c.subId3 || null,
    subId4: c.subId4 || null,
    subId5: c.subId5 || null,
    campaignKey: campaignKey(c),
    raw: c._raw || {},
  };

  // status ja tem coluna propria (status_raw). Os demais enums so tem o valor
  // normalizado na tabela, entao o original fica em `raw` para a reconciliacao
  // poder explicar de onde veio a classificacao.
  if (c.attributionRaw) row.raw.attributionRaw = c.attributionRaw;
  if (c.buyerKindRaw) row.raw.buyerKindRaw = c.buyerKindRaw;

  return { row, issues };
}

function normalizeClick(canonical, ctx) {
  const c = canonical;
  const issues = [];

  if (!c.externalClickId) {
    issues.push({ severity: 'error', field: 'externalClickId', code: 'MISSING_REQUIRED', message: 'Linha sem ID do clique' });
  }
  if (!c.occurredAt) {
    issues.push({ severity: 'error', field: 'occurredAt', code: 'MISSING_REQUIRED', message: 'Linha sem tempo do clique valido' });
  }
  if (issues.length) return { row: null, issues };

  return {
    row: {
      dedupeKey: clickDedupeKey(ctx.store, c),
      externalClickId: c.externalClickId,
      occurredAt: c.occurredAt,
      channel: c.channel || null,
      subId1: c.subId1 || null,
      subId2: c.subId2 || null,
      subId3: c.subId3 || null,
      subId4: c.subId4 || null,
      subId5: c.subId5 || null,
      campaignKey: campaignKey(c),
      referrer: c.referrer || null,
      region: c.region || null,
      country: c.country || 'BR',
      device: c.device || null,
      os: c.os || null,
      browser: c.browser || null,
      isBot: c.isBot === true,
      shortLinkCode: c.shortLinkCode || null,
      raw: c._raw || {},
    },
    issues,
  };
}

/**
 * Colapsa duplicatas dentro do mesmo lote.
 *
 * Obrigatorio, nao opcional: o Postgres recusa um INSERT ... ON CONFLICT que
 * atinge a mesma linha duas vezes ("cannot affect row a second time"). Vence a
 * ultima ocorrencia, e cada colisao vira aviso para o usuario poder auditar.
 */
function dedupeBatch(rows) {
  const byKey = new Map();
  const issues = [];
  for (const r of rows) {
    const k = r.dedupeKey + '|' + r.occurredAt;
    if (byKey.has(k)) {
      issues.push({ severity: 'warning', field: 'dedupeKey', code: 'DUPLICATE_ROW_IN_FILE', message: 'Linha repetida no mesmo arquivo; prevaleceu a ultima ocorrencia', raw_value: r.externalOrderId || r.externalClickId });
    }
    byKey.set(k, r);
  }
  return { rows: [...byKey.values()], issues };
}

module.exports = {
  normalizeTransaction,
  normalizeClick,
  dedupeBatch,
  transactionDedupeKey,
  clickDedupeKey,
  campaignKey,
};
