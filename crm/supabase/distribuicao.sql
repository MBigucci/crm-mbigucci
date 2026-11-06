-- =====================================================================
-- Base360 Vendas: distribuição automática do lead da empresa
-- Desenho: docs/distribuicao-automatica.md (aprovado pelo Felipe em 06/11/2026).
-- Como usar: Supabase → SQL Editor → New query → cole tudo → Run.
-- Ordem: schema.sql, parcerias.sql, recepcao.sql e então este arquivo.
-- Idempotente: pode rodar de novo. O agendamento (pg_cron) fica à parte, em
-- agendar-distribuicao.sql.
--
-- O que faz:
--  - a entrada do lead da empresa (lead_empresa_entrada, só service_role);
--  - a escolha de quem recebe (modos equipe, direto e só gerentes, créditos
--    3/2/1, produtos, presença por check-in ou pela vez da recepção, plantão);
--  - a passagem adiante pelo prazo estourado, os represados e "A distribuir";
--  - as telas: botão "Recebendo leads", check-in, sinal, Fila de leads,
--    decisões, como é calculado e Configurações > Distribuição automática.
--
-- Regras fixas:
--  - toda a distribuição olha só origem = 'empresa', de forma explícita;
--  - cada mecanismo tem a sua chave em distribuicao_config, lida pelo banco a
--    cada decisão; só o gerente geral altera (is_gerente_geral());
--  - a escolha e o registro da decisão acontecem juntos, sob a trava 7305002
--    (a 7305001 é dos parceiros); não existe caminho que escolha sem registrar;
--  - sem coordenadas guardadas: só "dentro" ou "fora" e a distância em metros;
--  - nenhum campo diz que o lead passou pelo direcionador do Marketing;
--  - nenhum texto diz que o desempenho muda pontos ou verba.
-- Espaço deixado para Parcerias: leads.parceiro_id e leads.carteira_propria
-- não são tocados aqui; as policies de leads só ganham políticas novas, à parte.
-- =====================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------
-- 0. Relógio. Os testes trocam esta função por uma hora fixa.
-- ---------------------------------------------------------------------
create or replace function private.distribuicao_agora()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() $$;

-- Dentro do horário de atendimento (horario_atendimento, hora de São Paulo).
-- Horário inválido: sempre aberto, como fim_do_prazo.
create or replace function private.distribuicao_no_horario(p_t timestamptz)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  h public.horario_atendimento;
  t timestamp := p_t at time zone 'America/Sao_Paulo';
begin
  select * into h from public.horario_atendimento where id;
  if h.id is null or cardinality(h.dias) = 0 or h.inicio >= h.fim then
    return true;
  end if;
  return extract(dow from t)::smallint = any (h.dias) and t::time >= h.inicio and t::time < h.fim;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Permissões (catálogo lido por todos: descrições neutras)
-- ---------------------------------------------------------------------
with novas as (
  insert into public.permissions (slug, descricao, ordem) values
    ('distribuicao.receber',  'Receber leads da empresa pela distribuição automática', 40),
    ('distribuicao.produtos', 'Marcar os produtos que cada corretor atende', 41),
    ('leads.distribuir',      'Ver e atribuir os leads em "A distribuir"', 42)
  on conflict (slug) do update set descricao = excluded.descricao, ordem = excluded.ordem
  returning slug, (xmax = 0) as nova
)
insert into public.role_permissions (perfil, permissao)
select v.perfil, v.permissao
from (values ('corretor', 'distribuicao.receber'),
             ('gerente', 'distribuicao.produtos'), ('operacional', 'distribuicao.produtos')) as v (perfil, permissao)
join novas n on n.slug = v.permissao and n.nova
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Um gerente, uma equipe (Felipe, 16.1, 06/11/2026)
-- ---------------------------------------------------------------------
do $$
declare
  v_n integer;
