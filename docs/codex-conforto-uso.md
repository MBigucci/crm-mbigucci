# Brief · Revisão de conforto de uso do tema (Base360 Vendas)

> Para uma sessão Claude aberta pela sessão master do Base360 Vendas. Escrito em 06/11/2026.

## Leia antes
- `CLAUDE.md`, `docs/design-system.md` e `.claude/skills/tela-ds-mbigucci/SKILL.md`.
- `docs/codex-tema-crm-aprovado.md`: o tema aprovado e as decisões de cabeçalho, lateral, atalhos e conta.
- O que veio depois do brief do tema e prevalece sobre ele (`git log` de `crm/src/components/cabecalho.tsx` e `crm/src/app/globals.css`):
  - cabeçalho de vidro fixo (`position: fixed` com espaçador);
  - botão de recolher no topo da lateral, com o ícone sanduíche do site;
  - cores da navegação iguais às do site (`#16181C`);
  - aviso "Sem conexão" flutuante;
  - logo Base360 Quadrante e o nome "Base360 Vendas".
- `docs/leads.md` (seções 2, 3 e 5: lista do dia, "Detalhe o contato", "Como foi", "Sem resposta"), `docs/painel.md` e `docs/revisao-visual.md`.
- `docs/teste-carga.md` e `crm/src/lib/rascunho.ts`: o que acontece hoje sem conexão (id gerado no aparelho, rascunho, falha ao salvar). Necessário para o item 7.
- `marca/tokens/README.md`: o pacote de tokens compartilhado com o Base360.
- Memórias do Felipe que valem aqui: telas enxutas, com pouco texto, botões pequenos e detalhe em popup; recurso raro fica discreto; não confundir os corretores.

## O que o Felipe pediu (06/11/2026)
Revisar o tema final pensando no **conforto do uso diário**. O objetivo é uma interface agradável para trabalhar o dia inteiro, com a identidade da MBigucci reconhecível.

- **O que pode ser avaliado livremente:**
  - tamanhos e pesos de fonte;
  - espaçamento e densidade dos cards;
  - largura da navegação;
  - contornos e dimensões dos controles;
  - Inter nos números de tabelas, datas e formulários, com Bricolage nos títulos e indicadores onde funcionar bem.
- **A marca fica:** logo, vermelho institucional, fundos quentes e faixas escuras de destaque. Esses elementos são distribuídos com hierarquia, para que dados e ações sejam fáceis de achar.
- **Mudanças no DS** só com consulta ao Felipe, a partir de comparações visuais com dados fictícios e situações reais de trabalho. Depois de validadas, o DS documenta o padrão escolhido.
- **Decisões desta rodada:**
  - quem executa é uma sessão Claude;
  - a frente para depois do diagnóstico e das comparações;
  - o alcance é o Vendas mais o DS e os tokens. O Base360 é avisado depois e decide quando adotar.

### Os 8 itens (hipóteses: para cada um, dizer se já está atendido, se cabe um ajuste visual ou se exige uma frente própria de usabilidade)
1. **Legibilidade e peso.**
   - Nome do cliente, prazo, próxima atividade e valores em tamanho confortável. Avaliar 14–16 px para informação de trabalho e 12–13 px para apoio.
   - Menos negrito quando vários elementos do mesmo card competem pela atenção.
2. **Hierarquia do vermelho.**
   - Olhar o card completo quando botão, atraso, temperatura e barra aparecem juntos.
   - A prioridade vai para a ação principal e a urgência real.
   - Etapas e informações comuns ficam neutras, com palavras que expliquem cada situação.
3. **Faixa escura de atenção.**
   - O destaque aprovado fica.
   - Conferir a altura no celular e quanto do primeiro atendimento aparece ao abrir a tela.
   - Contadores e links levam claramente ao grupo de cada um.
4. **Largura da lateral.**
   - Testar os rótulos mais longos e o perfil com mais destinos (gerente geral) em notebook (1280 e 1366 px).
   - Comparar os 180 px atuais com 208–224 px se houver truncamento, leitura apertada ou quebra excessiva, olhando também a largura útil dos cards.
   - Os rótulos continuam visíveis por padrão, com a opção de recolher.
5. **Números.**
   - Comparar Bricolage e Inter, ambas com algarismos tabulares, em datas, valores de tabela e campos.
   - Avaliar Inter na leitura contínua e Bricolage nos títulos e indicadores de síntese.
   - Apresentar a comparação **antes** de mudar a regra do DS.
6. **Botões e controles.**
   - Consistência de altura, padding, rótulos, foco e desabilitado. O raio de 2 px fica.
   - No celular: alvos de pelo menos 44 px, espaço entre ações e acesso aos últimos campos quando houver rodapé fixo.
7. **Aviso sem conexão e retorno de gravação.**
   - O usuário precisa entender o efeito da falta de conexão no trabalho dele.
   - O texto segue o comportamento real de cada operação e separa dado salvo, rascunho no aparelho e falha ao salvar.
   - Conferir se o aviso flutuante cobre campo, botão ou elemento em foco.
8. **Rótulo do Linktree.**
   - Conferir o conteúdo do destino e avaliar "Links úteis" ou "Materiais e links".
   - É só sugestão de texto, para o Felipe validar.

