# Estudo: o trabalho da recepção no CRM

> Estudo de 04/11/2026, a pedido do Felipe. **Só análise e desenho: nada foi implementado, nenhum arquivo existente foi alterado.** A fonte é a planilha da recepção (`Recepção Mbigucci.xlsx`, lida sem modificar, fora do projeto) e os documentos do CRM. **Nenhum dado pessoal foi copiado para cá:** a planilha é descrita por estrutura, contagens e padrões; os exemplos usam valores inventados. Este estudo se mescla com `docs/estudo-checkin-plantao.md` (seção 4).
>
> **Atualizado em 04/11/2026** com a regra do cadastro por tipo de cliente, ditada pelo Felipe depois da primeira versão (seção 3.1).
>
> **Nota de 04/11/2026:** o sigilo do programa de verba e a chave "Programa de verba ativo" acabaram (`docs/historico.md`). Onde este estudo diz "atrás da chave", "só com a chave ligada" ou "texto neutro por sigilo", leia "pela permissão": o programa aparece sempre, para quem tem permissão.
>
> **Sumário:** 0. Resposta curta · 1. O que a planilha registra · 2. Mapa coluna → CRM · 3. Proposta de tela (3.1 regra do cadastro por tipo de cliente) · 4. Mescla com o check-in e os períodos · 5. Migração e transição · 6. Permissões, RLS e sigilo · 7. Modelo de dados · 8. Riscos, esforço e decisões do Felipe · 9. Da Bruna · 10. O que foi conferido e o que não foi

## 0. Resposta curta

- **A planilha tem duas rotinas.**
  - **Livro de visitas do estande** (aba `CLIENTES MZ`): uma linha por cliente que entra, com o tipo, como conheceu, o contato, o acompanhante, o corretor, a empresa do corretor, o especialista e uma observação.
  - **Controle da vez** (aba `ROLETA`): um bloco por dia, com os corretores na ordem de chegada de manhã e de tarde, as rodadas de atendimento "da vez", a fila dos especialistas e as saídas e voltas com horário.
  - O resto é apoio: o cadastro de corretores, equipes e gerentes (importado de uma lista em PDF), a escala semanal das recepcionistas por loja, as parcerias e o formulário de um lançamento.
- **O controle da vez já é o controle de presença.** É a versão à mão do `plantao_presencas` do estudo de check-in. É aí que os dois se juntam: a recepção registra a chegada como hoje e, quando o check-in por localização existir, a chegada pelo celular cai na mesma fila.
- **A recepção cadastra o cliente e já o vincula a quem vai atender** (regra do Felipe de 04/11/2026, seção 3.1). Cada visita fica num registro próprio, o **atendimento do plantão**. Conforme o tipo, o cadastro também alimenta o CRM:
  - **cliente novo:** gira a vez dos corretores e a dos especialistas, e o cliente vira lead do corretor da vez;
  - **indicação de corretor:** gira só a vez dos especialistas, e o CRM procura o cliente na carteira desse corretor para registrar a visita;
  - **indicação de parceiro:** gira só a vez dos especialistas, e o cliente vai para a base do **gerente** do parceiro, numa área nova "Clientes de parceiros";
  - **retorno:** não gira nenhuma vez; a recepção procura o cliente e registra o retorno.

  Cerca de 1 de cada 4 visitas (146 de 552) vem com corretor de imobiliária parceira. Por isso o livro **não vira só `leads`**: o cliente de parceiro fica com o gerente.
- **A recepção não abre a carteira de ninguém.** Todo esse vínculo é feito por funções do banco, que devolvem a ela só o que precisa anunciar.
- **Tela proposta: uma só, `/recepcao/`, feita para computador** (ela funciona também em 375px). Nela ficam:
  - "Na loja agora", com a fila da vez de manhã e de tarde;
  - "Clientes de hoje", com uma linha de digitação na ordem das colunas da planilha;
  - as saídas e voltas.
- **Sigilo:** a tela `/plantao/` de hoje fica atrás da chave "Programa de verba ativo". A nova tela é operacional e funciona com a chave desligada, com textos neutros: vez, presença, clientes. Só o "Cumpriu o período" continua atrás da chave. Nada de pontos, verba ou ranking nos textos.
- **Migração (decidida):** começar do zero no CRM, sem importar o histórico. A planilha fica guardada como arquivo. A troca é em **todas as lojas de uma vez**, sem piloto (seção 8).
- **Esforço:** cerca de 12 dias de trabalho na etapa 1 (estimativa). As decisões do Felipe estão na seção 8, todas respondidas.

## 1. O que a planilha registra hoje

### 1.1 Visão geral

- **Onde fica:** na pasta do OneDrive de uma conta da recepção da loja **Marco Zero** (o caminho está no arquivo). A aba principal se chama `CLIENTES MZ`. **É a planilha de uma loja só.** As outras três lojas da escala (Home Store, Easy, Elleva) não foram vistas e podem ter planilhas diferentes.
- **14 abas, 4 ocultas:**

| Aba | Visível | O que é |
| --- | --- | --- |
| `CLIENTES MZ` | sim | Livro de visitas do estande (1.2) |
| `ROLETA` | sim | Controle da vez e presença por dia (1.3) |
| `EQUIPES` | sim | Corretores por equipe, importados (1.4) |
| `GERENTES` | sim | Lista de gerentes, importada (1.4) |
| `CORRETORES` | sim | Corretores ativos, importados (1.4) |
| `NOVAS PARCERIAS` | sim | Vez dos gerentes para novos parceiros (1.5) |
| `PARCERIA` | sim | Clientes trazidos por corretores parceiros (1.5) |
| `VISITAS AVANT PREMIÈRE 4-8-26` | sim | Lista de um evento de lançamento (1.6) |
| `ESCALA` | sim | Escala semanal das recepcionistas por loja (1.7) |
| `Detalhes1`, `Detalhes2`, `Detalhes3` | ocultas | Detalhe de uma tabela dinâmica que não existe mais (1.8) |
| `Gráfico1`, `Gráfico2` | ocultas | Gráficos de barras (1.8) |

- **Nenhuma validação de dados** (nenhuma lista suspensa) e **nenhuma formatação condicional** em nenhuma aba. Tudo é digitado à mão. As cores são pintadas manualmente (1.3).
- **8 consultas do Power Query** (`Page001` a `Page008`) alimentam as abas de corretores, equipes e gerentes. Os nomes "Page" e o título "Corretores ativos MBigucci" indicam a importação de um PDF.

### 1.2 `CLIENTES MZ`: o livro de visitas

**Volume:** 552 visitas com cliente, de agosto a 04/11/2026. Por mês:
- agosto: 356, das quais 124 entre 05 e 09/08, a semana do lançamento. A aba do lançamento (1.6) também tem 124 linhas, então são provavelmente as mesmas visitas digitadas duas vezes. Isso não foi conferido linha a linha;
- setembro: 116;
- outubro: 73;
- novembro, até o dia 4: 8.

Fora do lançamento, isso dá **2 a 4 clientes por dia** nessa loja.

