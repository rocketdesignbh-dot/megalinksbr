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
 * - GET /group-invite-info → Resolve grupo pelo link de convite
 * - GET /channel-invite-info → Resolve canal (newsletter) pelo link de convite
 * - GET /health → Status do servidor
 */

const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const RateLimitValidator = require('./rate-limit-utils');

if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = require('crypto').webcrypto;
}

dotenv.config();

const app = express();
app.use(express.json());

// ---- Padronizacao da foto do post ----
//
// Ate 04/08 a foto ia crua: `sendMessage(jid, { image: { url } })` faz o Baileys
// baixar e mandar exatamente o que a loja devolveu. Como cada loja tem a sua
// convencao (Amazon `._AC_SL1500_` com proporcao livre, Shopee o original do
// CDN, ML a variante `-E`), o grupo recebia uma foto alta, outra larga, outra
// quadrada — e as altas saem esticadas na conversa do WhatsApp.
//
// Aqui toda foto vira 1080x1080 com fundo branco e o produto INTEIRO dentro:
// `fit: 'contain'` encaixa sem cortar nada. Quadrado e o formato que os grupos
// de oferta usam, e o que o WhatsApp exibe sem recortar na pre-visualizacao.
const IMG_LADO = 1080;
const IMG_TIMEOUT_MS = 12000;
const IMG_MAX_BYTES = 12 * 1024 * 1024;
const IMG_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
// Um mesmo produto vai para varios grupos: sem cache, seria um download por
// grupo. Cabe na memoria e o processo reinicia com frequencia, entao nao ha TTL.
const IMG_CACHE = new Map();
const IMG_CACHE_MAX = 40;

async function imagemPadronizada(url) {
    if (!url) return null;
    const emCache = IMG_CACHE.get(url);
    if (emCache) return emCache;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), IMG_TIMEOUT_MS);
    let bruta;
    try {
        const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': IMG_UA } });
        if (!r.ok) throw new Error(`a loja respondeu HTTP ${r.status}`);
        bruta = Buffer.from(await r.arrayBuffer());
    } finally {
        clearTimeout(t);
    }
    if (!bruta.length) throw new Error('arquivo vazio');
    if (bruta.length > IMG_MAX_BYTES) throw new Error(`arquivo grande demais (${bruta.length} bytes)`);

    const pronta = await sharp(bruta)
        .resize(IMG_LADO, IMG_LADO, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })   // PNG/webp transparente -> fundo branco
        .jpeg({ quality: 85 })
        .toBuffer();

    if (IMG_CACHE.size >= IMG_CACHE_MAX) IMG_CACHE.clear();
    IMG_CACHE.set(url, pronta);
    return pronta;
}

// A padronizacao NUNCA pode impedir o envio. Falhou por qualquer motivo — loja
// fora do ar, formato que o sharp nao le, timeout — manda a original, que e
// exatamente o comportamento de antes. Foto torta e melhor que post nao enviado.
async function conteudoDeImagem(url) {
    try {
        const buf = await imagemPadronizada(url);
        if (buf) return { image: buf };
    } catch (e) {
        console.warn(`[IMG] nao consegui padronizar (${e?.message || e}) — enviando a original`);
    }
    return { image: { url } };
}

// CORS — lista de origens em vez de '*'.
//
// Vale só para navegador: chamada sem cabeçalho `Origin` (Edge Function, cron,
// curl, o próprio heartbeat) não é afetada por CORS e continua passando pelo
// `verifyToken` como sempre. Quem manda é ALLOWED_ORIGINS (lista separada por
// vírgula) no EasyPanel; sem ela valem os domínios do painel abaixo.
const ORIGENS_PADRAO = [
    'https://www.megalinksbr.com.br',
    'https://megalinksbr.com.br'
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || ORIGENS_PADRAO.join(','))
    .split(',').map(s => s.trim()).filter(Boolean);
console.log(`[CORS] origens permitidas: ${ALLOWED_ORIGINS.join(', ')}`);

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const permitida = !!origin && ALLOWED_ORIGINS.includes(origin);
    if (permitida) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
        // x-user-token entrou na P35 (26/08) pra provar dono de sessao. Faltou
        // aqui na hora — CORS so libera header customizado que estiver nesta
        // lista, e sem ele o preflight (OPTIONS) recusa e a chamada real nem
        // sai do navegador: "Failed to fetch" generico, sem status HTTP nenhum
        // pra depurar. MEDIDO em produção logo apos o Deploy: GET /sessions do
        // navegador falhando assim, com os dois tokens presentes e corretos.
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-token');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    } else if (origin) {
        // Não derruba a requisição: só não devolve o cabeçalho, e o navegador
        // barra sozinho. O log existe para medir se alguma origem legítima
        // ficou de fora da lista — sem ele, a falha seria silenciosa.
        console.warn(`[CORS] origem recusada: ${origin} (${req.method} ${req.path})`);
    }
    if (req.method === 'OPTIONS') return res.sendStatus(permitida ? 200 : 403);
    next();
});

// CONFIG
const PORT = process.env.PORT || 8080;
const WA_ENGINE_TOKEN = process.env.WA_ENGINE_TOKEN;
if (!WA_ENGINE_TOKEN) {
    console.error('❌ WA_ENGINE_TOKEN não configurado nas variáveis de ambiente. Configure no EasyPanel antes de iniciar.');
    process.exit(1);
}
// ---- P35 (28/08): token separado para o NAVEGADOR ----
// O `get-wa-engine-token` entrega um token a QUALQUER conta autenticada, e ate
// aqui esse token era o WA_ENGINE_TOKEN de serviço — o mesmo que poe o pedido em
// "modo servidor" (ve tudo, manda por qualquer sessao) quando vem sem
// x-user-token. Resultado medido em 28/08: com o token cru e SEM x-user-token,
// GET /sessions devolvia 7 sessoes; a chamada escopada do dono, 6. A defesa de
// dono de 26/08 so protege o navegador honesto, que sempre manda x-user-token —
// nao o atacante que ignora o header.
//
// Correcao: um segundo segredo, WA_ENGINE_BROWSER_TOKEN, e o que passa a ser
// entregue ao navegador. Ele NUNCA vale como "modo servidor": chamada com o
// browser token e SEM x-user-token e negada (ver resolverDono). O
// WA_ENGINE_TOKEN de serviço fica so com as Edge Functions, que nunca sai do
// servidor.
//
// DEGRADACAO SEGURA: enquanto WA_ENGINE_BROWSER_TOKEN nao estiver configurado,
// tudo se comporta EXATAMENTE como antes — o esquema novo fica inerte. Assim
// este codigo pode ir pro ar (rebuild) sem depender de o segredo ja existir; o
// aperto so liga quando o env e setado. Ver o runbook no commit.
//
// NAO invalida um WA_ENGINE_TOKEN de serviço que ja tenha vazado nos meses em
// que o get-wa-engine-token o entregou — isso exige ROTACIONAR o service token
// (fase 2, no runbook). Esta fase fecha o vazamento para novos atacantes.
const WA_ENGINE_BROWSER_TOKEN = (process.env.WA_ENGINE_BROWSER_TOKEN || '').trim();
// Sem default. Projeto e chave em código faziam o container subir apontando
// para o lugar certo por acidente: trocar de projeto exigia lembrar de mudar o
// código, e um deploy num ambiente novo falharia escrevendo no banco de
// produção em vez de recusar. Mesmo padrão do WA_ENGINE_TOKEN acima.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
for (const [nome, valor] of [['SUPABASE_URL', SUPABASE_URL], ['SUPABASE_KEY', SUPABASE_KEY]]) {
    if (!valor) {
        console.error(`❌ ${nome} não configurado nas variáveis de ambiente. Configure no EasyPanel antes de iniciar.`);
        process.exit(1);
    }
}

// ─── RATE LIMITING ───
const rateLimiter = new RateLimitValidator(SUPABASE_URL, SUPABASE_KEY);
console.log('[RATE_LIMIT] Validador inicializado');

// STORAGE
const AUTH_DIR = path.join(__dirname, '.auth');
const SESSIONS = new Map(); // sessionId -> { status, qr, socket, phoneNumber, ... }

// Controle de reconexão — backoff exponencial por sessão
const RECONNECT_ATTEMPTS = new Map(); // sessionId -> { count, lastAttempt }
const MANUAL_DISCONNECTS = new Set(); // sessionIds desconectados manualmente — nunca reconectar
const MAX_RECONNECT_ATTEMPTS = 50;
const BASE_RECONNECT_DELAY = 3000; // 3s inicial, dobra até ~49s

// Gera variantes de um número BR (com e sem o 9º dígito extra do celular)
// para tolerar o jeito inconsistente que o WhatsApp reporta o número em alguns casos
function phoneVariants(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    const variants = new Set([digits]);
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        const ddd = digits.slice(2, 4);
        const rest = digits.slice(4);
        if (rest.length === 9 && rest[0] === '9') {
            variants.add('55' + ddd + rest.slice(1)); // remove o 9 extra
        } else if (rest.length === 8) {
            variants.add('55' + ddd + '9' + rest); // adiciona o 9 extra
        }
    }
    return [...variants];
}

// ============ MIDDLEWARE ============
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    // P35: dois tokens aceitos. O de serviço (Edge Functions) e o do navegador.
    // req.tokenKind guia o resolverDono: so o de serviço pode virar "modo
    // servidor". Sem WA_ENGINE_BROWSER_TOKEN configurado, so o de serviço vale —
    // comportamento identico ao anterior.
    if (token && token === WA_ENGINE_TOKEN) {
        req.tokenKind = 'service';
        return next();
    }
    if (WA_ENGINE_BROWSER_TOKEN && token === WA_ENGINE_BROWSER_TOKEN) {
        req.tokenKind = 'browser';
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}

