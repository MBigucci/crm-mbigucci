// Compara marca/tokens/tokens.json com o crm/src/app/globals.css em produção.
// Sem dependências. Uso: node marca/tokens/conferir.mjs   (sai com 1 se algo divergir)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..", "..");
const tokens = JSON.parse(readFileSync(join(aqui, "tokens.json"), "utf8"));
const css = readFileSync(join(raiz, "crm", "src", "app", "globals.css"), "utf8");

const cores = new Map(tokens.color.tokens.map((t) => [t.name, t.value]));
const todos = new Map();
for (const [familia, v] of Object.entries(tokens)) {
  if (familia !== "color" && v && Array.isArray(v.tokens)) for (const t of v.tokens) todos.set(t.name, t.value);
}
const valorNoTema = (v, tema) => (typeof v === "string" ? v : v[tema] ?? v.light);

const divergencias = [];
let conferidos = 0;
const confere = (onde, esperado, obtido) => {
  conferidos++;
  if (String(esperado).toLowerCase() !== String(obtido).toLowerCase()) divergencias.push(`${onde}: CRM ${obtido}, tokens.json ${esperado}`);
};

// Bloco de declarações logo depois de um seletor (o primeiro a partir de "desde").
function bloco(seletor, desde = 0) {
  const i = css.indexOf(seletor, desde);
  if (i < 0) throw new Error(`Seletor não encontrado no globals.css: ${seletor}`);
  const a = css.indexOf("{", i);
  const b = css.indexOf("}", a);
  return css.slice(a + 1, b);
}
const hex = (canais) => "#" + canais.trim().split(/\s+/).map((n) => Number(n).toString(16).padStart(2, "0")).join("");

function conferePaleta(nome, corpo, tema) {
  for (const m of corpo.matchAll(/--([\w-]+):\s*(\d+ \d+ \d+);/g)) {
    const [, token, canais] = m;
    if (!cores.has(token)) {
      conferidos++;
      divergencias.push(`${nome}: --${token} existe no CRM e falta no tokens.json`);
      continue;
    }
    confere(`${nome} --${token}`, valorNoTema(cores.get(token), tema), hex(canais));
  }
}

const iMedia = css.indexOf("@media (prefers-color-scheme: dark)");
const iPrint = css.indexOf("@media print");
conferePaleta("claro (:root)", bloco(":root {"), "light");
conferePaleta('escuro ([data-tema="escuro"])', bloco(':root[data-tema="escuro"] {'), "dark");
conferePaleta("escuro automático (prefers-color-scheme)", bloco(":root:not([data-tema]) {", iMedia), "dark");
conferePaleta("impressão (sempre claro)", bloco(":root:not([data-tema]) {", iPrint), "light");

// Superfícies translúcidas: cor do tema + opacidade + desfoque.
const regra = (sel) => bloco(sel);
const vidro = regra(".cabecalho-vidro {");
confere(".cabecalho-vidro opacidade", todos.get("opacity-glass"), /rgb\(var\(--paper\) \/ ([\d.]+)\)/.exec(vidro)?.[1]);
confere(".cabecalho-vidro desfoque", todos.get("blur-glass"), /blur\(([\d.]+px)\)/.exec(vidro)?.[1]);
const aviso = regra(".aviso-conexao {");
confere(".aviso-conexao opacidade", todos.get("opacity-glass"), /rgb\(var\(--surface\) \/ ([\d.]+)\)/.exec(aviso)?.[1]);
confere(".aviso-conexao desfoque", todos.get("blur-glass"), /blur\(([\d.]+px)\)/.exec(aviso)?.[1]);
const rgba = (v) => v.replace(/\s/g, "");
for (const tema of ["light", "dark"]) {
  const pap = valorNoTema(cores.get("paper"), tema), sur = valorNoTema(cores.get("surface"), tema);
  const canal = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
  confere(`cabecalho-vidro (${tema}) = paper a 85%`, rgba(valorNoTema(cores.get("cabecalho-vidro"), tema)), `rgba(${canal(pap)},${todos.get("opacity-glass")})`);
  confere(`aviso-vidro (${tema}) = surface a 85%`, rgba(valorNoTema(cores.get("aviso-vidro"), tema)), `rgba(${canal(sur)},${todos.get("opacity-glass")})`);
}
const hover = regra(".item-menu:hover {");
const mh = /rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/.exec(hover);
confere(".item-menu:hover", rgba(valorNoTema(cores.get("nav-hover"), "light")), mh && `rgba(${mh[1]},${mh[2]},${mh[3]},${mh[4]})`);

// Medidas da casca.
confere("--largura-barra (aberta)", todos.get("sidebar-width"), /--largura-barra:\s*([\d.]+px)/.exec(bloco(":root {", css.indexOf("--largura-barra") - 40))?.[1]);
confere("--largura-barra (recolhida)", todos.get("sidebar-width-collapsed"), /--largura-barra:\s*([\d.]+px)/.exec(bloco(':root[data-barra="recolhida"] {'))?.[1]);
confere(".btn min-height no celular", todos.get("touch-target"), /\.btn \{\s*min-height:\s*([\d.]+px)/.exec(css)?.[1]);
confere(".btn padding", "9px 16px", /\.btn \{[^}]*padding:\s*([^;]+);/.exec(css)?.[1]);
confere(".item-lateral min-height", todos.get("nav-item-min"), /\.item-lateral \{[^}]*min-h-\[([\d.]+px)\]/.exec(css)?.[1]);
confere(".item-menu barra do atual", todos.get("bar-nav"), /\.item-menu \{[^}]*border-left:\s*([\d.]+px)/.exec(css)?.[1]);

console.log(`Conferidos ${conferidos} valores de marca/tokens/tokens.json contra crm/src/app/globals.css.`);
if (divergencias.length) {
  console.log(`${divergencias.length} divergência(s):`);
  for (const d of divergencias) console.log(`  ✕ ${d}`);
  process.exit(1);
}
console.log("✓ 0 divergências.");
