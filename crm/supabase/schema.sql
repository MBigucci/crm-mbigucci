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
-- A lista é a completa (com os tipos da venda, mais abaixo): rodar o script de
-- novo recria este check com eventos de venda já gravados.
alter table public.lead_eventos add constraint lead_eventos_tipo_check check (tipo in
  ('criado', 'etapa', 'temperatura', 'status', 'dono', 'visita', 'visita_horario', 'visita_comprovante',
   'venda', 'venda_pagamento', 'venda_correcao'));

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

-- =====================================================================
-- Vendas e metas (itens 11 e 12 de docs/referencia-crm-bruna.md). Regras em
-- docs/vendas-metas.md. A venda conta no mês da assinatura; o VGV válido é o
-- das vendas assinadas e pagas. Sem exclusão: a venda é cancelada com motivo.
-- =====================================================================

-- ---------- Permissões do módulo ----------
-- O corretor registra as próprias vendas e cria metas com leads.cadastrar.
-- vendas.corrigir_equipe: o gerente corrige e cancela as vendas da equipe.
-- metas.definir_vgv: só o gerente geral, por padrão (ele tem todas).
-- painel.campanha: a conversão por campanha no painel (o corretor vê a dele).
with novas as (
  insert into public.permissions (slug, descricao, ordem) values
    ('vendas.corrigir_equipe', 'Corrigir e cancelar as vendas da equipe, com o motivo', 8),
    ('metas.definir_vgv',      'Definir a meta anual de VGV, geral e por corretor', 9),
    ('painel.campanha',        'Ver a conversão por campanha no painel', 10)
  on conflict (slug) do update set descricao = excluded.descricao, ordem = excluded.ordem
  returning slug, (xmax = 0) as nova
)
insert into public.role_permissions (perfil, permissao)
select v.perfil, v.permissao
from (values ('gerente', 'vendas.corrigir_equipe'), ('corretor', 'painel.campanha')) as v (perfil, permissao)
join novas n on n.slug = v.permissao and n.nova
on conflict do nothing;

-- ---------- Vendas ----------
-- assinada_em e pago_em são datas (dia de São Paulo), não horários: a venda
-- conta no mês da assinatura. O corretor é o dono do lead no registro e não
-- muda depois. registrada_por e cancelada_* são carimbados pelo gatilho.
create table if not exists public.vendas (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid not null references public.leads (id) on delete restrict,
  corretor_id          uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  empreendimento       text not null check (length(btrim(empreendimento)) > 0),
  unidade              text,
  vgv                  numeric(14, 2) not null check (vgv > 0),
  assinada_em          date not null,
  pagamento            text not null default 'pendente' check (pagamento in ('pendente', 'pago')),
  pago_em              date,
  observacao           text,
  status               text not null default 'ativa' check (status in ('ativa', 'cancelada')),
  motivo_cancelamento  text,
  cancelada_por        uuid references public.profiles (id) on delete set null,
  cancelada_em         timestamptz,
  registrada_por       uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint vendas_pagamento_tem_data check ((pagamento = 'pago') = (pago_em is not null)),
  constraint vendas_cancelamento_tem_motivo check ((status = 'cancelada') = (motivo_cancelamento is not null))
);

create index if not exists vendas_corretor_assinada_idx on public.vendas (corretor_id, assinada_em);
create index if not exists vendas_lead_idx on public.vendas (lead_id);

-- O histórico do lead ganha os eventos da venda: "venda" (registrada, cancelada
-- ou reativada; detalhe = motivo), "venda_pagamento" (pendente ou pago) e
-- "venda_correcao" (de/para = os campos corrigidos em JSON; detalhe = motivo).
alter table public.lead_eventos add column if not exists venda_id uuid references public.vendas (id) on delete restrict;
alter table public.lead_eventos drop constraint if exists lead_eventos_tipo_check;
alter table public.lead_eventos add constraint lead_eventos_tipo_check check (tipo in
  ('criado', 'etapa', 'temperatura', 'status', 'dono', 'visita', 'visita_horario', 'visita_comprovante',
   'venda', 'venda_pagamento', 'venda_correcao'));

-- Regras da venda que as policies sozinhas não expressam. Pelo SQL Editor (sem
-- usuário logado) só valem os checks, para permitir correções.
-- - Registrar: só em lead ativo, com assinatura e pagamento até hoje.
-- - Marcar como paga (pendente → pago) não pede motivo: é o andamento normal.
-- - Todo o resto (corrigir, voltar para pendente, cancelar, reativar) só pela
--   função corrigir_venda, com o motivo, e por quem tem vendas.corrigir_equipe.
create or replace function public.vendas_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  v_motivo text := nullif(btrim(coalesce(current_setting('crm.motivo_venda', true), '')), '');
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_dados boolean;
  v_pagou boolean;
