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
  const { Readable } = require('stream');
  const chunks = [];
  let size = 0;

  // NAO usar `for await ... break`: sair do laco de um async iterator destroi o
  // stream de origem (AbortError). Com arquivo pequeno o stream acabava antes
  // do break e o defeito ficava invisivel; com 22 MB ele aborta sempre.
  // Modo pausado + read() le so o necessario e deixa o resto intacto.
  await new Promise((resolve, reject) => {
    const cleanup = () => {
      stream.removeListener('readable', onReadable);
      stream.removeListener('end', onEnd);
      stream.removeListener('error', onError);
    };
    const onReadable = () => {
      let chunk;
      while ((chunk = stream.read()) !== null) {
        chunks.push(chunk);
        size += chunk.length;
        if (size >= bytes) { cleanup(); return resolve(); }
      }
    };
    const onEnd = () => { cleanup(); resolve(); };
    const onError = (e) => { cleanup(); reject(e); };
    stream.on('readable', onReadable);
    stream.on('end', onEnd);
    stream.on('error', onError);
  });

  const head = Buffer.concat(chunks);

  // Arquivo menor que a janela de sniff: ja acabou, e unshift apos o 'end'
  // lanca. O conteudo inteiro esta em `head`, entao basta reemiti-lo.
  if (stream.readableEnded) return { head, stream: Readable.from([head]) };

  // Devolve os bytes lidos ao proprio stream, que segue de onde parou.
  if (head.length) stream.unshift(head);
  return { head, stream };
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
