# MBigucci Design System, aplicado aqui

> A fonte da verdade é o artifact https://claude.ai/artifact/QesJh8EPBkLqV5jjbpNFEi. Leia `project/README.md` e `project/tokens.json` pela ação `read` do Artifact. O DS do CRM da Bruna (`ref/CRM Bruna/design/`) é de **outra marca** e não serve aqui.

## Sumário

1. [Onde os tokens já estão em código](#onde-os-tokens-já-estão-em-código)
2. [Regras que mais aparecem](#regras-que-mais-aparecem)
3. [Temas do CRM — item 18](#temas-do-crm--item-18)

## Onde os tokens já estão em código

- `crm/src/app/globals.css` e `crm/tailwind.config.ts`: paletas clara/escura, tokens semânticos e componentes compartilhados, conforme a tabela abaixo.

- `discovery/tailwind.config.ts`: as cores (`brand` #e11119, `ink`, `ink-soft`, `concrete`, `paper`, `line`, `surface`, `tint-brand`, `ok`, `wa`), as famílias de fonte e os raios de 2, 3 e 4px.
- `discovery/src/app/globals.css`: as classes `.card` (com a barra à esquerda), `.bar-brand`, `.btn`, `.btn-red`, `.btn-ghost`, `.eyebrow`, `.titulo-pagina`, `.titulo-card`, `.input`, `.field-label`, `.num` e `.link-acao`.
- As fontes ficam em `discovery/src/app/fonts/` (Bricolage Grotesque e Inter, woff2 variáveis).
- O logo é `mbigucci-logo.png`, servido na pasta publicada. Se ele não carregar, aparece o texto "MBigucci" em `brand`, Bricolage 800.

## Regras que mais aparecem

- **Fontes:** Bricolage Grotesque nos títulos e em **todo número**, com algarismos tabulares (`.num`). Inter no corpo.
- **Fundo e cards:** fundo `paper`. Cards em `surface` (brancos no claro) com borda decorativa `line` e **barra de 4px à esquerda**, em `ink` por padrão ou `brand` no destaque. Uma barra vermelha por área de tela. Campos e botões usam `control`.
- **Sem sombra:** bordas finas no lugar de sombras e raios pequenos.
- **Vermelho:** só em **uma ação principal por grupo**, no destaque e no foco. O foco é um contorno sólido de 2px em `brand`, afastado 2px.
- **Sem ícones e sem emoji:** sinais em glifos de texto (✓ ! ✕ – → +). O estado é sempre **sinal + palavra + cor**, nunca só cor.
- **`concrete`:** só para eyebrow e texto auxiliar; no CRM foi ajustado para atingir 4,5:1 nos dois temas. O que precisa orientar uma decisão continua em `ink` ou `ink-soft`.
- **Textos:** português do Brasil, frases curtas, imperativo, caixa de frase em títulos e botões, sem exclamação. Eyebrows ficam em caixa alta pelo CSS.
- **Números:** `R$ 3.398.300`, `60,60%`, datas `dd/mm/aaaa`.
- **Movimento:** o DS só tem o + do acordeão. As transições curtas entre etapas da pesquisa são um acréscimo e respeitam `prefers-reduced-motion`.
- **Celular:** campos com 16px, para o iOS não dar zoom, e ações fixas no rodapé, ao alcance do polegar.

## Temas do CRM — item 18

Paleta definida em 30/10/2026 a partir dos tokens claros versionados. O artifact externo continuou inacessível nesta revisão. Esta extensão vale para `crm/`; o DS de `discovery/` permanece com sua paleta original.

### Tokens claro/escuro

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

`header-glass` usa `paper` com 90% de opacidade sobre o conteúdo. O selo do PNG é branco fixo nos dois temas, sem filtro; quando a imagem falta, o texto “MBigucci” usa `brand`. A cópia atual do CRM não inclui o PNG, portanto as capturas usam esse fallback.

No claro, `concrete` passa de `#8b877f` para `#6f6b63`, e `wa` de `#b26a00` para `#925600`, para também suportarem texto pequeno. `line` permanece uma borda decorativa, sem função de identificar controles. O novo `control` cumpre essa função. Não escurecer todas as divisórias para resolver os campos.

### Contrastes verificados

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

Reproduzir os **84 pares** (incluindo foco nos três fundos): `node scripts/contraste-temas.mjs`, em `crm/`. A auditoria renderizada complementar e suas capturas estão em [Revisão visual — temas](revisao-visual.md#modo-escuro-item-18).

### Aplicação e preferência

- `crm/src/app/globals.css` contém as paletas em canais RGB. O Tailwind lê `rgb(var(--token) / <alpha-value>)`, inclusive transparências; não há classes de tema duplicadas em cada tela.
- `data-tema="claro|escuro"` resolve o tema. Sem JavaScript, a media query mantém o automático. `color-scheme` acompanha os campos nativos.
- Em **Minha conta → Aparência**, **Automático / Claro / Escuro**. Automático acompanha `prefers-color-scheme`, inclusive mudanças enquanto o app está aberto.
- A chave `mbigucci-crm-aparencia` no `localStorage` pertence ao aparelho, não à conta. Leitura e escrita têm `try/catch`; valor ausente/inválido usa Automático. Com armazenamento bloqueado, a troca funciona nesta página e a próxima abertura volta ao sistema.
- O script autossuficiente de `src/lib/aparencia.ts` roda inline no `head`, antes do corpo e da hidratação. O tema salvo já está aplicado na primeira pintura. Eventos sincronizam o seletor, mudanças de sistema e outras abas; navegar no app mantém a escolha.
- A meta `theme-color` acompanha o tema resolvido. O PNG nunca é recolorido. A faixa usa `band`, não `ink`, pois `ink` se torna claro no tema escuro.
- `@media print` força a paleta clara e `color-scheme: light`; o relatório do gerente continua com fundo branco e texto/bordas pretos, sem menu e ações, independentemente da preferência.
