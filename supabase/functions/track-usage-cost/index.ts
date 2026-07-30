import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://nxlfezpagporealqqbfj.supabase.co'
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: corsHeaders })
}

// service_role (chamada interna) OU JWT valido. Usuario comum so pode
// registrar custo para si mesmo; admin pode registrar para qualquer um.
async function authorize(req: Request): Promise<{ ok: boolean; userId: string | null; isAdmin: boolean }> {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return { ok: false, userId: null, isAdmin: false }

  const token = auth.slice(7).trim()
  if (!token) return { ok: false, userId: null, isAdmin: false }
  if (token === supabaseServiceKey) return { ok: true, userId: null, isAdmin: true }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { ok: false, userId: null, isAdmin: false }

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).maybeSingle()

  return { ok: true, userId: user.id, isAdmin: profile?.is_admin === true }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const { ok, userId: callerId, isAdmin } = await authorize(req)
  if (!ok) return json({ error: 'unauthorized' }, 401)

  try {
    const { userId, service, cost, quantity = 1, unit, details } = await req.json()

    if (!userId || !service || cost === undefined) {
      return json({ error: 'Missing required fields' }, 400)
    }

    // Impede que um usuario comum registre custo na conta de outro.
    if (!isAdmin && callerId && userId !== callerId) {
      return json({ error: 'forbidden' }, 403)
    }

    const numericCost = Number(cost)
    if (!Number.isFinite(numericCost) || numericCost < 0) {
      return json({ error: 'invalid cost' }, 400)
    }

    const { data, error } = await supabase.from('usage_costs').insert({
      user_id: userId,
      service,
      cost: numericCost,
      quantity,
      unit,
      details: details || {},
    }).select().single()

    if (error) return json({ error: error.message }, 500)

    return json({ success: true, data })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown error' }, 500)
  }
})
