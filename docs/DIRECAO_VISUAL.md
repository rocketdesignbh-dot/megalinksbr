# DIREÇÃO VISUAL — Mega Links BR

> Escrito na REVISÃO 63 (23/08/2026), junto com a landing nova.
> Este arquivo é a fonte de verdade **de design**. O `ESTADO_ATUAL.md` continua
> sendo a fonte de verdade do **estado** do projeto.
>
> Quem for mexer em tela — landing ou painel — lê isto antes.

---

## A tese

O MegaLinksBR produz uma coisa concreta o dia inteiro: **despachos**. Um produto
sai de um marketplace, é tratado, e cai num grupo, num horário, com um link
rastreado. Isso é uma linha de log: hora, produto, loja, destino, estado.

A identidade sai daí, e **não** de uma metáfora de "automação com IA". Um site
que mostra o registro real da operação não se parece com nenhum gerador de
landing page, porque nenhum gerador tem esse dado.

Nome da direção: **Sala de Despacho**. Escolhida pelo Érico em 23/08 entre três
propostas.

**O teste que decide qualquer dúvida:** *se eu tirasse o logo, isto ainda seria
reconhecível como MegaLinksBR?* Se não, refazer.

---

## Regra número 1 — o amarelo é estado, não enfeite

O amarelo marca **o que está acontecendo agora**: a linha viva, o número que
mudou, o canal conectado, a ação principal. Se o amarelo estiver preenchendo
área, está errado.

---

## Tokens

### Cor

| Token | Valor | Onde |
|---|---|---|
| `--bg` | `#14161A` | fundo padrão (grafite, não preto puro) |
| `--bg2` | `#191C21` | superfície elevada (painéis, cards) |
| `--bg3` | `#1F232A` | terceiro nível, usar pouco |
| `--paper` | `#EDEBE6` | banda clara editorial |
| `--paper2` | `#E2DFD7` | segunda superfície no papel |
| `--tx` | `#E9E7E2` | texto principal no escuro |
| `--tx2` | `#9BA0A6` | texto secundário (6,88:1) |
| `--mut` | `#828891` | rótulos e legendas (5,07:1 — **não escurecer**) |
| `--ink` | `#14161A` | texto no papel |
| `--ink2` | `#4A4F55` | texto secundário no papel |
| `--ln` | `#282C33` | régua no escuro |
| `--ln2` | `#343941` | régua mais forte |
| `--ln-p` | `#CFCCC3` | régua no papel |
| `--y` | `#FFC107` | estado / acento |

Rótulo sobre papel: `#6A6760` (4,74:1). Nada abaixo de **4,5:1** para texto
normal. Rótulo em maiúscula de 10-11px conta como texto normal.

### Forma

- **Raio: 2px.** Não 8, não 12, não pílula.
- **Sombra: nenhuma.** Profundidade vem de régua de 1px e de degrau de valor.
- **Glow: nenhum.** O token `--glow` do painel antigo não entra em tela nova.
- **Gradiente: só como textura técnica** (réguas de 1px que somem). Nunca como
  fundo colorido, nunca em título, nunca em botão.

### Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Display | **Archivo** 600/700 | títulos, números grandes, wordmark |
| UI / corpo | **IBM Plex Sans** 400/500/600 | tudo que se lê |
| Dado | **IBM Plex Mono** 400/500 | hora, preço, contagem, rótulo em maiúscula, código |

- Título: `letter-spacing:-.028em` a `-.038em`, `line-height` ~1.0, `text-wrap:balance`.
- Rótulo em maiúscula: `letter-spacing:.16em` a `.18em`, 10-11px, cor `--mut`.
- Número em coluna: sempre `font-variant-numeric:tabular-nums`.
- Corpo perto de 65 caracteres de largura.
- **Proibidas:** Inter, Roboto, Open Sans, Lato, Arial, Space Grotesk, fonte de
  sistema como escolha. (Plus Jakarta Sans é o legado do painel; sai quando o
  painel for migrado.)

### Espaçamento e grid

- Container `max-width:1180px`, gutter `clamp(20px,4vw,40px)`.
- Seção: `padding` vertical `clamp(52px,7vw,90px)`, separada por régua de 1px.
- Cabeçalho de seção em duas colunas: `82px` de régua marginal + conteúdo.
- Layout por `grid`/`flex` com `gap` — não por margem em cada filho.
- Toda coluna de grid usa `minmax(0,1fr)`, nunca `1fr` puro: `1fr` estoura
  horizontalmente quando o conteúdo é largo. Isso já causou overflow aqui.
