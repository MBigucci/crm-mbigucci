# Botao

Dispara uma ação; o primário (grafite, ou vermelho no módulo que liga o modificador de marca) marca a única ação principal da tela.

**Classes:** `.mb-botao` + uma variante: `--primario`, `--secundario`, `--discreto`, `--perigo`. Tamanhos: padrão (`controle-m`, 40px), `--p` (`controle-p`, 32px, para tabelas e filtros) e `--g` (`controle-g`, 48px, só para a ação final de um fluxo). `--icone` deixa o botão quadrado; nesse caso dê um `aria-label`. Largura: `--bloco` ocupa a linha sempre; `--bloco-celular` só abaixo de 768px (no computador fica do tamanho do texto, à direita, em `.mb-grupo-botoes--fim`).

**O consumidor fornece:** um `<button type="button">` (ou `<a>` quando navega), o texto em verbo no infinitivo + objeto, e opcionalmente um `<svg class="mb-icone">` antes do texto.

**Aparência:** `raio-sm` (8px), a mesma altura e o mesmo arredondamento dos campos. Primário e perigo usam `sombra-botao` (some ao pressionar); secundário, `sombra-campo`; discreto é plano. No celular todo botão tem pelo menos 44px de altura (`controle-toque`).

**Movimento:** o primário sobe 1px no hover (`mov-botao-y`) e todo botão encolhe 3% ao toque (`mov-pressao`), em `mov-rapido`. Com movimento reduzido, nada se move.

**Vermelho como ação principal (preferência da pessoa):** com `data-acao="marca"` no `<html>` (padrão do módulo ou escolha em Minha conta → `Aparencia`), o primário vira `acao-marca` (#e11119, texto branco a 4,89:1, hover `acao-marca-hover`, brilho `sombra-botao-marca`) e o `--perigo` passa ao grafite (`acao-grafite`, texto `sobre-acao-grafite`, hover `acao-grafite-hover`), para a tela ter um só vermelho. Nada mais muda: secundário, discreto, abas e seleção ficam iguais. Sem o modificador, o primário é grafite e o perigo é `erro`.

**Estados:** `disabled` (ou `aria-disabled="true"` em links) reduz a opacidade; `aria-busy="true"` mostra o giro e troca o texto por um gerúndio (“Calculando…”). O foco de teclado é o anel `foco` global.

**Faça**
- Um `--primario` por tela ou por diálogo. Se há duas ações importantes, a segunda é `--secundario`.
- Rótulos concretos: “Enviar para aprovação”, “Gerar contrato”, “Salvar rascunho”.
- `--perigo` só para ações destrutivas e sempre com confirmação em `Dialogo`. Como a cor dele muda com a preferência (vermelho com o botão principal grafite, grafite com o principal vermelho), o verbo do rótulo é que diz o que acontece: “Cancelar proposta”, “Descartar lead”.

**Não faça**
- Pintar um botão de `marca` à mão: o vermelho de ação só existe pelo modificador, nunca por botão.
- Mais de um primário vermelho por tela.
- Primário vermelho de largura inteira no computador: o vermelho é um botão, nunca um bloco.
- “OK”, “Sim”, “Clique aqui”.
- Ícone sozinho sem `aria-label`.
