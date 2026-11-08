// Audita os tokens do Alicerce usados pelo app, sem uma segunda cópia da paleta.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const css = readFileSync(new URL('../src/alicerce/tokens.css', import.meta.url), 'utf8');
export const pares = [];
for (const fundo of ['fundo', 'superficie', 'campo']) {
  for (const texto of ['texto', 'texto-suave', 'texto-sutil', 'link']) pares.push([texto, fundo, 4.5, 'texto']);
  pares.push(['linha-forte', fundo, 3, 'controle']);
}
for (const [frente, fundo] of [
  ['sobre-acao', 'acao'], ['sobre-acao-marca', 'acao-marca'], ['sobre-whatsapp', 'whatsapp'],
  ['sucesso-texto', 'sucesso-fundo'], ['alerta-texto', 'alerta-fundo'], ['erro-texto', 'erro-fundo'],
  ['info-texto', 'info-fundo'], ['sobre-faixa', 'faixa'],
  ['sobre-menu', 'menu-escuro'], ['sobre-menu-ativo', 'menu-ativo'],
]) pares.push([frente, fundo, 4.5, 'texto de estado/ação']);
export const paletas = Object.fromEntries([
  ['claro', /:root, \[data-theme="papel"\]\s*\{([^}]+)\}/],
  ['escuro', /\[data-theme="grafite"\]\s*\{([^}]+)\}/],
].map(([tema, regex]) => {
  const valores = Object.fromEntries([...css.match(regex)[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]));
  const resolver = (nome) => {
    const v = valores[nome];
    assert.ok(v, `Token do Alicerce ausente: ${nome}`);
    if (v.startsWith('var(')) return resolver(v.match(/^var\(--([\w-]+)\)$/)[1]);
    assert.match(v, /^#[0-9a-f]{6}$/i, `Cor sólida esperada: ${nome}`);
    return [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16));
  };
  return [tema, Object.fromEntries([...new Set(pares.flatMap(([frente, fundo]) => [frente, fundo]))].map(k => [k, resolver(k)]))];
}));
export function contraste(a, b) {
  const lum = (rgb) => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s,v,i) => s + v * [.2126,.7152,.0722][i], 0);
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}
export const resultados = pares.map(([frente,fundo,minimo,uso]) => ({frente,fundo,minimo,uso,...Object.fromEntries(Object.entries(paletas).map(([t,p])=>[t,contraste(p[frente],p[fundo])]))}));
for (const r of resultados) for (const tema of Object.keys(paletas)) assert.ok(r[tema] >= r.minimo, `${tema}: ${r.frente}/${r.fundo} = ${r[tema]} < ${r.minimo}`);
if (process.argv[1]?.endsWith('contraste-temas.mjs')) {
  console.log('| Par (frente / fundo) | Claro | Escuro | Mínimo | Uso |');
  console.log('| --- | ---: | ---: | ---: | --- |');
  for (const r of resultados) console.log(`| ${r.frente} / ${r.fundo} | ${r.claro.toFixed(2)}:1 | ${r.escuro.toFixed(2)}:1 | ${r.minimo}:1 | ${r.uso} |`);
  console.log(`${resultados.length * 2} pares aprovados (comparação sem arredondamento).`);
}
