# Notificacoes

O que chegou para a pessoa desde a última vez: lead novo, visita confirmada, proposta aprovada, pendência no contrato, mudança no ranking. Uma peça para todos os módulos do Base360 — a pessoa vê as notificações de todos os módulos a que tem acesso, com o nome do módulo no detalhe quando vem de outro.

**Onde fica**
- **Computador:** o sino no topo (`BarraSuperior`), entre o + Novo e a conta, com o ponto de notificação (`marca`) quando há novas. Abre um popup de 380px alinhado à direita.
- **Celular:** o sino sai do topo para o + do módulo e o menu caberem. O ponto vai para o ícone de menu e “Notificações” entra na folha com a contagem (`.mb-folha__contagem`); toca e abre a página.
- **Ver todas:** a página com `Abas` “Não lidas · Todas as notificações”, a mesma lista dentro de um `Cartao`, os últimos 30 dias.

**Cada notificação** (`a.mb-notificacao`, a linha inteira abre o registro):
- ícone do assunto (`MB.icone`), o fato na primeira linha e, na segunda, o que fazer ou onde está, com a hora: “Lead novo para você: Sofia Exemplo” / “Responda em 15 min · Site · Marco Zero One · 15:02”;
- sinais do vocabulário quando cabem: “!” pede ação (`--acao`, `erro-texto`), “✓” deu certo (`--ok`);
- **nova:** `.mb-notificacao--nova` — título em negrito e tinta e o ponto de 8px em `marca` à direita (o mesmo ponto do sino). Lida, o título fica em `texto-suave`;
- agrupadas por dia (`.mb-notificacoes__grupo`: Hoje, Ontem, a data).

**Comportamento:** `MB.popup.ligar(sino)` abre e fecha; `MB.notificacoes.ligar(caixa)` marca como lida ao tocar, liga “Marcar todas como lidas” (some quando não há novas), apaga o ponto do sino e troca o `aria-label` (“Notificações: 3 novas”). Dispara `mb-lida` para o módulo gravar. O aviso no aparelho (push) segue as escolhas de **Minha conta → Avisos neste aparelho**.

**Não faça**
- Notificação de coisa que a pessoa mesma fez.
- Contagem no sino (“99+”): o ponto basta; a contagem fica na página e na folha.
- Texto técnico ou em inglês (“New lead assigned”).
