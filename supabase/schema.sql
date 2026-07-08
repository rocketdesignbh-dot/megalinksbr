-- =====================================================================
--  MEGA LINKS BR · Schema Supabase (Postgres)
--  Função: Envio Automático de Ofertas para WhatsApp Channels + CRM
--  Rode no SQL Editor do Supabase (ou via `supabase db push`).
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
--  ENUMS
-- =====================================================================
do $$ begin
  create type subscription_status as enum ('trial','active','past_due','canceled');
  create type plan_tier           as enum ('starter','prime','premium','pro','ultimate');
  create type wa_status           as enum ('disconnected','pairing','connected');
  create type channel_role        as enum ('owner','admin','member','unknown');
  create type post_status         as enum ('queued','sending','sent','failed','skipped');
  create type marketplace         as enum ('shopee','amazon','aliexpress','magalu','mercado_livre','shein','natura','awin','terabyte','manual');
exception when duplicate_object then null; end $$;

-- =====================================================================
--  1. PROFILES  (espelha auth.users — 1:1)
-- =====================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text,
  phone         text,
  cpf_cnpj      text,
  is_admin      boolean not null default false,
  plan          plan_tier not null default 'starter',
  sub_status    subscription_status not null default 'trial',
  trial_ends_at timestamptz default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

-- Limite de grupos por plano (regra de negócio: STARTER = 1)
create or replace function public.group_limit(p plan_tier)
returns int language sql immutable as $$
  select case p
    when 'starter'  then 1
    when 'prime'    then 1
    when 'premium'  then 3
    when 'pro'      then 6
    when 'ultimate' then 15
  end;
$$;

-- =====================================================================
--  2. WHATSAPP INSTANCES  (sessões pareadas via QR)
-- =====================================================================
create table if not exists public.whatsapp_instances (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  phone         text not null,
  session_data  jsonb,                 -- tokens/credenciais da sessão (Baileys/WA-Web)
  status        wa_status not null default 'disconnected',
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, phone)
);

-- =====================================================================
--  3. NICHE GROUPS  (Grupos de Configuração / nichos)
-- =====================================================================
create table if not exists public.niche_groups (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  name              text not null,
  post_auto_enabled boolean not null default false,
  loop_enabled      boolean not null default true,   -- "Post em Loop"
  interval_minutes  int not null default 10 check (interval_minutes in (2,5,10,15,30,60)),
  start_hour        int not null default 8  check (start_hour between 0 and 24),
  end_hour          int not null default 22 check (end_hour   between 0 and 24),
  cursor_index      int not null default 0,           -- ponteiro do loop de produtos
  active_stores     marketplace[] default '{}',
  created_at        timestamptz not null default now()
);
create index if not exists idx_groups_user on public.niche_groups(user_id);

-- =====================================================================
--  4. PRODUCTS  (curadoria por grupo — ex.: busca Shopee)
-- =====================================================================
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  niche_group_id  uuid not null references public.niche_groups(id) on delete cascade,
  source          marketplace not null default 'shopee',
  title           text not null,
  category        text,
  keyword         text,
  original_url    text,
  affiliate_url   text,                 -- shope.ee/... / amzn.to/... já convertido
  price           numeric(10,2),
  discount_pct    int,
  image_url       text,
  video_url       text,                 -- se presente, tem prioridade no envio
  position        int not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_products_group on public.products(niche_group_id, position);

-- =====================================================================
--  5. WHATSAPP CHANNELS  (canais vinculados ao grupo)
--  Regra: só pode vincular se role = owner/admin (validação assíncrona)
-- =====================================================================
create table if not exists public.whatsapp_channels (
  id                  uuid primary key default gen_random_uuid(),
  niche_group_id      uuid not null references public.niche_groups(id) on delete cascade,
  instance_id         uuid references public.whatsapp_instances(id) on delete set null,
  channel_link        text not null,
  channel_whatsapp_id text,
  name                text,
  followers           int,
  role                channel_role not null default 'unknown',
  validated_at        timestamptz,
  created_at          timestamptz not null default now()
);
-- só permite manter o vínculo quando o papel é owner ou admin
alter table public.whatsapp_channels
  add constraint chk_channel_role check (role in ('owner','admin'));

