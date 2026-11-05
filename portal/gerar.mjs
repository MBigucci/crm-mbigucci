// Tela de escolha do módulo do Base360 (mbigucci.com.br/base360/).
// Uso: node portal/gerar.mjs  → grava portal/index.html (o arquivo que vai por FTP para /base360/).
// Monta a página a partir de portal/fonte.html com:
// - o CSS dos tokens (marca/tokens/dist/mbigucci.css, gerado antes por marca/tokens/gerar.mjs);
// - o lockup Base360 de docs/marca-base360/, com as cores trocadas por tokens (claro e escuro pelo sistema);
// - o favicon da marca embutido, para a página abrir sem servidor.
// Não edite o index.html à mão: mude a fonte ou as constantes abaixo e gere de novo.

/** Endereço do módulo Repasse (o sistema da Roberta). Vazio = cartão "Repasse · em breve", sem link. */
const ENDERECO_REPASSE = "";
/** Endereço do módulo de Vendas no site (o BASE_PATH do build do crm/). */
const ENDERECO_VENDAS = "/base360/vendas/";

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
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
        <a class="btn btn-ghost" href="${esc(ENDERECO_REPASSE)}">Abrir Repasse</a>
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
console.log("portal/index.html gerado");
