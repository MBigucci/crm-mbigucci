# Painel da equipe e lead perdido

> Construído em 29/10/2026 a partir dos pedidos dos gerentes (`docs/gerentes-necessidades.md`, itens 1 a 3 de "Onde entra") e do item 11 de `docs/referencia-crm-bruna.md`. As regras do lead estão em `docs/leads.md`, e os perfis em `docs/acessos-perfis.md`.

## 1. Lead perdido

Decisão do Felipe (29/10/2026): **lead perdido** é o lead da empresa que o corretor não atendeu no prazo de 15 min (`docs/leads.md`, seção 4). No sistema antigo, ele era roletado para outro. Aqui é um botão do gerente, porque os leads da empresa serão poucos.

- **Onde:** na ficha, no card de atribuição, só para quem tem `leads.atribuir` e só no lead da empresa, ativo, em "novo" e com "! Prazo estourado". O card diz quem vai constar como quem perdeu e que o prazo recomeça para quem recebe.
- **Ação principal:** escolher o corretor e tocar em "Lead perdido: passar para outro corretor". Abaixo fica "Só atribuir, sem contar como perdido", para o caso de o corretor estar de folga, por exemplo.
- **No banco:** a função `lead_perdido(lead, corretor)` confere tudo de novo (permissão, lead visível, origem empresa, ativo, em "novo", prazo estourado pelo `horario_atendimento`, outro corretor) e troca o dono. A troca passa pelo `leads_guard` (`pode_atribuir_a`: corretor ativo da equipe, ou qualquer equipe para o gerente geral) e recomeça o prazo (`atribuido_em`).
- **Motivo:** quem grava é o gatilho `lead_registra_eventos`. O evento de troca de dono sai com `detalhe = 'perdido'`, `de` = quem perdeu, `para` = quem recebeu e o gerente como autor. O app nunca escreve em `lead_eventos`, e a reatribuição comum continua sem motivo.
- **Prazo no banco:** `private.fim_do_prazo` faz a mesma conta de `fimDoPrazo` (`crm/src/lib/prazo.ts`), na hora de São Paulo. Se o horário mudar, os dois lados seguem a tabela.
- **Histórico da ficha:** "! Lead perdido por Carla. Passado para Diego".
- **Depois:** aparece o "✓ Lead perdido registrado e repassado" e o botão "Avisar Diego no WhatsApp" (`docs/leads.md`, seção 10).

## 2. Painel

Endereço `/painel/`, no menu como "Painel" e no início do gerente como atalho. O gerente vê **Painel da equipe**; o corretor vê **Meu painel**, só com os números dele. O RLS decide o que cada um vê, como em Leads. Gerente geral com mais de uma equipe escolhe a equipe.

- **Períodos:** dia, semana (segunda a domingo) e mês, com "← Anterior", "Seguinte →" e "Voltar para hoje". O padrão é a semana. O período fica no endereço (`?p=semana&d=2026-10-29`), então o link pode ser guardado. A conta usa a hora do aparelho (São Paulo).
- **Tabela "Leads no período, por corretor":** recebidos da empresa, perdidos, cadastrados pelo corretor, descartados e vendas, com a linha Equipe.
- **Tabela "Funil até a venda":** dos leads que entraram na carteira no período, quantos chegaram a em contato, visita agendada, visita realizada, proposta e venda.
- **Cadastrados por origem** e **descartados por motivo**, da equipe.
- **Cada número abre a lista dos leads**, com origem, etapa de hoje, com quem está, perdido e motivo do descarte. O nome abre a ficha. Zero não abre.
- **Relatório do corretor:** o nome do corretor na tabela abre `?c=<id>`, com os cinco números grandes, origem, motivos, funil com a taxa sobre os que entraram e a lista de todos os leads do período.

## 3. Como cada número é contado

Tudo sai de `lead_eventos` (`montarPainel` em `crm/src/lib/painel.ts`, com testes). O corretor de cada número é quem tinha o lead naquele momento.

| Número | Conta |
| --- | --- |
| Recebidos da empresa | Lead de origem "empresa" que entrou na carteira dele no período, no cadastro do gerente ou numa reatribuição |
| Perdidos | Trocas de dono com o motivo "perdido" no período, pelo corretor que perdeu (função `leads_perdidos`) |
| Cadastrados pelo corretor | Leads que ele mesmo cadastrou no período, fora a origem "empresa". "Captado pelo corretor" aparece só como a origem do lead |
| Descartados | Lead cujo último status no período é "descartado", pelo motivo. Descartar e desfazer no mesmo período não conta |
| Vendas | Lead cuja última etapa no período é "venda", qualquer que seja a data de entrada |
| Funil | Leads que entraram na carteira no período e a maior etapa que alcançaram com ele, até hoje. Quem pula de "novo" para "proposta" conta em todas as etapas até a proposta. "Aguardando lançamento" conta como em contato |

- **O lead que o corretor perdeu** já está na carteira de outro, e o RLS esconde o histórico dele. Por isso `leads_perdidos` devolve também `recebido_em`, e o painel conta o lead como recebido por quem perdeu quando ele chegou no período.
- **Origem:** vale a origem de hoje do lead.
- **Lead que saiu da equipe** (o gerente geral passou para outra) some do painel do gerente antigo, porque ele deixa de ver o lead.
- **Leads antigos:** o histórico começou em 29/10/2026. Antes disso só existe o evento "Lead cadastrado".

## 4. Impressão

O botão "Imprimir" abre a impressão do navegador. No papel saem o título ("Painel da equipe" ou "Relatório de Carla Souza"), o período e a data e hora da impressão. O menu, os botões e as barras coloridas somem. O texto fica preto no branco, com 16px no mínimo, as tabelas com borda preta e os cards sem quebra no meio. O relatório do corretor imprime a lista de todos os leads do período, para o gerente mostrar ao corretor.

## 5. Visitas

A tabela "Visitas no período, por corretor" (agendadas, realizadas, não compareceu e aguardando baixa) e os mesmos números no relatório do corretor contam pela data da visita, direto da tabela `visitas` (`contarVisitas` em `crm/src/lib/visitas.ts`). Regras em `docs/visitas.md`.

## 6. Sigilo

O painel não mostra campanha, verba, pontos nem ranking, e o campo campanha fica fora da conta (`docs/pontuacao-verba.md`). A "conversão por origem e campanha" do item 11 da Bruna entrou só por origem. A conta por campanha volta a ser avaliada depois da reunião de novembro. O tempo médio de resposta e o ticket médio também ficaram de fora.

## 7. Testes

- `npm test`: períodos (semana de segunda a domingo, rótulos, anterior e seguinte) e os números do painel (recebidos, perdidos, cadastrados por origem, descartes com Desfazer, funil com saída da carteira, lead perdido que o corretor não vê mais, soma da equipe).
- `npm run test:banco`: `fim_do_prazo` igual ao do app (fora do horário, sexta para segunda), `lead_perdido` (só gerente, só lead da empresa com prazo estourado, só dentro da equipe, motivo gravado pelo gatilho, prazo recomeça, troca comum sem motivo) e `leads_perdidos` por perfil.
