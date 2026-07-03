/**
 * Mega Links BR - WhatsApp Engine  v3
 * Motor de automação WhatsApp baseado em Baileys
 * 
 * MUDANÇAS v3 (fix crítico):
 * - Deduplicação: apenas 1 sessão por número de telefone
 * - Conflito (440) não reconecta — deixa a outra sessão vencer
 * - Restore agrupa por phone e mantém só a mais recente
 * - On connect: mata sessões duplicadas do mesmo número
 * 
 * v2: Sessões persistentes, auto-restore, backoff exponencial
 * 
 * REQUISITO: Volume persistente montado em /app/.auth no EasyPanel
 * 
 * Endpoints:
 * - POST /pair → Gera QR code para pareamento
 * - GET /pair-status/:sessionId → Verifica status do QR
 * - GET /sessions → Lista todas as sessões ativas
 * - POST /send → Envia mensagem/post para canal
 * - POST /send-message → Envia mensagem direta
 * - POST /send-post → Stub (lógica real na Edge Function)
 * - POST /radar → Stub
 * - POST /disconnect/:sessionId → Desconecta sessão
 * - POST /reconnect/:phone → Força reconexão de sessão salva
 * - GET /groups → Lista grupos do WhatsApp
 * - GET /health → Status do servidor
 */

const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs-extra');
const RateLimitValidator = require('./rate-limit-utils');

if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = require('crypto').webcrypto;
}

dotenv.config();

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// CONFIG
const PORT = process.env.PORT || 8080;
const WA_ENGINE_TOKEN = process.env.WA_ENGINE_TOKEN;
if (!WA_ENGINE_TOKEN) {
    console.error('❌ WA_ENGINE_TOKEN não configurado nas variáveis de ambiente. Configure no EasyPanel antes de iniciar.');
    process.exit(1);
}
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nxlfezpagporealqqbfj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_FQTFJaF46KfwSnODD5UjPA_nOagscIu';

// ─── RATE LIMITING ───
const rateLimiter = new RateLimitValidator(SUPABASE_URL, SUPABASE_KEY);
console.log('[RATE_LIMIT] Validador inicializado');

// STORAGE
const AUTH_DIR = path.join(__dirname, '.auth');
const SESSIONS = new Map(); // sessionId -> { status, qr, socket, phoneNumber, ... }

// Controle de reconexão — backoff exponencial por sessão
const RECONNECT_ATTEMPTS = new Map(); // sessionId -> { count, lastAttempt }
const MAX_RECONNECT_ATTEMPTS = 15;
const BASE_RECONNECT_DELAY = 3000; // 3s inicial, dobra até ~49s

// ============ MIDDLEWARE ============
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== WA_ENGINE_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// ============ SESSION MANAGEMENT ============
/**
 * connectSession — cria ou reconecta uma sessão Baileys
 * @param {string} sessionId   ID único da sessão
 * @param {string} authPath    Caminho da pasta de credenciais
 * @param {string|null} phoneNumber  Número esperado (null se novo par)
 * @param {boolean} isReconnect  Se é reconexão automática
 */
