/**
 * EXEMPLOS DE USO: Tooltips para Seção de CONFIGURAÇÃO
 * =====================================================
 * Integre esses exemplos no seu código de inicialização
 */

// ========== 1. GUIA PASSO-A-PASSO: Conectar WhatsApp ==========
const showWhatsAppConnectionGuide = () => {
  OnboardingManager.showGuide('setup-whatsapp-guide', [
    {
      title: '📱 Conectar WhatsApp',
      content: 'Vamos parear seu WhatsApp com o MegaLinks. É rápido e seguro!',
      targetSelector: '[data-page="conexao"]'
    },
    {
      title: '1️⃣ Abra o WhatsApp no Celular',
      content: 'No seu celular, vá para WhatsApp > Configurações > Aparelhos conectados > Conectar um aparelho',
      targetSelector: '[data-page="conexao"]'
    },
    {
      title: '2️⃣ Aponte a Câmera',
      content: 'Use o celular para escanear o código QR que aparece aqui. Pode levar alguns segundos.',
      targetSelector: '[data-page="conexao"]'
    },
    {
      title: '3️⃣ Autorize o Acesso',
      content: 'No seu celular, selecione os grupos e chats que o MegaLinks poderá acessar.',
      targetSelector: '[data-page="conexao"]'
    },
    {
      title: '✨ Conectado!',
      content: 'Pronto! Seu WhatsApp está sincronizado. Agora você pode postar para todos seus grupos.',
      targetSelector: '[data-page="conexao"]'
    }
  ]);
};


// ========== 2. TOOLTIP: Dados Pessoais ==========
const showMeusDadosTooltip = () => {
  const meusDadosNav = document.querySelector('[data-page="meus-dados"]');

  OnboardingManager.show('meus-dados-hint', {
    title: '👤 Dados Pessoais',
    content: `
      <p>Aqui você gerencia suas informações de conta:</p>
      <ul style="margin: 8px 0; padding-left: 16px; font-size: 13px; line-height: 1.8;">
        <li><strong>Nome e Email</strong> - Seu perfil</li>
        <li><strong>CPF</strong> - Necessário para pagamentos</li>
        <li><strong>Telefone</strong> - Para recuperação de conta</li>
      </ul>
      <p style="margin-top: 12px; padding: 8px; background: rgba(34, 197, 94, 0.1); border-radius: 6px; font-size: 13px;">
        🔒 Seus dados são protegidos e nunca compartilhados
      </p>
    `,
    targetElement: meusDadosNav,
    position: 'right',
    actions: {
      primary: { text: 'Verificar dados' },
      secondary: { text: 'Depois' }
    }
  });
};


// ========== 3. TOOLTIP: Configurações de Afiliado ==========
const showConfigAfiliadoTooltip = () => {
  const configNav = document.querySelector('[data-page="config-afiliados"]');

  OnboardingManager.show('config-afiliado-intro', {
    title: '⚙️ Preferências',
    content: `
      <p>Personalize como o MegaLinks funciona para você:</p>
      <div style="margin: 12px 0; padding: 8px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; font-size: 13px; line-height: 1.8;">
        <strong>🔔 Notificações</strong> - Receba alertas de novos posts<br>
        <strong>⏰ Horários</strong> - Quando enviar posts automáticos<br>
        <strong>🎯 Nichos</strong> - Categorias que você promove<br>
        <strong>💰 Comissões</strong> - Acompanhe seus ganhos
      </div>
    `,
    targetElement: configNav,
    position: 'right',
    actions: {
      primary: { text: 'Configurar' },
      secondary: { text: 'Pular' }
    }
  });
};


