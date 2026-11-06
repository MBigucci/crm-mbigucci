// Capturas da distribuição automática na prévia isolada (dados fictícios).
// Antes: node scripts/visual-preview.mjs e o build dentro de .visual-preview.
// Usa Playwright fora do app (PLAYWRIGHT_MODULE) e um Chrome já instalado (CHROME_PATH),
// headless, com perfil temporário. Não abre janela nem servidor: o export é servido
// por interceptação, como em visual-rodada-novembro.mjs.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const raiz = resolve('.visual-preview/out');
const destino = resolve('..', 'docs/revisao-visual/distribuicao');
const base = 'http://127.0.0.1:4173/vendas/';
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};

// [nome, rota, ação depois de abrir]
const cenarios = [
  ['lista-do-dia', ''],
  ['folha-fila', '', async p => p.getByRole('button', {name: /Ver a fila de leads/}).click()],
  ['folha-opcoes', '', async p => p.getByRole('button', {name: '✓ Recebendo'}).click()],
  ['fila-corretor', 'fila/'],
  ['como-calculado', 'fila/como/'],
  ['fila-gerente', 'fila/?qa=gerente'],
  ['fila-gerente-menu', 'fila/?qa=gerente', async p => p.getByRole('button', {name: 'Opções de Diego'}).locator('visible=true').first().click()],
  ['fila-geral', 'fila/?qa=geral'],
  ['distribuicao', 'distribuicao/'],
  ['distribuicao-avancadas', 'distribuicao/', async p => { await p.getByText(/Avançadas/).click(); await p.getByRole('button', {name: 'Sinal de localização', exact: false}).first().click(); }],
  ['produtos-corretor', 'equipes/corretor/?id=corretor-2&qa=gerente'],
  ['stands', 'recepcao/stands/?qa=geral'],
];

const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_PATH});
const relatorio = [], erros = [];
try {
  mkdirSync(destino, {recursive: true});
  // Capturas ficam fora do Git (regra do projeto).
  writeFileSync(join(destino, '.gitignore'), '*\n');
  for (const tema of ['claro', 'escuro']) for (const largura of [375, 1366]) {
    mkdirSync(join(destino, tema), {recursive: true});
    const ctx = await browser.newContext({viewport: {width: largura, height: largura === 375 ? 812 : 900}, colorScheme: tema === 'claro' ? 'light' : 'dark', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block'});
    await ctx.route('**/*', async r => {
      const url = new URL(r.request().url());
      if (url.origin !== 'http://127.0.0.1:4173' || !url.pathname.startsWith('/vendas/') || r.request().method() !== 'GET') return r.abort();
      const caminho = resolve(raiz, decodeURIComponent(url.pathname.slice('/vendas/'.length)) || '.', url.pathname.endsWith('/') ? 'index.html' : '');
      if (!caminho.startsWith(raiz + sep) && caminho !== raiz) return r.abort();
      try { await r.fulfill({path: caminho, contentType: mime[extname(caminho)]}); }
      catch { await r.fulfill({status: 404, body: ''}); }
    });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date('2026-11-06T12:00:00-03:00'));
    page.setDefaultTimeout(5000);
    let atual;
    page.on('pageerror', e => erros.push({tema, largura, atual, mensagem: e.message}));
    for (const [nome, rota, acao] of cenarios) {
      atual = nome;
      try {
        await page.goto(base + rota, {waitUntil: 'domcontentloaded'});
        await page.locator('main').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => !document.querySelector('main')?.textContent.includes('Carregando…'));
        await page.waitForTimeout(250);
        if (acao) { await acao(page); await page.waitForTimeout(250); }
        const medida = await page.evaluate(() => ({
          rolagemLateral: document.documentElement.scrollWidth > window.innerWidth,
          largura: document.documentElement.scrollWidth,
          cabecalho: Math.round(document.querySelector('header')?.getBoundingClientRect().height ?? 0),
          botaoNoCabecalho: !!document.querySelector('header button[aria-haspopup="dialog"]'),
          folha: document.querySelector('[role="dialog"] h2')?.textContent ?? null,
        }));
        const arquivo = join(destino, tema, `${nome}-${largura}.png`);
        await page.screenshot({path: arquivo, fullPage: !acao});
        relatorio.push({tema, largura, nome, ...medida});
      } catch (e) { erros.push({tema, largura, nome, mensagem: e.message.split('\n')[0]}); }
    }
    await ctx.close();
  }
} finally { await browser.close(); }
writeFileSync(join(destino, 'auditoria.json'), JSON.stringify({relatorio, erros}, null, 2));
for (const r of relatorio) console.log(`${r.tema} ${r.largura} ${r.nome}: cabeçalho ${r.cabecalho}px, botão ${r.botaoNoCabecalho ? 'sim' : 'não'}${r.rolagemLateral ? `, ROLAGEM LATERAL (${r.largura}px)` : ''}${r.folha ? `, folha "${r.folha}"` : ''}`);
if (erros.length) { console.log(JSON.stringify(erros, null, 2)); process.exitCode = 1; }
