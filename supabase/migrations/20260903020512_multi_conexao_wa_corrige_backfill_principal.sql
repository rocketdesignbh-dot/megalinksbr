-- Correção do backfill da migration anterior: "a mais antiga" elegeu, em duas
-- contas, uma linha DESCONECTADA de junho como principal, enquanto a conexão
-- que está de fato no ar (pareada em agosto) ficava como secundária. O critério
-- certo é CONECTADA primeiro, e só depois a mais antiga como desempate — o
-- mesmo fallback que o painel sempre usou na prática.
update public.whatsapp_instances set is_primary = false where is_primary;

with escolhida as (
  select distinct on (user_id) id
  from public.whatsapp_instances
  order by user_id,
           (status = 'connected') desc,
           created_at asc
)
update public.whatsapp_instances i
   set is_primary = true
  from escolhida e
 where i.id = e.id;
