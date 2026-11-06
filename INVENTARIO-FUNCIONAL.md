# Inventário funcional · Base360 Vendas e Base360 Marketing

> Levantado em 06/11/2026, lendo o código da `main` (commit 610b457): `crm/` (Base360 Vendas, publicado em `/vendas`), `marketing/` (Base360 Marketing, em `/marketing`) e os SQL e Edge Functions em `crm/supabase/`. Serve para alimentar um design system comum aos módulos da MBigucci.

**O que este inventário cobre e o que não cobre**
- **Ignora** cores, fontes, tema e estilo visual. Registra só o que existe e o que faz.
- **Textos:** as palavras entre aspas são as do código. Os glifos ✓ ! ✕ → ○ – fazem parte do texto da interface, porque o app não usa ícones nos estados (os ícones existem só na navegação).
- **Base de verdade:** a fonte é o código. O banco em produção pode ter permissões ajustadas pelo gerente geral, e a distribuição automática (`distribuicao.sql`) está escrita, mas ainda não foi instalada.
- **Fora do escopo:** o portal da raiz (escolha de módulo), o redirecionamento do Repasse e a pesquisa `discovery/`.

**Sumário**
1. [Telas](#1-telas)
2. [Peças, ações e estados, por tela](#2-a-4-peças-ações-e-estados-por-tela) (itens 2, 3 e 4 do pedido)
3. [Status, etapas e classificações](#5-status-etapas-e-classificações)
4. [Perfis e permissões](#6-perfis-e-permissões)
5. [Notificações, automações e integrações](#7-notificações-automações-e-integrações)
6. [Celular e computador](#8-celular-e-computador)
7. [Atalhos e navegação](#9-atalhos-e-navegação)
8. [Peças que se repetem e peças improvisadas](#10-peças-que-se-repetem-e-peças-improvisadas)
9. [Anexo: divergências, correções e lacunas](#anexo-divergências-correções-e-lacunas)

**Abreviações de caminho:** `app/` = `crm/src/app/`, `comp/` ou `components/` = `crm/src/components/`, `lib/` = `crm/src/lib/`, `cl/` = `crm/src/components/leads/`, `cv/` = `crm/src/components/visitas/visitas.tsx`.

**Perfis**, abreviados nas tabelas:
- GG = gerente geral;
- Op = operacional;
- Ger = gerente;
- Cor = corretor;
- Rec = recepção;
- Esp = especialista.

---

## 1. Telas

As rotas do Vendas ficam sob `/vendas/`. "Quem usa" segue as permissões padrão do SQL (seção 6).

> **Atenção:** só as telas com `exige` ou `soGerenteGeral` bloqueiam quem abre o endereço direto. As outras abrem para qualquer perfil logado, e o RLS devolve zero linhas.

### Base360 Vendas

| Rota | Tela | Objetivo | Quem usa (condição) |
|---|---|---|---|
| `/` | Lista do dia | Mostrar ao corretor quem atender agora: prazos, atrasados, hoje, visitas, aniversários | Cor (`leads.cadastrar` sem `leads.atribuir`) |
| `/` | Início | Atalhos para leads, painel, vendas, metas e administração, a equipe e os contatos de parceiros do dia | Todos os demais perfis. Quem não tem nenhuma permissão de leads vê "Em construção" |
| `/leads/` | Leads | Lista pesquisável e filtrável da carteira, com a tabela "Por corretor" para quem vê a equipe | Cor, Ger, GG |
| `/leads/quadro/` | Quadro | Os leads ativos em colunas por etapa | Cor, Ger, GG |
| `/leads/ficha/?id=` | Ficha do lead | Trabalhar um lead: contatar, registrar interação, visita, venda, perfil, documentos, descarte, atribuição | O dono edita; Ger e GG leem e atribuem |
| `/leads/novo/` | Novo lead / Lead da empresa | Cadastro rápido, com o Cadastro Mágico (colar mensagem) | Cor (`leads.cadastrar`); Ger e GG (`leads.atribuir`, para um corretor) |
| `/agenda/` | Agenda | A semana com visitas e retornos, e o agendamento de visita | Cor agenda; Ger e GG consultam |
| `/painel/` | Painel da equipe / Meu painel | Números do período por corretor, funil, conversão, visitas, stand, vendas, meta anual, relatório individual e impressão | Ger, GG; Cor vê o próprio |
| `/vendas/` | Vendas | Vendas assinadas por mês ou ano: registrar, marcar paga, corrigir, cancelar | Cor registra; Ger corrige (`vendas.corrigir_equipe`) |
| `/metas/` | Metas | Meta anual de VGV, definição pelo GG e metas próprias do corretor | Todos com leads; definir é `metas.definir_vgv` |
| `/ranking/` | Ranking | Pontos aprovados no mês, por corretor | Todos |
| `/faixas/` | Faixas de VGV | Prêmio mensal por VGV e edição das faixas | Só GG (regra fixa) |
| `/programa/` | Pontos e verba | Resumo mensal do programa, fechamento do mês e critérios | Só GG |
| `/programa/aprovacao/` | Aprovar lançamentos | Fila de aprovação de pontos, em lote | Só GG |
| `/meus-pontos/` | Meus pontos | Pontos aprovados e verba prevista do corretor | Cor (`leads.cadastrar`) |
| `/plantao/` | Plantão | Períodos do plantão, saída para visita, roleta do fim de semana e vídeos | Rec, Op (`plantao.registrar`); Ger, Op (`lancamentos.registrar`) |
| `/empreendimentos/` | Empreendimentos | Catálogo com busca e filtros, e o envio ao cliente | Todos; Op gerencia |
| `/empreendimentos/ver/?slug=` | Empreendimento | Detalhe, tipologias, material e clientes compatíveis (Radar) | Todos |
| `/empreendimentos/editar/` | Editar empreendimento | Criar ou editar o empreendimento e as tipologias | Op (`empreendimentos.gerenciar`) |
| `/empreendimentos/importar/` | Importar tabela de preços | Importar a tabela do mês por IA externa (JSON), com prévia | Op (`empreendimentos.gerenciar`) |
| `/recepcao/` | Recepção | A vez do stand, o cadastro do cliente por tipo e o "Anuncie" | Rec, Op (`plantao.atendimentos`) |
| `/recepcao/relatorio/` | Relatório do stand | Clientes do período por tipo, mídia, empreendimento, corretor e especialista, com impressão | Ger, Op, GG (`plantao.atendimentos_ver`) |
| `/recepcao/stands/` | Stands e especialistas | Configurar stands, especialistas, "Como conheceu" e a localização do stand | Op, GG (`plantoes.gerenciar`) |
| `/parceiros/` | Parceiros | Carteira de parceiros com o prazo de 90 dias e os contatos do dia | Ger (`parceiros.cadastrar`), GG (`parceiros.ver_todos`) |
| `/parceiros/novo/` | Novo parceiro | Cadastro à mão | Ger, GG |
| `/parceiros/ficha/?id=` | Ficha do parceiro | Contato, prazo, interação, edição e linha do tempo | Ger, GG; edita só o dono |
| `/parceiros/evento/` | Registrar evento | Interação "Evento" em lote | Ger, GG |
| `/fila/` | Fila de leads | Fila da distribuição automática, com a visão do corretor ou do gerente | Cor que recebe (com fila visível), Ger com equipe, GG; só com a distribuição ligada |
| `/fila/como/` | Como é calculado | Explicação da faixa de desempenho | Os mesmos |
| `/distribuicao/` | Distribuição | Chaves e modo da distribuição, leads "A distribuir" e vez das equipes | Só GG (regra fixa) |
| `/equipes/corretor/?id=` | Configuração do corretor | Produtos que atende e "Na distribuição" | Ger, Op (`distribuicao.produtos`) |
| `/entrar/` | Entrar | Login por e-mail e senha | Sem sessão |
| `/conta/` | Minha conta | Dados, WhatsApp, aparência, avisos no celular, senha e instalação | Todos |
| `/usuarios/` | Usuários | Criar contas e editar perfil, equipe, situação, apelido, CRECI, senha | GG (`usuarios.gerenciar`) |
| `/equipes/` | Equipes | Criar, editar e excluir equipes e escolher o gerente | GG (`equipes.gerenciar`) |
| `/configuracoes/` | Configurações | Horário de atendimento, mensagens prontas do WhatsApp e permissões por perfil | Só GG |

### Base360 Marketing

| Rota | Tela | Objetivo | Quem usa |
|---|---|---|---|
| `/` | Início | Redireciona o GG ao Direcionador. Os demais leem "O Marketing ainda não tem telas para o seu perfil." | Todos |
| `/direcionador/` | Direcionador de leads | Regras por produto, fonte, dia e horário que mandam cada lead de e-mail ao Vendas ou a outro destino, com porcentagem e limite diário | Só GG |
| `/conta/` | Minha conta | Nome, e-mail e aparência (o resto fica no Vendas) | Todos |
| `/entrar/` | Entrar | Igual ao do Vendas | Sem sessão |

---

## 2 a 4. Peças, ações e estados, por tela

Cada tela traz:
- as peças de interface (item 2);
- as ações e quais pedem confirmação (item 3);
- os estados: vazio, carregando, erro, sem permissão e sem conexão (item 4);
- o que muda no celular.

Os estados e mensagens comuns a todas as telas vêm primeiro.

### Comum a todas as telas

**Sem conexão.** Em todas as telas logadas, o cabeçalho monta o `AvisoOffline` (`comp/aviso-offline.tsx`, região `role="status"`).
- Sem internet, ele flutua sem deslocar a tela, no canto superior direito no computador e logo abaixo do cabeçalho no celular. O texto é "! Sem conexão. Nada é gravado no Base360 até a internet voltar."
- Com o aviso na tela, o campo em foco rola para baixo dele.
- Não existe fila de gravações offline nem cache de dados. O service worker só recebe push.
- O que existe é:
  - rascunho no aparelho (`sessionStorage`) nos formulários longos;
  - id gerado no aparelho, para o reenvio não duplicar;
  - os erros de gravação `erroAoSalvar`, abaixo.

#### `Casca` (`components/casca.tsx`)
Cada tela interna usa `<Casca titulo exige? soGerenteGeral?>`.

- **Estados da sessão** (`lib/sessao.tsx`): `carregando`, `sem-config`, `deslogado`, `desativado`, `erro`, `pronto`.
- **O que a Casca mostra fora de "pronto":**
  - `sem-config`: `SemConfiguracao`;
  - `desativado`: cartão "! Conta desativada", "A conta {e-mail} não está ativa no Base360 Vendas. Fale com o gerente geral." e botão "Sair";
  - `erro`: "! Não foi possível carregar sua conta" mais a mensagem;
  - `carregando` ou `deslogado`: "Carregando…". Em `deslogado` redireciona para `/entrar/`.
- **Sem permissão:** cartão com "! Seu perfil não tem acesso a esta página." (`exige` não satisfeito, ou `soGerenteGeral` sem ser gerente geral).
- **Estrutura:** `Cabecalho`, `FolhasDistribuicao`, `BarraLateral` e uma área principal (`max-w-content` 1180px) com `<h1 class="titulo-pagina">`.
- `exige` usa `pode()`. O gerente geral sempre passa (`sessao.tsx:77`).

#### Mensagens padronizadas (`lib/erros.ts`)

`mensagemErro` traduz, nesta ordem de verificação:

| Condição | Texto |
|---|---|
| `profiles_corretor_ativo_tem_equipe` | Corretor ativo precisa estar em uma equipe. |
| `teams_nome_unico` | Já existe uma equipe com esse nome. |
| `profiles_apelido_ativo_unico` | Já existe um corretor ativo com esse apelido. Escolha outro. |
| `profiles_equipe_id_fkey` | A equipe ainda tem pessoas. Mova-as para outra equipe antes de excluir. |
| `teams_gerente_id_fkey` | Essa pessoa é gerente de uma equipe. |
| `leads_whatsapp_check` | Confira o WhatsApp: DDD e número, só com dígitos. |
| `leads_descarte_tem_motivo` | Escolha o motivo do descarte. |
| `lead_interacoes_texto_check` ou `leads_nome_check` | Preencha o texto. |
| `visitas_empreendimento_check` ou `vendas_empreendimento_check` | Escolha o empreendimento. |
| `visitas_comprovante_check` | O comprovante precisa ser um link que começa com https://. |
| `vendas_vgv_check` | Confira o VGV: maior que zero. |
| `vendas_pagamento_tem_data` | Informe a data do pagamento. |
| `metas_sem_duplicar` | Já existe uma meta com essa métrica e esse período. Edite a que está na lista. |
| `leads_perfil_ampliado_check` | Confira os campos do perfil. |
| tamanho do documento | O arquivo passa de 10 MB. |
| tipo do documento | Envie um PDF ou uma foto. |
| `does not exist`, `schema cache`, `bucket not found` | Esta parte do Base360 Vendas ainda não foi ativada. Avise o gerente geral. |
| `row-level security`, `permission denied` | Você não tem permissão para isso. |
| `failed to fetch`, `network`, `load failed` | Sem conexão com o servidor. Tente de novo. |
| `rate limit`, `too many requests` | Muita gente entrando ao mesmo tempo. Espere um minuto e tente de novo. |
| `jwt expired`, `invalid jwt` | Sua sessão expirou. Entre de novo em outra aba; o que você digitou continua aqui. |
| sem mensagem | Algo deu errado. Tente de novo. |
| qualquer outra | a mensagem original, sem tradução |

Constantes e funções do mesmo arquivo:
- `SEM_CONEXAO_REFAZER`: "Não foi salvo: sem conexão. Faça de novo quando a internet voltar."
- `semConexaoComRascunho(botão)`: "Não foi salvo: sem conexão. O texto ficou guardado neste aparelho. Toque em {botão} quando a internet voltar."
- `NAO_SALVOU`: "Não foi salvo: este lead mudou de dono ou você não tem mais acesso a ele. Recarregue a página."
- `erroAoSalvar(e, botão?)` escolhe entre os dois textos de sem conexão; os demais erros seguem `mensagemErro`.
- `jaEstavaSalvo(e)`: código `23505` com `_pkey` conta como salvo (id gerado no aparelho contra duplicado).
- `ehSemConexao(e)`.

**Texto da `Casca` para erro de sessão (`SemConfiguracao`):** "! Supabase não configurado. Este build foi gerado sem NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. Preencha o arquivo .env.local e rode npm run build de novo (veja o README)." Esse texto técnico aparece na tela para o usuário.

### 2.1 Leads e atendimento

#### Regras comuns de acesso (valem para todas as telas)
- Todas usam `Casca` (`components/casca.tsx`). Sem login: redireciona para `/entrar/`. Conta desativada: "! Conta desativada". Erro de conta: "! Não foi possível carregar sua conta". Enquanto carrega: "Carregando…".
- Sem permissão na tela: card com "! Seu perfil não tem acesso a esta página." (`casca.tsx:111`).
- Item de menu Leads, Quadro e Agenda só aparece com `leads.cadastrar` ou `dados.ver_equipe` ou `dados.ver_todos` (`casca.tsx:65-72`). `leads/page.tsx`, `quadro`, `ficha` e `agenda` não passam `exige`: quem decide o que cada um vê é o RLS do banco.
- `ehListaDoDia(pode) = pode("leads.cadastrar") && !pode("leads.atribuir")` (`casca.tsx:125`).

#### Início (`app/page.tsx`, rota `/`)
**Objetivo e quem usa.** Se `ehListaDoDia`, é a Lista do dia do corretor (título "Lista do dia"). Senão é "Início", com atalhos para quem distribui ou gerencia.

**Início (não corretor)**
- Eyebrow com o nome do perfil, e "Olá, {primeiro nome}."
- Bloco de parceiros: `ContatosDoDiaParceirosNoInicio`, se `pode("parceiros.cadastrar")`.
- Cards-atalho (componente local `Atalho`, link "Abrir"), em `md:grid-cols-3`:

| Atalho | Condição |
|---|---|
| Leads (gerente geral) / "Leads da equipe" | `leads.atribuir`, `dados.ver_equipe` ou `dados.ver_todos` |
| "Painel da equipe" | mesma condição |
| Vendas / "Vendas da equipe" | mesma condição |
| Metas / "Metas da equipe" | mesma condição |
| Usuários | `usuarios.gerenciar` |
| Equipes | `equipes.gerenciar` |
| Configurações | gerente geral |

- Cards "Sua equipe": `MinhasEquipes` lista as equipes do gerente com os membros ("Ainda sem corretores." se vazio). `MinhaEquipe` mostra o nome da equipe do usuário.
- Vazio: card "Em construção" ("O Base360 Vendas está sendo montado por etapas…") para quem não é gerente geral e não vê leads.

##### Lista do dia (`cl/lista-do-dia.tsx`)
**Quem usa.** Corretor (`leads.cadastrar` sem `leads.atribuir`). Lê só os leads ativos dele (`dono_id = eu.id`).

**Peças, de cima para baixo**
1. `LinhaDoStand` (distribuição): "Marco Zero · check-in 9h04 · Opções". O botão Opções abre a folha de estado.
2. Data por extenso ("Quinta-feira, 06/11/2026") e botão "+ Novo lead", dentro de `RodapeAcao`. Fica vermelho se não há leads e secundário se há.
3. Estado vazio: card "Cadastre seu primeiro lead" (texto sobre Colar mensagem) e link "Cadastrar lead".
4. Bloco escuro `veredito` ("Prioridades do dia", título "Contatos que precisam de atenção"). Só aparece com grupos urgentes. Um link por grupo urgente, com o número e o título do grupo seguido de "→". Âncoras `#grupo-…`. Abaixo, "{n} visita(s) hoje · próxima às 14h  Ver visitas →", se houver visita hoje.
5. Grupos de leads, com `CardLead`, em `md:grid-cols-2`. Título "Título · n".
6. Visitas: "Visitas de hoje · n" e "Aguardando baixa · n", via `ListaVisitas`.
7. "Aniversários de hoje · n": card "→ Aniversário de {nome} hoje" com os botões "Mandar parabéns →" (modelo `parabens`) e "Abrir".
8. "✓ Nada para hoje" ("Seus próximos contatos estão marcados para os próximos dias. Veja todos em Leads.") quando há leads, mas nenhum grupo nem visita.
9. Rodapé: "{n} lead(s) tem/têm contato marcado para os próximos dias. Ver todos" (link para `/leads/`).
10. `MetasNoInicio` (metas, fora da minha área).

**Ordem e destaque.** Grupos urgentes primeiro (`primeiro_contato`, `detalhar`, `atrasados`). Depois as visitas. Depois os demais. A barra vermelha (`bar-brand`) fica só no primeiro card do primeiro grupo mostrado. O relógio (`agora`) atualiza a cada 60 s. O toque grava e recarrega a lista.

**Ações**
- No card: Abrir (ficha), WhatsApp, Detalhar.
- Mandar parabéns.
- Ações do card da visita (ver Visitas).
- Não há confirmação em nenhuma.

**Estados:** erro `! {mensagem}` (classe `aviso-erro`), "Carregando…". Se visitas ou aniversários falharem, a lista continua e esses blocos ficam vazios, sem erro.

#### Leads (`app/leads/page.tsx`, `/leads/`)
**Objetivo e quem usa.** Lista pesquisável e filtrável de leads. Corretor vê os seus; quem tem `dados.ver_equipe` ou `dados.ver_todos` vê os da equipe ou todos, via RLS. Título "Leads da equipe" se `ver_equipe` sem `ver_todos`, senão "Leads".

**Peças**
- `Filtros` (`cl/filtros.tsx`), com rótulos exatos:
  - "Buscar", input `type=search`, placeholder "Nome, telefone ou empreendimento". É a busca textual local do `criarBusca`, sem acento. Telefone vale em qualquer formato. Cada termo precisa aparecer em nome, e-mail, empreendimento, campanha ou região.
  - "Corretor" (só se `veOutros`): "Todos" ou um corretor. É filtro no banco.
  - "Origem": "Todas" ou uma origem do catálogo. Filtro local.
  - "Empreendimento": "Todos", "{nome} ({total})" e "Sem empreendimento". Agrupa grafias iguais sem acento. Filtro local.
  - "Situação": "Ativos" ou "Descartados". Filtro no banco.
- Tabela "Por corretor" (única tabela da área). Aparece só se `veOutros`, Situação Ativos e sem outro filtro. Colunas: Corretor (botão que aplica o filtro de corretor), Ativos, Prazo estourado, Atrasados, Sem contato. Valores > 0 em vermelho com "!". Linha com prazo estourado ganha fundo `bg-tint-brand`. Ordem: estourados, atrasados, ativos. Lead sem dono fica fora.
- Cabeçalho da lista: "Leads ativos · n" ou "Descartados · n", com o seletor "Ordenar por". A ordem fica guardada em `localStorage["crm.leads.ordem"]`.
- Lista de `CardLead` em `md:grid-cols-2`. Para quem vê outros, mostra o dono ou "A distribuir".
- Botão fixo "+ Lead da empresa" (se `leads.atribuir`) ou "+ Novo lead" (se `leads.cadastrar`), que leva a `/leads/novo/`.

**Ações:** Abrir, WhatsApp, mudar ordem, filtrar. Sem confirmações.

**Estados**
- Carregando: "Carregando…".
- Erro: "! {erro}".
- Vazio com filtro ou busca: "Nenhum lead com essa busca ou filtro."
- Vazio sem filtro: "Nenhum lead ativo." ou "Nenhum lead descartado."

#### Quadro (`app/leads/quadro/page.tsx`, `/leads/quadro/`)
**Objetivo e quem usa.** Segunda visão dos leads: uma coluna por etapa. Mesmos usuários e mesmos filtros da tela 2, mas sem Buscar e sem Situação (só leads ativos).

**Peças**
- `Filtros`: Corretor, Origem e Empreendimento.
- Colunas roláveis na horizontal, `w-[78vw] max-w-[280px]`, com `scroll-snap`.
- Título da coluna: nome da etapa e contagem grande.
- Etapas: as ativas, mais qualquer etapa inativa que tenha lead.
- Cartão (`CartaoQuadro`, é um link para a ficha): nome, prazo ou próximo contato, "! Sem contato há N dias", `SeloTemperatura` e dono.
- Dentro da coluna, o mais esquecido fica no topo (ordem `sem_contato`).
- Barra vermelha só no primeiro cartão urgente da coluna (prazo estourado ou próximo contato vencido).
- Coluna vazia mostra "Vazio" (borda tracejada).

**Ações:** só abrir a ficha. Não há mover etapa arrastando; a etapa muda na ficha.

**Estados:** "Carregando…", "! {erro}".

#### Ficha do lead (`app/leads/ficha/page.tsx`, `/leads/ficha/?id=…`)
**Objetivo e quem usa.** Trabalhar um lead: contatar, registrar, agendar visita, vender, descartar, atribuir.
- O dono (`lead.dono_id === eu.id && pode("leads.cadastrar")`) tem tudo.
- Gerente ou quem vê outros tem leitura. Com `leads.atribuir` ainda vê o bloco "Atribuir".

**Estados de entrada:**
- Sem `?id`: "! Lead não informado. Volte para a lista."
- Carregando: "Carregando…".
- Lead nulo: card "! Lead não encontrado, ou você não tem acesso a ele." com o link "Ver leads".
- Erro: "! {erro}".

**Cabeçalho do card (`bar-brand`)**
- Etapa (eyebrow), nome (h2), WhatsApp formatado ou "– Sem telefone", `SeloTemperatura`.
- Se não há telefone e o usuário é o dono ativo: formulário `DigitarWhatsapp`.
  - Campo "WhatsApp com DDD", `type=tel`, placeholder `(11) 98765-4321`, botão Salvar.
  - Valida pelo `normalizarWhatsapp`: "Confira o WhatsApp: DDD e número, como (11) 98765-4321."
  - Se houver duplicado, avisa e pede um segundo Salvar: "… Toque em Salvar de novo para seguir assim mesmo."
- Lista de dados (`dl`), com linhas condicionais:
  - Mensagem nova.
  - Primeiro contato (prazo).
  - Próximo contato.
  - Último contato: "Nenhum ainda" ou "Tentativa N de 3 sem resposta".
  - A detalhar.
  - Origem (e campanha).
  - Empreendimento (link para o catálogo, se existir).
  - E-mail.
  - Outro telefone, com link `tel:`.
  - Corretor (se não é dono; "A distribuir" se sem dono).
  - Cadastrado.
- `ResumoDoPerfil`:
  - Aviso de aniversário (hoje, amanhã ou em até 7 dias), com "Mandar parabéns →" no dia.
  - Linha de perfil (orçamento, dormitórios, região, finalidade, pagamento, entrada, renda, fase, prazo), com "Editar".
  - Sem perfil: "Perfil vazio. Preencher quando der".
- Descartado: "✕ Descartado · {motivo}".
- Botões grandes: `BotaoMensagem` (WhatsApp →) e `BotaoLigar` ("Ligar", link `tel:+55…`), só se há WhatsApp. Para o dono ativo, os dois gravam toque automático.

**Seções (ordem no celular = `order-[n]`)**
1. **Registrar interação** (form `#registrar`; só dono ativo).
   - "Como foi": botões WhatsApp, Ligação, E-mail, Visita, Anotação. "Sem resposta" aparece só com 2 dias ou mais sem contato, ou se já estiver marcado.
   - "O que aconteceu": textarea obrigatória, placeholder "Ex.: Falou que quer visitar no sábado".
   - "Próximo contato": `CampoProximoContato`, obrigatório, com os atalhos Hoje, Amanhã, Em 3 dias, Em 1 semana, mais campos Dia e Hora.
   - Botão "Registrar". Com Sem resposta: "Registrar tentativa N de 3".
   - Escolher Sem resposta preenche o texto "Tentei contato, sem retorno." e o próximo contato em 2 dias, e restaura os valores ao trocar de tipo.
   - Depois do toque em WhatsApp ou Ligar, o tipo já vem marcado e aparece o texto "→ Você abriu o WhatsApp/ligou {quando}. Conte como foi."
   - Erros: "Escreva o que aconteceu.", "Marque o dia e a hora do próximo contato.", "Confira o dia e a hora do próximo contato."
   - Sucesso: "✓ Interação registrada" por 6 s.
   - Mantém rascunho em `sessionStorage` e reenvia com o mesmo id.
2. **Sugestão de descarte** (card, quando `tentativas >= 3`): "! N tentativas sem resposta", botão "✕ Descartar: sem retorno". Descarta direto, com Desfazer.
3. **Visitas** (card): `ListaVisitas`, vazio "Nenhuma visita ainda.", e `AgendarVisita` (botão "+ Agendar visita"). Erro `! {erroVisitas}`.
4. **Venda** (card):
   - `CardVenda` e `RegistrarVenda` vêm de `components/vendas`, fora do meu escopo.
   - Vazio: "Nenhuma venda registrada. Quando o cliente assinar, registre aqui."
   - Botão "+ Registrar venda".
   - Escolher a etapa "Venda" sem venda ativa abre o registro em vez de mudar a etapa.
   - Se há rascunho de venda no aparelho, reabre o formulário.
5. **Andamento** (card): `EscolhaTemperatura` (Quente, Morno, Frio, 3 botões em `radiogroup`) e `select#etapa`. Mudar a etapa usa `alterarComDesfazer`. Temperatura grava direto, sem Desfazer.
6. **Radar** (`RadarDoLead`, fora do meu escopo): "Radar: empreendimentos que combinam · n", com "Mandar →" (modelo `apresentar_empreendimento`).
7. **Perfil do cliente (opcional)** (`<details>`): ver a seção de formulários abaixo.
8. **Documentos** (ver abaixo).
9. **Descartar** (só dono ativo): botão "✕ Descartar lead". Abre a grade "Descartar: escolha o motivo" com os 6 motivos e "Cancelar". Um toque no motivo descarta, com Desfazer.
10. **Reativar**: para dono com lead descartado, card "O lead descartado continua guardado com o histórico." e botão "Reativar lead". Grava direto, sem confirmação.
11. **Dados do cliente** (leitura, para quem não é dono): Aniversário, Profissão, Estado civil, Mora em, Motivo da compra.
12. **Atribuir** (`!ehDono && leads.atribuir`):
    - Select "Atribuir a" ou "Passar para" e botão "Atribuir". Sem dono: chama `rpc distribuicao_atribuir`. Com dono: grava `dono_id`.
    - Prazo estourado (lead da empresa sem primeiro contato): eyebrow "Lead da empresa sem primeiro contato" e botão vermelho "Lead perdido: passar para outro corretor" (`rpc lead_perdido`). Também o link "Só atribuir, sem contar como perdido".
    - Sucesso: "✓ Lead atribuído" ou "✓ Lead perdido registrado e repassado", mais `AvisarCorretor`: link wa.me "Avisar {nome} no WhatsApp →". Se o corretor não tem WhatsApp: "! {nome} não tem WhatsApp no Base360 Vendas. Peça para preencher em Minha conta."
13. **Histórico**: lista cronológica de interações e eventos (texto em `lib/historico.ts`). "Nenhuma interação ainda." se vazio.
    - Interação: tipo · quando · "automático" para toques · autor. Linha extra "→ Próximo contato: …".
    - Evento: quando · "automático" ou autor, e a descrição.

**Desfazer** (`AvisoDesfazer`, aviso fixo no rodapé, 8 s): "✓ {texto}" e botão "Desfazer".
- Usado em descarte ("Descartado: {motivo}") e em mudança de etapa ("Etapa: {nome}"). Também no cancelamento de visita.
- Desfazer grava o valor anterior, só se o lead ainda estiver igual: "Não deu para desfazer: o lead mudou depois. Confira a ficha."

**Confirmações na ficha**
- Por Desfazer: etapa, descarte, cancelar visita.
- Duplicado de WhatsApp: segundo toque em Salvar.
- Remover documento: confirmação inline.
- Sem confirmação: temperatura, Reativar, baixa de visita, Registrar interação.

**Erros de gravação** (`lib/erros.ts`)
- Sem conexão: "Não foi salvo: sem conexão. Faça de novo quando a internet voltar." Com rascunho: "… O texto ficou guardado neste aparelho. Toque em {botão} quando a internet voltar."
- Update sem efeito (RLS): "Não foi salvo: este lead mudou de dono ou você não tem mais acesso a ele. Recarregue a página."
- Sem permissão: "Você não tem permissão para isso."
- Tabela inexistente: "Esta parte do Base360 Vendas ainda não foi ativada. Avise o gerente geral."
- Sessão expirada: "Sua sessão expirou. Entre de novo em outra aba; o que você digitou continua aqui."
- Outros erros de constraint traduzidos no mesmo arquivo.

#### Novo lead / Lead da empresa (`app/leads/novo/page.tsx`, `/leads/novo/`)
**Objetivo e quem usa.** Cadastro rápido. Título "Lead da empresa" com `exige="leads.atribuir"` para quem distribui; "Novo lead" com `exige="leads.cadastrar"` para o corretor.

**Cadastro Mágico: "+ Colar mensagem"**
- Card-botão que troca a tela por `ColarMensagem`.
- Textarea "Mensagem do WhatsApp ou e-mail do lead", placeholder "Cole aqui a conversa do WhatsApp, o e-mail do portal, do Facebook ou do RD Station.".
- Prévia "N de 4 campos encontrados": Nome, WhatsApp, E-mail e Empreendimento, cada um com selo (Detectado, Conferir, Não encontrado).
- Aviso "! Nome e WhatsApp são obrigatórios. Você completa no cadastro."
- "Perfil: toque no que quiser usar": botões `+/✓`, que só valem depois de tocados. Podem ser "Até R$ x", "N dormitório(s)" e bairros.
- Botões "Voltar" e "Usar estes dados". Nada é gravado nessa etapa.
- Depois de usar: "✓ Dados da mensagem preenchidos. Confira, escolha a origem e cadastre. A mensagem fica no histórico. Colar outra". A mensagem vira a primeira interação `tipo=mensagem`, com até 4000 caracteres.

**Campos do formulário**

| Campo | Tipo | Obrigatório | Regra e máscara |
|---|---|---|---|
| "Corretor que vai receber" (só `leads.atribuir`) | select | sim | "Escolha o corretor que vai receber o lead." |
| Nome | texto | sim | "Preencha o nome." |
| "WhatsApp · se o cliente der" | `type=tel`, `inputMode=tel`, placeholder `(11) 98765-4321` | não | Se preenchido, valida e, ao sair do campo, formata `(DD) 9XXXX-XXXX`. "Confira o WhatsApp: DDD e número, como (11) 98765-4321." |
| Origem | grade de botões (`aria-pressed`, ✓) | sim | "Escolha a origem." Vem marcada a última usada (`localStorage["crm.ultima-origem.<usuario>"]`). Quem distribui vê as restritas e vem marcada "Empresa (gerente)". O corretor não vê a restrita. |
| Campanha | texto | não | Só para origem com `pede_campanha` ("Anúncio próprio"), placeholder "Ex.: Instagram, anúncio do Rudge Ramos". |
| "Perfil da mensagem" (card) | só leitura | — | Link "Não usar". |
| "Mais detalhes (opcional)" (`<details>`) | — | — | Contém os quatro campos abaixo. |
| Temperatura | `EscolhaTemperatura` | não | Tocar de novo limpa. |
| Empreendimento | texto com `datalist` (catálogo) | não | Aviso "! Não está no catálogo. Confira o nome ou escolha da lista." |
| E-mail | `type=email` | não | "Confira o e-mail." |
| Próximo contato | `CampoProximoContato` | não | Hora padrão 09:00 se só o dia for informado. |

**Botão e fluxo**
- Botão "Cadastrar" em `RodapeAcao` (fixo no celular). Mostra "Salvando…" enquanto grava.
- Duplicado do WhatsApp: aviso "Já existe um lead ativo com este WhatsApp: {nome}[, na carteira de {corretor}]. Toque em Cadastrar de novo para seguir assim mesmo."
  - Se o número está em carteira que o usuário não vê: "Este WhatsApp já está num lead ativo de outra equipe." (quem distribui) ou "… de outro corretor. Confira com seu gerente." (corretor).
  - Usa `rpc whatsapp_em_outra_carteira`.
- O id nasce no aparelho (`novoId`). O reenvio não duplica.
- Se a mensagem original falhar: "O lead foi cadastrado, mas a mensagem original não foi guardada: …".
- Rascunho em `sessionStorage` (chave por usuário). Limpo ao cadastrar.
- Resultado:
  - Corretor: vai para `/leads/ficha/?id=…`.
  - Quem distribui: card "✓ Lead cadastrado", com texto "{nome} foi para {corretor}. Avise no WhatsApp com a mensagem pronta." e `AvisarCorretor` (botão vermelho). Também "+ Outro lead" e "Ver leads".

#### Agenda (`app/agenda/page.tsx`, `/agenda/`)
**Objetivo e quem usa.** Semana (segunda a domingo) com visitas e retornos.
- Acesso: `permitido = veOutros || pode("leads.cadastrar")`. Senão: "! Seu perfil não tem acesso a esta página."
- Só o corretor com `leads.cadastrar` e sem `veOutros` agenda por aqui.
- Quem vê a equipe não agenda, e vê o texto "Para agendar, o corretor abre a ficha do lead."
- O corretor vê só as visitas dele, via RLS.

**Peças**
- Filtro "Corretor" (se `veOutros`). Fica na URL como `?c=`.
- Botão "+ Agendar visita", que abre `EscolherCliente` (card `bar-brand`).
  - Busca "Cliente", placeholder "Nome ou telefone do cliente", `autoFocus`.
  - Lista dos leads ativos do dono, no máximo 40, mais recente primeiro. Cada item mostra "{etapa} · {empreendimento}".
  - "Mostrando N de M. Refine a busca."
  - Vazio: "Nenhum cliente encontrado." ou "Nenhum lead ativo."
  - Depois de escolher, mostra "Cliente: {nome} Trocar" e o formulário `AgendarVisita`.
  - Sucesso na Agenda: "✓ Visita com {nome} agendada para {quando}, em {empreendimento}. Confirme com o cliente pelo WhatsApp no card da visita."
- Navegação: "← Anterior", intervalo "dd/mm a dd/mm/aaaa", "Seguinte →", "Voltar para hoje". A semana (`?d=`) fica na URL.
- "Aguardando baixa · n" (visitas abertas já passadas, de qualquer semana).
- Título da semana: "{N visitas e M retornos} na semana" (primeira letra maiúscula) ou "Nada marcado na semana".
- 7 botões de dia (`aria-pressed`): abreviação do dia, número, contagem de visitas mais retornos. O dia atual vai em vermelho.
- Dia escolhido: "Hoje · Quinta, 06/11".
  - "Nada marcado neste dia."
  - "Visitas · n" (`ListaVisitas`).
  - "Retornos · n" (`CardLead` com o próximo contato naquele dia). Retornos de dias passados mostram os leads que ficaram sem contato.

**Estados:** "Carregando…" (no título), "! {erro}". Erro só nos retornos mostra erro e segue com as visitas.

#### Componente: Visitas (`cv`)
Usado na Lista do dia, na Agenda e na Ficha.

**`CardVisita` (um `li`)**
- Hora grande (com `comDia`: "Qui, 05/11, 10:00"), nome do lead (link para a ficha), "{empreendimento} · {local}", nome do corretor (para quem vê outros) e `SeloVisita`. Observação, "Baixa por {você|nome} · quando", link "Ver comprovante →". Fundo `bg-tint-brand` se aguardando baixa.
- Permissões:
  - `souCorretor`: `corretor_id === eu.id && pode("leads.cadastrar")`.
  - `daBaixa`: `souCorretor || pode("visitas.baixa_equipe")`.
- **Depois do horário** (`aguardando_baixa`), com `daBaixa`: "✓ Realizada" e "✕ Não compareceu". Baixa em 1 toque, sem confirmação nem Desfazer. Mensagens "Baixa dada: visita realizada." e "Baixa dada: não compareceu."
- **Antes do horário** (aberta e `souCorretor`):
  - "Confirmar no WhatsApp": abre `BotaoMensagem` com o modelo `confirmar_visita` e a variável `{visita}`.
  - "✓ Cliente confirmou": só se status `agendada`. Mensagem "Visita confirmada."
  - "Remarcar": painel com `CampoProximoContato` ("Novo dia e hora") e "Salvar novo horário". Se estava confirmada, avisa "A visita volta para agendada. Confirme o novo horário com o cliente."
  - "Cancelar": cancela direto, com Desfazer "Visita cancelada: {nome}". O Desfazer usa a RPC `corrigir_visita` com o motivo "Cancelamento desfeito".
- **Com baixa ou cancelada**, com `daBaixa`:
  - "+ Observação e comprovante" (realizada) ou "+ Observação": textarea "Observação (opcional)" e, se realizada, "Comprovante (opcional)" (`type=url`, placeholder `https://`). Erro "O comprovante precisa ser um link que começa com https://."
  - "Corrigir": escolhe o novo status entre Realizada, Não compareceu, Agendada e Cancelada (as duas primeiras só se o horário já passou). Pede "Motivo" (mínimo de 3 caracteres: "Escreva o motivo da correção."). Chama `rpc corrigir_visita`. A correção e o motivo ficam no histórico do lead.
- Feedback: `✓ {ok}` com `role=status`, ou `! {erro}`.
- `alterarVisita` devolve "Você não tem permissão para isso." se o RLS não alterou nada.

**`AgendarVisita` (form)**
- Campos:
  - "Dia e hora": `CampoProximoContato`, padrão amanhã às 10h.
  - "Empreendimento": obrigatório, `datalist`, com `ConferirNoCatalogo`.
  - "Local (opcional)": placeholder "Ex.: Stand de vendas, decorado".
  - "Observação (opcional)".
- Botões "Agendar visita" ("Agendando…") e "Voltar".
- Validações (`erroAgendamento`):
  - "Escolha o empreendimento."
  - "Marque o dia e a hora da visita."
  - "Escolha um dia e hora a partir de agora." (folga de 10 min)
- Na ficha, sucesso mostra "✓ Visita agendada para {quando}, em {empreendimento}. Confirme com o cliente pelo WhatsApp no card da visita."

#### Componentes de mensagem e contato (`cl/mensagem.tsx`, `cl/repasse.tsx`)
- **`BotaoMensagem`** (rótulo padrão "WhatsApp →"). Abre `DialogoMensagem`. Não aparece se o lead não tem telefone.
- **`DialogoMensagem`**: `<dialog>` nativo com `showModal`. No celular é uma folha na base da tela; no computador, modal centralizado de 560 px. Fecha ao clicar no fundo, com Esc ou no botão "Fechar".
  - Título é o nome do lead; abaixo, o número formatado ou "Escolha o contato no WhatsApp".
  - "Modelo" (grade de botões `aria-pressed` com `titulo` e ✓): os modelos ativos da tabela `mensagens_modelo`.
    - Sugestão: etapa `novo` → "Primeiro contato"; com tentativas ou 2 dias ou mais sem contato → o modelo `sem_contato`; senão o da etapa; senão o primeiro.
    - Vazio: "Nenhuma mensagem pronta disponível. Escreva a sua."
  - "Texto": textarea editável. Dica "Ajuste o texto antes de enviar. *Negrito* funciona no WhatsApp."
  - Botões "Copiar" (vira "✓ Copiado") e "Abrir no WhatsApp →". Este é um link `target=_blank` para `https://wa.me/{número}?text={texto codificado}` (`linkWhatsappComTexto`). Chama `onAbrirWhatsapp`, que grava o toque.
  - Carregando: "Carregando…".
- **`BotaoLigar`**: link `tel:+{número}`, rótulo "Ligar", `aria-label` "Ligar para {número formatado}".
- **`AvisarCorretor`**: `https://wa.me/{número do corretor}?text=…`, rótulo "Avisar {primeiro nome} no WhatsApp →". A mensagem (`mensagemRepasse`) leva nome do cliente, WhatsApp, empreendimento, o prazo do primeiro contato e o link da ficha.
- E-mail: não há envio nem `mailto:` nestas telas; só o campo de texto.
- Variáveis dos modelos (`VARIAVEIS`): `primeiro_nome`, `nome`, `empreendimento`, `corretor`, `visita`, `endereco`, `apresentacao`, `a_partir_de`. A linha com variável do catálogo vazia sai da mensagem. Sem nome do cliente, "Oi, {primeiro_nome}, tudo bem?" vira "Oi, tudo bem?".
- Modelos de série no schema: `primeiro_contato`, `retomar_contato`, `convite_visita`, `confirmar_visita`, `depois_da_visita`, `lancamento`. Outros modelos aparecem no código (`parabens`, `apresentar_empreendimento`) e, pelo código, vêm da tabela; a edição é do gerente geral em Configurações.

#### Formulários de perfil e documentos (`cl/perfil.tsx`)
**Perfil do cliente (opcional)** (`<details id="perfil">`, só dono ativo). Rascunho em `sessionStorage`. Botão "Salvar perfil" e "✓ Salvo".

*Compra*

| Campo | Tipo | Observação |
|---|---|---|
| Valor (R$) | texto decimal, placeholder 450.000 | "Confira o valor: só números, como 450.000." |
| Dormitórios | select | 1 a 4 |
| Região | texto | placeholder "Rudge Ramos, Centro / SBC" |
| Finalidade | select | Morar, Investir |
| Empreendimento | texto com `datalist` | — |
| Campanha | texto | — |
| Pronto ou na planta | select | — |
| Prazo de compra | select | — |
| Forma de pagamento | select | — |
| Usa FGTS | select | Sim, Não |
| Renda familiar | select | — |
| Entrada disponível (R$) | texto decimal | "Confira a entrada: só números, como 80.000." |
| Motivo da compra | select | — |

Os últimos sete campos (de "Pronto ou na planta" em diante) só aparecem se o SQL do item 16 já rodou.

*Dados pessoais*
- Data de nascimento: `type=date`, de 1900-01-01 até hoje. "A data de nascimento não pode ser no futuro."
- Profissão: máx. 120.
- Estado civil: select.
- Outro telefone: `type=tel`. "Confira o outro telefone: DDD e número."
- Cidade onde mora: máx. 120.
- Bairro onde mora: máx. 120.
- E-mail: `type=email`.

Sem o SQL do item 16, mostra só o e-mail e a nota "! Os campos novos do perfil não carregaram: {erro}". Salva só os campos que mudaram.

**Documentos** (`DocumentosDoLead`)
- Texto fixo: "! Dados pessoais protegidos pela LGPD. Anexe só o que a proposta pede. Só o corretor do lead, o gerente da equipe e a gerência geral abrem os arquivos."
- Upload:
  - Select "Anexar documento" com "Escolha o tipo". O botão "+ Foto ou PDF" fica desabilitado até escolher o tipo.
  - `input[type=file]` com `accept` de PDF, JPEG, PNG, WEBP, HEIC e HEIF. Até 10 MB.
  - Dica "Escolha o tipo e depois o arquivo. Até 10 MB."
  - Mensagens: "Envie um PDF ou uma foto (JPG, PNG, WEBP ou HEIC).", "O arquivo está vazio.", "O arquivo tem X. O limite é 10 MB."
  - Sucesso: "✓ {tipo} anexado".
- Item da lista: categoria, nome do arquivo, "{tamanho} · {data}", botão "Abrir" (link assinado de 60 s, aberto em nova janela; "Abrindo…") e "Remover".
- Confirmação inline: "✕ Remover este arquivo? Ele sai do Base360 Vendas e o histórico registra a remoção.", com "Remover" (vermelho) e "Cancelar". Sucesso: "✓ {tipo} removido".
- Vazio: "Nenhum documento anexado." Se o usuário não pode enviar e não há documento, o card some.
- Carregando: "Carregando…".

### 2.2 Gestão, vendas, metas, pontos e catálogo

#### Pontos que valem para todas as telas

- **Casca** (`comp/casca.tsx`). Toda tela usa `<Casca titulo exige? soGerenteGeral?>`.
  - Sem permissão, mostra o card "! Seu perfil não tem acesso a esta página." (linha 111).
  - Antes de a sessão ficar pronta:
    - "Carregando…"
    - "! Conta desativada"
    - "! Não foi possível carregar sua conta"
    - "! Supabase não configurado"
  - `liberado = (!exige || pode(exige)) && (!soGerenteGeral || perfil == gerente_geral)`.
- **Menu** (casca.tsx:64-94):
  - Painel, Vendas e Metas aparecem para quem tem `leads.cadastrar`, `dados.ver_equipe` ou `dados.ver_todos`.
  - "Empreendimentos" e "Ranking" aparecem para todos.
  - "Faixas de VGV" e "Pontos" só para o gerente geral.
  - "Plantão" aparece com `plantao.registrar` ou `lancamentos.registrar`.
  - "Meus pontos" aparece para quem não é gerente geral e tem `leads.cadastrar`.
- **Perfis** (roles, schema.sql:22): gerente_geral "Gerente geral", operacional "Operacional", gerente "Gerente", corretor "Corretor", recepcao "Recepção", especialista "Especialista".
- **Erros** (`lib/erros.ts`), texto exato:
  - Sem rede: "Sem conexão com o servidor. Tente de novo."
  - RLS: "Você não tem permissão para isso."
  - Parte não ativada: "Esta parte do Base360 Vendas ainda não foi ativada. Avise o gerente geral."
  - Sessão: "Sua sessão expirou. Entre de novo em outra aba; o que você digitou continua aqui."
  - Genérico: "Algo deu errado. Tente de novo."
  - Constraints de venda e meta: "Confira o VGV: maior que zero.", "Escolha o empreendimento.", "Informe a data do pagamento.", "Já existe uma meta com essa métrica e esse período. Edite a que está na lista."
  - Existem `erroAoSalvar`, `SEM_CONEXAO_REFAZER` e `semConexaoComRascunho`. **Nenhuma tela desta área os usa**: gravações usam `mensagemErro`. Só há rascunho no aparelho em registrar venda (`lib/rascunho.ts`).
- **Não existe nesta área:**
  - exportação (CSV, Excel, copiar tabela)
  - gráficos (só barras de progresso)
  - calendário
  - paginação visual
  - ordenação clicável
  - busca, exceto Empreendimentos e Plantão
  - toast genérico (o único aviso flutuante é o "Desfazer")
  - diálogo modal de confirmação
- **Confirmação:** nenhuma ação destrutiva usa `confirm()` ou modal. Os padrões são:
  - painel inline com motivo obrigatório (vendas)
  - "Desfazer" por 8 s (`AvisoDesfazer`)
  - clique direto, sem confirmação
- **Impressão:** só o Painel (seção 1). Nenhuma outra tela da área tem `window.print` ou classe de impressão.

#### `/painel/` (`app/painel/page.tsx`)

**Objetivo.** Números do período por corretor (leads, funil, conversão, visitas, stand, vendas, meta anual) e o relatório individual.
**Quem.** Título "Painel da equipe" para quem tem `dados.ver_equipe` ou `dados.ver_todos`, e "Meu painel" para os demais. Acesso exige essas permissões ou `leads.cadastrar`; sem elas: "! Seu perfil não tem acesso a esta página." O corretor sempre cai no próprio relatório (`corretorId = eu.id`). A conversão por campanha exige `pode("painel.campanha")`. O filtro de equipe só vale com `dados.ver_todos`.

**Controles (`ControlesPeriodo`).**
- Período, com 3 botões segmentados (`aria-pressed`): Dia, Semana, Mês (`TIPOS_PERIODO`, `lib/painel.ts:12`). O padrão é "semana".
- Select "Equipe" com a opção "Todas". Só aparece para quem vê outros, sem corretor selecionado e com mais de uma equipe.
- Botões "← Anterior" e "Seguinte →", com o rótulo do período no centro:
  - dia: "Quinta, 29/10/2026"
  - semana: "26/10 a 01/11/2026"
  - mês: "Outubro de 2026"
- Link "Voltar para hoje", visível só fora do período atual.
- Botão "Imprimir" (`window.print()`).
- O estado fica na URL: `?p=dia|semana|mes`, `?d=AAAA-MM-DD`, `?c=<corretor>`, `?e=<equipe>`.

**Visão da equipe** (quem vê outros, sem `?c`):
1. Faixa de síntese "Leads do período", com 3 números clicáveis: "Recebidos da empresa", "Perdidos" (com "! " na frente quando maior que 0) e "Venda no funil".
2. Tabela "Leads no período, por corretor". Colunas: Corretor, Recebidos da empresa, Perdidos, Cadastrados pelo corretor, Descartados, Vendas. Última linha "Equipe". O nome do corretor abre o relatório.
3. Tabela "Funil até a venda · leads que entraram na carteira no período". Colunas: Corretor, Entraram, Em contato, Visita agendada, Visita realizada, Proposta, Venda. Os nomes das etapas vêm de `lead_etapas`.
4. Dois cards de distribuição ("Distribuicao"):
   - "Cadastrados pelo corretor, por origem". Vazio: "Nenhum lead cadastrado pelos corretores no período."
   - "Descartados, por motivo". Vazio: "Nenhum lead descartado no período."
5. Seção "Conversão por origem" (com campanha: "Conversão por origem e campanha") e o sufixo " · leads que entraram na carteira no período, até hoje".
   - Os 4 tiles de `ResumoConversao`:
     - "Leads", nota "entrou no período" ou "entraram no período"
     - "Lead → venda", nota "N de M virou venda" ou "viraram venda"
     - "Ticket médio", nota "N venda(s) · VGV R$ …"
     - "Ciclo médio", nota "Do cadastro do lead à assinatura"
   - Colunas: Origem (ou "Origem e campanha"), Leads, Primeiro contato, Visita realizada, Proposta, Venda, Descartados. Cada célula mostra o número e a taxa em %.
   - Sublinhas por campanha, com "Sem campanha" quando não há campanha.
   - Linha "✕ Descartados: motivo N · …".
   - Vazio: "Nenhum lead entrou na carteira no período."
6. Tabela "Visitas no período, por corretor · pela data da visita". Colunas: Agendadas, Realizadas, Não compareceu, Aguardando baixa. O "Aguardando baixa" maior que 0 aparece como "! N" em negrito. Só aparece se a leitura de visitas funcionar; se falhar, a tabela some em silêncio.
7. `TabelaStand` (vem de `comp/recepcao/painel-stand.tsx`, fora desta área). Colunas: Clientes no stand, Novos da vez, Indicações, Retornos, Atendeu por colega.
8. Tabela "Vendas no período, por corretor · pela data da assinatura". Colunas: Assinadas e pagas, VGV assinado e pago, Assinadas, VGV assinado.
9. `TabelaMetaAnual` (seção 3).
10. `ListaLeads`, que abre ao tocar num número.

**Relatório do corretor** (`?c=` ou o próprio):
- Card de cabeçalho. Link "Ver a equipe" (só para quem vê outros). Eyebrow "Seus números" ou "Relatório do corretor". Nome do corretor e período.
- `CartaoMetaAnual` e `MetasDoCorretor soPainel`. Títulos "Suas metas" e "Metas do corretor". Só mostra as metas marcadas "Mostrar no painel".
- 5 cards numéricos:
  - "Recebidos da empresa"
  - "Perdidos" (destaque)
  - "Cadastrados por você" (para o próprio) ou "Cadastrados pelo corretor"
  - "Descartados"
  - "Vendas"
- 3 cards: por origem, "Descartados, por motivo" e "Funil até a venda", com a taxa de cada etapa sobre os que entraram.
  - Vazios: "Nenhum lead cadastrado no período." e "Nenhum lead descartado no período."
- `Conversao` e `VisitasDoCorretor` (4 cards).
- `StandDoCorretor`.
- Seção "Vendas no período · pela data da assinatura", com `ResumoVendas`.
- `ListaLeads`, que por padrão mostra "Todos os leads do período".

**Lista de leads (`ListaLeads`).**
- Título "{título} · N". Botão "Fechar a lista", ou "Ver todos os leads" no relatório.
- Cada item mostra:
  - o nome, com link para `/leads/ficha/?id=` quando o lead é visível
  - origem, "Hoje: {etapa}" e "Com {dono}" ou "A distribuir"
  - "! Perdido por X, passado para Y"
  - "✕ Descartado: motivo"
  - "✓ Venda"
- Vazio: "Nenhum lead neste período. Escolha outro dia, semana ou mês."
- Rola até a lista ao tocar num número (`scrollIntoView`).

**Estados.**
- Carregando: "Carregando…" em texto simples (sem skeleton).
- Erro: `<p class="aviso-erro">! {erro}</p>`.
- Vazio: "Nenhum corretor na equipe ainda."

**Ações.**
- Navegar o período.
- Filtrar a equipe.
- Abrir a lista de leads.
- Abrir o relatório.
- Imprimir.
- **Não há "Lead perdido" nesta tela:** ela só relata. O botão está na ficha do lead (`app/leads/ficha/page.tsx:927`, "Lead perdido: passar para outro corretor", com aviso "✓ Lead perdido registrado e repassado"), fora desta área.

**Impressão** (`globals.css:495-600`).
- `TituloImpressao` mostra "MBigucci · Base360 Vendas", "Painel da equipe" ou "Relatório de {nome}", e "{Dia|Semana|Mês}: {rótulo} · impresso em {data}".
- Classes: `.so-impressao` (aparece só no papel), `.sem-impressao` e `.fixed` (somem), `.tabela-painel` (sem rolagem), `.lista-painel`.
- No papel: fundo branco, preto, fonte de 16px, margem de 14mm × 12mm, o título h1 da página some, os botões somem.

**Celular.**
- A tabela é um card com `overflow-x-auto` (rolagem lateral).
- Cada número ganha uma área de toque de 44px (`max-md:after:` com inset).
- Grids: "Leads do período" em `sm:grid-cols-3`; Distribuição em `md:grid-cols-2` (relatório `md:grid-cols-3`); tiles em `grid-cols-2 md:grid-cols-4`; 5 cards em `grid-cols-2 md:grid-cols-5`.
- O rótulo do período usa `flex-1` no celular e `md:flex-none` no desktop.

#### `/vendas/` (`app/vendas/page.tsx`, `comp/vendas/vendas.tsx`)

**Objetivo.** Listar as vendas assinadas por mês ou ano, registrar vendas (corretor) e corrigir, cancelar ou reativar (equipe).
**Quem.** Título "Vendas da equipe" ou "Minhas vendas". Acesso: `dados.ver_equipe`, `dados.ver_todos` ou `leads.cadastrar`. O botão "+ Registrar venda" só aparece com `leads.cadastrar` e sem ver outros. "Marcar como paga" aparece para o corretor dono da venda (com `leads.cadastrar`) ou para quem tem `vendas.corrigir_equipe`. "Corrigir" e "Cancelar venda" ou "Reativar venda" exigem `vendas.corrigir_equipe` (por padrão, o gerente). O banco decide de fato (RPC `corrigir_venda`, trigger `vendas_guard`).

**Peças.**
- Período, "Período, pela assinatura": botões Mês e Ano. "← Anterior", "Seguinte →" e "Voltar para hoje". URL `?p=ano&d=2026-10` ou `?d=2026`.
- Select "Corretor" com a opção "Todos" (só quem vê outros), via `?c=`.
- Linha-resumo "N venda assinada" ou "N vendas assinadas no período".
- `ResumoVendas`, com 3 blocos: "Assinado e pago" (destaque), "Assinado, com pendentes" e "Pagamento pendente". Este último traz uma barra de quanto já foi pago e o texto "· R$ … já pago". Cada bloco mostra "N venda(s)".
- Lista de `CardVenda` em `md:grid-cols-2`. O card mostra:
  - o VGV
  - o selo
  - o nome do cliente (link para a ficha)
  - empreendimento e unidade
  - "Assinada em dd/mm/aaaa"
  - o nome do corretor (quando quem vê outros)
  - a observação
  - "Motivo do cancelamento: …"
- Seção recolhível "Ver as canceladas (N)" ou "Esconder as canceladas".

**Selo da venda** (`seloVenda`, `lib/vendas.ts:133`):
- "✕ Cancelada"
- "✓ Paga em dd/mm/aaaa"
- "! Pagamento pendente"

**Formulário "Registrar venda"** (`NovaVenda`, depois `RegistrarVenda`; na ficha o `RegistrarVenda` aparece direto).
- `NovaVenda` é o botão "+ Registrar venda" dentro de `RodapeAcao`, que no celular fica fixo no rodapé.
- Select "Cliente" (opção inicial "Escolha o lead", ou "Carregando…"). Lista os leads ativos do corretor que não estão em Venda. Nota: "Seus leads ativos que ainda não estão em Venda."
- Título "Parabéns pela venda para {nome}." Nota: "A venda conta no mês da assinatura. O VGV válido é o das vendas assinadas e pagas."
- Campos de `RegistrarVenda`:

| Campo | Tipo e máscara | Obrigatório |
|---|---|---|
| Empreendimento | texto com `datalist` do catálogo; aviso "! Não está no catálogo. Confira o nome ou escolha da lista." (o texto livre vale) | sim ("Escolha o empreendimento.") |
| Unidade (opcional) | texto, placeholder "Apto 52, torre B" | não |
| VGV | prefixo "R$", `inputMode=decimal`, placeholder "480.000"; aceita "480.000" ou "480.000,50" | sim; erro "Confira o VGV: só números, como 480.000." |
| Data da assinatura | date, `max` = hoje | sim; erro "Confira a data da assinatura: até hoje." |
| Já está paga | checkbox | não |
| Data do pagamento | date, só com "paga" marcada, `max` = hoje | sim se paga; erro "Confira a data do pagamento: até hoje." |
| Observação (opcional) | textarea | não |

- Botões: "Registrar venda" (vermelho, "Registrando…" durante o envio) e "Cancelar".
- Rascunho no aparelho (`lib/rascunho.ts`): o formulário e a escolha do lead são guardados e restaurados.
- O id da venda é gerado no aparelho (`novoId`), então o reenvio é idempotente (`jaEstavaSalvo`).

**Ações no card.**
- **"✓ Marcar como paga"** abre `Pagar`:
  - campo "Data do pagamento" (date, `max` = hoje)
  - botões "✓ Confirmar pagamento" e "Voltar"
  - resultado: "Venda paga em dd/mm/aaaa."
- **"Corrigir"** abre `Corrigir`, só em venda ativa:
  - campos: Empreendimento, Unidade, VGV, Data da assinatura, Paga (checkbox), Data do pagamento, Observação, "Motivo da correção" (placeholder "Ex.: Valor do contrato assinado")
  - erros: "Nada mudou." e "Escreva o motivo da correção." (mínimo de 3 caracteres)
  - envia só os campos alterados, via RPC `corrigir_venda`
  - botões "Salvar correção" e "Voltar"
  - resultado: "Venda corrigida."
- **"Cancelar venda" / "Reativar venda"** abre `Motivo`:
  - título "Cancelar a venda" ou "Reativar a venda"
  - texto do cancelamento: "A venda fica guardada como cancelada e sai das contas. Se for a única do lead, ele volta para Proposta."
  - texto da reativação: "A venda volta a contar e o lead vai para Venda."
  - textarea "Motivo", obrigatório (erro "Escreva o motivo.")
  - botão "✕ Cancelar venda" ou "Reativar venda"
  - resultados: "Venda cancelada." e "Venda reativada."
- Confirmações: nenhum modal. O motivo é obrigatório e vai para o histórico do lead.
- Sucesso mostra `✓ {aviso}` (aria-live) dentro do card; erro mostra `! {erro}`.
- Nenhuma ação de venda tem "Desfazer".

**Dividir venda: NÃO EXISTE no código.** Só há desenho em `docs/vendas-participantes.md` ("Nada foi implementado"). Também não existem participantes, pedido de registro ou parceiro na venda.

**Estados.**
- Carregando: "Carregando…".
- Erro: "! {erro}".
- Vazio: "Nenhuma venda no período." mais, para o corretor, " Quando um lead for para Venda, o registro aparece aqui." e, para quem vê outros, " Quando um corretor registrar uma venda, ela aparece aqui."

**Celular.**
- Listas em `md:grid-cols-2`.
- O botão "Registrar venda" é fixo no rodapé (`RodapeAcao`), com `pb-24 md:pb-0` na página.
- Botões de formulário em `flex-1 md:flex-none`.
- Formulários em `md:grid-cols-2`.
- Selo `shrink-0`.

#### `/metas/` (`app/metas/page.tsx`, `comp/metas/metas.tsx`, `lib/metas.ts`)

**Objetivo.** Acompanhar a meta anual de VGV (todos), definir esse valor (gerente geral) e gerir as metas próprias (corretor).
**Quem.** Título "Metas da equipe" ou "Minhas metas". Acesso: ver outros, `leads.cadastrar` ou `metas.definir_vgv`. Definir a meta anual exige `metas.definir_vgv`. As metas próprias são `editavel` só para o corretor (`leads.cadastrar` e sem ver outros).

**Peças.**
- Navegação "← {ano-1}" e "{ano+1} →" (`?a=AAAA`, "Ano anterior" e "Ano seguinte").
- **Corretor:** `CartaoMetaAnual`.
  - Faixa escura com "Meta anual de VGV · ano", "Assinado e pago" e "Meta do ano".
  - Barra de progresso com `role=progressbar`.
  - "{pct} atingido" ou "✓ Meta batida · {pct} atingido". O percentual é calculado com `formatarPct` (2 casas, arredondado para baixo).
  - Grade de dados: "Assinado e pago", "Assinado, com pendentes", "Falta", "Ritmo necessário" (nota "Por mês, nos N meses até dezembro, com este" ou "Por mês: só dezembro pela frente") e "Projeção no ritmo atual". Notas da projeção: "Aparece a partir de abril", "Depois da primeira venda paga", "Ano encerrado", "Fecha {ano} com isso".
  - Rodapé de origem (`ORIGEM_META`):
    - "Meta definida para você pelo gerente geral"
    - "Meta geral do ano, definida pelo gerente geral"
    - "Meta padrão do ano"
- **Gerente:** `TabelaMetaAnual`.
  - Colunas: Corretor, Meta, Assinado e pago, Atingido, Falta, Por mês até dezembro, Projeção, Assinado, com pendentes. Última linha "Equipe".
  - O nome abre `/painel/?c=id`.
  - Vazio: "Nenhum corretor na equipe ainda."
- **Gerente geral:** `DefinirMetas`, "Definir a meta anual de VGV · ano".
  - Texto: "O valor geral vale para todos os corretores. Sem valor geral, vale o padrão de R$ 10.000.000. O valor de um corretor substitui o geral só para ele."
  - Linha "Valor geral do ano": mostra o valor atual e a nota "Definido" ou "Padrão". Campo com prefixo "R$" (`lerReais`, placeholder = valor atual). Botão "Salvar". Link "Voltar ao padrão de R$ 10.000.000" (apaga a linha, sem confirmação).
  - Bloco recolhível `<details>` "+ Valor por corretor". Cada linha tem as notas "Valor próprio" ou "Usa o geral", campo, "Salvar" e o link "Usar o valor geral".
  - Erro: "Confira o valor: só números, como 10.000.000." Sucesso: "✓ Salvo".
  - O padrão é `META_VGV_PADRAO = 10_000_000`.
- **Metas próprias** (`MetasDoCorretor`, título "Metas próprias" com a nota "Você define os alvos; o progresso vem do que já está registrado.").
  - Botão "+ Nova meta".
  - Cards (`CardMeta`):
    - "{Métrica} · {período}"
    - selo "✓ Meta batida"
    - atual / alvo
    - barra
    - frase de ritmo, por exemplo "Faltam 2 vendas.", "Meta batida, com X a mais.", "Período encerrado: ficou em …", "Começa em …", "No ritmo atual você fecha o mês com …", "Cerca de N por semana até o fim."
    - "Assinado, com pendentes: …"
  - Rodapé do card:
    - checkbox "Mostrar no painel" (grava na hora, sem confirmação)
    - links "Editar" e "Excluir"
  - "Excluir" é imediato e mostra `AvisoDesfazer` "Meta excluída: {nome}" por 8 s.
  - Vazio com edição: "Nenhuma meta por enquanto." / "Que tal começar pelo VGV, com o período que você costuma usar? Você pode mudar os números quando quiser.", com os botões "+ Meta de VGV" e "+ Outra meta".
  - Vazio sem edição: "O corretor ainda não criou metas próprias."
  - Carregando: "Carregando metas…".

**Formulário de meta** (`FormMeta`, título "Nova meta" ou "Editar meta"):

| Campo | Tipo | Obrigatório e regra |
|---|---|---|
| Métrica | select, 5 opções; mostra a "dica" embaixo | sim |
| Período | 5 botões em `grid-cols-3` | sim |
| Começa em | select de 25 meses (12 antes até 12 depois), só em "Personalizado" | sim, nesse período |
| Duração | select de 1 a 24 meses (`MESES_MAX = 24`) | sim, nesse período |
| Alvo ou Alvo (R$) | contagens: só dígitos, máx. 5, com unidade à direita ("lead"/"leads"). VGV: prefixo "R$", `lerReais`. Placeholders "Ex.: 20/15/8/2/1.000.000" | sim; erro "Informe o alvo." |
| Mostrar no painel | checkbox, padrão marcado | não |

- Texto de apoio do Alvo: "Quanto você quer alcançar {por mês|por trimestre|…}."
- Mensagem de rótulo no personalizado: "Conta de {rótulo}."
- Duplicada: "Já existe uma meta {mensal|…} de {Métrica}. Edite a que está na lista." (no personalizado: "…para esse período…").
- Botões: "Criar meta" ou "Salvar meta" ("Salvando…" durante o envio) e "Cancelar".
- Trocar entre VGV e contagem limpa o valor.

**Estados.**
- "Carregando…".
- Erro: "! {erro}".
- Sem permissão: o card padrão.

**Celular.**
- Cards em `md:grid-cols-2 xl:grid-cols-3`.
- Nos selects de início e duração, um embaixo do outro no celular (`md:grid-cols-2`).
- A tabela de meta tem rolagem lateral.

#### `/ranking/` (`app/ranking/page.tsx`)

**Objetivo.** Ranking de pontos aprovados no mês. **Quem.** Qualquer usuário ativo, sem `exige`. Dados vêm da RPC `ranking_pontos`.

- `NavMes` ("← Anterior", "{Mês} de {ano}", "Seguinte →"). O avanço é limitado ao mês atual (`ate`), então "Seguinte" fica `disabled`.
- Título "Pontos aprovados no mês, com o limite de cada critério".
- Lista numerada, uma linha por corretor ativo:
  - posição "{n}º", com empate na mesma posição (1, 2, 2, 4), via `posicoes()`
  - nome
  - pontos
  - selo "Você" na própria linha, com fundo `bg-tint-brand`
- **Colunas do ranking:** posição, nome, pontos. Não há outras colunas, sem VGV nem verba.
- Vazio: "Nenhum corretor ativo."
- Carregando: "Carregando…". Erro: "! {erro}".

#### `/faixas/` (`app/faixas/page.tsx`, `lib/faixas.ts`)

**Objetivo.** Ver o prêmio mensal por VGV de cada corretor e editar as faixas. **Quem.** `soGerenteGeral` (regra fixa, `is_gerente_geral`), sem permissão de catálogo.

- Card de topo com o título e a descrição, lidos de `app_settings` (chave `faixas_vgv`). Fallback do rótulo: "Faixas de VGV"; da coluna: "Valor". O seed usa a coluna "Prêmio" e o rótulo "Premiação mensal por VGV".
- Navegação de mês ("Mês anterior" e "Mês seguinte"). Não é limitada ao mês atual.
- Título "Por corretor · vendas assinadas no mês · liberação em {mês seguinte} de {ano}".
- Tabela com as colunas Corretor, Assinado e pago, {coluna = "Prêmio"}, Faixa atingida, Assinado, com pendentes.
  - A faixa atingida mostra "✓ A partir de R$ …" ou "– Abaixo da primeira".
  - A faixa vale pela mais alta atingida (não acumula).
  - Ordenada por VGV válido, decrescente. Linha "Total".
  - Vazio: "Nenhuma venda assinada neste mês."
- `EditarFaixas`, card "Faixas":
  - botão "+ Nova faixa"
  - vazio: "Nenhuma faixa. Crie a primeira."
  - por linha, 2 campos: "VGV no mês a partir de (R$)" e "{coluna} (R$)"
  - botões "Salvar" ou "Criar faixa", links "Excluir faixa" (sem confirmação) e "Cancelar"; "✓ Salvo"
  - erros: "Confira o VGV mínimo: só números, como 1.000.000.", "Confira o campo {coluna}: só números, como 2.000.", "Já existe uma faixa com esse VGV mínimo."
  - aceita valor 0 na coluna de valor.
- **Faixas de VGV (padrão do seed):** mínimo / valor = 1.000.000 / 2.000, 1.500.000 / 3.000, 2.000.000 / 5.000, 3.000.000 / 10.000. Isso é dado do banco, editável, não um enum.
- Estados: "Carregando…" e "! {erro}". A tela inteira troca por `aviso-erro` se a leitura de faixas falhar.
- Celular: tabela com rolagem lateral e células `whitespace-nowrap`.

#### `/programa/` (`app/programa/page.tsx`)

**Objetivo.** Resumo mensal do programa de verba, fechamento do mês e edição dos critérios. **Quem.** `soGerenteGeral`. Título "Pontos e verba".

- Card "Programa de verba" com 4 links: "Aprovar lançamentos (N pendente(s) no mês)", "Plantão e roleta", "Ranking", "Faixas de VGV".
- `NavMes`, sem limite de avanço.
- Título "Por corretor · liberação em {mês seguinte} de {ano}". Lista por corretor, ordenada por verba e depois por pontos:
  - nome
  - contagens "N período(s) · N vídeo(s) · N visita(s)" e " · N pendente(s)"
  - "{pontos} pontos" e "(vale N)" quando o teto corta
  - "N venda(s) paga(s)" ou "sem venda paga"
  - "Verba R$ …" ou "–", mais " · faltam N" abaixo do mínimo
  - "Prêmio R$ …" quando maior que 0
  - linha "Total": "Verba R$ … · Prêmio R$ …"
- Nota de regras: "Só contam os lançamentos aprovados… Mínimo de 130 pontos; teto de 200 sem venda e 280 com venda; cada venda soma R$ 1.000."
- Card "Fechamento do mês":
  - estados: "✓ Fechado em dd/mm/aaaa hh:mm." ou "! Fechado em … Os números mudaram depois disso. Feche de novo para atualizar." ou o texto "Feche depois de aprovar os lançamentos do mês. …"
  - botão "Fechar {mês}" ou "Fechar de novo". Fica `disabled` em mês futuro ou sem linhas.
  - resultado: "✓ Mês fechado. A verba e o prêmio são liberados em {mês} de {ano}." (grava `fechamentos_verba` por upsert, sem confirmação)
- `EditarCriterios`, card "Critérios". Por critério:
  - "Critério" (nome)
  - "Pontos" e "Limite no mês" (inteiros de 0 a 1.000)
  - "Máximo" (calculado = pontos × limite)
  - botão "Salvar"
  - erros: "Preencha o nome." e "Pontos e limite: números inteiros de 0 a 1.000."
  - sucesso: "✓ Salvo"
- Estados: "Carregando…"; "! {erro}"; vazio "Nenhum corretor ativo."
- Celular: itens `md:grid-cols-[1fr_auto]`; as linhas quebram com `flex-wrap`.

#### `/programa/aprovacao/` (`app/programa/aprovacao/page.tsx`)

**Objetivo.** Fila de aprovação de lançamentos de pontos. **Quem.** `soGerenteGeral` ("Aprovar lançamentos").

- Texto: "Os lançamentos só contam depois de aprovados. A visita realizada entra sozinha, pela baixa." e link "Resumo do mês".
- Filtros (card `md:grid-cols-4`):
  - "Situação": Pendentes (padrão), Aprovados, Recusados, Cancelados, Todas
  - "Corretor": Todos, ou os que aparecem na lista
  - "Critério": Todos mais os critérios
  - "Semana de": date (vira a segunda-feira); mostra "dd/mm a dd/mm · Todas"
- Janela de datas: pendentes de qualquer data; os demais status, dos últimos 120 dias, ou a semana escolhida.
- Título "{N} lançamento(s)" e checkbox "Selecionar todos".
- Item da fila:
  - checkbox (só nos pendentes)
  - corretor
  - selo de status
  - "{critério} · {Manhã 9h–14h} · N vídeo(s) · saiu para visita"
  - "dd/mm (dia da semana) · lançado por X · Comprovante (link)"
  - observação
  - "Motivo: …" nos recusados
  - botões: pendente tem "✓ Aprovar" e link "Recusar"; aprovado ou recusado tem link "Voltar para pendente"
- Barra fixa no rodapé:
  - com seleção: "N selecionado(s)", "✕ Recusar", "✓ Aprovar" (em lote)
  - ao recusar: campo "Motivo da recusa (N)" (placeholder "Ex.: saiu antes das 14h", autoFocus), botão "Recusar" e link "Cancelar"
  - motivo obrigatório (erro "Escreva o motivo da recusa.")
- Aprovar e recusar mostram `AvisoDesfazer` "N lançamento(s) aprovado(s)/recusado(s)" com Desfazer (volta para pendente).
- Estados:
  - vazio, pendentes: "✓ Nenhum lançamento esperando aprovação."
  - vazio, filtrados: "Nenhum lançamento com esses filtros."
  - erro parcial: "Alguns lançamentos não puderam ser alterados. Atualize a página."
  - "Carregando…"
- Celular: a barra de ação é fixa (`fixed inset-x-0 bottom-0`) e a página tem `pb-24`; os botões da barra são menores (`px-3 py-3`).

#### `/meus-pontos/` (`app/meus-pontos/page.tsx`)

**Objetivo.** O corretor vê os próprios pontos aprovados, a verba prevista e a liberada. **Quem.** `exige="leads.cadastrar"` (no menu, não aparece para o gerente geral).

- `NavMes`, limitado ao mês atual.
- Card "Verba prevista · liberada em {mês}": valor grande e uma de três frases:
  - "Faltam N pontos para o mínimo de 130. Abaixo dele, a verba é zero."
  - "✓ Mínimo atingido. Sem venda no mês, a verba vai até 200 pontos. A primeira venda assinada e paga libera até 280 e soma R$ 1.000."
  - "✓ Mínimo atingido, com N venda(s) assinada(s) e paga(s): até 280 pontos e R$ 1.000 por venda."
  - barra de pontos com a marca do mínimo
- "Pontos aprovados em {mês}": 1 card por critério, com o nome, os pontos e "N de L no mês · P cada · N acima do limite". Nota: "Só aparece o que o gerente geral já aprovou. A visita conta quando você dá a baixa como realizada."
- Card "Verba de {mês anterior}, liberada em {mês}" (aparece só se houver fechamento) com a verba e "N pontos · N venda(s)".
- Link "Ver o ranking".
- Estados: "! {erro}" e "Carregando…". Não há estado vazio.
- Celular: cards em `md:grid-cols-3`.

#### `/plantao/` (`app/plantao/page.tsx`)

**Objetivo.** Registrar os períodos do plantão e a saída para visita, ver a roleta e lançar vídeos. **Quem.** `plantao.registrar` (recepção e operacional) ou `lancamentos.registrar` (gerente e operacional). Sem nenhuma das duas: "! Seu perfil não tem acesso a esta página." Os vídeos exigem `lancamentos.registrar`.

- Navegação do dia: "←" e "→" (o "→" fica desativado a partir de hoje). Rótulo "Hoje, dd/mm/aaaa" ou "{dia da semana}, …".
- Campo "Buscar corretor" (placeholder "Nome").
- Seção "Períodos do dia · manhã 9h–14h · tarde 14h–19h". Um card por corretor (`md:grid-cols-2`) com a equipe e 2 turnos. Os turnos são "Manhã 9h–14h" e "Tarde 14h–19h" (`TURNOS`).
  - Cada turno tem o selo de status e os botões:
    - "✓ Cumpriu o período"
    - link "Saiu para visita" (abre "Link da foto da saída", placeholder "https://", botão "Registrar saída" e link "Cancelar")
    - link "Desmarcar" (só nos pendentes lançados pela própria pessoa)
  - Com saída: "Saída para visita · Ver foto". Recusado: "Motivo: …".
  - Erro de link: "Cole o link da foto, que começa com https://."
  - Avisos "Desfazer": "{nome}: manhã marcada", "Saída de {nome} registrada (manhã)", "Período de {nome} desmarcado".
  - Vazios: "Nenhum corretor com esse nome." e "Nenhum corretor ativo."
- Seção "Roleta do fim de semana · semana de dd/mm a dd/mm":
  - "N de M aptos. Entra quem tem 6 períodos aprovados de segunda a sexta. Quem não tem pode ir ao plantão com visita agendada, fora da roleta."
  - por corretor: "✓ Apto" ou "– Faltam N", "· A de 6" e " · N pendente(s)"
- Seção "Vídeos com a marca" (`LancarVideo`):

| Campo | Tipo | Regra |
|---|---|---|
| Corretor | select ("Escolha") | obrigatório; "Escolha o corretor." |
| Data | date, `max` = hoje | |
| Vídeos | número inteiro | 1 a 100; "Confira a quantidade: de 1 a 100." |
| Link do vídeo (opcional) | url | "O link precisa começar com https://." |

  - botão "Lançar vídeo"; aviso "Vídeo lançado para aprovação" com Desfazer
  - lista "Lançados por você nos últimos 30 dias", com selo e o link "Cancelar" nos pendentes
- Estados: "Carregando…" e "! {erro}".
- Celular: cards em `md:grid-cols-2`. O cabeçalho é `grid` no celular e `md:flex` no desktop. O botão de busca ocupa `md:w-[280px]`.

#### `/empreendimentos/` (`app/empreendimentos/page.tsx`)

**Objetivo.** Catálogo de empreendimentos, com busca e filtros. **Quem.** Todo usuário ativo. `gerencia = pode("empreendimentos.gerenciar")` (por padrão, operacional) mostra "Mostrar os fora de venda", "Importar tabela de preços" e "+ Novo empreendimento". O destaque "clientes aguardando lançamento" só aparece com `leads.cadastrar`, `dados.ver_equipe` ou `dados.ver_todos`.

- Filtros (`FiltrosCatalogo`):
  - "Buscar" (placeholder "Nome, bairro ou cidade"; ignora acentos, marca e pontuação, e exige todos os termos)
  - "Fase": Todas ou as 4 fases
  - "Cidade e bairro": Todos, com `optgroup` por cidade e a opção "Toda {cidade}"
  - "Dormitórios": Todos, "1 ou studio", "2", "3", "4 ou mais"
  - "Faixa de preço": Todas, "Até R$ 300 mil", "R$ 300 a 500 mil", "R$ 500 a 800 mil", "R$ 800 mil a 1,2 mi", "Acima de R$ 1,2 mi"
  - checkbox "Mostrar os fora de venda" (só gerencia)
- Lista ordenada por fase (breve lançamento, lançamento, em obras, pronto) e depois pela ordem. Título "Todos à venda · N" ou "Encontrados · N".
- **Card** (`CardEmpreendimento`, `comp/empreendimentos/partes.tsx`):
  - condomínio ou marca
  - selo da fase ("→ " nos lançamentos) ou "– Fora de venda"
  - nome com link
  - bairro e cidade, "Entrega em mmm/aaaa" ou "Pronto para morar"
  - resumo de dormitórios e de área (por exemplo "43,77 a 53,54 m²")
  - "A partir de R$ …" ou "! Sem preço na tabela do mês"
  - "! Tabela de mmm/aaaa" quando a tabela é antiga
  - "! {restricao_renda}"
  - link "! N cliente(s) aguardando lançamento combina(m) →"
  - botões: "Apresentação" (ou "Book", ou "Página no site"), "Tabela", "Como chegar" e "Mandar ao cliente". O que não tem link não aparece. "Mandar ao cliente" abre `DialogoMensagem` com o modelo `apresentar_empreendimento`.
- Estados:
  - erro: "! Não foi possível carregar o catálogo. {erro}"
  - "Carregando…"
  - catálogo vazio: "O catálogo está vazio. Cadastre o primeiro empreendimento ou rode a carga inicial no Supabase." (gerencia) ou "…Fale com o gerente geral."
  - filtros sem resultado: "Nenhum empreendimento com esses filtros. Limpar filtros"
- Ação "+ Novo empreendimento" em `RodapeAcao`.
- Celular:
  - lista em `md:grid-cols-2`
  - filtros com `min-w` e `flex-1`; a busca ocupa a linha inteira
  - `pb-20 md:pb-0` por causa do botão fixo
  - botões do card em `grid-cols-2 sm:flex`

#### `/empreendimentos/ver/?slug=` (`app/empreendimentos/ver/page.tsx`)

**Objetivo.** Detalhe do empreendimento. **Quem.** Todos. O link "Editar empreendimento e preços" e os "Avisos da coleta" só para `empreendimentos.gerenciar`. "Clientes compatíveis" só com permissão de leads.

- Link "← Catálogo". Card de cabeçalho: condomínio ou marca, selo, nome, chamada, endereço, entrega, "A partir de", restrição de renda, botões.
- "Clientes compatíveis · N": Radar de match (nota mínima 70%). Lista de cards com:
  - "! Aguardando lançamento"
  - nome com link
  - nota "N%"
  - motivos (✓, ✕ e ! em texto)
  - botões "Mandar →" e "Abrir ficha"
  - destaque "! N cliente(s) aguarda(m) este lançamento. Avise primeiro."
  - "Descartado: fora do perfil"
  - vazio: "Nenhum cliente com nota de 70% ou mais. O Radar usa o perfil do lead: valor, dormitórios, região e finalidade."
- "Tipologias · tabela de mmm/aaaa". Por tipologia: rótulo, preço (ou "✕ Esgotada" ou "Sem preço"), linha com tipo, suítes, área, vagas e condomínio, e a nota do preço. As esgotadas ficam com `opacity-60`. Vazio: "Sem tipologias no catálogo ainda."
- "Lazer" (lista) e "Material" (links "Página no site", "Book", "Tour virtual", "Fotos", "Ficha técnica", "Memorial descritivo").
- Estados:
  - "! Empreendimento não informado. Volte para o catálogo."
  - "! Empreendimento não encontrado. Voltar ao catálogo"
  - "Carregando…"
- Celular: clientes em `md:grid-cols-2`.

#### `/empreendimentos/editar/?slug=` (`app/empreendimentos/editar/page.tsx`)

**Objetivo.** Criar ou editar o empreendimento e suas tipologias. **Quem.** `exige="empreendimentos.gerenciar"`. Sem `?slug` é "Novo empreendimento".

- Seções, em cards:
  - **Empreendimento:**

| Campo | Tipo | Regra |
|---|---|---|
| Nome | texto, placeholder "Mundi - Lucca" | obrigatório; "Preencha o nome."; mostra "Endereço da página: {slug}" no novo |
| Condomínio (torres com nome próprio) | texto | |
| Fase | select | |
| Tipo | select Residencial/Comercial | |
| Marca | texto, padrão "MBigucci" | |
| À venda (desmarque para tirar das listas sem apagar) | checkbox | |

  - **Endereço e entrega:** Endereço (o do Linktree), Bairro, Cidade, "Entrega prevista (mês)" (`type=month`), "Entrega em texto (opcional)" (placeholder "36 meses após a assinatura"), Chamada.
  - **Links** (9 campos `url`, placeholder "https://"): Apresentação (vai para o cliente), Tabela de preços, Página no site, Google Maps, Book, Tour virtual, Fotos, Ficha técnica, Memorial descritivo.
  - **Tipologias e preços:** "Mês da tabela de preços" (month), "Restrição de renda (opcional)" e a lista de tipologias.
    - Cada tipologia tem:
      - Nome (placeholder "2 dorms · 48 m² · 1 vaga"), obrigatório; "Preencha o nome da tipologia N."
      - Tipo (select)
      - Dorms, Suítes, Vagas e "Vagas (máx.)", inteiros
      - "Área m²" e "Condomínio R$"
      - "Preço a partir de (R$)", placeholder "344.800"; erro "Confira o preço da tipologia N: só números, como 344.800."
      - "Nota do preço", placeholder "unid. 84 · tabela R$ 515.000"
      - checkbox "Esgotada"
      - link "✕ Retirar" (sem confirmação; só apaga ao salvar)
    - Botão "+ Tipologia".
    - Erros: "Confira dormitórios, suítes e vagas da tipologia N: números inteiros." e "Confira a área e o condomínio da tipologia N."
  - **Cadastro Mágico e observação:** "Outras formas de escrever (separe por vírgula)", checkbox "O nome é palavra comum (como Life ou Dom): só vale com "Residencial" ou "Empreendimento" antes", "Observação interna".
- Botão "Salvar" em `RodapeAcao` ("Salvando…"). Depois vai para `/empreendimentos/ver/?slug=`.
- Erros: "✕ {erro}" (`role=alert`). Se o empreendimento salvar e as tipologias falharem: "O empreendimento foi salvo, mas as tipologias não: …"
- Erros de catálogo: "Já existe um empreendimento com esse nome.", "Os links precisam começar com https://.", "O máximo de vagas não pode ser menor que o mínimo."
- Largura `max-w-[760px]`. Celular: grades `md:grid-cols-2`, tipologia em `grid-cols-2 md:grid-cols-4`, `pb-24 md:pb-0`.

#### `/empreendimentos/importar/` (`app/empreendimentos/importar/page.tsx`, `lib/importar-tabela.ts`)

**Objetivo.** Importar a tabela de preços do mês via IA externa, sem chave de API. Tudo roda no navegador. **Quem.** `exige="empreendimentos.gerenciar"`.

- **Passo 1, "Copie as instruções para a IA".** Botões "Copiar instruções" (vira "✓ Instruções copiadas"; se a área de transferência falhar, baixa o arquivo) e "Baixar .md" (`tabela-de-precos-mbigucci.md`). O texto lista os empreendimentos ativos do catálogo, as regras e o exemplo.
- **Passo 2, "Cole a resposta da IA".**
  - Textarea "Resposta (o bloco JSON)", placeholder `{ "formato": "mbigucci-empreendimentos/1", ... }`.
  - Botão "Conferir" (desativado sem texto).
  - **Upload:** `<input type="file" accept=".json,application/json,text/plain">` com o rótulo "Ou escolha o arquivo .json". Lê o arquivo e já confere. É o único upload da área.
  - Erros de leitura (`role=alert`):
    - "Cole a resposta da IA ou escolha o arquivo .json."
    - "Não consegui ler o JSON. Copie a resposta inteira da IA (o bloco que começa com { ) e cole de novo."
    - erros do zod por empreendimento e tipologia ("Empreendimento 2 (Life), tipologia 3, preco_a_partir_de: …", até 8)
    - rodapé "Peça à IA para corrigir e cole a resposta de novo."
  - Tolerância: blocos ```json (junta vários), aspas tortas, vírgula sobrando, "R$ 450.000,00", "1,2 milhão" e "Ago/2030".
- **Passo 3, "Confira a prévia".**
  - Contagem: "N para atualizar · N novo(s) · N sem mudança · N com erro".
  - Cada item (`ItemDaPrevia`):
    - "→ Atualiza X: 3 preços mudam, 1 tipologia nova …"
    - "+ Novo: X, N tipologias" (ou ", sem tipologias")
    - "✓ X: sem mudança"
    - "✕ X: {erro}"
  - Detalhes de cada item:
    - mudanças de tipologia ("R$ a → R$ b", "esgotada", "volta à venda")
    - "+ rótulo · R$ …"
    - "Não vieram na tabela (ficam como estão): …"
  - "Avisos da IA" (com "! ").
  - Nota: "Dos empreendimentos que já existem, mudam só os preços, as tipologias, a fase, o mês da tabela, a entrega e a restrição de renda. Endereço, links e textos continuam na tela de edição."
  - Erros de plano possíveis:
    - "Vale para mais de um empreendimento (…). Peça à IA um item por torre, com o id do catálogo."
    - "{X} aparece duas vezes na resposta. Junte as tipologias num item só."
    - "Empreendimento novo sem a fase (breve lançamento, lançamento, em obras ou pronto)."
    - "Já existe um empreendimento com o id "…"…"
- **Aplicar:** botão vermelho em `RodapeAcao`: "Aplicar N mudança(s)" ou "Nada para aplicar", e "Aplicando…". Sem diálogo de confirmação: a prévia é a confirmação. O resultado é `role=status`: "✓ N empreendimento(s) atualizado(s): …", erros "✕ …" e o link "Ver o catálogo". Cada empreendimento é aplicado separadamente, e o erro de um não para os outros.
- Limites do formato (`FORMATO = "mbigucci-empreendimentos/1"`): até 100 empreendimentos, 60 tipologias por empreendimento, preço de 20.000 a 100.000.000.
- Estados: "Carregando…" e "! {erro}" do catálogo. Largura `max-w-[760px]`.
- Celular: textarea mono, botões `btn-lg`, `pb-24 md:pb-8`.

### 2.3 Recepção, parceiros e distribuição automática

Vale para todas as telas, para não repetir:
- Todas passam pela `Casca` (`comp/casca.tsx`). Ela monta o menu, mostra o botão de recebimento no cabeçalho e as folhas da distribuição.
- A `Casca` mostra "Carregando…" enquanto a sessão carrega, "! Conta desativada", "! Não foi possível carregar sua conta" e "! Seu perfil não tem acesso a esta página." (`casca.tsx:112`).
- Erro de leitura aparece como `✕ <mensagem>` (classe `aviso-erro`). Sucesso aparece como `✓ …` (`aviso-ok`). Atenção aparece como `! …`.
- **Sem conexão:** "Sem conexão com o servidor. Tente de novo." (`lib/erros.ts`). Para gravações existe `erroAoSalvar`: "Não foi salvo: sem conexão. Faça de novo quando a internet voltar." Com rascunho, o texto é "…O texto ficou guardado neste aparelho. Toque em <botão> quando a internet voltar."
- **Permissão no banco:** "Você não tem permissão para isso." Tabela inexistente: "Esta parte do Base360 Vendas ainda não foi ativada. Avise o gerente geral."
- Não existe tela dedicada de offline nem fila de gravação offline. Só os rascunhos de parceiros e o id gerado no aparelho (reenvio não duplica).

#### `/recepcao/` (`app/recepcao/page.tsx`)

**Rota e objetivo.** É a recepção do stand: monta a vez de corretores e especialistas, cadastra o cliente por tipo e diz quem anunciar. O PC da loja é o uso principal e o celular é reserva. Exige `plantao.atendimentos`. Por padrão vale para os perfis recepcao e operacional.

**Peças de interface**
- **Escolha do stand** (primeira vez no aparelho):
  - Card "Escolha o stand deste computador", com um botão grande por stand ativo, em grade de 2 colunas.
  - Vazio: "! Nenhum stand ativo. Peça ao gerente geral para cadastrar."
  - Nota: "Este aparelho lembra a escolha. Dá para trocar no topo da tela."
  - A escolha fica no `localStorage`, chave `mbigucci-recepcao-stand`.
- **Cabeçalho da tela:**
  - "Recepção · Stand X" com o link "Trocar stand".
  - "Hoje, quarta, dd/mm/aaaa".
  - No PC: "Agora 9h40" e a linha "Atalhos: Alt+N, C, P, R tipo · Alt+V Pôr na vez · Alt+K cliente".
  - Links "Relatório do stand" (exige `plantao.atendimentos_ver`) e "Stands e especialistas" (exige `plantoes.gerenciar`).
- **Cartão "Vez dos corretores"** (`comp/recepcao/vez.tsx`). O de especialistas é o mesmo componente, em versão compacta, e só aparece se o stand tem especialista.
  - Abas de turno: "Manhã 9h–14h · n" e "Tarde 14h–19h · n". Só o cartão dos corretores tem as abas.
  - Campo de busca "Pôr na vez, na ordem da roleta" (especialista: "Pôr na vez"), com o componente `BuscaPessoa`:
    - combobox com sugestões, até 6;
    - setas escolhem, Enter confirma, Esc limpa;
    - sugestão sem resultado: "Ninguém com esse apelido ou nome.";
    - o apelido que começa com o termo vem primeiro.
  - O campo só aparece na janela de horário. Fora dela: "Pôr na vez abre das 8h45 às 9h15" (tarde: "13h45 às 14h15").
  - Tabela: `#`, Apelido (ou Nome), Vez (✓ por cliente recebido, até 6, depois o número), Estado (oculto abaixo de `sm`; no celular o estado vai sob o nome) e Ações.
  - A linha da vez tem destaque. Quem saiu ou "não está mais" fica esmaecido.
  - Legenda: "✓ = cliente novo recebido. Quem saiu é pulado até voltar."
  - Vazio: "! Ninguém na vez neste período." mais "Digite o apelido em Pôr na vez, na ordem da roleta do stand." (ou "A vez é montada das 8h45 às 9h15").
- **Formulário "Registrar cliente"** (`comp/recepcao/cliente.tsx`). Tem um seletor de tipo e campos que mudam por tipo. Os campos estão na tabela da seção 1.1 abaixo.
- **Cartão "Anuncie"** (`comp/recepcao/anuncie.tsx`), logo após registrar:
  - "✓ Cliente registrado", o papel e o nome de quem chamar ("Corretor(a) X e especialista Y") e uma linha explicativa.
  - Botão "Desfazer · 8 s", contagem regressiva de 8 s.
  - O cartão fica na tela até o próximo cliente.
  - Sem ninguém: "! Ninguém para anunciar."
- **Lista "Clientes de hoje"** (`comp/recepcao/clientes-hoje.tsx`):
  - Título "n clientes". Nota "Os dias anteriores só pela busca do Retorno".
  - Vazio: "Nenhum cliente ainda. O primeiro que chegar aparece aqui."
  - Tabela com colunas Hora, Tipo, Cliente, Atendeu, Especialista, Como conheceu e ação. A tabela só aparece quando a caixa tem pelo menos 600 px (medido por `ResizeObserver`). Abaixo disso, ou no celular, viram linhas compactas.
  - Selo do tipo, "antes da vez", "final 1234" ou "sem telefone", "veio sozinho" ou "com <acompanhante>".
  - Marcas: "✓ Já estava na carteira", "! Lead criado", "gerente X" (parceiro).
  - Cliente desfeito aparece riscado, com "– Desfeito".
  - Rodapé: "Corrigir sem motivo até 30 min depois; depois, com motivo. Para trocar o tipo ou quem atendeu, use Desfazer e registre de novo."
- **Corrigir** (formulário em linha na linha do cliente):
  - Chips de "Como conheceu".
  - Campos: Cliente, Telefone ("Só se for trocar"; mostra "hoje final 1234"), Acompanhante com o botão "Sozinho", Empreendimento (datalist), Observação (máx. 500).
  - "Motivo da correção · passou de 30 min" (máx. 280), obrigatório depois dos 30 min.
  - Botões "Salvar correção" e "Cancelar".
  - Erros: "Confira o telefone.", "Digite o nome do acompanhante ou marque Veio sozinho.", "Escreva o motivo da correção."
- **Aviso fixo** "Desfazer" (`AvisoDesfazer` em `comp/leads/partes.tsx`): barra escura no rodapé, "✓ <Fulano> saiu/voltou/passou a vez/não está mais" com o botão Desfazer. Some em 8 s (`SEGUNDOS_DESFAZER`).
- **Atualização automática:** `recepcao_dia` e `recepcao_clientes_hoje` são lidos de novo a cada 15 s e quando a janela volta ao foco (`lib/recepcao-dados.ts`).

**Ações**
- **Pôr na vez** (RPC `recepcao_por_na_vez`): sem confirmação. Avisos: "! X já está na vez." e "! X já está na vez de outro stand neste turno."
- **Por linha** (RPC `recepcao_evento`): "Passar a vez" (só em quem é da vez), "Saiu" ou "Voltou", e "Mais" que revela "Não está mais". Nenhuma pede confirmação. O Desfazer (8 s) é a rede de segurança, e o banco só desfaz o último movimento e até 30 min.
- **Registrar cliente** (RPC `recepcao_registrar_cliente`). O banco pode devolver perguntas ou confirmações em vez de gravar (seção 1.2).
- **Desfazer cliente** (`recepcao_desfazer_cliente`): botão do Anuncie, 8 s. Remove também o lead criado, se foi criado.
- **Corrigir** (`recepcao_corrigir`).
- **Retorno:** busca de cliente (`recepcao_procurar_retorno`), detalhada na seção 1.1.
- **Atalhos de teclado** (só PC):
  - Alt+N, C, P e R escolhem o tipo.
  - Alt+V foca "Pôr na vez".
  - Alt+K foca o nome do cliente.
  - Dentro do seletor, as setas giram o tipo.
  - Enter registra e Tab avança.
- **WhatsApp ou ligação:** não existem na recepção. O telefone é só dado.

**Celular** (`useTelaPc`, breakpoint 900 px):
- Abas "No stand" e "Clientes · n" (n = clientes ativos).
- O formulário vira tela cheia ao tocar no botão fixo "+ Cliente", com "Cancelar" ao lado de "Registrar".
- As respostas das perguntas do banco ficam no rodapé fixo.
- A lista de clientes vira linhas compactas.
- Os atalhos de teclado e o texto "Agora" somem.
- No PC o layout é de duas colunas (vez à esquerda, formulário, Anuncie e lista à direita).

##### Formulário "Registrar cliente": campos

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Tipo do cliente | radiogroup de 4 | sim (padrão Novo) | ver listas |
| Procurar cliente (só Retorno) | texto | sim no Retorno: "Procure o cliente e escolha na lista." | placeholder "(11) 98765-4321 ou o nome". Busca por telefone exato ou nome com 3+ letras. Devolve até 5, com primeiro nome, final do telefone, vínculo, último atendimento e especialista. Botão "Procurar". |
| Como conheceu | chips de múltipla escolha | sim, exceto Retorno (opcional) | "Marque como o cliente conheceu." Vem de `plantao_midias`, só as ativas. |
| Cliente | texto | sim (no Retorno usa o nome do achado) | "Digite o nome do cliente." |
| Telefone | `type=tel` | não | máscara no `onBlur` via `normalizarWhatsapp`/`formatarWhatsapp`, "(11) 98765-4321". Inválido: "Confira o telefone: DDD e número, como (11) 98765-4321." |
| E-mail | `type=email` | não | |
| Acompanhante | texto, mais botão "Veio sozinho" | sim, ou marcar Veio sozinho | "Digite o nome do acompanhante ou marque Veio sozinho." Placeholder "Nomes separados por vírgula". |
| Empreendimento | texto com datalist do catálogo ativo | não | |
| Observação | texto, máx. 500 | não | |

**Por tipo (bloco "quem atende")**
- **Novo:**
  - Mostra "Corretor(a) · da vez" e "Especialista · da vez". Esse bloco é somente leitura.
  - Antes das 8h45 ("antes da vez"), aparece o aviso "! Antes da vez: a vez da manhã abre às 8h45. Escolha quem atende; a vez não gira." Aparecem os campos "Quem atende" (obrigatório: "Escolha quem atende antes da vez.") e "Especialista · opcional".
  - Sem ninguém na vez: "Ninguém na vez neste período. Ponha os corretores na vez."
- **Indicação de corretor:** "Corretor(a) que indicou" (busca, obrigatório: "Escolha o corretor que indicou.") e o especialista da vez.
- **Indicação de parceiro:**
  - Campos: "Corretor(a) parceiro" (obrigatório), "Imobiliária ou autônomo", "Telefone do parceiro" e "CRECI · se não tiver o telefone". Telefone ou CRECI é obrigatório.
  - Pergunta "Procura algum gerente?" com os botões "Não, usar a roleta" e "Sim, escolher o gerente".
  - "Gerente procurado" é um select obrigatório nesse caso.
  - Na roleta, aparece o cartão: "A roleta de parceiros indica o gerente X. Pergunte: ele está no stand?" com os botões "Sim, fica com X" e "Não está, passar ao próximo". Chegando ao fim: "! Nenhum gerente da fila está no stand." com "Recomeçar a fila". Nota: "Quem foi pulado não perde a vez." e "Se o parceiro já for cadastrado, ele fica com o gerente dele."
  - Antes de registrar, o parceiro entra pela RPC `recepcao_parceiro_entrar` (id próprio, uma só vez).
- **Retorno:** mostra o cliente achado com "Trocar". Em stand com especialista: "Especialista do último atendimento: … · último da vez: …", mais "Se o do último atendimento não puder, apresente o da vez. A cortesia não é registrada."

Rodapé do formulário:
- PC: "O lead vai para a carteira do corretor da vez, com próximo contato amanhã às 10h." (ou "Tab avança · Enter registra").
- Botão "Registrar cliente" (no Retorno, "Registrar retorno"; ocupado: "Registrando…").
- A permanência de `id` evita duplicar no reenvio.

##### Perguntas e confirmações que o banco devolve (`opcoesDaPergunta`)

Aparecem num cartão `role=alert`. As respostas viram botões no rodapé, e a primeira é o botão principal.
- `repetido_hoje`: "! Esse telefone já foi registrado hoje às 10h05. Registrar de novo?" Botões "Registrar de novo" e "Cancelar".
- `outra_carteira`: "! Esse cliente já é de outro corretor. Confirme se é retorno." Botões "Trocar para Retorno" e "Registrar mesmo assim".
- `corretor_no_stand`: "! X não está na vez. Pergunte: X está no stand?" Botões "Sim, está" e "Não está".
- `gerente_no_stand`: "! X não está no stand. Pergunte: o gerente Y está no stand?" Botões "Sim, anunciar o gerente" e "Não está".
- `vez_mudou`: "! A vez mudou: agora é de X. Confira e registre de novo." Botão "Entendi".

##### Estados da tela
- **Carregando:** "Carregando…".
- **Erro:** `✕ <erro>`.
- **Sem permissão:** o texto geral da `Casca`.
- **Sem conexão:** o texto geral.
- **Vazios:** os textos de cada peça, acima.

Erros do banco traduzidos (`lib/recepcao.ts`, `ERROS`):
- sem_permissao: "Seu perfil não registra a recepção."
- dados_invalidos: "Confira os campos: nome, telefone e acompanhante (ou Veio sozinho)."
- stand_invalido: "Esse stand não está ativo. Escolha outro no topo."
- midia_invalida: "Marque como o cliente conheceu."
- sem_corretor_na_vez: "Ninguém na vez neste período. Ponha os corretores na vez."
- vez_aberta: "A vez da manhã já abriu: registre pela vez."
- pessoa_invalida: "Escolha um corretor ativo da lista."
- parceiro_invalido: "Não achamos esse parceiro. Confira os dados."
- parceiro_sem_gerente: "O parceiro está sem gerente. Fale com o gerente geral."
- gerente_invalido: "Esse gerente não está mais na fila. Escolha de novo."
- retorno_invalido: "Esse cliente não está mais disponível. Procure de novo."
- fora_do_horario: "Pôr na vez só abre das 8h45 às 9h15 e das 13h45 às 14h15."
- sem_especialista: "Este stand não tem especialista."
- presenca_invalida: "Essa pessoa não está na vez de hoje."
- estado_invalido e vez_mudou: "A vez mudou. A tela foi atualizada."
- evento_invalido: "Não dá para desfazer isso."
- prazo_encerrado: "Passou do prazo para desfazer ou corrigir."
- nao_e_o_ultimo: "Só dá para desfazer o último movimento."
- atendimento_invalido: "Esse registro não pode mais ser alterado."
- motivo_obrigatorio: "Escreva o motivo da correção."

#### `/recepcao/relatorio/` (`app/recepcao/relatorio/page.tsx`)

**Rota e objetivo.** Relatório dos clientes registrados pela recepção no período. Exige `plantao.atendimentos_ver`. Por padrão vale para gerente (equipe e parceiros dele) e operacional, e o gerente geral vê tudo. O RLS limita o que volta.

**Peças**
- **Filtros** (`sem-impressao`):
  - Período: botões "Dia", "Semana" (padrão) e "Mês".
  - "← Anterior" e "Seguinte →" (este fica desabilitado no período atual).
  - Select "Stand" ("Todos" ou um stand).
- **Cartões de números:** "Clientes" (destaque, com barra) e um por tipo (Novo, Ind. corretor, Ind. parceiro, Retorno).
- **Linha de apoio:** "n clientes novos atendidos antes da vez."
- **Listas** com nome, quantidade e percentual, ordenadas pelo maior e depois pelo nome:
  - "Como conheceu", com a nota "n sem marcação (retornos)";
  - "Empreendimento de interesse", com "– Sem empreendimento";
  - "Por corretor · o do vínculo";
  - "Por especialista";
  - "Por parceiro" (só se houver).
- **Impressão:** botão "Imprimir" (`window.print()`). Existe um cabeçalho só de impressão: "MBigucci · Base360 Vendas", "Relatório do stand · <stand>", "<período>: <rótulo> · impresso em <data hora>".
- **Link** "Ver o painel da equipe" (`/painel/`).
- **Exportação:** não existe (só impressão).

**Ações:** nenhuma de escrita. A leitura é paginada de 1000 em 1000 em `plantao_atendimentos`.

**Estados**
- Carregando: "Carregando…".
- Vazio: "Nenhum cliente registrado neste período."
- Erro: `✕ <erro>`.

**Celular:** cartões em 2 colunas (5 a partir de `md`), listas em 1 coluna (2 a partir de `md`).

**Complemento (`comp/recepcao/painel-stand.tsx`)**
- `TabelaStand` entra no painel da equipe com as colunas "Clientes no stand", "Novos da vez", "Indicações", "Retornos" e "Atendeu por colega".
- No celular vira lista com `<details>` por corretor.
- `StandDoCorretor` repete os números no relatório do corretor.
- Nota: "O cliente conta para o corretor do vínculo (o da vez, quem indicou ou o do retorno). Cliente de parceiro fica com o gerente do parceiro."

#### `/recepcao/stands/` (`app/recepcao/stands/page.tsx`)

**Rota e objetivo.** Configurar stands, especialistas e a lista "Como conheceu". Exige `plantoes.gerenciar`. Por padrão vale para operacional e gerente geral. O banco confere a permissão.

**Peças**
- Link "Voltar à recepção".
- **Card "Stands":**
  - Lista com nome e "– Desativado".
  - Botões "Renomear" (campo em linha com "Salvar") e "Desativar" ou "Reativar".
  - "Tem especialista", com os botões Sim e Não (só em stand ativo).
  - Formulário "Novo stand" com "+ Cadastrar".
  - Nota: "Sem especialista, a recepção não vê a vez dos especialistas nem o campo Especialista."
- **Card "Especialistas"** ("Lista única"): renomear, desativar ou reativar, "Novo especialista". Nota: "A escala muda toda semana: a recepção põe na vez quem veio no dia."
- **Card "Como conheceu"** ("Escolha múltipla na recepção"): renomear e desativar ou reativar cada mídia. Não existe criação de mídia nem reordenação na tela.
- **Card "Localização dos stands"** (`comp/distribuicao/local-stands.tsx`), check-in da distribuição. É lido numa consulta à parte e some se o `distribuicao.sql` não está instalado.
  - Por stand ativo: "✓ com localização" ou "– sem localização".
  - Campos: Latitude, Longitude (`inputMode=decimal`, aceita vírgula) e Raio (m) (inteiro de 30 a 1000, padrão 200).
  - Botões "Usar minha localização aqui" (geolocalização) e "Salvar".
  - Nota: "No stand, toque em Usar minha localização aqui e salve. O raio é a distância que conta como dentro."
  - Vazio: "Nenhum stand ativo."
  - Mensagens:
    - "! Localização bloqueada. Libere no navegador."
    - "! Localização imprecisa. Tente num lugar aberto."
    - "! Precisão de X m. Tente num lugar aberto antes de salvar." (acima de 100 m)
    - "✓ Precisão de X m. Salve para gravar."
    - "✕ Preencha a latitude e a longitude, ou deixe as duas vazias."
    - "✕ Confira a latitude e a longitude."
    - "✕ O raio vai de 30 a 1000 m."
    - "✓ Localização salva."

**Ações:** todas são `update` ou `insert` direto na tabela, sem confirmação:
- Duplicado: "Já existe um com esse nome."
- Sem linha afetada: "Não foi salvo. Seu perfil pode não ter permissão."

**Estados:** "Carregando…" e `✕ <erro>`. No celular as colunas viram uma só (2 colunas a partir de `lg`).

#### `/parceiros/` (`app/parceiros/page.tsx`)

**Rota e objetivo.** Carteira de parceiros (corretores e imobiliárias que indicam clientes) com o prazo de 90 dias. Quem acessa é quem tem `parceiros.cadastrar` (gerente e gerente geral) ou `parceiros.ver_todos` (gerente geral). O componente `ComPermissao` mostra "! Seu perfil não tem acesso a esta página." caso contrário.

**Peças**
- **Faixas de prazo** (3 botões de filtro com contagem): "✓ n Até 30 dias", "! n 31 a 60 dias" e "✕ n 61 a 90 dias".
- **Linha de resumo:** "n novos sem a primeira interação · n com contato vencido · ! n procurou de novo".
- **Linha da roleta** (se for o próximo): "→ Você é o próximo da roleta de parceiros."
- **Cartão "Parceiros para contatar hoje · n"** (`contatos-do-dia.tsx`). Só para quem cadastra e só com contatos vencidos ou de hoje. Cada item é um link para a ficha com `#registrar`.
- **Busca:** campo "Buscar" (nome, empresa, WhatsApp ou CRECI), sem acento, com o 55 do país tolerado.
- **Filtro "Gerente":** select, só para `ver_todos`. Ele muda a base do resumo e das contagens. O texto "(você)" marca o próprio.
- **Filtro por estágio:**
  - Chips "Todos n", "Novo", "Contatado" e "Apresentado", cada um com contagem.
  - "Indicou · em breve" e "Vendeu · em breve" aparecem tracejados, desativados ("Depende da origem Parceiro no lead").
- **Lista em cards**, em 2 colunas a partir de `md`. Cabeçalho: "Parceiros · n" (ou "Encontrados · n"). Cada card (`card.tsx`) tem:
  - nome e "Empresa (ou Autônomo) · CRECI x" (link para a ficha);
  - selo do prazo ("Novo", "✓ 21 dias", "! 36 dias" ou "✕ 84 dias");
  - se aplicável, "! Procurou a MBigucci de novo em dd/mm/aaaa";
  - trilha de estágio (Novo, Contatado, Apresentado, Indicou–, Vendeu–);
  - "Recebido pelo link/no estande/à mão em …" (se Novo) ou "Próximo contato: …" ("✕ Vencido, data", "! Hoje" ou a data);
  - "Gerente: X" (para quem vê todos).
  - Botões: "Registrar" (só do dono; o primeiro card urgente é vermelho, os demais discretos) ou "Abrir"; e "Abrir WhatsApp" (link `wa.me/55…`, abre em nova aba).
  - O card mais urgente leva a barra de destaque (reentrada, contato vencido ou faixa risco).
- **Registrar no próprio card:** o formulário abre dentro do card (seção 4.1). Depois de salvar mostra "✓ Interação registrada".
- **"Ver fila da roleta"** (`fila.tsx`), no fim: botão que expande a ordem ("1. Você · próximo da vez"), "Último a receber: … dd/mm/aaaa [Estande|Link|90 dias]" e a nota "Entram na roleta os parceiros do link, do estande e os que trocam de gerente por 90 dias. Cadastro à mão não conta como vez." Textos do botão: "Ver fila da roleta" e "Esconder fila da roleta".
- **Rodapé fixo** (no celular; estático no PC): "Registrar evento" e "+ Novo parceiro" (só para quem cadastra).

**Ordem da lista** (`ordenarParceiros`): reentrada primeiro, depois contato vencido (o mais antigo antes), depois mais dias sem interação, depois o nome.

**Estados**
- Carregando: "Carregando…".
- Vazio da carteira: título "Nenhum parceiro ainda". Quem cadastra lê "Cadastre o primeiro em + Novo parceiro. Os que chegarem pela roleta também aparecem aqui." Quem só vê lê "Os parceiros aparecem aqui quando os gerentes cadastrarem ou a roleta distribuir."
- Filtro sem resultado: "Nenhum parceiro com essa busca ou filtro." (ou "Nenhum parceiro deste gerente.")
- Erro: `✕ <erro>`.

**Celular:** faixas em 3 colunas, rodapé de ações fixo (`pb-24`), cards em 1 coluna. No PC os cards ficam em 2 colunas e o filtro de gerente ao lado da busca (2fr/1fr).

##### Registrar interação (`comp/parceiros/registrar-interacao.tsx`)
Aparece no card (`/parceiros/`) e na ficha. Só o dono registra.
- **Tipo:** 6 botões (Ligação é o padrão).
- **Resumo:** `textarea`, obrigatório, máx. 2000, placeholder "O que foi combinado". Erro "Escreva o resumo."
- **Próximo contato** (`CampoDiaContato`): atalhos "7 dias", "15 dias", "30 dias" e "Sem data", mais campo de data com `min` = hoje. Erro "O próximo contato precisa ser de hoje em diante." Nota: "O próximo contato entra na sua lista do dia."
- **Botões:** "Cancelar" (só no card) e "Registrar" ("Salvando…").
- **Nota final:** "Registrar reinicia os 90 dias. O rascunho fica salvo se a página recarregar."
- **Rascunho** no aparelho (`lib/rascunho.ts`), chave `parceiro-interacao:<id>`. Id gerado no aparelho e a gravação é idempotente.
- Não pede confirmação.

#### `/parceiros/novo/` (`app/parceiros/novo/page.tsx`)

**Rota e objetivo.** Cadastrar parceiro à mão. Permissão: `parceiros.cadastrar`. Sem ela: "! Seu perfil vê os parceiros, mas não cadastra."

**Formulário** (`CamposCadastro`, o mesmo da edição):

| Campo | Tipo | Obrigatório | Máscara e regra |
|---|---|---|---|
| Nome | texto | sim ("Preencha o nome."), máx. 120 | |
| Empresa | texto | não | "Deixe vazio se for autônomo" |
| WhatsApp | `inputMode=tel`, "(11) 90000-0000" | WhatsApp ou CRECI | normaliza para 10 ou 11 dígitos, sem 55 nem zeros à esquerda, e põe o 9 no celular de 10 dígitos. Erro "Confira o WhatsApp: DDD e número." |
| CRECI | texto | WhatsApp ou CRECI | maiúsculas, sem a palavra CRECI, mínimo 3 caracteres. Erro "Confira o CRECI: pelo menos 3 letras ou números." |
| E-mail | `type=email` | não | "Confira o e-mail." |
| Região de atuação | chips de múltipla escolha agrupados por cidade ("Cidade toda" primeiro no grupo), mais "Fora da lista" (regiões desativadas já marcadas) e "+ Outra" | não | "Outra" abre o campo "Outra região" (máx. 160, placeholder "Ex.: Pauliceia, Guarulhos"), obrigatório se marcado: "Escreva a outra região ou desmarque Outra." |

- Nota do formulário: "Compara WhatsApp ou CRECI com os parceiros de todos os gerentes. Se faltar um, vale o outro. O rascunho fica salvo se a página recarregar."
- Rascunho no aparelho (chave `novo-parceiro:<usuário>`).
- Botões do rodapé: "Cancelar" e "Cadastrar" ("Salvando…").
- Link "← Parceiros".

**Respostas** (cartão no topo):
- `criado`: "✓ Parceiro cadastrado" com uma das frases:
  - "Fica com você. Registre a primeira interação."
  - "Foi para a roleta e ficou com X." (quando o cadastrante não é gerente, ou seja, o gerente geral)
  - "Nenhum gerente ativo para receber agora: a rotina diária distribui."
  - Reenvio: "Abra a ficha para registrar a primeira interação."
  - Mais o link "Abrir a ficha".
- `ja_cadastrado`: "✕ Já é parceiro de X" com "Não foi cadastrado. X recebeu um aviso de que o parceiro procurou a MBigucci de novo." O formulário fica como está.
- `seu`: "! Já é seu parceiro", "Nada foi cadastrado de novo." e "Abrir a ficha".

**Erros do banco** (`erroDeParceiro`):
- Região fora da lista: "Uma das regiões não está mais na lista. Recarregue a página e escolha de novo."
- "Confira os dados: nome e WhatsApp ou CRECI válidos."
- "Esse WhatsApp já é de outro parceiro."
- "Esse CRECI já é de outro parceiro."
- "Preencha o WhatsApp ou o CRECI."

#### `/parceiros/ficha/?id=` (`app/parceiros/ficha/page.tsx`)

**Rota e objetivo.** Ficha do parceiro: contato, prazo de 90 dias, registrar interação e linha do tempo. Permissão: a mesma de `/parceiros/` (`ComPermissao`). Quem edita e registra é só o dono (`meu`).

**Peças**
- **Cabeçalho:**
  - Eyebrow "Parceiro · Imobiliária" ou "Parceiro · Autônomo".
  - Nome, "Empresa (ou Autônomo) · CRECI".
  - "Gerente: você / X / outro gerente / sem gerente" (só para `ver_todos`).
  - Trilha de estágio.
- **Cartão "Atenção"** (quando há reentrada): "! X procurou a MBigucci de novo em dd/mm/aaaa. Continua com você. Registre uma interação para reiniciar os 90 dias." Para outro gerente: "Continua com o gerente atual, que recebeu o aviso."
- **Cartão "Prazo":**
  - "✓/!/✕ n dias sem interação (ou desde que recebeu) · limite 90".
  - Barra de progresso.
  - "Faltam n dias para o parceiro passar a outro gerente." Ou: "Passou dos 90 dias: o parceiro vai para outro gerente na próxima rotina."
  - Nota: "Editar o cadastro não reinicia o prazo. Só registrar interação."
- **Cartão "Contato"** (lista de Item): WhatsApp (formatado), CRECI, E-mail (link `mailto:`), Empresa ("Autônomo" se vazio) e Região. Vazios: "Não informado" e "Não informada". Botões "Abrir WhatsApp" (nova aba) e "Editar" (só o dono).
- **Editar cadastro:** formulário de `CamposCadastro`. Nota "Editar não reinicia os 90 dias." Botões "Cancelar" e "Salvar". Depois: "✓ Cadastro salvo. O prazo dos 90 dias não mudou." Sem linha afetada: "Não foi salvo: este parceiro mudou de gerente ou você não tem mais acesso a ele. Recarregue a página."
- **"Registrar interação"** (só o dono, e fora da edição): o formulário da seção 4.1. Depois: "✓ Interação registrada. O prazo dos 90 dias recomeçou."
- **"Linha do tempo":**
  - Contador "n registros".
  - Item "Próximo contato" com a data.
  - Interações (tipo, data, resumo, "Dia do evento", "Próximo contato marcado", "Por X").
  - Histórico (de gerente para gerente).
  - Títulos do histórico, vindos do SQL:
    - "Cadastrou-se pelo link", "Cadastrado no estande", "Cadastrado à mão";
    - "Ficou com quem cadastrou", "Procurou o gerente no estande", "Mudou de gerente", "Recebido pela roleta";
    - "Outro gerente tentou cadastrar", "Procurou a empresa de novo";
    - "Saiu do gerente por 90 dias sem interação", "Gerente desativado: foi para outro gerente".
  - Subtítulos: "Pelo link", "Pelo estande", "Troca de gerente", "Sem interação desde dd/mm/aaaa".
- Nota final: "Indicações e clientes indicados aparecem aqui quando o lead tiver a origem Parceiro."

**Estados**
- Sem `id`: "Parceiro não informado. Volte para a lista."
- Não encontrado: "Parceiro não encontrado — O parceiro pode ter passado para outro gerente pela regra dos 90 dias, ou o link está errado." com o link "Voltar para Parceiros".
- Carregando: "Carregando…".
- Erro: `✕ <erro>`.

**Celular:** coluna única. No PC são duas colunas (dados e prazo à esquerda, registrar e linha do tempo à direita).

#### `/parceiros/evento/` (`app/parceiros/evento/page.tsx`)

**Rota e objetivo.** Registrar um evento em lote (café no decorado, convenção). Grava uma interação "Evento" para cada parceiro marcado, o que reinicia os 90 dias de cada um. Permissão: `parceiros.cadastrar`. Sem ela: "! Seu perfil vê os parceiros, mas não registra eventos." Só os próprios parceiros aparecem.

**Peças**
- Texto de abertura: "Um registro para cada parceiro que foi ao evento. Reinicia os 90 dias de cada um."
- **Campos:**
  - "O que foi": `textarea`, obrigatório, máx. 2000, placeholder "Ex.: Café no decorado do Residencial Aurora".
  - "Dia do evento": `type=date`, entre hoje e 30 dias atrás. Erro "O dia do evento vai de hoje até 30 dias atrás."
- **Cartão "Quem foi":**
  - Contador "n de n".
  - Campo "Buscar" e botão "Marcar todos" (ou "Marcar os encontrados" com busca, ou "Desmarcar todos").
  - Lista de caixas de seleção, cada uma com nome, subtítulo e selo de prazo.
  - Erro "Marque pelo menos um parceiro."
- **Botão do rodapé:** "Registrar para n parceiros" (sem marcados: "Registrar evento").
- **Confirmação:** "✓ Evento registrado para n parceiros".
- Rascunho no aparelho (chave `parceiro-evento:<usuário>`). Id do lote gerado no aparelho.
- Não pede confirmação antes de gravar.
- Vazio: "Você ainda não tem parceiros." Carregando: "Carregando…".
- Celular: rodapé fixo.

#### `/fila/` (`app/fila/page.tsx`) e `/fila/como/` (`app/fila/como/page.tsx`)

**Rota e objetivo.** Mostrar a fila de distribuição automática de leads da empresa. A visão muda por quem lê, e a `Casca` não exige permissão. A decisão está em `Fila_`:
- gerente geral: `FilaGerente geral`;
- corretor que recebe (`estado.recebe`): `FilaCorretor`;
- os demais (gerente com equipe): `FilaGerente`.

No menu, "Fila de leads" só aparece com a distribuição ligada e se for corretor com fila visível (chave `transparencia`), gerente com equipe ou gerente geral.

##### Visão do corretor
- **Escopo:** selo "Sua equipe · Equipe X" ou "Empresa toda" (modo direto).
- **Linha "Você":** "Você: 3º · na média" (a faixa só com os pesos ligados; no escopo empresa "3º de 12"; sem posição, "fora da fila").
- **Link** "Como é calculado".
- **Card "A fila agora":** posição (ordinal), nome ("Você" para o próprio) e sinal curto. No escopo empresa mostra a equipe e a lista é recortada: começo, "… n corretores" e a vizinhança de quem lê. Quem está fora da fila vem no fim com "–". Vazio: "Ninguém na fila agora." Rodapé: "Última: X, 9h40".
- **Card "Hoje":** linhas com hora que expandem num toque ("Toque numa linha para ver o motivo."). Vazio: "Nenhuma vez hoje ainda." Linhas:
  - "✓ Recebeu <lead>". Detalhe: "Era a sua vez na fila." ou "Atribuído à mão. Contou como a sua vez."
  - "→ Pulado: <motivo curto>". Detalhe: motivo longo mais "Você manteve a posição."
  - "! Fim da fila: prazo". Detalhe: "O lead X passou dos 15 min sem atendimento. Você foi ao fim da fila."
- **Modo só gerentes:** "No modo só gerentes, o gerente da equipe repassa os leads. Não há fila de corretores."
- **Atualização:** lida de novo a cada 60 s com a página visível.

##### Visão do gerente e do gerente geral
- **Escopo:** selo com "Modo: equipe e depois corretor" (ou o modo atual). O gerente geral escolhe a "Equipe" num select, quando há mais de uma.
- **Fila agora** (modos equipe e direto):
  - Resumo "5 aptos · 2 fora · 1 pausa · 1 desligado". Se for escopo empresa e não for o gerente geral, aviso "Créditos e motivos só da sua equipe."
  - Tabela (a partir de `md`) com colunas Pos., Corretor, Situação, Desempenho, Créditos, Hoje e "…". O corretor mostra a etiqueta "não atende n".
  - No celular vira lista com a faixa, os créditos e os recebidos hoje na linha.
  - Corretor de fora da equipe aparece sem detalhe.
- **Menu "…" do corretor** (`MenuCorretor`, uma Folha, não pede confirmação): "Pausar" ou "Voltar a receber", "Tirar da distribuição" ou "Pôr na distribuição", link "Como é calculado" e, com a permissão `distribuicao.produtos`, o link "Produtos e participação".
- **Modo só gerentes:** card "Leads esperando repasse", com nome, produto, "! n min" e o botão "Repassar". Esse botão abre `EscolherCorretor` com o título "Repassar <nome>" (lista "Atribuir →"). Vazio: "Nenhum lead esperando repasse."
- **Card "Última decisão · 9h40":** título tipo "Lucas F. · Easy → ✓ Felipa" e linha "Pulados: X (motivo), …". O botão "Todas" ou "Só a última" alterna. Vazio: "Nenhuma decisão hoje."
- **Card "Equipes"** (só o gerente geral): "1º Equipe — último 9h40", com o selo "Empresa toda".

##### `/fila/como/` ("Como é calculado")
- Aceita `?c=<corretor>&n=<nome>` (o gerente lê o de alguém). Sem isso, mostra o próprio.
- Card com a faixa ("Acima da média", "Na média" ou "Abaixo da média") e os parágrafos (`textoComoCalculado`):
  - "Nota do CRM: …", "Nota do plantão: …", "Cada nota vale metade. No total … (até 10% acima ou abaixo é na média). Recalculado toda segunda." e "Este cálculo não muda seus pontos nem sua verba."
  - Sem pesos: "Hoje todos recebem na mesma proporção, sem desempenho."
  - Sem cálculo: "O cálculo sai toda segunda. Até lá, você fica na média."
  - Conta nova: "Com menos de 30 dias de conta, você fica na média. Recalculado toda segunda."
- Card "Como a fila anda", com 3 textos fixos (créditos, pulos que mantêm a posição e fim da fila após 15 min).
- Link "Fila de leads".

**Estados:** "Carregando…" e `✕ <erro>`. No `/fila/` o erro de permissão vem do banco:
- "A fila não está visível."
- "Você não vê a fila."
- "Entre de novo."

**Celular:** a tabela do gerente some (abaixo de `md`) e entra a lista. O corretor tem coluna única (máx. 640 px).

#### `/distribuicao/` (`app/distribuicao/page.tsx`)

**Rota e objetivo.** Chaves da distribuição automática, só do gerente geral (`soGerenteGeral`, mais `is_gerente_geral()` no banco). Fica fora das permissões do catálogo, é regra fixa.

**Peças**
- **Card principal:**
  - Título "✓ Ligada desde 9h" (ou "desde 05/11") ou "– Desligada". O texto muda: "A roleta escolhe quem recebe o lead da empresa." / "Todo lead da entrada vai para A distribuir."
  - Interruptor (`role=switch`) "Distribuição automática".
  - Desligar pede confirmação: "Desligar? Todo lead da entrada vai para A distribuir e é atribuído à mão." Botões "Desligar" e "Cancelar". Ligar é direto.
  - Seletor de Modo (radiogroup): "Equipe e depois corretor", "Direto ao corretor" e "Só gerentes".
- **Card "Principais"**, 4 chaves com interruptor: "Peso por desempenho", "Exigir check-in no horário", "Redistribuição pelo prazo" e "Plantão fora do horário".
- **"Avançadas (8)"**, expansível. Cada chave com interruptor: "Sinal de localização" (cinza e "Só vale com o check-in ligado" se o check-in está desligado), "Represar quando não há ninguém", "Produtos que o corretor atende", "Prazo estourado manda ao fim da fila", "Lead repetido vai ao dono", "Atribuição à mão conta como vez" e "Fila visível para o corretor". Mais a linha "Histórico das mudanças" (botão Ver ou Fechar), com a lista "12/11 9h Nome da chave: ligada → desligada · quem". Vazio: "Nenhuma mudança ainda."
- **Cada chave** expande no nome com "Ligada: …" e "Desligada: …" (textos em `SOBRE_CHAVE`, `lib/distribuicao.ts`). Nota: "Toque no nome de uma chave para ver o que acontece ligada e desligada."
- **Card "A distribuir · n":**
  - Lista com nome, "represado, " e motivo, e o botão "Atribuir" (abre `EscolherCorretor` "Atribuir <nome>").
  - "Abrir" ou "Menos" quando há mais de 5.
  - Botão "Mandar todos à distribuição" (só com a distribuição ligada e leads vindos da entrada). Resposta: "✓ n lead distribuído/leads distribuídos."
  - Vazio: "Nenhum lead esperando."
  - Motivos curtos: "ninguém sobrando", "distribuição desligada", "ninguém apto agora", "até a abertura", "sem dono".
- **Card "Equipes"** (vez entre equipes): ordinal, nome e "último 9h40". Vazio: "Nenhuma equipe."
- O `EscolherCorretor` (`comp/distribuicao/partes.tsx`) é uma Folha com lista de corretores ativos: "Atribuir →" e "Atribuindo…". Carregando: "Carregando…". Vazio: "Nenhum corretor ativo." Com `equipe`, restringe à equipe (repasse do gerente).

**Estados:** "Carregando…" e `✕ <erro>`. Salvar chave mostra "Salvando…" no interruptor. No celular o layout é de uma coluna (duas a partir de `lg`).

#### `/equipes/corretor/?id=` (`app/equipes/corretor/page.tsx`)

**Rota e objetivo.** Configurar a distribuição de um corretor: produtos que atende e "Na distribuição". Exige `distribuicao.produtos` (padrão gerente e operacional). O banco confere a equipe.

**Peças**
- Link "Fila de leads", eyebrow "Configuração" e o nome. Aviso: "! Sem equipe: não entra na distribuição."
- **Card "Produtos que atende"** (some se a chave `produtos` está desligada):
  - Cada empreendimento é um checkbox: "✓ atende" ou "– não".
  - Resumo "Todos", "Todos menos n", "n de n" ou "Nenhum".
  - Botão "Salvar" ("Salvando…"). Depois: "✓ Produtos salvos."
  - Vazio: "Nenhum empreendimento ativo no catálogo."
- **Card "Na distribuição":** botões Sim e Não (RPC `distribuicao_participa`). Não pede confirmação.

**Estados:** sem `id`, "✕ Corretor não informado. Abra pela Fila de leads ou por Equipes."; "Carregando…" (também no `Suspense`); `✕ <erro>`. No celular é uma coluna (máx. 560 px).

#### Peças de cabeçalho (`comp/distribuicao/recebimento.tsx`)

Estão na `Casca`, então valem para todas as telas do app. Só aparecem para o corretor elegível (perfil com `distribuicao.receber`, ativo, com equipe) e com a distribuição ligada. No modo só gerentes, o botão some.

- **`BotaoRecebimento`:** botão de estado com glifo (cores por tom red/ok/wa/neutro) que abre a folha. Ao lado, a posição "3º na fila" (no celular abaixo de 640 px só "3º"), que abre a folha da fila. A posição só aparece com a chave `transparencia` ligada.
- **`LinhaDoStand`:** só na Lista do dia (`comp/leads/lista-do-dia.tsx`). "Marco Zero · check-in 9h04 · Opções".
- **Folha "estado"** (`FolhaEstado`):
  - Título: "Receber leads da empresa" ou "<stand> · check-in 9h04" ou o rótulo do botão sem glifo.
  - Uma linha de explicação, o `AvisoLocal` (só no primeiro check-in) e botões em grade de 2. O primeiro é o principal.
  - Pausar abre um campo "Volta em (opcional)" (`type=date`) e botões "Pausar" e "Voltar".
  - Check-in em andamento: "Lendo a localização…". Depois do check-in certo, a folha mostra o resultado e o botão "Fechar".
- **Folha "primeira"** (`FolhaPrimeiraVez`): "Receber leads da empresa hoje", uma vez por dia (`localStorage`, chave `mbigucci-distribuicao-dia-AAAA-MM-DD`). Dois textos:
  - Com check-in: "Faça o check-in no stand. Depois, o botão fica no topo da tela para ligar e desligar." Botão "Fazer check-in".
  - Sem check-in: "Ligue o botão no topo da tela para receber. Ele fica ali para ligar e desligar." Botão "Receber leads".
  - Botão "Agora não". Só abre com situação desligado ou sem check-in.
- **Folha "saida"** (`FolhaSaida`): "Saiu do stand?" / "Fora do stand você não recebe e mantém o lugar." Botões "Saí" e "Estou no stand". Abre sozinha quando o sinal acusa "fora do raio" (campo `perguntar_saida`).
- **Folha "fila"** (`FolhaFila`): título "Fila de leads", eyebrow com o escopo, até 4 primeiros, "Última: X, 9h40" e o link "Ver tudo".
- **Aviso de localização:** "O Vendas usa sua localização só com o check-in aberto, para saber se você está no stand. Não guarda o ponto no mapa." Aparece só no primeiro check-in (`mbigucci-distribuicao-aviso-local`).

**Ações do corretor** (`executar` em `lib/distribuicao-dados.ts`):

| Ação | RPC | Rótulo |
|---|---|---|
| checkin | `distribuicao_checkin` (liga o recebimento antes, se desligado) | "Fazer check-in" |
| ligar | `distribuicao_receber(true)` | "Receber leads" |
| desligar | `distribuicao_receber(false)` | "Parar de receber" |
| visita_sair | `distribuicao_visita(true)` | "Saí para visita" |
| visita_voltar | `distribuicao_visita(false)` | "Voltei" |
| checkout | `distribuicao_checkout` (nunca depende do GPS) | "Check-out" |
| pausar | `distribuicao_pausar` (a data vai às 8h de São Paulo) | "Pausar" |
| voltar | `distribuicao_voltar` | "Voltar a receber" |

Nenhuma pede confirmação. A falha mostra `✕ <erro>` na folha.

**Resultados do check-in** (`textoCheckin`):
- dentro: "✓ Check-in no <stand>, 9h04"
- fora: "! A 480 m do stand. Chegue mais perto."
- bloqueada: "! Localização bloqueada. Libere no navegador."
- aguarde: "! Aguarde alguns segundos e tente de novo."
- sem_stand: "! Nenhum stand com localização cadastrada. Avise o gerente geral."
- incerto: "! Localização imprecisa. Tente num lugar aberto."

O "aguarde" vem do banco: bloqueio de 20 s entre tentativas.

**Sinal e "app aberto"** (sem tela):
- A cada 10 min (`INTERVALO_SINAL_MS`), só com a página visível, o app manda a posição com check-in aberto e as chaves `exigir_checkin` e `sinal`.
- Sem sinal de localização, manda "app aberto". Voltando à página, só manda de novo depois de 1 min.
- O estado é lido a cada 1 min e a configuração a cada 5 min.

### 2.4 Plataforma: entrar, conta, usuários, equipes e configurações

#### `layout.tsx`
- Raiz do app: `<html lang="pt-BR">`, título "Base360", `robots` noindex, manifesto PWA (`${BASE_PATH}/manifest.webmanifest`), ícones e `appleWebApp` (capable).
- Injeta no `<head>` dois scripts inline: `scriptAparencia` e `scriptBarra`. Eles aplicam tema e estado da barra antes do conteúdo, sem pulo de layout.
- Envolve tudo em `SessaoProvider`.
- Não há rodapé nem região global além do que a `Casca` e o `Cabecalho` montam.

#### `/entrar/` (`entrar/page.tsx`)
- **Objetivo:** login por e-mail e senha. Usa qualquer pessoa sem sessão.
- **Peças:** um `<form class="card bar-brand">` com eyebrow "Base360", título "Entrar" e campos:
  - `E-mail` (`type=email`, `autoComplete=username`, `inputMode=email`);
  - `Senha` (`type=password`, `autoComplete=current-password`);
  - botão "Entrar" (largo, `btn-red btn-lg`);
  - texto: "Não tem acesso ou esqueceu a senha? Fale com o gerente geral.";
  - logo MBigucci abaixo do formulário.
- **Ações:** `signInWithPassword`. Nenhuma confirmação. Com sessão pronta ou conta desativada, redireciona para `/`.
- **Validação (zod):** "Informe um e-mail válido." e "Informe a senha."
- **Estados:**
  - enviando: botão "Entrando…" desabilitado;
  - erro: `<p role="alert" class="aviso-erro">! {texto}</p>`; credencial errada vira "E-mail ou senha incorretos."; demais erros passam por `mensagemErro`;
  - sem configuração: cartão "! Supabase não configurado" (seção 2.7);
  - não há estado "sem permissão" nem "carregando" próprio.
- **Celular:** coluna única de largura máxima 440px (`max-w-[440px] px-5`). O cabeçalho mostra só o logo, sem menu.

#### `/conta/` (Minha conta, `conta/page.tsx`)
- **Objetivo:** dados da própria pessoa, WhatsApp, aparência, avisos no celular, troca de senha e instruções de instalação do app. Qualquer perfil ativo usa. `Casca` sem `exige`.
- **Cartões, em ordem:**
  1. **Identidade** (somente leitura): eyebrow com o perfil (`nomePerfil`), nome e e-mail.
  2. **Seu WhatsApp** (`bar-brand`). Texto: "Seu gerente usa este número para avisar quando você recebe um lead." Campo `WhatsApp` (`type=tel`, placeholder `(11) 98765-4321`), desabilitado até carregar. Botão "Salvar WhatsApp". Grava pela RPC `salvar_meu_whatsapp`.
  3. **Aparência**, com um `<select>` (seção 2.5).
  4. **Avisos neste aparelho** (seção 2.6).
  5. **Trocar senha:** `Nova senha` e `Repita a nova senha` (ambos `type=password`, `autoComplete=new-password`). Botão "Trocar senha" (secundário). Usa `auth.updateUser`.
  6. **Instalar no celular:** texto fixo. Android: "Instalar app" ou "Adicionar à tela inicial". iPhone: "Compartilhar > Adicionar à Tela de Início".
- **Confirmação:** nenhuma.
- **Mensagens:**
  - senha: "A senha precisa ter ao menos 8 caracteres." e "As duas senhas não são iguais."; sucesso "✓ Senha trocada.";
  - WhatsApp: "Confira o WhatsApp: DDD e número, como (11) 98765-4321."; sucesso "✓ WhatsApp salvo." ou "✓ WhatsApp apagado." (campo vazio apaga);
  - erro de gravação: `mensagemErro`.
- **Estados:** botões mudam para "Salvando…". Não há vazio nem erro de carga próprios.
- **Celular:** coluna única (`max-w-[520px]`, `gap-4`). No computador, "Minha conta" fica no menu da conta do cabeçalho; no celular, no fim do menu.

#### `/usuarios/` (`usuarios/page.tsx`)
- **Objetivo:** cadastrar contas e editar perfil, equipe, situação e dados de contato. `exige="usuarios.gerenciar"`. No padrão, só o gerente geral usa, que tem todas as permissões.
- **Barra superior:**
  - `Buscar` (placeholder "Nome ou e-mail");
  - `Perfil` (`select`): "Todos", cada perfil, "Desativados";
  - botão "Novo usuário", que esconde a si mesmo enquanto o formulário está aberto.
- **Lista:** cada usuário é um cartão com nome (e "· apelido"), e-mail, WhatsApp formatado e selos: perfil, equipe e "✓ Ativo" ou "– Desativado". Botão "Editar", escondido se o alvo é gerente geral e quem edita não é.
- **Formulário "Novo usuário"** (`bar-brand`, inline no topo):

| Campo | Tipo | Regra |
|---|---|---|
| Nome | texto | obrigatório |
| E-mail | email | válido; vira minúsculas |
| Senha provisória | **`type=text`** (visível) | mínimo 8 |
| Perfil | select | só o gerente geral enxerga a opção "Gerente geral" |
| Equipe | select | aparece só para perfis que têm equipe; "Sem equipe" é a primeira opção |

  - Botões: "Criar conta" e "Cancelar".
  - Corretor sem equipe: "Corretor precisa de uma equipe."
  - Chama a Edge Function `usuarios-admin` (ação `criar`).
- **Formulário "Editando {e-mail}"** (inline, no lugar do cartão):
  - `Nome`;
  - `Perfil`;
  - `Equipe`, para perfis com equipe;
  - `WhatsApp (opcional)`;
  - `Apelido`, obrigatório para corretor ativo; "(opcional)" nos demais; máximo 40; ajuda "Como a recepção chama na vez do stand. Não pode repetir.";
  - `CRECI (opcional)`, máximo 40;
  - caixa `Ativo`: desabilitada na própria conta, com o texto "Você não pode desativar a própria conta."; marcada diz "Desativado, não entra no Base360 Vendas nem vê dados.";
  - botões "Salvar" e "Cancelar";
  - bloco separado "Nova senha provisória" (`text`) com o botão "Redefinir senha".
- **Confirmações:** nenhuma. Desativar, trocar perfil e redefinir senha agem na hora.
- **Mensagens:**
  - Sucesso:
    - criação: "Conta criada para {e-mail}. Passe o e-mail e a senha provisória para a pessoa; ela troca a senha em Minha conta.";
    - edição: "Dados de {nome} salvos.";
    - senha: "✓ Senha redefinida. Passe a nova senha para a pessoa."
  - Erro:
    - "Informe o nome.";
    - "Corretor ativo precisa estar em uma equipe.";
    - "Corretor ativo precisa de apelido.";
    - "A nova senha precisa ter ao menos 8 caracteres.";
    - "Você não tem permissão para alterar este usuário." (update sem linhas);
    - falha da função: "Não foi possível falar com a função usuarios-admin. Confira se ela foi publicada no Supabase (README, passo 3)."
  - Equipe: "Crie as equipes em Equipes." quando não há nenhuma.
- **Estados:** "Carregando…", "Ninguém encontrado." (lista vazia pelos filtros), erro de carga em `aviso-erro`. Sem permissão: o cartão da `Casca`.
- **Celular:** os campos dos formulários passam de 1 para 2 colunas em `md`. Cartão com botão "Editar" à direita.

#### `/equipes/` (`equipes/page.tsx`)
- **Objetivo:** criar equipes, escolher o gerente, editar e excluir. `exige="equipes.gerenciar"`.
- **Texto de abertura:** "Cada equipe tem um gerente, que acompanha os corretores dela e não vende. Cada corretor fica em uma só equipe; a equipe do corretor é escolhida em Usuários."
- **Peças:**
  - botão "Nova equipe";
  - grade de cartões (2 colunas em `md`): nome, "Gerente: …", eyebrow "N pessoa(s)", lista de membros com "(desativado)";
  - para corretor ativo, link "Distribuição" para `/equipes/corretor/?id=…`. Só aparece com `distribuicao.produtos` e a distribuição instalada;
  - formulário `FormEquipe`: `Nome` e `Gerente` (select com "Escolha", mais "(desativado)" quando for o caso). Ajuda "Cadastre primeiro um usuário com o perfil Gerente."
- **Ações:** "Salvar", "Cancelar", "Excluir". **Exclusão tem confirmação em dois passos:** "Excluir" vira "✕ Confirmar exclusão". Com membros, no lugar aparece o texto "Para excluir, mova as pessoas antes."
- **Erros:** "Informe o nome da equipe.", "Escolha o gerente.", e os do banco (`mensagemErro`): "Já existe uma equipe com esse nome.", "A equipe ainda tem pessoas. Mova-as para outra equipe antes de excluir."
- **Estados:** "Carregando…", "Nenhuma equipe ainda.", erro em `aviso-erro`.
- **Celular:** a grade vira 1 coluna.

#### `/configuracoes/` (`configuracoes/page.tsx`)
- **Objetivo:** configuração do sistema. `soGerenteGeral` (regra de perfil na tela; o banco também restringe por RLS).
- **Seções, em ordem:**
  1. **Atalho de Distribuição automática.** Cartão-link que só existe se a distribuição estiver instalada. Mostra "✓ Ligada" ou "– Desligada" e o modo: "equipe e depois corretor", "direto ao corretor" ou "só gerentes".
  2. **Horário de atendimento** (tabela `horario_atendimento`).
     - Texto: "Todo lead da empresa tem 15 min para o primeiro contato, contados só neste horário. Fora dele, o prazo começa na abertura seguinte."
     - Dias: sete botões Dom a Sáb, alternáveis (`aria-pressed`).
     - `Abre às` e `Fecha às` (`type=time`).
     - Botão "Salvar horário"; mostra "Alterado em {data}".
     - Erros: "Escolha pelo menos um dia.", "O fim precisa ser depois do início.", "Rode o schema.sql atualizado no Supabase antes de salvar o horário."
     - Sucesso: "✓ Horário salvo. Vale no próximo acesso de cada corretor."
  3. **Mensagens prontas do WhatsApp** (`ConfigMensagens`, `components/config-mensagens.tsx`).
     - Lista de modelos com selo "✓ Ligada" ou "– Desligada" e "Sugerida: etapas…".
     - "+ Nova mensagem".
     - Editor inline: `Nome`, `Ordem` (número), `Texto` (textarea) e prévia com lead de exemplo ("Ana Paula Souza", "Marco Zero One").
     - Grupo "Sugerir nas etapas" (caixas, tiradas do catálogo de etapas).
     - Caixas "Sugerir quando o lead está há 2 dias ou mais sem contato" e "Ligada".
     - Botões "Salvar mensagem" e "Cancelar".
     - Variáveis aceitas (`lib/mensagens.ts:23`): `{primeiro_nome}`, `{nome}`, `{empreendimento}`, `{corretor}`, `{visita}`, `{endereco}`, `{apresentacao}`, `{a_partir_de}`.
     - Erros: "Dê um nome para a mensagem.", "Escreva o texto da mensagem.", "Troque ou apague: {x}.", "Não existe: {x}".
     - Sucesso: `Mensagem "…" salva. Vale no próximo acesso de cada pessoa.` e "Mensagem criada. Vale no próximo acesso de cada pessoa."
  4. **Permissões por perfil.**
     - Texto: "O gerente geral tem todas as permissões. Qualquer usuário ativo sempre vê os próprios dados. As mudanças valem no próximo acesso de cada pessoa."
     - Um cartão por perfil, exceto gerente geral, cada um com **uma caixa por permissão do catálogo** (rótulo = `descricao`).
     - **Cada clique grava na hora** (`insert` ou `delete` em `role_permissions`), sem botão salvar e sem confirmação. Todas as caixas ficam desabilitadas durante a gravação.
- **Estados:** "Carregando…" em cada seção, erro em `aviso-erro`.
- **Celular:** as Permissões ficam em 1 coluna e passam a 2 em `md`. Os botões de dia têm `py-2` sem `.opcao`, portanto menos que 44px de alvo (improvisado, seção 7).

### 2.5 Base360 Marketing

#### Casca e telas auxiliares
- A `Casca`, o `Cabecalho`, a barra lateral, o menu do celular, o aviso de conexão e a aparência são **cópias** das do Vendas, trocando o logo por "Base360 · Marketing". Não há `extra` (botão de recebimento).
- **Menu:** um item só, "Direcionador" (`/direcionador/`, ícone próprio), visível se `ehGerenteGeral`. Perfis não têm permissões configuráveis aqui: a sessão só distingue "gerente geral" ou não. O banco decide de verdade pelo `is_gerente_geral()` de cada função `cfg_*`.
- **`/` (Início):** o gerente geral é redirecionado para `/direcionador/`. Os demais veem: "O Marketing ainda não tem telas para o seu perfil. Volte ao Base360 Vendas pelo endereço de sempre."
- **`/entrar/`:** idêntico ao do Vendas.
- **`/conta/`:** cartão com nome, e-mail e "Senha, dados e avisos no celular ficam em Minha conta do Base360 Vendas." mais a escolha de Aparência. **Sem troca de senha, sem WhatsApp e sem avisos** (sem `sw.js`).
- `Casca` aceita `eyebrow` e `acao` (botão ao lado do título no computador).

#### Direcionador (`/direcionador/`, só gerente geral)
- **Objetivo:** decidir para onde vai cada lead que chega por e-mail, por regras (produto, fonte, dia, horário) com divisão em porcentagem e limite diário por destino.
- **Título "Direcionador de leads"**, eyebrow "Só o gerente geral vê". Texto: "A primeira regra ligada que casar decide para onde vai o lead. Sem regra, ele vai para o Base360 Vendas."
- **Layout:** no computador, duas colunas (regras e chave à esquerda; simulador e destinos à direita, `lg:grid-cols-[1.55fr_1fr]`). No celular, uma coluna; o botão **"+ Nova regra"** vira barra fixa no rodapé.
- **Cartão "Chave geral / Direcionador":** interruptor `role="switch"` ("✓ Ligado" ou "– Desligado").
  - Ligado: "As regras abaixo valem a cada lead que chega."
  - Desligado: "Tudo vai para o Base360 Vendas. As regras ficam guardadas, sem valer."
  - Avisos ao alternar: "✓ Direcionador ligado" e "– Direcionador desligado. Tudo vai para o Vendas".
- **Lista "Regras"** (eyebrow "Na ordem em que são lidas"), numerada. Cada regra mostra: nome; Produto ("Qualquer" ou lista); Fonte (idem); Quando ("Todos os dias", "Seg a sex", "Sáb e dom" ou dias; "Dia inteiro" ou "9h às 18h", com "do dia seguinte" se vira a meia-noite); destino ("→ Nome" ou "→ 70% A · 30% Base360 Vendas"); e, com mais de uma parte, "Enviados desde que a regra foi salva: N Nome · …". Controles por regra: interruptor "Ligada/Desligada", botões "Subir", "Descer" e "Editar". Regra desligada ou com chave geral desligada aparece apagada.
  - Vazio: "Nenhuma regra. Tudo vai para o Base360 Vendas. Toque em + Nova regra para mandar um tipo de lead para outro destino."
  - Rodapé fixo da lista: "Nenhuma regra casou, ou a entrega a um destino falhou: → Base360 Vendas, pela roleta do lead da empresa."
- **Editor de regra** (`<dialog>` nativo, "Criar regra" ou "Editar regra", eyebrow "Nova regra" ou "Regra N"):
  - `Nome da regra` (máx. 80, ex.: "Fim de semana, portais");
  - **Produto:** chips "Qualquer produto" + um por empreendimento ativo do catálogo. Nota: "Produto não reconhecido só casa com Qualquer produto.";
  - **Fonte:** chips "Qualquer fonte" + fontes cadastradas;
  - **Dias:** chips Dom a Sáb (padrão todos);
  - **Horário:** `Das`, `Até` (`type=time`) e chip "Dia inteiro". Avisos: "Vale das 0h às 24h dos dias marcados.", "A hora de fim não entra: até 18h vale até 17h59." e "Vira a meia-noite: vale das X do dia marcado até as Y do dia seguinte.";
  - **Mandar para, em %:** uma linha por destino (inclusive o Base360 Vendas) com campo numérico 0 a 100, passo 5, e a soma ao vivo: "✓ Soma 100%." ou "! Soma N%. Ajuste para 100.";
  - chip "Regra ligada";
  - botões "Excluir regra" (link de texto), "Cancelar" e "Salvar regra".
  - **Exclusão com confirmação em dois passos:** "Excluir regra" vira "✕ Excluir de vez".
  - **Salvar zera os contadores da regra** (a tela avisa: "Ao salvar, os contadores desta regra voltam a zero.").
  - **Validação** (`validarRegra`): "✕ Dê um nome à regra, para achar na lista.", "✕ Marque pelo menos um dia.", "✕ Preencha as duas horas ou marque Dia inteiro.", "✕ Início e fim iguais. Para valer o dia todo, marque Dia inteiro.", "✕ Cada parte vai de 0% a 100%, sem casas decimais.", "✕ As partes de Mandar para precisam somar 100% (hoje somam N%)."
  - Avisos de sucesso: "✓ Regra salva. Os contadores dela voltaram a zero" e "✓ Regra criada no fim da lista, na posição N".
- **Cartão "Destinos"** (eyebrow "Para onde os leads podem ir"):
  - **Base360 Vendas** sempre presente, não se apaga nem desliga: "Pela roleta do lead da empresa. Hoje: N".
  - Cada **destino externo** mostra: Entrega ("Porta de entrada (POST)" ou "E-mail, sem cópia em Enviados"), Endereço (**mascarado**; "! Sem endereço. Edite para preencher"; para porta, "· chave guardada" ou "· sem chave"), Limite ("Até N leads por dia; o resto vai para o Vendas" ou "Sem limite por dia"), Hoje ("N lead(s) de N") e Registro ("✓ Entra no Marketing, com o envio no histórico do lead" ou "– Não registra nada"). Botão "Editar".
  - "+ Novo destino".
  - Rodapé: "Se a entrega a qualquer destino falhar, o lead vai na hora para o Base360 Vendas, para não ficar sem atendimento."
- **Editor de destino** (`<dialog>`):
  - `Nome` (máx. 80), com a nota "Só você vê este nome. Ele nunca vai no e-mail nem na chamada ao destino.";
  - **Entrega** (duas opções): "E-mail" ("Sai da caixa de entrada, sem cópia em Enviados, com o assunto Novo contato.") ou "Porta de entrada" ("Uma chamada POST por lead, pela especificação da porta de entrada.");
  - **Endereço:** e-mail (`type=email`) ou URL `https://` mais `Chave` (`password`). O endereço guardado volta mascarado; o campo fica vazio e só troca se preenchido. A chave nunca volta à tela. Trocar o tipo de entrega apaga o endereço guardado ("! Trocar a entrega apaga o endereço guardado. Digite o novo.");
  - `Limite por dia` (inteiro > 0; vazio = sem limite). Passou do limite, o resto do dia vai para o Base360 Vendas;
  - chip **"Registrar os envios"** ("✓ Cada lead enviado entra na base de contatos do Marketing, com o envio no histórico." ou "– Nada fica registrado: nem contato, nem evento.");
  - chip "Destino ligado";
  - "Excluir destino" com confirmação em dois passos ("✕ Excluir de vez"). Destino usado em alguma regra não se exclui: "Está em uma regra: tire de lá para excluir."
  - Erros: "✕ Digite o nome do destino.", "✕ O limite por dia é um número inteiro maior que zero, ou vazio para sem limite.", "✕ Digite o e-mail de entrega.", "✕ Digite o endereço e a chave da porta de entrada.", "✕ Digite o endereço da porta, começando com https://."
- **Simulador** ("Teste sem gravar", usa a mesma regra pura da Edge Function e nunca grava): campos Produto (inclui "Produto não reconhecido"), Fonte (inclui "Fonte não reconhecida"), Dia, Hora (`time`), link "Usar agora". Resultado "Um lead do X, de Y, sábado, 10h30, vai para → destino", a razão e a lista dos passos ("1. nome: casou e decidiu." ou "…: outro produto / outra fonte / fora dos dias / fora do horário / produto não reconhecido / fonte não reconhecida / desligada" ou "não lida"). Textos extras: "A chave geral está desligada.", "Nenhuma regra ligada casou.", "O destino da vez já passou do limite de hoje, então este vai para o Vendas.", "Nenhum destino da regra está ligado, então vai para o Vendas."
- **Comportamento da regra** (`marketing/src/lib/direcionador.ts`, espelhado em `cfg_escolher` no banco):
  - vale a **primeira regra ligada que casar**, na ordem da lista; com a chave geral desligada as regras nem são lidas;
  - produto e fonte vazios = qualquer; dias 0 a 6 (domingo = 0); hora de fim não inclusa; início igual ao fim = dia inteiro;
  - **divisão:** escolhe a parte mais abaixo da sua porcentagem (menor enviados/porcentagem; empate, a ordem da regra). Destino desligado é pulado;
  - **limite do dia** vale só para destino externo. Acima dele, o lead vai para o Base360 Vendas e nada é somado;
  - motivos possíveis: `desligado`, `sem_regra`, `regra_inativa`, `sem_destino`, `limite`, `divisao`;
  - entrega externa que falha: o contador é desfeito e o lead vai ao Vendas.
- **Estados:** "Carregando…"; erro de carga com botão "Tentar de novo" (`✕ {mensagem}`); sem permissão "Seu perfil não tem acesso a esta página."; toast `role="status"` por 3,2 s.
- **Banco:** sem tabelas na API. Tudo pelas RPC `cfg_ler`, `cfg_salvar`, `cfg_item_salvar`, `cfg_item_excluir`, `cfg_item_endereco_salvar`, `cfg_regra_salvar`, `cfg_regra_ligar`, `cfg_regra_ordem`, `cfg_regra_excluir`, cada uma exigindo gerente geral. As tabelas ficam no schema `interno`, e endereços e chaves ficam no Vault (um segredo por destino, nome neutro).
- **Sigilo:** o código e o SQL do direcionador não contêm nome de destino: os nomes vêm do banco, digitados pelo gerente geral. O seed cria só "Base360 Vendas". Na tela e nos logs só aparece "Distribuição manual" se o gerente geral digitar esse nome.

---

## 5. Status, etapas e classificações

Todas as listas, com as palavras do código. As que vêm do banco (etapas, origens, mídias, critérios, faixas) são editáveis por tabela, e a lista aqui é a do seed.

### 5.1 Leads, interações, visitas e perfil do cliente

**Etapas** (`lead_etapas`, schema.sql:521)
- Novo (`novo`)
- Em contato (`em_contato`)
- Visita agendada (`visita_agendada`)
- Visita realizada (`visita_realizada`)
- Proposta (`proposta`)
- Venda (`venda`)
- Aguardando lançamento (`aguardando_lancamento`)

Vêm do banco; o código só mostra as ativas, mais as usadas.

**Temperaturas** (`leads.ts:150`)
- `quente`: "! Quente"
- `morno`: "○ Morno"
- `frio`: "– Frio"
- Sem valor: "Sem temperatura"

**Origens** (`lead_origens`, schema.sql:504)
- Plantão (`plantao`)
- Indicação (`indicacao`)
- Carteira (`carteira`)
- Empresa (gerente) (`empresa`, restrita, é a que tem prazo)
- Redes sociais próprias (`redes_sociais`)
- Anúncio próprio (`anuncio_proprio`, pede campanha)
- Outros (`outros`)

**Tipos de interação**
- Escolhidos pelo corretor: WhatsApp, Ligação, E-mail, Visita, Anotação, e "Sem resposta" (`tentativa`, condicional).
- Automáticos: `mensagem` ("Mensagem original"), `toque_whatsapp` ("Abriu o WhatsApp"), `toque_ligacao` ("Ligou") e `plantao` ("No stand").

**Motivos de descarte** (`leads.ts:157`)
- Sem interesse
- Fora do perfil
- Fora da região
- Contato inválido
- Duplicado
- Sem retorno

**Status do lead:** `ativo` ("Ativos") e `descartado` ("Descartados").

**Status de visita** (`SELOS_VISITA`)
- `agendada`: "→ Agendada"
- `confirmada`: "✓ Confirmada"
- `aguardando_baixa`: "! Aguardando baixa" (estado derivado: visita aberta cujo horário passou)
- `realizada`: "✓ Realizada"
- `nao_compareceu`: "✕ Não compareceu"
- `cancelada`: "✕ Cancelada"

**Grupos da Lista do dia** (`TITULOS_GRUPO`), na ordem
1. "Aguardando primeiro contato"
2. "Detalhe o contato"
3. "Atrasados"
4. "Hoje"
5. "Sem próximo contato"

Regras:
- Primeiro contato: lead da empresa ativo, em `novo`, com dono.
- Detalhe o contato: último registro é toque sem detalhe depois.
- Atrasados: próximo contato com hora já vencida.
- Hoje: até 23:59 de hoje.
- Sem próximo contato: lead ativo sem data marcada.

**Selos de prazo e follow-up**
- Primeiro contato (`seloPrazo`):
  - "! Responder em N min" (correndo, âmbar).
  - "→ Responder até {quando}" (aguardando a abertura; exemplos "9h15", "amanhã, 9h15", "segunda, 9h15").
  - "! Prazo estourado há {duração}" (vermelho; durações "12 min", "1h20", "5h", "3 dias").
- Mensagem nova (`seloResposta`): "Responder até {quando} · mensagem nova".
- Sem contato (`seloSemContato`): "Sem contato há N dias[ · N tentativa(s)]". Âmbar com 2 dias, vermelho com 3 ou mais. Só lead ativo.
- A detalhar: "! Abriu o WhatsApp {hoje, 10:42}" ou "! Ligou …".
- Próximo contato: "Sem próximo contato", "! Atrasado · {quando}", "Hoje, 14:00", "Amanhã, 09:00", "Ontem, 10:30" ou "dd/mm/aaaa, hh:mm".
- Interação do card: "Nenhuma interação registrada."

**Tentativas e prazo (constantes)**
- `DIAS_FOLLOW_UP` = 2.
- `LIMITE_TENTATIVAS` = 3.
- `DIAS_ENTRE_TENTATIVAS` = 2.
- Texto padrão: "Tentei contato, sem retorno."
- `PRAZO_MINUTOS` = 15.
- Horário padrão de atendimento: 9h às 19h, todos os dias (`HORARIO_PADRAO`). Fica na tabela `horario_atendimento`.

**Ordenações da lista** (`ORDENS`): "Próximo contato", "Mais tempo sem contato", "Nome (A a Z)".

**Eventos do histórico** (`lead_eventos.tipo`): `criado`, `etapa`, `temperatura`, `status`, `dono`, `visita`, `visita_horario`, `visita_comprovante`, `venda`, `venda_pagamento`, `venda_correcao`, `documento`, `documento_removido`.

Textos do evento `dono`:
- "Atribuído a X"
- "Distribuído a X"
- "Distribuído a X na abertura"
- "! Prazo estourado. Passado para X"
- "Mensagem nova. Reativado para X"
- "Sem dono: A distribuir"
- "! Lead perdido por X. Passado para Y"

**Selos da prévia do Cadastro Mágico:** "✓ Detectado", "! Conferir", "✕ Não encontrado".

**Listas do perfil do cliente**
- Prazo de compra: Imediato, Até 3 meses, Até 6 meses, Até 12 meses, Sem pressa.
- Forma de pagamento: À vista, Financiamento, Consórcio.
- Renda familiar: Até 3 salários mínimos, De 3 a 6 salários mínimos, De 6 a 10 salários mínimos, De 10 a 20 salários mínimos, Acima de 20 salários mínimos.
- Pronto ou na planta: Pronto para morar, Na planta, Tanto faz.
- Motivo da compra: Primeiro imóvel, Sair do aluguel, Mais espaço, Mudar de região, Investimento, Outro.
- Estado civil: Solteiro(a), Casado(a), União estável, Divorciado(a), Viúvo(a).
- Categorias de documento: RG ou CNH, CPF, Comprovante de residência, Comprovante de renda, Imposto de Renda, Certidão de estado civil, Outro.

### 5.2 Vendas, metas, pontos, faixas e catálogo

**Situações de venda.**
- Status (`StatusVenda`): `ativa`, `cancelada`. Pagamento (`PagamentoVenda`): `pendente`, `pago`.
- Selo na tela: "✕ Cancelada", "✓ Paga em dd/mm/aaaa", "! Pagamento pendente".
- Blocos de totais: "Assinado e pago", "Assinado, com pendentes", "Pagamento pendente".
- Eventos de histórico: "✓ Venda registrada: …", "✓ Venda paga", "! Pagamento da venda voltou para pendente", "✕ Venda cancelada. Motivo: …", "Venda reativada", "Venda corrigida: … → …" (os campos são Empreendimento, Unidade, VGV, Assinatura, Pagamento e Observação).
- Valor válido (que conta na meta, nos pontos e nos prêmios) = `status == ativa` e `pagamento == pago`.

**Lançamentos de pontos.**
- Status (`STATUS_LANCAMENTO`, sinal e nome): `pendente` "! Pendente", `aprovado` "✓ Aprovado", `recusado` "✕ Recusado", `cancelado` "– Cancelado".
- Critérios (`SlugCriterio`): `periodo` "Período integral cumprido" (5 pts, limite 24), `video` "Vídeo com a marca MBigucci" (5 pts, limite 8), `visita` "Visita realizada" (10 pts, limite 12). São editáveis pelo gerente geral. A visita entra sozinha pela baixa e não é lançada no plantão.
- Turnos (`TURNOS`): `manha` "Manhã 9h–14h", `tarde` "Tarde 14h–19h".
- Regras fixas (`REGRAS`): R$ 10 por ponto, mínimo 130, teto sem venda 200, teto com venda 280, R$ 1.000 por venda paga.
- Situação da verba (`SituacaoVerba`): `abaixo_do_minimo`, `sem_venda`, `com_venda`.
- Roleta (`ROLETA`): 6 períodos aprovados de segunda a sexta (5 dias).
- Constraints traduzidas:
  - "Esse período já está marcado para o corretor."
  - "Cole o link da foto da saída para visita."
  - "O comprovante precisa ser um link que começa com https://."
  - "Escreva o motivo da recusa."

**Faixas de VGV.** Não são enum. Ficam na tabela `faixas_vgv` (colunas `vgv_minimo` e `valor`), editável só pelo gerente geral. O seed é 1.000.000 → 2.000; 1.500.000 → 3.000; 2.000.000 → 5.000; 3.000.000 → 10.000. A faixa mais alta atingida vale (não acumula).

**Tipos de meta.**
- Métricas (`METRICAS`, slug, nome e dica):
  - `leads` "Leads cadastrados" ("Leads que você cadastrou")
  - `contatos` "Primeiros contatos" ("Leads que saíram de Novo com você")
  - `visitas` "Visitas realizadas" ("Visitas com baixa de realizada, pela data da visita")
  - `vendas` "Vendas" ("Vendas assinadas e pagas, no mês da assinatura")
  - `vgv` "VGV" ("VGV das vendas assinadas e pagas, no mês da assinatura")
- Períodos (`PERIODOS_META`): `mes` "Mensal", `trimestre` "Trimestral", `semestre` "Semestral", `ano` "Anual", `personalizado` "Personalizado" (de 1 a 24 meses).
- Origem da meta anual (`OrigemMeta`): `corretor`, `geral`, `padrao`. O padrão é R$ 10.000.000. A projeção só aparece depois de 25% do período.

**Períodos do painel.** `dia` "Dia", `semana` "Semana" (segunda a domingo), `mes` "Mês". Vendas: `mes` "Mês" e `ano` "Ano". Metas: ano a ano. Programa, ranking e faixas: mês a mês.

**Funil do painel** (`FUNIL`): `em_contato`, `visita_agendada`, `visita_realizada`, `proposta`, `venda`. "Aguardando lançamento" conta como em contato. Os nomes vêm do catálogo `lead_etapas`:
- Novo
- Em contato
- Visita agendada
- Visita realizada
- Proposta
- Venda
- Aguardando lançamento

**Motivos de descarte** (usados no painel): `sem_interesse` "Sem interesse", `fora_do_perfil` "Fora do perfil", `fora_da_regiao` "Fora da região", `contato_invalido` "Contato inválido", `duplicado` "Duplicado", `sem_retorno` "Sem retorno".

**Origens de lead** (`lead_origens`): `plantao` "Plantão", `indicacao` "Indicação", `carteira` "Carteira", `empresa` "Empresa (gerente)", `redes_sociais` "Redes sociais próprias", `anuncio_proprio` "Anúncio próprio" (pede campanha), `outros` "Outros".

**Colunas de visitas no painel:** Agendadas, Realizadas, Não compareceu, Aguardando baixa. Status de visita no banco: `agendada`, `confirmada`, `realizada`, `nao_compareceu`, `cancelada`.

**Catálogo de empreendimentos.**
- Fases (`StatusEmpreendimento`): `breve_lancamento` "Breve lançamento", `lancamento` "Lançamento", `em_obras` "Em obras", `pronto` "Pronto". Quando o empreendimento não está ativo, o selo é "– Fora de venda".
- Tipo do empreendimento: `residencial` "Residencial", `comercial` "Comercial".
- Tipologias (`TipoTipologia`): `apartamento` "Apartamento", `studio` "Studio", `loft` "Loft", `cobertura` "Cobertura", `garden` "Garden", `duplex` "Duplex", `sala_comercial` "Sala comercial", `loja` "Loja".
- Faixas de preço do filtro (slugs `ate-300`, `300-500`, `500-800`, `800-1200`, `acima-1200`), com os nomes listados na seção 10.
- Radar: nota mínima 50% na ficha do lead, 70% no catálogo.

**Perfis e permissões usados nestas telas** (o código usa `pode("...")`):
- `dados.ver_equipe`, `dados.ver_todos`
- `leads.cadastrar`
- `painel.campanha`
- `vendas.corrigir_equipe`
- `metas.definir_vgv`
- `plantao.registrar`, `lancamentos.registrar`
- `empreendimentos.gerenciar`
- Regra fixa `is_gerente_geral` / `soGerenteGeral`: `/faixas/`, `/programa/` e `/programa/aprovacao/`.

### 5.3 Recepção, parceiros e distribuição

**Recepção** (`lib/recepcao.ts`, `recepcao.sql`)
- **Turno:** `manha`, `tarde`. Rótulos "Manhã 9h–14h" e "Tarde 14h–19h".
- **Papel:** `corretor`, `especialista`.
- **Tipos de cliente** (slug, nome, curto, tecla):
  - `novo`, "Novo", "Novo", N;
  - `indicacao_corretor`, "Indicação de corretor", "Ind. corretor", C;
  - `indicacao_parceiro`, "Indicação de parceiro", "Ind. parceiro", P;
  - `retorno`, "Retorno", "Retorno", R.
- **Estado de presença** (`EstadoPresenca`): `presente`, `saiu`, `encerrou`. Texto da linha (`estadoDaLinha`):
  - "– Não está mais 9h40"
  - "! Saiu 9h40"
  - "→ Da vez"
  - "Voltou 9h40"
  - "Manhã e tarde"
  - "Chegou 9h"
- **Eventos da vez** (`plantao_presenca_eventos.tipo`): `saida`, `volta`, `passou_vez`, `encerrou`, `recebeu`. `entrada_metodo` da presença: `recepcao` ou `gps`.
- **Status do atendimento:** `ativo`, `cancelado`. A auditoria do histórico tem a ação `corrigido` ou `cancelado`.
- **Quem anunciar** (`anunciado_papel`): `corretor`, `gerente`, `colega`, `parceiro`. Rótulos: "Corretor(a)", "Corretor(a)", "Gerente", "Parceiro".
- **Respostas do registro:** `ok`, `confirmar` (avisos `repetido_hoje` e `outra_carteira`), `pergunta` (`corretor_no_stand` e `gerente_no_stand`) e `vez_mudou`. O aviso extra `ninguem_da_equipe` vem com "! Ninguém da equipe no stand. Chame o gerente geral ou quem estiver disponível."
- **Linhas do Anuncie** (por tipo):
  - Novo: "Cliente novo · vez dos corretores e dos especialistas" ou "Cliente novo · antes da vez · a vez não girou".
  - Indicação de corretor: "Indicação de X · quem indicou não está no stand" (ou "quem indicou e o gerente não estão no stand") "· já estava na carteira" ou "lead criado com a origem Indicação". Aviso "! Não estava na carteira: o lead foi criado para quem indicou."
  - Indicação de parceiro: "Indicação de parceiro · cliente enviado ao gerente X".
  - Retorno: "Retorno · especialista do último atendimento: X · último da vez: Y".
- **Mídias "Como conheceu"** (14, semente em `plantao_midias`), por slug e nome:
  - `passagem` "Passagem pela loja"
  - `regiao` "Mora ou trabalha na região"
  - `indicacao_amigo` "Indicação de amigo, família ou vizinho"
  - `instagram` "Instagram"
  - `facebook` "Facebook ou outras redes"
  - `whatsapp` "WhatsApp"
  - `site` "Site MBigucci"
  - `google` "Google ou internet"
  - `outdoor` "Outdoor"
  - `painel_led` "Painel de LED"
  - `folheto` "Folheto ou panfleto"
  - `email_marketing` "E-mail marketing"
  - `telefone_loja` "Telefone da loja"
  - `outro` "Outro"
- **Janelas de "Pôr na vez":** manhã 8h45 a 9h15 e tarde 13h45 a 14h15, hora de São Paulo. A tela mostra isso com a hora do aparelho, mas o banco decide.
- **Relatório:** períodos `dia`, `semana`, `mes` (`lib/painel.ts`).
- **Permissões** (`recepcao.sql`):
  - `plantao.confirmar`: registrar chegada, saída e a vez. Padrão: recepcao e operacional.
  - `plantao.atendimentos`: registrar clientes. Padrão: recepcao e operacional.
  - `plantao.atendimentos_ver`: ver os clientes. Padrão: gerente e operacional.
  - `plantoes.gerenciar`: configurar stands. Padrão: operacional.

**Parceiros** (`lib/parceiros.ts`, `parcerias.sql`)
- **Estágio:** `novo` "Novo", `contatado` "Contatado", `apresentado` "Apresentado", `indicou` "Indicou" e `vendeu` "Vendeu". Os dois últimos estão apagados ("em breve"): dependem da origem Parceiro no lead (etapa 5).
- **Como o estágio é calculado** (view `parceiros_situacao`): sem interação é `novo`. Com reunião, visita ou evento é `apresentado`. Só ligação, WhatsApp ou envio de material é `contatado`.
- **Faixa do prazo:** `ok` "✓ Até 30 dias" (0 a 30), `atencao` "! 31 a 60 dias" e `risco` "✕ 61 a 90 dias" (passou de 90 e o job ainda não rodou continua `risco`). Limite: `LIMITE_DIAS` = 90.
- **Tipo de interação:** `ligacao` "Ligação", `whatsapp` "WhatsApp", `reuniao` "Reunião", `visita` "Visita", `envio_material` "Envio de material", `evento` "Evento".
- **Como entrou** (`parceiros.entrada`): `link` "pelo link", `manual` "à mão", `estande` "no estande".
- **Estado do contato:** `vencido` ("✕ Vencido, data"), `hoje` ("! Hoje"), `futuro` (a data). Sem data: "Sem próximo contato".
- **Evento do parceiro** (`parceiro_eventos.tipo`): `cadastrado`, `atribuido`, `reentrada_aviso`, `perdido_90_dias`, `sem_gerente`.
  - Como (`como`): `roleta`, `redistribuicao`, `manual`, `procurado`.
  - Origem na fila (`origem`): `link` "Link", `estande` "Estande", `90_dias` "90 dias", `manual`.
- **Resposta do cadastro:** `criado`, `ja_cadastrado`, `seu`. Na entrada pela recepção: `criado` e `ja_cadastrado`.
- **Tipo de aviso** (`parceiro_avisos.tipo`): `recebido`, `reentrada`, `prazo_80`, `proximo_contato`.
- **Regiões:** 30 códigos na semente (as 7 cidades do ABC, 10 bairros de São Bernardo do Campo, 8 de Santo André e 5 zonas de São Paulo). Lista fechada, com a opção "Outra" (texto livre de até 160 caracteres).
- **Permissões:**
  - `parceiros.cadastrar`: cadastrar e registrar interações dos próprios. Padrão: gerente e gerente geral.
  - `parceiros.ver_todos`: ver os de todos. Padrão: gerente geral.

**Distribuição** (`lib/distribuicao.ts`, `distribuicao.sql`)
- **Modo:** `equipe` "Equipe e depois corretor", `direto` "Direto ao corretor", `gerentes` "Só gerentes".
- **Situação do corretor** (`Situacao`):
  - Botão do cabeçalho: `apto` ("✓ Recebendo", "✓ Na vez do stand" se a presença vem da recepção, "✓ De plantão"), `fora_do_stand` "! Fora do stand", `sem_sinal` "! Sem sinal", `visita` "→ Em visita", `sem_checkin` "! Faça check-in", `sem_plantao` "– Fora do horário", `desligado` "Receber leads", `pausa` "– Pausa" ou "– Pausa até 12/11", `fora_gerente` "– Fora da distribuição".
  - Fila, forma curta: "✓", "! fora", "! sem sinal", "→ visita", "! sem check-in", "– pausa", "– fora", "– fora do horário", "– desligado".
  - Fila, forma longa (tabela do gerente): "✓ Apto", "! Fora do stand 9h", "! Sem sinal", "→ Em visita", "! Sem check-in", "– Pausa até …", "– Fora da distribuição", "– Fora do horário", "– Desligado".
- **Presença:**
  - `origem`: `checkin` ou `recepcao`.
  - `estado`: `presente`, `fora`, `sem_sinal`, `visita`.
  - Status da presença: `aberta`, `fechada`, `sem_saida`.
  - `entrada_metodo`: `gps` (existe `selfie` no banco, sem tela, plano B).
  - `saida_metodo`: `gps`, `manual`, `sem_saida`, `chave_desligada`.
- **Ausência** (`distribuicao_ausencias.motivo`): `saiu`, `fora_do_raio`, `sem_sinal`, `visita`.
- **Eventos de pausa** (`distribuicao_pausas.tipo`): `pausa`, `volta`, `fora`, `dentro`, `plantao_fim`, `liga`, `desliga`.
- **Check-in:** resultados `dentro`, `fora`, `incerto`, `aguarde`, `sem_stand`, `bloqueada` (esta última só no navegador).
  - "Dentro" exige distância dentro do raio e precisão até 100 m.
  - "Fora" é distância menos precisão acima do raio.
  - O resto é "incerto".
- **Faixa:** `acima` "Acima da média", `media` "Na média", `abaixo` "Abaixo da média". Créditos pelo peso: 3, 2 ou 1. Sem os pesos, todos 1. Sem cálculo, 2. Faixa "na média" até 10% acima ou abaixo. Quem tem menos de 30 dias de conta fica na média.
- **Estado do lead sem dono** (`leads.distribuicao_estado`): `represado`, `fila_equipe`, `a_distribuir`.
- **Situação da entrada** (`distribuicao_entradas.situacao`): `criado`, `anexado`, `reativado`, `a_distribuir`. `repetido` não é gravado: é só o retorno da função `lead_empresa_entrada` quando o `entrada_id` já existe (idempotência).
- **Motivo da entrada na decisão** (`motivo_entrada`): `nova`, `redistribuida`, `represada`, `reativada`, `manual`, `mandada`.
- **Resultado da decisão:** `recebeu`, `represado`, `fila_equipe`, `a_distribuir`. A tela escreve "fila da equipe", "! represado", "! A distribuir" ou "✓ <nome>".
- **Motivos de pulo** (`MotivoPulo`), curto e longo:
  - `nao_atende`: "não atende o produto" / "Você não atende o produto deste lead."
  - `prazo_estourado`: "lead com prazo estourado" / "Você tinha um lead da empresa com o prazo de 15 min estourado na carteira."
  - `ja_teve`: "já teve este lead" / "Este lead já passou por você."
  - `fora_do_stand`: "fora do stand" / "Você estava fora do stand."
  - `sem_sinal`: "sem sinal" / "O Vendas estava sem sinal da sua localização."
  - `visita`: "em visita" / "Você estava em visita."
  - `represado_pendente`: "lead da noite sem atender" / "Você ainda tinha um lead da noite sem atender. Um por vez."
  - Tipo de item de "Hoje": `recebeu`, `pulado`, `fim_da_fila`.
- **Chaves** (`distribuicao_config`): `ligada`, `modo`, `pesos`, `exigir_checkin`, `sinal`, `plantao`, `represar`, `produtos`, `redistribuir`, `fim_da_fila`, `repetido_ao_dono`, `manual_conta`, `transparencia`. Existem também `minutos_sem_sinal` (padrão 30, de 10 a 240) e `minutos_plantao` (padrão 30), sem tela. `periodos_checkin` e `aprova_gerente` existem no banco como "Etapa 2" e não têm uso nem tela. A tabela `distribuicao_config` nasce com a chave geral desligada.
- **Permissões:** `distribuicao.receber` (corretor), `distribuicao.produtos` (gerente e operacional), `leads.distribuir` (ninguém por padrão; o gerente geral sempre tem).
- **Avisos da distribuição** (`distribuicao_avisos.tipo`): `fila_equipe`, `a_distribuir`, `fim_da_fila`, `mensagem_nova`, `mensagem_sem_resposta`, `mensagem_sem_resposta_equipe`, `plantao_fim`, `sem_sinal`, `perda`, `repasse_atrasado`, `represado_parado`.

---

## 6. Perfis e permissões

### Perfis (`schema.sql:17-32`, tabela `roles`, e `lib/tipos.ts:3`)
`gerente_geral` ("Gerente geral", ordem 1), `operacional` (2), `gerente` (3), `corretor` (4), `recepcao` ("Recepção", 5), `especialista` (6).

### Regras fixas
- `is_gerente_geral()` (`schema.sql:136`) é `current_perfil() = 'gerente_geral'` com perfil ativo. `current_perfil()` devolve nulo se a conta está desativada, então o desativado perde tudo.
- `has_permission()` (`schema.sql:146`) retorna verdadeiro para o gerente geral sem consultar tabela. O front faz o mesmo em `sessao.tsx:77`, e o gerente geral lê todos os slugs de `permissions` ao entrar.
- **Fixo por perfil, fora do catálogo:** telas "Faixas de VGV", "Pontos", "Distribuição", "Configurações", "Aprovar lançamentos" (`soGerenteGeral`); `app_settings` só o gerente geral lê e altera (RLS); policies de faixas de VGV usam `is_gerente_geral()` (`schema.sql:2137`); tabelas de mensagens, criar usuário de perfil gerente geral e editar gerente geral.
- `profiles_guard` (`schema.sql:309`):
  - só gerente geral altera um gerente geral, ou promove alguém a ele;
  - é preciso manter ao menos um gerente geral ativo;
  - não muda o perfil de quem é gerente de uma equipe;
  - gerente e gerente geral nunca têm equipe.
- `teams_guard`: o gerente da equipe precisa ter perfil Gerente. Um gerente por equipe (índice em `distribuicao.sql`, seção 2).
- Corretor ativo precisa de equipe (constraint `profiles_corretor_ativo_tem_equipe`).
- Tudo no banco é decidido por RLS. A conta nova nasce **desativada, como corretor** (`handle_new_user`, `schema.sql:268`) e só a Edge Function a ativa.
- Visibilidade de dados de uma pessoa (`pode_ver_dados_de`, `schema.sql:193`): a própria pessoa; o gerente geral; quem tem `dados.ver_todos`; ou o gerente com `dados.ver_equipe` e que seja o gerente da equipe daquela pessoa.

### Catálogo de permissões (`insert into public.permissions`, descrição como no seed)

| Chave | Descrição | Ordem | Arquivo |
|---|---|---|---|
| `usuarios.gerenciar` | Cadastrar usuários e definir perfil, equipe e situação | 1 | schema.sql:38 |
| `equipes.gerenciar` | Criar equipes e escolher o gerente de cada uma | 2 | schema.sql |
| `dados.ver_todos` | Ver os dados de todas as equipes | 3 | schema.sql |
| `dados.ver_equipe` | Ver os dados dos corretores da própria equipe | 4 | schema.sql |
| `leads.cadastrar` | Cadastrar e trabalhar os próprios leads | 5 | schema.sql:477 |
| `leads.atribuir` | Cadastrar leads da empresa e atribuir a corretores da equipe | 6 | schema.sql |
| `visitas.baixa_equipe` | Dar baixa e corrigir as visitas da equipe | 7 | schema.sql:1349 |
| `vendas.corrigir_equipe` | Corrigir e cancelar as vendas da equipe, com o motivo | 8 | schema.sql:1663 |
| `metas.definir_vgv` | Definir a meta anual de VGV, geral e por corretor | 9 | schema.sql |
| `painel.campanha` | Ver a conversão por campanha no painel | 10 | schema.sql |
| `plantao.registrar` | Registrar os períodos do plantão e a saída para visita | 11 | schema.sql:2164 |
| `lancamentos.registrar` | Registrar períodos e vídeos dos corretores que vê, para conferência do gerente geral | 12 | schema.sql |
| `empreendimentos.gerenciar` | Cadastrar e editar empreendimentos, tipologias e preços | 13 | schema.sql:2600 |
| `plantao.confirmar` | Registrar a chegada, a saída e a vez das pessoas no stand | 30 | recepcao.sql:63 |
| `plantao.atendimentos` | Registrar os clientes que chegam ao stand | 31 | recepcao.sql |
| `plantao.atendimentos_ver` | Ver os clientes atendidos no stand pelos corretores que vê | 32 | recepcao.sql |
| `plantoes.gerenciar` | Configurar os stands e a lista de especialistas | 33 | recepcao.sql |
| `parceiros.cadastrar` | Cadastrar parceiros e registrar as interações dos próprios parceiros | 40 | parcerias.sql:45 |
| `parceiros.ver_todos` | Ver os parceiros e as interações de todos os gerentes | 41 | parcerias.sql |
| `distribuicao.receber` | Receber leads da empresa pela distribuição automática | 40 | distribuicao.sql:67 |
| `distribuicao.produtos` | Marcar os produtos que cada corretor atende | 41 | distribuicao.sql |
| `leads.distribuir` | Ver e atribuir os leads em "A distribuir" | 42 | distribuicao.sql |

Observações:
- Só as quatro primeiras chaves vêm do seed-base. As demais entram em blocos de módulo e nos SQL de `recepcao`, `parcerias` e `distribuicao`.
- A coluna **ordem** repete: 40 e 41 pertencem a duas permissões de parcerias e a duas de distribuição. Na tela de Permissões a ordem entre elas não é estável por chave.
- `leads.distribuir` não tem perfil padrão (só o gerente geral a tem).
- O código do menu usa `pode("leads.atribuir")` etc. Ainda não conferi no código das telas onde `leads.distribuir` é exigida.

### Padrão de cada perfil (inserção "só na primeira vez que a chave aparece")
A tabela `role_permissions` é editável pelo gerente geral em Configurações. O que segue é o que o SQL semeia. A instalação real pode ter sido ajustada.

| Perfil | Permissões padrão |
|---|---|
| gerente_geral | todas, sem linha em tabela. Existem linhas só de `parceiros.cadastrar` e `parceiros.ver_todos`, para as caixas aparecerem marcadas |
| operacional | `plantao.registrar`, `lancamentos.registrar`, `empreendimentos.gerenciar`, `distribuicao.produtos`, `plantao.confirmar`, `plantao.atendimentos`, `plantoes.gerenciar`, `plantao.atendimentos_ver` |
| gerente | `dados.ver_equipe` (schema.sql:53, só se `role_permissions` está vazia), `leads.atribuir`, `visitas.baixa_equipe`, `vendas.corrigir_equipe`, `lancamentos.registrar`, `distribuicao.produtos`, `plantao.atendimentos_ver`, `parceiros.cadastrar` |
| corretor | `leads.cadastrar`, `painel.campanha`, `distribuicao.receber` |
| recepcao | `plantao.registrar`, `plantao.confirmar`, `plantao.atendimentos` |
| especialista | nenhuma |

### O que muda na tela, por perfil (usando os padrões acima)

| Perfil | Início | Itens de menu (ordem) | Telas bloqueadas ao abrir o endereço |
|---|---|---|---|
| **Gerente geral** | "Início" com cartões: Leads, Painel da equipe, Vendas, Metas, Usuários, Equipes, Configurações; mais "Sua equipe" se tiver. | Início, Leads, Quadro, Agenda, Painel, Vendas, Metas, Empreendimentos, Faixas de VGV, Pontos, Plantão, Recepção, Parceiros, Ranking, Usuários, Equipes, Fila de leads (se ligada), Distribuição (se instalada), Configurações | nenhuma |
| **Gerente** | "Início": Leads da equipe, Painel da equipe, Vendas da equipe, Metas da equipe, bloco "Minhas equipes", `ContatosDoDia` de parceiros e "Sua equipe". | Início, Leads, Quadro, Agenda, Painel, Vendas, Metas, Empreendimentos, Plantão, Parceiros, Ranking, Fila de leads (se ligada e tem equipe). Sem "Meus pontos". | Usuários, Equipes (padrão), Faixas, Pontos, Configurações, Distribuição, Recepção, Aprovar lançamentos |
| **Corretor** | **"Lista do dia"** (`ListaDoDia`) | Lista do dia, Leads, Quadro, Agenda, Painel, Vendas, Metas, Empreendimentos, Meus pontos, Ranking, Fila de leads (só se ligada, a fila é visível e o modo não é "gerentes") | Usuários, Equipes, Faixas, Pontos, Configurações, Distribuição, Plantão, Recepção, Parceiros |
| **Operacional** | "Início" com o cartão **"Em construção"** ("O Base360 Vendas está sendo montado por etapas. As próximas telas aparecem aqui nas próximas versões."), pois não tem permissão de leads | Início, Empreendimentos, Plantão, Recepção, Ranking | Leads, Quadro, Agenda, Painel, Vendas, Metas, Usuários, Equipes, Faixas, Pontos, Configurações. Pode editar empreendimentos e stands. |
| **Recepção** | "Início" com "Em construção" | Início, Empreendimentos, Plantão, Recepção, Ranking | idem operacional, e não gerencia stands nem empreendimentos |
| **Especialista** | "Início" com "Em construção" | Início, Empreendimentos, Ranking | quase tudo |

Em todos os perfis, "Minha conta", "Sair" e os atalhos externos estão sempre disponíveis. Conta desativada mostra "! Conta desativada" e só o botão "Sair".

---

## 7. Notificações, automações e integrações

### PWA
- **Manifesto** (`crm/public/manifest.webmanifest`): nome "Base360", `short_name` "Base360", descrição "Base360 Vendas, o sistema dos corretores MBigucci.", `display: standalone`, `start_url`, `scope` e `id` "./", `lang: pt-BR`, `theme_color` e `background_color` `#f7f6f2`. Ícones: `icon.svg` (any), `icon-192.png`, `icon-512.png` e `maskable-512.png`.
- Há também `apple-touch-icon.png` e `favicon-32.png`, referenciados no `layout.tsx`.
- **Instalação:** só orientada por texto em Minha conta (Android e iPhone). Não existe botão "Instalar" nem tratamento de `beforeinstallprompt` (não procurei esse termo em todos os arquivos, só no escopo pedido).
- **Service worker** (`crm/public/sw.js`): só para push. Não faz cache e não intercepta requisição, então **não há modo offline de dados**.
  - `install` chama `skipWaiting`. `activate` chama `clients.claim`.
  - `push`: mostra a notificação com título do aviso, ou "Base360" se vier sem título. Corpo, `tag` (com `renotify` se houver tag), ícone `icons/icon-192.png`, `lang: pt-BR`. Se o payload não for JSON, usa o texto cru como corpo.
  - `notificationclick`: fecha a notificação, foca uma janela do app já aberta e navega até a URL do aviso; senão abre nova janela. URLs fora do escopo caem na raiz do app.
  - Escopo = `BASE_PATH` (`/vendas/`).
- **Marketing:** tem manifesto ("Base360 Marketing", `short_name` "Marketing") e **não tem `sw.js`**, então não recebe push.

### Edge Function `avisos` (`crm/supabase/functions/avisos/index.ts`)
Quem chama:
- o agendador do banco (a cada 5 min) e o gatilho de atribuição de lead, ambos com o cabeçalho `x-avisos-segredo` (o banco confere pelo `avisos_segredo_ok`);
- o app, na ação `{acao:"teste", endpoint}`, com o login de quem chama.

Regras gerais:
- **Horário de atendimento:** padrão 09:00 a 19:00, todos os dias (`HORARIO_PADRAO`); vem de `horario_atendimento`.
- **Janelas:** o resumo do dia e o aviso de fim de dia valem por 60 min a partir da hora (a rodada é a cada 5 min).
- **Atraso máximo:** contato e prazo estourado só saem até 30 min depois da hora. Depois, só a Lista do dia mostra.
- **Mais de 3** contatos da mesma pessoa na mesma rodada viram um aviso só. Idem prazos estourados da equipe (gerente) e avisos de parceiros.
- **Fuso:** America/Sao_Paulo.
- **TTL no serviço de push:** `contato`, `visita`, `atribuido` = 1 h; `prazo`, `equipe` = 30 min; `resumo`, `parceiros` = 4 h.
- **Não repete:** cada aviso grava uma chave em `push_log` (por pessoa). Falha de envio volta para a próxima rodada. Aparelho com 404 ou 410 sai do banco (`push_esquecer`).
- **Só endereços de serviços de push reais** são aceitos (`push_endereco_ok`).

**Avisos, em cada tipo** (título como no código; `{n}` = nome com empreendimento):

| Tipo | Título | Corpo | Quando sai |
|---|---|---|---|
| atribuido | Lead novo para você | "{n}. Responda em até X min." | Lead da empresa atribuído pelo gerente (não a si mesmo), nas últimas 24 h, ainda no prazo e dentro do horário. Também disparado na hora pelo gatilho de atribuição. |
| prazo | Faltam M min para responder | "{n} aguarda o primeiro contato." | Faltam de 1 a 6 min do prazo de 15 min |
| prazo | Prazo de 15 min estourado | "{n} ainda está sem primeiro contato. Fale agora." | Prazo estourado há menos de 30 min |
| contato | Hora do contato | "{n}. Marcado para HH:MM." | Próximo contato chegou, atraso menor que 30 min |
| contato | N contatos para agora | "{nomes}. Veja a lista do dia." | mais de 3 contatos juntos |
| visita | Visita às HH:MM | "{lead} · {empreendimento} · {local}" | de 60 a 65 min antes |
| visita | 1 visita aguardando baixa / N visitas aguardando baixa | "{nomes}. Registre como foi." | Na hora do fim do atendimento (19h), uma vez por dia, só se houver visita passada sem baixa |
| resumo | Seu dia no Base360 | partes: "N aguardando primeiro contato", "N atrasado(s)", "N contato(s) para hoje", "N visita(s) (horas)", "aniversário de X" | Na abertura do atendimento (9h), nos dias de atendimento. Não sai se não há pendência. |
| equipe | Prazo de 15 min estourado na equipe | "{n}, com {corretor}, está sem primeiro contato. Veja o Lead perdido." | Gerente com `dados.ver_equipe`: lead da empresa de corretor da equipe cujo prazo estourou há menos de 30 min |
| equipe | N prazos estourados na equipe | "{nomes}. Veja o painel." | mais de 3 juntos |
| equipe | 1 visita da equipe aguardando baixa / N visitas… | "{nome (n)…}. Cobre a baixa." | no fim do atendimento |
| parceiros | Parceiro novo para você | "{nome · empresa}. Faça o primeiro contato." | recebido (roleta, estande ou 90 dias de outro) |
| parceiros | Parceiro procurou de novo | "{quem} procurou a MBigucci de novo. Retome o contato." | reentrada |
| parceiros | Falta 1 dia / Faltam N dias para perder o parceiro | "{quem}. N dias sem interação. Registre um contato." | 80 dias sem interação do dono, limite 90 |
| parceiros | Contato com parceiro hoje / vencido | "{quem}. Combinado para hoje." ou "… para dd/mm." | dia do próximo contato chegou ou passou |
| parceiros | N avisos de parceiros | "{nomes}. Veja seus parceiros." | mais de 3 juntos |
| teste | Teste do Base360 | "Os avisos chegam neste aparelho." | botão "Enviar teste" |

Avisos da **distribuição automática** (`textoDaDistribuicao`; saem de `distribuicao_avisos`; os do banco decidem quem recebe; nunca falam de pontos nem de verba). Válidos por 24 h. Só dentro do horário de atendimento: `lead_novo`, `fila_equipe`, `perda`, `a_distribuir`, `repasse_atrasado`, `represado_parado`, `mensagem_sem_resposta_equipe`. Os demais saem a qualquer hora.

| Título | Corpo |
|---|---|
| Lead novo para você (`lead_novo`, `lead_plantao`) | "{n}. Responda em até 15 min." |
| Mensagem nova de {nome} | "Responda em até 15 min." |
| Mensagem sem resposta há 15 min | "{nome} mandou mensagem nova. Responda agora." |
| Você foi para o fim da fila | "O prazo de {nome} estourou." (ou "Um prazo de 15 min estourou.") |
| Abra o Vendas para continuar recebendo leads | "Você está no stand, mas o Vendas está fechado há 30 min." |
| Recebendo leads desligado | "Sem usar o Vendas há 30 min. Ligue de novo para receber." |
| Lead passado a outro corretor (equipe) | "{n}: o prazo de 15 min estourou." |
| Mensagem sem resposta na equipe | "{nome} mandou mensagem nova há 15 min." |
| Lead novo na fila da equipe | "{n}. Repasse em até 15 min." |
| Lead em A distribuir | "{n}. Ninguém sobrou para receber." |
| Lead parado na fila da equipe | "{n}. Há 15 min sem repasse." |
| Lead esperando na distribuição | "{n}. Ninguém apto há 15 min." |

Aparelhos e log: tabelas `push_assinaturas` (aparelho, tipos, `visto_em`; cada usuário só lê e apaga os próprios; a gravação é pela RPC `push_assinar`) e `push_log` (30 dias).

### Tarefas agendadas (`pg_cron` roda em UTC)

| Tarefa | Cron (UTC) | Horário (São Paulo) | O que faz | Arquivo |
|---|---|---|---|---|
| `crm-avisos` | `*/5 * * * *` | a cada 5 min | chama a função `avisos` pelo `pg_net` | `agendar-avisos.sql` |
| `crm-avisos-limpa-historico` | `17 4 * * *` | 01:17 | apaga `cron.job_run_details` com mais de 7 dias | `agendar-avisos.sql` |
| gatilho `leads_avisa_atribuicao_ins` e `_upd` | na gravação | na hora | chama `avisos` quando um lead da empresa em "novo" é atribuído | `agendar-avisos.sql` |
| `crm-distribuicao` | `* * * * *` | a cada minuto | `private.distribuicao_rotina()` (prazos, plantão, ausências) | `agendar-distribuicao.sql` |
| `crm-distribuicao-fecha` | `30 22 * * *` | 19:30 | fecha check-ins abertos como "sem saída" | idem |
| `crm-distribuicao-followup` | `50 2 * * *` | 23:50 | foto do follow-up de cada corretor | idem |
| `crm-distribuicao-desempenho` | `0 9 * * 1` | segunda, 06:00 | recalcula as faixas de desempenho | idem |
| `crm-distribuicao-limpa` | `0 6 * * *` | 03:00 | limpa check-ins (30 dias), avisos (30 dias), decisões (13 meses) | idem |
| `crm-parcerias` | `0 10 * * *` | 07:00 | `private.parceiros_rotina()`: passa parceiro com 90 dias sem interação (ou dono desativado) para o próximo da roleta, cria avisos de 80 dias e de próximo contato, limpa avisos com mais de 30 dias | `parcerias-agendar.sql` |
| `base360-entrada-leads` | `* * * * *` | a cada minuto | chama a Edge Function `entrada-leads` | `agendar-entrada.sql` |

O segredo do agendador e as URLs ficam no Vault (`avisos_url`, `avisos_segredo`, `entrada_url`, `entrada_segredo`). O arquivo traz um espaço reservado para a URL do projeto, que o instalador troca.

### Entrada de leads por e-mail (Graph)
Edge Function `entrada-leads` (`index.ts` é gerado por `gerar.mjs` a partir de `entrada.ts` e `marketing/src/lib`).
- **Disparo:** pg_cron a cada minuto, com o cabeçalho `x-entrada-segredo` (conferido por `entrada_segredo_ok`).
- **Secrets:** `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `CAIXA_ENTRADA`, `MODO` (só `producao` vale; qualquer outro valor, ou ausente, é **teste**).
- **Passada:**
  1. pega um turno exclusivo (`entrada_turno_pegar`, vence em 2 min);
  2. lê até 5 mensagens **não lidas** da caixa de entrada pela Microsoft Graph (`$top=5`);
  3. do mais antigo ao mais novo, `lerEmailDeLead` extrai nome, telefone, e-mail, mensagem, fonte e produto, usando o catálogo de empreendimentos;
  4. acha a regra do direcionador e entrega.
- **Modo teste:** decide e só escreve o código no log. Não entrega, não grava, não apaga e não marca como lida.
- **Modo produção:**
  - destino "Base360 Vendas": RPC `lead_empresa_entrada`;
  - destino externo, por e-mail: `sendMail` pela Graph, assunto fixo "Novo contato", sem cópia em Enviados; corpo com Nome, Telefone, E-mail, Produto, Fonte, Data, Mensagem (até 5000 caracteres) e Id;
  - destino externo, por "porta de entrada": POST JSON versão "1.0" (`Authorization: Bearer`, `Idempotency-Key`), tempo limite de 10 s; 2xx e 409 contam como entregue; 400, 401, 403 e 422 são "configuração";
  - **qualquer falha de entrega externa manda o lead na hora para o Base360 Vendas**;
  - depois de entregar, apaga a mensagem (`permanentDelete`).
- **Id do lead:** UUID derivado do id da mensagem, para o reenvio ser reconhecido.
- **Log:** só id do lead, hora e um código. Erros levam só o nome da chamada e o status HTTP.
- **Resposta:** só `{ok, modo, ocupado, lidos}`.
- **Código de resultado:** `teste:…`, `externo:entregue`, `vendas:{motivo}:{situação}`, `erro:…`.

### Edge Function `usuarios-admin`
- POST com `{acao:"criar", email, senha, nome, perfil, equipe_id?}` ou `{acao:"redefinir_senha", id, senha}`.
- Confere `has_permission('usuarios.gerenciar')` com o login de quem chamou (403: "Você não tem permissão para gerenciar usuários.").
- Usa a chave de serviço **só dentro da função** (nunca no front).
- **Criar:** `auth.admin.createUser` com `email_confirm: true` e a senha provisória; depois atualiza o perfil com o login de quem chamou, para valerem as mesmas policies; se falhar, apaga a conta recém-criada.
  - Erros: "Já existe uma conta com este e-mail.", "E-mail inválido.", "Informe o nome.", "Escolha o perfil.", "A senha precisa ter ao menos 8 caracteres."
- **Redefinir senha:** só alvo que o chamador consegue ver. Senha de gerente geral, só outro gerente geral ("Só o gerente geral redefine a senha de outro gerente geral.").
- **Não existe e-mail de convite, de recuperação nem de confirmação.** O cadastro por conta própria fica desligado (README, passo 2). A pessoa recebe e-mail e senha provisória do gerente geral, na mão, e troca em Minha conta. "Esqueci a senha" é resolvido pelo gerente geral com "Redefinir senha".

### `storage-documentos.sql`
Bucket privado `lead-documentos`: 10 MB por arquivo; tipos `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`. Policies de leitura (quem vê o lead), envio (dono do lead ativo) e remoção (dono). Sem policy de update: arquivo nunca é sobrescrito. As mensagens de erro de `erros.ts` ("O arquivo passa de 10 MB.", "Envie um PDF ou uma foto.") vêm daqui.

### Links de WhatsApp e telefone

| Onde | Link | Observação |
|---|---|---|
| `lib/mensagens.ts:109` `linkWhatsappComTexto(numero, texto)` | `https://wa.me/{número}` ou `…?text={texto}` | abre com a mensagem pronta para revisar. Usado em `leads/mensagem.tsx` ("Abrir no WhatsApp →", `target=_blank`) e `leads/repasse.tsx` ("Avisar {nome} no WhatsApp →") |
| `lib/leads.ts:297` `linkWhatsapp(w)` | `https://wa.me/{w}` | número já normalizado, com o 55 |
| `lib/parceiros.ts:121` `linkWhatsapp(norm, texto?)` | `https://wa.me/55{norm}` | usado em `parceiros/card.tsx` e `parceiros/ficha/page.tsx`; botão secundário |
| `lib/mensagens.ts:112` `linkLigar(numero)` | `tel:+{número}` | `BotaoLigar` ("Ligar", `aria-label` "Ligar para {número formatado}"); com `onLigar`, o toque grava o registro automático "Ligou" |
| `leads/ficha/page.tsx:339` | `tel:+{telefone2}` | "Outro telefone" |
| `parceiros/ficha/page.tsx:161` | `mailto:{e-mail}` | e-mail do parceiro |

### O que roda no Supabase
- **Auth:** e-mail e senha apenas. Cadastro por conta própria desligado. Sessão persistida (`persistSession`, `autoRefreshToken`). O cliente usa só a chave anon pública.
- **RLS:** em todas as tabelas. Funções auxiliares `security definer` (`current_perfil`, `is_gerente_geral`, `has_permission`, `minha_equipe`, `is_my_team_member`, `pode_ver_dados_de`).
- **Storage:** bucket `lead-documentos` (acima).
- **Edge Functions:** `avisos`, `entrada-leads`, `usuarios-admin`. As duas primeiras são chamadas pelo banco, sem login do usuário. Isso exige desligar "Verify JWT" (README).
- **pg_cron e pg_net:** tabela da seção 4.3. Vault guarda segredos e URLs.
- **Schemas fora da API:** `private` (funções internas) e `interno` (direcionador, nunca exposto).

### 7.1 Automações da recepção, dos parceiros e da distribuição

**Recepção:** não há `pg_cron` (só funções chamadas pelo app). Prazos de 30 min para desfazer e para corrigir sem motivo (`recepcao.sql`, linhas 572, 1314, 1356 e 1417). O Anuncie dá 8 s de Desfazer na tela. O dia vale só no mesmo dia: depois do dia, só o gerente geral e quem tem `plantao.atendimentos` com `dados.ver_todos` (o operacional) corrigem. O telefone repetido no mesmo stand no mesmo dia pede confirmação.

**Parceiros** (`parcerias-agendar.sql`):
- Job `crm-parcerias` roda todo dia às 10:00 UTC (07:00 em São Paulo) e chama `private.parceiros_rotina()`:
  1. **Redistribuição:** passa para o próximo da roleta o parceiro com 90 dias sem interação do dono (`prazo_desde` até hoje menos 90 dias) ou cujo dono foi desativado. Nunca para o mesmo. Grava o evento `perdido_90_dias` ou `sem_gerente`. Sem gerente ativo, o parceiro fica como está e tenta no dia seguinte. A trava é o `pg_advisory_xact_lock(7305001)`.
  2. **Avisos:** `prazo_80` (80 a 89 dias sem interação) e `proximo_contato` (data chegada ou vencida, da última interação do gerente atual). Uma chave por aviso impede repetir.
  3. **Limpeza:** apaga avisos enviados há mais de 30 dias e tentativas do link com mais de 2 dias.
- **Aviso na hora:** o gatilho `parceiro_avisos_agora` (depois de inserir em `parceiro_avisos`) chama `private.chamar_avisos` se a função existe, sem nunca falhar.
- **Roleta de parceiros:** só o perfil "gerente" ativo entra, sem o gerente geral. Posição pelo último evento `atribuido` por `roleta` ou `redistribuicao`. O cadastro à mão do gerente fica com ele e não conta como vez. O cadastro manual do gerente geral vai para a roleta e aparece como "estande".
- **Link público:** a função `parceiro_enviar` (anon) tem limite por hora (`parceiro_link_tentativas`). Não tem tela no escopo.
- **Reentrada:** parceiro duplicado (WhatsApp ou CRECI) grava `reentrada_aviso` e avisa o gerente atual (`reentrada`), sem mudar de dono.

**Distribuição** (`agendar-distribuicao.sql`; o `pg_cron` roda em UTC e cada rotina confere a hora de São Paulo e as chaves):

| Job | Cron (UTC) | Hora SP | O que faz |
|---|---|---|---|
| `crm-distribuicao` | `* * * * *` | a cada minuto | `distribuicao_rotina()` |
| `crm-distribuicao-fecha` | `30 22 * * *` | 19h30 | fecha os check-ins abertos como `sem_saida` |
| `crm-distribuicao-followup` | `50 2 * * *` | 23h50 | foto do follow-up de cada corretor (Nota do CRM) |
| `crm-distribuicao-desempenho` | `0 9 * * 1` | segunda, 6h | recalcula as faixas |
| `crm-distribuicao-limpa` | `0 6 * * *` | 3h | apaga tentativas de check-in (30 dias), avisos (30 dias) e decisões (13 meses) |

A rotina de cada minuto faz, em ordem:
1. **Estourados:** lead da empresa em `novo` com prazo de 15 min vencido (e ainda dentro de 30 min de atraso, para ligar a chave não soltar uma rajada).
   - Registra o estouro uma vez (lead, dono e início).
   - Com `ligada` e `fim_da_fila`, manda o dono ao fim da fila e avisa "fim_da_fila".
   - Avisa o gerente da equipe ("perda").
   - Com `ligada` e `redistribuir`, passa o lead adiante: sem limite de passagens, nunca a quem já teve. Sem ninguém sobrando, vai para "A distribuir".
2. **Liberar represados:** na ordem de chegada, um por vez pela roleta. À noite, um por vez para quem está de plantão (`represado_pendente`). No modo só gerentes, tenta de novo.
3. **Fim do plantão:** fora do horário, quem está com o botão ligado e sem usar o app há 30 min (`minutos_plantao`) tem o botão desligado (evento `plantao_fim`). O aviso só sai para quem usou o app fora do horário.
4. **Ausências:** "fora do raio" sem resposta em 5 min vira ausência `fora_do_raio`. "Sem sinal" depois de 30 min (`minutos_sem_sinal`), só no horário, com aviso.
5. **Avisos de prazos:** `repasse_atrasado` (fila da equipe vencida), `represado_parado`, `mensagem_sem_resposta` e `mensagem_sem_resposta_equipe`.

**Regras de fundo** (`distribuicao.sql`):
- **Horário de atendimento:** tabela `horario_atendimento` (padrão 9h às 19h, todos os dias).
- **Prazo:** de 15 min de atendimento. Lead de plantão recebido à noite tem 15 min "de relógio" (`prazo_imediato`).
- **Lead repetido** (chave `repetido_ao_dono`):
  - O mesmo telefone (ou e-mail) de lead ativo com dono ativo: `anexado` (a mensagem entra no lead). O dono tem 15 min para responder, e o aviso é `mensagem_nova`.
  - Dono desativado: `reativado` (o mesmo lead vai pela roleta).
  - Lead descartado da empresa: `reativado`.
  - Lead sem dono (fila da equipe, A distribuir, represado): `anexado`, e o lead fica onde está.
  - Desligada a chave: cria lead novo.
- **Telefone fora do formato** `^55[0-9]{10,11}$` vai vazio, e e-mail inválido também.
- **Check-in:** o stand precisa ter coordenadas. Raio de 30 a 1000 m (padrão 200). Precisão até 100 m. Check-in em outro stand fecha o anterior. Novo check-in da mesma pessoa em até 20 s devolve "aguarde". A pergunta "Saiu do stand?" ao responder "Estou no stand" cala a pergunta por 20 minutos (`ignorar_ate`).
- **A vez da recepção também conta como presença:** o corretor que está na vez do turno atual aparece como "✓ Na vez do stand". A vez da recepção usa a tarde a partir das 13h45 se já tem alguém na vez dela.
- **Efeitos imediatos ao desligar chaves** (`distribuicao_config_salvar`):
  - Desligar `exigir_checkin` fecha os check-ins abertos (`chave_desligada`).
  - Desligar `sinal` apaga os sinais e as ausências `fora_do_raio` e `sem_sinal`.
- **Trava e unicidade:** trava `7305002` (a `7305001` é de parceiros). Um gerente só pode ter uma equipe (índice único `teams_gerente_unico`).

**Avisos no celular:** a Edge Function `avisos` lê `distribuicao_avisos_pendentes()` e `parceiros_avisos_pendentes()`. Os da distribuição reaproveitam os tipos já existentes de push (Lead da empresa, Prazo, Equipe).

---

## 8. Celular e computador

**Pontos de quebra**
- 768px (`md`): listas passam a 2 colunas e o botão de ação fixo no rodapé vira botão normal.
- 1024px (`lg`): aparecem a barra lateral e o menu da conta, e a ficha do lead passa a 2 colunas.
- A recepção usa 900px (`useTelaPc`).
- "Clientes de hoje" mede a própria caixa: vira tabela a partir de 600px (`ResizeObserver`).

**Só no celular**
- **Menu e ações:**
  - Botão de menu (sanduíche) com um painel escuro: destinos, depois "Atalhos" (Simulador, Site MBigucci, Linktree), depois nome, "Minha conta" e "Sair". Alvo de 48px.
  - Ação principal fixa no rodapé (`RodapeAcao`): "+ Novo lead", "Cadastrar", "+ Registrar venda", "+ Novo empreendimento", "Salvar", "Aplicar", "+ Novo parceiro", "Registrar evento", "+ Nova regra" (Marketing).
  - Barra de aprovação em lote fixa no rodapé.
- **Popups:**
  - Folha que sobe do rodapé (distribuição) e o diálogo de mensagem do WhatsApp, que vira folha na base da tela.
- **Recepção:**
  - Abas "No stand" e "Clientes · n".
  - Formulário de cliente em tela cheia pelo botão fixo "+ Cliente", com as respostas do banco no rodapé.
- **Listas no lugar de tabelas:**
  - Na fila do gerente.
  - Em "Clientes de hoje".
  - Na `TabelaStand` do painel, com `<details>` por corretor.
- **Alvos e textos curtos:**
  - Alvo mínimo de 44px nos controles de escolha (`.opcao`) e nos números clicáveis do painel.
  - Posição na fila só como "3º", abaixo de 640px.
- **Comportamento de aparelho:**
  - Links `tel:` e `wa.me` abrem o telefone e o WhatsApp.
  - O toque grava o registro automático "Abriu o WhatsApp" ou "Ligou".
  - O rascunho em `sessionStorage` existe porque o celular recarrega a aba ao voltar do WhatsApp.
  - Avisos push com o app instalado (PWA). No iPhone, só instalado na Tela de Início e no iOS 16.4 ou mais novo.
  - Check-in por localização no stand, com o sinal a cada 10 min.

**Só no computador**
- **Navegação:**
  - Barra lateral fixa, 180px aberta e 64px recolhida, com dica ao passar o mouse. A escolha fica no aparelho.
  - Menu da conta no cabeçalho ("{apelido} ▾": nome, Minha conta, Sair).
  - Atalhos externos no cabeçalho, ao lado do logo.
- **Recepção:**
  - Atalhos de teclado (Alt+N, C, P, R, V e K).
  - Relógio "Agora 9h40".
  - Duas colunas (vez à esquerda, formulário e lista à direita).
- **Tabelas e colunas:**
  - Tabela da fila do gerente.
  - Tabela "Clientes de hoje".
  - Ficha do lead e ficha do parceiro em duas colunas.
  - Direcionador em duas colunas.

**Sem versão própria de celular** (rolagem lateral)
- As 6 tabelas do painel.
- A tabela "Por corretor" em Leads.
- As tabelas de metas e faixas.
- O Quadro (colunas de 78vw com `scroll-snap`).

### 8.1 Detalhe: leads e atendimento

- **Ação principal fixa no rodapé do celular:** `RodapeAcao` é `fixed inset-x-0 bottom-0` e vira `md:static`. As telas ganham `pb-20 md:pb-0` (Lista do dia e Leads) ou `pb-24 md:pb-0` (Novo lead, ColarMensagem). O botão "Cadastrar" no cadastro e "Usar estes dados" na colagem usam isso.
- **Listas:** de 1 coluna para `md:grid-cols-2` (Leads, Lista do dia, visitas, retornos).
- **Filtros:** `min-w-[140px] flex-1 md:flex-none`. A busca ocupa a largura toda no celular.
- **Alvos de toque:** os links do bloco de prioridades usam `min-h-[44px] md:min-h-0`. O select "Ordenar por" tem `text-[16px] md:text-[13px]` (evita zoom do iOS).
- **Quadro:** colunas de 78vw com `scroll-snap` horizontal em qualquer tela (não há breakpoint).
- **Ficha:** uma coluna em ordem fixa no celular (`order-[n]`). Em `lg`, duas colunas (`grid-cols-[minmax(0,1fr)_380px]`): à esquerda o que se faz, à direita Andamento, Radar e Histórico (ou Atribuir e Histórico para o gerente). A coluna da esquerda e a da direita usam `contents lg:flex`. O rótulo da linha tem `sm:w-[120px]`.
- **Registrar interação:** botões de tipo `grid-cols-3`, e `md:grid-cols-5` (6 se houver Sem resposta).
- **Perfil e documentos:** campos em `md:grid-cols-2`; documentos `md:grid-cols-[1fr_auto]`.
- **Diálogo de mensagem:** folha colada na base e arredondada em cima no celular (`mt-auto rounded-t-md`, `max-h-[92dvh]`); modal centralizado `md:max-w-[560px]` no computador.
- **Agenda:**
  - "Voltar para hoje" duplicado: `hidden md:inline` (ao lado da navegação) e `md:hidden` (abaixo, centralizado).
  - "+ Agendar visita": `w-full md:ml-auto md:w-auto`.
  - Os 7 botões de dia são `grid-cols-7` em todas as telas.
- **Aviso de Desfazer:** `px-3 pb-3 md:px-5 md:pb-5`.
- **Tabela "Por corretor":** `overflow-x-auto`, sem versão alternativa para celular.
- **Exclusivos de celular (comportamento):**
  - Links `tel:` e `wa.me`, que abrem o app.
  - `window.open("", "_blank")` antes de buscar o link assinado do documento (comentário no código cita o iPhone).
  - Rascunho em `sessionStorage` por causa do celular recarregar a aba ao voltar do WhatsApp.
- **Exclusivo de computador:** o resto é o mesmo conteúdo reorganizado (barra lateral de navegação, fora desta área).

---

## 9. Atalhos e navegação

**Resumo**
- Não existem busca global, criação rápida nem atalhos de teclado gerais.
- Os únicos atalhos de teclado são os da recepção, mais o Escape, que fecha menus, folhas e diálogos.
- As buscas são locais, em Leads, Quadro (filtros), Agenda (escolher cliente), Empreendimentos, Plantão, Parceiros, Evento, Usuários e na busca de pessoa da recepção.
- A criação fica em cada tela: "+ Novo lead", "+ Lead da empresa", "+ Agendar visita", "+ Registrar venda", "+ Nova meta", "+ Novo empreendimento", "+ Novo parceiro", "Novo usuário", "Nova equipe", "+ Nova mensagem", "+ Nova regra", "+ Novo destino".

### Menu: item, ordem e condição
`href` e rótulo estão em `casca.tsx:64-94`.

| # | Item | Rota | Condição |
|---|---|---|---|
| 1 | Lista do dia / Início | `/` | sempre (rótulo "Lista do dia" se `ehListaDoDia`) |
| 2 | Leads | `/leads/` | `leads.cadastrar` ou `dados.ver_equipe` ou `dados.ver_todos` |
| 3 | Quadro | `/leads/quadro/` | mesma condição |
| 4 | Agenda | `/agenda/` | mesma condição |
| 5 | Painel | `/painel/` | mesma condição |
| 6 | Vendas | `/vendas/` | mesma condição |
| 7 | Metas | `/metas/` | mesma condição |
| 8 | Empreendimentos | `/empreendimentos/` | todo usuário ativo |
| 9 | Faixas de VGV | `/faixas/` | `perfil === "gerente_geral"` |
| 10 | Pontos | `/programa/` | `perfil === "gerente_geral"` |
| 11 | Plantão | `/plantao/` | `plantao.registrar` ou `lancamentos.registrar` |
| 12 | Recepção | `/recepcao/` | `plantao.atendimentos` |
| 13 | Parceiros | `/parceiros/` | `parceiros.cadastrar` ou `parceiros.ver_todos` |
| 14 | Meus pontos | `/meus-pontos/` | não é gerente geral e tem `leads.cadastrar` |
| 15 | Ranking | `/ranking/` | todo usuário ativo |
| 16 | Usuários | `/usuarios/` | `usuarios.gerenciar` |
| 17 | Equipes | `/equipes/` | `equipes.gerenciar` |
| 18 | Fila de leads | `/fila/` | distribuição ligada **e** (recebe com fila visível, ou tem equipe, ou é gerente geral) |
| 19 | Distribuição | `/distribuicao/` | gerente geral e distribuição instalada |
| 20 | Configurações | `/configuracoes/` | gerente geral |

- "Faixas de VGV" é regra fixa por perfil (comentário no código: "não é permissão do catálogo").
- Ícone de cada item: `nomeDoIcone(href, rótulo)` (`components/icones-menu.tsx:257`). Pega o trecho de rota mais específico que tiver desenho. Sem desenho, usa "outro". São 25 desenhos: fila, distribuicao, lista, inicio, leads, quadro, agenda, painel, vendas, metas, empreendimentos, simulador, faixas, programa, plantao, recepcao, parceiros, ranking, usuarios, equipes, configuracoes, conta, sair, site, linktree, mais "sanduiche" (o botão de recolher). Os desenhos são do Lucide (licença ISC).

### Cabeçalho (`components/cabecalho.tsx`)
- Barra fixa (`fixed`, vidro com desfoque). Altura reservada de 61px no celular e 64px no computador.
- **Logo** "Base360 · Vendas" (`LockupVendas`), que leva a `/` (`aria-label="Base360 Vendas, início"`).
- **Atalhos externos**, iguais para todos os perfis (`ATALHOS`, `cabecalho.tsx:159`), abrem em outra aba (`target=_blank rel=noopener`) com "↗" e o texto de leitor de tela "(abre em outra aba)":
  - Simulador, `mbigucci.com.br/ferramentas`;
  - Site MBigucci, `mbigucci.com.br`;
  - Linktree, `linktr.ee/construtoraMBigucci`.
- **Botão de recebimento** (`extra`, `BotaoRecebimento`): botão pequeno com o estado da distribuição, mais a posição na fila. Só existe se a pessoa recebe leads, a distribuição está ligada e o modo não é "gerentes". Abre uma `Folha`. Rótulos possíveis:
  - "Receber leads";
  - "! Faça check-in";
  - "! Fora do stand";
  - "→ Em visita";
  - "! Sem sinal";
  - "– Fora do horário";
  - "✓ Recebendo";
  - "✓ Na vez do stand";
  - "✓ De plantão";
  - "– Pausa" ou "– Pausa até dd/mm";
  - "– Fora da distribuição".
- **Menu da conta (só computador, `hidden lg:block`):** botão "{apelido ou primeiro nome} ▾". Abre painel de 240px com nome completo, link "Minha conta" e "Sair". Fecha com Escape (devolve o foco ao botão), clique fora (`pointerdown`) ou mudança de rota.
- **Menu do celular (só abaixo de `lg`):** botão hambúrguer, com "Abrir menu" ou "Fechar menu" e `aria-expanded`. Abre painel escuro abaixo da barra, com altura máxima `calc(100dvh-60px)` e rolagem, contendo:
  1. todos os itens do menu (alvo mínimo de 48px);
  2. bloco "Atalhos" (os três externos);
  3. nome completo, "Minha conta" e "Sair";
  4. logo MBigucci no fim.
  - Fecha com Escape ou ao navegar.
- **Atalhos fora do menu:** o computador mostra os atalhos externos no cabeçalho, ao lado do logo, e **não** os repete na lateral. No celular eles ficam dentro do menu.
- O cabeçalho sem `itens` (tela de login) mostra só o logo.

### Barra lateral (`BarraLateral`, só computador)
- Aparece a partir de 1024px (`lg`). Fixa à esquerda, abaixo do cabeçalho. **180px aberta, 64px recolhida.**
- Topo: botão "Recolher barra" / "Expandir barra" (`aria-expanded`, ícone de sanduíche).
- Lista só dos destinos do CRM (sem atalhos externos e sem a conta). Só a lista rola, sem barra de rolagem visível.
- Rodapé: logo MBigucci, escondido quando recolhida.
- **Recolhida:** só os ícones. O rótulo continua acessível (fora da tela) e aparece uma dica (`.dica-lateral`) ao passar o mouse ou focar.
- A escolha é salva no aparelho (`localStorage`, chave `mbigucci-crm-barra`, `lib/barra.ts`). Fica no atributo `data-barra` do `<html>`. Sem armazenamento, começa aberta.
- A área principal ganha `padding-left` igual à largura da barra. Rodapés fixos de telas também começam depois dela.

### Aparência (`components/aparencia.tsx`, `lib/aparencia.ts`)
- Cartão "Aparência" em Minha conta. Texto: "Automático acompanha o tema do aparelho. Sua escolha fica neste aparelho."
- `<select>` com **Automático**, **Claro**, **Escuro**.
- Guarda em `localStorage` (`mbigucci-crm-aparencia`). Aplica `data-tema` e `data-aparencia` no `<html>` e atualiza a `meta theme-color` (`#151619` no escuro, `#f7f6f2` no claro).
- Automático acompanha `prefers-color-scheme` e reage à mudança do sistema e a outras abas (`storage`).

### Avisos sem conexão e "Avisos neste aparelho"

**`AvisoOffline` (`components/aviso-offline.tsx`)**
- Região `role="status"` sempre montada.
- Offline mostra: "! Sem conexão. Nada é gravado no Base360 até a internet voltar."
- Flutua sem deslocar a tela: canto superior direito no computador (máx. 360px) e logo abaixo do cabeçalho no celular. Não toma foco.
- Não existe fila offline: cada ação grava direto no Supabase.

**`AvisosNesteAparelho` (`components/avisos-aparelho.tsx`)** — o cartão em Minha conta que liga e desliga o push neste aparelho.
- **Texto fixo:** "O Base360 Vendas avisa no celular, mesmo fechado, na hora de cada contato e de cada visita. Escolha o que quer receber. Vale só para este aparelho." Segue o aviso do iPhone: "os avisos só funcionam com o Base360 instalado na Tela de Início (Safari > Compartilhar > Adicionar à Tela de Início), no iOS 16.4 ou mais novo."
- **Estados de disponibilidade:**
  - "Carregando…";
  - `iphone-instalar`: "! Abra o Base360 pelo ícone da Tela de Início para ligar os avisos.";
  - `sem-suporte`: "! Atualize o iPhone para o iOS 16.4 ou mais novo." ou "! Este navegador não aceita avisos. No celular, use o Chrome.";
  - `sem-chave`: "! Os avisos ainda não foram configurados no Base360 Vendas.";
  - `ok`: "✓ Ligados neste aparelho" ou "– Desligados neste aparelho".
- **Caixas "O que avisar"**, filtradas pelas permissões (`lib/avisos.ts`):

| Rótulo | slug | Explicação na tela | Exige |
|---|---|---|---|
| Próximo contato | `contato` | Na hora que você marcou para falar com o cliente. | — |
| Lead da empresa | `atribuido` | Quando o gerente passa um lead para você. | — |
| Prazo de 15 min | `prazo` | Quando faltam 5 min para o primeiro contato e quando o prazo estoura. | — |
| Visitas | `visita` | Cerca de 1 hora antes e, no fim do dia, as que aguardam baixa. | — |
| Resumo do dia | `resumo` | Na abertura do atendimento (9h): atrasados, contatos de hoje, visitas, quem aguarda o primeiro contato e os aniversários de clientes. | — |
| Equipe | `equipe` | Quando um lead da empresa estoura o prazo de 15 min e, no fim do dia, as visitas da equipe que aguardam baixa. | `dados.ver_equipe` |
| Parceiros | `parceiros` | Parceiro novo para você, parceiro que procurou de novo, próximo contato do dia e quando faltam 10 dias para perder o parceiro. | `parceiros.cadastrar` |

- **Botões:** "Ligar avisos" (vira "Ligando…"; desabilitado sem nenhum tipo marcado), "Enviar teste", "Desligar neste aparelho". Mudar uma caixa com o aparelho ligado grava os tipos na hora.
- **Mensagens:**
  - "Avisos ligados. Use Enviar teste para conferir.";
  - "Avisos desligados neste aparelho.";
  - "Teste enviado. Ele chega em alguns segundos.";
  - "Este aparelho saiu da lista de avisos. Ligue de novo.";
  - "O serviço de avisos recusou o envio. Desligue e ligue de novo.";
  - "Não foi possível falar com o serviço de avisos. Tente de novo.";
  - "Permissão não concedida.";
  - bloqueio: texto próprio para iPhone ("Ajustes > Notificações > Base360 > Permitir Notificações"), Android ("Segure o ícone do Base360 > Informações do app > Notificações > Permitir") e computador ("cadeado ao lado do endereço > Permissões > Notificações > Permitir").
- **Comportamento extra** (`lib/push.ts`, `sessao.tsx`):
  - Ao abrir o CRM logado, `sincronizarAvisos` renova o `visto_em` do aparelho. A tela fala em sair da lista sem abrir por 60 dias.
  - Se as chaves VAPID mudaram, corta a assinatura antiga. A pessoa liga de novo.
  - Ao clicar "Sair", `esquecerEsteAparelho` apaga a assinatura e `limparTodosRascunhos` apaga os rascunhos do `sessionStorage`.

### Folha (`components/folha.tsx`)
- **O que é:** popup via portal no `<body>`, com `role="dialog" aria-modal`.
  - **Celular:** sobe do rodapé, com cantos superiores arredondados e uma alça no topo.
  - **Computador:** centralizada, largura máxima 440px.
- **Fecha com:** Escape, clique no fundo ou o botão "Fechar". O foco volta a quem abriu. Altura máxima 85dvh, com rolagem.
- **Props:** `titulo`, `onFechar`, `children`, `eyebrow?`.
- **Onde é usada (3 arquivos, 11 usos):**
  - `components/distribuicao/recebimento.tsx`: folhas de estado, fila, saída e primeira vez;
  - `components/distribuicao/partes.tsx`;
  - `app/fila/page.tsx`.
- Nenhuma tela de Usuários, Equipes ou Configurações usa Folha. Elas editam inline no cartão.

### Atalhos de teclado
Busca em todo `crm/src` (`keydown`, `onKeyDown`, `Escape`, `accessKey`):

| Onde | O que |
|---|---|
| `cabecalho.tsx:109` (`useEscape`) | Escape fecha o menu da conta e o menu do celular, devolvendo o foco |
| `folha.tsx:31` | Escape fecha a Folha |
| `app/recepcao/page.tsx:131-147` | **Alt+N, Alt+C, Alt+P, Alt+R** escolhem o tipo de cliente (letras vêm de `TIPOS_CLIENTE[].tecla`); **Alt+V** foca o campo "Pôr na vez"; **Alt+K** foca o nome do cliente (`#c-nome`). Só no PC. |
| `components/recepcao/busca-pessoa.tsx:83` | combobox: Seta para baixo e para cima, Enter (com lista aberta) e Escape |
| `components/recepcao/cliente.tsx:286` e `:314` | grupo de tipos com setas (direita/baixo avança, esquerda/cima volta, circular entre 4) e Enter no campo de retorno |

`accessKey`: não existe. `<dialog>` nativo (usado em `leads/mensagem.tsx`) fecha com Escape pelo navegador, sem código. **Busca global e criação rápida: não existem.** Só há buscas locais (Usuários, Leads, Parceiros, busca de pessoa na recepção).

---

## 10. Peças que se repetem e peças improvisadas

### 10.0 Visão geral

**O núcleo que se repete no app inteiro**
- **Casca e navegação:** `Casca` (cabeçalho, barra lateral, menu do celular, bloqueio por permissão), aviso sem conexão.
- **Blocos e controles básicos:**
  - cartão (`.card`, com barra de destaque `.bar-brand`);
  - botão principal, secundário e grande;
  - campo com rótulo (`.field-label` + `.input`) e caixa de marcar;
  - selo de estado com glifo e palavra (`.selo`);
  - mensagens de erro e de sucesso (`.aviso-erro`, `.aviso-ok`);
  - link de ação com "→" e rótulo pequeno acima do título (`.eyebrow`).
- **Barras fixas:**
  - ação fixa no rodapé do celular (`RodapeAcao`);
  - "Desfazer" de 8 s (`AvisoDesfazer`).
- **Popups e campos:** Folha; diálogo de mensagem pronta (`DialogoMensagem`); campo de próximo contato com atalhos de dia (`CampoProximoContato`).
- **Cards de leads e visitas:** `CardLead`, `CardVisita` e `ListaVisitas`.
- **Contato:** botões WhatsApp e Ligar.
- **Números e tabelas:**
  - navegador de período "← Anterior · rótulo · Seguinte →" com "Voltar para hoje";
  - tabela em cartão com rolagem lateral e linha "Equipe" ou "Total";
  - número clicável que abre a lista;
  - barra de progresso.
- **Filtros e catálogo:** filtros em `select` com busca; lista de empreendimentos (`datalist`) com o aviso "Não está no catálogo".
- **Gravação:** rascunho no aparelho com id gerado no aparelho.

**Improvisações e inconsistências que o design system precisa resolver**
1. **Três jeitos de popup:** a `Folha` por portal (só na distribuição), o `<dialog>` nativo (mensagem do WhatsApp e editores do Marketing) e a edição dentro do próprio cartão (usuários, equipes, mensagens prontas, painéis do card de visita, registrar interação no card do parceiro).
2. **Botão de escolha (opção ou chip) reescrito em mais de dez lugares**, sem componente comum:
   - temperatura, tipo de interação, origem, atalhos de dia, modelos de mensagem, correção de visita;
   - tipo de cliente, "Como conheceu", filtros e regiões de parceiros;
   - período, modo da distribuição, chips do Direcionador.
   - `.opcao` só garante o alvo de 44px. A temperatura usa `role="radio"`, e os outros usam `aria-pressed`.
3. **Confirmação em cinco estilos:**
   - "Desfazer" de 8 s (etapa, descarte, cancelar visita, metas, aprovação, plantão, vez da recepção);
   - segundo toque no mesmo botão (WhatsApp duplicado);
   - confirmação em dois passos na própria linha (remover documento, excluir equipe, excluir regra ou destino);
   - painel com motivo obrigatório (vendas, recusa de lançamento, correção de visita e da recepção);
   - nenhuma confirmação (baixa de visita, reativar, temperatura, permissões, desativar usuário, excluir faixa, aplicar a importação, fechar o mês).
   - O "Desligar" da distribuição é a única confirmação com texto explicando o efeito.
   - Há dois relógios de 8 s separados: `AvisoDesfazer` e o Anuncie da recepção.
4. **Glifo de erro:** "!" em leads, gestão, entrar, conta e administração; "✕" em recepção, parceiros, distribuição e Marketing.
5. **Carregando e vazio:**
   - O carregamento é o texto "Carregando…" escrito em cada tela (cerca de 60 vezes), em cores diferentes, sem skeleton.
   - O estado vazio também é escrito tela a tela. O Marketing tem uma classe `.vazio` que o Vendas não tem.
6. **Ligar e desligar:** interruptor `role="switch"` em `/distribuicao/` e no Marketing; caixa de marcar em mensagens prontas e permissões.
7. **Navegador de período:**
   - `NavMes` é reaproveitado em 3 telas.
   - Painel, vendas, metas, faixas e plantão têm cópias.
   - O plantão usa só "←" e "→".
8. **Edição em linha:** a linha "valor + Salvar + ✓ Salvo" tem três implementações (meta anual, faixas, critérios). O campo em R$ tem um componente (`CampoReais`) e três cópias.
9. **Barras e destaques escuros:**
   - A barra de progresso tem um componente (`Barra`) e cópias sem `role="progressbar"` (pontos, "já pago").
   - Há dois destaques escuros diferentes: o bloco `.veredito` e a faixa do cartão da meta anual.
10. **Tabelas e selos:**
    - Nenhuma tabela é componente. A fila do gerente tem tabela e lista duplicadas para computador e celular.
    - Há dois componentes diferentes chamados `SeloStatus`, um para lançamento e outro para empreendimento.
11. **Permissão "OU":** a `Casca` só aceita uma permissão, então parceiros usa um embrulho próprio (`ComPermissao`).
12. **Abas e recolhíveis:**
    - Abas existem só na recepção, feitas à mão.
    - O recolhível é `<details>` em cinco lugares e um botão com `aria-expanded` em outros (canceladas, Radar, fila da roleta, avançadas).
13. **Estado na URL:** só em painel, vendas, metas, agenda e as fichas. Os filtros de Leads, Quadro e Parceiros não ficam na URL.
14. **Texto técnico na tela do usuário:**
    - "Rode o schema.sql atualizado no Supabase…";
    - "Confira se ela foi publicada no Supabase (README, passo 3)";
    - o cartão "Supabase não configurado".
15. **"Todos" e "Todas"** aparecem misturados nos filtros.
16. **Casca copiada:** o Marketing copia a casca, o cabeçalho, a barra lateral e o aviso de conexão do Vendas. Não há pacote compartilhado de componentes, só o de tokens (`marca/tokens`).

### 10.1 Leads e atendimento

- `CardLead` (`cl/partes.tsx`): usado em Lista do dia, Leads e retornos da Agenda. Duas variações: com `onToque` (Lista do dia e Agenda) e sem.
- `CampoProximoContato` (`cl/partes.tsx`): atalhos de dia, data e hora. Usado em Registrar interação, Novo lead, Agendar visita e Remarcar.
- `RodapeAcao`: Lista do dia, Leads, Novo lead, ColarMensagem.
- `AvisoDesfazer`: ficha (etapa, descarte) e `CardVisita` (cancelar).
- Selos com sinal, palavra e cor: `SeloTemperatura`, `SeloVisita`, `SeloCampo`, `SeloDoPrazo`, `SeloADetalhar`, `SemContato`, `ProximoContato`.
- `Filtros` e `useLeadsVisiveis`: Leads e Quadro.
- `BotaoMensagem` e `BotaoLigar`: cards, ficha, aniversário, visita, Radar.
- `ListaVisitas` e `CardVisita`: Lista do dia, Agenda, Ficha.
- `ListaEmpreendimentos` e `ConferirNoCatalogo` (fora da área): cadastro, perfil e agendamento.
- Aviso de duplicado: `textoDuplicado` no cadastro e em `DigitarWhatsapp`.
- Padrões de mensagem: `aviso-erro` ("! …") e `aviso-ok` ("✓ …"). Texto "Carregando…" repetido em todas as telas.

**Improvisadas**

- **Botões de opção em segmento.** O padrão "marcado = `border-ink bg-ink text-surface`" é reescrito, sem componente comum, em seis lugares: `EscolhaTemperatura` (usa `role="radio"`), tipos de interação em `ficha/page.tsx`, origem em `novo/page.tsx`, atalhos de dia (`CampoProximoContato`), modelos em `mensagem.tsx`, status em `Corrigir` (`cv`), e `Sugestao` em `novo`. Os outros usam `aria-pressed`, só a temperatura usa `radiogroup`.
- **Confirmação:** há quatro estilos diferentes.
  - Desfazer em aviso fixo (etapa, descarte, cancelar visita).
  - Segundo toque no mesmo botão (duplicado em Cadastrar e em Salvar WhatsApp).
  - Confirmação inline com texto "✕ Remover este arquivo?" (documento).
  - Nenhuma confirmação (baixa de visita, Reativar, temperatura, Registrar interação).
  - Não existe `confirm()`, modal de confirmação nem `window.alert` nesta área.
- **`Descartar`** (`ficha/page.tsx`): painel inline que troca o botão por uma grade de 6 motivos; é o único jeito de escolher um motivo, e descarta no clique, sem passo de confirmação além do Desfazer.
- **Painéis do card de visita** (Remarcar, Anotar, Corrigir): abrem dentro do próprio card (`div` com `border-t`), não em modal.
- **`EscolherCliente`** (`app/agenda/page.tsx`): lista pesquisável de clientes, existe só na Agenda; é um seletor próprio (botões em `ul`).
- **Tabela "Por corretor"** (`leads/page.tsx`): a única `<table>` da área, com estilo inline e sem componente de tabela.
- **Bloco `veredito`** da Lista do dia: bloco escuro de resumo que existe só ali. O cartão de aniversário também é um `li.card` próprio, que não usa `CardLead`.
- **Linhas `dt/dd` duplicadas:** `Linha` em `ficha/page.tsx` e o mesmo bloco dentro de `DadosDoCliente` em `perfil.tsx`.
- **`DigitarWhatsapp`:** mini-formulário embutido no card de cabeçalho da ficha, com seu próprio aviso `role="alert"`.
- **`<details>` como único recolhível:** "Mais detalhes (opcional)" no cadastro e "Perfil do cliente (opcional)" na ficha. Nenhuma outra tela usa abas ou acordeões.
- **`<dialog>` nativo:** só em `DialogoMensagem`. O resto usa folhas (`components/folha.tsx`, da distribuição, fora da área).
- **Botão-card "+ Colar mensagem":** é um `button.card`, padrão que não aparece em mais nenhum lugar.
- **Mensagem "Voltar para hoje" duplicada** na Agenda para esconder uma cópia em cada tamanho (`hidden md:inline` e `md:hidden`).
- **Persistência local, em três mecanismos:** `localStorage` (ordem da lista, última origem), `sessionStorage` (rascunhos: novo lead, interação, perfil, venda; apagados no "Sair" por `limparTodosRascunhos`) e caches em módulo (catálogos, horário e modelos de mensagem, carregados uma vez por sessão do navegador).
- **Estado na URL:** só a Agenda (`?d=`, `?c=`) e a ficha (`?id=`, `#registrar`). Filtros e busca de Leads e Quadro não ficam na URL.

#### Pontos de atenção para o design system
- A temperatura "Quente" é neutra (`text-ink`) desde 06/11/2026. O vermelho fica só para urgência e ação.
- O sinal "!" (alerta) e "✓", "✕", "→", "○", "–" são texto, não ícones. O estado nunca depende só da cor.
- A barra vermelha (`bar-brand`) aparece uma vez por tela, no primeiro card do primeiro grupo (Lista do dia) ou no primeiro cartão urgente da coluna (Quadro).
- Gravações têm tratamento próprio de rede: o toque (WhatsApp ou Ligar) grava sem esperar e nunca dá erro. Os demais usam `erroAoSalvar` (com ou sem rascunho).
- O sinal de "sem conexão" é o `AvisoOffline` global do cabeçalho, mais o texto de erro de cada gravação (`erroAoSalvar`).

### 10.2 Gestão, vendas, metas, pontos e catálogo

| Peça | Onde | Arquivo |
|---|---|---|
| Navegador de período "← Anterior · rótulo · Seguinte →" (+ "Voltar para hoje") | painel, vendas, metas (ano), faixas, ranking, programa, meus pontos. Em plantão a versão é "←" e "→" | `NavMes` em `comp/programa/partes.tsx:16` é a única reutilizada (ranking, programa, meus-pontos). Painel, vendas, metas, faixas e plantão repetem o mesmo JSX à mão. |
| Botões segmentados Período (`aria-pressed`, `-ml-px`) | painel, vendas | cópias em `app/painel/page.tsx:259` e `app/vendas/page.tsx:83`; em `FormMeta` é variante `opcao` em grade 3 colunas |
| Tabela card + `overflow-x-auto` + linha "Equipe" ou "Total" | painel (6 tabelas), metas, faixas | `className="card tabela-painel overflow-x-auto p-0"`, repetido; só `TabelaMetaAnual` e `TabelaStand` são componentes |
| Número clicável que abre a lista (zero não abre) | painel | `Numero` |
| Ranking e lista com selo "Você" | ranking | página |
| `SeloStatus` de lançamento e `SeloStatus` de empreendimento | programa, plantão, aprovação | **dois componentes com o mesmo nome**: `comp/programa/partes.tsx:44` e `comp/empreendimentos/partes.tsx:32` |
| `SeloVenda` | vendas | `comp/vendas/vendas.tsx:24` |
| `ResumoVendas` (3 blocos) | painel (relatório), vendas | `comp/vendas/vendas.tsx:548` |
| `Barra` de progresso | metas, painel | `comp/metas/metas.tsx:32`; a barra de pontos em meus-pontos e a barra "já pago" em `ResumoVendas` são cópias improvisadas |
| `CartaoMetaAnual` e `TabelaMetaAnual` | painel, metas (e lista do dia) | `comp/metas/metas.tsx` |
| `AvisoDesfazer` (8 s) | metas, aprovação, plantão | `comp/leads/partes.tsx:399` (fora da área) |
| `RodapeAcao` (botão fixo no celular, estático no desktop) | vendas, empreendimentos, editar, importar | `comp/leads/partes.tsx:383` |
| Campo de dinheiro com "R$" à esquerda e `lerReais` | vendas, metas, faixas, editar | `CampoReais` em vendas.tsx; versões em linha (cópias) em `app/metas/page.tsx` (`LinhaMeta`), `app/faixas/page.tsx` e `comp/metas/metas.tsx` |
| Linha "label + valor + Salvar" com "✓ Salvo" ou "! erro" | metas (`LinhaMeta`), faixas (`LinhaFaixa`), programa (`LinhaCriterio`) | três implementações separadas |
| Painel inline com motivo obrigatório | vendas (`Motivo`, `Corrigir`), aprovação (barra de recusa) | separadas |
| Card de dado "rótulo pequeno + número grande + nota" | painel (`ResumoConversao`, `VisitasDoCorretor`, 5 blocos), metas (`Dado`) | JSX repetido sem componente |
| `aviso-erro` com "! " ou "✕ " (variam), `aviso-ok` com "✓ " | todas | classes CSS; o sinal é escrito à mão em cada ponto |
| Padrão de carregamento "Carregando…" (`text-concrete` ou `text-ink-soft`) | todas | sem componente; a classe de cor varia entre telas |
| Datalist de empreendimentos e aviso "! Não está no catálogo…" | vendas, ficha | `ListaEmpreendimentos`, `ConferirNoCatalogo` |
| Botões `BotoesEmpreendimento` e `BotaoMandar` | catálogo, ver | `comp/empreendimentos/partes.tsx` |
| Cards de motivos do Radar (`Motivos`) | ver, ficha | `comp/empreendimentos/partes.tsx` |

**Improvisadas**

- **Barra de ação fixa de aprovação em lote** (`app/programa/aprovacao/page.tsx:202`): `fixed inset-x-0 bottom-0` própria, não é `RodapeAcao`. Duplica o `AvisoDesfazer`, que fica no mesmo lugar (a barra some quando há aviso).
- **Faixa escura do `CartaoMetaAnual`** (`bg-band p-4 text-on-dark`) e o card `veredito` (síntese do painel e bloco destacado de `ResumoVendas`): dois jeitos de fazer destaque escuro.
- **Barra de pontos com marcador do mínimo** (`app/meus-pontos/page.tsx:69`): `<div>` direto, sem `role=progressbar` (é `aria-hidden`), diferente de `Barra`.
- **Bloco `<details>` "+ Valor por corretor"** (`app/metas/page.tsx:114`): único uso de `<details>` na área.
- **Seção recolhível "Ver as canceladas"**: botão com `aria-expanded` próprio em `app/vendas/page.tsx:169`; não há padrão de recolher. O Radar tem "Ver todos" e "Ver menos" parecido, mas separado.
- **Diálogo de mensagem** (`DialogoMensagem`) usado em `BotaoMandar`: é o único modal real da área, e vem de `comp/leads/mensagem`.
- **Input de arquivo escondido (`sr-only`) com rótulo de link** (`importar/page.tsx:140`): único upload.
- **Rascunho no aparelho** (`lib/rascunho.ts`): só em registrar venda.
- **Lista de leads do painel** (`ListaLeads`): lista própria com `scrollIntoView`; parecida com a lista de leads, mas separada.
- **Inconsistências a normalizar:**
  - Rótulos "Todas" (Situação, Equipe, Semana) e "Todos" (Corretor, Critério, filtros do catálogo).
  - Ordem "← Anterior" e "Seguinte →" com rótulos de texto, mas só "←" e "→" no plantão.
  - O texto "! {erro}" e "✕ {erro}" para erros em lugares equivalentes.
  - Sem confirmação na exclusão de faixa, na exclusão de tipologia, no "Voltar ao padrão", no "Fechar de novo" e no aplicar do importador. Só meta tem "Desfazer".
  - Cores de carregamento (`text-concrete` ou `text-ink-soft`).
  - O estado "Carregando…" é texto puro em todas as telas.

**O que não existe nesta área**

- Exportação: Excel, CSV, PDF gerado ou "copiar". Só a impressão do painel e o `.md` de instruções do importador.
- Gráficos (barra, linha, pizza), calendários, abas, paginação visual, ordenação de colunas.
- Modais de confirmação. O único diálogo de modal desta área é `DialogoMensagem`.
- Dividir venda, participantes de venda, pedido de registro, vendedor externo e comissão: só desenho (`docs/vendas-participantes.md`), nada no código.
- Botão "Lead perdido" nas telas desta área: está só na ficha do lead.
- Estado "sem conexão": o aviso global do cabeçalho (`AvisoOffline`) vale aqui também. Nas gravações desta área o erro vem de `mensagemErro` ("Sem conexão com o servidor. Tente de novo."), no mesmo lugar do erro. Não há fila de reenvio, só o rascunho de venda e o id idempotente.
- Skeletons: o carregamento é sempre o texto "Carregando…".

Arquivos lidos (todos em `C:\Projects\CRM MBigucci\crm\src\`): as 13 rotas e 4 componentes pedidos, as 12 libs pedidas, e também `components/casca.tsx`, `lib/erros.ts`, `lib/leads.ts` (MOTIVOS_DESCARTE), `lib/match.ts` (constantes de nota), `components/leads/partes.tsx` (`AvisoDesfazer`, `RodapeAcao`), `components/recepcao/painel-stand.tsx` (colunas), `app/globals.css` (impressão) e `../supabase/schema.sql` (perfis, permissões, etapas, origens, faixas, critérios).

### 10.3 Recepção, parceiros e distribuição

- **Casca** (`comp/casca.tsx`): cabeçalho, menu, bloqueio por permissão e as folhas da distribuição.
- **Folha** (`comp/folha.tsx`): popup que sobe do rodapé no celular e fica centralizado no PC (máx. 440 px). Fecha por Escape, fundo ou "Fechar", e devolve o foco. Usada em `EscolherCorretor`, `MenuCorretor` e todas as folhas de recebimento.
- **Card** (`.card`, `.bar-brand`), `.eyebrow`, `.titulo-card`, `.titulo-secao`, `.selo`, `.btn` (`btn-red`, `btn-ghost`, `btn-lg`), `.field-label`, `.input`, `.aviso-erro`, `.aviso-ok`, `.link-acao`, `.opcao` (botão de escolha, `aria-pressed`) e `.num`.
- **Chips de escolha** (botão `aria-pressed`, ativo com fundo escuro):
  - tipo do cliente, "Como conheceu", "Veio sozinho", "Sozinho";
  - Opcao de parceiros (filtros, tipos, regiões, atalhos de 7, 15 e 30 dias);
  - período, Sim e Não de "Tem especialista", Modo.
- **Interruptor** (`role=switch`, `Interruptor` em `app/distribuicao/page.tsx`): usado só em `/distribuicao/`.
- **Escopo** (`Escopo` em `comp/distribuicao/partes.tsx`): selo "Sua equipe · X", "Empresa toda". Usado em `/fila/` e `/distribuicao/`.
- **Fila numerada com sinal** (ordinal, nome e sinal curto): em `/fila/`, `FolhaFila` e "Equipes" (`/fila/`, `/distribuicao/`).
- **Lista com `<details>`/expansão por toque:** "Hoje" da fila, `LinhaChave`, `Historico`, "Avançadas" e o `<details>` do `TabelaStand`.
- **`RodapeAcao`** (`comp/leads/partes.tsx`): barra fixa no celular e estática no PC. Usada em `/parceiros/`, `/parceiros/novo/` e `/parceiros/evento/`.
- **`AvisoDesfazer`** (barra escura com "Desfazer", 8 s): usada na vez da recepção.
- **Rascunho no aparelho** (`lib/rascunho.ts`) com id gerado no aparelho (`novoId`): interação, novo parceiro e evento em lote.
- **Cadastro de pessoa:** `BuscaPessoa` (combobox) na recepção.
- **Selos e trilhas de parceiros:** `SeloPrazo`, `TrilhaEstagio`, `ProximoContatoParceiro`, `TextoPrazo` (`comp/parceiros/partes.tsx`).
- **Duas listas da vez:** a mesma `CartaoVez` para corretores e especialistas.
- **Bloco "Resultado/Erro" repetido:** `Retorno` no recebimento e o par de `aviso-ok`/`aviso-erro` nas telas.
- **Hooks de dados:** `useAtualizar` (15 s) na recepção, 60 s nas filas e no "A distribuir", 1 min no estado da distribuição.

**Improvisadas**

- **`ComPermissao`** (`comp/parceiros/partes.tsx`): a `Casca` só aceita uma permissão em `exige`, então as telas de parceiros usam um embrulho próprio para o "OU" (`parceiros.cadastrar` ou `parceiros.ver_todos`). O texto repete o da `Casca`. O comentário no código diz isso.
- **`LinhaNome`, `LinhaStand` e `NovoNome`** (`app/recepcao/stands/page.tsx`): edição em linha feita só ali (renomear, ativar e criar), com `update` e `insert` direto na tabela, fora do padrão de RPC do resto da recepção.
- **Cabeçalho de impressão** (`so-impressao`, `sem-impressao`, `titulo-impressao`): só no relatório do stand (e no painel).
- **`useNomes`** (`app/recepcao/relatorio/page.tsx`): busca nomes direto em `profiles`, `especialistas` e `parceiros` pelo id. Só existe aí.
- **Abas feitas à mão** na recepção (`role=tablist`, "No stand" e "Clientes · n" e as abas de turno) e `TabelaFila`/`ListaFilaCelular`: tabela e lista duplicadas para PC e celular.
- **`ContatosDoDiaParceirosNoInicio`** (`comp/parceiros/contatos-do-dia.tsx`): versão para a tela inicial, usada no Início (`app/page.tsx:31`) para quem tem `parceiros.cadastrar`. É uma segunda versão do mesmo bloco de `/parceiros/`.
- **`recepcao_checkins`** (função no `distribuicao.sql`): existe e dá a recepção ver quem fez check-in no stand, mas nenhum arquivo do `crm/src` a chama.
- **`Opcao`** (parceiros) e os botões de escolha da recepção são o mesmo desenho escrito duas vezes (um componente em parceiros, `clsx` solto na recepção).
- **O cartão Anuncie** tem 8 s de Desfazer escritos no próprio componente (`SEGUNDOS = 8`), enquanto o `AvisoDesfazer` tem a constante `SEGUNDOS_DESFAZER = 8` em outro arquivo. São dois relógios com o mesmo número.

**O que não existe nesta área**

- Exportação para planilha ou PDF (só impressão do relatório do stand).
- Botão de WhatsApp ou ligação na recepção e na distribuição. Em parceiros existe só "Abrir WhatsApp" (link `wa.me/55…`). Não há botão de ligar.
- Tela de edição do horário de atendimento (`horario_atendimento`) e dos limites `minutos_sem_sinal` e `minutos_plantao` nesta área.
- Criar ou reordenar mídias "Como conheceu" pela tela.
- Estágios "Indicou" e "Vendeu" ativos nos parceiros.
- Plano B do check-in com selfie, períodos de check-in e aprovação do gerente (colunas existem como "Etapa 2", sem tela).
- Tela offline ou fila de gravações sem internet.
- Menção ao destino confidencial de leads: não encontrei nos arquivos desta área. Se aparecer em outra área, deve ser chamado de "Distribuição manual".

### 10.4 Plataforma e classes do CSS

Contagem de usos nos `.tsx` do CRM (aproximada, por `grep`).

#### Peças funcionais definidas em CSS

| Classe | O que é | Usos |
|---|---|---|
| `.card` (+ `.bar-brand`) | contêiner de bloco; `.bar-brand` destaca o cartão em foco ou em erro | ~162 / 33 |
| `.btn` + `.btn-red` | botão primário, uma por grupo | ~48 |
| `.btn` + `.btn-ghost` | botão secundário | ~128 |
| `.btn-lg` | botão grande | ~56 |
| `.field-label` | rótulo de campo | ~175 |
| `.input` | campo de texto, select, textarea, time, number | ~280 |
| `.checkbox` | caixa de marcar | ~27 |
| `.eyebrow` | rótulo pequeno acima de título | ~109 |
| `.titulo-pagina`, `.titulo-card`, `.titulo-secao` | hierarquia de títulos | 6, 82, 27 |
| `.num` | número tabular (Inter) | muito |
| `.selo` | etiqueta de situação ou perfil, texto com glifo | ~39 |
| `.aviso-erro`, `.aviso-ok` | linha de mensagem de erro ou sucesso | ~104, ~26 |
| `.link-acao` | link com "→" | ~66 |
| `.veredito` | faixa de síntese com barra de destaque | só 3 |
| `.opcao` | **só define alvo mínimo de 44px abaixo de 768px**; o desenho de cada controle de escolha fica no componente | ~15 |
| `.focus-ring` | anel de foco de teclado | ~328 |
| `.aviso-conexao` | aviso offline flutuante | 1 componente |
| `.cabecalho-vidro`, `.botao-hamburguer`, `.menu-escuro`, `.item-menu`, `.item-lateral`, `.barra-lateral`, `.lista-lateral`, `.dica-lateral`, `.rodape-lateral`, `.divisoria-nav`, `.area-principal` | casca e navegação | 1 componente cada |
| `.etapa-entra` | transição entre etapas | poucos |
| `.so-impressao` e regras `@media print` | impressão do painel e do relatório | poucos |

`.btn-mini`, `.chip`, `.chave`, `.dialogo`, `.aviso-toast`, `.link-texto`, `.vazio` **não existem** em `crm/src/app/globals.css`. Estão só em `marketing/src/app/direcionador/direcionador.css`.

#### O que se repete no app inteiro
Cartão, botões vermelho e secundário, campo com rótulo, mensagem de erro ou sucesso, selo, link de ação, eyebrow, título de card, anel de foco, menu e casca. São o núcleo estável.

#### O que parece improvisado ou duplicado
- **Três mecanismos de popup.** (1) `Folha` por portal, usada só na distribuição; (2) `<dialog>` nativo no CRM, só em `components/leads/mensagem.tsx`, e também no Marketing (`.dialogo`); (3) formulário inline no cartão, em Usuários, Equipes e Mensagens prontas, sem popup.
- **`.opcao` não é uma peça.** São ~15 usos, cada um com `px`, `py`, tamanho de fonte e alinhamento próprios (`px-1 py-2`, `px-3 py-3`, `px-2 py-3`, `py-[11px]`…). Os botões de dia em Configurações usam `aria-pressed` sem `.opcao` (abaixo de 44px no celular).
- **Glifo de erro inconsistente.** Entrar, Conta, Usuários, Equipes e Configurações usam "!". Recepção, distribuição e Direcionador usam "✕". O aviso de sucesso é sempre "✓".
- **Confirmação de ação destrutiva inconsistente.** Só há dois fluxos de dois passos: Equipes ("Excluir" para "✕ Confirmar exclusão") e Direcionador ("✕ Excluir de vez"). Agem na hora, sem confirmação: desativar usuário, trocar perfil, redefinir senha, caixas de permissão, salvar horário, mensagens prontas, chave geral e interruptor de regra no Direcionador. Não há nenhum `confirm()`.
- **Estado de carregando.** "Carregando…" aparece ~61 vezes, em geral `text-concrete`. Em Configurações é `text-ink-soft` (8 ocorrências em todo o app).
- **Estado vazio sem peça.** Cada tela escreve o seu ("Ninguém encontrado.", "Nenhuma equipe ainda.", "Nenhum lead ativo."). No Marketing há uma classe `.vazio`, mas só lá.
- **Interruptor liga/desliga.** No CRM, "ligar/desligar" usa caixa de marcar (mensagens "Ligada", permissões). No Marketing existe `.chave` (`role="switch"`). Duas peças para a mesma função.
- **Campo de senha provisória em `type=text`** (visível) em Usuários, de propósito, para o gerente repassar a senha. É o único campo de senha em texto aberto.
- **Texto técnico na tela do usuário final:** "Rode o schema.sql atualizado no Supabase antes de salvar…" (Configurações, Mensagens) e "Confira se ela foi publicada no Supabase (README, passo 3)" (Usuários).
- **`Carregando…` e erro de carga dentro de cada tela**, sem um componente de estado da página.

---

## Anexo: divergências, correções e lacunas

**Onde o código difere do que se esperava**

- **Início.** Não existe redirecionamento para o painel. `ehListaDoDia(pode) = pode("leads.cadastrar") && !pode("leads.atribuir")` (`crm/src/components/casca.tsx:125`). Quem passa nessa regra (corretor, no padrão) vê "Lista do dia". Todos os outros veem "Início" (`app/page.tsx`), que é um conjunto de cartões de atalho. O comentário em `casca.tsx` ("Quem distribui fica com o painel") não corresponde ao que o código faz.
- **Dois critérios diferentes para "ver leads".** O menu usa `leads.cadastrar || dados.ver_equipe || dados.ver_todos` (`casca.tsx:65`). Os cartões do Início usam `leads.atribuir || dados.ver_equipe || dados.ver_todos` (`app/page.tsx`).
- **Bloqueio de tela.** Só mostra "! Seu perfil não tem acesso a esta página." a página com `exige` ou `soGerenteGeral` no `<Casca>`. As demais (`/leads/`, `/agenda/`, `/painel/`, `/vendas/`, `/metas/`, `/ranking/`, `/parceiros/`, `/plantao/`, etc.) abrem para qualquer perfil logado que digite o endereço. O menu apenas não mostra o item, e o RLS devolve zero linhas.
- **E-mail de login.** Não existe convite nem recuperação de senha por e-mail (detalhe na seção 5).
- **Busca global, criação rápida e atalho de teclado geral:** não existem.

**Correções feitas pela sessão master ao revisar os levantamentos**, conferidas na fonte em 06/11/2026:
- **Aviso sem conexão:** dois levantamentos diziam que não havia aviso global. Há: `AvisoOffline` é montado no `Cabecalho` (`components/cabecalho.tsx:290`) e aparece em todas as telas logadas.
- **Contatos de parceiros no Início:** um levantamento dizia que `ContatosDoDiaParceirosNoInicio` não era usado. É usado no Início (`app/page.tsx:31`), para quem tem `parceiros.cadastrar`.

**Lacunas**

- Não abri `lib/distribuicao-dados.ts` por inteiro (só o campo `temEquipe`) nem as telas de distribuição e fila, que estão fora da sua área.
- Não vi onde `leads.distribuir` é exigida nas telas.
- Os padrões de permissão são os do SQL. O banco em produção pode ter sido ajustado pelo gerente geral em Configurações.
- Não confirmei onde ocorre a transição "visto_em" de 60 dias no banco (o texto está em `lib/push.ts`, comentário de `sincronizarAvisos`).

- A distribuição automática e o Direcionador estão no código, mas não instalados. Os horários e avisos deles valem quando forem instalados.
- O sigilo do Direcionador está correto: o código não nomeia nenhum destino externo. Os nomes dos destinos vêm do banco.
