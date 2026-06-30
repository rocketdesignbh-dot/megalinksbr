/**
 * Rate Limit Utilities — wa-engine
 * Validação de rate limit antes de enviar mensagens
 * Integração com Supabase RPC
 */

const { createClient } = require('@supabase/supabase-js');

class RateLimitValidator {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
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

      const { data, error } = await this.supabase.rpc(
        'validate_rate_limit',
        {
          p_user_id: userId,
          p_message_count: messageCount
        }
      );

      if (error) {
        console.error('[RATE_LIMIT] RPC error:', error);
        // Fail-open: deixa passar se RPC falhar
        return {
          success: true,
          code: 'RPC_ERROR',
          message: '⚠️ Validação indisponível (modo permissivo)'
        };
      }

      return data || { success: false, code: 'UNKNOWN', message: 'Erro desconhecido' };
    } catch (e) {
      console.error('[RATE_LIMIT] Exception:', e.message);
      // Fail-open
      return {
        success: true,
        code: 'EXCEPTION',
        message: '⚠️ Validação com erro (modo permissivo)'
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

      const { error } = await this.supabase.rpc(
        'increment_rate_limit',
        {
          p_user_id: userId,
          p_message_count: messageCount
        }
      );

      if (error) {
        console.warn('[RATE_LIMIT] Increment error:', error.message);
        return false;
      }

      return true;
    } catch (e) {
      console.warn('[RATE_LIMIT] Increment exception:', e.message);
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
        // Se não tiver userId, continua normalmente
        return next();
      }

      const validation = await this.validate(userId, messageCount);

      // Adiciona resultado da validação ao req para usar depois
      req.rateLimit = validation;

      // Se não passou na validação, bloqueia
      if (!validation.success) {
        const statusCode =
          validation.code === 'PENALIZED' ? 429 :
          validation.code === 'LIMIT_EXCEEDED' ? 429 :
          validation.code === 'WARNING' ? 200 :  // warning é sucesso mas com aviso
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
   * Uso:
   *   const result = await rateLimiter.validateAndSend(userId, 3, async () => {
   *     // seu código de envio aqui
   *     return { ok: true, sent: 3 };
   *   });
   */
  async validateAndSend(userId, messageCount, sendCallback) {
    // 1. Validar
    const validation = await this.validate(userId, messageCount);

    if (!validation.success) {
      return {
        ok: false,
        error: validation.code,
        message: validation.message,
        ...validation
      };
    }

    // 2. Executar callback (envio)
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

    // 3. Se enviou com sucesso, incrementa contador
    if (sendResult.ok && sendResult.sent > 0) {
      await this.increment(userId, sendResult.sent);
    }

    // 4. Retorna resultado do envio com info de rate limit
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
