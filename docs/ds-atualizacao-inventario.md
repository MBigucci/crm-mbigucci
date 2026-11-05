# Inventário: atualização do MBigucci Design System (Etapa 1)

Brief: [`codex-ds-mbigucci-atualizacao.md`](codex-ds-mbigucci-atualizacao.md). Levantado em 05/11/2026, versão `1793899471-3b33` do artifact `https://claude.ai/artifact/QesJh8EPBkLqV5jjbpNFEi`. Nada foi publicado nem criado em `marca/tokens/`.

## Sumário

1. [O que o artifact tem hoje](#1-o-que-o-artifact-tem-hoje)
2. [Divergências entre o artifact e o código](#2-divergências-entre-o-artifact-e-o-código)
3. [Tokens: o que muda e o que entra](#3-tokens-o-que-muda-e-o-que-entra)
4. [Componentes, seções e assets: o que muda e o que entra](#4-componentes-seções-e-assets-o-que-muda-e-o-que-entra)
5. [O tema escuro e os componentes que já existem](#5-o-tema-escuro-e-os-componentes-que-já-existem)
6. [Mapeamento MBigucci → shadcn do Base360](#6-mapeamento-mbigucci--shadcn-do-base360)
7. [Decisões do Felipe](#7-decisões-do-felipe)
8. [Pendências e restrições da etapa 3](#8-pendências-e-restrições-da-etapa-3)

Fontes conferidas: `crm/src/app/globals.css`, `crm/tailwind.config.ts`, `crm/src/components/icones-menu.tsx`, `crm/scripts/contraste-temas.mjs`, `docs/design-system.md`, `docs/estudo-design.md`, `C:\Projects\base360-repo\src\styles.css` e `components.json` (só leitura).

## 1. O que o artifact tem hoje

O DS descreve **o Simulador de valor presente** (`meta.project`, sincronizado em 06/10/2026). Ele não sabe do CRM.

| Parte | Hoje |
| --- | --- |
| Índice `design-system.json` | `title` e `namespace` "MBigucci", um grupo de assets (Logos, `mbigucci-logo.png`), `docs.sections` vazio. `lastChange.by` = "Felipe" (o brief pede "Felipe Jorge"). |
| `README.md` (livro da marca) | Voz e texto, Cor, Tipografia, Forma e espaço, Estados e movimento, Acessibilidade, Iconografia ("não há biblioteca de ícones"), Dentro do site (WordPress), Impressão, Componentes, Acréscimos intencionais. |
| Temas | Um só: `light`, nome "Site". Sem tema escuro. |
| Cores (31) | `brand`, `brand-dark`, `ink`, `ink-soft`, `concrete`, `paper`, `line`, `line-dark`, `ok`, `wa`, `no`, `surface`, `surface-disabled`, `tint-brand`, `neutral-mark`, `on-dark`, `on-dark-soft`, `on-dark-muted`, `on-dark-warn`, `line-on-dark`, `line-on-dark-strong`, `warn-hover`, `header-glass`, `backdrop` e sete `print-*`. |
| Tipografia | Bricolage Grotesque (400–800) e Inter (400–700) em `fonts/`. 12 estilos de "Títulos e números" e 8 de "Texto". |
| Outras famílias | Espaços `space-4` a `space-26` (11); raios `radius-sm` 2px, `-md` 3px, `-lg` 4px, `-round` 50%; bordas `hairline` 1px, `bar` 4px, `bar-aviso` 3px, `rule` 2px, `focus` 2px; tamanhos `content-max` 1180px, `header-height` 58px, `logo-height` 24px, `mark` 30px, `dialog-width` 420px; opacidades 0,45 e 0,4. |
| Componentes (HTML + `bundle.css`, sem bundle React) | Acordeao, Botao, Cabecalho, Campo, Card, Cascata, Cover (só preview), Dialogo, LinhaParcela, Link, Totais, Veredito. |
| Assets | Logos: `mbigucci-logo.png` (271 × 88, fundo transparente, segundo o README do grupo). |

## 2. Divergências entre o artifact e o código

Regra do brief: **`crm/src/app/globals.css` vence**. Onde o valor do artifact é só do Simulador e o CRM não tem o token, o do artifact fica.

| Item | Artifact hoje | Código do CRM | Prevalece | Observação |
| --- | --- | --- | --- | --- |
| `concrete` claro | `#8b877f` (3,58:1 em surface, 3,31:1 em paper) | `#6f6b63` (`globals.css:12`; 5,30 / 4,90:1) | **CRM** | O README do artifact diz que `concrete` "fica abaixo de 4,5:1". O texto muda: passa a servir para texto auxiliar legível. |
| `wa` claro | `#b26a00` (4,24:1) | `#925600` (`globals.css:18`; 5,91 / 5,47:1) | **CRM** | Os 4,24:1 citados no README, no Veredito e no Acordeao deixam de ser verdade. Corrigir o número, sem apagar a regra. |
| Borda de campo e de botão secundário | `line` (1,28:1, anotado como abaixo do mínimo) | `control` `#76736c` / `#878995` em campos; `secondary-edge` no secundário | **CRM** | `line` continua só decorativa. |
| Botão secundário | fundo `surface`, borda `line`, hover borda `ink` | fundo `secondary` `#efeeea` / `#303138`, borda `secondary-edge` `#817d74` / `#878995`, hover borda `ink` (`globals.css:180`) | **CRM** | Aprovado em 05/11. |
| Altura do botão | não diz; abaixo de 560px os botões do grupo ocupam a linha toda | 36px no computador; abaixo de 768px, mínimo de 44px (`globals.css:193`) | **CRM**, somando | As duas regras convivem: largura total abaixo de 560px e 44px abaixo de 768px. |
| Texto sobre `brand` | `surface` | `on-brand` `#ffffff` / `#151619` | **CRM** | No escuro, `surface` seria cinza-escuro sobre `#ff6b70`. |
| Fundo da faixa escura (Veredito) | `ink` | `band` `#0d0e11` nos dois temas | **CRM** | `ink` fica claro no tema escuro. |
| Cabeçalho | `header-glass` = paper a **90%**, `sticky`, **58px** | paper a **85%**, desfoque 12px, borda `line`, `position: fixed` com espaçador, **61px** no celular e **64px** no computador (`globals.css:260`; `cabecalho.tsx:300`) | **CRM** para o cabeçalho dos sistemas | O do Simulador continua como está (decisão 3). |
| Véu do diálogo | `backdrop` = ink a **55%** | `overlay` `#0d0e11` a **50%** (`bg-overlay/50`, um uso) | a decidir (decisão 4) | |
| Campo | padding 8 × 10px, 13,5px, borda `line`, rótulo 11px `concrete` | padding 12px, **16px** (evita o zoom do iOS), borda `control`, rótulo 12px `ink-soft` (`globals.css:205-213`) | **CRM**, mas fora do escopo do brief | Decisão 6. |
| `titulo-pagina` | `clamp(21px, 2,6vw, 27px)` | `clamp(21px, 2.6vw + 12px, 27px)` | **CRM** | Teto e piso iguais; muda só a fórmula. |
| Iconografia | "Não há biblioteca de ícones" | exceção aprovada em 05/11: ícone + rótulo na navegação (Lucide, ISC) | **CRM** | O resto continua sem ícones. |
| `meta` do `tokens.json` | fonte única: Simulador | fonte passa a incluir o CRM | **CRM** | Acrescentar `crm/src/app/globals.css` em `meta.paths.tokens`. |

**Dentro do próprio repositório:** `docs/design-system.md:63` ainda diz que o cabeçalho usa "`surface` sólido com borda `line`". A seção de 05/11 e o código dizem paper a 85% com desfoque. O código vence; a linha 63 precisa ser corrigida pela sessão master (este brief só permite tocar no `design-system.md` para apontar o pacote).

**Logo:** o README do grupo Logos descreve o PNG com "fundo transparente" e contorno escuro fino. O `design-system.md` diz que o PNG do CRM "já traz a própria moldura branca". Podem ser arquivos diferentes. Não muda nada agora, porque o logo fica para a frente do Base360, mas a regra "logo só sobre `paper` ou `surface`" precisa ser revista para o tema escuro.

## 3. Tokens: o que muda e o que entra

O formato do tipo aceita a cor por tema (`{"light": …, "dark": …}`). **Token sem valor `dark` herda o claro.** Por isso cada token abaixo tem a coluna do escuro decidida.

### Cores que já existem

| Token | Claro | Escuro | Como fica |
| --- | --- | --- | --- |
| `paper` | `#f7f6f2` | `#151619` | ganha o escuro |
| `surface` | `#ffffff` | `#202126` | ganha o escuro |
| `ink` | `#0d0e11` | `#f5f3ed` | ganha o escuro; o uso "fundo da faixa" passa para `band` |
| `ink-soft` | `#4a4b52` | `#c4c1ba` | ganha o escuro |
| `concrete` | **`#6f6b63`** (era `#8b877f`) | `#aaa69e` | muda o claro e o texto de uso |
| `line` | `#e5e3dd` | `#42444c` | ganha o escuro; uso passa a "só decorativa" |
| `brand` | `#e11119` | `#ff6b70` | ganha o escuro; texto sobre ele vira `on-brand` |
| `brand-dark` | `#b90d14` | `#ff9296` | ganha o escuro |
| `ok` | `#1f7a45` | `#68ce92` | ganha o escuro |
| `wa` | **`#925600`** (era `#b26a00`) | `#f0b65b` | muda o claro e as razões citadas |
| `no` | `#e11119` | `#ff6b70` | precisa do escuro explícito (ou alias `{brand}`), senão herda o vermelho claro |
| `tint-brand` | `#fff6f6` | `#332024` | ganha o escuro |
| `surface-disabled` | `#eeede9` | `#303138` | ganha o escuro |
| `neutral-mark` | `#5a5b60` | `#b7b8c0` | ganha o escuro |
| `on-dark`, `on-dark-soft`, `on-dark-muted` | `#ffffff`, `#d9d6cf`, `#b7b3ac` | iguais | ficam; vivem sobre `band`, que não muda |
| `on-dark-warn`, `line-dark`, `line-on-dark`, `line-on-dark-strong`, `warn-hover` | valores atuais | iguais (herdam) | ficam; também vivem sobre a faixa |
| `header-glass` | `rgba(247,246,242,0.85)` (era 0,9) | `rgba(21,22,25,0.85)` | muda o claro e ganha o escuro: paper a 85% em cada tema |
| `backdrop` | decisão 4 | igual | `overlay` não muda entre os temas |
| `print-*` (7) | valores atuais | herdam | ficam; nota de uso "só no papel, sempre claro" (o CRM força a paleta clara no `@media print`) |

### Cores que entram

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `control` | `#76736c` | `#878995` | Borda de campos e seletores (4,73 / 4,62:1 em surface) |
| `secondary` | `#efeeea` | `#303138` | Fundo do botão secundário |
| `secondary-edge` | `#817d74` | `#878995` | Contorno do botão secundário, só dele |
| `on-brand` | `#ffffff` | `#151619` | Texto do botão principal |
| `band` | `#0d0e11` | `#0d0e11` | Fundo das faixas de síntese (Veredito) e da dica da lateral |
| `overlay` | `#0d0e11` | `#0d0e11` | Fundo de diálogo, com 50% de opacidade |
| `nav` | `#16181c` | `#16181c` | Grafite da lateral e do menu do celular (o do menu do site) |
| `nav-ativo` | `#2b2d32` | `#2b2d32` | Fundo do item atual |
| `nav-linha` | `#33363c` | `#33363c` | Divisórias da navegação |
| `nav-marca` | `#ff6b70` | `#ff6b70` | Barra de 3px do item atual e foco na navegação |
| `nav-hover` | `rgba(255,255,255,0.07)` | igual | Fundo do item ao passar o mouse (`globals.css:324`) |
| `aviso-vidro` | `rgba(255,255,255,0.85)` | `rgba(32,33,38,0.85)` | Fundo do aviso Sem conexão: surface a 85% |

O nome dos dois últimos é proposta; o resto é o nome do código.

### Outras famílias

| Família | Entra |
| --- | --- |
| Tipografia | `titulo-secao` (Bricolage, 18px, 700, altura 1,25); `item-menu` (Inter, 13px, 600, altura 1,2: itens da lateral, atalhos e conta); `rotulo-campo` (12px, 600, caixa alta, 0,1em, `ink-soft`), se a decisão 6 incluir o Campo. |
| Tamanhos | `header-height` passa a 64px no computador, com `header-height-celular` 61px (o Simulador fica anotado com 58px); `sidebar-width` 180px, `sidebar-width-collapsed` 64px; `touch-target` 44px; `button-height` 36px; `nav-icon` 17px; `nav-item-min` 40px. |
| Bordas | `bar-nav` 3px (item atual). Pode ser o mesmo valor de `bar-aviso`, mas com uso próprio. |
| Opacidades | `glass` 0,85; `overlay-opacity` 0,5. |
| Novas famílias | `blur` (`glass-blur` 12px) como família extra, se o tipo aceitar `12px` como valor simples (aceita: valor CSS sem função). |

Todos os pares novos já passam no `contraste-temas.mjs` (106 pares, incluindo navegação e secundário). A conferência renderizada é da etapa 4.

## 4. Componentes, seções e assets: o que muda e o que entra

| Item | Hoje | Etapa 3 |
| --- | --- | --- |
| **Botao** | principal, secundário (`surface` + `line`), pequeno, `addrow` | Atualiza: secundário `secondary` + `secondary-edge`, texto do principal `on-brand`, 36px / 44px, raio 2px. Mantém o texto do README e as regras do Simulador. |
| **Cabecalho** | o do Simulador (58px, 90%, `sticky`) | Decisão 3. Recomendado: fica como está, e entra **CabecalhoSistema**. |
| **CabecalhoSistema** (novo) | — | Logo + nome do módulo, divisor `line`, três atalhos externos com ↗, menu da conta "Apelido ▾" em `surface` opaco; paper a 85%, desfoque 12px, `fixed` com espaçador 61/64px. |
| **NavegacaoLateral** (novo) | — | `nav` grafite, 180/64px, controle sanduíche no topo, ícone + rótulo, item atual `nav-ativo` com barra `nav-marca`, borda `line` no tema escuro, dica quando recolhida. |
| **MenuCelular** (novo) | — | Botão sanduíche do site (44px, três traços de 2px, o do meio menor, vira ✕), painel escuro de largura total: destinos, divisória, atalhos, conta. |
| **AvisoConexao** (novo) | — | Flutuante, surface a 85% com desfoque, texto opaco, `role="status"`, não desloca o conteúdo. |
| Acordeao, Campo, Card, Cascata, Dialogo, LinhaParcela, Link, Totais, Veredito | só claro | Seção 5 (tema escuro). Textos ficam. |
| **README.md** | livro do Simulador | Acrescenta, sem apagar: temas claro e escuro; a regra de botões; a exceção de ícones na navegação; quando usar cada componente novo e o que não fazer; exemplos de tela do CRM (Vendas) e do Repasse. Corrige os números de `concrete` e `wa`. |
| **`base360.md`** (seção nova) | — | O sistema e os módulos, a casca comum, o espaço do logo ("Base360 · Módulo", a definir) e o mapeamento da seção 6. |
| **Assets: Ícones de navegação** (grupo novo) | — | 25 desenhos de `icones-menu.tsx` (lista, início, leads, quadro, agenda, painel, vendas, metas, empreendimentos, simulador, faixas, programa, plantão, recepção, parceiros, ranking, usuários, equipes, configurações, conta, sair, site, linktree, sanduíche, outro), README com o aviso da licença ISC do Lucide. |
| Índice `design-system.json` | — | Grupo "Ícones de navegação" em `groups` e `assetGroups`; `lastChange` com `by: "Felipe Jorge"`; enviado uma vez, no fim. |

## 5. O tema escuro e os componentes que já existem

O `bundle.css` atual foi escrito para um fundo sempre claro. Com o tema escuro, a página do DS troca as variáveis e estes previews quebram:

| Regra do `bundle.css` | Hoje | No escuro, sem correção | Correção proposta |
| --- | --- | --- | --- |
| `.stats` (Veredito) | fundo `var(--ink)` | faixa fica `#f5f3ed` com texto branco: ilegível | `var(--band)` |
| `.btn-red` | texto `var(--surface)` | `#202126` sobre `#ff6b70` | `var(--on-brand)` |
| `.btn-ghost` | borda `var(--line)`, fundo da `.btn` | sem o fundo `secondary` | fundo `var(--secondary)`, borda `var(--secondary-edge)` |
| `.mb input, select` | borda `var(--line)` | 1,86:1 no escuro | `var(--control)` |
| `.vmark` | texto `var(--surface)` sobre `ok`, `wa`, `no` | escuro sobre cor clara: passa, mas é por acaso | conferir na etapa 4 |
| `.fill--tinta` (Cascata) | listras `ink` + `surface` | listras invertidas, ainda legíveis | conferir na etapa 4 |
| `dialog::backdrop` | `rgba(13,14,17,.55)` fixo | igual | depende da decisão 4 |
| `.top` (Cabecalho) | `var(--header-glass)` | fica certo se `header-glass` ganhar o escuro | — |

No claro, as três primeiras correções não mudam nada na tela (`band` = `ink` e `on-brand` = `surface` no claro). A quarta muda a borda dos campos do Simulador de `line` para `control`, o que se liga à decisão 1.

## 6. Mapeamento MBigucci → shadcn do Base360

Valores atuais do Base360 em `src/styles.css` (OKLCH), convertidos para sRGB. As conversões batem com as de `docs/estudo-design.md`. O tema do Base360 é ativado pela classe `.dark`; o do CRM, por `data-tema="escuro"`; o do artifact, por `data-theme="dark"`. O gerador vai precisar dos três seletores.

| Variável shadcn | Token MBigucci | Proposto claro / escuro | Base360 hoje claro / escuro | Nota |
| --- | --- | --- | --- | --- |
| `--background` | `paper` | `#f7f6f2` / `#151619` | `#f8fafc` / `#040a11` (oklch 0.985 0.003 240 / 0.14 0.02 250) | |
| `--foreground` | `ink` | `#0d0e11` / `#f5f3ed` | `#07121e` / `#f0f6fc` | |
| `--card`, `--popover` | `surface` | `#ffffff` / `#202126` | `#ffffff` / `#0b1723` | |
| `--card-foreground`, `--popover-foreground` | `ink` | `#0d0e11` / `#f5f3ed` | `#07121e` / `#f0f6fc` | |
| `--primary` | `brand` | `#e11119` / `#ff6b70` | `#a50013` / **`#4393e1`** (0.45 0.19 25 / 0.65 0.14 250) | O escuro do Base360 é **azul**. |
| `--primary-foreground` | `on-brand` | `#ffffff` / `#151619` | `#fcfcfc` / `#040a11` | |
| `--secondary` | `secondary` | `#efeeea` / `#303138` | `#f5e8e5` / `#162330` | |
| `--secondary-foreground` | `ink` | `#0d0e11` / `#f5f3ed` | `#361715` / `#f0f6fc` | |
| `--muted` | `surface-disabled` | `#eeede9` / `#303138` | `#f5eeed` / `#162330` | |
| `--muted-foreground` | `ink-soft` | `#4a4b52` / `#c4c1ba` | `#695958` / `#95a0ab` | `concrete` seria o par exato de "auxiliar", mas o shadcn usa `muted-foreground` em descrições que orientam decisão. |
| `--accent` | `secondary` | `#efeeea` / `#303138` | **`#bb061e`** / `#1f74bf` | No shadcn, `accent` é o fundo de hover de menus e do botão `ghost`. O Base360 usa vermelho; trocar muda o hover deles. |
| `--accent-foreground` | `ink` | `#0d0e11` / `#f5f3ed` | `#ffffff` / `#fcfcfc` | |
| `--destructive` | `no` (= `brand`) | `#e11119` / `#ff6b70` | `#d40924` / `#f94144` | |
| `--destructive-foreground` | `on-brand` | `#ffffff` / `#151619` | `#fcfcfc` / `#fcfcfc` | |
| `--success` | `ok` | `#1f7a45` / `#68ce92` | `#0fa05c` / `#3bb974` | |
| `--warning` | `wa` | `#925600` / `#f0b65b` | `#e89d00` / `#f9ad26` | |
| `--info` | — | sem equivalente | `#0072d5` / `#449df0` | O DS não tem azul. Fica o do Base360 até decidir. |
| `--border` | `line` | `#e5e3dd` / `#42444c` | `#e3dcdb` / branco a 12% | |
| `--input` | `control` | `#76736c` / `#878995` | `#eae3e1` / branco a 15% | O shadcn usa `--input` como borda de campo. Hoje fica abaixo de 3:1. |
| `--ring` | `brand` | `#e11119` / `#ff6b70` | `#bb061e` / `#1f74bf` | |
| `--radius` | `radius-lg` | ver nota | `0.5rem` (8px) | O Base360 deriva `sm` = −4px, `md` = −2px, `lg`, `xl` = +4px. Com `--radius: 4px`: `md` 2px (botão), `lg` 4px, mas `sm` 0 e `xl` 8px (cards do new-york usam `rounded-xl`). O pacote pode redefinir `--radius-sm/md/lg/xl` direto. A combinar com a Roberta. |
| `--sidebar` | `nav` | `#16181c` / `#16181c` | `#1e1311` / `#07121e` | |
| `--sidebar-foreground` | `on-dark-soft` | `#d9d6cf` | `#f5f1f0` / `#f0f6fc` | |
| `--sidebar-primary` | `nav-marca` | `#ff6b70` | `#bb061e` / `#1f74bf` | |
| `--sidebar-primary-foreground` | `nav` | `#16181c` | `#ffffff` | Par a conferir na etapa 4. |
| `--sidebar-accent` | `nav-ativo` | `#2b2d32` | `#311e1d` / `#162330` | |
| `--sidebar-accent-foreground` | `on-dark` | `#ffffff` | `#fcfcfc` / `#f0f6fc` | |
| `--sidebar-border` | `nav-linha` | `#33363c` | `#362321` / branco a 10% | No escuro, o CRM ainda põe uma borda `line` entre a lateral e a página. |
| `--sidebar-ring` | `nav-marca` | `#ff6b70` | `#bb061e` / `#1f74bf` | |

Fora das variáveis: o Base360 usa a fonte do sistema (`-apple-system`, Segoe UI…), não Bricolage e Inter, e o botão do shadcn tem 14px/500, raio 6px e sombra. Isso fica para a etapa de importação, com a Roberta.

## 7. Decisões do Felipe

Cada uma com a recomendada primeiro.

1. **O DS passa a seguir o CRM também para o Simulador?** (`concrete`, `wa`, botão secundário, borda de campo)
   - **(a) Sim:** o DS adota os valores do CRM e o Simulador ganha uma pendência de ajuste. Recomendada: são os valores auditados a 4,5:1, e o brief manda o código vencer.
   - (b) Dois temas claros, "Site" (Simulador) e "Sistemas" (CRM e Base360), mais o escuro.
   - (c) O DS mantém os do Simulador e o CRM fica como exceção.
2. **Componentes antigos no tema escuro** (seção 5):
   - **(a) Corrigir o `bundle.css` na etapa 3** (`ink` → `band`, `surface` → `on-brand`, secundário e campos com os tokens novos). Recomendada.
   - (b) Marcar os previews antigos como "só tema claro".
3. **Cabeçalho:**
   - **(a) Cabecalho do Simulador fica, e entra um componente novo, CabecalhoSistema** (CRM e Base360). Recomendada: preserva o texto que existe.
   - (b) Um só Cabecalho com duas variantes.
4. **Véu do diálogo:**
   - **(a) 50%, como o CRM:** `backdrop` vira `overlay` a 50%. Recomendada.
   - (b) Manter 55% no Simulador e 50% no CRM, em dois tokens.
5. **Nome dos temas** (os ids ficam `light` e `dark`):
   - **(a) "Claro" e "Escuro".** Recomendada.
   - (b) "Site" e "Escuro".
6. **Campo** (fora da lista do brief, mas diverge do CRM):
   - **(a) Registrar como pendência e não mexer nesta rodada.** Recomendada.
   - (b) Incluir já o Campo do CRM: 16px, padding 12px, borda `control`, rótulo 12px `ink-soft`.

Para combinar com a Roberta depois, sem bloquear a etapa 2: `--accent` neutro ou vermelho, o `--primary` azul do tema escuro, o `--radius` e o `--info`.

## 8. Pendências e restrições da etapa 3

- Pastas de componente são identificadores ASCII: `CabecalhoSistema`, `NavegacaoLateral`, `MenuCelular`, `AvisoConexao`.
- Os SVGs do Lucide usam `currentColor`, que não funciona dentro de `<img>`. Os arquivos do grupo levam o traço com cor explícita, e o README do grupo diz qual.
- `tokens.json` vai inteiro, no formato de listas, com `light` primeiro e `dark` depois. Ler de novo cada arquivo logo antes de publicar.
- `docs/design-system.md:63` (cabeçalho "surface sólido") está desatualizado: correção para a sessão master.
- A importação do pacote no CRM e no Base360 é etapa seguinte, com o ok do Felipe e da Roberta.

## 9. Decisões do Felipe e resultado (05/11/2026)

O Felipe decidiu as seis questões da seção 7: (1) a, (2) a, (3) a, (4) a, (5) a e (6) **b**, o Campo do CRM entrou já. Publicado no artifact nas versões 16 e 17 (`1793901229-d48a`):

- `tokens.json` com os temas Claro e Escuro (44 cores, 6 famílias extras, 23 estilos), igual a `marca/tokens/tokens.json`;
- `bundle.css` corrigido para o escuro (`band`, `on-brand`, `secondary`, `control`) e com a casca dos sistemas;
- componentes novos CabecalhoSistema, NavegacaoLateral, MenuCelular e AvisoConexao; Botao e Campo do CRM; README e capa ajustados;
- seção `base360.md` e o grupo de assets "Ícones de navegação" (25 SVGs).

`node marca/tokens/conferir.mjs`: 111 valores, 0 divergências.
