# CRM MBigucci · Arquitetura (Fase 2)

> Decisões tomadas na fundação do CRM (`crm/`), em 28/10/2026. O passo a passo de instalação está em `crm/README.md`. As regras de negócio estão em `docs/acessos-perfis.md` e `docs/pontuacao-verba.md`, e as regras visuais em `docs/design-system.md`.

## Deploy estático

- **Stack:** Next.js 15, React 19, Tailwind 3, Supabase e zod.
- **Exportação estática:**
  - `output: "export"`, sem rotas de API nem server components dinâmicos.
  - `npm run build` gera `out/`, que vai por FTP para a pasta `crm/` do WordPress.
  - `BASE_PATH` define a pasta e tem `/crm` como padrão.
  - `trailingSlash: true`, para o Apache servir `pasta/index.html`.
- **Dados e segurança:**
  - Todo dado e todo login vêm do Supabase, pelo navegador, com a chave anon.
  - A segurança depende **só** do RLS. O front não tem nenhum acesso extra.
- **Criação de contas:**
  - Criar uma conta exige a chave de serviço, que não pode ir para o site.
  - Por isso essa parte roda na Edge Function `usuarios-admin` (`crm/supabase/functions/`), com as ações `criar` e `redefinir_senha`.
  - A função confere `has_permission('usuarios.gerenciar')` com o JWT de quem chama.
  - Ela grava o perfil **com o JWT de quem chama**, então valem as mesmas policies e gatilhos do app.
- **Cadastro:** o cadastro aberto fica desligado no Auth.

## Modelo de permissões

- Os perfis são fixos: `gerente_geral`, `operacional`, `gerente`, `corretor`, `recepcao` e `especialista`. Eles estão na tabela `roles` e no check de `profiles.perfil`.
- As permissões ficam em `permissions`. O vínculo perfil → permissão fica em `role_permissions`, que o gerente geral edita no app. Não há permissões fixas no código.
- O `gerente_geral` tem todas as permissões **implicitamente**, sem linhas na tabela. Assim ele não consegue se trancar fora.
- **Regras fixas no banco**, por gatilho e policy, sem depender de configuração:
  - Só o gerente geral altera um gerente geral, as chaves de `app_settings` e `role_permissions`.
  - Sempre existe ao menos um gerente geral ativo.
  - Corretor ativo pertence a exatamente uma equipe (`profiles.equipe_id`).
  - O gerente não é membro de equipe: ele se liga a ela por `teams.gerente_id` e não vende nem pontua. O gerente geral também não é membro.
  - Uma equipe só é excluída sem membros. Um gerente só muda de perfil depois que ninguém mais tem ele como gerente de equipe.
- **Usuário desativado:** `current_perfil()` retorna `null`. Com isso ele perde todas as permissões e só vê o próprio perfil.

## RLS

- **Funções auxiliares:** são `security definer` com `search_path = ''`, e ficam em `public`:
  - `current_perfil`, `is_gerente_geral` e `has_permission`;
  - `minha_equipe` e `is_my_team_member`;
  - `pode_ver_dados_de`.
- **`pode_ver_dados_de(corretor_id)`** é a regra padrão para toda tabela de dados de corretor (leads, agenda, visitas, metas). Ela libera:
  - o próprio corretor;
  - o gerente da equipe dele, com `dados.ver_equipe`;
  - quem tem `dados.ver_todos`.
- **Colunas graváveis:** as escritas do app são limitadas por GRANT de coluna. Por exemplo, em `profiles` só é possível alterar nome, perfil, equipe e ativo. O e-mail vem do Auth por gatilho.
- **Detalhes:** a tabela de policies por tabela está em `crm/README.md`, na seção "Segurança (RLS)".

## Sigilo do programa de verba (até a reunião de nov/2026)

- **Código público:** o código do front é público, porque qualquer um baixa os arquivos de `out/`. Por isso o código não cita verba, ranking, pontos nem prêmios.
- **Rótulos sensíveis:** o nome e a descrição da chave `programa_verba_ativo` ficam em `app_settings`, que só o gerente geral lê. A tela de Configurações lista as chaves sem saber quais são.
- **Gate das policies:** as próximas etapas devem usar `private.programa_verba_ativo()`. O schema `private` não é exposto pela API do Supabase, então o nome da função não aparece no catálogo da API.
- **Catálogo de permissões:** a tabela `permissions` é legível por todo usuário ativo. As permissões do programa sigiloso só entram nela perto do lançamento.

## Testes

- **Schema e RLS:** o schema foi testado no PGlite (Postgres em WASM), com uma simulação do `auth.users`, do `auth.uid()` e dos papéis `anon` e `authenticated`. Foram 44 verificações por perfil, e o script rodou três vezes para provar que é idempotente.
- **Onde está o teste:** ainda não está no repositório. O script fica na pasta de notas da sessão (`sqltest/test.mjs`).
- **Ainda não validado:** o schema e a Edge Function num Supabase real.
