// Gera crm/src/components/alicerce/icones.gerado.ts a partir do bundle.js do Alicerce (item 48, passo b).
//   node scripts/gerar-icones-alicerce.mjs          escreve o arquivo
//   node scripts/gerar-icones-alicerce.mjs --stdout  só imprime
// Os desenhos de MB.icones e os contornos do lockup (MB.marca) saem do bundle.js, que roda numa caixa
// isolada (node:vm) com um window de mentira: nada de regex sobre o código-fonte do Alicerce.
// O arquivo gerado não se edita à mão; o npm test (scripts/icones-alicerce.test.mjs) acusa quando ele
// fica diferente do que este script gera. Para atualizar: troque o bundle.js pela versão nova do
// Alicerce (veja src/alicerce/LEIAME.md), rode este script e confira o diff.
import vm from "node:vm";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = new URL("../", import.meta.url);
const alvo = new URL("src/components/alicerce/icones.gerado.ts", raiz);

function carregarMB() {
  const doc = {
    documentElement: { getAttribute: () => null, setAttribute() {}, removeAttribute() {} },
    addEventListener() {},
    querySelectorAll: () => [],
  };
  const janela = {
    document: doc,
    addEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  };
  janela.window = janela;
  vm.runInNewContext(readFileSync(new URL("public/alicerce/bundle.js", raiz), "utf8"), janela);
  return janela.MB;
}

const pegar = (texto, regex, o_que) => {
  const m = regex.exec(texto);
  if (!m) throw new Error(`O lockup do Alicerce mudou: não achei ${o_que}. Revise o gerador.`);
  return m.slice(1);
};

/** O conteúdo do arquivo gerado, com fim de linha \n. */
export function gerar() {
  const MB = carregarMB();
  const icones = MB.icones;
  const lockup = MB.marca.html("");
  const simbolo = MB.marca.simbolo();

  const [viewBox] = pegar(lockup, /<svg class="mb-marca__lockup" viewBox="([^"]+)"/, "o viewBox do lockup");
  const [simboloTransform] = pegar(lockup, /<g transform="([^"]+)">/, "o transform do símbolo");
  const [giro] = pegar(lockup, /<path class="mb-marca__giro" d="([^"]+)"/, "o giro");
  const [paredes] = pegar(lockup, /<path class="mb-marca__paredes" fill-rule="evenodd" d="([^"]+)"/, "as paredes");
  const [nomeTransform, nome] = pegar(lockup, /<path class="mb-marca__nome" transform="([^"]+)" d="([^"]+)"/, "o nome Base360");
  const [simboloViewBox] = pegar(simbolo, /viewBox="([^"]+)"/, "o viewBox do símbolo");
  const [simboloSoTransform] = pegar(simbolo, /<g transform="([^"]+)">/, "o transform do símbolo sozinho");

  const linhasIcones = Object.keys(icones).map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(icones[n])},`);
  return [
    "// GERADO por scripts/gerar-icones-alicerce.mjs a partir de public/alicerce/bundle.js. Não edite à mão.",
    "// Para atualizar: node scripts/gerar-icones-alicerce.mjs (o npm test acusa quando este arquivo fica desatualizado).",
    "",
    "/** O desenho de cada ícone do Alicerce (MB.icones), na grade de 20. */",
    "export const ICONES = {",
    ...linhasIcones,
    "} as const;",
    "",
    "export type NomeIcone = keyof typeof ICONES;",
    "",
    "/** Contornos oficiais do lockup Base360 (MB.marca.html) e do símbolo sozinho (MB.marca.simbolo). */",
    "export const LOCKUP = {",
    `  viewBox: ${JSON.stringify(viewBox)},`,
    `  simboloTransform: ${JSON.stringify(simboloTransform)},`,
    `  giro: ${JSON.stringify(giro)},`,
    `  paredes: ${JSON.stringify(paredes)},`,
    `  nomeTransform: ${JSON.stringify(nomeTransform)},`,
    `  nome: ${JSON.stringify(nome)},`,
    `  simboloViewBox: ${JSON.stringify(simboloViewBox)},`,
    `  simboloSoTransform: ${JSON.stringify(simboloSoTransform)},`,
    "} as const;",
    "",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const conteudo = gerar();
  if (process.argv.includes("--stdout")) process.stdout.write(conteudo);
  else {
    writeFileSync(fileURLToPath(alvo), conteudo);
    console.log(`Gerado: src/components/alicerce/icones.gerado.ts (${conteudo.length} caracteres)`);
  }
}
