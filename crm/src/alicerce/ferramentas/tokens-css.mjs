// Gera o tokens.css do Alicerce a partir do tokens.json (a fonte única dos tokens).
// Uso, na pasta do Alicerce copiada para o módulo:
//   node ferramentas/tokens-css.mjs > tokens.css
//   node ferramentas/tokens-css.mjs --fontes=/assets/alicerce/fonts/ > tokens.css   (caminho público das fontes)
// O resultado: os temas papel (padrão, também em :root) e grafite em [data-theme], as famílias sem tema
// (espaço, raio, tamanho, toque, quebra, movimento, camada), as classes de tipografia e o @font-face das três fontes.
import { readFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));
const argFontes = process.argv.find((a) => a.startsWith('--fontes='));
const pastaFontes = argFontes ? argFontes.slice('--fontes='.length) : 'fonts/';

const temas = tokens.color.themes.map((t) => t.id);
const primeiro = temas[0];
const valor = (token, tema) => {
  if (typeof token.value === 'string') return tema === primeiro ? token.value : null;
  return token.value[tema] ?? (tema === primeiro ? null : null);
};
const ref = (v) => (/^\{.+\}$/.test(v) ? `var(--${v.slice(1, -1)})` : v);

const saida = [];
temas.forEach((tema, i) => {
  const seletor = i === 0 ? `:root, [data-theme="${tema}"]` : `[data-theme="${tema}"]`;
  const linhas = [];
  for (const familia of ['color', 'shadow']) {
    for (const token of tokens[familia].tokens) {
      let v = valor(token, tema);
      if (i > 0 && v == null) {
        // Alias sem valor próprio no tema: repete, para resolver dentro do tema certo
        const base = valor(token, primeiro);
        if (!(base && base.startsWith('{'))) continue;
        v = base;
      }
      if (v == null) continue;
      linhas.push(`  --${token.name}: ${ref(v)};`);
    }
  }
  saida.push(`${seletor} {\n${linhas.join('\n')}\n}`);
});

const raiz = [];
for (const [nome, familia] of Object.entries(tokens)) {
  if (['color', 'shadow', 'type'].includes(nome) || !familia || typeof familia !== 'object' || !familia.tokens) continue;
  for (const token of familia.tokens) raiz.push(`  --${token.name}: ${token.value};`);
}
for (const [nome, pilha] of Object.entries(tokens.type.families)) raiz.push(`  --font-${nome}: ${pilha};`);
saida.push(`:root {\n${raiz.join('\n')}\n}`);

for (const grupo of tokens.type.groups) {
  const familia = grupo.family || 'sans';
  for (const s of grupo.styles) {
    let d = `font-family: var(--font-${s.family || familia}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};`;
    if (s.letterSpacing) d += ` letter-spacing: ${s.letterSpacing};`;
    if (s.textTransform) d += ` text-transform: ${s.textTransform};`;
    saida.push(`.${s.name} { ${d} }`);
  }
}
for (const f of tokens.type.fonts) {
  const arquivo = f.file.replace(/^fonts\//, '');
  saida.push(`@font-face { font-family: '${f.family}'; src: url('${pastaFontes}${arquivo}') format('woff2'); font-weight: ${f.weight}; font-style: ${f.style || 'normal'}; font-display: swap; }`);
}
process.stdout.write('/* Alicerce MBigucci — gerado de tokens.json por ferramentas/tokens-css.mjs. Não edite à mão. */\n' + saida.join('\n\n') + '\n');
