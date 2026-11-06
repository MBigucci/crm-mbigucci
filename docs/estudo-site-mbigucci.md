# Análise do site da MBigucci contra o DS dos sistemas

**06/11/2026 · pedido do Felipe, depois da reprovação do visual pela diretoria.** Medido em mbigucci.com.br (CSS do tema, estilos computados e capturas em 1280 e 375 px; capturas em `crm/local/visual-diretoria/site/`, fora do Git).

**Sumário** · [Veredito](#veredito) · [O que o site faz](#o-que-o-site-faz) · [Site contra o DS](#site-contra-o-ds) · [O que o site também é](#o-que-o-site-também-é) · [O que isso muda na M](#o-que-isso-muda-na-m)

## Veredito
A hipótese do Felipe **está certa na maior parte**. O DS dos sistemas foi copiado da página mais utilitária do site, o **Simulador em Ferramentas**, e exagerado: faixas pretas, negrito 800 em tudo, bordas em todo card, nenhuma sombra e nenhum movimento. As páginas que definem a sensação do site (início, catálogo e contato) são mais leves por **cinco coisas** que o CRM não herdou: sombra grande e suave, movimento, muito espaço, papel claro dominante e foto. Uma ressalva: **cantos retos e barra lateral colorida também são do site** (2px nos botões e campos, barra de fase de 4px nos cards). Não foi isso que pesou, e sim o que o CRM acrescentou em volta.

## O que o site faz
Medido no início (900 elementos visíveis):

| Item | Valor medido |
| --- | --- |
| **Sombra** | `shadow-elegant`: `0 18px 50px -24px` em tinta a 45%. Grande, baixa e sem borda dura. Em cards de imóvel e no painel de busca, também no foco do campo. |
| **Elevação no hover** | Cards sobem 2 a 6 px (`-translate-y` 0,5 a 1,5) e ganham a sombra. Botão vermelho sobe 1 px em 180 ms. |
| **Imagem no hover** | `scale` de 105 a 108%, em 500 ms. |
| **Entrada na rolagem** | `.reveal`: opacidade 0 e 24 px abaixo, entra em 700 ms `ease-out`. Com `prefers-reduced-motion`, aparece direto. |
| **Menus** | O painel do menu aparece com fade e 4 px de deslize. A gaveta lateral desliza. |
| **Transições** | 89 elementos em 150 ms (cor, fundo, borda), 34 em 300 ms. |
| **Cabeçalho** | Papel a 85% com desfoque, 75 px. |
| **Raios** | 2 px em botões e campos (51 elementos), 3 a 5 px em cards, 14 px em 3, **pílula em 65** (filtros, selos, pinos), círculo nos ícones. |
| **Faixas escuras** | Só o herói (sobre foto), uma seção em tinta e o rodapé. O resto da página é papel `#F6F5F1` e cards brancos. |
| **Peso** | 400 em 574 elementos, 600 em 199, 700 em 113, **800 em 10** (só títulos de herói). |
| **Formulário** | Campo de 45 a 50 px, fundo papel sobre card branco com sombra, rótulo em caixa alta 12 px, borda de 1 px muito clara, foco com borda vermelha. Bom e arejado. |
| **Cor com sentido** | Barra do card por fase: verde pronto, azul futuro, vermelho lançamento, laranja obra. O vermelho da marca é botão e link. |

## Site contra o DS
| Item | Site | DS do Vendas hoje |
| --- | --- | --- |
| Sombra | Grande e suave, nos cards principais | Nenhuma (regra do DS) |
| Movimento | Entrada, hover, zoom, menus | Nenhum |
| Faixa escura | Herói, 1 seção e rodapé | Faixa preta no topo de **toda** lista, mais lateral e menu |
| Peso do título | 800 só no herói; 600/700 no resto | 800 em títulos de 21 a 27 px, 700 nos cards |
| Borda | `line` muito clara (1,2:1), só como moldura | Bordas fortes em controle e botão secundário |
| Espaço | Seções de 700 a 1260 px, respiro grande | Cards de 16 px de padding, lista densa |
| Botão | 2 px, 600, sobe 1 px | 2 px, 600, sem movimento (igual no resto) |
| Foto | Protagonista | Não existe |

A origem do DS aparece na captura de Ferramentas: barra preta e vermelha nos cards, campos de 2 px, tudo plano. É a página do site mais parecida com o CRM, e foi a única copiada.

## O blog (acrescentado em 06/11/2026)
Medido em mbigucci.com.br/blog/ (captura em `crm/local/visual-diretoria/site/blog-*.jpg`):
- **Herói grafite com brilho radial vermelho** no canto, título em Bricolage 800 com **uma palavra em vermelho**, colagem de fotos com raio de 10px e em elipse.
- **Eyebrow em vermelho:** caixa alta, 11,5px, 600, espaçamento de 0,22em, acima de cada título de seção ("TODOS OS ARTIGOS"). Título da seção em Bricolage 700, 37px.
- **Filtros em pílula:** raio total, 10 × 18px, 14px/600, borda `line`, fundo branco, ponto colorido por categoria; o marcado vira tinta com texto branco. Contador discreto ("Mostrando 1 a 6 de 2036 artigos").
- **Card:** branco, borda `line`, **5px de raio**, foto no topo, **sobe 6px no hover** com borda e sombra (`transition-all` 300ms).
- **Etiqueta sobre a foto:** vermelho cheio, **2px de raio**, caixa alta 10px, espaçamento 0,1em.
- **Botão secundário (`btn-ghost`)**: borda de tinta, no hover **inverte** para fundo tinta e texto papel.
- **Menu:** caixa alta 12,5px com espaçamento, item atual com sublinhado vermelho de 2px; linha vermelha de progresso no topo da página.

## O que o site também é
- **Não é macio.** Cantos de 2 px e caixa alta com espaçamento são marca. A suavidade vem de sombra, espaço e movimento.
- **Tem pontos fracos que o CRM já corrigiu:** borda de campo a 1,2:1, concreto `#9A958C` em texto pequeno, âmbar `#E8890C`.
- **Não serve de modelo para tudo:** foto, mapa e herói não existem no CRM. A parte reaproveitável é sombra, movimento, papel, pílula e formulário.

## O que isso muda na M
A M já traz papel quente, movimento curto, sombra e Bricolage 700. O site sugere três ajustes, ainda **não aplicados**, para o Felipe decidir:
1. **Usar a sombra do site** (`0 18px 50px -24px` em tinta a 45%) no card em destaque e na faixa, no lugar da sombra pequena de hoje.
2. **Elevação de 2 a 4 px no hover do card** (hoje 1 px), com a mesma sombra.
3. **Pílula nos selos e filtros** (já é assim na M) e **foco do campo com borda vermelha e sombra**, como no site.
O raio de 12 px dos cards da M é maior que o do site (4 a 5 px); o dos botões (7 px) vem do logo.

**Limites:** não medi o hover em runtime (li as regras no CSS), nem o Simulador por dentro além da primeira tela, nem o blog e a área do cliente.
