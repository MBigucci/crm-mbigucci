# Pontuação, verba de leads, premiação e roleta

> Fontes: `docs/fontes/regras-comerciais-2026-10.md` (o documento original do Felipe) e a conversa de 28/10/2026.
> **! Não publicar o CRM com estas telas antes da reunião de novembro.** Os textos das telas do programa (pontos, verba, ranking, roleta) estão no código do site, e qualquer pessoa baixa os arquivos de `out/`. O banco protege os dados, mas não o código.
>
> **Sumário:** Contexto · Pontuação → verba · Lançamentos · Premiação por VGV · Roleta · Como ficou (29/10/2026): telas, banco, decisões, o que cada perfil vê, SQL, testes e o que veio da Bruna.
>
> **Sigilo:** a verba por corretor, os pontos que viram verba e o corte dos leads do Google só serão anunciados na reunião de novembro de 2026. Até lá, nada disso aparece para corretores, gerentes ou especialistas. As telas ficam atrás da chave "Programa de verba ativo", que só o gerente geral liga.

## Contexto

A MBigucci sai do tráfego pago centralizado (roleta de leads do Google) e passa a dar uma verba mensal a cada corretor, que impulsiona os próprios anúncios. A verba vem dos pontos.

## Pontuação → verba de leads (mensal)

| Critério | Pontos | Limite no mês | Máximo |
| --- | --- | --- | --- |
| Período integral cumprido (9h–14h ou 14h–19h) | 5 | 24 períodos | 120 |
| Vídeo com a marca MBigucci | 5 | 8 vídeos | 40 |
| Visita **realizada** | 10 | 12 visitas | 120 |
| **Total possível** | | | **280** |

Regras:
- **1 ponto = R$ 10** de verba.
- A verba e a premiação calculadas em um mês são **liberadas no mês seguinte**.
- A venda conta no **mês da assinatura**. A MBigucci não fecha o mês sem assinar a venda.
- **Mínimo:** 130 pontos. Abaixo disso, a verba é R$ 0.
- **Teto sem venda:** 200 pontos (R$ 2.000).
- A **1ª venda assinada e paga do mês** destrava os pontos de 201 a 280 (até R$ 2.800).
- **Cada venda** assinada e paga soma **R$ 1.000** de verba extra, mas só para quem atingiu os 130 pontos. A venda não substitui os demais critérios.
- Só contam visitas **realizadas**.
- **Sem regra de primeiro mês** (decisão do Felipe, 29/10/2026): o documento original previa R$ 1.000 fixos no primeiro mês, mas o que o corretor faz no primeiro mês já conta para a verba do segundo. O CRM não tem essa regra em lugar nenhum.

Cálculo, que vai virar uma função testada com todos os exemplos do documento original:

```
pontos = min(períodos,24)*5 + min(vídeos,8)*5 + min(visitas_realizadas,12)*10
se pontos < 130            → verba = 0
senão se vendas_mes = 0    → verba = min(pontos,200)*10
senão                      → verba = min(pontos,280)*10 + vendas_mes*1000
```

Exemplos do documento original, que precisam bater:

| Perfil | Pontos | Verba |
| --- | --- | --- |
| Só frequência completa | 120 | Nada |
| Frequência completa + 2 vídeos | 130 | R$ 1.300 |
| Frequência completa + 8 vídeos + 4 visitas | 200 | R$ 2.000 |
| Sem frequência: 8 vídeos + 9 visitas | 130 | R$ 1.300 |
| Sem frequência: 8 vídeos + 12 visitas | 160 | R$ 1.600 |
| Tudo completo, sem venda | 280 (limitado a 200) | R$ 2.000 |
| Tudo completo + 1 venda | 280 | R$ 2.800 + R$ 1.000 = R$ 3.800 |

## Lançamentos de pontos

- O gerente geral, o operacional, o gerente e a recepção lançam pontos. **Só contam depois que o gerente geral aprova.**
- Cada lançamento guarda: o corretor, o critério, a data, a quantidade, quem lançou, o comprovante (foto ou link), o status e quem aprovou.
- Como o lançamento vira dinheiro, cada alteração fica registrada: quem fez, quando e o que mudou.

## Premiação mensal por VGV (dinheiro)

| VGV no mês | Prêmio |
| --- | --- |
| R$ 1.000.000 | R$ 2.000 |
| R$ 1.500.000 | R$ 3.000 |
| R$ 2.000.000 | R$ 5.000 |
| R$ 3.000.000 ou mais | R$ 10.000 |

