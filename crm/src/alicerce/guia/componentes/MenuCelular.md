# MenuCelular

Abaixo de 768px o `MenuLateral` sai e entra o cabeçalho do celular: o lockup do módulo à esquerda e, à direita, o **+** do módulo e o **ícone de menu do site mbigucci.com.br** (três traços), sempre na ponta direita, para dar espaço ao lockup (decisão do Felipe, 06/11/2026). Embaixo dele, quando o módulo tem um status (a vez na fila, o recebimento de leads), a faixa de status.

**Cabeçalho:** `<header class="mb-celular-topo">` (fica no topo ao rolar), nesta ordem:
- o lockup (`data-mb-marca`, símbolo de 24px), à esquerda;
- o + do módulo: botão de ícone **`--primario`, sempre na cor de destaque** (`acao`: grafite, ou vermelho com `data-acao="marca"`), com `aria-label` do que cria (“Novo lead”, “Novo contrato”);
- `<button class="mb-menu-icone" aria-controls="menu-folha" aria-expanded="false" aria-label="Abrir menu">`, na ponta direita, com `.mb-menu-icone__barras` (três `<span>`): alvo de 44 × 44px, desenho de 24 × 16px, traços de 2px — o de cima e o de baixo com a largura toda, o do meio com dois terços. Aberto, os traços de cima e de baixo giram ±45° e formam um X, e o do meio some.

**O + como ação, não link:** quando o + abre um painel na mesma tela (+ Nova regra), use `<button class="mb-botao mb-botao--primario mb-botao--icone" type="button" aria-label="Nova regra">` com o mesmo ícone `novo` e abra o painel no `onClick`. Vale o mesmo desenho e a mesma posição do + que é link (`<a>`); não troque a rota por `?nova=1` só para o + continuar link.

**Faixa de status (`.mb-celular-status`):** só no celular, presa logo abaixo do cabeçalho: o `.mb-status` do módulo, com a cor do estado (“✓ Recebendo · 3º na fila” em verde, “! Faça check-in” em âmbar, “→ Em visita” em azul, “– Pausa até 12/11” em areia — veja `BarraSuperior`), e uma ação curta que leva à tela do status (“Ver fila”). A faixa tem 44px; o status e a ação ganham área de toque de 44px sem crescer, qualquer que seja a altura da pílula (o `::after` deles é essa área; não use o `::after` para outra coisa). Módulo sem status não tem faixa.

**Folha:** `<div class="mb-folha" id="menu-folha" role="dialog" aria-modal="true" aria-label="Menu">` seguida do véu `.mb-folha__veu`. No topo (`.mb-folha__topo`) vão o lockup e **o mesmo ícone, já em X** (`aria-expanded="true"`, `aria-label="Fechar menu"`, `data-mb-fechar`), exatamente no lugar do de abrir: o dedo que abriu fecha sem procurar. Depois os itens `.mb-folha__item` (48px; o atual com fundo `areia` e o quadradinho em `marca`), o grupo de atalhos externos (“Simulador ↗”), a conta (nome, Minha conta e Sair — o único lugar da conta no celular) e o logo MBigucci.

**Grupo vazio:** um `.mb-folha__grupo` sem item (só o rótulo, como Atalhos sem atalhos) fica oculto pelo CSS; não desenhe o rótulo quando não há itens.

**Trocar de módulo no celular:** na folha, um grupo **Módulos** com os outros módulos que a pessoa pode abrir (o atual já está no lockup do cabeçalho), entre os atalhos e a conta. Quem só tem um módulo não vê o grupo.

**Notificações no celular:** o sino não cabe no cabeçalho. Quando há notificação nova, o ícone de menu ganha o ponto de notificação (`.mb-botao__ponto`, em `marca`) e o `aria-label` diz quantas (“Abrir menu: 3 notificações novas”); na folha, “Notificações” fica depois dos itens do módulo, com a contagem (`.mb-folha__contagem`), e abre a página de `Notificacoes`.

**Comportamento:** `MB.menuCelular.ligar(botao)` abre e fecha, troca o `aria-label` (“Abrir menu” / “Fechar menu”) e devolve o foco. A folha desce em `mov-entrada`; `Esc`, o véu e o X fecham. Com movimento reduzido só aparece.

**Folha grafite:** com `data-menu="escuro"` no `<html>` a folha usa `menu-escuro`, junto com o menu lateral, e o ícone acompanha a cor.

**Faça**
- Valide em 375px e em 320px: lockup (171) + o + (44) + ícone (44) cabem.
- No celular, a ação principal de uma tela de preenchimento vai no rodapé (`BarraDeAcoes --unica`); nas telas de lista, o + do cabeçalho cria.
- O + é a única exceção à regra de um primário por tela: ele é do módulo, não da tela, e fica sempre no mesmo lugar.

**Não faça**
- Outro desenho de menu (hambúrguer de três traços iguais, “Menu” escrito, pontinhos).
- Status do módulo dentro da folha: ele fica visível na faixa.
