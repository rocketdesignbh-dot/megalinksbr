/**
 * mr-ingest — Mega Results / Mega Links BR
 *
 * Servico de ingestao de relatorios de afiliado. Existe fora das Edge Functions
 * porque streaming de CSV com centenas de milhares de linhas excede o envelope
 * de CPU e wall-clock delas (doc 14 §6.1).
 *
 * Endpoints:
 *  - POST /import              multipart; campos: file, ownerId, connectionId, store
 *                              opcionais: method, sourceTimezone e force ("importar
 *                              mesmo assim" um arquivo ja processado)
 *  - GET  /import/:id/stream   progresso ao vivo por SSE
 *  - GET  /health              estado do servico
 */

'use strict';

const express = require('express');
const Busboy = require('busboy');
const dotenv = require('dotenv');
const crypto = require('crypto');

// dotenv ANTES dos requires locais. supabase.js e upsert.js leem process.env, e
// carregar o .env depois deles deixaria a configuracao invisivel para eles.
dotenv.config();

const { runPipeline } = require('./pipeline');
const { loadFieldMapping, db, serviceKey } = require('./supabase');
const upsert = require('./upsert');

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS — lista de origens em vez de '*'. Vale so para navegador: a Edge
// Function e o cron chamam sem cabecalho `Origin` e nao sao afetados. Quem
// manda e ALLOWED_ORIGINS (lista separada por virgula) no EasyPanel; sem ela
// valem os dominios do painel abaixo.
const ORIGENS_PADRAO = [
  'https://www.megalinksbr.com.br',
  'https://megalinksbr.com.br'
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || ORIGENS_PADRAO.join(','))
  .split(',').map((s) => s.trim()).filter(Boolean);
console.log(`[CORS] origens permitidas: ${ALLOWED_ORIGINS.join(', ')}`);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const permitida = !!origin && ALLOWED_ORIGINS.includes(origin);
  if (permitida) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  } else if (origin) {
    // Nao derruba a requisicao: so nao devolve o cabecalho, e o navegador barra
    // sozinho. O log existe para medir se alguma origem legitima ficou de fora.
    console.warn(`[CORS] origem recusada: ${origin} (${req.method} ${req.path})`);
  }
  if (req.method === 'OPTIONS') return res.sendStatus(permitida ? 200 : 403);
  next();
});

const PORT = process.env.PORT || 8080;
const MR_INGEST_TOKEN = process.env.MR_INGEST_TOKEN;
// Toda a configuracao obrigatoria e conferida AQUI, no boot. Descobrir que
// falta chave na primeira requisicao significa um container que passa no
// healthcheck e so falha quando o usuario ja subiu o arquivo.
for (const [nome, valor] of [['MR_INGEST_TOKEN', MR_INGEST_TOKEN],
                             ['SUPABASE_SERVICE_ROLE_KEY', serviceKey()]]) {
  if (!valor) {
    console.error(`${nome} nao configurado. Configure no EasyPanel antes de iniciar.`);
    process.exit(1);
  }
}
const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES || 200 * 1024 * 1024);

/**
 * Dois tipos de chamador:
 *
 *  - servico (Edge Function, cron): apresenta o MR_INGEST_TOKEN e diz por qual
 *    ownerId esta importando.
 *  - usuario final (navegador): apresenta o access token do Supabase. O
 *    ownerId NAO vem do formulario nesse caso — vem do proprio token. O
 *    MR_INGEST_TOKEN nunca pode ir para o navegador: e segredo compartilhado,
 *    e quem o tivesse importaria em nome de qualquer pessoa.
 */
