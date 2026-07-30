import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WA_ENGINE_URL = Deno.env.get('WA_ENGINE_URL') ?? 'http://wa-engine:8080';
const WA_TOKEN      = Deno.env.get('WA_ENGINE_TOKEN') ?? '';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

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

async function sendWhatsApp(toPhone: string, message: string): Promise<boolean> {
  if (!WA_TOKEN) return false;
  const session = await getAdminSession();
  if (!session) return false;
  try {
    const r = await fetch(`${WA_ENGINE_URL}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${WA_TOKEN}` },
      body: JSON.stringify({ sessionId: session.sessionId, phoneNumber: normalizePhone(toPhone), message }),
    });
    return r.ok;
  } catch { return false; }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const offerId = body.offer_id as string | undefined;
  const action = body.action as string | undefined; // 'approve' | 'reject'
  const editedMessage = body.message as string | undefined;

  if (!offerId || !action) {
    return json({ ok: false, error: 'offer_id e action são obrigatórios' }, 400);
  }

  const { data: offer, error: offerErr } = await sb.from('revops_offers').select('*').eq('id', offerId).single();
  if (offerErr || !offer) return json({ ok: false, error: 'Oferta não encontrada' }, 404);

  // 'pending' = fluxo normal de aprovação. 'error' = permite reenviar (retry) sem precisar recriar a oferta.
  if (!['pending', 'error'].includes(offer.status)) {
    return json({ ok: false, error: `Oferta já está com status '${offer.status}', não pode ser reenviada` }, 409);
  }

  if (action === 'reject') {
    await sb.from('revops_offers').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', offerId);
    return json({ ok: true, status: 'rejected' });
  }

  if (action !== 'approve') return json({ ok: false, error: 'action inválida (use approve ou reject)' }, 400);

  const { data: profile } = await sb.from('profiles').select('phone,email,full_name').eq('id', offer.user_id).single();
  const finalMessage = editedMessage?.trim() || offer.message;

  if (!profile?.phone) {
    await sb.from('revops_offers').update({ status: 'error', reviewed_at: new Date().toISOString() }).eq('id', offerId);
    return json({ ok: false, error: 'Usuário não tem telefone cadastrado' }, 422);
  }

  const adminSession = await getAdminSession();
  if (!adminSession) {
    await sb.from('revops_offers').update({ status: 'error', reviewed_at: new Date().toISOString() }).eq('id', offerId);
    return json({ ok: false, error: 'Nenhuma instância de WhatsApp administrativa conectada. Conecte em Conexões Admin.' }, 422);
  }

  const sent = await sendWhatsApp(profile.phone, finalMessage);

  await sb.from('revops_offers').update({
    status: sent ? 'sent' : 'error',
    reviewed_at: new Date().toISOString(),
    sent_at: sent ? new Date().toISOString() : null,
    channel: 'whatsapp',
    message: finalMessage,
  }).eq('id', offerId);

  if (sent) {
    await sb.rpc('log_revops_event', {
      p_user_id: offer.user_id,
      p_event_type: 'automation_sent',
      p_payload: { offer_type: offer.offer_type, channel: 'whatsapp', approved_by: 'admin' },
      p_source: 'edge_function',
    });
  }

  return json({ ok: sent, status: sent ? 'sent' : 'error' });
});
