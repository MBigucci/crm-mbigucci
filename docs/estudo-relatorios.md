# Estudo: relatórios para o gerente geral, o marketing e os gerentes

> Estudo de 04/11/2026, a pedido do Felipe (decisão 13 de `docs/estudo-recepcao.md`). **Só análise e desenho: nada foi implementado, nenhum outro arquivo do projeto foi alterado.** Sem dados pessoais: os exemplos usam valores inventados.
>
> **Mudança de regra registrada aqui (Felipe, 04/11/2026):** o sigilo de verba, pontos e ranking **acaba**. O CRM só vai ao ar depois que todos souberem das regras novas, e o Felipe escolheu **acabar com a chave "Programa de verba ativo"**. O `CLAUDE.md` e `docs/pontuacao-verba.md` ainda dizem o contrário: a mudança deles e a remoção da chave no código são uma frente própria (seção 7, decisão D1).
>
> **Sumário:** 0. Resposta curta · 1. O que existe hoje · 2. Respostas do Felipe · 3. Os relatórios (R1 a R8) · 4. O que falta no banco · 5. Sigilo e LGPD · 6. Esforço · 7. Decisões e frentes que saem daqui · 8. O que foi conferido e o que não foi

## 0. Resposta curta

- **Hoje:** o painel por equipe (dia, semana, mês, com "Todas" para o gerente geral) e o botão Imprimir. **Não há exportação** de nada, **não há loja** no banco e **não há relatório das visitas do estande**, porque a tela da recepção ainda não existe.
- **Quem lê:**
  - **Felipe**, toda semana e todo mês, na tela "Relatórios" do CRM, com Imprimir e um resumo por aviso no celular;
  - **marketing**, com usuário próprio. Vê os relatórios, a ficha e o histórico de qualquer cliente, só leitura, e baixa **listas filtradas** para remarketing, com registro de quem baixou;
  - **gerentes**, com o resumo da equipe no celular, junto com os totais da empresa, a comparação entre equipes, pontos, verba, ranking e campanhas.
- **Os relatórios:**
  - **R1:** visitas;
  - **R2:** origem e conversão da empresa;
  - **R3:** equipes e corretores;
  - **R4:** parceiros;
  - **R5:** empreendimentos;
  - **R6:** listas de remarketing;
  - **R7:** resumo no celular;
  - **R8:** a base comum (períodos, comparação e impressão).

  **O primeiro é o R1**, que sai junto com a tela da recepção.
- **Visitas, a regra nova:**
  - **agendada** é a visita da Agenda com baixa de realizada, mais a indicação de corretor no estande;
  - **espontânea** é o cliente novo da vez;
  - **de parceiro** fica à parte;
  - o **total** junta as três, e o **retorno** tem linha própria, fora do total;
  - o mesmo cliente, no mesmo dia e com o mesmo corretor, é **uma visita só**.
- **Muda no banco:**
  - as tabelas da recepção;
  - o **canal** no lead da empresa;
  - o **empreendimento só do catálogo**;
  - o **"Comprou"** no cliente de parceiro;
  - o **perfil Marketing**;
  - o **registro das exportações**.
- **Esforço:** cerca de 15 dias de trabalho no total, em etapas. É uma estimativa (seção 6).

## 1. O que existe hoje

