/**
 * Sincronização de Onboarding com Supabase
 * ========================================
 * Sincronize o estado de onboarding entre dispositivos
 *
 * Requer:
 * - Supabase configurado
 * - Tabela "onboarding_state" no banco de dados
 */

const OnboardingSupabaseSync = (() => {
  let enabled = false;
  let supabaseClient = null;
  let currentUserId = null;

  /**
   * Configurar sincronização
   */
  const init = async (supabase, userId) => {
    if (!supabase || !userId) {
      console.warn('⚠️ OnboardingSupabaseSync: Supabase ou userId não fornecido');
      return false;
    }

    supabaseClient = supabase;
    currentUserId = userId;
    enabled = true;

    // Carregar estado do banco
    await loadFromDatabase();

    console.log('✓ OnboardingSupabaseSync inicializado');
    return true;
  };

  /**
   * Carregar estado do banco de dados
   */
  const loadFromDatabase = async () => {
    if (!enabled || !supabaseClient || !currentUserId) return;

    try {
      const { data, error } = await supabaseClient
        .from('onboarding_state')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = não encontrado (esperado para novo usuário)
        console.error('❌ Erro ao carregar onboarding do BD:', error);
        return;
      }

      if (data?.state_json) {
        try {
          const state = JSON.parse(data.state_json);
          // Mesclar com estado local (local wins em caso de conflito)
          const merged = { ...state, ...OnboardingManager.getState() };
          localStorage.setItem('megalinks_onboarding', JSON.stringify(merged));
          console.log('✓ Estado de onboarding sincronizado do BD');
        } catch (e) {
          console.error('❌ Erro ao fazer parse do state:', e);
        }
      }
    } catch (e) {
      console.error('❌ Erro ao conectar ao BD:', e);
    }
  };

  /**
   * Salvar estado no banco de dados
   */
  const saveToDatabase = async () => {
    if (!enabled || !supabaseClient || !currentUserId) return;

    try {
      const state = OnboardingManager.getState();
      const timestamp = new Date().toISOString();

      const { error } = await supabaseClient
        .from('onboarding_state')
        .upsert({
          user_id: currentUserId,
          state_json: JSON.stringify(state),
          last_updated: timestamp
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Erro ao salvar no BD:', error);
      }
    } catch (e) {
      console.error('❌ Erro de sincronização:', e);
    }
  };

  /**
   * Interceptar dismiss para sincronizar
   */
  const setupAutoSync = () => {
    if (!enabled) return;

    // Sobrescrever dismiss original
    const originalDismiss = OnboardingManager.dismiss;
    OnboardingManager.dismiss = function(featureKey) {
      originalDismiss.call(this, featureKey);
      saveToDatabase();
    };

    // Sobrescrever reset original
    const originalReset = OnboardingManager.reset;
    OnboardingManager.reset = function(featureKey) {
      originalReset.call(this, featureKey);
      saveToDatabase();
    };

    console.log('✓ Auto-sync configurado');
  };

  /**
   * Forçar sincronização manual
   */
  const syncNow = async () => {
    await saveToDatabase();
  };

  return {
    init,
    loadFromDatabase,
    saveToDatabase,
    setupAutoSync,
    syncNow,
    isEnabled: () => enabled
  };
})();

/**
 * SCHEMA DO BANCO DE DADOS
 * =========================
 *
 * Execute no Supabase:
 *
 * CREATE TABLE onboarding_state (
 *   id BIGSERIAL PRIMARY KEY,
 *   user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 *   state_json JSONB NOT NULL DEFAULT '{}',
 *   last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 * );
 *
 * CREATE INDEX idx_onboarding_user_id ON onboarding_state(user_id);
 *
 * ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Users can view their own onboarding state"
 *   ON onboarding_state FOR SELECT
 *   USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can update their own onboarding state"
 *   ON onboarding_state FOR UPDATE
 *   USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can insert their own onboarding state"
 *   ON onboarding_state FOR INSERT
 *   WITH CHECK (auth.uid() = user_id);
 */

/**
 * COMO USAR
 * ==========
 *
 * // Após o usuário fazer login:
 * const { data: { user } } = await supabase.auth.getUser();
 *
 * await OnboardingSupabaseSync.init(supabase, user.id);
 * OnboardingSupabaseSync.setupAutoSync();
 *
 * // Agora o onboarding sincroniza automaticamente entre dispositivos
 *
 * // Sincronizar manualmente se necessário:
 * await OnboardingSupabaseSync.syncNow();
 */
