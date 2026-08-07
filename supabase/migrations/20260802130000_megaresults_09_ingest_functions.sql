-- Funcoes de carga do mr-ingest. Uma chamada por lote (5.000 linhas), uma
-- transacao, um round-trip. A logica de ON CONFLICT condicional, historico de
-- status e marcacao de rollup vive aqui e nao no Node porque PostgREST nao
-- expressa upsert condicional.
-- Chamadas com a service_role key (rolbypassrls = true), entao SECURITY INVOKER
-- basta: nao ha escalacao de privilegio embutida na funcao.

-- Caminho ltree deterministico, derivado so dos nomes: nenhum lookup necessario
-- e o mesmo trio de categorias sempre produz o mesmo caminho.
-- Labels sao md5 (32 hex) porque nome de categoria tem espaco e acento, que
-- ltree nao aceita como label.
CREATE OR REPLACE FUNCTION megaresults.category_path(l1 text, l2 text, l3 text)
RETURNS extensions.ltree
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = extensions, pg_catalog
AS $$
  SELECT CASE
    WHEN l1 IS NULL OR btrim(l1) = '' THEN NULL
    WHEN l2 IS NULL OR btrim(l2) = '' THEN text2ltree(md5(lower(btrim(l1))))
    WHEN l3 IS NULL OR btrim(l3) = '' THEN text2ltree(md5(lower(btrim(l1))) || '.' || md5(lower(btrim(l2))))
    ELSE text2ltree(md5(lower(btrim(l1))) || '.' || md5(lower(btrim(l2))) || '.' || md5(lower(btrim(l3))))
  END;
$$;

COMMENT ON FUNCTION megaresults.category_path(text,text,text) IS
  'Caminho ltree deterministico de uma hierarquia L1/L2/L3. Labels md5 porque nome de categoria nao e label ltree valido.';


