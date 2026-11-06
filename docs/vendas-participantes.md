# Venda com mais de um vendedor e registro pelo gerente

> **Desenho com as respostas do Felipe de 05/11/2026** (seção 14): P1, P3 a P11 decididas; **P2 (verba) e P12 (como conta a parte do gerente) em aberto**, esperando a regra nova de pontos. Etapa 1 de `docs/codex-vendas-participantes.md`. Nada foi implementado: não há SQL de produção nem código em `crm/src`. As regras de hoje estão em `docs/vendas-metas.md`. A venda de parceiro vem de `docs/codex-parcerias.md` (item 18) e de `docs/codex-parcerias-etapa5.md`. O mockup é `docs/mockups/vendas-participantes.html`.

## Sumário
1. O que muda, em uma frase por pessoa
2. Banco: tabelas e colunas
3. Regras que o banco garante
4. Funções novas e alteradas
5. RLS e permissões
6. Migração e ordem de subida
7. Contas: onde cada parte entra
8. Exemplo: venda 50/30/20 de R$ 600.000
9. Fluxo do "Pedir registro da venda"
10. Telas que mudam
11. Funções do app que mudam
12. Venda de parceiro (para a frente de Parcerias)
13. Riscos
14. Decisões do Felipe e o que continua em aberto
15. Testes da etapa 2
16. Da Bruna

## 1. O que muda, em uma frase por pessoa

- **Corretor:** deixa de registrar a venda e de marcar como paga. Na ficha, toca em "Pedir registro da venda", preenche o que sabe e o gerente recebe o aviso. Vê as vendas em que participa e a parte dele.
- **Gerente:** registra a venda nos leads da equipe, com a divisão entre os vendedores (e pode entrar nela, P5), e marca como paga. **Deixa de corrigir e cancelar** (P3). Recebe os pedidos de registro da equipe.
- **Operacional:** ganha `dados.ver_todos` (P1). Registra, marca como paga, corrige e cancela em qualquer venda (P3 e P10).
- **Gerente geral:** tudo, como hoje. As Faixas de VGV continuam só dele, calculadas com as partes.

## 2. Banco: tabelas e colunas

Tudo no trecho de vendas do `crm/supabase/schema.sql` (seção "Vendas e metas"), idempotente, como o resto do arquivo.

### `venda_participantes` (nova)

Uma linha por participante da venda.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | uuid | Chave |
| `venda_id` | uuid | `references vendas on delete restrict` |
| `tipo` | text | `corretor`, `gerente` ou `parceiro` |
| `perfil_id` | uuid null | `references profiles`. Preenchido em `corretor` e `gerente` |
| `parceiro_id` | uuid null | Preenchido só em `parceiro`. **Sem FK aqui**: `public.parceiros` nasce em `parcerias.sql`, que roda depois. A FK entra por `alter table` em `parcerias.sql`, como o `leads.parceiro_id` |
| `percentual` | numeric(5,2) | `> 0` e `<= 100`, duas casas |
| `equipe_id` | uuid null | A equipe da parte **na hora do registro** (pergunta P7). Corretor: `profiles.equipe_id`. Gerente: a equipe de que ele é `teams.gerente_id`. Parceiro: a equipe do gerente que participa |
| `criado_em` | timestamptz | Carimbo |

- Checks: `(tipo = 'parceiro') = (parceiro_id is not null)` e `(tipo = 'parceiro') = (perfil_id is null)`.
- Únicos: `(venda_id, perfil_id)` e `(venda_id, parceiro_id)`. Ninguém aparece duas vezes.
- Índices: `(perfil_id)` para "minhas vendas" e `(venda_id)`.

### `vendas` (alterada)

- **`corretor_id` sai.** Com o gerente registrando, o `default auth.uid()` gravaria o gerente como corretor, e a venda de parceiro não tem corretor da casa. Quem vendeu passa a ser a lista de participantes.
- **`lead_dono_id` entra** (uuid null, `references profiles`): o dono do lead no registro, gravado pelo banco. Serve para a venda continuar visível ao gerente da equipe do lead mesmo que nenhum participante seja da equipe dele.
- `registrada_por` continua. Passa a ser o gerente ou o operacional.
- O índice `vendas_corretor_assinada_idx` dá lugar a `(assinada_em)`.

### `venda_pedidos` (nova)

O pedido do corretor. Não toca em `leads`.

| Coluna | Regra |
| --- | --- |
| `id` | Gerado no aparelho, como na venda (reenvio não duplica) |
| `lead_id` | O lead do pedido |
| `pedido_por` | Quem pediu, gravado pelo banco |
| `empreendimento`, `unidade`, `vgv`, `assinada_em`, `observacao` | O que o corretor sabe. Só o empreendimento é obrigatório; o resto o gerente completa |
| `divisao_sugerida` | jsonb, opcional: `[{perfil_id, percentual}]`. Só sugestão, o gerente decide |
| `status` | `aberto`, `registrado`, `devolvido` ou `cancelado` |
| `venda_id` | A venda criada, quando registrado |
| `motivo_devolucao`, `decidido_por`, `decidido_em` | Carimbos do banco |
| `criado_em` | Carimbo |

