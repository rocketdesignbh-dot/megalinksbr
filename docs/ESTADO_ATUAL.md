# ESTADO ATUAL — Mega Links BR

> **PROTOCOLO — leia isto antes de qualquer outra coisa.**
>
> Este arquivo é a **única fonte de verdade** do projeto. Ele vive em
> `docs/ESTADO_ATUAL.md` no repo `rocketdesignbh-dot/megalinksbr`.
>
> **REVISÃO 9 — 31/07/2026.** Se o número aqui não for o mais alto que você
> conhece, ou se a data parecer velha, **você está lendo cópia em cache.** Pare e
> releia direito. Toda sessão que edita este arquivo incrementa a revisão.
>
> **COMO ler este arquivo — importa, e já falhou.** Leia por
> `git clone --depth=1` do repo, ou pela interface do GitHub.
> **NÃO leia por `raw.githubusercontent.com`:** o CDN dele serve a versão
> anterior por vários minutos depois de um push, sem avisar. **NÃO leia pelo
> snapshot do Knowledge anexado ao projeto:** ele é congelado por definição.
> Aconteceu em 31/07 — uma sessão leu por um desses caminhos, viu o estado de
> 30/07 (`clone-ingest` v8, pendências indo só até P12) e concluiu que o P14 não
> existia. Existia: o `main` estava em `b449b9c`.
> Na dúvida, `git ls-remote https://github.com/rocketdesignbh-dot/megalinksbr.git main`
> e confira que o hash bate com o do seu clone.
>
> **No início de toda sessão:** ler este arquivo inteiro antes de propor ou
> executar qualquer coisa. Se houver conflito entre este arquivo e o `memory.md`
> automático, entre os docs antigos do Knowledge, ou entre a sua memória de
> treinamento — **este arquivo vence**.
>
> **No fim de toda sessão:** atualizar as seções `Última alteração`,
> `Estado dos componentes` e `Pendências abertas`, e commitar junto com o
> código da sessão, **e incrementar o número da REVISÃO lá em cima**. Um push de
> código sem atualizar este arquivo é um push incompleto.
>
> **Regra de ouro do projeto:** *status 200 não é prova, número de versão não é
> prova.* O que prova é comportamento observável. Não escreva nada aqui que não
> tenha sido medido.
>
> **Documentos históricos** (`RESUMO_PROJETO_MEGALINKSBR.md` de 03/07,
> `ADENDO_RESUMO_30-07_noite.md`) ficam como registro de sessão. Não são estado
> atual e não devem ser usados para decidir nada.

---

> ⚠️ **LEIA ANTES DE QUALQUER COISA NESTA SESSÃO.**
> **REPO E PRODUÇÃO DIVERGEM.** O commit `32fbd03` traz a `clone-ingest` **v11**
> (auto-publicação por fonte) e ela **NÃO foi deployada**. Produção roda a v10.
> A migration da v11 **já está aplicada**, mas `auto_publish` nasce `false` em
> todas as fontes, então o comportamento de hoje é idêntico ao da v10 para todo
> mundo. Estado inconsistente, não quebrado.
> **Primeira ação desta sessão: deployar a v11.** Ver "P17" nas pendências.

## Horários Inteligentes — ENTREGUE (31/07, commits `f94e2f0` → `08f7064`)

Post Automático e captura do Clone Post só nas janelas
☀️ 07:00–09:00 · 🍽️ 12:00–13:30 · 🌙 19:00–21:00. Elite pra cima.

| Peça | Estado |
|---|---|
| Migration (`smart_schedule`/`smart_weekend`) | ✅ aplicada em produção |
| `send-post` v45 | ✅ deployado 31/07 02:56 |
| `clone-ingest` v10 | ✅ **deployado 31/07 00:08 · PROVADO** |
| `frontend/index.html` + `index.html` | ✅ **no ar e funcionando** (`08f7064`) |

**Prova da `clone-ingest` v10 (31/07 00:09), com baseline e controle.** Mesmo
payload sintético, três rodadas, fonte real com `smart_schedule` ligado
temporariamente:

| Rodada | `smart_schedule` | Versão | Resposta |
|---|---|---|---|
| Baseline (antes do deploy) | true | v9 | `resolve_falhou` — ignorou a janela |
| Prova | true | v10 | `fora_da_janela` · *"horarios inteligentes: **00:09** esta fora de 07:00-09:00, 12:00-13:30 e 19:00-21:00"* |
| Controle | false | v10 | `resolve_falhou` — o gate não dispara com o modo desligado |

