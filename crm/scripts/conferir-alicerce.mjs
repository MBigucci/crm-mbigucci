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
// - em 375 e 1280 nos temas papel e grafite: sem rolagem lateral, alvos de 44px no celular e erros no console;
// - a moldura do passo b (menu lateral, topo, menu do celular, Módulos e Configurações), como corretor e como
//   gerente geral (?qa=geral na prévia): o HTML bate com o Alicerce, Módulos só para o gerente geral, a conta
//   só no topo (no fim da folha no celular), sem sino e sem busca, alvos de 44px e foco visível.
// - a Lista do dia do passo c, como corretor (fixtures de scripts/visual-fixtures.ts): o HTML bate com os previews
//   ListaDoDia, CardLead, ResumoDePendencias, Compromisso e Meta, um só destaque, o card inteiro abre a ficha
//   (sem Abrir e sem ⋯), a faixa Registrar · WhatsApp → (Detalhar no grupo Detalhe o contato, sem WhatsApp para
//   quem não tem telefone), o PainelLateral de Registrar (foco, Esc, portal no body), sem + Novo lead na página
//   nem rodapé fixo, alvos de 44px e foco visível.
// Com --moldura roda só a moldura (e tira os prints dela):  node scripts/conferir-alicerce.mjs local/alicerce/passo-b --moldura
// Com --lista roda só a Lista do dia (e tira os prints dela): node scripts/conferir-alicerce.mjs local/alicerce/passo-c --lista
// - as mensagens do passo d (Toast com Desfazer, AvisoConexao, os estados da conta, sem permissão, 404 e error.tsx):
//   o HTML bate com os previews Toast, AvisoConexao e EstadosDePagina, o Desfazer chama a mesma função uma vez
//   (e o fim do aviso só limpa quando acaba o tempo ou toca no X), um toast por vez, nada técnico na tela,
//   sem rolagem lateral, alvos de 44px e foco visível.
// As páginas /qa-desfazer/ e /qa-quebrar/ e o ?qa=desativado e o ?qa=erro vêm do visual-preview.mjs (só na cópia local).
// Com --mensagens roda só as mensagens: node scripts/conferir-alicerce.mjs local/alicerce/passo-d --mensagens
// - Leads, Agenda e Fila de leads do passo e: veja o bloco "9b" (--leads): node scripts/conferir-alicerce.mjs local/alicerce/passo-e --leads
// Os prints vão para crm/local/ (fora do Git).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argumentos = process.argv.slice(2);
const soMoldura = argumentos.includes("--moldura");
const soLista = argumentos.includes("--lista");
const soMensagens = argumentos.includes("--mensagens");
const soLeads = argumentos.includes("--leads");

const saida = argumentos.find((a) => !a.startsWith("--")) ?? "local/alicerce";
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
const html = () => avaliar(`(() => { const r = document.documentElement; return { theme: r.dataset.theme, escolha: r.getAttribute('data-tema-escolha'), tema: r.dataset.tema, recolhido: r.getAttribute('data-menu-recolhido'), menu: r.dataset.menu, acao: r.dataset.acao, ls: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])) }; })()`);
async function print(nome) {
  const s = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(saida, nome + ".png"), Buffer.from(s.result.data, "base64"));
}

const resultado = {};
const confere = (nome, ok, detalhe) => { resultado[nome] = { ok: !!ok, detalhe }; console.log(`${ok ? "OK   " : "FALHA"} ${nome}${detalhe ? "  " + JSON.stringify(detalhe) : ""}`); };