| Onde | O que mostra | Limite para o pedido |
| --- | --- | --- |
| **Painel** (`/painel/`, `docs/painel.md`) | Por corretor: recebidos da empresa, perdidos, cadastrados, descartados e vendas. Também: funil até a venda, cadastrados por origem, descartados por motivo, conversão por origem (ticket e ciclo médio), vendas do período, meta anual e visitas da Agenda (agendadas, realizadas, não compareceu). Cada número abre os leads. O gerente geral escolhe uma equipe ou **"Todas"** | Só dia, semana e mês. Sem comparação com o período anterior. Sem loja, empreendimento, canal da empresa nem visitas do estande |
| **Relatório do corretor** (`/painel/?c=`) | Os mesmos números de um corretor, com a lista dos leads | Igual |
| **Campanha** | Linha por campanha na conversão por origem, atrás de `painel.campanha` (só o corretor, no padrão). A campanha é texto livre, pedido só no "Anúncio próprio" | O lead da empresa não tem canal nem campanha |
| **Vendas** (`/vendas/`) e **Metas** (`/metas/`) | VGV assinado e pago, por mês ou ano. Meta anual por corretor | Sem empreendimento agrupado |
| **Ranking** (`/ranking/`, `ranking_pontos`), **Meus pontos**, **Programa** | Pontos e ranking do mês, atrás da chave (`Casca ... programa`, `ve_programa()`) | Abrem quando a chave sair (D1) |
| **Faixas de VGV** (`/faixas/`) | Premiação mensal por VGV | **Não é a chave:** regra fixa no banco, `is_gerente_geral()`, sem permissão no catálogo (`docs/vendas-metas.md`, seção 6). Tirar a chave não abre as faixas para os gerentes (D11) |
| **Impressão** | Painel e relatório do corretor, letra grande, sem cor | Serve de modelo para os relatórios novos |
| **Exportação** | **Nenhuma.** O único download do CRM é o arquivo de instruções da importação de preços | Não existe CSV |
| **Avisos no celular** (`docs/notificacoes.md`) | Push pela Edge Function `avisos`, com agendamento | Não há aviso de resumo |
| **Recepção e estande** | **Não existem.** Desenho em `docs/estudo-recepcao.md`. A planilha atual não tem relatório vivo | Todo relatório "por loja" e de visitas do estande depende dessa etapa |
| **Parcerias** (`parcerias.sql`) | Parceiros, interações, roleta entre gerentes | Ainda sem origem "Parceiro" no lead, sem clientes de parceiro e sem relatório de indicações |
| **Histórico** | `lead_eventos` desde 29/10/2026 | A comparação com o "mesmo período do ano passado" só depois de um ano |

## 2. Respostas do Felipe (04/11/2026)

| # | Pergunta | Resposta |
| --- | --- | --- |
| 1 | Como o marketing recebe os números? | **Usuário próprio**, para ver os relatórios. Pode ver também o **histórico do cliente e os dados pessoais**, para campanhas de remarketing |
| 2 | O marketing está no círculo do sigilo? | **Sim, sabe** |
| 3 | Frequência do Felipe | **Semanal e mensal** |
| 4 | Formato | **Tela no CRM, aviso no celular e botão Imprimir** |
| 5 | O que o marketing faz com os dados | **Baixa listas filtradas** (CSV) para subir como público nas ferramentas de anúncio, com registro de quem baixou e quando |
| 6 | O marketing altera algo? | **Não, só leitura** |
| 7 | Clientes de parceiro nas listas do marketing? | **Sim**, entram como os outros |
| 8 | O aviso no celular vai para quem? | **Felipe, marketing e gerentes** |
| 9 | Períodos | Dia, semana e mês, **mais trimestre, ano e datas livres** |
| 10 | Comparação | **Com o período anterior**, ao lado de cada número |
| 11 | Recortes | **Loja, empreendimento, equipe e corretor, origem e "como conheceu"**, todos |
| 12 | Canal do lead da empresa | **Sim, lista fechada.** O Felipe lembrou que o canal abre outra frente: a **distribuição automática** desses leads para os gerentes ou direto para os corretores (D9) |
| 13 | Qual visita conta na conversão | Duas métricas e uma que junta as duas. **Agendada** é a da Agenda com baixa, e a indicação de corretor no estande é do mesmo tipo. **Espontânea** é a outra |
| 14 | Medir a compra do cliente de parceiro | **Sim**, o gerente marca **"Comprou"** |
| 15 | Empreendimento | **Escolher só do catálogo**, e os textos antigos são ligados uma vez |
| 16 | Prioridade | **Visitas no estande** primeiro |
| 17 | Indicação de parceiro e retorno | **Parceiro em linha à parte. Retorno não soma** no total, tem linha própria |
| 18 | Agenda e recepção, mesmo cliente e mesmo dia | **Conta uma visita** |
| 19 | O resumo dos gerentes | A equipe dele, e **"não deixaria de fora o resto: já falei que não precisa mais desse sigilo."** O resto é: totais da empresa, comparação entre equipes, pontos, verba e ranking, e campanhas dos corretores |
| 20 | Quem entra nas listas de remarketing | **Todos os leads**, com filtro de etapa. O corretor não é avisado |
| 21 | Como registrar o fim do sigilo | **Acabar com a chave** em todo o CRM |

