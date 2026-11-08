# Compromisso

Tudo que tem dia e hora com alguém: a visita no Vendas, a vistoria e a assinatura no Repasse. É uma receita do `CardDeItem`: o card inteiro abre o compromisso, o estado vai num `Selo` e a faixa traz as ações que o estado permite.

**Estrutura:** `.mb-item` com o título `.mb-item__titulo.mb-item__alvo` = quando (“Hoje, 15:00”, “Sáb, 07/11, 09:30”, algarismos tabulares), uma `.mb-item__linha` com quem e onde (“Ana Exemplo · Plantão do Residencial Exemplo”), o `Selo` do estado no `.mb-item__rodape` e a `.mb-item__faixa`. O estado fica no rodapé, como a etapa no `CardLead`: o canto direito do card é só para classificação (`Chip`), e o compromisso não tem (decisão do Felipe, 07/11/2026). No Repasse, a `.mb-sobrelinha` diz o tipo (“Repasse · vistoria”) e a linha leva o código do contrato.

**Estados da visita (Vendas) — nas cores da etapa do lead** (decisão do Felipe, 06/11/2026):

| Estado | Selo | Ações na faixa |
|---|---|---|
| Agendada | `--etapa-vendas-agendada` | Remarcar · WhatsApp → (abre a mensagem pronta de confirmar a visita). Cliente confirmou, Observação e Cancelar visita ficam na visita aberta |
| Confirmada | `--etapa-vendas-agendada`, palavra “Confirmada” | Remarcar · WhatsApp → |
| Aguardando baixa | `--alerta` (o horário passou e ninguém deu baixa) | ✕ Não compareceu · ✓ Realizada |
| Realizada | `--etapa-vendas-realizada` | + Observação e comprovante · Corrigir |
| Não compareceu | `--etapa-perdido` | + Observação · Corrigir |
| Cancelada | `--etapa-descartado` | Corrigir |

Agendada e Confirmada têm a mesma cor e se separam pela palavra. Nos outros módulos o estado usa o funil do próprio módulo; até o Repasse ter o seu, `--info` (Agendada), `--sucesso` (Feita) e `--etapa-descartado` (Cancelada).

**O que é curto abre no card:** Remarcar (dia e hora), Observação e Corrigir (novo estado e motivo) abrem em `.mb-item__edicao`, no lugar da faixa, com `MB.edicao.ligar(botao)`. O card cresce e empurra os de baixo; um por vez; `Esc` ou “Cancelar” fecha. Dar baixa (Realizada, Não compareceu) é um toque, com `Toast` de Desfazer.

**Visita aberta:** o título (`button.mb-item__alvo`) abre a visita no próprio card, em `.mb-item__edicao`: “✓ Cliente confirmou” (só agendada e antes do horário), “+ Observação” e “Cancelar visita” (com Desfazer). Na Agenda e na Lista do dia o card leva à ficha; na ficha, abre no lugar.

**O consumidor fornece:** dia e hora já formatados (“Hoje, 15:00” para hoje e amanhã; “Qua, 04/11, 23:00” para os demais), quem e onde, o estado e as ações que o estado e o perfil permitem.

**Faça**
- Na Lista do dia, os compromissos de hoje entram como seção própria, depois dos atrasados.
- Cancelar fica dentro da visita aberta, com Desfazer.
- “✓” e “✕” só nos botões que encerram (Realizada, Não compareceu).

**Não faça**
- Cor de fundo no card por estado: o estado está no `Selo`.
- Estado em `Chip`: estado é status, e status é `Selo`.
- Abrir Remarcar num diálogo no meio da tela.
