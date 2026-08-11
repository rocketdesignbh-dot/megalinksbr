# mr-ingest — Mega Results / Mega Links BR
#
# Node 22, nao 20. O motivo original de fixar o 20 (ter o global `File`, senao o
# `undici` do supabase-js quebra com "ReferenceError: File is not defined")
# continua atendido — `File` existe desde o 20 e segue no 22.
#
# O que forcou a subida: o @supabase/supabase-js 2.111 exige WebSocket nativo,
# que so existe a partir do Node 22. No 20 o `auth.getUser()` lanca "Node.js
# detected but native WebSocket not found", e como essa chamada e quem valida o
# token do usuario, TODA importacao pelo navegador voltava 401 — parecia sessao
# invalida do usuario e era versao errada de runtime.
FROM node:22-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# `npm ci`, nao `npm install`: instala exatamente o que esta no package-lock.json
# e falha se o lock divergir do package.json. Com `install` o build de producao
# poderia resolver versoes diferentes das testadas aqui, sem avisar ninguem.
RUN npm ci --omit=dev

COPY . .

# Ingestao e I/O-bound com picos de CPU no parser. O heap fica pequeno de
# proposito: o pipeline e streaming e uso de memoria constante e o contrato.
# Se estourar 512 MB, ha vazamento — melhor falhar alto do que degradar o
# banco compartilhado com o resto do MegaLinks.
ENV NODE_OPTIONS="--max-old-space-size=512"

EXPOSE 8080

CMD ["node", "src/server.js"]