## 3. Os relatórios

Todos ficam numa tela nova, **`/relatorios/`** ("Relatórios" no menu), com a base comum do R8. Cada número abre a lista dos leads, como no painel. As tabelas por corretor podem mostrar a posição, porque o sigilo acabou (D1). O painel da equipe continua como está, e as visitas do estande entram nele também (decisão 13 da recepção).

### R1. Visitas (primeiro)

- **Para:** Felipe e marketing. O gerente vê a parte da equipe no painel.
- **Linhas:**
  - **agendada:** a visita da Agenda com baixa "realizada", mais o atendimento do estande do tipo indicação de corretor;
  - **espontânea:** o atendimento do estande do tipo cliente novo, da vez;
  - **de parceiro:** o atendimento do tipo indicação de parceiro;
  - **total:** a soma das três;
  - **retorno:** linha própria, fora do total;
  - não compareceu e canceladas da Agenda, como hoje.
- **Uma visita só:** quando o mesmo lead tem, no mesmo dia, uma visita realizada na Agenda e um atendimento de indicação no estande com o mesmo corretor. Proposta: fica a do estande, que traz a loja (D12).
- **Recortes:** loja, empreendimento, "como conheceu" (escolha múltipla: um cliente conta em cada marcado, e o total não soma as colunas, como avisa a nota da tabela), equipe, corretor, especialista, parceiro e imobiliária.
- **Conversão em venda:** dos clientes que visitaram no período, quantos têm venda assinada até hoje. Em três linhas: agendada, espontânea, e as duas juntas (um cliente conta uma vez). O parceiro usa o "Comprou" do R4. A venda é sempre a do lead (`vendas.lead_id`), qualquer que seja o corretor.
- **Fontes:**
  - `plantao_atendimentos`, que é nova (`docs/estudo-recepcao.md`, seção 7);
  - `visitas`, `vendas` e `leads`;
  - `parceiro_clientes`, que é nova.
- **Falta:** toda a etapa da recepção. Depois dela, a regra de "uma visita só", feita numa função ou view, com teste.

### R2. Origem e conversão da empresa

- **Para:** Felipe e marketing.
- **O que mostra:** leads que entraram, por **origem**. Dentro de "Empresa", uma linha por **canal**; dentro de "Anúncio próprio", uma linha por **campanha**. Para cada linha: primeiro contato, visita (agendada e espontânea), proposta, venda, taxa, ticket e ciclo médio, e os descartados por motivo, que medem a **qualidade do canal**. Também os perdidos (prazo de 15 min) por canal.
- **É a conversão por origem que já existe** (`conversaoPorOrigem`), com todas as equipes, os períodos novos, o canal e as visitas do estande.
- **Fontes:** `leads`, `lead_eventos`, `vendas`, e as visitas do R1.
- **Falta:**
  - o **canal da empresa** (seção 4);
  - a **campanha visível** para o gerente geral, o marketing e os **gerentes** (resposta 19). Já existe atrás de `painel.campanha`: basta dar a permissão ao perfil Marketing e ao gerente, que hoje não tem no padrão;
  - os períodos novos (R8).

### R3. Equipes e corretores

- **Para:** Felipe e gerentes.
- **O que mostra:**
  - as equipes lado a lado: leads, visitas por tipo, vendas, VGV assinado e pago, meta anual, perdidos e descartes;
  - dentro de cada equipe, os corretores;
  - com a chave fora (D1), também **pontos, verba e a posição no ranking**.
- **Gerente:** vê a própria equipe em detalhe e as outras em totais. Se ele vê ou não os corretores das outras equipes, e a posição deles no ranking geral, está em aberto (D4).
- **Fontes:** o que o painel já calcula; o programa (`lancamentos_pontos`, ranking, faixas).
- **Falta:** a comparação entre equipes numa tela só. O painel faz uma equipe ou "Todas" somadas.

### R4. Parceiros

- **Para:** Felipe, marketing e o gerente dono do parceiro.
- **O que mostra:** por parceiro e por imobiliária:
  - clientes trazidos ao estande;
  - leads com origem "Parceiro" (os que o parceiro passou a um corretor da MBigucci);
  - quantos compraram e o VGV;
  - parceiros novos no período, pela roleta, pelo link ou pela recepção.
