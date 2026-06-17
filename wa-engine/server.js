/**
 * Mega Links BR - WhatsApp Engine
 * Motor de automação WhatsApp baseado em Baileys
 * 
 * Endpoints:
 * - POST /pair → Gera QR code para pareamento
 * - GET /pair-status/:sessionId → Verifica status do QR
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
/**
 * POST /pair
 * Gera um novo QR code para pareamento
 * Retorna: { qr: "data:image/...", sessionId: "..." }
 */
app.post('/pair', verifyToken, async (req, res) => {
    try {
        const sessionId = generateSessionId();
        
        // Criar sessão Baileys
        const authPath = path.join(AUTH_DIR, sessionId);
        await fs.ensureDir(authPath);
        
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        const socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
        });

        let qrData = null;
        let qrGenerated = false;

        // Listener: QR code gerado
        socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // Novo QR disponível
            if (qr && !qrGenerated) {
                qrGenerated = true;
                try {
                    // Gerar imagem base64 do QR
                    const qrImage = await QRCode.toDataURL(qr, {
                        width: 300,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });
                    qrData = qrImage;

                    // Atualizar sessão
                    SESSIONS.set(sessionId, {
                        status: 'waiting',
                        qr: qrImage,
                        socket,
                        saveCreds,
                        phoneNumber: null,
                        createdAt: Date.now(),
                        timeout: setTimeout(() => {
                            // Limpar sessão após 5 minutos sem pareamento
                            SESSIONS.delete(sessionId);
                            socket.end();
                        }, 5 * 60 * 1000)
                    });

                    console.log(`[QR] Sessão ${sessionId} criada com QR code`);
                } catch (err) {
                    console.error('[QR] Erro ao gerar imagem QR:', err);
                }
            }

            // Conectado
            if (connection === 'open') {
                const phoneNumber = socket.user?.id.split(':')[0];
                console.log(`[PAIRED] Sessão ${sessionId} pareada: ${phoneNumber}`);

                const session = SESSIONS.get(sessionId);
                if (session) {
                    session.status = 'paired';
                    session.phoneNumber = phoneNumber;
                    clearTimeout(session.timeout);
                }
            }

            // Desconectado
            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                console.log(`[DISCONNECTED] Sessão ${sessionId}: código ${reason}`);

                if (reason === DisconnectReason.loggedOut) {
                    SESSIONS.delete(sessionId);
                    await fs.remove(authPath);
                }
            }
        });

        // Listener: Credenciais atualizadas
        socket.ev.on('creds.update', saveCreds);

        // Responder com QR (pode levar alguns segundos para gerar)
        // Aguardar até 10 segundos pela imagem
        let attempts = 0;
        while (!qrData && attempts < 20) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }

        if (!qrData) {
            return res.status(500).json({ error: 'Falha ao gerar QR code' });
        }

        res.json({
            qr: qrData,
            sessionId,
            expiresIn: 300 // 5 minutos
        });

    } catch (error) {
        console.error('[PAIR] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /pair-status/:sessionId
 * Verifica o status do pareamento
 * Retorna: { status: "waiting" | "paired", sessionId, phoneNumber? }
 */
app.get('/pair-status/:sessionId', verifyToken, (req, res) => {
    const { sessionId } = req.params;
    const session = SESSIONS.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found or expired' });
    }

    res.json({
        status: session.status,
        sessionId,
        phoneNumber: session.phoneNumber,
        expiresIn: Math.max(0, 5 * 60 * 1000 - (Date.now() - session.createdAt))
    });
});

/**
 * POST /disconnect/:sessionId
 * Desconecta uma sessão
 */
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
 * POST /send-message
 * Envia mensagem via WhatsApp
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
 * Processa posts agendados (chamado via CRON)
 * Busca posts prontos para enviar e dispara as mensagens
 */
app.post('/send-post', verifyToken, async (req, res) => {
    try {
        console.log('[SEND-POST] Iniciando processamento de posts agendados...');

        // TODO: Integrar com Supabase para buscar posts prontos
        // 1. Buscar posts com status='ready' e scheduled_time <= now()
        // 2. Para cada post, chamar send-message
        // 3. Atualizar status para 'sent'

        res.json({ 
            message: 'Post processing completed',
            processed: 0 
        });
    } catch (error) {
        console.error('[SEND-POST] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /radar
 * Atualiza ofertas do Radar (chamado via CRON)
 */
app.post('/radar', verifyToken, async (req, res) => {
    try {
        console.log('[RADAR] Atualizando ofertas...');

        // TODO: Integrar com Shopee Affiliate API
        // 1. Buscar produtos da Shopee
        // 2. Atualizar tabela radar_offers no Supabase
        // 3. Retornar lista de ofertas

        res.json({ 
            message: 'Radar updated',
            offers: 0 
        });
    } catch (error) {
        console.error('[RADAR] Erro:', error);
        res.status(500).json({ error: error.message });
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
        // Criar diretório de auth se não existir
        await fs.ensureDir(AUTH_DIR);

        // Limpar sessões antigas (> 6 horas)
        setInterval(() => {
            const now = Date.now();
            const MAX_AGE = 6 * 60 * 60 * 1000; // 6 horas

            for (const [sessionId, session] of SESSIONS) {
                if (now - session.createdAt > MAX_AGE) {
                    console.log(`[CLEANUP] Removendo sessão expirada: ${sessionId}`);
                    session.socket.end();
                    clearTimeout(session.timeout);
                    SESSIONS.delete(sessionId);
                }
            }
        }, 60 * 60 * 1000); // Verificar a cada hora

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════╗
║  🚀 Mega Links BR - wa-engine      ║
║  Rodando em porta ${PORT}              ║
╚════════════════════════════════════╝

Endpoints disponíveis:
  POST   /pair                 → Gerar QR code
  GET    /pair-status/:id      → Verificar status
  POST   /send-message         → Enviar mensagem
  POST   /send-post            → Processar posts (CRON)
  POST   /radar                → Atualizar ofertas (CRON)
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

// INICIAR
startup();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Desligando wa-engine...');
    
    // Desconectar todas as sessões
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
