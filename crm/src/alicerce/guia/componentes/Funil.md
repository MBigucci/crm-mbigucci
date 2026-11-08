# Funil

Quantos chegaram em cada etapa e quantos passaram para a seguinte. Usa **as cores das etapas do funil do módulo** (`.mb-funil--vendas`: Em contato → Visita agendada → Visita realizada → Proposta, e Venda em `sucesso`), as mesmas dos `Selo`s de etapa — quem lê o painel reconhece a etapa pela cor e pela palavra.

**Estrutura:** `<ol class="mb-funil mb-funil--vendas">` com `.mb-funil__etapa` (nome · barra `.mb-funil__barra` com `--v` proporcional ao topo · número) e, entre elas, `.mb-funil__passagem` (“→ 40% passam”). Acima, a nota com a conversão total (“conversão de lead em venda: 4,2%”).

**Regras:** “Aguardando lançamento” conta como Em contato (regra do Vendas). Etapas de saída (Perdido, Descartado) não entram no funil: vão num número à parte. O `aria-label` da lista diz os números em palavras.

**Faça**
- O número clicável abre a lista daquela etapa (`RelatorioDoNumero`).

**Não faça**
- Funil em trapézio ou em 3D: a barra reta deixa comparar.
