# Alicerce MBigucci, como o Vendas usa

**Não edite nada nesta pasta nem em `crm/public/alicerce/`.** Os arquivos vêm do artifact do Alicerce sem nenhuma mudança. Ajuste local vai em `crm/src/app/alicerce-local.css`, com o porquê. Se faltar algo no Alicerce, leve ao Felipe.

**Origem:**
- artifact: `https://claude.ai/artifact/52QJiDD4fLNu14iE3hce37`;
- versão: `1794084743-8903` (os 8 arquivos abaixo são os mesmos da `1794072878-3e8e`);
- trazida em 06/11/2026 (item 48, passo a) e atualizada em 07/11/2026 (passo b: menu fixo, ícones novos e o logo MBigucci; depois, a camada do menu e o toque de 44px da faixa do celular, que eram ajustes locais; por fim, o aviso de conexão logo abaixo do topo, no passo d, e a largura dele no celular; no passo e, a linha que abre painel, a linha "Você", a largura dos filtros e a contagem com o ordenar; no passo f, o botão como alvo do item, o rótulo longo da faixa e o Envio desativado).

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
| `src/alicerce/bundle.css` | `project/components/bundle.css` | `fbd183a2fcf160d09f0d457735fb83d174b0207ed980da53379f00761b2fe751` |
| `src/alicerce/ferramentas/tokens-css.mjs` | `project/ferramentas/tokens-css.mjs` | `ac4887432f8f9834fb3633749fb0f4361a26490ab8403d15adcbe64d3486ef04` |
| `src/alicerce/fonts/BricolageGrotesque-Variable.woff2` | `project/fonts/BricolageGrotesque-Variable.woff2` | `94d70a9a9bcd7134d4a291486c60e66ddb302f1f2ddf5268277ba11663b6c1b9` |
| `src/alicerce/fonts/GeistMono-Variable.woff2` | `project/fonts/GeistMono-Variable.woff2` | `684ad5b531f81d43c1e8c7038262d5db7cdc1f68006e04d6c7769efa8d33c8cc` |
| `src/alicerce/fonts/Inter-Variable.woff2` | `project/fonts/Inter-Variable.woff2` | `f052ee44c3728dfd23aba8a4567150bc314d23903026fbb6ad089422c2df56af` |
| `public/alicerce/bundle.js` | `project/components/bundle.js` | `217fc8e745dceca502798d744ab13caa24a1b697250d3f52a84057a967996272` |
| `public/alicerce/mbigucci-logotipo.png` | `project/assets/Logos/mbigucci-logotipo.png` | `f259add0cb04f903866aa3c3b46feec9b3564002d6526bc8bf0b59c311e949ba` |

**Conferido no `bundle.js` desta versão:**
- a única chamada de rede é a do `MB.versao.vigiar`, que o Vendas não liga;
- o único endereço montado é o link do WhatsApp (`wa.me`);
- o `bundle.css` não importa nada de fora.