- Um pedido `aberto` por lead (índice único parcial).
- Só em lead ativo.

### Outras

- `lead_eventos.tipo` ganha `venda_pedido` (pedido, devolvido, cancelado, registrado). O check fica no trecho de vendas, como hoje.
- `fechamentos_verba.vendas` passa de `integer` para `numeric(6,2)`, porque a parte de 0,5 venda precisa caber na foto do mês.

## 3. Regras que o banco garante

- **Soma 100%:** um gatilho de restrição `deferrable initially deferred` em `venda_participantes` (insert, update e delete) confere, no fim da transação, que a soma da venda é exatamente 100,00.
- **Venda sem participante:** um segundo gatilho de restrição adiado, em `vendas` (insert), confere que a venda tem participantes. Sem ele, uma venda gravada sozinha passaria, porque o gatilho da tabela filha nem dispara.
- **Dois tipos de venda, sem mistura (P6, 05/11/2026):**
  - **Venda da casa:** ao menos um `corretor`; o `gerente` pode entrar (P5); nenhum `parceiro`.
  - **Venda de parceiro:** ao menos um `parceiro` e um `gerente`; nenhum `corretor`.
  - O gerente nunca vende sozinho (`docs/codex-parcerias.md`, item 18): uma venda só com gerente é recusada.
  - O mesmo gatilho adiado da soma confere isso no fim da transação, também na correção da divisão.
- **Quem pode ser cada tipo**, sem `if (role === ...)`:
  - `corretor`: perfil ativo com a permissão `leads.cadastrar` no catálogo, a mesma marca de "corretor" que o app já usa (Meus pontos e a policy de registro de hoje). Um corretor desativado só entra pela migração e pelo SQL Editor.
  - `gerente`: perfil ativo que é `teams.gerente_id` de alguma equipe.
  - `parceiro`: um parceiro existente. A regra fina (o parceiro do lead, o gerente dono do parceiro) é de Parcerias.
- **Gravação só por função:** o app não tem `insert` nem `update` direto em `vendas` e `venda_participantes`. Toda escrita passa por RPC, porque cada chamada do supabase-js é uma transação própria e a soma de 100% só fecha com a venda e os participantes na mesma transação.
- `vendas_guard`, `venda_atualiza_lead`, `venda_registra_eventos` e `leads_venda_guard` continuam. A etapa Venda continua vindo só da venda registrada.

## 4. Funções novas e alteradas

| Função | Novo ou muda | O que faz |
| --- | --- | --- |
| `registrar_venda(p_id, p_lead, p_campos jsonb, p_participantes jsonb, p_pedido uuid null)` | Nova, `security definer` | Confere `vendas.registrar`, o lead ativo e visível (`pode_ver_dados_de(dono)`), grava a venda e os participantes numa transação, carimba `lead_dono_id` e as equipes, e fecha o pedido (`registrado`, com `venda_id`). Idempotente pelo `p_id`: se a venda já existe igual, devolve ok |
| `marcar_venda_paga(p_venda, p_data)` | Nova, `security definer` | Confere `vendas.pagar` e `private.pode_ver_venda`. Pendente → pago, sem motivo |
| `corrigir_venda(p_venda, p_campos, p_motivo)` | Muda: passa a `security definer`, com as conferências explícitas | Aceita a chave `participantes` em `p_campos`, que troca a lista inteira. Confere `vendas.corrigir_equipe` (só o operacional e o gerente geral, P3) e `private.pode_ver_venda`. O histórico grava o antes e o depois |
| `pedir_registro_venda(p_id, p_lead, p_campos, p_divisao)` | Nova, `security definer` | Confere `vendas.pedir_registro`, o lead ativo e do próprio corretor, e um pedido aberto por lead. Grava o evento `venda_pedido` |
| `devolver_pedido_venda(p_pedido, p_motivo)` | Nova | Quem tem `vendas.registrar` e vê o lead. Motivo obrigatório. O corretor vê o motivo na ficha |
| `cancelar_pedido_venda(p_pedido)` | Nova | Só quem pediu, enquanto aberto |
| `vendas_partes(p_ini, p_fim, p_pessoa uuid null)` | Nova, `security definer`, só leitura | Uma linha por parte das vendas assinadas em `[ini, fim)` que a pessoa vê: os campos da venda, o tipo, a pessoa ou o parceiro, o nome, a equipe, o percentual, a fração (percentual ÷ 100) e o VGV da parte. Traz o nome do cliente e o `created_at` do lead (para o ciclo médio) mesmo quando o participante de outra equipe não vê o lead. O nome do parceiro só vai para quem vê o parceiro; para os demais, "Parceiro" |
| `vendedores_para_venda()` | Nova, `security definer` | Corretores ativos de todas as equipes (id, nome, equipe) e, para a venda de parceiro, os gerentes. Só para quem tem `vendas.registrar` ou `vendas.pedir_registro`. O nome dos corretores já é público no ranking |
| `private.pode_ver_venda(p_venda)` | Nova, `security definer` | Uma consulta só (lição do teste de carga, `docs/teste-carga.md`, achado 10): a pessoa é participante, ou vê os dados de algum participante pela mesma regra de `pode_ver_dados_de`, ou vê o `lead_dono_id`, ou registrou a venda. Usada pelas policies das duas tabelas, o que evita a recursão "infinite recursion detected in policy" de uma policy de `vendas` que lê participantes e vice-versa |
| `vendas_guard` | Muda | Tira `new.corretor_id := old.corretor_id`. Marcar como paga confere `vendas.pagar` (hoje o caminho de pagar não confere permissão nenhuma; a policy é que barrava) |
| `venda_registra_eventos` | Muda | O evento de registro leva a divisão no `para` ("Ana 50% · Bruno 30% · Carla 20%"), com cópia dos nomes |
| Gatilho em `venda_participantes` | Novo | Grava `venda_correcao` com `{"participantes": [...]}` no de/para, com os nomes copiados, porque quem lê o histórico pode não ver o perfil de outra equipe |
| `ranking_pontos`, `leads_perdidos`, `montarPainel` (lado do banco) | Não mudam | O ranking é de pontos (seção 7) |

