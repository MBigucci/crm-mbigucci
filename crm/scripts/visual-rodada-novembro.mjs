import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

export async function revisar({browser, abrir, capturar, destino, telas, capturas, erros, resultados}) {
  const cenarios = [
    ...telas.filter(([nome]) => !nome.endsWith('-geral')),
    ['sem-telefone','leads/ficha/?id=sem-telefone'],
    ['inicio-gerente','?qa=gerente'], ['inicio-geral','?qa=geral'],
    ['parceiros','parceiros/'], ['parceiro','parceiros/ficha/?id=par-1'],
    ['parceiro-novo','parceiros/novo/'], ['parceiro-evento','parceiros/evento/'],
    ['recepcao','recepcao/?qa=geral'], ['stands','recepcao/stands/?qa=geral'],
    ['relatorio-stand','recepcao/relatorio/?qa=geral'],
    ['anuncie','recepcao/?qa=geral&estado=anuncie'],
    ['aviso','recepcao/?qa=geral&estado=aviso'],
    ['avisos','conta/?qa=gerente&estado=avisos'],
    ['cadastro-publico','parceiro-qa.html'],
    ['plantao-geral','plantao/?qa=geral'],
  ];
  for (const tema of ['claro','escuro']) for (const largura of [375,1440]) {
    mkdirSync(join(destino,tema),{recursive:true});
    // A evidência gerada é local mesmo nas máquinas sem exclusão global de imagens.
    writeFileSync(join(destino,'.gitignore'),'*\n');
    const ctx = await browser.newContext({viewport:{width:largura,height:largura===375?812:900},colorScheme:tema==='claro'?'light':'dark',locale:'pt-BR',timezoneId:'America/Sao_Paulo',serviceWorkers:'block'});
    // Mesmo export estático que --serve. O Chrome isolado não alcança o loopback.
    const raiz=resolve('.visual-preview/out');
    const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.json':'application/json','.png':'image/png'};
    await ctx.route('**/*', async r => {
      const url=new URL(r.request().url());
      if (url.origin!=='http://127.0.0.1:4173' || !url.pathname.startsWith('/vendas/') || r.request().method()!=='GET') return r.abort();
      const caminho=resolve(raiz,decodeURIComponent(url.pathname.slice('/vendas/'.length)) || '.',url.pathname.endsWith('/')?'index.html':'');
      if (!caminho.startsWith(raiz+sep)) return r.abort();
      try {await r.fulfill({path:caminho,contentType:mime[extname(caminho)]});}
      catch {await r.fulfill({status:404,body:''});}
    });
    await ctx.addInitScript(()=>localStorage.setItem('mbigucci-recepcao-stand','stand-qa'));
    const page=await ctx.newPage();
    await page.clock.setFixedTime(new Date('2026-11-05T12:00:00-03:00'));
    page.setDefaultTimeout(5000);
    let atual;
    page.on('pageerror',e=>erros.push({tema,largura,atual,mensagem:e.message}));
    async function foto(nome) {
      await capturar(page,tema,largura,nome);
      const registro=capturas.at(-1);
      registro.rota=atual;
      registro.texto=await page.locator('body').innerText();
      registro.secoes=await page.locator('h1,h2,h3,h4').evaluateAll(els=>els.filter(e=>e.checkVisibility()).map(e=>({titulo:e.innerText,y:Math.round(e.getBoundingClientRect().top+scrollY)})));
      if(nome==='cadastro-publico') registro.placeholders=await page.locator('input[placeholder]').evaluateAll(els=>els.filter(e=>e.checkVisibility()).map(e=>({texto:e.placeholder,cor:getComputedStyle(e,'::placeholder').color,fundo:getComputedStyle(e).backgroundColor})));
    }
    const botao = nome => page.getByRole('button',{name:nome}).first().click();
    for (const [nome,rota] of cenarios) {
      atual=rota;
      try {
        if(nome==='cadastro-publico') await page.goto('http://127.0.0.1:4173/vendas/'+rota);
        else await abrir(page,rota);
        if(nome==='aviso' && largura===375) await botao('+ Cliente');
        await foto(nome);
        if(nome==='recepcao' && largura===375) {
          await page.getByRole('tab',{name:/Clientes/}).click();
          await foto('clientes-hoje');
          await botao('+ Cliente'); await foto('registrar-cliente');
        }
        if(nome==='ficha') {await botao(/Sem resposta/); await foto('tentativa');}
        if(nome==='agenda') {
          await botao(/Agendar visita/); await foto('agenda-escolha');
          await botao(/Ana Exemplo/); await foto('agenda-agendar');
        }
        if(nome==='usuarios') {await botao('Editar'); await foto('usuario-editar');}
        if(nome==='inicio-geral' && largura===375) {
          await botao('Menu');await foto('menu');
          await page.mouse.move(185,670);
          await page.mouse.wheel(0,1300);
          await page.waitForTimeout(300);
          capturas.at(-1).menuAposRolar=await page.getByRole('button',{name:'Sair'}).boundingBox();
        }
        if(nome==='recepcao' && largura===1440) {
          await page.setViewportSize({width:900,height:900}); await page.waitForTimeout(100);
          await capturar(page,tema,900,'recepcao-limiar');
          await page.setViewportSize({width:1440,height:900});
        }
        if(nome==='relatorio-stand') {
          await page.emulateMedia({media:'print'}); await foto('impressao-stand');
          if(largura===1440) await page.pdf({path:join(destino,tema,'stand.pdf'),format:'A4',printBackground:true});
          await page.emulateMedia({media:'screen'});
        }
      } catch(e) {erros.push({nome,tema,largura,mensagem:e.message});}
    }
    await ctx.close();
    writeFileSync(join(destino,'auditoria.json'),JSON.stringify({resultados,capturas,erros},null,2));
    console.log(tema,largura,capturas.length,erros.length);
  }
  if(erros.length) throw Error('Capturas incompletas. Consulte auditoria.json.');
}
