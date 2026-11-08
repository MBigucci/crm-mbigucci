# Tabela

Listagens de CRM, propostas, unidades, contratos e boletos no padrão de alta densidade (inspirado no Shopify Polaris): compactas, só com divisores horizontais e números perfeitamente alinhados.

**Estrutura:** `.mb-tabela-envoltorio` > `<table class="mb-tabela">` com `thead`, `tbody` e `tfoot` opcional para totais. Dentro de um `Cartao`, coloque o envoltório como filho direto do cartão: ele perde borda, raio e sombra próprios (sem caixa dentro de caixa). Acima, `.mb-tabela-barra` para filtros (`.mb-filtro`); abaixo, `.mb-tabela-rodape` com contagem e `.mb-paginacao`.

**Densidade:** linhas de `linha-tabela` (36px), cabeçalho de `linha-cabecalho` (32px), texto `corpo-compacto` (13px), células com 12px de padding lateral e 16px nas colunas das pontas. `--densa` reduz para `linha-tabela-densa` (32px) — tabelas de vendas com centenas de unidades e relatórios do ERP. Uma segunda informação (`.mb-tabela__secundario`, 12px) faz a linha crescer sozinha.

**Cabeçalho:** estilo `cabecalho-tabela` — 11px, peso 600, MAIÚSCULAS, espaçamento 0,06em, cor `texto-sutil`, sobre `superficie-sutil`. Um passo menor que as células, para o dado vir primeiro.

**Números:** `.mb-tabela__num` alinha à direita com algarismos tabulares da Inter (estilo `dado`): valores, áreas, percentuais e datas. O símbolo da moeda vai em `<span class="mb-valor__moeda">R$</span>` (um tom abaixo) para o olho ler o número. Códigos que se conferem caractere a caractere (proposta, contrato, unidade, CPF) vão em `.mb-codigo`, em Geist Mono (`dado-codigo`).

**Divisores:** só horizontais, 1px em `linha`. Nunca linhas verticais.

**Variantes e estados:** `--listrada` (zebrado em `superficie-sutil`, para tabelas largas lidas linha a linha, como o Tabelão); linha selecionada com `aria-selected="true"` (fundo `areia`); unidade vendida com `.mb-tabela--vendida` na `<tr>`.

**O consumidor fornece:** `<th scope="col">` com nomes curtos, os dados já formatados em pt-BR (`MB.formatar.moeda`, `.data`, `.area`) e a ordenação.

**Faça**
- Números, áreas e datas à direita; texto à esquerda; status em `Selo` e andamento em `Esteira`.
- Uma ação por linha, no máximo (“Abrir”, botão discreto de 28px no computador, 44px no celular); o resto vai para dentro do registro.
- No celular, a tabela rola dentro do próprio quadro com a primeira coluna fixa (`.mb-tabela--primeira-fixa`); links e ações da linha crescem para 44px. Para listas de trabalho do corretor, prefira cards (`CardLead`).
- Cabeçalho fixo ao rolar (já vem com `position: sticky`).

**Não faça**
- Bordas verticais ou caixas em volta de células.
- Cores de fundo por status na linha inteira — o selo basta.
- Abreviar valores em tabelas (“R$ 2,1 mi”): na tabela o número é exato; o compacto é só para `Indicador`.
- Fonte mono em valores monetários: ela alarga a coluna sem ganhar alinhamento — a Inter tabular já alinha.
