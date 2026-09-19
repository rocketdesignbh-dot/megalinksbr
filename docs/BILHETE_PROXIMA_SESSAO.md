# Bilhete para a próxima sessão — Mega Links BR

> **Primeira ação: ler `docs/ESTADO_ATUAL.md` do repo, inteiro.** Este bilhete
> não substitui o ESTADO_ATUAL — ele só diz por onde começar e o que não
> redescobrir. (Atualizado em 19/09: o número da revisão não é mais fixado aqui,
> ele envelhecia — a `main` estava na 163 e este bilhete dizia 53. Conferir o
> cabeçalho do ESTADO_ATUAL.)

---

## Frente ativa em 19/09: restilização visual — MERGEADA e NO AR (sem PR aberto desta frente)

**Onde está:** o PR **#19** (restilização, 35 commits) foi mergeado em `main`
(`022f63b`); o **#20** (gzip no nginx) em `39fa036`; o **#21** (docs) em `fa1cc21`.
A `main` do remoto já tem tudo. A branch `redesign/megalinks-ui-v3` **foi apagada** no
remoto (19/09, a pedido do Érico, depois de conferir que estava 100% contida em `origin/main`).
**O deploy da `main` é AUTOMÁTICO** (medido em 19/09:
~13 s após o merge já estava no ar) — cuidado com o que entra na `main`. Detalhe
completo no ESTADO_ATUAL: REVISÃO 164 e os adendos de 19/09.

**Antes de qualquer edição:**

1. **Nunca partir do `main` LOCAL deste clone** (`C:\Users\PC\Documents\megalinksbr`):
   ele está velho (11/08, 900 commits atrás e 626 à frente de `origin/main`; os
   commits só dele são de *Mega Results* e existem em branches remotas). Sempre:
   `git fetch origin && git switch -c <nome> origin/main`. Não fazer `pull`/`merge` nele.
   Há **dois clones** (o outro é `C:\Users\PC\github\megalinksbr`); não confiar num
   checkout local (P150).
2. A `main` só recebe mudança **por PR**; o padrão usado foi **merge commit**. Push com
   o nome explícito da branch (`git push -u origin <nome>`): uma branch criada de
   `origin/main` herda `origin/main` como upstream. O `git push` pode ficar parado
   esperando o Git Credential Manager — não é hook; aguardar.
3. Não refazer a restilização do zero, não limpar emoji em massa (decisão do Érico) e
   não migrar paddings inline para `--sp-*` em massa. Trocas em massa de cor:
   pular a linha que *define* o token e conferir hex **e** `rgba()`.

**O que já foi conferido em produção (passada logada de 19/09, só leitura):** 25 telas
(17 do afiliado + 8 do admin) em desktop e a 371 px, `revops.html` (9 seções × 2
larguras), `#modalTicket` com ticket real (foco, Tab preso, ESC) e o template do trial
encerrado — **0 overflow, 0 resto das paletas antigas, 0 erro de JS**. "Usuários ativos
0 / MRR R$ 0,00" na Visão Geral **não é bug** (KPIs contam só não-VIP/não-admin).

**O que falta (nada disto foi testado):**

- o **cartão que o WhatsApp desenha de verdade**: o redirect `/r/` real e a prévia OG
  **foram medidos em 19/09** (302 com `sub_id` no `xzadtgh`, 200 `text/html` com as tags
  OG certas no `zzogt01`, sem `nosniff`/CSP, gzip do `/r/` idêntico ao corpo puro; tudo
  com User-Agent de robô, sem contar clique; ver o adendo "4ª parte" no ESTADO_ATUAL).
  Falta só enviar um link **novo** numa conversa e ver o cartão; o caminho de gente
  (302 + `link_clicks`) não foi repetido, porque contaria clique;
- as 4 páginas puladas por risco de efeito colateral: Conexão WhatsApp (pareamento),
  IA Insights (custo), Automações, Conexões Admin;
- o fluxo **real** do trial encerrado (só o template foi renderizado) e reduced-motion
  com a preferência ligada;
- `#modalNewPass` (recuperação de senha, fora do sistema de foco de propósito: **decisão,
  não pendência**);
- **feito na 5ª parte de 19/09 (PR aberto, ver o adendo no ESTADO_ATUAL):** os resíduos
  de paleta em `revops.html` (13 fundos de badge em `rgba()` + os 7 cabeçalhos do Kanban),
  o bug do alerta de vencimento (`var(--x)22` é CSS inválido) e o `.btn.loading`, que era
  um **item fantasma** (o CSS nunca existiu; o app usa `showLoading()` e `.btn:disabled`).
  Só falta, se o Érico quiser, um estado de carregamento *no botão* (feature nova) e 3
  callouts de tutorial em `exemplo-configuracao.js`/`exemplo-postagens.js` ainda na paleta antiga;