| Coluna | O que é | Como é preenchida |
| --- | --- | --- |
| A `RECEPCIONISTA` | Quem atendeu na recepção | Primeiro nome, cerca de 16 pessoas. Algumas células pintadas de amarelo (22), sem significado aparente |
| B `DATA` | Dia da visita, sem hora | 506 como data do Excel e 47 como **texto** "dd/mm/aaaa" (em agosto). Um trecho tem uma fórmula colada como texto na coluna M, tentando converter essas datas |
| C `TIPO DE VISITA` | Por que o cliente está ali | Texto livre com 15 grafias para 7 tipos: VEZ (cerca de 250), INDICAÇÃO (cerca de 222), RETORNO (63), PASSAGEM (4), CORTESIA (2), TELEFONE (2), LOCAÇÃO (1). Sobra lixo: espaços, "IND", "***", "-" e uma linha de cabeçalho repetida no meio |
| D `ORIGEM` | Como o cliente conheceu | Texto livre com **49 grafias** para cerca de 10 ideias: passagem, indicação de corretor, indicação, retorno, vizinho, folheto ou panfleto, amigo, Instagram ou mídias sociais, telefone da loja, e-mail, internet, conhece a região. Mistura caixa alta e baixa, plural e erro de digitação. Às vezes leva um nome junto ("Amigo [nome]") |
| E `CLIENTE` | Nome do cliente | Às vezes só o primeiro nome |
| F `TELEFONE` | Telefone | 4 formatos: só números, com hífen e ponto, com hífen, com ponto. Vazio em 13 linhas e "***" em 7 |
| G `EMAIL` | E-mail | "***" em 237 linhas e vazio em 29: **quase metade sem e-mail**. O Excel criou link automático em 270 |
| H `ACOMPANHANTE` | Nome de quem veio junto | "***" em 236 e vazio em 168. Quando preenchido, é um primeiro nome |
| I `CORRETOR` | Quem atendeu | **224 grafias diferentes** em 553 linhas: apelido, primeiro nome, corretores da MBigucci e de imobiliárias parceiras, com variações de espaço e caixa |
| J `EMPRESA` | Empresa do corretor | MBigucci em 376 linhas, com 8 grafias (com erros como "MBGUCCI"). **Imobiliária parceira ou autônomo em 146.** "***" em 22 |
| K `ESPECIALISTA` | Especialista que atendeu junto | Primeiro nome, às vezes 2 ou 3 separados por "/". "***" em 21 |
| L `OBSERVAÇÃO` | Anotação | Preenchida em só 60 linhas |
| M, N, P, Q | Sem cabeçalho | Restos: fórmula como texto, notas soltas |

Cruzando o tipo com a empresa:
- **VEZ** é quase sempre corretor da MBigucci (247 de 251): é o cliente que chega sem corretor e é passado ao corretor da vez;
- **INDICAÇÃO** é, na maioria, corretor de fora (126 de 222): o parceiro traz o cliente ao estande;
- **RETORNO** é o cliente que volta.

Outros detalhes:
- **Tabela do Excel** (`Tabela1`): cobre só as linhas 1 a 194. As linhas novas ficaram fora dela, sem que ninguém notasse.
- Cabeçalho congelado, 2 linhas ocultas e um modo de exibição salvo.

### 1.3 `ROLETA`: a vez e a presença do dia

Cada dia é um **bloco de cerca de 27 linhas**, copiado do anterior. Há 118 blocos, de 04/09/2026 a 01/01/2027. Os dias **de 04/09 a 04/11 estão preenchidos** (faltam 07 e 08/09), e **os de 05/11 em diante são modelos vazios**, criados de uma vez.

O bloco tem quatro partes:

1. **Data** no topo.
2. **ESPECIALISTAS:** ordem (1 a 7) e nome, com 4 colunas de 0/1 ao lado. Ficam 2 a 8 especialistas por dia.
3. **CORRETORES · MANHÃ e CORRETORES · TARDE**, lado a lado. Cada lado tem:
   - a ordem (1 a 22), que é a **ordem de chegada**;
   - o **apelido** do corretor;
   - o **gerente** e o **CRECI**, buscados na aba `EQUIPES` pelo apelido, com `PROCX`. Isso só vale a partir de 07/10; antes eram digitados;
   - 2 ou 3 colunas de 0/1.

   Ficam **5 a 20 corretores por período**, em geral 8 a 12.
4. **SAÍDA / VOLTA** (em blocos antigos, "Corretores: Saída / Chegada"): o corretor e os **horários** de saída e de volta. São 0 a 12 por dia, em geral 2 a 6. A partir de 20/10, o bloco ganhou o rótulo "Horário saída" numa coluna à direita. Essa coluna já guardava horários desde setembro.

**Leitura das colunas de 0/1 (hipótese, a confirmar com o Felipe):** cada coluna é uma **rodada da vez**. O 1 marca que aquela pessoa já recebeu um cliente da vez naquela rodada. Os números batem com o livro de visitas: são 0 a 6 marcas por período, e os clientes "da vez" são cerca de 45% das visitas.

**Cores pintadas à mão (hipóteses, a confirmar):**
- **Vermelho no nome da tarde:** 180 vezes, e em 149 delas (83%) o mesmo corretor também está na manhã. Parece marcar **"ficou o dia todo"**.
- **Laranja no nome da manhã:** **um por dia** em quase todos os dias desde o fim de setembro. Parece marcar **de quem é a vez** ou quem abriu o plantão.
- **Preto, cinza e branco:** só formatação do bloco.

A aba tem 3.475 células mescladas e não tem fórmula além das buscas do gerente e do CRECI.

### 1.4 `EQUIPES`, `GERENTES`, `CORRETORES`: o cadastro

- **`EQUIPES`:** 7 blocos "EQUIPE <gerente>", com 72 corretores no total (20, 15, 15, 2, 10, 4 e 6). Colunas: nome, **apelido**, CRECI, telefone e gerente. Cada bloco é uma consulta do Power Query. **É daqui que a aba `ROLETA` busca o gerente e o CRECI pelo apelido.**
- **`CORRETORES`:** 82 corretores ativos (nome, apelido, CRECI, telefone, gerente), dos quais 71 com gerente. É uma consulta.
- **`GERENTES`:** 12 linhas (nome, apelido, CRECI, telefone). É uma consulta.
- **O que revela:** a recepção trabalha pelo **apelido** do corretor, porque é o que ela digita na vez. Os outros dados ela tira de uma lista oficial atualizada à parte.

### 1.5 `NOVAS PARCERIAS` e `PARCERIA`

- **`NOVAS PARCERIAS`:** "Ordem para novos parceiros". São 5 gerentes com a coluna VEZ (0/1) e uma coluna de observações, com um contato anotado. É a **vez dos gerentes** para receber um parceiro novo, feita à mão.
- **`PARCERIA`:** 75 linhas com o corretor parceiro, a empresa, o cliente e a data (preenchida em só 27), e mais algumas colunas soltas com contato. É um registro de quais clientes cada parceiro trouxe.
- **Hoje já tem dono no CRM:** o módulo de Parcerias (`docs/codex-parcerias.md`, banco em `crm/supabase/parcerias.sql`) cria a roleta de parceiros entre gerentes e a origem "Parceiro" no lead. **Estas duas abas são substituídas por ele.** Este estudo não mexe nesse módulo.

### 1.6 `VISITAS AVANT PREMIÈRE 4-8-26`

São 124 visitas de um evento de lançamento em agosto. As colunas são estas:
- **data e hora** de chegada (carimbo com minutos);
- nome, telefone e e-mail;
- **QTD.** (quantos acompanhantes: 0 a 3);
- corretor, **MÍDIA** e especialista.

A MÍDIA tem **lista fechada e escolha múltipla**, com valores separados por "|". Isso indica que veio de um formulário. A lista é esta:
- indicação de família ou amigos;
- Instagram;
- WhatsApp;
- outdoor;
- passagem;
- folheto;
- painel de LED;
- e-mail marketing;
- site MBigucci;
- outro.

**É o melhor ponto de partida para a lista "Como conheceu"** do CRM, muito mais limpa que a coluna ORIGEM do livro de visitas.

### 1.7 `ESCALA`

É a semana de segunda a domingo, com as datas, em 4 colunas de loja (**Home Store, Marco Zero, Easy, Elleva**) e uma de **Folgas**. Cada célula tem 1 a 4 primeiros nomes.

**Indício, não confirmado (a comparação foi só pelo primeiro nome):**
- os 8 nomes da escala aparecem como recepcionistas no livro de visitas;
- 8 dos 9 especialistas da fila da vez têm o mesmo primeiro nome de uma recepcionista. Parece que **a mesma equipe faz recepção e atendimento de especialista, em rodízio entre as 4 lojas**. É a decisão 5.

### 1.8 Abas ocultas e relatórios

- **`Detalhes1` a `Detalhes3`:** são o "mostrar detalhes" de uma tabela dinâmica ("Contagem de ORIGEM" por DATA e TIPO DE VISITA, de 05 e 06/08). **A tabela dinâmica não existe mais** no arquivo, porque não há cache de dinâmica.
- **`Gráfico1` e `Gráfico2`:** barras que apontam para um resumo do livro de visitas e para uma linha da aba ROLETA. Os intervalos estão vazios ou velhos.
- **O que se conclui:** hoje **nenhum relatório vivo sai da planilha**. Houve uma tentativa de contar as visitas por origem, por dia e por tipo durante o lançamento. Quem lê a planilha depois e para quê: **não sabemos** (decisão 13).

