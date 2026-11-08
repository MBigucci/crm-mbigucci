# AvisoConexao

Diz que o aparelho está sem internet e o que acontece com o que a pessoa fizer. **O texto tem de ser verdade para o módulo:** só diga que as mudanças ficam no aparelho se o módulo tiver fila sem conexão.

**Estrutura:** `<div class="mb-conexao" role="status" hidden>` com um ícone `.mb-icone` (wifi cortado, em `alerta`), `<span class="mb-conexao__texto">` (“Sem conexão”) e `.mb-conexao__detalhe` (“as mudanças ficam no aparelho e sobem quando a internet voltar”). Fica fixo, centralizado, **logo abaixo do topo** (no celular, abaixo da faixa de status), por cima do conteúdo, em pílula (`raio-total`): nunca cobre o +, o status nem a conta. Numa tela sem topo (conta desativada, Entrar) fica no alto. A largura é a do texto (`max-content`) até a tela menos 16px de cada lado; só quebra linha se não couber.

**Textos, conforme o módulo:**

| O módulo | Sem conexão | Ao voltar |
|---|---|---|
| Guarda as mudanças e envia depois | “Sem conexão · as mudanças ficam no aparelho e sobem quando a internet voltar” | “Conexão de volta. As mudanças foram enviadas.” |
| Não guarda (o Vendas hoje) | “Sem conexão · nada é gravado sem internet” | “Conexão de volta.” |

No segundo caso, os botões que gravam continuam ativos e, se a pessoa tentar, o erro diz “Sem internet: não foi gravado. Tente de novo quando a conexão voltar.” perto do botão — o que ela digitou fica no campo.

**Vidro:** fundo `vidro` (superficie a 82%) com desfoque de `vidro-desfoque` (12px) e `sombra-flutuante`: o conteúdo continua aparecendo por trás, apagado. Texto em `texto` — fica acima de 10:1 qualquer que seja o fundo.

**Comportamento:** `MB.conexao.ligar(elemento)` mostra o aviso quando o navegador perde a rede e, ao voltar, troca para `.mb-conexao--voltou` (ícone em `sucesso`, “Conexão de volta. As mudanças foram enviadas.”), que some depois de 4 segundos. Aparece com fade em `mov-base`.

**O consumidor fornece:** o texto do que fica salvo (“3 interações aguardando envio”) quando souber a contagem.

**Faça**
- Mantenha o aviso enquanto durar a falta de conexão: ele não fecha sozinho nem com clique.
- Deixe o corretor continuar trabalhando; desative só o que precisa de internet (enviar documento) e diga por quê perto do botão.

**Não faça**
- Bloquear a tela com `Dialogo` ou véu.
- Usar o aviso para erro de servidor: isso é `Aviso` na página, com o próximo passo.
