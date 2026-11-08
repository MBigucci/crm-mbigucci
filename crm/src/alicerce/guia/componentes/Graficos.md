# Graficos

Os gráficos dos painéis, do Dashboard e dos relatórios. Barras são HTML (acessíveis, imprimem, sem biblioteca); linha é SVG. Quem usa uma biblioteca (Recharts, Chart.js) aplica os mesmos tokens e as mesmas regras.

**Cores de série:** `grafico-1` (azul ardósia) → `grafico-2` (laranja queimado) → `grafico-3` (ameixa) → `grafico-4` (verde-azulado) → `grafico-5` (mostarda), nas classes `.mb-serie-1` a `-5`, e `grafico-outros` (`.mb-serie-outros`, cinza) para “Outros” e “Não informado”.
- **No máximo cinco cores por gráfico**; o que passar disso entra em “Outros”, em cinza. As Mídias hoje têm sete séries: ficam cinco mais o cinza.
- Todas passam de 3:1 sobre o cartão nos dois temas e se separam também pela claridade (funciona com daltonismo).
- Cores de série só em gráficos. Status continua sendo `Selo`; o funil usa as cores das etapas (`Funil`).

**Tipos:**
- **Barras horizontais** (`.mb-barras`): rótulo · trilho · valor escrito. `--agrupadas` (uma barra fina por série, para comparar total, vendidas e distratadas); empilhadas (segmentos no mesmo trilho, separados por um fio branco); `--rolagem` para listas longas (mais de 12 itens).
- **Divergentes** (`.mb-barras--divergente`): zero no meio, negativo à esquerda em `grafico-negativo` (telha) e positivo à direita em `grafico-positivo` (azul) — **nunca vermelho e verde**. O valor leva o sinal (“−R$ 477,4 mil”), e o mais crítico vai no topo.
- **Colunas** (`.mb-colunas`): para meses e dias, com o valor em cima de cada coluna.
- **Linha** (`svg.mb-svg-grafico`): `.mb-svg-grade` em `linha`, `.mb-svg-serie` com a cor da série, `--tracejada` para meta ou projeção, rótulo no último ponto.

**Sempre:** título com o que é e a nota com o recorte (`.mb-grafico__titulo`, `.mb-grafico__nota`); legenda (`.mb-legenda`) quando há mais de uma série; o valor escrito na barra (o hover só acrescenta detalhe); `role="img"` com `aria-label` que diz o resumo em palavras; alternar a ordem ou o agrupamento com o `Seletor` colado `--p`.

**Não faça**
- Pizza, rosca, 3D ou gráfico de área empilhada.
- Eixo que não começa no zero em barras.
- Cor sem legenda, ou legenda sem a palavra.
