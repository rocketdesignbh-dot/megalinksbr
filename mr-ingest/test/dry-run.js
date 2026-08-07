/**
 * Dry-run contra as amostras reais da Shopee.
 *
 * Roda o pipeline inteiro — sniff, deteccao, mapeamento, transformacao,
 * normalizacao, deduplicacao — sem tocar no banco: o `sink` apenas coleta as
 * linhas que iriam para megaresults.ingest_transactions.
 *
 * O mapeamento vem de test/fixtures/field_mapping.shopee.json, gerado a partir
 * do que esta semeado em megaresults.field_mapping. Assim o teste roda offline
 * e ainda assim valida o seed de verdade, e nao uma copia inventada.
 *
 *   node test/dry-run.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { runPipeline } = require('../src/pipeline');

const SAMPLES = process.env.MR_SAMPLES_DIR ||
  path.join('C:', 'Users', 'PC', 'Documents', 'Mega Results', 'samples');
const FIXTURE = path.join(__dirname, 'fixtures', 'field_mapping.shopee.json');

const mappingRows = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

let failures = 0;
function check(label, fn) {
  try { fn(); console.log(`  ok   ${label}`); }
  catch (e) { failures++; console.log(`  FAIL ${label}\n       ${e.message}`); }
}

async function run(file, opts = {}) {
  const collected = [];
  const result = await runPipeline(fs.createReadStream(path.join(SAMPLES, file)), {
    store: 'shopee',
    sourceTimezone: 'America/Sao_Paulo',
    mappingRows,
    batchSize: opts.batchSize || 5000,
    sink: async ({ rows }) => {
      collected.push(...rows);
      return { inserted: rows.length, updated: 0, skipped: 0, total: rows.length };
    },
  });
  return { result, rows: collected };
}

(async () => {
  console.log('\n== relatorio de comissoes ==');
  const txn = await run('shopee-commission-202608021606.csv');
  const r = txn.rows[0];
  console.log(JSON.stringify({ ...r, raw: '<' + Object.keys(r.raw).length + ' campos>' }, null, 2));

  check('dataset detectado como transaction', () => assert.strictEqual(txn.result.plan.dataset, 'transaction'));
  check('47 colunas casadas com o mapeamento', () => assert.strictEqual(txn.result.columnPlan.columns.length, 47));
  check('nenhuma coluna sem mapeamento', () => assert.deepStrictEqual(txn.result.columnPlan.unmapped, []));
  check('1 linha valida, 0 invalidas', () => {
    assert.strictEqual(txn.result.stats.total, 1);
    assert.strictEqual(txn.result.stats.valid, 1);
  });
  check('nenhum problema levantado', () => assert.strictEqual(txn.result.issues.length, 0, JSON.stringify(txn.result.issues)));

  // 2026-07-28 14:42:51 em America/Sao_Paulo (-03:00) = 17:42:51 UTC.
  check('horario do pedido convertido de SP para UTC', () => assert.strictEqual(r.occurredAt, '2026-07-28T17:42:51.000Z'));
  check('tempo do clique convertido, virando o dia', () => assert.strictEqual(r.clickedAt, '2026-07-24T02:14:09.000Z'));
  check('pedido ainda sem conclusao -> approvedAt nulo', () => assert.strictEqual(r.approvedAt, null));

  check('status normalizado com o original preservado', () => {
    assert.strictEqual(r.status, 'pending');
    assert.strictEqual(r.statusRaw, 'Pendente');
  });
  check('atribuicao "Pedido em loja diferente" -> indirect', () => assert.strictEqual(r.attribution, 'indirect'));
  check('comprador "Existente" -> returning', () => assert.strictEqual(r.buyerKind, 'returning'));

  check('valores monetarios com ponto decimal', () => {
    assert.strictEqual(r.unitPrice, 20.48);
    assert.strictEqual(r.grossRevenue, 19.48);
    assert.strictEqual(r.commissionNet, 1.7532);
    assert.strictEqual(r.commissionGross, 1.7532);
    assert.strictEqual(r.platformFee, 0);
    assert.strictEqual(r.refundAmount, 0);
  });
  check('percentuais divididos por 100', () => {
    assert.strictEqual(r.raw.shopeeCommissionRate, 0.06);
    assert.strictEqual(r.raw.sellerCommissionRate, 0.03);
    assert.strictEqual(r.raw.affiliateContractRate, 1);
    assert.strictEqual(r.raw.rmFeeRate, 0);
  });
  check('taxa efetiva derivada (liquido / valor de compra)', () => assert.strictEqual(r.commissionRate, 0.09));

  check('dimensoes extraidas', () => {
    assert.strictEqual(r.merchantExternalId, '1166394444');
    assert.strictEqual(r.merchantName, 'GranLuxoVirtual');
    assert.strictEqual(r.merchantType, 'Preferred(Non-CB)');
    assert.strictEqual(r.externalItemId, '22993205186');
    assert.strictEqual(r.externalVariantId, '239409326124');
    assert.strictEqual(r.categoryL1, 'Casa e Decoração');
    assert.strictEqual(r.categoryL3, 'Óleos Essenciais');
  });
  check('nome do item com virgula sobrevive ao delimitador', () => {
    assert.ok(r.productName.startsWith('Óleo Essencial de Alecrim'));
  });
  check('nota do item com virgula dentro de aspas preservada', () => {
    assert.ok(String(r.raw.itemNotes).includes('comissões só vão ser pagas'));
  });
  check('sub ids vazios viram null, canal preservado', () => {
    assert.strictEqual(r.subId1, null);
    assert.strictEqual(r.subId5, null);
    assert.strictEqual(r.channel, 'Instagram');
    assert.strictEqual(r.campaignKey, 'instagram|||||');
  });
  check('coluna nao canonica preservada em raw', () => assert.strictEqual(r.raw.paymentId, '238959771149788'));

  // A chave nao pode depender da ordem das linhas (falha T05 da referencia).
  const txn2 = await run('shopee-commission-202608021606.csv');
  check('dedupe_key estavel entre execucoes', () => assert.strictEqual(txn2.rows[0].dedupeKey, r.dedupeKey));
  check('dedupe_key nao contem indice de linha', () => assert.match(r.dedupeKey, /^[0-9a-f]{64}$/));

  console.log('\n== relatorio de cliques ==');
  const clk = await run('shopee-click-202608021622.csv');
  const c = clk.rows[0];
  console.log(JSON.stringify(c, null, 2));

  check('dataset detectado como click', () => assert.strictEqual(clk.result.plan.dataset, 'click'));
  check('5 colunas casadas', () => assert.strictEqual(clk.result.columnPlan.columns.length, 5));
  check('id do clique preservado', () => assert.strictEqual(c.externalClickId, '53369e910435386f49041c4dfc56d0f1'));
  check('tempo do clique convertido, virando o dia', () => assert.strictEqual(c.occurredAt, '2026-07-28T00:12:41.000Z'));
  check('regiao e referenciador extraidos', () => {
    assert.strictEqual(c.region, 'Brazil');
    assert.strictEqual(c.referrer, 'Instagram');
  });
  // "----" e ausencia de valor, nao um valor (doc 08 §6.5).
  check('sub id "----" vira null', () => assert.strictEqual(c.subId1, null));

  console.log(`\n${failures === 0 ? 'TODOS OS TESTES PASSARAM' : failures + ' TESTE(S) FALHARAM'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nerro no dry-run:', e.code || '', e.message);
  console.error(e.stack);
  process.exit(1);
});