### 1.9 Padrões de preenchimento

- **"\*\*\*" no lugar de "não informado"**, em e-mail, acompanhante, empresa, especialista e telefone. Às vezes é "-".
- **Texto livre como status:** o tipo e a origem não têm lista, por isso há 15 e 49 grafias.
- **Abreviações e apelidos:** IND, MZ, o gerente abreviado e o corretor pelo apelido.
- **Data em dois formatos**, e o cabeçalho colado de novo no meio dos dados.
- **Campos quase sempre vazios:** observação (89% vazia), e-mail (47% sem) e acompanhante (73% sem).
- **Blocos copiados para os dias seguintes**, até o fim do ano, para a recepção só preencher.

### 1.10 O fluxo de trabalho que a planilha revela

1. **Ao abrir a loja (9h):** a recepcionista do dia, que está na escala, abre o bloco do dia na aba ROLETA. Cada corretor que chega entra na lista da manhã **na ordem de chegada**, pelo apelido. O gerente e o CRECI aparecem sozinhos. Os especialistas do dia entram na fila deles.
2. **Quando um cliente entra:**
   - se ele vem por um corretor (INDICAÇÃO) ou já foi atendido antes (RETORNO), a recepção chama esse corretor;
   - se chega sem corretor (VEZ), a recepção passa para **o próximo da vez**, marca o 1 na rodada e faz o mesmo com o especialista.
3. **Ela anota a visita** no livro de visitas: tipo, origem, nome, telefone, e-mail se o cliente der, acompanhante, corretor, empresa, especialista e observação.
4. **O corretor sai para uma visita e volta:** ela anota a hora de saída e a de volta.
5. **Às 14h começa a lista da tarde.** Quem continua entra de novo e parece ganhar a cor vermelha.
6. **Os parceiros** que trazem cliente entram no livro como INDICAÇÃO, e a empresa é anotada. Quando aparece um parceiro novo, a vez dos gerentes decide quem fica com ele.
7. **Quem lê depois:** não aparece na planilha. Pelo conteúdo, interessa ao gerente geral (fluxo da loja, origem dos clientes e parceiros), aos gerentes (presença e atendimentos da equipe) e, desde 29/10, ao controle de períodos do programa, que hoje a recepção faria de novo na tela Plantão.

## 2. Mapa coluna → CRM

Legenda: ✓ já existe, ! existe diferente, ✕ falta, – não deveria entrar.

### Livro de visitas (`CLIENTES MZ`) → atendimento do plantão (tabela nova, seção 7)

| Coluna | CRM hoje | Proposta |
| --- | --- | --- |
| RECEPCIONISTA | ✕ | Carimbada: o usuário logado (`registrado_por`) |
| DATA | ✕ | Carimbada com **data e hora** do servidor. Corrigir só com motivo |
| TIPO DE VISITA | ! A origem do lead tem plantão e indicação, com outro sentido | Quatro tipos, decididos pelo Felipe (3.1): **Novo, Indicação de corretor, Indicação de parceiro, Retorno**. Passagem e Vez da planilha viram "Novo". O tipo **decide quem gira na vez** e para onde vai o cliente. Não é a origem do lead, mas define a origem quando o lead é criado (Novo → Plantão; Indicação de corretor → Indicação) |
| ORIGEM | ✕ | **"Como conheceu"**, lista fechada a partir da lista do formulário do lançamento (1.6), com escolha múltipla, editável pelo gerente geral. **Nunca alimenta** `anuncio_proprio`, `redes_sociais` nem `empresa` do lead, que pesam na conciliação do programa |
| CLIENTE | ! `leads.nome` (só com dono) | Nome no atendimento. Também vai para o lead do corretor ou para o cliente de parceiro do gerente (3.1) |
| TELEFONE | ! `leads.whatsapp` com `normalizarWhatsapp` | Mesma normalização (9º dígito, 55). É opcional na recepção, porque 13 visitas não têm telefone |
| EMAIL | ! `leads.email` | Opcional. "\*\*\*" vira vazio |
| ACOMPANHANTE | ✕ | **Nome obrigatório**, como hoje, com o botão "Veio sozinho" (decisão 6) |
| CORRETOR | ! `profiles` (sem apelido) | **Um de dois:** corretor da MBigucci (`profiles`, escolhido pelo apelido) ou **parceiro** (`parceiros`, do módulo de Parcerias). Na falta, texto livre "Corretor de fora" com a empresa |
| EMPRESA | ! `parceiros.empresa` | Não se digita: vem do parceiro, ou é "MBigucci" para quem é do CRM |
| ESPECIALISTA | ✕ (perfil `especialista` "a definir") | Vem da **vez própria dos especialistas**, que gira no cliente novo e nas duas indicações. No retorno, é o especialista do atendimento anterior (3.1). Só o nome, de uma lista de especialistas (decisão 5) |
| OBSERVAÇÃO | ! `lead_interacoes` | Texto curto opcional. Vira a primeira anotação do lead, se ele for cadastrado |
| (não existe) | ✓ `empreendimentos` | **Empreendimento de interesse**, opcional, com a lista do catálogo |
| M, N, P, Q (restos) | – | Não entram |

### Vez e presença (`ROLETA`) → presença no plantão (tabela do estudo de check-in, ampliada)

| Parte do bloco | CRM hoje | Proposta |
| --- | --- | --- |
| Data do bloco | – | O dia vem do registro. Sem bloco copiado |
| Ordem de chegada | ✕ (só `lancamentos_pontos` com o período) | `plantao_presencas.entrada_em`. A ordem é calculada. Pela recepção: método `recepcao`; pelo celular: `gps` (estudo de check-in) |
| Apelido | ✕ | `profiles.apelido`, novo (decisão 11). A busca na tela aceita apelido ou nome |
| Gerente e CRECI | ! Gerente pela equipe (`teams`). CRECI ✕ | Gerente pela equipe, sem digitar. CRECI em `profiles.creci`, opcional (decisão 11) |
| Manhã e tarde | ✓ Turnos 9h–14h e 14h–19h (`TURNOS`) | O mesmo. A presença das 9h às 19h cobre os dois |
| Colunas 0/1 (rodadas) | ✕ | Calculadas: atendimentos do tipo Vez por pessoa no período. **Ninguém marca 1 à mão** |
| Vermelho na tarde (hipótese: dia todo) | – | Some: "Manhã e tarde" aparece como texto quando a presença cobre os dois |
| Laranja na manhã (hipótese: da vez) | – | Some: "→ Da vez" calculado |
| Especialistas e as rodadas | ✕ | A mesma fila, com `papel = 'especialista'` |
| SAÍDA / VOLTA | ! "Saiu para visita" em `lancamentos_pontos`, atrás da chave e com link de foto | Evento dentro da presença: **Saiu** (hora) e **Voltou** (hora), com o link da foto opcional. Quem saiu sai da vez até voltar |

### Outras abas

| Aba | CRM | Proposta |
| --- | --- | --- |
| `EQUIPES`, `CORRETORES`, `GERENTES` | ✓ `profiles`, `teams` | **Não entram.** O CRM já é o cadastro. Falta conferir que **todos os corretores ativos têm usuário**: a lista tem 82 e só quem tem usuário aparece na vez |
| `NOVAS PARCERIAS`, `PARCERIA` | ! Módulo de Parcerias (em construção) | Substituídas por ele. A recepção só **escolhe o parceiro** no atendimento |
| `VISITAS AVANT PREMIÈRE` | ✕ | Evento = atendimentos num dia, com o empreendimento. Não precisa de tela própria. A lista "Como conheceu" vem daqui |
| `ESCALA` | ✕ | **Fica fora da etapa 1** (decisão 10). A recepcionista escolhe a loja na tela, e o aparelho lembra |
| Ocultas, gráficos, tabela dinâmica | – | Não entram. O relatório do CRM substitui (seção 5) |

## 3. Proposta de tela: Recepção (`/recepcao/`)

### 3.1 Regra do cadastro por tipo de cliente (Felipe, 04/11/2026)

