# ModoTelao

O painel (Dashboard, ranking, metas) numa TV da sala de vendas ou do plantão: lido de longe, sem ninguém tocando. Entra pelo botão **Modo telão** no cabeçalho do painel e fica no endereço (`?telao=1`), para a TV abrir direto nele. É a **única exceção** à regra “nada se move sozinho” (decisão do Felipe, 06/11/2026): as abas trocam sozinhas, e isso fica sempre visível e com Pausar.

**Estrutura** (`.mb-telao`, a tela inteira, sem menu nem topo do sistema)
- **Topo:** o lockup, o título do que está na tela (“Vendas · novembro de 2026”) e os controles: `DadosAoVivo` com a hora da última atualização (“Ao vivo · atualizado às 15:08”; sem conexão, o ponto fica âmbar e a hora para — a TV nunca mostra número velho como se fosse novo), **Pausar**, **Tela cheia** e “Sair do telão”.
- **Abas em rodízio** (`.mb-telao__aba`, 20px): embaixo da aba atual, a barra do tempo (`.mb-telao__tempo`) enche em 60 s; pausado, ela para onde está. Com movimento reduzido, a barra some e a troca continua, sem animação.
- **Corpo** com as mesmas peças do painel em escala de TV: `Indicador` com o número em 56px, `Ranking` com linhas de 72px e texto de 22px, `Meta`. Nenhum texto abaixo de 14px.

**Comportamento** (`MB.telao.ligar(raiz)`): `data-mb-intervalo` em segundos (padrão 60); tocar numa aba mostra ela e recomeça a contagem; Pausar alterna com Continuar; Tela cheia usa a do navegador; pede ao navegador para não apagar a tela enquanto o telão está aberto. Os dados atualizam sem recarregar e sem animar os números.

**Não faça**
- Valores de pessoas que não podem aparecer na sala (comissão, salário).
- Carrossel com transição deslizando.
- Rodízio fora do modo telão.