- capturas de tela: o `captureScreenshot` do Chrome MCP estourou 4 vezes nessa passada.

**Lições de ferramenta (Chrome MCP em 19/09):** `resize_window` não muda o viewport
reportado → para mobile usar **iframe da mesma origem** de 375 px; `javascript_tool` devolve
`{}` para `Promise`/`setTimeout` → código síncrono + `computer wait`; `find` lê o gate de login
escondido; clique por coordenada errou → `.click()` no elemento; `serve` (porta 5173) não
tem fallback de SPA → entrar por `/index.html`. Login/senha são sempre do Érico.

*As seções abaixo são o histórico da sessão de 17/08 (P62, Shopee `sub_id`) e
seguem valendo como registro do que não redescobrir.*

---

## O que a sessão de 17/08 (madrugada) fez

**P62 codada, deployada e medida em produção — do nosso lado.** O
`mlEncurtarLink` grava o `destination` do short link já com `sub_id=<code>`
quando o destino é um `s.shopee.com.br/an_redir`.

O impasse que o bilhete anterior deixou — *"o `code` nasce depois do link de
afiliado, decidir entre três saídas"* — **não existia**: o `gerarCode()` roda na
linha imediatamente anterior ao `insert`. Uma função nova (`shopeeSubId`) e uma
linha trocada, sem `UPDATE` depois e sem tocar nenhuma das ~10 chamadas do
`prGerarLinkAfil`.

Medido em produção com o link real `xzadtgh`: `sub_id` gravado batendo com o
`code`, `long_url` limpo, +15 bytes exatos, e o `Location` do nosso `/r/`
apontando para o `an_redir` **com** o campo. Controle negativo no mesmo lote:
link de Amazon (`d9q7va7`) passou **intacto**.

---

## A ÚNICA coisa que falta na P62 — e ela não é nossa

**O `sub_id` aparecer no relatório de vendas da Shopee**, depois de um clique e
um pedido **reais**. O relatório é atualizado diariamente às 10:30, então isso
leva dias e depende do Érico ter vendas.

Quando ele trouxer o relatório, o que conferir: a coluna **`Sub_id1`** trazendo
um código de 7 caracteres que exista em `short_links.code`.

```sql
-- o link que o relatório apontar:
select code, destination, clicks, created_at at time zone 'America/Sao_Paulo'
from short_links where code = '<o Sub_id1 do relatório>';

-- e os cliques dele, para cruzar com o "Período dos Cliques":
select clicked_at at time zone 'America/Sao_Paulo', user_agent
from link_clicks where code = '<o mesmo>' order by clicked_at;
```

⚠️ **Não declarar a P62 fechada por ter visto o `sub_id` no nosso banco.** Isso
já está provado e registrado na REVISÃO 53. É a forma exata do *"status 200 não
é prova"*: campo certo do nosso lado não é atribuição do outro lado.

---

## O que está esperando decisão do Érico (nenhuma foi tomada)

| # | o que precisa ser decidido |
|---|---|
| **P60** | o Link Rápido não tem prévia porque não tem produto em mãos. Dar prévia a ele custa uma leitura de loja (`product-search` depois do `resolve-link`): crédito no ML, credencial oficial na Shopee, captcha na Amazon |
| **P59** | dois links de ML ilegíveis ocupam vaga em toda rodada, um deles há 37 dias. Carimbar depois de N falhas iguais, ou marcar como link inválido e avisar a dona |
| **P61** | 25,7% dos cliques históricos são robô. A `redirect` v16 parou de gravar robô; o histórico continua sujo. Recalcular `short_links.clicks` é uma linha de SQL — falta a decisão |

---

## O que NÃO redescobrir

### O `sub_id` da Shopee é UM parâmetro, não cinco

`sub_id=a-b-c-d-e`, cinco valores separados por hífen, cada posição virando uma
coluna `Sub_id1`..`Sub_id5` no relatório. **Não** existem `sub_id1`..`sub_id5`
como parâmetros separados. Conferido no guia oficial de short link da Shopee.
Hoje vai só o `code`, no primeiro campo — decisão do Érico em 17/08.

### Por que o `long_url` NÃO recebe o `sub_id`

Ele é a **chave de reuso** da `send-post`, da `group-blast` e da `ml-short-link`
(`.eq("long_url", longUrl)`). Gravar o valor com `sub_id` faria a busca errar e
criar linha nova de `short_links` a cada disparo do mesmo produto. Quem
redireciona lê `destination || long_url` (`redirect` v16). **Não "consertar"
isso** — está medido funcionando assim.

### Por que a URL não é reserializada

