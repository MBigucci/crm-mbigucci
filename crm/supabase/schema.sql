-- =====================================================================
-- CRM MBigucci — esquema do banco (fundação: usuários, perfis, equipes)
-- Como usar: Supabase → SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema (é idempotente). As permissões que o
-- gerente geral já tiver ajustado no app não são sobrescritas.
-- =====================================================================

-- Funções que não devem aparecer na API pública (o schema "private" não é
-- exposto pelo Supabase). Ficam aqui as que tratam do programa sigiloso.
create schema if not exists private;

-- ---------- Perfis e permissões ----------
-- Os perfis são fixos; o que cada um pode fazer fica em role_permissions e
-- é editado pelo gerente geral no app (Configurações → Permissões).

create table if not exists public.roles (
  slug   text primary key,
  nome   text not null,
  ordem  integer not null default 0
);

insert into public.roles (slug, nome, ordem) values
  ('gerente_geral', 'Gerente geral', 1),
  ('operacional',   'Operacional',   2),
  ('gerente',       'Gerente',       3),
  ('corretor',      'Corretor',      4),
  ('recepcao',      'Recepção',      5),
  ('especialista',  'Especialista',  6)
on conflict (slug) do update set nome = excluded.nome, ordem = excluded.ordem;

create table if not exists public.permissions (
  slug       text primary key,
  descricao  text not null,
  ordem      integer not null default 0
);

-- Só permissões que podem ser vistas por qualquer usuário logado. As do
-- programa sigiloso entram numa sessão futura, perto do lançamento.
insert into public.permissions (slug, descricao, ordem) values
  ('usuarios.gerenciar', 'Cadastrar usuários e definir perfil, equipe e situação', 1),
  ('equipes.gerenciar',  'Criar equipes e escolher o gerente de cada uma',        2),
  ('dados.ver_todos',    'Ver os dados de todas as equipes',                      3),
  ('dados.ver_equipe',   'Ver os dados dos corretores da própria equipe',         4)
on conflict (slug) do update set descricao = excluded.descricao, ordem = excluded.ordem;

create table if not exists public.role_permissions (
  perfil     text not null references public.roles (slug) on delete cascade,
  permissao  text not null references public.permissions (slug) on delete cascade,
  primary key (perfil, permissao)
);

-- Padrão inicial (só na primeira vez). O gerente geral tem todas as
-- permissões sempre, sem precisar de linha aqui: assim ele não se tranca fora.
insert into public.role_permissions (perfil, permissao)
select v.perfil, v.permissao
from (values ('gerente', 'dados.ver_equipe')) as v (perfil, permissao)
where not exists (select 1 from public.role_permissions);

-- ---------- Usuários ----------
-- Um perfil por conta do Auth. A linha nasce sozinha (gatilho abaixo) quando o
-- gerente geral cria o usuário, desativada e como corretor até ser ajustada.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null default '',
  nome        text not null default '',
  perfil      text not null default 'corretor' references public.roles (slug),
  equipe_id   uuid,
  ativo       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- O gerente é ligado à equipe por teams.gerente_id; ele não é membro dela
  -- (não vende nem pontua). O gerente geral também não é membro de equipe.
  constraint profiles_gerentes_fora_de_equipe
    check (equipe_id is null or perfil not in ('gerente', 'gerente_geral')),
  -- Todo corretor ativo pertence a exatamente uma equipe.
  constraint profiles_corretor_ativo_tem_equipe
    check (not ativo or perfil <> 'corretor' or equipe_id is not null)
);

-- ---------- Equipes ----------

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(btrim(nome)) > 0),
  gerente_id  uuid not null references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists teams_nome_unico on public.teams (lower(btrim(nome)));
create index if not exists teams_gerente_id_idx on public.teams (gerente_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_equipe_id_fkey') then
    alter table public.profiles
      add constraint profiles_equipe_id_fkey
      foreign key (equipe_id) references public.teams (id) on delete restrict;
  end if;
end;
$$;

create index if not exists profiles_equipe_id_idx on public.profiles (equipe_id);

-- ---------- Configurações ----------
-- Chaves do sistema. Só o gerente geral lê e altera. O rótulo e a descrição
-- ficam aqui, e não no código do site, porque o código é público.

create table if not exists public.app_settings (
  chave       text primary key,
  valor       jsonb not null,
  rotulo      text not null,
  descricao   text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);

insert into public.app_settings (chave, valor, rotulo, descricao) values
  ('programa_verba_ativo', 'false'::jsonb, 'Programa de verba ativo',
   'Mostra a verba de leads, os pontos que viram verba e o ranking para corretores e gerentes. Ligue só depois da reunião de novembro/2026.')
on conflict (chave) do update set rotulo = excluded.rotulo, descricao = excluded.descricao;

-- ---------- Funções auxiliares (usadas nas policies) ----------
-- security definer: leem profiles/teams sem passar pelo RLS (evita recursão).
-- Usuário desativado não tem perfil efetivo: perde todas as permissões.

create or replace function public.current_perfil()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.perfil from public.profiles p where p.id = auth.uid() and p.ativo;
$$;

create or replace function public.is_gerente_geral()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_perfil() = 'gerente_geral', false);
$$;

create or replace function public.has_permission(p_permissao text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_gerente_geral()
      or exists (
        select 1 from public.role_permissions rp
        where rp.perfil = public.current_perfil() and rp.permissao = p_permissao
      );
$$;

-- Equipe do usuário logado (corretor ativo); null para os demais.
create or replace function public.minha_equipe()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.equipe_id from public.profiles p where p.id = auth.uid() and p.ativo;
$$;

-- p_user é membro de uma equipe da qual o usuário logado é o gerente (ativo).
create or replace function public.is_my_team_member(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles m
    join public.teams t on t.id = m.equipe_id
    join public.profiles g on g.id = t.gerente_id
    where m.id = p_user and g.id = auth.uid() and g.ativo and g.perfil = 'gerente'
  );
$$;

-- Regra geral de visibilidade dos dados de um corretor (leads, agenda etc.):
-- o próprio, o gerente da equipe dele ou quem vê todas as equipes.
create or replace function public.pode_ver_dados_de(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (p_user = auth.uid() and public.current_perfil() is not null)
      or public.has_permission('dados.ver_todos')
      or (public.has_permission('dados.ver_equipe') and public.is_my_team_member(p_user));
$$;

create or replace function private.programa_verba_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.valor = 'true'::jsonb from public.app_settings s where s.chave = 'programa_verba_ativo'), false);
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.current_perfil()', 'public.is_gerente_geral()', 'public.has_permission(text)',
    'public.minha_equipe()', 'public.is_my_team_member(uuid)', 'public.pode_ver_dados_de(uuid)',
    'private.programa_verba_ativo()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- ---------- Gatilhos ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

create or replace function public.app_settings_carimbo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists app_settings_carimbo on public.app_settings;
create trigger app_settings_carimbo before update on public.app_settings
  for each row execute function public.app_settings_carimbo();

-- Conta nova no Auth → perfil desativado, à espera do gerente geral.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nome)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_user_email();

