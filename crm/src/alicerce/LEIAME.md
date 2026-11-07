# Alicerce MBigucci, como o Vendas usa

**Não edite nada nesta pasta nem em `crm/public/alicerce/`.** Os arquivos vêm do artifact do Alicerce sem nenhuma mudança. Ajuste local vai em `crm/src/app/alicerce-local.css`, com o porquê. Se faltar algo no Alicerce, leve ao Felipe.

**Origem:**
- artifact: `https://claude.ai/artifact/52QJiDD4fLNu14iE3hce37`;
- versão: `1794018834-0e30`;
- trazida em 06/11/2026 (item 48, passo a).

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
| `src/alicerce/bundle.css` | `project/components/bundle.css` | `e4d99aeff38b8b064d671d42334073456e8d058d2bec77eee3581c2f593e9d7a` |
| `src/alicerce/ferramentas/tokens-css.mjs` | `project/ferramentas/tokens-css.mjs` | `ac4887432f8f9834fb3633749fb0f4361a26490ab8403d15adcbe64d3486ef04` |
| `src/alicerce/fonts/BricolageGrotesque-Variable.woff2` | `project/fonts/BricolageGrotesque-Variable.woff2` | `94d70a9a9bcd7134d4a291486c60e66ddb302f1f2ddf5268277ba11663b6c1b9` |
| `src/alicerce/fonts/GeistMono-Variable.woff2` | `project/fonts/GeistMono-Variable.woff2` | `684ad5b531f81d43c1e8c7038262d5db7cdc1f68006e04d6c7769efa8d33c8cc` |
| `src/alicerce/fonts/Inter-Variable.woff2` | `project/fonts/Inter-Variable.woff2` | `f052ee44c3728dfd23aba8a4567150bc314d23903026fbb6ad089422c2df56af` |
| `public/alicerce/bundle.js` | `project/components/bundle.js` | `dd138866d473521611896eb8ca02f11971fdccc58509856523e21b0f87569a7d` |

**Conferido no `bundle.js` desta versão:**
- a única chamada de rede é a do `MB.versao.vigiar`, que o Vendas não liga;
- o único endereço montado é o link do WhatsApp (`wa.me`);
- o `bundle.css` não importa nada de fora.
