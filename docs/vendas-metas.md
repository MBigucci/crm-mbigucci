# Vendas e metas

> Construído em 29/10/2026: itens 12 e o resto do 11 de `docs/referencia-crm-bruna.md` (seção 14). As regras de origem são de `docs/metas-ranking.md` (meta anual e metas próprias) e de `docs/pontuacao-verba.md` (venda no mês da assinatura, só assinada e paga, premiação por faixas). A estrutura técnica está em `docs/crm-arquitetura.md`, e o painel em `docs/painel.md`.

## Sumário
1. Venda
2. Correção, cancelamento e histórico
3. Meta anual de VGV
4. Metas próprias do corretor
5. Conversão por origem e campanha
6. Faixas de VGV do mês (só o gerente geral)
7. Quem vê e quem faz
8. Telas
9. Decisões para o Felipe revisar
10. Testes

## 1. Venda

- **O que guarda:** lead, corretor, empreendimento, unidade (opcional), VGV, data da assinatura, pagamento (pendente ou pago, com a data), observação, quem registrou e quando. Tabela `vendas`.
- **Quem registra:** o corretor dono do lead, pela ficha, em "Venda" → "+ Registrar venda". O gerente não vende (`docs/acessos-perfis.md`). Escolher a etapa "Venda" na ficha abre o mesmo registro: a etapa Venda só vem da venda registrada, e o banco recusa a troca à mão (`leads_venda_guard`).
- **Efeito no lead:** registrar leva o lead à etapa Venda, como evento automático. O registro vai para o histórico (`lead_eventos`, tipo `venda`).
- **Mês da venda:** é o mês da **assinatura**. Uma venda assinada em 31/10 e paga em 05/11 conta em outubro.
- **Duas visões do VGV:**
  - **Assinado:** todas as vendas assinadas e não canceladas.
  - **Assinado e pago:** o VGV **válido**, o que conta para a meta e para as faixas.
- **Pagamento:** o corretor (ou o gerente) toca em "Marcar como paga" e escolhe a data. Pendente → pago não pede motivo, porque é o andamento normal. O histórico guarda quem marcou e quando.
- **Datas:** assinatura e pagamento até hoje, nunca no futuro. São datas (dia de São Paulo), não horários.
- **Vários imóveis:** um lead pode ter mais de uma venda.
- **Sem comissão nem recebimento:** como decidido em `docs/referencia-crm-bruna.md` (seção 10).

## 2. Correção, cancelamento e histórico

- **Quem corrige:** quem tem a permissão `vendas.corrigir_equipe` (o gerente, no padrão, e o gerente geral), nas vendas que ele vê. O corretor não corrige a própria venda: pede ao gerente.
- **Sempre com motivo:** corrigir dados, voltar o pagamento para pendente, cancelar e reativar passam pela função `corrigir_venda(venda, campos, motivo)`. Sem motivo, o banco recusa.
- **Sem exclusão física:** a venda é **cancelada** com motivo. Ela fica na lista ("Ver as canceladas") e sai das contas. Se era a única venda ativa do lead, ele volta para Proposta. Reativar devolve o lead a Venda.
- **Histórico na ficha** (`lead_eventos` com `venda_id`):
  - "✓ Venda registrada: Marco Zero One, Apto 52 · R$ 480.000"
  - "✓ Venda paga" ou "! Pagamento da venda voltou para pendente. Motivo: …"
  - "Venda corrigida: VGV R$ 480.000 → R$ 500.000; Unidade Apto 52 → Apto 53. Motivo: …"
  - "✕ Venda cancelada. Motivo: …" e "Venda reativada. Motivo: …"
- **Carimbos:** `registrada_por`, `cancelada_por`, `cancelada_em` e o motivo do cancelamento são gravados pelo banco. O app não escreve neles.

## 3. Meta anual de VGV

- **Valor:** R$ 10.000.000 por corretor, no padrão. O gerente geral (permissão `metas.definir_vgv`, que só ele tem no padrão) define em `/metas/`:
  - o **valor geral** do ano, que vale para todos;
  - um **valor por corretor**, que substitui o geral só para ele ("Usar o valor geral" desfaz).
