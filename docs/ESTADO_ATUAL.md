# ESTADO ATUAL — Mega Links BR

> **PROTOCOLO — leia isto antes de qualquer outra coisa.**
>
> Este arquivo é a **única fonte de verdade** do projeto. Ele vive em
> `docs/ESTADO_ATUAL.md` no repo `rocketdesignbh-dot/megalinksbr`.
>
> **REVISÃO 15 — 31/07/2026 (madrugada de 01/08).** Se o número aqui não for o mais alto que você
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

> ✅ **REPO E PRODUÇÃO BATEM.** A `clone-ingest` está em **v14** (foto obrigatória)
> e o frontend traz o teste de clonabilidade e a seleção múltipla de produtos.
> Tudo deployado e provado — ver "Foto obrigatória" e "Captura 24h" abaixo.
>
> ✅ A `clone-ingest` **v11** foi deployada em 31/07 às 10:32 e **PROVADA** (ver "Auto-publicação" abaixo). P17 fechada.
>
> ✅ **SHOPEE DESTRAVADA (REVISÃO 15).** Duas falhas nossas, uma tapando a
> outra, faziam **toda** consulta de Shopee falhar desde sempre. Consertadas e
> provadas: `resolve-link` **v5** e `product-search` **v24**. O mesmo link do
> Radar que ontem era recusado hoje devolve nome, R$ 12,51, −65% e foto.
> Ver "Shopee — as duas falhas" abaixo. **P26 e P25 fechadas.**
>
> ⚠️ **O que importa saber antes de mexer no Clone Post:** a captura funciona;
> o enriquecimento de loja funciona agora para **Mercado Livre e Shopee**.
> **Amazon continua caindo no fallback de texto** (`data_source='message'`), e a
> auto-publicação da v11 exige `data_source='store'`. Ver "Clone Post — o que
> está medido" e as pendências P20/P21.
>
> ⚠️ **Não há nenhuma fonte de clone ativa hoje.** Medido em 01/08: a tabela
> `clone_sources` tem **uma única linha** — "TáNaMão", com `active=false`. A
> "Melhores Ofertas da Internet" não está mais na tabela (foi apagada, não só
> desativada). Enquanto isso a captura automática não roda para ninguém.

## Shopee — as duas falhas, uma escondendo a outra (01/08, madrugada)

O que começou como "a `resolve-link` não conhece um formato de URL" (P26) revelou
uma segunda falha atrás dela. **As duas eram nossas.** Nenhuma era da Shopee.

### Falha 1 — `resolve-link` v4 não reconhecia `/{loja}/LOJA/ITEM`

**Baseline medido (v4, 01/08):** `https://s.shopee.com.br/4AykYR6yxu` → HTTP 422,
`stage: normalize`, *"nao tem o codigo -i.LOJA.ITEM"*. O link resolvia
corretamente para `https://shopee.com.br/opaanlp/1006215031/24442629738` e era
recusado ali. O primeiro segmento é o **slug da loja** e varia; a v4 só casava
`/product/LOJA/ITEM` e `-i.LOJA.ITEM`.

**v5 (deployada 01/08).** Regra nova, deliberadamente estrita: exatamente 3
segmentos, os dois últimos só dígitos e com 6+ dígitos cada, e o primeiro fora de
uma lista de caminhos da Shopee que não são loja (`search`, `mall`, `m`,
`collections`, `cart`, …). **Frouxo aqui não erra recusando — erra aceitando**, e
o erro só apareceria lá na frente com mensagem que não aponta para cá.

| Chamada | v4 | v5 |
|---|---|---|
| `s.shopee.com.br/4AykYR6yxu` | **422** *"nao tem o codigo -i.LOJA.ITEM"* | **200** → `/product/1006215031/24442629738` |
| `shopee.com.br/collections/12345678` (controle) | 422 | **422** — segue recusando |

13 casos de mesa passaram antes do deploy (3 formatos válidos + 8 negativos).
A mensagem de recusa nova (*"nao achei o par LOJA/ITEM"*) é string que **só existe
na v5** — foi ela que confirmou ser o código novo respondendo, não cache.

### Falha 2 — `product-search` assinava a Shopee com HMAC em vez de SHA-256

Resolvido o formato, a `product-search` continuou dizendo *"Produto não
encontrado"*. **Não era o produto.**

A assinatura da API de afiliado da Shopee é **SHA-256 simples** de
`appId + timestamp + payload + appSecret`. A v22 usava **HMAC-SHA256** com o
secret como chave. A Shopee respondia **HTTP 200** com
`{"errors":[{"message":"error [10020]: Invalid Signature"}]}`; o código lia
`d.data` (null), não achava node, e devolvia *"Produto não encontrado"* — uma
mensagem que acusa o produto quando a culpa era nossa.

**Medido no mesmo item, mesmas credenciais:**

