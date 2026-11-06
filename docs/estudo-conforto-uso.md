# Estudo · Conforto de uso do tema (Base360 Vendas)

> Etapa 1 do [brief](codex-conforto-uso.md), feita em 06/11/2026 numa sessão Claude. Só diagnóstico e comparação: **nada foi aplicado no app**. A comparação visual está em [mockups/conforto-uso.html](mockups/conforto-uso.html) e abre sem servidor.

## Sumário

1. [Como foi medido](#1-como-foi-medido)
2. [Quadro dos 8 itens](#2-quadro-dos-8-itens)
3. [As 3 tarefas observadas](#3-as-3-tarefas-observadas)
4. [Evidência por item](#4-evidência-por-item)
5. [Decisões do Felipe](#5-decisões-do-felipe-uma-por-vez-a-recomendada-primeiro)
6. [O que vira frente própria](#6-o-que-vira-frente-própria)
7. [Achados fora dos 8 itens](#7-achados-fora-dos-8-itens)
8. [O que a prévia não mostra](#8-o-que-a-prévia-não-mostra)

## 1. Como foi medido

- **Prévia isolada:** `crm/scripts/visual-preview.mjs` com a árvore de hoje (depois de `abced78`), servida em `127.0.0.1:4173/vendas/`. Sem `.env` e sem Supabase, com dados fictícios. Em `crm/scripts/visual-fixtures.ts` entraram 4 leads fictícios para um dia mais cheio: nome longo, morno e frio atrasados, um lead da empresa com prazo correndo e um de hoje.
- **Navegador:** Chrome headless de teste, com perfil em `crm/local/perfil-conforto` (fora do Git), comandado pela CDP. Ele não usa a sessão do Felipe nem o mouse dele.
- **Script:** `crm/scripts/capturar-conforto.mjs` (novo). Mede no navegador fonte, peso e família computados, usos do vermelho por card e por tela, altura da faixa e quanto do primeiro card aparece, rótulos da lateral, largura de algarismos, alvos de toque e o que o aviso Sem conexão cobre. Os cenários ficam em `crm/local/conforto/*.json`.
- **Capturas e medidas:** `docs/revisao-visual/conforto/` (`base/`, `tarefas/`, `extra/`, com `medidas.json` em cada uma). **Ficam fora do Git:** a pasta não está no `.gitignore`, então não deve entrar no commit.
- **Contraste:** `node scripts/contraste-temas.mjs` passa (106 pares). Alguns pares a mais foram calculados com a mesma função.
- **Larguras:** 375 × 812 (celular), 1280 × 720 e 1366 × 768 (notebook), nos temas claro e escuro.

## 2. Quadro dos 8 itens

| # | Item | Veredito | Evidência principal |
| --- | --- | --- | --- |
| 1 | Legibilidade e peso | **Ajuste visual** | O próximo contato e o "sem contato" estão em 13px, como o texto de apoio. Nos cards da lista, 7 de 9 textos têm peso ≥ 600 (Ana: 10 de 13) |
| 2 | Hierarquia do vermelho | **Ajuste visual + decisão de DS** | Até 7 usos de vermelho num card. A primeira tela tem 7 pontos vermelhos no celular e 8 no notebook. Cada grupo pinta de vermelho a barra do seu primeiro card, e "Quente" usa o mesmo vermelho da urgência |
| 3 | Faixa escura de atenção | **Atendido, com 2 ajustes pequenos** | Ocupa 264px (39% da área útil) a 375 × 812, e o primeiro card aparece inteiro (99%). Os links da faixa medem 32px de altura. No tema escuro, a faixa e o fundo dão 1,07:1 |
| 4 | Largura da lateral | **Atendido: ficar em 180px** | Nenhum dos 19 rótulos do gerente geral é cortado ou quebra em 1280 ou 1366. "Empreendimentos" é o maior, com 114px. Com 208 ou 224px, a área útil perde 28 ou 44px |
| 5 | Números | **Decisão de DS** | A Bricolage tabular funciona: "111111" e "000000" medem 73,45px. O problema é outro: no card, a data em Bricolage aparece no meio de uma frase em Inter, e as tabelas usam Bricolage 14px peso 400 |
| 6 | Botões e controles | **Ajuste visual** | `.btn` está consistente (36px no computador, 44–48 no celular). O que fica abaixo de 44px no celular está **fora** do `.btn`: "Como foi" (37px), links da faixa (32), números do painel (9 × 20), "Editar" (19), Recebendo e 3º (36px, a 4px um do outro). O rodapé fixo não cobre o último campo |
| 7 | Aviso sem conexão | **Ajuste de texto e posição + frente própria** | No celular, o aviso cobre o campo em foco logo abaixo do cabeçalho (medido). O texto "Sem conexão" não diz o efeito. Sem internet, o toque em WhatsApp se perde sem aviso. Registrar interação não confirma o sucesso |
| 8 | Rótulo do Linktree | **Sugestão de texto** | O destino tem tabelão de vendas, guia de imóveis, regiões, horários de visita, regras do MCMV, documentos e campanhas. Sugestão: **Materiais e links ↗** |

## 3. As 3 tarefas observadas

Mesmos dados fictícios, em 375 × 812 e 1366 × 768, nos dois temas: 3 tarefas × 2 aparelhos × 2 temas. As capturas `t1-*`, `t2-*` e `t3-*` estão em `docs/revisao-visual/conforto/tarefas/`.

### Tarefa 1 · Achar o atendimento prioritário (corretor, Lista do dia)

| Passo | Celular (375) | Notebook (1366) |
| --- | --- | --- |
| Abrir | Cabeçalho, título, linha do stand, data e a faixa, que começa em y=207 e mede 264px. O primeiro card (Bruno, "! Prazo estourado há 1 dia") começa em y=526 e aparece inteiro, com os botões, acima do rodapé "+ Novo lead" | A faixa mede 194px, e o primeiro card aparece inteiro. Os grupos ficam em duas colunas |
| Decidir quem é o primeiro | O olho encontra **6 vermelhos** no card do Bruno: a barra, "! Prazo estourado", "! QUENTE" (texto e contorno) e o botão WhatsApp. O Sofia, logo abaixo, tem 3 (o selo Quente). O Ana, no grupo seguinte, tem 7 | Na primeira tela há 8 pontos vermelhos, entre eles 2 barras de card (Bruno e Ana) e a barra da faixa |
| Tocar no contador da faixa | Leva ao título do grupo, logo abaixo do cabeçalho (`scroll-mt-24`). O link tem 32px de altura, abaixo dos 44 | Igual, com clique |
| Tema escuro | Mesmas posições. A faixa (`band` #0d0e11) quase some no fundo (#151619, 1,07:1): só a barra vermelha marca o bloco | Igual |

**Dificuldades:**
- Tudo o que pede atenção é vermelho e em negrito. Sem ler, não dá para saber o mais urgente.
- "Responder em 9 min" (prazo correndo) aparece em `ink` negrito, e o doc diz âmbar (`docs/leads.md`, seção 4). Veja a [seção 7](#7-achados-fora-dos-8-itens).

### Tarefa 2 · Registrar o resultado de um contato (corretor, ficha)

| Passo | Celular (375) | Notebook (1366) |
| --- | --- | --- |
| Detalhar | Abre a ficha em "Registrar interação" (`#registrar`), logo abaixo do cabeçalho. Mostra "→ Você abriu o WhatsApp hoje, 09:00. Conte como foi" e o WhatsApp já marcado | Igual. O formulário fica na coluna da ficha |
| Como foi | 6 botões em 3 colunas, com **37px** de altura (fora do mínimo de 44). "Sem resposta" quebra em 2 linhas | 6 em uma linha, com 37px |
| Texto e próximo contato | Textarea de 88px, atalhos Hoje, Amanhã, Em 3 dias e Em 1 semana (2 linhas), e dia e hora nativos. Todos cabem acima do botão Registrar, sem rodapé fixo nesta tela | Igual |
| Tema escuro | O botão marcado de "Como foi" se inverte (fundo claro, texto escuro) e continua claro. O Registrar fica em `brand` escuro (#ff6b70) com texto `on-brand` | Igual |
| Registrar | **Na prévia, a gravação é bloqueada** e aparece "! Prévia visual: gravação desativada." acima do botão. O erro fica perto da ação, e o texto continua no campo e no rascunho do aparelho, como `rascunho.ts` promete. O sucesso real **não** foi visto na prévia. Pelo código, o formulário só se limpa e o histórico recarrega, **sem "✓" de confirmação** | Igual |

**Dificuldades:**
- Os botões de "Como foi" ficam abaixo do alvo de toque.
- Não há retorno explícito de sucesso: a pessoa vê o formulário esvaziar.
- Sem conexão, o aviso flutuante cobre o campo em foco no celular (item 7).

### Tarefa 3 · Achar uma informação de gestão (gerente, Painel)

Pergunta usada: quantos leads a Marina cadastrou na semana?

| Passo | Celular (375) | Notebook (1366) |
| --- | --- | --- |
| Abrir o Painel | Período (Dia, Semana, Mês), Imprimir, Anterior e Seguinte, e a faixa "Leads do período" (3 números de 32px). A tabela "Leads no período, por corretor" começa em y=602 | A faixa e a primeira tabela aparecem sem rolar, com a tabela inteira em 1129px |
| Achar o número | A tabela mede **532px** numa área de 335px. "Cadastrados pelo corretor" fica cortado e pede rolagem lateral. Todas as 6 tabelas passam da largura (479 a 812px) | A linha Marina Exemplo, coluna "Cadastrados pelo corretor": 6. Leitura direta |
| Abrir a lista do número | O número é um botão de **9 × 20px**: difícil de acertar com o polegar | O mesmo botão é fácil com o mouse |
| Tema escuro | Mesma rolagem lateral. A faixa "Leads do período" quase some no fundo, como na Lista do dia, e o "Semana" marcado se inverte | Igual |

**Dificuldades:**
- No celular, a tabela pede rolagem lateral e os números são alvos minúsculos.
- No notebook, a tarefa é direta.
- Mudar a tabela no celular (cards por corretor, por exemplo) é mudança de apresentação de fluxo aprovado e vira **frente própria**.

## 4. Evidência por item

### 1. Legibilidade e peso

Medido nos cards da Lista do dia a 375px (`tarefas/medidas.json`, chave `tipografia`):

| Elemento | Hoje | Faixa pedida |
| --- | --- | --- |
| Nome do cliente | Bricolage 17px / 700 | ok |
| Próximo contato no prazo ("Hoje, 23:00") | Bricolage **13px** / 400 (lido no código: `ProximoContato` dentro de `text-[13px]`; nenhum card medido estava nesse estado) | trabalho: 14–16 |
| Próximo contato atrasado | Bricolage 15px / **700**, vermelho | ok no tamanho |
| "! Sem contato há 3 dias · 2 tentativas" | Bricolage **13px** / 600 | trabalho: 14–16 |
| Prazo e toque ("! Abriu o WhatsApp…") | Bricolage 13–15px / 600–700 | trabalho: 14–16 |
| Última interação | Inter 13px / 400 (a data em Bricolage dentro da frase) | apoio: ok |
| Etapa ("Em contato") | Inter 12px / 400 | apoio: ok, no limite |
| Selo de temperatura | Inter 12px / 600, caixa alta | apoio: ok |
| Botões | Inter 13px / 600 | ok |

- **Peso:** dos textos de cada card, 7 de 9 (Bruno, Sofia), 7 de 10 (Rita) e 10 de 13 (Ana) têm peso ≥ 600.
- **Proposta:**
  - linhas de trabalho (próximo contato, prazo, sem contato, toque) em 14px;
  - negrito só no nome e na **uma** linha mais urgente do card; as outras em 400, com o sinal e a cor dizendo o estado;
  - apoio fica em 13 e 12px.

  Não muda o conteúdo do card. O card cresce cerca de 4px por linha.

### 2. Hierarquia do vermelho

- **Por card** (chave `vermelho`):
  - Bruno: 6 usos (barra, prazo, selo Quente com texto, sinal e contorno, botão).
  - Ana: 7 usos (barra, atrasado, sem contato, selo, Detalhar).
  - Rita: 6 usos.
  - Sofia (prazo correndo, sem barra vermelha): 3 usos, todos do selo Quente.
- **Por tela** (`extra/`, chave `telaVermelho`):
  - celular: 7 pontos vermelhos;
  - notebook: 8, com a barra da faixa, **duas** barras de card (o primeiro de cada grupo vem com `destaque`), "Opções" do stand, prazo, selo e botão.
- **De onde vem:**
  - `destaque={i === 0}` em cada grupo (`lista-do-dia.tsx`) dá barra vermelha e botão vermelho ao primeiro card de **todos** os grupos. A regra do DS pede "uma barra vermelha por área de tela".
  - Quente usa `text-brand` (`TEMPERATURAS` em `leads.ts`), a mesma cor de "Atrasado" e "Prazo estourado". Temperatura é uma característica do cliente, e atraso é uma urgência de trabalho: a mesma cor confunde as duas.
- **Proposta (recomendada):**
  - **Quente** passa a selo neutro, com contorno `ink`, "! Quente" e o mesmo sinal e palavra;
  - o vermelho fica para a urgência real (prazo estourado, atrasado, 3+ dias sem contato) e para a ação principal;
  - a barra vermelha fica só no **primeiro card da tela**, o que a faixa aponta; os outros primeiros de grupo ficam com barra `ink` e botão secundário;
  - "Opções" do stand passa para link neutro sublinhado.

  Resultado medido na variante injetada na prévia (`variantes/`): o card do Bruno cai de 6 para 4 usos (o "!" do prazo conta à parte) e o da Ana de 7 para 3. A primeira tela cai de 7 para 5 no celular e de 8 para 5 no notebook: a barra da faixa, a barra do primeiro card, o prazo estourado (texto e sinal) e o botão.
- **Por que é decisão de DS:** a temperatura com cor é regra de "sinal + palavra + cor". A proposta mantém sinal e palavra e troca só a cor do Quente.

### 3. Faixa escura de atenção

- A 375 × 812:
  - cabeçalho fixo até y=61, rodapé "+ Novo lead" a partir de y=739, o que deixa 678px úteis;
  - a faixa mede 264px (39%), com 3 grupos e a linha de visitas;
  - o primeiro card (y=526–709) aparece **99%**, com os dois botões à vista.
- A 1366 × 768: a faixa mede 194px, e o primeiro card aparece inteiro.
- Os contadores levam ao grupo certo: o toque em "Aguardando primeiro contato" põe o título do grupo logo abaixo do cabeçalho.
- **Ajustes:**
  - links da faixa com 44px de alvo no celular (hoje 32px). Medido na variante: a faixa passa de 264 para 310px, o primeiro card desce para y=572–755 e aparece 91%, com os dois botões à vista acima do rodapé;
  - **tema escuro:** `band` sobre `paper` dá 1,07:1, e só a barra vermelha separa a faixa do fundo. Proposta: borda de 1px em `line` (#42444c) no escuro, como já foi feito na lateral. Não muda o claro.

### 4. Largura da lateral

- `?qa=geral` dá todos os 19 destinos.
- Rótulos a 180px: nenhum cortado (`scrollWidth = clientWidth`) e nenhum quebrado, em 1280 e 1366. "Empreendimentos" é o maior (114px), seguido de "Configurações" (93) e "Faixas de VGV" (90).
- A lista rola a 768px de altura, com o controle de recolher sempre à vista (`i4-geral-1366-rolada`).
- Área útil da página do gerente geral (sem a barra de rolagem, que estava oculta no headless):

| Lateral | 1280 | 1366 |
| --- | ---: | ---: |
| 180px (hoje) | 1045px | 1131px |
| 208px | 1017px | 1103px |
| 224px | 1001px | 1087px |

- **Veredito:** ficar em 180px. Alargar só tira espaço dos cards e das tabelas, sem ganho de leitura. Os rótulos continuam visíveis por padrão, com a opção de recolher.

### 5. Números

- **Algarismos tabulares:** a 20px, peso 600 (chave `numeros`):

| Fonte | 111111 | 000000 | 11/11/2026 | 08/09/2026 |
| --- | ---: | ---: | ---: | ---: |
| Bricolage tabular | 73,45 | 73,45 | 112,13 | 112,13 |
| Bricolage sem tabular | 39,48 | 78,86 | 89,92 | 114,66 |
| Inter tabular | 77,64 | 77,64 | 118,67 | 118,67 |

  As duas alinham colunas com `tabular-nums`. A regra atual funciona tecnicamente.
- **Onde incomoda:**
  - **dentro da frase:** "03/11/2026, 10:00 · Quer conhecer…" mistura Bricolage (data) e Inter (texto) na mesma linha de 13px;
  - **nas tabelas do painel:** os números em Bricolage 14px, peso 400, ficam mais estreitos e de desenho mais solto que o texto Inter ao lado;
  - **nos campos:** já são Inter (`.input` herda `font-sans`). Hoje a mesma data aparece em Inter no campo e em Bricolage no card.
- **Proposta (recomendada):**
  - Inter tabular em número de leitura contínua (datas e horas em frase e em card, células de tabela, campos);
  - Bricolage nos títulos e nos números de síntese (contadores da faixa, 32px; indicadores do painel; hora grande da visita, 24px; meta de VGV).

  É a regra do DS que muda (`.num`), por isso vai como decisão. A comparação está no mockup.

### 6. Botões e controles

- **`.btn`:**
  - altura de 36px no computador e 44 ou 48px (`btn-lg`) no celular, com raio de 2px em todos;
  - padding de 9 × 16, com foco de 2px `brand` afastado 2px;
  - desabilitado com opacidade 0,45.

  Está consistente.
- **Abaixo de 44px no celular** (chave `alvos`, só fora da lateral):

| Controle | Medida | Onde |
| --- | --- | --- |
| "Como foi" (6 botões) | 94 × 37 | ficha, Registrar interação |
| Atalhos do próximo contato com 1 linha ("Hoje", "Amanhã") | 37 de altura quando nenhum quebra | ficha e Novo lead |
| Links da faixa | 298 × 32 | Lista do dia |
| Números da tabela do painel | 9 × 20 | Painel |
| Nome do corretor na tabela | 58 × 41 | Painel |
| "Editar" | 51 × 19 | ficha |
| Link do empreendimento | 144 × 16 | ficha |
| "✓ Recebendo" e "3º" | 96 × 36 e 25 × 36, a **4px** um do outro | cabeçalho (distribuição) |

- **Rodapé fixo:** em Novo lead, com "+ Mais detalhes" aberto e rolado até o fim, o último campo (dia e hora) termina acima do rodapé "Cadastrar" (`extra/x-novo-lead-detalhes-375.png`). A Lista do dia tem `pb-20` para o "+ Novo lead". Sem problema.
- **Proposta:**
  - uma classe de "opção" para os botões de escolha (Como foi, atalhos de data, temperatura, origem), com 44px mínimos abaixo de 768px, como o `.btn`;
  - links da faixa com 44px;
  - números do painel com área de toque de 44px (padding, sem mudar o tamanho do número);
  - "Editar" com área de 44px;
  - 8px entre "Recebendo" e "3º".

### 7. Aviso sem conexão e retorno de gravação

- **Posição** (chave `offline`):
  - **Notebook:** o aviso (118 × 37px, x=1209–1327, y=76–113) não cobre nenhum controle na Lista nem na ficha. O "+ Novo lead" fica em y≈175.
  - **Celular:** o aviso ocupa a largura toda (12–363px, y=68–105). Na ficha, com "O que aconteceu" em foco logo abaixo do cabeçalho, **cobre o campo focado** (`focoCoberto: true`, `i7-ficha-375-offline-foco.png`). Em Novo lead, com o primeiro campo focado no topo, não cobre.
- **O que acontece de verdade sem internet** (lido no código, não na prévia):

| Operação | O que fica salvo | Rascunho no aparelho | O que se perde |
| --- | --- | --- | --- |
| Toque em "Abrir no WhatsApp" (card e ficha) | Nada: `registrarToque` engole o erro | Não | O toque, que tira o lead de "novo", encerra o prazo de 15 min e põe o lead em "Detalhe o contato". O WhatsApp abre normalmente, e ninguém fica sabendo que o toque não foi gravado |
| Registrar interação | Nada até tentar de novo. Aparece "Sem conexão com o servidor. Tente de novo." | Sim (`sessionStorage`, até salvar ou sair) | Nada, se a pessoa tentar de novo. O id gerado no aparelho evita duplicar |
| Novo lead | Igual | Sim | Nada, se tentar de novo |
| Perfil do cliente, venda, parceiro | Igual | Sim | Nada, se tentar de novo |
| Etapa, temperatura, descarte, visita (agendar, baixa), atribuição | Nada. Aparece o erro | **Não** (são toques ou formulários sem rascunho) | O toque precisa ser refeito. Se o app fechar, o que foi digitado em visita se perde |

- **Texto:** hoje o aviso diz só "! Sem conexão", e todo erro de rede vira "Sem conexão com o servidor. Tente de novo." (`mensagemErro`). A proposta separa os casos da tabela acima, com um texto para cada um:

| Onde | Hoje | Proposta |
| --- | --- | --- |
| Aviso flutuante | ! Sem conexão | ! Sem conexão. O que você registrar agora só vai quando a internet voltar. |
| Erro ao salvar um formulário com rascunho (interação, novo lead, perfil, venda, parceiro) | Sem conexão com o servidor. Tente de novo. | ! Não foi salvo: sem conexão. O texto ficou guardado neste aparelho. Toque em Registrar quando a internet voltar. (o verbo segue o botão de cada tela) |
| Erro num toque sem rascunho (etapa, temperatura, descarte, visita, atribuição) | Sem conexão com o servidor. Tente de novo. | ! Não foi salvo: sem conexão. Faça de novo quando a internet voltar. |
| Dado já salvo | sem mudança | sem mudança: o que já foi gravado continua no Base360 |

  No aviso, o texto cabe em 2 linhas de 13px a 375px (conferido no mockup).
- **Posição no celular:**
  - **proposta (recomendada):** quando o aviso está na tela, `scroll-padding-top` do documento soma a altura dele. O navegador então rola o campo focado para baixo do aviso, sem deslocar o conteúdo nem mudar a decisão "não desloca";
  - **alternativa:** o aviso no pé da tela, acima do rodapé fixo.
- **Retorno de sucesso:** Registrar interação não mostra confirmação, porque o formulário só se limpa. **Proposta:** "✓ Interação registrada" por alguns segundos, no lugar do erro (o mesmo `aviso-ok` de "✓ Lead atribuído"). Acrescenta um texto de estado e não muda ações nem ordem.
- **Frente própria:** o toque perdido sem internet e a fila de reenvio (P2 de `docs/teste-carga.md`). O aviso pode dizer a verdade, mas não conserta o toque perdido.

### 8. Rótulo do Linktree

- O destino (`linktr.ee/construtoraMBigucci`, lido em 06/11/2026) se chama "Imóveis MBIGUCCI". Os botões são:
  - ELLEVA MBIGUCCI;
  - TABELÃO DE VENDAS;
  - Guia de Imóveis;
  - seis regiões;
  - Horários de Visita;
  - Regras Minha Casa Minha Vida;
  - Imóveis Para Locação;
  - terrenos e lotes;
  - Vagas Extras;
  - Documentos;
  - Conheça a MBigucci;
  - Campanhas de Marketing.
- É material de trabalho do corretor, não um "Linktree" para ele.
- **Sugestões, para o Felipe validar:**
  1. **Materiais e links ↗** (recomendada: diz o que tem e cabe no cabeçalho, estimado em cerca de 115px a 13px, sem medir);
  2. Links úteis ↗;
  3. Materiais de venda ↗.

## 5. Decisões do Felipe (uma por vez, a recomendada primeiro)

As que **mudam o DS** vêm marcadas. Cada uma tem antes e depois no mockup.

1. **[DS] Cor do Quente.**
   - (A, recomendada) Selo neutro com "! Quente": o vermelho fica para urgência e ação.
   - (B) Manter o vermelho.
2. **[DS] Uma barra vermelha por tela na Lista do dia.**
   - (A, recomendada) Só o primeiro card da tela tem barra e botão vermelhos.
   - (B) Manter um por grupo.
3. **[DS] Fonte dos números.**
   - (A, recomendada) Inter tabular na leitura contínua (cards, tabelas, campos) e Bricolage nos títulos e indicadores.
   - (B) Manter Bricolage em todo número.
4. **[DS] Tamanho e peso no card.**
   - (A, recomendada) Linhas de trabalho em 14px, negrito só no nome e na linha mais urgente.
   - (B) Manter.
5. **[DS] Alvo mínimo de 44px no celular para todo controle de escolha** (não só `.btn`).
   - (A, recomendada) Sim, com uma classe de opção.
   - (B) Só nos botões.
6. **Faixa no tema escuro.**
   - (A, recomendada) Borda de 1px `line`.
   - (B) Manter.
7. **Aviso sem conexão.**
   - (A, recomendada) Os textos por caso do item 7 (aviso, erro com rascunho, erro sem rascunho) e o campo focado rolando para baixo do aviso no celular.
   - (B) Só os textos.
8. **Confirmação ao registrar interação.**
   - (A, recomendada) "✓ Interação registrada".
   - (B) Manter só o formulário limpo.
9. **Rótulo do Linktree:**
   - (A, recomendada) "Materiais e links ↗";
   - (B) "Links úteis ↗";
   - (C) manter "Linktree ↗".
10. **Lateral.**
    - (A, recomendada) Manter 180px.
    - (B) 208px.

## 6. O que vira frente própria

- **Toque em WhatsApp sem internet** (item 7): hoje se perde em silêncio. Precisa de retentativa ou de fila (P2 de `docs/teste-carga.md`), mexe na gravação e no prazo de 15 min.
- **Painel no celular** (tarefa 3): as 6 tabelas passam de 335px (479 a 812px). Outra apresentação no celular, como um card por corretor, muda a tela aprovada.

## 7. Achados fora dos 8 itens

- **"Responder em 9 min" em `ink`:** `docs/leads.md` (seção 4) diz âmbar para o prazo correndo. O código (`SeloDoPrazo`) só usa âmbar para a mensagem nova (`ambar`) e deixa o prazo correndo em `ink` negrito. Ou o doc ou o código está desatualizado: a master confere.
- **Cabeçalho com "✓ Recebendo" e "3º na fila"** também para o gerente na prévia: é efeito do mock (`comoGestor` só olha `?qa=` e `/distribuicao/`), não do app.
- **Logo:** as capturas usam o texto "MBigucci" no lugar do PNG, que não está no Git.

## 8. O que a prévia não mostra

- **Gravação:** o adaptador da prévia bloqueia toda escrita. A tarefa 2 chega até o erro "Prévia visual: gravação desativada", não ao sucesso. O desfecho real do Registrar e a tabela do item 7 vêm **do código**.
- **Sem internet de verdade:** o modo offline do navegador mostra o aviso e mede a posição, mas o banco da prévia é em memória.
- **Barra de rolagem:** o Chrome de teste estava sem a barra clássica do Windows. Com ela, a área útil perde 15px (`docs/design-system.md`).
- **Só o Felipe confere:** o conforto na tela real, no celular dele, ao longo de um dia de uso.