-- Proteções na edição de perfis. Pelo SQL Editor (sem usuário logado) a
-- primeira regra não vale: é assim que se cria o primeiro gerente geral.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_gerente_geral()
     and (old.perfil = 'gerente_geral' or new.perfil = 'gerente_geral') then
    raise exception 'Só o gerente geral pode alterar um gerente geral.' using errcode = '42501';
  end if;

  if old.perfil = 'gerente_geral' and old.ativo
     and not (new.perfil = 'gerente_geral' and new.ativo)
     and not exists (
       select 1 from public.profiles p where p.perfil = 'gerente_geral' and p.ativo and p.id <> old.id
     ) then
    raise exception 'É preciso manter ao menos um gerente geral ativo.';
  end if;

  if old.perfil = 'gerente' and new.perfil <> 'gerente'
     and exists (select 1 from public.teams t where t.gerente_id = old.id) then
    raise exception 'Esta pessoa é gerente de uma equipe. Troque o gerente da equipe antes de mudar o perfil.';
  end if;

  if new.perfil in ('gerente', 'gerente_geral') then
    new.equipe_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

create or replace function public.teams_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.gerente_id and p.perfil = 'gerente') then
    raise exception 'O gerente da equipe precisa ter o perfil Gerente.';
  end if;
  new.nome := btrim(new.nome);
  return new;
end;
$$;

drop trigger if exists teams_guard on public.teams;
create trigger teams_guard before insert or update on public.teams
  for each row execute function public.teams_guard();

-- ---------- Segurança (RLS) ----------
-- Visitantes sem login (chave pública) não enxergam nada. Usuário logado só
-- vê e altera o que as policies abaixo permitem. O README explica cada uma.

do $$
declare
  t text;
begin
  foreach t in array array['roles', 'permissions', 'role_permissions', 'profiles', 'teams', 'app_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end;
$$;

-- Escritas permitidas, coluna a coluna (o resto só pelo SQL Editor).
grant update (nome, perfil, equipe_id, ativo) on public.profiles to authenticated;
grant insert (nome, gerente_id), update (nome, gerente_id), delete on public.teams to authenticated;
grant insert, delete on public.role_permissions to authenticated;
grant update (valor) on public.app_settings to authenticated;

-- Catálogo de perfis e permissões: qualquer usuário ativo lê (o app monta o menu com isso).
drop policy if exists "ativos leem perfis" on public.roles;
create policy "ativos leem perfis" on public.roles
  for select to authenticated using (public.current_perfil() is not null);

drop policy if exists "ativos leem permissoes" on public.permissions;
create policy "ativos leem permissoes" on public.permissions
  for select to authenticated using (public.current_perfil() is not null);

drop policy if exists "ativos leem permissoes por perfil" on public.role_permissions;
create policy "ativos leem permissoes por perfil" on public.role_permissions
  for select to authenticated using (public.current_perfil() is not null);

drop policy if exists "gerente geral concede permissao" on public.role_permissions;
create policy "gerente geral concede permissao" on public.role_permissions
  for insert to authenticated with check (public.is_gerente_geral());

drop policy if exists "gerente geral retira permissao" on public.role_permissions;
create policy "gerente geral retira permissao" on public.role_permissions
  for delete to authenticated using (public.is_gerente_geral());

-- Perfis: cada um vê o próprio (mesmo desativado, para o app avisar);
-- o gerente vê a equipe; quem gerencia usuários ou vê tudo vê todos.
drop policy if exists "ver perfis" on public.profiles;
create policy "ver perfis" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or public.pode_ver_dados_de(id)
    or public.has_permission('usuarios.gerenciar')
  );

drop policy if exists "gerenciar perfis" on public.profiles;
create policy "gerenciar perfis" on public.profiles
  for update to authenticated
  using (public.has_permission('usuarios.gerenciar'))
  with check (public.has_permission('usuarios.gerenciar'));

-- Equipes: o corretor vê a dele, o gerente vê as que gerencia.
drop policy if exists "ver equipes" on public.teams;
create policy "ver equipes" on public.teams
  for select to authenticated using (
    public.has_permission('equipes.gerenciar')
    or public.has_permission('usuarios.gerenciar')
    or public.has_permission('dados.ver_todos')
    or (gerente_id = auth.uid() and public.current_perfil() = 'gerente')
    or id = public.minha_equipe()
  );

drop policy if exists "criar equipes" on public.teams;
create policy "criar equipes" on public.teams
  for insert to authenticated with check (public.has_permission('equipes.gerenciar'));

drop policy if exists "editar equipes" on public.teams;
create policy "editar equipes" on public.teams
  for update to authenticated
  using (public.has_permission('equipes.gerenciar'))
  with check (public.has_permission('equipes.gerenciar'));

drop policy if exists "excluir equipes" on public.teams;
create policy "excluir equipes" on public.teams
  for delete to authenticated using (public.has_permission('equipes.gerenciar'));

-- Configurações: só o gerente geral lê e altera (nem a existência das chaves
-- chega aos demais).
drop policy if exists "gerente geral le configuracoes" on public.app_settings;
create policy "gerente geral le configuracoes" on public.app_settings
  for select to authenticated using (public.is_gerente_geral());

drop policy if exists "gerente geral altera configuracoes" on public.app_settings;
create policy "gerente geral altera configuracoes" on public.app_settings
  for update to authenticated
  using (public.is_gerente_geral())
  with check (public.is_gerente_geral());

-- ---------- Contas que já existiam antes deste script ----------

insert into public.profiles (id, email, nome)
select u.id, coalesce(u.email, ''),
       coalesce(nullif(btrim(u.raw_user_meta_data ->> 'nome'), ''), split_part(coalesce(u.email, ''), '@', 1))
from auth.users u
on conflict (id) do nothing;

-- =====================================================================
-- Módulo de leads (primeiro corte). Regras em docs/leads.md.
-- =====================================================================

-- ---------- Permissões do módulo ----------
-- O padrão só entra na primeira vez que cada permissão aparece: rodar de novo
-- não desfaz o que o gerente geral ajustou em Configurações → Permissões.
with novas as (
  insert into public.permissions (slug, descricao, ordem) values
    ('leads.cadastrar', 'Cadastrar e trabalhar os próprios leads', 5),
    ('leads.atribuir',  'Cadastrar leads da empresa e atribuir a corretores da equipe', 6)
  on conflict (slug) do update set descricao = excluded.descricao, ordem = excluded.ordem
  returning slug, (xmax = 0) as nova
)
insert into public.role_permissions (perfil, permissao)
select v.perfil, v.permissao
from (values ('corretor', 'leads.cadastrar'), ('gerente', 'leads.atribuir')) as v (perfil, permissao)
join novas n on n.slug = v.permissao and n.nova
on conflict do nothing;

-- ---------- Catálogos: origens e etapas ----------
-- Para ajustar as opções, edite as linhas no Table Editor do Supabase. Rodar
-- o script de novo não sobrescreve nomes nem ordem já ajustados.
-- "restrita": só quem tem leads.atribuir cadastra ou troca para essa origem.
-- "pede_campanha": o cadastro mostra o campo campanha.

create table if not exists public.lead_origens (
  slug           text primary key,
  nome           text not null,
  ordem          integer not null default 0,
  pede_campanha  boolean not null default false,
  restrita       boolean not null default false,
  ativo          boolean not null default true
);

insert into public.lead_origens (slug, nome, ordem, pede_campanha, restrita) values
  ('plantao',         'Plantão',                1, false, false),
  ('indicacao',       'Indicação',              2, false, false),
  ('carteira',        'Carteira',               3, false, false),
  ('empresa',         'Empresa (gerente)',      4, false, true),
  ('redes_sociais',   'Redes sociais próprias', 5, false, false),
  ('anuncio_proprio', 'Anúncio próprio',        6, true,  false),
  ('outros',          'Outros',                 7, false, false)
