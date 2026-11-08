# Quadro

Os itens de um funil em colunas, uma por etapa: os leads no Vendas, os contratos no Repasse, as campanhas no Marketing. Serve para ver onde está cada um e **mudar de etapa arrastando**. Para varrer e agir no dia, a peça continua sendo a `Lista` de `CardDeItem` (a `ListaDoDia`); o quadro é a outra forma de ver a mesma lista, escolhida no cabeçalho.

**Estrutura**
- `.mb-quadro` com uma `.mb-quadro__coluna[data-etapa]` por etapa. No topo de cada coluna, o `Selo` da etapa (`.mb-quadro__nome`, nas cores da etapa do módulo), a contagem e, quando faz sentido, a soma (“R$ 1.379.500,00” em Proposta).
- Os cards são `CardDeItem` compactos (`li.mb-item[draggable][data-id]`, 15px no título, sem faixa de ações): nome em linha inteira, `Prazo` com sinal quando há, uma linha de contexto e, embaixo, o `Chip` de temperatura (no quadro a coluna é estreita; o chip ao lado do nome cortaria o nome). O card inteiro abre o registro.
- Coluna vazia mostra “Arraste um lead para cá.” num contorno tracejado.
- As saídas (Venda, Perdido, Descartado) **não são colunas**: saem pelo registro, onde o motivo é obrigatório.

**Mover**
- **Ponteiro:** arrastar e soltar; o card de origem esmaece e a coluna de destino ganha o fundo `areia-suave` com contorno tracejado.
- **Teclado:** com o foco no card, **Espaço** pega (contorno em tinta), **← →** levam de etapa, **↑ ↓** mudam a posição, **Espaço** solta e **Esc** devolve. Cada passo é anunciado para leitor de tela (“Em contato, posição 2 de 3.”).
- **Celular:** o quadro vira uma coluna por vez, escolhida nas `Abas` com a contagem (`.mb-quadro__abas`). Para mudar de etapa no celular, abra o card e troque a etapa no registro: arrastar entre colunas que não aparecem juntas não funciona com o dedo.
- Ao soltar em outra etapa, o `Toast` confirma com **Desfazer** (“Ana Exemplo: Visita agendada”). Se a etapa pede um dado (data da visita, valor da proposta), o módulo escuta `mb-mover`, chama `evento.preventDefault()`, abre o `PainelLateral` com o que falta e, se a pessoa cancelar, chama `detail.desfazer()` — o card volta.

**Comportamento:** `MB.quadro.ligar(raiz)` liga arrastar, teclado, abas e contagens. O filtro e a busca da tela continuam no `BarraDeFiltros`, e a escolha Lista/Quadro fica no endereço (`?ver=quadro`).

**Não faça**
- Coluna para cada saída do funil.
- Mudar de etapa sem Desfazer.
- Card com ações na faixa dentro do quadro: o quadro é para ver e mover; agir é no card da lista ou no registro.
