# CRM MBigucci (Fase 2 · fundação)

O CRM dos corretores, no visual do MBigucci Design System. É um site **estático**, como a pesquisa da Fase 1. Ele fica numa pasta do servidor do WordPress, sem Node e sem plugin. O login e os dados vêm do **Supabase**, direto do navegador. Quem garante que cada pessoa só vê o que pode são as regras de segurança do banco (RLS), descritas no fim deste arquivo.

Esta versão tem o login, os usuários, as equipes, as permissões por perfil, as chaves do sistema e o primeiro corte do módulo de leads (lista do dia, cadastro rápido, ficha, quadro por etapas e atribuição pelo gerente, descritos em `docs/leads.md`). As próximas telas entram nas próximas etapas.

## 1. Criar o projeto no Supabase (uma vez)

1. Em [supabase.com](https://supabase.com), crie um projeto (**New project**). Use a região **South America (São Paulo)** e guarde a senha do banco num lugar seguro.
2. Em **Authentication > Sign In / Providers**:
   - Desligue **Allow new users to sign up**. Ninguém se cadastra sozinho: é você quem cria as contas.
   - Deixe o provedor **Email** ligado.
3. Em **Authentication > URL Configuration**, coloque `https://mbigucci.com.br/crm/` em **Site URL**.

## 2. Rodar o schema

1. Abra **SQL Editor > New query**.
2. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.

O script pode ser rodado de novo sempre que ele mudar. Ele não apaga dados e não desfaz as permissões que você ajustou no app.

## 3. Publicar a função que cria usuários

Para criar uma conta no Supabase é preciso a chave de serviço, que dá acesso total ao banco. Ela **nunca** pode ir para o site, porque o código do site é público. Por isso a criação de contas roda numa Edge Function, dentro do próprio Supabase.

1. Abra **Edge Functions > Deploy a new function > Via Editor**.
2. Dê o nome `usuarios-admin`, exatamente assim.
3. Apague o exemplo, cole o conteúdo de `supabase/functions/usuarios-admin/index.ts` e clique em **Deploy**.

Se o app mostrar "Invalid JWT" ao criar um usuário, abra a função em **Details** e desligue **Verify JWT with legacy secret**. A própria função confere o login e a permissão de quem chama.

## 4. Criar o primeiro gerente geral (você)

1. Em **Authentication > Users > Add user > Create new user**, informe seu e-mail e uma senha, e marque **Auto Confirm User**.
2. No **SQL Editor**, rode o comando abaixo, trocando o e-mail se for outro:

```sql
update public.profiles
set perfil = 'gerente_geral', ativo = true, nome = 'Felipe'
where email = 'felipe@mbigucci.com.br';
```

Das próximas contas em diante, use o próprio CRM, na tela **Usuários**.

## 5. Gerar o build

1. Em **Project Settings > API Keys**, copie a **Project URL** e a chave **anon / publishable**. Essa chave é pública por natureza. A outra, **service_role / secret**, nunca vai para o site.
2. Crie o arquivo `.env.local` a partir do `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave anon / publishable>
BASE_PATH=/crm
```

3. Rode:

```bash
npm install
```

```bash
npm run build
```

O build gera a pasta `out/`.

## 6. Subir no WordPress

1. Pelo FTP ou pelo gerenciador de arquivos da hospedagem, crie a pasta `crm` na raiz do site, onde ficam `wp-config.php` e `wp-content`.
2. Envie **o conteúdo** de `out/` para dentro dela.
3. Coloque o logo em `crm/mbigucci-logo.png`, o mesmo arquivo da pesquisa. Sem ele, o cabeçalho mostra "MBigucci" em texto vermelho.
4. Abra `https://mbigucci.com.br/crm/` e entre com a conta do passo 4.

O WordPress não interfere, porque o `.htaccess` dele serve as pastas reais antes das páginas do WP. Para usar outra pasta, mude `BASE_PATH`, gere o build de novo e atualize a **Site URL** do passo 1.

## 7. Primeiro uso

1. **Usuários > Novo usuário**: crie primeiro os **gerentes**, com uma senha provisória.
2. **Equipes > Nova equipe**: crie as equipes e escolha o gerente de cada uma.
3. **Usuários > Novo usuário**: crie os corretores, já escolhendo a equipe de cada um.
4. Passe o e-mail e a senha provisória a cada pessoa. Ela troca a senha em **Minha conta**.

Se alguém esquecer a senha, abra a pessoa em **Usuários > Editar** e use **Redefinir senha**.

Quando alguém sair da empresa, **desative** a conta em vez de excluí-la. Quem está desativado não entra no CRM nem vê dados, e o histórico continua no banco.

## Perfis e permissões

Os perfis são: gerente geral, operacional, gerente, corretor, recepção e especialista. O que cada perfil pode fazer fica na tabela `role_permissions`, e você ajusta isso em **Configurações > Permissões por perfil**, sem mexer no código. Por isso o operacional e o especialista podem ser definidos depois.

| Permissão | Para que serve | Padrão |
| --- | --- | --- |
| `usuarios.gerenciar` | Criar contas e mudar perfil, equipe e situação | Só o gerente geral |
| `equipes.gerenciar` | Criar, renomear e excluir equipes e trocar o gerente | Só o gerente geral |
| `dados.ver_todos` | Ver os dados de todas as equipes | Só o gerente geral |
| `dados.ver_equipe` | Ver os dados dos corretores da própria equipe | Gerente |
| `leads.cadastrar` | Cadastrar e trabalhar os próprios leads | Corretor |
| `leads.atribuir` | Cadastrar leads da empresa e atribuir a corretores da equipe | Gerente |

- O **gerente geral** tem todas as permissões, sempre, sem depender da tabela. Assim ele não consegue se trancar fora por engano.
- Algumas regras ficam fixas no banco, para não dependerem de configuração:
  - Só o gerente geral altera um gerente geral.
  - Só o gerente geral liga ou desliga as chaves.
  - Só o gerente geral muda as permissões.
  - Sempre existe ao menos um gerente geral ativo.
- Cada corretor **ativo** está em exatamente uma equipe. O **gerente** é ligado à equipe como gerente dela e não é membro: ele não vende nem pontua. O gerente geral também não é membro de equipe.
- Uma equipe só pode ser excluída depois que ninguém mais estiver nela. Um gerente só muda de perfil depois que outra pessoa assumir as equipes dele.

## Sigilo do programa de verba

A chave `programa_verba_ativo`, que começa desligada, está em **Configurações > Chaves**. Quando ela for ligada, depois da reunião de novembro/2026, as próximas etapas vão mostrar a verba, os pontos e o ranking a corretores e gerentes. Até lá, o sigilo é protegido em três camadas:

- **Banco:** a tabela `app_settings` só é lida pelo gerente geral. Nenhum outro perfil sabe sequer que a chave existe.
- **Código do site:** o código não cita a chave. Qualquer pessoa pode baixar os arquivos de `out/`, então o nome e a descrição da chave vêm do banco. A palavra "verba" não aparece no build.
- **Regras futuras:** as policies das próximas etapas vão usar a função `private.programa_verba_ativo()`. Ela fica no schema `private`, que a API do Supabase não expõe.

## Segurança (RLS)

Todas as tabelas têm **Row Level Security** ligado. Visitantes sem login, que usam só a chave anon, não leem nada. O usuário logado só vê e altera o que as policies permitem. O app não tem nenhum acesso extra: ele usa as mesmas regras que valeriam para qualquer pessoa chamando a API diretamente.

Um **usuário desativado** perde todas as permissões na hora. Ele continua vendo só o próprio perfil, para que o app possa avisar "conta desativada".

### Funções auxiliares

| Função | Retorna |
| --- | --- |
| `current_perfil()` | O perfil do usuário logado, ou `null` se ele estiver desativado |
| `is_gerente_geral()` | Se o usuário logado é gerente geral ativo |
| `has_permission(p)` | Se o perfil do usuário logado tem a permissão `p` (o gerente geral tem todas) |
| `minha_equipe()` | A equipe do usuário logado |
| `is_my_team_member(u)` | Se `u` está numa equipe da qual o usuário logado é o gerente ativo |
| `pode_ver_dados_de(u)` | Se o usuário logado pode ver os dados de `u`: ele mesmo, o gerente da equipe de `u` com `dados.ver_equipe`, ou quem tem `dados.ver_todos` |

`pode_ver_dados_de` é a regra que as tabelas das próximas etapas (leads, agenda, visitas) vão usar. Assim:

- o corretor vê só os próprios dados;
- o gerente vê os dados da equipe dele;
- o gerente geral vê tudo.

### Policies

| Tabela | Ler | Alterar |
| --- | --- | --- |
| `profiles` | O próprio perfil, quem passa em `pode_ver_dados_de` ou quem tem `usuarios.gerenciar` | Quem tem `usuarios.gerenciar`, e só as colunas nome, perfil, equipe e ativo. O e-mail vem do Auth. Contas são criadas pela Edge Function e não há exclusão pelo app. |
| `teams` | Quem gerencia equipes ou usuários, quem vê todas as equipes, o gerente da equipe e os membros dela | Criar, editar e excluir: quem tem `equipes.gerenciar` |
| `roles`, `permissions` | Qualquer usuário ativo, porque o app monta o menu com elas | Ninguém pelo app, só pelo SQL Editor |
| `role_permissions` | Qualquer usuário ativo | Conceder e retirar: só o gerente geral |
| `app_settings` | Só o gerente geral | Só o gerente geral, e só a coluna valor. Cada mudança registra quem fez e quando. |
| `lead_origens`, `lead_etapas` | Qualquer usuário ativo | Ninguém pelo app. Ajuste as opções no Table Editor. |
| `leads` | `pode_ver_dados_de(dono)`: o corretor vê os dele, o gerente os da equipe, o gerente geral todos | Cadastrar: o corretor, para si, fora da origem Empresa; ou quem tem `leads.atribuir`, para um corretor ativo da equipe. Alterar: o dono; quem atribui só troca o dono. Sem exclusão. |
| `lead_interacoes` | Quem vê o lead | Registrar: só o dono do lead. Sem edição nem exclusão. |

### Gatilhos que completam as policies

- **Conta nova no Auth:** cria o perfil, desativado e como corretor, até alguém ajustar.
- **E-mail trocado no Auth:** atualiza o e-mail no perfil.
- **Edição de perfil:** aplica as regras fixas da seção "Perfis e permissões" (gerente geral, gerente com equipe, gerente fora de equipe).
- **Equipe:** o gerente escolhido precisa ter o perfil Gerente.
- **Lead:** carimba quem criou e quem atribuiu, deixa quem não é o dono só trocar o dono e protege a origem Empresa.
- **Interação:** grava no lead a última interação e o próximo contato.

### Como o schema foi testado

O `schema.sql` foi rodado três vezes seguidas num Postgres 18 (PGlite). Para isso, o teste simulou o `auth.users`, o `auth.uid()` e os papéis `anon` e `authenticated` do Supabase. Depois, 44 verificações conferiram o que cada perfil vê e consegue alterar (gerente geral, gerente, corretor, recepção, operacional com permissão extra, usuário desativado e visitante anônimo).

Em 29/10/2026 o schema rodou no projeto Supabase de produção (`crm-mbigucci`, São Paulo).

- **RLS:** foi conferido com `supabase/dados-teste.sql` e `supabase/verificar-rls.sql`. Com 2 gerentes, 2 equipes e 2 corretores de teste, cada perfil viu exatamente o esperado:
  - o gerente geral vê todos e as chaves;
  - cada gerente vê só a própria equipe;
  - cada corretor vê só a si mesmo.
- **Para refazer o teste:** rode os dois scripts de novo. Depois apague os dados com `supabase/limpar-dados-teste.sql`.
- **Ainda falta:** testar pela tela do CRM a criação de usuários pela Edge Function. Ela só foi testada sem login, quando recusou corretamente.

## Desenvolvimento

```bash
npm run dev
```

Abra `http://localhost:3000/crm`. Sem o `.env.local`, as telas avisam que o Supabase não está configurado.

```bash
npm run typecheck
```

Testes da lista do dia:

```bash
npm test
```

Teste do schema e do RLS de leads num Postgres local (PGlite), sem tocar no Supabase:

```bash
npm run test:banco
```
