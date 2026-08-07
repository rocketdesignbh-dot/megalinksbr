-- ── Fato: transacoes (particionado por mes) ───────────────────────
CREATE TABLE megaresults.fact_transaction (
  owner_id          uuid NOT NULL,
  connection_id     uuid NOT NULL,
  store             public.marketplace NOT NULL,
  import_id         uuid NOT NULL,
  external_order_id text NOT NULL,
  external_item_id  text,
  dedupe_key        text NOT NULL,
  occurred_at       timestamptz NOT NULL,
  clicked_at        timestamptz,
  approved_at       timestamptz,
  status_changed_at timestamptz,
  product_id        uuid,
  merchant_id       uuid,
  category_id       uuid,
  campaign_id       uuid,
  status            megaresults.txn_status NOT NULL,
  status_raw        text NOT NULL DEFAULT '',
  attribution       megaresults.attribution NOT NULL DEFAULT 'unknown',
  buyer_kind        megaresults.buyer_kind  NOT NULL DEFAULT 'unknown',
  currency          char(3) NOT NULL DEFAULT 'BRL',
  quantity          int NOT NULL DEFAULT 1,
  unit_price        numeric(14,4),
  gross_revenue     numeric(14,4) NOT NULL DEFAULT 0,
  refund_amount     numeric(14,4) NOT NULL DEFAULT 0,
  commission_gross  numeric(14,4) NOT NULL DEFAULT 0,
  platform_fee      numeric(14,4) NOT NULL DEFAULT 0,
  commission_net    numeric(14,4) NOT NULL DEFAULT 0,
  commission_rate   numeric(8,6),
  offer_type        text,
  raw               jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, occurred_at, dedupe_key)
) PARTITION BY RANGE (occurred_at);

CREATE INDEX idx_txn_owner_status ON megaresults.fact_transaction (owner_id, status, occurred_at DESC);
CREATE INDEX idx_txn_owner_store  ON megaresults.fact_transaction (owner_id, store, occurred_at DESC);
CREATE INDEX idx_txn_campaign     ON megaresults.fact_transaction (owner_id, campaign_id, occurred_at DESC);
CREATE INDEX idx_txn_product      ON megaresults.fact_transaction (owner_id, product_id, occurred_at DESC);
CREATE INDEX idx_txn_category     ON megaresults.fact_transaction (owner_id, category_id, occurred_at DESC);
CREATE INDEX idx_txn_import       ON megaresults.fact_transaction (import_id);

-- ── Fato: cliques (particionado por mes) ──────────────────────────
CREATE TABLE megaresults.fact_click (
  owner_id      uuid NOT NULL,
  connection_id uuid,
  store         public.marketplace NOT NULL,
  import_id     uuid,
  external_click_id text,
  dedupe_key    text NOT NULL,
  occurred_at   timestamptz NOT NULL,
  campaign_id   uuid,
  short_link_code text,
  referrer      text,
  region        text,
  country       char(2) DEFAULT 'BR',
  device        text,
  os            text,
  browser       text,
  is_bot        boolean NOT NULL DEFAULT false,
  raw           jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (owner_id, occurred_at, dedupe_key)
) PARTITION BY RANGE (occurred_at);

CREATE INDEX idx_click_campaign ON megaresults.fact_click (owner_id, campaign_id, occurred_at DESC);
CREATE INDEX idx_click_referrer ON megaresults.fact_click (owner_id, referrer, occurred_at DESC);

-- ── Historico de mudanca de status (base da curva de maturacao) ───
CREATE TABLE megaresults.fact_transaction_history (
  id              bigserial PRIMARY KEY,
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dedupe_key      text NOT NULL,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  import_id       uuid NOT NULL,
  from_status     megaresults.txn_status,
  to_status       megaresults.txn_status NOT NULL,
  from_commission numeric(14,4),
  to_commission   numeric(14,4)
);
CREATE INDEX idx_txnhist ON megaresults.fact_transaction_history (owner_id, dedupe_key, changed_at DESC);

-- ── Rollup diario ─────────────────────────────────────────────────
CREATE TABLE megaresults.rollup_daily (
  owner_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day                 date NOT NULL,
  store               public.marketplace NOT NULL,
  campaign_id         uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  category_id         uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  product_id          uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  clicks              bigint NOT NULL DEFAULT 0,
  orders              bigint NOT NULL DEFAULT 0,
  items               bigint NOT NULL DEFAULT 0,
  orders_approved     bigint NOT NULL DEFAULT 0,
  orders_pending      bigint NOT NULL DEFAULT 0,
  orders_cancelled    bigint NOT NULL DEFAULT 0,
  orders_unpaid       bigint NOT NULL DEFAULT 0,
  gross_revenue       numeric(16,4) NOT NULL DEFAULT 0,
  refund_amount       numeric(16,4) NOT NULL DEFAULT 0,
  commission_approved numeric(16,4) NOT NULL DEFAULT 0,
  commission_pending  numeric(16,4) NOT NULL DEFAULT 0,
  commission_rejected numeric(16,4) NOT NULL DEFAULT 0,
  ad_spend            numeric(16,4) NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, day, store, campaign_id, category_id, product_id)
);
CREATE INDEX idx_rollup_owner_day ON megaresults.rollup_daily (owner_id, day DESC);

-- Fila de dias a recalcular
CREATE TABLE megaresults.rollup_dirty (
  owner_id   uuid NOT NULL,
  day        date NOT NULL,
  queued_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, day)
);

-- ── Manutencao de particoes ───────────────────────────────────────
CREATE OR REPLACE FUNCTION megaresults.ensure_partitions(
  p_months_back int DEFAULT 18,
  p_months_ahead int DEFAULT 6
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = megaresults, pg_catalog AS $fn$
DECLARE
  tbl text; m date; created int := 0; pname text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['fact_transaction','fact_click'] LOOP
    m := date_trunc('month', now())::date - (p_months_back || ' months')::interval;
    WHILE m <= (date_trunc('month', now())::date + (p_months_ahead || ' months')::interval) LOOP
      pname := tbl || '_' || to_char(m, 'YYYYMM');
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'megaresults' AND c.relname = pname
      ) THEN
        EXECUTE format(
          'CREATE TABLE megaresults.%I PARTITION OF megaresults.%I FOR VALUES FROM (%L) TO (%L)',
          pname, tbl, m, (m + interval '1 month')::date);
        created := created + 1;
      END IF;
      m := (m + interval '1 month')::date;
    END LOOP;

    -- particao DEFAULT: rede de seguranca para datas fora da janela
    pname := tbl || '_default';
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'megaresults' AND c.relname = pname
    ) THEN
      EXECUTE format('CREATE TABLE megaresults.%I PARTITION OF megaresults.%I DEFAULT', pname, tbl);
      created := created + 1;
    END IF;
  END LOOP;
  RETURN created;
END $fn$;

SELECT megaresults.ensure_partitions(18, 6);

-- Cria as particoes do proximo mes todo dia 25 as 03:10
SELECT cron.schedule(
  'megaresults-ensure-partitions',
  '10 3 25 * *',
  $$ SELECT megaresults.ensure_partitions(0, 3); $$
);
