// =====================================================================
//  MEGA LINKS BR · Conexão com o Supabase (projeto AO VIVO)
//  Projeto: mega-links-br · região sa-east-1 (São Paulo)
//  Use no front-end. As chaves abaixo são PÚBLICAS por design
//  (protegidas por Row Level Security). NUNCA exponha a service_role key.
// =====================================================================

// 1) Inclua o SDK (CDN) antes deste arquivo:
//    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SUPABASE_URL = "https://nxlfezpagporealqqbfj.supabase.co";

// Chave publishable (recomendada para apps novos):
const SUPABASE_KEY = "sb_publishable_FQTFJaF46KfwSnODD5UjPA_nOagscIu";
// (Alternativa legada "anon", caso seu SDK exija JWT:)
// const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bGZlenBhZ3BvcmVhbHFxYmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODE2NzksImV4cCI6MjA5Njc1NzY3OX0.7mASjuTiaUj1Bd9F0YRl_o_Kwb2Y3bmN2RyRCaPZOfs";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================================================
//  AUTENTICAÇÃO  (o trigger cria o profile automaticamente)
// =====================================================================
async function entrarComGoogle() {
  return sb.auth.signInWithOAuth({ provider: "google" });
}
async function usuarioAtual() {
  const { data } = await sb.auth.getUser();
  return data.user;
}

// =====================================================================
//  GRUPOS DE CONFIGURAÇÃO (nichos)
//  O limite por plano é imposto por TRIGGER no banco — se passar do
//  limite, o insert retorna erro "Limite de N grupo(s) atingido...".
// =====================================================================
async function criarGrupo(nome) {
  const user = await usuarioAtual();
  return sb.from("niche_groups").insert({ user_id: user.id, name: nome }).select().single();
}
async function listarGrupos() {
  return sb.from("niche_groups").select("*, products(count), whatsapp_channels(count)");
}
async function ativarPostAuto(grupoId, { intervalo = 10, inicio = 8, fim = 22, loop = true }) {
  return sb.from("niche_groups").update({
    post_auto_enabled: true, interval_minutes: intervalo,
    start_hour: inicio, end_hour: fim, loop_enabled: loop,
  }).eq("id", grupoId);
}

// =====================================================================
//  CONEXÃO WHATSAPP (instância pareada via QR)
//  O QR/pareamento real roda no seu backend (Baileys/WA-Web);
//  aqui apenas registramos/atualizamos a sessão.
// =====================================================================
async function registrarInstancia(phone) {
  const user = await usuarioAtual();
  return sb.from("whatsapp_instances")
    .upsert({ user_id: user.id, phone, status: "pairing" }, { onConflict: "user_id,phone" })
    .select().single();
}
async function marcarConectada(instanciaId, sessionData) {
  return sb.from("whatsapp_instances")
    .update({ status: "connected", session_data: sessionData, last_seen_at: new Date().toISOString() })
    .eq("id", instanciaId);
}

// =====================================================================
//  CANAIS DO WHATSAPP
//  Regra de negócio: o CHECK constraint do banco só aceita role
//  'owner' ou 'admin'. Valide o papel no backend (check-admin) ANTES
//  de inserir; se vier 'member'/'unknown', o insert é rejeitado.
// =====================================================================
async function vincularCanal(grupoId, instanciaId, { link, nome, followers, role }) {
  if (!["owner", "admin"].includes(role)) {
    throw new Error("Só é possível vincular canais onde você é OWNER ou ADMIN.");
  }
  return sb.from("whatsapp_channels").insert({
    niche_group_id: grupoId, instance_id: instanciaId,
    channel_link: link, name: nome, followers, role,
    validated_at: new Date().toISOString(),
  }).select().single();
}

// =====================================================================
//  PRODUTOS (curadoria Shopee, etc.) — link de afiliado já convertido
// =====================================================================
async function adicionarProdutos(grupoId, produtos) {
  const rows = produtos.map((p, i) => ({
    niche_group_id: grupoId, source: p.source || "shopee",
    title: p.title, category: p.category, keyword: p.keyword,
    affiliate_url: p.affiliate_url, price: p.price,
    discount_pct: p.discount_pct, image_url: p.image_url,
    video_url: p.video_url || null, position: i,
  }));
  return sb.from("products").insert(rows).select();
}

// =====================================================================
//  ADMIN / CRM  (só funciona para profiles com is_admin = true,
//  garantido pelas políticas de RLS via is_admin())
// =====================================================================
async function adminListarUsuarios() {
  return sb.from("profiles").select("*").order("created_at", { ascending: false });
}
async function adminMRR() {
  return sb.from("admin_mrr").select("*");      // view de MRR por plano
}

// export (se estiver usando módulos)
// export { sb, criarGrupo, listarGrupos, ativarPostAuto, registrarInstancia,
//          marcarConectada, vincularCanal, adicionarProdutos, adminListarUsuarios, adminMRR };
