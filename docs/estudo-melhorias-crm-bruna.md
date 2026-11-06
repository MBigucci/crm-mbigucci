# Estudo: melhorias para o CRM da Bruna a partir do Base360 Vendas

Brief: `docs/codex-melhorias-crm-bruna.md` (06/11/2026). O estudo é só leitura: nenhum código foi alterado em nenhum dos dois repositórios. A decisão é do Felipe e da Bruna.

## Sumário
1. Critério e fonte
2. Inventário do CRM da Bruna hoje
3. O que ela já tem (não precisa trazer)
4. O que fica fora (não serve a uma pessoa só)
5. Candidatos, item a item
6. O que a sessão dela respondeu
7. Ordem recomendada
8. Perguntas ao Felipe

## 1. Critério e fonte

- **Critério:** a melhoria serve a **uma corretora sozinha**, sem equipe, gerente, perfis, roleta, recepção, parcerias, pontos, verba, ranking ou painel de equipe.
- **Fonte do CRM da Bruna:** `C:\Projects\CRM Bruna`, lido em `v4` (`efd3f9b`, 25/09/2026). O `origin/main` (`338221b`, 26/10/2026) tem os mesmos arquivos de telas e regras. Os caminhos abaixo são relativos a `src/`.
- **Esforço no CRM dela:** **P** até meia sessão, **M** uma sessão, **G** duas ou mais.
  - O tamanho é medido no jeito dela, não no do Base360. As regras dela rodam no aparelho (`lib/store.tsx`, `lib/followup.ts`), e a gravação passa pelo `CloudSync` (`lib/cloud.ts`).
  - Um campo novo no lead mexe em `lib/types.ts`, no mapeamento de `lib/cloud.ts`, em `supabase/schema.sql` e em `lib/mock-data.ts`.
  - O que no Base360 é gatilho do banco vira regra no aparelho, o que basta para duas pessoas com acesso total.

## 2. Inventário do CRM da Bruna hoje

**Stack:** Next.js 15 na Vercel, com rotas de API para push e importação, Supabase com RLS única ("usuário logado vê tudo"), Realtime, bucket privado de documentos e modo demonstração sem banco. São dois usuários, a Bruna e o Felipe, com os mesmos dados. O visual é o design system Bruna Muniz Homes: creme, chocolate e terracota, com fontes serifadas.

**Telas** (`app/`):

| Tela | O que tem |
| --- | --- |
| Painel do Dia (`page.tsx`) | Saudação, leads novos sem contato, follow-ups com ações em 1 toque ("Sem resposta" incluído), metas marcadas, números do mês e agenda |
| Funil (`funil/page.tsx`) | Kanban com arrastar e tabela com ordenação, incluindo a de mais tempo sem contato |
| Agenda (`agenda/page.tsx`) | Semana com visitas, "Próximos passos" em ordem de urgência e agendar visita escolhendo o cliente |
| Imóveis (`imoveis/page.tsx`) | Catálogo por condomínio, cadastro e importação por IA, colando a resposta ou um `.json` |
| Vendas (`vendas/page.tsx`) | Vendas com comissão e desconto em % ou R$, recebido e status |
| Desempenho (`desempenho/page.tsx`) | Prazo de 15 min, sequência de dias em dia, metas por período e conversão por origem |

**Partes que valem para todas as telas:**
- **Ficha do cliente** (`components/lead/`): três abas, Histórico, Perfil & Match e Dados & Docs. No cabeçalho ficam WhatsApp, Mensagens e Ligar, além do aviso "N dias sem contato · tentativa n/3" com "Sem resposta (+1)".
- **Novo lead** (`components/new-lead-dialog.tsx`): Cadastro Mágico com prévia por campo, tags de perfil opcionais, aviso de duplicado e "Avisar no WhatsApp".
- **Outros:** busca global (`search-dialog.tsx`), sino com alertas (`alerts-panel.tsx`) e Conta e dados (`account-dialog.tsx`), com notificações por aparelho.