O baseline é o que fecha: mesma fonte, mesmo flag, a v9 passava reto e a v10
recusa. E o `00:09` do motivo bate com o relógio lido do Postgres de forma
independente — `agoraBR()` está em Brasília, não em UTC (seriam 03:09). A recusa
chegou ao `clone_ingest_log` como linha nomeada. A action `jids` da v9 segue
respondendo `{jids:[2], donos:["98911521"]}`, sem regressão. Estado restaurado
depois do teste: `smart_schedule=false` nas duas fontes, linhas sintéticas
apagadas do log.

### O bug que derrubou o site — e por que ninguém viu

O `f94e2f0` colocou `const SMART_JANELAS` na linha 6982, mas `const PANES`
(linha 4741) é um objeto de template literals **avaliado no top-level** e lia as
constantes na 4748. `const` fica na Temporal Dead Zone até executar, então o load
jogava `ReferenceError: Cannot access 'SMART_JANELAS' before initialization`, o
bloco `<script>` morria ali e **nenhum handler registrava**. A tela de login
desenhava (HTML estático) e o botão Entrar não fazia nada.

**Site fora do ar para toda a base**, desde que o auto-deploy publicou o
`f94e2f0` até o `08f7064` em 31/07 00:23. Corrigido movendo as três constantes
para antes do `PANES`, mesmo bloco, mesmo escopo — movimento léxico puro.

**O `f94e2f0` nunca foi aberto num navegador antes do push.** Nenhuma etapa do
protocolo pegava isso: `node --check` valida sintaxe e passa (TDZ é erro de
runtime), o SHA-256 do arquivo servido batia com o do repo, e o build do
EasyPanel deu Success. Todas as provas eram sobre *entrega de bytes*, nenhuma
sobre *execução*.

### Ainda NÃO observado

O ramo `if (smart)` do `send-post` distribuindo dentro de uma janela real, e a
recusa `fora_da_janela` disparando por mensagem de grupo de verdade. Primeira
verificação possível: **07:00**. Ligue o modo num grupo e confira que os disparos
saem 07:05, 07:15, 07:25… e que `scheduled_posts` de hoje bate com a cota da
janela. Até lá o recurso é "deployado e provado por payload sintético", não
"provado em produção".

**Decisões que já estão no código e não devem ser redecididas:** teto de 33/dia
vindo do piso de 10 min entre posts (`auto_posts_daily` é null para Pro, Elite e
Premium, então o teto do plano não limitava nada) — confirmado no navegador,
`SMART_MAX_DIA === 33`; cota por janela proporcional à duração com sobra indo
para 19–21; decisão por "quantos deveriam ter saído menos quantos saíram" em vez
de "tempo desde o último post", que torna o modo auto-corretivo; fim de semana
desmarcado = não posta, não posta de outro jeito.

---

## Última alteração

**Sessão de 31/07/2026 (madrugada, 00:00–01:10)** — fecha o P14, conserta o site,
melhora o rótulo do toggle e deixa a v11 pronta e commitada, mas não deployada.

| | |
|---|---|
| Commits | `08f7064` (fix TDZ) · `528d130` (doc) · `71cf08e` (UX do rótulo) · `32fbd03` (v11, **não deployada**) |
| Edge Functions | 37 · `clone-ingest` em **v10** em produção, **v11 no repo** |
| Migrations | `clone_auto_publish_e_preview_clicavel` aplicada (`clone_sources.auto_publish`, `niche_groups.clickable_preview`, ambas `not null default false`) |
| Repo × produção | **DIVERGEM** no `clone-ingest`. Frontend batendo, conferido por carregamento real |

**O que foi medido nesta sessão:**

- `clone-ingest` v10 provada com baseline + controle.
- Frontend: o `f94e2f0` derrubou o site inteiro por TDZ. Ver a seção acima.
- Rótulo do toggle no card da fonte: era `🧠 Horários`, único substantivo numa
  fileira de verbos. Virou `🧠 Só nos horários` / `🕐 Capturar 24h` + `title=`.
  `.cs-acoes` ganhou `flex-wrap` porque os 3 botões passam de 292px contra 272px
  úteis do card no piso do grid — sem wrap eles transbordavam.

