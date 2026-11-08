# Indicador

Um número que resume o momento — propostas do mês, vendas convertidas, VGV, recebíveis — no topo de painéis.

**Estrutura:** `.mb-indicadores` (grade automática, mínimo 200px por coluna) com vários `.mb-indicador` (cartão branco com `sombra-cartao`, padding `esp-4`): `.mb-indicador__cabecalho` com `.mb-indicador__rotulo` (sobrelinha) e `.mb-indicador__origem` opcional (“CRM”, “ERP” — de onde vem o número), `.mb-indicador__valor` (Bricolage Grotesque 28px, algarismos tabulares) e uma linha de contexto: `.mb-indicador__variacao` (`--alta` em `sucesso-texto`, `--baixa` em `erro-texto`, sempre com seta) ou `.mb-indicador__barra` (trilho em `trilho`, que tem 3:1 sobre a superfície, preenchimento em `texto`) + `.mb-indicador__meta`. Para meta com marca de projeção e unidade em destaque, use `Meta`.

**O consumidor fornece:** o rótulo, o valor já formatado (`MB.formatar.moedaCompacta(18400000)` → “R$ 18,4 mi”), a origem do dado e a comparação em palavras (“14% sobre outubro”).

**Faça**
- 3 a 4 indicadores por painel, os que mudam uma decisão hoje.
- A variação sempre com seta e texto: a cor sozinha não diz se subiu ou desceu.
- `--alta`/`--baixa` dizem se é bom ou ruim para a operação, não a direção da seta: recebíveis vencidos subindo é `--baixa` com seta para cima.

**Não faça**
- Gráficos decorativos dentro do indicador.
- Valores compactos em documentos e contratos: lá o valor é exato (`R$ 18.412.300,00`).
