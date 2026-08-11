-- Acesso ao Mega Results — modo piloto (decisao de produto de 2026-08-10).
--
-- A regua comercial esta em aberto: nenhum plano ganha o modulo por enquanto.
-- Todas as linhas de public.plan_features seguem com mr_enabled = false e a
-- liberacao acontece conta a conta, nesta tabela.
--
-- Quando a regua for definida, basta ligar mr_enabled no plano: a funcao abaixo
-- ja consulta os dois lados e nenhum chamador precisa mudar.

CREATE TABLE IF NOT EXISTS megaresults.pilot_access (
  owner_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled    boolean NOT NULL DEFAULT true,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE megaresults.pilot_access IS
  'Libera o Mega Results conta a conta durante o piloto. Tem precedencia sobre o plano: enabled=false nega mesmo em plano com mr_enabled=true.';

-- RLS ligada e nenhuma policy: `authenticated` e `anon` nao leem nem escrevem
-- aqui. Quem consulta e a funcao abaixo (SECURITY DEFINER) e quem administra e
-- a service_role, que nao passa por RLS. Lista legivel pelo usuario contaria a
-- ele quem mais esta no piloto.
--
-- Sem FORCE: diferente das tabelas da migration 06, esta nao tem policy alguma,
-- e FORCE tambem valeria para o dono da tabela — o proprio postgres ficaria sem
-- conseguir administrar a lista.
ALTER TABLE megaresults.pilot_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON megaresults.pilot_access FROM anon, authenticated;

-- Fonte unica da verdade sobre "esta conta tem Mega Results?".
--
-- Precedencia: piloto primeiro, plano depois, negado no fim. Conta ausente da
-- tabela cai no plano; conta com enabled=false fica negada mesmo que o plano
-- venha a liberar — e assim que se tira alguem do piloto sem mexer na regua.
--
-- uid nulo (chamador sem sessao) devolve false: COALESCE de nulos termina no
-- literal.
CREATE OR REPLACE FUNCTION megaresults.mr_habilitado(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, megaresults
AS $$
  SELECT COALESCE(
    (SELECT pa.enabled FROM megaresults.pilot_access pa WHERE pa.owner_id = uid),
    (SELECT pf.mr_enabled
       FROM public.profiles p
       JOIN public.plan_features pf ON pf.plan = p.plan
      WHERE p.id = uid),
    false
  );
$$;

COMMENT ON FUNCTION megaresults.mr_habilitado(uuid) IS
  'Piloto tem precedencia sobre plan_features.mr_enabled. So a service_role executa esta forma; o usuario final usa a versao sem argumento.';

-- A forma com argumento fica restrita a service_role de proposito: liberada
-- para `authenticated`, ela viraria um sonar — qualquer usuario descobriria
-- quais contas estao no piloto testando uuid por uuid. O usuario final so
-- pergunta sobre si mesmo, pela forma sem argumento.
CREATE OR REPLACE FUNCTION megaresults.mr_habilitado()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, megaresults
AS $$
  SELECT megaresults.mr_habilitado(auth.uid());
$$;

COMMENT ON FUNCTION megaresults.mr_habilitado() IS
  'Responde sobre o proprio chamador (auth.uid()). Forma exposta ao frontend e a Edge Function mega-results.';

REVOKE ALL ON FUNCTION megaresults.mr_habilitado(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION megaresults.mr_habilitado()     FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION megaresults.mr_habilitado(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION megaresults.mr_habilitado()     TO authenticated, service_role;
