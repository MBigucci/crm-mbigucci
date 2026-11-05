-- =====================================================================
-- CRM MBigucci — recepção do stand (/recepcao/)
-- Brief: docs/codex-recepcao.md · estudo: docs/estudo-recepcao.md.
-- Como usar: Supabase → SQL Editor → New query → cole tudo → Run.
-- Ordem: schema.sql, parcerias.sql, recepcao.sql (sem o parcerias.sql roda,
-- mas a indicação de parceiro recusa). Idempotente: pode rodar de novo.
--
-- PARTE 1: stands, especialistas, apelido e CRECI, a vez do dia
-- (pôr na vez, saiu, voltou, passar a vez, não está mais, desfazer) e as
-- leituras da tela. PARTE 2 (no fim do arquivo): o cliente do stand
-- (atendimentos por tipo, lead, parceiro, retorno, corrigir e desfazer).
--
-- Regras da vez (Felipe, 04/11/2026):
--  - A ordem é a da roleta feita no stand: a recepção põe as pessoas na vez
--    nessa ordem. O CRM só segue em círculo, pulando quem saiu ou não está mais.
--  - "Pôr na vez" só fica aberto das 8h45 às 9h15 (manhã) e das 13h45 às
--    14h15 (tarde), hora de São Paulo. Fora disso, a vez do turno está fechada.
--  - Quem recebe um cliente da vez ou passa a vez vai para o fim do círculo.
--  - Stand sem especialista não tem a vez dos especialistas.
-- Escrita só pelas funções (security definer); as tabelas não aceitam
-- insert/update direto do app. Nenhum texto fala de pontos, verba ou ranking.
-- =====================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------
-- 0. Relógio. Os testes trocam esta função por uma hora fixa; em produção
--    é sempre now(). Nunca leia hora do aparelho.
-- ---------------------------------------------------------------------
create or replace function private.recepcao_agora()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() $$;

create or replace function private.recepcao_hoje()
returns date
language sql
stable
set search_path = ''
as $$ select (private.recepcao_agora() at time zone 'America/Sao_Paulo')::date $$;

-- Janela do "Pôr na vez" de cada turno. Para mudar o horário, mude aqui.
create or replace function private.recepcao_janela_aberta(p_turno text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case p_turno
           when 'manha' then h >= time '08:45' and h < time '09:15'
           when 'tarde' then h >= time '13:45' and h < time '14:15'
           else false
         end
  from (select (private.recepcao_agora() at time zone 'America/Sao_Paulo')::time as h) x;
$$;

-- ---------------------------------------------------------------------
-- 1. Permissões (catálogo lido por todos: descrições neutras)
-- ---------------------------------------------------------------------
with novas as (
  insert into public.permissions (slug, descricao, ordem) values
    ('plantao.confirmar',        'Registrar a chegada, a saída e a vez das pessoas no stand', 30),
    ('plantao.atendimentos',     'Registrar os clientes que chegam ao stand', 31),
    ('plantao.atendimentos_ver', 'Ver os clientes atendidos no stand pelos corretores que vê', 32),
    ('plantoes.gerenciar',       'Configurar os stands e a lista de especialistas', 33)
  on conflict (slug) do update set descricao = excluded.descricao, ordem = excluded.ordem
  returning slug, (xmax = 0) as nova
)
insert into public.role_permissions (perfil, permissao)
select v.perfil, v.permissao
from (values ('recepcao', 'plantao.confirmar'), ('operacional', 'plantao.confirmar'),
             ('recepcao', 'plantao.atendimentos'), ('operacional', 'plantao.atendimentos'),
             ('gerente', 'plantao.atendimentos_ver'),
             ('operacional', 'plantoes.gerenciar')) as v (perfil, permissao)
join novas n on n.slug = v.permissao and n.nova
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Stands e especialistas
-- ---------------------------------------------------------------------
create table if not exists public.plantoes (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null check (length(btrim(nome)) > 0),
  tem_especialista  boolean not null default true,
  ativo             boolean not null default true,
  ordem             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists plantoes_nome_unico on public.plantoes (lower(btrim(nome)));

insert into public.plantoes (nome, ordem)
select v.nome, v.ordem
from (values ('Marco Zero', 1), ('Home Store', 2), ('Easy', 3), ('Elleva', 4)) as v (nome, ordem)
where not exists (select 1 from public.plantoes p where lower(btrim(p.nome)) = lower(v.nome));

-- Especialista não é usuário: só o nome, numa lista única (a escala muda toda
-- semana; a recepção põe na vez quem veio no dia).
create table if not exists public.especialistas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(btrim(nome)) > 0),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists especialistas_nome_ativo_unico
  on public.especialistas (lower(btrim(nome))) where ativo;

create or replace function private.recepcao_nome_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nome := btrim(new.nome);
  return new;
end;
$$;

drop trigger if exists plantoes_nome_guard on public.plantoes;
create trigger plantoes_nome_guard before insert or update on public.plantoes
  for each row execute function private.recepcao_nome_guard();
drop trigger if exists especialistas_nome_guard on public.especialistas;
create trigger especialistas_nome_guard before insert or update on public.especialistas
  for each row execute function private.recepcao_nome_guard();
drop trigger if exists plantoes_set_updated_at on public.plantoes;
create trigger plantoes_set_updated_at before update on public.plantoes
  for each row execute function public.set_updated_at();
drop trigger if exists especialistas_set_updated_at on public.especialistas;
create trigger especialistas_set_updated_at before update on public.especialistas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Apelido e CRECI do corretor
-- ---------------------------------------------------------------------
-- Apelido obrigatório para corretor ativo (é como a recepção chama). O banco
-- só cobra quando o corretor fica ativo ou alguém apaga o apelido: os ativos
-- de antes deste script continuam editáveis até ganharem apelido.
alter table public.profiles add column if not exists apelido text;
alter table public.profiles add column if not exists creci text;
create unique index if not exists profiles_apelido_ativo_unico
  on public.profiles (lower(apelido)) where ativo and apelido is not null;

create or replace function private.profiles_apelido_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.apelido := nullif(btrim(coalesce(new.apelido, '')), '');
  new.creci := nullif(btrim(coalesce(new.creci, '')), '');
  if new.ativo and new.perfil = 'corretor' and new.apelido is null
     and (tg_op = 'INSERT' or not old.ativo or old.perfil <> 'corretor' or old.apelido is not null) then
    raise exception 'Corretor ativo precisa de apelido.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_apelido_guard on public.profiles;
create trigger profiles_apelido_guard before insert or update on public.profiles
  for each row execute function private.profiles_apelido_guard();

grant update (apelido, creci) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 4. A vez do dia: presença por turno e eventos
-- ---------------------------------------------------------------------
-- Uma linha por pessoa, stand, dia e turno, na ordem da roleta do stand.
-- "Manhã e tarde" é quem está nos dois turnos.
create table if not exists public.plantao_presencas (
  id               uuid primary key,             -- gerado no aparelho
  plantao_id       uuid not null references public.plantoes (id) on delete restrict,
  dia              date not null,
  turno            text not null check (turno in ('manha', 'tarde')),
  papel            text not null check (papel in ('corretor', 'especialista')),
  pessoa_id        uuid references public.profiles (id) on delete restrict,
  especialista_id  uuid references public.especialistas (id) on delete restrict,
  ordem            integer not null check (ordem > 0),
  entrada_em       timestamptz not null default now(),
  entrada_metodo   text not null default 'recepcao' check (entrada_metodo in ('recepcao', 'gps')),
  registrado_por   uuid references public.profiles (id) on delete set null,
  constraint plantao_presencas_quem check (
    (papel = 'corretor' and pessoa_id is not null and especialista_id is null)
    or (papel = 'especialista' and especialista_id is not null and pessoa_id is null)),
  constraint plantao_presencas_ordem_unica unique (plantao_id, dia, turno, papel, ordem)
);
-- Ninguém fica em dois stands no mesmo turno, nem duas vezes na mesma vez.
create unique index if not exists plantao_presencas_corretor_turno
  on public.plantao_presencas (dia, turno, pessoa_id) where pessoa_id is not null;
create unique index if not exists plantao_presencas_especialista_turno
  on public.plantao_presencas (dia, turno, especialista_id) where especialista_id is not null;
create index if not exists plantao_presencas_dia_idx on public.plantao_presencas (plantao_id, dia, turno, papel);

-- Saiu, voltou, passou a vez, não está mais ("encerrou") e recebeu um cliente
-- da vez ("recebeu", gravado pelo cadastro do cliente na parte 2). Desfazer
-- não apaga: marca desfeito_em.
create table if not exists public.plantao_presenca_eventos (
  id              uuid primary key,              -- gerado no aparelho
  seq             bigint generated always as identity, -- ordem de gravação (desempate)
  presenca_id     uuid not null references public.plantao_presencas (id) on delete restrict,
  tipo            text not null check (tipo in ('saida', 'volta', 'passou_vez', 'encerrou', 'recebeu')),
  em              timestamptz not null default clock_timestamp(),
  atendimento_id  uuid,                          -- no "recebeu" (parte 2)
  comprovante     text check (comprovante is null or comprovante ~ '^https://'),
  observacao      text check (observacao is null or length(observacao) <= 280),
  registrado_por  uuid references public.profiles (id) on delete set null,
  desfeito_em     timestamptz,
  desfeito_por    uuid references public.profiles (id) on delete set null
);
create index if not exists plantao_presenca_eventos_idx on public.plantao_presenca_eventos (presenca_id, seq);

-- Estado da pessoa agora: 'presente', 'saiu' ou 'encerrou'.
create or replace function private.recepcao_estado(p_presenca uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case e.tipo when 'saida' then 'saiu' when 'encerrou' then 'encerrou' else 'presente' end
    from public.plantao_presenca_eventos e
    where e.presenca_id = p_presenca and e.desfeito_em is null and e.tipo in ('saida', 'volta', 'encerrou')
    order by e.seq desc
    limit 1), 'presente');