if (!soMoldura && !soLista && !soMensagens && !soLeads) {
// 1. Migração da escolha antiga (três casos de tema e a barra).
await tela(1280, 800);
await esquemaAparelho("light");
for (const [antigo, esperado] of [["automatico", "auto"], ["claro", "papel"], ["escuro", "grafite"]]) {
  await comArmazenamento({ "mbigucci-crm-aparencia": antigo, "mbigucci-crm-barra": "recolhida" });
  const h = await html();
  const tema = esperado === "auto" ? "papel" : esperado;
  confere(`migra ${antigo}`, h.ls.mb_tema === esperado && h.escolha === esperado && h.theme === tema && h.tema === (tema === "grafite" ? "escuro" : "claro") && !("mbigucci-crm-aparencia" in h.ls), h);
  confere(`migra barra recolhida (${antigo})`, h.ls.mb_menu_recolhido === "sim" && h.recolhido === "sim" && !("mbigucci-crm-barra" in h.ls), { recolhido: h.recolhido });
}
await comArmazenamento({});
{
  const h = await html();
  confere("sem escolha: padrão do Vendas", h.theme === "papel" && h.escolha === "auto" && h.menu === "claro" && h.acao === "grafite" && h.recolhido !== "sim", h);
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
await cdp("Page.addScriptToEvaluateOnNewDocument", { source: "document.addEventListener('readystatechange', () => { if (document.readyState === 'interactive' && !window.__barraNaCarga) window.__barraNaCarga = document.documentElement.getAttribute('data-menu-recolhido'); });" });
await abrir("/");
{
  const r = await avaliar(`({ naCarga: window.__barraNaCarga, largura: Math.round(document.querySelector('.mb-menu')?.getBoundingClientRect().width ?? -1) })`);
  confere("menu recolhido antes da primeira pintura", r.naCarga === "sim" && r.largura === 64, r);
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
  const r = await avaliar(`(() => { const d = document.querySelector('[role=dialog]:not(.mb-folha)'); if (!d) return { aberta: false }; const links = [...d.querySelectorAll('a:not(.mb-link)')]; return { aberta: true, naPonte: !!d.closest('.ds-antigo'), linksAzuis: links.filter(a => getComputedStyle(a).color === getComputedStyle(document.documentElement).getPropertyValue('--link').trim()).length, links: links.length }; })()`);
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

} // fim das seções 1 a 7 (puladas com --moldura)

// 8. A moldura do passo b: menu lateral, topo, menu do celular, Módulos e Configurações, como corretor e como
// gerente geral. As funções medirNaPagina, paridadeNaPagina e seletoresDeModulos rodam dentro da página (vão por toString).
await cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
const teclar = async (key, code, vk) => { for (const type of ["keyDown", "keyUp"]) await cdp("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk }); };
const passarMouse = (x, y) => cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });

function medirNaPagina() {
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
  const q = (s) => document.querySelector(s);
  const qs = (s) => [...document.querySelectorAll(s)];
  // O alvo de toque conta a área que o ::before ou o ::after estende (o Alicerce faz isso na faixa de status).
  const altura = (e) => { const r = e.getBoundingClientRect(); const ext = ["::before", "::after"].map((p) => { const a = getComputedStyle(e, p); return a.position === "absolute" && a.content !== "none" ? parseFloat(a.height) || 0 : 0; }); return Math.max(r.height, ...ext); };
  const rotulo = (e) => (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
  const interativos = (raiz) => qs(raiz + " a[href], " + raiz + " button").filter(vis);
  const pequenos = (raiz) => interativos(raiz).filter((e) => altura(e) < 43.5).map((e) => rotulo(e) + " " + Math.round(altura(e)));
  const menu = q(".mb-menu");
  return {
    rolagemLateral: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    theme: document.documentElement.dataset.theme,
    menuVisivel: vis(menu),
    menuLargura: menu ? Math.round(menu.getBoundingClientRect().width) : 0,
    topoVisivel: vis(q(".mb-topo")),
    celularVisivel: vis(q(".mb-celular-topo")),
    faixaVisivel: vis(q(".mb-celular-status")),
    titulo: q(".mb-topo__titulo")?.textContent.trim() ?? null,
    contasNoTopo: qs(".mb-conta--topo").filter(vis).length,
    contaNoMenu: !!q('.mb-menu .mb-conta, .mb-menu a[href$="/conta/"]'),
    contaNaFolha: !!q('.mb-folha a[href$="/conta/"]'),
    modulosNoMenu: !!q(".mb-menu__modulos"),
    modulosNaFolha: qs(".mb-folha .mb-folha__rotulo-grupo").some((e) => e.textContent.trim() === "Módulos"),
    busca: !!q('input[type="search"], .mb-busca'),
    sino: !!q('[aria-label^="Notificações"]'),
    novoLead: qs('a.mb-botao--primario[href$="/leads/novo/"]').filter(vis).length,
    grupos: qs(".mb-menu__grupo").map((e) => e.textContent.trim()),
    itens: qs(".mb-menu__item .mb-menu__rotulo").map((e) => e.textContent.trim()),
    itemAtual: q('.mb-menu__item[aria-current="page"] .mb-menu__rotulo')?.textContent.trim() ?? null,
    status: q(".mb-status")?.textContent.trim().replace(/\s+/g, " ") ?? null,
    h1: qs("main h1").filter(vis).length,
    logo: (() => { const i = q(".mb-menu .mb-logo-mbigucci img"); return i ? { ok: i.complete && i.naturalWidth > 0, src: i.getAttribute("src") } : null; })(),
    pequenosTopo: pequenos(".mb-celular-topo").concat(pequenos(".mb-celular-status")),
    pequenosFolha: pequenos(".mb-folha"),
    pecasNaPonte: qs(".ds-antigo .mb-menu, .ds-antigo .mb-topo, .ds-antigo .mb-celular-topo, .ds-antigo .mb-folha, .ds-antigo .mb-ajustes, .ds-antigo .mb-popup, .ds-antigo .mb-status").length,
  };
}

function paridadeNaPagina() {
  const MBx = window.MB;
  const q = (s) => document.querySelector(s);
  const qs = (s) => [...document.querySelectorAll(s)];
  const marcaEsperada = (() => { const t = document.createElement("span"); t.innerHTML = MBx.marca.html("Vendas"); return t.innerHTML; })();
  const desenhos = new Set(Object.values(MBx.icones).map((d) => { const t = document.createElement("div"); t.innerHTML = "<svg>" + d + "</svg>"; return t.firstChild.innerHTML; }));
  const marcas = qs(".mb-menu .mb-marca, .mb-celular-topo .mb-marca, .mb-folha__topo .mb-marca");
  const icones = qs(".mb-menu svg.mb-icone, .mb-celular-topo svg.mb-icone, .mb-folha svg.mb-icone");
  const ruins = icones.filter((svg) => !(svg.getAttribute("class") === "mb-icone" && svg.getAttribute("viewBox") === "0 0 20 20" && svg.getAttribute("aria-hidden") === "true" && desenhos.has(svg.innerHTML)));
  // As mesmas classes e aria-* dos previews do Alicerce (MenuLateral, BarraSuperior, MenuDaConta, MenuCelular).
  const seletores = [
    'nav.mb-menu[aria-label="Menu principal"]', "a.mb-menu__marca", "p.mb-menu__grupo",
    'a.mb-menu__item[aria-current="page"] > svg.mb-icone + .mb-menu__rotulo',
    'a.mb-menu__item[target="_blank"][rel="noopener"] > .mb-menu__externo[aria-hidden="true"] + .mb-visualmente-oculto',
    ".mb-menu__rodape > button.mb-menu__item.mb-menu__recolher[aria-expanded]", ".mb-menu__mbigucci",
    "header.mb-topo > .mb-topo__titulo", "header.mb-topo > .mb-topo__acoes",
    '.mb-ancora > button.mb-conta.mb-conta--topo[aria-controls][aria-haspopup="menu"][aria-expanded] > .mb-avatar.mb-avatar--p[aria-hidden="true"]',
    ".mb-conta--topo > svg.mb-icone.mb-conta__seta",
    '.mb-ancora > .mb-popup.mb-popup--abaixo[role="menu"] > .mb-popup__conta > strong', ".mb-popup--abaixo > hr.mb-popup__divisor",
    '.mb-popup--abaixo > a.mb-popup__item[role="menuitem"]', '.mb-popup--abaixo > button.mb-popup__item[role="menuitem"]',
    "header.mb-celular-topo > a > .mb-marca > svg.mb-marca__lockup",
    'header.mb-celular-topo > button.mb-menu-icone[aria-controls="menu-folha"][aria-expanded] > .mb-menu-icone__barras[aria-hidden="true"] > span:nth-child(3)',
    '#menu-folha.mb-folha[role="dialog"][aria-modal="true"][aria-label="Menu"] > .mb-folha__topo > button.mb-menu-icone[aria-label="Fechar menu"]',
    '#menu-folha > nav[aria-label="Principal"] > a.mb-folha__item > svg.mb-icone', '#menu-folha > .mb-folha__grupo > a.mb-folha__item[target="_blank"][rel="noopener"]',
    "#menu-folha > .mb-folha__grupo > .mb-folha__conta", "#menu-folha > .mb-folha__mbigucci", "#menu-folha + .mb-folha__veu",
  ];
  const faltam = seletores.filter((s) => !q(s));
  return { marcas: marcas.length, marcasDiferentes: marcas.filter((m) => m.innerHTML !== marcaEsperada).length, marcasSemRole: marcas.filter((m) => m.getAttribute("role") !== "img" || m.getAttribute("aria-label") !== "Base360 · Vendas").length, icones: icones.length, iconesDiferentes: ruins.length, faltam };
}

function seletoresDeModulos() {
  const q = (s) => document.querySelector(s);
  const faltam = ['.mb-menu__rodape > .mb-ancora > button.mb-menu__item.mb-menu__modulos[aria-haspopup="menu"][aria-controls][aria-expanded]', '.mb-menu__rodape > .mb-ancora > .mb-popup.mb-popup--lado[role="menu"] > .mb-popup__grupo + a.mb-popup__item[role="menuitem"]'].filter((s) => !q(s));
  const botao = q(".mb-menu__modulos");
  const caixa = q(".mb-popup--lado");
  const rb = botao?.getBoundingClientRect(), rc = caixa?.getBoundingClientRect();
  const posicaoFixa = !!rb && !!rc && getComputedStyle(caixa).position === "fixed" && Math.abs(rc.left - (rb.right + 12)) <= 1 && Math.abs(rc.bottom - rb.bottom) <= 1;
  const porCima = !!rc && !!document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2)?.closest(".mb-popup--lado");
  return { posicaoFixa, porCima, faltam, ariaControlsBate: !!botao && !!caixa && botao.getAttribute("aria-controls") === caixa.id, aberto: !!caixa && !caixa.hidden && caixa.getClientRects().length > 0, itens: [...document.querySelectorAll(".mb-popup--lado .mb-popup__item")].map((e) => e.textContent.trim() + (e.getAttribute("aria-current") === "true" ? " (atual)" : "")), focoNoPrimeiro: document.activeElement === q(".mb-popup--lado .mb-popup__item") };
}

const anelDeFoco = () => avaliar(`(() => { const e = document.activeElement; if (!e || e === document.body) return null; const comAnel = (x) => { const c = getComputedStyle(x); return (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2) || (c.boxShadow && c.boxShadow !== 'none'); }; const pai = e.closest('.mb-item, .mb-lista__item, tr'); const anel = comAnel(e) || (!!pai && comAnel(pai)); return { ok: !!anel, quem: (e.getAttribute('aria-label') || e.textContent || e.className).trim().replace(/\\s+/g, ' ').slice(0, 30) }; })()`);
async function focoVisivel(passos) {
  await avaliar("document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); true");
  const sem = [];
  for (let i = 0; i < passos; i++) {
    await teclar("Tab", "Tab", 9);
    await espera(60);
    const r = await anelDeFoco();
    if (r && !r.ok) sem.push(r.quem);
  }
  return sem;
}
const caixaDe = (seletor) => avaliar(`(() => { const r = document.querySelector(${JSON.stringify(seletor)})?.getBoundingClientRect(); return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null; })()`);

// 9. A Lista do dia (passo c). A medição roda na página (vai por toString), como corretor, nos dois tamanhos e nos dois temas.
function medirListaNaPagina(largura) {
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
  const q = (s) => document.querySelector(s);
  const qs = (s) => [...document.querySelectorAll(s)];
  const altura = (e) => { const r = e.getBoundingClientRect(); const ext = ["::before", "::after"].map((p) => { const a = getComputedStyle(e, p); return a.position === "absolute" && a.content !== "none" ? parseFloat(a.height) || 0 : 0; }); return Math.max(r.height, ...ext); };
  const rotulo = (e) => (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
  const cards = qs("main .mb-item");
  const faixa = (c) => [...c.querySelectorAll(".mb-item__faixa > :is(a, button)")].map((b) => b.textContent.trim());
  const grupoDe = (c) => c.closest("section")?.id ?? "";
  const grupos = qs("main section[id^='grupo-']").map((sec) => ({ id: sec.id, titulo: sec.querySelector("h2")?.textContent.trim().replace(/\s+/g, " "), contagem: Number(sec.querySelector("h2 .mb-num")?.textContent), cards: sec.querySelectorAll(".mb-item").length }));
  const resumo = qs(".mb-resumo__item").map((a) => ({ href: a.getAttribute("href"), numero: Number(a.querySelector(".mb-resumo__numero")?.textContent), texto: a.querySelector(".mb-resumo__texto")?.textContent.trim() }));
  const interativos = qs("main a[href], main button").filter(vis);
  return {
    rolagemLateral: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    h1: qs("main h1").map((e) => e.textContent.trim()),
    cards: cards.length,
    destaques: qs("main .mb-item--destaque").length,
    destaqueEhOPrimeiro: cards.length > 0 && cards[0].classList.contains("mb-item--destaque"),
    cardsSemAlvo: cards.filter((c) => !c.querySelector(".mb-item__cabeca .mb-item__titulo.mb-item__alvo[href]")).length,
    abrirOuMais: cards.filter((c) => [...c.querySelectorAll("button, a")].some((b) => /^(abrir|mais|⋯|…)$/i.test(b.textContent.trim()) || b.getAttribute("aria-haspopup") === "menu")).length,
    maisDeDuasAcoes: cards.filter((c) => faixa(c).length > 2).length,
    grupos,
    resumo,
    resumoBate: resumo.length > 0 && resumo.every((r) => { const g = grupos.find((x) => "#" + x.id === r.href); return !!g && g.contagem === r.numero && g.cards === r.numero && !!r.texto && r.texto.endsWith("→"); }),
    faixas: cards.map((c) => ({ nome: c.querySelector(".mb-item__titulo")?.textContent.trim(), grupo: grupoDe(c), botoes: faixa(c) })),
    chips: qs(".mb-chip").map((e) => e.className),
    estruturaDoCard: cards.slice(0, 3).map((c) => ["cabeca", "id", "texto", "rodape", "faixa"].filter((n) => !c.querySelector(".mb-item__" + n))).flat(),
    cardAntigo: qs("main .card, main .bar-brand, main .veredito, main .selo-antigo, main .btn").filter((e) => !e.closest(".ds-antigo")).length,
    novoLeadNaPagina: qs("main a[href$='/leads/novo/']").filter((a) => !a.closest(".mb-vazio")).length,
    rodapeFixo: qs("main .fixed, .mb-app__conteudo .fixed").filter(vis).length,
    metas: qs(".lista-do-dia__metas .mb-meta").map((m) => ({ rotulo: m.querySelector(".mb-meta__rotulo")?.textContent.trim(), aria: m.querySelector(".mb-meta__trilho")?.getAttribute("aria-label"), barra: m.querySelector(".mb-meta__barra span")?.style.width, projecao: m.querySelector(".mb-meta__projecao")?.style.left ?? null })),
    pequenos: largura < 768 ? interativos.filter((e) => altura(e) < 43.5).map((e) => rotulo(e) + " " + Math.round(altura(e))) : [],
    painelNoBody: !!q("body > aside.mb-lateral"),
  };
}

async function abrirListaDoDia(w, h, tema) {
  erros.length = 0;
  await tela(w, h);
  await comArmazenamento({ mb_tema: tema }, "/");
  await espera(700);
}
async function printInteiro(nome) {
  const dim = await avaliar("({ w: document.documentElement.clientWidth, h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) })");
  const s = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: dim.w, height: dim.h, scale: 1 } });
  writeFileSync(join(saida, nome + ".png"), Buffer.from(s.result.data, "base64"));
}
async function printDe(nome, seletor) {
  const r = await avaliar(`(() => { const e = document.querySelector(${JSON.stringify(seletor)}); if (!e) return null; e.scrollIntoView({ block: "center" }); const b = e.getBoundingClientRect(); return { x: 0, y: Math.max(0, b.top + window.scrollY - 12), w: document.documentElement.clientWidth, h: b.height + 24 }; })()`);
  if (!r) return false;
  await espera(250);
  const s = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
  writeFileSync(join(saida, nome + ".png"), Buffer.from(s.result.data, "base64"));
  return true;
}

