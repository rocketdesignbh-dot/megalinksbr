-- ============================================================================
-- megaresults_08_shopee_field_mapping
--
-- Semeia o mapeamento declarativo da Shopee em megaresults.field_mapping.
--
-- Escopo: owner_id IS NULL  ->  mapeamento GLOBAL do sistema.
--   A policy `mapping_read` ja permite `owner_id IS NULL OR owner_id = auth.uid()`,
--   entao todo usuario enxerga estes registros sem que nenhum consiga altera-los
--   (mapping_update/mapping_delete exigem owner_id = auth.uid()).
--
-- Fonte da verdade: arquivos reais exportados do Painel de Afiliados da Shopee
--   samples/shopee-commission-202608021606.csv   47 colunas, dataset `transaction`
--   samples/shopee-click-202608021622.csv         5 colunas, dataset `click`
--
-- Nota sobre "48 colunas" (docs/01 §6.1): o CSV de comissoes traz 47 colunas.
--   O 48o campo daquela lista, `recordId`, nao existe no arquivo — e derivado.
--   Aqui ele vira `dedupe_key`, calculado em mr-ingest/src/normalize.js como
--   sha256('shopee|<ID do pedido>|<ID do item>|<Modelo de ID>'), SEM o indice da
--   linha (o indice era a falha T05 da referencia: reexportar o mesmo periodo em
--   outra ordem gerava chaves diferentes e duplicava o dado).
--
-- Formato observado nos arquivos reais:
--   encoding UTF-8 com BOM (EF BB BF) · delimitador `,` · aspas duplas
--   datas    `yyyy-MM-dd HH:mm:ss` sem fuso, em America/Sao_Paulo
--   decimais ponto decimal (`20.48`) · percentuais com sufixo `%` (`6.00%`)
--   vazios   campo vazio; sub ids inertes vem como `----`
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Idempotencia: uma coluna de origem tem no maximo um destino canonico
--    dentro de (escopo, loja, dataset, versao).
--    `owner_id` e `store` sao anulaveis e, por padrao, NULL nunca colide com
--    NULL em indice unico — sem tratamento, o mesmo mapeamento global poderia
--    ser semeado duas vezes. `NULLS NOT DISTINCT` (PG 15+) faz NULL contar como
--    valor. Preferido a COALESCE porque `store::text` nao e IMMUTABLE e portanto
--    nao pode aparecer em expressao de indice.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_field_mapping_column
  ON megaresults.field_mapping (owner_id, store, dataset, version, source_header)
  NULLS NOT DISTINCT;

COMMENT ON INDEX megaresults.uq_field_mapping_column IS
  'Uma coluna de origem tem no maximo um destino canonico por (escopo, loja, dataset, versao). Torna o seed re-executavel.';

-- ---------------------------------------------------------------------------
-- 2. Seed re-executavel: limpa apenas o escopo global da Shopee v1.
--    Mapeamentos criados por usuarios (owner_id NOT NULL) nao sao tocados.
-- ---------------------------------------------------------------------------
DELETE FROM megaresults.field_mapping
 WHERE owner_id IS NULL
   AND store   = 'shopee'
   AND version = 1;

-- ---------------------------------------------------------------------------
-- 3. Dataset `transaction` — 47 colunas do relatorio de comissoes
--
-- Convencao de canonical_field:
--   `campo`      -> campo canonico do doc 08 §4.1, vira coluna em fact_transaction
--   `raw.campo`  -> preservado em fact_transaction.raw (jsonb), consultavel e
--                   exportavel; permite promover a coluna depois sem reimportar
-- ---------------------------------------------------------------------------
INSERT INTO megaresults.field_mapping
  (store, owner_id, dataset, version, source_header, canonical_field, transform, is_required)
VALUES
-- --- identificacao do pedido -------------------------------------------------
('shopee', NULL, 'transaction', 1, 'ID do pedido', 'externalOrderId',
 '{"type":"string","nullValues":["","--","-","N/A"]}', true),

('shopee', NULL, 'transaction', 1, 'Status do Pedido', 'status',
 '{"type":"enum","keepRaw":true,"default":"pending","unknownAction":"warn","valueMap":{"Pendente":"pending","Concluído":"approved","Aprovado":"approved","Pago":"approved","Cancelado":"cancelled","Não pago":"unpaid","Reembolsado":"refunded","Devolvido":"refunded","Recusado":"rejected","Estornado":"rejected"}}', true),