| Assinatura | Resposta da Shopee |
|---|---|
| HMAC-SHA256 (v22) | `error [10020]: Invalid Signature` |
| SHA-256 simples | Senbenbao X55 · R$ 12,51 · −65% · `imageUrl` preenchida |

**O que deveria ter denunciado isso há semanas:** a `radar/index.ts` **sempre**
assinou certo (`sha256Hex` de concatenação) e por isso o Radar funcionava. Duas
implementações da mesma assinatura no mesmo repo, uma certa e uma errada, e
ninguém comparou. O Radar coletando ofertas da Shopee todo dia era a prova viva
de que a API respondia.

### Falha 3, que só apareceu depois de consertar a 2 — campo inexistente

Com a assinatura certa a API passou a **de fato ler** a consulta, e a primeira
coisa que disse foi `Cannot query field "shortLink" on type "ProductOfferV2"`.
O campo nunca existiu; os nomes certos são `offerLink` e `productLink`.
**Esse erro esteve ali o tempo todo**, inalcançável porque a requisição morria na
assinatura antes de chegar ao schema. Um bug tapando o outro tapando o outro.
`product-search` **v24** corrige.

### Prova final exigida — ponta a ponta, com controle

| Chamada | Resultado |
|---|---|
| `product-search` no item do Radar | ✅ `success:true` · *"Senbenbao X55 Fones De Ouvido TWS…"* · **R$ 12,51** · **−65%** · foto `cf.shopee.com.br/…` · `short_link: s.shopee.com.br/4AykYR6yxu` |
| Item inexistente (`…/99999999999`) | ❌ *"esse produto nao esta no catalogo de ofertas da Shopee"* |

O `short_link` que voltou é **exatamente o link que o Érico testou** — o circuito
fecha em si mesmo. E o controle importa mais do que parece: o item inexistente
recusa com a mensagem de **catálogo vazio**, não com a de **erro da API**. Se a
assinatura ainda estivesse errada, os dois responderiam igual. Foi para separar
esses dois casos que a v23 passou a dar mensagens diferentes — **a mensagem única
foi o que escondeu a falha, não a falha em si.**

### P25 estava errada — e o erro tinha a mesma raiz

O registro de 31/07 concluiu que o link avulso do Érico era *"um 'não' da Shopee,
não falha nossa"*. **Falso, medido em 01/08:** o mesmo
`/product/1397105725/58213461759`, pela `product-search` v24, devolve
*"Vestido Corset Feminino Longo Com Elastano…"*, **R$ 200,00**, com foto.
A conclusão anterior foi tirada da mensagem *"Produto não encontrado"* — que era
justamente a mensagem enganosa. **Diagnóstico apoiado em mensagem de erro que não
foi verificada vale tanto quanto a mensagem.**

---

## Foto obrigatória (`clone-ingest` v13/v14) — ENTREGUE E PROVADA (31/07, fim de tarde)

**Decisão do Érico:** *"ofertas sem fotos são descartáveis, não são o objetivo do
projeto."* Captura sem imagem agora é **recusada** com status `sem_imagem`, e
antes de recusar o sistema tenta buscar a foto de verdade.

### O que estava acontecendo — e as duas leituras erradas antes da certa

**Medido:** as **14** capturas automáticas existentes, de 30/07 até 31/07,
**todas** com `clone_posts.image_url` vazio. Sem exceção.

As 4 fotos que aparecem nos produtos de 30/07 (Calvin Klein, Kärcher, Kit
Rapunzel, La Roche) **não vieram da captura**: o `cloneCriarProduto()` só copia
`row.image_url` do clone, e o clone estava vazio. Entraram no `products` depois,
por outro caminho. Não se sabe qual — e isso não bloqueou o conserto.

**Duas hipóteses foram levantadas e as duas caíram**, o que vale registrar
porque as duas eram plausíveis: (1) "é por construção, texto não tem foto" —
incompleta, porque não explicava as 4 com foto; (2) "é regressão, parou de
funcionar entre 10:20 e 13:38 de 30/07" — falsa, o `clone_posts` desses 4 nunca
teve imagem. Só a terceira medição fechou.

### A causa raiz, medida

| O que foi testado | Resultado |
|---|---|
| `product-search` com link da Amazon, pelo navegador logado | **pendura — mais de 90s sem responder** |
| `chamarFuncao` no `clone-ingest` | aborta em 30s → loja "falha" → fallback de texto |
| Fallback de texto | preenche título/preço/cupom, **mas não tem de onde tirar foto** |
| `fetch` direto da página da Amazon, do Postgres | **HTTP 200 com 3 bytes de corpo** — bloqueio anti-bot silencioso |
| Microlink (og:image) na mesma página | ✅ `success`, título real e foto em `m.media-amazon.com/images/I/…` |

