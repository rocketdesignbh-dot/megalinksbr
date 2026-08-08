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

/**
 * Fecha (ou corrige) o lote. LANCA em caso de erro de proposito: engolir a
 * falha aqui deixava o lote preso em `parsing` para sempre, sem `finished_at`
 * e sem mensagem — o UPDATE de `completed` pode ser recusado inteiro por
 * `idx_import_dedupe`, e quem chama precisa saber disso para marcar o lote
 * como `failed`.
 */
async function updateBatch(importId, patch) {
  const { error } = await db().from('import_batch').update(patch).eq('id', importId);
  if (error) throw new Error(`falha ao atualizar import_batch: ${error.message}`);
}

/**
 * Arquivo identico ja processado (doc 08 §12, DUPLICATE_FILE).
 *
 * A busca e por `connection_id`, e nao por `owner_id`, para casar exatamente
 * com `idx_import_dedupe` — unique (connection_id, file_checksum) WHERE
 * file_checksum IS NOT NULL AND status = 'completed'. Procurar por um par
 * diferente do que o indice cobre deixaria passar caso que o banco recusa
 * depois, que foi como o lote orfao apareceu.
 *
 * `exceptId` exclui o proprio lote em andamento.
 */
async function findByChecksum({ connectionId, checksum, exceptId }) {
  let q = db()
    .from('import_batch')
    .select('id, created_at, file_name')
    .eq('connection_id', connectionId)
    .eq('file_checksum', checksum)
    .eq('status', 'completed')
    .limit(1);
  if (exceptId) q = q.neq('id', exceptId);
  const { data, error } = await q;
  // Sem resposta confiavel nao da para afirmar que nao e duplicata: seguir em
  // frente esbarraria no indice e travaria o lote. Melhor falhar com motivo.
  if (error) throw new Error(`falha ao checar duplicata por checksum: ${error.message}`);
  return (data && data[0]) || null;
}

module.exports = { flushTransactions, flushClicks, saveIssues, updateBatch, findByChecksum, BATCH_SIZE };
