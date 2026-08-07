'use strict';

/**
 * Parsing em stream (doc 08 §5). Uso de memoria constante, independente do
 * tamanho do arquivo — o que justifica este servico existir fora das Edge
 * Functions.
 */

const { parse } = require('csv-parse');
const { Transform } = require('stream');
const crypto = require('crypto');
const detect = require('./detect');

/**
 * Le os primeiros bytes de um stream sem consumi-los: devolve o buffer de sniff
 * e um novo stream com esses bytes recolocados na frente.
 */
async function sniff(stream, bytes = detect.SNIFF_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    chunks.push(chunk);
    size += chunk.length;
    if (size >= bytes) break;
  }
  const head = Buffer.concat(chunks);
  const { Readable } = require('stream');
  const replay = new Readable({ read() {} });
  replay.push(head);
  // O `for await` acima ja consumiu parte do stream; o resto e reemitido.
  stream.on('data', (c) => replay.push(c));
  stream.on('end', () => replay.push(null));
  stream.on('error', (e) => replay.destroy(e));
  if (stream.readableEnded) replay.push(null);
  return { head, stream: replay };
}

/** Decide formato/encoding/delimitador/cabecalho a partir do buffer de sniff. */
function planFromHead(head) {
  const format = detect.detectFormat(head);
  if (format !== 'csv') {
    const err = new Error('So aceitamos CSV neste momento. XLSX e ZIP entram na Fatia 2.');
    err.code = 'UNSUPPORTED_FORMAT';
    throw err;
  }

  const { encoding, bomBytes } = detect.detectEncoding(head);
  const text = head.slice(bomBytes).toString(encoding);
  const delimiter = detect.detectDelimiter(text);
  const headerRow = detect.detectHeaderRow(text, delimiter);

  const lines = text.split(/\r?\n/);
  const headers = detect.splitSimple(lines[headerRow] || '', delimiter).map((h) => h.trim());
  if (headers.length < 2) {
    const err = new Error('O arquivo nao tem linhas de dados. Confira se o periodo exportado esta correto.');
    err.code = 'EMPTY_FILE';
    throw err;
  }

  return {
    encoding, bomBytes, delimiter, headerRow, headers,
    signature: detect.headerSignature(headers),
    dataset: detect.detectDataset(headers),
  };
}

/**
 * Stream de linhas ja divididas em celulas, com o numero da linha no arquivo.
 * `relax_column_count` deliberadamente ligado: linha com contagem de colunas
 * errada vira import_issue e o resto do arquivo segue (doc 08 §5).
 */
function rowStream(stream, plan) {
  return stream.pipe(
    parse({
      delimiter: plan.delimiter,
      from_line: plan.headerRow + 2, // pula o cabecalho
      bom: true,
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
      trim: false,
      encoding: plan.encoding === 'latin1' ? 'latin1' : 'utf8',
    })
  );
}

/** SHA-256 do arquivo, calculado no mesmo passe — base do DUPLICATE_FILE. */
function checksumTap(onDigest) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  const t = new Transform({
    transform(chunk, _enc, cb) { hash.update(chunk); bytes += chunk.length; cb(null, chunk); },
    flush(cb) { onDigest(hash.digest('hex'), bytes); cb(); },
  });
  return t;
}

module.exports = { sniff, planFromHead, rowStream, checksumTap };
