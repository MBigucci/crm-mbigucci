# Cobertura do Alicerce · todas as rotas, Marketing e Parcerias

**06/11/2026 · aprovada pelo Felipe no mesmo dia,** com as decisões da seção 7 e as correções de Parcerias da seção 4. As decisões também estão no brief `docs/codex-alicerce-vendas.md` (item 14).

**Sumário:**
- [1. Todas as rotas](#1-todas-as-rotas)
- [2. Páginas fora do Next](#2-páginas-fora-do-next)
- [3. Marketing](#3-marketing)
- [4. Parcerias](#4-parcerias)
- [5. Lacunas](#5-lacunas-sem-peça-no-alicerce)
- [6. Ordem da fase 2](#6-ordem-da-fase-2)
- [7. Decisões para o Felipe](#7-decisões-para-o-felipe)

**Como a lista foi feita:**
- Pelo código, com `find crm/src/app marketing/src/app discovery/src/app -name page.tsx`.
- Resultado: 35 páginas no `crm/`, 4 no `marketing/` e 1 no `discovery/`, 40 no total.
- A tabela abaixo tem as 40, com a `/` do Vendas em duas linhas (Lista do dia e Início).
- Também entram as 404 dos dois apps. Nenhum dos dois tem `not-found.tsx` nem `error.tsx`, então hoje aparece a página padrão do Next, em inglês.

**Legenda:**
- **Perfis:** Cor = corretor; Ger = gerente; GG = gerente geral; Op = operacional; Rec = recepção; Esp = especialista. "Quem vê" segue as permissões padrão do SQL (`INVENTARIO-FUNCIONAL.md`, seção 6).
- **Fase:**
  - Nenhuma rota está "já feita": o passo a ainda não começou.
  - Todas as rotas do `crm/` ganham a **moldura nova no passo b** (menu, topo e menu do celular). A coluna diz a fase do **conteúdo** da tela.
  - Na fase 1, a letra é o passo do brief.

## 1. Todas as rotas

### Vendas (`crm/`, em `base360.mbigucci.com.br/vendas`)

| Rota | Tela | Quem vê | Fase | Peças do Alicerce |
| --- | --- | --- | --- | --- |
| `/` | Lista do dia | Cor | 1 (c) | `ResumoDePendencias`, `CardLead`, `Prazo`, `Chip`, `Selo`, `Compromisso`, `PainelLateral` (Registrar), `Meta`, `EstadoVazio` |
| `/` | Início | Ger, GG, Op, Rec, Esp | 2 | `Lista` (atalhos das áreas), `CardDeItem` + `Prazo` (contatos de parceiros do dia), `EstadosDePagina` "Em construção" (Op, Rec, Esp) |
| `/leads/` | Leads | Cor, Ger, GG | 1 (e) | `BarraDeFiltros`, `CardLead` em `.mb-itens`, `EstadoVazio`. A tabela "Por corretor" do gerente é `Tabela` e, no celular, `TabelaNoCelular`: entram no passo e |
| `/leads/quadro/` | Quadro | Cor, Ger, GG | 2 | `Quadro`, `Selo`, `Chip`, `Prazo`, `Toast` com Desfazer |
| `/leads/ficha/` | Ficha do lead | O dono edita; Ger e GG leem e atribuem | 1 (f) | `FichaDoLead`: `Aviso`, `Cartao` + `.mb-pares`, `BotaoExterno`, `Seletor`, `DataHora`, `Abas`, `Envio`, `Historico`, `Compromisso`, `MensagemPronta`, `PainelLateral` (venda, atribuir), `Dialogo` |
| `/leads/novo/` | Novo lead / Lead da empresa | Cor (cadastrar); Ger e GG (para um corretor) | 1 (g) | `FormularioDenso`, `Campo`, `Seletor`, `BuscaComSugestoes` (empreendimento), `Duplicado`, `BarraDeAcoes --unica` |
| `/agenda/` | Agenda | Cor; Ger e GG consultam | 1 (e) | `Compromisso`, `NavegadorDePeriodo`, `PainelLateral` (agendar) |
| `/painel/` | Painel | Cor (o próprio), Ger, GG | 2 | `Indicador`, `Tabela`, `TabelaNoCelular`, `Funil`, `Graficos`, `RelatorioDoNumero`, `NavegadorDePeriodo`, `Exportar` |
| `/vendas/` | Vendas | Cor registra; Ger corrige | 2 | `TabelaCompleta`, `TabelaNoCelular`, `Selo`, `PainelLateral`, `Dialogo` (cancelar, com motivo) |
| `/metas/` | Metas | Todos com leads | 2 | `Meta`, `Indicador`, `FormularioDenso` |
| `/ranking/` | Ranking | Todos | 2 | `Ranking` |
| `/meus-pontos/` | Meus pontos | Cor | 2 | `Indicador`, `Tabela` |
| `/programa/` | Pontos e verba | GG | 2 | `Indicador`, `Tabela`, `Dialogo` (fechar o mês) |
| `/programa/aprovacao/` | Aprovar lançamentos | GG | 2 | `TabelaCompleta` (marcar em lote), `BarraDeAcoes`, motivo obrigatório ao recusar |
| `/plantao/` | Plantão | Rec, Op, Ger | 2 | `Lista`, `CardDeItem`, `Seletor`, `Toast` |
| `/empreendimentos/` | Empreendimentos | Todos | 2 | `CardEmpreendimento` sem estoque, `BarraDeFiltros`, `Compartilhar` |
| `/empreendimentos/ver/` | Empreendimento | Todos | 2 | `CabecalhoDePagina`, `Cartao` + `.mb-pares`, `Fase`, `Tabela` (tipologias), `CardDeItem` (clientes compatíveis), `Compartilhar` |
| `/empreendimentos/editar/` | Editar empreendimento | Op | 2 | `FormularioDenso`, `LinhasRepetiveis` (tipologias), `BarraDeAcoes` |
| `/empreendimentos/importar/` | Importar tabela de preços | Op | 2 | `ImportacaoComPrevia` |
| `/recepcao/` | Recepção | Rec, Op | 2 | `Lista` (a vez), `BuscaComSugestoes` (pessoa: quem atende, quem indicou), `Seletor` (tipo de cliente), `FormularioDenso`, `Duplicado`, `Toast` com Desfazer |
| `/recepcao/relatorio/` | Relatório do stand | Ger, Op, GG | 2 | `NavegadorDePeriodo`, `Indicador`, `Tabela`, `Exportar` |
| `/recepcao/stands/` | Stands e especialistas | Op, GG | 2 | `ListaDeOpcoes` ("Como conheceu"), `Lista` + `PainelLateral` (stands, especialistas), `Campo` |
| `/fila/` | Fila de leads | Cor que recebe, Ger com equipe, GG (com a distribuição ligada) | 1 (e) | `Lista`, `Prazo`, `Aviso`, status do módulo (`.mb-status`) |
| `/fila/como/` | Como é calculado | Os mesmos | 1 (e) | `Cartao` com texto em `leitura` |
| `/entrar/` | Entrar | Sem sessão | 1 (h) | `Entrar` |
| `/conta/` | Minha conta | Todos | 1 (a e h) | `MinhaConta`, `Aparencia` (passo a), `Interruptor` (avisos), `Campo`, `PainelLateral` (Trocar senha) |
| 404 e erro | Página não encontrada; erro de carga | Todos | 1 (d) | `EstadosDePagina`: "Não encontrado" (`not-found.tsx`) e "Erro de carga" com "Tentar de novo" (`error.tsx`). O código técnico só em "Copiar detalhes para o suporte". Nenhuma rota muda |

### Administração (`crm/`, dentro do Vendas)

| Rota | Tela | Quem vê | Fase | Peças do Alicerce |
| --- | --- | --- | --- | --- |
| `/configuracoes/` | Configurações | GG | 1 (b, só o índice) e 2 | `.mb-ajustes` com índice; `DataHora` (horário), `MatrizDePermissoes`, `ListaDeOpcoes` e `MensagemPronta` (mensagens prontas) |
| `/usuarios/` | Usuários | GG (`usuarios.gerenciar`) | 2 | `TabelaCompleta`, `TabelaNoCelular`, `PainelLateral` (criar, editar), `Campo` |
| `/equipes/` | Equipes | GG (`equipes.gerenciar`) | 2 | `Lista`, `PainelLateral`, `Dialogo` (excluir equipe) |
| `/equipes/corretor/` | Distribuição do corretor | Ger, Op | 2 | `Cartao`, `Marcador` (produtos), `Interruptor` (Na distribuição) |
| `/faixas/` | Faixas de VGV | GG (regra fixa) | 2 | `Tabela`, `LinhasRepetiveis` (faixas), `Indicador` |
| `/distribuicao/` | Distribuição | GG (regra fixa) | 2 | `Interruptor` + `Dialogo` (desligar), `Seletor` (modo), `Lista` ("A distribuir"), `Tabela` (vez das equipes) |

### Parcerias (`crm/`, hoje dentro do Vendas)

| Rota | Tela | Quem vê | Fase | Peças do Alicerce |
| --- | --- | --- | --- | --- |
| `/parceiros/` | Parceiros | Ger (`parceiros.cadastrar`), GG (`parceiros.ver_todos`) | 2 | `CardDeItem` + `Prazo` (90 dias), `Selo` (estágio no card), `BarraDeFiltros` (a busca da lista), `Seletor --p` (faixas 30, 60 e 90 dias com contagem), `Recolhivel` + `Lista` (fila da roleta) |
| `/parceiros/novo/` | Cadastrar parceiro | Ger, GG | 2 | `FormularioDenso`, `Duplicado` ("Já é parceiro de X"), `BarraDeAcoes` |
| `/parceiros/ficha/` | Parceiro | Ger, GG; edita só o dono | 2 | `CabecalhoDePagina`, `Etapas` (estágio), `Aviso` (reentrada), `Cartao` + `.mb-pares`, `Prazo`, `BotaoExterno`, `PainelLateral` (registrar interação), `FormularioDenso` (editar), `Historico` |
| `/parceiros/evento/` | Registrar evento | Ger (`parceiros.cadastrar`) | 2 | `FormularioDenso`, `DataHora`, `EscolherVarios` ("Quem foi"), `BarraDeAcoes` |

### Marketing (`marketing/`, em `base360.mbigucci.com.br/marketing`)

| Rota | Tela | Quem vê | Fase | Peças do Alicerce |
| --- | --- | --- | --- | --- |
| `/` | Início | Todos (o GG vai direto ao Direcionador) | 2 | `EstadosDePagina` ("Em construção" para quem não é GG) |
| `/direcionador/` | Direcionador de leads | GG | 2 | `ConstrutorDeCondicoes` no modo Direcionador (Se o lead chegar com / Então), `Interruptor` (chave geral e cada regra) com `Dialogo` ao desligar uma regra que está distribuindo, `Lista` + `PainelLateral` (destinos e editores), simulador em `Cartao` com `Campo`, `Seletor`, `DataHora` e `Lista`, `Toast` |
| `/conta/` | Minha conta | Todos | 2 | `MinhaConta` só com o que existe hoje: nome, e-mail e `Aparencia` |
| `/entrar/` | Entrar | Sem sessão | 2 | `Entrar` |
| 404 e erro | Página não encontrada; erro de carga | Todos | 1 (d) nos textos; 2 no visual | `not-found.tsx` e `error.tsx` com os textos e a estrutura de `EstadosDePagina`. O visual do Alicerce chega com a fase 2 do Marketing |

### Fora do Base360

| Rota | Tela | Quem vê | Fase | Peças |
| --- | --- | --- | --- | --- |
| `/pesquisa/` (`discovery/`) | Pesquisa "Seu CRM ideal" | Público | Fora: fica no DS antigo | — |

## 2. Páginas fora do Next

| Página | O que é | Fica como |
| --- | --- | --- |
| `portal/index.html` | O portal na raiz de `base360.mbigucci.com.br`, com Abrir Vendas e Abrir Repasse | Fora do item 48. Pelo Alicerce, é onde vai o "Base360" sozinho. Proponho entrar depois da fase 2 |
| `portal/repasse/index.html` | Redireciona para `repasse.mbigucci.com.br` | Sem tela |
| `crm-redirecionamento/index.html` | Leva o endereço antigo `/crm/` para `/vendas/` | Sem tela |
| `crm/wordpress/corretores/` (bloco e cadastro) | "Quero ser parceiro", a página pública do site onde o corretor parceiro se cadastra (Parcerias, "pelo link") | Fica no visual do site mbigucci.com.br: é página do site, não ferramenta de trabalho |
| `crm/.visual-preview/` | Prévia de teste, fora do Git | Não é rota |

## 3. Marketing

**Moldura de hoje:**
- É própria, mas copiada da do Vendas: `marketing/src/components/` tem `casca`, `cabecalho`, `marca-base360`, `aparencia` e `icones-menu` adaptados.
- O lockup já é "Base360 · Marketing".
- O menu já mostra só as rotas do módulo, e hoje tem um item só: Direcionador, do gerente geral.
- É outro app Next, em outro endereço. Os menus já estão separados.

**No Alicerce:**
- A mesma `MenuLateral`, `BarraSuperior` e `MenuCelular` do Vendas, com `data-mb-marca="Marketing"`.
- O "+ Nova regra", que hoje fica ao lado do título, vira o + do módulo no topo. É o exemplo do próprio Alicerce.
- Sem status do módulo.
- O lockup "Marketing" é mais largo que "Vendas": conferir em 320px.

**Componentes compartilhados com o Vendas.** O `marketing/` tem o seu próprio `src/`. Há dois jeitos de usar os componentes de `crm/src/components/alicerce/` sem manter duas versões:

| Opção | Como | Custo |
| --- | --- | --- |
| **A. Cópia gerada e conferida (recomendada)** | Um script copia `crm/src/components/alicerce/` e `crm/src/alicerce/` para o `marketing/`, com o aviso "não edite". O `npm test` acusa quando a cópia difere da fonte | É o padrão que o repositório já usa (`copias.test.ts` e o gerador da `entrada-leads`). A fonte é uma só, e cada app continua com o seu build simples |
| B. Importar direto do `crm/` | O `marketing/` importa de `../crm/src/components/alicerce/` | Pede `externalDir` no Next, o caminho no Tailwind e apontar `react` e `react-dom` para uma cópia só. Sem isso, o React carrega duas vezes e os componentes quebram. É mais frágil no build e no deploy |

**Peças das telas que ainda não existem.** Campanhas, mídias e origens e os números do Marketing não têm rota hoje. Quando forem criados, usam as peças que você indicou:
- campanhas: `Quadro`;
- mídias e origens: `ListaDeOpcoes`;
- números: `Indicador`, `Graficos` e `Funil`.

**O que o `ConstrutorDeCondicoes` pede além da tela de hoje:**
- **Resultado antes de salvar** ("nos últimos 30 dias, N leads teriam entrado nesta regra"): seria uma consulta nova, então fica fora da migração visual.
- **`Dialogo` ao desligar uma regra que está distribuindo:** hoje não há essa confirmação. É mudança de comportamento, e precisa do seu ok.
- **O simulador de hoje** ("um lead de tal produto e fonte, tal dia e hora, vai para…") não tem peça. Dá para montar com `Cartao`, `Campo` e `Lista`, peças que já existem; confirme se pode.
- **Destinos:** o editor tem mais de dois campos, então sai do `<dialog>` e vai para o `PainelLateral`. Os nomes dos destinos continuam vindo só do banco.

**Quem executa:** o Marketing tem a sua sessão master desde 05/11/2026. A proposta é a master do Vendas entregar a ela os componentes prontos e o pedido. Ela conduz a migração do Marketing com você.

## 4. Parcerias

**Hoje:** Parcerias vive dentro do Vendas.
- Usa a mesma moldura, o lockup "Base360 · Vendas" e o item "Parceiros" no menu do Vendas.
- O bloco de contatos de parceiros do dia aparece no Início do gerente.

**Proposta de separação (fase 2), sem mudar nenhuma rota:**
- As rotas continuam em `/vendas/parceiros/…`. A `Casca` reconhece o começo do endereço e troca:
  - o lockup para `data-mb-marca="Parcerias"`;
  - o menu para só as rotas de Parcerias: um item, **Parceiros**, mais os Atalhos;
  - o + do topo para **"+ Novo parceiro"**.
- "Registrar evento" vira a segunda ação no cabeçalho de Parceiros. Ele é uma ação, não uma área do menu.
- O menu do Vendas perde "Parceiros".
- O bloco de contatos de parceiros do dia continua no Início do gerente, no Vendas: é a rotina dele.
- **Até a fase 2**, o passo b segue o brief aprovado: Parceiros no grupo Rotina do menu do Vendas.
- O lockup "Parcerias" é o mais largo dos três: conferir em 320px.

**Peças, corrigidas pelo Felipe (06/11/2026):**
- **Estágio do parceiro:** `Etapas` na ficha e `Selo` no card da lista. A `Esteira` fica só para tabela.
- **Estágios "em breve"** (Indicou e Vendeu) não aparecem até existirem. O Alicerce agora diz o mesmo em `Etapas` e `Esteira`.
- **Busca da lista de parceiros:** `BarraDeFiltros`.
- **"Quem foi" do evento:** `EscolherVarios`, peça nova do Alicerce.
- Hoje nenhuma tela escolhe um parceiro digitando o nome. A `BuscaComSugestoes` entra onde a pessoa é escolhida digitando, na Recepção (`BuscaPessoa`: quem atende, quem indicou).

## 5. Lacunas (sem peça no Alicerce)

As quatro foram resolvidas no Alicerce `1794018834-0e30`:
1. **Trocar de módulo:** item Módulos no rodapé do `MenuLateral` e grupo Módulos na folha do celular.
2. **Seleção múltipla com busca:** peça nova `EscolherVarios`.
3. **Estágio "em breve":** não aparece até existir.
4. **Simulador do Direcionador:** receita no README do `ConstrutorDeCondicoes`, com peças que já existem.

**Ainda pendentes:**
- o "resultado antes de salvar" do Direcionador, que é consulta nova (item 49 do roadmap);
- o Repasse no item Módulos: por decisão do Felipe (06/11/2026), ninguém o vê por enquanto, porque o Vendas não tem o dado de quem acessa o Repasse. A entrada fica pronta e desligada.

## 6. Ordem da fase 2

**Base:** não há dado de uso, porque o Vendas ainda não foi publicado. A ordem é uma estimativa, feita de duas coisas:
- quantas pessoas veem a tela, pelas permissões padrão;
- com que frequência a usam, por `docs/pesquisa-resultados.md` e `docs/gerentes-necessidades.md`.

Os corretores são a maioria; gerentes são poucos; o gerente geral é um.

| Ordem | Bloco | Quem usa | Por quê |
| --- | --- | --- | --- |
| 1 | Quadro e Empreendimentos (lista e ver). A Fila de leads passou para a fase 1 | Todos os corretores | Uso diário de quem mais usa o sistema |
| 2 | Painel, Metas, Ranking e Meus pontos | Corretores (o próprio), gerentes | O corretor confere o andamento várias vezes por semana; o gerente, todo dia |
| 3 | Início do gerente e Vendas | Gerentes, GG | A primeira tela do gerente todo dia; a venda é registrada pelo corretor de vez em quando |
| 4 | Recepção, Plantão e Relatório do stand | Recepção, operacional | Poucas pessoas, mas o dia inteiro no stand |
| 5 | **Parcerias** (separação do módulo e as 4 telas) | Gerentes, GG | Contatos do dia com parceiros; o prazo de 90 dias corre |
| 6 | Empreendimentos (editar e importar), Pontos e Aprovar lançamentos | Operacional, GG | Mensal |
| 7 | Administração (Configurações completa, Usuários, Equipes, Faixas, Distribuição, Distribuição do corretor) | GG, alguns gerentes | Raro |
| 8 | **Marketing** (moldura, Direcionador, Início, Minha conta, Entrar, 404) | GG | Uma pessoa; as regras mudam pouco |
| depois | Portal na raiz | Todos, de passagem | Fora do item 48 |

## 7. Decisões do Felipe (06/11/2026)

1. **Trocar de módulo:** não é grupo no menu.
   - É o item **Módulos** no rodapé do `MenuLateral`, acima de "Recolher menu".
   - O popup abre ao lado, só com os módulos que a pessoa pode abrir, e o atual marcado com ✓.
   - Todos abrem na mesma aba, inclusive o Repasse.
   - No celular, é o grupo Módulos na folha. Quem só tem um módulo não vê.
   - Entra no passo b, com Vendas, Marketing e Repasse; Parcerias aparece quando for separado.
2. **Componentes no Marketing:** opção A, cópia gerada e conferida pelo `npm test`.
3. **Direcionador:** as duas mudanças aceitas.
   - Ao desligar uma regra que está distribuindo, abre o `Dialogo` com o efeito escrito.
   - O simulador é montado com `Cartao`, `Campo`/`Seletor`/`DataHora` e `Lista`.
   - O "resultado antes de salvar" fica como pendência.
4. **404 em português** no passo d, com `EstadosDePagina`, e o `error.tsx` nos dois apps ("Erro de carga" e "Tentar de novo").
5. **Fila de leads na fase 1** (passo e).
6. **Mantidos:**
   - a separação de Parcerias pela `Casca` na fase 2;
   - o Marketing com a sua sessão master;
   - a ordem da seção 6;
   - o portal e o `discovery/` fora do item 48.
