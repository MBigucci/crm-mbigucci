# Abas

Alterna entre recortes do mesmo conteúdo — status de uma lista, partes de um registro — sem sair da tela.

**Estrutura:** `.mb-abas` com `role="tablist"` e botões `.mb-aba` (`role="tab"`, `aria-selected`). A aba ativa fica em `texto` com sublinhado de 2px em `texto` (seleção é tinta); as demais em `texto-sutil`. No celular cada aba tem 44px de altura. `.mb-aba__contagem` mostra quantos itens há — só quando o número pede ação.

**Comportamento:** `MB.abas.ligar(lista)` liga os botões aos painéis pelo `aria-controls` (o painel não selecionado fica com `hidden`), troca com as setas ←/→, Home e End, e dispara `mb-aba` com `detail.painel`. Um link para o painel em qualquer lugar da tela (`href="#p-documentos"`) seleciona a aba e leva até ela.

**No topo de um cartão:** como filho direto de `.mb-cartao`, as abas ficam alinhadas ao padding do corpo e o fio de baixo vira o divisor do cartão (Andamento · Documentos · Histórico, na `FichaDoLead`).

**No celular:** as abas rolam dentro da própria faixa, sem barra de rolagem; a página não rola na horizontal. A aba cortada na borda mostra que há mais.

**O consumidor fornece:** os rótulos, `id` e `aria-controls` de cada aba, os painéis com `role="tabpanel"` e `aria-labelledby`, e a aba selecionada.

**Faça**
- A primeira aba é a fila de trabalho (“Aguardando aprovação”); “Todas as propostas” fica por último (sempre com o substantivo).
- Use em todo módulo onde um registro ou uma lista longa tem recortes.
- De 2 a 6 abas, rótulos de até três palavras.

**Não faça**
- Abas para etapas de um processo em sequência — para isso existe `Etapas`.
- Abas numa lista de rotina que precisa ser vista inteira, como a Lista do dia: ali, seções com contagem.
- Sublinhado vermelho: a aba ativa é tinta, inclusive com o modificador `data-acao="marca"`.

**Páginas irmãs de uma área** (Stand → Atendimento, Relatório…), cada uma com endereço próprio, não são abas: use `NavegacaoDaArea`.
