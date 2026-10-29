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
  if new.dono_id is distinct from old.dono_id then
    insert into public.lead_eventos (lead_id, tipo, de, para, automatico, autor_id)
    values (new.id, 'dono', old.dono_id::text, new.dono_id::text, v_auto, v_eu);
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