**Dados** (`lib/types.ts`):
- **Lead:** origem, interesse, etapa (10 etapas), tentativas, motivo de perda, valor, perfil de busca, dados pessoais, interações, documentos e imóveis ligados.
- **Imóvel**, **Visita** (agendada, realizada ou cancelada) e **Venda**.
- **Metas e horário de atendimento** ficam em `app_settings`.

**Regras principais:**
- **Follow-up** (`lib/followup.ts`): 2 dias sem interação viram follow-up atrasado, com limite de 3 tentativas.
- **Prazo de 15 min** no horário de atendimento (`lib/performance.ts`).
- **Histórico de etapas:** é lido do texto das interações ("Etapa: X → Y").
- **Exclusão:** apaga de vez lead, venda e imóvel, com `window.confirm`.

**Próximos passos do README dela:** um service worker para abrir offline, com notificações de follow-up no celular.

## 3. O que ela já tem (não precisa trazer)

Boa parte da lista de exemplos do brief **nasceu no CRM dela** e foi adaptada no Base360:

| Recurso do Base360 | No CRM dela |
| --- | --- |
| Prazo de 15 min no horário de atendimento | ✓ `lib/performance.ts`, para todo lead novo |
| Metas próprias com período e ritmo | ✓ `components/performance/goal-dialog.tsx` e `goals-section.tsx`, inclusive de comissão |
| Conversão por origem | ✓ `components/performance/conversion-section.tsx` |
| Avisos no celular | ✓ Lead novo, resumo das 9h e lembrete de visita (`lib/push.ts`, `app/api/push/*`) |
| Catálogo e importação de tabela por IA | ✓ Foi ela quem criou (`components/property-import-dialog.tsx`, `public/importar-imoveis.md`) |
| Radar de Match e clientes compatíveis | ✓ `lib/match.ts` |
| Sem resposta em 1 toque, contando tentativas | ✓ Na ficha, no Painel e na Agenda |
| Mensagem original do Cadastro Mágico | ✓ `components/lead/history-tab.tsx` |
| Id gerado no aparelho contra duplicados | ✓ `uid()` com `crypto.randomUUID` (`lib/utils.ts`). O `CloudSync` grava por upsert e guarda pendências offline, então repetir a gravação não duplica |
| Confirmar visita pelo WhatsApp | ✓ Modelo `confirmacao_visita` (`lib/templates.ts`) |
| Desfazer no aviso | ✓ Mudança de etapa, cancelamento de visita e meta |
| Busca tolerante e agendar pela Agenda | ✓ `search-dialog.tsx` e `components/agenda/lead-picker.tsx` |

## 4. O que fica fora (não serve a uma pessoa só)

O que depende de equipe, gerente, perfis e permissões, roleta, recepção do stand, parcerias, pontos e verba, ranking, painel da equipe, relatório do corretor para o gerente, "Lead perdido", avisos de equipe, duplicado entre carteiras e venda dividida entre vendedores.

Ficam fora também o que é só da MBigucci: os atalhos do cabeçalho (Simulador, Site, Linktree), o logo Base360, as faixas de VGV, a meta anual da empresa e o catálogo próprio de torres.

## 5. Candidatos, item a item

Legenda do estado no CRM dela: ✕ não tem, ! tem diferente.

### 5.1 Próximo contato com dia e hora ✕
- **O que é:** cada interação termina com o próximo contato marcado, com dia e hora. A tela inicial separa Atrasados, Hoje e Sem próximo contato, e o aviso no celular sai na hora marcada ("Hora do contato · Ana Souza. Marcado para 14h."). O "Sem contato há N dias" continua no card, para o lead com data longe não sumir.
- **De onde vem:** `docs/leads.md`, seções 2, 3 e 5; `crm/src/lib/followup.ts` e `crm/src/lib/leads.ts`; o aviso `contato` em `docs/notificacoes.md`, seção 3. Foi o pedido mais repetido da pesquisa com os corretores (T1).
- **Por que serve a uma pessoa só:** é a agenda de retornos de quem trabalha sozinha. Hoje ela só sabe que alguém está "há 2 dias sem contato", sem o "ligar quinta às 18h" que o cliente pediu.
- **Esforço: M a G, num pacote só com o 5.2.**
  - Um campo novo e opcional no lead: tipos, `cloud.ts`, schema e dados de exemplo.
  - O campo no registro da interação e os grupos no Painel e na Agenda.
  - O motor: `followUpDue` em `lib/followup.ts`, e a Sequência e a métrica de contatos em `lib/performance.ts`, que tem 37 testes.
  - A mesma regra duplicada no `push_due` do resumo das 9h.
  - Um tipo novo de aviso no banco e em `lib/push.ts`.
