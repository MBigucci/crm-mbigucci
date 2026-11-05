# Brief: atualizar o MBigucci Design System com o tema aprovado e o Base360

## Leia antes
- `CLAUDE.md`, a skill `.claude/skills/tela-ds-mbigucci/SKILL.md` e `docs/design-system.md` inteiro. A seção "Tema e navegação do CRM — 05/11/26" é a fonte do que foi aprovado e já está em produção no CRM.
- O código que manda: `crm/src/app/globals.css` (tokens claro, escuro e impressão, botões, navegação, cabeçalho, aviso de conexão), `crm/tailwind.config.ts`, `crm/src/components/cabecalho.tsx` e `icones-menu.tsx`, e `crm/scripts/contraste-temas.mjs` (os 106 pares auditados).
- `docs/codex-tema-crm-aprovado.md` e o mockup `docs/mockups/tema-crm-aprovado.html`: o que o Felipe aprovou e por quê.
- `docs/estudo-design.md`: a comparação do site, do CRM e do Base360, com os valores do Base360 (shadcn/ui).
- O artifact **MBigucci Design System**, `https://claude.ai/artifact/QesJh8EPBkLqV5jjbpNFEi`. É do tipo Design System e o Felipe é o dono. O conteúdo fica nos arquivos `project/`, e as instruções do tipo vêm com a ação `read` do Artifact. Comece listando os arquivos e lendo `project/README.md`, `project/tokens.json` e `project/design-system.json`.
- `C:\Projects\base360-repo` (`src/styles.css`, `components.json`): **só leitura**, para mapear os tokens shadcn.
- A frente do logo Base360 (`docs/codex-logo-base360.md`) está em andamento. O logo **não** entra agora.

## O que o Felipe pediu (05/11/2026)
- Atualizar o **MBigucci Design System**, o artifact que é a fonte da verdade, com uma **parte Base360** para os sistemas internos. A diretoria definiu que Base360 é o sistema da empresa e que o CRM é o módulo de Vendas.
- **Começar já.** O logo Base360 entra depois, quando o Felipe escolher. Deixe um espaço reservado na parte Base360.
- **Escopo, todos os quatro itens:**
  1. **Tokens e componentes aprovados:**
     - grafite da navegação `#16181C` e as cores ligadas a ele (`nav-ativo`, `nav-linha`, `nav-marca`);
     - botão secundário e regra dos botões (raio de 2px, 36px no computador e 44px no celular);
     - cabeçalho translúcido (85%, desfoque de 12px, `position: fixed`);
     - lateral de 180/64px e menu do celular com o botão sanduíche do site;
     - menu da conta, atalhos externos e aviso Sem conexão;
     - a exceção de ícones na navegação.
  2. **Tema escuro:** a paleta escura do CRM, que hoje só existe no repositório, entra no DS como segundo tema.
  3. **Regras de uso e exemplos:** quando usar cada componente, o que não fazer e exemplos de tela do CRM (Vendas) e do Repasse.
  4. **Pacote de tokens compartilhado:** um arquivo de tokens que o CRM e o Base360 da Roberta possam importar.

## Decisões técnicas
- **Valores exatos do código.** `crm/src/app/globals.css` vence o mockup e qualquer captura. Não invente valores: o que não existir no código fica como pendência.
- **O artifact segue as instruções do tipo Design System:**
  - só escrever em `project/`;
  - `tokens.json` sempre inteiro, no formato de listas que a página lê;
  - o índice `design-system.json` vai uma única vez, na última chamada, lido de novo logo antes;
  - preservar as palavras que já existem e as chaves do índice;
  - registrar `lastChange` com `by: "Felipe Jorge"`.

  Antes de publicar, leia de novo cada arquivo que vai mudar, porque outras pessoas podem editar ao vivo.
- **Temas no `tokens.json`:** `light` primeiro e `dark` depois, com os valores de `:root` e de `:root[data-tema="escuro"]` do CRM. Os tokens da navegação são iguais nos dois temas. Os tokens que só valem para a impressão vão como nota de uso, não como tema.
- **Parte Base360:** uma seção `project/base360.md` com:
  - o que é o sistema e os módulos;
  - a casca comum (cabeçalho, lateral, menu do celular, conta, atalhos, aviso de conexão);
  - o espaço reservado do logo, com o lockup "Base360 · Módulo" a definir;
  - o mapeamento dos tokens MBigucci para as variáveis shadcn do Base360 (`--primary`, `--secondary`, `--border`, `--ring`, `--radius` e afins), com o valor atual do Base360 ao lado.