**⚠️ CORREÇÃO DA REVISÃO 8 — o auto-deploy NÃO é confiável.** A revisão anterior
declarou a P8 resolvida com base em duas observações. Na terceira ele **não
disparou**: o push do `71cf08e` ficou 2min sem publicar e o Érico teve que clicar
Deploy à mão. O correto é **"o webhook dispara às vezes"**, que é pior que não
existir — convida a confiar e o gate falha em silêncio. **Sempre conferir o que
está servido depois de um push, nunca assumir que subiu.**

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
| **P9** | Créditos OpenAI para destravar o RevOps / IA Insights | — |
| **P10** | Avaliar upgrade do Scrape.do para o plano Hobby quando a receita permitir | 03/07 |
| **P11** | Substituir filtros checkbox por chips clicáveis no filtro de loja dos grupos (UX) | fila de julho |
| **P12** | Remover opções de intervalo abaixo de 10 minutos do select de agendamento | fila de julho |
| ~~P14~~ | ✅ **FECHADA 31/07.** `send-post` v45 e `clone-ingest` v10 deployadas e provadas; frontend no ar. Restou o P15 | 31/07 |
| **P13** | A "TáNaMão – Promoções #02" voltou a `active = true` (medido 31/07 00:05) — o doc a registrava desligada na REVISÃO 7. Confirmar se foi você que religou. As duas fontes estão ativas | 31/07 |

| **P17** | **Deployar a `clone-ingest` v11** (`32fbd03`). Código validado (parser TS, 0 erros, com a v10 como controle) mas não emitido — a sessão parou para não arriscar emissão truncada sem margem para provar. Depois: payload sintético com `auto_publish=true` e `data_source` forçado, conferindo que só o caso `store` vira produto | 31/07 |
| **P18** | Frontend da v11: par de rádio no card da fonte (auto-publicar × revisar antes) nas **duas** cópias do index.html. A coluna existe e o backend a respeita; falta a UI para ligar | 31/07 |
| **P19** | Preview clicável (`externalAdReply`) — coluna `niche_groups.clickable_preview` já criada. Falta: `wa-engine` enviar texto + `contextInfo.externalAdReply` com `sourceUrl` (usar `product.affiliate_url` já encurtado, preserva tracking) e `send-post` passar a flag. **Exige reemitir o send-post inteiro (571 linhas) — fazer em sessão limpa.** Testar num grupo só antes de ligar geral: há bugs reportados de card que não abre e miniatura que some no Android | 31/07 |
| ~~P8~~ | ⚠️ **REABERTA 31/07.** Ver a correção em "Última alteração": o webhook dispara de forma intermitente | 03/07 |
| **P15** | Nenhuma etapa do protocolo detecta erro de *runtime* no frontend. `node --check` só vê sintaxe, SHA-256 só vê bytes, build Success só vê Docker. Definir um smoke test obrigatório antes de todo push de HTML: carregar a página e conferir que o console não tem `Uncaught` | 31/07 |
| **P16** | O auto-deploy torna inexecutável qualquer instrução do tipo "deploye A antes de rebuildar B". Decidir: gate técnico (feature flag / coluna desligada por padrão) ou desligar o auto-deploy do serviço `app` | 31/07 |

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

- **Byte igual não é comportamento igual.** Em 31/07 conferi o SHA-256 do
  `index.html` servido contra o do repo, deu idêntico, e concluí "o frontend está
  no ar, não precisa de deploy". Estava certo sobre os bytes e errado sobre o
  estado: o arquivo do repo estava quebrado, e o site vinha fora do ar. Quem
  descobriu foi o Érico atualizando a página. **Verificação de entrega
  (SHA, versão, build Success, HTTP 200) responde "chegou?", nunca "funciona?".**
  Para frontend, a única prova é carregar a página e ler o console.
- **`node --check` não pega Temporal Dead Zone.** É análise sintática: `const X`
  usado antes da declaração é sintaticamente válido e só explode em runtime. A
  regra "validar JS antes de todo push" dava sensação de cobertura que ela não
  tem. Ver P15.
- **Objeto de template literals no top-level é código executando, não dado.**
  `const PANES = { geral: \`...${X}...\` }` avalia todos os `${}` na hora em que a
  linha é lida. Parece declaração de constante e é chamada de função. Qualquer
  coisa referenciada ali precisa já existir *naquele ponto do arquivo*, não só
  "em algum lugar do script".
- **Automação silenciosa vence protocolo escrito.** O doc mandava não rebuildar o
  frontend antes das Edge Functions. O auto-deploy publicou sozinho e a ordem foi
  invertida sem ninguém desobedecer nada. Gate que depende de um humano não
  clicar não é gate quando existe webhook. Ver P16.

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