on conflict (slug) do nothing;

create table if not exists public.lead_etapas (
  slug   text primary key,
  nome   text not null,
  ordem  integer not null default 0,
  ativo  boolean not null default true
);

insert into public.lead_etapas (slug, nome, ordem) values
  ('novo',                  'Novo',                  1),
  ('em_contato',            'Em contato',            2),
  ('visita_agendada',       'Visita agendada',       3),
  ('visita_realizada',      'Visita realizada',      4),
  ('proposta',              'Proposta',              5),
  ('venda',                 'Venda',                 6),
  ('aguardando_lancamento', 'Aguardando lançamento', 7)
on conflict (slug) do nothing;

-- ---------- Leads ----------
-- Sem exclusão: o lead descartado continua no banco, com o motivo. A carteira
-- não expira. O WhatsApp fica só com dígitos, com o 55 do país na frente.

create table if not exists public.leads (
  id                      uuid primary key default gen_random_uuid(),
  dono_id                 uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  nome                    text not null check (length(btrim(nome)) > 0),
  whatsapp                text not null check (whatsapp ~ '^55[0-9]{10,11}$'),
  origem                  text not null references public.lead_origens (slug),
  campanha                text,
  empreendimento          text,
  temperatura             text check (temperatura in ('quente', 'morno', 'frio')),
  etapa                   text not null default 'novo' references public.lead_etapas (slug),
  proximo_contato         timestamptz,
  status                  text not null default 'ativo' check (status in ('ativo', 'descartado')),
  motivo_descarte         text,
  descartado_em           timestamptz,
  valor                   numeric(14, 2) check (valor is null or valor >= 0),
  dormitorios             smallint check (dormitorios is null or dormitorios between 0 and 9),
  regiao                  text,
  finalidade              text check (finalidade in ('morar', 'investir')),
  ultima_interacao_em     timestamptz,
  ultima_interacao_texto  text,
  criado_por              uuid default auth.uid() references public.profiles (id) on delete set null,
  atribuido_por           uuid references public.profiles (id) on delete set null,
  atribuido_em            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint leads_descarte_tem_motivo
    check ((status = 'descartado') = (motivo_descarte is not null))
);

-- Colunas que vieram depois do primeiro corte (add column if not exists para
-- o banco que já está em produção).
-- tentativas: "Sem resposta" seguidas; só o gatilho das interações mexe nela.
alter table public.leads add column if not exists tentativas smallint not null default 0;
alter table public.leads add column if not exists email text;
alter table public.leads drop constraint if exists leads_email_check;
alter table public.leads add constraint leads_email_check check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Motivos de descarte. Para mudar, altere aqui e em MOTIVOS_DESCARTE (crm/src/lib/leads.ts).
alter table public.leads drop constraint if exists leads_motivo_descarte_check;
alter table public.leads add constraint leads_motivo_descarte_check check (motivo_descarte in
  ('sem_interesse', 'fora_do_perfil', 'fora_da_regiao', 'contato_invalido', 'duplicado', 'sem_retorno'));

create index if not exists leads_dono_status_idx on public.leads (dono_id, status, proximo_contato);
create index if not exists leads_whatsapp_idx on public.leads (whatsapp);

create table if not exists public.lead_interacoes (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references public.leads (id) on delete restrict,
  autor_id         uuid default auth.uid() references public.profiles (id) on delete set null,
  criado_em        timestamptz not null default now(),
  texto            text not null check (length(btrim(texto)) > 0),
  proximo_contato  timestamptz
);

-- Tipo da interação. "tentativa" é o "Sem resposta (+1)"; "mensagem" é a
-- mensagem original colada no Cadastro Mágico. Conversa de verdade (whatsapp,
-- ligacao, email, visita) zera as tentativas e tira o lead de "novo".
alter table public.lead_interacoes add column if not exists tipo text not null default 'nota';
alter table public.lead_interacoes drop constraint if exists lead_interacoes_tipo_check;
alter table public.lead_interacoes add constraint lead_interacoes_tipo_check
  check (tipo in ('whatsapp', 'ligacao', 'email', 'visita', 'nota', 'tentativa', 'mensagem'));

-- Toda interação termina com o próximo contato (dia e hora), menos a mensagem original.
alter table public.lead_interacoes alter column proximo_contato drop not null;
alter table public.lead_interacoes drop constraint if exists lead_interacoes_pede_proximo_contato;
alter table public.lead_interacoes add constraint lead_interacoes_pede_proximo_contato
  check (tipo = 'mensagem' or proximo_contato is not null);

create index if not exists lead_interacoes_lead_idx on public.lead_interacoes (lead_id, criado_em desc);

-- Histórico automático: cada mudança de etapa, temperatura, status e dono vira
-- uma linha, gravada só pelo gatilho lead_registra_eventos. Ninguém escreve
-- direto. "automatico" marca o que o banco fez sozinho (ex.: a primeira
-- conversa tira o lead de "novo").
create table if not exists public.lead_eventos (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete restrict,
  tipo        text not null check (tipo in ('criado', 'etapa', 'temperatura', 'status', 'dono')),
  de          text,
  para        text,
  detalhe     text,
  automatico  boolean not null default false,
  autor_id    uuid references public.profiles (id) on delete set null,
  criado_em   timestamptz not null default now()
);

create index if not exists lead_eventos_lead_idx on public.lead_eventos (lead_id, criado_em desc);

-- ---------- Funções do módulo ----------