begin
  new.empreendimento := btrim(new.empreendimento);
  new.unidade := nullif(btrim(coalesce(new.unidade, '')), '');
  new.observacao := nullif(btrim(coalesce(new.observacao, '')), '');

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.registrada_por := coalesce(v_eu, new.registrada_por);
    if v_eu is null then
      return new;
    end if;
    new.status := 'ativa';
    new.motivo_cancelamento := null;
    new.cancelada_por := null;
    new.cancelada_em := null;
    if not exists (select 1 from public.leads l where l.id = new.lead_id and l.status = 'ativo') then
      raise exception 'Só um lead ativo pode ter venda registrada.' using errcode = 'P0001';
    end if;
    if new.assinada_em > v_hoje then
      raise exception 'A data da assinatura não pode ser depois de hoje.' using errcode = 'P0001';
    end if;
    if new.pago_em > v_hoje then
      raise exception 'A data do pagamento não pode ser depois de hoje.' using errcode = 'P0001';
    end if;
    return new;
  end if;

  new.lead_id := old.lead_id;
  new.corretor_id := old.corretor_id;
  new.registrada_por := old.registrada_por;
  new.created_at := old.created_at;

  -- Quem cancelou, quando e por quê: só o banco carimba.
  if new.status = 'cancelada' and old.status <> 'cancelada' then
    new.motivo_cancelamento := v_motivo;
    new.cancelada_por := v_eu;
    new.cancelada_em := now();
  elsif new.status = 'cancelada' then
    new.motivo_cancelamento := old.motivo_cancelamento;
    new.cancelada_por := old.cancelada_por;
    new.cancelada_em := old.cancelada_em;
  else
    new.motivo_cancelamento := null;
    new.cancelada_por := null;
    new.cancelada_em := null;
  end if;

  if v_eu is null then
    if new.status = 'cancelada' and new.motivo_cancelamento is null then
      new.motivo_cancelamento := 'Cancelada pelo SQL Editor';
    end if;
    return new;
  end if;

  v_dados := (new.empreendimento, new.unidade, new.vgv, new.assinada_em, new.observacao, new.status)
             is distinct from (old.empreendimento, old.unidade, old.vgv, old.assinada_em, old.observacao, old.status);
  v_pagou := old.status = 'ativa' and old.pagamento = 'pendente' and new.pagamento = 'pago';

  if v_dados or (not v_pagou and (new.pagamento, new.pago_em) is distinct from (old.pagamento, old.pago_em)) then
    if v_motivo is null then
      raise exception 'Para mudar a venda, use Corrigir e escreva o motivo.' using errcode = 'P0001';
    end if;
    if not public.has_permission('vendas.corrigir_equipe') then
      raise exception 'Só o gerente corrige ou cancela a venda.' using errcode = '42501';
    end if;
    if old.status = 'cancelada' and new.status = 'cancelada' then
      raise exception 'Reative a venda antes de corrigir.' using errcode = 'P0001';
    end if;
  end if;

  if new.assinada_em > v_hoje then
    raise exception 'A data da assinatura não pode ser depois de hoje.' using errcode = 'P0001';
  end if;
  if new.pago_em > v_hoje and new.pago_em is distinct from old.pago_em then
    raise exception 'A data do pagamento não pode ser depois de hoje.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists vendas_guard on public.vendas;
create trigger vendas_guard before insert or update on public.vendas
  for each row execute function public.vendas_guard();

drop trigger if exists vendas_set_updated_at on public.vendas;
create trigger vendas_set_updated_at before update on public.vendas
  for each row execute function public.set_updated_at();

-- A venda move o lead: registrar (ou reativar) leva a "venda". Cancelar a
-- última venda ativa do lead devolve a "proposta". Como na visita, a escrita no
-- lead passa pelo leads_guard (pg_trigger_depth() > 1) e sai como automática.
create or replace function public.venda_atualiza_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ativa' and (tg_op = 'INSERT' or old.status <> 'ativa') then
    update public.leads set etapa = 'venda' where id = new.lead_id and etapa <> 'venda';
  elsif tg_op = 'UPDATE' and new.status = 'cancelada' and old.status <> 'cancelada'
        and not exists (select 1 from public.vendas v where v.lead_id = new.lead_id and v.status = 'ativa' and v.id <> new.id) then
    update public.leads set etapa = 'proposta' where id = new.lead_id and etapa = 'venda';
  end if;
  return new;
end;
$$;

drop trigger if exists venda_atualiza_lead on public.vendas;
create trigger venda_atualiza_lead after insert or update on public.vendas
  for each row execute function public.venda_atualiza_lead();

-- Histórico: o registro, o cancelamento, o pagamento e cada correção vão para
-- lead_eventos, com o autor da sessão. O motivo da correção vai no detalhe.
create or replace function public.venda_registra_eventos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  v_auto boolean := pg_trigger_depth() > 1;
  v_motivo text := nullif(btrim(coalesce(current_setting('crm.motivo_venda', true), '')), '');
  v_de jsonb := '{}';
  v_para jsonb := '{}';
  v_velho jsonb;
  v_novo jsonb;
  c text;
begin
  if tg_op = 'INSERT' then
    insert into public.lead_eventos (lead_id, venda_id, tipo, para, automatico, autor_id, criado_em)
    values (new.lead_id, new.id, 'venda', 'ativa', v_auto, coalesce(v_eu, new.registrada_por), new.created_at);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.lead_eventos (lead_id, venda_id, tipo, de, para, detalhe, automatico, autor_id)
    values (new.lead_id, new.id, 'venda', old.status, new.status, coalesce(v_motivo, new.motivo_cancelamento), v_auto, v_eu);
  end if;
  if new.pagamento is distinct from old.pagamento then
    insert into public.lead_eventos (lead_id, venda_id, tipo, de, para, detalhe, automatico, autor_id)
    values (new.lead_id, new.id, 'venda_pagamento', old.pagamento, new.pagamento, v_motivo, v_auto, v_eu);
  end if;
  v_velho := to_jsonb(old);
  v_novo := to_jsonb(new);
  foreach c in array array['empreendimento', 'unidade', 'vgv', 'assinada_em', 'pago_em', 'observacao'] loop
    -- A data do pagamento que muda junto com o pagamento já está no evento acima.
    continue when c = 'pago_em' and new.pagamento is distinct from old.pagamento;
    if (v_velho -> c) is distinct from (v_novo -> c) then
      v_de := v_de || jsonb_build_object(c, v_velho -> c);
      v_para := v_para || jsonb_build_object(c, v_novo -> c);
    end if;
  end loop;
  if v_para <> '{}'::jsonb then
    insert into public.lead_eventos (lead_id, venda_id, tipo, de, para, detalhe, automatico, autor_id)
    values (new.lead_id, new.id, 'venda_correcao', v_de::text, v_para::text, v_motivo, v_auto, v_eu);
  end if;
  return new;
