/**
 * Testes Básicos para Sistema de Onboarding
 * ==========================================
 * Execute: OnboardingTest.runAll()
 */

const OnboardingTest = (() => {
  let passed = 0;
  let failed = 0;
  const results = [];

  /**
   * Assert helper
   */
  const assert = (condition, message) => {
    if (condition) {
      passed++;
      results.push(`✓ ${message}`);
      console.log(`✓ ${message}`);
    } else {
      failed++;
      results.push(`✗ ${message}`);
      console.error(`✗ ${message}`);
    }
  };

  /**
   * Teste 1: Inicialização
   */
  const testInit = () => {
    console.log('\n📋 Teste 1: Inicialização');

    assert(
      typeof OnboardingManager !== 'undefined',
      'OnboardingManager existe'
    );

    assert(
      typeof OnboardingManager.init === 'function',
      'OnboardingManager.init é uma função'
    );

    assert(
      typeof OnboardingManager.show === 'function',
      'OnboardingManager.show é uma função'
    );
  };

  /**
   * Teste 2: localStorage
   */
  const testStorage = () => {
    console.log('\n💾 Teste 2: Storage');

    // Reset
    OnboardingManager.resetAll();

    const state1 = OnboardingManager.getState();
    assert(
      Object.keys(state1).length === 0,
      'Storage está vazio após reset'
    );

    // Mark viewed
    OnboardingManager.markViewed('test-feature');
    const state2 = OnboardingManager.getState();
    assert(
      state2['test-feature']?.viewedAt !== undefined,
      'markViewed salva timestamp'
    );

    // Dismiss
    OnboardingManager.dismiss('test-feature');
    const state3 = OnboardingManager.getState();
    assert(
      state3['test-feature']?.dismissed === true,
      'dismiss marca feature como dismissed'
    );

    // Reset feature
    OnboardingManager.reset('test-feature');
    const state4 = OnboardingManager.getState();
    assert(
      state4['test-feature']?.dismissed === false,
      'reset remove flag dismissed'
    );
  };

  /**
   * Teste 3: shouldShow
   */
  const testShouldShow = () => {
    console.log('\n👁️ Teste 3: Visibilidade');

    OnboardingManager.resetAll();

    // Novo item deve aparecer
    assert(
      OnboardingManager.shouldShow('new-feature') === true,
      'Novo item retorna shouldShow true'
    );

    // Após dismiss, não deve aparecer
    OnboardingManager.dismiss('new-feature');
    assert(
      OnboardingManager.shouldShow('new-feature') === false,
      'Item dismissed retorna shouldShow false'
    );
  };

  /**
   * Teste 4: Tooltip rendering
   */
  const testTooltipRender = () => {
    console.log('\n🎨 Teste 4: Renderização');

    OnboardingManager.resetAll();

    const tooltip = OnboardingManager.show('render-test', {
      title: 'Teste',
      content: 'Conteúdo de teste'
    });

    assert(
      tooltip !== null,
      'show() retorna um elemento'
    );

    assert(
      tooltip.classList.contains('tooltip-onboarding'),
      'Elemento tem classe tooltip-onboarding'
    );

    assert(
      tooltip.querySelector('.tooltip-title')?.textContent === 'Teste',
      'Título renderizado corretamente'
    );

    assert(
      tooltip.querySelector('.tooltip-content')?.textContent.includes('Conteúdo'),
      'Conteúdo renderizado corretamente'
    );

    // Limpar
    tooltip.remove();
  };

  /**
   * Teste 5: Guide rendering
   */
  const testGuideRender = () => {
    console.log('\n📚 Teste 5: Guia');

    OnboardingManager.resetAll();

    const steps = [
      { title: 'Passo 1', content: 'Primeiro' },
      { title: 'Passo 2', content: 'Segundo' }
    ];

    const guide = OnboardingManager.showGuide('guide-test', steps);

    assert(
      guide !== null,
      'showGuide() retorna um elemento'
    );

    assert(
      guide.classList.contains('onboarding-guide'),
      'Elemento tem classe onboarding-guide'
    );

    assert(
      guide.querySelector('.guide-title')?.textContent === 'Passo 1',
      'Primeiro passo renderizado'
    );

    // Limpar
    guide.remove();
  };

  /**
   * Teste 6: Config
   */
  const testConfig = () => {
    console.log('\n⚙️ Teste 6: Configuração');

    assert(
      typeof OnboardingConfig !== 'undefined',
      'OnboardingConfig existe'
    );

    assert(
      OnboardingConfig.enabled === true,
      'Onboarding está habilitado por padrão'
    );

    assert(
      typeof OnboardingConfig.getFeatureConfig === 'function',
      'getFeatureConfig é uma função'
    );

    assert(
      OnboardingConfig.isFeatureEnabled('postagens') === true,
      'Feature postagens está habilitada'
    );
  };

  /**
   * Teste 7: Mobile responsiveness
   */
  const testMobile = () => {
    console.log('\n📱 Teste 7: Mobile');

    const isMobile = window.innerWidth < 768;

    assert(
      document.body.style.padding !== undefined,
      'DOM está acessível'
    );

    if (isMobile) {
      console.log('  ℹ️ Executando em modo mobile');
    } else {
      console.log('  ℹ️ Executando em modo desktop');
    }
  };

  /**
   * Teste 8: Performance
   */
  const testPerformance = () => {
    console.log('\n⚡ Teste 8: Performance');

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      OnboardingManager.markViewed(`perf-test-${i}`);
    }

    const duration = performance.now() - start;

    assert(
      duration < 1000,
      `100 operações em ${duration.toFixed(2)}ms (< 1s)`
    );
  };

  /**
   * Executar todos os testes
   */
  const runAll = () => {
    console.clear();
    console.log('🧪 INICIANDO TESTES DO ONBOARDING\n');
    console.log('═'.repeat(50));

    testInit();
    testStorage();
    testShouldShow();
    testTooltipRender();
    testGuideRender();
    testConfig();
    testMobile();
    testPerformance();

    // Resumo
    console.log('\n' + '═'.repeat(50));
    console.log('\n📊 RESUMO DOS TESTES');
    console.log(`✓ Passou: ${passed}`);
    console.log(`✗ Falhou: ${failed}`);
    console.log(`Total: ${passed + failed}`);

    const percentage = Math.round((passed / (passed + failed)) * 100);
    console.log(`Taxa de sucesso: ${percentage}%`);

    if (failed === 0) {
      console.log('\n🎉 Todos os testes passaram!');
    } else {
      console.log(`\n⚠️ ${failed} teste(s) falharam`);
    }

    return {
      passed,
      failed,
      total: passed + failed,
      percentage,
      results
    };
  };

  /**
   * Limpar entre testes
   */
  const cleanup = () => {
    OnboardingManager.resetAll();
    document.querySelectorAll('[data-tooltip-id], [data-guide-id]').forEach(el => el.remove());
  };

  return {
    runAll,
    cleanup,
    results: () => results
  };
})();

/**
 * COMO USAR
 * ==========
 *
 * // No console do navegador:
 * OnboardingTest.runAll()
 *
 * // Ver resultados
 * console.table(OnboardingTest.results())
 *
 * // Limpar entre execuções
 * OnboardingTest.cleanup()
 */

console.log('✓ OnboardingTest carregado. Use OnboardingTest.runAll() para executar');