- **Fontes:** `parceiros`; `parceiro_clientes` e `plantao_atendimentos` (novas); a origem "Parceiro" no lead (etapa 4 do brief de Parcerias, `docs/codex-parcerias.md`); `vendas`.
- **Falta:**
  - **"Comprou"** no cliente de parceiro, com empreendimento, valor e data, marcado pelo gerente;
  - a origem "Parceiro" e o relatório de indicações do módulo de Parcerias (etapa 5 dele), **ainda não feitos**. O R4 deve ser **o mesmo relatório** da etapa 5, não um segundo.

### R5. Empreendimentos

- **Para:** Felipe e marketing.
- **O que mostra:** por empreendimento do catálogo:
  - leads interessados e de que origem e canal;
  - visitas por tipo;
  - propostas e vendas, com o VGV;
  - descartes por motivo, por exemplo muitos "fora do perfil" num empreendimento.
- **Fontes:** `leads.empreendimento`, `visitas.empreendimento`, `vendas`, `plantao_atendimentos.empreendimento`, `empreendimentos`.
- **Falta:** **ligar ao catálogo.** Hoje os três campos são texto livre, com sugestão. A decisão 15 pede escolher só do catálogo, mais "Outro". Os textos antigos são ligados uma vez, com conferência (seção 4).

### R6. Listas de remarketing (marketing)

- **Para:** marketing e Felipe.
- **Filtros:**
  - período de entrada;
  - origem e canal;
  - empreendimento;
  - etapa;
  - situação (ativo ou descartado, e o motivo);
  - visitou, por tipo;
  - comprou ou não;
  - loja;
  - incluir clientes de parceiro.
- **Na tela:** a contagem e a lista. O nome abre a ficha **só para leitura**, com o histórico.
- **"Baixar lista (CSV)":** nome, WhatsApp, e-mail, empreendimento, origem e etapa. Só os campos que uma ferramenta de público usa: sem anotações e sem documentos. Cada download fica registrado (quem, quando, filtros, quantas linhas), e o Felipe vê o registro.
- **Todos os leads entram**, também os ativos que o corretor está atendendo (resposta 20). O corretor não é avisado.
- **Fontes:** `leads`, `lead_eventos`, `visitas`, `vendas`, `plantao_atendimentos`, `parceiro_clientes`.
- **Falta:** o perfil Marketing, a leitura de todos os leads sem escrita, a função de exportação e a tabela de registro (seção 4). Precisa também do cuidado de LGPD da seção 5.

### R7. Resumo no celular

- **Quando:**
  - **segunda de manhã**, com a semana anterior;
  - **dia 1**, com o mês fechado.

  Proposta: às 8h, horário de São Paulo, a confirmar no mockup (D6).
- **Para quem:**
  - **Felipe:** os totais da empresa (leads, visitas por tipo, vendas e VGV) e a variação sobre o período anterior;
  - **marketing:** o mesmo, com as origens e canais que mais trouxeram;
  - **gerentes:** a equipe dele e os totais da empresa, com a posição da equipe e, com a chave fora, os pontos e a verba dos corretores dele.
- **O aviso traz 2 ou 3 números e o link** para `/relatorios/` no período certo. O detalhe fica na tela.
- **Fontes:** a mesma conta dos relatórios, feita no servidor. A Edge Function de avisos precisa calcular com a chave do servidor, porque não há usuário logado no envio.
- **Falta:** um tipo de aviso novo em `docs/notificacoes.md`, o agendamento (`agendar-avisos.sql`) e uma função de resumo no banco que só a Edge Function chama.

### R8. Base comum

- **Períodos:** dia, semana, mês, **trimestre, ano e datas livres** (de... até...), no endereço como no painel (`?p=trimestre&d=2026-10-01`, `?de=...&ate=...`).
- **Comparação:** cada número com o do período anterior de mesmo tamanho ("42 · antes 35"). Na data livre, o anterior é o intervalo de mesmo número de dias logo antes. Sem gráfico no primeiro corte. Seta só em glifo e texto, sem cor de "bom" ou "ruim", seguindo o DS.
- **Loja:** filtro "Todas" ou uma loja. Vale para o que vem do estande. Lead sem estande fica fora do filtro, com a nota "Leads sem visita no estande não têm loja" (proposta, D13).
- **Imprimir:** o modelo do painel, com o título, o período, a comparação e a data da impressão.
- **Histórico curto:** antes de 29/10/2026 só há o cadastro do lead. Antes do dia da troca da recepção não há visitas do estande. A tela avisa quando o período anterior cai antes disso ("Sem dados para comparar").

