# Mega Links BR — Guia de Setup do Backend

Tudo que dá para automatizar já está **no ar** no seu projeto Supabase
`mega-links-br` (ref `nxlfezpagporealqqbfj`, região sa-east-1). Este guia
cobre só os **passos finais** que exigem suas credenciais/segredos.

## ✅ O que já está pronto (feito por mim)
- **9 tabelas** + enums + RLS + triggers (schema inicial).
- **Hardening** de funções (search_path + permissões).
- **Agendador no banco**: função `enqueue_due_posts()` + job **pg_cron**
  `mega-enqueue-posts` rodando **a cada minuto** (respeita janela de
  horário no fuso de São Paulo, intervalo e "Post em Loop").
- **Edge Functions** publicadas:
  - `whatsapp`  → `https://nxlfezpagporealqqbfj.supabase.co/functions/v1/whatsapp`
    (ações `generate-qr` e `check-admin`, exige JWT do usuário)
  - `send-post` → `https://nxlfezpagporealqqbfj.supabase.co/functions/v1/send-post`
    (processa a fila e dispara no motor; auth por `x-cron-secret`)

## 🧩 Arquitetura
```
Front-end ──JWT──> Edge "whatsapp" ──token──> Motor Baileys (Node/host externo)
                                                     │  socket WhatsApp aberto
pg_cron(1min) → enqueue_due_posts() → tabela scheduled_posts(queued)
pg_cron(1min) → Edge "send-post" ──token──> Motor Baileys → posta no canal
                                   └→ atualiza scheduled_posts(sent/failed)
```

---

## Passo 1 — Suba o motor Baileys (pasta `wa-engine/`)
O Supabase **não** roda o socket do WhatsApp (Edge Functions são stateless).
Hospede a pasta `wa-engine/` em Railway, Render, Fly.io ou uma VPS:

```bash
cd wa-engine
npm install
# defina as variáveis de ambiente no painel do host:
#   WA_ENGINE_TOKEN = <openssl rand -hex 32>
npm start
```
Anote a URL pública gerada, ex.: `https://wa-engine-production.up.railway.app`.

## Passo 2 — Configure os segredos das Edge Functions
No painel: **Project Settings → Edge Functions → Secrets** (ou via CLI):

```bash
supabase secrets set \
  WA_ENGINE_URL="https://SEU-engine.up.railway.app" \
  WA_ENGINE_TOKEN="<o mesmo token do Passo 1>" \
  CRON_SECRET="<openssl rand -hex 32>" \
  --project-ref nxlfezpagporealqqbfj
```
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados automaticamente.

## Passo 3 — Ligue o disparo automático da fila
Guarde os segredos no Vault e agende o `send-post` a cada minuto via
**pg_cron + pg_net**. Rode no **SQL Editor** (troque o CRON_SECRET):

```sql
-- guarda os valores no Vault (uma vez)
select vault.create_secret(
  'https://nxlfezpagporealqqbfj.supabase.co/functions/v1/send-post', 'send_post_url');
select vault.create_secret('<MESMO_CRON_SECRET_DO_PASSO_2>', 'cron_secret');

-- agenda o processador da fila a cada minuto
select cron.schedule('mega-send-posts', '* * * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name='send_post_url'),
    headers := jsonb_build_object(
                 'content-type','application/json',
                 'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body    := '{}'::jsonb
  );
$$);
```

> **Alternativa (sem cron/pg_net):** deixe o próprio motor Baileys fazer
> *polling* da tabela `scheduled_posts` com a service-role key. Use a opção
> que preferir — não precisa das duas.

## Passo 4 — Ative o login Google (opcional, p/ o fluxo da doc)
**Authentication → Providers → Google** → cole Client ID/Secret do Google
Cloud. O trigger `handle_new_user` já cria o `profile` no primeiro login.

