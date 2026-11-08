# Base360

Logotipo do Base360, o sistema da MBigucci (decisão do Felipe, 05/11/2026). Cada sistema é um módulo: Vendas (o CRM do corretor), Repasse, Marketing; o portal fica na raiz. Todos os SVGs estão em contorno (sem fonte) e escalam sem perda.

**O símbolo (Quadrante):** a planta de um cômodo vista de cima, paredes fechadas, com um giro vermelho de 90° no canto de cima à esquerda, encostado nas paredes e desenhado por baixo delas. Grafia **Base360**: uma palavra, B maiúsculo, sem grau e sem detalhe vermelho depois do 360.

**Cores dos arquivos (o `<img>` não herda cor):**
- Claro: paredes e nome `#0d0e11`, giro `#e11119`, traço `#6f6b63`, módulo `#4a4b52`. Sobre `fundo` e `superficie` do tema papel.
- Escuro: paredes e nome `#f5f3ed`, giro `#e11119`, traço `#aaa69e`, módulo `#c4c1ba`. Sobre o tema grafite e sobre `menu-escuro`. Um só vermelho (decisão do Felipe, 06/11/2026): o coral `#ff6b70` dos arquivos originais foi trocado por `#e11119`, que dá 3,64:1 sobre `#16181c` e passa como elemento gráfico.
- Ícone e favicon: fundo `#16181c`, paredes brancas, giro `#e11119`, nos dois temas.

**Na tela, prefira o lockup inline** (`MB.marca.montar()` ou `MB.marca.html('Vendas')`, componente `MarcaBase360`): um só SVG serve aos dois temas, com paredes e nome em `texto`, giro em `marca`, traço em `texto-sutil` e módulo em `texto-suave`. Os arquivos abaixo são para onde não há CSS (e-mail, apresentação, manifesto do app).

| Arquivo | Uso |
|---|---|
| `lockup-vendas-claro.svg` / `-escuro.svg` | Cabeçalho do Base360 Vendas, inclusive na tela de entrar. |
| `lockup-repasse-claro.svg` / `-escuro.svg` | Cabeçalho do Base360 Repasse. |
| `lockup-base360-claro.svg` / `-escuro.svg` | Símbolo + nome, sem módulo: portal (`base360.mbigucci.com.br`) e materiais do sistema como um todo. |
| `simbolo-claro.svg` / `-escuro.svg` | O símbolo sozinho (menu recolhido; abaixo de 24px use o favicon). |
| `logotipo-claro.svg` / `-escuro.svg` | Só o nome “Base360”. |
| `icone.svg` | Ícone do app: 192, 512 e 180 (Apple). Símbolo a 60% do lado. |
| `icone-maskable.svg` | Ícone maskable do Android, dentro da zona segura. |
| `favicon.svg` | Favicon (32 e 16). Em 16px o giro vira um ponto vermelho no canto. |

**Medidas:** símbolo de `marca-simbolo` (28px) no computador e `marca-simbolo-celular` (24px) no celular; lockup com módulo nunca abaixo de 24px de símbolo (abaixo disso, só o símbolo); símbolo nunca abaixo de 16px. Respiro livre de meio símbolo em volta. Ordem sempre: símbolo, Base360, traço, módulo. Módulo novo entra como texto vivo em Inter 500, sem desenho próprio.

**Não faça:** abrir vão nas paredes ou desenhar porta; mudar o canto, o raio ou soltar o giro das paredes; pintar as paredes de vermelho ou pôr um segundo vermelho; ponto, quadrado ou ° depois do 360; base, laje ou moldura embaixo do símbolo; sombra, gradiente, contorno ou brilho; esticar; recompor o nome com a fonte instalada; pôr o logo MBigucci dentro do lockup.

**MBigucci fica fora do logo do sistema:** no rodapé da lateral, no fim do menu do celular e na tela de entrar (grupo Logos). Documentos de cliente (proposta, contrato) continuam com `mbigucci-logotipo-assinatura.png`; o Base360 não vai no papel do cliente.

**Pendente:** busca no INPI e aprovação da diretoria antes de publicar o nome.
