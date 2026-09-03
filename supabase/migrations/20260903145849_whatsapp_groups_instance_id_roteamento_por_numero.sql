-- REVISAO 129, 03/09/2026. Fatia 2 (P127): roteamento por destino. Grupo de
-- WhatsApp vinculado a uma conexao especifica dispara por ela, nao pela
-- conexao principal do usuario. Espelha o padrao ja existente em
-- whatsapp_channels.instance_id (nunca usado ate agora).
alter table public.whatsapp_groups
  add column if not exists instance_id uuid references public.whatsapp_instances(id) on delete set null;

comment on column public.whatsapp_groups.instance_id is
  'Conexao WhatsApp (whatsapp_instances) dona deste grupo vinculado. Nula = usa a conexao principal do usuario no disparo (compatibilidade com linhas antigas). Espelha o padrao ja existente em whatsapp_channels.instance_id. REVISAO 129, 03/09/2026.';
