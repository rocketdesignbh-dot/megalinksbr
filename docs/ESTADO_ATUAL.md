# ESTADO ATUAL — Mega Links BR

> **PROTOCOLO — leia isto antes de qualquer outra coisa.**
>
> Este arquivo é a **única fonte de verdade** do projeto. Ele vive em
> `docs/ESTADO_ATUAL.md` no repo `rocketdesignbh-dot/megalinksbr`.
>
> **REVISÃO 37 — 04/08/2026 (tarde).** Se o número aqui não for o mais alto que você
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

> ✅ **P29 FECHADA (REVISÃO 25) — e nunca foi bug de lote.** A rodada de 02/08
> 09:00 UTC carimbou **11 linhas de `products`**, não 1. Dos 12 candidatos, **8
> são estruturalmente inconferíveis** (3 Shopee, que não tem verificador; 5 de ML
> de dono `starter`, que não tem monitoramento). Antes da v17 esses 8 faziam
> `continue` **sem carimbar**, ficavam com `price_checked_at` nulo para sempre e
> reenchiam o lote em toda rodada — por isso o único carimbo de cron da base era
> 1 linha em 30/07. O carimbo nos pulos da v17 é o que destravou. Ver "P29".
>
> ✅ **P30 — O RAMO QUE APAGA DISPAROU, E FOI MEDIDO (REVISÃO 25).** Varredura de
> `dryRun` nos 64 produtos de ML de dono com credencial: **43 "de" corrigidos, 5
> APAGADOS, 1 criado, 15 sem leitura**. Aplicada de verdade em seguida, com o
> mesmo resultado. **Não é leitura degradada:** na mesma varredura, com o mesmo
> leitor, 43 produtos leram "de" normalmente. Ver "P30 — o ramo que apaga".
>
> ⚠️ **E o apagamento expôs um defeito, consertado na v19:** os 5 ficaram com
> `price_original` nulo e o `discount_pct` de pé (37, 46, 44, 15, 10) —
> porcentagem órfã. O `send-post` **não** usa esse campo (o post sai limpo), mas
> a lista de produtos do painel usa. Ver "P33".
>
> ✅ **P27 FECHADA POR CONJUNTO VAZIO (REVISÃO 25).** Não havia o que reprocessar:
> `clone_ingest_log` tem **0** recusas de Shopee antes de 01/08 (as 56 recusas
> antigas estão com `store` nulo — a coluna só passou a ser preenchida em 01/08)
> e **0** `clone_posts` antigos com `clean_url` de Shopee. As "10 recusas de
> Shopee" nunca estiveram identificadas como Shopee: foi inferência.
>
> 🕐 **A TAREFA AGENDADA DAS 07:00 NÃO DISPAROU ÀS 07:00.** `fireAt` era 10:00
> UTC; o `lastRunAt` foi **19:29 UTC** — 9h30 atrasada, quando o app abriu.
> **Tarefa agendada do desktop não vence janela de log.** O corpo da rodada já
> tinha expirado (`net._http_response` guarda ~6h, o `get_logs` do MCP devolveu
> só a última hora); o que salvou a medição foi o `products.price_checked_at`,
> que é durável. Daí a `product_refresh_runs` da v19.

> 🎉 **O CLONE POST PASSOU A FAZER O QUE PROMETIA (REVISÃO 24).** Nas 24h de
> 01/08 chegaram **7 capturas de mensagem de grupo REAL**, e **7 de 7 têm
> `data_source='store'` e foto**. Até ontem eram 14 de 14 lidas do texto e 14 de
> 14 sem foto. Duas linhas que estavam escritas aqui como "ainda NÃO observado"
> deixaram de estar: **Amazon com dado de loja em campo** (4) e **Shopee com dado
> de loja vindo de grupo de verdade** (3).
>
> ⚠️ **E o mesmo lote revelou a P32, já fechada:** as 3 da Shopee saíram com
> `price_original` IGUAL ao `price` e ainda assim 53%, 42% e 35% de desconto. Os
> produtos já estavam no rodízio. `product-search` **v25** corrige a raiz e os 3
> foram limpos à mão. Ver "P32" abaixo.
>
> ✅ **P31 FECHADA (REVISÃO 23).** `clone-ingest` **v16**, coluna
> `lojas_permitidas` e a tela — backend provado com baseline e dois controles,
> **frontend deployado e conferido no navegador**: as funções novas existem no
> código servido, o console está limpo num load completo, e os três estados do
> card foram exercitados na página real. Ver "P31" abaixo.
>
> ✅ **P30 FECHADA (REVISÃO 21).** `product-refresh` **v18**: o `consultarML`
> passa a devolver `precoDe`, e a reconciliação da v16 finalmente roda para o
> Mercado Livre. **13 de 13 produtos medidos tiveram o "de" corrigido** — todos
> truncamento de centavos (169 → 169,90). ⚠️ **O ramo que APAGA o "de" não foi
> observado nenhuma vez** — ver a ressalva na seção da P30.
>
> ✅ **P21 FECHADA (REVISÃO 20).** A `clone-ingest` está em **v15** e a captura de
> Amazon passa a publicar **preço lido da página**, não o que o grupo-fonte
> digitou. Provado com baseline, controle e conferência do Érico no navegador —
> ver "P21 — a Amazon lida da página" abaixo. **P20 fechada junto:** o
> `clone_ingest_log` agora guarda host, caminho e loja das recusas.
>
> ✅ **REPO E PRODUÇÃO BATEM.** O frontend traz o teste de clonabilidade e a
> seleção múltipla de produtos. Ver "Foto obrigatória" e "Captura 24h" abaixo.
>
> ✅ A `clone-ingest` **v11** foi deployada em 31/07 às 10:32 e **PROVADA** (ver "Auto-publicação" abaixo). P17 fechada.
>
> ✅ **SHOPEE DESTRAVADA (REVISÃO 15).** Duas falhas nossas, uma tapando a
> outra, faziam **toda** consulta de Shopee falhar desde sempre. Consertadas e
> provadas: `resolve-link` **v5** e `product-search` **v24**. O mesmo link do
> Radar que ontem era recusado hoje devolve nome, R$ 12,51, −65% e foto.
> Ver "Shopee — as duas falhas" abaixo. **P26 e P25 fechadas.**
>
> ⚠️ **O que importa saber antes de mexer no Clone Post:** a captura funciona e o
> enriquecimento de loja funciona agora para **as três lojas** — Mercado Livre,
> Shopee e, desde a v15, Amazon. A auto-publicação da v11 exige
> `data_source='store'`, e agora as três podem alcançá-lo. **`auto_publish`
> segue desligado por decisão do Érico** (P18), não por falta de mecanismo.
>
> 📌 **PAUTA DA PRÓXIMA SESSÃO — atualizada no fim da tarde de 01/08.**
>
> A P21 e a P20 saíram nesta sessão. Sobra:
>
> **1ª — um chip clicado de verdade, na sessão logada do Érico.** O render foi
> provado no navegador com dados sintéticos; o `csAlternarLoja` gravando no banco
> a partir de um clique real **não foi observado** — ver a ressalva na P31.
> **2ª — observar o ramo que APAGA o "de"** (P30). Ele foi autorizado, deployado
> e **nunca disparou em 13 medições**. Não está provado que funciona — está
> provado que não foi acionado. Ver a ressalva na P30.
> **3ª — P27** (reprocessar as capturas de Shopee recusadas antes de 01/08).
> Estava bloqueada pela P20; deixou de estar para as recusas novas, mas as
> antigas continuam sem URL no log e seguem irrecuperáveis.
>
> **P29 tem janela de 24h e ela fecha sozinha.** O cron
> `product-refresh-daily` roda **09:00 UTC (06:00 BRT)**. Os logs do Supabase só
> voltam 24 horas — foi exatamente isso que impediu o diagnóstico em 01/08, com
> as rodadas de 29–31/07 já expiradas. **Ler o log da rodada no mesmo dia**, ou
> a pendência recomeça do zero. Ver P29. **Já existe tarefa agendada para
> 02/08 07:00** que mede sozinha e reporta — não investigar antes disso.
>
> ⚠️ **Não há nenhuma fonte de clone ativa hoje.** Medido em 01/08: a tabela
> `clone_sources` tem **uma única linha** — "TáNaMão", com `active=false`. A
> "Melhores Ofertas da Internet" não está mais na tabela (foi apagada, não só
> desativada). Enquanto isso a captura automática não roda para ninguém.

## Deploy da v20 — feito, e o que ainda NÃO está provado (03/08, tarde)

**Sessão limpa, primeira ação, uma chamada só.** 42 KB reemitidos de uma vez, como
a regra do repo exige depois do que aconteceu em P26 e P19.

| medida | antes | depois |
|---|---|---|
| `get_edge_function` · `version` | **18** | **19** |
| cabeçalho da fonte publicada | `v18` | **`v20`** |
| `verify_jwt` | `false` | `false` (inalterado) |

⚠️ **O contador do Supabase e a versão do código DESENCONTRARAM.** O Supabase numera
deploys, não o nosso código: como a v19 nunca subiu, o deploy 19 do Supabase carrega
o código **v20**. Quem ler `version: 19` e concluir "está na v19" vai errar.
**Isto não é caso isolado** — ver "Numeração" logo abaixo, que mediu o desencontro
em todas as Edge Functions e achou um bem maior, antigo e nunca notado.

**A fonte publicada foi lida e conferida** (número de versão não é prova): cabeçalho
`v20`, `RESERVA_ANTIGOS = 4`, as duas consultas com cota no lugar do `nullsFirst`,
`candidatos_novos`/`candidatos_antigos` na resposta e no insert da
`product_refresh_runs`, `discount_pct` no `select` e no ramo que apaga o "de",
`preco_sem_leitura_confirmada` valendo para as duas lojas.

### ⚠️ Isto NÃO é prova de que funciona

Fonte publicada é prova de que o **código certo está no ar** — não de comportamento.
A prova é a **rodada do cron de 04/08 09:00 UTC** e ela tem três exigências, todas
combinadas com o Érico antes do deploy:

1. **`product_refresh_runs` deixa de estar vazia.** A tabela está vazia hoje porque
   a v19 nunca subiu. A primeira linha nela já é sinal de que o deploy pegou.
2. **`candidatos_antigos > 0`.** É o número que prova a cota. Se vier `0` com
   produto antigo represado, a cota **não** funcionou — e aí a v20 está errada,
   não pendente.
3. **Os 4 produtos da Amazon saem do carimbo `30/07 14:16`** — La Roche, Kit
   Rapunzel, Kärcher e Calvin Klein. São a fome medida em 03/08 tomando forma de
   linha no banco.

**Nada foi rodado à mão para antecipar isso**, de propósito: um `dryRun` avulso leria
até 12 produtos nas lojas e gastaria crédito para responder o que a rodada do cron
responde de graça amanhã. A P34 e a P33 seguem **🟡 até essa leitura**.

---

## 📌 PAUTA DA PRÓXIMA SESSÃO — escrita em 03/08 de manhã, corrigida na REVISÃO 30

Lida nesta ordem.

> 🔴 **CORREÇÃO DA REVISÃO 30 — a REVISÃO 29 datou a si mesma errado e datou a
> pauta errado.** Dizia "03/08 à noite"; o commit `0de73f4` é de **03/08 às 10:41
> BRT**, de manhã. E o item 1º dizia que o cron "rodou às 09:00 UTC de 04/08" —
> **não rodou.** Em 03/08 às 13:45 UTC a `product_refresh_runs` tinha **0 linhas**
> e `max(created_at)` nulo, medido. A rodada é de **04/08**, no futuro. As duas
> primeiras tarefas da pauta continuam de graça, mas **não estavam disponíveis** na
> sessão que a pauta chamou de "próxima" — a de 03/08 de manhã.
>
> A lição é a mesma do "sem deploy" da P4: **a pauta escreveu no passado uma coisa
> que ainda não tinha acontecido.** Prova prevista não é prova lida.

**1ª — LER A PROVA DA P34 E DA P33. Não custa nada, e acontece às 09:00 UTC de 04/08.**
O cron `product-refresh-daily` (jobid 13, `0 9 * * *`, **ativo, reconferido em
03/08**) roda às 09:00 UTC de 04/08. **Conferir antes que a `product_refresh_runs`
deixou de estar vazia** — se ainda estiver com 0 linhas, a rodada não aconteceu e não
há o que ler. A tabela é **durável**, então depois de existir pode ser lida a qualquer
hora. Três leituras:

```sql
select * from product_refresh_runs order by created_at desc limit 1;
-- candidatos_antigos > 0 ?  candidatos_novos + candidatos_antigos = candidatos ?

select title, price_checked_at from products
where title ilike any (array['%La Roche%','%Rapunzel%','%rcher%','%Calvin Klein%'])
order by price_checked_at;
-- os 4 saíram de 30/07 14:16 ?
```

> ⚠️ **ANTES de ler, conferir que a v20 está mesmo publicada.** Em 03/08 o
> `list_edge_functions` mostrava `product-refresh` na **versão 19** (atualizada às
> ~12:23 UTC de 03/08), enquanto o doc fala em v20. É provável que o contador do
> Supabase e o número no cabeçalho do código andem defasados de um — a `clone-ingest`
> tem os dois iguais, então não dá pra assumir. **Se a v20 não estiver no ar, a
> leitura de 04/08 não prova nada** e a P34 continua onde estava. Conferir procurando
> `RESERVA_ANTIGOS` e `candidatos_antigos` na fonte publicada.

- `candidatos_antigos > 0` **e** os 4 da Amazon andando ⇒ **P34 FECHA**.
- `candidatos_antigos = 0` com antigo represado ⇒ a cota **não funciona**: a v20 está
  errada, vira bug, não pendência.
- Se um dos 4 da Amazon foi lido e **continuou órfão** (`price_original` nulo com
  `discount_pct > 0`), está **confirmado** que a v19 não limpa órfão velho.

**2ª — P33: o UPDATE dos órfãos, DEPOIS de ler o acima.** Baseline antes e depois.
Só ML e Amazon; a Shopee fica de fora por construção (P32).

```sql
update products set discount_pct = null
where price_original is null and discount_pct > 0
  and source in ('mercado_livre','amazon');
-- eram 9 em 03/08 (5 ML + 4 Amazon). Reconferir o número antes de rodar.
```

**3ª — P36: DEPLOYAR a v17, que já está codada e validada.** Não é mais "codar" — o
código está pronto no repo desde 03/08 de manhã e **não está em produção**. A
`clone-ingest` tem agora **72 KB / 1441 linhas** e se reemite **numa chamada só,
primeira ação**, com `verify_jwt: false` e só o `index.ts` (esta função não usa
`deno.json`). Levar junto qualquer outra mudança de `clone-ingest` para não gastar
dois deploys.

⚠️ **REPO À FRENTE DA PRODUÇÃO — o único ponto onde os dois não batem hoje.** O repo
tem `clone-ingest` **v17**; a produção está em **v16**. É de propósito e está
registrado aqui para que ninguém leia o repo e conclua que o pré-filtro está no ar.
**A prova, depois do deploy:** mensagem sintética em `dryRun` com link de Mercado
Livre numa fonte cujo `lojas_permitidas` é `{shopee, amazon}` tem que gravar motivo
começando em `[pre-filtro]` **sem** chamar a `resolve-link` (confirmar pela ausência
da chamada no `get_logs`), e o controle com link de Shopee tem que seguir normal.

**Depois disso, por ordem de valor:**

| | o quê | natureza |
|---|---|---|
| **P16** | decidir o gate ou desligar o auto-deploy do `app`. **Antes:** conferir no Dashboard se `app` e `wa-engine` compartilham build ou são dois auto-deploys | Dashboard + decisão |
| **P2** | confirmar a terceira saída (rate limit como Edge Function, autenticada por `WA_ENGINE_TOKEN`, no padrão do `wa-heartbeat`) e codar | decisão + código |
| **P35** | decidir entre token por usuário no engine e registrar o risco. **O gate por plano caiu na medição** | decisão |
| **P7** | conferir no `index.html` quais colunas de `profiles` as telas de admin leem, e só então escrever a migration | leitura + migration |
| **P19** | preview clicável — reemitir o `send-post` inteiro (571 linhas). **Sessão limpa própria** | código |
| **P12 · P23(b) · P11 · 301 do `www`** | frontend. **Agrupar num deploy só** — cada deploy do `app` reinicia o `wa-engine` (P16) | código |

⚠️ **Regra nova que a P16 impôs a esta pauta:** todo push reinicia o WhatsApp de
produção e descarta a `CLONE_FILA`. **Agrupar commits.** Um push de fim de sessão em
vez de um por item — foi o que esta sessão passou a fazer depois de medir.

⚠️ **Não reabrir:** P29, P27, P30, P31, P32, P3, P4, P6, P28 — todas fechadas **com
medição**. P18 e o teto de `max_per_day` estão parados por **decisão do Érico**, não
por falta de mecanismo.

---

## P4/P16 — o wa-engine não reinicia sozinho: quem reinicia é o nosso push (03/08)

**A P4 estava aberta desde 30/07 procurando OOM ou healthcheck. Não é nenhum dos
dois.** O log do EasyPanel de 03/08 tem **quatro boots do `wa-engine` em 35 minutos**,
cada um com hostname de container diferente — container novo, não processo reiniciado.

| boot | hostname | evento conhecido no mesmo instante |
|---|---|---|
| 12:04 | `ad919688a8ea` | — (anterior à sessão) |
| **12:13:26** | `38bbcd8613ec` | **`### Success ###` do build do serviço `app`**, ao segundo |
| **12:29:32** | `e4a5114fc716` | **push do commit `210767f`** |
| **12:39:34** | `41c43dc86668` | **push do commit `a0bb73a`** |
| — | — | **12:39 → 13:32: nenhum push, nenhum restart** |

**Três coincidências e um controle negativo de 53 minutos.** O deploy da Edge Function
`product-refresh`, às ~12:23, **não** derrubou o engine — como esperado, Supabase é
outro lado. Só push/deploy do repositório derruba.

### O que acontece a cada push, lido no log

O container novo sobe e faz `[RESTORE]`; enquanto ele loga, **o container antigo ainda
está vivo** e leva o tapa do WhatsApp:

```
[DISCONNECTED] Sessão …: código 440 — Stream Errored (conflict)
[CONFLICT] Sessão … substituída por outra sessão. Não reconectar.
```

**O engine trata isso corretamente** — `Não reconectar` impede o laço de dois
containers se expulsando em looping. Mas por alguns segundos duas instâncias disputam
a mesma sessão do WhatsApp, e a `CLONE_FILA`, que mora só em memória, é descartada.

### Por que isso importa mais do que parecia

**Commit de documentação reinicia o WhatsApp de produção.** Os dois pushes que
derrubaram o engine hoje não tinham uma linha de código — eram revisões deste arquivo.
O protocolo do repo manda commitar o `ESTADO_ATUAL.md` toda sessão; hoje isso custa um
restart do engine por sessão, no mínimo.

**A P4 vira caso fechado e a P16 vira urgente.** O registro antigo da P4 dizia
*"reiniciou sozinho … sem deploy"* — era inferência, ninguém tinha cruzado o horário
com os pushes.

### A prova controlada — push às 13:34:38, boot às 13:34:45

Feita de propósito no push do fecho da sessão, com baseline e controle:

| | |
|---|---|
| antes do push | `uptime` **3298 s** — no ar desde 12:39:33, **55 minutos estável** |
| push do commit `d9b6eeb` | **13:34:38Z** |
| depois | `uptime` **49 s** — subiu **13:34:45Z** |

**7 segundos entre o push e o boot.** Quinto ponto, e o único com baseline e controle
na mesma janela. **Um commit só de documentação derrubou e subiu o WhatsApp de
produção.** Não é mais correlação de horário: é causa medida.

⚠️ **Ainda NÃO conferido na configuração do EasyPanel:** se `app` e `wa-engine` estão
no mesmo build/deploy por configuração, ou se são dois auto-deploys disparados pelo
mesmo push. A distinção muda o conserto — desligar o auto-deploy de um serviço só, ou
separar os dois. **Isto é o que falta medir**, e é no Dashboard, não no código.

---

## P28 — a captura está viva, e o registro dela estava errado (03/08)

**A pendência dizia "não existe fonte de clone ativa". Existem duas, ligadas, e as
duas capturaram hoje.** A afirmação de que a "Melhores Ofertas da Internet" tinha
sido *apagada* da tabela também é falsa — ela está lá, `active = true`.

| fonte | `active` | `auto_publish` | `lojas_permitidas` | capturas hoje |
|---|---|---|---|---|
| TáNaMão – Promoções #02 | **true** | false | `{shopee, amazon}` | 3 |
| Melhores Ofertas da Internet | **true** | false | `{shopee, amazon}` | 5 |

### A cadeia inteira funcionando, em 24h

| `clone_posts` (24h) | |
|---|---|
| total | **17** |
| com `data_source='store'` | **17 de 17** |
| com foto | **17 de 17** |

**É o melhor número que este projeto já mediu nessa cadeia.** Em 31/07 eram 14 de 14
lidas do texto e 14 de 14 sem foto; em 01/08, 7 de 7 com loja e foto. Hoje, 17 de 17.
O `auto_publish` segue `false` nas duas por decisão do Érico (P18), então tudo cai na
fila de revisão — que é onde ele quer.

### O veredito das mensagens avaliadas — e dois números que pedem decisão

