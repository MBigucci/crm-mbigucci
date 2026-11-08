# Carregando

Esqueleto da forma que vai aparecer — um card de lead, linhas de tabela — enquanto os dados chegam. É estático: nada pisca, nada pulsa.

**Estrutura:** um contêiner com `aria-busy="true"` e um texto para o leitor de tela (`<span class="mb-visualmente-oculto">Carregando leads…</span>`), e dentro `.mb-esqueleto` com blocos `.mb-esqueleto__bloco` em `areia`:
- `--titulo` (18px), padrão (12px, linha de texto), `--selo` (pílula de 22px), `--botao` (altura `controle-m`, `raio-sm`);
- `style="--mb-largura: 60%"` define a largura de cada bloco — varie para parecer texto;
- `.mb-esqueleto__linha` põe blocos lado a lado (título e selo; dois botões).

Variantes de contêiner: `.mb-esqueleto--lead` (a moldura do `CardLead`) e `.mb-esqueleto--tabela` (linhas de `linha-tabela`).

**Botão:** quando a espera é de uma ação (calcular, enviar), use `aria-busy="true"` no próprio botão — o giro e o gerúndio já existem em `Botao`.

**O consumidor fornece:** a mesma quantidade de esqueletos que costuma chegar (três cards, oito linhas) e o texto oculto.

**Faça**
- Mostre o esqueleto só se a espera passar de 300ms; antes disso, nada.
- Troque esqueleto por conteúdo de uma vez, sem animação de saída.

**Não faça**
- Animação de brilho ou pulso: viola “nada pisca, nada se move sozinho”.
- Spinner de página inteira.