// ---- Dono da sessão (P35, 26/08) ----
//
// ATE AQUI, WA_ENGINE_TOKEN era o UNICO controle de acesso: um segredo
// compartilhado por toda a plataforma, que get-wa-engine-token entregava pra
// QUALQUER conta autenticada (nao so admin), sem checar plano nem role. Com
// ele, dava pra listar sessao de todo mundo (GET /sessions), derrubar a
// sessao de qualquer um (POST /disconnect/:sessionId) e mandar mensagem pela
// sessao de outra conta (POST /send, /send-message, /send-group) so trocando
// o sessionPhone/sessionId/groupId no corpo da chamada — nenhuma rota
// verificava de quem era a sessao pedida.
//
// A correcao NAO troca o modelo de token (isso e o desenho da P2, ainda em
// aberto): ela ACRESCENTA uma prova de dono por cima. O navegador do usuario
// agora manda tambem o header `x-user-token` com o PROPRIO JWT do Supabase
// (o mesmo que ja usa pra falar com o PostgREST). Este middleware valida esse
// JWT contra o GoTrue e busca os telefones que esse usuario enxerga em
// `whatsapp_instances` USANDO O JWT DELE — a RLS da tabela
// (`user_id = auth.uid() or is_admin()`) e quem decide o que ele ve: usuario
// comum ve so o proprio telefone, admin ve todos. Nao reimplementamos a regra
// de dono aqui — so pedimos pro banco responder com o JWT de quem chamou.
//
// Chamada SEM x-user-token (Edge Function batendo direto no wa-engine com o
// WA_ENGINE_TOKEN de servidor — send-post, group-blast, product-refresh,
// revops-automations, revops-offer-send, wa-idle-reaper) continua permitida:
// nao tem JWT de usuario porque nao ha usuario navegando, e essas chamadas ja
// vem de codigo nosso que leu o telefone certo do banco antes de chamar. A
// checagem so entra em vigor quando HA um x-user-token pra validar.
async function telefonesDoUsuario(userToken) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_instances?select=phone`, {
        headers: { Authorization: `Bearer ${userToken}`, apikey: SUPABASE_KEY },
    });
    if (!r.ok) return null; // JWT invalido/expirado — tratado como "sem prova de dono"
    const linhas = await r.json().catch(() => []);
    return new Set((linhas || []).map(l => String(l.phone || '').replace(/\D/g, '').slice(-9)));
}

// Middleware: resolve `req.telefonesPermitidos` (Set de telefones, cauda de 9
// digitos) quando vem `x-user-token`; deixa `null` (= "sem checagem, chamada
// de servidor") quando nao vem. NUNCA bloqueia sozinho — quem bloqueia e
// `donoAutorizado()` chamado dentro de cada rota, depois de saber qual
// telefone/sessao a rota especifica precisa.
async function resolverDono(req, res, next) {
    const userToken = req.headers['x-user-token'];
    if (!userToken) {
        // P35: sem x-user-token, so o token DE SERVIÇO vira "modo servidor" (null =
        // ve tudo). O token do NAVEGADOR sem prova de dono nao ve nada — e este o
        // caso do atacante que capturou o browser token e ignora o x-user-token.
        // Set vazio, e nao null: donoAutorizado passa a exigir telefone na lista
        // (que esta vazia), entao nega tudo em vez de liberar geral.
        if (req.tokenKind === 'browser') { req.telefonesPermitidos = new Set(); return next(); }
        req.telefonesPermitidos = null; return next();
    }
    try {
        req.telefonesPermitidos = await telefonesDoUsuario(userToken);
        if (req.telefonesPermitidos === null) {
            return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
        }
    } catch (e) {
        console.error('[DONO] falha ao verificar usuario:', e.message);
        return res.status(500).json({ error: 'Nao foi possivel verificar o usuario.' });
    }
    next();
}

// `null` em telefonesPermitidos = chamada de servidor, sempre autorizada.
// Caso contrario, o telefone pedido precisa estar no Set (cauda de 9 digitos,
// mesmo criterio ja usado em /groups e /group-invite-info para casar as duas
// grafias do numero BR).
function donoAutorizado(req, telefone) {
    if (req.telefonesPermitidos === null) return true;
    if (!telefone) return false;
    const cauda = String(telefone).replace(/\D/g, '').slice(-9);
    return req.telefonesPermitidos.has(cauda);
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

    // Wrapper defensivo: se a pasta de auth foi removida (ex.: após conflito 440),
    // o Baileys ainda pode emitir um último creds.update. Sem esse try/catch, o
    // saveCreds joga ENOENT NÃO TRATADO e derruba o processo inteiro (todos os
    // endpoints passam a dar 404 até o container reiniciar).
    socket.ev.on('creds.update', async () => {
        try { await saveCreds(); }
        catch (e) { console.warn(`[CREDS] Falha ao salvar creds de ${sessionId} (ignorado): ${e.code || e.message}`); }
    });

    // Clone Post Fase 2 — escuta os grupos-fonte cadastrados pelo usuario.
    // Registrado aqui, junto com os outros handlers, pra valer tambem nas
    // reconexoes: sessao restaurada sem listener capturaria nada em silencio.
    registrarListenerClone(socket, sessionId);

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
                        // Remove auth files da duplicada APENAS se for uma pasta diferente da
                        // sessão que está conectando agora. Se for o MESMO authPath (caso de
                        // restauração), apagar destruiria a credencial da sessão viva (ENOENT em loop).
                        if (otherSession.authPath && otherSession.authPath !== authPath) {
                            fs.remove(otherSession.authPath).catch(() => {});
                        }
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

            // Avisa o Supabase IMEDIATAMENTE que esta sessão está viva.
            // Sem isso, um pareamento novo só seria reconhecido no próximo ciclo
            // do heartbeat (até 2 min), e o usuário continuaria vendo o aviso de
            // "WhatsApp desconectado" mesmo após ler o QR Code.
            reportarSessaoViva(connectedNumber);

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

            // ── Desconexão manual pelo admin: limpar e NÃO reconectar ──
            if (MANUAL_DISCONNECTS.has(sessionId)) {
                console.log(`[DISCONNECTED] Sessão ${sessionId} desconectada manualmente — não reconectar.`);
                MANUAL_DISCONNECTS.delete(sessionId);
                SESSIONS.delete(sessionId);
                RECONNECT_ATTEMPTS.delete(sessionId);
                return;
            }

            if (reason === DisconnectReason.loggedOut) {
                // Usuário deslogou pelo celular — limpa tudo
                console.log(`[LOGOUT] Sessão ${sessionId} deslogada pelo usuário.`);
                // Avisa o Supabase na hora: a sessão sai de SESSIONS logo abaixo e o
                // heartbeat periódico nunca chegaria a reportá-la como morta.
                // (Não fazemos isso no código 440, que é troca normal de sessão.)
                const _foneMorto = SESSIONS.get(sessionId)?.phoneNumber;
                if (_foneMorto) reportarSessaoMorta(_foneMorto);
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
                // IMPORTANTE: NÃO apagar a pasta de auth aqui.
                // O 440 é protocolo normal do WhatsApp (multi-device / reconexão após restart).
                // A credencial continua VÁLIDA — apagá-la invalidava a própria sessão que
                // sobrevive (mesmo authPath restaurado), causando ENOENT em loop no saveCreds
                // e "conexão expirada" no próximo restart. Só removemos a pasta em loggedOut real.
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
app.get('/sessions', verifyToken, resolverDono, (req, res) => {
    const sessions = [];
    for (const [sessionId, s] of SESSIONS) {
        // Sem x-user-token (chamada de servidor) ve tudo, como antes. Com
        // x-user-token, so entra sessao cujo telefone o dono enxerga por RLS
        // (o proprio, ou qualquer um se for admin) — ver "Dono da sessão" acima.
        if (!donoAutorizado(req, s.phoneNumber)) continue;
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
app.post('/disconnect/:sessionId', verifyToken, resolverDono, async (req, res) => {
    const { sessionId } = req.params;
    const session = SESSIONS.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    if (!donoAutorizado(req, session.phoneNumber)) {
        return res.status(403).json({ error: 'Essa sessão não pertence a este usuário.' });
    }

    try {
        // Marca como desconexão manual para o handler connection.update NÃO reconectar
        MANUAL_DISCONNECTS.add(sessionId);
        if (session.timeout) clearTimeout(session.timeout);

        // logout() desregistra o aparelho no WhatsApp (encerramento limpo).
        // Se falhar, cai no end() como fallback.
        try { await session.socket.logout(); }
        catch (e) { try { session.socket.end(); } catch (_) {} }

        SESSIONS.delete(sessionId);
        RECONNECT_ATTEMPTS.delete(sessionId);

        // Remove credenciais salvas
        const authPath = path.join(AUTH_DIR, sessionId);
        await fs.remove(authPath).catch(() => {});

        // Limpa a marca após um tempo (caso o evento close demore)
        setTimeout(() => MANUAL_DISCONNECTS.delete(sessionId), 15000);

        res.json({ message: 'Session disconnected' });
    } catch (error) {
        console.error('[DISCONNECT] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// -- Reconnect by phone (chamado pelo frontend quando sessão sumiu) --
app.post('/reconnect/:phone', verifyToken, resolverDono, async (req, res) => {
    const phone = req.params.phone.replace(/\D/g, '');
    if (!donoAutorizado(req, phone)) {
        return res.status(403).json({ error: 'Esse número não pertence a este usuário.' });
    }
    const targetVariants = phoneVariants(phone);

    // Verifica se já existe sessão ativa para esse número
    for (const [sid, s] of SESSIONS) {
        const sPhone = String(s.phoneNumber || '').replace(/\D/g, '');
        if (targetVariants.includes(sPhone) && s.status === 'paired') {
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
            if (targetVariants.includes(metaPhone)) {
                const sessionId = meta.sessionId || dir;
                console.log(`[RECONNECT] Encontrada sessão salva para ${phone}: ${sessionId}`);

                await connectSession(sessionId, authPath, metaPhone, true);

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
app.post('/send', verifyToken, resolverDono, async (req, res) => {
    const { sessionPhone, channelId, text, imageUrl, userId } = req.body;

    if (!channelId || !text) {
        return res.status(400).json({ error: 'channelId e text são obrigatórios' });
    }
    if (sessionPhone && !donoAutorizado(req, sessionPhone)) {
        return res.status(403).json({ error: 'Esse número não pertence a este usuário.' });
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
    // O fallback "qualquer sessao paired" so e seguro quando NAO ha prova de
    // dono pra checar — ou seja, chamada de servidor (Edge Function) sem
    // sessionPhone. Chamada de navegador (com x-user-token) que nao apontou
    // sessionPhone NAO pode herdar a sessao de outra conta por acidente: isso
    // era exatamente o buraco da P35 (ver "Dono da sessão" no topo do arquivo).
    if (!session && req.telefonesPermitidos === null) {
        for (const [, s] of SESSIONS) {
            if (s.status === 'paired') { session = s; break; }
        }
    }

    if (!session) {
        return res.status(404).json({ error: 'Nenhuma sessão WhatsApp conectada' });
    }

    try {
        const jid = channelId;
        
        if (imageUrl) {
            await session.socket.sendMessage(jid, { ...(await conteudoDeImagem(imageUrl)), caption: text });
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
app.post('/send-message', verifyToken, resolverDono, async (req, res) => {
    const { sessionId, sessionPhone, phoneNumber, message, userId } = req.body;

    // sessionPhone e alternativa ao sessionId: quem chama de fora (Edge Functions)
    // conhece o telefone da instancia, nao o id interno da sessao. Mesma resolucao
    // usada no /send-group.
    if ((!sessionId && !sessionPhone) || !phoneNumber || !message) {
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

    let session = sessionId ? SESSIONS.get(sessionId) : null;
    if (!session && sessionPhone) {
        const alvo = String(sessionPhone).replace(/\D/g, '');
        for (const [, s] of SESSIONS) {
            const sp = (s.phone || s.phoneNumber || '').replace(/\D/g, '');
            if (sp.slice(-9) === alvo.slice(-9) && s.status === 'paired') { session = s; break; }
        }
    }
    if (!session || session.status !== 'paired') {
        return res.status(404).json({ error: 'Session not paired' });
    }
    if (!donoAutorizado(req, session.phoneNumber || session.phone)) {
        return res.status(403).json({ error: 'Essa sessão não pertence a este usuário.' });
    }

    try {
        let jid;
        if (phoneNumber.includes('@')) {
            jid = phoneNumber;
        } else {
            // Resolve o JID REAL do numero via WhatsApp (respeita migracao LID).
            // Enviar direto para "<numero>@s.whatsapp.net" sem resolver pode ser
            // aceito pelo servidor mas nunca entregue (mensagem some silenciosamente).
            const num = phoneNumber.replace(/\D/g, '');
            let resolved = null;
            let soLid = false;
            try {
                const results = await session.socket.onWhatsApp(num);
                if (Array.isArray(results) && results.length) {
                    // SEMPRE preferir o jid @s.whatsapp.net. O @lid e identificador
                    // interno da migracao do WhatsApp: o servidor ACEITA e nao entrega.
                    // A versao anterior fazia `hit?.jid || hit?.lid` e, quando caia no
                    // lid, respondia 200 para uma mensagem que nunca chegou.
                    const ehReal = (r) => typeof r?.jid === 'string' && r.jid.endsWith('@s.whatsapp.net');
                    const hit = results.find(r => r && r.exists && ehReal(r)) || results.find(ehReal);
                    resolved = hit?.jid || null;
                    if (!resolved) soLid = results.some(r => r && (r.lid || String(r.jid || '').endsWith('@lid')));
                }
            } catch (e) {
                console.warn(`[SEND] onWhatsApp falhou para ${num}: ${e.message}`);
            }

            if (!resolved) {
                console.warn(`[SEND] Numero ${num} nao resolvido${soLid ? ' (so veio @lid)' : ''} - nao enviado`);
                return res.status(422).json({
                    ok: false,
                    error: soLid ? 'only_lid' : 'number_not_on_whatsapp',
                    message: soLid
                        ? 'O WhatsApp so devolveu identificador interno (@lid) para este numero; envio para @lid nao e entregue.'
                        : 'Numero nao encontrado no WhatsApp (pode nao ter conta ativa).',
                });
            }
            jid = resolved;
        }

        // Devolve a PROVA do envio, nao so um 200. Sem key.id nao da para separar
        // "entreguei" de "o servidor aceitou e engoliu" -- foi essa ambiguidade que
        // deixou o aviso de produto fora do ar sumir sem rastro em 30/07.
        const enviado = await session.socket.sendMessage(jid, { text: message });
        const messageId = enviado?.key?.id ?? null;
        console.log(`[SEND] Mensagem direta enviada para ${jid} (id=${messageId})`);

        if (!messageId) {
            console.warn(`[SEND] sendMessage nao devolveu key.id para ${jid} - envio NAO confirmado`);
            return res.status(502).json({ ok: false, error: 'sem_confirmacao', jid, message: 'O WhatsApp aceitou a chamada mas nao devolveu id da mensagem.' });
        }

        // ─── RATE LIMITING: Incrementar contador após sucesso ───
        if (userId) {
            await rateLimiter.increment(userId, 1);
        }

        res.json({ ok: true, message: 'Message sent', jid, messageId });
    } catch (error) {
        console.error('[SEND] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// -- Envio para grupo WA --
app.post('/send-group', verifyToken, resolverDono, async (req, res) => {
    const { sessionPhone, groupId, text, imageUrl, userId } = req.body;
    if (!sessionPhone || !groupId || !text) {
        return res.status(400).json({ ok: false, error: 'sessionPhone, groupId e text são obrigatórios' });
    }
    if (!donoAutorizado(req, sessionPhone)) {
        return res.status(403).json({ ok: false, error: 'Esse número não pertence a este usuário.' });
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
            await session.socket.sendMessage(jid, { ...(await conteudoDeImagem(imageUrl)), caption: text });
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

// Le um preco do PDP tolerando que a classe .andes-money-amount esteja no
// PROPRIO elemento do seletor (caso do .ui-pdp-price__original-value, que e um
// <s class="andes-money-amount ...">) ou num filho (caso do __second-line, que e
// um container). Escopar no elemento de dinheiro — e nao no container — garante
// que fraction e cents lidos pertencem ao MESMO valor: no container, o primeiro
// cents pode ser o da parcela, e ai 189,00 viraria 189,90.
function mlMoneyPdp($, seletor) {
    const $raiz = $(seletor).first();
    if (!$raiz.length) return null;
    const $amt = $raiz.hasClass('andes-money-amount') ? $raiz : $raiz.find('.andes-money-amount').first();
    const v = mlMoney($amt.length ? $amt : $raiz);
    return v > 0 ? v : null;
}

// Preco pelo JSON-LD (schema.org Product/offers) — rede de seguranca para as
// paginas de CATALOGO do ML (/p/MLB..., layout "polycard").
//
// MEDIDO em 27/08 na pagina
// mercadolivre.com.br/vodka-destilada-absolut-garrafa-750ml/p/MLB18308206:
// `.ui-pdp-price__second-line` e `.ui-pdp-price__original-value` — os DOIS
// seletores que o /ml-product usava — simplesmente NAO EXISTEM ali. O engine
// lia titulo e foto normalmente e devolvia a resposta SEM price_to/price_from,
// e a tela mostrava produto sem valor nenhum. Nao era antibot nem credito: era
// seletor de um layout que aquela pagina nao usa.
// O mesmo HTML traz `<script type="application/ld+json">` com
// `offers.price: 78.21` — o preco certo do item. `.poly-price__current` foi
// descartado de proposito: na medicao ele leu "R$ 7.062", preco de outro card
// do carrossel da pagina. O JSON-LD e o unico que fala do produto desta URL.
function mlPrecoJsonLd($) {
    let preco = null, de = null;
    try {
        $('script[type="application/ld+json"]').each((_, el) => {
            if (preco != null) return;
            let j;
            try { j = JSON.parse($(el).html() || ''); } catch (e) { return; }
            const raiz = Array.isArray(j) ? j : [j];
            for (const o of raiz) {
                if (!o) continue;
                const nos = [o, ...(Array.isArray(o['@graph']) ? o['@graph'] : [])];
                for (const n of nos) {
                    if (!n || String(n['@type'] || '').toLowerCase() !== 'product') continue;
                    const of = Array.isArray(n.offers) ? n.offers[0] : n.offers;
                    if (!of) continue;
                    const p = Number(of.price ?? of.lowPrice ?? (of.priceSpecification && of.priceSpecification.price));
                    if (Number.isFinite(p) && p > 0) {
                        preco = p;
                        const h = Number(of.highPrice);
                        if (Number.isFinite(h) && h > p) de = h;
                        return;
                    }
                }
            }
        });
    } catch (e) { /* leitura de preco nunca pode derrubar a rota */ }
    return { preco, de };
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
                link = link.split(/#|%23/i)[0]; // corta fragmento literal (#) OU já percent-encoded (%23) — o HTML do ML às vezes serve o href com o fragmento de tracking pré-codificado, quebrando o link final

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
                    affiliate_url: link, // sem tag de afiliado ainda; aplicar no Postar Agora
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

// ── Fetch direto com cookie de sessão do ML (sem Scrape.do) ────────────────
// Alternativa ao proxy residencial: usa o cookie de sessão autenticada do próprio
// afiliado (colado manualmente em Config Afiliados) pra tentar ler a página como se
// fosse o navegador dele. Não gasta crédito do Scrape.do. IMPORTANTE: a requisição
// ainda sai do IP da VPS (não do IP residencial do usuário) — pode não driblar 100%
// o bloqueio de IP do ML, mas é uma tentativa gratuita antes de cair no Scrape.do.
async function fetchWithMlCookie(targetUrl, cookie) {
    if (!cookie) return { ok: false, html: null };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const r = await fetch(targetUrl, {
            headers: { ...ML_BROWSER_HEADERS, Cookie: cookie },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!r.ok) {
            console.log(`[ml-cookie] HTTP ${r.status} — cookie pode ter expirado ou IP da VPS bloqueado`);
            return { ok: false, html: null, lastStatus: r.status };
        }
        const html = await r.text();
        return { ok: true, html };
    } catch (e) {
        clearTimeout(timeout);
        console.warn(`[ml-cookie] erro: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
        return { ok: false, html: null };
    }
}

