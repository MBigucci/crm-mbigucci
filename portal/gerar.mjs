// Tela de escolha do módulo do Base360 (https://base360.mbigucci.com.br/, site próprio, só links).
// Uso: node portal/gerar.mjs  → grava portal/index.html, portal/.htaccess e portal/repasse/index.html
// (vão por FTP para a raiz do site base360.mbigucci.com.br; o Vendas fica na pasta /vendas do mesmo site).
// Monta a página a partir de portal/fonte.html com:
// - o CSS dos tokens (marca/tokens/dist/mbigucci.css, gerado antes por marca/tokens/gerar.mjs);
// - o lockup Base360 de docs/marca-base360/, com as cores trocadas por tokens (claro e escuro pelo sistema);
// - o favicon da marca embutido, para a página abrir sem servidor.
// Não edite o index.html à mão: mude a fonte ou as constantes abaixo e gere de novo.

/** Endereço do módulo Repasse (o sistema da Roberta, app Node em subdomínio próprio). Vazio = cartão
 *  "Repasse · em breve", sem link. base360.mbigucci.com.br/repasse redireciona (302) para cá. O Repasse
 *  continua em repasse.mbigucci.com.br depois da migração para a Hostinger (Felipe, 05/11/2026); o 302
 *  fica temporário porque a ideia futura é unificar em /repasse (docs/estudo-unificacao-base360.md). */
const ENDERECO_REPASSE = "https://repasse.mbigucci.com.br/";
/** Endereço do módulo de Vendas: a pasta /vendas do mesmo site (o BASE_PATH do build do crm/). */
const ENDERECO_VENDAS = "/vendas/";
/** Caminho do Repasse dentro do site: só um redirecionamento para ENDERECO_REPASSE. */
const CAMINHO_REPASSE = "/repasse/";

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const fs_mkdir = (p) => mkdirSync(p, { recursive: true });
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
const ler = (...p) => readFileSync(join(raiz, ...p), "utf8");

execFileSync(process.execPath, [join(raiz, "marca/tokens/gerar.mjs")], { stdio: "inherit" });
const tokens = ler("marca/tokens/dist/mbigucci.css").replace(/\/\*[\s\S]*?\*\/\n?/, "");

// Cores fixas do arquivo claro → tokens: o mesmo SVG serve aos dois temas.
const lockup = ler("docs/marca-base360/lockup-base360-claro.svg")
  .replace(/ width="[\d.]+" height="[\d.]+"/, ' class="lockup"')
  .replace(/ fill="#e11119"/g, ' style="fill:rgb(var(--brand))"')
  .replace(/ fill="#0d0e11"/g, ' style="fill:rgb(var(--ink))"');
if (/fill="#/.test(lockup)) throw new Error("O lockup tem uma cor que não virou token.");

const favicon = "data:image/svg+xml," + encodeURIComponent(ler("docs/marca-base360/favicon.svg").trim());

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const repasse = ENDERECO_REPASSE
  ? `<section class="card" aria-labelledby="repasse">
        <h2 class="titulo-card" id="repasse">Repasse</h2>
        <p>Controle do repasse dos clientes.</p>
        <a class="btn btn-ghost" href="${CAMINHO_REPASSE}">Abrir Repasse</a>
      </section>`
  : `<section class="card bar-neutra" aria-labelledby="repasse">
        <h2 class="titulo-card" id="repasse">Repasse</h2>
        <p>Controle do repasse dos clientes.</p>
        <span class="selo">Em breve</span>
      </section>`;

const pagina = ler("portal/fonte.html")
  .replace("<!--{{AVISO}}-->", "<!-- Gerado por portal/gerar.mjs a partir de portal/fonte.html. Não edite à mão. -->")
  .replace("/*{{TOKENS}}*/", tokens.trim())
  .replace("{{FAVICON}}", esc(favicon))
  .replace("{{LOCKUP}}", lockup)
  .replace("{{REPASSE}}", repasse)
  .replaceAll("{{VENDAS}}", ENDERECO_VENDAS);
if (/\{\{[A-Z]+\}\}/.test(pagina)) throw new Error("Sobrou um marcador sem preencher na fonte.");
writeFileSync(join(aqui, "index.html"), pagina);

// /repasse → o Repasse no subdomínio dele. 302 (temporário), porque o endereço muda na migração.
// O .htaccess resolve no servidor; o repasse/index.html é a reserva se o servidor ignorar o .htaccess.
const htaccess = ENDERECO_REPASSE
  ? `# Gerado por portal/gerar.mjs. Não edite à mão.
# /repasse leva ao módulo Repasse (app próprio em outro subdomínio), mantendo o resto do caminho.
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule ^repasse/?(.*)$ ${ENDERECO_REPASSE}$1 [R=302,L]
</IfModule>
`
  : "# Gerado por portal/gerar.mjs. Sem endereço do Repasse ainda.\n";
writeFileSync(join(aqui, ".htaccess"), htaccess);
fs_mkdir(join(aqui, "repasse"));
const destino = ENDERECO_REPASSE || "/";
writeFileSync(join(aqui, "repasse", "index.html"), `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Base360 · Repasse</title>
<!-- Gerado por portal/gerar.mjs. Reserva caso o servidor ignore o .htaccess. -->
<script>location.replace(${JSON.stringify(destino)});</script>
<meta http-equiv="refresh" content="0; url=${esc(destino)}">
</head>
<body><p><a href="${esc(destino)}">Abrir o Base360 Repasse</a></p></body>
</html>
`);
console.log("portal/index.html, portal/.htaccess e portal/repasse/index.html gerados");
