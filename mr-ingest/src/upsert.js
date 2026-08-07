'use strict';

/**
 * Carga em lote (doc 08 §8).
 *
 * Todo o trabalho pesado — resolucao de dimensoes, upsert condicional,
 * historico de status e marcacao de rollup — acontece em uma unica funcao
 * Postgres por lote. Motivo: PostgREST nao expressa `ON CONFLICT ... DO UPDATE
 * ... WHERE`, e sem esse WHERE reimportar um mes inalterado reescreveria cada
 * linha, gerando I/O gratuito num banco compartilhado com o resto do MegaLinks.
 */

const { db } = require('./supabase');

const BATCH_SIZE = Number(process.env.BATCH_SIZE || 5000);

async function flushTransactions({ ownerId, connectionId, importId, store, rows }) {
  if (rows.length === 0) return { inserted: 0, updated: 0, skipped: 0, total: 0 };
  const { data, error } = await db().rpc('ingest_transactions', {
    p_owner: ownerId,
    p_connection: connectionId,
    p_import: importId,
    p_store: store,
    p_rows: rows,
  });
  if (error) throw new Error(`ingest_transactions falhou: ${error.message}`);
  return data;
}

async function flushClicks({ ownerId, connectionId, importId, store, rows }) {
  if (rows.length === 0) return { inserted: 0, updated: 0, skipped: 0, total: 0 };
  const { data, error } = await db().rpc('ingest_clicks', {
    p_owner: ownerId,
    p_connection: connectionId,
    p_import: importId,
    p_store: store,
    p_rows: rows,
  });
  if (error) throw new Error(`ingest_clicks falhou: ${error.message}`);
  return data;
}

/** Grava os problemas encontrados. Nunca derruba a importacao por causa deles. */
async function saveIssues(ownerId, importId, issues) {
  if (!issues.length) return;
  // Teto por lote: um mapeamento errado geraria uma linha de issue por linha do
  // arquivo, e o diagnostico util esta nas primeiras.
  const capped = issues.slice(0, 1000).map((i) => ({
    import_id: importId,
    owner_id: ownerId,
    row_number: i.row_number ?? null,
    severity: i.severity || 'error',
    field: i.field || null,
    code: i.code,
    message: i.message,
    raw_value: i.raw_value == null ? null : String(i.raw_value).slice(0, 500),
  }));
  const { error } = await db().from('import_issue').insert(capped);
  if (error) console.error('[mr-ingest] falha ao gravar import_issue:', error.message);
}

async function updateBatch(importId, patch) {
  const { error } = await db().from('import_batch').update(patch).eq('id', importId);
  if (error) console.error('[mr-ingest] falha ao atualizar import_batch:', error.message);
}

/** Arquivo identico ja processado -> 409 (doc 08 §12, DUPLICATE_FILE). */
async function findByChecksum(ownerId, checksum) {
  const { data, error } = await db()
    .from('import_batch')
    .select('id, created_at, status')
    .eq('owner_id', ownerId)
    .eq('file_checksum', checksum)
    .in('status', ['completed', 'loading', 'aggregating'])
    .limit(1);
  if (error) return null;
  return (data && data[0]) || null;
}

module.exports = { flushTransactions, flushClicks, saveIssues, updateBatch, findByChecksum, BATCH_SIZE };