begin
  if to_regclass('public.teams_gerente_unico') is null then
    select count(*) into v_n from (select gerente_id from public.teams group by gerente_id having count(*) > 1) x;
    if v_n > 0 then
      raise exception 'Há % gerente(s) com mais de uma equipe. Ajuste as equipes (cada gerente com uma só) e rode de novo. Para ver quais: select gerente_id, count(*) from public.teams group by 1 having count(*) > 1;', v_n;
    end if;
    create unique index teams_gerente_unico on public.teams (gerente_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Configuração (uma linha) e o histórico das mudanças
-- ---------------------------------------------------------------------
create table if not exists public.distribuicao_config (
  id                     boolean primary key default true check (id),
  ligada                 boolean not null default false,  -- o Felipe liga no dia
  modo                   text not null default 'equipe' check (modo in ('equipe', 'direto', 'gerentes')),
  pesos                  boolean not null default true,
  exigir_checkin         boolean not null default true,
  sinal                  boolean not null default true,
  plantao                boolean not null default true,
  represar               boolean not null default true,
  produtos               boolean not null default true,
  redistribuir           boolean not null default true,
  fim_da_fila            boolean not null default true,
  repetido_ao_dono       boolean not null default true,
  manual_conta           boolean not null default true,
  transparencia          boolean not null default true,
  periodos_checkin       boolean not null default false,  -- Etapa 2
  aprova_gerente         boolean not null default false,  -- Etapa 2
  minutos_sem_sinal      integer not null default 30 check (minutos_sem_sinal between 10 and 240),
  minutos_plantao        integer not null default 30 check (minutos_plantao between 10 and 240),
  updated_at             timestamptz not null default now(),
  updated_by             uuid references public.profiles (id) on delete set null
);
insert into public.distribuicao_config (id) values (true) on conflict (id) do nothing;

create table if not exists public.distribuicao_config_historico (
  id      bigint generated always as identity primary key,
  quando  timestamptz not null default now(),
  quem    uuid references public.profiles (id) on delete set null,
  chave   text not null,
  de      text,
  para    text
);

create or replace function private.distribuicao_config_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text;
begin
  for k in select jsonb_object_keys(to_jsonb(new)) loop
    continue when k in ('id', 'updated_at', 'updated_by');
    if to_jsonb(new) -> k is distinct from to_jsonb(old) -> k then
      insert into public.distribuicao_config_historico (quem, chave, de, para)
      values (auth.uid(), k, to_jsonb(old) ->> k, to_jsonb(new) ->> k);
    end if;
  end loop;
  return null;
end;
$$;
drop trigger if exists distribuicao_config_auditoria on public.distribuicao_config;
create trigger distribuicao_config_auditoria after update on public.distribuicao_config
  for each row execute function private.distribuicao_config_auditoria();

create or replace function private.distribuicao_cfg()
returns public.distribuicao_config
language sql
stable
security definer
set search_path = ''
as $$ select * from public.distribuicao_config where id $$;

-- ---------------------------------------------------------------------
-- 4. Quem participa, pausas e produtos
-- ---------------------------------------------------------------------
create table if not exists public.distribuicao_corretores (
  corretor_id      uuid primary key references public.profiles (id) on delete cascade,
  participa        boolean not null default true,
  recebendo        boolean not null default false,
  recebendo_desde  timestamptz,
  pausado_ate      timestamptz,
  creditos         numeric not null default 0,
  ultimo_app_em    timestamptz,
  atualizado_por   uuid references public.profiles (id) on delete set null,
  atualizado_em    timestamptz not null default now()
);

create table if not exists public.distribuicao_pausas (
  id           bigint generated always as identity primary key,
  corretor_id  uuid not null references public.profiles (id) on delete cascade,
  tipo         text not null check (tipo in ('pausa', 'volta', 'fora', 'dentro', 'plantao_fim', 'liga', 'desliga')),
  ate          timestamptz,
  quem         uuid references public.profiles (id) on delete set null,
  quando       timestamptz not null default now()
);
create index if not exists distribuicao_pausas_corretor_idx on public.distribuicao_pausas (corretor_id, quando desc);

create table if not exists public.distribuicao_produtos (
  corretor_id        uuid not null references public.profiles (id) on delete cascade,
  empreendimento_id  uuid not null references public.empreendimentos (id) on delete cascade,
  primary key (corretor_id, empreendimento_id)
);

create table if not exists public.distribuicao_produtos_historico (
  id                 bigint generated always as identity primary key,
  corretor_id        uuid not null references public.profiles (id) on delete cascade,
  empreendimento_id  uuid not null references public.empreendimentos (id) on delete cascade,
  atende             boolean not null,
  quem               uuid references public.profiles (id) on delete set null,
  quando             timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Leads: lead sem dono só da empresa, e as colunas da distribuição
-- ---------------------------------------------------------------------
alter table public.leads alter column dono_id drop not null;
alter table public.leads add column if not exists distribuicao_estado text;
alter table public.leads add column if not exists equipe_id uuid references public.teams (id) on delete set null;
alter table public.leads add column if not exists distribuido boolean not null default false;
alter table public.leads add column if not exists redistribuicoes smallint not null default 0;
alter table public.leads add column if not exists prazo_imediato boolean not null default false;
alter table public.leads add column if not exists resposta_ate timestamptz;
alter table public.leads add column if not exists distribuicao_chegada timestamptz;

alter table public.leads drop constraint if exists leads_distribuicao_estado_check;
alter table public.leads add constraint leads_distribuicao_estado_check
  check (distribuicao_estado is null or distribuicao_estado in ('represado', 'fila_equipe', 'a_distribuir'));
alter table public.leads drop constraint if exists leads_sem_dono_so_empresa;
alter table public.leads add constraint leads_sem_dono_so_empresa
  check (dono_id is not null or (origem = 'empresa' and distribuicao_estado is not null));

create index if not exists leads_distribuicao_estado_idx on public.leads (distribuicao_estado, distribuicao_chegada)
  where distribuicao_estado is not null;
create index if not exists leads_distribuido_novo_idx on public.leads (dono_id)
  where distribuido and origem = 'empresa' and etapa = 'novo' and status = 'ativo';

-- ---------------------------------------------------------------------
-- 6. Entradas, decisões, estouros e avisos
-- ---------------------------------------------------------------------
-- Uma linha por entrada do Marketing. Sem dado do cliente e sem nada do
-- direcionador (regra, destino, falha de entrega).
create table if not exists public.distribuicao_entradas (
  entrada_id         text primary key check (length(entrada_id) between 1 and 500),
  lead_id            uuid references public.leads (id) on delete set null,
  recebido_em        timestamptz not null,
  gravado_em         timestamptz not null default now(),
  fonte              text not null,
  campanha           jsonb,
  empreendimento_id  uuid,
  situacao           text not null check (situacao in ('criado', 'anexado', 'reativado', 'a_distribuir')),
  resultado          jsonb
);

create table if not exists public.distribuicao_decisoes (
  id              bigint generated always as identity primary key,
  lead_id         uuid not null references public.leads (id) on delete cascade,
  quando          timestamptz not null,
  modo            text not null,
  motivo_entrada  text not null check (motivo_entrada in ('nova', 'redistribuida', 'represada', 'reativada', 'manual', 'mandada')),
  equipe_id       uuid references public.teams (id) on delete set null,
  equipes         jsonb not null default '[]',
  recebeu_id      uuid references public.profiles (id) on delete set null,
  resultado       text not null check (resultado in ('recebeu', 'represado', 'fila_equipe', 'a_distribuir')),
  fim_prazo       timestamptz,
  candidatos      jsonb not null default '[]'
);
create index if not exists distribuicao_decisoes_lead_idx on public.distribuicao_decisoes (lead_id, quando desc);
create index if not exists distribuicao_decisoes_recebeu_idx on public.distribuicao_decisoes (recebeu_id, quando desc);
create index if not exists distribuicao_decisoes_equipe_idx on public.distribuicao_decisoes (equipe_id, quando desc);
create index if not exists distribuicao_decisoes_quando_idx on public.distribuicao_decisoes (quando desc);

-- Cada estouro de prazo é tratado uma vez (o lead, o dono e o início do prazo).
create table if not exists public.distribuicao_estouros (
  lead_id      uuid not null references public.leads (id) on delete cascade,
  dono_id      uuid not null,
  inicio       timestamptz not null,
  quando       timestamptz not null,
  primary key (lead_id, dono_id, inicio)
);

create table if not exists public.distribuicao_avisos (
  id          bigint generated always as identity primary key,
  para_id     uuid not null references public.profiles (id) on delete cascade,
  tipo        text not null,
  lead_id     uuid references public.leads (id) on delete cascade,
  chave       text not null unique,
  dados       jsonb not null default '{}',
  criado_em   timestamptz not null default now(),
  enviado_em  timestamptz
);
create index if not exists distribuicao_avisos_pendentes_idx on public.distribuicao_avisos (para_id) where enviado_em is null;

-- ---------------------------------------------------------------------
-- 7. Presença: check-in, ausências, último sinal, tentativas
-- ---------------------------------------------------------------------
alter table public.plantoes add column if not exists lat numeric(9, 6);
alter table public.plantoes add column if not exists lng numeric(9, 6);
alter table public.plantoes add column if not exists raio_m integer not null default 200;
alter table public.plantoes drop constraint if exists plantoes_raio_check;
alter table public.plantoes add constraint plantoes_raio_check check (raio_m between 30 and 1000);
alter table public.plantoes drop constraint if exists plantoes_coordenadas_check;
alter table public.plantoes add constraint plantoes_coordenadas_check
  check ((lat is null) = (lng is null) and (lat is null or (lat between -90 and 90 and lng between -180 and 180)));
grant update (lat, lng, raio_m) on public.plantoes to authenticated;
grant insert (lat, lng, raio_m) on public.plantoes to authenticated;

-- O check-in do próprio corretor. Não é a vez da recepção (plantao_presencas
-- tem ordem e uma linha por turno; um check-in ali poria o corretor na vez).
create table if not exists public.distribuicao_presencas (
  id                  uuid primary key,              -- gerado no aparelho
  corretor_id         uuid not null references public.profiles (id) on delete cascade,
  plantao_id          uuid not null references public.plantoes (id) on delete restrict,
  dia                 date not null,
  entrada_em          timestamptz not null,
  entrada_dist_m      integer,
  entrada_precisao_m  integer,
  entrada_metodo      text not null default 'gps' check (entrada_metodo in ('gps', 'selfie')),
  saida_em            timestamptz,
  saida_dist_m        integer,
  saida_metodo        text check (saida_metodo in ('gps', 'manual', 'sem_saida', 'chave_desligada')),
  status              text not null default 'aberta' check (status in ('aberta', 'fechada', 'sem_saida'))
);
create unique index if not exists distribuicao_presencas_uma_aberta
  on public.distribuicao_presencas (corretor_id) where status = 'aberta';
create index if not exists distribuicao_presencas_dia_idx on public.distribuicao_presencas (plantao_id, dia);

create table if not exists public.distribuicao_ausencias (
  id           bigint generated always as identity primary key,
  presenca_id  uuid not null references public.distribuicao_presencas (id) on delete cascade,
  inicio       timestamptz not null,
  fim          timestamptz,
  motivo       text not null check (motivo in ('saiu', 'fora_do_raio', 'sem_sinal', 'visita'))
);
create unique index if not exists distribuicao_ausencias_uma_aberta
  on public.distribuicao_ausencias (presenca_id) where fim is null;

-- Só o último sinal de cada um. Não é histórico; sem coordenadas.
create table if not exists public.distribuicao_sinais (
  corretor_id   uuid primary key references public.profiles (id) on delete cascade,
  quando        timestamptz not null,
  dentro        boolean,
  precisao_m    integer,
  fora_desde    timestamptz,     -- primeiro sinal fora sem resposta
  ignorar_ate   timestamptz      -- respondeu "Estou no stand"
);

create table if not exists public.distribuicao_checkin_tentativas (
  id           bigint generated always as identity primary key,
  corretor_id  uuid not null references public.profiles (id) on delete cascade,
  quando       timestamptz not null,
  resultado    text not null,
  dist_m       integer,
  precisao_m   integer
);
create index if not exists distribuicao_tentativas_idx on public.distribuicao_checkin_tentativas (corretor_id, quando desc);

-- ---------------------------------------------------------------------
-- 8. Desempenho
-- ---------------------------------------------------------------------
create table if not exists public.distribuicao_followup_dia (
  corretor_id  uuid not null references public.profiles (id) on delete cascade,
  dia          date not null,
  ativos       integer not null,
  em_dia       integer not null,
  primary key (corretor_id, dia)
);

create table if not exists public.distribuicao_desempenho (
  corretor_id        uuid not null references public.profiles (id) on delete cascade,
  semana             date not null,
  prazo_respondidos  integer not null default 0,
  prazo_total        integer not null default 0,
  followup_pct       numeric,
  pontos             numeric not null default 0,
  nota_crm_rel       numeric,
  nota_plantao_rel   numeric,
  total_rel          numeric,
  faixa              text not null check (faixa in ('acima', 'media', 'abaixo')),
  peso               smallint not null check (peso between 1 and 3),
  novo               boolean not null default false,
  primary key (corretor_id, semana)
);

-- ---------------------------------------------------------------------
-- 9. Segurança das tabelas: nada direto, tudo pelas funções
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['distribuicao_config', 'distribuicao_config_historico', 'distribuicao_corretores',
    'distribuicao_pausas', 'distribuicao_produtos', 'distribuicao_produtos_historico', 'distribuicao_entradas',
    'distribuicao_decisoes', 'distribuicao_estouros', 'distribuicao_avisos', 'distribuicao_presencas',
    'distribuicao_ausencias', 'distribuicao_sinais', 'distribuicao_checkin_tentativas',
    'distribuicao_followup_dia', 'distribuicao_desempenho'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- A config é lida pelas telas (o que mostrar); a escrita é pela função.
grant select on public.distribuicao_config to authenticated;
drop policy if exists "ativos leem a distribuicao" on public.distribuicao_config;
create policy "ativos leem a distribuicao" on public.distribuicao_config
  for select to authenticated using (public.current_perfil() is not null);

-- ---------------------------------------------------------------------
-- 10. Peças da conta
-- ---------------------------------------------------------------------
-- Quem pode receber: ativo, numa equipe, com distribuicao.receber no perfil.
create or replace function private.distribuicao_elegivel(p_corretor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    join public.role_permissions rp on rp.perfil = p.perfil and rp.permissao = 'distribuicao.receber'
    where p.id = p_corretor and p.ativo and p.equipe_id is not null);
$$;

create or replace function private.distribuicao_garantir(p_corretor uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.distribuicao_corretores (corretor_id) values (p_corretor) on conflict do nothing;
$$;

-- O produto do lead no catálogo (pelo nome; o nome do catálogo é único).
create or replace function private.distribuicao_produto(p_texto text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id from public.empreendimentos e where lower(btrim(e.nome)) = lower(btrim(p_texto)) limit 1;
$$;

-- Fim do prazo do lead da empresa: 15 min de horário de atendimento desde a
-- atribuição; recebido de plantão fora do horário, 15 min de relógio.
create or replace function private.distribuicao_fim_prazo(p_lead public.leads)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_lead.prazo_imediato then coalesce(p_lead.atribuido_em, p_lead.created_at) + interval '15 minutes'
    else private.fim_do_prazo(coalesce(p_lead.atribuido_em, p_lead.created_at))
  end;
$$;

-- Presença agora: o check-in do corretor ou a vez da recepção (16.8).
-- estado: presente, fora, sem_sinal, visita ou nulo (não está no stand).
create or replace function private.distribuicao_presenca(p_corretor uuid, p_agora timestamptz,
  out origem text, out estado text, out plantao_id uuid, out plantao_nome text, out desde timestamptz, out presenca_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.distribuicao_config := private.distribuicao_cfg();
  v_dia date := (p_agora at time zone 'America/Sao_Paulo')::date;
  pr record;
  au record;
  s record;
  rv record;
  v_rec_estado text;
begin
  select * into pr from public.distribuicao_presencas d
  where d.corretor_id = p_corretor and d.status = 'aberta' and d.dia = v_dia;
  if pr.id is not null then
    origem := 'checkin'; plantao_id := pr.plantao_id; desde := pr.entrada_em; presenca_id := pr.id;
    select p.nome into plantao_nome from public.plantoes p where p.id = pr.plantao_id;
    select * into au from public.distribuicao_ausencias a where a.presenca_id = pr.id and a.fim is null;
    if au.id is not null then
      estado := case au.motivo when 'visita' then 'visita' when 'sem_sinal' then 'sem_sinal' else 'fora' end;
      desde := au.inicio;
    else
      estado := 'presente';
      if c.sinal then
        select * into s from public.distribuicao_sinais x where x.corretor_id = p_corretor;
        if greatest(pr.entrada_em, s.quando) < p_agora - make_interval(mins => c.minutos_sem_sinal) then
          estado := 'sem_sinal';
          desde := greatest(pr.entrada_em, s.quando);
        end if;
      end if;
    end if;
    if estado = 'presente' then
      return;
    end if;
  end if;

  -- A vez da recepção, no turno que vale agora (Felipe, 16.8, 05/11/2026).
  select p.id, p.plantao_id, p.entrada_em, pl.nome into rv
  from public.plantao_presencas p
  join public.plantoes pl on pl.id = p.plantao_id
  where p.pessoa_id = p_corretor and p.papel = 'corretor' and p.dia = v_dia
    and p.turno = private.recepcao_turno_atual(p.plantao_id, 'corretor')
  limit 1;
  if rv.id is not null then
    v_rec_estado := private.recepcao_estado(rv.id);
    if v_rec_estado = 'presente' then
      origem := 'recepcao'; estado := 'presente'; plantao_id := rv.plantao_id; plantao_nome := rv.nome;
      desde := rv.entrada_em; presenca_id := null;
      return;
    elsif v_rec_estado = 'saiu' and estado is null then
      origem := 'recepcao'; estado := 'fora'; plantao_id := rv.plantao_id; plantao_nome := rv.nome;
      desde := rv.entrada_em; presenca_id := null;
    end if;
  end if;
end;
$$;

-- Situação de um corretor agora, sem olhar o lead.
--  na_fila: entra na conta dos créditos (F). situacao: o código da tela.
create or replace function private.distribuicao_situacao(p_corretor uuid, p_agora timestamptz,
  out na_fila boolean, out situacao text, out desde timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.distribuicao_config := private.distribuicao_cfg();
  d public.distribuicao_corretores;
  pr record;
begin
  na_fila := false;
  select * into d from public.distribuicao_corretores x where x.corretor_id = p_corretor;
  if not coalesce(d.participa, true) then
    situacao := 'fora_gerente'; return;
  end if;
  if d.pausado_ate is not null and d.pausado_ate > p_agora then
    situacao := 'pausa'; desde := d.pausado_ate; return;
  end if;
  if not coalesce(d.recebendo, false) then
    situacao := 'desligado'; return;
  end if;
  if private.distribuicao_no_horario(p_agora) then
    if c.exigir_checkin then
      pr := private.distribuicao_presenca(p_corretor, p_agora);
      if pr.estado is null then
        situacao := 'sem_checkin'; return;
      end if;
      na_fila := true;
      situacao := case pr.estado when 'presente' then 'apto' when 'fora' then 'fora_do_stand' else pr.estado end;
      desde := pr.desde;
      return;
    end if;
    na_fila := true; situacao := 'apto'; return;
  end if;
  if c.plantao and d.ultimo_app_em >= p_agora - make_interval(mins => c.minutos_plantao) then
    na_fila := true; situacao := 'apto'; return;
  end if;
  situacao := 'sem_plantao';
end;
$$;

-- Peso pela faixa da semana mais recente (sem os pesos, todos 1; sem cálculo, 2).
create or replace function private.distribuicao_peso(p_corretor uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select case when not (private.distribuicao_cfg()).pesos then 1::smallint
         else coalesce((select d.peso from public.distribuicao_desempenho d
                        where d.corretor_id = p_corretor order by d.semana desc limit 1), 2::smallint) end;
$$;

create or replace function private.distribuicao_faixa(p_corretor uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select d.faixa from public.distribuicao_desempenho d
                   where d.corretor_id = p_corretor order by d.semana desc limit 1), 'media');
$$;

-- Tem lead da empresa com o prazo estourado na carteira (decisão 4).
create or replace function private.distribuicao_tem_estourado(p_corretor uuid, p_agora timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.leads l
    where l.dono_id = p_corretor and l.origem = 'empresa' and l.status = 'ativo' and l.etapa = 'novo'
      and private.distribuicao_fim_prazo(l) < p_agora);
$$;

-- Um represado por vez para quem está de plantão (16.13): tem um represado
-- liberado à noite que ainda não atendeu (o lead não saiu de "novo").
create or replace function private.distribuicao_represado_pendente(p_corretor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.distribuicao_decisoes d
    join public.leads l on l.id = d.lead_id
    where d.recebeu_id = p_corretor and d.motivo_entrada = 'represada' and d.resultado = 'recebeu'
      and l.dono_id = p_corretor and l.origem = 'empresa' and l.status = 'ativo' and l.etapa = 'novo');
$$;

-- A FILA: a ordem única. A escolha e a tela usam esta mesma conta.
-- p_equipe nulo: a empresa toda (modo direto). Ordem: créditos (maior
-- primeiro), quem recebeu há mais tempo, o id. Fora da fila (F) vem depois,
-- sem posição.
create or replace function private.distribuicao_fila(p_equipe uuid, p_agora timestamptz)
returns table (posicao integer, corretor_id uuid, equipe_id uuid, na_fila boolean, situacao text, desde timestamptz,
               creditos numeric, peso smallint, ultimo_recebido timestamptz, ultimo_id bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select p.id, p.equipe_id, coalesce(d.creditos, 0) as creditos,
           private.distribuicao_peso(p.id) as peso,
           (select max(x.quando) from public.distribuicao_decisoes x where x.recebeu_id = p.id and x.resultado = 'recebeu') as ult,
           (select max(x.id) from public.distribuicao_decisoes x where x.recebeu_id = p.id and x.resultado = 'recebeu') as ult_id,
           s.na_fila, s.situacao, s.desde
    from public.profiles p
    join public.role_permissions rp on rp.perfil = p.perfil and rp.permissao = 'distribuicao.receber'
    left join public.distribuicao_corretores d on d.corretor_id = p.id
    cross join lateral private.distribuicao_situacao(p.id, p_agora) s
    where p.ativo and p.equipe_id is not null and (p_equipe is null or p.equipe_id = p_equipe)
  )
  select case when b.na_fila then (row_number() over (partition by b.na_fila
                order by b.creditos desc, b.ult_id asc nulls first, b.id))::integer end,
         b.id, b.equipe_id, b.na_fila, b.situacao, b.desde, b.creditos, b.peso, b.ult, b.ult_id
  from base b
  order by b.na_fila desc, 1 nulls last, b.id;
$$;

-- Aviso (não repete pela chave).
create or replace function private.distribuicao_avisar(p_para uuid, p_tipo text, p_lead uuid, p_chave text, p_dados jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.distribuicao_avisos (para_id, tipo, lead_id, chave, dados, criado_em)
  select p_para, p_tipo, p_lead, p_chave, coalesce(p_dados, '{}'), private.distribuicao_agora()
  where p_para is not null
  on conflict (chave) do nothing;
$$;

-- O gerente geral (para os avisos dele): o primeiro ativo.
create or replace function private.distribuicao_gerente_geral()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select p.id from public.profiles p where p.perfil = 'gerente_geral' and p.ativo order by p.created_at limit 1 $$;

create or replace function private.distribuicao_gerente_da(p_equipe uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select t.gerente_id from public.teams t where t.id = p_equipe $$;

-- Manda ao fim da fila: créditos = menor crédito de quem pode receber, menos 1.
create or replace function private.distribuicao_fim_da_fila(p_corretor uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.distribuicao_corretores (corretor_id, creditos)
  values (p_corretor, coalesce((select min(d.creditos) from public.distribuicao_corretores d), 0) - 1)
  on conflict (corretor_id) do update
    set creditos = coalesce((select min(d.creditos) from public.distribuicao_corretores d), 0) - 1;
$$;

-- ---------------------------------------------------------------------
-- 11. A escolha (com a trava e o registro)
-- ---------------------------------------------------------------------
-- p_motivo: nova, redistribuida, represada, reativada, mandada.
-- p_atribuido_em: o início do prazo (a entrada manda greatest(recebido, agora - 5 min)).
-- Devolve quem recebeu, ou nulo (represado, fila da equipe ou A distribuir).
create or replace function private.distribuir_lead(p_lead uuid, p_motivo text, p_atribuido_em timestamptz default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v uuid;
begin
  -- crm.distribuicao: o leads_guard deixa a distribuição mexer no lead mesmo
  -- quando quem chamou é um usuário (Mandar todos, do gerente geral).
  perform set_config('crm.distribuicao', '1', true);
  v := private.distribuir_lead_nucleo(p_lead, p_motivo, p_atribuido_em);
  perform set_config('crm.distribuicao', '', true);
  return v;
end;
$$;

create or replace function private.distribuir_lead_nucleo(p_lead uuid, p_motivo text, p_atribuido_em timestamptz)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.distribuicao_config;
  l public.leads;
  v_agora timestamptz := private.distribuicao_agora();
  v_horario boolean := private.distribuicao_no_horario(v_agora);
  v_produto uuid;
  v_excluir uuid[] := '{}';
  v_equipes jsonb := '[]';
  v_cand jsonb := '[]';
  v_reserva boolean := false;   -- fora do horário, sem represar: todos os que participam
  v_imediato boolean := false;
  v_escolhido uuid;
  v_equipe uuid;
  v_soma numeric;
  v_resultado text;
  v_fim timestamptz;
  t record;
  r record;
  v_alguem boolean;
  v_pulo text;
begin
  perform pg_advisory_xact_lock(7305002);
  c := private.distribuicao_cfg();
  select * into l from public.leads x where x.id = p_lead for update;
  -- Só o lead da empresa, ativo. Outra origem nunca entra (11.5).
  if l.id is null or l.origem <> 'empresa' or l.status <> 'ativo' then
    return null;
  end if;

  if not c.ligada then
    perform private.distribuicao_sem_dono(l, 'a_distribuir', null, v_agora);
    insert into public.distribuicao_decisoes (lead_id, quando, modo, motivo_entrada, resultado)
    values (p_lead, v_agora, c.modo, p_motivo, 'a_distribuir');
    return null;
  end if;

  if c.produtos then
    v_produto := private.distribuicao_produto(l.empreendimento);
  end if;
  if p_motivo = 'redistribuida' then
    select coalesce(array_agg(distinct e.para::uuid) filter (where e.para is not null), '{}') into v_excluir
    from public.lead_eventos e where e.lead_id = p_lead and e.tipo in ('criado', 'dono');
  end if;

  -- Modo só gerentes: a equipe da vez, sem olhar presença.
  if c.modo = 'gerentes' then
    for t in
      select tm.id, (select max(d.id) from public.distribuicao_decisoes d
                     where d.equipe_id = tm.id and d.resultado in ('recebeu', 'fila_equipe')) as ult
      from public.teams tm join public.profiles g on g.id = tm.gerente_id and g.ativo
      order by 2 asc nulls first, tm.created_at, tm.id
    loop
      if v_produto is not null and not exists (
           select 1 from public.profiles p
           join public.role_permissions rp on rp.perfil = p.perfil and rp.permissao = 'distribuicao.receber'
           where p.equipe_id = t.id and p.ativo
             and not exists (select 1 from public.distribuicao_produtos x where x.corretor_id = p.id and x.empreendimento_id = v_produto)) then
        v_equipes := v_equipes || jsonb_build_object('equipe_id', t.id, 'motivo', 'nao_atende');
        continue;
      end if;
      v_equipe := t.id;
      exit;
    end loop;
    if v_equipe is null then
      perform private.distribuicao_sem_dono(l, 'represado', null, v_agora);
      v_resultado := 'represado';
    else
      perform private.distribuicao_sem_dono(l, 'fila_equipe', v_equipe, v_agora);
      v_resultado := 'fila_equipe';
      perform private.distribuicao_avisar(private.distribuicao_gerente_da(v_equipe), 'fila_equipe', p_lead,
        'fila_equipe:' || p_lead || ':' || extract(epoch from v_agora)::bigint);
    end if;
    insert into public.distribuicao_decisoes (lead_id, quando, modo, motivo_entrada, equipe_id, equipes, resultado)
    values (p_lead, v_agora, c.modo, p_motivo, v_equipe, v_equipes, v_resultado);
    return null;
  end if;

  -- Fora do horário, sem plantão possível e sem represar: todos os que
  -- participam, sem olhar botão nem stand, com o prazo na abertura (16.6).
  if not v_horario then
    select exists (select 1 from private.distribuicao_fila(null, v_agora) f where f.na_fila) into v_alguem;
    if not v_alguem and p_motivo <> 'redistribuida' then
      if c.represar then
        perform private.distribuicao_sem_dono(l, 'represado', null, v_agora);
        insert into public.distribuicao_decisoes (lead_id, quando, modo, motivo_entrada, resultado)
        values (p_lead, v_agora, c.modo, p_motivo, 'represado');
        return null;
      end if;
      v_reserva := true;
    elsif v_alguem then
      v_imediato := true;
    end if;
  end if;

  -- Candidatos da empresa toda, com a situação e o pulo de cada um.
  create temp table if not exists pg_temp.distrib_cand (
    corretor_id uuid, equipe_id uuid, creditos numeric, peso smallint, ult bigint,
    situacao text, pulo text, mantem boolean) on commit drop;
  delete from pg_temp.distrib_cand;
  insert into pg_temp.distrib_cand
  select f.corretor_id, f.equipe_id, f.creditos, f.peso, f.ultimo_id, f.situacao, null, true
  from private.distribuicao_fila(null, v_agora) f
  where f.na_fila
     or (v_reserva and f.situacao not in ('fora_gerente', 'pausa'));

  update pg_temp.distrib_cand x set pulo = case
      when not v_reserva and x.situacao in ('fora_do_stand', 'sem_sinal', 'visita') then x.situacao
      when v_produto is not null and exists (select 1 from public.distribuicao_produtos p
                                             where p.corretor_id = x.corretor_id and p.empreendimento_id = v_produto) then 'nao_atende'
      when private.distribuicao_tem_estourado(x.corretor_id, v_agora) then 'prazo_estourado'
      when x.corretor_id = any (v_excluir) then 'ja_teve'
      when p_motivo = 'represada' and not v_horario and private.distribuicao_represado_pendente(x.corretor_id) then 'represado_pendente'
    end;

  if c.modo = 'direto' then
    v_equipe := null;
    select exists (select 1 from pg_temp.distrib_cand where pulo is null) into v_alguem;
    if v_alguem then
      v_equipe := '00000000-0000-0000-0000-000000000000';  -- todos
    end if;
  else
    -- Equipe da vez (redistribuição: a própria equipe primeiro).
    for t in
      select tm.id,
             (select max(d.id) from public.distribuicao_decisoes d
              where d.equipe_id = tm.id and d.resultado in ('recebeu', 'fila_equipe')) as ult
      from public.teams tm
      join public.profiles g on g.id = tm.gerente_id and g.ativo
      where exists (select 1 from public.profiles p where p.equipe_id = tm.id and p.ativo)
      order by (p_motivo = 'redistribuida' and tm.id = l.equipe_id) desc, 2 asc nulls first, tm.created_at, tm.id
    loop
      if exists (select 1 from pg_temp.distrib_cand x where x.equipe_id = t.id and x.pulo is null) then
        v_equipe := t.id;
        exit;
      end if;
      v_equipes := v_equipes || jsonb_build_object('equipe_id', t.id, 'motivo',
        case when v_produto is not null and not exists (select 1 from pg_temp.distrib_cand x
               where x.equipe_id = t.id and coalesce(x.pulo, '') <> 'nao_atende') then 'nao_atende'
             else 'ninguem_apto' end);
    end loop;
  end if;

  if v_equipe is null then
    -- Ninguém. Na passagem adiante: "A distribuir" (16.12). Senão, represado.
    if p_motivo = 'redistribuida' then
      perform private.distribuicao_sem_dono(l, 'a_distribuir', l.equipe_id, v_agora);
      v_resultado := 'a_distribuir';
      perform private.distribuicao_avisar(private.distribuicao_gerente_geral(), 'a_distribuir', p_lead,
        'a_distribuir:' || p_lead || ':' || extract(epoch from v_agora)::bigint);
    else
      perform private.distribuicao_sem_dono(l, 'represado', null, v_agora);
      v_resultado := 'represado';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('corretor_id', x.corretor_id, 'creditos', x.creditos, 'peso', x.peso,
             'resultado', 'pulado', 'motivo', x.pulo, 'mantem_posicao', true) order by x.creditos desc), '[]')
      into v_cand from pg_temp.distrib_cand x;
    insert into public.distribuicao_decisoes (lead_id, quando, modo, motivo_entrada, equipes, resultado, candidatos)
    values (p_lead, v_agora, c.modo, p_motivo, v_equipes, v_resultado, v_cand);
    return null;
  end if;

  -- Créditos no grupo (a equipe, ou todos no modo direto), o rodízio por
  -- créditos: cada apto ganha o peso; recebe quem tem mais; perde a soma dos
  -- pesos dos aptos. Quem foi pulado mantém a posição: ganha o peso, mas no
  -- máximo fica no nível do primeiro apto (sem rajada na volta).
  if v_equipe <> '00000000-0000-0000-0000-000000000000' then
    delete from pg_temp.distrib_cand where equipe_id is distinct from v_equipe;
  end if;
  select sum(peso) into v_soma from pg_temp.distrib_cand where pulo is null;
  update pg_temp.distrib_cand set creditos = creditos + peso where pulo is null;
  update pg_temp.distrib_cand set creditos = least(creditos + peso,
           (select max(y.creditos) from pg_temp.distrib_cand y where y.pulo is null))
  where pulo is not null;
  select x.corretor_id into v_escolhido from pg_temp.distrib_cand x
  where x.pulo is null order by x.creditos desc, x.ult asc nulls first, x.corretor_id limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
           'corretor_id', x.corretor_id, 'creditos', x.creditos, 'peso', x.peso,
           'resultado', case when x.corretor_id = v_escolhido then 'recebeu' when x.pulo is not null then 'pulado' else 'atras' end,
           'motivo', x.pulo, 'mantem_posicao', true)
         order by x.creditos desc, x.ult asc nulls first, x.corretor_id), '[]')
    into v_cand from pg_temp.distrib_cand x;

  update pg_temp.distrib_cand set creditos = creditos - v_soma where corretor_id = v_escolhido;
  -- Normaliza (média zero no grupo): a ordem não muda e os números não crescem.
  update pg_temp.distrib_cand set creditos = round(creditos - (select avg(y.creditos) from pg_temp.distrib_cand y), 4);
  insert into public.distribuicao_corretores (corretor_id, creditos)
  select x.corretor_id, x.creditos from pg_temp.distrib_cand x
  on conflict (corretor_id) do update set creditos = excluded.creditos;

  select p.equipe_id into v_equipe from public.profiles p where p.id = v_escolhido;
  perform set_config('crm.motivo_dono', case p_motivo when 'redistribuida' then 'redistribuido'
                                                       when 'represada' then 'represado_liberado'
                                                       when 'reativada' then 'repetido_reativado'
                                                       else 'distribuicao' end, true);
  perform set_config('crm.atribuido_em', coalesce(p_atribuido_em, v_agora)::text, true);
  update public.leads set
    dono_id = v_escolhido, distribuicao_estado = null, equipe_id = v_equipe, distribuido = true,
    prazo_imediato = v_imediato,
    redistribuicoes = redistribuicoes + case when p_motivo = 'redistribuida' then 1 else 0 end
  where id = p_lead;
  perform set_config('crm.motivo_dono', '', true);
  perform set_config('crm.atribuido_em', '', true);

  select private.distribuicao_fim_prazo(x) into v_fim from public.leads x where x.id = p_lead;
  -- O push de "Lead novo" (o de plantão sai na hora; o outro, no horário).
  perform private.distribuicao_avisar(v_escolhido, case when v_imediato then 'lead_plantao' else 'lead_novo' end, p_lead,
    'lead_novo:' || p_lead || ':' || v_escolhido || ':' || extract(epoch from coalesce(p_atribuido_em, v_agora))::bigint);
  insert into public.distribuicao_decisoes (lead_id, quando, modo, motivo_entrada, equipe_id, equipes, recebeu_id,
                                            resultado, fim_prazo, candidatos)
  values (p_lead, v_agora, c.modo, p_motivo, v_equipe, v_equipes, v_escolhido, 'recebeu', v_fim, v_cand);
  return v_escolhido;
end;
$$;

-- Deixa o lead sem dono num dos estados (represado, fila_equipe, a_distribuir).
create or replace function private.distribuicao_sem_dono(p_l public.leads, p_estado text, p_equipe uuid, p_agora timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_l.dono_id is not null then
    perform set_config('crm.motivo_dono', p_estado, true);
  end if;
  update public.leads set dono_id = null, distribuicao_estado = p_estado,
    equipe_id = coalesce(p_equipe, equipe_id), distribuido = true, prazo_imediato = false,
    distribuicao_chegada = coalesce(distribuicao_chegada, p_agora)
  where id = p_l.id;
  perform set_config('crm.motivo_dono', '', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 12. Gatilhos em leads
-- ---------------------------------------------------------------------
-- Roda depois do leads_guard (ordem alfabética). Quando a troca de dono vem da
-- distribuição (sem usuário, com crm.motivo_dono), carimba atribuido_em: é o
-- que faz o prazo correr e o push sair (desenho, 11.1). Quando um usuário
-- atribui um lead sem dono, limpa o estado da fila.
create or replace function private.leads_guard_distribuicao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text := nullif(current_setting('crm.motivo_dono', true), '');
  v_em text := nullif(current_setting('crm.atribuido_em', true), '');
  v_dist boolean := coalesce(v_motivo in ('distribuicao', 'redistribuido', 'represado_liberado', 'repetido_reativado'), false)
                    and current_setting('crm.distribuicao', true) = '1';
begin
  if new.dono_id is not null then
    new.distribuicao_estado := null;
  end if;
  if v_dist and new.dono_id is not null
     and (tg_op = 'INSERT' or new.dono_id is distinct from old.dono_id) then
    new.atribuido_em := coalesce(v_em::timestamptz, now());
    new.atribuido_por := null;
  elsif auth.uid() is not null and tg_op = 'UPDATE' and new.dono_id is distinct from old.dono_id then
    new.prazo_imediato := false;
    new.resposta_ate := null;
  end if;
  return new;
end;
$$;
drop trigger if exists leads_guard_distribuicao on public.leads;
create trigger leads_guard_distribuicao before insert or update on public.leads
  for each row execute function private.leads_guard_distribuicao();

-- Atribuição à mão do lead da empresa conta como vez (chave manual_conta):
-- o gerente cadastrando já para um corretor, trocando o dono, o Lead perdido
-- e o repasse da fila da equipe.
create or replace function private.leads_distribuicao_manual()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.distribuicao_config := private.distribuicao_cfg();
begin
  if auth.uid() is null or new.origem <> 'empresa' or new.dono_id is null
     or (tg_op = 'UPDATE' and new.dono_id is not distinct from old.dono_id)
     or (tg_op = 'INSERT' and new.dono_id = auth.uid())
     or current_setting('crm.distribuicao', true) = '1' then
    return null;
  end if;
  if c.ligada and c.manual_conta and private.distribuicao_elegivel(new.dono_id) then
    perform private.distribuicao_fim_da_fila(new.dono_id);
    insert into public.distribuicao_decisoes (lead_id, quando, modo, motivo_entrada, equipe_id, recebeu_id, resultado)
    values (new.id, private.distribuicao_agora(), c.modo, 'manual',
            (select p.equipe_id from public.profiles p where p.id = new.dono_id), new.dono_id, 'recebeu');
  end if;
  return null;
end;
$$;
drop trigger if exists leads_distribuicao_manual on public.leads;
create trigger leads_distribuicao_manual after insert or update of dono_id on public.leads
  for each row execute function private.leads_distribuicao_manual();

-- A conversa ou o toque encerram o prazo da mensagem nova (resposta_ate).
create or replace function private.lead_interacao_resposta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tipo in ('whatsapp', 'ligacao', 'email', 'visita', 'plantao', 'toque_whatsapp', 'toque_ligacao') then
    update public.leads set resposta_ate = null where id = new.lead_id and resposta_ate is not null;
  end if;
  return null;
end;
$$;
drop trigger if exists lead_interacao_resposta on public.lead_interacoes;
create trigger lead_interacao_resposta after insert on public.lead_interacoes
  for each row execute function private.lead_interacao_resposta();

-- ---------------------------------------------------------------------
-- 13. Lead sem dono: quem vê (políticas novas, à parte das de hoje)
-- ---------------------------------------------------------------------
create or replace function private.distribuicao_ve_sem_dono(p_estado text, p_equipe uuid, p_origem text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_origem = 'empresa' and (
    (p_estado = 'fila_equipe' and exists (select 1 from public.teams t
                                          join public.profiles g on g.id = t.gerente_id and g.ativo
                                          where t.id = p_equipe and g.id = auth.uid()))
    or (p_estado in ('a_distribuir', 'represado') and public.has_permission('leads.distribuir')));
$$;

drop policy if exists "ver leads da fila" on public.leads;
create policy "ver leads da fila" on public.leads
  for select to authenticated using (dono_id is null and private.distribuicao_ve_sem_dono(distribuicao_estado, equipe_id, origem));

drop policy if exists "ver interacoes da fila" on public.lead_interacoes;
create policy "ver interacoes da fila" on public.lead_interacoes
  for select to authenticated using (exists (
    select 1 from public.leads l where l.id = lead_id and l.dono_id is null
      and private.distribuicao_ve_sem_dono(l.distribuicao_estado, l.equipe_id, l.origem)));

drop policy if exists "ver eventos da fila" on public.lead_eventos;
create policy "ver eventos da fila" on public.lead_eventos
  for select to authenticated using (exists (
    select 1 from public.leads l where l.id = lead_id and l.dono_id is null
      and private.distribuicao_ve_sem_dono(l.distribuicao_estado, l.equipe_id, l.origem)));

-- ---------------------------------------------------------------------
-- 14. A entrada (contrato fechado com o Marketing, 05/11/2026)
-- ---------------------------------------------------------------------
-- Uma chamada por lead, só com a chave de serviço (Edge Function entrada-leads).
-- Idempotente pelo p_entrada_id. Tudo numa transação. Dado ruim não vira erro.
-- Os raise nunca levam nome, telefone nem e-mail.
create or replace function public.lead_empresa_entrada(
  p_entrada_id text,
  p_recebido_em timestamptz,
  p_nome text,
  p_telefone text,
  p_email text,
  p_mensagem text,
  p_fonte text,
  p_produto text,
  p_empreendimento_id uuid default null,
  p_campanha jsonb default null)
returns table (lead_id uuid, situacao text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  c public.distribuicao_config;
  v_agora timestamptz := private.distribuicao_agora();
  v_recebido timestamptz := least(coalesce(p_recebido_em, private.distribuicao_agora()), private.distribuicao_agora());
  v_nome text := coalesce(nullif(btrim(p_nome), ''), 'Sem nome');
  v_tel text := nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_msg text := nullif(btrim(coalesce(p_mensagem, '')), '');
  v_emp_id uuid;
  v_emp_nome text;
  v_ex public.leads;
  v_lead uuid;
  v_sit text;
  v_quem uuid;
  v_fim timestamptz;
  v_dono_ativo boolean;
begin
  if coalesce(btrim(p_entrada_id), '') = '' or coalesce(btrim(p_fonte), '') = '' then
    raise exception 'Entrada sem id ou sem fonte.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(7305002);
  c := private.distribuicao_cfg();

  select e.lead_id into v_lead from public.distribuicao_entradas e where e.entrada_id = p_entrada_id;
  if found then
    return query select v_lead, 'repetido'::text;
    return;
  end if;

  -- Dados: telefone fora do formato vai vazio; e-mail inválido também.
  if v_tel is not null and v_tel !~ '^55[0-9]{10,11}$' then
    v_tel := null;
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    v_email := null;
  end if;
  if p_empreendimento_id is not null then
    select e.id, e.nome into v_emp_id, v_emp_nome from public.empreendimentos e where e.id = p_empreendimento_id;
  end if;
  if v_emp_id is null and nullif(btrim(coalesce(p_produto, '')), '') is not null then
    v_emp_id := private.distribuicao_produto(p_produto);
    select e.nome into v_emp_nome from public.empreendimentos e where e.id = v_emp_id;
    v_emp_nome := coalesce(v_emp_nome, left(btrim(p_produto), 200));
  end if;

  -- A mesma pessoa (pelo telefone; sem telefone, pelo e-mail), em qualquer origem.
  if c.repetido_ao_dono and (v_tel is not null or v_email is not null) then
    select l.* into v_ex from public.leads l
    where l.status = 'ativo'
      and ((v_tel is not null and l.whatsapp = v_tel) or (v_tel is null and l.email = v_email))
    order by l.created_at desc limit 1;
    if v_ex.id is not null and v_ex.dono_id is not null then
      select p.ativo into v_dono_ativo from public.profiles p where p.id = v_ex.dono_id;
      if v_dono_ativo then
        insert into public.lead_interacoes (lead_id, autor_id, criado_em, texto, tipo)
        values (v_ex.id, null, v_agora, 'Mensagem nova pela empresa' || coalesce(': ' || left(v_msg, 4900), '.'), 'mensagem');
        if v_ex.origem = 'empresa' and v_ex.etapa = 'novo' then
          update public.leads set atribuido_em = v_agora where id = v_ex.id;
        else
          v_fim := case when not private.distribuicao_no_horario(v_agora)
                             and coalesce((select d.recebendo from public.distribuicao_corretores d where d.corretor_id = v_ex.dono_id), false)
                        then v_agora + interval '15 minutes'
                        else private.fim_do_prazo(v_agora) end;
          update public.leads set resposta_ate = v_fim where id = v_ex.id;
        end if;
        perform private.distribuicao_avisar(v_ex.dono_id, 'mensagem_nova', v_ex.id,
          'mensagem_nova:' || v_ex.id || ':' || p_entrada_id);
        insert into public.distribuicao_entradas (entrada_id, lead_id, recebido_em, fonte, campanha, empreendimento_id, situacao)
        values (p_entrada_id, v_ex.id, v_recebido, p_fonte, p_campanha, v_emp_id, 'anexado');
        return query select v_ex.id, 'anexado'::text;
        return;
      end if;
    end if;
    -- Lead ativo ainda sem dono (fila da equipe, A distribuir, represado):
    -- a mensagem entra nele, e ele fica onde está.
    if v_ex.id is not null and v_ex.dono_id is null then
      insert into public.lead_interacoes (lead_id, autor_id, criado_em, texto, tipo)
      values (v_ex.id, null, v_agora, 'Mensagem nova pela empresa' || coalesce(': ' || left(v_msg, 4900), '.'), 'mensagem');
      insert into public.distribuicao_entradas (entrada_id, lead_id, recebido_em, fonte, campanha, empreendimento_id, situacao)
      values (p_entrada_id, v_ex.id, v_recebido, p_fonte, p_campanha, v_emp_id, 'anexado');
      return query select v_ex.id, 'anexado'::text;
      return;
    end if;
    -- Dono desativado: o mesmo lead vai pela roleta.
    if v_ex.id is not null and v_ex.origem = 'empresa' then
      v_lead := v_ex.id;
      v_sit := 'reativado';
    end if;
    -- Lead descartado da empresa: reativa e manda pela roleta (decisão 9).
    if v_lead is null then
      select l.* into v_ex from public.leads l
      where l.status = 'descartado' and l.origem = 'empresa'
        and ((v_tel is not null and l.whatsapp = v_tel) or (v_tel is null and l.email = v_email))
      order by l.created_at desc limit 1;
      if v_ex.id is not null then
        update public.leads set status = 'ativo', motivo_descarte = null where id = v_ex.id;
        v_lead := v_ex.id;
        v_sit := 'reativado';
      end if;
    end if;
    if v_lead is not null then
      update public.leads set distribuicao_chegada = v_recebido where id = v_lead;
      insert into public.lead_interacoes (lead_id, autor_id, criado_em, texto, tipo)
      values (v_lead, null, v_agora, 'Mensagem nova pela empresa' || coalesce(': ' || left(v_msg, 4900), '.'), 'mensagem');
    end if;
  end if;

  if v_lead is null then
    insert into public.leads (dono_id, nome, whatsapp, email, origem, empreendimento, distribuicao_estado,
                              distribuido, distribuicao_chegada, criado_por)
    values (null, left(v_nome, 200), v_tel, v_email, 'empresa', v_emp_nome, 'represado', true, v_recebido, null)
    returning id into v_lead;
    if v_msg is not null then
      insert into public.lead_interacoes (lead_id, autor_id, criado_em, texto, tipo)
      values (v_lead, null, v_agora, left(v_msg, 5000), 'mensagem');
    end if;
    v_sit := 'criado';
  end if;

  if not c.ligada then
    perform private.distribuir_lead(v_lead, case when v_sit = 'reativado' then 'reativada' else 'nova' end);
    v_sit := case when v_sit = 'reativado' then 'reativado' else 'a_distribuir' end;
  else
    v_quem := private.distribuir_lead(v_lead, case when v_sit = 'reativado' then 'reativada' else 'nova' end,
                                      greatest(v_recebido, v_agora - interval '5 minutes'));
  end if;

  insert into public.distribuicao_entradas (entrada_id, lead_id, recebido_em, fonte, campanha, empreendimento_id, situacao, resultado)
  values (p_entrada_id, v_lead, v_recebido, p_fonte, p_campanha, v_emp_id, v_sit,
          jsonb_build_object('recebeu_id', v_quem,
                             'estado', (select l.distribuicao_estado from public.leads l where l.id = v_lead)));
  return query select v_lead, v_sit;
end;
$$;

-- ---------------------------------------------------------------------
-- 15. O botão, o check-in, o sinal e a visita (do próprio corretor)
-- ---------------------------------------------------------------------
create or replace function private.distribuicao_exige_elegivel()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.distribuicao_elegivel(auth.uid()) then
    raise exception 'Seu perfil não recebe leads da distribuição.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

-- Distância em metros (Haversine), sem PostGIS.
create or replace function private.distancia_m(p_lat1 numeric, p_lng1 numeric, p_lat2 numeric, p_lng2 numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians((p_lat2 - p_lat1)::float8) / 2), 2)
    + cos(radians(p_lat1::float8)) * cos(radians(p_lat2::float8)) * power(sin(radians((p_lng2 - p_lng1)::float8) / 2), 2)))::numeric;
$$;

-- O stand mais perto e a classificação: dentro (cabe no raio, precisão até
-- 100 m), fora (longe mesmo com a margem) ou incerto.
create or replace function private.distribuicao_onde(p_lat numeric, p_lng numeric, p_precisao numeric,
  out plantao_id uuid, out plantao_nome text, out dist_m integer, out resultado text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or coalesce(p_precisao, 0) <= 0 then
    resultado := 'incerto';
    return;
  end if;
  select p.id, p.nome, p.raio_m, private.distancia_m(p_lat, p_lng, p.lat, p.lng) as d into r
  from public.plantoes p where p.ativo and p.lat is not null
  order by 4 limit 1;
  if r.id is null then
    resultado := 'sem_stand';
    return;
  end if;
  plantao_id := r.id; plantao_nome := r.nome; dist_m := round(r.d);
  resultado := case when r.d <= r.raio_m and p_precisao <= 100 then 'dentro'
                    when r.d - p_precisao > r.raio_m then 'fora'
                    else 'incerto' end;
end;
$$;

create or replace function public.distribuicao_receber(p_ligar boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := private.distribuicao_exige_elegivel();
  v_agora timestamptz := private.distribuicao_agora();
begin
  perform private.distribuicao_garantir(v_eu);
  update public.distribuicao_corretores set
    recebendo = p_ligar,
    recebendo_desde = case when p_ligar then coalesce(recebendo_desde, v_agora) else null end,
    ultimo_app_em = v_agora, atualizado_por = v_eu, atualizado_em = v_agora
  where corretor_id = v_eu and recebendo is distinct from p_ligar;
  if found then
    insert into public.distribuicao_pausas (corretor_id, tipo, quem, quando)
    values (v_eu, case when p_ligar then 'liga' else 'desliga' end, v_eu, v_agora);
  end if;
  return public.distribuicao_meu_estado();
end;
$$;

create or replace function public.distribuicao_app_aberto()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
begin
  if v_eu is null or not private.distribuicao_elegivel(v_eu) then
    return;
  end if;
  perform private.distribuicao_garantir(v_eu);
  update public.distribuicao_corretores set ultimo_app_em = private.distribuicao_agora() where corretor_id = v_eu;
end;
$$;

create or replace function public.distribuicao_checkin(p_id uuid, p_lat numeric, p_lng numeric, p_precisao numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := private.distribuicao_exige_elegivel();
  v_agora timestamptz := private.distribuicao_agora();
  c public.distribuicao_config := private.distribuicao_cfg();
  o record;
  v_ab public.distribuicao_presencas;
begin
  if not c.exigir_checkin then
    raise exception 'O check-in está desligado.' using errcode = 'P0001';
  end if;
  select * into v_ab from public.distribuicao_presencas where id = p_id;
  if v_ab.id is not null then
    return jsonb_build_object('resultado', 'dentro', 'plantao', (select nome from public.plantoes where id = v_ab.plantao_id),
                              'dist_m', v_ab.entrada_dist_m, 'repetido', true);
  end if;
  if exists (select 1 from public.distribuicao_checkin_tentativas t
             where t.corretor_id = v_eu and t.quando > v_agora - interval '20 seconds') then
    return jsonb_build_object('resultado', 'aguarde');
  end if;
  o := private.distribuicao_onde(p_lat, p_lng, p_precisao);
  insert into public.distribuicao_checkin_tentativas (corretor_id, quando, resultado, dist_m, precisao_m)
  values (v_eu, v_agora, o.resultado, o.dist_m, round(p_precisao));
  if o.resultado <> 'dentro' then
    return jsonb_build_object('resultado', o.resultado, 'plantao', o.plantao_nome, 'dist_m', o.dist_m);
  end if;
  -- Check-in em outro stand fecha o anterior.
  update public.distribuicao_presencas set status = 'fechada', saida_em = v_agora, saida_metodo = 'manual'
  where corretor_id = v_eu and status = 'aberta';
  insert into public.distribuicao_presencas (id, corretor_id, plantao_id, dia, entrada_em, entrada_dist_m, entrada_precisao_m)
  values (p_id, v_eu, o.plantao_id, (v_agora at time zone 'America/Sao_Paulo')::date, v_agora, o.dist_m, round(p_precisao));
  insert into public.distribuicao_sinais (corretor_id, quando, dentro, precisao_m)
  values (v_eu, v_agora, true, round(p_precisao))
  on conflict (corretor_id) do update set quando = excluded.quando, dentro = true, precisao_m = excluded.precisao_m,
    fora_desde = null, ignorar_ate = null;
  perform private.distribuicao_garantir(v_eu);
  update public.distribuicao_corretores set ultimo_app_em = v_agora where corretor_id = v_eu;
  return jsonb_build_object('resultado', 'dentro', 'plantao', o.plantao_nome, 'dist_m', o.dist_m, 'hora', v_agora);
end;
$$;

-- Saída: nunca depende do GPS.
create or replace function public.distribuicao_checkout(p_lat numeric default null, p_lng numeric default null, p_precisao numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := private.distribuicao_exige_elegivel();
  v_agora timestamptz := private.distribuicao_agora();
  o record;
  v_id uuid;
begin
  o := private.distribuicao_onde(p_lat, p_lng, p_precisao);
  update public.distribuicao_presencas set status = 'fechada', saida_em = v_agora,
    saida_dist_m = o.dist_m, saida_metodo = case when o.resultado in ('dentro', 'fora') then 'gps' else 'manual' end
  where corretor_id = v_eu and status = 'aberta'
  returning id into v_id;
  update public.distribuicao_ausencias set fim = v_agora where presenca_id = v_id and fim is null;
  return jsonb_build_object('fechou', v_id is not null);
end;
$$;

create or replace function private.distribuicao_presenca_aberta(p_corretor uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select d.id from public.distribuicao_presencas d where d.corretor_id = p_corretor and d.status = 'aberta' $$;

create or replace function private.distribuicao_abrir_ausencia(p_presenca uuid, p_motivo text, p_agora timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_presenca is null then
    return;
  end if;
  update public.distribuicao_ausencias set fim = p_agora where presenca_id = p_presenca and fim is null and motivo <> p_motivo;
  insert into public.distribuicao_ausencias (presenca_id, inicio, motivo)
  select p_presenca, p_agora, p_motivo
  where not exists (select 1 from public.distribuicao_ausencias a where a.presenca_id = p_presenca and a.fim is null);
end;
$$;

-- O sinal com a posição, a cada 10 min com o Vendas aberto (check-in aberto).
-- Devolve perguntar = true quando é para mostrar "Saiu do stand?".
create or replace function public.distribuicao_sinal(p_lat numeric, p_lng numeric, p_precisao numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := private.distribuicao_exige_elegivel();
  v_agora timestamptz := private.distribuicao_agora();
  c public.distribuicao_config := private.distribuicao_cfg();
  v_pr uuid := private.distribuicao_presenca_aberta(v_eu);
  o record;
  s public.distribuicao_sinais;
  v_perguntar boolean := false;
begin
  perform private.distribuicao_garantir(v_eu);
  update public.distribuicao_corretores set ultimo_app_em = v_agora where corretor_id = v_eu;
  if not (c.exigir_checkin and c.sinal) or v_pr is null then
    return jsonb_build_object('resultado', 'sem_checkin', 'perguntar', false);
  end if;
  o := private.distribuicao_onde(p_lat, p_lng, p_precisao);
  select * into s from public.distribuicao_sinais where corretor_id = v_eu;
  if o.resultado = 'incerto' or o.resultado = 'sem_stand' then
    -- Não muda nada, mas conta como sinal (o app está aberto).
    insert into public.distribuicao_sinais (corretor_id, quando) values (v_eu, v_agora)
    on conflict (corretor_id) do update set quando = v_agora;
  elsif o.resultado = 'dentro' then
    insert into public.distribuicao_sinais (corretor_id, quando, dentro, precisao_m) values (v_eu, v_agora, true, round(p_precisao))
    on conflict (corretor_id) do update set quando = v_agora, dentro = true, precisao_m = excluded.precisao_m,
      fora_desde = null, ignorar_ate = null;
    -- Voltou: fecha a ausência de saída, fora do raio ou sem sinal.
    update public.distribuicao_ausencias set fim = v_agora
    where presenca_id = v_pr and fim is null and motivo in ('saiu', 'fora_do_raio', 'sem_sinal');
  else
    v_perguntar := s.ignorar_ate is null or s.ignorar_ate <= v_agora;
    v_perguntar := v_perguntar and not exists (select 1 from public.distribuicao_ausencias a where a.presenca_id = v_pr and a.fim is null);
    insert into public.distribuicao_sinais (corretor_id, quando, dentro, precisao_m, fora_desde)
    values (v_eu, v_agora, false, round(p_precisao), case when v_perguntar then v_agora end)
    on conflict (corretor_id) do update set quando = v_agora, dentro = false, precisao_m = excluded.precisao_m,
      fora_desde = case when v_perguntar then coalesce(public.distribuicao_sinais.fora_desde, v_agora)
                        else public.distribuicao_sinais.fora_desde end;
  end if;
  -- Sem sinal que volta com o app aberto: fecha a ausência "sem sinal".
  if o.resultado <> 'fora' then
    update public.distribuicao_ausencias set fim = v_agora where presenca_id = v_pr and fim is null and motivo = 'sem_sinal';
  end if;
  return jsonb_build_object('resultado', o.resultado, 'perguntar', v_perguntar, 'dist_m', o.dist_m);
end;
$$;

-- Resposta a "Saiu do stand?".
create or replace function public.distribuicao_responder_saida(p_sai boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := private.distribuicao_exige_elegivel();
  v_agora timestamptz := private.distribuicao_agora();
begin
  if p_sai then
    perform private.distribuicao_abrir_ausencia(private.distribuicao_presenca_aberta(v_eu), 'saiu', v_agora);
    update public.distribuicao_sinais set fora_desde = null where corretor_id = v_eu;
  else
    update public.distribuicao_sinais set fora_desde = null, ignorar_ate = v_agora + interval '20 minutes'
    where corretor_id = v_eu;
  end if;
end;
$$;

-- "Saí para visita" e "Voltei" (e "Voltei ao stand" depois de "Saí").
create or replace function public.distribuicao_visita(p_saindo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := private.distribuicao_exige_elegivel();
  v_agora timestamptz := private.distribuicao_agora();
  v_pr uuid := private.distribuicao_presenca_aberta(v_eu);
begin
  if v_pr is null then
    raise exception 'Faça o check-in antes.' using errcode = 'P0001';
  end if;
  if p_saindo then
    perform private.distribuicao_abrir_ausencia(v_pr, 'visita', v_agora);
  else
    update public.distribuicao_ausencias set fim = v_agora where presenca_id = v_pr and fim is null;
    insert into public.distribuicao_sinais (corretor_id, quando, dentro) values (v_eu, v_agora, true)
    on conflict (corretor_id) do update set quando = v_agora, dentro = true, fora_desde = null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 16. Pausa, participação e produtos
-- ---------------------------------------------------------------------
-- O próprio, o gerente da equipe (pode_atribuir_a) ou o gerente geral.
create or replace function private.distribuicao_pode_mexer(p_corretor uuid, p_proprio boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (p_proprio and p_corretor = auth.uid()) or public.is_gerente_geral() or public.pode_atribuir_a(p_corretor);
$$;

create or replace function public.distribuicao_pausar(p_corretor uuid, p_ate timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := private.distribuicao_agora();
begin
  if not private.distribuicao_elegivel(p_corretor) or not private.distribuicao_pode_mexer(p_corretor, true) then
    raise exception 'Você não pode pausar este corretor.' using errcode = '42501';
  end if;
  if p_ate is not null and p_ate <= v_agora then
    raise exception 'A data de volta precisa ser depois de agora.' using errcode = 'P0001';
  end if;
  perform private.distribuicao_garantir(p_corretor);
  update public.distribuicao_corretores set pausado_ate = coalesce(p_ate, 'infinity'::timestamptz),
    atualizado_por = auth.uid(), atualizado_em = v_agora where corretor_id = p_corretor;
  insert into public.distribuicao_pausas (corretor_id, tipo, ate, quem, quando)
  values (p_corretor, 'pausa', p_ate, auth.uid(), v_agora);
end;
$$;

create or replace function public.distribuicao_voltar(p_corretor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := private.distribuicao_agora();
begin
  if not private.distribuicao_pode_mexer(p_corretor, true) then
    raise exception 'Você não pode mexer neste corretor.' using errcode = '42501';
  end if;
  update public.distribuicao_corretores set pausado_ate = null, atualizado_por = auth.uid(), atualizado_em = v_agora
  where corretor_id = p_corretor and pausado_ate is not null;
  if found then
    insert into public.distribuicao_pausas (corretor_id, tipo, quem, quando) values (p_corretor, 'volta', auth.uid(), v_agora);
  end if;
end;
$$;

create or replace function public.distribuicao_participa(p_corretor uuid, p_sim boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := private.distribuicao_agora();
begin
  if not private.distribuicao_pode_mexer(p_corretor, false) then
    raise exception 'Só o gerente da equipe tira ou põe o corretor na distribuição.' using errcode = '42501';
  end if;
  perform private.distribuicao_garantir(p_corretor);
  update public.distribuicao_corretores set participa = p_sim, atualizado_por = auth.uid(), atualizado_em = v_agora
  where corretor_id = p_corretor and participa is distinct from p_sim;
  if found then
    insert into public.distribuicao_pausas (corretor_id, tipo, quem, quando)
    values (p_corretor, case when p_sim then 'dentro' else 'fora' end, auth.uid(), v_agora);
  end if;
end;
$$;

-- Produtos do corretor (configuração, em Equipe › corretor).
create or replace function public.distribuicao_produtos(p_corretor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (p_corretor = auth.uid() or public.pode_ver_dados_de(p_corretor)) then
    raise exception 'Você não vê este corretor.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome,
             'atende', not exists (select 1 from public.distribuicao_produtos x
                                   where x.corretor_id = p_corretor and x.empreendimento_id = e.id))
           order by e.nome)
    from public.empreendimentos e where e.ativo), '[]'::jsonb);
end;
$$;

create or replace function public.distribuicao_produtos_salvar(p_corretor uuid, p_nao_atende uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
begin
  -- Quem gerencia uma equipe marca só a dela; os outros com a permissão
  -- (operacional, gerente geral), qualquer corretor.
  if not public.has_permission('distribuicao.produtos')
     or not private.distribuicao_elegivel(p_corretor)
     or (exists (select 1 from public.teams t where t.gerente_id = auth.uid()) and not public.is_my_team_member(p_corretor)) then
    raise exception 'Você não marca os produtos deste corretor.' using errcode = '42501';
  end if;
  insert into public.distribuicao_produtos_historico (corretor_id, empreendimento_id, atende, quem, quando)
  select p_corretor, x.empreendimento_id, true, v_eu, private.distribuicao_agora()
  from public.distribuicao_produtos x
  where x.corretor_id = p_corretor and not (x.empreendimento_id = any (coalesce(p_nao_atende, '{}')));
  delete from public.distribuicao_produtos x
  where x.corretor_id = p_corretor and not (x.empreendimento_id = any (coalesce(p_nao_atende, '{}')));
  insert into public.distribuicao_produtos_historico (corretor_id, empreendimento_id, atende, quem, quando)
  select p_corretor, e.id, false, v_eu, private.distribuicao_agora()
  from public.empreendimentos e
  where e.id = any (coalesce(p_nao_atende, '{}'))
    and not exists (select 1 from public.distribuicao_produtos x where x.corretor_id = p_corretor and x.empreendimento_id = e.id);
  insert into public.distribuicao_produtos (corretor_id, empreendimento_id)
  select p_corretor, e.id from public.empreendimentos e where e.id = any (coalesce(p_nao_atende, '{}'))
  on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------
-- 17. Leituras das telas
-- ---------------------------------------------------------------------
-- O escopo de quem lê: a equipe (modo equipe e só gerentes) ou a empresa
-- toda (modo direto).
create or replace function public.distribuicao_meu_estado()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  c public.distribuicao_config := private.distribuicao_cfg();
  v_agora timestamptz := private.distribuicao_agora();
  d public.distribuicao_corretores;
  s record;
  pr record;
  v_pos integer;
  v_total integer;
  v_equipe uuid;
  v_equipe_nome text;
  sn public.distribuicao_sinais;
begin
  if v_eu is null or public.current_perfil() is null then
    return null;
  end if;
  select p.equipe_id, t.nome into v_equipe, v_equipe_nome
  from public.profiles p left join public.teams t on t.id = p.equipe_id where p.id = v_eu;
  if not private.distribuicao_elegivel(v_eu) then
    return jsonb_build_object('recebe', false, 'ligada', c.ligada, 'modo', c.modo);
  end if;
  select * into d from public.distribuicao_corretores where corretor_id = v_eu;
  s := private.distribuicao_situacao(v_eu, v_agora);
  pr := private.distribuicao_presenca(v_eu, v_agora);
  if c.transparencia and s.na_fila and c.modo <> 'gerentes' then
    select f.posicao into v_pos from private.distribuicao_fila(case when c.modo = 'direto' then null else v_equipe end, v_agora) f
    where f.corretor_id = v_eu;
    select count(*) into v_total from private.distribuicao_fila(case when c.modo = 'direto' then null else v_equipe end, v_agora) f
    where f.na_fila;
  end if;
  select * into sn from public.distribuicao_sinais where corretor_id = v_eu;
  return jsonb_build_object(
    'recebe', true, 'ligada', c.ligada, 'modo', c.modo,
    'chaves', jsonb_build_object('exigir_checkin', c.exigir_checkin, 'sinal', c.sinal, 'plantao', c.plantao,
                                 'pesos', c.pesos, 'transparencia', c.transparencia),
    'no_horario', private.distribuicao_no_horario(v_agora),
    'participa', coalesce(d.participa, true), 'recebendo', coalesce(d.recebendo, false),
    'pausado_ate', case when d.pausado_ate = 'infinity' then 'sem_data' else d.pausado_ate::text end,
    'situacao', s.situacao, 'na_fila', s.na_fila, 'desde', s.desde,
    'presenca', jsonb_build_object('origem', pr.origem, 'estado', pr.estado, 'plantao', pr.plantao_nome,
                                   'desde', pr.desde, 'checkin_aberto', private.distribuicao_presenca_aberta(v_eu) is not null),
    'perguntar_saida', sn.fora_desde is not null,
    'posicao', v_pos, 'total', v_total,
    'escopo', case when c.modo = 'direto' then 'empresa' else 'equipe' end, 'equipe_nome', v_equipe_nome,
    'faixa', case when c.pesos then private.distribuicao_faixa(v_eu) end);
end;
$$;

-- A fila agora. Corretor: a equipe dele (ou a empresa, no modo direto), sem
-- créditos nem motivos dos outros. Gerente: a equipe, com tudo; no modo
-- direto, a empresa toda, com o detalhe só da equipe dele. Gerente geral: tudo.
create or replace function public.distribuicao_fila(p_equipe uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  c public.distribuicao_config := private.distribuicao_cfg();
  v_agora timestamptz := private.distribuicao_agora();
  v_gg boolean := public.is_gerente_geral() or public.has_permission('dados.ver_todos');
  v_minha uuid;      -- a equipe de quem lê (corretor: a dele; gerente: a que gerencia)
  v_escopo uuid;     -- nulo = empresa toda
  v_eh_corretor boolean := private.distribuicao_elegivel(auth.uid());
begin
  if v_eu is null or public.current_perfil() is null then
    raise exception 'Entre de novo.' using errcode = '42501';
  end if;
  if v_eh_corretor then
    select p.equipe_id into v_minha from public.profiles p where p.id = v_eu;
    if not c.transparencia then
      raise exception 'A fila não está visível.' using errcode = '42501';
    end if;
  else
    select t.id into v_minha from public.teams t where t.gerente_id = v_eu;
    if v_minha is null and not v_gg then
      raise exception 'Você não vê a fila.' using errcode = '42501';
    end if;
  end if;
  v_escopo := case when c.modo = 'direto' then null
                   when v_gg then p_equipe
                   else v_minha end;
  return jsonb_build_object(
    'modo', c.modo, 'escopo', case when v_escopo is null then 'empresa' else 'equipe' end,
    'equipe_nome', (select t.nome from public.teams t where t.id = coalesce(v_escopo, v_minha)),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'posicao', f.posicao, 'corretor_id', f.corretor_id,
        'apelido', coalesce(p.apelido, split_part(p.nome, ' ', 1)),
        'equipe_nome', t.nome, 'eu', f.corretor_id = v_eu,
        'situacao', f.situacao, 'desde', f.desde,
        'faixa', case when c.pesos then private.distribuicao_faixa(f.corretor_id) end,
        -- detalhe só para quem gerencia aquela equipe ou vê tudo
        'creditos', case when not v_eh_corretor and (v_gg or f.equipe_id = v_minha) then f.creditos end,
        'recebidos_hoje', case when not v_eh_corretor and (v_gg or f.equipe_id = v_minha) then
            (select count(*) from public.distribuicao_decisoes x where x.recebeu_id = f.corretor_id and x.resultado = 'recebeu'
               and (x.quando at time zone 'America/Sao_Paulo')::date = (v_agora at time zone 'America/Sao_Paulo')::date) end,
        'nao_atende', case when not v_eh_corretor and c.produtos and (v_gg or f.equipe_id = v_minha) then
            (select count(*) from public.distribuicao_produtos x where x.corretor_id = f.corretor_id) end,
        'da_minha_equipe', f.equipe_id = v_minha)
        order by f.na_fila desc, f.posicao nulls last, p.nome)
      from private.distribuicao_fila(v_escopo, v_agora) f
      join public.profiles p on p.id = f.corretor_id
      left join public.teams t on t.id = f.equipe_id), '[]'::jsonb),
    'ultima', (select jsonb_build_object('apelido', coalesce(p.apelido, split_part(p.nome, ' ', 1)), 'quando', x.quando)
               from public.distribuicao_decisoes x join public.profiles p on p.id = x.recebeu_id
               where x.resultado = 'recebeu' and (v_escopo is null or x.equipe_id = v_escopo)
               order by x.quando desc limit 1));
end;
$$;

-- As vezes do próprio corretor: o que recebeu (com o nome do lead, que é dele)
-- e os pulos dele, com o motivo. Nunca o nome do lead de outro.
create or replace function public.distribuicao_minha_fila(p_de timestamptz, p_ate timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_eu uuid := private.distribuicao_exige_elegivel();
begin
  if not (private.distribuicao_cfg()).transparencia then
    raise exception 'A fila não está visível.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(x order by x->>'quando' desc) from (
      select jsonb_build_object('quando', d.quando, 'tipo', 'recebeu', 'lead_id', d.lead_id,
               'lead_nome', case when l.dono_id = v_eu then l.nome end, 'manual', d.motivo_entrada = 'manual') x
      from public.distribuicao_decisoes d join public.leads l on l.id = d.lead_id
      where d.recebeu_id = v_eu and d.quando >= p_de and d.quando < p_ate
      union all
      select jsonb_build_object('quando', d.quando, 'tipo', 'pulado', 'motivo', cand->>'motivo', 'mantem_posicao', true)
      from public.distribuicao_decisoes d
      cross join lateral jsonb_array_elements(d.candidatos) cand
      where cand->>'corretor_id' = v_eu::text and cand->>'resultado' = 'pulado'
        and d.quando >= p_de and d.quando < p_ate
      union all
      select jsonb_build_object('quando', e.quando, 'tipo', 'fim_da_fila', 'lead_nome', l.nome)
      from public.distribuicao_estouros e join public.leads l on l.id = e.lead_id
      where e.dono_id = v_eu and e.quando >= p_de and e.quando < p_ate
    ) y(x)), '[]'::jsonb);
end;
$$;

-- As decisões (gerente da equipe e gerente geral).
create or replace function public.distribuicao_decisoes(p_de timestamptz, p_ate timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  v_gg boolean := public.is_gerente_geral() or public.has_permission('dados.ver_todos');
  v_minha uuid := (select t.id from public.teams t where t.gerente_id = auth.uid());
begin
  if v_eu is null or (not v_gg and v_minha is null) then
    raise exception 'Você não vê as decisões.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'quando', d.quando, 'lead_id', d.lead_id, 'lead_nome', l.nome, 'empreendimento', l.empreendimento,
      'motivo_entrada', d.motivo_entrada, 'resultado', d.resultado,
      'recebeu', (select coalesce(p.apelido, split_part(p.nome, ' ', 1)) from public.profiles p where p.id = d.recebeu_id),
      'pulados', (select coalesce(jsonb_agg(jsonb_build_object(
                    'apelido', coalesce(p.apelido, split_part(p.nome, ' ', 1)), 'motivo', cand->>'motivo')), '[]')
                  from jsonb_array_elements(d.candidatos) cand
                  join public.profiles p on p.id = (cand->>'corretor_id')::uuid
                  where cand->>'resultado' = 'pulado' and (v_gg or p.equipe_id = v_minha)))
      order by d.quando desc)
    from public.distribuicao_decisoes d join public.leads l on l.id = d.lead_id
    where d.quando >= p_de and d.quando < p_ate
      and (v_gg or d.equipe_id = v_minha)), '[]'::jsonb);
end;
$$;

-- "Como é calculado": os números do corretor (o próprio, o gerente da equipe
-- ou o gerente geral).
create or replace function public.distribuicao_como_calculado(p_corretor uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quem uuid := coalesce(p_corretor, auth.uid());
  d public.distribuicao_desempenho;
begin
  if v_quem is null or not (v_quem = auth.uid() or public.pode_ver_dados_de(v_quem)) then
    raise exception 'Você não vê este corretor.' using errcode = '42501';
  end if;
  select * into d from public.distribuicao_desempenho x where x.corretor_id = v_quem order by x.semana desc limit 1;
  return jsonb_build_object('pesos', (private.distribuicao_cfg()).pesos, 'calculado', d.corretor_id is not null,
    'semana', d.semana, 'respondidos', d.prazo_respondidos, 'total', d.prazo_total,
    'followup_pct', d.followup_pct, 'plantao_rel', d.nota_plantao_rel, 'crm_rel', d.nota_crm_rel,
    'total_rel', d.total_rel, 'faixa', coalesce(d.faixa, 'media'), 'novo', coalesce(d.novo, true));
end;
$$;

-- "A distribuir" e os represados (gerente geral e leads.distribuir).
create or replace function public.distribuicao_a_distribuir()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('leads.distribuir') then
    raise exception 'Você não vê os leads a distribuir.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'lead_id', l.id, 'nome', l.nome, 'empreendimento', l.empreendimento, 'estado', l.distribuicao_estado,
      'chegada', l.distribuicao_chegada,
      'fonte', (select e.fonte from public.distribuicao_entradas e where e.lead_id = l.id order by e.gravado_em desc limit 1),
      'motivo', (select case when d.motivo_entrada = 'redistribuida' and d.resultado = 'a_distribuir' then 'ninguem_sobrando'
                             when d.resultado = 'a_distribuir' then 'chave_desligada'
                             when private.distribuicao_no_horario(private.distribuicao_agora()) then 'ninguem_apto'
                             else 'ate_abertura' end
                 from public.distribuicao_decisoes d where d.lead_id = l.id order by d.quando desc limit 1))
      order by l.distribuicao_chegada)
    from public.leads l
    where l.dono_id is null and l.origem = 'empresa' and l.status = 'ativo'
      and l.distribuicao_estado in ('a_distribuir', 'represado')), '[]'::jsonb);
end;
$$;

-- Atribuir à mão um lead sem dono: o gerente (fila da equipe, só a equipe) ou
-- quem tem leads.distribuir (A distribuir e represados). Conta como vez.
create or replace function public.distribuicao_atribuir(p_lead uuid, p_corretor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.leads;
begin
  perform pg_advisory_xact_lock(7305002);
  select * into l from public.leads where id = p_lead for update;
  if l.id is null or l.dono_id is not null or l.origem <> 'empresa' then
    raise exception 'Este lead já tem dono.' using errcode = 'P0001';
  end if;
  if not private.distribuicao_ve_sem_dono(l.distribuicao_estado, l.equipe_id, l.origem) then
    raise exception 'Você não atribui este lead.' using errcode = '42501';
  end if;
  if l.distribuicao_estado = 'fila_equipe' and not public.pode_atribuir_a(p_corretor) then
    raise exception 'Escolha um corretor da sua equipe.' using errcode = '42501';
  end if;
  update public.leads set dono_id = p_corretor where id = p_lead;  -- o leads_guard confere e carimba
end;
$$;

-- Configuração (todos leem o que precisam; só o gerente geral grava).
create or replace function public.distribuicao_config_salvar(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.distribuicao_config;
  v_agora timestamptz := private.distribuicao_agora();
begin
  if not public.is_gerente_geral() then
    raise exception 'Só o gerente geral muda a distribuição.' using errcode = '42501';
  end if;
  select * into c from public.distribuicao_config where id for update;
  update public.distribuicao_config set
    ligada = coalesce((p->>'ligada')::boolean, ligada),
    modo = coalesce(p->>'modo', modo),
    pesos = coalesce((p->>'pesos')::boolean, pesos),
    exigir_checkin = coalesce((p->>'exigir_checkin')::boolean, exigir_checkin),
    sinal = coalesce((p->>'sinal')::boolean, sinal),
    plantao = coalesce((p->>'plantao')::boolean, plantao),
    represar = coalesce((p->>'represar')::boolean, represar),
    produtos = coalesce((p->>'produtos')::boolean, produtos),
    redistribuir = coalesce((p->>'redistribuir')::boolean, redistribuir),
    fim_da_fila = coalesce((p->>'fim_da_fila')::boolean, fim_da_fila),
    repetido_ao_dono = coalesce((p->>'repetido_ao_dono')::boolean, repetido_ao_dono),
    manual_conta = coalesce((p->>'manual_conta')::boolean, manual_conta),
    transparencia = coalesce((p->>'transparencia')::boolean, transparencia),
    updated_at = v_agora, updated_by = auth.uid()
  where id;

  -- Efeitos imediatos nos dados já gravados (desenho, seção 2).
  if c.exigir_checkin and not coalesce((p->>'exigir_checkin')::boolean, true) then
    update public.distribuicao_ausencias a set fim = v_agora
    where a.fim is null and a.presenca_id in (select id from public.distribuicao_presencas where status = 'aberta');
    update public.distribuicao_presencas set status = 'fechada', saida_em = v_agora, saida_metodo = 'chave_desligada'
    where status = 'aberta';
  end if;
  if c.sinal and not coalesce((p->>'sinal')::boolean, true) then
    delete from public.distribuicao_sinais;
    update public.distribuicao_ausencias set fim = v_agora where fim is null and motivo in ('fora_do_raio', 'sem_sinal');
  end if;
  return to_jsonb(private.distribuicao_cfg());
end;
$$;

create or replace function public.distribuicao_config_historico()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_gerente_geral() then
    raise exception 'Só o gerente geral vê o histórico.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('quando', h.quando, 'chave', h.chave, 'de', h.de, 'para', h.para,
                                                       'quem', (select p.nome from public.profiles p where p.id = h.quem))
                                    order by h.id desc)
                   from (select * from public.distribuicao_config_historico order by id desc limit 100) h), '[]'::jsonb);
end;
$$;

-- "Mandar todos à distribuição": os leads de A distribuir que vieram da entrada.
create or replace function public.distribuicao_mandar_todos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  if not public.is_gerente_geral() then
    raise exception 'Só o gerente geral manda os leads à distribuição.' using errcode = '42501';
  end if;
  if not (private.distribuicao_cfg()).ligada then
    raise exception 'Ligue a distribuição antes.' using errcode = 'P0001';
  end if;
  for r in select l.id from public.leads l
           where l.dono_id is null and l.origem = 'empresa' and l.status = 'ativo' and l.distribuicao_estado = 'a_distribuir'
           order by l.distribuicao_chegada
  loop
    if private.distribuir_lead(r.id, 'mandada') is not null then
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- A vez entre as equipes (gerente geral).
create or replace function public.distribuicao_equipes()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_gerente_geral() or public.has_permission('dados.ver_todos')) then
    raise exception 'Só o gerente geral vê a vez das equipes.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('equipe_id', x.id, 'nome', x.nome, 'ultimo', x.ult, 'posicao', x.pos)
                     order by x.pos)
    from (select t.id, t.nome, u.ult, (row_number() over (order by u.ult_id asc nulls first, t.created_at, t.id))::int pos
          from public.teams t
          cross join lateral (select max(d.quando) ult, max(d.id) ult_id from public.distribuicao_decisoes d
                              where d.equipe_id = t.id and d.resultado in ('recebeu', 'fila_equipe')) u) x), '[]'::jsonb);
end;
$$;

-- A recepção vê quem fez check-in no stand (sem aprovar nada).
create or replace function public.recepcao_checkins(p_plantao uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := private.distribuicao_agora();
begin
  if not (public.has_permission('plantao.confirmar') or public.has_permission('plantoes.gerenciar') or public.is_gerente_geral()) then
    raise exception 'Você não vê os check-ins.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('corretor_id', d.corretor_id, 'entrada_em', d.entrada_em,
             'estado', (private.distribuicao_presenca(d.corretor_id, v_agora)).estado))
    from public.distribuicao_presencas d
    where d.plantao_id = p_plantao and d.status = 'aberta'), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- 18. Rotinas (pg_cron, agendar-distribuicao.sql)
