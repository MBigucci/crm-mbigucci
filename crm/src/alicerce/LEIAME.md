# Alicerce MBigucci, como o Vendas usa

**Não edite nada nesta pasta nem em `crm/public/alicerce/`.** Os arquivos vêm do artifact do Alicerce sem nenhuma mudança. Ajuste local vai em `crm/src/app/alicerce-local.css`, com o porquê. Se faltar algo no Alicerce, a master pede à sessão do Alicerce (desde 08/11/2026), que publica no artifact; depois a master copia para cá.

**Origem:**
- artifact: `https://claude.ai/artifact/52QJiDD4fLNu14iE3hce37`;
- versão: `1794140630-3f87` (08/11/2026: as lacunas do Marketing, com o ícone `direcionador` no bundle.js; a peça NavegacaoDaArea, Etapas compacta no celular, `.mb-etapas-bloco`, a grade do FormularioDenso com uma coluna abaixo de 640px e as entradas densas com 44px e 16px no celular; os outros 7 arquivos são os mesmos da `1794084743-8903`);
- trazida em 06/11/2026 (item 48, passo a) e atualizada em 07/11/2026 (passo b: menu fixo, ícones novos e o logo MBigucci; depois, a camada do menu e o toque de 44px da faixa do celular, que eram ajustes locais; por fim, o aviso de conexão logo abaixo do topo, no passo d, e a largura dele no celular; no passo e, a linha que abre painel, a linha "Você", a largura dos filtros e a contagem com o ordenar; no passo f, o botão como alvo do item, o rótulo longo da faixa e o Envio desativado).

**Guia de uso em `guia/`** (trazido em 07/11/2026 da versão `1794088464-2fe1`, que tem os mesmos `bundle.css`, `bundle.js` e `tokens.json` da tabela abaixo):
- `guia/README.md` é o livro da marca: voz, sinais, cores, quando usar cada peça;
- `guia/componentes/<Peca>.md` traz um guia por componente (Selo, Chip, Meta, Prazo…);
- `guia/assets/` traz os logos.

Leia o guia da peça antes de usá-la. Ao atualizar o Alicerce, copie o guia de novo junto (`project/README.md`, `project/components/*/README.md` e `project/assets/*/README.md`).

**O `tokens.css` é gerado.** Para refazer, rode em `crm/`:

```bash
node src/alicerce/ferramentas/tokens-css.mjs --fontes=./fonts/ > src/alicerce/tokens.css
```

**Para atualizar o Alicerce:**
1. Baixe a versão nova pela ação `read` do Artifact.
2. Copie os arquivos com `cp`.
3. Gere o `tokens.css`.
4. Troque a versão e os hashes abaixo.

O `npm test` confere os hashes e o `tokens.css` (`scripts/alicerce.test.mjs`).

| Arquivo (a partir de `crm/`) | Origem no artifact | sha256 |
| --- | --- | --- |
| `src/alicerce/tokens.json` | `project/tokens.json` | `061a7fd27b21294bd0180ee1ac02a129263fcecc90f1ee3fd0db65071dcf74d1` |
| `src/alicerce/bundle.css` | `project/components/bundle.css` | `db9a95271d5dda9a21e363b59de5dba2f70eea6e50bcfa10b659247bf3e8f339` |
| `src/alicerce/ferramentas/tokens-css.mjs` | `project/ferramentas/tokens-css.mjs` | `ac4887432f8f9834fb3633749fb0f4361a26490ab8403d15adcbe64d3486ef04` |
| `src/alicerce/fonts/BricolageGrotesque-Variable.woff2` | `project/fonts/BricolageGrotesque-Variable.woff2` | `94d70a9a9bcd7134d4a291486c60e66ddb302f1f2ddf5268277ba11663b6c1b9` |
| `src/alicerce/fonts/GeistMono-Variable.woff2` | `project/fonts/GeistMono-Variable.woff2` | `684ad5b531f81d43c1e8c7038262d5db7cdc1f68006e04d6c7769efa8d33c8cc` |
| `src/alicerce/fonts/Inter-Variable.woff2` | `project/fonts/Inter-Variable.woff2` | `f052ee44c3728dfd23aba8a4567150bc314d23903026fbb6ad089422c2df56af` |
| `public/alicerce/bundle.js` | `project/components/bundle.js` | `325c676fdb472d3b47ad86f6d52da48793ca6f4b08d9d36ed5ec7f54b7b8f964` |
| `public/alicerce/mbigucci-logotipo.png` | `project/assets/Logos/mbigucci-logotipo.png` | `f259add0cb04f903866aa3c3b46feec9b3564002d6526bc8bf0b59c311e949ba` |

**Conferido no `bundle.js` desta versão:**
- a única chamada de rede é a do `MB.versao.vigiar`, que o Vendas não liga;
- o único endereço montado é o link do WhatsApp (`wa.me`);
- o `bundle.css` não importa nada de fora.
