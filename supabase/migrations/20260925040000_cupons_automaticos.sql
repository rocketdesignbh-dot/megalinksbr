-- Cupons automaticos dos grupos-fonte (REVISAO 166, 25/09) — pedido do Erico.
--
-- MEDIDO em 24/09: o "Grupo de Achadinhos #14" manda varias vezes por dia links
-- de campanha/cupom da Shopee (/m/cupom-de-desconto, /user/voucher-wallet,
-- /m/super-ofertas-v200). A resolve-link recusa (nao ha par LOJA/ITEM) e a
-- mensagem morria como 'resolve_falhou'. Teste do mesmo dia: a Open API de
-- afiliados da Shopee (generateShortLink) aceita essas paginas e devolve link
-- s.shopee.com.br que redireciona para a campanha com o ID de afiliado do dono.
--
-- coupon_settings  — uma linha por (dono, marketplace): imagem fixa do post de
--                    cupom, quantas vezes por dia (1-3), automatico ou aprovar.
-- coupon_captures  — cada link de cupom capturado, por grupo de destino. Tabela
--                    SEPARADA da clone_posts de proposito: o Aprovar da fila do
--                    Clone Post cria produto no rodizio, e cupom nao e produto.

create table if not exists public.coupon_settings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  store        text not null,
  active       boolean not null default false,
  image_path   text,
  image_url    text,
  per_day      integer not null default 1 check (per_day between 1 and 3),
  auto_publish boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, store)
);

alter table public.coupon_settings enable row level security;
drop policy if exists coupon_settings_owner on public.coupon_settings;
create policy coupon_settings_owner on public.coupon_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.coupon_captures (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  niche_group_id  uuid not null references public.niche_groups(id) on delete cascade,
  clone_source_id uuid references public.clone_sources(id) on delete set null,
  store           text not null,
  source_jid      text,
  source_msg_id   text,
  source_text     text,
  campaign_url    text not null,
  campaign_label  text,
  coupon_code     text,
  -- pending (aguarda aprovacao) · approved (sai no proximo horario) ·
  -- sent (ja foi pro grupo) · rejected (descartado pelo dono)
  status          text not null default 'pending'
                  check (status in ('pending','approved','sent','rejected')),
  capture_day     date not null,
  created_at      timestamptz not null default now(),
  approved_at     timestamptz,
  sent_at         timestamptz,
  error           text
);

-- O mesmo link de campanha aparece varias vezes por dia no grupo-fonte: um por
-- grupo de destino por dia.
create unique index if not exists coupon_captures_grupo_link_dia
  on public.coupon_captures (niche_group_id, campaign_url, capture_day);
create index if not exists coupon_captures_envio
  on public.coupon_captures (niche_group_id, capture_day, status);
create index if not exists coupon_captures_dono
  on public.coupon_captures (user_id, created_at desc);

alter table public.coupon_captures enable row level security;
drop policy if exists coupon_captures_owner on public.coupon_captures;
create policy coupon_captures_owner on public.coupon_captures
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Imagem do post de cupom. Bucket PUBLICO porque o wa-engine baixa a imagem
-- pela URL na hora do envio, como faz com a foto de produto. Cada dono so
-- escreve na propria pasta (<user_id>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coupon-images', 'coupon-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists coupon_images_own_insert on storage.objects;
create policy coupon_images_own_insert on storage.objects for insert
  with check (bucket_id = 'coupon-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists coupon_images_own_update on storage.objects;
create policy coupon_images_own_update on storage.objects for update
  using (bucket_id = 'coupon-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists coupon_images_own_delete on storage.objects;
create policy coupon_images_own_delete on storage.objects for delete
  using (bucket_id = 'coupon-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists coupon_images_own_select on storage.objects;
create policy coupon_images_own_select on storage.objects for select
  using (bucket_id = 'coupon-images' and (storage.foldername(name))[1] = auth.uid()::text);
