# LinhasRepetiveis

Quando um formulário tem uma lista de linhas iguais: os participantes da comissão no Repasse, as tipologias do empreendimento e o valor por corretor nas metas do Vendas.

**Estrutura:** `<ul class="mb-repetivel">` com `.mb-repetivel__linha` (os campos lado a lado + o botão de ícone X “Tirar …”, `--discreto`). As colunas vêm de `--mb-repetivel-colunas`. Os rótulos aparecem só na primeira linha (nas outras ficam para o leitor de tela). Embaixo, `.mb-repetivel__rodape` com “+ Adicionar …” (`--secundario --p`) e o **total** (“Total: 4,0% · R$ 23.761,12”).

**No celular:** cada linha vira um bloco em `superficie-sutil`, com os rótulos de volta e o X no canto.

**Regras:**
- Tirar uma linha salva tira na hora e mostra o `Toast` com Desfazer; não pergunta antes.
- Quando a soma tem limite (100%, o valor da venda), o total avisa no próprio rodapé: “! Passou de 100% em 2,5 pontos”.
- Valores derivados (o R$ de cada percentual) são calculados, planos.

**Não faça**
- Uma tabela editável no lugar das linhas: aqui cada linha é um pequeno formulário.
- Mais de cinco colunas por linha.
