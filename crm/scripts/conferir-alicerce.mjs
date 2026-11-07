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
// Os prints vão para crm/local/ (fora do Git).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argumentos = process.argv.slice(2);
const soMoldura = argumentos.includes("--moldura");
const soLista = argumentos.includes("--lista");
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

if (!soMoldura && !soLista) {
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

const anelDeFoco = () => avaliar(`(() => { const e = document.activeElement; if (!e || e === document.body) return null; const c = getComputedStyle(e); const anel = (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2) || (c.boxShadow && c.boxShadow !== 'none'); return { ok: !!anel, quem: (e.getAttribute('aria-label') || e.textContent || e.className).trim().replace(/\\s+/g, ' ').slice(0, 30) }; })()`);
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

if (!soMoldura) {
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