- **Risco: médio.** Conflita com a regra dos 2 dias, que hoje é o coração do follow-up dela. A recomendação era somar as duas regras. O Felipe decidiu **substituir** (seção 8, decisão 1): toda interação pede a data. Para não virar burocracia, o campo vem com atalhos (amanhã 10h, +2 dias).
- **Sessão dela:** é o que mais dói. A regra fixa de 2 dias e 3 tentativas é o atrito maior e a base de qualquer cadência ou prospecção.

### 5.2 Toque separado da conversa e "Detalhe o contato" !
- **O que é:** tocar em Abrir no WhatsApp ou em Ligar grava só um registro automático ("Abriu o WhatsApp", "Ligou"), um por tipo por dia. Esse registro tira o lead de "novo" e encerra o prazo de 15 min, mas **não** zera os dias sem contato nem as tentativas. O lead fica em "Detalhe o contato" até ela registrar como foi.
- **De onde vem:** `docs/leads.md`, seções 3 e 5 (04/11/2026); `aDetalhar` em `crm/src/lib/followup.ts`.
- **Como é no CRM dela:**
  - `logWhatsApp` (`lib/store.tsx`) grava uma interação cheia, "Conversa aberta no WhatsApp", que conta como contato. **Abrir o WhatsApp e não conversar zera o relógio dos 2 dias**, e o follow-up some sem ter acontecido.
  - O toque leva o lead para "1º contato", conta como atendido no prazo e, com o modelo de follow-up, soma tentativa, sem saber se a mensagem saiu ou se o cliente respondeu.
  - O Ligar (`tel:` em `lead-sheet.tsx`) não grava nada.
- **Por que serve a uma pessoa só:** o número de "dias sem contato" passa a ser verdadeiro. A lista "Detalhe o contato" lembra de anotar o que o cliente disse logo depois da conversa.
- **Esforço: M a G, no pacote do 5.1.** Um tipo novo de interação, a regra de "a detalhar" em `followup.ts`, o início do prazo em `performance.ts` (`firstContactAt` e `slaInfo`), um grupo no Painel e o Ligar gravando também. No mesmo pacote, o Detalhar já abre com o próximo contato.
- **Risco: baixo a médio.** Ela pode gostar do registro automático do jeito que está. Os dados antigos com "Conversa aberta no WhatsApp" continuam contando como contato.
- **Sessão dela:** é a segunda dor. Lembrou que já tentaram contar toda saída de "Lead novo" como primeiro contato, e o Desfazer contava junto. Hoje a saída só vale se não voltar em até 15 min, e a regra nova precisa manter isso.

### 5.3 Rascunho que não se perde ✕
- **O que é:** o formulário (novo lead, interação, perfil, venda) é guardado no aparelho a cada mudança e limpo ao salvar ou ao sair da conta.
- **De onde vem:** `docs/teste-carga.md`, seção 6, item P1; `crm/src/lib/rascunho.ts`.
- **Como é no CRM dela:** o rascunho do novo lead fica só na memória (`useState` em `new-lead-dialog.tsx`). Se o app fecha ou o celular descarrega no meio, perde-se o que foi digitado. A fila offline do `CloudSync` só protege o que já foi salvo.
- **Por que serve a uma pessoa só:** ela cadastra no celular, entre uma ligação e outra.
- **Esforço: P.** Um módulo pequeno com `sessionStorage` e um gancho nos diálogos.
- **Risco: baixo.** Não muda o visual. O cuidado é limpar ao sair da conta, porque são dois usuários no mesmo app.
- **Sessão dela:** não conflita.

