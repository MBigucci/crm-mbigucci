# MenuDaConta

**A conta tem um lugar só** (decisão do Felipe, 06/11/2026): no computador, na ponta direita da `BarraSuperior`; no celular, no fim da folha do `MenuCelular` (que abre pelo ícone de menu, também em cima à direita). O menu lateral não repete a conta.

**Botão:** `.mb-ancora` (posição relativa) com `button.mb-conta.mb-conta--topo` (`aria-controls`, `aria-haspopup="menu"`): avatar `.mb-avatar--p` com as iniciais, o primeiro nome e a seta para baixo `.mb-conta__seta` (gira ao abrir).

**Popup:** `.mb-popup.mb-popup--abaixo` (`role="menu"`, começa com `hidden`), alinhado à direita do botão:
- `.mb-popup__conta`: o nome completo (`strong`) e o perfil com a equipe (“Corretora · Equipe Rudge Ramos”);
- `.mb-popup__divisor`;
- **Minha conta** (dados, WhatsApp, `Aparencia`, avisos neste aparelho, senha e instalar o app);
- `.mb-popup__divisor` e **Sair**, por último.

Itens `.mb-popup__item` (`role="menuitem"`, 40px; 44px no celular). `superficie`, borda `linha`, `raio-md`, `sombra-flutuante`; entra subindo 6px em `mov-base`.

**Comportamento:** `MB.popup.ligar(botao)` abre e fecha, põe o foco no primeiro item, fecha com `Esc` (o foco volta ao botão) e com clique fora.

**Dica:** `<span class="mb-dica-alvo">` com o controle e um `<span class="mb-dica" role="tooltip" id="…">` ligado por `aria-describedby`. Perto da borda direita da tela, `.mb-dica--fim` alinha a dica pela direita do controle (e `--inicio` pela esquerda), para ela não sair da tela nem criar rolagem lateral. Aparece no hover e no foco, em `mov-base`; fundo `texto`, letra `superficie`, 12px, até 240px. Só para explicar o que o controle faz ou por que está desativado.

**O consumidor fornece:** as iniciais, o primeiro nome, o nome completo, o perfil e a equipe, e os links da conta.

**Faça**
- No máximo cinco itens no popup; “Sair” por último, depois de um divisor.
- Notificações ficam no sino, ao lado, e não no popup da conta.

**Não faça**
- A conta em dois lugares (topo e rodapé do menu).
- Aparência dentro do popup: ela fica em Minha conta.
- Formulários dentro do popup.
