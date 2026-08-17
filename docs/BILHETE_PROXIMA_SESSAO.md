# Bilhete para a próxima sessão — Mega Links BR

> **Primeira ação: ler `docs/ESTADO_ATUAL.md` do repo, inteiro.** Ele está na
> **REVISÃO 51**. Este bilhete não substitui o ESTADO_ATUAL — ele só diz por onde
> começar e o que não redescobrir.
>
> `main` em `01b031f` + o commit da REVISÃO 51.

---

## O que o Érico pediu para fazer nesta sessão

**P62 — `sub_id` no link de afiliado da Shopee.** Autorizado por ele em 17/08 e
adiado de propósito para cá.

### Por que

Duas vendas de Shopee saíram com `Status: Cancelado` e comissão R$ 0,00, com as
compradoras confirmando compra e recebimento. Para responder se o nosso
encurtador estava atrapalhando, foi preciso cruzar **na mão** o `clicked_at` do
`link_clicks` com o "Período dos Cliques" do relatório da Shopee, minuto a
minuto. Funcionou uma vez; não escala, e não serve para abrir chamado com volume.

### O que fazer

O `s.shopee.com.br/an_redir` aceita `sub_id`. Passando o `code` do nosso short
link, o próprio relatório da Shopee passa a dizer **qual link** gerou cada
pedido.

Onde mexer: `prGerarLinkAfil`, ramo `if(loja==="Shopee")`, em
`frontend/index.html`. Hoje ele monta:

```
https://s.shopee.com.br/an_redir?origin_link=<encoded>&affiliate_id=<id>
```

### A ordem de operações é o problema, e precisa ser resolvida antes de codar

O `code` do short link **é gerado depois** do link de afiliado: `prGerarLinkAfil`
monta o `an_redir`, e só então `mlEncurtarLink` sorteia o `code` e grava a linha.
Para o `sub_id` carregar o `code`, uma das três:

1. Sortear o `code` antes e passá-lo para o gerador de link de afiliado.
2. Gravar o short link e depois dar um `UPDATE` no `destination` com o `sub_id`.
3. Usar outro identificador no `sub_id` (não o `code`) e guardar a associação.

**Nenhuma foi escolhida.** Decidir com o Érico antes de escrever código.

### Como provar que funcionou

Não basta o link sair com `sub_id`. A prova é o `sub_id` **aparecer no relatório
de vendas da Shopee** depois de um clique e um pedido reais — e isso depende do
Érico, com o atraso natural do relatório (dados atualizados diariamente às 10:30).

---

## O que NÃO redescobrir

### A Shopee não está barrando o nosso link — está provado

Medido no `link_clicks` do código `4h8wmie` contra o relatório da Shopee: nosso
clique de gente às **21:44:18 UTC**, relatório da Shopee dizendo **"Período dos
Cliques: 18:44"** (Brasília). Mesmo minuto. A atribuição funcionou ponta a ponta.

O `Cancelado` é status de **pedido**, não de atribuição. Duas leituras possíveis,
e **não foi possível distinguir**: pedido cancelado e refeito (há duas linhas do
mesmo produto no mesmo minuto, uma `x1` e outra `x0`), ou a regra de atribuição
da Shopee — janela de **7 dias, último clique leva tudo**, sem divisão.

Não reabrir essa investigação sem dado novo.

### A infraestrutura da prévia OG está provada e funcionando

`redirect` **v16** no ar. Robô de prévia recebe `text/html` com as nossas tags
OG; gente recebe 302; robô não vira clique. Medido em produção com `pg_net`, três
user-agents.

⚠️ **A armadilha, que custou caro e não pode ser esquecida:** o gateway do
Supabase reescreve todo HTML como `text/plain` + `nosniff` + CSP `sandbox`. O
`location /r/` do nginx desfaz isso com `proxy_hide_header` + `add_header`. Se
alguém mexer nesse bloco do `frontend/Dockerfile`, a prévia morre em silêncio —
com status 200 e corpo perfeito.

