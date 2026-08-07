/**
 * mr-ingest — Mega Results / Mega Links BR
 *
 * Servico de ingestao de relatorios de afiliado. Existe fora das Edge Functions
 * porque streaming de CSV com centenas de milhares de linhas excede o envelope
 * de CPU e wall-clock delas (doc 14 §6.1).
 *
 * Endpoints:
 *  - POST /import              multipart; campos: file, ownerId, connectionId, store
 *  - GET  /import/:id/stream   progresso ao vivo por SSE
 *  - GET  /health              estado do servico
 */

'use strict';

const express = require('express');
const Busboy = require('busboy');
const dotenv = require('dotenv');
const crypto = require('crypto');

const { runPipeline } = require('./pipeline');
const { loadFieldMapping, db } = require('./supabase');
const upsert = require('./upsert');

dotenv.config();

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 8080;
const MR_INGEST_TOKEN = process.env.MR_INGEST_TOKEN;
if (!MR_INGEST_TOKEN) {
  console.error('MR_INGEST_TOKEN nao configurado. Configure no EasyPanel antes de iniciar.');
  process.exit(1);
}
const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES || 200 * 1024 * 1024);

function authorize(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  // Comparacao em tempo constante: o token e um segredo compartilhado.
  const ok = token.length === MR_INGEST_TOKEN.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(MR_INGEST_TOKEN));
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// Progresso por import_id, para o SSE. Em memoria de proposito: e efemero e
// some com o processo, o estado durável vive em megaresults.import_batch.
const PROGRESS = new Map();

function publish(importId, payload) {
  const entry = PROGRESS.get(importId);
  if (!entry) return;
  entry.last = payload;
  for (const res of entry.listeners) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'mr-ingest', uptime: process.uptime(), imports: PROGRESS.size });
});

app.post('/import', authorize, (req, res) => {
  let bb;
  try {
    bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_FILE_BYTES } });
  } catch (e) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Esperado multipart/form-data' });
  }

  const fields = {};
  let handled = false;

  bb.on('field', (name, val) => { fields[name] = val; });

  bb.on('file', async (_name, fileStream, info) => {
    handled = true;
    const { ownerId, connectionId, store } = fields;
    if (!ownerId || !connectionId || !store) {
      fileStream.resume();
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'ownerId, connectionId e store sao obrigatorios' });
    }

    let checksum = null;
    let fileBytes = 0;
    const tap = require('./parse').checksumTap((digest, bytes) => { checksum = digest; fileBytes = bytes; });

    let truncated = false;
    fileStream.on('limit', () => { truncated = true; });

    // O import_batch nasce antes do parsing: se o processo cair no meio, o
    // registro fica em `parsing` e a reconciliacao enxerga o orfao.
    const { data: batch, error: batchErr } = await db()
      .from('import_batch')
      .insert({
        owner_id: ownerId,
        connection_id: connectionId,
        dataset: 'transaction', // corrigido apos a deteccao
        status: 'parsing',
        source_method: fields.method || 'upload',
        file_name: info.filename || null,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (batchErr) {
      fileStream.resume();
      return res.status(500).json({ error: 'DB_ERROR', message: batchErr.message });
    }

    const importId = batch.id;
    PROGRESS.set(importId, { listeners: new Set(), last: { stage: 'parsing' } });
    res.status(202).json({ importId, status: 'parsing' });

    try {
      const result = await runPipeline(fileStream.pipe(tap), {
        store,
        sourceTimezone: fields.sourceTimezone || 'America/Sao_Paulo',
        loadMapping: (dataset) => loadFieldMapping({ store, dataset, ownerId }),
        batchSize: upsert.BATCH_SIZE,
        onProgress: (p) => publish(importId, p),
        sink: async ({ dataset, rows }) => {
          const fn = dataset === 'click' ? upsert.flushClicks : upsert.flushTransactions;
          return fn({ ownerId, connectionId, importId, store, rows });
        },
      });

      if (truncated) throw Object.assign(new Error('Arquivo acima do limite configurado.'), { code: 'FILE_TOO_LARGE' });

      await upsert.saveIssues(ownerId, importId, result.issues);
      await upsert.updateBatch(importId, {
        dataset: result.plan.dataset,
        status: 'completed',
        file_checksum: checksum,
        file_size: fileBytes,
        rows_total: result.stats.total,
        rows_valid: result.stats.valid,
        rows_inserted: result.stats.inserted,
        rows_updated: result.stats.updated,
        rows_skipped: result.stats.skipped,
        finished_at: new Date().toISOString(),
      });
      publish(importId, { stage: 'completed', ...result.stats });
    } catch (e) {
      await upsert.updateBatch(importId, {
        status: 'failed',
        error_message: `${e.code || 'ERROR'}: ${e.message}`,
        finished_at: new Date().toISOString(),
      });
      publish(importId, { stage: 'failed', code: e.code || 'ERROR', message: e.message });
    } finally {
      setTimeout(() => PROGRESS.delete(importId), 5 * 60 * 1000);
    }
  });

  bb.on('close', () => {
    if (!handled && !res.headersSent) res.status(400).json({ error: 'BAD_REQUEST', message: 'Nenhum arquivo enviado' });
  });

  req.pipe(bb);
});

app.get('/import/:id/stream', authorize, (req, res) => {
  const importId = req.params.id;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const entry = PROGRESS.get(importId);
  if (!entry) {
    res.write(`data: ${JSON.stringify({ stage: 'unknown' })}\n\n`);
    return res.end();
  }
  entry.listeners.add(res);
  res.write(`data: ${JSON.stringify(entry.last)}\n\n`);
  req.on('close', () => entry.listeners.delete(res));
});

app.listen(PORT, () => {
  console.log(`[mr-ingest] ouvindo na porta ${PORT}`);
});

module.exports = app;
