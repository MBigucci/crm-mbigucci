// Tela de escolha do módulo do Base360 (https://base360.mbigucci.com.br/, site próprio, só links).
// Uso: node portal/gerar.mjs  → grava portal/index.html, portal/.htaccess e portal/repasse/index.html
// (vão por FTP para a raiz do site base360.mbigucci.com.br; o Vendas fica na pasta /vendas do mesmo site).
// Monta a página a partir de portal/fonte.html com:
// - tokens.css, bundle.css e fontes do Alicerce (somente leitura);
// - lockup oficial MB.marca.html, ícones e preferências do Alicerce;
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

import { runInNewContext } from "node:vm";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
const fs_mkdir = (p) => mkdirSync(p, { recursive: true });
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
const ler = (...p) => readFileSync(join(raiz, ...p), "utf8");

// Alicerce é somente leitura. Marca oficial pré-renderizada, sem depender de JS no corpo.
const tokens = ler("crm/src/alicerce/tokens.css");
const componentes = ler("crm/src/alicerce/bundle.css");
const utilitarios = ler("crm/public/alicerce/bundle.js");
const contexto = { window: {} };
runInNewContext(utilitarios, contexto);
const lockup = contexto.window.MB.marca.html("");
cpSync(join(raiz, "crm/src/alicerce/fonts"), join(aqui, "fonts"), { recursive: true });
cpSync(join(raiz, "crm/public/icons"), join(aqui, "icons"), { recursive: true });
cpSync(join(raiz, "crm/public/alicerce/mbigucci-logotipo.png"), join(aqui, "mbigucci-logotipo.png"));

const favicon = "data:image/svg+xml," + encodeURIComponent(ler("docs/marca-base360/favicon.svg").trim());

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const repasse = `<section class="mb-cartao portal-modulo" aria-labelledby="repasse">
  <div class="mb-cartao__corpo">
    <h2 class="titulo-secao portal-titulo" id="repasse">${contexto.window.MB.icone("banco")}Repasse</h2>
    <p class="corpo portal-descricao">Controle do repasse dos clientes.</p>
  </div>
  <div class="mb-cartao__rodape">
    ${ENDERECO_REPASSE ? `<a class="mb-botao mb-botao--secundario mb-botao--bloco-celular" href="${CAMINHO_REPASSE}">Abrir Repasse</a>` : '<span class="legenda">Em breve</span>'}
  </div>
</section>`;

const pagina = ler("portal/fonte.html")
  .replace("<!--{{AVISO}}-->", "<!-- Gerado por portal/gerar.mjs a partir de portal/fonte.html. Não edite à mão. -->")
  .replace("/*{{TOKENS}}*/", () => tokens.trim())
  .replace("/*{{COMPONENTES}}*/", () => componentes.trim())
  .replace("/*{{UTILITARIOS}}*/", () => utilitarios.trim())
  .replace("/*{{APP}}*/", () => ler("portal/app.fonte.js").trim())
  .replace("{{FAVICON}}", esc(favicon))
  .replace("{{LOCKUP}}", lockup)
  .replace("{{ICONE_VENDAS}}", () => contexto.window.MB.icone("vendas"))
  .replace("{{REPASSE}}", repasse)
  .replaceAll("{{VENDAS}}", ENDERECO_VENDAS);
if (/\{\{[A-Z]+\}\}/.test(pagina)) throw new Error("Sobrou um marcador sem preencher na fonte.");
writeFileSync(join(aqui, "index.html"), pagina);
// Mesmo conteúdo na raiz publicada e nas cópias de desenvolvimento do Vendas.
for (const [fonte, destino] of [["sw.fonte.js", "sw.js"], ["manifest.fonte.webmanifest", "manifest.webmanifest"]]) {
  const conteudo = ler("portal", fonte);
  writeFileSync(join(aqui, destino), conteudo);
  writeFileSync(join(raiz, "crm/public", destino), conteudo);
}

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
// A Hostinger servia o manifest como text/plain (08/11/2026); o tipo certo evita aviso do Chrome.
// O sw.js nunca vai do cache, para a versão nova do app chegar logo.
const tipos = `
# Tipo do manifest do app e o sw.js sempre novo.
AddType application/manifest+json .webmanifest
<IfModule mod_headers.c>
<Files "sw.js">
Header set Cache-Control "no-cache"
</Files>
</IfModule>
`;
writeFileSync(join(aqui, ".htaccess"), htaccess + tipos);
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