## 5. RLS e permissões

### Permissões no catálogo (`permissions` e `role_permissions`)

| Slug | Descrição na tela | Padrão (só na criação) |
| --- | --- | --- |
| `vendas.registrar` (nova) | Registrar vendas, com a divisão, e devolver pedidos de registro | Gerente, operacional |
| `vendas.pagar` (nova) | Marcar a venda como paga | Gerente, operacional |
| `vendas.pedir_registro` (nova) | Pedir ao gerente o registro da venda | Corretor |
| `vendas.corrigir_equipe` (existe, muda) | Corrigir e cancelar qualquer venda, com o motivo | **Operacional** (P3 e P10). O gerente **perde**: no banco existente, a troca roda uma vez (seção 14) |
| `dados.ver_todos` (existe) | Ver os dados de todas as equipes | Ganha o **operacional** (P1), uma vez, pelo mesmo mecanismo |

O gerente geral tem todas (`has_permission`). Os padrões entram só na criação da permissão, como em todo o schema, para não desfazer o que o Felipe mudar em Configurações → Permissões.

### Policies

- **`vendas`:** só `select`, com `private.pode_ver_venda(id)`. Sem `insert` e `update` para `authenticated`: as funções gravam.
- **`venda_participantes`:** só `select`, com `private.pode_ver_venda(venda_id)`: quem vê a venda vê a divisão inteira (P4).
- **`venda_pedidos`:** `select` para quem pediu e para quem vê o dono do lead (`pode_ver_dados_de`). Sem escrita direta.
- **O corretor perde:** a policy "registrar venda" sai, e "alterar venda" sai junto. Ele não registra nem marca como paga, nem por chamada direta à API.
- **Quem vê o quê:**
  - Corretor: as vendas em que participa, inteiras, com a divisão (P4).
  - Gerente: as vendas com alguém da equipe dele, as do lead de alguém da equipe e as que ele registrou.
  - Operacional: todas, com `dados.ver_todos` (P1).
  - Gerente geral: todas.

## 6. Migração e ordem de subida

O mesmo SQL, idempotente:

1. Cria `venda_participantes`, `venda_pedidos` e as permissões.
2. Cada venda sem participante ganha um: `tipo = 'corretor'`, `perfil_id = vendas.corretor_id`, `percentual = 100`, `equipe_id` = a equipe atual do corretor (é a melhor informação que existe). **Não conferido:** quantas vendas há hoje no Supabase do Felipe e se são só de teste. Se houver venda real de corretor que trocou de equipe, a equipe gravada pode não ser a da época.
3. `vendas.lead_dono_id = vendas.corretor_id`.
4. Recria as policies e os gatilhos sem `corretor_id` e, por último, apaga a coluna (`alter table ... drop column if exists`).
5. `fechamentos_verba.vendas` vira `numeric(6,2)`.

**Ordem:** o SQL e o site novo sobem juntos. Com o SQL novo e o site velho, a leitura de `vendas.corretor_id` quebra. O CRM ainda não foi publicado (sobe depois da recepção e da revisão visual), então não há usuário no meio da troca. A função `avisos` sobe depois (seção 9).

**Teste da migração:** um banco com vendas no formato antigo, a foto dos números antes (por corretor e mês: assinadas, VGV assinado, pagas, VGV válido; a faixa; a verba; a meta anual) e a mesma foto depois do SQL. Têm de ser iguais.

## 7. Contas: onde cada parte entra

