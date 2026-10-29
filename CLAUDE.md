# CRM MBigucci

O CRM de corretores da MBigucci (construtora em São Bernardo do Campo). O usuário é o Felipe, gerente geral. Escreva sempre em português do Brasil.

## Pastas
- `discovery/`: Fase 1, a pesquisa "Seu CRM ideal", publicada em mbigucci.com.br/pesquisa-crm.
- `crm/`: Fase 2, o CRM.
- `docs/`: regras de negócio e decisões, um arquivo por tema (veja o índice abaixo).
- `ref/`: o CRM da Bruna, **só como referência** de usabilidade e stack. Nunca edite. O design system dele é de outra marca.

## Stack
- Next.js 15 + React 19 + Tailwind 3 + zod. Os dois apps usam **exportação estática** (`output: "export"`) e são hospedados em pastas do WordPress da MBigucci.
- **Dados:** o CRM usa o Supabase (Postgres + Auth), com a segurança toda em **RLS**. A pesquisa grava numa Google Planilha via app da web do Apps Script (`discovery/apps-script/Code.gs`).

## Comandos não óbvios
- `npm run build` gera `out/`, que é a pasta enviada por FTP para o WordPress. O `BASE_PATH` define a pasta do site (a pesquisa usa `/pesquisa-crm`). Confira os caminhos de `/_next/` no site publicado.
- Depois de editar o Apps Script, use Implantar > Gerenciar implantações > **Nova versão**. Uma implantação nova troca a URL.

## Convenções
- Use o visual do **MBigucci Design System**: card com barra de 4px à esquerda, uma ação vermelha por grupo, sem sombra, sem ícones nem emoji, sinais em glifos ✓ ! ✕. Detalhes em `docs/design-system.md`.
- Textos de interface em pt-BR: frases curtas, imperativo, caixa de frase, sem exclamação.
- Perfis de acesso são **permissões configuráveis** em tabela, nunca `if (role === ...)` espalhado.
- Abra uma **sessão separada para cada etapa** com entregável próprio, com um brief completo apontando para `docs/`.
- Este arquivo é um índice curto: contexto de domínio vai em `docs/<tema>.md`, e o índice abaixo é atualizado junto. Arquivo de `docs/` com mais de ~100 linhas ganha um sumário no topo.

## Armadilhas
- Com exportação estática não há rotas de API nem servidor. Tudo roda no navegador.
- Tudo que começa com `NEXT_PUBLIC_` vai para o site público. O token da planilha só grava, e a `service_role` do Supabase nunca entra no front.
- No Apps Script, `setFormula` usa sintaxe em inglês, com vírgula, seja qual for o idioma da planilha.
- Fontes no CSS usam caminho relativo (`./fonts/...`), porque um caminho absoluto quebra com o `basePath`.
- O `onError` de `<img>` pode disparar antes da hidratação. Confira `img.complete && naturalWidth === 0` num efeito.
- Não rode `npm run build` com o `npm run dev` ligado no mesmo app, porque o `.next` corrompe ("Cannot find module './611.js'"). Para consertar, pare o servidor, apague o `.next` e suba de novo.
- Alternar seleção múltipla usa `setState` funcional. A versão com closure perde cliques rápidos.

## Restrições fixas
- **Sigilo até a reunião de novembro de 2026:** verba por corretor, pontos que viram verba, ranking e o fim dos leads do Google não aparecem para corretores nem gerentes. Ficam atrás da chave "Programa de verba ativo". Textos para corretores não citam esses temas.
- Nunca use credenciais reais nem crie recursos externos (Supabase, implantações) sem o Felipe.

## Onde encontrar contexto
- `docs/acessos-perfis.md`: abra ao mexer em login, perfis, equipes, permissões, RLS ou origem e distribuição de leads.
- `docs/pontuacao-verba.md`: abra ao mexer em pontos, lançamentos e aprovação, cálculo da verba, premiação por VGV ou roleta. Tem a regra do sigilo.
- `docs/metas-ranking.md`: abra ao mexer na meta anual de VGV, nas metas próprias do corretor ou no ranking.
- `docs/pesquisa-discovery.md`: abra ao mexer em `discovery/`, ao analisar as respostas da pesquisa ou ao escrever qualquer texto para corretores.
- `docs/pesquisa-resultados.md`: abra ao desenhar leads, cadastro, lista do dia, painel ou qualquer tela do corretor. São as 34 respostas consolidadas e as decisões que saem delas.
- `docs/design-system.md`: abra antes de criar ou alterar qualquer tela.
- `docs/crm-arquitetura.md`: abra ao mexer na estrutura do `crm/` (schema, RLS, deploy).
- `docs/leads.md`: abra ao mexer em leads, lista do dia, cadastro, ficha, quadro, interações, descarte ou atribuição de lead.
- `docs/referencia-crm-bruna.md`: abra antes de planejar uma etapa nova ou ajustar um fluxo. Diz o que vem do CRM da Bruna, como adaptar e em que ordem.
- `docs/fontes/regras-comerciais-2026-10.md`: o documento original do Felipe. Abra só para conferir o texto exato de uma regra.
- `docs/candidatos-automacao.md`: abra ao criar testes, hooks ou skills, ou quando um hook bloquear algo e você precisar entender por quê.

## Automação ativa
- O hook `.claude/hooks/guard.js` bloqueia quatro coisas: edição em `ref/`, segredo em `crm/src` ou `discovery/src`, `@import` no CLAUDE.md e `.env` em `out/` ou em pacotes de publicação. Para testar, rode `node .claude/hooks/guard.test.js`.
- Skills: `publicar-wordpress`, `atualizar-apps-script` e `tela-ds-mbigucci` (em `.claude/skills/`).
