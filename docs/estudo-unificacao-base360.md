# Estudo · Unificar Vendas e Repasse num app só

**Para o Felipe decidir, com a Roberta · 5 de novembro de 2026 · só estudo, nada implementado**

## Sumário

- [Resposta curta](#resposta-curta)
- [1. Inventário dos dois](#1-inventário-dos-dois)
- [2. Caminhos](#2-caminhos)
- [3. Banco e login](#3-banco-e-login)
- [4. Hospedagem na Hostinger](#4-hospedagem-na-hostinger)
- [5. Recomendação](#5-recomendação)
- [6. Perguntas ao Felipe](#6-perguntas-ao-felipe)
- [Fontes e limites](#fontes-e-limites)

## Resposta curta

- **Hoje não compensa unificar.** Os quatro caminhos estão na tabela abaixo. O mais barato que põe o Repasse de verdade em `/repasse` é o **(c)**: um servidor Node só, com os dois repositórios separados. Custa de 3 a 5 semanas e depende de a Roberta testar o Lovable com o Repasse em `/repasse`. Os caminhos (a) e (b) são reescritas de 6 a 12 semanas e acabam com o fluxo dela no Lovable.
- **Qualquer caminho que divide o endereço desfaz o isolamento** que motivou a decisão de 05/11. A sessão do Vendas passa a dividir a origem com o código gerado pelo Lovable e com as dependências dele.
- **O mesmo Supabase para os dois é uma decisão à parte, e mais cara que a das rotas.** Há colisões diretas: `profiles`, `empreendimentos`, `handle_new_user` e o gatilho `on_auth_user_created`. Os modelos de perfil não se encaixam, e haveria dois mecanismos de migração no mesmo banco. A migração do Repasse para o `base360-prod` e a Hostinger vem **antes** de qualquer unificação (restrição da sessão da migração, 05/11/2026). Por isso, juntar os bancos só seria possível depois, numa segunda migração.
- **Recomendação:** manter o (d), como está, até o Repasse estabilizar na Hostinger. Reavaliar o (c) quando houver um motivo concreto, como dado comum entre os módulos ou reclamação de login duplo.

| Caminho | Esforço | Semanas* | Lovable da Roberta | Isolamento do Vendas |
|---|---|---|---|---|
| **(a)** Repasse vai para o Next do Vendas | G | 8 a 12 | Acaba | Perde |
| **(b)** Vendas vai para o TanStack Start do Repasse | G | 6 a 10 | Continua só se ela aceitar o código do Vendas no projeto dela; na prática, acaba | Perde |
| **(c)** Um servidor Node, dois repositórios, rotas por prefixo | M | 3 a 5 | Continua, se o `/repasse` funcionar na pré-visualização (NÃO VERIFICADO) | Perde |
| **(d)** Separados, com o portal e o redirecionamento (hoje) | P | 0 | Continua | Mantém |

\* Uma pessoa com o Claude, mais a validação da Roberta e do Felipe. São estimativas pelo tamanho do código medido, sem protótipo.

## 1. Inventário dos dois

### Tamanho e stack

| | Vendas (`crm/`) | Repasse (`base360-repo`) |
|---|---|---|
| Framework | Next.js 15, exportação estática (`output: "export"`) | TanStack Start 1.168 com Vite 8 e Nitro (`node-server` fora do Lovable, Cloudflare dentro dele) |
| React | 19 | 19 |
| CSS | Tailwind 3, classes próprias do DS MBigucci, sem biblioteca de componentes | Tailwind 4, shadcn/ui (cerca de 30 pacotes `@radix-ui`), ícones Lucide |
| Validação | zod **4** | zod **3**, react-hook-form |
| Outras dependências | `@supabase/supabase-js`, `clsx` (só isso) | TanStack Query, recharts, xlsx, date-fns, sonner, vaul, cmdk, embla, `@lovable.dev/*` |
| Código (`.ts`/`.tsx`, sem testes) | ~24.300 linhas | ~16.500 linhas, das quais ~1.640 são `types.ts` gerado e boa parte é `components/ui` |
| Gerenciador de pacotes | npm | bun no Lovable (`bun.lock`), npm na Hostinger (`package-lock.json`). Os dois arquivos divergem em 254 de 778 pacotes |
| Quem edita | Claude, por sessões e briefs | Roberta, no Lovable, com sync pelo GitHub (branch `main`) |
| Hospedagem | Arquivos estáticos em `base360.mbigucci.com.br/vendas/` | Lovable hoje; Hostinger Cloud Startup (app Node) em `repasse.mbigucci.com.br` após a migração |

### Telas e rotas

- **Vendas: 31 páginas além da raiz**, todas estáticas, e a ficha usa `?id=` porque a exportação estática não gera rota dinâmica:
  - `/entrar`, `/conta`, `/configuracoes`, `/usuarios`, `/equipes`;
  - `/leads`, `/leads/novo`, `/leads/ficha`, `/leads/quadro`, `/agenda`;
  - `/vendas`, `/metas`, `/faixas`, `/painel`;
  - `/programa`, `/programa/aprovacao`, `/plantao`, `/meus-pontos`, `/ranking`;
  - `/empreendimentos` (+ `ver`, `editar`, `importar`);
  - `/parceiros` (+ `novo`, `ficha`, `evento`);
  - `/recepcao` (+ `relatorio`, `stands`).
- **Repasse: 18 rotas de tela.**
  - Públicas: `/`, `/auth`, `/reset-password`.
  - Com login (`_authenticated`): `/dashboard`, `/contratos`, `/contratos/novo`, `/contratos/$id`, `/pendencias` (Kanban), `/relatorios`, `/previsao-assinatura`, `/previsao-assinatura-anteriores` e `/sla-vencidos`.
  - Administração: `/admin/usuarios`, `/admin/empresas`, `/admin/listas`, `/admin/unidades`, `/admin/alertas` e `/admin/backup`.

### Rotas de servidor do Repasse

O Repasse **precisa de servidor**. O Vendas não tem nenhum: o que exige a chave de serviço roda em Edge Function.

| Onde | O que faz | Usa |
|---|---|---|
| `api/public/backup.ts` (GET/POST) | Backup completo ou incremental em JSON ou SQL, para baixar ou gravar no bucket `backups`. Autentica por `x-backup-token` ou por chave de uso único gerada pelo banco (`solicitar_backup`) | chave de serviço, `BACKUP_TOKEN` |
| `api/public/sla-check.ts` (POST) | Chamada de hora em hora pelo `pg_cron`. Acha contratos com retorno vencido e grava `alertas_sla`. O guia de migração diz que hoje ela não faz nada útil (achado A-08) | chave de serviço |
| `users.functions.ts` (5) | `inviteUser`, `setUserAccess`, `resendInvites`, `updateUserIdentity` e `deleteUser`. Os convites saem por e-mail pelo Microsoft Graph | chave de serviço, `MS_*` |
| `mailer.functions.ts` (1) | `sendPasswordResetEmail` pelo Microsoft Graph | `MS_*` |
| `backup.functions.ts` (3) | Gerar backup, gerar e guardar, listar | chave de serviço |
| `restore.functions.ts` (3) | Analisar, fazer o backup antes e executar a restauração. O modo "substituir" apaga e regrava tabelas inteiras | chave de serviço |
| `security.functions.ts` (1) | `verificarAcesso`: bloqueio por tentativas (`tentativas_acesso`, `emails_bloqueados`) | chave de serviço |
| `auth-middleware.ts` | `requireSupabaseAuth`: confere o JWT nas funções de servidor | chave publicável |

São **13 funções de servidor e 2 rotas de API**. Também há SSR com uma página de erro própria (`src/server.ts`).

### Tabelas e migrações

| | Vendas | Repasse |
|---|---|---|
| Tabelas em `public` | 40: base (`profiles`, `roles`, `permissions`, `role_permissions`, `teams`, `app_settings`), leads, visitas, vendas e metas, programa, catálogo (`empreendimentos`, `tipologias`), avisos, perfil ampliado, recepção e parceiros | 25: `contratos` e cinco tabelas `contrato_*` (corretores, gerentes, especialistas, coordenadores), `unidades`, `empreendimentos`, `observacoes_repasse`, `pendencias_kanban`, `alertas_sla`, `fechamento_meses`, cadastros (bancos, cartórios, analistas, documentistas, mídias, empresas), `profiles`, `user_roles`, `saved_reports`, `backup_execucoes`, `tentativas_acesso`, `emails_bloqueados`, `app_config` |
| Como o banco muda | Arquivos idempotentes (`schema.sql`, `recepcao.sql`, `parcerias.sql`…, 6.856 linhas) rodados à mão no SQL Editor e testados no PGlite | 60 arquivos em `supabase/migrations` (até 06/10) e 9 em `drizzle/migrations` (`0000` a `0008`). Desde 02/10, o Lovable grava as mudanças com o drizzle e anota em `drizzle.__drizzle_migrations`. Após o corte, o mecanismo é o `drizzle-kit migrate` pelo GitHub Actions |
| Rotinas no banco | `pg_cron`: `crm-avisos` (5 min), limpeza diária e `crm-parcerias` (diária) | `pg_cron`: `base360-sla-check` (hora em hora), `base360-backup-incremental` e `base360-backup-completo` |
| Storage | Bucket privado `lead-documentos` | Bucket privado `backups` |
| Projeto Supabase | `crm-mbigucci`, São Paulo (produção desde 29/10/2026) | Lovable Cloud hoje; `base360-prod`, São Paulo, planejado. Pelo guia de 06/10, a Fase 2 (criar o projeto) e o corte ainda estavam pendentes. Não confirmei se já foram feitos |

A relação entre os dados: o Repasse grava corretores, gerentes e especialistas de cada contrato como **texto** (`contrato_corretores.nome`), sem ligação com usuários. O `empreendimentos` de cada lado tem colunas diferentes. Os dois sistemas falam das mesmas pessoas e dos mesmos empreendimentos, mas hoje não compartilham nenhum dado.

### Login e perfis

| | Vendas | Repasse |
|---|---|---|
| Login | E-mail e senha no Supabase. Cadastro aberto desligado. Contas criadas pela Edge Function `usuarios-admin` | E-mail e senha no Supabase (`signInWithPassword`). Convite e redefinição de senha por e-mail do Microsoft Graph. O pacote `@lovable.dev/cloud-auth-js` (OAuth Google, Apple e Microsoft pelo Lovable) existe em `src/integrations/lovable/`, mas **nenhuma tela o usa** |
| Novo usuário | Gatilho `on_auth_user_created` → `handle_new_user` cria o perfil | Gatilho com o mesmo nome e função com o mesmo nome, outro corpo. Há aprovação pelo administrador (`profiles.status`, `aprovado_em`) |
| Perfis | 6 perfis fixos em `roles`; permissões em `permissions` e `role_permissions`, editáveis; `has_permission()`; gerente geral implícito | Enum `app_role` (`admin`, `agente`, `empresa_repasse`, `departamento`) em `user_roles`, mais `profiles.modulos`, `permissoes`, `module_permissions` (JSON) e booleanos (`pode_fechar_competencia`…); `has_role()` e `has_module_permission()` |
| RLS | Toda a segurança. Funções `security definer`, GRANT por coluna, gatilhos de guarda | Também por RLS (`can_read_contrato`, `can_edit_contrato`, `pode_lancar`…), mais as funções de servidor com a chave de serviço |

### PWA e service worker

| | Vendas | Repasse |
|---|---|---|
| Manifest | `crm/public/manifest.webmanifest`, caminhos relativos, nome "Base360" | `public/manifest.webmanifest` |
| Service worker | `crm/public/sw.js`, escopo `/vendas/`, **só avisos** (push), sem cache e sem `fetch` | Workbox (`vite-plugin-pwa`). Guarda cópias das páginas (`NetworkFirst`) e de `/assets/` (`CacheFirst`). Registrado com **`scope: "/"`** (`src/lib/register-sw.ts:50`) e recarrega a aba quando muda |
| Push | Web Push pela Edge Function `avisos` | Não tem |

**Consequência:** no mesmo endereço, o service worker do Repasse controlaria também as páginas de `/vendas/` e serviria cópias delas. Em qualquer caminho que divide o endereço, o escopo e as regras têm de ir para `/repasse/`.

## 2. Caminhos

### (a) O Repasse vai para o Next do Vendas

- **O que é:** reescrever as 18 telas do Repasse como páginas estáticas do Next, dentro de `crm/`, em `/repasse/...`.
- **Esforço: G, 8 a 12 semanas.**
  - Tirar o servidor: as 13 funções e as 2 rotas viram Edge Functions no Supabase. Backup e restauração são as mais pesadas: geram arquivos grandes e podem passar do limite de tempo de uma Edge Function (NÃO VERIFICADO; o backup completo faz cerca de 28 consultas).
  - Trocar o roteamento do TanStack (`createFileRoute`, loaders e `$id`, que vira `?id=`) e o SSR por páginas no navegador.
  - Levar o shadcn e o Tailwind 4 para o Tailwind 3 do Vendas, ou subir o Vendas para o 4. Alinhar o zod 3 com o 4.
  - Refazer o service worker, os relatórios de 1.100 linhas e a importação por planilha (`xlsx`).
- **Riscos:**
  - Regressão num sistema financeiro em uso, com regras de competência, prazo de arrependimento e fechamento de mês.
  - Backup e restauração, que já têm falhas conhecidas (itens 10 a 12 do guia de migração), passam para outra plataforma.
- **O que se perde:**
  - O fluxo da Roberta no Lovable **acaba**: o Lovable não edita projeto Next.
  - O isolamento de origem do Vendas.
  - O histórico do Repasse vira código novo.

### (b) O Vendas vai para o TanStack Start do Repasse

- **O que é:** levar as 31 páginas do Vendas para dentro do projeto do Repasse, em `/vendas/...`.
- **Esforço: G, 6 a 10 semanas.**
  - Trocar `next/link`, `next/navigation` (`useRouter`, `useSearchParams`), `layout.tsx` e `metadata` pelo equivalente do TanStack.
  - Passar o CSS do Tailwind 3 para o 4 (outra configuração) e rever o visual tela a tela, em 375px e no desktop.
  - Os testes puros (`node --test`) e os de banco continuam. Os de tela, com o Supabase falso, precisam ser refeitos.
  - O Vendas deixa de ser estático e passa a depender do servidor Node do Repasse.
- **Riscos:**
  - O Vendas é maior que o Repasse e ainda não foi a campo.
  - O Lovable passa a ver as 24 mil linhas do Vendas. A IA dele pode alterar telas do Vendas quando a Roberta pedir algo do Repasse.
- **O que se perde:**
  - Dentro do Lovable, as convenções do Vendas (DS MBigucci, permissões por tabela, RLS testado) ficam sem guarda.
  - O fluxo da Roberta continua só no papel: ela passaria a editar um projeto com o dobro do tamanho e duas equipes mexendo. Na prática, ou ela deixa de usar o Lovable, ou o Vendas sai do controle das sessões do Claude.
  - O isolamento do Vendas.

### (c) Um servidor Node, rotas por prefixo e um único site

Há duas formas, e só a segunda preserva o Lovable.

- **(c1) Monorepo**, com `apps/vendas` e `apps/repasse` num repositório só.
  - O Lovable espera o app na raiz do repositório ligado a ele. Com o Repasse numa subpasta, o sync provavelmente quebra (NÃO VERIFICADO).
  - Reconectar o Lovable a outro repositório cria um repositório novo e perde o histórico do Git (guia de migração, item 15).
  - **Não recomendado.**
- **(c2) Dois repositórios, uma publicação.** O Repasse continua no repositório dele e no Lovable. Na Hostinger, o servidor Node do Repasse passa a responder por `base360.mbigucci.com.br` inteiro:
  - `/` serve o portal estático;
  - `/vendas/` serve os arquivos estáticos do Vendas, a mesma pasta `out/` de hoje, copiada para a pasta pública do servidor na publicação;
  - `/repasse/` é o próprio Repasse, com `basepath` `/repasse` no roteador e `base` `/repasse/` no Vite.
  - Quem junta é o GitHub Actions do Repasse (`publicar-producao.yml`). Ele baixa o `out/` do Vendas, gerado pelo repositório do CRM, antes do build.
- **Esforço: M, 3 a 5 semanas.**
  - Configurar o `basepath` e ajustar os caminhos absolutos do Repasse: `/auth`, `/api/public/*`, `APP_PUBLIC_URL`, os links de convite, o `sla-check` e o backup chamados pelo `pg_cron`.
  - Mover o service worker e o manifest do Repasse para o escopo `/repasse/`.
  - Trocar o Site URL e as Redirect URLs do Auth no Supabase do Repasse, ou os links de convite e de redefinição de senha quebram.
  - Servir o Vendas e o portal pelo Nitro, reproduzindo o que hoje faz o `.htaccess`: `trailingSlash`, redirecionamentos e o 301 de `mbigucci.com.br/crm/`.
  - Testar cada publicação nos dois módulos.
- **Riscos:**
  - **Pré-visualização do Lovable:** ela roda na raiz, e o build do Lovable gera para Cloudflare. Com o `basepath`, uma das duas pode quebrar (NÃO VERIFICADO). Só a Roberta consegue testar, num projeto de teste.
  - A IA do Lovable pode desfazer o `basepath` ou o escopo do service worker numa edição.
  - Se o servidor Node cair, o Vendas também sai do ar. Hoje ele é estático e independe do Repasse.
  - A publicação do Vendas passa a depender do pipeline do Repasse, que ainda nem foi ao ar.
- **O que se perde:**
  - O isolamento de origem do Vendas.
  - A independência das duas publicações.

### (d) Separados, como hoje

- **O que é:** `base360.mbigucci.com.br` é estático, com o portal na raiz, o Vendas em `/vendas/` e `/repasse` redirecionando (302) para `repasse.mbigucci.com.br`.
- **Esforço: P, já feito.** O que sobra é trocar o destino do 302 no corte do Repasse.
- **Riscos:**
  - Dois logins.
  - Dois apps instalados no celular: "Base360" (Vendas) e "BASE 360º" (Repasse, manifest com escopo `/`).
  - O endereço muda ao entrar no Repasse.
- **O que se perde:** nada que já exista.
- **Fluxo da Roberta:** igual a hoje.

## 3. Banco e login

### Se os dois usarem o mesmo projeto Supabase

**O que se ganha:**
- um cadastro de pessoas e um login só, com a mesma sessão nos dois módulos se estiverem na mesma origem;
- um catálogo de empreendimentos;
- a possibilidade de ligar o contrato do Repasse à venda do Vendas, em vez de digitar o nome do corretor;
- um projeto Supabase a menos: até US$ 25/mês se hoje estão em organizações separadas, ou cerca de US$ 10 de computação se estão na mesma (o Pro é cobrado por organização, guia de migração, seção 4).

**Colisões que precisam ser resolvidas antes:**

| Objeto | Vendas | Repasse | Efeito se juntar |
|---|---|---|---|
| `public.profiles` | Nome, perfil, equipe, ativo, WhatsApp; GRANT por coluna | Status de aprovação, módulos, permissões em JSON, empresa de repasse | Mesma tabela com dois significados. Uma tem de mudar de nome ou ir para outro schema |
| `public.empreendimentos` | Catálogo com tipologias, preço e slug | Nome, empresa, entrega, total de unidades | Mesmo caso. Juntar exige um catálogo único e mexer nas duas telas |
| `handle_new_user` e o gatilho `on_auth_user_created` | Cria o perfil do Vendas | Cria o perfil do Repasse | O `schema.sql` do Vendas faz `drop trigger if exists on_auth_user_created` e recria o gatilho. **Rodar o schema quebraria em silêncio o cadastro de usuários do Repasse**, e o inverso também |
| Perfis | `roles`, `permissions`, `role_permissions`, `has_permission()` | `app_role`, `user_roles`, `module_permissions`, `has_role()` | Modelos incompatíveis. Unificar exige escolher um e reescrever as policies do outro |
| Migrações | `schema.sql` idempotente, rodado à mão | `drizzle-kit migrate` pelo GitHub Actions, alimentado pelo Lovable | Dois mecanismos no mesmo banco, nenhum enxerga o outro |
| Backup e restauração do Repasse | — | Copiam e, no modo "substituir", apagam e regravam tabelas inteiras com a chave de serviço | Precisariam ficar restritos às tabelas do Repasse, ou uma restauração apagaria dados do Vendas |

**O risco maior é o RLS.** A IA do Lovable gera SQL a partir do que a Roberta pede. Num banco único, ela pode alterar uma policy de `profiles` ou uma função auxiliar de que o RLS do Vendas depende, sem que os testes do Vendas rodem. A segurança do Vendas depende só do RLS (`crm-arquitetura.md`). Um banco único só é seguro com:
- as tabelas de cada módulo em schemas separados (`vendas`, `repasse`), expostos na API;
- a tabela de pessoas comum fora do alcance do Lovable;
- os testes de banco do Vendas rodando no CI do Repasse.

**Custo: G, 4 a 8 semanas**, além do caminho de rotas escolhido. A maior parte cai no Repasse, que referencia `profiles` e `empreendimentos` em todo o código, e no `types.ts` gerado.

**Migração de dados e de usuários:**
- **Antes do corte (descartado):** em tese, daria para restaurar o Repasse direto no `crm-mbigucci` em vez de no `base360-prod`. Mas isso atrasaria o corte para resolver as colisões, e a regra combinada é terminar a migração primeiro. Fica fora.
- **Depois do corte (o único possível, e caro):** uma segunda migração com o Repasse em produção, mais um congelamento das edições pelo Lovable. Também exige conciliar papéis e permissões, como os gatilhos `security definer` `validate_contrato_module_permissions`, `has_module_permission` e `has_role`. E `src/integrations/supabase/*` é gerado pelo Lovable, então os tipos teriam de vir do banco novo.
- **Usuários:** quem existe nos dois bancos com o mesmo e-mail vira uma conta só. É preciso decidir qual senha vale: o hash vem de um dos lados, e a pessoa redefine a do outro. Os IDs mudam para um dos lados, e todas as chaves estrangeiras para `auth.users` (`criado_por`, `aprovado_por`, `autorizado_por`…) têm de ser remapeadas.

### Se continuarem separados, com um login único

- O Supabase não tem login único entre dois projetos Supabase. O "login com terceiros" dele aceita provedores externos, não outro projeto Supabase (a lista exata está por conferir na documentação).
- **Opção realista: "Entrar com Microsoft" (Entra ID) nos dois projetos.** A empresa usa Microsoft 365, e a TI já registra um aplicativo para o Microsoft Graph do Repasse.
  - Cada projeto Supabase ganha o provedor Azure.
  - A pessoa entra com a conta da empresa. A sessão da Microsoft no navegador faz o segundo login sair num clique, sem senha.
  - **Esforço: P a M, 1 a 2 semanas**, com a TI e testes nos dois apps.
  - O cadastro e a aprovação continuam em cada módulo.
  - Exige que todos os usuários tenham conta Microsoft da empresa. Corretores parceiros e a recepção talvez não tenham (a confirmar).
- **Sem fazer nada:** cada módulo com sua senha, como hoje. Duas sessões na mesma origem não se misturam, porque o `supabase-js` guarda cada uma com a chave do seu projeto.

## 4. Hospedagem na Hostinger

A Hostinger não aceita dois níveis de subdomínio (`vendas.base360…`). Os caminhos (a) a (d) resolvem isso porque usam um subdomínio só, `base360.mbigucci.com.br`, com pastas.

| Caminho | O que o `base360.mbigucci.com.br` precisa ser | Observações |
|---|---|---|
| (a) | **Site estático**, como hoje | O servidor some. Backup, SLA e e-mails viram Edge Functions e `pg_cron`. O plano atual basta |
| (b) | **App Node** | O Vendas deixa de ser estático. Sites → app → "Conectar domínio" no `base360`, e o site estático atual sai |
| (c2) | **App Node** (o do Repasse), que também serve o portal e o `out/` do Vendas | O `.htaccess` do portal e o `repasse/index.html` deixam de valer, porque o Node não lê `.htaccess`. Os redirecionamentos vão para o código do servidor. Não verifiquei se o Nitro serve `vendas/index.html` para `/vendas/` com o `trailingSlash`, nem o tipo do `.webmanifest`. O `repasse.mbigucci.com.br` vira redirecionamento para `/repasse` |
| (d) | **Site estático** para o portal e o Vendas, **app Node** à parte em `repasse.mbigucci.com.br` | É o que está decidido. O Cloud Startup aceita até 10 apps Node (guia de migração, item 1) |

O endereço antigo `mbigucci.com.br/crm/` continua com o 301 do WordPress em qualquer caminho.

## 5. Recomendação

1. **Ficar no (d) agora.** Não há dado comum entre os módulos, e o Repasse ainda não fez o corte para a Hostinger. Os caminhos (a), (b) e (c) também desfazem o isolamento de origem que motivou o site próprio em 05/11.
2. **Bancos separados.** A migração do Repasse termina primeiro, sem mudanças no `base360-repo` por causa deste estudo. Juntar os bancos depois seria uma segunda migração, e as colisões e os dois mecanismos de migração custam mais do que o login comum economiza.
3. **Nada muda no `base360-repo` até a virada.** O que vale preparar depois dela, se o (c2) for escolhido, é a lista da seção 2 (base do Vite, `basepath`, escopo do PWA, `APP_PUBLIC_URL` e Redirect URLs).
4. **Se o login duplo incomodar, "Entrar com Microsoft" nos dois** resolve com 1 a 2 semanas, sem unificar nada. No Repasse, só depois da virada.
5. **Reavaliar o (c2) só com um motivo concreto**, como ligar o contrato à venda. E só depois de:
   - o Repasse estar estável na Hostinger;
   - a Roberta confirmar, num projeto de teste do Lovable, que a pré-visualização funciona com `basepath` `/repasse`.

## 6. Perguntas ao Felipe

Uma de cada vez. A primeira opção é a recomendada. As perguntas 2 a 4 precisam da Roberta na conversa.

1. **Unificar as rotas agora?**
   - **A (recomendada):** não. Ficar no (d) e reavaliar depois do corte do Repasse.
   - **B:** planejar o (c2) para depois do corte, começando pelo teste do `basepath` com a Roberta.
   - **C:** reescrever um dos dois, pelo caminho (a) ou (b).
2. **Vendas e Repasse no mesmo Supabase?**
   - **A (recomendada):** não. Bancos separados, cada um com seu dono.
   - **B:** sim, numa segunda migração depois da virada do Repasse, com o congelamento do Lovable e a conciliação dos perfis.
   - **C:** adiar. Se surgir dado comum, ligar por uma consulta entre os dois (Edge Function), sem juntar bancos.
3. **Login único?**
   - **A (recomendada):** só se os usuários reclamarem. Quando reclamarem, "Entrar com Microsoft" nos dois, com a TI.
   - **B:** fazer agora o "Entrar com Microsoft".
   - **C:** ficar com senha separada em cada módulo.

   Antes de B, é preciso confirmar se todo usuário do Vendas tem conta Microsoft da empresa.
4. **Quem precisa estar na decisão do (c2), se um dia for por ele?**
   - **A (recomendada):** a Roberta testa a pré-visualização do Lovable com `/repasse`, e o Felipe decide com o resultado.
   - **B:** o Felipe decide primeiro, e a Roberta adapta.

## Fontes e limites

- **Vendas:**
  - `docs/crm-arquitetura.md`, `marca/tokens/README.md` e `docs/estudo-design.md`;
  - `crm/package.json`, `crm/src/app/**/page.tsx` e `crm/supabase/*.sql` (tabelas, funções e `cron.schedule`).
- **Repasse, só leitura, branch `migracao-hostinger` em `e50de48` (26/10/2026):**
  - `package.json`, `vite.config.ts`, `src/routes/**`, `src/lib/*.functions.ts` e `src/lib/register-sw.ts`;
  - `src/integrations/supabase/types.ts`, `src/integrations/lovable/index.ts`, `supabase/migrations/` e `drizzle/migrations/`;
  - `docs/MIGRACAO-SUPABASE-HOSTINGER.md`, versão de 06/10/2026.
- **Não feito:** build, instalação e consulta a banco nos dois repositórios, e nenhum teste do `basepath` no Lovable.
- **NÃO VERIFICADO:**
  - as semanas, que são estimativas por tamanho;
  - o comportamento do Lovable com `basepath` ou com monorepo;
  - como o Nitro serve as pastas estáticas;
  - a lista de provedores do login com terceiros do Supabase;
  - se o `base360-prod` já existe.
