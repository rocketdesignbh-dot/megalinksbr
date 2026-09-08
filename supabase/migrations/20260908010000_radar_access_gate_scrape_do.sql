-- REVISÃO 138: trava de acessos gratuitos ao Radar de Ofertas pra quem não
-- conecta o próprio token do Scrape.do. Contador persistido no servidor (não
-- em localStorage) pra não resetar limpando o navegador. Incrementado pelo
-- frontend a cada entrada na página Radar enquanto profiles.scrape_do_token
-- estiver vazio; quem tem token nunca incrementa. Ver ESTADO_ATUAL.md.
alter table public.profiles
  add column if not exists radar_access_count integer not null default 0;

comment on column public.profiles.radar_access_count is
  'Quantos acessos à página Radar de Ofertas o usuário já fez sem ter cadastrado o próprio token do Scrape.do. Acima de 10, o frontend bloqueia o Radar até o token ser conectado. Não incrementa para quem já tem token.';