**Pedido:** quando o cliente chega, a recepção faz as perguntas (os campos da planilha) e cadastra esse cliente direto, já vinculado a quem vai atender. Ela não procura o cliente numa lista para cadastrar. Ao final, a tela diz **quem ela deve anunciar: o corretor e o especialista.**

| Tipo do cliente | Vez dos corretores | Vez dos especialistas | Para onde vai o cliente |
| --- | --- | --- | --- |
| **Novo**: não é indicação de corretor nem de parceiro (inclui a passagem) | **Gira**: o corretor da vez é o vinculado | **Gira** | Vira **lead na carteira do corretor da vez**, com a origem Plantão |
| **Indicação de corretor** | Não gira: a recepção informa o corretor | **Gira** | O CRM **procura o cliente na carteira desse corretor**, primeiro pelo telefone e depois pelo nome. Se acha, registra no lead que ele veio ao plantão. Se não acha, ver a decisão 16 |
| **Indicação de parceiro** | Não gira: a recepção informa o parceiro | **Gira** | O cliente vai para a **base do gerente dono do parceiro**, em "Clientes de parceiros" |
| **Retorno** | Não gira | **Não gira**: a tela informa o especialista do atendimento anterior | A recepção **procura o cliente e registra o retorno**. O CRM atualiza o lead do corretor ou o cliente de parceiro do gerente |

**No retorno, a tela mostra também o último especialista da vez**, só para a recepção saber. Se o especialista do retorno não estiver disponível, ela apresenta o da vez como cortesia. **Isso não fica registrado** no sistema, a pedido do Felipe.

#### O que a recepção vê ao registrar

Depois de "Registrar cliente", um card com a barra `brand` mostra quem chamar, com Desfazer por 8 s:

```text
✓ Cliente registrado
Anuncie: Corretor A  ·  Especialista X
Cliente novo · vez dos corretores e dos especialistas
```

Nos outros tipos, a última linha muda:
- indicação de corretor: "Indicação de corretor · já estava na carteira de Corretor A" ou "! Não estava na carteira";
- indicação de parceiro: "Indicação de parceiro · Imobiliária Exemplo · cliente enviado ao gerente";
- retorno: "Retorno · especialista do último atendimento: Esp. Y · último da vez: Esp. X".

(Nomes inventados.)

#### Retorno: procurar e registrar

- Com o tipo **Retorno**, o primeiro campo é **"Procurar cliente"**: telefone (de preferência) ou nome.
- A busca olha o histórico de atendimentos do plantão de todas as lojas. Pelo telefone exato, olha também as carteiras dos corretores.
- O resultado mostra o mínimo para ela reconhecer o cliente que está na frente dela, nunca a ficha:
  - o primeiro nome e o final do telefone;
  - a quem ele está vinculado (corretor, ou parceiro e gerente);
  - a data do último atendimento e o especialista desse atendimento.
- Ela toca no cliente e em "Registrar retorno". O CRM:
  - grava o atendimento;
  - registra no lead do corretor a interação "Voltou ao plantão", ou no cliente de parceiro do gerente o evento "Retorno ao plantão";
  - mostra quem anunciar.
- **Não achou:** ela troca o tipo para Novo ou para uma das indicações.
- **Sem aprovação:** o retorno é só uma atualização no lead ou no cliente de parceiro. Ninguém precisa aprovar (Felipe, 04/11/2026: "autorização" foi erro do ditado).

#### Clientes de parceiros (tela nova do gerente)

- **Onde:** um item novo no menu do gerente, "Clientes de parceiros", ao lado dos Parceiros do módulo de Parcerias.
- **O que mostra:**
  - o cliente, com todos os dados que a recepção cadastrou;
  - o parceiro e a imobiliária;
  - um **histórico mais simples** que o do lead: os atendimentos no plantão (data, loja, especialista e retornos) e as anotações do gerente.
- **De quem é:** do gerente dono do parceiro na hora da visita.
- **Quem vê:** o gerente dono e o gerente geral.
- **Fica de fora:** etapas, temperatura, próximo contato e vendas. O cliente é do parceiro, não da carteira de um corretor da MBigucci.
- **Não é o lead com origem "Parceiro" do brief de Parcerias.** Aquele é o cliente que o parceiro passa a um corretor da MBigucci; este é o cliente que o próprio parceiro atende no estande. Os dois somam no relatório de indicações por parceiro.

### Princípios, tirados do jeito delas

- **Ver o dia de uma vez:** a loja, a vez e os clientes do dia na mesma tela, sem navegar.
- **Digitar como na planilha:** uma linha de entrada com os campos **na ordem das colunas**, Tab para avançar e Enter para salvar. O cursor volta ao primeiro campo, para o próximo cliente.
- **Listas iguais às da planilha,** só que fechadas: tipo e "como conheceu" viram botões de 1 toque ou atalho de teclado (V, I, R, P), e o corretor é um campo de busca que aceita **apelido**, nome, parceiro ou empresa.
- **O que ela calculava à mão, o CRM calcula:** o gerente, a empresa, as rodadas, "da vez", "manhã e tarde", a data e a hora.
- **Nada novo para ela decidir:** sem temperatura, etapa, próximo contato ou perfil, que são coisas do corretor.
- **Design System:** cards com barra de 4px, uma ação vermelha por grupo (**Registrar cliente**), sem sombra, sem ícone, estados com glifo + palavra + cor e números em `.num`. No computador, **tabela densa dentro do card**: um card por corretor, como o `/plantao/` de hoje, não cabe 20 corretores por período.

### Computador (a recepção usa PC)

```text
RECEPÇÃO · MARCO ZERO [trocar]          Hoje, quarta, 04/11/2026   ← →
┌ NA LOJA AGORA ─────────────────────┐ ┌ CLIENTES DE HOJE ──────────────────────────────────┐
│ [Manhã 9h–14h] [Tarde 14h–19h]     │ │ Tipo [N]ovo [C] Ind. corretor [P] Ind. parceiro [R]etorno│
│ Chegou: [apelido ou nome___] Enter │ │ Como conheceu [Passagem] [Instagram] [Indicação…]  │
│                                    │ │ Cliente [__________] Telefone [__________]         │
│  1  Corr. A  Eq. 1  ✓✓  → Da vez   │ │ E-mail [______] Acompanhante [____] [Veio sozinho]│
│  2  Corr. B  Eq. 2  ✓   Saiu 10h15 │ │ Corretor [→ Corr. A (da vez)] Especialista [Esp. X] │
│  3  Corr. C  Eq. 1  ✓              │ │ Empreendimento [_______]  Observação [___________] │
│  4  Corr. D  Eq. 3      Manhã e    │ │                      [Registrar cliente] (vermelho)│
│                         tarde      │ ├────────────────────────────────────────────────────┤
│  [Saiu] [Voltou] na linha marcada  │ │ 10h02  Vez        Cliente Exemplo   Corr. A  Esp. X│
├ ESPECIALISTAS ─────────────────────┤ │ 10h40  Indicação  Fulano de Tal     Parceiro: Imob │
│  1  Esp. X  ✓   → Da vez           │ │        Exemplo · corretor de fora  Esp. X        │
│  2  Esp. Y                          │ │ 11h15  Retorno    Beltrano Exemplo  Corr. B  Esp. Y│
└────────────────────────────────────┘ └────────────────────────────────────────────────────┘
```

(Rótulos e nomes inventados.)

- **Na loja agora** (à esquerda, cerca de 40% da largura):
  - abas Manhã e Tarde, que abrem no período atual;
  - um campo "Chegou", onde ela digita o apelido e tecla Enter para pôr o corretor no fim da fila;
  - em cada linha: número, apelido, equipe, rodadas (✓ por atendimento da vez), estado ("→ Da vez", "Saiu 10h15", "Voltou 11h02", "Manhã e tarde") e as ações Saiu, Voltou e "Não está mais" (saída antes do fim, com Desfazer);
  - quando o check-in existir, a linha mostra "✓ pelo celular 9h04" ou "Registrada pela recepção".
