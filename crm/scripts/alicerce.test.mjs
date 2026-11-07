// O Alicerce copiado do artifact continua intacto, e o tokens.css bate com o tokens.json.
// Os hashes ficam na tabela de src/alicerce/LEIAME.md. Rode com: node --test scripts/alicerce.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raiz = new URL("../", import.meta.url);
const ler = (caminho) => readFileSync(new URL(caminho, raiz));

const leiame = ler("src/alicerce/LEIAME.md").toString();
const linhas = [...leiame.matchAll(/^\| `([^`]+)` \| `[^`]+` \| `([0-9a-f]{64})` \|$/gm)];

test("a tabela de hashes do LEIAME.md tem os 8 arquivos do Alicerce", () => {
  assert.equal(linhas.length, 8);
});

for (const [, caminho, esperado] of linhas) {
  test(`${caminho} é o mesmo do artifact`, () => {
    const atual = createHash("sha256").update(ler(caminho)).digest("hex");
    assert.equal(atual, esperado, `${caminho} mudou. Não edite os arquivos do Alicerce: copie de novo do artifact e atualize o LEIAME.md.`);
  });
}

test("tokens.css é o que o tokens.json gera", () => {
  const gerador = fileURLToPath(new URL("src/alicerce/ferramentas/tokens-css.mjs", raiz));
  const gerado = execFileSync(process.execPath, [gerador, "--fontes=./fonts/"]).toString();
  assert.equal(ler("src/alicerce/tokens.css").toString(), gerado, "Gere de novo: node src/alicerce/ferramentas/tokens-css.mjs --fontes=./fonts/ > src/alicerce/tokens.css");
});
