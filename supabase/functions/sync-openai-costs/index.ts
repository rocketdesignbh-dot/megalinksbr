import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://nxlfezpagporealqqbfj.supabase.co'
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: corsHeaders })
}

async function isAuthorized(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return false
  const token = auth.slice(7).trim()
  if (!token) return false
  if (token === supabaseServiceKey) return true

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return false

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return profile?.is_admin === true
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!(await isAuthorized(req))) return json({ error: 'unauthorized' }, 401)

  try {
    if (!openaiApiKey) return json({ error: 'OpenAI API key not configured' }, 400)

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = now

    const response = await fetch(
      `https://api.openai.com/v1/usage?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`,
      { headers: { Authorization: `Bearer ${openaiApiKey}` } },
    )

    const usageData = await response.json()
    if (!usageData.data) return json({ error: 'Failed to fetch OpenAI usage' }, 500)

    for (const dayData of usageData.data) {
      const cost = dayData.cost || 0
      if (cost > 0) {
        await supabase.from('usage_costs').insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          service: 'openai',
          cost,
          quantity: dayData.n_requests || 1,
          unit: 'requests',
          details: {
            date: dayData.date,
            tokens_used: (dayData.n_context_tokens_in ?? 0) + (dayData.n_context_tokens_out ?? 0),
            timestamp: new Date().toISOString(),
          },
        })
      }
    }

    return json({ success: true, synced: usageData.data.length })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown error' }, 500)
  }
})
