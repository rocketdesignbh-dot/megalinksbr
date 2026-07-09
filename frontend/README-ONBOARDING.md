# 🎯 Sistema de Onboarding com Tooltips - MegaLinks

Um sistema completo de tooltips e guias interativas para orientar novos usuários no MegaLinks, com persistência em localStorage e opção "Não mostrar novamente".

---

## 📦 O que está incluído

```
onboarding.js              ← Core do sistema (módulo principal)
onboarding.css             ← Estilos (integrado com design tokens)
exemplo-postagens.js       ← Tooltips para seção "Postar Agora"
exemplo-configuracao.js    ← Tooltips para seção "Configuração"
README-ONBOARDING.md       ← Este arquivo
```

---

## 🚀 Instalação Rápida

### 1. Adicione os arquivos ao seu projeto

```bash
# Copie para a pasta frontend/
cp onboarding.js frontend/
cp onboarding.css frontend/
cp exemplo-postagens.js frontend/
cp exemplo-configuracao.js frontend/
```

### 2. Importe no seu `index.html`

**Coloque ANTES de seu script principal:**

```html
<!DOCTYPE html>
<html>
<head>
  <!-- ... seus outros estilos ... -->
  
  <!-- ✨ Adicione aqui: -->
  <link rel="stylesheet" href="onboarding.css">
</head>
<body>
  <!-- ... seu HTML ... -->

  <!-- ✨ Adicione aqui: -->
  <script src="onboarding.js"></script>
  <script src="exemplo-postagens.js"></script>
  <script src="exemplo-configuracao.js"></script>
  
  <!-- Seu script principal -->
  <script src="seu-app.js"></script>
</body>
</html>
```

### 3. Pronto! 🎉

O `OnboardingManager` já está disponível globalmente.

---

## 🎨 Como Usar

### Opção 1: Tooltip Simples

```javascript
OnboardingManager.show('meu-feature', {
  title: '💡 Dica Legal',
  content: 'Aqui você explica o que o usuário precisa fazer...',
  position: 'bottom',
  actions: {
    primary: { text: 'Entendi', fn: () => console.log('Clicou!') },
    secondary: { text: 'Não mostrar', fn: () => {} }
  }
});
```

### Opção 2: Guia Passo-a-Passo

```javascript
OnboardingManager.showGuide('meu-guide', [
  {
    title: 'Passo 1',
    content: 'Primeira instrução aqui',
    targetSelector: '[data-elemento="primeiro"]'
  },
  {
    title: 'Passo 2',
    content: 'Segunda instrução',
    targetSelector: '[data-elemento="segundo"]'
  },
  {
    title: 'Pronto!',
    content: 'Parabéns, você conseguiu!'
  }
]);
```

### Opção 3: Tooltip Ancorado a um Elemento

```javascript
const btn = document.querySelector('.meu-botao');

OnboardingManager.show('feature-key', {
  title: '⚡ Ação Rápida',
  content: 'Este é seu botão especial!',
  targetElement: btn,      // ← Deixa o tooltip flutuando perto
  position: 'right'        // 'top', 'bottom', 'left', 'right'
});
```

---

## 🔧 API Completa

### Métodos Disponíveis

```javascript
// ✓ Inicializa o sistema (automático)
OnboardingManager.init()

// Mostra um tooltip
OnboardingManager.show(featureKey, options)

// Mostra um guia passo-a-passo
OnboardingManager.showGuide(guideKey, stepsArray)

// Marca como visto (SEM descartar)
OnboardingManager.markViewed(featureKey)

// Descarta permanentemente (usuário clicou "não mostrar")
OnboardingManager.dismiss(featureKey)

// Reset de uma feature (mostra novamente)
OnboardingManager.reset(featureKey)

// Reset de TUDO
OnboardingManager.resetAll()

// Verifica se deve mostrar
OnboardingManager.shouldShow(featureKey)  // true/false

// Vê o estado atual
OnboardingManager.getState()
```

---

## 📝 Opções do `.show()`

```javascript
{
  title: 'Título do Tooltip',                    // string
  content: 'HTML/texto do conteúdo',            // string (pode ser HTML)
  targetElement: document.querySelector('...'), // HTMLElement (opcional)
  position: 'bottom',                           // 'top'|'bottom'|'left'|'right'
  actions: {
    primary: {
      text: 'Botão 1',
      fn: () => { /* callback */ }
    },
    secondary: {
      text: 'Botão 2',
      fn: () => { /* callback */ }
    }
  }
}
```

---

## 📊 Opções do `.showGuide()`

```javascript
const steps = [
  {
    title: 'Título do Passo',
    content: 'Descrição detalhada',
    targetSelector: '[data-id="elemento"]'  // CSS selector (opcional)
  },
  // ... mais passos
];

OnboardingManager.showGuide(guideKey, steps);
```

**Comportamento automático:**
- O passo anterior será destacado com `outline + pulse`
- Scroll automático para o elemento
- Botões "Anterior" ↔ "Próximo" aparecem automaticamente

---

## 💾 Armazenamento Local

O estado é salvo em `localStorage` sob a chave `megalinks_onboarding`:

```javascript
// Exemplo de estado salvo:
{
  "primeira-feature": {
    "viewedAt": "2026-01-15T10:30:00.000Z"
  },
  "segunda-feature": {
    "dismissed": true,
    "dismissedAt": "2026-01-15T10:45:00.000Z"
  }
}
```

**Regra simples:**
- ✓ `viewedAt` = usuário viu mas pode ver de novo
- ✗ `dismissed: true` = usuário marcou "não mostrar" e NÃO aparece mais

