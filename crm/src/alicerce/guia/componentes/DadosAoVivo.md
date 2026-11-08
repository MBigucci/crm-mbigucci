# DadosAoVivo

Todo painel que se atualiza sozinho (a recepção a cada 15 s, as filas a cada minuto, o Dashboard a cada 5 min) diz **quando foi a última atualização** e deixa atualizar na hora.

**Estrutura:** `.mb-ao-vivo` com `.mb-ao-vivo__ponto` (8px), `.mb-ao-vivo__estado` (“Conectado”, “Atualizando”, “Sem conexão”), o texto com `.mb-ao-vivo__hora` (“Atualizado às 20:19 · a cada 5 min”) e o botão “Atualizar agora” (`--discreto --p`; `aria-busy` enquanto busca).

**Estados:** conectado (ponto `sucesso`); `--sem-conexao` (ponto `alerta`, “Sem conexão · os números são das 20:19”); `--parado` (ponto `texto-sutil`, quando a atualização automática está pausada). O ponto nunca está sozinho: a palavra diz o estado.

**Comportamento:** `MB.aoVivo.marcar(elemento, quando)` escreve a hora depois de cada busca; `MB.aoVivo.ligar(elemento)` troca o estado quando a conexão cai e volta. Lugar: logo abaixo do título da tela, à direita no computador.

**Faça**
- Mostrar a hora, não “há 3 minutos” (não precisa ficar mudando).
- Atualizar sem mexer na rolagem nem no que a pessoa está lendo.

**Não faça**
- Pontinho piscando ou pulsando.
- Atualizar a página inteira sozinho (perde o que está sendo digitado).