O `fetch` direto merece atenção: **200 não quer dizer que veio conteúdo.** Mais
um caso da regra de ouro do projeto, agora do lado da rede.

### A armadilha que quase foi para produção

A **v13** aceitava qualquer `og:image`. Testando um ASIN inexistente, o Microlink
respondeu `status:"success"` com
`images-na.ssl-images-amazon.com/images/G/32/error/logo._TTD_.png` — **o logo de
erro da Amazon**. O grupo teria recebido isso como foto de produto.

`"success"` do Microlink significa *"consegui ler a página"*, **não** *"a página
é um produto"*. Resposta positiva que não responde a pergunta feita.

A **v14** acrescenta `fotoPlausivel()`: rejeita `/error/`, logo, sprite,
placeholder e default, e na Amazon exige `/images/I/` (foto de item) em vez de
`/images/G/` (asset de interface). O fallback para `data.logo` foi **removido** —
logo da loja não é foto de produto. **10 casos testados**, incluindo os 4 medidos
de verdade.

### Prova em produção (dryRun, mesmo lote)

| Mensagem | Veredito | Foto |
|---|---|---|
| AirPods Pro (ASIN real) | `salvaria` | `m.media-amazon.com/images/I/61f1YfTkTDL._AC_SL1500_.jpg` |
| ASIN inexistente | **`sem_imagem`** | recusada — o logo de erro foi barrado |

**Ordem que importa e não deve ser invertida:** só chama o Microlink quando a
loja não deu foto, e só recusa **depois** de ter tentado. Recusar antes de tentar
perderia oferta boa por falha técnica da loja — que é exatamente o que estava
acontecendo.

**Risco conhecido, não medido:** o Microlink gratuito tem limite de requisições.
Com `max_per_day` de 10 por fonte não deve encostar, mas ninguém verificou o teto.

---

## Captura 24h (`clone-ingest` v12) — ENTREGUE E PROVADA (31/07, 11:40)

O gate de Horários Inteligentes saiu da captura. Ele fica só no `send-post`, que
é onde a janela significa alguma coisa. **`niche_groups.smart_schedule` (o do
`send-post`) continua valendo — não mexa nele.** Quem ficou sem leitor é
`clone_sources.smart_schedule`, que segue na tabela.

O motivo é assimetria de custo, e não é óbvia: **a mensagem no grupo-fonte não
volta.** Recusar a captura por horário não adia a oferta, apaga ela. Já o
disparo pode esperar — a oferta fica na fila e sai na próxima janela intacta.
Gate no lado errado troca "posta mais tarde" por "perdeu".

**Prova com baseline e controle na mesma fonte, mesmo flag, mesmo tipo de
horário.** Fonte "Melhores Ofertas da Internet", `smart_schedule = true` (já
estava ligada em produção, nada foi mexido para o teste):

| Horário BR | Versão | Origem | Resposta |
|---|---|---|---|
| 10:36 · 10:43 · 10:45 | v11 | mensagens **reais** do grupo | `fora_da_janela` — 3 linhas no `clone_ingest_log` |
| **11:41** | **v12** | payload sintético, `dryRun` | **`salvaria`** · `data_source='store'` · **R$ 74,00 de R$ 96,00 (23%)** |

Os dois horários estão igualmente fora de 07:00–09:00, 12:00–13:30 e 19:00–21:00.
O que mudou entre eles foi só a versão da função.

**O que fecha a prova além da mudança de veredito:** o preço que saiu é o **da
loja**. O texto sintético dizia "De R$ 349,00 por R$ 199,00" e o resultado veio
com 74/96 — ou seja, a v12 não só passou pela janela como chegou até o
enriquecimento e o guarda `data_source` da v11 continua de pé. `dryRun`, então
não gravou linha nenhuma: não havia estado a restaurar.

**Custo de crédito não subiu** como se temia: quem limita crédito é o
`max_per_day` da fonte, que conta capturas e não horas. A janela não economizava
nada que o teto já não economizasse — só escolhia QUAIS ofertas perder, e
escolhia mal (as de fora da janela, não as piores).

---

## Auto-publicação (`clone-ingest` v11) — ENTREGUE E PROVADA (31/07, 10:32)

Fonte com `auto_publish` ligado transforma a captura em produto do grupo sem
passar pela fila — **mas só quando a loja confirmou os dados**.

**Prova com os dois ramos no mesmo lote real (não dryRun), 31/07 10:35.**
Fonte "TáNaMão" com `auto_publish` ligado temporariamente:

| Mensagem | `data_source` | Status | Resultado no banco |
|---|---|---|---|
| Link ML (`MLB24004920`) | `store` | `publicado` | `products` criado, `clone_posts.status='approved'` com `product_id` e `approved_at` |
| Link Shopee | `message` | `salvo` | ficou `pending` na fila, `product_id` nulo |

