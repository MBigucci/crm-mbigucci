# NavegacaoDaArea

As páginas irmãs de uma área, uma por endereço, logo abaixo do `CabecalhoDePagina`: Stand → Atendimento · Períodos e roleta · Relatório · Cadastros. Cada item é um link; o atual fica marcado em tinta. É o mesmo desenho das `Abas`, mas para trocar de página, não de recorte.

**Estrutura:** `<nav class="mb-navarea" aria-label="Stand">` com um `<a class="mb-navarea__item" href="…">` por página. A atual leva `aria-current="page"`: texto em `texto` com sublinhado de 2px em `texto` (seleção é tinta, nunca vermelho); as demais em `texto-sutil`, e `texto` no hover. Não há JavaScript: o link navega, e a página nova já nasce com a sua marcada.

```html
<nav class="mb-navarea" aria-label="Stand">
  <a class="mb-navarea__item" href="/vendas/stand/atendimento" aria-current="page">Atendimento</a>
  <a class="mb-navarea__item" href="/vendas/stand/periodos">Períodos e roleta</a>
  <a class="mb-navarea__item" href="/vendas/stand/relatorio">Relatório</a>
  <a class="mb-navarea__item" href="/vendas/stand/cadastros">Cadastros</a>
</nav>
```

**No celular:** a faixa rola de lado dentro dela mesma, sem barra de rolagem, e cada item tem 44px de altura de toque. O item cortado na borda mostra que há mais. A página não rola na horizontal. Não é impressa.

**Quando usar esta peça, e quando usar `Abas`**

| | `NavegacaoDaArea` | `Abas` |
|---|---|---|
| O que troca | a página inteira, com endereço próprio | um recorte do mesmo conteúdo, na mesma tela |
| Elemento | `nav` com links | `tablist` com botões e painéis |
| Voltar do navegador | volta à página anterior da área | não muda |
| Quem não pode abrir | o item some | a aba some |

**Posição:** logo abaixo do `CabecalhoDePagina`, em todas as páginas da área, sempre no mesmo lugar e na mesma ordem. O título e a trilha do cabeçalho dizem a página (“Stand › Relatório”).

**O consumidor fornece:** o nome da área em `aria-label`, os rótulos e endereços, e o `aria-current="page"` na página aberta. Mostre só as páginas que a pessoa pode abrir; um item bloqueado não aparece.

**Faça**
- De 2 a 5 itens, rótulos de até três palavras, com o substantivo (“Relatório”, não “Ver”).
- A primeira é a página de trabalho do dia (“Atendimento”); a de configuração fica por último (“Cadastros”).
- Uma área com um item só não tem navegação: não mostre a faixa.

**Não faça**
- Usar para recortes da mesma lista (status, período): isso é `Abas`.
- Usar para etapas em sequência: isso é `Etapas`.
- Botões grandes em grade no lugar da faixa, nem uma segunda faixa dentro da página: duas navegações competem.
- Sublinhado ou texto vermelho no item atual, inclusive com `data-acao="marca"`.
- Contagem em cada item; se um número pede ação, ele vai no conteúdo da página.
