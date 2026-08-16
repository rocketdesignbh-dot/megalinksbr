# Mega Links BR · Front-end estático (para EasyPanel "App" via Dockerfile)
FROM nginx:alpine
RUN echo "2026-07-07T00:00:00Z" > /dev/null
COPY index.html /usr/share/nginx/html/index.html
COPY revops.html /usr/share/nginx/html/revops.html
COPY privacidade.html /usr/share/nginx/html/privacidade.html
COPY termos.html /usr/share/nginx/html/termos.html
COPY guia.html /usr/share/nginx/html/guia.html
COPY favicon.png /usr/share/nginx/html/favicon.png
COPY icon.png /usr/share/nginx/html/icon.png
COPY banner.jpg /usr/share/nginx/html/banner.jpg
COPY boas-vindas-pc.png /usr/share/nginx/html/boas-vindas-pc.png
COPY boas-vindas-cel.png /usr/share/nginx/html/boas-vindas-cel.png
COPY sitemap.xml /usr/share/nginx/html/sitemap.xml
COPY robots.txt /usr/share/nginx/html/robots.txt
COPY onboarding.js /usr/share/nginx/html/onboarding.js
COPY onboarding.css /usr/share/nginx/html/onboarding.css
COPY onboarding-config.js /usr/share/nginx/html/onboarding-config.js
COPY onboarding-test.js /usr/share/nginx/html/onboarding-test.js
COPY onboarding-supabase-sync.js /usr/share/nginx/html/onboarding-supabase-sync.js
COPY exemplo-postagens.js /usr/share/nginx/html/exemplo-postagens.js
COPY exemplo-configuracao.js /usr/share/nginx/html/exemplo-configuracao.js
RUN cat <<'NGINXEOF' > /etc/nginx/conf.d/default.conf
resolver 8.8.8.8 8.8.4.4 valid=10s ipv6=off;
resolver_timeout 5s;

server {
  listen 80;
  root /usr/share/nginx/html;

  # Guia do novo usuário — URL limpa /guia
  location = /guia {
    try_files /guia.html =404;
  }

  # Short links — redireciona /r/{code} para a Edge Function redirect
  location /r/ {
    set $supabase_backend "nxlfezpagporealqqbfj.supabase.co";
    rewrite ^/r/(.*)$ /functions/v1/redirect/$1 break;
    proxy_pass https://$supabase_backend;
    proxy_set_header Host nxlfezpagporealqqbfj.supabase.co;
    proxy_ssl_server_name on;

    # P60 — o gateway do Supabase NEUTRALIZA HTML. MEDIDO em 16/08 batendo
    # direto em nxlfezpagporealqqbfj.supabase.co (server: cloudflare): a
    # resposta da `redirect` v16 chega com o corpo certo (1457 bytes, as nossas
    # tags OG) mas com `content-type: text/plain`, `x-content-type-options:
    # nosniff` e `content-security-policy: default-src 'none'; sandbox`. O
    # `cache-control` que a funcao mandou passa intacto, entao a reescrita e
    # seletiva: e a protecao anti-phishing do dominio compartilhado *.supabase.co.
    # Com `text/plain` + nosniff o WhatsApp nao le tag OG nenhuma, e a previa
    # propria nao serve para nada.
    # Aqui, no NOSSO dominio, a resposta volta a ser HTML. Vale para o 302 do
    # usuario de verdade tambem, que nao tem corpo — inofensivo.
    proxy_hide_header Content-Type;
    proxy_hide_header X-Content-Type-Options;
    proxy_hide_header Content-Security-Policy;
    add_header Content-Type "text/html; charset=utf-8" always;
  }

  location / {
    try_files $uri /index.html;
  }
}
NGINXEOF
EXPOSE 80
