'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nxlfezpagporealqqbfj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client = null;

/**
 * Cliente com a service role. Criado sob demanda para que o dry-run offline
 * (test/dry-run.js) rode sem nenhuma credencial configurada.
 */
function db() {
  if (!SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY nao configurada. Sem ela o mr-ingest nao grava nada.');
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'megaresults' },
    });
  }
  return client;
}

/**
 * Carrega o mapeamento aplicavel: o do proprio usuario tem precedencia sobre o
 * global do sistema, coluna a coluna. E assim que um usuario corrige uma coluna
 * sem perder as outras 46.
 */
async function loadFieldMapping({ store, dataset, ownerId, version = 1 }) {
  const { data, error } = await db()
    .from('field_mapping')
    .select('source_header, canonical_field, transform, is_required, owner_id')
    .eq('dataset', dataset)
    .eq('version', version)
    .or(`owner_id.is.null,owner_id.eq.${ownerId}`)
    .eq('store', store);
  if (error) throw new Error(`Falha ao carregar field_mapping: ${error.message}`);

  const byHeader = new Map();
  for (const row of data || []) {
    const key = row.source_header;
    const cur = byHeader.get(key);
    if (!cur || (cur.owner_id === null && row.owner_id !== null)) byHeader.set(key, row);
  }
  return [...byHeader.values()];
}

module.exports = { db, loadFieldMapping, SUPABASE_URL };
