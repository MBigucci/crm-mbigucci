// Gera o index.ts da Edge Function entrada-leads: um arquivo só, sem
// dependências, para colar no editor do Supabase (como a avisos).
//
// Junta, nesta ordem, as cópias de marketing/src/lib (WhatsApp, lista fixa de
// empreendimentos, Cadastro Mágico, catálogo, leitor de e-mail e a regra pura
// do direcionador) e o entrada.ts desta pasta. Cada arquivo vira um
// "namespace" próprio, para os nomes internos repetidos (semAcento, por
// exemplo) não se chocarem, e os imports entre eles viram referências ao
// namespace. O conteúdo de cada arquivo entra sem mudança.
//
// Rode da pasta crm/:  node supabase/functions/entrada-leads/gerar.mjs
// O teste (entrada.test.ts) falha se o index.ts estiver desatualizado.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const aqui = new URL("./", import.meta.url);
const lib = new URL("../../../../marketing/src/lib/", import.meta.url);

/** Na ordem das dependências: cada um só usa os de cima. */
export const MODULOS = [
  ["whatsapp", lib],
  ["empreendimentos", lib],
  ["cadastro-magico", lib],
  ["catalogo", lib],
  ["leitor-email", lib],
  ["direcionador", lib],
  ["entrada", aqui],
];

const nomeDoModulo = (base) => `M_${base.replace(/-/g, "_")}`;

/** Troca os imports entre os módulos por referências ao namespace. */
function trocarImports(codigo, arquivo) {
  return codigo.replace(/^import\s+(type\s+)?\{([^}]*)\}\s+from\s+"([^"]+)";?[ \t]*$/gm, (_, soTipo, nomes, de) => {
    const base = de.split("/").pop().replace(/\.ts$/, "");
    if (!MODULOS.some(([m]) => m === base)) throw new Error(`${arquivo}: import de fora do pacote (${de})`);
    const ns = nomeDoModulo(base);
    const valores = [];
    const tipos = [];
    for (const bruto of nomes.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (soTipo || bruto.startsWith("type ")) tipos.push(bruto.replace(/^type\s+/, ""));
      else valores.push(bruto);
    }
    const linhas = [];
    if (valores.length) linhas.push(`const { ${valores.join(", ")} } = ${ns};`);
    for (const t of tipos) linhas.push(`type ${t} = ${ns}.${t};`);
    return linhas.join("\n");
  });
}

export function gerar() {
  const partes = MODULOS.map(([base, pasta]) => {
    const caminho = new URL(`${base}.ts`, pasta);
    const codigo = readFileSync(caminho, "utf8").replace(/\r/g, "");
    if (/^\s*import\s/m.test(trocarImports(codigo, base))) throw new Error(`${base}: sobrou um import`);
    const origem = pasta === lib ? `marketing/src/lib/${base}.ts` : `crm/supabase/functions/entrada-leads/${base}.ts`;
    return `// ${"=".repeat(68)}\n// ${origem}\n// ${"=".repeat(68)}\nnamespace ${nomeDoModulo(base)} {\n${trocarImports(codigo, base).trimEnd()}\n}\n`;
  });
  return (
    `// ARQUIVO GERADO por gerar.mjs. Não edite: edite entrada.ts ou marketing/src/lib\n` +
    `// e rode \`node supabase/functions/entrada-leads/gerar.mjs\` (da pasta crm/).\n` +
    `// Edge Function "entrada-leads". Veja o cabeçalho de entrada.ts, abaixo.\n` +
    `/* eslint-disable */\n\n` +
    partes.join("\n") +
    `\n// Módulo ES (o Deno trata assim; o TypeScript também, com isolatedModules).\nexport {};\n`
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(new URL("index.ts", aqui), gerar());
  console.log("index.ts gerado.");
}