### Validação pedida
- Mesmos dados fictícios em notebook e celular, nos dois temas.
- Três tarefas completas, observadas do começo ao fim:
  1. achar o atendimento prioritário;
  2. registrar o resultado de um contato;
  3. achar uma informação de gestão (painel ou relatório, como gerente).
- Registrar as dificuldades concretas **antes** de propor mudança em fluxo aprovado.

## Decisões técnicas
- **Prévia isolada:**
  - use `crm/scripts/visual-preview.mjs`, que copia o app para `.visual-preview` com `visual-fixtures.ts` e serve em `http://127.0.0.1:4173/vendas/`, sem `.env` e sem Supabase;
  - os perfis de teste já existem (corretor; gerente por `?qa=gerente`; gerente geral por `?qa=geral`);
  - acrescente fixtures se uma tarefa pedir, por exemplo um card com atraso, temperatura e botão juntos.
- **Capturas:**
  - Chrome headless com perfil de teste em `crm/local/` (fora do Git), como em `docs/revisao-visual/tema-crm/capturar.mjs`, que pode servir de base;
  - larguras de 375 px (celular) e 1280 e 1366 px (notebook), nos temas claro e escuro;
  - nunca na sessão do Felipe nem com o mouse ou o foco dele.
- **Comparação:**
  - uma página HTML em `docs/mockups/conforto-uso.html`, com o antes e o depois lado a lado, por item, com os dados fictícios da prévia;
  - as variantes podem ser CSS alternativo injetado na prévia, sem mudar o app;
  - cada item mostra a recomendação primeiro.
- **Medidas, não impressão:** tamanho e peso computados, altura de alvo, contraste (`crm/scripts/contraste-temas.mjs`) e quanto do primeiro card aparece na abertura a 375 × 812.

## Etapas
1. **Diagnóstico e comparações (pare aqui).**
   - `docs/estudo-conforto-uso.md`: um quadro com os 8 itens. Cada um diz se está atendido, se cabe ajuste visual ou se pede frente própria, com a evidência medida.
   - O registro das 3 tarefas, com as dificuldades encontradas.
   - A página `docs/mockups/conforto-uso.html`.
   - As propostas que mudam o DS vêm separadas, uma por decisão, com a recomendada primeiro.
   - Avise a sessão master (`Base360 Vendas Main`) e **pare** até o Felipe validar.
2. **Aplicar o que o Felipe aprovar** no Vendas (`globals.css`, `tailwind.config.ts` e componentes), sem mudar fluxo aprovado. Capturas antes/depois.
3. **Documentar.**
   - Atualizar `docs/design-system.md`, `marca/tokens/tokens.json` e o `README`. `node marca/tokens/conferir.mjs` precisa dar 0 divergências.
   - Uma nota curta para a sessão do Base360 com o que mudou no pacote. A master manda a nota; a frente não manda.

## Arquivos permitidos
- **Etapa 1:**
  - `docs/estudo-conforto-uso.md` e `docs/mockups/conforto-uso.html`;
  - `crm/scripts/visual-fixtures.ts` (só para acrescentar fixtures);
  - um script de captura novo em `crm/scripts/`;
  - capturas em `docs/revisao-visual/conforto/` (**fora do Git**; só o script entra).
- **Etapas 2 e 3:** `crm/src/app/globals.css`, `crm/tailwind.config.ts`, `crm/src/components/**`, as páginas tocadas pelos itens aprovados, `docs/design-system.md`, `docs/revisao-visual.md`, `marca/tokens/**` e `.claude/skills/tela-ds-mbigucci/SKILL.md`.
- **Não toque:**
  - `docs/vendas-participantes.md` e `docs/mockups/vendas-participantes.html` (de outra frente);
  - a lógica e o SQL da distribuição;
  - `marketing/`;
  - `ref/`, `C:\Projects\base360-repo` e `C:\Projects\CRM Bruna`.
  - Outros arquivos não rastreados na árvore são de estudos anteriores: leia se ajudar, mas não altere.

## Pronto quando
- **Etapa 1:**
  - os 8 itens têm veredito com evidência medida;
  - as 3 tarefas foram registradas nos dois aparelhos e nos dois temas;
  - a comparação abre no navegador sem servidor;
  - cada proposta de mudança no DS vem com antes e depois.
- **Etapas 2 e 3:**
  - só o aprovado foi aplicado;
  - typecheck, `npm test`, `node scripts/contraste-temas.mjs` e `node marca/tokens/conferir.mjs` passam;
  - o build sem `npm run dev` ligado passa;
  - o relatório separa o que foi conferido na prévia isolada do que só o Felipe confere na tela real.

## Limites
- Prévia e capturas isoladas, com dados fictícios. Sem credenciais reais, sem Supabase e sem publicar.
- Sem instalar dependência nem reiniciar nada sem o ok do Felipe.
- **Sem commit.** A master revisa e commita.
- Não rode a suíte ao mesmo tempo que outra frente: pergunte à master antes.
- Ícones só na navegação, como aprovado. Cards continuam com glifo, palavra e cor.
- Fluxo aprovado (o que aparece em cada card, ações, ordem) não muda nesta frente: o que for de fluxo vira "frente própria" no estudo.