-- ---------------------------------------------------------------------
-- Prazo estourado: fim da fila, avisos e a passagem adiante (sem limite,
-- nunca a quem já teve; sem ninguém, A distribuir). Só trata estouros de até
-- 30 min, para ligar a chave não soltar uma rajada.
create or replace function private.distribuicao_estourados()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.distribuicao_config := private.distribuicao_cfg();
  v_agora timestamptz := private.distribuicao_agora();
  r record;
  l public.leads;
  v_para uuid;
  v_n integer := 0;
begin
  for r in
    select x.id from public.leads x
    where x.origem = 'empresa' and x.status = 'ativo' and x.etapa = 'novo' and x.distribuido and x.dono_id is not null
      and private.distribuicao_fim_prazo(x) < v_agora
      and private.distribuicao_fim_prazo(x) >= v_agora - interval '30 minutes'
    order by x.atribuido_em
  loop
    select * into l from public.leads x where x.id = r.id for update skip locked;
    continue when l.id is null or l.etapa <> 'novo' or l.status <> 'ativo' or l.dono_id is null
                  or private.distribuicao_fim_prazo(l) >= v_agora;
    insert into public.distribuicao_estouros (lead_id, dono_id, inicio, quando)
    values (l.id, l.dono_id, coalesce(l.atribuido_em, l.created_at), v_agora)
    on conflict do nothing;
    continue when not found;
    v_n := v_n + 1;
    if c.ligada and c.fim_da_fila and private.distribuicao_elegivel(l.dono_id) then
      perform private.distribuicao_fim_da_fila(l.dono_id);
      perform private.distribuicao_avisar(l.dono_id, 'fim_da_fila', l.id,
        'fim_da_fila:' || l.id || ':' || extract(epoch from coalesce(l.atribuido_em, l.created_at))::bigint);
    end if;
    perform private.distribuicao_avisar(private.distribuicao_gerente_da(coalesce(l.equipe_id,
              (select p.equipe_id from public.profiles p where p.id = l.dono_id))), 'perda', l.id,
      'perda:' || l.id || ':' || extract(epoch from coalesce(l.atribuido_em, l.created_at))::bigint,
      jsonb_build_object('perdeu_id', l.dono_id));
    if c.ligada and c.redistribuir then
      v_para := private.distribuir_lead(l.id, 'redistribuida');
    end if;
  end loop;
  return v_n;
