/**
 * EXEMPLOS DE USO: Tooltips para Seção de POSTAGENS
 * ===================================================
 * Integre esses exemplos no seu código de inicialização
 */

// ========== 1. TOOLTIP SIMPLES: Botão "Postar Agora" ==========
const showPostAgoraTooltip = () => {
  const postAgoraBtn = document.querySelector('[data-nav="post-relampago"]');

  OnboardingManager.show('postar-agora-intro', {
    title: '⚡ Postar Agora',
    content: `
      <p>Crie e envie posts para seus grupos de WhatsApp em segundos!</p>
      <p><strong>Como funciona:</strong></p>
      <ul style="margin: 8px 0; padding-left: 16px; font-size: 13px; line-height: 1.6;">
        <li>Selecione um produto do Radar</li>
        <li>Escolha os grupos para envio</li>
        <li>Clique em Enviar</li>
      </ul>
      <p style="margin-top: 12px; padding: 8px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; font-size: 13px;">
        💡 Dica: Use o Radar para encontrar ofertas automáticas
      </p>
    `,
    targetElement: postAgoraBtn,
    position: 'right',
    actions: {
      primary: { text: 'Começar', fn: () => {
        OnboardingManager.markViewed('postar-agora-intro');
      }},
      secondary: { text: 'Não mostrar novamente', fn: () => {} }
    }
  });
};


// ========== 2. TOOLTIP: Seleção de Grupos ==========
const showGruposTooltip = () => {
  const gruposSection = document.querySelector('[data-section="grupos"]');

  OnboardingManager.show('grupos-selection-tip', {
    title: '📱 Seus Grupos',
    content: `
      <p>Aqui você vê todos os grupos de WhatsApp conectados.</p>
      <p><strong>Cada grupo:</strong></p>
      <ul style="margin: 8px 0; padding-left: 16px; font-size: 13px; line-height: 1.6;">
        <li>Pode receber posts automaticamente</li>
        <li>Tem limite de envios por plano</li>
        <li>Mostra estatísticas de engajamento</li>
      </ul>
    `,
    targetElement: gruposSection,
    position: 'bottom',
    actions: {
      primary: { text: 'Próximo' },
      secondary: { text: 'Pular' }
    }
  });
};


// ========== 3. TOOLTIP: Radar de Ofertas ==========
const showRadarTooltip = () => {
  const radarNav = document.querySelector('[data-nav="radar"]');

  OnboardingManager.show('radar-intro', {
    title: '🎯 Radar de Ofertas',
    content: `
      <p><strong>Encontre automaticamente as melhores ofertas!</strong></p>
      <p>O Radar:</p>
      <ul style="margin: 8px 0; padding-left: 16px; font-size: 13px; line-height: 1.6;">
        <li>Varre Shopee, Mercado Livre, Amazon 24/7</li>
        <li>Filtra por categoria e preço</li>
        <li>Envia alertas de novas ofertas</li>
      </ul>
      <p style="margin-top: 12px; font-size: 13px;">
        ✅ Ative no Radar para começar a receber sugestões
      </p>
    `,
    targetElement: radarNav,
    position: 'right',
    actions: {
      primary: { text: 'Entendi' },
      secondary: { text: 'Não mostrar novamente' }
    }
  });
};


// ========== 4. GUIA PASSO-A-PASSO: Primeiro Post ==========
const showFirstPostGuide = () => {
  OnboardingManager.showGuide('first-post-guide', [
    {
      title: '1️⃣ Bem-vindo ao Postar Agora!',
      content: 'Vamos criar seu primeiro post em 3 passos simples. Você consegue!',
      targetSelector: '[data-nav="post-relampago"]'
    },
    {
      title: '2️⃣ Escolha uma Oferta',
      content: 'Procure um produto no Radar ou digite o nome de algo que você quer promover. Quanto mais vendido, melhor!',
      targetSelector: '[data-section="busca-produto"]'
    },
    {
      title: '3️⃣ Selecione Grupos',
      content: 'Escolha qual(is) grupo(s) receberá o post. Dica: comece com seu melhor grupo!',
      targetSelector: '[data-section="grupos"]'
    },
    {
      title: '4️⃣ Enviar!',
      content: 'Clique em "Enviar" e seu post sairá na hora. Você verá as estatísticas em tempo real.',
      targetSelector: '[data-button="btn-enviar"]'
    },
    {
      title: '✨ Pronto!',
      content: 'Parabéns! Você já sabe o básico. Confira as análises na aba "Analítico" para entender melhor seu público.',
      targetSelector: '[data-nav="analitico"]'
    }
  ]);
};


