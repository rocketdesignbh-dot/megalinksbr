# Mega Links BR · Motor WhatsApp (Baileys)

Servidor Node que mantém a sessão do WhatsApp aberta e expõe a API HTTP
consumida pelas Edge Functions (`/generate-qr`, `/check-admin`, `/send`).

## Variáveis de ambiente
| Var | Obrigatória | Descrição |
|---|---|---|
| `WA_ENGINE_TOKEN` | ✅ | Token bearer compartilhado com as Edge Functions |
| `PORT` | — | Porta HTTP (default 8080; hosts injetam) |
| `LOG_LEVEL` | — | `info` (default) / `debug` |

> ⚠️ A pasta `./auth` guarda a sessão pareada. **Monte um volume persistente**
> nela, senão o número desconecta a cada deploy/restart.

## Deploy

**Docker**
```bash
docker build -t mega-wa-engine .
docker run -p 8080:8080 -e WA_ENGINE_TOKEN=xxxx -v wa_auth:/app/auth mega-wa-engine
```

**Fly.io** (config em `fly.toml`)
```bash
fly launch --no-deploy
fly volume create wa_auth -s 1 -r gru
fly secrets set WA_ENGINE_TOKEN=$(openssl rand -hex 32)
fly deploy
```

**Railway** (config em `railway.json`)
- Novo projeto → Deploy from repo → adicione um **Volume** montado em `/app/auth`.
- Variável `WA_ENGINE_TOKEN`. A URL pública gerada vai no `WA_ENGINE_URL` das Edge Functions.

Depois de no ar, volte ao `SETUP_BACKEND.md` (Passo 2) para conectar a URL.
