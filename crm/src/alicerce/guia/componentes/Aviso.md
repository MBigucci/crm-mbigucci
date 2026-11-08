# Aviso

Mensagem dentro da página, no ponto onde ela importa — sem pop-up, sem sumir sozinha.

**Classes:** `.mb-aviso` (informativo) + `--sucesso`, `--alerta` ou `--erro`. Dentro: um `<svg class="mb-icone">` do tom, e `.mb-aviso__conteudo` com `.mb-aviso__titulo` (o fato, em poucas palavras) e `.mb-aviso__texto` (o que muda ou o que fazer).

**O consumidor fornece:** título e texto, o ícone do tom (info: círculo com “i”; sucesso: círculo com check; alerta: triângulo; erro: círculo com X), e `role="alert"` só para erros que bloqueiam; os demais usam `role="status"`.

**Faça**
- Título como fato (“Desconto acima da alçada”), texto como próximo passo (“exige aprovação do gerente comercial”).
- Coloque o aviso acima do bloco que ele afeta: o atraso do lead no topo da ficha, o lembrete “Você abriu o WhatsApp, conte como foi” no topo de “Registrar interação”.
- Use em todos os módulos, inclusive no Vendas: dica, atraso ou bloqueio que hoje seria uma linha de texto solta vira `Aviso`.
- Remova o aviso quando a condição deixar de existir.

**Não faça**
- Empilhar mais de dois avisos: se há tantos, a tela tem um problema de fluxo.
- Toasts que desaparecem para erros — o funcionário pode estar olhando para outro campo. Erro que não bloqueia, confirmação e Desfazer usam o `Toast` (a mesma família visual, flutuando); o de erro fica até a pessoa fechar. Falta de internet é `AvisoConexao`.
- Borda colorida à esquerda; o tom vem do fundo e do ícone.
