# BarraDeAcoes

Rodapé fixo de formulários longos: o número que importa e a ação final ficam sempre à vista, sem o funcionário rolar para procurar.

**Estrutura:** `.mb-barra-acoes` (sticky no fim do conteúdo, `superficie`, borda `linha`, `sombra-barra`) com `.mb-barra-acoes__resumo` à esquerda — `__rotulo`, `__valor` (algarismos tabulares) e `__estado` (salvamento) — e `.mb-grupo-botoes` à direita.

**Celular:** `.mb-barra-acoes--unica` é a versão de uma ação só: o resumo some abaixo de 768px e o botão ocupa a largura inteira, com 44px (ex.: “+ Novo lead” no fim da Lista do dia).

**O consumidor fornece:** o resumo que decide (total da proposta, unidade, nº de parcelas), o estado do salvamento atualizado de verdade, e no máximo duas ações: `--discreto` + `--primario`.

**Faça**
- Atualize o total em tempo real quando campos de valor mudarem.
- Salve rascunho automaticamente e diga quando (“Rascunho salvo às 15:08”).
- Desative o primário enquanto houver erro, e diga o motivo no estado (“Corrija 1 campo para enviar”).

**Não faça**
- Colocar a barra em telas de leitura ou listagem — ela é para quem está preenchendo.
- Repetir ali as ações do cabeçalho.
