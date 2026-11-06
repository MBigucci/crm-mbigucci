// Captura docs/mockups/visual-diretoria.html (4 direções x celular/notebook x claro/escuro) em Chrome headless de teste.
// Abre o próprio Chrome (porta 9557) com perfil em crm/local/visual-diretoria/perfil, nunca o do usuário.
// Uso (em crm/): node scripts/capturar-visual-diretoria.mjs [pastaSaida]   (padrão: local/visual-diretoria)
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const saida = process.argv[2] ?? fileURLToPath(new URL("../local/visual-diretoria/", import.meta.url));
mkdirSync(saida, { recursive: true });
const perfil = fileURLToPath(new URL("../local/visual-diretoria/perfil", import.meta.url));
const pagina = new URL("../../docs/mockups/visual-diretoria.html", import.meta.url).href;
const chromePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const porta = 9557;
const chrome = spawn(chromePath, ["--headless=new", `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`, "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let alvo;
for (let i = 0; i < 40 && !alvo; i++) { try { alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: "PUT" })).json(); } catch { await espera(250); } }
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const cdp = (method, params = {}) => new Promise((r) => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const av = async (expr) => (await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const medidas = {};
try {
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.enable");
  await cdp("Page.navigate", { url: pagina });
  await espera(1500);
  for (const dir of ["B", "A", "M", "C"]) for (const dev of ["m", "n"]) for (const tema of ["claro", "escuro"]) {
    await av(`__visualDiretoria.set({dir:"${dir}",dev:"${dev}",tema:"${tema}",mov:"reduzido"})`);
    await espera(250);
    const r = await av(`(()=>{const f=document.querySelector(".frame").getBoundingClientRect();return {x:f.left+scrollX,y:f.top+scrollY,w:f.width,h:f.height}})()`);
    const shot = await cdp("Page.captureScreenshot", { format: "png", clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
    writeFileSync(join(saida, `${dir}-${dev === "m" ? "celular" : "notebook"}-${tema}.png`), Buffer.from(shot.result.data, "base64"));
    // Medidas: alvo de toque no celular, família da fonte e animação declarada.
    medidas[`${dir}-${dev}-${tema}`] = await av(`(()=>{const q=(s)=>[...document.querySelectorAll(s)];const h=q(".frame .btn").filter(b=>b.getBoundingClientRect().height>0).map(b=>Math.round(b.getBoundingClientRect().height));return {menorBotao:Math.min(...h),fonteTitulo:getComputedStyle(document.querySelector(".nome")).fontFamily.split(",")[0],raioCard:getComputedStyle(document.querySelector(".card")).borderTopLeftRadius,rolaHorizontal:document.documentElement.scrollWidth>document.documentElement.clientWidth,sombraItemAtual:getComputedStyle(document.querySelector('.lateral a[aria-current]')).boxShadow,navMark:getComputedStyle(document.querySelector('.frame')).getPropertyValue('--nav-mark').trim()}})()`);
  }
  // Movimento: com o reduzido ligado, nada anima; com o normal, o card entra com animação.
  await av(`__visualDiretoria.set({dir:"B",dev:"m",tema:"claro",mov:"normal"},true)`);
  await espera(50);
  medidas.animacaoNormal = await av(`getComputedStyle(document.querySelector(".card.ent")).animationName+" "+getComputedStyle(document.querySelector(".card.ent")).animationDuration`);
  await av(`__visualDiretoria.set({mov:"reduzido"},true)`);
  medidas.animacaoReduzida = await av(`getComputedStyle(document.querySelector(".card.ent")).animationName+" "+getComputedStyle(document.querySelector(".card.ent")).transitionDuration`);
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await av(`__visualDiretoria.set({mov:"normal"},true)`);
  await espera(50);
  medidas.animacaoComSistemaReduzido = await av(`getComputedStyle(document.querySelector(".card.ent")).animationName`);
  // Menu do celular aberto (folha animada).
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await av(`__visualDiretoria.set({dir:"B",dev:"m",tema:"claro",mov:"reduzido"})`);
  await av(`document.getElementById("abre-menu").click()`);
  await espera(300);
  const r2 = await av(`(()=>{const f=document.querySelector(".frame").getBoundingClientRect();return {x:f.left+scrollX,y:f.top+scrollY,w:f.width,h:f.height}})()`);
  const s2 = await cdp("Page.captureScreenshot", { format: "png", clip: { x: r2.x, y: r2.y, width: r2.w, height: r2.h, scale: 1 } });
  writeFileSync(join(saida, "B-celular-claro-menu.png"), Buffer.from(s2.result.data, "base64"));
  // Clique real em Escuro (C notebook): a lateral clara vira escura e o logo tem de trocar junto.
  await av(`__visualDiretoria.set({dir:"C",dev:"n",tema:"claro",mov:"normal"})`);
  await av(`document.querySelector('[data-g=tema] [data-v=escuro]').click()`);
  await espera(500);
  medidas.cliqueTemaC = await av(`(()=>{const l=document.querySelector(".lateral .marca svg path[fill]");return {tema:document.documentElement.dataset.tema,logoLateral:document.querySelector(".lateral .marca svg g path").getAttribute("fill"),corLateral:getComputedStyle(document.querySelector(".lateral")).backgroundColor}})()`);
  const r3 = await av(`(()=>{const f=document.querySelector(".frame").getBoundingClientRect();return {x:f.left+scrollX,y:f.top+scrollY,w:f.width,h:f.height}})()`);
  const s3 = await cdp("Page.captureScreenshot", { format: "png", clip: { x: r3.x, y: r3.y, width: r3.w, height: r3.h, scale: 1 } });
  writeFileSync(join(saida, "C-notebook-clique-escuro.png"), Buffer.from(s3.result.data, "base64"));
  // Página aberta num celular de verdade (viewport 375): sem rolagem horizontal, nos dois modos.
  await cdp("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp("Page.navigate", { url: pagina });
  await espera(1200);
  for (const dev of ["m", "n"]) {
    await av(`__visualDiretoria.set({dir:"B",dev:"${dev}",tema:"claro",mov:"reduzido"})`);
    await espera(250);
    medidas["pagina375-" + dev] = await av(`({scrollW:document.documentElement.scrollWidth,clientW:document.documentElement.clientWidth,frameW:Math.round(document.querySelector(".frame").getBoundingClientRect().width)})`);
    const shot = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(join(saida, "pagina-375-" + (dev === "m" ? "celular" : "notebook") + ".png"), Buffer.from(shot.result.data, "base64"));
  }
  writeFileSync(join(saida, "medidas.json"), JSON.stringify(medidas, null, 1));
  console.log(JSON.stringify(medidas, null, 1));
} finally { ws.close(); chrome.kill(); }