- **Parte do VGV** = VGV da venda × percentual ÷ 100. **Quantidade** = percentual ÷ 100 (0,5 venda). Guardadas exatas (`numeric`), somadas antes de arredondar, e arredondadas só na tela.
- **Equipe da parte:** a gravada no registro (P7).
- **Só a parte do corretor** entra nas contas do corretor: meta anual, metas próprias e faixas. A parte do parceiro entra na soma da equipe e da empresa, na linha "Com parceiros". **A parte do gerente** (que pela P5 pode estar em qualquer venda) fica, até a P12, fora das contas de corretor e numa linha própria do gerente no painel da equipe, somando no total da equipe e da empresa.
- **Ponto de encaixe da verba (P2 em aberto):** o teto de 280 pontos acabou e a regra nova vem do Felipe, com pontos também para gerentes. A etapa 2 entrega, por pessoa e mês, a **quantidade** (soma das frações) e o **VGV das partes**, assinado e pago, numa função só (`partesDoMes(pessoa, mês)` em `lib/vendas.ts`). O `calcularVerba` passa a receber esse resumo e não muda de regra nesta frente: a regra nova se pluga nele. O fechamento grava a quantidade com casas.
- **Empresa:** número de vendas e VGV pelas vendas inteiras. **Ticket médio da empresa** = VGV ÷ vendas inteiras, como pedido.

| Onde | Como fica |
| --- | --- |
| `/vendas/` | Cada venda aparece uma vez, com a divisão. Os totais do topo são **da pessoa** (a parte dela) no "Minhas vendas". No "Vendas da equipe", os totais são as partes dos corretores da equipe, e a linha "Com parceiros" logo abaixo soma as partes do gerente e do parceiro. O gerente geral vê a empresa (vendas inteiras) |
| Painel da equipe: "Vendas no período, por corretor" | Por corretor: a quantidade e o VGV da parte. Nova linha "Com parceiros" (gerente e parceiro). A linha Equipe soma tudo |
| Painel: "Leads no período", coluna Vendas | **Continua contando leads** pelo dono, de `lead_eventos` (P8). É a jornada do lead, não a venda |
| Funil e conversão por origem | Continuam pelo lead (dono e origem). Não mudam |
| Ticket médio e ciclo médio do corretor | Ticket = VGV da parte ÷ quantidade da parte (dá o ticket cheio das vendas dele). Ciclo = média ponderada pela parte |
| Meta anual de VGV | VGV da parte, assinada e paga, no mês da assinatura |
| Metas próprias Vendas e VGV | Soma das quantidades e das partes. O alvo continua inteiro (`metas_contagem_inteira`); o progresso pode ter casas ("0,5 de 2") |
| Faixas de VGV (só o gerente geral) | Por corretor, o VGV da parte assinada e paga no mês. Vale a faixa mais alta |
| Verba (Pontos e Meus pontos) | **Em aberto (P2).** Recebe a quantidade e o VGV da parte de cada um; a regra vem depois |
| Ranking (`/ranking/`) | **Não muda.** É de pontos aprovados, e a venda não entra nele (P9). A divisão aparece em "Vendas no período, por corretor" |
| Painel: "Leads no período" | A coluna Vendas passa a se chamar **"Leads em venda"** (P8) |
| Fechamento do mês | Grava a quantidade com casas (1,5) |

**Textos com fração:** "0,5 venda", "1,5 venda", "2 vendas" (singular abaixo de 2, como na norma). Na meta: "Faltam 1,5 venda." A fração aparece com até duas casas ("0,33 venda").

## 8. Exemplo: venda 50/30/20 de R$ 600.000

Dados fictícios. Venda assinada em 20/11/2026 e paga em 25/11/2026, no Marco Zero One.

| Participante | Equipe | % | Quantidade | VGV da parte |
| --- | --- | --- | --- | --- |
| Ana Souza (dona do lead) | Equipe Paulo | 50 | 0,5 | R$ 300.000 |
| Bruno Lima | Equipe Paulo | 30 | 0,3 | R$ 180.000 |
| Carla Dias | Equipe Renata | 20 | 0,2 | R$ 120.000 |
| **Empresa** | | 100 | **1** | **R$ 600.000** |

| Onde | Resultado |
| --- | --- |
| Painel da Equipe Paulo, novembro | Ana 0,5 · R$ 300.000; Bruno 0,3 · R$ 180.000; Equipe **0,8 · R$ 480.000** |
| Painel da Equipe Renata, novembro | Carla 0,2 · R$ 120.000; Equipe **0,2 · R$ 120.000** |
| Empresa (gerente geral) | **1 venda · R$ 600.000**, ticket médio R$ 600.000 |
| Ticket médio da Ana | R$ 300.000 ÷ 0,5 = R$ 600.000 |
| Meta anual (R$ 10.000.000) | Ana +3,00%; Bruno +1,80%; Carla +1,20% |
| Meta própria da Ana "Vendas · Novembro", alvo 2 | 0,5 / 2. "Faltam 1,5 venda." |
| Faixas de VGV, novembro | Só esta venda: ninguém chega a R$ 1.000.000. Se a Ana tiver mais R$ 800.000 pagos no mês, soma R$ 1.100.000 e entra na faixa de R$ 1.000.000 (R$ 2.000) |
| Verba (P2 em aberto) | A regra recebe: Ana 0,5 venda · R$ 300.000; Bruno 0,3 · R$ 180.000; Carla 0,2 · R$ 120.000. O valor em R$ depende da regra nova |
| Ranking | Não muda |
| Painel "Leads no período", coluna "Leads em venda" | 1 lead, na linha da Ana (dona do lead) |

