# VersaoNova

Quando sai uma versão nova do Base360 com a tela aberta, o sistema **avisa e espera**: nunca recarrega sozinho (o Repasse recarregava sem avisar, e quem estava no meio de um cadastro perdia o que digitou).

**Como aparece:** o `Toast` informativo, embaixo no centro, **fixo até a pessoa agir**: “Há uma versão nova do Base360.” com **Atualizar** e o ✕. Fechar só adia: o aviso volta na próxima vez que a pessoa abrir uma tela.

**Ao tocar em Atualizar**
1. O módulo recebe `mb-antes-de-atualizar` (cancelável) no `document` e salva os rascunhos.
2. Se há um formulário que não pode ser salvo como rascunho, o módulo cancela o evento e troca o aviso por um `Toast --alerta`: “Para atualizar, termine ou salve a proposta aberta.”
3. Senão, a página recarrega no mesmo endereço (filtros, aba e período ficam, porque estão na URL).

**Código:** `MB.versao.vigiar('/versao.json', versaoAtual)` procura a cada 5 minutos e quando a aba volta a ficar visível; `MB.versao.avisar()` mostra o aviso uma vez só.

**Não faça**
- Recarregar sozinho, nem “em 10 segundos”.
- Modal no meio da tela para isso.
- Mostrar o número da versão no aviso. Ele fica em Minha conta, no rodapé.