`new URL(...).toString()` reescreveria o `origin_link` com as regras do
`URLSearchParams` (espaço vira `+`), e ele foi montado com `encodeURIComponent`
lá no `prGerarLinkAfil`. O `sub_id` é anexado por **string**; o `new URL` dentro
da `shopeeSubId` serve só para *perguntar* se aquilo é um `an_redir`.

### O `sub_id` só existe para a Shopee

Link de Amazon, de ML e de qualquer outra loja passa intacto — medido, não
deduzido. **Um link de Amazon gerado no Link Rápido não é teste da P62**: em
17/08 um teste caiu nesse engano e quase virou "não funcionou". Resultado de um
teste que não exercita o ramo em questão não refuta o ramo.

### A Shopee não está barrando o nosso link — está provado

Medido no `link_clicks` do código `4h8wmie` contra o relatório da Shopee: clique
de gente às 21:44:18 UTC, relatório dizendo *"Período dos Cliques: 18:44"*
(Brasília). Mesmo minuto. O `Cancelado` é status de **pedido**, não de
atribuição. **Não reabrir sem dado novo.**

### A infraestrutura da prévia OG está provada e funcionando

`redirect` v16 no ar. Robô de prévia recebe `text/html` com as nossas tags OG;
gente recebe 302; robô não vira clique — reexercitado em 17/08, 0 cliques
gravados para o user-agent de robô.

⚠️ **A armadilha:** o gateway do Supabase reescreve todo HTML como `text/plain` +
`nosniff` + CSP sandbox. O `location /r/` do nginx desfaz isso com
`proxy_hide_header` + `add_header`. **Mexeu nesse bloco do `frontend/Dockerfile`,
a prévia morre em silêncio** — com status 200 e corpo perfeito.

---

## Como medir frontend sem medir cache

`typeof funcaoNova === "function"` prova o que **aquele navegador carregou**, não
o que o servidor serve (P49: não há cache-busting). O que funciona, e foi o que
esta sessão usou:

```js
const r = await fetch('/index.html?bust='+Date.now(), {cache:'reload'});
const t = await r.text();
/function shopeeSubId\(/.test(t)          // a peça nova está no arquivo servido
!/destination:longUrl/.test(t)            // a peça velha SUMIU
/prOgDoProduto/.test(t)                   // controle: o bloco não morreu no meio
```

O terceiro é o que descarta bloco quebrado — se o `<script>` explodisse no meio,
as peças antigas sumiriam junto.

---

## Infraestrutura — como empurrar código

O sandbox da nuvem **lê** o repo (`git clone` funciona) mas **não empurra**: o
proxy recusa com *"not in this session's authorized repository set"*. PAT
clássico não resolve — o proxy nem chega a usar o token.

O que funciona é o **GitHub web dirigido pelo Claude no Chrome**, e em 17/08 ele
funcionou inteiro, sem tropeço:

- Subir arquivo: `/upload/<branch>/<pasta>`. O `file_upload` aceita caminhos de
  `/mnt/user-data/outputs/…`, e aceita **vários arquivos da mesma pasta de uma
  vez**.
- Dá para **commitar direto numa branch existente**: o rádio `direct`
  ("Commit directly to the *branch* branch"). Foi assim que a REVISÃO 52 entrou
  em cima da branch da 51, e um merge só levou 50, 51 e 52.
- O botão não responde a clique por ref nem por coordenada. O que funciona é
  `.click()` por JS em `button[type=submit]`.
- Preencher campos por `form_input`. O rádio, por `.click()` em
  `input[type=radio][value=direct]`.
- ⚠️ O `javascript_tool` **bloqueia** retorno que pareça query string. Devolver
  booleanos e flags curtas em vez de URLs.
- Sempre conferir o que subiu por `git fetch` + `sha256sum` contra o arquivo
  local, **antes** de dizer que está lá.
- O merge é do Érico.

**Deploy no EasyPanel é ação externa do Érico**, um passo por vez. Só o botão
verde **Deploy** faz `git pull` fresco — "Force Rebuild" reusa cache.

---

## Sujeira que ficou

- `short_links` tem uma linha de teste antiga, **`zzogt01`**, apontando para a
  home do site, com `og_image` de uma URL da Amazon inventada (devolve 404).
  Serve para remedir a prévia sem gastar link real.
- Os links **`d9q7va7`** (Amazon) e **`xzadtgh`** (Shopee) são de teste da
  REVISÃO 53, mas são links de afiliado **reais e válidos** do Érico — o
  `xzadtgh` é justamente o que pode aparecer no relatório da Shopee. **Não
  apagar o `xzadtgh` antes de a P62 fechar.**
- A branch `rocketdesignbh-dot-patch-5` (REVISÃO 50) ficou órfã: a 51 já contém
  a 50, e o PR **#7** pode ser fechado sem merge.
