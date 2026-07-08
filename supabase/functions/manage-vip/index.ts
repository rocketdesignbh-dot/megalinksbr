import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nxlfezpagporealqqbfj.supabase.co'
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async (req: Request) => {
  try {
    const { userId, action, adminId, notes } = await req.json()
    
    if (!userId || !action || !['grant', 'revoke'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 })
    }

    // Buscar perfil atual
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_vip, plan')
      .eq('id', userId)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    if (action === 'grant' && profile.is_vip) {
      return new Response(JSON.stringify({ error: 'User is already VIP' }), { status: 400 })
    }

    if (action === 'revoke' && !profile.is_vip) {
      return new Response(JSON.stringify({ error: 'User is not VIP' }), { status: 400 })
    }

    if (action === 'grant') {
      // Marcar como VIP
      const oldPlan = profile.plan
      
      // Registrar no histórico
      await supabase.from('subscription_history').insert({
        user_id: userId,
        old_plan: oldPlan,
        new_plan: 'vip',
        reason: 'vip_granted',
        changed_by: adminId,
        notes
      })

      // Atualizar perfil
      await supabase
        .from('profiles')
        .update({ is_vip: true, plan: 'vip' })
        .eq('id', userId)

      return new Response(JSON.stringify({ success: true, message: 'VIP granted' }), { status: 200 })
    }

    if (action === 'revoke') {
      // Buscar último plano antes de virar VIP
      const { data: history } = await supabase
        .from('subscription_history')
        .select('old_plan')
        .eq('user_id', userId)
        .eq('reason', 'vip_granted')
        .order('changed_at', { ascending: false })
        .limit(1)

      const previousPlan = history?.[0]?.old_plan || 'starter'

      // Registrar no histórico
      await supabase.from('subscription_history').insert({
        user_id: userId,
        old_plan: 'vip',
        new_plan: previousPlan,
        reason: 'vip_revoked',
        changed_by: adminId,
        notes
      })

      // Atualizar perfil
      await supabase
        .from('profiles')
        .update({ is_vip: false, plan: previousPlan })
        .eq('id', userId)

      return new Response(JSON.stringify({ success: true, message: 'VIP revoked', restoredPlan: previousPlan }), { status: 200 })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
