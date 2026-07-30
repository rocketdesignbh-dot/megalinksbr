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

// Autoriza apenas: (a) chamada interna com service_role, ou (b) JWT de um admin real.
async function authorize(req: Request): Promise<{ ok: boolean; adminId: string | null }> {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return { ok: false, adminId: null }

  const token = auth.slice(7).trim()
  if (!token) return { ok: false, adminId: null }

  if (token === supabaseServiceKey) return { ok: true, adminId: null }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { ok: false, adminId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) return { ok: false, adminId: null }
  return { ok: true, adminId: user.id }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const { ok, adminId: callerAdminId } = await authorize(req)
  if (!ok) return json({ error: 'unauthorized' }, 401)

  try {
    const { userId, action, adminId, notes } = await req.json()

    if (!userId || !action || !['grant', 'revoke'].includes(action)) {
      return json({ error: 'Invalid input' }, 400)
    }

    // O admin registrado no historico e sempre o do JWT verificado, nunca o do corpo.
    const actingAdmin = callerAdminId ?? adminId ?? null

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_vip, plan')
      .eq('id', userId)
      .single()

    if (!profile) return json({ error: 'User not found' }, 404)

    if (action === 'grant' && profile.is_vip) return json({ error: 'User is already VIP' }, 400)
    if (action === 'revoke' && !profile.is_vip) return json({ error: 'User is not VIP' }, 400)

    if (action === 'grant') {
      const oldPlan = profile.plan

      await supabase.from('subscription_history').insert({
        user_id: userId,
        old_plan: oldPlan,
        new_plan: 'vip',
        reason: 'vip_granted',
        changed_by: actingAdmin,
        notes,
      })

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ is_vip: true, plan: 'vip', sub_status: 'active' })
        .eq('id', userId)

      if (upErr) return json({ error: upErr.message }, 500)

      return json({ success: true, message: 'VIP granted' })
    }

    const { data: history } = await supabase
      .from('subscription_history')
      .select('old_plan')
      .eq('user_id', userId)
      .eq('reason', 'vip_granted')
      .order('changed_at', { ascending: false })
      .limit(1)

    const previousPlan = history?.[0]?.old_plan || 'starter'

    await supabase.from('subscription_history').insert({
      user_id: userId,
      old_plan: 'vip',
      new_plan: previousPlan,
      reason: 'vip_revoked',
      changed_by: actingAdmin,
      notes,
    })

    const { error: revErr } = await supabase
      .from('profiles')
      .update({ is_vip: false, plan: previousPlan })
      .eq('id', userId)

    if (revErr) return json({ error: revErr.message }, 500)

    return json({ success: true, message: 'VIP revoked', restoredPlan: previousPlan })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown error' }, 500)
  }
})
