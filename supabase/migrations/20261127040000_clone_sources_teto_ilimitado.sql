-- Teto diario por fonte: "Ilimitado" ou de 1 a 999 (27/11/2026, pedido do Erico).
--
-- clone_sources.max_per_day era NOT NULL default 10 e o painel limitava a 1..50.
-- MEDIDO em 26/11: uma fonte com teto 50 teve 239 ofertas barradas por teto
-- no mesmo dia. Agora:
--   NULL      = sem teto (checkbox "Ilimitado" no painel) — clone-ingest v36+
--   1 .. 999  = teto do dia
-- O default continua 10 para fonte nova criada sem escolher nada.
--
-- ORDEM DE DEPLOY: clone-ingest v36 antes desta migracao. A v35 trata NULL como
-- 10 (`?? 10`), entao NULL gravado antes da v36 so seria um teto de 10, nunca
-- um erro — mas o usuario veria "ilimitado" e receberia 10.

alter table public.clone_sources
  alter column max_per_day drop not null;

alter table public.clone_sources
  drop constraint if exists clone_sources_max_per_day_check;

alter table public.clone_sources
  add constraint clone_sources_max_per_day_check
  check (max_per_day is null or (max_per_day between 1 and 999));

comment on column public.clone_sources.max_per_day is
  'Teto diario de capturas da fonte. NULL = ilimitado; senao 1..999. Contador em captured_today/captured_day.';
