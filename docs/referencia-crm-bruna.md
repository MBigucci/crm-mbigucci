# Referência: o CRM da Bruna

> Comparação feita em 29/10/2026 entre o CRM da Bruna (`ref/CRM Bruna/`, lido pelo código) e o CRM MBigucci (`crm/` e `docs/`). O CRM da Bruna é o que o Felipe já usa como gerente geral e carrega as premissas dele de fluxo e usabilidade. Aqui ficam só fluxos e regras: o visual segue o MBigucci DS (`docs/design-system.md`). `ref/` é somente leitura.

## Sumário
1. Como ler este documento
2. Diferenças de contexto
3. Cadastro de lead
4. Follow-up, prazo e lista do dia
5. Ficha, etapas e histórico
6. WhatsApp e mensagens prontas
7. Funil, quadro, busca e navegação
8. Visitas e agenda
9. Imóveis e cruzamento com clientes
10. Vendas, metas e desempenho
11. Notificações
12. Sincronização, offline e configurações
13. O que não trazer
14. Lista priorizada

## 1. Como ler este documento

Cada tabela traz, por recurso da Bruna:
- **Recurso:** o que faz e o arquivo de origem (caminhos relativos a `ref/CRM Bruna/src/`).
- **MBigucci:** ✓ já tem, ! tem diferente, ✕ não tem.
- **Recomendação:** trazer, adaptar (e como) ou não trazer (e por quê).
- **Etapa:** leads (ajuste no módulo existente), visitas, metas, pontuação/recepção, imóveis, notificações ou base.
- **Pesquisa:** os pedidos de `docs/pesquisa-resultados.md` que ela atende, pelos códigos abaixo.

Códigos da pesquisa:

| Código | Pedido |
| --- | --- |
| T1 | Lembrete de retorno com dia e hora (~11 pessoas, o mais repetido) |
| T2 | Qualidade dos leads e descarte rápido (~10) |
| T3 | Menos burocracia, carteira que não expira (~9) |
| T4 | Prioridade visual quente, morno, frio (~5) |
| T5 | Última interação à vista (~4) |
| T6 | Celular de verdade, com notificações (~4) |
| T7 | Áudio como anotação (~3) |
| T8 | Cruzar clientes com imóveis e lançamentos (~3) |
| T9 | Isolados: atender em 1 clique, links das apresentações, endereço do empreendimento, IA para pré-qualificar, repasse mais rápido dos leads da empresa |
| R-zap | 41% registram encaminhando do WhatsApp; 50% querem "o básico agora e o resto depois" |
| N1 | Qual divulgação traz mais clientes (59%) |
| N2 | Funil visita, proposta, venda (53%) |
| N3 | Sem retorno há dias (50%) |
| N4 | Origem de cada cliente e novos no mês (50%) |

## 2. Diferenças de contexto

- **Tamanho:** a Bruna é uma imobiliária de 2 usuários com acesso total (policy única `using (true)` em `supabase/schema.sql`). A MBigucci tem 6 perfis, equipes e RLS por `pode_ver_dados_de` (`docs/acessos-perfis.md`).
- **Onde ficam as regras:** na Bruna, quase tudo roda no cliente (zerar tentativas, avançar etapa, histórico de etapa lido do texto). Na MBigucci, o que pesa para gerente, pontos ou auditoria vai para gatilho ou RPC no banco, porque o cliente é público e qualquer perfil poderia burlar a regra.
- **Servidor:** a Bruna roda na Vercel com rotas em `src/app/api/` (push, importação com IA). A MBigucci é exportação estática no WordPress. O que precisa de chave secreta vira Edge Function do Supabase, e o que é agendado vira `pg_cron`.
- **Catálogo:** a Bruna revende imóveis de terceiros (planta, pronto, usado). A MBigucci vende os próprios empreendimentos, um catálogo pequeno e estável.
- **Exclusão:** a Bruna apaga lead, venda e imóvel de vez. A MBigucci não exclui (descarte com motivo).
- **Sigilo:** pontos, verba e ranking não aparecem no código do front até a reunião de novembro (`docs/pontuacao-verba.md`). Várias recomendações abaixo (visitas, vendas) alimentam esse programa, mas as telas e textos ficam neutros.

## 3. Cadastro de lead