## Passo 5 — Defina um admin do CRM
```sql
update public.profiles set is_admin = true, plan='ultimate', sub_status='active'
where email = 'seu-email-admin@dominio.com';
```

---

## Teste rápido (fim a fim)
1. Login no app → vá em **Conexão WhatsApp** → Gerar QR → escaneie.
2. Crie um grupo → aba **Shopee** adicione produtos → aba **WhatsApp-CANAIS**
   cole o link do canal → Buscar (valida OWNER/ADMIN) → Vincular.
3. Aba **Geral** → marque **Post Automático**, intervalo 2 min → Salvar.
4. Em até ~1 min o `pg_cron` enfileira; o `send-post` dispara no canal.
   Acompanhe em **Admin → Fila de Posts** (ou na tabela `scheduled_posts`).

## Endpoints do motor (referência)
| Método | Rota | Body / Query | Retorno |
|---|---|---|---|
| POST | `/generate-qr` | `{ phone }` | `{ qr, status }` |
| GET  | `/check-admin` | `?link=` | `{ allowed, role, name, followers, channel_whatsapp_id }` |
| POST | `/send` | `{ channel, product }` | `{ ok, message_id }` |
| GET  | `/health` | — | `{ ok, sessions }` |

> ⚠️ A API de Canais do WhatsApp é restrita; Baileys é não-oficial. Avalie os
> Termos do WhatsApp e os riscos de banimento antes de usar em produção.

---

# InstaResp — Automação de Comentários do Instagram

Backend **100% no ar** (não precisa do motor externo — o Instagram usa
webhooks stateless, perfeitos para Edge Functions).

## ✅ Já pronto
- Tabelas `instagram_accounts`, `comment_automations`, `automation_links`
  (+ RLS e **trigger de máx. 10 links** por automação).
- Edge Functions publicadas:
  - `instagram-webhook` → `…/functions/v1/instagram-webhook`
    (verificação do Meta + recebe comentários, valida gatilho
    case-insensitive, responde e envia DM com botões; modo `auto` sorteia
    entre frases prontas; respostas múltiplas via `;`)
  - `instagram` → `…/functions/v1/instagram`
    (proxy autenticado: `list-media` e `exchange-token`)

## Passo A — App no Meta for Developers
1. Crie um app **Business** com os produtos **Instagram Graph API** + **Webhooks**.
2. Use uma conta **Instagram Profissional/Criador** vinculada a uma Página.
3. Escopos no OAuth: `instagram_basic`, `instagram_manage_comments`,
   `instagram_manage_messages`, `pages_show_list`.

## Passo B — Segredos das Edge Functions
```bash
supabase secrets set \
  IG_APP_ID="<app id>" \
  IG_APP_SECRET="<app secret>" \
  IG_VERIFY_TOKEN="<crie um token qualquer>" \
  GRAPH_VERSION="v21.0" \
  --project-ref nxlfezpagporealqqbfj
```

## Passo C — Registre o Webhook
No painel do app Meta → **Webhooks → Instagram**:
- Callback URL: `https://nxlfezpagporealqqbfj.supabase.co/functions/v1/instagram-webhook`
- Verify Token: o mesmo `IG_VERIFY_TOKEN` acima
- Assine o campo **`comments`**

> O `instagram-webhook` está com `verify_jwt=false` (correto — quem chama é o
> Meta) e valida a assinatura `X-Hub-Signature-256` com o `IG_APP_SECRET`.

## Fluxo (igual à doc)
1. App → **InstaResp** → Conectar Instagram (OAuth).
2. Galeria de mídias → **Nova automação** sobre um reel/post.
3. Defina gatilho (ex.: `quero`), resposta (`auto` ou frases com `;`),
   texto da DM, texto de destaque e até **10 botões** de link.
4. Comentário com o gatilho → resposta pública + DM automática. O contador
   `triggered_count` sobe a cada disparo.

---

# Radar de Ofertas — Shopee Affiliate API (dados reais)

