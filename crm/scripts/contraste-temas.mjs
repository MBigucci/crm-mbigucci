// Audita os valores usados pelo app, sem uma segunda cópia da paleta.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
export const paletas = Object.fromEntries([
  ['claro', /:root\s*\{([^}]+)\}/],
  ['escuro', /:root\[data-tema="escuro"\]\s*\{([^}]+)\}/],
].map(([tema, regex]) => [tema, Object.fromEntries([...css.match(regex)[1].matchAll(/--([\w-]+):\s*([\d ]+);/g)].map(([,k,v])=>[k,v.trim().split(/\s+/).map(Number)]))]));
export function contraste(a, b) {
  const lum = (rgb) => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s,v,i) => s + v * [.2126,.7152,.0722][i], 0);
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}
export const pares = [];
for (const fundo of ['paper','surface','tint-brand']) {
  for (const texto of ['ink','ink-soft','concrete','brand','brand-dark','ok','wa','neutral-mark']) pares.push([texto,fundo,4.5,'texto']);
  for (const borda of ['control','brand']) pares.push([borda,fundo,3,'controle/foco']);
}
for (const texto of ['ink','ink-soft','concrete']) pares.push([texto,'surface-disabled',4.5,'texto']);
for (const fundo of ['brand','brand-dark']) pares.push(['on-brand',fundo,4.5,'botão principal']);
for (const texto of ['on-dark','on-dark-soft','on-dark-muted']) pares.push([texto,'band',4.5,'faixa escura']);
pares.push(['brand','band',3,'barra/foco'],['surface','ink',4.5,'seleção'],['ok','line',3,'progresso'],['ink','line',3,'progresso']);
export const resultados = pares.map(([frente,fundo,minimo,uso]) => ({frente,fundo,minimo,uso,...Object.fromEntries(Object.entries(paletas).map(([t,p])=>[t,contraste(p[frente],p[fundo])]))}));
for (const r of resultados) for (const tema of Object.keys(paletas)) assert.ok(r[tema] >= r.minimo, `${tema}: ${r.frente}/${r.fundo} = ${r[tema]} < ${r.minimo}`);
if (process.argv[1]?.endsWith('contraste-temas.mjs')) {
  console.log('| Par (frente / fundo) | Claro | Escuro | Mínimo | Uso |');
  console.log('| --- | ---: | ---: | ---: | --- |');
  for (const r of resultados) console.log(`| ${r.frente} / ${r.fundo} | ${r.claro.toFixed(2)}:1 | ${r.escuro.toFixed(2)}:1 | ${r.minimo}:1 | ${r.uso} |`);
  console.log(`${resultados.length * 2} pares aprovados (comparação sem arredondamento).`);
}
