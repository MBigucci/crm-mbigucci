// As cópias de crm/src/lib que o Marketing usa batem com o original? O brief
// pede copiar sem alterar o crm/; este teste avisa quando o original mudou e a
// cópia ficou para trás. Para corrigir, copie de novo (não edite a cópia).
// Rode com: node --test marketing/src/lib/copias.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (caminho: string) => readFileSync(new URL(caminho, import.meta.url), "utf8").replace(/\r/g, "");
const crm = (f: string) => ler(`../../../crm/src/lib/${f}`);
const aqui = (f: string) => ler(`./${f}`);
/** Tira o cabeçalho "// Cópia de …" que só a cópia tem. */
const semCabecalho = (s: string) => s.replace(/^(\/\/ (Cópia de|Não edite aqui).*\n)+\n?/, "");

// Um bloco do arquivo: o comentário de documentação logo acima e a declaração inteira.
function bloco(src: string, inicio: string): string {
  const i = src.indexOf(inicio);
  assert.ok(i >= 0, `não achei "${inicio}"`);
  let ini = i;
  const c = src.lastIndexOf("/**", i);
  if (c >= 0 && src.slice(src.indexOf("*/", c) + 2, i) === "\n") ini = c;
  const fim = inicio.includes("function") ? src.indexOf("\n}\n", i) + 2 : src.indexOf("\n\n", i);
  return src.slice(ini, fim);
}

test("empreendimentos.ts é igual ao do crm/", () => {
  assert.equal(semCabecalho(aqui("empreendimentos.ts")), crm("empreendimentos.ts"));
});

test("cadastro-magico.ts é igual ao do crm/, menos de onde vem o normalizarWhatsapp", () => {
  const copia = semCabecalho(aqui("cadastro-magico.ts")).replace('from "./whatsapp.ts"', 'from "./leads.ts"');
  assert.equal(copia, crm("cadastro-magico.ts"));
});

test("whatsapp.ts: normalizarWhatsapp igual ao de leads.ts", () => {
  const f = "export function normalizarWhatsapp(";
  assert.equal(bloco(aqui("whatsapp.ts"), f), bloco(crm("leads.ts"), f));
});

test("catalogo.ts: as funções copiadas iguais às de catalogo.ts", () => {
  for (const f of ["const semAcento =", "export const normalizarNome =", "const porOrdem =", "export function acharNoCatalogo(",
                   "export function listaDoMagico(", "const BAIRROS_COMUNS =", "export function bairrosDoCatalogo("])
    assert.equal(bloco(aqui("catalogo.ts"), f), bloco(crm("catalogo.ts"), f), f);
});
