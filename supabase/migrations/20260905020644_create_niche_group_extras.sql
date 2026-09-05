-- REVISÃO 133 (05/09/2026) — "Recados do Grupo" / "Cupom em Destaque".
-- Aplicada via apply_migration nesta sessão; espelhada aqui pro repo.
create table public.niche_group_extras (
  id uuid primary key default gen_random_uuid(),
  niche_group_id uuid not null references public.niche_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('recado','cupom')),
  conteudo text not null,
  modo_gatilho text not null default 'a_cada_posts' check (modo_gatilho in ('a_cada_posts','horario_fixo')),
  valor_posts integer check (valor_posts is null or valor_posts > 0),
  horario time,
  ativo boolean not null default true,
  ordem integer not null default 0,
  posts_desde_ultimo integer not null default 0,
  last_sent_at timestamptz,
  last_sent_date date,
  created_at timestamptz not null default now(),
  constraint niche_group_extras_gatilho_check check (
    (modo_gatilho = 'a_cada_posts' and valor_posts is not null and horario is null)
    or
    (modo_gatilho = 'horario_fixo' and horario is not null and valor_posts is null)
  )
);

comment on table public.niche_group_extras is 'Postagens extras intercaladas no Post Automático de um grupo: "Recados do Grupo" (avisos/bom dia) e "Cupom em Destaque". Disparadas pelo send-post entre produtos normais, por contador de posts ou por horário fixo (America/Sao_Paulo).';
comment on column public.niche_group_extras.tipo is 'recado = aviso/bom dia; cupom = cupom em destaque.';
comment on column public.niche_group_extras.modo_gatilho is 'a_cada_posts = dispara a cada N produtos postados no grupo; horario_fixo = dispara uma vez ao bater esse horário (America/Sao_Paulo), controlado por last_sent_date.';
comment on column public.niche_group_extras.posts_desde_ultimo is 'Contador incrementado pelo send-post a cada produto normal postado neste grupo; zera quando este extra é enviado. Só usado com modo_gatilho=a_cada_posts.';
comment on column public.niche_group_extras.last_sent_date is 'Data (America/Sao_Paulo) do último envio, usada só com modo_gatilho=horario_fixo para não repetir no mesmo dia.';

alter table public.niche_group_extras enable row level security;

create policy niche_group_extras_owner_all on public.niche_group_extras
  for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid());

create index niche_group_extras_group_idx on public.niche_group_extras(niche_group_id) where ativo;