| Recurso | MBigucci | Recomendação | Etapa | Pesquisa |
| --- | --- | --- | --- | --- |
| **Cadastro Mágico**: aba "Colar e-mail / mensagem" que processa ao colar e extrai nome, telefone, e-mail, interesse, imóvel do catálogo, mensagem, portal, orçamento, dormitórios, bairros e tipo (`lib/parser.ts`, `components/new-lead-dialog.tsx`) | ✕ Só formulário | **Adaptar.** Função pura em `crm/src/lib/`, testada com `node --test` (roda no navegador, serve para a exportação estática). Preenche nome, WhatsApp (com `normalizarWhatsapp`), empreendimento, valor, dormitórios e região, e deixa a origem para o corretor tocar. Trocar o catálogo de imóveis por uma lista de empreendimentos MBigucci (fixa até existir a tabela da etapa de imóveis), os bairros pelos do ABC atendidos, e a lista `NOT_NAME` (que tem "felipe" e "bruna") pelos nomes dos usuários. Incluir os formatos que a MBigucci recebe: encaminhamento do WhatsApp, e-mail do Facebook Lead Ads e do RD Station. Guardar o texto colado como primeira interação ("Mensagem original"). | leads | R-zap, T3, T9 (IA para pré-qualificar, sem IA) |
| Prévia com "N de 5 campos" e selo por campo: identificado, conferir, revisar, não encontrado (`new-lead-dialog.tsx`) | ✕ | **Trazer** junto com o Cadastro Mágico. É o que deixa o corretor confiar no preenchimento. | leads | T3 |
| Perfil sugerido em tags que só valem depois de tocadas; dormitórios e orçamento valem um por vez (`components/profile-tags.tsx`) | ✕ | **Trazer** no Cadastro Mágico, mapeando para valor, dormitórios e região. Mantém a regra "o básico agora e o resto depois". | leads | R-zap, T3 |
| Interesse vazio vira "A definir"; origem padrão "Encaminhado por Felipe" | ! Origem vem da última usada no aparelho | **Não trazer** a origem fixa. A da MBigucci é melhor para vários corretores. | | |
| Aviso de duplicado pelo telefone, sem bloquear (`useDuplicate`) | ! Igual, mas só entre os leads que a pessoa enxerga (RLS) | **Adaptar.** Uma RPC `security definer` `whatsapp_em_uso(numero)` que devolve só se existe lead ativo com outro corretor, sem nome nem dono. Atende o "cliente que já falou com outros corretores". | leads | T2 |
| Telefone: insere o 9 em celular de 10 dígitos com terceiro dígito de 6 a 9 (`lib/utils.ts`) | ✕ `normalizarWhatsapp` aceita 10 dígitos como está | **Trazer** a regra do 9º dígito para `normalizarWhatsapp`, com teste. Evita duplicado com e sem o 9. | leads | T2 |
| Depois de cadastrar, botão "Avisar {nome} no WhatsApp" com o texto pronto do lead (`new-lead-dialog.tsx`) | ✕ | **Adaptar** para o lead da empresa: quando o gerente atribui, aparece "Avisar {corretor} no WhatsApp" com nome, WhatsApp, empreendimento e origem. Precisa de um campo de WhatsApp em `profiles`. É o reforço do push enquanto ele não existe. | leads | T9 (repasse mais rápido) |

## 4. Follow-up, prazo e lista do dia

| Recurso | MBigucci | Recomendação | Etapa | Pesquisa |
| --- | --- | --- | --- | --- |
| **Regra de ouro do follow-up**: lead ativo (fora de "novo") com 2 dias ou mais sem interação vira follow-up atrasado; visita marcada segura o lead (`lib/followup.ts`, `FOLLOW_UP_DAYS = 2`) | ! Usa o próximo contato com dia e hora, que o corretor marca | **Adaptar.** O próximo contato explícito continua sendo a regra (é o pedido T1). Da Bruna vem o que falta: o lead com dias sem interação mesmo tendo data longe não some. Proposta: o grupo "Sem próximo contato" passa a incluir também quem está há N dias sem interação (N em `app_settings`), e o card mostra "Sem contato há N dias" em âmbar e vermelho. | leads | T1, N3, T5 |
| **"Sem resposta (+1)" em 1 toque** na lista, na agenda e na ficha; texto padrão "Tentei contato, sem retorno."; conta tentativas até 3 (`lib/store.tsx` `addInteraction`, `history-tab.tsx`) | ✕ Toda interação pede texto e próximo contato | **Adaptar.** Criar `lead_interacoes.tipo` (nota, ligação, WhatsApp, visita, tentativa) e `leads.tentativas`. O gatilho `lead_interacao_atualiza_lead` soma 1 na tentativa e zera nas conversas de verdade, no banco e não no cliente. O botão "Sem resposta" grava a tentativa com o próximo contato já sugerido (+2 dias, mesma hora), editável. | leads | T1, T3, N3 |
| Na 3ª tentativa, sugere "Marcar perdido" com o motivo "Sem retorno" pré-selecionado; nunca automático (`stage-dialogs.tsx`) | ! Descarte em 1 toque, sem motivo "sem retorno" | **Adaptar.** Na 3ª tentativa a ficha sugere o descarte, com o motivo novo `sem_retorno` pré-selecionado. Nunca descarta sozinho, porque a carteira não expira. Incluir `sem_retorno` no check de `leads` e em `MOTIVOS_DESCARTE`. | leads | T2, T3 |
| Motivos de perda da Bruna: comprou outro, sem renda/crédito, desistiu, sem retorno, outro (`lib/constants.ts`) | ! Motivos de qualidade: sem interesse, fora do perfil, fora da região, contato inválido, duplicado | **Adaptar:** somar `sem_retorno` e `sem_credito` aos da MBigucci. Os de qualidade medem a campanha; os da Bruna medem a venda perdida. | leads | T2, N1 |
| **Prazo de 15 min para o 1º contato**, contado só no horário de atendimento ("Responder em 12 min", "Responder até amanhã, 8h15", "Prazo estourado há 1h") (`lib/performance.ts` `slaDeadline`, `followup.ts` `timeTag`) | ✕ | **Adaptar só para o lead da empresa**, que chega pronto do gerente. O lead próprio é cadastrado depois do contato e não precisa de prazo. O horário vem dos períodos do plantão (9h–14h e 14h–19h), em `app_settings` editável pelo gerente geral. O resumo do gerente ganha "Prazo estourado" por corretor. | leads | T9 (repasse rápido) |
| Fila única "Próximos passos" com ordem de urgência: prazo estourado, prazo correndo, follow-up, visita de hoje, baixa de visita, falta mover a etapa, follow-up de amanhã; limite de 8 que só corta follow-ups (`components/agenda/steps.ts`, `next-steps.tsx`) | ! Lista do dia: atrasados, hoje, sem data, por temperatura | **Adaptar** quando houver visitas: as visitas de hoje e as que esperam baixa entram no topo da lista do dia. A ordem por temperatura da MBigucci fica (é pedido T4). O limite com "Mostrar mais" vale para listas longas. | visitas | T1, T4 |
| Sino com 5 grupos (novos sem contato, follow-ups, visitas hoje, amanhã, baixa), no máximo 8 por grupo e resumo calmo ("Nada urgente por agora.") (`components/alerts-panel.tsx`) | ✕ | **Não trazer por ora.** Para o corretor, a lista do dia já é essa tela. Reavaliar para o gerente quando houver prazo e visitas. | | |
| "Lead novo já contatado · falta mover a etapa" | ✕ | **Não trazer:** resolvido pelo avanço automático de etapa (seção 5). | | |

