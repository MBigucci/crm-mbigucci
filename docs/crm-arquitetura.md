# CRM MBigucci · Arquitetura (Fase 2)

> Decisões tomadas na fundação do CRM (`crm/`), em 28/10/2026. O passo a passo de instalação está em `crm/README.md`. As regras de negócio estão em `docs/acessos-perfis.md`, `docs/leads.md` e `docs/pontuacao-verba.md`, e as regras visuais em `docs/design-system.md`.

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
- **`pode_ver_dados_de(corretor_id)`** é a regra padrão (o módulo de leads já a usa) para toda tabela de dados de corretor (leads, agenda, visitas, metas). Ela libera:
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

## Módulo de leads (29/10/2026)

As regras de negócio estão em `docs/leads.md`. Aqui ficam só as decisões técnicas.

- **Tabelas:** `leads`, `lead_interacoes` e os catálogos `lead_origens` e `lead_etapas`. Origens e etapas são tabelas, e não enums, para serem ajustadas no Table Editor sem mexer no código.
- **Sem exclusão:** não há GRANT de `delete` em `leads` nem em `lead_interacoes`. O descarte é `status = 'descartado'` com motivo obrigatório (check `leads_descarte_tem_motivo`).
- **Escritas por coluna:** o app grava só as colunas de dados. `criado_por`, `atribuido_por`, `atribuido_em`, `ultima_interacao_*` e as datas são preenchidas por gatilho.
- **Gatilhos:**
  - `leads_guard`: carimba criador e atribuição, deixa quem não é o dono só trocar o dono, e protege a origem restrita (`lead_origens.restrita`).
  - `lead_interacao_atualiza_lead`: a interação grava no lead a última interação e o próximo contato. O front não precisa de duas escritas.
- **Funções novas:** `pode_atribuir_a(u)` e `origem_restrita(slug)`, `security definer` como as da base.
- **Permissões novas:** `leads.cadastrar` (corretor) e `leads.atribuir` (gerente). O padrão entra só quando a permissão é criada (`insert ... on conflict ... returning (xmax = 0)`), então rodar o schema de novo não desfaz ajustes.
- **Front:**
  - As regras puras (ordem da lista do dia, WhatsApp e datas) ficam em `crm/src/lib/leads.ts`, sem importar nada, para rodar no `node --test` direto do TypeScript (Node 24). Por isso o `tsconfig` tem `allowImportingTsExtensions`.
  - O início vira a lista do dia para quem tem `leads.cadastrar` e não tem `leads.atribuir` (`ehListaDoDia` em `casca.tsx`). A decisão é por permissão, não por perfil.
  - A ficha usa `/leads/ficha/?id=`, porque a exportação estática não gera rotas dinâmicas.
  - "Hoje" e "atrasado" usam o fuso do aparelho do corretor.

## Testes

- **Schema e RLS da base:** testados no PGlite (Postgres em WASM), com uma simulação do `auth.users`, do `auth.uid()` e dos papéis `anon` e `authenticated`. Foram 44 verificações por perfil, e o script rodou três vezes para provar que é idempotente. Esse script continua fora do repositório, na pasta de notas da sessão da base (`sqltest/test.mjs`). Ele conta 2 permissões fixas, então acusa 1 falha desde que as de leads entraram.
- **RLS de leads:** `crm/supabase/testes/leads.test.mjs`, com o mesmo tipo de simulação, roda com `npm run test:banco`. São 14 testes por perfil (corretor, colega, gerente da equipe, gerente de outra equipe, gerente geral, recepção, desativado e anônimo).
- **Lista do dia:** `crm/src/lib/leads.test.ts`, com `npm test`.
- **Scripts do SQL Editor:** `schema.sql`, `dados-teste.sql`, `verificar-rls.sql` e `limpar-dados-teste.sql` rodaram em sequência no PGlite em 29/10/2026, com o resultado esperado por perfil.
- **Telas:** conferidas em 375px com um Supabase falso (`sqltest/fake-supabase-leads.mjs`, na pasta de notas), que imita o RLS por perfil.
- **Ainda não validado:** o módulo de leads num Supabase real e a Edge Function pela tela.