**Venda de parceiro (para comparar):** R$ 400.000, Imobiliária Vila Nova 50% e o gerente Paulo 50%. Nenhum corretor recebe nada. O painel da Equipe Paulo ganha a linha "Com parceiros: 1 · R$ 400.000", e a empresa soma 1 venda e R$ 400.000.

**Arredondamento:** 33,33/33,33/33,34 de R$ 500.000 dá R$ 166.650 + R$ 166.650 + R$ 166.700 = R$ 500.000. As partes ficam exatas no banco; a tela arredonda cada número só ao mostrar, e os totais são somados antes.

## 9. Fluxo do "Pedir registro da venda"

1. **Corretor, na ficha:** no card Venda, "+ Registrar venda" vira **"Pedir registro da venda"**. Escolher a etapa Venda abre o mesmo pedido, e a etapa não muda.
2. **O pedido** traz o empreendimento (do lead), a unidade, o VGV, a data da assinatura, "Dividiu a venda?" com os colegas e as porcentagens (sugestão) e a observação. Botão vermelho "Pedir registro". Fica rascunho no aparelho, como a venda hoje.
3. **Na ficha:** "! Registro pedido em 05/11/2026. Aguardando o gerente." e "Cancelar pedido". O histórico ganha "Registro da venda pedido ao gerente".
4. **Aviso ao gerente da equipe do dono do lead:**
   - No celular, pelo tipo **Equipe** que já existe (não muda o check de `push_assinaturas`). Título "Pedido de registro de venda", texto "Ana Souza pediu o registro da venda de Marcos Pereira · Marco Zero One.", abrindo o pedido. Chave `pedido_venda:<pedido>`, na hora por gatilho, como o lead atribuído, e de novo na rodada de 5 min se o primeiro envio falhar.
   - No sistema: em `/vendas/`, o card "Pedidos de registro" no topo, e o atalho no início do gerente com o número de pedidos abertos.
   - O operacional vê todos os pedidos em `/vendas/` (sem aviso no celular; ele não tem equipe).
5. **Gerente:** abre o pedido, que vem preenchido. Confere, ajusta a divisão (o padrão é a dona do lead com 100%, ou a sugestão do corretor) e toca em "Registrar venda". O lead vai para Venda, o pedido fica "registrado" e o corretor vê a venda na ficha.
6. **Ou devolve:** "Devolver ao corretor", com motivo. A ficha mostra "✕ Pedido devolvido: falta a data da assinatura." e o corretor pode pedir de novo.

**Dependência:** o aviso precisa da Edge Function `avisos` (novo aviso e chave) e de `avisos_dados` mandar os pedidos abertos. A função não está nos arquivos permitidos desta frente: fica com a sessão das notificações ou com a autorização do Felipe. Sem ela, o pedido funciona e aparece em `/vendas/` e no início; só falta o aviso no celular.

## 10. Telas que mudam

| Tela | Arquivo | O que muda |
| --- | --- | --- |
| Ficha do lead, card Venda | `app/leads/ficha/page.tsx` (l. 411 a 514), `components/vendas/vendas.tsx` | O dono corretor vê "Pedir registro da venda" e o estado do pedido. Quem tem `vendas.registrar` vê "+ Registrar venda" e os pedidos do lead. A troca de etapa para Venda abre o pedido ou o registro |
| Registrar venda | `RegistrarVenda`, `NovaVenda` | Seção "Divisão": a dona do lead com 100%; "+ Outro vendedor" busca em `vendedores_para_venda()` (de qualquer equipe), com a porcentagem; a soma aparece ao vivo ("Soma 100% ✓" ou "! Soma 80%. Falta 20%"); "Dividir igual" reparte. O botão só libera com 100% |
| Card da venda | `CardVenda` | Mostra a divisão ("Ana 50% · Bruno 30% · Carla 20%") e, para o participante, "Sua parte: R$ 300.000 (50%)". "Marcar como paga" só com `vendas.pagar` (hoje: `corretor_id === eu.id` na linha 250) |
| Corrigir | `Corrigir` | **Só o operacional e o gerente geral** (P3). O gerente vê "Para corrigir ou cancelar, fale com o operacional." Pode mudar a divisão, com motivo. O histórico mostra "Venda corrigida: Divisão Ana 50% · Bruno 50% → Ana 50% · Bruno 30% · Carla 20%. Motivo: …" |
| `/vendas/` | `app/vendas/page.tsx` | Card "Pedidos de registro" (gerente e operacional). Filtro por pessoa via participante. Totais pela parte. "+ Registrar venda" só com `vendas.registrar`; para o corretor, a página não tem botão de registro e explica "Para registrar uma venda, peça na ficha do lead." |
| Painel | `app/painel/page.tsx` (l. 141, 179, 630) | Vendas do período pelas partes; linha "Com parceiros"; relatório do corretor com a parte dele |
| Metas | `components/metas/metas.tsx` (l. 73, 156, 159), `app/metas/page.tsx` | Meta anual e tabela por corretor pelas partes; progresso com casas |
| Faixas de VGV | `app/faixas/page.tsx` | Pelas partes |
| Pontos e Meus pontos | `app/programa/page.tsx` (l. 65, 157), `app/meus-pontos/page.tsx` (l. 60 a 62, 104) | Quantidade com casas ("1,5 venda paga"); o valor da verba espera a P2 |
| Início do gerente | `app/page.tsx` | Atalho "Pedidos de registro" com o número |
| Avisos neste aparelho | (nenhuma mudança de tela) | O tipo Equipe passa a explicar também o pedido de registro |

