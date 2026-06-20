# Mega Links BR · Front-end estático (para EasyPanel "App" via Dockerfile)
# Coloque o app como index.html nesta pasta (frontend/index.html).
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY privacidade.html /usr/share/nginx/html/privacidade.html
COPY termos.html /usr/share/nginx/html/termos.html
# fallback: SPA cai no index.html; arquivos existentes são servidos diretamente
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location / { try_files $uri /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
