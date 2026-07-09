# 🔧 Snippets de Integração Rápida

Copie e cole esses trechos no seu código para integrar o onboarding rapidamente.

---

## 1️⃣ Adicionar no `index.html`

**Procure pela tag `</head>` e adicione ANTES:**
```html
  <link rel="stylesheet" href="onboarding.css">
</head>
```

**Procure pela tag `</body>` e adicione ANTES:**
```html
  <script src="onboarding.js"></script>
  <script src="exemplo-postagens.js"></script>
  <script src="exemplo-configuracao.js"></script>
</body>
```

---

## 2️⃣ Integrar na Navegação (seu `app.js`)

**Encontre a função que muda de página e adicione:**

```javascript
// Quando usuário clica em "⚡ Postar Agora"
function goPage(pageId) {
  // ... seu código de navegação existente ...
  
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(pageId).style.display = 'block';
  
  // ✨ ADICIONE AQUI:
  if (pageId === 'post-relampago') {
    initPostagensOnboarding();
  }
  
  if (pageId === 'meus-dados' || pageId === 'config-afiliados' || pageId === 'assinatura') {
    initConfigOnboarding();
  }
}
```

---

## 3️⃣ Integrar após Carregar Dados do Usuário

**Encontre onde você faz `loadUserProfile()` ou similar:**

```javascript
async function loadUserProfile() {
  // ... seu fetch/query existente ...
  
  const userData = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  // ✨ ADICIONE AQUI:
  checkMissingData(userData.data);  // Valida dados incompletos
  
  return userData.data;
}
```

---

## 4️⃣ Criar um Novo Tooltip (Passo-a-Passo)

**Template:**
```javascript
const showMeuTooltip = () => {
  OnboardingManager.show('minha-feature-chave', {
    title: '💡 Seu Título Aqui',
    content: `
      <p>Aqui entra a explicação...</p>
      <p>Pode ter <strong>múltiplas linhas</strong> e <em>HTML</em>.</p>
    `,
    position: 'bottom', // ou 'top', 'left', 'right'
    actions: {
      primary: { text: 'OK', fn: () => console.log('Clicou!') },
      secondary: { text: 'Pular', fn: () => {} }
    }
  });
};

// Chamar quando apropriado:
showMeuTooltip();
```

---

## 5️⃣ Criar um Novo Guia Passo-a-Passo

**Template:**
```javascript
const showMeuGuia = () => {
  OnboardingManager.showGuide('meu-guide-chave', [
    {
      title: '1️⃣ Primeiro Passo',
      content: 'Clique aqui para começar...',
      targetSelector: '[data-id="primeiro"]'
    },
    {
      title: '2️⃣ Segundo Passo',
      content: 'Agora faça isso...',
      targetSelector: '[data-id="segundo"]'
    },
    {
      title: '✅ Pronto!',
      content: 'Parabéns, você conseguiu!'
    }
  ]);
};

// Chamar quando apropriado:
showMeuGuia();
```

---

## 6️⃣ Resetar Tooltips (Para Testes)

**Copie e cole no console do navegador (F12):**

```javascript
// Ver estado atual
console.table(OnboardingManager.getState());

// Reset um tooltip específico
OnboardingManager.reset('nome-da-feature');

// Reset tudo
OnboardingManager.resetAll();
location.reload();

// Forçar mostrar um tooltip
OnboardingManager.show('test-tooltip', {
  title: 'Teste',
  content: 'Funciona!'
});
```

---

## 7️⃣ Tooltip com Validação de Dados

**Se algum campo obrigatório estiver vazio:**
```javascript
function validateAndShow() {
  const user = getCurrentUser();
  
  if (!user.cpf) {
    OnboardingManager.show('warning-cpf', {
      title: '⚠️ CPF Necessário',
      content: 'Para receber pagamentos, adicionamos seu CPF.',
      position: 'top',
      actions: {
        primary: { text: 'Adicionar CPF' }
      }
    });
  }
}

// Chamar após carregar usuário
validateAndShow();
```

---

## 8️⃣ Tooltip com Countdown/Timer (Desaparece Sozinho)

```javascript
OnboardingManager.show('quick-tip', {
  title: 'Dica Rápida',
  content: 'Este tooltip desaparece em 5 segundos...'
});

// Remove automaticamente depois de 5 segundos
setTimeout(() => {
  document.querySelector('[data-tooltip-id="quick-tip"]')?.remove();
}, 5000);
```

---

## 9️⃣ Integração com Dark Mode

**Se seu app tem toggle dark/light:**

```javascript
// Quando mudar de tema
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  
  // Tooltips abertos será regenerados automaticamente
  // graças às variáveis CSS!
}
```

---

