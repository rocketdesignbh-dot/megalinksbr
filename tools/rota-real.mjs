// Prova de que a URL de entrada sobrevive ao boot do painel (REVISAO 64).
// Reproduz a ORDEM REAL do afterLogin: setRole('afiliado') -- que ja reescreve
// a URL para /painel/dashboard -- e SO ENTAO rotaAplicarEntrada().
// Uso: BASE=https://www.megalinksbr.com.br node tools/rota-real.mjs
// (sem sessao real o gate e escondido a mao; o que se mede aqui e o roteador)
import { createRequire } from 'node:module';
const require_=createRequire(import.meta.url);
// resolve o playwright local ou global (PLAYWRIGHT_PATH sobrescreve)
const pw=require_(process.env.PLAYWRIGHT_PATH||'playwright');
const {chromium}=pw;
const BASE=process.env.BASE||'http://localhost:8096';
const b=await chromium.launch();
async function entrar(url){
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2200);
  // reproduz a ORDEM REAL do afterLogin: esconde o gate, setRole (que chama
  // go("dashboard") e ja reescreve a URL), e so depois rotaAplicarEntrada.
  const r=await p.evaluate(()=>{
    document.getElementById('authGate').style.display='none';
    setRole('afiliado');
    const meio=location.pathname;
    rotaAplicarEntrada();
    return {meio, fim:location.pathname, aba:document.querySelector('.page.on')?.id, titulo:document.title};
  });
  await p.close();return r;
}
for(const u of ['/painel/radar','/painel/clone-post','/painel/link-rapido','/painel','/painel/nao-existe','/painel/adm-usuarios']){
  const r=await entrar(BASE+u);
  console.log(u.padEnd(22), '-> depois do setRole:',r.meio.padEnd(20),'| final:',r.fim.padEnd(22),'|',r.aba);
}
await b.close();