O que fecha a prova, além dos dois ramos: o produto criado saiu com **R$ 74,00
de R$ 96,00 (23%)**, que é o preço **da loja** — o texto sintético da mensagem
dizia "De R$ 49,90 por R$ 29,90". Se tivesse publicado o preço do texto, o
guarda não estaria funcionando. E o motivo devolvido na recusa — *"aguardando
revisao — auto-publicacao nao vale para dados lidos do texto da mensagem"* — é
string que **só existe na v11**, assim como o campo `publicados` no corpo da
resposta. Número de versão não provou nada; o comportamento provou.

Estado restaurado depois do teste: `auto_publish=false`, as duas linhas de
`clone_posts`, o `products` e as linhas do `clone_ingest_log` apagados,
`captured_today` devolvido a 6.

**Ainda NÃO observado:** auto-publicação disparando por mensagem de grupo de
verdade, e o produto auto-publicado saindo no disparo do `send-post`.

---

## Clone Post — o que está medido (31/07, manhã)

**A captura funciona.** A crença de que "o Clone Post não está funcionando"
não se sustenta no log: em 31/07 as duas fontes avaliaram ~32 mensagens,
6 viraram captura (08:10–09:20) e estão `pending` na fila de revisão.
`last_capture_at` da TáNaMão: 09:20. Fila hoje: **6 pending, 5 approved**.

**O que não funciona é o enriquecimento**, e falha diferente por loja:

| Loja | O que acontece | Onde morre |
|---|---|---|
| Mercado Livre | 13 recusas com *"leva a VITRINE do afiliado"* | `resolve-link`. O grupo-fonte posta `meli.la` que cai em `/social/<afiliado>` — vitrine, não produto. **Não é bug nosso: não há produto para clonar.** |
| Shopee | ✅ **CONSERTADO 01/08 — `resolve-link` v5.** As 10 recusas eram do formato `/{loja}/LOJA/ITEM`, que a v4 não reconhecia. Eram páginas de produto legítimas. O diagnóstico de 31/07 de manhã ("campanha ou coleção") e o da tarde estavam os dois errados | `resolve-link` v5 |
| Shopee (quando resolve) | ✅ **CONSERTADO 01/08 — `product-search` v24.** O *"Produto não encontrado"* era **assinatura HMAC onde a Shopee espera SHA-256**, mais o campo inexistente `shortLink`. Nada a ver com o catálogo. Agora devolve nome, preço, desconto e foto | `product-search` v24 |
| Amazon | Sempre cai no fallback de texto | `product-search` **não tem caminho Amazon nenhum** — o `if` cobre só `mercadolivre` e `shopee`. |
| Mercado Livre (link bom) | ✅ `data_source='store'` | via `/ml-product` com o Scrape.do pessoal do Érico. |

**Consequência direta e não óbvia — ATUALIZADA em 01/08:** a auto-publicação
exige `data_source='store'`. Com a Shopee consertada, **`auto_publish` passa a
valer para Mercado Livre E Shopee**. Só a **Amazon** continua fora, e por motivo
próprio (P21). Antes de 01/08 o toggle não fazia nada visível fora do ML —
exatamente o tipo de "mecanismo que parece existir e não executa nada" que este
projeto já pagou caro. **Ainda NÃO observado:** captura de Shopee de mensagem de
grupo de verdade chegando a `data_source='store'`. O caminho foi provado peça a
peça, não ponta a ponta com mensagem real — e não há fonte ativa para isso hoje.

**Sintoma visível na fila:** as 6 capturas de hoje têm título lido do texto, e
dois deles são lixo — `"10% OFF"` e `"🔗 https://amzlink.to/az0FxCZ9opMuN"`.
O parser de título pegou a linha errada porque a mensagem não tinha negrito
utilizável. É provavelmente isso que dá a sensação de "não funciona".

**Ponto cego que atrapalhou este diagnóstico:** o `clone_ingest_log` guarda o
veredito mas **não guarda a URL** que falhou. Dá para dizer "10 links da Shopee
foram recusados" e não dá para dizer *quais*, nem reproduzi-los. Ver P20.

---

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

**Sessão da madrugada de 01/08/2026** — destrava a Shopee inteira. `resolve-link`
**v5** e `product-search` **v24** deployadas e provadas ponta a ponta. **P26 e
P25 fechadas.** Duas falhas nossas, uma escondendo a outra, mais uma terceira
escondida atrás da segunda. Ver "Shopee — as duas falhas" acima.

| | |
|---|---|
| Commits | 1 · `resolve-link`, `product-search` e este doc |
| Edge Functions | `resolve-link` **v5**, `product-search` **v24**, as duas provadas |
| Migrations | nenhuma. **Nenhuma coluna nova** |
| Frontend | **não tocado** nesta sessão |
| Repo × produção | ✅ **BATEM** (arquivo deployado conferido byte a byte contra o do repo antes do deploy) |