end;
$$;

-- Os represados: no horário, todos em ordem de chegada (um por vez pela
-- roleta); à noite, um por vez para quem está de plantão (16.13); com
-- "represar" desligado, saem para todos os que participam.
create or replace function private.distribuicao_liberar()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.distribuicao_config := private.distribuicao_cfg();
  r record;
  v_n integer := 0;
begin
  if not c.ligada or c.modo = 'gerentes' then
    -- No modo só gerentes, o represado (nenhuma equipe atende) tenta de novo.
    if c.ligada and c.modo = 'gerentes' then
      for r in select l.id from public.leads l
               where l.dono_id is null and l.origem = 'empresa' and l.status = 'ativo' and l.distribuicao_estado = 'represado'
               order by l.distribuicao_chegada loop
        perform private.distribuir_lead(r.id, 'represada');
      end loop;
    end if;
    return 0;
  end if;
  for r in select l.id from public.leads l
           where l.dono_id is null and l.origem = 'empresa' and l.status = 'ativo' and l.distribuicao_estado = 'represado'
           order by l.distribuicao_chegada, l.created_at
  loop
    exit when private.distribuir_lead(r.id, 'represada') is null;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Plantão: sem usar o app há 30 min fora do horário, o botão desliga.
create or replace function private.distribuicao_fim_do_plantao()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.distribuicao_config := private.distribuicao_cfg();
  v_agora timestamptz := private.distribuicao_agora();
  r record;
  v_n integer := 0;
