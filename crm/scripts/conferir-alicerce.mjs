// Conferência do Alicerce no Vendas (item 48, brief docs/codex-alicerce-vendas.md, "Pronto quando").
// Roda na prévia isolada com dados fictícios, nunca no app real:
//   node scripts/visual-preview.mjs && (cd .visual-preview && npx next build)
//   node scripts/visual-preview.mjs --serve                         (porta 4173, em /vendas/)
//   chrome --headless=new --remote-debugging-port=9555 --user-data-dir=crm/local/perfil-alicerce
//   node scripts/conferir-alicerce.mjs [pastaDosPrints]              (padrão: local/alicerce)
// Confere:
// - a migração da escolha antiga;
// - o Automático seguindo o aparelho;
// - o menu recolhido antes da primeira pintura;
// - as fontes no build com /vendas;
// - o .mb-icone em texto e em botão;
// - a Aparência;
// - em 375 e 1280 nos temas papel e grafite: sem rolagem lateral, alvos de 44px no celular e erros no console.
// Os prints vão para crm/local/ (fora do Git).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const saida = process.argv[2] ?? "local/alicerce";
const base = "http://127.0.0.1:4173/vendas";
mkdirSync(saida, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const alvo = await (await fetch("http://127.0.0.1:9555/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pend = new Map();
const erros = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") erros.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") erros.push(d.params.args.map((a) => a.value ?? a.description).join(" "));
};
const cdp = (method, params = {}) => new Promise((r) => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const avaliar = async (expr) => {
  const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return { erro: r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text };
  return r.result?.result?.value;
};
await cdp("Page.enable");
await cdp("Runtime.enable");

const tela = (w, h) => cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
const esquemaAparelho = (valor) => cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: valor }] });
async function abrir(caminho) {
  await cdp("Page.navigate", { url: base + caminho });
  await espera(1800);
}
/** Grava o localStorage da origem e recarrega (o script do <head> lê na carga). */
async function comArmazenamento(valores, caminho = "/") {
  await abrir(caminho);
  await avaliar(`localStorage.clear(); ${Object.entries(valores).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join("")} true`);
  await abrir(caminho);
}
const html = () => avaliar(`(() => { const r = document.documentElement; return { theme: r.dataset.theme, escolha: r.getAttribute('data-tema-escolha'), tema: r.dataset.tema, barra: r.dataset.barra, recolhido: r.getAttribute('data-menu-recolhido'), menu: r.dataset.menu, acao: r.dataset.acao, ls: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])) }; })()`);
async function print(nome) {
  const s = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(saida, nome + ".png"), Buffer.from(s.result.data, "base64"));
}

const resultado = {};
const confere = (nome, ok, detalhe) => { resultado[nome] = { ok: !!ok, detalhe }; console.log(`${ok ? "OK   " : "FALHA"} ${nome}${detalhe ? "  " + JSON.stringify(detalhe) : ""}`); };

// 1. Migração da escolha antiga (três casos de tema e a barra).
await tela(1280, 800);
await esquemaAparelho("light");
for (const [antigo, esperado] of [["automatico", "auto"], ["claro", "papel"], ["escuro", "grafite"]]) {
  await comArmazenamento({ "mbigucci-crm-aparencia": antigo, "mbigucci-crm-barra": "recolhida" });
  const h = await html();
  const tema = esperado === "auto" ? "papel" : esperado;
  confere(`migra ${antigo}`, h.ls.mb_tema === esperado && h.escolha === esperado && h.theme === tema && h.tema === (tema === "grafite" ? "escuro" : "claro") && !("mbigucci-crm-aparencia" in h.ls), h);
  confere(`migra barra recolhida (${antigo})`, h.ls.mb_menu_recolhido === "sim" && h.recolhido === "sim" && h.barra === "recolhida" && !("mbigucci-crm-barra" in h.ls), { recolhido: h.recolhido, barra: h.barra });
}
await comArmazenamento({});
{
  const h = await html();
  confere("sem escolha: padrão do Vendas", h.theme === "papel" && h.escolha === "auto" && h.menu === "claro" && h.acao === "grafite" && h.barra === "aberta", h);
}

// 2. Automático segue o aparelho, inclusive com a tela aberta.
await esquemaAparelho("dark");
await espera(400);
{
  const h = await html();
  confere("automático: aparelho escuro vira grafite sem recarregar", h.theme === "grafite" && h.tema === "escuro", h);
}
await esquemaAparelho("light");
await espera(400);
confere("automático: aparelho claro volta ao papel", (await html()).theme === "papel");

// 3. Menu recolhido já na primeira pintura (o atributo existe antes do <body>).
await comArmazenamento({ mb_menu_recolhido: "sim" });
await cdp("Page.addScriptToEvaluateOnNewDocument", { source: "document.addEventListener('readystatechange', () => { if (document.readyState === 'interactive' && !window.__barraNaCarga) window.__barraNaCarga = document.documentElement.dataset.barra; });" });
await abrir("/");
{
  const r = await avaliar(`({ naCarga: window.__barraNaCarga, largura: Math.round(document.querySelector('.barra-lateral')?.getBoundingClientRect().width ?? -1) })`);
  confere("menu recolhido antes da primeira pintura", r.naCarga === "recolhida" && r.largura === 64, r);
}