-- =====================================================================
--  6. SCHEDULED POSTS  (fila do scheduler / CRON)
-- =====================================================================
create table if not exists public.scheduled_posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  group_id      uuid not null references public.niche_groups(id) on delete cascade,
  channel_id    uuid references public.whatsapp_channels(id) on delete set null,
  product_id    uuid references public.products(id) on delete set null,
  status        post_status not null default 'queued',
  scheduled_for timestamptz not null default now(),
  sent_at       timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_posts_due on public.scheduled_posts(status, scheduled_for);

-- =====================================================================
--  7. AFFILIATE CREDENTIALS  (Config Afiliados por loja)
-- =====================================================================
create table if not exists public.affiliate_credentials (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  store      marketplace not null,
  affiliate_tag text,
  credentials   jsonb,        -- app_key, secret, tracking_id, etc. (criptografe no app)
  connected     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, store)
);

-- =====================================================================
--  8. CRM: PAYMENTS + SUPPORT TICKETS  (painel admin)
-- =====================================================================
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  plan       plan_tier not null,
  amount     numeric(10,2) not null,
  method     text,                    -- 'pix' | 'card'
  status     text not null default 'paid',
  paid_at    timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  subject    text not null,
  priority   text not null default 'media',   -- baixa | media | alta
  status     text not null default 'aberto',  -- aberto | em_analise | resolvido
  created_at timestamptz not null default now()
);

-- =====================================================================
--  ROW LEVEL SECURITY
--  Cada usuário só vê o que é seu. Admins (is_admin) veem tudo (CRM).
-- =====================================================================
alter table public.profiles              enable row level security;
alter table public.whatsapp_instances    enable row level security;
alter table public.niche_groups          enable row level security;
alter table public.products              enable row level security;
alter table public.whatsapp_channels     enable row level security;
alter table public.scheduled_posts       enable row level security;
alter table public.affiliate_credentials enable row level security;
alter table public.payments              enable row level security;
alter table public.support_tickets       enable row level security;

-- helper: o usuário atual é admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- PROFILES: dono lê/edita o seu; admin lê todos
create policy profiles_self     on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update   on public.profiles for update using (id = auth.uid());

-- Macro: políticas "dono OU admin" para as tabelas com user_id direto
do $$
declare t text;
begin
  foreach t in array array['whatsapp_instances','niche_groups','scheduled_posts',
                           'affiliate_credentials','payments','support_tickets']
  loop
    execute format($f$
      create policy %1$s_owner_all on public.%1$s
        for all using (user_id = auth.uid() or public.is_admin())
        with check (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- PRODUCTS e CHANNELS dependem do grupo -> checa via subselect
create policy products_owner on public.products for all
  using (exists (select 1 from public.niche_groups g where g.id = niche_group_id and (g.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.niche_groups g where g.id = niche_group_id and g.user_id = auth.uid()));

create policy channels_owner on public.whatsapp_channels for all
  using (exists (select 1 from public.niche_groups g where g.id = niche_group_id and (g.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.niche_groups g where g.id = niche_group_id and g.user_id = auth.uid()));

-- =====================================================================
--  TRIGGER: cria profile automaticamente ao registrar no Auth
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  TRIGGER: impede ultrapassar o limite de grupos do plano
-- =====================================================================
create or replace function public.enforce_group_limit()
returns trigger language plpgsql as $$
declare cur int; lim int; p plan_tier;
begin
  select plan into p from public.profiles where id = new.user_id;
  lim := public.group_limit(p);
  select count(*) into cur from public.niche_groups where user_id = new.user_id;
  if cur >= lim then
    raise exception 'Limite de % grupo(s) atingido no plano %', lim, p;
  end if;
  return new;
end $$;

drop trigger if exists trg_group_limit on public.niche_groups;
create trigger trg_group_limit
  before insert on public.niche_groups
  for each row execute function public.enforce_group_limit();

-- =====================================================================
--  VIEW p/ DASHBOARD ADMIN (MRR por plano)
-- =====================================================================
create or replace view public.admin_mrr as
  select plan,
         count(*) filter (where sub_status = 'active') as assinantes_ativos,
         sum(case plan when 'prime' then 69.90 when 'premium' then 129.90
                       when 'pro' then 169.90 when 'ultimate' then 229.90 else 0 end)
           filter (where sub_status = 'active') as mrr
  from public.profiles group by plan;

-- =====================================================================
--  SEED opcional (descomente para dados de teste)
-- =====================================================================
-- insert into public.profiles (id,email,full_name,is_admin,plan,sub_status)
-- values (gen_random_uuid(),'admin@megalinks.com.br','Admin Mega',true,'ultimate','active');
