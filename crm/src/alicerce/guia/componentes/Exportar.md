# Exportar

Levar para fora o que está na tela: botão `--secundario --p` “Exportar” no topo da lista, da tabela ou do relatório, com um popup (`MenuDaConta` → `.mb-popup--abaixo`).

**Opções, nesta ordem:** Planilha (Excel), CSV, PDF e, depois de um divisor, Imprimir. O título do popup diz **o que** vai sair: “18 leads · com os filtros aplicados”.

**Regras:**
- Exporta exatamente o que a tela mostra: os mesmos filtros, a mesma ordem, as mesmas colunas. Sem limite escondido de linhas; se houver, diga antes (“As primeiras 1.000 linhas”).
- Valores em formato brasileiro e números como número na planilha (R$ como moeda, datas como data).
- Dados de cliente só para quem já os vê na tela. CPF e telefone saem só onde a tela mostra.
- O nome do arquivo diz o que é e quando: `leads-equipe-rudge-ramos-2026-11-06.xlsx`.
- Imprimir usa o `@media print` do Alicerce: A4, preto e branco legível, sem menu nem botões.

**Faça**
- Mostrar o `Toast` de sucesso quando o arquivo estiver pronto, se demorar mais de um segundo.

**Não faça**
- Exportar em segundo plano sem avisar o que foi exportado.
