-- Post de Vídeo agendado (Elite+) — ver docs/DESENHO_post_video_agendado.md
create table if not exists video_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),

  video_storage_path text not null,
  video_size_bytes bigint,
  video_mime_type text,

  product_link text not null,
  short_link text,
  caption text,

  scheduled_at timestamptz not null,
  status text not null default 'pending', -- pending | sending | sent | partial_failed | failed | canceled
  sent_at timestamptz,
  error_message text,

  created_at timestamptz not null default now()
);

create index if not exists idx_video_posts_status_scheduled on video_posts (status, scheduled_at);
create index if not exists idx_video_posts_user on video_posts (user_id);

-- Tabela de junção: status por grupo (decisão adotada — permite saber que
-- 2 de 5 grupos falharam e reenviar só esses, consistente com o padrão que
-- o send-post já usa hoje para contar sucesso por canal).
create table if not exists video_post_groups (
  id uuid primary key default gen_random_uuid(),
  video_post_id uuid not null references video_posts(id) on delete cascade,
  group_id uuid not null references niche_groups(id) on delete cascade,
  status text not null default 'pending', -- pending | sent | failed
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (video_post_id, group_id)
);

create index if not exists idx_video_post_groups_post on video_post_groups (video_post_id);

alter table video_posts enable row level security;
alter table video_post_groups enable row level security;

create policy "video_posts_own" on video_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "video_post_groups_own" on video_post_groups
  for all using (
    exists (select 1 from video_posts vp where vp.id = video_post_id and vp.user_id = auth.uid())
  ) with check (
    exists (select 1 from video_posts vp where vp.id = video_post_id and vp.user_id = auth.uid())
  );
