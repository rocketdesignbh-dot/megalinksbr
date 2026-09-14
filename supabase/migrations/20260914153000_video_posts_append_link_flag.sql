alter table video_posts add column if not exists append_link boolean not null default true;

comment on column video_posts.append_link is 'false quando a legenda já foi montada com o link embutido (modo "post completo" do Post Vídeo, REVISÃO 152) — o send-video-post não deve colar o link de novo no fim.';
