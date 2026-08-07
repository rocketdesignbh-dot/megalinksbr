-- ── Custo de midia ────────────────────────────────────────────────
CREATE TYPE megaresults.ad_platform AS ENUM
  ('meta','google','tiktok','kwai','pinterest','manual');

CREATE TABLE megaresults.ad_account (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform     megaresults.ad_platform NOT NULL,
  external_id  text,
  label        text NOT NULL,
  credentials  jsonb,
  status       megaresults.conn_status NOT NULL DEFAULT 'active',
  last_sync_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, platform, external_id)
);

CREATE TABLE megaresults.ad_spend (
  owner_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id        uuid NOT NULL REFERENCES megaresults.ad_account(id) ON DELETE CASCADE,
  spend_date           date NOT NULL,
  platform             megaresults.ad_platform NOT NULL,
  external_campaign_id text,
  external_adset_id    text,
  campaign_id          uuid REFERENCES megaresults.dim_campaign(id) ON DELETE SET NULL,
  amount               numeric(14,4) NOT NULL,
  currency             char(3) NOT NULL DEFAULT 'BRL',
  impressions          bigint NOT NULL DEFAULT 0,
  platform_clicks      bigint NOT NULL DEFAULT 0,
  scope_key            text GENERATED ALWAYS AS
                       (COALESCE(external_adset_id, external_campaign_id, '')) STORED,
  PRIMARY KEY (owner_id, ad_account_id, spend_date, scope_key)
);
CREATE INDEX idx_spend_date     ON megaresults.ad_spend (owner_id, spend_date DESC);
CREATE INDEX idx_spend_campaign ON megaresults.ad_spend (owner_id, campaign_id, spend_date DESC);

-- ── Insights de IA ────────────────────────────────────────────────
CREATE TYPE megaresults.insight_kind AS ENUM
  ('summary','anomaly','opportunity','risk','forecast','ranking','recommendation');
CREATE TYPE megaresults.insight_period AS ENUM
  ('daily','weekly','monthly','yearly','adhoc');

CREATE TABLE megaresults.ai_insight (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         megaresults.insight_kind NOT NULL,
  period       megaresults.insight_period NOT NULL DEFAULT 'adhoc',
  period_start date NOT NULL,
  period_end   date NOT NULL,
  title        text NOT NULL,
  body_md      text NOT NULL,
  action_label text,
  action_href  text,
  severity     smallint NOT NULL DEFAULT 0 CHECK (severity BETWEEN 0 AND 2),
  confidence   numeric(3,2) CHECK (confidence BETWEEN 0 AND 1),
  impact_value numeric(14,4),
  evidence     jsonb NOT NULL DEFAULT '{}',
  model        text NOT NULL DEFAULT '',
  input_hash   char(64) NOT NULL,
  tokens_in    int, tokens_out int, cost_usd numeric(10,6),
  feedback     smallint CHECK (feedback BETWEEN -1 AND 1),
  dismissed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_insight_recent ON megaresults.ai_insight (owner_id, created_at DESC);
CREATE UNIQUE INDEX idx_insight_cache ON megaresults.ai_insight (owner_id, kind, input_hash);
CREATE INDEX idx_insight_active ON megaresults.ai_insight (owner_id, severity DESC)
  WHERE dismissed_at IS NULL;

-- ── Alertas ───────────────────────────────────────────────────────
CREATE TABLE megaresults.alert_rule (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  metric      text NOT NULL,
  scope       jsonb NOT NULL DEFAULT '{}',
  comparator  text NOT NULL,
  threshold   numeric NOT NULL,
  eval_window interval NOT NULL DEFAULT '24 hours',
  channels    text[] NOT NULL DEFAULT ARRAY['email'],
  cooldown    interval NOT NULL DEFAULT '6 hours',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE megaresults.alert_event (
  id              bigserial PRIMARY KEY,
  rule_id         uuid NOT NULL REFERENCES megaresults.alert_rule(id) ON DELETE CASCADE,
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  observed        numeric NOT NULL,
  expected        numeric,
  payload         jsonb NOT NULL DEFAULT '{}',
  notified_at     timestamptz,
  acknowledged_at timestamptz
);
CREATE INDEX idx_alert_event ON megaresults.alert_event (owner_id, triggered_at DESC);

-- ── Metas e relatorios ────────────────────────────────────────────
CREATE TABLE megaresults.goal (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric       text NOT NULL,
  target_value numeric(16,4) NOT NULL,
  period       megaresults.insight_period NOT NULL,
  period_start date NOT NULL,
  period_end   date NOT NULL,
  scope        jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE megaresults.saved_report (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  definition    jsonb NOT NULL,
  schedule_cron text,
  recipients    text[] NOT NULL DEFAULT '{}',
  format        text NOT NULL DEFAULT 'pdf',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE megaresults.share_link (
  token         text PRIMARY KEY,
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id     uuid REFERENCES megaresults.saved_report(id) ON DELETE CASCADE,
  password_hash text,
  expires_at    timestamptz,
  view_count    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Revisao de destino dos links (reusa public.short_links) ───────
CREATE TABLE megaresults.short_link_revision (
  id         bigserial PRIMARY KEY,
  code       text NOT NULL,
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_url    text,
  new_url    text
);
CREATE INDEX idx_slrev ON megaresults.short_link_revision (code, changed_at DESC);