### 5.4 Temperatura (quente, morno, frio) ✕
- **O que é:** um toque na ficha, com sinal + palavra + cor, que ordena a tela inicial: quentes primeiro dentro de cada grupo.
- **De onde vem:** `docs/leads.md`, seções 2 e 3. Pedido T4 da pesquisa.
- **Por que serve a uma pessoa só:** com muitos follow-ups no dia, decide por onde começar.
- **Esforço: P.** Cabe no JSON do perfil que já existe, sem migração. Falta o seletor na ficha e no card e a ordem no Painel e no Funil.
- **Risco: baixo.** É mais um campo para manter. Se ela não usar, a lista fica como hoje.
- **Sessão dela:** não pesa no dia a dia; cabe no JSON do perfil, sem migração.

### 5.5 Visita confirmada e "não compareceu" !
- **O que é:** dois estados novos. "✓ Cliente confirmou" vem depois da mensagem de confirmação, e remarcar volta para agendada. "✕ Não compareceu" entra na baixa. No fim do dia sai o aviso no celular "2 visitas aguardando baixa".
- **De onde vem:** `docs/visitas.md`, seções 2 e 3; o aviso `visita` em `docs/notificacoes.md`, seção 3.
- **Como é no CRM dela:**
  - Só agendada, realizada e cancelada (`lib/types.ts`). O cliente que faltou vira "cancelada", e a conversão de visitas fica errada.
  - "Aguardando baixa" já aparece na Agenda e no sino, mas não sai como aviso no celular.
- **Por que serve a uma pessoa só:** ela sabe na véspera quem confirmou e mede quantos clientes faltam.
- **Esforço: P a M.** Tipo, dois botões em `components/agenda/visit-actions.tsx`, as cores e a contagem em `lib/performance.ts`. O aviso do fim do dia é um tipo a mais no cron.
- **Risco: baixo a médio.** O schema tem `check (status in ('agendada', 'realizada', 'cancelada'))` (`supabase/schema.sql`, linha 86). As funções do push filtram `status = 'agendada'` (linhas 390, 423 e 431), então "confirmada" precisa entrar nelas também, ou o lembrete de visita deixa de sair.
- **Sessão dela:** é a quinta dor. A tela de aguardando baixa já existe; faltam o "não compareceu" e o aviso do fim do dia.

### 5.6 Aniversário na tela inicial e mensagem "Parabéns" !
- **O que é:** os aniversários de hoje no topo da lista do dia, no resumo das 9h e com a mensagem pronta "Parabéns".
- **De onde vem:** `docs/leads.md`, seção 17; `docs/notificacoes.md`, seção 3.
- **Como é no CRM dela:** o aviso aparece só dentro da aba Dados & Docs da ficha (`components/lead/personal-tab.tsx`), quando ela abre o cliente.
- **Por que serve a uma pessoa só:** é relacionamento e indicação, o que mais rende para a corretora autônoma.
- **Esforço: P.** Um bloco no Painel, um modelo em `lib/templates.ts` e uma linha no resumo do push. O tipo de aviso novo no banco pode vir com o do 5.1.
- **Risco: baixo.**
- **Sessão dela:** é a quarta dor. Hoje o aniversário só aparece dentro da aba Dados & Docs.

### 5.7 Mensagens prontas editáveis por ela !
- **O que é:** os modelos ficam no banco e são editados numa tela, sem código. Têm variáveis do imóvel (`{endereco}`, `{apresentacao}`, `{a_partir_de}`), e a linha com variável vazia sai da mensagem.
- **De onde vem:** `docs/leads.md`, seção 8; `crm/src/lib/mensagens.ts`.
- **Como é no CRM dela:** 4 modelos fixos em `lib/templates.ts`. Mudar um texto exige alguém mexer no código.
- **Por que serve a uma pessoa só:** ela ajusta o tom e cria modelos novos (pós-visita, aniversário) sozinha.
- **Esforço: M.** Uma chave em `app_settings` (que já sincroniza entre aparelhos) e uma tela de edição.
- **Risco: médio.** O `{opcoes}` dela monta a lista de imóveis e precisa continuar funcionando.
- **Sessão dela:** é a terceira dor. O "Recebi seu contato" não serve para prospecção.

