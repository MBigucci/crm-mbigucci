# BarraDeFiltros

Busca e filtros acima de uma lista ou tabela, com os filtros ativos à vista. Uma peça só para Leads, Quadro, Parceiros, Contratos, Relatórios e o Dashboard.

**Estrutura:** `<form class="mb-filtros" role="search">` com:
- `.mb-campo.mb-filtros__busca` (cresce para ocupar a linha) — busca sem acento, em nome, telefone em qualquer formato e código;
- até quatro filtros em `select` (`Campo`), sempre com o substantivo: “Todos os corretores”, “Todas as origens”;
- `.mb-filtros__ativos`: quantos resultados (“18 leads”), cada filtro ativo como `Seletor --p` com ✕ (tocar tira o filtro) e “Limpar filtros”.

Filtros rápidos de um toque (situação com contagem) vão no `Seletor --p`, na `.mb-tabela-barra`.

**Escopo:** `.mb-escopo` acima da barra diz de quem são os dados (“Sua equipe · Rudge Ramos”, “Empresa toda”, “Só os seus”), para o gerente não confundir a visão da equipe com a dele.

**Estado na URL:** busca, filtros e ordem ficam no endereço (`?busca=marco+zero&origem=indicacao`). O link compartilhado abre igual, e o Voltar do navegador volta o filtro.

**No celular:** fica a busca em linha inteira e um botão “Filtros · 2” (com quantos estão ativos) que abre os filtros no `PainelLateral`; os filtros ativos continuam à vista.

**Faça**
- Filtro que zera a lista mostra o `EstadoVazio` com “Limpar filtros”.
- Ordem dos filtros pela frequência de uso.

**Não faça**
- Botão “Filtrar”: o filtro vale ao escolher.
- Mais de quatro filtros visíveis; o resto vai em “Mais filtros” no painel.

**Largura dos filtros:** cada filtro acompanha o texto escolhido, de 150 a 260px (a busca ocupa o resto da linha), para “Todos os empreendimentos” caber inteiro. A contagem (“10 leads”) e o Ordenar por ficam juntos numa linha só, logo abaixo da barra: a contagem à esquerda, o Ordenar à direita, com o rótulo ao lado do campo (“Ordenar por [Próximo contato ▾]”). Nunca o Ordenar sozinho numa linha.