| status | motivo | n |
|---|---|---|
| `resolve_falhou` | **"vitrine do afiliado no Mercado Livre, não um produto"** | **44** |
| `teto` | **teto diário da fonte atingido (10/10)** | **28** |
| `salvo` | aguardando revisão · Shopee | 9 |
| `salvo` | aguardando revisão · Amazon | 8 |
| `duplicado` | mesmo link em 7 dias | 6 |
| `resolve_falhou` | Shopee/Amazon sem par LOJA/ITEM ou sem ASIN | 3 |
| `resolve_falhou` | encurtador HTTP 403 · só link de convite | 2 |

🔴 **44 recusas/dia de vitrine de afiliado do Mercado Livre, em fontes onde o ML nem
está em `lojas_permitidas`.** Cada uma gasta uma chamada de `resolve-link` para
descobrir algo que o cadastro da fonte já dizia. O desenho da P31 previu isto e
deixou escrito: *"um filtro anterior, por domínio do link cru (`meli.la`,
`s.shopee.com.br`, `amzn.to`), economiza até a chamada da `resolve-link`"*. **Agora
existe o número que justifica: 44/dia.** Não cobre encurtador genérico, mas cobre o
caso que domina.

⚠️ **28 mensagens/dia recusadas por teto (`max_per_day = 10`).** A cadeia está
entregando 17 de 17 com loja e foto; o teto é o que limita o volume, não a qualidade.
**Decidido pelo Érico em 03/08: manter em 10.** O `auto_publish` está desligado, então
quem revisa a fila é ele — subir o teto aumenta leitura de loja e o tamanho da fila
antes de existir gente para revisar. Reabrir quando houver quem revise.

**O filtro por domínio virou a P36** — **codado e validado em 03/08 (REVISÃO 30),
ainda não deployado.** Ver a pendência.

🔴 **E a medição de 03/08 mostrou que a premissa da P36 estava incompleta.** As 44
recusas/dia não são `loja_filtrada`: são **`resolve_falhou`**. Em 24h o
`clone_ingest_log` tem **`loja_filtrada` = 0**. O filtro de loja da v16/P31 **nunca
disparou** para o caso que domina — o link de vitrine morre antes, na `resolve-link`,
com "vitrine do afiliado no Mercado Livre, não um produto", e nunca chega ao filtro.
O pré-filtro não é uma economia em cima do filtro existente: **para este caso ele é o
único que roda.**

⚠️ **O que ainda NÃO se sabe, e é o que a v17 vai medir:** o `link_host` do log guarda
`resolved || original`, ou seja o host **depois** do redirecionamento. Não há como
saber se as 104 chegaram escritas como `mercadolivre.com.br` ou como encurtador. As
capturas que vingaram no mesmo grupo vêm de `s.shopee.com.br`, `amzlink.to` e
`link.amazon` — todas encurtadas. `meli.la` está no mapa da v17, então o encurtador
próprio do ML é alcançado; encurtador genérico (`boaoferta.me`) não é, por decisão.

---

## P3 — medida no painel logado, e fecha (03/08, tarde)

**A ressalva mais antiga desta pendência caiu.** Não por releitura de código: o painel
foi carregado logado, no Chrome do Érico, e os números foram lidos da página.

| medida (03/08, painel logado) | resultado |
|---|---|
| `WA_ENGINE_TOKEN` num load limpo | **preenchido, 43 chars** |
| `GET /sessions` com esse token | **200** — não 401 |
| Card "Sessões ativas" (`#instCard`) | **visível** (`display: block`) |
| Conteúdo do card | **1 instância, a do dono** (`+55319891…`), "Sessão ativa · pronto para postar", ONLINE |
| Console, load completo, filtrando 401/token/erro | **limpo** |

O engine tinha **3 sessões** no momento da leitura; a tela mostrou **1**, que é a do
dono. As outras duas são a sessão admin (`…73545214`) e a de outro usuário — **a
tela está certa**, não é card faltando.

### ⚠️ O que isto prova, e o que NÃO prova

Prova que **hoje funciona**. **Não** prova que o conserto foi a causa: o sintoma
nunca foi reproduzido ANTES do patch — a P3 nasceu de diagnóstico no código, e isso
está registrado desde 03/08 de manhã. Se o 401 aparecer de novo, o mecanismo dos três
defeitos continua descrito na pendência e serve de ponto de partida.

### 🔎 Achado de lado: o painel vive em DOIS origins, e o login não é compartilhado

A primeira tentativa de medição não achou sessão nenhuma e quase virou "o Érico não
logou". Não era: **`https://megalinksbr.com.br` e `https://www.megalinksbr.com.br`
são origins diferentes**, cada um com o seu `localStorage`. A chave
`sb-nxlfezpagporealqqbfj-auth-token` existe **só no `www`**.

Consequência prática: quem logar no `www` e depois cair no domínio sem `www`
**aparece deslogado**, sem erro nenhum na tela — e o contrário também. O nginx serve
os dois. **Ao medir qualquer coisa de sessão, usar o `www`.**

---

## Numeração — o contador do Supabase NÃO é a versão do código (03/08)

**Decisão do Érico em 03/08: registrar o par, não realinhar.** Um redeploy no-op
faria o número voltar a bater, mas gastaria uma segunda transcrição de 42 KB que não
precisa existir — e o alinhamento quebraria de novo no próximo código-sem-deploy.
O que resolve de verdade é parar de tratar o número como identidade.

**Regra:** a versão de verdade é o **cabeçalho da fonte publicada**
(`get_edge_function` → primeira linha do `index.ts`). O campo `version` é um
contador de deploys do Supabase e não significa nada sobre o nosso código.

### Inventário medido em 03/08 (`list_edge_functions`)

| função | `version` do Supabase | versão do código | batem? |
|---|---|---|---|
| `product-refresh` | 19 | **v20** | ❌ — a v19 nunca foi deployada |
| `product-search` | **44** | **v25** | ❌ — **19 deploys de diferença** |
| `send-post` | 45 | v45 | ✅ |
| `clone-ingest` | 16 | v16 | ✅ |
| `resolve-link` | 5 | v5 | ✅ |
| `radar` | 47 | não conferida | ? |

🔴 **O achado: a `product-search` está desencontrada há muito tempo e ninguém tinha
notado.** 44 contra v25 são **19 deploys** de diferença. Quem cruzar
"`product-search` v25" do doc com `version: 44` do Supabase pode concluir que o
deploy não pegou, ou que está lendo cache, e sair investigando o que não existe.
Nenhuma decisão passada dependeu disso, mas a próxima podia.

⚠️ **A coluna "versão do código" das linhas que batem NÃO foi lida da fonte
publicada** — veio do que este doc já afirmava. Só a `product-refresh` teve o
cabeçalho lido em produção nesta sessão. As demais são **registro, não medição**, e
estão marcadas assim de propósito.

**Ao deployar qualquer Edge Function daqui em diante:** anotar o par nesta tabela,
junto com o resto do fecho de sessão.

---

## Rodada de 03/08 — os contadores lidos do corpo, e a fome atrás deles

**A ressalva da P29 fechou: os contadores foram LIDOS, não reconstruídos.** E,
lidos, mostraram um segundo problema que a reconstrução de 02/08 não podia ver.

### Como o corpo foi obtido

`net._http_response`, linha `id = 64040`, lida às 11:48 UTC — **2h48 depois** da
rodada das 09:00. A nota de 02/08 dizia que a tabela guarda ~6h: está confirmado
que guarda o bastante, **desde que se leia no mesmo dia**. O `get_logs` do MCP
seguiu inútil (devolveu só a última hora).

⚠️ **A rodada medida foi a v18.** A `product_refresh_runs` está **vazia** porque
a v19 continua sem deploy — conferido em `get_edge_function`: `version: 18`.
*(Registro da manhã de 03/08. O deploy saiu à tarde — ver "Deploy da v20" no topo.)*

### Os contadores, medidos

| campo | valor |
|---|---|
| `candidatos` | **12** |
| `conferidos` | 4 |
| `preco_mudou` | 2 |
| `conferidos_amazon` | 6 |
| `pulados` | 5 |
| `desconhecidos` | 1 |
| `usos_do_pool_compartilhado` | **0** |
| `interrompido_por_tempo` | `false` |
| `duracao_ms` | **11 115** |

Fecha: 4 + 2 + 5 + 1 = 12. **6 leituras reais de loja**, contra as 3 de 02/08.
Os 5 pulos são todos Shopee ("ainda sem verificador"); o desconhecido é
*"Caixa 10 Máscaras Faciais — MLB ID não encontrado no link"*, que **não carimba**
e volta na rodada seguinte. 11,1 s contra `DEADLINE_MS` de 70 s: **tempo nunca
foi o limite**, agora com o número lido e não inferido.

**Dois preços mudaram, os dois para cima:** Kit 6 Xícaras `29,90 → 34,90` e
Pringles `27,90 → 32,90`. Mesmo padrão do caso da Patrícia — promoção que acabou
com o post seguindo no preço velho.

### O que apareceu atrás disso — P34

**Os 11 produtos carimbados hoje foram TODOS criados hoje, entre 03:25 e 03:26.**
Nenhum produto antigo entrou na rodada.

| medida (03/08, 11:48 UTC) | valor |
|---|---|
| produtos não expirados | 108 |
| criados nas últimas 24h | **27** |
| ainda com `price_checked_at` nulo | **19** |
| parados desde `30/07 14:16` | **4** — La Roche, Kit Rapunzel, Kärcher, Calvin Klein (Amazon) |

O mecanismo é aritmético e não depende de hipótese: a ingestão cria produto com
`price_checked_at` nulo, o `nullsFirst: true` da v17 põe **todos** eles na frente
da fila, e `BATCH = 12` é **menor que a entrada diária** (27 hoje, 66 em 30/07).
A fila de nulos nunca esvazia, então **produto que já tem carimbo nunca volta a
ser conferido**. Os 4 Amazon estão parados há 4 dias.

**O `nullsFirst` não está errado** — produto novo, sem preço conferido, é mesmo o
mais urgente. O que falta é a rodada não ser monopolizada por ele.

**Saída escolhida pelo Érico em 03/08: reserva de cota no lote** — a única que
**não aumenta o consumo de leitura**. Subir o `BATCH` ou rodar o cron mais vezes
dobraria as chamadas de loja, e o `usos_do_pool_compartilhado: 0` de hoje só
aconteceu porque os donos têm credencial própria; para dono novo isso vira
consumo do crédito compartilhado, que é o que o teto de pool existe para proteger.

### O conserto — `product-refresh` v20

`BATCH` continua **12**. O que muda é de onde vêm os 12: duas consultas com cota
em vez de uma ordenação global.

```
RESERVA_ANTIGOS = 4   // piso, não teto
novos   = price_checked_at IS NULL      ordenado por created_at ASC  (FIFO)
antigos = price_checked_at < corte      ordenado por price_checked_at ASC
```

A cota é **piso, não teto**: vaga que um lado não usa passa para o outro, então o
lote nunca encolhe. Sem antigo represado, a rodada inteira vai para os novos —
comportamento idêntico ao da v19.

A ordenação dos novos por `created_at` é ganho de lado: entre nulos a v19
empatava e quem escolhia era o banco.

**Contadores novos `candidatos_novos` e `candidatos_antigos`** na resposta — e,
por tabela, dentro do `resumo` jsonb da `product_refresh_runs`, **sem migration**.
Existem para a cota ser conferível: sem eles não há como provar que ela disparou.

**Testado antes do deploy**, com a lógica isolada e os números reais do banco
(19 na fila de novos, 78 na de antigos, medidos em 03/08):

| cenário | fila | lote |
|---|---|---|
| **real de 04/08** | 19 novos, 78 antigos | **8 novos + 4 antigos** |
| *(a v19 faria)* | *19 novos, 78 antigos* | *12 novos + **0** antigos* |
| sem antigo represado | 30, 0 | 12 + 0 |
| sem produto novo | 0, 50 | 0 + 12 |
| fila curta dos dois lados | 3, 2 | 3 + 2 (lote 5) |
| novos abaixo da cota | 3, 40 | 3 + 9 |

Invariantes conferidas em 8 casos: **o lote nunca encolhe** (`total =
min(BATCH, novos+antigos)`) e **antigo represado sempre entra**.

✅ **DEPLOYADA em 03/08 à tarde**, primeira ação de sessão limpa, numa chamada só
(42 KB). A v20 contém a v19 inteira, então o mesmo deploy entregou as duas. **Ainda
NÃO provada:** a prova é a rodada do cron de 04/08 09:00 UTC — ver "Deploy da v20"
no topo.

**Prova a exigir na primeira rodada depois do deploy:** `candidatos_antigos > 0`
e os 4 da Amazon saindo de `30/07 14:16`. Se vier `candidatos_antigos: 0` com
produto antigo represado, a cota não funcionou — e esse é o número que prova.

---

## P29 — por que as rodadas do cron conferiam 1 produto só (FECHADA, 02/08)

**A pergunta tinha resposta na composição da base, não no código de lote.**

### Medido em 02/08, na rodada das 09:00 UTC

`cron.job_run_details` jobid 13: `succeeded` às 09:00:00.11. **11 linhas de
`products` ganharam `price_checked_at`** entre 09:00:04 e 09:00:13.

| candidatos (BATCH=12, 18 elegíveis) | ramo |
|---|---|
| 3 Shopee | pulado — `LOJAS_COM_VERIFICADOR` não tem Shopee · **carimba** |
| 5 ML de dono `starter` | pulado — `PLANOS_COM_MONITORAMENTO` não tem starter · **carimba** |
| 2 Amazon (MONDIAL, Havit) | lido da loja |
| 1 ML de dono com credencial (Daoyee) | lido da loja |
| 1 | **não carimbado** — `desconhecido`, volta na rodada seguinte |

Duração ~13 s contra `DEADLINE_MS` de 70 s: **tempo nunca foi o limite**.

### A explicação, e por que ela não é palpite

**8 dos 12 candidatos não podem ser conferidos por construção.** Antes da v17 os
pulos por condição faziam `continue` **sem carimbar** — esses 8 ficavam com
`price_checked_at` nulo para sempre e reenchiam o lote em **toda** rodada. Por
isso o único carimbo de cron de toda a base era `2026-07-30 09:00:08`, 1 linha: o
lote estava cheio de produtos que nunca saíam da fila. O carimbo nos pulos, que a
v17 pôs por outro motivo (para o `nullsFirst` não criar fome garantida), é
exatamente o que destravou isto. **Não havia bug de lote nenhum.**

### ⚠️ O que NÃO foi lido, e por quê

`candidatos`, `conferidos`, `pulados`, `desconhecidos`, `interrompido_por_tempo`
e `duracao_ms` **não foram lidos do corpo da resposta** — ele já não existia.
`net._http_response` guarda ~6h (linha mais antiga às 13:31 UTC) e o `get_logs`
do MCP devolveu só a última hora. A tabela acima é **reconstruída** do
`products` + do código, e está marcada como tal de propósito.

**A tarefa agendada existia para evitar isso e falhou:** `fireAt` 10:00 UTC,
`lastRunAt` **19:29 UTC**. Ela roda quando o app abre, não na hora marcada.
**Não usar tarefa agendada do desktop para vencer janela de log.** A saída é a
`product_refresh_runs` da v19, que não depende de ninguém estar com o app aberto.

---

## P30 — o ramo que apaga o "de" DISPAROU (02/08)

**A ressalva da revisão 21 fechou.** O caminho que apaga foi observado, medido e
distinguido de leitura degradada.

### A varredura — 64 produtos de ML, dryRun, um por produto

Só donos com credencial própria (`scrape_do_token`, `_2` ou `ml_session_cookie`),
então **`usos_do_pool_compartilhado: 0` em todas as chamadas** — custo zero de
crédito compartilhado.

| resultado | produtos |
|---|---|
| `de: X -> Y (loja)` — corrigido | **43** |
| **`de: X -> sem (loja)` — APAGADO** | **5** |
| `de: sem -> X (loja)` — criado | 1 |
| nenhuma linha `de:` | 15 |

### O teste que separa "loja tirou o desconto" de "leitura degradada"

Era a pergunta escrita na ressalva da revisão 21: *"se aparecer em massa num dia
só, é leitura degradada"*. **Não apareceu em massa.** Na mesma varredura, no
mesmo minuto, com o mesmo leitor, **43 produtos leram "de" normalmente**. Leitura
degradada degradaria os 43 junto. 5 em 64 espalhados é promoção que acabou.

### Os 5 — e três deles eram a P32 no Mercado Livre

| produto | de | por |
|---|---|---|
| Gel De Limpeza Facial Effaclar | 127 | **127,90** — "de" MENOR que o "por" |
| Máscara Labial Kissing Jelly | 179 | **179,00** — iguais |
| Sérum Capilar Noturno Kérastase | 199 | **199,00** — iguais |
| Óleo corporal de amêndoa e cereja | 116 | 71,91 — desconto real perdido |
| Perfume Deo Parfum Essencial | 229 | 184,99 → **163** — desconto real perdido |

**O primeiro disparo real do ramo que apaga limpou lixo, não valor.** Três dos
cinco tinham "de" igual ou menor que o "por" — exatamente o defeito da P32,
aparecendo no ML. Só 2 produtos perderam desconto de verdade. O custo temido da
saída (a) segue menor do que o medo dela.

### Aplicada de verdade, com baseline

O estado anterior dos 64 foi registrado antes do UPDATE. Resultado bateu com o
`dryRun` linha por linha:

| `price_original` nos 64 | antes | depois |
|---|---|---|
| com centavos | 0 | **43** |
| inteiro redondo | 62 | 15 |
| nulo | 2 | 6 |

⚠️ **Correção de registro sobre a revisão 21.** A prova "13 de 13 corrigidos" de
01/08 foi em **`dryRun`** — o prefixo `[dry] gravaria:` nas evidências denuncia.
**Nada tinha sido gravado.** Em 02/08, antes desta varredura, **64 de 70 produtos
de ML ainda tinham o "de" inteiro no banco** (998, 2999, 169, 5717…). A v18
funcionava e estava no ar; ela só nunca tinha alcançado a base, porque o cron
confere ~1 produto de ML por rodada. **Prova em dryRun não é dado corrigido.**

### Os 15 sem linha `de:` — causa medida

Não era `precoDe` `undefined`: **o `consultarML` nunca devolve `undefined`** (o
`return` sempre traz `precoDe: deOk`, que é `number|null`). É a guarda
`if (precoNovo && res.precoDe !== undefined)`: com `precoNovo` nulo ela pula a
reconciliação **inteira**, e o produto ainda assim entra em `conferidos`. O
wa-engine respondeu `ok` sem `price_to`. **Leitura vazia contada como sucesso.**
A v19 põe contador nisso — ver abaixo.

---

## P33 — o desconto órfão (v19, 02/08)

**Encontrado no primeiro disparo real do ramo da P30**, e é o mesmo formato da
P32: campo com nome certo e valor sem lastro.

Os 5 produtos ficaram com `price_original = null` e `discount_pct` intacto —
**37, 46, 44, 15 e 10%**. Porcentagem calculada contra um "de" que a própria
plataforma acabou de declarar inexistente.

**Onde chega e onde não chega, conferido no código e não suposto:**

| consumidor | usa `discount_pct`? |
|---|---|
| `send-post` (o post no grupo) | **não** — monta o texto só com `price_original` (linha 223) e nem seleciona a coluna. **O post sai limpo** |
| `frontend/index.html` linha 5799, lista de produtos | **sim** — imprime `X% OFF` |
| `frontend/index.html` linha 8271, formulário de edição | **sim** — regrava o valor velho num salvamento |

**Por que não é o caso da Shopee, e por que a decisão da P32 não corre risco:**
na Shopee a API de afiliado **afirma a taxa** e o selo fica sem "de" de propósito.
No ML e na Amazon o desconto é **derivado** do "de". E a Shopee **nunca chega a
este laço** — `LOJAS_COM_VERIFICADOR` só tem `mercado_livre` e `amazon`, então a
separação é por construção, não por `if`.

**v19:** quando o "de" é apagado por leitura boa e havia `discount_pct > 0`, o
`discount_pct` vai junto.

🔴 **CORREÇÃO DE REGISTRO (03/08, tarde) — "alcançados pela v19 na próxima leitura"
está ERRADO, e era a única coisa que fazia esta pendência parecer resolvida.**
O ramo que zera o desconto mora dentro de `if (antes !== res.precoDe)`. Num produto
que **já é órfão**, `antes` é `null` (o "de" já foi apagado) e a loja segue sem "de",
então `res.precoDe` também é `null` — `null !== null` é **falso**, o bloco inteiro é
pulado e o `discount_pct` fica de pé. **A v19 impede órfão NOVO; ela não limpa órfão
VELHO.** Lido no código, ainda não medido — a rodada de 04/08 mede de graça: se um
dos 4 da Amazon for lido e continuar órfão, está confirmado.

**Estado medido em 03/08 à tarde — 24 produtos, não 11:**

| loja | órfãos | |
|---|---|---|
| Shopee | **15** | **intencional** (P32: a API afirma a taxa, o "de" não existe) |
| Mercado Livre | **5** | a limpar |
| Amazon | **4** | a limpar |

**Saída escolhida pelo Érico em 03/08: correção pontual de dados nos 9 de ML e
Amazon, DEPOIS da rodada de 04/08.** A rodada pode restaurar o "de" de alguns deles
sozinha, e aí não há órfão a limpar — corrigir antes seria gravar por cima de uma
medição que ainda não aconteceu. Baseline antes e depois, como na P30.

⚠️ **Observação de lado, não virou pendência:** quando o "de" VOLTA (a loja passa a
mostrar preço riscado), o código grava `price_original` mas **não recalcula** o
`discount_pct`. Um produto limpo hoje que recuperar o "de" amanhã fica com "de" e
sem selo. Efeito conservador — mostra menos desconto do que tem —, do mesmo formato
do bug do "de" truncado da P30 antes da v18.

