'use strict';

/**
 * Orquestracao do pipeline (doc 08 §1). Streaming do inicio ao fim: nenhuma
 * etapa acumula o arquivo inteiro, so o lote corrente de BATCH_SIZE linhas.
 *
 * Exposto como funcao pura de I/O para que test/dry-run.js rode o mesmo caminho
 * sem banco, com `sink` injetado.
 */

const parseMod = require('./parse');
const mappingMod = require('./mapping');
const normalizeMod = require('./normalize');

const MAX_ERROR_RATE = Number(process.env.MAX_ERROR_RATE || 0.3);

/**
 * @param {ReadableStream} stream    conteudo do arquivo
 * @param {object} opts
 * @param {string} opts.store       enum public.marketplace
 * @param {string} opts.sourceTimezone
 * @param {Array}  opts.mappingRows linhas de field_mapping
 * @param {number} opts.batchSize
 * @param {function} opts.sink      async ({dataset, rows}) => {inserted, updated, skipped}
 * @param {function} [opts.onProgress]
 */
async function runPipeline(stream, opts) {
  const { head, stream: replayed } = await parseMod.sniff(stream);
  const plan = parseMod.planFromHead(head);

  if (!plan.dataset) {
    const err = new Error('Nao reconhecemos este formato. Quer mapear as colunas manualmente?');
    err.code = 'UNKNOWN_NETWORK';
    err.details = { headers: plan.headers, signature: plan.signature };
    throw err;
  }

  // O mapeamento so pode ser escolhido DEPOIS de o dataset ser conhecido:
  // "Tempo dos Cliques" existe nos dois relatorios da Shopee e significa
  // coisas diferentes (clickedAt na transacao, occurredAt no clique). Carregar
  // os dois conjuntos juntos faria um sobrescrever o outro.
  const mappingRows = typeof opts.loadMapping === 'function'
    ? await opts.loadMapping(plan.dataset)
    : (opts.mappingRows || []).filter((r) => !r.dataset || r.dataset === plan.dataset);

  if (!mappingRows.length) {
    const err = new Error('Nao ha mapeamento cadastrado para esta loja e tipo de relatorio.');
    err.code = 'UNKNOWN_NETWORK';
    err.details = { dataset: plan.dataset, headers: plan.headers };
    throw err;
  }

  const columnPlan = mappingMod.buildColumnPlan(plan.headers, mappingRows);

  if (columnPlan.missingRequired.length) {
    const err = new Error(`Falta a coluna de ${columnPlan.missingRequired[0]}. Ela e necessaria para calcular comissao.`);
    err.code = 'MISSING_REQUIRED_COLUMN';
    err.details = { missing: columnPlan.missingRequired };
    throw err;
  }

  const headerIndex = new Map(plan.headers.map((h, i) => [h, i]));
  const ctx = {
    store: opts.store,
    sourceTimezone: opts.sourceTimezone || 'America/Sao_Paulo',
    currency: opts.currency || 'BRL',
    headerIndex,
  };

  const batchSize = opts.batchSize || 5000;
  const normalizeRow = plan.dataset === 'click' ? normalizeMod.normalizeClick : normalizeMod.normalizeTransaction;

  const stats = { total: 0, valid: 0, inserted: 0, updated: 0, skipped: 0, issues: 0 };
  const issues = [];
  let batch = [];
  let rowNumber = plan.headerRow + 1; // 1-based, ja contando o cabecalho

  const flush = async () => {
    if (batch.length === 0) return;
    const { rows, issues: dupIssues } = normalizeMod.dedupeBatch(batch);
    for (const i of dupIssues) issues.push(i);
    stats.issues += dupIssues.length;

    const res = await opts.sink({ dataset: plan.dataset, rows });
    stats.inserted += res.inserted || 0;
    stats.updated += res.updated || 0;
    stats.skipped += res.skipped || 0;
    batch = [];
    if (opts.onProgress) opts.onProgress({ stage: 'loading', ...stats });
  };

  for await (const cells of parseMod.rowStream(replayed, plan)) {
    rowNumber++;
    stats.total++;

    const applied = mappingMod.applyPlan(columnPlan, cells, ctx);
    const canonical = applied.canonical;
    canonical._raw = applied.raw;

    const { row, issues: rowIssues } = normalizeRow(canonical, ctx);
    for (const i of rowIssues) {
      issues.push({ ...i, row_number: rowNumber });
      stats.issues++;
    }
    for (const i of applied.issues) {
      issues.push({ ...i, row_number: rowNumber });
      stats.issues++;
    }

    if (!row) continue; // linha invalida: virou issue, o arquivo segue
    stats.valid++;
    batch.push(row);

    if (batch.length >= batchSize) await flush();

    // Guarda de sanidade: acima de 30% de linhas rejeitadas o problema quase
    // sempre e o mapeamento, nao o dado. Continuar so gastaria banco.
    if (stats.total >= 200 && (stats.total - stats.valid) / stats.total > MAX_ERROR_RATE) {
      const pct = Math.round(((stats.total - stats.valid) / stats.total) * 100);
      const err = new Error(`${pct}% das linhas falharam. Provavelmente o mapeamento esta errado.`);
      err.code = 'TOO_MANY_ERRORS';
      err.details = { stats, issues: issues.slice(0, 20) };
      throw err;
    }
  }

  await flush();

  return { plan, columnPlan, stats, issues };
}

module.exports = { runPipeline };
