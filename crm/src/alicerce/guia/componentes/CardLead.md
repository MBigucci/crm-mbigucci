# CardLead

A receita do `CardDeItem` para o lead do Vendas, usada na Lista do dia, em Leads e nos retornos da Agenda.

**Conteúdo, de cima para baixo:**
- título = nome do lead (`.mb-item__titulo.mb-item__alvo`, estilo `titulo-item`, uma linha com reticências): o card inteiro abre a ficha;
- primeira linha: o `Prazo` que pede ação (“! Prazo estourado há 12 min”, “! Atrasado · Ontem, 10:00”, “! Abriu o WhatsApp hoje, 9h”); depois o próximo contato;
- à direita, o `Chip` de temperatura (“! Quente”, “○ Morno”, “– Frio”, “– Sem temperatura”);
- `.mb-item__texto`: a última interação (quando · o que aconteceu), em até duas linhas;
- `.mb-item__rodape`: o `Selo` da etapa (`--etapa-vendas-*`);
- `.mb-item__faixa` (o rodapé do `Cartao`): **Registrar · WhatsApp →**, sem “Mais” (decisões do Felipe, 06/11/2026: a principal por último; o que é crítico fica na ficha). No grupo “Detalhe o contato” a principal vira “Detalhar”. Agendar visita, Compartilhar e Descartar lead ficam na ficha do lead.

**Registrar** abre o `PainelLateral` (o formulário tem três campos). Para quem só vê o lead (gerente), a faixa troca para “Atribuir”; Compartilhar fica na ficha.

**Apelidos:** as classes antigas `.mb-lead`, `.mb-lead__nome`, `.mb-lead__linha`, `.mb-lead__historico`, `.mb-lead__rodape` e `.mb-lead__acoes` continuam funcionando; para telas novas, use as do `CardDeItem`.

**Faça**
- O primeiro card da tela com `.mb-item--destaque`.
- Esconder o WhatsApp quando o lead não tem telefone; a faixa fica só com Registrar.

**Não faça**
- Botão “Abrir”: o card inteiro já abre.
- Barra vermelha no card do prazo estourado.