begin
  if private.distribuicao_no_horario(v_agora) then
    return 0;
  end if;
  for r in update public.distribuicao_corretores set recebendo = false, recebendo_desde = null
           where recebendo and coalesce(ultimo_app_em, '-infinity') < v_agora - make_interval(mins => c.minutos_plantao)
           returning corretor_id, ultimo_app_em
  loop
    insert into public.distribuicao_pausas (corretor_id, tipo, quando) values (r.corretor_id, 'plantao_fim', v_agora);
    -- O aviso só para quem estava de plantão (usou o app fora do horário), não
    -- para todo mundo que deixou o botão ligado no fim do dia.
    if r.ultimo_app_em is not null and not private.distribuicao_no_horario(r.ultimo_app_em) then
      perform private.distribuicao_avisar(r.corretor_id, 'plantao_fim', null,
        'plantao_fim:' || r.corretor_id || ':' || extract(epoch from v_agora)::bigint);
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Ausências: "fora do raio" sem resposta em 5 min (16.11) e "sem sinal"
-- depois de 30 min (com o aviso).
create or replace function private.distribuicao_ausencias_rotina()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.distribuicao_config := private.distribuicao_cfg();
  v_agora timestamptz := private.distribuicao_agora();
  r record;
begin
  if not (c.exigir_checkin and c.sinal) then
    return;
  end if;
  for r in select s.corretor_id, d.id as pr from public.distribuicao_sinais s
           join public.distribuicao_presencas d on d.corretor_id = s.corretor_id and d.status = 'aberta'
           where s.fora_desde is not null and s.fora_desde <= v_agora - interval '5 minutes'
  loop
    perform private.distribuicao_abrir_ausencia(r.pr, 'fora_do_raio', v_agora);
    update public.distribuicao_sinais set fora_desde = null where corretor_id = r.corretor_id;
  end loop;
  if private.distribuicao_no_horario(v_agora) then
    for r in select d.id as pr, d.corretor_id, greatest(d.entrada_em, s.quando) as ult
             from public.distribuicao_presencas d
             left join public.distribuicao_sinais s on s.corretor_id = d.corretor_id
             where d.status = 'aberta'
               and greatest(d.entrada_em, s.quando) < v_agora - make_interval(mins => c.minutos_sem_sinal)
               and not exists (select 1 from public.distribuicao_ausencias a where a.presenca_id = d.id and a.fim is null)
    loop
      insert into public.distribuicao_ausencias (presenca_id, inicio, motivo) values (r.pr, r.ult, 'sem_sinal');
      perform private.distribuicao_avisar(r.corretor_id, 'sem_sinal', null,
        'sem_sinal:' || r.pr || ':' || extract(epoch from r.ult)::bigint);
    end loop;
  end if;
