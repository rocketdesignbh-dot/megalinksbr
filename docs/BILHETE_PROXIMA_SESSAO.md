# Bilhete para a próxima sessão — Mega Links BR

> **Primeira ação: ler `docs/ESTADO_ATUAL.md` do repo, inteiro.** Ele está na
> **REVISÃO 52**. Este bilhete não substitui o ESTADO_ATUAL — ele só diz por onde
> começar e o que não redescobrir.

---

## O que esta sessão (17/08, manhã) fez

**P62 codada.** O `mlEncurtarLink` grava o `destination` do short link já com
`sub_id=<code>` quando o destino é um `s.shopee.com.br/an_redir`.

O impasse que o bilhete anterior deixou — *"o `code` nasce depois do link de
afiliado, decidir entre três saídas"* — **não existia**. O `gerarCode()` roda na
linha imediatamente anterior ao `insert`, então o `code` já está em mãos antes de
o destino ser gravado. Uma função nova (`shopeeSubId`) e uma linha trocada. **Não
foi preciso `UPDATE` depois, nem tocar em nenhuma das ~10 chamadas do
`prGerarLinkAfil`.**

Decidido com o Érico: vale para **toda tela que encurta** (o patch mora no
encurtador, não na tela) e o `sub_id` leva **só o `code`**.

---

## O que fazer nesta sessão — nesta ordem

### 1ª — Ler a prova da P62. É barata e depende do Deploy.

Depois do Deploy, o Érico gera **um link novo de Shopee no Link Rápido**. Então:

```sql
select code, destination, created_at
from short_links
where destination ilike '%an_redir%'
order by created_at desc limit 3;
```

O que tem que aparecer: `&sub_id=<o próprio code da linha>` no fim do
`destination`.

**Baseline registrado em 17/08, antes do patch:** os 10 `an_redir` mais recentes
(`bdmctsi`, `js3eq1f`, `y9q3q7i`, `r32bryl`, `sb6hrln`, `fdocjz6`, `fb0gdhk`,
`xslho9p`, `ichv8qh`, `psyqrwo`, todos de 16/08) estão **sem** `sub_id`. Se o
link novo sair igual a eles, o Deploy não pegou — conferir o bundle servido antes
de suspeitar do código (P49: usar `?v=`).

### 2ª — A prova que FECHA a P62 não é nossa, e leva dias

`destination` com `sub_id` prova que montamos a URL certa. **Não prova que a
Shopee lê o campo.** Isso só o relatório de vendas dela diz, depois de um clique
e um pedido **reais**, com o atraso natural do relatório (dados atualizados
diariamente às 10:30). Enquanto isso não for lido, a P62 fica 🟡.

⚠️ **Não declarar a P62 fechada por ter visto o `sub_id` no nosso banco.** É
exatamente a forma do *"status 200 não é prova"*: o campo certo, do nosso lado,
não é a atribuição do outro lado.

### 3ª — O que está esperando decisão do Érico (nenhuma foi tomada)

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

### Por que o `long_url` NÃO recebe o `sub_id`

Ele é a **chave de reuso** da `send-post`, da `group-blast` e da `ml-short-link`
(`.eq("long_url", longUrl)`). Gravar o valor com `sub_id` faria a busca errar e
criar linha nova de `short_links` a cada disparo do mesmo produto. Quem
redireciona lê `destination || long_url` (lido na fonte publicada da `redirect`
v16), então o `destination` sozinho basta. **Não "consertar" isso.**

### Por que a URL não é reserializada

`new URL(...).toString()` reescreveria o `origin_link` com as regras do
`URLSearchParams` (espaço vira `+`), e ele foi montado com `encodeURIComponent`
lá no `prGerarLinkAfil`. O `sub_id` é anexado por **string**; o `new URL` dentro
da `shopeeSubId` serve só para *perguntar* se aquilo é um `an_redir`.

### A Shopee não está barrando o nosso link — está provado

Medido no `link_clicks` do código `4h8wmie` contra o relatório da Shopee: clique
de gente às 21:44:18 UTC, relatório dizendo *"Período dos Cliques: 18:44"*
(Brasília). Mesmo minuto. O `Cancelado` é status de **pedido**, não de
atribuição. **Não reabrir sem dado novo.**

### A infraestrutura da prévia OG está provada e funcionando

`redirect` v16 no ar. Robô de prévia recebe `text/html` com as nossas tags OG;
gente recebe 302; robô não vira clique. Medido em produção com `pg_net`, três
user-agents.

⚠️ **A armadilha:** o gateway do Supabase reescreve todo HTML como `text/plain` +
`nosniff` + CSP sandbox. O `location /r/` do nginx desfaz isso com
`proxy_hide_header` + `add_header`. **Mexeu nesse bloco do `frontend/Dockerfile`,
a prévia morre em silêncio** — com status 200 e corpo perfeito.

---

## Infraestrutura — como empurrar código

O sandbox da nuvem **lê** o repo (`git clone` funciona) mas **não empurra**: o
proxy recusa com *"not in this session's authorized repository set"*. PAT
clássico não resolve — o proxy nem chega a usar o token.

O que funciona é o **GitHub web dirigido pelo Claude no Chrome**:

- Subir arquivo: `/upload/<branch>/<pasta>`. O `file_upload` aceita caminhos de
  `/mnt/user-data/outputs/…`. Dá para subir vários arquivos da mesma pasta de uma
  vez.
- **"Propose changes" NÃO cria o PR** — só cria a branch e leva para a tela de
  comparação. Sair antes deixa branch órfã. Voltar por
  `/compare/main...<branch>?expand=1`.
- O campo "New branch name" não guarda valor: a branch sai como
  `rocketdesignbh-dot-patch-N`. Conferir por `git ls-remote`.
- Os botões não respondem a clique por ref nem por coordenada. O que funciona é
  `.click()` por JS no `button[type=submit]`.
- Preencher campos por `form_input`.
- O merge é do Érico.
- Sempre conferir o que subiu por `git fetch` + `sha256sum` contra o arquivo
  local, **antes** de dizer que está lá.

**Deploy no EasyPanel é ação externa do Érico**, um passo por vez. Só o botão
verde **Deploy** faz `git pull` fresco — "Force Rebuild" reusa cache.

---

## ⚠️ Estado das branches — conferir ANTES de qualquer coisa

Em 17/08 o `main` estava em `01b031f`, que é a **REVISÃO 49** — e o bilhete
anterior afirmava que era "`01b031f` + o commit da REVISÃO 51". Não era: as
revisões 50 e 51 estavam em branches **não mergeadas**.

| branch | o que traz |
|---|---|
| `rocketdesignbh-dot-patch-5` | REVISÃO 50 — **superada** pela 51, dá para apagar |
| `rocketdesignbh-dot-patch-6` | REVISÃO 51 |

A branch desta sessão foi criada **em cima da patch-6**, então mergeá-la traz as
revisões 50, 51 e 52 de uma vez. **Conferir com `git ls-remote` se o merge
aconteceu** — se o `main` ainda estiver em `01b031f`, o código da P62 não está no
repo e o Deploy não tem o que buscar.

---

## Sujeira que ficou

`short_links` tem uma linha de teste, `zzogt01`, apontando para a home do site,
com `og_image` de uma URL da Amazon inventada (devolve 404). Serve para remedir a
prévia sem gastar link real. Apagar quando não for mais útil — o Érico foi
avisado e não pediu para apagar.
