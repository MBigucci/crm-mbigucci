// Requer a prévia isolada em :4173 e Playwright instalado fora do app.
// PLAYWRIGHT_MODULE pode apontar para o pacote fornecido pelo ambiente de QA.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { resultados } from './contraste-temas.mjs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:4173/base360/vendas/';
const preSubida = process.argv.includes('--pre-subida');
const destino = resolve('..', 'docs/revisao-visual', preSubida ? '2026-11-05' : 'temas');
const chave = 'mbigucci-crm-aparencia';
const telas = [
  ['lista-do-dia',''], ['ficha','leads/ficha/?id=lead-1'], ['cadastro','leads/novo/'],
  ['quadro','leads/quadro/'], ['leads-equipe','leads/'], ['painel','painel/'],
  ['relatorio','painel/?c=corretor-1'], ['agenda','agenda/'], ['vendas','vendas/'],
  ['metas','metas/'], ['empreendimentos','empreendimentos/'], ['minha-conta','conta/'],
  ['configuracoes','configuracoes/'], ['entrar','entrar/'], ['equipes','equipes/'],
  ['usuarios','usuarios/'], ['empreendimento','empreendimentos/ver/?slug=residencial-exemplo'],
  ['editar-empreendimento','empreendimentos/editar/?slug=residencial-exemplo'],
  ['importar-tabela','empreendimentos/importar/'], ['faixas','faixas/'],
  ['meus-pontos','meus-pontos/'], ['programa','programa/'],
  ['aprovacao','programa/aprovacao/'], ['ranking','ranking/'], ['plantao','plantao/'],
  ['meus-pontos-geral','meus-pontos/?qa=geral'], ['ranking-geral','ranking/?qa=geral'], ['plantao-geral','plantao/?qa=geral'],
];
const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const erros = [], capturas = [];
async function abrir(page, rota) {
  await page.goto(base + rota, {waitUntil:'domcontentloaded'});
  await page.locator('main').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>!document.querySelector('main')?.textContent.includes('Carregando…'));
}
async function capturar(page, tema, largura, nome) {
  // Consultas fictícias podem trocar btn-red por btn-ghost ao chegar a carteira.
  // Auditar o estado final, sem capturar uma cor intermediária da transição.
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));
  });
  const auditoria = await page.evaluate((incluirOpacidade) => {
    const rgb = c => c.match(/[\d.]+/g)?.map(Number) ?? [0,0,0,0];
    const lum = a => a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const fundo = el => {
      const chain=[]; for(let p=el;p;p=p.parentElement) chain.unshift(p);
      return chain.reduce((cor,p)=>{const c=rgb(getComputedStyle(p).backgroundColor),a=c[3]??1;return c.slice(0,3).map((v,i)=>v*a+cor[i]*(1-a));},[255,255,255]);
    };
    const falhas=[];
    // Compõe cada grupo de pintura antes de aplicar a opacidade do ancestral.
    function pixel(el, tinta) {
      let cor=tinta || [0,0,0,0];
      function sobre(frente,tras) {
        const a=frente[3]??1,b=tras[3]??1,alpha=a+b*(1-a);
        return [...frente.slice(0,3).map((v,i)=>alpha?(v*a+tras[i]*b*(1-a))/alpha:0),alpha];
      }
      for(let p=el;p;p=p.parentElement) {
        const s=getComputedStyle(p);
        cor=sobre(cor,rgb(s.backgroundColor));
        cor[3]*=Number(s.opacity);
      }
      return sobre(cor,[255,255,255,1]);
    }
    for(const el of document.querySelectorAll('body *')) {
      if(!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) || !el.getBoundingClientRect().width || el.closest(':disabled')) continue;
      if(![...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim())) continue;
      const s=getComputedStyle(el);
      // Controles desabilitados são isentos; demais textos usam o tamanho/peso renderizado.
      if(el.closest('[disabled]')) continue;
      const min=parseFloat(s.fontSize)>=24 || (parseFloat(s.fontSize)>=18.66 && +s.fontWeight>=700) ? 3 : 4.5;
      const valor=incluirOpacidade ? ratio(pixel(el,rgb(s.color)),pixel(el)) : ratio(rgb(s.color),fundo(el));
      if(valor+.001<min) falhas.push({texto:el.textContent.trim().slice(0,80),classe:el.className,contraste:valor,min});
    }
    return {largura:innerWidth,conteudo:document.documentElement.scrollWidth,tema:document.documentElement.dataset.tema,falhas};
  },preSubida);
  if (nome !== 'cadastro-publico') assert.equal(auditoria.tema,tema);
  const path = `${tema}/${nome}-${largura}.jpg`;
  await page.screenshot({path:resolve(destino,path),fullPage:true,type:'jpeg',quality:80});
  capturas.push({arquivo:path,...auditoria});
}
try {
  if (preSubida) {
    const { revisar } = await import('./visual-rodada-novembro.mjs');
    await revisar({browser, abrir, capturar, destino, telas, capturas, erros, resultados});
  } else {
  for(const tema of ['claro','escuro']) for(const largura of [375,1440]) {
    mkdirSync(resolve(destino,tema),{recursive:true});
    const context=await browser.newContext({viewport:{width:largura,height:largura===375?812:900},colorScheme:tema==='escuro'?'dark':'light',timezoneId:'America/Sao_Paulo',locale:'pt-BR'});
    // A rodada usa Automático, exercitando prefers-color-scheme em todas as telas.
    await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    const page=await context.newPage();
    await page.clock.install({time:new Date('2026-10-30T12:00:00-03:00')});
    page.on('pageerror',e=>erros.push(e.message));
    page.on('console',msg=>{if(msg.type()==='error' && !msg.location().url?.endsWith('/mbigucci-logo.png')) erros.push(msg.text());});
    for(const [nome,rota] of telas) { await abrir(page,rota); await capturar(page,tema,largura,nome); }
    await abrir(page,'leads/novo/');
    await page.getByRole('button',{name:/Colar.*mensagem/i}).click();
    await page.locator('textarea').first().fill('Nome: Ana Exemplo\nWhatsApp: (11) 99999-0010\nEmpreendimento: Residencial Exemplo\nQuero conhecer o apartamento.');
    await capturar(page,tema,largura,'colar-mensagem');
    await page.locator('textarea').first().fill('Quero conhecer o apartamento.');
    await capturar(page,tema,largura,'colar-incompleta');
    await abrir(page,'leads/ficha/?id=lead-1');
    await page.getByRole('button',{name:/WhatsApp de Ana Exemplo/}).first().click();
    await page.locator('dialog[open] #mensagem-texto').fill('Olá, Ana. Vamos combinar a visita?');
    await capturar(page,tema,largura,'dialogo-mensagem');
    await abrir(page,'conta/');
    await page.locator('#aparencia').focus();
    await capturar(page,tema,largura,'aparencia-foco');
    const foco=await page.locator('#aparencia').evaluate(el=>{const s=getComputedStyle(el);return {largura:s.outlineWidth,estilo:s.outlineStyle};});
    assert.deepEqual(foco,{largura:'2px',estilo:'solid'});
    if(largura===375) {await page.getByRole('button',{name:'Menu',exact:true}).click();await capturar(page,tema,largura,'menu');}
    await abrir(page,'painel/?c=corretor-1');
    await page.emulateMedia({media:'print'});
    const impressao=await page.evaluate(()=>({fundo:getComputedStyle(document.body).backgroundColor,cor:getComputedStyle(document.body).color,esquema:getComputedStyle(document.documentElement).colorScheme}));
    assert.deepEqual(impressao,{fundo:'rgb(255, 255, 255)',cor:'rgb(0, 0, 0)',esquema:'light'});
    await page.screenshot({path:resolve(destino,tema,`impressao-${largura}.jpg`),fullPage:true,type:'jpeg',quality:80});
    if(largura===1440) await page.pdf({path:resolve(destino,tema,'relatorio.pdf'),format:'A4',printBackground:true});
    await context.close();
    console.log(`${tema}, ${largura}px: ${telas.length} telas/estados + colagem, diálogo, foco, menu móvel e impressão.`);
  }

  writeFileSync(resolve(destino,'auditoria.json'),JSON.stringify({contrastes:resultados,capturas,erros},null,2)+'\n');
  // Preferência explícita, sistema em tempo real, recarga, navegação e outra aba.
  const context=await browser.newContext({colorScheme:'dark'});
  const page=await context.newPage();
  page.on('pageerror',e=>erros.push(e.message));
  await abrir(page,'conta/');
  assert.equal(await page.locator('html').getAttribute('data-tema'),'escuro');
  await page.locator('#aparencia').selectOption('claro');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),chave),'claro');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('html').getAttribute('data-tema'),'claro');
  await page.waitForFunction(()=>document.querySelector('#aparencia')?.value==='claro');
  assert.equal(await page.locator('#aparencia').inputValue(),'claro');
  await page.getByRole('link',{name:'Lista do dia',exact:true}).click();
  assert.equal(await page.locator('html').getAttribute('data-tema'),'claro');
  await abrir(page,'conta/');
  const outra=await context.newPage();await abrir(outra,'conta/');
  await page.locator('#aparencia').selectOption('escuro');
  await outra.waitForFunction(()=>document.documentElement.dataset.tema==='escuro');
  assert.equal(await outra.locator('#aparencia').inputValue(),'escuro');
  await page.emulateMedia({colorScheme:'light'});
  assert.equal(await page.locator('html').getAttribute('data-tema'),'escuro');
  await page.locator('#aparencia').selectOption('automatico');
  assert.equal(await page.locator('html').getAttribute('data-tema'),'claro');
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(()=>document.documentElement.dataset.tema==='escuro');
  await context.close();

  // O tema já está correto com todos os bundles de hidratação bloqueados.
  for(const [sistema,escolha,esperado] of [['light','escuro','escuro'],['dark','claro','claro'],['dark','invalido','escuro']]) {
    const ctx=await browser.newContext({colorScheme:sistema});
    await ctx.addInitScript(({chave,escolha})=>localStorage.setItem(chave,escolha),{chave,escolha});
    await ctx.route('**/*.js',route=>route.abort());
    const p=await ctx.newPage();await p.goto(base,{waitUntil:'load'});
    assert.equal(await p.locator('html').getAttribute('data-tema'),esperado);
    assert.equal(await p.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),esperado==='escuro'?'rgb(21, 22, 25)':'rgb(247, 246, 242)');
    assert.equal(await p.locator('meta[name="theme-color"]').getAttribute('content'),esperado==='escuro'?'#151619':'#f7f6f2');
    await ctx.close();
  }
  const bloqueado=await browser.newContext({colorScheme:'dark'});
  await bloqueado.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Bloqueado','SecurityError');}}));
  const p=await bloqueado.newPage();p.on('pageerror',e=>erros.push(e.message));await abrir(p,'conta/');
  assert.equal(await p.locator('html').getAttribute('data-tema'),'escuro');
  await p.locator('#aparencia').selectOption('claro');
  assert.equal(await p.locator('html').getAttribute('data-tema'),'claro');
  await bloqueado.close();
  const semJs=await browser.newContext({javaScriptEnabled:false,colorScheme:'dark'});
  const semJsPage=await semJs.newPage();await semJsPage.goto(base);
  assert.equal(await semJsPage.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(21, 22, 25)');
  await semJsPage.emulateMedia({media:'print'});
  assert.equal(await semJsPage.locator('html').evaluate(el=>getComputedStyle(el).colorScheme),'light');
  await semJs.close();
  const resumo={data:'2026-10-30',viewports:[375,1440],contrastes:resultados,capturas,erros:[...new Set(erros)],comportamentos:'Automático, preferência explícita, recarga, navegação, outra aba, sem hidratação, armazenamento bloqueado, valor inválido, sem JS e impressão clara: aprovados.'};
  writeFileSync(resolve(destino,'auditoria.json'),JSON.stringify(resumo,null,2)+'\n');
  assert.deepEqual(resumo.erros,[]);
  assert.deepEqual(capturas.filter(c=>c.conteudo>c.largura).map(c=>c.arquivo),[],'Página ultrapassa o viewport');
  assert.deepEqual(capturas.filter(c=>c.falhas.length).map(c=>({arquivo:c.arquivo,falhas:c.falhas})),[],'Contraste do texto renderizado');
  console.log(`${capturas.length} capturas de tela aprovadas; relatório salvo em ${destino}.`);
  }
} finally {await browser.close();}