## 11. Funções do app que mudam

| Função | Arquivo | Mudança |
| --- | --- | --- |
| `Venda`, `COLUNAS_VENDA` | `lib/vendas.ts` | Sem `corretor_id`; com `lead_dono_id` e `participantes` |
| `ParteVenda` (novo tipo) | `lib/vendas.ts` | A venda + tipo, pessoa, parceiro, nome, equipe, percentual, fração e VGV da parte |
| `somarVendas` | `lib/vendas.ts` | Recebe partes: soma frações e VGV das partes. `somarVendasInteiras` para a empresa |
| `totaisPorCorretor` | `lib/vendas.ts` | Agrupa por `perfil_id` das partes `corretor` |
| `ticketECiclo` | `lib/vendas.ts` | Ponderado pela parte |
| `descreverEventoVenda` | `lib/vendas.ts` | Divisão no registro e na correção; eventos do pedido |
| `formatarParte`, `textoDivisao`, `somaDivisao` (novos) | `lib/vendas.ts` | "0,5", "Ana 50% · Bruno 30%", conferência de 100% na tela |
| `faixasDoMes` | `lib/faixas.ts` | Pelas partes de corretor |
| `progressoAnual`, progresso das metas próprias, `textoRitmo` | `lib/metas.ts` | Partes; frases com fração |
| `partesDoMes` (novo) | `lib/vendas.ts` | Por pessoa e mês: quantidade e VGV das partes assinadas e pagas. É a entrada da verba |
| `resumoDoMes`, `calcularVerba` | `lib/programa.ts` | Recebem o resumo de `partesDoMes`. A regra de pontos e verba fica para a P2 |
| `Fechamento.vendas` | `lib/programa-dados.ts` | Número com casas |
| `useVendas`, `useVendasDoAno` | `lib/vendas-dados.ts` | Leem `vendas_partes` (RPC, em páginas de 1.000) |
| `useDadosMetas` | `lib/vendas-dados.ts` | Vendas pelas partes da pessoa |
| `registrarVenda`, `marcarPaga`, `corrigirVenda` | `lib/vendas-dados.ts` | Chamam as RPCs; a correção leva `participantes` |
| `pedirRegistro`, `devolverPedido`, `cancelarPedido`, `usePedidosVenda`, `useVendedores` (novos) | `lib/vendas-dados.ts` | O pedido e a lista de vendedores |
| `montarPainel`, `conversaoPorOrigem` | `lib/painel.ts` | A conta não muda (leads, P8); a coluna vira "Leads em venda" na tela |

## 12. Venda de parceiro (para a frente de Parcerias)

O que a estrutura entrega e o que fica com Parcerias:

- **Entrega:** participantes `parceiro` (com `parceiro_id`) e `gerente` (com `perfil_id`), a soma de 100% e a regra da P6: a venda de parceiro tem ao menos um parceiro e um gerente e **nenhum corretor da casa**; o banco recusa a mistura. A venda de parceiro é registrada pelo mesmo `registrar_venda`, no lead do gerente (origem Parceiro, dono = gerente), porque `pode_ver_dados_de(eu)` vale para o próprio gerente.
- **Parcerias precisa fazer, em `parcerias.sql`:**
  - a FK `venda_participantes.parceiro_id → parceiros(id)`, por `alter table ... add constraint` com conferência de existência;
  - se quiser, a regra "o parceiro da venda é o `parceiro_id` do lead" ou "um parceiro do gerente", num gatilho próprio ou numa função `private` que o `registrar_venda` chama se existir;
  - a view `parceiros_indicacoes` com "vendeu" = existe participante `parceiro` daquele parceiro em venda ativa.
- **Fica fora do ranking e das contas do corretor:** nenhuma parte de gerente ou parceiro entra em meta anual, metas próprias ou faixas.
- **Meta do gerente:** as partes `gerente` e `parceiro` ficam gravadas com a equipe. Como a parte do gerente conta (P12) e os pontos de gerente (P2) esperam a regra nova do Felipe; vale também para a parte do gerente na venda da casa (P5).
- **Dependência de Parcerias:** o gerente só registra no lead do qual é dono se a `leads.carteira_propria` (etapa 5 de Parcerias) já existir para a ficha. O `registrar_venda` não depende dela, porque é `security definer` e confere `pode_ver_dados_de`.
- **P6 decidida (05/11/2026):** não junta corretor da casa com parceiro.

