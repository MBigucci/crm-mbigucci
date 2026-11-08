# RelatorioDoNumero

Todo número de painel que conta registros **abre a lista dele** (Vendas: o número clicável do painel; Dashboard: o relatório analítico). Uma peça só para os dois.

**Indicador clicável:** o `Indicador` vira `<a class="mb-indicador">` (ou `<button>`) com `.mb-indicador__abrir` (“Ver a lista →”). No hover sobe 4px como os cards. **O zero não abre:** `aria-disabled="true"`, sem hover e sem “Ver a lista”.

**O relatório:** abre no `PainelLateral --larga` (880px; no celular, a folha que sobe), com:
- título = o rótulo do indicador; descrição = o recorte (“Contratos vendidos em novembro · Base360 Repasse”);
- `Exportar` no topo, ao lado do X;
- `.mb-relatorio__origem`: de onde vem o número e com qual filtro (“Origem: Base360 Repasse · mesmo filtro do indicador · atualizado às 20:19”), para o número da lista bater com o do cartão;
- busca; `.mb-relatorio__resumo` (Registros · VGV do período); a `TabelaCompleta` com a linha que abre o registro.

**Regras:** o resumo do painel é o mesmo número do indicador (se não bater, a origem explica). Dados de cliente só para quem tem acesso a eles.

**Não faça**
- Abrir o relatório numa página nova sem o caminho de volta.
- Número clicável que leva a uma lista com outro filtro.
