import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_KEY    = Deno.env.get('OPENAI_API_KEY')!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EVENT_LABELS: Record<string,string> = {
  user_signed_up:'criou conta', user_logged_in:'fez login', trial_started:'iniciou trial',
  post_created:'criou post', post_sent:'post enviado', link_created:'criou link',
  whatsapp_connected:'conectou WhatsApp', payment_confirmed:'pagamento confirmado',
  plan_upgraded:'fez upgrade', plan_downgraded:'fez downgrade',
  subscription_cancelled:'cancelou assinatura', ticket_opened:'abriu ticket',
  kanban_moved:'movido no kanban', automation_sent:'recebeu automação',
  utm_captured:'origem registrada',
};

// Enfileira uma oferta pendente de aprovação do admin (não envia nada sozinho)
async function queueOffer(opts: {
  userId: string; offerType: string; discountPct?: number; freeMonth?: boolean;
  message: string; reasoning: string; buyProb: number;
}) {
  const { userId, offerType, discountPct, freeMonth, message, reasoning, buyProb } = opts;
  const { data: existing } = await sb.from('revops_offers')
    .select('id').eq('user_id', userId).eq('offer_type', offerType).eq('status', 'pending').maybeSingle();
  if (existing) return;

  await sb.from('revops_offers').insert({
    user_id: userId,
    offer_type: offerType,
    discount_pct: discountPct ?? null,
    free_month: freeMonth ?? false,
    message,
    reasoning,
    buy_prob: buyProb,
    status: 'pending',
  });
}

// Avalia se o usuário se qualifica para alguma oferta e enfileira se sim
async function evaluateOffers(
  profile: { id: string; full_name?: string; email: string; plan: string; sub_status: string; trial_expires_at?: string },
  buyProb: number,
): Promise<void> {
  const nome = profile.full_name || profile.email.split('@')[0];

  // 1) Trial nas últimas 24h (dia 6-7) + alta probabilidade de compra → oferta de 1º mês grátis
  if (profile.sub_status === 'trial' && profile.trial_expires_at) {
    const hoursLeft = (new Date(profile.trial_expires_at).getTime() - Date.now()) / 3600000;
    if (hoursLeft > 0 && hoursLeft <= 24 && buyProb >= 60) {
      await queueOffer({
        userId: profile.id,
        offerType: 'trial_upgrade',
        freeMonth: true,
        buyProb,
        reasoning: `Trial expira em ${Math.max(1, Math.round(hoursLeft))}h e IA estimou ${buyProb}% de chance de compra.`,
        message: `Olá ${nome}! 👋 Vimos que você está aproveitando bastante a Mega Links BR durante o teste.\n\nPra você continuar sem perder o ritmo, liberamos o *1º mês grátis* na assinatura. Quer que eu já ative pra você?`,
      });
    }
  }

  // 2) Usuário ativo, plano starter, alto engajamento → oferta de upgrade com desconto
  if (profile.sub_status === 'active' && profile.plan === 'starter' && buyProb >= 70) {
    await queueOffer({
      userId: profile.id,
      offerType: 'engaged_upgrade',
      discountPct: 20,
      buyProb,
      reasoning: `Usuário ativo no plano starter com ${buyProb}% de chance de compra (upgrade).`,
      message: `Olá ${nome}! 🚀 Notamos que você usa bastante a Mega Links BR. Preparamos *20% de desconto* pra você migrar pro plano Premium e destravar mais recursos. Posso aplicar o desconto?`,
    });
  }
}

