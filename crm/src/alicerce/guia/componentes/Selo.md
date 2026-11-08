# Selo

Uma ou duas palavras de status ou de etapa ao lado de um registro — proposta, contrato, unidade, visita, boleto, lead. É a forma de status e de etapa do Alicerce, em todos os módulos, e sempre tem cor.

**Classes:** `.mb-selo` (neutro) + `--info`, `--alerta`, `--sucesso` ou `--erro`. O ponto à esquerda usa o marcador do tom (`info`, `alerta`, `sucesso`, `erro`); fundo e texto usam `*-fundo` e `*-texto`.

**O consumidor fornece:** o texto do status, do vocabulário fixo abaixo. O CSS coloca em maiúsculas.

**Vocabulário (use sempre as mesmas palavras):**

| Tom | Propostas | Contratos | Unidades |
|---|---|---|---|
| neutro | Rascunho | Em elaboração | Bloqueada |
| `--info` | Em análise | Em revisão jurídica | Reservada |
| `--alerta` | Aguardando ajuste | Aguardando assinatura | Em negociação |
| `--sucesso` | Aprovada | Assinado | Disponível |
| `--erro` | Reprovada | Cancelado | — |

**Visitas** seguem as cores da etapa do lead (decisão do Felipe, 06/11/2026): Agendada e Confirmada em `--etapa-vendas-agendada`, Aguardando baixa em `--alerta`, Realizada em `--etapa-vendas-realizada`, Não compareceu em `--etapa-perdido` e Cancelada em `--etapa-descartado`. Veja `Compromisso`.

**Etapas do lead** (uma cor por etapa, decisão do Felipe, 06/11/2026): uma família própria, ameixa, que fica mais intensa quanto mais atenção a etapa pede, e dois grafites esmaecidos para quem saiu do funil. **Cada módulo tem o seu funil** (`--etapa-vendas-*`, depois `--etapa-repasse-*` quando o Repasse ganhar o dele); as saídas (`--etapa-concluida`, `--etapa-perdido`, `--etapa-descartado`) são comuns a todos. Os nomes antigos (`--etapa-contato`, `--etapa-novo`, `--etapa-venda`…) continuam valendo como apelidos.

| Classe | Etapa | Intensidade |
|---|---|---|
| `--etapa-vendas-contato` | Em contato | a mais tranquila |
| `--etapa-vendas-agendada` | Visita agendada | |
| `--etapa-vendas-realizada` | Visita realizada | |
| `--etapa-vendas-novo` | Novo | prioridade: pede o primeiro contato |
| `--etapa-vendas-proposta` | Proposta | a mais intensa |
| `--etapa-concluida` | Venda | `sucesso` (verde) |
| `--etapa-perdido` | Perdido | grafite esmaecido, mais escuro |
| `--etapa-descartado` | Descartado | grafite esmaecido, mais claro |

A ordem está na claridade do fundo e do ponto, não só no tom: dá para ler a escala sem distinguir cores.

“Vendida” é estado de unidade sem cor de alerta: use o selo neutro e a linha `.mb-tabela--vendida`.

**Faça**
- O significado está na palavra: o selo funciona impresso em preto e branco e para quem não distingue verde de vermelho.
- Um selo por registro. Se há dois status, o segundo vira texto na coluna ao lado.

**Não faça**
- Selo como botão ou filtro clicável.
- Inventar tons novos fora das famílias de status e de funil — cada cor do sistema já significa algo.
- Selo para classificação (temperatura, prioridade): isso é `Chip`, em pílula — a leitura do corretor não pode parecer status.
- Selo sem cor: todo chip do sistema tem tom (o neutro tem fundo `areia` e ponto `texto-sutil`).
