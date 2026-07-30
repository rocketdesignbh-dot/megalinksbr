import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/send-email`;
const WA_ENGINE_URL  = Deno.env.get('WA_ENGINE_URL') ?? 'http://wa-engine:8080';
const WA_TOKEN       = Deno.env.get('WA_ENGINE_TOKEN') ?? '';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Textos padrão (fallback caso a coluna message_template esteja vazia)
const DEFAULT_TEMPLATES: Record<string, string> = {
  trial_expiring_3d: '⏳ *Mega Links BR* — Seu trial expira em {dias} dia(s)!\n\nNão perca o acesso à automação. Assine agora:\n👉 https://megalinksbr.com.br/#assinatura',
  trial_expired_d1:  '⏰ *Mega Links BR* — Seu período gratuito encerrou!\n\nEscolha um plano e continue automatizando suas vendas:\n👉 https://megalinksbr.com.br/#assinatura',
  trial_expired_d3:  '🔥 *Mega Links BR* — Ainda dá tempo de assinar!\n\nSeu trial expirou há 3 dias. Planos a partir de R$ 57,90/mês:\n👉 https://megalinksbr.com.br/#assinatura',
  reengagement_7d:   '👋 *Mega Links BR* — Sentimos sua falta!\n\nFaz 7 dias que você não acessa. Suas vendas podem estar esperando por você:\n👉 https://megalinksbr.com.br',
  reengagement_14d:  '💬 *Mega Links BR* — Ainda estamos aqui!\n\nFaz 14 dias sem acesso. Volte e deixe a automação trabalhar por você:\n👉 https://megalinksbr.com.br',
};

const configCache: Record<string, { enabled: boolean; message_template: string | null }> = {};

async function getConfig(automation: string): Promise<{ enabled: boolean; message_template: string | null }> {
  if (configCache[automation]) return configCache[automation];
  const { data } = await sb.from('revops_automation_config')
    .select('enabled, message_template').eq('automation', automation).maybeSingle();
  const cfg = { enabled: data?.enabled !== false, message_template: data?.message_template ?? null };
  configCache[automation] = cfg;
  return cfg;
}

function renderMessage(automation: string, template: string | null, vars: Record<string, string>): string {
  let msg = template && template.trim() ? template : DEFAULT_TEMPLATES[automation];
  for (const [k, v] of Object.entries(vars)) {
    msg = msg.split(`{${k}}`).join(v);
  }
  return msg;
}

// ── Normaliza telefone para formato WhatsApp brasileiro
function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '');
  if (!n.startsWith('55')) n = '55' + n;
  if (n.length === 12) n = n.slice(0,4) + '9' + n.slice(4);
  return n;
}

// ── Busca a instância admin dedicada (conectada via aba Conexões Admin no RevOps)
async function getAdminSession(): Promise<{ sessionId: string; phone: string } | null> {
  const { data } = await sb
    .from('revops_admin_whatsapp')
    .select('session_id, phone')
    .eq('status', 'connected')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { sessionId: data.session_id, phone: data.phone };
}

// ── Envia email via send-email Edge Function
// A send-email agora exige autenticação (era pública). Enviamos o service_role
// nesta chamada interna — única alteração feita neste arquivo.
async function sendEmail(type: string, to: string, data: Record<string,unknown>): Promise<boolean> {
  try {
    const r = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ type, to, ...data }),
    });
    return r.ok;
  } catch { return false; }
}

// ── Envia WhatsApp direto via wa-engine (fallback)
async function sendWhatsApp(toPhone: string, message: string): Promise<boolean> {
  if (!WA_TOKEN) return false;
  const session = await getAdminSession();
  if (!session) return false;
  try {
    const r = await fetch(`${WA_ENGINE_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WA_TOKEN}`,
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        phoneNumber: normalizePhone(toPhone),
        message,
      }),
    });
    return r.ok;
  } catch { return false; }
}

// ── Entrega com fallback: email primeiro, WhatsApp se falhar. Retorna também a mensagem efetivamente usada.
async function deliver(
  u: { id: string; email: string; full_name?: string; phone?: string },
  emailType: string,
  emailData: Record<string,unknown>,
  waMessage: string,
): Promise<{ channel: string; ok: boolean; message: string }> {
  const emailOk = await sendEmail(emailType, u.email, emailData);
  if (emailOk) return { channel: 'email', ok: true, message: waMessage };

  if (u.phone) {
    const waOk = await sendWhatsApp(u.phone, waMessage);
    return { channel: 'whatsapp', ok: waOk, message: waMessage };
  }
  return { channel: 'none', ok: false, message: waMessage };
}

async function alreadySent(user_id: string, automation: string): Promise<boolean> {
  const { data } = await sb.from('revops_automation_log')
    .select('id')
    .eq('user_id', user_id)
    .eq('automation', automation)
    .eq('sent_date', new Date().toISOString().slice(0,10))
    .maybeSingle();
  return !!data;
}

async function logSent(user_id: string, automation: string, status: string, detail: Record<string, unknown> = {}) {
  await sb.from('revops_automation_log').insert({
    user_id, automation, status, detail,
    sent_date: new Date().toISOString().slice(0,10),
  });
  await sb.rpc('log_revops_event', {
    p_user_id: user_id,
    p_event_type: 'automation_sent',
    p_payload: { automation, status, ...detail },
    p_source: 'edge_function',
  });
}

Deno.serve(async (req: Request) => {
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const runOnly: string | null = body.automation || null;
  const results: Record<string, number> = {};

  if (!runOnly || runOnly === 'trial_expiring_3d') {
    const cfg = await getConfig('trial_expiring_3d');
    if (cfg.enabled) {
      const { data: users } = await sb.from('profiles')
        .select('id, email, full_name, phone, trial_expires_at')
        .gte('trial_expires_at', new Date().toISOString())
        .lte('trial_expires_at', new Date(Date.now() + 3*86400000).toISOString())
        .in('sub_status', ['trial']);
      let sent = 0;
      for (const u of users ?? []) {
        if (await alreadySent(u.id, 'trial_expiring_3d')) continue;
        const days = Math.ceil((new Date(u.trial_expires_at).getTime() - Date.now()) / 86400000);
        const nome = u.full_name || u.email.split('@')[0];
        const { channel, ok, message } = await deliver(
          u,
          'trial_expirando',
          { nome, dias: String(days) },
          renderMessage('trial_expiring_3d', cfg.message_template, { nome, dias: String(days) }),
        );
        await logSent(u.id, 'trial_expiring_3d', ok ? 'sent' : 'error', { days, channel, message });
        if (ok) sent++;
      }
      results['trial_expiring_3d'] = sent;
    }
  }

  if (!runOnly || runOnly === 'trial_expired_d1') {
    const cfg = await getConfig('trial_expired_d1');
    if (cfg.enabled) {
      const { data: users } = await sb.from('profiles')
        .select('id, email, full_name, phone')
        .lt('trial_expires_at', new Date().toISOString())
        .gt('trial_expires_at', new Date(Date.now() - 2*86400000).toISOString())
        .not('sub_status', 'in', '("active","paid")');
      let sent = 0;
      for (const u of users ?? []) {
        if (await alreadySent(u.id, 'trial_expired_d1')) continue;
        const nome = u.full_name || u.email.split('@')[0];
        const { channel, ok, message } = await deliver(
          u,
          'trial_expirado',
          { nome },
          renderMessage('trial_expired_d1', cfg.message_template, { nome }),
        );
        await logSent(u.id, 'trial_expired_d1', ok ? 'sent' : 'error', { channel, message });
        if (ok) sent++;
      }
      results['trial_expired_d1'] = sent;
    }
  }

  if (!runOnly || runOnly === 'trial_expired_d3') {
    const cfg = await getConfig('trial_expired_d3');
    if (cfg.enabled) {
      const { data: users } = await sb.from('profiles')
        .select('id, email, full_name, phone')
        .lt('trial_expires_at', new Date(Date.now() - 2*86400000).toISOString())
        .gt('trial_expires_at', new Date(Date.now() - 4*86400000).toISOString())
        .not('sub_status', 'in', '("active","paid")');
      let sent = 0;
      for (const u of users ?? []) {
        if (await alreadySent(u.id, 'trial_expired_d3')) continue;
        const nome = u.full_name || u.email.split('@')[0];
        const { channel, ok, message } = await deliver(
          u,
          'trial_expirado',
          { nome },
          renderMessage('trial_expired_d3', cfg.message_template, { nome }),
        );
        await logSent(u.id, 'trial_expired_d3', ok ? 'sent' : 'error', { channel, message });
        if (ok) sent++;
      }
      results['trial_expired_d3'] = sent;
    }
  }

  if (!runOnly || runOnly === 'reengagement_7d') {
    const cfg = await getConfig('reengagement_7d');
    if (cfg.enabled) {
      const { data: inactive } = await sb.rpc('revops_inactive_users', { p_days: 7 });
      let sent = 0;
      for (const u of inactive ?? []) {
        if (await alreadySent(u.id, 'reengagement_7d')) continue;
        const { data: prof } = await sb.from('profiles').select('phone').eq('id', u.id).maybeSingle();
        const nome = u.full_name || u.email.split('@')[0];
        const { channel, ok, message } = await deliver(
          { ...u, phone: prof?.phone },
          'reengajamento',
          { nome, dias: '7' },
          renderMessage('reengagement_7d', cfg.message_template, { nome, dias: '7' }),
        );
        await logSent(u.id, 'reengagement_7d', ok ? 'sent' : 'error', { channel, message });
        if (ok) sent++;
      }
      results['reengagement_7d'] = sent;
    }
  }

  if (!runOnly || runOnly === 'reengagement_14d') {
    const cfg = await getConfig('reengagement_14d');
    if (cfg.enabled) {
      const { data: inactive } = await sb.rpc('revops_inactive_users', { p_days: 14 });
      let sent = 0;
      for (const u of inactive ?? []) {
        if (await alreadySent(u.id, 'reengagement_14d')) continue;
        const { data: prof } = await sb.from('profiles').select('phone').eq('id', u.id).maybeSingle();
        const nome = u.full_name || u.email.split('@')[0];
        const { channel, ok, message } = await deliver(
          { ...u, phone: prof?.phone },
          'reengajamento',
          { nome, dias: '14' },
          renderMessage('reengagement_14d', cfg.message_template, { nome, dias: '14' }),
        );
        await logSent(u.id, 'reengagement_14d', ok ? 'sent' : 'error', { channel, message });
        if (ok) sent++;
      }
      results['reengagement_14d'] = sent;
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