## 5. Ficha, etapas e histórico

| Recurso | MBigucci | Recomendação | Etapa | Pesquisa |
| --- | --- | --- | --- | --- |
| 10 etapas: novo, 1º contato, qualificação, opções enviadas, visita agendada, visita feita, proposta, negociação, fechada, perdido (`lib/constants.ts`) | ! 7 etapas em tabela, com "aguardando lançamento"; perdido é o descarte | **Manter as da MBigucci.** São editáveis em `lead_etapas`; se o Felipe sentir falta de "negociação e documentação", basta uma linha. | | |
| **Avanço automático de etapa**: WhatsApp num lead novo leva a 1º contato; visita agendada e visita feita movem a etapa; venda leva a fechada (`store.tsx` `logWhatsApp`, `scheduleVisit`, `setVisitStatus`, `registerSale`) | ✕ Etapa só manual | **Adaptar** num gatilho: a primeira interação move "novo" para "em contato"; agendar e dar baixa em visita movem para "visita agendada" e "visita realizada". Nunca volta etapa. | leads | T3 |
| **Histórico de etapas lido do texto** das interações "Etapa: X → Y" (`lib/performance.ts` `stageChanges`) | ✕ Não guarda mudança de etapa | **Adaptar com tabela:** `lead_eventos` (lead, tipo, de, para, autor, quando), preenchida por gatilho em toda mudança de etapa, temperatura, status e dono. Sem ela não há funil por período nem auditoria de atribuição. Fazer cedo: o módulo já está em produção e cada dia sem a tabela é histórico perdido. | leads | N2, N4 |
| Desfazer no aviso (mudança de etapa, cancelar visita, excluir meta) em vez de diálogo de confirmação (`store.tsx`, `visit-actions.tsx`) | ✕ | **Trazer** o padrão para mudança de etapa, temperatura e descarte. Desfazer grava um evento novo, não apaga o anterior. | leads | T3 |
| Ficha em 3 abas: Histórico, Perfil & Match, Dados & Docs; cabeçalho fixo com WhatsApp, Mensagens e Ligar (`components/lead/lead-sheet.tsx`) | ! Ficha em uma coluna | **Adaptar aos poucos:** o botão **Ligar** (`tel:`) entra já. As abas só quando a ficha crescer (match, documentos). | leads | T9 (1 clique) |
| Aviso contextual no topo da ficha: "N dias sem contato · tentativa n/3" com "Sem resposta (+1)" e, no limite, "Descartar" (`lead-sheet.tsx`) | ✕ | **Trazer** junto com o item de tentativas. | leads | T1, N3 |
| Registrar interação por tipo rápido; Ctrl+Enter salva; registros do sistema esmaecidos (`components/lead/history-tab.tsx`) | ! Texto livre + próximo contato | **Adaptar:** tipo em 1 toque antes do texto (ver seção 4). Registros automáticos, como "Etapa: X → Y", aparecem esmaecidos e vêm de `lead_eventos`. | leads | T3, T5 |
| Perfil de busca: tipos, bairros, orçamento mín./máx., quartos, vagas, área, prazo de compra, financia, FGTS; valor do negócio a partir de proposta (`components/lead/profile-tab.tsx`) | ! Valor, dormitórios, região, finalidade | **Adaptar com moderação:** somar prazo de compra, "vai financiar" e "usa FGTS", úteis para construtora. Tudo opcional e só na ficha. Vagas e área ficam de fora (muitos campos é queixa T3). | leads | T3, T8 |
| Dados pessoais com alerta de aniversário em 30 dias (`components/lead/personal-tab.tsx`) | ✕ | **Não trazer agora.** Volta como etapa de pós-venda. | | |
| Checklist de documentos (RG ou CNH, CPF, comprovante, holerite, IR, certidão se casado) no bucket privado com link assinado de 1 h | ✕ | **Adaptar depois** (proposta e documentação). O caminho do arquivo precisa cruzar com `pode_ver_dados_de` na policy do storage. Dados sensíveis (LGPD): decidir com o Felipe quem vê. | outra (documentação) | |