async function authorize(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  // Comparacao em tempo constante: o token de servico e um segredo compartilhado.
  if (token.length === MR_INGEST_TOKEN.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(MR_INGEST_TOKEN))) {
    req.caller = { kind: 'service' };
    return next();
  }

  // Nao bateu como token de servico: pode ser JWT de usuario. Quem valida a
  // assinatura e o proprio Supabase — decodificar o payload aqui e confiar no
  // `sub` seria aceitar qualquer token forjado.
  try {
    const { data, error } = await db().auth.getUser(token);
    // Dois motivos muito diferentes caem aqui: o token do usuario e ruim, ou a
    // NOSSA service key morreu (revogada, trocada, digitada errado). Sem
    // distinguir, o servico culpa o usuario por um problema que e dele mesmo —
    // e foi exatamente isso que aconteceu em 11/08, com 401 sem rastro nenhum.
    if (error) {
      const chaveMorta = error.status === 401 || /api key|apikey|invalid.*key/i.test(error.message || '');
      console.error(chaveMorta
        ? `[mr-ingest] SUPABASE_SERVICE_ROLE_KEY parece invalida — o Supabase recusou NOSSA chave: ${error.message}`
        : `[mr-ingest] token de usuario recusado: ${error.message}`);
      return res.status(chaveMorta ? 500 : 401).json(chaveMorta
        ? { error: 'INTERNAL', message: 'Nao foi possivel verificar sua sessao.' }
        : { error: 'unauthorized' });
    }
    if (!data?.user) return res.status(401).json({ error: 'unauthorized' });
    req.caller = { kind: 'user', userId: data.user.id };
    return next();
  } catch (e) {
    console.error('[mr-ingest] falha ao validar token de usuario:', e.message);
    return res.status(401).json({ error: 'unauthorized' });
  }
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
    // Chamada de usuario ignora o ownerId do formulario: o dono e quem o token
    // diz que e. Sem isso um usuario logado importaria para a conta de outro.
    const ownerId = req.caller.kind === 'user' ? req.caller.userId : fields.ownerId;
    const { connectionId, store } = fields;
    // "Importar mesmo assim" da tela de DUPLICATE_FILE (doc 08 §12).
    const force = /^(1|true|sim)$/i.test(String(fields.force || ''));
    if (!ownerId || !connectionId || !store) {
      fileStream.resume();
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'ownerId, connectionId e store sao obrigatorios' });
    }

    // Trava de acesso: o piloto vale tambem para a ingestao. Sem ela uma conta
    // fora do piloto processaria o arquivo inteiro para depois receber 403 no
    // dashboard — dado gravado que o dono nao consegue ler. Falha na consulta
    // nega: nao da para liberar ingestao "no escuro" so porque o banco piscou.
    let liberado = false;
    try {
      const { data, error } = await db().rpc('mr_habilitado', { uid: ownerId });
      if (error) throw new Error(error.message);
      liberado = data === true;
    } catch (e) {
      fileStream.resume();
      console.error('[mr-ingest] nao foi possivel verificar o acesso ao modulo:', e.message);
      return res.status(500).json({ error: 'INTERNAL', message: 'Nao foi possivel verificar o acesso ao modulo.' });
    }
    if (!liberado) {
      fileStream.resume();
      return res.status(403).json({
        error: 'MODULE_DISABLED',
        message: 'O Mega Results ainda nao esta liberado para esta conta.',
      });
    }

    let checksum = null;
    let fileBytes = 0;
    const tap = require('./parse').checksumTap((digest, bytes) => { checksum = digest; fileBytes = bytes; });

    let truncated = false;
    fileStream.on('limit', () => { truncated = true; });

    // O import_batch nasce antes do parsing: se o processo cair no meio, o
    // registro fica em `parsing` e a reconciliacao enxerga o orfao.
    // O try e obrigatorio: este handler e async, e uma excecao aqui vira
    // unhandled rejection, que no Node 20+ derruba o processo inteiro. Uma
    // requisicao ruim nunca pode matar o servico.
    let batch, batchErr;
    try {
      ({ data: batch, error: batchErr } = await db()
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
        .single());
    } catch (e) {
      fileStream.resume();
      console.error('[mr-ingest] nao foi possivel abrir o lote:', e.message);
      if (!res.headersSent) res.status(500).json({ error: 'INTERNAL', message: e.message });
      return;
    }

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

      // Nivel 1 de protecao contra duplicata (doc 08 §12). A checagem so pode
      // acontecer aqui: o checksum e do arquivo inteiro e so existe depois que
      // o ultimo byte passou pelo tap. As linhas ja foram para o sink, mas o
      // dedupe por linha (nivel 2) as tratou como no-op — nada foi duplicado.
      const previo = await upsert.findByChecksum({ connectionId, checksum, exceptId: importId });
      if (previo && !force) {
        const quando = new Date(previo.created_at)
          .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const err = new Error(`Este arquivo ja foi importado em ${quando}.`);
        err.code = 'DUPLICATE_FILE';
        err.details = { previousImportId: previo.id, importedAt: previo.created_at };
        throw err;
      }

      await upsert.saveIssues(ownerId, importId, result.issues);
      await upsert.updateBatch(importId, {
        dataset: result.plan.dataset,
        status: 'completed',
        // Reimportacao deliberada (force): o checksum vai nulo. `idx_import_dedupe`
        // recusaria o par (connection_id, checksum) que ja existe em `completed`,
        // e a recusa derruba o UPDATE inteiro — foi assim que um lote ficou preso
        // em `parsing`. O indice e parcial em file_checksum IS NOT NULL, entao
        // nulo passa, ao custo de esse lote nao participar da dedupe por arquivo.
        file_checksum: previo ? null : checksum,
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
      // Este UPDATE toca so status/mensagem, nenhuma coluna do indice unico,
      // entao ele passa mesmo quando o UPDATE de `completed` foi recusado.
      // Ainda assim vai protegido: se ate a marcacao de falha falhar, o lote
      // fica orfao em `parsing` e quem precisa saber e a reconciliacao — nao
      // pode virar unhandled rejection e derrubar o servico.
      try {
        await upsert.updateBatch(importId, {
          status: 'failed',
          error_message: `${e.code || 'ERROR'}: ${e.message}`,
          finished_at: new Date().toISOString(),
        });
      } catch (falhaAoFechar) {
        console.error(`[mr-ingest] lote ${importId} ficou orfao em parsing:`, falhaAoFechar.message);
      }
      publish(importId, { stage: 'failed', code: e.code || 'ERROR', message: e.message, details: e.details });
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
