# Envio

Envio de documentos do lead e da proposta (RG, comprovante de renda, holerite): uma área para arrastar ou escolher arquivos e a lista do que já foi enviado.

**Estrutura:** `<label class="mb-envio">` com um ícone, `.mb-envio__titulo` (“Arraste os documentos ou <u>escolha no aparelho</u>”), `.mb-envio__ajuda` (“PDF, JPG ou PNG · até 10 MB cada”) e o `<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png">`, que cobre a área inteira (no celular, abre a câmera e os arquivos). Embaixo, `.mb-envio__lista` com um `.mb-envio__item` por arquivo: ícone, `.mb-envio__nome` (nome com reticências + `.mb-envio__estado`: “248 KB · enviado às 15:08”, “Enviando… 62%”) e “Remover” (`--discreto --p`). Enviando, o item mostra `.mb-envio__progresso` (trilho e preenchimento em `texto`).

**Aparência:** fundo `campo`, borda tracejada `linha-forte`, `raio-md`. Ao arrastar por cima (`MB.envio.ligar(rotulo)` põe `.mb-envio--arrastando`) e no hover, `areia-suave`. O foco do teclado acende a borda e o halo de `foco`, como nos campos.

**Erro:** `.mb-envio__item--erro` com borda `erro` e o motivo em `erro-texto` no estado (“Arquivo de 14 MB: o limite é 10 MB”), sempre com a palavra.

**O consumidor fornece:** tipos e tamanho aceitos (diga-os na ajuda), o envio de verdade com o progresso e a remoção. Sem conexão, guarde o arquivo e diga “Aguardando conexão” no estado (veja `AvisoConexao`).

**Faça**
- Nome do arquivo como o usuário salvou; o tipo de documento, se o sistema souber, no estado.

**Desativado** (sem permissão; ou sem conexão num módulo que não guarda o arquivo para depois, como o Vendas): `disabled` no `input` deixa a área apagada e sem hover, como os campos; diga o motivo logo abaixo (“Sem internet: anexe quando a conexão voltar.”).

**Não faça**
- Enviar sem mostrar o que foi enviado.
- Esconder o botão de escolher: arrastar não existe no celular.
