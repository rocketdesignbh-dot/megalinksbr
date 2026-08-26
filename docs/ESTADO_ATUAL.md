# ESTADO ATUAL — Mega Links BR

> **PROTOCOLO — leia isto antes de qualquer outra coisa.**
>
> Este arquivo é a **única fonte de verdade** do projeto. Ele vive em
> `docs/ESTADO_ATUAL.md` no repo `rocketdesignbh-dot/megalinksbr`.
>
> **REVISÃO 83 — 26/08/2026.** Se o número aqui não for o mais alto que você
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

**REVISÃO 83 — 26/08/2026 — sem código. Auditoria: o Mega Results contra o
desenho original completo (pedido pelo Érico, que colou a especificação de
uma referência — provavelmente o "doc 08" que os comentários do código já
citavam). Cruzado item a item com `mr-ingest/src`, as migrations
`megaresults_01` a `13` e a Edge Function `mega-results`.**

### Achado principal: o backend está mais completo que a tela deixa ver

O pipeline de importação (`mr-ingest`) já faz praticamente tudo que a
especificação descreve — detecção de dataset por `iddopedido`/`iddoscliques`
(literal no `detect.js`), coerção pt-BR→numérico, `--`→nulo, percentual÷100,
data→ISO, e grava validação linha a linha em `megaresults.import_issue`. O
banco (`fact_transaction`/`fact_click`) já guarda atribuição (direto/indireto),
status detalhado, categoria em árvore de 3 níveis, até 5 sub IDs por
campanha, referrer, região, dispositivo. **Nada disso tem tela.** A sub-aba
Métricas fechada na REVISÃO 82 expõe só totais, série diária e breakdown por
loja — uma fração pequena do que o dado já suporta.

### Divergência de arquitetura, não de execução

A especificação descreve persistência em **IndexedDB local, dado que nunca
sobe pro servidor**. O que foi construído é o oposto: os dados vão para o
Postgres do Supabase, particionado por mês, multi-dispositivo. Não é uma
peça faltando — é uma decisão de produto diferente da referência, e fica
registrada aqui para o Érico decidir se importa.

### Checklist completo (✅ construído · ⚠️ dado existe, sem tela · ❌ não existe)

**Importação**
- ✅ Upload CSV comissão (47 campos) e clique (5 campos)
- ✅ Detecção automática de dataset pelo cabeçalho
- ❌ Diálogo de correção cruzada ("esse é de Cliques, ir pra lá?") — não se
  aplica: é uma importação única, não duas páginas; o efeito (cair no
  dataset certo) existe, o diálogo não
- ⚠️ Lista de erros por linha `{linha, campo, mensagem}` — gravada em
  `import_issue`, zero UI
- ✅ Coerção de tipos (vírgula/ponto, `--`→nulo, %÷100, data→ISO)
- ❌ Botão "Trocar Relatório"
- ❌ Persistência local (IndexedDB) — arquitetura é servidor, ver acima

**Análise de Comissão**
- ⚠️ KPIs de comissão/receita/pedidos — parcial (8 KPIs no ar, mas não os 4
  específicos descritos, e "comissão líquida" real depende do custo de
  anúncio, que não existe)
- ⚠️ Contadores por status (Concluído/Pendente/Cancelado/Não pago) — dado
  existe em `rollup_daily`, sem card próprio
- ❌ Calculadora de lucro (investimento → comissão líquida + CPA) — bloqueada
  por não existir integração de custo de mídia (ver REVISÃO 82/auditoria de
  Ads)
- ⚠️ Gráfico temporal com estrela no pico e granularidade Hora/Semana/Mês —
  temos só o gráfico diário
- ⚠️ Análise por Categoria em árvore (L1→L2→L3) — `dim_category` já tem os
  3 níveis, function aceita a dimensão, sem tela
- ⚠️ Performance por Origem (Direto/Indireto) — `fact_transaction.attribution`
  existe, function não expõe essa dimensão, sem tela
- ⚠️ Performance por Canal & Sub ID — `dim_campaign` tem os 5 sub IDs, sem
  tela
- ❌ Produtos Mais Vendidos com ranking e paginação
- ❌ Carrinho Esquecido (pedidos não pagos)
- ⚠️ Chip de período — temos o seletor ativo, não o rótulo de intervalo

**Análise de Cliques**
- ❌ Tudo — KPIs (regiões únicas), gráfico por origem, por dia da
  semana/hora, por região, tabela Sub ID × Referrer. O dado
  (`fact_click.referrer`/`region`/`device`/`os`) já está gravado; zero tela.

### O que fica

Não é uma lista de bugs — é o inventário do que falta do desenho original,
complementando a auditoria de Ads/IA/Alertas/Metas/Relatórios da mesma
sessão.

### 📌 DECIDIDO COM O ÉRICO — primeira ação da próxima sessão

**Construir "Produtos Mais Vendidos" e/ou "Performance por Canal & Sub ID"**
na sub-aba Métricas do Mega Results. Escolhido por ser o menor esforço com
maior retorno: o dado já está gravado (`dim_product`/`dim_campaign` com os 5
sub IDs, populados de verdade pelo `ingest_transactions`), e a Edge Function
`mega-results` já aceita `dimensions:['product']` e `['campaign']` no
`POST metrics/query` — falta só consumir e desenhar, como fizemos com
`store` na REVISÃO 82. Nenhuma migration, nenhuma mudança de backend
esperada.

Pontos de atenção para quem pegar isso: (1) ainda há **1 relatório real só**
(40 cliques Shopee, `fact_transaction` com 1 linha de teste) — o ranking de
produtos vai aparecer vazio ou com 1 item até um relatório de comissão de
verdade ser importado; testar a UI com esse dado pequeno mesmo assim, o
comportamento "sem dados" precisa ficar honesto. (2) `campaignLabel` já é
resolvido pela function via `dim_campaign.display_name` — conferir se esse
campo está preenchido pro dado real antes de desenhar a tabela, senão a
coluna sai vazia. (3) seguir o padrão visual já usado (`.kpi`, tabela simples
como o breakdown por loja) em vez de inventar componente novo.

---

**REVISÃO 82 — 26/08/2026 — ✅ P74 FECHADA, MEDIDA NO NAVEGADOR LOGADO DO
ÉRICO (via Claude in Chrome, depois do upload manual + Deploy do `app` que
ele fez). A tela de métricas do Mega Results está no ar e funcionando.**

### A prova

Aberto `/painel/mega-results` na sessão logada real do Érico. A aba abriu em
**Métricas** (não em Importar), sem erro no console (3 mensagens, todas de
onboarding, nenhum erro/exceção). Os 8 KPIs bateram com o único dado real do
banco (a importação de 40 cliques Shopee, 19–24/08):

| KPI | 30 dias |
|---|---|
| Comissão projetada | R$ 1,75 |
| Receita líquida | R$ 19,48 |
| Pedidos | 1 |
| Cliques | 40 (▲3.900% vs. período anterior) |
| Taxa de conversão | 2,5% |
| EPC | R$ 0,04 |
| Ticket médio | R$ 19,48 |
| Comissão aprovada | R$ 0,00 |

O gráfico de comissão por dia desenhou uma barra em 20/07 (dia do fato real).
O breakdown por loja mostrou `shopee — R$ 1,75 · 40 cliques · 1 pedidos`.
Troquei o período para **7 dias** e os números mudaram de forma consistente
(cliques 21, resto zerado — a janela de 7 dias não cobre a maior parte do
período 19–24/08 a partir de hoje) — prova de que o seletor de período
realmente refaz a chamada, não é estático. A aba **Importar** foi conferida
ao lado: idêntica a antes, histórico de importações intacto.

⚠️ **O que não foi testado:** módulo `MODULE_DISABLED` (não há conta sem
`pilot_access` à mão), e nenhum dado de pedido/receita além do que já existe
(a base ainda é pequena — ver P75).

### Como a prova foi feita

Pelo navegador REAL do Érico, via extensão Claude in Chrome — não pelo
sandbox desta sessão, que segue sem alcançar `megalinksbr.com.br` (mesmo
bloqueio de rede já registrado nas revisões anteriores; confirmado de novo
nesta sessão com `curl` devolvendo `403` do proxy). **Fica como aprendizado
para sessões futuras:** quando o sandbox não alcança o domínio de produção
mas o Érico tem a extensão Claude in Chrome instalada e logada, ela é o
caminho de medição — usa a rede dele, não a do sandbox.

---

**REVISÃO 81 — 26/08/2026 — sem código. Testadas e ESGOTADAS três vias de push
automático nesta sessão — nenhuma funciona. O bloqueio é da sessão, não da
credencial. Fica registrado para NÃO repetir o teste em sessão futura sem
antes conferir se algo mudou do lado do produto.**

### O que foi testado, nesta ordem, e o resultado de cada um

1. **PAT clássico (`ghp_…`) fornecido pelo Érico**, configurado no
   `git remote` local. `git push` devolveu **403** direto do proxy da sessão,
   sem sequer testar o token:
   ```
   remote: access denied by the git proxy: rocketdesignbh-dot/megalinksbr is
   not in this session's authorized repository set, so the proxy will not
   inject a credential for it. To fix, add the repository to the session's
   sources.
   ```
2. **Conector GitHub da conta**, conferido em Configurações → Conectores:
   já estava vinculado (opção "Desvincular" visível). Não era isso.
3. **GitHub App "Claude" instalado no repo**, conferido em
   github.com → Settings → Applications → Installed GitHub Apps → Claude →
   Configure: **"Repository access" já estava em "All repositories"** — o
   acesso mais amplo possível do lado do GitHub. `git push` repetido depois
   disso: **mesmo 403**, mesma mensagem.

### Conclusão

O texto do erro — *"add the repository to the session's sources"* — aponta
para uma permissão **da sessão em si**, concedida (ou não) num momento que
nenhuma configuração testada alcança: nem o PAT, nem o vínculo de conta, nem
a liberação do lado do GitHub mudam esse "authorized repository set". É
provavelmente um mecanismo do tipo Claude Code (onde o repo é selecionado
**na criação** da sessão), que uma sessão de Cowork aberta como esta não tem
como acionar depois de já iniciada.

**Não adianta repetir o teste nesta mesma sessão** — o bloqueio já foi
confirmado três vezes com três credenciais/configurações diferentes. Se uma
sessão futura quiser tentar de novo, o único caminho ainda não testado é
abrir a sessão já com o repositório pré-selecionado como fonte (se essa
opção existir no produto) — e não repetir PAT/App do GitHub, que já se
provaram irrelevantes para este bloqueio específico.

### O que continua valendo

**Push automático não é uma capacidade desta sessão.** O fluxo é: eu preparo
o `.patch`/arquivo final localmente, entrego a você, e você sobe pelo GitHub
web + Deploy no EasyPanel — exatamente como fechamos as revisões 73 a 80. O
P74 (tela de métricas) segue entregue dessa forma, aguardando você aplicar.

---

**REVISÃO 80 — 26/08/2026 — P74 CODADA NO REPO, NÃO DEPLOYADA E NÃO MEDIDA EM
PRODUÇÃO. A aba Mega Results ganha a tela de métricas que faltava.**

### O que foi feito

`frontend/index.html`: a aba Mega Results virou duas sub-abas — **Métricas**
(nova, é a que abre por padrão) e **Importar** (o que já existia, sem nenhuma
mudança de comportamento). A sub-aba Métricas chama pela primeira vez a Edge
Function `mega-results` (`POST .../functions/v1/mega-results/metrics/query`),
que estava `ACTIVE` desde 08/08 sem chamador nenhum.

Conteúdo da tela: seletor de período (hoje/ontem/7d/30d/mês atual/mês
passado), 8 cards de KPI (comissão projetada, receita líquida, pedidos,
cliques, taxa de conversão, EPC, ticket médio, comissão aprovada) — cada um
com a comparação vs. período anterior que a própria função já calcula
(`changePct`, `null` quando não há base de comparação, nunca inventado como
0%) —, um gráfico de barras de comissão por dia (mesmo padrão visual do
`finChart`/`mrrChart` que já existiam no painel) e um breakdown por loja. O
`meta.partial` da resposta (dia ainda na fila de agregação) vira um pill
"dados de hoje ainda em processamento" no cabeçalho do período.

Reaproveitado sem inventar componente novo: `.kpi`/`.kl`/`.kv`/`.kd` do
`kpiRow` do dashboard, `.bar-track`/`.bar` do `finChart`, `.pill`. Nenhum
arquivo novo, nenhuma migration, nenhuma mudança na Edge Function nem no
`mr-ingest` — só o consumo do que já existia.

### ⚠️ O que NÃO foi medido — e por quê

**Nada disto foi aberto num navegador.** O sandbox desta sessão não alcança
`nxlfezpagporealqqbfj.supabase.co` nem os domínios do EasyPanel (egress
bloqueado, o mesmo limite que a REVISÃO 73 já registrou). O que foi feito
localmente: `node --check` (via `vm.Script`) limpo nos 5 blocos `<script>`
inline do arquivo inteiro — prova que não quebrou sintaxe, não prova
comportamento.

**Regra de prova do projeto: isto não é "funciona".** Falta, depois do
push + Deploy do `app`, no navegador logado do Érico com a conta que tem
`megaresults.pilot_access`:

1. Abrir a aba Mega Results e conferir que ela abre em Métricas (não em
   Importar), sem erro no console.
2. Trocar de período e conferir que os 8 KPIs e o gráfico mudam, e que o
   texto de comparação bate com o que dá pra calcular à mão a partir do
   `import_batch`/`fact_click` real (as 40 linhas de 19–24/08 são o único
   dado real hoje).
3. Clicar em "Importar" e confirmar que a aba antiga continua exatamente
   como estava — esta sessão não tocou em nenhuma função de upload.
4. Testar o card de módulo não liberado (`MODULE_DISABLED`) com uma conta
   sem `pilot_access`, se houver uma à mão.

### O que fica pendente

- **P74 fica 🟡 parcialmente fechada** — código no repo, sem prova por
  comportamento. Só fecha de verdade com o passo acima.
- Como o único dado real é 1 loja (Shopee) e 1 tipo de fato (`fact_click`,
  zero `fact_transaction` de verdade), o breakdown por loja e os KPIs de
  pedido/receita vão aparecer zerados ou quase — não é bug da tela, é a
  base ainda pequena (ver P75).
- Push continua manual: commit local feito (`5401ee5`), arquivo entregue ao
  Érico para upload pelo GitHub web + Deploy do `app` no EasyPanel.

---

**REVISÃO 79 — 26/08/2026 — ✅ P80 FECHADA NA TELA. O Mega Results está
funcionando ponta a ponta em produção, sem nenhuma injeção.**

### A prova, no navegador logado do Érico

Deploy do `app` feito; medido no `index.html` **servido pelo domínio**:
`mrAcompanhar` presente e chamada, `await mrStream(body.importId` **ausente**,
campos antes do arquivo. Página recarregada, código limpo do servidor.

Importação do mesmo `WebsiteClickReport202608260015.csv`: a tela abriu o
**card "⚠️ Este arquivo já foi importado"**, com a data **26/08/2026**, o texto
explicando que nada foi duplicado, e os botões *Importar mesmo assim* /
*Cancelar*. **Console limpo.**

Isso fecha as três camadas de uma vez: o `POST` autenticou (P78), os campos
chegaram (P79), e o resultado apareceu na tela (P80) — sem o SSE, lendo
`import_batch`.

### O placar da noite — três defeitos encadeados, nenhum deles óbvio

| # | defeito | onde estava | como foi achado |
|---|---|---|---|
| 1 | `<` e `>` em volta dos segredos | Environment do EasyPanel | **medindo** o campo (tamanho, 1º e último caractere) — nenhum log diria isso |
| 2 | arquivo antes dos campos no multipart | `frontend/index.html` | o erro **mudou de forma** (500 → 400) quando o 1 foi consertado |
| 3 | SSE não atravessa o proxy | `frontend/index.html` | instrumentar o `fetch` + controle com id inexistente (425 ms vs. pendente) |

**Cada um escondia o próximo.** É o padrão que este documento já registrou
outras vezes: o erro que muda de forma é sinal de progresso, não de fracasso.

### ⚠️ Pendências que esta sessão deixa

- **P74 — a tela de métricas continua não existindo.** Agora existe dado real
  (40 cliques) e a Edge Function `mega-results` está pronta e ativa desde 08/08,
  sem chamador. É o que falta para o módulo cumprir o que a própria aba promete.
- **P75 — falta um relatório grande.** 40 linhas não exercitam nem um lote
  (`BATCH_SIZE` 5000).
- **🔴 Um relatório de cliques foi commitado por engano em
  `frontend/WebsiteClickReport202608260015.csv`, e o repo é PÚBLICO.** Conteúdo
  de baixo risco (id de clique, data, região, referenciador — sem dado pessoal),
  mas **apagar**. Fica no histórico do git mesmo depois.
- **O `mr_expire_queue`** — reconferir se ainda dá 401 agora que a chave e o
  `MR_INGEST_TOKEN` estão corretos.
- **Push continua manual.** O sandbox de nuvem não empurra para este repo, e a
  liberação exige plano Team/Enterprise. O fluxo desta sessão foi: commit local,
  arquivo entregue ao Érico, upload pelo GitHub web, Deploy pelo EasyPanel.

---

**REVISÃO 78 — 26/08/2026 — P79 NO AR E MEDIDA EM PRODUÇÃO. E o terceiro
defeito da noite apareceu logo atrás: o SSE de progresso NÃO atravessa o proxy
do EasyPanel. A tela passa a ler o banco.**

### ✅ P79 no ar — medido no arquivo servido e por comportamento

O conserto da ordem do multipart foi para o `main` e o `app` recebeu Deploy
(04:43 UTC). Medido no `index.html` **servido pelo domínio**, com bust de cache:
comentário novo presente, `connectionId`/`store` **antes** do `fd.append('file')`,
e a ordem antiga ausente.

Duas tentativas reais do Érico, com o código deployado e **sem nenhuma injeção**:
`import_batch` `failed · DUPLICATE_FILE: Este arquivo ja foi importado em
26/08/2026`, às 01:44:58 e 01:48:18 (BRT). **Chegar ao DUPLICATE_FILE é a prova
de que passou por tudo:** autenticação, `mr_habilitado`, campos do formulário,
leitura e checksum do arquivo. Antes do conserto parava no 400.

### 🔴 P80 — o `GET /import/:id/stream` nunca responde (proxy engole SSE)

Medido no navegador logado, com as chamadas instrumentadas:

```
progresso {stage: enviando}
-> POST /import
<- 202 /import              331 ms   ✅
-> GET /import/<id>/stream
   (sem resposta — pendente após 20 s)
```

**Controle negativo decisivo, na mesma sessão:** o mesmo endpoint com um
`importId` **inexistente** responde em **425 ms**, `content-type:
text/event-stream`, corpo `data: {"stage":"unknown"}`. A diferença entre os dois
caminhos está no servidor: no id desconhecido ele faz `res.end()` na hora
(`server.js` linha 321); no id válido ele escreve o primeiro evento e **mantém a
conexão aberta**. Ou seja: **a resposta só atravessa o proxy quando a conexão
fecha.** SSE de conexão aberta é bufferizado no meio do caminho.

Sintoma para o usuário: a barra fica em *"Enviando arquivo…"* para sempre,
**mesmo com a importação já concluída no banco**. Foi exatamente o que o Érico
viu três vezes seguidas, e o que fez parecer que "não funcionou" quando tinha
funcionado.

### ✅ O conserto — ler a fonte durável, não o stream

`mrAcompanhar(importId)` substitui o `mrStream` no fluxo: consulta
`megaresults.import_batch` a cada 1,5 s (teto de 5 min) até o `status` sair de
`parsing`, e renderiza o estado final. **A escolha não é contornar por preguiça:**
o próprio `mr-ingest` documenta que o `PROGRESS` é memória efêmera e que *"o
estado durável vive em megaresults.import_batch"* (`server.js` linha 127). A tela
estava lendo a fonte errada.

`mrStream` **fica no arquivo, sem chamador**, com aviso — se o proxy for
ajustado (ou o serviço ganhar `X-Accel-Buffering: no`), ela volta a servir para
progresso granular.

### O que foi medido do conserto, antes de subir

`node --check` limpo nos 5 blocos inline. E os três estados renderizados na
página real, chamando `mrAcompanhar` contra lotes de verdade do banco:

| lote | o que a tela mostrou |
|---|---|
| `failed` · `UNKNOWN_NETWORK` | *"Falhou: Nao reconhecemos este formato…"* |
| `failed` · `DUPLICATE_FILE` | **card próprio** aberto, com a data, barra escondida |
| `completed` (o de 40 linhas) | *"Concluído — 40 linhas válidas de 40 · 40 novas…"* |

⚠️ **O que NÃO foi exercitado:** o fluxo inteiro de uma ponta a outra com o
`mrAcompanhar` já ligado ao `mrUpload` — o teste foi barrado pelo sandbox. A
fiação entre os dois é uma linha (`await mrAcompanhar(body.importId)`), e o
`POST` já está medido em 331 ms, mas **isso é dedução, não medição**. A prova
fecha com uma importação real depois do Deploy.

---

**REVISÃO 77 — 26/08/2026 — 🎉 O MEGA RESULTS IMPORTOU UM RELATÓRIO REAL PELA
PRIMEIRA VEZ. Duas causas, uma atrás da outra: `< >` colados junto com os
segredos, e a ordem dos campos do multipart. P78 FECHA. Código do frontend
corrigido no repo, PENDENTE DE PUSH E DEPLOY.**

### ✅ A prova — lida no banco, não na tela

```
import_batch  WebsiteClickReport202608260015.csv
  status      completed
  dataset     click        (detectado sozinho — os anteriores eram transaction)
  rows_total  40
  rows_valid  40
  erro        nenhum
```

E o dado chegou ao fato, não só ao lote: **40 linhas em `megaresults.fact_click`**
com o `import_id` do lote, cobrindo de **19/08 00:07** a **24/08 20:56** (horário
de São Paulo). `rollup_dirty` com 5 dias na fila — o cron
`megaresults-refresh-rollups` (`*/5 * * * *`) agrega em seguida.

Antes disto a base tinha **1 linha** em `fact_transaction` e **zero** clique
importado. As 9 importações anteriores eram todas o mesmo arquivo de teste de 1
linha.

### 🔴 Causa 1 — os segredos estavam com `<` e `>` em volta (fecha a P78)

Lido diretamente no Environment do `mr-ingest` no EasyPanel, pelo navegador do
Érico:

| variável | 1º char | último char | tamanho sem as bordas |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `<` | `>` | **219** — exatamente a `service_role` legada |
| `MR_INGEST_TOKEN` | `<` | `>` | **64** — exatamente um `openssl rand -hex 32` |

**A chave certa sempre esteve lá, embrulhada.** O Supabase recebia
`<eyJhbGci…>` e respondia `Invalid API key`, com razão.

**De onde veio:** o `mr-ingest/README.md` documenta o passo como
`SUPABASE_SERVICE_ROLE_KEY=<copiar do painel do Supabase → Settings → API>` e
`MR_INGEST_TOKEN=<gerar: openssl rand -hex 32>`. Os sinais são notação de
"preencha aqui" e vieram junto na hora de colar. ⚠️ **O `MR_INGEST_TOKEN`
estava quebrado pelo mesmo motivo** — qualquer chamada de serviço a `/import`
falharia; ninguém percebeu porque ninguém usa esse caminho hoje.

⚠️ **Isto custou quatro rodadas de diagnóstico**, e a lição é aproveitável:
nenhum log consegue dizer *"seu valor tem um caractere a mais"* — o
`Invalid API key` é idêntico para chave errada, chave revogada e chave
embrulhada. **O que resolveu foi MEDIR o campo (tamanho, primeiro e último
caractere) em vez de olhar para ele.** Vale para qualquer segredo daqui em
diante.

### 🔴 Causa 2 — a ordem dos campos do multipart (bug de código, novo)

Com a chave consertada o erro **mudou de forma**, que é o sinal de que uma
camada foi vencida: de `500 "Nao foi possivel verificar sua sessao"` para
`400 "ownerId, connectionId e store sao obrigatorios"` — resposta que só existe
**depois** de o token ser aceito.

O `mr-ingest` lê `fields` **dentro** do handler do arquivo (`src/server.js`
linha 161), e o Busboy entrega as partes do multipart **na ordem em que elas
chegam no corpo**. O frontend montava assim:

```js
fd.append('file', file);          // <- arquivo PRIMEIRO
fd.append('connectionId', conn.id);
fd.append('store', conn.store);
```

Quando o handler do arquivo roda, `connectionId` e `store` **ainda não
chegaram**. Daí a tela mostrar a conexão selecionada e o servidor jurar que ela
não veio.

**Conserto (`frontend/index.html`):** os campos passam a ser adicionados
**antes** do arquivo, com o comentário explicando o porquê para ninguém
"arrumar" de volta. Nenhuma outra linha tocada.

⚠️ **O backend continua dependendo da ordem do cliente.** Não foi mexido por
escopo estrito, mas fica registrado: um `mr-ingest` robusto não confiaria nisso
(esperar o `close` do Busboy, ou exigir os campos antes explicitamente).

**A prova aconteceu ANTES do deploy:** a função corrigida foi injetada na
página, no navegador logado do Érico, e a importação que vinha falhando
completou — os 40 cliques acima. Comportamento observável, produção real,
arquivo real.

### ⚠️ O que fica pendente

1. **O conserto do frontend NÃO está em produção.** Está no repo (P79) e
   depende de push + Deploy do `app`. Enquanto isso a aba do Érico só importa
   com a correção injetada — **um F5 desfaz**.
2. **O push segue bloqueado nesta sessão** (o proxy recusa este repo). As
   revisões 73–77 estão commitadas localmente e foram entregues como `.patch`.
3. **A tela de métricas continua não existindo** (P74) — mas agora existe dado
   real para ela mostrar, o que muda a prioridade dela.
4. **O `mr_expire_queue`**: o EasyPanel tem **três** serviços e nenhum
   duplicado (`app`, `mr-ingest`, `wa-engine`), e o `mr-ingest` builda de
   `main` / Build Path `/mr-ingest` — o mesmo código deste repo. Ainda assim
   havia uma chamada por minuto, cravada no segundo `:00`, que não existe em
   nenhum arquivo. **Com a chave e o token agora corretos, reconferir se ainda
   dá 401** — pode ter se resolvido junto.

---

**REVISÃO 76 — 26/08/2026 — CAUSA RAIZ ISOLADA POR EXPERIMENTO. A chave certa
para o `mr-ingest` é a `service_role` LEGADA (JWT `eyJ…`), não a `sb_secret_…`
nova. Medido chamando o Supabase com cada uma.**

### O experimento — feito no navegador do Érico, contra o projeto real

Aberto o Dashboard do Supabase (`Settings → API Keys`) na sessão logada dele e
disparada, do próprio navegador, a MESMA chamada que vinha falhando —
`POST /rest/v1/rpc/mr_expire_queue` — usando a **`service_role` legada**
revelada na aba "Legacy anon, service_role API keys":

| chave usada | `POST /rest/v1/rpc/mr_expire_queue` |
|---|---|
| **`service_role` legada** (JWT, 219 caracteres, começa em `eyJ`) | **HTTP 200**, corpo `0` |
| `sb_secret_…` (a que está no EasyPanel hoje) | **recusada** — é a que produz `Invalid API key` no log do `mr-ingest` |

**Isto é comportamento observável, não dedução:** a mesma função, o mesmo
projeto, o mesmo endpoint, mudando só a credencial. A legada passa; a nova não.

`mr_expire_queue` foi escolhida de propósito para o teste: é exatamente a
função que vinha aparecendo **401 a cada minuto** no `query_logs` desde antes
de qualquer mexida desta sessão. Com a chave legada ela responde 200.

### Por que a chave nova não serve aqui

O `mr-ingest` usa `@supabase/supabase-js` com a chave em `apikey` +
`Authorization: Bearer`, e o caminho que mais importa é o
`db().auth.getUser(token)` do `authorize()`. As chaves novas
(`sb_publishable_` / `sb_secret_`) são um esquema diferente do JWT legado, e
neste projeto **o par legado continua ativo** (o Dashboard ainda oferece
"Disable legacy API keys", ou seja, não foi desligado). A `anon` legada segue
em uso pelo painel — o `mr-ingest` precisa da **`service_role` legada**, o par
dela.

### O conserto — um campo, um Deploy

No EasyPanel, serviço **`mr-ingest`** → Environment →
`SUPABASE_SERVICE_ROLE_KEY` = a chave da aba **"Legacy anon, service_role API
keys"**, linha **`service_role` `secret`**, botão **Reveal** (é um JWT longo,
219 caracteres, começando em `eyJhbGci…`). **Não** a `sb_secret_…`. Salvar e
**Deploy**.

### As duas provas que fecham a P78, depois do Deploy

1. **O log do `mr-ingest` para de escrever** `SUPABASE_SERVICE_ROLE_KEY parece
   invalida`.
2. **O 401 por minuto em `mr_expire_queue` vira 200** no `query_logs` — é o
   sinal mais barato e não depende de ninguém abrir tela.

E só então a importação de um relatório real prova a P75.

### ⚠️ Achado de lado, não resolvido: quem chama `mr_expire_queue` por minuto

A chamada de minuto em minuto **não existe em nenhum arquivo deste repo**
(procurada em `mr-ingest/src`, `wa-engine`, e em `cron.job` do Postgres — não
está em nenhum dos três) e **sobreviveu a dois rebuilds do `mr-ingest`**. Ou a
produção está rodando uma versão do `mr-ingest` mais nova que o repo (com um
`setInterval` que aqui não existe), ou há um segundo processo/serviço no
EasyPanel usando a mesma credencial. **Não medido** — fica registrado porque um
timer que ninguém acha no código é exatamente o tipo de coisa que este projeto
já pagou caro para descobrir tarde.

---

**REVISÃO 75 — 26/08/2026 — sem código. O Érico trocou a chave no Environment
e o log revelou DOIS problemas, não um: a chave nova ainda é recusada, E o
container está rodando Node 20, não o Node 22 que o Dockerfile já pede.**

### Log real depois da troca da `SUPABASE_SERVICE_ROLE_KEY`

```
⚠️ Node.js 20 and below are deprecated…
[mr-ingest] falha ao validar token de usuario: Node.js detected but native WebSocket not found.
[mr-ingest] SUPABASE_SERVICE_ROLE_KEY parece invalida — o Supabase recusou NOSSA chave: Invalid API key
```

### 🔴 Problema 1 — o container não rebuildou: continua em Node 20

O `mr-ingest/Dockerfile` já está em `FROM node:22-slim` há um tempo (o
comentário do próprio arquivo registra que essa troca resolveu exatamente este
erro de WebSocket, num incidente anterior). O log de agora mostra Node
avisando sobre depreciação de "Node.js 20 e abaixo" e o `auth.getUser()`
lançando `native WebSocket not found` — sintoma exclusivo de runtime **abaixo**
do 22. **Conclusão: trocar a variável de ambiente no EasyPanel reiniciou o
container, mas não refez o build** — a imagem em execução é anterior ao
Dockerfile atual do repo. Isso by itself já quebraria toda importação de
usuário logado (o `catch` desse erro devolve 401 "unauthorized", não o 500 da
chave), **independente da chave estar certa ou não**.

