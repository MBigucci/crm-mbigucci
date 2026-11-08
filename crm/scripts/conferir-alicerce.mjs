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
// - o Novo lead do passo g (--novo; asserções: medidas, HTML dos previews, validação, WhatsApp, rascunho, empreendimento, duplicado e Cadastro Mágico): node scripts/conferir-alicerce.mjs local/alicerce/passo-g --novo
//   Como corretor (/leads/novo/) e como gerente (?qa=gerente, o lead da empresa), em 375 e 1280, papel e grafite; o erro
//   de validação, o aviso de duplicado (WhatsApp de um lead visível e o de outra carteira, dos fixtures) e o Cadastro Mágico.
// Os prints vão para crm/local/ (fora do Git).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const argumentos = process.argv.slice(2);
const soMoldura = argumentos.includes("--moldura");
const soLista = argumentos.includes("--lista");
const soMensagens = argumentos.includes("--mensagens");
const soLeads = argumentos.includes("--leads");
const soFicha = argumentos.includes("--ficha");
const soNovo = argumentos.includes("--novo");
const soConta = argumentos.includes("--conta");
const soParcerias = argumentos.includes("--parcerias");
const soInicioVendas = argumentos.includes("--inicio-vendas");
const soEtapas = argumentos.includes("--etapas-parceiro");
const soPainelMetasRanking = argumentos.includes("--painel-metas-ranking");

// Só altera a cópia gerada, nunca a sessão, os dados ou as credenciais do app.
// Execute depois de visual-preview.mjs e antes do build: node scripts/conferir-alicerce.mjs --preparar-parcerias
if (argumentos.includes("--preparar-parcerias")) {
  const sessao = ".visual-preview/src/lib/sessao.tsx";
  writeFileSync(sessao, readFileSync(sessao, "utf8").replace("'distribuicao.produtos']", "'distribuicao.produtos','parceiros.cadastrar']"));
  const fixture = ".visual-preview/src/lib/visual-fixtures.ts";
  let s = readFileSync(fixture, "utf8");
  s = s.replace("parceiros:[parceiro],parceiros_situacao:[{", "parceiros:[parceiro, {...parceiro,id:'par-2',nome:'Bruno Exemplo',empresa:null,creci:'23456-F',whatsapp_norm:'5511999990003',ultima_interacao_em:at(-45)}, {...parceiro,id:'par-3',nome:'Célia Exemplo',empresa:'Horizonte Exemplo',creci:'34567-F',whatsapp_norm:'5511999990004',ultima_interacao_em:null,atribuido_em:at(-10)}, {...parceiro,id:'par-outro',nome:'Daniel Exemplo',gerente_id:'gerente-2',whatsapp_norm:null}],parceiros_situacao:[{parceiro_id:'par-2',ativo:true,estagio:'apresentado',dias_prazo:45,dias_restantes:45,faixa:'atencao',proximo_contato:null},{parceiro_id:'par-3',ativo:true,estagio:'novo',dias_prazo:10,dias_restantes:80,faixa:'ok',proximo_contato:null},{parceiro_id:'par-outro',ativo:true,estagio:'contatado',dias_prazo:20,dias_restantes:70,faixa:'ok',proximo_contato:null},{");
  s = s.replace(" profiles, leads, visitas, vendas,", " profiles:[...profiles,{id:'gerente',nome:'Gerente Exemplo',perfil:'gerente'},{id:'gerente-2',nome:'Outro Gerente Exemplo',perfil:'gerente'}], leads, visitas, vendas,");
  s = s.replace("parceiro_regioes:[", "parceiro_eventos:[{parceiro_id:'par-1',tipo:'reentrada_aviso',criado_em:at(0)}],parceiro_regioes:[");
  // Simula a RLS só na fixture: gerente vê os próprios; GG vê a carteira completa.
  s = s.replace("this.rows=[...(tables[name]??[])];", "this.rows=[...(tables[name]??[])]; if(name==='parceiros' && typeof location!=='undefined' && !location.search.includes('qa=geral')) this.rows=this.rows.filter(x=>x.gerente_id==='gerente');");
  // Respostas de duplicado apenas na cópia; nenhuma escrita habilitada.
  s = s.replace('rpc:async(name:string,args?:Record<string,any>)=>', `rpc:async(name:string,args?:Record<string,any>)=> name==='parceiro_cadastrar' && args?.p_whatsapp==='11999990002' ? {data:{status:'seu',parceiro_id:'par-1'},error:null} : name==='parceiro_cadastrar' && args?.p_creci==='99999-F' ? {data:{status:'ja_cadastrado',dono_nome:'Outro Gerente Exemplo'},error:null} :`);
  s = s.replaceAll("whatsapp_norm:'551199999000", "whatsapp_norm:'1199999000");
  writeFileSync(fixture, s);
  console.log("Prévia de Parcerias preparada: dados fictícios, gravações bloqueadas.");
  process.exit(0);
}

// Bloco 2: após visual-preview.mjs e --preparar-parcerias. Alterações só na cópia gerada.
if (argumentos.includes("--preparar-inicio-vendas")) {
  const caminhoSessao = ".visual-preview/src/lib/sessao.tsx";
  let sessao = readFileSync(caminhoSessao, "utf8");
  sessao = sessao.replace("'parceiros.cadastrar']", "'parceiros.cadastrar','vendas.corrigir_equipe']");
  sessao = sessao.replace("perfil:'gerente_geral'", "perfil:'gerente_geral',equipe_id:null").replace("id:'gerente',perfil:'gerente'", "id:'gerente',perfil:'gerente',equipe_id:null");
  sessao = sessao.replace(" const perfil=geral?", " if(qa==='apoio'){setEstado({fase:'pronto',perfil:{...profiles[0],id:'apoio',perfil:'operacional'},permissoes:[]});return;} const perfil=geral?");
  writeFileSync(caminhoSessao, sessao);
  const caminhoFixture = ".visual-preview/src/lib/visual-fixtures.ts";
  let fixture = readFileSync(caminhoFixture, "utf8");
  fixture = fixture.replace("const empreendimento =", "vendas.push({...vendas[1],id:'venda-3',corretor_id:'corretor-2',lead_id:leads[3].id,lead:leads[3],unidade:'303',vgv:890000}, {...vendas[1],id:'venda-cancelada',unidade:'404',vgv:460000,status:'cancelada',observacao:'Cliente desistiu antes do pagamento.',motivo_cancelamento:'Desistência do cliente.'} as any);\nconst empreendimento =");
  fixture = fixture.replace("rows:Row[]; singleRow=false; blocked=false;", "rows:Row[]; singleRow=false; blocked=false; erroLeitura=false; espera=false;");
  fixture = fixture.replace("constructor(name:string) { this.rows=[...(tables[name]??[])];", "constructor(name:string) { const qa=typeof location!=='undefined'?new URLSearchParams(location.search).get('qa'):''; this.erroLeitura=name==='vendas'&&qa==='vendas-erro'; this.espera=name==='vendas'&&qa==='vendas-espera'; this.rows=[...(tables[name]??[])]; if(name==='vendas'&&qa!=='gerente'&&qa!=='geral') this.rows=this.rows.filter(x=>x.corretor_id==='corretor-1');");
  fixture = fixture.replace("return Promise.resolve({data:this.blocked?", "if(this.espera) return new Promise<never>(()=>{}); return Promise.resolve({data:this.blocked?");
  fixture = fixture.replace("error:this.blocked?", "error:this.erroLeitura?{message:'Falha fictícia de leitura de vendas'}:this.blocked?");
  writeFileSync(caminhoFixture, fixture);
  console.log("Prévia de Início e Vendas preparada; leituras fictícias e gravações bloqueadas.");
  process.exit(0);
}

// Bloco 3: execute após --preparar-parcerias e --preparar-inicio-vendas, antes do build isolado.
if (argumentos.includes("--preparar-painel-metas-ranking")) {
  const caminhoSessao = ".visual-preview/src/lib/sessao.tsx";
  let sessao = readFileSync(caminhoSessao, "utf8");
  sessao = sessao.replace("path==='/vendas/painel/'", "(path==='/vendas/painel/' && qa!=='corretor')");
  writeFileSync(caminhoSessao, sessao);
  const caminhoFixture = ".visual-preview/src/lib/visual-fixtures.ts";
  let fixture = readFileSync(caminhoFixture, "utf8");
  fixture = fixture.replace("metas:[],", "metas:[{id:'meta-mensal',dono_id:'corretor-1',metrica:'vgv',periodo:'mes',inicio:null,meses:null,valor:1000000,no_painel:true,created_at:at(-30)},{id:'meta-visitas',dono_id:'corretor-1',metrica:'visitas',periodo:'mes',inicio:null,meses:null,valor:8,no_painel:true,created_at:at(-30)}],");
  fixture = fixture.replace("teams:[{", "teams:[{id:'equipe-2',nome:'Equipe Sul Exemplo',gerente_id:'gerente-2'},{");
  fixture = fixture.replace("this.erroLeitura=name==='vendas'&&qa==='vendas-erro'; this.espera=name==='vendas'&&qa==='vendas-espera';", "this.erroLeitura=(name==='vendas'&&qa==='vendas-erro')||(name==='lead_eventos'&&qa==='painel-erro')||(name==='vendas'&&qa==='metas-erro'); this.espera=(name==='vendas'&&qa==='vendas-espera')||(name==='lead_eventos'&&qa==='painel-espera')||(name==='vendas'&&qa==='metas-espera');");
  fixture = fixture.replace("this.rows=[...(tables[name]??[])];", "this.rows=[...(tables[name]??[])]; if(qa==='painel-vazio' && ['lead_eventos','leads','vendas','visitas'].includes(name)) this.rows=[];");
  fixture = fixture.replace("? {data:profiles.map((p,i)=>({corretor_id:p.id,nome:p.nome,pontos:150-i*70})),error:null}", "? (typeof location!=='undefined'&&location.search.includes('qa=ranking-espera') ? new Promise<never>(()=>{}) : typeof location!=='undefined'&&location.search.includes('qa=ranking-erro') ? {data:null,error:{message:'Falha fictícia de leitura do ranking'}} : {data:typeof location!=='undefined'&&location.search.includes('qa=ranking-vazio')?[]:[...Array.from({length:11},(_,i)=>({corretor_id:'rank-'+i,nome:'Corretor Exemplo '+String(i+1).padStart(2,'0'),pontos:200-Math.floor(i/2)*10})),{corretor_id:'corretor-1',nome:'Marina Exemplo',pontos:100}],error:null})");
  writeFileSync(caminhoFixture, fixture);
  console.log("Prévia do bloco 3 preparada; dados fictícios, empates e estados; gravações bloqueadas.");
  process.exit(0);
}

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