$$;

-- Quem é "da vez" num stand, dia, turno e papel: o seguinte, em círculo, a
-- quem recebeu o último cliente da vez ou passou a vez; pula quem não está
-- presente. Sem ninguém presente, nulo.
create or replace function private.recepcao_da_vez(p_plantao uuid, p_dia date, p_turno text, p_papel text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with fila as (
    select p.id, p.ordem from public.plantao_presencas p
    where p.plantao_id = p_plantao and p.dia = p_dia and p.turno = p_turno and p.papel = p_papel
  ),
  ultimo as (
    select f.ordem from public.plantao_presenca_eventos e join fila f on f.id = e.presenca_id
    where e.desfeito_em is null and e.tipo in ('recebeu', 'passou_vez')
    order by e.seq desc
    limit 1
  )
  select f.id from fila f
  where private.recepcao_estado(f.id) = 'presente'
  order by (f.ordem <= coalesce((select u.ordem from ultimo u), 0)), f.ordem
  limit 1;
$$;

-- O turno que vale agora: a tarde a partir das 13h45, se já tem alguém na vez
-- da tarde; antes disso, a manhã.
create or replace function private.recepcao_turno_atual(p_plantao uuid, p_papel text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (private.recepcao_agora() at time zone 'America/Sao_Paulo')::time >= time '13:45'
         and exists (select 1 from public.plantao_presencas p
                     where p.plantao_id = p_plantao and p.dia = private.recepcao_hoje()
                       and p.turno = 'tarde' and p.papel = p_papel)
      then 'tarde'
    else 'manha'
  end;
$$;

-- ---------------------------------------------------------------------
-- 5. Segurança: leitura por policy, escrita só pelas funções
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['plantoes', 'especialistas', 'plantao_presencas', 'plantao_presenca_eventos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end;
$$;

grant insert (nome, tem_especialista, ativo, ordem), update (nome, tem_especialista, ativo, ordem)
  on public.plantoes to authenticated;
grant insert (nome, ativo), update (nome, ativo) on public.especialistas to authenticated;

drop policy if exists "ativos leem stands" on public.plantoes;
create policy "ativos leem stands" on public.plantoes
  for select to authenticated using (public.current_perfil() is not null);
drop policy if exists "configura stands" on public.plantoes;
create policy "configura stands" on public.plantoes
  for insert to authenticated with check (public.has_permission('plantoes.gerenciar'));
drop policy if exists "edita stands" on public.plantoes;
create policy "edita stands" on public.plantoes
  for update to authenticated using (public.has_permission('plantoes.gerenciar'))
  with check (public.has_permission('plantoes.gerenciar'));

drop policy if exists "leem especialistas" on public.especialistas;
create policy "leem especialistas" on public.especialistas
  for select to authenticated using (
    public.has_permission('plantao.confirmar') or public.has_permission('plantao.atendimentos')
    or public.has_permission('plantoes.gerenciar') or public.has_permission('plantao.atendimentos_ver'));
drop policy if exists "cadastra especialistas" on public.especialistas;
create policy "cadastra especialistas" on public.especialistas
  for insert to authenticated with check (public.has_permission('plantoes.gerenciar'));
drop policy if exists "edita especialistas" on public.especialistas;
create policy "edita especialistas" on public.especialistas
  for update to authenticated using (public.has_permission('plantoes.gerenciar'))
  with check (public.has_permission('plantoes.gerenciar'));

-- A recepção lê a vez de hoje; o gerente geral, todos os dias; o corretor, a
-- própria; o gerente, a da equipe (pode_ver_dados_de).
create or replace function private.recepcao_pode_ler_presenca(p_dia date, p_pessoa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_gerente_geral()
      or (public.has_permission('plantao.confirmar') and p_dia = private.recepcao_hoje())
      or (p_pessoa is not null and public.pode_ver_dados_de(p_pessoa));
$$;

drop policy if exists "le presencas" on public.plantao_presencas;
create policy "le presencas" on public.plantao_presencas
  for select to authenticated using (private.recepcao_pode_ler_presenca(dia, pessoa_id));

drop policy if exists "le eventos da presenca" on public.plantao_presenca_eventos;
create policy "le eventos da presenca" on public.plantao_presenca_eventos
  for select to authenticated using (exists (
    select 1 from public.plantao_presencas p
    where p.id = presenca_id and private.recepcao_pode_ler_presenca(p.dia, p.pessoa_id)));

-- ---------------------------------------------------------------------
-- 6. Funções da tela
-- ---------------------------------------------------------------------

-- Corretores ativos (com apelido e equipe) e especialistas ativos, para a
-- busca do "Pôr na vez". Nada além do nome, do apelido e da equipe.
create or replace function public.recepcao_pessoas()
returns table (papel text, id uuid, nome text, apelido text, equipe text, gerente_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.has_permission('plantao.confirmar') or public.has_permission('plantao.atendimentos')) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
    select 'corretor'::text, p.id, p.nome, p.apelido, t.nome, t.gerente_id
    from public.profiles p left join public.teams t on t.id = p.equipe_id
    where p.ativo and p.perfil = 'corretor'
    union all
    select 'especialista'::text, e.id, e.nome, null::text, null::text, null::uuid
    from public.especialistas e where e.ativo
    order by 1, 4 nulls last, 3;
end;
$$;

-- A vez de hoje de um stand, como a tela mostra: cada pessoa na ordem, o
-- estado, a hora do estado, as rodadas (clientes da vez recebidos) e quem é da vez.
create or replace function public.recepcao_dia(p_plantao uuid)
returns table (
  presenca_id uuid, turno text, papel text, ordem integer, pessoa_id uuid, especialista_id uuid,
  nome text, apelido text, equipe text, estado text, estado_em timestamptz, rodadas integer,
  da_vez boolean, entrada_em timestamptz, nos_dois_turnos boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_dia date := private.recepcao_hoje();
begin
  if not public.has_permission('plantao.confirmar') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
    select p.id, p.turno, p.papel, p.ordem, p.pessoa_id, p.especialista_id,
           coalesce(pr.nome, es.nome), pr.apelido, t.nome,
           private.recepcao_estado(p.id),
           (select max(e.em) from public.plantao_presenca_eventos e
            where e.presenca_id = p.id and e.desfeito_em is null and e.tipo in ('saida', 'volta', 'encerrou')),
           (select count(*)::integer from public.plantao_presenca_eventos e
            where e.presenca_id = p.id and e.desfeito_em is null and e.tipo = 'recebeu'),
           p.id is not distinct from private.recepcao_da_vez(p.plantao_id, p.dia, p.turno, p.papel),
           p.entrada_em,
           exists (select 1 from public.plantao_presencas o
                   where o.dia = p.dia and o.turno <> p.turno
                     and (o.pessoa_id = p.pessoa_id or o.especialista_id = p.especialista_id))
    from public.plantao_presencas p
    left join public.profiles pr on pr.id = p.pessoa_id
    left join public.teams t on t.id = pr.equipe_id
    left join public.especialistas es on es.id = p.especialista_id
    where p.plantao_id = p_plantao and p.dia = v_dia
    order by p.turno, p.papel, p.ordem;
end;
$$;

-- Pôr na vez: entra no fim da fila do turno, só dentro da janela do turno.
-- p_id gerado no aparelho: repetir o mesmo envio devolve o mesmo resultado.
-- Devolve {status: 'ok'|'ja_na_vez'|'em_outro_stand', presenca_id, ordem}.
-- Erros (22023): fora_do_horario, stand_invalido, pessoa_invalida,
-- sem_especialista (stand sem especialista).
create or replace function public.recepcao_por_na_vez(
  p_id uuid, p_plantao uuid, p_turno text, p_papel text,
  p_pessoa uuid default null, p_especialista uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_dia date := private.recepcao_hoje();
  v_tem_esp boolean;
  v_ex public.plantao_presencas;
  v_ordem integer;
begin
  if auth.uid() is null or not public.has_permission('plantao.confirmar') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if p_id is null or p_turno not in ('manha', 'tarde') or p_papel not in ('corretor', 'especialista') then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  select * into v_ex from public.plantao_presencas where id = p_id;
  if found then
    return jsonb_build_object('status', 'ok', 'presenca_id', v_ex.id, 'ordem', v_ex.ordem);
  end if;

  select pl.tem_especialista into v_tem_esp from public.plantoes pl where pl.id = p_plantao and pl.ativo;
  if not found then
    raise exception 'stand_invalido' using errcode = '22023';
  end if;
  if p_papel = 'especialista' and not v_tem_esp then
    raise exception 'sem_especialista' using errcode = '22023';
  end if;
  if not private.recepcao_janela_aberta(p_turno) then
    raise exception 'fora_do_horario' using errcode = '22023';
  end if;
  if p_papel = 'corretor' and (p_especialista is not null or not exists (
       select 1 from public.profiles p where p.id = p_pessoa and p.ativo and p.perfil = 'corretor')) then
    raise exception 'pessoa_invalida' using errcode = '22023';
  end if;
  if p_papel = 'especialista' and (p_pessoa is not null or not exists (
       select 1 from public.especialistas e where e.id = p_especialista and e.ativo)) then
    raise exception 'pessoa_invalida' using errcode = '22023';
  end if;

  -- Uma fila por stand, dia, turno e papel: duas telas ao mesmo tempo esperam.
  perform pg_advisory_xact_lock(hashtext('recepcao_vez:' || p_plantao || ':' || v_dia || ':' || p_turno || ':' || p_papel));

  select * into v_ex from public.plantao_presencas p
  where p.dia = v_dia and p.turno = p_turno
    and ((p_pessoa is not null and p.pessoa_id = p_pessoa)
         or (p_especialista is not null and p.especialista_id = p_especialista));
  if found then
    return jsonb_build_object('status', case when v_ex.plantao_id = p_plantao then 'ja_na_vez' else 'em_outro_stand' end,
                              'presenca_id', case when v_ex.plantao_id = p_plantao then v_ex.id end,
                              'ordem', case when v_ex.plantao_id = p_plantao then v_ex.ordem end);
  end if;

  select coalesce(max(p.ordem), 0) + 1 into v_ordem from public.plantao_presencas p
  where p.plantao_id = p_plantao and p.dia = v_dia and p.turno = p_turno and p.papel = p_papel;

  insert into public.plantao_presencas (id, plantao_id, dia, turno, papel, pessoa_id, especialista_id,
                                        ordem, entrada_em, entrada_metodo, registrado_por)
  values (p_id, p_plantao, v_dia, p_turno, p_papel, p_pessoa, p_especialista,
          v_ordem, private.recepcao_agora(), 'recepcao', auth.uid());

  return jsonb_build_object('status', 'ok', 'presenca_id', p_id, 'ordem', v_ordem);
end;
$$;

-- Saiu, Voltou, Passar a vez e Não está mais ("encerrou"), só na vez de hoje.
-- Passar a vez só vale para quem é da vez agora (senão 'vez_mudou').
-- p_id gerado no aparelho: repetir devolve 'ok' sem gravar de novo.
-- Erros (22023): presenca_invalida, estado_invalido, vez_mudou, dados_invalidos.
create or replace function public.recepcao_evento(
  p_id uuid, p_presenca uuid, p_tipo text, p_comprovante text default null, p_observacao text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_p public.plantao_presencas;
  v_estado text;
begin
  if auth.uid() is null or not public.has_permission('plantao.confirmar') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if p_id is null or p_tipo not in ('saida', 'volta', 'passou_vez', 'encerrou') then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;
  if exists (select 1 from public.plantao_presenca_eventos e where e.id = p_id) then
    return jsonb_build_object('status', 'ok', 'evento_id', p_id);
  end if;

  select * into v_p from public.plantao_presencas p where p.id = p_presenca;
  if not found or v_p.dia <> private.recepcao_hoje() then
    raise exception 'presenca_invalida' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('recepcao_vez:' || v_p.plantao_id || ':' || v_p.dia || ':' || v_p.turno || ':' || v_p.papel));

  v_estado := private.recepcao_estado(p_presenca);
  if (p_tipo in ('saida', 'passou_vez') and v_estado <> 'presente')
     or (p_tipo = 'volta' and v_estado <> 'saiu')
     or (p_tipo = 'encerrou' and v_estado = 'encerrou') then
    raise exception 'estado_invalido' using errcode = '22023';
  end if;
  if p_tipo = 'passou_vez'
     and private.recepcao_da_vez(v_p.plantao_id, v_p.dia, v_p.turno, v_p.papel) is distinct from p_presenca then
    raise exception 'vez_mudou' using errcode = '22023';
  end if;

  insert into public.plantao_presenca_eventos (id, presenca_id, tipo, em, comprovante, observacao, registrado_por)
  values (p_id, p_presenca, p_tipo, private.recepcao_agora(),
          nullif(btrim(coalesce(p_comprovante, '')), ''), nullif(btrim(coalesce(p_observacao, '')), ''), auth.uid());

  return jsonb_build_object('status', 'ok', 'evento_id', p_id);
end;
$$;

-- Desfazer um evento de hoje (o Desfazer de 8 s da tela; o banco aceita até
-- 30 min). Só o último evento de estado da pessoa, para não embaralhar a
-- ordem; o "recebeu" sai junto com o cliente (parte 2), não por aqui.
-- Erros (22023): evento_invalido, prazo_encerrado, nao_e_o_ultimo.
create or replace function public.recepcao_desfazer_evento(p_evento uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_e public.plantao_presenca_eventos;
  v_p public.plantao_presencas;
begin
  if auth.uid() is null or not public.has_permission('plantao.confirmar') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  select * into v_e from public.plantao_presenca_eventos e where e.id = p_evento;
  if not found or v_e.tipo = 'recebeu' then
    raise exception 'evento_invalido' using errcode = '22023';
  end if;
  if v_e.desfeito_em is not null then
    return jsonb_build_object('status', 'ok');
  end if;
  select * into v_p from public.plantao_presencas p where p.id = v_e.presenca_id;
  if v_p.dia <> private.recepcao_hoje() or v_e.em < private.recepcao_agora() - interval '30 minutes' then
    raise exception 'prazo_encerrado' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('recepcao_vez:' || v_p.plantao_id || ':' || v_p.dia || ':' || v_p.turno || ':' || v_p.papel));

  -- Passar a vez: só o último movimento da vez do grupo. Saiu/Voltou/Não está
  -- mais: só o último evento de estado da pessoa.
  if v_e.tipo = 'passou_vez' then
    if exists (select 1 from public.plantao_presenca_eventos e join public.plantao_presencas p on p.id = e.presenca_id
               where p.plantao_id = v_p.plantao_id and p.dia = v_p.dia and p.turno = v_p.turno and p.papel = v_p.papel
                 and e.desfeito_em is null and e.tipo in ('recebeu', 'passou_vez')
                 and e.seq > v_e.seq) then
      raise exception 'nao_e_o_ultimo' using errcode = '22023';
    end if;
  elsif exists (select 1 from public.plantao_presenca_eventos e
                where e.presenca_id = v_e.presenca_id and e.desfeito_em is null
                  and e.tipo in ('saida', 'volta', 'encerrou') and e.seq > v_e.seq) then
    raise exception 'nao_e_o_ultimo' using errcode = '22023';
  end if;

  update public.plantao_presenca_eventos
     set desfeito_em = private.recepcao_agora(), desfeito_por = auth.uid()
   where id = p_evento;
  return jsonb_build_object('status', 'ok');
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.recepcao_pessoas()', 'public.recepcao_dia(uuid)',
    'public.recepcao_por_na_vez(uuid, uuid, text, text, uuid, uuid)',
    'public.recepcao_evento(uuid, uuid, text, text, text)', 'public.recepcao_desfazer_evento(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
  foreach f in array array[
    'private.recepcao_agora()', 'private.recepcao_hoje()', 'private.recepcao_janela_aberta(text)',
    'private.recepcao_estado(uuid)', 'private.recepcao_da_vez(uuid, date, text, text)',
    'private.recepcao_turno_atual(uuid, text)', 'private.recepcao_pode_ler_presenca(date, uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;

-- =====================================================================
-- PARTE 2: o cliente do stand (atendimentos, por tipo — estudo, seção 3.1)
-- =====================================================================
--  novo               gira a vez dos corretores e a dos especialistas; vira lead
--                     do corretor da vez (origem Plantão). Antes das 8h45 a
--                     recepção escolhe quem atende e nada gira ("Antes da vez").
--  indicacao_corretor gira só a dos especialistas; acha o lead na carteira de
--                     quem indicou (telefone, depois nome) ou cria (Indicação).
--                     Corretor fora do stand: anuncia o gerente dele (se está
--                     no stand) ou o colega da equipe mais atrás na vez.
--  indicacao_parceiro gira só a dos especialistas; o cliente fica com o gerente
--                     dono do parceiro na hora (gerente_id congelado). O
--                     parceiro vem de public.recepcao_parceiro_entrar (parcerias.sql).
--  retorno            não gira nada; liga ao atendimento ou ao lead achado na
--                     busca e registra "Voltou ao plantão".
-- O lead ganha a interação 'plantao' ("Atendido no plantão" / "Voltou ao
-- plantão"); o próximo contato é o atual do lead, ou amanhã às 10h se vazio.

-- "Como conheceu": lista fechada, escolha múltipla. Quem tem plantoes.gerenciar
-- (e o gerente geral) muda o nome, a ordem e desativa.
create table if not exists public.plantao_midias (
  slug   text primary key check (slug ~ '^[a-z_]+$'),
  nome   text not null check (length(btrim(nome)) > 0),
  ordem  integer not null default 0,
  ativo  boolean not null default true
);
insert into public.plantao_midias (slug, nome, ordem) values
  ('passagem',        'Passagem pela loja',                      1),
  ('regiao',          'Mora ou trabalha na região',              2),
  ('indicacao_amigo', 'Indicação de amigo, família ou vizinho',  3),
  ('instagram',       'Instagram',                               4),
  ('facebook',        'Facebook ou outras redes',                5),
  ('whatsapp',        'WhatsApp',                                6),
  ('site',            'Site MBigucci',                           7),
  ('google',          'Google ou internet',                      8),
  ('outdoor',         'Outdoor',                                 9),
  ('painel_led',      'Painel de LED',                          10),
  ('folheto',         'Folheto ou panfleto',                    11),
  ('email_marketing', 'E-mail marketing',                       12),
  ('telefone_loja',   'Telefone da loja',                       13),
  ('outro',           'Outro',                                  14)
on conflict (slug) do nothing;

create table if not exists public.plantao_atendimentos (
  id                     uuid primary key,          -- gerado no aparelho
  plantao_id             uuid not null references public.plantoes (id) on delete restrict,
  dia                    date not null,
  turno                  text not null check (turno in ('manha', 'tarde')),
  registrado_em          timestamptz not null default now(),
  registrado_por         uuid references public.profiles (id) on delete set null,
  tipo                   text not null check (tipo in ('novo', 'indicacao_corretor', 'indicacao_parceiro', 'retorno')),
  antes_da_vez           boolean not null default false,
  midias                 text[] not null default '{}',
  cliente_nome           text not null check (length(btrim(cliente_nome)) between 1 and 160),
  cliente_whatsapp       text check (cliente_whatsapp is null or cliente_whatsapp ~ '^55[0-9]{10,11}$'),
  cliente_email          text check (cliente_email is null or cliente_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  veio_sozinho           boolean not null default false,
  acompanhante           text check (acompanhante is null or length(acompanhante) <= 200),
  corretor_id            uuid references public.profiles (id) on delete restrict,  -- dono do vínculo
  anunciado_papel        text check (anunciado_papel in ('corretor', 'gerente', 'colega', 'parceiro')),
  anunciado_id           uuid references public.profiles (id) on delete set null,
  parceiro_id            uuid,                      -- public.parceiros (parcerias.sql)
  gerente_id             uuid references public.profiles (id) on delete restrict,  -- do parceiro, congelado
  especialista_id        uuid references public.especialistas (id) on delete restrict,
  empreendimento         text check (empreendimento is null or length(empreendimento) <= 160),
  observacao             text check (observacao is null or length(observacao) <= 500),
  lead_id                uuid references public.leads (id) on delete restrict,
  lead_criado            boolean not null default false,
  encontrado_na_carteira boolean,
  outra_carteira         boolean not null default false,  -- a recepção confirmou o aviso
  retorno_de             uuid references public.plantao_atendimentos (id) on delete restrict,
  status                 text not null default 'ativo' check (status in ('ativo', 'cancelado')),
  cancelado_em           timestamptz,
  cancelado_por          uuid references public.profiles (id) on delete set null,
  corrigido_em           timestamptz,
  corrigido_por          uuid references public.profiles (id) on delete set null,
  motivo_correcao        text check (motivo_correcao is null or length(motivo_correcao) <= 280),
  resultado              jsonb,                     -- o que a tela recebeu (reenvio igual)
  constraint plantao_atendimentos_acompanhante check (veio_sozinho = (acompanhante is null)),
  constraint plantao_atendimentos_vinculo check (
    (tipo = 'indicacao_parceiro' and parceiro_id is not null and corretor_id is null)
    or (tipo in ('novo', 'indicacao_corretor') and corretor_id is not null and parceiro_id is null)
    or (tipo = 'retorno' and (corretor_id is not null or parceiro_id is not null)))
);
create index if not exists plantao_atendimentos_dia_idx on public.plantao_atendimentos (plantao_id, dia, registrado_em);
create index if not exists plantao_atendimentos_whatsapp_idx on public.plantao_atendimentos (cliente_whatsapp);
create index if not exists plantao_atendimentos_corretor_idx on public.plantao_atendimentos (corretor_id, dia);
create index if not exists plantao_atendimentos_lead_idx on public.plantao_atendimentos (lead_id);

-- Auditoria: só o gatilho escreve.
create table if not exists public.plantao_atendimentos_historico (
  id              bigint generated always as identity primary key,
  atendimento_id  uuid not null references public.plantao_atendimentos (id) on delete restrict,
  em              timestamptz not null default clock_timestamp(),
  por             uuid references public.profiles (id) on delete set null,
  acao            text not null check (acao in ('corrigido', 'cancelado')),
  antes           jsonb not null,
  depois          jsonb not null,
  motivo          text
);

-- O que conta como mudança: tudo menos o carimbo do próprio registro (o
-- registrar grava lead_id e o resultado logo depois de inserir).
create or replace function private.recepcao_atendimento_historico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.resultado is null then
    return new;
  end if;
  if (to_jsonb(new) - 'resultado') is distinct from (to_jsonb(old) - 'resultado') then
    insert into public.plantao_atendimentos_historico (atendimento_id, por, acao, antes, depois, motivo)
    values (new.id, auth.uid(), case when new.status = 'cancelado' and old.status <> 'cancelado' then 'cancelado' else 'corrigido' end,
            to_jsonb(old) - 'resultado', to_jsonb(new) - 'resultado', new.motivo_correcao);
  end if;
  return new;
end;
$$;
drop trigger if exists plantao_atendimentos_historico on public.plantao_atendimentos;
create trigger plantao_atendimentos_historico after update on public.plantao_atendimentos
  for each row execute function private.recepcao_atendimento_historico();

-- ---------- Leitura ----------
do $$
declare
  t text;
begin
  foreach t in array array['plantao_midias', 'plantao_atendimentos', 'plantao_atendimentos_historico'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end;
$$;
grant update (nome, ordem, ativo) on public.plantao_midias to authenticated;

drop policy if exists "ativos leem midias" on public.plantao_midias;
create policy "ativos leem midias" on public.plantao_midias
  for select to authenticated using (public.current_perfil() is not null);
drop policy if exists "edita midias" on public.plantao_midias;
create policy "edita midias" on public.plantao_midias
  for update to authenticated using (public.has_permission('plantoes.gerenciar'))
  with check (public.has_permission('plantoes.gerenciar'));

-- Recepção: só os de hoje. Gerente geral: todos. Corretor: os dele (vínculo
-- ou anunciado). Gerente: os da equipe (plantao.atendimentos_ver) e os dos
-- parceiros dele (gerente_id congelado).
create or replace function private.recepcao_pode_ler_atendimento(p_dia date, p_corretor uuid, p_anunciado uuid, p_gerente uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_gerente_geral()
      or (public.has_permission('plantao.atendimentos') and p_dia = private.recepcao_hoje())
      or (public.current_perfil() is not null and auth.uid() in (p_corretor, p_anunciado, p_gerente))
      or (public.has_permission('plantao.atendimentos_ver') and p_corretor is not null and public.pode_ver_dados_de(p_corretor));
$$;

drop policy if exists "le atendimentos" on public.plantao_atendimentos;
create policy "le atendimentos" on public.plantao_atendimentos
  for select to authenticated using (private.recepcao_pode_ler_atendimento(dia, corretor_id, anunciado_id, gerente_id));
drop policy if exists "gerente geral le auditoria" on public.plantao_atendimentos_historico;
create policy "gerente geral le auditoria" on public.plantao_atendimentos_historico
  for select to authenticated using (public.is_gerente_geral());

-- ---------- Ajudantes ----------
create or replace function private.recepcao_amanha_10h()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select ((private.recepcao_hoje() + 1) + time '10:00') at time zone 'America/Sao_Paulo' $$;

create or replace function private.recepcao_norm_nome(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(translate(btrim(coalesce(p, '')),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')), '\s+', ' ', 'g');
$$;

-- Registra a passagem pelo stand no lead (interação 'plantao').
create or replace function private.recepcao_interacao_no_lead(p_lead uuid, p_texto text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.lead_interacoes (lead_id, tipo, texto, proximo_contato)
  select l.id, 'plantao', left(p_texto, 1000), coalesce(l.proximo_contato, private.recepcao_amanha_10h())
  from public.leads l where l.id = p_lead;
$$;

-- Colega da equipe "mais atrás" na vez do turno: o último a ser chamado
-- seguindo o círculo a partir de quem é da vez (Felipe, 04/11/2026).
create or replace function private.recepcao_colega_mais_atras(p_plantao uuid, p_dia date, p_turno text, p_equipe uuid, p_fora uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with d as (
    select coalesce((select p.ordem from public.plantao_presencas p
                     where p.id = private.recepcao_da_vez(p_plantao, p_dia, p_turno, 'corretor')), 1) as ordem
  )
  select p.pessoa_id
  from public.plantao_presencas p join public.profiles pr on pr.id = p.pessoa_id cross join d
  where p.plantao_id = p_plantao and p.dia = p_dia and p.turno = p_turno and p.papel = 'corretor'
    and pr.equipe_id = p_equipe and p.pessoa_id <> p_fora and pr.ativo
    and private.recepcao_estado(p.id) = 'presente'
  order by (p.ordem < d.ordem) desc, p.ordem desc
  limit 1;
$$;

-- Marca "recebeu" na presença (conta a rodada e anda a vez).
create or replace function private.recepcao_recebeu(p_presenca uuid, p_atendimento uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.plantao_presenca_eventos (id, presenca_id, tipo, em, atendimento_id, registrado_por)
  values (gen_random_uuid(), p_presenca, 'recebeu', private.recepcao_agora(), p_atendimento, auth.uid());
$$;

create or replace function private.recepcao_apelido(p uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(pr.apelido, pr.nome) from public.profiles pr where pr.id = p $$;

create or replace function private.recepcao_nome_especialista(p uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$ select e.nome from public.especialistas e where e.id = p $$;

-- Nome e gerente de um parceiro ativo (parcerias.sql). Sem o módulo no banco,
-- nada. Dinâmico para recepcao.sql rodar mesmo antes do parcerias.sql.
create or replace function private.recepcao_parceiro(p uuid, out nome text, out gerente_id uuid, out achou boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  achou := false;
  if p is null or to_regclass('public.parceiros') is null then
    return;
  end if;
  execute 'select x.nome, x.gerente_id, true from public.parceiros x where x.id = $1 and x.ativo'
    into nome, gerente_id, achou using p;
  achou := coalesce(achou, false);
end;
$$;

-- ---------- Registrar cliente ----------
-- p (jsonb), do aparelho:
--   id, plantao_id, tipo, midias[], nome, whatsapp (já normalizado: 55...),
--   email, acompanhante, veio_sozinho, empreendimento, observacao,
--   vez_corretor / vez_especialista: as presenças que a tela mostrava como da
--     vez (se a vez andou, volta 'vez_mudou' sem gravar),
--   antes_da_vez + corretor_id (+ especialista_id opcional): antes das 8h45,
--   corretor_id: quem indicou (indicação de corretor),
--   corretor_no_stand: resposta da recepção quando quem indicou não está na vez,
--   gerente_no_stand: resposta da recepção quando quem indicou está fora,
--   parceiro_id: de public.recepcao_parceiro_entrar (indicação de parceiro),
--   retorno_atendimento ou retorno_lead: o que a busca do retorno achou,
--   confirmar[]: avisos que a recepção já confirmou ('outra_carteira', 'repetido_hoje').
-- Sem gravar: {status: 'confirmar', aviso, hora?} · {status: 'pergunta',
--   pergunta: 'corretor_no_stand', corretor} · {status: 'pergunta',
--   pergunta: 'gerente_no_stand', corretor, gerente} · {status: 'vez_mudou',
--   corretor?, especialista?}.
-- Gravado: {status: 'ok', atendimento_id, tipo, anunciar: {papel, nome}?,
--   especialista?, encontrado_na_carteira?, lead_criado?, gerente?,
--   ultimo_especialista?, especialista_da_vez?, antes_da_vez?, aviso?}.
-- Erros 22023: dados_invalidos, stand_invalido, midia_invalida,
--   sem_corretor_na_vez, vez_aberta, pessoa_invalida, parceiro_invalido,
--   parceiro_sem_gerente, retorno_invalido.
create or replace function public.recepcao_registrar_cliente(p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_plantao uuid := nullif(p ->> 'plantao_id', '')::uuid;
  v_tipo text := p ->> 'tipo';
  v_dia date := private.recepcao_hoje();
  v_turno text;
  v_tem_esp boolean;
  v_stand text;
  v_nome text := btrim(coalesce(p ->> 'nome', ''));
  v_w text := nullif(btrim(coalesce(p ->> 'whatsapp', '')), '');
  v_email text := nullif(lower(btrim(coalesce(p ->> 'email', ''))), '');
  v_sozinho boolean := coalesce((p ->> 'veio_sozinho')::boolean, false);
  v_acomp text := nullif(btrim(coalesce(p ->> 'acompanhante', '')), '');
  v_emp text := nullif(btrim(coalesce(p ->> 'empreendimento', '')), '');
  v_obs text := nullif(btrim(coalesce(p ->> 'observacao', '')), '');
  v_midias text[];
  v_confirmar text[];
  v_antes boolean := coalesce((p ->> 'antes_da_vez')::boolean, false);
  v_ex public.plantao_atendimentos;
  v_pres_c uuid;
  v_pres_e uuid;
  v_corretor uuid;
  v_anun_papel text;
  v_anun uuid;
  v_esp uuid;
  v_parceiro uuid;
  v_parc_nome text;
  v_parc_achou boolean;
  v_gerente uuid;
  v_lead uuid;
  v_lead_criado boolean := false;
  v_achou boolean;
  v_outra boolean := false;
  v_retorno uuid;
  v_hora timestamptz;
  v_equipe uuid;
  v_ger_eq uuid;
  v_pres_indicou uuid;
  v_aviso text;
  v_texto text;
  v_res jsonb;
  v_ultimo_esp text;
  v_esp_vez text;
begin
  if auth.uid() is null or not public.has_permission('plantao.atendimentos') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if v_id is null or v_tipo is null or v_tipo not in ('novo', 'indicacao_corretor', 'indicacao_parceiro', 'retorno') then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  -- Reenvio do mesmo id: a mesma resposta, sem gravar de novo.
  select * into v_ex from public.plantao_atendimentos a where a.id = v_id;
  if found then
    return v_ex.resultado;
  end if;

  select array(select distinct x from jsonb_array_elements_text(coalesce(p -> 'midias', '[]'::jsonb)) x) into v_midias;
  select array(select x from jsonb_array_elements_text(coalesce(p -> 'confirmar', '[]'::jsonb)) x) into v_confirmar;

  select pl.tem_especialista, pl.nome into v_tem_esp, v_stand from public.plantoes pl where pl.id = v_plantao and pl.ativo;
  if not found then
    raise exception 'stand_invalido' using errcode = '22023';
  end if;
  if length(v_nome) = 0 or length(v_nome) > 160
     or (v_w is not null and v_w !~ '^55[0-9]{10,11}$')
     or (v_sozinho and v_acomp is not null) or (not v_sozinho and v_acomp is null)
     or (v_antes and v_tipo <> 'novo') then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    v_email := null;
  end if;
  if exists (select 1 from unnest(v_midias) m where not exists (
       select 1 from public.plantao_midias x where x.slug = m and x.ativo))
     or (v_tipo <> 'retorno' and cardinality(v_midias) = 0) then
    raise exception 'midia_invalida' using errcode = '22023';
  end if;

  v_turno := private.recepcao_turno_atual(v_plantao, 'corretor');
  perform pg_advisory_xact_lock(hashtext('recepcao_vez:' || v_plantao || ':' || v_dia || ':' || v_turno || ':corretor'));
  perform pg_advisory_xact_lock(hashtext('recepcao_vez:' || v_plantao || ':' || v_dia || ':' || v_turno || ':especialista'));

  -- Telefone já registrado hoje neste stand: confirmar (nada gravado).
  if v_w is not null and not ('repetido_hoje' = any (v_confirmar)) then
    select a.registrado_em into v_hora from public.plantao_atendimentos a
    where a.plantao_id = v_plantao and a.dia = v_dia and a.cliente_whatsapp = v_w and a.status = 'ativo'
    order by a.registrado_em desc limit 1;
    if found then
      return jsonb_build_object('status', 'confirmar', 'aviso', 'repetido_hoje',
        'hora', to_char(v_hora at time zone 'America/Sao_Paulo', 'FMHH24"h"MI'));
    end if;
  end if;

  -- Especialista: gira no novo (da vez) e nas indicações; no retorno não gira.
  if v_tem_esp and v_tipo <> 'retorno' then
    if v_antes then
      v_esp := nullif(p ->> 'especialista_id', '')::uuid;
      if v_esp is not null and not exists (select 1 from public.especialistas e where e.id = v_esp and e.ativo) then
        raise exception 'pessoa_invalida' using errcode = '22023';
      end if;
    else
      v_pres_e := private.recepcao_da_vez(v_plantao, v_dia, v_turno, 'especialista');
      if nullif(p ->> 'vez_especialista', '')::uuid is distinct from v_pres_e then
        return jsonb_build_object('status', 'vez_mudou', 'especialista',
          (select private.recepcao_nome_especialista(x.especialista_id) from public.plantao_presencas x where x.id = v_pres_e));
      end if;
      select x.especialista_id into v_esp from public.plantao_presencas x where x.id = v_pres_e;
    end if;
  end if;

  if v_tipo = 'novo' then
    if v_antes then
      if (private.recepcao_agora() at time zone 'America/Sao_Paulo')::time >= time '08:45' then
        raise exception 'vez_aberta' using errcode = '22023';
      end if;
      v_corretor := nullif(p ->> 'corretor_id', '')::uuid;
      if not exists (select 1 from public.profiles x where x.id = v_corretor and x.ativo and x.perfil = 'corretor') then
        raise exception 'pessoa_invalida' using errcode = '22023';
      end if;
    else
      v_pres_c := private.recepcao_da_vez(v_plantao, v_dia, v_turno, 'corretor');
      if v_pres_c is null then
        raise exception 'sem_corretor_na_vez' using errcode = '22023';
      end if;
      if nullif(p ->> 'vez_corretor', '')::uuid is distinct from v_pres_c then
        return jsonb_build_object('status', 'vez_mudou', 'corretor',
          (select private.recepcao_apelido(x.pessoa_id) from public.plantao_presencas x where x.id = v_pres_c));
      end if;
      select x.pessoa_id into v_corretor from public.plantao_presencas x where x.id = v_pres_c;
    end if;
    -- Telefone já é lead ativo de outro corretor: avisa sem dizer de quem.
    if v_w is not null and exists (select 1 from public.leads l
         where l.whatsapp = v_w and l.status = 'ativo' and l.dono_id <> v_corretor) then
      if not ('outra_carteira' = any (v_confirmar)) then
        return jsonb_build_object('status', 'confirmar', 'aviso', 'outra_carteira');
      end if;
      v_outra := true;
    end if;
    v_anun_papel := 'corretor';
    v_anun := v_corretor;

  elsif v_tipo = 'indicacao_corretor' then
    v_corretor := nullif(p ->> 'corretor_id', '')::uuid;
    select x.equipe_id into v_equipe from public.profiles x where x.id = v_corretor and x.ativo and x.perfil = 'corretor';
    if not found then
      raise exception 'pessoa_invalida' using errcode = '22023';
    end if;
    -- Quem indicou está no stand agora? Na vez do turno e presente: sim. Fora
    -- da vez (chegou depois da janela, ou não veio): a recepção responde.
    -- Na vez mas como Saiu ou Não está mais: não.
    select x.id into v_pres_indicou from public.plantao_presencas x
    where x.plantao_id = v_plantao and x.dia = v_dia and x.turno = v_turno and x.pessoa_id = v_corretor;
    if v_pres_indicou is null and jsonb_typeof(p -> 'corretor_no_stand') is distinct from 'boolean' then
      return jsonb_build_object('status', 'pergunta', 'pergunta', 'corretor_no_stand',
        'corretor', private.recepcao_apelido(v_corretor));
    end if;
    if (v_pres_indicou is not null and private.recepcao_estado(v_pres_indicou) = 'presente')
       or (v_pres_indicou is null and (p ->> 'corretor_no_stand')::boolean) then
      v_anun_papel := 'corretor';
      v_anun := v_corretor;
    else
      select t.gerente_id into v_ger_eq from public.teams t where t.id = v_equipe;
      if jsonb_typeof(p -> 'gerente_no_stand') is distinct from 'boolean' then
        return jsonb_build_object('status', 'pergunta', 'pergunta', 'gerente_no_stand',
          'corretor', private.recepcao_apelido(v_corretor), 'gerente', private.recepcao_apelido(v_ger_eq));
      end if;
      if (p ->> 'gerente_no_stand')::boolean and v_ger_eq is not null then
        v_anun_papel := 'gerente';
        v_anun := v_ger_eq;
      else
        v_anun := private.recepcao_colega_mais_atras(v_plantao, v_dia, v_turno, v_equipe, v_corretor);
        v_anun_papel := case when v_anun is not null then 'colega' end;
        v_aviso := case when v_anun is null then 'ninguem_da_equipe' end;
      end if;
    end if;
    -- O lead na carteira de quem indicou: telefone, depois nome.
    if v_w is not null then
      select l.id into v_lead from public.leads l
      where l.dono_id = v_corretor and l.status = 'ativo' and l.whatsapp = v_w
      order by l.created_at desc limit 1;
    end if;
    if v_lead is null then
      select l.id into v_lead from public.leads l
      where l.dono_id = v_corretor and l.status = 'ativo'
        and private.recepcao_norm_nome(l.nome) = private.recepcao_norm_nome(v_nome)
      order by l.created_at desc limit 1;
    end if;
    v_achou := v_lead is not null;

  elsif v_tipo = 'indicacao_parceiro' then
    v_parceiro := nullif(p ->> 'parceiro_id', '')::uuid;
    select r.nome, r.gerente_id, r.achou into v_parc_nome, v_gerente, v_parc_achou from private.recepcao_parceiro(v_parceiro) r;
    if not v_parc_achou then
      raise exception 'parceiro_invalido' using errcode = '22023';
    end if;
    if v_gerente is null then
      raise exception 'parceiro_sem_gerente' using errcode = '22023';
    end if;
    v_anun_papel := 'parceiro';

  else -- retorno
    v_retorno := nullif(p ->> 'retorno_atendimento', '')::uuid;
    if v_retorno is not null then
      select a.lead_id, a.corretor_id, a.parceiro_id, a.gerente_id, a.especialista_id
        into v_lead, v_corretor, v_parceiro, v_gerente, v_esp
      from public.plantao_atendimentos a where a.id = v_retorno and a.status = 'ativo';
      if not found then
        raise exception 'retorno_invalido' using errcode = '22023';
      end if;
      if v_lead is not null then
        select l.dono_id into v_corretor from public.leads l where l.id = v_lead;
      end if;
    else
      v_lead := nullif(p ->> 'retorno_lead', '')::uuid;
      select l.dono_id into v_corretor from public.leads l where l.id = v_lead and l.status = 'ativo';
      if not found then
        raise exception 'retorno_invalido' using errcode = '22023';
      end if;
      select a.especialista_id into v_esp from public.plantao_atendimentos a
      where a.lead_id = v_lead and a.status = 'ativo' order by a.registrado_em desc limit 1;
    end if;
    if v_lead is not null then
      v_parceiro := null;
      v_gerente := null;
    end if;
    if not v_tem_esp then
      v_esp := null;
    end if;
    v_ultimo_esp := private.recepcao_nome_especialista(v_esp);
    if v_tem_esp then
      v_esp_vez := (select private.recepcao_nome_especialista(x.especialista_id) from public.plantao_presencas x
                    where x.id = private.recepcao_da_vez(v_plantao, v_dia, v_turno, 'especialista'));
    end if;
    if v_parceiro is not null then
      v_corretor := null;
      select r.nome into v_parc_nome from private.recepcao_parceiro(v_parceiro) r;
      v_anun_papel := 'parceiro';
    else
      v_anun_papel := 'corretor';
      v_anun := v_corretor;
    end if;
  end if;

  insert into public.plantao_atendimentos (
    id, plantao_id, dia, turno, registrado_em, registrado_por, tipo, antes_da_vez, midias,
    cliente_nome, cliente_whatsapp, cliente_email, veio_sozinho, acompanhante, corretor_id,
    anunciado_papel, anunciado_id, parceiro_id, gerente_id, especialista_id, empreendimento, observacao,
    encontrado_na_carteira, outra_carteira, retorno_de)
  values (
    v_id, v_plantao, v_dia, v_turno, private.recepcao_agora(), auth.uid(), v_tipo, v_antes, v_midias,
    v_nome, v_w, v_email, v_sozinho, v_acomp, v_corretor,
    v_anun_papel, v_anun, v_parceiro, v_gerente, v_esp, v_emp, v_obs,
    case when v_tipo = 'indicacao_corretor' then v_achou end, v_outra, v_retorno);

  -- O lead: cria (novo, indicação não achada) e registra a passagem.
  if v_tipo in ('novo', 'indicacao_corretor') and v_lead is null then
    insert into public.leads (dono_id, nome, whatsapp, email, origem, empreendimento)
    values (v_corretor, v_nome, v_w, v_email, case when v_tipo = 'novo' then 'plantao' else 'indicacao' end, v_emp)
    returning id into v_lead;
    v_lead_criado := true;
  end if;
  if v_lead is not null then
    v_texto := case when v_tipo = 'retorno' then 'Voltou ao plantão' else 'Atendido no plantão' end
               || ' · ' || v_stand
               || case when v_antes then ' · antes da vez' else '' end
               || case when v_anun_papel in ('gerente', 'colega') then ' · atendido por ' || private.recepcao_apelido(v_anun) else '' end
               || coalesce(' · especialista ' || private.recepcao_nome_especialista(v_esp), '')
               || case when v_outra then ' · ! o telefone já era de outra carteira' else '' end
               || coalesce(E'\n' || v_obs, '');
    perform private.recepcao_interacao_no_lead(v_lead, v_texto);
  end if;

  -- A vez anda.
  if v_pres_c is not null then
    perform private.recepcao_recebeu(v_pres_c, v_id);
  end if;
  if v_pres_e is not null then
    perform private.recepcao_recebeu(v_pres_e, v_id);
  end if;

  v_res := jsonb_strip_nulls(jsonb_build_object(
    'status', 'ok', 'atendimento_id', v_id, 'tipo', v_tipo,
    'anunciar', case
      when v_anun_papel = 'parceiro' then jsonb_build_object('papel', 'parceiro', 'nome', v_parc_nome)
      when v_anun is not null then jsonb_build_object('papel', v_anun_papel, 'nome', private.recepcao_apelido(v_anun))
    end,
    'especialista', case when v_tipo <> 'retorno' then private.recepcao_nome_especialista(v_esp) end,
    'encontrado_na_carteira', case when v_tipo = 'indicacao_corretor' then v_achou end,
    'lead_criado', case when v_lead_criado then true end,
    'gerente', private.recepcao_apelido(v_gerente),
    'ultimo_especialista', v_ultimo_esp,
    'especialista_da_vez', v_esp_vez,
    'antes_da_vez', case when v_antes then true end,
    'aviso', v_aviso));
  update public.plantao_atendimentos set lead_id = v_lead, lead_criado = v_lead_criado, resultado = v_res where id = v_id;
  return v_res;
end;
$$;

-- ---------- Procurar o retorno ----------
-- Telefone (normalizado, exato) ou nome (sem acento, contém; 3+ letras).
-- Procura nos atendimentos de todos os stands e, só pelo telefone exato, nas
-- carteiras. Devolve no máximo 5, com o mínimo para reconhecer o cliente:
-- primeiro nome, final do telefone, vínculo, último atendimento e especialista.
-- ref_tipo/ref_id vão de volta em retorno_atendimento ou retorno_lead.
create or replace function public.recepcao_procurar_retorno(p_termo text)
returns table (ref_tipo text, ref_id uuid, primeiro_nome text, final_telefone text, vinculo text,
               ultimo_em date, ultimo_stand text, ultimo_especialista text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_t text := btrim(coalesce(p_termo, ''));
  v_w text;
  v_d text := regexp_replace(v_t, '\D', '', 'g');
begin
  if auth.uid() is null or not public.has_permission('plantao.atendimentos') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if length(v_d) >= 10 then
    v_w := case when left(v_d, 2) = '55' and length(v_d) >= 12 then v_d else '55' || v_d end;
    if v_w ~ '^55[1-9]{2}[6-9][0-9]{7}$' then
      v_w := left(v_w, 4) || '9' || substr(v_w, 5);
    end if;
  elsif length(private.recepcao_norm_nome(v_t)) < 3 then
    return;
  end if;

  return query
  with achados as (
    select a.*, coalesce(a.lead_id::text, 'a:' || coalesce(a.cliente_whatsapp, private.recepcao_norm_nome(a.cliente_nome))) as chave
    from public.plantao_atendimentos a
    where a.status = 'ativo'
      and ((v_w is not null and a.cliente_whatsapp = v_w)
           or (v_w is null and private.recepcao_norm_nome(a.cliente_nome) like '%' || private.recepcao_norm_nome(v_t) || '%'))
  ),
  ultimos as (
    select distinct on (x.chave) x.* from achados x order by x.chave, x.registrado_em desc
  ),
  de_atendimento as (
    select 'atendimento'::text as ref_tipo, u.id as ref_id, split_part(btrim(u.cliente_nome), ' ', 1) as primeiro_nome,
           right(u.cliente_whatsapp, 4) as final_telefone,
           case when u.lead_id is not null then 'Corretor(a) ' || coalesce(private.recepcao_apelido((select l.dono_id from public.leads l where l.id = u.lead_id)), '')
                else 'Parceiro ' || coalesce((select r.nome from private.recepcao_parceiro(u.parceiro_id) r), '')
                     || coalesce(' · gerente ' || private.recepcao_apelido(u.gerente_id), '') end as vinculo,
           u.dia as ultimo_em, (select pl.nome from public.plantoes pl where pl.id = u.plantao_id) as ultimo_stand,
           private.recepcao_nome_especialista(u.especialista_id) as ultimo_especialista, u.registrado_em
    from ultimos u
  ),
  de_carteira as (
    select 'lead'::text, l.id, split_part(btrim(l.nome), ' ', 1), right(l.whatsapp, 4),
           'Corretor(a) ' || coalesce(private.recepcao_apelido(l.dono_id), ''),
           null::date, null::text, null::text, l.created_at
    from public.leads l
    where v_w is not null and l.whatsapp = v_w and l.status = 'ativo'
      and not exists (select 1 from achados a where a.lead_id = l.id)
  )
  select z.ref_tipo, z.ref_id, z.primeiro_nome, z.final_telefone, z.vinculo, z.ultimo_em, z.ultimo_stand, z.ultimo_especialista
  from (select * from de_atendimento union all select * from de_carteira) z
  order by z.registrado_em desc
  limit 5;
end;
$$;

-- ---------- Clientes de hoje ----------
-- A lista do stand no dia, em ordem de hora (a mais nova primeiro).
create or replace function public.recepcao_clientes_hoje(p_plantao uuid)
returns table (id uuid, registrado_em timestamptz, tipo text, antes_da_vez boolean, cliente_nome text,
               final_telefone text, veio_sozinho boolean, acompanhante text, midias text[],
               corretor text, anunciado_papel text, anunciado text, parceiro text, gerente text,
               especialista text, encontrado_na_carteira boolean, empreendimento text, observacao text,
               status text, pode_corrigir_sem_motivo boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_permission('plantao.atendimentos') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
    select a.id, a.registrado_em, a.tipo, a.antes_da_vez, a.cliente_nome, right(a.cliente_whatsapp, 4),
           a.veio_sozinho, a.acompanhante, a.midias,
           private.recepcao_apelido(a.corretor_id), a.anunciado_papel, private.recepcao_apelido(a.anunciado_id),
           (select r.nome from private.recepcao_parceiro(a.parceiro_id) r), private.recepcao_apelido(a.gerente_id),
           private.recepcao_nome_especialista(a.especialista_id), a.encontrado_na_carteira, a.empreendimento, a.observacao,
           a.status, a.registrado_em >= private.recepcao_agora() - interval '30 minutes'
    from public.plantao_atendimentos a
    where a.plantao_id = p_plantao and a.dia = private.recepcao_hoje()
    order by a.registrado_em desc;
end;
$$;

-- ---------- Corrigir e desfazer ----------
-- Corrigir: só os campos que a recepção digita e que não mudam quem atendeu
-- (como conheceu, nome, telefone, e-mail, acompanhante, empreendimento,
-- observação). Até 30 min depois sem motivo; depois, com motivo. Depois do
-- dia, só o gerente geral (e quem tem plantao.atendimentos e dados.ver_todos,
-- o operacional). Trocar o tipo ou quem atendeu: Desfazer e registrar de novo.
-- O lead não é alterado: é do corretor.
-- Erros 22023: atendimento_invalido, motivo_obrigatorio, prazo_encerrado,
--   dados_invalidos, midia_invalida.
create or replace function public.recepcao_corrigir(p_atendimento uuid, p jsonb, p_motivo text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.plantao_atendimentos;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_midias text[];
  v_sozinho boolean;
  v_acomp text;
  v_w text;
begin
  if auth.uid() is null or not public.has_permission('plantao.atendimentos') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  select * into v from public.plantao_atendimentos a where a.id = p_atendimento for update;
  if not found or v.status <> 'ativo' then
    raise exception 'atendimento_invalido' using errcode = '22023';
  end if;
  if v.dia <> private.recepcao_hoje()
     and not (public.is_gerente_geral() or public.has_permission('dados.ver_todos')) then
    raise exception 'prazo_encerrado' using errcode = '22023';
  end if;
  if v_motivo is null and (v.dia <> private.recepcao_hoje() or v.registrado_em < private.recepcao_agora() - interval '30 minutes') then
    raise exception 'motivo_obrigatorio' using errcode = '22023';
  end if;

  v_midias := case when p ? 'midias'
                   then array(select distinct x from jsonb_array_elements_text(p -> 'midias') x) else v.midias end;
  if exists (select 1 from unnest(v_midias) m where not exists (select 1 from public.plantao_midias x where x.slug = m))
     or (v.tipo <> 'retorno' and cardinality(v_midias) = 0) then
    raise exception 'midia_invalida' using errcode = '22023';
  end if;
  v_sozinho := coalesce((p ->> 'veio_sozinho')::boolean, v.veio_sozinho);
  v_acomp := case when p ? 'acompanhante' then nullif(btrim(coalesce(p ->> 'acompanhante', '')), '') else v.acompanhante end;
  if v_sozinho then v_acomp := null; end if;
  v_w := case when p ? 'whatsapp' then nullif(btrim(coalesce(p ->> 'whatsapp', '')), '') else v.cliente_whatsapp end;
  if (not v_sozinho and v_acomp is null) or (v_w is not null and v_w !~ '^55[0-9]{10,11}$')
     or (p ? 'nome' and length(btrim(coalesce(p ->> 'nome', ''))) = 0) then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  update public.plantao_atendimentos a set
    midias = v_midias,
    cliente_nome = case when p ? 'nome' then btrim(p ->> 'nome') else a.cliente_nome end,
    cliente_whatsapp = v_w,
    cliente_email = case when p ? 'email' then nullif(lower(btrim(coalesce(p ->> 'email', ''))), '') else a.cliente_email end,
    veio_sozinho = v_sozinho,
    acompanhante = v_acomp,
    empreendimento = case when p ? 'empreendimento' then nullif(btrim(coalesce(p ->> 'empreendimento', '')), '') else a.empreendimento end,
    observacao = case when p ? 'observacao' then nullif(btrim(coalesce(p ->> 'observacao', '')), '') else a.observacao end,
    corrigido_em = private.recepcao_agora(), corrigido_por = auth.uid(), motivo_correcao = v_motivo
  where a.id = p_atendimento;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Desfazer (o botão de 8 s do Anuncie; o banco aceita até 30 min, só no dia):
-- cancela o atendimento, devolve a vez (desfaz os "recebeu") e:
--  - lead criado por ele e sem nada depois: o lead some (o cliente não veio);
--  - lead que já existia ou já foi mexido: fica, com uma anotação de que o
--    registro do plantão foi desfeito.
-- Erros 22023: atendimento_invalido, prazo_encerrado.
create or replace function public.recepcao_desfazer_cliente(p_atendimento uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.plantao_atendimentos;
  v_some boolean := false;
begin
  if auth.uid() is null or not public.has_permission('plantao.atendimentos') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  select * into v from public.plantao_atendimentos a where a.id = p_atendimento for update;
  if not found then
    raise exception 'atendimento_invalido' using errcode = '22023';
  end if;
  if v.status = 'cancelado' then
    return jsonb_build_object('status', 'ok');
  end if;
  if v.dia <> private.recepcao_hoje() or v.registrado_em < private.recepcao_agora() - interval '30 minutes' then
    raise exception 'prazo_encerrado' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('recepcao_vez:' || v.plantao_id || ':' || v.dia || ':' || v.turno || ':corretor'));
  perform pg_advisory_xact_lock(hashtext('recepcao_vez:' || v.plantao_id || ':' || v.dia || ':' || v.turno || ':especialista'));

  update public.plantao_presenca_eventos e
     set desfeito_em = private.recepcao_agora(), desfeito_por = auth.uid()
   where e.atendimento_id = p_atendimento and e.tipo = 'recebeu' and e.desfeito_em is null;

  update public.plantao_atendimentos a
     set status = 'cancelado', cancelado_em = private.recepcao_agora(), cancelado_por = auth.uid(), lead_id = null
   where a.id = p_atendimento;

  if v.lead_id is not null then
    v_some := v.lead_criado
      and not exists (select 1 from public.lead_interacoes i where i.lead_id = v.lead_id and i.tipo <> 'plantao')
      and (select count(*) from public.lead_interacoes i where i.lead_id = v.lead_id) <= 1
      and not exists (select 1 from public.lead_eventos e where e.lead_id = v.lead_id and e.tipo <> 'criado' and not e.automatico)
      and not exists (select 1 from public.plantao_atendimentos a where a.lead_id = v.lead_id);
    if v_some and to_regclass('public.visitas') is not null then
      v_some := not exists (select 1 from public.visitas x where x.lead_id = v.lead_id);
    end if;
    if v_some then
      begin
        delete from public.lead_interacoes where lead_id = v.lead_id;
        delete from public.lead_eventos where lead_id = v.lead_id;
        delete from public.leads where id = v.lead_id;
      exception when foreign_key_violation then
        v_some := false;  -- algo mais já aponta para o lead: fica, com a anotação
      end;
    end if;
    if not v_some then
      insert into public.lead_interacoes (lead_id, tipo, texto, proximo_contato)
      select l.id, 'nota', 'A recepção desfez o registro do plantão de ' || to_char(v.registrado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" FMHH24"h"MI'),
             coalesce(l.proximo_contato, private.recepcao_amanha_10h())
      from public.leads l where l.id = v.lead_id;
    end if;
  end if;
  return jsonb_build_object('status', 'ok', 'lead_removido', v_some);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.recepcao_registrar_cliente(jsonb)', 'public.recepcao_procurar_retorno(text)',
    'public.recepcao_clientes_hoje(uuid)', 'public.recepcao_corrigir(uuid, jsonb, text)',
    'public.recepcao_desfazer_cliente(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
  foreach f in array array[
    'private.recepcao_amanha_10h()', 'private.recepcao_norm_nome(text)',
    'private.recepcao_interacao_no_lead(uuid, text)', 'private.recepcao_colega_mais_atras(uuid, date, text, uuid, uuid)',
    'private.recepcao_recebeu(uuid, uuid)', 'private.recepcao_apelido(uuid)', 'private.recepcao_nome_especialista(uuid)',
    'private.recepcao_parceiro(uuid)', 'private.recepcao_atendimento_historico()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  -- Usada na policy: quem lê precisa executar.
  revoke all on function private.recepcao_pode_ler_atendimento(date, uuid, uuid, uuid) from public, anon;
  grant execute on function private.recepcao_pode_ler_atendimento(date, uuid, uuid, uuid) to authenticated, service_role;
end;
$$;
