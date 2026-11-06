// Contraste AA das quatro direções (docs/mockups/visual-diretoria.tokens.json), nos dois temas.
// Mesma função de crm/scripts/contraste-temas.mjs (copiada: aquele arquivo lê o globals.css e roda asserções).
// Uso: node scripts/contraste-visual-diretoria.mjs [--json saida.json]
// Mede o valor renderizado e, onde há "original" (Repasse), o valor original, para mostrar o que falhava.
import { readFileSync, writeFileSync } from "node:fs";

const tokens = JSON.parse(readFileSync(new URL("../../docs/mockups/visual-diretoria.tokens.json", import.meta.url), "utf8"));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function contraste(a, b) {
  const lum = (x) => x.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
// [frente, fundo, mínimo, uso]
const FUNDOS = ["page", "card", "band"];
const pares = [];
for (const f of FUNDOS) {
  for (const t of ["ink", "ink-soft", "concrete", "ok", "warn", "action", "link"]) pares.push([t, f, 4.5, "texto"]);
  pares.push(["control", f, 3, "borda de controle"], ["action", f, 3, "foco e anel"]);
}
pares.push(["on-action", "action", 4.5, "botão principal"], ["on-action", "action-hover", 4.5, "botão principal (hover)"]);
pares.push(["on-band", "band", 4.5, "faixa de atenção"], ["on-band-soft", "band", 4.5, "faixa de atenção"]);
pares.push(["on-nav", "nav", 4.5, "lateral e Menu"], ["on-nav-soft", "nav", 4.5, "lateral e Menu"], ["on-nav-active", "nav-active", 4.5, "item atual"]);
pares.push(["secondary-edge", "secondary", 3, "contorno do secundário"], ["secondary-edge", "page", 3, "contorno do secundário"], ["ink", "secondary", 4.5, "botão secundário"]);
pares.push(["mark", "card", 3, "barra do card em destaque"], ["ink-soft", "dest-bg", 4.5, "card em destaque"], ["ink", "dest-bg", 4.5, "card em destaque"]);
pares.push(["nav-mark", "nav", 3, "foco e item atual na navegação"], ["nav-mark", "nav-active", 3, "foco e item atual na navegação"]);
pares.push(["ink", "nav-active", 4.5, "—"]);
// Só entram pares que existem na direção (o "ink / nav-active" acima é descartado).
const descartar = new Set(["ink/nav-active"]);

const linhas = [];
for (const [d, def] of Object.entries(tokens)) {
  const por = Object.fromEntries(def.color.tokens.map((k) => [k.name, k]));
  for (const tema of ["light", "dark"]) {
    for (const [f, b, min, uso] of pares) {
      if (descartar.has(f + "/" + b)) continue;
      if (!por[f] || !por[b]) continue;
      // Em A e M o item atual é preenchido (sem barra) e o foco dele usa on-nav-active, já medido sobre nav-active.
      if (f === "nav-mark" && b === "nav-active" && (def.layout.tokens.find((k) => k.name === "nav-bar-w")?.value ?? "0px") === "0px") continue;
      // Pares sem sentido para a direção: o vermelho como texto no C e no band-bar que é transparente não entram.
      const val = (k, original) => (original && por[k].original ? por[k].original[tema] : por[k].value[tema]);
      if (!/^#/.test(val(f)) || !/^#/.test(val(b))) continue;
      const r = contraste(rgb(val(f)), rgb(val(b)));
      const temOriginal = por[f].original || por[b].original;
      const ro = temOriginal ? contraste(rgb(val(f, 1)), rgb(val(b, 1))) : null;
      linhas.push({ dir: d, tema: tema === "light" ? "claro" : "escuro", frente: f, fundo: b, uso, min, valor: r, ok: r >= min, original: ro, originalOk: ro === null ? null : ro >= min, frenteHex: val(f), fundoHex: val(b), frenteOrig: temOriginal ? val(f, 1) : null, fundoOrig: temOriginal ? val(b, 1) : null });
    }
  }
}
const falhas = linhas.filter((l) => !l.ok);
const resumo = Object.keys(tokens).map((d) => {
  const ls = linhas.filter((l) => l.dir === d);
  return { dir: d, pares: ls.length, falhas: ls.filter((l) => !l.ok).length, menor: Math.min(...ls.map((l) => l.valor - l.min)) + 0 };
});
if (process.argv.includes("--json")) writeFileSync(process.argv[process.argv.indexOf("--json") + 1], JSON.stringify({ resumo, linhas }, null, 1));
console.log("| Direção | Pares medidos | Falhas (valor renderizado) |\n| --- | ---: | ---: |");
for (const r of resumo) console.log(`| ${r.dir} | ${r.pares} | ${r.falhas} |`);
if (falhas.length) {
  console.log("\nFALHAS no valor renderizado:");
  for (const l of falhas) console.log(`${l.dir} ${l.tema}: ${l.frente} ${l.frenteHex} / ${l.fundo} ${l.fundoHex} = ${l.valor.toFixed(2)}:1 < ${l.min}:1 (${l.uso})`);
}
const ajustes = linhas.filter((l) => l.original !== null && !l.originalOk);
console.log("\nPares do Repasse que falhavam no original (original → ajustado):");
for (const l of ajustes) console.log(`${l.dir} ${l.tema}: ${l.frente}/${l.fundo} ${l.frenteOrig}/${l.fundoOrig} = ${l.original.toFixed(2)}:1 → ${l.frenteHex}/${l.fundoHex} = ${l.valor.toFixed(2)}:1 (mín. ${l.min}:1, ${l.uso})`);
// Pares do Repasse sem ajuste que também falham no original com tokens "originais" (ex.: warn/ok em outros fundos) já aparecem acima.
if (falhas.length) process.exitCode = 1;
