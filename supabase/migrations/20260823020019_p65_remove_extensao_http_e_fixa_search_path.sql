-- 20260823020019_p65_remove_extensao_http_e_fixa_search_path
-- APLICADA EM PRODUCAO em 23/08/2026 (REVISAO 58). Este arquivo e o registro no
-- repo da migration que ja esta no banco.
--
-- 1) A extensao `http` (pgsql-http) estava instalada no schema `public`, e o
--    EXECUTE default do Postgres deixava `anon` e `authenticated` chamarem
--    http_get/http_post pelo PostgREST. Medido com a chave anon publica:
--    POST /rest/v1/rpc/http_get com {"uri":"https://example.com"} devolveu 200
--    com corpo e cabecalhos da pagina — o banco buscava a URL e entregava a
--    resposta a quem pediu (SSRF). Depois do drop: 404 PGRST202.
--
--    Nada usava a extensao: nenhuma funcao do banco referencia http_get/
--    http_post (a varredura em pg_proc so achou o helper do proprio pg_net) e o
--    repo nao a cria nem a chama. Quem faz HTTP no projeto e o pg_net
--    (`net.http_post`), que vive no schema `extensions` e nao e exposto ao
--    PostgREST.
--
--    O DROP sem CASCADE e proposital: se algum objeto dependesse dela, o
--    comando falharia em vez de derrubar o dependente junto.
drop extension http;

-- 2) search_path fixo nas sete funcoes que estavam sem ele. Todas sao SECURITY
--    INVOKER, entao aqui nao ha escalada de privilegio a fechar — e higiene
--    contra resolucao de nome por schema de terceiro. Conferidas rodando depois:
--    21, 28, 30 e '+5531999998888'.
alter function public.whatsapp_idle_grace_minutes()      set search_path to 'public', 'pg_temp';
alter function public.whatsapp_heartbeat_grace_minutes() set search_path to 'public', 'pg_temp';
alter function public.mr_touch_updated_at()              set search_path to 'public', 'pg_temp';
alter function public.normalizar_telefone_br(text)       set search_path to 'public', 'pg_temp';
alter function public.trg_normalizar_telefone_profile()  set search_path to 'public', 'pg_temp';
alter function public.wa_aviso_dias()                    set search_path to 'public', 'pg_temp';
alter function public.wa_corte_dias()                    set search_path to 'public', 'pg_temp';