end;
$$;

-- Avisos de prazos que não mexem na fila: o repasse do gerente (modo só
-- gerentes), o represado parado no horário, a mensagem nova sem resposta (16.7).
create or replace function private.distribuicao_prazos_avisos()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := private.distribuicao_agora();
  r record;
begin
  for r in select l.id, l.distribuicao_estado, l.equipe_id from public.leads l
           where l.dono_id is null and l.origem = 'empresa' and l.status = 'ativo'
             and l.distribuicao_estado in ('fila_equipe', 'represado')
             and private.fim_do_prazo(l.distribuicao_chegada) < v_agora
  loop
    perform private.distribuicao_avisar(private.distribuicao_gerente_geral(),
      case r.distribuicao_estado when 'fila_equipe' then 'repasse_atrasado' else 'represado_parado' end, r.id,
      r.distribuicao_estado || ':' || r.id, jsonb_build_object('equipe_id', r.equipe_id));
  end loop;
  for r in select l.id, l.dono_id, l.resposta_ate,
                  (select p.equipe_id from public.profiles p where p.id = l.dono_id) as equipe
           from public.leads l
           where l.status = 'ativo' and l.resposta_ate is not null and l.resposta_ate < v_agora
  loop
    perform private.distribuicao_avisar(r.dono_id, 'mensagem_sem_resposta', r.id,
      'msg_sem_resposta:' || r.id || ':' || extract(epoch from r.resposta_ate)::bigint);
    perform private.distribuicao_avisar(private.distribuicao_gerente_da(r.equipe), 'mensagem_sem_resposta_equipe', r.id,
      'msg_sem_resposta_eq:' || r.id || ':' || extract(epoch from r.resposta_ate)::bigint,
      jsonb_build_object('corretor_id', r.dono_id));
  end loop;
