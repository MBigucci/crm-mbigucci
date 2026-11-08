# Compartilhar

Passar um registro (lead, contrato, empreendimento, relatório) para outra pessoa. Fica no cabeçalho do registro aberto (ficha do lead, contrato, empreendimento) e no relatório — nunca no card da lista, que só leva as ações rápidas.

**Comportamento (`MB.compartilhar`):**
- No celular, `MB.compartilhar.abrir({ titulo, texto, url }, botao)` abre a folha de compartilhar do próprio aparelho (WhatsApp, e-mail, AirDrop…).
- No computador, ou se o aparelho não tiver essa folha, abre o popup de reserva (`.mb-popup`) com **Copiar link** e **Enviar no WhatsApp →**.
- `MB.compartilhar.copiarLink(url)` copia e confirma com o `Toast` de sucesso (“Link copiado.”); se o navegador não deixar, mostra o toast de erro com o próximo passo.
- `MB.compartilhar.linkWhatsapp(texto, numero?)` monta o `wa.me` com o texto pronto; sem número, a pessoa escolhe o contato.

**O que vai no link:** só o endereço do registro. Quem recebe precisa entrar no Base360 e ter permissão para ver; o link não abre dados para quem não tem acesso.

**O consumidor fornece:** o título (“Ficha de Ana Exemplo”), o texto curto e a URL do registro.

**Faça**
- Use o título do registro no topo do popup, para a pessoa saber o que está mandando.
- Envie pelo WhatsApp com o texto em português, curto, sem dados do cliente além do nome.

**Não faça**
- Colocar CPF, telefone ou valores no texto compartilhado.
- Criar link público que abra o registro sem login.