**O que foi medido nesta sessão:**

- Baseline da v4 reproduzido antes de qualquer alteração: 422 no link real do
  Radar. Depois v5: 200 com a URL normalizada. **Controle negativo
  (`/collections/12345678`) continua sendo recusado** — a regra não ficou frouxa.
- A assinatura da Shopee testada nas duas formas, mesmas credenciais, mesmo item:
  HMAC → `Invalid Signature`; SHA-256 → produto completo. **A `radar/index.ts`
  sempre assinou certo** — a divergência estava dentro do próprio repo.
- `radar_offers` confirma que o item 24442629738 **está** no catálogo (coletado
  01/08 02:00 UTC, R$ 12,51). Foi essa consulta que derrubou a hipótese de
  "produto fora do catálogo" e mandou olhar a assinatura.
- P25 revisitada e **derrubada**: o link avulso do Érico devolve *"Vestido Corset
  Feminino Longo…"*, R$ 200, com foto. Não era "não" da Shopee.
- **`clone_sources` tem uma única linha e ela está `active=false`.** A "Melhores
  Ofertas da Internet" não está mais na tabela. **Zero fontes ativas** — a captura
  automática não roda para ninguém hoje. Não foi alterado nada: é decisão do Érico.

**Como chamar função com `verify_jwt: true` sem navegador** (não estava escrito):
o sandbox não alcança `*.supabase.co`, mas o Postgres alcança, e a **anon key
legada é um JWT válido**. `net.http_post` com
`Authorization: Bearer <anon legado>` executa `resolve-link` e `product-search`,
e o corpo volta em `net._http_response`. Foi assim que tudo aqui foi medido.
⚠️ **Cuidado que custou três tentativas:** para assinar payload à mão em SQL, o
`net.http_post` **re-serializa** o `jsonb` antes de enviar, então a assinatura
precisa ser calculada sobre `payload::jsonb::text`, não sobre a string original.

---

**Sessão de 31/07/2026 (tarde e fim de tarde)** — deploya e prova a v12 (P22),
fecha o P24, encerra o caso da vitrine do ML, entrega a **parte (a) do P23**
(teste de clonabilidade), a **foto obrigatória** (v13/v14) e a **seleção
múltipla de produtos**.

| | |
|---|---|
| Commits | 2 · frontend (as duas cópias), `clone-ingest` e este doc |
| Edge Functions | 37 · `clone-ingest` em **v14** em produção, **provada** |
| Migrations | nenhuma nova. **Nenhuma coluna nova** em nada desta sessão |
| Repo × produção | ✅ **BATEM** |

**Sessão da noite (31/07) — só medição, nenhuma alteração de código:**

- **Seleção múltipla provada no navegador logado**, no grupo "Teste Geral 001"
  com 5 produtos: 2 marcados → *"2 de 5 marcados"* e botão *"Apagar 2
  selecionados"* com o mestre em `indeterminate`; Selecionar todos → *"5 de 5"*;
  desmarcar → botão desabilitado. Console limpo. **Nada foi apagado** — a tela
  ficou como estava.
- **Shopee diagnosticada com o link real do Érico** (P25) e **P26 descoberta no
  mesmo teste**: o formato `/{slug}/LOJA/ITEM` do Radar não é reconhecido. O que
  levou até lá foi testar os **dois** casos lado a lado — o link avulso dele e um
  link de oferta do Radar. Um só teria escondido metade do problema.
- **Correção de registro:** o diagnóstico das 10 recusas de Shopee nesta mesma
  página estava errado desde a manhã. Ver a tabela "Clone Post — o que está
  medido" e a P26.

**Provado em navegador logado (fecha o buraco do P15 para esta entrega):** o
P23(a) foi exercitado na sessão do Érico — colada a mensagem do `meli.la`, saiu
a tarja vermelha *"Não dá pra clonar essa mensagem"* com o motivo da vitrine.
`classe alert r`, `display block`. **Console limpo no load completo e depois do
clique: zero `Uncaught`.** Os cards confirmaram na tela o que o banco dizia:
"Melhores Ofertas" **pausada** (14 avaliadas · 11 não resolveram · 3
`fora_da_janela`), TáNaMão **ativa** (36 avaliadas · 9 capturadas).

**Cuidado registrado:** no meio desse teste um clique errou o botão por ~20px e
caiu no texto abaixo. A tela não mudou e pareceu que a função não existia — só o
DOM (`csTesteRes` vazio, `display:none`) desmentiu. **Screenshot também não é
prova**; o que provou foi ler o estado do elemento.

