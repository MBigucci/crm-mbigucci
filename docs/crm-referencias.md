# CRM: referências de mercado e features candidatas ao roadmap

Pesquisa de 04/11/2026, feita a pedido do Felipe pela sessão de Parcerias. **Só propõe: nada aqui está decidido nem implementado.** Parcerias ficam de fora, porque estão em `docs/parcerias-referencias.md`. O esboço visual das 4 propostas mais fortes está em `docs/mockups/crm-ideias.html`. As marcas concorrentes aparecem só neste documento e nunca na interface.

## Sumário

1. [Resposta curta](#1-resposta-curta)
2. [Referências](#2-referências)
3. [O que já temos e onde a referência faz melhor](#3-o-que-já-temos-e-onde-a-referência-faz-melhor)
4. [Propostas priorizadas](#4-propostas-priorizadas)
5. [O que não trazer](#5-o-que-não-trazer)
6. [Perguntas ao Felipe](#6-perguntas-ao-felipe)
7. [O que foi conferido e o que não foi](#7-o-que-foi-conferido-e-o-que-não-foi)

## 1. Resposta curta

- **O CRM já cobre o núcleo** dos CRMs de incorporadora: a distribuição do lead da empresa com prazo, o funil, a agenda de visitas, as mensagens prontas, o catálogo com o match, os avisos no celular, as metas e o painel. A recepção, o check-in, os relatórios e a escala já estão no roadmap (itens 22 a 25).
- **O que as referências têm e nós não temos** cai em quatro grupos:
  1. **Lead parado na etapa:** marcar o lead que está há dias na mesma etapa, mesmo com contato marcado para longe.
  2. **Áudio como anotação:** é o pedido T7 da pesquisa (21% registram por áudio) e ainda está em "ficou de fora".
  3. **Depois da visita e depois da venda:** pesquisa de satisfação e marcos do pós-venda até a entrega das chaves, com o pedido de indicação.
  4. **Avisos para o gerente:** hoje só o corretor recebe aviso.
- **O que os grandes vendem e não serve aqui:** conversas do WhatsApp dentro do CRM, roleta automática de leads, IA que atende pelo WhatsApp, contrato digital e análise de crédito. Ou o Felipe já decidiu contra, ou pede servidor, custo e jurídico (seção 5).
- **Ordem sugerida:** 1. etapa parada · 2. áudio · 3. avisos ao gerente · 4. cadência das tentativas · 5. agendar pela Agenda · 6. pesquisa de satisfação · 7. pós-venda · 8. carteira para retomar. As de 1 a 5 são P ou M e não dependem de dado novo.

## 2. Referências

**Como ler a coluna "Conferido":**
- **Fabricante:** lido na página do produto.
- **Terceiros:** lido em blog, diretório ou notícia.
- **Busca:** só o resumo do buscador, sem abrir a página.
- **Não confirmado:** o recurso não apareceu em material público.

| Produto | O que faz bem | O que serve para a MBigucci | Fonte | Conferido |
| --- | --- | --- | --- | --- |
| CV CRM (Construtor de Vendas), módulo Prospectar | Leads em pipeline com três visões, workflows, tarefas e checklists, histórico com ligações e anotações, entrada do Facebook Ads e do RD Station, integração com chatbots de pré-venda | Confirma o que já temos. O checklist de tarefas por etapa é a ideia da cadência (proposta 4) | [cvcrm.com.br/cv-prospectar](https://cvcrm.com.br/cv-prospectar/) | Fabricante |
| CV CRM, módulo Vender | Mapa de disponibilidade em tempo real "para evitar vendas duplicadas", reserva e proposta com workflow, tabela de preço por empreendimento, simulação de orçamento, assinatura digital, comissão, análise de crédito integrada ao Serasa | O espelho de unidades e a simulação. Os dois dependem de dados que o CRM não tem (perguntas 5 e 7) | [cvcrm.com.br/cv-vender](https://cvcrm.com.br/cv-vender/) | Fabricante |
| CV CRM, módulo Relacionar | Pós-venda: pesquisas de satisfação por e-mail com resultado na hora, portal do cliente (boletos, etapas da obra, chamados), entrega de chaves com automação, assistência técnica, vistorias | A pesquisa de satisfação (proposta 6) e os marcos até as chaves (proposta 7). O portal do cliente não | [cvcrm.com.br/cv-relacionar](https://cvcrm.com.br/cv-relacionar/) · [cvcrm.com.br](https://cvcrm.com.br/) | Fabricante |
| Sienge (blog sobre espelho de vendas) | Espelho que mostra as unidades livres e tira da lista a unidade reservada, para os outros corretores não oferecerem a mesma | Mesmo ponto do CV Vender | [sienge.com.br](https://sienge.com.br/blog/espelho-de-vendas-otimizar-gestao-empresarial/) | Terceiros |
| Hypnobox (incorporadoras, hoje da Senior) | App do corretor: responder mensagens, agendar visitas, organizar tarefas, alertas de lead novo e da agenda. Compromisso só em cliente com corretor atribuído. A carteira é definida pelo corretor responsável na timeline | Confirma a lista do dia e os avisos. O "agendar visita" pelo app é a proposta 5 | [App Store](https://apps.apple.com/sv/app/crm-hypnobox/id1585667351?l=en-GB) · [suporte Senior](https://suporte.senior.com.br/hc/pt-br/articles/40377937044372-Hypnobox-CRM-Clientes-Compromissos-no-Hypnobox) | Busca (o suporte pede login) |
| Imobzi (imobiliárias) | Lead novo vira negócio no funil, é distribuído e o corretor é avisado na hora. WhatsApp, e-mail e telefone num painel só. Assistente que responde sobre os dados do CRM, também por voz | A voz como entrada (proposta 2). O painel único de conversas não (seção 5) | [imobzi.com](https://www.imobzi.com/) | Fabricante |
| Jetimob (imobiliárias) | "Funil, roleta e negociações num lugar só". Agente de IA que faz o primeiro atendimento pelo WhatsApp, 24 horas, e repassa à equipe. App do corretor | Nada novo. A roleta e a IA estão na seção 5 | [jetimob.com](https://www.jetimob.com/) | Fabricante |
| Kenlo (imobiliárias) | Plataforma de IA com SDR e omnichannel. Um número de WhatsApp por imobiliária, com as conversas no CRM | Nada direto. O número único pede mudar o jeito de trabalhar dos corretores (seção 5) | [kenlo.com.br](https://www.kenlo.com.br/) | Fabricante |
| Vista (hoje da Loft) | Agenda de visitas sincronizada com o Google Agenda. Funil com o melhor horário para abordar | A sincronização com o Google Agenda fica de fora (seção 5) | [portal.loft.com.br](https://portal.loft.com.br/crm-para-corretores/) | Terceiros (página da Loft) |
| Loft, simulador por WhatsApp (25/07/2024) | O corretor manda o valor por texto ou áudio e recebe em PDF a simulação com as condições de vários bancos | Mostra que a simulação é serviço de terceiros (pergunta 7) | [portal.loft.com.br](https://portal.loft.com.br/?p=60878) | Fabricante |
| Morada.ai, assistente MIA (incorporadoras) | IA no WhatsApp, também por voz, que apresenta o imóvel, simula parcelas, coleta documentos, agenda a visita e passa ao corretor. Diz atender quase 200 incorporadoras | Confirma o áudio como canal real. A IA atendente fica de fora (seção 5) | [Exame, 06/08/2025](https://exame.com/inteligencia-artificial/na-classe-d-e-e-morada-usa-ia-para-explicar-o-financiamento-da-casa-propria-a-quem-nao-sabe-ler/) · [Diário do Comércio](https://diariodocomercio.com.br/negocios/morada-ai-17-milhoes-mercado-imobiliario/) | Terceiros |
| Apto (hub com mais de 40 CRMs) | Descreve o padrão do setor: roleta entre time próprio e parceiros, chat imediato, agenda com réguas de relacionamento por e-mail, ligação e WhatsApp, integração com portais e com o sistema de vendas | A régua de relacionamento é a base da proposta 4 | [apto.vc/crms-imobiliarios](https://apto.vc/crms-imobiliarios) | Terceiros |
| C2S (Contact2Sale) | Reúne leads de todas as fontes, distribui e acompanha, "para nenhum lead ser esquecido" | Nada novo | [apto.vc/crms-imobiliarios/c2s](https://apto.vc/crms-imobiliarios/c2s) | Terceiros |
| Trisul (incorporadora, 2023) | Recepção do plantão por QR code e roleta eletrônica dos corretores. Mede visitantes e conversão | Interessa à recepção (item 22): o cliente se cadastra sozinho pelo QR (seção 3) | [ABRAINC](https://www.abrainc.org.br/associadas-abrainc/2023/11/21/trisul-inova-em-plantoes-de-venda-de-imoveis) | Busca (a página deu 404) |
| Pipedrive (CRM de vendas geral) | "Rotting": cada etapa tem seu limite de dias parado, e o card fica vermelho quando passa. O relógio **ignora a próxima atividade marcada**, então o negócio com atividade para daqui a um mês também apodrece | É a proposta 1 | [support.pipedrive.com](https://support.pipedrive.com/en/article/the-rotting-feature) | Fabricante |
| HubSpot (CRM de vendas geral) | Sequências: passos com e-mail, tarefa de ligação ou tarefa geral, cada um com o atraso em dias úteis. O contato sai sozinho da sequência quando responde ou marca reunião | A cadência das tentativas (proposta 4): a sequência para na primeira conversa | [knowledge.hubspot.com](https://knowledge.hubspot.com/sequences/create-and-edit-sequences) | Fabricante |
| Anapro (incorporadoras) | CRM, analytics e contrato digital para incorporadoras | Recursos de atendimento **não confirmados** | [b2bstack](https://www.b2bstack.com.br/product/anapro) | Não confirmado |
| Facilita (incorporadoras) | O site oficial respondeu "Companhia Inexistente" em 04/11/2026 | Nada | [facilitavendas.com](https://www.facilitavendas.com/) | Não confirmado |

## 3. O que já temos e onde a referência faz melhor

Itens já feitos ou já no roadmap. Nada aqui é proposta nova, e a coluna da direita só aponta onde a referência vai além.

| Recurso de mercado | Onde está no CRM | A referência faz melhor? |
| --- | --- | --- |
| Distribuição do lead da empresa com aviso | Atribuição pelo gerente, prazo de 15 min, push e "Avisar no WhatsApp" (`docs/leads.md`, seções 4 e 10) | Não. Roleta automática foi recusada (seção 5) |
| Funil, quadro e lead esquecido | Quadro por etapa com o mais esquecido no topo, "Sem contato há N dias" (`docs/leads.md`, seções 5 e 11) | **Sim, em um ponto.** O Pipedrive conta o tempo **na etapa** e ignora o próximo contato marcado. O nosso conta o tempo sem contato, e o lead com contato marcado para daqui a 20 dias some da vista. É a proposta 1 |
| Tentativas de contato | "Sem resposta (+1)", 3 tentativas, sugestão de descarte (`docs/leads.md`, seção 5; ajustes em `docs/codex-ajustes-ficha.md`) | **Sim, em um ponto.** A sequência do HubSpot muda o passo a cada tentativa (mensagem, depois ligação). A nossa repete o mesmo +2 dias. É a proposta 4 |
| Mensagens prontas | Tabela de modelos, sugestão pela etapa (`docs/leads.md`, seção 8) | Não |
| Agenda de visitas e app que agenda | Agenda da semana e agendamento pela ficha (`docs/visitas.md`) | **Sim:** o app da Hypnobox agenda pela agenda. O nosso só pela ficha (o `lead-picker` da Bruna ficou de fora). É a proposta 5 |
| Avisos de lead novo e da agenda | Push: próximo contato, lead atribuído, prazo, visita, resumo do dia (`docs/notificacoes.md`) | Não para o corretor. **O gerente não recebe nada**: é a proposta 3 |
| Catálogo, tabela de preço e match | Empreendimentos, tipologias, Radar de Match, importação da tabela por IA externa (`docs/empreendimentos.md`) | Só no espelho de unidades (pergunta 5) |
| Documentos do cliente | Bucket privado por lead (`docs/leads.md`, seção 17) | Análise de crédito e checklist por fase: seção 5 e proposta 9 |
| Indicadores por corretor e origem | Painel da equipe, conversão por origem e campanha (`docs/painel.md`, `docs/vendas-metas.md`) e o estudo de relatórios (R1 a R8) | Não |
| Remarketing e resumo para o gestor | Listas filtradas com registro de download (R6) e resumo no celular (R7), em `docs/estudo-relatorios.md` | Não |
| Recepção do plantão e vez | Item 22, `docs/estudo-recepcao.md` | **Sim, em um ponto.** Na Trisul o próprio cliente se cadastra pelo QR code, e a recepcionista só confere. Vale levar como opção para a etapa 2 da recepção, com o consentimento da LGPD na própria tela |
| Presença no plantão | Item 23, check-in por localização | Não |
| Aniversário do cliente | Lista do dia, resumo das 9h e a mensagem "Parabéns" (`docs/leads.md`, seção 17) | Não |

## 4. Propostas priorizadas

Tamanho, como em `docs/referencia-crm-bruna.md` (seção 14): **P** até meia sessão, **M** uma sessão, **G** duas ou mais. As rotas são as de `crm/src/app/`. Tudo respeita a exportação estática: o que precisa de chave secreta vira Edge Function, e o que é agendado vira `pg_cron`.

| # | O que é | Para quem | Onde aparece | Tamanho | De onde veio | Precisa do Felipe |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Etapa parada.** Cada etapa tem um limite de dias (por exemplo, Proposta 7 e Visita realizada 5). Quando o lead passa do limite, mesmo com o próximo contato marcado para longe, o card mostra `! Parado em Proposta há 12 dias`. O tempo conta da última mudança de etapa em `lead_eventos`, que já existe. No painel, o gerente vê quantos leads parados cada corretor tem | Corretor e gerente | Card da lista do dia e do quadro, ficha, `/painel` | P | Pipedrive (rotting) | Quais etapas e quantos dias (pergunta 2) |
| 2 | **Áudio como anotação.** Em "Registrar interação", o botão "Gravar áudio" grava pelo navegador até 2 min e guarda no bucket privado do lead, com as mesmas regras dos documentos. O histórico mostra o player, e o texto é opcional | Corretor (o gerente da equipe ouve) | Ficha, em "Como foi" | M | Pesquisa T7; Imobzi e MIA (voz) | Transcrição sim ou não e por quanto tempo guardar (pergunta 1) |
| 3 | **Avisos para o gerente.** Push para quem tem a permissão: prazo de 15 min estourado na equipe (é a hora do botão Lead perdido) e, no fim do dia, as visitas da equipe aguardando baixa. Usa a Edge Function `avisos` e a escolha por aparelho que já existem | Gerente | Push e `/conta` (Avisos neste aparelho) | P | Hypnobox e Imobzi (alertas); "ficou de fora" de `docs/notificacoes.md` | Quais avisos (pergunta 8) |
| 4 | **Cadência das tentativas.** Cada "Sem resposta" sugere um passo diferente: a 1ª, nova mensagem amanhã; a 2ª, ligação em 2 dias; a 3ª, a última mensagem e a sugestão de descarte. Cada passo traz a mensagem pronta da vez. A cadência para sozinha na primeira conversa, como já acontece com o contador | Corretor; o gerente geral edita os passos | Ficha ("Como foi") e lista do dia | P | HubSpot (sequências); Apto (régua) | Os passos e os dias (pergunta 3) |
| 5 | **Agendar pela Agenda.** Em `/agenda/`, "Agendar visita" pede o cliente com a busca tolerante e abre o mesmo formulário da ficha | Corretor | `/agenda/` | P | CRM da Bruna (`lead-picker`); app da Hypnobox | Nada: é o "ficou de fora" de `docs/visitas.md` |
| 6 | **Pesquisa de satisfação depois da visita.** Depois da baixa "realizada", a ficha oferece a mensagem pronta "Como foi a visita" com um link público. São 3 perguntas: nota do atendimento de 0 a 10, se o cliente voltaria e um comentário livre. O link só grava, como a pesquisa "Seu CRM ideal", e cada link vale para uma visita só. O resultado aparece por empreendimento e por corretor | Gerente geral, marketing e gerente; o corretor vê as suas | Ficha, `/painel` e o relatório R1 ou R5 | M | CV Relacionar (pesquisa); Sienge; Trisul (medir o plantão) | Se a nota aparece por corretor, quem envia e o texto do consentimento da LGPD (pergunta 4) |
| 7 | **Pós-venda até as chaves.** Na venda, a ficha ganha os marcos: assinatura (já existe), aprovação do financiamento, entrega das chaves (a data vem do empreendimento) e 1 ano de chaves. Cada marco vira um próximo contato com a mensagem pronta. O de chaves e o de 1 ano pedem uma indicação, e o lead novo que chega assim leva "indicado por {cliente}" | Corretor; o gerente vê | Ficha da venda e lista do dia | M | CV Relacionar (entrega de chaves); CRM da Bruna (aniversário como pós-venda) | Quem acompanha o cliente depois da venda (pergunta 6) |
| 8 | **Carteira para retomar.** Uma vez por semana, a lista do dia mostra até 5 leads para retomar: descartados por "sem retorno" há mais de 90 dias e frios sem contato há mais de 60. Toque em "Retomar" reativa, e "Agora não" esconde por mais 90 dias. A carteira continua não expirando: é só uma lembrança | Corretor | Lista do dia, grupo no fim | M | Apto (réguas de relacionamento); pesquisa T3 (carteira não expira) | Os prazos e se o lead em "aguardando lançamento" entra (pergunta 9) |
| 9 | **Documentos que faltam para a proposta.** Na etapa Proposta, a ficha mostra a lista de documentos da categoria que já existe, com ✓ nos anexados e – nos que faltam, sem bloquear nada | Corretor | Ficha, bloco Documentos | P | CV Vender (análise de crédito antes da proposta); checklist da Bruna, deixado de fora no item 16 | A lista de documentos essenciais |

**O que fica junto:**
- As propostas 1 e 4 mexem no card e na ficha que `docs/codex-ajustes-ficha.md` está mudando agora. Só começam depois que essa frente for entregue.
- As propostas 2 e 9 usam o mesmo bucket e as mesmas policies.
- A 3 e a 6 tocam a Edge Function `avisos` e a pasta pública: uma frente de cada vez.

## 5. O que não trazer

| Recurso | Quem tem | Por que não |
| --- | --- | --- |
| **Conversas do WhatsApp dentro do CRM** (painel único, número único da imobiliária) | Kenlo, Imobzi | O Felipe decidiu em 29/10/2026 que "as conversas do WhatsApp não entram" (`docs/gerentes-necessidades.md`). Também exigiria a API oficial do WhatsApp, servidor e custo por conversa, e cada corretor usa o próprio número |
| **Roleta automática do lead da empresa e "online"** | Apto, Jetimob, C2S, Imobzi | Decidido em 29/10/2026: os leads da empresa serão poucos, o gerente atribui, e o lead perdido é um botão do gerente. "Online" é a roleta atual e fica de fora. A vez do estande já está na recepção (item 22) |
| **IA que atende e pré-qualifica pelo WhatsApp** | Jetimob, Kenlo, Morada.ai | Precisa de servidor, chave e custo por mensagem, e tira do corretor o primeiro contato, que vale prazo e pontos. Na pesquisa foi um pedido isolado (T9) |
| **Comissão no CRM** | CV Vender | Ficou fora desde o início: a comissão segue regra própria (`docs/referencia-crm-bruna.md`, seção 13) e se confunde com a verba |
| **Contrato digital, boleto de ato e análise de crédito** | CV Vender, Anapro | Jurídico, custo por assinatura e consulta, e dado sensível. Pertence ao fechamento no sistema da empresa, não ao CRM do corretor |
| **Portal do cliente** (boletos, obra, chamados, assistência técnica) | CV Relacionar | É o relacionamento com o proprietário depois da venda, com dado financeiro. Pede login do cliente, contra a regra "o anônimo só grava, nunca lê" |
| **Mapa 3D e espelho completo com reserva** | CV Vender | G, e o CRM não tem unidades. Só faz sentido se houver uma fonte de estoque confiável (pergunta 5) |
| **Sincronizar com o Google Agenda** | Vista | Pede OAuth com o Google e um servidor que guarde o token. Os avisos no celular já cobrem o lembrete |
| **Cadastro automático de portais e Lead Ads** | CV Prospectar, Imobzi, Kenlo | Ninguém pediu na pesquisa, e o Cadastro Mágico já lê o e-mail do Facebook e do RD. Pediria webhook com servidor |
| **Assistente que responde sobre os dados** | Imobzi | Custo por consulta e risco de mostrar o que a RLS esconde. O painel e os relatórios respondem às perguntas que foram feitas |
| **Workflows editáveis pelo usuário** | CV Prospectar | Complexidade de produto grande. As regras ficam em gatilhos testados, e o gerente geral ajusta os números em Configurações |
| **Publicar imóveis nas redes pelo app** | Vista | A MBigucci não revende imóveis de terceiros, e o marketing cuida das redes |

## 6. Perguntas ao Felipe

Uma decisão por pergunta, com a recomendada primeiro.

1. **Áudio na ficha (proposta 2):** como guardar?
   - a) **Só o áudio, sem transcrição, guardado enquanto o lead existir (recomendada).** É P/M, não tem custo por uso, e o gerente ouve como hoje lê.
   - b) Áudio com transcrição automática. Pede uma Edge Function com chave de IA e custo por minuto, e o texto vira busca.
   - c) Não fazer agora.
2. **Etapa parada (proposta 1):** em quais etapas?
   - a) **Só nas etapas que pedem ação do corretor: Visita realizada (5 dias) e Proposta (7 dias), com os dias editáveis em Configurações (recomendada).**
   - b) Em todas as etapas, cada uma com o seu limite.
   - c) Não fazer: o "Sem contato há N dias" basta.
3. **Cadência das tentativas (proposta 4):** quais passos?
   - a) **1ª tentativa: mensagem em 1 dia; 2ª: ligação em 2 dias; 3ª: última mensagem e sugestão de descarte (recomendada).**
   - b) Manter o +2 dias de hoje e só trocar a mensagem pronta a cada tentativa.
   - c) Não mudar.
4. **Pesquisa de satisfação (proposta 6):** quem vê a nota?
   - a) **O gerente geral, o marketing e o gerente da equipe por corretor, e o corretor só as dele (recomendada).**
   - b) Só no total por empreendimento, sem nota por corretor.
   - c) Não fazer agora.
5. **Disponibilidade de unidades:** onde está hoje o estoque de unidades livres e reservadas?
   - a) **Não trazer: a tabela do mês e o link da apresentação bastam (recomendada).**
   - b) Numa planilha do comercial, que o CRM leria como a tabela de preços (só leitura, sem reserva).
   - c) Num sistema da empresa (ERP) com integração. É G e precisa da TI.
6. **Pós-venda (proposta 7):** quem acompanha o cliente depois da venda?
   - a) **O corretor dono do lead, com os marcos e os lembretes até 1 ano de chaves (recomendada).**
   - b) Uma área de relacionamento da MBigucci, com usuário próprio.
   - c) Ninguém pelo CRM.
7. **Simulação de parcelas:**
   - a) **Não trazer: o corretor usa o correspondente ou o simulador do banco (recomendada).**
   - b) Uma calculadora simples na ficha, com a taxa editada pelo gerente geral e o aviso "valor estimado".
8. **Avisos para o gerente (proposta 3):** quais?
   - a) **Prazo estourado na equipe, na hora, e as visitas aguardando baixa, às 19h (recomendada).**
   - b) Só o prazo estourado.
   - c) Também cada lead atribuído e cada venda registrada.
9. **Carteira para retomar (proposta 8):** com que prazos?
   - a) **Descartados por "sem retorno" há 90 dias e frios sem contato há 60, até 5 por semana, sem os que aguardam lançamento, que já voltam pelo Radar (recomendada).**
   - b) Os mesmos prazos, incluindo os que aguardam lançamento.
   - c) Não fazer.