end;
$$;

drop trigger if exists venda_registra_eventos on public.vendas;
create trigger venda_registra_eventos after insert or update on public.vendas
  for each row execute function public.venda_registra_eventos();

-- Corrigir, cancelar ou reativar uma venda, com o motivo, que vai para o
-- histórico. Passa pelo RLS e pelo vendas_guard. p_campos traz só o que muda:
-- empreendimento, unidade, vgv, assinada_em, pagamento, pago_em, observacao, status.
create or replace function public.corrigir_venda(p_venda uuid, p_campos jsonb, p_motivo text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Entre no CRM para corrigir a venda.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Escreva o motivo da correção.' using errcode = 'P0001';
  end if;
  perform set_config('crm.motivo_venda', left(btrim(p_motivo), 280), true);
  update public.vendas
     set empreendimento = case when p_campos ? 'empreendimento' then p_campos ->> 'empreendimento' else empreendimento end,
         unidade        = case when p_campos ? 'unidade' then p_campos ->> 'unidade' else unidade end,
         vgv            = case when p_campos ? 'vgv' then (p_campos ->> 'vgv')::numeric else vgv end,
         assinada_em    = case when p_campos ? 'assinada_em' then (p_campos ->> 'assinada_em')::date else assinada_em end,
         pagamento      = case when p_campos ? 'pagamento' then p_campos ->> 'pagamento' else pagamento end,
         pago_em        = case when p_campos ? 'pago_em' then (p_campos ->> 'pago_em')::date else pago_em end,
         observacao     = case when p_campos ? 'observacao' then p_campos ->> 'observacao' else observacao end,
         status         = case when p_campos ? 'status' then p_campos ->> 'status' else status end
   where id = p_venda;
  if not found then
    raise exception 'Venda não encontrada, ou você não pode alterá-la.' using errcode = '42501';
  end if;
  perform set_config('crm.motivo_venda', '', true);
end;
$$;

revoke all on function public.corrigir_venda(uuid, jsonb, text) from public, anon;
grant execute on function public.corrigir_venda(uuid, jsonb, text) to authenticated, service_role;

-- A etapa "venda" vem do registro da venda: o corretor não leva o lead para lá
-- à mão (a ficha abre o registro). O que vem de gatilho e do SQL Editor passa.
create or replace function public.leads_venda_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and pg_trigger_depth() = 1
     and new.etapa = 'venda' and old.etapa is distinct from 'venda'
     and not exists (select 1 from public.vendas v where v.lead_id = new.id and v.status = 'ativa') then
    raise exception 'Registre a venda na ficha do lead para levá-lo à etapa Venda.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists leads_venda_guard on public.leads;
create trigger leads_venda_guard before update on public.leads
  for each row execute function public.leads_venda_guard();

-- ---------- RLS das vendas ----------
alter table public.vendas enable row level security;
revoke all on public.vendas from anon, authenticated;
grant select on public.vendas to authenticated;
grant insert (lead_id, empreendimento, unidade, vgv, assinada_em, pagamento, pago_em, observacao) on public.vendas to authenticated;
grant update (empreendimento, unidade, vgv, assinada_em, pagamento, pago_em, observacao, status) on public.vendas to authenticated;

-- O corretor vê as dele, o gerente as da equipe, quem vê tudo vê todas.
drop policy if exists "ver vendas" on public.vendas;
create policy "ver vendas" on public.vendas
  for select to authenticated using (public.pode_ver_dados_de(corretor_id));

-- Registrar: só o dono do lead, para ele mesmo. O gerente não vende.
drop policy if exists "registrar venda" on public.vendas;
create policy "registrar venda" on public.vendas
  for insert to authenticated with check (
    corretor_id = auth.uid()
    and public.has_permission('leads.cadastrar')
    and exists (select 1 from public.leads l where l.id = lead_id and l.dono_id = auth.uid())
  );

-- Alterar: o corretor da venda (o gatilho limita a marcar como paga) ou quem
-- corrige as vendas da equipe e vê o corretor.
drop policy if exists "alterar venda" on public.vendas;
create policy "alterar venda" on public.vendas
  for update to authenticated
  using (
    (corretor_id = auth.uid() and public.has_permission('leads.cadastrar'))
    or (public.has_permission('vendas.corrigir_equipe') and public.pode_ver_dados_de(corretor_id))
  )
  with check (
    (corretor_id = auth.uid() and public.has_permission('leads.cadastrar'))
    or (public.has_permission('vendas.corrigir_equipe') and public.pode_ver_dados_de(corretor_id))
  );

-- ---------- Meta anual de VGV ----------
-- Uma linha por ano sem corretor é o valor geral; com corretor, o valor dele.
-- Sem linha, vale o padrão de R$ 10.000.000 (META_VGV_PADRAO em crm/src/lib/metas.ts).
create table if not exists public.metas_vgv (
  id              uuid primary key default gen_random_uuid(),
  ano             smallint not null check (ano between 2020 and 2100),
  corretor_id     uuid references public.profiles (id) on delete cascade,
  valor           numeric(14, 2) not null check (valor > 0),
  atualizado_por  uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at      timestamptz not null default now()
);

create unique index if not exists metas_vgv_unica
  on public.metas_vgv (ano, coalesce(corretor_id, '00000000-0000-0000-0000-000000000000'::uuid));

create or replace function public.metas_vgv_carimbo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.ano := old.ano;
    new.corretor_id := old.corretor_id;
  end if;
  if new.corretor_id is not null
     and not exists (select 1 from public.profiles p where p.id = new.corretor_id and p.perfil = 'corretor') then
    raise exception 'A meta por corretor vale só para corretores.' using errcode = 'P0001';
  end if;
  new.atualizado_por := coalesce(auth.uid(), new.atualizado_por);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists metas_vgv_carimbo on public.metas_vgv;
create trigger metas_vgv_carimbo before insert or update on public.metas_vgv
  for each row execute function public.metas_vgv_carimbo();

alter table public.metas_vgv enable row level security;
revoke all on public.metas_vgv from anon, authenticated;
grant select, delete on public.metas_vgv to authenticated;
grant insert (ano, corretor_id, valor) on public.metas_vgv to authenticated;
grant update (valor) on public.metas_vgv to authenticated;

-- Todo ativo lê o valor geral; o valor de um corretor segue pode_ver_dados_de.
drop policy if exists "ver metas de vgv" on public.metas_vgv;
create policy "ver metas de vgv" on public.metas_vgv
  for select to authenticated using (
    public.current_perfil() is not null and (corretor_id is null or public.pode_ver_dados_de(corretor_id))
  );

drop policy if exists "definir metas de vgv" on public.metas_vgv;
create policy "definir metas de vgv" on public.metas_vgv
  for all to authenticated
  using (public.has_permission('metas.definir_vgv'))
  with check (public.has_permission('metas.definir_vgv'));

-- ---------- Metas próprias do corretor ----------
-- Como as da Bruna: métrica, período (mês, trimestre, semestre e ano são os atuais; o
-- personalizado começa no mês "inicio" e dura "meses"), valor e "no painel".
-- O progresso é calculado pelos dados (crm/src/lib/metas.ts).
create table if not exists public.metas (
  id          uuid primary key default gen_random_uuid(),
  dono_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  metrica     text not null check (metrica in ('leads', 'contatos', 'visitas', 'vendas', 'vgv')),
  periodo     text not null,
  inicio      date,
  meses       smallint check (meses is null or meses between 1 and 24),
  valor       numeric(14, 2) not null check (valor > 0),
  no_painel   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint metas_personalizado check ((periodo = 'personalizado') = (inicio is not null and meses is not null)),
  constraint metas_inicio_no_dia_1 check (inicio is null or extract(day from inicio) = 1),
  constraint metas_contagem_inteira check (metrica = 'vgv' or valor = trunc(valor))
);

-- Períodos da Bruna: mês, trimestre, semestre, ano e personalizado.
alter table public.metas drop constraint if exists metas_periodo_check;
alter table public.metas add constraint metas_periodo_check
  check (periodo in ('mes', 'trimestre', 'semestre', 'ano', 'personalizado'));

-- Uma meta por métrica e período (no personalizado, pelo mesmo início e duração).
create unique index if not exists metas_sem_duplicar
  on public.metas (dono_id, metrica, periodo, coalesce(inicio, '2000-01-01'::date), coalesce(meses, 0));

drop trigger if exists metas_set_updated_at on public.metas;
create trigger metas_set_updated_at before update on public.metas
  for each row execute function public.set_updated_at();

alter table public.metas enable row level security;
revoke all on public.metas from anon, authenticated;
grant select, delete on public.metas to authenticated;
grant insert (metrica, periodo, inicio, meses, valor, no_painel) on public.metas to authenticated;
grant update (metrica, periodo, inicio, meses, valor, no_painel) on public.metas to authenticated;

drop policy if exists "ver metas" on public.metas;
create policy "ver metas" on public.metas
  for select to authenticated using (public.pode_ver_dados_de(dono_id));

-- Só o próprio corretor cria, muda e exclui as metas dele (não é registro de auditoria).
drop policy if exists "minhas metas" on public.metas;
create policy "minhas metas" on public.metas
  for all to authenticated
  using (dono_id = auth.uid() and public.has_permission('leads.cadastrar'))
  with check (dono_id = auth.uid() and public.has_permission('leads.cadastrar'));

-- ---------- Faixas de VGV do mês (só o gerente geral) ----------
-- Regra fixa, sem permissão no catálogo: o assunto é sigiloso até a reunião de
-- novembro/2026 (docs/pontuacao-verba.md). O título e os textos da tela ficam
-- em app_settings, que só o gerente geral lê, porque o código do site é público.
-- O padrão das faixas entra só na primeira vez.
create table if not exists public.faixas_vgv (
  id              uuid primary key default gen_random_uuid(),
  vgv_minimo      numeric(14, 2) not null unique check (vgv_minimo > 0),
  valor           numeric(12, 2) not null check (valor >= 0),
  atualizado_por  uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at      timestamptz not null default now()
);

create or replace function public.faixas_vgv_carimbo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_por := coalesce(auth.uid(), new.atualizado_por);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists faixas_vgv_carimbo on public.faixas_vgv;
create trigger faixas_vgv_carimbo before insert or update on public.faixas_vgv
  for each row execute function public.faixas_vgv_carimbo();

alter table public.faixas_vgv enable row level security;
revoke all on public.faixas_vgv from anon, authenticated;
grant select, delete on public.faixas_vgv to authenticated;
grant insert (vgv_minimo, valor), update (vgv_minimo, valor) on public.faixas_vgv to authenticated;

drop policy if exists "gerente geral define faixas" on public.faixas_vgv;
create policy "gerente geral define faixas" on public.faixas_vgv
  for all to authenticated using (public.is_gerente_geral()) with check (public.is_gerente_geral());

with nova as (
  insert into public.app_settings (chave, valor, rotulo, descricao) values
    ('faixas_vgv', '{"coluna": "Prêmio"}'::jsonb, 'Premiação mensal por VGV',
     'Vale só a faixa mais alta atingida no mês (não acumula), com as vendas assinadas e pagas, contadas no mês da assinatura. O prêmio é liberado no mês seguinte. Só o gerente geral vê esta tela até a reunião de novembro/2026.')
  on conflict (chave) do update set rotulo = excluded.rotulo, descricao = excluded.descricao
  returning (xmax = 0) as nova
)
insert into public.faixas_vgv (vgv_minimo, valor)
select f.minimo, f.valor
from (values (1000000, 2000), (1500000, 3000), (2000000, 5000), (3000000, 10000)) as f (minimo, valor)
join nova on nova.nova
on conflict (vgv_minimo) do nothing;

-- =====================================================================
-- Programa de pontuação e verba (sigiloso até a reunião de novembro/2026).
-- Regras em docs/pontuacao-verba.md. Tudo atrás da chave programa_verba_ativo:
-- com ela desligada, só o gerente geral recebe alguma linha destas tabelas.
-- O cálculo da verba é a função pura crm/src/lib/programa.ts; aqui ficam os
-- lançamentos, a aprovação (só o gerente geral), a auditoria e o fechamento.
-- =====================================================================

-- ---------- Permissões do módulo ----------
-- Descrições neutras, porque o catálogo é lido por todo usuário ativo.
-- plantao.registrar: períodos do plantão e saída para visita, de qualquer corretor.
-- lancamentos.registrar: períodos e vídeos dos corretores que a pessoa vê.
with novas as (
  insert into public.permissions (slug, descricao, ordem) values
    ('plantao.registrar',     'Registrar os períodos do plantão e a saída para visita', 11),
    ('lancamentos.registrar', 'Registrar períodos e vídeos dos corretores que vê, para conferência do gerente geral', 12)
  on conflict (slug) do update set descricao = excluded.descricao, ordem = excluded.ordem
  returning slug, (xmax = 0) as nova
)
insert into public.role_permissions (perfil, permissao)
select v.perfil, v.permissao
from (values ('recepcao', 'plantao.registrar'), ('operacional', 'plantao.registrar'),
             ('gerente', 'lancamentos.registrar'), ('operacional', 'lancamentos.registrar')) as v (perfil, permissao)
join novas n on n.slug = v.permissao and n.nova
on conflict do nothing;

-- Sem regra de primeiro mês (decisão do Felipe): o que o corretor faz no
-- primeiro mês já conta para a verba do segundo. Limpa a chave de uma versão
-- anterior deste script.
delete from public.app_settings where chave = 'programa_verba_inicio';

-- Estado do programa para o usuário logado (o app monta o menu com isso).
create or replace function public.programa_estado()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.current_perfil() is null then null
    else jsonb_build_object('ativo', private.programa_verba_ativo())
  end;
$$;

-- Vê o programa: o gerente geral sempre; os demais ativos só com a chave ligada.
create or replace function private.ve_programa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_gerente_geral() or (private.programa_verba_ativo() and public.current_perfil() is not null);
$$;

-- ---------- Critérios ----------
-- Os três da regra, com pontos e limite no mês editáveis pelo gerente geral.
-- O máximo é pontos × limite. Rodar de novo não sobrescreve o que foi ajustado.
create table if not exists public.criterios_pontos (
  slug            text primary key check (slug in ('periodo', 'video', 'visita')),
  nome            text not null check (length(btrim(nome)) > 0),
  pontos          integer not null check (pontos between 0 and 1000),
  limite_mes      integer not null check (limite_mes between 0 and 1000),
  maximo          integer generated always as (pontos * limite_mes) stored,
  ordem           smallint not null default 0,
  atualizado_por  uuid references public.profiles (id) on delete set null,
  updated_at      timestamptz not null default now()
);

insert into public.criterios_pontos (slug, nome, pontos, limite_mes, ordem) values
  ('periodo', 'Período integral cumprido', 5, 24, 1),
  ('video',   'Vídeo com a marca MBigucci', 5, 8, 2),
  ('visita',  'Visita realizada', 10, 12, 3)
on conflict (slug) do nothing;

drop trigger if exists criterios_pontos_carimbo on public.criterios_pontos;
create trigger criterios_pontos_carimbo before update on public.criterios_pontos
  for each row execute function public.faixas_vgv_carimbo();

-- ---------- Lançamentos ----------
-- Um lançamento é um período, um ou mais vídeos ou uma visita realizada, de um
-- corretor, num dia. Só conta depois que o gerente geral aprova. Sem exclusão:
-- quem lançou cancela o próprio pendente (e desfaz o cancelamento).
-- periodo: manhã (9h–14h) ou tarde (14h–19h). saida_visita: o corretor saiu
-- para visita no período, com a foto (comprovante) para não perder o período.
-- visita_id: a visita com baixa que gerou o lançamento (só pelo gatilho).
create table if not exists public.lancamentos_pontos (
  id             uuid primary key default gen_random_uuid(),
  corretor_id    uuid not null references public.profiles (id) on delete restrict,
  criterio       text not null references public.criterios_pontos (slug) on delete restrict,
  data           date not null,
  periodo        text check (periodo in ('manha', 'tarde')),
  quantidade     integer not null default 1 check (quantidade between 1 and 100),
  comprovante    text check (comprovante is null or comprovante ~* '^https?://[^\s]+$'),
  saida_visita   boolean not null default false,
  observacao     text,
  visita_id      uuid unique references public.visitas (id) on delete restrict,
  status         text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'cancelado')),
  motivo_recusa  text,
  lancado_por    uuid default auth.uid() references public.profiles (id) on delete set null,
  lancado_em     timestamptz not null default now(),
  decidido_por   uuid references public.profiles (id) on delete set null,
  decidido_em    timestamptz,
  updated_at     timestamptz not null default now(),
  constraint lancamentos_periodo_certo check ((criterio = 'periodo') = (periodo is not null)),
  constraint lancamentos_quantidade_um check (criterio = 'video' or quantidade = 1),
  constraint lancamentos_visita_certa check ((criterio = 'visita') = (visita_id is not null)),
  constraint lancamentos_saida_com_foto check (not saida_visita or (criterio = 'periodo' and comprovante is not null)),
  constraint lancamentos_recusa_tem_motivo check (status <> 'recusado' or motivo_recusa is not null),
  constraint lancamentos_decisao_carimbada check ((status in ('aprovado', 'recusado')) = (decidido_em is not null))
);

