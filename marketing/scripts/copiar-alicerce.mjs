// Copia para o marketing/ o que o app usa do Alicerce, que mora em crm/ (opção A, Felipe, 06/11/2026).
// Uma fonte de verdade: gerar() devolve { caminho → Buffer }; a linha de comando grava o mapa e o teste
// (src/lib/alicerce-copia.test.ts) compara o disco com ele.
// Uso, a partir de marketing/:  node scripts/copiar-alicerce.mjs
//
// O que entra:
//   - as peças em React de crm/src/components/alicerce/ (as de ENTRADA e tudo o que elas importam);
//   - tokens.css, bundle.css e as fontes, de crm/src/alicerce/;
//   - bundle.js e o logotipo, de crm/public/alicerce/;
//   - a ponte de aparência de crm/src/lib/aparencia.ts.
// Todo arquivo de texto ganha no topo o aviso de cópia. Import "@/…" fora do mapa REESCRITAS lança erro.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
export const MARKETING = resolve(AQUI, "..");
export const CRM = resolve(MARKETING, "..", "crm");

/** Peças que as telas do Marketing importam. O resto vem pelo fecho dos imports relativos. */
export const ENTRADA = [
  "menu-lateral", "barra-superior", "menu-celular", "menu-da-conta", "marca-base360", "estado-de-pagina",
  "toast", "interruptor", "lista", "cartao", "campo", "seletor", "data-hora", "painel-lateral", "aviso-conexao",
  "aviso", "estado-vazio", "carregando", "entrar-caixa", "campo-senha", "aparencia", "ajustes", "ajuste", "requisitos", "logo-mbigucci",
];

const PECAS = "src/components/alicerce";
const aviso = (origem) => `Cópia gerada de ${origem}, não edite aqui; rode node scripts/copiar-alicerce.mjs`;
const comentario = (caminho, origem) => {
  if (/\.(tsx?|js|mjs)$/.test(caminho)) return `// ${aviso(origem)}\n`;
  if (caminho.endsWith(".css")) return `/* ${aviso(origem)} */\n`;
  return "";
};

/** O único import "@/…" do fecho: data-hora usa paraCampos de lib/leads. O script extrai só esse trecho. */
const PARA_CAMPOS = "src/alicerce/para-campos.ts";
const REESCRITAS = { "@/lib/leads": "@/alicerce/para-campos" };

function paraCampos() {
  const fonte = readFileSync(join(CRM, "src/lib/leads.ts"), "utf8");
  const pega = (inicio) => {
    const i = fonte.indexOf(inicio);
    if (i < 0) throw new Error(`não achei "${inicio}" em crm/src/lib/leads.ts`);
    let ini = i;
    const c = fonte.lastIndexOf("/**", i);
    if (c >= 0 && /^\s*$/.test(fonte.slice(fonte.indexOf("*/", c) + 2, i))) ini = c;
    const fim = inicio.startsWith("export function") ? fonte.indexOf("\n}\n", i) + 3 : fonte.indexOf("\n", i) + 1;
    return fonte.slice(ini, fim);
  };
  return `${pega("const doisDigitos =")}\n${pega("export function paraCampos(")}`;
}

const lerTexto = (rel) => readFileSync(join(CRM, rel), "utf8");
const lerBytes = (rel) => readFileSync(join(CRM, rel));

/** Resolve "./x" ou "./x.ts" para o arquivo de crm/src/components/alicerce/. */
function achar(base, nome) {
  const limpo = nome.replace(/^\.\//, "");
  for (const cand of [limpo, `${limpo}.tsx`, `${limpo}.ts`]) {
    if (existsSync(join(CRM, PECAS, cand)) && /\.(tsx?)$/.test(cand)) return cand;
  }
  throw new Error(`${base}: não achei o import "${nome}" em crm/${PECAS}`);
}

/** Lê o arquivo e devolve { texto, filhos }: o texto com os "@/…" reescritos e os imports relativos. */
function analisar(arquivo) {
  let texto = lerTexto(`${PECAS}/${arquivo}`);
  const filhos = [];
  texto = texto.replace(/(from\s+)(["'])([^"']+)\2/g, (todo, de, aspas, alvo) => {
    if (alvo.startsWith("./")) {
      filhos.push(achar(arquivo, alvo));
      return todo;
    }
    if (alvo.startsWith("@/")) {
      if (!REESCRITAS[alvo]) throw new Error(`${arquivo}: import "${alvo}" sem regra em REESCRITAS: o script não sabe copiá-lo`);
      return `${de}${aspas}${REESCRITAS[alvo]}${aspas}`;
    }
    return todo; // pacote (react, next, clsx…)
  });
  return { texto, filhos };
}

/** { caminho relativo a marketing/ → Buffer } de tudo o que a cópia deve conter. */
export function gerar() {
  const saida = {};
  const poe = (caminhoMkt, origem, conteudo) => {
    saida[caminhoMkt] = Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(comentario(caminhoMkt, origem) + conteudo, "utf8");
  };

  // 1. As peças: ENTRADA e o fecho dos imports relativos.
  const fila = ENTRADA.map((n) => achar("ENTRADA", n));
  const vistos = new Set();
  while (fila.length) {
    const a = fila.shift();
    if (vistos.has(a)) continue;
    vistos.add(a);
    const { texto, filhos } = analisar(a);
    poe(`src/components/alicerce/${a}`, `crm/${PECAS}/${a}`, texto);
    fila.push(...filhos);
  }

  // 2. Peça gerada: só o paraCampos, sem levar o leads.ts inteiro.
  poe(PARA_CAMPOS, "crm/src/lib/leads.ts (só doisDigitos e paraCampos)", paraCampos());

  // 3. Estilo, fontes, script e logotipo.
  poe("src/alicerce/tokens.css", "crm/src/alicerce/tokens.css", lerTexto("src/alicerce/tokens.css"));
  poe("src/alicerce/bundle.css", "crm/src/alicerce/bundle.css", lerTexto("src/alicerce/bundle.css"));
  for (const f of ["BricolageGrotesque-Variable.woff2", "GeistMono-Variable.woff2", "Inter-Variable.woff2"]) {
    poe(`src/alicerce/fonts/${f}`, "", lerBytes(`src/alicerce/fonts/${f}`));
  }
  poe("public/alicerce/bundle.js", "crm/public/alicerce/bundle.js", lerTexto("public/alicerce/bundle.js"));
  poe("public/alicerce/mbigucci-logotipo.png", "", lerBytes("public/alicerce/mbigucci-logotipo.png"));

  // 4. A ponte de aparência: a mesma do Vendas, para o tema não divergir entre os módulos (mesma origem, mesmo localStorage).
  poe("src/alicerce/aparencia.ts", "crm/src/lib/aparencia.ts", lerTexto("src/lib/aparencia.ts"));

  return saida;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mapa = gerar();
  let n = 0;
  for (const [caminho, conteudo] of Object.entries(mapa)) {
    const destino = join(MARKETING, caminho);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, conteudo);
    n++;
  }
  console.log(`${n} arquivos copiados de crm/ para marketing/ (${relative(process.cwd(), MARKETING) || "."}).`);
}