CREATE OR REPLACE FUNCTION megaresults.ingest_transactions(
  p_owner      uuid,
  p_connection uuid,
  p_import     uuid,
  p_store      public.marketplace,
  p_rows       jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = megaresults, public, extensions, pg_temp
AS $fn$
DECLARE
  v_total    int;
  v_inserted int := 0;
  v_updated  int := 0;
BEGIN
  DROP TABLE IF EXISTS _src;
  DROP TABLE IF EXISTS _before;

  CREATE TEMP TABLE _src ON COMMIT DROP AS
  SELECT * FROM jsonb_to_recordset(p_rows) AS r(
    "dedupeKey"          text,
    "externalOrderId"    text,
    "externalItemId"     text,
    "externalVariantId"  text,
    "occurredAt"         timestamptz,
    "clickedAt"          timestamptz,
    "approvedAt"         timestamptz,
    "status"             text,
    "statusRaw"          text,
    "attribution"        text,
    "buyerKind"          text,
    "currency"           text,
    "quantity"           int,
    "unitPrice"          numeric,
    "grossRevenue"       numeric,
    "refundAmount"       numeric,
    "commissionGross"    numeric,
    "platformFee"        numeric,
    "commissionNet"      numeric,
    "commissionRate"     numeric,
    "offerType"          text,
    "merchantExternalId" text,
    "merchantName"       text,
    "merchantType"       text,
    "productName"        text,
    "categoryL1"         text,
    "categoryL2"         text,
    "categoryL3"         text,
    "channel"            text,
    "subId1"             text,
    "subId2"             text,
    "subId3"             text,
    "subId4"             text,
    "subId5"             text,
    "campaignKey"        text,
    "raw"                jsonb
  );

  SELECT count(*) INTO v_total FROM _src;
  IF v_total = 0 THEN
    RETURN jsonb_build_object('inserted', 0, 'updated', 0, 'skipped', 0, 'total', 0);
  END IF;

  -- Estado anterior, capturado ANTES do upsert: e a unica forma de saber
  -- de-para de status e comissao para o historico.
  CREATE TEMP TABLE _before ON COMMIT DROP AS
  SELECT f.dedupe_key, f.occurred_at, f.status, f.commission_net
    FROM megaresults.fact_transaction f
    JOIN _src s ON s."dedupeKey" = f.dedupe_key AND s."occurredAt" = f.occurred_at
   WHERE f.owner_id = p_owner;

  -- ---- dimensoes (doc 08 §7) ----------------------------------------------
  INSERT INTO megaresults.dim_merchant (owner_id, store, external_id, name, merchant_type)
  SELECT DISTINCT ON (COALESCE(s."merchantExternalId", s."merchantName"))
         p_owner, p_store,
         COALESCE(s."merchantExternalId", s."merchantName"),
         COALESCE(s."merchantName", s."merchantExternalId"),
         s."merchantType"
    FROM _src s
   WHERE COALESCE(s."merchantExternalId", s."merchantName") IS NOT NULL
   ORDER BY COALESCE(s."merchantExternalId", s."merchantName"), s."occurredAt" DESC
  ON CONFLICT (owner_id, store, external_id) DO UPDATE
     SET name          = EXCLUDED.name,
         merchant_type = COALESCE(EXCLUDED.merchant_type, megaresults.dim_merchant.merchant_type);

  -- categorias em cascata L1 -> L2 -> L3; cada nivel precisa do anterior para
  -- resolver parent_id, entao sao tres statements e nao um.
  INSERT INTO megaresults.dim_category (owner_id, store, level, parent_id, name, path)
  SELECT DISTINCT p_owner, p_store, 1, NULL, btrim(s."categoryL1"),
         megaresults.category_path(s."categoryL1", NULL, NULL)
    FROM _src s WHERE COALESCE(btrim(s."categoryL1"), '') <> ''
  ON CONFLICT (owner_id, store, level, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET path = EXCLUDED.path;

  INSERT INTO megaresults.dim_category (owner_id, store, level, parent_id, name, path)
  SELECT DISTINCT p_owner, p_store, 2, c1.id, btrim(s."categoryL2"),
         megaresults.category_path(s."categoryL1", s."categoryL2", NULL)
    FROM _src s
    JOIN megaresults.dim_category c1
      ON c1.owner_id = p_owner AND c1.store = p_store AND c1.level = 1
     AND c1.name = btrim(s."categoryL1")
   WHERE COALESCE(btrim(s."categoryL2"), '') <> ''
  ON CONFLICT (owner_id, store, level, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET path = EXCLUDED.path;

  INSERT INTO megaresults.dim_category (owner_id, store, level, parent_id, name, path)
  SELECT DISTINCT p_owner, p_store, 3, c2.id, btrim(s."categoryL3"),
         megaresults.category_path(s."categoryL1", s."categoryL2", s."categoryL3")
    FROM _src s
    JOIN megaresults.dim_category c2
      ON c2.owner_id = p_owner AND c2.store = p_store AND c2.level = 2
     AND c2.path = megaresults.category_path(s."categoryL1", s."categoryL2", NULL)
   WHERE COALESCE(btrim(s."categoryL3"), '') <> ''
  ON CONFLICT (owner_id, store, level, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET path = EXCLUDED.path;

  INSERT INTO megaresults.dim_product
    (owner_id, store, external_id, variant_id, name, merchant_id, category_id, last_seen_at)
  SELECT DISTINCT ON (s."externalItemId", COALESCE(s."externalVariantId", ''))
         p_owner, p_store, s."externalItemId", COALESCE(s."externalVariantId", ''),
         COALESCE(s."productName", s."externalItemId"),
         m.id, c.id, now()
    FROM _src s
    LEFT JOIN megaresults.dim_merchant m
      ON m.owner_id = p_owner AND m.store = p_store
     AND m.external_id = COALESCE(s."merchantExternalId", s."merchantName")
    LEFT JOIN megaresults.dim_category c
      ON c.owner_id = p_owner AND c.store = p_store
     AND c.path = megaresults.category_path(s."categoryL1", s."categoryL2", s."categoryL3")
   WHERE s."externalItemId" IS NOT NULL
   ORDER BY s."externalItemId", COALESCE(s."externalVariantId", ''), s."occurredAt" DESC
  ON CONFLICT (owner_id, store, external_id, variant_id) DO UPDATE
     SET name         = EXCLUDED.name,
         merchant_id  = COALESCE(EXCLUDED.merchant_id,  megaresults.dim_product.merchant_id),
         category_id  = COALESCE(EXCLUDED.category_id,  megaresults.dim_product.category_id),
         last_seen_at = GREATEST(megaresults.dim_product.last_seen_at, EXCLUDED.last_seen_at);

  INSERT INTO megaresults.dim_campaign
    (owner_id, channel, sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5, normalized_key, display_name)
  SELECT DISTINCT ON (s."campaignKey")
         p_owner, s."channel", s."subId1", s."subId2", s."subId3", s."subId4", s."subId5",
         s."campaignKey",
         COALESCE(NULLIF(concat_ws(' / ', s."channel", s."subId1", s."subId2"), ''), 'Sem campanha')
    FROM _src s
   WHERE s."campaignKey" IS NOT NULL
   ORDER BY s."campaignKey"
  ON CONFLICT (owner_id, normalized_key) DO NOTHING;

  -- ---- fatos (doc 08 §8) ---------------------------------------------------
  -- O WHERE do DO UPDATE evita I/O quando nada mudou: reimportar o mesmo mes
  -- duas vezes nao escreve nada na segunda vez.
  WITH upserted AS (
    INSERT INTO megaresults.fact_transaction (
      owner_id, connection_id, store, import_id,
      external_order_id, external_item_id, dedupe_key,
      occurred_at, clicked_at, approved_at, status_changed_at,
      product_id, merchant_id, category_id, campaign_id,
      status, status_raw, attribution, buyer_kind,
      currency, quantity, unit_price, gross_revenue, refund_amount,
      commission_gross, platform_fee, commission_net, commission_rate,
      offer_type, raw
    )
    SELECT p_owner, p_connection, p_store, p_import,
           s."externalOrderId", s."externalItemId", s."dedupeKey",
           s."occurredAt", s."clickedAt", s."approvedAt", now(),
           pr.id, m.id, c.id, cp.id,
           s."status"::megaresults.txn_status,
           COALESCE(s."statusRaw", ''),
           COALESCE(s."attribution", 'unknown')::megaresults.attribution,
           COALESCE(s."buyerKind",   'unknown')::megaresults.buyer_kind,
           COALESCE(s."currency", 'BRL'),
           COALESCE(s."quantity", 1),
           s."unitPrice",
           COALESCE(s."grossRevenue", 0),
           COALESCE(s."refundAmount", 0),
           COALESCE(s."commissionGross", 0),
           COALESCE(s."platformFee", 0),
           COALESCE(s."commissionNet", 0),
           s."commissionRate",
           s."offerType",
           COALESCE(s."raw", '{}'::jsonb)
      FROM _src s
      LEFT JOIN megaresults.dim_product pr
        ON pr.owner_id = p_owner AND pr.store = p_store
       AND pr.external_id = s."externalItemId"
       AND pr.variant_id  = COALESCE(s."externalVariantId", '')
      LEFT JOIN megaresults.dim_merchant m
        ON m.owner_id = p_owner AND m.store = p_store
       AND m.external_id = COALESCE(s."merchantExternalId", s."merchantName")
      LEFT JOIN megaresults.dim_category c
        ON c.owner_id = p_owner AND c.store = p_store
       AND c.path = megaresults.category_path(s."categoryL1", s."categoryL2", s."categoryL3")
      LEFT JOIN megaresults.dim_campaign cp
        ON cp.owner_id = p_owner AND cp.normalized_key = s."campaignKey"
    ON CONFLICT (owner_id, occurred_at, dedupe_key) DO UPDATE SET
      status            = EXCLUDED.status,
      status_raw        = EXCLUDED.status_raw,
      commission_net    = EXCLUDED.commission_net,
      commission_gross  = EXCLUDED.commission_gross,
      platform_fee      = EXCLUDED.platform_fee,
      gross_revenue     = EXCLUDED.gross_revenue,
      refund_amount     = EXCLUDED.refund_amount,
      approved_at       = COALESCE(EXCLUDED.approved_at, megaresults.fact_transaction.approved_at),
      status_changed_at = CASE
                            WHEN megaresults.fact_transaction.status IS DISTINCT FROM EXCLUDED.status
                            THEN now() ELSE megaresults.fact_transaction.status_changed_at END,
      import_id         = EXCLUDED.import_id,
      raw               = megaresults.fact_transaction.raw || EXCLUDED.raw,
      updated_at        = now()
    WHERE megaresults.fact_transaction.status         IS DISTINCT FROM EXCLUDED.status
       OR megaresults.fact_transaction.commission_net IS DISTINCT FROM EXCLUDED.commission_net
       OR megaresults.fact_transaction.gross_revenue  IS DISTINCT FROM EXCLUDED.gross_revenue
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert),
         count(*) FILTER (WHERE NOT was_insert)
    INTO v_inserted, v_updated
    FROM upserted;

  -- ---- historico (toda transicao, inclusive a primeira aparicao) -----------
  INSERT INTO megaresults.fact_transaction_history
    (owner_id, dedupe_key, import_id, from_status, to_status, from_commission, to_commission)
  SELECT p_owner, s."dedupeKey", p_import,
         b.status, s."status"::megaresults.txn_status,
         b.commission_net, COALESCE(s."commissionNet", 0)
    FROM _src s
    LEFT JOIN _before b
      ON b.dedupe_key = s."dedupeKey" AND b.occurred_at = s."occurredAt"
   WHERE b.dedupe_key IS NULL
      OR b.status         IS DISTINCT FROM s."status"::megaresults.txn_status
      OR b.commission_net IS DISTINCT FROM COALESCE(s."commissionNet", 0);

  -- ---- invalidacao de rollup ----------------------------------------------
  -- O dia e o dia civil de Sao Paulo, nao o dia UTC: um pedido das 22h de SP
  -- pertence ao dia de SP, nao ao seguinte.
  INSERT INTO megaresults.rollup_dirty (owner_id, day)
  SELECT DISTINCT p_owner, (s."occurredAt" AT TIME ZONE 'America/Sao_Paulo')::date
    FROM _src s
  ON CONFLICT (owner_id, day) DO NOTHING;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated',  v_updated,
    'skipped',  v_total - v_inserted - v_updated,
    'total',    v_total
  );
END;
$fn$;

COMMENT ON FUNCTION megaresults.ingest_transactions(uuid,uuid,uuid,public.marketplace,jsonb) IS
  'Carrega um lote de transacoes canonicas: resolve dimensoes, faz upsert idempotente por dedupe_key, registra historico de status e marca os dias para rollup. Retorna {inserted, updated, skipped, total}.';


CREATE OR REPLACE FUNCTION megaresults.ingest_clicks(
  p_owner      uuid,
  p_connection uuid,
  p_import     uuid,
  p_store      public.marketplace,
  p_rows       jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = megaresults, public, extensions, pg_temp
AS $fn$
DECLARE
  v_total    int;
  v_inserted int := 0;
  v_updated  int := 0;
BEGIN
  DROP TABLE IF EXISTS _srcc;

  CREATE TEMP TABLE _srcc ON COMMIT DROP AS
  SELECT * FROM jsonb_to_recordset(p_rows) AS r(
    "dedupeKey"       text,
    "externalClickId" text,
    "occurredAt"      timestamptz,
    "channel"         text,
    "subId1"          text,
    "subId2"          text,
    "subId3"          text,
    "subId4"          text,
    "subId5"          text,
    "campaignKey"     text,
    "referrer"        text,
    "region"          text,
    "country"         text,
    "device"          text,
    "os"              text,
    "browser"         text,
    "isBot"           boolean,
    "shortLinkCode"   text,
    "raw"             jsonb
  );

  SELECT count(*) INTO v_total FROM _srcc;
  IF v_total = 0 THEN
    RETURN jsonb_build_object('inserted', 0, 'updated', 0, 'skipped', 0, 'total', 0);
  END IF;

  INSERT INTO megaresults.dim_campaign
    (owner_id, channel, sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5, normalized_key, display_name)
  SELECT DISTINCT ON (s."campaignKey")
         p_owner, s."channel", s."subId1", s."subId2", s."subId3", s."subId4", s."subId5",
         s."campaignKey",
         COALESCE(NULLIF(concat_ws(' / ', s."channel", s."subId1", s."subId2"), ''), 'Sem campanha')
    FROM _srcc s
   WHERE s."campaignKey" IS NOT NULL
   ORDER BY s."campaignKey"
  ON CONFLICT (owner_id, normalized_key) DO NOTHING;

  WITH upserted AS (
    INSERT INTO megaresults.fact_click (
      owner_id, connection_id, store, import_id,
      external_click_id, dedupe_key, occurred_at,
      campaign_id, short_link_code, referrer, region, country,
      device, os, browser, is_bot, raw
    )
    SELECT p_owner, p_connection, p_store, p_import,
           s."externalClickId", s."dedupeKey", s."occurredAt",
           cp.id, s."shortLinkCode", s."referrer", s."region",
           COALESCE(s."country", 'BR'),
           s."device", s."os", s."browser", COALESCE(s."isBot", false),
           COALESCE(s."raw", '{}'::jsonb)
      FROM _srcc s
      LEFT JOIN megaresults.dim_campaign cp
        ON cp.owner_id = p_owner AND cp.normalized_key = s."campaignKey"
    ON CONFLICT (owner_id, occurred_at, dedupe_key) DO UPDATE SET
      campaign_id = EXCLUDED.campaign_id,
      referrer    = COALESCE(EXCLUDED.referrer, megaresults.fact_click.referrer),
      region      = COALESCE(EXCLUDED.region,   megaresults.fact_click.region),
      import_id   = EXCLUDED.import_id,
      raw         = megaresults.fact_click.raw || EXCLUDED.raw
    WHERE megaresults.fact_click.campaign_id IS DISTINCT FROM EXCLUDED.campaign_id
       OR megaresults.fact_click.referrer    IS DISTINCT FROM EXCLUDED.referrer
       OR megaresults.fact_click.region      IS DISTINCT FROM EXCLUDED.region
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert),
         count(*) FILTER (WHERE NOT was_insert)
    INTO v_inserted, v_updated
    FROM upserted;

  INSERT INTO megaresults.rollup_dirty (owner_id, day)
  SELECT DISTINCT p_owner, (s."occurredAt" AT TIME ZONE 'America/Sao_Paulo')::date
    FROM _srcc s
  ON CONFLICT (owner_id, day) DO NOTHING;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated',  v_updated,
    'skipped',  v_total - v_inserted - v_updated,
    'total',    v_total
  );
END;
$fn$;

COMMENT ON FUNCTION megaresults.ingest_clicks(uuid,uuid,uuid,public.marketplace,jsonb) IS
  'Carrega um lote de cliques canonicos: resolve campanha, faz upsert idempotente por dedupe_key e marca os dias para rollup.';

-- Somente o mr-ingest (service_role) executa. anon/authenticated nao tem motivo
-- para chamar carga em lote — e o caminho pelo qual owner_id chega como parametro.
REVOKE ALL ON FUNCTION megaresults.ingest_transactions(uuid,uuid,uuid,public.marketplace,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION megaresults.ingest_clicks(uuid,uuid,uuid,public.marketplace,jsonb)       FROM PUBLIC;
GRANT EXECUTE ON FUNCTION megaresults.ingest_transactions(uuid,uuid,uuid,public.marketplace,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION megaresults.ingest_clicks(uuid,uuid,uuid,public.marketplace,jsonb)       TO service_role;