**Seleção múltipla na lista de produtos (`wireProdLista`):** checkbox por
produto, checkbox mestre "Selecionar todos" com estado *indeterminate* quando a
seleção é parcial, contador ("3 de 12 marcados") e botão que **diz o número**
("Apagar 7 selecionados"). O botão nasce desabilitado. O `confirm` também mostra
o número — quem vai apagar 23 itens sem querer precisa ver o 23. O delete é
**um só, com `.in(ids)`**: apagar em loop deixaria a lista pela metade se caísse
no meio, sem dizer onde parou. Motivo da mudança: antes eram 2 cliques e 1
diálogo por produto, e diálogo repetido deixa de ser confirmação e vira reflexo.

**O que foi medido nesta sessão:**

- `clone-ingest` v12 deployada 11:40 e provada com baseline (v11, 3 recusas
  reais) e controle (v12, mesma fonte, mesmo flag, fora de janela → capturou).
  Ver "Captura 24h" acima.
- **P24 fechada — o `+ Nova fonte` funciona.** Érico clicou e o formulário
  abriu. A hipótese do `S.waNumber` estava errada: quem entra no Clone Post já
  passou pela sessão com o número populado no caso real. **Nenhum código foi
  alterado por causa disso** — a pendência era diagnóstico, não bug.
- **P23 confirmada em campo: o grupo "Melhores Ofertas da Internet" não posta
  link clonável.** Érico abriu `https://meli.la/1GQ52Vn` no navegador do
  computador e **parou na vitrine do afiliado**, exatamente como a
  `resolve-link` previu. Não é bug nosso e não há conserto no servidor: fora do
  app do ML não existe MLB na URL. A fonte tem `last_capture_at` nulo desde o
  cadastro (30/07) e 18 recusas de `resolve_falhou` por vitrine no log — todas
  explicadas. **Trocar de grupo-fonte é a ação, não consertar código.**
- Contraste medido no mesmo período: a "TáNaMão" capturou 8 vezes hoje
  (`last_capture_at` 11:30) com `smart_schedule=false`. A diferença entre as
  duas fontes é o grupo, não a configuração.
- **A fonte "Melhores Ofertas da Internet" foi DESATIVADA** (`active=false`,
  decisão do Érico). Não estava só improdutiva: estava gastando uma chamada de
  `resolve-link` a cada mensagem, 24h por dia, para sempre recusar. Não queimava
  Scrape.do (morre antes da `product-search`), mas enchia o log de ruído que
  escondia as recusas que importam. **A "TáNaMão" é hoje a única fonte ativa.**
- **P23 parte (a) entregue:** campo "Testar se esse grupo é clonável" no
  formulário de nova fonte, nas **duas** cópias do `index.html` (`md5sum`
  confere). Cola-se uma mensagem do grupo e sai o veredito na hora. Zero
  backend novo, zero coluna nova — só chama a `resolve-link` e a
  `product-search` que já existem, pelo mesmo caminho do `cloneResolver()`.
  Custo: uma `product-search` por clique no botão (no ML isso é Scrape.do), e
  só quando o usuário pede. **A parte (b) — alerta no card depois de N
  mensagens avaliadas sem captura — continua aberta.**

**O que foi medido na sessão anterior (manhã, 10:30–11:00):**

- `clone-ingest` v11 deployada 10:32 e provada com os dois ramos num lote real.
  Ver "Auto-publicação" acima.
- Clone Post: a captura funciona; o enriquecimento de loja é que falha, e falha
  diferente por loja. Ver "Clone Post — o que está medido" acima.
- `resolve-link` v4 aceita **os dois** formatos de URL da Shopee
  (`/product/LOJA/ITEM` e `-i.LOJA.ITEM`) — medido, os dois normalizam igual.
  A hipótese de que a Shopee mudou o formato e quebrou o parser está **descartada**.
- `product-search` v22 **não tem caminho para Amazon**. O `if` cobre
  `mercadolivre` e `shopee` e mais nada; toda captura da Amazon cai no fallback
  de texto por construção, não por falha.
- P13 confirmada com o Érico: **foi ele** quem religou a "TáNaMão". Fechada.

**Como chamar a `clone-ingest` sem o wa-engine** (útil e não estava escrito): o
sandbox não alcança `*.supabase.co`, mas o Postgres alcança. `net.http_post`
com o `x-cron-secret` lido de `vault.decrypted_secrets` executa a função e o
corpo volta em `net._http_response`. Foi assim que a v11 foi provada.

**Sobre a emissão da v11:** o MCP não deploya a partir do disco e a API de
management do Supabase não é alcançável do sandbox — o arquivo de 51 KB tem que
ser reemitido inteiro numa chamada só. Deu certo, mas é o gargalo real de
qualquer Edge Function grande neste projeto (é o que travou o P19).

**O que foi medido na sessão anterior (madrugada, 00:00–01:10):**

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
| ~~P13~~ | ✅ **FECHADA 31/07 manhã.** Érico confirmou que foi ele quem religou a "TáNaMão". As duas fontes seguem ativas | 31/07 |

