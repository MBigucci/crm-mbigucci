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