## 4. O que falta no banco

| O que | Para | Como (proposta) | Onde mexe |
| --- | --- | --- | --- |
| **Lojas e atendimentos do estande** | R1, R4, R5, R6, R8 | `plantoes`, `plantao_atendimentos`, tipos e "como conheceu", como em `docs/estudo-recepcao.md`, seção 7 | Etapa da recepção |
| **Uma visita por cliente, dia e corretor** | R1 | View ou função que junta `visitas` realizadas e atendimentos do estande de indicação de corretor pelo `lead_id`, dia de São Paulo e corretor | Nova, depois da recepção |
| **Canal do lead da empresa** | R2, R6, D9 | Tabela `lead_canais` (slug, nome, ordem, ativo), editável pelo gerente geral, e `leads.canal` obrigatório quando a origem é "empresa". Lista inicial a aprovar: Facebook/Instagram, Google, site MBigucci, WhatsApp da empresa, RD Station, outro | `schema.sql`, cadastro do lead da empresa |
| **Empreendimento do catálogo** | R5, R1, R6 | `empreendimento_id` (referência a `empreendimentos`, nulo é "Outro") em `leads`, `visitas`, `vendas` e `plantao_atendimentos`, mantendo o texto. Uma rotina liga os textos que casam com um nome do catálogo, e o resto vai para uma lista de conferência do gerente geral | `schema.sql`, formulários de lead, visita e venda |
| **"Comprou" no cliente de parceiro** | R4, R1 | Em `parceiro_clientes`: `comprou_em`, `comprou_empreendimento_id` e `comprou_valor`, marcados pelo gerente dono, com evento no histórico simples | Módulo de Parcerias |
| **Perfil Marketing** | R2, R5, R6, R7 | `roles`: `marketing`. Permissões novas, com descrição neutra: `relatorios.ver` ("Ver os relatórios da empresa"), `leads.ler_todos` ("Ler os leads e o histórico de todas as equipes, sem alterar") e `listas.exportar` ("Baixar listas de clientes"). O marketing também recebe `painel.campanha` | `schema.sql`, RLS |
| **Campanha para o gerente** | R2, R3, R7 | `painel.campanha` passa a ser padrão do gerente (resposta 19). Como o padrão só entra na criação da permissão, o banco que já existe precisa de uma linha em `role_permissions` | `schema.sql` |
| **Leitura sem escrita** | R6 | O RLS de leitura de `leads`, `lead_eventos`, `lead_interacoes`, `visitas`, `vendas` e `parceiro_clientes` aceita `leads.ler_todos`. As políticas de escrita **não** aceitam. Teste por perfil: o marketing tenta alterar e o banco recusa | `schema.sql`, `parcerias.sql`, testes |
| **Registro das exportações** | R6 | `exportacoes` (quem, quando, filtros em JSON, linhas). A função `exportar_lista(filtros)` é `security definer`, confere `listas.exportar`, grava o registro e devolve as linhas. O CSV é montado no navegador | Nova |
| **Resumo para o aviso** | R7 | Função `resumo_periodo(perfil_destino, equipe, de, ate)` chamada só pela Edge Function, com a chave do servidor, e tipo de aviso novo | `functions/avisos`, `agendar-avisos.sql` |
| **Períodos e comparação** | R8 | Só no app: `periodo.ts` ganha trimestre, ano e intervalo livre | `crm/src/lib` |

## 5. Sigilo e LGPD

### Por relatório

