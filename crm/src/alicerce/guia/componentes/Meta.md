# Meta

O quanto da meta já foi feito e para onde o ritmo atual leva: um valor, uma barra e uma marca de projeção.

**Estrutura:** `.mb-meta` (moldura de cartão) com `.mb-meta__rotulo` (sobrelinha: “Meta anual de VGV”), `.mb-meta__valor` (Bricolage 20px, tabular: “R$ 3.400.000 de R$ 10.000.000”, com cada `R$`, `%` e `dias` em `.mb-unidade`), `.mb-meta__trilho` com a `.mb-meta__barra` (10px, `raio-total`, trilho em `trilho`) e o preenchimento `<span style="width: 34%">` em `texto`, a marca `.mb-meta__projecao` (`style="left: 62%"`, 2px em `texto-suave`, passando 4px acima e abaixo da barra) e `.mb-meta__legenda` (“34% feito” · “Projeção para dezembro: 62%”).

**Mínimo e marcos:** quando a meta tem um piso (o mínimo de pontos para ter verba), a marca `.mb-meta__minimo` (tracejada, `texto-suave`) fica no lugar do mínimo, e `.mb-meta__marcos` escreve embaixo os números que importam (“mín. 130 · 200 · 280”). A legenda diz em palavras se passou (“✓ Passou do mínimo” ou “! Faltam 12 pontos para o mínimo”). Projeção e mínimo podem aparecer juntos.

**Contraste:** o trilho é `linha-forte` (3,22:1 sobre a superfície no papel, 3,61:1 no grafite), então a barra inteira aparece; o preenchimento fica a ≥ 4,2:1 do trilho. A barra tem `role="img"` e um `aria-label` com o número (“34% da meta; projeção de 62%”) — a cor não carrega o significado.

**Unidade:** `.mb-unidade` deixa `R$`, `%` e `dias` menores e mais leves que o número — 60% do tamanho, Inter 500, `texto-suave`, na mesma linha de base — para o olho ler o número primeiro. Nunca de outra cor, com ou sem o modificador de marca.

**Movimento:** o preenchimento cresce da esquerda ao abrir a tela (`mov-cartao`, depois de `mov-entrada`). Com movimento reduzido ele já aparece cheio.

**O consumidor fornece:** valor feito, meta, a projeção calculada (ritmo atual até o fim do período) e o período.

**Faça**
- Valores exatos na meta (R$ 3.400.000); compacto só em `Indicador`.
- Uma meta por cartão; várias metas viram uma lista de cartões.

**Não faça**
- Preenchimento verde ou vermelho por estar acima ou abaixo da meta: diga em palavras na legenda.
- Barra sem número.