Vale só a faixa mais alta atingida (não acumula), e só contam vendas **assinadas e pagas**. A premiação também é liberada no mês seguinte.

**Construído em 29/10/2026** (`docs/vendas-metas.md`, seção 6): a tabela de faixas é configurável e o cálculo por corretor e mês fica na tela Faixas de VGV, só do gerente geral. Os textos da tela vêm de `app_settings`, e o código do site não cita a premiação.

## Roleta do fim de semana

- Entra na roleta quem cumpriu **6 períodos completos na semana**. Os períodos são 9h–14h (manhã) e 14h–19h (tarde).
- Quem não cumpriu os 6 períodos pode ir ao plantão se tiver **visita agendada**, mas fica fora da roleta.
- A saída para fazer visita durante o período é comprovada com foto para a recepcionista, para o corretor não perder o período.
- Os períodos lançados para a pontuação já dão ao CRM o que ele precisa para mostrar quem está apto.
- Quem registra os períodos no dia a dia é a **Recepção**, na tela Plantão (ver `docs/acessos-perfis.md` e a seção abaixo).

## Como ficou (29/10/2026)

Construído atrás da chave `programa_verba_ativo`, desligada. Decisão do Felipe, no pedido desta etapa: o CRM só é entregue em novembro, depois da reunião, então as telas podem existir agora. **Não publique o CRM com estas telas antes da reunião de novembro:** os textos estão no código do site.

### Telas

| Tela | Quem vê | O que faz |
| --- | --- | --- |
| **Pontos** (`/programa/`) | Só o gerente geral, sempre | Resumo do mês por corretor: períodos, vídeos, visitas, pendentes, pontos (com o limite e o teto), vendas pagas, verba prevista e prêmio da faixa de VGV (liga com a tela Faixas de VGV). Fechamento do mês e edição dos critérios. |
| **Aprovar lançamentos** (`/programa/aprovacao/`) | Só o gerente geral | Fila com filtros por situação, corretor, critério e semana. Aprovar e recusar um a um ou em lote (a recusa pede motivo), com Desfazer, e "Voltar para pendente". |
| **Plantão** (`/plantao/`) | Gerente geral; com a chave ligada, quem tem `plantao.registrar` (recepção) ou `lancamentos.registrar` (gerente) | O dia, no celular ou no tablet: cada corretor com manhã (9h–14h) e tarde (14h–19h). "Cumpriu o período" e "Saiu para visita" (com o link da foto) geram lançamentos pendentes, com Desfazer. Roleta da semana. Lançar vídeos (com `lancamentos.registrar`). |
| **Meus pontos** (`/meus-pontos/`) | O corretor, só com a chave ligada | Pontos aprovados do mês por critério, o que falta para o mínimo, a verba prevista (liberada no mês seguinte) e a verba do mês passado já fechada. |
| **Ranking** (`/ranking/`) | Gerente geral; com a chave ligada, todo usuário ativo | Pontos aprovados no mês, com os limites, do maior para o menor. Empate fica na mesma posição. |

### Banco (`crm/supabase/schema.sql`, seção "Programa de pontuação e verba")

- **`criterios_pontos`:** período, vídeo e visita, com pontos, limite no mês e máximo (pontos × limite, calculado). O gerente geral edita nome, pontos e limite.
- **`lancamentos_pontos`:** corretor, critério, data, turno (manhã ou tarde), quantidade (só o vídeo passa de 1), comprovante (link), saída para visita, observação, visita de origem, status (pendente, aprovado, recusado ou cancelado), motivo da recusa, quem lançou e quando, quem decidiu e quando.
  - Um período por corretor, dia e turno (`lancamentos_periodo_unico`, sem contar recusados e cancelados).
  - A visita realizada com baixa entra sozinha como pendente (gatilho `visita_lanca_pontos`), uma vez por visita. A correção que tira a visita de realizada cancela o lançamento; a que volta reativa. As visitas realizadas antes do SQL entram uma vez.
  - **Auditoria:** `lancamentos_pontos_historico` grava a criação e cada mudança de status, motivo, comprovante e decisão, com o autor. Só o gatilho escreve; só o gerente geral lê.
