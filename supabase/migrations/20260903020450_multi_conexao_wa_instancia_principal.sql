-- Multi-conexão WhatsApp (fatia 1). Com N números pareados, "qual deles
-- dispara" precisa ser uma resposta do BANCO: o painel roda no navegador e o
-- send-post/group-blast rodam no servidor — guardar a escolha só no
-- localStorage faria o usuário marcar um número e os posts saírem por outro.
-- O roteamento POR DESTINO (whatsapp_groups/whatsapp_channels.instance_id) é a
-- fatia 2; até lá esta coluna é quem decide.
alter table public.whatsapp_instances
  add column if not exists is_primary boolean not null default false;

-- No máximo uma principal por usuário. Índice parcial: linhas com false não
-- disputam nada.
create unique index if not exists whatsapp_instances_uma_principal_por_usuario
  on public.whatsapp_instances (user_id)
  where is_primary;

-- ⚠️ ESTE BACKFILL ESTAVA ERRADO — corrigido na migration seguinte
-- (20260903020512). "Mais antiga" elegeu, em duas contas, uma linha
-- DESCONECTADA de junho, enquanto a conexão que estava no ar ficou secundária.
-- Mantido aqui como está porque foi o que rodou em produção.
with primeira as (
  select distinct on (user_id) id
  from public.whatsapp_instances
  order by user_id, created_at asc
)
update public.whatsapp_instances i
   set is_primary = true
  from primeira p
 where i.id = p.id;
