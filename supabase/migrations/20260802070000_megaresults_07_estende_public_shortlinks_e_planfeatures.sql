-- ADD COLUMN com DEFAULT nao reescreve a tabela no PG 17: operacao rapida e segura.

-- Links inteligentes: reusa public.short_links em vez de criar tabela nova
ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS tags       text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS store      public.marketplace;

COMMENT ON COLUMN public.short_links.tags IS 'Mega Results: organizacao por campanha';
COMMENT ON COLUMN public.short_links.is_active IS 'Mega Results: pausa o redirect sem apagar o link';
COMMENT ON COLUMN public.short_links.expires_at IS 'Mega Results: expiracao opcional do link';
COMMENT ON COLUMN public.short_links.store IS 'Mega Results: marketplace de destino';

-- Entitlements do modulo, seguindo o padrao coluna-por-feature ja usado
ALTER TABLE public.plan_features
  ADD COLUMN IF NOT EXISTS mr_enabled           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mr_connections       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mr_history_days      integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS mr_ai_insights_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mr_ads_integration   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mr_scheduled_reports boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.plan_features.mr_connections IS
  'Mega Results: integracoes simultaneas. -1 = ilimitado';
COMMENT ON COLUMN public.plan_features.mr_history_days IS
  'Mega Results: janela de historico consultavel. -1 = ilimitado';
COMMENT ON COLUMN public.plan_features.mr_ai_insights_month IS
  'Mega Results: insights de IA por mes. -1 = ilimitado';