| Relatório | O que era sigiloso | Depende de D1 (fim da chave) | Dados pessoais (LGPD) |
| --- | --- | --- | --- |
| R1 Visitas | Nada (a visita como prova de pontos fica no programa, não aqui) | Não | Só na lista que o número abre, para quem já vê os leads |
| R2 Origem e conversão | Campanha dos anúncios próprios; tendência dos leads do Google no canal da empresa | Sim, para o gerente ver campanha e canal | Só na lista que o número abre |
| R3 Equipes e corretores | Pontos, verba, ranking | Sim | Não |
| R4 Parceiros | Nada | Não | Só para o gerente dono e quem já vê o cliente de parceiro |
| R5 Empreendimentos | Nada | Não | Só na lista que o número abre |
| R6 Listas de remarketing | Nada | Não | **Sim:** nome, WhatsApp e e-mail de todos os leads e clientes de parceiro, e a ficha só leitura para o marketing |
| R7 Resumo no celular | Pontos, verba e ranking no aviso do gerente | Sim, na parte do gerente | Não: só números |
| R8 Base comum | Nada | Não | Não |

### Regras

- **Sigilo (decisão do Felipe, 04/11/2026):** acabou. Os relatórios mostram verba, pontos, ranking e campanhas a quem tem permissão. Isso **depende da frente que remove a chave** (D1). Até ela ser feita, quem implementar os relatórios deixa esses números atrás da chave atual, para não publicar nada antes do anúncio.
- **Os textos para corretores** já publicados na pesquisa (`discovery/`) não mudam.
- **LGPD no remarketing:** isto **não é parecer jurídico**. Subir telefone e e-mail de clientes numa ferramenta de anúncio é um tratamento novo dos dados. Antes de a primeira lista sair, o Felipe precisa confirmar com o jurídico ou o encarregado de dados da MBigucci:
  - a base legal;
  - o aviso ao cliente;
  - quanto tempo a lista fica na ferramenta.

  O que o CRM faz a favor:
  - só leitura;
  - só os campos de contato no CSV;
  - registro de cada download;
  - nenhuma anotação nem documento na lista;
  - descartado por "contato inválido" e "duplicado" fora da lista por padrão (proposta, D14).
- **Clientes de parceiro nas listas:** o cliente veio pelo parceiro, e o remarketing da MBigucci pode chegar a ele por fora do parceiro. É um risco de relação com as imobiliárias, que fica registrado para o Felipe (D7).
- **Corretor não avisado:** um cliente em atendimento pode receber anúncio da MBigucci. Isso foi aceito na resposta 20 e fica registrado.

## 6. Esforço

Estimativa em dias de trabalho. É um chute, não uma medição, e não inclui a etapa da recepção (cerca de 12 dias, `docs/estudo-recepcao.md`).

| Etapa | Dias | Depende de |
| --- | --- | --- |
| 0. Mockup de `/relatorios/` (computador e 375px), do R1 e do resumo no celular, parando para o Felipe ver | 1 | – |
| 1. R8, a base comum: períodos novos, comparação, filtro de loja e impressão | 1,5 | – |
| 2. R1 Visitas, com a regra de uma visita só e a conversão em três linhas | 2 | Recepção no banco |
| 3. Canal do lead da empresa e R2 com todas as equipes | 1,5 | – |
| 4. Empreendimento do catálogo: coluna, formulários, rotina de ligação e conferência; depois o R5 | 2 | – |
| 5. R3 Equipes e corretores, com pontos, verba e ranking | 1 | Frente D1 (fim da chave) |
| 6. R4 Parceiros e "Comprou" | 1 | Parcerias etapas 4 e 5, recepção |
| 7. Perfil Marketing, leitura sem escrita e testes por perfil | 1,5 | – |
| 8. R6 Listas e exportação com registro | 2 | Etapa 7 |
| 9. R7 Resumo no celular: função, Edge Function, agendamento e textos | 1,5 | Etapas 1 a 3 |
| **Total** | **cerca de 15 dias** | |

**Ordem sugerida:** 0 → 1 → 2 (logo depois da recepção) → 7 → 3 → 4 → 8 → 6 → 5 → 9. O resumo no celular fica por último porque reaproveita as contas de todos.

## 7. Decisões e frentes que saem daqui