## 6. WhatsApp e mensagens prontas

| Recurso | MBigucci | Recomendação | Etapa | Pesquisa |
| --- | --- | --- | --- | --- |
| **Templates com variáveis** (`{primeiroNome}`, `{interesse}`, `{opcoes}`, `{dataVisita}`…): primeiro contato, follow-up, novas opções, confirmação de visita (`lib/templates.ts`) | ✕ Botão abre `wa.me` sem texto | **Adaptar.** Templates numa tabela `mensagens_modelo` (editável pelo gerente geral, como origens e etapas), assinados com o nome do corretor e não "Bruna". `{endereco}` e `{apresentacao}` vêm do empreendimento quando a tabela existir. | leads | T9 (1 clique, links, endereço) |
| Template sugerido pela etapa e pelo follow-up (`suggestedTemplate`) | ✕ | **Trazer.** O botão WhatsApp do card já abre com o texto certo. | leads | T9 |
| Abrir o WhatsApp registra no histórico sozinho; o template de follow-up conta tentativa (`store.tsx` `logWhatsApp`) | ✕ | **Adaptar.** Na MBigucci toda interação pede próximo contato. Proposta: o clique grava só um evento "WhatsApp aberto" em `lead_eventos` (vale como "última interação" na tela) e a ficha oferece o registro completo ao voltar. | leads | T5, T3 |
| Diálogo de mensagem: escolhe o modelo, edita o texto, Copiar ou Abrir no WhatsApp (`components/message-dialog.tsx`) | ✕ | **Trazer** junto com os templates. | leads | T9 |

## 7. Funil, quadro, busca e navegação

| Recurso | MBigucci | Recomendação | Etapa | Pesquisa |
| --- | --- | --- | --- | --- |
| Kanban com arrastar e soltar, contador e soma de valor por coluna; dentro da coluna, o mais esquecido no topo (`app/funil/page.tsx`) | ! Quadro com rolagem lateral, sem arrastar | **Adaptar:** a ordem "mais esquecido no topo" e o contador entram já. Arrastar só no computador, com o seletor de etapa como no celular. | leads | N3 |
| Tabela com ordenação por etapa, mais tempo sem contato e A–Z; linha destacada com follow-up atrasado; etapa trocada na linha | ! Lista por próximo contato | **Trazer** a ordenação "mais tempo sem contato" em `/leads/`. É o "sem retorno há dias" que 50% pediram. | leads | N3 |
| Busca global (Ctrl+K) em leads e imóveis: sem acento, vários termos, telefone tolerante (+55 pela metade, 0, pontuação), ranking por início do nome (`components/search-dialog.tsx`) | ! Busca simples em `/leads/` | **Adaptar** a lógica (função pura, testável) para a busca de `/leads/`. Atalho de teclado e imóveis depois. | leads | T5 |
| Painel do Dia: saudação, leads novos sem contato, follow-ups com ações em 1 toque, metas, métricas do mês, agenda de 7 dias, funil (`app/page.tsx`) | ! Lista do dia (corretor) e painel do gerente "em construção" | **Adaptar no painel do gerente** (por equipe): leads novos, atrasados e sem contato por corretor (já existe em `/leads/`), funil agora e novos no mês. A "comissão estimada" com 5% × 85% fixos **não vem**. | metas | N2, N4 |
| Card de boas-vindas no banco vazio explicando o Cadastro Mágico | ✕ | **Trazer** com o Cadastro Mágico. | leads | |
| PWA instalável: manifest, ícones, `display: standalone` (`app/manifest.ts`, `layout.tsx`) | ✓ `public/manifest.webmanifest` | **Feito** (item 8). É estático e funciona no WordPress. Os caminhos usam o `basePath`. | base | T6 |
| Barra do celular com contador no Funil e atalhos | ! Casca própria | **Não trazer:** a navegação da MBigucci segue o DS. | | |

## 8. Visitas e agenda