| ~~P17~~ | ✅ **FECHADA 31/07 manhã.** v11 deployada às 10:32 e provada com os dois ramos. Falta ver acontecer com mensagem de grupo de verdade | 31/07 |
| **P18** | Frontend da v11: par de rádio no card da fonte (auto-publicar × revisar antes) nas **duas** cópias do index.html. A coluna existe e o backend a respeita; falta a UI para ligar | 31/07 |
| **P19** | Preview clicável (`externalAdReply`) — coluna `niche_groups.clickable_preview` já criada. Falta: `wa-engine` enviar texto + `contextInfo.externalAdReply` com `sourceUrl` (usar `product.affiliate_url` já encurtado, preserva tracking) e `send-post` passar a flag. **Exige reemitir o send-post inteiro (571 linhas) — fazer em sessão limpa.** Testar num grupo só antes de ligar geral: há bugs reportados de card que não abre e miniatura que some no Android | 31/07 |
| ~~P8~~ | ⚠️ **REABERTA 31/07.** Ver a correção em "Última alteração": o webhook dispara de forma intermitente | 03/07 |
| ~~P22~~ | ✅ **FECHADA 31/07 tarde.** `clone-ingest` v12 deployada às 11:40 e provada com baseline e controle. Ver "Captura 24h" acima | 31/07 |
| **P23** | **Parte (a) ENTREGUE 31/07 tarde** (campo de teste no formulário, commitado, aguardando Deploy). **Parte (b) ABERTA:** alerta no card da fonte depois de N mensagens avaliadas sem nenhuma captura — query em `clone_ingest_log`, dado já existe. A (a) protege quem está cadastrando; a (b) protege quem já cadastrou e não sabe que o grupo mudou de comportamento. **Confirmado em campo 31/07:** Érico abriu o `meli.la/1GQ52Vn` no navegador e parou na vitrine do afiliado, exatamente como a `resolve-link` previa | 31/07 |
| ~~P24~~ | ✅ **FECHADA 31/07 tarde.** O `+ Nova fonte` **funciona** — Érico clicou e o formulário abriu. A hipótese do `S.waNumber` não se confirmou. Nenhuma linha de código foi alterada. Lição: pendência aberta a partir de relato sem reprodução custou uma sessão de suspeita sobre código sadio | 31/07 |
| **P20** | `clone_ingest_log` não guarda a URL que falhou. Nas 24 recusas de `resolve_falhou` de hoje dá para contar mas não para saber *quais* links, nem reproduzir. Guardar host+path do link escolhido (não o texto da mensagem — conteúdo de terceiro) nas recusas de resolve | 31/07 manhã |
| **P21** | **Causa medida em 31/07: a `product-search` PENDURA para a Amazon** — mais de 90s sem responder, testado no navegador logado; o `chamarFuncao` aborta em 30s e a loja sempre "falha". Não é só "falta caminho Amazon": há um travamento. A v14 contornou o sintoma da foto (og:image via Microlink), **mas título e preço da Amazon continuam vindo do texto da mensagem** (`data_source='message'`), então a auto-publicação segue alcançando só o Mercado Livre. Decidir: (a) achar o travamento da `product-search`, (b) usar o título/preço do Microlink — ele devolve o título real, medido —, ou (c) a UI avisar que auto-publicar só vale para ML | 31/07 |
| ~~P25~~ | ✅ **FECHADA 01/08 — e a conclusão anterior estava ERRADA.** O link avulso devolve *"Vestido Corset Feminino Longo…"*, R$ 200, com foto, pela `product-search` v24. Não era "não" da Shopee: era a assinatura HMAC. O registro abaixo ficou como exemplo de diagnóstico tirado de mensagem de erro não verificada. ~~**MEDIDO 31/07 à noite, com o link real do Érico.**~~ `resolve-link` **funciona** (270 ms, limpa para `/product/1397105725/58213461759`); quem recusa é a `product-search` com *"Produto não encontrado"* em 1,1 s — a API de afiliado da Shopee só conhece item do **catálogo de ofertas** dela, e produto avulso não está lá. **É um "não" da Shopee, não falha nossa.** O Microlink **não** cobre este caso: devolveu título `"58213461759"` (só o ID) e imagem nula, porque a Shopee monta a página por JavaScript. Restam: (a) Scrape.do na página (queima crédito, decisão de orçamento), (b) preencher à mão, (c) **mínimo valioso e barato: a tela avisar em português** que a Shopee não reconhece o produto, em vez de só gerar o link em silêncio | 31/07 |
| ~~P26~~ | ✅ **FECHADA 01/08.** `resolve-link` v5 deployada e provada com baseline (v4 recusando) e controle negativo (`/collections/…` segue recusado). Registro original abaixo. 🔴 **A `resolve-link` não reconhecia o formato de URL de produto que o próprio Radar da plataforma gera.** MEDIDO 31/07 à noite: `https://s.shopee.com.br/4AykYR6yxu` (link de oferta do Radar) redireciona para `https://shopee.com.br/**opaanlp**/1006215031/24442629738` — mesma estrutura de `/product/LOJA/ITEM`, **primeiro segmento variável**. A `resolve-link` só casa `/product/LOJA/ITEM` e `-i.LOJA.ITEM`, então recusa com *"não tem o código -i.LOJA.ITEM"* uma página de produto legítima, com loja e item visíveis na própria URL. **Conserto é uma regra a mais no reconhecimento de URL — pequeno em tamanho, grande em efeito.** Duplamente relevante: (1) reabre as 10 recusas de Shopee do log, cujo diagnóstico anterior estava errado; (2) esse produto **está** no catálogo de ofertas, então, resolvido o formato, a `product-search` deve responder com nome, preço e foto — diferente do caso da P25. **Exige reemitir a `resolve-link` inteira num deploy só: fazer em sessão limpa, primeira ação.** | 31/07 |
| **P27** | **Reprocessar as capturas de Shopee recusadas antes de 01/08.** As recusas de `resolve_falhou` e as capturas que caíram em `data_source='message'` por causa das duas falhas da Shopee eram, em boa parte, ofertas boas. A action `reparse` da `clone-ingest` reaplica o fallback de texto, mas **não** refaz `resolve-link` + `product-search` — não serve. Decidir: (a) estender o `reparse` para reprocessar de verdade, (b) deixar passar e olhar só daqui pra frente. Bloqueado de fato pela P20: o log **não guarda a URL**, então nem dá pra reprocessar as recusas de resolve | 01/08 |
| **P28** | **Não existe fonte de clone ativa.** `clone_sources` tem uma linha ("TáNaMão", `active=false`) e a "Melhores Ofertas" foi apagada da tabela. Com a Shopee destravada, nada disso aparece em produção enquanto não houver fonte ligada. Ação do Érico, não de código: religar a TáNaMão ou cadastrar um grupo-fonte novo, e então observar uma captura de Shopee real chegar com `data_source='store'` | 01/08 |
| **P15** | **Parcialmente endereçada 31/07 tarde.** Existe agora um smoke test executável: extrair os blocos `<script>`, rodar os quatro **no mesmo contexto** `vm` do Node com um DOM falso permissivo, e comparar contra o baseline **antes** do patch. Foi rodado neste push e pegaria o TDZ do `f94e2f0`. **Duas limitações medidas:** (1) dá falso positivo em `id` de elemento usado como global — `themeT.onclick` na linha 2496 acusa `ReferenceError` no sandbox e funciona no browser; por isso a comparação com o baseline é obrigatória, o veredito é "piorou?", não "tem erro?"; (2) não executa handler nenhum, só o top-level. **Continua aberta:** carregar a página num navegador de verdade e ler o console segue sendo a única prova real | 31/07 |
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