- **Especialistas:** a mesma lista, menor.
- **Clientes de hoje** (à direita):
  - a linha de entrada no topo;
  - com o tipo **Novo**, os campos Corretor e Especialista vêm preenchidos com **os da vez**, e Enter aceita;
  - com **Indicação de corretor** ou **de parceiro**, o Especialista vem da vez e ela busca o corretor ou o parceiro;
  - com **Retorno**, a linha vira "Procurar cliente" (3.1), e o corretor e o especialista vêm do último atendimento. Hoje ela procura isso na planilha inteira;
  - embaixo, a lista do dia em ordem de hora, com "Corrigir" em cada linha (correção com motivo depois de 30 min, seção 6).
- **Ao registrar:** o cliente novo conta uma rodada para o corretor e para o especialista. As indicações contam só para o especialista. O retorno não conta. A vez anda conforme a tabela da 3.1, e o card "Anuncie" aparece.
- **A ordem é a da roleta deles** (decisão 4): a recepção põe os corretores e os especialistas na vez na ordem da roleta feita na loja, e o CRM só segue essa ordem em círculo.
- **Pular a vez:** "Passar a vez" na linha do corretor (por exemplo, ele está atendendo outro cliente). Fica registrado quem passou e quando.

### Celular (375px)

- Duas abas no topo: **Na loja** e **Clientes**. A ação **+ Cliente** fica fixa no rodapé e abre a mesma ordem de campos em tela cheia.
- Campos com 16px, tipo e "como conheceu" em botões largos, e o corretor numa busca com sugestões.

### Textos (pt-BR, imperativo, sem exclamação, sem citar pontos, verba, ranking ou programa)

| Onde | Texto |
| --- | --- |
| Título | "Recepção" · eyebrow "Na loja agora", "Clientes de hoje", "Especialistas" |
| Campo de chegada | "Chegou: digite o apelido ou o nome" |
| Estados | "→ Da vez" · "✓ 2 atendimentos" · "Saiu 10h15" · "Voltou 11h02" · "Manhã e tarde" · "! Sem corretor na loja" |
| Botões | "Registrar cliente" · "Saiu" · "Voltou" · "Passar a vez" · "Não está mais" · "Corrigir" |
| Sucesso | "✓ Cliente registrado para Corretor A." com Desfazer por 8 s |
| Corretor de fora sem parceiro | "! Esse corretor não está nos parceiros. Registre o nome e a empresa; o gerente cadastra o parceiro depois." |
| Telefone repetido hoje | "! Esse telefone já foi registrado hoje às 10h02. Registrar de novo?" |

### Estados vazios e erros

- Sem corretor na loja: "! Ninguém registrou chegada neste período. Digite o apelido em Chegou."
- Sem loja escolhida: card com as lojas para escolher, lembrada no aparelho.
- Sem internet: o formulário mantém o que foi digitado e o id é gerado no aparelho, contra duplicados (padrão de `docs/teste-carga.md`).

## 4. Mescla com o check-in por localização e os períodos do plantão

**Recomendação: uma tela só para a recepção (`/recepcao/`), e a tela `/plantao/` atual continua como a visão do programa.**

| Peça | Onde | Chave do programa |
| --- | --- | --- |
| Vez e presença (chegada, saída, volta, quem está) | `/recepcao/` | **Não depende.** É operacional, como a planilha |
| Clientes do plantão | `/recepcao/` | Não depende |
| Check-in pelo celular (estudo anterior) | Grava na mesma presença; aparece na vez | Para o corretor, atrás da chave (decisão 10 do estudo de check-in); para o gerente, não |
| "Cumpriu o período" (lançamento pendente) | `/recepcao/` mostra a coluna **Período ✓** e o botão "Confirmar períodos de hoje" **só com a chave ligada**, ou fica em `/plantao/` | **Depende** |
| Roleta do fim de semana (6 períodos) | `/plantao/` | Depende |
| Vídeos | `/plantao/` (gerente) | Depende |

**Como se encaixam:**
- **A presença é uma tabela só** (`plantao_presencas`, do estudo de check-in). A recepção grava a chegada com o método `recepcao`, que é o plano B daquele estudo ("confirmado pela recepção"), e o celular grava com `gps`. Os dois entram na mesma vez, pela hora de chegada.
- **Os períodos saem da presença.** Com a chave ligada, a recepção confirma "Manhã ✓ / Tarde ✓" com a evidência ao lado ("Chegou 9h04 · na loja até 13h58"), o que gera os mesmos lançamentos pendentes de hoje. A aprovação continua só do gerente geral. Isso tira o retrabalho de marcar duas vezes: hoje ela anotaria na planilha e marcaria na tela Plantão.
- **Saiu para visita:** passa a ser o par Saiu/Voltou da presença, com o link da foto opcional. Com a chave ligada, a saída com foto protege o período, como hoje.
- **Nome:** no banco e nas permissões, **"vez"**, nunca "roleta". "Roleta" já é a do fim de semana (programa) e a dos parceiros (Parcerias). A tela diz "→ Da vez".
- **O gerente** usa o check-in no mesmo mecanismo do estudo anterior (passagem pela loja). Ele **não entra na vez** e não aparece em "Na loja agora" como corretor, mas pode aparecer numa linha à parte ("Gerente na loja").

**Por que não várias telas:** a recepção trabalha numa tela por vez, no PC da loja. Separar a vez dos clientes obriga a trocar de tela a cada cliente da vez, que é justamente o momento em que ela olha a fila.

## 5. Migração, transição e relatórios

### Histórico

| Opção | Prós | Contras |
| --- | --- | --- |
| **A. Começar do zero; a planilha vira arquivo, só leitura** (recomendada) | Sem limpeza. Sem levar dado pessoal antigo para um sistema novo, que é o mínimo da LGPD. A vez não tem histórico útil | O relatório do CRM começa no dia da troca |
| B. Importar os atendimentos de setembro em diante (cerca de 200 linhas) | Dá série desde setembro | É preciso casar 224 grafias de corretor com usuários e parceiros, 49 de origem e 15 de tipo, e as datas em texto. É trabalho manual de conferência. Os dados foram coletados sem aviso de uso no CRM |
| C. Importar só números agregados (visitas por mês, tipo e origem) | Mantém a comparação | Pouco uso; dá para guardar numa planilha à parte |

**Em nenhuma opção o histórico vira lead.** Um lead tem dono e entra na conta de origens e conversão: importar 552 visitas de 2026 como leads distorceria os painéis e a conciliação.

### Transição

- **Decidido (04/11/2026): todas as lojas de uma vez**, sem piloto e sem digitação dupla. A planilha fica aberta só para o que o CRM ainda não faz (a escala).
- **Antes do dia da troca** (mais as outras 3 planilhas lidas, os especialistas e a vez dos gerentes de cada plantão cadastrados, e um treino por recepcionista):
  - todos os corretores ativos com usuário e apelido no CRM;
  - os parceiros mais frequentes cadastrados (pelo módulo de Parcerias);
  - a lista "Como conheceu" aprovada;
  - o PC da loja com o CRM aberto e logado na conta da recepcionista.
- **Plano de volta:** se o CRM cair no meio do dia, a planilha em branco com as mesmas colunas continua servindo, e a recepção registra depois. O modelo em branco é um arquivo da loja, fora do Git.
- **Digitação dupla por 2 semanas** é a alternativa mais segura, mas dobra o trabalho delas, o que contraria o pedido de mudar o mínimo.

### Relatórios que hoje sairiam da planilha

Hoje não há relatório vivo (1.8). O CRM passa a dar, por período (dia, semana, mês) e por loja:
- visitas por tipo, por "como conheceu" e por empreendimento (o que a tabela dinâmica tentou fazer);
- atendimentos por corretor e por especialista, e a vez por rodada;
- **clientes trazidos por parceiro e por imobiliária**, que se junta ao relatório de indicações do módulo de Parcerias;
- presença por corretor (chegada, saída e duração), para o gerente da equipe e o gerente geral.

Para o gerente geral, uma **exportação CSV** pode substituir a planilha para quem quiser continuar no Excel. Ela leva dados pessoais e por isso fica só com o gerente geral (decisão 13).

## 6. Permissões, RLS e sigilo

### Permissões novas em `role_permissions` (nunca `perfil === ...`; descrições neutras, porque o catálogo é lido por todos)

