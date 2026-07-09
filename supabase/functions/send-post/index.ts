// Mega Links BR · Edge Function "send-post" v4
// WhatsApp + Telegram no Post Auto — agora com CTA (fixo/aleatório), cupom e Grupos WA
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET   = Deno.env.get("CRON_SECRET") ?? "";
const ENGINE_URL    = Deno.env.get("WA_ENGINE_URL") ?? "";
const ENGINE_TOKEN  = Deno.env.get("WA_ENGINE_TOKEN") ?? "";

// Mesma lista de CTAs do Post Relâmpago (frontend) — mantenha sincronizada com PR_CTAS no index.html
const CTAS = [
  "⚡ Corre! Esse preço dura minutos.",
  "🛒 Toque no link antes que esgote!",
  "💸 Cupom ativo SÓ HOJE — aproveita!",
  "🔥 Oferta relâmpago! Não perca essa.",
  "😱 Achei esse preço e vim compartilhar!",
  "🎯 Melhor preço que encontrei hoje.",
  "✅ Testei e aprovei — vale muito a pena!",
  "🚀 Limitado! Corra antes que acabe.",
];
function sortearCta(): string {
  return CTAS[Math.floor(Math.random() * CTAS.length)];
}

async function fetchWithTimeout(url: string, opts: RequestInit, ms = 10000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret") ?? "";
  const auth   = req.headers.get("authorization") ?? "";
  const ok = (CRON_SECRET && secret === CRON_SECRET) || auth === `Bearer ${SERVICE_ROLE}`;
  if (!ok) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  const sb  = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const brHour = ((now.getUTCHours() - 3) % 24 + 24) % 24;

  const { data: groups, error: gErr } = await sb
    .from("niche_groups")
    .select("id, user_id, name, interval_minutes, start_hour, end_hour, cursor_index, last_post_at")
    .eq("post_auto_enabled", true);

  if (gErr) return new Response(JSON.stringify({ error: gErr.message }), { status: 500 });
  if (!groups?.length) return new Response(JSON.stringify({ processed: 0, msg: "no active groups" }));

  let totalSent = 0, totalFailed = 0, totalSkipped = 0;

  for (const group of groups) {
    const startH = group.start_hour ?? 0;
    const endH   = group.end_hour   ?? 23;
    const inWindow = startH <= endH
      ? brHour >= startH && brHour <= endH
      : brHour >= startH || brHour <= endH;
    if (!inWindow) { totalSkipped++; continue; }

    const intervalMs = (group.interval_minutes ?? 10) * 60 * 1000;
    const lastPost   = group.last_post_at ? new Date(group.last_post_at).getTime() : 0;
    if (Date.now() - lastPost < intervalMs) { totalSkipped++; continue; }

    const { data: products } = await sb
      .from("products")
      .select("id, title, affiliate_url, image_url, price, discount_pct, coupon_code, cta_text, cta_random")
      .eq("niche_group_id", group.id)
      .order("position");
    if (!products?.length) { totalSkipped++; continue; }

    const cursor     = (group.cursor_index ?? 0) % products.length;
    const product    = products[cursor];
    const nextCursor = (cursor + 1) % products.length;

    // CTA: sorteia a cada disparo se cta_random=true; senão usa cta_text fixo (se houver)
    const cta = product.cta_random ? sortearCta() : (product.cta_text || "");

    const priceStr = product.price ? `R$ ${Number(product.price).toFixed(2).replace(".", ",")}` : "";
    const discStr  = product.discount_pct ? `🔥 ${product.discount_pct}% OFF` : "";
    const cupomStr = product.coupon_code ? `🏷️ Utilize o cupom: ${product.coupon_code}` : "";
    const msg = [
      product.title,
      discStr && priceStr ? `${discStr} — ${priceStr}` : discStr || priceStr,
      cupomStr,
      cta,
      product.affiliate_url,
    ].filter(Boolean).join("\n");

    let groupSent = 0, groupFailed = 0;

    // ── WhatsApp ────────────────────────────────────────────
    if (ENGINE_URL) {
      const { data: instance } = await sb
        .from("whatsapp_instances")
        .select("phone")
        .eq("user_id", group.user_id)
        .eq("status", "connected")
        .maybeSingle();

      if (instance) {
        const phoneClean = instance.phone.replace(/\D/g, "");

        // Grupos WA (prioridade — destino principal)
        const { data: waGroups } = await sb
          .from("whatsapp_groups")
          .select("group_jid, name")
          .eq("niche_group_id", group.id);

        for (const wg of waGroups ?? []) {
          if (!wg.group_jid) continue;
          try {
            const r = await fetchWithTimeout(`${ENGINE_URL}/send-group`, {
              method: "POST",
              headers: { "content-type": "application/json", authorization: `Bearer ${ENGINE_TOKEN}` },
              body: JSON.stringify({
                sessionPhone: phoneClean,
                groupId: wg.group_jid,
                text: msg,
                imageUrl: product.image_url || undefined,
                userId: group.user_id,
              }),
            });
            if (!r.ok) throw new Error(`engine ${r.status}`);
            groupSent++;
          } catch (e) {
            console.error(`[WA-GRUPO] grupo ${group.id} jid ${wg.group_jid}:`, e);
            groupFailed++;
          }
        }

        // Canais WA
        const { data: waChannels } = await sb
          .from("whatsapp_channels")
          .select("channel_whatsapp_id, channel_link")
          .eq("niche_group_id", group.id);

        for (const ch of waChannels ?? []) {
          const channelId = ch.channel_whatsapp_id || ch.channel_link;
          if (!channelId) continue;
          try {
            const r = await fetchWithTimeout(`${ENGINE_URL}/send`, {
              method: "POST",
              headers: { "content-type": "application/json", authorization: `Bearer ${ENGINE_TOKEN}` },
              body: JSON.stringify({
                sessionPhone: phoneClean,
                channelId,
                text: msg,
                imageUrl: product.image_url || undefined,
                userId: group.user_id,
              }),
            });
            if (!r.ok) throw new Error(`engine ${r.status}`);
            groupSent++;
          } catch (e) {
            console.error(`[WA-CANAL] grupo ${group.id} canal ${channelId}:`, e);
            groupFailed++;
          }
        }
      }
    }

    // ── Telegram ────────────────────────────────────────────
    const { data: tgChannels } = await sb
      .from("telegram_channels")
      .select("chat_id, username")
      .eq("niche_group_id", group.id);

    for (const tg of tgChannels ?? []) {
      const chatId = tg.chat_id || tg.username;
      if (!chatId) continue;
      try {
        const payload: Record<string, unknown> = { action: "send", chatId };
        if (product.image_url) {
          payload.type    = "photo";
          payload.photo   = product.image_url;
          payload.caption = msg;
        } else {
          payload.type = "text";
          payload.text = msg;
        }
        const r = await fetchWithTimeout(
          `${SUPABASE_URL}/functions/v1/telegram-send`,
          {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_ROLE}` },
            body: JSON.stringify(payload),
          },
        );
        if (!r.ok) throw new Error(`tg-send ${r.status}`);
        const d = await r.json();
        if (!d.ok && !d.success) throw new Error(d.error ?? "telegram error");
        groupSent++;
      } catch (e) {
        console.error(`[TG] grupo ${group.id} chat ${chatId}:`, e);
        groupFailed++;
      }
    }

    // Histórico
    await sb.from("scheduled_posts").insert({
      user_id:       group.user_id,
      group_id:      group.id,
      product_id:    product.id,
      status:        groupSent > 0 ? "sent" : "failed",
      scheduled_for: now.toISOString(),
      sent_at:       groupSent > 0 ? now.toISOString() : null,
      error:         groupFailed > 0 ? `${groupFailed} canais falharam` : null,
    });

    // Atualiza cursor
    await sb.from("niche_groups").update({
      cursor_index: nextCursor,
      last_post_at: now.toISOString(),
    }).eq("id", group.id);

    totalSent   += groupSent;
    totalFailed += groupFailed;
  }

  return new Response(
    JSON.stringify({ groups: groups.length, sent: totalSent, failed: totalFailed, skipped: totalSkipped }),
    { headers: { "content-type": "application/json" } },
  );
});
