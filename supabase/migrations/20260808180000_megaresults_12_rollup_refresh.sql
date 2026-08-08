-- Agregacao diaria: drena megaresults.rollup_dirty e recalcula rollup_daily.
--
-- A ingestao ja enfileirava os dias sujos desde a migration 09, mas nada os
-- consumia — rollup_daily ficava vazia e o dashboard (doc 07) nao tinha de onde
-- ler. Esta migration fecha o ciclo.
--
-- As definicoes de cada metrica sao as do doc 10 secao 3, ao pe da letra:
--   pedidos           = |{external_order_id}| com status in (approved, pending)
--   pedidosCancelados = |{external_order_id}| com status in (cancelled, refunded, rejected)
--   itens             = SUM(quantity) com status in (approved, pending)
--   receitaBruta      = SUM(gross_revenue) com status in (approved, pending)
--   reembolsos        = SUM(refund_amount) com status = refunded
--   comissaoPerdida   = SUM(commission_net) com status in (cancelled, refunded, rejected)
--   cliques           = |{c}| com is_bot = false
-- `unpaid` fica de fora de pedidos e receita porque e oportunidade, nao venda.


-- Recalculo idempotente por (owner_id, day): apaga o dia inteiro e reescreve a
-- partir dos fatos. E a unica forma de o rollup ficar certo depois de um
-- cancelamento ou de um rollback de lote, em que a linha do fato DIMINUI o
-- total — soma incremental nunca teria como descobrir isso sozinha.
CREATE OR REPLACE FUNCTION megaresults.refresh_rollups(p_limit int DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
-- SECURITY INVOKER de proposito, como as funcoes de ingestao: quem chama e o
-- pg_cron (postgres) ou a service_role, e os dois tem rolbypassrls. Nao ha
-- caminho de usuario final ate aqui, entao DEFINER so ampliaria a superficie.
SET search_path = megaresults, public, pg_temp
AS $fn$
DECLARE
  v_dias  int := 0;
  v_linhas bigint := 0;
  v_zero  constant uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- DELETE ... RETURNING e o claim: a funcao roda em uma transacao, entao um
  -- erro no recalculo desfaz tambem a remocao da fila. SKIP LOCKED deixa duas
  -- execucoes simultaneas dividirem o trabalho em vez de uma esperar a outra.
  CREATE TEMP TABLE _claim ON COMMIT DROP AS
  WITH alvo AS (
    SELECT owner_id, day
      FROM megaresults.rollup_dirty
     ORDER BY queued_at
     LIMIT p_limit
       FOR UPDATE SKIP LOCKED
  ), removidos AS (
    DELETE FROM megaresults.rollup_dirty d
     USING alvo a
     WHERE d.owner_id = a.owner_id AND d.day = a.day
    RETURNING d.owner_id, d.day
  )
  SELECT owner_id, day FROM removidos;

  SELECT count(*) INTO v_dias FROM _claim;
  IF v_dias = 0 THEN
    RETURN jsonb_build_object('days', 0, 'rows', 0, 'remaining',
                              (SELECT count(*) FROM megaresults.rollup_dirty));
  END IF;

  -- Janela em timestamptz, e nao `(occurred_at AT TIME ZONE ...)::date = day`:
  -- a comparacao por expressao esconde a coluna de particionamento do planner e
  -- forcaria varredura das 25 particoes a cada dia sujo.
  CREATE TEMP TABLE _janela ON COMMIT DROP AS
  SELECT c.owner_id,
         c.day,
         (c.day::timestamp       AT TIME ZONE 'America/Sao_Paulo') AS inicio,
         ((c.day + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo') AS fim
    FROM _claim c;

  DELETE FROM megaresults.rollup_daily r
   USING _claim c
   WHERE r.owner_id = c.owner_id AND r.day = c.day;

  WITH transacoes AS (
    SELECT j.owner_id, j.day, f.store,
           COALESCE(f.campaign_id, v_zero) AS campaign_id,
           COALESCE(f.category_id, v_zero) AS category_id,
           COALESCE(f.product_id,  v_zero) AS product_id,
           0::bigint AS clicks,
           count(DISTINCT f.external_order_id)
             FILTER (WHERE f.status IN ('approved','pending'))                    AS orders,
           COALESCE(SUM(f.quantity)
             FILTER (WHERE f.status IN ('approved','pending')), 0)                AS items,
           count(DISTINCT f.external_order_id) FILTER (WHERE f.status = 'approved') AS orders_approved,
           count(DISTINCT f.external_order_id) FILTER (WHERE f.status = 'pending')  AS orders_pending,
           count(DISTINCT f.external_order_id)
             FILTER (WHERE f.status IN ('cancelled','refunded','rejected'))       AS orders_cancelled,
           count(DISTINCT f.external_order_id) FILTER (WHERE f.status = 'unpaid')  AS orders_unpaid,
           COALESCE(SUM(f.gross_revenue)
             FILTER (WHERE f.status IN ('approved','pending')), 0)                AS gross_revenue,
           COALESCE(SUM(f.refund_amount) FILTER (WHERE f.status = 'refunded'), 0) AS refund_amount,
           COALESCE(SUM(f.commission_net) FILTER (WHERE f.status = 'approved'), 0) AS commission_approved,
           COALESCE(SUM(f.commission_net) FILTER (WHERE f.status = 'pending'), 0)  AS commission_pending,
           COALESCE(SUM(f.commission_net)
             FILTER (WHERE f.status IN ('cancelled','refunded','rejected')), 0)   AS commission_rejected
      FROM _janela j
      JOIN megaresults.fact_transaction f
        ON f.owner_id = j.owner_id
       AND f.occurred_at >= j.inicio
       AND f.occurred_at <  j.fim
     GROUP BY 1, 2, 3, 4, 5, 6
  ),
  -- Clique nao tem categoria nem produto: entra no grao (loja, campanha) com
  -- sentinela nos outros dois. Por isso a linha de cliques e a de pedidos nao
  -- se fundem — quem le soma as duas, que e o comportamento correto da tabela.
  cliques AS (
    SELECT j.owner_id, j.day, k.store,
           COALESCE(k.campaign_id, v_zero) AS campaign_id,
           v_zero AS category_id,
           v_zero AS product_id,
           count(*) FILTER (WHERE NOT k.is_bot) AS clicks,
           0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
           0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric
      FROM _janela j
      JOIN megaresults.fact_click k
        ON k.owner_id = j.owner_id
       AND k.occurred_at >= j.inicio
       AND k.occurred_at <  j.fim
     GROUP BY 1, 2, 3, 4
  ),
  consolidado AS (
    SELECT * FROM transacoes
    UNION ALL
    SELECT * FROM cliques
  ),
  gravado AS (
    INSERT INTO megaresults.rollup_daily (
      owner_id, day, store, campaign_id, category_id, product_id,
      clicks, orders, items, orders_approved, orders_pending, orders_cancelled,
      orders_unpaid, gross_revenue, refund_amount,
      commission_approved, commission_pending, commission_rejected, updated_at
    )
    SELECT owner_id, day, store, campaign_id, category_id, product_id,
           SUM(clicks), SUM(orders), SUM(items), SUM(orders_approved),
           SUM(orders_pending), SUM(orders_cancelled), SUM(orders_unpaid),
           SUM(gross_revenue), SUM(refund_amount),
           SUM(commission_approved), SUM(commission_pending), SUM(commission_rejected),
           now()
      FROM consolidado
     GROUP BY 1, 2, 3, 4, 5, 6
    RETURNING 1
  )
  SELECT count(*) INTO v_linhas FROM gravado;

  RETURN jsonb_build_object(
    'days', v_dias,
    'rows', v_linhas,
    'remaining', (SELECT count(*) FROM megaresults.rollup_dirty)
  );
END;
$fn$;

COMMENT ON FUNCTION megaresults.refresh_rollups(int) IS
  'Drena rollup_dirty e recalcula rollup_daily por (owner_id, dia civil de Sao Paulo). Metricas conforme doc 10 secao 3.';

REVOKE ALL ON FUNCTION megaresults.refresh_rollups(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION megaresults.refresh_rollups(int) TO service_role;

-- A cada 5 minutos. O dashboard aceita esse atraso; importacao grande enfileira
-- poucos dias distintos, entao a fila drena em uma ou duas passadas.
SELECT cron.unschedule('megaresults-refresh-rollups')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'megaresults-refresh-rollups');

SELECT cron.schedule(
  'megaresults-refresh-rollups',
  '*/5 * * * *',
  $$ SELECT megaresults.refresh_rollups(500); $$
);
