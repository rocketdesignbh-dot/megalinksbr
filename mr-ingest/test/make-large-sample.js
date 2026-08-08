/**
 * Gera um CSV sintetico grande no formato do relatorio de comissoes da Shopee.
 *
 * Existe porque as amostras reais tem 1 linha cada: lote, streaming em volume,
 * deduplicacao dentro do arquivo e o corte de 30% de erro sao caminhos que
 * nenhum teste exercitava.
 *
 * O cabeçalho e lido do arquivo real, entao o gerador nao pode divergir do
 * formato de verdade sem que o dry-run acuse. Os VALORES sao todos sinteticos.
 *
 *   node test/make-large-sample.js [linhas] [saida]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROWS = Number(process.argv[2] || 50000);
const OUT = process.argv[3] || path.join(require('os').tmpdir(), 'shopee-commission-large.csv');

const SAMPLES = process.env.MR_SAMPLES_DIR ||
  path.join('C:', 'Users', 'PC', 'Documents', 'Mega Results', 'samples');
const REAL = path.join(SAMPLES, 'shopee-commission-202608021606.csv');

// Cabeçalho vem do arquivo real, sem BOM.
const header = fs.readFileSync(REAL, 'utf8').replace(/^﻿/, '').split(/\r?\n/)[0];
const COLS = header.split(',').length;

const STATUS = ['Pendente', 'Concluído', 'Cancelado', 'Não pago'];
const ATTR = ['Pedido na mesma loja', 'Pedido em loja diferente'];
const BUYER = ['Novo', 'Existente'];
const CHANNEL = ['Instagram', 'WhatsApp', 'TikTok', 'YouTube', ''];
const CAT = [
  ['Casa e Decoração', 'Fragrância da Casa e Aromaterapia', 'Óleos Essenciais'],
  ['Beleza', 'Cuidados com a Pele', 'Hidratantes'],
  ['Eletrônicos', 'Áudio', 'Fones de Ouvido'],
];

// Gerador deterministico: mesma semente, mesmo arquivo. Sem isso um teste que
// falha nao pode ser reproduzido.
let seed = 42;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const pick = (a) => a[Math.floor(rnd() * a.length)];
const money = (n) => n.toFixed(2);

function pad(n, w) { return String(n).padStart(w, '0'); }

/** `yyyy-MM-dd HH:mm:ss` no horario local de Sao Paulo, como a Shopee exporta. */
function stamp(dayOffset, i) {
  const d = new Date(Date.UTC(2026, 6, 1 + (dayOffset % 31), 8 + (i % 12), i % 60, (i * 7) % 60));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)} ` +
         `${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}:${pad(d.getUTCSeconds(), 2)}`;
}

function row(i, kind) {
  const cat = pick(CAT);
  const price = 10 + rnd() * 490;
  const purchase = price * (0.9 + rnd() * 0.1);
  const net = purchase * (0.03 + rnd() * 0.09);
  const status = pick(STATUS);

  // 1 em 500 linhas nasce quebrada de proposito: sem ID de pedido ou com data
  // impossivel. E o que faz o caminho de import_issue rodar de verdade.
  const brokenId = kind === 'broken-id';
  const brokenDate = kind === 'broken-date';

  // Um bloco de linhas repete o trio (pedido, item, modelo) para exercitar o
  // dedupeBatch — sem isso o Postgres recusaria o ON CONFLICT.
  const n = kind === 'dup' ? i - 1 : i;

  const c = [];
  c[0] = brokenId ? '' : `TESTE${pad(n, 10)}`;
  c[1] = status;
  c[2] = pad(900000000000000 + n, 15);
  c[3] = brokenDate ? '32/13/2026 99:99:99' : stamp(n % 31, n);
  c[4] = status === 'Concluído' ? stamp((n % 31) + 3, n) : '';
  c[5] = stamp(Math.max(0, (n % 31) - 2), n);
  c[6] = `LojaTeste${n % 200}`;
  c[7] = String(9000000000 + (n % 200));
  c[8] = 'Preferred(Non-CB)';
  c[9] = String(20000000000 + (n % 5000));
  // Nome com virgula e aspas: o caso que quebra parser ingenuo.
  c[10] = `"Produto de Teste ${n}, modelo ""A"" 100% sintetico"`;
  c[11] = String(230000000000 + (n % 5000));
  c[12] = 'Produto';
  c[13] = '';
  c[14] = cat[0];
  c[15] = cat[1];
  c[16] = cat[2];
  c[17] = money(price);
  c[18] = String(1 + (n % 3));
  c[19] = 'XTRA Comm';
  c[20] = '';
  c[21] = money(purchase);
  c[22] = status === 'Cancelado' ? money(purchase) : '0.00';
  c[23] = '6.00%';
  c[24] = money(purchase * 0.06);
  c[25] = '3.00%';
  c[26] = money(purchase * 0.03);
  c[27] = money(net);
  c[28] = money(purchase * 0.06);
  c[29] = money(purchase * 0.03);
  c[30] = money(net);
  c[31] = '';
  c[32] = '0';
  c[33] = '0.00%';
  c[34] = '0.00';
  c[35] = '100.00%';
  c[36] = money(net);
  c[37] = status;
  c[38] = '"Nota sintetica, com virgula"';
  c[39] = pick(ATTR);
  c[40] = pick(BUYER);
  c[41] = n % 4 === 0 ? `sub${n % 50}` : '----';
  c[42] = '----';
  c[43] = '----';
  c[44] = '----';
  c[45] = '----';
  c[46] = pick(CHANNEL);

  // Se o arquivo real mudar de largura, falha alto em vez de gerar lixo.
  if (c.length !== COLS) {
    throw new Error(`gerador tem ${c.length} colunas, o cabeçalho real tem ${COLS}`);
  }
  return c.join(',');
}

const out = fs.createWriteStream(OUT, { encoding: 'utf8' });
out.write('﻿' + header + '\n'); // BOM, como a Shopee entrega

let broken = 0;
let dups = 0;
(function writeAll(i) {
  while (i < ROWS) {
    let kind = 'ok';
    if (i > 0 && i % 500 === 0) { kind = 'broken-id'; broken++; }
    else if (i > 0 && i % 731 === 0) { kind = 'broken-date'; broken++; }
    else if (i > 0 && i % 997 === 0) { kind = 'dup'; dups++; }

    if (!out.write(row(i, kind) + '\n')) {
      out.once('drain', () => writeAll(i + 1));
      return;
    }
    i++;
  }
  out.end(() => {
    const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
    console.log(`${ROWS} linhas -> ${OUT}  (${mb} MB)`);
    console.log(`  ${broken} linhas invalidas de proposito, ${dups} duplicatas de dedupe_key`);
  });
})(0);