---

## P60 — a pendência que eu deixei pela metade, e o erro foi meu

Liguei a prévia na **tela errada**.

| tela | função | tem produto? | passa `og`? |
|---|---|---|---|
| Postar Rápido | `prPreencherStep2` | sim (`PR.produto`) | **sim** |
| **Link Rápido** | `lrGerar` → `encurtarLinkFinal(afil, null)` | **não** | **não** |

O Érico usa o **Link Rápido** — a aba que ele descreveu desde a primeira
mensagem. Essa tela só chama a `resolve-link` e encurta; **nunca teve título,
preço nem foto**. Não é falta de passar um parâmetro: não há dado para passar.

Medido: os links `mkp7lg5` e `5egzhll`, gerados depois do Deploy, saíram com os
três campos `og_*` vazios. **Não é cache** — o `index.html` servido pelo domínio
foi baixado e contém as três marcas do código novo.

**A saída custa uma leitura de loja** (`product-search` depois do `resolve-link`):
crédito no ML, credencial oficial na Shopee, captcha na Amazon. Por isso não foi
feita de afogadilho. Decidir com o Érico.

---

## Estado das pendências que esta sessão mexeu

| # | estado |
|---|---|
| **P57** | 🟡 orçamento por loja no ar (`product-refresh` v21), medido. Falta calibrar os baldes `amazon` (45) e `sem_verificador` (20) — nunca tiveram candidato, a base do Érico foi esvaziada por ele em 13/08 |
| **P59** | 🟡 dois links de ML ilegíveis ocupam vaga em toda rodada, um deles há 37 dias. Saída não decidida |
| **P60** | 🟠 acima |
| **P61** | 🔵 25,7% dos cliques históricos são robô. A v16 parou de gravar robô; **o histórico continua sujo** e o Érico não decidiu se quer recalcular |
| **P62** | 🔵 o trabalho desta sessão |

---

## Infraestrutura — como empurrar código

O sandbox da nuvem **lê** o repo (`git clone` funciona), mas **não empurra**: o
proxy recusa com *"not in this session's authorized repository set"*. PAT
clássico não resolve — o proxy nem chega a usar o token. A hipótese antiga de que
era o GitHub App está **errada**; a mensagem pede o repo nas **fontes da sessão**,
e o seletor "Run this task" não apareceu para o Érico.

O que funciona é o **GitHub web dirigido pelo Claude no Chrome**:

* Subir arquivo: `/upload/<branch>/<pasta>`. O `file_upload` aceita caminhos de
  `/mnt/user-data/outputs/...`. Dá para subir vários arquivos da mesma pasta de
  uma vez.
* **"Propose changes" NÃO cria o PR** — só cria a branch e leva para a tela de
  comparação. Sair antes deixa branch órfã. Voltar por
  `/compare/main...<branch>?expand=1`.
* O campo "New branch name" não guarda valor: a branch sai como
  `rocketdesignbh-dot-patch-N`. Conferir por `git ls-remote`.
* Os botões **não respondem a clique por `ref` nem por coordenada** (coordenada
  cai dentro do textarea e dispara atalhos do GitHub). O que funciona é
  `.click()` por JS no `button[type=submit]`.
* Preencher campos por `form_input`.
* O **merge é do Érico**.
* Sempre conferir o que subiu por `git fetch` + `sha256sum` contra o arquivo
  local, antes de dizer que está lá.

Deploy no EasyPanel é **ação externa do Érico**, um passo por vez. Só o botão
verde **Deploy** faz `git pull` fresco — "Force Rebuild" reusa cache.

---

## Sujeira que ficou

`short_links` tem uma linha de teste minha, `zzogt01`, apontando para a home do
site, com `og_image` de uma URL da Amazon **inventada** (devolve 404). Serve para
remedir a prévia sem gastar link real. Apagar quando não for mais útil — o Érico
foi avisado e não pediu para apagar.
