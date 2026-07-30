import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ASAAS_API_KEY  = Deno.env.get('ASAAS_API_KEY')!;
// Produção por padrão. Defina ASAAS_ENV=sandbox nas secrets do projeto para voltar a testar em sandbox.
const ASAAS_ENV      = (Deno.env.get('ASAAS_ENV') || 'production').toLowerCase();
const ASAAS_BASE_URL = ASAAS_ENV === 'sandbox' ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLAN_PRICES: Record<string, { label: string; value: number }> = {
  starter: { label: 'Mega Links BR — Starter', value: 57.90 },
  pro:     { label: 'Mega Links BR — Pro',     value: 97.90 },
  elite:   { label: 'Mega Links BR — Elite',   value: 157.90 },
  premium: { label: 'Mega Links BR — Premium', value: 297.90 },
};

function asaas(path: string, init: RequestInit = {}) {
  return fetch(`${ASAAS_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY, ...((init.headers as Record<string, string>) || {}) },
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: { user }, error: userErr } = await sb.auth.getUser(jwt);
  if (userErr || !user) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const { plan, billing_type = 'PIX', cpf_cnpj, recurring = false } = body;

  if (!plan || !PLAN_PRICES[plan]) return json({ error: 'plano inválido' }, 400);
  if (!cpf_cnpj) return json({ error: 'CPF ou CNPJ obrigatório' }, 400);
  const cpfClean = cpf_cnpj.replace(/\D/g, '');
  if (cpfClean.length !== 11 && cpfClean.length !== 14) return json({ error: 'CPF ou CNPJ inválido' }, 400);

  const normalizedBillingType = String(billing_type).toUpperCase();
  if (!['PIX', 'CREDIT_CARD', 'BOLETO'].includes(normalizedBillingType)) {
    return json({ error: 'forma de pagamento inválida' }, 400);
  }
  if (recurring && normalizedBillingType !== 'PIX') {
    return json({ error: 'recorrência disponível apenas via Pix por enquanto' }, 400);
  }

  const planInfo = PLAN_PRICES[plan];
  const { data: profile } = await sb.from('profiles').select('id, full_name, email, asaas_customer_id, cpf_cnpj').eq('id', user.id).single();
  if (!profile) return json({ error: 'perfil não encontrado' }, 404);

  if (!profile.cpf_cnpj) await sb.from('profiles').update({ cpf_cnpj: cpfClean }).eq('id', user.id);

  let customerId = profile.asaas_customer_id;
  if (!customerId) {
    const rCust = await asaas('/customers', { method: 'POST', body: JSON.stringify({ name: profile.full_name || profile.email, email: profile.email, cpfCnpj: cpfClean, externalReference: profile.id, notificationDisabled: false }) });
    const cust = await rCust.json();
    if (!cust.id) return json({ error: 'erro ao criar cliente', detail: cust }, 500);
    customerId = cust.id;
    await sb.from('profiles').update({ asaas_customer_id: customerId }).eq('id', user.id);
  } else {
    await asaas(`/customers/${customerId}`, { method: 'PUT', body: JSON.stringify({ cpfCnpj: cpfClean }) });
  }

  const due = new Date(); due.setDate(due.getDate() + 1);
  const dueDate = due.toISOString().split('T')[0];

  // ── Pix recorrente: cria uma assinatura no Asaas (cobrança automática mensal) ──
  if (recurring) {
    const rSub = await asaas('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: planInfo.value,
        nextDueDate: dueDate,
        cycle: 'MONTHLY',
        description: planInfo.label + ' (recorrente)',
        externalReference: user.id,
      }),
    });
    const sub = await rSub.json();
    if (!sub.id) return json({ error: 'erro ao criar assinatura', detail: sub }, 500);

    // busca a primeira cobrança gerada pela assinatura para devolver o QR code do Pix
    let firstPayment: any = null;
    for (let i = 0; i < 3 && !firstPayment; i++) {
      const rList = await asaas(`/payments?subscription=${sub.id}&limit=1&order=asc`);
      const list = await rList.json();
      if (list?.data?.[0]) firstPayment = list.data[0];
      else await new Promise((r) => setTimeout(r, 700));
    }
    if (!firstPayment) return json({ ok: true, subscription_id: sub.id, note: 'assinatura criada, primeira cobrança ainda processando' });

    let pixCopyPaste = null, pixQrCodeImage = null;
    try { const rPix = await asaas(`/payments/${firstPayment.id}/pixQrCode`); const pix = await rPix.json(); pixCopyPaste = pix.payload || null; pixQrCodeImage = pix.encodedImage || null; } catch (_) {}

    return json({
      ok: true, recurring: true, subscription_id: sub.id, charge_id: firstPayment.id,
      invoice_url: firstPayment.invoiceUrl, pix_copy_paste: pixCopyPaste, pix_qr_code_image: pixQrCodeImage,
      due_date: firstPayment.dueDate, value: planInfo.value, plan,
    });
  }

  // ── Cobrança avulsa (Pix, Cartão de Crédito ou Boleto) ──
  const rCharge = await asaas('/payments', { method: 'POST', body: JSON.stringify({ customer: customerId, billingType: normalizedBillingType, value: planInfo.value, dueDate, description: planInfo.label, externalReference: user.id }) });
  const charge = await rCharge.json();
  if (!charge.id) return json({ error: 'erro ao criar cobrança', detail: charge }, 500);

  let pixCopyPaste = null, pixQrCodeImage = null;
  if (normalizedBillingType === 'PIX' && charge.id) {
    try { const rPix = await asaas(`/payments/${charge.id}/pixQrCode`); const pix = await rPix.json(); pixCopyPaste = pix.payload || null; pixQrCodeImage = pix.encodedImage || null; } catch (_) {}
  }

  return json({ ok: true, charge_id: charge.id, invoice_url: charge.invoiceUrl, pix_copy_paste: pixCopyPaste, pix_qr_code_image: pixQrCodeImage, due_date: dueDate, value: planInfo.value, plan });
});
