# Candidatos a teste, hook e skill

> Lista aprovada pelo Felipe em 28/10/2026. **Hooks e skills foram criados** em 28/10/2026, e os testes ficam para quando o código do CRM existir. Crie qualquer item novo só com aprovação dele.
>
> - **Hooks:** todos num único script, `.claude/hooks/guard.js`, registrado em `.claude/settings.json` (PreToolUse). Para conferir, rode `node .claude/hooks/guard.test.js` (17 casos).
>   - Limitação conhecida: um comando de terminal que só *menciona* `.env.local` junto com `out/`, zip ou ftp também é bloqueado.
> - **Skills:** ficam em `.claude/skills/` (`publicar-wordpress`, `atualizar-apps-script`, `tela-ds-mbigucci`).

## Testes (regras verificáveis)
1. A fórmula da verba bate com os 7 exemplos de `docs/pontuacao-verba.md`: mínimo de 130, teto de 200 sem venda, 280 com a primeira venda e +R$ 1.000 por venda, só acima de 130.
2. A premiação por VGV paga só a faixa mais alta, sem acumular.
3. A venda conta no mês da assinatura, e a verba e o prêmio são liberados no mês seguinte.
4. Só lançamentos aprovados pelo gerente geral contam pontos.
5. A roleta exige 6 períodos completos na semana.
6. RLS: o corretor vê só os próprios dados e o gerente só os da equipe dele.
7. Cada corretor pertence a uma única equipe, e o gerente não pontua.
8. Com a chave "Programa de verba ativo" desligada, corretores e gerentes não recebem nenhum dado de verba nem de ranking.
9. O Apps Script da pesquisa neutraliza texto que começa com `=`, `+`, `-` ou `@`.

## Hooks (proibições absolutas)
1. Bloquear edição de qualquer arquivo dentro de `ref/`.
2. Bloquear `service_role` ou qualquer segredo em `crm/src` e `discovery/src`.
3. Bloquear `@import` de arquivo dentro do `CLAUDE.md`.
4. Bloquear `.env.local` dentro de `out/` ou de qualquer pacote de publicação.

## Skills (procedimentos repetitivos)
1. **Publicar no WordPress:** gerar o build com o `BASE_PATH` certo, enviar `out/` e conferir os caminhos de `/_next/` e do logo no site publicado.
2. **Atualizar o Apps Script:** colar o código e implantar como "Nova versão", sem trocar a URL.
3. **Criar uma tela no DS MBigucci:** checklist de tokens, barra, glifos, contraste e campos de 16px no celular.

## Sugeridos pela sessão "CRM base" (29/10/2026), ainda não criados
Testes:
- O schema roda duas ou mais vezes sem erro e não sobrescreve as permissões ajustadas no app.
- Usuário desativado só vê o próprio perfil. O visitante sem login (`anon`) não lê nenhuma tabela.
- `app_settings` só pode ser lida e alterada pelo gerente geral.
- Só o gerente geral promove alguém a gerente geral, e sempre resta pelo menos um gerente geral ativo.
- Corretor ativo precisa ter equipe. O gerente de uma equipe precisa ter o perfil Gerente. Uma equipe com membros não pode ser excluída.
- A busca no `out/` não encontra nenhuma palavra sigilosa (verba, ranking, pontua, premia).
- Toda tabela nova com dados de corretor usa `pode_ver_dados_de()` e tem um teste por perfil.
- Hoje o teste de SQL existe só fora do repositório (`sqltest/test.mjs`, na pasta de notas daquela sessão). Precisa ser trazido para `crm/`.

Hooks:
- Bloquear tabela nova em `schema.sql` sem `enable row level security`.
- Bloquear palavras sigilosas em `crm/src` enquanto o programa de verba não for lançado.
- Bloquear rotas de API, `"use server"` e `getServerSideProps` em `crm/src`, porque quebram a exportação estática.
- Bloquear inserts de permissões ligadas à verba em `permissions` antes do lançamento, porque essa tabela é legível por todos os usuários ativos.
