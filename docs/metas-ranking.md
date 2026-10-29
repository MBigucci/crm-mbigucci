# Metas e ranking

> Fonte: conversa com o Felipe em 28/10/2026. Construído em 29/10/2026: as regras de tela e cálculo estão em `docs/vendas-metas.md`.

## Metas

- **Meta anual de VGV: R$ 10.000.000 por corretor**, com acompanhamento constante: acumulado, quanto falta, ritmo necessário por mês e projeção.
- O corretor **cria metas próprias**, como no CRM da Bruna.
  - Cada meta tem métrica, período (mês, trimestre, ano ou personalizado), valor e a opção "mostrar no painel".
  - Não pode haver duas metas da mesma métrica para o mesmo período.
  - Referência no código da Bruna: `ref/CRM Bruna/src/components/performance/goals-section.tsx`, `goal-dialog.tsx` e `src/lib/performance`.

### Como ficou (29/10/2026)

- **Meta anual:** o gerente geral define o valor geral do ano e, se quiser, um valor por corretor (`/metas/`, permissão `metas.definir_vgv`). Sem nada definido, vale R$ 10.000.000.
- **Acumulado:** VGV das vendas **assinadas e pagas**, no mês da assinatura (`docs/pontuacao-verba.md`). O assinado com pendentes aparece ao lado.
- **Ritmo:** o que falta por mês até dezembro, contando o mês atual. **Projeção:** no ritmo atual, a partir de abril.
- **Onde:** no "Meu painel" do corretor, no relatório do corretor e na tabela da equipe do painel do gerente, e em `/metas/`.
- **Metas próprias:** leads cadastrados, primeiros contatos, visitas realizadas, vendas e VGV; mês, trimestre, semestre, ano ou personalizado, como na Bruna; aparecem na lista do dia; sem duplicar métrica e período; progresso calculado pelos dados.

## Ranking

- É um **ranking de pontos**, não de VGV, **visível para todos os corretores da empresa**.
- Como os pontos fazem parte do programa de verba, o ranking só aparece quando a chave "Programa de verba ativo" for ligada, depois da reunião de novembro de 2026 (ver `docs/pontuacao-verba.md`).
- **Construído em 29/10/2026:** tela `/ranking/` com os pontos aprovados do mês (com o limite de cada critério), pela função `ranking_pontos(mes)`. O gerente geral vê sempre; os demais usuários ativos, só com a chave ligada. Detalhes em `docs/pontuacao-verba.md`, seção "Como ficou".
