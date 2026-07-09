/**
 * Sistema de Onboarding com Tooltips Persistentes
 * ================================================
 * Gerencia tooltips para novos usuários com opção "Não mostrar novamente"
 *
 * Uso:
 *   OnboardingManager.init();
 *   OnboardingManager.show('feature-key');
 *   OnboardingManager.dismiss('feature-key');
 */

const OnboardingManager = (() => {
  const STORAGE_KEY = 'megalinks_onboarding';
  let state = {};
  let useLocalStorage = true;

  /**
   * Verifica se localStorage está disponível
   */
  const isLocalStorageAvailable = () => {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('⚠️ localStorage não disponível, usando memória temporária');
      return false;
    }
  };

  /**
   * Inicializa o sistema de onboarding
   * Carrega estado anterior do localStorage
   */
  const init = () => {
    useLocalStorage = isLocalStorageAvailable();

    try {
      const saved = useLocalStorage ? localStorage.getItem(STORAGE_KEY) : null;
      state = saved ? JSON.parse(saved) : {};
      console.log('🎯 Onboarding Manager initialized', state);
    } catch (e) {
      console.error('❌ Erro ao carregar onboarding state:', e);
      state = {};
    }
  };

  /**
   * Salva estado no localStorage (com fallback para memória)
   */
  const save = () => {
    try {
      if (useLocalStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (e) {
      console.warn('⚠️ Erro ao salvar estado:', e);
      // Estado continua em memória
    }
  };

  /**
   * Verifica se uma feature deve ser mostrada
   * Retorna false se usuário já marcou "não mostrar novamente"
   */
  const shouldShow = (featureKey) => {
    return !state[featureKey]?.dismissed;
  };

  /**
   * Marca feature como vista (sem descartar para sempre)
   */
  const markViewed = (featureKey) => {
    if (!state[featureKey]) state[featureKey] = {};
    state[featureKey].viewedAt = new Date().toISOString();
    save();
  };

  /**
   * Descarta feature permanentemente (usuário clicou "não mostrar novamente")
   */
  const dismiss = (featureKey) => {
    if (!state[featureKey]) state[featureKey] = {};
    state[featureKey].dismissed = true;
    state[featureKey].dismissedAt = new Date().toISOString();
    save();
    console.log(`✓ Feature "${featureKey}" descartada`);
  };

  /**
   * Reseta uma feature para mostrar novamente
   */
  const reset = (featureKey) => {
    if (state[featureKey]) {
      state[featureKey].dismissed = false;
      save();
    }
  };

  /**
   * Reseta TODAS as features
   */
  const resetAll = () => {
    state = {};
    localStorage.removeItem(STORAGE_KEY);
    console.log('🔄 Todos os onboardings foram resetados');
  };

  /**
   * Cria e mostra um tooltip
   */
  const show = (featureKey, options = {}) => {
    if (!shouldShow(featureKey)) return null;

    const {
      title = 'Dica',
      content = '',
      targetElement = null,
      position = 'bottom', // 'top', 'bottom', 'left', 'right'
      actions = {
        primary: { text: 'Entendi', fn: () => dismiss(featureKey) },
        secondary: { text: 'Não mostrar novamente', fn: () => dismiss(featureKey) }
      }
    } = options;

    // Remove tooltip anterior se existir
    const existing = document.querySelector(`[data-tooltip-id="${featureKey}"]`);
    if (existing) existing.remove();

    // Cria elemento do tooltip
    const tooltip = createTooltipElement(featureKey, title, content, actions);

    // Posiciona o tooltip
    if (targetElement) {
      positionTooltip(tooltip, targetElement, position);
      targetElement.parentElement.insertBefore(tooltip, targetElement.nextSibling);
    } else {
      document.body.appendChild(tooltip);
    }

    markViewed(featureKey);
    return tooltip;
  };

  /**
   * Cria elemento HTML do tooltip
   */
  const createTooltipElement = (featureKey, title, content, actions) => {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-onboarding';
    tooltip.setAttribute('data-tooltip-id', featureKey);
    tooltip.innerHTML = `
      <div class="tooltip-card">
        <div class="tooltip-header">
          <h3 class="tooltip-title">${title}</h3>
          <button class="tooltip-close" aria-label="Fechar">×</button>
        </div>
        <div class="tooltip-content">
          ${content}
        </div>
        <div class="tooltip-footer">
          <label class="tooltip-checkbox">
            <input type="checkbox" class="tooltip-checkbox-input">
            <span>Não mostrar novamente</span>
          </label>
          <div class="tooltip-actions">
            ${actions.primary ? `<button class="btn btn-volt btn-sm tooltip-btn-primary">${actions.primary.text}</button>` : ''}
            ${actions.secondary ? `<button class="btn btn-ghost btn-sm tooltip-btn-secondary">${actions.secondary.text}</button>` : ''}
          </div>
        </div>
      </div>
    `;

    // Event listeners
    const closeBtn = tooltip.querySelector('.tooltip-close');
    const checkboxInput = tooltip.querySelector('.tooltip-checkbox-input');
    const btnPrimary = tooltip.querySelector('.tooltip-btn-primary');
    const btnSecondary = tooltip.querySelector('.tooltip-btn-secondary');

    closeBtn?.addEventListener('click', () => {
      tooltip.remove();
      markViewed(featureKey);
    });

    checkboxInput?.addEventListener('change', (e) => {
      if (e.target.checked) {
        dismiss(featureKey);
        tooltip.remove();
      }
    });

    btnPrimary?.addEventListener('click', () => {
      actions.primary?.fn?.();
      tooltip.remove();
    });

    btnSecondary?.addEventListener('click', () => {
      if (checkboxInput?.checked) {
        dismiss(featureKey);
      } else {
        actions.secondary?.fn?.();
      }
      tooltip.remove();
    });

    return tooltip;
  };

  /**
   * Posiciona tooltip perto de um elemento
   */
  const positionTooltip = (tooltip, targetElement, position) => {
    const rect = targetElement.getBoundingClientRect();
    const gap = 16;

    switch (position) {
      case 'top':
        tooltip.style.position = 'absolute';
        tooltip.style.top = (rect.top - gap) + 'px';
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        tooltip.style.position = 'fixed';
        tooltip.style.top = (rect.bottom + gap) + 'px';
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.zIndex = '9999';
        break;
      case 'left':
        tooltip.style.position = 'absolute';
        tooltip.style.left = (rect.left - gap) + 'px';
        tooltip.style.top = (rect.top + rect.height / 2) + 'px';
        tooltip.style.transform = 'translateY(-50%)';
        break;
      case 'right':
        tooltip.style.position = 'absolute';
        tooltip.style.left = (rect.right + gap) + 'px';
        tooltip.style.top = (rect.top + rect.height / 2) + 'px';
        tooltip.style.transform = 'translateY(-50%)';
        break;
    }
  };

  /**
   * Guia passo-a-passo interativa
   */
  const showGuide = (guideKey, steps = []) => {
    if (!shouldShow(guideKey)) return null;

    let currentStep = 0;

    const guide = document.createElement('div');
    guide.className = 'onboarding-guide';
    guide.setAttribute('data-guide-id', guideKey);

    const updateGuide = () => {
      const step = steps[currentStep];
      guide.innerHTML = `
        <div class="guide-overlay"></div>
        <div class="guide-card">
          <div class="guide-header">
            <span class="guide-counter">${currentStep + 1} de ${steps.length}</span>
            <button class="guide-close">✕</button>
          </div>
          <h2 class="guide-title">${step.title}</h2>
          <p class="guide-content">${step.content}</p>
          <div class="guide-progress">
            <div class="guide-progress-bar" style="width: ${((currentStep + 1) / steps.length) * 100}%"></div>
          </div>
          <div class="guide-actions">
            ${currentStep > 0 ? '<button class="btn btn-ghost btn-sm guide-prev">← Anterior</button>' : ''}
            ${currentStep < steps.length - 1 ? '<button class="btn btn-volt btn-sm guide-next">Próximo →</button>' : '<button class="btn btn-volt btn-sm guide-done">Concluído!</button>'}
          </div>
        </div>
      `;

      // Scroll para elemento alvo se existir
      if (step.targetSelector) {
        const target = document.querySelector(step.targetSelector);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('guide-highlight');
        }
      }

      // Event listeners
      guide.querySelector('.guide-close')?.addEventListener('click', () => {
        guide.remove();
        markViewed(guideKey);
      });

      guide.querySelector('.guide-prev')?.addEventListener('click', () => {
        currentStep--;
        updateGui