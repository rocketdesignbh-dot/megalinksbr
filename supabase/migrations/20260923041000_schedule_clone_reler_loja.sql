-- REVISAO 165 · 23/09 — cron da nova leitura da loja (clone-ingest v32).
--
-- A cada 10 minutos, a clone-ingest rele a pagina da Amazon das capturas que
-- ficaram 'pending' com data_source='message' (ate 4 leituras no total por
-- captura, com 10 min entre elas) e auto-publica as que a loja confirmar.
--
-- Authorization com a chave ANONIMA (publica) pelo mesmo motivo da REVISAO 163:
-- se um deploy futuro religar o verify_jwt da funcao, o cron continua passando
-- pelo portao da plataforma. Quem autoriza de fato e o x-cron-secret, conferido
-- dentro da funcao.
select cron.schedule(
  'clone-reler-loja',
  '*/10 * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://nxlfezpagporealqqbfj.supabase.co/functions/v1/clone-ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bGZlenBhZ3BvcmVhbHFxYmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODE2NzksImV4cCI6MjA5Njc1NzY3OX0.7mASjuTiaUj1Bd9F0YRl_o_Kwb2Y3bmN2RyRCaPZOfs',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{"action":"reler_loja","limit":10}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cmd$
);
