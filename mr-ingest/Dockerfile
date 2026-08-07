# mr-ingest — Mega Results / Mega Links BR
# Node 20 pelo mesmo motivo do wa-engine: traz o global `File`, entao o `undici`
# puxado pelo supabase-js nao quebra com "ReferenceError: File is not defined".
FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Ingestao e I/O-bound com picos de CPU no parser. O heap fica pequeno de
# proposito: o pipeline e streaming e uso de memoria constante e o contrato.
# Se estourar 512 MB, ha vazamento — melhor falhar alto do que degradar o
# banco compartilhado com o resto do MegaLinks.
ENV NODE_OPTIONS="--max-old-space-size=512"

EXPOSE 8080

CMD ["node", "src/server.js"]
