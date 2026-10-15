# wa-feed — conversa de ofertas no WhatsApp, rolando

Um componente, duas apresentações:

| Onde | Arquivo | Como roda |
|---|---|---|
| Site | `frontend/landing.html`, seção `#no-grupo` | `WAFeed.auto(host, "site", botaoPausa)`: relógio próprio, loop sem emenda, só roda com a seção visível, botão de pausa, `prefers-reduced-motion` deixa parado e rolável |
| Showreel | `showreel/whatsapp/index.html` (HyperFrames) | `WAFeed.mount(host, "reel")` + `feed.seek(t)` dirigido pela timeline GSAP: determinístico, um quadro por instante |

`showreel/whatsapp/wa-feed` é uma **junção de diretório** para esta pasta (o
HyperFrames não aceita `../` fora do projeto). Se ela sumir (clone novo, outro
PC), recrie no PowerShell:

```powershell
New-Item -ItemType Junction -Path showreel\whatsapp\wa-feed -Target frontend\wa-feed
```

## O que ajustar, e onde (tudo em `wa-feed.js`)

- **Mensagens** (`MENSAGENS`): ordem, texto, preços (`de`/`por`; o % OFF é calculado), cupom, loja, código do link. Imagem nova: coloque em `img/` e informe `w`/`h` reais.
- **Grupo** (`GRUPO`): nome, participantes, relógio da barra de status.
- **Ritmo** (`PRESETS.site` / `PRESETS.reel`):
  - `paradas`: em quais mensagens a rolagem para e por quanto tempo (`pausa`, s). `desvio` (px) deixa a mensagem entrar só pela metade.
  - `velocidade` (px/s), `puxadaMax` (px por gesto de dedo), `puxadaBase` (s), `intervalo` ([min,max] s entre gestos).
  - `loop`, `inicio` (s parado antes do 1º gesto), `semente` (muda as microvariações sem perder o determinismo).
- Qualquer chave pode ser sobrescrita na chamada: `WAFeed.auto(el, { preset: "site", velocidade: 400 })`.

A rolagem é sempre **de baixo para cima** (o conteúdo sobe, revelando mensagens novas embaixo).

## Testar

`demo.html` (bancada): os dois presets lado a lado, com régua de tempo para o reel.
Sirva a raiz do repositório (`python -m http.server 5180`) e abra
`/frontend/wa-feed/demo.html`.

## Renderizar o showreel

```bash
cd showreel
npx hyperframes check whatsapp
npx hyperframes render whatsapp -q delivery -o whatsapp/entrega/megalinksbr-whatsapp-9x16.mp4
```

Duração 15,5 s. De 13,9 s até o fim o quadro fica limpo (só o fundo da marca) para entrar logo ou CTA na edição.
Mudou o ritmo do preset `reel`? Confira `feed.duracao` (na bancada) e, se passar de ~12 s, ajuste `SAIDA`/`DUR` no `index.html` do showreel.
