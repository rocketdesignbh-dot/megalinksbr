// Smoke test do index.html (P15), reconstruido conforme a descricao no
// ESTADO_ATUAL.md: extrai os blocos <script>, roda TODOS no MESMO contexto vm
// com um DOM falso permissivo, e reporta os erros de TOP-LEVEL.
// Veredito e "piorou?" contra um baseline -- nao "tem erro?".
import fs from 'node:fs';
import vm from 'node:vm';

const arquivo = process.argv[2];
const html = fs.readFileSync(arquivo, 'utf8');

const blocos = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

// DOM falso permissivo: qualquer propriedade existe, qualquer chamada devolve
// outro proxy. Serve para o top-level rodar sem o browser; NAO simula
// comportamento, so evita que acesso a propriedade derrube o script.
const permissivo = () => new Proxy(function () {}, {
  get: (t, k) => {
    if (k === Symbol.toPrimitive || k === 'toString' || k === 'valueOf') return () => '';
    if (k === Symbol.iterator) return function* () {};
    if (k === 'then') return undefined;            // nao finge ser Promise
    if (k === 'length') return 0;
    return permissivo();
  },
  set: () => true,
  apply: () => permissivo(),
  construct: () => permissivo(),
  has: () => true,
});

const ctx = vm.createContext(new Proxy({
  console: { log(){}, warn(){}, error(){}, info(){} },
  setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
  fetch: () => Promise.resolve(permissivo()),
  Promise, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp,
  Error, TypeError, Map, Set, WeakMap, WeakSet, Symbol, Proxy, Reflect, parseInt, parseFloat,
  isNaN, isFinite, encodeURIComponent, decodeURIComponent, URL, URLSearchParams,
}, {
  // qualquer global nao declarado (document, window, elementos por id...) existe
  has: () => true,
  get: (t, k) => (k in t ? t[k] : permissivo()),
}));

const erros = [];
blocos.forEach((codigo, i) => {
  try {
    new vm.Script(codigo, { filename: `bloco${i + 1}.js` }).runInContext(ctx, { timeout: 10000 });
  } catch (e) {
    erros.push(`bloco${i + 1}: ${e.name}: ${e.message}`);
  }
});

console.log(`arquivo : ${arquivo}`);
console.log(`blocos  : ${blocos.length}`);
console.log(`erros   : ${erros.length}`);
for (const e of erros) console.log(`  - ${e}`);