| # | Decisão | Situação |
| --- | --- | --- |
| D1 | **Acabar com a chave "Programa de verba ativo"** e com a regra de sigilo do `CLAUDE.md` e de `docs/pontuacao-verba.md` | Decidido pelo Felipe em 04/11/2026. **Frente própria**, a abrir pela sessão principal: mexe em telas, permissões, `schema.sql` (`ve_programa`, `programa_estado`), no grep do build e nos textos. Não é desta etapa |
| D2 | Lista inicial dos canais da empresa | A aprovar no mockup (proposta na seção 4) |
| D3 | Visita agendada × espontânea × parceiro; retorno fora do total; uma visita por cliente, dia e corretor | Decidido (respostas 13, 17 e 18) |
| D4 | O gerente vê os corretores das outras equipes? | **Decidido em 04/11/2026: ranking geral com todos os corretores** |
| D11 | As **Faixas de VGV** (premiação mensal) aparecem para o gerente? | **Decidido em 04/11/2026: o gerente vê as faixas da própria equipe; só o gerente geral altera as regras.** Muda a regra fixa no banco (`is_gerente_geral()`): etapa própria, fora da frente do fim do sigilo |
| D12 | Na visita repetida (Agenda e estande no mesmo dia), **fica o registro do estande**, porque traz a loja | Proposta |
| D13 | Com uma loja escolhida, R2 e R5 mostram **só os leads que visitaram aquele estande**; os outros somem do filtro, com a nota na tela | Proposta |
| D14 | O CSV deixa de fora, no padrão, os descartados por "contato inválido" e "duplicado" | Proposta |
| D5 | Campos do CSV de remarketing (nome, WhatsApp, e-mail, empreendimento, origem, etapa) | Proposta. Confirmar no mockup |
| D6 | Hora do resumo no celular (proposta: 8h de segunda e do dia 1) | Proposta |
| D7 | Clientes de parceiro nas listas de remarketing | Decidido: sim (resposta 7). O risco com as imobiliárias fica registrado |
| D8 | Base legal do remarketing | **Decidido em 04/11/2026: o Felipe confirma que a MBigucci já tem base legal; pode seguir** |
| D9 | **Distribuição automática dos leads da empresa** por canal, para os gerentes ou direto para os corretores | Ideia do Felipe na resposta 12. **Frente própria**, fora deste estudo. Usa o canal da etapa 3 |
| D10 | O R4 é o relatório de indicações da etapa 5 de Parcerias, não um segundo | Proposta. Combinar com a sessão de Parcerias |

## 8. O que foi conferido e o que não foi

**Conferido nesta sessão:**
- **Documentos:**
  - `CLAUDE.md`;
  - `docs/painel.md`, `docs/vendas-metas.md`, `docs/gerentes-necessidades.md` e `docs/pesquisa-resultados.md`, inteiros;
  - `docs/estudo-recepcao.md`, seções 0 a 3.1, 5 a 8 e 10;
  - `docs/codex-parcerias.md` e `docs/estudo-checkin-plantao.md`, por busca de termos.
- **Código, só leitura:**
  - `crm/supabase/schema.sql`: perfis, permissões, `lead_origens`, `leads`, `visitas`, `teams`, `profiles`, `pode_ver_dados_de`. Não há tabela de loja, e "loja" aparece só como tipo de tipologia;
  - `crm/supabase/parcerias.sql`, por busca: sem origem "Parceiro" e sem clientes de parceiro;
  - `crm/src/app/painel/page.tsx`, por busca: tem o "Todas" para quem tem `dados.ver_todos`;
  - `crm/src/app/ranking/page.tsx`, por busca: atrás da chave (`Casca programa`), e `ranking_pontos` está entre as funções do programa;
  - busca por CSV e Blob em `crm/src`: nenhuma exportação.

**Não conferido:**
- Se as políticas de escrita de `leads` e das tabelas ligadas recusam um perfil que só tem leitura total. Fica para o teste por perfil da etapa 7.
- O custo de calcular os relatórios no navegador com todas as equipes e um ano de dados. O teste de carga (`docs/teste-carga.md`) mediu a gravação, não a leitura agregada. Pode pedir views ou funções agregadas no banco.
- O conteúdo do aviso no celular em 375px e o limite de texto do push.
- O texto de LGPD: as propostas são técnicas, não parecer jurídico.
- As estimativas de esforço são chute.

**Dados pessoais:** nenhum nome, telefone ou e-mail de cliente, corretor ou parceiro foi lido ou copiado para este documento.

**Índice:** o `CLAUDE.md` não foi atualizado, porque este estudo não podia alterar outros arquivos. A sessão principal precisa:
- acrescentar `docs/estudo-relatorios.md` em "Onde encontrar contexto";
- abrir a frente D1, que também muda a "Restrição fixa" de sigilo do `CLAUDE.md`.
