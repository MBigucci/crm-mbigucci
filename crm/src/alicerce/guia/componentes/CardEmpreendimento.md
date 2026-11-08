# CardEmpreendimento

O empreendimento na lista (Vendas, Repasse, Dashboard): de relance, a fase, onde fica e **quanto ainda há para vender**. É uma receita do `CardDeItem`: o card inteiro abre o `EspelhoDeUnidades`.

**Estrutura**
- `Fase` (o quadradinho com as cores da legenda do site e a palavra: Futuro lançamento, Lançamento, Em construção, Pronto) acima do nome; o nome exatamente como no site; bairro e cidade.
- `.mb-estoque`: a barra (`.mb-estoque__barra`, 8px) com os estados na mesma ordem e nas mesmas cores do espelho — vendidas, alugadas à venda, reservadas, disponíveis, fora de venda — e, embaixo, **as contagens escritas** (`.mb-estoque__legenda`: amostra, número, palavra). A barra é resumo; o número é o dado.
- Abaixo do local, o total de unidades. Faixa: “42% vendido” à esquerda e **uma** ação: “Tabela de preços” (com borda, uso diário). Abrir o espelho é tocar no card.
- Opcional: `.mb-empreendimento__imagem` (16:9, a foto do site) no topo, só no portal e no material de vendas; nas telas de trabalho, sem foto.

**Sem dados de estoque** (um módulo que ainda não recebe as unidades): o card mostra fase, nome, local e total de unidades, sem barra e sem legenda — nunca uma barra vazia ou zerada.

**Grade:** `.mb-empreendimentos` (cards de 300px ou mais, quantos couberem); no celular, um por linha. Ordem padrão: lançamentos primeiro, depois por estoque disponível.

**Não faça**
- Porcentagem sem o número de unidades.
- Pizza ou rosca para o estoque.
- Selo de status para a fase: fase é `Fase`.
