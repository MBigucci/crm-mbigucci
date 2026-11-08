# Marcador

Checkbox e radio com caixa de 18px, preenchidos em `texto` (tinta) quando marcados — seleção não muda com o modificador de marca.

**Estrutura:** `<label class="mb-marcador"><input type="checkbox"> Texto</label>`; troque por `type="radio"` (com o mesmo `name`) para escolha única. Uma explicação curta vai em `.mb-marcador__detalhe` dentro do texto.

**Celular:** abaixo de 768px o rótulo inteiro vira um alvo de 44px de altura (`controle-toque`); a caixa continua com 18px.

**O consumidor fornece:** um `<fieldset>` com `<legend class="mb-campo__rotulo">` agrupando as opções, os `name`/`value` e o estado.

**Faça**
- Radio quando as opções se excluem (forma de pagamento); checkbox para itens independentes (documentos recebidos).
- Opções em lista vertical, na ordem em que o processo acontece.

**Não faça**
- Um checkbox para confirmar ação destrutiva — use `Dialogo`.
- Mais de 7 opções de radio: use um `select` em `Campo`.