### 🔴 Problema 2 — a chave nova também está sendo recusada

`Invalid API key` é a resposta literal do Supabase para a chave que o
`mr-ingest` está usando agora, depois da troca. Não dá para saber pelo log **o
que** exatamente foi colado, mas as causas mais comuns são: espaço ou quebra de
linha extra ao colar, ou ter copiado um valor diferente do que o Supabase
chama de **service_role key** hoje (o projeto tem tanto a chave legada em JWT
quanto o par novo publishable/secret — `get_publishable_keys` confirma que a
`anon` legada **ainda está ativa**, então a `service_role` legada também deve
estar).

### O que falta — dois passos, nesta ordem, e é ação do Érico no EasyPanel

1. **Fazer um Deploy de verdade (rebuild), não só salvar a env var** — no
   EasyPanel, no serviço `mr-ingest`, usar o botão de Deploy/rebuild para que
   ele puxe o Dockerfile atual do repo (Node 22). Confirmar depois pelo log de
   boot: **sem** o aviso de depreciação do Node 20.
2. **Só depois** reconferir a `SUPABASE_SERVICE_ROLE_KEY`: copiar de novo do
   Supabase (Settings → API → service_role, ou o card equivalente na tela
   nova de chaves), colar sem espaço/quebra de linha extra, salvar, e essa
   troca específica de env var pode precisar de Deploy de novo para pegar —
   **não presumir que só salvar reinicia com o valor novo aplicado**.

Enquanto o Node continuar em 20, o problema 2 não pode ser confirmado de
verdade: o erro de WebSocket já derruba a validação de token antes de a chave
ser testada a fundo pelo caminho do usuário logado — só o log
`SUPABASE_SERVICE_ROLE_KEY parece invalida` (que é outro caminho, chamado
direto pela função) prova que a chave em si também está errada agora.

---

**REVISÃO 74 — 26/08/2026 — sem código, MEDIDO EM PRODUÇÃO. P76 confirmada:
achado o motivo exato do 500 que o Érico bateu ao tentar importar de verdade.
`SUPABASE_SERVICE_ROLE_KEY` do `mr-ingest` está inválida.**

### A prova — a mensagem de erro aponta para a própria causa, e o log bate

O Érico tentou importar `WebsiteClickReport20260826xxxx.csv` pela conexão
"Shopee - Conta Ana Luiza" e recebeu, na tela: **"Falhou: Nao foi possivel
verificar sua sessao."** e, no console do navegador, `Failed to load resource:
… 500` em `…mr-ingest…/import`.

Essa frase existe em **um lugar só do código**: `mr-ingest/src/server.js`
linha 114, dentro do `catch` que distingue "token do usuário é ruim" (401) de
"a NOSSA `SUPABASE_SERVICE_ROLE_KEY` morreu" (500) — o comentário do próprio
arquivo já registrava que isso **aconteceu antes, em 11/08**. Não é inferência
a partir da mensagem: é a `query_logs` confirmando, no mesmo minuto do print
(03:17:25 UTC), **`GET 401 https://…supabase.co/auth/v1/user | node`** — a
chamada que o `authorize()` faz para validar o token do usuário, recusada
porque quem está inválida é a chave de serviço do próprio `mr-ingest`, não o
token dele.

### E o mesmo sintoma está rodando em loop, todo minuto, desde antes disso

`query_logs` (edge_logs) mostra **`POST 401 …/rest/v1/rpc/mr_expire_queue |
node`** uma vez por minuto, ininterrupto, pelo menos desde 02:50 UTC até
agora. `mr_expire_queue` é `public`, `SECURITY DEFINER`, `EXECUTE` só para
`service_role` desde a migration de segurança de 22/08 (REVISÃO 54) — **antes
disso, `authenticated` também executava, o que mascarava uma chave errada**.
⚠️ **Não localizado neste código quem chama isso a cada minuto** — não está em
`mr-ingest/src` (procurado em todos os arquivos), não está em `wa-engine`, não
está em nenhum `cron.job` do Postgres. É provavelmente um processo à parte (um
worker antigo, talvez uma revisão anterior do `mr-ingest` ainda rodando em
paralelo) usando a mesma credencial quebrada. **Fica para o Érico confirmar no
EasyPanel se há mais de um serviço/processo do `mr-ingest` no ar.**

### O que isso significa, e o que não significa

**Não é bug de código.** O `authorize()` já foi escrito para não confundir os
dois casos, e é exatamente essa distinção que produziu a mensagem certa em vez
de um 401 genérico culpando o usuário. **É uma credencial (`SUPABASE_SERVICE_ROLE_KEY`
do serviço `mr-ingest` no EasyPanel) inválida, expirada ou trocada** — o mesmo
padrão de falha já documentado no código como tendo ocorrido em 11/08.

### O que falta, e é ação externa (EasyPanel + Supabase Dashboard)

1. Conferir a `SUPABASE_SERVICE_ROLE_KEY` atual em Supabase → Settings → API.
2. Comparar com o valor configurado no serviço `mr-ingest` no EasyPanel
   (Environment).
3. Se divergir (ou se a chave tiver sido regenerada em algum momento — o
   projeto passou por várias correções de segurança entre 22/08 e 25/08),
   colar a chave certa e fazer **Deploy manual** do `mr-ingest` (não entra no
   auto-deploy).
4. Reconferir importando o mesmo `WebsiteClickReport…csv` de novo.
5. Descobrir e desligar o processo que chama `mr_expire_queue` a cada minuto
   com a chave errada — ele está gerando ruído de 401 há pelo menos meia hora
   contínua no log do Supabase.

Isto **substitui e fecha a incerteza da P76** (que só pedia "confirmar se o
`mr-ingest` responde") — ele responde, mas com a credencial errada. Ver P78.

---

**REVISÃO 73 — 26/08/2026 — sem código. Auditoria do Mega Results pedida pelo
Érico: o módulo tem metade construída e não documentada, e a outra metade
nunca foi ligada a nada.**

### O que foi lido (não adivinhado) nesta sessão

Clone do repo por `git clone` com PAT fornecido na sessão (`ghp_…`, não salvo
em memória), leitura de `frontend/index.html` (aba `page-mega-results` e o
bloco `<script>` "MEGA RESULTS"), das 13 migrations `megaresults_*`, do
`mr-ingest/README.md`, e consulta direta ao Supabase (`execute_sql`,
`list_edge_functions`, `get_edge_function`) no projeto `nxlfezpagporealqqbfj`.
**Sem acesso de rede deste sandbox** a `megalinksbr.com.br`,
`megalinksbr-wa-engine…` nem `megalinksbr-mr-ingest…` (egress bloqueado) — o
que segue não inclui nenhuma leitura de `/health` ao vivo.

### 🔴 Achado principal: existe uma Edge Function `mega-results` (dashboard),
### deployada, e o frontend nunca a chama — e o ESTADO_ATUAL nunca a citou

`list_edge_functions` mostra `mega-results` **ACTIVE, version 8**,
`verify_jwt: true`, criada em 08/08 e atualizada em 08/08. O código
(`get_edge_function`) é uma API de métricas completa: `POST
/mega-results/metrics/query`, lê `megaresults.rollup_daily` (nunca
`fact_transaction` direto — comentário no próprio arquivo explica por quê),
resolve período por preset ou `from/to`, compara com o período anterior de
mesmo tamanho, calcula `conversion_rate`/`epc`/`aov`/`roi` com `null` honesto
em vez de zero quando não dá para calcular, monta série diária sem buracos e
breakdown por `store`/`campaign`/`category`/`product` com rótulo. Também
respeita a trava de piloto (`mr_habilitado`) antes de qualquer consulta.

**Nada disso aparece na tela.** `grep` em `frontend/index.html` por
`rollup_daily`, `mrDash`, `mrKpi`, `mrChart`, `dim_product`, `dim_merchant`,
`saved_report`, `share_link` e `goal` — **zero ocorrências**. O bloco
`<script>` "MEGA RESULTS" (11.568–11.774) só implementa três cards: **Conexão**
(criar/listar `connection`), **Importar relatório** (upload para o
`mr-ingest`, barra de progresso via SSE) e **Importações recentes** (lista de
`import_batch`). Não existe um único elemento de KPI, gráfico ou tabela de
métricas — a promessa do próprio subtítulo da aba, *"acompanhe comissões,
pedidos e conversão"*, não tem UI nenhuma por trás.

**Isto explica por que a REVISÃO 44 pôde provar "o Mega Results aparece em
produção" olhando só a existência da `<section>`:** a aba carrega, mas carrega
uma tela de importação de arquivo. Não há como acompanhar comissão nenhuma
hoje, mesmo com dado importado.

### O que foi medido no banco (não no código) — dado real, não teste de bancada

| | valor |
|---|---|
| `megaresults.pilot_access` | **1 linha** — só o Érico, `enabled=true`, nota "piloto interno — dono do produto" |
| `plan_features.mr_enabled` | **false nas 4 linhas** (starter/pro/elite/premium) — por desenho, ninguém entra pelo plano hoje |
| `megaresults.connection` | **3 linhas**, todas do Érico, todas `store='shopee'`, criadas entre 08/08 e 11/08 |
| `megaresults.field_mapping` (lojas mapeadas) | **só `shopee`, 52 linhas** — nenhuma outra loja tem mapeamento, então `mrLoadStores()` nunca vai oferecer Mercado Livre/Amazon/etc. na tela |
| `megaresults.import_batch` | **9 linhas**, todas do mesmo arquivo `shopee-commission-202608021606.csv`, entre 08/08 e 11/08 — a mais recente é de **15 dias atrás** |
| `megaresults.fact_transaction` (view particionada) | **1 linha no total** |

Ou seja: o pipeline de importação já foi exercitado e funciona ponta a ponta
para **um arquivo de teste de 1 linha**, três vezes, com dedupe (`DUPLICATE_FILE`)
pego corretamente numa das tentativas. **Nunca** foi testado com um relatório
real de tamanho real — o desenho promete streaming para "centenas de milhares
de linhas" (`mr-ingest/README.md`), e isso segue sem nenhuma medição.

### O que está codado e não sei se ainda está no ar

O `mr-ingest` **não entra no auto-deploy** (aprendizado registrado desde a
REVISÃO 57) — exige Deploy manual próprio no EasyPanel. A última confirmação
de que ele respondia no domínio real é da REVISÃO 60/62 (22/08, CORS por
lista, `sharp` 0.35.3). Desde então houve o redesign do painel (REVISÃO 63–66)
e a troca do Source do serviço `app` de "Github" para "Git" por token expirado
(REVISÃO 72, virou a P73) — **nenhuma das duas mexeu no `mr-ingest` por
desenho**, mas também ninguém voltou a abrir a aba Mega Results logado desde
22/08 para confirmar que a tela de importação ainda fala com o serviço. Sem
acesso de rede neste sandbox para checar `/health` agora.

### O que fica pendente (ver P74, P75, P76 abaixo)

---

**REVISÃO 72 — 25/08/2026 — REVISÕES 70 e 71 CONFIRMADAS NO AR, POR MEDIÇÃO.
E o Source do EasyPanel teve que sair de "Github" para "Git" — o token do
painel expirou.**

**O incidente do deploy.** O primeiro Deploy depois da REVISÃO 70 subiu só ela
(o commit da 71 ainda não existia). O segundo Deploy falhou com:
```
Cannot find public repository and your Github token is invalid
```
Diagnóstico medido antes de mexer em qualquer coisa: `git ls-remote` **sem
credencial nenhuma** contra o repo funcionou e devolveu `main = c867c1a` — ou
seja, **o repo está público e acessível anonimamente**; o problema era só o
token do GitHub guardado dentro do EasyPanel, que expirou (o PAT clássico da
sessão continuava válido — os dois pushes passaram com ele).

**Conserto (ação externa, feita pelo Érico no painel):** no serviço `app`, aba
**Source**, trocado o tipo de **Github** (que depende do token guardado) para
**Git** (clone direto por URL, sem autenticação):
- Repository: `https://github.com/rocketdesignbh-dot/megalinksbr.git`
- Branch: `main` · Build Path: `/frontend`
- Card **Build** não foi tocado (segue Dockerfile / arquivo `Dockerfile`).

**Consequência a lembrar:** como o repo é público, esse modo não precisa de
token e essa classe de falha não volta. Em compensação, se o auto-deploy por
webhook do GitHub dependia da conexão "Github" do EasyPanel, ele
**provavelmente parou** — o que na prática não muda nada, porque o fluxo do
projeto já era Deploy manual (ver "Auto-deploy / CI" no RESUMO histórico, que
já registrava o auto-deploy como não confirmado). **Não medido** se o webhook
ainda dispara.

**MEDIÇÃO do que está no ar** (fetch com `cache:'no-store'` em
`https://www.megalinksbr.com.br/painel/`, feito via navegador, não via status
de build):

| marcador | antes do 2º deploy | depois |
|---|---|---|
| tamanho do arquivo servido | 690.560 B | **694.767 B** |
| `id="prStep2Alert"` (REV 70) | ✅ | ✅ |
| `backendErro` (REV 70) | ✅ | ✅ |
| `prDicaLoja(link,store,backendErro)` (REV 70) | ✅ | ✅ |
| `cloneExtrairDoTexto` (REV 71) | ❌ | ✅ |
| `function _cloneNum` (REV 71) | ❌ | ✅ |
| `veioDoTexto` (REV 71) | ❌ | ✅ |
| aviso "lendo a mensagem que você colou" (REV 71) | ❌ | ✅ |

**Prova de comportamento, não só de presença:** a `cloneExtrairDoTexto` foi
**executada dentro da página servida em produção** (console do navegador em
`/painel/`), com 6 casos. Todos com o resultado pretendido, idênticos ao teste
isolado em Node da REVISÃO 71:

| caso | saída em produção |
|---|---|
| `De R$ 399 por R$ 249` | `AIR FRYER MONDIAL 4L` · 249 / 399 |
| Shein, um preço só | `Balão Calça Jeans Masculina Denim Streetwear` · 129,90 |
| preço + `frete grátis acima de R$ 79` | 249 (frete descartado) |
| dois preços ambíguos | **recusa** — `price: null` |
| CTA "CORRE QUE ACABA" na 1ª linha | pula o CTA, pega `Cafeteira Nespresso Inissia` |
| `De R$ 100 por R$ 200` (invertido) | só 200, recusa o "original" |

**O que continua NÃO medido** (não afirmar que funciona):
- O alerta amarelo da REVISÃO 70 aparecendo **na tela** num fluxo real de
  Postar Agora com link de Shein — o código está no ar e a função existe, mas
  ninguém rodou o fluxo ponta a ponta ainda.
- O Clone Post real ponta a ponta (colar mensagem → resolver → preview
  preenchido → aprovar).
- Se `prGerarLinkAfil` carimba o ID na Shein quando há credencial configurada
  (buraco conhecido desde a REVISÃO 70).

**Pendência de segurança criada nesta sessão:** o PAT clássico usado nos pushes
foi colado no chat e deve ser **revogado e rotacionado** no GitHub. Não foi
feito ainda.

---

**REVISÃO 71 — 25/08/2026 — Clone Post ganhou fallback que lê título e preço do
TEXTO COLADO quando a loja não devolve os dados. Contorna a P44 pelo lado do
Clone Post (não pelo lado do Postar Agora).**

Érico perguntou se, com a Shein sem leitura automática, a única saída seria o
Clone Post. Fui ler o código antes de responder: **não seria** — o
`cloneResolver()` chama a **mesma** `product-search` que já medimos que falha
na Shein. O que o Clone Post faz de único é resolver o link e trocar o ID de
afiliado da origem pelo do usuário (isso funciona na Shein, que já está no
`MARKETPLACE_HOSTS` da `resolve-link`); título/preço/imagem vinham vazios
igual ao Postar Agora.

**A oportunidade que apareceu na leitura:** no Clone Post o usuário cola a
**mensagem inteira do grupo de origem**, que já traz título e preço escritos
ali em texto. O código ignorava isso completamente — só procurava o link
dentro do texto. Érico autorizou implementar.

**Conserto (commit `9b19570`):**
1. Nova função `cloneExtrairDoTexto(texto)` + helper `_cloneNum(s)` (formato BR:
   ponto = milhar, vírgula = decimal).
2. `cloneResolver()` chama o fallback **depois** da `product-search` e preenche
   **só o que ficou vazio** — dado vindo da loja nunca é sobrescrito, porque a
   loja é a fonte melhor. Registra em `veioDoTexto` quais campos vieram do texto.
3. O aviso amarelo do preview agora diz **quais** campos foram lidos do texto e
   pede conferência explícita contra a página do produto (o texto do grupo de
   origem pode estar errado ou desatualizado — risco real, assumido e avisado).

**Disciplina anti-invenção aplicada** (mesma regra do preço da Shein/P32):
- Preço só sai de padrão explícito: `de X por Y` (e **só** aceita o par se
  `X > Y`), `por (apenas) R$ X`, ou **um único** valor em R$ no texto.
- Antes de contar "valor único", descarta linhas com ruído conhecido
  (frete/parcela/sem juros/acima de/mínimo/cupom/cashback/economize).
- **Com dois ou mais valores ambíguos restantes, não chuta** — devolve vazio.
- Título: primeira linha de conteúdo real (sem link, sem ser linha de preço,
  ≥3 letras), com emoji/pontuação decorativa removidos das pontas e linhas de
  CTA (corre/aproveite/clique/oferta/frete/cupom…) puladas.

**MEDIDO** — extrator rodado isoladamente em Node contra 13 casos, todos com o
resultado pretendido:

| caso | resultado |
|---|---|
| `De R$ 399 por R$ 249` | título + 249 / 399 ✅ |
| `De:` e `Por:` em linhas separadas | 179,90 / 299,90 ✅ |
| um preço só (`R$ 89,90`) | 89,90, original vazio ✅ |
| `Por apenas R$ 1.899,00` | 1899 ✅ |
| preço + `frete grátis acima de R$ 79` | 249 (frete descartado) ✅ |
| preço + `10x sem juros de R$ 249,90` | 2499 (parcela descartada) ✅ |
| dois preços soltos genuinamente ambíguos | **recusa, vazio** ✅ |
| CTA "CORRE QUE ACABA" na 1ª linha | pula CTA, pega o título real ✅ |
| `De R$ 100 por R$ 200` (invertido/errado) | só 200, recusa o "original" ✅ |
| sem preço nenhum | título ✅, preços vazios ✅ |

**Não medido em produção ainda** — falta rebuild do EasyPanel e um teste real
do Érico com mensagem de grupo de Shein. Também **não medido**: se
`prGerarLinkAfil` carimba o ID na Shein quando há credencial configurada (o
fallback genérico usa o primeiro campo preenchido como `?ref=`) — segue como
buraco conhecido, ver Última alteração da REVISÃO 70.

**O que isto NÃO resolve:** o Postar Agora continua sem leitura automática de
Shein (lá não existe texto colado pra ler — só o link). A P44 segue aberta
para AliExpress, Magalu, Natura e TerabyteShop no Postar Agora; o que mudou é
que **no Clone Post** essas 5 lojas agora têm uma via de preenchimento
automático que não depende de renderizar JavaScript.

---

**REVISÃO 70 — 25/08/2026 — o alerta de "leitura falhou, preencha manual" era
ESCRITO NUM CONTAINER QUE JÁ ESTAVA OCULTO. Corrigido: alerta agora aparece
de fato no Passo 2, com o motivo real do backend em vez de chute por URL.**

Érico reportou, depois do teste da v29 (REVISÃO 69): "Problema que não vi
escrito como Alerta, para o usuario preencher manualmente". Investiguei o
`frontend/index.html` e encontrei um bug real de DOM, não um problema de
texto/copy:

- `prBuscarProduto()` monta o alerta de falha dentro de `#prBuscarStatus`,
  que vive dentro do card `#prStep1`.
- Mas a chamada a `prPreencherStep2()` — que troca a tela pro `#prStep2` e
  esconde o `#prStep1` — acontece **antes** do bloco que escreve o alerta.
  Resultado: o alerta era escrito dentro de um container que a própria
  função já tinha acabado de esconder. Nunca aparecia na tela, para
  nenhuma loja, não só Shein. O `setTimeout` de 14s escondendo o alerta era
  irrelevante — ele já estava invisível desde o instante em que era escrito.
- Bug secundário (pré-existente, pendência **P50**): mesmo se o alerta
  aparecesse, o texto vinha de `prDicaLoja(link, store)`, que **chuta o
  motivo a partir da URL** (substring match) em vez de ler o `error`/`motivo`
  real que o backend manda em `d.error`/`d.motivo`. Para Shein, isso caía no
  texto genérico "Esta loja não retornou os dados automaticamente" — nunca
  nomeava a Shein.

**Conserto (commit `c7ca7c2`):**
1. Novo `<div id="prStep2Alert">` dentro do card "2️⃣ Dados do produto" do
   Passo 2 (`frontend/index.html`, dentro de `#prStep2 .cb`, antes do bloco
   de foto) — este é o container que o usuário efetivamente vê depois da
   troca de tela.
2. `prBuscarProduto()` agora escreve o alerta de falha em `#prStep2Alert`
   (não mais em `#prBuscarStatus`, que continua existindo só para os avisos
   do Passo 1, ex: "buscando…", "loja detectada").
3. `prBuscarProduto()` captura `d.motivo`/`d.error` da resposta do
   `product-search` em uma variável `backendErro` e passa pra
   `prDicaLoja(link, store, backendErro)`.
4. `prDicaLoja()` ganhou um branch específico pra Shein (nomeia a loja
   explicitamente) e, pra qualquer outra loja sem branch dedicado, agora
   anexa o `backendErro` real ao texto genérico em vez de inventar/omitir.
5. O alerta do Passo 2 fica visível até a próxima busca (não some sozinho
   depois de N segundos) — é limpo no início de toda nova chamada a
   `prBuscarProduto()`.

**Sobre o link encurtado com ID do afiliado** (segundo pedido de Érico no
mesmo recado): confirmado por leitura de código que isso **já funciona
independente de sucesso/falha da leitura** — `prPreencherStep2()` roda
`PR.linkAfil = PR.shortLinkAfil || prGerarLinkAfil(link, PR.loja)` seguido de
`mlEncurtarLink(...)` incondicionalmente, e isso já apareceu correto no
próprio print que Érico mandou (`.../r/b33sdbm`) mesmo com a leitura
automática falhando. **Não medido** o caso extremo: usuário sem nenhuma
credencial/ID configurado pra Shein em Config Afiliados — nesse caso
`prGerarLinkAfil()` cai no fallback genérico que devolve o link **sem**
`ref` nenhum (não gera link "quebrado", mas também não fica com o ID
carimbado). Não é regressão desta sessão; é comportamento pré-existente do
fallback genérico, não verificado especificamente pra Shein.

**Não testado em produção ainda** (sandbox não tem acesso de rede pra
simular o clique real, e a mudança é só frontend — não precisa de redeploy
de Edge Function, só rebuild do EasyPanel). Pendente: Érico rodar o rebuild
no EasyPanel e repetir o teste com o mesmo link da Shein pra confirmar que o
alerta amarelo aparece de fato no Passo 2 com o texto novo.

---

**REVISÃO 69 — 25/08/2026 — a v29 da Shein foi MEDIDA: agora falha limpo em
vez de mentir sucesso. P44 parte 1 fecha como "sem leitura automática viável
hoje", não como "resolvida".**

Érico repetiu o teste no Postar Agora depois do deploy da v29. Resposta:
```json
{"success":false,"store":"shein","motivo":"leitura_falhou","error":"Não consegui ler os dados desse produto na Shein agora. Preencha manualmente — título, preço e foto."}
```
Sem nome, sem imagem, sem preço inventado — exatamente o comportamento
pretendido pelo conserto da REVISÃO 68: a defesa por id de produto e título
genérico rejeitou o resultado do Microlink (a mesma página genérica de antes,
presumivelmente) e a função devolveu falha honesta em vez do falso positivo.

**Onde isso deixa a P44 parte 1:** o código está correto e medido — mas o
resultado prático é que **a Shein não tem leitura automática hoje**, e a
tela cai em "preencha manualmente" como caía antes da REVISÃO 67, só que
agora com uma mensagem que nomeia a loja em vez do texto genérico de "loja
sem integração". A causa de fundo (SPA sem SSR de meta tag + Microlink não
executa JS) não tem conserto barato — exigiria renderizar JavaScript
(Scrape.do com render ou equivalente), que é decisão de custo e não foi
tomada. **Fechando a P44 parte 1 aqui: Shein permanece manual, por decisão
técnica medida, não por falta de tentativa.** AliExpress, Magalu, Natura e
TerabyteShop seguem sem leitor nenhuma — nenhuma das 5 lojas da P44 está
coberta de fato; a diferença é que a Shein agora tem um motivo de recusa
específico (`leitura_falhou`) em vez do genérico.

---

**REVISÃO 68 — 25/08/2026 — a v28 da Shein foi MEDIDA e devolvia dado ERRADO.
Corrigido para falhar direito em vez de mentir. P44 parte 1 continua ABERTA.**

Érico testou a v28 no Postar Agora com link real de produto
(`.../Balao-Men-s-Jeans-...-p-218706267.html`). O resultado veio com
`success:true`, mas `name` era **"Roupas Femininas & Masculinas, Loja de Moda
Online | SHEIN"** — o título da HOME da Shein, não do jeans pedido — e a
imagem era um placeholder SVG em `data:` (ícone de "sem imagem"), não uma
foto. Preço veio ausente, corretamente.