// ========== 4. TOOLTIP: Plano e Assinatura ==========
const showAssinaturaTooltip = () => {
  const assinNav = document.querySelector('[data-page="assinatura"]');

  OnboardingManager.show('assinatura-plans', {
    title: '💳 Seu Plano',
    content: `
      <p>Aqui você vê:</p>
      <ul style="margin: 8px 0; padding-left: 16px; font-size: 13px; line-height: 1.8;">
        <li><strong>Plano Atual</strong> - Qual você está usando</li>
        <li><strong>Quota de Posts</strong> - Quantos posts você pode enviar</li>
        <li><strong>Data de Renovação</strong> - Quando reseta sua quota</li>
        <li><strong>Upgrade</strong> - Passar para um plano melhor</li>
      </ul>
      <p style="margin-top: 12px; font-size: 13px; color: #059669;">
        ✨ Upgrade agora e desbloqueie mais grupos e posts!
      </p>
    `,
    targetElement: assinNav,
    position: 'right',
    actions: {
      primary: { text: 'Ver planos' },
      secondary: { text: 'Depois' }
    }
  });
};


// ========== 5. TOOLTIP: Telegram (Opcional) ==========
const showTelegramConfigTooltip = () => {
  const telegramNav = document.querySelector('[data-page="config-telegram"]');

  OnboardingManager.show('telegram-config-intro', {
    title: '📡 Conectar Telegram',
    content: `
      <p><strong>Opcional:</strong> Sincronize seus grupos Telegram com o MegaLinks</p>
      <p style="margin-top: 12px; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; font-size: 13px; line-height: 1.6;">
        💡 Assim você posta para WhatsApp e Telegram ao mesmo tempo!
      </p>
      <p style="margin-top: 12px; font-size: 13px;">
        Você pode fazer isso agora ou depois. Não é obrigatório.
      </p>
    `,
    targetElement: telegramNav,
    position: 'right',
    actions: {
      primary: { text: 'Conectar' },
      secondary: { text: 'Talvez depois' }
    }
  });
};


// ========== 6. TOOLTIP: FAQ e Suporte ==========
const showSupportTooltip = () => {
  const faqNav = document.querySelector('[data-page="suporte"]');

  OnboardingManager.show('suporte-available', {
    title: '💬 Precisa de Ajuda?',
    content: `
      <p>Temos um time pronto para ajudar você!</p>
      <ul style="margin: 8px 0; padding-left: 16px; font-size: 13px; line-height: 1.8;">
        <li><strong>FAQ</strong> - Respostas rápidas e comuns</li>
        <li><strong>Chat</strong> - Fale com um especialista</li>
        <li><strong>Comunidade</strong> - Aprenda com outros afiliados</li>
      </ul>
    `,
    targetElement: faqNav,
    position: 'right',
    actions: {
      primary: { text: 'Ver FAQ' },
      secondary: { text: 'Fechar' }
    }
  });
};


// ========== 7. TOOLTIP INTELIGENTE: Verificar Dados Incompletos ==========
const showMissingDataTooltip = (missingFields = []) => {
  let content = '<p>⚠️ Para usar todos os recursos, complete:</p>';
  content += '<ul style="margin: 8px 0; padding-left: 16px; font-size: 13px; line-height: 1.8;">';

  const fieldLabels = {
    email: '📧 Email verificado',
    cpf: '🆔 CPF registrado',
    telefone: '📱 Telefone',
    endereco: '📍 Endereço',
    cartao: '💳 Método de pagamento'
  };

  missingFields.forEach(field => {
    content += `<li>${fieldLabels[field] || field}</li>`;
  });

  content += '</ul>';
  content += '<p style="margin-top: 12px; font-size: 12px; color: #6b7280;">Isso levará apenas 2 minutos</p>';

  OnboardingManager.show('missing-data-' + new Date().getTime(), {
    title: '⏱️ Quase Pronto!',
    content,
    position: 'top',
    actions: {
      primary: { text: 'Completar agora' },
      secondary: { text: 'Depois' }
    }
  });
};