- **Mensagem de erro única para causas diferentes é o que esconde bug por semanas.**
  A `product-search` devolvia *"Produto não encontrado"* tanto quando a Shopee
  respondia lista vazia quanto quando ela **recusava a requisição inteira**. As
  duas coisas não têm nada a ver uma com a outra, e a mensagem apontava para a
  errada — para o produto, quando a culpa era da nossa assinatura. Um diagnóstico
  inteiro (P25) foi construído em cima dela e estava errado. **Antes de concluir
  a partir de uma mensagem de erro, verificar que a mensagem descreve o que
  aconteceu.**
- **Duas implementações da mesma coisa no mesmo repo divergem, e a que funciona
  não avisa a que não funciona.** `radar/index.ts` assinava a Shopee com SHA-256;
  `product-search` com HMAC. O Radar coletava ofertas todo dia enquanto a
  `product-search` falhava 100% das vezes. **Quando um caminho funciona e outro
  não para o mesmo serviço externo, comparar os dois é o primeiro passo, não o
  último.**
- **Bug pode estar tapando bug.** Consertada a assinatura, apareceu na hora um
  campo inexistente no GraphQL (`shortLink`) que estava ali desde sempre — a
  requisição morria antes de chegar ao schema. **Consertar a primeira falha não
  é o fim; é quando as seguintes ficam visíveis.** Medir de novo depois de cada
  conserto, sem assumir que acabou.
- **Regra de reconhecimento de URL: frouxa não erra recusando, erra aceitando.**
  Uma regra `/{qualquer}/DIGITOS/DIGITOS` aceitaria caminho de sistema como
  produto, e o erro só apareceria etapas depois, com mensagem que não aponta para
  a regra. Por isso a v5 exige 3 segmentos exatos, 6+ dígitos e lista de exclusão.

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