| Recurso | MBigucci | Recomendação | Etapa | Pesquisa |
| --- | --- | --- | --- | --- |
| **Visitas** com imóvel, data e hora (padrão amanhã 10h) e observação; status agendada, aguardando baixa (já passou), realizada, cancelada (`components/lead/history-tab.tsx`, `store.tsx`) | ✕ Só as etapas "visita agendada" e "visita realizada" | **Adaptar.** Tabela `visitas` com dono, lead, empreendimento, data, status, quem deu baixa e quando, com `pode_ver_dados_de`. A baixa "realizada" precisa ser registro auditável com autor, porque a visita realizada também alimenta outro módulo (ver `docs/pontuacao-verba.md`); o front não cita esse uso. Cancelar tem Desfazer. | visitas | T1, N2 |
| Agenda da semana (7 dias, contagem por dia) e "Agendar visita" pela escolha do cliente (`components/agenda/week-agenda.tsx`, `lead-picker.tsx`) | ✕ | **Trazer** com a tabela de visitas. Para o gerente, a agenda da equipe. | visitas | T1 |
| Confirmar visita pelo WhatsApp com o template que cita aquela visita (`visit-actions.tsx`) | ✕ | **Trazer** com os templates. | visitas | T9 |
| Comprovante da saída para visita durante o plantão | ✕ | Não existe na Bruna. Fica para a etapa de recepção (foto para a recepcionista). | pontuação/recepção | |

## 9. Imóveis e cruzamento com clientes

| Recurso | MBigucci | Recomendação | Etapa | Pesquisa |
| --- | --- | --- | --- | --- |
| Catálogo de imóveis: código BR-n, tipo, preço, condomínio, endereço, área, dorms, vagas, entrega, construtora, fotos, destaques; plantas do mesmo condomínio agrupadas com "a partir de" (`app/imoveis/page.tsx`) | ✕ Empreendimento é texto livre no lead | **Adaptar** para `empreendimentos` + `tipologias`: nome, endereço, status (lançamento, em obras, pronto), link da apresentação, entrega; tipologias com dorms, área, preço a partir de. Quem cadastra: o operacional (proposta em `docs/acessos-perfis.md`). Depois, `leads.empreendimento` vira referência. | imóveis | T9 (links, endereço), T8 |
| Importação "Resposta de outra IA": copia as instruções, cola o JSON que a IA devolve, confere e cadastra; deduplica por nome ou dorms + área (`components/property-import-dialog.tsx`, `lib/import-parse.ts`, `public/importar-imoveis.md`) | ✕ | **Adaptar depois**, para atualizar a tabela de preços mensal. Roda no navegador e não precisa de chave. Com poucos empreendimentos, o cadastro manual basta no começo. | imóveis | |
| Importação "Ler aqui com IA" (rota de API com chave da Anthropic) e a skill `importar-imoveis` | ✕ | **Não trazer:** precisa de servidor e custa por leitura. Se fizer falta, vira Edge Function com o Felipe. | | |
| **Radar de Match**: nota 0–100 por pesos (orçamento 35 com 10% de tolerância, tipo 20, região 20, dorms 15, vagas 5, área 5), motivos ✓/✕, mostra ≥ 50% (`lib/match.ts`, `profile-tab.tsx`) | ✕ | **Adaptar** sobre as tipologias, com orçamento, região e dorms. Botão "Enviar" monta a mensagem com as opções e o link da apresentação. | imóveis | T8 |
| Leads compatíveis por imóvel (nota ≥ 70) na página do imóvel | ✕ | **Adaptar** para o lançamento: ao cadastrar um empreendimento, listar os leads em "aguardando lançamento" e os descartados por "fora do perfil" compatíveis, cada corretor vendo só os seus. | imóveis | T8 |

## 10. Vendas, metas e desempenho

| Recurso | MBigucci | Recomendação | Etapa | Pesquisa |
| --- | --- | --- | --- | --- |
| Vendas com valor, comissão %, desconto % ou R$, recebido, status a receber/parcial/recebido; diálogo pré-preenchido pelo lead (`app/vendas/page.tsx`, `stage-dialogs.tsx`) | ✕ Etapa "venda" sem registro | **Adaptar** só a venda: dono, lead, empreendimento, VGV, data da assinatura, "paga". É a base da meta de VGV (conta no mês da assinatura). Comissão e recebimento **não vêm**: a comissão na construtora segue regra própria, a decidir com o Felipe. Quem registra e confirma a venda também é decisão dele. | metas | N2 |
| Metas: métrica (vendas, VGV, visitas, contatos, prospecção, comissão, % atendido em 15 min), período (mês, trimestre, semestre, ano, personalizado), "mostrar no painel", uma por métrica e período (`lib/performance.ts`, `components/performance/goal-dialog.tsx`, `goals-section.tsx`) | ✕ Já previsto em `docs/metas-ranking.md` | **Adaptar.** Na Bruna as metas são da equipe toda (`app_settings`). Na MBigucci: tabela `metas` com `dono_id` e `pode_ver_dados_de`, mais a meta anual de VGV de R$ 10 mi criada pelo gerente geral. Métricas: VGV, vendas, visitas realizadas, contatos. Sem comissão. | metas | |
| Ritmo da meta: projeção só com 25% do período, "por semana", arredondamento para baixo para não mostrar meta batida antes da hora (`components/performance/format.ts` `paceText`) | ✕ | **Trazer** as regras como estão para o acompanhamento da meta anual: acumulado, quanto falta, ritmo por mês e projeção. | metas | |
| **Conversão**: coorte de leads do período; funil 1º contato, visita, proposta, venda; por origem (leads, vendas, taxa); motivos de perda; tempo médio de resposta; ticket e ciclo médio (`lib/performance.ts` `conversionReport`, `conversion-section.tsx`) | ✕ | **Adaptar** por origem **e campanha**, com os motivos de descarte. O corretor vê o dele; o gerente, por corretor da equipe. Depende de `lead_eventos` (seção 5). É o pedido mais forte dos números. | metas | N1, N2, N4, T2 |
| Sequência de dias úteis "em dia" (sem prazo perdido e sem follow-up atrasado), recorde e bolinhas dos últimos 10 dias (`computeStreak`, `cards.tsx`) | ✕ | **Não trazer agora.** É gamificação e se confunde com o programa que ainda é sigiloso. Reavaliar com o Felipe depois da reunião de novembro. | pontuação | |
| Horário de atendimento editável com exemplo ao vivo (`components/performance/service-hours.tsx`) | ✕ | **Adaptar** com o prazo do lead da empresa (seção 4), em Configurações, só para o gerente geral. | leads | |

