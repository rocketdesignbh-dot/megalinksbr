insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video-posts', 'video-posts', false, 16777216, array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;

-- Path por usuário: {user_id}/{video_post_id}.mp4 — dono lê/escreve só o próprio prefixo
create policy "video_posts_bucket_own_select" on storage.objects
  for select using (bucket_id = 'video-posts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "video_posts_bucket_own_insert" on storage.objects
  for insert with check (bucket_id = 'video-posts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "video_posts_bucket_own_delete" on storage.objects
  for delete using (bucket_id = 'video-posts' and (storage.foldername(name))[1] = auth.uid()::text);