---

## P27 — FECHADA por conjunto vazio (02/08)

Não era escolher entre estender o `reparse` e deixar passar: **não há o que
reprocessar.**

| medido | |
|---|---|
| Recusas de Shopee no `clone_ingest_log` antes de 01/08 | **0** |
| Recusas antigas com `store` preenchido | **0** — as 56 estão com `store` nulo |
| `clone_posts` antes de 01/08 com `clean_url` de Shopee | **0** (as 14 antigas são todas Amazon) |

A coluna `store` só passou a ser preenchida em 01/08. **As "10 recusas de Shopee"
nunca estiveram identificadas como Shopee no log — foi inferência**, do mesmo
formato da P25 e do `ORDER BY`.

**E as recusas de Shopee de hoje, já com host e caminho da P20, estão certas:**
`shopee.com.br/user/voucher-wallet` e `shopee.com.br/m/mercado` — carteira de
cupom e página de campanha. Nenhuma é produto. A lista de exclusão da v5 está
fazendo o trabalho dela, e isto fica escrito para ninguém reabrir investigação.

---

## P32 — a Shopee devolvia um "de" que não existe (`product-search` v25)

**Encontrada por acidente**, olhando o card da P31 depois do deploy. É o tipo de
defeito que nenhuma das provas desta sessão pegaria: as três capturas de Shopee
estavam com `data_source='store'`, com foto, com preço certo — e com um "de"
inventado.

### Medido

| | |
|---|---|
| Capturas de Shopee em 24h | 3 |
| Com `price_original` **igual** ao `price` | **3 de 3** |
| E ainda assim com desconto > 0 | **3 de 3** (53%, 42%, 35%) |
| Capturas de Amazon no mesmo lote com o defeito | **0 de 4** |

Os três já eram produto no grupo. O post sairia:
*"~~De R$ 56,80~~ por **R$ 56,80** — 53% OFF"*.

### A causa, lida no código

`product-search`, ramo da Shopee:

```
price_from:   node.price            ← o preço ATUAL
price_to:     node.priceMin         ← o mesmo preço atual
discount_pct: node.priceDiscountRate
```

**`node.price` nunca foi o "de".** É o preço de venda, o mesmo valor de
`priceMin`. A consulta GraphQL **não pede** o preço anterior — a API de afiliado
só informa a *taxa* de desconto. O campo carregava um número que nunca
significou o que o nome dele diz, e nada no caminho conciliava os dois.

### O conserto, e o que foi descartado

**v25: não manda `price_from` nenhum para a Shopee.** Se a loja não diz qual era
o preço antes, a plataforma não afirma — mesma regra do buybox da Amazon, que
devolve `null` quando as duas testemunhas discordam. O selo de desconto fica,
porque esse a API afirma.

**Descartado de propósito:** calcular `price / (1 - taxa)`. Devolveria o riscado,
mas seria número **deduzido e não lido**, sujeito a arredondamento — exatamente a
classe de erro que a P21 e a P30 fecharam do outro lado. Decisão do Érico.

**Prova (`dryRun`, item do Radar que a v24 devolvia com "de" == "por"):**
Senbenbao X55 · `data_source='store'` · **por R$ 12,51 · "de" `null` · desconto
65%**. O desconto sobrevive, o número falso some.

**Os 3 produtos foram limpos** com `price_original = null`, junto com as 3
capturas. O `WHERE` exigia `price_original = price`: um "de" legítimo não seria
tocado. Estado anterior registrado antes do UPDATE.

### O Radar NÃO tinha o defeito — de novo

| Fonte, 3 dias | Ofertas | "de" == "por" | Desconto impossível |
|---|---|---|---|
| Shopee | 64 | 4 | **0** |
| Amazon | 45 | 2 | **0** |
| Mercado Livre | 117 | 24 | **0** |

**Terceira vez que este repo tem duas implementações da mesma coisa, uma certa e
uma errada.** Foi assim com a assinatura da Shopee (a `radar/index.ts` sempre
assinou SHA-256 certo enquanto a `product-search` usava HMAC), e é assim de novo
com o preço. **O Radar continua sendo o exemplar correto que ninguém consultou.**

---

## P31 — filtro de loja por fonte (`clone-ingest` v16, 01/08 noite)

Grupo-fonte que presta para uma loja e não para outra é o caso comum, não a
exceção. Medido em 01/08 na "Melhores Ofertas da Internet": link de Shopee
clona, link de Mercado Livre não. Sem filtro, a plataforma gasta uma
`resolve-link` por mensagem, 24h por dia, para sempre recusar — e o dono só tem
a opção de largar o grupo inteiro.

### O desenho, e por que cada peça está onde está

**Coluna `clone_sources.lojas_permitidas text[]`, default `'{}'`.**
**Array vazio = TODAS as lojas.** Por isso nenhuma fonte existente muda de
comportamento — e isso foi medido, não deduzido (ver o controle 1 abaixo).
"Nenhuma loja permitida" **não é estado alcançável**: fonte que recusa tudo é
fonte desativada, e para isso já existe o `active`.

**Vocabulário: os slugs da `resolve-link`** (`mercadolivre`, `shopee`,
`amazon`), **não o enum `marketplace` do banco** (`mercado_livre`). A comparação
no filtro é contra o `store` que a `resolve-link` devolve; guardar o mesmo
vocabulário da comparação elimina a tradução. A divergência
mercadolivre/mercado_livre já custou uma investigação neste projeto, e um
terceiro dialeto só para a tela seria pedir a mesma conta de novo.

**Onde o filtro roda:** depois da `resolve-link`, antes da `product-search`.
- **Depois da resolve** porque só ela sabe qual é a loja: o grupo posta
  encurtador (`meli.la`, `amzlink.to`, `s.shopee.com.br`) e o domínio cru não
  responde a pergunta. Um filtro anterior, por domínio do link cru, economizaria
  até a `resolve-link` — mas não cobre encurtador genérico, e recusar por engano
  uma loja permitida é pior que gastar a resolve.
- **Antes da product-search** porque é lá que o Scrape.do custa 10 créditos.
- **E antes do dedupe**, que é uma consulta ao banco: não há por que perguntar se
  um link repetido já foi clonado quando ele nem seria.

### Prova — baseline e dois controles, mesmo link, mesma fonte

| `lojas_permitidas` | veredito | o que saiu |
|---|---|---|
| `{}` (estado de todas as fontes hoje) | `salvaria` | R$ 151,27 · `data_source='store'` |
| `{shopee}` | **`loja_filtrada`** | *"Amazon nao esta nas lojas escolhidas para esta fonte (Shopee)"* — `preço` e `data_source` **nulos** |
| `{shopee,amazon}` | `salvaria` | R$ 151,27 de novo |

O controle que mais importa é o **primeiro**: array vazio tem que ser
indistinguível de não ter filtro nenhum, senão a migration teria mexido
caladamente nas duas fontes cadastradas. E o **terceiro** fecha o circuito — o
mesmo link volta a passar quando a loja entra na lista, então o que mudou foi o
filtro e não a Amazon.

No caso filtrado, `data_source` e `price` voltaram **nulos**: a recusa aconteceu
antes de consultar a loja, que é o ponto inteiro do recurso. Estado restaurado:
`lojas_permitidas` de volta para `'{}'` na TáNaMão.

### Frontend — ENTREGUE, NÃO SERVIDO

Nas **duas** cópias do `index.html` (`md5sum` confere byte a byte):

- **Chips no card da fonte** (Mercado Livre · Shopee · Amazon), clicáveis, que
  gravam direto. Acima deles, em texto: *"clona qualquer loja"* ou *"só clona:
  X"*. O resumo vem **antes** dos chips de propósito: chip aceso diz "esta loja
  pode"; nenhum chip aceso **não** diz "nenhuma pode", diz "todas podem", e essa
  é a leitura mais fácil de errar da tela inteira. Desmarcar a última dispara um
  aviso explícito e sugere o botão Pausar.
- **Checkboxes no formulário de nova fonte**, com o mesmo texto sobre o padrão.
- **Contagem por loja no card, 7 dias** — "Shopee: 12 capturada(s) · Mercado
  Livre: 30 recusada(s)". Só existe **porque a P20 saiu**: antes dela dava para
  contar 30 recusas e não dava para dizer de que loja. Janela de 7 dias e não de
  24h (a do veredito) porque 24h de uma fonte pausada é zero, e zero não ajuda
  ninguém a decidir o que manter.
- **O teste de clonabilidade SUGERE a loja e não marca nada sozinho.** Um teste
  valida UMA loja: marcar a caixa sozinho transformaria "este link de Shopee
  funcionou" em "este grupo só serve para Shopee", conclusão que o teste não
  autoriza — e o efeito colateral seria descartar em silêncio todo link de ML
  daquele grupo. Foi decisão explícita do Érico em 01/08.

**Validação feita:** `node --check` nos 4 blocos inline das duas cópias, e o
smoke test do P15 (blocos no mesmo contexto `vm`, DOM falso) **comparado com o
baseline** — resultado idêntico ao do `HEAD` anterior, ou seja, não piorou.

### Deployado e conferido no navegador (01/08, 18:20)

Build do EasyPanel: Success. **Mas Success é entrega de bytes** — o `f94e2f0`
também deu Success e derrubou o site. O que foi lido na página servida:

| Conferência | Resultado |
|---|---|
| `csAlternarLoja`, `csLojasHtml`, `csCarregarLojas`, `csSugestaoLoja`, `csLojasContagemHtml` | **todas `function`** |
| `CS_LOJAS_FILTRO` | `["mercadolivre","shopee","amazon"]` |
| `CS_ROTULO_STATUS.loja_filtrada` | *"de loja que você não escolheu"* |
| Regra CSS `.cs-loja` nas folhas carregadas | presente |
| `csRender` e `csSalvar` (controle: peças antigas) | **continuam `function`** |
| Console num load completo | **zero erros** |

O controle das peças antigas é o que descarta TDZ: se o bloco `<script>` tivesse
explodido no meio, `csRender` teria sumido junto — foi exatamente essa a assinatura
do `f94e2f0`. Todas responderem `function` prova que o bloco chegou ao fim.

**Os três estados do card exercitados na página real**, com `CS_LOJAS_LOG`
sintético e restaurado depois:

| `lojas_permitidas` | texto do card | chips acesos |
|---|---|---|
| `[]` | *"🏬 clona **qualquer loja**"* | **0** |
| `["shopee"]` | *"🏬 só clona: **Shopee**"* | **1** |
| `["shopee","amazon"]` | *"🏬 só clona: **Shopee, Amazon**"* | 2 |

E a contagem por loja renderizou exatamente a frase que motivou a pendência:
*"Mercado Livre: 30 recusada(s) · Shopee: 12 capturada(s) · 1 recusada(s) —
últimos 7 dias"*. A sugestão do teste devolve **string vazia** para loja fora da
lista, em vez de markup quebrado.

⚠️ **O que continua NÃO observado:** um **clique real** num chip, na sessão
logada, gravando `lojas_permitidas` no banco. O que foi provado é que a função
existe, que o render está certo e que o `update` do Supabase é o mesmo padrão do
`csAlternar` (que funciona). **A escrita a partir do clique é dedução, não
medição** — e neste projeto essa diferença já custou uma pendência inteira.

---

## P30 — o "de" do Mercado Livre (`product-refresh` v18, 01/08 noite)

**ENTREGUE.** O `consultarML` não devolvia `precoDe`, e a reconciliação da v16
exige `!== undefined` — então ela **nunca rodou para o ML**. O "de" ficava com o
inteiro antigo (169 no lugar de 169,90), sobra do truncamento de centavos que o
wa-engine já consertou do lado do "por".

### A decisão, e a trava que nenhuma das duas saídas tinha

Érico escolheu a **saída (a)**: repassar e aceitar que o "de" seja apagado quando
a loja não mostra preço riscado. Não publicar desconto que a loja não exibe é a
mesma regra que fechou o caso La Roche.

O que fazia a **(b)** parecer necessária era o medo de apagar um "de" bom por
causa de uma leitura que falhou. **Isso não é escolher entre (a) e (b) — é
separar dois casos que a pendência tratava como um só.** E a distinção já estava
escrita no tipo `Consulta` desde a v15, usada só pelo ramo da Amazon:

> `undefined` = não olhei · `null` = olhei e a loja não mostra.
> **Só o segundo pode apagar.**

Na v18 o `null` só sai depois de `r.ok` **e** `d.ok` — leitura que deu certo.
Leitura que falha sai por `'desconhecido'` antes, sem `precoDe`, e não encosta no
que está gravado.

### Prova, com baseline

| | v17 (baseline) | **v18** |
|---|---|---|
| Deo Colônia Kriska, "de" R$ 169 | `gravaria: {price_checked_at, price_changed:false}` — **o "de" nem é olhado** | **`de: 169 → 169.9 (loja)`** |

**13 de 13 produtos medidos foram corrigidos**, todos pelo mesmo motivo — o
centavo que faltava: 169→169,90 · 79→79,90 · 462→462,90 · 998→**998,85** ·
89→89,90 · 141→141,90 · 116→116,90 · 205→205,90 · 68→**68,29** · 257→**257,80** ·
259→259,90 · 287→287,90 · 79→79,90.

Os três que não terminam em `,90` (998,85 · 68,29 · 257,80) valem mais que os
outros dez: se a v18 estivesse inventando um `,90` em cima do inteiro em vez de
ler a loja, os treze terminariam igual.

**Controle da trava, medido por acidente e por isso mais convincente:** um
produto com link sem MLB saiu por `desconhecidos: 1` e **não gerou patch nenhum**
— nem `price_checked_at`. Leitura que falha não apaga nada, que é exatamente o
que a saída (a) precisava garantir para não virar a saída (b).

**Achado de brinde:** o Shampoo Kérastase subiu de R$ 191,81 para **R$ 225** na
loja. Preço de post mais barato que o do site, de novo — o mesmo sintoma da
Patrícia, agora pego pela rotação.

### ⚠️ Ressalva honesta — o ramo que APAGA não foi observado

**Em 13 de 13, a loja mostrava "de".** O caminho que apaga (`precoDe = null` com
leitura boa) **não disparou nenhuma vez**. Ele está deployado, autorizado e
**não medido**. Está provado que ele não foi acionado, não que ele funciona.

Isso corta nos dois sentidos, e os dois merecem estar escritos:

1. **O custo temido da saída (a) não apareceu.** O medo era "vou perder o
   desconto de um monte de post". Em 13 amostras, zero.
2. **Justamente por isso ninguém viu o apagamento acontecer.** Quando ele
   acontecer pela primeira vez, será em produção, sozinho, sem ninguém olhando.
   **O que conferir:** uma linha `de: X -> sem (loja)` no `detalhes` da rodada do
   cron, e o `price_original` daquele produto virando nulo. Se aparecer em massa
   num dia só, é sinal de leitura degradada, não de loja que tirou o desconto.

---

## P21 — a Amazon lida da página (`clone-ingest` v15, 01/08 fim de tarde)

**ENTREGUE E PROVADA.** A captura de Amazon deixou de publicar o preço que o
grupo-fonte digitou e passou a publicar o preço lido do anúncio.

### O conserto não foi escrever um leitor — foi usar o que já existia

O `product-refresh` lê a Amazon **por fetch direto, sem Scrape.do e sem custo de
crédito**, exigindo duas testemunhas independentes do buybox (12/12 de acerto
medido em 30/07). A `clone-ingest` não usava esse caminho: chamava a
`product-search`, que **não tem ramo de Amazon nenhum** e pendura mais de 90 s.
O `chamarFuncao` abortava em 30 s, a loja "falhava", e a oferta caía no fallback
de texto. **O código certo estava a duas funções de distância o tempo todo.**

**Baseline do leitor, medido antes de tocar em qualquer coisa** (01/08 14:24 UTC,
`product-refresh` v17 em produção, `dryRun`, produto do Kärcher): leu a página em
**1,9 s** e devolveu **R$ 360,91**. O clone tinha publicado R$ 251,91. Foi essa
medição que autorizou a portabilidade — não a lembrança de que "funcionava".

### Prova, com baseline e controle

Mesma mensagem sintética, mesma fonte (TáNaMão), mesmo link real
(`amazon.com.br/dp/B0F3ZYSQH7`), `dryRun`. O texto dizia de propósito
"De R$ 399,00 por R$ 149,90" — números que não existem na loja.

| | v14 (baseline) | **v15** |
|---|---|---|
| `data_source` | `message` | **`store`** |
| preço | R$ 149,90 — o do texto | **R$ 151,27 — o da página** |
| "de" | R$ 399,00, desconto de 62% | **null** — a página não mostra "de" |
| título | "Liquidificador Philco 1050W PLQ11A 220V" (do texto) | **"Liquidificador Philco 2,7L 4 Velocidades 1050W PLQ11A 220V"** (da loja) |
| foto | Microlink (og:image) | da própria página |

**O Érico abriu a página no navegador e confirmou R$ 151,27.** É a terceira
testemunha, e é a que fecha: as duas de dentro do buybox concordarem entre si
provaria só que o parser é consistente, não que ele está certo.

**O que o "de" virar `null` significa** — e por que é acerto e não perda: a
página não exibe preço riscado, então não há desconto a afirmar. A v14 teria
publicado 62% de desconto que não existe em lugar nenhum.

**Controle negativo:** ASIN inexistente (`/dp/B0ZZZZZZZZ`) → `sem_imagem`, sem
preço de loja nenhum. O leitor não afirma o que não leu, e o `fotoPlausivel` da
v14 continuou barrando o logo de erro da Amazon.

### Decisão que está no código e não deve ser redecidida

**Quando a leitura da Amazon falha, NÃO cai para a `product-search`.** Ela não
tem o que responder sobre a Amazon; acrescentaria 30 s de espera antes do mesmo
"não". Falha de leitura cai no fallback de texto com `data_source='message'`,
exatamente como caía antes — a v15 melhora o caso bom sem piorar o ruim.

**Preço sem as duas testemunhas recusa a captura inteira**, em vez de devolver o
título da loja com o preço do texto. Não é preciosismo: `data_source` é um campo
só, não existe "título da loja, preço da mensagem". Misturar as duas origens
numa linha só tornaria o campo mentiroso.

---

## P20 — o log passa a dizer QUAL link falhou (01/08 fim de tarde)

Migration `clone_ingest_log_guarda_link`: colunas `link_host` e `link_path`, mais
índice `(clone_source_id, store, created_at desc)`.

**Guarda host e caminho, nunca o texto da mensagem** (conteúdo de terceiro só
mora em `clone_posts.source_text`, e só quando a captura vinga) e **nunca a query
string**, que é onde vive o id do afiliado alheio e não ajuda no diagnóstico.

**Provado em produção, sem `dryRun`** — porque `dryRun` não grava log, e o log era
o alvo. Mensagem com `meli.la/1GQ52Vn`:

| campo | valor gravado |
|---|---|
| `status` | `resolve_falhou` |
| `store` | `mercadolivre` |
| `link_host` | `mercadolivre.com.br` |
| `link_path` | **`/social/thiagorabay`** |

O `/social/<afiliado>` é literalmente a vitrine que explicava 18 recusas sem que
ninguém pudesse apontar qual link era. Agora dá para reproduzir uma recusa.

Estado restaurado depois do teste: linha sintética apagada do log,
`captured_today` da TáNaMão intacto em 9, nenhum `clone_posts` criado.

**Detalhe de implementação que vale registrar:** os campos são pendurados em
`marca` logo depois da `resolve-link`, e não repetidos em cada `resultados.push`.
São oito pontos de saída — o que falha em lista longa é sempre o item que alguém
esqueceu de acrescentar.

---

## Clone Post: o preço publicado nunca foi conferido na loja (01/08, tarde)

**Medição que muda a prioridade do projeto.** Todas as capturas do Clone Post
que já existiram — **14 de 14** — têm `data_source = 'message'`. Nenhuma jamais
teve preço vindo da loja. Todas são Amazon, **todas sem foto**, e **12 foram
aprovadas** e viraram produto no grupo.

Ou seja: **o preço publicado é o que o grupo-fonte digitou na mensagem.** Nunca
foi conferido contra o anúncio. O Érico abriu ~10 anúncios da TáNaMão e a
maioria não bate com o marketplace — e não bate porque o preço nunca veio de lá.

