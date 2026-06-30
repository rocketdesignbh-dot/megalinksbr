/**
 * Rate Limit Utilities — wa-engine
 * Validação de rate limit antes de enviar mensagens
 * Usa REST API do Supabase diretamente (fetch) — evita crash do
 * SDK completo (@supabase/supabase-js) que tenta inicializar
 * WebSocket/Realtime e quebra em Node 20 sem suporte nativo.
 */

class RateLimitValidator {
  constructor(supabaseUrl, supabaseKey) {
    this.url = supabaseUrl.replace(/\/$/, '');
    this.key = supabaseKey;
  }

  /**
   * Chama uma função RPC do Supabase via REST
   */
  async _callRpc(functionName, params) {
    const r = await fetch(`${this.url}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.key,
        'Authorization': 'Bearer ' + this.key
      },
      body: JSON.stringify(params)
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw new Error(`RPC ${functionName} failed: HTTP ${r.status} ${text}`);
    }

    return r.json();
  }

  /**
   * Validar rate limit antes de enviar mensagens
   * @param {string} userId - User ID do Supabase (auth.users.id)
   * @param {number} messageCount - Quantidade de mensagens que vai enviar (1 por grupo)
   * @returns {Promise<{success: boolean, code: string, message: string, ...}>}
   */
  async validate(userId, messageCount = 1) {
    try {
      if (!userId) {
        return {
          success: false,
          code: 'NO_USER',
          message: '❌ Usuário não identificado'
        };
      }

      const data = await this._callRpc('validate_rate_limit', {
        p_user_id: userId,
        p_message_count: messageCount
      });

      return data || { success: false, code: 'UNKNOWN', message: 'Erro desconhecido' };
    } catch (e) {
      console.error('[RATE_LIMIT] Validate error:', e.message);
      // Fail-open: deixa passar se a validação falhar (não derruba o envio)
      return {
        success: true,
        code: 'RPC_ERROR',
        message: '⚠️ Validação indisponível (modo permissivo)'
      };
    }
  }

  /**
   * Incrementar contador após envio bem-sucedido
   * @param {string} userId - User ID
   * @param {number} messageCount - Quantidade enviada (1 por grupo)
   */
  async increment(userId, messageCount = 1) {
    try {
      if (!userId) return false;

      await this._callRpc('increment_rate_limit', {
        p_user_id: userId,
        p_message_count: messageCount
      });

      return true;
    } catch (e) {
      console.warn('[RATE_LIMIT] Increment error:', e.message);
      return false;
    }
  }

  /**
   * Middleware Express para validar rate limit
   * Uso: app.use(rateLimitMiddleware)
   * Body deve conter: { userId, messageCount (opcional, default 1) }
   */
  middleware() {
    return async (req, res, next) => {
      const { userId, messageCount = 1 } = req.body;

      if (!userId) {
        return next();
      }

      const validation = await this.validate(userId, messageCount);
      req.rateLimit = validation;

      if (!validation.success) {
        const statusCode =
          validation.code === 'PENALIZED' ? 429 :
          validation.code === 'LIMIT_EXCEEDED' ? 429 :
          500;

        return res.status(statusCode).json({
          ok: false,
          error: validation.code,
          message: validation.message,
          ...validation
        });
      }

      next();
    };
  }

  /**
   * Wrapper para endpoint que envia mensagens
   * Automatiza: validar -> enviar -> incrementar
   */
  async validateAndSend(userId, messageCount, sendCallback) {
    const validation = await this.validate(userId, messageCount);

    if (!validation.success) {
      return {
        ok: false,
        error: validation.code,
        message: validation.message,
        ...validation
      };
    }

    let sendResult = { ok: false, sent: 0 };
    try {
      sendResult = await sendCallback();
    } catch (e) {
      return {
        ok: false,
        error: 'SEND_ERROR',
        message: e.message,
        sent: 0
      };
    }

    if (sendResult.ok && sendResult.sent > 0) {
      await this.increment(userId, sendResult.sent);
    }

    return {
      ...sendResult,
      rateLimit: {
        limit: validation.limit,
        sent_before: validation.sent,
        sent_now: sendResult.sent,
        sent_total: (validation.sent || 0) + (sendResult.sent || 0),
        remaining: validation.available ? (validation.available - (sendResult.sent || 0)) : undefined
      }
    };
  }
}

module.exports = RateLimitValidator;
