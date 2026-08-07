-- ── Enums do modulo ────────────────────────────────────────────────
CREATE TYPE megaresults.txn_status AS ENUM
  ('pending','approved','cancelled','refunded','unpaid','rejected');
CREATE TYPE megaresults.attribution AS ENUM ('direct','indirect','unknown');
CREATE TYPE megaresults.buyer_kind AS ENUM ('new','returning','unknown');
CREATE TYPE megaresults.dataset_kind AS ENUM ('transaction','click');
CREATE TYPE megaresults.ingest_method AS ENUM ('upload','email','api','scheduled');
CREATE TYPE megaresults.conn_status AS ENUM ('active','paused','error','needs_reauth');
CREATE TYPE megaresults.import_status AS ENUM
  ('queued','parsing','validating','needs_mapping','preview',
   'loading','aggregating','completed','failed','rolled_back');

-- ── Conexoes ───────────────────────────────────────────────────────
CREATE TABLE megaresults.connection (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store           public.marketplace NOT NULL,
  credential_id   uuid REFERENCES public.affiliate_credentials(id) ON DELETE SET NULL,
  label           text NOT NULL,
  method          megaresults.ingest_method NOT NULL DEFAULT 'upload',
  ingest_email    extensions.citext UNIQUE,
  source_timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  schedule_cron   text,
  status          megaresults.conn_status NOT NULL DEFAULT 'active',
  last_sync_at    timestamptz,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, store, label)
);
CREATE INDEX idx_conn_owner ON megaresults.connection (owner_id, status);

-- ── Mapeamento de colunas ──────────────────────────────────────────
CREATE TABLE megaresults.field_mapping (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store           public.marketplace,
  owner_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset         megaresults.dataset_kind NOT NULL,
  version         int NOT NULL DEFAULT 1,
  source_header   text NOT NULL,
  canonical_field text NOT NULL,
  transform       jsonb NOT NULL DEFAULT '{}',
  is_required     boolean NOT NULL DEFAULT false,
  CONSTRAINT mapping_scope CHECK (store IS NOT NULL OR owner_id IS NOT NULL)
);
CREATE INDEX idx_mapping_lookup ON megaresults.field_mapping (store, dataset, version);
CREATE INDEX idx_mapping_owner  ON megaresults.field_mapping (owner_id) WHERE owner_id IS NOT NULL;

-- ── Importacoes ────────────────────────────────────────────────────
CREATE TABLE megaresults.import_batch (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id   uuid NOT NULL REFERENCES megaresults.connection(id) ON DELETE CASCADE,
  dataset         megaresults.dataset_kind NOT NULL,
  status          megaresults.import_status NOT NULL DEFAULT 'queued',
  source_method   megaresults.ingest_method NOT NULL DEFAULT 'upload',
  file_name       text,
  file_size       bigint,
  file_checksum   char(64),
  storage_key     text,
  mapping_version int,
  period_start    timestamptz,
  period_end      timestamptz,
  rows_total      int NOT NULL DEFAULT 0,
  rows_valid      int NOT NULL DEFAULT 0,
  rows_inserted   int NOT NULL DEFAULT 0,
  rows_updated    int NOT NULL DEFAULT 0,
  rows_skipped    int NOT NULL DEFAULT 0,
  error_message   text,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_import_owner ON megaresults.import_batch (owner_id, created_at DESC);
CREATE UNIQUE INDEX idx_import_dedupe
  ON megaresults.import_batch (connection_id, file_checksum)
  WHERE file_checksum IS NOT NULL AND status = 'completed';

CREATE TABLE megaresults.import_issue (
  id         bigserial PRIMARY KEY,
  import_id  uuid NOT NULL REFERENCES megaresults.import_batch(id) ON DELETE CASCADE,
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  row_number int,
  severity   text NOT NULL DEFAULT 'error',
  field      text,
  code       text NOT NULL,
  message    text NOT NULL,
  raw_value  text
);
CREATE INDEX idx_issue_import ON megaresults.import_issue (import_id, severity);

-- ── Dimensoes ──────────────────────────────────────────────────────
CREATE TABLE megaresults.dim_merchant (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store         public.marketplace NOT NULL,
  external_id   text NOT NULL,
  name          text NOT NULL,
  merchant_type text,
  UNIQUE (owner_id, store, external_id)
);

CREATE TABLE megaresults.dim_category (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store     public.marketplace NOT NULL,
  level     smallint NOT NULL CHECK (level BETWEEN 1 AND 3),
  parent_id uuid REFERENCES megaresults.dim_category(id) ON DELETE CASCADE,
  name      text NOT NULL,
  path      extensions.ltree
);
CREATE UNIQUE INDEX idx_cat_unique ON megaresults.dim_category
  (owner_id, store, level, name, COALESCE(parent_id,'00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX idx_cat_path ON megaresults.dim_category USING gist (path);

CREATE TABLE megaresults.dim_product (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store         public.marketplace NOT NULL,
  external_id   text NOT NULL,
  variant_id    text NOT NULL DEFAULT '',
  name          text NOT NULL,
  merchant_id   uuid REFERENCES megaresults.dim_merchant(id) ON DELETE SET NULL,
  category_id   uuid REFERENCES megaresults.dim_category(id) ON DELETE SET NULL,
  image_url     text,
  product_url   text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, store, external_id, variant_id)
);
CREATE INDEX idx_prod_name ON megaresults.dim_product USING gin (name extensions.gin_trgm_ops);

CREATE TABLE megaresults.dim_campaign (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel        text,
  sub_id_1       text, sub_id_2 text, sub_id_3 text, sub_id_4 text, sub_id_5 text,
  normalized_key text NOT NULL,
  display_name   text,
  UNIQUE (owner_id, normalized_key)
);
