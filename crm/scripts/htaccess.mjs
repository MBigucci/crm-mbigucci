// Depois do `next build`, grava out/.htaccess para o Apache da Hostinger mostrar a página
// "não encontrada" do próprio Vendas (out/404.html) em vez da página padrão do servidor.
// O ErrorDocument precisa do caminho absoluto no site, por isso usa o mesmo BASE_PATH do build.
// Roda sozinho pelo "postbuild" do package.json.
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Conteúdo do .htaccess para a pasta do módulo em `base` (ex.: "/vendas"). */
export function htaccess(base) {
  const pasta = (base ?? "").replace(/\/+$/, "");
  if (pasta && !/^\/[A-Za-z0-9_\-/]+$/.test(pasta)) throw new Error(`BASE_PATH inválido: ${base}`);
  return [
    "# Gerado por crm/scripts/htaccess.mjs depois do build. Não edite à mão.",
    "# Endereço que não existe mostra a página \"não encontrada\" do Vendas.",
    `ErrorDocument 404 ${pasta}/404.html`,
    "",
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = new URL("../out/", import.meta.url);
  if (!existsSync(new URL("404.html", out))) throw new Error("out/404.html não existe: rode o build antes.");
  writeFileSync(new URL(".htaccess", out), htaccess(process.env.BASE_PATH ?? "/vendas"));
  console.log("out/.htaccess gravado");
}