- Conteúdo largo (tabela, log) mora em contêiner com `overflow-x:auto`. O
  `body` nunca rola de lado.

### Motion

- **Uma sequência orquestrada na entrada do hero**, escalonada por
  `animation-delay`, e nada mais se movendo sozinho. As linhas do log entram
  uma a uma porque isso *é* o produto acontecendo — não é enfeite.
- Revelação por scroll: `opacity` + `translateY(8px)`, uma vez, com
  `IntersectionObserver` que faz `unobserve` depois.
- Hover: transição de 120-140ms em cor e borda. Nada de escala grande.
- `prefers-reduced-motion: reduce` desliga tudo.
- As regras de reveal são escopadas em `.js` (a classe é posta por script no
  `<head>`). Sem JS a página aparece inteira — não some.

---

## Composição

- **Não** repita o mesmo card N vezes. Alterne: linha editorial, tabela, bloco
  largo, lista com régua, banda clara no meio do escuro.
- Numeração de seção **só quando existe sequência real**. "01 problema →
  02 rota → 03 operação" é narrativa; numerar "Planos" e "Perguntas" seria
  decoração — e foi removido por isso.
- Use o produto como elemento gráfico. Fragmento de UI de verdade vale mais que
  ilustração.
- **Nunca invente prova social.** Número, depoimento, logo de cliente e
  estatística só entram se forem medidos. A frase "milhares de usuários
  confiam" estava no ar dentro de um PNG e foi retirada.

---

## Lista do que não fazer

Vem do brief do Érico e do
`claude-cookbooks-main/coding/prompting_for_frontend_aesthetics.ipynb`:

- Gradiente roxo/azul, fundo preto com blobs coloridos, glassmorphism
- Cards iguais em sequência, raio exagerado, botão-cápsula gigante
- Ícone genérico dentro de círculo, emoji como marcador de seção
- Seções visualmente idênticas; layout "hero + 3 cards + depoimentos + pricing"
- Título gigante ocupando meia tela; gradiente em título; glow; sombra pesada
- Ilustração genérica de IA, stock photo, mockup falso sem propósito
- Animação contínua, parallax exagerado, tudo flutuando
- Elemento decorativo sem função

**Critério:** se a decisão parece o que uma IA escolheria automaticamente para
um SaaS, questione a decisão.

---

## Onde o cookbook e o brief do Érico discordam — e quem vence

O guia de estética do cookbook é bom e foi seguido, com **duas exceções
deliberadas**. A hierarquia de verdade do projeto manda: o que o Érico disser
vence.

| Ponto | Cookbook | Brief do Érico | O que está no código |
|---|---|---|---|
| Fundo | "camade gradientes, padrões geométricos, atmosfera" | "sem gradientes, sem glow, sem blob" | Profundidade **sim**, gradiente colorido **não**: réguas verticais de 1px com máscara que some. Papel milimetrado, não blob. |
| Tipografia | "use extremos: peso 100/200 contra 800/900, saltos de 3x+" | "não exagere no tamanho dos títulos; prefira composição a font-size" | Escala moderada e contraste por **peso e cor**, não por tamanho. |

Onde os dois concordam — evitar Inter/Roboto/Space Grotesk, comprometer-se com
uma estética coesa, variáveis CSS, cor dominante com acento afiado, uma
sequência de entrada bem orquestrada em vez de micro-interações espalhadas — o
código segue os dois.

---

## Estado da migração

| Superfície | Direção aplicada |
|---|---|
| `landing.html` | ✅ completa |
| Gate de login (`index.html`) | ✅ completa |
| Menu lateral do painel | ⚠️ só a estrutura (virou `<a>`); visual ainda é o antigo |
| 27 telas do painel | ❌ ainda no visual antigo: Plus Jakarta Sans, raio 12px, sombra, gradiente rosa/magenta (`--pink #FF4D8D`), emoji como marcador |

**Próxima leva combinada com o Érico:** trocar tokens e componentes globais do
painel (cor, tipografia, raio, fim da sombra e do gradiente rosa, chips,
tabelas), sem mexer em layout nem em lógica. O obstáculo conhecido são os
**1.414 atributos `style=""` inline** do `index.html`, que ignoram os tokens.