**Causa, lida em `query_logs` (`function_logs`, source real dos `console.log`
das Edge Functions — `function_edge_logs` só tem o request HTTP):**
```
[shein] pagina direta sem og:title — provavel bloqueio ou SPA sem SSR de meta
```
O fetch direto respondeu 200 mas nunca achou `og:title` — a Shein serve a
página do produto como SPA sem renderizar as meta tags no HTML que o servidor
entrega (não é bloqueio de IP, era a hipótese errada da v28). Isso derruba
sempre para o Microlink, que também não executa o JavaScript que monta a
página de produto e devolve a página genérica do site — **mesmo defeito de
fundo da P25** (Shopee avulsa, 31/07: "a Shopee monta a página por
JavaScript", Microlink não cobre).

**Risco real do que aconteceu:** `success:true` com dado errado é pior que
falha — o usuário não percebe e posta o nome da loja como se fosse o do
produto. Falha ele vê e preenche à mão.

**Conserto, `product-search` v29** (commit `8f64734`, deploy confirmado por
`get_edge_function`, versão 55 do projeto): `consultarSheinMicrolink` agora
reprova o resultado do Microlink quando (a) o id do produto
(`-p-<dígitos>.html`) da URL pedida não bate com o da URL que o Microlink
resolveu, ou (b) o título é um dos genéricos conhecidos da Shein (a frase
exata medida acima, entre outras). Imagem em `data:` também é descartada.

⚠️ **O que isso NÃO resolve:** com o fetch direto sempre vazio e o Microlink
sempre genérico pra produto real, a leitura automática da Shein
**provavelmente não funciona na prática** — o conserto só impede que ela minta
sucesso. Não foi testado de novo com link real depois da v29 (falta o
próximo teste do Érico). Ler de verdade exigiria renderizar o JavaScript da
página (Scrape.do com render, ou equivalente) — decisão de custo, não só
código, igual ao caso da Shopee avulsa na P25. **P44 parte 1 continua ABERTA.**

Push: commits `8f64734` (código) e o desta atualização, no `main`.

---

**REVISÃO 67 — 25/08/2026 — Shein passa a ter leitor no Postar Agora
(P44, parte 1 de 5). CODADO E DEPLOYADO — NÃO MEDIDO EM PRODUÇÃO.**

Érico pediu pra ver a parte da Shein hoje. Ela não tinha nenhum leitor no
`product-search` (a Edge Function do Postar Agora) — caía direto em "Loja sem
integração automática. Preencha manualmente." (P44, aberta 04/08). O resto do
caminho (afiliação de link, credencial em Config Afiliados, cadastro) já
funcionava genericamente, então o buraco era só esse.

**O que foi feito:** `product-search` v28, deployada no Supabase (`deploy_edge_function`,
versão 54 do projeto — confirmado lendo o código publicado com `get_edge_function`,
bate byte a byte com o commit). Branch novo `store === "shein"`: leitor genérico
por `og:title`/`og:image` (as mesmas tags que o robô de prévia do WhatsApp lê)
mais preço do JSON-LD (`schema.org Product/offers.price`) quando a página
expõe. Preço é opcional — se o JSON-LD não afirmar um número, devolve título e
foto sem preço, mesma regra do "de" da Shopee (P32): não inventa. Se o fetch
direto não trouxer `og:title`, cai num fallback pelo Microlink, igual ao que o
Mercado Livre já usa.

⚠️ **NÃO MEDIDO EM PRODUÇÃO.** A hipótese não testada é a Shein bloquear o IP
do Supabase (não é raro em loja grande) — se bloquear, o fetch direto falha e
sobra só o Microlink, que também pode falhar se a página for montada por
JavaScript sem SSR das meta tags (foi exatamente o caso que fechou a Shopee
avulsa na P25). **Falta abrir o Postar Agora com um link real de produto da
Shein e ler o resultado na tela** — é a prova que fecha ou reabre a P44 parte 1.
Só backend mexido (Supabase Edge Function); não precisou de rebuild no
EasyPanel.

Commit `ad22026` no `main`. Push feito com PAT fornecido pelo Érico nesta sessão.

AliExpress, Magalu, Natura e TerabyteShop continuam SEM leitor — a P44 só
fecha quando as 5 estiverem cobertas e medidas.

---

**REVISÃO 66 — 23/08/2026 — o SISTEMA VISUAL do painel passa a ser o da landing.
Nenhuma tela foi redesenhada, nenhuma lógica foi tocada.**

Escopo escolhido pelo Érico entre três opções: *só o sistema visual*. Ele foi
respeitado ao pé da letra — o que mudou foram tokens e componentes globais.
Hierarquia, densidade e ordem da informação de cada tela estão idênticas.

### O que mudou, medido antes e depois

| Item | Antes | Depois |
|---|---|---|
| Display / corpo | Plus Jakarta Sans | **Archivo** / **IBM Plex Sans** |
| Dado / mono | JetBrains Mono | **IBM Plex Mono** |
| Raios literais | 148 valores, de 3px a 22px | **143 em 2px**; preservados os 17 `50%` (círculos) e as 4 barras de progresso em `99px` |
| Tokens de raio | `--r:12px --r-sm:8px --r-xs:6px` | todos **2px** |
| Sombras | 33 declarações, incluindo 9 ambientes pesadas e 5 glows | **15 removidas**; sobram só anéis de 1px e os `@keyframes` de pulso, que são **estado**, não decoração |
| `--shadow` / `--glow` | sombra de 32px / glow amarelo de 32px | `none` / anel de 1px |
| Gradientes | 20 | **2** — só a grade de 1px do fundo. As duas manchas radiais (blobs) e os 13 blocos coloridos de 135° saíram |
| Acento | 4 cores (`--volt`, `--pink #FF4D8D`, `--sky`, `--violet`) | **1**: o amarelo. As outras três viraram alias de tokens vivos para não quebrar uso esquecido |
| Selo NEW do menu | rosa, piscando (`animation: pulse-orange 2s infinite`) | chip neutro com régua de 1px, **sem animação** |
| Pesos tipográficos | 30 usos de `font-weight:800/900` | **700** — Archivo carrega 500/600/700; 800 seria falso-negrito sintetizado |

### 🔴 O amarelo não pode ser uma cor só — medido

`--volt #FFC107` como **texto sobre papel** dá **1,37:1**. Ilegível. Como
**preenchimento** com tinta escura por cima dá 11,11:1. Testei seis candidatos:
nenhum amarelo único passa nos dois papéis — o mais escuro que passa como texto
(`#8A6300`, 4,56:1) já reprova como fundo (3,33:1).

Saída: **`--volt-tx`**, um segundo token para quando o acento vira texto ou
traço. No escuro é igual ao `--volt`; no claro escurece para `#8A6300`. Foram
76 usos convertidos (74 `color:`, 2 `stroke:`) — e a conversão foi feita por
papel, não por busca-e-troca cega: `background:var(--volt)` ficou intacto.

### 🔴 Defeito achado no caminho: marcação dupla nos cards de plano

Cada linha de benefício mostrava **dois** marcadores: o `✓` que o CSS já punha
por `::before` e um `✅`/`❌` embutido no próprio texto da string. O CSS já tinha
o mecanismo certo (`.plan ul li` / `li.no` com `✓` e `×`) e ele estava ocioso.
Agora o emoji sai do texto e o estado vira **classe** — um marcador só, e o item
não-incluído fica esmaecido. Informação codificada na forma, não repetida.

Junto saiu o **círculo colorido com emoji** de cada plano (⚡🚀🔥👑), que está na
lista do que não fazer. No lugar, um ladrilho quadrado com o grau do plano em
mono: **I, II, III, IV** — que carrega informação verdadeira (a ordem dos
tiers), coisa que o emoji não carregava.

### Contraste da paleta nova

| | escuro | claro |
|---|---|---|
| `--tx` sobre `--surf` | 13,82 | 16,49 |
| `--tx2` sobre `--surf` | 6,49 | 7,52 |
| `--mut` sobre `--bg` | 5,07 | 4,74 |
| acento sobre fundo | 11,11 | 4,56 (via `--volt-tx`) |

Tudo acima de 4,5:1.

### O que foi medido

- **26 telas percorridas** uma a uma (17 de afiliado + 9 de admin), nos dois
  temas: **zero erro de página**.
- `tools/rota-real.mjs`, `rota-test`, fluxo de recovery, cupom e UTM: **todos
  passam** — o roteamento não foi afetado.
- `tools/smoke-index.mjs`: 1 erro, **idêntico ao baseline** (o defeito
  pré-existente do bloco 2).
- Sem overflow horizontal em 390 / 834 / 1440, na landing e no painel.
- Capturas antes/depois de 6 telas, nos dois temas.

### ⚠️ O que NÃO foi medido nesta revisão

- 🔴 **A tipografia não pôde ser vista.** O sandbox não alcança o Google Fonts,
  então tudo que renderizei usou fonte de fallback. **Archivo e IBM Plex só
  serão vistas de verdade no navegador do Érico, depois do Deploy.** Se o
  carregamento falhar, o sintoma é o painel com cara de Arial.
- Telas com dado real e volume (Radar cheio, fila de clones, tabelas de admin
  populadas) — o sandbox não tem sessão.
- iOS Safari.

### O que ficou de propósito

O **emoji no texto** das telas (`Boa tarde ⚡`, `🚀 Postar Agora`, os botões
`⚡ PIX AVULSO`, `💳 Cartão`, `🔁 Pix recorrente`). É copy, não token, e mexer
nisso é uma passada própria — fora do escopo que o Érico definiu.

---

### REVISÃO 65 — registro anterior


**REVISÃO 63 — 23/08/2026 — REDESIGN. A raiz deixa de ser o painel: nasce uma
landing pública em `frontend/landing.html`, e cada aba do painel passa a ter URL
própria em `/painel/<aba>`.**

### O que estava no ar, medido antes de mexer

- A home de `megalinksbr.com.br` era **uma imagem**: `boas-vindas-pc.png`,
  **1,35 MB** (2,8 MB somando a versão de celular), exibida como splash em cima
  do gate de login. Todo o texto de venda — título, benefícios, marketplaces,
  oferta de 7 dias — era pixel: nada indexável, nada redimensionável, nada
  editável sem abrir editor de imagem. O botão "Criar minha Conta" cobria a
  frase de fechamento (medido em Chromium 1440×900).
- Na **segunda visita** o splash não aparecia mais (`ml_splash_visto` no
  `localStorage`) e a raiz servia um card de login solto no escuro. Não havia
  página de produto, de preço, de recurso ou de caso de uso.
- `sitemap.xml` tinha **3 URLs**: raiz, termos, privacidade.
- `go(page)` só ligava/desligava a classe `.on` nas `<section class="page">`.
  **A URL nunca mudava** → o histórico tinha uma entrada só, Voltar saía do site
  e nenhuma tela era favoritável.
- Os **25 itens de menu eram `<div>`** com `addEventListener("click")`: sem
  foco, sem Enter, sem abrir em nova aba. **2** atributos `aria-` em 11.576
  linhas.
- A imagem afirmava *"Milhares de usuários confiam e aprovam a MegaLinks"* —
  prova social que ninguém mediu.

### O que mudou

1. **`frontend/landing.html` (novo).** Landing pública em HTML, servida na raiz.
   Sem Supabase, sem o bundle do painel. Direção de arte escolhida pelo Érico
   ("Sala de Despacho"): grafite como tinta, papel claro entrando como banda
   editorial, régua de 1px, raio 2px, **zero sombra e zero glow**, amarelo só
   como estado. Tipografia **Archivo + IBM Plex Sans + IBM Plex Mono** (não
   Inter). Conteúdo: hero com registro de despacho, a rotina manual em 7 passos,
   o diagrama de rota, as seis peças da operação, a tabela de planos com os
   preços reais do `PLAN_FALLBACK`, FAQ e CTA.
2. **Roteador de URL no `index.html`.** `go()` foi **envolvido**, não reescrito:
   continua fazendo exatamente o que fazia e passou a escrever
   `/painel/<aba>` no histórico. Novos: `rotaDaURL`, `rotaEscrever`,
   `rotaTitulo`, `rotaAplicarEntrada`, `rotaClique` e um listener de `popstate`.
   **History API, não hash** — o hash é do Supabase (recovery e OAuth) e
   colidiria.
3. **Os 25 `<div class="nav">` viraram `<a href="/painel/…">`.** Ctrl/Cmd/Shift
   e botão do meio abrem em aba nova de verdade; Tab e Enter funcionam.
4. **O splash em PNG foi removido** do `index.html` (markup, CSS e boot). O
   conteúdo dele agora é texto na landing. As duas imagens continuam no repo e
   no `COPY` do Dockerfile, mas ninguém mais as referencia — remover é limpeza
   opcional de 2,8 MB.
5. **Gate de login redesenhado** na mesma linguagem: duas colunas em ≥940px
   (registro de despacho à esquerda, formulário à direita), `banner.jpg`
   trocado por lockup tipográfico, raio 2px, sem glow, e link "← Voltar ao
   site". `authGate.style.display` passou de `"flex"` para `"grid"` nos 5
   pontos onde aparece.
6. **nginx:** `location = /` serve `landing.html`; `location /painel` serve o
   `index.html` para qualquer sub-caminho.
7. **P49 endereçada:** `Cache-Control: no-cache, must-revalidate` em toda
   location de HTML. Os assets seguem cacheáveis.
8. **Caminhos relativos viraram absolutos** — ver o defeito abaixo.

### 🔴 O defeito que a mudança de URL criou, e que foi pego medindo

`index.html` carregava `onboarding.css`, `onboarding.js`,
`exemplo-postagens.js` e `exemplo-configuracao.js` por caminho **relativo**. Em
`/painel/radar` o navegador resolvia para `/painel/onboarding.js`, que o nginx
devolve como `index.html` — e o console enchia de
`Uncaught SyntaxError: Unexpected token '<'`. **O onboarding inteiro quebraria
em qualquer URL profunda.** Os quatro viraram absolutos (`/onboarding.js`…).
Medido: em `/painel/radar`, os 7 recursos voltam 200 e a página fica com **zero
erro**.

### 🔴 Duas regressões de atribuição, evitadas antes de irem ao ar

Com a raiz deixando de ser o `index.html`, dois caminhos que dependiam dela
morreriam calados:

- **`?cupom=CODIGO`** (link de influencer) era capturado por um IIFE no
  `index.html` e gravado em `ml_cupom_pendente`. A captura foi **replicada na
  landing** — mesma chave, mesmo `localStorage`, mesma origem. Medido: entrar em
  `/?cupom=maria10`, clicar no CTA e o campo "Código do cupom" já chega
  preenchido com `MARIA10`.
- **`utm_*`** só é gravado no perfil **no momento do cadastro**, que acontece
  dentro do painel. Se a landing não repassasse, todo tráfego de campanha
  chegaria sem origem. A landing agora **anexa `utm_*`, `cupom`, `gclid` e
  `fbclid` a todo link `/painel…`**. Medido ponta a ponta.

Além disso, `rotaAplicarEntrada()` **limpa a query** ao escrever `/painel/<aba>`
— por isso ela é chamada **no fim** do `afterLogin`, depois do deep link
`?admin=vip` ter lido `location.search`. Inverter essa ordem quebra o atalho do
Cadastro VIP.

### O que foi medido, e como

Tudo em Chromium (Playwright), contra **nginx de verdade** rodando a config
extraída do `frontend/Dockerfile` — não contra servidor estático.

| # | Verificação | Resultado |
|---|---|---|
| 1 | `nginx -t` na config do Dockerfile | sintaxe ok |
| 2 | `/` serve a landing, `/painel` e `/painel/radar` servem o painel | 200 nos três, títulos corretos |
| 3 | `Cache-Control` | `no-cache` em `/`, `/painel`, `/painel/radar`, `/guia`, `/termos.html`; ausente em `.js` e `.png` |
| 4 | Entrar por `/painel/radar` | abre `page-radar`, título "Radar de Ofertas · Mega Links BR" |
| 5 | Dois cliques no menu → **Voltar** duas vezes | `/painel/cupons` → `/painel/clone-post` → `/painel/radar`, com a aba certa em cada passo |
| 6 | **Avançar** | volta para `/painel/clone-post` |
| 7 | **F5** em `/painel/clone-post` | reabre na mesma aba |
| 8 | Rota inexistente e rota `adm-` sem `IS_ADMIN` | caem em `/painel/dashboard` |
| 9 | Tab + Enter no menu | navega |
| 10 | Recovery na raiz (`#access_token`, `?code=&type=recovery`) | encaminhado para `/painel` com query e hash preservados |
| 11 | `?utm_source=insta` sozinho | **não** encaminha — fica na landing |
| 12 | `?cupom=maria10` ponta a ponta | campo preenchido no cadastro |
| 13 | Erros de página em `/painel/radar` | **0** |
| 14 | `tools/smoke-index.mjs` | 1 erro, **idêntico ao baseline** antes das mudanças (`String.prototype.includes` com regex, defeito pré-existente no bloco 2) |
| 15 | `node --check` nos 5 blocos inline do `index.html` e nos 2 da landing | todos OK |
| 16 | Overflow horizontal em 390 / 834 / 1440 px | nenhum, na landing e no painel |
| 17 | Contraste | `--mut` estava em **3,68:1** (reprovado); subiu para `#828891` = **5,07:1**. Rótulos sobre papel: **4,74:1** |

### 🔴 REVISÃO 64 — o roteador foi ao ar com um defeito, e a sessão real o achou

Deploy feito em 23/08. A landing subiu certa (título, fontes, `Cache-Control:
no-cache` em todo HTML, assets sem cache, 0 caminho relativo no `index.html`
servido, 25 navs como `<a>`, splash ausente). **Mas entrar em `/painel/radar`
logado caía no Dashboard.**

**A causa, lida no código depois de reproduzir:** o `afterLogin` chama
`setRole("afiliado")`, que chama `go("dashboard")`, que já reescreve a URL para
`/painel/dashboard`. O `rotaAplicarEntrada()` roda **depois** disso (de
propósito — precisa vir após os deep links terem lido a query) e lia
`location.pathname` naquele momento. O pedido original do usuário já tinha sido
apagado por um `pushState` do próprio roteador.

**Por que os testes da REVISÃO 63 não pegaram:** eles chamavam
`rotaAplicarEntrada()` à mão, a partir de um estado em que a URL ainda era a de
entrada. Nunca reproduziram a **ordem real** do `afterLogin`. Era exatamente o
item "sessão logada de verdade" que a própria REVISÃO 63 listou como não medido.

**O conserto:** a aba pedida passa a ser capturada em `ROTA_ENTRADA`, uma const
avaliada **na carga do script**, antes de qualquer coisa poder reescrever a URL.
O `rotaAplicarEntrada()` usa o valor capturado, não o `location` do momento.

**Prova, com baseline.** Teste novo (`rota-real.mjs`) que reproduz a ordem
`setRole → rotaAplicarEntrada`:

| entrada | URL depois do setRole | final, código ANTIGO | final, código NOVO |
|---|---|---|---|
| `/painel/radar` | `/painel/dashboard` | `/painel/dashboard` ❌ | `/painel/radar` ✅ |
| `/painel/clone-post` | `/painel/dashboard` | `/painel/dashboard` ❌ | `/painel/clone-post` ✅ |
| `/painel/link-rapido` | `/painel/dashboard` | `/painel/dashboard` ❌ | `/painel/link-rapido` ✅ |
| `/painel` | `/painel/dashboard` | `/painel/dashboard` ✅ | `/painel/dashboard` ✅ |
| `/painel/nao-existe` | `/painel/dashboard` | `/painel/dashboard` ✅ | `/painel/dashboard` ✅ |
| `/painel/adm-usuarios` (não-admin) | `/painel/dashboard` | `/painel/dashboard` ✅ | `/painel/dashboard` ✅ |

**Aprendizado, para não repetir:** testar uma função de boot chamando-a à mão
não prova nada sobre o boot. O que prova é reproduzir a ordem em que ela é
chamada de verdade.

### ✅ REVISÃO 65 — provado em produção, logado, no navegador do Érico

Segundo Deploy feito. Medido na sessão real, no domínio real:

| # | Verificação | Resultado |
|---|---|---|
| 1 | `/painel/radar` digitado na barra | abre o **Radar**, com as 120 ofertas reais carregadas — o defeito da REVISÃO 64 está fechado |
| 2 | Clicar Clone Post → Cupons | `/painel/clone-post` → `/painel/cupons`, aba certa em cada |
| 3 | **Voltar** duas vezes | `/painel/clone-post` → `/painel/radar` |
| 4 | **Avançar** | `/painel/clone-post` |
| 5 | F5 em `/painel/clone-post` | reabre no Clone Post |
| 6 | `/painel/link-rapido` | abre o Link Rápido |
| 7 | Console | **nenhum erro** em duas telas |
| 8 | Cabeçalhos no domínio | `no-cache` em `/`, `/painel`, `/painel/*`, `/guia`; ausente em `/onboarding.js` |
| 9 | `index.html` servido | 0 caminho relativo, 4 absolutos, 25 navs como `<a>`, splash ausente |
| 10 | Landing na raiz | título e fontes corretos; topo mostrou "Voltar ao painel" (detecção de sessão) |

**Defeito cosmético achado e corrigido na mesma passada:** os selos do menu
(`.tag` — NEW, QR, live e contadores) faziam parte do `textContent` do item e
vazavam para o `<title>`: *"Link RápidoNEW · Mega Links BR"*. Atingia 5 abas
(Postar Agora, Link Rápido, Mega Results, Conexão WhatsApp, Fila de Posts).
`rotaTitulo()` passa a clonar o nó e remover os `.tag` antes de ler o texto.
**Deployado e reconferido em produção, logado:** as 25 abas devolvem título
limpo e a aba do navegador mostra `Link Rápido · Mega Links BR`. Console limpo.

### ⚠️ O que NÃO foi medido — e é o que fecha esta revisão

- **Nada disso está em produção.** Falta o push e o **Deploy** no EasyPanel.
- **Recuperação de senha real.** O encaminhamento raiz → `/painel` foi provado
  com URL sintética. Falta um e-mail de reset de verdade, clicado pelo Érico.
- **Login com Google real.** Mesmo caso: o retorno do OAuth cai na raiz.
- **Sessão logada de verdade.** Todos os testes de rota rodaram com o gate
  escondido à mão, porque não há sessão no sandbox. Falta um login real e
  navegar as abas.
- **Site URL / Redirect URLs no Dashboard do Supabase.** Continuam apontando
  para a raiz e a landing encaminha — mas trocar para `/painel` seria mais
  direto. **Ação externa: decisão do Érico.**
- **iOS Safari.**
- **Peso real com o gzip do nginx.**

### 📐 `docs/DIRECAO_VISUAL.md` (novo) — a fonte de verdade de design

Tokens, tipografia, forma, composição, motion e a lista do que não fazer. Quem
for mexer em tela lê esse arquivo antes. Ele registra também **onde o guia
`coding/prompting_for_frontend_aesthetics.ipynb` do cookbook e o brief do Érico
discordam, e quem vence** (fundo com gradiente e tipografia em extremos: o brief
vence). E registra o estado da migração: landing e gate prontos, as 27 telas do
painel ainda no visual antigo.

Depois de ler o guia do cookbook, duas coisas foram aplicadas à landing:
**entrada orquestrada do hero** (as linhas do log entram uma a uma — é o produto
acontecendo, não enfeite) e **profundidade sem gradiente colorido** (réguas
verticais de 1px com máscara, papel milimetrado).

### 🟡 Conflito encontrado no caminho — `clone_sources_max` do Pro

O `PLAN_FALLBACK` do `index.html` diz **`pro: clone_sources_max: 1`** e
`clone_post: true`. A tabela de Planos deste arquivo diz **Pro = 0 fontes de
clone**. Os dois não podem estar certos. A tabela de planos da landing foi
escrita a partir do **código**, que é o que o usuário efetivamente recebe. Fica
aberto como **P66**.

---

### REVISÃO 62 — registro anterior

**REVISÃO 62 — 22/08/2026 (noite, 23:29 BRT) — sem código. A P63 FECHA: o painel
logado buscou o wa-engine do domínio real, atravessando o CORS novo.**

### A prova, e por que a tela vale mais que o console aqui

O Érico abriu **[Admin] Instâncias & Canais** logado e mandou a captura: KPI
**SESSÕES ONLINE 4**, **OFFLINE (24h) 0**, e as quatro linhas da tabela com
número, `connected` e última atividade `23/08/2026 02:29:32`.

Essa tela é servida por `renderInstancias()`, que faz
`fetch(`${WA_ENGINE_URL}/sessions`)` **do navegador**, com `Authorization:
Bearer`. Ou seja: é requisição **cross-origin** de `www.megalinksbr.com.br` para
`megalinksbr-wa-engine.fwezsn.easypanel.host`, exatamente o caminho que a
REVISÃO 56 restringiu.

**O caminho de falha dessa função é explícito e não é silencioso:** o `catch`
escreve *"Não foi possível conectar ao wa-engine: …"* na tabela. Se o CORS
tivesse barrado, a captura mostraria essa frase — e não quatro linhas com
telefone e status. É por isso que aqui a tela prova mais do que o console: o erro
teria virado texto na página.

Os quatro números batem com o `sessions: 4, connected: 4` que o `/health` vinha
devolvendo a noite toda por `pg_net`, **sem** `Origin` — os dois caminhos, o de
navegador e o de servidor, concordam.

### O que isso fecha e o que NÃO fecha

✅ Fecha a P63: os quatro itens estão no ar, medidos, e a tela que depende do
CORS funciona no domínio real.

⚠️ **Não foi exercitado:** parear um número novo, desconectar sessão, e as telas
do `mr-ingest` (importação de relatório). São outros endpoints do mesmo CORS,
com a mesma lista de origens — o mecanismo é o mesmo, mas *"o mecanismo é o
mesmo"* é inferência, não medição. Se algum deles falhar, o sintoma será erro de
CORS no console, e a saída é acrescentar a origem à `ALLOWED_ORIGINS` no
EasyPanel, sem tocar em código.

---

**REVISÃO 61 — 22/08/2026 (noite, 23:25 BRT) — sem código. A última ponta da P65
não é esquecimento nem decisão técnica: é PLANO. Registrada e adiada pelo Érico.**

A proteção contra senha vazada (checagem contra o HaveIBeenPwned) fica em
Authentication → Sign In / Providers → **Email**, e não em "Policies" — anotado
porque a busca no lugar errado custou tempo. **Só que ela exige plano Pro ou
acima**, e o projeto está abaixo disso: o Érico abriu a tela em 22/08 e o
controle veio travado com selo de upgrade.

**Decisão dele, na mesma hora: adiar até haver upgrade.** Não é dívida esquecida,
é dívida com causa conhecida e fora do nosso alcance — mesma família da P10
(Scrape.do Hobby quando a receita permitir).

⚠️ **O que isso significa na prática, para ninguém se surpreender depois:** senha
que já vazou em outro site continua sendo aceita no cadastro do Mega Links.
Quando o upgrade acontecer, **ligar isto é um passo do checklist do upgrade**, não
uma tarefa nova a ser redescoberta.

---

**REVISÃO 60 — 22/08/2026 (noite, 23:14 BRT) — só medição. O `sharp` em execução
foi LIDO do container: `0.35.3`. A P63 fica sem esse cabo solto.**

### 🔴 Correção de data das REVISÕES 58 e 59

As duas se dataram como **"23/08, madrugada"**. Está errado, e o erro é sempre o
mesmo: elas leram o relógio em **UTC**. O banco lido agora responde
`2026-08-22 23:15` em São Paulo — **noite de 22/08**, não madrugada de 23. Os dois
cabeçalhos foram corrigidos. É a terceira vez que isto acontece no projeto (a 53
corrigiu a 52, a 40 corrigiu a 39). **A regra continua a mesma, e continua sendo
desobedecida: não inferir data, ler — e ler no fuso de quem usa o sistema.**

### ✅ A medição

Lido no `/health` do host real, 67 s depois do reinício do merge:

```
{"ok":true,"uptime":67.7,"sessions":4,"connected":4,
 "versoes":{"node":"v20.20.2","sharp":"0.35.3","vips":"8.18.3"}}
```

| o que se queria saber | resposta |
|---|---|
| o `sharp` que está carregado | **0.35.3** — acima do `<0.35.0` das CVEs do libvips (GHSA-f88m-g3jw-g9cj) |
| o `libvips` que veio junto | **8.18.3** |
| o Node do container | **v20.20.2**, acima do `>=20.9` que o sharp 0.35 exige |
| o build reusou `node_modules` do cache? | **não** — se tivesse reusado, viria `0.33.5` |
| as sessões sobreviveram ao reinício | **4 de 4 conectadas** |

**Isto era dedução e virou medição.** A REVISÃO 57 registrou o item como aberto
exatamente por não haver rota que dissesse a versão; a 59 criou a rota e esta
leitura fecha. Sobra da P63 **só o painel logado exercitado no navegador** — que é
tela, e ninguém abriu ainda.

---

**REVISÃO 59 — 22/08/2026 (noite, ~23:08 BRT) — o `/health` do wa-engine passa a dizer
qual `sharp` está EXECUTANDO. Três linhas, para trocar dedução por medição.**

### Por que isto existe

A REVISÃO 56 subiu o `sharp` para `^0.35.3` por causa das CVEs do libvips, e a
57 fechou com um buraco honesto: **o container subiu, logo o build passou — mas
nenhuma rota expunha a versão carregada.** "Build passou" e "o binário certo está
em memória" não são a mesma frase: cache de camada do Docker reusa `node_modules`,
e `package.json` pede, não garante.

O `/health` agora devolve `versoes: { node, sharp, vips }`, lidos de
`sharp.versions` — quem está em memória, não o que o `package.json` pede.

### O que foi medido em bancada

O trecho novo foi executado com o `sharp` de verdade instalado:
`{"sharp":"0.35.3","vips":"8.18.3"}`. ⚠️ Isso é o sandbox (Node 22), **não** o
container. Quem responde de verdade é o `/health` do host real depois do Deploy —
e é essa leitura que fecha o item.

### O que esperar depois do merge

`GET https://megalinksbr-wa-engine.fwezsn.easypanel.host/health` tem que trazer
`"sharp":"0.35.x"` e `"node":"v20.x"`. Se vier `0.33.5`, o build reusou
`node_modules` do cache e a correção da P63 **não** está no ar — o que seria
exatamente o tipo de coisa que "status 200 não é prova" existe para pegar.

---

**REVISÃO 58 — 22/08/2026 (noite, ~23:00 BRT) — P65 QUASE FECHADA, e o item que estava
catalogado como "higiene de lint" era o SEGUNDO buraco mais grave da noite:
qualquer pessoa com a chave anon fazia o BANCO buscar URL arbitrária.**

### 🔴 A extensão `http` no `public` não era higiene — era SSRF, e foi medida

A extensão `http` (pgsql-http) estava instalada no schema `public`, e o `EXECUTE`
default do Postgres deixava `anon` e `authenticated` chamarem `http_get`,
`http_post`, `http_put`, `http_delete` **pelo PostgREST**.

Medido em 23/08 com a **chave anon pública**, `POST /rest/v1/rpc/http_get` com
`{"uri":"https://example.com"}`:

| momento | resposta |
|---|---|
| antes | **HTTP 200** com `status`, `content_type` e os **cabeçalhos da página buscada** |
| depois do `drop extension http` | **HTTP 404** — `PGRST202`, função não existe |

Ou seja: o banco fazia a requisição e **devolvia o corpo a quem pediu**. A leitura
de site externo é o caso simpático; o caso feio é URL que só o banco alcança.
Foi anotado como 🔵 na REVISÃO 54 porque o advisor chama isso de
`extension_in_public` — **o rótulo do lint escondeu o tamanho da coisa. Lição:
lint não classifica risco, ele aponta lugar.**

**Por que `DROP` e não "mover de schema":** nada usa. Nenhuma função do banco
referencia `http_get`/`http_post` (a varredura em `pg_proc` só achou o helper do
próprio pg_net), e o repo não cria nem chama a extensão. Quem faz HTTP aqui é o
**pg_net** (`net.http_post`), que vive em `extensions` e **não** é exposto ao
PostgREST. O `drop` foi **sem `CASCADE` de propósito**: se algum objeto
dependesse dela, o comando falharia em vez de derrubar o dependente junto.

### ✅ `search_path` fixo nas sete funções

`alter function ... set search_path to 'public', 'pg_temp'` em
`whatsapp_idle_grace_minutes`, `whatsapp_heartbeat_grace_minutes`,
`mr_touch_updated_at`, `normalizar_telefone_br`,
`trg_normalizar_telefone_profile`, `wa_aviso_dias` e `wa_corte_dias`.

⚠️ **Dimensão honesta:** as sete são `SECURITY INVOKER`. Não havia escalada de
privilégio a fechar — é endurecimento contra resolução de nome por schema de
terceiro, não buraco medido.

Conferido depois, com as funções chamadas de verdade: `wa_aviso_dias` **21**,
`wa_corte_dias` **28**, `whatsapp_idle_grace_minutes` **30**,
`normalizar_telefone_br('31 99999-8888')` → **`+5531999998888`**. Nenhuma quebrou.

### ✅ O placar do advisor depois

`function_search_path_mutable`: **7 → 0**. `extension_in_public`: **1 → 0**.
Funções sem `search_path` no `public`: **0**. Extensões no `public`: **0**.

### ⚠️ O que sobra da P65 — e não é nosso código

**Proteção contra senha vazada, desligada no Supabase Auth.** É botão no
Dashboard (Authentication → Policies), ação externa do Érico. Enquanto não for
ligada, senha já vazada em outro site é aceita no cadastro.

Os avisos de `SECURITY DEFINER` executável que sobraram no advisor são os que já
foram lidos um a um nas REVISÕES 54 e 55: ou têm checagem de identidade no corpo,
ou são funções de gatilho que falham quando chamadas por RPC. **Não são pendência
nova — são o resíduo esperado do lint.**

---

**REVISÃO 57 — 22/08/2026 (noite, 22:53 BRT) — só medição. A P63 está NO AR nos
três serviços e foi medida em produção. Nenhuma linha de código.**

### ✅ `wa-engine` — subiu com o código novo, e o boot é a prova das variáveis

Lido no `/health` do host real logo depois do merge: `uptime` **20 s**,
**4 sessões, 4 conectadas**. Quatro minutos depois, `uptime` **229 s**, ainda
**4/4** — as sessões de WhatsApp sobreviveram ao reinício do auto-deploy.

**O `uptime` baixo com `ok:true` é o que prova que `SUPABASE_URL` e
`SUPABASE_KEY` existem no EasyPanel.** A REVISÃO 56 tirou o default e fez o
processo sair no boot sem elas; se faltassem, não haveria `/health` para ler.
É a inversão útil da regra do repo: aqui *não* estar no ar seria a prova
contrária, e ele está.

### ✅ CORS medido no host real, três requisições iguais mudando só o `Origin`

| `Origin` enviado | `access-control-allow-origin` devolvido |
|---|---|
| `https://www.megalinksbr.com.br` | **o próprio domínio** + `Vary: Origin` |
| `https://megalinksbr.com.br` | **o próprio domínio** + `Vary: Origin` |
| `https://evil.example.com` | **nenhum cabeçalho** |
| nenhum (Edge Function, cron, heartbeat) | nenhum cabeçalho, `200` normal |

Vale para o **`wa-engine`** e para o **`mr-ingest`**, medidos separadamente.

⚠️ **O `mr-ingest` NÃO entra no auto-deploy.** Depois do merge ele ainda
respondia `*` com `uptime` de **11,4 dias** — o auto-deploy da P4/P16 mexe no
`app` e no `wa-engine`, não nele. Só depois do Deploy manual do serviço
(`uptime` 40 s) o CORS novo apareceu. **Guardar isto: mudança no `mr-ingest`
exige Deploy próprio, sempre.**

### ✅ Frontend — o `onboarding.js` servido pelo domínio já é o escapado

Buscado em `https://www.megalinksbr.com.br/onboarding.js` com bust de cache:
contém `const esc = (v)`, `${esc(title)}` e `${esc(step.title)}`, e **não**
contém mais o `${step.title}` cru. 11.909 bytes.

### ⚠️ O que continua sem prova

- **A versão do `sharp` em execução.** O container subiu, então o build passou —
  mas nenhuma rota do engine expõe a versão instalada, então "está no 0.35.3" é
  dedução. Fecha lendo a linha do `sharp` no log do build, ou expondo a versão
  no `/health` numa próxima sessão.
- **O painel logado exercitado.** Conectar/listar sessões pelo navegador, no
  domínio real, com o console limpo. O `/health` prova o servidor; não prova a
  tela.

---

**REVISÃO 56 — 22/08/2026 (noite) — P63 CODADA E PROVADA EM BANCADA. Falta o
Deploy e a medição em produção, então ela NÃO fecha aqui.**

### O que mudou, nos quatro arquivos

| arquivo | mudança |
|---|---|
| `wa-engine/server.js` | CORS deixa de ser `*`: lista vinda de `ALLOWED_ORIGINS`, com `https://www.megalinksbr.com.br` e `https://megalinksbr.com.br` como padrão. Origem recusada vira `console.warn` |
| `wa-engine/server.js` | `SUPABASE_URL` e `SUPABASE_KEY` perdem o default hard-coded e passam a ser exigidos no boot, igual ao `WA_ENGINE_TOKEN` |
| `wa-engine/package.json` | `sharp` de `^0.33.5` para `^0.35.3` |
| `mr-ingest/src/server.js` | mesmo tratamento de CORS |
| `frontend/onboarding.js` | `esc()` em título, conteúdo e rótulos de botão dos dois `innerHTML` |

⚠️ **Pré-requisito já cumprido, e ele era a parte perigosa:** o Environment do
`wa-engine` no EasyPanel tinha **só** `WA_ENGINE_TOKEN`, `PORT` e
`SCRAPE_DO_TOKEN` — conferido pelo Érico em 22/08. Sem criar as duas variáveis
antes, o merge sozinho derrubaria o engine no boot (P4/P16: todo push reinicia o
container). Ele criou `SUPABASE_URL` e `SUPABASE_KEY` **antes** deste push.

### O que foi medido — em bancada, não em produção

- **CORS:** o bloco foi lido **do próprio arquivo** e executado com requisições
  falsas. Painel com e sem `www` recebe `Access-Control-Allow-Origin` de volta;
  `evil.example.com` não recebe nada e o preflight dele leva **403**; requisição
  **sem `Origin`** (Edge Function, cron, heartbeat) segue adiante intacta —
  CORS só existe no navegador, e é por isso que nada de servidor quebra.
- **`sharp`:** `npm audit` com lockfile gerado para o `wa-engine` acusa
  `sharp <0.35.0` **high**, quatro CVEs herdadas do libvips
  (GHSA-f88m-g3jw-g9cj). Com `0.35.3` instalado, o pipeline exato do
  `conteudoDeImagem` (resize contain → flatten → jpeg 85 → buffer) devolveu
  `jpeg 800x800`. O `sharp` 0.35 exige **Node ≥ 20.9** e o Dockerfile é
  `node:20-slim` — isso foi **lido, não medido**; quem confirma é o log do build.
- **`onboarding.js`:** rodado com jsdom nos dois lados. Com o arquivo de **antes**,
  `<img src=x onerror=…>` vira **nó real no DOM**; com o de agora, nenhum `img`
  entra e o título aparece como texto literal. ⚠️ O `onerror` **não disparou em
  nenhum dos dois** porque o jsdom não busca imagem: a **injeção** está provada,
  a **execução** não. E segue valendo que hoje esses textos são nossos, não do
  usuário — é trava preventiva, não vazamento observado.

### O que falta, e é o que fecha a P63

1. **Deploy** do `wa-engine` e do frontend (e do `mr-ingest`, se estiver no ar).
2. **Ler o log do boot do `wa-engine`:** tem que aparecer
   `[CORS] origens permitidas: …` e **nenhum** `SUPABASE_URL não configurado`.
   Se o container sair no boot, é variável faltando — não é o código.
3. **Exercitar o painel logado:** conectar/listar sessões de WhatsApp continua
   funcionando do domínio real, e o console sem erro de CORS.
4. **Ler o log do build** para confirmar que o `sharp 0.35.3` compilou no Node 20.

---

**REVISÃO 55 — 22/08/2026 (fim de tarde) — P64 FECHADA: um usuário comum logado
mexia no WhatsApp de outro usuário. Medido em transação com rollback, consertado
e remedido.**

### 🔴 O que foi medido — e não foi por leitura de código, foi por execução

Três funções `SECURITY DEFINER` estavam executáveis por `authenticated` sem
nenhuma checagem de identidade no corpo. Exercitado dentro de `begin ... rollback`,
com `set local role authenticated` e `request.jwt.claims` de um usuário **comum**
(não admin), agindo sobre instâncias de **outros** usuários:

| chamada | efeito medido |
|---|---|
| `recalc_whatsapp_idle_state(<user_id alheio>)` | `idle_since` do alvo foi de **nulo → agora** — é o carimbo que a `wa-idle-reaper` usa depois para desconectar |
| `mark_whatsapp_activity(<user_id alheio>)` | `idle_since` do alvo (2026-08-13) foi para **nulo** |

Ou seja: qualquer cliente logado podia **empurrar o WhatsApp de outro cliente
para a fila de desconexão**, ou tirar de lá. Nada disso aparece em tela; a
transação foi desfeita com `rollback` e nenhum dado ficou alterado.

A terceira, `influencer_monthly_performance()`, devolvia a **todos os logados**
nome, e-mail (`coalesce(full_name, email, ...)`) e conversão de todos os
influenciadores. ⚠️ **Hoje ela vem vazia por falta de dado, não por proteção:**
há 1 parceiro e **0 resgates**, e o `having count(r.id) > 0` zera o resultado. O
buraco enchia sozinho no dia do primeiro resgate.

### ✅ O conserto — migration `p64_fecha_rpc_definer_sem_checagem`

- **`mark_whatsapp_activity` e `recalc_whatsapp_idle_state`:** `REVOKE EXECUTE` de
  `public`, `anon` e `authenticated`. **Único chamador de cada uma é gatilho** —
  `trg_scheduled_posts_mark_activity` e `trg_niche_groups_recalc_idle`, ambos
  `SECURITY DEFINER` de dono `postgres` (conferido antes de revogar), então rodam
  como `postgres` e não dependem do privilégio de quem disparou o gatilho.
- **`influencer_monthly_performance`:** o `EXECUTE` de `authenticated` **fica** —
  o painel a chama com a sessão do usuário (`frontend/revops.html` linha 2445) —
  e entra `where public.is_admin()` no corpo.

### ✅ Remedido depois, pelos mesmos caminhos

| medida | resultado |
|---|---|
| mesma chamada de `recalc_whatsapp_idle_state` pelo usuário comum | **`42501 permission denied for function recalc_whatsapp_idle_state`** |
| `has_function_privilege('authenticated', ...)` nas duas de WhatsApp | **sem EXECUTE** |
| `influencer_monthly_performance` com **um resgate injetado** (e desfeito): admin logado | **1 linha, com nome** |
| a mesma consulta, no mesmo instante, com usuário comum logado | **0 linhas** |

O resgate injetado foi necessário porque a tabela está vazia: sem ele, "0 linhas"
seria o resultado de qualquer coisa, inclusive de nada funcionando. **Controle
positivo primeiro, senão a medição não distingue proteção de tabela vazia.**

⚠️ **O que isto NÃO prova:** que o painel de influenciadores continua desenhando
na tela do Érico. A checagem foi feita no banco com o `sub` dele; ninguém abriu o
`revops.html` logado depois da migration.

---

**REVISÃO 54 — 22/08/2026 (tarde) — VAZAMENTO DE E-MAIL E TELEFONE DE CLIENTES
PELA CHAVE ANON, MEDIDO E FECHADO. E a sessão de segurança do Claude Code não
deixou nada em produção.**

### 🔴 O que estava aberto — e foi provado, não inferido

`public.wa_ociosidade()` é `SECURITY DEFINER` e estava com `EXECUTE` para
`PUBLIC` (o default do Postgres, que o `anon` herda). Ela devolve
`user_id`, `phone` e `email` de todas as instâncias de WhatsApp — furando a RLS
por definição, já que roda como dona.

Medido em 22/08 com `pg_net` batendo em
`/rest/v1/rpc/wa_ociosidade` com a **chave anon pública** (a mesma que está no
`frontend/revops.html` e no `supabase/config.js`, e que qualquer visitante lê no
navegador):

| momento | resposta |
|---|---|
| antes | **HTTP 200**, 832 bytes, 3 linhas com telefone e e-mail de clientes |
| depois do revoke | **HTTP 401** — `permission denied for function wa_ociosidade` |

Mesma URL, mesma chave, mesmo caminho de medição. **Não é status 200 contado como
prova: é o corpo da resposta com dado de cliente dentro.**

### ✅ O conserto — migration `revoga_rpc_manutencao_de_anon_e_authenticated`

`REVOKE EXECUTE ... FROM public, anon, authenticated` + `GRANT` explícito a
`service_role` em seis funções `SECURITY DEFINER` de manutenção:

`wa_ociosidade` · `mr_claim_queue` · `mr_expire_queue` · `expirar_clone_posts` ·
`purgar_product_refresh_runs` · `check_trial_mission_extensions`

**Nenhum chamador legítimo foi quebrado, e isso foi conferido antes:** a
`wa-idle-reaper` chama `wa_ociosidade` com `SUPABASE_SERVICE_ROLE_KEY`
(`wa-engine`/Edge Function, linha 45 do `wa-idle-reaper/index.ts`), e as outras
cinco rodam no `pg_cron` como `postgres` (`expirar-clone-posts`,
`purgar-product-refresh-runs`, `mega-trial-mission-check` — lidos em `cron.job`).

⚠️ **O que ainda NÃO foi observado:** a rodada real da `wa-idle-reaper` das
10:00 UTC depois do revoke. Enquanto ela não rodar com sucesso, o conserto está
provado só do lado do bloqueio, não do lado de quem tem direito de passar.

### 🟢 O que foi medido e está certo (contra a suspeita, não a favor)

- **Nenhuma view `SECURITY DEFINER`.** As 7 views de `public` sem RLS
  (`profiles_view`, `admin_mrr`, `revops_users_overview`, `revops_user_scores`,
  `monthly_usage_summary`, `radar_ml_quota_summary`, `v_clicks_by_link`) estão
  todas com `security_invoker=true`. Controle: `anon` em `/rest/v1/profiles_view`
  → **401 `permission denied for function is_admin`**. A RLS de baixo vale.
- **A chave publicada no frontend é a `anon`**, não a `service_role` — JWT
  decodificado (`"role":"anon"`).
- **`get_user_email(uid)` checa `auth.uid() = uid or is_admin`** por dentro.
- Tabelas `mr_*` têm RLS ligada sem policy = negam tudo para anon/authenticated.
- Nenhum lint de nível ERROR nos advisors do Supabase.

### 🕳️ A sessão de segurança do Claude Code não chegou à produção

O relatório dela dá quatro correções como **concluídas**. Medido no `main`
(`60bd5b3`, 17/08) hoje:

| item do relatório | estado real no repo |
|---|---|
| XSS crítico em `onboarding.js` | `frontend/onboarding.js` **inalterado desde 13/08** (`57a776b`); os 2 `innerHTML` seguem com template literal e sem escape |
| `sharp` desatualizado no wa-engine | `wa-engine/package.json` segue em **`^0.33.5`** |
| CORS do wa-engine | `server.js` linha 112 segue **`Access-Control-Allow-Origin: '*'`** |
| defaults do Supabase no wa-engine | linha 126 segue com **URL do projeto hard-coded como default** |

Nem commit, nem branch, nem deploy de Edge Function, nem migration depois de
17/08 (última migration: `20260816151919 short_links_og_tags`). **As correções
existiram em disco na sessão e morreram com ela.**

⚠️ **E a classificação "XSS crítico" não se sustenta como está:** os dois
`innerHTML` do `onboarding.js` são alimentados por `title`/`content`/`steps` que
vêm do `onboarding-config.js` **estático**. Não foi achado caminho de dado de
usuário até lá. É endurecimento, não exploração medida — o que não quer dizer que
não deva ser feito, quer dizer que não é o que estava sangrando.

### 🟡 O que fica aberto (novo)

| # | o que é |
|---|---|
| **P63** | As quatro correções da sessão do Claude Code precisam ser refeitas e empurradas: CORS `*` no `wa-engine` e no `mr-ingest`, defaults de Supabase no `wa-engine`, `sharp`, escape no `onboarding.js`. **O `mr-ingest` (`src/server.js` linha 35) também está com `Access-Control-Allow-Origin: '*'`.** Nada disso está no repo |
| **P64** | Três funções `SECURITY DEFINER` seguem executáveis por `authenticated` **sem nenhuma checagem de identidade no corpo**: `influencer_monthly_performance`, `mark_whatsapp_activity(p_user_id)`, `recalc_whatsapp_idle_state(p_user_id)`. As duas últimas aceitam `user_id` alheio. Triado por busca de texto (`is_admin`/`auth.uid()`), **não por leitura linha a linha** — a leitura ainda falta |
| **P65** | Higiene do lint, sem exploração conhecida: 7 funções com `search_path` mutável, extensão `http` no schema `public`, e **proteção contra senha vazada desligada** no Supabase Auth (ação externa, Dashboard) |

**P7 e P2 continuam abertas como estavam** — o revoke desta revisão não toca em
nenhuma das duas.

---

**REVISÃO 53 — 17/08/2026 (madrugada, 00:51 BRT) — só medição. O `sub_id` da P62
está NO AR e foi medido em produção, com controle negativo. Nenhuma linha de
código.**

### 🔴 Correção de data da REVISÃO 52

Ela se datou como **"17/08 (manhã)"**. Está errado: o relógio do banco lido na
mesma sessão dizia `2026-08-17 00:49` em São Paulo — **madrugada**. É o mesmo
formato da correção da REVISÃO 40 sobre a 39 e da 30 sobre a 29, agora em escala
de horas em vez de dias. O cabeçalho da 52 foi corrigido para
"madrugada, ~00:30 BRT". **A regra continua a mesma: não inferir data, ler.**

### ✅ O Deploy pegou — e a prova não é o build

| medida | resultado |
|---|---|
| `main` | `60bd5b3` (merge do PR #8). O `frontend/index.html` dele bate por **sha256** com o arquivo local |
| bundle **servido** pelo domínio, buscado com `cache:'reload'` + query de bust | contém `function shopeeSubId(`, `const destino=shopeeSubId(longUrl,code)` e `destination:destino` |
| `destination:longUrl` (o código velho) | **ausente** do arquivo servido |
| controle — `prOgDoProduto` (peça da REVISÃO 49) | **presente**, ou seja o bloco não morreu no meio |
| `shopeeSubId` executada **no bundle servido**, não no sandbox | `an_redir` → sai com `sub_id`, prefixo intacto · link de ML → **idêntico** |

O `cache:'reload'` é obrigatório aqui e está no aprendizado de 07/08: sem ele,
"prova no navegador" e "prova do cache do navegador" são a mesma imagem.

### ✅ A prova por comportamento — link real, gerado pelo Érico no Link Rápido

**Baseline registrado ANTES**, às 00:49 BRT: `short_links` tinha **105** linhas de
`an_redir` e **0** com `sub_id`; a mais recente era de 16/08 21:53 UTC.

| link | `an_redir`? | `sub_id` gravado | bate com o `code`? | `long_url` contaminado? | bytes a mais |
|---|---|---|---|---|---|
| **`xzadtgh`** (Shopee, 00:51:50 BRT) | **sim** | **`xzadtgh`** | **sim** | **não** | **+15** — exatamente `&sub_id=xzadtgh` |
| `d9q7va7` (Amazon, 00:50:33 BRT) | não | — | — | não | **0** — `destination` idêntico ao `long_url` |

🔎 **O `d9q7va7` entrou por engano e virou o melhor controle da medição.** O
primeiro link gerado foi de **Amazon**, não de Shopee — o ramo do `sub_id` nem é
alcançado por ele. Lido como "não funcionou" seria a mesma classe de erro do
"derruba minha previsão" de 01/08: **resultado de um teste que não exercita o
ramo em questão não é refutação dele.** Como controle negativo ele vale muito:
loja que não é Shopee passa **intacta**, com `destination = long_url`.

E o `long_url` do `xzadtgh` ficou **sem** `sub_id`, que é a decisão da REVISÃO 52
valendo na prática — a chave de reuso da `send-post`/`group-blast`/`ml-short-link`
continua sendo a URL pedida.

### ✅ E o clique chega à Shopee COM o `sub_id` — medido no domínio real

Gravar o campo no banco não prova que quem clica sai com ele. Medido com `pg_net`
batendo em `https://www.megalinksbr.com.br/r/xzadtgh`:

| medida | resultado |
|---|---|
| cabeçalho `Location` da nossa resposta | `s.shopee.com.br/an_redir?…&sub_id=xzadtgh` ✅ |
| `link_clicks` do `xzadtgh` depois da chamada | **0 linhas** |
| `short_links.clicks` do `xzadtgh` | **0** |

O user-agent usado foi `facebookexternalhit/1.1` **de propósito**, por dois
motivos: não sujar o contador de cliques de um link real, e reexercitar de lado o
filtro de robô da `redirect` v16 — que segurou, 0 de 0.

### ⚠️ O que continua NÃO provado — e é o que fecha a P62

**A Shopee lendo o campo.** Tudo acima é sobre o nosso lado: montamos a URL
certa, gravamos o valor certo e redirecionamos com ele. Nada disso diz que o
`sub_id` aparece no relatório de vendas dela. Isso exige um **clique e um pedido
reais**, com o atraso natural do relatório (dados atualizados diariamente às
10:30), e depende do Érico. Até essa leitura a **P62 fica 🟡**.

Declarar a P62 fechada por ter visto `sub_id=xzadtgh` no nosso banco seria a
forma exata do *"status 200 não é prova"*: campo certo do nosso lado não é
atribuição do outro lado.

⚠️ Também não foi exercitado: plano **sem rastreamento** (Starter/Pro), que cai no
`ml-short-link`/is.gd e **não tem `code`** — logo não tem `sub_id`. Não é
regressão, é o mesmo comportamento de antes do patch.

---

**REVISÃO 52 — 17/08/2026 (madrugada, ~00:30 BRT) — P62 CODADA: o link de afiliado da Shopee passa
a levar `sub_id` com o código do nosso short link. E a "ordem de operações" que o
bilhete deixou como decisão pendente não existia.**

| | |
|---|---|
| Frontend | `frontend/index.html` — **exige push e Deploy** |
| Banco | nada |
| Edge Functions | nada |

### 🔴 O impasse da ordem de operações se dissolveu ao ler o código

O bilhete da sessão anterior deixou três saídas para decidir com o Érico, todas
partindo da premissa de que **o `code` do short link nasce depois do link de
afiliado**: sortear o code antes e passá-lo ao gerador, gravar e dar `UPDATE` no
`destination`, ou usar outro identificador no `sub_id`.

A premissa está errada, e a leitura do código mostra por quê. O `mlEncurtarLink`
faz, **em linhas consecutivas**:

```
const code = gerarCode();                     // o code existe AQUI
const {error} = await SB.from("short_links").insert({ code, long_url, destination, … });
```

O `code` já está em mãos **antes** do `insert`. Não é preciso antecipar sorteio,
não é preciso `UPDATE` depois, e **nenhuma das ~10 chamadas do `prGerarLinkAfil`
foi tocada**. É o padrão do "alguém aqui dentro já resolveu isto?" pelo avesso: a
peça que faltava já estava na linha de cima.

### O que mudou, exatamente

**Uma função nova, `shopeeSubId(longUrl, code)`**, e **uma linha** do
`mlEncurtarLink` (`destination:longUrl` → `destination:destino`).

| decisão | o que ficou, e por quê |
|---|---|
| **onde vale** | dentro do `mlEncurtarLink`, então vale para **toda tela que encurta no nosso domínio** — Link Rápido, Postar Rápido, Grupo de Oferta, Radar — e valerá para `send-post`/`group-blast` no dia em que passarem por aqui. Decidido com o Érico em 17/08 |
| **o que vai no campo** | **só o `code`**, no primeiro dos cinco campos do `sub_id`. Ele já amarra em `link_clicks`, no produto e no dono. Nome de tela no Sub_id2 foi descartado: é um segundo vocabulário para manter alinhado, que é a divergência `mercadolivre`/`mercado_livre` da P31 outra vez |
| **`long_url` NÃO recebe o `sub_id`** | ele é a **chave de reuso** da `send-post`, da `group-blast` e da `ml-short-link` (`.eq("long_url", longUrl)`). Gravar o valor com `sub_id` faria a busca errar e criar linha nova de `short_links` a cada disparo do mesmo produto. Quem redireciona lê `destination || long_url` (lido na fonte publicada da `redirect` v16), então o `destination` sozinho basta |
| **a URL não é reserializada** | `new URL(...).toString()` reescreveria o `origin_link` com as regras do `URLSearchParams` (espaço vira `+`), e ele foi montado com `encodeURIComponent`. O `sub_id` é anexado por **string**; o `new URL` serve só para *perguntar* se aquilo é um `an_redir` |

### O formato do `sub_id`, conferido na documentação da Shopee

`https://s.shopee.com.br/an_redir?origin_link=…&affiliate_id=…&sub_id=…`

O `sub_id` é **um parâmetro só**, com até **cinco valores separados por hífen**
(`sub_id=a-b-c-d-e`), e cada posição vira uma coluna `Sub_id1`..`Sub_id5` no
relatório de vendas. Não são cinco parâmetros `sub_id1`..`sub_id5`. Conferido no
guia oficial de short link da Shopee, não deduzido. O nosso `code` é base36 de 7
caracteres, sem hífen — cai inteiro no `Sub_id1`.

### Medido — 9 casos, com a função LIDA DO ARQUIVO PATCHADO

A função foi extraída do `frontend/index.html` já alterado (não redigitada) e
executada no Node:

| caso | resultado |
|---|---|
| `an_redir` real | **MUDOU** — `&sub_id=4h8wmie` no fim |
| `an_redir` que já vinha com `sub_id` | IGUAL — não sobrescreve |
| `shopee.com.br/product/…` (outro host) | IGUAL |
| `s.shopee.com.br/4AykYR6yxu` (outro caminho) | IGUAL |
| Mercado Livre com `matt_tool` | IGUAL |
| Amazon com `tag` | IGUAL |
| `code` vazio | IGUAL |
| URL vazia | IGUAL |
| string que não é URL | IGUAL |

E no caso que muda: `origin_link` **intacto byte a byte**, o link novo começa com
o link velho, `sub_id` no fim. **Um único caso dos nove altera a saída** — é isso
que separa "a função faz o que promete" de "a função mexe em tudo".

`node --check` nos 5 blocos inline, comparado com o baseline do `HEAD` anterior:
5 de 5 OK nos dois.

### ⚠️ O que NÃO está provado — e a prova de verdade depende do Érico

1. **Nada disto está no ar.** Falta push e **Deploy**.
2. **Nenhum link real foi gerado com `sub_id`.** Baseline registrado antes do
   patch: os 10 short links de `an_redir` mais recentes (`bdmctsi`, `js3eq1f`,
   `y9q3q7i`, …, de 16/08) têm `destination` **sem** `sub_id`. Depois do Deploy, o
   primeiro link novo de Shopee do Link Rápido tem que sair com
   `sub_id=<code do próprio link>` — leitura de uma linha em `short_links`.
3. **A prova que fecha a P62 não é nossa.** É o `sub_id` **aparecer no relatório
   de vendas da Shopee** depois de um clique e um pedido reais, com o atraso
   natural do relatório (dados atualizados diariamente às 10:30). Sem isso, o que
   está provado é que montamos a URL certa — não que a Shopee lê o campo.
4. Plano **sem rastreamento** (Starter/Pro) cai no `ml-short-link`/is.gd e **não
   tem `code`**, logo não tem `sub_id`. Não é regressão: hoje também não tem.

---

**REVISÃO 51 — 17/08/2026 (madrugada) — só medição. A prévia da REVISÃO 49 foi
ligada NA TELA ERRADA, e a Shopee NÃO está barrando o nosso link.**

Nenhuma linha de código.

### 🔴 A prévia foi ligada na tela errada — erro de quem codou a REVISÃO 49

Medido: os links que o Érico gerou depois do Deploy (`mkp7lg5` 03:05, `5egzhll`
03:11) saíram com `og_title`, `og_description` e `og_image` **vazios**. Não é
cache do navegador — o `index.html` servido pelo domínio foi baixado e contém as
três marcas do código novo (`prOgDoProduto`, `og_title:og&&og.title`, e a chamada
com `prOgDoProduto(p)`).

A causa está no código: **há dois caminhos que criam short link, e a prévia foi
ligada só em um.**

| tela | função | tem produto em mãos? | passa `og`? |
|---|---|---|---|
| Postar Rápido | `prPreencherStep2` → `mlEncurtarLink(...)` | sim (`PR.produto`) | **sim** |
| **Link Rápido** (`page-link-rapido`) | `lrGerar` → `encurtarLinkFinal(afil, null)` | **não** | **não** |

O Érico usa o **Link Rápido**, que é a aba que ele descreveu desde o começo
("em Link rápido, após converter"). Essa tela só chama a `resolve-link` e
encurta — ela **nunca teve título, preço nem foto**. Não é falta de passar um
parâmetro: não há dado para passar.

⚠️ **A saída não é trivial e não foi decidida:** para o Link Rápido ter prévia,
ele precisa buscar o produto depois de resolver o link — o que custa uma leitura
de loja (`product-search`), com tudo que isso implica: crédito no ML, credencial
oficial na Shopee, captcha na Amazon. Não é de graça, e por isso não foi feito de
afogadilho.

### ✅ A Shopee NÃO está barrando o nosso link — provado pelo minuto

Pergunta do Érico depois de duas vendas de Shopee saírem com `Status: Cancelado`
e comissão R$ 0,00, com as compradoras confirmando compra e recebimento.

Medido no `link_clicks` do código `4h8wmie` (Cômoda Grécia, item `19797996404`),
contra o relatório de vendas da Shopee:

| nosso `link_clicks` (UTC) | quem |
|---|---|
| 15/08 21:41:03 | robô de prévia do WhatsApp |
| 15/08 21:42:17 | gente (Android) |
| **15/08 21:44:18** | **gente (Android)** |

O relatório da Shopee diz **"Período dos Cliques: 15/08/2026 18:44"** — 21:44 UTC
é 18:44 de Brasília. **Mesmo minuto.** A Shopee recebeu o clique vindo do nosso
encurtador, registrou, e amarrou o pedido das 18:57 nele. Link barrado não
produziria linha nenhuma no relatório.

O nosso link também não inventa redirecionamento para a Shopee: aponta para o
`s.shopee.com.br/an_redir`, o oficial (decisão registrada — anexar `af_sub1` no
link original não gera atribuição real).

**O problema é o `Status do Pedido: Cancelado`**, que é status de PEDIDO, não de
atribuição. A comissão só valida depois de entrega e confirmação de pagamento.
Duas leituras, e **não foi possível distinguir daqui**: (a) o pedido foi
cancelado e refeito — há duas linhas do mesmo produto no mesmo minuto, uma `x1` e
outra `x0`, que é a forma de um pedido substituído; (b) a janela de atribuição da
Shopee é de **7 dias com o último clique levando tudo**, então um clique em
qualquer outro link de afiliado no intervalo migra a comissão inteira.

### 🔵 Decidido com o Érico: `sub_id` no `an_redir` — PARA A PRÓXIMA SESSÃO

Hoje só dá para cruzar pedido e link **por horário, na mão** — foi o que esta
sessão fez. Aberto como **P62**, autorizado pelo Érico e adiado de propósito.

---

**REVISÃO 49 — 16/08/2026 (tarde) — a prévia do link no WhatsApp nunca foi nossa,
era da Amazon. Agora é nossa. E robô de prévia parou de contar como clique.**

| | |
|---|---|
| Frontend | `frontend/index.html` + `frontend/Dockerfile` (nginx) — **exige Deploy** |
| Banco | `short_links`: `og_title`, `og_description`, `og_image` |
| Edge Functions | `redirect` **v16** (contador do Supabase: 16) |

### O sintoma que o Érico trouxe

Link do Link Rápido enviado no WhatsApp não mostrava informação nenhuma do
produto. Colado **duas vezes seguidas** por engano, mostrou.

### A causa, medida — e não é o nosso link

O `link_clicks` registra todo acesso com user-agent. O robô do WhatsApp
(`WhatsApp/2.2631.102 W`) **bateu no nosso link cinco vezes**, 11:59:27 a
12:00:38 — o minuto exato das capturas. O link sempre funcionou.

O que não funcionava era o que vinha depois: até a **v15** a `redirect` devolvia
um **302 pelado, sem uma única tag OG própria**. Então a prévia que o WhatsApp
mostrava nunca foi nossa — era a da **Amazon**, colhida depois do redirect. E a
Amazon é exatamente a loja que este projeto já mediu bloqueando cliente que não é
navegador (v14/v15 do `product-refresh`: *captcha volta com status 200*). Cara ou
coroa, e a moeda não é nossa.

**O link duplicado não funcionou por ser duplicado.** Do nosso lado os dois são o
mesmo link: o nginx faz `rewrite ^/r/(.*)$` e a função pega o **último** pedaço
do caminho — `s2310c5` nos dois casos, e por isso todos os cliques caíram no
mesmo código. O que mudou foi o **cache do WhatsApp**: string diferente, chave
diferente, busca limpa em vez da prévia vazia já guardada.

⚠️ **Registro honesto:** não foi separado, tentativa a tentativa, quanto é
bloqueio da Amazon e quanto é cache do WhatsApp. As duas explicam o observado.

### 🔴 O achado de lado: um quarto dos cliques é robô

O `redirect` gravava `link_clicks` e incrementava `clicks` **para qualquer
requisição**, robô inclusive. Medido em 16/08:

| | |
|---|---|
| cliques registrados na base | **140** |
| robô de prévia | **36 — 25,7%** |
| no código `s2310c5` | `clicks = 6`, sendo **5 robô e 1 gente** |

A v16 só grava para gente. **Histórico não foi mexido** — limpar o passado é
outra decisão, e o Érico ainda não a tomou.

### 🔴 A armadilha que quase matou o conserto: o Supabase neutraliza HTML

A v16 foi deployada e a prévia foi provada ponta a ponta com `pg_net`, batendo no
domínio real com o user-agent do WhatsApp:

| quem | resultado |
|---|---|
| `WhatsApp/2.2631.102 W` | **200**, 1457 bytes, `og:title` e `og:image` **nossos**, apóstrofo escapado como `&#39;` |
| iPhone (gente) | **302** para o destino, e **1 linha** em `link_clicks` |
| robô em `link_clicks` | **nenhuma linha** ✅ |

**Mas o cabeçalho denunciou o problema:** a resposta chega com
`content-type: text/plain`, `x-content-type-options: nosniff` e
`content-security-policy: default-src 'none'; sandbox`. Batendo **direto** em
`nxlfezpagporealqqbfj.supabase.co` (server `cloudflare`), o mesmo trio — então
não é o nosso nginx: é o gateway do Supabase neutralizando HTML, proteção
anti-phishing do domínio compartilhado `*.supabase.co`. O `cache-control` que a
função mandou passa intacto, o que mostra que a reescrita é **seletiva**.

**Com `text/plain` + `nosniff` o WhatsApp não lê tag OG nenhuma.** Servir a
prévia certa não bastava. O `location /r/` do nginx passa a desfazer isso no
nosso domínio: `proxy_hide_header` nos três e `add_header Content-Type
"text/html; charset=utf-8" always`.

Este é o caso exemplar da regra da casa: **status 200 não é prova.** O corpo
estava perfeito e a coisa não teria funcionado.

### ✅ REVISÃO 50 — o conserto do nginx, MEDIDO em produção depois do Deploy

Deploy feito pelo Érico em 17/08. Medido com `pg_net` no domínio real, três
user-agents, contra o `zzogt01`:

| quem | status | `content-type` | `nosniff` | CSP | corpo |
|---|---|---|---|---|---|
| `WhatsApp/2.2631.102 W` | 200 | **`text/html; charset=utf-8`** | removido | removido | 1457 B, `og:title` nosso |
| `facebookexternalhit/1.1` | 200 | **`text/html; charset=utf-8`** | removido | removido | 1457 B, `og:title` nosso |
| Android (gente) | 302 → destino | — | — | — | 681 KB, a SPA |

Os três cabeçalhos que o gateway do Supabase injetava (`text/plain`, `nosniff`,
CSP `sandbox`) **sumiram** no nosso domínio. O `proxy_hide_header` +
`add_header` pegou.

E o `link_clicks` do `zzogt01` tem **duas linhas**, as duas de gente (iPhone e
Android). **Nenhum dos dois robôs virou clique.**

### ⚠️ Não medido

* **O envio real no WhatsApp.** Servimos o HTML certo com o content-type certo —
  mas quem decide se desenha o cartão é o WhatsApp, e isso só o envio prova.
  Precisa ser um link **novo** do Link Rápido: link antigo não tem `og_title` e o
  WhatsApp ainda guarda a prévia vazia dos antigos em cache.
* Links **antigos** não têm `og_title` e caem no 302 da v15 de propósito.
* Só o **Link Rápido** grava a prévia hoje. `send-post` e `group-blast` usam o
  mesmo `encurtarLinkFinal`, que já aceita o parâmetro, mas nenhum dos dois passa
  nada ainda.

---

**REVISÃO 48 — 14/08/2026 (manhã) — o `BATCH` global virou ORÇAMENTO POR LOJA
(`product-refresh` v21, no ar e medida em produção). E a base contra a qual a P57
foi dimensionada não existe mais.**

| | |
|---|---|
| Frontend | nada |
| Banco | nada |
| Edge Functions | `product-refresh` **v21** (contador do Supabase: 26) |

### O que mudou

`BATCH = 12` e `RESERVA_ANTIGOS = 4`, que eram um número só para todas as lojas,
viraram **um balde por regime de custo**:

| balde | orçamento | reserva p/ antigos | por quê |
|---|---|---|---|
| `sem_verificador` | 20 | 7 | não consulta loja nenhuma — só recebe carimbo. Custo de rede **zero** |
| `mercado_livre` | 8 | 3 | wa-engine / Scrape.do. Ainda esbarra no `MAX_POOL_POR_RODADA = 5` |
| `amazon` | 45 | 15 | `fetch` direto na página: sem Scrape.do, **sem crédito**, só relógio |

A cota da P34 continua valendo, agora **dentro** de cada balde, com a mesma regra
de sempre: piso, não teto. A **ordem de processamento** está escolhida e não é
acidente — `sem_verificador` → `mercado_livre` → `amazon`. A Amazon é a única
capaz de estourar o `DEADLINE_MS`, então vai por último, e um corte por tempo
nunca deixa o ML sem rodada. `DEADLINE_MS` **não** foi mexido: continua 70000.

### Medido em produção — rodada do cron de 14/08 09:00 UTC, sem dryRun

| | previsto | na rodada |
|---|---|---|
| `candidatos_por_balde` | ML 8 (5 novos + 3 antigos) | **ML 8 — 5 novos, 3 antigos** |
| duração | dentro dos 70 s | **17,1 s** |
| `interrompido_por_tempo` | false | **false** |

Os baldes `amazon` e `sem_verificador` vieram **0** — e isso está certo, ver
abaixo. O log do PostgREST das 16:01 de 13/08 mostra as **seis** consultas saindo
com os filtros e limites exatos (`source=eq.amazon&…&limit=45`,
`source=not.in.(mercado_livre,amazon)&…&limit=20`), todas **200**. O mecanismo
dispara; o que faltou foi produto.

### 🔴 A base do Érico foi esvaziada — e a P57 foi dimensionada contra ela

Entre **12:50 e 13:01 (BRT) de 13/08**, os **107 produtos** e as **11 fontes de
clone** do Érico sumiram do banco. **Confirmado com ele em 14/08: limpeza
proposital, não é defeito.** O perfil está intacto (premium, `is_vip`), e
`clone_posts` (16), `niche_groups` (1), `whatsapp_instances` (2) e
`affiliate_credentials` (3) continuam lá.

A plataforma inteira hoje: **41 produtos, todos de Mercado Livre**, de 3 clientes.
Zero Amazon, zero Shopee.

⚠️ **Consequência direta:** os números 45 (Amazon) e 20 (sem verificador) foram
calculados contra 57 Amazon e 49 Shopee que não existem mais. O **formato** está
provado; a **calibragem** não pode ser medida hoje. Quando entrar Amazon na base,
a primeira rodada com dezenas de leituras é o teste de verdade — e é onde
`interrompido_por_tempo` deixa de ser decorativo.

### 🔴 A premissa de captcha da REVISÃO 47 estava ERRADA

Estava escrito que "mais leituras da Amazon podem elevar a taxa de captcha, que
hoje já aparece como 2–3 `desconhecidos` por rodada". Medido em 13/08, lendo os
`detalhes` de 9 dias de rodadas: **zero captchas.** Nenhuma ocorrência de
`bloqueio/captcha da Amazon`. Os 2–3 `desconhecidos` diários são outra coisa —
ver abaixo. O risco de captcha continua **plausível e não medido**; o que caiu foi
a afirmação de que ele já estaria acontecendo.

### 🔴 Dois produtos de ML ocupam vaga em TODA rodada, desde sempre

Os `desconhecidos` diários são sempre os mesmos dois, com o mesmo motivo
(`MLB ID não encontrado no link`):

| produto | carimbo | há quanto tempo volta |
|---|---|---|
| Caixa 10 Máscaras Faciais Skincare Nutri | **`null`** desde 08/07 | 37 dias na fila `novos` |
| Gloss Fran By Franciny Ehlke Liphoney Mel | `02/08 09:00` | 12 dias na fila `antigos` |

Falha de leitura **não é carimbada** — decisão deliberada da v17, para que erro
transitório volte já. Mas link permanentemente ilegível não é erro transitório:
esses dois queimavam **2 das 12 vagas** de toda rodada (17% do lote) e hoje
queimam 2 das 8 do balde de ML (**25%**). Aberto como **P59** — a saída não é
óbvia e não foi decidida: carimbar depois de N falhas iguais, ou marcar o produto
como link inválido e avisar a dona.

### ⚠️ Não medido

* Os baldes `amazon` e `sem_verificador` **nunca tiveram um candidato sequer** —
  não há base para eles hoje.
* Se 45 leituras de Amazon cabem em `DEADLINE_MS = 70000`. A conta com 1,2 s por
  leitura dá ~54 s, o que é apertado; a expectativa registrada é que
  `interrompido_por_tempo` venha `true` e a Amazon seja cortada por volta de 40.
  Isso é **auto-corrigível** (quem for cortado volta na frente, `price_checked_at`
  ascendente), mas é previsão, não medição.
* Se mais volume de leitura da Amazon eleva captcha.

### 🔴 O código v21 está NO AR mas NÃO está no repo

Deployado pelo MCP do Supabase, que não passa pelo GitHub. `supabase/functions/product-refresh/index.ts`
no `main` ainda é a **v20**. Publicado ≠ commitado até isso ser resolvido — ver a
nota de infraestrutura sobre o push.

---

**REVISÃO 47 — 13/08/2026 (noite) — a tela da REVISÃO 45 estava MENTINDO sobre 49
dos 107 produtos, e a premissa de custo da P57 estava errada. Os dois consertados.**

### 🔴 Defeito introduzido pela REVISÃO 45, corrigido aqui

A `product-refresh` grava `price_checked_at` em **três pulos por condição** —
sem URL consultável, **loja sem verificador**, e plano sem monitoramento. Isso é
correto lá: o carimbo quer dizer *"foi avaliado"*, e tira o produto da fila por 24h
para ele não empurrar os outros em toda rodada.

A REVISÃO 45 leu esse carimbo como **"preço conferido há X"**. Nos três casos isso é
falso. `LOJAS_COM_VERIFICADOR = {mercado_livre, amazon}` — **a Shopee não tem
verificador**, e a conta do Érico tem **49 produtos de Shopee**. A tela dizia "preço
conferido há 2 dias" para produto que ninguém consultou.

**Dar informação errada sobre preço é pior do que não dar nenhuma**: é com ela que se
decide postar. Agora a tela diz o motivo, na mesma ordem dos pulos do backend:

| situação | o que a linha diz |
|---|---|
| plano sem `stock_monitor` | 🔍 seu plano não inclui conferência automática de preço |
| sem `original_url` (ou só o nosso short link) | 🔍 sem link consultável — não dá para conferir o preço |
| loja fora de `{mercado_livre, amazon}` | 🔍 esta loja ainda não é conferida automaticamente |
| conferível | preço conferido há Xh / X dias (âmbar ≥3 dias, ⚠️ se nunca) |

Os inconferíveis **saíram das contagens de "nunca conferido" e "3 dias ou mais"** e
ganharam linha própria — somar os dois faria parecer que basta esperar, quando o que
falta é mecanismo. E a explicação segue o motivo real: para quem está travado pelo
plano, a tela **não** fala em Shopee.

⚠️ `PROD_LOJAS_COM_VERIFICADOR` no frontend é **espelho** do `LOJAS_COM_VERIFICADOR`
da `product-refresh` (linha 192), com o mesmo enum do banco (`products.source`).
Duas listas do mesmo vocabulário é o risco `mercadolivre`/`mercado_livre` da P31 —
**mexeu lá, mexe aqui.**

### 🔴 E a premissa de custo da P57 estava errada

A REVISÃO 45 dizia "aumentar a leitura custa crédito de Scrape.do". Isso foi
generalizado de um comentário do código **sem cruzar com a base real**. Medido:

| loja | produtos do Érico | como é conferida | custo |
|---|---|---|---|
| **Amazon** | **57** | `consultarAmazon` → `fetch` **direto** na página | **zero** |
| **Shopee** | **49** | não é conferida — sem verificador | zero (e sem valor) |
| Mercado Livre | **1** | `consultarML` → Scrape.do | crédito |

Um produto de Mercado Livre. E o Érico tem **token próprio do Scrape.do** (e backup),
que não toca a cota compartilhada. **Conferir a base inteira dele hoje custaria
praticamente nada.**

E há folga de relógio de sobra: `DEADLINE_MS = 70000`, e as seis últimas rodadas
gastaram entre **9,5 s e 27 s** com 12 candidatos, **nenhuma interrompida por tempo**.

O problema, então, não é dinheiro: é **um `BATCH` global de 12 para lojas com custos
completamente diferentes**. O desenho certo é orçamento por loja — Amazon com lote
grande, Mercado Livre mantendo o `MAX_POOL_POR_RODADA = 5`. Isso ficou na P57 como o
próximo passo, ainda **não feito**.

### Medido em Chromium, cinco linhas cobrindo os quatro caminhos

| linha | resultado |
|---|---|
| Amazon, carimbo de 1 dia | "preço conferido há 1 dia" |
| Amazon, 5 dias | 🕐 âmbar |
| Amazon, nunca | ⚠️ "preço nunca conferido" |
| **Shopee, carimbado há 2 dias** | 🔍 "esta loja ainda não é conferida automaticamente" |
| ML só com short link nosso | 🔍 "sem link consultável" |
| tudo isso no plano **Starter** | as 5 linhas viram "seu plano não inclui…", e o alarme de atraso **some** |

### ⚠️ Não medido

Nada em produção — falta Deploy. E o **orçamento por loja não foi implementado**: os
57 da Amazon continuam saindo a 12 por dia disputando fila com a plataforma inteira.

---

**REVISÃO 46 — 13/08/2026 (fim de tarde) — só documentação. A REVISÃO 45 foi medida
em produção, e a P57 é PIOR do que estava escrita.**

Nenhuma linha de código. Deploy da REVISÃO 45 feito pelo Érico e lido com
`?v=rev45` (P49) na sessão logada dele.

### A REVISÃO 45 no ar, contra a base real

| medida | resultado |
|---|---|
| produtos listados | **107** — bate com o banco |
| preço **nunca conferido** | **27** — bate |
| carimbo mais antigo exibido | **10 dias** — bate com o `03/08` |
| numeração, barra de uso, idade por linha, `expired` riscado | ✅ |

### 🔴 A média escondia a distribuição

A REVISÃO 45 registrou "idade média 5,3 dias". Medido agora, a distribuição da
conta do Érico:

| idade do `price_checked_at` | produtos |
|---|---|
| **nunca conferido** | **27** |
| até 1 dia | **3** |
| 1 a 3 dias | 17 |
| 3 a 7 dias | **32** |
| mais de 7 dias | **28** |
| **total** | **107** |

**Três.** Três produtos de 107 foram conferidos nas últimas 24 horas. E **87 dos
107** — 27 nunca + 60 com três dias ou mais — estão sendo postados com preço que
ninguém confere há pelo menos três dias. "Média de 5,3 dias" fazia isso soar como um
atraso uniforme; não é. É uma cauda longa com quase toda a base dentro dela.

### E o `BATCH` é GLOBAL, não por usuário

Lido no código: as duas consultas de candidatos da `product-refresh` **não filtram
por `user_id`** — `.is('price_checked_at', null).eq('expired', false).limit(BATCH)`.
Os 12 por rodada são repartidos entre **todos** os produtos da plataforma, hoje
**148**. Com um único usuário sério a fila já não fecha; com dez, a cobertura de cada
um cai proporcionalmente **sem nenhum aviso na tela**. Isto não é um ajuste de
número: é o desenho que não escala. Anotado na P57.

### O teto do plano não é observável na conta do Érico — e isso era previsível

`prodMax()` devolve **−1** para `IS_ADMIN` ou `is_vip`, por simetria com o
`cloneFontesMax`. A conta do Érico é **as duas coisas**. Resultado medido em
produção: a tela diz *"107 na conta · sem teto"*, e o ramo que ele pediu — "107 de
300" com aviso de upgrade — **nunca aparece para ele**.

É o mesmo padrão da P30, da P55 e da P48: ramo autorizado, deployado e nunca
observado. Então foi exercitado **no bundle servido**, sem gravar nada: `IS_ADMIN` e
`is_vip` forçados a `false` em memória com `MY_PLAN='starter'`, re-render, e a tela
devolveu

> 107 de **15** na conta · 🔒 Você atingiu o limite de **15** produtos do plano
> Starter. Para cadastrar mais, remova algum ou passe para o **Pro** (50 produtos).
> Ver planos

Estado real restaurado em seguida e reconferido (`sem teto`, `prodMax()` −1). Nada
foi escrito no banco.

⚠️ **A consequência prática fica registrada:** o Érico é a única pessoa usando o
painel hoje, e **não consegue ver com os próprios olhos o que um cliente pagante vê**
em nenhuma tela com trava de plano. Conferir isso de verdade exige uma conta de teste
num plano baixo — nunca mexer nas flags da conta dele.

---

**REVISÃO 45 — 13/08/2026 (tarde) — P55 fechada pelo Érico, e a lista de produtos
passa a dizer quantos são, qual é o teto e QUANDO cada preço foi conferido.**

| | |
|---|---|
| Frontend | `frontend/index.html` (a raiz não existe mais — P53) |
| Banco | nada |
| Edge Functions | nada |

### P55 — a aprovação em lote disparou, e não falhou nenhuma

Executada pelo Érico na fila real. Medido no banco depois:

| | |
|---|---|
| clones aprovados em lote | **9** |
| viraram linha em `products` | **9 de 9** |
| com `error` | **0** |
| janela | 13:55:53 → 13:55:57 — 4s, um por vez, que é o laço |
| pendentes que sobraram | 2 — os que ele **não** marcou |

Cada `clone_posts.product_id` aponta para um produto que existe, com preço gravado.
O laço agiu **só** sobre a seleção. Era a última coisa desta série que estava no ar
sem nunca ter sido acionada.

### 🔴 O que foi descoberto ao responder "o preço atualiza ao postar?"

**Não atualiza.** Varredura na `send-post` inteira: **nenhuma** chamada a loja,
Scrape.do, `product-search` ou `resolve-link`. Ela publica o `price` gravado na
linha. **O preço do post é a foto do dia em que o produto foi conferido pela última
vez.**

**O produto sai do rodízio quando esgota — se alguém tiver marcado.** A `send-post`
v14+ pula todo produto com `expired = true`, e o `never_expires` isenta da validade
*nossa* mas **não** do `expired` — o comentário no código merece ser citado: *"o
usuário pode abrir mão de uma política nossa, nunca da realidade"*. O mecanismo
existe e está certo. O furo é **cobertura**, e ele foi medido:

| medida na conta do Érico, 13/08 | |
|---|---|
| produtos | **107** |
| teto do plano Premium (`max_products`) | 300 |
| **nunca conferidos** (`price_checked_at` nulo) | **27** |
| idade média do último carimbo | **5,3 dias** |
| carimbo mais antigo | **03/08** — 10 dias |
| marcados `expired` | **0** |

A `product-refresh` roda 1x/dia com `BATCH = 12`. Com 107 produtos uma varredura
completa levaria ~9 dias, e produto novo fura a fila o tempo todo. Virou a **P57**.

### A escolha: mostrar, não barrar

Aumentar a leitura custa crédito de Scrape.do — o próprio cabeçalho da
`product-refresh` v20 documenta que subir o `BATCH` ou rodar mais vezes **dobraria**
as chamadas, e o plano é o Free de 1.000/mês. Então a REVISÃO 45 **não muda nada no
disparo** (decisão do Érico, tomada com os números acima à vista). O que ela faz é
parar de esconder a idade do preço.

**Cabeçalho da lista** (`wireProdLista`):

- `N produtos neste grupo · **T** de **max** na conta` — o total é da **conta**, por
  uma consulta `count:"exact"` própria, porque o teto do plano é por conta e mostrar
  o número de um grupo só mentiria para quem tem vários.
- Barra de uso; ≥80% avisa quanto falta; no teto, bloqueio explicado com o próximo
  plano e link para Assinatura. `prodMax()` lê `max_products` do `plan_features` e dá
  −1 para admin e VIP — **nunca um `if` pelo nome do plano**, que é a armadilha que a
  `send-post` v18 já teve de desfazer com três fontes discordando.
- Contadores de "nunca conferido" e "conferido há 3 dias ou mais", com a frase que
  explica o porquê: o post usa o preço gravado, e a conferência alcança 12/dia.

**Por linha:** numeração `1.` `2.` `3.` à esquerda, `preço conferido há X` (âmbar a
partir de 3 dias, ⚠️ quando nunca foi conferido) e, para `expired`, título riscado,
imagem em cinza e pill "fora do ar na loja".

### Medido em Chromium, com a `SB` stubada

| cenário | resultado |
|---|---|
| premium, 107 de 300 | sem aviso de upgrade, barra presente, contadores certos |
| starter, 14 de 15 | "Faltam **1** para o teto de 15 do plano Starter. O **Pro** sobe para 50. Ver planos" |
| starter, 15 de 15 | "🔒 Você atingiu o limite de **15**… ou passe para o **Pro** (50 produtos). Ver planos" |
| `prodMax()` por plano | 15 · 50 · 150 · 300 — batendo com o `plan_features` |
| idades | 4h · 4 dias (âmbar) · nunca (⚠️) · 1 dia |
| `expired` | riscado, cinza, com a pill |

🔎 **Defeito visual pego na própria medição:** `.alert` é flex, então os `<b>` viravam
itens de flex e a frase se espalhava em colunas. Os três alertas novos passaram a
embrulhar o conteúdo num `<div>` — que é o padrão que o resto do arquivo já usava.

### ⚠️ Não medido

Nada disto foi visto em produção — **falta Deploy**. E a stub da `SB` prova o render,
não a consulta: o `count:"exact"` do total da conta não foi executado contra o
PostgREST.

---

**REVISÃO 44 — 13/08/2026 (madrugada) — a REVISÃO 43 medida em produção e o cron
observado disparando sozinho. P56 e P53 fechadas. Nenhuma linha de frontend nova
além do apagamento das cópias mortas da raiz.**

| | |
|---|---|
| Deploy | feito pelo Érico; medido com `?v=rev43` (P49) na sessão logada dele |
| Frontend | 7 arquivos da raiz **apagados** — ver P53 |
| Banco | nada novo; só a leitura do cron criado na REVISÃO 43 |

### P56 — a paginação medida contra o banco de verdade

30 linhas de teste semeadas na fila real (título `ZZTESTE`), apagadas depois.

| medida | resultado |
|---|---|
| total por `count:"exact"` | **30** → 2 páginas |
| página 1 | 20 linhas, "1–20 de 30", `‹ 1 2 ›`, ativo **1** |
| página 2 | 10 linhas **diferentes**, "21–30 de 30" |
| **badge de pendentes** | **24** |
| seleção na pág. 2 | 10 marcados → "✅ Aprovar (4)" e "🗑️ Apagar (10)" |
| voltando à pág. 1 | seleção **mantida**; marcando a página, soma **30** → "Aprovar (24)" |
| atalho "marcar os 30 da fila inteira" | 30 marcados, "Aprovar (24)" / "Apagar (30)" |
| expirados | riscados, cinza, "expirou sem revisão · o preço não foi conferido desde então" |

🔴 **O número que fecha a pendência é o 24.** Não é 20 (o tamanho da página) nem 30
(o total): é a contagem de pendentes feita **no banco**. Antes desta correção o badge
saía do array já truncado e teria dito **20**. O "Aprovar (4)" da página 2 fecha a
conta pelo outro lado: daquelas 10 linhas, só 4 eram `pending`.

### O cron disparou sozinho — e isso não era garantido

Uma isca foi plantada de propósito: uma linha `pending` com **30h** de idade, criada
depois da rodada anterior, para que a **primeira rodada automática** tivesse trabalho
real em vez de devolver zero.

```
cron.job_run_details · jobid 34 · status succeeded
  start_time  2026-08-13 04:07:00.125637+00
  end_time    2026-08-13 04:07:00.164869+00

clone_posts · a isca
  status      expired
  expired_at  2026-08-13 04:07:00.125670+00
```

O `expired_at` e o `start_time` **coincidem no mesmo instante** — não foi chamada à
mão, foi a rodada do cron. Isto é o oposto da armadilha da P30 na REVISÃO 21 e da
P55 hoje: mecanismo *autorizado e deployado* não é mecanismo *acionado*, e neste
projeto o ramo nunca observado já foi, mais de uma vez, exatamente o que estava
quebrado. A isca foi apagada; a `clone_posts` voltou a **1 linha, 0 pendentes**.

### P53 — a saída não era sincronizar, era apagar

O `Dockerfile` mora em `frontend/` e faz `COPY index.html` **relativo a esse
contexto**. Não existe Dockerfile na raiz. **Prova observável, não inferência:** o
Mega Results aparece no site em produção e existe *apenas* em `frontend/index.html`.

Levantamento das 7 cópias da raiz: `guia.html`, `revops.html`, `onboarding.js`,
`onboarding.css`, `robots.txt` e `sitemap.xml` estavam **idênticas**; só o
`index.html` tinha divergido (279 linhas, o Mega Results inteiro). **Nenhum arquivo
da raiz era exclusivo.** As 7 foram apagadas por decisão do Érico.

A regra "edite as duas cópias" era compensação para uma duplicação que não precisava
existir — e falhou sem ninguém notar. Foi revogada na seção Stack.

### ⚠️ O que continua sem ter sido observado

**A aprovação em lote nunca disparou** (P55). Segue igual: `cloneAprovarSelecionados`
está no ar e foi exercitada só até habilitar/desabilitar o botão. A fila está vazia,
então o teste depende de captura nova.

---

**REVISÃO 43 — 12/08/2026 (noite) — a fila de clones ganha paginação e validade.
E a paginação não é melhoria: é conserto de truncamento silencioso.**

| | |
|---|---|
| Frontend | `index.html` e `frontend/index.html` (patch idêntico por script) |
| Banco | migração `validade_da_fila_de_clones` + cron `expirar-clone-posts` (jobid 34, `7 * * * *`) |
| Edge Functions | nenhuma tocada |

### 🔴 O defeito que estava lá o tempo todo

`cloneCarregarFila` fazia `.limit(30)` **e o badge de pendentes era contado a partir
do array já truncado**. Com 45 pendentes o badge dizia **30**, os outros 15 eram
invisíveis, e o "Selecionar todos" da REVISÃO 41 marcava só os 30 carregados. É a
mesma classe da P20 — cap silencioso que se apresenta como total.

Agora: página de 20, total por `count:"exact"`, e **o número de pendentes é uma
contagem própria no banco**, não o tamanho do array. Rodapé `‹ 1 2 3 ›` com janela
de 5 números e reticências, e o resumo "1–20 de 47" — nenhum número da tela sai de
conjunto truncado.

**A seleção atravessa páginas de propósito**, e por isso `CLONE_SEL` deixou de ser
`Set` e virou `Map` id→status: os contadores de "aprovar" (só pendentes) e "apagar"
(qualquer um) precisam do status de item que não está mais na tela. "Selecionar
todos" marca **a página**, e quando há mais de uma aparece o atalho "marcar os N da
fila inteira" — dizer "todos" e marcar 20 de 47 seria o truncamento outra vez, agora
na seleção.

Apagar a última linha de uma página recua para a anterior sozinho, em vez de deixar
o usuário numa página que existe e não mostra nada.

### Validade da fila — desenho decidido com o Érico em 12/08

A ideia era dele, e substituiu a minha: eu tinha proposto um **teto de fila** que
travaria a captura ao encher. Com `max_per_day = 30` e validade de 24h a fila já
fica limitada a ~30 **por construção** — o teto vira peça redundante. Retirado.

**Expirar não é apagar.** Pendente vencido vira `status='expired'`, continua na fila
em cinza, riscado, dizendo *"expirou sem revisão · o preço não foi conferido desde
então"*, e só sai do banco **7 dias depois**. Fila que esvazia sozinha sem deixar
rastro é o defeito do silêncio (P28, P36) — que aqui custaria a pergunta "cadê minhas
ofertas?" sem resposta.

⚠️ **O motivo real não é a fila ficar ociosa, é o preço envelhecer.** Não existia
**nenhum** cron que expirasse `clone_posts` — pendente vivia para sempre — e o
`cloneCriarProduto` publica o **preço gravado na linha**, não relê a loja. Aprovar um
pendente de 5 dias é publicar preço velho: a P30 e a P32 pelo lado do tempo.

⚠️ **E validade NÃO economiza consulta de loja — nenhuma.** A consulta já foi gasta
antes de a linha existir; matar depois não devolve crédito. Só um teto checado
**antes** do `resolve-link` economizaria. Quem quiser gastar menos mexe no
`max_per_day`, não aqui.

**O que foi para o banco** (`expirar_clone_posts()`, `SECURITY DEFINER`, sem `GRANT`
para `anon`/`authenticated` — quem chama é o pg_cron, e abrir para `anon` seria
repetir a P2):

| peça | o quê |
|---|---|
| `clone_sources.expira_horas` | `int not null default 24`, CHECK entre 6 e 168 |
| `clone_posts.expired_at` | carimbo de quando expirou; é o que datar a purga de 7 dias |
| CHECK de `status` | ganhou `'expired'` (era pending/approved/rejected/failed) |
| cron `expirar-clone-posts` | `7 * * * *` |

A tela ganhou o ajuste ±6h no card da fonte, ao lado do ±5 do teto do dia, **com os
mesmos limites 6 e 168 do CHECK do banco** — dois lugares gravando a mesma coluna com
tetos diferentes seria a divergência `mercadolivre`/`mercado_livre` outra vez, agora
em hora. Fonte sem `expira_horas` (linha velha) cai em 24h por `||`, e clone colado à
mão (`clone_source_id` nulo) cai em 24h pelo `coalesce` da função.

### Medido — banco com controles, antes de encostar na tela

Cinco linhas de teste, rodada única de `expirar_clone_posts()` → `expirados 2,
purgados 1`:

| linha | esperado | resultado |
|---|---|---|
| pendente 30h, fonte de 24h | expira | `expired`, com carimbo ✅ |
| **pendente 10h** | fica | `pending` ✅ *(controle negativo)* |
| pendente 30h **sem fonte** | expira pelo padrão 24h | `expired`, com carimbo ✅ |
| **aprovado 30h** | não tocar | intacto ✅ *(controle)* |
| já `expired` há 8 dias | purgar | sumiu da tabela ✅ |

As linhas de teste foram **apagadas** depois.

### Medido — tela, em Chromium

| o quê | resultado |
|---|---|
| 47 itens, página 1 | "1–20 de 47", `‹ 1 2 3 ›`, ativo **1**, "anterior" desabilitado |
| última página | "41–47 de 47", "próxima" desabilitado |
| 400 itens, página 11 | `‹ 1 … 9 10 11 12 13 … 20 ›` — 2 reticências |
| badge | **41** com 41 pendentes e 20 na página — *não* sai do array |
| seleção entre páginas | 20 na pág. 1 → mantidos na pág. 2 → +20 = **40**, contadores 38 pendentes / 40 total |
| expirado na lista | riscado, cinza, com "o preço não foi conferido desde então" |
| título com `<script>` | escapado ✅ |

🔎 **Conserto de lado, na mesma linha que já estava sendo reescrita:** o título, a
loja, o cupom e o erro do clone iam para o HTML **sem escapar**. É conteúdo de grupo
de terceiro. Agora passam por `esc()`, e o `image_url` por um escape próprio de
atributo — o `esc()` global não escapa aspas.

### ⚠️ O que NÃO foi medido

- **Nada disso está em produção** enquanto não houver Deploy. Ver P56.
- A paginação foi exercitada com dados **em memória**; `range()` e `count:"exact"`
  contra o PostgREST não foram executados.
- O cron `expirar-clone-posts` **nunca disparou sozinho** — a função foi chamada à
  mão. Primeira rodada automática: minuto 7 da próxima hora.
- **A aprovação em lote continua sem nunca ter disparado** (P55).

---

**REVISÃO 42 — 12/08/2026 (tarde) — nenhuma linha de código alterada. Deploy feito e
as três alterações da REVISÃO 41 MEDIDAS EM PRODUÇÃO, logado. P54 FECHADA.**

| | |
|---|---|
| Commits | 0 de código · este doc |
| Deploy | **feito pelo Érico no EasyPanel** (serviço `app`) |
| Como foi lido | `https://www.megalinksbr.com.br/?v=rev41` — com cache-buster de propósito, por causa da **P49** |

### As três, medidas na SPA servida pelo nginx

**1. MegaIA.** Varredura de páginas na sessão logada do Érico:

| tela | `#fabAI` | `ctaManualVisivel()` |
|---|---|---|
| Dashboard · Radar · Clone Post · Conexão · Cupons | `none` | `false` |
| Postar Agora | `flex` | `true` |

`atualizarFabIA` e `ctaManualVisivel` existem como função no bundle servido, e o FAB
nasce `display:none`. Sem exceção nas 6 telas varridas.

**2. Tutorial.** Rodado com **chave descartável** (`__teste_rev41__`) para não gastar
o `dismiss` do guia de verdade, e o `localStorage` foi salvo antes e conferido
idêntico depois. Três passos, "Próximo" clicado:

| passo | `.page.on` depois do clique |
|---|---|
| 1 → `[data-page="conexao"]` | `page-conexao` |
| 2 → `[data-page="assinatura"]` | `page-assinatura` |
| 3 → `[data-page="post-relampago"]` | `page-post-relampago` |

`.guide-overlay` servido: `backdrop-filter: none`, fundo `rgba(0,0,0,0.28)`.
`.onboarding-guide`: `align-items: flex-end`, `pointer-events: none`. O
`onboarding.js` servido contém `irParaTelaDoPasso`.

**3. Fila de clones — e aqui está a prova que faltava.** O botão "☑️ Selecionar"
apareceu na fila real do Érico, que tinha **30 pendentes**. Com 3 marcados sendo 2
pendentes, a barra escreveu "✅ Aprovar (2)" e "🗑️ Apagar (3)" — as duas contagens
separadas, como desenhado.

🔴 **E o `DELETE` em lote rodou contra o banco de verdade — executado pelo Érico, na
tela, autenticado como ele mesmo, passando pela RLS.** Não foi simulação:

| `clone_posts` do Érico | antes | depois |
|---|---|---|
| pendentes | **30** | **0** |
| aprovados | 1 (de 30/07) | **1 — intacto** |
| descartados | 0 | 0 |

Apagou **exatamente** o que estava selecionado e não encostou na linha aprovada. É a
diferença entre Apagar e Descartar valendo na prática, e é o que a REVISÃO 41 tinha
deixado explicitamente sem prova.

### ⚠️ O que AINDA não foi observado

**A aprovação em lote nunca disparou.** Nenhum clone foi aprovado em lote em nenhuma
medição — nem local, nem em produção. O caminho de um a um (`cloneAprovar`) é antigo
e não mudou; o que é novo é o laço que relê cada linha do banco antes de chamar
`cloneCriarProduto`. **Está autorizado e deployado, não está provado.** Mesmo padrão
da ressalva da P30 na REVISÃO 21 — e lá o ramo não observado acabou sendo o que
tinha defeito. Não escrever que funciona.

Segundo detalhe: a fila está **vazia** agora, então o próximo teste depende de a
captura automática render clone novo. A fonte "Grupo de Achadinhos #34" segue ativa,
com teto de 30/dia batido no dia da medição.

---

**REVISÃO 41 — 12/08/2026 — três alterações de frontend pedidas pelo Érico, todas
exercitadas em navegador de verdade antes do push.**

| | |
|---|---|
| Arquivos | `index.html`, `frontend/index.html`, `onboarding.js`, `onboarding.css` (as duas cópias de cada) |
| Edge Functions | nenhuma tocada |
| Banco | nenhuma migração — a `clone_posts` já tinha a policy `clone_posts_owner` `FOR ALL`, medida nesta sessão, que é o que autoriza o DELETE novo |
| Repo × produção | **exige Deploy no EasyPanel** — nada disso está no ar até o rebuild |

### 1. MegaIA só aparece onde há CTA preenchível à mão

O botão flutuante `#fabAI` nasce com `display:none` e é ligado/desligado por
`atualizarFabIA()`. A regra **não é lista de páginas**: é a presença de um campo
marcado `data-cta-manual` na tela ativa. Hoje são dois — `#prCtaCustom` (Postar
Agora) e `#lpCta` (Editar Grupo → aba Layout). Um CTA manual novo em qualquer aba
liga a MegaIA sozinho; um que sair de cena a desliga.

⚠️ **A conta é por tela, não por pixel.** A primeira versão usava `offsetParent` e
falhou na medição: o `#prCtaCustom` mora dentro do `#prStep2`, que só abre depois
que o link é resolvido — a MegaIA sumia no Postar Agora até o usuário colar um
link. A regra final olha `.page.on` e, quando existe, `.tp.on` (as abas do Editar
Grupo). Sair de uma tela dessas com a gaveta aberta fecha a gaveta.

**Medido em Chromium (Playwright, arquivo servido localmente):**

| tela | `#fabAI` |
|---|---|
| Dashboard · Radar · Clone Post · Conexão | `display:none` |
| Postar Agora | `display:flex` |
| Editar Grupo, aba Layout ativa | `display:flex` |
| Editar Grupo, qualquer outra aba | `display:none` |

### 2. Fila de clones: seleção múltipla, aprovar e apagar em lote

Botão **☑️ Selecionar** entra num modo opt-in — enquanto ninguém clica, a fila é
idêntica à de antes. No modo: checkbox por linha, "Selecionar todos", e dois botões
em lote. Os botões de linha (Aprovar/Descartar) somem no modo seleção, para não
haver dois caminhos clicáveis para a mesma coisa.

🔴 **"Apagar" NÃO é "Descartar", e a diferença está no confirm.** Descartar marca
`status='rejected'` e o registro fica no histórico; **Apagar faz `DELETE` de verdade
na `clone_posts`**. Produto já publicado a partir de um clone aprovado vive em
`products` e não é afetado. A RLS que autoriza isso é a `clone_posts_owner`,
`polcmd = '*'` (FOR ALL) com `user_id = auth.uid()` — **medido nesta sessão**, não
suposto.

As duas contagens são diferentes de propósito: **apagar vale para qualquer item,
aprovar só para os `pending`**. Selecionar 3 itens sendo 2 pendentes mostra
"✅ Aprovar (2)" e "🗑️ Apagar (3)"; selecionar só um já publicado desabilita o
Aprovar e escreve "1 selecionado · nenhum pendente".

O laço de aprovação **relê cada linha do banco** antes de chamar
`cloneCriarProduto` — o que está em memória pode ter envelhecido com a tela aberta.

**Medido em Chromium, com a fila semeada em memória** (3 itens: 2 `pending`, 1
`approved`): modo normal → 0 checkbox e os botões de linha de pé; modo seleção → 3
checkboxes, botões de linha somem, contadores 2/3 corretos, "selecionar todos"
marca os 3, "Cancelar" limpa a seleção. Chamar apagar sem seleção devolve
"Selecione ao menos um item" e **não fala com o banco**.

### 3. Tutorial de Boas-Vindas: sem fundo borrado, e o "Próximo" leva para a tela

Duas mudanças no `onboarding.js`/`onboarding.css` — o guia é o
`showCompleteSetupGuide()`, disparado por `initConfigOnboarding()` ao entrar em
Config Afiliados.

- **`backdrop-filter: blur(2px)` removido** do `.guide-overlay` e o escurecimento
  caiu de `rgba(0,0,0,.5)` para `.28`.
- **O cartão saiu do centro e foi ancorado embaixo** (`align-items:flex-end`), com
  `pointer-events:none` no container e `auto` no cartão. Sem isso, tirar o blur não
  resolveria nada: o cartão centralizado tapava justamente a tela que o passo
  aponta.
- **`irParaTelaDoPasso()`**: cada passo já apontava para o item de menu pelo
  `targetSelector` (`[data-page="conexao"]`, etc.). O destino é extraído desse
  seletor e vai para o `window.go()` do painel. Um passo pode declarar `goPage`
  explicitamente, que tem prioridade. Sem destino, ou sem `go()` na página, o guia
  se comporta como antes.

**Medido em Chromium, os 6 passos clicados um a um:**

| passo | `.page.on` depois do clique | `backdrop-filter` |
|---|---|---|
| 1 · Vamos Configurar Tudo | `page-config-afiliados` | `none` |
| 2 · Dados Pessoais | `page-meus-dados` | `none` |
| 3 · WhatsApp Conectado? | `page-conexao` | `none` |
| 4 · Seu Plano | `page-assinatura` | `none` |
| 5 · Preferências | `page-config-afiliados` | `none` |
| 6 · Parabéns | `page-post-relampago` | `none` |

O `.guide-highlight` acompanha o item de menu em todos os seis. "Concluído!" fecha
e marca `dismiss`. Console sem `pageerror` na varredura inteira.

### ⚠️ O que isto NÃO prova

Foi medido num Chromium headless servindo os arquivos do repo, **deslogado** — sem
Supabase, sem sessão, com a fila semeada à mão. Prova que o código faz o que diz
sobre o DOM real da SPA. **Não prova** o `DELETE` em lote contra o banco de verdade
(a policy foi lida, o delete não foi executado), nem a aprovação em lote criando
produto, nem nada disso servido pelo nginx. **Falta o Deploy no EasyPanel e uma
conferência do Érico logado** — ver P54.

### 🔴 Descoberta de lado: as duas cópias do `index.html` ESTÃO divergentes

O doc manda editar as duas idênticas. Elas não estão, e há tempo:

| falta em | o quê |
|---|---|
| `index.html` (raiz) | a aba **Mega Results** inteira — item de menu, `<section id="page-mega-results">` e o bloco `<script>` de 9.296 bytes. **279 linhas** |
| `frontend/index.html` | o pixel do **Metricool** (`tracker.metricool.com/c3po.jpg`). 1 linha |

As alterações desta sessão foram aplicadas **idênticas nas duas** por script, com
asserção de âncora única. A divergência anterior **não foi mexida** — escopo
estrito. Virou a **P53**.

---

**REVISÃO 40 — 07/08/2026 (manhã) — CORRIGE A REVISÃO 39, que datou a si mesma
errado e abriu DUAS pendências falsas por causa disso.**

🔴 **A sessão que produziu a REVISÃO 39 atravessou três dias** — começou em 04/08
à noite e terminou em 07/08 de manhã. As medições foram tomadas na terça e tratadas
como "agora" na sexta. Consequências, todas corrigidas nesta revisão:

| o que a REVISÃO 39 afirmou | o que o dado de 07/08 diz |
|---|---|
| **P48** — o ramo `desconhecido` não carimba; La Roche preso há 5 dias | **REFUTADA.** La Roche carimbado em `07/08 06:00`; o carimbo mais antigo da base saiu de `30/07 14:16` para `02/08 06:00` |
| **P52** — os relógios do log e do banco não batem | **NÃO EXISTE.** Medido: sandbox `07/08 10:46:34`, banco `07/08 10:46:35`, Érico "10:45". Um segundo de diferença |
| **P34** — 2 das 3 exigências | **FECHADA.** Os 4 da Amazon saíram de `30/07 14:16` |
| P50 e P51 datadas 04/08 | são de **07/08** |

**A rodada do cron rodou QUATRO vezes, não uma** — 04, 05, 06 e 07/08, todas 06:00
SP. A REVISÃO 39 leu a primeira e escreveu uma lei a partir dela.

| rodada | candidatos | novos | antigos | conferidos | desconhecidos | pulados |
|---|---|---|---|---|---|---|
| 04/08 | 12 | 8 | **4** | 6 | 2 | 0 |
| 05/08 | 12 | 8 | **4** | 2 | 3 | 4 |
| 06/08 | 12 | 8 | **4** | 4 | 3 | 4 |
| 07/08 | 12 | 8 | **4** | 7 | 2 | 3 |

A reserva de cota da v20 entrega `candidatos_antigos = 4` em **todas** as rodadas e o
backlog anda. É o contrário do que a P48 afirmava.

### E a P36 ficou mais urgente, medido em 07/08

| | 04/08 | 07/08 |
|---|---|---|
| `resolve_falhou` · `store='mercadolivre'` em 24h | 22 | **56** |
| `loja_filtrada` (`[pos-filtro]`) | 0 | **0** |

O `loja_filtrada` continuar em **0** com o chip do ML desmarcado há três dias é a
confirmação independente de que esses links morrem na `resolve-link`, **antes** do
filtro da v16 — o chip é pré-requisito do pré-filtro, não produtor de sinal próprio.
São **56 chamadas HTTP por dia** gastas para sempre recusar.

🔎 **Sinal novo:** apareceu uma recusa com `link_host = meli.la` e `store` nulo — o
primeiro indício direto de que parte desses links chega **encurtada**. `meli.la` está
no `DOMINIOS_LOJA` da v17, então é caso que o pré-filtro pega.

---

**Sessão de 04/08/2026 (noite) a 07/08/2026 (manhã), REVISÃO 39 — nenhuma linha de frontend alterada, e
mesmo assim quatro pendências mudaram de estado. Mais a Shopee voltando a ser lida
no Postar Agora.**

| | |
|---|---|
| Commits | 1 · `product-search` v27 + este doc |
| Edge Functions | `product-search` **v27** deployada e provada (`version` 45 → 46, `ezbr_sha256` `6f9d61f8…` → `710156e3…`) |
| Frontend | inalterado |
| Repo × produção | batendo, menos a `clone-ingest` (repo v17, produção v16 — P36) |

**Próxima ação sugerida:** acertar os relógios (P52) e então deployar a
`clone-ingest` v17 como primeira ação de contexto limpo.

### P33 — FECHADA por medição

Os 9 descontos órfãos receberam `discount_pct = null` — **`null`, não `0`**, que é o
que a v19 faz no código (`product-refresh` linha 757).

| | antes | depois |
|---|---|---|
| Mercado Livre | 5 | **0** |
| Amazon | 4 | **0** |
| Shopee | 15 | 15 *(intencional — P32)* |
| **controle:** com "de" **e** desconto | 65 | **65** |

A rodada de 04/08 não restaurou nenhum "de" sozinha (`de_corrigidos` 0,
`de_apagados` 0), então a condição combinada em 03/08 estava satisfeita. O mais caro
dos nove: **Kit Rapunzel**, anunciando **−56%** sobre um preço que a própria rodada
mediu **subindo** de 58,52 para 92,00.

### P34 — a rodada de 04/08 09:00 UTC, lida no mesmo dia · 2 das 3 exigências

`product_refresh_runs` tem **1 linha**, `2026-08-04 09:00:23.787 UTC`.

| # | Exigência | Veredito |
|---|---|---|
| 1 | a tabela deixa de estar vazia | ✅ |
| 2 | `candidatos_antigos > 0` | ✅ **4** — `candidatos` 12 = **8 novos + 4 antigos** |
| 3 | os 4 da Amazon saem de `30/07 14:16` | 🟡 **3 de 4** |

**A reserva de cota da v20 funcionou como piso.** Contadores: `preco_mudou` 4,
`de_corrigidos` 0, `de_apagados` 0, `pulados` 0, `desconhecidos` 2,
`lidos_da_loja` 10, `duracao_ms` 20004, **`usos_do_pool_compartilhado` 0**.

🔴 **E ela entregou a P48 de lado.** O La Roche **foi lido** — está nos detalhes como
`? pagina de produto sem botao e sem outOfStock`, um dos 2 `desconhecidos` — e **não
carimbou** `price_checked_at`. Continua em `30/07 14:16:02.187`, o carimbo mais antigo
da base. É o mecanismo da P29 no ramo `desconhecido` em vez do `pulado`: o `pulados`
da rodada foi **0**, então o conserto da v17 pegou aquele caso e deixou este de fora.
Medido: 12 candidatos, **10 carimbados**, `min(price_checked_at)` inalterado.

### P47 — MEDIDA, e o defeito tem duas caras

Medido no navegador logado às **23h BRT**, dentro da janela em que os fusos discordam:

```
gate usa: 2026-08-05T00:00:00Z
correto : 2026-08-04T00:00:00Z
iguais?  false
```

O gate do Starter faz `.gte("sent_at", hoje+"T00:00:00Z")` com `hoje` em UTC
(`index.html` linha **9372** — o doc dizia ~9313 —, idêntico nas duas cópias):

- **00h–21h BRT** — a janela começa às **21h de ontem**. O que saiu ontem à noite
  conta contra a cota de hoje. *Barra cedo demais.*
- **21h–meia-noite BRT** — `hoje` vira o dia seguinte em UTC e a janela reinicia.
  *O contador zera e libera **5 posts a mais**.*

Um Starter que estourou o limite ganha **uma segunda cota de 5 todo dia às 21h**.
Limite de plano vazando — parente da P5. **Terceiro caso, não listado antes:** linha
**2660**, o gráfico de 14 dias monta o **rótulo** em hora local e a **chave** em UTC;
depois das 21h cada clique cai na barra do dia errado.

⚠️ **O que foi medido e o que foi lido, ditos separadamente:** a divergência foi
avaliada **no console, na hora** — é do relógio, não do bundle. O que a liga ao gate é
a **leitura** do código na linha 9372. Conserto: reusar o `csDiaBR` (linha 8600) nos
três lugares, nas **duas** cópias. Não codado — escopo estrito.

### P36 — a premissa caiu na medição, e o chip resolveu

**A fonte que captura hoje, "Grupo de Achadinhos #34", tinha `mercadolivre` em
`lojas_permitidas`.** O pré-filtro da v17 só recusa quando nenhum link cru está nas
lojas permitidas — com o ML permitido ele **nunca dispararia**, e o deploy teria
pegado zero. O comentário da própria v17, linha 214, diz a premissa em que foi
escrita: *"nas duas fontes, onde o ML nem está em lojas_permitidas"*. Era verdade para
a TáNaMão e a "Melhores Ofertas"; a fonte que capta hoje é outra. A "Melhores
Ofertas", que de fato exclui o ML, está **`active = false`**.

**Feito:** Érico desmarcou o chip do ML no card. Lido no banco — `lojas_permitidas`
agora é **`["shopee","amazon"]`**. Isso **fecha por clique real a última ressalva da
P31** (`csAlternarLoja` gravando no banco, aberta desde 01/08; a P46 tinha fechado só
o `csAjustarTeto`).

⚠️ **Correção de um erro desta sessão, registrada de propósito:** foi previsto que o
chip faria os links de ML virarem `[pos-filtro]` ainda com a v16, servindo de degrau
intermediário. **Errado, e foi dedução, não leitura.** O filtro da v16 mora **depois**
da `resolve-link` (linha 1196) e esses links morrem antes, porque são vitrine. O chip é
**pré-requisito** do pré-filtro, não produtor de sinal próprio.

**Baseline para o deploy:** `resolve_falhou` + `store='mercadolivre'` em 24h = **22**,
e **22 de 22 são o MESMO link**, `mercadolivre.com.br` `/social/ofertinhas`. `salvo`:
20 Amazon + 10 Shopee. `teto`: 81 (30/30) + 32 (10/10). Achadinhos #34 em **30/30**.
⚠️ O teto é avaliado **antes** do pré-filtro (linha 1114 contra 1132): nada chega ao
pré-filtro enquanto a fonte estiver no teto.

### P50 — o Postar Agora não lia Shopee · `product-search` v27

**Causa: a P26 de novo, no arquivo vizinho.** O `prBuscarProduto` manda o link **cru**
para a `product-search`, sem passar pela `resolve-link`, e o leitor de Shopee de lá
reconhecia **um único** formato, `/product/LOJA/ITEM`. Teste de mesa com os 5 formatos
conhecidos: **4 falhavam**, inclusive o mais comum. O `shp.ee` nem era detectado como
Shopee (`detectStore` procura a string `"shopee"`).

🔴 **E a tela mentia sobre a causa.** Em falha, o frontend (linha 7891) **ignora o
`d.error`** e monta a explicação sozinha; como o Érico *tem* App Key, caía no
`prDicaLoja` genérico — *"Shopee requer credenciais oficiais"*. Ele tem as duas.
Mensagem única para causas diferentes, de novo.

**Conserto (v27):** quando o regex não acha os IDs, chama a **`resolve-link`** e refaz
a leitura com a URL normalizada. **Os formatos NÃO foram copiados para cá** — cópia de
um *subconjunto* é pior que nenhuma: dá aparência de cobertura e deixa de fora justo o
caso da P26. Seria gêmea da P43. Mais `shp.ee` no `detectStore` e `motivo` em campo
próprio. O JWT de quem chamou é repassado à `resolve-link`, **não** a `SERVICE_ROLE` —
em projeto com chave nova a service role pode não ser JWT, e isso daria 401 silencioso.

✅ **PROVADO POR COMPORTAMENTO:** mesmo link, post saiu com nome, foto e R$ 61,99.
`product-search` **200 na version 46**, 951 ms. E não é inferência: o link não tem
`/product/N/N`, então o único caminho até os IDs é o desvio pela `resolve-link`.

**Sobre o "de" não aparecer na Shopee:** não é regressão, é a **P32**. A API de
afiliado não devolve preço anterior, só a taxa.

### P49 — o cache do navegador quase reabriu uma pendência certa

Na primeira leitura, `csDiaBR`/`csAjustarTeto`/`csTetoBarradoHtml` vieram
**`undefined`** no painel logado, com as de 01/08 em `function`. A conclusão óbvia
seria reabrir a P46. O controle que separou:

```js
fetch(location.pathname+"?nc="+Date.now(),{cache:"reload"})
  .then(r=>r.text()).then(t=>console.log(t.length, t.includes("csDiaBR")))
```

Servido pelo nginx: **640.669** caracteres, `csDiaBR: true` — **exatamente** o
`length` UTF-16 do arquivo do repo (649.415 bytes UTF-8; a diferença era acento
contado em dobro, não versão). As duas cópias do `index.html` com **md5 idêntico**.
O nginx estava certo; a aba servia bundle anterior a 04/08. Depois do `Ctrl+Shift+R`,
as três viraram `function` e o console ficou limpo.

---

**Sessão de 04/08/2026 (tarde, REVISÃO 38) — P46 FECHADA no navegador logado, e com
ela cai a ressalva que a P31 carregava desde 01/08: um clique de mouse real gravando
no banco.**

| | |
|---|---|
| Commits | 1 · só este doc |
| Código | nada novo. Esta revisão é medição |
| Deploy | auto-deploy do `app` pegou sozinho, conferido no código servido |

✅ **A REVISÃO 37 está no ar e EXECUTOU** — não é conferência de bytes. Lido na sessão
logada do Érico, em `www.megalinksbr.com.br`:

| conferência | resultado |
|---|---|
| `csDiaBR`, `csTetoBarradoHtml`, `csAjustarTeto` | **todas `function`** |
| **controle:** `csRender`, `csSalvar`, `csAlternarLoja`, `csVereditoHtml` | **continuam `function`** |
| `.cs-barrado` e `.cs-teto-bt` nas folhas carregadas | **presentes** |
| console num load completo | **zero erros** |

O controle das peças antigas é o que descarta TDZ: se o bloco `<script>` tivesse
explodido no meio, `csRender` teria sumido junto — foi essa a assinatura do `f94e2f0`.

### ✅ O clique real, que faltava há duas sessões

A P31 fechou em 01/08 com uma ressalva escrita: *"um clique real num chip, na sessão
logada, gravando no banco, NÃO foi observado"*. O `csAjustarTeto` usa **o mesmo padrão
de `update`** do `csAlternarLoja`, e agora esse padrão foi exercitado com **clique de
mouse de verdade** — não `.click()` programático, não chamada de função:

| | |
|---|---|
| antes do clique | `max_per_day` = **30** no banco |
| clique de mouse no `+` do card | 1 clique só |
| depois | `max_per_day` = **35** no banco, e a tela redesenhou com 35 em **3 lugares** |

**Um clique só, de propósito.** Clicar duas vezes e voltar ao estado inicial dá
resultado idêntico ao de "não funcionou" — é o erro de método registrado em 01/08.
**Estado restaurado por UPDATE explícito** de volta para 30, que é o valor decidido,
e a restauração está marcada como restauração e não como teste.

### A contagem bate com o banco

| | tela | banco (dia em São Paulo) |
|---|---|---|
| barradas por teto | **32** | **32** |
| capturadas | **11** | **11** |

E o **controle negativo estava do lado, na mesma imagem**: a "Melhores Ofertas da
Internet" tem 4 capturadas em 24h, `tetoHoje = 0` e **nenhuma linha laranja** — a
linha só renderiza onde há barrada, como desenhada.

⚠️ **O que isto NÃO prova.** O chip de loja da P31 continua sem clique real próprio;
o que foi exercitado é o padrão de escrita que os dois compartilham. E `csDiaBR` foi
medido no navegador com os casos de virada — às 21h BRT o código antigo devolveria
`2026-08-05` e o novo devolve `2026-08-04`, confirmando que o defeito das 3 horas era
real e não dedução de leitura de código.

---

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
| Frontend | Landing pública (`landing.html`, servida em `/`) + painel SPA (`index.html`, ~11.600 linhas, servido em `/painel/<aba>`) | nginx, EasyPanel (Hostinger VPS) |
| Backend | Supabase `nxlfezpagporealqqbfj` (sa-east-1) — Postgres, RLS, Edge Functions, pg_cron, pg_net | Supabase Cloud |
| Motor WhatsApp | Node.js/Baileys (`wa-engine/server.js`) | EasyPanel, mesma VPS |
| Scraping ML | Scrape.do (proxy residencial) | Chamado pelo wa-engine |
| E-mail | Resend (`RESEND_API_KEY` em Supabase Secrets) | — |
| Pagamentos | **Asaas — produção, ativo, cartão habilitado, pagamentos reais funcionando** | Webhook `asaas-webhook` |
| Repo | `rocketdesignbh-dot/megalinksbr` (público) | — |

✅ **`frontend/` é a ÚNICA fonte de deploy, e desde a REVISÃO 44 é a única que
existe.** O `Dockerfile` mora em `frontend/` e faz `COPY index.html` — relativo ao
contexto `frontend/`. Não há Dockerfile na raiz. **Prova observável:** o Mega Results
aparece no site em produção e existe *apenas* em `frontend/index.html`.

~~O `index.html` da raiz é uma cópia sincronizada à mão. Os dois precisam receber
edições idênticas.~~ **Regra revogada.** Ela existia para compensar uma duplicação que
não precisava existir, e falhou: a cópia da raiz ficou 279 linhas atrás sem ninguém
notar (P53). As 7 cópias da raiz — `index.html`, `guia.html`, `revops.html`,
`onboarding.js`, `onboarding.css`, `robots.txt`, `sitemap.xml` — foram **apagadas**.
Nenhum arquivo da raiz era exclusivo; todos tinham par em `frontend/`.
**Editar só `frontend/`.**

### URLs
- Site (landing pública): `https://www.megalinksbr.com.br/` → `landing.html`
- Painel: `https://www.megalinksbr.com.br/painel` e `/painel/<aba>` → `index.html`
  (a aba é escolhida pelo roteador do front; `/painel/radar`, `/painel/clone-post`, …)
- Guia: `https://www.megalinksbr.com.br/guia`
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
- **Frontend — fila de clones (REVISÃO 41):** modo de seleção **opt-in** pelo botão
  "☑️ Selecionar". Ligado, mostra checkbox por linha, "Selecionar todos" e dois
  botões em lote; os botões de linha somem enquanto ele estiver ligado. **Aprovar
  em lote só age nos `pending`; apagar age em qualquer item** — as duas contagens
  na barra são diferentes de propósito. **Apagar é `DELETE` na `clone_posts`**, não
  `status='rejected'`; quem quiser manter histórico usa Descartar. Autorizado pela
  policy `clone_posts_owner` (FOR ALL, `user_id = auth.uid()`).
- **Frontend — MegaIA (REVISÃO 41):** o botão flutuante só aparece em tela que tenha
  campo `data-cta-manual` — Postar Agora e Editar Grupo → Layout. Clone Post **não
  tem**, então a MegaIA não aparece nele.
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

### Mega Results — piloto fechado (auditado 26/08 · REVISÕES 73–80)

Importação de relatório de afiliado + dashboard de métricas.

- **Frontend (`page-mega-results`):** duas sub-abas, as duas NO AR E MEDIDAS.
  **Importar** — Conexão, Importar relatório (upload + progresso por polling
  em `import_batch`), Importações recentes; sem mudança desde a REVISÃO 78.
  **Métricas (REVISÃO 80/82, MEDIDA EM PRODUÇÃO 26/08)** — seletor de
  período, 8 KPIs com comparação vs. período anterior, gráfico de comissão
  por dia, breakdown por loja; consome `mega-results/metrics/query` pela
  primeira vez desde que a função existe (08/08). Medida no navegador logado
  do Érico via Claude in Chrome: KPIs batendo com o dado real, período
  reagindo, console limpo. Ver P74.
- **Backend de importação:** `mr-ingest` (serviço Node no EasyPanel, streaming
  CSV/XLSX → `megaresults.import_batch`/`fact_transaction`). **Não entra no
  auto-deploy**, exige Deploy manual. Última confirmação de estar no ar: REVISÃO
  60/62 (22/08).
- **Backend de métricas:** Edge Function `mega-results` (`ACTIVE`, version 8, desde
  08/08) — API completa (`POST /metrics/query`, totais, série diária, comparação
  de período, breakdown por dimensão), lê `megaresults.rollup_daily`. **Nunca
  citada neste doc antes da REVISÃO 73 e nunca chamada pelo frontend.**
- **Acesso:** piloto por `megaresults.pilot_access` (1 linha, só o Érico); nenhum
  plano tem `mr_enabled=true` — por desenho (migration 13, 10/08).
- **Dado real no banco (26/08, depois da primeira importação de verdade):** 4
  conexões (todas Shopee); 10 importações, sendo **1 relatório real** —
  `WebsiteClickReport202608260015.csv`, `completed`, **40/40 linhas**, gravadas
  em `megaresults.fact_click` (19–24/08). As outras 9 são o mesmo arquivo de
  teste de 1 linha. `fact_transaction` segue com 1 linha. Só `shopee` tem
  `field_mapping` — nenhuma outra loja importa hoje.
- ⚠️ **O upload só funciona com o conserto da P79 aplicado.** Ele está no repo e
  **não** em produção: até o Deploy do `app`, a tela falha com 400.

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
| Shein (leitura no Postar Agora) | 🔴 **SEM LEITURA AUTOMÁTICA — MEDIDO E FECHADO EM 25/08 (REVISÃO 69, P44).** v28 devolvia dado errado (home da loja); v29 mede confirmado: agora falha limpo (`leitura_falhou`) em vez de mentir. Causa é estrutural (Shein é SPA sem SSR de meta tag; Microlink não renderiza JS) — sem conserto barato. Usuário preenche manualmente, como as outras 4 lojas da P44. Afiliação de link já funciona (genérica, via `prGerarLinkAfil`) |
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

### Landing pública e roteamento por URL (REVISÃO 63 — NÃO MEDIDO EM PRODUÇÃO)

- `frontend/landing.html` é servido em `/` por `location = /`. Não carrega
  Supabase nem o bundle do painel.
- O painel vive em `/painel` e `/painel/<aba>` (`location /painel` →
  `index.html`). A aba é resolvida no front por `rotaDaURL()`, que só aceita
  slug que corresponda a uma `<section id="page-…">` existente e barra `adm-*`
  para quem não é `IS_ADMIN`.
- **Não usar `#hash` para rota.** O hash é do Supabase (recovery e OAuth).
- **Todo asset novo no `index.html` precisa de caminho absoluto** (`/arquivo.js`).
  Caminho relativo resolve para dentro de `/painel/` e o nginx devolve HTML.
- A landing é responsável por: capturar `?cupom=`, repassar `utm_*`/`cupom`/
  `gclid`/`fbclid` para os links do painel, e encaminhar fluxos de auth que
  caem na raiz para `/painel`. Mexer nela sem isso quebra atribuição calada.
- `rotaAplicarEntrada()` limpa a query string. Ela é chamada **no fim** do
  `afterLogin`, depois dos deep links (`?admin=vip`) terem lido `location.search`.

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
| ~~P33~~ | ✅ **FECHADA 04/08 à noite.** Os 9 órfãos de ML e Amazon receberam `discount_pct = null` por UPDATE à mão, depois da rodada de 04/08 (que não restaurou nenhum "de": `de_corrigidos` 0, `de_apagados` 0). Restam os 15 da Shopee, intencionais. Controle de 65 produtos com "de" **e** desconto intacto. Ver "Última alteração". Registro original abaixo. ~~🟡 DEPLOYADA EM 03/08 (dentro da v20), AGUARDANDO PROVA.~~ Apagar o "de" deixava o `discount_pct` de pé — 5 produtos com porcentagem órfã em 02/08. O `send-post` **não** usa o campo (o post sai limpo); a lista de produtos do painel usa (linha 5799) e o formulário regrava (linha 8271). v19 zera junto, só no ML e na Amazon, onde o desconto é derivado do "de" — a Shopee fica de fora por construção (decisão da P32). 🔴 **CORREÇÃO 03/08: a v19 NÃO alcança os órfãos que já existem** — a guarda `antes !== res.precoDe` compara `null` com `null` e pula o bloco. Ela impede órfão novo, só isso. **Medidos hoje: 24 órfãos** — 15 Shopee (intencional), 5 ML e 4 Amazon. Os 9 de ML e Amazon exigem UPDATE à mão, **combinado para depois da rodada de 04/08**, que pode restaurar o "de" de alguns sozinha | 02/08 |
| ~~P34~~ | ✅ **FECHADA 07/08.** As três exigências combinadas antes do deploy da v20 estão cumpridas: `product_refresh_runs` populada (4 rodadas), `candidatos_antigos` = **4 em todas**, e os 4 produtos da Amazon saíram do carimbo `30/07 14:16` — três em `04/08 06:00` e o La Roche em `07/08 06:00`. O carimbo mais antigo da base foi de `30/07` para `02/08`. Registro original abaixo. ~~🟢 2 DAS 3 EXIGÊNCIAS PROVADAS EM 04/08.~~ `product_refresh_runs` tem 1 linha; `candidatos_antigos` = **4** (12 = 8 novos + 4 antigos), a reserva funcionou como piso; dos 4 da Amazon, **3 saíram** do carimbo `30/07 14:16` e o La Roche **não** — ver **P48**. Registro original abaixo. ~~🟡 DEPLOYADA EM 03/08, AGUARDANDO PROVA.~~ ~~A rodada diária só alcança produto recém-criado.~~ Medido em 03/08: os 11 carimbos da rodada foram **todos** de produtos criados no mesmo dia às 03:25. 27 produtos criados em 24h contra `BATCH = 12`; 19 ainda com `price_checked_at` nulo; **4 Amazon parados desde 30/07 14:16** (La Roche, Kit Rapunzel, Kärcher, Calvin Klein). `nullsFirst` + ingestão maior que o lote = produto que já tem carimbo nunca volta à fila. **Não é bug do `nullsFirst`** — é o lote ser menor que a entrada diária. Saídas não decididas: subir o `BATCH`, rodar o cron mais de uma vez por dia, ou reservar parte do lote para os carimbados mais antigos. **Consertada em 03/08.** Saída escolhida: **reserva de cota** (`RESERVA_ANTIGOS = 4`, piso e não teto), a única sem aumento de consumo de leitura — `BATCH` segue 12. Duas filas (`novos` por `created_at`, `antigos` por `price_checked_at`) no lugar da ordenação global com `nullsFirst`. Contadores `candidatos_novos`/`candidatos_antigos` entram na resposta e no `resumo` jsonb, sem migration. Lógica testada em 8 cenários com os números reais do banco. ⚠️ **A v20 contém a v19**: o deploy de 03/08 à tarde entregou as duas. **Deployado não é provado** — a prova é a rodada de 04/08 09:00 UTC, com `candidatos_antigos > 0` e os 4 da Amazon saindo de `30/07 14:16`. Enquanto isso não for lido, esta pendência fica 🟡 | 03/08 |
| **P35** | 🟠 **Qualquer usuário autenticado obtém o `WA_ENGINE_TOKEN` da plataforma inteira.** Achado de lado ao investigar a P3, em 03/08. O `get-wa-engine-token` **não checa nada em código** (1391 bytes, devolve o token e a URL); a proteção mora só em `verify_jwt: true`, que está **medido** como ligado — não há exposição pública, mas basta uma conta cadastrada para receber a credencial que controla o `wa-engine` de **todos**. 🔴 **CORREÇÃO 03/08: "autorizar por plano" foi decidido e depois DERRUBADO pela medição.** Não existe plano sem WhatsApp: `starter` tem `wa_groups ≥ 1` e **1 dos 5 starters tem instância conectada**. Um gate por plano excluiria ninguém — toda conta cadastrada continuaria recebendo o token mestre. **Sobram duas saídas de verdade:** (a) **token por usuário no engine**, escopando `/sessions`, `/disconnect` e `/send` ao dono — resolve a raiz, mexe no `wa-engine` inteiro e em todo chamador; (b) **registrar o risco** com a ressalva de que um deploy com `verify_jwt: false` abre tudo, sem nada no código para segurar. **Não decidida** | 03/08 |
| **P36** | 🟡 **CODADA E VALIDADA EM 03/08 (REVISÃO 30) — NÃO DEPLOYADA.** ~~Pré-filtro de domínio antes da `resolve-link`, decidido e não codado.~~ `clone-ingest` **v17** no repo, produção em **v16**. Mapa `DOMINIOS_LOJA` (host → loja, casando por sufixo, cobrindo `meli.la`, `s.shopee.com.br`, `amzlink.to`, `link.amazon`, `shp.ee`, `a.co`) + `lojaDoDominio()` + `linksDoTexto()`. **Regra conservadora:** só recusa quando **todos** os links do texto têm domínio reconhecido **e** nenhum está em `lojas_permitidas`; um único link desconhecido faz a mensagem seguir para a `resolve-link` como na v16. Array vazio = todas, então fonte sem filtro não muda. As duas recusas ficam separáveis no log pelos prefixos **`[pre-filtro]`** e **`[pos-filtro]`** — é isso que vai medir se o pré-filtro pega 44/dia ou zero. Validação de 03/08: `esbuild` parse limpo do arquivo inteiro, `node --check` no bundle, `const permitidas` declarada 1 vez só, **12/12 cenários** conforme o esperado. 🔴 **Premissa corrigida na medição:** as 44/dia são `resolve_falhou`, não `loja_filtrada` — `loja_filtrada` em 24h é **0**, o filtro da v16 nunca disparou para este caso. **Baseline gravada 03/08 13:53:12 UTC:** `resolve_falhou`+`mercadolivre.com.br` = **44**, `loja_filtrada` = **0**, `salvo` = 17, total = 100. **Falta só o deploy e a prova por comportamento** | 03/08 |
| **P16** | 🔴 **DEIXOU DE SER TEÓRICA EM 03/08 — ela é a causa da P4.** ~~O auto-deploy torna inexecutável qualquer instrução do tipo "deploye A antes de rebuildar B".~~ Medido: **todo push para o `main` reinicia o `wa-engine` em produção**, inclusive push só de documentação. 4 boots em 35 minutos em 03/08, 3 deles casados com eventos conhecidos, e 53 minutos sem push = sem restart. **Custo por push:** a `CLONE_FILA` (memória) é descartada, as 3 sessões levam `conflict/replaced` 440 do WhatsApp e o container antigo e o novo disputam a sessão por alguns segundos. O engine trata certo (`Não reconectar`), então não há laço — mas há janela. Decidir: gate técnico ou **desligar o auto-deploy do serviço `app`** | 31/07 |

| ~~P32~~ | ✅ **FECHADA 01/08 noite.** A Shopee devolvia `price_from = node.price`, que é o preço ATUAL e não o anterior; 3 de 3 capturas reais saíram com "de" == "por" e desconto de 53%/42%/35%, já no rodízio do grupo. `product-search` **v25** para de enviar `price_from` para a Shopee. Os 3 produtos foram limpos. O Radar, que tem leitura própria, **não** tinha o defeito — terceira vez que duas implementações da mesma coisa divergem neste repo | 01/08 |
| **P37** | 🔴 **Provar o `Link Rápido` por comportamento.** A aba foi codada e validada só no arquivo (`node --check` nos 4 blocos inline, `md5sum` idêntico entre as duas cópias). **Não foi aberta em produção nem uma vez.** Medir, depois do Deploy, com um link real de cada caminho: **Shopee encurtada** (`s.shopee.com.br/…`), **ML `/sec/`**, **Amazon `amzn.to`** e **um link completo, sem encurtador**. Em cada um, conferir na tela: (1) o alerta ficou verde, (2) o link entregue contém o ID de afiliado da conta logada — abrir o link e olhar a URL final, não confiar no que a tela escreveu. Testar também o caminho amarelo: loja **sem** credencial cadastrada tem que recusar o verde | 03/08 |
| ~~P38~~ | ✅ **FECHADA 04/08 por comportamento.** ~~Provar o cadastro por link de convite.~~ Medido às 13:32 UTC: **39 linhas** em `clone_ingest_log` para `120363042232139638@g.us`, sendo **10 `salvo`** (8 Amazon, 2 Shopee), 26 `teto` e 3 `resolve_falhou`. Última linha 30 s antes da consulta. Fecha o convite **e** o desembrulho da mensagem temporária no mesmo experimento: a fonte foi cadastrada por link de convite e a captura só passou a existir depois do conserto do `ephemeralMessage`. Antes: zero linhas em 10 h 20 | 03/08 |
| ~~P45~~ | ✅ **RESOLVIDA 04/08 à tarde, e a premissa dela caiu na medição.** ~~O teto de 10/dia virou o gargalo.~~ **O teto foi criado para conter Scrape.do no ML; as capturas desta fonte são 8 Amazon + 2 Shopee, zero ML — custo de crédito ZERO.** Teto encheu em **32 minutos** (08:16→08:48 BRT), 31 recusas nas 2h seguintes, ritmo de ~15 mensagens/hora, aproveitamento de **77%** contra 17–21% das fontes antigas. Fila de revisão não era gargalo: 53 approved, 8 rejected, 10 pending todos de hoje. **Feito:** `max_per_day` 10 → **30** nas duas fontes (baseline registrado), linha própria no card com o que o teto barrou (`csTetoBarradoHtml`) e botões `−`/`+` para ajustar (`csAjustarTeto`, clamp 1–50, o mesmo do formulário). ⚠️ **O default da coluna continua 10** — fonte nova nasce em 10 de propósito, mudar isso é decisão de produto. ✅ **Provado por comportamento 7 min depois do UPDATE:** a captura nº 11 saiu `salvo` (com teto 10 teria saído `teto`, como as 31 anteriores), `captured_today` 10 → 11, `clone_posts` novo `pending`. ⚠️ **Efeito colateral medido:** o teto era o que segurava as 44 recusas/dia de vitrine de ML antes da `resolve-link` — com o teto em 30 elas voltam a gastar chamada, o que **torna o deploy da P36 (v17) necessário e não mais opcional**. **A prova de tela é a P46** | 04/08 |
| ~~P46~~ | ✅ **FECHADA 04/08 à tarde, no navegador logado.** As três funções novas são `function` no código servido e as antigas continuam de pé (controle que descarta TDZ); `.cs-barrado`/`.cs-teto-bt` presentes; console limpo num load completo. **Clique de mouse real no `+`: `max_per_day` 30 → 35 no banco**, tela redesenhada com 35 em 3 lugares, estado restaurado para 30 por UPDATE explícito. Contagem da tela **32/11** bate com o banco **32/11** contando pelo dia em São Paulo. Controle negativo na mesma imagem: "Melhores Ofertas" com `tetoHoje = 0` e sem a linha. Registro original abaixo. ~~🔴 Provar no navegador o card do teto — nada disto foi aberto em produção.~~ Depois do Deploy do `app`, na sessão logada: (1) a linha laranja **⛔ N oferta(s) ficaram de fora hoje** aparece no card do Achadinhos #34 e o N bate com `select count(*) from clone_ingest_log where status='teto'` **do dia em São Paulo**; (2) um clique real no **+** grava `max_per_day` no banco — conferir a linha, não a tela, que é a ressalva que a P31 deixou aberta por duas sessões; (3) o **−** em 1 e o **+** em 50 recusam com toast; (4) fonte **sem** barrada não mostra a linha (a "Melhores Ofertas" serve de controle negativo); (5) console limpo num load completo, e `csRender`/`csSalvar` continuam `function` — é esse controle que descarta TDZ. ⚠️ **O smoke test NÃO cobre este código:** ele para no falso positivo da linha 2496, e o código novo está na ~8700 | 04/08 |
| **P47** | 🟡 **O mesmo defeito de fuso do card pode estar no limite diário do Starter.** `new Date().toISOString().slice(0,10)` aparece mais 2 vezes no `index.html`: KPI de cliques (~2639) e **limite de 5 posts/dia do plano Starter (~9313)**. O do card foi corrigido nesta sessão (`csDiaBR`); os outros dois **não foram tocados** por escopo estrito. O do Starter decide se um post é bloqueado — entre 21h e meia-noite BRT o contador dele pode virar cedo demais e liberar 5 posts a mais, ou barrar cedo. **Lido no código, NÃO medido** | 04/08 |
| **P39** | 🟡 **Fonte cadastrada em grupo onde a sessão não está falha calada.** O invite info responde para qualquer código válido, então dá pra cadastrar fonte de grupo alheio e ela nunca captura — sem erro em lugar nenhum. Hoje o único aviso é texto na tela. Sinalizar no card da fonte quando ela passar N dias com **zero** linha em `clone_ingest_log`: é o mesmo defeito de fundo de "mecanismo que parece existir e não executa nada" | 03/08 |
| **P40** | 🔵 **Inventário de grupos ouvidos no `wa-engine`** — registrar `jid → {nome, visto_em}` de todo grupo de onde chega mensagem e somar essa lista à do Baileys no dropdown. **Adiado de propósito:** o registro teria que acontecer **antes** do filtro `CLONE_DONOS`, no caminho quente de toda mensagem de toda sessão, incluindo a admin `…73545214` — e errar o filtro por `phone` no endpoint vaza nome de grupo entre contas, que é exatamente o bug que o comentário "SEM FALLBACK, de proposito" do `/groups` documenta ter acontecido. Também exige `groupMetadata(jid)` por JID novo, o que vira rajada de consultas ao WhatsApp depois de cada restart. Sessão limpa, com cache e throttle | 03/08 |
| **P41** | 🟡 **Ser removido do grupo-fonte é o risco operacional do Clone Post, e hoje ninguém percebe.** O admin da "TáNaMão – Promoções #02" removeu o Érico do grupo em 03/08 — provavelmente por notar a clonagem. Do lado do painel isso é indistinguível de grupo parado: a fonte segue `active`, sem erro, sem aviso. Junta-se à **P39** (fonte em grupo onde a sessão não está): as duas terminam na mesma tela e pedem o mesmo remédio — **sinalizar no card a fonte que passou N dias sem nenhuma linha em `clone_ingest_log`**. Vale considerar também espaçar/limitar a clonagem por fonte, porque republicar rápido demais é o que denuncia | 04/08 |
| **P42** | 🔴 **Provar a padronização da foto com imagem real.** O teste de 04/08 usou 6 imagens sintéticas geradas pelo próprio `sharp` — prova que o pipeline redimensiona, **não** que a foto de um anúncio real chega bonita no grupo. Depois do deploy: postar uma oferta de cada loja (Amazon `._AC_SL1500_`, Shopee, ML) e **olhar no WhatsApp**. Conferir também o log `[IMG] nao consegui padronizar` — se aparecer com frequência, alguma CDN está recusando o download do engine e os posts estão caindo no caminho antigo sem ninguém notar | 04/08 |
| **P43** | 🟡 **O leitor de Amazon existe em DOIS arquivos.** `consultarAmazonDireto` e as cinco funções de que depende estão duplicadas na `clone-ingest` e na `product-search`. Foi decisão consciente em 04/08: extrair para módulo compartilhado exigiria reemitir os 72 KB da `clone-ingest`, que é a operação que a P36 adiou justamente por risco de transcrição. **Enquanto durar, mudança em uma tem que ser repetida na outra** — o aviso está escrito nos dois lugares. Unificar em sessão limpa, com as duas funções abertas lado a lado, e provar depois em ambos os caminhos (Postar Agora e captura automática) | 04/08 |
| **P44** | 🔵 **PARTE 1/5 (Shein) FECHADA EM 25/08 (REVISÃO 69) — SEM LEITURA AUTOMÁTICA, POR DECISÃO TÉCNICA MEDIDA.** A v28 (leitor og:title/JSON-LD) devolvia dado errado com link real (título/imagem da HOME da Shein, não do produto — falso positivo). Causa lida em `query_logs`: a Shein serve a página de produto como SPA sem SSR de meta tag, e o fallback Microlink não executa o JS que monta a página — mesmo defeito de fundo da P25 (Shopee avulsa). `product-search` v29 (commit `8f64734`) reprova esse caso em vez de mentir sucesso, e a REVISÃO 69 mediu de novo: `{"success":false,"motivo":"leitura_falhou"}`, sem dado inventado. **Não há conserto barato** — ler de verdade exigiria renderizar JavaScript (Scrape.do com render ou equivalente), decisão de custo não tomada. Shein cai em "preencha manualmente" com mensagem própria. AliExpress, Magalu, Natura e TerabyteShop **restam abertas**, ainda sem nenhuma tentativa de leitor — a P44 original (as 5 lojas) não fecha aqui, só a parte da Shein. **ATUALIZAÇÃO 25/08 (REVISÃO 71):** no **Clone Post** (não no Postar Agora) as 5 lojas passaram a ter preenchimento automático por outra via — `cloneExtrairDoTexto()` lê título e preço da mensagem colada do grupo de origem, sem depender de renderizar JS. Não fecha a P44 (o Postar Agora, que só tem o link, continua sem saída), mas reduz muito o impacto prático dela | 04/08 |

| ~~P48~~ | ❌ **RETIRADA EM 07/08 — nunca foi real.** Aberta a partir de UMA rodada lida como estado permanente, num dia em que outras três já existiam. O La Roche foi carimbado (`07/08 06:00`) e o `pulados` das rodadas seguintes é 4, 4, 3 — o carimbo nos pulos funciona. Fica como registro do erro, não como pendência. ~~🟡 O ramo `desconhecido` do `product-refresh` não carimba `price_checked_at`.** Variante viva da P29, agora no outro ramo: o produto reenche a fila de antigos em toda rodada e ocupa vaga da `RESERVA_ANTIGOS`. Medido em 04/08 com o La Roche — **lido** (`? pagina de produto sem botao e sem outOfStock`) e **não carimbado**, parado em `30/07 14:16:02.187`, o carimbo mais antigo da base. Hoje custa 1 das 4 vagas; se mais páginas vierem nesse formato, come a reserva inteira e o backlog para de andar | 04/08 |
| **P49** | 🟠 **O frontend não tem cache-busting.** Depois de cada Deploy, quem está logado continua rodando o bundle antigo por tempo indeterminado, sem nada na tela dizendo isso — é por isso que o Érico digita `?v=` na mão. Pior: **toda "prova no navegador" pode estar medindo o cache**. Em 04/08 isso quase reabriu a P46, que estava certa. Saídas: `?v=` gerado no build, ou header de cache no nginx | 04/08 |
| **P50** | 🔵 **PARCIALMENTE FECHADA EM 25/08 (REVISÃO 70).** `prBuscarProduto` agora captura `d.motivo`/`d.error` do backend numa variável `backendErro` e repassa pra `prDicaLoja(link, store, backendErro)`, que anexa esse texto real ao invés de só chutar pela URL (branch dedicado pra Shein incluído). Ainda falta: usar `backendErro` para os casos que já têm branch fixo (Shopee/Amazon/AliExpress/Mercado Livre) — hoje esses continuam com texto fixo, ignorando o `motivo` específico do backend quando ele existir; e não há botão direto pra Config Afiliados no alerta novo. Ligado à mesma REVISÃO 70: o alerta em si não aparecia na tela por um bug de DOM separado (ver Última alteração) — sem esse conserto, a mensagem certa não adiantava nada por ser invisível | 07/08 |
| **P51** | 🟠 **Duas contas com `connected = true` e credencial inútil.** **duas contas de clientes** (identificadas na consulta, não nomeadas aqui — este repo é público, e é a mesma preocupação da P7) têm `App Key` e `App Secret` **vazios** em `affiliate_credentials`, só o `ID de Afiliado` preenchido (medido em 04/08). Para elas a busca automática de Shopee falha sempre e o painel diz que está tudo certo. O `connected` está medindo "a linha existe", não "dá para usar" — o padrão de sempre: mecanismo que parece existir e não executa nada | 07/08 |
| ~~P52~~ | ❌ **RETIRADA EM 07/08 — nunca foi real.** Os relógios batem: sandbox `07/08 10:46:34`, banco `07/08 10:46:35`, Érico "10:45". O que não batia era um carimbo de log de sexta comparado com uma leitura de banco de terça, dentro da mesma conversa, tratadas as duas como "agora". ~~🔴 Os relógios do log e do banco não batem.~~ Ao converter os carimbos de `get_logs` para conferir a hora de uma chamada, a data saiu com **dias** de diferença do `now()` do Postgres. Não afeta medição de versão/status, mas **afeta qualquer medição por janela de tempo** — inclusive a leitura do `[pre-filtro]` da P36. **Resolver ANTES de qualquer prova que dependa de intervalo** | 04/08 |

| ~~P53~~ | ✅ **FECHADA 13/08 — e a saída não era sincronizar, era apagar.** As 7 cópias da raiz (`index.html`, `guia.html`, `revops.html`, `onboarding.js`, `onboarding.css`, `robots.txt`, `sitemap.xml`) **não iam pro ar por nada**: o `Dockerfile` mora em `frontend/` e copia relativo a esse contexto, e não existe Dockerfile na raiz. Prova observável, não inferência: o **Mega Results aparece em produção** e existe só em `frontend/index.html`. Das 7, **6 eram idênticas** e só o `index.html` tinha divergido. Nenhum arquivo da raiz era exclusivo. Apagadas por decisão do Érico; a regra "edite as duas" foi revogada na seção Stack. Registro original abaixo. ~~🟠 **As duas cópias do `index.html` estão divergentes, e há tempo.** O doc manda editá-las idênticas. Medido em 12/08 por `diff`: a **raiz não tem a aba Mega Results** (item de menu, `<section id="page-mega-results">` e um `<script>` de 9.296 bytes — 279 linhas), e o **`frontend/` não tem o pixel do Metricool**. Como `frontend/index.html` é a fonte real de deploy, o efeito prático é que o Mega Results está no ar e o Metricool não. As alterações da REVISÃO 41 foram aplicadas idênticas nas duas por script; **esta divergência antiga não foi tocada** — escopo estrito. Precisa de decisão do Érico: qual das duas é a verdade de cada bloco | 12/08 |
| ~~P54~~ | ✅ **FECHADA 12/08 à tarde, MEDIDA EM PRODUÇÃO E LOGADO.** Deploy feito; as três alterações lidas na SPA servida com `?v=rev41`. MegaIA: `none` em 5 telas, `flex` no Postar Agora. Tutorial: os 3 passos navegaram para `conexao`/`assinatura`/`post-relampago`, sem blur. **Apagar em lote executado pelo Érico contra o banco: 30 pendentes → 0, com a linha aprovada de 30/07 intacta.** ⚠️ **Sobra UMA coisa não observada, e ela não é pequena: a aprovação em lote nunca disparou** — nem local, nem em produção. Virou a **P55**. Registro original abaixo. ~~🟡 **As três alterações da REVISÃO 41 não foram vistas em produção.** Medidas em Chromium headless, **deslogado**, com os arquivos do repo servidos localmente e a fila de clones semeada em memória. Faltam três coisas que só o ambiente real dá: (a) **Deploy no EasyPanel** — sem ele nada disso está no ar; (b) o **`DELETE` em lote contra o banco de verdade** (a policy foi lida, o delete não foi executado); (c) a **aprovação em lote criando produto**. Enquanto não for medido logado, o estado é "código certo no repo", não "funciona". Lembrar da **P49**: sem cache-busting, a primeira conferência pode estar lendo o bundle velho — usar `?v=` | 12/08 |
| ~~P55~~ | ✅ **FECHADA 13/08 — executada pelo Érico na fila real, 9 de 9 sem erro.** Nove clones aprovados em lote entre 13:55:53 e 13:55:57 (um por vez, que é o laço), **todos** com `product_id` apontando para linha existente em `products`, `error` nulo em todos, e os 2 pendentes que ele não marcou intactos. Registro original abaixo. ~~🟡 **A aprovação em lote nunca disparou.** Herdada da P54 ao fechá-la. `cloneAprovarSelecionados` está deployada e foi exercitada só até o ponto de habilitar/desabilitar o botão — **o laço que relê cada linha e chama `cloneCriarProduto` nunca rodou**, nem local nem em produção. O caminho de um a um é antigo e não mudou; o novo é o laço. É a mesma forma da ressalva da P30 na REVISÃO 21 — "autorizado e deployado, nunca acionado" —, e lá o ramo não observado era justamente o que tinha defeito. **Depende de a captura automática render clone novo:** a fila foi zerada em 12/08 e está vazia. Quando houver 2 ou mais pendentes, marcar os dois, aprovar em lote e conferir que viraram linha em `products` | 12/08 |

| ~~P56~~ | ✅ **FECHADA 13/08 de madrugada, MEDIDA EM PRODUÇÃO E LOGADO.** Paginação contra o banco de verdade com 30 linhas de teste: total 30 por `count:"exact"`, página 1 com 20 ("1–20 de 30"), página 2 com 10 linhas diferentes, **badge 24** — nem 20 nem 30, que é a prova do conserto. Seleção atravessou páginas (10 + 20 = 30, "Aprovar (24)"), atalho da fila inteira funcionou, expirados saíram riscados com o aviso de preço. **E o cron disparou sozinho:** `jobid 34` `succeeded` às `04:07:00.125637`, com o `expired_at` da isca em `04:07:00.125670` — mesmo instante, não foi chamada à mão. Linhas de teste apagadas; `clone_posts` de volta a 1 linha e 0 pendentes. Registro original abaixo. ~~🟡 **A REVISÃO 43 não foi vista em produção.** Paginação medida com dados em memória — `range()` e `count:"exact"` contra o PostgREST **não foram executados**; e o cron `expirar-clone-posts` (jobid 34, `7 * * * *`) **nunca disparou sozinho**, a função foi chamada à mão. Exige Deploy no EasyPanel e, depois, uma leitura logada com fila de 20+ linhas: conferir que o badge bate com a contagem do banco (era esse o defeito), que a página 2 traz linhas diferentes, e que a rodada automática do cron carimba. ⚠️ **O banco já está mudado** — a migração e o cron foram aplicados antes do frontend subir. Isso é seguro (coluna nova com default, status novo que nenhuma tela antiga escreve), mas significa que **clone pendente já começa a expirar mesmo com o frontend velho no ar**, e o frontend velho não sabe desenhar `expired`: ele cai no `badge[c.status]||c.status` e escreve a palavra crua | 12/08 |

| **P57** | 🟡 **PARCIALMENTE RESOLVIDA NA REVISÃO 48 — o orçamento por loja foi implementado e está no ar (`product-refresh` v21), mas a calibragem ficou sem como ser medida.** O `BATCH = 12` global virou três baldes por regime de custo: `sem_verificador` 20, `mercado_livre` 8, `amazon` 45, cada um com a cota da P34 por dentro, processados nessa ordem para que um corte por `DEADLINE_MS` nunca deixe o ML sem rodada. **Medido na rodada real de 14/08 09:00 UTC:** o balde de ML entregou exatamente os 8 previstos (5 novos + 3 antigos) em 17,1 s, sem corte por tempo, e o log do PostgREST mostra as seis consultas saindo com os filtros e limites certos. ⚠️ **O que continua aberto:** os baldes `amazon` (45) e `sem_verificador` (20) **nunca tiveram um candidato** — a base do Érico (57 Amazon, 49 Shopee) foi apagada por ele em 13/08, e a plataforma hoje tem 41 produtos, todos de ML. Os dois números foram dimensionados contra uma base que não existe mais, então **o formato está provado e a calibragem não**. Falta medir, quando houver Amazon de novo: se 45 leituras cabem nos 70 s (a conta a 1,2 s/leitura dá ~54 s, apertado — a expectativa é corte por tempo em torno de 40, o que é auto-corrigível) e se o volume eleva captcha. 🔴 **E a premissa de captcha da REVISÃO 47 caiu:** medido nos `detalhes` de 9 dias, **zero captchas** — os 2–3 `desconhecidos` diários são dois links de ML ilegíveis, agora na P59. Registro original abaixo. ~~🔴 **A conferência de preço não cobre a base, e o desenho não escala. AGRAVADA NA REVISÃO 46 com a distribuição real** — a média escondia o tamanho: **3 de 107** conferidos nas últimas 24h; **27 nunca**; **32** entre 3 e 7 dias; **28** com mais de 7. Ou seja **87 dos 107** vão pro grupo com preço de 3 dias ou mais. E o `BATCH = 12` é **global**: as consultas de candidatos não filtram por `user_id`, então os 12 diários são repartidos entre os **148** produtos da plataforma — com mais usuários, a cobertura de cada um cai sem nenhum aviso na tela. 🔴 **CORREÇÃO DA REVISÃO 47 — a premissa de custo estava errada:** conferir **não** custa o mesmo em toda loja. A `consultarAmazon` faz `fetch` **direto**, sem Scrape.do, **sem crédito**; só o Mercado Livre consome. Na base do Érico são **57 Amazon, 49 Shopee (sem verificador) e 1 ML** — e ele tem token próprio. Conferir a base inteira dele custaria praticamente nada. Com `DEADLINE_MS = 70000` e rodadas gastando 9,5–27 s, há ~5× de folga de relógio. **O próximo passo é orçamento POR LOJA em vez de um `BATCH` global** (Amazon com lote grande, ML mantendo `MAX_POOL_POR_RODADA = 5`) — combinado com o Érico em 13/08 e **ainda não feito**. Risco a medir junto: mais leituras da Amazon podem elevar a taxa de captcha, que hoje já aparece como 2–3 `desconhecidos` por rodada; o código não afirma nada sem `id="productTitle"`, então falha para o lado seguro. Registro original abaixo. ~~🟠 Medido em 13/08 na conta do Érico: **107 produtos, 27 nunca conferidos, idade média do carimbo 5,3 dias, o mais antigo de 03/08**. A `product-refresh` roda 1x/dia com `BATCH = 12` — varredura completa levaria ~9 dias e produto novo fura a fila. E a **`send-post` não relê a loja**: publica o `price` gravado (varredura na função inteira: nenhuma chamada a loja, Scrape.do, `product-search` ou `resolve-link`). O mecanismo de tirar do ar funciona (`expired` é respeitado, e `never_expires` não isenta dele); o que falta é alcance. ⚠️ **Não tem saída barata:** subir o `BATCH` ou o cron dobra as chamadas de loja, e o Scrape.do é Free (1.000/mês). A REVISÃO 45 escolheu **mostrar em vez de barrar** — a lista agora exibe a idade do preço. Decidir depois, com o número à vista: avisar sem barrar, pular produto muito velho no disparo, ou reler no disparo (o mais caro). Ideia não avaliada: botão "conferir agora" por produto — a `product-refresh` já aceita `productId`, mas exige `CRON_SECRET`/service role, então precisaria de um caminho autenticado no meio (mesma discussão da P2)~~ | 13/08 |
| **P60** | 🟠 **A prévia foi ligada na TELA ERRADA e não funciona onde o Érico usa.** Medido em 17/08: os links gerados depois do Deploy (`mkp7lg5`, `5egzhll`) saíram com os três campos `og_*` **vazios**, e não é cache — o `index.html` servido contém as marcas do código novo. A causa: há dois caminhos que criam short link e a prévia foi ligada só no **Postar Rápido** (`prPreencherStep2`, que tem `PR.produto` em mãos). O Érico usa o **Link Rápido** (`lrGerar` → `encurtarLinkFinal(afil, null)`), que só chama a `resolve-link` e encurta — **essa tela nunca teve título, preço nem foto**, então não é falta de passar parâmetro: não há dado para passar. ⚠️ **A saída não é trivial e não foi decidida:** para o Link Rápido ter prévia ele precisa buscar o produto depois de resolver o link, o que custa uma leitura de loja (crédito no ML, credencial oficial na Shopee, captcha na Amazon). A infraestrutura em si continua **provada** — robô recebe `text/html` com as tags OG nossas, gente recebe 302, robô não vira clique. O que falta é dado na tela certa. Registro original abaixo. ~~🟢 **A infraestrutura da prévia está PROVADA em produção; falta o envio real.** Deploy feito em 17/08 e medido com `pg_net` no domínio real: robô do WhatsApp e `facebookexternalhit` recebem **200 com `content-type: text/html; charset=utf-8`** e as tags OG nossas, sem `nosniff` e sem CSP `sandbox` — os três cabeçalhos que o gateway do Supabase injetava sumiram no nosso domínio. Gente recebe 302, e nenhum dos dois robôs virou clique. **O que ainda não foi observado é o WhatsApp desenhando o cartão** — servimos o certo, mas quem decide é ele, e só um envio de link NOVO do Link Rápido prova (link antigo não tem `og_title` e o WhatsApp ainda tem a prévia vazia em cache). ⚠️ **Três limites conhecidos e não resolvidos:** (a) a prévia é capturada quando o link é **criado**; se o usuário editar nome ou preço depois, o cartão segue com o valor da busca — consertar exige regravar o `short_link` na edição; (b) só o **Link Rápido** passa os dados, o `send-post` e o `group-blast` chamam o mesmo `encurtarLinkFinal` mas não passam nada, então post de grupo continua dependendo da loja; (c) link antigo não tem `og_title` e cai no 302 de propósito. **E não foi separado** quanto da falha original era bloqueio da Amazon e quanto era cache do WhatsApp | 16/08 |
| **P62** | 🟢 **NO AR E MEDIDA EM PRODUÇÃO EM 17/08 (REVISÃO 53) DO NOSSO LADO — segue 🟡 até a Shopee confirmar.** Link real `xzadtgh` gerado pelo Érico no Link Rápido às 00:51:50 BRT: `destination` com **`sub_id=xzadtgh`**, batendo com o `code` da própria linha, `long_url` **sem** `sub_id`, **+15 bytes** exatos. Controle negativo no mesmo lote: `d9q7va7`, de Amazon, saiu **intacto** (`destination = long_url`). E o clique sai com o campo: `pg_net` no domínio real devolveu `Location` apontando para o `an_redir` **com** o `sub_id`, sem gravar clique (user-agent de robô, de propósito). Baseline antes: 105 `an_redir` na base, **0** com `sub_id`. ⚠️ **O que falta é o único pedaço que não é nosso: o `sub_id` aparecer no RELATÓRIO DE VENDAS da Shopee depois de um clique e um pedido reais** (relatório atualizado diariamente às 10:30). Enquanto isso não for lido, a pendência não fecha — campo certo do nosso lado não é atribuição do outro lado. Registro da REVISÃO 52 abaixo. ~~🟡 **CODADA EM 17/08 (REVISÃO 52), NÃO DEPLOYADA E NÃO PROVADA.** O `mlEncurtarLink` passa a gravar `destination` com `sub_id=<code>` quando o link é um `s.shopee.com.br/an_redir` — função nova `shopeeSubId`, medida em 9 casos com a função lida do arquivo patchado (1 muda, 8 ficam iguais). **A "ordem de operações" que o bilhete deixou como decisão pendente não existia:** o `gerarCode()` roda na linha anterior ao `insert`, então o `code` já está em mãos antes de o destino ser gravado — sem `UPDATE` depois e sem tocar nenhuma das ~10 chamadas do `prGerarLinkAfil`. Decidido com o Érico em 17/08: vale para **toda tela que encurta** (o patch mora no encurtador) e o `sub_id` leva **só o `code`**. O `long_url` **não** recebe o `sub_id` porque é a chave de reuso da `send-post`/`group-blast`/`ml-short-link`. ⚠️ **Falta: push, Deploy, ler um link novo em `short_links` (baseline: os 10 `an_redir` de 16/08 estão sem `sub_id`) e — a prova que fecha — o `sub_id` aparecer no relatório de vendas da Shopee depois de um clique e um pedido reais.**~~ Registro original abaixo. ~~🔵 **Não dá para saber qual link gerou qual venda na Shopee — só cruzando horário na mão.** Foi o que esta sessão fez para responder ao Érico em 17/08: comparar o `clicked_at` do `link_clicks` com o "Período dos Cliques" do relatório da Shopee, minuto a minuto. Funciona uma vez, não escala, e não serve para abrir chamado com volume. O `s.shopee.com.br/an_redir` aceita `sub_id`; passando o `code` do short link, o próprio relatório da Shopee passa a identificar o link de origem. **Autorizado pelo Érico em 17/08 e adiado de propósito para a próxima sessão.** Mexe no `prGerarLinkAfil` (ramo Shopee) do frontend, logo exige push e Deploy~~ | 17/08 |
| **P61** | 🔵 **Um quarto dos cliques registrados é robô de prévia, e o histórico continua sujo.** Medido em 16/08: **140** cliques em `link_clicks`, **36 de robô (25,7%)**; no código `s2310c5` eram 6 cliques com **5 robô e 1 gente**. A `redirect` v16 parou de gravar robô, então daqui pra frente o número é limpo — mas **todo dado anterior segue inflado**, e é ele que a tela de rastreamento mostra. Recalcular `short_links.clicks` a partir do `link_clicks` sem robô é uma linha de SQL; o Érico ainda não decidiu se quer mexer em dado gravado. Enquanto não decidir, **nenhum número de clique anterior a 16/08 deve embasar decisão** | 16/08 |
| **P59** | 🟡 **Dois produtos de Mercado Livre ocupam vaga em TODA rodada da `product-refresh`, e um deles há 37 dias.** Medido em 13/08 nos `detalhes` de 9 dias de rodadas: os `desconhecidos` são sempre os mesmos dois, com o mesmo motivo (`MLB ID não encontrado no link`) — "Caixa 10 Máscaras Faciais Skincare Nutri" com `price_checked_at` **nulo desde 08/07**, e "Gloss Fran By Franciny Ehlke Liphoney Mel" parado em `02/08 09:00`. Falha de leitura **não é carimbada** de propósito desde a v17 (erro transitório precisa voltar já), mas link permanentemente ilegível não é transitório: os dois queimavam 2 das 12 vagas do lote global e agora queimam **2 das 8** do balde de ML. **Saída não decidida:** carimbar após N falhas iguais, ou marcar o produto como link inválido e avisar a dona — a segunda é mais honesta com a cliente e mais cara de codar | 14/08 |
| **P58** | 🔵 **Nenhuma trava de plano é observável na conta do Érico.** `prodMax()` devolve −1 para `IS_ADMIN` ou `is_vip`, e a conta dele é as duas coisas — medido em 13/08: a lista de produtos mostra "sem teto" e o aviso de upgrade nunca aparece. O mesmo vale para qualquer gate que trate admin/VIP como ilimitado. O ramo com teto foi exercitado no bundle servido forçando as flags em memória (saiu "107 de 15" com o bloqueio e o link para Assinatura, e o estado real foi restaurado), mas **isso prova o render, não o fluxo de um cliente**. Enquanto não houver uma **conta de teste num plano baixo**, toda tela com trava de plano é escrita às cegas. ⚠️ Não mexer nas flags da conta do Érico para testar | 13/08 |
| ~~P63~~ | ✅ **FECHADA 22/08 (REVISÃO 62), MEDIDA EM PRODUÇÃO DOS DOIS LADOS.** Os quatro itens no ar: CORS por lista (medido no `wa-engine` e no `mr-ingest`, com origem estranha sem cabeçalho), Supabase sem default no engine (o boot é a prova), `sharp` **0.35.3** lido do container pelo `/health`, `onboarding.js` escapado no arquivo servido. **A tela fechou o resto:** o painel logado listou as 4 sessões buscando `/sessions` do navegador, cross-origin — e o caminho de falha dessa função escreve o erro na tabela, então quatro linhas com telefone e status só aparecem se o CORS deixou passar. ⚠️ Não exercitados: parear número novo, desconectar sessão e as telas do `mr-ingest`. Registro anterior abaixo. ~~🟢 **NO AR E MEDIDA (REVISÕES 57 e 60) — falta só a tela.** O `sharp` em execução foi lido do container pelo `/health`: **0.35.3**, libvips **8.18.3**, Node **v20.20.2** — acima do `<0.35.0` das CVEs, e prova de que o build não reusou `node_modules` do cache. CORS por lista medido nos dois serviços, `onboarding.js` escapado no arquivo servido. ⚠️ **Falta só o painel logado exercitado no navegador** (conectar/listar sessões, console limpo). Registro anterior abaixo. ~~🟢 **NO AR NOS TRÊS SERVIÇOS E MEDIDA EM PRODUÇÃO (REVISÃO 57) — segue 🟡 só pelos dois cabos soltos.** CORS por lista devolvendo o domínio certo e nada para origem estranha, medido no `wa-engine` e no `mr-ingest`; `wa-engine` de pé com 4/4 sessões conectadas depois do reinício, o que prova de quebra que as variáveis novas existem; `onboarding.js` escapado no arquivo servido pelo domínio. ⚠️ **Falta: a versão do `sharp` em execução (nenhuma rota expõe, o build subiu mas isso é dedução) e o painel logado exercitado no navegador.** ⚠️ **E ficou o aprendizado: o `mr-ingest` não entra no auto-deploy — exige Deploy próprio.** Registro anterior abaixo. ~~🟡 **CODADA E PROVADA EM BANCADA NA REVISÃO 56, NÃO DEPLOYADA.** Os quatro itens foram refeitos (CORS por lista no `wa-engine` e no `mr-ingest`, defaults de Supabase removidos, `sharp` `^0.35.3`, `esc()` no `onboarding.js`), com medição de bancada em cada um — ver REVISÃO 56. O Érico criou `SUPABASE_URL` e `SUPABASE_KEY` no EasyPanel **antes** do push, senão o auto-deploy derrubaria o engine no boot. **Falta Deploy, o log do boot com `[CORS] origens permitidas`, o painel logado exercitado no domínio real e o log do build confirmando o `sharp` no Node 20.** Registro original abaixo. ~~🔴 **As quatro correções de segurança da sessão do Claude Code (relatadas como concluídas) NÃO estão no repo.** Medido em 22/08 no `main` `60bd5b3`: `frontend/onboarding.js` inalterado desde 13/08, `wa-engine/package.json` ainda em `sharp ^0.33.5`, `wa-engine/server.js` linha 112 ainda com `Access-Control-Allow-Origin: '*'` e linha 126 ainda com a URL do projeto como default hard-coded. Nem commit, nem branch, nem deploy, nem migration depois de 17/08. **O `mr-ingest` (`src/server.js` linha 35) também está com CORS `*`** e nunca foi tocado. Refazer e empurrar. ⚠️ A classificação "XSS crítico" do `onboarding.js` não se sustenta como estava: os dois `innerHTML` são alimentados pelo `onboarding-config.js` estático e nenhum caminho de dado de usuário foi achado até eles — é endurecimento, não exploração medida | 22/08~~ | 22/08~~ | 22/08~~ | 22/08~~ | 22/08 |
| ~~P64~~ | ✅ **FECHADA 22/08 (REVISÃO 55), MEDIDA ANTES E DEPOIS.** Provado em transação com rollback que um usuário comum logado alterava `whatsapp_instances` de **outro** usuário pelas duas RPC; migration `p64_fecha_rpc_definer_sem_checagem` revogou o `EXECUTE` de `anon`/`authenticated` nelas (chamador único de cada uma é gatilho `SECURITY DEFINER` de dono `postgres`) e pôs `where public.is_admin()` na `influencer_monthly_performance`, que segue chamável pelo painel. Remedido: `permission denied` nas duas, e 1 linha para admin contra 0 para usuário comum com resgate injetado. ⚠️ **Falta abrir o `revops.html` logado e ver o painel de influenciadores desenhando.** Registro original abaixo. ~~🟠 **Três funções `SECURITY DEFINER` executáveis por `authenticated` sem nenhuma checagem de identidade no corpo:** `influencer_monthly_performance`, `mark_whatsapp_activity(p_user_id)` e `recalc_whatsapp_idle_state(p_user_id)` — as duas últimas aceitam `user_id` alheio. ⚠️ **Triado por busca de texto** (`is_admin`/`auth.uid()` no `pg_get_functiondef`), **não por leitura linha a linha** — a leitura ainda falta, e o mesmo método pode ter dado falso positivo nas 18 que passaram | 22/08~~ | 22/08 |
| **P65** | 🔵 **AS DUAS DE CÓDIGO FECHADAS; A TERCEIRA ESTÁ BLOQUEADA POR PLANO (REVISÃO 61).** A extensão `http` (que era SSRF, não higiene) foi removida e as 7 funções ganharam `search_path` — advisor: 7→0 e 1→0. **A proteção contra senha vazada exige plano Pro; o controle está travado com selo de upgrade e o Érico decidiu em 22/08 adiar até haver upgrade.** Fica como item do checklist do upgrade, não como tarefa a redescobrir. Enquanto isso, senha já vazada em outro site é aceita no cadastro. Registro anterior abaixo. ~~🟡 **DUAS DE TRÊS FECHADAS EM 23/08 (REVISÃO 58) — e a primeira não era higiene.** A extensão `http` no `public` deixava `anon` chamar `http_get` pelo PostgREST: **medido 200 com o corpo da página buscada, e 404 depois do `drop extension http`** — SSRF, não lint. Nada usava a extensão (varredura em `pg_proc` e no repo); o `drop` foi sem `CASCADE` de propósito. As 7 funções sem `search_path` foram fixadas e conferidas rodando (todas `SECURITY INVOKER`, então era endurecimento, não escalada). Advisor: `function_search_path_mutable` 7→0, `extension_in_public` 1→0. ⚠️ **Falta só a proteção contra senha vazada no Supabase Auth — ação externa, botão no Dashboard.** Registro original abaixo. ~~🔵 **Higiene do lint do Supabase, sem exploração conhecida:** 7 funções com `search_path` mutável, extensão `http` no schema `public` e **proteção contra senha vazada desligada** no Auth (esta é ação externa, no Dashboard) | 22/08~~ | 22/08~~ | 22/08 |

| **P66** | 🟡 **`clone_sources_max` do Pro: o código e este arquivo discordam.** O `PLAN_FALLBACK` do `index.html` diz `pro: clone_sources_max: 1, clone_post: true`; a tabela de Planos deste arquivo diz Pro = 0 fontes de clone. A tabela da landing foi escrita a partir do código. Decidir qual é a verdade e alinhar os dois | 23/08 |
| **P67** | 🟡 **NO AR E MEDIDO LOGADO (REVISÃO 65).** Landing, roteamento, Voltar/Avançar/F5, console limpo e cabeçalhos — todos provados no navegador do Érico, na sessão real. **Falta ainda, e só o Érico pode fazer:** clicar num link de recuperação de senha de e-mail de verdade, entrar uma vez com o Google, e conferir em iOS Safari. Registro anterior abaixo. ~~🔴 O redesign da REVISÃO 63 não está em produção~~ | 23/08 |
| **P68** | 🔵 **`boas-vindas-pc.png` e `boas-vindas-cel.png` (2,8 MB) não são mais referenciados por ninguém**, mas continuam no repo e no `COPY` do `frontend/Dockerfile`. Limpeza opcional | 23/08 |
| **P69** | 🔵 **Site URL / Redirect URLs do Supabase continuam apontando para a raiz.** Funciona porque a landing encaminha para `/painel`, mas apontar direto para `/painel` elimina um salto. Ação externa, no Dashboard | 23/08 |

| **P70** | 🟡 **Emoji no texto das telas do painel.** `Boa tarde ⚡`, `🚀 Postar Agora`, `⭐ MAIS POPULAR`, botões `⚡ PIX AVULSO` / `💳 Cartão` / `🔁 Pix recorrente`. Está na lista do que não fazer do brief, mas é **copy**, não token — ficou fora do escopo da REVISÃO 66 de propósito. Uma passada própria | 23/08 |
| **P71** | 🔴 **A tipografia da REVISÃO 66 não foi vista por ninguém.** O sandbox não alcança o Google Fonts; tudo foi renderizado com fallback. Archivo e IBM Plex Sans/Mono só serão conferidas no navegador depois do Deploy. Sintoma de falha: painel com cara de Arial | 23/08 |
| **P72** | 🔴 **O PAT clássico do GitHub usado nos pushes de 25/08 foi colado no chat e precisa ser REVOGADO e rotacionado.** Enquanto não for, qualquer pessoa com acesso ao histórico daquela conversa pode dar push no repo. Ação do Érico no GitHub → Settings → Developer settings → Personal access tokens | 25/08 |
| **P73** | 🟡 **Auto-deploy por webhook do EasyPanel provavelmente parou.** Na REVISÃO 72 o Source do serviço `app` saiu de **Github** (token expirado) para **Git** (clone anônimo por URL, repo é público). Isso resolveu o build, mas se o webhook dependia da conexão "Github" do painel, ele não dispara mais. **Não medido.** Na prática o fluxo já era Deploy manual, então o impacto é baixo — mas convém confirmar em vez de supor | 25/08 |
| ~~P74~~ | ✅ **FECHADA 26/08 (REVISÃO 82) — MEDIDA NO NAVEGADOR LOGADO DO ÉRICO (Claude in Chrome).** A sub-aba Métricas está no ar: 8 KPIs batendo com o dado real (comissão projetada R$1,75, 40 cliques, 1 pedido), gráfico por dia, breakdown por loja, seletor de período reagindo de verdade (testado 30d → 7d, números mudaram), aba Importar intacta, console limpo. Ver "Última alteração" da REVISÃO 82. Registro original abaixo. ~~🟡 CODADA NA REVISÃO 80 (26/08), NÃO DEPLOYADA, NÃO MEDIDA.~~ `frontend/index.html` ganhou a sub-aba Métricas (KPIs, gráfico por dia, breakdown por loja), consumindo `POST mega-results/metrics/query` pela primeira vez. `node --check` limpo nos 5 blocos; **nada foi aberto em navegador** — o sandbox desta sessão não alcança Supabase nem EasyPanel. Falta: push + Deploy do `app`, e no navegador logado do Érico conferir os 8 KPIs, a troca de período, o gráfico e que a aba Importar não mudou. Commit local `5401ee5`. Registro original abaixo. ~~🔴 O Mega Results não tem tela de métricas — só tem tela de importação.~~ A Edge Function `mega-results` (dashboard completo: totais, série diária, comparação de período, breakdown) está `ACTIVE` desde 08/08 e **nunca foi chamada pelo frontend**. Ver auditoria da REVISÃO 73 | 26/08 |
| **P75** | 🟢 **PARCIALMENTE FECHADA 26/08 (REVISÃO 77).** Um relatório real foi importado ponta a ponta: `WebsiteClickReport202608260015.csv`, dataset `click` detectado sozinho, **40/40 linhas válidas**, 40 linhas gravadas em `megaresults.fact_click` cobrindo 19–24/08. ⚠️ **Continua sem prova o que o desenho promete**: streaming de centenas de milhares de linhas. 40 linhas não exercitam nem um lote (`BATCH_SIZE` 5000). Registro original abaixo. ~~🟡 **A importação nunca foi testada com relatório real.** `import_batch` só tem 9 linhas, todas do mesmo arquivo de teste de 1 linha (08–11/08). O desenho promete streaming para centenas de milhares de linhas sem travar o navegador — isso segue sem nenhuma medição. Precisa de um relatório de verdade da conta do Érico para provar por comportamento | 26/08 |
| ~~P76~~ | ✅ **RESPONDIDA 26/08 (REVISÃO 74) — e virou a P78.** O `mr-ingest` responde, mas com a `SUPABASE_SERVICE_ROLE_KEY` inválida: 500 "Nao foi possivel verificar sua sessao" medido na tentativa real do Érico, com o `/auth/v1/user` 401 no mesmo minuto no `query_logs`. Ver REVISÃO 74 | 26/08 |
| ~~P78~~ | ✅ **FECHADA 26/08 (REVISÃO 77) — MEDIDA EM PRODUÇÃO.** A causa final não era qual chave, era **como ela estava colada**: `SUPABASE_SERVICE_ROLE_KEY` e `MR_INGEST_TOKEN` estavam no Environment do EasyPanel envolvidos em `<` e `>` (a notação de "preencha aqui" do README veio junto). Medido no campo: 219 e 64 caracteres sem as bordas — os tamanhos exatos da `service_role` legada e de um `openssl rand -hex 32`. Removidos os sinais, a autenticação passou e o erro mudou para o 400 da P79. Prova final: `WebsiteClickReport202608260015.csv` importado `completed`, 40/40 linhas, 40 linhas em `fact_click`. Registro anterior abaixo. ~~🟡 **CAUSA ISOLADA POR EXPERIMENTO EM 26/08 (REVISÃO 76) — falta só colar a chave certa e dar Deploy.** A chave que o `mr-ingest` precisa é a **`service_role` LEGADA** (JWT `eyJ…`, 219 chars, aba "Legacy anon, service_role API keys" do Dashboard), **não** a `sb_secret_…` nova que está lá hoje. Medido no navegador do Érico chamando `POST /rest/v1/rpc/mr_expire_queue` com cada uma: legada **200** (corpo `0`), a atual recusada com `Invalid API key`. Prova depois do Deploy: log do `mr-ingest` sem `SUPABASE_SERVICE_ROLE_KEY parece invalida`, e o 401-por-minuto de `mr_expire_queue` virando 200 no `query_logs`. Node 22 já confirmado no build de 03:33. Registro original abaixo. ~~🔴 **`SUPABASE_SERVICE_ROLE_KEY` do serviço `mr-ingest` no EasyPanel está inválida — bloqueia toda importação real.** Medido em produção: tentativa real do Érico com `WebsiteClickReport…csv` devolveu 500 "Nao foi possivel verificar sua sessao"; `query_logs` do mesmo minuto confirma `GET /auth/v1/user` 401. Ação: conferir a chave em Supabase → Settings → API, corrigir no Environment do `mr-ingest` no EasyPanel, Deploy manual (não é automático), reimportar para confirmar. **Junto:** há uma chamada a `public.mr_expire_queue` toda a cada minuto recebendo 401 desde antes do teste do Érico — não localizada em nenhum arquivo deste repo nem em `cron.job` do Postgres; suspeita de processo/container órfão do `mr-ingest` usando a mesma chave quebrada. Ver REVISÃO 74~~ | 26/08 |
| ~~P79~~ | ✅ **FECHADA 26/08 (REVISÃO 78) — NO AR E MEDIDA.** Deploy do `app` às 04:43 UTC; o `index.html` servido pelo domínio traz os campos antes do arquivo. Duas tentativas reais do Érico chegaram ao `DUPLICATE_FILE`, que só é alcançável depois de autenticação, trava do piloto, campos e checksum. Registro original abaixo. ~~🔴 **CORRIGIDA NO REPO, NÃO DEPLOYADA — ordem dos campos do multipart no upload do Mega Results.** O `frontend/index.html` mandava `fd.append('file', …)` **antes** de `connectionId` e `store`; o `mr-ingest` lê `fields` dentro do handler do arquivo (`src/server.js` linha 161) e o Busboy entrega as partes na ordem do corpo, então os dois campos chegavam vazios e a resposta era 400 `ownerId, connectionId e store sao obrigatorios`. Consertado no repo (campos antes do arquivo). **Provado por comportamento ANTES do deploy**, com a função corrigida injetada na sessão logada do Érico: a importação completou com 40/40 linhas. **Falta push + Deploy do `app`** — sem isso, um F5 desfaz e a tela volta a falhar. ⚠️ Fica em aberto endurecer o backend para não depender da ordem do cliente | 26/08 |
| ~~P80~~ | ✅ **FECHADA 26/08 (REVISÃO 79) — NO AR E MEDIDA NA TELA.** Com o Deploy, a importação do mesmo arquivo abriu o card "⚠️ Este arquivo já foi importado" com a data, console limpo. Arquivo servido confere: `mrAcompanhar` chamada, `mrStream` fora do fluxo. Registro original abaixo. ~~🟡 **CORRIGIDA NO REPO E PROVADA EM BANCADA — FALTA PUSH + DEPLOY. O SSE de progresso não atravessa o proxy do EasyPanel.** `GET /import/:id/stream` fica pendente para sempre quando o lote existe; com id inexistente responde em 425 ms (o servidor fecha a conexão nesse caminho). A tela ficava em "Enviando arquivo…" mesmo com a importação concluída. Conserto: `mrAcompanhar()` lê `megaresults.import_batch` a cada 1,5 s em vez de depender do stream — a fonte durável, como o próprio `mr-ingest` documenta. Três estados renderizados contra lotes reais. **Falta**: upload do `index.html`, Deploy do `app` e uma importação real para fechar. ⚠️ Alternativa de servidor, não feita: `X-Accel-Buffering: no` no `mr-ingest` (exige Deploy próprio dele) | 26/08 |
| **P81** | 🔴 **Relatório de cliques commitado por engano em repo PÚBLICO:** `frontend/WebsiteClickReport202608260015.csv`, no commit `26e05c5` de 26/08. Conteúdo de baixo risco (ID do clique, data, região "Brazil", Sub_id, referenciador — sem dado pessoal de terceiro), mas é dado comercial e o repo é aberto. **Apagar do `main`**; permanece no histórico do git de qualquer forma. Reescrever histórico não se justifica pelo conteúdo | 26/08 |
| **P77** | 🔵 **Só Shopee tem `field_mapping` em `megaresults`.** Se o Érico quiser importar relatório de outra loja (Mercado Livre, Amazon, etc.), falta cadastrar o mapeamento de campos dela antes — sem isso `mrLoadStores()` nem oferece a opção na tela | 26/08 |
| **P74** | 🟡 **REVISÕES 70 e 71 estão no ar e medidas no ARQUIVO SERVIDO, mas o FLUXO ponta a ponta nunca foi rodado.** Falta: (a) Postar Agora com link de Shein → o alerta amarelo aparece mesmo na tela do Passo 2? (b) Clone Post com mensagem real de grupo → preview vem preenchido e o clone salva certo? (c) `prGerarLinkAfil` carimba o ID na Shein quando há credencial configurada? | 25/08 |

**Roadmap adiado (baixa prioridade):** documentação de API, integrações externas
(Google Analytics, Meta Pixel, n8n, Zapier), ACL multi-admin, tracking de CAC.

---

## Aprendizados — não repetir

**Sobre prova e verificação**

- 🔴 **Uma conversa pode atravessar dias, e lembrar de uma medição não a torna
  atual.** Em 07/08 duas pendências falsas (P48, P52) foram commitadas neste arquivo
  porque medições de 04/08 foram tratadas como "agora" três dias depois. A rodada do
  cron tinha rodado **quatro** vezes; foi lida uma e dela se escreveu uma lei.
  **Regra: não inferir data — ler.** No início de toda sessão e antes de QUALQUER
  medição por janela de tempo, rodar `date` no sandbox e `now()` no banco e dizer a
  data em voz alta. Toda leitura carimbada com "hoje" tem que ser reancorada antes de
  virar decisão.
- **Os três relógios do projeto, medidos em 07/08:** `date` no sandbox devolve **São
  Paulo** (`TZ=America/Sao_Paulo`); `now()` no Supabase devolve **UTC**
  (`TimeZone = UTC`); a data do ambiente do assistente traz **só o dia, sem hora** —
  inútil perto da meia-noite. Para comparar "hoje" com dado do banco:
  `now() at time zone 'America/Sao_Paulo'`.
- **`typeof funcaoNova === "function"` no navegador prova o que o SEU navegador
  carregou, não o que o servidor serve.** Sem o controle com `cache:"reload"`,
  "prova no navegador" e "prova do cache do navegador" são a mesma imagem — e em
  07/08 a segunda quase reabriu a P46, que estava certa.
- **`t.length` em JS não é byte, é UTF-16.** Comparar com `wc -c` num arquivo com
  acento dá diferença que parece versão errada e não é.
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
