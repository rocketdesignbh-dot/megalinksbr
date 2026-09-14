// Mega Links BR · Edge Function "send-video-post" v1 — Post Vídeo agendado (Elite+)
// Ver docs/DESENHO_post_video_agendado.md para o desenho completo.
//
// Cron de 15 em 15 min (mesmo motor do send-post): varre video_posts com
// status='pending' e scheduled_at<=now, envia o vídeo por grupo (video_post_groups,
// status por grupo — decisão adotada em vez de tudo-ou-nada) e só apaga o
// arquivo do Storage quando TODOS os grupos confirmaram envio. Retry é manual
// nesta v1 (decisão do Érico) — grupo que falhou fica 'failed' até reagendar
// à mão; o vídeo NÃO é apagado enquanto houver grupo não confirmado.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET  = Deno.env.get("CRON_SECRET") ?? "";
const ENGINE_URL   = Deno.env.get("WA_ENGINE_URL") ?? "";
const ENGINE_TOKEN = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

// Vídeo é maior que imagem — a URL assinada do Storage soma tempo de download
// no wa-engine antes do Baileys aceitar o envio.
const ENGINE_TIMEOUT_MS = 45000;
const SIGNED_URL_TTL_S = 300; // 5 min — só precisa durar até o wa-engine baixar

