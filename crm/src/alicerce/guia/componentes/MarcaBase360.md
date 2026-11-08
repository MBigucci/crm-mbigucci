# MarcaBase360

O lockup do sistema na tela: símbolo, “Base360”, traço e o nome do módulo — um só SVG para os dois temas, com as cores vindas dos tokens.

**Como usar:** escreva `<span data-mb-marca="Vendas"></span>` (ou `"Repasse"`, `"Marketing"`; vazio = Base360 sozinho, para o portal) e chame `MB.marca.montar()` no carregamento. Sem o bundle.js, cole o HTML de `MB.marca.html('Vendas')` dentro de `<span class="mb-marca" role="img" aria-label="Base360 · Vendas">`. `data-mb-simbolo` (ou `MB.marca.simbolo()`) desenha só o símbolo.

**Peças e cores:** `.mb-marca__lockup` é o SVG com os contornos oficiais do símbolo e do nome (de `lockup-base360-claro.svg`, sem fonte); `.mb-marca__giro` em `marca`, `.mb-marca__paredes` e `.mb-marca__nome` em `texto`; `.mb-marca__traco` (1px × 0,64 S) em `texto-sutil`; `.mb-marca__modulo` em Inter 500 a 0,54 S, `texto-suave`. Os espaços nome → traço → módulo são 0,43 S. S = `marca-simbolo` (28px) no computador e `marca-simbolo-celular` (24px) abaixo de 768px ou com `.mb-marca--celular`.

**Fundo escuro:** dentro de `.mb-menu--escuro` e `.mb-folha--escuro` as paredes passam a `sobre-menu` e traço e módulo a `sobre-menu-suave`; o giro continua `marca` (3,64:1 sobre o grafite — um só vermelho). Em outro fundo escuro, redefina `--mb-marca-paredes`, `--mb-marca-traco` e `--mb-marca-modulo` no contêiner.

**Logo MBigucci:** `.mb-logo-mbigucci` com o `mbigucci-logotipo.png` dentro, a `marca-mbigucci` (24px) de altura. O contêiner recorta o arquivo pelo retângulo (o PNG traz um lema branco embaixo). Vai no rodapé da lateral, no fim da folha do celular e na tela de entrar — nunca ao lado do lockup.

**O consumidor fornece:** o nome do módulo e o link do lockup (a tela inicial do módulo).

**Faça**
- Lockup com módulo no cabeçalho e no menu de cada módulo, inclusive na tela de entrar (o login é do módulo).
- Base360 sozinho só no portal (`base360.mbigucci.com.br`) e em materiais do sistema como um todo.
- Respiro de meio símbolo em volta do lockup.

**Não faça**
- Recompor “Base360” com a fonte instalada: o nome vem sempre dos contornos.
- Pôr o ícone MB ou “Sistemas MBigucci” ao lado do lockup.
- Lockup com módulo abaixo de 24px de símbolo: use o símbolo sozinho.
- Recolorir o giro, trocar de canto ou usar o coral antigo (#ff6b70).