**Reset para testes:**
```javascript
// No console do navegador:
OnboardingManager.resetAll();
location.reload();
```

---

## 📱 Exemplo Real: Integrando na Página de Postagens

Seu `index.html` já tem:
```html
<div class="page" id="post-relampago">
  <button data-nav="post-relampago" class="nav-item">⚡ Postar Agora</button>
  <!-- ... resto do conteúdo -->
</div>
```

**Adicione este script dentro de `seu-app.js`:**

```javascript
// Quando a página de Postagens abre:
function navigateToPostagens() {
  // ... seu código de navegação ...
  
  // Depois que renderizou tudo:
  setTimeout(() => {
    initPostagensOnboarding(); // Chama do exemplo-postagens.js
  }, 200);
}
```

---

## 🎯 Exemplo Real: Validação de Dados

No seu código onde você carrega os dados do usuário:

```javascript
// Após buscar dados do Supabase:
async function loadUserProfile() {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // ✨ Checa dados incompletos e mostra tooltip:
  checkMissingData(data);  // Do exemplo-configuracao.js
  
  return data;
}
```

---

## 🎨 Customizando os Estilos

Os tooltips usam **variáveis CSS** do MegaLinks. Se quiser customizar:

```css
/* No seu CSS existente ou em onboarding.css */

:root {
  --volt: #fbbf24;           /* Cor principal dos botões */
  --bg-secondary: #ffffff;   /* Fundo dos tooltips */
  --text-primary: #1f2937;   /* Texto principal */
  --r: 12px;                 /* Border radius */
}

/* Dark mode */
:root[data-theme="dark"] {
  --bg-secondary: #1f2937;
  --text-primary: #f3f4f6;
}
```

---

## 🔍 Debug & Testes

### Ferramentas de Debug Incluídas

**Para Postagens:**
```javascript
window.OnboUtils.resetAll()        // Reset tudo
window.OnboUtils.showState()       // Ver estado
window.OnboUtils.forceShow('key')  // Forçar mostrar
window.OnboUtils.listAll()         // Listar todos
```

**Para Configuração:**
```javascript
window.ConfigUtils.showSetupGuide()      // Setup novamente
window.ConfigUtils.simulateMissingData() // Testar validação
window.ConfigUtils.forceSetup()          // Setup completo
window.ConfigUtils.listAll()             // Listar todos
```

### Exemplo: Testando um Tooltip

```javascript
// No console do navegador:

// 1. Reset para mostrar novamente
OnboardingManager.reset('postar-agora-intro');

// 2. Veja o estado
console.table(OnboardingManager.getState());

// 3. Recarregue
location.reload();

// Tooltip deve aparecer novamente!
```

---

## 📋 Checklist de Integração

- [ ] Copiei `onboarding.js` e `onboarding.css` para `frontend/`
- [ ] Copiei `exemplo-postagens.js` e `exemplo-configuracao.js`
- [ ] Adicionei os `<script>` e `<link>` no `index.html`
- [ ] Testei um tooltip no console: `OnboardingManager.show('test', {title: 'Teste'})`
- [ ] Integrei `initPostagensOnboarding()` na navegação para Postagens
- [ ] Integrei `initConfigOnboarding()` na navegação para Configuração
- [ ] Integrei `checkMissingData()` após carregar perfil do usuário
- [ ] Testei o localStorage abrindo DevTools → Application → Storage → LocalStorage
- [ ] Testei "Não mostrar novamente" - verificou se o tooltip não reaparece
- [ ] Testar em modo escuro (dark mode)

---

## 🚀 Próximos Passos

1. **Customize os conteúdos** dos tooltips em `exemplo-postagens.js` e `exemplo-configuracao.js`

2. **Adicione mais features:**
   ```javascript
   OnboardingManager.show('nova-feature', { /* ... */ });
   ```

3. **Integre com analytics** (opcional):
   ```javascript
   // Quando dismissar, enviar para seu analytics:
   OnboardingManager.show('feature-key', {
     actions: {
       primary: {
         text: 'OK',
         fn: () => {
           gtag('event', 'onboarding_complete', { feature: 'feature-key' });
         }
       }
     }
   });
   ```

4. **Testes A/B** - Compare qual guia tem melhor taxa de conclusão

---

## ⚙️ Troubleshooting

### Tooltip não aparece
```javascript
// Verificar se deve aparecer
console.log(OnboardingManager.shouldShow('meu-feature'));

// Se retornar false, foi marcado como "não mostrar"
// Reset:
OnboardingManager.reset('meu-feature');
```

### localStorage cheio
- Limpar: `OnboardingManager.resetAll()`
- Verificar tamanho no DevTools: Application → Storage

### Estilos não aplicam
- Verificar se `onboarding.css` está sendo carregado
- No DevTools → Elements, procurar por `.tooltip-card`
- Checkar conflitos de CSS com classes duplicadas

### Tooltip aparece atrás de outro elemento
- Use `z-index: 9999` no `onboarding.css` (já está incluído)
- Se ainda assim aparecer atrás, aumentar o z-index

---

## 📞 Suporte

Dúvidas? Teste estas coisas primeiro:

1. **Console não tem erros?** (F12 → Console)
2. **onboarding.js está carregado?** `typeof OnboardingManager`
3. **localStorage tem dados?** `JSON.parse(localStorage.getItem('megalinks_onboarding'))`
4. **CSS está aplicado?** Inspecionar elemento e ver classes

---

## 📄 Licença

MIT - Use livremente no seu projeto!

---

**Última atualização:** 2026-01-15  
**Versão:** 1.0.0
