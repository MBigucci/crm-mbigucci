# ModoFoco

O padrão que mantém o funcionário na tarefa enquanto ele preenche uma proposta, um contrato ou uma tabela: tudo que não é a tarefa sai da frente.

**O que muda em `.mb-app--foco`:**
- O `MenuLateral` some; no lugar, a `.mb-foco__barra` (altura `topo-altura`) diz qual é a tarefa, em que etapa ela está, mostra o progresso e oferece “Sair do foco” com a tecla `Esc`.
- O conteúdo estreita para `leitura-max` (720px) e ganha respiro no topo — uma coluna, uma leitura.
- Cada bloco do formulário é uma `.mb-secao`; só a `.mb-secao--ativa` (ou a que tem o foco do teclado) fica com contraste total, as demais caem para 50% de opacidade.
- A `BarraDeAcoes` continua fixa embaixo com o total e o próximo passo.

**Como ligar:** `MB.modoFoco.entrar()` ao abrir um fluxo de preenchimento (nova proposta, novo contrato, correção de tabela); `MB.modoFoco.sair()` ao concluir. `Esc` já sai. `MB.modoFoco.ativarSecao(elemento)` marca a seção ativa — ligue no `focusin` de cada seção.

**O consumidor fornece:** o nome da tarefa e do registro (“Nova proposta · Mundi MBigucci, unidade 1203”), a etapa atual em palavras, o progresso real e as seções.

**Faça**
- Entre no modo foco automaticamente nos fluxos de criação; deixe o funcionário sair quando quiser.
- Seções concluídas mostram um `Selo` “Completo”; as futuras, “A fazer”.
- Segure notificações e contadores enquanto o foco estiver ativo.

**Não faça**
- Esconder a saída: o botão e o `Esc` estão sempre disponíveis.
- Esmaecer campos com erro — uma seção com erro volta a ficar ativa.
- Usar em telas de consulta ou painéis.