| Slug | Descrição | Padrão |
| --- | --- | --- |
| `plantao.atendimentos` | Registrar os clientes que chegam ao plantão | recepção, operacional |
| `plantao.confirmar` (do estudo de check-in, ampliada: lá era só confirmar a presença) | Registrar a chegada, a saída e a vez das pessoas no plantão | recepção, operacional |
| `plantao.atendimentos_ver` | Ver os clientes atendidos no plantão pelos corretores que vê | gerente |
| `plantoes.gerenciar` (do estudo de check-in) | Cadastrar e editar os locais de plantão | operacional |

O gerente geral tem todas, sempre. O padrão entra só na criação da permissão, como nas outras.

### Quem vê e quem faz

| Perfil | Atendimentos | Presença e vez |
| --- | --- | --- |
| Recepção | Cria. Lê e corrige **os da loja, só de hoje** (decisão 12); os anteriores, só pela busca do retorno. Corrige sem motivo até 30 min depois; depois, só com motivo, que vai para a auditoria | Registra chegada, saída, volta e "passar a vez" de qualquer corretor ativo e dos especialistas, na loja escolhida. Lê o dia e a semana |
| Corretor | Lê **os próprios** (`corretor_id = auth.uid()`). O lead criado ou atualizado pela recepção aparece na carteira dele | Lê a própria presença; o check-in fica atrás da chave |
| Gerente | Lê os da equipe (`pode_ver_dados_de(corretor_id)` + `plantao.atendimentos_ver`). Lê e anota os **Clientes de parceiros** dos parceiros dele (`parceiros.gerente_id = auth.uid()`) | Lê a presença da equipe |
| Operacional | Como a recepção, em todas as lojas; lê todos com `dados.ver_todos` | Igual |
| Gerente geral | Tudo, com a auditoria e a exportação | Tudo |
| Especialista | Decisão 5 (proposta: lê os atendimentos em que aparece) | Lê a própria |

### Regras no banco, porque o cliente é público

- **Toda escrita passa por funções `security definer`:** `recepcao_registrar_cliente`, `recepcao_chegada`, `recepcao_saida`, `recepcao_passar_vez` e `recepcao_corrigir`. Sem insert ou update direto.
- **O carimbo é do banco:** `registrado_por = auth.uid()`, `registrado_em = now()`, a loja e o dia de São Paulo.
- **A lista de corretores da recepção sai de uma função nova, sem a chave:** `recepcao_pessoas()` devolve id, nome, apelido e equipe dos corretores e especialistas ativos. A `plantao_corretores()` de hoje **exige `private.ve_programa()`** e por isso não serve com a chave desligada.
- **"Da vez" segue a ordem que a recepção digitou** (a roleta do dia, feita na loja; decisão 4). A função `recepcao_vez(loja, dia, turno, papel)` aponta o seguinte ao último que recebeu, em círculo, pulando quem está como "Saiu". Não calcula nem sorteia.
- **Dados do cliente para a recepção:** ela lê nome e telefone só dos atendimentos da loja de hoje, e não tem acesso a leads (como hoje). Isso cobre o "esse telefone já veio hoje" sem abrir a carteira dos corretores.
- **O lead é criado ou atualizado pela função, não pela recepção** (3.1). `recepcao_registrar_cliente` faz numa só transação:
  - grava o atendimento;
  - gira as vezes que o tipo pede;
  - cria o lead na carteira do corretor (dono = corretor, `criado_por` = a recepcionista) ou registra a interação no lead que já existe, ou cria o cliente de parceiro do gerente;
  - devolve **só** o que a recepção precisa anunciar: o apelido do corretor (ou o parceiro), o especialista e se o cliente foi encontrado.

  Ela continua sem permissão de leitura em `leads`. O gatilho `leads_guard` hoje só deixa cadastrar para si ou com `leads.atribuir`. A função passa por cima disso de forma controlada: só cria para corretor ativo, só com a origem Plantão ou Indicação, nunca Empresa, e o histórico grava "Cadastrado pela recepção".
- **Procurar o cliente na carteira do corretor** (indicação de corretor): pelo telefone normalizado e, sem telefone, pelo nome sem acento. A busca é só na carteira **daquele corretor**, e a resposta é só "encontrado" ou "não encontrado", nunca os dados do lead.
- **Retorno:** `recepcao_procurar_retorno(telefone ou nome)` procura em todos os atendimentos do plantão e, pelo telefone exato, também nas carteiras. Devolve o primeiro nome, o final do telefone, o vínculo (corretor, ou parceiro e gerente), a data e o especialista do último atendimento, no máximo 5 resultados. Os retornos são 63 das 552 visitas, cerca de 11%: é o que ela faz hoje procurando na planilha inteira.
- **Duplicado com outras carteiras:** no cliente novo, se o telefone já é lead ativo de **outro** corretor, a função avisa a recepção ("! Esse cliente já é de outro corretor. Confirme se é retorno.") sem dizer de quem, como faz `whatsapp_em_outra_carteira`. A decisão de seguir é dela; o caso vai para o histórico.
- **Auditoria:** `plantao_atendimentos_historico`, gravada só por gatilho, no padrão de `lancamentos_pontos_historico`.

### Sigilo até a reunião de novembro de 2026

- A tela `/recepcao/`, as permissões, as funções e os textos **não citam pontos, verba, ranking, roleta nem o programa**. A palavra é "vez".
- A coluna Período e o "Confirmar períodos de hoje" só aparecem com `programa_estado()` ligado, e **o texto que fica no código é neutro** ("Período ✓", "Confirmar períodos"). A ligação com os lançamentos fica no banco, atrás de `private.ve_programa()`.
- **Atendimento → visita realizada:** decidido que **só a indicação de corretor conta**; o cliente novo da vez nunca conta (decisão 14). A ligação só é ligada depois da reunião, atrás de `private.ve_programa()`, e gera visita pendente que o gerente geral aprova.

## 7. Modelo de dados (proposta, a implementar na etapa própria)

```text
plantoes  (do estudo de check-in; aqui é a "loja": Marco Zero, Home Store, Easy, Elleva)

plantao_presencas  (do estudo de check-in, com duas mudanças)
  papel  text check in ('corretor','gerente','especialista')
  entrada_metodo  ... check in ('gps','recepcao')      -- 'recepcao' = confirmado_recepcao
  registrado_por uuid null references profiles          -- quem digitou, se foi a recepção

plantao_presenca_eventos   -- saída, volta, passar a vez, "não está mais"
  id uuid pk, presenca_id references plantao_presencas, tipo text check in ('saida','volta','passou_vez','encerrou'),
  em timestamptz default now(), comprovante text null (https), registrado_por uuid, observacao text null

plantao_tipos   -- novo, indicacao_corretor, indicacao_parceiro, retorno
  (ativo, ordem, gira_vez_corretor boolean, gira_vez_especialista boolean) -- a regra da 3.1 em dados, não em if
plantao_midias  -- "Como conheceu": a lista do formulário do lançamento (ativo, ordem)

plantao_atendimentos
  id uuid pk (gerado no aparelho), plantao_id, dia date, registrado_em timestamptz default now(),
  registrado_por uuid default auth.uid(),
  tipo text references plantao_tipos, midias text[] (slugs de plantao_midias),
  cliente_nome text not null, cliente_whatsapp text null (normalizado), cliente_email text null,
  veio_sozinho boolean default false, acompanhante_nome text null,  -- obrigatório quando não veio sozinho
  corretor_id uuid null references profiles, parceiro_id uuid null references parceiros,
  corretor_fora_nome text null, corretor_fora_empresa text null,
  -- exatamente um: corretor_id, parceiro_id ou corretor_fora_nome
  especialista_id uuid null references especialistas,
  empreendimento text null, observacao text null,
  lead_id uuid null references leads,                  -- lead criado ou encontrado (novo, indicação de corretor, retorno)
  parceiro_cliente_id uuid null references parceiro_clientes,  -- indicação de parceiro e retorno dele
  retorno_de uuid null references plantao_atendimentos, -- o atendimento anterior, no retorno
  encontrado_na_carteira boolean null,                 -- indicação de corretor: achou ou criou
  status text check in ('ativo','corrigido','cancelado'), motivo_correcao text null

plantao_atendimentos_historico   -- auditoria, só o gatilho escreve

especialistas   -- só o nome (decisão 5): id, nome, plantao_id, ativo
plantao_vez_ordem   -- a ordem da roleta do dia digitada pela recepção: plantao, dia, turno, papel, pessoa, ordem

parceiro_clientes   -- "Clientes de parceiros", do gerente (no módulo de Parcerias, ver abaixo)
  id uuid pk, parceiro_id references parceiros, gerente_id references profiles (dono, o gerente do parceiro na hora),
  nome, whatsapp, email, empreendimento, criado_por (a recepcionista), created_at
parceiro_cliente_eventos   -- histórico simples: atendimento, retorno, anotação do gerente

funções (todas security definer): recepcao_pessoas(), recepcao_vez(loja, dia, turno, papel),
  recepcao_registrar_cliente(...) -> devolve só quem anunciar e se encontrou,
  recepcao_procurar_retorno(termo) -> no máximo 5, primeiro nome + final do telefone + vínculo + último especialista,
  recepcao_chegada(...), recepcao_saida(...), recepcao_passar_vez(...), recepcao_corrigir(...)

profiles: + apelido text (único entre os ativos), + creci text null
```

