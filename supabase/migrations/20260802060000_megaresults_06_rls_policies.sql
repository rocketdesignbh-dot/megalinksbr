-- Habilita RLS e cria a policy padrao (dono le e escreve o proprio dado)
-- em todas as tabelas do schema que possuem owner_id.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'megaresults'
      AND c.relkind IN ('r','p')                       -- tabelas e particionadas
      AND c.relispartition = false                     -- particoes herdam do pai
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attname = 'owner_id' AND a.attnum > 0
      )
  LOOP
    EXECUTE format('ALTER TABLE megaresults.%I ENABLE ROW LEVEL SECURITY', t.relname);
    EXECUTE format('ALTER TABLE megaresults.%I FORCE ROW LEVEL SECURITY', t.relname);
    EXECUTE format($p$
      CREATE POLICY owner_all ON megaresults.%I
        FOR ALL TO authenticated
        USING (owner_id = auth.uid())
        WITH CHECK (owner_id = auth.uid())
    $p$, t.relname);
  END LOOP;
END $$;

-- field_mapping: owner_id e NULL nos mapeamentos globais (por marketplace).
-- Leitura liberada para todos; escrita apenas do proprio mapeamento.
DROP POLICY IF EXISTS owner_all ON megaresults.field_mapping;
ALTER TABLE megaresults.field_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE megaresults.field_mapping FORCE ROW LEVEL SECURITY;

CREATE POLICY mapping_read ON megaresults.field_mapping
  FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());

CREATE POLICY mapping_write ON megaresults.field_mapping
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY mapping_update ON megaresults.field_mapping
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY mapping_delete ON megaresults.field_mapping
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- rollup_dirty nao tem FK para auth.users mas tem owner_id: ja coberto pelo laco acima.

-- Tabelas sem owner_id que precisam de bloqueio explicito:
-- (nenhuma no momento; share_link publico e lido pela service_role na edge function)
