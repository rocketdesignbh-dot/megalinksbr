select cron.schedule(
  'send-video-post',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nxlfezpagporealqqbfj.supabase.co/functions/v1/send-video-post',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
