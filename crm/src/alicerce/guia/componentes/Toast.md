# Toast

O `Aviso` que flutua: embaixo, no centro, **um por vez**. Mesma família visual do Aviso (fundo do tom, ícone do tom, texto em tinta), para a pessoa reconhecer na hora que é uma mensagem do sistema. Substitui o antigo ToastDesfazer escuro.

**Os quatro usos, e só eles** (decisão do Felipe, 06/11/2026):

| Uso | Tom | Some sozinho? | Exemplo |
|---|---|---|---|
| Desfazer uma ação que volta atrás | o do resultado (em geral `--sucesso`) + botão “Desfazer” | sim, em 8 s | “Etapa: Proposta · Desfazer” |
| Confirmar o que deu certo | `--sucesso` | sim, em 8 s | “Interação registrada.” |
| Erro que não bloqueia | `--erro` | **não**: fica até fechar | “Não foi salvo: sem conexão. O texto ficou guardado neste aparelho…” |
| Informação do sistema | padrão (`info`) | sim, em 8 s | “Há uma versão nova do Base360.” + “Atualizar” |

Erro que impede o trabalho continuar não é toast: é `Aviso` na página, no ponto em que importa. Pergunta de confirmação também não: é `Dialogo` (o irreversível) ou o próprio Desfazer.

**Como usar:** `MB.toast.mostrar(texto, { tipo: 'sucesso' | 'erro' | 'alerta' | 'info', aoDesfazer: fn, acao: 'Desfazer' })`. O tempo pausa com o ponteiro ou o foco em cima; todo toast tem o X para fechar; um novo substitui o anterior. O de erro é `role="alert"`; os outros, `role="status"`. No celular ele sobe acima do rodapé de ação. Camada `camada-aviso`.

**Texto:** o fato, curto, no passado ou no presente (“Interação registrada.”, “Etapa: Proposta”), sem “com sucesso”. No erro, o fato e o próximo passo, com as palavras do Vocabulário.

**Faça**
- Desfazer para o que volta sem perda (etapa, descarte, cancelar visita, baixa).
- Avisar a versão nova pelo toast de informação com “Atualizar”, sem recarregar a página sozinho.

**Não faça**
- Dois toasts ao mesmo tempo.
- Erro que some sozinho.
- Toast com texto técnico (“schema”, “Supabase”, códigos).
