# wa-engine — Mega Links BR
# Node 20: traz o global `File`, entao o `undici` (puxado por algumas libs)
# nao quebra mais com "ReferenceError: File is not defined".
FROM node:20-slim

# git e openssh-client sao necessarios para o libsignal do Baileys baixar deps via SSH
RUN apt-get update \
    && apt-get install -y --no-install-recommends git openssh-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependencias primeiro (cache eficiente). Como nao versionamos
# package-lock antigo, usamos npm install para resolver as versoes atuais.
COPY package*.json ./
RUN npm install --omit=dev

# Copia o restante do codigo
COPY . .

# Porta do wa-engine
EXPOSE 8080

CMD ["node", "server.js"]
