// Mega Links BR · Edge Function "check-group-stock" v3
// v3: modo de teste seguro. Ate a v2, invocar esta funcao manualmente mandava
//     e-mail para os DONOS REAIS dos grupos -- foi assim que uma cliente recebeu
//     um alerta que era so um teste nosso. Agora existe overrideTo: redireciona
//     todos os avisos para um endereco de teste, ignora a carencia e nao grava
//     low_stock_notified_at (nao "queima" o aviso real do cliente).
// v2: profiles.name nao existe -- a coluna e full_name.
//
// Avisa o dono quando um Grupo de Oferta esta prestes a ficar sem oferta ativa.
//
// Por que isso existe: a partir do send-post v15 os produtos saem do rodizio
// sozinhos -- validade vencida, fora do ar no marketplace, ou ainda aguardando
// a data de agendamento. Nenhum desses casos gera erro. O grupo simplesmente
// fica mais quieto, e o afiliado so descobre quando estranha a queda de comissao.
// Este alerta e o contrapeso da automacao que criamos.
//
// Regras deliberadas:
//   - Um e-mail por GRUPO, nunca por produto. Quem tem 20 produtos nao aguenta
//     20 avisos: viraria ruido e a pessoa desligaria tudo.
//   - So grupos com post_auto_enabled. Grupo pausado nao esta perdendo nada.
//   - Reenvio so depois de RECARENCIA_H. Sem isso, um grupo vazio geraria
//     e-mail todo santo dia ate o fim dos tempos.
//
// Parametros aceitos no corpo (todos opcionais):
//   dryRun: true       -> calcula e devolve quem receberia, sem enviar nada
//   overrideTo: "a@b"  -> envia de verdade, mas tudo para esse endereco
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPA_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPA_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

const LIMIAR = 2;        // avisa quando restam ATE este tanto de ofertas ativas
const RECARENCIA_H = 72; // nao repete o aviso antes disso

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret',
};

