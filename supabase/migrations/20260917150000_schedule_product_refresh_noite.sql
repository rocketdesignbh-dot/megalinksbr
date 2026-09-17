-- REVISAO 162 (17/09): segunda rodada diaria da product-refresh, so com as lojas
-- de custo zero (Shopee pela Open API, Amazon pela pagina). 21:00 UTC = 18:00 BRT.
-- A rodada das 09:00 UTC (product-refresh-daily) continua com todas as lojas.
-- Mercado Livre fica de fora de proposito: cada leitura gasta credito de Scrape.do.
select cron.schedule(
  'product-refresh-noite',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nxlfezpagporealqqbfj.supabase.co/functions/v1/product-refresh',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1)
    ),
    body := '{"lojas":["shopee","amazon"]}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