function ehSessaoMorta(status: number, corpo: string): boolean {
  if (status !== 404) return false;
  const c = corpo.toLowerCase();
  return c.includes("sess") && (
    c.includes("não encontrada") || c.includes("nao encontrada") ||
    c.includes("not found")      || c.includes("não pareada") ||
    c.includes("nao pareada")    || c.includes("not paired")
  );
}
async function lerCorpo(r: Response): Promise<string> {
  try { return (await r.text()).replace(/\s+/g, " ").trim(); } catch { return ""; }
}
function descreverExcecao(canal: string, e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return `${canal}: ${msg.replace(/\s+/g, " ").trim().slice(0, 160)}`;
}
async function fetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret") ?? "";
  const auth   = req.headers.get("authorization") ?? "";
  const ok = (CRON_SECRET && secret === CRON_SECRET) || auth === `Bearer ${SERVICE_ROLE}`;
  if (!ok) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  const sb  = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();

  const { data: candidatos, error: cErr } = await sb
    .from("video_posts")
    .select("id, user_id, video_storage_path, product_link, short_link, caption")
    .eq("status", "pending")
    .lte("scheduled_at", now.toISOString())
    .limit(20);
  if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500 });
  if (!candidatos?.length) return new Response(JSON.stringify({ processed: 0 }), { status: 200 });

  let processed = 0;
  const instanciasDerrubadas: string[] = [];

  for (const vp of candidatos) {
    // Trava otimista: só processa quem eu mesmo consegui virar 'sending' —
    // se outra rodada do cron já pegou este registro, o update afeta 0 linhas.
    const { data: claimed } = await sb
      .from("video_posts")
      .update({ status: "sending" })
      .eq("id", vp.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    processed++;

    const { data: grupos, error: gErr } = await sb
      .from("video_post_groups")
      .select("id, group_id, status")
      .eq("video_post_id", vp.id)
      .eq("status", "pending");
    if (gErr || !grupos?.length) {
      await sb.from("video_posts").update({
        status: "failed",
        error_message: gErr?.message ?? "sem grupos de destino pendentes",
      }).eq("id", vp.id);
      continue;
    }

    const { data: signed } = await sb.storage
      .from("video-posts")
      .createSignedUrl(vp.video_storage_path, SIGNED_URL_TTL_S);
    if (!signed?.signedUrl) {
      await sb.from("video_posts").update({
        status: "failed",
        error_message: "não consegui gerar URL assinada do vídeo no Storage",
      }).eq("id", vp.id);
      continue;
    }
    const videoUrl = signed.signedUrl;
    const caption = vp.caption ? `${vp.caption}\n\n${vp.short_link || vp.product_link}` : (vp.short_link || vp.product_link);

    const { data: instance } = await sb.from("whatsapp_instances")
      .select("id, phone")
      .eq("user_id", vp.user_id)
      .eq("status", "connected")
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let algumEnviado = false;
    let algumFalhou = false;
    let erroGeral: string | null = null;

    if (!instance || !ENGINE_URL) {
      erroGeral = "WhatsApp: nenhuma instância conectada — repareie o aparelho";
      algumFalhou = true;
      for (const vg of grupos) {
        await sb.from("video_post_groups").update({ status: "failed", error_message: erroGeral }).eq("id", vg.id);
      }
    } else {
      const phoneClean = instance.phone.replace(/\D/g, "");
      let sessaoMorta = false;

      for (const vg of grupos) {
        const { data: waGroups } = await sb.from("whatsapp_groups")
          .select("group_jid, name")
          .eq("niche_group_id", vg.group_id);
        if (!waGroups?.length) {
          algumFalhou = true;
          await sb.from("video_post_groups").update({ status: "failed", error_message: "grupo sem WhatsApp vinculado (group_jid)" }).eq("id", vg.id);
          continue;
        }
        if (sessaoMorta) {
          algumFalhou = true;
          await sb.from("video_post_groups").update({ status: "failed", error_message: "sessão do WhatsApp caiu durante o envio" }).eq("id", vg.id);
          continue;
        }

        let falhouEsteGrupo = false;
        let ultimoErro = "";
        for (const wg of waGroups) {
          if (!wg.group_jid) { falhouEsteGrupo = true; ultimoErro = "sem group_jid"; continue; }
          const rotulo = `WA grupo "${wg.name ?? wg.group_jid}"`;
          try {
            const r = await fetchWithTimeout(`${ENGINE_URL}/send-group`, {
              method: "POST",
              headers: { "content-type": "application/json", authorization: `Bearer ${ENGINE_TOKEN}` },
              body: JSON.stringify({ sessionPhone: phoneClean, groupId: wg.group_jid, text: caption, videoUrl, userId: vp.user_id }),
            }, ENGINE_TIMEOUT_MS);
            if (!r.ok) {
              const corpo = await lerCorpo(r);
              falhouEsteGrupo = true;
              ultimoErro = `HTTP ${r.status} — ${corpo.slice(0, 160)}`;
              if (ehSessaoMorta(r.status, corpo)) {
                sessaoMorta = true;
                await sb.from("whatsapp_instances").update({ status: "disconnected", idle_since: now.toISOString(), disconnect_requested_at: now.toISOString() }).eq("id", instance.id);
                instanciasDerrubadas.push(instance.phone);
              }
              console.error(`[VIDEO-POST] ${rotulo}: ${ultimoErro}`);
            }
          } catch (e) {
            falhouEsteGrupo = true;
            ultimoErro = descreverExcecao(rotulo, e);
            console.error(`[VIDEO-POST] ${ultimoErro}`);
          }
        }

        if (falhouEsteGrupo) {
          algumFalhou = true;
          await sb.from("video_post_groups").update({ status: "failed", error_message: ultimoErro.slice(0, 300) }).eq("id", vg.id);
        } else {
          algumEnviado = true;
          await sb.from("video_post_groups").update({ status: "sent", sent_at: now.toISOString() }).eq("id", vg.id);
        }
      }
    }

    let statusFinal: string;
    if (algumEnviado && !algumFalhou) statusFinal = "sent";
    else if (algumEnviado && algumFalhou) statusFinal = "partial_failed";
    else statusFinal = "failed";

    await sb.from("video_posts").update({
      status: statusFinal,
      sent_at: statusFinal === "sent" ? now.toISOString() : null,
      error_message: erroGeral,
    }).eq("id", vp.id);

    // Só apaga o arquivo quando TODOS os grupos confirmaram — grupo que falhou
    // ainda precisa do vídeo disponível pra um reagendamento manual.
    if (statusFinal === "sent") {
      await sb.storage.from("video-posts").remove([vp.video_storage_path]);
    }
  }

  return new Response(JSON.stringify({ processed, instanciasDerrubadas }), { status: 200 });
});
