/**
 * Gera os PNGs do ícone Base360 a partir dos SVGs desta pasta.
 * Uso: node docs/marca-base360/gerar-png.mjs [pasta-de-saída]
 * Saída padrão: local/marca-base360/ (fora do Git; os PNGs não são versionados, só este script).
 * Usa o sharp que vem com o Next em crm/node_modules, sem instalar nada.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "../..");
const sharp = createRequire(join(raiz, "crm/package.json"))("sharp");
const saida = resolve(process.argv[2] ?? join(raiz, "local/marca-base360"));
mkdirSync(saida, { recursive: true });

const svg = (nome) => readFileSync(join(aqui, nome));
const pecas = [
  ["icone.svg", "icon-192.png", 192],
  ["icone.svg", "icon-512.png", 512],
  ["icone-maskable.svg", "maskable-512.png", 512],
  ["icone.svg", "apple-touch-icon.png", 180],
  ["favicon.svg", "favicon-32.png", 32],
  ["favicon.svg", "favicon-16.png", 16],
];
for (const [origem, destino, lado] of pecas) {
  // density alta para o SVG de 32px não sair borrado ao virar 512.
  const png = await sharp(svg(origem), { density: 72 * Math.max(1, lado / 32) }).resize(lado, lado).png().toBuffer();
  writeFileSync(join(saida, destino), png);
}
console.log(`PNGs gerados em ${saida}`);
