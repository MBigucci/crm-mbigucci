# MBigucci Design System, aplicado aqui

> A fonte da verdade é o artifact https://claude.ai/artifact/QesJh8EPBkLqV5jjbpNFEi. Leia `project/README.md` e `project/tokens.json` pela ação `read` do Artifact. O DS do CRM da Bruna (`ref/CRM Bruna/design/`) é de **outra marca** e não serve aqui.

## Onde os tokens já estão em código

- `discovery/tailwind.config.ts`: as cores (`brand` #e11119, `ink`, `ink-soft`, `concrete`, `paper`, `line`, `surface`, `tint-brand`, `ok`, `wa`), as famílias de fonte e os raios de 2, 3 e 4px.
- `discovery/src/app/globals.css`: as classes `.card` (com a barra à esquerda), `.bar-brand`, `.btn`, `.btn-red`, `.btn-ghost`, `.eyebrow`, `.titulo-pagina`, `.titulo-card`, `.input`, `.field-label`, `.num` e `.link-acao`.
- As fontes ficam em `discovery/src/app/fonts/` (Bricolage Grotesque e Inter, woff2 variáveis).
- O logo é `mbigucci-logo.png`, servido na pasta publicada. Se ele não carregar, aparece o texto "MBigucci" em `brand`, Bricolage 800.

## Regras que mais aparecem

- **Fontes:** Bricolage Grotesque nos títulos e em **todo número**, com algarismos tabulares (`.num`). Inter no corpo.
- **Fundo e cards:** fundo `paper`. Cards brancos com borda `line` e **barra de 4px à esquerda**, em `ink` por padrão ou `brand` no destaque. Uma barra vermelha por área de tela.
- **Sem sombra:** bordas finas no lugar de sombras e raios pequenos.
- **Vermelho:** só em **uma ação principal por grupo**, no destaque e no foco. O foco é um contorno sólido de 2px em `brand`, afastado 2px.
- **Sem ícones e sem emoji:** sinais em glifos de texto (✓ ! ✕ – → +). O estado é sempre **sinal + palavra + cor**, nunca só cor.
- **`concrete`:** só para eyebrow e texto auxiliar, porque fica abaixo de 4,5:1. O que precisa ser lido vai em `ink` ou `ink-soft`.
- **Textos:** português do Brasil, frases curtas, imperativo, caixa de frase em títulos e botões, sem exclamação. Eyebrows ficam em caixa alta pelo CSS.
- **Números:** `R$ 3.398.300`, `60,60%`, datas `dd/mm/aaaa`.
- **Movimento:** o DS só tem o + do acordeão. As transições curtas entre etapas da pesquisa são um acréscimo e respeitam `prefers-reduced-motion`.
- **Celular:** campos com 16px, para o iOS não dar zoom, e ações fixas no rodapé, ao alcance do polegar.
