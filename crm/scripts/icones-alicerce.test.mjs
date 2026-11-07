// Os ícones e o lockup em components/alicerce/icones.gerado.ts saem do bundle.js do Alicerce.
// Rode com: node --test scripts/icones-alicerce.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gerar } from "./gerar-icones-alicerce.mjs";

const lerGerado = () => readFileSync(new URL("../src/components/alicerce/icones.gerado.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("icones.gerado.ts é o que o gerador faz com o bundle.js", () => {
  assert.equal(lerGerado(), gerar(), "Gere de novo: node scripts/gerar-icones-alicerce.mjs");
});

test("o gerado tem os ícones usados pela moldura e o lockup", () => {
  const texto = lerGerado();
  for (const nome of ["lista-do-dia", "leads", "quadro", "agenda", "painel", "metas", "ranking", "modulos", "recolher", "externo", "ajustes", "sair", "novo", "fechar", "fila", "recepcao", "parceiros", "pontos", "plantao", "vendas", "usuarios", "equipes"]) {
    assert.ok(texto.includes(`  "${nome}": `), `faltou o ícone ${nome}`);
  }
  assert.match(texto, /export const LOCKUP = \{/);
  assert.match(texto, /nome: "M0\.88 0L/);
});
