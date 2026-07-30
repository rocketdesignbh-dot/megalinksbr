// revops-ai-rewrite — reescrita de mensagem via OpenAI.
// Antes: aberta ao publico (qualquer um queimava credito da OpenAI).
// Agora: exige service_role ou JWT de admin.
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://nxlfezpagporealqqbfj.supabase.co';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  if (token === SERVICE_KEY) return true;

  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return false;
  const user = await r.json().catch(() => null);
  if (!user?.id) return false;

  const p = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=is_admin`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!p.ok) return false;
  const rows = await p.json().catch(() => []);
  return Array.isArray(rows) && rows[0]?.is_admin === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: corsHeaders });

  if (!(await isAdmin(req))) return json({ ok: false, error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const text: string = body.text || '';
  const instruction: string = body.instruction || '';

  if (!text.trim()) return json({ ok: false, error: 'text obrigatorio' }, 400);

  // Limite de tamanho para conter custo por chamada.
  const safeText = String(text).slice(0, 4000);
  const safeInstruction = String(instruction).slice(0, 500);

  const prompt = `Voce e um copywriter especialista em mensagens de WhatsApp para retencao de clientes SaaS (Mega Links BR, plataforma de automacao para afiliados).

Mensagem atual:
"""
${safeText}
"""

Instrucao do usuario: "${safeInstruction || 'Melhore a mensagem, mantendo o tom e a intencao.'}"

Reescreva a mensagem seguindo a instrucao. Regras:
- Mantenha qualquer placeholder entre chaves exatamente como esta (ex: {nome}, {dias}) — nao traduza nem remova.
- Mantenha o formato curto, adequado a WhatsApp (pode usar *negrito*, emojis, quebras de linha \n).
- Responda APENAS com o texto final da mensagem, sem aspas, sem explicacoes, sem markdown de codigo.`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      temperature: 0.6,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errTxt = await resp.text().catch(() => '');
    return json({ ok: false, error: 'openai_error', detail: errTxt }, 502);
  }

  const data = await resp.json();
  const rewritten = (data.choices?.[0]?.message?.content ?? '').trim();

  return json({ ok: true, text: rewritten });
});
