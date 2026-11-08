// Etapa 1 somente: servidor estático do portal e um Chrome com perfil exclusivo.
// Uso: node portal/conferir-mockup.mjs (sem build, dependências ou serviços externos).
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
const raiz = resolve(import.meta.dirname);
const saida = resolve(raiz, '../crm/local/mockup-portal');
const perfil = resolve(raiz, '../crm/local/perfil-portal');
const build = resolve(raiz, '../crm/out');
const appFonte = readFileSync(resolve(raiz, 'app.fonte.js'), 'utf8');
mkdirSync(saida, { recursive: true });
mkdirSync(perfil, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.js':'text/javascript', '.css':'text/css', '.webmanifest':'application/manifest+json' };
const servidor = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') {
    res.writeHead(200, {'Content-Type':'image/png'}).end(readFileSync(resolve(raiz,'icons/favicon-32.png'))); return;
  }
  if (pathname === '/vendas/sw-antigo-qa.js') {
    res.writeHead(200, {'Content-Type':'text/javascript'}).end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));"); return;
  }
  if (pathname === '/vendas/__qa-migracao/') {
    res.writeHead(200, {'Content-Type':'text/html'}).end('<!doctype html><title>Fixture isolado do SW</title>'); return;
  }
  const vendas = pathname.startsWith('/vendas/');
  const pasta = vendas ? build : raiz;
  const relativo = vendas ? pathname.slice('/vendas/'.length) : pathname.slice(1);
  let path = resolve(pasta, relativo, ...(pathname.endsWith('/') ? ['index.html'] : []));
  if (existsSync(path) && statSync(path).isDirectory()) path = resolve(path,'index.html');
  if (!path.startsWith(pasta + sep) || !existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store' });
  if (vendas && extname(path) === '.html') {
    // Build anterior, somente na resposta local: inicialização nova sem rebuild nem tocar no out/.
    const html = readFileSync(path, 'utf8').replace(/href="\/vendas\/manifest.webmanifest"/g, 'href="/manifest.webmanifest"');
    res.end(html.replace('</head>', `<script>${appFonte}\nBase360App.abrirVendas().catch(console.warn);</script></head>`));
  } else res.end(readFileSync(path));
});
await new Promise((ok, erro) => { servidor.once('error', erro); servidor.listen(4180, '127.0.0.1', ok); });
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { windowsHide: true, stdio: ['ignore','ignore','pipe'] });
let ws;
try {
  const endpoint = await new Promise((ok, erro) => {
    let log = '';
    const timer = setTimeout(() => erro(new Error('Chrome não iniciou em 20s')), 20000);
    chrome.once('error', erro);
    chrome.stderr.on('data', d => { log += d; const m = log.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) { clearTimeout(timer); ok(m[1]); } });
  });
  console.log('Chrome iniciado'); const porta = new URL(endpoint).port;
  const alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method:'PUT', signal:AbortSignal.timeout(5000) })).json();
  ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((ok, erro) => { ws.onopen = ok; ws.onerror = erro; setTimeout(() => erro(new Error('WebSocket indispon?vel')), 5000).unref(); }); console.log('CDP conectado');
  let id = 0; const pend = new Map(); const erros = []; const requisicoes = [];
  ws.onmessage = m => {
    const r = JSON.parse(m.data);
    if (r.id) { const p = pend.get(r.id); if (p) { pend.delete(r.id); r.error ? p.reject(r.error) : p.resolve(r.result); } }
    if (r.method === 'Runtime.exceptionThrown') erros.push(r.params.exceptionDetails);
    if (r.method === 'Network.requestWillBeSent') requisicoes.push(r.params.request.url);
    if (r.method === 'Network.responseReceived' && r.params.response.status >= 400) erros.push(r.params.response.url);
  };
  const cdp = (method, params = {}) => new Promise((resolve,reject) => { const atual = ++id; const timer = setTimeout(() => reject(new Error('CDP timeout: '+method)), 10000); pend.set(atual, {resolve:r=>{clearTimeout(timer);resolve(r)},reject}); ws.send(JSON.stringify({ id:atual, method, params })); });
  const avaliar = async expression => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise:true, returnByValue:true });
    assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  console.log('Abrindo portal'); await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
  // O build antigo pode tentar autenticar: bloqueio antes da primeira navegação, sem Supabase real.
  await cdp('Network.setBlockedURLs', { urls:['https://*'] });
  const esperar = async expression => {
    for (let i=0;i<150;i++) { if (await avaliar(expression)) return; await new Promise(r=>setTimeout(r,100)); }
    throw new Error('Tempo esgotado: '+expression);
  };
  await cdp('Page.navigate', { url:'http://127.0.0.1:4180/' });
  for (let i = 0; i < 100; i++) { if (await avaliar('document.readyState === "complete"')) break; await new Promise(r => setTimeout(r, 50)); }
  await esperar('!!navigator.serviceWorker.controller');
  const resultados = [];
  for (const [largura, altura] of [[375,812],[1440,900]]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width:largura,height:altura,deviceScaleFactor:1,mobile:largura < 768 });
    for (const tema of ['papel','grafite']) {
      await avaliar(`MB.preferencias.aplicar('tema', '${tema}'); MB.preferencias.aplicar('movimento','reduzido'); document.fonts.ready`);
      await cdp('Page.bringToFront'); await avaliar('document.querySelector("a.mb-botao").focus()');
      await cdp('Input.dispatchKeyEvent', { type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9 });
      await cdp('Input.dispatchKeyEvent', { type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9 });
      const dados = await avaliar(`(async () => {
        await document.fonts.load('16px Inter'); await document.fonts.load('20px "Bricolage Grotesque"');
        const botoes = [...document.querySelectorAll('a.mb-botao')].map(el => ({ texto:el.textContent, href:el.getAttribute('href'), altura:el.getBoundingClientRect().height }));
        
        return { tema:document.documentElement.dataset.theme, largura:innerWidth, conteudo:document.documentElement.scrollWidth, botoes,
          fontes:document.fonts.check('16px Inter') && document.fonts.check('20px "Bricolage Grotesque"'),
          marca:document.querySelector('.mb-marca__lockup').getBoundingClientRect().height,
          respiro:getComputedStyle(document.querySelector('.portal-marca')).paddingTop,
          alinhamento:[document.querySelector('.mb-marca'),document.querySelector('.portal-intro'),document.querySelector('.portal-modulos')].map(el=>el.getBoundingClientRect().left),
          icones:[...document.querySelectorAll('.portal-titulo')].map(el => ({ quantidade:el.querySelectorAll('.mb-icone').length, tamanho:el.querySelector('.mb-icone').getBoundingClientRect().width, cor:getComputedStyle(el).color, corIcone:getComputedStyle(el.querySelector('.mb-icone')).color })),
          logo:{ carregado:document.querySelector('.mb-logo-mbigucci img').naturalWidth > 0, altura:document.querySelector('.mb-logo-mbigucci').getBoundingClientRect().height },
          foco:getComputedStyle(document.activeElement).outlineStyle, ativo:document.activeElement.outerHTML.slice(0,150),
          sw:(await navigator.serviceWorker.getRegistrations()).length };
      })()`);
      assert.equal(dados.tema, tema); assert.equal(dados.largura, largura); assert(dados.conteudo <= largura); assert(dados.fontes); assert.equal(dados.sw,1); assert.equal(dados.foco,'solid');
      assert.deepEqual(dados.botoes.map(b=>b.href), ['/vendas/','/repasse/']);
      assert.equal(dados.marca, largura === 375 ? 40 : 48);
      assert.equal(parseFloat(dados.respiro), dados.marca / 2);
      assert(dados.alinhamento.every(x=>x===dados.alinhamento[0]));
      assert(dados.icones.every(i => i.quantidade === 1 && i.tamanho === 24 && i.cor === i.corIcone));
      assert(dados.logo.carregado); assert.equal(dados.logo.altura, 40);
      if (largura === 375) assert(dados.botoes.every(b => b.altura >= 44));
      await avaliar('document.activeElement.blur()');
      const print = await cdp('Page.captureScreenshot', { format:'png', captureBeyondViewport:false });
      const nome = `${largura}-${tema}.png`;
      writeFileSync(resolve(saida,nome), Buffer.from(print.data,'base64'));
      resultados.push({ arquivo:nome, ...dados });
    }
  }
  assert.deepEqual(erros, []);
  assert(requisicoes.every(u => u.startsWith('http://127.0.0.1:4180/') || u.startsWith('data:')));
  const preview = {};
  preview.raiz = await avaliar('navigator.serviceWorker.controller.scriptURL');
  assert.equal(preview.raiz,'http://127.0.0.1:4180/sw.js');
  await cdp('Page.navigate', {url:'http://127.0.0.1:4180/vendas/__qa-migracao/'});
  await esperar('document.readyState === "complete"');
  await avaliar(`(async()=>{ const reg = await navigator.serviceWorker.register('/vendas/sw-antigo-qa.js',{scope:'/vendas/'}); while(!reg.active) await new Promise(r=>setTimeout(r,50)); })()`);
  await cdp('Page.reload'); await esperar('navigator.serviceWorker.controller?.scriptURL.endsWith("sw-antigo-qa.js")');
  preview.antes = await avaliar('navigator.serviceWorker.controller.scriptURL');
  await avaliar(appFonte + '\nBase360App.abrirVendas()');
  preview.registros = await avaliar('(async()=> (await navigator.serviceWorker.getRegistrations()).map(r=>r.scope))()');
  assert.deepEqual(preview.registros,['http://127.0.0.1:4180/']);
  await cdp('Page.reload'); await esperar('navigator.serviceWorker.controller?.scriptURL === "http://127.0.0.1:4180/sw.js"');
  preview.depois = await avaliar('navigator.serviceWorker.controller.scriptURL');
  assert(existsSync(resolve(build,'index.html')), 'Build anterior necessário para conferir /vendas/');
  await cdp('Page.navigate', {url:'http://127.0.0.1:4180/vendas/'});
  await esperar('document.readyState === "complete" && !!window.Base360App');
  preview.vendas = await avaliar('({worker:navigator.serviceWorker.controller?.scriptURL,ultimo:localStorage.getItem("base360:ultimo-modulo"),manifest:document.querySelector("link[rel=manifest]")?.getAttribute("href")})');
  assert.equal(preview.vendas.worker,'http://127.0.0.1:4180/sw.js'); assert.equal(preview.vendas.ultimo,'vendas'); assert.equal(preview.vendas.manifest,'/manifest.webmanifest');
  const instalado = await cdp('Page.addScriptToEvaluateOnNewDocument', {source:"Object.defineProperty(navigator,'standalone',{value:true,configurable:true})"});
  await cdp('Page.navigate',{url:'http://127.0.0.1:4180/'});
  await esperar('location.pathname.startsWith("/vendas/") && document.readyState === "complete" && !!window.Base360App');
  preview.instalado = await avaliar('location.pathname');
  // Link igual ao dos componentes atuais; fixture porque esta prévia não autentica.
  await avaliar(`{ const a = document.createElement('a'); a.className='mb-menu__marca'; a.href='/vendas/'; a.textContent='Base360'; document.body.append(a); a.click(); }`);
  await esperar('location.pathname === "/" && location.search === "?portal=1" && document.readyState === "complete"');
  preview.retorno = await avaliar('location.pathname+location.search');
  await cdp('Page.removeScriptToEvaluateOnNewDocument',{identifier:instalado.identifier});
  assert.deepEqual(erros, []);
  writeFileSync(resolve(saida,'conferencia.json'), JSON.stringify({ resultados, erros, requisicoes, preview, limite:'Build anterior com runtime novo injetado só na resposta local. HTTPS bloqueado; sem login, push real ou build novo.' },null,2));
  console.log('PASSOU: 4 capturas; alinhamento; ícones 24px; logo 40px; fontes; sem rolagem lateral; toque 44px; foco; links.');
  console.log('PASSOU: SW raiz controla / e /vendas/; SW antigo removido; último módulo; retorno pelo logo no app instalado.');
  console.log(saida);
} finally {
  if (ws) ws.close(); chrome.kill(); servidor.closeAllConnections(); await new Promise(ok => servidor.close(ok));
}
