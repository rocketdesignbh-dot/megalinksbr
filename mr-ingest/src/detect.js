'use strict';

/**
 * Deteccao de formato, encoding, delimitador, loja e dataset (doc 08 §3).
 *
 * Trabalha apenas sobre o "sniff" — os primeiros KB do arquivo. Nada aqui le o
 * arquivo inteiro, porque a decisao precisa sair antes de o parser comecar.
 */

const BOM_UTF8 = Buffer.from([0xef, 0xbb, 0xbf]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // tambem e o magic do XLSX
const DELIMITERS = [',', ';', '\t', '|'];

/** NFD, sem diacritico, minusculo, sem nao-alfanumerico (doc 08 §3.2). */
function normalizeHeader(h) {
  return String(h == null ? '' : h)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * XLSX e ZIP compartilham o magic number; so o conteudo interno separa os dois.
 * Como o mr-ingest ainda nao descompacta (Fatia 2), ambos caem em
 * UNSUPPORTED_FORMAT com mensagem propria em vez de virarem CSV corrompido.
 */
function detectFormat(head) {
  if (head.slice(0, 4).equals(ZIP_MAGIC)) return 'zip-or-xlsx';
  return 'csv';
}

function detectEncoding(head) {
  if (head.slice(0, 3).equals(BOM_UTF8)) return { encoding: 'utf8', bomBytes: 3 };
  if (head[0] === 0xff && head[1] === 0xfe) return { encoding: 'utf16le', bomBytes: 2 };
  // Sem BOM: tenta UTF-8 estrito. Se a decodificacao produzir U+FFFD, o arquivo
  // quase certamente e Windows-1252 — o padrao do Excel brasileiro.
  const asUtf8 = head.toString('utf8');
  if (asUtf8.includes('�')) return { encoding: 'latin1', bomBytes: 0 };
  return { encoding: 'utf8', bomBytes: 0 };
}

/**
 * Delimitador por frequencia FORA de aspas nas primeiras linhas. Contar sem
 * respeitar aspas erra em nome de produto com virgula, que e a regra e nao a
 * excecao nos relatorios da Shopee.
 */
function detectDelimiter(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '').slice(0, 20);
  if (lines.length === 0) return ',';

  let best = ',';
  let bestScore = -1;
  for (const d of DELIMITERS) {
    const counts = lines.map((l) => countOutsideQuotes(l, d));
    const first = counts[0];
    if (first === 0) continue;
    // Consistencia entre linhas vale mais que quantidade: o delimitador certo
    // aparece o mesmo numero de vezes em toda linha.
    const consistent = counts.filter((c) => c === first).length / counts.length;
    const score = consistent * 100 + first;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

function countOutsideQuotes(line, delim) {
  let n = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { i++; continue; }
      inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      n++;
    }
  }
  return n;
}

/**
 * Linha de cabecalho: a primeira com >= 60% de celulas nao vazias e nao
 * numericas. Relatorio brasileiro costuma ter linhas de titulo antes do
 * cabecalho real (doc 08 §3.1).
 */
function detectHeaderRow(text, delimiter) {
  const lines = text.split(/\r?\n/).slice(0, 20);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const cells = splitSimple(lines[i], delimiter);
    if (cells.length < 2) continue;
    const textual = cells.filter((c) => c.trim() !== '' && !/^-?[\d.,%\s]+$/.test(c.trim()));
    if (textual.length / cells.length >= 0.6) return i;
  }
  return 0;
}

function splitSimple(line, delim) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Assinatura estavel do cabecalho — casa com uma field_mapping conhecida. */
function headerSignature(headers) {
  return require('crypto')
    .createHash('sha1')
    .update(headers.map(normalizeHeader).sort().join('|'))
    .digest('hex');
}

/**
 * Dataset por coluna-ancora. A referencia mandava o usuario para "a pagina
 * certa"; aqui nao existe pagina errada — o arquivo entra no dataset correto
 * e o usuario e informado (doc 08 §3.2).
 */
function detectDataset(headers) {
  const set = new Set(headers.map(normalizeHeader));
  if (set.has('iddoscliques')) return 'click';
  if (set.has('iddopedido')) return 'transaction';
  return null;
}

/** Jaccard sobre nomes normalizados — sugere a loja quando nao ha assinatura exata. */
function similarity(headersA, headersB) {
  const a = new Set(headersA.map(normalizeHeader));
  const b = new Set(headersB.map(normalizeHeader));
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

module.exports = {
  normalizeHeader,
  detectFormat,
  detectEncoding,
  detectDelimiter,
  detectHeaderRow,
  headerSignature,
  detectDataset,
  similarity,
  splitSimple,
  SNIFF_BYTES: 64 * 1024,
};
