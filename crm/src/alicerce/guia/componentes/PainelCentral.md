# PainelCentral

Tela de referência que aplica o Alicerce inteiro num painel de CRM e ERP. Use-a como ponto de partida de qualquer módulo novo: copie a estrutura e troque o conteúdo.

**Estrutura, de cima para baixo:**
1. `.mb-app` com `MenuLateral` (lockup Base360 sem módulo, porque o painel cruza os módulos; grupos Vendas, CRM e ERP; item ativo com o quadradinho `marca`; logo MBigucci no rodapé) e, na coluna principal, a `BarraSuperior` (título da área, busca com atalho `/`, período, notificações, avatar).
2. `CabecalhoDePagina` compacto (`.mb-cabecalho--compacto`): título, data de atualização dos dados e no máximo duas ações (secundária + primária).
3. `.mb-painel` com quatro `Indicador`, cada um marcado com a origem do dado (CRM ou ERP).
4. Cartão “Monitoramento de propostas”: barra de filtros em pílula, `Tabela` densa colada ao cartão (sem moldura própria) com código em mono, cliente e corretor, empreendimento e unidade, `Esteira` empilhada, valor tabular à direita, data e `Selo`; total no rodapé da tabela e paginação.
5. `.mb-painel__linha` com dois cartões: a proposta selecionada (8 colunas) — `Etapas` compactas em faixa, `Aviso` e duas sub-seções (cliente em fundo sutil, condições com fio lateral e valores alinhados) — e “Aguardando sua ação” (4 colunas), uma `.mb-lista` de pendências.

**Regras que a tela demonstra:**
- Fundo papel; cartões brancos com borda e micro-sombra; nada com sombra dentro deles.
- Linhas de 36px, só divisores horizontais, cabeçalhos em 11px maiúsculos.
- Valores, áreas e datas na Inter tabular, alinhados à direita; códigos em Geist Mono.
- Sem o modificador de marca, vermelho só no giro do logo, no item ativo do menu e no ponto de notificação; azul só em foco, link no hover e etapa em andamento.
- O total da tabela e as condições da proposta fecham com os valores das linhas (as somas foram conferidas).

**O consumidor fornece:** os dados reais de cada bloco, a linha selecionada (`aria-selected="true"`) ligada ao cartão de detalhe, e as ações.

**Não faça**
- Mais de quatro indicadores na primeira linha.
- Gráficos decorativos para preencher espaço — a tabela é o conteúdo principal do painel.
- Uma segunda ação primária: “Nova proposta” é a única.