## 🔟 Enviar Dados para Analytics (Opcional)

```javascript
const showConTracking = (featureKey) => {
  OnboardingManager.show(featureKey, {
    title: 'Feature com Tracking',
    content: 'Ação será registrada...',
    actions: {
      primary: {
        text: 'Clique',
        fn: () => {
          // Enviar para Google Analytics / Mixpanel / seu analytics
          gtag?.('event', 'onboarding_click', {
            feature_key: featureKey,
            timestamp: new Date().toISOString()
          });
          
          mixpanel?.track('Onboarding Interaction', {
            feature: featureKey,
            action: 'primary_click'
          });
        }
      }
    }
  });
};
```

---

## 1️⃣1️⃣ Mostrar Tooltip Apenas Para Novo Usuário

```javascript
if (user.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
  // Usuário criou conta há menos de 7 dias
  showFirstPostGuide();
} else {
  // Usuário antigo, não mostrar guide
  console.log('Usuário experiente, skip onboarding');
}
```

---

## 1️⃣2️⃣ Tooltip Condicional Baseado em Ação do Usuário

```javascript
// Se usuário tentou postar sem selecionar grupo
const btn = document.querySelector('[data-btn="enviar-post"]');
btn?.addEventListener('click', (e) => {
  const grupoSelecionado = document.querySelector('input[name="grupo"]:checked');
  
  if (!grupoSelecionado) {
    e.preventDefault();
    
    OnboardingManager.show('aviso-grupo-obrigatorio', {
      title: '⚠️ Selecione um Grupo',
      content: 'Você precisa escolher pelo menos um grupo para enviar o post.',
      position: 'top'
    });
  }
});
```

---

## 1️⃣3️⃣ Tooltip com Imagem/GIF

```javascript
OnboardingManager.show('visual-guide', {
  title: 'Veja Como Funciona',
  content: `
    <p>Confira o exemplo abaixo:</p>
    <img src="/images/tutorial-postar.gif" style="width: 100%; max-width: 280px; border-radius: 8px; margin: 12px 0;">
    <p style="font-size: 12px; color: #999;">Animação mostrando o passo-a-passo</p>
  `,
  position: 'bottom'
});
```

---

## 1️⃣4️⃣ Tooltip Multi-Idioma (i18n)

```javascript
const translations = {
  pt: {
    'postar-agora': {
      title: '⚡ Postar Agora',
      content: 'Crie posts rapidamente...'
    }
  },
  en: {
    'postar-agora': {
      title: '⚡ Post Now',
      content: 'Create posts quickly...'
    }
  }
};

const lang = localStorage.getItem('app-language') || 'pt';

OnboardingManager.show('postar-agora', translations[lang]['postar-agora']);
```

---

## 1️⃣5️⃣ Checklist de Onboarding

```javascript
const onboardingSteps = [
  { key: 'email-verificado', label: 'Email verificado', done: false },
  { key: 'whatsapp-conectado', label: 'WhatsApp conectado', done: false },
  { key: 'primeiro-post', label: 'Primeiro post criado', done: false },
  { key: 'plano-ativo', label: 'Plano ativo', done: false }
];

const progressPercent = onboardingSteps.filter(s => s.done).length / onboardingSteps.length * 100;

OnboardingManager.show('onboarding-progress', {
  title: '🎯 Sua Jornada',
  content: `
    <div style="margin: 12px 0;">
      <div style="background: #f0f0f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
        <div style="background: linear-gradient(90deg, #fbbf24, #f59e0b); height: 100%; width: ${progressPercent}%; transition: width 0.3s;"></div>
      </div>
      <p style="text-align: center; font-weight: bold; color: #1f2937;">
        ${progressPercent.toFixed(0)}% completo
      </p>
    </div>
    <ul style="font-size: 13px; list-style: none; padding: 0;">
      ${onboardingSteps.map(s => `
        <li style="padding: 6px 0; color: ${s.done ? '#22c55e' : '#6b7280'};">
          ${s.done ? '✓' : '○'} ${s.label}
        </li>
      `).join('')}
    </ul>
  `
});
```

---

## 📌 Dicas Finais

1. **Use data-attributes no HTML** para facilitar seleção:
   ```html
   <button data-nav="post-relampago">Postar</button>
   <button data-section="grupos">Meus Grupos</button>
   ```

2. **Agrupe tooltips por feature** em arquivos separados:
   - `onboarding-postagens.js`
   - `onboarding-config.js`
   - `onboarding-dashboard.js`

3. **Teste em Mobile** - use DevTools mobile mode (F12)

4. **Monitor localStorage** - no DevTools → Application → Storage

5. **Performance** - carregue os scripts do onboarding no final do `</body>`

---

Pronto? Comece a integrar! 🚀