- **`fechamentos_verba`:** a foto do mês por corretor (pontos, pontos válidos, vendas, VGV, verba, prêmio), gravada pelo gerente geral. Fechar de novo substitui a foto.
- **Funções:** `programa_estado()` (o app monta o menu; quem não é gerente geral só sabe se está ligada), `plantao_corretores()`, `ranking_pontos(mes)` e `private.ve_programa()`.
- **Permissões novas**, com descrição neutra porque o catálogo é lido por todos: `plantao.registrar` (recepção e operacional) e `lancamentos.registrar` (gerente e operacional). O padrão entra só na criação.

### Regras decididas na construção

- **Cálculo:** função pura `calcularVerba` em `crm/src/lib/programa.ts`, com os 7 exemplos em `programa.test.ts`. O mínimo, os tetos, o valor do ponto e o valor por venda são os do documento; os pontos e limites de cada critério vêm do banco.
- **Primeiro mês:** sem regra própria. Os pontos dele viram a verba liberada no segundo mês, como em qualquer outro.
- **Liberação:** a verba e o prêmio de um mês aparecem como liberados no mês seguinte. O fechamento é manual, pelo gerente geral.
- **Roleta:** 6 períodos **aprovados** de segunda a sexta. Cada período é meio dia (segunda manhã, segunda tarde e assim por diante), então são até 10 na semana e 6 equivalem a 3 dias inteiros, em qualquer combinação. A tela mostra também os pendentes, para a recepção cobrar a aprovação antes do fim de semana.
- **Quem lança:** sempre para outro corretor, nunca para si. O lançamento nasce pendente. Quem lançou cancela o próprio pendente (o Desfazer da recepção). O gerente lança só para a equipe.
- **Corretor:** vê só os próprios lançamentos **aprovados**, mesmo os da baixa da própria visita.

### O que cada perfil recebe

| Perfil | Chave desligada | Chave ligada |
| --- | --- | --- |
| Gerente geral | Tudo: as cinco telas, todos os lançamentos, a auditoria, o fechamento | Igual |
| Gerente | Nada: sem telas no menu, e o banco devolve zero linhas | Plantão e roleta da equipe, lançar períodos e vídeos da equipe, os lançamentos da equipe, ranking |
| Recepção | Nada | Plantão de todos os corretores, roleta, os períodos de todos, ranking |
| Operacional | Nada | Plantão de todos (`plantao.registrar`); vídeos só de quem vê (precisa de `dados.ver_todos` para todos); ranking |
| Corretor | Nada | Meus pontos (só aprovados), a verba prevista e a do mês fechado, ranking |
| Desativado e visitante | Nada | Nada |

### SQL para o Felipe

Rode o `crm/supabase/schema.sql` inteiro no SQL Editor (é idempotente). Ele cria as tabelas e permissões acima e lança como pendentes as visitas já realizadas. A chave continua desligada. Depois de rodar, os nomes das tabelas aparecem no catálogo da API para quem tem a chave anon (os dados, não).

### Testes

- `npm test`: `programa.test.ts` com os 7 exemplos, os limites, os critérios editados, o teto e o mínimo, a liberação, o resumo do mês, a roleta, o período do dia, os filtros da fila e o empate do ranking.
- `npm run test:banco`: `programa.test.mjs`, perfil a perfil, com a chave desligada (nenhum dado para quem não é gerente geral) e ligada (cada perfil só o que é dele), lançamento, aprovação só pelo gerente geral, Desfazer, auditoria, visita automática sem duplicar e fechamento.
- Telas conferidas em 375px com o Supabase falso `sqltest/fake-supabase-programa-v7.mjs` (na pasta de notas), gerado da v6.

### O que veio do CRM da Bruna

| Da Bruna | Como ficou aqui |
| --- | --- |
| Sequência de dias (`computeStreak`, `StreakCard` em `components/performance/cards.tsx`) | **Adaptado** na roleta: em vez da sequência de dias de atendimento, a contagem de períodos aprovados na semana, com "faltam N". |
| Configurações da equipe em `app_settings` (`lib/app-settings.ts`) | **Adaptado:** a chave fica em `app_settings` (só o gerente geral lê) e chega aos demais pela função `programa_estado()`, que só diz se está ligada. Os critérios ficam numa tabela, porque o corretor precisa lê-los com a chave ligada. |
| Página Desempenho (`app/desempenho`) com cards de número grande | **Adaptado** em Meus pontos: número grande da verba, barra até o mínimo e um card por critério. |
| Desfazer em vez de confirmar | **Igual** ao que o CRM já usa (`AvisoDesfazer`): marcar período, aprovar e recusar. |
| Pontos, aprovação, fechamento, ranking | **Não existe na Bruna** (2 usuários, sem equipes). Construído do zero. |
