#!/usr/bin/env node
/* Junta src/ no cadastro de parceiro da página mbigucci.com.br/corretores/ (etapa 4
   de Parcerias, decisão do Felipe de 05/11/2026). Sem dependências nem bundler,
   no padrão do Simulador PV. Rode: node wordpress/corretores/build.mjs (em crm/).

   Gera em dist/ (não edite à mão; o teste confere que está em dia com src/):
     corretores-cadastro.html  página avulsa, para conferir no navegador;
     corretores-bloco.html     só o bloco (estilo, seção e script), para conferir;
     page-corretor-parceiro.php o modelo do tema "Área do corretor parceiro", feito de
                               src/wp/pagina.php: a cópia do modelo "Página
                               informativa" do desenvolvedor do site, com o marcador
                               <!-- mbp:cadastro --> logo depois do topo e sem o
                               formulário antigo (mb_lead_form). As outras páginas
                               continuam no "Página informativa".

   A URL do Supabase e a chave pública (anon ou publishable) vêm do crm/.env.local
   (NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY), a mesma fonte do
   build do CRM. Sem eles, o build para com erro. A chave de serviço é recusada.
   O dist/ fica fora do Git (decisão da master de 05/11/2026): quem gera o .php
   para colar é a máquina que tem o .env.local. */
