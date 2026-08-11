# mr-ingest — serviço de ingestão do Mega Results

Recebe o CSV/XLSX de relatório de afiliado, faz o parsing em streaming e grava em
`megaresults.*` no Supabase. Vive fora das Edge Functions porque arquivo com
centenas de milhares de linhas estoura o envelope de CPU e wall-clock delas
(doc 14 §6.1).

## Endpoints

| Método | Rota                  | Auth                        | O que faz |
| ------ | --------------------- | --------------------------- | --------- |
| `GET`  | `/health`             | nenhuma                     | `{ ok, service, uptime, imports }` — é o que o EasyPanel usa de probe |
| `POST` | `/import`             | `Bearer` (serviço ou usuário) | multipart: `file`, `ownerId`, `connectionId`, `store`; opcionais `method`, `sourceTimezone`, `force` |
| `GET`  | `/import/:id/stream`  | `Bearer`                    | progresso ao vivo por SSE |

Dois tipos de chamador em `POST /import`:

- **serviço** — apresenta o `MR_INGEST_TOKEN` e diz por qual `ownerId` importa.
- **usuário final** — apresenta o access token do Supabase. Aqui o `ownerId` do
  formulário é **ignorado**: o dono é quem o token diz que é. O `MR_INGEST_TOKEN`
  nunca pode ir para o navegador — quem o tivesse importaria em nome de qualquer
  pessoa.

## Variáveis de ambiente

Ver `.env.example`. Obrigatórias: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`MR_INGEST_TOKEN`. As duas últimas são conferidas **no boot** — faltando
qualquer uma o processo sai com código 1 em vez de subir e falhar só quando o
usuário já mandou o arquivo.

## Deploy no EasyPanel

Mesmo padrão do `wa-engine` (ver `README_EASYPANEL.md` na raiz).

1. **Project → + Service → App**.
2. **Source**: o repositório Git. **Build Path** = `mr-ingest`, e a **branch**
   precisa ser a que tem o código atual — o `main` está atrasado.
3. **Build**: tipo **Dockerfile**.
4. **Environment**:
   ```
   PORT=8080
   SUPABASE_URL=https://nxlfezpagporealqqbfj.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<copiar do painel do Supabase → Settings → API>
   MR_INGEST_TOKEN=<gerar: openssl rand -hex 32>
   MAX_FILE_BYTES=209715200
   BATCH_SIZE=5000
   MAX_ERROR_RATE=0.30
   ```
   Os dois segredos vão **direto do painel de origem para o EasyPanel**, sem
   passar por chat, arquivo compartilhado ou commit.
5. **Domains → +**: gere o domínio e ajuste **Port = 8080**.
6. **Deploy** e confira: `https://<dominio>/health` → `{"ok":true,...}`.

Depois de subir, guarde o `MR_INGEST_TOKEN` também nas secrets das Edge
Functions do Supabase se alguma delas for chamar `/import`.

## Trava do piloto

Antes de abrir o `import_batch`, o serviço chama o RPC
`megaresults.mr_habilitado(uid)` e recusa com **403 `MODULE_DISABLED`** quem não
está liberado. Falha na consulta **também nega** (500 `INTERNAL`): não dá para
ingerir no escuro só porque o banco piscou. Quem está no piloto vive em
`megaresults.pilot_access` (migration 13).

Isso significa que, com o serviço no ar, importar por uma conta fora do piloto
tem que devolver 403 antes de qualquer linha ser gravada — é o teste que prova
que a trava está valendo.

## Testes

```bash
npm test
```

`test/dry-run.js` roda o pipeline sem tocar o banco.