### 5.8 Tema escuro e lateral recolhível !
- **O que é:**
  - **Tema escuro:** tokens claro e escuro com contraste conferido, escolha guardada no aparelho, sem piscar ao abrir e impressão sempre clara.
  - **Lateral recolhível:** a lateral do computador vira só ícones.
- **De onde vem:** `docs/design-system.md` ("Temas do CRM" e "Tema e navegação do CRM"); `docs/revisao-visual.md`, seção "Modo escuro".
- **Como é no CRM dela:**
  - Sem tema escuro: o `themeColor` é fixo em creme.
  - A lateral tem largura fixa de 248 px (`components/app-shell.tsx`).
- **Por que serve a uma pessoa só:** conforto no uso à noite. A lateral recolhida dá mais espaço ao Kanban.
- **Esforço:** tema **M a G** (a paleta creme e chocolate precisa de uma versão escura própria, com contraste conferido); lateral **P**.
- **Risco: alto no tema.** Mexe na identidade Bruna Muniz Homes e em todas as telas. O tema escuro do Base360 não serve como está, porque é de outra marca.
- **Sessão dela:** a marca é só clara (`color-scheme: only light`). O tema escuro conflita com ela e precisaria de aval, por isso **sai da recomendação**. A lateral recolhível não conflita.

### 5.9 Arquivar em vez de excluir, e histórico de etapas à parte !
- **O que é:** o lead descartado continua no banco, com motivo, e pode voltar. O histórico de etapas fica numa tabela própria, em vez de ser lido do texto das interações.
- **De onde vem:** `docs/leads.md`, seções 2 e 6.
- **Como é no CRM dela:**
  - Já existe a etapa "perdido", com motivo.
  - O botão "Excluir lead" apaga de vez, inclusive o histórico.
  - O funil do Desempenho depende de achar "Etapa: X → Y" no texto (`stageChanges` em `lib/performance.ts`), o que quebra se o texto mudar.
- **Por que serve a uma pessoa só:** protege contra exclusão por engano e deixa a conversão mais confiável.
- **Esforço:** esconder ou proteger a exclusão é **P**; histórico de etapas em estrutura própria é **M**, com a migração do que já está no texto.
- **Risco: médio.** Muda um comportamento a que ela está acostumada. A exclusão pode ser útil para lead de teste ou cadastrado errado.
- **Sessão dela:** é a dor menor. O Perdido com motivo já faz o papel de descarte, e "arquivar" se sobrepõe a ele. O que dói é excluir e perder o histórico e as métricas. A tabela de histórico exige migração e reescrever `stageChanges`. **Fica só a proteção da exclusão (P):** sugerir Perdido antes e avisar o que se perde.

### 5.10 Campanha como dado de origem ✕
- **O que é:** quando a origem é anúncio próprio, aparece o campo campanha, digitado por ela. A conversão mostra uma linha por campanha dentro da origem.
- **De onde vem:** `docs/leads.md`, seção 2; `docs/vendas-metas.md`, seção 5.
- **Por que serve a uma pessoa só:** ela mede qual anúncio no Instagram trouxe venda.
- **Esforço: P.** Cabe no campo livre de origem que já existe, sem mudar o banco, mais um agrupamento em `components/performance/conversion-section.tsx`.
- **Risco: baixo.** Só vale se ela anuncia com campanhas distintas.
- **Sessão dela:** cabe sem mudar o banco.

