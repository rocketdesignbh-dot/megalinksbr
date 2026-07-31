# ESTADO ATUAL — Mega Links BR

> **PROTOCOLO — leia isto antes de qualquer outra coisa.**
>
> Este arquivo é a **única fonte de verdade** do projeto. Ele vive em
> `docs/ESTADO_ATUAL.md` no repo `rocketdesignbh-dot/megalinksbr`.
>
> **No início de toda sessão:** ler este arquivo inteiro antes de propor ou
> executar qualquer coisa. Se houver conflito entre este arquivo e o `memory.md`
> automático, entre os docs antigos do Knowledge, ou entre a sua memória de
> treinamento — **este arquivo vence**.
>
> **No fim de toda sessão:** atualizar as seções `Última alteração`,
> `Estado dos componentes` e `Pendências abertas`, e commitar junto com o
> código da sessão. Um push de código sem atualizar este arquivo é um push
> incompleto.
>
> **Regra de ouro do projeto:** *status 200 não é prova, número de versão não é
> prova.* O que prova é comportamento observável. Não escreva nada aqui que não
> tenha sido medido.
>
> **Documentos históricos** (`RESUMO_PROJETO_MEGALINKSBR.md` de 03/07,
> `ADENDO_RESUMO_30-07_noite.md`) ficam como registro de sessão. Não são estado
> atual e não devem ser usados para decidir nada.

---

## Última alteração

**Sessão de 31/07/2026 (madrugada)** — só a sessão dona escuta os grupos-fonte.
Fecha o P1.

| | |
|---|---|
| Commits | `057f740` (CLONE_DONOS no engine + `donos` na action `jids`) |
| Edge Functions | 37 · `clone-ingest` em **v9** |
| Jobs pg_cron | **16** |
| Repo × produção | Batendo. `clone-ingest` v9 provada por invocação; wa-engine deployado 31/07 02:10 e provado pelo log |

