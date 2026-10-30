# Visitas e agenda

> Construído em 29/10/2026 a partir do item 10 de `docs/referencia-crm-bruna.md` (seção 8), adaptando a agenda do CRM da Bruna (`ref/CRM Bruna/src/components/agenda/`). As regras do lead estão em `docs/leads.md`, o painel em `docs/painel.md` e os perfis em `docs/acessos-perfis.md`.

## Sumário
1. O que entrou e o que ficou de fora
2. A visita e seus estados
3. Agendar, confirmar, remarcar e cancelar
4. Baixa auditável e correção
5. A visita move o lead
6. Telas
7. Quem vê e quem faz
8. Como ajustar
9. Testes

## 1. O que entrou e o que ficou de fora

- **Entrou:** tabela `visitas` com RLS, agendar pela ficha, confirmar pelo WhatsApp com o modelo "Confirmar visita", baixa em 1 toque (realizada ou não compareceu), remarcar, cancelar com Desfazer, correção com motivo, comprovante opcional (link), visitas no topo da lista do dia, página Agenda (semana) para o corretor e o gerente, e as visitas por corretor no painel.
- **Ficou de fora:** agendar pela própria Agenda (escolhendo o cliente, o `lead-picker` da Bruna), lembrete push antes da visita (item 15), upload de foto (o comprovante é um link), endereço do empreendimento na mensagem (espera a tabela de empreendimentos, item 13) e a foto para a recepção (etapa da recepção).

## 2. A visita e seus estados

Cada visita tem lead, corretor, empreendimento, dia e hora, local (opcional), status, observação (opcional), quem deu a baixa e quando, e o comprovante (opcional). Não há exclusão: a visita desmarcada fica como cancelada.

| Status | Na tela | Quando |
| --- | --- | --- |
| Agendada | `→ Agendada` | Ao agendar e ao remarcar |
| Confirmada | `✓ Confirmada` | O corretor tocou em "Cliente confirmou" |
| (aberta e já passou) | `! Aguardando baixa` (âmbar) | O horário passou e ninguém deu a baixa. É só da tela, não é um status no banco |
| Realizada | `✓ Realizada` (verde) | Baixa depois do horário |
| Não compareceu | `✕ Não compareceu` (vermelho) | Baixa depois do horário |
| Cancelada | `✕ Cancelada` | O corretor cancelou |

As regras puras ficam em `crm/src/lib/visitas.ts`, com testes. As regras que valem ficam no banco (gatilho `visitas_guard`).

## 3. Agendar, confirmar, remarcar e cancelar

- **Agendar:** na ficha, card Visitas, "+ Agendar visita". Dia e hora com os atalhos do próximo contato (padrão amanhã, 10h), empreendimento (vem o do lead, com os nomes do catálogo como sugestão e o aviso "! Não está no catálogo", `docs/empreendimentos.md`, seção 12), local e observação opcionais. Só o dono do lead agenda, só para lead ativo e só de agora em diante (o banco aceita 10 min de folga).
- **Confirmar:** "Confirmar no WhatsApp" abre o diálogo de mensagem com o modelo "Confirmar visita" já marcado. A variável nova `{visita}` vira "amanhã, às 10h, em Stand de vendas" ("hoje, às 18h", "na quinta-feira, 05/11, às 10h"). Fora da confirmação, vira "no dia combinado". O `{empreendimento}` é o da visita. Quando o cliente responde, o corretor toca em "✓ Cliente confirmou".
- **Texto do modelo:** o `schema.sql` troca o texto de "Confirmar visita" para incluir `{visita}` só se ele ainda for o original. Se o gerente geral já ajustou, nada muda; ele pode incluir `{visita}` em Configurações.
- **Remarcar:** novo dia e hora, de agora em diante. A visita confirmada volta para agendada, porque a confirmação era do horário antigo. O histórico guarda o horário antigo e o novo.
- **Cancelar:** 1 toque, sem confirmação, com Desfazer no rodapé por 8 segundos. O Desfazer passa pela correção com o motivo "Cancelamento desfeito", então fica registrado.

## 4. Baixa auditável e correção

A visita realizada vai alimentar outro módulo depois da reunião de novembro (`docs/pontuacao-verba.md`). Por isso a baixa é auditável e as regras ficam no banco, não no app. As telas não citam esse uso.

- **Baixa em 1 toque:** "✓ Realizada" ou "✕ Não compareceu", só depois do horário da visita. Antes do horário o botão não aparece, e o banco recusa ("A baixa só pode ser dada depois do horário da visita").
- **Quem e quando:** `baixa_por` e `baixa_em` são carimbados pelo gatilho com o usuário da sessão e a hora do banco. O app não consegue gravar essas colunas. O card mostra "Baixa por Carla · Hoje, 15:20".
- **Observação e comprovante:** opcionais, depois da baixa, em "+ Observação e comprovante". O comprovante é um link (`https://…`, por exemplo a foto no Drive) e só vale na visita realizada. Cada troca de comprovante vai para o histórico.
- **Status final não volta sem registro:** realizada, não compareceu e cancelada só mudam pela função `corrigir_visita(visita, status, motivo)`, com motivo de 3 letras ou mais. O histórico mostra "Visita corrigida: Realizada → Não compareceu. Motivo: …", com quem corrigiu. A correção para realizada ou não compareceu também só vale depois do horário, e carimba de novo quem deu a baixa.
- **Histórico:** `lead_eventos` ganhou a coluna `visita_id` e três tipos: `visita` (mudança de status, de/para, com o motivo da correção no detalhe), `visita_horario` (remarcação) e `visita_comprovante`. Quem grava é o gatilho `visita_registra_eventos`; o app não escreve em `lead_eventos`.

