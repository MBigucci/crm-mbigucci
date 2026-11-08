# Cartao

A superfície de trabalho principal (estrutura inspirada no Tailwind Catalyst): branco puro sobre o fundo papel, borda sutil e a mesma micro-sombra dos campos. Tudo o que fica dentro dele é plano.

**Estrutura:** `<section class="mb-cartao">` com `.mb-cartao__cabecalho` (título `.mb-cartao__titulo` + `.mb-cartao__descricao` + um selo ou ação à direita), um ou mais `.mb-cartao__corpo` (corpos seguidos ganham uma linha horizontal entre eles) e `.mb-cartao__rodape` opcional. `--compacto` reduz os paddings para painéis densos. Uma `Tabela` colocada como filho direto do cartão perde borda, raio e sombra próprios.

**Hierarquia de superfícies:** `fundo` (papel, #f6f5f1) → cartão em `superficie` (#ffffff) com borda `linha`, `raio-md` e `sombra-cartao` → sub-seções planas em `superficie-sutil`. Só o cartão de fora tem sombra.

**Sub-seções internas:** para agrupar dados dentro do cartão (cliente dentro da proposta, condições de pagamento), use `.mb-subsecao` com um `.mb-subsecao__titulo`:
- padrão — fundo `superficie-sutil` (cinza quente ultra sutil), `raio-sm`, sem borda e sem sombra;
- `--linha` — sem fundo, só um fio de 2px em `linha` na lateral esquerda.

Coloque várias em `.mb-subsecoes` (empilhadas) ou `.mb-subsecoes--lado-a-lado`. Dados de leitura vão em `<dl class="mb-pares">`; valores em `dd.mb-pares__num` (à direita, tabulares).

**Rodapé:** `.mb-cartao__rodape` em `superficie-sutil` (quase branco), com o fio em cima. É o mesmo rodapé da faixa de ações do `CardDeItem` (o card de item é um Cartao de uma seção só, clicável inteiro): mesmo fundo, raio e respiro, e a mesma ordem — a ação principal por último, à direita. **Peso pela frequência** (decisão do Felipe, 06/11/2026): uma ação cheia; a segunda com borda (`--secundario`) se for de uso diário, sem borda (`--discreto`) se for eventual, como “Pedir ajuste”. No computador os botões têm o tamanho do texto; no celular ocupam a largura.

**O consumidor fornece:** o título que nomeia o assunto, o conteúdo e até duas ações no rodapé (a principal à direita).

**Faça**
- Empilhe cartões com `esp-4` em painéis e `esp-8` em formulários.
- Use o fio lateral quando as sub-seções estão lado a lado e o fundo sutil quando estão empilhadas — ou alterne, como no exemplo, para diferenciar “quem” de “quanto”.
- No modo foco, cada cartão vira uma `.mb-secao`.

**Não faça**
- Cartão dentro de cartão, ou sub-seção com borda completa e sombra.
- Fio lateral colorido (vermelho, azul, verde): o fio é estrutural e fica em `linha`. Sem exceção: o `CardLead` também não tem barra.
- Cartão clicável inteiro: para itens de lista que abrem um registro, use o `CardDeItem` (o título é o link e o card todo responde).
