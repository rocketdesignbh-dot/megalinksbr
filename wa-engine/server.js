/**
 * Mega Links BR - WhatsApp Engine
 * Motor de automação WhatsApp baseado em Baileys
 * 
 * Endpoints:
 * - POST /pair → Gera QR code para pareamento
 * - GET /pair-status/:sessionId → Verifica status do QR
 * - GET /sessions → Lista todas as sessões ativas
 * - POST /send → Envia mensagem/post para canal
 * - POST /send-message → Envia mensagem direta
 * - POST /send-post → Processa posts agendados
 * - POST /radar → Atualiza offers do Radar
 * - GET /health → Status do servidor
 */

const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs-extra');

// Baileys precisa do crypto disponível globalmente (Node não expõe por padrão)
if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = require('crypto').webcrypto;
}

dotenv.config();

const app = express();
app.use(express.json());

// CORS - Permitir requisições do frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// CONFIG
const PORT = process.env.PORT || 8080;
const WA_ENGINE_TOKEN = process.env.WA_ENGINE_TOKEN || '967af5489aaa0e9099ddcda58c2f7a6316088be0d2b80d3ec61bc38d36853451';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nxlfezpagporealqqbfj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_FQTFJaF46KfwSnODD5UjPA_nOagscIu';

// STORAGE
const AUTH_DIR = path.join(__dirname, '.auth');
const SESSIONS = new Map(); // sessionId -> { status, qr, socket, phoneNumber, createdAt }

// ============ MIDDLEWARE ============
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== WA_ENGINE_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// ============ QR CODE ============
async function connectSession(sessionId, authPath, phoneNumber = null, isReconnect = false) {
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    if (!isReconnect) {
        console.log(`[PAIR] Usando WhatsApp Web versão: ${version.join('.')}`);
    }

    const socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Mega Links BR', 'Chrome', '120.0.0'],
        qrTimeout: 40000,
    });

    socket.ev.on('creds.update', saveCreds);

    if (!SESSIONS.has(sessionId)) {
        SESSIONS.set(sessionId, {
            status: 'waiting',
            qr: null,
            socket,
            saveCreds,
            authPath,
            phoneNumber: null,
            createdAt: Date.now(),
            timeout: setTimeout(() => {
                const s = SESSIONS.get(sessionId);
                if (s && s.status !== 'paired') {
                    SESSIONS.delete(sessionId);
                    try { socket.end(); } catch (e) {}
                }
            }, 5 * 60 * 1000)
        });
    } else {
        const s = SESSIONS.get(sessionId);
        s.socket = socket;
    }

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                const qrImage = await QRCode.toDataURL(qr, {
                    width: 300, margin: 2,
                    color: { dark: '#000000', light: '#FFFFFF' }
                });
                const s = SESSIONS.get(sessionId);
                if (s) { s.qr = qrImage; s.status = 'waiting'; }
                console.log(`[QR] Sessão ${sessionId} — QR gerado/atualizado`);
            } catch (err) {
                console.error('[QR] Erro ao gerar imagem QR:', err);
            }
        }

        if (connection === 'open') {
            const connectedNumber = socket.user?.id?.split(':')[0]?.split('@')[0];
            console.log(`[PAIRED] Sessão ${sessionId} conectada: ${connectedNumber}`);

            const session = SESSIONS.get(sessionId) || {};
            session.status = 'paired';
            session.phoneNumber = connectedNumber;
            session.socket = socket;
            session.authPath = authPath;
            if (session.timeout) clearTimeout(session.timeout);
            SESSIONS.set(sessionId, session);
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`[DISCONNECTED] Sessão ${sessionId}: código ${reason}`);

            if (reason === DisconnectReason.restartRequired) {
                console.log(`[RESTART] Reconectando sessão ${sessionId} após pareamento...`);
                try {
                    await connectSession(sessionId, authPath, null, true);
                } catch (e) {
                    console.error(`[RESTART] Falha ao reconectar ${sessionId}:`, e.message);
                }
            } else if (reason === DisconnectReason.loggedOut) {
                SESSIONS.delete(sessionId);
                await fs.remove(authPath).catch(() => {});
            } else if (reason === 408) {
                const s = SESSIONS.get(sessionId);
                if (s && s.status !== 'paired') { s.status = 'expired'; }
            }
        }
    });

    return socket;
}

