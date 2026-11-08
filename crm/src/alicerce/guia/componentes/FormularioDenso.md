# FormularioDenso

Formulários de trabalho com muitos campos (contrato no Repasse, empreendimento e venda no Vendas): três colunas no computador, seções com sobrelinha, campos tipados, calculados e bloqueados, e o salvo automático.

**Estrutura:** um `Cartao` com o título do registro e, à direita do cabeçalho, o `.mb-salvo` (“✓ Salvo às 15:08”, “Salvando…”, “! Não foi salvo”). No corpo, `.mb-form-secao` (sobrelinha `.mb-form-secao__titulo` + `.mb-form-grade.mb-form-grade--3`). Três colunas a partir de 1024px, duas entre 640 e 1023, uma no celular. No rodapé, a ação final.

**Campos tipados** (`MB.mascara.ligar(campo)` com `data-mb-mascara`): `cpf` (123.456.789-00), `cnpj` (12.345.678/0001-90), `telefone` ((11) 98765-4321, celular ou fixo), `cep` (09750-000), `moeda` (450.000,00, com o `R$` no afixo à esquerda) e `porcentagem` (28,5, com o `%` no afixo à direita). O teclado do celular já abre numérico. O valor limpo vai em `data-mb-valor`.

**Calculado:** `.mb-campo--calculado`, somente leitura, plano, com “=” no afixo e “calculado” no rótulo. Ninguém digita; o valor muda sozinho quando as entradas mudam.

**Bloqueado pelo perfil:** `.mb-campo--bloqueado`, somente leitura com o cadeado no afixo, “· só leitura” no rótulo e **o motivo** na ajuda (“Só a administração de vendas altera.”). Nunca esconder o campo de quem só pode ler.

**Erros:** no campo, com o fato e o próximo passo (“! A assinatura não pode ser antes da proposta (03/11/2026).”). Ao enviar com erro, o foco vai ao primeiro campo errado.

**Salvo automático e rascunho:** formulários longos salvam sozinhos a cada mudança e dizem a hora; sem conexão, guardam no aparelho e dizem isso (“O texto ficou guardado neste aparelho.”). Rodapé fixo (`BarraDeAcoes`) no celular.

**Faça**
- Campos na ordem em que a pessoa tem a informação na mão (documento, depois valores).
- Rótulo em cima, curto; ajuda embaixo só quando evita erro.

**Não faça**
- Placeholder no lugar do rótulo.
- Desabilitar o botão final sem dizer o que falta.
