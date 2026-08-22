-- 20260822183522_revoga_rpc_manutencao_de_anon_e_authenticated
-- APLICADA EM PRODUCAO em 22/08/2026 (REVISAO 54). Este arquivo e o registro
-- no repo da migration que ja esta no banco.
--
-- Fecha o vazamento medido em 22/08: o EXECUTE default do Postgres (PUBLIC)
-- deixava seis funcoes SECURITY DEFINER de manutencao acessiveis pelo PostgREST
-- com a chave anon publica. Provado antes/depois na mesma chamada:
--   POST /rest/v1/rpc/wa_ociosidade com a chave anon
--   antes: HTTP 200, 832 bytes, telefone e e-mail de clientes
--   depois: HTTP 401, "permission denied for function wa_ociosidade"
--
-- Nenhum chamador legitimo usa anon/authenticated:
--   wa_ociosidade                  -> Edge Function wa-idle-reaper, SERVICE_ROLE_KEY
--   expirar_clone_posts            -> pg_cron "expirar-clone-posts" (postgres)
--   purgar_product_refresh_runs    -> pg_cron "purgar-product-refresh-runs" (postgres)
--   check_trial_mission_extensions -> pg_cron "mega-trial-mission-check" (postgres)
--   mr_claim_queue / mr_expire_queue -> mr-ingest, service role

revoke execute on function public.wa_ociosidade() from public, anon, authenticated;
revoke execute on function public.mr_claim_queue(integer) from public, anon, authenticated;
revoke execute on function public.mr_expire_queue() from public, anon, authenticated;
revoke execute on function public.expirar_clone_posts() from public, anon, authenticated;
revoke execute on function public.purgar_product_refresh_runs() from public, anon, authenticated;
revoke execute on function public.check_trial_mission_extensions() from public, anon, authenticated;

grant execute on function public.wa_ociosidade() to service_role;
grant execute on function public.mr_claim_queue(integer) to service_role;
grant execute on function public.mr_expire_queue() to service_role;
grant execute on function public.expirar_clone_posts() to service_role;
grant execute on function public.purgar_product_refresh_runs() to service_role;
grant execute on function public.check_trial_mission_extensions() to service_role;
