# PainelLateral

Onde abre toda tarefa com **mais de dois campos**: registrar interação, mensagem pronta do WhatsApp, cadastrar empresa ou usuário, o relatório de um número clicado. No computador ele entra pela direita e a lista fica parada atrás; no celular vira a **folha que sobe do rodapé**, com uma alça no topo. O que é curto (até dois campos) abre dentro do próprio card (`CardDeItem`); a janela no meio da tela (`Dialogo`) fica só para confirmar o irreversível.

**Estrutura:** `<aside class="mb-lateral" id="…" role="dialog" aria-modal="true" aria-labelledby="…">` seguido do véu `<div class="mb-lateral__veu"></div>`:
- `.mb-lateral__alca` (só aparece no celular);
- `.mb-lateral__topo`: `.mb-lateral__titulo` (o verbo da tarefa: “Registrar interação”), `.mb-lateral__descricao` (sobre o quê: “Ana Exemplo · Em contato”) e o botão Fechar (ícone X, `aria-label="Fechar"`, `data-mb-fechar`);
- `.mb-lateral__corpo`: os campos, rolando por dentro;
- `.mb-lateral__rodape`: “Cancelar” (`--discreto`) e a ação final (`--primario`). No celular os botões ocupam a largura.

**Larguras:** `painel-largura` (440px) para tarefas; `--larga` com `painel-largura-larga` (880px) para o relatório de um número (busca, resumo, tabela e Exportar). No celular, até 92% da altura da tela.

**Comportamento:** `MB.painel.ligar(botao)` (botão com `aria-controls` = id do painel). Abre em `mov-entrada`, leva o foco ao primeiro campo, prende o Tab dentro dele, fecha com `Esc`, com o véu, com o X ou com “Cancelar”, e devolve o foco a quem abriu. Abrir outro painel fecha o anterior. Camada `camada-painel`.

**O consumidor fornece:** o título da tarefa, a descrição do registro, os campos e a ação final; o rascunho guardado no aparelho enquanto o painel está aberto.

**Faça**
- Título com verbo; o botão final repete o verbo (“Registrar”).
- Guardar o que foi digitado se a conexão cair, e dizer isso no erro.

**Não faça**
- Painel dentro de painel. Se a tarefa tem etapas, use `Etapas` dentro do mesmo painel.
- Usar para confirmar ação destrutiva: isso é `Dialogo`.
- Abrir o painel sem um botão que o controle (o foco precisa voltar para algum lugar).