if (!soMoldura && !soMensagens && !soLeads) {
  for (const [w, h] of [[375, 812], [1280, 800]]) {
    for (const tema of ["papel", "grafite"]) {
      await abrirListaDoDia(w, h, tema);
      const m = await avaliar(`(${medirListaNaPagina.toString()})(${w})`);
      const semAnel = await focoVisivel(w < 768 ? 8 : 14);
      await avaliar("document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); true");
      await printInteiro(`lista-${w}-${tema}`);
      const semTelefone = m.faixas.find((f) => f.nome === "Rita Exemplo");
      const detalhar = m.faixas.filter((f) => f.grupo === "grupo-detalhar");
      const demais = m.faixas.filter((f) => f.grupo.startsWith("grupo-") && f.grupo !== "grupo-detalhar" && f.nome !== "Rita Exemplo");
      confere(`lista do dia ${w} ${tema}`,
        !m.rolagemLateral && m.h1.length === 1 && m.h1[0] === "Lista do dia" && m.cards > 0 && m.destaques === 1 && m.destaqueEhOPrimeiro
          && m.cardsSemAlvo === 0 && m.abrirOuMais === 0 && m.maisDeDuasAcoes === 0 && m.resumoBate && m.estruturaDoCard.length === 0
          && m.cardAntigo === 0 && m.novoLeadNaPagina === 0 && m.rodapeFixo === 0
          && !!semTelefone && semTelefone.botoes.join() === "Registrar"
          && detalhar.length > 0 && detalhar.every((f) => f.botoes.join() === "WhatsApp →,Detalhar")
          && demais.every((f) => f.botoes.join() === "Registrar,WhatsApp →")
          && m.chips.every((c) => /^mb-chip mb-chip--(alto|medio|baixo|sem)$/.test(c))
          && m.pequenos.length === 0 && semAnel.length === 0 && erros.length === 0,
        { ...m, semAnel, erros: [...erros] });
    }
  }

  // A visita (Compromisso), a visita aguardando baixa e o aniversário: o HTML bate com os previews e cada um sai no seu print.
  for (const [w, h] of [[375, 812], [1280, 800]]) {
    for (const tema of ["papel", "grafite"]) {
      await abrirListaDoDia(w, h, tema);
      const okV = await printDe(`lista-visitas-${w}-${tema}`, "#bloco-visitas-hoje");
      const okB = await printDe(`lista-visitas-baixa-${w}-${tema}`, "#bloco-visitas-baixa");
      const okA = await printDe(`lista-aniversarios-${w}-${tema}`, "section[aria-labelledby='aniversarios']");
      const c = await avaliar(`(() => { const q = (s) => document.querySelector(s); const sel = [
        "#bloco-visitas-hoje .mb-item > .mb-item__cabeca > .mb-item__id > a.mb-item__titulo.mb-item__alvo[href] + .mb-item__linha",
        "#bloco-visitas-hoje .mb-item > .mb-item__rodape > .mb-selo",
        "#bloco-visitas-hoje .mb-item > .mb-item__faixa > button.mb-botao.mb-botao--secundario",
        "#bloco-visitas-hoje .mb-item > .mb-item__faixa > button.mb-botao.mb-botao--whatsapp",
        "#bloco-visitas-baixa .mb-item > .mb-item__faixa > button.mb-botao.mb-botao--secundario",
        "section[aria-labelledby='aniversarios'] .mb-item > .mb-item__cabeca > .mb-item__id > a.mb-item__titulo.mb-item__alvo",
        ".lista-do-dia > .mb-resumo > .mb-resumo__titulo", ".mb-resumo > .mb-resumo__itens > a.mb-resumo__item > .mb-resumo__numero + .mb-resumo__texto", ".mb-resumo > p.mb-resumo__rodape > a[href='#bloco-visitas-hoje']",
        ".mb-meta > .mb-meta__rotulo + .mb-meta__valor + .mb-meta__trilho[role='img'] > .mb-meta__barra > span", ".mb-meta > .mb-meta__legenda > span",
      ]; return { faltam: sel.filter((s) => !q(s)), selosDasVisitas: [...document.querySelectorAll("#bloco-visitas-hoje .mb-selo, #bloco-visitas-baixa .mb-selo")].map((e) => e.className + ": " + e.textContent.trim()), baixa: [...document.querySelectorAll("#bloco-visitas-baixa .mb-item__faixa > button")].map((b) => b.textContent.trim()) }; })()`);
      confere(`visita e aniversário ${w} ${tema}: o HTML bate com os previews`, okV && okB && okA && c.faltam.length === 0 && c.baixa.join() === "✕ Não compareceu,✓ Realizada" && c.selosDasVisitas.some((x) => /etapa-vendas-agendada/.test(x)) && c.selosDasVisitas.some((x) => /mb-selo--alerta/.test(x)), c);
    }
  }

  // O estado da visita vai no rodapé do card, não no canto direito (Alicerce de 07/11/2026).
  {
    await abrirListaDoDia(375, 812, 'papel');
    const v = await avaliar("[...document.querySelectorAll('#bloco-visitas-hoje .mb-item, #bloco-visitas-baixa .mb-item')].map((c) => ({ noRodape: !!c.querySelector(':scope > .mb-item__rodape > .mb-selo'), noCanto: !!c.querySelector('.mb-item__cabeca > .mb-selo, .mb-item__cabeca > .mb-chip') }))");
    confere('selo da visita no rodapé, sem nada no canto', v.length > 0 && v.every((x) => x.noRodape && !x.noCanto), v);
  }

  // Registrar abre o PainelLateral (no celular, a folha que sobe): portal no body, foco no primeiro campo, Tab preso, Esc fecha.
  for (const [w, h] of [[375, 812], [1280, 800]]) {
    for (const tema of ["papel", "grafite"]) {
      await abrirListaDoDia(w, h, tema);
      await avaliar("window.__botaoRegistrar = [...document.querySelectorAll('.mb-item__faixa button')].find((b) => b.textContent.trim() === 'Registrar'); window.__botaoRegistrar.focus(); window.__botaoRegistrar.click(); true");
      await espera(700);
      const a = await avaliar(`(() => { const p = document.querySelector('body > aside.mb-lateral'); const v = p && p.nextElementSibling; const r = p && p.getBoundingClientRect(); const foco = document.activeElement; return {
        aberto: !!p && p.classList.contains('mb-lateral--aberto') && p.getAttribute('aria-hidden') === 'false', veuIrmao: !!v && v.classList.contains('mb-lateral__veu'), veuVisivel: !!v && getComputedStyle(v).visibility === 'visible',
        titulo: p && p.querySelector('.mb-lateral__titulo').textContent.trim(), descricao: p && p.querySelector('.mb-lateral__descricao').textContent.trim(),
        focoNoCorpo: !!foco && !!p && p.querySelector('.mb-lateral__corpo').contains(foco), campos: [...(p ? p.querySelectorAll('.mb-campo__rotulo') : [])].map((e) => e.textContent.trim()),
        opcoes: [...(p ? p.querySelectorAll('.mb-opcoes--3 .mb-opcao') : [])].map((e) => e.textContent.trim()), rodape: [...(p ? p.querySelectorAll('.mb-lateral__rodape button') : [])].map((e) => e.textContent.trim()),
        noCelular: window.innerWidth < 768, naBase: !!r && Math.round(r.bottom) === window.innerHeight, naDireita: !!r && Math.round(r.right) === document.documentElement.clientWidth,
        modal: !!p && p.getAttribute('role') === 'dialog' && p.getAttribute('aria-modal') === 'true' && !!document.getElementById(p.getAttribute('aria-labelledby')),
        pilulas: [...(p ? p.querySelectorAll('.mb-opcoes--linha .mb-opcao') : [])].map((e) => e.textContent.trim() + ' ' + Math.round(e.getBoundingClientRect().height)),
        pequenos: window.innerWidth < 768 && p ? [...p.querySelectorAll('button, input, textarea')].filter((e) => e.getClientRects().length).filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => (e.getAttribute('aria-label') || e.textContent || e.type).trim().slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().height)) : [],
      }; })()`);
      await print(`lista-painel-registrar-${w}-${tema}`);
      // Tab preso: do último foco, o Tab volta ao primeiro (o X do topo).
      await avaliar("(() => { const p = document.querySelector('body > aside.mb-lateral'); const f = [...p.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')].filter((e) => e.getClientRects().length); f[f.length - 1].focus(); return f.length; })()");
      await teclar("Tab", "Tab", 9);
      const apos = await avaliar("(() => { const p = document.querySelector('body > aside.mb-lateral'); return p.contains(document.activeElement) && document.activeElement === p.querySelector('.mb-lateral__topo button'); })()");
      await teclar("Escape", "Escape", 27);
      await espera(500);
      const fim = await avaliar("(() => { const p = document.querySelector('body > aside.mb-lateral'); return { fechou: !p.classList.contains('mb-lateral--aberto') && p.getAttribute('aria-hidden') === 'true', focoVoltou: document.activeElement === window.__botaoRegistrar }; })()");
      confere(`painel Registrar ${w} ${tema}`,
        a.aberto && a.veuIrmao && a.veuVisivel && a.titulo === "Registrar interação" && /·/.test(a.descricao) && a.focoNoCorpo && a.modal
          && a.campos.join() === "Como foi,O que aconteceu,Próximo contato" && a.opcoes.slice(0, 5).join() === "WhatsApp,Ligação,E-mail,Visita,Anotação" && a.rodape.join() === "Cancelar,Registrar"
          && a.pilulas.length === 4 && (a.noCelular ? a.naBase : a.naDireita) && a.pequenos.length === 0 && apos && fim.fechou && fim.focoVoltou && erros.length === 0,
        { a, apos, fim, erros: [...erros] });
    }
  }
  // A gravação na prévia é desativada (visual-fixtures.ts): Registrar mostra o erro e guarda o rascunho, como o app real sem conexão.
  await abrirListaDoDia(375, 812, "papel");
  await avaliar("[...document.querySelectorAll('.mb-item__faixa button')].find((b) => b.textContent.trim() === 'Registrar').click(); true");
  await espera(600);
  await avaliar("(() => { const p = document.querySelector('body > aside.mb-lateral'); const t = p.querySelector('textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Falou que quer visitar no sábado'); t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()");
  await avaliar("document.querySelector('body > aside.mb-lateral .mb-opcoes--linha .mb-opcao').click(); true");
  await espera(200);
  await avaliar("[...document.querySelectorAll('body > aside.mb-lateral .mb-lateral__rodape button')].find((b) => b.textContent.trim() === 'Registrar').click(); true");
  await espera(800);
  await print("lista-painel-registrar-erro-375-papel");
  {
    const r = await avaliar("({ erro: (document.querySelector('body > aside.mb-lateral .mb-aviso--erro .mb-aviso__titulo') || {}).textContent || null, rascunho: Object.keys(sessionStorage).filter((k) => /rascunho|interacao/i.test(k)).length })");
    confere("Registrar sem gravar mostra o erro no painel e guarda o rascunho", !!r.erro && r.rascunho > 0, r);
  }
}
if (soLista) {
  writeFileSync(join(saida, "resultado.json"), JSON.stringify(resultado, null, 2));
  const falhasLista = Object.values(resultado).filter((r) => !r.ok).length;
  console.log(`\n${Object.keys(resultado).length} conferências, ${falhasLista} falhas. Prints em ${saida}`);
  ws.close();
  process.exit(falhasLista ? 1 : 0);
}

