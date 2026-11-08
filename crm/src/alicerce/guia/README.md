Alicerce é o padrão visual dos sistemas da MBigucci — o **Base360** e seus módulos (Vendas, o CRM do corretor; Repasse; Marketing; o portal na raiz), o painel de propostas, tabelas de vendas, contratos, comissões e ERP. Ele parte da identidade atual da marca (o site mbigucci.com.br: papel off-white, grafite, Bricolage Grotesque e Inter), suaviza os cantos retos do site para o uso diário e tira o vermelho da área de trabalho: por padrão o vermelho é assinatura, não fundo — e um modificador o traz de volta para a ação principal nos sistemas que escolherem. O objetivo é uma tela calma, precisa e que mantém o funcionário na tarefa — mesmo quando ela mostra muitos dados, e mesmo no celular do corretor. A estrutura de painéis e tabelas segue padrões de interfaces corporativas maduras (densidade de dados do Shopify Polaris, hierarquia de superfícies do Tailwind Catalyst, sobriedade da Vercel).

## Princípios

- **Calma.** Fundo `fundo` quente em vez de branco puro, superfícies `superficie`, texto `texto` grafite. Cor só onde ela significa algo.
- **Precisão.** Bordas finas, cantos suaves e sempre os mesmos (`raio-sm` 8px nos controles, `raio-md` 12px nos cartões), números com algarismos tabulares e alinhados à direita — como uma planta de obra.
- **Densidade sem ruído.** Tabelas e listas mostram o máximo de linhas numa tela (36px por linha, texto de 13px, só divisores horizontais). O que economiza espaço é a ausência de caixas, não letras menores.
- **Profundidade com significado.** Micro-sombra só no cartão de fora (a superfície de trabalho) e nos controles (`sombra-campo`, `sombra-botao`); `sombra-elegante`, a do site, só no que está em destaque. Tudo dentro do cartão é plano. Nada de caixa com sombra dentro de caixa com sombra.
- **Foco.** Uma ação principal por tela, em `acao`. Fluxos de preenchimento abrem no `ModoFoco`. Nada pisca, nada se move sozinho.
- **Movimento leve.** A tela entra uma vez, os cards sobem no hover, menus aparecem em fade — e tudo some com o movimento reduzido.
- **Toque.** No celular todo alvo tem 44px e todo campo tem texto de 16px. Toda tela é conferida em 375px.
- **Processo.** Toda venda segue o mesmo caminho e o sistema mostra onde ela está: `Etapas` no registro e `Esteira` nas tabelas (Proposta → Análise de crédito → Aprovação comercial → Contrato → Assinatura), com `Selo` de vocabulário fixo. O lead tem o seu funil (Novo → Em contato → Visita agendada → Visita realizada → Proposta → Venda), mostrado em `Selo` de etapa no `CardLead`.
- **Um sistema só.** Vendas, Repasse, Marketing, o Dashboard e o portal usam as mesmas peças: `CardDeItem` para itens de trabalho, `Lista` para varrer, `Seletor` para escolher, `PainelLateral` para tarefas, `Aviso` e `Toast` para mensagens, `Abas` para recortes, `Selo` para status e etapa, `Chip` para classificação, `Prazo` para prazos, `Quadro` para ver por etapa, `EspelhoDeUnidades` para o prédio, `ConstrutorDeCondicoes` para regras. Um módulo novo não inventa uma peça onde o Alicerce já tem uma.

## Conteúdo e voz

- Português do Brasil, tom profissional e direto. Trate o funcionário por “você”; não use “nós” nas mensagens do sistema.
- Botões com verbo no infinitivo + objeto: “Enviar para aprovação”, “Gerar contrato”, “Salvar rascunho”, “Registrar interação”. Nunca “OK”, “Sim”, “Clique aqui”. Ação que sai do sistema leva “→” (“WhatsApp →”); link para fora leva “↗” (“Simulador ↗”).
- Rótulos em caixa de frase (“CPF do comprador”). MAIÚSCULAS só nas classes `sobrelinha`, `.mb-sobrelinha` e `selo`, como as sobrelinhas do site (ex.: “ÚLTIMOS LANÇAMENTOS”).
- Mensagens dizem o fato e o próximo passo: “Desconto acima da alçada — 5,5% exige aprovação do gerente comercial.”
- Erros com as mesmas palavras em todos os módulos: “Não foi salvo: sem conexão. Faça de novo quando a internet voltar.”, “Sua sessão expirou. Entre de novo em outra aba; o que você digitou continua aqui.”, “Você não tem permissão para isso.”. Nunca texto técnico na tela (nome de tabela, “schema”, “Supabase”, código de erro, mensagem em inglês).
- “Todos” e “Todas” sempre com o substantivo: “Todas as origens”, “Todos os corretores”.
- Urgência por sinal + palavra (`Prazo`): “! Responder em 9 min”, “! Atrasado · Ontem, 10:00”; temperatura “! Quente”, “○ Morno”, “– Frio”. A cor nunca carrega o sentido sozinha.
- **Sinais:** “!” pede ação (atenção, erro, prazo); “✕” só para o que terminou mal (cancelada, não compareceu, descartado); “✓” deu certo; “→” o que vem ou leva para fora do sistema; “○” médio; “–” baixo, pausado ou vazio; “↗” abre em outra aba (decisão do Felipe, 06/11/2026).
- Formatos brasileiros sempre: `R$ 1.348.700,00`, `06/11/2026`, `15:08`, `53,00 m²`, `5,5%`. Use `MB.formatar.moeda`, `.data` e `.area`. Valores compactos (“R$ 48,6 mi”) só em `Indicador` e `Ranking`.
- Nomes de empreendimentos exatamente como no site (“Mundi MBigucci”, “Marco Zero One”, “MBigucci Joy”) e fases com as palavras do site: Futuro lançamento, Lançamento, Em construção, Pronto.
- O sistema se chama **Base360** (uma palavra, B maiúsculo, sem grau); nos textos, o módulo é “Base360 Vendas”. Nome do app no celular: “Base360”.
- Sem emoji, sem exclamações, sem gírias de marketing (“imperdível”) — isso é do site, não da ferramenta de trabalho.
- A lista completa — sinais, mensagens de erro, nomes de estados e etapas, formatos e palavras que não se usam — está em `Vocabulario`. Um módulo novo copia o texto de lá; sinônimo é erro.

