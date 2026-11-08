# CardDeItem

O card de trabalho de qualquer módulo: lead no Vendas, contrato no Repasse, compromisso, parceiro. **O card inteiro abre o registro**, e embaixo vem a faixa com as ações rápidas. O `CardLead` e o `Compromisso` são receitas dele.

**Estrutura:** `<ul class="mb-itens">` (`--duas`: duas colunas a partir de 1024px) com `<li class="mb-item">`:
- `.mb-item__cabeca`: `.mb-item__id` com uma `.mb-sobrelinha` opcional (tipo e código: “Contrato CT-2026-0418”), o título `.mb-item__titulo.mb-item__alvo` (o link para o registro, estilo `titulo-item`), e linhas `.mb-item__linha` (`--forte` para a que pede ação). À direita, um `Chip` de classificação, quando houver (a temperatura do lead) — **só ele**: situação, etapa e estado nunca vão no canto, vão no rodapé, mesmo quando o card não tem chip (decisão do Felipe, 07/11/2026).
- `.mb-item__texto`: a última interação, em até duas linhas.
- `.mb-item__rodape`: os `Selo`s de situação (etapa, status). No máximo dois.
- `.mb-item__faixa`: a faixa de ações, que é **o mesmo rodapé do `Cartao`** (fundo `superficie-sutil`, quase branco, fio em cima, mesmo raio e respiro). O CardDeItem é um Cartao de uma seção só, sem cabeçalho separado, que se abre inteiro com um toque.

**O card inteiro é clicável:** o título é um link esticado (`.mb-item__alvo::after` cobre o card). Botões, links e campos dentro do card ficam por cima dele e continuam funcionando. Quando o card abre no próprio lugar em vez de levar a outra tela (a visita na ficha), o título é um `button.mb-item__alvo` com `aria-expanded`, com o mesmo desenho. Com o teclado, o foco do título desenha o anel no card inteiro. No hover o card sobe 4px com `sombra-elegante`.

**Faixa de ações: no máximo duas, e nada de “Mais”** (decisão do Felipe, 06/11/2026). A faixa leva só as ações rápidas do dia a dia; o que é crítico ou raro — descartar, cancelar, agendar, corrigir, compartilhar — exige **abrir o card**, onde a pessoa vê o registro inteiro antes de decidir. A principal vem por último, cheia; a outra leva borda (`--secundario`) quando é de uso diário, como Registrar. No computador os botões têm o tamanho do texto e ficam à direita; no celular ocupam a largura e, se o rótulo não couber (“+ Observação e comprovante”), quebram em duas linhas, sem cortar. Receitas:
- Lead (Vendas): `Registrar` · `WhatsApp →` (verde). Agendar visita, Compartilhar e Descartar lead ficam na ficha.
- Contrato (Repasse): `Registrar pendência`. Compartilhar e Abrir o espelho ficam no contrato aberto.
- Compromisso: veja `Compromisso`.

**Edição no card:** o que é curto (até dois campos, como Remarcar, Observação ou Corrigir) abre dentro do próprio card, no lugar da faixa: `.mb-item__edicao` (com `hidden`), aberta por um botão com `aria-controls`, ligado com `MB.edicao.ligar(botao)`. Um card editado por vez; `Esc` e `[data-mb-fechar]` fecham e devolvem o foco. Mais de dois campos vai para o `PainelLateral`.

**O primeiro card da tela** (o que pede ação agora) leva `.mb-item--destaque`: só a `sombra-elegante`, sem barra e sem cor.

**O consumidor fornece:** o título e o link do registro, as linhas já formatadas (com o `Prazo` quando houver), o chip, os selos e as ações que o perfil permite.

**Faça**
- Uma ação principal por card. O WhatsApp verde conta como ação, não como destaque.
- Prazo com sinal e palavra (`Prazo`), nunca só cor.
- Ação destrutiva ou crítica só dentro do registro aberto, seguindo a regra de confirmação por risco (Desfazer ou `Dialogo`).

**Não faça**
- Botão “Abrir” na faixa: o card inteiro já abre.
- Mais de duas ações na faixa, ou um menu “⋯” no card.
- Barra lateral colorida no card.
- Card dentro de card: dentro do registro, use `Cartao` e `.mb-subsecao`.
