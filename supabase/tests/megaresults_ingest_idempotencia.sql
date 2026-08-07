-- Teste de idempotencia de megaresults.ingest_transactions / ingest_clicks.
--
-- Como rodar: colar no SQL Editor do Supabase (ou execute_sql via MCP). Nao
-- deixa residuo -- a limpeza roda no fim, e o bloco inteiro e uma transacao,
-- entao qualquer falha faz rollback de tudo.
--
-- Substitui a versao de 03/08, que so imprimia RAISE NOTICE: ela completava
-- sem erro mesmo com inserted/updated/skipped errados. Aqui cada numero
-- esperado e uma assercao -- se o contrato quebrar, o bloco levanta excecao.
--
-- O que esta sendo fixado:
--   1a carga        linha nova                  -> inserted=1
--   2a carga        byte a byte igual           -> skipped=1   (o WHERE do DO UPDATE barra)
--   3a carga        status e comissao mudaram   -> updated=1   + 1 linha de historico
--   cliques         mesma linha duas vezes      -> inserted=1, depois skipped=1
-- e ainda: dimensoes resolvidas (loja/produto/categoria/campanha), hierarquia
-- de categoria com pai, dia marcado em rollup_dirty e jsonb `raw` preservado.

DO $test$
DECLARE
  -- Trocar pelo uuid de um usuario de teste se este nao existir no ambiente.
  v_owner uuid := 'd63dd97f-0581-4d2a-93a2-26399b14715b';
  v_conn uuid; v_imp uuid;
  r1 jsonb; r2 jsonb; r3 jsonb; c1 jsonb; c2 jsonb;
  v_pre int; v_hist int; v_dirty int; v_f record;

  -- Linha sintetica: nao usar dado real de venda em teste versionado.
  v_txn jsonb := $j$[{
    "dedupeKey":"0000000000000000000000000000000000000000000000000000000000000001",
    "externalOrderId":"TESTE0000000001","externalItemId":"1","externalVariantId":"1",
    "occurredAt":"2026-07-28T17:42:51.000Z","clickedAt":"2026-07-24T02:14:09.000Z",
    "approvedAt":null,"status":"pending","statusRaw":"Pendente",
    "attribution":"indirect","buyerKind":"returning","currency":"BRL",
    "quantity":1,"unitPrice":20.48,"grossRevenue":19.48,"refundAmount":0,
    "commissionGross":1.7532,"platformFee":0,"commissionNet":1.7532,"commissionRate":0.09,
    "offerType":"XTRA Comm","merchantExternalId":"9999999999","merchantName":"LojaTeste",
    "merchantType":"Preferred(Non-CB)","productName":"Produto de Teste",
    "categoryL1":"Casa e Decoracao","categoryL2":"Fragrancia da Casa","categoryL3":"Oleos Essenciais",
    "channel":"Instagram","campaignKey":"instagram|||||",
    "raw":{"paymentId":"000000000000000","shopeeCommissionRate":0.06}
  }]$j$;
  v_txn2 jsonb;

  v_clk jsonb := $j$[{
    "dedupeKey":"0000000000000000000000000000000000000000000000000000000000000002",
    "externalClickId":"00000000000000000000000000000001",
    "occurredAt":"2026-07-28T00:12:41.000Z","campaignKey":"|||||",
    "referrer":"Instagram","region":"Brazil","country":"BR","isBot":false,"raw":{}
  }]$j$;
