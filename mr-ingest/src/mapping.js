'use strict';

/**
 * Mapeamento declarativo e motor de transformacao (doc 08 §4).
 *
 * Nenhuma regra da Shopee esta escrita neste arquivo. Tudo vem de
 * megaresults.field_mapping — e o que permite uma rede nova entrar sem release
 * (CU-09). O que esta aqui e apenas o interpretador das transformacoes.
 */

const { normalizeHeader } = require('./detect');

// ---------------------------------------------------------------------------
// Fuso: converte um horario local de uma IANA timezone para UTC, sem
// dependencia externa. Corrige a falha R6 da referencia, que subtraia uma
// constante de 10800000 ms — quebra em qualquer fuso que nao seja -03:00 e em
// qualquer data anterior ao fim do horario de verao brasileiro.
// ---------------------------------------------------------------------------
const dtfCache = new Map();

function zoneOffsetMs(instantMs, timeZone) {
  let dtf = dtfCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    dtfCache.set(timeZone, dtf);
  }
  const p = {};
  for (const part of dtf.formatToParts(new Date(instantMs))) p[part.type] = part.value;
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asIfUtc - instantMs;
}

function zonedToUtcMs(y, mo, d, h, mi, s, timeZone) {
  const naive = Date.UTC(y, mo - 1, d, h, mi, s);
  // Duas passadas: a primeira usa o offset do instante errado; a segunda
  // corrige quando a data cai perto de uma virada de horario de verao.
  let ts = naive - zoneOffsetMs(naive, timeZone);
  ts = naive - zoneOffsetMs(ts, timeZone);
  return ts;
}

const DATE_PATTERNS = [
  { re: /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/, o: [1, 2, 3] },
  { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/, o: [3, 2, 1] },
  { re: /^(\d{4})-(\d{2})-(\d{2})$/, o: [1, 2, 3], dateOnly: true },
  { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, o: [3, 2, 1], dateOnly: true },
];

