// Mega Links BR · Edge Function "wa-repair-notice" v1 (27/08/2026)
//
// O QUE FAZ. Avisa, pelo WhatsApp, quem teve a sessao derrubada — por rebuild do
// wa-engine, deploy, manutencao, queda de rede ou logout no celular — pedindo o
// repareamento imediato. Uma mensagem POR QUEDA, nunca em loop.
//
// POR QUE EXISTE. Ate aqui a queda era silenciosa: o status virava
// 'disconnected' no banco (pela wa-heartbeat ou pela
// flag_heartbeat_timeout_whatsapp_instances) e o afiliado so descobria quando um
// disparo nao saia. Como o painel procura a sessao com .eq("status","connected"),
// a conexao simplesmente sumia da tela, sem explicacao.
//
// QUEM MANDA. A sessao ADMIN da plataforma (revops_admin_whatsapp), nunca a
// sessao da propria pessoa — que, alias, e justamente a que caiu. Mesmo desenho
// da wa-idle-reaper e da product-refresh.
//
// AS TRAVAS, e cada uma tem motivo:
//  1. `repair_notice_sent_at` so e carimbado quando o engine devolve messageId.
//     Status 200 nao e prova de entrega — regra de ouro do projeto.
//  2. Zerado toda vez que a sessao volta a 'connected' (wa-heartbeat) e toda vez
//     que uma NOVA queda e detectada. E por isso que "uma por queda" funciona.
//  3. JANELA de 7 dias: quem esta desconectado ha semanas nao recebe nada. Sem
//     isso, o primeiro deploy desta funcao dispararia uma enxurrada de mensagens
//     para gente que abandonou a conexao ha muito tempo — otimo jeito de o numero
//     admin ser marcado como spam.
//  4. TETO por rodada + intervalo entre envios: um rebuild derruba todo mundo de
//     uma vez, e 50 mensagens em 5 segundos pelo mesmo numero e pedido de ban.
//  5. A propria sessao admin nunca recebe aviso.
//
// POST /functions/v1/wa-repair-notice
//   x-cron-secret: <CRON_SECRET>     (ou Authorization: Bearer <service role>)
//   { "dryRun": true }   -> lista quem receberia, nao envia, nao escreve
//   { "limite": 10 }     -> teto de envios nesta rodada (padrao 25)
//   { "janelaDias": 7 }  -> idade maxima da queda que ainda merece aviso

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPA_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const WA_ENGINE_URL = Deno.env.get("WA_ENGINE_URL") || "https://megalinksbr-wa-engine.fwezsn.easypanel.host";
const WA_ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

const TIMEOUT_MS = 20000;
const PAUSA_MS = 2500;   // intervalo entre envios — protege o numero admin
const TETO_PADRAO = 25;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// Duas grafias convivem no banco (com e sem o nono digito); os ultimos 8 sao
// estaveis. Mesmo criterio da wa-heartbeat, do /groups e da wa-idle-reaper.
function sufixo(raw: unknown): string {
  const n = String(raw ?? "").replace(/\D/g, "");
  return n ? n.slice(-8) : "";
}

async function comTimeout(url: string, init: RequestInit): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT_MS);
  try { return await fetch(url, { ...init, signal: c.signal }); }
  finally { clearTimeout(t); }
}

