-- 20260822185452_p64_fecha_rpc_definer_sem_checagem
-- APLICADA EM PRODUCAO em 22/08/2026 (REVISAO 55). Este arquivo e o registro no
-- repo da migration que ja esta no banco.
--
-- P64: tres funcoes SECURITY DEFINER executaveis por `authenticated` sem
-- checagem de identidade no corpo. Medido em transacao com rollback: um usuario
-- comum (nao admin) marcou a instancia de WhatsApp de OUTRO usuario como ociosa
-- (idle_since nulo -> agora) e limpou o idle_since de um terceiro.

-- 1) As duas de WhatsApp so tem chamador de gatilho
--    (trg_scheduled_posts_mark_activity e trg_niche_groups_recalc_idle, ambos
--    SECURITY DEFINER de dono postgres), entao nao precisam de EXECUTE para
--    anon/authenticated.
revoke execute on function public.mark_whatsapp_activity(uuid) from public, anon, authenticated;
revoke execute on function public.recalc_whatsapp_idle_state(uuid) from public, anon, authenticated;
grant execute on function public.mark_whatsapp_activity(uuid) to service_role;
grant execute on function public.recalc_whatsapp_idle_state(uuid) to service_role;

-- 2) A de influencers e chamada pelo painel admin (frontend/revops.html linha
--    2445) com a sessao do usuario, entao o EXECUTE de `authenticated` fica e o
--    que entra e a checagem por dentro. Sem ela, qualquer usuario logado lia
--    nome, e-mail e conversao de todos os influenciadores.
create or replace function public.influencer_monthly_performance()
 returns table(influencer_id uuid, coupon_code text, influencer_name text, month date, coupons_resgatados bigint, convertidos_pagantes bigint, meses_gratis_concedidos bigint, taxa_conversao numeric)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select
    ip.id as influencer_id,
    ip.coupon_code,
    coalesce(p.full_name, p.email, ip.user_id::text) as influencer_name,
    date_trunc('month', r.redeemed_at)::date as month,
    count(r.id) as coupons_resgatados,
    count(r.id) filter (where sub.sub_status = 'active') as convertidos_pagantes,
    count(r.id) filter (where r.free_month_status = 'granted') as meses_gratis_concedidos,
    round(
      (count(r.id) filter (where sub.sub_status = 'active'))::numeric
      / nullif(count(r.id), 0) * 100
    , 1) as taxa_conversao
  from public.influencer_partners ip
  join public.profiles p on p.id = ip.user_id
  left join public.influencer_coupon_redemptions r on r.influencer_id = ip.id
  left join public.profiles sub on sub.id = r.redeemed_by_user_id
  where public.is_admin()
  group by ip.id, ip.coupon_code, influencer_name, date_trunc('month', r.redeemed_at)
  having count(r.id) > 0
  order by 4 desc, coupons_resgatados desc;
$function$;
