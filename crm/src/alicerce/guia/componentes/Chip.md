# Chip

A classificação que a pessoa dá a um registro, numa pílula com cor: sinal + palavra. De propósito com forma diferente do `Selo` (pílula, caixa de frase, sinal no lugar do ponto), para uma classificação nunca parecer status do sistema.

**Classes:** `.mb-chip` + um nível. O sinal vai num `<span aria-hidden="true">`: o leitor de tela ouve só a palavra.

| Nível | Vendas (temperatura) | Outros módulos (prioridade) | Tokens |
|---|---|---|---|
| `--alto` | `! Quente` | `! Alta` | `nivel-alto-fundo`, `nivel-alto-texto`, sinal em `nivel-alto` (laranja) |
| `--medio` | `○ Morno` | `○ Média` | `nivel-medio-*` (amarelo) |
| `--baixo` | `– Frio` | `– Baixa` | `nivel-baixo-*` (ardósia) |
| `--sem` | `– Sem temperatura` | `– Sem prioridade` | `areia` e `texto-suave` |

**Por que essas cores:** todo chip do sistema tem cor (decisão do Felipe, 06/11/2026). O alto não é vermelho, porque o vermelho é do logo, do menu e da ação principal; o baixo não é azul, porque o azul é foco, link e andamento. A ordem está também na claridade, então funciona para quem tem daltonismo, e sinal e palavra seguem carregando o sentido impressos em preto e branco.

**Apelidos em desuso:** `.mb-selo-lead` com `--quente`, `--morno` e `--frio` continuam funcionando.

**O consumidor fornece:** o nível que a pessoa marcou e a palavra do módulo.

**Faça**
- Um chip por card, à direita do título.
- Mostrar “Sem temperatura” quando a classificação é opcional e está vazia: a ausência também é informação.

**Não faça**
- Chip para status de proposta, contrato ou visita: isso é `Selo`.
- Chip para prazo: prazo é `Prazo` (texto colorido com sinal).
- Ícones de fogo ou gelo.