app.post('/pair', verifyToken, async (req, res) => {
    try {
        const sessionId = generateSessionId();
        const authPath = path.join(AUTH_DIR, sessionId);
        await fs.ensureDir(authPath);

        await connectSession(sessionId, authPath);

        let attempts = 0;
        while (attempts < 30) {
            const s = SESSIONS.get(sessionId);
            if (s?.qr) break;
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }

        const session = SESSIONS.get(sessionId);
        if (!session?.qr) {
            return res.status(500).json({ error: 'Falha ao gerar QR code' });
        }

        res.json({
            sessionId,
            qr: session.qr,
            expiresIn: 300
        });

    } catch (error) {
        console.error('[PAIR] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/pair-status/:sessionId', verifyToken, (req, res) => {
    const { sessionId } = req.params;
    const session = SESSIONS.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found or expired' });
    }

    res.json({
        status: session.status,
        sessionId,
        qr: session.status === 'waiting' ? session.qr : null,
        phoneNumber: session.phoneNumber,
        expiresIn: Math.max(0, 5 * 60 * 1000 - (Date.now() - session.createdAt))
    });
});

// ============ SESSIONS LIST ============
/**
 * GET /sessions
 * Lista todas as sessões ativas — usado pelo admin e pelo renderInstCard
 */
app.get('/sessions', verifyToken, (req, res) => {
    const sessions = [];
    for (const [sessionId, s] of SESSIONS) {
        sessions.push({
            sessionId,
            phone: s.phoneNumber ? '+' + s.phoneNumber : null,
            status: s.status === 'paired' ? 'connected' : s.status,
            lastSeen: s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString('pt-BR') : 'agora',
            createdAt: new Date(s.createdAt).toISOString(),
        });
    }
    res.json({ sessions, total: sessions.length });
});

// ============ DISCONNECT ============
app.post('/disconnect/:sessionId', verifyToken, async (req, res) => {
    const { sessionId } = req.params;
    const session = SESSIONS.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    try {
        session.socket.end();
        clearTimeout(session.timeout);
        SESSIONS.delete(sessionId);
        
        const authPath = path.join(AUTH_DIR, sessionId);
        await fs.remove(authPath);

        res.json({ message: 'Session disconnected' });
    } catch (error) {
        console.error('[DISCONNECT] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ WHATSAPP ACTIONS ============
/**
 * POST /send
 * Envia mensagem ou imagem para um canal/grupo
 * Body: { sessionPhone, channelId, text, imageUrl? }
 */
app.post('/send', verifyToken, async (req, res) => {
    const { sessionPhone, channelId, text, imageUrl } = req.body;

    if (!channelId || !text) {
        return res.status(400).json({ error: 'channelId e text são obrigatórios' });
    }

    // Encontra sessão pelo número
    let session = null;
    if (sessionPhone) {
        const phone = String(sessionPhone).replace(/\D/g, '');
        for (const [, s] of SESSIONS) {
            if (s.status === 'paired' && String(s.phoneNumber).replace(/\D/g, '') === phone) {
                session = s;
                break;
            }
        }
    }
    // Fallback: primeira sessão paired disponível
    if (!session) {
        for (const [, s] of SESSIONS) {
            if (s.status === 'paired') { session = s; break; }
        }
    }

    if (!session) {
        return res.status(404).json({ error: 'Nenhuma sessão WhatsApp conectada' });
    }

    try {
        // Normaliza JID do canal
        let jid = channelId;
        if (!jid.includes('@')) {
            jid = jid.replace(/\D/g, '') + (jid.includes('-') ? '@g.us' : '@newsletter');
        }

        if (imageUrl) {
            await session.socket.sendMessage(jid, {
                image: { url: imageUrl },
                caption: text,
            });
        } else {
            await session.socket.sendMessage(jid, { text });
        }

        session.lastSeenAt = Date.now();
        res.json({ ok: true });
    } catch (error) {
        console.error('[SEND] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /send-message
 * Envia mensagem direta para número
 */
app.post('/send-message', verifyToken, async (req, res) => {
    const { sessionId, phoneNumber, message } = req.body;

    if (!sessionId || !phoneNumber || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = SESSIONS.get(sessionId);
    if (!session || session.status !== 'paired') {
        return res.status(404).json({ error: 'Session not paired' });
    }

    try {
        const jid = phoneNumber.includes('@') ? phoneNumber : phoneNumber + '@s.whatsapp.net';
        await session.socket.sendMessage(jid, { text: message });
        res.json({ message: 'Message sent' });
    } catch (error) {
        console.error('[SEND] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /send-post
 * Processado via CRON — agora a lógica está na Edge Function send-post
 */
app.post('/send-post', verifyToken, async (req, res) => {
    res.json({ message: 'Use a Edge Function send-post via Supabase', processed: 0 });
});

/**
 * POST /radar
 * Atualiza ofertas do Radar (chamado via CRON)
 */
app.post('/radar', verifyToken, async (req, res) => {
    try {
        console.log('[RADAR] Atualizando ofertas...');
        res.json({ message: 'Radar updated', offers: 0 });
    } catch (error) {
        console.error('[RADAR] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});


/**
 * GET /groups
 * Lista grupos e canais WhatsApp da sessão ativa
 */
app.get('/groups', verifyToken, async (req, res) => {
    let session = null;
    for (const [, s] of SESSIONS) {
        if (s.status === 'paired') { session = s; break; }
    }

    if (!session) {
        return res.status(404).json({ error: 'Nenhuma sessão conectada' });
    }

    try {
        const groups = await session.socket.groupFetchAllParticipating();
        const list = Object.values(groups).map(g => ({
            id: g.id,
            name: g.subject || g.id,
            participants: g.participants?.length || 0,
            isAdmin: g.participants?.some(p => {
                const pid = (p.id || '').split(':')[0].split('@')[0];
                return pid === session.phoneNumber && (p.admin === 'admin' || p.admin === 'superadmin');
            }) || false,
        }));
        res.json({ groups: list, total: list.length });
    } catch (e) {
        console.error('[GROUPS] Erro:', e.message);
        res.status(500).json({ error: e.message, groups: [] });
    }
});

// ============ HEALTH ============
app.get('/health', (req, res) => {
    res.json({
        ok: true,
        uptime: process.uptime(),
        sessions: SESSIONS.size,
        timestamp: new Date().toISOString()
    });
});

// ============ STARTUP ============
async function startup() {
    try {
        await fs.ensureDir(AUTH_DIR);

        // Limpar sessões antigas (> 6 horas)
        setInterval(() => {
            const now = Date.now();
            const MAX_AGE = 6 * 60 * 60 * 1000;
            for (const [sessionId, session] of SESSIONS) {
                if (now - session.createdAt > MAX_AGE) {
                    console.log(`[CLEANUP] Removendo sessão expirada: ${sessionId}`);
                    session.socket.end();
                    clearTimeout(session.timeout);
                    SESSIONS.delete(sessionId);
                }
            }
        }, 60 * 60 * 1000);

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════╗
║  🚀 Mega Links BR - wa-engine      ║
║  Rodando em porta ${PORT}              ║
╚════════════════════════════════════╝

Endpoints disponíveis:
  POST   /pair                 → Gerar QR code
  GET    /pair-status/:id      → Verificar status
  GET    /sessions             → Listar sessões ativas
  POST   /send                 → Enviar para canal/grupo
  POST   /send-message         → Enviar mensagem direta
  POST   /send-post            → Processar posts (CRON)
  POST   /radar                → Atualizar ofertas (CRON)
  POST   /disconnect/:id       → Desconectar sessão
  GET    /health               → Status

Autenticação: Bearer token (WA_ENGINE_TOKEN)
            `);
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar:', error);
        process.exit(1);
    }
}

// ============ HELPERS ============
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

startup();

process.on('SIGINT', async () => {
    console.log('\n🛑 Desligando wa-engine...');
    for (const [sessionId, session] of SESSIONS) {
        try {
            session.socket.end();
            clearTimeout(session.timeout);
        } catch (err) {
            console.error(`Erro ao desconectar ${sessionId}:`, err);
        }
    }
    process.exit(0);
});