Isso reclassifica a **P21**. Ela estava catalogada como item técnico ("falta
caminho Amazon na `product-search`"). Na verdade: a Amazon é a **única** loja que
já produziu captura, e é exatamente onde não há verificação nenhuma. **O
enriquecimento de loja não é qualidade de dado — é a única proteção contra um
grupo-fonte que erra.** Sem ele, a plataforma republica o erro de terceiro com a
marca do cliente.

**Contraste medido no mesmo dia:** os 4 produtos Amazon que passaram pelo
`product-refresh` têm preço conferido na loja e com centavos — R$ 114,86,
R$ 58,52, R$ 279,90, R$ 379,99. Esses são confiáveis. Os que vieram do clone,
não.

> ✅ **FECHADO NA MESMA TARDE.** A `clone-ingest` v15 usa o leitor abaixo. Ver
> "P21 — a Amazon lida da página" no topo. O texto seguinte fica como o
> diagnóstico que levou até lá.

**A pista que tornou a P21 tratável:** o leitor de Amazon do `product-refresh`
(`consultarAmazon`, duas testemunhas do buybox, 12/12 de acerto medido em 30/07)
**funciona, por fetch direto, sem Scrape.do** — e lê preço, "de" e imagem. A
`clone-ingest` não usa esse caminho: chama a `product-search`, que pendura >90s
na Amazon. **O código que lê a Amazon direito já existe no projeto; a captura só
não o usa.**

---

## "Melhores Ofertas da Internet": clona Shopee, não clona ML (01/08, tarde)

A fonte foi **recriada** em 01/08 10:37 (linha nova; a antiga tinha sido
apagada). O Érico exercitou o campo "testar se esse grupo é clonável" com dois
links do mesmo grupo:

| Link | Veredito |
|---|---|
| Shopee | ✅ clonável |
| Mercado Livre | ❌ *"Não dá pra clonar essa mensagem"* |

**As duas metades importam.** O positivo da Shopee é a **primeira confirmação em
campo** do conserto de 01/08 de madrugada: link real, de grupo-fonte real,
passando pela `resolve-link` v5 e pela `product-search` v24 pelo caminho do app.
E reabilita a fonte: a decisão de 31/07 de que "trocar de grupo-fonte é a ação"
foi tomada num mundo em que a Shopee estava quebrada. Provavelmente as 10
recusas de Shopee do log eram deste grupo.

O negativo do ML confirma a vitrine do afiliado, que o Érico já tinha medido no
navegador em 31/07. **`resolve_falhou` nos links de ML desta fonte é o
comportamento CORRETO, não defeito** — está escrito aqui para ninguém reabrir
investigação sobre um erro já explicado.

**Erro de leitura registrado:** quando o Érico disse só "deu positivo", esta
sessão respondeu "derruba minha previsão". Não derrubava — a previsão era sobre
ML e o teste tinha sido com Shopee. Aceitar um resultado como refutação de algo
que ele não testou é o mesmo erro da P25 e do diagnóstico do `ORDER BY`, agora
em sentido contrário: **otimismo apressado também é conclusão não medida.**

**Decisão sobre filtrar:** NÃO ligar `blocked_keywords` com `meli.la` agora. As
recusas de ML são a única medida de quanto do grupo é ML e quanto é Shopee, e
filtrar apaga essa informação. Rever em uma semana com o número na mão.

---

## Preço do ML saindo menor que o do site — 2 causas (01/08)

**Relato da Patrícia Cella:** quase 90% dos produtos dela de Mercado Livre saíram
no post com preço **menor** que o do site. Verificado: procede, são **duas**
falhas nossas, e as duas empurram para o mesmo lado — post mais barato, nunca
mais caro.

### Causa 1 — o `/ml-product` jogava os centavos fora

`wa-engine/server.js` lia só `.andes-money-amount__fraction` e ignorava
`.andes-money-amount__cents`. **R$ 74,90 virava 74.** Truncamento, sempre para
baixo.

**Medida que fecha:** 90,0% dos produtos `source='mercado_livre'` em `products`
tinham preço redondo (63 de 70). No `radar_offers`, 19%. Na Amazon, 0%. O caminho
do Radar usa `mlMoney()` — que está **no mesmo arquivo, ~400 linhas acima**, e lê
fraction *e* cents. Os ~10% que a Patrícia viu certos são os produtos cujo preço
real termina em `,00`.

Corrigido com `mlMoneyPdp()`, que escopa no elemento `.andes-money-amount` e não
no container. **Isso importa:** escopar no container pareia o `fraction` do preço
com o `cents` da *parcela* — R$ 189,00 com parcela de R$ 18,90 viraria R$ 189,90.
5 casos de mesa passaram, incluindo essa armadilha e o caso do
`.ui-pdp-price__original-value`, que traz a classe de dinheiro **no próprio
elemento** e não num filho.

### Causa 2 — os preços não eram reconferidos

> ⚠️ **CORREÇÃO DA REVISÃO 16.** A revisão anterior afirmou, como fato medido,
> que a falta de `ORDER BY` fazia o PostgREST devolver "as mesmas 12 linhas toda
> rodada" e que isso era "rotação nenhuma". **Está errado.** Quem é conferido
> ganha `price_checked_at` e **sai do filtro** por 24h — a rotação acontece por
> construção. A conclusão foi **inferida** de "69 de 74 nunca conferidos" em vez
> de medida. É o mesmo erro que derrubou a P25: diagnóstico construído sobre um
> sintoma, sem verificar o mecanismo.

**O que está medido:** o cron `product-refresh-daily` **falhou por 23 dias** com
`column "value" does not exist` (consulta errada ao vault), de 26/07 para trás.
Voltou a rodar em 29/07. Depois de voltar, três rodadas conferiram **1 produto**
— o único carimbo de cron em toda a base é `2026-07-30 09:00:08`.

**O que NÃO está medido e fica aberto (P29):** por que essas três rodadas
conferiram 1 só. Com `BATCH = 12` e ~1,7s por produto, deveriam ter conferido
dezenas. Não há hipótese testada.

**Medido em `dryRun` em 01/08** — de 7 produtos conferidos, 2 tinham mudado de
preço, os dois **para cima**:

| Produto | Guardado | Site hoje |
|---|---|---|
| Loção Hidratante Corporal Sem Perfume | R$ 80 | **R$ 89** |
| Gel De Limpeza Facial Effaclar | R$ 80 | **R$ 127** |

R$ 47 de diferença no segundo. Promoção que acabou e ninguém reconferiu.

**O que foi feito na `product-refresh` v17**, e por quê:

1. `.order('price_checked_at', { ascending: true, nullsFirst: true })`. Entra por
   **previsibilidade**, não por consertar fome: sem ordem explícita não dá para
   depurar por que um produto sumiu da fila. Zero custo de crédito.
2. **Os pulos por condição passam a carimbar `price_checked_at`.** Isto não é
   enfeite — sem ele o item 1 **piora** o problema. Produto sempre pulado (plano
   starter, loja sem verificador, link não consultável) fazia `continue` sem
   gravar nada, ficando com `price_checked_at` nulo para sempre; com
   `nullsFirst`, esses produtos ocupariam as primeiras posições de **toda**
   rodada, para sempre. A ordenação sozinha transformaria fome ocasional em fome
   garantida. **Defeito encontrado antes do deploy, não em produção.** O pulo por
   teto de pool e a falha de leitura seguem **sem** carimbo: esses precisam
   voltar na rodada seguinte.
3. `forcarPreco` (desligado por padrão, o cron **não** usa): grava o preço lido
   mesmo dentro da tolerância de 5%. Sem ele o truncamento de centavos ficaria
   gravado para sempre — a diferença é de ~1%, e a tolerância existe justamente
   para ignorar ~1%.

### Ordem de deploy — importa e não pode ser invertida

O `wa-engine` vai **primeiro**. Rodar o refresh antes dele faria a plataforma
reescrever preços ainda truncados, gastando leitura para gravar dado errado de
novo.

### Resultado medido em produção (01/08, manhã)

| | |
|---|---|
| wa-engine no ar lendo centavos | ✅ mesmo produto: gravado `74.00`, lido **74,73** (e "de" `96` → **96,79**) |
| Produtos da Patrícia reconferidos | **63 de 63** |
| Preços corrigidos por mudança real | **37** |
| Preços corrigidos por centavos (`forcarPreco`) | **20** |
| Ainda com preço redondo | **5** — e esses são redondos de verdade na loja (R$ 179,00, R$ 199,00, R$ 251,00, R$ 157,00, R$ 27,00), 8% da base, que é a taxa natural |
| Custo em crédito compartilhado | **0** |

Maiores desvios encontrados: Lavadora Electrolux **R$ 2.149 → R$ 2.398,90**,
Epson **R$ 930 → R$ 1.044,05**, Galaxy Watch 8 **R$ 1.259 → R$ 1.349,10**,
Sérum Capilar **R$ 186 → R$ 251**, Cetaphil **R$ 139 → R$ 175,01**.

### Custo: a Patrícia tem token próprio

`scrape_do_token` **e** `ml_session_cookie` preenchidos. Atualizar os 63 produtos
dela **não consome a cota compartilhada** (o wa-engine tenta o cookie antes do
Scrape.do). O orçamento não é obstáculo neste caso — era só a rotação quebrada.

---

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

**Sessão de 04/08/2026 (tarde, REVISÃO 37) — P45: o teto subiu para 30, o que ele
barra passa a aparecer no card, e o contador do card estava errado 3 horas por dia.**

| | |
|---|---|
| Commits | 1 · as duas cópias do `index.html` + este doc |
| Edge Functions · `wa-engine` · migrations | **nenhuma tocada** |
| Dados | `clone_sources.max_per_day` **10 → 30** nas duas fontes |
| Repo × produção | 🔴 até o Deploy do serviço `app`. **Este push reinicia o `wa-engine`** (P16) |

🔴 **A razão de existir do teto não vale para a fonte que ele está barrando.** O
comentário na linha 24 da `clone-ingest` diz para que ele foi criado: *"cada captura
vira uma product-search; no ML isso é Scrape.do a 10 créditos"*. Medido em 04/08 no
Achadinhos #34: as 10 capturas do dia são **8 Amazon + 2 Shopee, zero Mercado Livre**.
Amazon é `consultarAmazonDireto` (fetch na página, de graça) e Shopee é API de afiliado
com credencial do usuário (de graça). **Nenhuma captura desta fonte consome
Scrape.do.** Consumo de agosto até agora: **80 de 1000 créditos**.

### Os números que decidiram

| medida (04/08, Achadinhos #34) | valor |
|---|---|
| capturas | 10, **todas entre 08:16 e 08:48 BRT** |
| tempo até encher o teto | **32 minutos** |
| recusas por teto, de 08:52 a 10:50 | **31** |
| ritmo do grupo | ~15 mensagens com link por hora |

**E esta fonte é de outra qualidade.** Aproveitamento das mensagens que chegam a ser
avaliadas (`salvo` sobre `salvo+resolve_falhou+duplicado`):

| dia | fonte | avaliadas | aproveitamento |
|---|---|---|---|
| **04/08** | **Achadinhos #34** | 44 | **77%** |
| 02/08 | TáNaMão | 88 | 17% |
| 01/08 | TáNaMão | 68 | 19% |
| 31/07 | TáNaMão | 42 | 21% |

**O teto de 10 foi calibrado num mundo em que ~80% das mensagens morriam na
`resolve-link`.** Numa fonte onde quase tudo vira captura, ele satura antes das 9 da
manhã. O argumento de 03/08 para mantê-lo em 10 — *"o gargalo é quem revisa"* — também
enfraqueceu: `clone_posts` tem **53 approved, 8 rejected, 10 pending**, e os 10 pending
são todos de hoje. A fila estava zerada.

**Decidido pelo Érico em 04/08: subir para 30 E mostrar no card o que o teto barrou.**
Baseline antes do UPDATE, às 13:56:09 UTC: as duas fontes em `max_per_day = 10`,
Achadinhos com `captured_today = 10` em `captured_day = 2026-08-04`.

⚠️ **O `max_per_day` das fontes NOVAS continua nascendo em 10** — é o default da
coluna, não foi tocado. Decisão consciente: mudar o default muda o comportamento de
toda fonte futura de todo usuário, e isso é decisão de produto, não consequência
desta.

### ✅ PROVADO POR COMPORTAMENTO, 7 minutos depois do UPDATE

O UPDATE saiu às **13:56:09 UTC**. Não foi disparado nada à mão: o grupo entrega uma
mensagem a cada ~4 minutos e a `clone-ingest` roda de 5 em 5, então a prova chegou de
graça.

| | antes | depois |
|---|---|---|
| última linha do log | `teto` às 13:53:04 UTC | **`salvo`** às **14:03:26 UTC** · Shopee · *"aguardando revisao"* |
| `captured_today` | 10 | **11** |
| `clone_posts` criados depois do UPDATE | — | **1, `pending`** |

**A captura de número 11 é a prova:** com `max_per_day = 10` ela teria saído `teto`,
que é literalmente o que as 31 anteriores fizeram na mesma fonte, no mesmo dia, com o
mesmo código. O que mudou entre elas foi um número no banco. E a cadeia não parou no
log — virou linha em `clone_posts`, na fila de revisão.

### ⚠️ E a prova trouxe um efeito colateral junto: isto valoriza a P36

Na mesma janela, às 14:01:44 UTC, entrou um **`resolve_falhou` de vitrine do Mercado
Livre** (`link_host = mercadolivre.com.br`, *"leva a VITRINE do afiliado"*). Ele só
chegou à `resolve-link` **porque o teto deixou de barrá-lo antes**.

O teto era, sem que ninguém tivesse decidido isso, o que segurava as **44 recusas/dia
de vitrine de ML** medidas em 03/08 — elas morriam no teto antes de gastar uma
`resolve-link`. Com o teto em 30, elas voltam a gastar. **A `clone-ingest` v17 (P36) é
exatamente o pré-filtro que resolve isso, está codada e validada desde 03/08 e continua
sem deploy.** Ela deixou de ser economia opcional: subir o teto sem ela troca ofertas
barradas por chamadas desperdiçadas. **Deployar a v17 é a próxima ação.**

### 🔎 O número já estava na tela — e por isso ninguém o via

A pendência pedia "mostrar quantas ofertas o teto barrou". Ao abrir o código, ele já
estava lá: o `csVereditoHtml` imprime `CS_ROTULO_STATUS.teto` = *"acima do teto do
dia"* no meio de uma lista de até sete status **ordenada por frequência**. As 31
apareciam como *"31 acima do teto do dia"*, sem dizer que aquilo era oferta que
existia, resolvia e foi descartada por configuração e não por qualidade — e sem
oferecer o que fazer a respeito.

**A entrega mudou de forma por causa disso:** não é contagem nova, é linha própria
(`csTetoBarradoHtml`, só renderiza quando há barrada) mais dois botões `−`/`+` no card
(`csAjustarTeto`, passo de 5) que gravam direto no clique, no mesmo padrão do
`csAlternarLoja`. **Os limites 1 e 50 são os mesmos do formulário de nova fonte**, de
propósito: dois lugares gravando a mesma coluna com tetos diferentes seria a
divergência `mercadolivre`/`mercado_livre` de novo, agora em número.

### 🔴 Achado no caminho: o contador do card mentia 3 horas por dia

O `csRender` calculava `const hoje = new Date().toISOString().slice(0,10)` — **UTC** —
e comparava com `captured_day`, que a `clone-ingest` grava em **America/Sao_Paulo**
(comentário na linha 273 dela). **Entre 21:00 e 00:00 BRT o UTC já virou e o
`captured_day` não:** nessas 3 horas o card mostrava *"0 de 30 hoje"* numa fonte que
estava no teto, e a barra de uso voltava sozinha para zero. Corrigido com `csDiaBR()`,
que usa `en-CA` no fuso de São Paulo (mesmo formato de `captured_day`) e cai num −3h
fixo se o `Intl` falhar — São Paulo não tem horário de verão desde 2019.

Foi achado porque a contagem de barradas precisa da **mesma janela** do contador de
uso: os dois números ficam um debaixo do outro no card, e contar as barradas em 24h
móveis ao lado de *"10 de 30 hoje"* entregaria duas contas que não fecham entre si.

⚠️ **`new Date().toISOString().slice(0,10)` aparece mais 2 vezes no arquivo** — no KPI
de cliques (linha ~2639) e no limite diário do plano Starter (linha ~9313). **As duas
provavelmente têm o mesmo defeito de fuso e NÃO foram tocadas** (escopo estrito). A do
Starter é a que importa: ela decide se um post é bloqueado, então entre 21h e meia-noite
o limite diário do Starter pode estar zerando cedo demais. **Não medido.**

### Validação

- `node --check` nos 4 blocos inline das duas cópias: **ok**, e `md5sum` idêntico
  (`ace3c6c1…`).
- **Smoke test do P15 comparado com o baseline:** os dois arquivos param no mesmo
  ponto, com os mesmos 2 erros de sandbox — o `themeT.onclick` da linha 2496 que o
  próprio P15 documenta como falso positivo. Veredito **"não piorou"**. ⚠️ **E isso
  vale menos do que parece aqui:** a parada em 2496 é **antes** do código novo (~8700),
  então o smoke test não chegou a executar nada do que esta sessão escreveu.
- **18 casos de mesa, 18 passaram** — e as três funções foram **extraídas do
  `frontend/index.html` real** por varredura de chaves, não reescritas no teste: senão
  provariam a minha cópia e não o que vai para o ar. Cobrem a virada do dia em SP nos
  dois sentidos, o clamp nas duas pontas, a linha que não renderiza sem barrada, e o
  erro do banco **não** mexendo no estado local.

🔴 **Nada disso está medido em produção.** É a mesma classe de prova da P37: arquivo
válido não é tela funcionando. Depois do Deploy, ver **P46**.

---

**Sessão de 04/08/2026 (manhã, REVISÃO 36) — P38 FECHADA. A mensagem temporária era
mesmo a causa, e agora está provado com número.**

| | |
|---|---|
| Commits | 1 · só este doc, junto com o push atrasado da REVISÃO 35 |
| Código | nada novo. Esta revisão é medição |

✅ **P38 FECHADA POR COMPORTAMENTO.** O "Grupo de Achadinhos #34" foi de **zero
linhas em 10 h 20** para isto, medido às 13:32 UTC de 04/08:

| Status | Qtd | Detalhe |
|---|---|---|
| `salvo` | **10** | 8 Amazon, 2 Shopee — última 11:48 |
| `teto` | 26 | teto diário da fonte atingido (10/10) |
| `resolve_falhou` | 3 | link sem ASIN, link sem par LOJA/ITEM, e um `linktr.ee` |

39 linhas no total, a última 30 segundos antes da consulta. Isso fecha **duas**
coisas de uma vez: o desembrulho do `ephemeralMessage` funciona, e o cadastro por
**link de convite** entrega fonte que captura de verdade — não só linha bonita no
banco.

🔎 **Achado que a prova trouxe junto: o teto de 10/dia virou o gargalo.** 26 ofertas
foram recusadas hoje só por teto, contra 10 aceitas. O grupo entrega bem mais do que
a fonte deixa passar. Não é defeito — é um número que agora dá para decidir com
base, e não no escuro. Ver **P45**.

⚠️ **Este push corrige um estado ruim: o repo estava atrás da produção.** A
`product-search` v26 foi deployada em 04/08 de madrugada e validada pelo Érico em
produção, mas o push não aconteceu — a sessão acabou antes. Por ~9 horas a produção
teve código que o repositório não tinha. A REVISÃO 35 vai junto neste commit.

---

**Sessão de 04/08/2026 (madrugada, REVISÃO 35) — o Postar Agora só lia Mercado
Livre. Agora lê Amazon também. `product-search` v26 no ar e PROVADA.**

| | |
|---|---|
| Commits | 1 · `supabase/functions/product-search/index.ts` + este doc |
| Edge Functions | **`product-search` deployada — versão 45, ACTIVE, `verify_jwt: true`** |
| wa-engine · frontend · banco | nada tocado |
| Repo × produção | ✅ bate nesta função depois deste push |

🔴 **A causa não era falha: era ausência.** A `product-search` tinha **dois** ramos
de loja — Mercado Livre e Shopee. Amazon, AliExpress, Magalu, Shein, Natura e
Terabyte caíam direto no `"Loja sem integração automática. Preencha manualmente."`.
Nunca houve leitor para elas nesse caminho.

**Como ficou visível nos logs**, tentativas do Érico em 04/08:

| Duração | Leitura |
|---|---|
| **3504 ms** | foi buscar de verdade — Mercado Livre |
| **140–164 ms** | retorno imediato, sem falar com loja nenhuma |

Resposta em 150 ms não dá tempo de consultar loja. O tempo separa os dois casos sem
ambiguidade — e serve de método para a próxima vez.

🔎 **A assimetria que motivou o conserto:** o **Clone Post automático já lia
Amazon**, porque a `clone-ingest` v15 tem leitor próprio de página (P21). Duas
implementações da mesma coisa no mesmo repo, com capacidades diferentes — o Postar
Agora recusava a loja que o Clone Post lia sem dificuldade. É a **quarta** vez que
esse padrão aparece neste documento (assinatura da Shopee, "de" da Shopee, "de" do
ML, e agora esta).

**O que entrou:** `consultarAmazonDireto` e suas dependências (`precoAmazon`,
`tituloAmazon`, `imagemAmazon`, `textoDeHtml`, `numeroDaLoja`) **copiadas verbatim**
da `clone-ingest`. Zero colisão de nome, conferida antes. A duplicação é consciente
e está comentada no código, junto com o aviso **"SE MEXER AQUI, MEXA NOS DOIS
LUGARES"** — ver **P43**.

- Lê a **página pública**, não a PA-API: não depende de ACCESS KEY/SECRET KEY, que o
  Érico não tem (a aprovação da Amazon exige vendas). Ele tem só o ID de Associado,
  que basta para o link de afiliado.
- Mantém as guardas do original: sem `productTitle` nada é afirmado (captcha da
  Amazon volta 200 com ~4 KB), fora de estoque recusa, e preço só sai com as **duas
  testemunhas** concordando — rótulo de acessibilidade e preço visível.
- Versionamento: o cabeçalho dizia v25 e os `console.log` diziam v24. Os dois passam
  a dizer **v26**.

✅ **PROVADO POR COMPORTAMENTO, não por versão.** Antes do deploy: 8/8 casos contra
HTML sintético (título com `&amp;` decodificado, por/de com as duas testemunhas,
recusa quando discordam, recusa sem o div do buybox, foto `_AC_SX679_` normalizada
para `_AC_SL1500_`, captcha barrado). **Depois do deploy, em produção, o Érico
postou um produto da Amazon e um do Mercado Livre — os dois saíram certos.** O ML foi
testado de propósito: era o que já funcionava, e erro de transcrição no deploy o
derrubaria junto.

⚠️ **O primeiro deploy falhou** com `import map path does not exist` — o Supabase
guardava o caminho absoluto da versão anterior e tentava resolvê-lo dentro da nova.
**Não chegou a tocar produção.** Resolvido passando `import_map_path: "deno.json"`
explícito. Vale para qualquer redeploy deste projeto.

🔴 **P38 continua aberta.** Conferido às 04:51 UTC: `clone_ingest_log` segue com
**zero linhas** para o Achadinhos #34. Mas são 01:51 BRT e o engine só voltou às
04:22 — meia hora de monitoramento em horário morto. Cedo demais para concluir
qualquer coisa.

---

**Sessão de 04/08/2026 (madrugada, REVISÃO 34) — mensagem temporária era
descartada em silêncio (é por isso que o Clone Post não pegava nada) + a foto do
post passa a sair padronizada em 1080×1080.**

| | |
|---|---|
| Commits | 1 · `wa-engine/server.js` · `wa-engine/package.json` · este doc |
| Frontend · Edge Functions · banco | nada tocado |
| Dependência nova | **`sharp ^0.33.5`** no `wa-engine` — binário pré-compilado, sem compilar no build |
| Repo × produção | 🔴 até o deploy. **Este push reinicia o `wa-engine`** (P16) |

🔴 **CAUSA RAIZ, provada com antes-e-depois.** Grupo com **mensagens temporárias**
ligadas entrega toda mensagem embrulhada em `ephemeralMessage.message`. O
`textoDaMensagem` lia a camada de fora, não achava texto, devolvia `''`, e o
listener fazia `continue` — **sem gravar linha em lugar nenhum**.

Rodado contra a função que está em produção hoje:

```
TEMPORARIA + texto       -> ""   << descartada em silencio
TEMPORARIA + estendido   -> ""   << descartada em silencio
TEMPORARIA + imagem      -> ""   << descartada em silencio
```

E contra a corrigida: **11/11 casos**, incluindo os três acima, `viewOnceMessageV2`,
`editedMessage` e os três negativos (temporária vazia, figurinha, nulo).

**Como o caso foi fechado, na ordem:**

1. Érico: fonte nova "Grupo de Achadinhos #34" não capturava nada.
2. Banco: fonte gravada certo às 17:36 UTC, `active`, sessão certa, três lojas
   liberadas — e **zero linha** em `clone_ingest_log`, nem captura nem recusa.
3. Engine: uptime 10 h 13 min sem reiniciar, sessão `connected`, heartbeat de 23 s.
4. Logs das Edge Functions: `clone-ingest` chamada de 5 em 5 min, sempre 200 — e
   **nenhuma outra chamada**, ou seja a `CLONE_FILA` nunca teve nada. A mensagem
   morria **dentro do engine**.
5. 🔴 **Hipótese minha, errada, registrada por honestidade:** achei que era a P39 —
   convite de grupo em que a sessão não está. Érico conferiu no celular: o grupo
   **está** na lista de conversas dele. A P39 continua aberta, mas **não foi a
   causa aqui**.
6. Érico: o grupo tem o **símbolo de temporária** na foto. Fecha.

**O que entrou:**

- `conteudoRealDaMensagem()` — desembrulha `ephemeralMessage`, `viewOnceMessage`,
  `viewOnceMessageV2`, `viewOnceMessageV2Extension`, `documentWithCaptionMessage` e
  `editedMessage`, com teto de 5 voltas. Mesma lista do `normalizeMessageContent` do
  Baileys v6, **copiada e não importada de propósito**: o engine é CommonJS, o
  pacote é ESM (`"type": "module"`), e import que não resolve derruba o processo
  inteiro — custo desproporcional ao de oito linhas sem dependência.
- **O descarte deixou de ser mudo.** O `continue` de "sem texto/sem link" agora
  registra `[CLONE] descartada em <jid>: <motivo> (tipo <tipo>)`. Vale só para grupo
  já cadastrado como fonte, então o volume é limitado pelo número de fontes.

**Foto do post — padronizada em 1080×1080 (pedido do Érico na mesma sessão).**

Sintoma relatado: umas fotos saem esticadas na vertical, e não há padrão entre os
posts. Causa, lida no código: **não havia normalização nenhuma**. O `send-post`
passava `product.image_url` cru e o engine fazia `sendMessage(jid, { image: { url },
caption })` — o Baileys baixa e manda exatamente o que a loja devolveu, e cada loja
tem a sua convenção. Nos 46 produtos do Érico: **29 Amazon** (`._AC_SL1500_`,
proporção livre), **16 Shopee** (original do CDN), **1 ML** (variante `-E`).

- `imagemPadronizada(url)` baixa (timeout 12 s, teto de 12 MB), encaixa em
  **1080×1080 com `fit: 'contain'`** — **sem cortar nada** —, achata transparência
  sobre branco e reencoda JPEG 85.
- **Falha nunca impede o envio:** loja fora do ar, formato ilegível ou timeout caem
  no `catch` e mandam a URL original, que é o comportamento de antes. Foto torta é
  melhor que post não enviado.
- Cache em memória por URL (teto 40). O mesmo produto vai para vários grupos; sem
  cache seria um download por grupo.
- Vale para **os dois** caminhos de envio (`/send` e `/send-group`), portanto cobre
  clone, radar e postagem manual de uma vez.
- Medido com 6 imagens sintéticas (600×1800, 1500×500, 800×800, 1500×1125, PNG
  transparente 900×1600, 80×240): **6/6 saíram 1080×1080 JPEG sem alfa**, entre 7 e
  10 KB. `sharp` conferido instalando no mesmo `node:20-slim`: binário pronto,
  libvips 8.15.3, **sem compilação**.
- 🔴 **Não medido:** nenhuma imagem real de loja passou por isso ainda. Ver **P42**.

🔎 **Achado de passagem, não corrigido:** a normalização de `mlstatic` para a
variante `-O` só troca os sufixos `-V`, `-I`, `-B`, `-F` e `-T`. O único produto de
ML do Érico está em **`-E`**, que não está na lista e passa direto. Com a
padronização em 1080 isso deixa de afetar o formato, mas ainda afeta a resolução de
origem.

⚠️ **A "TáNaMão – Promoções #02" tem explicação própria e independente: o admin do
grupo removeu o Érico.** Provável que tenha percebido a clonagem. A fonte foi
apagada. Isso é risco de produto, não defeito de código — ver **P41**.

---

**Sessão de 03/08/2026 (noite, REVISÃO 33) — o `/group-invite-info` está no ar e
provado; dois defeitos meus, achados na primeira tentativa de uso.**

| | |
|---|---|
| Commits | 1 · `wa-engine/server.js` + este doc |
| Deploy anterior | auto-deploy pegou os **dois** serviços; engine bootou às **17:16:26 UTC** (uptime 403 s às 17:23:09) |
| Frontend | não tocado nesta correção |
| Repo × produção | 🔴 até o deploy. **Este push reinicia o `wa-engine`** (P16) |

✅ **O endpoint está publicado — provado por comportamento, não por versão.** Com
`https://linktr.ee/gruposdisponiveis` colado no campo da tela, a resposta foi
exatamente a mensagem de erro **do código novo** (`Isso não parece um link de
convite…`), com `400` e CORS. Código velho não teria essa rota.

🔴 **Defeito 1 — `extrairCodigoConvite` frouxo demais.** A regra do código solto era
`[A-Za-z0-9_-]{6,}`, que casa com **`COLE_AQUI_O_LINK_DO_ACHADINHOS`** — o
placeholder do snippet de teste foi aceito como se fosse convite e despachado pro
WhatsApp. Corrigido: com `chat.whatsapp.com` na frente a intenção está provada e o
código passa como vier; **sem domínio**, exige o formato real (alfanumérico puro,
15–30 caracteres — o do WhatsApp tem 22). 8/8 casos conferidos com `node`, incluindo
os dois que motivaram a correção.

🔴 **Defeito 2 — consulta sem prazo pendurava e quem respondia era o proxy.** O
`makeWASocket` não define `defaultQueryTimeoutMs`, então a chamada herdava o default
do Baileys e o EasyPanel desistia antes: **502 sem cabeçalho CORS**. Corrigido com
`comPrazo(..., 12 s)` só nesta chamada — não mexi na config do socket, que vale para
o engine inteiro.

🔎 **E é assim que dá pra separar as duas coisas: o CORS é middleware global,
registrado na linha 48, antes de todas as rotas.** Toda resposta que sai do express
carrega o cabeçalho — o `400` carregou. Uma resposta **sem** o cabeçalho, portanto,
**não saiu do express**. O navegador só sabe dizer "blocked by CORS policy", que
manda procurar no lugar errado; o cabeçalho ausente é que aponta pro proxy. Virou
aprendizado lá embaixo.

🔴 **A P38 continua aberta.** Nada disso prova que o convite de um grupo real
resolve — o único caminho exercitado até agora foi o de **recusa**.

---

**Sessão de 03/08/2026 (fim de tarde, REVISÃO 32) — o `/groups` mente por omissão.
Cadastro de fonte por link de convite.**

| | |
|---|---|
| Commits | 1 · `wa-engine/server.js` + as duas cópias do `index.html` + este doc |
| Edge Functions | nenhuma tocada |
| Migrations · dados | nenhuma |
| Repo × produção | 🔴 até o deploy. **Este push reinicia o `wa-engine`** (P16) |

🔴 **PROVADO POR COMPORTAMENTO: `groupFetchAllParticipating()` omite grupos que a
sessão está escutando.** Medido no console do painel logado, sessão
`+553198911521`, em 03/08 ~14:30 UTC:

```
total: 19
TaNaMao ...737879 presente? false
Melhores ...941813 presente? true
nomes com # : []
```

O jid `120363426927737879@g.us` (TáNaMão – Promoções #02) é **fonte ativa**: 170
linhas em `clone_ingest_log`, 4 capturas no dia, última mensagem às 13:51 UTC, pela
**mesma sessão** que respondeu essa consulta. Ele entrega mensagem e não aparece no
inventário. Nenhum dos 19 nomes tem `#` — os grupos de rede de promoção, que são
exatamente os que servem de fonte, são os que somem.

**Consequência:** o dropdown de "+ Nova fonte" **nunca foi um inventário confiável**.
Grupo que não está nele era incadastrável pelo painel, por mais que se rolasse a
lista. O gatilho foi o Érico não achar "Achadinhos #100" — e o grupo realmente não
existe em `niche_groups`, `whatsapp_groups` nem `clone_sources` de ninguém.

**O que entrou:**

- `wa-engine`: `GET /group-invite-info?phone=&code=` — resolve JID e nome pelo link
  de convite via `groupGetInviteInfo`. Mesma busca de sessão do `/groups`, **sem
  fallback**, pelo mesmo motivo. Método conferido no pacote publicado
  (`@whiskeysockets/baileys` 6.x, `groups.d.ts` linha 38; `extractGroupMetadata`
  garante `id` com sufixo `@g.us`).
- Frontend: campo "Cole o link de convite" no "+ Nova fonte". Resolve, injeta a
  opção **no próprio `<select>`** marcada `(via convite)` e seleciona — `csSalvar()`
  continua sendo o único caminho de gravação, sem ramo novo.
- Lista vazia ou com erro **deixou de abortar o formulário**: vira aviso no topo do
  card e o cadastro por convite segue disponível. Eram os dois `return` que
  escondiam a única saída que funcionava.

⚠️ **Falha silenciosa conhecida, por limitação do WhatsApp:** o invite info responde
para **qualquer** código válido, inclusive de grupo em que a sessão não está. Não há
como validar participação — a checagem que faria isso é justamente a lista furada. O
aviso está na tela, em negrito. Ver **P39**.

🔴 **Nada disso foi aberto em produção.** `node --check` no `server.js` e nos 4
blocos inline, cópias do HTML idênticas por `md5sum`, `groupGetInviteInfo` conferido
no tarball do npm. Isso prova que o código é válido, **não** que o convite resolve.
Ver **P38**.

---

**Sessão de 03/08/2026 (tarde, REVISÃO 31) — nova aba `Link Rápido` no painel do
afiliado. Só frontend.**

| | |
|---|---|
| Commits | 1 · `index.html` + `frontend/index.html` (as duas cópias, idênticas — `md5sum` conferido) + este doc |
| Edge Functions | **nenhuma tocada.** A aba consome `resolve-link` **v5** e `ml-short-link`, já publicadas |
| Migrations · dados | **nenhuma.** A aba não grava nada em lugar nenhum |
| `clone-ingest` | segue **v17 no repo, v16 em produção** — a P36 não foi tocada nesta sessão |
| Repo × produção | 🔴 **não batem até o Deploy do serviço `app` no EasyPanel** |

- **O que a aba faz:** o usuário cola um link de produto pego em qualquer lugar da
  internet — encurtado ou completo — e recebe o mesmo produto com o **ID de afiliado
  dele**, encurtado, com botão de copiar. Nada é salvo, nada é postado.
- **Nenhuma função de negócio nova.** O fluxo encadeia o que já existia:
  `resolve-link` → `temCredencialLoja` → `prGerarLinkAfil` → `encurtarLinkFinal`.
- **Liberado em todos os planos**, inclusive Starter e trial, por decisão do Érico.
- **Não gasta crédito de Scrape.do:** ao contrário do Clone Post, não chama
  `product-search`. Só resolve o link e encurta.
- 🔴 **NADA DISSO ESTÁ MEDIDO EM PRODUÇÃO.** `node --check` passou nos 4 blocos
  inline e as duas cópias do HTML batem por hash — isso prova que o arquivo é válido,
  **não** que o ID de afiliado sai no link entregue. Ver **P37**.
- 🔴 **O `raw.githubusercontent.com` errou de novo, terceira vez registrada.** A
  primeira leitura desta sessão por lá devolveu a versão de **30/07** (REVISÃO
  inexistente, `clone-ingest` v8, pendências até P12) e por causa dela a primeira
  tentativa de atualizar este arquivo **apagou 515 linhas** — a REVISÃO 30 inteira,
  P29 a P36. Pego no `git diff` antes do commit e revertido com `git checkout`. O
  aviso do topo está certo e o modo de falha é pior do que ele descreve: não é só ler
  velho, é **sobrescrever com o velho**.

---

**Sessão de 03/08/2026 (manhã, REVISÃO 30) — a pauta da REVISÃO 29 tinha data furada;
P36 codada e validada, não deployada.**

| | |
|---|---|
| Commits | 1 · `clone-ingest` v17 + este doc |
| Edge Functions | **nenhum deploy** — `clone-ingest` segue em **v16** em produção |
| Repo × produção | 🔴 **NÃO batem:** repo tem `clone-ingest` v17, produção v16. De propósito, ver P36 |
| Banco | nada alterado. O UPDATE da P33 **não** foi rodado |

- 🔴 **A pauta da REVISÃO 29 afirmava no passado uma coisa que não tinha acontecido.**
  Dizia que o cron das 09:00 UTC de **04/08** "rodou" e que a prova da P34 "já
  aconteceu". Medido em 03/08 às 13:45 UTC: `product_refresh_runs` com **0 linhas**,
  `max(created_at)` nulo. A REVISÃO 29 também se datou como "03/08 à noite" quando o
  commit `0de73f4` é de **03/08 às 10:41 BRT**. Corrigido no topo.
- 🔴 **O `raw.githubusercontent.com` errou de novo, exatamente como o próprio doc
  avisa.** A primeira leitura desta sessão por lá devolveu a versão de **30/07**
  (`clone-ingest` v8, pendências até P12). O `git clone --depth=1` devolveu a
  REVISÃO 29, com hash batendo no `git ls-remote`. O aviso do topo está certo e
  continua necessário.
- 🔵 **P36 codada, validada e NÃO deployada.** Ver a pendência. O deploy dos 72 KB
  ficou para sessão limpa por decisão do Érico — reemitir o arquivo inteiro com o
  contexto já gasto é onde erro de transcrição entra em produção.
- 🔴 **A premissa da P36 estava incompleta e a medição corrigiu:** `loja_filtrada` em
  24h é **0**. O filtro de loja da v16/P31 nunca disparou para o caso que domina.
- ⚠️ **`product-refresh` aparece na versão 19 no `list_edge_functions`**, não 20.
  Atualizada às ~12:23 UTC de 03/08, então houve deploy. Provavelmente o contador do
  Supabase está defasado do número no cabeçalho do código — mas **não conferido**, e a
  leitura de 04/08 depende disso. Ressalva escrita na 1ª tarefa da pauta.
- **Nada além disso foi tocado.** P29, P27, P30, P31, P32, P3, P4, P6, P28 seguem
  fechadas; P2, P5, P7, P16, P35, P19, P9, P10 seguem como estavam.

---

**Sessão da noite de 03/08/2026 (4ª parte) — três decisões, duas derrubadas pela
medição na hora de codar. Nenhuma alteração de código.**

| | |
|---|---|
| Commits | 1 · só este doc · Edge Functions, migrations e dados: nenhum |
| Decidido e codável | **P7** (restringir colunas), **P36** (pré-filtro) |
| Decidido e **derrubado ao medir** | **P2**, **P35** |

- 🔴 **A P16 foi PROVADA com experimento controlado.** Push às `13:34:38Z`, boot do
  `wa-engine` às `13:34:45Z` — **7 segundos**, contra 55 minutos de uptime estável
  antes. Um commit só de documentação derrubou o WhatsApp de produção.
- 🔴 **P2: a saída escolhida reverteria uma decisão deliberada já escrita no código**
  (`wa-engine/server.js` linha 1516 recusa a SERVICE_ROLE_KEY de propósito). Terceira
  saída, no padrão do `wa-heartbeat`: rate limit como Edge Function autenticada por
  `WA_ENGINE_TOKEN`. **Não codada — falta o Érico confirmar.**
- 🔴 **P35: "autorizar por plano" caiu na medição.** Não existe plano sem WhatsApp —
  `starter` tem `wa_groups ≥ 1` e 1 dos 5 starters tem instância. O gate excluiria
  ninguém. Sobram token por usuário ou registrar o risco. **Não decidida.**
- 🔵 **P7 decidida** (restringir colunas sensíveis), com pré-requisito escrito: conferir
  antes quais colunas as telas de admin leem.
- **Nada foi codado nesta parte de propósito.** A sessão já emitiu 42 KB duas vezes; o
  que sobrou é trabalho de sessão limpa, pela regra que a P26 e a P19 deixaram.
- **Pauta da próxima sessão escrita no topo**, com as consultas prontas.

---

**Sessão da tarde de 03/08/2026 (3ª parte) — varredura de pendências. Quatro fechadas,
duas por medição que contradisse o registro. Nenhuma alteração de código.**

| | |
|---|---|
| Commits | 1 · só este doc |
| Edge Functions | nenhuma tocada |
| Migrations | nenhuma · Correção de dados: nenhuma |
| Fechadas | **P3, P6, P28, P4** |
| Abertas | **P36** (pré-filtro de domínio, decidido e não codado) |

- ✅ **P3 fechada com medição no painel logado:** token de 43 chars, `/sessions` **200**,
  card "Sessões ativas" visível e populado, console limpo. Prova que **funciona hoje**;
  não prova que o conserto foi a causa, porque o sintoma nunca foi reproduzido antes.
- 🔎 **Achado de lado:** o painel vive em **dois origins** (`megalinksbr.com.br` e
  `www.megalinksbr.com.br`) e o `localStorage` não é compartilhado — quem loga num e
  cai no outro aparece deslogado, sem erro na tela. Ao medir sessão, usar o `www`.
- ✅ **P6 fechada:** PAT clássico revogado depois de 16 pushes, novo gerado.
- ✅ **P28 fechada por medição, e o registro dela estava ERRADO.** Não há "nenhuma fonte
  ativa": há **duas, as duas `active=true`**, e a "Melhores Ofertas" **não** tinha sido
  apagada da tabela. Em 24h: **17 `clone_posts`, 17 de 17 com `data_source='store'` e
  17 de 17 com foto** — o melhor número já medido nessa cadeia.
- ✅ **P4 fechada, e não era OOM.** É a P16: **todo push para o `main` reinicia o
  `wa-engine`**, inclusive push só de documentação. 4 boots em 35 minutos, 3 casados
  com eventos conhecidos, 53 minutos sem push = sem restart.
- 🔴 **P16 deixou de ser teórica.** Custo por push: `CLONE_FILA` descartada e as 3
  sessões levando `conflict/replaced` 440. Falta conferir no Dashboard se é um build
  compartilhado ou dois auto-deploys.
- 🔵 **P36 aberta:** pré-filtro de domínio antes da `resolve-link`, decidido pelo Érico
  com base em **44 recusas/dia** de vitrine de ML. **Não codado de propósito** — a
  `clone-ingest` tem 67 KB e a sessão já emitiu 42 KB duas vezes.
- **Teto das fontes mantido em 10** por decisão do Érico: o gargalo é quem revisa.

---

**Sessão da tarde de 03/08/2026 (2ª parte) — como P34, P33 e a numeração se resolvem.
Nenhuma alteração de código nem de dados.**

| | |
|---|---|
| Commits | 1 · só este doc |
| Edge Functions | nenhuma tocada |
| Migrations | nenhuma |
| Correção de dados | **nenhuma — adiada de propósito para depois da rodada de 04/08** |
| Frontend | não tocado |

- 🔴 **A P33 estava registrada como mais resolvida do que é.** O doc dizia que os
  órfãos seriam "alcançados pela v19 na próxima leitura". **Não serão:** o ramo que
  zera o desconto está dentro de `if (antes !== res.precoDe)`, e num órfão os dois
  lados já são `null`. A v19 impede órfão novo e não limpa órfão velho.
- **Órfãos medidos, não estimados: 24, não 11** — 15 Shopee (intencional), 5 ML,
  4 Amazon. Os 9 de ML e Amazon precisam de UPDATE à mão, **depois** da rodada de
  04/08, porque ela pode restaurar o "de" de alguns sozinha.
- 🔴 **A `product-search` está com 19 deploys de diferença entre o contador do
  Supabase (44) e a versão do código (v25), e ninguém tinha notado.** Apareceu ao
  montar a tabela de equivalência. Nenhuma decisão passada dependeu disso; a próxima
  podia. Ver "Numeração" no topo.
- **Numeração: decidido registrar o par, não realinhar.** Redeploy no-op faria o
  número bater ao custo de uma segunda transcrição de 42 KB desnecessária, e
  quebraria de novo no próximo código-sem-deploy.
- **Cron conferido:** `product-refresh-daily`, jobid 13, `0 9 * * *`, **ativo**. A
  prova da P34 chega sozinha, e a `product_refresh_runs` é durável — não há mais
  janela de log para perder.
- **Nada foi rodado nem corrigido nesta parte da sessão**, de propósito.

---

**Sessão da tarde de 03/08/2026 — sessão limpa de DEPLOY. Nenhuma linha de código nova.**

| | |
|---|---|
| Commits | 1 · só este doc |
| Edge Functions | `product-refresh` **v20 DEPLOYADA** (contém a v19; um deploy entregou as duas). Contador do Supabase: 18 → **19** — ver o aviso do desencontro de numeração |
| Migrations | nenhuma |
| Correção de dados | nenhuma |
| Frontend | `index.html` e `frontend/index.html` — md5 **idêntico** nas duas cópias (`9695b73f…`), smoke test nas duas: **4 blocos, 1 erro pré-existente** em cada. **Deployado no EasyPanel às 12:13 UTC** e **conferido no código servido** |
| Repo × produção | ✅ **BATEM**, backend e frontend, pela primeira vez desde 02/08 |

- **A fila de deploy que estava represada desde 02/08 saiu.** A v19 nunca tinha
  subido; a v20 a contém, então o deploy de hoje entregou as duas de uma vez.
- **Fonte publicada lida e conferida**, não só o status: cabeçalho `v20`,
  `RESERVA_ANTIGOS = 4`, as duas filas com cota, os contadores novos na resposta e
  no insert da `product_refresh_runs`. Ver "Deploy da v20" no topo.
- ⚠️ **O número de versão do Supabase deixou de bater com o do código.** Deploy 19
  do Supabase = código **v20**. Está escrito no topo para ninguém ler errado depois.
- ⚠️ **P34 e P33 seguem 🟡, não fechadas.** Deployado não é provado. A prova é a
  rodada de 04/08 09:00 UTC: `product_refresh_runs` com linha, `candidatos_antigos
  > 0`, e os 4 da Amazon saindo de `30/07 14:16`.
- **Nenhuma rodada manual foi disparada de propósito** — gastaria leitura de loja
  para antecipar o que o cron mede de graça amanhã.
- **P3 deployada e presente no código SERVIDO**, não só no build: os três consertos
  foram encontrados no `index.html` baixado de `megalinksbr.com.br` — a guarda
  `if(WA_ENGINE_TOKEN)renderInstancias();` no top-level, o
  `fetchWAEngineTokenComRetry`, e o `renderInstCard` dentro da re-renderização
  pós-token. Console **limpo** num load completo. ⚠️ **Mas isso não fecha a P3:**
  a medição foi feita **deslogado** (o navegador não tinha sessão salva), e o card
  "Sessões ativas" mora atrás do login. `WA_ENGINE_TOKEN` estava vazio, como se
  espera antes do login — e é justamente por isso que o 401 não teve como aparecer.
  **O sintoma segue sem reprodução.**
- **Nada além da fila foi tocado.** P29, P2/P5/P7/P16/P35, P19 e P6/P9/P10/P28/P4
  ficaram fora da sessão por decisão do Érico.

---

**Sessão da manhã de 03/08/2026 — medição da rodada do cron. Nenhuma alteração de código.**

| | |
|---|---|
| Commits | 3 · este doc, o `product-refresh` e o `index.html` (as duas cópias) |
| Edge Functions | `product-refresh` **v20** — ⚠️ **codada e testada, AGUARDANDO DEPLOY** (contém a v19, que também nunca subiu). A rodada medida foi a **v18** |
| Migrations | nenhuma |
| Correção de dados | nenhuma |
| Frontend | `index.html` **e** `frontend/index.html` (eram byte a byte idênticos e seguem idênticos) — ⚠️ **AGUARDANDO DEPLOY** |
| Repo × produção | ⚠️ **seguem sem bater** — v19 sem deploy, `product_refresh_runs` vazia |

- **A ressalva da P29 fechou.** Os contadores foram **lidos** do
  `net._http_response` 2h48 depois da rodada, não reconstruídos: 12 candidatos,
  6 leituras reais de loja, 5 pulos, 1 desconhecido, 11,1 s, pool 0.
- **P34 aberta:** os 11 carimbos de hoje são **todos** de produtos criados hoje às
  03:25. Ingestão de 27/dia contra `BATCH = 12` ⇒ produto com carimbo nunca volta
  à fila. 4 Amazon parados desde 30/07 14:16, 19 ainda com carimbo nulo.
- **`net._http_response` vence a janela de log**, se lido no mesmo dia. É o que
  resta enquanto a v19 não sobe — e foi lido com 2h48 de folga.
- **Custo em crédito compartilhado: 0**, lido no campo, não presumido.
- **P34 consertada na v20** na mesma sessão, com a saída que o Érico escolheu:
  reserva de cota (`RESERVA_ANTIGOS = 4`), custo de leitura **igual** ao de hoje.
  Lógica testada em 8 cenários com os números reais do banco antes de qualquer deploy.
- **P3 diagnosticada e consertada**, e **a hipótese da raiz comum com a P2 caiu**:
  o 401 era `Bearer ` vazio no frontend, não credencial. Três defeitos: chamada
  top-level antes do token, retorno `false` que ninguém lia, e `renderInstCard`
  fora da re-renderização. ⚠️ **Sintoma não reproduzido em navegador.**
- **P35 aberta** (achado de lado): qualquer usuário autenticado — inclusive conta
  grátis e modo demonstração — recebe o `WA_ENGINE_TOKEN` da plataforma inteira.
  Não há exposição pública (`verify_jwt: true` medido), mas não há autorização.
- **Smoke test da P15 reconstruído** (não estava commitado, apesar de o doc dizer
  que existia) e rodado antes e depois: 4 blocos, o mesmo 1 erro pré-existente.
  Veredito é **"não piorou"** — não é prova de que funciona.
- **Nada foi deployado.** O conserto está no repo e aguarda o deploy de sessão
  limpa que já era devido pela v19/v20.

---

**Sessão da noite de 02/08/2026 — P29, P27 e a ressalva da P30 fechadas; P33 aberta e consertada.**

| | |
|---|---|
| Commits | 1 · `product-refresh` e este doc |
| Edge Functions | `product-refresh` **v19** — ⚠️ **codada e validada, AGUARDANDO DEPLOY** |
| Migrations | 1 · `product_refresh_runs` (tabela, RLS sem policy, `purgar_product_refresh_runs`) **aplicada** |
| Cron novo | `purgar-product-refresh-runs`, jobid 31, 04:23 |
| Correção de dados | 64 produtos de ML reconferidos: 43 "de" corrigidos, 5 apagados, 1 criado |
| Frontend | **não tocado** |
| Repo × produção | ⚠️ **NÃO batem** enquanto a v19 não for deployada |

- **P29 fechada, e a causa não era a que a pendência sugeria.** 11 carimbos na
  rodada de 02/08, não 1. 8 dos 12 candidatos são inconferíveis por construção e,
  antes da v17, não carimbavam — reenchiam o lote para sempre.
- **O ramo que apaga o "de" foi observado**: 5 apagamentos em 64, contra 43
  leituras normais na mesma varredura. Não é leitura degradada.
- **Correção de registro:** a prova "13 de 13" da revisão 21 foi `dryRun`. A base
  seguia com 64 de 70 "de" truncados até hoje. **Prova em dryRun não é dado
  corrigido** — está nos Aprendizados.
- **P33 aberta e consertada na mesma sessão:** apagar o "de" deixava o
  `discount_pct` órfão. O post sai limpo (`send-post` não usa o campo), o painel
  não.
- **P27 fechada por conjunto vazio**, medido, não por decisão de custo.
- **A tarefa agendada das 07:00 disparou às 19:29.** Não serve para vencer janela
  de log. Substituída pela `product_refresh_runs`.
- **Custo em crédito compartilhado da sessão inteira: 0** — todos os alvos têm
  credencial própria, conferido em `usos_do_pool_compartilhado` a cada chamada.
- ⚠️ **Deploy da v19 não feito de propósito.** São 38 KB reemitidos numa chamada
  só, e este repo já registrou duas vezes (P26, P19) que isso é primeira ação de
  sessão limpa. Fazer assim.

---

**Sessão da noite de 01/08/2026 (3) — P31 conferida em campo e P32 fechada.**

| | |
|---|---|
| Commits | 1 · `product-search` e este doc |
| Edge Functions | `product-search` **v25** |
| Migrations | nenhuma |
| Correção de dados | 3 produtos e 3 capturas de Shopee com `price_original = null` |

- **P31 provada nos dois caminhos da tela.** O Érico recadastrou as duas fontes
  pelo formulário (`["shopee","amazon"]` numa linha nova só pode ter vindo das
  checkboxes) e depois clicou um chip: a "Melhores Ofertas" foi para
  `["shopee","amazon","mercadolivre"]` e a TáNaMão ficou nas duas — a escrita foi
  na fonte certa e só nela.
- **Erro de método registrado:** o primeiro teste do chip que eu pedi foi clicar
  DUAS vezes e voltar ao mesmo estado. O resultado é idêntico ao de "não
  funcionou" — teste que não distingue não testa. Refeito com um clique só.
- **Recadastrar as fontes não perdeu histórico:** a FK é `SET NULL`, não
  `CASCADE`. 21 capturas e 99 linhas de log intactas, e o card continua mostrando
  os números porque o painel agrupa por `source_jid`, não por id da fonte —
  decisão que já estava escrita e se pagou.
- **21 recusas de ML somadas, zero capturas**, contra 17 capturas de Amazon e
  Shopee. Desligar o ML nas duas fontes foi decisão informada pelo dado.

---

**Sessão da noite de 01/08/2026 (2) — P31 entregue; frontend aguardando Deploy.**

| | |
|---|---|
| Commits | 1 · `clone-ingest`, as **duas** cópias do `index.html` e este doc |
| Edge Functions | `clone-ingest` **v16**, provada com baseline e 2 controles |
| Migrations | 1 · `clone_sources_lojas_permitidas` |
| Frontend | **tocado nas duas cópias** (`md5sum` idêntico), **deployado e conferido no navegador** |
| Repo × produção | ✅ **BATEM** |

- **Filtro de loja provado com o controle que importava**: `lojas_permitidas`
  vazio é indistinguível de não ter filtro. Sem esse controle, a migration
  poderia ter mudado o comportamento das duas fontes cadastradas em silêncio.
- **A contagem por loja no card só foi possível porque a P20 saiu antes.** A
  ordem da pauta (P20 antes da P31) não era arbitrária e se pagou.
- **Nada de marcar checkbox a partir do teste de clonabilidade** — sugere e
  explica por que não marca.
- **Frontend deployado 18:20 e conferido no navegador:** funções novas presentes
  no código servido, console limpo, e as peças ANTIGAS (`csRender`, `csSalvar`)
  continuam de pé — é esse controle que descarta o TDZ do `f94e2f0`.
- ⚠️ **Clique real num chip continua não observado.** Ver a ressalva na P31.

---

**Sessão da noite de 01/08/2026 — P30 entregue.**

| | |
|---|---|
| Commits | 1 · `product-refresh` e este doc |
| Edge Functions | `product-refresh` **v18**, provada com baseline |
| Migrations | nenhuma |
| Frontend | **não tocado** |
| Repo × produção | ✅ **BATEM** |

- **`consultarML` devolve `precoDe`.** Baseline da v17 no mesmo produto: o "de"
  não era sequer olhado. v18: `de: 169 -> 169.9 (loja)`.
- **13 de 13 corrigidos**, todos truncamento de centavos. Três não terminam em
  `,90` — é o que separa "leu a loja" de "chutou um `,90`".
- **O ramo que apaga o "de" NÃO foi observado.** Não medido, escrito como não
  medido. Ver a ressalva na seção da P30.
- **Comentário do tipo `Consulta` corrigido:** ele dava o ML como exemplo de loja
  que "nem procura" o `precoDe`. Deixou de ser verdade nesta versão, e comentário
  desatualizado ao lado de uma trava é como a P25 começou.

---

**Sessão do fim da tarde de 01/08/2026 — P21 e P20 entregues e provadas.**

| | |
|---|---|
| Commits | 1 · `clone-ingest` e este doc |
| Edge Functions | `clone-ingest` **v15**, provada com baseline e controle |
| Migrations | 1 · `clone_ingest_log_guarda_link` (`link_host`, `link_path`, índice) |
| Frontend | **não tocado** nesta sessão |
| Repo × produção | ✅ **BATEM** |

**O que foi medido nesta sessão:**

- **Baseline do leitor de Amazon do `product-refresh`, hoje**, antes de portar
  nada: leu a página do Kärcher em 1,9 s e devolveu R$ 360,91 contra os R$ 251,91
  publicados pelo clone. A afirmação "o leitor funciona" não foi herdada de
  30/07, foi remedida.
- **`clone-ingest` v15 provada com baseline (v14, `data_source='message'`,
  R$ 149,90 do texto) e controle (ASIN inexistente → `sem_imagem`).** O valor
  lido, R$ 151,27, foi **conferido pelo Érico no navegador**.
- **P20 provada em produção sem `dryRun`:** `link_host=mercadolivre.com.br`,
  `link_path=/social/thiagorabay` gravados na recusa. Estado restaurado.
- **P30 decidida pelo Érico:** saída **(a)** — repassar o `price_from` e aceitar
  que o "de" seja apagado quando a loja não mostra — **com a trava do
  `undefined`/`null`**, que nenhuma das duas saídas originais tinha. Ver P30.
- **Erro de tipo pré-existente confirmado como pré-existente:** o `tsc` acusa um
  `unknown[]` não atribuível a `string[]` na action `jids`. Está no `main` desde
  antes desta sessão — conferido rodando o mesmo `tsc` contra o arquivo do
  `HEAD`. Não foi introduzido aqui e não foi consertado aqui (escopo estrito).

---

**Sessão da tarde de 01/08/2026 — só medição, nenhuma alteração de código.**

- **14 de 14 capturas do Clone Post são `data_source='message'`** — o preço
  publicado nunca foi conferido na loja. Ver a seção acima. **Reclassifica a P21
  como prioridade 1 do projeto.**
- **"Melhores Ofertas da Internet" recriada e testada nas duas pontas:** Shopee
  clona, ML não. Primeira confirmação em campo do conserto da Shopee.
- **TáNaMão reativada pelo Érico** (fecha a P28). Uma mensagem avaliada até as
  13:11 UTC, link de Amazon sem ASIN. O grupo está devagar.
- **P18 despriorizada** por decisão do Érico: `auto_publish` fica desligado.
- **P31 aberta** (filtro de loja por fonte).
- **Tarefa agendada criada** para 02/08 07:00 medir a rodada do cron da P29
  enquanto os logs ainda existem.
- **Pauta da próxima sessão repriorizada:** P21 → P20 → P31 → P30.

---

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
- **Fontes, medidas em 04/08 à tarde** (o registro anterior era de 01/08 e estava
  errado em todas as linhas):

  | fonte | `active` | `max_per_day` | último dia com captura |
  |---|---|---|---|
  | Grupo de Achadinhos #34 | **true** | **30** | 04/08, 10 capturas |
  | Melhores Ofertas da Internet | false | **30** | 03/08, 9 capturas |

  A **TáNaMão – Promoções #02 não está mais na tabela** — foi apagada em 03/08 depois
  que o admin do grupo removeu o Érico (P41). O Achadinhos #34 foi cadastrado por
  **link de convite** (P38) e é a única fonte capturando hoje.
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

### `/groups` — inventário incompleto por natureza (medido 03/08)

`groupFetchAllParticipating()` **não é** a lista dos grupos da sessão: é um
subconjunto, e os grupos grandes de promoção tendem a ficar de fora. Prova e números
na "Última alteração" da REVISÃO 32.

- **Não usar esse endpoint como verdade sobre participação.** Ausência ali não é
  prova de que a sessão não está no grupo — o contraexemplo está medido.
- O caminho de cadastro que funciona para esses grupos é o **link de convite**
  (`/group-invite-info`).
- Causa raiz **não investigada**. Hipóteses não testadas: subgrupo de comunidade,
  truncamento da resposta do servidor, sincronização parcial de app-state depois do
  restart. A correção entregue contorna, não explica.
- O listener do Clone Post **vê** as mensagens de todos os grupos e descarta os não
  cadastrados em `if (!CLONE_JIDS.has(jid)) continue`. O inventário que falta é
  barato de construir a partir daí — é a **P40**, adiada de propósito.

---

### Link Rápido (aba nova, 03/08 — NÃO MEDIDA EM PRODUÇÃO)

Aba do menu do afiliado, logo abaixo de "Postar Agora" (`data-page="link-rapido"`,
`<section id="page-link-rapido">`). Refaz um link de marketplace de terceiro com o ID
de afiliado do usuário logado.

Fluxo de `lrGerar()`: `resolve-link` v5 (segue redirects, desembrulha `an_redir` e
`?go=`, **tira o afiliado de origem** e devolve `stripped[]`) → `temCredencialLoja` →
`prGerarLinkAfil` com o `CREDS_STATE` do usuário logado → `encurtarLinkFinal`.

- **Verde (`alert g`) só quando as três coisas fecharam:** loja reconhecida,
  credencial presente e link **efetivamente diferente** do original. Sem credencial e
  link que voltou igual saem em **amarelo**, com atalho para Config Afiliados;
  `resolve-link` recusando sai em **vermelho** com o motivo e a `stage` que ela
  devolve. O verde é uma afirmação sobre o link entregue, não sobre a chamada ter
  respondido.
- Botão **📋 Copiar link** troca para `✅ Copiado!` por 1,8 s — mesma razão do carimbo
  de hora do botão atualizar: ação sem confirmação visível é ação que o usuário
  assume que falhou.
- Encurtamento herda `mlEncurtarLink`: Elite/Premium recebem `/r/{code}` com rastreio
  de cliques, Starter/Pro caem no fallback is.gd. A legenda embaixo do link diz qual
  dos dois saiu. Se o encurtador não responder, entrega o link de afiliado direto e
  avisa — não trava.
- **Lojas cobertas** = interseção do `STORE_LABEL` da `resolve-link` com o
  `CREDS_STATE`: Shopee, Mercado Livre, Amazon, AliExpress, Magalu, Shein, Natura,
  TerabyteShop.
- Sem gate de plano, sem tabela nova, sem Edge Function nova, sem consumo de
  Scrape.do.

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
| **P2** | 🔵 **REDESENHADA 03/08 — as duas saídas originais estavam mal postas.** ~~Decidir entre `GRANT EXECUTE` a `anon` ou trocar a credencial do engine para service role.~~ O Érico escolheu service role em 03/08, e ao ir codar apareceu que **isso reverte uma decisão deliberada que já está escrita no código**: `wa-engine/server.js` linha 1516 — *"Não usamos a SERVICE_ROLE_KEY aqui de propósito: ela daria a este container acesso irrestrito ao banco. Autenticamos na Edge Function `wa-heartbeat` com o `WA_ENGINE_TOKEN`"*. Pior ainda depois da P16: esse container é reiniciado por qualquer push. **Terceira saída, que nenhum dos dois tinha listado e que segue o desenho que já existe: o rate limit vira Edge Function**, chamada pelo engine com `WA_ENGINE_TOKEN`, exatamente como o `wa-heartbeat`. Sem `GRANT` para `anon`, sem service role no container. **Falta o Érico confirmar essa saída e alguém codar** | 30/07 |
| ~~P3~~ | ✅ **FECHADA 03/08 à tarde, MEDIDA NO PAINEL LOGADO.** Token de 43 chars preenchido num load limpo, `/sessions` **200** (não 401), card "Sessões ativas" **visível e populado** com a instância do dono, console limpo. ⚠️ **O que isto prova e o que não prova:** prova que **funciona hoje**; não prova que o conserto foi a causa, porque o sintoma nunca foi reproduzido ANTES do patch. Ver "P3 — medida" acima. Registro original abaixo. ~~🟡 DIAGNOSTICADA, CONSERTADA E DEPLOYADA 03/08 — AGUARDANDO REPRODUÇÃO LOGADA — e a hipótese da raiz comum com a P2 está ERRADA.** O engine valida certo (`token !== WA_ENGINE_TOKEN` → 401) e o `get-wa-engine-token` está protegido (`verify_jwt: true`, **medido**). O 401 vem de `Bearer ` **vazio**: o painel declara `WA_ENGINE_TOKEN=""` e (a) a linha top-level `renderAdminVisao();...renderInstancias();...` rodava na carga do script, antes de `enterApp` buscar o token; (b) `fetchWAEngineToken` devolve `false` em três caminhos e **ninguém lia o retorno** — o `.catch` só pega exceção —, então uma falha deixava o token vazio pela sessão inteira, sem retry e sem aviso; (c) a re-renderização pós-token cobria `renderInstancias` mas **não** `renderInstCard`, que é o card "Sessões ativas", exatamente a tela cega. Consertados os três, **deployados em 03/08 às 12:13 UTC e conferidos no código servido** (os três marcadores estão no `index.html` que o nginx entrega; console limpo num load completo, porém **deslogado**). ⚠️ **Sintoma NÃO reproduzido** — o mecanismo está lido no código, mas ninguém carregou a página e leu o console (ver P15). O smoke test dá "não piorou", não "funciona". **Consequência para a P2: ela perde o argumento de "resolve duas de uma vez" e volta a ser decisão isolada de rate limit** | 30/07 |
| ~~P4~~ | ✅ **RESOLVIDA 03/08 — não era OOM nem healthcheck. É o auto-deploy da P16.** O log do EasyPanel de 03/08 mostra **quatro** boots do `wa-engine` em 35 minutos, cada um com hostname de container novo: **12:04**, **12:13:26**, **12:29:32**, **12:39:34**. O de 12:13:26 casa **ao segundo** com o `### Success ###` do build do serviço `app` (o frontend); os de 12:29 e 12:39 casam com os **dois pushes deste chat** para o `main`. Depois das 12:39, **53 minutos sem push e sem restart** — controle negativo. **Deployar o `app` derruba e sobe o `wa-engine` junto**, e como o auto-deploy dispara a cada push, **todo commit — inclusive commit só de documentação — reinicia o WhatsApp em produção.** O `CLONE_FILA` mora em memória e vai junto. Ver "P4/P16" acima. A frase do registro antigo, *"sem deploy"*, era inferência: ninguém tinha cruzado o horário com os pushes | 30/07 |
| **P5** | Enforcement server-side dos limites de plano: canais WhatsApp/Telegram e grupos WhatsApp ainda são só client-side | 03/07 |
| ~~P6~~ | ✅ **FECHADA 03/08 à tarde.** O clássico `ghp_vkOR…` foi **revogado** pelo Érico depois de 16 pushes, e um PAT novo foi gerado. Regra que continua valendo: PAT não fica salvo, é fornecido por sessão, e fine-grained (`github_pat_`) é rejeitado no push | 30/07 |
| **P7** | 🔵 **DECIDIDA 03/08, NÃO CODADA.** RLS de admin em `profiles` permite qualquer admin ler e-mail de todos os usuários. **Saída escolhida pelo Érico: restringir as colunas sensíveis** (view ou policy que exponha ao admin só o que o painel usa). É migration, não mexe em Edge Function. ⚠️ **Pré-requisito antes de escrever a migration: conferir no `index.html` quais colunas as telas de admin leem direto** — o CRM, a lista de usuários e o modal de detalhe. Restringir sem conferir quebra tela de admin. **Risco real hoje é baixo:** o único admin é o Érico; a dívida vence quando existir o segundo | 03/07 |
| **P9** | Créditos OpenAI para destravar o RevOps / IA Insights | — |
| **P10** | Avaliar upgrade do Scrape.do para o plano Hobby quando a receita permitir | 03/07 |
| **P11** | Substituir filtros checkbox por chips clicáveis no filtro de loja dos grupos (UX) | fila de julho |
| **P12** | Remover opções de intervalo abaixo de 10 minutos do select de agendamento | fila de julho |
| ~~P14~~ | ✅ **FECHADA 31/07.** `send-post` v45 e `clone-ingest` v10 deployadas e provadas; frontend no ar. Restou o P15 | 31/07 |
| ~~P13~~ | ✅ **FECHADA 31/07 manhã.** Érico confirmou que foi ele quem religou a "TáNaMão". As duas fontes seguem ativas | 31/07 |

| ~~P17~~ | ✅ **FECHADA 31/07 manhã.** v11 deployada às 10:32 e provada com os dois ramos. Falta ver acontecer com mensagem de grupo de verdade | 31/07 |
| **P18** | ⏸️ **DESPRIORIZADA pelo Érico em 01/08:** ele decidiu manter o `auto_publish` **desligado** por escolha, não por falta de tela — entendeu que captura sem revisão publica título lido do texto, que já saiu como `"10% OFF"` e como URL crua. Construir o botão não muda nada enquanto a decisão for essa. Volta a valer quando o enriquecimento for confiável nas três lojas. Frontend da v11: par de rádio no card da fonte (auto-publicar × revisar antes) nas **duas** cópias do index.html. A coluna existe e o backend a respeita; falta a UI para ligar | 31/07 |
| **P19** | Preview clicável (`externalAdReply`) — coluna `niche_groups.clickable_preview` já criada. Falta: `wa-engine` enviar texto + `contextInfo.externalAdReply` com `sourceUrl` (usar `product.affiliate_url` já encurtado, preserva tracking) e `send-post` passar a flag. **Exige reemitir o send-post inteiro (571 linhas) — fazer em sessão limpa.** Testar num grupo só antes de ligar geral: há bugs reportados de card que não abre e miniatura que some no Android | 31/07 |
| ~~P8~~ | ⚠️ **REABERTA 31/07.** Ver a correção em "Última alteração": o webhook dispara de forma intermitente | 03/07 |
| ~~P22~~ | ✅ **FECHADA 31/07 tarde.** `clone-ingest` v12 deployada às 11:40 e provada com baseline e controle. Ver "Captura 24h" acima | 31/07 |
| **P23** | **Parte (a) ENTREGUE 31/07 tarde** (campo de teste no formulário, commitado, aguardando Deploy). **Parte (b) ABERTA:** alerta no card da fonte depois de N mensagens avaliadas sem nenhuma captura — query em `clone_ingest_log`, dado já existe. A (a) protege quem está cadastrando; a (b) protege quem já cadastrou e não sabe que o grupo mudou de comportamento. **Confirmado em campo 31/07:** Érico abriu o `meli.la/1GQ52Vn` no navegador e parou na vitrine do afiliado, exatamente como a `resolve-link` previa | 31/07 |
| ~~P24~~ | ✅ **FECHADA 31/07 tarde.** O `+ Nova fonte` **funciona** — Érico clicou e o formulário abriu. A hipótese do `S.waNumber` não se confirmou. Nenhuma linha de código foi alterada. Lição: pendência aberta a partir de relato sem reprodução custou uma sessão de suspeita sobre código sadio | 31/07 |
| ~~P20~~ | ✅ **FECHADA 01/08 fim de tarde.** Colunas `link_host`/`link_path` criadas e a v15 as grava. Provado em produção com `meli.la` → `/social/thiagorabay`. Registro original abaixo. ~~`clone_ingest_log` não guarda a URL que falhou.~~ Nas 24 recusas de `resolve_falhou` de hoje dá para contar mas não para saber *quais* links, nem reproduzir. Guardar host+path do link escolhido (não o texto da mensagem — conteúdo de terceiro) nas recusas de resolve | 31/07 manhã |
| ~~P21~~ | ✅ **FECHADA 01/08 fim de tarde.** `clone-ingest` **v15**: a Amazon é lida da página pelo leitor portado do `product-refresh`. Baseline, controle e conferência no navegador — R$ 151,27, `data_source='store'`. Ver a seção no topo. Registro original abaixo. ~~**Causa medida em 31/07: a `product-search` PENDURA para a Amazon**~~ — mais de 90s sem responder, testado no navegador logado; o `chamarFuncao` aborta em 30s e a loja sempre "falha". Não é só "falta caminho Amazon": há um travamento. A v14 contornou o sintoma da foto (og:image via Microlink), **mas título e preço da Amazon continuam vindo do texto da mensagem** (`data_source='message'`), então a auto-publicação segue alcançando só o Mercado Livre. Decidir: (a) achar o travamento da `product-search`, (b) usar o título/preço do Microlink — ele devolve o título real, medido —, ou (c) a UI avisar que auto-publicar só vale para ML | 31/07 |
| ~~P25~~ | ✅ **FECHADA 01/08 — e a conclusão anterior estava ERRADA.** O link avulso devolve *"Vestido Corset Feminino Longo…"*, R$ 200, com foto, pela `product-search` v24. Não era "não" da Shopee: era a assinatura HMAC. O registro abaixo ficou como exemplo de diagnóstico tirado de mensagem de erro não verificada. ~~**MEDIDO 31/07 à noite, com o link real do Érico.**~~ `resolve-link` **funciona** (270 ms, limpa para `/product/1397105725/58213461759`); quem recusa é a `product-search` com *"Produto não encontrado"* em 1,1 s — a API de afiliado da Shopee só conhece item do **catálogo de ofertas** dela, e produto avulso não está lá. **É um "não" da Shopee, não falha nossa.** O Microlink **não** cobre este caso: devolveu título `"58213461759"` (só o ID) e imagem nula, porque a Shopee monta a página por JavaScript. Restam: (a) Scrape.do na página (queima crédito, decisão de orçamento), (b) preencher à mão, (c) **mínimo valioso e barato: a tela avisar em português** que a Shopee não reconhece o produto, em vez de só gerar o link em silêncio | 31/07 |
| ~~P26~~ | ✅ **FECHADA 01/08.** `resolve-link` v5 deployada e provada com baseline (v4 recusando) e controle negativo (`/collections/…` segue recusado). Registro original abaixo. 🔴 **A `resolve-link` não reconhecia o formato de URL de produto que o próprio Radar da plataforma gera.** MEDIDO 31/07 à noite: `https://s.shopee.com.br/4AykYR6yxu` (link de oferta do Radar) redireciona para `https://shopee.com.br/**opaanlp**/1006215031/24442629738` — mesma estrutura de `/product/LOJA/ITEM`, **primeiro segmento variável**. A `resolve-link` só casa `/product/LOJA/ITEM` e `-i.LOJA.ITEM`, então recusa com *"não tem o código -i.LOJA.ITEM"* uma página de produto legítima, com loja e item visíveis na própria URL. **Conserto é uma regra a mais no reconhecimento de URL — pequeno em tamanho, grande em efeito.** Duplamente relevante: (1) reabre as 10 recusas de Shopee do log, cujo diagnóstico anterior estava errado; (2) esse produto **está** no catálogo de ofertas, então, resolvido o formato, a `product-search` deve responder com nome, preço e foto — diferente do caso da P25. **Exige reemitir a `resolve-link` inteira num deploy só: fazer em sessão limpa, primeira ação.** | 31/07 |
| ~~P27~~ | ✅ **FECHADA 02/08 por conjunto vazio.** Não havia o que reprocessar: **0** recusas de Shopee no `clone_ingest_log` antes de 01/08 (as 56 antigas têm `store` nulo — a coluna só passou a ser preenchida em 01/08) e **0** `clone_posts` antigos com `clean_url` de Shopee. As "10 recusas de Shopee" eram inferência, nunca medição. Ver "P27" acima | 01/08 |
| ~~P28~~ | ✅ **FECHADA 03/08 por medição — e o registro dela estava ERRADO.** `clone_sources` tem **duas** linhas, as **duas `active = true`**, as duas capturando hoje: TáNaMão (`…737879`) e **"Melhores Ofertas da Internet" (`…941813`), que NÃO foi apagada da tabela**. Em 24h: **17 `clone_posts`, 17 de 17 com `data_source='store'` e 17 de 17 com foto.** A pendência pedia "observar uma captura de Shopee real chegar com `data_source='store'`" — chegaram 9. Ver "P28 — a captura está viva" acima | 01/08 |
| ~~P31~~ | ✅ **FECHADA 01/08 noite.** Deployada e conferida no navegador: funções novas presentes no código servido, console limpo, três estados do card exercitados. Falta só ver um clique real gravar. Registro abaixo. ~~🟡 **BACKEND FECHADO, FRONTEND AGUARDANDO DEPLOY.**~~ `clone-ingest` **v16** + coluna `lojas_permitidas`, provado com baseline e 2 controles. A tela (chips no card, checkboxes no formulário, contagem por loja de 7 dias) está **no ar e conferida**. Registro original abaixo. ~~**Filtro de loja por fonte** (ideia do Érico, 01/08).~~ Fonte que presta para uma loja e não para outra — medido na "Melhores Ofertas": Shopee clona, ML não. Desenho: coluna nova `lojas_permitidas text[]` em `clone_sources` (vazio = todas, não altera fontes existentes); filtro **depois** da `resolve-link` e **antes** da `product-search`, que é onde o Scrape.do custa; checkboxes nas **duas** cópias do `index.html`. Um filtro anterior, por domínio do link cru (`meli.la`, `s.shopee.com.br`, `amzn.to`), economiza até a chamada da `resolve-link`, mas não cobre encurtador genérico. **NÃO marcar checkbox automaticamente a partir do teste de clonabilidade:** um teste valida uma loja só; no máximo sugerir. ~~Depende da P20~~ — **a P20 saiu em 01/08**, então o card já pode mostrar "12 Shopee capturadas, 30 ML recusadas" e o filtro vira clique informado em vez de palpite no cadastro. **É a primeira ação da próxima sessão** | 01/08 |
| ~~P29~~ | ✅ **FECHADA 02/08.** Não era bug de lote: **8 dos 12 candidatos são inconferíveis por construção** (Shopee sem verificador, ML de plano starter sem monitoramento) e, antes da v17, não carimbavam `price_checked_at` — reenchiam o lote em toda rodada, deixando 1 único conferido. A rodada de 02/08 carimbou **11 linhas**. Ver "P29" acima. ⚠️ Os contadores do corpo **não foram lidos** (a janela já tinha fechado); a reconstrução é do `products` + do código, e a `product_refresh_runs` da v19 existe para isso não repetir. ✅ **Ressalva fechada em 03/08:** os contadores **foram lidos** do `net._http_response` 2h48 depois da rodada — `candidatos` 12, `conferidos` 4, `preco_mudou` 2, `pulados` 5, `desconhecidos` 1, `duracao_ms` 11115, pool 0 — e confirmam a explicação. Ver "Rodada de 03/08" acima | 01/08 |
| ~~P30~~ | ✅ **FECHADA 01/08 noite.** `product-refresh` **v18**: `consultarML` devolve `precoDe`, saída (a) com a trava `undefined`/`null`. 13 de 13 corrigidos (169 → 169,90). ⚠️ **O ramo que APAGA não foi observado — não medido.** Ver a ressalva na seção da P30. Registro original abaixo. ~~🔜 **PRÓXIMA SESSÃO, PRIMEIRA AÇÃO** (combinado com o Érico em 01/08).~~ **`price_original` ("de") continua truncado nos produtos de Mercado Livre.** O `consultarML` não devolve `precoDe`, então a reconciliação da v16 nunca roda para o ML e o "de" mantém o valor inteiro antigo (96 em vez de 96,79). O wa-engine **já devolve** `price_from` com centavos — é só repassar. **Decisão pendente e não trivial:** repassar significa que, quando a loja não mostrar "de", o `precoDe` vira `null` e a v16 **apaga** o "de" existente. Isso remove o desconto de posts que hoje exibem um. Efeito atual do bug é conservador (desconto aparece menor do que é), então não é urgente — mas é o próximo item combinado. **As duas saídas, para decidir antes de codar:** (a) repassar direto e aceitar que o "de" seja apagado quando a loja não mostrar, que é o que a v16 escolheu de propósito para não publicar desconto que não existe; (b) repassar só quando a loja mostrar "de" e nunca apagar, que preserva o desconto atual mas reabre a porta para o "de" de terceiro que o caso La Roche fechou. **DECIDIDO PELO ÉRICO EM 01/08: saída (a), com uma trava que nenhuma das duas tinha.** O que fazia a (b) parecer necessária era o risco de apagar um "de" bom por causa de uma leitura que falhou — e isso não é escolher entre (a) e (b), é distinguir dois casos que a P30 tratava como um só. O `product-refresh` já faz essa distinção e ela está escrita no tipo `Consulta`: **`undefined` = não olhei; `null` = olhei e a loja não mostra.** Só o segundo pode apagar. Patch: `consultarML` devolve `precoDe: null` quando a leitura deu certo e não havia "de", e `undefined` quando a leitura falhou; a reconciliação da v16 só apaga no primeiro caso. **Falta codar** | 01/08 |
| **P15** | **Parcialmente endereçada 31/07 tarde.** Existe agora um smoke test executável: extrair os blocos `<script>`, rodar os quatro **no mesmo contexto** `vm` do Node com um DOM falso permissivo, e comparar contra o baseline **antes** do patch. Foi rodado neste push e pegaria o TDZ do `f94e2f0`. **Duas limitações medidas:** (1) dá falso positivo em `id` de elemento usado como global — `themeT.onclick` na linha 2496 acusa `ReferenceError` no sandbox e funciona no browser; por isso a comparação com o baseline é obrigatória, o veredito é "piorou?", não "tem erro?"; (2) não executa handler nenhum, só o top-level. **Continua aberta:** carregar a página num navegador de verdade e ler o console segue sendo a única prova real | 31/07 |
| **P33** | 🟡 **DEPLOYADA EM 03/08 (dentro da v20), AGUARDANDO PROVA.** Apagar o "de" deixava o `discount_pct` de pé — 5 produtos com porcentagem órfã em 02/08. O `send-post` **não** usa o campo (o post sai limpo); a lista de produtos do painel usa (linha 5799) e o formulário regrava (linha 8271). v19 zera junto, só no ML e na Amazon, onde o desconto é derivado do "de" — a Shopee fica de fora por construção (decisão da P32). 🔴 **CORREÇÃO 03/08: a v19 NÃO alcança os órfãos que já existem** — a guarda `antes !== res.precoDe` compara `null` com `null` e pula o bloco. Ela impede órfão novo, só isso. **Medidos hoje: 24 órfãos** — 15 Shopee (intencional), 5 ML e 4 Amazon. Os 9 de ML e Amazon exigem UPDATE à mão, **combinado para depois da rodada de 04/08**, que pode restaurar o "de" de alguns sozinha | 02/08 |
| **P34** | 🟡 **DEPLOYADA EM 03/08, AGUARDANDO PROVA.** ~~A rodada diária só alcança produto recém-criado.~~ Medido em 03/08: os 11 carimbos da rodada foram **todos** de produtos criados no mesmo dia às 03:25. 27 produtos criados em 24h contra `BATCH = 12`; 19 ainda com `price_checked_at` nulo; **4 Amazon parados desde 30/07 14:16** (La Roche, Kit Rapunzel, Kärcher, Calvin Klein). `nullsFirst` + ingestão maior que o lote = produto que já tem carimbo nunca volta à fila. **Não é bug do `nullsFirst`** — é o lote ser menor que a entrada diária. Saídas não decididas: subir o `BATCH`, rodar o cron mais de uma vez por dia, ou reservar parte do lote para os carimbados mais antigos. **Consertada em 03/08.** Saída escolhida: **reserva de cota** (`RESERVA_ANTIGOS = 4`, piso e não teto), a única sem aumento de consumo de leitura — `BATCH` segue 12. Duas filas (`novos` por `created_at`, `antigos` por `price_checked_at`) no lugar da ordenação global com `nullsFirst`. Contadores `candidatos_novos`/`candidatos_antigos` entram na resposta e no `resumo` jsonb, sem migration. Lógica testada em 8 cenários com os números reais do banco. ⚠️ **A v20 contém a v19**: o deploy de 03/08 à tarde entregou as duas. **Deployado não é provado** — a prova é a rodada de 04/08 09:00 UTC, com `candidatos_antigos > 0` e os 4 da Amazon saindo de `30/07 14:16`. Enquanto isso não for lido, esta pendência fica 🟡 | 03/08 |
| **P35** | 🟠 **Qualquer usuário autenticado obtém o `WA_ENGINE_TOKEN` da plataforma inteira.** Achado de lado ao investigar a P3, em 03/08. O `get-wa-engine-token` **não checa nada em código** (1391 bytes, devolve o token e a URL); a proteção mora só em `verify_jwt: true`, que está **medido** como ligado — não há exposição pública, mas basta uma conta cadastrada para receber a credencial que controla o `wa-engine` de **todos**. 🔴 **CORREÇÃO 03/08: "autorizar por plano" foi decidido e depois DERRUBADO pela medição.** Não existe plano sem WhatsApp: `starter` tem `wa_groups ≥ 1` e **1 dos 5 starters tem instância conectada**. Um gate por plano excluiria ninguém — toda conta cadastrada continuaria recebendo o token mestre. **Sobram duas saídas de verdade:** (a) **token por usuário no engine**, escopando `/sessions`, `/disconnect` e `/send` ao dono — resolve a raiz, mexe no `wa-engine` inteiro e em todo chamador; (b) **registrar o risco** com a ressalva de que um deploy com `verify_jwt: false` abre tudo, sem nada no código para segurar. **Não decidida** | 03/08 |
| **P36** | 🟡 **CODADA E VALIDADA EM 03/08 (REVISÃO 30) — NÃO DEPLOYADA.** ~~Pré-filtro de domínio antes da `resolve-link`, decidido e não codado.~~ `clone-ingest` **v17** no repo, produção em **v16**. Mapa `DOMINIOS_LOJA` (host → loja, casando por sufixo, cobrindo `meli.la`, `s.shopee.com.br`, `amzlink.to`, `link.amazon`, `shp.ee`, `a.co`) + `lojaDoDominio()` + `linksDoTexto()`. **Regra conservadora:** só recusa quando **todos** os links do texto têm domínio reconhecido **e** nenhum está em `lojas_permitidas`; um único link desconhecido faz a mensagem seguir para a `resolve-link` como na v16. Array vazio = todas, então fonte sem filtro não muda. As duas recusas ficam separáveis no log pelos prefixos **`[pre-filtro]`** e **`[pos-filtro]`** — é isso que vai medir se o pré-filtro pega 44/dia ou zero. Validação de 03/08: `esbuild` parse limpo do arquivo inteiro, `node --check` no bundle, `const permitidas` declarada 1 vez só, **12/12 cenários** conforme o esperado. 🔴 **Premissa corrigida na medição:** as 44/dia são `resolve_falhou`, não `loja_filtrada` — `loja_filtrada` em 24h é **0**, o filtro da v16 nunca disparou para este caso. **Baseline gravada 03/08 13:53:12 UTC:** `resolve_falhou`+`mercadolivre.com.br` = **44**, `loja_filtrada` = **0**, `salvo` = 17, total = 100. **Falta só o deploy e a prova por comportamento** | 03/08 |
| **P16** | 🔴 **DEIXOU DE SER TEÓRICA EM 03/08 — ela é a causa da P4.** ~~O auto-deploy torna inexecutável qualquer instrução do tipo "deploye A antes de rebuildar B".~~ Medido: **todo push para o `main` reinicia o `wa-engine` em produção**, inclusive push só de documentação. 4 boots em 35 minutos em 03/08, 3 deles casados com eventos conhecidos, e 53 minutos sem push = sem restart. **Custo por push:** a `CLONE_FILA` (memória) é descartada, as 3 sessões levam `conflict/replaced` 440 do WhatsApp e o container antigo e o novo disputam a sessão por alguns segundos. O engine trata certo (`Não reconectar`), então não há laço — mas há janela. Decidir: gate técnico ou **desligar o auto-deploy do serviço `app`** | 31/07 |

| ~~P32~~ | ✅ **FECHADA 01/08 noite.** A Shopee devolvia `price_from = node.price`, que é o preço ATUAL e não o anterior; 3 de 3 capturas reais saíram com "de" == "por" e desconto de 53%/42%/35%, já no rodízio do grupo. `product-search` **v25** para de enviar `price_from` para a Shopee. Os 3 produtos foram limpos. O Radar, que tem leitura própria, **não** tinha o defeito — terceira vez que duas implementações da mesma coisa divergem neste repo | 01/08 |
| **P37** | 🔴 **Provar o `Link Rápido` por comportamento.** A aba foi codada e validada só no arquivo (`node --check` nos 4 blocos inline, `md5sum` idêntico entre as duas cópias). **Não foi aberta em produção nem uma vez.** Medir, depois do Deploy, com um link real de cada caminho: **Shopee encurtada** (`s.shopee.com.br/…`), **ML `/sec/`**, **Amazon `amzn.to`** e **um link completo, sem encurtador**. Em cada um, conferir na tela: (1) o alerta ficou verde, (2) o link entregue contém o ID de afiliado da conta logada — abrir o link e olhar a URL final, não confiar no que a tela escreveu. Testar também o caminho amarelo: loja **sem** credencial cadastrada tem que recusar o verde | 03/08 |
| ~~P38~~ | ✅ **FECHADA 04/08 por comportamento.** ~~Provar o cadastro por link de convite.~~ Medido às 13:32 UTC: **39 linhas** em `clone_ingest_log` para `120363042232139638@g.us`, sendo **10 `salvo`** (8 Amazon, 2 Shopee), 26 `teto` e 3 `resolve_falhou`. Última linha 30 s antes da consulta. Fecha o convite **e** o desembrulho da mensagem temporária no mesmo experimento: a fonte foi cadastrada por link de convite e a captura só passou a existir depois do conserto do `ephemeralMessage`. Antes: zero linhas em 10 h 20 | 03/08 |
| ~~P45~~ | ✅ **RESOLVIDA 04/08 à tarde, e a premissa dela caiu na medição.** ~~O teto de 10/dia virou o gargalo.~~ **O teto foi criado para conter Scrape.do no ML; as capturas desta fonte são 8 Amazon + 2 Shopee, zero ML — custo de crédito ZERO.** Teto encheu em **32 minutos** (08:16→08:48 BRT), 31 recusas nas 2h seguintes, ritmo de ~15 mensagens/hora, aproveitamento de **77%** contra 17–21% das fontes antigas. Fila de revisão não era gargalo: 53 approved, 8 rejected, 10 pending todos de hoje. **Feito:** `max_per_day` 10 → **30** nas duas fontes (baseline registrado), linha própria no card com o que o teto barrou (`csTetoBarradoHtml`) e botões `−`/`+` para ajustar (`csAjustarTeto`, clamp 1–50, o mesmo do formulário). ⚠️ **O default da coluna continua 10** — fonte nova nasce em 10 de propósito, mudar isso é decisão de produto. ✅ **Provado por comportamento 7 min depois do UPDATE:** a captura nº 11 saiu `salvo` (com teto 10 teria saído `teto`, como as 31 anteriores), `captured_today` 10 → 11, `clone_posts` novo `pending`. ⚠️ **Efeito colateral medido:** o teto era o que segurava as 44 recusas/dia de vitrine de ML antes da `resolve-link` — com o teto em 30 elas voltam a gastar chamada, o que **torna o deploy da P36 (v17) necessário e não mais opcional**. **A prova de tela é a P46** | 04/08 |
| **P46** | 🔴 **Provar no navegador o card do teto — nada disto foi aberto em produção.** Depois do Deploy do `app`, na sessão logada: (1) a linha laranja **⛔ N oferta(s) ficaram de fora hoje** aparece no card do Achadinhos #34 e o N bate com `select count(*) from clone_ingest_log where status='teto'` **do dia em São Paulo**; (2) um clique real no **+** grava `max_per_day` no banco — conferir a linha, não a tela, que é a ressalva que a P31 deixou aberta por duas sessões; (3) o **−** em 1 e o **+** em 50 recusam com toast; (4) fonte **sem** barrada não mostra a linha (a "Melhores Ofertas" serve de controle negativo); (5) console limpo num load completo, e `csRender`/`csSalvar` continuam `function` — é esse controle que descarta TDZ. ⚠️ **O smoke test NÃO cobre este código:** ele para no falso positivo da linha 2496, e o código novo está na ~8700 | 04/08 |
| **P47** | 🟡 **O mesmo defeito de fuso do card pode estar no limite diário do Starter.** `new Date().toISOString().slice(0,10)` aparece mais 2 vezes no `index.html`: KPI de cliques (~2639) e **limite de 5 posts/dia do plano Starter (~9313)**. O do card foi corrigido nesta sessão (`csDiaBR`); os outros dois **não foram tocados** por escopo estrito. O do Starter decide se um post é bloqueado — entre 21h e meia-noite BRT o contador dele pode virar cedo demais e liberar 5 posts a mais, ou barrar cedo. **Lido no código, NÃO medido** | 04/08 |
| **P39** | 🟡 **Fonte cadastrada em grupo onde a sessão não está falha calada.** O invite info responde para qualquer código válido, então dá pra cadastrar fonte de grupo alheio e ela nunca captura — sem erro em lugar nenhum. Hoje o único aviso é texto na tela. Sinalizar no card da fonte quando ela passar N dias com **zero** linha em `clone_ingest_log`: é o mesmo defeito de fundo de "mecanismo que parece existir e não executa nada" | 03/08 |
| **P40** | 🔵 **Inventário de grupos ouvidos no `wa-engine`** — registrar `jid → {nome, visto_em}` de todo grupo de onde chega mensagem e somar essa lista à do Baileys no dropdown. **Adiado de propósito:** o registro teria que acontecer **antes** do filtro `CLONE_DONOS`, no caminho quente de toda mensagem de toda sessão, incluindo a admin `…73545214` — e errar o filtro por `phone` no endpoint vaza nome de grupo entre contas, que é exatamente o bug que o comentário "SEM FALLBACK, de proposito" do `/groups` documenta ter acontecido. Também exige `groupMetadata(jid)` por JID novo, o que vira rajada de consultas ao WhatsApp depois de cada restart. Sessão limpa, com cache e throttle | 03/08 |
| **P41** | 🟡 **Ser removido do grupo-fonte é o risco operacional do Clone Post, e hoje ninguém percebe.** O admin da "TáNaMão – Promoções #02" removeu o Érico do grupo em 03/08 — provavelmente por notar a clonagem. Do lado do painel isso é indistinguível de grupo parado: a fonte segue `active`, sem erro, sem aviso. Junta-se à **P39** (fonte em grupo onde a sessão não está): as duas terminam na mesma tela e pedem o mesmo remédio — **sinalizar no card a fonte que passou N dias sem nenhuma linha em `clone_ingest_log`**. Vale considerar também espaçar/limitar a clonagem por fonte, porque republicar rápido demais é o que denuncia | 04/08 |
| **P42** | 🔴 **Provar a padronização da foto com imagem real.** O teste de 04/08 usou 6 imagens sintéticas geradas pelo próprio `sharp` — prova que o pipeline redimensiona, **não** que a foto de um anúncio real chega bonita no grupo. Depois do deploy: postar uma oferta de cada loja (Amazon `._AC_SL1500_`, Shopee, ML) e **olhar no WhatsApp**. Conferir também o log `[IMG] nao consegui padronizar` — se aparecer com frequência, alguma CDN está recusando o download do engine e os posts estão caindo no caminho antigo sem ninguém notar | 04/08 |
| **P43** | 🟡 **O leitor de Amazon existe em DOIS arquivos.** `consultarAmazonDireto` e as cinco funções de que depende estão duplicadas na `clone-ingest` e na `product-search`. Foi decisão consciente em 04/08: extrair para módulo compartilhado exigiria reemitir os 72 KB da `clone-ingest`, que é a operação que a P36 adiou justamente por risco de transcrição. **Enquanto durar, mudança em uma tem que ser repetida na outra** — o aviso está escrito nos dois lugares. Unificar em sessão limpa, com as duas funções abertas lado a lado, e provar depois em ambos os caminhos (Postar Agora e captura automática) | 04/08 |
| **P44** | 🔵 **Postar Agora ainda não lê AliExpress, Magalu, Shein, Natura e TerabyteShop.** Continuam no "preencha manualmente" — e a mensagem não diz ao usuário QUAL loja não tem leitura nem por quê. Duas frentes possíveis: leitor genérico por `og:title`/`og:image` (traz título e foto; preço em og:tag quase nunca é confiável) ou melhorar só o texto da recusa. Nenhuma decidida | 04/08 |

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
- **E o degrau seguinte: dado que chega à tela dentro de uma lista de sete não
  existe também.** A P45 pediu "mostrar quantas ofertas o teto barrou" e o número já
  estava na tela — como *"31 acima do teto do dia"*, quinto item de uma lista ordenada
  por frequência, ao lado de "3 link não resolveu" e "6 repetidas". Estava correto e
  era invisível: nada ali dizia que aquele item era o único que representava oferta boa
  perdida por configuração, nem oferecia o que fazer. **Antes de construir a contagem
  que alguém pediu, procurar se ela já está na tela sem hierarquia** — o trabalho pode
  ser de destaque e ação, não de cálculo.
- **Contador de período só é comparável a outro contador do MESMO período.** O card
  mostra "10 de 30 hoje" (dia em São Paulo, vindo da `clone-ingest`) e ia mostrar as
  barradas do veredito (24h móveis, vindo da tela). Os dois números ficam um debaixo do
  outro e o dono os lê como uma conta só. Foi ao alinhar as janelas que apareceu o
  defeito real: a tela calculava "hoje" em **UTC** e comparava com um `captured_day`
  gravado em **São Paulo** — 3 horas por dia, das 21h à meia-noite, o card zerava o uso
  de uma fonte que estava no teto. **Quando dois números aparecem juntos, a janela dos
  dois faz parte do recurso.**
- **Prova de fuso precisa de caso na virada, não no meio do dia.** Testar `csDiaBR` ao
  meio-dia passa nos dois códigos, o certo e o errado. O que separa é 01:00 UTC — que é
  22h do dia anterior em São Paulo. **Todo teste de data tem que incluir a hora em que
  os dois fusos discordam**, senão ele confirma o bug em vez de pegá-lo.

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

- **Sintoma medido não entrega o mecanismo de graça.** "69 de 74 nunca
  conferidos" é uma medição sólida. "Logo, a falta de `ORDER BY` faz repetir as
  mesmas 12 linhas" é um **palpite**, e estava errado — quem é conferido sai do
  filtro por 24h. O palpite foi escrito aqui e no commit como fato medido, do
  mesmo jeito que a P25 foi. **A pergunta que separa os dois: "eu observei isto
  acontecer, ou deduzi que aconteceria?"**
- **Conserto pode piorar o que parecia consertar — e o momento de descobrir é
  antes do deploy.** Ordenar por `price_checked_at` com nulos primeiro parecia
  puro ganho, até notar que os pulos por condição fazem `continue` sem carimbar
  nada: os produtos permanentemente pulados passariam a ocupar a frente de toda
  rodada, garantidamente. **Ao mudar uma ordenação, perguntar sempre quem fica no
  fim — e se alguém pode ficar no começo para sempre.**
- **Quando um erro é sempre para o mesmo lado, é bug; quando é para os dois, é
  ruído.** Preço de post saindo *menor* que o do site em ~90% dos casos e nunca
  maior já dizia, antes de abrir o código, que havia truncamento — arredondamento
  erraria metade para cima.
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

- **Campo com nome certo e valor errado é invisível para toda prova de tipo.**
  `price_from` existia, era número, era positivo e chegava preenchido — passou por
  `success:true`, por `data_source='store'`, por foto presente e por preço certo.
  Só a comparação com o campo AO LADO (`price_from == price_to` e ainda assim
  desconto > 0) denunciou. **Vale checar coerência ENTRE campos, não só a
  presença de cada um.**
- **Teste que não distingue sucesso de falha não é teste.** Pedi ao Érico para
  clicar duas vezes no chip e voltar ao estado inicial — o banco ia mostrar
  exatamente a mesma coisa se o clique funcionasse ou se não fizesse nada.
  Mesmo erro de forma do "status 200 não é prova", agora do lado de quem desenha
  a verificação. **Antes de pedir um teste, perguntar: o que eu veria se
  falhasse?**
- **O estado "vazio" é o mais fácil de ler errado de uma tela.** `lojas_permitidas`
  vazio quer dizer TODAS, e nenhum chip aceso é exatamente a imagem de "nenhuma".
  Quem desmarca a última caixa espera bloquear tudo e libera tudo. Não dava para
  resolver com um valor melhor — "todas" tem que ser o default para não mexer nas
  fontes existentes. Resolve-se dizendo em português, acima dos chips e antes do
  clique, e avisando na hora em que a última é desmarcada. **Quando o default é
  um conjunto vazio, o rótulo é parte do recurso, não enfeite.**
- **"Escolher entre A e B" às vezes é a pergunta errada — às vezes A e B são o
  mesmo caso mal separado.** A P30 ficou parada como decisão binária: apagar o
  "de" quando a loja não mostra, ou nunca apagar. As duas estavam certas sobre
  metade do problema, porque tratavam "a loja não mostra" e "a leitura falhou"
  como a mesma coisa. Separados, a decisão evaporou: só o primeiro apaga. E a
  distinção **já estava escrita no tipo `Consulta` desde a v15** — usada por um
  ramo e ignorada pelo outro. **Antes de escolher entre duas saídas ruins,
  perguntar se elas não estão colapsando dois casos diferentes.**
- **Prova em `dryRun` não é dado corrigido.** A revisão 21 escreveu "13 de 13
  produtos tiveram o 'de' corrigido" e o dado seguiu errado por 24h: a medição
  era `dryRun`, e o prefixo `[dry] gravaria:` estava ali, na própria evidência
  colada. Em 02/08 a base ainda tinha **64 de 70** produtos de ML com o "de"
  truncado. É o "status 200 não é prova" de novo, agora do lado de dentro: a
  função respondeu certo, o banco não mudou. **Depois de provar, conferir no
  banco que mudou** — a pergunta é "qual linha eu leria diferente agora?".
- **Conserto que não alcança a base é conserto que não aconteceu.** A v18 estava
  no ar, correta, desde 01/08. Só que o cron confere ~1 produto de ML por rodada,
  então ela levaria meses para tocar os 70. Deployar não é aplicar: quando o
  conserto depende de uma rotação lenta para chegar aos dados, **aplicar em
  massa é uma etapa separada e tem que ser decidida como tal.**
- **Consertar um campo derivado sem consertar o derivado deixa o pior dos dois
  estados.** Apagar `price_original` e deixar `discount_pct` publica "46% OFF"
  sem número que o sustente — pior que o "de" errado que estava lá antes, porque
  agora não há sequer o que conferir. **Ao anular um campo, procurar quem foi
  calculado a partir dele.**
- **Contador que só existe para uma loja esconde o defeito nas outras.**
  `preco_sem_leitura_confirmada` era só da Amazon, e por isso 15 produtos de ML
  passaram por `conferidos` sem que nada tivesse sido lido. O caminho vazio não
  aparecia em métrica nenhuma. **Quando um contador nasce para diagnosticar um
  ramo, perguntar por que os outros ramos não precisam dele.**
- **Tarefa agendada do desktop não vence janela de log.** A tarefa das 07:00,
  criada justamente para ler a rodada dentro das 24h, disparou às 19:29 — ela roda
  quando o app abre. O que salvou a medição foi um campo durável no banco
  (`price_checked_at`), não o agendamento. **Se o dado expira, guardar o dado, não
  agendar a leitura dele.**
- **Contar "irrecuperável" antes de decidir se vale recuperar.** A P27 passou dois
  dias como decisão de custo — estender o `reparse` ou deixar passar. As duas
  saídas eram sobre um conjunto **vazio**: zero recusas de Shopee identificáveis
  antes de 01/08. Uma consulta de 10 segundos teria fechado a pendência no dia em
  que ela foi aberta. **Antes de desenhar a solução, medir o tamanho do problema.**
- **Prova que não disparou não é prova.** A v18 corrigiu 13 de 13 e o ramo que
  apaga não rodou nenhuma vez. É tentador contar isso como "13/13 de sucesso" e
  encerrar; o caminho perigoso da mudança continua sem uma única observação.
  **Contar acertos do ramo fácil não mede o ramo difícil.**
- **Antes de escrever a peça nova, procurar a peça que já faz isso no mesmo
  repo.** A P21 ficou dois dias catalogada como "falta caminho Amazon na
  `product-search`" — trabalho a fazer. Era trabalho já feito: o
  `product-refresh` lia a Amazon direito desde 30/07, por fetch direto e de
  graça, e a `clone-ingest` só não o chamava. É o mesmo formato da falha da
  assinatura da Shopee (uma implementação certa e uma errada convivendo no
  repo), agora na forma "uma implementação certa e nenhuma". **A pergunta que
  economiza dias: alguém aqui dentro já resolveu isto?**
- **Portar código funcionando não dispensa remedir.** O leitor tinha 12/12 de
  acerto em 30/07; isso é evidência sobre 30/07, não sobre hoje. A página da
  Amazon muda, o bloqueio anti-bot muda. Rodar o `product-refresh` num produto
  real antes de copiar uma linha custou 2 minutos e transformou "deve
  funcionar" em "leu R$ 360,91 às 14:24".
- **Duas testemunhas que concordam provam consistência, não verdade.** As duas
  leituras do buybox baterem entre si só diz que o parser é estável. Quem fechou
  a P21 foi a terceira testemunha, de fora do sistema: o navegador do Érico
  mostrando o mesmo R$ 151,27.
- **Campo único não comporta duas origens.** A tentação de devolver o título da
  loja com o preço do texto quando só o preço falha é forte e está errada:
  `data_source` é um campo só. Ou a linha inteira veio da loja, ou ela é
  `message`. Registro que descreve mal a própria procedência é pior que registro
  incompleto.

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
- **Descarte silencioso é indistinguível de "não aconteceu nada".** O listener do
  Clone Post tinha cinco pontos de `continue` sem log. Quatro são legítimos; o
  quinto — mensagem sem texto legível — engoliu **todas** as mensagens de um grupo
  com temporárias ligadas por mais de 10 horas, e a tela do dono mostrou exatamente
  o mesmo que mostraria se o grupo estivesse parado. **Todo ponto de descarte dentro
  de um caminho que o usuário observa precisa deixar rastro**, nem que seja uma linha
  de console: sem isso, a investigação começa pelo lugar errado — no caso, pela
  suspeita de que o usuário não estava no grupo.
- **O envelope não é a mensagem.** WhatsApp embrulha conteúdo em camadas
  (`ephemeralMessage`, `viewOnceMessage`, `editedMessage`) e o Baileys entrega o
  embrulho cru no `messages.upsert`. Ler campo de conteúdo direto do objeto recebido
  funciona no caso comum e falha inteiro no grupo com temporárias — que é justamente
  o perfil de grupo de promoção.
- **Resposta sem cabeçalho CORS, em app com CORS global, não veio do app.** O
  `wa-engine` registra o middleware de CORS antes de todas as rotas, então qualquer
  resposta do express — inclusive `400`, `404` e `502` — sai com o cabeçalho. Quando
  o navegador reclama de CORS num erro **e o cabeçalho está ausente**, quem respondeu
  foi o proxy, e a causa real é a requisição ter ficado pendurada. A mensagem do
  navegador ("blocked by CORS policy") manda procurar em configuração de CORS, que é
  exatamente onde o problema não está. Medido em 03/08 com o `/group-invite-info`.
- **Toda ida a serviço externo dentro de um handler HTTP precisa de prazo próprio.**
  Sem isso, quem decide o timeout é o proxy, e a resposta que chega ao usuário não
  passa pelo nosso tratamento de erro — perde a mensagem, perde o CORS, perde o log.
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
