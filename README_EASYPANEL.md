# Deploy no EasyPanel — Mega Links BR

No EasyPanel cada peça é um **Service** dentro de um **Project**. O EasyPanel
cuida do HTTPS e te dá um subdomínio grátis (`*.easypanel.host`) por serviço.
O **Supabase continua na nuvem**.

> Arquitetura:
> - **app**  (Service estático)  → o front-end
> - **wa-engine** (Service Dockerfile) → o motor WhatsApp
> - Supabase Cloud → banco/auth/edge (já no ar)

## Preparação — suba o código num repositório Git
A forma mais limpa no EasyPanel é apontar para um repo (GitHub/GitLab).
Estruture assim e dê `git push`:
```
megalinks/
├── frontend/
│   ├── Dockerfile        (este que gerei)
│   └── index.html        (copie o mega_links_br.html com este nome)
└── wa-engine/
    ├── Dockerfile
    ├── server.js
    ├── package.json
    └── ...
```
(Se preferir sem Git, o EasyPanel também aceita **upload** ou **imagem Docker** —
mas via Git fica com deploy automático a cada push.)

---

## Serviço 1 — wa-engine (motor WhatsApp)
1. **Project → + Service → App**.
2. **Source**: seu repositório Git. Em **Build Path** coloque `wa-engine`.
3. **Build**: tipo **Dockerfile** (ele acha o `wa-engine/Dockerfile`).
4. **Environment** (aba Environment):
   ```
   WA_ENGINE_TOKEN=<gere um forte: openssl rand -hex 32>
   PORT=8080
   ```
5. **Mounts → + Volume**: Name `wa-auth`, Mount Path `/app/auth`.
   👉 Essencial: é o que mantém a sessão do WhatsApp entre restarts.
6. **Domains**: clique em **+**, deixe o EasyPanel gerar um domínio
   (ex.: `wa-engine-megalinks.SEU.easypanel.host`) e ajuste o **Port = 8080**.
7. **Deploy**. Teste a saúde:
   `https://wa-engine-...easypanel.host/health` → `{"ok":true,...}`

## Serviço 2 — app (front-end)
1. **+ Service → App** no mesmo projeto.
2. **Source**: mesmo repo, **Build Path** = `frontend`, **Build** = Dockerfile.
3. **Domains → +**: gere o domínio (ex.: `app-megalinks.SEU.easypanel.host`),
   **Port = 80**.
4. **Deploy**. Abra o domínio → tela de login do app. ✅

---

## Conectar o Supabase ao engine
Pegue o token do passo 1 e configure as secrets das Edge Functions
(no painel do Supabase → **Edge Functions → Secrets**, ou via CLI):
```
WA_ENGINE_URL   = https://wa-engine-....easypanel.host
WA_ENGINE_TOKEN = <o mesmo WA_ENGINE_TOKEN do serviço>
```
Os passos de Shopee/Instagram/CRON continuam no `SETUP_BACKEND.md`.

---

## Dicas EasyPanel
- **Deploy automático**: ligue o webhook do Git → cada push reconstrói o serviço.
- **Logs**: aba **Logs** de cada serviço (veja o QR/erros do wa-engine ali).
- **Domínio próprio**: se quiser `app.seudominio.com.br`, é só adicionar o
  domínio no serviço e apontar o DNS (CNAME/A) para a VPS — o EasyPanel
  emite o certificado sozinho.
- **Recursos**: o wa-engine roda bem em ~512 MB–1 GB. Acompanhe em **Stats**.

> Não precisa do `docker-compose.yml` nem do `Caddyfile` que gerei antes —
> aqueles são para deploy manual com Docker puro. No EasyPanel, o painel faz
> o papel deles.
