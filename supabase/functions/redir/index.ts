// redir — redirect rápido para links curtos próprios (megalinksbr.com.br/redir/CODE)

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.pathname.split("/").filter(Boolean).pop();

  if (!code) {
    return new Response("Link não encontrado", { status: 404 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Busca o link na tabela short_links
    const response = await fetch(
      `${supabaseUrl}/rest/v1/short_links?code=eq.${code}&select=long_url`,
      {
        headers: {
          "Authorization": `Bearer ${serviceRole}`,
          "apikey": serviceRole,
        },
      }
    );
    
    const data = await response.json() as Array<{ long_url: string }>;
    
    if (!data || data.length === 0 || !data[0]?.long_url) {
      return new Response("Link não encontrado ou expirado", { status: 404 });
    }

    // Incrementa cliques de forma assíncrona (non-blocking)
    fetch(
      `${supabaseUrl}/rest/v1/rpc/increment_short_link_clicks`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceRole}`,
          "apikey": serviceRole,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_code: code }),
      }
    ).catch(() => {});

    // Redireciona
    return new Response(null, {
      status: 301,
      headers: { 
        "Location": data[0].long_url,
        "Cache-Control": "no-cache"
      },
    });
  } catch (e) {
    console.error("Erro:", e);
    return new Response("Erro interno", { status: 500 });
  }
});