10. **Sequência de dias em dia do CRM da Bruna** (dias úteis sem prazo perdido nem follow-up atrasado, com recorde). Foi adiada só pelo sigilo, que acabou em 04/11/2026.
    - a) **Trazer só para o próprio corretor, na lista do dia, sem ranking nem pontos (recomendada).** É P.
    - b) Trazer e mostrar ao gerente por corretor.
    - c) Não trazer: o programa de pontos já faz esse papel.

### Respostas do Felipe (04/11/2026)

| # | Resposta |
| --- | --- |
| 1 Áudio | **Sem áudio por enquanto**, mas com o custo estimado (abaixo) |
| 2 Etapa parada | **Sugestão, não limite:** os leads são do corretor. O card mostra algo como "O ideal é até 5 dias nesta etapa", sem cobrança |
| 3 Cadência | **1ª: mensagem em 1 dia; 2ª: ligação em 2 dias; 3ª: última mensagem e sugestão de descarte** |
| 4 Satisfação | **Gerente geral, marketing e gerente por corretor; o corretor vê as dele** |
| 5 Unidades | **Ler uma planilha do comercial, só leitura** (sem reserva) |
| 6 Pós-venda | **Fora por enquanto.** Fica no roadmap para conversar bem no futuro: hoje a empresa usa outro sistema, mas a ideia é trazer tudo para o CRM |
| 7 Simulação | **Não trazer.** Um item **no menu** que abre `mbigucci.com.br/ferramentas` em outra aba, onde já há simulador |
| 8 Avisos ao gerente | **Prazo de 15 min estourado na equipe, na hora, e visitas aguardando baixa às 19h** |
| 9 Retomar | **Opção a** (descartados por "sem retorno" há 90 dias e frios sem contato há 60, até 5 por semana) **e um jeito de filtrar e retomar os que aguardam lançamento** |
| 10 Sequência | **Trazer e mostrar ao gerente por corretor** |

