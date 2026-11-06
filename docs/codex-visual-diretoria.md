# Brief · Quatro direções visuais para a diretoria (Base360 Vendas)

> Para uma sessão Claude (Sonnet, com o Opus como advisor) aberta pela sessão master do Base360 Vendas. Escrito em 06/11/2026.

## Leia antes
- `CLAUDE.md`, `docs/design-system.md` e `docs/estudo-design.md`. O estudo de design tem a tabela que compara o site, o CRM e o Base360 (Repasse): cores, raios, sombras, fontes, botões, campos e menu.
- `docs/codex-tema-crm-aprovado.md` e `docs/estudo-conforto-uso.md`: como o tema atual foi decidido e o que a revisão de conforto mudou hoje.
- **O Repasse (Base360 da Roberta), só leitura:**
  - `C:\Projects\base360-repo\src\styles.css`: tokens shadcn `:root` e `.dark`;
  - os componentes em `src/components/ui/`;
  - a tela de pendências e a lateral;
  - a versão em migração em `C:\Projects\Base360`.
  - **Nunca edite** nenhum dos dois.
- O logo Base360 em `docs/marca-base360/` e o pacote `marca/tokens/`.
- Memórias do Felipe: telas enxutas e recurso raro discreto.

## O que aconteceu (06/11/2026)
A diretoria **não aprovou o visual** do Base360 Vendas. Disseram que está **agressivo** e que o Base360 do Repasse é mais suave e mais moderno.
- O que citaram de cara: **cantos retos e sem sombra**.
- O resto foi o "feeling" geral do sistema.
- O Felipe acrescenta: a **falta de animações leves** também pesou.
- **Está aprovado só o funcionamento:** o layout e os fluxos (onde cada coisa fica e como cada tela funciona).
- **Está em aberto:** cores, fontes, raios, sombras, faixas e movimento.

## O que o Felipe pediu
Uma **página interativa** para mostrar à diretoria, com **4 direções** aplicadas às mesmas telas e aos mesmos dados fictícios:

| # | Direção | Ideia |
| --- | --- | --- |
| B | **MBigucci suavizada** (a preferida do Felipe) | A marca MBigucci com acabamento mais macio: cantos arredondados, sombra leve, vermelho menos vivo onde não é ação e sem o peso das faixas pretas |
| A | **Visual do Repasse** | O Vendas com a cara do Base360 da Roberta (shadcn): vinho `#A50013`, raios de 6 a 12px, sombra, fonte do sistema e lateral escura quente |
| M | **Repasse + MBigucci** | A base do Repasse (raios, sombras, densidade, componentes) com a marca MBigucci (vermelho, Bricolage nos títulos, fundos quentes) |
| C | **Clara e leve** | A mais arejada: fundo claro, lateral clara, quase sem faixas escuras, vermelho só na ação principal |

- **Animações leves nas 4:**
  - transição de hover e de toque nos botões;
  - abrir e fechar do menu, dos popups e das folhas;
  - entrada suave dos cards e dos avisos;
  - troca de tema sem piscar.
- **Duração:** curta, de 120 a 250ms, sem nada que atrase o trabalho.
- **Movimento reduzido:** tudo respeita `prefers-reduced-motion`.

## Decisões técnicas
- **Página:** `docs/mockups/visual-diretoria.html`, autocontida, que abre sem servidor e funciona no celular. Se for gerada por script, a fonte entra no Git e o `.html` é gerado.
- **Controles no topo:**
  - Direção (B, A, M, C, nessa ordem);
  - Celular / Notebook;
  - Claro / Escuro;
  - um botão "Ver animações", que repete as entradas.
- **Telas:** as mesmas em todas as direções, com dados fictícios (use `crm/scripts/visual-fixtures.ts` como referência de conteúdo):
  1. Lista do dia (corretor), com a faixa de atenção, um lead atrasado, um lead da empresa com prazo correndo e um de hoje;
  2. Ficha do lead, com "Como foi" aberto;
  3. Painel do gerente;
  4. Menu: a lateral no notebook e o Menu aberto no celular.
- **Layout e fluxos fixos.** O conteúdo, a ordem e as ações de cada tela são os do app de hoje (confira em `crm/src`). Só muda a aparência.
- **Ganhos de conforto de hoje entram nas 4:**
  - alvos de 44px no celular;
  - Inter tabular nos números;
  - menos negrito;
  - um vermelho de destaque por tela;
  - "! Quente" neutro.
  - São usabilidade, não estilo.
- **Contraste AA** em todo texto e controle das 4, nos dois temas. Meça com a mesma função de `crm/scripts/contraste-temas.mjs` e registre os pares que falharem.
- **Tokens por direção:** cada direção é um bloco de variáveis (cores claro/escuro, raio, sombra, fonte, movimento). Ele já vem no formato de `marca/tokens/tokens.json`, para a escolhida virar o pacote depois.
- **Logo:** o Base360 Quadrante nas 4, sem mexer nele.

## Etapas
1. **Uma tela, as 4 direções (pare aqui).**
   - Monte só a Lista do dia, no celular e no notebook, claro e escuro, com as animações.
   - Avise a master (`Base360 Vendas Main`) com um parágrafo por direção.
   - **Pare** até o Felipe ver. Ele pode ajustar ou cortar direções antes de você fazer as outras telas.
2. **As outras telas** (ficha, painel e menu) nas direções que ficarem.
3. **Material para a diretoria.**
   - A página final.
   - Em `docs/estudo-visual-diretoria.md`, uma tabela curta por direção: o que muda, o custo de implementar no Vendas (P/M/G) e o que muda para o Repasse.
   - A master leva ao Felipe.

## Arquivos permitidos
- `docs/mockups/visual-diretoria.html` e a fonte, se houver;
- `docs/estudo-visual-diretoria.md`;
- um script novo em `crm/scripts/`, se precisar gerar ou capturar;
- capturas em `crm/local/visual-diretoria/` (fora do Git).
- **Não toque:**
  - o app (`crm/src`), `globals.css` e `marca/tokens/`, porque nada é aplicado antes da escolha da diretoria;
  - `docs/vendas-participantes.md` e o mockup dele;
  - `ref/`, `C:\Projects\base360-repo`, `C:\Projects\Base360` e `C:\Projects\CRM Bruna`.

## Pronto quando
- **Etapa 1:** a Lista do dia nas 4 direções, celular e notebook, claro e escuro, com animações que funcionam e respeitam o movimento reduzido.
- **Etapa 3:**
  - as 4 telas nas direções que ficaram;
  - os tokens de cada direção no formato do `tokens.json`;
  - o contraste medido;
  - a tabela de custo;
  - a página abrindo sem servidor no celular e no computador.
- **O relatório** separa o que foi conferido em captura isolada do que só o Felipe vê na tela dele.

## Limites
- Sem commit: a master revisa e commita.
- Sem instalar dependência nem publicar artifact sem o ok do Felipe.
- Navegador headless com perfil de teste em `crm/local/`, nunca a sessão do Felipe.
- A suíte não precisa rodar, porque o app não muda. Se rodar, pergunte à master antes.
- Consulte o advisor antes de fechar a abordagem das 4 direções e antes de declarar pronto. Subagentes Sonnet ou Haiku, se precisar (Haiku para levantar valores no código do Repasse).
