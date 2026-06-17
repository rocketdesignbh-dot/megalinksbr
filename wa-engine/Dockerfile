FROM node:18-alpine

WORKDIR /app

# git é necessário para instalar a dependência libsignal do Baileys
RUN apk add --no-cache git

# Instalar dependências
COPY package*.json ./
RUN npm install --omit=dev

# Copiar código
COPY server.js .

EXPOSE 8080

CMD ["node", "server.js"]