create index if not exists lancamentos_corretor_data_idx on public.lancamentos_pontos (corretor_id, data);
create index if not exists lancamentos_status_idx on public.lancamentos_pontos (status, data);
-- Um período por corretor, dia e turno (os recusados e cancelados não contam).
create unique index if not exists lancamentos_periodo_unico on public.lancamentos_pontos (corretor_id, data, periodo)
  where criterio = 'periodo' and status in ('pendente', 'aprovado');

-- Auditoria: cada lançamento e cada mudança, com quem fez e quando. Só o
-- gatilho grava; só o gerente geral lê.
create table if not exists public.lancamentos_pontos_historico (
  id             bigint generated always as identity primary key,
  lancamento_id  uuid not null references public.lancamentos_pontos (id) on delete restrict,
  acao           text not null check (acao in ('criado', 'alterado')),
  de             jsonb,
  para           jsonb not null,
  autor_id       uuid references public.profiles (id) on delete set null,
  criado_em      timestamptz not null default now()
);
create index if not exists lancamentos_historico_idx on public.lancamentos_pontos_historico (lancamento_id, id);

-- Regras que as policies sozinhas não expressam. Pelo SQL Editor (sem usuário
-- logado) e pelo gatilho das visitas só valem os checks e os carimbos.
-- - Lançar: sempre pendente, para corretor ativo, até hoje; visita só pela baixa.
-- - Aprovar, recusar e voltar para pendente (o Desfazer): só o gerente geral.
-- - Quem lançou só cancela o próprio pendente e desfaz o cancelamento.
create or replace function public.lancamentos_pontos_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  v_livre boolean := auth.uid() is null or pg_trigger_depth() > 1;
  v_gg boolean := public.is_gerente_geral();
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  new.comprovante := nullif(btrim(coalesce(new.comprovante, '')), '');
  new.observacao := nullif(btrim(coalesce(new.observacao, '')), '');
  new.motivo_recusa := nullif(btrim(coalesce(new.motivo_recusa, '')), '');
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.lancado_em := now();
    if not v_livre then
      new.lancado_por := v_eu;
      new.status := 'pendente';
      if new.criterio = 'visita' then
        raise exception 'As visitas entram sozinhas, pela baixa da visita realizada.' using errcode = 'P0001';
      end if;
      if new.data > v_hoje then
        raise exception 'A data não pode ser depois de hoje.' using errcode = 'P0001';
      end if;
      if not exists (select 1 from public.profiles p where p.id = new.corretor_id and p.perfil = 'corretor' and p.ativo) then
        raise exception 'Lançamentos são só para corretores ativos.' using errcode = 'P0001';
      end if;
    end if;
  else
    -- O que identifica o lançamento não muda depois.
    new.corretor_id := old.corretor_id;
    new.criterio := old.criterio;
    new.data := old.data;
    new.periodo := old.periodo;
    new.quantidade := old.quantidade;
    new.saida_visita := old.saida_visita;
    new.visita_id := old.visita_id;
    new.lancado_por := old.lancado_por;
    new.lancado_em := old.lancado_em;
    if not v_livre and not v_gg then
      new.motivo_recusa := old.motivo_recusa;
      if new.status is distinct from old.status
         and not (old.lancado_por = v_eu and old.status in ('pendente', 'cancelado') and new.status in ('pendente', 'cancelado')) then
        raise exception 'Só o gerente geral aprova ou recusa.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- Carimbo da decisão (aprovar ou recusar); os outros status não têm decisão.
  if new.status in ('aprovado', 'recusado') then
    if tg_op = 'INSERT' or new.status is distinct from old.status then
      new.decidido_por := coalesce(v_eu, new.decidido_por);
      new.decidido_em := now();
    end if;
  else
    new.decidido_por := null;
    new.decidido_em := null;
  end if;
  if new.status <> 'recusado' then new.motivo_recusa := null; end if;
  return new;
