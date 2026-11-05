// Gera os CSS do pacote a partir de marca/tokens/tokens.json. Sem dependências.
// Uso: node marca/tokens/gerar.mjs   → marca/tokens/dist/mbigucci.css e base360-shadcn.css (fora do Git)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(aqui, "tokens.json"), "utf8"));
const saida = join(aqui, "dist");
mkdirSync(saida, { recursive: true });

const cores = tokens.color.tokens;
const porNome = new Map(cores.map((t) => [t.name, t]));
const valor = (nome, tema) => {
  const t = porNome.get(nome);
  if (!t) throw new Error(`Token inexistente: ${nome}`);
  let v = typeof t.value === "string" ? t.value : t.value[tema] ?? t.value.light;
  const alias = /^\{(.+)\}$/.exec(v);
  return alias ? valor(alias[1], tema) : v;
};
const ehHex = (v) => /^#[0-9a-f]{6}$/i.test(v);
const canais = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");
const cabecalho = (titulo) =>
  `/* ${titulo}\n   Gerado por marca/tokens/gerar.mjs a partir de marca/tokens/tokens.json. Não edite à mão. */\n`;

// 1. mbigucci.css: as variáveis do jeito que o CRM usa (canais RGB, para rgb(var(--x) / alfa)).
function paleta(tema) {
  return cores
    .map((t) => {
      const v = valor(t.name, tema);
      return ehHex(v) ? `  --${t.name}: ${canais(v)};` : `  --${t.name}: ${v}; /* cor completa, sem canais */`;
    })
    .join("\n");
}
const medidas = Object.entries(tokens)
  .filter(([familia, v]) => familia !== "color" && familia !== "type" && v && Array.isArray(v.tokens))
  .flatMap(([, v]) => v.tokens.map((t) => `  --${t.name}: ${t.value};`))
  .join("\n");
const familias = Object.entries(tokens.type.families).map(([k, v]) => `  --font-${k}: ${v};`).join("\n");

writeFileSync(
  join(saida, "mbigucci.css"),
  cabecalho("MBigucci Design System: tokens do CRM (claro, escuro e automático).") +
    `:root {\n  color-scheme: light;\n${paleta("light")}\n}\n\n` +
    `:root[data-tema="escuro"] {\n  color-scheme: dark;\n${paleta("dark")}\n}\n\n` +
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-tema]) {\n    color-scheme: dark;\n${paleta("dark").replace(/^/gm, "  ")}\n  }\n}\n\n` +
    `:root {\n${medidas}\n${familias}\n}\n`,
);

// 2. base360-shadcn.css: as variáveis shadcn do Base360, nos dois temas, a partir dos tokens MBigucci.
// Pendente com a Roberta (fica fora do arquivo, valendo o do Base360): --radius e --info.
// A confirmar com a Roberta (vai no arquivo, marcado): --accent neutro e o --primary do escuro (hoje azul).
export const SHADCN = {
  background: "paper",
  foreground: "ink",
  card: "surface",
  "card-foreground": "ink",
  popover: "surface",
  "popover-foreground": "ink",
  primary: "brand",
  "primary-foreground": "on-brand",
  secondary: "secondary",
  "secondary-foreground": "ink",
  muted: "surface-disabled",
  "muted-foreground": "ink-soft",
  accent: "secondary",
  "accent-foreground": "ink",
  destructive: "no",
  "destructive-foreground": "on-brand",
  success: "ok",
  warning: "wa",
  border: "line",
  input: "control",
  ring: "brand",
  sidebar: "nav",
  "sidebar-foreground": "on-dark-soft",
  "sidebar-primary": "nav-marca",
  "sidebar-primary-foreground": "nav",
  "sidebar-accent": "nav-ativo",
  "sidebar-accent-foreground": "on-dark",
  "sidebar-border": "nav-linha",
  "sidebar-ring": "nav-marca",
};
const CONFIRMAR = new Set(["accent", "accent-foreground"]);
function shadcn(tema) {
  return Object.entries(SHADCN)
    .map(([var_, token]) => {
      const nota = CONFIRMAR.has(var_) || (tema === "dark" && var_ === "primary") ? " /* a confirmar com a Roberta */" : "";
      return `  --${var_}: ${valor(token, tema)};${nota} /* ${token} */`;
    })
    .join("\n");
}
writeFileSync(
  join(saida, "base360-shadcn.css"),
  cabecalho(
    "Base360 (shadcn/ui): variáveis no tema MBigucci.\n   Substitui os blocos :root e .dark de src/styles.css, menos --radius e --info, que continuam os do Base360 até combinar com a Roberta.",
  ) + `:root {\n${shadcn("light")}\n}\n\n.dark {\n${shadcn("dark")}\n}\n`,
);

console.log(`✓ ${join("marca", "tokens", "dist", "mbigucci.css")}: ${cores.length} cores nos dois temas.`);
console.log(`✓ ${join("marca", "tokens", "dist", "base360-shadcn.css")}: ${Object.keys(SHADCN).length} variáveis shadcn nos dois temas.`);
