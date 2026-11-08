# Lista

A lista densa de itens de trabalho, uma linha por item: pendências do Repasse, a agenda, a fila, retornos do dia. É a mesma peça em todos os módulos; a linha inteira abre o registro.

**Estrutura:** `<ul class="mb-lista mb-lista--cartao">` (`--cartao`: com moldura, sozinha na página; sem ela, dentro de um `Cartao`) com `<li class="mb-lista__item">` de 48px:
- na frente, uma âncora curta: `.mb-codigo` (“PD-0091”) ou `.mb-lista__hora` (“10:00”, tabular);
- `.mb-lista__conteudo` com `.mb-lista__titulo.mb-lista__alvo` (o link que estica pela linha) e `.mb-lista__meta`;
- à direita, `.mb-lista__lateral` (um `Prazo`, um valor) ou um `Selo`.
- Para separar dias ou grupos: `<li><p class="mb-lista__grupo">Hoje · sexta, 06/11</p></li>`.

**Quando usar Lista, CardDeItem ou Tabela:**
- **Lista:** muitos itens do mesmo tipo, para varrer com o olho, com uma ação (abrir). Funciona igual no celular.
- **CardDeItem:** itens que pedem ação ali mesmo (WhatsApp, Registrar, Remarcar), principalmente no celular.
- **Tabela:** comparar números e colunas, ordenar, editar na linha.

**Apelidos:** `.mb-agenda` e `.mb-agenda__item` continuam funcionando; para novas telas, use a Lista com `.mb-lista__hora`.

**O consumidor fornece:** os itens já ordenados (o mais urgente primeiro), o texto da meta e o prazo calculado.

**Faça**
- Ordenar pelo que pede ação: prazo vencido primeiro.
- Um elemento à direita, no máximo.

**A linha da própria pessoa:** `aria-current="true"` no `.mb-lista__item` (fundo `areia`, título em 700), com o nome “Você”.

**Não faça**
- Botões em cada linha (vire `CardDeItem` ou `Tabela` com ações).
- Linhas de mais de duas linhas de texto.
