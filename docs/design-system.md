# Design system do Base360 Vendas

> **Desde 06/11/2026 o padrão do `crm/` é o Alicerce MBigucci**, o design system dos sistemas da empresa:
> - endereço: `https://claude.ai/artifact/52QJiDD4fLNu14iE3hce37`, lido pela ação `read` do Artifact;
> - versão adotada: `1794084743-8903` (desde o passo h, 07/11/2026; os arquivos usados são os mesmos da 1794072878-3e8e);
> - comece pelo `project/README.md` e, de cada peça, `project/components/<Peça>/README.md` e `preview.html`.
>
> As telas migram no item 48 (brief `docs/codex-alicerce-vendas.md`). Até a migração terminar, as telas que faltam seguem o DS antigo (seção 3). A pesquisa (`discovery/`) continua no DS antigo. O DS do CRM da Bruna (`ref/CRM Bruna/design/`) é de **outra marca** e não serve aqui.

## Sumário

1. [O Alicerce no Vendas](#1-o-alicerce-no-vendas)
2. [Telas migradas](#2-telas-migradas)
3. [DS antigo (telas ainda não migradas e discovery/)](#3-ds-antigo-telas-ainda-não-migradas-e-discovery)
   - [Onde os tokens já estão em código](#onde-os-tokens-já-estão-em-código)
   - [Regras que mais aparecem](#regras-que-mais-aparecem)
   - [Temas do CRM — item 18](#temas-do-crm--item-18)
   - [Tema e navegação do CRM — 05/11/26](#tema-e-navegação-do-crm--051126)
   - [Conforto de uso — 06/11/26](#conforto-de-uso--061126)

## 1. O Alicerce no Vendas

O guia do Alicerce vale inteiro. Aqui ficam só as escolhas do Vendas e o que muda em relação ao DS antigo. Todas são decisões do Felipe de 06/11/2026.

| Assunto | No Vendas |
| --- | --- |
| Padrão no `<html>` | `data-theme="auto"`, `data-menu="claro"`, `data-acao="grafite"`. A pessoa escolhe por cima em Minha conta → Aparência; a escolha fica no aparelho |
| Temas | Automático · Papel · Grafite. A escolha antiga migra: automático continua, escuro vira Grafite, claro vira Papel |
| Vermelho | Sem o modificador, só no logo, no quadradinho do item ativo do menu e no ponto de notificação. A ação principal é grafite; quem escolhe "Vermelho" em Aparência tem o botão principal vermelho |
| Cards | Sem barra lateral; borda fina e sombra leve; o primeiro card da tela se destaca só pela `sombra-elegante`. O card inteiro abre o registro, com no máximo duas ações e sem ⋯ |
| Temperatura | `Chip`: "! Quente" laranja, "○ Morno" amarelo, "– Frio" ardósia, "– Sem temperatura". Substitui o "Quente neutro" da revisão de conforto |
| Etapa e status | `Selo` (etapa do lead na família ameixa); prazo é `Prazo`, texto colorido com sinal |
| WhatsApp | Verde, só no `BotaoExterno`, sempre com a palavra "WhatsApp" |
| Ícones | Da biblioteca `Icones` do Alicerce, sempre com texto (sozinhos só em botão com `aria-label`). Substitui a regra "sem ícones" e os ícones Lucide de `icones-menu.tsx` |
| Menu | 248px aberto e 64px recolhido (substitui os 180px). Grupos Rotina, Gestão e Programa; o gerente geral tem um item só, Configurações; Atalhos por último. A conta fica só no topo à direita (no celular, no fim da folha) |
| Movimento | Entrada leve ao abrir a tela, card sobe no hover, menus em fade. Tudo some com o movimento reduzido |
| Fora por enquanto | Sino, busca do topo, aparência salva na conta, filtros no endereço da página |

## 2. Telas migradas

Cada passo do item 48 acrescenta aqui uma linha: tela, passo, commit e o que ficou de ajuste local (`crm/src/app/alicerce-local.css`).

| Tela | Passo | Commit | Ajuste local |
| --- | --- | --- | --- |
| Fundação (todas as telas) e a Aparência em Minha conta | a | `2e14858` e o ajuste da folha | 1. `svg.mb-icone` volta ao padrão do navegador; 2. a ponte `.ds-antigo` |
| Moldura de todas as telas do `crm/` (menu lateral, topo, menu do celular, conta, Módulos) e o índice de Configurações | b | `6107d81` e `1269d1d` | 3. barras fixas das telas antigas começam depois do menu. A área de toque de 44px da faixa do celular e a camada do menu fixo foram ajustes locais e voltaram para o Alicerce na versão `1794027179-3a37` |
| Lista do dia (a página `/` do corretor; `migrada`) | c | `8c5aeb4` | 4. estrutura da tela (`.lista-do-dia*`, as medidas do preview ListaDoDia); 5. botão "Opções" da linha do stand com 44px no celular (sai no passo d) |
| Mensagens de todas as telas: Toast com Desfazer, AvisoConexao, estados da conta, sem permissão, 404 e erro de carga (Vendas e Marketing) | d | `fc70cc3` e o ajuste "passo d: Alicerce 1794065471-a8a6" | nenhum novo. A posição e a largura do aviso de conexão foram ajustes locais e voltaram para o Alicerce (`1794059951-84ba` e `1794065471-a8a6`) |
| Leads, Agenda, Fila de leads e Como é calculado (`migrada`) | e | o commit "passo e: Leads, Agenda e Fila" | 6. estrutura das telas de lista (`.pagina-alicerce*`); 7. "Ordenar por" na linha da contagem e o "+ Agendar visita" na linha do navegador de período. As regras locais da linha de tabela que abre o painel (`button.mb-tabela__alvo`) e da linha "Você" saíram com o Alicerce `1794069383-61bf`. Falta no Alicerce: a classe da linha "contagem e Ordenar por" (o README descreve, o bundle.css ainda não tem) |
| Ficha do lead (`/leads/ficha/`, `migrada`) | f | o commit "passo f: Ficha do lead" | 8. estrutura da ficha (`.ficha__*`, as medidas do preview FichaDoLead); 9. o Selo da etapa quebra linha na coluna estreita; 10. o valor em destaque e os motivos do Radar. Saíram com o Alicerce `1794072878-3e8e`: o botão como alvo do item, o rótulo longo da faixa e o Envio desativado |
| Novo lead e Cadastro Mágico (`/leads/novo/`, `migrada`) | g | o commit "passo g: Novo lead" | 11. Nenhum novo: a regra local do Cadastro Mágico (`.novo-lead__*`) foi apagada (decisão do Felipe, 07/11/2026: sem selo no lido sem dúvida). O Alicerce segue em `1794079529-4459` (os 8 arquivos do Vendas são iguais) |
| Entrar e Minha conta (`/entrar/`, sem Casca; `/conta/`, `migrada`) | h | o commit "passo h: Entrar e Minha conta" | 12. a numeração dos passos de Instalar no celular (`.mb-passos-instalar`), porque a base do Tailwind zera o `list-style`; 13. o corpo do cartão Avisos (`.avisos-corpo`), que dá a folga de 16px entre a nota do iPhone, o estado e as linhas |
| Parcerias: separação pela Casca e lista, ficha, novo e evento (`/parceiros/…`, `migrada`) | Fase 2, bloco 1 — aprovado com ajustes (08/11/2026) | Sem commit; testes e capturas conferidos | Composição `.parcerias-*` com espaços e largura de leitura do guia; ficha em duas colunas no desktop e dados longos com quebra. Sem edição no Alicerce. Capturas e entrega em `crm/local/alicerce-fase2/parcerias/`. Conferência: `conferir-alicerce.mjs --preparar-parcerias` na cópia gerada, build da prévia e `--parcerias` |

**Como a Lista do dia ficou (passo c, 07/11/2026):**
- **Peças** em `components/alicerce/`: `CardDeItem`, `Compromisso` (e `EdicaoNoCard`), `Chip`, `Selo`, `Prazo`, `ResumoDePendencias`, `PainelLateral`, `Meta`, `EstadoVazio`, `Toast` (provider e `useToast`), `Seletor`, `Campo`, `DataHora`, `Aviso`, `CarregandoLeads`, `BotaoWhatsapp` e `mapas.ts` (do dado ao tom: temperatura, etapa, estado da visita, nível do prazo). Os passos d, e e f completam `Aviso` e `Carregando`.
- **Card do lead** (`CardLeadAlicerce`, em `leads/partes.tsx`): card inteiro abre a ficha; `Prazo` na primeira linha; `Chip` de temperatura no canto direito (só ele); etapa em `Selo` no rodapé; faixa Registrar · WhatsApp → (WhatsApp · Detalhar no grupo Detalhe o contato; sem telefone, sem WhatsApp). O WhatsApp é `<button>` que abre antes a mensagem pronta; o toque grava como antes.
- **Visita** (`ListaVisitas alicerce`): `Compromisso` com o estado em `Selo` no rodapé. Agendada e confirmada: Remarcar · WhatsApp →; aguardando baixa: ✕ Não compareceu · ✓ Realizada; com baixa: Observação e Corrigir. Remarcar, Observação e Corrigir abrem no próprio card. Cliente confirmou e Cancelar visita ficam na ficha (decisão do Felipe, 07/11/2026). A Agenda passou ao Alicerce no passo e (sem esses dois botões no card); a Ficha segue com o card antigo até o passo f.
- **Registrar e Detalhar** abrem o `PainelLateral` (portal no body). `leads/registrar-interacao.tsx` tem o hook `useRegistrarInteracao` (gravação, rascunho e erros iguais), o cartão da ficha e o painel da lista. O que deu certo sai com o `Toast`.
- **Aniversário:** `CardDeItem` com "Mandar parabéns no WhatsApp". **Metas:** `Meta` resumida (valor, barra, projeção); o detalhe fica em Painel e Metas. **Vazio:** `EstadoVazio`.
- **Pendente:** a linha do stand (`LinhaDoStand`) sai da página no passo d, para a folha que o status do topo abre. O `ToastProvider` está na `ListaDoDia` até o passo d.
- **Conferência:** `node scripts/conferir-alicerce.mjs local/alicerce/passo-c --lista` (inclui as pílulas de Próximo contato com 44px no celular).

**Como Leads, Agenda e Fila de leads ficaram (passo e, 07/11/2026):**
- **Peças** em `components/alicerce/`: `BarraDeFiltros` (busca, filtros em `select`, escopo, contagem, chips que tiram o filtro, Limpar filtros e o Ordenar por; no celular o botão "Filtros · N" abre os mesmos campos no `PainelLateral`), `Tabela` (tipos `registros` e `numeros`), `Lista`, `Cartao`, `NavegadorDePeriodo` e `SemanaDeDias`, e dois ganchos de tela: `useMensagemPronta` (o diálogo do WhatsApp por portal, na ponte `.ds-antigo`) e `useRegistrarDoLead` (o painel Registrar da Lista do dia, com a mesma gravação). `mapas.ts` ganhou `nivelDoTom` (tom da Fila para o nível do `Prazo`).
- **Leads:** filtros e valores como antes (rótulos com substantivo: "Todos os corretores", "Todas as origens", "Todos os empreendimentos"); escopo ("Só os seus", "Sua equipe", "Empresa toda") acima da barra; "N leads" e "Ordenar por" na mesma linha. "Por corretor" do gerente é `Tabela` de números (no celular rola dentro do quadro, com a primeira coluna presa); o nome filtra por aquele corretor. Cards `CardLeadAlicerce` em `.mb-itens`: o dono em uma linha para quem vê a equipe, "✕ Descartado" em `Selo`. **Registrar só no lead do próprio corretor** (decisão do Felipe, 07/11/2026); o WhatsApp abre a mensagem pronta e, em Leads, não grava toque (como antes). Sem "+ Novo lead" na página (o topo já tem; decisão do Felipe).
- **`CardLeadAlicerce`** (`leads/partes.tsx`), só acréscimos opcionais: `dono`, `onRegistrar?` e `onWhatsapp?`. Sem `onRegistrar` não há Registrar, nem a linha do toque a detalhar, nem Detalhar; sem ação nenhuma, o card fica sem faixa.
- **Agenda:** `NavegadorDePeriodo` com a semana de 7 dias (`aria-pressed`, hoje marcado sem vermelho) e "+ Agendar visita" na linha do navegador. Visitas como `Compromisso` (o card não tem Cliente confirmou nem Cancelar visita; ficam na visita aberta, na ficha) e retornos como `CardLeadAlicerce`. **Agendar visita** (a escolha do cliente e o formulário) segue no DS antigo, dentro da ponte `.ds-antigo`, até o passo f, porque `AgendarVisita` é da ficha. O que deu certo ao agendar sai em `Toast`.
- **Fila de leads:** a fila do corretor é `Lista` (a vez, o nome e a situação; a linha do corretor leva `aria-current` e o nome "Você"), "Hoje" é `Cartao` com um `Recolhivel` por vez. A visão do gerente é `Tabela` de registros (no celular, um card por corretor); a linha inteira abre as ações no `PainelLateral` (Pausar, Tirar da distribuição, Como é calculado, Produtos e participação), sem "⋯". "Não atende N produto(s)" em `Selo`. O que está em dia ("✓ Apto") é texto normal; o que pede ação é `Prazo`. `/fila/como/` é dois `Cartao` com o texto em `leitura`. O destino sigiloso da distribuição manual não aparece.
- **Conferência:** `node scripts/conferir-alicerce.mjs local/alicerce/passo-e --leads` (na prévia isolada, com `?qa=corretor`, `?qa=gerente` e `?qa=geral` do `visual-preview.mjs`). Confere, em 375 e 1280 nos dois temas, rolagem lateral, 44px, foco com Tab, console, o HTML das peças e o que cada tela faz.
- **Regra local 3** (barras fixas das telas antigas) fica: `programa/aprovacao` ainda usa `fixed inset-x-0`.

**Como Entrar e Minha conta ficaram (passo h, 07/11/2026):**
- **Peças** em `components/alicerce/`: `Interruptor` (`role="switch"`, estado no React, Ligado/Desligado), `Ajuste` (a linha `.mb-ajuste`, com `passos` para a `ol.mb-passos-instalar`), `Requisitos` (`.mb-requisitos` com o `data-ok` vindo do React), `CampoSenha` (Mostrar/Ocultar dentro do campo, `.mb-campo__mostrar`, sem `MB.senha.ligar`) e `EntrarCaixa` (`.mb-entrar` com o lockup, o rodapé com o logo MBigucci e a frase de quem procurar). `Cartao` ganhou `secao` (o `id` da `<section>`, que o índice usa) e `Ajustes` passou a marcar a seção pela posição na rolagem (a primeira no topo, a última no fim da página).
- **Entrar** (sem Casca e sem `.ds-antigo`; o h1 do cartão fica, porque não há topo): e-mail, senha com Mostrar, "E-mail ou senha não conferem." em `Aviso --erro` acima dos campos, e a mesma validação e o mesmo fluxo. Esperando a resposta: botão com `aria-busy="true"` e "Entrando…", campos desativados. Sem "Esqueci minha senha" e sem "Continuar conectado", que não existem hoje. O `AvisoConexao` entra aqui porque o `Cabecalho` antigo o trazia.
- **Minha conta** (`Casca migrada`, h1 só para o leitor de tela): subtítulo com nome, perfil e e-mail (sem cartão "Dados" e sem "Sair", que está no menu da conta), e o índice `.mb-ajustes` com Seu WhatsApp, Aparência, Avisos neste aparelho, Trocar senha e Instalar no celular. A única ação primária é "Salvar WhatsApp"; o erro do WhatsApp vai no próprio campo. Trocar senha continua em linha, sem senha atual, com os dois requisitos de hoje (8 caracteres, senhas iguais). Avisos: um `Interruptor` por tipo, "Ligar avisos neste aparelho", "Enviar um aviso de teste" e "Desligar neste aparelho"; a nota do iPhone só aparece no iPhone. O que cada seção grava não mudou.
- **Apagados:** `cabecalho.tsx`, `aviso-offline.tsx` e o `.cabecalho-vidro` do `globals.css` (o Marketing tem cópias próprias). **Para a limpeza final:** `LockupVendas` e o `LogoMBigucci` antigo em `marca-base360.tsx` ficam sem uso.
- **Conferência:** `node scripts/conferir-alicerce.mjs local/alicerce/passo-h --conta` (na prévia isolada; `/entrar/?qa=espera` para Entrar esperando, `/conta/?qa=avisos-ligados` e `?qa=avisos-desligados` para o push simulado, só na cópia local). O alvo do Mostrar é o campo inteiro (44px; o botão fica 2px menor por dentro da borda).
- **Mostrar na senha:** o `.mb-campo__mostrar` tem 42px no celular; a área de toque é o campo de 44px (decisão do Felipe, 07/11/2026), e a conferência mede o campo inteiro. Mudou também uma peça do passo b (`Ajustes`, usado em Configurações): a seção marcada passou a vir da rolagem, e o link tocado ganha enquanto a seção dele está na tela.

**Como o Novo lead ficou (passo g, 07/11/2026):**
- **Peças** em `components/alicerce/`: `Duplicado` (as formas `--alerta` e `--info`), `BuscaComSugestoes` (combobox em React, sem `MB.sugestoes.ligar`; busca sem acento, até 8, texto livre vale), `BarraDeAcoes` (`--unica` ou em grupo, só no celular), e acréscimos: `Campo` (`obrigatorio`, `opcional`, `erro`/`idErro`), `Aviso` (tom `info` e `acoes`), `Cartao` (`rodape`) e `Seletor` (`multipla`, `marcados`).
- **Tela:** `pagina-alicerce--estreita`, h1 só para o leitor de tela, "Colar mensagem" em `Cartao` (com a mensagem colada vira `Aviso` de sucesso com "Colar outra"), "Dados do lead" em `FormularioDenso` (`Cartao`, `.mb-form-secao`, `.mb-form-grade`, `.mb-salvo` "✓ Rascunho guardado"), origem em `Seletor --linha`, "Mais detalhes" em `Recolhivel` (temperatura que se desmarca, empreendimento, e-mail, `DataHora`). A ação final é o `.mb-cartao__rodape` no computador e a `BarraDeAcoes --unica` no celular.
- **Erros de validação** no campo, com as mesmas mensagens e a mesma ordem; o foco vai ao campo errado (e Mais detalhes abre para e-mail e próximo contato). Falha ao gravar é `Aviso` de erro perto da ação.
- **Duplicado** (regra de 07/11/2026 em `docs/leads.md`, seção 9): `--alerta` com "Abrir o existente" e "Cadastrar assim mesmo" (o único que grava); `--info` sem botão e sem gravação. Pendente: o registro em `lead_eventos` (pede `supabase/`).
- **Cadastro Mágico:** `Cartao` com o texto, os campos em `Pares` com selo só em "! Conferir" e "✕ Não encontrado" (ImportacaoComPrevia), "O nome é obrigatório" (o WhatsApp é opcional desde 04/11) e o perfil sugerido em `Seletor --multipla`.
- **Conferência:** `node scripts/conferir-alicerce.mjs local/alicerce/passo-g --novo` (na prévia isolada; `?qa=gerente` para o lead da empresa). Os fixtures têm o WhatsApp 11 99999-0010 (lead visível) e 11 98888-0000 (outra carteira).
- **Falta no Alicerce:** `BuscaComSugestoes` em React (o bundle só liga em DOM estático) e a forma do Duplicado para "existe, mas você não vê" com a ação de quem pode seguir.

**Como a Ficha do lead ficou (passo f, 07/11/2026):**
- **Peças** em `components/alicerce/`: `Abas` (e `PainelDeAba`), `Historico`, `Envio` (e `ItemDeEnvio`), `ConfirmarNaLinha`, `Recolhivel`, `Pares`, `CampoEmpreendimento` e `RadarAlicerce`; `Campo` ganhou `colunas` e `CampoSelecao`; `Seletor` aceita a grade de 6; `DataHora` aceita `atalhosEmGrade` (`mb-opcoes--4`, 44px, 2 × 2 no celular); `CardDeItem` e `Compromisso` ganharam `alvo` e `detalhe` (a visita que abre no lugar); `useMensagemPronta` aceita `modelo` e `visita`.
- **Tela:** "← Voltar para a lista" e um h1 só para o leitor de tela (o topo já tem o título); o aviso de atraso no topo; duas colunas (8 + 4, `.mb-painel__linha`). À esquerda: cartão do lead (`Pares`, `Chip`, aviso e "Editar perfil", WhatsApp e Ligar), Registrar interação, sugestão de descarte, Visitas, Venda, Perfil do cliente (`Recolhivel`), Descartar (ou Reativar) e, para quem não é o dono, Dados do cliente. À direita: o cartão com as abas Andamento, Documentos e Histórico, o Radar e, para o gerente, Atribuir. No celular as colunas empilham.
- **Etapa só no Andamento.** Para o gerente e para o lead descartado ela é leitura: o descartado mostra "Descartado · motivo" em `Selo --etapa-descartado`. A linha "A detalhar" saiu dos pares (o aviso do Registrar já diz).
- **Registrar:** "Como foi" em `mb-opcoes--3` (3 + 2) e "Próximo contato" em `mb-opcoes--4`; o que deu certo sai em `Toast`. **Agendar visita:** abre no `PainelLateral`; na Agenda segue em linha, com a mesma assinatura. Empreendimento é o `select` do Alicerce (catálogo mais o valor que o registro já tem; texto livre fora do catálogo não se digita mais).
- **Visita aberta** (decisão do Felipe, 07/11/2026, agora regra do `Compromisso`): na ficha o título do card é um botão `.mb-item__alvo` que abre "✓ Cliente confirmou" (só com a visita agendada e antes do horário) e "Cancelar visita" (com o Desfazer, `chave` por aviso).
- **Desfazer da ficha** (etapa e descarte) usa `chave` (id do lead e a hora da mudança). Temperatura continua sem desmarcar e sem Desfazer (decisão do Felipe).
- **Venda e Radar** (`vendas.tsx` e `empreendimentos/partes.tsx` são compartilhados): a forma do Alicerce vem pela prop `alicerce` (`CardVenda`, `RegistrarVenda`, `RadarDoLead`); a tela Vendas e as outras seguem como estavam. A gravação não muda.
- **Erros:** falha ao gravar vira `Aviso` no topo, sem apagar a tela; falha ao carregar vira o estado "Erro de carga" com "Tentar de novo".
- **Histórico sem filtro** por ora (decisão do Felipe). A aba Documentos mostra "Nenhum documento anexado." para quem só lê (o card antigo sumia).
- **Conferência:** `node scripts/conferir-alicerce.mjs local/alicerce/passo-f --ficha` (na prévia isolada; `?qa=gerente` no endereço da ficha para o gerente). Confere, em 375 e 1280 nos dois temas e nos três casos (corretor, gerente, descartado): rolagem lateral, 44px, foco, console, nada do DS antigo; o HTML contra os previews; e o que cada parte faz (abas, Documentos, Registrar, visita aberta, Agendar visita, Perfil, Descartar, Venda, Atribuir, Reativar).
- **Pendente:** o seletor de cliente da Agenda e o card em volta do Agendar visita dela seguem no DS antigo (`agenda/page.tsx` não era do passo).

**Como as mensagens ficaram (passo d, 07/11/2026):**
- **Toast com Desfazer:** o `AvisoDesfazer` de `leads/partes.tsx` manteve a assinatura (`texto`, `onDesfazer`, `onFim`) e passou a usar o `Toast` (sucesso, 8 s, o tempo pausa com ponteiro ou foco). As telas que o usam não mudaram e a gravação do Desfazer também não. O `onFim` roda quando acaba o tempo ou toca no X, nunca depois do Desfazer (quem desfaz limpa o próprio estado). O `ToastProvider` é um só, na `Casca`. O `fechar` do provider confere o id: o fim de um toast não apaga o que o substituiu. O toast substituído também chama o `onFim`, para a tela não ficar com o aviso preso. A `chave` opcional faz um aviso novo com o mesmo texto virar um toast novo (com 8 s de novo): as visitas passam o id da visita e a hora.
- **AvisoConexao** (`components/alicerce/aviso-conexao.tsx`): estado no React (`online`/`offline`), sem `MB.conexao.ligar`. Texto aprovado para módulo sem fila offline: "Sem conexão · nada é gravado sem internet" e "Conexão de volta." (some em 4 s). O Alicerce prevê "as mudanças ficam no aparelho", que no Vendas não é verdade. `aviso-offline.tsx` só reexporta o nome, porque o `Cabecalho` antigo (Entrar, passo h) ainda o usa.
- **Erro ao gravar sem internet:** "Sem internet: não foi gravado. Tente de novo quando a conexão voltar." (`erroAoSalvar`, `lib/erros.ts`), perto do botão, sem apagar o que foi digitado.
- **Estados** (`estado-de-pagina.tsx`, o `EstadosDePagina` do Alicerce): `EstadoDePagina` com o tipo (erro de carga, sem permissão, não encontrado, desativado…), `CopiarDetalhes` (código, endereço e hora vão só para a área de transferência) e `LinkDoEstado`.
  - **Conta** (`Casca`, sem menu nem perfil): lockup sobre o fundo e o estado. Desativada: "Seu acesso ao Base360 foi desativado" / "Se acha que é um engano, fale com o gerente geral." Erro: "Não foi possível carregar a sua conta", Tentar de novo (`recarregar`) e o erro técnico só em Copiar detalhes. Sem configuração: "Não foi possível abrir o Base360". Carregando: só o texto para o leitor de tela.
  - **Sem permissão** (dentro da moldura): "Esta página não está liberada para o seu perfil" / "Peça o acesso ao gerente geral." / Voltar para o início. Página só do gerente geral: "Esta página é do perfil Gerente geral".
  - **404** (`app/not-found.tsx`, dentro da `Casca` `migrada`: quem não está logado vai para Entrar) e **erro de carga** (`app/error.tsx`, sem a `Casca`, para não repetir o erro em laço).
- **Carregando:** `CarregandoLeads` e `CarregandoTabela` aceitam `atraso` (300 ms no Alicerce). O limite que vira erro depois de um tempo **fica para quando o `sessao.tsx` entrar**.
- **Marketing** (`marketing/src/app/not-found.tsx` e `error.tsx`): a estrutura e as palavras do `EstadosDePagina` sobre o visual atual dele, com as classes dele. O `aviso-offline` do Marketing fica para a migração do Marketing.
- **Conferência:** o `visual-preview.mjs` já põe na cópia local as páginas `/qa-desfazer/` e `/qa-quebrar/` e o `?qa=desativado` e `?qa=erro`; depois do `next build` da prévia, `node scripts/conferir-alicerce.mjs local/alicerce/passo-d --mensagens`. Inclui o aviso que não cobre o topo e o Registrar com a rede desligada.

**Como a moldura ficou (passo b):**
- **Peças** em `crm/src/components/alicerce/`, uma por arquivo, com o mesmo HTML, classes `.mb-*` e `aria-*` dos previews: `MenuLateral`, `BarraSuperior`, `MenuCelular`, `MenuDaConta`, `MarcaBase360`, `LogoMBigucci`, `Icone` e o índice `Ajustes` (`.mb-ajustes`). O estado (menu recolhido, folha, popups) é do React; o `MB.*.ligar` não toca o DOM do React.
- **Menu fixo (Alicerce 1794023680-e181; a camada desde 1794027179-3a37):** o `.mb-menu` é sticky, rola por dentro e fica na camada dos popups; Módulos e Recolher menu ficam sempre à vista. Em React: as dicas do menu recolhido usam `MB.menuLateral.dicas(menu)` com a ref do menu (só o cálculo de posição) e o popup de Módulos abre em `position: fixed`, com `left` = borda direita do botão + `--esp-3` e a base alinhada à dele, como o `MB.popup` calcula. O logo MBigucci é o `public/alicerce/mbigucci-logotipo.png`.
- **Ícones e lockup** vêm do `bundle.js` por `scripts/gerar-icones-alicerce.mjs`, para `components/alicerce/icones.gerado.ts` (não se edita à mão; o `npm test` acusa quando fica desatualizado). `icones-menu.tsx` (Lucide) e `lib/barra.ts` saíram, e o `data-barra` da ponte também.
- **O que cada perfil vê** está em `components/alicerce/menu.ts` (`montarMenu`, `modulosDaPessoa`, `itemAtual`), com teste em `src/lib/menu.test.ts`. As condições são as de antes da moldura. Grupos: Rotina, Gestão (com Plantão, para todos os perfis), Programa (Pontos ou Meus pontos, e Ranking); o gerente geral tem um grupo Administração com o item único Configurações; Atalhos por último. Cada tela tem o ícone próprio da biblioteca.
- **Módulos:** Vendas para todo usuário ativo; Marketing só para o gerente geral (link comum para `/marketing/`, fora do basePath); Repasse atrás da constante `REPASSE_LIBERADO` (desligada: ninguém o vê por enquanto, decisão do Felipe de 06/11/2026; liga quando existir o dado de quem acessa). Quem só tem um módulo não vê o item.
- **Status do módulo:** o recebimento de leads (`distribuicao/recebimento.tsx`) virou o `.mb-status`, com a posição como detalhe. A folha da fila continua a um toque, no botão "Ver fila" ao lado. Aparece só para quem recebe leads hoje, com a distribuição ligada e fora do modo "só gerentes" (`mostraBotao`, a mesma regra de antes). No celular, o `::after` do status e do "Ver fila" é a área de toque de 44px do Alicerce: não use para outra coisa.
- **Ponte:** a `Casca` envolve em `.ds-antigo` só o conteúdo (e a prop `migrada` tira o invólucro e o título antigo). Cada tela que migra passa `migrada`.
- **Configurações:** o índice e os quatro links (Usuários, Equipes, Faixas de VGV, Distribuição) são do Alicerce e ficam fora do `.ds-antigo`; as seções antigas (horário, mensagens, permissões) ficam dentro.
- **Conta no topo:** apelido ou, sem ele, o primeiro nome inteiro (regra de 05/11, confirmada em 07/11/2026), pelo `nomeCurto` de `menu.ts`. A saudação do Início usa o mesmo `nomeCurto`, para o topo e a página chamarem a pessoa igual.
- **Sem sino e sem busca** no topo: não há fonte de notificações nem busca global.

**Como a fundação ficou (passo a):**
- **Arquivos do Alicerce:** em `crm/src/alicerce/` e `crm/public/alicerce/bundle.js`, sem edição, com a versão e os hashes no `LEIAME.md` dessa pasta. O `npm test` confere os hashes e o `tokens.css` gerado.
- **Ordem do CSS** (`layout.tsx`):
  - `tailwind-base.css`: o preflight e as regras de base do DS antigo;
  - `tokens.css` e `bundle.css`;
  - `globals.css`: o DS antigo e as utilitárias;
  - `alicerce-local.css`.
- **No `<head>`:** o `bundle.js` vem sem `async` e logo depois o script de `src/lib/aparencia.ts`. Esse script:
  - migra uma vez a escolha antiga (`mbigucci-crm-aparencia` e `mbigucci-crm-barra`) para `mb_tema` e `mb_menu_recolhido`, e apaga as chaves antigas;
  - chama `MB.preferencias.restaurar()`;
  - mantém a ponte: `data-tema` segue o `data-theme` e a `theme-color` segue o `--fundo` (o `data-barra` saiu no passo b).
- **Ponte `.ds-antigo`:**
  - o que ainda está no DS antigo fica dentro de um invólucro `.ds-antigo` (`display: contents`): a `Casca` inteira, Entrar e a `Folha` antiga (que vai para o `body` por portal);
  - ali o `<a>` volta a herdar cor e sublinhado, porque o Alicerce pinta todo link de azul sublinhado;
  - **quando uma tela migra, o conteúdo dela sai do invólucro.** No passo b, a `Casca` nova deixa o `.ds-antigo` só em volta das telas que ainda não migraram.
- **Fontes:** as três do Alicerce, pelo `@font-face` do `tokens.css`, com os mesmos nomes de família que o Tailwind usa. As woff2 antigas de `crm/src/app/fonts/` ficam só para os scripts de mockup.
- **Aparência:** `components/alicerce/aparencia.tsx`, com o mesmo HTML do preview, o estado no React e a troca pelo `MB.preferencias`.
- **Classes renomeadas:** `.selo` virou `.selo-antigo` e `.titulo-secao` virou `.titulo-secao-antigo` (48 usos), porque o Alicerce tem classes com os mesmos nomes.
- **Conferência:** `node scripts/conferir-alicerce.mjs`, na prévia isolada e no Chrome headless de teste (instruções no topo do script).

## 3. DS antigo (telas ainda não migradas e discovery/)

> A fonte era o artifact do MBigucci DS, `https://claude.ai/artifact/QesJh8EPBkLqV5jjbpNFEi`. No `crm/`, esta seção vale só para as telas que ainda não migraram e sai no fim da fase 2. Onde ela contradiz a seção 1, vale a seção 1.

### Onde os tokens já estão em código

- `crm/src/app/globals.css` e `crm/tailwind.config.ts`: paletas clara/escura, tokens semânticos e componentes compartilhados, conforme a tabela abaixo.
- `marca/tokens/`: o pacote compartilhado com o Base360 (`tokens.json`, o mesmo do artifact desde a versão 16, de 05/11/2026, com os temas Claro e Escuro, a casca dos sistemas e a seção Base360). `node marca/tokens/conferir.mjs` compara o pacote com o `globals.css`, e `gerar.mjs` gera o CSS do CRM e o do shadcn. Veja `marca/tokens/README.md`.

- `discovery/tailwind.config.ts`: as cores (`brand` #e11119, `ink`, `ink-soft`, `concrete`, `paper`, `line`, `surface`, `tint-brand`, `ok`, `wa`), as famílias de fonte e os raios de 2, 3 e 4px.
- `discovery/src/app/globals.css`: as classes `.card` (com a barra à esquerda), `.bar-brand`, `.btn`, `.btn-red`, `.btn-ghost`, `.eyebrow`, `.titulo-pagina`, `.titulo-card`, `.input`, `.field-label`, `.num` e `.link-acao`.
- As fontes ficam em `discovery/src/app/fonts/` (Bricolage Grotesque e Inter, woff2 variáveis).
- O logo é `mbigucci-logo.png`, servido na pasta publicada. Se ele não carregar, aparece o texto "MBigucci" em `brand`, Bricolage 800.

### Regras que mais aparecem

- **Fontes:** Bricolage Grotesque nos títulos e nos números de síntese; Inter no corpo e nos números de leitura. Todo número usa `.num` (algarismos tabulares). No CRM, desde 06/11/2026, `.num` é Inter e só vira Bricolage em título, na faixa, com 17px ou mais ou em extrabold (veja [Conforto de uso](#conforto-de-uso--061126)).
- **Fundo e cards:** fundo `paper`. Cards em `surface` (brancos no claro) com borda decorativa `line` e **barra de 4px à esquerda**, em `ink` por padrão ou `brand` no destaque. Uma barra vermelha por área de tela. Campos e botões usam `control`.
- **Sem sombra:** bordas finas no lugar de sombras e raios pequenos.
- **Vermelho:** só em **uma ação principal por grupo**, no destaque, na urgência real e no foco. Temperatura não é urgência: "! Quente" é neutro. O foco é um contorno sólido de 2px em `brand`, afastado 2px.
- **Sem ícones e sem emoji:** sinais em glifos de texto (✓ ! ✕ – → +). O estado é sempre **sinal + palavra + cor**, nunca só cor. **Exceção no CRM (aprovada em 05/11/2026):** a navegação, na lateral e no menu do celular, usa ícone + rótulo (veja [Tema e navegação](#tema-e-navegação-do-crm--051126)). Cards, estados e ações das telas continuam sem ícones.
- **`concrete`:** só para eyebrow e texto auxiliar; no CRM foi ajustado para atingir 4,5:1 nos dois temas. O que precisa orientar uma decisão continua em `ink` ou `ink-soft`.
- **Textos:** português do Brasil, frases curtas, imperativo, caixa de frase em títulos e botões, sem exclamação. Eyebrows ficam em caixa alta pelo CSS.
- **Números:** `R$ 3.398.300`, `60,60%`, datas `dd/mm/aaaa`.
- **Movimento:** o DS só tem o + do acordeão. As transições curtas entre etapas da pesquisa são um acréscimo e respeitam `prefers-reduced-motion`.
- **Celular:** campos com 16px, para o iOS não dar zoom, e ações fixas no rodapé, ao alcance do polegar. Todo botão e todo controle de escolha (`.opcao`) têm 44px de alvo.

### Temas do CRM — item 18

Paleta definida em 30/10/2026 a partir dos tokens claros versionados. O artifact externo continuou inacessível nesta revisão. Esta extensão vale para `crm/`; o DS de `discovery/` permanece com sua paleta original.

#### Tokens claro/escuro

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `paper` | `#f7f6f2` | `#151619` | Fundo da página |
| `surface` | `#ffffff` | `#202126` | Cards e controles |
| `ink` | `#0d0e11` | `#f5f3ed` | Texto principal; seleção inversa |
| `ink-soft` | `#4a4b52` | `#c4c1ba` | Texto secundário e placeholders |
| `concrete` | `#6f6b63` | `#aaa69e` | Eyebrows e texto auxiliar legível |
| `line` | `#e5e3dd` | `#42444c` | Divisórias decorativas; trilho de progresso |
| `control` | `#76736c` | `#878995` | Bordas de campos, botões e seletores |
| `brand` | `#e11119` | `#ff6b70` | Ação, urgência, barra e foco |
| `brand-dark` | `#b90d14` | `#ff9296` | Hover de ação e link |
| `ok` | `#1f7a45` | `#68ce92` | ✓ e estado de sucesso |
| `wa` | `#925600` | `#f0b65b` | ! e estado de atenção |
| `tint-brand` | `#fff6f6` | `#332024` | Fundo de urgência |
| `surface-disabled` | `#eeede9` | `#303138` | Superfície desabilitada |
| `neutral-mark` | `#5a5b60` | `#b7b8c0` | Estado neutro |
| `band` | `#0d0e11` | `#0d0e11` | Fundo das faixas de síntese |
| `on-dark` | `#ffffff` | `#ffffff` | Texto principal na faixa |
| `on-dark-soft` | `#d9d6cf` | `#d9d6cf` | Rótulos na faixa |
| `on-dark-muted` | `#b7b3ac` | `#b7b3ac` | Texto auxiliar na faixa |
| `on-brand` | `#ffffff` | `#151619` | Texto do botão principal |
| `overlay` | `#0d0e11` | `#0d0e11` | Fundo de diálogo, com 50% de opacidade |

O cabeçalho usa `paper` a 85% com desfoque de 12px e borda `line` (`.cabecalho-vidro`, veja "Tema e navegação do CRM"); antes era `header-glass`, `paper` a 90%. O PNG da logo (`/base360/vendas/mbigucci-logo.png`, enviado à parte para o site; antes em `/crm/`) já traz a própria moldura branca, então entra sem selo, sem fundo e sem filtro nos dois temas. Um selo branco extra dobrava a borda e foi retirado em 05/11/2026. Desde 05/11/2026 ele fica no rodapé da lateral, no fim do menu do celular e na tela de entrar, não no cabeçalho. Quando a imagem falta, o texto “MBigucci” usa `brand` sobre o fundo do tema e `nav-marca` sobre a navegação grafite. A cópia do CRM no Git não inclui o PNG, por isso as capturas usam esse fallback.

No claro, `concrete` passa de `#8b877f` para `#6f6b63`, e `wa` de `#b26a00` para `#925600`, para também suportarem texto pequeno. `line` permanece uma borda decorativa, sem função de identificar controles. O novo `control` cumpre essa função. Não escurecer todas as divisórias para resolver os campos.

#### Contrastes verificados

Cálculo WCAG por luminância relativa sRGB: `(LmaisClara + 0,05) / (LmaisEscura + 0,05)`. Os números abaixo são arredondados só para apresentação. Comparação feita com a razão completa: **texto ≥ 4,5:1; texto grande (24px, ou 18,66px com peso ≥ 700), bordas de controle e foco ≥ 3:1**. Os textos grandes também passam nos pares de 4,5:1.

| Par (frente / fundo) | Claro | Escuro | Mínimo |
| --- | ---: | ---: | ---: |
| `ink` / `paper` | 17,85:1 | 16,31:1 | 4,5:1 |
| `ink-soft` / `paper` | 8,03:1 | 10,07:1 | 4,5:1 |
| `concrete` / `paper` | 4,90:1 | 7,46:1 | 4,5:1 |
| `brand` / `paper` | 4,52:1 | 6,54:1 | 4,5:1 |
| `brand-dark` / `paper` | 6,20:1 | 8,45:1 | 4,5:1 |
| `ok` / `paper` | 4,94:1 | 9,33:1 | 4,5:1 |
| `wa` / `paper` | 5,47:1 | 9,95:1 | 4,5:1 |
| `neutral-mark` / `paper` | 6,26:1 | 9,16:1 | 4,5:1 |
| `control` / `paper` | 4,37:1 | 5,21:1 | 3:1 |
| `ink` / `surface` | 19,30:1 | 14,48:1 | 4,5:1 |
| `ink-soft` / `surface` | 8,68:1 | 8,94:1 | 4,5:1 |
| `concrete` / `surface` | 5,30:1 | 6,62:1 | 4,5:1 |
| `brand` / `surface` | 4,89:1 | 5,81:1 | 4,5:1 |
| `brand-dark` / `surface` | 6,71:1 | 7,50:1 | 4,5:1 |
| `ok` / `surface` | 5,35:1 | 8,29:1 | 4,5:1 |
| `wa` / `surface` | 5,91:1 | 8,84:1 | 4,5:1 |
| `neutral-mark` / `surface` | 6,77:1 | 8,13:1 | 4,5:1 |
| `control` / `surface` | 4,73:1 | 4,62:1 | 3:1 |
| `ink` / `tint-brand` | 18,17:1 | 13,79:1 | 4,5:1 |
| `ink-soft` / `tint-brand` | 8,17:1 | 8,51:1 | 4,5:1 |
| `concrete` / `tint-brand` | 4,99:1 | 6,31:1 | 4,5:1 |
| `brand` / `tint-brand` | 4,60:1 | 5,53:1 | 4,5:1 |
| `brand-dark` / `tint-brand` | 6,31:1 | 7,14:1 | 4,5:1 |
| `ok` / `tint-brand` | 5,03:1 | 7,89:1 | 4,5:1 |
| `wa` / `tint-brand` | 5,56:1 | 8,41:1 | 4,5:1 |
| `neutral-mark` / `tint-brand` | 6,38:1 | 7,74:1 | 4,5:1 |
| `control` / `tint-brand` | 4,45:1 | 4,40:1 | 3:1 |
| `ink` / `surface-disabled` | 16,48:1 | 11,67:1 | 4,5:1 |
| `ink-soft` / `surface-disabled` | 7,41:1 | 7,20:1 | 4,5:1 |
| `concrete` / `surface-disabled` | 4,53:1 | 5,34:1 | 4,5:1 |
| `on-brand` / `brand` | 4,89:1 | 6,54:1 | 4,5:1 |
| `on-brand` / `brand-dark` | 6,71:1 | 8,45:1 | 4,5:1 |
| `on-dark` / `band` | 19,30:1 | 19,30:1 | 4,5:1 |
| `on-dark-soft` / `band` | 13,30:1 | 13,30:1 | 4,5:1 |
| `on-dark-muted` / `band` | 9,24:1 | 9,24:1 | 4,5:1 |
| `brand` / `band` | 3,95:1 | 6,98:1 | 3:1 |
| `surface` / `ink` | 19,30:1 | 14,48:1 | 4,5:1 |
| `ok` / `line` | 4,17:1 | 5,01:1 | 3:1 |
| `ink` / `line` | 15,04:1 | 8,75:1 | 3:1 |

O foco e a barra `brand` sobre `paper`, `surface` e `tint-brand` têm as mesmas razões das linhas de texto acima, superiores a 3:1. Na faixa, `brand` serve para **barra e foco**, não texto pequeno; o texto usa `on-dark*`. Os botões principais usam `on-brand`, pois `surface` já representa o fundo do tema. Seleções inversas continuam em `ink` / `surface`.

Contraste decorativo de `line`: claro sobre paper **1,19:1**, sobre surface **1,28:1**; escuro sobre paper **1,86:1**, sobre surface **1,65:1**. Não usar esse token como único contorno de controle. O fundo `band` não depende de contraste com o card: o texto `on-dark*`, o espaçamento e a barra brand identificam a síntese. O overlay é apenas uma camada de fundo, sem texto.

Reproduzir os **106 pares** (incluindo foco nos três fundos): `node scripts/contraste-temas.mjs`, em `crm/`. A auditoria renderizada complementar e suas capturas estão em [Revisão visual — temas](revisao-visual.md#modo-escuro-item-18).

#### Aplicação e preferência

- `crm/src/app/globals.css` contém as paletas em canais RGB. O Tailwind lê `rgb(var(--token) / <alpha-value>)`, inclusive transparências; não há classes de tema duplicadas em cada tela.
- `data-tema="claro|escuro"` resolve o tema. Sem JavaScript, a media query mantém o automático. `color-scheme` acompanha os campos nativos.
- Em **Minha conta → Aparência**, **Automático / Claro / Escuro**. Automático acompanha `prefers-color-scheme`, inclusive mudanças enquanto o app está aberto.
- A chave `mbigucci-crm-aparencia` no `localStorage` pertence ao aparelho, não à conta. Leitura e escrita têm `try/catch`; valor ausente/inválido usa Automático. Com armazenamento bloqueado, a troca funciona nesta página e a próxima abertura volta ao sistema.
- O script autossuficiente de `src/lib/aparencia.ts` roda inline no `head`, antes do corpo e da hidratação. O tema salvo já está aplicado na primeira pintura. Eventos sincronizam o seletor, mudanças de sistema e outras abas; navegar no app mantém a escolha.
- A meta `theme-color` acompanha o tema resolvido. O PNG nunca é recolorido. A faixa usa `band`, não `ink`, pois `ink` se torna claro no tema escuro.
- `@media print` força a paleta clara e `color-scheme: light`; o relatório do gerente continua com fundo branco e texto/bordas pretos, sem menu e ações, independentemente da preferência.

### Tema e navegação do CRM — 05/11/26

Aprovado pelo Felipe em 05/11/2026 ([brief](codex-tema-crm-aprovado.md), [mockup](mockups/tema-crm-aprovado.html)), para o CRM e o Base360 ficarem reconhecíveis um no outro. O Base360 entra em outra etapa.

**Botões** (`.btn` em `crm/src/app/globals.css`):

| | Claro | Escuro | Regra |
| --- | --- | --- | --- |
| Primário `.btn-red`: fundo / texto / hover | `#e11119` / `#ffffff` / `#b90d14` | `#ff6b70` / `#151619` / `#ff9296` | Uma ação vermelha por grupo |
| Secundário `.btn-ghost`: fundo `secondary` / contorno `secondary-edge` | `#efeeea` / `#817d74` | `#303138` / `#878995` | Hover troca o contorno para `ink` |

Raio de 2px, sem sombra, 36px de altura no computador. Abaixo de 768px, todo `.btn` tem **44px de altura mínima**. Foco: contorno de 2px em `brand`, afastado 2px. Campos continuam com `control`; `secondary-edge` é só do botão.

**Navegação** (`crm/src/components/cabecalho.tsx`, ícones em `icones-menu.tsx`, preferência em `src/lib/barra.ts`):

- Os destinos do CRM, com rótulos, URLs, ordem e condições por perfil, continuam vindo de `casca.tsx`. A navegação só desenha. **Atalhos externos** (`ATALHOS` em `cabecalho.tsx`, iguais para todos): **Simulador ↗** (`mbigucci.com.br/ferramentas`), **Site MBigucci ↗** (`mbigucci.com.br`) e **Linktree ↗** (`linktr.ee/construtoraMBigucci`), sempre em nova aba, com "(abre em outra aba)" para o leitor de tela. **Conta:** apelido cadastrado ou, sem ele, o primeiro nome; o menu mostra nome completo, Minha conta e, por último, Sair. Atalhos e conta não se repetem na lateral.
- **Cabeçalho no computador:** o logo **Base360 · Vendas** (SVG inline de `components/marca-base360.tsx`, símbolo de 28px, cores por token: paredes e nome em `ink`, giro em `brand`, traço em `concrete`, módulo em `ink-soft`; um só desenho para os dois temas; o link tem o nome acessível "Base360 Vendas, início"); depois de um divisor `line`, os três atalhos em `ink-soft`, 13px semibold (o mesmo tamanho dos itens da lateral); à direita, "Apelido ▾", que abre o menu da conta em `surface` opaco. Escape ou clique fora fecham, e o Escape devolve o foco ao botão.
- **Menu do celular**, nesta ordem: destinos do CRM; depois de uma divisória, os atalhos com o mesmo tamanho dos demais itens; depois o bloco da conta (nome, Minha conta, Sair) e, encerrando, o logo MBigucci (05/11/2026).
- **Aviso Sem conexão** (`aviso-offline.tsx`, `.aviso-conexao`): flutua no canto superior direito do conteúdo no computador e logo abaixo do cabeçalho no celular, com fundo `surface` a 85% e desfoque (o texto fica opaco). Não desloca o conteúdo, não toma o foco (`role="status"`) e some quando a conexão volta. Fica fora do `<header>`, porque o desfoque do cabeçalho viraria a referência do `position: fixed`.
- **Cabeçalho fixo (`.cabecalho-vidro`), como o do site:** fundo do tema (`paper`) a 85%, desfoque de 12px e borda inferior `line` de 1px. Sem suporte a desfoque, o fundo fica opaco. É `position: fixed` com um espaçador da mesma altura (61px no celular, 64px no computador): `sticky` se soltava no fim da rolagem com o "quique" do Chrome no Windows (Felipe, 05/11/2026). A faixa escura e o menu aberto continuam opacos. O logo foi conferido com a faixa passando por trás, nos dois temas.
- **A partir de 1024px:** cabeçalho de 64px com o logo Base360 · Vendas, e a lateral escura fixa, de **180px aberta e 64px recolhida**. O controle fica **no topo da lateral, antes dos destinos**, com o ícone sanduíche do site (três traços, o do meio mais curto; Felipe, 05/11/2026): aberta, ícone + **Recolher barra**; recolhida, o mesmo ícone no mesmo lugar, com nome acessível **Expandir barra** e dica. O botão é o mesmo elemento nos dois estados, então o foco fica nele ao alternar. Todos os ícones da lateral ficam no mesmo x (23px) aberta e recolhida.
- **Logo MBigucci (05/11/2026):** saiu do cabeçalho. Fica no **rodapé da lateral**, fora da lista que rola, com 24px de altura e divisória `nav-linha`; com a lateral recolhida, some. No celular, fecha o menu, depois da conta. Na tela de entrar, abaixo do formulário. O PNG continua servido pela pasta do site; sem ele, o texto "MBigucci" usa `nav-marca` sobre o grafite (o `brand` não tem 4,5:1 ali) e `brand` sobre `paper`. No celular, o logo Base360 · Vendas tem símbolo de 24px (171px de largura) e cabe ao lado do botão de menu de 44px em 320px.
- A escolha fica no aparelho (`mbigucci-crm-barra` no `localStorage`, com `try/catch`) e é aplicada no `<html data-barra>` por um script no `head`, sem pulo de layout. Recolhida, mostra só os ícones: o rótulo sai da tela, mas continua sendo o nome acessível, e aparece numa dica ao passar o mouse ou focar pelo teclado. Só a lista de destinos rola, sem mostrar a barra de rolagem; o controle de recolher fica sempre à vista.
- **Abaixo de 1024px:** à direita do cabeçalho, o **mesmo botão de menu do site** (`.botao-hamburguer`, Felipe, 05/11/2026): 44px, sem borda, três traços de 2px em `ink` (o do meio mais curto) que viram ✕ ao abrir, com nome acessível **Abrir menu / Fechar menu**; o controle da lateral não aparece. O painel escuro, de largura total, abre logo abaixo do cabeçalho, começa fechado, cabe na altura da tela e rola até o último item. Fecha ao navegar e no Escape, e o Escape devolve o foco ao botão.
- **Cores da navegação**, as do menu do site (Felipe, 05/11/2026), iguais nos dois temas: `nav` `#16181c` (o grafite do site), item atual `nav-ativo` `#2b2d32` (neutro) com barra de 3px `nav-marca` `#ff6b70`, divisórias `nav-linha` `#33363c`, texto `on-dark-soft` (atual em `on-dark`), foco em `nav-marca`. No tema escuro, esse grafite é quase o fundo da página, então a lateral ganha borda direita e o menu do celular borda inferior, em `line`. O site não marca a página atual; o CRM mantém a marcação.
- **Ícones:** desenhos do Lucide (licença ISC, aviso no arquivo), 17px, traço de 2px, sempre `aria-hidden`. Ícone novo de destino entra em `icones-menu.tsx`; destino sem ícone recebe um círculo neutro.
- `.area-principal` recua o conteúdo pela largura da lateral e leva junto os rodapés `fixed inset-x-0` das telas. Na impressão, a lateral some e o recuo zera.
- Em 1366px a área principal mede 1186px com a lateral aberta e 1302px recolhida. A Lista do dia fica com 1140px úteis nos dois casos. Com a barra de rolagem clássica do Windows (15px), a lateral aberta deixa 1131px úteis.

### Conforto de uso — 06/11/26

Aprovado pelo Felipe em 06/11/2026, a partir do [estudo](estudo-conforto-uso.md) com medidas e do [mockup](mockups/conforto-uso.html). A marca não mudou: logo, vermelho, fundos quentes e faixas escuras continuam. Mudou a distribuição deles.

| Regra | Como ficou | Onde está |
| --- | --- | --- |
| Temperatura | "! Quente" em selo neutro (`ink`), com o sinal e a palavra. Morno (○, âmbar) e Frio (–, neutro) não mudaram. Na escolha (Novo lead e ficha), a opção marcada fica invertida (`bg-ink text-surface`), como as outras opções | `TEMPERATURAS` em `crm/src/lib/leads.ts` |
| Barra vermelha | Na Lista do dia, só o **primeiro card da tela** (o primeiro do primeiro grupo mostrado) tem barra e botão vermelhos. Os primeiros dos outros grupos ficam com barra `ink` e botão secundário. Exceção: os cards de visita ("Confirmar no WhatsApp") e de aniversário ("Mandar parabéns") mantêm a sua ação vermelha, uma por grupo | `grupoEmDestaque` em `lista-do-dia.tsx` |
| Números | `.num` é Inter com algarismos tabulares: datas e horas nos cards, células de tabela, campos. Vira Bricolage dentro de título (`h1–h3`, `.titulo-*`), na faixa (`.veredito`), com `font-display`, em extrabold ou com 17px ou mais (contadores da faixa, indicadores do painel, hora da visita, meta). As duas fontes alinham colunas com tabular-nums (medido) | `.num` em `globals.css` |
| Linhas de trabalho do card | Próximo contato, prazo, sem contato e toque em **14px** (apoio continua em 13px e etapa em 12px). Negrito só no **nome** e na **linha mais urgente**, nesta ordem: mensagem nova, prazo do primeiro contato, atrasado, toque a detalhar, sem contato. A urgência real (prazo estourado, atrasado) em 15px, peso 700; as outras em 400, com sinal e cor | `CardLead` e a prop `forte` em `partes.tsx` |
| Prazo correndo | "! Responder em N min" em âmbar (`wa`), como em `docs/leads.md`, seção 4. Estourado continua vermelho; "→ Responder até…" em tinta | `SeloDoPrazo` em `partes.tsx` |
| Controles de escolha | Classe `.opcao` (Como foi, temperatura, origem, atalhos de data, escolhas da recepção, visitas, metas e parceiros): **44px** de alvo abaixo de 768px, como o `.btn`. O desenho de cada um continua no componente | `.opcao` em `globals.css` |
| Alvos fora do botão | Links da faixa da Lista do dia com 44px no celular. No celular, os números clicáveis das tabelas do painel ganham área de toque de 45 × 44px em volta (pseudo-elemento), sem mudar a tabela; no computador, não, porque as linhas têm cerca de 37px | `lista-do-dia.tsx`, `Numero` em `painel/page.tsx` |
| Faixa no tema escuro | Borda de 1px `line` (band sobre paper dá 1,07:1), como a lateral; a barra `brand` continua | `.veredito` em `globals.css` |
| Aviso sem conexão | "! Sem conexão. Nada é gravado no Base360 até a internet voltar." No computador, até 360px de largura. Com o aviso na tela, `scroll-padding-top` (136px no celular, 140px no computador) faz o campo em foco rolar para baixo dele, sem deslocar o conteúdo | `aviso-offline.tsx`, `globals.css` |
| Erro de gravação sem conexão | `erroAoSalvar`: com ou sem rascunho diz "Sem internet: não foi gravado. Tente de novo quando a conexão voltar." (texto do Alicerce, 07/11/2026, passo d); o que foi digitado continua na tela. Leitura continua com `mensagemErro` | `crm/src/lib/erros.ts` (Registrar interação, Novo lead, perfil e toques da ficha via `alterarLead`) |
| Confirmação | "✓ Interação registrada" por 6 segundos depois de registrar, num `role="status"` | `RegistrarInteracao` na ficha |
| Mantidos | Lateral em 180px (nenhum dos 19 rótulos corta); "Linktree ↗" (o Felipe não quis trocar) | — |

Fora desta revisão, no roadmap: o toque em WhatsApp sem internet (hoje se perde sem aviso) e o painel no celular (as tabelas pedem rolagem lateral).


