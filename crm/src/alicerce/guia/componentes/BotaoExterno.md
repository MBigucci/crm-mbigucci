# BotaoExterno

Ações que saem do sistema para falar com o cliente: WhatsApp (verde, em todos os módulos) e Ligar.

**WhatsApp:** `.mb-botao.mb-botao--whatsapp`, sempre com o rótulo “WhatsApp →” (ou o verbo + “no WhatsApp”: “Confirmar no WhatsApp”). Fundo `whatsapp` (#1f7a45 no papel, #68ce92 no grafite), texto `sobre-whatsapp` (branco a 5,35:1; grafite a 9,17:1 no tema escuro), hover `whatsapp-hover`, `sombra-botao`. O CSS desenha antes do rótulo um ícone de conversa na cor do texto — um balão genérico, não o logotipo do aplicativo. Use um `<a href="https://wa.me/55…">` com `target="_blank" rel="noopener"`. Quando o toque abre antes a mensagem pronta (escolher o texto e só então ir ao WhatsApp, como no Vendas), use `<button type="button">` com a mesma classe e o mesmo rótulo; a seta continua, porque o destino é o WhatsApp.

**Ligar:** `.mb-botao--secundario` num `<a href="tel:+55…">`, rótulo “Ligar”. Sem cor própria.

**Por que verde (decisão do Felipe, 06/11/2026):** é uma ação importante em todos os módulos, principalmente no Vendas, e o corretor reconhece o WhatsApp pela cor. É uma **exceção do produto** à regra “cada cor já significa algo” (no resto do Alicerce, verde é sucesso) — por isso o rótulo diz sempre “WhatsApp”, e o verde nunca aparece em outro botão. Ao lado de um primário vermelho, é a palavra que separa os dois para quem tem daltonismo vermelho-verde.

**O consumidor fornece:** o número do cliente já no formato internacional e, se houver, a mensagem inicial (`?text=`). Registre o toque como interação (“Toque registrado”) para a ficha mostrar “Abriu o WhatsApp hoje, 9h”.

**Faça**
- No card, WhatsApp e a outra ação com a mesma largura (`.mb-lead__acoes`).
- `.mb-botao--bloco` para ocupar a largura inteira (ficha, visita).
- A seta “→” diz que o botão sai do sistema.

**Não faça**
- Verde em botão que não abre o WhatsApp, ou o ícone sozinho no lugar do rótulo.
- WhatsApp como `--primario`: na tela há uma ação principal só.
