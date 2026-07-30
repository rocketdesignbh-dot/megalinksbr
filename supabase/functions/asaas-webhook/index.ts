const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') || '';

function ok(body: unknown = { received: true }) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });
}

async function dbPost(path: string, body: unknown, prefer = 'return=minimal') {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, Prefer: prefer },
    body: JSON.stringify(body),
  });
}
async function dbGet(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  return r.json().catch(() => []);
}
async function dbPatch(path: string, body: unknown) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
}

async function sendEmail(type: string, to: string, data: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ type, to, ...data }),
    });
  } catch (_) { /* ignora falha de email */ }
}

function mapStatus(event: string): string {
  switch (event) {
    case 'PAYMENT_CONFIRMED': return 'confirmed';
    case 'PAYMENT_RECEIVED':  return 'paid';
    case 'PAYMENT_OVERDUE':   return 'overdue';
    case 'PAYMENT_REFUNDED':  return 'refunded';
    case 'PAYMENT_DELETED':   return 'deleted';
    default: return 'pending';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return err('method not allowed', 405);

  if (ASAAS_WEBHOOK_TOKEN) {
    const token = req.headers.get('asaas-access-token') || '';
    if (token !== ASAAS_WEBHOOK_TOKEN) return err('invalid token', 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return err('invalid json', 400); }

  const eventId: string = body?.id || '';
  const eventType: string = body?.event || 'UNKNOWN';
  const payment = body?.payment;

  // Idempotência
  if (eventId) {
    try {
      await dbPost('webhook_events?on_conflict=id', { id: eventId, source: 'asaas', event_type: eventType, payload: body }, 'resolution=ignore-duplicates,return=minimal');
    } catch (_) {}
  }

  if (!payment) return ok({ received: true, note: 'sem payment' });

  // Resolve user
  let userId: string | null = payment.externalReference || null;
  let userEmail: string | null = null;
  let userName: string | null = null;
  let userPlan: string | null = null;

  if (!userId && payment.customer) {
    const rows = await dbGet(`profiles?asaas_customer_id=eq.${encodeURIComponent(payment.customer)}&select=id,email,full_name,plan`);
    if (Array.isArray(rows) && rows.length > 0) { userId = rows[0].id; userEmail = rows[0].email; userName = rows[0].full_name; userPlan = rows[0].plan; }
  }

  if (userId && (!userEmail || !userPlan)) {
    const rows = await dbGet(`profiles?id=eq.${encodeURIComponent(userId)}&select=email,full_name,plan`);
    if (Array.isArray(rows) && rows.length > 0) { userEmail = rows[0].email; userName = rows[0].full_name; userPlan = rows[0].plan; }
  }

  const status = mapStatus(eventType);
  const paidAt = payment.paymentDate || payment.confirmedDate || payment.clientPaymentDate || null;

  const paymentRow: Record<string, unknown> = {
    gateway: 'asaas', gateway_payment_id: payment.id, gateway_customer_id: payment.customer || null,
    gateway_subscription_id: payment.subscription || null, billing_type: payment.billingType || null,
    invoice_url: payment.invoiceUrl || null, due_date: payment.dueDate || null,
    amount: payment.value ?? 0, method: payment.billingType || null, status,
  };
  if (userId) paymentRow.user_id = userId;
  if (paidAt) paymentRow.paid_at = paidAt;

  await dbPost('payments?on_conflict=gateway_payment_id', paymentRow, 'resolution=merge-duplicates,return=minimal');

  // Atualiza sub_status e dispara e-mail
  if (userId) {
    if (eventType === 'PAYMENT_RECEIVED' || eventType === 'PAYMENT_CONFIRMED') {
      await dbPatch(`profiles?id=eq.${encodeURIComponent(userId)}`, { sub_status: 'active', overdue_since: null });
      // E-mail de confirmação de pagamento
      if (userEmail) {
        await sendEmail('pagamento_confirmado', userEmail, {
          nome: userName || 'afiliado',
          plano: userPlan || 'starter',
          valor: payment.value || 0,
        });
      }
    } else if (eventType === 'PAYMENT_OVERDUE') {
      await dbPatch(`profiles?id=eq.${encodeURIComponent(userId)}`, { sub_status: 'past_due', overdue_since: new Date().toISOString() });
      // E-mail de vencimento
      if (userEmail) {
        await sendEmail('vencimento', userEmail, { nome: userName || 'afiliado', plano: userPlan || 'starter', dias: 0 });
      }
    }
  }

  return ok({ received: true, event: eventType, status });
});