-- O usuário logado pode atribuir leads a p_user: p_user é corretor ativo, de uma
-- equipe que ele gerencia (ou ele vê todas as equipes).
create or replace function public.pode_atribuir_a(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('leads.atribuir')
     and exists (select 1 from public.profiles p where p.id = p_user and p.ativo and p.perfil = 'corretor')
     and (public.is_my_team_member(p_user) or public.has_permission('dados.ver_todos'));
$$;

create or replace function public.origem_restrita(p_origem text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select o.restrita from public.lead_origens o where o.slug = p_origem), false);
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.pode_atribuir_a(uuid)', 'public.origem_restrita(text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;

-- Regras que as policies sozinhas não expressam. Pelo SQL Editor (sem usuário
-- logado) as regras de quem pode o quê não valem, para permitir correções.
create or replace function public.leads_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
begin
  new.nome := btrim(new.nome);
  new.campanha := nullif(btrim(coalesce(new.campanha, '')), '');
  new.empreendimento := nullif(btrim(coalesce(new.empreendimento, '')), '');
  new.regiao := nullif(btrim(coalesce(new.regiao, '')), '');
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');

  if new.status = 'descartado' and (tg_op = 'INSERT' or old.status <> 'descartado') then
    new.descartado_em := now();
  elsif new.status = 'ativo' then
    new.descartado_em := null;
    -- Reativar começa a contagem de tentativas do zero.
    if tg_op = 'UPDATE' and old.status = 'descartado' then
      new.tentativas := 0;
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.criado_por := coalesce(v_eu, new.criado_por);
    new.ultima_interacao_em := null;
    new.ultima_interacao_texto := null;
    new.tentativas := 0;
    new.created_at := now();
    if v_eu is not null and new.dono_id <> v_eu then
      new.atribuido_por := v_eu;
      new.atribuido_em := now();
    else
      new.atribuido_por := null;
      new.atribuido_em := null;
    end if;
    return new;
  end if;

  new.criado_por := old.criado_por;
  new.created_at := old.created_at;
  -- Sem usuário logado (SQL Editor) ou vindo de outro gatilho (a interação
  -- atualizando o lead): as regras de quem pode o quê já foram checadas.
  if v_eu is null or pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Quem não é o dono só pode trocar o dono (atribuir), nada mais.
  if old.dono_id <> v_eu
     and (to_jsonb(new) - 'dono_id' - 'updated_at' - 'atribuido_por' - 'atribuido_em')
         is distinct from (to_jsonb(old) - 'dono_id' - 'updated_at' - 'atribuido_por' - 'atribuido_em') then
    raise exception 'Só o corretor dono do lead altera os dados dele.' using errcode = '42501';
  end if;

  if new.dono_id <> old.dono_id then
    if not public.pode_atribuir_a(new.dono_id) then
      raise exception 'Você só pode atribuir leads a corretores ativos da sua equipe.' using errcode = '42501';
    end if;
    new.atribuido_por := v_eu;
    new.atribuido_em := now();
  end if;

  if new.origem is distinct from old.origem
     and (public.origem_restrita(old.origem) or public.origem_restrita(new.origem))
     and not public.has_permission('leads.atribuir') then
    raise exception 'Só o gerente muda a origem de um lead da empresa.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists leads_guard on public.leads;
create trigger leads_guard before insert or update on public.leads
  for each row execute function public.leads_guard();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create or replace function public.lead_interacao_carimbo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.texto := btrim(new.texto);
  if auth.uid() is not null then
    new.autor_id := auth.uid();
    new.criado_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists lead_interacao_carimbo on public.lead_interacoes;
create trigger lead_interacao_carimbo before insert on public.lead_interacoes
  for each row execute function public.lead_interacao_carimbo();

-- A interação atualiza o lead: última interação e próximo contato. Também
-- conta as tentativas sem resposta (zera na conversa de verdade) e tira o lead
-- de "novo" na primeira conversa. A etapa nunca volta.
create or replace function public.lead_interacao_atualiza_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversa boolean := new.tipo in ('whatsapp', 'ligacao', 'email', 'visita');
begin
  update public.leads
     set ultima_interacao_em = new.criado_em,
         ultima_interacao_texto = left(new.texto, 280),
         proximo_contato = coalesce(new.proximo_contato, proximo_contato),
         tentativas = case
                        when new.tipo = 'tentativa' then least(tentativas + 1, 99)
                        when v_conversa then 0
                        else tentativas
                      end,
         etapa = case when v_conversa and etapa = 'novo' then 'em_contato' else etapa end
   where id = new.lead_id;
  return new;
end;
$$;

drop trigger if exists lead_interacao_atualiza_lead on public.lead_interacoes;
create trigger lead_interacao_atualiza_lead after insert on public.lead_interacoes
  for each row execute function public.lead_interacao_atualiza_lead();

-- Histórico automático do lead. Roda depois de gravar, com o autor da sessão
-- (nulo pelo SQL Editor). O que vem de outro gatilho é marcado como automático.
create or replace function public.lead_registra_eventos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  v_auto boolean := pg_trigger_depth() > 1;
begin
  if tg_op = 'INSERT' then
    insert into public.lead_eventos (lead_id, tipo, para, autor_id, criado_em)
    values (new.id, 'criado', new.dono_id::text, coalesce(v_eu, new.criado_por), new.created_at);
    return new;
  end if;

  if new.etapa is distinct from old.etapa then
    insert into public.lead_eventos (lead_id, tipo, de, para, automatico, autor_id)
    values (new.id, 'etapa', old.etapa, new.etapa, v_auto, v_eu);
  end if;
  if new.temperatura is distinct from old.temperatura then
    insert into public.lead_eventos (lead_id, tipo, de, para, automatico, autor_id)
    values (new.id, 'temperatura', old.temperatura, new.temperatura, v_auto, v_eu);
  end if;
  if new.status is distinct from old.status then
    insert into public.lead_eventos (lead_id, tipo, de, para, detalhe, automatico, autor_id)
    values (new.id, 'status', old.status, new.status, new.motivo_descarte, v_auto, v_eu);
  end if;
  -- O motivo da troca de dono ("perdido") vem só da função lead_perdido, que o
  -- marca na transação; a troca comum fica sem motivo.
  if new.dono_id is distinct from old.dono_id then
    insert into public.lead_eventos (lead_id, tipo, de, para, detalhe, automatico, autor_id)
    values (new.id, 'dono', old.dono_id::text, new.dono_id::text,
            nullif(current_setting('crm.motivo_dono', true), ''), v_auto, v_eu);
  end if;
  return new;
end;
$$;

drop trigger if exists lead_registra_eventos on public.leads;
create trigger lead_registra_eventos after insert or update on public.leads
  for each row execute function public.lead_registra_eventos();

-- Leads cadastrados antes do histórico ganham o evento "criado", uma vez.
insert into public.lead_eventos (lead_id, tipo, para, autor_id, criado_em)
select l.id, 'criado', l.dono_id::text, l.criado_por, l.created_at
from public.leads l
where not exists (select 1 from public.lead_eventos e where e.lead_id = l.id and e.tipo = 'criado');

-- ---------- RLS do módulo ----------

do $$
declare
  t text;
begin
  foreach t in array array['lead_origens', 'lead_etapas', 'leads', 'lead_interacoes', 'lead_eventos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end;
$$;

-- Escritas permitidas, coluna a coluna. Não há exclusão pelo app. Em
-- lead_eventos ninguém escreve: só o gatilho lead_registra_eventos.
grant insert (dono_id, nome, whatsapp, email, origem, campanha, empreendimento, temperatura, etapa, proximo_contato,
              status, motivo_descarte, valor, dormitorios, regiao, finalidade)
  on public.leads to authenticated;
grant update (dono_id, nome, whatsapp, email, origem, campanha, empreendimento, temperatura, etapa, proximo_contato,
              status, motivo_descarte, valor, dormitorios, regiao, finalidade)
  on public.leads to authenticated;
grant insert (lead_id, tipo, texto, proximo_contato) on public.lead_interacoes to authenticated;

drop policy if exists "ativos leem origens" on public.lead_origens;
create policy "ativos leem origens" on public.lead_origens
  for select to authenticated using (public.current_perfil() is not null);

drop policy if exists "ativos leem etapas" on public.lead_etapas;
create policy "ativos leem etapas" on public.lead_etapas
  for select to authenticated using (public.current_perfil() is not null);

-- Leads: o corretor vê os dele, o gerente os da equipe, quem vê tudo vê todos.
drop policy if exists "ver leads" on public.leads;
create policy "ver leads" on public.leads
  for select to authenticated using (public.pode_ver_dados_de(dono_id));

-- Cadastrar: o próprio lead (com leads.cadastrar, fora das origens restritas)
-- ou um lead atribuído a um corretor da equipe (com leads.atribuir).
drop policy if exists "cadastrar leads" on public.leads;
create policy "cadastrar leads" on public.leads
  for insert to authenticated with check (
    (dono_id = auth.uid() and public.has_permission('leads.cadastrar') and not public.origem_restrita(origem))
    or public.pode_atribuir_a(dono_id)
  );

-- Alterar: o dono, ou quem atribui (o gatilho limita este a trocar o dono).
drop policy if exists "alterar leads" on public.leads;
create policy "alterar leads" on public.leads
  for update to authenticated
  using (
    (dono_id = auth.uid() and public.has_permission('leads.cadastrar'))
    or (public.has_permission('leads.atribuir') and public.pode_ver_dados_de(dono_id))
  )
  with check (
    (dono_id = auth.uid() and public.has_permission('leads.cadastrar'))
    or public.pode_atribuir_a(dono_id)
  );

-- Interações: quem vê o lead vê o histórico; só o dono registra. Não há
-- edição nem exclusão: o histórico fica como foi escrito.
drop policy if exists "ver interacoes" on public.lead_interacoes;
create policy "ver interacoes" on public.lead_interacoes
  for select to authenticated using (
    exists (select 1 from public.leads l where l.id = lead_id and public.pode_ver_dados_de(l.dono_id))
  );

-- O dono registra qualquer tipo. Quem cadastrou o lead da empresa para um
-- corretor (gerente) só guarda a mensagem original colada no Cadastro Mágico.
drop policy if exists "registrar interacao" on public.lead_interacoes;
create policy "registrar interacao" on public.lead_interacoes
  for insert to authenticated with check (
    autor_id = auth.uid()
    and (
      (public.has_permission('leads.cadastrar')
       and exists (select 1 from public.leads l where l.id = lead_id and l.dono_id = auth.uid()))
      or
      (tipo = 'mensagem'
       and public.has_permission('leads.atribuir')
       and exists (select 1 from public.leads l
                   where l.id = lead_id and l.criado_por = auth.uid() and public.pode_ver_dados_de(l.dono_id)))
    )
  );

-- Histórico automático: mesma leitura das interações; sem escrita pelo app.
drop policy if exists "ver eventos" on public.lead_eventos;
create policy "ver eventos" on public.lead_eventos
  for select to authenticated using (
    exists (select 1 from public.leads l where l.id = lead_id and public.pode_ver_dados_de(l.dono_id))
  );

-- ---------- Horário de atendimento (prazo do primeiro contato) ----------
-- Todo lead em "novo" tem 15 min para o primeiro contato, contados só neste
-- horário (regra em docs/leads.md). Uma linha só. Fica fora de app_settings
-- porque todo usuário ativo precisa ler; só o gerente geral altera, em
-- Configurações. Rodar o script de novo não sobrescreve o que foi ajustado.
-- dias: 0 = domingo … 6 = sábado. Padrão: o plantão, 9h às 19h, todos os dias.

create table if not exists public.horario_atendimento (
  id          boolean primary key default true check (id),
  dias        smallint[] not null default '{0,1,2,3,4,5,6}',
  inicio      time not null default '09:00',
  fim         time not null default '19:00',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null,
  constraint horario_atendimento_janela check (inicio < fim),
  constraint horario_atendimento_dias check (cardinality(dias) > 0 and dias <@ '{0,1,2,3,4,5,6}'::smallint[])
);

insert into public.horario_atendimento (id) values (true) on conflict (id) do nothing;

drop trigger if exists horario_atendimento_carimbo on public.horario_atendimento;
create trigger horario_atendimento_carimbo before update on public.horario_atendimento
  for each row execute function public.app_settings_carimbo();

alter table public.horario_atendimento enable row level security;
revoke all on public.horario_atendimento from anon, authenticated;
grant select on public.horario_atendimento to authenticated;
grant update (dias, inicio, fim) on public.horario_atendimento to authenticated;

drop policy if exists "ativos leem horario" on public.horario_atendimento;
create policy "ativos leem horario" on public.horario_atendimento
  for select to authenticated using (public.current_perfil() is not null);

drop policy if exists "gerente geral altera horario" on public.horario_atendimento;
create policy "gerente geral altera horario" on public.horario_atendimento
  for update to authenticated
  using (public.is_gerente_geral())
  with check (public.is_gerente_geral());

-- =====================================================================
-- Mensagens prontas, duplicado entre corretores e repasse do lead da
-- empresa (itens 4 a 6 de docs/referencia-crm-bruna.md). Regras em docs/leads.md.
-- =====================================================================

-- ---------- WhatsApp do usuário ----------
-- Para o gerente avisar o corretor quando atribui um lead da empresa. Mesmo
-- formato do lead: só dígitos, com o 55. Quem gerencia usuários altera em
-- Usuários; cada um altera o próprio em Minha conta (função abaixo).
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles drop constraint if exists profiles_whatsapp_check;
alter table public.profiles add constraint profiles_whatsapp_check
  check (whatsapp is null or whatsapp ~ '^55[1-9]{2}[0-9]{8,9}$');

grant update (whatsapp) on public.profiles to authenticated;

-- Cada usuário ativo grava o próprio WhatsApp (vazio apaga). É a única coluna
-- que ele altera no próprio perfil sem usuarios.gerenciar.
create or replace function public.salvar_meu_whatsapp(p_whatsapp text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.current_perfil() is null then
    raise exception 'Só um usuário ativo altera o próprio WhatsApp.' using errcode = '42501';
  end if;
  update public.profiles set whatsapp = nullif(btrim(coalesce(p_whatsapp, '')), '') where id = auth.uid();
end;
$$;

-- ---------- Duplicado entre corretores ----------
-- O cadastro já avisa o duplicado entre os leads que a pessoa enxerga (com o
-- nome). Esta função cobre os outros: diz só se existe lead ativo com o número
-- numa carteira que a pessoa não vê. Não revela de quem é nem os dados.
create or replace function public.whatsapp_em_outra_carteira(p_whatsapp text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.has_permission('leads.cadastrar') or public.has_permission('leads.atribuir')) then
    raise exception 'Seu perfil não cadastra leads.' using errcode = '42501';
  end if;
  return exists (
    select 1 from public.leads l
    where l.whatsapp = p_whatsapp and l.status = 'ativo' and not public.pode_ver_dados_de(l.dono_id)
  );
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.salvar_meu_whatsapp(text)', 'public.whatsapp_em_outra_carteira(text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;

-- ---------- Mensagens prontas do WhatsApp ----------
-- Modelos com variáveis: {primeiro_nome}, {nome}, {empreendimento} e
-- {corretor}. "etapas": etapas em que o modelo é sugerido. "sem_contato": é o
-- sugerido quando o lead está há 2 dias ou mais sem contato. Todo usuário
-- ativo lê; só o gerente geral cria, altera e desliga, em Configurações.
-- Rodar o script de novo não sobrescreve o que foi ajustado.

create table if not exists public.mensagens_modelo (
  slug         text primary key default gen_random_uuid()::text,
  titulo       text not null check (length(btrim(titulo)) > 0),
  texto        text not null check (length(btrim(texto)) > 0),
  etapas       text[] not null default '{}',
  sem_contato  boolean not null default false,
  ordem        integer not null default 0,
  ativo        boolean not null default true,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles (id) on delete set null
);

insert into public.mensagens_modelo (slug, titulo, texto, etapas, sem_contato, ordem) values
  ('primeiro_contato', 'Primeiro contato',
   E'Oi, {primeiro_nome}, tudo bem?\n\nAqui é {corretor}, da MBigucci. Recebi seu contato sobre {empreendimento} e vou te ajudar a encontrar o imóvel certo.\n\nPrefere conversar por aqui ou por ligação? Qual o melhor horário para você?',
   '{novo}', false, 1),
  ('retomar_contato', 'Retomar contato',
   E'Oi, {primeiro_nome}, tudo bem?\n\nPassando para saber se você conseguiu pensar sobre {empreendimento}. Tenho novidades que podem combinar com o que você procura. Posso te mandar?\n\nSe preferir, me diga um horário e eu te ligo.',
   '{em_contato}', true, 2),
  ('convite_visita', 'Convite para visita',
   E'Oi, {primeiro_nome}, tudo bem?\n\nQue tal conhecer {empreendimento} de perto? Agendo a visita no dia e horário melhores para você.\n\nQual dia fica bom?',
   '{}', false, 3),
  ('confirmar_visita', 'Confirmar visita',
   E'Oi, {primeiro_nome}, tudo bem?\n\nPassando para confirmar nossa visita a {empreendimento}. Se surgir qualquer imprevisto, é só me avisar por aqui.\n\nAté lá. {corretor}, da MBigucci.',
   '{visita_agendada}', false, 4),
  ('depois_da_visita', 'Depois da visita',
   E'Oi, {primeiro_nome}, tudo bem?\n\nFoi um prazer receber você em {empreendimento}. Ficou alguma dúvida sobre a planta, os valores ou as condições de pagamento?\n\nEstou à disposição para o próximo passo.',
   '{visita_realizada,proposta}', false, 5),
  ('lancamento', 'Novidades do lançamento',
   E'Oi, {primeiro_nome}, tudo bem?\n\nPassando para contar as novidades sobre {empreendimento}. Assim que tivermos a data do lançamento, você fica sabendo por aqui.\n\nQuer que eu te mande as informações que já temos?',
   '{aguardando_lancamento}', false, 6)
on conflict (slug) do nothing;

create or replace function public.mensagens_modelo_carimbo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.titulo := btrim(new.titulo);
  new.texto := btrim(new.texto);
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists mensagens_modelo_carimbo on public.mensagens_modelo;
create trigger mensagens_modelo_carimbo before insert or update on public.mensagens_modelo
  for each row execute function public.mensagens_modelo_carimbo();

alter table public.mensagens_modelo enable row level security;
revoke all on public.mensagens_modelo from anon, authenticated;
grant select on public.mensagens_modelo to authenticated;
grant insert (titulo, texto, etapas, sem_contato, ordem, ativo),
      update (titulo, texto, etapas, sem_contato, ordem, ativo)
  on public.mensagens_modelo to authenticated;

drop policy if exists "ativos leem modelos" on public.mensagens_modelo;
create policy "ativos leem modelos" on public.mensagens_modelo
  for select to authenticated using (public.current_perfil() is not null);

drop policy if exists "gerente geral cria modelo" on public.mensagens_modelo;
create policy "gerente geral cria modelo" on public.mensagens_modelo
  for insert to authenticated with check (public.is_gerente_geral());

drop policy if exists "gerente geral altera modelo" on public.mensagens_modelo;
create policy "gerente geral altera modelo" on public.mensagens_modelo
  for update to authenticated
  using (public.is_gerente_geral())
  with check (public.is_gerente_geral());

-- =====================================================================
-- Lead perdido e painel da equipe (itens 1 e 2 de "Onde entra" em
-- docs/gerentes-necessidades.md). Regras em docs/painel.md.
-- =====================================================================

-- ---------- Fim do prazo do primeiro contato ----------
-- Mesma conta de fimDoPrazo (crm/src/lib/prazo.ts): p_minutos de horário de
-- atendimento depois da chegada, na hora de São Paulo. Sem linha de horário,
-- vale o padrão (9h às 19h, todos os dias).
create or replace function private.fim_do_prazo(p_chegada timestamptz, p_minutos integer default 15)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_dias smallint[] := '{0,1,2,3,4,5,6}';
  v_abre time := '09:00';
  v_fecha time := '19:00';
  t timestamp := p_chegada at time zone 'America/Sao_Paulo';
  v_resta numeric := p_minutos;
  v_de timestamp;
  v_fecha_em timestamp;
  v_livre numeric;
begin
  select h.dias, h.inicio, h.fim into v_dias, v_abre, v_fecha from public.horario_atendimento h where h.id;
  if v_dias is null or cardinality(v_dias) = 0 or v_abre >= v_fecha then
    return p_chegada + p_minutos * interval '1 minute';
  end if;
  for i in 1..14 loop
    v_fecha_em := date_trunc('day', t) + v_fecha;
    if extract(dow from t)::smallint = any (v_dias) and t < v_fecha_em then
      v_de := greatest(t, date_trunc('day', t) + v_abre);
      v_livre := extract(epoch from v_fecha_em - v_de) / 60;
      if v_livre >= v_resta then
        return (v_de + v_resta * interval '1 minute') at time zone 'America/Sao_Paulo';
      end if;
      v_resta := v_resta - v_livre;
    end if;
    t := date_trunc('day', t) + interval '1 day';
  end loop;
  return p_chegada + p_minutos * interval '1 minute';
end;
$$;

-- ---------- Lead perdido ----------
-- O gerente passa para outro corretor da equipe o lead da empresa que ficou
-- sem primeiro contato além do prazo. O evento de troca de dono sai com o
-- detalhe "perdido", gravado pelo gatilho lead_registra_eventos. A troca
-- passa pelo leads_guard (pode_atribuir_a) e recomeça o prazo para quem recebe.
create or replace function public.lead_perdido(p_lead uuid, p_corretor uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  l public.leads;
begin
  if auth.uid() is null or not public.has_permission('leads.atribuir') then
    raise exception 'Só o gerente marca um lead como perdido.' using errcode = '42501';
  end if;
  select * into l from public.leads where id = p_lead for update;
  if l.id is null then
    raise exception 'Lead não encontrado, ou você não tem acesso a ele.' using errcode = '42501';
  end if;
  if l.origem <> 'empresa' or l.status <> 'ativo' or l.etapa <> 'novo'
     or now() <= private.fim_do_prazo(greatest(l.created_at, coalesce(l.atribuido_em, l.created_at))) then
    raise exception 'Só o lead da empresa com prazo estourado pode ser marcado como perdido.' using errcode = 'P0001';
  end if;
  if p_corretor = l.dono_id then
    raise exception 'Escolha outro corretor para receber o lead.' using errcode = 'P0001';
  end if;

  perform set_config('crm.motivo_dono', 'perdido', true);
  update public.leads set dono_id = p_corretor where id = p_lead;
  perform set_config('crm.motivo_dono', '', true);
end;
$$;

-- Leads perdidos no período, pelo corretor que perdeu. Security definer porque
-- o lead já está na carteira de outro: o corretor vê os que ele perdeu, o
-- gerente os da equipe, quem vê tudo vê todos (pode_ver_dados_de de quem perdeu).
-- recebido_em: quando quem perdeu tinha recebido o lead (o painel conta como
-- recebido no período, mesmo que o corretor não veja mais o histórico).
drop function if exists public.leads_perdidos(timestamptz, timestamptz);
create function public.leads_perdidos(p_de timestamptz, p_ate timestamptz)
returns table (lead_id uuid, nome text, corretor_id uuid, recebeu_id uuid, criado_em timestamptz, recebido_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.lead_id, l.nome, e.de::uuid, e.para::uuid, e.criado_em,
         (select max(r.criado_em) from public.lead_eventos r
          where r.lead_id = e.lead_id and r.tipo in ('criado', 'dono') and r.para = e.de and r.criado_em <= e.criado_em)
  from public.lead_eventos e
  join public.leads l on l.id = e.lead_id
  where e.tipo = 'dono' and e.detalhe = 'perdido'
    and e.criado_em >= p_de and e.criado_em < p_ate
    and public.pode_ver_dados_de(e.de::uuid)
  order by e.criado_em;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['private.fim_do_prazo(timestamptz, integer)', 'public.lead_perdido(uuid, uuid)',
                           'public.leads_perdidos(timestamptz, timestamptz)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;

create index if not exists lead_eventos_quando_idx on public.lead_eventos (criado_em);

-- =====================================================================
-- Visitas e agenda (item 10 de docs/referencia-crm-bruna.md). Regras em
-- docs/visitas.md. A baixa da visita é auditável: quem deu, quando e o
-- comprovante opcional ficam na visita, e cada mudança vai para lead_eventos.
-- =====================================================================

-- ---------- Permissão do módulo ----------
-- O corretor agenda e dá baixa nas próprias visitas com leads.cadastrar. Esta
-- permissão deixa o gerente dar baixa e corrigir as visitas da equipe.
with novas as (
  insert into public.permissions (slug, descricao, ordem) values
    ('visitas.baixa_equipe', 'Dar baixa e corrigir as visitas da equipe', 7)
  on conflict (slug) do update set descricao = excluded.descricao, ordem = excluded.ordem
  returning slug, (xmax = 0) as nova
)
insert into public.role_permissions (perfil, permissao)
select v.perfil, v.permissao
from (values ('gerente', 'visitas.baixa_equipe')) as v (perfil, permissao)
join novas n on n.slug = v.permissao and n.nova
on conflict do nothing;

-- ---------- Visitas ----------
-- Sem exclusão: a visita desmarcada fica como "cancelada". O corretor é o dono
-- do lead quando a visita foi agendada e não muda depois.
-- baixa_por e baixa_em: quem deu a baixa (realizada ou não compareceu) e quando,
-- carimbados pelo gatilho. comprovante: link opcional (foto, mensagem do cliente).
create table if not exists public.visitas (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads (id) on delete restrict,
  corretor_id     uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  empreendimento  text not null check (length(btrim(empreendimento)) > 0),
  inicio          timestamptz not null,
  local           text,
  status          text not null default 'agendada'
                  check (status in ('agendada', 'confirmada', 'realizada', 'nao_compareceu', 'cancelada')),
  observacao      text,
  baixa_por       uuid references public.profiles (id) on delete set null,
  baixa_em        timestamptz,
  comprovante     text check (comprovante is null or comprovante ~* '^https?://[^\s]+$'),
  criado_por      uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint visitas_baixa_carimbada check ((status in ('realizada', 'nao_compareceu')) = (baixa_em is not null))
);

create index if not exists visitas_corretor_inicio_idx on public.visitas (corretor_id, inicio);
create index if not exists visitas_lead_idx on public.visitas (lead_id, inicio desc);

-- O histórico do lead ganha os eventos da visita: "visita" (mudança de status,
-- de/para; detalhe = motivo da correção), "visita_horario" (remarcação, de/para
-- em ISO) e "visita_comprovante" (link anexado, trocado ou removido).
alter table public.lead_eventos add column if not exists visita_id uuid references public.visitas (id) on delete restrict;
alter table public.lead_eventos drop constraint if exists lead_eventos_tipo_check;
alter table public.lead_eventos add constraint lead_eventos_tipo_check check (tipo in
  ('criado', 'etapa', 'temperatura', 'status', 'dono', 'visita', 'visita_horario', 'visita_comprovante'));

-- Regras da visita que as policies sozinhas não expressam. Pelo SQL Editor
-- (sem usuário logado) só valem os checks, para permitir correções.
-- - Agendar e remarcar: só de agora em diante (10 min de folga), com o lead ativo.
-- - Remarcar volta a visita para "agendada" (a confirmação era do horário antigo).
-- - A baixa (realizada ou não compareceu) só depois do horário da visita.
-- - Status final (realizada, não compareceu, cancelada) só muda pela função
--   corrigir_visita, com o motivo, que vai para o histórico.
-- - Quem não é o corretor da visita (o gerente) só dá baixa, corrige e anota.
create or replace function public.visitas_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  v_motivo text := nullif(btrim(coalesce(current_setting('crm.motivo_visita', true), '')), '');
  v_finais constant text[] := array['realizada', 'nao_compareceu', 'cancelada'];
  v_baixa constant text[] := array['realizada', 'nao_compareceu'];
  v_folga constant interval := interval '10 minutes';
begin
  new.empreendimento := btrim(new.empreendimento);
  new.local := nullif(btrim(coalesce(new.local, '')), '');
  new.observacao := nullif(btrim(coalesce(new.observacao, '')), '');
  new.comprovante := nullif(btrim(coalesce(new.comprovante, '')), '');

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.criado_por := coalesce(v_eu, new.criado_por);
    if v_eu is null then
      if new.status = any (v_baixa) then new.baixa_em := coalesce(new.baixa_em, now()); end if;
      return new;
    end if;
    if not exists (select 1 from public.leads l where l.id = new.lead_id and l.status = 'ativo') then
      raise exception 'Só um lead ativo pode ter visita agendada.' using errcode = 'P0001';
    end if;
    if new.inicio < now() - v_folga then
      raise exception 'Escolha um dia e hora a partir de agora.' using errcode = 'P0001';
    end if;
    new.status := 'agendada';
    new.baixa_por := null;
    new.baixa_em := null;
    new.comprovante := null;
    return new;
  end if;

  new.lead_id := old.lead_id;
  new.corretor_id := old.corretor_id;
  new.criado_por := old.criado_por;
  new.created_at := old.created_at;

  -- Quem deu a baixa e quando: só o banco carimba.
  if new.status = any (v_baixa) and new.status is distinct from old.status then
    new.baixa_por := v_eu;
    new.baixa_em := now();
  elsif new.status = any (v_baixa) then
    new.baixa_por := old.baixa_por;
    new.baixa_em := old.baixa_em;
  else
    new.baixa_por := null;
    new.baixa_em := null;
  end if;

  if v_eu is null then
    return new;
  end if;

  if old.status = any (v_finais) and new.status is distinct from old.status and v_motivo is null then
    raise exception 'Esta visita já tem baixa. Para mudar, use Corrigir e escreva o motivo.' using errcode = 'P0001';
  end if;

  if new.inicio is distinct from old.inicio then
    if not (old.status in ('agendada', 'confirmada') and new.status in ('agendada', 'confirmada')) then
      raise exception 'Só a visita agendada pode ser remarcada.' using errcode = 'P0001';
    end if;
    if new.inicio < now() - v_folga then
      raise exception 'Escolha um dia e hora a partir de agora.' using errcode = 'P0001';
    end if;
    new.status := 'agendada';
  end if;

  if new.status = any (v_baixa) and new.status is distinct from old.status and now() < new.inicio then
    raise exception 'A baixa só pode ser dada depois do horário da visita.' using errcode = 'P0001';
  end if;

  if new.comprovante is distinct from old.comprovante and new.status <> 'realizada' then
    raise exception 'O comprovante vale só para a visita realizada.' using errcode = 'P0001';
  end if;

  -- O gerente (não é o corretor da visita) só dá baixa, corrige com motivo e anota.
  if old.corretor_id <> v_eu then
    if new.empreendimento is distinct from old.empreendimento or new.inicio is distinct from old.inicio
       or new.local is distinct from old.local
       or (new.status is distinct from old.status and v_motivo is null and not (new.status = any (v_baixa))) then
      raise exception 'Só o corretor da visita agenda, remarca, confirma e cancela.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists visitas_guard on public.visitas;
create trigger visitas_guard before insert or update on public.visitas
  for each row execute function public.visitas_guard();

drop trigger if exists visitas_set_updated_at on public.visitas;
create trigger visitas_set_updated_at before update on public.visitas
  for each row execute function public.set_updated_at();

-- A visita move o lead: agendar leva a "visita agendada" e a baixa "realizada"
-- leva a "visita realizada" (a etapa nunca volta, nem na correção). A visita
-- realizada também conta como conversa: última interação e tentativas zeradas.
create or replace function public.visita_atualiza_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('agendada', 'confirmada') and (tg_op = 'INSERT' or old.status not in ('agendada', 'confirmada')) then
    update public.leads
       set etapa = 'visita_agendada'
     where id = new.lead_id and etapa in ('novo', 'em_contato', 'aguardando_lancamento');
  elsif tg_op = 'UPDATE' and new.status = 'realizada' and old.status <> 'realizada' then
    update public.leads
       set etapa = case when etapa in ('novo', 'em_contato', 'aguardando_lancamento', 'visita_agendada')
                        then 'visita_realizada' else etapa end,
           ultima_interacao_em = new.baixa_em,
           ultima_interacao_texto = left('Visita realizada: ' || new.empreendimento, 280),
           tentativas = 0
     where id = new.lead_id;
  end if;
  return new;
end;
$$;

drop trigger if exists visita_atualiza_lead on public.visitas;
create trigger visita_atualiza_lead after insert or update on public.visitas
  for each row execute function public.visita_atualiza_lead();

-- Histórico: cada mudança de status, horário e comprovante vai para
-- lead_eventos, com o autor da sessão. O motivo da correção vai no detalhe.
create or replace function public.visita_registra_eventos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  v_auto boolean := pg_trigger_depth() > 1;
  v_motivo text := nullif(btrim(coalesce(current_setting('crm.motivo_visita', true), '')), '');
begin
  if tg_op = 'INSERT' then
    insert into public.lead_eventos (lead_id, visita_id, tipo, para, automatico, autor_id, criado_em)
    values (new.lead_id, new.id, 'visita', new.status, v_auto, coalesce(v_eu, new.criado_por), new.created_at);
    return new;
  end if;

  if new.inicio is distinct from old.inicio then
    insert into public.lead_eventos (lead_id, visita_id, tipo, de, para, automatico, autor_id)
    values (new.lead_id, new.id, 'visita_horario',
            to_char(old.inicio at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            to_char(new.inicio at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), v_auto, v_eu);
  end if;
  if new.status is distinct from old.status then
    insert into public.lead_eventos (lead_id, visita_id, tipo, de, para, detalhe, automatico, autor_id)
    values (new.lead_id, new.id, 'visita', old.status, new.status, v_motivo, v_auto, v_eu);
  end if;
  if new.comprovante is distinct from old.comprovante then
    insert into public.lead_eventos (lead_id, visita_id, tipo, de, para, automatico, autor_id)
    values (new.lead_id, new.id, 'visita_comprovante', old.comprovante, new.comprovante, v_auto, v_eu);
  end if;
  return new;
end;
$$;

drop trigger if exists visita_registra_eventos on public.visitas;
create trigger visita_registra_eventos after insert or update on public.visitas
  for each row execute function public.visita_registra_eventos();

-- Corrigir uma visita com baixa (ou cancelada): muda o status com o motivo, que
-- vai para o histórico. Passa pelo RLS e pelo visitas_guard (a baixa continua
-- só depois do horário). Também é o Desfazer do cancelamento.
create or replace function public.corrigir_visita(p_visita uuid, p_status text, p_motivo text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Entre no CRM para corrigir a visita.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Escreva o motivo da correção.' using errcode = 'P0001';
  end if;
  perform set_config('crm.motivo_visita', left(btrim(p_motivo), 280), true);
  update public.visitas set status = p_status where id = p_visita;
  if not found then
    raise exception 'Visita não encontrada, ou você não pode alterá-la.' using errcode = '42501';
  end if;
  perform set_config('crm.motivo_visita', '', true);
end;
$$;

revoke all on function public.corrigir_visita(uuid, text, text) from public, anon;
grant execute on function public.corrigir_visita(uuid, text, text) to authenticated, service_role;

-- ---------- RLS das visitas ----------
alter table public.visitas enable row level security;
revoke all on public.visitas from anon, authenticated;
grant select on public.visitas to authenticated;
grant insert (lead_id, empreendimento, inicio, local, observacao) on public.visitas to authenticated;
grant update (empreendimento, inicio, local, status, observacao, comprovante) on public.visitas to authenticated;

-- O corretor vê as dele, o gerente as da equipe, quem vê tudo vê todas.
drop policy if exists "ver visitas" on public.visitas;
create policy "ver visitas" on public.visitas
  for select to authenticated using (public.pode_ver_dados_de(corretor_id));

-- Agendar: só o dono do lead, para ele mesmo.
drop policy if exists "agendar visita" on public.visitas;
create policy "agendar visita" on public.visitas
  for insert to authenticated with check (
    corretor_id = auth.uid()
    and public.has_permission('leads.cadastrar')
    and exists (select 1 from public.leads l where l.id = lead_id and l.dono_id = auth.uid())
  );

-- Alterar: o corretor da visita, ou o gerente com visitas.baixa_equipe que vê
-- o corretor (o gatilho limita este à baixa, à correção e às anotações).
drop policy if exists "alterar visita" on public.visitas;
create policy "alterar visita" on public.visitas
  for update to authenticated
  using (
    (corretor_id = auth.uid() and public.has_permission('leads.cadastrar'))
    or (public.has_permission('visitas.baixa_equipe') and public.pode_ver_dados_de(corretor_id))
  )
  with check (
    (corretor_id = auth.uid() and public.has_permission('leads.cadastrar'))
    or (public.has_permission('visitas.baixa_equipe') and public.pode_ver_dados_de(corretor_id))
  );

-- ---------- Mensagem "Confirmar visita" com o dia e a hora ----------
-- {visita} vira "amanhã, às 10h, no Stand de vendas". Só troca o texto se ele
-- ainda for o original: o que o gerente geral ajustou fica como está.
update public.mensagens_modelo
   set texto = E'Oi, {primeiro_nome}, tudo bem?\n\nPassando para confirmar nossa visita a {empreendimento}, {visita}. Se surgir qualquer imprevisto, é só me avisar por aqui.\n\nAté lá. {corretor}, da MBigucci.'
 where slug = 'confirmar_visita'
   and texto = E'Oi, {primeiro_nome}, tudo bem?\n\nPassando para confirmar nossa visita a {empreendimento}. Se surgir qualquer imprevisto, é só me avisar por aqui.\n\nAté lá. {corretor}, da MBigucci.';
