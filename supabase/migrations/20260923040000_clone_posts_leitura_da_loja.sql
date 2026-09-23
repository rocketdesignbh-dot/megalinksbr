-- clone-ingest v32 (23/09) — motivo e contagem da leitura da loja por captura.
--
-- MEDIDO em 22/09: desde 15/09, 15-38% das capturas da Amazon por dia nao
-- conseguem ler a pagina do produto e caem no fallback de texto
-- (data_source='message'). A captura tentava uma unica vez e o motivo da falha
-- (captcha, fora de estoque, buybox) nao era gravado em lugar nenhum.
--
-- store_read_error     : ultimo motivo pelo qual a loja nao foi lida (null = leu)
-- store_read_attempts  : quantas leituras da loja ja foram feitas nesta captura
--                        (a da captura conta como 1; a action 'reler_loja' soma)
-- store_read_last_at   : quando foi a ultima leitura — espacamento entre tentativas
alter table public.clone_posts
  add column if not exists store_read_error text,
  add column if not exists store_read_attempts integer not null default 0,
  add column if not exists store_read_last_at timestamptz;

-- A action 'reler_loja' procura exatamente este recorte a cada rodada do cron.
create index if not exists clone_posts_reler_loja_idx
  on public.clone_posts (created_at desc)
  where status = 'pending' and data_source = 'message';