async function connectSession(sessionId, authPath, phoneNumber = null, isReconnect = false) {
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const label = isReconnect ? 'RECONECT' : 'PAIR';
    console.log(`[${label}] Sessão ${sessionId} — Baileys ${version.join('.')}${phoneNumber ? ' · phone ' + phoneNumber : ''}`);

    const socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Mega Links BR', 'Chrome', '120.0.0'],
        qrTimeout: isReconnect ? 0 : 40000, // reconexão não precisa de QR
        connectTimeoutMs: 30000,
        keepAliveIntervalMs: 25000, // heartbeat para manter conexão viva
    });

    socket.ev.on('creds.update', saveCreds);

    // Cria ou atualiza entrada no Map
    if (!SESSIONS.has(sessionId)) {
        const timeout = isReconnect ? null : setTimeout(() => {
            const s = SESSIONS.get(sessionId);
            if (s && s.status !== 'paired') {
                console.log(`[TIMEOUT] Sessão QR ${sessionId} expirou sem par.`);
                SESSIONS.delete(sessionId);
                try { socket.end(); } catch (e) {}
            }
        }, 5 * 60 * 1000);

        SESSIONS.set(sessionId, {
            status: isReconnect ? 'reconnecting' : 'waiting',
            qr: null,
            socket,
            saveCreds,
            authPath,
            phoneNumber: phoneNumber || null,
            createdAt: Date.now(),
            connectedAt: null,
            timeout,
        });
    } else {
        const s = SESSIONS.get(sessionId);
        s.socket = socket;
        s.status = isReconnect ? 'reconnecting' : 'waiting';
    }

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // ── QR gerado (só em par novo, nunca em reconexão) ──
        if (qr) {
            try {
                const qrImage = await QRCode.toDataURL(qr, {
                    width: 300, margin: 2,
                    color: { dark: '#000000', light: '#FFFFFF' }
                });
                const s = SESSIONS.get(sessionId);
                if (s) { s.qr = qrImage; s.status = 'waiting'; }
                console.log(`[QR] Sessão ${sessionId} — QR gerado`);
            } catch (err) {
                console.error('[QR] Erro ao gerar imagem QR:', err);
            }
        }

        // ── Conexão aberta ──
        if (connection === 'open') {
            const connectedNumber = socket.user?.id?.split(':')[0]?.split('@')[0];
            console.log(`[CONNECTED] Sessão ${sessionId} online: ${connectedNumber}`);

            // ── Mata sessões duplicadas do mesmo número ──
            for (const [otherId, otherSession] of SESSIONS) {
                if (otherId !== sessionId) {
                    const otherPhone = String(otherSession.phoneNumber || '').replace(/\D/g, '');
                    if (otherPhone && otherPhone === connectedNumber) {
                        console.log(`[DEDUP] Removendo sessão duplicada ${otherId} (mesmo número ${connectedNumber})`);
                        try { otherSession.socket?.end(); } catch (e) {}
                        if (otherSession.timeout) clearTimeout(otherSession.timeout);
                        SESSIONS.delete(otherId);
                        RECONNECT_ATTEMPTS.delete(otherId);
                        // Remove auth files da sessão duplicada
                        if (otherSession.authPath) fs.remove(otherSession.authPath).catch(() => {});
                    }
                }
            }

            const session = SESSIONS.get(sessionId) || {};
            session.status = 'paired';
            session.phoneNumber = connectedNumber;
            session.socket = socket;
            session.authPath = authPath;
            session.connectedAt = Date.now();
            if (session.timeout) { clearTimeout(session.timeout); session.timeout = null; }
            SESSIONS.set(sessionId, session);

            // Reset reconexão — sessão está saudável
            RECONNECT_ATTEMPTS.delete(sessionId);

            // Salva metadados para restauração futura
            const metaFile = path.join(authPath, '_meta.json');
            await fs.writeJson(metaFile, {
                sessionId,
                phoneNumber: connectedNumber,
                connectedAt: new Date().toISOString(),
            }).catch(e => console.warn('[META] Erro ao salvar:', e.message));
        }

        // ── Desconexão ──
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const msg = lastDisconnect?.error?.message || 'unknown';
            console.log(`[DISCONNECTED] Sessão ${sessionId}: código ${reason} — ${msg}`);

            if (reason === DisconnectReason.loggedOut) {
                // Usuário deslogou pelo celular — limpa tudo
                console.log(`[LOGOUT] Sessão ${sessionId} deslogada pelo usuário.`);
                SESSIONS.delete(sessionId);
                RECONNECT_ATTEMPTS.delete(sessionId);
                await fs.remove(authPath).catch(() => {});
                return;
            }

            // ── Conflito (440): outra sessão do mesmo número tomou conta ──
            if (reason === 440) {
                console.log(`[CONFLICT] Sessão ${sessionId} substituída por outra sessão. Não reconectar.`);
                SESSIONS.delete(sessionId);
                RECONNECT_ATTEMPTS.delete(sessionId);
                // Remove auth files da sessão perdedora
                await fs.remove(authPath).catch(() => {});
                return;
            }

            // ── Restart required (515): normal após pareamento ──
            if (reason === 515) {
                console.log(`[RESTART] Reconectando sessão ${sessionId} após pareamento...`);
                setTimeout(async () => {
                    try {
                        await connectSession(sessionId, authPath, phoneNumber || SESSIONS.get(sessionId)?.phoneNumber, true);
                    } catch (e) {
                        console.error(`[RESTART] Falha:`, e.message);
                    }
                }, 1500);
                return;
            }

            if (reason === 408) {
                // QR expirou sem scan — não reconectar se era pareamento novo
                const s = SESSIONS.get(sessionId);
                if (s && !s.phoneNumber) {
                    s.status = 'expired';
                    return;
                }
            }

            // ── Reconexão automática para qualquer outro motivo ──
            const attempts = RECONNECT_ATTEMPTS.get(sessionId) || { count: 0, lastAttempt: 0 };
            if (attempts.count >= MAX_RECONNECT_ATTEMPTS) {
                console.log(`[RECONECT] Sessão ${sessionId} atingiu máximo de ${MAX_RECONNECT_ATTEMPTS} tentativas. Parando.`);
                const s = SESSIONS.get(sessionId);
                if (s) s.status = 'disconnected';
                RECONNECT_ATTEMPTS.delete(sessionId);
                return;
            }

            const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempts.count), 60000);
            attempts.count++;
            attempts.lastAttempt = Date.now();
            RECONNECT_ATTEMPTS.set(sessionId, attempts);

            console.log(`[RECONECT] Sessão ${sessionId} — tentativa ${attempts.count}/${MAX_RECONNECT_ATTEMPTS} em ${Math.round(delay / 1000)}s`);

            setTimeout(async () => {
                try {
                    await connectSession(sessionId, authPath, phoneNumber || SESSIONS.get(sessionId)?.phoneNumber, true);
                } catch (e) {
                    console.error(`[RECONECT] Falha sessão ${sessionId}:`, e.message);
                }
            }, delay);
        }
    });

    return socket;
}