BEGIN
  -- Guarda: nunca rodar sobre dados reais deste owner.
  SELECT count(*) INTO v_pre FROM megaresults.fact_transaction WHERE owner_id = v_owner;
  IF v_pre <> 0 THEN
    RAISE EXCEPTION 'abortado: ja existem % transacoes para este owner', v_pre;
  END IF;

  INSERT INTO megaresults.connection (owner_id, store, label, method)
  VALUES (v_owner,'shopee','__teste_idempotencia__','upload') RETURNING id INTO v_conn;
  INSERT INTO megaresults.import_batch (owner_id, connection_id, dataset, status)
  VALUES (v_owner, v_conn, 'transaction', 'loading') RETURNING id INTO v_imp;

  r1 := megaresults.ingest_transactions(v_owner, v_conn, v_imp, 'shopee', v_txn);
  r2 := megaresults.ingest_transactions(v_owner, v_conn, v_imp, 'shopee', v_txn);

  v_txn2 := jsonb_set(jsonb_set(v_txn,'{0,status}','"approved"'),'{0,commissionNet}','2.5');
  v_txn2 := jsonb_set(jsonb_set(v_txn2,'{0,statusRaw}','"Concluido"'),
                      '{0,approvedAt}','"2026-08-01T12:00:00.000Z"');
  r3 := megaresults.ingest_transactions(v_owner, v_conn, v_imp, 'shopee', v_txn2);

  c1 := megaresults.ingest_clicks(v_owner, v_conn, v_imp, 'shopee', v_clk);
  c2 := megaresults.ingest_clicks(v_owner, v_conn, v_imp, 'shopee', v_clk);

  -- ---- contagens de retorno -------------------------------------------------
  IF r1 <> '{"inserted":1,"updated":0,"skipped":0,"total":1}'::jsonb THEN
    RAISE EXCEPTION '1a carga deveria inserir 1, veio %', r1;
  END IF;
  IF r2 <> '{"inserted":0,"updated":0,"skipped":1,"total":1}'::jsonb THEN
    RAISE EXCEPTION 'reimportar arquivo identico deveria pular a linha, veio %', r2;
  END IF;
  IF r3 <> '{"inserted":0,"updated":1,"skipped":0,"total":1}'::jsonb THEN
    RAISE EXCEPTION 'mudanca de status/comissao deveria atualizar 1, veio %', r3;
  END IF;
  IF c1 <> '{"inserted":1,"updated":0,"skipped":0,"total":1}'::jsonb THEN
    RAISE EXCEPTION '1o clique deveria inserir 1, veio %', c1;
  END IF;
  IF c2 <> '{"inserted":0,"updated":0,"skipped":1,"total":1}'::jsonb THEN
    RAISE EXCEPTION 'clique repetido deveria pular, veio %', c2;
  END IF;

  -- ---- efeitos no banco -----------------------------------------------------
  SELECT f.status::text st, f.status_raw sr, f.commission_net cn,
         f.approved_at IS NOT NULL aprov, f.product_id IS NOT NULL p,
         f.category_id IS NOT NULL c, f.merchant_id IS NOT NULL m,
         f.campaign_id IS NOT NULL cp, f.raw ? 'paymentId' rw
    INTO v_f FROM megaresults.fact_transaction f WHERE f.owner_id = v_owner;

  IF v_f.st <> 'approved' OR v_f.cn <> 2.5 OR v_f.sr <> 'Concluido' OR NOT v_f.aprov THEN
    RAISE EXCEPTION 'a 3a carga nao gravou: status=% raw=% comissao=% aprovado=%',
      v_f.st, v_f.sr, v_f.cn, v_f.aprov;
  END IF;
  IF NOT (v_f.p AND v_f.c AND v_f.m AND v_f.cp) THEN
    RAISE EXCEPTION 'dimensao nao resolvida: produto=% categoria=% loja=% campanha=%',
      v_f.p, v_f.c, v_f.m, v_f.cp;
  END IF;
  IF NOT v_f.rw THEN
    RAISE EXCEPTION 'jsonb raw perdeu paymentId';
  END IF;

  -- Duas linhas: a 1a carga grava a entrada (o WHERE do INSERT aceita
  -- `b.dedupe_key IS NULL`) e a 3a grava a transicao pending -> approved. A 2a,
  -- identica, nao gera nada.
  SELECT count(*) INTO v_hist FROM megaresults.fact_transaction_history WHERE owner_id = v_owner;
  IF v_hist <> 2 THEN
    RAISE EXCEPTION 'historico deveria ter 2 linhas (entrada + transicao), tem %', v_hist;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM megaresults.fact_transaction_history
                  WHERE owner_id = v_owner AND from_status = 'pending'
                    AND to_status = 'approved' AND to_commission = 2.5) THEN
    RAISE EXCEPTION 'faltou a linha de historico pending -> approved';
  END IF;

  -- Categoria: 3 niveis, e L2/L3 apontando para o pai (o que a migration 10 corrigiu).
  IF (SELECT count(*) FROM megaresults.dim_category WHERE owner_id=v_owner) <> 3 THEN
    RAISE EXCEPTION 'deveria haver 3 categorias, ha %',
      (SELECT count(*) FROM megaresults.dim_category WHERE owner_id=v_owner);
  END IF;
  IF (SELECT count(*) FROM megaresults.dim_category
       WHERE owner_id=v_owner AND level>1 AND parent_id IS NULL) <> 0 THEN
    RAISE EXCEPTION 'categoria de nivel 2/3 ficou sem pai';
  END IF;

  -- Transacao (28/07 17:42 UTC = 14:42 em SP) e clique (28/07 00:12 UTC = 27/07
  -- 21:12 em SP) caem em dias civis diferentes -> 2 dias marcados.
  SELECT count(*) INTO v_dirty FROM megaresults.rollup_dirty WHERE owner_id = v_owner;
  IF v_dirty <> 2 THEN
    RAISE EXCEPTION 'rollup_dirty deveria ter 2 dias (fuso de SP), tem %', v_dirty;
  END IF;

  IF (SELECT count(*) FROM megaresults.fact_click WHERE owner_id=v_owner) <> 1 THEN
    RAISE EXCEPTION 'deveria haver exatamente 1 clique';
  END IF;

  RAISE NOTICE 'OK: 14 assercoes passaram';

  -- ---- limpeza --------------------------------------------------------------
  DELETE FROM megaresults.fact_transaction         WHERE owner_id = v_owner;
  DELETE FROM megaresults.fact_click               WHERE owner_id = v_owner;
  DELETE FROM megaresults.fact_transaction_history WHERE owner_id = v_owner;
  DELETE FROM megaresults.rollup_dirty             WHERE owner_id = v_owner;
  DELETE FROM megaresults.import_issue             WHERE owner_id = v_owner;
  DELETE FROM megaresults.import_batch             WHERE owner_id = v_owner;
  DELETE FROM megaresults.dim_product              WHERE owner_id = v_owner;
  DELETE FROM megaresults.dim_category             WHERE owner_id = v_owner;
  DELETE FROM megaresults.dim_merchant             WHERE owner_id = v_owner;
  DELETE FROM megaresults.dim_campaign             WHERE owner_id = v_owner;
  DELETE FROM megaresults.connection
    WHERE owner_id = v_owner AND label = '__teste_idempotencia__';
END $test$;