- **Ordem:** o valor do corretor, senão o geral do ano, senão o padrão (`metaAnualDe`).
- **Acompanhamento** (`progressoAnual`), no cartão do corretor e na tabela do gerente:
  - **Acumulado:** VGV assinado e pago no ano, pelo mês da assinatura. O assinado com pendentes aparece ao lado.
  - **Falta** e **% atingido** (duas casas, arredondado para baixo: "49,25%").
  - **Ritmo necessário por mês até dezembro:** o que falta dividido pelos meses que restam, **contando o mês atual** (em outubro, 3).
  - **Projeção no ritmo atual:** acumulado ÷ parte do ano já passada. Só aparece depois de 1/4 do ano (abril) e com alguma venda paga, como na Bruna.
- **Onde aparece:** no "Meu painel" do corretor (sempre, no topo), no relatório do corretor que o gerente abre, na tabela "Meta anual de VGV" do painel da equipe e em `/metas/`.

## 4. Metas próprias do corretor

- **Como as da Bruna:** métrica, período, valor e "Mostrar no painel". Tabela `metas`. O corretor cria, edita e exclui as dele em `/metas/`; excluir tem Desfazer.
- **Métricas:**
  - **Leads cadastrados:** os que ele mesmo cadastrou no período.
  - **Primeiros contatos:** leads que saíram de Novo com ele no período (evento de etapa de "novo").
  - **Visitas realizadas:** com baixa de realizada, pela data da visita.
  - **Vendas** e **VGV:** assinadas e pagas, no mês da assinatura. O assinado com pendentes aparece como nota.
- **Períodos:** mês, trimestre e ano atuais, ou personalizado (mês de início e de 1 a 24 meses).
- **Sem duplicar:** uma meta por métrica e período (no personalizado, pelo mesmo início e duração). O banco garante (`metas_sem_duplicar`) e a tela avisa antes.
- **Progresso:** calculado pelos dados, nunca digitado. As frases de ritmo seguem a Bruna: "Faltam 2 vendas.", "No ritmo atual você fecha o mês com 5.", "Cerca de R$ 160.000 por semana até o fim.". A projeção só aparece depois de 1/4 do período e quando diz algo novo.
- **No painel:** as metas marcadas aparecem no "Meu painel" e no relatório do corretor que o gerente abre. O gerente só vê, não altera.

## 5. Conversão por origem e campanha

- **Onde:** no painel da equipe (soma da equipe) e no relatório de cada corretor, para o período escolhido.
- **Conta:** dos leads que **entraram na carteira no período** (o mesmo grupo do funil), por origem: leads, primeiro contato, visita realizada e venda, até hoje, com a taxa sobre os leads, e os descartados por motivo. Cada número abre a lista dos leads. Função `conversaoPorOrigem` em `crm/src/lib/painel.ts`.
- **Campanha:** dentro de cada origem, uma linha por campanha ("Sem campanha" por último). Aparece só para quem tem a permissão **`painel.campanha`**:
  - no padrão, o **corretor** (vê as campanhas dos próprios leads, que ele mesmo digitou);
  - o **gerente não** tem no padrão, porque `docs/gerentes-necessidades.md` registra que o campo campanha fica fora do painel do gerente enquanto a chave "Programa de verba ativo" estiver desligada. O gerente geral liga em Configurações → Permissões quando quiser.
- **Lead perdido:** o corretor que perdeu não vê mais o lead; ele conta como origem Empresa.

## 6. Faixas de VGV do mês (só o gerente geral)

- **Sigilo:** é a premiação mensal por VGV de `docs/pontuacao-verba.md`. Fica numa tela só do gerente geral, `/faixas/` (menu "Faixas de VGV"), protegida por regra fixa no banco (`is_gerente_geral()`), sem permissão no catálogo, porque a tabela `permissions` é legível por todos.
- **Código público neutro:** o título, a descrição e o nome da coluna de valor vêm de `app_settings` (chave `faixas_vgv`), que só o gerente geral lê. O código do site fala só em "faixas de VGV" e "valor". A tela de Configurações mostra só as chaves de ligar e desligar.
- **Tabela de faixas** (`faixas_vgv`): "VGV no mês a partir de" e o valor. O padrão entra só na primeira vez: R$ 1.000.000 → R$ 2.000; R$ 1.500.000 → R$ 3.000; R$ 2.000.000 → R$ 5.000; R$ 3.000.000 → R$ 10.000. O gerente geral cria, altera e exclui faixas na tela.
- **Cálculo** (`faixasDoMes` em `crm/src/lib/faixas.ts`): por corretor, o VGV das vendas **assinadas no mês e pagas**; vale só a **faixa mais alta** atingida (não acumula). A tela mostra também o assinado com pendentes e o mês de liberação (o seguinte).
- **Nada para corretor nem gerente:** sem premiação, verba, pontos nem ranking em nenhuma outra tela. O build é conferido com grep (seção 10).