## 13. Riscos

- **Visibilidade entre equipes:** Carla (Equipe Renata) não vê o lead nem o perfil da Ana pelas policies de hoje, que são da frente da distribuição. Por isso `vendas_partes` devolve o nome do cliente, os nomes dos participantes e o `created_at` do lead. Sem isso, a lista mostraria "Corretor" e o ciclo médio sumiria.
- **Desempenho:** `private.pode_ver_venda` roda por linha. Tem de ser uma consulta só, e o teste de carga do painel (`npm run test:carga`) precisa rodar de novo na etapa 4.
- **Mudança de regra para o corretor:** hoje ele registra; depois, pede. Precisa de aviso no treinamento e de a página `/vendas/` explicar onde pedir.
- **Mudança de regra para o gerente (P3):** hoje ele corrige e cancela as vendas da equipe; depois, só o operacional e o gerente geral. O operacional vira o caminho de toda correção e precisa estar pronto para isso no dia da troca.
- **Operacional com `dados.ver_todos` (P1):** passa a ver todos os leads de todas as equipes, não só as vendas.
- **Verba sem regra (P2):** até a regra nova, as telas Pontos e Meus pontos não podem mostrar valor de verba calculado pela regra antiga com partes. A etapa 3 combina com a sessão master o que essas telas mostram nesse meio tempo.
- **Coluna "Vendas" do painel x "Vendas no período":** uma conta leads (0 ou 1, pelo dono), a outra partes (0,5). Os nomes têm de deixar claro, para não confundir os corretores (P8).
- **Corretor que troca de equipe:** com a equipe gravada no registro, a venda antiga fica com a equipe antiga; com a atual, os números antigos mudam (P7).
- **Edge Function `avisos`:** fora dos arquivos permitidos. Sem ela, o gerente só vê o pedido ao abrir o sistema.
- **`leads_guard` (da frente da distribuição), conferido em 05/11/2026 só por leitura:** a escrita que vem de gatilho (`pg_trigger_depth() > 1`) passa antes da regra "só o dono altera". Por isso o gerente ou o operacional que registra leva o lead a Venda sem mexer no `leads_guard`. Se a distribuição mudar esse trecho, o registro quebra: o teste da etapa 2 cobre isso.
- **`leads.cadastrar` como marca de vendedor:** quem perder essa permissão em Configurações deixa de poder entrar como vendedor numa venda nova.
- **Ordem das frentes:** a distribuição automática mexe em `schema.sql` (leads). Esta frente só toca o trecho de vendas, mas as duas não podem rodar a suíte ao mesmo tempo.
- **Arredondamento:** as partes exatas evitam diferença de centavo nos totais. Uma porcentagem com mais de duas casas é recusada.

## 14. Decisões do Felipe e o que continua em aberto

### Respostas de 05/11/2026

| Pergunta | Resposta | Efeito no desenho |
| --- | --- | --- |
| P1. Como o operacional registra | **A.** Ganha `dados.ver_todos` no padrão | Vê leads e vendas de todas as equipes. Registra, paga, corrige e cancela em qualquer venda |
| P2. Parte de venda e a verba | **Em aberto.** O teto de 280 pontos não existe mais, e a regra dos pontos mudou, com pontos também para os gerentes. O Felipe traz a regra nova | O cálculo da verba não fica amarrado a regra nenhuma (seção 7, "Ponto de encaixe da verba") |
| P3. Quem corrige a divisão e cancela | **C.** Só o operacional e o gerente geral, em qualquer venda | **Mudança de regra:** o gerente perde a correção e o cancelamento (quadro abaixo) |
| P4. O participante vê a divisão inteira | **A.** Sim, nomes e porcentagens de todos | Policy de `venda_participantes` por `private.pode_ver_venda` |
| P5. Em que venda o gerente participa | **B.** Em qualquer venda, inclusive com corretores da casa | Sai a regra "gerente só com parceiro". Como a parte do gerente conta continua em aberto (P12) |
| P6. Corretor da casa junto com parceiro | **B.** Não junta | O banco separa a venda da casa da venda de parceiro (seção 3) |
| P7. Equipe da parte | **A.** A do dia do registro, gravada | `venda_participantes.equipe_id` |
| P8. Coluna "Vendas" de "Leads no período" | **A.** Vira "Leads em venda", pelo dono do lead | `montarPainel` só muda o rótulo |
| P9. "Ranking" | **A.** A divisão aparece em "Vendas no período, por corretor". O `/ranking/` de pontos não muda | |
| P10. Operacional corrige e cancela | **A.** Sim | Coerente com a P3 |
| P11. Tipo do aviso do pedido | **A.** Equipe | Seção 9 |

### Mudança de regra: o gerente deixa de corrigir e cancelar (P3)

| | Hoje (`docs/vendas-metas.md`, seção 2) | Depois |
| --- | --- | --- |
| Corrigir dados, voltar para pendente, cancelar, reativar, mudar a divisão | Gerente (`vendas.corrigir_equipe`, nas vendas da equipe) e gerente geral | **Operacional e gerente geral**, em qualquer venda |
| Marcar como paga | Corretor e gerente | Gerente, operacional e gerente geral (`vendas.pagar`) |
| Registrar | Corretor dono do lead | Gerente (leads da equipe), operacional e gerente geral |

