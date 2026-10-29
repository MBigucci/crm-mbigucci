---
name: atualizar-apps-script
description: Altera o Google Apps Script da pesquisa (discovery/apps-script/Code.gs) e guia o Felipe a reimplantar sem trocar a URL. Use ao mudar perguntas, colunas, rótulos ou o painel da planilha.
---

# Atualizar o Apps Script da pesquisa

O script vive na Google Planilha do Felipe. Você edita `discovery/apps-script/Code.gs` e ele cola o código no editor do Apps Script. Você não tem acesso à conta Google.

## 1. Manter os três lugares em sincronia
- `COLUNAS` no `Code.gs` tem a mesma ordem das chaves de `respostaSchema` em `discovery/src/lib/perguntas.ts`.
- `PERGUNTAS` no `Code.gs` repete **exatamente** os `rotulo` das opções em `perguntas.ts`. O painel conta pelos rótulos.
- `LISTAS` contém todo campo de múltipla escolha.

Se mudou algum rótulo, avise o Felipe: as linhas antigas da planilha não serão contadas com o rótulo novo.

## 2. Regras do Apps Script
- `setFormula` recebe a sintaxe **em inglês, com vírgula**, mesmo com a planilha em português.
- O texto livre passa por `limpa_()`, que neutraliza `=`, `+`, `-` e `@` no início.
- O site só **grava**: não crie um `doGet` que devolva respostas. O token fica público no JavaScript do site.
- Verifique a sintaxe antes de entregar: copie o arquivo como `.js` para o scratchpad e rode `node --check`.

## 3. Passo a passo para o Felipe
1. Na planilha: **Extensões > Apps Script**. Substitua todo o conteúdo do `Code.gs` pelo novo e salve.
2. **Implantar > Gerenciar implantações >** editar (lápis) a implantação existente **> Versão: Nova versão > Implantar**.
   Nunca use "Nova implantação": ela gera uma URL nova e o site para de gravar.
3. Se mudaram as colunas, faça uma cópia da aba "Respostas" antiga, renomeie-a e deixe o script criar uma aba nova no próximo envio.
4. Se mudou o painel, use o menu **Pesquisa > Criar painel** de novo.
5. Mande uma resposta de teste pelo site e confira se a linha chegou.

Se a URL mudou, o site precisa de um build novo com `NEXT_PUBLIC_SHEETS_URL` atualizado. Use a skill `publicar-wordpress`.