## 11. Notificações

| Recurso | MBigucci | Recomendação | Etapa | Pesquisa |
| --- | --- | --- | --- | --- |
| Web Push: lead novo para o outro usuário, resumo do dia entre 9h e 12h, lembrete ~1 h antes da visita, teste; escolha por aparelho; aparelho inativo 45 dias sai (`lib/push.ts`, `lib/push-server.ts`, `app/api/push/*`, `public/sw.js`, `supabase/agendar-notificacoes.sql`) | ✕ | **Adaptar.** Envio numa Edge Function com a chave VAPID secreta; `pg_cron` + `pg_net` chamando a função a cada 10 min; a lógica de "quem recebe o quê" numa função SQL como o `push_due`, mas por dono. Tipos: **lembrete do próximo contato na hora marcada** (o T1, que a Bruna não tem), lead atribuído para o corretor que recebeu, resumo do dia, lembrete de visita. O `sw.js` e o `register` precisam do `basePath` (`/crm/`). No iPhone só funciona com o app instalado, por isso o PWA vem antes. Precisa do Felipe para criar as chaves e o cron. | notificações | T1, T6, T9 (repasse rápido) |
| Prazo do push calculado no aparelho, porque o servidor roda em UTC e não conhece o horário | ✕ | **Trazer o cuidado:** na MBigucci o cron calcula com `America/Sao_Paulo` e o horário de `app_settings`, no banco. | notificações | |
| WhatsApp como reserva quando o push falha | ✕ | Ver "Avisar corretor no WhatsApp" (seção 3). | leads | T9 |

## 12. Sincronização, offline e configurações

| Recurso | MBigucci | Recomendação | Etapa | Pesquisa |
| --- | --- | --- | --- | --- |
| `CloudSync`: estado inteiro em memória, grava por diferença, mescla de 3 vias por coluna, fila offline no `localStorage`, Realtime em todo o schema (`lib/cloud.ts`, `store.tsx`) | ! Grava direto a cada ação | **Não trazer.** Feito para 2 pessoas: baixa tudo, trata `42501` (RLS negada) como erro passageiro (repetiria para sempre com perfis), marca erro de dados como sincronizado, e a última gravação vence sem aviso. Com RLS por equipe, gravar direto e mostrar o erro é mais seguro. | | |
| Aviso fixo "Sem internet · …" | ! Só o aviso (`aviso-offline.tsx`) | **Adaptar** só o aviso (feito no item 8), e manter o formulário preenchido quando a gravação falhar, para tentar de novo. | base | T6 |
| Realtime: aviso "Novo lead: {nome}" e vibração quando chega um lead | ✕ | **Adaptar** só para o corretor que recebe um lead da empresa, filtrado por dono. | notificações | T9 |
| `app_settings` com gravação otimista e controle por `updated_at` (`lib/app-settings.ts`) | ✓ Já existe, só o gerente geral grava | Nada a trazer. | | |
| Conta: nome, sair, notificações deste aparelho, contato avisado por WhatsApp (`components/account-dialog.tsx`) | ! `/conta` | **Adaptar** quando houver push: a seção "Notificações neste aparelho" vai para `/conta`. | notificações | T6 |
| Login com erros traduzidos e "Tentar de novo" (`components/gate-screens.tsx`) | ✓ `/entrar` e `lib/erros.ts` | Nada a trazer. | | |
| Modo demonstração sem Supabase (`lib/mock-data.ts`) | ! Supabase falso só para testes (pasta de notas) | **Não trazer:** o site público não deve rodar sem login. | | |

## 13. O que não trazer

