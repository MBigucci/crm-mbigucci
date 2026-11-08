# ListaDeOpcoes

As listas que a própria empresa mantém e que alimentam os selects do sistema: origens e mídias do lead, motivos de descarte, mensagens prontas, tipologias, bancos, tipos de pendência do Repasse. Uma peça só para todos esses catálogos.

**Estrutura** (`ul.mb-catalogo` dentro de um `Cartao`; a descrição diz **onde a lista aparece** e o que desativar faz)
- Cada linha (`.mb-catalogo__item`): a alça (`.mb-catalogo__alca`, arrastar), **o nome editável na própria linha** (parece texto; ganha borda no hover e no foco), **quanto é usada** (“1.284 leads”), o `Interruptor` Ativa/Inativa e as setas ↑ ↓ (a ordem pelo teclado e no celular).
- Inativa: o nome em `texto-sutil` e o interruptor desligado; continua na lista e nos registros antigos.
- **Remover** só aparece no que nunca foi usado (no lugar da contagem) e confirma na linha (`ConfirmarNaLinha`). O que já foi usado se desativa: apagar mudaria o histórico.
- A última linha (`--nova`) é o campo “Nova origem” com **Adicionar** (Enter também adiciona).

**Salvar:** cada mudança salva sozinha, com `.mb-salvo` no cabeçalho do cartão (“✓ Salvo às 15:08”). Renomear vale para os registros antigos também (é a mesma opção); o histórico guarda o nome anterior.

**Código:** `MB.catalogo.ligar(lista)`: setas, arrastar pela alça, interruptores e adicionar (de `<template data-mb-opcao>`); anuncia a posição nova e dispara `mb-catalogo` com a ordem.

**Não faça**
- Excluir opção usada.
- Ordem alfabética forçada: a ordem é a de uso, decidida por quem mantém a lista.
- Uma tela diferente para cada catálogo.
