// Mega Links BR · Edge Function "wa-idle-reaper" v1
//
// Libera sessão de WhatsApp de quem parou de usar o produto. Substitui a
// flag_idle_whatsapp_instances(), aposentada em 30/07/2026.
//
// POR QUE A ANTERIOR SAIU. Ela decidia por CONFIGURACAO (post_auto_enabled e
// clone_sources.active), nao por uso: uma Starter que dispara em grupo na mao
// todo dia era ceifada enquanto trabalhava. E marcava status='disconnected' numa
// sessao que o wa-engine mantinha viva -- o engine nao le o banco e nao tem
// nenhuma referencia a idle. Nada era desconectado de fato; o unico efeito real
// era sumir com a sessao do painel da propria dona, porque o index.html procura
// a sessao com .eq("status","connected"). A wa-heartbeat devolvia o status na
// batida seguinte e a briga rodava a cada 5 minutos desde 20/07/2026.
//
// A LICAO QUE ORGANIZA ESTA FUNCAO: status segue a realidade, nunca a antecipa.
// Aqui o banco so e escrito DEPOIS que o engine confirma. Se o engine falhar, a
// linha fica como esta e a proxima rodada tenta de novo -- nao ha veredito sem
// prova, do mesmo jeito que o productTitle e a prova antes de ler preco na Amazon
// e o schema.org e a prova no Mercado Livre.
//
// O RELOGIO mora no SQL, em public.wa_ociosidade(), para poder ser conferido sem
// abrir esta funcao:  maior(last_sign_in_at, max(auth.sessions.updated_at)).
// MEDIDO em 30/07: last_sign_in_at NAO anda com refresh de token (04:20:57
// enquanto a sessao ia a 14:33 com 3 refreshes), entao sozinho ele acusaria de
// inativo quem deixa a aba aberta e usa o painel todo dia. E last_seen_at da
// whatsapp_instances nao serve: as tres sessoes conectadas tinham o timestamp
// IDENTICO, porque e a wa-heartbeat escrevendo em lote -- mede o engine, nao a
// pessoa.
//
// DUAS ETAPAS, e nao uma, porque o corte doi: o /disconnect do engine chama
// socket.logout(), que desregistra o aparelho no WhatsApp, e apaga a pasta de
// credenciais. Quem for cortado vai ter que ler QR de novo. Avisa em
// wa_aviso_dias() (21), corta em wa_corte_dias() (28). Os dois sao funcoes SQL
// de uma linha, feitas para serem calibradas com dado.
//
// POST /functions/v1/wa-idle-reaper
//   x-cron-secret: <CRON_SECRET>        (ou Authorization: Bearer <service role>)
//   { "dryRun": true }    -> nao escreve, nao avisa, nao desconecta
//   { "semAviso": true }  -> executa, mas nao manda mensagem a ninguem

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPA_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const WA_ENGINE_URL = Deno.env.get("WA_ENGINE_URL") || "https://megalinksbr-wa-engine.fwezsn.easypanel.host";
const WA_ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

const TIMEOUT_MS = 20000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// Duas grafias convivem no banco (com e sem o nono digito); os ultimos 8 sao
// estaveis. Mesmo criterio da wa-heartbeat, do /groups e da clone-ingest -- ao
// mexer em um, mexer nos quatro.
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

// Mapa sufixo-do-telefone -> sessionId do engine.
// O /disconnect recebe o sessionId, que e a CHAVE do Map interno do engine, e nao
// o telefone. Assumir que era o telefone daria 404 em toda chamada.
async function sessoesDoEngine(): Promise<{ mapa: Map<string, string>; erro: string | null }> {
  try {
    const r = await comTimeout(`${WA_ENGINE_URL}/sessions`, {
      headers: { Authorization: `Bearer ${WA_ENGINE_TOKEN}` },
    });
    if (!r.ok) return { mapa: new Map(), erro: `GET /sessions devolveu HTTP ${r.status}` };
    const d = await r.json().catch(() => null);
    const mapa = new Map<string, string>();
    for (const s of d?.sessions ?? []) {
      const suf = sufixo(s?.phone);
      if (suf && s?.sessionId) mapa.set(suf, String(s.sessionId));
    }
    return { mapa, erro: null };
  } catch (e) {
    return { mapa: new Map(), erro: `GET /sessions nao respondeu: ${(e as Error).message}` };
  }
}