### 5.11 "Sem resposta" dentro de "Como foi" ! (pedido do Felipe, 06/11/2026)
- **O que é:**
  - "Sem resposta" deixa de ser botão solto e vira uma opção de "Como foi", no Registrar interação da ficha.
  - **Só aparece com 2 dias de calendário ou mais desde a última interação detalhada** (sem interação, conta desde o cadastro).
  - Escolhida a opção, o texto "Tentei contato, sem retorno." e o próximo contato daqui a 2 dias, na hora cheia, vêm preenchidos. Os dois podem ser editados.
  - O botão vira "Registrar tentativa n de 3".
  - Trocar para outro tipo devolve o texto e a data de antes.
  - Na 3ª tentativa, a ficha mostra "Descartar: sem retorno".
- **De onde vem:** `docs/leads.md`, seção 5 (04/11/2026); a regra `podeSemResposta` em `crm/src/lib/followup.ts`.
- **Como é no CRM dela:** "Sem resposta (+1)" em 1 toque no Painel, na Agenda ("Próximos passos") e no topo da ficha. Vale a qualquer hora, inclusive logo depois de uma conversa, e grava sem próximo contato.
- **Por que serve a uma pessoa só:** a tentativa só conta quando faz sentido, e cada tentativa já deixa marcado o próximo retorno. Isso combina com a decisão de toda interação pedir o próximo contato.
- **Esforço: P, dentro do pacote 1.** Usa o mesmo diálogo de interação e o mesmo motor. A regra dos 2 dias vira só a condição para mostrar a opção. Os atalhos do Painel e da Agenda saem ou passam a abrir a ficha em "Como foi".
- **Risco: baixo a médio.** Ela perde o atalho de 1 toque na lista. Em troca, a tentativa sempre leva a próxima data.

### Resumo

| # | Melhoria | Estado | Esforço | Risco |
| --- | --- | --- | --- | --- |
| 5.1 + 5.2 | Próximo contato com dia e hora, aviso na hora, toque separado e Detalhe o contato (um pacote) | ✕ / ! | M a G | Médio |
| 5.3 | Rascunho no aparelho | ✕ | P | Baixo |
| 5.4 | Temperatura | ✕ | P | Baixo |
| 5.5 | Visita confirmada e não compareceu, com aviso | ! | P a M | Baixo a médio |
| 5.6 | Aniversário na tela inicial e "Parabéns" | ! | P | Baixo |
| 5.7 | Mensagens editáveis | ! | M | Médio |
| 5.8 | Tema escuro (fora, sem aval da marca) / lateral recolhível | ! | M a G / P | Alto / baixo |
| 5.9 | Proteger a exclusão (o histórico de etapas fica para depois) | ! | P | Baixo |
| 5.10 | Campanha | ✕ | P | Baixo |
| 5.11 | "Sem resposta" dentro de "Como foi", só depois de 2 dias | ! | P (no pacote 1) | Baixo a médio |

## 6. O que a sessão dela respondeu

**Origem da resposta:** a sessão "CRM imobiliário com cadastro inteligente" (`local_e6d730a2`) respondeu em 06/11/2026, só como informação e sem mexer em código. Abaixo vai o resumo. A numeração segue a seção 5 deste estudo.

### O que ela já tem e não estava no inventário
- **Horário de atendimento:** o prazo de 15 min conta só nesse horário, que é configurável (padrão de segunda a sábado, 8h às 20h).
- **Sequência de dias em dia:** dias úteis, de segunda a sexta.
- **Uma regra para todas as telas:** "Próximos passos" na Agenda em ordem de urgência. Painel, sino, Funil e Agenda leem a mesma regra, em `lib/followup.ts`.
- **Visita aguardando baixa:** a visita que passou sem baixa aparece assim na Agenda e no sino. Faltam o aviso no fim do dia e o "não compareceu" (5.5).
- **Confirmar visita:** a confirmação leva a data certa daquela visita.
- **Cadastro:** tags de perfil aprovadas com um toque ou digitadas à mão, e a colagem não confunde empreendimentos de nome parecido.
- **Vendas e metas:** descontos em % ou R$, e metas de comissão bruta e líquida com período personalizado.
- **Também já existem:** "Avisar no WhatsApp" depois de criar o lead e Desfazer ao mudar de etapa.
- **Confirmado:** o histórico de etapas é lido do texto (5.9).

