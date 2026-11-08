# Esteira

A mesma esteira de `Etapas`, em miniatura: cinco segmentos e o nome da etapa atual, numa só linha de 16px — feita para a coluna “Etapa” de tabelas de monitoramento de propostas. A etapa do lead não usa esteira: é `Selo`.

**Estrutura:** `<span class="mb-esteira" role="img" aria-label="Etapa 3 de 5: Aprovação comercial">` com `.mb-esteira__trilho` (um `<i class="mb-esteira__seg">` por etapa), `.mb-esteira__rotulo` (nome da etapa atual) e `.mb-esteira__passo` (“3/5”).

**Segmentos:** `--feito` em `texto` (tinta), `--atual` em `info` e um pouco mais largo, aguardando em `trilho` (= `linha-forte`, 3:1 sobre a superfície; numa linha selecionada vira `texto-sutil`), `--bloqueado` em `erro`. Com `--bloqueada` no contêiner, o rótulo fica em `erro-texto`. As cores seguem as de `Etapas`: tinta = concluído, azul = em andamento — e não mudam com o modificador de marca.

**O consumidor fornece:** o número de etapas (5 na venda padrão), qual é a atual e o `aria-label` completo — o leitor de tela ouve “Etapa 3 de 5: Aprovação comercial”.

**Faça**
- Sempre com o rótulo e o passo: os segmentos sozinhos não dizem qual etapa é.
- Use os mesmos nomes de etapa de `Etapas`.
- Coloque a coluna da esteira antes do valor e do status.

**Não faça**
- Esteira como barra de porcentagem de pagamento ou de obra — ela é só a sequência do processo.
- Mais de 6 segmentos.

**Etapa que ainda não existe não aparece.** Um estágio previsto mas sem funcionar (“em breve”) fica fora da peça até existir; não há estado apagado para isso. Quando o estágio passar a valer, ele entra na lista.
