# TabelaCompleta

A `Tabela` com o que os módulos usam no dia a dia: ordenar, abrir o registro pela linha, marcar em lote, editar na linha, Total e paginação. Uma peça só no lugar das tabelas escritas à mão em cada tela (no Vendas, nenhuma tabela era componente).

**Ordenar:** no `<th>`, `aria-sort="none|ascending|descending"` e um `button.mb-tabela__ordenar` com o nome da coluna. A seta (↕ ↑ ↓) mostra o sentido. `MB.tabela.ligar(tabela, lote)` alterna e dispara `mb-ordenar` com `detail.coluna` e `detail.sentido`; quem ordena os dados é o sistema, e a ordem vai para o endereço da página.

**A linha inteira abre o registro:** `.mb-tabela--linhas` e o código (ou o nome) da primeira coluna como `a.mb-tabela__alvo`. Caixas, botões e campos da linha continuam funcionando por cima. Quando a linha abre um `PainelLateral` em vez de outra página (as ações de um corretor na fila), o alvo é um `button.mb-tabela__alvo` — nunca um “⋯” na ponta.

**A linha da própria pessoa** (“Você” na fila, a sua linha no ranking da equipe): `aria-current="true"` no `<tr>` deixa a linha em `areia` e em peso 600; o nome vira “Você”.

**Selos e prazo:** até três `Selo`s numa célula (`.mb-tabela__selos`); o prazo é `Prazo` (texto com sinal), na sua própria coluna.

**Marcar em lote:** `.mb-tabela__marcar` com `input[data-mb-marcar]` em cada linha e `[data-mb-marcar-todas]` no cabeçalho (fica “meio marcado”, com um traço, quando só parte está). A `.mb-lote` aparece presa embaixo da área com “2 selecionados”, “Limpar” e as ações do lote (a principal por último). No computador a linha marcada fica em `areia`; no celular, onde a linha vira card, **o card inteiro** ganha o contorno em tinta e o fundo de seleção — nunca faixas por célula.

**Editar na linha:** `.mb-tabela__editar` com o estado `.mb-salvo`, o campo (28px) e o `button[data-mb-salvar]` **primário**, que **só aparece quando o valor mudou** (decisão do Felipe, 06/11/2026: o Salvar tem destaque, mas sem encher a tabela de botões cheios). Enquanto não salva, o campo fica com a borda em tinta; Enter salva, Esc volta ao valor salvo. Estados: “✓ Salvo às 15:08”, “Salvando…”, “! Não foi salvo: sem conexão” (o Salvar continua à vista). `MB.editarNaLinha.ligar(celula)` cuida disso e dispara `mb-salvar`; o sistema responde com `.salvou()` ou `.falhou(texto)`. Para metas, faixas e critérios: o que é um valor só. Mais que isso vai para o `PainelLateral`.

**Total, contagem e paginação:** `tfoot` com a linha Total ou Equipe; `.mb-tabela-rodape` com “Mostrando 1–4 de 24” e a `.mb-paginacao`.

**No celular, conforme o tipo** (decisão de 06/11/2026):
- `.mb-tabela--registros` (contratos, leads, fila): cada linha vira um card, sem escrever a lista à mão. Cada `<td>` leva `data-rotulo` (“Cliente”, “Valor”), que aparece à esquerda; a primeira célula é o título do card; o Total some.
- `.mb-tabela--numeros` (painel, relatórios, metas): rola dentro do quadro com `.mb-tabela--primeira-fixa` e a linha Total fixa embaixo.

**Faça**
- Até sete colunas; o resto vai para a ficha do registro.
- Valores à direita, tabulares; código na primeira coluna.

**Não faça**
- Botões em todas as linhas quando a linha já abre o registro: use o lote ou a ficha.
- Tabela e lista duplicadas para computador e celular.
