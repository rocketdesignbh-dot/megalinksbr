# Mega Links BR · Front-end estático (para EasyPanel "App" via Dockerfile)
FROM nginx:alpine
RUN echo "2026-07-07T00:00:00Z" > /dev/null
COPY index.html /usr/share/nginx/html/index.html
COPY revops.html /usr/share/nginx/html/revops.html
COPY privacidade.html /usr/share/nginx/html/privacidade.html
COPY termos.html /usr/share/nginx/html/termos.html
COPY favicon.png /usr/share/nginx/html/favicon.png
COPY icon.png /usr/share/nginx/html/icon.png
COPY banner.jpg /usr/share/nginx/html/banner.jpg
RUN cat <<'NGINXEOF' > /etc/nginx/conf.d/default.conf
resolver 8.8.8.8 8.8.4.4 valid=10s ipv6=off;
resolver_timeout 5s;

server {
  listen 80;
  root /usr/share/nginx/html;

  # Short links — redireciona /r/{code} para a Edge Function redirect
  location /r/ {
    set $supabase_backend "nxlfezpagporealqqbfj.supabase.co";
    rewrite ^/r/(.*)$ /functions/v1/redirect/$1 break;
    proxy_pass https://$supabase_backend;
    proxy_set_header Host nxlfezpagporealqqbfj.supabase.co;
    proxy_ssl_server_name on;
  }

  location / {
    try_files $uri /index.html;
  }
}
NGINXEOF
EXPOSE 80
