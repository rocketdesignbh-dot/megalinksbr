// Mega Links BR · Edge Function "wa-heartbeat" v6
// Recebe o sinal de vida das sessões do wa-engine e atualiza o estado no banco.
//
// v6: ZERA idle_since AO RESSUSCITAR A SESSAO.
//     Ate a v5 a revivescencia limpava disconnect_reason, auto_disconnected_at e
//     disconnect_requested_at, mas deixava idle_since com o valor antigo. Como o
//     ceifador (flag_idle_whatsapp_instances, a cada 5 min) derruba qualquer
//     sessao conectada cujo idle_since ja passou de 30 minutos, uma sessao
//     ressuscitada com o relogio velho era derrubada na tica seguinte, sem
//     nenhuma janela de carencia.
//
//     MEDIDO em 30/07/2026: a instancia +553191797069 estava `connected`, com
//     heartbeat do minuto corrente, e idle_since de 20/07 -- dez dias parado.
//     O WHERE do passo 3 do ceifador casava com ela naquele instante, e mesmo
//     assim status/disconnect_reason/auto_disconnected_at estavam limpos. So ha
//     uma explicacao: o ceifador derrubava, esta funcao ressuscitava e apagava a
//     evidencia, e idle_since sobrevivia por nao ser tocado por nenhum dos dois.
//     A briga rodava a cada 5 minutos desde 20/07.
//
//     Por que zerar SO na transicao (dentro do if de status !== 'connected') e
//     nao a cada batida: o heartbeat chega o tempo todo para sessao viva. Zerar
//     sempre deixaria idle_since eternamente nulo e o ceifador nunca dispararia
//     -- trocar um relogio que dispara na hora errada por um que nunca dispara.
//     Zerando na revivescencia, o passo 2 do ceifador reinicia a contagem do
//     zero e a sessao ganha os 30 minutos de carencia que o desenho previa.
//
// O wa-engine usa a chave publishable (anon) e o RLS impede que ele escreva
// nessas tabelas. Em vez de colocar a SERVICE_ROLE_KEY dentro do container do
// engine, ele autentica aqui com o WA_ENGINE_TOKEN, ja compartilhado entre os
// dois lados, e esta funcao faz a escrita com service role.
//
// POST /functions/v1/wa-heartbeat
// Authorization: Bearer <WA_ENGINE_TOKEN>
// { "sessions": [{ "phone": "5531988887777", "status": "paired" }, ...] }
//
// Atualiza DUAS tabelas, com regras DIFERENTES:
//
//  1. whatsapp_instances (afiliados)
//     - viva  -> last_seen_at; reativa se o banco a dava como caida por engano
//     - morta -> marca disconnected com motivo session_closed
//
//  2. revops_admin_whatsapp (sessão administrativa do RevOps)
//     - APENAS last_seen_at. O status NUNCA e alterado automaticamente.
//       Essa sessao e a que dispara mensagens de retencao para os usuarios e
//       so pode ser desconectada pelo proprio admin. Derruba-la por automatismo
//       interromperia a comunicacao com a base inteira.
//
// Numeros ausentes da lista NAO sao tocados (payload parcial nao derruba ninguem).

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WA_ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function normalizar(raw: unknown): string {
  let n = String(raw ?? "").replace(/\D/g, "");
  if (!n) return "";
  if (!n.startsWith("55")) n = "55" + n;
  return n;
}

// Duas grafias convivem no banco (com e sem o nono digito); os ultimos 8 sao estaveis.
function sufixo(n: string): string {
  return n.slice(-8);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Fail-closed: sem token configurado, ninguem entra.
  if (!WA_ENGINE_TOKEN) return json({ error: "WA_ENGINE_TOKEN nao configurado" }, 500);

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== WA_ENGINE_TOKEN && token !== SERVICE_KEY) return json({ error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const entradas: any[] = Array.isArray(body?.sessions) ? body.sessions : [];
  if (!entradas.length) return json({ ok: true, batidas: 0, nota: "lista vazia" });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const agora = new Date().toISOString();

  const vivas: string[] = [];
  const mortas: string[] = [];
  for (const s of entradas) {
    const fone = normalizar(s?.phone ?? s?.phoneNumber ?? s?.sessionPhone);
    if (!fone) continue;
    const st = String(s?.status ?? "").toLowerCase();
    if (st === "paired" || st === "open" || st === "connected") vivas.push(sufixo(fone));
    else if (st === "closed" || st === "dead" || st === "logged_out") mortas.push(sufixo(fone));
  }

  // Sufixos das sessoes administrativas: ficam imunes a qualquer mudanca
  // automatica de status, inclusive na tabela de afiliados, caso o mesmo
  // numero esteja cadastrado nos dois lugares.
  const { data: adminRows } = await sb
    .from("revops_admin_whatsapp")
    .select("id, phone, status");

  const sufixosAdmin = new Set(
    (adminRows ?? []).map((r) => sufixo(normalizar(r.phone))).filter(Boolean)
  );

  let batidas = 0, derrubadas = 0, admin_batidas = 0, ressuscitadas = 0;

  // ── 1) Instancias dos afiliados ──
  const { data: instancias, error: e1 } = await sb
    .from("whatsapp_instances")
    .select("id, phone, status");
  if (e1) return json({ error: e1.message }, 500);

  for (const inst of instancias ?? []) {
    const suf = sufixo(normalizar(inst.phone));
    if (!suf) continue;

    if (vivas.includes(suf)) {
      const patch: Record<string, unknown> = { last_seen_at: agora };
      if (inst.status !== "connected") {
        patch.status = "connected";
        patch.disconnect_reason = null;
        patch.auto_disconnected_at = null;
        patch.disconnect_requested_at = null;
        // O relogio da ociosidade tambem e zerado AQUI, e so aqui. Ver o cabecalho
        // da v6: sem isto a sessao voltava com o relogio velho e o ceifador a
        // derrubava na tica seguinte, sem carencia nenhuma.
        patch.idle_since = null;
        ressuscitadas++;
      }
      await sb.from("whatsapp_instances").update(patch).eq("id", inst.id);
      batidas++;
    } else if (mortas.includes(suf) && inst.status === "connected" && !sufixosAdmin.has(suf)) {
      await sb.from("whatsapp_instances").update({
        status: "disconnected",
        disconnect_reason: "session_closed",
        auto_disconnected_at: agora,
        repair_notice_ack_at: null,
      }).eq("id", inst.id);
      derrubadas++;
    }
  }

  // ── 2) Sessao administrativa do RevOps ──
  // SOMENTE heartbeat. O status nao e tocado em nenhuma hipotese:
  // essa sessao so pode ser desconectada pelo proprio admin.
  for (const row of adminRows ?? []) {
    if (row.status !== "connected") continue;
    const suf = sufixo(normalizar(row.phone));
    if (!suf) continue;
    if (vivas.includes(suf)) {
      await sb.from("revops_admin_whatsapp").update({ last_seen_at: agora }).eq("id", row.id);
      admin_batidas++;
    }
    // Sessao admin ausente ou reportada como morta: NAO alteramos o status.
    // O last_seen_at parado ja denuncia o problema no painel, sem cortar a
    // comunicacao por conta propria.
  }

  return json({ ok: true, recebidas: entradas.length, batidas, derrubadas, ressuscitadas, admin_batidas });
});
