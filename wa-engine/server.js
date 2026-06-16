// =====================================================================
//  MEGA LINKS BR · Motor WhatsApp (Baileys) — servidor de referência
//  Mantém a sessão do WhatsApp aberta e expõe uma API HTTP que as
//  Edge Functions do Supabase consomem:
//    POST /generate-qr   { phone }            -> { qr, status }
//    GET  /check-admin?link=...               -> { role, name, followers, channel_whatsapp_id }
//    POST /send          { channel, product } -> { ok }
//
//  ⚠️  A API oficial de Canais do WhatsApp é restrita. Baileys acessa
//      "newsletters" (canais) de forma não-oficial — use por sua conta
//      e risco, respeitando os Termos do WhatsApp.
//
//  Deploy: Railway / Render / Fly.io / VPS (qualquer host Node 18+).
//  Auth:   header  Authorization: Bearer <WA_ENGINE_TOKEN>
// =====================================================================
import express from "express";
import qrcode from "qrcode";
import pino from "pino";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} from "@whiskeysockets/baileys";

const PORT = process.env.PORT || 8080;
const ENGINE_TOKEN = process.env.WA_ENGINE_TOKEN || "";
const log = pino({ level: process.env.LOG_LEVEL || "info" });

const app = express();
app.use(express.json({ limit: "2mb" }));

// ---- auth simples por bearer token ----
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const auth = req.headers.authorization || "";
  if (!ENGINE_TOKEN || auth !== `Bearer ${ENGINE_TOKEN}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

// =====================================================================
//  Gerenciador de sessões (1 socket por número de telefone)
//  Produção multi-tenant: persista o auth_state por usuário (ex.: S3,
//  Postgres) em vez de pasta local.
// =====================================================================
const sessions = new Map(); // phone -> { sock, status, qr }

async function startSession(phone) {
  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${phone}`);
  const sock = makeWASocket({
    auth: state,
    browser: Browsers.appropriate("MegaLinksBR"),
    logger: log,
    printQRInTerminal: false,
  });
  const entry = { sock, status: "pairing", qr: null };
  sessions.set(phone, entry);

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) entry.qr = qr;
    if (connection === "open") {
      entry.status = "connected";
      entry.qr = null;
      log.info({ phone }, "sessão conectada");
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      entry.status = "disconnected";
      if (code !== DisconnectReason.loggedOut) {
        log.warn({ phone, code }, "reconectando...");
        startSession(phone).catch((e) => log.error(e));
      }
    }
  });
  return entry;
}

// espera o primeiro QR aparecer (ou conexão abrir)
function waitForQR(entry, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (entry.qr || entry.status === "connected" || Date.now() - t0 > timeoutMs) {
        clearInterval(iv);
        resolve(entry);
      }
    }, 250);
  });
}

// =====================================================================
//  POST /generate-qr  { phone }
// =====================================================================
app.post("/generate-qr", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "phone obrigatório" });
    let entry = sessions.get(phone);
    if (!entry || entry.status === "disconnected") entry = await startSession(phone);
    await waitForQR(entry);
    if (entry.status === "connected") return res.json({ status: "connected" });
    if (!entry.qr) return res.status(504).json({ error: "qr_timeout" });
    const dataUrl = await qrcode.toDataURL(entry.qr); // PNG base64 p/ exibir no front
    res.json({ status: "pairing", qr: dataUrl });
  } catch (e) {
    log.error(e);
    res.status(500).json({ error: String(e) });
  }
});

// =====================================================================
//  GET /check-admin?link=...  -> valida papel no canal (OWNER/ADMIN)
//  Regra de negócio: só pode vincular se role ∈ {owner, admin}.
// =====================================================================
app.get("/check-admin", async (req, res) => {
  try {
    const link = String(req.query.link || "");
    const code = link.split("/channel/")[1]?.split(/[/?]/)[0];
    if (!code) return res.status(400).json({ error: "link de canal inválido" });

    // pega qualquer sessão conectada para consultar os metadados
    const conn = [...sessions.values()].find((s) => s.status === "connected");
    if (!conn) return res.status(409).json({ error: "nenhuma sessão conectada" });

    // Baileys: metadados do canal via código de convite
    const meta = await conn.sock.newsletterMetadata("invite", code);
    const role = (meta?.viewer_metadata?.role || "unknown").toLowerCase(); // owner|admin|subscriber|guest
    const allowed = role === "owner" || role === "admin";
    res.json({
      allowed,
      role,
      name: meta?.name,
      followers: meta?.subscribers_count,
      channel_whatsapp_id: meta?.id, // ...@newsletter
    });
  } catch (e) {
    log.error(e);
    res.status(500).json({ error: String(e) });
  }
});

// =====================================================================
//  POST /send  { channel, product }  -> publica no canal
//  Prioriza vídeo sobre imagem (regra de negócio).
// =====================================================================
function buildCaption(p) {
  const preco = p.price != null ? `R$ ${Number(p.price).toFixed(2).replace(".", ",")}` : "";
  const off = p.discount_pct ? ` (-${p.discount_pct}%)` : "";
  return [
    `🔥 *${p.title}*`,
    preco ? `💸 ${preco}${off}` : "",
    `👉 ${p.affiliate_url}`,
  ].filter(Boolean).join("\n");
}

app.post("/send", async (req, res) => {
  try {
    const { channel, product } = req.body;
    const jid = channel?.channel_whatsapp_id; // ...@newsletter
    if (!jid) return res.status(400).json({ error: "channel_whatsapp_id ausente" });

    const conn = [...sessions.values()].find((s) => s.status === "connected");
    if (!conn) return res.status(409).json({ error: "nenhuma sessão conectada" });

    const caption = buildCaption(product);
    let msg;
    if (product.video_url) {
      msg = { video: { url: product.video_url }, caption };       // prioridade de vídeo
    } else if (product.image_url) {
      msg = { image: { url: product.image_url }, caption };
    } else {
      msg = { text: caption };
    }
    const r = await conn.sock.sendMessage(jid, msg);
    res.json({ ok: true, message_id: r?.key?.id });
  } catch (e) {
    log.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true, sessions: sessions.size }));

app.listen(PORT, () => log.info(`Mega Links WA engine on :${PORT}`));
