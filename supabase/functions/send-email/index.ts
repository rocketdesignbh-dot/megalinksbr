import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!;
const CRON_SECRET  = Deno.env.get('CRON_SECRET') ?? '';

const FROM = 'Mega Links BR <noreply@megalinksbr.com.br>';
const LOGO = 'https://megalinksbr.com.br/icon.png';
const BRAND = '#FFD33F';
const SITE  = 'https://megalinksbr.com.br';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Autorizacao (fail-closed) ────────────────────────────────────────────
// Aceita: service_role, x-cron-secret valido, ou JWT de admin.
// Sem isso, qualquer pessoa podia disparar e-mail em nome do dominio.
async function isAuthorized(req: Request): Promise<boolean> {
  const cronHeader = req.headers.get('x-cron-secret') ?? '';
  if (CRON_SECRET && cronHeader === CRON_SECRET) return true;

  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  if (token === SERVICE_KEY) return true;
  if (CRON_SECRET && token === CRON_SECRET) return true;

  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return false;
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return profile?.is_admin === true;
}

// ── Anti-phishing: o link do template reset_senha vem do corpo da requisicao.
// So aceitamos destinos dentro dos nossos proprios dominios.
const ALLOWED_LINK_HOSTS = [
  'megalinksbr.com.br',
  'www.megalinksbr.com.br',
  'nxlfezpagporealqqbfj.supabase.co',
];

function safeLink(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return SITE;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:') return SITE;
    if (!ALLOWED_LINK_HOSTS.includes(u.hostname.toLowerCase())) return SITE;
    return u.toString();
  } catch {
    return SITE;
  }
}