- **Exclusão definitiva** de lead, venda, imóvel e documento (`deleteLead`, `deleteSale`, `deleteProperty`): a MBigucci só descarta, e o histórico fica.
- **Regras no cliente** que mexem em dados de outro perfil ou que pesam para o programa (contar tentativas, avançar etapa, baixa de visita): vão para gatilho ou RPC.
- **Comissão** fixa de 4% ou 6% e desconto de 15%, e a "comissão estimada" do painel.
- **Leitura de imóveis com IA no servidor** e o `CloudSync`.
- **Textos com nomes fixos** ("Via Felipe", "Aqui é a Bruna", "vocês dois").

## 14. Lista priorizada

Tamanho: **P** = até meia sessão, **M** = uma sessão, **G** = duas ou mais sessões. Os itens 1 a 7 ajustam o módulo de leads que já está em produção.

| # | O que | Etapa | Tamanho | Pesquisa |
| --- | --- | --- | --- | --- |
| 1 ✓ | **Feito.** **Cadastro Mágico**: colar e-mail ou mensagem do WhatsApp, prévia com selo por campo, tags opt-in, mensagem original guardada, card de boas-vindas | leads | M | R-zap, T3 |
| 2 ✓ | **Feito.** **Follow-up com tentativas**: tipo da interação, "Sem resposta (+1)" em 1 toque com próximo contato sugerido, contador no banco, sugestão de descarte na 3ª com o motivo novo `sem_retorno`, "Sem contato há N dias" no card | leads | M | T1, T2, N3 |
| 3 ✓ | **Feito.** **`lead_eventos`** por gatilho (etapa, temperatura, status, dono, autor) e avanço automático de etapa. Barato e urgente, porque o histórico já está sendo perdido | leads | P | N2, N4 |
| 4 ✓ | **Feito.** **Mensagens prontas no WhatsApp**: tabela de modelos, sugestão pela etapa, diálogo de mensagem, botão Ligar | leads | M | T9, T5 |
| 5 ✓ | **Feito.** **Duplicado entre corretores** (RPC que só diz se existe). O 9º dígito no `normalizarWhatsapp` já entrou com o item 1 | leads | P | T2 |
| 6 ✓ | **Feito.** **Repasse do lead da empresa**: WhatsApp do corretor em `profiles` e botão "Avisar no WhatsApp" ao atribuir | leads | P | T9 |
| 7 ✓ | **Feito.** **Ajustes de lista e quadro**: "mais tempo sem contato" em `/leads/`, mais esquecido no topo do quadro, Desfazer em vez de confirmação, busca tolerante a acento e telefone, filtro por origem e empreendimento | leads | P | N3, T3 |
| 8 ✓ | **Feito.** **PWA instalável** (manifest e ícones com `basePath`) e aviso de sem internet | base | P | T6 |
| 9 ✓ | **Feito.** **Prazo de 15 min para o primeiro contato** no lead da empresa, no horário do plantão, com o grupo "Aguardando primeiro contato" no topo da lista do dia e "Prazo estourado" no resumo do gerente | leads | M | T9 |
| 10 ✓ | **Feito** (`docs/visitas.md`). **Visitas**: tabela, agendar, confirmar por WhatsApp, baixa auditável, agenda da semana, visitas no topo da lista do dia | visitas | G | T1, N2 |
| 11 ✓ | **Feito** (`docs/painel.md` e `docs/vendas-metas.md`). **Conversão por origem e campanha**, motivos de descarte, funil do período, painel do gerente por equipe (depende do 3) | metas | M | N1, N2, N4 |
| 12 ✓ | **Feito** (`docs/vendas-metas.md`). **Vendas e metas**: registro da venda (VGV, assinatura, paga), meta anual de R$ 10 mi com ritmo e projeção, metas próprias do corretor | metas | G | N2 |
| 13 | **Empreendimentos e tipologias** com endereço e link da apresentação, usados nos modelos de mensagem | imóveis | M | T9, T8 |
| 14 | **Radar de Match** e leads compatíveis no lançamento (aguardando lançamento) | imóveis | M | T8 |
| 15 | **Notificações push**: Edge Function, `pg_cron`, lembrete do próximo contato, lead atribuído, resumo do dia, visita. Precisa do Felipe para as chaves | notificações | G | T1, T6 |
| 16 | Depois: perfil ampliado (prazo de compra, financiamento, FGTS), documentos no bucket, dados pessoais e aniversário, importação de tabela de preços por IA externa | outra | M cada | T3 |
| 17 | **Revisão visual**, com tudo pronto e antes de entregar: hierarquia e destaque em cada tela. O Felipe sentiu que "as coisas ficam todas iguais". Para cada tela, ver o que é a ação principal, o que precisa saltar (atrasado, prazo estourado, visita de hoje), o que está apagado demais (`concrete`, texto pequeno) e o contraste em 375px. Pode ser feita no Codex, como revisão independente | visual | M | — |
| 19 | **Apresentação do CRM para a reunião de novembro**: o deck que o Felipe vai usar para anunciar o CRM e o programa aos corretores e gerentes. Fica no fim do roadmap, com tudo pronto, para usar prints reais das telas. Conteúdo: por que um CRM próprio, o que os corretores pediram na pesquisa e como foi atendido, o tour pelas telas (lista do dia, Cadastro Mágico, visitas, metas), o programa de pontos e verba e os próximos passos. No MBigucci DS | apresentação | M | — |
| 18 | **Modo escuro.** O MBigucci DS hoje só tem o tema claro ("Site"). Antes, definir os tokens escuros no DS, com o contraste de cada par conferido. Depois, aplicar no CRM (`prefers-color-scheme` e escolha em Minha conta) | visual | M | — |

