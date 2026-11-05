# Brief: fim do sigilo e da chave "Programa de verba ativo"

## Leia antes
- `CLAUDE.md` (seção "Restrições fixas": a regra que sai) e `docs/pontuacao-verba.md` (regra do sigilo e a chave).
- `docs/acessos-perfis.md` e `docs/crm-arquitetura.md` (onde a chave entra no RLS e nas telas).
- `docs/estudo-relatorios.md`, decisão D1 (o registro da decisão).
- Skill `tela-ds-mbigucci`, `.claude/hooks/guard.test.js` e skill `publicar-wordpress` (conferências de palavras sigilosas).

## O que o Felipe pediu (04/11/2026)
- **Acabar com a chave "Programa de verba ativo" e com a regra de sigilo.** Tudo do programa aparece sempre, para quem tem permissão: verba por corretor, pontos, ranking e o fim dos leads do Google. O marketing já sabe.
- Motivo: o CRM só vai ao ar depois que todos souberem das regras novas, então esconder não protege mais nada.
- Confirmado pelo Felipe na sessão principal em 04/11/2026.
- **Não muda:** a publicação no WordPress continua sendo decisão do Felipe, depois do anúncio. Os textos da pesquisa (`discovery/`) já publicados ficam como estão. As **Faixas de VGV** continuam só do gerente geral (regra fixa no banco, D11 do estudo de relatórios está aberta).

## Decisões técnicas
- Comportamento final = o de hoje com a chave **ligada**, sem a chave: quem vê o quê sai só das permissões em `role_permissions`. Nunca `perfil ===`.
- **Banco** (`crm/supabase/schema.sql`, idempotente): `ve_programa()` deixa de depender de `programa_estado`; políticas de RLS que usam a chave passam a usar só a permissão. Decida e documente se `programa_estado` é removida ou fica sem uso (preferir remover com `drop ... if exists`, depois de conferir que nada mais lê). O Felipe roda o SQL.
- **Front:** tirar a chave de `casca.tsx` (`useEstadoPrograma`, `veProg`, `programa`), de `lib/programa-dados.ts` e da tela Configurações. Telas do programa passam a aparecer por permissão.
- **Textos:** tirar avisos do tipo "Só você vê estas telas" e "Ligue a chave depois da reunião"; revisar textos para corretores que evitavam esses temas, sem inventar regra nova.
- **Conferências de sigilo:** remover ou trocar o grep de palavras sigilosas do build (skill `publicar-wordpress`, `tela-ds-mbigucci`) e casos do `guard.test.js` que dependem disso, mantendo os bloqueios que continuam valendo (`ref/`, segredos, `.env`).
- **Docs:** atualizar `CLAUDE.md` (tirar a restrição de sigilo e ajustar a linha de `docs/pontuacao-verba.md` no índice), `docs/pontuacao-verba.md`, `docs/acessos-perfis.md`, `docs/crm-arquitetura.md`, `crm/README.md` (passo de ligar a chave) e registrar em `docs/historico.md` (criar se não existir) o que era o sigilo e por que acabou.
- Testes: ajustar `crm/supabase/testes/programa.test.mjs`, `carga/seed.mjs` e `scripts/visual-fixtures.ts`.

## Etapas
1. **Levantamento:** lista de todo lugar que usa a chave ou cita o sigilo (código, SQL, testes, docs, skills, hook), com o que muda em cada um. **Parar para o Felipe ver** quem passa a ver cada tela (tabela perfil × tela).
2. Banco e testes de banco.
3. Front, textos e testes.
4. Docs, skills, hook e `CLAUDE.md`.

## Arquivos permitidos
Os listados nas decisões técnicas. **Não tocar:** `crm/src/app/parceiros/**`, `crm/src/app/parceiro/**`, `crm/supabase/parcerias*.sql` (frente Parcerias), `ref/`, `discovery/`. Se outra frente estiver mexendo em `schema.sql` ao mesmo tempo, combinar com a sessão principal antes.

## Pronto quando
- Nenhuma referência à chave no código, no SQL e nos testes (`grep` de `programa_estado`, `veProg`, `useEstadoPrograma` vazio, ou só em histórico).
- Corretor, gerente, recepção e gerente geral veem as telas da tabela aprovada na etapa 1 (`verificar-rls.sql` e testes de banco).
- Faixas de VGV continuam só do gerente geral.
- Typecheck, `npm test`, `npm run test:banco`, `node .claude/hooks/guard.test.js` e build passam.
- `CLAUDE.md` sem a restrição de sigilo e com o índice coerente.

## Limites
- Testes isolados, sem credenciais reais, sem rodar SQL no Supabase, instalar ou reiniciar nada sem ok do Felipe.
- Não publicar no WordPress.
- Não commitar: entregar arquivos mudados, resultado dos testes e pendências.
