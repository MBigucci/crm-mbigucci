# BuscaComSugestoes

Escolher um registro digitando: o empreendimento no cadastro do lead, o cliente na agenda, a pessoa na recepção, o banco e o cartório no Repasse. Substitui o `datalist` e as listas próprias de cada tela.

**Estrutura:** `.mb-campo.mb-sugestoes-alvo` com o `input[role=combobox]` (`aria-autocomplete="list"`, `aria-controls`, `aria-expanded`, `aria-activedescendant`) e a `ul.mb-sugestoes[role=listbox]` de `.mb-sugestoes__opcao[role=option]` — o nome com o trecho encontrado em `<mark>` (negrito, sem cor) e uma linha `small` que separa homônimos (“Lançamento · Santo André”). Sem resultado: `.mb-sugestoes__vazio` (“Nenhum empreendimento com ‘xyz’.”).

**Cadastrar o que não existe:** quando a regra deixa, a última opção é `.mb-sugestoes__opcao--criar` (“Cadastrar ‘marco’”). Antes de criar, o sistema procura **nome parecido** e mostra o `Duplicado`.

**Comportamento:** `MB.sugestoes.ligar(campo)` — setas escolhem, Enter confirma, `Esc` fecha, toque escolhe; dispara `mb-sugestao` com `detail.valor` e `detail.criar`. O sistema busca sem acento, em qualquer parte do nome e pelo telefone em qualquer formato; mostra no máximo 8 e “Refine a busca” quando há mais.

**Faça**
- Abrir as sugestões a partir da primeira letra; mostrar as recentes com o campo vazio.

**Não faça**
- Aceitar texto livre que não é nenhuma opção sem dizer (“Não está no catálogo”).
