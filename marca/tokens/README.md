# Pacote de tokens MBigucci

Os tokens do MBigucci Design System num lugar que o CRM (módulo de Vendas) e o Base360 da Roberta podem importar. É o mesmo `tokens.json` publicado no artifact do DS (`https://claude.ai/artifact/QesJh8EPBkLqV5jjbpNFEi`, arquivo `project/tokens.json`).

| Arquivo | O que é | No Git |
| --- | --- | --- |
| `tokens.json` | A fonte: cores nos temas Claro (`light`) e Escuro (`dark`), tipografia, espaços, raios, bordas, tamanhos, opacidades e desfoque, no formato de listas do DS | sim |
| `conferir.mjs` | Compara o `tokens.json` com o `crm/src/app/globals.css` e falha se algum valor divergir | sim |
| `gerar.mjs` | Gera os CSS de `dist/` | sim |
| `dist/mbigucci.css` | Variáveis em canais RGB, como o CRM usa (`--paper: 247 246 242;`), no claro, em `[data-tema="escuro"]` e no automático | não (gerado) |
| `dist/base360-shadcn.css` | As variáveis shadcn do Base360 (`:root` e `.dark`) com os valores MBigucci | não (gerado) |

## Como usar

```bash
node marca/tokens/conferir.mjs
```

```bash
node marca/tokens/gerar.mjs
```

Os dois rodam sem instalar nada. O `conferir.mjs` lê o `:root`, o `[data-tema="escuro"]`, o bloco automático (`prefers-color-scheme`) e o de impressão do `globals.css`, e também confere o vidro do cabeçalho e do aviso (85%, 12px), o hover da navegação, as larguras da lateral (180/64px), o alvo de toque (44px), o padding do botão e a barra do item atual. Token que existe no CRM e falta no `tokens.json` também conta como divergência.

**Revisão de conforto (06/11/2026):** nenhuma cor mudou. Mudaram regras de uso, registradas no `tokens.json`: dois estilos de texto novos (`numero-leitura` e `linha-de-trabalho`), o `touch-target` vale para todo controle de escolha, o `brand` fica só para urgência real e ação principal, e a faixa (`band`) ganha borda `line` no escuro. O porquê está em `docs/estudo-conforto-uso.md`.

**Ao mudar um valor:** mude no `globals.css` e no `tokens.json`, rode o `conferir.mjs` até dar 0 divergências e publique o `tokens.json` no artifact (inteiro, no formato de listas). Os CSS de `dist/` não se editam à mão.

## Como o CRM vai importar (etapa seguinte, com o ok do Felipe)

Hoje o CRM **não** importa o pacote: o `globals.css` continua com os valores escritos nele, e o `conferir.mjs` garante que os dois batem. Para importar:

1. Rodar `gerar.mjs` antes do `npm run build` do `crm/` e copiar `dist/mbigucci.css` para `crm/src/app/`.
2. Trocar os blocos `:root`, `[data-tema="escuro"]` e o automático do `globals.css` por `@import "./mbigucci.css";`. O bloco de impressão continua no `globals.css`.
3. Conferir o build nos dois temas e na impressão.

## Como o Base360 vai importar (etapa seguinte, com o ok do Felipe e da Roberta)

1. Copiar `dist/base360-shadcn.css` para o repositório do Base360.
2. Trocar os blocos `:root` e `.dark` de `src/styles.css` por esse arquivo, **mantendo** `--radius` e `--info`, que ele não traz.
3. As fontes (Bricolage Grotesque e Inter), o tamanho do botão (14px/500, raio 6px e sombra no shadcn) e a lateral ficam para a mesma conversa: não são variáveis.

### Mapeamento

| Variável shadcn | Token MBigucci |
| --- | --- |
| `--background` | `paper` |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground` | `ink` |
| `--card`, `--popover` | `surface` |
| `--primary`, `--ring` | `brand` |
| `--primary-foreground`, `--destructive-foreground` | `on-brand` |
| `--secondary`, `--accent` | `secondary` |
| `--muted` / `--muted-foreground` | `surface-disabled` / `ink-soft` |
| `--destructive` | `no` |
| `--success` / `--warning` | `ok` / `wa` |
| `--border` / `--input` | `line` / `control` |
| `--sidebar` / `--sidebar-foreground` | `nav` / `on-dark-soft` |
| `--sidebar-primary`, `--sidebar-ring` | `nav-marca` |
| `--sidebar-primary-foreground` | `nav` |
| `--sidebar-accent` / `--sidebar-accent-foreground` | `nav-ativo` / `on-dark` |
| `--sidebar-border` | `nav-linha` |

O mapa está em `SHADCN`, dentro de `gerar.mjs`. Os valores atuais do Base360 estão em `docs/ds-atualizacao-inventario.md`, seção 6.

## Pendências com a Roberta

- **`--accent`:** no shadcn é o fundo de hover dos menus e do botão `ghost`. O Base360 usa vermelho; o pacote propõe `secondary`, neutro. Marcado no CSS gerado.
- **`--primary` do tema escuro:** no Base360 é azul (`#4393e1`); o pacote usa `brand` do escuro (`#ff6b70`). Marcado no CSS gerado.
- **`--radius`:** o Base360 calcula os raios a partir dele (`sm` −4px, `md` −2px, `lg`, `xl` +4px). Com 4px, `md` dá os 2px do botão, mas `sm` zera e `xl` dá 8px nos cards. Fica de fora do CSS gerado.
- **`--info`:** o DS não tem azul. Fica de fora do CSS gerado.
- **Seletor do tema:** o CRM usa `data-tema="escuro"`, o Base360 a classe `.dark` e a página do DS `data-theme="dark"`. Cada CSS gerado usa o do seu sistema.
