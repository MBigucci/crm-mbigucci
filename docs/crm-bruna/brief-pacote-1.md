# Brief para a sessão do CRM da Bruna: pacote 1 (próximo contato, toque e Sem resposta)

> Para a sessão "CRM imobiliário com cadastro inteligente", que trabalha em `C:\Projects\CRM Bruna`. Escrito pela sessão master do Base360 Vendas em 06/11/2026, a partir do estudo `C:\Projects\CRM MBigucci\docs\estudo-melhorias-crm-bruna.md`, seções 5.1, 5.2, 5.3, 5.11, 6 e 8. **As decisões são do Felipe e da Bruna:** este brief não muda nada no CRM dela antes do ok da Bruna.

## Leia antes
- O estudo, seções 5.1, 5.2, 5.3, 5.11, 6 (o que você mesma respondeu) e 8 (as decisões do Felipe em 06/11/2026).
- Como o Base360 fez, só como referência, com caminhos absolutos para leitura. **Não copie arquivo inteiro**: adapte ao CRM dela, que é de uma pessoa só.
  - `C:\Projects\CRM MBigucci\docs\leads.md`, seções 2, 3 e 5: o próximo contato, os grupos da tela inicial, o toque no WhatsApp e no Ligar, "Detalhe o contato" e "Sem resposta" em "Como foi";
  - `C:\Projects\CRM MBigucci\crm\src\lib\followup.ts` (`aDetalhar`, `podeSemResposta`) e `leads.ts`;
  - `C:\Projects\CRM MBigucci\crm\src\lib\rascunho.ts`;
  - `C:\Projects\CRM MBigucci\docs\notificacoes.md`, seção 3, com o aviso de contato.
- No CRM dela: `lib/followup.ts` (`followUpDue`), `lib/performance.ts` (a Sequência, a métrica de contatos e os 37 testes), `lib/store.tsx` (`logWhatsApp`), `lead-sheet.tsx` (o Ligar), `new-lead-dialog.tsx`, o `push_due` e `lib/push.ts`.

## O que foi decidido (Felipe, 06/11/2026)
1. **Próximo contato com dia e hora, substituindo a regra dos 2 dias.**
   - Toda interação pede o próximo contato, com atalhos: amanhã às 10h e +2 dias.
   - A tela inicial separa **Atrasados, Hoje e Sem próximo contato**.
   - O aviso no celular sai na hora marcada, num tipo novo: "Hora do contato · Ana Souza. Marcado para 14h."
   - O "Sem contato há N dias" continua no card, só como informação.
   - A regra dos 2 dias sai do motor (`followUpDue`, a Sequência, a métrica de contatos e o `push_due`).
2. **O toque é separado da conversa.**
   - Abrir o WhatsApp ou tocar em Ligar grava só um registro automático, um por tipo por dia ("Abriu o WhatsApp", "Ligou"). O Ligar passa a gravar também.
   - Esse registro tira o lead de "novo" e encerra o prazo de 15 min, mas **não** zera os dias sem contato nem soma tentativa.
   - O lead fica em **"Detalhe o contato"** até ela registrar como foi, e o Detalhar já abre pedindo o próximo contato.
   - **Mantenha a regra que você lembrou:** a saída de "Lead novo" só vale como primeiro contato se não voltar em até 15 min (o Desfazer).
   - Os registros antigos "Conversa aberta no WhatsApp" continuam contando como contato.
3. **"Sem resposta" dentro de "Como foi".**
   - Só aparece com **2 dias de calendário ou mais** desde a última interação detalhada, ou desde o cadastro.
   - Ao escolher, vêm preenchidos o texto "Tentei contato, sem retorno." e o próximo contato daqui a 2 dias, na hora cheia. Os dois são editáveis, e trocar de tipo devolve o que estava antes.
   - O botão vira "Registrar tentativa n de 3", e na 3ª a ficha mostra "Descartar: sem retorno".
   - Os atalhos de 1 toque ("Sem resposta (+1)" no Painel, na Agenda e no topo da ficha) saem ou passam a abrir a ficha em "Como foi".
4. **Rascunho no aparelho** (item 5.3, opcional neste pacote, porque o diálogo de interação muda de qualquer jeito):
   - os formulários de novo lead e de interação ficam guardados no `sessionStorage` a cada mudança;
   - limpam ao salvar e **ao sair da conta**, porque há dois usuários no mesmo app.

## Etapas
1. **Mostrar à Bruna antes de mudar o motor.** Um resumo curto, no formato que ela usa com você, de como a tela inicial, o registro de interação e os avisos vão ficar, e do que muda no dia a dia: ela perde o atalho de 1 toque do "Sem resposta" e passa a marcar sempre a data. **Pare** até ela concordar. Se ela não concordar com algo, anote e avise o Felipe pela sessão master (`to`: `Base360 Vendas Main`).
2. **Motor e testes:** o campo de próximo contato (tipos, `cloud.ts`, schema e dados de exemplo), o novo `followUpDue`, a Sequência e as métricas, o toque, "a detalhar", "Sem resposta" e o `push_due`. Atualize os 37 testes de `performance` e acrescente testes para cada regra acima.
3. **Telas:** o registro de interação com o próximo contato e os atalhos, os grupos da tela inicial, o "Detalhe o contato", o Ligar gravando, o "Sem resposta" em "Como foi" e o aviso novo. Use o design da marca dela, sem trazer o visual do Base360.
4. **Conferência:** a suíte e o build do CRM dela, mais um roteiro de teste para a Bruna fazer no celular.

## Limites
- Siga as regras do repositório dela (o `CLAUDE.md` e as convenções de lá).
- Sem credenciais reais e sem dados reais de clientes nos testes.
- O pacote 1 trata só dos itens acima. Os pacotes seguintes (mensagens editáveis, aniversário, visita, descartar no lugar de excluir) virão em briefs próprios.
- Não traga do Base360 nada de equipe, gerente, roleta, pontos, recepção ou parcerias, nem integrações entre sistemas.

## Pronto quando
- A Bruna aprovou o resumo da etapa 1.
- A regra dos 2 dias saiu do motor, e toda interação pede o próximo contato.
- O toque grava o registro automático e deixa o lead em "Detalhe o contato" sem zerar os dias, e o Desfazer de 15 min continua funcionando.
- "Sem resposta" só aparece depois de 2 dias, preenche o texto e a data e sugere descartar na 3ª tentativa.
- O aviso "Hora do contato" sai na hora marcada.
- Os testes e o build do CRM dela passam.
- O relatório separa o que foi testado do que só a Bruna confere no celular.