// 9b. Leads, Agenda e Fila de leads (passo e). Roda com --leads, depois do visual-preview.mjs e do build da prévia:
//   node scripts/conferir-alicerce.mjs local/alicerce/passo-e --leads
// Dados fictícios de scripts/visual-fixtures.ts. O visual-preview.mjs põe na cópia local o ?qa=corretor em /leads/
// (a sessão da prévia trata /leads/ como gerente) e os ?qa=gerente e ?qa=geral da Agenda e da Fila.
// Confere, nos dois tamanhos e nos dois temas: sem rolagem lateral, sem erro no console, alvos de 44px no celular,
// foco visível ao navegar com Tab, nada do DS antigo fora da ponte e o HTML das peças (BarraDeFiltros, CardLead,
// Tabela, Compromisso, NavegadorDePeriodo e a semana, Lista, Cartao, Recolhivel e `leitura`). E, em papel, o que
// cada tela faz: filtros, busca, Limpar filtros, a tabela Por corretor, o painel dos filtros no celular, Registrar,
// o WhatsApp, a troca de semana e o PainelLateral das ações do corretor na Fila.
if (soLeads) {
  const PAGINAS = [
    ["leads-corretor", "/leads/?qa=corretor"],
    ["leads-gerente", "/leads/"],
    ["agenda-corretor", "/agenda/"],
    ["agenda-gerente", "/agenda/?qa=gerente"],
    ["fila-corretor", "/fila/"],
    ["fila-gerente", "/fila/?qa=gerente"],
    ["fila-geral", "/fila/?qa=geral"],
    ["fila-como", "/fila/como/"],
  ];
  function medirTelaNaPagina(largura, nome) {
    const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
    const qs = (s) => [...document.querySelectorAll(s)];
    const q = (s) => document.querySelector(s);
    const altura = (e) => { const r = e.getBoundingClientRect(); const ext = ["::before", "::after"].map((p) => { const a = getComputedStyle(e, p); return a.position === "absolute" && a.content !== "none" ? parseFloat(a.height) || 0 : 0; }); return Math.max(r.height, ...ext); };
    const rotulo = (e) => (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    const interativos = qs("main a[href], main button, main select, main input, main summary").filter(vis);
    const texto = (e) => (e?.textContent ?? "").trim().replace(/\s+/g, " ");
    const cards = qs("main .mb-item");
    const faixa = (c) => [...c.querySelectorAll(".mb-item__faixa > :is(a, button)")].map((b) => b.textContent.trim());
    const m = {
      rolagemLateral: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      h1: qs("main h1").map((e) => e.textContent.trim()),
      antigoForaDaPonte: qs("main .card, main .bar-brand, main .veredito, main .selo-antigo, main .btn, main .aviso-erro, main .aviso-ok, main .input, main .field-label, main .titulo-card, main .titulo-secao-antigo").filter((e) => !e.closest(".ds-antigo")).length,
      pequenos: largura < 768 ? interativos.filter((e) => altura(e) < 43.5).map((e) => rotulo(e) + " " + Math.round(altura(e))) : [],
      cards: cards.length,
      cardsEstrutura: {
        destaques: qs("main .mb-item--destaque").length,
        primeiroEhDestaque: cards.length > 0 && cards[0].classList.contains("mb-item--destaque"),
        semAlvo: cards.filter((c) => !c.querySelector(".mb-item__cabeca .mb-item__titulo.mb-item__alvo[href]")).length,
        abrirOuMais: cards.filter((c) => [...c.querySelectorAll("button, a")].some((b) => /^(abrir|mais|⋯|…)$/i.test(b.textContent.trim()) || b.getAttribute("aria-haspopup") === "menu")).length,
        maisDeDuasAcoes: cards.filter((c) => faixa(c).length > 2).length,
        semCabecaOuId: cards.filter((c) => !c.querySelector(".mb-item__cabeca .mb-item__id")).length,
      },
    };
    if (nome.startsWith("leads-")) {
      const form = q("form.mb-filtros[role=search]");
      const campos = qs("form.mb-filtros > label.mb-campo:not(.mb-filtros__busca)");
      const ativos = q(".mb-filtros__ativos");
      const ordem = q(".pagina-alicerce__ordem");
      const contagem = ativos?.querySelector("span");
      const rc = contagem?.getBoundingClientRect();
      const ro = ordem?.getBoundingClientRect();
      m.leads = {
        escopo: texto(q(".mb-escopo")),
        formOk: !!form && !!form.querySelector(":scope > label.mb-campo.mb-filtros__busca input.mb-campo__entrada[type=search]"),
        filtros: campos.map((c) => texto(c.querySelector(".mb-campo__rotulo")) + ":" + texto(c.querySelector("select option:checked"))),
        selectsNoPadrao: campos.every((c) => !!c.querySelector(".mb-campo__selecao > select.mb-campo__entrada")),
        botaoCelular: texto(q(".mb-filtros__celular")),
        contagem: texto(contagem),
        ordemNaLinhaDaContagem: !!rc && !!ro && Math.abs(rc.top + rc.height / 2 - (ro.top + ro.height / 2)) < 20 && (largura < 768 || ro.left > rc.right),
        ordemRotulo: texto(ordem?.querySelector(".mb-campo__rotulo")),
        tabela: !!q("main .mb-tabela-envoltorio > table.mb-tabela--numeros.mb-tabela--primeira-fixa"),
        tabelaColunas: qs("main .mb-tabela thead th").map((e) => e.textContent.trim()),
        tabelaAlvosCom44: largura < 768 ? qs("main .mb-tabela tbody .mb-link").every((e) => altura(e) >= 43.5) : true,
        novoLeadNaPagina: qs("main a[href$='/leads/novo/']").length,
        rodapeFixo: qs("main .fixed, .mb-app__conteudo .fixed").filter(vis).length,
        cardsComRegistrar: cards.filter((c) => faixa(c).includes("Registrar") || faixa(c).includes("Detalhar")).length,
        ritaSemWhatsapp: (() => { const c = cards.find((x) => x.querySelector(".mb-item__titulo")?.textContent.trim() === "Rita Exemplo"); return c ? !faixa(c).some((b) => /WhatsApp/.test(b)) : null; })(),
        donos: cards.filter((c) => [...c.querySelectorAll(".mb-item__linha")].some((l) => /^(Marina|Paulo|A distribuir)/.test(l.textContent.trim()))).length,
      };
    }
    if (nome.startsWith("agenda-")) {
      const nav = q("nav.mb-periodo");
      const botoes = [...(nav?.querySelectorAll("button") ?? [])].map((b) => b.textContent.trim());
      const agendar = [...document.querySelectorAll("main button")].find((b) => b.textContent.trim() === "+ Agendar visita");
      const rn = nav?.getBoundingClientRect();
      const ra = agendar?.getBoundingClientRect();
      const dias = qs(".mb-semana > button.mb-semana__dia");
      m.agenda = {
        periodo: botoes,
        rotulo: texto(q(".mb-periodo__rotulo")),
        rotuloAoVivo: q(".mb-periodo__rotulo")?.getAttribute("aria-live"),
        dias: dias.length,
        pressionados: dias.filter((d) => d.getAttribute("aria-pressed") === "true").length,
        hoje: qs(".mb-semana__dia--hoje").length,
        diasComEstrutura: dias.every((d) => d.querySelector(".mb-semana__nome") && d.querySelector(".mb-semana__numero") && d.querySelector(".mb-semana__contagem") && d.getAttribute("aria-label")),
        agendarNaLinhaDoNavegador: agendar ? !!rn && !!ra && (largura < 768 ? ra.top >= rn.bottom - 1 : Math.abs(rn.top + rn.height / 2 - (ra.top + ra.height / 2)) < 30 && ra.left > rn.right) : null,
        compromissos: qs("main .mb-item").filter((c) => c.querySelector(".mb-item__rodape .mb-selo") && !c.querySelector(".mb-chip")).length,
        compromissoSemClienteConfirmouNemCancelar: !qs("main .mb-item__faixa button, main .mb-item__faixa a").some((b) => /Cliente confirmou|Cancelar/.test(b.textContent)),
      };
    }
    if (nome.startsWith("fila-") && nome !== "fila-como") {
      const itens = qs("main .mb-lista__item");
      const eu = itens.find((i) => i.getAttribute("aria-current") === "true");
      m.fila = {
        escopo: texto(q(".mb-escopo")),
        listaItens: itens.length,
        listaComCartao: !!q("main ul.mb-lista.mb-lista--cartao"),
        voce: eu ? texto(eu.querySelector(".mb-lista__titulo")) : null,
        aptoSemCor: qs("main .mb-prazo").every((e) => !/✓/.test(e.textContent)),
        comoCalculado: !!q("a.mb-link[href$='/fila/como/']"),
        hojeRecolhiveis: qs("main .mb-cartao .mb-recolhivel").length,
        tabelaRegistros: !!q("main .mb-tabela-envoltorio > table.mb-tabela--registros"),
        reticencias: qs("main button").filter((b) => /^(⋯|…)$/.test(b.textContent.trim())).length,
        naoAtende: qs("main .mb-selo").map((e) => e.textContent.trim()).filter((t) => /atende/i.test(t)),
        celulasComRotulo: qs("main table.mb-tabela--registros tbody tr").every((tr) => [...tr.querySelectorAll("td")].slice(1).every((td) => td.hasAttribute("data-rotulo") || td.classList.contains("mb-tabela__acoes"))),
        alvosDeLinha: qs("main button.mb-tabela__alvo").length,
      };
    }
    if (nome === "fila-como") {
      m.como = { leitura: qs("main p.leitura").length, cartoes: qs("main section.mb-cartao").length, voltar: !!q("main a.mb-link[href$='/fila/']"), negrito: !!q("main p.leitura strong") };
    }
    return m;
  }
  const escolher = (rotuloDoCampo, valor) => avaliar(`(() => { const lab = [...document.querySelectorAll('label.mb-campo')].filter((l) => l.getClientRects().length).find((l) => l.querySelector('.mb-campo__rotulo')?.textContent.trim() === ${JSON.stringify(rotuloDoCampo)}); const el = lab.querySelector('select, input'); const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(valor)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return true; })()`);
  const contagemDeLeads = () => avaliar(`document.querySelector('.mb-filtros__ativos span')?.textContent.trim()`);
  const clicarTexto = (seletor, textoDoBotao) => avaliar(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(seletor)})].filter((e) => e.getClientRects().length).find((e) => e.textContent.trim() === ${JSON.stringify(textoDoBotao)}); if (!b) return false; b.focus(); b.click(); return true; })()`);
  const painel = () => avaliar(`(() => { const todos = [...document.querySelectorAll('body > aside.mb-lateral')]; const p = todos.find((x) => x.classList.contains('mb-lateral--aberto')) ?? todos[0]; return p ? { aberto: p.getAttribute('aria-hidden') === 'false' && p.classList.contains('mb-lateral--aberto'), titulo: p.querySelector('.mb-lateral__titulo')?.textContent.trim(), acoes: [...p.querySelectorAll('.mb-lateral__corpo .mb-botao')].map((b) => b.textContent.trim()), noBody: p.parentElement === document.body } : null; })()`);

  for (const [w, h] of [[375, 812], [1280, 800]]) {
    for (const tema of ["papel", "grafite"]) {
      for (const [nome, caminho] of PAGINAS) {
        erros.length = 0;
        await tela(w, h);
        await comArmazenamento({ mb_tema: tema }, caminho);
        await espera(900);
        const m = await avaliar(`(${medirTelaNaPagina.toString()})(${w}, ${JSON.stringify(nome)})`);
        await printInteiro(`${nome}-${w}-${tema}`);
        const semAnel = await focoVisivel(14);
        const comum = !m.rolagemLateral && m.h1.length === 1 && m.antigoForaDaPonte === 0 && m.pequenos.length === 0 && semAnel.length === 0 && erros.length === 0;
        confere(`${nome} ${w} ${tema}: sem rolagem lateral, sem DS antigo fora da ponte, alvos de 44px, foco visível e sem erro no console`, comum, { rolagemLateral: m.rolagemLateral, h1: m.h1, antigo: m.antigoForaDaPonte, pequenos: m.pequenos, semAnel, erros: [...erros] });
        const ce = m.cardsEstrutura;
        if (m.cards > 0)
          confere(`${nome} ${w} ${tema}: cards como o preview (um destaque, o primeiro; título abre; sem Abrir nem ⋯; no máximo duas ações)`, ce.destaques === 1 && ce.primeiroEhDestaque && ce.semAlvo === 0 && ce.abrirOuMais === 0 && ce.maisDeDuasAcoes === 0 && ce.semCabecaOuId === 0, ce);
        if (m.leads) {
          const L = m.leads;
          const esperados = nome === "leads-gerente" ? ["Corretor:Todos os corretores", "Origem:Todas as origens", "Empreendimento:Todos os empreendimentos", "Situação:Ativos"] : ["Origem:Todas as origens", "Empreendimento:Todos os empreendimentos", "Situação:Ativos"];
          confere(`${nome} ${w} ${tema}: BarraDeFiltros como o preview, com os rótulos com substantivo, a contagem e o Ordenar na mesma linha`, L.formOk && L.selectsNoPadrao && JSON.stringify(L.filtros) === JSON.stringify(esperados) && /^Filtros/.test(L.botaoCelular) && /^\d+ leads?$/.test(L.contagem) && L.ordemNaLinhaDaContagem && L.ordemRotulo === "Ordenar por" && L.escopo === (nome === "leads-gerente" ? "Sua equipe" : "Só os seus"), L);
          confere(`${nome} ${w} ${tema}: sem + Novo lead na página nem rodapé fixo; Registrar só no lead do próprio corretor; Rita sem telefone fica sem WhatsApp`, L.novoLeadNaPagina === 0 && L.rodapeFixo === 0 && (nome === "leads-gerente" ? L.cardsComRegistrar === 0 : L.cardsComRegistrar > 0) && L.ritaSemWhatsapp === true, L);
          if (nome === "leads-gerente") confere(`leads-gerente ${w} ${tema}: Por corretor é Tabela de números (primeira coluna fixa), com o dono em cada card`, L.tabela && JSON.stringify(L.tabelaColunas) === JSON.stringify(["Corretor", "Ativos", "Prazo estourado", "Atrasados", "Sem contato"]) && L.tabelaAlvosCom44 && L.donos === m.cards, L);
          else confere(`leads-corretor ${w} ${tema}: sem a tabela Por corretor`, !L.tabela, L);
        }
        if (m.agenda) {
          const A = m.agenda;
          confere(`${nome} ${w} ${tema}: NavegadorDePeriodo e a semana de 7 dias como o preview`, JSON.stringify(A.periodo) === JSON.stringify(["← Anterior", "Seguinte →"]) && /^\d\d\/\d\d a \d\d\/\d\d\/\d{4}$/.test(A.rotulo) && A.rotuloAoVivo === "polite" && A.dias === 7 && A.pressionados === 1 && A.hoje === 1 && A.diasComEstrutura, A);
          confere(`${nome} ${w} ${tema}: visitas como Compromisso (Selo no rodapé, sem Chip), sem Cliente confirmou nem Cancelar no card${nome === "agenda-corretor" ? " e + Agendar visita na linha do navegador" : ""}`, A.compromissos > 0 && A.compromissoSemClienteConfirmouNemCancelar && (nome !== "agenda-corretor" || A.agendarNaLinhaDoNavegador === true), A);
        }
        if (m.fila) {
          const F = m.fila;
          if (nome === "fila-corretor") confere(`fila-corretor ${w} ${tema}: fila em Lista de cartão, "Você" marcado, ✓ sem cor, Hoje em Recolhivel dentro de Cartao`, F.listaComCartao && F.listaItens >= 5 && F.voce === "Você" && F.aptoSemCor && F.comoCalculado && F.hojeRecolhiveis >= 1 && !F.tabelaRegistros, F);
          else confere(`${nome} ${w} ${tema}: fila do gerente em Tabela de registros, linha que abre o painel (sem ⋯), "Não atende N produto" e ✓ sem cor`, F.tabelaRegistros && F.celulasComRotulo && F.reticencias === 0 && F.alvosDeLinha >= 5 && F.naoAtende.includes("Não atende 1 produto") && F.aptoSemCor, F);
        }
        if (m.como) confere(`fila-como ${w} ${tema}: dois Cartao com o texto em leitura, o último parágrafo em negrito e o link de volta`, m.como.cartoes === 2 && m.como.leitura >= 5 && m.como.negrito && m.como.voltar, m.como);
      }
    }
  }

  // O que cada tela faz (em papel, nos dois tamanhos).
  for (const [w, h] of [[375, 812], [1280, 800]]) {
    await tela(w, h);
    const celular = w < 768;
    // Leads como gerente: filtros, busca, Limpar filtros, a tabela Por corretor e Descartados.
    erros.length = 0;
    await comArmazenamento({ mb_tema: "papel" }, "/leads/");
    await espera(900);
    const todos = await contagemDeLeads();
    if (celular) { await clicarTexto("button", "Filtros"); await espera(500); }
    await escolher("Origem", "empresa");
    await espera(300);
    if (celular) { await avaliar("document.querySelector('.mb-lateral [data-mb-fechar]').click(); true"); await espera(400); }
    const porOrigem = await contagemDeLeads();
    const chip = await avaliar(`[...document.querySelectorAll('.mb-filtros__ativos .mb-opcao')].map((b) => b.textContent.trim() + '|' + b.getAttribute('aria-label'))`);
    const tabelaSumiu = await avaliar(`!document.querySelector('main .mb-tabela')`);
    await clicarTexto(".mb-filtros__ativos button", "Limpar filtros");
    await espera(300);
    const depoisDeLimpar = await contagemDeLeads();
    await escolher("Buscar", "ana");
    await espera(300);
    const porBusca = await contagemDeLeads();
    await escolher("Buscar", "");
    confere(`Leads ${w}: filtrar por origem muda a contagem e a tabela Por corretor some, o chip tira o filtro, Limpar filtros volta tudo e a busca filtra`, todos === "10 leads" && porOrigem !== todos && /^\d+ leads?$/.test(porOrigem) && chip.length === 1 && chip[0] === "Origem: Empresa|Tirar o filtro Origem: Empresa" && tabelaSumiu && depoisDeLimpar === todos && porBusca === "1 lead", { todos, porOrigem, chip, tabelaSumiu, depoisDeLimpar, porBusca, erros: [...erros] });
    if (celular) {
      await comArmazenamento({ mb_tema: "papel" }, "/leads/");
      await espera(700);
      await clicarTexto("button", "Filtros");
      await espera(500);
      const p = await painel();
      const rotulosNoPainel = await avaliar(`[...document.querySelectorAll('body > aside.mb-lateral .mb-campo__rotulo')].map((e) => e.textContent.trim())`);
      await teclar("Escape", "Escape", 27);
      await espera(400);
      const fechou = await painel();
      const focoNoBotao = await avaliar("document.activeElement?.classList.contains('mb-filtros__celular')");
      confere("Leads 375: o botão Filtros abre os filtros no PainelLateral (no body), com Corretor, Origem, Empreendimento e Situação; Esc fecha e devolve o foco ao botão", !!p && p.aberto && p.noBody && JSON.stringify(rotulosNoPainel) === JSON.stringify(["Corretor", "Origem", "Empreendimento", "Situação"]) && !fechou?.aberto && focoNoBotao === true, { p, rotulosNoPainel, fechou, focoNoBotao });
    }
    // Clicar no nome na tabela Por corretor filtra por ele; Descartados mostra o selo.
    await comArmazenamento({ mb_tema: "papel" }, "/leads/");
    await espera(900);
    await clicarTexto("main .mb-tabela .mb-link", "Marina Exemplo");
    await espera(400);
    const filtrouPorCorretor = await avaliar(`(() => { const lab = [...document.querySelectorAll('form.mb-filtros label.mb-campo')].find((l) => l.querySelector('.mb-campo__rotulo')?.textContent.trim() === 'Corretor'); return { corretor: lab.querySelector('select option:checked').textContent.trim(), tabela: !!document.querySelector('main .mb-tabela'), chip: [...document.querySelectorAll('.mb-filtros__ativos .mb-opcao')].map((b) => b.textContent.trim()) }; })()`);
    if (celular) { await clicarTexto("button", "Filtros"); await espera(500); }
    await escolher("Situação", "descartado");
    await espera(400);
    if (celular) { await avaliar("document.querySelector('.mb-lateral [data-mb-fechar]').click(); true"); await espera(400); }
    const descartados = await avaliar(`({ conta: document.querySelector('.mb-filtros__ativos span')?.textContent.trim(), selos: [...document.querySelectorAll('main .mb-selo--etapa-descartado')].map((e) => e.textContent.trim()) })`);
    confere(`Leads ${w}: clicar no corretor da tabela filtra por ele; Descartados mostra ✕ Descartado`, filtrouPorCorretor.corretor === "Marina Exemplo" && !filtrouPorCorretor.tabela && filtrouPorCorretor.chip.includes("Corretor: Marina Exemplo") && descartados.selos.includes("✕ Descartado"), { filtrouPorCorretor, descartados });

    // Leads como corretor: Registrar abre o painel, Esc devolve o foco; WhatsApp abre a mensagem pronta.
    await comArmazenamento({ mb_tema: "papel" }, "/leads/?qa=corretor");
    await espera(900);
    await clicarTexto("main .mb-item__faixa button", "Registrar");
    await espera(700);
    const pr = await painel();
    await teclar("Escape", "Escape", 27);
    await espera(500);
    const focoVoltou = await avaliar("document.activeElement?.textContent.trim() === 'Registrar' && !!document.activeElement.closest('.mb-item')");
    await avaliar("document.querySelector('main .mb-item__faixa .mb-botao--whatsapp').click(); true");
    await espera(600);
    const dialogo = await avaliar("!!document.querySelector('body > .ds-antigo dialog')");
    confere(`Leads ${w} corretor: Registrar abre o PainelLateral, Esc fecha e devolve o foco ao botão; WhatsApp abre a mensagem pronta`, !!pr && pr.aberto && pr.noBody && focoVoltou === true && dialogo === true, { pr, focoVoltou, dialogo });

    // Agenda: trocar de semana, Voltar para hoje, escolher o dia.
    await comArmazenamento({ mb_tema: "papel" }, "/agenda/");
    await espera(900);
    const semana0 = await avaliar("document.querySelector('.mb-periodo__rotulo').textContent");
    await clicarTexto("nav.mb-periodo button", "Seguinte →");
    await espera(900);
    const semana1 = await avaliar("({ rotulo: document.querySelector('.mb-periodo__rotulo').textContent, botoes: [...document.querySelectorAll('nav.mb-periodo button')].map((b) => b.textContent.trim()) })");
    await clicarTexto("nav.mb-periodo button", "Voltar para hoje");
    await espera(900);
    const semana2 = await avaliar("({ rotulo: document.querySelector('.mb-periodo__rotulo').textContent, botoes: [...document.querySelectorAll('nav.mb-periodo button')].map((b) => b.textContent.trim()) })");
    const antes = await avaliar("document.querySelector('.mb-semana__dia[aria-pressed=true] .mb-semana__numero').textContent");
    await avaliar("[...document.querySelectorAll('.mb-semana__dia')].find((d) => d.getAttribute('aria-pressed') === 'false').click(); true");
    await espera(700);
    const depois = await avaliar("({ n: document.querySelector('.mb-semana__dia[aria-pressed=true] .mb-semana__numero').textContent, um: document.querySelectorAll('.mb-semana__dia[aria-pressed=true]').length })");
    confere(`Agenda ${w}: Seguinte → troca a semana e mostra Voltar para hoje, que volta; escolher um dia marca só ele`, semana1.rotulo !== semana0 && semana1.botoes.includes("Voltar para hoje") && semana2.rotulo === semana0 && !semana2.botoes.includes("Voltar para hoje") && depois.n !== antes && depois.um === 1, { semana0, semana1, semana2, antes, depois });
    // Agenda: + Agendar visita abre a escolha do cliente (DS antigo, dentro da ponte).
    await clicarTexto("main button", "+ Agendar visita");
    await espera(600);
    const agendar = await avaliar("({ ponte: !!document.querySelector('main .ds-antigo #busca-cliente'), botaoSumiu: ![...document.querySelectorAll('main button')].some((b) => b.textContent.trim() === '+ Agendar visita') })");
    confere(`Agenda ${w}: + Agendar visita abre a escolha do cliente dentro da ponte .ds-antigo`, agendar.ponte && agendar.botaoSumiu, agendar);

    // Fila do gerente: a linha abre o PainelLateral com as ações; Esc fecha e devolve o foco.
    await comArmazenamento({ mb_tema: "papel" }, "/fila/?qa=gerente");
    await espera(900);
    await avaliar("document.querySelector('main button.mb-tabela__alvo').focus(); document.querySelector('main button.mb-tabela__alvo').click(); true");
    await espera(700);
    const pf = await painel();
    const nomeDoAlvo = await avaliar("document.querySelector('main button.mb-tabela__alvo').getAttribute('aria-label')");
    await teclar("Escape", "Escape", 27);
    await espera(500);
    const foco = await avaliar("document.activeElement?.classList.contains('mb-tabela__alvo')");
    // No computador, clicar fora do nome (na célula de Situação) também abre pela linha inteira.
    let linhaInteira = null;
    if (!celular) {
      const alvo = await avaliar(`(() => { const td = document.querySelector('main table.mb-tabela--registros tbody tr td:nth-child(2)'); const r = td.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
      await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: alvo.x, y: alvo.y, button: "left", clickCount: 1 });
      await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: alvo.x, y: alvo.y, button: "left", clickCount: 1 });
      await espera(600);
      linhaInteira = await painel();
      await teclar("Escape", "Escape", 27);
      await espera(400);
    }
    confere(`Fila ${w}: a linha do corretor abre o PainelLateral com as ações (Pausar, Tirar da distribuição, Como é calculado, Produtos e participação); Esc fecha e devolve o foco${celular ? "" : "; clicar na célula da linha também abre"}`, !!pf && pf.aberto && pf.noBody && /^Ações de Carla/.test(nomeDoAlvo) && pf.titulo === "Carla" && JSON.stringify(pf.acoes) === JSON.stringify(["Pausar", "Tirar da distribuição", "Como é calculado", "Produtos e participação"]) && foco === true && (celular || (!!linhaInteira && linhaInteira.aberto)), { pf, nomeDoAlvo, foco, linhaInteira });
    confere(`Leads, Agenda e Fila ${w}: nenhum erro no console durante as ações`, erros.length === 0, [...erros]);
  }

  // Os prints dos filtros abertos no celular, nos dois temas.
  for (const tema of ["papel", "grafite"]) {
    for (const nome of ["leads-corretor", "leads-gerente"]) {
      await tela(375, 812);
      await comArmazenamento({ mb_tema: tema }, nome === "leads-gerente" ? "/leads/" : "/leads/?qa=corretor");
      await espera(800);
      await avaliar("document.querySelector('.mb-filtros__celular').click(); true");
      await espera(600);
      await print(`${nome}-375-${tema}-filtros-abertos`);
    }
  }
  writeFileSync(join(saida, "resultado.json"), JSON.stringify(resultado, null, 2));
  const falhasLeads = Object.values(resultado).filter((r) => !r.ok).length;
  console.log(`\n${Object.keys(resultado).length} conferências, ${falhasLeads} falhas. Prints em ${saida}`);
  await tela(1280, 800);
  ws.close();
  process.exit(falhasLeads ? 1 : 0);
}