// ── Failover de tokens Scrape.do ───────────────────────────────────────────
// O Scrape.do sinaliza "sem créditos / assinatura suspensa" com HTTP 401 — e esse
// 401 NÃO consome crédito (fonte: doc oficial de status codes). Então é seguro
// tentar o próximo token quando o atual retorna 401. Já 200/404 consomem crédito.
// Ordem de tentativa: token pessoal PRIMÁRIO → token pessoal BACKUP → token da
// PLATAFORMA (compartilhado). Retorna o HTML e qual token funcionou.
// ── Disponibilidade do anuncio pelo JSON-LD da pagina ──────────────────────────
// MEDIDO em 29/07/2026 nas duas direcoes, pelo proprio Scrape.do (super=true):
//   anuncio morto (Yara Lattafa)  -> "availability":"https://schema.org/OutOfStock", "price":0
//   anuncio vivo  (Fakhar Gold)   -> "availability":"https://schema.org/InStock",    "price":150.82
// Nos dois casos o <h1 class="ui-pdp-title"> existe -- por isso a checagem por
// titulo, que e a unica de hoje, da o anuncio morto como saudavel.
//
// POR QUE NAO CASAR TEXTO SOLTO: a pagina do ML embute um dicionario i18n com
// TODAS as mensagens possiveis, inclusive "Esta pagina nao esta disponivel".
// Procurar essa frase no HTML cru acusa produto bom como morto -- foi exatamente
// esse tipo de falso-positivo que expirou o catalogo inteiro na v7 da product-refresh.
// Aqui olhamos um par chave/valor especifico (schema.org), nunca frase traduzida.
function lerDisponibilidadeML(html) {
    if (!html) return { estado: 'desconhecido', sinal: 'sem_html' };
    // O JSON embutido escapa as barras como \u002F; normaliza antes de procurar.
    const norm = html.replace(/\\u002F/gi, '/');
    const m = norm.match(/"availability"\s*:\s*"[^"]*schema\.org\/(\w+)"/i);
    if (!m) return { estado: 'desconhecido', sinal: 'sem_campo_availability' };
    const v = m[1].toLowerCase();
    if (['instock', 'limitedavailability', 'preorder', 'backorder', 'onlineonly'].includes(v)) {
        return { estado: 'disponivel', sinal: `schema:${m[1]}` };
    }
    if (['outofstock', 'soldout', 'discontinued'].includes(v)) {
        return { estado: 'indisponivel', sinal: `schema:${m[1]}` };
    }
    // Valor novo que a gente ainda nao viu: nao arrisca, devolve desconhecido.
    return { estado: 'desconhecido', sinal: `schema_nao_mapeado:${m[1]}` };
}