**O que o P1 realmente era.** A sessão admin não era só barulho no painel: ela
**fazia o dono perder captura**. `CLONE_VISTAS` é um `Set` de módulo, compartilhado
por todas as sessões do processo — o primeiro listener a ver a mensagem grava o
`msgId` e cala todos os outros. Quando a admin ganhava a corrida, a captura morria
em `outro_dono` na `clone-ingest` **e** o dono ficava bloqueado pelo dedupe. MEDIDO:
1 das 11 linhas do `clone_ingest_log`. O diagnóstico anterior ("polui o painel e
queima uma requisição") descrevia o sintoma barato e não o caro.

**Prova do P1 (31/07 02:11):** o container novo imprimiu
`[CLONE] 1 grupo(s)-fonte monitorado(s) · 1 sessao(oes) dona(s)`. O sufixo
`· N sessao(oes) dona(s)` **só existe no `057f740`** — a v8 não imprimia essa metade,
então a linha prova código novo, não número de versão. E **1 dona entre 4 sessões
conectadas** prova que a admin ficou de fora do filtro.

**Próxima ação sugerida:** decidir o P13 (a fonte que capturava está desligada) — sem
isso o Clone Post não produz oferta nenhuma, com ou sem o P1 fechado.

---

## O que é

SaaS brasileiro de automação de marketing de afiliados para gestores de grupos de
WhatsApp: radar de ofertas, disparo automático em grupos/canais, clonagem de posts
de grupos-fonte, encurtador próprio com tracking de cliques, e gestão de cupons.

**Érico** (rocketdesignbh@gmail.com) é fundador, desenvolvedor e admin — trabalha
sozinho, **sem ambiente de dev local**. Toda mudança passa por GitHub + rebuild no
EasyPanel.

---

## Stack

| Camada | Tecnologia | Onde roda |
|---|---|---|
| Frontend | SPA em arquivo único (`index.html`, ~8.900 linhas) | nginx, EasyPanel (Hostinger VPS) |
| Backend | Supabase `nxlfezpagporealqqbfj` (sa-east-1) — Postgres, RLS, Edge Functions, pg_cron, pg_net | Supabase Cloud |
| Motor WhatsApp | Node.js/Baileys (`wa-engine/server.js`) | EasyPanel, mesma VPS |
| Scraping ML | Scrape.do (proxy residencial) | Chamado pelo wa-engine |
| E-mail | Resend (`RESEND_API_KEY` em Supabase Secrets) | — |
| Pagamentos | **Asaas — produção, ativo, cartão habilitado, pagamentos reais funcionando** | Webhook `asaas-webhook` |
| Repo | `rocketdesignbh-dot/megalinksbr` (público) | — |

⚠️ **`frontend/index.html` é a fonte real de deploy.** O `index.html` da raiz é uma
cópia sincronizada à mão. **Os dois precisam receber edições idênticas** — esquecer
o `frontend/index.html` deixa o site publicado sem mudança nenhuma.

### URLs
- Site: `https://www.megalinksbr.com.br`
- RevOps: `https://www.megalinksbr.com.br/revops.html`
- wa-engine: `https://megalinksbr-wa-engine.fwezsn.easypanel.host`
- Supabase: `https://nxlfezpagporealqqbfj.supabase.co`

---

## Planos

**Starter → Pro → Elite → Premium** (o 4º tier chamava-se "Infinity" em docs
antigos; hoje é **Premium**).

| Recurso | Starter | Pro | Elite | Premium |
|---|---|---|---|---|
| Grupos | 1 | 3 | 8 | 20 |
| Produtos | 15 | 50 | 150 | 300 |
| Fontes de clone (`clone_sources_max`) | 0 | 0 | 3 | 10 |
| Marketplaces (Radar / Postar Agora) | todos | todos | todos | todos |
| Post Automático | só Shopee | todos | todos | todos |

- Premium tem aviso de **uso justo**.
- Limites vivem em `plan_features`, espelhados no `PLAN_FALLBACK` das **duas** cópias
  do `index.html`.
- Enforcement server-side **ainda incompleto**: canais WhatsApp/Telegram e grupos WA
  seguem só client-side (ver Pendência P5).

---

## Componentes — estado

### Clone Post (Fase 2 — foco atual)

Captura ofertas de grupos-fonte de terceiros e replica nos grupos do usuário.

- **`clone_ingest_log`** — uma linha por mensagem avaliada, **inclusive as recusadas**.
  Colunas: `source_jid`, `clone_source_id`, `user_id`, `session_phone`, `msg_id`,
  `status`, `motivo`, `store`, `clone_post_id`.
  - **Não guarda o texto da mensagem** (conteúdo de terceiro mora em
    `clone_posts.source_text` quando a captura vinga).
  - Escrita só por service role; dono lê por RLS.
  - Retenção 30 dias (`purgar-clone-ingest-log`, 04:17).
  - **Fail-open de propósito:** falha ao gravar o log não derruba a ingestão.
  - ⚠️ **A chave de leitura no painel é `source_jid`, não `clone_source_id`** — as
    recusas anteriores à localização da fonte chegam com `source_id` nulo, e são
    justamente elas que explicam o silêncio.
- **Frontend:** "Fontes automáticas" é grid de cards (`auto-fill minmax(300px,1fr)`,
  mesmo padrão dos Grupos de Oferta). Cada card mostra uso do dia com barra, última
  captura, e resumo de 24h vindo do log. Card tracejado "+ Nova fonte" trava no teto
  do plano.
- **Fontes ativas hoje: 1.** "Melhores Ofertas da Internet" (ativa, `last_capture_at`
  **nulo** — nunca capturou nada) e TáNaMão – Promoções #02 (**`active = false`**,
  5 capturas em 30/07, última às 16:38). A TáNaMão é a única que já produziu oferta,
  e está desligada. Ver P13.