end;
$$;

-- A rotina de cada minuto, em ordem.
create or replace function private.distribuicao_rotina()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_estourados integer;
  v_liberados integer;
  v_plantao integer;
begin
  v_estourados := private.distribuicao_estourados();
  v_liberados := private.distribuicao_liberar();
  v_plantao := private.distribuicao_fim_do_plantao();
  perform private.distribuicao_ausencias_rotina();
  perform private.distribuicao_prazos_avisos();
  return jsonb_build_object('estourados', v_estourados, 'liberados', v_liberados, 'plantao_fim', v_plantao);
end;
$$;

-- 19h30: fecha os check-ins abertos como "sem saída" (R4-3).
create or replace function private.distribuicao_fechar_presencas()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := private.distribuicao_agora();
  v_n integer;
begin
  update public.distribuicao_ausencias set fim = v_agora
  where fim is null and presenca_id in (select id from public.distribuicao_presencas where status = 'aberta');
  update public.distribuicao_presencas set status = 'sem_saida', saida_metodo = 'sem_saida' where status = 'aberta';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- 23h50: a foto do follow-up de cada corretor (para a Nota do CRM).
create or replace function private.distribuicao_followup_foto()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := private.distribuicao_agora();
  v_n integer;
begin
  insert into public.distribuicao_followup_dia (corretor_id, dia, ativos, em_dia)
  select p.id, (v_agora at time zone 'America/Sao_Paulo')::date,
         count(l.id), count(l.id) filter (where l.proximo_contato is null or l.proximo_contato >= v_agora)
  from public.profiles p
  join public.role_permissions rp on rp.perfil = p.perfil and rp.permissao = 'distribuicao.receber'
  left join public.leads l on l.dono_id = p.id and l.status = 'ativo'
  where p.ativo
  group by p.id
  on conflict (corretor_id, dia) do update set ativos = excluded.ativos, em_dia = excluded.em_dia;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Segunda: as duas notas e a faixa (R4-13). Cada nota vira a razão sobre a