Os itens 1, 2 e 3 mexem no mesmo gatilho e nas mesmas telas (cadastro, ficha, `lead_interacoes`). Por isso convém fazê-los na mesma sessão ou em sequência, nunca em paralelo.

**29/10/2026:** os itens 1, 2 e 3 foram feitos juntos, com o 9º dígito do item 5. As regras estão em `docs/leads.md` (seções 5 a 7). Ficaram de fora: o motivo `sem_credito` (seção 4 desta referência), o grupo da lista do dia para quem passou de N dias sem contato com data longe (o próximo contato marcado continua mandando) e o N em `app_settings` (é constante em `followup.ts`). O avanço automático só tira o lead de "novo"; as etapas de visita esperam a tabela de visitas (item 10), porque a visita realizada precisa de baixa auditável.

**29/10/2026, item 9:** como recomendado na seção 4, o prazo vale só para o lead da empresa (o corretor organiza o prazo dos leads que ele mesmo cadastra, decisão do Felipe em 29/10/2026), e termina na primeira conversa, que tira o lead de "novo" (na Bruna, qualquer registro encerra o prazo). O horário fica na tabela `horario_atendimento`, e não em `app_settings`, porque o corretor precisa lê-lo. O padrão é 9h às 19h, todos os dias, editável pelo gerente geral em Configurações. Ele substituiu o "próximo contato para agora" do lead novo sem dia marcado. Regras em `docs/leads.md`, seção 4.

**29/10/2026, item 11 (em parte):** veio antes por pedido dos gerentes (`docs/gerentes-necessidades.md`). Entraram o painel da equipe por dia, semana e mês, com recebidos da empresa, perdidos, cadastrados por origem, descartes por motivo e o funil dos leads que entraram no período, e o relatório do corretor para imprimir. A conversão por campanha ficou de fora pelo sigilo, e o tempo médio de resposta, o ticket e o ciclo médio esperam as vendas (item 12). Regras em `docs/painel.md`.

**29/10/2026, itens 4 a 7:** feitos juntos. Regras em `docs/leads.md`, seções 8 a 11. Diferenças em relação à recomendação: os modelos usam `{primeiro_nome}`, `{nome}`, `{empreendimento}` e `{corretor}` (sem `{endereco}` e `{apresentacao}`, que esperam a tabela de empreendimentos do item 13); abrir o WhatsApp não grava evento (seção 6 desta referência), porque toda interação pede o próximo contato; a RPC do duplicado se chama `whatsapp_em_outra_carteira` e cobre só as carteiras que a pessoa não vê (nas que ela vê, o cadastro já mostra o nome); o Desfazer vale para etapa e descarte, e não para temperatura, que já muda em 1 toque. O filtro por origem e empreendimento veio do pedido dos gerentes (`docs/gerentes-necessidades.md`).

**29/10/2026, item 10:** regras em `docs/visitas.md`. Diferenças em relação à recomendação e à Bruna: a visita tem também "confirmada" e "não compareceu"; "aguardando baixa" é só da tela (a visita aberta que passou do horário); a baixa só vale depois do horário e carimba quem deu e quando, no banco; status final só muda pela correção com motivo (o Desfazer do cancelamento também passa por ela); o gerente dá baixa e corrige na equipe com a permissão nova `visitas.baixa_equipe`, mas não agenda nem cancela. A confirmação usa a variável nova `{visita}`. Ficaram de fora o agendar pela Agenda (`lead-picker`), o lembrete push e o comprovante por foto (é um link).

**29/10/2026, itens 11 e 12:** regras em `docs/vendas-metas.md`. Diferenças em relação à recomendação e à Bruna: a venda conta no mês da assinatura e o VGV válido é o das vendas assinadas e pagas (as duas visões aparecem); quem registra é o corretor dono do lead, pela ficha, e a etapa Venda só vem do registro; quem corrige, cancela e reativa é o gerente (`vendas.corrigir_equipe`), sempre com motivo no histórico, e não há exclusão; a meta anual tem valor geral e por corretor, definidos pelo gerente geral, com ritmo por mês até dezembro (a Bruna usa por semana) e projeção a partir de abril; as metas próprias têm leads cadastrados, primeiros contatos, visitas realizadas, vendas e VGV (sem comissão, atendimento em 15 min e prospecção), com os períodos, o card, o formulário e os textos da Bruna, e aparecem na lista do dia. A conversão por campanha aparece com a permissão `painel.campanha`, que no padrão é só do corretor. A conversão ganhou ticket e ciclo médio; o tempo médio de resposta e o atendimento em 15 min ficaram de fora. A tabela completa do que veio da Bruna está em `docs/vendas-metas.md`, seção 11. A premiação por faixas de VGV entrou numa tela só do gerente geral.
