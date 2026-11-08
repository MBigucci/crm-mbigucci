# Etapas

A esteira de vendas completa no topo de um registro: uma linha horizontal, etapas numeradas separadas por chevrons, com três estados que se distinguem pela forma — não só pela cor.

**Estrutura:** `<ol class="mb-etapas">` com `<li class="mb-etapa">`, cada um com `.mb-etapa__marcador` (círculo de 22px, numerado automaticamente) e `.mb-etapa__texto` (`.mb-etapa__nome` + `.mb-etapa__detalhe` opcional). Entre etapas, um chevron em `linha-forte` é desenhado sozinho. `.mb-etapas--faixa` coloca a linha numa faixa `superficie-sutil` logo abaixo do cabeçalho do registro.

**Estados:**

| Estado | Classe | Marcador | Texto |
|---|---|---|---|
| Concluído | `--concluida` | preenchido em `texto` (tinta), com check em `superficie` | nome em `texto-suave`, detalhe com a data |
| Ativo | `--atual` + `aria-current="step"` | preenchido em `info`, número em `sobre-info`, halo `info-fundo` | nome em `texto` 600, detalhe em `info-texto` dizendo com quem está |
| Aguardando | (sem modificador) | contorno tracejado `linha-forte`, número em `texto-sutil` | tudo em `texto-sutil` |
| Bloqueado | `--bloqueada` | `erro-fundo` com borda `erro` e “!” | em `erro-texto`, detalhe com o motivo |

Preenchido, preenchido com halo e tracejado continuam distintos em preto e branco e para quem não distingue cores.

**O consumidor fornece:** as etapas na ordem real; no detalhe, a data de conclusão (concluídas), quem precisa agir (ativa) ou o motivo (bloqueada).

**Sequência padrão de uma venda:** Proposta → Análise de crédito → Aprovação comercial → Contrato → Assinatura. Use estes nomes em todos os sistemas. Para mostrar a mesma esteira dentro de uma linha de tabela, use `Esteira`.

**Faça**
- Uma esteira por registro, logo abaixo do `CabecalhoDePagina`.
- No máximo uma etapa `--atual` (ou `--bloqueada`) por vez.

**Não faça**
- Mais de 6 etapas numa linha.
- Usar como navegação entre partes de um formulário que podem ser preenchidas em qualquer ordem — isso é `Abas`.
- Pintar etapas concluídas de verde ou de vermelho: concluído é tinta (`texto`), também com o modificador `data-acao="marca"`; o verde fica para o status final em `Selo`.

**Etapa que ainda não existe não aparece.** Um estágio previsto mas sem funcionar (“em breve”) fica fora da peça até existir; não há estado apagado para isso. Quando o estágio passar a valer, ele entra na lista.

## No celular

Abaixo de 768px a linha completa não cabe e rolaria de lado. Envolva o `<ol>` em `.mb-etapas-bloco`: nessa largura ele vira uma linha compacta, no mesmo padrão do `AssistenteEmPassos` (`.mb-assistente__passo` e `.mb-assistente__trilho`).

```html
<div class="mb-etapas-bloco">
  <p class="mb-etapas-bloco__passo" aria-hidden="true">Etapa 2 de 4 · <strong>Contatado</strong></p>
  <div class="mb-etapas-bloco__trilho" aria-hidden="true"><span style="width: 50%"></span></div>
  <ol class="mb-etapas" aria-label="Andamento do parceiro"> … as mesmas etapas … </ol>
</div>
```

- **O consumidor escreve** o “Etapa N de M · Nome” e a largura da barra (N ÷ M). No desktop os dois ficam ocultos e o `<ol>` aparece como sempre.
- **No celular** o `<ol>` continua no HTML, só sai da vista: a etapa atual mostra o `__detalhe` (quem age) e as outras ficam só para leitor de tela, que ouve a lista inteira, com `aria-current="step"` na atual. O texto “Etapa N de M” e a barra são `aria-hidden` para não repetir.
- **Bloqueada:** o “!” e o motivo continuam visíveis, abaixo da barra. A barra segue em `texto` sobre `trilho`; o sinal é o “!”, não a cor.
- **Todas concluídas:** escreva “Etapa 4 de 4 · Concluída” e barra cheia.
- Sem o `.mb-etapas-bloco`, o `<ol>` solto continua como era (rola de lado). `.mb-etapas--faixa` perde a faixa no celular.
- `.mb-etapas-bloco--celular` força a forma compacta em qualquer largura; é para exemplo e teste, não para telas.
- Não confundir com `.mb-etapas--compacta`, que só encurta os nomes no desktop.
