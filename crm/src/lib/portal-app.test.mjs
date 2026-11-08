import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const ts = require('typescript');
const ler = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const runtime = ler('../../../portal/app.fonte.js');
const sw = ler('../../../portal/sw.fonte.js');
function app({ standalone = false, valor = null, storageBloqueado = false, url = 'https://base.test/', registros = [] } = {}) {
  const armazenamento = new Map(valor ? [['base360:ultimo-modulo', valor]] : []);
  const registro = { active: {}, scope: 'https://base.test/' };
  const chamadas = [];
  const window = {
    location: { href: url, origin: new URL(url).origin, replace: d => chamadas.push(['replace',d]), assign: d => chamadas.push(['assign',d]) },
    matchMedia: () => ({ matches: standalone }),
    localStorage: { getItem: k => { if (storageBloqueado) throw Error('storage'); return armazenamento.get(k) || null; }, setItem: (k,v) => { if (storageBloqueado) throw Error('storage'); armazenamento.set(k,v); } },
    navigator: { serviceWorker: { getRegistrations: async () => registros, register: async (...args) => { chamadas.push(args); return registro; } } },
    document: { addEventListener: (...args) => chamadas.push(args) },
  };
  runInNewContext(runtime, { window, URL, setTimeout, clearTimeout });
  return { api: window.Base360App, window, chamadas, armazenamento };
}
test('portal: primeiro acesso, Vendas, navegador normal e storage bloqueado', () => {
  assert.equal(app({standalone:true}).api.destinoPortal(), null);
  assert.equal(app({standalone:true,valor:'vendas'}).api.destinoPortal(), '/vendas/');
  assert.equal(app({valor:'vendas'}).api.destinoPortal(), null);
  assert.equal(app({standalone:true,valor:'repasse'}).api.destinoPortal(), null);
  assert.equal(app({standalone:true,storageBloqueado:true}).api.destinoPortal(), null);
});
test('portal: retorno explícito vence último módulo, inclusive navigator.standalone do iPhone', () => {
  const a = app({valor:'vendas'}); a.window.navigator.standalone = true;
  assert.equal(a.api.destinoPortal(), '/vendas/');
  a.window.location.href += '?portal=1'; assert.equal(a.api.destinoPortal(), null);
});
test('Vendas: grava último módulo e logo retorna ao portal antes do Next', async () => {
  const a = app(); await a.api.abrirVendas();
  assert.equal(a.armazenamento.get('base360:ultimo-modulo'), 'vendas');
  const handler = a.chamadas.find(c => c[0] === 'click')[1];
  let prevenido = false;
  handler({button:0,target:{closest:()=>({matches:()=>true,href:'/vendas/'})},preventDefault:()=>prevenido=true,stopPropagation:()=>{}});
  assert(prevenido); assert(a.chamadas.some(c=>c[0]==='assign' && c[1]==='/?portal=1'));
  await app({storageBloqueado:true}).api.abrirVendas();
});
test('SW raiz: registro único com scope / sem permissão push automática', async () => {
  const a = app(); await Promise.all([a.api.iniciar(),a.api.iniciar()]);
  assert.equal(a.chamadas.length,1); assert.equal(a.chamadas[0][0],'/sw.js'); assert.equal(a.chamadas[0][1].scope,'/');
});
test('migração: cancela assinatura, guarda endpoint e remove somente /vendas/', async () => {
  const ordem = [];
  const a = app({registros:[
    {scope:'https://base.test/',unregister:()=>assert.fail('raiz')},
    {scope:'https://base.test/outro/',unregister:()=>assert.fail('outro')},
    {scope:'https://base.test/vendas/',pushManager:{getSubscription:async()=>({endpoint:'antigo',unsubscribe:async()=>{ordem.push('cancelar');return true;}})},unregister:async()=>{ordem.push('remover');return true;}}
  ]});
  await a.api.iniciar(); assert.deepEqual(ordem,['cancelar','remover']);
  assert.equal(a.api.endpointsAntigos()[0],'antigo'); a.api.esquecerEndpoint('antigo'); assert.equal(a.api.endpointsAntigos().length,0);
});
test('migração: falha ao cancelar não deixa assinatura órfã nem remove registro; permite tentar de novo', async () => {
  let pode = false; let removidos = 0;
  const a = app({registros:[{scope:'https://base.test/vendas/',pushManager:{getSubscription:async()=>({endpoint:'antigo',unsubscribe:async()=>pode})},unregister:async()=>{removidos++;return true;}}]});
  await assert.rejects(a.api.iniciar(), /cancelar/); assert.equal(removidos,0);
  pode = true; await a.api.iniciar(); assert.equal(removidos,1);
});
test('migração: sem storage ainda cancela e desregistra; sem suporte não falha', async () => {
  let removido = false;
  const a = app({storageBloqueado:true,registros:[{scope:'https://base.test/vendas/',pushManager:{getSubscription:async()=>null},unregister:async()=>{removido=true;return true;}}]});
  await a.api.iniciar(); assert(removido);
  delete a.window.navigator.serviceWorker; assert.equal(await a.api.iniciar(),null);
});
test('ativação aguarda o worker registrado, sem depender do ready do worker antigo', async () => {
  const a = app(); let listener;
  const worker = {state:'installing',addEventListener:(_,fn)=>listener=fn,removeEventListener:()=>{}};
  const reg = {installing:worker}; const promessa = a.api.aguardarAtivo(reg);
  worker.state='activated'; listener(); assert.equal(await promessa,reg);
});
function worker({janelas = []} = {}) {
  const handlers = {}; const chamadas = [];
  const self = {addEventListener:(nome,fn)=>handlers[nome]=fn,registration:{scope:'https://base.test/',showNotification:async(...args)=>chamadas.push(args)},skipWaiting:()=>{},clients:{claim:async()=>{},matchAll:async()=>janelas,openWindow:async url=>chamadas.push(['abrir',url])}};
  runInNewContext(sw,{self,URL});
  return {handlers,chamadas};
}
test('push: URLs relativas continuam em /vendas/, ícone na raiz e dados inválidos têm fallback', async () => {
  const w=worker();
  for (const [url,esperado] of [['leads/ficha/?id=abc','leads/ficha/?id=abc'],['/vendas/agenda/','agenda/'],['https://outro.test/vendas/',''],['/vendas-falso/',''],['../fora',''],['javascript:alert(1)','']]) {
    let promessa; w.handlers.push({data:{json:()=>({url})},waitUntil:p=>promessa=p}); await promessa;
    const n = w.chamadas.at(-1)[1]; assert.equal(n.data.url,'https://base.test/vendas/'+esperado); assert.equal(n.icon,'https://base.test/icons/icon-192.png');
  }
  let promessa; w.handlers.push({data:{json:()=>null},waitUntil:p=>promessa=p}); await promessa;
});
test('clique: navega e foca janela do Vendas; janela de outro módulo não é sequestrada', async () => {
  const ordem=[]; const janela={url:'https://base.test/vendas/',navigate:async url=>{ordem.push(url);return {focus:async()=>ordem.push('foco')}}};
  const w=worker({janelas:[{url:'https://base.test/outro/'},janela]}); let promessa;
  w.handlers.notificationclick({notification:{data:{url:'leads/ficha/?id=1'},close:()=>{}},waitUntil:p=>promessa=p}); await promessa;
  assert.deepEqual(ordem,['https://base.test/vendas/leads/ficha/?id=1','foco']); assert.equal(w.chamadas.length,0);
});
test('clique: sem janela, navigate falhando ou retornando null abre janela com fallback seguro', async () => {
  for (const janelas of [[],[{url:'https://base.test/',navigate:async()=>{throw Error('navegar')}}],[{url:'https://base.test/',navigate:async()=>null}]]) {
    const w=worker({janelas});let promessa;
    w.handlers.notificationclick({notification:{data:{url:'https://fora.test/'},close:()=>{}},waitUntil:p=>promessa=p});await promessa;
    assert.equal(w.chamadas[0][1],'https://base.test/vendas/');
  }
});
test('manifest e cópias geradas são idênticos; escopo e início /, ícones locais', () => {
  const manifest=JSON.parse(ler('../../../portal/manifest.webmanifest'));
  for (const chave of ['id','start_url','scope']) assert.equal(manifest[chave],'/');
  assert(manifest.icons.every(i=>i.src.startsWith('/icons/')));
  assert.equal(ler('../../../portal/sw.js'),sw);
  assert.equal(ler('../../public/sw.js'),sw);
  assert.equal(ler('../../public/manifest.webmanifest'),ler('../../../portal/manifest.fonte.webmanifest'));
});
test('push.ts: limpa linha antiga mesmo sem permissão de push; falha no banco conserva pendência', async () => {
  for (const falha of [false,true]) {
    const chamadas=[]; const exports={};
    const appSite={iniciar:async()=>{chamadas.push('raiz');return {};},endpointsAntigos:()=>['endpoint-antigo'],esquecerEndpoint:e=>chamadas.push(['esquecer',e])};
    const supabase={from:t=>{chamadas.push(t);return {delete:()=>({eq:async(k,v)=>{chamadas.push([k,v]);return {error:falha ? {message:'offline'} : null};}})}}};
    const js=ts.transpileModule(ler('./push.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    runInNewContext(js,{exports,require:p=>p==='./supabase'?{supabase}:{TIPOS_AVISO:[]},process:{env:{}},window:{Base360App:appSite},navigator:{serviceWorker:{},userAgent:'Chrome'},Notification:{permission:'denied'},console:{warn:()=>{}}});
    await exports.sincronizarAvisos();
    assert.equal(chamadas[0],'raiz');assert(chamadas.some(c=>Array.isArray(c)&&c[0]==='endpoint'&&c[1]==='endpoint-antigo'));
    assert.equal(chamadas.some(c=>Array.isArray(c)&&c[0]==='esquecer'),!falha);
  }
});
test('push.ts: usa assinatura do registro raiz ao ligar avisos e aguarda sua ativação', async () => {
  const exports={};const chamadas=[]; let ativado=false;
  const sub={endpoint:'novo',toJSON:()=>({keys:{p256dh:'publica-ficticia',auth:'auth-ficticio'}})};
  const reg={pushManager:{getSubscription:async()=>null,subscribe:async()=>{assert(ativado);chamadas.push('assinar');return sub;}}};
  const supabase={rpc:async(nome,args)=>{chamadas.push([nome,args.p_endpoint]);return {error:null};}};
  const js=ts.transpileModule(ler('./push.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  runInNewContext(js,{exports,require:p=>p==='./supabase'?{supabase}:{TIPOS_AVISO:[]},process:{env:{NEXT_PUBLIC_VAPID_PUBLIC_KEY:'AQID'}},window:{Base360App:{iniciar:async()=>{await Promise.resolve();ativado=true;return reg;}}},navigator:{userAgent:'Chrome',serviceWorker:{}},Notification:{requestPermission:async()=> 'granted'},atob,Uint8Array,ArrayBuffer});
  await exports.ligarAvisos([]); assert.equal(chamadas[0],'assinar');assert.deepEqual(chamadas[1],['push_assinar','novo']);
});
test('layout e card de avisos: sintaxe TS/TSX válida; runtime e manifest da raiz no layout', () => {
  for (const path of ['../app/layout.tsx','../components/avisos-aparelho.tsx']) {
    const resultado=ts.transpileModule(ler(path),{fileName:path,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.Preserve,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}});
    assert.equal(resultado.diagnostics.length,0);
  }
  const layout=ler('../app/layout.tsx'); assert(layout.includes('"../portal/app.fonte.js"'));assert(layout.includes('manifest: "/manifest.webmanifest"'));assert(layout.includes('Base360App.abrirVendas()'));
});

