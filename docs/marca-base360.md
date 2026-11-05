# Marca Base360

Regras de uso do logo do Base360, o sistema da MBigucci. O CRM é o módulo de Vendas. Os arquivos estão em [`marca-base360/`](marca-base360/), o estudo em [`mockups/logo-base360-conceitos.html`](mockups/logo-base360-conceitos.html) e o brief em [`codex-logo-base360.md`](codex-logo-base360.md).

## Sumário
1. Decisões
2. Arquivos
3. O símbolo
4. Cores
5. O nome do módulo
6. Tamanho mínimo e respiro
7. Ícone do app e favicon
8. Contraste
9. O que não fazer
10. Como os arquivos foram feitos
11. Pendências
12. Aplicação no módulo de Vendas

## 1. Decisões
Todas do Felipe, em 05/11/2026, depois de nove rodadas:
- **Grafia:** Base360, numa palavra só, com B maiúsculo e sem o símbolo de grau.
- **Símbolo:** a planta de um cômodo vista de cima, com paredes fechadas e um giro vermelho de 90° no canto de cima à esquerda. O giro lembra porta e grau (360) e dá a ideia de visão geral de cima.
- **Sem detalhe vermelho no nome:** nada de ponto ou quadrado depois do "360". O vermelho fica só no giro.
- **MBigucci fora do logo:** o logo MBigucci vai para o rodapé da barra lateral, para o fim do menu do celular e para a tela de entrar.

O que ficou de fora e por quê:
- **Porta aberta e vão na parede:** lembram o QuintoAndar (letra Q, planta baixa e porta aberta) e passam a ideia de vazamento de dados.
- **Base ou laje embaixo do símbolo:** parecia uma polaroid ou um monitor.
- **Giro grande que ocupa o cômodo:** pesado demais.
- **Giro solto das paredes:** o Felipe quer o giro encostado nelas.

O histórico completo está no estudo, na nota da sessão e na memória do projeto.

## 2. Arquivos

| Arquivo | Uso |
| --- | --- |
| `simbolo-claro.svg` / `simbolo-escuro.svg` | O símbolo sozinho, sobre `paper` ou `surface` |
| `logotipo-claro.svg` / `logotipo-escuro.svg` | Só o nome "Base360" |
| `lockup-base360-claro.svg` / `-escuro.svg` | Símbolo + nome, sem módulo: tela de escolha do módulo (`/base360/`) e materiais do sistema como um todo |
| `lockup-vendas-claro.svg` / `-escuro.svg` | Cabeçalho do CRM, inclusive na tela de entrar |
| `lockup-repasse-claro.svg` / `-escuro.svg` | Cabeçalho do Base360 da Roberta |
| `icone.svg` | Ícone do app (192, 512 e 180 da Apple) |
| `icone-maskable.svg` | Ícone maskable do Android, dentro da zona segura de 80% |
| `favicon.svg` | Favicon (32 e 16) |
| `gerar-png.mjs` | Gera os PNGs do ícone a partir dos SVGs |

Nenhum SVG usa fonte: todo texto está em contorno (`path`). Os lockups saem no tamanho do cabeçalho do computador, com o símbolo de 28px, e escalam sem perda.

## 3. O símbolo
O símbolo é desenhado numa grade de 100 × 100:
- **Paredes:** um quadrado de 8 a 92, com paredes de 14. O cômodo vai de 22 a 78 e mede 56.
- **Giro:** um quarto de círculo de raio 28, metade do cômodo, centrado no canto interno de cima à esquerda (22, 22). Ele termina no meio das paredes de cima e da esquerda.
- **Ordem do desenho:** o giro é desenhado primeiro e entra 2 unidades nas paredes, que vêm por cima. Assim o vermelho fica dentro do cômodo, encostado, e não parece pintado sobre a parede.
- **Raio:** cantos vivos, sem raio, como o DS (raio de 2px só em botões e campos).

## 4. Cores
Só as cores do tema aprovado em 05/11/2026 (`design-system.md`).

