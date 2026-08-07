-- Mega Results: schema isolado. Nao altera nada do produto atual.
CREATE SCHEMA IF NOT EXISTS megaresults;

GRANT USAGE ON SCHEMA megaresults TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA megaresults
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA megaresults
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA megaresults
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- Extensoes necessarias (idempotentes, sem efeito sobre o schema public)
CREATE EXTENSION IF NOT EXISTS ltree     WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext    WITH SCHEMA extensions;

COMMENT ON SCHEMA megaresults IS
  'Mega Results: dashboard de comissoes multi-marketplace. Prefixo mr_ em public pertence ao modulo Instagram/Meta - nao confundir.';
