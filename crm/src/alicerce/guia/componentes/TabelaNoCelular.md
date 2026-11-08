# TabelaNoCelular

Como a mesma `TabelaCompleta` se comporta abaixo de 768px. A regra é pelo tipo da tabela (decisão do Felipe, 06/11/2026), e nunca com duas versões escritas à mão.

**Registros (`.mb-tabela--registros`):** contratos, leads, fila, pendências — coisas que se abrem. Cada linha vira um card com o mesmo material do `CardDeItem`: a primeira célula é o título; as outras viram pares “rótulo · valor” a partir de `data-rotulo` em cada `<td>`; o cabeçalho fica só para o leitor de tela; a caixa de marcar vai para o canto do card; o Total some. O card inteiro continua abrindo o registro.

**Números (`.mb-tabela--numeros` + `.mb-tabela--primeira-fixa`):** painel, relatórios, metas — coisas que se comparam. A tabela mantém as colunas e rola de lado dentro do próprio quadro; a primeira coluna (quem) e a linha Total ou Equipe (embaixo) ficam presas. Dê uma altura máxima ao `.mb-tabela-envoltorio` quando a lista for longa.

**O consumidor fornece:** o tipo da tabela e o `data-rotulo` de cada célula (as palavras do cabeçalho).

**Não faça**
- Esconder colunas no celular sem dizer; se sobrar coluna demais, mostre menos no computador também.
- Rolagem lateral em tabela de registros (vire cards).