O Radar agora lê de `public.radar_offers`. A Edge Function `radar` busca na
**Shopee Affiliate API** (GraphQL `productOfferV2`), calcula desconto/score e
faz upsert. O front-end lê via REST com a chave pública; se a tabela estiver
vazia ou as credenciais não estiverem setadas, ele cai no modo demonstração.

## ✅ Já pronto
- Tabela `radar_offers` (leitura pública, escrita só service role) + função
  `purge_expired_offers()`.
- Edge Function `radar` → `…/functions/v1/radar` (auth por `x-cron-secret`
  ou service-role; varre 8 palavras-chave padrão, valida 6h).
- Front-end (página **Radar de Ofertas**) já lendo da tabela, com selo
  "ao vivo · Shopee" / "demonstração".

## Passo A — Credenciais Shopee
Cadastre-se no **Shopee Affiliate Open Platform** (precisa de conta de
afiliado aprovada) e pegue o **AppID** e o **Secret**.

## Passo B — Secrets da função
```bash
supabase secrets set \
  SHOPEE_APP_ID="<app id>" \
  SHOPEE_APP_SECRET="<app secret>" \
  SHOPEE_API_URL="https://open-api.affiliate.shopee.com.br/graphql" \
  --project-ref nxlfezpagporealqqbfj
```

## Passo C — Atualização automática (a cada 30 min)
No SQL Editor (usa Vault + pg_net; reaproveita o `cron_secret` que você já
criou para o `send-post`):
```sql
select vault.create_secret(
  'https://nxlfezpagporealqqbfj.supabase.co/functions/v1/radar', 'radar_url');

select cron.schedule('mega-radar-refresh', '*/30 * * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name='radar_url'),
    headers := jsonb_build_object(
                 'content-type','application/json',
                 'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body    := '{}'::jsonb
  );
$$);
```

## Disparo manual (teste)
```bash
curl -X POST https://nxlfezpagporealqqbfj.supabase.co/functions/v1/radar \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "content-type: application/json" \
  -d '{"keywords":["fone bluetooth","air fryer"]}'
```
Depois recarregue a página do Radar — o selo vira "ao vivo · Shopee".

> Outras lojas (Amazon PA-API, Mercado Livre, AliExpress) seguem o mesmo
> padrão: nova função de fetch que grava em `radar_offers` com `source`
> diferente. Ative conforme for aprovado em cada programa.

---

# Login com senha + Separação Admin / Usuário

O app agora abre numa **tela de login** (Supabase Auth, e-mail + senha) e só
libera o painel depois de autenticar. A separação é por papel:

- **Usuário comum** (`is_admin = false`): vê **apenas a área de afiliado**.
  O seletor "Admin" nem aparece, e o acesso às páginas admin é bloqueado.
- **Administrador** (`is_admin = true`): ganha o seletor **Afiliado ⇄ Admin**
  e acessa o painel/CRM. (No backend, o RLS já garante isso via `is_admin()`.)

> Modo demonstração: a tela de login tem dois botões ("Como Afiliado" / "Como
> Admin") que entram sem backend, úteis para visualizar a separação no preview.

## Ativar de verdade
1. **Auth → Providers → Email**: já vem ligado. Para testes sem caixa de
   entrada, desligue **"Confirm email"** em *Authentication → Sign In / Up*
   (assim o login funciona logo após o cadastro).
2. O trigger `handle_new_user` cria o `profiles` no primeiro cadastro.
3. Promova seu usuário a admin:
   ```sql
   update public.profiles set is_admin = true, plan='ultimate', sub_status='active'
   where email = 'seu-email@dominio.com';
   ```
4. Recarregue o app, faça login — admin vê o seletor; usuário comum, não.

> As chaves no topo do JS (`SUPA_URL` / `SUPA_KEY`) são as públicas do projeto
> e já estão preenchidas. A segurança real vem do RLS + da flag `is_admin`,
> não de esconder a UI.
