# Aparencia

A seção “Aparência” da tela Minha conta: a pessoa escolhe tema, cor do menu, cor do botão principal e movimento, e a escolha vale para ela em todos os módulos.

**As quatro escolhas:**

| Linha | Opções | No `<html>` |
|---|---|---|
| Tema | Automático · Papel · Grafite | `data-theme="auto" \| "papel" \| "grafite"` — Automático segue o claro ou escuro do aparelho e acompanha quando ele muda; `data-theme` recebe sempre o resolvido (papel ou grafite) e `data-tema-escolha` guarda a escolha |
| Menu | Claro · Grafite | `data-menu="claro" \| "escuro"` (o fundo da barra lateral e da folha do celular; o item ativo é sempre o mesmo, com o quadradinho em `marca`) |
| Botão principal | Grafite · Vermelho | `data-acao="grafite" \| "marca"` (com vermelho, o `--perigo` passa ao grafite) |
| Movimento | Normal · Reduzido | `data-movimento="normal" \| "reduzido"` |

**Padrão do módulo, escolha da pessoa por cima** (decisão do Felipe, 06/11/2026): cada módulo escreve o seu padrão no `<html>` — o Repasse, por exemplo, `data-menu="escuro" data-acao="marca"`, como o pessoal já usa; o Vendas abre claro e grafite. Quem nunca escolheu vê o padrão do módulo; quem escolheu vê a sua escolha em todos os módulos. “Voltar ao padrão” esquece as escolhas.

**Estrutura:** um `Cartao` com título “Aparência” e a descrição “Vale para você, em todos os módulos do Base360.”; no corpo, `.mb-aparencia` com uma `.mb-aparencia__linha` por escolha — `.mb-aparencia__texto` (`__rotulo` + `__ajuda`, uma frase sobre o efeito) e um `Seletor` colado (`.mb-segmentado`) com `data-mb-preferencia="tema|menu|acao|movimento"` e botões com `value`; no rodapé, `.mb-aparencia__padrao` dizendo qual é o padrão do módulo e o botão discreto “Voltar ao padrão” (`data-mb-padrao`). No celular, cada linha empilha e o segmentado ocupa a largura inteira.

**Comportamento:** `MB.preferencias.ligar(cartao)` marca as opções atuais e aplica a escolha na hora (troca suave em `mov-base`). No carregamento de toda tela, chame `MB.preferencias.restaurar()` antes da primeira pintura (no lugar de `MB.tema.restaurar()` e `MB.movimento.restaurar()`). `MB.preferencias.aplicar(nome, valor)` e `.atual(nome)` servem a quem quiser outro controle.

**O consumidor fornece:** o padrão do módulo no `<html>`, a frase do rodapé com esse padrão e o salvamento no cadastro da pessoa: o `MB` guarda a escolha no aparelho e dispara `mb-preferencias` (`detail.nome`, `detail.valor`) no `document` — ouça o evento e salve na conta, e no login devolva as escolhas com `MB.preferencias.aplicar`, para valerem em outro aparelho e em módulos de outro endereço.

**Faça**
- Mantenha a seção na tela Minha conta, ao alcance pelo menu da conta (“Minha conta”) e pela folha do celular.
- Diga o efeito de cada escolha em uma frase curta, na ajuda.

**Não faça**
- Opções de cor livres (paleta, cor do menu à escolha): as escolhas são só estas quatro, todas medidas para contraste.
- Esconder a aparência num popup ou num diálogo.
