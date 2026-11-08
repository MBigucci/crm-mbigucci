# AssistenteEmPassos

Um cadastro longo dividido em passos, quando cada passo depende do anterior: novo empreendimento, nova restauração no Repasse, configurar a distribuição de leads. É o `ModoFoco` com `Etapas` no topo e a `BarraDeAcoes` embaixo. Um formulário que cabe numa tela continua sendo `FormularioDenso` — passo só existe quando divide uma decisão.

**Estrutura** (`.mb-assistente`, até 720px, centralizado)
- `.mb-foco__barra`: o que está sendo feito (“Novo empreendimento”), `.mb-salvo` “✓ Rascunho salvo às 10:42” e **Sair e continuar depois** (o rascunho fica na lista com o selo Rascunho).
- `Etapas` com os nomes dos passos (3 a 5; o último é sempre **Revisar**). No celular, troca por `.mb-assistente__passo` (“Passo 2 de 4 · Torres e unidades”) e a barra fina `.mb-assistente__trilho`.
- O passo atual num `Cartao`: título, uma frase dizendo para que serve, os campos (`.mb-form-grade`, campos calculados em `--calculado`).
- `BarraDeAcoes`: à esquerda “Passo 2 de 4” e “Próximo: Tabela de preços”; à direita **Voltar** (discreto) e **Continuar** (primário). No último passo, o verbo do resultado: “Criar empreendimento”, “Enviar para aprovação”.

**Revisar:** `.mb-revisao` com uma `.mb-revisao__secao` por passo — título, `.mb-pares` com o que foi preenchido e **Editar**, que volta para aquele passo e, ao continuar, retorna direto para Revisar.

**Comportamento**
- Continuar valida **só o passo atual**; o erro aparece no campo, como em todo formulário.
- As etapas concluídas são clicáveis; as futuras, não.
- Rascunho a cada passo concluído e a cada 30 s; fechar a aba não perde nada.
- O passo fica no endereço (`?passo=2`), para o Voltar do navegador voltar um passo.

**Não faça**
- Passo com um campo só.
- Esconder quantos passos faltam.
- “Próximo” e “Anterior”: os botões são Continuar e Voltar.