function json(b: unknown, s = 200): Response {
  return new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const secret = req.headers.get('x-cron-secret') ?? '';
  const auth = req.headers.get('authorization') ?? '';
  if (!((CRON_SECRET && secret === CRON_SECRET) || (SUPA_KEY && auth === `Bearer ${SUPA_KEY}`))) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* sem corpo */ }
  const url = new URL(req.url);
  const dryRun = body.dryRun === true || url.searchParams.get('dryRun') === '1';

  const overrideRaw = typeof body.overrideTo === 'string' ? body.overrideTo : (url.searchParams.get('overrideTo') ?? '');
  const overrideTo = overrideRaw.trim();
  if (overrideTo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(overrideTo)) {
    return json({ ok: false, error: `overrideTo invalido: '${overrideTo}'` }, 400);
  }
  const modoTeste = overrideTo.length > 0;

  const SB = createClient(SUPA_URL, SUPA_KEY);
  const agora = new Date();
  const agoraMs = agora.getTime();

  const { data: grupos, error } = await SB.from('niche_groups')
    .select('id, name, user_id, low_stock_notified_at')
    .eq('post_auto_enabled', true);
  if (error) return json({ ok: false, error: error.message }, 500);
  if (!grupos?.length) return json({ ok: true, grupos: 0, msg: 'nenhum grupo com post automatico ativo' });

  const ids = grupos.map((g) => g.id);
  const { data: produtos } = await SB.from('products')
    .select('niche_group_id, expired, valid_until, never_expires, scheduled_at')
    .in('niche_group_id', ids);

  // Mesma precedencia do send-post v15. Se divergir daqui, o alerta mente.
  const ativos: Record<string, number> = {};
  const motivos: Record<string, { vencidos: number; foraAr: number; agendados: number }> = {};
  for (const id of ids) { ativos[id] = 0; motivos[id] = { vencidos: 0, foraAr: 0, agendados: 0 }; }

  for (const p of produtos ?? []) {
    const k = p.niche_group_id as string;
    if (!(k in ativos)) continue;
    if (p.expired === true) { motivos[k].foraAr++; continue; }
    if (p.never_expires !== true && p.valid_until) {
      const t = new Date(p.valid_until).getTime();
      if (Number.isFinite(t) && t < agoraMs) { motivos[k].vencidos++; continue; }
    }
    if (p.scheduled_at) {
      const t = new Date(p.scheduled_at).getTime();
      if (Number.isFinite(t) && t > agoraMs) { motivos[k].agendados++; continue; }
    }
    ativos[k]++;
  }

  const donos = [...new Set(grupos.map((g) => g.user_id).filter(Boolean))];
  const perfil: Record<string, { email: string; nome: string }> = {};
  if (donos.length) {
    const { data: perfis } = await SB.from('profiles').select('id, email, full_name').in('id', donos);
    for (const pf of perfis ?? []) {
      perfil[pf.id] = { email: String(pf.email ?? ''), nome: String(pf.full_name ?? '') };
    }
  }

  const enviados: string[] = [];
  const ignorados: string[] = [];

  for (const g of grupos) {
    const n = ativos[g.id] ?? 0;
    if (n > LIMIAR) { ignorados.push(`${g.name}: ${n} ativas`); continue; }

    // Nao avisa grupo que nunca teve produto: nao e "acabando", e "nunca comecou".
    // Esse caso ja aparece como "Faltando: produtos" no card do grupo.
    const m = motivos[g.id];
    const totalNoGrupo = n + m.vencidos + m.foraAr + m.agendados;
    if (totalNoGrupo === 0) { ignorados.push(`${g.name}: grupo sem nenhum produto cadastrado`); continue; }

    // Em modo de teste a carencia e ignorada de proposito: senao um grupo
    // avisado ontem nunca apareceria no teste de hoje.
    if (!modoTeste && g.low_stock_notified_at) {
      const h = (agoraMs - new Date(g.low_stock_notified_at).getTime()) / 3600000;
      if (h < RECARENCIA_H) { ignorados.push(`${g.name}: avisado ha ${Math.round(h)}h`); continue; }
    }

    const dono = perfil[g.user_id];
    if (!dono?.email) { ignorados.push(`${g.name}: dono sem e-mail`); continue; }

    const destino = modoTeste ? overrideTo : dono.email;

    const detalhe = [
      m.vencidos ? `${m.vencidos} com validade vencida` : '',
      m.foraAr ? `${m.foraAr} fora do ar na loja` : '',
      m.agendados ? `${m.agendados} aguardando a data de agendamento` : '',
    ].filter(Boolean).join(', ');

    if (!dryRun) {
      const r = await fetch(`${SUPA_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
        body: JSON.stringify({
          type: 'grupo_sem_oferta',
          to: destino,
          nome: dono.nome,
          grupo: g.name,
          ativas: n,
          detalhe,
        }),
      });
      if (!r.ok) {
        // A send-email v9 devolve 502 com o motivo real quando o Resend recusa.
        let motivo = `HTTP ${r.status}`;
        try { const j = await r.json(); if (j?.error) motivo = String(j.error); } catch { /* corpo nao-json */ }
        ignorados.push(`${g.name}: falha no envio (${motivo})`);
        continue;
      }
      // Em teste nao gravamos a carencia: o cliente continua com direito ao
      // aviso real dele no horario normal.
      if (!modoTeste) {
        await SB.from('niche_groups').update({ low_stock_notified_at: agora.toISOString() }).eq('id', g.id);
      }
    }
    const paraQuem = modoTeste ? ` -> ${destino} (teste, dono real: ${dono.email})` : ` -> ${dono.email}`;
    enviados.push(`${g.name}: ${n} ativas${detalhe ? ' (' + detalhe + ')' : ''}${paraQuem}`);
  }

  return json({
    ok: true,
    dry_run: dryRun,
    modo_teste: modoTeste,
    override_to: modoTeste ? overrideTo : null,
    grupos_avaliados: grupos.length,
    limiar: LIMIAR,
    enviados,
    ignorados,
  });
});