async function scrapeDoWithFailover(targetUrl, tokens) {
    // tokens: array de { token, label }. Remove vazios e duplicados preservando ordem.
    const seen = new Set();
    const candidates = tokens.filter(t => {
        const v = (t.token || '').trim();
        if (!v || seen.has(v)) return false;
        seen.add(v);
        return true;
    });

    let lastStatus = 0;
    for (const { token, label } of candidates) {
        const scrapeUrl = `https://api.scrape.do?token=${token}&url=${encodeURIComponent(targetUrl)}&geoCode=br&super=true`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        let r;
        try {
            r = await fetch(scrapeUrl, { signal: controller.signal });
        } catch (e) {
            clearTimeout(timeout);
            console.warn(`[scrape.do:${label}] erro de rede: ${e.name === 'AbortError' ? 'timeout' : e.message} — tentando próximo token`);
            lastStatus = -1;
            continue;
        }
        clearTimeout(timeout);
        lastStatus = r.status;

        // 401 = sem crédito nesse token (não consome). Tenta o próximo.
        if (r.status === 401) {
            console.log(`[scrape.do:${label}] 401 (sem crédito) — failover para o próximo token`);
            continue;
        }
        // 429 = throttle temporário (não é esgotamento). Tenta o próximo mesmo assim.
        if (r.status === 429) {
            console.log(`[scrape.do:${label}] 429 (throttle) — tentando próximo token`);
            continue;
        }
        // 404/410 vem do SITE de destino, nao do scrape.do: o anuncio nao existe mais.
        // Trocar de token nao muda esse resultado -- so queimaria credito (10 por
        // requisicao com super=true). Encerra a cadeia e devolve como resposta definitiva.
        if (r.status === 404 || r.status === 410) {
            console.log(`[scrape.do:${label}] HTTP ${r.status} no destino — pagina inexistente, resposta definitiva`);
            return { ok: false, html: null, tokenUsed: label, lastStatus: r.status, definitivo: true };
        }
        if (!r.ok) {
            console.warn(`[scrape.do:${label}] HTTP ${r.status} — tentando próximo token`);
            continue;
        }
        const html = await r.text();
        console.log(`[scrape.do:${label}] 200 OK — token utilizado`);
        return { ok: true, html, tokenUsed: label };
    }
    return { ok: false, html: null, tokenUsed: null, lastStatus };
}

// ── /ml-product  (busca dados de produto ML via Scrape.do com failover de tokens) ──
// Aceita opcionalmente ?userScrapeToken=... (primário) e ?userScrapeToken2=... (backup).
// Cada usuário traz seu próprio crédito; quando o primário esgota (401), usa o backup;
// se ambos esgotarem (ou não houver token pessoal), cai no token compartilhado da plataforma.
app.get('/ml-product', verifyToken, async (req, res) => {
    const url = (req.query.url || '').trim();
    if (!url) return res.status(400).json({ ok: false, error: 'url obrigatório' });

    // Tenta no path; se não achar, busca no query string item_id=MLBxxxxxxx (URLs tipo /up/MLBU...)
    const pathMatch = url.match(/MLB[-_]?(\d+)/i);
    const mlb = pathMatch?.[1] ?? (() => {
        try { const qs = new URL(url).searchParams.get('item_id') ?? ''; return qs.match(/MLB[-_]?(\d+)/i)?.[1] ?? null; } catch { return null; }
    })();
    // 26/08 — MEDIDO no log real da product-search: "[ML] wa-engine HTTP: 400" para
    // o link /up/MLBU4110581108 SEM item_id no query string. O regex acima nao casa
    // "MLBU..." (ha um U onde ele espera digito) e este formato nao traz item_id
    // nenhum, entao morria aqui. Mesmo defeito que a product-search v30 consertou do
    // lado dela: sem os DOIS consertos, a Edge Function passa a tentar e o engine
    // continua recusando.
    const mlbu = mlb ? null : (url.match(/MLBU[-_]?(\d+)/i)?.[1] ?? null);
    if (!mlb && !mlbu) return res.status(400).json({ ok: false, error: 'MLB ID não encontrado no link' });

    const userToken = (req.query.userScrapeToken || '').trim();
    const userToken2 = (req.query.userScrapeToken2 || '').trim();
    const userMlCookie = (req.query.userMlCookie || '').trim();
    const platformToken = process.env.SCRAPE_DO_TOKEN || '';
    const usingPersonalToken = !!(userToken || userToken2);

    // Ordem de failover: primário do usuário → backup do usuário → plataforma
    const tokenChain = [
        { token: userToken, label: 'primario' },
        { token: userToken2, label: 'backup' },
        { token: platformToken, label: 'plataforma' },
    ];
    if (!userMlCookie && !tokenChain.some(t => (t.token || '').trim())) {
        return res.status(400).json({ ok: false, error: 'Nenhum token Scrape.do ou cookie do ML disponível' });
    }

    // NOTA: removida a tentativa via api.mercadolibre.com/items SEM super=true (residencial) —
    // confirmado repetidamente que o ML bloqueia esse tipo de acesso (502/403), sempre falha.
    // Vai direto pro scraping HTML com super=true, que e o que realmente funciona.
    // Monta as URLs-alvo a tentar, em ordem. A URL ORIGINAL do usuário (se for uma página
    // de produto do ML) vem primeiro — muitos anúncios não têm página de catálogo /p/MLB,
    // e forçar /p/ levava a uma página sem os seletores => "não extrai". O /p/MLB fica como
    // fallback (bom para links de catálogo ou URLs sem o slug do produto).
    const originalUrl = url;
    const isMlProductPage = /mercadolivre\.com|mercadolibre\.com/i.test(originalUrl)
        && /(\/MLB-?\d+|\/p\/MLB|\/up\/)/i.test(originalUrl);
    // Anuncio "user product" (/up/MLBU...) NAO tem pagina de catalogo /p/MLB —
    // montar uma daria 404 e gastaria credito do Scrape.do a toa. Nesse caso a
    // unica URL-alvo e a original.
    const catalogUrl = mlb ? `https://www.mercadolivre.com.br/p/MLB${mlb}` : null;
    const targetUrls = [];
    if (isMlProductPage) targetUrls.push(originalUrl);
    if (catalogUrl && !targetUrls.includes(catalogUrl)) targetUrls.push(catalogUrl);

    try {
        let scrape = { ok: false, html: null, tokenUsed: null, lastStatus: 0 };
        let title = '';
        let $ = null;

        // Tenta primeiro com o cookie de sessão do usuário (gratuito, sem Scrape.do)
        if (userMlCookie) {
            for (const targetUrl of targetUrls) {
                const cookieTry = await fetchWithMlCookie(targetUrl, userMlCookie);
                if (!cookieTry.ok) continue;
                const cheerio = require('cheerio');
                const $c = cheerio.load(cookieTry.html);
                const t = ($c('h1.ui-pdp-title').first().text().trim()
                    || $c('h1').first().text().trim()
                    || $c('meta[property="og:title"]').attr('content')?.trim()
                    || '').slice(0, 200);
                if (t) {
                    console.log(`[ml-product] título OK via cookie pessoal em ${targetUrl.slice(0, 60)}`);
                    scrape = { ok: true, html: cookieTry.html, tokenUsed: 'cookie_pessoal', lastStatus: 200 };
                    $ = $c; title = t;
                    break;
                }
                console.log(`[ml-product] cookie pessoal sem título em ${targetUrl.slice(0, 60)} — tentando próxima URL`);
            }
            if (!scrape.ok) console.log('[ml-product] cookie pessoal não retornou título em nenhuma URL — caindo pro Scrape.do');
        }

        // Se o cookie não funcionou (ou não foi informado), usa o Scrape.do como antes
        if (!scrape.ok && tokenChain.some(t => (t.token || '').trim())) {
            for (const targetUrl of targetUrls) {
                scrape = await scrapeDoWithFailover(targetUrl, tokenChain);
                if (!scrape.ok) continue;
                const cheerio = require('cheerio');
                $ = cheerio.load(scrape.html);
                title = ($('h1.ui-pdp-title').first().text().trim()
                    || $('h1').first().text().trim()
                    || $('meta[property="og:title"]').attr('content')?.trim()
                    || '').slice(0, 200);
                if (title) { console.log(`[ml-product] título OK em ${targetUrl.slice(0, 60)}`); break; }
                console.log(`[ml-product] sem título em ${targetUrl.slice(0, 60)} — tentando próxima URL`);
            }
        }

        // Resposta definitiva do destino (404/410): o anuncio saiu do ar. Nao e antibot,
        // nao e falta de credito -- e a informacao que a product-refresh precisa.
        if (!scrape.ok && scrape.definitivo) {
            return res.json({
                ok: false,
                error: `Anuncio nao existe mais no Mercado Livre (HTTP ${scrape.lastStatus}).`,
                availability: 'indisponivel',
                availabilitySignal: `http_${scrape.lastStatus}`,
            });
        }

        if (!scrape.ok) {
            const semCredito = scrape.lastStatus === 401;
            return res.json({
                ok: false,
                availability: 'desconhecido',
                availabilitySignal: semCredito ? 'sem_credito' : `scrape_http_${scrape.lastStatus}`,
                error: semCredito
                    ? 'Créditos do Scrape.do esgotados em todos os tokens. Cadastre um token de contingência ou aguarde a renovação.'
                    : userMlCookie
                        ? 'Cookie do ML expirado/inválido e Scrape.do também falhou. Atualize o cookie ou preencha manualmente.'
                        : `Scrape.do falhou (HTTP ${scrape.lastStatus})`,
                creditsExhausted: semCredito,
            });
        }

        // Sem titulo a pagina nem chegou a ser a do produto: isso e antibot, NAO e
        // produto fora do ar. Manter os dois casos separados e o ponto central desta
        // mudanca -- confundi-los e o que impedia marcar expired com seguranca.
        if (!title || !$) return res.json({ ok: false, availability: 'desconhecido', availabilitySignal: 'sem_titulo_antibot', error: 'Produto não encontrado (antibot). Preencha manualmente.' });

        const disp = lerDisponibilidadeML(scrape.html);

        // Prioridade: data-zoom (full-res) → og:image (boa res) → src (evitar: thumbnail lazy-load)
        // og:image ANTES de src: src pode ser thumbnail pequeno (-V/-I.jpg) quando JS nao carregou.
        const rawImage = $('figure.ui-pdp-gallery__figure img').first().attr('data-zoom')
            || $('meta[property="og:image"]').attr('content')
            || $('figure.ui-pdp-gallery__figure img').first().attr('src') || '';
        // Normaliza URL mlstatic para variante de maior resolucao (-O = original/maior)
        // Sufixos pequenos: -V (thumb), -I (small), -B (base), -F (full), -T (tiny) -> -O (original)
        const image = rawImage.includes('mlstatic.com')
            ? rawImage.replace(/-(V|I|B|F|T)\.(jpg|webp|jpeg|png)(\?.*)?$/i, '-O.$2')
            : rawImage;

        // MEDIDO 01/08: ler so .andes-money-amount__fraction DESCARTAVA os centavos.
        // R$ 74,90 virava 74 — o preco saia SEMPRE menor que o do site, nunca maior.
        // 90% dos produtos de ML no banco tinham preco redondo por causa disto,
        // contra 19% no radar_offers, que sempre usou a mlMoney() (linha ~809).
        // Duas leituras da mesma coisa no mesmo arquivo, uma certa e uma errada.
        let priceTo = mlMoneyPdp($, '.ui-pdp-price__second-line');
        let priceFrom = mlMoneyPdp($, '.ui-pdp-price__original-value');
        // Pagina de catalogo (/p/MLB..., polycard): os seletores acima nao
        // existem. Cai para o JSON-LD, que existe nos dois layouts. Ver o
        // cabecalho de mlPrecoJsonLd() para a medicao que motivou isto.
        if (!priceTo) {
            const ld = mlPrecoJsonLd($);
            if (ld.preco) {
                priceTo = ld.preco;
                if (!priceFrom && ld.de) priceFrom = ld.de;
                console.log(`[ml-product] preco veio do JSON-LD (layout catalogo): ${priceTo}`);
            }
        }
        const discPct = priceFrom && priceTo && priceFrom > priceTo
            ? Math.round((1 - priceTo / priceFrom) * 100) : null;

        console.log(`[ml-product] HTML scraping OK via token '${scrape.tokenUsed}': ${title.slice(0, 50)}`);
        console.log(`[ml-product] disponibilidade: ${disp.estado} (${disp.sinal})`);
        return res.json({ ok: true, name: title, title, image,
            availability: disp.estado,
            availabilitySignal: disp.sinal,
            price_to: priceTo ? String(priceTo) : undefined,
            price_from: priceFrom ? String(priceFrom) : undefined,
            discount_pct: discPct || undefined,
            usingPersonalToken,
            tokenUsed: scrape.tokenUsed,
        });
    } catch (e) {
        const msg = e.name === 'AbortError' ? 'Timeout buscando produto ML' : e.message;
        return res.status(502).json({ ok: false, availability: 'desconhecido', availabilitySignal: 'excecao', error: msg });
    }
});

