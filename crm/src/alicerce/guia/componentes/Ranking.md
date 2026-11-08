# Ranking

Lista posicionada — o ranking de vendas da equipe ou a fila de distribuição de leads do plantão — com a linha do próprio usuário marcada como “você está aqui”.

**Estrutura:** `<ol class="mb-ranking">` com `<li class="mb-ranking__item">`: `.mb-ranking__posicao` (“1º”, algarismos tabulares), `.mb-ranking__nome` (`.mb-ranking__quem` com o nome e `.mb-ranking__detalhe` com o detalhe: “2 vendas · VGV R$ 4,1 mi”, “Chegou às 9:15”) e `.mb-ranking__valor` à direita (o número que ordena, ou o estado na fila: “Na vez”, “Aguardando”). Itens de 48px, divisores `linha`, dentro de uma moldura de cartão.

**Você está aqui:** a linha do usuário leva `aria-current="true"`, fundo `areia`, posição e nome em `texto` 700, e a etiqueta `.mb-ranking__voce` (“Você”). Se o usuário está fora do top que aparece, mostre a linha dele no fim, depois de um item “…”.

**Fila:** a mesma lista, ordenada pela vez. O primeiro tem “Na vez” no valor; quem está atendendo sai da fila e volta ao fim.

**O consumidor fornece:** posições, nomes, o valor já formatado (ranking por VGV usa `MB.formatar.moedaCompacta`) e qual linha é do usuário.

**Faça**
- Diga o critério no título (“Ranking por VGV assinado · novembro”).
- No máximo 10 linhas; o restante em “Ver ranking completo”.

**Não faça**
- Medalhas, troféus coloridos ou cores por posição.
- Esconder a posição do usuário quando ele está mal: ela sempre aparece.