// 10. As mensagens do passo d. Roda com --mensagens, depois do visual-preview.mjs e do build da prévia.
if (soMensagens) {
  const medirMensagens = () => avaliar(`(() => { const doc = document.documentElement;
    const pequenos = window.innerWidth < 768 ? [...document.querySelectorAll('main button, main a, body > .mb-toast button, .mb-conexao button')].filter((e) => e.getClientRects().length && !e.id).filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 28) + ' ' + Math.round(e.getBoundingClientRect().height)) : [];
    return { rolagemLateral: doc.scrollWidth > doc.clientWidth, pequenos, antigo: !!document.querySelector('.ds-antigo, .cabecalho-vidro, .card, .aviso-conexao'), texto: document.body.innerText }; })()`);
  const estadoDaPagina = () => avaliar(`(() => { const e = document.querySelector('.mb-estado'); if (!e) return null; const f = (q) => (e.querySelector(q) || {}).textContent || null; return { classes: e.className, icone: !!e.querySelector(':scope > .mb-estado__icone > svg.mb-icone[aria-hidden=true]'), ordem: [...e.children].map((c) => c.className.split(' ')[0]).join(), sobrelinha: f('.mb-estado__sobrelinha'), titulo: f('.mb-estado__titulo'), tituloTag: e.querySelector('.mb-estado__titulo')?.tagName, texto: f('.mb-estado__texto'), acoes: [...e.querySelectorAll('.mb-estado__acoes > .mb-botao')].map((b) => b.className.replace('mb-botao ', '') + ':' + b.textContent.trim() + (b.tagName === 'A' ? '@' + b.getAttribute('href') : '')), detalhe: [...e.querySelectorAll('.mb-estado__detalhe button')].map((b) => b.className.replace('mb-botao ', '') + ':' + b.textContent.trim()) }; })()`);
  const TECNICO = /PGRST|JWT|Supabase|NEXT_PUBLIC|undefined|stack|Falha fictícia/i;
  const clicar = (seletor) => avaliar(`document.querySelector(${JSON.stringify(seletor)}).click(); true`);
  const fotoDoToast = `(() => { const t = document.querySelector('body > .mb-toast'); if (!t) return null; return { classes: t.className, role: t.getAttribute('role'), live: t.getAttribute('aria-live'), filhos: [...t.children].map((c) => c.tagName.toLowerCase() + '.' + (c.getAttribute('class') || '').split(' ').filter((x) => x !== 'mb-icone').join('.')).join(), texto: t.querySelector('.mb-toast__texto').textContent, acao: (t.querySelector('.mb-toast__acao') || {}).textContent, fechar: (t.querySelector('.mb-toast__fechar') || {}).getAttribute('aria-label') }; })()`;
  const fotoDaConexao = `(() => { const c = document.querySelector('.mb-conexao'); const r = c.getBoundingClientRect(); return { oculto: c.hidden, classes: c.className, role: c.getAttribute('role'), filhos: [...c.children].map((x) => x.tagName.toLowerCase() + '.' + (x.getAttribute('class') || '').split(' ').filter((y) => y !== 'mb-icone').join('.')).join(), texto: c.textContent.trim(), noTopo: Math.round(r.top) <= 24, centro: Math.abs(r.left + r.width / 2 - document.documentElement.clientWidth / 2) < 2, cabe: r.left >= 0 && r.right <= document.documentElement.clientWidth }; })()`;
  const ESTADOS = [
    ["desativado", "/?qa=desativado", { classes: "mb-estado", sobrelinha: "Acesso desativado", titulo: "Seu acesso ao Base360 foi desativado", texto: "Se acha que é um engano, fale com o gerente geral.", acoes: "mb-botao--discreto:Sair", detalhe: "" }],
    ["erro-da-conta", "/?qa=erro", { classes: "mb-estado mb-estado--erro", sobrelinha: "Erro de carga", titulo: "Não foi possível carregar a sua conta", acoes: "mb-botao--primario:Tentar de novo", detalhe: "mb-botao--discreto mb-botao--p:Copiar detalhes para o suporte" }],
    ["sem-permissao", "/recepcao/", { classes: "mb-estado", sobrelinha: "Sem permissão", titulo: "Esta página não está liberada para o seu perfil", texto: "Peça o acesso ao gerente geral.", acoes: "mb-botao--secundario:Voltar para o início@/vendas/", detalhe: "" }],
    ["404", "/404.html", { classes: "mb-estado", sobrelinha: "Não encontrado", titulo: "Esta página não existe ou mudou de endereço", acoes: "mb-botao--secundario:Ir para o início@/vendas/", detalhe: "" }],
    ["erro-de-pagina", "/qa-quebrar/", { classes: "mb-estado mb-estado--erro", sobrelinha: "Erro de carga", titulo: "Não foi possível carregar esta página", acoes: "mb-botao--primario:Tentar de novo", detalhe: "mb-botao--discreto mb-botao--p:Copiar detalhes para o suporte" }],
  ];
  let primeira = true;
  for (const [w, h] of [[375, 812], [1280, 800]]) {
    for (const tema of ["papel", "grafite"]) {
      await tela(w, h);
      const sufixo = `${w}-${tema}`;

      // Toast com Desfazer (o mesmo HTML do preview Toast, no <body> por portal).
      erros.length = 0;
      await comArmazenamento({ mb_tema: tema }, "/qa-desfazer/");
      await avaliar("window.__log = []; true");
      await clicar("#mostrar");
      await espera(500);
      const t = await avaliar(fotoDoToast);
      const m1 = await medirMensagens();
      await print(`toast-desfazer-${sufixo}`);
      confere(`toast com Desfazer ${sufixo}`, t && t.classes === "mb-toast mb-toast--sucesso mb-toast--visivel" && t.role === "status" && t.live === "polite"
        && t.filhos === "svg.,span.mb-toast__texto,button.mb-toast__acao,button.mb-toast__fechar" && t.texto === "Etapa: Proposta" && t.acao === "Desfazer" && t.fechar === "Fechar aviso"
        && !m1.rolagemLateral && m1.pequenos.length === 0 && erros.length === 0, { t, m1: { ...m1, texto: undefined }, erros: [...erros] });
      if (primeira) {
        // Desfazer chama a função uma vez e tira o aviso; o fim não roda depois do Desfazer.
        await clicar(".mb-toast__acao");
        await espera(500);
        const a = await avaliar("({ log: window.__log.join(), toasts: document.querySelectorAll('.mb-toast').length })");
        confere("Desfazer chama onDesfazer uma vez e fecha o toast, sem onFim", a.log === "desfazer" && a.toasts === 0, a);
        // Um toast por vez: o segundo substitui o primeiro; trocar o texto não dispara o onFim do antigo.
        await avaliar("window.__log = []; true");
        await clicar("#mostrar");
        await espera(400);
        await clicar("#outro");
        await espera(500);
        const b = await avaliar("({ log: window.__log.join(), toasts: [...document.querySelectorAll('.mb-toast')].map((x) => x.querySelector('.mb-toast__texto').textContent) })");
        confere("um toast por vez e o antigo não chama onFim ao ser substituído", b.toasts.length === 1 && b.toasts[0] === "Descartado: Sem interesse" && b.log === "", b);
        // O X chama o onFim, e a tela limpa o aviso.
        await clicar(".mb-toast__fechar");
        await espera(500);
        const c = await avaliar("({ log: window.__log.join(), toasts: document.querySelectorAll('.mb-toast').length })");
        confere("o X fecha o toast e chama onFim", c.log === "fim" && c.toasts === 0, c);
        // Passou o tempo (8 s): some e chama o onFim.
        await avaliar("window.__log = []; true");
        await clicar("#mostrar");
        await espera(7000);
        const antes = await avaliar("document.querySelectorAll('.mb-toast').length");
        await espera(1700);
        const d = await avaliar("({ log: window.__log.join(), toasts: document.querySelectorAll('.mb-toast').length })");
        confere("o toast com Desfazer fica 8 s e some chamando onFim", antes === 1 && d.log === "fim" && d.toasts === 0, { antes, d });
        // O foco no botão pausa o tempo.
        await avaliar("window.__log = []; true");
        await clicar("#mostrar");
        await espera(500);
        await avaliar("document.querySelector('.mb-toast__acao').focus(); true");
        await espera(8500);
        const e2 = await avaliar("({ log: window.__log.join(), toasts: document.querySelectorAll('.mb-toast').length })");
        confere("o foco no toast pausa o tempo", e2.log === "" && e2.toasts === 1, e2);
        // Outro toast substitui o do Desfazer: o onFim roda (o aviso da tela não fica preso) e o mesmo texto volta a aparecer.
        await clicar(".mb-toast__fechar");
        await espera(400);
        await avaliar("window.__log = []; true");
        await clicar("#mostrar");
        await espera(400);
        await clicar("#info");
        await espera(500);
        const f = await avaliar("({ log: window.__log.join(), toasts: [...document.querySelectorAll('.mb-toast')].map((x) => x.querySelector('.mb-toast__texto').textContent) })");
        await clicar("#mostrar");
        await espera(500);
        const g = await avaliar("[...document.querySelectorAll('.mb-toast')].map((x) => x.querySelector('.mb-toast__texto').textContent)");
        confere("toast substituído por outro chama onFim uma vez e o mesmo texto volta a aparecer", f.log === "fim" && f.toasts.join() === "Interação registrada." && g.join() === "Etapa: Proposta", { f, g });
        // Mesmo texto de novo, com outra chave, com o anterior na tela: é um toast novo e reinicia os 8 s.
        await clicar(".mb-toast__fechar");
        await espera(400);
        await clicar("#mostrar");
        await espera(5000);
        await clicar("#mesmo");
        await espera(4500);
        const h = await avaliar("document.querySelectorAll('.mb-toast').length");
        await espera(4500);
        const i2 = await avaliar("document.querySelectorAll('.mb-toast').length");
        confere("mesmo texto com outra chave reinicia os 8 s", h === 1 && i2 === 0, { h, i2 });
      }

      // AvisoConexao: sem conexão, conexão de volta e some em 4 s.
      erros.length = 0;
      await comArmazenamento({ mb_tema: tema }, "/");
      await avaliar("window.dispatchEvent(new Event('offline')); true");
      await espera(400);
      const cx = await avaliar(fotoDaConexao);
      const m2 = await medirMensagens();
      // O aviso fica logo abaixo do topo (no celular, abaixo da faixa de status): não cobre o +, o status, o "Ver fila" nem a conta.
      const cobre = await avaliar(`(() => { const c = document.querySelector('.mb-conexao').getBoundingClientRect();
        const alvos = [...document.querySelectorAll('.mb-topo a, .mb-topo button, .mb-topo [role=button], .mb-celular-topo a, .mb-celular-topo button, .mb-celular-status a, .mb-celular-status button, .mb-celular-status .mb-status')].filter((e) => e.getClientRects().length);
        const bate = (r) => r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top;
        return { alvos: alvos.length, cobertos: alvos.filter((e) => bate(e.getBoundingClientRect())).map((e) => (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 24)), topoDoAviso: Math.round(c.top) }; })()`);
      await print(`conexao-sem-${sufixo}`);
      confere(`AvisoConexao não cobre o topo ${sufixo}`, cobre.alvos >= 3 && cobre.cobertos.length === 0, cobre);
      confere(`AvisoConexao sem conexão ${sufixo}`, !cx.oculto && cx.classes === "mb-conexao" && cx.role === "status" && cx.filhos === "svg.,span.mb-conexao__texto,span.mb-conexao__detalhe"
        && cx.texto === "Sem conexão· nada é gravado sem internet" && cx.centro && cx.cabe && !m2.rolagemLateral && erros.length === 0, { cx, erros: [...erros] });
      await avaliar("window.dispatchEvent(new Event('online')); true");
      await espera(400);
      const vt = await avaliar(fotoDaConexao);
      await print(`conexao-voltou-${sufixo}`);
      let sumiu = true;
      if (primeira) {
        await espera(4300);
        sumiu = await avaliar("document.querySelector('.mb-conexao').hidden");
      }
      confere(`AvisoConexao de volta ${sufixo}`, !vt.oculto && vt.classes === "mb-conexao mb-conexao--voltou" && vt.texto === "Conexão de volta." && sumiu === true, { vt, sumiu });

      // Os estados: conta desativada, erro da conta, sem permissão, 404 e error.tsx.
      for (const [nome, caminho, esperado] of ESTADOS) {
        erros.length = 0;
        await comArmazenamento({ mb_tema: tema }, caminho);
        await espera(500);
        const e = await estadoDaPagina();
        const m = await medirMensagens();
        const semAnel = await focoVisivel(w < 768 ? 4 : 6);
        await avaliar("document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); true");
        await print(`${nome}-${sufixo}`);
        const moldura = nome === "sem-permissao" || nome === "404";
        const temMenu = await avaliar("!!document.querySelector('.mb-app')");
        const ordem = "mb-estado__icone,mb-estado__sobrelinha,mb-estado__titulo,mb-estado__texto,mb-estado__acoes" + (esperado.detalhe ? ",mb-estado__detalhe" : "");
        confere(`estado ${nome} ${sufixo}`, e && e.classes === esperado.classes && e.icone && e.ordem === ordem
          && e.sobrelinha === esperado.sobrelinha && e.titulo === esperado.titulo && (!esperado.texto || e.texto === esperado.texto) && e.tituloTag === "H2" && e.acoes.join() === esperado.acoes && e.detalhe.join() === esperado.detalhe
          && !TECNICO.test(m.texto) && !m.antigo && !m.rolagemLateral && m.pequenos.length === 0 && semAnel.length === 0 && temMenu === moldura
          && (nome === "erro-de-pagina" || erros.length === 0), { e, m: { ...m, texto: undefined }, semAnel, temMenu, erros: [...erros] });
      }
      primeira = false;
    }
  }

  // Registrar sem internet (rede desligada de verdade pelo CDP): o erro aparece no painel, perto do botão, com o
  // texto aprovado, e o que foi digitado continua lá (e no rascunho do aparelho). A prévia grava nada: sem rede, o
  // fixture devolve "Failed to fetch", como o Supabase real.
  for (const [w, h] of [[375, 812], [1280, 800]]) {
    erros.length = 0;
    await tela(w, h);
    await comArmazenamento({ mb_tema: "papel" }, "/");
    await cdp("Network.enable");
    await cdp("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await avaliar("[...document.querySelectorAll('.mb-item__faixa button')].find((b) => b.textContent.trim() === 'Registrar').click(); true");
    await espera(700);
    await avaliar("(() => { const p = document.querySelector('body > aside.mb-lateral'); const t = p.querySelector('textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Falou que quer visitar no sábado'); t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()");
    await avaliar("document.querySelector('body > aside.mb-lateral .mb-opcoes--linha .mb-opcao').click(); true");
    await espera(200);
    await avaliar("[...document.querySelectorAll('body > aside.mb-lateral .mb-lateral__rodape button')].find((b) => b.textContent.trim() === 'Registrar').click(); true");
    await espera(900);
    await print(`registrar-sem-internet-${w}-papel`);
    const r = await avaliar(`(() => { const p = document.querySelector('body > aside.mb-lateral'); const av = p.querySelector('.mb-aviso--erro .mb-aviso__titulo, .mb-aviso--erro'); const bt = [...p.querySelectorAll('.mb-lateral__rodape button')].find((b) => b.textContent.trim() === 'Registrar'); const a = av && av.getBoundingClientRect(); const b = bt && bt.getBoundingClientRect();
      return { erro: av && av.textContent.trim(), aberto: p.classList.contains('mb-lateral--aberto'), digitado: p.querySelector('textarea').value, perto: !!a && !!b && Math.abs(a.bottom - b.top) < 400, offline: !navigator.onLine, rascunho: Object.keys(sessionStorage).filter((k) => /rascunho|interacao/i.test(k)).length }; })()`);
    await cdp("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    confere(`Registrar sem internet ${w}`, r.offline && /Sem internet: não foi gravado\. Tente de novo quando a conexão voltar\./.test(r.erro ?? "") && r.aberto && r.digitado === "Falou que quer visitar no sábado" && r.perto && r.rascunho > 0, r);
  }
  writeFileSync(join(saida, "resultado.json"), JSON.stringify(resultado, null, 2));
  const falhasMsg = Object.values(resultado).filter((r) => !r.ok).length;
  console.log(`\n${Object.keys(resultado).length} conferências, ${falhasMsg} falhas. Prints em ${saida}`);
  ws.close();
  process.exit(falhasMsg ? 1 : 0);
}

const PERFIS_MOLDURA = [["corretor", "/"], ["geral", "/?qa=geral"]];
for (const [perfil, caminho] of PERFIS_MOLDURA) {
  const ehGG = perfil === "geral";
  for (const [w, h] of [[375, 812], [1280, 800]]) {
    for (const tema of ["papel", "grafite"]) {
      erros.length = 0;
      await tela(w, h);
      await comArmazenamento({ mb_tema: tema }, caminho);
      const m = await avaliar(`(${medirNaPagina.toString()})()`);
      const p = await avaliar(`(${paridadeNaPagina.toString()})()`);
      const semAnel = await focoVisivel(w < 768 ? 5 : 10);
      await avaliar("document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); true");
      await print(`moldura-${perfil}-${w}-${tema}`);
      const comuns = !m.rolagemLateral && m.theme === tema && !m.busca && !m.sino && m.novoLead === 1 && m.pecasNaPonte === 0 && (w < 768 || m.modulosNoMenu === ehGG) && p.marcasDiferentes === 0 && p.marcasSemRole === 0 && p.iconesDiferentes === 0 && p.faltam.length === 0 && semAnel.length === 0;
      if (w >= 768) {
        confere(`moldura ${perfil} ${w} ${tema}`, comuns && m.menuVisivel && m.menuLargura === 248 && m.topoVisivel && !m.celularVisivel && !m.faixaVisivel && m.contasNoTopo === 1 && !m.contaNoMenu && m.itemAtual === (ehGG ? "Início" : "Lista do dia") && m.logo?.ok === true && m.logo.src.endsWith("/alicerce/mbigucci-logotipo.png") && m.h1 === 1 && erros.length === 0 && m.grupos.join() === (ehGG ? "Rotina,Gestão,Programa,Administração,Atalhos" : "Rotina,Gestão,Programa,Atalhos"), { ...m, ...p, semAnel, erros: [...erros] });
      } else {
        confere(`moldura ${perfil} ${w} ${tema}`, comuns && !m.menuVisivel && !m.topoVisivel && m.celularVisivel && m.contasNoTopo === 0 && m.contaNaFolha && m.modulosNaFolha === ehGG && m.pequenosTopo.length === 0 && m.h1 === 1 && erros.length === 0, { ...m, ...p, semAnel, erros: [...erros] });
        // A folha aberta: itens de 48px, Módulos só para o gerente geral, Esc fecha e devolve o foco.
        await avaliar(`document.querySelector('.mb-celular-topo .mb-menu-icone').click()`);
        await espera(500);
        const f = await avaliar(`(() => { const f = document.querySelector('.mb-folha'); const b = document.querySelector('.mb-celular-topo .mb-menu-icone'); return { aberta: f.classList.contains('mb-folha--aberta'), expandido: b.getAttribute('aria-expanded'), rotulo: b.getAttribute('aria-label'), foco: document.activeElement?.textContent.trim().slice(0, 20) }; })()`);
        const mf = await avaliar(`(${medirNaPagina.toString()})()`);
        await print(`moldura-${perfil}-${w}-${tema}-folha`);
        await avaliar(`document.querySelector('.mb-folha').scrollTop = 99999; true`);
        await espera(150);
        await print(`moldura-${perfil}-${w}-${tema}-folha-fim`);
        await avaliar(`document.querySelector('.mb-folha').scrollTop = 0; true`);
        await teclar("Escape", "Escape", 27);
        await espera(500);
        const depois = await avaliar(`(() => { const f = document.querySelector('.mb-folha'); const b = document.querySelector('.mb-celular-topo .mb-menu-icone'); return { aberta: f.classList.contains('mb-folha--aberta'), expandido: b.getAttribute('aria-expanded'), foco: document.activeElement === b }; })()`);
        confere(`folha ${perfil} ${tema}: abre, itens de 44px ou mais, Esc fecha e devolve o foco`, f.aberta && f.expandido === "true" && f.rotulo === "Fechar menu" && mf.pequenosFolha.length === 0 && !depois.aberta && depois.expandido === "false" && depois.foco, { f, depois, pequenosFolha: mf.pequenosFolha });
      }
      // Módulos: só o gerente geral tem o item; o popup abre ao lado, o atual com ✓, Esc fecha e devolve o foco.
      if (w >= 768 && ehGG) {
        await avaliar(`document.querySelector('.mb-menu__modulos').click()`);
        await espera(400);
        const mo = await avaliar(`(${seletoresDeModulos.toString()})()`);
        await print(`moldura-${perfil}-${w}-${tema}-modulos`);
        await teclar("Escape", "Escape", 27);
        await espera(300);
        const depois = await avaliar(`({ aberto: !document.querySelector('.mb-popup--lado').hidden, expandido: document.querySelector('.mb-menu__modulos').getAttribute('aria-expanded'), foco: document.activeElement === document.querySelector('.mb-menu__modulos') })`);
        confere(`Módulos ${perfil} ${tema}: abre ao lado com Vendas ✓ e Marketing, Esc fecha`, mo.aberto && mo.posicaoFixa && mo.porCima && mo.faltam.length === 0 && mo.ariaControlsBate && mo.focoNoPrimeiro && mo.itens.join() === "Vendas (atual),Marketing" && !depois.aberto && depois.expandido === "false" && depois.foco, { mo, depois });
      }
    }
  }
}

// Configurações (só do gerente geral): o índice .mb-ajustes, os quatro links sempre à vista e as seções antigas na ponte.
for (const [w, h] of [[1280, 800], [375, 812]]) {
  for (const tema of ["papel", "grafite"]) {
    erros.length = 0;
    await tela(w, h);
    await comArmazenamento({ mb_tema: tema }, "/configuracoes/");
    const c = await avaliar(`(() => {
      const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
      const q = (s) => document.querySelector(s);
      const qs = (s) => [...document.querySelectorAll(s)];
      const altura = (e) => { const r = e.getBoundingClientRect(); const a = getComputedStyle(e, '::after'); const ext = a.position === 'absolute' && a.content !== 'none' ? parseFloat(a.height) || 0 : 0; return Math.max(r.height, ext); };
      const links = qs('#areas a.mb-lista__titulo').filter(vis).map((a) => a.getAttribute('href').replace(/^\\/vendas/, ''));
      return {
        rolagemLateral: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        indiceVisivel: vis(q('.mb-ajustes__indice')), indice: qs('.mb-ajustes__indice a').map((a) => a.textContent.trim()), indiceAtual: q('.mb-ajustes__indice a[aria-current="true"]')?.textContent.trim() ?? null,
        links, itemAtual: q('.mb-menu__item[aria-current="page"] .mb-menu__rotulo')?.textContent.trim() ?? null,
        h1: qs('main h1').filter(vis).map((e) => e.textContent.trim()),
        secoesAntigasNaPonte: ['horario', 'mensagens', 'permissoes'].every((id) => q('#' + id + ' > .ds-antigo')),
        indiceForaDaPonte: !q('.ds-antigo .mb-ajustes') && !q('.ds-antigo .mb-menu') && !q('.ds-antigo .mb-topo'),
        pequenos: ${w < 768} ? qs('.mb-ajustes a, .mb-celular-topo a, .mb-celular-topo button').filter(vis).filter((e) => altura(e) < 43.5).map((e) => e.textContent.trim().slice(0, 30)) : [],
      };
    })()`);
    await print(`moldura-configuracoes-${w}-${tema}`);
    const esperados = ["/usuarios/", "/equipes/", "/faixas/", "/distribuicao/"];
    confere(`Configurações ${w} ${tema}`, !c.rolagemLateral && c.indiceVisivel === (w >= 1024) && c.indice.length === 4 && esperados.every((e, i) => c.links[i] === e) && c.secoesAntigasNaPonte && c.indiceForaDaPonte && c.h1.length === 1 && c.h1[0] === "Configurações" && (w < 768 || c.itemAtual === "Configurações") && c.pequenos.length === 0 && erros.length === 0, { ...c, erros: [...erros] });
  }
}

// Menu fixo: o do gerente geral (o mais alto) acompanha a rolagem e mostra Módulos e Recolher menu sem rolar a página.
await tela(1280, 800);
await comArmazenamento({ mb_tema: "papel" }, "/?qa=geral");
{
  const medir = `(() => { const m = document.querySelector(".mb-menu"); const dentro = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }; return { posicao: getComputedStyle(m).position, altura: Math.round(m.getBoundingClientRect().height), alturaDaTela: window.innerHeight, rolaPorDentro: m.scrollHeight > m.clientHeight, rodapeVisivel: dentro(".mb-menu__modulos") && dentro(".mb-menu__recolher"), paginaRola: document.documentElement.scrollHeight > window.innerHeight, scrollY: Math.round(window.scrollY) }; })()`;
  const topo = await avaliar(medir);
  await print("geral-1280x800-papel-sem-rolar");
  await avaliar("window.scrollTo(0, document.documentElement.scrollHeight); true");
  await espera(300);
  const fim = await avaliar(medir);
  confere("menu fixo: Módulos e Recolher menu à vista sem rolar a página, e continuam ao rolar", topo.posicao === "sticky" && topo.altura === topo.alturaDaTela && topo.rolaPorDentro && topo.rodapeVisivel && topo.scrollY === 0 && fim.rodapeVisivel && fim.altura === fim.alturaDaTela && (!fim.paginaRola || fim.scrollY > 0), { topo, fim });
  await avaliar("window.scrollTo(0, 0); true");
}

// Menu recolhido: nasce recolhido, o rótulo vira dica, e o botão grava na chave do MB nas duas direções.
await tela(1280, 800);
await comArmazenamento({ mb_tema: "papel", mb_menu_recolhido: "sim" }, "/?qa=geral");
{
  const r0 = await avaliar(`({ largura: Math.round(document.querySelector('.mb-menu').getBoundingClientRect().width), rotulo: document.querySelector('.mb-menu__recolher .mb-menu__rotulo').textContent, expandido: document.querySelector('.mb-menu__recolher').getAttribute('aria-expanded'), atributo: document.documentElement.getAttribute('data-menu-recolhido') })`);
  await print("moldura-geral-1280-papel-recolhido");
  const alvo = await caixaDe(".mb-menu__item[href$='/painel/']");
  if (alvo) await passarMouse(alvo.x, alvo.y);
  await espera(400);
  const dica = await avaliar(`(() => { const e = document.querySelector(".mb-menu__item[href$='/painel/'] .mb-menu__rotulo"); const c = getComputedStyle(e); const r = e.getBoundingClientRect(); const m = document.querySelector(".mb-menu").getBoundingClientRect(); return { opacidade: c.opacity, visivel: c.visibility, fixa: c.position === "fixed", aDireitaDoMenu: r.left >= m.right }; })()`);
  await print("moldura-geral-1280-papel-recolhido-dica");
  await avaliar(`document.querySelector('.mb-menu__recolher').click()`);
  await espera(300);
  const r1 = await avaliar(`({ largura: Math.round(document.querySelector('.mb-menu').getBoundingClientRect().width), rotulo: document.querySelector('.mb-menu__recolher .mb-menu__rotulo').textContent, expandido: document.querySelector('.mb-menu__recolher').getAttribute('aria-expanded'), atributo: document.documentElement.getAttribute('data-menu-recolhido'), chave: localStorage.getItem('mb_menu_recolhido') })`);
  await avaliar(`document.querySelector('.mb-menu__recolher').click()`);
  await espera(300);
  const r2 = await avaliar(`({ largura: Math.round(document.querySelector('.mb-menu').getBoundingClientRect().width), rotulo: document.querySelector('.mb-menu__recolher .mb-menu__rotulo').textContent, atributo: document.documentElement.getAttribute('data-menu-recolhido'), chave: localStorage.getItem('mb_menu_recolhido') })`);
  confere("menu recolhido: nasce recolhido (64px), a dica aparece no hover", r0.largura === 64 && r0.rotulo === "Expandir menu" && r0.expandido === "false" && r0.atributo === "sim" && dica.opacidade === "1" && dica.visivel === "visible" && dica.fixa && dica.aDireitaDoMenu, { r0, dica });
  confere("Recolher menu grava mb_menu_recolhido nas duas direções", r1.largura === 248 && r1.rotulo === "Recolher menu" && r1.expandido === "true" && r1.atributo === "nao" && r1.chave === "nao" && r2.largura === 64 && r2.rotulo === "Expandir menu" && r2.atributo === "sim" && r2.chave === "sim", { r1, r2 });
}

// Barras fixas das telas antigas começam depois do menu (alicerce-local.css, regra 3).
const sondaFixa = `(() => { const d = document.createElement('div'); d.className = 'fixed inset-x-0 bottom-0'; document.querySelector('.mb-app__conteudo').appendChild(d); const l = Math.round(d.getBoundingClientRect().left); d.remove(); return l; })()`;
for (const [recolhido, esperado] of [["nao", 248], ["sim", 64]]) {
  await comArmazenamento({ mb_tema: "papel", mb_menu_recolhido: recolhido }, "/?qa=geral");
  const left = await avaliar(sondaFixa);
  confere(`barra fixa antiga começa depois do menu (${esperado}px)`, left === esperado, { left });
}
await tela(375, 812);
{
  await comArmazenamento({ mb_tema: "papel" }, "/?qa=geral");
  const left = await avaliar(sondaFixa);
  confere("barra fixa antiga no celular ocupa a largura toda", left === 0, { left });
}

// Impressão: a moldura não sai no papel. O painel e o relatório do corretor são impressos em A4, onde a página
// tem uns 700px (menos que 768px), então valem as regras do celular: a faixa de status não pode sair.
for (const [perfil, caminho] of PERFIS_MOLDURA) {
  for (const larguraPapel of [703, 1280]) {
    await cdp("Emulation.setDeviceMetricsOverride", { width: larguraPapel, height: 1000, deviceScaleFactor: 1, mobile: false });
    await comArmazenamento({ mb_tema: "papel" }, caminho);
    await cdp("Emulation.setEmulatedMedia", { media: "print", features: [] });
    await espera(300);
    const visiveis = await avaliar(`[...document.querySelectorAll('.mb-menu, .mb-topo, .mb-celular-topo, .mb-celular-status, .mb-folha, .mb-folha__veu, .mb-popup, .mb-status, .mb-conta, .sem-impressao')].filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden').map((e) => e.className.toString().split(' ')[0])`);
    await cdp("Emulation.setEmulatedMedia", { media: "", features: [] });
    confere(`impressão ${perfil} ${larguraPapel}px: sem menu, topo, faixa de status nem conta`, visiveis.length === 0, { visiveis });
  }
}

writeFileSync(join(saida, "resultado.json"), JSON.stringify(resultado, null, 2));
const falhas = Object.values(resultado).filter((r) => !r.ok).length;
console.log(`\n${Object.keys(resultado).length} conferências, ${falhas} falhas. Prints em ${saida}`);
ws.close();
process.exitCode = falhas ? 1 : 0;