// ===== Amazon: PA-API (Access Key + Secret Key) com fallback de scraping (so Partner Tag) =====
function amazonSigV4(method, host, path, region, service, payload, accessKey, secretKey, amzDate, dateStamp, amzTarget) {
    const hmac = (key, msg) => require('crypto').createHmac('sha256', key).update(msg, 'utf8').digest();
    const sha256Hex = (msg) => require('crypto').createHash('sha256').update(msg, 'utf8').digest('hex');
    const canonicalUri = path;
    const canonicalQuerystring = '';
    const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${amzTarget}\n`;
    const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
    const payloadHash = sha256Hex(payload);
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;
    const kDate = hmac('AWS4' + secretKey, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, 'aws4_request');
    const signature = require('crypto').createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');
    return `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function amazonPaApiSearch(keyword, partnerTag, accessKey, secretKey) {
    const host = 'webservices.amazon.com.br';
    const region = 'us-east-1';
    const service = 'ProductAdvertisingAPI';
    const amzTarget = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';
    const path = '/paapi5/searchitems';
    const payload = JSON.stringify({
        Keywords: keyword,
        Resources: ['Images.Primary.Large', 'ItemInfo.Title', 'Offers.Listings.Price', 'Offers.Listings.SavingBasis'],
        PartnerTag: partnerTag, PartnerType: 'Associates', Marketplace: 'www.amazon.com.br',
    });
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const authorizationHeader = amazonSigV4('POST', host, path, region, service, payload, accessKey, secretKey, amzDate, dateStamp, amzTarget);
    const r = await axios.post(`https://${host}${path}`, payload, {
        headers: {
            'content-encoding': 'amz-1.0',
            'content-type': 'application/json; charset=utf-8',
            'host': host,
            'x-amz-date': amzDate,
            'x-amz-target': amzTarget,
            'Authorization': authorizationHeader,
        },
        timeout: 10000,
        validateStatus: () => true,
    });
    if (r.status !== 200) {
        throw new Error(`PA-API: ${r.data?.Errors?.[0]?.Message || `HTTP ${r.status}`}`);
    }
    const items = r.data?.SearchResult?.Items || [];
    return items.map(item => {
        const listing = item.Offers?.Listings?.[0];
        const price = listing?.Price?.Amount ?? null;
        const savingBasis = listing?.SavingBasis?.Amount ?? null;
        const discountPct = savingBasis && price && savingBasis > price
            ? Math.round((1 - price / savingBasis) * 100) : 0;
        return {
            source: 'amazon',
            item_id: String(item.ASIN || ''),
            title: item.ItemInfo?.Title?.DisplayValue || '',
            price: price || 0,
            price_original: savingBasis || price || 0,
            discount_pct: discountPct,
            image_url: item.Images?.Primary?.Large?.URL || '',
            product_link: item.DetailPageURL || '',
            affiliate_url: item.DetailPageURL || '',
        };
    }).filter(it => it.item_id && it.title);
}

async function amazonScrapeSearch(keyword, partnerTag) {
    const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(keyword)}`;
    const r = await axios.get(url, {
        headers: ML_BROWSER_HEADERS,
        timeout: 10000,
        validateStatus: () => true,
    });
    if (r.status !== 200 || !r.data) return [];
    const cheerio = require('cheerio');
    const $ = cheerio.load(r.data);
    const results = [];
    $('div[data-component-type="s-search-result"]').each((i, el) => {
        if (i >= 15) return;
        const asin = $(el).attr('data-asin');
        if (!asin) return;
        const title = $(el).find('h2 span').first().text().trim();
        if (!title) return;
        const priceWhole = $(el).find('.a-price:not(.a-text-price) .a-price-whole').first().text().replace(/\D/g, '');
        const priceFraction = $(el).find('.a-price:not(.a-text-price) .a-price-fraction').first().text().replace(/\D/g, '') || '00';
        const price = priceWhole ? parseFloat(`${priceWhole}.${priceFraction}`) : 0;
        const origText = $(el).find('.a-text-price .a-offscreen').first().text().replace(/[^\d,.]/g, '').replace(',', '.');
        const priceOriginal = origText ? parseFloat(origText) : price;
        const image = $(el).find('img.s-image').first().attr('src') || '';
        const discountPct = priceOriginal && price && priceOriginal > price
            ? Math.round((1 - price / priceOriginal) * 100) : 0;
        results.push({
            source: 'amazon',
            item_id: asin,
            title,
            price: price || 0,
            price_original: priceOriginal || price || 0,
            discount_pct: discountPct,
            image_url: image,
            product_link: `https://www.amazon.com.br/dp/${asin}?tag=${encodeURIComponent(partnerTag)}`,
            affiliate_url: `https://www.amazon.com.br/dp/${asin}?tag=${encodeURIComponent(partnerTag)}`,
        });
    });
    return results;
}

app.post('/amazon-search', verifyToken, async (req, res) => {
    const { keywords = [], limit = 10, partnerTag = '', accessKey = '', secretKey = '' } = req.body || {};
    if (!partnerTag) return res.json({ ok: false, error: 'partnerTag obrigatorio', results: [] });
    const kws = keywords.length ? keywords : ['fone bluetooth', 'air fryer', 'smartwatch'];
    const perKw = Math.min(Number(limit) || 10, 20);
    const usaPaApi = !!(accessKey && secretKey && partnerTag);
    const errors = [];

    const settled = await Promise.all(kws.map(async (kw) => {
        try {
            const items = usaPaApi
                ? await amazonPaApiSearch(kw, partnerTag, accessKey, secretKey)
                : await amazonScrapeSearch(kw, partnerTag);
            return items.slice(0, perKw);
        } catch (e) {
            errors.push(`${kw}: ${e.message}`);
            return [];
        }
    }));

    const seen = new Set();
    const unique = [];
    for (const item of settled.flat()) {
        if (seen.has(item.item_id)) continue;
        seen.add(item.item_id);
        unique.push(item);
    }

    console.log(`[amazon-search] método=${usaPaApi ? 'pa-api' : 'scraping'} keywords=${kws.length} resultados=${unique.length} erros=${errors.length}`);
    res.json({ ok: true, total: unique.length, results: unique, errors, method: usaPaApi ? 'pa-api' : 'scraping' });
});

// -- Groups list --
// ── Identidade da sessao dentro de uma lista de participantes ──
//
// Existe porque o WhatsApp identifica a MESMA pessoa de duas formas que nao
// se convertem uma na outra:
//   - JID de telefone: "5531999999999:12@s.whatsapp.net"
//   - LID:             "182736451827364:12@lid"  (opaco, NAO e o telefone)
// Dentro de um unico g.participants as duas grafias convivem. Comparar so por
// numero — que foi o erro das REVISOES 113 e 114 — falha silenciosamente para
// todo participante que veio como LID.
//
// chaveDeId normaliza qualquer uma das duas para {tipo, chave} comparavel.
// Telefone compara pelos ultimos 8 digitos (mesma razao do sufixoFoneClone:
// o nono digito do celular brasileiro entra e sai conforme a origem do dado).
// LID compara inteiro — nao tem grafia alternativa.
function chaveDeId(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return null;
    const semDispositivo = s.split('@')[0].split(':')[0];
    const digitos = semDispositivo.replace(/\D/g, '');
    if (!digitos) return null;
    if (s.includes('@lid')) return { tipo: 'lid', chave: digitos };
    return { tipo: 'fone', chave: digitos.slice(-8) };
}

// Todas as identidades conhecidas desta sessao, em conjunto: o telefone (em
// duas origens, porque uma pode faltar) e o LID, quando a versao do Baileys
// expoe. Um participante casa se bater com QUALQUER uma.
function identidadesDaSessao(session) {
    const fones = new Set();
    const lids = new Set();
    for (const raw of [session?.phoneNumber, session?.socket?.user?.id, session?.socket?.user?.lid]) {
        const k = chaveDeId(raw);
        if (!k) continue;
        if (k.tipo === 'lid') lids.add(k.chave); else fones.add(k.chave);
    }
    return { fones, lids };
}

function idBateComSessao(raw, meu) {
    const k = chaveDeId(raw);
    if (!k) return false;
    return k.tipo === 'lid' ? meu.lids.has(k.chave) : meu.fones.has(k.chave);
}

