# Campo

Entrada de dados com rótulo sempre visível, ajuda e erro logo abaixo.

**Estrutura:** `<label class="mb-campo">` contendo `.mb-campo__rotulo`, a entrada `.mb-campo__entrada` (`input`, `textarea` ou `select` dentro de `.mb-campo__selecao`) e, quando preciso, `.mb-campo__ajuda` ou `.mb-campo__erro`. Prefixos e sufixos (`R$`, `m²`, `%`) vão em `.mb-campo__grupo` com `.mb-campo__afixo` — o grupo inteiro vira um único campo arredondado.

**Aparência:** fundo `campo`, borda `linha-forte`, `raio-sm` (8px) e `sombra-campo`, uma elevação leve que indica “editável”. No foco, borda e anel de 2px em `foco` com halo `sombra-foco`. Somente leitura e desativado ficam planos, sem sombra.

**O consumidor fornece:** o texto do rótulo em caixa de frase, `required` + `.mb-campo__obrigatorio` quando obrigatório, o `id` ligado por `aria-describedby` à mensagem de erro, e a validação.

**Layout:** dentro de `.mb-form-grade` (12 colunas), cada campo diz quantas ocupa com `style="--mb-colunas: 6"`. Formulários não passam de `leitura-max` (720px). Abaixo de 640px todo campo ocupa a linha inteira. Abaixo de 768px o campo tem 44px de altura (`controle-toque`) e o texto digitado passa a 16px (`texto-campo-toque`), para o iOS não dar zoom na página.

**Números:** valores, áreas e quantidades usam `.mb-campo__entrada--num` (alinhado à direita, algarismos tabulares) e formato brasileiro — `18.000,00`, `53,00 m²`.

**Faça**
- Valide ao sair do campo (`blur`), não a cada tecla; diga o que fazer: “Máximo de 60 parcelas até a entrega das chaves.”
- Use `readonly` para valores calculados que o funcionário precisa ver mas não deve editar (área, preço de tabela).
- Agrupe campos relacionados em um `Cartao` com título.

**Não faça**
- Placeholder no lugar do rótulo.
- Rótulos em MAIÚSCULAS (reservadas para `sobrelinha` e selos).
- Mensagem de erro só em cor: ela sempre tem o ícone e o texto.