- **No catálogo:** a permissão `vendas.corrigir_equipe` muda de descrição para "Corrigir e cancelar qualquer venda, com o motivo" e passa a valer em todas as vendas que a pessoa vê. O slug fica, para não quebrar o que já existe.
- **O padrão de hoje tem de mudar no banco existente**, e o padrão "só na criação" não alcança isso: o SQL da etapa 2 tira `('gerente', 'vendas.corrigir_equipe')` e põe `('operacional', 'vendas.corrigir_equipe')` **uma vez**, com uma marca em `app_settings` (por exemplo `vendas_participantes_padroes`) para não desfazer depois o que o Felipe mudar em Configurações → Permissões.
- **Na tela:** o gerente não vê mais "Corrigir" nem "Cancelar" no card da venda. No lugar, a linha "Para corrigir ou cancelar, fale com o operacional."
- **Docs a atualizar na etapa 3:** `docs/vendas-metas.md` (seções 1, 2, 7 e 9) e `docs/acessos-perfis.md` (o operacional com `dados.ver_todos` e as vendas).

### Em aberto

- **P2. Verba:** espera a regra nova de pontos do Felipe. Até lá, a etapa 2 entrega a parte (quantidade e VGV) de cada participante como entrada, e nada mais.
- **P12. Como conta a parte do gerente?** Pela P5 ele participa em qualquer venda. Depende da regra nova de pontos para gerentes (P2). Opções, a recomendada primeiro:
  - A (recomendada): a parte do gerente fica **fora** das contas de corretor (meta anual, metas próprias, faixas, "Vendas no período, por corretor"), entra na **linha própria do gerente** no painel da equipe e no total da equipe e da empresa, e fica pronta para a meta do gerente e os pontos de gerente quando a regra chegar.
  - B: a parte do gerente entra também nas tabelas de corretor, como mais uma linha.
  - C: a parte do gerente não conta em lugar nenhum, só aparece na divisão.

## 15. Testes da etapa 2

`npm run test:banco`, em `crm/supabase/testes/vendas.test.mjs` (estendido) e no novo `vendas-participantes.test.mjs`:

- soma diferente de 100 recusada (99, 101, lista vazia, venda sem participante);
- participante repetido recusado; venda só com gerente recusada; corretor junto com parceiro recusado (P6); venda de parceiro sem gerente recusada; gerente com corretores aceito (P5);
- migração: as fotos antes e depois iguais, por corretor e mês (assinadas, VGV, pagas, VGV válido, faixa e verba);
- partes em equipes diferentes: cada equipe vê a venda, com os nomes;
- corretor: não registra, não marca como paga, nem por `insert` ou `update` direto; pede e cancela o próprio pedido; um pedido aberto por lead;
- gerente: registra só nos leads da equipe; devolve com motivo; registrar fecha o pedido; o lead do corretor vai para Venda pelo gatilho, mesmo com o gerente como autor (passa pelo `leads_guard`);
- operacional: registra, paga, corrige e cancela em qualquer equipe (P1, P3, P10);
- gerente: não corrige nem cancela, nem pela RPC (P3); a troca dos padrões roda uma vez e não desfaz o que foi mudado em Configurações;
- correção da divisão com motivo, antes e depois no histórico, com os nomes;
- idempotência: o mesmo `p_id` duas vezes grava uma venda;
- painel, meta anual, metas próprias, faixas e a entrada da verba (`partesDoMes`) com as partes, com o exemplo da seção 8;
- `vendas_partes` não devolve o nome do parceiro a quem não o vê.

`npm test`: as funções puras da seção 11 com o exemplo 50/30/20, o 33,33/33,33/33,34 e os textos com fração.

## 16. Da Bruna

Procurado em 05/11/2026 em `ref/CRM Bruna/src` e `supabase/schema.sql`: o CRM da Bruna é de uma corretora só e **não tem venda dividida, participantes nem pedido de registro**. O mais perto é a meta "Comissão líquida", com a dica "já sem impostos e repasse de parceria" (`src/lib/performance.ts`, linha 439).

| Recurso da Bruna | Como fica | Por quê |
| --- | --- | --- |
| Venda com um dono só (a corretora) | **Adaptado:** lista de participantes com porcentagem | A MBigucci tem equipes e vendas em parceria (pedido do Felipe, 05/11/2026) |
| A própria corretora registra a venda | **Adaptado:** o gerente e o operacional registram; o corretor pede | Decisão do Felipe, 05/11/2026 |
| Repasse de parceria descontado na comissão | **Fora:** sem comissão no CRM (`docs/referencia-crm-bruna.md`, seção 13) | A parte do parceiro entra como participante, não como desconto |
| Registro pela ficha e pela página de vendas, com "Parabéns pela venda para {nome}." | **Mantido** para quem registra; o corretor tem o pedido no mesmo lugar | |