app.get('/groups', verifyToken, resolverDono, async (req, res) => {
    const phoneParam = String(req.query.phone || '').replace(/\D/g, '');

    // SEM FALLBACK, de proposito. Este endpoint tinha um "se nao achou pelo
    // phone, usa qualquer sessao paired" que, com varias sessoes no mesmo
    // container, devolvia os grupos do WhatsApp de OUTRO usuario para quem
    // perguntou. Isso e vazamento entre contas, e chegava em dois lugares: na
    // tela de vincular grupos ao Grupo de Oferta e no cadastro de fontes do
    // Clone Post. Sem saber de quem e o numero, nao ha resposta correta possivel.
    if (!phoneParam) {
        return res.status(400).json({ error: 'Informe o número da sessão em ?phone=. Sem ele não dá pra saber de quem são os grupos.', groups: [] });
    }
    // P35: o ?phone= sozinho provava so que o numero EXISTE, nao que e do
    // usuario que perguntou. Continuava sendo vazamento entre contas — so que
    // agora exigia saber o telefone de outra conta, em vez de acertar por
    // acaso na sessao "qualquer uma paired".
    if (!donoAutorizado(req, phoneParam)) {
        return res.status(403).json({ error: 'Esse número não pertence a este usuário.', groups: [] });
    }

    let session = null;
    for (const [, s] of SESSIONS) {
        if (s.status !== 'paired') continue;
        const sp = String(s.phoneNumber || '').replace(/\D/g, '');
        if (!sp) continue;
        // Os ultimos 8 digitos sao estaveis entre as duas grafias (com e sem o
        // nono digito) que convivem no cadastro — mesmo criterio da wa-heartbeat.
        if (sp.slice(-8) === phoneParam.slice(-8)) { session = s; break; }
    }

    if (!session) {
        return res.status(404).json({ error: 'Nenhuma sessão conectada para esse número.', groups: [] });
    }

    try {
        const groups = await session.socket.groupFetchAllParticipating();

        // REVISAO 115. As duas tentativas anteriores (113 e 114) erraram pelo
        // mesmo motivo de fundo: assumiram que o participante do grupo vem
        // identificado por NUMERO DE TELEFONE. Hoje o WhatsApp mistura, na
        // MESMA lista de participantes, JID de telefone (@s.whatsapp.net) e
        // LID (@lid) — um identificador opaco que NAO tem relacao nenhuma com
        // o numero. Comparar numero contra LID falha sempre, e como a 113
        // transformou essa comparacao em filtro obrigatorio, a lista inteira
        // zerou. Aqui a identidade da sessao e um CONJUNTO (telefone + LID) e
        // o participante casa se QUALQUER campo dele casar com QUALQUER uma
        // das nossas identidades.
        const meu = identidadesDaSessao(session);
        const souEu = (raw) => idBateComSessao(raw, meu);
        // Um participante pode trazer o mesmo sujeito em campos diferentes
        // conforme a versao do Baileys: id, jid, lid, phoneNumber.
        const participanteSouEu = (p) =>
            souEu(p?.id) || souEu(p?.jid) || souEu(p?.lid) || souEu(p?.phoneNumber);

        const list = Object.values(groups).map(g => {
            const eu = (g.participants || []).find(participanteSouEu) || null;
            const meuAdmin = eu?.admin || null;
            // "Dono" = quem criou o grupo. Duas fontes, nessa ordem:
            // 1) g.owner, quando o WhatsApp manda (nem sempre manda — em muita
            //    metadata sincronizada ele vem vazio);
            // 2) nos mesmos marcados 'superadmin' na lista de participantes.
            //    Quem cria um grupo vira superadmin e so ha um por grupo.
            // 'admin' comum e administrador PROMOVIDO, nao dono — fica de fora,
            // que e exatamente o caso que confundia o usuario.
            const ownerBate = g.owner ? souEu(g.owner) : null;
            const isOwner = ownerBate === true || (ownerBate === null && meuAdmin === 'superadmin');
            return {
                id: g.id,
                name: g.subject || g.id,
                participants: g.participants?.length || 0,
                isAdmin: meuAdmin === 'admin' || meuAdmin === 'superadmin',
                isOwner,
                // Cru, de proposito: o frontend decide o que esconder, e da pra
                // conferir por que um grupo entrou ou saiu sem redeploy.
                ownerRaw: g.owner || null,
                meuPapel: meuAdmin,
                meEncontrouNaLista: !!eu,
            };
        });

        // NAO filtra aqui. A 113 filtrava no servidor e, quando o criterio
        // errou, a tela ficou vazia sem nenhuma pista do porque. O filtro
        // agora e do frontend, que consegue mostrar o motivo e oferecer saida.
        const resposta = { groups: list, total: list.length, owned: list.filter(g => g.isOwner).length };

        // ?debug=1 — evidencia crua pra fechar a questao com dado, nao com
        // suposicao. So chega aqui quem ja passou por verifyToken +
        // donoAutorizado, entao e o proprio dono do numero olhando.
        if (String(req.query.debug || '') === '1') {
            const amostra = Object.values(groups).slice(0, 3).map(g => ({
                subject: g.subject,
                owner: g.owner || null,
                participantesAmostra: (g.participants || []).slice(0, 5).map(p => ({
                    id: p.id, jid: p.jid, lid: p.lid, phoneNumber: p.phoneNumber, admin: p.admin,
                })),
            }));
            resposta._debug = {
                sessionPhoneNumber: session.phoneNumber,
                socketUserId: session.socket?.user?.id || null,
                socketUserLid: session.socket?.user?.lid || null,
                identidades: { fones: [...meu.fones], lids: [...meu.lids] },
                amostra,
            };
        }

        res.json(resposta);
    } catch (e) {
        console.error('[GROUPS] Erro:', e.message);
        res.status(500).json({ error: e.message, groups: [] });
    }
});

// -- Convite: resolver JID e nome de um grupo pelo link de convite --
//
// Existe porque o groupFetchAllParticipating() do /groups NAO devolve todos os
// grupos da sessao. MEDIDO em 03/08: a sessao 553198911521 recebia mensagem do
// grupo 120363426927737879@g.us (170 linhas em clone_ingest_log, ultima 13:51
// UTC, 4 capturas no dia) e mesmo assim esse jid ficava de fora da lista de 19
// que o /groups devolvia. Sem este caminho, grupo assim e incadastravel pelo
// painel, por mais que o usuario role o dropdown.
//
// ATENCAO, e o frontend precisa dizer isso na tela: a resposta NAO prova que a
// sessao participa do grupo. O WhatsApp responde invite info para qualquer
// codigo valido. Quem colar o link de um grupo em que nao esta cadastra uma
// fonte que nunca vai capturar nada — falha silenciosa, nao erro.
function extrairCodigoConvite(v) {
    const s = String(v || '').trim();
    // Com o dominio na frente, a intencao esta provada: aceita o codigo como vier.
    const m = s.match(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{6,})/i);
    if (m) return m[1];
    // Codigo solto e outra historia: sem dominio, qualquer palavra parece codigo.
    // O formato real do WhatsApp e alfanumerico puro, 22 caracteres. A regra
    // frouxa de antes ([A-Za-z0-9_-]{6,}) aceitou "COLE_AQUI_O_LINK_DO_ACHADINHOS"
    // e mandou isso pro WhatsApp como se fosse convite.
    if (/^[A-Za-z0-9]{15,30}$/.test(s)) return s;
    return '';
}

// Prazo maximo para qualquer ida ao WhatsApp neste endpoint. Sem isto a consulta
// herda o default do Baileys, o proxy do EasyPanel desiste antes e responde 502
// SEM cabecalho CORS — o navegador so mostra "blocked by CORS policy" e a causa
// real (a consulta pendurada) fica invisivel.
function comPrazo(promessa, ms, oQue) {
    let t;
    const limite = new Promise((_, rej) => {
        t = setTimeout(() => rej(new Error(`${oQue} nao respondeu em ${Math.round(ms / 1000)}s`)), ms);
    });
    return Promise.race([promessa, limite]).finally(() => clearTimeout(t));
}

app.get('/group-invite-info', verifyToken, resolverDono, async (req, res) => {
    const phoneParam = String(req.query.phone || '').replace(/\D/g, '');
    const code = extrairCodigoConvite(req.query.code);

    // Mesmo criterio do /groups: sem o numero nao ha resposta correta possivel.
    if (!phoneParam) {
        return res.status(400).json({ error: 'Informe o número da sessão em ?phone=.' });
    }
    if (!code) {
        return res.status(400).json({ error: 'Isso não parece um link de convite. Esperado: https://chat.whatsapp.com/XXXXXXXX — se você colou uma página de links (linktr.ee e parecidas), abra o grupo no WhatsApp e use "Convidar via link".' });
    }
    if (!donoAutorizado(req, phoneParam)) { // P35, mesmo motivo do /groups acima
        return res.status(403).json({ error: 'Esse número não pertence a este usuário.' });
    }

    let session = null;
    for (const [, s] of SESSIONS) {
        if (s.status !== 'paired') continue;
        const sp = String(s.phoneNumber || '').replace(/\D/g, '');
        if (!sp) continue;
        if (sp.slice(-8) === phoneParam.slice(-8)) { session = s; break; }
    }
    if (!session) {
        return res.status(404).json({ error: 'Nenhuma sessão conectada para esse número.' });
    }

    try {
        const info = await comPrazo(session.socket.groupGetInviteInfo(code), 12000, 'o WhatsApp');
        const id = String(info?.id || '');
        if (!id.endsWith('@g.us')) throw new Error('a resposta veio sem JID de grupo');
        console.log(`[INVITE] ${code.slice(0, 6)}… -> ${id} (${info?.subject || 'sem nome'})`);
        res.json({
            ok: true,
            id,
            subject: info?.subject || id,
            size: info?.size || info?.participants?.length || 0,
        });
    } catch (e) {
        console.error('[INVITE] Erro:', e.message);
        res.status(502).json({ error: `Não consegui ler esse convite: ${e.message}` });
    }
});

// -- Convite: resolver JID de um CANAL (newsletter) pelo link de convite --
// (P95, 29/08). Par do /group-invite-info acima, só que pra canal em vez de
// grupo. Sem isso o cadastro de canal (frontend `vincularCanal`) não tinha
// como saber o JID real — só guardava o link, e o /send tentava adivinhar o
// JID a partir da URL, o que nunca funcionou (ver "P95" no /send acima).
//
// `newsletterMetadata('invite', code)` é a chamada do Baileys pra isso —
// existe desde a 6.6.x (o package.json já pede ^6.5.0, então um npm install
// novo já traz a versão com suporte; não precisou subir o pin). Devolve
// `{ id, name, subscribers, ... }`, `id` no formato "NNNN@newsletter".
function extrairCodigoCanal(v) {
    const s = String(v || '').trim();
    // Com o domínio na frente a intenção está provada: aceita o código como vier.
    const m = s.match(/whatsapp\.com\/channel\/([A-Za-z0-9]{10,40})/i);
    if (m) return m[1];
    // Código solto: mesmo criterio frouxo-mas-nao-tanto do grupo acima.
    if (/^[A-Za-z0-9]{10,40}$/.test(s)) return s;
    return '';
}