**Custo estimado do áudio (estimativa, preços não conferidos hoje):** com 40 corretores, 5 áudios de 1 min por dia útil, são cerca de 4.400 min por mês. Em Opus a 32 kbps, 1 min ocupa uns 240 KB, então cerca de 1 GB por mês no Storage do Supabase, dentro da franquia do plano Pro e de centavos de dólar acima dela. A transcrição automática custaria cerca de US$ 0,006 por minuto nos serviços conhecidos, uns US$ 25 a 30 por mês nesse volume, mais uma Edge Function com a chave. Conferir os preços antes de decidir.

Ficaram sem pergunta: a proposta 5 (agendar pela Agenda), que não precisa de decisão, e a 9 (documentos que faltam para a proposta), que precisa da lista de documentos essenciais.

## 7. O que foi conferido e o que não foi

- **Lido na página do fabricante (04/11/2026):**
  - CV CRM: home e os módulos Prospectar, Vender e Relacionar;
  - Imobzi, Jetimob e Kenlo: home;
  - Pipedrive: artigo do rotting;
  - HubSpot: artigo das sequências;
  - Loft: página do simulador.
- **Lido em terceiros:**
  - Sienge sobre o espelho;
  - Exame e Diário do Comércio sobre a Morada.ai;
  - Apto, hub e página do C2S;
  - Loft sobre o Vista.
- **Só pelo resumo do buscador, sem abrir a página:**
  - Trisul: a página da ABRAINC deu 404;
  - app e suporte da Hypnobox: o suporte da Senior pede login.
- **Não confirmado:**
  - Anapro: sem documentação pública de atendimento;
  - Facilita: o site respondeu "Companhia Inexistente";
  - roleta do Dommus: o PDF veio ilegível;
  - Jetimob: a primeira tentativa deu erro 502, a segunda abriu.
- **Não feito:** nenhum produto foi testado por dentro (demonstração ou conta de teste). As páginas de fabricante são material de venda, e o recurso pode ser diferente na prática.
- **Do projeto:** as afirmações sobre o que o CRM já tem vêm dos documentos citados em cada linha da seção 3, não do código. O roadmap conferido é o da seção 14 de `docs/referencia-crm-bruna.md`, itens 1 a 25.