### O que foi tentado e não deu certo
- **Saída de "Lead novo":** contar qualquer saída como primeiro contato fazia o Desfazer contar também. Hoje só vale se a volta não acontecer em até 15 min.
- **Empreendimento pelas 2 primeiras palavras do nome:** confundia empreendimentos de nome parecido.
- **Tags aplicadas sozinhas no perfil:** viraram aprovação.
- **Gravar a lista inteira de metas:** apagava as metas do outro aparelho. Hoje o app lê a versão mais nova antes de gravar.
- **Botões "carregar exemplos" e "apagar base":** foram removidos por serem perigosos.
- **Barra de baixo com 6 itens:** ficou poluída. Hoje são 5, e o Painel virou o logo.
- **Fila semiautomática de follow-up:** o app abre a conversa e ela aperta enviar. Foi proposta e não foi decidida.

### O que mais doeria no dia a dia, em ordem
1. **5.1 Próximo contato com dia e hora.** A regra fixa de 2 dias e 3 tentativas é o atrito maior e a base de qualquer cadência ou prospecção.
2. **5.2 Toque separado da conversa.** Hoje, tocar no WhatsApp leva o lead para "1º contato", conta como atendido no prazo e pode somar tentativa, sem o app saber se a mensagem saiu ou se o cliente respondeu.
3. **5.7 Mensagens editáveis.** O "Recebi seu contato" não serve para prospecção.
4. **5.6 Aniversário**, que hoje só aparece dentro da aba Dados & Docs.
5. **5.5 "Não compareceu".**
6. **5.9 vem por último.** O Perdido com motivo já funciona como descarte. O que dói é excluir e perder o histórico e as métricas.

### O que conflita com o jeito do CRM dela
- **`CloudSync`:** cada aparelho baixa o banco inteiro e compara as linhas.
  - Uma coluna nova precisa ser opcional e só ser enviada quando tiver valor, porque a prévia grava no mesmo banco da produção e o `schema.sql` é rodado à mão.
  - **Temperatura (5.4) e campanha (5.10)** cabem nos campos JSON que já existem (perfil, dados pessoais e o campo livre de origem), **sem migração**.
- **Regras no aparelho (5.1 e 5.2):** mexem no motor.
  - Em `lib/performance.ts`, que tem 37 testes: o início do prazo, a Sequência e a métrica "contatos".
  - Em `lib/followup.ts`: o follow-up vencido.
  - No SQL do resumo das 9h (`push_due`), onde a mesma regra está duplicada.
- **Push (5.1 e 5.6):** os tipos de aviso são fixos no banco. Avisar na hora marcada e no aniversário exige um tipo novo no SQL e em `lib/push.ts`.
- **Tema escuro (5.8):** a marca Bruna Muniz Homes é só clara (`color-scheme: only light`). O tema escuro conflita com a marca e precisa de aval. A lateral recolhível não conflita.
- **Histórico de etapas (5.9):** a tabela própria exige migração e reescrever `stageChanges`. "Arquivar" se sobrepõe ao Perdido.
- **Celular:** a barra de baixo já tem 5 itens. Nada de página nova: o que vier entra no Painel ou na Agenda.
- **Rascunho (5.3):** não conflita.

### O que muda no estudo por causa da resposta
- **5.1 e 5.2 sobem para M a G juntos.** O motor de `performance.ts` e `followup.ts`, os testes e o `push_due` mudam ao mesmo tempo, por isso convém uma sessão só para os dois.
- **5.4 e 5.10 descem para P.** Cabem nos campos JSON que já existem.
- **5.5 fica menor:** a tela de aguardando baixa já existe. Falta o "não compareceu", o "confirmada" e o aviso do fim do dia.
- **5.8, tema escuro:** sai da recomendação até haver aval da marca. A lateral recolhível segue como P opcional.
- **5.9 fica só a proteção da exclusão** (P): sugerir Perdido antes de excluir e avisar que excluir apaga o histórico. A tabela de histórico fica para depois.