end;
$$;

drop trigger if exists lancamentos_pontos_guard on public.lancamentos_pontos;
create trigger lancamentos_pontos_guard before insert or update on public.lancamentos_pontos
  for each row execute function public.lancamentos_pontos_guard();

create or replace function public.lancamentos_pontos_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campos constant text[] := array['status', 'motivo_recusa', 'comprovante', 'observacao', 'decidido_por'];
  v_de jsonb := '{}';
  v_para jsonb := '{}';
  c text;
begin
  if tg_op = 'INSERT' then
    insert into public.lancamentos_pontos_historico (lancamento_id, acao, para, autor_id)
    values (new.id, 'criado', to_jsonb(new) - 'updated_at', coalesce(auth.uid(), new.lancado_por));
    return new;
  end if;
  foreach c in array v_campos loop
    if (to_jsonb(old) -> c) is distinct from (to_jsonb(new) -> c) then
      v_de := v_de || jsonb_build_object(c, to_jsonb(old) -> c);
      v_para := v_para || jsonb_build_object(c, to_jsonb(new) -> c);
    end if;
  end loop;
  if v_para <> '{}' then
    insert into public.lancamentos_pontos_historico (lancamento_id, acao, de, para, autor_id)
    values (new.id, 'alterado', v_de, v_para, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists lancamentos_pontos_auditoria on public.lancamentos_pontos;
create trigger lancamentos_pontos_auditoria after insert or update on public.lancamentos_pontos
  for each row execute function public.lancamentos_pontos_auditoria();

-- A baixa "realizada" da visita vira um lançamento pendente, uma vez por visita
-- (visita_id é único). Se a correção tira a visita de realizada, o lançamento
-- é cancelado; se volta a realizada, o cancelado volta a pendente. A data é o
-- dia da visita, na hora de São Paulo. Roda com a chave ligada ou desligada.
create or replace function public.visita_lanca_pontos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'realizada' and (tg_op = 'INSERT' or old.status <> 'realizada') then
    insert into public.lancamentos_pontos (corretor_id, criterio, data, comprovante, visita_id, lancado_por)
    values (new.corretor_id, 'visita', (new.inicio at time zone 'America/Sao_Paulo')::date, new.comprovante, new.id,
            coalesce(new.baixa_por, auth.uid()))
    on conflict (visita_id) do update set status = 'pendente'
      where public.lancamentos_pontos.status = 'cancelado';
  elsif tg_op = 'UPDATE' and old.status = 'realizada' and new.status <> 'realizada' then
    update public.lancamentos_pontos set status = 'cancelado'
     where visita_id = new.id and status in ('pendente', 'aprovado');
  end if;
  return new;
end;
$$;

drop trigger if exists visita_lanca_pontos on public.visitas;
create trigger visita_lanca_pontos after insert or update on public.visitas
  for each row execute function public.visita_lanca_pontos();

-- Visitas realizadas antes deste script: entram uma vez, como pendentes.
insert into public.lancamentos_pontos (corretor_id, criterio, data, comprovante, visita_id, lancado_por)
select v.corretor_id, 'visita', (v.inicio at time zone 'America/Sao_Paulo')::date, v.comprovante, v.id, v.baixa_por
from public.visitas v
where v.status = 'realizada'
on conflict (visita_id) do nothing;

-- ---------- Fechamento do mês ----------
-- O gerente geral fecha o mês: a foto do cálculo por corretor (pontos, vendas,
-- verba e prêmio), liberada no mês seguinte. Fechar de novo substitui a foto.
create table if not exists public.fechamentos_verba (
  mes             date not null check (extract(day from mes) = 1),
  corretor_id     uuid not null references public.profiles (id) on delete restrict,
  pontos          integer not null check (pontos >= 0),
  pontos_validos  integer not null check (pontos_validos >= 0),
  vendas          integer not null check (vendas >= 0),
  vgv             numeric(14, 2) not null check (vgv >= 0),
  verba           numeric(12, 2) not null check (verba >= 0),
  premio          numeric(12, 2) not null check (premio >= 0),
  fechado_por     uuid default auth.uid() references public.profiles (id) on delete set null,
  fechado_em      timestamptz not null default now(),
  primary key (mes, corretor_id)
);
alter table public.fechamentos_verba drop column if exists primeiro_mes;

create or replace function public.fechamentos_verba_carimbo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.fechado_por := coalesce(auth.uid(), new.fechado_por);
  new.fechado_em := now();
  return new;
end;
$$;

drop trigger if exists fechamentos_verba_carimbo on public.fechamentos_verba;
create trigger fechamentos_verba_carimbo before insert or update on public.fechamentos_verba
  for each row execute function public.fechamentos_verba_carimbo();

-- ---------- Funções do programa ----------
-- Corretores ativos para a tela do plantão: todos para quem registra o plantão,
-- os que a pessoa vê para quem registra lançamentos. Nada com a chave desligada.
create or replace function public.plantao_corretores()
returns table (id uuid, nome text, equipe text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nome, t.nome
  from public.profiles p
  left join public.teams t on t.id = p.equipe_id
  where p.perfil = 'corretor' and p.ativo
    and private.ve_programa()
    and (public.has_permission('plantao.registrar')
         or (public.has_permission('lancamentos.registrar') and public.pode_ver_dados_de(p.id)))
  order by p.nome;
$$;

-- Ranking de pontos aprovados no mês de p_mes, com os limites de cada critério.
-- Todo usuário ativo vê, só com a chave ligada (o gerente geral, sempre).
create or replace function public.ranking_pontos(p_mes date)
returns table (corretor_id uuid, nome text, pontos integer)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select l.corretor_id, l.criterio, sum(l.quantidade) as qtd
    from public.lancamentos_pontos l
    where l.status = 'aprovado'
      and l.data >= date_trunc('month', p_mes)::date
      and l.data < (date_trunc('month', p_mes) + interval '1 month')::date
    group by 1, 2
  )
  select p.id, p.nome, coalesce(sum(least(q.qtd, c.limite_mes) * c.pontos), 0)::integer
  from public.profiles p
  left join q on q.corretor_id = p.id
  left join public.criterios_pontos c on c.slug = q.criterio
  where p.perfil = 'corretor' and p.ativo and private.ve_programa()
  group by p.id, p.nome
  order by 3 desc, 2;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.programa_estado()', 'private.ve_programa()', 'public.plantao_corretores()', 'public.ranking_pontos(date)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;

-- ---------- RLS do programa ----------
alter table public.criterios_pontos enable row level security;
alter table public.lancamentos_pontos enable row level security;
alter table public.lancamentos_pontos_historico enable row level security;
alter table public.fechamentos_verba enable row level security;
revoke all on public.criterios_pontos, public.lancamentos_pontos, public.lancamentos_pontos_historico,
              public.fechamentos_verba from anon, authenticated;

grant select on public.criterios_pontos to authenticated;
grant update (nome, pontos, limite_mes) on public.criterios_pontos to authenticated;
grant select on public.lancamentos_pontos to authenticated;
grant insert (corretor_id, criterio, data, periodo, quantidade, comprovante, saida_visita, observacao)
  on public.lancamentos_pontos to authenticated;
grant update (status, motivo_recusa) on public.lancamentos_pontos to authenticated;
grant select on public.lancamentos_pontos_historico to authenticated;
grant select on public.fechamentos_verba to authenticated;
grant insert (mes, corretor_id, pontos, pontos_validos, vendas, vgv, verba, premio),
      update (mes, corretor_id, pontos, pontos_validos, vendas, vgv, verba, premio) on public.fechamentos_verba to authenticated;

-- Critérios: o gerente geral sempre; os demais ativos só com a chave ligada.
drop policy if exists "ver criterios" on public.criterios_pontos;
create policy "ver criterios" on public.criterios_pontos
  for select to authenticated using (private.ve_programa());

drop policy if exists "gerente geral altera criterios" on public.criterios_pontos;
create policy "gerente geral altera criterios" on public.criterios_pontos
  for update to authenticated using (public.is_gerente_geral()) with check (public.is_gerente_geral());

-- Lançamentos, com a chave ligada: quem lançou vê o que lançou (a baixa que o
-- corretor dá na própria visita não conta como lançada por ele); quem vê os
-- dados de um corretor (o gerente, a equipe) vê os dele; quem registra o
-- plantão vê os períodos; o corretor vê os próprios aprovados. O gerente geral
-- vê tudo, sempre.
drop policy if exists "ver lancamentos" on public.lancamentos_pontos;
create policy "ver lancamentos" on public.lancamentos_pontos
  for select to authenticated using (
    public.is_gerente_geral()
    or (private.ve_programa() and (
      (lancado_por = auth.uid() and corretor_id <> auth.uid())
      or (corretor_id <> auth.uid() and public.pode_ver_dados_de(corretor_id))
      or (corretor_id = auth.uid() and status = 'aprovado')
      or (criterio = 'periodo' and public.has_permission('plantao.registrar'))
    ))
  );

-- Lançar: para outro corretor; o gerente geral sempre; os demais só com a chave
-- ligada, pela permissão (o gatilho deixa sempre pendente).
drop policy if exists "lancar pontos" on public.lancamentos_pontos;
create policy "lancar pontos" on public.lancamentos_pontos
  for insert to authenticated with check (
    lancado_por = auth.uid() and corretor_id <> auth.uid()
    and (public.is_gerente_geral() or (private.ve_programa() and (
      (public.has_permission('lancamentos.registrar') and public.pode_ver_dados_de(corretor_id))
      or (criterio = 'periodo' and public.has_permission('plantao.registrar'))
    )))
  );

-- Alterar: o gerente geral (aprova, recusa, desfaz) ou quem lançou para outro, com a chave
-- ligada (o gatilho limita a cancelar e desfazer o cancelamento).
drop policy if exists "alterar lancamentos" on public.lancamentos_pontos;
create policy "alterar lancamentos" on public.lancamentos_pontos
  for update to authenticated
  using (public.is_gerente_geral() or (private.ve_programa() and lancado_por = auth.uid() and corretor_id <> auth.uid()))
  with check (public.is_gerente_geral() or (private.ve_programa() and lancado_por = auth.uid() and corretor_id <> auth.uid()));

drop policy if exists "gerente geral le auditoria" on public.lancamentos_pontos_historico;
create policy "gerente geral le auditoria" on public.lancamentos_pontos_historico
  for select to authenticated using (public.is_gerente_geral());

-- Fechamento: o gerente geral faz e vê tudo; o corretor vê o dele com a chave ligada.
drop policy if exists "ver fechamentos" on public.fechamentos_verba;
create policy "ver fechamentos" on public.fechamentos_verba
  for select to authenticated using (
    public.is_gerente_geral() or (private.ve_programa() and corretor_id = auth.uid())
  );

drop policy if exists "gerente geral fecha o mes" on public.fechamentos_verba;
create policy "gerente geral fecha o mes" on public.fechamentos_verba
  for insert to authenticated with check (public.is_gerente_geral());

drop policy if exists "gerente geral refaz o fechamento" on public.fechamentos_verba;
create policy "gerente geral refaz o fechamento" on public.fechamentos_verba
  for update to authenticated using (public.is_gerente_geral()) with check (public.is_gerente_geral());
