import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET  = Deno.env.get('CRON_SECRET') || '';

const GRACE_DAYS  = 3;
const CANCEL_DAYS = 15;
const TRIAL_DAYS  = 7;

Deno.serve(async (req: Request) => {
  // CORRECAO: antes era `if (CRON_SECRET && ...)` — se a variavel ficasse vazia,
  // a funcao virava publica e podia cancelar/rebaixar assinaturas em massa.
  // Agora e fail-closed: sem CRON_SECRET configurado, ninguem entra.
  if (!CRON_SECRET) {
    return new Response('Server misconfigured: CRON_SECRET ausente', { status: 500 });
  }

  const auth = req.headers.get('authorization') || '';
  const cronHeader = req.headers.get('x-cron-secret') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  const authorized =
    cronHeader === CRON_SECRET ||
    token === CRON_SECRET ||
    token === SERVICE_KEY;

  if (!authorized) return new Response('Unauthorized', { status: 401 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();
  const results: string[] = [];

  // 1. Trial expirado → marca como expired (trava acesso)
  // Usuários VIP (is_vip = true) nunca são afetados pelas regras automáticas de assinatura.
  const { data: expiredTrials } = await sb
    .from('profiles')
    .select('id, email, full_name, trial_expires_at')
    .eq('sub_status', 'trial')
    .eq('is_vip', false)
    .lt('trial_expires_at', now.toISOString());

  for (const u of expiredTrials || []) {
    await sb.from('profiles').update({ sub_status: 'canceled' }).eq('id', u.id);
    await sb.from('plan_changes').insert({
      user_id: u.id, from_plan: 'starter', to_plan: 'starter',
      from_status: 'trial', to_status: 'canceled',
      reason: 'trial_expired', changed_by: null,
    });
    // E-mail de aviso
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ type: 'trial_expirado', to: u.email, nome: u.full_name, plano: 'starter' }),
      });
    } catch (_) {}
    results.push(`trial expirado: ${u.email}`);
  }

  // 2. past_due > CANCEL_DAYS → cancela e rebaixa (exceto VIP)
  const graceLimit = new Date(now.getTime() - GRACE_DAYS * 86400000).toISOString();
  const { data: overdueUsers } = await sb
    .from('profiles')
    .select('id, plan, sub_status, overdue_since, full_name, email')
    .eq('sub_status', 'past_due')
    .eq('is_vip', false)
    .not('plan', 'eq', 'starter')
    .lt('overdue_since', graceLimit);

  for (const u of overdueUsers || []) {
    const daysPastDue = Math.floor((now.getTime() - new Date(u.overdue_since).getTime()) / 86400000);
    const newStatus = daysPastDue >= CANCEL_DAYS ? 'canceled' : 'past_due';
    const newPlan   = daysPastDue >= CANCEL_DAYS ? 'starter'  : u.plan;
    await sb.from('profiles').update({ plan: newPlan, sub_status: newStatus }).eq('id', u.id);
    await sb.from('plan_changes').insert({
      user_id: u.id, from_plan: u.plan, to_plan: newPlan,
      from_status: 'past_due', to_status: newStatus,
      reason: daysPastDue >= CANCEL_DAYS ? 'payment_overdue_cancel' : 'payment_overdue_grace',
      changed_by: null,
    });
    results.push(`${u.email}: ${u.plan}→${newPlan} (${newStatus}) após ${daysPastDue}d`);
  }

  // 3. sub_expires_at vencido e active → marca past_due (exceto VIP)
  const { data: expiredUsers } = await sb
    .from('profiles')
    .select('id, plan, sub_status, sub_expires_at, email')
    .eq('sub_status', 'active')
    .eq('is_vip', false)
    .not('plan', 'eq', 'starter')
    .not('sub_expires_at', 'is', null)
    .lt('sub_expires_at', now.toISOString());

  for (const u of expiredUsers || []) {
    await sb.from('profiles').update({ sub_status: 'past_due', overdue_since: now.toISOString() }).eq('id', u.id);
    results.push(`${u.email}: marcado past_due`);
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
