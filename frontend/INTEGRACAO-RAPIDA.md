# ⚡ Integração Rápida - Onboarding MegaLinks

Comece em **5 minutos**.

---

## 1️⃣ Copiar Arquivos

```bash
# Copie estes 8 arquivos para frontend/:
onboarding.js
onboarding.css
onboarding-config.js
onboarding-test.js
exemplo-postagens.js
exemplo-configuracao.js
README-ONBOARDING.md
SNIPPETS-INTEGRACAO.md
```

---

## 2️⃣ Adicionar ao HTML

**Em `frontend/index.html`, antes de `</head>`:**
```html
<link rel="stylesheet" href="onboarding.css">
```

**Em `frontend/index.html`, antes de `</body>`:**
```html
<script src="onboarding-config.js"></script>
<script src="onboarding.js"></script>
<script src="exemplo-postagens.js"></script>
<script src="exemplo-configuracao.js"></script>
<!-- Opcional: <script src="onboarding-test.js"></script> -->
```

---

## 3️⃣ Integrar na Navegação

**Em seu `app.js`, na função que muda de página:**

```javascript
function goPage(pageId) {
  // ... seu código ...
  
  if (pageId === 'post-relampago') {
    initPostagensOnboarding();
  }
  
  if (pageId === 'meus-dados' || pageId === 'config-afiliados') {
    initConfigOnboarding();
  }
}
```

---

## 4️⃣ Testar

**No console do navegador (F12):**
```javascript
// Mostrar um tooltip
OnboardingManager.show('teste', {
  title: '🎉 Funciona!',
  content: 'Sistema de onboarding pronto'
});

// Rodar testes
OnboardingTest.runAll();

// Ver estado
console.table(OnboardingManager.getState());
```

---

## ✅ Pronto!

Seus usuários agora têm:
- ✨ Tooltips interativos
- 📚 Guias passo-a-passo
- ☑️ Checkbox "Não mostrar novamente"
- 💾 Persistência em localStorage
- 🎨 Design integrado com seu app
- ⚙️ Totalmente configurável

---

## 🎨 Customizar (Opcional)

**Em seu `app.js`:**

```javascript
// Tema escuro
OnboardingConfig.theme = 'dark';

// Desabilitar feature
OnboardingConfig.features.dashboard.enabled = false;

// Rastrear com Google Analytics
OnboardingConfig.tracking.enabled = true;
OnboardingConfig.hooks.onTooltipShow = (key) => {
  gtag('event', 'onboarding_show', { feature: key });
};
```

---

## 📚 Próximos Passos

1. Leia `README-ONBOARDING.md` para API completa
2. Veja `SNIPPETS-INTEGRACAO.md` para 15 exemplos
3. Use `OnboardingTest.runAll()` para validar
4. Customize com `onboarding-config.js`

---

**Tempo estimado:** 5 minutos ⏱️
