# ConfirmarNaLinha

A confirmação de **tirar um item de uma lista** — um documento, uma faixa, uma tipologia, uma regra, uma equipe — na própria linha, sem janela no meio da tela. Faz parte da regra de confirmação por risco (decisão do Felipe, 06/11/2026):

| A ação | Como confirma |
|---|---|
| Volta atrás sem perda (etapa, descarte, baixa, cancelar visita) | não pergunta; `Toast` com Desfazer |
| Tira um item de uma lista | **esta peça**: “Remover?” na linha |
| Não volta (fechar o mês, encerrar competência, aplicar importação, desligar a distribuição) | `Dialogo` com o efeito escrito |
| A regra pede motivo (cancelar venda, recusar lançamento, corrigir visita) | motivo obrigatório no próprio card ou painel |

**Estrutura:** o botão “Remover” (`--discreto --p`, `aria-controls`) e, logo abaixo da linha, `.mb-confirmar` (com `hidden`) em `erro-fundo`: o texto `.mb-confirmar__texto` com a pergunta em `strong` (“✕ Remover este arquivo?”) e **o efeito** (“Ele sai do Base360 e o histórico registra a remoção.”), “Cancelar” e o botão `--perigo --p` com o mesmo verbo. Com o botão principal vermelho ligado, o perigo fica grafite, como em todo o Alicerce.

**Comportamento:** `MB.confirmar.ligar(botao)` mostra a confirmação no lugar do botão e põe o foco nela; “Cancelar” e `Esc` voltam. Depois de remover, a linha some e o `Toast` confirma.

**Não faça**
- `confirm()` do navegador.
- Remover no primeiro toque sem Desfazer nem confirmação.