app.get('/channel-invite-info', verifyToken, resolverDono, async (req, res) => {
    const phoneParam = String(req.query.phone || '').replace(/\D/g, '');
    const code = extrairCodigoCanal(req.query.code);

    if (!phoneParam) {
        return res.status(400).json({ error: 'Informe o número da sessão em ?phone=.' });
    }
    if (!code) {
        return res.status(400).json({ error: 'Isso não parece um link de canal do WhatsApp. Esperado: https://whatsapp.com/channel/XXXXXXXX.' });
    }
    if (!donoAutorizado(req, phoneParam)) { // mesmo motivo do /group-invite-info
        return res.status(403).json({ error: 'Esse número não pertence a este usuário.' });
    }

    let session = null;
    for (const [, s] of SESSIONS) {
        if (s.status !== 'paired') continue;
        const sp = String(s.phoneNumber || '').replace(/\D/g, '');
        if (!sp) continue;
        if (sp.slice(-8) === phoneParam.slice(-8)) { session = s; break; }
    }
    if (!session) {
        return res.status(404).json({ error: 'Nenhuma sessão conectada para esse número.' });
    }

    try {
        const info = await comPrazo(session.socket.newsletterMetadata('invite', code), 12000, 'o WhatsApp');
        const id = String(info?.id || '');
        if (!id.endsWith('@newsletter')) throw new Error('a resposta veio sem JID de canal');

        // REVISAO 116. Ate aqui este endpoint NAO checava papel nenhum: o
        // frontend gravava role:"owner" na unha pra qualquer link colado, e o
        // FAQ prometia "so da pra vincular canal onde voce e Dono ou Admin" —
        // promessa que o codigo nunca cumpriu. Canal de terceiro entrava como
        // OWNER e o disparo simplesmente nao saia depois.
        //
        // Canal nao tem lista de participantes (por isso o problema de
        // LID/telefone dos grupos nao existe aqui): quem diz o papel e o
        // proprio WhatsApp, em viewer_metadata.role
        // ('owner' | 'admin' | 'subscriber' | 'guest').
        const lerPapel = (m) => {
            const vm = m?.viewer_metadata || m?.viewerMetadata || null;
            const r = String(vm?.role || '').toLowerCase().trim();
            return r || null;
        };
        let papel = lerPapel(info);
        let origemPapel = papel ? 'invite' : null;
        // A consulta por convite e publica e costuma vir SEM viewer_metadata.
        // A consulta por JID e a que o WhatsApp responde "como eu" — e onde o
        // papel real aparece. So vale a pena quando a primeira nao trouxe.
        if (!papel) {
            try {
                const porJid = await comPrazo(session.socket.newsletterMetadata('jid', id), 8000, 'o WhatsApp');
                papel = lerPapel(porJid);
                if (papel) origemPapel = 'jid';
            } catch (e) {
                console.warn(`[CHANNEL-INVITE] não consegui ler o papel por JID: ${e.message}`);
            }
        }

        const isOwner = papel === 'owner';
        const isAdmin = papel === 'admin' || isOwner;
        console.log(`[CHANNEL-INVITE] ${code.slice(0, 6)}… -> ${id} (${info?.name || 'sem nome'}) papel=${papel || 'desconhecido'}`);
        res.json({
            ok: true,
            id,
            subject: info?.name || id,
            size: info?.subscribers || 0,
            // Cru e explicito. `papelConhecido:false` significa "o WhatsApp nao
            // disse" — e NAO deve ser lido como "nao e dono": a REVISAO 113
            // ja ensinou o preco de tratar calculo nao verificado como prova.
            role: papel,
            isOwner,
            isAdmin,
            papelConhecido: !!papel,
            origemPapel,
        });
    } catch (e) {
        console.error('[CHANNEL-INVITE] Erro:', e.message);
        res.status(502).json({ error: `Não consegui ler esse canal: ${e.message}` });
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
        // Versão do que está EXECUTANDO, não do que o package.json pede. Sem
        // isto, "o sharp subiu no 0.35.x" era dedução do build ter passado —
        // e build passar não é o mesmo que o binário certo estar carregado
        // (cache de camada do Docker reusa node_modules).
        versoes: {
            node: process.version,
            sharp: sharp.versions?.sharp || null,
            vips: sharp.versions?.vips || null
        },
        timestamp: new Date().toISOString()
    });
});

// ============ STARTUP ============
async function startup() {
    try {
        await fs.ensureDir(AUTH_DIR);

        // Abre a porta e responde /health IMEDIATAMENTE. Reconectar sessões salvas do
        // WhatsApp pode levar dezenas de segundos (uma por uma, com espera de 2s entre
        // cada) — se isso acontecer ANTES do app.listen, o healthcheck do EasyPanel/
        // Railway/Fly falha por timeout, o painel entende que o container está travado
        // e o reinicia — gerando um loop de restart que aparece no navegador como
        // "erro de CORS" (o proxy responde 502 sem os headers de CORS do Express).
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
  GET    /group-invite-info    → Resolver grupo pelo link de convite
  GET    /channel-invite-info  → Resolver canal (newsletter) pelo link de convite
  GET    /health               → Status

Autenticação: Bearer token (WA_ENGINE_TOKEN)
            `);
        });

        // Restaura sessões salvas em segundo plano, sem bloquear o healthcheck.
        restoreSessions().catch(e => console.error('[RESTORE] Falha geral ao restaurar sessões:', e.message));
    } catch (error) {
        console.error('❌ Erro ao iniciar:', error);
        process.exit(1);
    }
}

// ============ HELPERS ============
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============ REDE DE SEGURANÇA GLOBAL ============
// Impede que um erro assíncrono não capturado (ex.: ENOENT ao salvar creds de uma
// sessão cuja pasta foi removida por conflito 440, ou qualquer falha do Baileys)
// derrube o processo inteiro. Sem isso, o container cai e TODOS os endpoints
// (/groups, /reconnect, /ml-product, etc.) retornam 404 até reiniciar.
process.on('uncaughtException', (err) => {
    console.error(`[UNCAUGHT] ${err?.code || ''} ${err?.message || err}`);
    if (err?.stack) console.error(err.stack);
    // NÃO chama process.exit — mantém o servidor HTTP de pé.
});
process.on('unhandledRejection', (reason) => {
    console.error(`[UNHANDLED_REJECTION] ${reason?.code || ''} ${reason?.message || reason}`);
});

// ══════════════════════════════════════════════════════════════════
// HEARTBEAT — sinal de vida das sessões para o Supabase
//
// Motivo: até então nada atualizava whatsapp_instances.last_seen_at. O banco
// mantinha sessões como 'connected' por semanas depois de mortas, e a queda só
// era descoberta quando um disparo falhava. Agora o engine avisa periodicamente
// quais sessões estão vivas.
//
// Não usamos a SERVICE_ROLE_KEY aqui de propósito: ela daria a este container
// acesso irrestrito ao banco. Autenticamos na Edge Function wa-heartbeat com o
// WA_ENGINE_TOKEN, que já é compartilhado entre os dois lados.
// ══════════════════════════════════════════════════════════════════
const HEARTBEAT_MS = Number(process.env.WA_HEARTBEAT_MS || 120000); // 2 min
const HEARTBEAT_URL = `${SUPABASE_URL}/functions/v1/wa-heartbeat`;

async function enviarHeartbeat() {
    if (!WA_ENGINE_TOKEN) return;

    const sessions = [];
    for (const [, s] of SESSIONS) {
        if (!s.phoneNumber) continue;
        // Só reporta estados conclusivos. 'waiting'/'reconnecting' são transitórios
        // e reportá-los derrubaria sessões que estão apenas se restabelecendo.
        if (s.status === 'paired') {
            sessions.push({ phone: s.phoneNumber, status: 'paired' });
            s.lastSeenAt = Date.now();
        } else if (s.status === 'closed' || s.status === 'logged_out') {
            sessions.push({ phone: s.phoneNumber, status: 'closed' });
        }
    }

    if (!sessions.length) return;

    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const r = await fetch(HEARTBEAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WA_ENGINE_TOKEN}`,
            },
            body: JSON.stringify({ sessions }),
            signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!r.ok) {
            const txt = await r.text().catch(() => '');
            console.warn(`[HEARTBEAT] HTTP ${r.status} — ${txt.slice(0, 160)}`);
        } else {
            console.log(`[HEARTBEAT] ${sessions.length} sessão(ões) reportada(s)`);
        }
    } catch (err) {
        // Falha de heartbeat nunca pode derrubar o engine nem interromper disparos.
        console.warn(`[HEARTBEAT] falhou: ${err?.message || err}`);
    }
}

// Aviso imediato de sessao definitivamente morta (logout pelo celular).
// Nao aguarda o ciclo do heartbeat porque a sessao e removida da memoria na hora.
async function reportarSessaoMorta(phoneNumber) {
    if (!WA_ENGINE_TOKEN || !phoneNumber) return;
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        await fetch(HEARTBEAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WA_ENGINE_TOKEN}`,
            },
            body: JSON.stringify({ sessions: [{ phone: phoneNumber, status: 'logged_out' }] }),
            signal: ctrl.signal,
        });
        clearTimeout(t);
        console.log(`[HEARTBEAT] sessão ${phoneNumber} reportada como encerrada`);
    } catch (err) {
        console.warn(`[HEARTBEAT] falha ao reportar sessão morta: ${err?.message || err}`);
    }
}

// Aviso imediato de sessao recem-conectada (pareamento novo ou restauracao apos
// restart). Nao espera o ciclo do heartbeat para o painel refletir a realidade.
async function reportarSessaoViva(phoneNumber) {
    if (!WA_ENGINE_TOKEN || !phoneNumber) return;
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const r = await fetch(HEARTBEAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WA_ENGINE_TOKEN}`,
            },
            body: JSON.stringify({ sessions: [{ phone: phoneNumber, status: 'paired' }] }),
            signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!r.ok) {
            const txt = await r.text().catch(() => '');
            console.warn(`[HEARTBEAT] sessão ${phoneNumber} — HTTP ${r.status} ${txt.slice(0, 120)}`);
        } else {
            console.log(`[HEARTBEAT] sessão ${phoneNumber} reportada como conectada`);
        }
    } catch (err) {
        console.warn(`[HEARTBEAT] falha ao reportar sessão viva: ${err?.message || err}`);
    }
}

