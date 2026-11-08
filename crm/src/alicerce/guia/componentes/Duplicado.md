# Duplicado

O aviso de que o que está sendo cadastrado talvez já exista: o mesmo WhatsApp no Vendas, nome parecido de empresa ou banco no Repasse, o mesmo número de contrato. Aparece no próprio formulário, logo acima da ação final, como `Aviso`. **A forma depende da regra de cada cadastro** (decisão do Felipe, 06/11/2026):

| Forma | Quando | Aviso | Botões |
|---|---|---|---|
| Pode seguir | o duplicado é possível e a pessoa vê o existente | `--alerta`, com o registro encontrado (nome, etapa, de quem, quando) | “Abrir o existente” e “Cadastrar assim mesmo” (`--discreto`) |
| Existe, mas você não vê | está na carteira de outra pessoa ou equipe | `--info`, sem dados do outro registro | nenhum; o texto diz o que fazer (“Confira com seu gerente.”) |
| Proibido | a regra não deixa repetir (número de contrato, CPF em contrato ativo) | `--erro`, explica a regra | “Abrir o existente”, quando a pessoa tem acesso |

**Regras:**
- O aviso aparece antes de gravar, quando o campo perde o foco ou ao tocar na ação final.
- “Cadastrar assim mesmo” grava e registra no histórico que o duplicado foi aceito.
- Nunca o “toque de novo no mesmo botão”: a decisão é um botão com o nome dela.

**Não faça**
- Mostrar nome ou telefone do registro de quem a pessoa não tem acesso.
