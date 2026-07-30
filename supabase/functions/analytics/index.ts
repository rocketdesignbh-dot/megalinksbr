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

    // Cliques hoje
    const clicksResp = await fetch(
      `${supabaseUrl}/rest/v1/rpc/count_clicks_today`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRole}`,
          'apikey': serviceRole,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: userId }),
      }
    );

    // Posts enviados hoje
    const postsResp = await fetch(
      `${supabaseUrl}/rest/v1/rpc/posts_sent_today`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRole}`,
          'apikey': serviceRole,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: userId }),
      }
    );

    // Posts por grupo
    const postsGroupResp = await fetch(
      `${supabaseUrl}/rest/v1/rpc/posts_by_group_today`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRole}`,
          'apikey': serviceRole,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: userId }),
      }
    );

    // Histórico de cliques
    const historyResp = await fetch(
      `${supabaseUrl}/rest/v1/rpc/clicks_by_day_14d`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRole}`,
          'apikey': serviceRole,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: userId }),
      }
    );

    const clicksToday = await clicksResp.json();
    const postsToday = await postsResp.json();
    const postsGroup = await postsGroupResp.json();
    const history = await historyResp.json();

    return new Response(
      JSON.stringify({
        clicks_today: clicksToday,
        posts_today: postsToday,
        posts_by_group: postsGroup,
        clicks_history: history,
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