## Cor

- Monte telas com quatro camadas: `fundo` (papel, #f6f5f1, a página) → `superficie` (branco puro: cartões, tabelas, menu) → `superficie-sutil` (sub-seções dentro do cartão, cabeçalho de tabela) → `areia-suave`/`areia` (hover e seleção). Bordas em `linha`; borda de controles em `linha-forte`.
- Texto em `texto`; secundário em `texto-suave`; metadados e ajuda em `texto-sutil` (≥ 4,5:1 em todas as camadas, inclusive `areia`).
- A ação principal é `acao` (grafite no tema papel, papel no tema grafite) com `sobre-acao`. É o elemento de maior contraste da tela, e por isso o olho vai até ele sem precisar de vermelho.
- **Seleção e andamento são tinta.** Opção, filtro, aba e marcador marcados, etapa concluída, esteira e barras de progresso usam `texto` — não `acao` —, então não mudam com o modificador de marca.
- `marca` (#e11119, o vermelho exato do site, do logotipo MBigucci e do giro do Base360) aparece sempre em três lugares e só neles: o logo, o quadradinho de 6px do item ativo do menu (claro, escuro e folha do celular) e o ponto de notificação. Nunca em fundos grandes, textos, barras de cartão ou selos: em área grande o vermelho cansa e é lido como erro.
- **Vermelho como ação principal (preferência da pessoa):** `data-acao="marca"` no `<html>` troca `acao`, `acao-hover` e `sobre-acao` por `acao-marca` (#e11119), `acao-marca-hover` (#b90d14) e `sobre-acao-marca` (branco, 4,89:1 nos dois temas). Cada módulo define o padrão no `<html>` e a pessoa escolhe por cima, em Minha conta → `Aparencia` (decisão do Felipe, 06/11/2026: quem já está acostumado com o Repasse mantém o botão vermelho). Com ele:
  - **só o botão principal muda.** Sobrelinhas, links, unidades, abas, seleção e andamento ficam exatamente como sem o modificador;
  - o botão negativo (`--perigo`) passa ao grafite (`acao-grafite`), para a tela ter um só vermelho. O que diz “destrutivo” é o verbo (“Cancelar proposta”) e o `Dialogo` de confirmação, nunca só a cor;
  - um primário por tela: o vermelho é um botão, nunca um bloco. No computador ele tem o tamanho do texto; largura inteira só no celular (`--bloco-celular`, `BarraDeAcoes --unica`).
- **WhatsApp é verde (exceção do produto, decisão do Felipe, em todos os módulos):** `whatsapp`, `whatsapp-hover`, `sobre-whatsapp`, só no `BotaoExterno`, com o ícone de conversa e sempre com a palavra “WhatsApp” — a palavra é o que separa o verde do vermelho ao lado para quem tem daltonismo vermelho-verde. No resto do Alicerce, verde é sucesso.
- Status usam o par `*-fundo` + `*-texto` com o marcador `sucesso`, `alerta`, `erro` ou `info` — sempre com a palavra junto. Vermelho de status (`erro`) significa erro (e ação destrutiva nos módulos sem o modificador), e nada mais.
- **Todo chip tem cor**, em qualquer módulo: um selo ou pílula só em tinta ou contorno não existe. Cada um com fundo `*-fundo`, texto `*-texto` e marcador (ponto ou sinal) no tom, sempre com a palavra.
- **Status, etapa e classificação:** status de proposta, contrato, unidade e visita e a etapa do lead são `Selo` (retângulo, MAIÚSCULAS, ponto); a classificação (temperatura do lead, prioridade da pendência) é `Chip` (pílula, caixa de frase, sinal), de propósito com outra forma, para nunca parecer status; prazo é `Prazo` (texto colorido com sinal). Na tabela de propostas a etapa da venda continua na `Esteira`.
- **Etapas do lead, do mais tranquilo ao mais intenso** (decisão do Felipe, 06/11/2026): uma família própria, ameixa, que não se confunde com status nem com temperatura, e cresce em intensidade com a atenção que a etapa pede — `etapa-vendas-contato` (a mais tranquila) → `etapa-vendas-agendada` → `etapa-vendas-realizada` → `etapa-vendas-novo` (prioridade: pede o primeiro contato) → `etapa-vendas-proposta` (a mais intensa). Venda usa `sucesso`. Cada módulo tem o seu funil (`etapa-<módulo>-*`); as saídas são comuns. As visitas seguem as cores da etapa do lead (`Compromisso`). Perdido e Descartado saem do funil em dois grafites esmaecidos (`etapa-perdido`, `etapa-descartado`). A ordem está na claridade, não só no tom: funciona para quem tem daltonismo.
- **Classificação (`Chip`):** `nivel-alto` laranja, `nivel-medio` amarelo, `nivel-baixo` ardósia — temperatura no Vendas (Quente, Morno, Frio), prioridade nos outros módulos (Alta, Média, Baixa); “Sem…” em `areia`. O alto não é vermelho (o vermelho é do logo, do menu e da ação) e o baixo não é azul (azul é foco, link e andamento).
- **Gráficos** (`Graficos`, `Funil`): cores de série `grafico-1` a `grafico-5`, no máximo cinco por gráfico, ordenadas por claridade; “Outros” e “Não informado” sempre em `grafico-outros` (cinza). Barras divergentes em `grafico-negativo` (telha) e `grafico-positivo` (azul), nunca vermelho e verde, com o sinal no valor. O funil usa as cores das etapas do módulo. Sem pizza, sem rosca, sem 3D; o valor sempre escrito.
- Fases da obra usam `fase-futuro`, `fase-lancamento`, `fase-obras`, `fase-pronto`, os valores exatos da legenda do site, só como quadradinho ao lado da palavra.
- **Espelho de unidades** segue as cores do espelho do Repasse e do Dashboard (decisão do Felipe, 06/11/2026): disponível em verde (`sucesso`), reservada em azul (`info`), alugada à venda em âmbar (`alerta`), vendida em rosa (`espelho-vendida`, que não é o vermelho de erro nem o de marca) e fora de venda em cinza com hachura. A palavra vai sempre na unidade.
- Links em `link` (o azul de `foco`; no papel, um passo mais escuro, para passar 4,5:1 também no hover das linhas), sempre sublinhados. Em tabelas, o código na primeira coluna fica em `texto` com sublinhado discreto e só fica azul no hover.
- Andamento: `texto` (tinta) = concluído, `info` (azul) = em andamento, `trilho` = aguardando — o mesmo código em `Etapas`, `Esteira`, `Indicador` e `Meta`. `trilho` é `linha-forte`: 3:1 sobre a superfície, para a barra inteira aparecer.
- Faixa e menu escuro: `faixa`/`sobre-faixa`/`sobre-faixa-suave` no `ResumoDePendencias` (grafite no papel, vinho no grafite; um bloco escuro por tela); `menu-escuro`, `sobre-menu`, `menu-ativo` no menu grafite — preferência da pessoa (`data-menu="escuro"` no `<html>`, em Minha conta → `Aparencia`) com padrão de cada módulo. Ele muda **só o fundo** do menu: o item ativo tem o mesmo fundo mais forte e o mesmo quadradinho em `marca` do menu claro, e a folha do celular segue igual.
- Dois temas: **papel** (padrão, claro) e **grafite** (escuro, para quem passa o dia na tela ou trabalha com pouca luz). A pessoa pode escolher **Automático**, que segue o claro ou escuro do aparelho e troca junto com ele. Todo par de texto acima tem contraste ≥ 4,5:1 nos dois temas; bordas de controle, trilhos e marcadores ≥ 3:1 — medido por `ferramentas/contraste.mjs` (rode `node ferramentas/contraste.mjs` antes de publicar uma versão; zero falhas). Exceção registrada: `fase-obras` fica abaixo de 3:1 sobre os fundos claros — por isso a fase nunca depende só da cor.

## Tipografia

- Três famílias: **Bricolage Grotesque** (`display`) e **Inter** (`sans`), as mesmas do site, e **Geist Mono** (`mono`) só para códigos. Os arquivos estão em `fonts/`.
- Escala: `titulo-tela` (28px, um por tela) → `titulo-secao` (20px) → `titulo-cartao` (16px); `numero-destaque` (32px) só em `Indicador`; `numero-faixa` (40px) só no `ResumoDePendencias`; `titulo-item` (17px) no título do `CardDeItem` (nome do lead, data do compromisso). `nome-lead` é o apelido antigo de `titulo-item`.
- Texto da interface em `corpo` (14/22); ênfase em `corpo-forte`; textos longos (cláusulas, observações) em `leitura` (16/26) com no máximo `leitura-max` de largura.
- `rotulo` (13px, 600) para rótulos de campo; `legenda` (12px) para ajuda e metadados; `sobrelinha` (11px, 0,12em, maiúsculas) para títulos de grupo e menu; `.mb-sobrelinha` é a mesma sobrelinha como eyebrow acima de títulos de cartão, sempre em `texto-sutil`.
- Grupo **Dados**, para telas densas: `corpo-compacto` (13/18) nas células e listas; `cabecalho-tabela` (11px, 600, maiúsculas, 0,06em, `texto-sutil`) nos cabeçalhos de coluna; `dado` (13px, 500) para valores, metragens, percentuais e datas; `dado-codigo` (Geist Mono 12px) para nº de proposta, contrato, unidade, CPF/CNPJ e boleto.
- Alinhamento financeiro: todo número que se compara com outro usa a variação tabular da Inter (`.mb-valor`, `.mb-num`, `.mb-tabela__num`) e fica alinhado à direita — dígitos com a mesma largura mantêm milhares e vírgulas na mesma coluna. O `R$` vai em `.mb-valor__moeda`, um tom abaixo; em números de síntese (meta, painel), `R$`, `%` e `dias` vão em `.mb-unidade`: 60% do tamanho do número, Inter 500, `texto-suave`, na mesma linha de base — menor e mais leve, nunca de outra cor. Fonte mono é só para códigos: em valores ela alarga a coluna sem alinhar melhor.
- No celular, o texto digitado em campos é `texto-campo-toque` (16px): abaixo disso o iOS dá zoom na página. O `corpo` de 14px continua para leitura.
- Títulos em Bricolage com espaçamento levemente negativo, como no site; nunca Bricolage em parágrafos ou rótulos.

## Espaço e estrutura

- Grade de 4px: `esp-1` 4 · `esp-2` 8 · `esp-3` 12 · `esp-4` 16 · `esp-5` 20 · `esp-6` 24 · `esp-8` 32 · `esp-10` 40 · `esp-12` 48 · `esp-16` 64.
- Estrutura padrão: `.mb-app` = `MenuLateral` (`menu-largura`, 248px) + conteúdo com margem `esp-6` e largura máxima `conteudo-max` (1280px).
- Formulários numa coluna de até `leitura-max` (720px), em `.mb-form-grade` de 12 colunas; grupos separados por `esp-8`.
- Controles com altura fixa: `controle-p` 32 (tabelas, filtros, busca do topo), `controle-m` 40 (padrão), `controle-g` 48 (ação final).
- Telas de trabalho (`.mb-app`) = `MenuLateral` + `BarraSuperior` (`topo-altura`, 56px, no mesmo tom do fundo) + conteúdo. **A conta tem um lugar só:** no topo, à direita (`MenuDaConta`); no celular, no fim da folha do menu. O menu lateral não repete a conta. Painéis usam `.mb-painel` (pilha com `esp-4`) e `.mb-painel__linha` (12 colunas; `--mb-colunas` define a largura de cada cartão).
- **Camadas** (família `camada`, nunca um número solto): `camada-conteudo` (1, cabeçalhos e colunas fixos, link esticado do card) → `camada-fixo` (10, barras de ação) → `camada-topo` (20, barra superior e cabeçalho do celular) → `camada-popup` (30, menus e dicas) → `camada-painel` (40, painel lateral e folhas) → `camada-dialogo` (50) → `camada-aviso` (60, toast e conexão). O véu fica um abaixo da sua camada.

## Celular e toque

- Pontos de quebra (família `quebra`): 640px (campos em linha inteira), **768px** (celular), 1024px (cartões do painel empilham). Teste sempre em `tela-celular` (375px) e `tela-computador` (1280px), nos dois temas.
- **Notificações no celular:** o sino sai do topo; o ponto vai para o ícone de menu e “Notificações” entra na folha com a contagem (`Notificacoes`).
- Abaixo de 768px: todo botão, opção, campo, filtro, aba, item de menu, link de faixa e link de tabela tem pelo menos `controle-toque` (44px); o `MenuLateral` e a `BarraSuperior` saem e entra o `MenuCelular` (o lockup à esquerda; à direita o + do módulo, na cor de destaque, e o ícone de menu do site na ponta; a faixa de status com cor embaixo; a folha desce do topo com itens de `item-toque`, 48px); o conteúdo ganha margem de `esp-4`.
- Links dentro de texto ganham área de clique sem mudar a linha (padding vertical em linha): 28px (`alvo-minimo`) no computador, 44px no celular.
- **Rodapé fixo só em telas de preenchimento** (cadastro, formulário, painel de tarefa): `BarraDeAcoes --unica`, botão de largura inteira. Nas telas de lista, quem cria é o + do cabeçalho (decisão do Felipe, 06/11/2026), para o rodapé não brigar com o que o módulo põe no topo. `.mb-so-celular` e `.mb-so-computador` mostram cada versão onde ela cabe.
- **Tabela no celular, conforme o tipo** (decisão de 06/11/2026): tabela de registros (leads, contratos, fila) vira lista de `CardDeItem`; tabela de números (painel, relatórios, metas) rola dentro do próprio quadro com a primeira coluna e a linha Total fixas (`.mb-tabela--primeira-fixa`). Nunca as duas versões escritas à mão.
- No computador, os componentes do corretor têm 36px ou mais; as ações densas do ERP continuam com o mínimo de 28px.

## Densidade de dados

- Tabelas: linhas de `linha-tabela` (36px), cabeçalho de `linha-cabecalho` (32px), `--densa` com `linha-tabela-densa` (32px) para centenas de unidades. Padding lateral de 12px nas células e 16px nas pontas, alinhado à borda do cartão.
- Só divisores horizontais de 1px em `linha`. Nenhuma linha vertical, nenhuma caixa em volta de células — com uma exceção: a primeira coluna fixa (`--primeira-fixa`) ganha um fio à direita, para mostrar que o resto da tabela rola por baixo dela.
- Listas de pendências (`.mb-lista`): itens de 48px com código, título, meta e um valor à direita.
- Filtros rápidos em pílulas (`.mb-filtro`, 28px) na `.mb-tabela-barra`, contagem e paginação no `.mb-tabela-rodape`.
- Indicadores com padding de 16px e valor em 28px: quatro cabem numa linha de 1144px.
- O que se compacta é o espaço vazio. Texto nunca abaixo de 11px, alvo de clique nunca abaixo de `alvo-minimo` (28px) no computador e de `controle-toque` (44px) no celular.

## Bordas, raios e sombras

- Cantos arredondados em quatro medidas, nunca outras: `raio-xs` (4px) em peças pequenas — selos, checkbox, quadradinho de fase, marcador de etapa; `raio-sm` (8px) em controles — campos, selects, grupos com R$/m², botões, itens do menu; `raio-md` (12px) em contêineres — cartões, tabelas, avisos, indicadores, cards de lead; `raio-lg` (16px) no que flutua — diálogos, menus suspensos. `raio-total` para pontos, pílulas (opções, selos do corretor, chip de etapa) e barras de progresso. Exceção registrada: marcas de até 10px — o quadradinho do item ativo do menu, as amostras de cor da legenda e do espelho, os segmentos de gráfico e os traços de meta — usam 1 a 2px, proporcionais ao tamanho (com 4px viram bolinhas).
- Campos são brancos (`campo`), com borda `linha-forte` e `sombra-campo`: uma elevação de 1–6px quase imperceptível, no estilo dos campos do Stripe Elements, que faz o campo parecer “pronto para digitar”. No tema grafite, `campo` é um pouco mais claro que a superfície, pelo mesmo motivo.
- Botões preenchidos (primário, perigo, WhatsApp) usam `sombra-botao`, que some ao pressionar. O secundário usa `sombra-campo`. Com o modificador de marca, o primário ganha `sombra-botao-marca` no hover.
- Somente leitura e desativado são planos: sem sombra, borda `linha`, fundo `areia-suave`. A ausência de profundidade diz “não editável”.
- Cartões principais: branco puro (`superficie`) sobre o papel, borda `linha`, `raio-md` e `sombra-cartao` — a mesma micro-sombra dos campos. Tabelas e indicadores soltos no painel seguem a mesma regra.
- `sombra-elegante` (a do site: `0 18px 50px -24px`) só em destaque: o primeiro `CardDeItem` da tela, o `ResumoDePendencias` e o hover dos cards que sobem.
- Dentro de um cartão, nada leva sombra nem borda completa. Agrupe com `.mb-subsecao` (fundo `superficie-sutil`, sem borda) ou `.mb-subsecao--linha` (só um fio de 2px em `linha` na lateral esquerda), e separe seções com uma linha horizontal. Uma tabela dentro do cartão perde a própria moldura. Nenhum cartão leva barra lateral de cor, nem o `CardLead`: o primeiro card da tela se destaca só pela `sombra-elegante`.
- **Cartao e CardDeItem são o mesmo material:** `superficie`, borda `linha`, `raio-md`, `sombra-cartao` e o mesmo rodapé de ações em `superficie-sutil`, quase branco, com o fio em cima (no máximo duas ações, a principal cheia por último; a segunda com borda só se for de uso diário; sem menu “⋯” no card: o que é crítico fica no registro aberto). O que muda é o uso: o Cartao agrupa uma seção de um registro; o CardDeItem é um item de lista que se abre inteiro e sobe no hover.
- Sombra média só no que flutua: `sombra-flutuante` (diálogos, menus, popup da conta, toast, aviso de conexão) e `sombra-barra` (barra de ações fixa).
- Prefixos e sufixos (`R$`, `m²`) ficam dentro do mesmo campo arredondado (`.mb-campo__grupo`), separados por uma linha fina — nunca caixas soltas coladas.

## Movimento

- Tokens da família `movimento`: `mov-rapido` (140ms, hover e toque), `mov-base` (200ms, popup, véu, toast e troca de tema), `mov-entrada` (220ms, entrada dos cards e folha do menu), `mov-cartao` (300ms, hover do card), curva `mov-curva` (`cubic-bezier(0.2, 0.7, 0.2, 1)`) em tudo.
- **Entrada só ao abrir a tela:** blocos com `.mb-entra` sobem `mov-entrada-y` (6px) em cascata de `mov-cascata` (40ms); `MB.entrada.numerar()` numera. Nada entra de novo ao rolar ou ao atualizar dados.
- **Hover:** o card sobe `mov-elevacao` (4px) com `sombra-elegante`; o botão primário sobe `mov-botao-y` (1px); todo botão e opção encolhe 3% ao toque (`mov-pressao`).
- **Tema muda sem piscar:** `MB.preferencias.restaurar()` aplica as escolhas salvas sem transição na primeira pintura; trocar tema, menu ou botão em `Aparencia` muda as cores em `mov-base`.
- **Movimento reduzido:** `prefers-reduced-motion` e a chave do usuário (`MB.movimento.aplicar('reduzido')`, que põe `data-movimento="reduzido"` no `<html>`) zeram animação, transição e a própria elevação.
- Nada pisca, nada se move sozinho: sem carrosséis, sem pulso em esqueletos. O único giro é o do botão `aria-busy`. A única exceção é o `ModoTelao` (decisão do Felipe, 06/11/2026): numa TV, as abas trocam a cada 60 s, com a barra do tempo à vista e Pausar.

## Foco e atenção

- Foco de teclado: em botões, links e marcadores, anel sólido de 2px em `foco`, 2px afastado (acompanha o arredondamento). Em campos, a borda vira `foco` com mais 1px por fora (2px sólidos) e um halo suave `sombra-foco`; em campos com erro, o mesmo em `erro` com `sombra-erro`. Sobre a faixa escura o anel é `sobre-faixa`. Nunca remova o foco visível.
- Uma ação `--primario` por tela; a segunda ação mais importante é `--secundario`. WhatsApp é externo e verde: não compete com a principal. A única exceção é o **+ Novo do módulo** no cabeçalho, sempre na cor de destaque (decisão do Felipe, 06/11/2026): ele é do módulo, não da tela, e fica sempre no mesmo lugar.
- Fluxos de preenchimento (nova proposta, novo contrato, correção de tabela) abrem no `ModoFoco`: menu fora, conteúdo em uma coluna, só a seção ativa em contraste total, `Esc` para sair.
- Formulários longos têm `BarraDeAcoes` fixa com o total e o próximo passo; rascunho salvo automaticamente.
- Avisos que impedem ou orientam o trabalho ficam na página, no ponto em que importam (`Aviso`), em todos os módulos: atraso de contato no topo da ficha, lembrete de registrar a interação acima do formulário. O `Toast` (a mesma família, flutuando embaixo, um por vez) fica para quatro usos: Desfazer, confirmar o que deu certo, erro que não bloqueia (fica até fechar) e informação do sistema (como “Há uma versão nova do Base360 · Atualizar”, que nunca recarrega a página sozinho). `AvisoConexao` fica fixo enquanto faltar internet.

## Regras de interação (decisões de 06/11/2026, depois de olhar Vendas, Repasse e Dashboard)

- **Onde abre uma tarefa:** o que é curto (até dois campos: Remarcar, Observação, Corrigir) abre **dentro do próprio card** (`.mb-item__edicao`), e o card cresce. Mais de dois campos abre no **`PainelLateral`** (no celular, a folha que sobe): registrar interação, mensagem pronta, cadastro de empresa ou usuário, o relatório de um número. A janela no meio da tela (`Dialogo`) é **só** para confirmar o irreversível. Nada de `confirm()` do navegador.
- **Confirmação por risco:** o que volta atrás não pergunta antes e mostra **Desfazer** (`Toast`, 8 s): etapa, descarte, baixa, cancelar visita. Tirar um item de uma lista pede **“Remover?” na própria linha**, com “Remover” e “Cancelar”. O que não volta (fechar o mês, encerrar a competência, aplicar uma importação, desligar a distribuição) abre o **`Dialogo` com o efeito escrito** (“Ninguém mais lança pontos de outubro”). Quando a regra pede motivo (cancelar venda, recusar lançamento, corrigir visita), o motivo é **obrigatório** no próprio painel ou card.
- **Possível duplicado, conforme a regra do cadastro:** quando pode seguir, um `Aviso --alerta` com o registro encontrado e dois botões, “Abrir o existente” e “Cadastrar assim mesmo”; quando existe mas a pessoa não tem acesso, só informa e diz o que fazer (“Já está com outro corretor. Confira com seu gerente.”); quando é proibido, bloqueia e explica. Nunca “toque de novo no mesmo botão”.
- **Estado na URL:** filtros, busca, período e aba ficam no endereço, para o link compartilhado abrir igual e o Voltar funcionar.
- **Carregando** é o esqueleto parado de `Carregando`, nunca “Carregando…” escrito em cada tela; **vazio** é `EstadoVazio`; **erro de carga** diz o que houve e oferece “Tentar de novo”, nunca uma lista vazia (`EstadosDePagina`, com sem permissão, não encontrado, conta e em construção).
- **Arrastar sempre tem outro caminho:** no `Quadro` e nas listas de opções, o teclado faz o mesmo (Espaço pega, setas levam, Espaço solta, Esc devolve) e, no celular, a mudança é feita no registro ou com as setas; depois de soltar, Desfazer.
- **O que a pessoa não pode mudar aparece bloqueado, com quem muda** (“Para trocar, fale com seu gerente.”); a página sem permissão diz de qual perfil ela é. As permissões ficam numa tabela só (`MatrizDePermissoes`), e mudar salva tudo junto com o efeito escrito.
- **Trocar de módulo** fica no mesmo lugar em todos: no computador, **Módulos** no rodapé do `MenuLateral` (abre ao lado, com os módulos que a pessoa pode abrir e o atual marcado); no celular, o grupo **Módulos** na folha. Todos abrem na mesma aba. Quem só tem um módulo não vê.
- **Catálogos** (origens, mídias, motivos, tipologias) se desativam, não se apagam: só o que nunca foi usado pode ser removido (`ListaDeOpcoes`).
- **Versão nova** avisa e espera (`VersaoNova`); **atalhos** são poucos, iguais em todos os módulos e desligáveis em Minha conta (`AtalhosDeTeclado`).

## Estados

- Hover: fundo `areia-suave` (itens, linhas) ou `acao-hover` (primário); cards sobem 4px.
- Selecionado: `areia` (linha de tabela com `aria-selected`, item de menu com `aria-current`); opção marcada em `texto`.
- Desativado: opacidade 45%, cursor bloqueado — e diga por quê perto do controle.
- Carregando: `aria-busy="true"` no botão (giro + gerúndio: “Calculando…”); listas e cards com o esqueleto estático de `Carregando`.
- Sem conexão: `AvisoConexao`; o trabalho continua e sobe depois.
- Erro de campo: borda `erro` + `.mb-campo__erro` com ícone e texto em `erro-texto`; ao focar, halo `sombra-erro`.
- Somente leitura: plano — fundo `areia-suave`, borda `linha`, sem sombra (valores calculados).

## Iconografia

- A biblioteca de ícones da interface é a `Icones`: um desenho por sentido, contorno no estilo Lucide (traço 1,75px, cantos arredondados, grade de 20px), em `currentColor`, com a classe `.mb-icone` (16px; 18px na folha do celular; 20px em avisos; 24px nos estados de página; 28px em estados vazios). No código, `MB.icone('busca')`; ícone novo entra lá primeiro, com nome em português.
- Ícone sempre acompanha texto, exceto em botões `--icone` com `aria-label`.
- Sem emoji e sem ícones coloridos: a cor do ícone vem do texto ou do tom do aviso. Sinais de texto (“!”, “✕”, “✓”, “○”, “–”, “→”, “↗”) são parte do vocabulário, com o sentido fixo de Conteúdo e voz.
- **O ícone de menu é o do site mbigucci.com.br** (`.mb-menu-icone`): três traços de 2px num desenho de 24 × 16px — o do meio com dois terços da largura — que viram X ao abrir. Ele abre a folha no celular e recolhe o menu lateral no computador.

## Logotipo

- **Base360 (o sistema):** o lockup do módulo — símbolo, “Base360”, traço, módulo — no topo do `MenuLateral`, no cabeçalho do celular e na tela de entrar (`MarcaBase360`, `data-mb-marca="Vendas"`). Símbolo de `marca-simbolo` (28px) no computador e `marca-simbolo-celular` (24px) no celular. “Base360” sozinho só no portal. Os arquivos (lockups claro e escuro, símbolo, logotipo, ícone, ícone maskable e favicon) estão no grupo Base360; o escuro usa o mesmo #e11119 (um só vermelho).
- **MBigucci (a empresa):** o arquivo para os sistemas é `assets/Logos/mbigucci-logotipo.png`; copie para a pasta pública do módulo. Fora do logo do sistema — no rodapé da lateral, no fim do menu do celular e na tela de entrar, a `marca-mbigucci` (24px) de altura, com `.mb-logo-mbigucci` (recorta o `mbigucci-logotipo.png` pelo retângulo). Entra sem selo e sem filtro.
- Em documentos de cliente impressos e PDFs (proposta, contrato), use `mbigucci-logotipo-assinatura.png` (com “Construindo uma vida melhor” e CRECI) no cabeçalho. O Base360 não vai no papel do cliente.
- Não recolora, não distorça, não aplique sombra e não reconstrua nenhum dos dois logos em CSS ou com a fonte instalada: o lockup inline usa os contornos oficiais e só troca as cores pelos tokens. Detalhes em Logos e Base360.
- Pendente do Felipe: busca no INPI e aprovação da diretoria antes de publicar o nome Base360.

## Impressão

- Propostas, fichas e relatórios imprimem em A4, uma página quando possível, margens de 12mm. O `@media print` de `bundle.css` já esconde menu, folha do celular, botões, barras, toast e aviso de conexão, e tira animações e sombras.
- Tudo precisa funcionar em preto e branco: selos e avisos imprimem como palavra com contorno, fases com quadrado preto, cards e faixa com contorno preto — o significado está sempre no texto.

## Como usar

- Carregue `tokens.css` e depois `components/bundle.css`; opcionalmente `components/bundle.js` (expõe `window.MB`). Todas as classes começam com `.mb-`. O `tokens.css` sai do `tokens.json` (a fonte única): `node ferramentas/tokens-css.mjs --fontes=/caminho/das/fontes/ > tokens.css`, com as três fontes de `fonts/` publicadas nesse caminho. Não edite `tokens.css` nem `bundle.css` dentro do módulo: ajuste local vai num arquivo à parte e, se for de todos, volta para o Alicerce.
- Escreva o padrão do módulo no `<html>`: `data-theme` ("papel", "grafite" ou "auto", que segue o claro ou escuro do aparelho), `data-menu` ("claro" ou "escuro") e `data-acao` ("grafite" ou "marca"). No carregamento, `MB.preferencias.restaurar()` aplica por cima o que a pessoa escolheu em Minha conta → `Aparencia`; ouça o evento `mb-preferencias` e salve a escolha no cadastro dela, para valer em todos os módulos e aparelhos.
- `window.MB` também traz: `MB.marca.montar()` (lockups), `MB.entrada.numerar()`, `MB.menuCelular.ligar(botao)`, `MB.menuLateral.ligar(botao)` (recolher, lembrado no aparelho), `MB.popup.ligar(botao)`, `MB.opcoes.ligar(grupo)` (uma, várias ou desmarcável), `MB.interruptor.ligar(botao)`, `MB.abas.ligar(lista)`, `MB.painel.ligar(botao)` (painel lateral), `MB.edicao.ligar(botao)` (edição no card), `MB.preferencias.ligar(cartao)`, `MB.toast.mostrar(texto, { tipo, aoDesfazer })`, `MB.conexao.ligar(elemento)`, `MB.aoVivo.marcar(elemento)`, `MB.compartilhar.abrir(dados, botao)`, `MB.envio.ligar(rotulo)`, `MB.tabela.ligar(tabela, lote)` (ordenar e marcar em lote), `MB.salvo.marcar(el, estado)`, `MB.mascara.ligar(campo)` (CPF, CNPJ, telefone, CEP, moeda, %), `MB.sugestoes.ligar(campo)` (busca com sugestões), `MB.confirmar.ligar(botao)` (Remover? na linha), `MB.painel.abrir(caixa, origem)` (um painel para muitos itens), `MB.quadro.ligar(raiz)` (arrastar e teclado), `MB.notificacoes.ligar(caixa)`, `MB.atalhos.ligar(mapa)` e `.ativos()`, `MB.versao.vigiar(url, versao)` e `.avisar()`, `MB.senha.ligar(grupo)` e `.requisitos(campo, lista)`, `MB.telao.ligar(raiz)`, `MB.espelho.ligar(raiz)`, `MB.condicoes.ligar(raiz)`, `MB.catalogo.ligar(lista)`, `MB.indice.ligar(lista)`, `MB.varios.ligar(raiz)` (escolher vários com busca), `MB.icone(nome, rotulo)` e `MB.formatar`.
- Use sempre os tokens (`var(--acao)`, `var(--esp-4)`, `var(--raio-sm)`, `var(--sombra-campo)`, `var(--mov-rapido)`); nenhuma cor, medida, raio, sombra ou duração escrita à mão nos sistemas.
- Cada componente tem guia e exemplo vivo: Botao, BotaoExterno, Compartilhar, Campo, DataHora, Envio, Marcador, Seletor, Interruptor, Selo, Chip, Prazo, Fase, Esteira, Aviso, AvisoConexao, Toast, DadosAoVivo, Carregando, Cartao, CardDeItem, CardLead, Compromisso, Lista, Recolhivel, ResumoDePendencias, Meta, Ranking, Tabela, TabelaCompleta, TabelaNoCelular, BarraDeFiltros, Exportar, Graficos, Funil, Indicador, RelatorioDoNumero, FormularioDenso, LinhasRepetiveis, BuscaComSugestoes, Duplicado, ImportacaoComPrevia, MensagemPronta, ConfirmarNaLinha, Historico, EstadoVazio, EstadosDePagina, EscolherVarios, Quadro, Notificacoes, VersaoNova, AtalhosDeTeclado, Entrar, MinhaConta, AssistenteEmPassos, EspelhoDeUnidades, CardEmpreendimento, ConstrutorDeCondicoes, MatrizDePermissoes, ListaDeOpcoes, ModoTelao, Icones, Vocabulario, MarcaBase360, MenuLateral, MenuCelular, MenuDaConta, Aparencia, BarraSuperior, CabecalhoDePagina, NavegadorDePeriodo, Abas, Etapas, BarraDeAcoes, PainelLateral, Dialogo e o padrão ModoFoco.
- Telas de referência: `PainelCentral` (CRM e ERP no computador), `ListaDoDia` (a rotina do corretor no celular: resumo de pendências, a rotina inteira numa lista só com cards clicáveis e Registrar no painel que sobe) `FichaDoLead` (o lead no computador: `Aviso` no topo, a visita como `Compromisso` e Andamento, Documentos e Histórico em `Abas`), `ModoTelao` (o painel numa TV), `Entrar` e `MinhaConta` (iguais em todos os módulos). Comece um módulo novo copiando a estrutura da mais parecida.
