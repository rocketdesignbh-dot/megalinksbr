import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const code = parts[parts.length - 1] || url.searchParams.get('code') || '';

  if (!code) return new Response('Not found', { status: 404 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: link } = await sb
    .from('short_links')
    .select('code, long_url, destination, user_id')
    .eq('code', code)
    .maybeSingle();

  if (!link) return new Response('Link n\u00e3o encontrado', { status: 404 });

  const destination = link.destination || link.long_url;
  if (!destination) return new Response('Destino inv\u00e1lido', { status: 404 });

  const ua  = (req.headers.get('user-agent')  || '').slice(0, 500);
  const ref = (req.headers.get('referer')     || '').slice(0, 500);

  // Fire-and-forget: registra clique + incrementa contador
  Promise.all([
    sb.from('link_clicks').insert({ code, user_id: link.user_id, user_agent: ua, referer: ref }),
    sb.rpc('increment_clicks', { p_code: code }),
  ]).catch(() => {});

  return new Response(null, {
    status: 302,
    headers: { 'Location': destination },
  });
});
