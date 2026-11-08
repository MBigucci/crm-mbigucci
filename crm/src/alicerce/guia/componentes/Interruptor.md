# Interruptor

Ligar e desligar algo que **vale na hora**, sem botão Salvar: os avisos no celular, uma regra do Direcionador, a distribuição automática, uma mensagem pronta. Antes havia caixa de marcar num lugar e interruptor em outro; agora é sempre este.

**Estrutura:** `<button class="mb-interruptor" type="button" role="switch" aria-checked="true|false" aria-label="…">` com `.mb-interruptor__estado` (a palavra: “Ligado” ou “Desligado”) e `.mb-interruptor__trilho` (36 × 20px; a bolinha anda 16px). O rótulo e a explicação ficam à esquerda, na mesma linha.

**Ligado = tinta:** trilho em `texto` quando ligado e em `trilho` quando desligado, como toda seleção do Alicerce. A posição da bolinha e a palavra dizem o estado também para quem não distingue cores.

**Comportamento:** `MB.interruptor.ligar(botao, { ligado, desligado })` alterna, atualiza a palavra e dispara `mb-interruptor` com `detail.ligado`. Grave na hora; se falhar, volte o interruptor e mostre o `Toast` de erro.

**Interruptor ou caixa de marcar?**
- **Interruptor:** muda algo agora, sozinho.
- **Caixa de marcar (`Marcador`):** faz parte de um formulário que só vale ao salvar (ex.: tipos de aviso antes de “Ligar avisos”, permissões numa matriz).

**Faça**
- Rótulo que diz o que liga (“Resumo do dia”), e uma linha que diz quando acontece.
- Quando desligar tem efeito grande (a distribuição para), peça confirmação em `Dialogo` explicando o efeito.

**Não faça**
- Interruptor dentro de formulário com botão Salvar.
- Verde para ligado e vermelho para desligado.
