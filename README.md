# Mega Links BR

Plataforma de automação para afiliados (WhatsApp Channels, InstaResp, Radar Shopee).

## Estrutura
- `frontend/`  — o app (HTML único) servido por nginx. Deploy: serviço **app** no EasyPanel.
- `wa-engine/` — motor WhatsApp (Baileys, Node). Deploy: serviço **wa-engine** no EasyPanel.
- `supabase/`  — schema do banco e snippet de conexão (o backend já roda no Supabase Cloud).

## Deploy
Veja `README_EASYPANEL.md` (passo a passo no EasyPanel) e `SETUP_BACKEND.md`.

Backend ao vivo: projeto Supabase `mega-links-br` (ref `nxlfezpagporealqqbfj`).