if (!soMoldura && !soLista && !soMensagens && !soLeads && !soFicha && !soNovo && !soConta && !soParcerias && !soInicioVendas && !soEtapas && !soPainelMetasRanking) {
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
        const pequenos = ${w < 768} ? [...document.querySelectorAll('.mb-aparencia button, .mb-cartao button')].filter(vis).filter(e => (e.classList.contains('mb-campo__mostrar') ? e.closest('.mb-campo__grupo') : e).getBoundingClientRect().height < 44).map(e => e.textContent.trim()) : [];
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

const anelDeFoco = () => avaliar(`(() => { const e = document.activeElement; if (!e || e === document.body) return null; const comAnel = (x) => { const c = getComputedStyle(x); return (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2) || (c.boxShadow && c.boxShadow !== 'none'); }; const nome = (e.getAttribute('aria-label') || e.textContent || e.className).trim().replace(/\\s+/g, ' ').slice(0, 30); const g = e.closest('.mb-campo__grupo'); if (g) { /* entrada dentro de um grupo (senha com Mostrar): o anel está no grupo (focus-within); compara o grupo com e sem foco, sem transição */ const antes = g.style.transition; g.style.transition = 'none'; const com = getComputedStyle(g).boxShadow + getComputedStyle(g).borderColor; e.blur(); const sem = getComputedStyle(g).boxShadow + getComputedStyle(g).borderColor; e.focus(); g.style.transition = antes; return { ok: com !== sem, quem: nome }; } const pai = e.closest('.mb-item, .mb-lista__item, tr'); const anel = comAnel(e) || (!!pai && comAnel(pai)); return { ok: !!anel, quem: (e.getAttribute('aria-label') || e.textContent || e.className).trim().replace(/\\s+/g, ' ').slice(0, 30) }; })()`);
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

// Fase 2, bloco 2: Início e Vendas. Um Chrome e uma conferência por vez.
// Etapas compactas, item separado do bloco 3. Não cria etapa nem regra de bloqueio na fixture.
if (soEtapas) {
  await tela(375, 812);
  for (const tema of ['papel','grafite']) {
    await comArmazenamento({mb_tema:tema,mb_movimento:'reduzido'},'/parceiros/ficha/?qa=gerente&id=par-1');
    for (const [id,etapa,nome] of [['par-1',2,'Contatado'],['par-2',3,'Apresentado'],['par-3',1,'Novo']]) {
      await abrir('/parceiros/ficha/?qa=gerente&id='+id);
      const r=await avaliar(`(() => {const b=document.querySelector('.mb-etapas-bloco'), p=b?.querySelector('.mb-etapas-bloco__passo'), t=b?.querySelector('.mb-etapas-bloco__trilho'), etapas=b?.querySelectorAll('.mb-etapa');return {texto:p?.textContent,oculto:p?.getAttribute('aria-hidden'),visivel:p&&getComputedStyle(p).display!=='none',largura:t?.firstElementChild.style.width,atual:b?.querySelectorAll('[aria-current=step]').length,etapas:etapas?.length,lateral:document.documentElement.scrollWidth>innerWidth};})()`);
      confere(`Etapas ${id} ${tema}`,r.texto===`Etapa ${etapa} de 3 · ${nome}`&&r.oculto==='true'&&r.visivel&&r.atual===1&&r.etapas===3&&!r.lateral,r);
      confere(`Barra ${id} ${tema}`,Math.abs(parseFloat(r.largura)-etapa/3*100)<0.01,r.largura);
      await print(`ficha-${id}-375-${tema}`);await printInteiro(`ficha-${id}-375-${tema}-inteiro`);
      if(id==='par-1') {
        await print(`ficha-375-${tema}`);await printInteiro(`ficha-375-${tema}-inteiro`);
        for(const [botao,sufixo] of [['Editar cadastro','editar'],['Registrar interação','registrar']]) {
          await avaliar(`(() => {const b=[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()===${JSON.stringify(botao)});b?.focus();b?.click()})()`);await espera(400);
          confere(`Ficha ${sufixo} ${tema}`,await avaliar(`!!document.querySelector('.mb-lateral--aberto')`));
          await print(`ficha-375-${tema}-${sufixo}`);await teclar('Escape','Escape',27);await espera(250);
        }
      }
    }
    await abrir('/parceiros/ficha/?qa=geral&id=par-1');
    confere(`Etapas em leitura GG ${tema}`,await avaliar(`document.querySelector('.mb-etapas-bloco__passo')?.textContent==='Etapa 2 de 3 · Contatado'&&!document.querySelector('#registrar')`));
    await print(`ficha-geral-375-${tema}`);await printInteiro(`ficha-geral-375-${tema}-inteiro`);
  }
  confere('Nenhum erro no console',erros.length===0,erros);
  writeFileSync(join(saida,'resultado-etapas.json'),JSON.stringify(resultado,null,2));
  await cdp('Page.close');ws.close();process.exit(Object.values(resultado).some(r=>!r.ok)?1:0);
}

// Revisão da master no bloco 3: só Ranking, usando a mesma prévia isolada.
if (soPainelMetasRanking && argumentos.includes('--ranking-revisao')) {
  for (const [w,h] of [[375,812],[1280,800]]) for(const tema of ['papel','grafite']) {
    await tela(w,h);await comArmazenamento({mb_tema:tema,mb_movimento:'reduzido'},'/ranking/?qa=corretor');
    const id=`ranking-${w}-${tema}`;
    const r=await avaliar(`(() => {const rotulo=document.querySelector('.mb-periodo__rotulo')?.textContent;return {rotulo,titulo:document.querySelector('#t-ranking')?.textContent,detalhes:document.querySelectorAll('.mb-ranking__detalhe').length,lateral:document.documentElement.scrollWidth>innerWidth,voce:!!document.querySelector('.mb-ranking [aria-current=true]')};})()`);
    confere(id+' · mês com maiúscula no período e título',r.rotulo?.[0]===r.rotulo?.[0].toLocaleUpperCase('pt-BR')&&r.titulo==='Pontos aprovados · '+r.rotulo,r);
    confere(id+' · detalhe redundante removido, posição própria preservada',r.detalhes===0&&r.voce,r);
    confere(id+' · sem rolagem lateral',!r.lateral);
    const foco=await focoVisivel(w<768?9:16);confere(id+' · foco visível',!foco.length,foco);
    await avaliar('document.activeElement?.blur();window.scrollTo(0,0)');await print(id);await printInteiro(id+'-inteiro');
    await avaliar(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Ver ranking completo')?.click()`);await espera(150);await printInteiro(id+'-completo');
    await avaliar(`document.querySelector('.mb-periodo button')?.click()`);await espera(300);
    confere(id+' · outro mês também com maiúscula',await avaliar(`(() => {const t=document.querySelector('.mb-periodo__rotulo')?.textContent;return /^[A-ZÁÉÍÓÚ]/.test(t)&&document.querySelector('#t-ranking')?.textContent==='Pontos aprovados · '+t})()`));
    await print(id+'-anterior');
  }
  confere('Nenhum erro no console',erros.length===0,erros);
  writeFileSync(join(saida,'resultado-ranking-revisao.json'),JSON.stringify(resultado,null,2));
  await cdp('Page.close');ws.close();process.exit(Object.values(resultado).some(r=>!r.ok)?1:0);
}

if (soPainelMetasRanking) {
  const tocar=(seletor,texto)=>avaliar(`(() => {const e=[...document.querySelectorAll(${JSON.stringify(seletor)})].find(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&(${texto===undefined?'true':`e.textContent.trim()===${JSON.stringify(texto)}`}));if(!e)return false;e.focus();e.click();return true;})()`);
  const preencher=(seletor,valor)=>avaliar(`(() => {const e=document.querySelector(${JSON.stringify(seletor)});if(!e)return false;const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));return true;})()`);
  const checar=async(id,w)=>{
    const r=await avaliar(`(() => {const vis=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';const controles=[...document.querySelectorAll('main button,main select,main input:not([type=checkbox]),.mb-lateral--aberto button,.mb-lateral--aberto input:not([type=checkbox]),.mb-lateral--aberto select')].filter(vis).filter(e=>!e.disabled);return {lateral:document.documentElement.scrollWidth>innerWidth,legado:!!document.querySelector('main .ds-antigo,main .btn,main .card,main .input,main [class*="-antigo"]'),h1:document.querySelectorAll('main h1').length,pequenos:controles.filter(e=>e.getBoundingClientRect().height<43.5).map(e=>({nome:(e.textContent||e.id).trim().slice(0,40),h:e.getBoundingClientRect().height})),tabelas:document.querySelectorAll('.mb-tabela').length};})()`);
    confere(id+' · sem rolagem lateral',!r.lateral,r);
    confere(id+' · Casca e peças Alicerce',!r.legado&&r.h1===1,r);
    confere(id+' · Pares sem caixas intermediárias',await avaliar(`![...document.querySelectorAll('main dl.mb-pares')].some(dl=>[...dl.children].some(e=>!['DT','DD'].includes(e.tagName)))`));
    if(w<768)confere(id+' · alvos 44px',!r.pequenos.length,r.pequenos);
  };
  const rotas=[['painel-equipe','/painel/?qa=gerente'],['painel-proprio','/painel/?qa=corretor'],['painel-corretor','/painel/?qa=gerente&c=corretor-1'],['painel-geral','/painel/?qa=geral'],['metas-proprias','/metas/?qa=corretor'],['metas-equipe','/metas/?qa=gerente'],['metas-definir','/metas/?qa=geral'],['ranking','/ranking/?qa=corretor']];
  for(const [w,h] of [[375,812],[1280,800]])for(const tema of ['papel','grafite']){
    await tela(w,h);await comArmazenamento({mb_tema:tema,mb_movimento:'reduzido'},rotas[0][1]);
    for(const [nome,rota] of rotas){
      await abrir(rota);const id=`${nome}-${w}-${tema}`;
      await checar(id,w);const foco=await focoVisivel(w<768?10:16);confere(id+' · foco visível',!foco.length,foco);
      await avaliar('document.activeElement?.blur();window.scrollTo(0,0)');await print(id);await printInteiro(id+'-inteiro');
      if(nome==='painel-equipe'){
        confere(id+' · números alinhados à direita',await avaliar(`!!document.querySelector('td.mb-tabela__num')&&[...document.querySelectorAll('td.mb-tabela__num')].every(e=>getComputedStyle(e).textAlign==='right')`));
        confere(id+' · tabelas numéricas únicas e totais',await avaliar(`document.querySelectorAll('.mb-tabela--numeros').length>=5&&[...document.querySelectorAll('.mb-tabela--numeros')].filter(t=>!t.closest('[aria-labelledby=t-conversao]')).every(t=>t.tFoot&&t.classList.contains('mb-tabela--primeira-fixa'))`));
        const contagem=await avaliar(`(() => {const b=[...document.querySelectorAll('button.mb-indicador')].find(e=>e.getAttribute('aria-disabled')!=='true');window.__numero=b;return Number(b?.querySelector('.mb-indicador__valor')?.textContent)})()`);
        await avaliar('window.__numero?.focus();window.__numero?.click()');await espera(450);
        confere(id+' · número abre o mesmo conjunto na folha larga',await avaliar(`(() => {const p=document.querySelector('.mb-lateral--larga.mb-lateral--aberto');return p?.parentElement===document.body&&p.contains(document.activeElement)&&p.querySelectorAll('tbody tr').length===${contagem}&&p.querySelector('.mb-relatorio__resumo')?.textContent.includes('${contagem} registros')})()`));
        await checar(id+'-relatorio',w);await print(id+'-relatorio');
        await preencher('.mb-lateral--aberto input[type=search]','zzzzz');await espera(150);confere(id+' · busca do relatório',await avaliar(`document.querySelector('.mb-lateral--aberto .mb-relatorio__resumo')?.textContent.includes('0 registros')&&!!document.querySelector('.mb-lateral--aberto .mb-vazio')`));
        await preencher('.mb-lateral--aberto input[type=search]','');await espera(150);await tocar('.mb-lateral--aberto button','Exportar');await espera(150);await print(id+'-exportar');
        confere(id+' · formatos disponíveis',await avaliar(`document.querySelectorAll('.mb-lateral--aberto [role=menuitem]').length===4`));
        if(w===1280 && tema==='papel') {
          const pasta=resolve(saida,'exportacoes');mkdirSync(pasta,{recursive:true});await cdp('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:pasta});
          const dataArquivo=await avaliar('new Date().toISOString().slice(0,10)');
          await tocar('.mb-lateral--aberto [role=menuitem]','Planilha (Excel)');await espera(500);
          const excel=readFileSync(join(pasta,'leads-painel-'+dataArquivo+'.xml'),'utf8');
          confere('Excel: arquivo real, mesmas linhas e colunas',excel.includes('Excel.Sheet')&&excel.includes('<Worksheet')&&(excel.match(/<Row>/g)||[]).length===contagem+1&&excel.includes('Informações'));
          await tocar('.mb-lateral--aberto button','Exportar');await espera(100);await tocar('.mb-lateral--aberto [role=menuitem]','CSV');await espera(500);
          const csv=readFileSync(join(pasta,'leads-painel-'+dataArquivo+'.csv'),'utf8');
          confere('CSV: arquivo real, mesmas linhas e colunas',csv.startsWith('\ufeff"Lead";"Informações"')&&csv.split('\r\n').length===contagem+1);
          await avaliar('document.documentElement.dataset.relatorioNumero="sim"');await cdp('Emulation.setEmulatedMedia',{media:'print'});
          confere('Impressão do relatório: só o recorte aberto',await avaliar(`(() => {const p=document.querySelector('.pmr-relatorio.mb-lateral--aberto');return getComputedStyle(p).display!=='none'&&getComputedStyle(document.querySelector('.mb-app')).display==='none'&&p.querySelectorAll('tbody tr').length===${contagem}&&getComputedStyle(p.querySelector('.mb-tabela')).fontSize==='16px';})()`));
          await printInteiro('relatorio-impressao-1280-papel');await cdp('Emulation.setEmulatedMedia',{media:'screen'});await avaliar('delete document.documentElement.dataset.relatorioNumero');
        }
        await teclar('Escape','Escape',27);await espera(250);
        if(await avaliar(`!!document.querySelector('.mb-lateral--aberto')`)){await teclar('Escape','Escape',27);await espera(200);}
        confere(id+' · fecha e devolve foco',await avaliar('!document.querySelector(".mb-lateral--aberto")&&document.activeElement===window.__numero'));
        await tocar('.mb-segmentado button','Mês');await espera(300);confere(id+' · período na URL',await avaliar(`new URLSearchParams(location.search).get('p')==='mes'`));
      }
      if(nome==='painel-geral'){
        await preencher('select#equipe','equipe-2');await espera(300);confere(id+' · equipe na URL',await avaliar(`new URLSearchParams(location.search).get('e')==='equipe-2'`));
      }
      if(nome==='painel-proprio')confere(id+' · Meta e Funil oficiais',await avaliar(`!!document.querySelector('.mb-meta__trilho[role=img]')&&!!document.querySelector('.mb-funil--vendas')&&!document.querySelector('#t-entrada')`));
      if(nome==='metas-proprias'){
        confere(id+' · valores e barras oficiais',await avaliar(`document.querySelectorAll('.mb-meta').length===3&&document.querySelectorAll('.mb-meta__trilho[role=img]').length===3&&document.querySelectorAll('[role=switch]').length===2`));
        await tocar('button','+ Nova meta');await espera(400);await checar(id+'-nova',w);await print(id+'-nova');
        await tocar('button[type=submit]','Criar meta');await espera(150);confere(id+' · validação e foco',await avaliar(`document.activeElement?.id==='meta-valor'&&!!document.querySelector('[aria-invalid=true]')`));await print(id+'-validacao');
        await tocar('.mb-opcao','Personalizado');await espera(200);await print(id+'-personalizada');
        confere(id+' · período personalizado',await avaliar(`!!document.querySelector('#meta-inicio')&&!!document.querySelector('#meta-meses')`));
        await teclar('Escape','Escape',27);await espera(250);confere(id+' · fecha formulário e devolve foco',await avaliar(`document.activeElement?.textContent.trim()==='+ Nova meta'`));
        await tocar('button','Editar');await espera(400);await print(id+'-editar');await teclar('Escape','Escape',27);await espera(250);
      }
      if(nome==='metas-definir'){
        confere(id+' · só GG define',await avaliar(`!!document.querySelector('#definir-metas')`));await tocar('summary');await espera(150);await printInteiro(id+'-por-corretor');
        await preencher('#meta-geral','12000000');await espera(150);await print(id+'-alterada');
        confere(id+' · salvar aparece com alteração',await avaliar(`!!document.querySelector('button[type=submit]')`));
      }
      if(nome==='metas-equipe')confere(id+' · gerente consulta sem definir',await avaliar(`!!document.querySelector('.mb-tabela--numeros')&&!document.querySelector('#definir-metas')`));
      if(nome==='ranking'){
        confere(id+' · empates e posição própria fora do top 10',await avaliar(`document.querySelectorAll('.mb-ranking__item').length===12&&document.querySelector('.mb-ranking [aria-current=true]')?.textContent.includes('Marina Exemplo')&&document.querySelectorAll('.mb-ranking__posicao')[0].textContent===document.querySelectorAll('.mb-ranking__posicao')[1].textContent`));
        await tocar('button','Ver ranking completo');await espera(150);await printInteiro(id+'-completo');confere(id+' · completo preserva todos',await avaliar(`document.querySelectorAll('.mb-ranking__posicao').length===12`));
        await tocar('.mb-periodo button','← Anterior');await espera(300);confere(id+' · mês na URL',await avaliar(`!!new URLSearchParams(location.search).get('mes')`));
      }
    }
    for(const [nome,rota,qa,tipo] of [['painel','painel','painel-erro','erro'],['metas','metas','metas-erro','erro'],['ranking','ranking','ranking-erro','erro'],['painel','painel','painel-espera','espera'],['metas','metas','metas-espera','espera'],['ranking','ranking','ranking-espera','espera'],['painel','painel','painel-vazio','vazio'],['ranking','ranking','ranking-vazio','vazio']]){
      await abrir(`/${rota}/?qa=${qa}`);const id=`${nome}-${tipo}-${w}-${tema}`;await print(id);await checar(id,w);
      confere(id+' · estado apropriado',await avaliar(tipo==='erro'?`!!document.querySelector('.mb-estado__sobrelinha')&&!document.querySelector('main')?.textContent.includes('Falha fictícia')`:tipo==='espera'?`!!document.querySelector('[aria-busy=true] .mb-esqueleto')`:`!!document.querySelector('.mb-vazio')||document.querySelectorAll('.mb-indicador[aria-disabled=true]').length===3`));
    }
    await abrir('/metas/?qa=apoio');confere(`Sem acesso metas ${w} ${tema}`,await avaliar(`document.querySelector('.mb-estado__sobrelinha')?.textContent==='Sem permissão'`));
    await abrir('/painel/?qa=apoio');confere(`Sem acesso painel ${w} ${tema}`,await avaliar(`document.querySelector('.mb-estado__sobrelinha')?.textContent==='Sem permissão'`));
  }
  confere('Nenhum erro no console',erros.length===0,erros);
  writeFileSync(join(saida,'resultado.json'),JSON.stringify(resultado,null,2));
  const falhas=Object.values(resultado).filter(r=>!r.ok).length;console.log(`${Object.keys(resultado).length} conferências, ${falhas} falhas. Capturas em ${saida}`);
  await cdp('Page.close');ws.close();process.exit(falhas?1:0);
}

if (soInicioVendas) {
  const tocar = (seletor, texto) => avaliar(`(() => { const b=[...document.querySelectorAll(${JSON.stringify(seletor)})].find(e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden' && (${texto === undefined ? 'true' : `e.textContent.trim()===${JSON.stringify(texto)}`}));if(!b)return false;b.focus();b.click();return true; })()`);
  const selecionar = (seletor, valor) => avaliar(`(() => {const e=document.querySelector(${JSON.stringify(seletor)});if(!e)return false;Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  const preencherRotulo = (rotulo, valor) => avaliar(`(() => {const p=document.querySelector('.mb-lateral--aberto');const l=[...p.querySelectorAll('label.mb-campo')].find(l=>l.querySelector('.mb-campo__rotulo')?.textContent.startsWith(${JSON.stringify(rotulo)}));const e=l?.querySelector('input,textarea');if(!e)return false;Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  const valorRotulo = rotulo => avaliar(`(() => {const p=document.querySelector('.mb-lateral--aberto');const l=[...p.querySelectorAll('label.mb-campo')].find(l=>l.querySelector('.mb-campo__rotulo')?.textContent.startsWith(${JSON.stringify(rotulo)}));return l?.querySelector('input,textarea')?.value;})()`);
  const medir = () => avaliar(`(() => {
    const vis=e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden' && !e.closest('details:not([open])') && !(innerWidth<768 && e.closest('thead'));
    const altura=e=>{const p=e.closest('.mb-item,.mb-lista__item,tr');return e.matches('.mb-item__alvo,.mb-lista__alvo,.mb-tabela__alvo')&&p?p.getBoundingClientRect().height:e.matches('input[type=checkbox]')?e.closest('label').getBoundingClientRect().height:e.getBoundingClientRect().height;};
    const inter=[...document.querySelectorAll('main button,main input,main select,main textarea,.mb-lateral--aberto button,.mb-lateral--aberto input,.mb-lateral--aberto select,.mb-lateral--aberto textarea')].filter(vis).filter(e=>!e.disabled);
    return {lateral:document.documentElement.scrollWidth>document.documentElement.clientWidth,pequenos:inter.filter(e=>altura(e)<43.5).map(e=>({nome:(e.textContent||e.getAttribute('aria-label')||e.id).trim().slice(0,40),altura:altura(e)})),legado:!!document.querySelector('main .ds-antigo,main .btn,main .input,main .card,main .selo-antigo,.mb-lateral--aberto .btn,.mb-lateral--aberto .input'),h1:document.querySelectorAll('main h1').length};
  })()`);
  const validar = async (id,w) => {const m=await medir();confere(id+' · Alicerce, h1 e sem rolagem lateral',!m.legado && !m.lateral && m.h1===1,m);if(w<768)confere(id+' · alvos 44px',!m.pequenos.length,m.pequenos);};
  const rotas=[['inicio-gerente','/?qa=gerente'],['inicio-geral','/?qa=geral'],['inicio-apoio','/?qa=apoio'],['vendas-gerente','/vendas/?qa=gerente'],['vendas-geral','/vendas/?qa=geral'],['vendas-corretor','/vendas/?qa=corretor']];
  for(const [w,h] of [[375,812],[1280,800]]) for(const tema of ['papel','grafite']) {
    await tela(w,h);await comArmazenamento({mb_tema:tema,mb_movimento:'reduzido'},'/?qa=gerente');
    for(const [nome,rota] of rotas) {
      await avaliar('sessionStorage.clear()');await abrir(rota);
      const id=`${nome}-${w}-${tema}`;await validar(id,w);
      const foco=await focoVisivel(w<768?8:14);confere(id+' · foco visível',!foco.length,foco);
      await avaliar('document.activeElement?.blur();window.scrollTo(0,0)');await print(id);await printInteiro(id+'-inteiro');
      if(nome==='inicio-gerente') confere(id+' · rotina e áreas preservadas',await avaliar(`!!document.querySelector('#parceiros-hoje + .mb-itens .mb-item') && document.querySelector('main .mb-lista a[href="/vendas/vendas/"]')?.textContent==='Vendas da equipe' && !!document.querySelector('main .mb-cartao')`));
      if(nome==='inicio-apoio') confere(id+' · Em construção',await avaliar(`document.querySelector('.mb-estado__sobrelinha')?.textContent==='Em construção'`));
      if(nome.startsWith('vendas-')) {
        confere(id+' · uma tabela ativa de registros e totais',await avaliar(`[...document.querySelectorAll('main table')].filter(t=>!t.closest('details')).length===1 && document.querySelectorAll('.mb-indicador').length===3 && !!document.querySelector('.mb-tabela--registros td[data-rotulo="VGV"]')`));
      }
      if(nome==='vendas-gerente') {
        await tocar('button.mb-tabela__alvo');await espera(350);await print(id+'-detalhe');
        await tocar('.mb-lateral--aberto button','Corrigir venda');await espera(250);await print(id+'-corrigir');
        await preencherRotulo('Unidade','QA-52');await tocar('.mb-lateral--aberto button[type=submit]');await espera(150);
        confere(id+' · correção exige motivo',await avaliar(`document.querySelector('.mb-lateral--aberto')?.textContent.includes('Escreva o motivo da correção.')`));
        await print(id+'-corrigir-motivo');await teclar('Escape','Escape',27);await espera(200);
        confere(id+' · Esc devolve foco à venda',await avaliar(`document.activeElement.matches('.mb-tabela__alvo')`));
        await tocar('button.mb-tabela__alvo');await espera(300);await tocar('.mb-lateral--aberto button','Cancelar venda');await espera(250);
        confere(id+' · diálogo do cancelamento e foco seguro',await avaliar(`!!document.querySelector('.mb-dialogo') && document.activeElement.textContent==='Manter venda' && !document.querySelector('.mb-lateral--aberto')`));
        await print(id+'-cancelar');await tocar('.mb-dialogo button[type=submit]');await espera(150);
        confere(id+' · cancelamento exige motivo',await avaliar(`document.querySelector('.mb-dialogo')?.textContent.includes('Escreva o motivo.')`));
        await tocar('.mb-dialogo button','Manter venda');await espera(300);
        confere(id+' · diálogo devolve foco à ação',await avaliar(`document.activeElement.textContent==='Cancelar venda' && !!document.querySelector('.mb-lateral--aberto')`));
        await teclar('Escape','Escape',27);await espera(150);
        await tocar('button.mb-tabela__alvo','Clara Exemplo');await espera(250);await tocar('.mb-lateral--aberto button','Marcar como paga');await espera(250);await print(id+'-pagar');await teclar('Escape','Escape',27);await espera(150);
        await tocar('summary');await espera(150);await printInteiro(id+'-canceladas');await tocar('.mb-recolhivel button.mb-tabela__alvo');await espera(250);await tocar('.mb-lateral--aberto button','Reativar venda');await espera(200);await print(id+'-reativar');await teclar('Escape','Escape',27);
        await selecionar('#corretor','corretor-2');await espera(500);
        confere(id+' · filtro no endereço',await avaliar(`new URLSearchParams(location.search).get('c')==='corretor-2' && document.querySelectorAll('main tbody tr').length===1`));
        await abrir(rota);await tocar('.mb-segmentado button','Ano');await espera(450);
        confere(id+' · período no endereço',await avaliar(`new URLSearchParams(location.search).get('p')==='ano'`));
        await tocar('.mb-periodo button','← Anterior');await espera(400);
        confere(id+' · período vazio distingue-se de erro',await avaliar(`!!document.querySelector('main .mb-vazio') && !document.querySelector('main .mb-estado--erro')`));await print(id+'-vazio');
      }
      if(nome==='vendas-corretor') {
        await tocar('button.mb-tabela__alvo');await espera(250);
        confere(id+' · corretor não corrige nem cancela',await avaliar(`![...document.querySelectorAll('.mb-lateral--aberto button')].some(b=>/Corrigir venda|Cancelar venda/.test(b.textContent))`));
        await teclar('Escape','Escape',27);await espera(150);await tocar('main button','Registrar venda');await espera(350);await selecionar('#nova-venda-lead','lead-1');await espera(350);
        confere(id+' · registro reaproveita o lead',await avaliar(`!!document.querySelector('.mb-lateral--aberto form') && document.querySelector('.mb-lateral--aberto')?.textContent.includes('Parabéns pela venda para Ana Exemplo.')`));
        await preencherRotulo('Unidade','QA-52');await print(id+'-registrar');await abrir(rota);await espera(350);
        confere(id+' · rascunho restaurado',await valorRotulo('Unidade')==='QA-52');
        await tocar('.mb-lateral--aberto button','Cancelar');await espera(200);await tocar('main button','Registrar venda');await espera(250);
        confere(id+' · cancelar limpa o rascunho',await valorRotulo('Unidade')==='');
        await teclar('Escape','Escape',27);await avaliar('sessionStorage.clear()');
      }
    }
    await abrir('/vendas/?qa=apoio');confere(`sem-permissao-${w}-${tema}`,await avaliar(`document.querySelector('.mb-estado__sobrelinha')?.textContent==='Sem permissão'`));await print(`vendas-sem-permissao-${w}-${tema}`);
    await abrir('/vendas/?qa=vendas-erro');confere(`erro-${w}-${tema}`,await avaliar(`!!document.querySelector('.mb-estado--erro') && document.querySelector('main')?.textContent.includes('Tentar de novo') && !document.querySelector('main')?.textContent.includes('Falha fictícia')`));await print(`vendas-erro-${w}-${tema}`);
    await abrir('/vendas/?qa=vendas-espera');confere(`carregando-${w}-${tema}`,await avaliar(`!!document.querySelector('main [aria-busy="true"] .mb-esqueleto') && !document.querySelector('main .mb-vazio')`));await print(`vendas-carregando-${w}-${tema}`);
  }
  confere('Nenhum erro no console',erros.length===0,erros);
  writeFileSync(join(saida,'resultado.json'),JSON.stringify(resultado,null,2));
  const falhas=Object.values(resultado).filter(r=>!r.ok).length;console.log(`${Object.keys(resultado).length} conferências, ${falhas} falhas. Capturas em ${saida}`);
  await tela(1280,800);await cdp('Page.close');ws.close();process.exit(falhas?1:0);
}

// Fase 2, bloco 1. Um navegador, uma aba e uma conferência por vez.
if (soParcerias) {
  const clicar = (seletor, texto) => avaliar(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(seletor)})].find(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden' && (${texto === undefined ? "true" : `x.textContent.trim() === ${JSON.stringify(texto)}`})); if(!e) return false; e.focus(); e.click(); return true; })()`);
  const preencher = (seletor, valor) => avaliar(`(() => { const e=document.querySelector(${JSON.stringify(seletor)}); if(!e) return false; const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(valor)}); e.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  const medir = () => avaliar(`(() => {
    const q=s=>document.querySelector(s), vis=e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden';
    const pequenos=[...document.querySelectorAll('main button, main input, main textarea, main select, .mb-lateral--aberto button, .mb-lateral--aberto input, .mb-lateral--aberto textarea, .mb-celular-topo button, .mb-celular-topo a')].filter(vis).filter(e=>!e.disabled && !['checkbox','radio'].includes(e.type) && e.getBoundingClientRect().height<43.5).map(e=>({nome:(e.textContent||e.getAttribute('aria-label')||e.id).trim().slice(0,45),altura:e.getBoundingClientRect().height}));
    const marcas=[...document.querySelectorAll('.mb-marca')].filter(vis).map(e=>e.getAttribute('aria-label'));
    return {lateral:document.documentElement.scrollWidth>document.documentElement.clientWidth, pequenos, marcas, h1:document.querySelectorAll('main h1').length, legado:!!q('main .ds-antigo,main .card,main .btn,main .input,main .selo-antigo'), emBreve:document.querySelector('main')?.textContent.includes('em breve'), status:!!q('.mb-celular-status'), largura:innerWidth};
  })()`);
  const checar = async (id, w) => {
    const m = await medir();
    confere(id + ' · sem rolagem lateral', !m.lateral, m);
    confere(id + ' · Alicerce e marca Parcerias', !m.legado && m.h1 === 1 && m.marcas.includes('Base360 · Parcerias') && !m.emBreve && !m.status);
    if (w < 768) confere(id + ' · alvos 44px', !m.pequenos.length, m.pequenos);
  };
  const rotas = [['lista','/parceiros/?qa=gerente'],['ficha','/parceiros/ficha/?qa=gerente&id=par-1'],['novo','/parceiros/novo/?qa=gerente'],['evento','/parceiros/evento/?qa=gerente']];
  for (const [w,h] of [[375,812],[1280,800]]) for (const tema of ['papel','grafite']) {
    await tela(w,h);
    await comArmazenamento({mb_tema:tema,mb_movimento:'reduzido'},rotas[0][1]);
    for (const [nome,rota] of rotas) {
      await avaliar('sessionStorage.clear()');
      await abrir(rota);
      const id = `${nome}-${w}-${tema}`;
      await checar(id,w);
      const foco = await focoVisivel(w < 768 ? 9 : 16);
      confere(id + ' · foco de teclado', !foco.length, foco);
      await avaliar('document.activeElement?.blur(); window.scrollTo(0,0)');
      await print(id);
      await printInteiro(id + '-inteiro');
      if (nome === 'lista') {
        confere(id + ' · aprovação: sem trilha repetida e aviso da roleta', await avaliar(`!document.querySelector('main .mb-trilha') && document.querySelector('.mb-aviso--info .mb-aviso__titulo')?.textContent==='Você é o próximo da roleta de parceiros' && ![...document.querySelectorAll('.mb-escopo')].some(e=>e.textContent.includes('próximo da roleta'))`));
        await clicar('summary'); await espera(150); await printInteiro(id + '-fila');
        await clicar('button','Registrar interação'); await espera(450);
        confere(id + ' · painel no body e foco preso', await avaliar(`(() => {const p=document.querySelector('.mb-lateral--aberto');return p?.parentElement===document.body && p.contains(document.activeElement);})()`));
        await print(id + '-registrar'); await teclar('Escape','Escape',27); await espera(300);
        confere(id + ' · Esc devolve foco', await avaliar(`document.activeElement?.textContent.trim()==='Registrar interação'`));
        await preencher('.mb-filtros input','zzzzz'); await espera(200);
        confere(id + ' · vazio da busca', await avaliar(`!!document.querySelector('.mb-vazio')`));
        await clicar('button','Limpar filtros'); await espera(150);
      }
      if (nome === 'ficha') {
        await clicar('button','Editar cadastro'); await espera(450); await print(id + '-editar');
        await teclar('Escape','Escape',27); await espera(250);
        await clicar('button','Registrar interação'); await espera(450); await print(id + '-registrar');
        await teclar('Escape','Escape',27); await espera(250);
      }
      if (nome === 'novo') {
        await preencher('#novo-nome','Teste Exemplo'); await preencher('#novo-whatsapp','11999990002');
        await clicar('button[type=submit]'); await espera(250);
        confere(id + ' · duplicado próprio', await avaliar(`document.querySelector('main')?.textContent.includes('Já é seu parceiro')`));
        await printInteiro(id + '-duplicado-proprio');
        await preencher('#novo-whatsapp',''); await preencher('#novo-creci','99999-F'); await clicar('button[type=submit]'); await espera(250);
        confere(id + ' · duplicado de outro gerente sem acesso à ficha', await avaliar(`document.querySelector('.mb-aviso__titulo')?.textContent==='Já é parceiro de Outro Gerente Exemplo' && !document.querySelector('.mb-aviso a')`));
        await printInteiro(id + '-duplicado-outro');
        await avaliar('sessionStorage.clear()');
      }
      if (nome === 'evento') {
        await clicar('.mb-varios__lista input'); await preencher('.mb-varios input[type=search]','Bruno'); await espera(150);
        await clicar('.mb-varios__todos input'); await preencher('.mb-varios input[type=search]',''); await espera(150);
        confere(id + ' · seleção preservada fora da busca', await avaliar(`document.querySelectorAll('.mb-varios__lista input:checked').length===2 && document.querySelector('.mb-varios__contagem').textContent.includes('2 marcados') && document.querySelector('.mb-varios__todos input').indeterminate`));
        await print(id + '-selecionado');
        await abrir(rota);
        confere(id + ' · rascunho do evento restaurado', await avaliar(`document.querySelectorAll('.mb-varios__lista input:checked').length===2`));
        await avaliar('sessionStorage.clear()');
      }
    }
    await abrir('/parceiros/?qa=geral'); await print(`lista-geral-${w}-${tema}`);
    confere(`GG-${w}-${tema} · lê todos e não registra pelo outro`, await avaliar(`document.querySelectorAll('.mb-item').length===4 && ![...document.querySelectorAll('.mb-item button')].some(e=>e.textContent==='Registrar interação')`));
    await abrir('/parceiros/ficha/?qa=geral&id=par-1');
    confere(`GG-${w}-${tema} · ficha de outro só leitura`, await avaliar(`!document.querySelector('#registrar') && ![...document.querySelectorAll('main button')].some(e=>e.textContent==='Editar cadastro')`));
    await print(`ficha-geral-${w}-${tema}`);
  }
  for (const tema of ['papel','grafite']) {
    await tela(320,812); await comArmazenamento({mb_tema:tema},'/parceiros/?qa=gerente');
    const m = await medir(); confere(`lockup 320 ${tema}`, !m.lateral && m.marcas.includes('Base360 · Parcerias'), m); await print(`lockup-320-${tema}`);
    await clicar('.mb-menu-icone'); await espera(250); await print(`menu-320-${tema}`);
    confere(`menu celular ${tema} · volta ao Vendas no basePath`, await avaliar(`document.querySelector('.mb-folha a[href="/vendas/"]')?.textContent==='Vendas'`));
  }
  await tela(1280,800); await abrir('/parceiros/?qa=gerente'); await clicar('.mb-menu__modulos'); await espera(200);
  confere('Módulos: Parcerias atual e Vendas na mesma aba', await avaliar(`document.querySelector('.mb-popup [aria-current="true"]')?.textContent.trim()==='Parcerias' && [...document.querySelectorAll('.mb-popup a')].every(a=>!a.target)`));
  await print('modulos-desktop');
  await abrir('/?qa=gerente');
  confere('Vendas: Parceiros sai do menu; contatos continuam no Início', await avaliar(`![...document.querySelectorAll('.mb-menu__item')].some(a=>a.textContent.trim()==='Parceiros') && !!document.querySelector('#parceiros-hoje')`));
  await abrir('/parceiros/?qa=corretor');
  confere('Sem permissão: corretor continua bloqueado', await avaliar(`document.querySelector('.mb-estado__sobrelinha')?.textContent==='Sem permissão'`));
  confere('Nenhum erro no console', erros.length === 0, erros);
  writeFileSync(join(saida,'resultado.json'),JSON.stringify(resultado,null,2));
  const falhas = Object.values(resultado).filter(r=>!r.ok).length;
  console.log(`${Object.keys(resultado).length} conferências, ${falhas} falhas. Capturas em ${saida}`);
  await cdp('Page.close'); ws.close(); process.exit(falhas ? 1 : 0);
}

if (!soMoldura && !soMensagens && !soLeads && !soFicha && !soNovo && !soConta && !soParcerias && !soInicioVendas && !soEtapas && !soPainelMetasRanking) {
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

// 9c. A Ficha do lead (passo f). Roda com --ficha, depois do visual-preview.mjs e do build da prévia:
//   node scripts/conferir-alicerce.mjs local/alicerce/passo-f --ficha
// Dados fictícios de scripts/visual-fixtures.ts: lead-1 (Ana, do corretor, com toque a detalhar, visitas e documento),
// lead-4 (de outro corretor, visto pelo gerente com ?qa=gerente) e lead-10 (descartado).
if (soFicha) {
  const CASOS = [
    ["corretor", "/leads/ficha/?id=lead-1"],
    ["gerente", "/leads/ficha/?id=lead-4&qa=gerente"],
    ["descartado", "/leads/ficha/?id=lead-10"],
  ];
  const abrirFicha = async (w, h, tema, caminho) => {
    erros.length = 0;
    await tela(w, h);
    await comArmazenamento({ mb_tema: tema }, caminho);
    await espera(900);
  };
  // A medição roda na página (vai por toString), nos dois tamanhos e nos dois temas, para cada caso.
  function medirFichaNaPagina(largura) {
    const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
    const qs = (s) => [...document.querySelectorAll(s)];
    const altura = (e) => { const r = e.getBoundingClientRect(); const ext = ["::before", "::after"].map((p) => { const a = getComputedStyle(e, p); return a.position === "absolute" && a.content !== "none" ? parseFloat(a.height) || 0 : 0; }); return Math.max(r.height, ...ext); };
    const rotulo = (e) => (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    const interativos = qs("main a[href], main button, main select, main input:not([type=hidden]), main textarea, main summary").filter(vis).filter((e) => !e.disabled);
    return {
      rolagemLateral: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      h1Visivel: qs("main h1").filter((e) => vis(e) && !e.classList.contains("mb-visualmente-oculto")).length,
      antigoForaDaPonte: qs("main .card, main .bar-brand, main .btn, main .input, main .field-label, main .selo-antigo, main .aviso-erro, main .aviso-ok, main .titulo-card, main .eyebrow, main .link-acao, main .titulo-secao-antigo").filter((e) => !e.closest(".ds-antigo")).length,
      ponteNaPagina: qs("main .ds-antigo").length,
      pequenos: largura < 768 ? interativos.filter((e) => altura(e) < 43.5).map((e) => rotulo(e) + " " + Math.round(altura(e))) : [],
      semBarraLateral: qs("main .mb-cartao, main .mb-item").every((e) => parseFloat(getComputedStyle(e).borderLeftWidth) <= 1.01),
    };
  }
  const SELETORES_DA_FICHA = [
    '.mb-painel__linha > .ficha__coluna',
    '.ficha__coluna > .mb-cartao[aria-label="Lead"] > .mb-cartao__corpo > .mb-lead__cabeca > div > h2.ficha__nome',
    '.mb-lead__cabeca > .mb-chip.mb-chip--alto > span[aria-hidden="true"]',
    '.mb-cartao[aria-label="Lead"] dl.mb-pares > dt + dd',
    '.ficha__acoes > .mb-botao.mb-botao--whatsapp',
    '.ficha__acoes > a.mb-botao.mb-botao--secundario[href^="tel:"]',
    '#registrar.mb-cartao > form.mb-cartao__corpo > h2.titulo-cartao',
    '#registrar .mb-aviso[role="status"] > svg.mb-icone + .mb-aviso__conteudo > .mb-aviso__titulo',
    '#registrar .mb-campo > .mb-campo__rotulo + .mb-opcoes.mb-opcoes--3[role="group"] > .mb-opcao[aria-pressed]',
    '#registrar textarea.mb-campo__entrada',
    '#registrar .mb-opcoes.mb-opcoes--4[role="group"] > .mb-opcao[aria-pressed]',
    '#registrar .mb-campo__par > .mb-campo input[type="date"]',
    '#registrar .mb-campo__par > .mb-campo input[type="time"]',
    '#registrar .mb-grupo-botoes.mb-grupo-botoes--fim > button.mb-botao--primario.mb-botao--bloco-celular[type="submit"]',
    'section > h2.mb-sobrelinha',
    'ul.mb-itens > li.mb-item > .mb-item__rodape > .mb-selo',
    'aside.mb-cartao > .mb-abas[role="tablist"] > button.mb-aba[role="tab"][aria-controls][aria-selected]',
    'aside.mb-cartao > [role="tabpanel"][aria-labelledby].mb-cartao__corpo',
    '.mb-campo > .mb-campo__selecao > select.mb-campo__entrada',
    '.mb-historico > li.mb-historico__item > .mb-historico__cabeca > strong',
    'ul.mb-itens > li.mb-cartao .mb-selo--sucesso',
    '#radar-titulo',
    '#perfil.mb-cartao > .mb-cartao__corpo > details.mb-recolhivel > summary',
  ];
  const cliqueNoTexto = (seletor, texto) => avaliar(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(seletor)})].find((x) => x.textContent.trim().replace(/\\s+/g, ' ') === ${JSON.stringify(texto)}); if (!b) return false; b.click(); return true; })()`);
  const escolherNoSelect = (seletor, valor) => avaliar(`(() => { const s = document.querySelector(${JSON.stringify(seletor)}); if (!s) return false; const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, ${JSON.stringify(valor)}); s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const pagina = (expr) => avaliar(`(() => { const q = (s) => document.querySelector(s); const qs = (s) => [...document.querySelectorAll(s)]; const t = (e) => (e?.textContent ?? '').trim().replace(/\\s+/g, ' '); return (${expr}); })()`);

  for (const [w, h] of [[375, 812], [1280, 800]]) {
    for (const tema of ["papel", "grafite"]) {
      for (const [nome, caminho] of CASOS) {
        const rot = `ficha ${nome} ${w} ${tema}`;
        await abrirFicha(w, h, tema, caminho);
        const m = await avaliar(`(${medirFichaNaPagina.toString()})(${w})`);
        confere(`${rot}: sem rolagem lateral`, !m.rolagemLateral);
        confere(`${rot}: sem h1 visível (o topo já tem o título)`, m.h1Visivel === 0, m.h1Visivel);
        confere(`${rot}: nada do DS antigo, nem a ponte`, m.antigoForaDaPonte === 0 && m.ponteNaPagina === 0, { antigo: m.antigoForaDaPonte, ponte: m.ponteNaPagina });
        confere(`${rot}: cartões e cards sem barra lateral`, m.semBarraLateral);
        if (w < 768) confere(`${rot}: alvos de 44px no celular`, m.pequenos.length === 0, m.pequenos);
        const semAnel = await focoVisivel(w < 768 ? 8 : 14);
        confere(`${rot}: foco visível ao navegar com Tab`, semAnel.length === 0, semAnel);
        await printInteiro(`ficha-${nome}-${w}-${tema}`);
        confere(`${rot}: sem erro no console`, erros.length === 0, erros.slice(0, 3));
      }
      // O Registrar e o Agendar visita abertos.
      await abrirFicha(w, h, tema, "/leads/ficha/?id=lead-1");
      await printDe(`ficha-registrar-${w}-${tema}`, "#registrar");
      const grade = await pagina(`({ como: getComputedStyle(q('#registrar .mb-opcoes--3')).gridTemplateColumns.split(' ').length, proximo: getComputedStyle(q('#registrar .mb-opcoes--4')).gridTemplateColumns.split(' ').length, alturaProximo: Math.round(Math.min(...qs('#registrar .mb-opcoes--4 .mb-opcao').map((b) => b.getBoundingClientRect().height))), pequenas: qs('#registrar .mb-opcoes--4 .mb-opcao--p').length })`);
      confere(`ficha ${w} ${tema}: Como foi em 3 colunas e Próximo contato em ${w < 768 ? "2 × 2" : "4 colunas"}, 44px, sem pílula pequena`, grade.como === 3 && grade.proximo === (w < 768 ? 2 : 4) && grade.pequenas === 0 && (w >= 768 || grade.alturaProximo >= 43.5), grade);
      await cliqueNoTexto("main button", "+ Agendar visita");
      await espera(500);
      await print(`ficha-agendar-visita-${w}-${tema}`);
    }
  }

  // O HTML bate com os previews FichaDoLead, Abas, Historico, Envio, ConfirmarNaLinha, Compromisso e Cartao (corretor, papel, 1280).
  await abrirFicha(1280, 800, "papel", "/leads/ficha/?id=lead-1");
  {
    const faltam = await avaliar(`${JSON.stringify(SELETORES_DA_FICHA)}.filter((s) => !document.querySelector(s))`);
    confere("ficha: o HTML bate com o FichaDoLead (classes e aria-*)", faltam.length === 0, faltam);
    const r = await pagina(`({ pares: qs('.mb-cartao[aria-label="Lead"] dl.mb-pares > dt').map(t), aDetalhar: qs('dt').some((e) => t(e) === 'A detalhar'), registrarAviso: t(q('#registrar .mb-aviso__titulo')), tipos: qs('#registrar .mb-opcoes--3 .mb-opcao').map(t), atrasoNoTopo: t(q('.mb-aviso--alerta .mb-aviso__titulo')) })`);
    confere("ficha: a linha A detalhar saiu dos pares e o aviso do Registrar a diz", !r.aDetalhar && /Você abriu o WhatsApp/.test(r.registrarAviso) && r.pares.includes("Próximo contato") && r.pares.includes("Cadastrado"), r);
    confere("ficha: Como foi com os tipos de sempre", ["WhatsApp", "Ligação", "E-mail", "Visita", "Anotação"].every((x) => r.tipos.includes(x)), r.tipos);
    confere("ficha: aviso de atraso no topo", /^Contato atrasado desde /.test(r.atrasoNoTopo), r.atrasoNoTopo);
  }

  // O que cada parte faz (papel, 1280, corretor). A prévia não grava: as gravações voltam o erro da prévia.
  {
    const aba = (id) => pagina(`({ selecionada: qs('.mb-aba[aria-selected="true"]').map(t), visivel: qs('[role=tabpanel]').filter((p) => !p.hidden).map((p) => p.id), foco: t(document.activeElement).slice(0, 30) })`);
    await cliqueNoTexto(".mb-aba", "Documentos");
    let a = await aba();
    confere("abas: tocar em Documentos mostra só o painel dele", a.selecionada[0] === "Documentos" && a.visivel.length === 1 && /documentos/.test(a.visivel[0]), a);
    await avaliar(`document.querySelector(".mb-aba[aria-selected=true]").focus(); true`);
    await teclar("ArrowRight", "ArrowRight", 39);
    await espera(120);
    a = await aba();
    confere("abas: a seta → vai para Histórico e leva o foco", a.selecionada[0] === "Histórico" && a.foco === "Histórico", a);
    await teclar("Home", "Home", 36);
    await espera(120);
    a = await aba();
    confere("abas: Home volta para Andamento", a.selecionada[0] === "Andamento", a);

    await cliqueNoTexto(".mb-aba", "Documentos");
    const d0 = await pagina(`({ desativado: q('.mb-envio input[type=file]')?.disabled, motivo: t(q('.ficha__envio .mb-campo__ajuda')), docs: qs('.mb-envio__item .mb-envio__nome > span:first-child').map(t) })`);
    confere("documentos: sem o tipo, a área vem desativada e diz o motivo logo abaixo", d0.desativado === true && /Escolha o tipo do documento primeiro/.test(d0.motivo) && d0.docs.length === 1, d0);
    await escolherNoSelect(".mb-cartao [role=tabpanel]:not([hidden]) select.mb-campo__entrada", "cpf");
    await espera(150);
    const d1 = await pagina(`({ desativado: q('.mb-envio input[type=file]')?.disabled, motivo: !!q('.ficha__envio .mb-campo__ajuda') })`);
    confere("documentos: com o tipo escolhido a área liga e o motivo some", d1.desativado === false && d1.motivo === false, d1);
    await cliqueNoTexto(".mb-envio__item button", "Remover");
    await espera(150);
    const c0 = await pagina(`({ confirmar: !!q('li.ficha__confirmar > .mb-confirmar'), foco: t(document.activeElement).slice(0, 30), texto: t(q('.mb-confirmar__texto')) })`);
    confere("documentos: Remover confirma na própria linha, com o efeito, e o foco vai para Cancelar", c0.confirmar && c0.foco === "Cancelar" && /Remover este arquivo\?.*histórico registra a remoção/.test(c0.texto), c0);
    await teclar("Escape", "Escape", 27);
    await espera(150);
    const c1 = await pagina(`({ confirmar: !!q('.mb-confirmar'), foco: t(document.activeElement).slice(0, 30) })`);
    confere("documentos: Esc fecha a confirmação e devolve o foco a Remover", !c1.confirmar && c1.foco === "Remover", c1);

    await cliqueNoTexto(".mb-aba", "Andamento");
    const temp = await pagina(`({ marcado: qs('#ficha-temperatura ~ .mb-opcoes .mb-opcao[aria-pressed="true"], .mb-campo:has(#ficha-temperatura) .mb-opcao[aria-pressed="true"]').map(t), opcoes: qs('.mb-campo:has(#ficha-temperatura) .mb-opcao').length })`);
    confere("andamento: temperatura em Seletor de 3, Quente marcado, sem desmarcar", temp.opcoes === 3 && temp.marcado.length === 1 && /Quente/.test(temp.marcado[0]), temp);

    // Registrar: erro de validação, atalho do dia e o tipo Sem resposta.
    await avaliar(`document.querySelector('#registrar button[type=submit]').click(); true`);
    await espera(150);
    const e0 = await pagina(`t(q('#registrar .mb-aviso--erro .mb-aviso__titulo'))`);
    confere("registrar: sem texto, o erro de sempre num Aviso", e0 === "Escreva o que aconteceu.", e0);
    await cliqueNoTexto("#registrar .mb-opcoes--4 .mb-opcao", "Amanhã");
    const am = await pagina(`({ marcado: qs('#registrar .mb-opcoes--4 .mb-opcao[aria-pressed="true"]').map(t), dia: q('#registrar input[type=date]').value, hora: q('#registrar input[type=time]').value })`);
    confere("registrar: o atalho Amanhã marca o dia e põe 09:00", am.marcado[0] === "Amanhã" && /^\d{4}-\d{2}-\d{2}$/.test(am.dia) && am.hora === "09:00", am);
    await cliqueNoTexto("#registrar .mb-opcoes--3 .mb-opcao", "Ligação");
    confere("registrar: tocar em Ligação marca Ligação", (await pagina(`t(q('#registrar .mb-opcoes--3 .mb-opcao[aria-pressed="true"]'))`)) === "Ligação");

    // A visita aberta: Cliente confirmou e Cancelar visita (a visita agendada de hoje, 23:00; depois das 23h ela já está aguardando baixa).
    const vis = await pagina(`qs('li.mb-item').map((c) => ({ titulo: t(c.querySelector('.mb-item__titulo')), botao: !!c.querySelector('button.mb-item__titulo'), selo: t(c.querySelector('.mb-selo')), faixa: qs('.mb-item__faixa > :is(a,button)').length }))`);
    const agendada = await pagina(`(() => { const c = qs('li.mb-item').find((x) => t(x.querySelector('.mb-selo')) === 'AGENDADA' || /agendada/i.test(t(x.querySelector('.mb-selo')))); return c ? { botao: !!c.querySelector('button.mb-item__alvo[aria-expanded="false"]'), faixa: [...c.querySelectorAll('.mb-item__faixa > :is(a,button)')].map(t) } : null; })()`);
    const realizadaSemBotao = await pagina(`(() => { const c = qs('li.mb-item').find((x) => /realizada/i.test(t(x.querySelector('.mb-selo')))); return !!c && !c.querySelector('button.mb-item__alvo'); })()`);
    confere("visitas: só a visita aberta do corretor é um botão; a realizada não é", !!agendada?.botao && realizadaSemBotao, { agendada, realizadaSemBotao, vis });
    await avaliar(`document.querySelector('li.mb-item button.mb-item__alvo')?.click(); true`);
    await espera(200);
    const aberta = await pagina(`(() => { const c = q('li.mb-item:has(button.mb-item__alvo[aria-expanded="true"])'); if (!c) return null; const bs = [...c.querySelectorAll('.mb-item__edicao > .mb-grupo-botoes > .mb-botao')].map(t); return { expandida: true, botoes: bs, ligaAoPainel: c.querySelector('button.mb-item__alvo').getAttribute('aria-controls') === c.querySelector('.mb-item__edicao').id }; })()`);
    confere("visita aberta: Cliente confirmou e Cancelar visita, e o aria-controls bate", !!aberta && aberta.botoes.includes("✓ Cliente confirmou") && aberta.botoes.includes("Cancelar visita") && aberta.ligaAoPainel, aberta);
    await cliqueNoTexto("li.mb-item .mb-item__edicao .mb-botao", "Cancelar visita");
    await espera(700);
    confere("visita aberta: Cancelar visita grava e, sem gravar, mostra o erro no card (a prévia não grava)", (await pagina(`!!q('li.mb-item .mb-aviso--erro')`)) === true);

    // Agendar visita: painel, Empreendimento com o select do Alicerce, Esc fecha e devolve o foco.
    await cliqueNoTexto("main button", "+ Agendar visita");
    await espera(500);
    const ag = await pagina(`(() => { const p = q('body > aside.mb-lateral'); if (!p) return null; return { titulo: t(p.querySelector('.mb-lateral__titulo, h2')), empreendimento: !!p.querySelector('.mb-campo:has(.mb-campo__rotulo) .mb-campo__selecao > select.mb-campo__entrada'), datalist: !!p.querySelector('datalist, input[list]'), atalhos: p.querySelectorAll('.mb-opcoes--linha .mb-opcao--p').length, rodape: [...p.querySelectorAll('.mb-lateral__rodape .mb-botao')].map(t) }; })()`);
    confere("agendar visita: painel com Empreendimento no select do Alicerce (sem datalist) e Cancelar · Agendar visita", !!ag && ag.empreendimento && !ag.datalist && ag.atalhos === 4 && ag.rodape.join("|") === "Cancelar|Agendar visita", ag);
    await teclar("Escape", "Escape", 27);
    await espera(400);
    confere("agendar visita: Esc fecha o painel e o foco volta ao botão", (await pagina(`!q('body > aside.mb-lateral[aria-hidden="false"], body > aside.mb-lateral.mb-lateral--aberto') && t(document.activeElement).slice(0, 30) === '+ Agendar visita'`)) === true);

    // Perfil, Descartar, Venda.
    await cliqueNoTexto("main button", "Editar perfil");
    await espera(300);
    confere("perfil: Editar perfil abre a seção recolhível", (await pagina(`q('#perfil details.mb-recolhivel')?.open === true`)) === true);
    const emp = await pagina(`!!q('#perfil .mb-form-grade select.mb-campo__entrada') && !q('#perfil datalist')`);
    confere("perfil: Empreendimento no select do Alicerce", emp === true);
    await cliqueNoTexto("main button", "✕ Descartar lead");
    await espera(150);
    confere("descartar: o toque abre os motivos em Seletor de 3, com Cancelar", (await pagina(`qs('.mb-campo:has(#descartar-motivo) .mb-opcao').length >= 3 && qs('main button').some((b) => t(b) === 'Cancelar')`)) === true);
    await cliqueNoTexto("main button", "+ Registrar venda");
    await espera(300);
    const venda = await pagina(`(() => { const c = q('.mb-cartao[aria-label="Registrar venda"]'); return c ? { select: !!c.querySelector('.mb-campo__selecao > select'), marcador: !!c.querySelector('label.mb-marcador > input[type=checkbox]'), botoes: [...c.querySelectorAll('.mb-grupo-botoes .mb-botao')].map(t) } : null; })()`);
    confere("venda: Registrar venda no Cartao, com select, marcador e Cancelar · Registrar venda", !!venda && venda.select && venda.marcador && venda.botoes.join("|") === "Cancelar|Registrar venda", venda);
    await avaliar(`(() => { const i = document.querySelector('.mb-cartao[aria-label="Registrar venda"] input[inputmode=decimal]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('.mb-cartao[aria-label="Registrar venda"] button[type=submit]').click(); return true; })()`);
    await espera(200);
    confere("venda: sem VGV, o erro de sempre num Aviso", /Confira o VGV/.test(await pagina(`t(q('.mb-cartao[aria-label="Registrar venda"] .mb-aviso--erro'))`)));
  }

  // O gerente: Andamento só leitura, Atribuir, sem Registrar. O lead descartado: etapa "Descartado · motivo", Reativar e sem o convite de venda.
  await abrirFicha(1280, 800, "papel", "/leads/ficha/?id=lead-4&qa=gerente");
  {
    const g = await pagina(`({ registrar: !!q('#registrar'), andamento: qs('[role=tabpanel]:not([hidden]) .mb-pares dt').map(t), etapa: t(q('[role=tabpanel]:not([hidden]) .mb-pares .mb-selo')), atribuir: t(q('.mb-cartao[aria-label="Atribuir lead"] .mb-campo__rotulo')), botao: t(q('.mb-cartao[aria-label="Atribuir lead"] .mb-botao--primario')), botaoDesativado: q('.mb-cartao[aria-label="Atribuir lead"] .mb-botao--primario')?.disabled, dados: !!q('#dados-cliente') || true, radar: !!q('#radar-titulo') })`);
    confere("gerente: sem Registrar nem Radar; Andamento só leitura com a etapa; Atribuir lead desativado até escolher", !g.registrar && !g.radar && g.andamento.join() === "Temperatura,Etapa" && /PROPOSTA/i.test(g.etapa) && g.atribuir === "Atribuir a" && g.botao === "Atribuir lead" && g.botaoDesativado === true, g);
  }
  await abrirFicha(1280, 800, "papel", "/leads/ficha/?id=lead-10");
  {
    const x = await pagina(`({ etapa: t(q('[role=tabpanel]:not([hidden]) .mb-pares .mb-selo')), seloNoCartao: qs('.mb-cartao[aria-label="Lead"] .mb-selo--etapa-descartado').map(t), reativar: qs('main button').some((b) => t(b) === 'Reativar lead'), conviteDeVenda: /Quando o cliente assinar/.test(document.body.innerText), registrar: !!q('#registrar'), descartar: qs('main button').some((b) => /Descartar lead/.test(t(b))), atraso: !!q('.mb-aviso--alerta') })`);
    confere("descartado: Etapa vira \"✕ Descartado · motivo\", igual ao selo do cartão, sem convite de venda, com Reativar e sem Registrar nem aviso de atraso", /^✕ DESCARTADO · /i.test(x.etapa) && x.etapa === x.seloNoCartao[0] && x.seloNoCartao.length === 1 && x.reativar && !x.conviteDeVenda && !x.registrar && !x.descartar && !x.atraso, x);
  }
  await tela(1280, 800);

  writeFileSync(join(saida, "resultado.json"), JSON.stringify(resultado, null, 2));
  const falhasFicha = Object.values(resultado).filter((r) => !r.ok).length;
  console.log(`\n${Object.keys(resultado).length} conferências, ${falhasFicha} falhas. Prints em ${saida}`);
  await tela(1280, 800);
  ws.close();
  process.exit(falhasFicha ? 1 : 0);
}

// 10. As mensagens do passo d. Roda com --mensagens, depois do visual-preview.mjs e do build da prévia.
// 9c. Novo lead (passo g). Roda com --novo, depois do visual-preview.mjs e do build da prévia.
if (soNovo) {
  const CASOS = [["corretor", "/leads/novo/"], ["gerente", "/leads/novo/?qa=gerente"]];
  const MENSAGEM = "Olá, meu nome é Carla Exemplo e tenho interesse no Residencial Exemplo. Meu WhatsApp é (11) 97777-1234 e o e-mail carla@example.invalid. Procuro um apartamento de 2 dormitórios, até R$ 600.000, na região do Centro.";
  const visivel = "(e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'";
  const abrirNovo = async (w, h, tema, caminho) => {
    erros.length = 0;
    await tela(w, h);
    // Sai do Novo lead antes de limpar o armazenamento: a tela viva guardaria o rascunho de novo (ele fica no sessionStorage).
    await abrir("/entrar/");
    await avaliar("sessionStorage.clear(); true");
    await comArmazenamento({ mb_tema: tema }, caminho);
    await avaliar("sessionStorage.clear(); true");
    await abrir(caminho);
    await espera(900);
  };
  const abrirNovo2 = async (caminho) => { await abrir(caminho); await espera(900); };
  const preencher = (sel, v) => avaliar(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(e.constructor.prototype, "value").set; set.call(e, ${JSON.stringify(v)}); e.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
  const tocar = (sel, texto) => avaliar(`(() => { const ok = ${visivel}; const b = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(ok).find((e) => !${JSON.stringify(texto ?? null)} || e.textContent.trim() === ${JSON.stringify(texto ?? "")}); if (!b) return false; b.click(); return true; })()`);
  const lateral = () => avaliar("document.documentElement.scrollWidth > document.documentElement.clientWidth");
  const registrar = async (nome) => {
    await espera(500);
    // Viewport da altura da página: o menu e a barra do celular são sticky e, numa captura além da janela, apareceriam no meio.
    const alturaTotal = await avaliar("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)");
    const larguraAtual = await avaliar("document.documentElement.clientWidth");
    await tela(larguraAtual, Math.max(alturaTotal, 640));
    await espera(300);
    const lat = await lateral();
    await print(nome);
    confere(`print ${nome}: sem rolagem lateral e sem erro no console`, !lat && erros.length === 0, { lat, erros: [...erros] });
  };
  for (const [caso, caminho] of CASOS) {
    for (const [w, h] of [[375, 812], [1280, 800]]) {
      for (const tema of ["papel", "grafite"]) {
        const id = `novo-${caso}-${w}-${tema}`;
        await abrirNovo(w, h, tema, caminho);
        await registrar(id);
        // Erro de validação: enviar vazio.
        await tocar("form button[type=submit]");
        await registrar(id + "-erro");
        // Cadastro Mágico: a tela de colar e o formulário depois de "Usar estes dados".
        await abrirNovo(w, h, tema, caminho);
        await tocar("form button", "+ Colar mensagem");
        await espera(400);
        await preencher("#mensagem", MENSAGEM);
        await registrar(id + "-magico");
        await tocar("button", "Usar estes dados");
        await registrar(id + "-magico-preenchido");
        // Duplicado: o WhatsApp de um lead que a pessoa vê, e o de outra carteira.
        for (const [forma, numero] of [["visivel", "11999990010"], ["outra", "11988880000"]]) {
          await abrirNovo(w, h, tema, caminho);
          await preencher("#novo-nome", "Teste Exemplo");
          await preencher("#novo-whatsapp", numero);
          await tocar(".mb-opcoes[aria-labelledby=novo-origem] button");
          if (caso === "gerente") await avaliar("(() => { const e = document.querySelector('#novo-dono'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(e, e.options[1].value); e.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
          await tocar("form button[type=submit]");
          await espera(700);
          await registrar(`${id}-duplicado-${forma}`);
        }
      }
    }
  }
  // ---- Asserções (passo g) ----
  const pagina = (expr) => avaliar(`(() => { const q = (s) => document.querySelector(s); const qs = (s) => [...document.querySelectorAll(s)]; const t = (e) => (e?.textContent ?? '').trim().replace(/\\s+/g, ' '); return (${expr}); })()`);
  const cliqueNoTexto = (seletor, texto) => avaliar(`(() => { const ok = ${visivel}; const b = [...document.querySelectorAll(${JSON.stringify(seletor)})].filter(ok).find((x) => x.textContent.trim().replace(/\\s+/g, ' ') === ${JSON.stringify(texto)}); if (!b) return false; b.click(); return true; })()`);
  const escolherNoSelect = (seletor, valor) => avaliar(`(() => { const s = document.querySelector(${JSON.stringify(seletor)}); if (!s) return false; const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, ${JSON.stringify(valor)}); s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  function medirNovoNaPagina(largura) {
    const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
    const qs = (s) => [...document.querySelectorAll(s)];
    const altura = (e) => { const r = e.getBoundingClientRect(); const ext = ["::before", "::after"].map((p) => { const a = getComputedStyle(e, p); return a.position === "absolute" && a.content !== "none" ? parseFloat(a.height) || 0 : 0; }); return Math.max(r.height, ext[0], ext[1]); };
    const rotulo = (e) => (e.getAttribute("aria-label") || e.textContent || e.id || "").trim().replace(/\s+/g, " ").slice(0, 40);
    const interativos = qs("main a[href], main button, main select, main input:not([type=hidden]), main textarea, main summary").filter(vis).filter((e) => !e.disabled);
    return {
      rolagemLateral: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      h1Visivel: qs("main h1").filter((e) => vis(e) && !e.classList.contains("mb-visualmente-oculto")).length,
      h1Oculto: qs("main h1.mb-visualmente-oculto").length,
      antigoForaDaPonte: qs("main .card, main .bar-brand, main .btn, main .input, main .field-label, main .selo-antigo, main .aviso-erro, main .aviso-ok, main .titulo-card, main .link-acao, main .opcao").filter((e) => !e.closest(".ds-antigo")).length,
      ponteNaPagina: qs("main .ds-antigo").length,
      pequenos: largura < 768 ? interativos.filter((e) => altura(e) < 43.5).map((e) => rotulo(e) + " " + Math.round(altura(e))) : [],
      fontePequena: largura < 768 ? qs("main input:not([type=hidden]):not([type=checkbox]), main select, main textarea").filter(vis).filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id) : [],
      semBarraLateral: qs("main .mb-cartao").every((e) => parseFloat(getComputedStyle(e).borderLeftWidth) <= 1.01),
      barraDoCelular: (() => { const b = document.querySelector(".mb-barra-acoes"); return b ? getComputedStyle(b).display !== "none" : null; })(),
      rodapeDoCartao: (() => { const b = document.querySelector(".mb-cartao__rodape"); return b ? getComputedStyle(b).display !== "none" : null; })(),
    };
  }
  // O HTML de cada peça contra o preview (classes e aria-*): FormularioDenso, Campo, Seletor, Recolhivel, BarraDeAcoes e BuscaComSugestoes.
  const SELETORES_DO_NOVO = [
    "form > .mb-cartao > .mb-cartao__cabecalho .mb-cartao__titulo",
    "form > .mb-cartao .mb-cartao__corpo > .mb-form-secao > .mb-form-grade > label.mb-campo > .mb-campo__rotulo > .mb-campo__obrigatorio[aria-hidden='true']",
    "form .mb-form-grade > label.mb-campo > .mb-campo__rotulo > .mb-campo__opcional",
    "form .mb-form-grade > label.mb-campo > input.mb-campo__entrada",
    "form .mb-form-grade > .mb-campo > .mb-campo__rotulo + .mb-opcoes.mb-opcoes--linha[role='group'][aria-labelledby] > button.mb-opcao[type='button'][aria-pressed]",
    "form details.mb-recolhivel > summary",
    "form details.mb-recolhivel > .mb-recolhivel__corpo .mb-opcoes.mb-opcoes--3[role='group'] > .mb-opcao[aria-pressed]",
    "form details.mb-recolhivel .mb-opcoes.mb-opcoes--4[role='group'] > .mb-opcao[aria-pressed]",
    "form details.mb-recolhivel .mb-campo__par > input.mb-campo__entrada[type='date']",
    "form details.mb-recolhivel .mb-campo.mb-sugestoes-alvo > label.mb-campo__rotulo + input.mb-campo__entrada[role='combobox'][aria-autocomplete='list'][aria-controls][aria-expanded]",
    "form details.mb-recolhivel .mb-campo.mb-sugestoes-alvo > ul.mb-sugestoes[role='listbox'][aria-label='Sugestões']",
    "form > .mb-cartao > footer.mb-cartao__rodape.mb-so-computador > button.mb-botao.mb-botao--primario[type='submit']",
    "form > .mb-barra-acoes.mb-barra-acoes--unica.mb-so-celular > button.mb-botao.mb-botao--primario[type='submit']",
    "form > .mb-cartao > .mb-cartao__cabecalho > .mb-salvo.mb-salvo--ok",
  ];

  for (const [caso, caminho] of CASOS) {
    for (const [w, h] of [[375, 812], [1280, 800]]) {
      for (const tema of ["papel", "grafite"]) {
        const rot = `novo ${caso} ${w} ${tema}`;
        await abrirNovo(w, h, tema, caminho);
        await preencher("#novo-nome", "Rascunho Exemplo");
        await espera(200);
        const m = await avaliar(`(${medirNovoNaPagina.toString()})(${w})`);
        confere(`${rot}: sem rolagem lateral`, !m.rolagemLateral);
        confere(`${rot}: h1 só para o leitor de tela (o topo já tem o título)`, m.h1Visivel === 0 && m.h1Oculto === 1, { visivel: m.h1Visivel, oculto: m.h1Oculto });
        confere(`${rot}: nada do DS antigo, nem a ponte`, m.antigoForaDaPonte === 0 && m.ponteNaPagina === 0, { antigo: m.antigoForaDaPonte, ponte: m.ponteNaPagina });
        confere(`${rot}: cartões sem barra lateral`, m.semBarraLateral);
        confere(`${rot}: ação no rodapé do cartão no computador e na barra do celular`, m.barraDoCelular === (w < 768) && m.rodapeDoCartao === (w >= 768), { barra: m.barraDoCelular, rodape: m.rodapeDoCartao });
        if (w < 768) {
          confere(`${rot}: alvos de 44px no celular`, m.pequenos.length === 0, m.pequenos);
          confere(`${rot}: campos com 16px no celular`, m.fontePequena.length === 0, m.fontePequena);
        }
        const semAnel = await focoVisivel(w < 768 ? 8 : 14);
        confere(`${rot}: foco visível ao navegar com Tab`, semAnel.length === 0, semAnel);
        confere(`${rot}: sem erro no console`, erros.length === 0, erros.slice(0, 3));
      }
    }
  }

  // O HTML bate com os previews (corretor, papel, 1280; Mais detalhes aberto pelo rascunho do e-mail).
  await abrirNovo(1280, 800, "papel", "/leads/novo/");
  await preencher("#novo-email", "x@example.invalid");
  await espera(200);
  {
    const faltam = await avaliar(`${JSON.stringify(SELETORES_DO_NOVO)}.filter((s) => !document.querySelector(s))`);
    confere("novo: o HTML bate com FormularioDenso, Campo, Seletor, Recolhivel, BarraDeAcoes e BuscaComSugestoes (classes e aria-*)", faltam.length === 0, faltam);
  }

  // Validação no campo: as mesmas mensagens, na mesma ordem, e o foco vai ao campo errado.
  {
    await abrirNovo(1280, 800, "papel", "/leads/novo/");
    const passo = async (esperado, campo) => {
      await cliqueNoTexto("form button[type=submit]", "Cadastrar");
      await espera(300);
      const r = await pagina(`({ erro: t(q('.mb-campo--erro .mb-campo__erro')), foco: document.activeElement.id || document.activeElement.className, invalido: q('.mb-campo--erro input, .mb-campo--erro select')?.getAttribute('aria-invalid') ?? null, descrito: !!q('.mb-campo--erro [aria-describedby]') })`);
      confere(`novo: erro de ${campo}: "${esperado}", foco no campo`, r.erro === esperado && (campo === "origem" ? /mb-opcao/.test(r.foco) : r.foco === `novo-${campo}` && r.invalido === "true" && r.descrito), r);
    };
    await passo("Preencha o nome.", "nome");
    await preencher("#novo-nome", "Teste Exemplo");
    await preencher("#novo-whatsapp", "123");
    await passo("Confira o WhatsApp: DDD e número, como (11) 98765-4321.", "whatsapp");
    await preencher("#novo-whatsapp", "");
    await passo("Escolha a origem.", "origem");
    await tocar(".mb-opcoes[aria-labelledby=novo-origem] button");
    await preencher("#novo-email", "errado");
    await passo("Confira o e-mail.", "email");
    const aberta = await pagina("q('details.mb-recolhivel').open");
    confere("novo: o e-mail com erro abre Mais detalhes", aberta === true);
  }
  {
    await abrirNovo(1280, 800, "papel", "/leads/novo/?qa=gerente");
    await preencher("#novo-nome", "Teste Exemplo");
    await cliqueNoTexto("form button[type=submit]", "Cadastrar");
    await espera(300);
    const r = await pagina(`({ erro: t(q('.mb-campo--erro .mb-campo__erro')), foco: document.activeElement.id, origem: q('.mb-opcoes[aria-labelledby=novo-origem] .mb-opcao[aria-pressed=true]')?.textContent })`);
    confere("novo (gerente): sem corretor, o erro pede o corretor, o foco vai ao campo e a origem já vem na Empresa", r.erro === "Escolha o corretor que vai receber o lead." && r.foco === "novo-dono" && r.origem === "Empresa", r);
  }

  // WhatsApp formatado ao sair do campo; temperatura que se desmarca; origem de uma escolha só; rascunho.
  {
    await abrirNovo(1280, 800, "papel", "/leads/novo/");
    await preencher("#novo-whatsapp", "11988880000");
    await avaliar("document.querySelector('#novo-whatsapp').focus(); document.querySelector('#novo-whatsapp').blur(); true");
    await espera(200);
    const zap = await pagina("q('#novo-whatsapp').value");
    confere('novo: o WhatsApp sai formatado "(11) 98888-0000" ao sair do campo', zap === "(11) 98888-0000", zap);
    await cliqueNoTexto(".mb-opcoes[aria-labelledby=novo-origem] button", "Plantão");
    await cliqueNoTexto(".mb-opcoes[aria-labelledby=novo-origem] button", "Indicação");
    const origem = await pagina("qs('.mb-opcoes[aria-labelledby=novo-origem] .mb-opcao[aria-pressed=true]').map(t)");
    confere("novo: a origem é uma escolha só", origem.length === 1 && origem[0] === "Indicação", origem);
    await cliqueNoTexto("summary", "Mais detalhes opcional");
    await espera(200);
    await cliqueNoTexto(".mb-recolhivel .mb-opcao", "! Quente");
    const t1 = await pagina("q('.mb-recolhivel .mb-opcoes--3 .mb-opcao[aria-pressed=true]')?.textContent");
    await cliqueNoTexto(".mb-recolhivel .mb-opcao", "! Quente");
    const t2 = await pagina("q('.mb-recolhivel .mb-opcoes--3 .mb-opcao[aria-pressed=true]')?.textContent ?? null");
    confere("novo: a temperatura marca e, tocando de novo, desmarca", /Quente/.test(t1 ?? "") && t2 === null, { t1, t2 });
    await preencher("#novo-nome", "Rascunho Exemplo");
    await espera(300);
    const guardado = await pagina("Object.keys(sessionStorage).filter((k) => /novo/i.test(k)).length");
    await abrirNovo2("/leads/novo/");
    const restaurado = await pagina("({ nome: q('#novo-nome').value, zap: q('#novo-whatsapp').value, salvo: t(q('.mb-salvo')) })");
    confere("novo: o rascunho fica no aparelho e volta ao reabrir", guardado >= 1 && restaurado.nome === "Rascunho Exemplo" && restaurado.zap === "(11) 98888-0000" && /Rascunho guardado/.test(restaurado.salvo), { guardado, restaurado });
  }

  // Empreendimento: a lista sugere (sem acento), setas e Enter escolhem, o texto livre continua valendo com o aviso.
  {
    await abrirNovo(1280, 800, "papel", "/leads/novo/");
    await cliqueNoTexto("summary", "Mais detalhes opcional");
    await espera(200);
    await avaliar("document.querySelector('#novo-empreendimento').focus(); true");
    await preencher("#novo-empreendimento", "resid");
    await espera(200);
    const a = await pagina("({ aberta: q('#novo-empreendimento').getAttribute('aria-expanded'), opcoes: qs('.mb-sugestoes [role=option]').map(t), semCriar: !q('.mb-sugestoes__opcao--criar') })");
    await teclar("ArrowDown", "ArrowDown", 40);
    await teclar("Enter", "Enter", 13);
    await espera(200);
    const b = await pagina("({ valor: q('#novo-empreendimento').value, aberta: q('#novo-empreendimento').getAttribute('aria-expanded'), aviso: t(q('.mb-sugestoes-alvo .mb-campo__ajuda')) })");
    await preencher("#novo-empreendimento", "Xyz Inventado");
    await espera(200);
    const c = await pagina("({ ajuda: t(q('.mb-sugestoes-alvo .mb-campo__ajuda')), vazio: t(q('.mb-sugestoes__vazio')) })");
    confere("novo: o empreendimento sugere da lista, setas e Enter escolhem, o texto livre vale com o aviso do catálogo",
      a.aberta === "true" && a.opcoes.length >= 1 && /Residencial Exemplo/.test(a.opcoes[0]) && a.semCriar && b.valor === "Residencial Exemplo" && b.aberta === "false" && b.aviso === "" && /^! Não está no catálogo/.test(c.ajuda) && /Nenhum empreendimento com/.test(c.vazio), { a, b, c });
  }

  // Duplicado: as duas formas, com o que cada uma deixa fazer.
  for (const [forma, numero, caminho] of [["visivel", "11999990010", "/leads/novo/"], ["outra", "11988880000", "/leads/novo/"], ["outra-gerente", "11988880000", "/leads/novo/?qa=gerente"]]) {
    await abrirNovo(1280, 800, "papel", caminho);
    await preencher("#novo-nome", "Teste Exemplo");
    await preencher("#novo-whatsapp", numero);
    await tocar(".mb-opcoes[aria-labelledby=novo-origem] button");
    if (caminho.includes("gerente")) await escolherNoSelect("#novo-dono", "corretor-1");
    await cliqueNoTexto("form button[type=submit]", "Cadastrar");
    await espera(700);
    const lerAviso = () => pagina(`({ tom: q('form .mb-aviso:not(.mb-aviso--erro):not(.mb-aviso--sucesso)')?.className ?? '', titulo: t(q('form .mb-aviso:not(.mb-aviso--erro):not(.mb-aviso--sucesso) .mb-aviso__titulo')), texto: t(q('form .mb-aviso:not(.mb-aviso--erro):not(.mb-aviso--sucesso) .mb-aviso__texto')), botoes: qs('form .mb-aviso__acoes > *').map(t), abrir: q('form .mb-aviso__acoes a')?.getAttribute('href') ?? null, erroDeGravacao: !!q('form .mb-aviso--erro') })`);
    const a1 = await lerAviso();
    // O Cadastrar principal, com o aviso na tela, não grava: nenhum erro de gravação (a prévia recusa toda gravação).
    await cliqueNoTexto("form button[type=submit]", "Cadastrar");
    await espera(700);
    const a2 = await lerAviso();
    if (forma === "visivel") {
      confere("novo: duplicado visível é --alerta, com o nome e os dois botões; o Cadastrar principal não grava no segundo toque",
        /mb-aviso--alerta/.test(a1.tom) && a1.titulo === "Já existe um lead ativo com este WhatsApp" && /Ana Exemplo/.test(a1.texto) && a1.botoes.join("|") === "Abrir o existente|Cadastrar assim mesmo" && /\/leads\/ficha\/\?id=lead-1$/.test(a1.abrir ?? "") && !a1.erroDeGravacao && !a2.erroDeGravacao && /mb-aviso--alerta/.test(a2.tom), { a1, a2 });
      await cliqueNoTexto(".mb-aviso__acoes button", "Cadastrar assim mesmo");
      await espera(700);
      const a3 = await lerAviso();
      confere("novo: Cadastrar assim mesmo é o botão que grava (a prévia devolve o erro de gravação)", a3.erroDeGravacao === true, a3);
      await preencher("#novo-whatsapp", "11977771111");
      await espera(200);
      const a4 = await pagina("!q('form .mb-aviso__acoes')");
      confere("novo: mudar o WhatsApp apaga o aviso de duplicado", a4 === true);
    } else {
      confere(`novo: duplicado em outra carteira (${forma}) é --info, sem botão e sem nome; o cadastro não grava`,
        /mb-aviso--info/.test(a1.tom) && a1.botoes.length === 0 && !/Exemplo/.test(a1.titulo + a1.texto) && (forma === "outra" ? a1.texto === "Confira com seu gerente." && a1.titulo === "Este WhatsApp já está num lead ativo de outro corretor" : /outra equipe/.test(a1.titulo)) && !a1.erroDeGravacao && !a2.erroDeGravacao && /mb-aviso--info/.test(a2.tom), { a1, a2 });
    }
  }

  // Cadastro Mágico: sem selo no que foi lido sem dúvida, o nome obrigatório, as sugestões de várias escolhas e o que volta ao formulário.
  {
    await abrirNovo(1280, 800, "papel", "/leads/novo/");
    await cliqueNoTexto("form button", "+ Colar mensagem");
    await espera(300);
    await preencher("#mensagem", MENSAGEM);
    await espera(300);
    const a = await pagina("({ titulo: t(q('#campos-encontrados') ?? qs('main .mb-cartao__titulo').find((e) => /campos encontrados/.test(t(e)))), selos: qs('main .mb-pares .mb-selo').length, pares: qs('main .mb-pares dt').map(t), avisoNome: !!qs('main .mb-aviso').find((e) => /nome é obrigatório/.test(t(e))), pilulas: qs('.mb-opcoes--multipla .mb-opcao').map(t) })");
    confere("mágico: 4 de 4 campos, sem selo no que foi lido sem dúvida e sem aviso de nome", /4 de 4 campos encontrados/.test(a.titulo) && a.selos === 0 && a.pares.join() === "Nome,WhatsApp,E-mail,Empreendimento" && !a.avisoNome, a);
    await cliqueNoTexto(".mb-opcoes--multipla .mb-opcao", "Até R$ 600.000");
    await cliqueNoTexto(".mb-opcoes--multipla .mb-opcao", "2 dormitórios");
    const marcadas = await pagina("qs('.mb-opcoes--multipla .mb-opcao[aria-pressed=true]').map(t)");
    confere("mágico: as sugestões de perfil marcam várias de uma vez", marcadas.length === 2, marcadas);
    await cliqueNoTexto("button", "Usar estes dados");
    await espera(300);
    const f = await pagina("({ nome: q('#novo-nome').value, zap: q('#novo-whatsapp').value, email: q('#novo-email').value, emp: q('#novo-empreendimento').value, aviso: t(q('form .mb-aviso--sucesso .mb-aviso__titulo')), perfil: t(qs('form .mb-aviso').find((e) => /Perfil da mensagem/.test(t(e)))), detalhes: q('details.mb-recolhivel').open })");
    confere("mágico: os campos voltam ao formulário, o perfil escolhido aparece e Mais detalhes abre", f.nome === "Carla Exemplo" && f.zap === "(11) 97777-1234" && f.email === "carla@example.invalid" && f.emp === "Residencial Exemplo" && f.aviso === "Dados da mensagem preenchidos" && /Até R\$ 600\.000 · 2 dorm\./.test(f.perfil) && f.detalhes, f);
    await cliqueNoTexto("form .mb-aviso__acoes button", "Não usar");
    const semPerfil = await pagina("!qs('form .mb-aviso').some((e) => /Perfil da mensagem/.test(t(e)))");
    confere("mágico: Não usar tira o perfil", semPerfil === true);
    await cliqueNoTexto("form .mb-aviso__acoes button", "Colar outra");
    await espera(300);
    await preencher("#mensagem", "Quero saber o preço. Meu e-mail é joana@example.invalid");
    await espera(300);
    const sem = await pagina("({ avisoNome: t(qs('main .mb-aviso').find((e) => /nome é obrigatório/.test(t(e)))), selos: qs('main .mb-pares .mb-selo').map(t) })");
    confere("mágico: sem nome aparece “O nome é obrigatório” e o selo só no que pede atenção (✕ Não encontrado)", /O nome é obrigatório/.test(sem.avisoNome) && sem.selos.length >= 1 && sem.selos.every((x) => /Conferir|Não encontrado/.test(x)), sem);
  }

  writeFileSync(join(saida, "resultado.json"), JSON.stringify(resultado, null, 2));
  const falhasNovo = Object.values(resultado).filter((r) => !r.ok).length;
  console.log(`
${Object.keys(resultado).length} conferências, ${falhasNovo} falhas. Prints em ${saida}`);
  ws.close();
  process.exit(falhasNovo ? 1 : 0);
}

// 9d. Entrar e Minha conta (passo h). Roda com --conta, depois do visual-preview.mjs e do build da prévia:
//   node scripts/conferir-alicerce.mjs local/alicerce/passo-h --conta
//   Asserções: HTML dos previews Entrar e MinhaConta, sem DS antigo nem extras (Esqueci a senha, Continuar conectado), Mostrar/Ocultar,
//   erros de login, Entrar esperando (aria-busy, ?qa=espera na prévia), o índice (topo, links e fim), as cinco seções, WhatsApp, Trocar senha,
//   Avisos (?qa=avisos-ligados e ?qa=avisos-desligados, com o push simulado na prévia), a nota do iPhone, alvos de 44px, campos de 16px e foco visível.
if (soConta) {
  const visivel = "(e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'";
  const lateral = () => avaliar("document.documentElement.scrollWidth > document.documentElement.clientWidth");
  const preencher = (sel, v) => avaliar(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(e.constructor.prototype, "value").set; set.call(e, ${JSON.stringify(v)}); e.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
  const tocar = (sel, texto) => avaliar(`(() => { const ok = ${visivel}; const b = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(ok).find((e) => !${JSON.stringify(texto ?? null)} || e.textContent.trim().replace(/\\s+/g, ' ') === ${JSON.stringify(texto ?? "")}); if (!b) return false; b.click(); return true; })()`);
  const pagina = (expr) => avaliar(`(() => { const q = (s) => document.querySelector(s); const qs = (s) => [...document.querySelectorAll(s)]; const t = (e) => (e?.textContent ?? '').trim().replace(/\\s+/g, ' '); return (${expr}); })()`);
  const abrirConta = async (w, h, tema, caminho) => {
    erros.length = 0;
    await tela(w, h);
    await comArmazenamento({ mb_tema: tema }, caminho);
    await espera(900);
  };
  const registrar = async (nome) => {
    await espera(500);
    // Viewport da altura da página: o menu e a barra do celular são sticky e, numa captura além da janela, apareceriam no meio.
    const alturaTotal = await avaliar("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)");
    const larguraAtual = await avaliar("document.documentElement.clientWidth");
    await tela(larguraAtual, Math.max(alturaTotal, 640));
    await espera(300);
    const lat = await lateral();
    await print(nome);
    await tela(larguraAtual, 800);
    confere(`print ${nome}: sem rolagem lateral e sem erro no console`, !lat && erros.length === 0, { lat, erros: [...erros] });
  };
  // Medidas da página (rodam dentro dela): rolagem, h1, DS antigo, alvos de 44px, campos de 16px.
  function medirNaPagina(largura) {
    const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
    const qs = (s) => [...document.querySelectorAll(s)];
    // O Mostrar preenche o campo por dentro da borda (o grupo tem 44px e a borda de 1px come 2px): o alvo é o campo inteiro.
    const altura = (e) => (e.classList.contains("mb-campo__mostrar") ? e.closest(".mb-campo__grupo") : e).getBoundingClientRect().height;
    const rotulo = (e) => (e.getAttribute("aria-label") || e.textContent || e.id || "").trim().replace(/\s+/g, " ").slice(0, 40);
    const interativos = qs("main a[href], main button, main select, main input:not([type=hidden]), main textarea, .mb-entrar a[href], .mb-entrar button, .mb-entrar input").filter(vis).filter((e) => !e.disabled);
    return {
      rolagemLateral: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      h1Visivel: qs("h1").filter((e) => vis(e) && !e.classList.contains("mb-visualmente-oculto")).length,
      h1Oculto: qs("h1.mb-visualmente-oculto").length,
      antigo: qs(".card, .bar-brand, .btn, .input, .field-label, .aviso-erro, .aviso-ok, .titulo-card, .titulo-pagina, .eyebrow, .cabecalho-vidro, .checkbox").filter(vis).map((e) => e.className).slice(0, 5),
      ponte: qs(".ds-antigo").length,
      pequenos: largura < 768 ? interativos.filter((e) => altura(e) < 43.5).map((e) => rotulo(e) + " " + Math.round(altura(e))) : [],
      fontePequena: largura < 768 ? qs("input:not([type=hidden]):not([type=checkbox]), select, textarea").filter(vis).filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id) : [],
      semBarraLateral: qs(".mb-cartao, .mb-entrar__cartao").every((e) => parseFloat(getComputedStyle(e).borderLeftWidth) <= 1.01),
    };
  }
  const medir = (w) => avaliar(`(${medirNaPagina.toString()})(${w})`);

  for (const [w, h] of [[375, 812], [1280, 800]]) {
    for (const tema of ["papel", "grafite"]) {
      const id = `${w}-${tema}`;
      // ---- Entrar ----
      await abrirConta(w, h, tema, "/entrar/");
      const m = await medir(w);
      const semAnel = await focoVisivel(5);
      const e = await pagina(`({
        caixa: !!q('.mb-entrar > .mb-entrar__caixa > .mb-entrar__marca .mb-marca[role=img][aria-label="Base360 · Vendas"]'),
        cartao: !!q('.mb-entrar__caixa > form.mb-entrar__cartao > .mb-entrar__cabeca > h1.mb-entrar__titulo + p.mb-entrar__texto'),
        titulo: t(q('h1.mb-entrar__titulo')),
        campos: qs('.mb-entrar__form > label.mb-campo > .mb-campo__rotulo').map(t),
        email: !!q('.mb-entrar__form > label.mb-campo > input#email.mb-campo__entrada[type=email][autocomplete=username][inputmode=email]'),
        senha: !!q('.mb-entrar__form > label.mb-campo > .mb-campo__grupo[data-mb-senha] > input#senha.mb-campo__entrada[type=password][autocomplete=current-password] + button.mb-campo__mostrar[type=button][aria-pressed=false]'),
        mostrar: t(q('.mb-campo__mostrar')),
        botao: !!q('.mb-entrar__form > button.mb-botao.mb-botao--primario.mb-botao--g.mb-botao--bloco[type=submit]'),
        rodape: !!q('.mb-entrar__caixa > .mb-entrar__rodape > .mb-logo-mbigucci > img[alt=MBigucci]'),
        fraseRodape: t(q('.mb-entrar__rodape > span:not(.mb-logo-mbigucci)')),
        semMenu: !q('.mb-menu, .mb-topo, .mb-celular-topo'),
        semExtras: !/Esqueci minha senha|Continuar conectado/.test(document.body.innerText),
        conexao: !!q('.mb-conexao'),
      })`);
      confere(`entrar ${id}: HTML do preview, sem DS antigo, sem extras, alvos de 44px, campos de 16px, foco visível e sem erro no console`,
        e.caixa && e.cartao && e.titulo === "Entrar" && e.email && e.senha && e.mostrar === "Mostrar" && e.botao && e.rodape && /gerente geral/.test(e.fraseRodape) && e.semMenu && e.semExtras && e.conexao
          && !m.rolagemLateral && m.h1Visivel === 1 && m.antigo.length === 0 && m.ponte === 0 && m.pequenos.length === 0 && m.fontePequena.length === 0 && m.semBarraLateral && semAnel.length === 0 && erros.length === 0,
        { e, m, semAnel, erros: [...erros] });

      // Mostrar / Ocultar: alterna o tipo, o texto e o aria-pressed e devolve o foco à entrada.
      await preencher("#senha", "segredo-ficticio");
      await tocar(".mb-campo__mostrar");
      const mostrando = await pagina(`({ tipo: q('#senha').type, texto: t(q('.mb-campo__mostrar')), pressed: q('.mb-campo__mostrar').getAttribute('aria-pressed'), foco: document.activeElement === q('#senha') })`);
      await tocar(".mb-campo__mostrar");
      const oculto = await pagina(`({ tipo: q('#senha').type, texto: t(q('.mb-campo__mostrar')), pressed: q('.mb-campo__mostrar').getAttribute('aria-pressed') })`);
      confere(`entrar ${id}: Mostrar e Ocultar a senha`, mostrando.tipo === "text" && mostrando.texto === "Ocultar" && mostrando.pressed === "true" && mostrando.foco && oculto.tipo === "password" && oculto.texto === "Mostrar" && oculto.pressed === "false", { mostrando, oculto });

      // Validação e erro de login (mesmas mensagens e condições de hoje).
      await abrirConta(w, h, tema, "/entrar/");
      await tocar("form button[type=submit]");
      const vazio = await pagina(`({ texto: t(q('.mb-entrar__cartao .mb-aviso--erro .mb-aviso__titulo')), role: q('.mb-entrar__cartao .mb-aviso--erro')?.getAttribute('role') })`);
      await preencher("#email", "marina@example.invalid");
      await preencher("#senha", "senha-errada");
      await tocar("form button[type=submit]");
      await espera(600);
      const errado = await pagina(`({ texto: t(q('.mb-entrar__cartao .mb-aviso--erro .mb-aviso__titulo')), role: q('.mb-aviso--erro')?.getAttribute('role'), antesDosCampos: !!q('.mb-aviso--erro + .mb-entrar__form') })`);
      confere(`entrar ${id}: erro de e-mail inválido e de login (Aviso --erro acima dos campos, sem dizer qual errou)`,
        vazio.texto === "Informe um e-mail válido." && vazio.role === "alert" && errado.texto === "E-mail ou senha não conferem." && errado.role === "alert" && errado.antesDosCampos && erros.length === 0, { vazio, errado, erros: [...erros] });
      await registrar(`entrar-${id}-erro`);

      // Esperando a resposta: botão com aria-busy="true" e "Entrando…", campos desativados, sem tela de carregando por cima.
      await abrirConta(w, h, tema, "/entrar/?qa=espera");
      await preencher("#email", "marina@example.invalid");
      await preencher("#senha", "senha-errada");
      await tocar("form button[type=submit]");
      await espera(500);
      const espera1 = await pagina(`({ busy: q('form button[type=submit]').getAttribute('aria-busy'), texto: t(q('form button[type=submit]')), desativado: q('form button[type=submit]').disabled, campos: qs('#email, #senha, .mb-campo__mostrar').map((e) => e.disabled), carregando: !!q('[aria-busy=true]:not(button)') })`);
      confere(`entrar ${id}: esperando a resposta (aria-busy, Entrando…, campos desativados)`,
        espera1.busy === "true" && espera1.texto === "Entrando…" && espera1.desativado && espera1.campos.every(Boolean) && !espera1.carregando && erros.length === 0, { espera1, erros: [...erros] });
      await registrar(`entrar-${id}-espera`);

      // ---- Minha conta ----
      for (const qa of ["avisos-desligados", "avisos-ligados"]) {
        await abrirConta(w, h, tema, `/conta/?qa=${qa}`);
        const mc = await medir(w);
        const anel = await focoVisivel(w < 768 ? 10 : 16);
        const c = await pagina(`({
          secoes: qs('.mb-ajustes__secoes section.mb-cartao').map((s) => s.id),
          labelledby: qs('.mb-ajustes__secoes section.mb-cartao').every((s) => q('#' + s.getAttribute('aria-labelledby'))),
          titulos: qs('.mb-ajustes__secoes .mb-cartao__titulo').map(t),
          indice: qs('ul.mb-ajustes__indice[aria-label=Seções] > li > a').map((a) => a.getAttribute('href')),
          subtitulo: t(q('.mb-cabecalho--compacto .mb-cabecalho__subtitulo')),
          semBotaoSair: !qs('main button').some((b) => /^Sair/.test(t(b))),
          acaoPrimaria: qs('main .mb-botao--primario').map(t),
          whatsapp: !!q('section#whatsapp > .mb-cartao__corpo > label.mb-campo > input#meu-whatsapp.mb-campo__entrada[type=tel][autocomplete=tel]') && !!q('section#whatsapp > .mb-cartao__rodape > button.mb-botao.mb-botao--primario[type=submit]'),
          whatsappValor: q('#meu-whatsapp').value,
          aparencia: qs('#aparencia .mb-aparencia__linha').length === 4,
          avisos: qs('#avisos button.mb-interruptor[role=switch][aria-checked][aria-label] > .mb-interruptor__estado + .mb-interruptor__trilho[aria-hidden=true]').length,
          ajustes: qs('#avisos .mb-ajuste > .mb-ajuste__texto > .mb-ajuste__rotulo + .mb-ajuste__ajuda').length,
          rodapeAvisos: qs('#avisos .mb-cartao__rodape button').map(t),
          estado: t(q('#avisos .mb-salvo')),
          notaIphone: !!qs('#avisos .mb-ajuste__ajuda').find((e) => /^iPhone:/.test(t(e))),
          passos: qs('#instalar ol.mb-passos-instalar').map((o) => o.children.length),
          numerados: qs('#instalar ol.mb-passos-instalar').every((o) => getComputedStyle(o).listStyleType === 'decimal'),
          requisitos: qs('#senha ul.mb-requisitos > li[data-regra]').map((li) => li.dataset.regra),
          senhaCampos: qs('#senha .mb-campo__grupo[data-mb-senha] > input[type=password][autocomplete=new-password] + button.mb-campo__mostrar[aria-pressed=false]').length,
          instalarTextos: t(q('#instalar')),
        })`);
        const ligadoOk = qa === "avisos-ligados";
        confere(`conta ${id} ${qa}: HTML do preview, só as cinco seções, sem DS antigo, alvos de 44px, campos de 16px, foco visível e sem erro no console`,
          c.secoes.join() === "whatsapp,aparencia,avisos,senha,instalar" && c.labelledby && c.titulos.join("|") === "Seu WhatsApp|Aparência|Avisos neste aparelho|Trocar senha|Instalar no celular"
            && c.indice.join() === "#whatsapp,#aparencia,#avisos,#senha,#instalar" && /Marina Exemplo · Corretor · /.test(c.subtitulo) && c.semBotaoSair && c.acaoPrimaria.length === 1 && c.acaoPrimaria[0] === "Salvar WhatsApp"
            && c.whatsapp && c.whatsappValor === "(11) 99999-0000" && c.aparencia && c.avisos > 0 && c.ajustes === c.avisos
            && (ligadoOk ? c.rodapeAvisos.join("|") === "Desligar neste aparelho|Enviar um aviso de teste" && /^✓ Ligados/.test(c.estado) : c.rodapeAvisos.join("|") === "Ligar avisos neste aparelho" && /^– Desligados/.test(c.estado))
            && !c.notaIphone && c.passos.join() === "3,3" && c.numerados && c.requisitos.join() === "tamanho,igual" && c.senhaCampos === 2
            && /Android/.test(c.instalarTextos) && /iPhone/.test(c.instalarTextos) && !/versão/.test(c.instalarTextos)
            && !mc.rolagemLateral && mc.h1Visivel === 0 && mc.h1Oculto === 1 && mc.antigo.length === 0 && mc.ponte === 0 && mc.pequenos.length === 0 && mc.fontePequena.length === 0 && mc.semBarraLateral && anel.length === 0 && erros.length === 0,
          { c, mc, anel, erros: [...erros] });
        if (qa === "avisos-ligados") await registrar(`conta-${id}`);
      }

      // Índice: marca a primeira com a página no topo, cada seção ao seguir o link e a última no fim da rolagem.
      if (w >= 1024) {
        await abrirConta(w, h, tema, "/conta/?qa=avisos-ligados");
        const marcada = () => pagina("qs('.mb-ajustes__indice a[aria-current=true]').map((a) => a.getAttribute('href')).join()");
        const noTopo = await marcada();
        const porLink = {};
        for (const sid of ["aparencia", "avisos", "senha", "instalar", "whatsapp"]) {
          await tocar(`.mb-ajustes__indice a[href="#${sid}"]`);
          await espera(500);
          porLink[sid] = await marcada();
        }
        await avaliar("window.scrollTo(0, 0); true");
        await espera(300);
        const topo2 = await marcada();
        await avaliar("window.scrollTo(0, document.documentElement.scrollHeight); true");
        await espera(400);
        const fim = await marcada();
        confere(`conta ${id}: o índice marca Seu WhatsApp no topo, cada seção ao seguir o link e a última no fim`,
          noTopo === "#whatsapp" && topo2 === "#whatsapp" && fim === "#instalar" && Object.entries(porLink).every(([k, v]) => v === "#" + k), { noTopo, topo2, fim, porLink });
      }

      // Comportamento da página (sem gravar: a prévia desativa as gravações).
      await abrirConta(w, h, tema, "/conta/?qa=avisos-desligados");
      // WhatsApp: número inválido mostra o erro no campo; digitar limpa.
      await preencher("#meu-whatsapp", "123");
      await tocar("section#whatsapp button[type=submit]");
      const zap = await pagina(`({ erro: t(q('#meu-whatsapp-erro')), invalido: q('#meu-whatsapp').getAttribute('aria-invalid'), desc: q('#meu-whatsapp').getAttribute('aria-describedby'), campoErro: !!q('#whatsapp label.mb-campo--erro') })`);
      await preencher("#meu-whatsapp", "(11) 98765-4321");
      const zapLimpou = await pagina("!q('#meu-whatsapp-erro') && !q('#meu-whatsapp').hasAttribute('aria-invalid')");
      confere(`conta ${id}: WhatsApp inválido mostra o erro no campo e digitar limpa`, /Confira o WhatsApp/.test(zap.erro) && zap.invalido === "true" && zap.desc === "meu-whatsapp-erro" && zap.campoErro && zapLimpou, { zap, zapLimpou });
      // Trocar senha: curta, diferente; os requisitos acendem.
      await preencher("#nova", "curta");
      await tocar("#senha button[type=submit]");
      const curta = await pagina(`({ texto: t(q('#senha .mb-aviso--erro .mb-aviso__titulo')), ok: qs('#senha .mb-requisitos li[data-ok]').length })`);
      await preencher("#nova", "senha-longa-1");
      await preencher("#confirma", "outra-senha-1");
      await tocar("#senha button[type=submit]");
      const diferente = await pagina(`({ texto: t(q('#senha .mb-aviso--erro .mb-aviso__titulo')), ok: qs('#senha .mb-requisitos li[data-ok]').map((li) => li.dataset.regra).join() })`);
      await preencher("#confirma", "senha-longa-1");
      const iguais = await pagina(`qs('#senha .mb-requisitos li[data-ok]').map((li) => li.dataset.regra).join()`);
      confere(`conta ${id}: Trocar senha com as mesmas validações e os dois requisitos acendendo`,
        curta.texto === "A senha precisa ter ao menos 8 caracteres." && curta.ok === 0 && diferente.texto === "As duas senhas não são iguais." && diferente.ok === "tamanho" && iguais === "tamanho,igual", { curta, diferente, iguais });
      await tocar("#senha .mb-campo__mostrar");
      const mostrouNova = await pagina("q('#nova').type");
      confere(`conta ${id}: Mostrar na senha nova`, mostrouNova === "text");
      // Avisos desligados: o interruptor muda o tipo escolhido na hora; Ativar liga e mostra o aviso de sucesso.
      const antes = await pagina("qs('#avisos button.mb-interruptor').map((b) => b.getAttribute('aria-checked')).join()");
      await tocar("#avisos button.mb-interruptor");
      const depois = await pagina("qs('#avisos button.mb-interruptor').map((b) => b.getAttribute('aria-checked')).join()");
      await tocar("#avisos .mb-cartao__rodape button", "Ligar avisos neste aparelho");
      await espera(400);
      const ativou = await pagina(`({ estado: t(q('#avisos .mb-salvo')), aviso: t(q('#avisos .mb-aviso--sucesso .mb-aviso__titulo')), role: q('#avisos .mb-aviso--sucesso')?.getAttribute('role'), rodape: qs('#avisos .mb-cartao__rodape button').map(t).join('|') })`);
      confere(`conta ${id}: Avisos (interruptor, Ligar avisos neste aparelho e o aviso de sucesso)`,
        antes.split(",")[0] !== depois.split(",")[0] && /^✓ Ligados/.test(ativou.estado) && /Enviar um aviso de teste/.test(ativou.aviso) && ativou.role === "status" && ativou.rodape === "Desligar neste aparelho|Enviar um aviso de teste", { antes, depois, ativou });
      await tocar("#avisos .mb-cartao__rodape button", "Enviar um aviso de teste");
      await espera(300);
      const teste = await pagina("t(q('#avisos .mb-aviso--sucesso .mb-aviso__titulo'))");
      confere(`conta ${id}: Enviar um aviso de teste`, /Teste enviado/.test(teste), { teste });
      // Aparência continua trocando na hora.
      await tocar("#aparencia .mb-segmentado[data-mb-preferencia=movimento] button", "Reduzido");
      const mov = await avaliar("document.documentElement.getAttribute('data-movimento')");
      await tocar("#aparencia [data-mb-padrao]");
      confere(`conta ${id}: Aparência troca na hora e volta ao padrão`, mov === "reduzido", { mov });
    }
  }

  // A nota do iPhone só aparece no iPhone e fica separada do estado e da primeira linha.
  await cdp("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1" });
  await abrirConta(375, 812, "papel", "/conta/?qa=avisos-ligados");
  const iph = await pagina(`(() => { const nota = qs('#avisos .mb-ajuste__ajuda').find((e) => /^iPhone:/.test(t(e))); const estado = q('#avisos .mb-salvo'); const primeira = q('#avisos .mb-ajuste'); const r = (e) => e.getBoundingClientRect(); return nota && estado && primeira ? { nota: true, folga1: Math.round(r(estado).top - r(nota).bottom), folga2: Math.round(r(primeira).top - r(estado).bottom) } : { nota: !!nota }; })()`);
  await cdp("Emulation.setUserAgentOverride", { userAgent: "" });
  await abrirConta(375, 812, "papel", "/conta/?qa=avisos-ligados");
  const semIph = await pagina("!qs('#avisos .mb-ajuste__ajuda').find((e) => /^iPhone:/.test(t(e)))");
  await abrirConta(1280, 800, "papel", "/conta/?qa=avisos-ligados");
  const folgas = await pagina(`(() => { const estado = q('#avisos .mb-salvo'); const primeira = q('#avisos .mb-ajuste'); return { folga: Math.round(primeira.getBoundingClientRect().top - estado.getBoundingClientRect().bottom) }; })()`);
  confere("conta: a nota do iPhone só no iPhone, com folga de 16px até o estado e do estado até a primeira linha", iph.nota && iph.folga1 >= 15 && iph.folga2 >= 15 && semIph && folgas.folga >= 15, { iph, semIph, folgas });

  writeFileSync(join(saida, "resultado.json"), JSON.stringify(resultado, null, 2));
  const falhasConta = Object.values(resultado).filter((r) => !r.ok).length;
  console.log(`\n${Object.keys(resultado).length} conferências, ${falhasConta} falhas. Prints em ${saida}`);
  ws.close();
  process.exit(falhasConta ? 1 : 0);
}

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