// Avisa pela conexao ADMIN da plataforma, nunca pela sessao da propria usuaria:
// mensagem da pessoa para ela mesma cai na conversa "consigo mesma" e nao parece
// vir da plataforma. Mesmo desenho da product-refresh v13.
async function avisar(SB: any, telefone: string, texto: string): Promise<string> {
  const { data: admin } = await SB.from("revops_admin_whatsapp")
    .select("phone").eq("status", "connected")
    .order("last_seen_at", { ascending: false }).limit(1).maybeSingle();
  if (!admin?.phone) return "sem_conexao_admin";

  const destino = String(telefone ?? "").replace(/\D/g, "");
  if (!destino) return "sem_telefone";

  try {
    const r = await comTimeout(`${WA_ENGINE_URL}/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_ENGINE_TOKEN}` },
      body: JSON.stringify({ sessionPhone: admin.phone, phoneNumber: destino, message: texto }),
    });
    const d = await r.json().catch(() => null);
    // 200 nao basta: o engine ja devolveu 200 sobre mensagem nao entregue.
    // So conta como avisado se vier o id da mensagem.
    if (!r.ok || !d?.messageId) return `falhou:${String(d?.error ?? `http_${r.status}`).slice(0, 30)}`;
    return `enviado:${String(d.messageId).slice(0, 12)}`;
  } catch (e) {
    return `excecao:${(e as Error).message.slice(0, 40)}`;
  }
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
  const semAviso = body.semAviso === true;

  if (!WA_ENGINE_TOKEN) {
    return json({ ok: false, motivo: "WA_ENGINE_TOKEN nao configurado", nota: "Nenhuma sessao foi tocada." });
  }

  const SB = createClient(SUPA_URL, SUPA_KEY);

  const { data: linhas, error } = await SB.rpc("wa_ociosidade");
  if (error) return json({ ok: false, error: error.message }, 500);
  if (!linhas?.length) return json({ ok: true, avaliadas: 0, msg: "nenhuma sessao conectada" });

  const { data: avisoDias } = await SB.rpc("wa_aviso_dias");
  const { data: corteDias } = await SB.rpc("wa_corte_dias");

  // So vai ao engine se houver alguem para cortar: numa base saudavel a rodada
  // inteira e uma consulta ao Postgres e mais nada.
  const temCorte = linhas.some((l: any) => l.fase === "cortar");
  const { mapa: sessoes, erro: erroSessoes } = temCorte
    ? await sessoesDoEngine()
    : { mapa: new Map<string, string>(), erro: null };

  let avisadas = 0, cortadas = 0, reativadas = 0, erros = 0, aguardando = 0;
  const detalhes: string[] = [];
  const agora = new Date().toISOString();

  for (const l of linhas as any[]) {
    const quem = String(l.email ?? l.phone ?? "").slice(0, 34);
    const dias = Number(l.dias_sem_contato ?? 0);

    // ── Voltou a aparecer ────────────────────────────────────────────
    if (l.fase === "ativa") {
      if (l.idle_warned_at) {
        reativadas++;
        detalhes.push(`+ ${quem} — voltou (${dias}d), aviso zerado`);
        if (!dryRun) await SB.from("whatsapp_instances").update({ idle_warned_at: null }).eq("id", l.instance_id);
      }
      continue;
    }

    // ── Aviso ────────────────────────────────────────────────────────
    if (l.fase === "avisar") {
      if (l.idle_warned_at) { aguardando++; continue; }   // ja avisado, aguardando o prazo
      const faltam = Math.max(1, Math.ceil(Number(corteDias ?? 28) - dias));
      const texto =
        `Oi! Sua conexão do WhatsApp com a Mega Links continua ativa, ` +
        `mas faz ${Math.floor(dias)} dias que você não entra no painel.\n\n` +
        `Para não deixar uma conexão aberta sem uso, ela será encerrada em ${faltam} dias. ` +
        `Se isso acontecer, você vai precisar ler o QR Code de novo para reconectar.\n\n` +
        `É só entrar no painel que a conexão continua como está: ` +
        `https://www.megalinksbr.com.br`;

      const via = semAviso ? "aviso_suprimido" : (dryRun ? "nao_enviado_dry" : await avisar(SB, l.phone, texto));
      avisadas++;
      detalhes.push(`! ${quem} — ${dias}d sem entrar, avisado (${via})`);
      // Marca mesmo se o envio falhou? Nao: sem prova de entrega, tenta de novo
      // na proxima rodada. Marcar aqui transformaria uma falha de envio em
      // "avisada" e a pessoa seria cortada sem nunca ter sido avisada.
      if (!dryRun && !semAviso && via.startsWith("enviado:")) {
        await SB.from("whatsapp_instances").update({ idle_warned_at: agora }).eq("id", l.instance_id);
      }
      continue;
    }

    // ── Corte ────────────────────────────────────────────────────────
    // Nunca corta quem nao foi avisado: o aviso e a parte que torna o corte justo.
    if (!l.idle_warned_at) {
      aguardando++;
      detalhes.push(`~ ${quem} — ${dias}d, passou do corte mas ainda nao foi avisado; avisa nesta rodada`);
      if (!dryRun && !semAviso) {
        const texto =
          `Oi! Sua conexão do WhatsApp com a Mega Links está aberta há ${Math.floor(dias)} dias sem uso ` +
          `e será encerrada em breve.\n\nÉ só entrar no painel para mantê-la: https://www.megalinksbr.com.br`;
        const via = await avisar(SB, l.phone, texto);
        if (via.startsWith("enviado:")) {
          await SB.from("whatsapp_instances").update({ idle_warned_at: agora }).eq("id", l.instance_id);
        }
      }
      continue;
    }

    if (dryRun) {
      cortadas++;
      detalhes.push(`X ${quem} — ${dias}d, cortaria (sessionId ${sessoes.get(sufixo(l.phone)) ?? "nao esta no engine"})`);
      continue;
    }

    if (erroSessoes) {
      erros++;
      detalhes.push(`? ${quem} — nao deu para listar sessoes do engine (${erroSessoes}); fica para a proxima`);
      continue;
    }

    const sessionId = sessoes.get(sufixo(l.phone));
    let confirmado = false;
    let comoFoi = "";

    if (!sessionId) {
      // O engine nao tem essa sessao: ela ja nao esta no ar. Marcar desconectada
      // aqui nao inventa nada -- o banco e que estava desatualizado.
      confirmado = true;
      comoFoi = "engine nao tinha a sessao";
    } else {
      try {
        const r = await comTimeout(`${WA_ENGINE_URL}/disconnect/${encodeURIComponent(sessionId)}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${WA_ENGINE_TOKEN}`, "Content-Type": "application/json" },
        });
        if (r.ok) { confirmado = true; comoFoi = "engine confirmou"; }
        else if (r.status === 404) { confirmado = true; comoFoi = "engine devolveu 404 (sessao ja fora)"; }
        else { comoFoi = `engine devolveu HTTP ${r.status}`; }
      } catch (e) {
        comoFoi = `engine nao respondeu: ${(e as Error).message.slice(0, 40)}`;
      }
    }

    if (!confirmado) {
      // Sem confirmacao, o banco NAO e tocado. Foi exatamente o contrario disto
      // que criou a briga de 10 dias.
      erros++;
      detalhes.push(`? ${quem} — corte nao efetivado (${comoFoi}); banco intocado`);
      continue;
    }

    await SB.from("whatsapp_instances").update({
      status: "disconnected",
      disconnect_reason: "inativo_sem_login",
      auto_disconnected_at: agora,
      idle_warned_at: null,
      repair_notice_ack_at: null,
    }).eq("id", l.instance_id);

    cortadas++;
    detalhes.push(`X ${quem} — ${dias}d, DESCONECTADA (${comoFoi})`);

    if (!semAviso) {
      const texto =
        `Sua conexão do WhatsApp com a Mega Links foi encerrada por inatividade ` +
        `(${Math.floor(dias)} dias sem entrar no painel).\n\n` +
        `Nenhum dado seu foi apagado — seus grupos, produtos e links continuam lá. ` +
        `Para voltar a postar, é só entrar e ler o QR Code novamente:\n` +
        `https://www.megalinksbr.com.br`;
      await avisar(SB, l.phone, texto);
    }
  }

  return json({
    ok: true,
    dry_run: dryRun,
    avaliadas: linhas.length,
    aviso_dias: avisoDias,
    corte_dias: corteDias,
    avisadas,
    cortadas,
    reativadas,
    aguardando,
    erros,
    engine_consultado: temCorte,
    erro_engine: erroSessoes,
    duracao_ms: Date.now() - inicio,
    detalhes,
    nota: dryRun ? "DRY RUN — nada foi gravado, avisado ou desconectado." : undefined,
  });
});