## 5. A visita move o lead

Gatilho `visita_atualiza_lead`. A etapa nunca volta, nem no cancelamento nem na correção.

- **Agendar** (ou reabrir pela correção) leva o lead de novo, em contato ou aguardando lançamento para **visita agendada**. Isso também encerra o prazo do primeiro contato.
- **Realizada** leva o lead de novo, em contato, aguardando lançamento ou visita agendada para **visita realizada**. Também conta como conversa: a última interação vira "Visita realizada: Mirai" e as tentativas zeram.
- **Não compareceu e cancelada** não mexem no lead.
- O lead em proposta ou venda continua onde está.
- As mudanças de etapa saem no histórico como automáticas.

## 6. Telas

| Onde | O que mostra |
| --- | --- |
| Lista do dia (`/`) | No topo, acima de "Aguardando primeiro contato": **Visitas de hoje** (as que ainda vão acontecer, pelo horário) e **Aguardando baixa** (as abertas que já passaram, de hoje ou de antes, da mais antiga para a mais nova) |
| Agenda (`/agenda/`) | A semana de segunda a domingo, com "← Anterior", "Seguinte →" e "Voltar para hoje", a faixa dos 7 dias com o total de cada um (sem as canceladas) e as visitas do dia escolhido. No topo, as que aguardam baixa, de qualquer semana. O gerente filtra por corretor e vê o nome do corretor em cada card. A semana, o dia e o corretor ficam no endereço (`?d=2026-10-29&c=<id>`) |
| Ficha (`/leads/ficha/?id=`) | Card Visitas, com as abertas primeiro, o "+ Agendar visita" e os eventos da visita no histórico |
| Painel (`/painel/`) | Tabela "Visitas no período, por corretor": agendadas, realizadas, não compareceu e aguardando baixa. No relatório do corretor, os mesmos quatro números |

- **No painel, a conta é pela data da visita** dentro do período. Agendadas são todas as visitas marcadas para o período, menos as canceladas, então incluem as realizadas, as de não compareceu e as que aguardam baixa.
- Card da visita: hora (ou dia e hora), cliente, empreendimento e local, o selo, e as ações do momento. Antes do horário: Confirmar no WhatsApp, Cliente confirmou, Remarcar, Cancelar. Depois do horário: a baixa e, para o corretor, Remarcar e Cancelar. Com baixa: observação, comprovante e Corrigir.
- Se o SQL das visitas ainda não rodou, a lista do dia e o painel seguem sem as visitas. A ficha e o painel leem `lead_eventos.visita_id`, então pedem o SQL antes de publicar o front.

## 7. Quem vê e quem faz

| Quem | Vê | Faz |
| --- | --- | --- |
| Corretor (`leads.cadastrar`) | As próprias visitas | Agenda nos próprios leads, confirma, remarca, cancela, dá baixa, anota e corrige |
| Gerente (`dados.ver_equipe` + `visitas.baixa_equipe`) | As visitas da equipe | Dá baixa, anota, põe o comprovante e corrige com motivo. Não agenda, não remarca, não confirma e não cancela |
| Gerente geral | Todas | O mesmo que o gerente, em qualquer equipe |
| Recepção, desativado e visitante | Nada | Nada |

- A leitura usa `pode_ver_dados_de(corretor_id)`. O corretor da visita é o dono do lead quando ela foi agendada e não muda depois.
- Permissão nova **`visitas.baixa_equipe`** ("Dar baixa e corrigir as visitas da equipe"), padrão para o gerente. Sem ela, o gerente só vê.

## 8. Como ajustar

- **Permissão:** `visitas.baixa_equipe` em Configurações > Permissões por perfil. O padrão só entra na primeira vez.
- **Mensagem:** "Confirmar visita" em Configurações > Mensagens prontas. A variável `{visita}` aparece na lista de variáveis do editor.
- **Folga de "agora"** ao agendar e remarcar: `v_folga` em `visitas_guard` e `FOLGA_MINUTOS` em `visitas.ts` (10 min).
- **Horário sugerido:** `sugerirHorarioVisita` em `visitas.ts` (amanhã, 10h).

## 9. Testes

- `npm test` (`visitas.test.ts`): estados e aguardando baixa, regras de baixa e remarcação, ordem das visitas de hoje e das que aguardam baixa (com a virada do dia), semana de segunda a domingo com as canceladas no fim, textos de `{visita}` e da data, validação do agendamento e do comprovante, números do painel e os textos do histórico.
- `npm run test:banco` (`supabase/testes/visitas.test.mjs`, 13 testes): permissão padrão que sobrevive ao ajuste, agendar (só o dono, só lead ativo, só de agora em diante, sem gravar status nem baixa), RLS por perfil (corretor, colega, gerente da equipe e de outra, gerente geral, recepção, desativado e anônimo), confirmar e remarcar, baixa só depois do horário com quem e quando carimbados, correção com motivo, gerente que dá baixa mas não agenda nem cancela, cancelar e desfazer, comprovante, sem exclusão e o texto da mensagem.
- Telas conferidas em 375px com um Supabase falso (`sqltest/fake-supabase-visitas-v5.mjs`, na pasta de notas).
