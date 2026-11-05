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
- `npm run build` gera `out/`, que é a pasta enviada por FTP para o WordPress. O `BASE_PATH` define a pasta do site (a pesquisa usa `/pesquisa-crm`; o CRM, que é o módulo de Vendas do Base360, fica em `base360.mbigucci.com.br/vendas`, um site estático próprio fora do WordPress, com `BASE_PATH=/vendas npm run build`). Confira os caminhos de `/_next/` no site publicado.
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
- **Faixas de VGV** são só do gerente geral, por regra fixa no banco (`is_gerente_geral()`), nunca por permissão do catálogo.
- Nunca use credenciais reais nem crie recursos externos (Supabase, implantações) sem o Felipe.

## Onde encontrar contexto
- `docs/acessos-perfis.md`: abra ao mexer em login, perfis, equipes, permissões, RLS ou origem e distribuição de leads.
- `docs/pontuacao-verba.md`: abra ao mexer em pontos, lançamentos e aprovação, cálculo da verba, premiação por VGV ou roleta. Tem a tabela de quem vê cada tela do programa.
- `docs/metas-ranking.md`: abra ao mexer na meta anual de VGV, nas metas próprias do corretor ou no ranking.
- `docs/pesquisa-discovery.md`: abra ao mexer em `discovery/`, ao analisar as respostas da pesquisa ou ao escrever qualquer texto para corretores.
- `docs/pesquisa-resultados.md`: abra ao desenhar leads, cadastro, lista do dia, painel ou qualquer tela do corretor. São as 34 respostas consolidadas e as decisões que saem delas.
- `docs/gerentes-necessidades.md`: abra ao desenhar o painel ou o relatório do gerente, ou o cadastro de parceiros. São os pedidos dos gerentes de equipe e onde cada um entra.
- `docs/design-system.md`: abra antes de criar ou alterar qualquer tela.
- `marca/tokens/README.md`: abra ao mudar uma cor ou token. O pacote compartilhado com o Base360 tem de bater com `crm/src/app/globals.css` (`node marca/tokens/conferir.mjs`), e o mesmo `tokens.json` está publicado no artifact do MBigucci DS.
- `docs/revisao-visual.md`: revisão em 375px e desktop, prioridades por tela e capturas antes/depois dos ajustes de hierarquia.
- `docs/crm-arquitetura.md`: abra ao mexer na estrutura do `crm/` (schema, RLS, deploy).
- `docs/leads.md`: abra ao mexer em leads, lista do dia, cadastro (e Cadastro Mágico), ficha, quadro, interações, follow-up e tentativas, histórico (`lead_eventos`), descarte, atribuição de lead, perfil ampliado, dados pessoais, aniversário ou documentos do lead.
- `docs/painel.md`: abra ao mexer no painel da equipe, no relatório do corretor, na impressão ou no botão Lead perdido.
- `docs/vendas-metas.md`: abra ao mexer em vendas, correção ou cancelamento de venda, meta anual de VGV, metas próprias do corretor, conversão por origem e campanha ou na tela Faixas de VGV (só do gerente geral).
- `docs/visitas.md`: abra ao mexer em visitas, agenda, baixa de visita, confirmação de visita ou nas visitas da lista do dia e do painel.
- `docs/recepcao.md`: abra ao mexer em `/recepcao/` (a vez do stand, o cadastro do cliente por tipo, Anuncie, retorno), nos stands e especialistas, no relatório do stand ou em `recepcao.sql`. Tem o roteiro de treino e o que cadastrar antes da troca. O porquê e as decisões estão em `docs/estudo-recepcao.md`.
- `docs/empreendimentos.md`: abra ao mexer no catálogo de empreendimentos e tipologias, no Radar de Match ou na lista do Cadastro Mágico. Tem o cruzamento com a lista atual, as dúvidas, o esquema, na seção 12 como ficou e, na seção 13, a importação da tabela de preços por IA externa. Os dados coletados estão em `docs/empreendimentos-dados.json`.
- `docs/notificacoes.md`: abra ao mexer nos avisos no celular (push), no `sw.js`, na Edge Function `avisos`, no `agendar-avisos.sql` ou em Avisos neste aparelho. Tem quando cada aviso sai, o não repetir e a tabela "Da Bruna".
- `docs/referencia-crm-bruna.md`: abra antes de planejar uma etapa nova ou ajustar um fluxo. Diz o que vem do CRM da Bruna, como adaptar e em que ordem.
- `docs/fontes/regras-comerciais-2026-10.md`: o documento original do Felipe. Abra só para conferir o texto exato de uma regra.
- `docs/historico.md`: abra antes de retomar algo que já foi tentado ou abandonado. Tem o sigilo do programa de verba e por que acabou (04/11/2026).
- `docs/candidatos-automacao.md`: abra ao criar testes, hooks ou skills, ou quando um hook bloquear algo e você precisar entender por quê.
- `docs/teste-carga.md`: abra ao mexer em RLS, gatilhos, gravações do app (salvar, cadastrar, Desfazer) ou no plano do Supabase. Tem o teste de carga (`npm run test:carga`), o id gerado no aparelho contra duplicados e o que ficou pendente.
- `docs/marketing/roteiro.md`: abra ao mexer no módulo de Marketing (substituto do RD Station).
- `docs/direcionador/direcionador.md`: abra ao mexer no direcionador de leads (entrada por e-mail e Graph, regras, sigilo da distribuição manual). Fica fora do Marketing, numa pasta à parte com senha do servidor. Decisões do Felipe no topo. A especificação para o outro sistema está em `docs/direcionador/porta-de-entrada-leads.md`.
- `docs/apresentacao/`: o deck da reunião de novembro (Artifact Slides, fontes em `project/`). Abra ao mexer na apresentação ou ao conferir o que foi anunciado a corretores e gerentes.

## Automação ativa
- O hook `.claude/hooks/guard.js` bloqueia quatro coisas: edição em `ref/`, segredo em `crm/src` ou `discovery/src`, `@import` no CLAUDE.md e `.env` em `out/` ou em pacotes de publicação. Para testar, rode `node .claude/hooks/guard.test.js`.
- Skills: `publicar-wordpress`, `atualizar-apps-script` e `tela-ds-mbigucci` (em `.claude/skills/`).
