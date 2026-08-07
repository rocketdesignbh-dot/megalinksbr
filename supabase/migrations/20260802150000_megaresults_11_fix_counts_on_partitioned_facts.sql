-- Corrige megaresults_09/10: `RETURNING (xmax = 0)` falha em tabela
-- particionada ("cannot retrieve a system column in this context"). As
-- contagens passam a ser derivadas do snapshot _before, o que e exato e
-- independente de coluna de sistema.
CREATE OR REPLACE FUNCTION megaresults.ingest_transactions(
  p_owner uuid, p_connection uuid, p_import uuid, p_store public.marketplace, p_rows jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = megaresults, public, extensions, pg_temp
AS $fn$
DECLARE v_total int; v_inserted int := 0; v_updated int := 0;
BEGIN
  DROP TABLE IF EXISTS _src; DROP TABLE IF EXISTS _before;

  CREATE TEMP TABLE _src ON COMMIT DROP AS
  SELECT * FROM jsonb_to_recordset(p_rows) AS r(
    "dedupeKey" text, "externalOrderId" text, "externalItemId" text, "externalVariantId" text,
    "occurredAt" timestamptz, "clickedAt" timestamptz, "approvedAt" timestamptz,
    "status" text, "statusRaw" text, "attribution" text, "buyerKind" text,
    "currency" text, "quantity" int, "unitPrice" numeric, "grossRevenue" numeric,
    "refundAmount" numeric, "commissionGross" numeric, "platformFee" numeric,
    "commissionNet" numeric, "commissionRate" numeric, "offerType" text,
    "merchantExternalId" text, "merchantName" text, "merchantType" text,
    "productName" text, "categoryL1" text, "categoryL2" text, "categoryL3" text,
    "channel" text, "subId1" text, "subId2" text, "subId3" text, "subId4" text, "subId5" text,
    "campaignKey" text, "raw" jsonb);

  SELECT count(*) INTO v_total FROM _src;
  IF v_total = 0 THEN RETURN jsonb_build_object('inserted',0,'updated',0,'skipped',0,'total',0); END IF;

  -- Snapshot ANTES do upsert. Serve a dois propositos: o de-para do historico
  -- e as contagens de retorno.
  CREATE TEMP TABLE _before ON COMMIT DROP AS
  SELECT f.dedupe_key, f.occurred_at, f.status, f.commission_net, f.gross_revenue
    FROM megaresults.fact_transaction f
    JOIN _src s ON s."dedupeKey" = f.dedupe_key AND s."occurredAt" = f.occurred_at
   WHERE f.owner_id = p_owner;

  -- Mesmos tres campos do WHERE do DO UPDATE: o que nao mudou nao e escrito e
  -- portanto conta como `skipped`.
  SELECT count(*) FILTER (WHERE b.dedupe_key IS NULL),
         count(*) FILTER (WHERE b.dedupe_key IS NOT NULL AND (
              b.status         IS DISTINCT FROM s."status"::megaresults.txn_status
           OR b.commission_net IS DISTINCT FROM COALESCE(s."commissionNet",0)
           OR b.gross_revenue  IS DISTINCT FROM COALESCE(s."grossRevenue",0)))
    INTO v_inserted, v_updated
    FROM _src s LEFT JOIN _before b
      ON b.dedupe_key = s."dedupeKey" AND b.occurred_at = s."occurredAt";

  INSERT INTO megaresults.dim_merchant (owner_id, store, external_id, name, merchant_type)
  SELECT DISTINCT ON (COALESCE(s."merchantExternalId", s."merchantName"))
         p_owner, p_store, COALESCE(s."merchantExternalId", s."merchantName"),
         COALESCE(s."merchantName", s."merchantExternalId"), s."merchantType"
    FROM _src s WHERE COALESCE(s."merchantExternalId", s."merchantName") IS NOT NULL
   ORDER BY COALESCE(s."merchantExternalId", s."merchantName"), s."occurredAt" DESC
  ON CONFLICT (owner_id, store, external_id) DO UPDATE SET name = EXCLUDED.name,
    merchant_type = COALESCE(EXCLUDED.merchant_type, megaresults.dim_merchant.merchant_type);

  INSERT INTO megaresults.dim_category (owner_id, store, level, parent_id, name, path)
  SELECT DISTINCT p_owner, p_store, 1, NULL::uuid, btrim(s."categoryL1"),
         megaresults.category_path(s."categoryL1", NULL, NULL)
    FROM _src s WHERE COALESCE(btrim(s."categoryL1"),'') <> ''
  ON CONFLICT (owner_id, store, level, name, COALESCE(parent_id,'00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET path = EXCLUDED.path;

  INSERT INTO megaresults.dim_category (owner_id, store, level, parent_id, name, path)
  SELECT DISTINCT p_owner, p_store, 2, c1.id, btrim(s."categoryL2"),
         megaresults.category_path(s."categoryL1", s."categoryL2", NULL)
    FROM _src s JOIN megaresults.dim_category c1 ON c1.owner_id=p_owner AND c1.store=p_store
     AND c1.level=1 AND c1.name=btrim(s."categoryL1")
   WHERE COALESCE(btrim(s."categoryL2"),'') <> ''
  ON CONFLICT (owner_id, store, level, name, COALESCE(parent_id,'00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET path = EXCLUDED.path;

  INSERT INTO megaresults.dim_category (owner_id, store, level, parent_id, name, path)
  SELECT DISTINCT p_owner, p_store, 3, c2.id, btrim(s."categoryL3"),
         megaresults.category_path(s."categoryL1", s."categoryL2", s."categoryL3")
    FROM _src s JOIN megaresults.dim_category c2 ON c2.owner_id=p_owner AND c2.store=p_store
     AND c2.level=2 AND c2.path=megaresults.category_path(s."categoryL1", s."categoryL2", NULL)
   WHERE COALESCE(btrim(s."categoryL3"),'') <> ''
  ON CONFLICT (owner_id, store, level, name, COALESCE(parent_id,'00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET path = EXCLUDED.path;

  INSERT INTO megaresults.dim_product
    (owner_id, store, external_id, variant_id, name, merchant_id, category_id, last_seen_at)
  SELECT DISTINCT ON (s."externalItemId", COALESCE(s."externalVariantId",''))
         p_owner, p_store, s."externalItemId", COALESCE(s."externalVariantId",''),
         COALESCE(s."productName", s."externalItemId"), m.id, c.id, now()
    FROM _src s
    LEFT JOIN megaresults.dim_merchant m ON m.owner_id=p_owner AND m.store=p_store
     AND m.external_id = COALESCE(s."merchantExternalId", s."merchantName")
    LEFT JOIN megaresults.dim_category c ON c.owner_id=p_owner AND c.store=p_store
     AND c.path = megaresults.category_path(s."categoryL1", s."categoryL2", s."categoryL3")
   WHERE s."externalItemId" IS NOT NULL
   ORDER BY s."externalItemId", COALESCE(s."externalVariantId",''), s."occurredAt" DESC
  ON CONFLICT (owner_id, store, external_id, variant_id) DO UPDATE SET name = EXCLUDED.name,
    merchant_id = COALESCE(EXCLUDED.merchant_id, megaresults.dim_product.merchant_id),
    category_id = COALESCE(EXCLUDED.category_id, megaresults.dim_product.category_id),
    last_seen_at = GREATEST(megaresults.dim_product.last_seen_at, EXCLUDED.last_seen_at);

  INSERT INTO megaresults.dim_campaign
    (owner_id, channel, sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5, normalized_key, display_name)
  SELECT DISTINCT ON (s."campaignKey") p_owner, s."channel", s."subId1", s."subId2", s."subId3",
         s."subId4", s."subId5", s."campaignKey",
         COALESCE(NULLIF(concat_ws(' / ', s."channel", s."subId1", s."subId2"),''),'Sem campanha')
    FROM _src s WHERE s."campaignKey" IS NOT NULL ORDER BY s."campaignKey"
  ON CONFLICT (owner_id, normalized_key) DO NOTHING;

  -- O WHERE do DO UPDATE evita I/O quando nada mudou: reimportar o mesmo mes
  -- duas vezes nao escreve nada na segunda vez.
  INSERT INTO megaresults.fact_transaction (
    owner_id, connection_id, store, import_id, external_order_id, external_item_id, dedupe_key,
    occurred_at, clicked_at, approved_at, status_changed_at,
    product_id, merchant_id, category_id, campaign_id,
    status, status_raw, attribution, buyer_kind, currency, quantity, unit_price,
    gross_revenue, refund_amount, commission_gross, platform_fee, commission_net,
    commission_rate, offer_type, raw)
  SELECT p_owner, p_connection, p_store, p_import,
         s."externalOrderId", s."externalItemId", s."dedupeKey",
         s."occurredAt", s."clickedAt", s."approvedAt", now(),
         pr.id, m.id, c.id, cp.id,
         s."status"::megaresults.txn_status, COALESCE(s."statusRaw",''),
         COALESCE(s."attribution",'unknown')::megaresults.attribution,
         COALESCE(s."buyerKind",'unknown')::megaresults.buyer_kind,
         COALESCE(s."currency",'BRL'), COALESCE(s."quantity",1), s."unitPrice",
         COALESCE(s."grossRevenue",0), COALESCE(s."refundAmount",0),
         COALESCE(s."commissionGross",0), COALESCE(s."platformFee",0),
         COALESCE(s."commissionNet",0), s."commissionRate", s."offerType",
         COALESCE(s."raw",'{}'::jsonb)
    FROM _src s
    LEFT JOIN megaresults.dim_product pr ON pr.owner_id=p_owner AND pr.store=p_store
     AND pr.external_id=s."externalItemId" AND pr.variant_id=COALESCE(s."externalVariantId",'')
    LEFT JOIN megaresults.dim_merchant m ON m.owner_id=p_owner AND m.store=p_store
     AND m.external_id=COALESCE(s."merchantExternalId", s."merchantName")
    LEFT JOIN megaresults.dim_category c ON c.owner_id=p_owner AND c.store=p_store
     AND c.path=megaresults.category_path(s."categoryL1", s."categoryL2", s."categoryL3")
    LEFT JOIN megaresults.dim_campaign cp ON cp.owner_id=p_owner AND cp.normalized_key=s."campaignKey"
  ON CONFLICT (owner_id, occurred_at, dedupe_key) DO UPDATE SET
    status=EXCLUDED.status, status_raw=EXCLUDED.status_raw,
    commission_net=EXCLUDED.commission_net, commission_gross=EXCLUDED.commission_gross,
    platform_fee=EXCLUDED.platform_fee, gross_revenue=EXCLUDED.gross_revenue,
    refund_amount=EXCLUDED.refund_amount,
    approved_at=COALESCE(EXCLUDED.approved_at, megaresults.fact_transaction.approved_at),
    status_changed_at=CASE WHEN megaresults.fact_transaction.status IS DISTINCT FROM EXCLUDED.status
                           THEN now() ELSE megaresults.fact_transaction.status_changed_at END,
    import_id=EXCLUDED.import_id,
    raw=megaresults.fact_transaction.raw || EXCLUDED.raw,
    updated_at=now()
  WHERE megaresults.fact_transaction.status         IS DISTINCT FROM EXCLUDED.status
     OR megaresults.fact_transaction.commission_net IS DISTINCT FROM EXCLUDED.commission_net
     OR megaresults.fact_transaction.gross_revenue  IS DISTINCT FROM EXCLUDED.gross_revenue;

  INSERT INTO megaresults.fact_transaction_history
    (owner_id, dedupe_key, import_id, from_status, to_status, from_commission, to_commission)
  SELECT p_owner, s."dedupeKey", p_import, b.status, s."status"::megaresults.txn_status,
         b.commission_net, COALESCE(s."commissionNet",0)
    FROM _src s LEFT JOIN _before b ON b.dedupe_key=s."dedupeKey" AND b.occurred_at=s."occurredAt"
   WHERE b.dedupe_key IS NULL
      OR b.status IS DISTINCT FROM s."status"::megaresults.txn_status
      OR b.commission_net IS DISTINCT FROM COALESCE(s."commissionNet",0);

  -- Dia civil de Sao Paulo, nao dia UTC.
  INSERT INTO megaresults.rollup_dirty (owner_id, day)
  SELECT DISTINCT p_owner, (s."occurredAt" AT TIME ZONE 'America/Sao_Paulo')::date FROM _src s
  ON CONFLICT (owner_id, day) DO NOTHING;

  RETURN jsonb_build_object('inserted', v_inserted, 'updated', v_updated,
                            'skipped', v_total - v_inserted - v_updated, 'total', v_total);
END; $fn$;

CREATE OR REPLACE FUNCTION megaresults.ingest_clicks(
  p_owner uuid, p_connection uuid, p_import uuid, p_store public.marketplace, p_rows jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = megaresults, public, extensions, pg_temp
AS $fn$
DECLARE v_total int; v_inserted int := 0; v_updated int := 0;
BEGIN
  DROP TABLE IF EXISTS _srcc; DROP TABLE IF EXISTS _beforec;

  CREATE TEMP TABLE _srcc ON COMMIT DROP AS
  SELECT * FROM jsonb_to_recordset(p_rows) AS r(
    "dedupeKey" text, "externalClickId" text, "occurredAt" timestamptz, "channel" text,
    "subId1" text, "subId2" text, "subId3" text, "subId4" text, "subId5" text,
    "campaignKey" text, "referrer" text, "region" text, "country" text,
    "device" text, "os" text, "browser" text, "isBot" boolean, "shortLinkCode" text, "raw" jsonb);

  SELECT count(*) INTO v_total FROM _srcc;
  IF v_total = 0 THEN RETURN jsonb_build_object('inserted',0,'updated',0,'skipped',0,'total',0); END IF;

  CREATE TEMP TABLE _beforec ON COMMIT DROP AS
  SELECT f.dedupe_key, f.occurred_at, f.campaign_id, f.referrer, f.region
    FROM megaresults.fact_click f
    JOIN _srcc s ON s."dedupeKey"=f.dedupe_key AND s."occurredAt"=f.occurred_at
   WHERE f.owner_id = p_owner;

  INSERT INTO megaresults.dim_campaign
    (owner_id, channel, sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5, normalized_key, display_name)
  SELECT DISTINCT ON (s."campaignKey") p_owner, s."channel", s."subId1", s."subId2", s."subId3",
         s."subId4", s."subId5", s."campaignKey",
         COALESCE(NULLIF(concat_ws(' / ', s."channel", s."subId1", s."subId2"),''),'Sem campanha')
    FROM _srcc s WHERE s."campaignKey" IS NOT NULL ORDER BY s."campaignKey"
  ON CONFLICT (owner_id, normalized_key) DO NOTHING;

  SELECT count(*) FILTER (WHERE b.dedupe_key IS NULL),
         count(*) FILTER (WHERE b.dedupe_key IS NOT NULL AND (
              b.campaign_id IS DISTINCT FROM cp.id
           OR b.referrer    IS DISTINCT FROM s."referrer"
           OR b.region      IS DISTINCT FROM s."region"))
    INTO v_inserted, v_updated
    FROM _srcc s
    LEFT JOIN _beforec b ON b.dedupe_key=s."dedupeKey" AND b.occurred_at=s."occurredAt"
    LEFT JOIN megaresults.dim_campaign cp ON cp.owner_id=p_owner AND cp.normalized_key=s."campaignKey";

  INSERT INTO megaresults.fact_click (
    owner_id, connection_id, store, import_id, external_click_id, dedupe_key, occurred_at,
    campaign_id, short_link_code, referrer, region, country, device, os, browser, is_bot, raw)
  SELECT p_owner, p_connection, p_store, p_import, s."externalClickId", s."dedupeKey", s."occurredAt",
         cp.id, s."shortLinkCode", s."referrer", s."region", COALESCE(s."country",'BR'),
         s."device", s."os", s."browser", COALESCE(s."isBot",false), COALESCE(s."raw",'{}'::jsonb)
    FROM _srcc s
    LEFT JOIN megaresults.dim_campaign cp ON cp.owner_id=p_owner AND cp.normalized_key=s."campaignKey"
  ON CONFLICT (owner_id, occurred_at, dedupe_key) DO UPDATE SET
    campaign_id=EXCLUDED.campaign_id,
    referrer=COALESCE(EXCLUDED.referrer, megaresults.fact_click.referrer),
    region=COALESCE(EXCLUDED.region, megaresults.fact_click.region),
    import_id=EXCLUDED.import_id,
    raw=megaresults.fact_click.raw || EXCLUDED.raw
  WHERE megaresults.fact_click.campaign_id IS DISTINCT FROM EXCLUDED.campaign_id
     OR megaresults.fact_click.referrer    IS DISTINCT FROM EXCLUDED.referrer
     OR megaresults.fact_click.region      IS DISTINCT FROM EXCLUDED.region;

  INSERT INTO megaresults.rollup_dirty (owner_id, day)
  SELECT DISTINCT p_owner, (s."occurredAt" AT TIME ZONE 'America/Sao_Paulo')::date FROM _srcc s
  ON CONFLICT (owner_id, day) DO NOTHING;

  RETURN jsonb_build_object('inserted', v_inserted, 'updated', v_updated,
                            'skipped', v_total - v_inserted - v_updated, 'total', v_total);
END; $fn$;

REVOKE ALL ON FUNCTION megaresults.ingest_transactions(uuid,uuid,uuid,public.marketplace,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION megaresults.ingest_clicks(uuid,uuid,uuid,public.marketplace,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION megaresults.ingest_transactions(uuid,uuid,uuid,public.marketplace,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION megaresults.ingest_clicks(uuid,uuid,uuid,public.marketplace,jsonb) TO service_role;