// ══════════════════════════════════════════════════════════════════
// CLONE POST FASE 2 — captura automatica de ofertas de grupos-fonte
//
// O engine escuta APENAS os grupos que o usuario cadastrou como fonte e manda o
// texto pra Edge Function clone-ingest, que resolve o link, troca o afiliado e
// grava na fila pra revisao. Aqui nao ha nenhuma decisao de produto: o engine
// filtra pelo JID e repassa. Plano, teto diario e deduplicacao moram do outro lado.
//
// Tres cuidados que valem estar escritos:
//  1. Nada aqui pode derrubar a sessao. O handler inteiro vive dentro de
//     try/catch e qualquer falha de rede vira console.warn, nunca excecao solta.
//  2. Sem a lista de JIDs carregada o listener nao faz absolutamente nada — ele
//     nunca vira firehose das conversas de quem conectou o WhatsApp.
//  3. Mensagem sem link nao vira nada: e conversa de grupo, nao oferta.
//
// A lista de grupos vem da propria clone-ingest (action:'jids'). O engine fala
// com o banco pela chave publishable e o RLS de clone_sources so deixa o dono
// ler; pedir a lista pela Edge Function evita colocar a service role no container.
// ══════════════════════════════════════════════════════════════════
const CLONE_INGEST_URL = `${SUPABASE_URL}/functions/v1/clone-ingest`;
const CLONE_JIDS = new Set();
// Sufixos de 8 digitos dos telefones que sao donos de alguma fonte ativa.
// Vazio = clone-ingest antiga (pre-v9) ou lista ainda nao carregada.
const CLONE_DONOS = new Set();
const CLONE_FILA = [];
const CLONE_VISTAS = new Set(); // msgIds ja enfileirados neste processo
const CLONE_REFRESH_MS = Number(process.env.CLONE_REFRESH_MS || 300000); // 5 min
const CLONE_FLUSH_MS = Number(process.env.CLONE_FLUSH_MS || 10000);      // 10 s
const CLONE_LOTE_MAX = 20;

async function recarregarFontesClone() {
    if (!WA_ENGINE_TOKEN) return;
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const r = await fetch(CLONE_INGEST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${WA_ENGINE_TOKEN}` },
            body: JSON.stringify({ action: 'jids' }),
            signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!r.ok) { console.warn(`[CLONE] lista de fontes — HTTP ${r.status}`); return; }
        const d = await r.json();
        if (!d || !Array.isArray(d.jids)) return;
        CLONE_JIDS.clear();
        for (const j of d.jids) CLONE_JIDS.add(String(j).toLowerCase());
        // `donos` so existe da clone-ingest v9 pra frente. Ausente, o Set fica
        // vazio e o listener volta a valer pra todas as sessoes — que e o
        // comportamento antigo, nao uma falha nova.
        CLONE_DONOS.clear();
        if (Array.isArray(d.donos)) {
            for (const f of d.donos) { const s = sufixoFoneClone(f); if (s) CLONE_DONOS.add(s); }
        }
        console.log(`[CLONE] ${CLONE_JIDS.size} grupo(s)-fonte monitorado(s) · ${CLONE_DONOS.size} sessao(oes) dona(s)`);
    } catch (err) {
        console.warn(`[CLONE] não consegui recarregar as fontes: ${err?.message || err}`);
    }
}

// Ultimos 8 digitos: chave estavel entre as duas grafias do numero (com e sem o
// nono digito) que convivem no cadastro. Mesmo criterio do /groups, da
// wa-heartbeat e da checagem de dono dentro da clone-ingest.
function sufixoFoneClone(raw) {
    const n = String(raw ?? '').replace(/\D/g, '');
    return n ? n.slice(-8) : '';
}

// Texto util de uma mensagem. Legenda de imagem conta: e o formato mais comum
// de post de oferta em grupo de WhatsApp.
// Desembrulha as camadas que o WhatsApp poe POR FORA do conteudo real. A mais
// importante e `ephemeralMessage`: grupo com MENSAGENS TEMPORARIAS ligadas
// entrega TODA mensagem embrulhada nela.
//
// MEDIDO em 03/08: o "Grupo de Achadinhos #34" esta com mensagens temporarias
// ligadas. Em 10h20 como UNICA fonte ativa, com a sessao conectada, o engine de
// pe e as tres lojas liberadas, o clone_ingest_log ficou com ZERO linhas — nem
// captura, nem recusa. A mensagem morria aqui: textoDaMensagem lia a camada de
// fora, nao achava texto, e o listener fazia `continue` sem registrar nada.
//
// A lista de embrulhos e a mesma do normalizeMessageContent do Baileys
// (lib/Utils/messages.js, v6). Copiada em vez de importada de proposito: o
// engine e CommonJS e o pacote e ESM ("type": "module"); um import que nao
// resolva derruba o processo inteiro, e esse custo e desproporcional ao de oito
// linhas que nao dependem de nada.
function conteudoRealDaMensagem(m) {
    let c = m || {};
    for (let i = 0; i < 5; i++) {   // teto igual ao do Baileys: evita laco infinito
        const embrulho = c.ephemeralMessage
            || c.viewOnceMessage
            || c.documentWithCaptionMessage
            || c.viewOnceMessageV2
            || c.viewOnceMessageV2Extension
            || c.editedMessage;
        if (!embrulho || !embrulho.message) break;
        c = embrulho.message;
    }
    return c;
}

function textoDaMensagem(m) {
    const c = conteudoRealDaMensagem(m);
    return c.conversation
        || c.extendedTextMessage?.text
        || c.imageMessage?.caption
        || c.videoMessage?.caption
        || c.documentWithCaptionMessage?.message?.documentMessage?.caption
        || c.documentMessage?.caption
        || '';
}

// messageTimestamp as vezes vem como Long do protobuf, e Number(Long) da NaN.
function tsDaMensagem(raw) {
    if (typeof raw === 'number') return raw;
    if (raw && typeof raw.toNumber === 'function') { try { return raw.toNumber(); } catch (e) {} }
    if (raw && typeof raw.low === 'number') return raw.low;
    return Number(raw) || 0;
}

async function despejarFilaClone() {
    if (!CLONE_FILA.length || !WA_ENGINE_TOKEN) return;
    const lote = CLONE_FILA.splice(0, CLONE_LOTE_MAX);
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 90000);
        const r = await fetch(CLONE_INGEST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${WA_ENGINE_TOKEN}` },
            body: JSON.stringify({ messages: lote }),
            signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!r.ok) {
            const txt = await r.text().catch(() => '');
            console.warn(`[CLONE] ingest HTTP ${r.status} — ${txt.slice(0, 200)}`);
            return;
        }
        const d = await r.json().catch(() => null);
        console.log(`[CLONE] ${lote.length} mensagem(ns) enviada(s) · ${d?.salvos ?? '?'} clonada(s)`);
    } catch (err) {
        // Perder um lote e melhor que reenfileirar pra sempre: o dedupe do outro
        // lado protege contra repeticao, mas fila que nunca esvazia vira vazamento.
        console.warn(`[CLONE] falha ao enviar lote (${lote.length} descartada(s)): ${err?.message || err}`);
    }
}

function registrarListenerClone(socket, sessionId) {
    socket.ev.on('messages.upsert', (evt) => {
        try {
            // 'append' e sincronizacao de historico; so 'notify' e mensagem nova.
            if (!evt || evt.type !== 'notify' || !CLONE_JIDS.size) return;
            const fone = SESSIONS.get(sessionId)?.phoneNumber || null;
            // Sessao que nao e dona de fonte nenhuma nao tem o que capturar. A
            // conexao admin da plataforma cai exatamente aqui: ela esta nos
            // mesmos grupos e recebe os mesmos eventos, e ate a v8 disputava
            // cada mensagem com a sessao do dono. Quem chegasse primeiro gravava
            // o msgId em CLONE_VISTAS e calava o outro — quando a admin ganhava
            // a corrida, a captura morria em 'outro_dono' na clone-ingest e o
            // dono perdia a oferta de vez. Filtrar aqui mata a corrida na raiz.
            //
            // Filtro no handler, e nao no registro do listener: uma sessao vira
            // dona no minuto em que o usuario cadastra uma fonte, e isso nao
            // pode depender de reconectar o WhatsApp.
            if (CLONE_DONOS.size && !CLONE_DONOS.has(sufixoFoneClone(fone))) return;
            for (const m of evt.messages || []) {
                const jid = String(m?.key?.remoteJid || '').toLowerCase();
                if (!jid.endsWith('@g.us')) continue;   // so grupo
                if (m?.key?.fromMe) continue;           // nao clonar o proprio post
                if (!CLONE_JIDS.has(jid)) continue;     // grupo nao cadastrado como fonte
                const id = String(m?.key?.id || '');
                if (id && CLONE_VISTAS.has(id)) continue;
                const texto = textoDaMensagem(m?.message);
                if (!texto || !/https?:\/\//i.test(texto)) {
                    // Descarte VISIVEL. Ate 03/08 este `continue` era mudo: a mensagem
                    // que morria aqui nao deixava linha em lugar nenhum, e o painel do
                    // dono mostrava um silencio identico ao de "grupo parado". Foi
                    // exatamente esse ponto cego que escondeu a mensagem temporaria
                    // por 10 horas. So vale para grupo JA cadastrado como fonte, entao
                    // o volume e limitado pelo numero de fontes.
                    const tipo = Object.keys(m?.message || {})[0] || 'vazio';
                    console.log(`[CLONE] descartada em ${jid}: ${texto ? 'texto sem link' : 'sem texto legivel'} (tipo ${tipo})`);
                    continue;
                }
                if (id) {
                    CLONE_VISTAS.add(id);
                    // Cache curto, so pra nao reenviar no mesmo processo.
                    // A verdade do dedupe esta no banco.
                    if (CLONE_VISTAS.size > 500) CLONE_VISTAS.clear();
                }
                CLONE_FILA.push({
                    sessionPhone: fone,
                    jid,
                    msgId: id,
                    text: String(texto).slice(0, 2000),
                    ts: tsDaMensagem(m?.messageTimestamp),
                });
                console.log(`[CLONE] capturada em ${jid} (${id.slice(0, 12)})`);
            }
        } catch (err) {
            // Um erro aqui NUNCA pode derrubar a sessao de WhatsApp.
            console.warn(`[CLONE] listener de ${sessionId} ignorou um erro: ${err?.message || err}`);
        }
    });
}

setInterval(() => { recarregarFontesClone().catch(() => {}); }, CLONE_REFRESH_MS);
setInterval(() => { despejarFilaClone().catch(() => {}); }, CLONE_FLUSH_MS);
// Primeira carga logo apos o startup restaurar as sessoes do disco.
setTimeout(() => { recarregarFontesClone().catch(() => {}); }, 15000);

setInterval(() => { enviarHeartbeat().catch(() => {}); }, HEARTBEAT_MS);
// Primeiro envio logo apos o startup restaurar as sessoes do disco
setTimeout(() => { enviarHeartbeat().catch(() => {}); }, 20000);

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