function texto(nome: string | null): string {
  const ola = nome ? `${nome}, ` : "";
  return (
    `🚨🚨 *ATENÇÃO — SUA CONEXÃO CAIU* 🚨🚨\n\n` +
    `${ola}a conexão do seu WhatsApp com a *Mega Links BR* foi encerrada.\n\n` +
    `⚠️ *Enquanto ela estiver caída, nada é enviado:*\n` +
    `❌ Postagens automáticas paradas\n` +
    `❌ Clone Post sem capturar ofertas\n` +
    `❌ Disparos para os seus grupos parados\n\n` +
    `✅ *Resolver leva 30 segundos:*\n` +
    `1️⃣ Entre no painel: https://www.megalinksbr.com.br\n` +
    `2️⃣ Vá em *Conexão WhatsApp*\n` +
    `3️⃣ Leia o QR Code com o seu celular\n\n` +
    `⏱️ *Faça agora* — cada minuto parado é oferta que não sai.`
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const inicio = Date.now();

  const secret = req.headers.get("x-cron-secret") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (!((CRON_SECRET && secret === CRON_SECRET) || (SUPA_KEY && auth === `Bearer ${SUPA_KEY}`))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* sem corpo */ }
  const dryRun = body.dryRun === true;
  const teto = Number(body.limite ?? TETO_PADRAO);
  const janelaDias = Number(body.janelaDias ?? 7);

  if (!WA_ENGINE_TOKEN) {
    return json({ ok: false, motivo: "WA_ENGINE_TOKEN nao configurado", nota: "Ninguem foi avisado." });
  }

  const SB = createClient(SUPA_URL, SUPA_KEY);
  const agora = new Date().toISOString();
  const corte = new Date(Date.now() - janelaDias * 86400000).toISOString();

  // Quem manda: a sessao admin viva mais recente.
  const { data: admin } = await SB.from("revops_admin_whatsapp")
    .select("phone").eq("status", "connected")
    .order("last_seen_at", { ascending: false }).limit(1).maybeSingle();
  if (!admin?.phone) {
    return json({ ok: false, motivo: "sem_conexao_admin", nota: "Ninguem foi avisado; a propria sessao admin esta fora." });
  }
  const sufAdmin = sufixo(admin.phone);

  // Candidatas: caidas, ainda sem aviso desta queda, e com queda RECENTE.
  const { data: linhas, error } = await SB.from("whatsapp_instances")
    .select("id, user_id, phone, status, last_seen_at, auto_disconnected_at, disconnect_requested_at, disconnect_reason, repair_notice_sent_at")
    .neq("status", "connected")
    .is("repair_notice_sent_at", null)
    .not("last_seen_at", "is", null);
  if (error) return json({ ok: false, error: error.message }, 500);

  const candidatas = (linhas ?? []).filter((l: any) => {
    if (!l.phone || sufixo(l.phone) === sufAdmin) return false;
    const quando = l.auto_disconnected_at || l.disconnect_requested_at || l.last_seen_at;
    return String(quando) >= corte;
  });

  // Nome de tratamento, quando houver.
  const ids = [...new Set(candidatas.map((l: any) => l.user_id).filter(Boolean))];
  const nomes = new Map<string, string>();
  if (ids.length) {
    const { data: perfis } = await SB.from("profiles").select("id, full_name").in("id", ids);
    for (const p of perfis ?? []) {
      const n = String(p.full_name ?? "").trim().split(/\s+/)[0];
      if (n) nomes.set(p.id, n);
    }
  }

  let enviados = 0, falhas = 0;
  const detalhes: string[] = [];

  for (const l of candidatas) {
    if (enviados >= teto) { detalhes.push(`… teto de ${teto} atingido nesta rodada; o resto vai na proxima`); break; }

    const destino = String(l.phone).replace(/\D/g, "");
    const quem = `${destino.slice(-8)} (${l.disconnect_reason ?? "sem motivo registrado"})`;

    if (dryRun) { detalhes.push(`~ ${quem} — receberia`); enviados++; continue; }

    try {
      const r = await comTimeout(`${WA_ENGINE_URL}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_ENGINE_TOKEN}` },
        body: JSON.stringify({
          sessionPhone: admin.phone,
          phoneNumber: destino,
          message: texto(nomes.get(l.user_id) ?? null),
        }),
      });
      const d = await r.json().catch(() => null);
      // 200 nao basta: o engine ja devolveu 200 sobre mensagem nao entregue.
      if (!r.ok || !d?.messageId) {
        falhas++;
        detalhes.push(`X ${quem} — ${String(d?.error ?? `http_${r.status}`).slice(0, 40)}; tenta de novo na proxima`);
        continue;
      }
      // So carimba com prova de entrega. Sem isso, uma falha viraria "avisado"
      // e a pessoa ficaria caida sem nunca ter recebido nada.
      await SB.from("whatsapp_instances").update({ repair_notice_sent_at: agora }).eq("id", l.id);
      enviados++;
      detalhes.push(`✓ ${quem} — ${String(d.messageId).slice(0, 12)}`);
    } catch (e) {
      falhas++;
      detalhes.push(`X ${quem} — excecao: ${(e as Error).message.slice(0, 40)}`);
    }

    await new Promise((r) => setTimeout(r, PAUSA_MS));
  }

  return json({
    ok: true,
    dryRun,
    remetente: admin.phone,
    caidas_sem_aviso: candidatas.length,
    enviados,
    falhas,
    janelaDias,
    ms: Date.now() - inicio,
    detalhes,
  });
});
