# BarraSuperior

O topo limpo de cada tela no computador, ao lado do `MenuLateral`: onde estou, a busca, o status do módulo, o **+ Novo** do módulo, as notificações e a conta — sem cor, sem banner, sem logotipo repetido.

**Estrutura:** `<header class="mb-topo">` (altura `topo-altura`, fundo `fundo`, uma linha `linha` embaixo; fica fixo ao rolar, camada `camada-topo`) com:
- `.mb-topo__titulo` (nome da tela) e `.mb-topo__separador`;
- a busca `.mb-busca` (campo de `controle-p`, ícone e a tecla `/`);
- `.mb-topo__acoes` à direita, nesta ordem: **status do módulo** (quando houver), **+ Novo** do módulo, notificações e **a conta, na ponta direita** (`MenuDaConta`: avatar, primeiro nome e a seta; o popup abre embaixo com o nome completo, o perfil, Minha conta e Sair). É o único lugar da conta no computador; o menu lateral não repete.

**Status do módulo (`.mb-status`):** uma pílula com a cor do estado, sinal e palavra (todo chip tem cor, decisão do Felipe, 06/11/2026):

| Estado | Classe | Exemplo |
|---|---|---|
| Pode receber, tudo certo | `--ok` (`sucesso-fundo`, `sucesso-texto`) | “✓ Recebendo · 3º na fila”, “✓ Na vez do stand” |
| Precisa de ação | `--atencao` (`alerta-fundo`, `alerta-texto`) | “! Faça check-in”, “! Fora do stand”, “! Sem sinal” |
| Em andamento fora da fila | `--info` (`info-fundo`, `info-texto`) | “→ Em visita” |
| Parado | padrão (`areia`, `texto-suave`) | “– Pausa até 12/11”, “– Fora do horário”, “– Fora da distribuição” |
| Desligado pela pessoa, à espera de ação | `--atencao` | “! Receber leads” — o status vira o próprio botão de ligar (decisão do Felipe, 07/11/2026: âmbar com “!”, nunca um botão vermelho) |

Clicar abre o painel do status (`PainelLateral` ou popup) ou, quando ele é a ação (“! Receber leads”), faz a ação, com `Toast` e Desfazer. Ao lado, “Ver fila” (`--discreto --p`) leva à tela do status; a posição na fila vai no detalhe do próprio status (“· 3º na fila”). No celular, o mesmo status vai para a faixa abaixo do cabeçalho (`MenuCelular`). O sinal e a palavra dizem o estado também para quem não distingue as cores.

**+ Novo do módulo:** um botão `--primario --p`, **sempre na cor de destaque** (`acao`; vermelho com `data-acao="marca"`), com “+” e o objeto (decisão do Felipe, 06/11/2026): Vendas “+ Novo lead”, Repasse “+ Novo contrato”, Marketing “+ Nova regra”. Só o módulo atual, uma criação só. No celular vira o + do cabeçalho. É a única exceção à regra de um primário por tela: ele é do módulo e fica sempre no mesmo lugar; a ação principal da tela continua sendo a da tela.

**O ponto de notificação** é um dos poucos lugares onde `marca` aparece: 6px, só quando há algo novo, com o número no `aria-label`. O sino abre o popup de `Notificacoes`.

**O consumidor fornece:** o nome da tela, a busca, o status e o que ele abre, o que o + cria e o usuário.

**Faça**
- Manter o topo da mesma cor do fundo: os cartões brancos é que se destacam.
- Status curto: sinal, uma palavra e, se precisar, um detalhe (“· 3º na fila”).

**Não faça**
- Atalhos externos no topo: eles ficam no grupo Atalhos do menu.
- Status piscando, ou só com cor, sem sinal e palavra.
- Mais de um + Novo.