- `parceiro_id` depende de o módulo de Parcerias estar no banco. Até lá, vale o "corretor de fora" em texto, e uma rotina liga depois pelo CRECI ou pelo WhatsApp do parceiro.
- **Retenção:** todo atendimento fica ligado a um lead ou a um cliente de parceiro e segue as regras deles. A recepção só vê o dia (decisão 12).
- **`parceiro_clientes` mora no módulo de Parcerias** (`parcerias.sql`, `/parceiros/`), porque segue o dono do parceiro. Entra como etapa nova daquele módulo, combinada com a sessão de Parcerias. Este estudo não mexe nos arquivos dela.
- **Alterações em arquivos que outras sessões editam agora:** `schema.sql` (`profiles`, `leads_guard`), `parcerias.sql` e as telas de lead. Esta etapa só começa depois que a lista de melhorias e o módulo de Parcerias forem entregues.

## 8. Riscos, esforço e decisões

### Riscos

| Risco | Gravidade | Mitigação |
| --- | --- | --- |
| A recepção achar o CRM mais lento que a planilha | Alta | Linha de entrada por teclado, ordem da planilha, teste com cronômetro antes da troca (meta: registrar um cliente em até 30 s) |
| Corretor sem usuário ou sem apelido no CRM não entra na vez | Alta | Conferir os 82 da lista antes da troca; "corretor sem usuário" em texto como saída provisória |
| Parceiros ainda não cadastrados | Média | Texto livre para o corretor de fora, ligado depois ao parceiro |
| Dados pessoais de clientes na mão da recepção, num PC de loja compartilhado | Média | Leitura só do dia e da loja; sessão por pessoa; sair ao fim do turno; aviso de LGPD na tela |
| Quebra do sigilo pela coluna de períodos | Alta | Atrás da chave, com texto neutro; revisar o código publicado |
| Troca em todas as lojas no mesmo dia, sem piloto (decisão 9) | Alta | Treino antes; as 4 planilhas lidas antes; planilha em branco como plano de volta; alguém da etapa disponível no primeiro dia |
| Interpretação errada das cores e rodadas | Média | Confirmar com o Felipe e uma recepcionista antes do mockup |
| Outras lojas com planilha diferente | Média | Pedir as planilhas das outras 3 lojas antes da etapa 1 |
| Choque de arquivos com Parcerias e a lista de melhorias | Baixa | Etapa só começa com eles entregues |

### Esforço por etapa (estimativa em dias de trabalho; chute, não medição)

| Etapa | Dias |
| --- | --- |
| 0. Confirmar as hipóteses com uma recepcionista e fazer o mockup da tela (computador e 375px), parando para o Felipe ver | 1 |
| 1. Banco: presença ampliada, eventos, tipos, como conheceu, atendimentos, apelido e CRECI, funções, RLS, auditoria e testes por perfil | 2,5 |
| 2. Tela `/recepcao/`: Na loja agora, vez, especialistas, Clientes de hoje, digitação por teclado, correção, estados | 2,5 |
| 3. Cadastro por tipo (3.1): criar ou achar o lead na carteira do corretor, vez dos especialistas, procurar e registrar o retorno, card "Anuncie", testes de banco por perfil | 2 |
| 4. Clientes de parceiros do gerente (tabela, RLS e tela), como etapa do módulo de Parcerias | 1,5 |
| 5. Relatório da loja (gerente e gerente geral) e exportação CSV | 1 |
| 6. Períodos na tela, só com a chave ligada (evidência e confirmar) | 0,5 |
| 7. Preparar a troca (cadastros, treino) e acompanhar o primeiro dia nas 4 lojas | 0,5 |
| **Total etapa 1** | **cerca de 12 dias** |
| Depois: o check-in pelo celular entra na mesma vez (estudo anterior) | conforme aquele estudo |
| Depois: escala das recepcionistas no CRM (se o Felipe quiser) | 1,5 |

### Decisões do Felipe (04/11/2026)

Todas as decisões abertas foram respondidas em 04/11/2026. O número é o da versão anterior desta lista.

**O cadastro e a vez**

| # | Pergunta | Resposta |
| --- | --- | --- |
| 1 | O cliente vira lead? | Sim, no próprio cadastro da recepção. O cliente novo vira lead do corretor da vez; a indicação de corretor atualiza o lead dele; a indicação de parceiro vai para "Clientes de parceiros" do gerente (3.1) |
| 2 | E o corretor de imobiliária parceira? | É o parceiro, e o cliente dele fica na base do gerente dono do parceiro |
| 3 | A vez vai para o CRM? | Sim, a dos corretores e a dos especialistas, que é própria. Quando cada uma gira está na 3.1 |
| 4 | Qual é a ordem da vez? | **É a roleta deles, feita todo dia na loja, do jeito tradicional. O CRM não calcula nem sorteia.** A recepção digita os corretores e os especialistas na ordem da roleta do dia. O CRM só segue essa ordem em círculo, pulando quem saiu, e mostra quem é o próximo |
| 5 | O especialista é usuário do CRM? | **Não, só o nome**, escolhido de uma lista de especialistas mantida no CRM |
| 6 | Como registrar o acompanhante? | **Nome obrigatório, como hoje**, quando há acompanhante. Há a opção "Veio sozinho" |
| 7 | Qual lista em "Como conheceu"? | **Uma lista otimizada** que junte a da planilha e a do lançamento (proposta abaixo, a aprovar no mockup) |
| 16 | E se a indicação de corretor não estiver na carteira dele? | O CRM cria o lead na carteira desse corretor, com a origem Indicação |
| 17 | Como o lead criado pela recepção entra na lista do dia? | Com a anotação "Atendido no plantão" e o próximo contato no dia seguinte, às 10h |
| 18 | E se o telefone do cliente novo já for de outro corretor? | O CRM avisa sem dizer de quem é, e a recepção decide. O caso fica no histórico |
| 22 | O retorno precisa de aprovação? | Não, só fica registrado ("autorização" era "atualização") |

**Parceiros**

| # | Pergunta | Resposta |
| --- | --- | --- |
| 19 | E se o parceiro não estiver cadastrado? | **Depende.** Se ele chega procurando um gerente, o cliente vai para esse gerente. Se não tem gerente nenhum, o parceiro entra na **roleta de parceiros do módulo de Parcerias**, e o cliente vai para o gerente que ela escolher. Primeiro o Felipe falou em uma ordem fixa por plantão; na pergunta seguinte, escolheu usar a roleta de parceiros |
| 20 | Quando o parceiro troca de gerente (90 dias), os clientes vão junto? | **Não, ficam com o gerente antigo** |

**Funcionamento e dados**

| # | Pergunta | Resposta |
| --- | --- | --- |
| 10 | Como o CRM sabe a loja? | Ela escolhe na tela e o aparelho lembra. A escala continua fora do CRM |
| 11 | Apelido e CRECI? | Apelido obrigatório para corretor ativo e CRECI opcional |
| 12 | O que a recepção vê? | **Só os clientes de hoje**, para conferir e corrigir. Os dias anteriores, só pela busca do retorno |
| 15 | Qual aparelho? | O PC da loja; o celular só como reserva |
| 21 | Aviso no celular para quem é anunciado? | Depois da etapa 1 |

**Transição, relatórios e programa**

