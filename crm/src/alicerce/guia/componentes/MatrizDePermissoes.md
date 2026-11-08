# MatrizDePermissoes

O que cada perfil pode fazer, numa tabela só: perfis nas colunas, ações nas linhas. A mesma peça no Vendas, no Repasse e no Marketing (os dois primeiros têm hoje telas próprias de perfil × ação). Quem edita é só o Administrador.

**Estrutura** (`TabelaCompleta` com `.mb-matriz`, `--primeira-fixa`)
- Cabeçalho: cada perfil com quantas pessoas tem (“Corretor · 42 pessoas”), para medir o efeito antes de mudar.
- Linhas agrupadas (`.mb-matriz__grupo`: Leads, Propostas, Configuração); cada ação com uma linha de explicação (“Planilha com telefone e e-mail.”).
- Célula: **Marcador** (pode ou não pode) ou **nível** num select pequeno quando a resposta não é sim ou não — ver leads (Próprios · Da equipe · Todos os leads), aprovar desconto (Não · Até 2% · Até 5% · Sem limite).
- O que não se muda aparece escrito, sem controle: o Administrador “Sempre”.
- Célula alterada e ainda não salva: `.mb-matriz__mudou` (fundo `areia` e contorno em tinta).

**Perfis de verdade:** as colunas são os perfis que o módulo tem — no Vendas, os comerciais e os operacionais; no Repasse, os departamentos, cada um com o que pode **ver** além do que pode fazer. Com mais de seis perfis, a tabela rola de lado com a primeira coluna fixa, e um `Seletor` no topo filtra por módulo ou departamento. O exemplo mostra cinco só para caber.

**Salvar:** as mudanças se acumulam e a barra flutuante (`.mb-lote`) mostra “2 alterações não salvas · Descartar · Salvar permissões…”. Salvar abre o `Dialogo` com o efeito escrito (“42 corretores deixam de exportar leads. Vale a partir do próximo acesso de cada um.”), porque mexe no trabalho de muita gente. Tudo vai para o histórico, com quem mudou.

**Celular:** um perfil por vez (`Seletor --p` com os perfis) e a lista de ações com `Interruptor` ou o select do nível.

**Não faça**
- Uma tela de permissão por pessoa: a pessoa recebe o perfil; exceção individual, se existir, aparece na pessoa e na matriz como nota.
- Salvar cada clique na hora.
