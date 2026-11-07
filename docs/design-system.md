# Design system do Base360 Vendas

> **Desde 06/11/2026 o padrão do `crm/` é o Alicerce MBigucci**, o design system dos sistemas da empresa:
> - endereço: `https://claude.ai/artifact/52QJiDD4fLNu14iE3hce37`, lido pela ação `read` do Artifact;
> - versão adotada: `1794017321-4b94`;
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
| (nenhuma ainda) | | | |

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
| Erro de gravação sem conexão | `erroAoSalvar`: formulário com rascunho diz "Não foi salvo: sem conexão. O texto ficou guardado neste aparelho. Toque em <botão> quando a internet voltar."; toque sem rascunho diz "Não foi salvo: sem conexão. Faça de novo quando a internet voltar." Leitura continua com `mensagemErro` | `crm/src/lib/erros.ts` (Registrar interação, Novo lead, perfil e toques da ficha via `alterarLead`) |
| Confirmação | "✓ Interação registrada" por 6 segundos depois de registrar, num `role="status"` | `RegistrarInteracao` na ficha |
| Mantidos | Lateral em 180px (nenhum dos 19 rótulos corta); "Linktree ↗" (o Felipe não quis trocar) | — |

Fora desta revisão, no roadmap: o toque em WhatsApp sem internet (hoje se perde sem aviso) e o painel no celular (as tabelas pedem rolagem lateral).