- **Componentes no DS:** atualize ou crie `components/<Nome>/README.md` e `preview.html` para Botão (principal e secundário), Navegação lateral, Menu do celular, Cabeçalho e Aviso de conexão. Os previews são estáticos, com o CSS escrito no próprio preview a partir dos tokens. Sem bundle React nesta etapa, salvo se o DS já tiver um.
- **Ícones da navegação:** os SVGs de `icones-menu.tsx` vão como grupo de assets "Ícones de navegação", com o aviso da licença ISC do Lucide no README do grupo. O sanduíche também entra.
- **Pacote de tokens compartilhado**, numa pasta nova `marca/tokens/` na raiz deste repositório:
  - `marca/tokens/tokens.json`: a fonte, no mesmo formato de listas do DS, que pode ser o mesmo arquivo publicado no artifact;
  - `marca/tokens/gerar.mjs`: script sem dependências que gera:
    - `mbigucci.css`, com as variáveis em canais RGB como o CRM usa (`--paper: 247 246 242;`, claro e `[data-tema="escuro"]`);
    - `base360-shadcn.css`, com as variáveis shadcn do Base360 nos dois temas;
  - `marca/tokens/conferir.mjs`: compara o `tokens.json` com o `crm/src/app/globals.css` atual e falha se algum valor divergir. É a prova de que o pacote reflete o que está em produção;
  - `marca/tokens/README.md`: como gerar, como o CRM vai importar e como o Base360 vai importar.

  **Não troque** o `globals.css` do CRM para importar o pacote, e não toque no Base360. Isso é uma etapa seguinte, com o ok do Felipe e da Roberta. Os CSS gerados ficam fora do Git: só a fonte e os scripts entram.

## Etapas
1. **Inventário (pare para o Felipe ver).** Uma tabela em `docs/ds-atualizacao-inventario.md` com:
   - o que o artifact tem hoje (tokens, componentes, seções, assets);
   - o que muda;
   - o que entra de novo;
   - o mapeamento MBigucci → shadcn do Base360.

   Marque as divergências entre o artifact e o código (por exemplo, valores claros antigos de `concrete` e `wa`) e diga qual valor vai prevalecer. Entregue antes de publicar qualquer coisa no artifact.
2. **Pacote de tokens:** `marca/tokens/` com a fonte, os scripts e o README. Rode `node marca/tokens/conferir.mjs` até passar e mostre a saída.
3. **Publicar no artifact:** tokens com os dois temas, a seção Base360, os componentes, os ícones e o README atualizado (o livro da marca) com regras de uso e exemplos. Uma publicação por lote, com o índice no fim.
4. **Conferência:**
   - abra o artifact publicado nos dois temas e confira que os tokens aparecem sem nenhum descartado;
   - confira se os previews renderizam;
   - confira o contraste: texto 4,5:1, controles e foco 3:1, os mesmos pares do `contraste-temas.mjs`.

## Arquivos permitidos
- No repositório: criar `marca/tokens/` (fonte, scripts, README) e `docs/ds-atualizacao-inventario.md`. Atualizar `docs/design-system.md` só para apontar para o pacote e para o artifact atualizado, com uma linha na seção "Onde os tokens já estão em código".
- No artifact: só os arquivos em `project/` do MBigucci Design System.
- Não tocar: `crm/src/`, `crm/public/`, `discovery/`, `ref/` e `C:\Projects\base360-repo`. Não publicar o CRM.

## Pronto quando
- O inventário foi aprovado pelo Felipe antes da publicação.
- `node marca/tokens/conferir.mjs` passa, com 0 divergências entre o pacote e o `globals.css` do CRM, e a saída está no relatório.
- O artifact mostra os temas claro e escuro, com todos os tokens do CRM presentes e nenhum descartado pela página.
- Os componentes Botão, Navegação lateral, Menu do celular, Cabeçalho e Aviso de conexão têm README e preview.
- A seção Base360 existe, com o espaço do logo reservado e o mapeamento shadcn.
- O contraste foi conferido nos dois temas.
- O relatório separa o que foi conferido do que só o Felipe e a Roberta podem conferir: a importação do pacote em cada sistema.

## Limites
- Teste isolado: navegador headless num perfil de teste em `local/` ou na pasta temporária, nunca na sessão do Felipe. As capturas ficam fora do Git.
- Sem instalar pacotes, sem reiniciar serviços e sem publicar o site.
- **Sem commit.** Entregue a lista de arquivos, o link do artifact e as pendências. A sessão master revisa, roda a suíte e commita.
- Não rode a suíte do `crm/` enquanto outra frente estiver usando a pasta. A frente do logo está ativa e só mexe em `docs/mockups/logo-base360-conceitos.html` e em `docs/marca-base360/`.
- A decisão de marca é do Felipe. Se o artifact tiver sido editado por outra pessoa no meio do caminho, refaça a leitura e não sobrescreva.
