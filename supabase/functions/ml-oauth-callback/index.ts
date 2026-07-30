// ml-oauth-callback v3 — salva token por user_id
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ML_CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
const ML_CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/ml-oauth-callback`;

function buildPage(title: string, body: string, ok: boolean): Response {
  const borderColor = ok ? "#f5c518" : "#ff4d6d";
  const titleColor = ok ? "#f5c518" : "#ff4d6d";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0c0c0e;color:#fff}
    .box{text-align:center;padding:40px;background:#1a1a1f;border-radius:16px;border:1px solid ${borderColor};max-width:420px}
    h1{color:${titleColor}}p{color:#aaa}code{background:#111;padding:2px 6px;border-radius:4px;font-size:12px}
  </style></head>
  <body><div class="box">${body}<script>if(window.opener)setTimeout(()=>window.close(),2500);<\/script></div></body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const stateRaw = url.searchParams.get("state") ?? "{}";

  if (error) return buildPage("Erro", `<h1>&#x274c; Erro OAuth</h1><p>${error}</p>`, false);
  if (!code) return buildPage("Erro", `<h1>&#x274c; C\u00f3digo ausente</h1>`, false);

  // Extrai uid do state
  let uid = "";
  try { const s = JSON.parse(decodeURIComponent(stateRaw)); uid = s.uid ?? ""; } catch {}

  // Troca code por token
  const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "accept": "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return buildPage("Erro", `<h1>&#x274c; Erro ao obter token</h1><p><code>${err.slice(0, 200)}</code></p>`, false);
  }

  const token = await tokenRes.json();
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Busca linha existente para mesclar credentials
  let existingQuery = sb.from("affiliate_credentials").select("id, credentials").eq("store", "mercado_livre");
  if (uid) existingQuery = existingQuery.eq("user_id", uid) as any;
  const { data: existing } = await (existingQuery as any).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const merged = {
    ...(existing?.credentials || {}),
    access_token: token.access_token,
    refresh_token: token.refresh_token || "",
    ml_user_id: String(token.user_id || ""),
    token_expires_in: token.expires_in,
    token_obtained_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await sb.from("affiliate_credentials").update({ credentials: merged, connected: true }).eq("id", existing.id);
  } else if (uid) {
    await sb.from("affiliate_credentials").insert({ user_id: uid, store: "mercado_livre", connected: true, credentials: merged });
  }

  const expiresH = Math.round((Number(token.expires_in) || 21600) / 3600);
  return buildPage("ML Conectado!",
    `<h1>&#x2705; Mercado Livre Conectado!</h1>
    <p>Token salvo com sucesso.</p>
    <p>User ID ML: <strong>${token.user_id}</strong></p>
    <p>Expira em: <strong>${expiresH}h</strong> (renova automaticamente)</p>
    <p style="margin-top:16px;font-size:12px;opacity:.6">Esta janela fechar\u00e1 automaticamente...</p>`,
    true
  );
});