// ========== 8. GUIA: Primeira Configuração Completa ==========
const showCompleteSetupGuide = () => {
  OnboardingManager.showGuide('first-complete-setup', [
    {
      title: '🚀 Vamos Configurar Tudo!',
      content: 'Você está perto de começar a ganhar. Vamos completar a configuração em 5 minutos.',
      targetSelector: '[data-page="config-afiliados"]'
    },
    {
      title: '✓ Passo 1: Dados Pessoais',
      content: 'Preencha suas informações. Serão usadas apenas para pagamentos seguros.',
      targetSelector: '[data-page="meus-dados"]'
    },
    {
      title: '✓ Passo 2: WhatsApp Conectado?',
      content: 'Se ainda não conectou, faça isso agora. É essencial para começar.',
      targetSelector: '[data-page="conexao"]'
    },
    {
      title: '✓ Passo 3: Seu Plano',
      content: 'Escolha um plano e comece a postar. Você pode mudar de plano a qualquer hora.',
      targetSelector: '[data-page="assinatura"]'
    },
    {
      title: '✓ Passo 4: Preferências',
      content: 'Configure horários e notificações conforme seu gosto.',
      targetSelector: '[data-page="config-afiliados"]'
    },
    {
      title: '🎉 Parabéns!',
      content: 'Você está pronto! Agora vá para "Postar Agora" e comece a criar seu primeiro post.',
      targetSelector: '[data-page="post-relampago"]'
    }
  ]);
};


// ========== 9. MONITORAR QUANDO USUÁRIO ENTRA NA CONFIGURAÇÃO ==========
const initConfigOnboarding = () => {
  // Mostra guia completo APENAS para primeiro acesso
  if (OnboardingManager.shouldShow('primeiro-acesso-config')) {
    setTimeout(() => {
      showCompleteSetupGuide();
      OnboardingManager.markViewed('primeiro-acesso-config');
    }, 500);
  } else {
    // Para usuários recorrentes, mostra tooltips contextuais
    if (OnboardingManager.shouldShow('meus-dados-hint')) {
      setTimeout(() => showMeusDadosTooltip(), 1000);
    }
  }
};


// ========== 10. VALIDADOR: Checar Dados Incompletos ==========
const checkMissingData = (userData) => {
  const missing = [];

  if (!userData.email || !userData.email_verified) missing.push('email');
  if (!userData.cpf) missing.push('cpf');
  if (!userData.telefone) missing.push('telefone');
  if (!userData.payment_method) missing.push('cartao');

  // Se está faltando mais de 2 campos, mostra aviso
  if (missing.length > 2) {
    showMissingDataTooltip(missing);
  }
};


// ========== 11. INTEGRAÇÃO NO HTML ==========
/*
  <script src="onboarding.js"></script>
  <link rel="stylesheet" href="onboarding.css">

  <!-- Quando o usuário clicar em Configurações: -->
  <script>
    document.querySelector('[data-page="config-afiliados"]')
      ?.addEventListener('click', () => initConfigOnboarding());
  </script>

  <!-- Após buscar dados do usuário: -->
  <script>
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(userData => {
        checkMissingData(userData);
      });
  </script>
*/


// ========== 12. DEBUG UTILS ==========
window.ConfigUtils = {
  // Mostra guia de setup novamente
  showSetupGuide: () => {
    OnboardingManager.reset('first-complete-setup');
    showCompleteSetupGuide();
  },

  // Simula dados incompletos
  simulateMissingData: () => {
    showMissingDataTooltip(['cpf', 'telefone', 'cartao']);
  },

  // Lista todas as configurações disponíveis
  listAll: () => {
    const features = [
      'meus-dados-hint',
      'config-afiliado-intro',
      'assinatura-plans',
      'telegram-config-intro',
      'suporte-available',
      'first-complete-setup'
    ];
    console.log('📋 Tooltips de Configuração:', features);
  },

  // Força mostrar todo o setup novamente
  forceSetup: () => {
    OnboardingManager.resetAll();
    showCompleteSetupGuide();
  }
};

console.log('✓ Onboarding de Configuração carregado. Use window.ConfigUtils para debug');