function parseDateTime(raw, timeZone) {
  const v = String(raw).trim();

  // Ja tem fuso explicito (Z ou +HH:MM): o valor e absoluto, sourceTimezone
  // nao se aplica.
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  // Epoch em segundos ou milissegundos.
  if (/^\d{10}$/.test(v)) return new Date(+v * 1000).toISOString();
  if (/^\d{13}$/.test(v)) return new Date(+v).toISOString();

  for (const p of DATE_PATTERNS) {
    const m = v.match(p.re);
    if (!m) continue;
    const y = +m[p.o[0]], mo = +m[p.o[1]], d = +m[p.o[2]];
    const h = p.dateOnly ? 0 : +m[4];
    const mi = p.dateOnly ? 0 : +m[5];
    const s = p.dateOnly ? 0 : +(m[6] || 0);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const ts = zonedToUtcMs(y, mo, d, h, mi, s, timeZone);
    return Number.isNaN(ts) ? null : new Date(ts).toISOString();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Numeros
// ---------------------------------------------------------------------------
function stripChars(v, chars) {
  let out = v;
  for (const c of chars || []) out = out.split(c).join('');
  return out.trim();
}

/**
 * Decimal com guarda de ambiguidade. O mapeamento da Shopee declara ponto
 * decimal ("20.48"), mas exportacoes em locale pt-BR do mesmo painel entregam
 * "19,48". Sem guarda, "19,48" viraria 1948 e inflaria a comissao em 100x —
 * silenciosamente. Aqui reinterpreta e sinaliza.
 */
function parseDecimalValue(rawText, t) {
  let v = stripChars(rawText, t.stripChars);
  if (v === '') return { value: null };
  const negative = /^\(.*\)$/.test(v) || v.startsWith('-');
  v = v.replace(/^[(-]|[)]$/g, '');

  const dec = t.decimalSeparator || '.';
  const tho = t.thousandsSeparator || '';
  let warning = null;

  const looksPtBr = /^\d{1,3}(\.\d{3})+,\d+$/.test(v) || /^\d+,\d{1,2}$/.test(v);
  const looksEnUs = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(v) || /^\d+\.\d+$/.test(v);

  let normalized;
  if (dec === '.' && looksPtBr && !looksEnUs) {
    normalized = v.split('.').join('').replace(',', '.');
    warning = 'DECIMAL_LOCALE_MISMATCH';
  } else if (dec === ',' && looksEnUs && !looksPtBr) {
    normalized = v.split(',').join('');
    warning = 'DECIMAL_LOCALE_MISMATCH';
  } else {
    normalized = v;
    if (tho) normalized = normalized.split(tho).join('');
    if (dec !== '.') normalized = normalized.replace(dec, '.');
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return { value: null, error: 'NOT_A_NUMBER' };
  return { value: negative ? -n : n, warning };
}

// ---------------------------------------------------------------------------
// Motor de transformacao
// ---------------------------------------------------------------------------
function isNullValue(v, t) {
  const s = String(v == null ? '' : v).trim();
  if (s === '') return true;
  if ((t.nullValues || []).includes(s)) return true;
  if (t.nullPattern && new RegExp(t.nullPattern).test(s)) return true;
  return false;
}

/**
 * @returns {{value:*, raw:string|null, warning?:string, error?:string}}
 */
function applyTransform(rawValue, transform, ctx) {
  const t = transform || { type: 'string' };
  const rawText = rawValue == null ? '' : String(rawValue).trim();

  if (isNullValue(rawText, t)) {
    return { value: t.default !== undefined && t.type !== 'enum' ? t.default : null, raw: null };
  }

  switch (t.type) {
    case 'integer': {
      const r = parseDecimalValue(rawText, t);
      if (r.value === null) return { value: t.default ?? null, raw: rawText, error: r.error };
      return { value: Math.trunc(r.value), raw: rawText, warning: r.warning };
    }
    case 'decimal': {
      const r = parseDecimalValue(rawText, t);
      return { value: r.value, raw: rawText, warning: r.warning, error: r.error };
    }
    case 'percent': {
      const r = parseDecimalValue(rawText, t);
      if (r.value === null) return { value: null, raw: rawText, error: r.error };
      return { value: r.value / (t.divideBy || 100), raw: rawText, warning: r.warning };
    }
    case 'datetime': {
      const iso = parseDateTime(rawText, t.sourceTimezone || ctx.sourceTimezone || 'UTC');
      if (iso === null) return { value: null, raw: rawText, error: 'UNPARSEABLE_DATE' };
      return { value: iso, raw: rawText };
    }
    case 'boolean': {
      const s = rawText.toLowerCase();
      return { value: ['1', 'true', 'sim', 'yes', 'y', 's'].includes(s), raw: rawText };
    }
    case 'enum': {
      // Lookup normalizado nos dois lados: "Concluído", "concluido" e
      // "CONCLUIDO" caem no mesmo destino sem inchar o valueMap.
      const key = normalizeHeader(rawText);
      const map = t._compiledMap || compileValueMap(t);
      const hit = map.get(key);
      if (hit === undefined) {
        return {
          value: t.default ?? null,
          raw: rawText,
          warning: t.unknownAction === 'warn' ? 'UNKNOWN_ENUM_VALUE' : undefined,
        };
      }
      return { value: hit, raw: rawText };
    }
    case 'constant':
      return { value: t.value, raw: rawText };
    case 'regexExtract': {
      const m = rawText.match(new RegExp(t.pattern));
      return { value: m ? (m[t.group ?? 1] ?? null) : null, raw: rawText };
    }
    case 'string':
    default: {
      let s = rawText;
      if (t.collapseWhitespace) s = s.replace(/[\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim();
      return { value: s === '' ? null : s, raw: rawText };
    }
  }
}

function compileValueMap(t) {
  const m = new Map();
  for (const [k, v] of Object.entries(t.valueMap || {})) m.set(normalizeHeader(k), v);
  Object.defineProperty(t, '_compiledMap', { value: m, enumerable: false });
  return m;
}

// ---------------------------------------------------------------------------
// Casamento cabecalho -> campo canonico
// ---------------------------------------------------------------------------

/**
 * Casa as colunas do arquivo com as linhas de field_mapping. O casamento e por
 * cabecalho normalizado, entao acento, caixa e pontuacao divergentes entre a
 * exportacao e o seed nao quebram a importacao.
 *
 * @param {string[]} headers      cabecalhos como vieram no arquivo
 * @param {Array}    mappingRows  linhas de megaresults.field_mapping
 */
function buildColumnPlan(headers, mappingRows) {
  const byNorm = new Map();
  for (const row of mappingRows) byNorm.set(normalizeHeader(row.source_header), row);

  const columns = [];
  const unmapped = [];
  for (let i = 0; i < headers.length; i++) {
    const row = byNorm.get(normalizeHeader(headers[i]));
    if (!row) { unmapped.push(headers[i]); continue; }
    columns.push({
      index: i,
      header: headers[i],
      field: row.canonical_field,
      transform: row.transform || { type: 'string' },
      required: !!row.is_required,
    });
  }

  const mappedNorms = new Set(columns.map((c) => normalizeHeader(c.header)));
  const missingRequired = mappingRows
    .filter((r) => r.is_required && !mappedNorms.has(normalizeHeader(r.source_header)))
    .map((r) => r.source_header);

  return { columns, unmapped, missingRequired };
}

/**
 * Aplica o plano a uma linha crua. Colunas nao mapeadas nao se perdem: vao para
 * `raw` e continuam consultaveis e exportaveis (doc 08 §4.1).
 */
function applyPlan(plan, cells, ctx) {
  const out = {};
  const raw = {};
  const issues = [];

  for (const col of plan.columns) {
    const cell = cells[col.index];
    const r = applyTransform(cell, col.transform, ctx);

    if (r.error) {
      issues.push({ severity: 'warning', field: col.field, code: r.error, message: `Valor invalido em "${col.header}"`, raw_value: r.raw });
    }
    if (r.warning) {
      issues.push({ severity: 'warning', field: col.field, code: r.warning, message: `Valor ambiguo em "${col.header}"`, raw_value: r.raw });
    }
    // keepRaw preserva o valor como veio no arquivo, ao lado do normalizado:
    // e o que sustenta status_raw e a auditoria de enum (doc 08 §6.1). Para
    // campo canonico o par vai para o proprio objeto canonico, nao para o
    // jsonb `raw` — quem consome e normalize.js.
    if (col.transform && col.transform.keepRaw && r.raw != null) {
      if (col.field.startsWith('raw.')) raw[col.field.slice(4) + 'Raw'] = r.raw;
      else out[col.field + 'Raw'] = r.raw;
    }

    if (col.field.startsWith('raw.')) {
      if (r.value !== null) raw[col.field.slice(4)] = r.value;
    } else {
      out[col.field] = r.value;
    }
  }

  for (const header of plan.unmapped) {
    const i = ctx.headerIndex.get(header);
    const v = cells[i];
    if (v != null && String(v).trim() !== '') raw['_' + header] = String(v).trim();
  }

  return { canonical: out, raw, issues };
}

module.exports = {
  applyTransform,
  parseDateTime,
  parseDecimalValue,
  zonedToUtcMs,
  buildColumnPlan,
  applyPlan,
};