// Escapa texto vindo do corpo antes de interpolar no HTML.
function esc(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function base(content: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0c0c0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
<tr><td style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;border-bottom:3px solid ${BRAND}">
  <img src="${LOGO}" width="56" height="56" alt="Logo" style="border-radius:50%;margin:0 auto 12px;display:block">
  <div style="color:${BRAND};font-size:21px;font-weight:800;letter-spacing:-.02em">Mega Links BR</div>
  <div style="color:#888;font-size:12px;margin-top:2px">Plataforma de Automação para Afiliados</div>
</td></tr>
<tr><td style="background:#111118;padding:36px 40px;color:#e0e0e0;font-size:15px;line-height:1.7">${content}</td></tr>
<tr><td style="background:#0c0c0e;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #222">
  <div style="color:#555;font-size:12px">© 2026 Mega Links BR · <a href="${SITE}" style="color:${BRAND};text-decoration:none">megalinksbr.com.br</a></div>
</td></tr>
</table></td></tr></table></body></html>`;
}

function btn(text: string, url: string) {
  return `<div style="text-align:center;margin:28px 0"><a href="${url}" style="background:${BRAND};color:#0c0c0e;font-weight:800;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;display:inline-block">${text}</a></div>`;
}

function badge(plan: string) {
  const c: Record<string,string> = { starter:'#10B981',pro:'#3B82F6',elite:'#8B5CF6',premium:'#F59E0B' };
  const p = esc(plan);
  return `<span style="background:${c[String(plan||'').toLowerCase()]||BRAND};color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase">${p}</span>`;
}

const templates: Record<string, (d: any) => { subject: string; html: string }> = {
  reset_senha: d => ({
    subject: '🔐 Redefinição de senha — Mega Links BR',
    html: base(`<h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 16px">🔐 Redefinição de senha</h2>
      <p>Olá, <strong style="color:#fff">${esc(d.nome)||'afiliado'}</strong>!</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Este link expira em <strong style="color:#fff">1 hora</strong>.</p>
      ${btn('🔑 Redefinir minha senha', safeLink(d.link))}
      <p style="color:#888;font-size:13px">Se não solicitou, ignore este e-mail.</p>`),
  }),
  boas_vindas: d => ({
    subject: '🎉 Bem-vindo à Mega Links BR!',
    html: base(`<h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 16px">🎉 Bem-vindo!</h2>
      <p>Olá, <strong style="color:#fff">${esc(d.nome)||'afiliado'}</strong>!</p>
      <p>Sua conta foi criada! Você tem <strong style="color:${BRAND}">7 dias gratuitos</strong> para explorar a plataforma no plano ${badge('starter')}.</p>
      <div style="background:#1a1a2e;border-radius:12px;padding:20px 24px;margin:20px 0">
        <div style="color:${BRAND};font-weight:700;margin-bottom:12px">🚀 Próximos passos:</div>
        <div style="display:grid;gap:8px">
          <div>📱 <strong style="color:#fff">Parear WhatsApp</strong> — conecte via QR Code</div>
          <div>📦 <strong style="color:#fff">Criar Grupo de Oferta</strong> — organize grupos e canais</div>
          <div>🔗 <strong style="color:#fff">Configurar Shopee</strong> — conecte sua conta de afiliado</div>
          <div>⚡ <strong style="color:#fff">Primeiro Post</strong> — dispare sua primeira oferta</div>
        </div>
      </div>
      ${btn('⚡ Acessar plataforma', SITE)}`),
  }),
  pagamento_confirmado: d => ({
    subject: '✅ Pagamento confirmado — Mega Links BR',
    html: base(`<h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 16px">✅ Pagamento confirmado!</h2>
      <p>Olá, <strong style="color:#fff">${esc(d.nome)||'afiliado'}</strong>!</p>
      <p>Seu pagamento foi confirmado e o plano ${badge(d.plano)} já está ativo.</p>
      <div style="background:#1a1a2e;border-radius:12px;padding:20px 24px;margin:20px 0">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="color:#888;padding:6px 0">Plano</td><td style="text-align:right">${badge(d.plano)}</td></tr>
          <tr><td style="color:#888;padding:6px 0;border-top:1px solid #222">Valor</td><td style="text-align:right;color:${BRAND};font-weight:800;font-size:18px;border-top:1px solid #222">R$ ${Number(d.valor||0).toFixed(2).replace('.',',')}</td></tr>
          <tr><td style="color:#888;padding:6px 0;border-top:1px solid #222">Status</td><td style="text-align:right;border-top:1px solid #222;color:#10B981;font-weight:700">✅ Pago</td></tr>
        </table>
      </div>
      ${btn('⚡ Acessar plataforma', SITE)}`),
  }),
  upgrade: d => ({
    subject: '🚀 Plano atualizado — Mega Links BR',
    html: base(`<h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 16px">🚀 Plano atualizado!</h2>
      <p>Olá, <strong style="color:#fff">${esc(d.nome)||'afiliado'}</strong>!</p>
      <div style="background:#1a1a2e;border-radius:12px;padding:20px 24px;margin:20px 0;text-align:center">
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap">
          <div>${badge(d.plano_antigo)}</div>
          <div style="color:${BRAND};font-size:24px;font-weight:800">→</div>
          <div>${badge(d.plano_novo)}</div>
        </div>
        <div style="color:#888;font-size:13px;margin-top:10px">Todos os recursos do novo plano já estão disponíveis.</div>
      </div>
      ${btn('⚡ Explorar novos recursos', SITE)}`),
  }),
  vencimento: d => ({
    subject: Number(d.dias) <= 3 ? '⚠️ Assinatura vencida — Mega Links BR' : '🔔 Lembrete de renovação — Mega Links BR',
    html: base(`<h2 style="color:${Number(d.dias)<=3?'#EF4444':'#FFB020'};font-size:20px;font-weight:700;margin:0 0 16px">${Number(d.dias)<=3?'⚠️ Assinatura vencida':'🔔 Renovação pendente'}</h2>
      <p>Olá, <strong style="color:#fff">${esc(d.nome)||'afiliado'}</strong>!</p>
      <p>${Number(d.dias)<=3?`Sua assinatura venceu há <strong style="color:#EF4444">${Number(d.dias)||0} dia(s)</strong>. Renove para não perder o acesso.`:'Sua assinatura vence em breve. Renove para manter a automação ativa.'}</p>
      ${Number(d.dias)<=3?`<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:14px;margin:16px 0;color:#EF4444;font-size:13px">⚠️ Após 15 dias o plano é rebaixado para Starter automaticamente.</div>`:''}
      ${btn('💳 Renovar assinatura', SITE+'/#assinatura')}`),
  }),
  trial_expirado: d => ({
    subject: '⏰ Seu período gratuito encerrou — Mega Links BR',
    html: base(`<h2 style="color:#FFB020;font-size:20px;font-weight:700;margin:0 0 16px">⏰ Seu trial de 7 dias encerrou</h2>
      <p>Olá, <strong style="color:#fff">${esc(d.nome)||'afiliado'}</strong>!</p>
      <p>Seu período gratuito de 7 dias na Mega Links BR chegou ao fim. Para continuar automatizando suas vendas, escolha um plano.</p>
      <div style="background:#1a1a2e;border-radius:12px;padding:20px 24px;margin:20px 0">
        <div style="color:${BRAND};font-weight:700;margin-bottom:12px">Planos a partir de <strong>R$ 57,90/mês</strong></div>
        <div style="display:grid;gap:8px;font-size:13px">
          <div>${badge('starter')} <strong style="color:#fff">R$ 57,90/mês</strong> — Shopee + Post Relâmpago</div>
          <div>${badge('pro')} <strong style="color:#fff">R$ 97,90/mês</strong> — Automação 24/7 + MegaIA</div>
          <div>${badge('elite')} <strong style="color:#fff">R$ 157,90/mês</strong> — Rastreamento + todos os marketplaces</div>
        </div>
      </div>
      ${btn('⚡ Escolher meu plano', SITE+'/#assinatura')}
      <p style="color:#888;font-size:13px;text-align:center">Dúvidas? Responda este e-mail.</p>`),
  }),
  trial_expirando: d => ({
    subject: `⚠️ Seu trial expira em ${Number(d.dias)||0} dia(s) — Mega Links BR`,
    html: base(`<h2 style="color:#FFB020;font-size:20px;font-weight:700;margin:0 0 16px">⏳ Seu trial expira em ${Number(d.dias)||0} dia(s)</h2>
      <p>Olá, <strong style="color:#fff">${esc(d.nome)||'afiliado'}</strong>!</p>
      <p>Seu período gratuito na Mega Links BR expira em <strong style="color:#FFB020">${Number(d.dias)||0} dia(s)</strong>. Não perca o acesso à automação!</p>
      <div style="background:#1a1a2e;border-radius:12px;padding:20px 24px;margin:20px 0">
        <div style="color:${BRAND};font-weight:700;margin-bottom:12px">🔥 Assine agora e continue crescendo:</div>
        <div style="display:grid;gap:8px;font-size:13px">
          <div>${badge('starter')} <strong style="color:#fff">R$ 57,90/mês</strong> — ideal para começar</div>
          <div>${badge('pro')} <strong style="color:#fff">R$ 97,90/mês</strong> — automação completa + IA</div>
          <div>${badge('elite')} <strong style="color:#fff">R$ 157,90/mês</strong> — rastreamento avançado</div>
        </div>
      </div>
      ${btn('⚡ Garantir meu plano agora', SITE+'/#assinatura')}`),
  }),
  reengajamento: d => ({
    subject: `👋 Sentimos sua falta, ${esc(d.nome)||'afiliado'}! — Mega Links BR`,
    html: base(`<h2 style="color:#6c9bf5;font-size:20px;font-weight:700;margin:0 0 16px">👋 Sentimos sua falta!</h2>
      <p>Olá, <strong style="color:#fff">${esc(d.nome)||'afiliado'}</strong>!</p>
      <p>Faz <strong style="color:#fff">${Number(d.dias)||0} dias</strong> que você não acessa a Mega Links BR. Enquanto isso, suas oportunidades de venda podem estar passando despercebidas!</p>
      <div style="background:#1a1a2e;border-radius:12px;padding:20px 24px;margin:20px 0">
        <div style="color:${BRAND};font-weight:700;margin-bottom:12px">💡 O que você pode estar perdendo:</div>
        <div style="display:grid;gap:8px;font-size:13px">
          <div>🔥 <strong style="color:#fff">Novas ofertas</strong> no radar esperando ser disparadas</div>
          <div>📈 <strong style="color:#fff">Comissões</strong> que seus grupos poderiam estar gerando</div>
          <div>⚡ <strong style="color:#fff">Automações</strong> prontas para trabalhar por você 24/7</div>
        </div>
      </div>
      ${btn('🚀 Voltar agora', SITE)}
      <p style="color:#888;font-size:13px;text-align:center">Precisa de ajuda? Basta responder este e-mail.</p>`),
  }),
  // Disparado pela check-group-stock. E o contrapeso da automacao de validade:
  // produtos saem do rodizio sozinhos e sem erro, entao o silencio precisa avisar.
  grupo_sem_oferta: d => ({
    subject: `⚠️ "${esc(d.grupo)||'Seu grupo'}" está ficando sem ofertas — Mega Links BR`,
    html: base(`<h2 style="color:#FFB020;font-size:20px;font-weight:700;margin:0 0 16px">⚠️ Seu grupo está ficando sem ofertas</h2>
      <p>Olá, <strong style="color:#fff">${esc(d.nome)||'afiliado'}</strong>!</p>
      <p>O grupo <strong style="color:#fff">${esc(d.grupo)||'—'}</strong> está com apenas <strong style="color:#FFB020">${Number(d.ativas)||0} oferta(s)</strong> entrando no rodízio do Post Automático.</p>
      ${d.detalhe?`<div style="background:#1a1a2e;border-radius:12px;padding:20px 24px;margin:20px 0">
        <div style="color:${BRAND};font-weight:700;margin-bottom:10px">Produtos que saíram do rodízio:</div>
        <div style="font-size:13px;color:#ccc">${esc(d.detalhe)}</div>
      </div>`:''}
      <p style="color:#888;font-size:13px">Eles continuam cadastrados — apenas não estão sendo postados. Cadastre novas ofertas ou revise as datas de validade para o grupo não ficar em silêncio.</p>
      ${btn('📦 Abrir meus grupos', SITE)}`),
  }),
};

async function sendEmail(to: string, subject: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  return r.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: CORS });

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response('invalid json', { status: 400, headers: CORS }); }

  const { type, to, ...data } = body;
  if (!type || !to) return new Response(JSON.stringify({ error: 'type e to obrigatorios' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });

  const tpl = templates[type];
  if (!tpl) return new Response(JSON.stringify({ error: `type '${type}' invalido` }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });

  const { subject, html } = tpl(data);
  const result = await sendEmail(to, subject, html);

  // O Resend responde com corpo de erro (sem 'id') em varios casos: dominio nao
  // verificado, destinatario recusado, chave sem permissao, rate limit. Ate a v8
  // esta funcao devolvia ok:true de qualquer jeito -- entao um envio que nunca
  // saiu era reportado como sucesso e ninguem ficava sabendo. Falha agora falha.
  if (!result?.id) {
    const motivo = result?.message ?? result?.error?.message ?? result?.name ?? 'Resend nao retornou id';
    console.error(`send-email FALHOU | type=${type} | to=${to} | resposta=${JSON.stringify(result)}`);
    return new Response(JSON.stringify({ ok: false, error: motivo, result }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  console.log(`send-email OK | type=${type} | to=${to} | id=${result.id}`);
  return new Response(JSON.stringify({ ok: true, id: result.id, result }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
});
