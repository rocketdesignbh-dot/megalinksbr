// api-gateway — proxy para funcoes administrativas.
// Antes: qualquer pessoa podia chamar ?action=manage-vip sem autenticacao.
// Agora: exige service_role OU JWT de admin, e so entao repassa.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://nxlfezpagporealqqbfj.supabase.co'
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: corsHeaders })
}

async function isAuthorized(auth: string): Promise<boolean> {
  if (!auth.startsWith('Bearer ')) return false
  const token = auth.slice(7).trim()
  if (!token) return false
  if (token === SERVICE_KEY) return true

  // Valida o JWT e exige is_admin
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return false
  const user = await r.json().catch(() => null)
  if (!user?.id) return false

  const p = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=is_admin`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  )
  if (!p.ok) return false
  const rows = await p.json().catch(() => [])
  return Array.isArray(rows) && rows[0]?.is_admin === true
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('OK', { headers: corsHeaders, status: 200 })

  try {
    const auth = req.headers.get('authorization') ?? ''
    if (!(await isAuthorized(auth))) return json({ error: 'unauthorized' }, 401)

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    if (!action) return json({ error: 'Missing action parameter' }, 400)

    let targetPath = ''
    switch (action) {
      case 'manage-vip':
        targetPath = '/functions/v1/manage-vip'
        break
      case 'track-usage':
        targetPath = '/functions/v1/track-usage-cost'
        break
      case 'sync-openai':
        targetPath = '/functions/v1/sync-openai-costs'
        break
      default:
        return json({ error: 'Invalid action' }, 400)
    }

    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text()

    // Repassa com service_role: a autorizacao ja foi validada acima.
    const response = await fetch(`${SUPABASE_URL}${targetPath}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
      body,
    })

    const data = await response.json().catch(() => ({}))
    return json(data, response.status)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown error' }, 500)
  }
})
