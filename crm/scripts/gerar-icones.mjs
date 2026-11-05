/**
 * Gera os ícones do app em public/icons/ a partir dos SVGs do logo Base360
 * (docs/marca-base360/icone.svg, icone-maskable.svg e favicon.svg; regras em
 * docs/marca-base360.md). Rode com `node scripts/gerar-icones.mjs`, em crm/
 * (usa o sharp que vem com o Next, sem instalar nada).
 * Os PNG gerados ficam no Git, como antes: o build só copia public/. Rode de
 * novo apenas se os SVGs da marca mudarem.
 */
import sharp from "sharp";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const marca = new URL("../../docs/marca-base360/", import.meta.url);
const dir = new URL("../public/icons/", import.meta.url);

const pecas = [
  ["icone.svg", "icon-192.png", 192],
  ["icone.svg", "icon-512.png", 512],
  ["icone-maskable.svg", "maskable-512.png", 512],
  ["icone.svg", "apple-touch-icon.png", 180],
  ["favicon.svg", "favicon-32.png", 32],
];

await mkdir(dir, { recursive: true });
for (const [origem, destino, lado] of pecas) {
  const svg = await readFile(new URL(origem, marca));
  // Densidade alta para o SVG não sair borrado ao virar 512 px (como em gerar-png.mjs).
  const png = await sharp(svg, { density: 72 * Math.max(1, lado / 32) }).resize(lado, lado).png().toBuffer();
  await writeFile(new URL(destino, dir), png);
}
// O favicon vetorial da aba é o próprio favicon.svg da marca (fundo com raio de 10%).
await copyFile(new URL("favicon.svg", marca), new URL("icon.svg", dir));
console.log("Ícones Base360 gerados em public/icons/");
