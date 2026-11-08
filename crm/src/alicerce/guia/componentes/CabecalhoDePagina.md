# CabecalhoDePagina

O topo de cada tela: onde estou (trilha), o que é (título) e o que posso fazer (ações).

**Estrutura:** `<header class="mb-cabecalho">` com `.mb-cabecalho__texto` — `<ol class="mb-trilha">` (último item com `aria-current="page"`), `<h1 class="titulo-tela">` e `.mb-cabecalho__subtitulo` opcional — e um `.mb-grupo-botoes` à direita.

**O consumidor fornece:** a trilha a partir da área do menu, um título que identifica o registro (“Proposta P-2611-014”, não “Detalhes”), um subtítulo com o contexto que o funcionário precisa conferir antes de agir, e até duas ações (a principal por último, à direita).

**Faça**
- Um `h1` por tela, em `titulo-tela`.
- Datas e identificadores no subtítulo, em formato brasileiro.

**Não faça**
- Repetir no título o nome do sistema (“Sistema de Propostas — Propostas”).
- Mais de duas ações no cabeçalho; as demais vão em um menu “Mais ações” ou dentro do conteúdo.
