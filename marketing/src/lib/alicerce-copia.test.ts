// A cópia do Alicerce em marketing/ bate com a fonte em crm/? Falha quando um dos lados muda.
// Para corrigir: a partir de marketing/, rode `node scripts/copiar-alicerce.mjs` (a cópia nunca se edita à mão).
// Rode com: node --test src/lib/alicerce-copia.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const { gerar, MARKETING } = (await import(new URL("../../scripts/copiar-alicerce.mjs", import.meta.url).href)) as {
  gerar: () => Record<string, Buffer>;
  MARKETING: string;
};

const esperado = gerar();

test("a cópia tem todos os arquivos do Alicerce que o app usa", () => {
  for (const caminho of Object.keys(esperado)) assert.ok(existsSync(join(MARKETING, caminho)), `falta ${caminho}: rode node scripts/copiar-alicerce.mjs`);
});

test("cada arquivo copiado é igual ao que o script gera da fonte em crm/", () => {
  for (const [caminho, conteudo] of Object.entries(esperado)) {
    const atual = readFileSync(join(MARKETING, caminho));
    assert.ok(atual.equals(conteudo), `${caminho} difere da fonte: rode node scripts/copiar-alicerce.mjs (não edite a cópia)`);
  }
});

test("todo arquivo de texto copiado leva o aviso de cópia gerada no topo", () => {
  for (const [caminho, conteudo] of Object.entries(esperado)) {
    if (/\.(woff2|png)$/.test(caminho)) continue;
    assert.match(conteudo.toString("utf8").slice(0, 200), /Cópia gerada de .*não edite aqui; rode node scripts\/copiar-alicerce\.mjs/, caminho);
  }
});

test("nenhuma cópia importa de fora de marketing/ (@/ só dentro da cópia)", () => {
  for (const [caminho, conteudo] of Object.entries(esperado)) {
    if (!/\.tsx?$/.test(caminho)) continue;
    for (const m of conteudo.toString("utf8").matchAll(/from\s+["'](@\/[^"']+)["']/g)) {
      assert.match(m[1], /^@\/alicerce\//, `${caminho} importa ${m[1]}`);
    }
  }
});
