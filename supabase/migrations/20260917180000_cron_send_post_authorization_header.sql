-- REVISAO 163 · 17/09 — o cron `mega-send-post` passa a mandar Authorization.
--
-- MOTIVO MEDIDO: o deploy da send-post v31 (Sub-ID da Shopee) religou o
-- `verify_jwt` da Edge Function — o comando do cron, que só mandava
-- `x-cron-secret`, passou a receber 401 {"code":"UNAUTHORIZED_NO_AUTH_HEADER"}
-- e o Post Automático parou. Medido chamando a URL com o comando exato do cron.
--
-- O header abaixo é a chave ANÔNIMA (pública, a mesma que o painel usa no
-- navegador) e serve só para passar pelo gate da plataforma. Quem AUTORIZA de
-- fato continua sendo o `x-cron-secret` conferido dentro da função — nenhuma
-- permissão foi afrouxada.
select cron.alter_job(
  job_id := 6,
  command := $cmd$
  SELECT net.http_post(
    url := 'https://nxlfezpagporealqqbfj.supabase.co/functions/v1/send-post',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bGZlenBhZ3BvcmVhbHFxYmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODE2NzksImV4cCI6MjA5Njc1NzY3OX0.7mASjuTiaUj1Bd9F0YRl_o_Kwb2Y3bmN2RyRCaPZOfs',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);