import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const raiz = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(join(raiz, "src", p), "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
export const MARCADOR = "<!-- mbp:cadastro -->";

const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/* JSON seguro dentro de <script> e do .php: sem "<" (nem "</script", nem "<?"). */
const jsonSeguro = (v) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

/** A lista fechada de regiões (a mesma do seed de parceiro_regioes; o teste confere). */
export function lerRegioes() {
  const lista = JSON.parse(src("regioes.json"));
  if (!Array.isArray(lista) || !lista.length) throw new Error("src/regioes.json tem de ser uma lista");
  for (const r of lista) {
    if (!/^[a-z0-9_]{2,40}$/.test(r.codigo) || !r.nome || !r.cidade || !Number.isInteger(r.ordem))
      throw new Error(`src/regioes.json: região inválida ${JSON.stringify(r)}`);
  }
  return [...lista].sort((a, b) => a.ordem - b.ordem);
}

/**
 * Uma opção por cidade, sem bairros (Felipe, 05/11/2026: o cadastro estava longo).
 * A cidade com código próprio grava ele; a que só tem zonas no seed (São Paulo)
 * grava todas as zonas dela, o que no CRM quer dizer a cidade inteira.
 * Os bairros continuam no catálogo para o gerente marcar na ficha.
 */
export function cidadesDeRegioes(lista) {
  const porCidade = new Map();
  for (const r of lista) {
    if (!porCidade.has(r.cidade)) porCidade.set(r.cidade, []);
    porCidade.get(r.cidade).push(r);
  }
  return [...porCidade]
    .map(([cidade, itens]) => {
      const inteira = itens.find((r) => r.nome === cidade);
      return { nome: cidade, codigos: inteira ? [inteira.codigo] : itens.map((r) => r.codigo), ordem: Math.min(...itens.map((r) => r.ordem)) };
    })
    .sort((a, b) => a.ordem - b.ordem);
}

function htmlRegioes(lista) {
  return cidadesDeRegioes(lista)
    .map((c) => `              <label class="mbp-opcao"><input type="checkbox" name="regiao" value="${c.codigos.join(",")}"><span>${escHtml(c.nome)}</span></label>`)
    .join("\n");
}

/** Confere a configuração: URL https do projeto e só a chave pública. */
export function conferirConfig(c, { permitirLocal = false } = {}) {
  if (!c) throw new Error("faltam a URL e a chave pública do Supabase (crm/.env.local)");
  const url = String(c.supabaseUrl || "").trim().replace(/\/+$/, "");
  const chave = String(c.anonKey || "").trim();
  const local = permitirLocal && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url);
  if (!local && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw new Error("NEXT_PUBLIC_SUPABASE_URL tem de ser https://<projeto>.supabase.co");
  if (!chave) throw new Error("falta NEXT_PUBLIC_SUPABASE_ANON_KEY (a chave pública)");
  if (/^sb_secret_/.test(chave)) throw new Error("a chave é a secreta; use a publishable ou a anon");
  if (/^eyJ/.test(chave)) {
    let papel = "";
    try {
      papel = JSON.parse(Buffer.from(chave.split(".")[1], "base64url").toString("utf8")).role;
    } catch {
      throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não é um JWT legível");
    }
    if (papel !== "anon") throw new Error(`a chave é do papel "${papel}"; use a anon`);
  } else if (!/^sb_publishable_/.test(chave)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY tem de ser a anon (eyJ...) ou a publishable (sb_publishable_...)");
  }
  return { url, chave };
}

/** Lê NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY de um .env (o crm/.env.local, por padrão). */
export function lerConfig(arq = join(raiz, "..", "..", ".env.local")) {
  if (!existsSync(arq)) throw new Error(`não achei ${arq}: é dele que saem a URL e a chave pública do Supabase (as mesmas do build do CRM)`);
  const vars = {};
  for (const linha of readFileSync(arq, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  if (!vars.NEXT_PUBLIC_SUPABASE_URL || !vars.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    throw new Error(`${arq} não tem NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY preenchidas`);
  return { supabaseUrl: vars.NEXT_PUBLIC_SUPABASE_URL, anonKey: vars.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

/** Monta tudo em memória. config: { supabaseUrl, anonKey } ou null; paginaPhp: o template colado ou null. */
export function montar({ config = null, paginaPhp = null, permitirLocal = false } = {}) {
  const cfg = conferirConfig(config, { permitirLocal });
  const regioes = lerRegioes();
  const estilo = src("estilo.css");
  const regras = src("regras.js").trim();
  const app = src("app.js").trim();
  let bloco = src("bloco.html").trim();

  for (const [arq, texto] of [["estilo.css", estilo], ["regras.js", regras], ["app.js", app], ["bloco.html", bloco]]) {
    if (texto.includes("<?")) throw new Error(`src/${arq} tem "<?", que no .php do tema abre código PHP`);
  }
  if (/<\/style/i.test(estilo)) throw new Error('src/estilo.css tem "</style"');
  for (const [arq, texto] of [["regras.js", regras], ["app.js", app]]) {
    if (/<\/script|<!--/i.test(texto)) throw new Error(`src/${arq} tem "</script" ou "<!--"`);
  }
  if (!/^\/\*[\s\S]*?\*\/\s*var MBP_REGRAS = \(function \(\) \{[\s\S]*\}\)\(\);$/.test(regras))
    throw new Error('src/regras.js tem de ser um "var MBP_REGRAS = (function () { ... })();" só');
  if (!/^\/\*[\s\S]*?\*\/\s*\(function \(\) \{[\s\S]*\}\)\(\);$/.test(app)) throw new Error("src/app.js tem de ser uma função só: (function () { ... })();");
  const n = bloco.split("__REGIOES__").length - 1;
  if (n !== 1) throw new Error(`o marcador __REGIOES__ aparece ${n} vez(es) em src/bloco.html; tem de ser 1`);
  bloco = bloco.replace("__REGIOES__", () => htmlRegioes(regioes));
  if (!bloco.startsWith('<section id="mbParceiro"')) throw new Error('src/bloco.html tem de começar com <section id="mbParceiro"');

  // Tudo numa função só: nada vai para o window.
  const script =
    "(function () {\n" +
    `var MBP_CONFIG = ${jsonSeguro(cfg)};\n` +
    `var MBP_REGIOES = ${jsonSeguro(regioes.map(({ codigo, nome, cidade }) => ({ codigo, nome, cidade })))};\n` +
    `${regras}\n${app}\n})();\n`;
  new vm.Script(script, { filename: "cadastro-parceiro.js" });

  const pedaco = `<style>\n${estilo}</style>\n${bloco}\n<script>\n${script}</script>\n`;
  const avulsaFonte = src("avulsa.html");
  if (avulsaFonte.split("__BLOCO__").length !== 2) throw new Error("src/avulsa.html tem de ter __BLOCO__ uma vez");
  const avulsa = avulsaFonte.replace("__BLOCO__", () => pedaco.trimEnd());

  let php = null;
  if (paginaPhp != null) {
    const t = paginaPhp.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
    if (!t.startsWith("<?php")) throw new Error("src/wp/pagina.php tem de começar com <?php");
    if (!/get_header\s*\(/.test(t) || !/get_footer\s*\(/.test(t)) throw new Error("src/wp/pagina.php tem de manter get_header() e get_footer()");
    const m = t.split(MARCADOR).length - 1;
    if (m !== 1) throw new Error(`src/wp/pagina.php tem o marcador ${MARCADOR} ${m} vez(es); tem de ser 1, logo depois do hero`);
    if (/contact-form-7|wpcf7|mb_lead_form/i.test(t)) throw new Error("src/wp/pagina.php ainda tem o formulário antigo (mb_lead_form ou Contact Form 7); tire a seção");
    php = t.replace(MARCADOR, () => pedaco.trimEnd());
  }
  // Trava final: nada de chave que não seja a pública na saída.
  for (const saida of [avulsa, pedaco, php ?? ""]) {
    if (/sb_secret_|service_role/.test(saida)) throw new Error("a saída tem sb_secret_ ou service_role; o build não grava");
    for (const jwt of saida.match(/eyJ[\w-]+\.[\w-]+\.[\w-]*/g) ?? []) {
      let papel = "";
      try {
        papel = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8")).role;
      } catch {
        /* não é JWT */
      }
      if (papel && papel !== "anon") throw new Error(`a saída tem um JWT do papel "${papel}"; o build não grava`);
    }
  }
  return { avulsa, bloco: pedaco, php };
}

export function lerPaginaPhp() {
  const arq = join(raiz, "src", "wp", "pagina.php");
  return existsSync(arq) ? readFileSync(arq, "utf8") : null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const r = montar({ config: lerConfig(), paginaPhp: lerPaginaPhp() });
    const dist = join(raiz, "dist");
    mkdirSync(dist, { recursive: true });
    const arquivos = [["corretores-cadastro.html", r.avulsa], ["corretores-bloco.html", r.bloco]];
    if (r.php != null) arquivos.push(["page-corretor-parceiro.php", r.php]);
    // Grava ao lado e só então troca: os arquivos mudam juntos ou nenhum muda.
    arquivos.forEach(([nome, c]) => writeFileSync(join(dist, nome + ".tmp"), c));
    arquivos.forEach(([nome]) => renameSync(join(dist, nome + ".tmp"), join(dist, nome)));
    if (r.php == null) rmSync(join(dist, "page-corretor-parceiro.php"), { force: true });
    const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + " KB";
    arquivos.forEach(([nome, c]) => console.log(`dist/${nome}  ${kb(c)}`));
    if (r.php == null) console.log("sem src/wp/pagina.php: o .php do tema ainda não é gerado");
    console.log("Supabase: URL e chave pública do crm/.env.local (dist/ fica fora do Git)");
  } catch (e) {
    console.error("Erro: " + e.message);
    process.exit(1);
  }
}
