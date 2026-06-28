# Mega Links BR · Front-end estático (para EasyPanel "App" via Dockerfile)
FROM nginx:alpine
# Força rebuild: 2026-06-28T18:57:22Z
RUN echo "2026-06-28T18:57:22Z" > /dev/null
COPY index.html /usr/share/nginx/html/index.html
COPY privacidade.html /usr/share/nginx/html/privacidade.html
COPY termos.html /usr/share/nginx/html/termos.html
COPY favicon.png /usr/share/nginx/html/favicon.png
COPY icon.png /usr/share/nginx/html/icon.png
COPY banner.jpg /usr/share/nginx/html/banner.jpg
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location / { try_files $uri /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