## 7. Quem vê e quem faz

| Perfil | Vê | Faz |
| --- | --- | --- |
| Corretor | As próprias vendas, a própria meta anual, as próprias metas, a conversão dos próprios leads com campanha | Registra venda nos próprios leads, marca como paga, cria e altera as próprias metas |
| Gerente | Vendas, metas anuais, metas próprias e conversão (sem campanha) dos corretores da equipe | Marca como paga, corrige, cancela e reativa as vendas da equipe, com motivo |
| Gerente geral | Tudo, e a tela Faixas de VGV | Tudo do gerente em qualquer equipe, define a meta anual (geral e por corretor) e as faixas |
| Recepção, operacional, especialista | Nada de vendas e metas | Nada |

O RLS de `vendas`, `metas` e `metas_vgv` (por corretor) usa `pode_ver_dados_de`. O valor geral da meta anual é lido por todo usuário ativo.

## 8. Telas

- **Ficha do lead:** card "Venda" depois das visitas, com as vendas do lead e "+ Registrar venda".
- **`/vendas/`:** "Minhas vendas" ou "Vendas da equipe", por mês ou ano da assinatura (no endereço, `?p=ano&d=2026`), filtro por corretor para quem vê a equipe, os três totais (assinado e pago, assinado com pendentes, pagamento pendente) e os cards com as ações.
- **`/metas/`:** cartão da meta anual (corretor) ou tabela por corretor (gerente), "Definir a meta anual de VGV" (gerente geral) e as metas próprias (corretor), com o ano no endereço (`?a=2026`).
- **Painel:** no "Meu painel" e no relatório do corretor, o cartão da meta anual, as metas marcadas, a conversão por origem e as vendas do período. No painel da equipe, a conversão, as vendas do período por corretor e a meta anual por corretor. A impressão leva as tabelas e o cartão; as metas próprias ficam fora do papel.
- **Início do gerente:** atalhos para Vendas e Metas. Menu: "Vendas" e "Metas" para quem vê leads; "Faixas de VGV" só para o gerente geral.

## 9. Decisões para o Felipe revisar

Tomadas nesta etapa por falta de regra escrita; todas mudam por permissão ou por uma linha de SQL.

- **Quem marca como paga:** o corretor e o gerente, sem motivo, com o autor no histórico. Se preferir que só o gerente marque, basta tirar do corretor (regra no `vendas_guard`).
- **Correção só pelo gerente:** o corretor não corrige a própria venda, nem logo depois de registrar.
- **Cancelar a última venda** devolve o lead a Proposta.
- **Campanha no painel:** corretor sim, gerente não (seção 5). O pedido dos gerentes por campanha fica a um clique em Permissões.
- **A meta anual usa o VGV pago;** o assinado aparece ao lado. As metas próprias de venda e VGV também.

## 10. Testes

- `npm test` (`crm/src/lib/vendas.test.ts` e `painel.test.ts`): as duas visões do VGV, mês da assinatura (assinada em outubro e paga em novembro conta em outubro), formatos, textos do histórico, meta anual (do corretor, geral, padrão), acumulado, falta, %, ritmo por mês com o mês atual, projeção só depois de 1/4 do ano, ano encerrado e futuro, períodos e progresso das metas próprias, frases de ritmo, meta repetida, faixas (só a mais alta, só pagas, mês seguinte) e conversão por origem e campanha.
- `npm run test:banco` (`crm/supabase/testes/vendas.test.mjs`): o schema roda de novo com vendas gravadas; padrões das permissões só na criação e nada sigiloso no catálogo; registrar (só o dono, lead ativo, sem data futura, gerente não); etapa Venda só pelo registro; leitura por perfil; pagar sem motivo e o resto só com motivo; correção auditável com antes e depois; cancelar e reativar sem apagar; meta anual e metas próprias por perfil; faixas e os textos delas só para o gerente geral.
- **Build:** `grep -riE "verba|ranking|pontua|premia|prêmio|roleta"` no `out/` encontra só "menu de três pontos" (instrução do Chrome em `/conta`).
- **Telas em 375px:** ficha (registrar venda pela etapa), `/vendas/` (corretor e gerente, correção com motivo), `/metas/` (corretor e gerente geral), painel (corretor e equipe) e `/faixas/`, sem rolagem lateral da página, com o Supabase falso `fake-supabase-vendas-v6.mjs` da pasta de notas.
