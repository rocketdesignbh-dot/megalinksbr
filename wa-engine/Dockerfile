# Mega Links BR · Motor WhatsApp (Baileys)
# Imagem enxuta Node 20. Build: docker build -t mega-wa-engine .
FROM node:20-slim

# Baileys usa libs nativas (sharp/ffmpeg opcionais para mídia)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates ffmpeg git \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# instala dependências primeiro (cache de camada)
COPY package*.json ./
RUN npm install --omit=dev

# código
COPY . .

# pasta de sessões persistente (monte um volume aqui em produção)
RUN mkdir -p /app/auth
VOLUME ["/app/auth"]

EXPOSE 8080
CMD ["node", "server.js"]
