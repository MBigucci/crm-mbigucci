/**
 * Gera os ícones do PWA em public/icons/ a partir do vermelho brand com "MB" em branco.
 * Rode com `node scripts/gerar-icones.mjs` (usa o sharp que vem com o Next).
 * Os PNG gerados ficam no git; só rode de novo se o desenho mudar.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const BRAND = "#e11119";
const dir = new URL("../public/icons/", import.meta.url);

/** `margem` é a fração do lado reservada em volta das letras (o maskable precisa de mais). */
function svg(lado, margem, raio = 0) {
  const tamanho = Math.round(lado * (1 - 2 * margem) * 0.52);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <rect width="${lado}" height="${lado}" rx="${raio}" fill="${BRAND}"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${tamanho}"
    letter-spacing="${-tamanho * 0.04}">MB</text>
</svg>`;
}

await mkdir(dir, { recursive: true });
const png = (s) => sharp(Buffer.from(s)).png().toBuffer();
await writeFile(new URL("icon-192.png", dir), await png(svg(192, 0.08)));
await writeFile(new URL("icon-512.png", dir), await png(svg(512, 0.08)));
await writeFile(new URL("maskable-512.png", dir), await png(svg(512, 0.2)));
await writeFile(new URL("apple-touch-icon.png", dir), await png(svg(180, 0.08)));
await writeFile(new URL("favicon-32.png", dir), await png(svg(32, 0.02, 3)));
await writeFile(new URL("icon.svg", dir), svg(64, 0.04, 6));
console.log("Ícones gerados em public/icons/");
