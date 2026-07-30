import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHAT_SYSTEM_PROMPT = `Você é a MegaIA, copiloto de marketing de afiliados dentro da plataforma Mega Links BR (Brasil).
A plataforma ajuda afiliados a automatizar posts de ofertas em grupos/canais do WhatsApp e Telegram.
Responda sempre em português brasileiro, tom direto e informal, com emojis com moderação.
Formate a resposta em HTML simples (use <b>, <br>, listas com • quando fizer sentido) pois o texto é renderizado em um chat.
Seja específico e prático — o usuário é um afiliado querendo vender mais. Respostas curtas (até ~120 palavras), sem rodeios.
Se o pedido for para reescrever um post, gerar legenda, sugerir CTA ou horário de postagem, entregue o resultado pronto para copiar e colar.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json();
    const { nome, por, de, loja, link, acao } = body;

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    let systemPrompt = '';
    let userPrompt = '';
    let maxTokens = 400;

    if (acao === 'gerar_post') {
      systemPrompt = `Você é um especialista em marketing de afiliados brasileiro.
Seu trabalho é criar posts virais para WhatsApp e Telegram que convertem muito bem.
Regras:
- Use emojis estrategicamente (não exagere)
- Crie urgência e escassez
- Destaque o preço e a economia
- CTA forte no final
- Português brasileiro informal
- Máximo 200 palavras
- Retorne APENAS o texto do post, sem explicações`;

      const precoTexto = de
        ? `De R$ ${de} por apenas R$ ${por}`
        : `Por R$ ${por}`;

      userPrompt = `Crie um post de afiliado para o produto abaixo:

Produto: ${nome}
Preço: ${precoTexto}
Loja: ${loja || 'loja parceira'}

Crie um post irresistível para WhatsApp que gere cliques imediatos.`;
    } else if (acao === 'gerar_cta') {
      systemPrompt = `Você é especialista em copywriting de afiliados brasileiro.
Retorne APENAS um JSON com array "ctas" contendo 4 CTAs curtos e diferentes (máximo 60 chars cada).
Exemplo: {"ctas":["Corre que tá barato! 🔥","Oferta por tempo limitado! ⚡","Aproveita antes de acabar! 😱","Compra agora e economiza! 💸"]}`;

      userPrompt = `Gere 4 CTAs criativos para afiliado vendendo: ${nome} por R$ ${por} na ${loja || 'loja parceira'}`;
    } else if (acao === 'chat') {
      const { mensagem, contexto, historico } = body;
      if (!mensagem || typeof mensagem !== 'string') {
        return new Response(JSON.stringify({ error: 'mensagem obrigatória' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
      systemPrompt = CHAT_SYSTEM_PROMPT + (contexto ? `\nContexto atual do usuário na plataforma: ${contexto}.` : '');
      userPrompt = mensagem;
      maxTokens = 350;

      const messages = [{ role: 'system', content: systemPrompt }];
      if (Array.isArray(historico)) {
        for (const h of historico.slice(-6)) {
          if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') {
            messages.push({ role: h.role, content: h.content.slice(0, 1000) });
          }
        }
      }
      messages.push({ role: 'user', content: userPrompt });

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: maxTokens,
          temperature: 0.8,
          messages,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.error('OpenAI error:', err);
        return new Response(JSON.stringify({ error: 'Erro na OpenAI: ' + err }), {
          status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      return new Response(JSON.stringify({ success: true, texto: content }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'acao inválida' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('OpenAI error:', err);
      return new Response(JSON.stringify({ error: 'Erro na OpenAI: ' + err }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    if (acao === 'gerar_cta') {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify({ success: true, ctas: parsed.ctas }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ success: true, ctas: [content] }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, texto: content }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('mega-ia erro:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