// ============ AUTO-RESTORE ON STARTUP ============
/**
 * Escaneia .auth/ por sessões salvas com _meta.json e reconecta automaticamente
 */
async function restoreSessions() {
    try {
        await fs.ensureDir(AUTH_DIR);
        const dirs = await fs.readdir(AUTH_DIR);

        // Fase 1: coleta todas as sessões válidas com metadados
        const candidates = [];
        for (const dir of dirs) {
            const authPath = path.join(AUTH_DIR, dir);
            const stat = await fs.stat(authPath);
            if (!stat.isDirectory()) continue;

            const credsFile = path.join(authPath, 'creds.json');
            if (!await fs.pathExists(credsFile)) {
                console.log(`[RESTORE] ${dir} — sem creds.json, removendo pasta órfã`);
                await fs.remove(authPath).catch(() => {});
                continue;
            }

            const metaFile = path.join(authPath, '_meta.json');
            let meta = {};
            try { meta = await fs.readJson(metaFile); } catch (e) {}

            candidates.push({
                dir,
                authPath,
                sessionId: meta.sessionId || dir,
                phone: meta.phoneNumber || null,
                connectedAt: meta.connectedAt ? new Date(meta.connectedAt).getTime() : 0,
            });
        }

        // Fase 2: deduplicar por telefone — manter apenas a MAIS RECENTE
        const byPhone = new Map();
        for (const c of candidates) {
            const key = c.phone || c.sessionId; // agrupar por phone; se não tiver, usa sessionId
            const existing = byPhone.get(key);
            if (!existing || c.connectedAt > existing.connectedAt) {
                if (existing) {
                    // Remove a sessão mais antiga
                    console.log(`[RESTORE] Removendo sessão duplicada ${existing.sessionId} (phone ${key}) — mantendo ${c.sessionId}`);
                    await fs.remove(existing.authPath).catch(() => {});
                }
                byPhone.set(key, c);
            } else {
                // Esta é mais antiga, remove
                console.log(`[RESTORE] Removendo sessão duplicada ${c.sessionId} (phone ${key}) — mantendo ${existing.sessionId}`);
                await fs.remove(c.authPath).catch(() => {});
            }
        }

        // Fase 3: reconecta as sessões sobreviventes
        let restored = 0;
        for (const [, c] of byPhone) {
            console.log(`[RESTORE] Reconectando sessão ${c.sessionId}${c.phone ? ' (phone ' + c.phone + ')' : ''}...`);

            try {
                await connectSession(c.sessionId, c.authPath, c.phone, true);
                restored++;
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {
                console.error(`[RESTORE] Falha ao reconectar ${c.sessionId}:`, e.message);
            }
        }

        console.log(`[RESTORE] ${restored} sessão(ões) restaurada(s) de ${candidates.length} pasta(s) encontrada(s)`);
    } catch (e) {
        console.error('[RESTORE] Erro geral:', e.message);
    }
}

// ============ ENDPOINTS ============

// -- Pair (novo QR) --
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

        res.json({ sessionId, qr: session.qr, expiresIn: 300 });
    } catch (error) {
        console.error('[PAIR] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// -- Pair status --
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

// -- Sessions list --
app.get('/sessions', verifyToken, (req, res) => {
    const sessions = [];
    for (const [sessionId, s] of SESSIONS) {
        sessions.push({
            sessionId,
            phone: s.phoneNumber ? '+' + s.phoneNumber : null,
            status: s.status === 'paired' ? 'connected' : s.status,
            connectedAt: s.connectedAt ? new Date(s.connectedAt).toISOString() : null,
            lastSeen: s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString('pt-BR') : 'agora',
            createdAt: new Date(s.createdAt).toISOString(),
        });
    }
    res.json({ sessions, total: sessions.length });
});

// -- Disconnect --
app.post('/disconnect/:sessionId', verifyToken, async (req, res) => {
    const { sessionId } = req.params;
    const session = SESSIONS.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    try {
        try { session.socket.end(); } catch (e) {}
        if (session.timeout) clearTimeout(session.timeout);
        SESSIONS.delete(sessionId);
        RECONNECT_ATTEMPTS.delete(sessionId);

        // Remove credenciais salvas
        const authPath = path.join(AUTH_DIR, sessionId);
        await fs.remove(authPath).catch(() => {});

        res.json({ message: 'Session disconnected' });
    } catch (error) {
        console.error('[DISCONNECT] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// -- Reconnect by phone (chamado pelo frontend quando sessão sumiu) --
app.post('/reconnect/:phone', verifyToken, async (req, res) => {
    const phone = req.params.phone.replace(/\D/g, '');

    // Verifica se já existe sessão ativa para esse número
    for (const [sid, s] of SESSIONS) {
        const sPhone = String(s.phoneNumber || '').replace(/\D/g, '');
        if (sPhone === phone && s.status === 'paired') {
            return res.json({ ok: true, message: 'Sessão já está conectada', sessionId: sid });
        }
    }

    // Procura pasta de credenciais para esse número
    try {
        await fs.ensureDir(AUTH_DIR);
        const dirs = await fs.readdir(AUTH_DIR);

        for (const dir of dirs) {
            const authPath = path.join(AUTH_DIR, dir);
            const metaFile = path.join(authPath, '_meta.json');
            const credsFile = path.join(authPath, 'creds.json');

            if (!await fs.pathExists(credsFile)) continue;

            let meta = {};
            try { meta = await fs.readJson(metaFile); } catch (e) {}

            const metaPhone = String(meta.phoneNumber || '').replace(/\D/g, '');
            if (metaPhone === phone) {
                const sessionId = meta.sessionId || dir;
                console.log(`[RECONNECT] Encontrada sessão salva para ${phone}: ${sessionId}`);

                await connectSession(sessionId, authPath, phone, true);

                // Espera até 15s pela reconexão
                let attempts = 0;
                while (attempts < 30) {
                    const s = SESSIONS.get(sessionId);
                    if (s?.status === 'paired') {
                        return res.json({ ok: true, message: 'Sessão reconectada', sessionId });
                    }
                    await new Promise(r => setTimeout(r, 500));
                    attempts++;
                }

                return res.json({ ok: true, message: 'Reconexão iniciada (pode levar alguns segundos)', sessionId });
            }
        }

        res.status(404).json({ error: 'Nenhuma sessão salva para esse número. Necessário novo QR code.' });
    } catch (error) {
        console.error('[RECONNECT] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// -- Send message to channel/group --
app.post('/send', verifyToken, async (req, res) => {
    const { sessionPhone, channelId, text, imageUrl, userId } = req.body;

    if (!channelId || !text) {
        return res.status(400).json({ error: 'channelId e text são obrigatórios' });
    }

    // ─── RATE LIMITING: Validar antes de enviar ───
    if (userId) {
        const validation = await rateLimiter.validate(userId, 1);
        if (!validation.success) {
            console.log(`[RATE_LIMIT] ${validation.code}: ${validation.message}`);
            return res.status(429).json({
                ok: false,
                error: validation.code,
                message: validation.message,
                ...validation
            });
        }
    }

    let session = null;
    if (sessionPhone) {
        const phone = String(sessionPhone).replace(/\D/g, '');
        for (const [, s] of SESSIONS) {
            if (s.status === 'paired' && String(s.phoneNumber).replace(/\D/g, '') === phone) {
                session = s; break;
            }
        }
    }
    if (!session) {
        for (const [, s] of SESSIONS) {
            if (s.status === 'paired') { session = s; break; }
        }
    }

    if (!session) {
        return res.status(404).json({ error: 'Nenhuma sessão WhatsApp conectada' });
    }

    try {
        let jid = channelId;
        if (!jid.includes('@')) {
            jid = jid.replace(/\D/g, '') + (jid.includes('-') ? '@g.us' : '@newsletter');
        }

        if (imageUrl) {
            await session.socket.sendMessage(jid, { image: { url: imageUrl }, caption: text });
        } else {
            await session.socket.sendMessage(jid, { text });
        }

        // ─── RATE LIMITING: Incrementar contador após sucesso ───
        if (userId) {
            await rateLimiter.increment(userId, 1);
        }

        session.lastSeenAt = Date.now();
        res.json({ ok: true });
    } catch (error) {
        console.error('[SEND] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// -- Send direct message --
app.post('/send-message', verifyToken, async (req, res) => {
    const { sessionId, phoneNumber, message, userId } = req.body;

    if (!sessionId || !phoneNumber || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // ─── RATE LIMITING: Validar antes de enviar ───
    if (userId) {
        const validation = await rateLimiter.validate(userId, 1);
        if (!validation.success) {
            console.log(`[RATE_LIMIT] ${validation.code}: ${validation.message}`);
            return res.status(429).json({
                ok: false,
                error: validation.code,
                message: validation.message,
                ...validation
            });
        }
    }

    const session = SESSIONS.get(sessionId);
    if (!session || session.status !== 'paired') {
        return res.status(404).json({ error: 'Session not paired' });
    }

    try {
        const jid = phoneNumber.includes('@') ? phoneNumber : phoneNumber + '@s.whatsapp.net';
        await session.socket.sendMessage(jid, { text: message });
        
        // ─── RATE LIMITING: Incrementar contador após sucesso ───
        if (userId) {
            await rateLimiter.increment(userId, 1);
        }
        
        res.json({ message: 'Message sent' });
    } catch (error) {
        console.error('[SEND] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// -- Envio para grupo WA --
app.post('/send-group', verifyToken, async (req, res) => {
    const { sessionPhone, groupId, text, imageUrl, userId } = req.body;
    if (!sessionPhone || !groupId || !text) {
        return res.status(400).json({ ok: false, error: 'sessionPhone, groupId e text são obrigatórios' });
    }

    // ─── RATE LIMITING: Validar antes de enviar ───
    if (userId) {
        const validation = await rateLimiter.validate(userId, 1);
        if (!validation.success) {
            console.log(`[RATE_LIMIT] ${validation.code}: ${validation.message}`);
            return res.status(429).json({
                ok: false,
                error: validation.code,
                message: validation.message,
                ...validation
            });
        }
    }

    const phone = sessionPhone.replace(/\D/g, '');
    let session = null;
    for (const [, s] of SESSIONS) {
        const sp = (s.phone || s.phoneNumber || '').replace(/\D/g, '');
        if (sp.slice(-9) === phone.slice(-9) && s.status === 'paired') { session = s; break; }
    }
    if (!session) return res.status(404).json({ ok: false, error: 'Sessão não encontrada ou não pareada' });

    try {
        // groupId pode vir como "120363410208475859" ou "120363410208475859@g.us"
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us';
        if (imageUrl) {
            await session.socket.sendMessage(jid, { image: { url: imageUrl }, caption: text });
        } else {
            await session.socket.sendMessage(jid, { text });
        }

        // ─── RATE LIMITING: Incrementar contador após sucesso ───
        if (userId) {
            await rateLimiter.increment(userId, 1);
        }

        res.json({ ok: true, message: 'Enviado para o grupo' });
    } catch (e) {
        console.error('[SEND-GROUP]', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// -- Stubs --
app.post('/send-post', verifyToken, async (req, res) => {
    res.json({ message: 'Use a Edge Function send-post via Supabase', processed: 0 });
});

app.post('/radar', verifyToken, async (req, res) => {
    res.json({ message: 'Radar updated', offers: 0 });
});

// -- ML Search via scraping da LISTAGEM do site (rodando na VPS) --
// A API publica /sites/MLB/search foi bloqueada pelo ML (403 forbidden p/ todos,
// com ou sem token). O SITE lista.mercadolivre.com.br continua aberto e o IP da
// VPS nao esta bloqueado pra ele. Entao buscamos a pagina de listagem e
// extraimos os produtos do HTML (mesma tecnica que os concorrentes usam).
const ML_BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
};

// Le um valor monetario (fraction + cents) dentro de um escopo cheerio
function mlMoney($scope) {
    if (!$scope || !$scope.length) return 0;
    const frac = ($scope.find('.andes-money-amount__fraction').first().text() || '').replace(/[^\d]/g, '');
    const cents = ($scope.find('.andes-money-amount__cents').first().text() || '').replace(/[^\d]/g, '') || '00';
    if (!frac) return 0;
    return Number(`${frac}.${cents.slice(0, 2)}`);
}

// Extrai o ID do anuncio (MLBxxxxx) a partir do link do produto
function mlExtractId(link) {
    const m = String(link || '').match(/MLB-?(\d{6,})/i);
    return m ? 'MLB' + m[1] : '';
}

app.post('/ml-search', verifyToken, async (req, res) => {
    // Carrega o cheerio sob demanda: se faltar (npm install nao rodou no rebuild),
    // o WhatsApp continua de pe e o erro vem claro em vez de "CORS error" no browser.
    let cheerio;
    try {
        cheerio = require('cheerio');
    } catch (e) {
        return res.status(503).json({
            ok: false,
            total: 0,
            results: [],
            errors: ['cheerio nao instalado no wa-engine. Rode npm install / rebuild SEM cache no EasyPanel.'],
        });
    }

    const { keywords = [], limit = 20 } = req.body || {};
    const kws = keywords.length ? keywords : [
        'fone bluetooth', 'air fryer', 'smartwatch',
        'caixa de som bluetooth', 'carregador sem fio',
        'aspirador robo', 'cafeteira', 'mouse gamer'
    ];
    const perKw = Math.min(Number(limit) || 20, 50);

    const results = [];
    const errors = [];
    // 5 dias de validade (nao 6h) — bate com o ciclo de rodizio de keywords no plano free do
    // Scrape.do (1 categoria por rodada, volta completa a cada ~4 dias). Sem isso, categorias
    // ainda nao re-buscadas no ciclo atual sumiriam do Radar entre uma coleta e outra.
    const expires = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();

    await Promise.all(kws.map(async (kw) => {
        try {
            const slug = encodeURIComponent(String(kw).trim().toLowerCase().replace(/\s+/g, '-'));
            const targetUrl = `https://lista.mercadolivre.com.br/${slug}`;
            // Scrape.do: proxy residencial que bypassa o anti-bot do ML
            const scrapeDoKey = process.env.SCRAPE_DO_TOKEN || '';
            const fetchUrl = scrapeDoKey
                ? `https://api.scrape.do?token=${scrapeDoKey}&url=${encodeURIComponent(targetUrl)}&geoCode=br&super=true`
                : targetUrl;
            const r = await axios.get(fetchUrl, {
                headers: scrapeDoKey ? {} : ML_BROWSER_HEADERS,
                timeout: 25000,
                maxRedirects: 5,
                validateStatus: s => s >= 200 && s < 400,
            });

            const $ = cheerio.load(r.data);

            // Cards: cobre o layout novo (poly-card) e o antigo (ui-search)
            let $cards = $('li.ui-search-layout__item');
            if (!$cards.length) $cards = $('div.poly-card');
            if (!$cards.length) $cards = $('div.ui-search-result__wrapper');

            if (!$cards.length) {
                errors.push(`${kw}: 0 cards (HTML ${String(r.data).length}b — seletor pode ter mudado ou ML retornou pagina de bloqueio)`);
                return;
            }

            let count = 0;
            $cards.each((_, el) => {
                if (count >= perKw) return false; // para de iterar
                const $c = $(el);

                // titulo + link
                let $a = $c.find('a.poly-component__title').first();
                if (!$a.length) $a = $c.find('a.ui-search-link__title-card').first();
                if (!$a.length) $a = $c.find('h2.ui-search-item__title').first().closest('a');
                if (!$a.length) $a = $c.find('a.ui-search-link').first();

                const title = ($a.text() || $c.find('h2').first().text() || '').trim();
                let link = ($a.attr('href') || '').trim();
                if (!title || !link) return;
                link = link.split('#')[0];

                // preco atual
                let $cur = $c.find('.poly-price__current').first();
                if (!$cur.length) $cur = $c.find('.ui-search-price__second-line').first();
                const price = mlMoney($cur.length ? $cur : $c);
                if (price <= 0) return;

                // preco original (riscado)
                let original = mlMoney($c.find('.andes-money-amount--previous').first());
                if (original && original <= price) original = 0;
                const discPct = original > price ? Math.round((1 - price / original) * 100) : 0;

                // imagem (lazy-load: data-src tem a real; src as vezes e placeholder base64)
                const $img = $c.find('img').first();
                let img = ($img.attr('data-src') || $img.attr('src') || '').trim();
                if (img.startsWith('data:')) img = ($img.attr('data-src') || '').trim();

                const item_id = mlExtractId(link)
                    || ('ml_' + Buffer.from(title + price).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24));

                results.push({
                    source: 'mercado_livre',
                    item_id,
                    shop_id: '',
                    title: title.slice(0, 250),
                    keyword: kw,
                    category: 'geral',
                    price,
                    price_original: original || price,
                    discount_pct: discPct,
                    commission_rate: 0,
                    rating: 0,
                    sales: 0,
                    shop_name: 'Mercado Livre',
                    image_url: img,
                    product_link: link,
                    affiliate_url: link, // sem tag de afiliado ainda; aplicar no Post Relampago
                    score: Math.round(40 + Math.min(discPct, 90) / 90 * 60),
                    fetched_at: new Date().toISOString(),
                    expires_at: expires,
                });
                count++;
            });

            if (!count) errors.push(`${kw}: ${$cards.length} cards no HTML mas 0 extraidos (ajustar seletores de titulo/preco)`);
        } catch (e) {
            errors.push(`${kw}: ${e.response?.status || e.code || e.message}`);
        }
    }));

    // Deduplica por item_id
    const seen = new Set();
    const unique = results.filter(r => { if (seen.has(r.item_id)) return false; seen.add(r.item_id); return true; });

    res.json({ ok: true, total: unique.length, results: unique, errors });
});

// ── /ml-product  (busca dados de produto ML via API JSON + Scrape.do) ──────
// Aceita opcionalmente ?userScrapeToken=... — se enviado, usa o token pessoal
// do usuário (dele, na conta dele do Scrape.do) em vez do token compartilhado
// da plataforma. Isso permite que cada usuário traga seu próprio crédito.
app.get('/ml-product', verifyToken, async (req, res) => {
    const url = (req.query.url || '').trim();
    if (!url) return res.status(400).json({ ok: false, error: 'url obrigatório' });

    const mlb = url.match(/MLB[-_]?(\d+)/i)?.[1];
    if (!mlb) return res.status(400).json({ ok: false, error: 'MLB ID não encontrado no link' });

    const userToken = (req.query.userScrapeToken || '').trim();
    const SCRAPE_TOKEN = userToken || process.env.SCRAPE_DO_TOKEN || '';
    const usingPersonalToken = !!userToken;

    // Tenta 1: API JSON do ML via Scrape.do (mais leve, retorna JSON limpo)
    try {
        const apiUrl = `https://api.mercadolibre.com/items/MLB${mlb}`;
        const scrapeUrl = `https://api.scrape.do?token=${SCRAPE_TOKEN}&url=${encodeURIComponent(apiUrl)}&geoCode=br`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const r = await fetch(scrapeUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (r.ok) {
            const text = await r.text();
            try {
                const d = JSON.parse(text);
                if (d.title && d.id) {
                    const priceTo = d.price ? Number(d.price) : null;
                    const priceFrom = d.original_price ? Number(d.original_price) : null;
                    const discPct = priceFrom && priceTo && priceFrom > priceTo
                        ? Math.round((1 - priceTo / priceFrom) * 100) : null;
                    const image = (d.pictures?.[0]?.url || d.thumbnail || '').replace('-I.jpg', '-O.jpg');
                    console.log(`[ml-product] API JSON OK: ${d.title.slice(0, 50)}`);
                    return res.json({
                        ok: true, name: d.title, title: d.title, image,
                        price_to: priceTo ? String(priceTo) : undefined,
                        price_from: priceFrom ? String(priceFrom) : undefined,
                        discount_pct: discPct || undefined,
                        usingPersonalToken,
                    });
                }
            } catch (_) {}
        }
        console.warn(`[ml-product] API JSON falhou: HTTP ${r.status}`);
    } catch (e) {
        console.warn(`[ml-product] API JSON erro: ${e.message}`);
    }

    // Tenta 2: scraping HTML da página de produto via Scrape.do
    try {
        const targetUrl = `https://www.mercadolivre.com.br/p/MLB${mlb}`;
        const scrapeUrl = `https://api.scrape.do?token=${SCRAPE_TOKEN}&url=${encodeURIComponent(targetUrl)}&geoCode=br&super=true`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const r = await fetch(scrapeUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!r.ok) return res.json({ ok: false, error: `Scrape.do HTTP ${r.status}` });

        const html = await r.text();
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);

        const title = ($('h1.ui-pdp-title').first().text().trim()
            || $('h1').first().text().trim()
            || $('meta[property="og:title"]').attr('content')?.trim()
            || '').slice(0, 200);

        const image = $('figure.ui-pdp-gallery__figure img').first().attr('data-zoom')
            || $('figure.ui-pdp-gallery__figure img').first().attr('src')
            || $('meta[property="og:image"]').attr('content') || '';

        const priceText = $('.ui-pdp-price__second-line .andes-money-amount__fraction').first().text().replace(/\D/g, '');
        const priceTo = priceText ? parseFloat(priceText) : null;
        const origText = $('.ui-pdp-price__original-value .andes-money-amount__fraction').first().text().replace(/\D/g, '');
        const priceFrom = origText ? parseFloat(origText) : null;
        const discPct = priceFrom && priceTo && priceFrom > priceTo
            ? Math.round((1 - priceTo / priceFrom) * 100) : null;

        if (!title) return res.json({ ok: false, error: 'Produto não encontrado (antibot). Preencha manualmente.' });

        console.log(`[ml-product] HTML scraping OK: ${title.slice(0, 50)}`);
        return res.json({ ok: true, name: title, title, image,
            price_to: priceTo ? String(priceTo) : undefined,
            price_from: priceFrom ? String(priceFrom) : undefined,
            discount_pct: discPct || undefined,
            usingPersonalToken,
        });
    } catch (e) {
        const msg = e.name === 'AbortError' ? 'Timeout buscando produto ML' : e.message;
        return res.status(502).json({ ok: false, error: msg });
    }
});

// -- Groups list --
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

// -- Health --
app.get('/health', (req, res) => {
    const connected = [...SESSIONS.values()].filter(s => s.status === 'paired').length;
    res.json({
        ok: true,
        uptime: process.uptime(),
        sessions: SESSIONS.size,
        connected,
        timestamp: new Date().toISOString()
    });
});

// ============ STARTUP ============
async function startup() {
    try {
        await fs.ensureDir(AUTH_DIR);

        // Restaura sessões salvas ANTES de ouvir requisições
        await restoreSessions();

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════╗
║  🚀 Mega Links BR - wa-engine  v3      ║
║  Porta ${PORT} · 1 sessão por número      ║
╚════════════════════════════════════════╝

Endpoints:
  POST   /pair                 → Gerar QR code
  GET    /pair-status/:id      → Verificar status
  GET    /sessions             → Listar sessões
  POST   /send                 → Enviar para canal/grupo
  POST   /send-message         → Enviar mensagem direta
  POST   /disconnect/:id       → Desconectar sessão
  POST   /reconnect/:phone     → Forçar reconexão
  GET    /groups               → Listar grupos WA
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
            if (session.timeout) clearTimeout(session.timeout);
        } catch (err) {
            console.error(`Erro ao desconectar ${sessionId}:`, err);
        }
    }
    process.exit(0);
});