| Peça | Claro | Escuro |
| --- | --- | --- |
| Paredes e nome (`ink`) | `#0d0e11` | `#f5f3ed` |
| Giro (`brand`) | `#e11119` | `#ff6b70` |
| Traço separador (`concrete`) | `#6f6b63` | `#aaa69e` |
| Nome do módulo (`ink-soft`) | `#4a4b52` | `#c4c1ba` |
| Ícone: fundo / paredes / giro | `#16181c` / `#ffffff` / `#e11119` | os mesmos |

Use a versão clara sobre `paper` e `surface` do tema claro, e a escura sobre os do tema escuro. Sobre a navegação grafite (`#16181c`), use a versão escura.

## 5. O nome do módulo
A ordem é sempre esta: **símbolo, Base360, traço, módulo**. Por exemplo, "Base360 · Vendas" e "Base360 · Repasse".

As medidas são proporcionais à altura do símbolo (S). Entre parênteses, os valores no cabeçalho do computador, com S = 28px:

| Item | Medida |
| --- | --- |
| Nome "Base360" | Bricolage Grotesque 800, corpo 0,79 S (22px), espaçamento −0,02 em |
| Espaço símbolo → nome | 0,32 S (9px) |
| Traço | 1px de largura, 0,64 S de altura (18px), em `concrete`, centrado |
| Espaço nome → traço e traço → módulo | 0,43 S (12px) cada |
| Módulo | Inter 500, corpo 0,54 S (15px), em `ink-soft`, caixa de frase |
| Alinhamento vertical | As maiúsculas do nome e do módulo centradas na altura do símbolo |

- **No celular:** S = 24px, com o nome em 19px e o módulo em 14px, nas mesmas proporções.
- **Cabe no aparelho mais estreito:** o lockup com "Pós-venda" mede 192px (com "Vendas", 171px). Num aparelho de 320px sobram 254px depois do recuo de 16px, do botão de menu de 44px e da margem de 6px.
- **Módulo novo:** entra como texto, com as mesmas regras, sem desenho próprio. Na tela, o nome do módulo pode ser texto vivo em Inter 500, sem SVG.

## 6. Tamanho mínimo e respiro
- **Símbolo:** no mínimo 16px; abaixo disso, use o favicon.
- **Lockup com módulo:** símbolo de pelo menos 24px. Abaixo disso, use o símbolo sozinho.
- **Respiro:** em volta do lockup, um espaço livre de pelo menos 0,5 S, sem outro texto ou borda. No cabeçalho de 64px, o próprio cabeçalho já garante isso.

## 7. Ícone do app e favicon
O ícone é o símbolo em branco e vermelho sobre o grafite `#16181c`:
- **App:** ocupa 60% do lado.
- **Maskable:** também 60%, com as quinas a 36% do centro, dentro da zona segura de 40%.
- **Favicon:** ocupa 80%, sobre um fundo com raio de 10%.

Para gerar os PNGs, rode:

```bash
node docs/marca-base360/gerar-png.mjs
```

Ele usa o sharp de `crm/node_modules` e grava em `local/marca-base360/`, fora do Git:
- `icon-192.png`, `icon-512.png` e `maskable-512.png`;
- `apple-touch-icon.png`;
- `favicon-32.png` e `favicon-16.png`.

Pode passar outra pasta como argumento. Os PNGs não são versionados.

**Em 16px**, o giro vira um ponto vermelho de uns 2px no canto: visível, mas discreto. Se o Felipe quiser mais presença na aba do navegador, a saída é um favicon com o giro maior, sem mexer no logo.

## 8. Contraste
O contraste foi calculado com a função de `crm/scripts/contraste-temas.mjs`. O mínimo é 3:1 para o símbolo e o traço, e 4,5:1 para o texto.

| Par | Claro | Escuro |
| --- | ---: | ---: |
| Paredes e nome (`ink`) / `paper` | 17,85:1 | 16,31:1 |
| Paredes e nome (`ink`) / `surface` | 19,30:1 | 14,48:1 |
| Giro (`brand`) / `paper` | 4,52:1 | 6,54:1 |
| Giro (`brand`) / `surface` | 4,89:1 | 5,81:1 |
| Módulo (`ink-soft`) / `paper` | 8,03:1 | 10,07:1 |
| Módulo (`ink-soft`) / `surface` | 8,68:1 | 8,94:1 |
| Traço (`concrete`) / `paper` | 4,90:1 | 7,46:1 |
| Traço (`concrete`) / `surface` | 5,30:1 | 6,62:1 |

