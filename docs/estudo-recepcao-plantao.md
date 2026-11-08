# Recepção e Plantão: proposta de uma área comum

**Sumário:** [Recomendação](#recomendação) · [Hoje](#o-que-cada-tela-faz-hoje) · [Cruzamentos](#onde-se-cruzam) · [Proposta A](#proposta-a--área-stand-recomendada) · [Alternativa B](#alternativa-b--duas-entradas-com-atalhos) · [Decisão](#pergunta-para-o-felipe) · [Fontes](#fontes-e-evidências)

08/11/2026 · Bloco 8, somente estudo para decisão do Felipe. Nenhuma tela, rota, permissão ou regra foi migrada.

## Recomendação

**Reunir a navegação em “Stand”, dentro do Vendas, mantendo Atendimento e Períodos e roleta como tarefas separadas.** A recepção encontra o trabalho do dia no mesmo lugar; o gerente entra só nas tarefas que pode executar. Não criar outro módulo nem fundir as gravações.
Entrar na vez, estar no stand e cumprir um período são fatos diferentes. A reorganização visual não deve converter um no outro.

## O que cada tela faz hoje

Permissões são configuráveis; os perfis abaixo são os padrões documentados. O gerente geral tem acesso a tudo. O banco continua limitando as linhas lidas e alteradas.

| Rota | Ações atuais | Quem usa: perfil e permissão | Quando no dia |
| --- | --- | --- | --- |
| `/recepcao/` | Escolher stand do aparelho; montar a vez de corretores e especialistas; Saiu, Voltou, Passar a vez e Não está mais, com Desfazer; registrar Novo, Indicação de corretor, Indicação de parceiro ou Retorno; anunciar quem atende; conferir e corrigir clientes de hoje. | Recepção e operacional: `plantao.atendimentos` abre a tela; `plantao.confirmar` autoriza movimentar a vez. Recepção lê o dia atual; retorno permite busca anterior limitada, sem abrir carteiras. | PC do stand durante todo atendimento; celular de reserva. Pôr na vez: 8h45–9h15 e 13h45–14h15. Antes da vez, atendimento escolhido à mão. |
| `/plantao/` | Mudar dia, buscar corretor; Cumpriu o período ou Saiu para visita com link da foto; desmarcar o próprio pendente e Desfazer; consultar aptidão da roleta semanal. Lançar vídeos e consultar/cancelar os próprios recentes, se autorizado. | `plantao.registrar`: recepção/operacional, períodos de todos os corretores ativos. `lancamentos.registrar`: gerente/operacional, períodos e vídeos dos corretores que vê; gerente, sua equipe. Operacional precisa de `dados.ver_todos` para vídeos de todos. | Conferência dos períodos de manhã (9h–14h) e tarde (14h–19h), registro de saída para visita e revisão de dias anteriores; roleta antes do fim de semana. Não é a fila de atendimento. |
| `/recepcao/relatorio/` | Dia, semana ou mês; anterior/seguinte; um ou todos os stands; totais por tipo, como conheceu, empreendimento, corretor, especialista e parceiro; Imprimir; abrir painel da equipe. | `plantao.atendimentos_ver`: gerente, equipe e clientes dos seus parceiros; operacional, todos os dias/stands quando também tem `plantoes.gerenciar`. Recepção não recebe esse acesso no padrão. | Acompanhamento e fechamento do dia, semana ou mês; sem interferir no atendimento. |
| `/recepcao/stands/` | Criar/renomear/desativar stands e especialistas; indicar stand com especialista; manter Como conheceu; configurar localização/raio dos stands. A lista de especialistas é única. | Operacional: `plantoes.gerenciar`; gerente geral. Especialista cadastrado por nome não é conta de acesso. | Preparação e manutenção; não a cada cliente. Escala de recepcionistas/especialistas permanece fora do CRM. |

Só o gerente geral aprova/recusa lançamentos, em `/programa/aprovacao/`. Tudo que é lançado pelo Plantão nasce pendente; essa aprovação não entra na recepção.
Hoje o menu mostra **Recepção em Rotina** e **Plantão em Gestão**, pelas permissões de abertura acima. Relatório e cadastros são destinos internos; o painel também leva ao relatório.

## Onde se cruzam

| Em comum | Limite que impede fundir os registros |
| --- | --- |
| Mesmos corretores ativos, com equipe; recepção movimenta a vez e confere períodos dessas pessoas. | `/plantao/` lista todos os autorizados, inclusive quem está fora da vez. Não restringir períodos à fila nem dar ao gerente acesso às outras equipes. |
| Mesmos stands na rotina presencial; relatório e atendimento usam `plantoes`. | O lançamento de período **não tem stand**: identifica corretor, data e turno. Não há como filtrar ou atribuir historicamente os períodos por stand sem trabalho de domínio. |
| Mesmo dia e turnos manhã/tarde. | A tarde da vez pode valer a partir de 13h45 se já montada; período da tarde é 14h–19h. Chegar, sair ou voltar não prova cumprimento integral. |
| Presença, saída para visita e pessoas disponíveis importam às duas rotinas. | “Saiu” na vez afeta a disponibilidade para leads da empresa; “Saiu para visita” no Plantão registra evidência para pontos. Não são a mesma operação nem o mesmo Desfazer. |
| A palavra roleta aparece no trabalho do stand. | **Vez do stand** segue a ordem montada pela recepção; **roleta do fim de semana** exige seis períodos aprovados de segunda a sexta. Não recalcular uma pela outra. |

O estudo de 04/11 propôs aproveitar presença para confirmar períodos. Isso não está implementado hoje. Suas referências à chave/sigilo foram superadas: vale a permissão, conforme a nota do próprio estudo. Check-in de distribuição e check-in do gerente também não viram período automaticamente.

## Proposta A — área Stand (recomendada)

**Junta:** uma entrada de menu, identidade de área e navegação local por links: Atendimento · Períodos e roleta · Relatório · Cadastros. Cada pessoa vê apenas os destinos que já pode abrir.
**Separa:** o cadastro de clientes continua junto da vez; períodos, vídeos, aptidão semanal, relatório e manutenção ficam em suas próprias páginas. Vídeos continuam condicionados a `lancamentos.registrar`; aprovação continua fora da área.

**Rotas:** conservar `/recepcao/` (Atendimento), `/plantao/` (Períodos e roleta), `/recepcao/relatorio/` (Relatório) e `/recepcao/stands/` (Cadastros). Nenhuma rota nova, redirecionamento ou troca de endereço; links antigos continuam válidos. São links entre páginas, não abas de um único formulário.
O item **Stand**, em Rotina, abre Atendimento se permitido; senão Períodos e roleta; senão Relatório; senão Cadastros. A página atual mantém Stand marcado em qualquer desses destinos.

| Perfil, no padrão | Menu e destinos locais |
| --- | --- |
| Recepção | Stand → Atendimento; também Períodos e roleta. Sem Relatório, Cadastros ou vídeos. |
| Gerente | Stand → Períodos e roleta, da equipe; também Relatório, limitado à equipe e aos seus parceiros. Não abre Atendimento nem Cadastros. |
| Operacional | Stand → Atendimento; também Períodos e roleta, Relatório e Cadastros, cada qual com seu acesso atual. |
| Gerente geral | Stand → Atendimento, com os quatro destinos. Pontos e Aprovar lançamentos mantêm seus destinos existentes. |
| Corretor | Sem nova entrada Stand; mantém carteira, Fila de leads/check-in quando disponível, Meus pontos e Ranking. |
| Especialista | Sem nova entrada por perfil; é nome na vez, não novo usuário. Se uma conta receber permissões, mostrar somente os destinos autorizados. |

As combinações fora do padrão seguem as permissões, inclusive quem só puder ler o relatório ou manter os cadastros. Os demais itens do menu permanecem como estão.

**Para a recepção:** Atendimento abre primeiro e conserva vez + cadastro lado a lado no PC; no celular, manter acesso rápido ao cadastro. Conferir períodos é outra tarefa a um link, sem apagar cliente em digitação. Não misturar lista de clientes com pontos.
**Para o gerente:** encontra períodos e relatório na mesma área, sem passar pelo balcão nem ganhar ações da recepção. O relatório continua acessível pelo painel.
**Para o operacional:** encontra atendimento, conferência e manutenção na mesma área; não precisa alternar entre Rotina e Gestão. O escopo de cada tarefa deve ficar explícito.

**Riscos e cuidados:**
- “Stand” pode sugerir que os períodos são filtrados pelo stand escolhido. Em Períodos, mostrar “Todos os corretores autorizados” ou “Sua equipe”; não aplicar o filtro do atendimento. Relatório conserva filtro próprio e opção Todos os stands.
- Trocar de tarefa pode perder cadastro em digitação: preservar o rascunho e o retorno ao contexto na futura migração; não prometer esse comportamento como pronto.
- Uma área comum não concede acesso comum: conferir cada destino, cada ação e as linhas retornadas; esconder link não substitui a regra do banco.
- Não automatizar pontos, completar turnos, copiar “Saiu” ou alterar a ordem da vez. A integração entre presença e períodos exige estudo de domínio separado.

## Alternativa B — duas entradas com atalhos

**Junta:** apenas atalhos contextuais entre as tarefas autorizadas e vocabulário consistente para vez e roleta.
**Separa:** mantém Recepção em Rotina e Plantão em Gestão, sem identidade ou navegação local comum; relatório e cadastros continuam ligados à Recepção.
**Rotas:** as mesmas quatro; nenhuma nova. Recepção ganha “Conferir períodos”; Plantão ganha “Abrir atendimento” e “Relatório do stand”, somente se cada destino for permitido.

| Perfil, no padrão | Menu e atalhos |
| --- | --- |
| Recepção | Recepção + Plantão; atalho entre as duas tarefas; sem relatório/cadastros. |
| Gerente | Plantão; atalho para Relatório, também disponível pelo painel. Sem Recepção. |
| Operacional | Recepção + Plantão; atalhos entre tarefas, para Relatório e Cadastros. |
| Gerente geral | Recepção + Plantão e todos os atalhos; demais menus preservados. |
| Corretor / Especialista | Sem nova entrada ou atalho; eventual permissão configurada libera só o destino correspondente. |

**Para a recepção:** menos mudança de hábito, mas continua alternando entre duas áreas. **Para o gerente:** Plantão fica onde está, com caminho direto ao relatório. **Para o operacional:** dois pontos de entrada para a mesma rotina, com menos procura por links.
**Riscos:** preserva a duplicidade de nomes/menu e facilita esquecer uma conferência; também precisa preservar digitação ao navegar. Como em A, os períodos não podem herdar filtro de stand nem gerar pontos pela presença. É a opção de menor mudança de navegação, com menor ganho de organização.

## Pergunta para o Felipe

**Como organizar essa rotina?** **A. Uma área “Stand”, com Atendimento e Períodos e roleta separados (recomendada)** · **B. Manter Recepção e Plantão no menu, com atalhos entre eles**.
Essa decisão é sobre navegação. Não reabre regras já aprovadas, não amplia permissões e não inclui integração automática de presença com pontos.

## Fontes e evidências

- [Recepção: telas, vez, acessos e relatório](recepcao.md), seções 1–5; [estudo anterior](estudo-recepcao.md), seções 4, 6 e 8, lidas com as decisões posteriores.
- [Pontuação: tabela de telas e perfis](pontuacao-verba.md#telas); [acessos e perfis](acessos-perfis.md).
- Código conferido: [Recepção](../crm/src/app/recepcao/page.tsx), [vez](../crm/src/components/recepcao/vez.tsx), [cadastro](../crm/src/components/recepcao/cliente.tsx), [clientes/correções](../crm/src/components/recepcao/clientes-hoje.tsx), [relatório](../crm/src/app/recepcao/relatorio/page.tsx), [cadastros](../crm/src/app/recepcao/stands/page.tsx) e [Plantão](../crm/src/app/plantao/page.tsx).
- Conferidos também [menu atual](../crm/src/components/alicerce/menu.ts), [leituras da Recepção](../crm/src/lib/recepcao-dados.ts), [gravações de pontos](../crm/src/lib/programa-dados.ts), [turnos](../crm/src/lib/programa.ts) e as regras locais de leitura/unicidade no SQL, sem executar banco.
- Esboço apenas como captura: [375px](../crm/local/alicerce-fase2/recepcao-plantao/proposta-stand-375-papel.png) e [1280px](../crm/local/alicerce-fase2/recepcao-plantao/proposta-stand-1280-papel.png); também em grafite na mesma pasta. Não representa tela migrada nem funcionalidade entregue.
- Peças do esboço: [CabecalhoDePagina, linha 5](../crm/src/alicerce/guia/componentes/CabecalhoDePagina.md), [Cartao, linha 5](../crm/src/alicerce/guia/componentes/Cartao.md) e links com [Botao, linhas 5–7](../crm/src/alicerce/guia/componentes/Botao.md). Os destinos são páginas, não abas do mesmo conteúdo.
