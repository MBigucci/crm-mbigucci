// Confere uma resposta da IA (tabela de preços) antes de levar ao CRM, contra o
// catálogo de docs/empreendimentos-dados.json. Adaptado de
// ref/CRM Bruna/scripts/check-import.mjs.
// Uso (em crm/): node scripts/conferir-tabela.mjs caminho/da/resposta.json
import { readFileSync } from "node:fs";

process.removeAllListeners("warning"); // o Node avisa que está lendo TypeScript; aqui não interessa
const { lerImportacao, planejarImportacao, resumoDoItem, contarPlano } = await import("../src/lib/importar-tabela.ts");
const { CATALOGO } = await import("../src/lib/catalogo-teste.ts");

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Uso: node scripts/conferir-tabela.mjs <resposta.json>");
  process.exit(1);
}

const r = lerImportacao(readFileSync(arquivo, "utf8"));
if (!r.ok) {
  console.error(`ERRO:\n${r.erros.map((e) => `  ✕ ${e}`).join("\n")}`);
  process.exit(1);
}
const plano = planejarImportacao(r.dados, CATALOGO);
for (const i of plano) console.log(resumoDoItem(i));
const c = contarPlano(plano);
console.log(`\nOK: ${c.atualiza} para atualizar, ${c.novos} novo(s), ${c.iguais} sem mudança, ${c.erros} com erro (contra o JSON de docs/, não o banco).`);
if (r.avisos.length) console.log(`Avisos:\n${r.avisos.map((a) => `  ! ${a}`).join("\n")}`);