| Par | Razão |
| --- | ---: |
| Ícone: paredes brancas / grafite | 17,77:1 |
| Ícone: giro `#e11119` / grafite | 3,64:1 |

O fundo grafite do ícone praticamente some sobre o `paper` escuro (1,02:1). Isso não é problema: quem aparece é o desenho branco e vermelho, não o quadrado do fundo.

## 9. O que não fazer
- Abrir vão nas paredes ou desenhar porta.
- Trocar o canto do giro, mudar o raio dele ou soltá-lo das paredes.
- Pintar as paredes de vermelho, ou pôr um segundo vermelho no conjunto.
- Colocar ponto, quadrado ou ° depois do "360".
- Pôr base, laje ou moldura embaixo do símbolo.
- Usar sombra, gradiente, contorno ou brilho.
- Esticar ou distorcer qualquer peça.
- Recompor o nome com a fonte instalada, em vez de usar os arquivos.
- Pôr o logo MBigucci dentro do lockup.

## 10. Como os arquivos foram feitos
- **Símbolo, ícone e favicon:** SVG escrito à mão na grade de 100.
- **Nome e módulos:** em contorno, gerados pelo fontkit 2.0.4, instalado só na pasta temporária da sessão com o ok do Felipe (05/11/2026). As fontes são as do projeto (`crm/src/app/fonts/`):
  - Bricolage Grotesque na instância padrão da WOFF2: peso 800 e tamanho óptico 96, o de título;
  - Inter no peso 500.
- **Script de contorno fora do Git:** ele depende do fontkit, que não é dependência do projeto. Para refazer os contornos, é preciso instalar o fontkit de novo, com ok. O `gerar-png.mjs` não depende dele.
- **Diferença do mockup:** o nome em contorno usa o tamanho óptico 96. Nos mockups o navegador ajustava o tamanho óptico pelo corpo, cerca de 22, e as letras ficavam um pouco mais abertas. A diferença é pequena, e os arquivos finais são a referência.

## 11. Pendências
- **Busca de anterioridade:** registro no INPI e logos parecidos. Não foi feita.
- **Leitura no celular do Felipe e aprovação da diretoria.**
- **Aplicar no CRM:** em andamento pelo brief `codex-aplicar-logo-base360.md` (veja a seção 12).
- **`local/` no `.gitignore`:** feito em 05/11/2026.

## 12. Aplicação no módulo de Vendas
Implementado em 05/11/2026 (brief `codex-aplicar-logo-base360.md`), ainda sem publicar:
- **Cabeçalho:** `crm/src/components/marca-base360.tsx` desenha o lockup Vendas inline, com os contornos de `lockup-vendas-*.svg` e as cores trocadas por tokens (`ink`, `brand`, `concrete`, `ink-soft`). Um só SVG serve aos dois temas. S = 24px no celular e 28px no computador.
- **Tela de entrar:** o cabeçalho mostra "Base360 · Vendas", e não o lockup sem módulo, porque o login é só deste módulo (Felipe, 05/11/2026).
- **Logo MBigucci:** rodapé da lateral aberta, fim do menu do celular e tela de entrar (seção 1).
- **Ícones e favicon:** `crm/scripts/gerar-icones.mjs` gera os PNGs de `crm/public/icons/` a partir de `icone.svg`, `icone-maskable.svg` e `favicon.svg`, com a densidade alta de `gerar-png.mjs`. Os PNGs do app continuam no Git, porque o build só copia `public/`. O `icon.svg` do app é cópia do `favicon.svg`.
- **Tela de escolha (`/base360/`):** `portal/index.html`, gerada por `node portal/gerar.mjs` com o `lockup-base360-claro.svg` (cores por token) e o CSS de `marca/tokens/`.
- **Nome do app no celular:** "Base360". Nos textos, o sistema é "Base360 Vendas".
