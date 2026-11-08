# EstadosDePagina

Quando a tela não tem o que mostrar por um motivo que não é “a lista está vazia” (isso é `EstadoVazio`): erro ao carregar, sem permissão, não encontrado, conta em análise ou desativada, nenhum módulo liberado, parte em construção, sem internet. **As mesmas palavras em todos os módulos.**

**Estrutura** (`.mb-estado`, centralizado na área de conteúdo, até 480px; o menu e o topo continuam na tela):
- `.mb-estado__icone` (56px, redondo) com o ícone do assunto — neutro em `areia`; `--erro` (erro de carga), `--alerta` (sem conexão) e `--info` (acesso em análise) mudam o tom;
- `.mb-estado__sobrelinha` com o nome do estado, o título (Bricolage 22px) dizendo **o fato**, o texto dizendo **o próximo passo**;
- **uma** ação em `.mb-estado__acoes` (no celular, de largura inteira) e, se precisar, `.mb-estado__detalhe`.

| Estado | Título | Ação |
|---|---|---|
| Erro de carga | “Não foi possível carregar os contratos” | **Tentar de novo** (primário) · “Copiar detalhes para o suporte” |
| Sem permissão | “Esta página é do perfil Gerência”; quando as permissões são configuráveis e não há um perfil fixo, “Esta página não está liberada para o seu perfil”, com o texto “Peça o acesso ao gerente geral.” | Voltar para o início do módulo |
| Não encontrado | “Este lead não está mais aqui” / “Esta página não existe ou mudou de endereço” | Buscar · Ir para o início |
| Acesso em análise | “Seu acesso está sendo liberado” | Sair |
| Acesso desativado | “Seu acesso ao Base360 foi desativado” | Sair |
| Sem módulos | “Nenhum módulo liberado para você ainda” | Sair |
| Em construção | o que chega e quando, e o que usar enquanto isso | o caminho que já existe |
| Sem conexão | “Sem internet para abrir esta tela” | Tentar de novo (e carrega sozinha quando volta) |

**Regras**
- Erro de carga **nunca** vira lista vazia nem “Carregando…” para sempre: o `Carregando` tem limite e depois mostra este estado.
- Nada técnico na tela: o código do erro, a URL e a hora vão para a área de transferência em “Copiar detalhes para o suporte”.
- Dentro de um cartão ou tabela que falhou sozinha, use `--compacto` dentro do próprio quadro; o resto da tela continua.
- Sem permissão diz **de qual perfil** é a página, para a pessoa saber o que pedir; se não houver perfil fixo, diz **a quem pedir**.
- **Sem sessão** (conta desativada, em análise, erro ao carregar a conta): não há menu nem topo, porque não há perfil. O estado fica no centro da tela, sobre o `fundo`, com o lockup do módulo em cima (o mesmo da tela de Entrar) e a única ação, Sair.

**Não faça**
- “Erro 500”, “Forbidden”, “Ops!”, “Algo deu errado”.
- Ilustração grande ou mascote.
