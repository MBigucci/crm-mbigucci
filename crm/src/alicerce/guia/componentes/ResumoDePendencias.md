# ResumoDePendencias

O bloco escuro do topo de uma tela de trabalho: quantos itens pedem atenção em cada grupo, cada número levando direto ao grupo. Na Lista do dia do Vendas são os contatos; no Repasse, as pendências vencidas, as que vencem hoje e os contratos parados. (Antes se chamava FaixaDeAtencao; `.mb-faixa` continua valendo como apelido.)

**Estrutura:** `<section class="mb-resumo" aria-label="Prioridades do dia">` com `.mb-resumo__titulo` (“Contatos que precisam de atenção”), `.mb-resumo__itens` (uma coluna no celular, três a partir de 768px) com links `.mb-resumo__item` para as seções da própria tela — `.mb-resumo__numero` (estilo `numero-faixa`, 40px, tabular) + `.mb-resumo__texto` sublinhado com “→” — e `.mb-resumo__rodape` (“1 visita hoje · próxima às 15h Ver visitas →”).

**Cores:** fundo `faixa` — o grafite do site no papel; no tema grafite, um vinho profundo com borda `faixa-borda`. Textos em `sobre-faixa` e `sobre-faixa-suave`. Sem barra lateral e sem vermelho. `sombra-elegante`. **Um bloco escuro por tela, no máximo**: o destaque escuro do cartão da meta anual também passa a ser este.

**Variante `--empilhada`:** número embaixo do rótulo, para painéis. Itens que não levam a lugar nenhum são `<div class="mb-resumo__item">` com `.mb-resumo__texto--sem-link`, sem seta nem sublinhado.

**O consumidor fornece:** as contagens reais (as mesmas dos títulos das seções), os links para cada seção e a linha do rodapé.

**Faça**
- No máximo três números, os grupos que pedem ação.
- Rótulo que diz a ação (“Detalhe o contato →”), não a categoria.

**Não faça**
- Bloco vermelho ou com barra lateral.
- Números que não pedem ação (“Leads no mês”): isso é `Indicador`.
- Mais de um bloco escuro por tela.