- **Primeiro veredito lido (30/07):** `resolve_falhou` ("só link de convite de grupo,
  nenhum link de produto") e `outro_dono`. **A captura sempre funcionou** — o que
  chegava não era oferta.
- **Isolamento por sessão (v9, 31/07):** o engine só enfileira quando o telefone da
  sessão é dono de alguma fonte ativa; a lista vem da action `jids`. Sessão sem fonte
  (a admin, hoje) não disputa mais a mensagem com o dono.

### Sessão admin do WhatsApp — `…73545214`

`/health` do engine reporta **4 sessões**; `whatsapp_instances` conhece **3**. O
sufixo `73545214` não está em nenhuma linha da tabela. **É a conexão admin da
plataforma** (dispara mensagens do MegaLinks e do MegaRevOps) — sessão de sistema,
sem dono no banco. Não é cadastro sujo.

- ~~Ela também escuta os grupos-fonte~~ — **resolvido no `057f740`** (pendente de
  Deploy do wa-engine). O listener continua registrado em todo socket, mas o handler
  sai cedo quando o telefone da sessão não está em `CLONE_DONOS`. O filtro mora no
  handler e não no registro porque uma sessão vira dona no instante em que o usuário
  cadastra uma fonte — não pode depender de reconectar o WhatsApp.
- Enquanto o container não for redeployado, a corrida do `CLONE_VISTAS` continua de
  pé e a admin ainda pode roubar uma captura do dono.
- ⚠️ **Se esse número um dia for cadastrado em `whatsapp_instances` de alguma conta,
  aquela conta passa a capturar de todos os grupos em que o admin está.** Hoje o
  isolamento por dono segura; amanhã depende de ninguém cadastrar o número.
- O `wa-idle-reaper` opera sobre `whatsapp_instances` → a sessão admin **não corre
  risco de ser ceifada**, mas também não é monitorada por nada.

### Rate limit — **não funciona hoje**

`validate_rate_limit` e `increment_rate_limit` são `SECURITY DEFINER` e concedem
`EXECUTE` a `authenticated` e `service_role` — **não a `anon`**. O wa-engine fala com
o banco pela chave publishable, ou seja, roda como `anon`. Toda validação e todo
incremento retornam 401 (`42501`), o engine loga e segue.

```
[RATE_LIMIT] Validate error: HTTP 401 {"code":"42501","message":"permission denied for function validate_rate_limit"}
```

Dar `EXECUTE` a `anon` resolveria **e abriria as funções para qualquer um com a chave
pública queimar cota alheia**. Decisão pendente (P2).

### Radar de Ofertas / Scrape.do

- A API oficial de busca do ML (`/sites/MLB/search`) retorna **403 para qualquer
  app/token** — bloqueio de plataforma, não de credencial. Scraping via proxy
  residencial é a única via.
- **`super=true` custa 10 créditos por requisição, não 1.** Já causou dois estouros
  de quota.
- Plano **Free (1.000 créditos/mês)**, decisão consciente. Upgrade para Hobby
  ($29/mês, 250k) fica para quando houver receita.
- Orçamento: bucket `batch` (radar cron 2x/dia) 20/dia · 600/mês; bucket `manual`
  (Postar Agora / Grupo de Oferta) 40/dia · 250/mês. Total 850/1000, 150 de margem.
- Controle em `radar_ml_quota`; `get_radar_ml_quota_status()` expõe consumo.
- Usuário pode registrar token próprio + backup (`scrape_do_token`,
  `scrape_do_token_2` em `profiles`), com failover em HTTP 401. Token próprio não
  consome o pool compartilhado.
- Proteções ativas: gate de quota diário+mensal, bloqueio de keyword repetida (24h),
  **reserva de crédito antes** da chamada ao engine, trava de 30s contra MLB
  duplicado, trava de duplo-clique no frontend (3 pontos), indicador 🟢/🔴 com
  cronômetro até meia-noite BRT, cache `expires_at` de 5 dias (batia com o rodízio —
  com 6h, 7 das 8 categorias sumiam entre coletas).
- "Buscar agora" só gasta crédito se o usuário digitar palavra-chave específica.

### Integrações

| Integração | Status |
|---|---|
| Mercado Livre (scraping) | ✅ Funcionando com todas as proteções |
| Shopee | ✅ API oficial ou feed público, sem custo de Scrape.do. **Credenciais são do usuário**, não da plataforma. `AppID` e `ID de Afiliado` são o mesmo número — helper `shopeeAppId()` checa os dois nomes de campo |
| Telegram | ✅ Bot `@megalinksbr_bot` |
| Asaas | ✅ Produção, cartão ativo, pagamentos reais |
| Resend | ✅ Templates: boas-vindas, pagamento confirmado, upgrade, cobrança atrasada, trial expirado |
| Click tracking | Construído (`short_links`, `link_clicks`, Edge Function `redirect`, links rastreados para Elite/Premium). Ativação completa não confirmada |
| RevOps / IA Insights | Construído. Bloqueado aguardando créditos OpenAI para o GPT-4o mini. `revops_automation_log` registra `trigger_type`, `fired_at`, `user_id`, `status`, `details` |
| Amazon / AliExpress | Pausado aguardando aprovações externas |
| ~~InstaResp (Instagram)~~ | ❌ **REMOVIDO POR COMPLETO.** Tabelas `instagram_accounts`, `comment_automations`, `automation_links` dropadas; Edge Functions `instagram` e `instagram-webhook` deletadas. Ignorar toda referência anterior |

---

## Protocolo de trabalho

**Ações internas** (código, banco, Edge Functions, deploys): executar direto, sem
perguntar. Pausar só quando for genuinamente necessário.

**Ações externas** (rebuild no EasyPanel, configurações no Dashboard do Supabase,
terceiros): guiar **passo a passo, um por vez**, esperando confirmação do Érico.

**Escopo estrito:** mudanças exatamente no que foi pedido. Nenhuma edição colateral em
código não relacionado.

### Deploy

- **"Force Rebuild" ≠ Deploy.** O botão verde **Deploy** dispara `git pull` fresco;
  Force Rebuild reusa fonte em cache sem buscar commits novos. Depois de todo push:
  **Deploy**.
- ~~Rebuildar o wa-engine derruba a sessão do WhatsApp e exige rescan do QR.~~
  **Falso — MEDIDO em 31/07.** O Deploy das 02:10 subiu container novo e o `startup()`
  restaurou as 4 sessões do disco em ~87s: `[RESTORE] 4 sessão(ões) restaurada(s) de 4
  pasta(s) encontrada(s)`, `/health` com `connected: 4`, **nenhum QR**. A pasta de auth
  vive em volume que sobrevive ao rebuild. Essa crença encarecia toda decisão de deploy
  do engine — deploy do wa-engine é barato. Rebuildar o frontend também não afeta.
- No restore, o Baileys cospe um `Timed Out` (408, `fetchProps` dentro de
  `executeInitQueries`) por sessão. São erros do logger interno dele, não exceções
  soltas: as 4 sessões ficaram `connected` depois deles. Observado, não diagnosticado —
  não há log de restore anterior para saber se é novo.
- Todo arquivo HTML novo precisa de linha explícita
  `COPY arquivo /usr/share/nginx/html/arquivo` no `frontend/Dockerfile` — senão o
  nginx serve `index.html` como fallback.

### Push para o GitHub

1. **PAT clássico obrigatório** (`ghp_`). Fine-grained (`github_pat_`) autentica em
   read/clone mas é **rejeitado no push**. O PAT não fica salvo — Érico fornece por
   sessão.
2. `git ls-remote [url] main` **antes** de qualquer coisa — sessões paralelas já
   force-pushearam história divergente no meio de uma sessão, causando sobrescrita
   silenciosa.
3. Clone `--depth=1` → aplicar patches → **validar JS** → configurar
   `user.email`/`user.name` → commit → push com token na URL → **resetar a URL do
   remote imediatamente** → `rm -rf /tmp/megalinksbr`.
4. **Validação de JS obrigatória antes de todo push:** extrair os blocos
   `<script>` inline via regex Python → `/tmp/checkN.js` → `node --check`.
5. Patch por `str.replace()` do Python com match exato. Quando a string alvo tem
   escapes ou template literals sutis, `python3 -c` com `repr()` nas linhas vizinhas
   é o diagnóstico mais rápido.

### Supabase (via MCP)

`execute_sql` para consulta e verificação · `apply_migration` para todo DDL (usar
`CREATE OR REPLACE` / `IF NOT EXISTS` para idempotência) · `deploy_edge_function` ·
`get_edge_function` para ler fonte publicada · `list_edge_functions` para inventário.
**Deletar Edge Function não existe no MCP** — só pelo Dashboard.

- `verify_jwt: false` **só** em funções disparadas por cron (ex.: `send-post`, que usa
  header `x-cron-secret`). Qualquer função que confie no `sub` do JWT precisa de
  `verify_jwt: true`.
- O import map do `deno.json` precisa mapear `@supabase/supabase-js` explicitamente
  para `jsr:@supabase/supabase-js@2`.
- `index.ts` **e** `deno.json` precisam estar no array `files` do deploy.
- **Nunca usar `pause_project`** — não restaura sozinho de forma confiável.

### WhatsApp

**Nunca alterar estado de conexão por conta própria.** Só o Érico decide desconectar.

---

## Pendências abertas

| # | Pendência | Origem |
|---|---|---|
| **P2** | Decidir o rate limit: `GRANT EXECUTE` a `anon` (abre superfície de ataque) **ou** trocar a credencial do engine para service role | 30/07 |
| **P3** | Investigar o 401 do `GET /sessions` do wa-engine no painel — a tela de Conexão WhatsApp fica cega. Provável mesma raiz de credencial do P2. Não investigado | 30/07 |
| **P4** | Descobrir por que o wa-engine reiniciou sozinho às 12:45 de 30/07 (uptime 819s às 12:58, sem deploy). `CLONE_FILA` e o cache de vistas moram só em memória → todo restart descarta a fila. Olhar Deployments/Events do EasyPanel: OOM ou healthcheck | 30/07 |
| **P5** | Enforcement server-side dos limites de plano: canais WhatsApp/Telegram e grupos WhatsApp ainda são só client-side | 03/07 |
| **P6** | **Revogar os PATs do GitHub** — o clássico `ghp_vkOR…` acumulou 14 pushes | 30/07 |
| **P7** | RLS de admin em `profiles` permite qualquer admin ler e-mails de todos os usuários — conhecido, não remediado | 03/07 |
| **P8** | Confirmar/ativar de vez o auto-deploy do EasyPanel (webhook GitHub) — configurado nos dois serviços mas nunca confirmado funcional | 03/07 |
| **P9** | Créditos OpenAI para destravar o RevOps / IA Insights | — |
| **P10** | Avaliar upgrade do Scrape.do para o plano Hobby quando a receita permitir | 03/07 |
| **P11** | Substituir filtros checkbox por chips clicáveis no filtro de loja dos grupos (UX) | fila de julho |
| **P12** | Remover opções de intervalo abaixo de 10 minutos do select de agendamento | fila de julho |
| **P13** | Confirmar se desativar a fonte "TáNaMão – Promoções #02" foi intencional. É a única fonte que já capturou alguma coisa; a única ativa hoje nunca capturou nada. Se não foi intencional, o Clone Post está no ar sem produzir | 31/07 |

**Roadmap adiado (baixa prioridade):** documentação de API, integrações externas
(Google Analytics, Meta Pixel, n8n, Zapier), ACL multi-admin, tracking de CAC.

---

## Aprendizados — não repetir

**Sobre prova e verificação**

- **Status 200 não é prova. Número de versão não é prova.** A `clone-ingest` foi
  deployada do repo *antes* do `git pull`: o número subiu para v7 e o conteúdo
  continuou sendo o da v6. Passou despercebido porque o painel mostrava "v7" e o log
  continuava vazio — e vazio é exatamente o que se espera de um log recém-criado. O
  que fechou o caso foi **mandar uma mensagem sintética e reparar que a resposta não
  trazia os campos que a v7 acrescenta**. Só depois o `get_edge_function` confirmou
  byte a byte. **O que prova é comportamento observável do código novo.**
- **Instrumentar metade do caminho responde metade da pergunta.** O `clone_ingest_log`
  só registra o que o engine **envia**. O que o listener descarta em silêncio —
  mensagem sem link reconhecível, evento `append` em vez de `notify`, mensagem
  efêmera — continua invisível.
- **Dado calculado que não chega a nenhuma tela é dado que não existe.** Mesmo defeito
  de fundo do `price_changed`, do `expired` e da ingestão do clone: a informação era
  produzida e descartada antes de virar tela.

- **Cache compartilhado entre produtores independentes vira corrida, não economia.**
  `CLONE_VISTAS` foi escrito como "não reenviar a mesma mensagem duas vezes no mesmo
  processo" e virou, sem ninguém decidir isso, o árbitro de *qual sessão* fica com a
  captura. Um `Set` de deduplicação que não sabe de quem é cada entrada não deduplica:
  ele sorteia. O sintoma visível (uma linha `outro_dono` no log) era o menor dos dois
  efeitos — o outro, invisível, era o dono perder a oferta.

**Sobre UX**

- **Ação sem confirmação visível é ação que o usuário assume que falhou.** O botão
  "atualizar" relia o banco e redesenhava o **mesmo** conteúdo — do lado de quem
  clica, "não mudou nada" e "não fez nada" são a mesma imagem. Resolvido com carimbo
  de hora, que muda mesmo quando o dado não muda: `atualizando…` → `atualizado às
  HH:MM:SS` → `falhou ao atualizar`. Precisa morar **fora** do miolo que o `csRender`
  recria — dentro, cada atualização apagaria a própria confirmação.
- **Booleano de permissão não é limite.** `clone_auto` só dizia SE podia, nunca
  QUANTAS — e cada fonte gasta até `max_per_day` consultas de loja por dia.

**Sobre infraestrutura**

- **Reservar recurso (crédito, cota) *antes* da operação assíncrona, não depois do
  sucesso** — fecha a janela de corrida em chamadas concorrentes.
- **Nunca commitar token em texto puro no frontend.** Qualquer variável visível no
  HTML/JS público é pública, sem exceção. (`WA_ENGINE_TOKEN` já vazou assim.)
- **Env do wa-engine (EasyPanel) e Secrets do Supabase são espaços separados.**
  Confirmar sempre em qual dos dois a credencial precisa estar — quem faz a chamada é
  quem precisa do segredo. (`SCRAPE_DO_TOKEN` já foi parar no lugar errado.)
- **Mecanismo que parece existir e não executa nada** é o padrão de falha recorrente
  aqui: rate limit em 401 silencioso, ceifador de ociosidade. Desconfiar de proteção
  que nunca apareceu em log.
- **IDs de produto do ML têm duas formas:** ID de catálogo (URLs `/p/MLB…`) e ID de
  anúncio individual (parâmetro `wid=` e endpoint `/items/`). São diferentes e **não
  intercambiáveis**.
- **Imagens do ML:** normalizar URLs `mlstatic.com` para a variante `-O` (original);
  `og:image` tem prioridade sobre `img[src]` para evitar thumbnails.
