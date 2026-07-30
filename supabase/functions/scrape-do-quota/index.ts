Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub;

    // Verificar se tem personal token do Scrape.do
    const userResp = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=scrape_do_token`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRole}`,
          'apikey': serviceRole,
        },
      }
    );

    const userData = await userResp.json();
    const hasPersonalToken = userData?.[0]?.scrape_do_token ? true : false;

    // Verificar créditos usados no mês
    const creditsResp = await fetch(
      `${supabaseUrl}/rest/v1/rpc/scrape_do_credits_used_month`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRole}`,
          'apikey': serviceRole,
          'Content-Type': 'application/json',
        },
      }
    );

    const creditsUsed = await creditsResp.json();
    const creditsRemaining = Math.max(0, 1000 - creditsUsed);
    const quotaExhausted = creditsRemaining <= 0;

    return new Response(
      JSON.stringify({
        credits_used: creditsUsed,
        credits_remaining: creditsRemaining,
        quota_exhausted: quotaExhausted,
        has_personal_token: hasPersonalToken,
        quota_limit: 1000,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