-- média da empresa; o total é metade de cada; até 10% acima ou abaixo é
-- "na média". Quem tem menos de 30 dias de conta fica "na média".
create or replace function private.distribuicao_desempenho_calcular()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := private.distribuicao_agora();
  v_de timestamptz := private.distribuicao_agora() - interval '30 days';
  v_semana date := date_trunc('week', (private.distribuicao_agora() at time zone 'America/Sao_Paulo'))::date;
  v_n integer;
begin
  with base as (
    select p.id, p.created_at,
           (select count(*) from public.distribuicao_decisoes d
            where d.recebeu_id = p.id and d.resultado = 'recebeu' and d.motivo_entrada <> 'manual' and d.quando >= v_de) as total,
           (select count(*) from public.distribuicao_decisoes d
            where d.recebeu_id = p.id and d.resultado = 'recebeu' and d.motivo_entrada <> 'manual' and d.quando >= v_de
              and exists (select 1 from public.lead_eventos e
                          where e.lead_id = d.lead_id and e.tipo = 'etapa' and e.de = 'novo' and e.autor_id = p.id
                            and e.criado_em >= d.quando and e.criado_em <= coalesce(d.fim_prazo, d.quando + interval '15 minutes'))) as resp,
           (select avg(f.em_dia::numeric / nullif(f.ativos, 0)) from public.distribuicao_followup_dia f
            where f.corretor_id = p.id and f.dia >= (v_de at time zone 'America/Sao_Paulo')::date and f.ativos > 0) as fup,
           coalesce((select sum(lp.quantidade * cp.pontos) from public.lancamentos_pontos lp
                     join public.criterios_pontos cp on cp.slug = lp.criterio
                     where lp.corretor_id = p.id and lp.status = 'aprovado' and lp.data >= (v_de at time zone 'America/Sao_Paulo')::date), 0) as pts
    from public.profiles p
    join public.role_permissions rp on rp.perfil = p.perfil and rp.permissao = 'distribuicao.receber'
    where p.ativo
  ),
  medias as (
    select avg(resp::numeric / nullif(total, 0)) as m_prazo, avg(fup) as m_fup, avg(pts) as m_pts from base
  ),
  notas as (
    select b.*, (2.0 / 3) * coalesce(b.resp::numeric / nullif(b.total, 0), m.m_prazo, 1)
              + (1.0 / 3) * coalesce(b.fup, m.m_fup, 1) as crm,
           m.m_pts
    from base b cross join medias m
  ),
  rel as (
    select n.*, coalesce(n.crm / nullif(avg(n.crm) over (), 0), 1) as crm_rel,
           coalesce(n.pts / nullif(n.m_pts, 0), 1) as plantao_rel
    from notas n
  )
  insert into public.distribuicao_desempenho (corretor_id, semana, prazo_respondidos, prazo_total, followup_pct, pontos,
                                              nota_crm_rel, nota_plantao_rel, total_rel, faixa, peso, novo)
  select r.id, v_semana, r.resp, r.total, r.fup, r.pts, round(r.crm_rel, 4), round(r.plantao_rel, 4),
         round(0.5 * r.crm_rel + 0.5 * r.plantao_rel, 4),
         case when r.created_at > v_de then 'media'
              when 0.5 * r.crm_rel + 0.5 * r.plantao_rel > 1.10 then 'acima'
              when 0.5 * r.crm_rel + 0.5 * r.plantao_rel < 0.90 then 'abaixo'
              else 'media' end,
         case when r.created_at > v_de then 2
              when 0.5 * r.crm_rel + 0.5 * r.plantao_rel > 1.10 then 3
              when 0.5 * r.crm_rel + 0.5 * r.plantao_rel < 0.90 then 1
              else 2 end,
         r.created_at > v_de
  from rel r
  on conflict (corretor_id, semana) do update set
    prazo_respondidos = excluded.prazo_respondidos, prazo_total = excluded.prazo_total, followup_pct = excluded.followup_pct,
    pontos = excluded.pontos, nota_crm_rel = excluded.nota_crm_rel, nota_plantao_rel = excluded.nota_plantao_rel,
    total_rel = excluded.total_rel, faixa = excluded.faixa, peso = excluded.peso, novo = excluded.novo;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create or replace function private.distribuicao_limpar()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.distribuicao_checkin_tentativas where quando < private.distribuicao_agora() - interval '30 days';
  delete from public.distribuicao_decisoes where quando < private.distribuicao_agora() - interval '13 months';
  delete from public.distribuicao_avisos where criado_em < private.distribuicao_agora() - interval '30 days';
$$;

-- ---------------------------------------------------------------------
-- 19. Avisos para a Edge Function "avisos" (como os de parcerias)
-- ---------------------------------------------------------------------
create or replace function public.distribuicao_avisos_pendentes()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'para_id', a.para_id, 'tipo', a.tipo, 'lead_id', a.lead_id, 'criado_em', a.criado_em,
           'lead_nome', l.nome, 'empreendimento', l.empreendimento, 'dados', a.dados) order by a.id), '[]'::jsonb)
  from public.distribuicao_avisos a
  left join public.leads l on l.id = a.lead_id
  where a.enviado_em is null and a.criado_em > now() - interval '1 day';
$$;

create or replace function public.distribuicao_avisos_marcar(p_ids bigint[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.distribuicao_avisos set enviado_em = now() where id = any (p_ids) and enviado_em is null;
$$;

-- ---------------------------------------------------------------------
-- 20. Permissões das funções
-- ---------------------------------------------------------------------
do $$
declare
  f text;
begin
  -- privadas: ninguém de fora
  foreach f in array array[
    'private.distribuicao_agora()', 'private.distribuicao_no_horario(timestamptz)',
    'private.distribuicao_cfg()', 'private.distribuicao_config_auditoria()',
    'private.distribuicao_elegivel(uuid)', 'private.distribuicao_garantir(uuid)', 'private.distribuicao_produto(text)',
    'private.distribuicao_fim_prazo(public.leads)', 'private.distribuicao_presenca(uuid, timestamptz)',
    'private.distribuicao_situacao(uuid, timestamptz)', 'private.distribuicao_peso(uuid)', 'private.distribuicao_faixa(uuid)',
    'private.distribuicao_tem_estourado(uuid, timestamptz)', 'private.distribuicao_represado_pendente(uuid)',
    'private.distribuicao_fila(uuid, timestamptz)', 'private.distribuicao_avisar(uuid, text, uuid, text, jsonb)',
    'private.distribuicao_gerente_geral()', 'private.distribuicao_gerente_da(uuid)', 'private.distribuicao_fim_da_fila(uuid)',
    'private.distribuir_lead(uuid, text, timestamptz)', 'private.distribuir_lead_nucleo(uuid, text, timestamptz)', 'private.distribuicao_sem_dono(public.leads, text, uuid, timestamptz)',
    'private.leads_guard_distribuicao()', 'private.leads_distribuicao_manual()', 'private.lead_interacao_resposta()',
    'private.distribuicao_exige_elegivel()', 'private.distancia_m(numeric, numeric, numeric, numeric)',
    'private.distribuicao_onde(numeric, numeric, numeric)', 'private.distribuicao_presenca_aberta(uuid)',
    'private.distribuicao_abrir_ausencia(uuid, text, timestamptz)', 'private.distribuicao_pode_mexer(uuid, boolean)',
    'private.distribuicao_estourados()', 'private.distribuicao_liberar()', 'private.distribuicao_fim_do_plantao()',
    'private.distribuicao_ausencias_rotina()', 'private.distribuicao_prazos_avisos()', 'private.distribuicao_rotina()',
    'private.distribuicao_fechar_presencas()', 'private.distribuicao_followup_foto()',
    'private.distribuicao_desempenho_calcular()', 'private.distribuicao_limpar()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  -- a política do lead sem dono chama esta função: o usuário logado precisa poder
  execute 'grant execute on function private.distribuicao_ve_sem_dono(text, uuid, text) to authenticated';
  execute 'revoke all on function private.distribuicao_ve_sem_dono(text, uuid, text) from public, anon';

  foreach f in array array[
    'public.distribuicao_receber(boolean)', 'public.distribuicao_app_aberto()',
    'public.distribuicao_checkin(uuid, numeric, numeric, numeric)', 'public.distribuicao_checkout(numeric, numeric, numeric)',
    'public.distribuicao_sinal(numeric, numeric, numeric)', 'public.distribuicao_responder_saida(boolean)',
    'public.distribuicao_visita(boolean)', 'public.distribuicao_pausar(uuid, timestamptz)', 'public.distribuicao_voltar(uuid)',
    'public.distribuicao_participa(uuid, boolean)', 'public.distribuicao_produtos(uuid)',
    'public.distribuicao_produtos_salvar(uuid, uuid[])', 'public.distribuicao_meu_estado()', 'public.distribuicao_fila(uuid)',
    'public.distribuicao_minha_fila(timestamptz, timestamptz)', 'public.distribuicao_decisoes(timestamptz, timestamptz)',
    'public.distribuicao_como_calculado(uuid)', 'public.distribuicao_a_distribuir()', 'public.distribuicao_atribuir(uuid, uuid)',
    'public.distribuicao_config_salvar(jsonb)', 'public.distribuicao_config_historico()', 'public.distribuicao_mandar_todos()',
    'public.distribuicao_equipes()', 'public.recepcao_checkins(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;

  -- Só o servidor (Edge Functions com a chave de serviço).
  foreach f in array array[
    'public.lead_empresa_entrada(text, timestamptz, text, text, text, text, text, text, uuid, jsonb)',
    'public.distribuicao_avisos_pendentes()', 'public.distribuicao_avisos_marcar(bigint[])'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