('shopee', NULL, 'transaction', 1, 'ID do pagamento', 'raw.paymentId',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

-- --- tempo -------------------------------------------------------------------
('shopee', NULL, 'transaction', 1, 'Horário do pedido', 'occurredAt',
 '{"type":"datetime","formats":["yyyy-MM-dd HH:mm:ss","yyyy-MM-dd HH:mm","dd/MM/yyyy HH:mm:ss","iso8601"],"sourceTimezone":"America/Sao_Paulo","nullValues":["","--","-","N/A"]}', true),

('shopee', NULL, 'transaction', 1, 'Tempo de Conclusão', 'approvedAt',
 '{"type":"datetime","formats":["yyyy-MM-dd HH:mm:ss","yyyy-MM-dd HH:mm","dd/MM/yyyy HH:mm:ss","iso8601"],"sourceTimezone":"America/Sao_Paulo","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Tempo dos Cliques', 'clickedAt',
 '{"type":"datetime","formats":["yyyy-MM-dd HH:mm:ss","yyyy-MM-dd HH:mm","dd/MM/yyyy HH:mm:ss","iso8601"],"sourceTimezone":"America/Sao_Paulo","nullValues":["","--","-","N/A"]}', false),

-- --- loja (dim_merchant) -----------------------------------------------------
('shopee', NULL, 'transaction', 1, 'Nome da loja', 'merchantName',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'ID da loja', 'merchantExternalId',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Tipo da Loja', 'merchantType',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

-- --- produto (dim_product) ---------------------------------------------------
('shopee', NULL, 'transaction', 1, 'ID do item', 'externalItemId',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Nome do Item', 'productName',
 '{"type":"string","collapseWhitespace":true,"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Modelo de ID', 'externalVariantId',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Tipo de Produto', 'raw.productType',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'ID da promoção', 'raw.promotionId',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

-- --- categoria (dim_category, cascata L1 -> L2 -> L3) ------------------------
('shopee', NULL, 'transaction', 1, 'Categoria Global L1', 'categoryL1',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Categoria Global L2', 'categoryL2',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Categoria Global L3', 'categoryL3',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

-- --- valores do pedido -------------------------------------------------------
('shopee', NULL, 'transaction', 1, 'Preço(R$)', 'unitPrice',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Qtd', 'quantity',
 '{"type":"integer","default":1,"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Offer Type', 'offerType',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Parceiro de campanha', 'raw.campaignPartner',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Valor de Compra(R$)', 'grossRevenue',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', true),

('shopee', NULL, 'transaction', 1, 'Valor do Reembolso(R$)', 'refundAmount',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', false),

-- --- decomposicao da comissao ------------------------------------------------
-- A Shopee quebra a comissao em ate 6 parcelas. Para o modelo canonico interessam
-- tres: commissionGross (total do item), platformFee (fee da RM) e commissionNet
-- (o que o afiliado recebe). O resto e auditoria e vai para `raw`.
('shopee', NULL, 'transaction', 1, 'Taxa de comissão Shopee do item', 'raw.shopeeCommissionRate',
 '{"type":"percent","decimalSeparator":".","stripChars":["%"," "],"divideBy":100,"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Comissão do Item da Shopee(R$)', 'raw.shopeeItemCommission',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Taxa de comissão do vendedor do item', 'raw.sellerCommissionRate',
 '{"type":"percent","decimalSeparator":".","stripChars":["%"," "],"divideBy":100,"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Comissão do Item da Marca(R$)', 'raw.brandItemCommission',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Comissão total do item(R$)', 'commissionGross',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Comissão Shopee(R$)', 'raw.shopeeCommission',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Comissão do vendedor(R$)', 'raw.sellerCommission',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Comissão total do pedido(R$)', 'raw.totalOrderCommission',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', false),

-- --- Rede de Multiplicadores (RM) — o fee que reduz a comissao do afiliado ----
('shopee', NULL, 'transaction', 1, 'RM vinculada', 'raw.linkedRM',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'ID de contrato da RM', 'raw.rmContractId',
 '{"type":"string","nullValues":["","--","-","N/A","0"]}', false),

('shopee', NULL, 'transaction', 1, 'Taxa do Fee de gestão da RM', 'raw.rmFeeRate',
 '{"type":"percent","decimalSeparator":".","stripChars":["%"," "],"divideBy":100,"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Fee de Gestão da RM(R$)', 'platformFee',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Taxa de contrato do afiliado', 'raw.affiliateContractRate',
 '{"type":"percent","decimalSeparator":".","stripChars":["%"," "],"divideBy":100,"nullValues":["","--","-","N/A"]}', false),

-- O numero que sustenta todo o dashboard.
('shopee', NULL, 'transaction', 1, 'Comissão líquida do afiliado(R$)', 'commissionNet',
 '{"type":"decimal","decimalSeparator":".","thousandsSeparator":",","stripChars":["R$"," "],"nullValues":["","--","-","N/A"]}', true),

-- --- qualificadores ----------------------------------------------------------
-- `Status do item do afiliado` repete `Status do Pedido` na maioria das linhas,
-- mas diverge quando so parte do pedido e aprovada. Fica em raw para a
-- reconciliacao (doc 08 §9) poder comparar os dois.
('shopee', NULL, 'transaction', 1, 'Status do item do afiliado', 'raw.affiliateItemStatus',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Notas do item', 'raw.itemNotes',
 '{"type":"string","collapseWhitespace":true,"nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'transaction', 1, 'Tipo de atribuição', 'attribution',
 '{"type":"enum","keepRaw":true,"default":"unknown","unknownAction":"warn","valueMap":{"Pedido na mesma loja":"direct","Pedido na mesma loja (Direto)":"direct","Mesma loja":"direct","Pedido em loja diferente":"indirect","Pedido em loja diferente (Indireto)":"indirect","Loja diferente":"indirect"}}', false),

('shopee', NULL, 'transaction', 1, 'Status do Comprador', 'buyerKind',
 '{"type":"enum","keepRaw":true,"default":"unknown","unknownAction":"warn","valueMap":{"Novo":"new","Existente":"returning","Recorrente":"returning"}}', false),

-- --- campanha (dim_campaign) -------------------------------------------------
-- nullPattern implementa a regra do doc 08 §6.5: sub id composto so de hifens,
-- pontos ou underscores e ausencia de valor, nao um valor. O arquivo real traz
-- `----` no relatorio de cliques.
('shopee', NULL, 'transaction', 1, 'Sub_id1', 'subId1',
 '{"type":"string","nullValues":["","--","-","N/A"],"nullPattern":"^[-._]+$"}', false),

('shopee', NULL, 'transaction', 1, 'Sub_id2', 'subId2',
 '{"type":"string","nullValues":["","--","-","N/A"],"nullPattern":"^[-._]+$"}', false),

('shopee', NULL, 'transaction', 1, 'Sub_id3', 'subId3',
 '{"type":"string","nullValues":["","--","-","N/A"],"nullPattern":"^[-._]+$"}', false),

('shopee', NULL, 'transaction', 1, 'Sub_id4', 'subId4',
 '{"type":"string","nullValues":["","--","-","N/A"],"nullPattern":"^[-._]+$"}', false),

('shopee', NULL, 'transaction', 1, 'Sub_id5', 'subId5',
 '{"type":"string","nullValues":["","--","-","N/A"],"nullPattern":"^[-._]+$"}', false),

('shopee', NULL, 'transaction', 1, 'Canal', 'channel',
 '{"type":"string","nullValues":["","--","-","N/A"],"nullPattern":"^[-._]+$"}', false),

-- ---------------------------------------------------------------------------
-- 4. Dataset `click` — 5 colunas do relatorio de cliques
-- ---------------------------------------------------------------------------
('shopee', NULL, 'click', 1, 'ID dos Cliques', 'externalClickId',
 '{"type":"string","nullValues":["","--","-","N/A"]}', true),

('shopee', NULL, 'click', 1, 'Tempo dos Cliques', 'occurredAt',
 '{"type":"datetime","formats":["yyyy-MM-dd HH:mm:ss","yyyy-MM-dd HH:mm","dd/MM/yyyy HH:mm:ss","iso8601"],"sourceTimezone":"America/Sao_Paulo","nullValues":["","--","-","N/A"]}', true),

('shopee', NULL, 'click', 1, 'Região dos Cliques', 'region',
 '{"type":"string","nullValues":["","--","-","N/A"]}', false),

('shopee', NULL, 'click', 1, 'Sub_id', 'subId1',
 '{"type":"string","nullValues":["","--","-","N/A"],"nullPattern":"^[-._]+$"}', false),

('shopee', NULL, 'click', 1, 'Referenciador', 'referrer',
 '{"type":"string","nullValues":["","--","-","N/A"],"nullPattern":"^[-._]+$"}', false);

-- ---------------------------------------------------------------------------
-- 5. Verificacao — 47 linhas em `transaction`, 5 em `click`.
--    Falha alto e cedo se o seed nao bater, em vez de deixar o mr-ingest
--    descobrir isso em producao.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  n_txn int;
  n_clk int;
BEGIN
  SELECT count(*) INTO n_txn FROM megaresults.field_mapping
   WHERE owner_id IS NULL AND store = 'shopee' AND version = 1 AND dataset = 'transaction';
  SELECT count(*) INTO n_clk FROM megaresults.field_mapping
   WHERE owner_id IS NULL AND store = 'shopee' AND version = 1 AND dataset = 'click';

  IF n_txn <> 47 OR n_clk <> 5 THEN
    RAISE EXCEPTION 'seed shopee inconsistente: transaction=% (esperado 47), click=% (esperado 5)', n_txn, n_clk;
  END IF;
END $$;
