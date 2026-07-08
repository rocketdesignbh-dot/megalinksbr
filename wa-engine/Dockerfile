# wa-engine — Mega Links BR
# Node 20: traz o global `File`, entao o `undici` (puxado por algumas libs)
# nao quebra mais com "ReferenceError: File is not defined".
FROM node:20-slim

# ca-certificates: SSL para HTTPS; git: baixar deps do Baileys
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Redireciona SSH -> HTTPS e desabilita verificacao SSL estrita do git
# (necessario pois o slim nao tem CA bundle completo para github.com)
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
    && git config --global url."https://github.com/".insteadOf "git@github.com:" \
    && git config --global http.sslVerify false

# Instala dependencias
COPY package*.json ./
RUN npm install --omit=dev

# Copia o restante do codigo
COPY . .

# Porta do wa-engine
EXPOSE 8080

CMD ["node", "server.js"]