// 4. Fontes do Alicerce no build com /vendas.
await comArmazenamento({});
{
  const r = await avaliar(`(async () => { await document.fonts.ready; const f = [...document.fonts].map(x => x.family.replace(/"/g, '') + ':' + x.status); const urls = performance.getEntriesByType('resource').filter(e => /woff2/.test(e.name)).map(e => e.name.replace(location.origin, '')); return { f, urls }; })()`);
  const carregadas = new Set(r.f.filter((x) => x.endsWith(":loaded")).map((x) => x.split(":")[0]));
  confere("fontes Inter e Bricolage carregadas de /vendas/_next", carregadas.has("Inter") && carregadas.has("Bricolage Grotesque") && r.urls.every((u) => u.startsWith("/vendas/_next/static/media/")), r);
}

// 5. .mb-icone em texto corrido e em botão, com a base do Tailwind.
{
  const r = await avaliar(`(() => {
    const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:600px;background:var(--superficie);padding:16px;z-index:99';
    const svg = '<svg class="mb-icone" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l6 6-6 6"/></svg>';
    d.innerHTML = '<p id="t-p" style="margin:0">Texto com <a href="#" class="mb-link">um link ' + svg + '</a> no meio.</p><button id="t-b" class="mb-botao mb-botao--primario" type="button">' + svg + 'Salvar</button>';
    document.body.appendChild(d);
    const p = document.getElementById('t-p'), b = document.getElementById('t-b');
    const lh = parseFloat(getComputedStyle(p).lineHeight) || 22;
    const ip = p.querySelector('svg'), ib = b.querySelector('svg');
    const rb = b.getBoundingClientRect(), rib = ib.getBoundingClientRect();
    const out = { displayTexto: getComputedStyle(ip).display, linhasP: Math.round(p.getBoundingClientRect().height / lh), centroBotao: Math.round((rib.top + rib.height / 2) - (rb.top + rb.height / 2)) };
    return out;
  })()`);
  await print("icone-em-texto-e-botao");
  confere(".mb-icone: inline no texto (uma linha) e centrado no botão", r.displayTexto === "inline" && r.linhasP === 1 && Math.abs(r.centroBotao) <= 1, r);
}

// 6. Aparência em Minha conta: troca na hora e Voltar ao padrão.
await comArmazenamento({}, "/conta/");
{
  const clicar = (grupo, valor) => avaliar(`document.querySelector('[data-mb-preferencia="${grupo}"] button[value="${valor}"]').click()`);
  await clicar("tema", "grafite"); await espera(300);
  const a = await html();
  const pressionado = await avaliar(`document.querySelector('[data-mb-preferencia="tema"] button[value="grafite"]').getAttribute('aria-pressed')`);
  await clicar("acao", "marca"); await clicar("menu", "escuro"); await espera(300);
  const b = await html();
  await avaliar(`document.querySelector('[data-mb-padrao]').click()`); await espera(300);
  const c = await html();
  confere("Aparência: Grafite aplica e marca", a.theme === "grafite" && a.ls.mb_tema === "grafite" && pressionado === "true", { a, pressionado });
  confere("Aparência: Vermelho e menu Grafite", b.acao === "marca" && b.menu === "escuro", { acao: b.acao, menu: b.menu });
  confere("Aparência: Voltar ao padrão", c.escolha === "auto" && c.acao === "grafite" && c.menu === "claro" && !c.ls.mb_tema, c);
}

// 6b. A folha antiga vai para o <body> por portal: precisa levar a ponte .ds-antigo junto.
await tela(375, 812);
await comArmazenamento({ mb_tema: "papel" }, "/");
{
  await avaliar(`[...document.querySelectorAll('button')].find(b => /Recebendo/.test(b.textContent))?.click()`);
  await espera(500);
  const r = await avaliar(`(() => { const d = document.querySelector('[role=dialog]'); if (!d) return { aberta: false }; const links = [...d.querySelectorAll('a:not(.mb-link)')]; return { aberta: true, naPonte: !!d.closest('.ds-antigo'), linksAzuis: links.filter(a => getComputedStyle(a).color === getComputedStyle(document.documentElement).getPropertyValue('--link').trim()).length, links: links.length }; })()`);
  await print("folha-375-papel");
  confere("folha antiga (portal) dentro da ponte .ds-antigo", r.aberta && r.naPonte, r);
}

// 7. Telas em 375 e 1280, papel e grafite.
// As telas ainda no DS antigo entram para ver se a ponte segura o visual delas (links, tema, fontes).
const TELAS = [["lista-do-dia", "/"], ["minha-conta", "/conta/"], ["leads", "/leads/"], ["ficha", "/leads/ficha/?id=lead-1"], ["painel", "/painel/"]];
for (const [nome, caminho] of TELAS) {
  for (const [w, h] of [[375, 812], [1280, 800]]) {
    for (const tema of ["papel", "grafite"]) {
      erros.length = 0;
      await tela(w, h);
      await comArmazenamento({ mb_tema: tema }, caminho);
      const m = await avaliar(`(() => {
        const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
        const pequenos = ${w < 768} ? [...document.querySelectorAll('.mb-aparencia button, .mb-cartao button')].filter(vis).filter(e => e.getBoundingClientRect().height < 44).map(e => e.textContent.trim()) : [];
        return { rolagemLateral: document.documentElement.scrollWidth > document.documentElement.clientWidth, theme: document.documentElement.dataset.theme, pequenos };
      })()`);
      await print(`${nome}-${w}-${tema}`);
      confere(`${nome} ${w} ${tema}`, !m.rolagemLateral && m.theme === tema && m.pequenos.length === 0 && erros.length === 0, { ...m, erros: [...erros] });
    }
  }
}

writeFileSync(join(saida, "resultado.json"), JSON.stringify(resultado, null, 2));
const falhas = Object.values(resultado).filter((r) => !r.ok).length;
console.log(`\n${Object.keys(resultado).length} conferências, ${falhas} falhas. Prints em ${saida}`);
ws.close();
process.exitCode = falhas ? 1 : 0;
