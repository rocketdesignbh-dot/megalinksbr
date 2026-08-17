// Mega Links BR · Edge Function "redirect" v16
// v16 (16/08, P60): A PREVIA DO LINK PASSA A SER NOSSA, e robo de previa deixa
//      de ser contado como clique.
//
//      MEDIDO em 16/08 no `link_clicks` do codigo `s2310c5`: o robo do WhatsApp
//      (`WhatsApp/2.2631.102 W`) BATEU no nosso link cinco vezes, 11:59:27 a
//      12:00:38. O link nunca foi o problema. Ate a v15 esta funcao devolvia um
//      302 pelado, SEM UMA UNICA TAG OG PROPRIA -- entao a previa que o WhatsApp
//      mostrava nunca foi nossa: era a da Amazon, colhida depois do redirect.
//
//      E a Amazon e exatamente a loja que este projeto ja mediu bloqueando
//      cliente que nao e navegador: ver o cabecalho da v14/v15 do
//      `product-refresh` -- captcha volta com status 200. Quando ela deixa o
//      robo passar, a previa aparece; quando nao deixa, sai um cartao so com o
//      dominio. Cara ou coroa, e a moeda nao e nossa.
//
//      O caso do "link colado duas vezes" que fez a previa aparecer NAO foi a
//      duplicacao: do nosso lado os dois sao o MESMO link -- o nginx faz
//      `rewrite ^/r/(.*)$` e esta funcao pega o ULTIMO pedaco do caminho, o que
//      da `s2310c5` nos dois casos (por isso todos os cliques cairam no mesmo
//      codigo). O que mudou foi o cache do WhatsApp: string diferente, chave
//      diferente, busca limpa em vez da previa vazia ja guardada.
//      ATENCAO ao registro honesto: NAO foi separado, tentativa a tentativa,
//      quanto e bloqueio da Amazon e quanto e cache do WhatsApp. As duas
//      explicam o observado.
//
//      (a) PREVIA PROPRIA. Robo recebe HTML com as nossas tags OG, vindas de
//          `short_links.og_title/og_description/og_image`, gravadas na criacao
//          do link. Gente continua recebendo o 302.
//          FALLBACK DELIBERADO: link sem `og_title` (todos os antigos) mantem o
//          302 exatamente como na v15. Nada regride por falta de dado.
//
//      (b) ROBO NAO E CLIQUE. Medido na base inteira em 16/08: 140 cliques
//          registrados, 36 de robo de previa -- 25,7% de inflacao. No `s2310c5`
//          eram 6 cliques, 5 deles robo. O `link_clicks` e o `increment_clicks`
//          passam a rodar so para gente.
//          Historico NAO foi mexido: limpar o passado e outra decisao.
//
//      Efeito conferivel: mandar um link NOVO do Link Rapido no WhatsApp e ver
//      o cartao com nome e foto do produto; e `clicks` parar de subir sozinho
//      quando ninguem clicou.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Robos de previa de link. Lista por user-agent porque e o unico sinal que
// temos aqui -- e ela erra para o lado SEGURO nos dois sentidos: robo nao
// reconhecido apenas volta a se comportar como na v15 (302, e conta clique),
// e gente nunca e classificada como robo por engano com estes termos.
const ROBO_DE_PREVIA = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|slackbot|discordbot|linkedinbot|embedly|quora link preview|skypeuripreview|vkshare|redditbot|applebot|pinterest|bingpreview/i;

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// A pagina servida ao robo. Ela tambem redireciona de verdade, por dois
// caminhos, porque robo nao e a unica coisa que pode cair aqui com esse
// user-agent: `http-equiv=refresh` cobre quem renderiza HTML sem JS, e o
// `location.replace` cobre o resto. Quem so le as tags (o caso normal) nunca
// executa nenhum dos dois.
function paginaDePrevia(destino: string, og: { title: string; description: string; image: string }): string {
  const d = esc(destino);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(og.title)}</title>
<meta property="og:type" content="product">
<meta property="og:site_name" content="Mega Links BR">
<meta property="og:title" content="${esc(og.title)}">
<meta property="og:description" content="${esc(og.description)}">
${og.image ? `<meta property="og:image" content="${esc(og.image)}">
<meta property="og:image:alt" content="${esc(og.title)}">` : ''}
<meta name="twitter:card" content="${og.image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(og.title)}">
<meta name="twitter:description" content="${esc(og.description)}">
${og.image ? `<meta name="twitter:image" content="${esc(og.image)}">` : ''}
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="refresh" content="0;url=${d}">
<link rel="canonical" href="${d}">
</head>
<body>
<p>Redirecionando para a oferta… <a href="${d}">Clique aqui se nada acontecer.</a></p>
<script>location.replace(${JSON.stringify(destino)});</script>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const code = parts[parts.length - 1] || url.searchParams.get('code') || '';

  if (!code) return new Response('Not found', { status: 404 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: link } = await sb
    .from('short_links')
    .select('code, long_url, destination, user_id, og_title, og_description, og_image')
    .eq('code', code)
    .maybeSingle();

  if (!link) return new Response('Link não encontrado', { status: 404 });

  const destination = link.destination || link.long_url;
  if (!destination) return new Response('Destino inválido', { status: 404 });

  const ua  = (req.headers.get('user-agent')  || '').slice(0, 500);
  const ref = (req.headers.get('referer')     || '').slice(0, 500);
  const ehRobo = ROBO_DE_PREVIA.test(ua);

  // (b) Robo nao e clique. A gravacao continua fire-and-forget pelo mesmo motivo
  // de sempre: registrar o clique nunca pode atrasar nem derrubar o redirect.
  if (!ehRobo) {
    Promise.all([
      sb.from('link_clicks').insert({ code, user_id: link.user_id, user_agent: ua, referer: ref }),
      sb.rpc('increment_clicks', { p_code: code }),
    ]).catch(() => {});
  }

  // (a) Previa propria, e SO quando ha titulo gravado. Sem titulo nao ha previa
  // a afirmar, e servir um cartao vazio seria pior do que deixar a loja tentar:
  // cai no 302 da v15.
  if (ehRobo && String(link.og_title ?? '').trim()) {
    const html = paginaDePrevia(destination, {
      title: String(link.og_title ?? '').trim(),
      description: String(link.og_description ?? '').trim(),
      image: String(link.og_image ?? '').trim(),
    });
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Previa pode mudar (preco novo regravado no link): 10 min e curto o
        // bastante para nao congelar preco velho no cartao e longo o bastante
        // para nao pagar uma leitura por robo.
        'Cache-Control': 'public, max-age=600',
      },
    });
  }

  return new Response(null, {
    status: 302,
    headers: { 'Location': destination },
  });
});