## 7. Ordem recomendada

1. **Pacote do motor: 5.1 Próximo contato com dia e hora, junto com 5.2 Toque separado e Detalhe o contato e 5.11 "Sem resposta" dentro de "Como foi" (M a G).**
   - É o que mais dói para ela, e os dois mexem nas mesmas regras e testes.
   - **Regra decidida (Felipe, 06/11/2026):** toda interação pede o próximo contato, e a regra dos 2 dias sai (seção 8, decisão 1).
   - O toque não conta como conversa e deixa o lead em "Detalhe o contato".
   - O aviso "Hora do contato" entra como tipo novo de push.
2. **5.3 Rascunho no aparelho (P).** Não conflita com nada. Pode ir no mesmo pacote, porque o diálogo de interação muda no item 1.
3. **5.7 Mensagens editáveis (M)**, em `app_settings`, com um modelo de prospecção entre os iniciais.
4. **5.6 Aniversário no Painel, no resumo das 9h e com a mensagem "Parabéns" (P).** Aproveita o tipo novo de push do item 1.
5. **5.5 Visita confirmada e não compareceu, com o aviso do fim do dia (P a M).**

**Depois, se houver fôlego:**
- 5.4 Temperatura e 5.10 Campanha (P cada, sem migração);
- descartar no lugar de excluir (5.9, P a M, decisão 4 da seção 8);
- a lateral recolhível (5.8, P).

## 8. Perguntas ao Felipe

### Decisões do Felipe (06/11/2026)
1. **Próximo contato: substituir.** Toda interação pede o próximo contato com dia e hora, como no Base360, e a regra dos 2 dias sai do motor. O pacote 1 fica maior que o estimado na seção 5.1: muda `followUpDue`, a Sequência, a métrica de contatos, os 37 testes e o `push_due`. O "Sem contato há N dias" continua no card, só como informação.
2. **Quem implementa:** a sessão da Bruna, com um brief por pacote escrito a partir deste estudo.
3. **Tema escuro:** não trazer agora. A lateral recolhível segue como opcional pequena.
4. **Excluir lead: trocar por descartar.**
   - Descartar é o mesmo que o Perdido com motivo.
   - O descartado sai das listas, guarda o histórico e as métricas, e pode voltar.
   - Ganha os motivos de lead ruim: contato inválido, duplicado e fora do perfil.
   - Excluir de vez fica escondido, em último caso, para o que não é lead.
5. **Ordem:** como na seção 7, com o descartar no lugar da proteção da exclusão.
6. **"Sem resposta" como no Base360** (pedido do Felipe, 06/11/2026): entra no pacote 1 (seção 5.11).

### Perguntas, como foram feitas

1. **Próximo contato e a regra dos 2 dias:**
   - **Somar:** com data vale a data, sem data vale a regra dos 2 dias (recomendada).
   - **Substituir:** toda interação pede data.
   - **Não trazer.**
2. **Quem implementa:**
   - **A sessão da Bruna**, com um brief por pacote escrito a partir deste estudo (recomendada, porque ela conhece o motor e os testes).
   - **Codex**, com o mesmo brief.
   - **Adiar.**
3. **Tema escuro**, que conflita com a marca Bruna Muniz Homes:
   - **Não trazer agora** (recomendada).
   - **Perguntar à Bruna** se ela quer uma versão escura da marca.
   - **Fazer**, com a paleta escura desenhada antes.
4. **Exclusão de lead:**
   - **Manter, mas sugerir Perdido antes** e avisar que excluir apaga o histórico e as métricas (recomendada).
   - **Trocar por arquivar.**
   - **Deixar como está.**
5. **Ordem da seção 7:**
   - **Aprovar como está** (recomendada).
   - **Começar pelo rascunho e pelo aniversário**, que são P, antes do pacote do motor.
   - **Outra ordem**, combinada com a Bruna.
