# Dialogo

Interrompe o fluxo só quando é preciso confirmar algo irreversível ou decidir antes de seguir.

**Estrutura:** `.mb-veu` (camada fixa em `veu`) contendo `.mb-dialogo` (`role="dialog"`, `aria-modal="true"`, `raio-lg`, `sombra-flutuante`, até 480px) com `.mb-dialogo__titulo`, `.mb-dialogo__texto` e `.mb-dialogo__acoes`.

**O consumidor fornece:** título como pergunta com o objeto (“Cancelar a proposta P-2611-013?”), texto com a consequência concreta, e dois botões cujos rótulos repetem o verbo (“Manter proposta” / “Cancelar proposta”). O foco vai para o botão seguro ao abrir, `Esc` fecha, e o foco volta ao botão que abriu.

**Faça**
- Use `--perigo` na ação destrutiva e `--secundario` na segura. Para quem usa o botão principal vermelho, o `--perigo` fica grafite: o título e o verbo do botão dizem o que acontece.
- Diga o que acontece com outras pessoas e registros (corretor avisado, unidade liberada).

**Não faça**
- Diálogo para avisos informativos — use `Aviso` na página.
- “Tem certeza?” com “Sim / Não”.
- Formulários longos em diálogo: abra uma tela, de preferência no modo foco.