async function analyzeUser(userId: string): Promise<void> {
  // Buscar perfil + eventos + score
  const [{ data: profile }, { data: events }, { data: scoreRow }] = await Promise.all([
    sb.from('profiles').select('email,full_name,plan,sub_status,trial_expires_at,created_at').eq('id', userId).single(),
    sb.from('revops_events').select('event_type,occurred_at,payload').eq('user_id', userId).order('occurred_at', { ascending: false }).limit(40),
    sb.from('revops_user_scores').select('score,event_count,last_event_at').eq('user_id', userId).maybeSingle(),
  ]);

  if (!profile) return;

  const score = scoreRow?.score ?? 0;
  const eventCount = scoreRow?.event_count ?? 0;
  const lastEventAt = scoreRow?.last_event_at;
  const daysSinceLastEvent = lastEventAt
    ? Math.floor((Date.now() - new Date(lastEventAt).getTime()) / 86400000)
    : 999;
  const daysSinceSignup = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000);

  const eventSummary = (events ?? []).slice(0, 20).map(e =>
    `- ${EVENT_LABELS[e.event_type] ?? e.event_type} (${new Date(e.occurred_at).toLocaleDateString('pt-BR')})`
  ).join('\n');

  const prompt = `Você é um especialista em Revenue Operations para SaaS. Analise o perfil abaixo e retorne APENAS um JSON válido, sem markdown.

Perfil:
- Nome: ${profile.full_name ?? 'não informado'}
- Plano: ${profile.plan}
- Status: ${profile.sub_status}
- Score comportamental: ${score} pts
- Total de eventos: ${eventCount}
- Dias desde cadastro: ${daysSinceSignup}
- Dias desde última ação: ${daysSinceLastEvent}
- Trial expira: ${profile.trial_expires_at ? new Date(profile.trial_expires_at).toLocaleDateString('pt-BR') : 'N/A'}

Últimos eventos:
${eventSummary || '- nenhum evento registrado'}

Retorne exatamente este JSON:
{
  "buy_prob": <0-100>,
  "churn_prob": <0-100>,
  "abandon_prob": <0-100>,
  "label": "<hot|warm|cold|at_risk|loyal>",
  "next_action": "<ação específica recomendada em 1 frase, em português>",
  "summary": "<análise em 2-3 frases em português>"
}`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) return;
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  let parsed: Record<string,unknown>;
  try { parsed = JSON.parse(content.trim()); }
  catch { return; }

  const buyProb = Number(parsed.buy_prob) || 0;

  await sb.from('revops_ia_insights').upsert({
    user_id:      userId,
    buy_prob:     buyProb,
    churn_prob:   Number(parsed.churn_prob)  || 0,
    abandon_prob: Number(parsed.abandon_prob)|| 0,
    label:        String(parsed.label        || 'neutral'),
    next_action:  String(parsed.next_action  || ''),
    summary:      String(parsed.summary      || ''),
    generated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  // Registrar evento na timeline
  await sb.rpc('log_revops_event', {
    p_user_id: userId,
    p_event_type: 'ia_insight_generated',
    p_payload: { label: parsed.label, buy_prob: parsed.buy_prob, churn_prob: parsed.churn_prob },
    p_source: 'edge_function',
  });

  // Avalia se esse usuário se qualifica para alguma oferta (fica pendente de aprovação do admin)
  await evaluateOffers(
    { id: userId, full_name: profile.full_name, email: profile.email, plan: profile.plan, sub_status: profile.sub_status, trial_expires_at: profile.trial_expires_at },
    buyProb,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

  // Modo single: analisar um usuário específico
  if (body.user_id) {
    await analyzeUser(body.user_id);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Modo batch: analisar todos (prioriza quem não tem insight ou tem insight antigo)
  // Enum subscription_status só possui: trial, active, past_due, canceled
  const { data: users, error: usersError } = await sb
    .from('profiles')
    .select('id')
    .not('sub_status', 'in', '("canceled")')
    .limit(body.limit ?? 50);

  if (usersError) {
    return new Response(JSON.stringify({ ok: false, error: usersError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let processed = 0;
  for (const u of users ?? []) {
    // Pular se insight foi gerado nas últimas 24h
    const { data: existing } = await sb
      .from('revops_ia_insights')
      .select('generated_at')
      .eq('user_id', u.id)
      .maybeSingle();
    if (existing) {
      const hours = (Date.now() - new Date(existing.generated_at).getTime()) / 3600000;
      if (hours < 24) continue;
    }
    await analyzeUser(u.id);
    processed++;
    // Pequeno delay para não estourar rate limit da OpenAI
    await new Promise(r => setTimeout(r, 300));
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
