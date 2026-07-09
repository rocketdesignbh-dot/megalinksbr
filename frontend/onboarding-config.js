/**
 * Configuração Central do Onboarding
 * ===================================
 * Personalize o comportamento do onboarding sem modificar os arquivos core
 */

const OnboardingConfig = {
  // ===== COMPORTAMENTO GERAL =====
  enabled: true,
  storageKey: 'megalinks_onboarding',
  debug: false, // true para logs detalhados

  // ===== TIMING =====
  delays: {
    firstTooltip: 500,      // ms antes de mostrar primeiro tooltip
    betweenTooltips: 800,   // ms entre tooltips
    guideDelay: 500,        // ms antes de mostrar guia
    autoHideTooltip: 0      // 0 = não fecha automaticamente
  },

  // ===== VISUAL =====
  theme: 'auto', // 'auto', 'light', 'dark'
  position: 'bottom', // posição padrão dos tooltips
  maxWidth: 320, // largura máxima em pixels
  animation: 'slideIn', // 'slideIn', 'popIn', 'fadeIn'

  // ===== COMPORTAMENTO DE NOVOS USUÁRIOS =====
  newUserDetection: {
    enabled: true,
    ageInDays: 7, // Considerar novo se criado há menos de X dias
    showFullGuide: true, // Mostrar guia completo para novos
    aggressiveTooltips: true // Mostrar mais tooltips para novos
  },

  // ===== NOTIFICAÇÕES =====
  notifications: {
    enabled: true,
    sound: false,
    position: 'top-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  },

  // ===== TRACKING / ANALYTICS =====
  tracking: {
    enabled: false, // true para enviar eventos
    provider: 'gtag', // 'gtag', 'mixpanel', 'custom'
    events: {
      onShow: 'onboarding_shown',
      onDismiss: 'onboarding_dismissed',
      onComplete: 'onboarding_completed',
      onClick: 'onboarding_clicked'
    }
  },

  // ===== FEATURES ESPECÍFICAS =====
  features: {
    postagens: {
      enabled: true,
      showGuide: true,
      tooltips: ['postar-agora-intro', 'grupos-selection-tip', 'radar-intro']
    },
    configuracao: {
      enabled: true,
      showGuide: true,
      checkMissingData: true,
      tooltips: ['meus-dados-hint', 'config-afiliado-intro', 'assinatura-plans']
    },
    dashboard: {
      enabled: true,
      showGuide: false,
      tooltips: ['dashboard-metrics-intro']
    }
  },

  // ===== CUSTOMIZAÇÃO POR IDIOMA =====
  i18n: {
    enabled: false,
    default: 'pt',
    supportedLanguages: ['pt', 'en', 'es']
  },

  // ===== CALLBACKS / HOOKS =====
  hooks: {
    onInit: null,
    onTooltipShow: null,
    onTooltipDismiss: null,
    onGuideStart: null,
    onGuideComplete: null,
    onAllComplete: null
  },

  // ===== MÉTODOS DE UTILIDADE =====

  /**
   * Obter configuração de uma feature
   */
  getFeatureConfig(featureName) {
    return this.features[featureName] || {};
  },

  /**
   * Verificar se uma feature está ativada
   */
  isFeatureEnabled(featureName) {
    return this.features[featureName]?.enabled !== false;
  },

  /**
   * Executar callback se existir
   */
  executeHook(hookName, ...args) {
    if (typeof this.hooks[hookName] === 'function') {
      this.hooks[hookName](...args);
    }
  },

  /**
   * Log apenas se debug está ativado
   */
  log(...args) {
    if (this.debug) {
      console.log('[OnboardingConfig]', ...args);
    }
  },

  /**
   * Resetar configuração para padrão
   */
  reset() {
    // Não mexer nas funções
    const backup = { ...this };
    Object.keys(this).forEach(key => {
      if (typeof backup[key] !== 'function') {
        delete this[key];
      }
    });
    location.reload();
  }
};

/**
 * EXEMPLOS DE CUSTOMIZAÇÃO
 * ========================
 *
 * // Mudar tema globalmente
 * OnboardingConfig.theme = 'dark';
 *
 * // Desabilitar onboarding em produção
 * if (window.location.hostname === 'production.com') {
 *   OnboardingConfig.enabled = false;
 * }
 *
 * // Rastrear eventos com Google Analytics
 * OnboardingConfig.tracking.enabled = true;
 * OnboardingConfig.hooks.onTooltipShow = (featureKey) => {
 *   gtag('event', 'onboarding_tooltip', { feature: featureKey });
 * };
 *
 * // Customizar delays para mobile
 * if (window.innerWidth < 768) {
 *   OnboardingConfig.delays.firstTooltip = 1000;
 *   OnboardingConfig.maxWidth = 280;
 * }
 *
 * // Desabilitar feature específica
 * OnboardingConfig.features.dashboard.enabled = false;
 */

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OnboardingConfig;
}