// ========== 5. TOOLTIP CONTEXTUAL: Limite de Quota ==========
const showQuotaWarningTooltip = (currentQuota, maxQuota) => {
  const percentualUsado = (currentQuota / maxQuota) * 100;

  if (percentualUsado > 80) {
    OnboardingManager.show('quota-warning-' + new Date().getTime(), {
      title: '⚠️ Atenção com sua Quota',
      content: `
        <p>Você já usou <strong>${Math.round(percentualUsado)}%</strong> de seus posts.</p>
        <p>Sobram apenas <strong>${maxQuota - currentQuota} posts</strong> até o reset do mês.</p>
        <p style="margin-top: 12px; padding: 8px; background: rgba(245, 158, 11, 0.1); border-radius: 6px; font-size: 13px;">
          💡 Considere atualizar seu plano para mais posts
        </p>
      `,
      position: 'top',
      actions: {
        primary: { text: 'Ver planos' },
        secondary: { text: 'Continuar' }
      }
    });
  }
};


// ========== 6. TOOLTIP: Dashboard de Estatísticas ==========
const showDashboardTooltip = () => {
  const dashboardNav = document.querySelector('[data-nav="dashboard"]');

  OnboardingManager.show('dashboard-metrics-intro', {
    title: '📊 Seu Dashboard',
    content: `
      <p>Aqui você vê o resumo de todos seus posts:</p>
      <div style="margin: 12px 0; font-size: 13px; line-height: 1.8; padding: 8px; background: rgba(99, 102, 241, 0.05); border-left: 3px solid #6366f1; border-radius: 4px;">
        <strong>Posts Enviados</strong> - Total de posts este mês<br>
        <strong>Mensagens</strong> - Quantas vezes foi repostado<br>
        <strong>Reações</strong> - Likes e reactions dos seus posts<br>
        <strong>Cliques</strong> - Quantos acessaram seus links
      </div>
    `,
    targetElement: dashboardNav,
    position: 'right',
    actions: {
      primary: { text: 'Ver agora' },
      secondary: { text: 'Depois' }
    }
  });
};


// ========== 7. INICIALIZAÇÃO - Chamar ao carregar a página de Postagens ==========
const initPostagensOnboarding = () => {
  // Só mostra tooltips para usuários que ainda não completaram o onboarding
  if (OnboardingManager.shouldShow('primeiro-acesso-postagens')) {

    // Se é primeira vez MESMO, mostra guia completo
    if (!OnboardingManager.shouldShow('first-post-guide')) {
      // Usuário já viu o guia, mostra apenas tooltips rápidos
      setTimeout(() => {
        if (OnboardingManager.shouldShow('postar-agora-intro')) {
          showPostAgoraTooltip();
        }
      }, 1000);
    } else {
      // Primeira vez, mostra guia passo-a-passo
      setTimeout(() => {
        showFirstPostGuide();
        OnboardingManager.markViewed('primeiro-acesso-postagens');
      }, 500);
    }
  }
};


// ========== 8. EXEMPLO DE INTEGRAÇÃO NO HTML ==========
/*
  <script src="onboarding.js"></script>
  <link rel="stylesheet" href="onboarding.css">

  <!-- Quando a página de postagens carregar: -->
  <script>
    if (document.querySelector('[data-page="post-relampago"]')) {
      initPostagensOnboarding();
    }
  </script>
*/

// ========== 9. CONTROLES DO DESENVOLVEDOR (Remover após testes) ==========
window.OnboUtils = {
  // Mostra todos os tooltips novamente
  resetAll: () => {
    OnboardingManager.resetAll();
    console.log('✓ Todos os tooltips foram resetados');
  },

  // Mostra estado atual do onboarding
  showState: () => {
    console.table(OnboardingManager.getState());
  },

  // Força mostrar um tooltip específico
  forceShow: (key) => {
    OnboardingManager.reset(key);
    console.log(`Tooltip "${key}" pronto para ser mostrado`);
  },

  // Lista todos os tooltips disponíveis
  listAll: () => {
    const features = [
      'postar-agora-intro',
      'grupos-selection-tip',
      'radar-intro',
      'first-post-guide',
      'dashboard-metrics-intro'
    ];
    console.log('📋 Tooltips disponíveis:', features);
  }
};

console.log('✓ Onboarding de Postagens carregado. Use window.OnboUtils para debug');