| # | Pergunta | Resposta |
| --- | --- | --- |
| 8 | E o histórico da planilha? | Não importar; a planilha fica guardada como arquivo |
| 9 | Como trocar? | **Todas as lojas de uma vez**, sem piloto |
| 13 | Que relatório não pode faltar? | O relatório da loja, e **as visitas também entram nos outros relatórios do CRM** (visitas totais, por corretor e outros). Os relatórios úteis para o Felipe e para o marketing ficam para **uma sessão própria** |
| 14 | O atendimento vale como prova da visita realizada (programa)? | **Só a indicação conta.** A visita espontânea (cliente novo da vez) não conta para os pontos |

### O que as respostas mudam no desenho

- **A vez (4):** a função não calcula "quem tem menos atendimentos". A recepção monta a fila do dia na ordem da roleta deles (o campo "Chegou" vira "Pôr na vez", na ordem), e o CRM aponta o próximo em círculo, pulando quem está como "Saiu". O "Passar a vez" continua, registrado. As rodadas (✓) continuam aparecendo, só para a recepção conferir.
- **Especialista (5):** sai `especialista_id` em `profiles`. Entra a tabela `especialistas` (nome, loja, ativo), que o gerente geral e o operacional editam. A vez dos especialistas usa essa lista.
- **Acompanhante (6):** "Nome do acompanhante" é obrigatório, com o botão "Veio sozinho". Mais de um nome fica no mesmo campo, separado por vírgula.
- **Como conheceu (7), proposta de lista única, com escolha múltipla:**
  - passagem pela loja;
  - mora ou trabalha na região;
  - indicação de amigo, família ou vizinho;
  - Instagram;
  - Facebook ou outras redes;
  - WhatsApp;
  - site MBigucci;
  - Google ou internet;
  - outdoor;
  - painel de LED;
  - folheto ou panfleto;
  - e-mail marketing;
  - telefone da loja;
  - outro.

  "Indicação de corretor" e "Retorno" saem da lista, porque já são o tipo do cliente.
- **Parceiro sem gerente (19):** a recepção cadastra o parceiro, que entra pela **mesma roleta de parceiros do módulo de Parcerias** (vai o gerente que recebeu parceiro há mais tempo), como se tivesse chegado pelo link. Se ele chega procurando um gerente, a recepção escolhe esse gerente. A função de entrada do parceiro é a da sessão de Parcerias, que precisa aceitar a recepção como origem.
- **Clientes ficam com o gerente antigo (20):** `parceiro_clientes.gerente_id` é gravado na visita e não muda quando o parceiro troca de gerente. O novo gerente vê o parceiro, mas não os clientes antigos dele.
- **Lista da recepção (12):** "Clientes de hoje" mostra só o dia. A correção depois do dia é só pelo gerente geral ou pelo operacional. Com isso, a retenção da seção 7 perde o sentido: todo cliente vira lead ou cliente de parceiro e segue as regras deles.
- **Transição (9):** sem piloto. Isso exige, antes do dia da troca:
  - as planilhas das outras 3 lojas lidas;
  - todos os corretores com usuário e apelido;
  - os especialistas e a vez dos gerentes de cada plantão cadastrados;
  - uma conta e um treino para cada recepcionista;
  - a planilha em branco pronta como plano de volta.

  O risco de a troca dar errado no primeiro dia sobe (seção 8, Riscos).
- **Programa (14):** depois da reunião de novembro, e atrás da chave, a **indicação de corretor** registrada pela recepção pode gerar a visita realizada pendente do corretor, que o gerente geral aprova. O cliente novo da vez nunca gera. Só a **primeira visita** do cliente de indicação conta; os retornos não contam (Felipe, 04/11/2026). **Fica para a etapa:** se a mesma visita também estiver na Agenda do corretor, conta uma vez só (proposta: uma visita realizada por cliente, a que vier primeiro).
- **Relatórios (13):** as visitas da recepção entram no painel da equipe e no relatório do corretor (visitas no plantão por corretor). Os relatórios para o Felipe e para o marketing ficam para uma sessão própria.

### Perguntas que sobraram

Nenhuma. As duas últimas foram respondidas em 04/11/2026: só a primeira visita do cliente de indicação conta para o programa, e o parceiro sem gerente vai pela roleta de parceiros.

## 9. Da Bruna

| Recurso da Bruna | Como fica aqui | Por quê |
| --- | --- | --- |
| Não há recepção, plantão nem vez no CRM da Bruna (busca por "recep" e "plantão" em `ref/CRM Bruna/src`, pasta conferida, sem resultado) | Construído do zero | A Bruna é uma imobiliária de 2 pessoas, sem loja com recepção |
| Cadastro rápido e aviso de duplicado pelo telefone (`new-lead-dialog.tsx`, `useDuplicate`) | O cadastro da recepção usa a mesma normalização do telefone e o mesmo aviso de duplicado sem dizer o dono, dentro da função do banco | Uma regra só para os dois cadastros |
| Desfazer no aviso em vez de confirmação | Registrar cliente, saída, volta e passar a vez com Desfazer de 8 s | Padrão do CRM (`AvisoDesfazer`) |

## 10. O que foi conferido e o que não foi

**Conferido nesta sessão:**
- **A planilha**, por uma cópia aberta na pasta temporária da sessão:
  - as 14 abas (4 ocultas) e as colunas e os cabeçalhos de cada uma;
  - as contagens de preenchimento, de vazios e de "\*\*\*";
  - o volume por mês e os blocos diários da vez;
  - as fórmulas (as buscas do gerente e do CRECI) e as consultas do Power Query;
  - a ausência de validações e de formatação condicional;
  - as cores por coluna e o cruzamento das cores com os períodos;
  - as tabelas do Excel e o alcance de `Tabela1`;
  - os gráficos e o detalhe da tabela dinâmica.
- **Os documentos do CRM:** `CLAUDE.md`; `docs/acessos-perfis.md`, `docs/leads.md`, `docs/visitas.md`, `docs/pontuacao-verba.md`, `docs/estudo-checkin-plantao.md`, `docs/referencia-crm-bruna.md` e `docs/design-system.md`, todos inteiros; `docs/codex-parcerias.md`, por busca de termos.
- **O código:** `crm/src/app/plantao/page.tsx`, inteiro; `crm/src/app/leads/novo/page.tsx`, por busca dos campos e das permissões; `crm/supabase/schema.sql` nos perfis, permissões, `profiles`, `lead_origens`, `leads` e `plantao_corretores` (que exige `ve_programa()`); `parcerias.sql`, por busca (tem CRECI no parceiro).

**Não conferido:**
- **O significado das cores e das colunas 0/1** da vez: são hipóteses tiradas das contagens. Confirmar com uma recepcionista.
- **Que especialista e recepcionista são as mesmas pessoas:** só o primeiro nome bate.
- **As planilhas das outras lojas** (Home Store, Easy, Elleva). Só a da Marco Zero foi lida.
- **Quem lê a planilha e para quê** (decisão 13).
- O conteúdo das consultas do Power Query (a fonte em PDF).
- Se todos os corretores ativos têm usuário no CRM.
- Nenhuma tela foi desenhada em código nem testada; o mockup é só o desenho em texto da seção 3.
- O texto da LGPD: as propostas de retenção e de quem vê são técnicas, não parecer jurídico.
- As estimativas de esforço são chute.
- **A seção 3.1** foi escrita a partir da fala do Felipe, transcrita por voz. A palavra "autorização" do retorno era "atualização", como o Felipe confirmou. A busca na carteira do corretor e o cliente de parceiro não foram conferidos contra o código do módulo de Parcerias, que está em construção.

**Dados pessoais:** nenhum nome, telefone, e-mail ou CRECI da planilha foi copiado para este documento, para o Git ou para outro arquivo do projeto. Os exemplos da seção 3 são inventados. A cópia da planilha usada na leitura ficou só na pasta temporária da sessão, fora do projeto, e foi apagada no fim. O arquivo original não foi alterado: o tamanho e a data de modificação são os mesmos de antes da leitura.

**Índice:** `CLAUDE.md` não foi atualizado, porque este estudo não podia alterar outros arquivos. A sessão principal precisa acrescentar a linha de `docs/estudo-recepcao.md` em "Onde encontrar contexto".
