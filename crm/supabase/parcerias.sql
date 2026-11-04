-- =====================================================================
-- CRM MBigucci — módulo de parcerias (etapa 2: banco)
-- Brief: docs/codex-parcerias.md. Rode DEPOIS do schema.sql.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo: é idempotente e não desfaz o que o gerente geral
-- ajustou em Configurações > Permissões.
-- O job diário (90 dias e avisos) fica em parcerias-agendar.sql.
-- Testes (rodam e se desfazem): testes/parcerias-testes.sql.
--
-- Sumário
--   1. Permissões
--   2. Tabelas
--   3. Normalização (WhatsApp e CRECI) e gatilhos
--   4. Roleta (escolha do gerente) e atribuição
--   5. Entrada do parceiro (link e cadastro manual), duplicado e reentrada
--   6. Funções públicas: link (anon) e cadastro manual (gerente)
--   7. Rotina diária: 90 dias, avisos e limpeza
--   8. Avisos pendentes para a Edge Function (só service_role)
--   9. Segurança: RLS, grants e revokes
--
-- DECISÕES DE PRODUTO QUE O BRIEF NÃO FECHA (cada uma é uma linha só; veja os
-- trechos marcados com [TROCA]):
--   a) Parceiro NOVO cadastrado à mão por um gerente fica COM ELE (não entra
--      na roleta). Quem não é gerente (gerente geral) cadastrando à mão manda
--      o parceiro para a roleta.
--   b) Esse cadastro manual NÃO conta como "vez" na roleta (só contam as
--      entradas pela roleta: link e redistribuição).
--   c) O gerente geral NÃO entra na fila: só perfil "gerente" ativo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Permissões
-- ---------------------------------------------------------------------
-- O padrão só entra na primeira vez que cada permissão aparece (mesmo padrão
-- do módulo de leads): rodar de novo não desfaz o que o gerente geral ajustou.
-- Em has_permission o gerente geral já tem tudo; as linhas dele abaixo só
-- fazem as caixas aparecerem marcadas em Configurações.
with novas as (
  insert into public.permissions (slug, descricao, ordem) values
    ('parceiros.cadastrar', 'Cadastrar parceiros e registrar as interações dos próprios parceiros', 40),
    ('parceiros.ver_todos', 'Ver os parceiros e as interações de todos os gerentes', 41)
  on conflict (slug) do update set descricao = excluded.descricao, ordem = excluded.ordem
  returning slug, (xmax = 0) as nova
)
insert into public.role_permissions (perfil, permissao)
select v.perfil, v.permissao
from (values
  ('gerente',       'parceiros.cadastrar'),
  ('gerente_geral', 'parceiros.cadastrar'),
  ('gerente_geral', 'parceiros.ver_todos')
) as v (perfil, permissao)
join novas n on n.slug = v.permissao and n.nova
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------

-- Parceiro: corretor autônomo ou imobiliária que indica clientes. O id nasce
-- no aparelho (gravação idempotente, docs/teste-carga.md). gerente_id fica
-- nulo só quando não há nenhum gerente ativo para receber (o job pega depois).
create table if not exists public.parceiros (
  id                   uuid primary key default gen_random_uuid(),
  gerente_id           uuid references public.profiles (id) on delete set null,
  nome                 text not null check (length(btrim(nome)) between 1 and 120),
  empresa              text check (empresa is null or length(empresa) <= 160),
  whatsapp             text check (whatsapp is null or length(whatsapp) <= 40),
  whatsapp_norm        text,
  creci                text check (creci is null or length(creci) <= 40),
  creci_norm           text,
  email                text check (email is null or length(email) <= 160),
  regiao               text check (regiao is null or length(regiao) <= 160),
  atribuido_em         timestamptz not null default now(),
  -- Só a interação do gerente dono reinicia os 90 dias (gatilho abaixo).
  -- Nulo desde que o parceiro foi atribuído até a primeira interação.
  ultima_interacao_em  timestamptz,
  ultimo_gerente_id    uuid references public.profiles (id) on delete set null,
  ativo                boolean not null default true,
  entrada              text not null default 'manual' check (entrada in ('link', 'manual')),
  criado_por           uuid references public.profiles (id) on delete set null,
  criado_em            timestamptz not null default now(),
  -- Início da contagem dos 90 dias: a última interação ou, sem ela, a atribuição.
  prazo_desde          timestamptz generated always as (coalesce(ultima_interacao_em, atribuido_em)) stored,
  constraint parceiros_tem_contato check (whatsapp_norm is not null or creci_norm is not null)
);

create index if not exists parceiros_gerente_idx on public.parceiros (gerente_id, ativo);
create index if not exists parceiros_prazo_idx on public.parceiros (prazo_desde) where ativo;
-- Duplicado: WhatsApp OU CRECI iguais (normalizados) entre parceiros ativos.
-- Além da checagem das funções, o índice segura edição para um valor repetido.
create unique index if not exists parceiros_whatsapp_norm_uq on public.parceiros (whatsapp_norm)
  where ativo and whatsapp_norm is not null;
create unique index if not exists parceiros_creci_norm_uq on public.parceiros (creci_norm)
  where ativo and creci_norm is not null;

create table if not exists public.parceiro_interacoes (
  id               uuid primary key default gen_random_uuid(),
  parceiro_id      uuid not null references public.parceiros (id) on delete restrict,
  tipo             text not null check (tipo in ('ligacao', 'whatsapp', 'reuniao', 'visita')),
  resumo           text not null check (length(btrim(resumo)) between 1 and 2000),
  -- Dia do próximo contato (aparece na lista do dia do gerente). Pode ficar vazio.
  proximo_contato  date,
  criado_por       uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  criado_em        timestamptz not null default now()
);

create index if not exists parceiro_interacoes_parceiro_idx
  on public.parceiro_interacoes (parceiro_id, criado_em desc);
create index if not exists parceiro_interacoes_proximo_idx
  on public.parceiro_interacoes (criado_por, proximo_contato) where proximo_contato is not null;

-- Histórico automático, gravado só pelas funções deste arquivo (ninguém escreve
-- direto). O id sequencial dá a ordem exata, inclusive dentro de uma transação
-- (now() empata); a roleta se baseia nele.
--   cadastrado       entrou pelo link ou pelo cadastro manual
--   atribuido        foi para um gerente; "como": roleta, redistribuicao ou manual
--   reentrada_aviso  voltou a procurar a empresa; o dono (para_gerente_id) é avisado
--   perdido_90_dias  90 dias sem interação do dono
--   sem_gerente      o dono estava desativado ou não havia dono (extra, fora dos 4 pedidos)
create table if not exists public.parceiro_eventos (
  id               bigint generated always as identity primary key,
  parceiro_id      uuid not null references public.parceiros (id) on delete restrict,
  tipo             text not null check (tipo in ('cadastrado', 'atribuido', 'reentrada_aviso', 'perdido_90_dias', 'sem_gerente')),
  de_gerente_id    uuid references public.profiles (id) on delete set null,
  para_gerente_id  uuid references public.profiles (id) on delete set null,
  como             text check (como is null or como in ('roleta', 'redistribuicao', 'manual')),
  detalhe          text,
  criado_em        timestamptz not null default clock_timestamp()
);

create index if not exists parceiro_eventos_parceiro_idx on public.parceiro_eventos (parceiro_id, id desc);
-- Para a roleta: o último recebimento de cada gerente.
create index if not exists parceiro_eventos_vez_idx on public.parceiro_eventos (para_gerente_id, id desc)
  where tipo = 'atribuido';

-- Avisos pendentes para o push (a Edge Function "avisos" lê pelas funções da
-- seção 8). A chave impede repetir: um aviso por gerente e por fato.
--   recebido         parceiro novo ou redistribuído para o gerente
--   reentrada        o parceiro dele procurou a empresa de novo
--   prazo_80         faltam 10 dias para perder o parceiro (80 dias sem interação)
--   proximo_contato  chegou o dia do próximo contato combinado
create table if not exists public.parceiro_avisos (
  id           bigint generated always as identity primary key,
  gerente_id   uuid not null references public.profiles (id) on delete cascade,
  parceiro_id  uuid not null references public.parceiros (id) on delete cascade,
  tipo         text not null check (tipo in ('recebido', 'reentrada', 'prazo_80', 'proximo_contato')),
  chave        text not null check (length(chave) between 1 and 200),
  criado_em    timestamptz not null default now(),
  enviado_em   timestamptz,
  unique (gerente_id, chave)
);

create index if not exists parceiro_avisos_pendentes_idx on public.parceiro_avisos (id) where enviado_em is null;

-- Tentativas no link público, só para o limite por contato. Guarda o hash do
-- contato, nunca o número. Limpa pela rotina diária.
create table if not exists public.parceiro_link_tentativas (
  id         bigint generated always as identity primary key,
  chave      text not null,
  criado_em  timestamptz not null default now()
);

create index if not exists parceiro_link_tentativas_chave_idx on public.parceiro_link_tentativas (chave, criado_em);
create index if not exists parceiro_link_tentativas_tempo_idx on public.parceiro_link_tentativas (criado_em);

-- ---------------------------------------------------------------------
-- 3. Normalização e gatilhos
-- ---------------------------------------------------------------------

-- WhatsApp: só dígitos; tira zeros à esquerda e o 55 do país (12 ou 13 dígitos);
-- número de 10 dígitos cujo 1º dígito depois do DDD é 6 a 9 ganha o 9 do celular.
-- Fica com 10 ou 11 dígitos; com menos de 10 (ou mais de 11) devolve nulo.
create or replace function private.parceiro_norm_whatsapp(p_texto text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := regexp_replace(coalesce(p_texto, ''), '\D', '', 'g');
begin
  v := regexp_replace(v, '^0+', '');
  if length(v) in (12, 13) and left(v, 2) = '55' then
    v := substr(v, 3);
  end if;
  if length(v) = 10 and substr(v, 3, 1) between '6' and '9' then
    v := left(v, 2) || '9' || substr(v, 3);
  end if;
  if length(v) not in (10, 11) then
    return null;
  end if;
  return v;
end;
$$;

-- CRECI: sem pontuação, espaço nem a palavra "CRECI", em maiúsculas.
-- Menos de 3 caracteres devolve nulo.
create or replace function private.parceiro_norm_creci(p_texto text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := upper(coalesce(p_texto, ''));
begin
  v := regexp_replace(v, 'CRECI', '', 'g');
  v := regexp_replace(v, '[^0-9A-Z]', '', 'g');
  if length(v) < 3 then
    return null;
  end if;
  return v;
end;
$$;

create or replace function private.parceiros_normaliza()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.nome := btrim(new.nome);
  new.whatsapp_norm := private.parceiro_norm_whatsapp(new.whatsapp);
  new.creci_norm := private.parceiro_norm_creci(new.creci);
  return new;
end;
$$;

drop trigger if exists parceiros_normaliza on public.parceiros;
create trigger parceiros_normaliza before insert or update on public.parceiros
  for each row execute function private.parceiros_normaliza();

-- Só a interação do gerente dono reinicia os 90 dias. Editar o cadastro não.
-- security definer: o gerente não tem permissão de gravar ultima_interacao_em.
create or replace function private.parceiro_interacao_carimba()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.parceiros p
  set ultima_interacao_em = greatest(coalesce(p.ultima_interacao_em, new.criado_em), new.criado_em)
  where p.id = new.parceiro_id and p.gerente_id = new.criado_por;
  return null;
end;
$$;

drop trigger if exists parceiro_interacoes_carimba on public.parceiro_interacoes;
create trigger parceiro_interacoes_carimba after insert on public.parceiro_interacoes
  for each row execute function private.parceiro_interacao_carimba();

-- ---------------------------------------------------------------------
-- 4. Roleta e atribuição
-- ---------------------------------------------------------------------
-- Uma trava só (pg_advisory_xact_lock 7305001) serializa toda entrada e toda
-- redistribuição: quem pega a trava depois só escolhe o gerente DEPOIS de a
-- transação anterior ter confirmado, e então enxerga o evento dela. Por isso
-- a trava e a escolha ficam em comandos separados, e a escolha é VOLATILE
-- (cada chamada usa uma fotografia nova dos dados). Não junte os dois num
-- comando só, nem faça a escolha inline.

-- Gerente ativo que recebeu parceiro (pela roleta) há mais tempo. Quem nunca
-- recebeu vem primeiro; empate: o perfil mais antigo, depois o id.
-- p_excluir: o gerente que acabou de perder o parceiro. Se ele for o único
-- gerente ativo, fica com ele. Sem gerente ativo, devolve nulo.
-- [TROCA c] para o gerente geral entrar na fila: troque p.perfil = 'gerente'.
-- [TROCA b] para o cadastro manual contar como vez: inclua 'manual' na lista de "como".
create or replace function private.parceiro_proximo_gerente(p_excluir uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v uuid;
begin
  select p.id into v
  from public.profiles p
  where p.perfil = 'gerente' and p.ativo and p.id is distinct from p_excluir
  order by coalesce((select max(e.id) from public.parceiro_eventos e
                     where e.tipo = 'atribuido' and e.para_gerente_id = p.id
                       and e.como in ('roleta', 'redistribuicao')), 0),
           p.created_at, p.id
  limit 1;

  if v is null and p_excluir is not null then
    select p.id into v from public.profiles p where p.id = p_excluir and p.perfil = 'gerente' and p.ativo;
  end if;
  return v;
end;
$$;

-- Dá o parceiro a um gerente (p_para) ou ao próximo da roleta (p_para nulo,
-- excluindo p_excluir), reinicia os 90 dias e grava o evento. Devolve o novo
-- gerente, ou nulo se não há gerente ativo (o parceiro fica como está).
create or replace function private.parceiro_atribuir(
  p_parceiro uuid, p_agora timestamptz, p_como text,
  p_excluir uuid default null, p_para uuid default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_de uuid;
  v_para uuid;
begin
  perform pg_advisory_xact_lock(7305001);

  select p.gerente_id into v_de from public.parceiros p where p.id = p_parceiro for update;
  if not found then
    return null;
  end if;

  v_para := coalesce(p_para, private.parceiro_proximo_gerente(p_excluir));
  if v_para is null then
    return null;
  end if;

  update public.parceiros p
  set gerente_id = v_para,
      ultimo_gerente_id = coalesce(v_de, p.ultimo_gerente_id),
      atribuido_em = p_agora,
      ultima_interacao_em = null
  where p.id = p_parceiro;

  insert into public.parceiro_eventos (parceiro_id, tipo, de_gerente_id, para_gerente_id, como, criado_em)
  values (p_parceiro, 'atribuido', v_de, v_para, p_como, p_agora);

  return v_para;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Entrada do parceiro, duplicado e reentrada
-- ---------------------------------------------------------------------

create or replace function private.parceiro_aviso(p_gerente uuid, p_parceiro uuid, p_tipo text, p_chave text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.parceiro_avisos (gerente_id, parceiro_id, tipo, chave)
  values (p_gerente, p_parceiro, p_tipo, p_chave)
  on conflict (gerente_id, chave) do nothing;
$$;

-- Lógica única do link e do cadastro manual. p_entrada: 'link' ou 'manual';
-- p_autor: o gerente que cadastra (nulo no link). Devolve jsonb:
--   {"status": "criado"      , "parceiro_id", "gerente_id"}  parceiro novo
--   {"status": "ja_cadastrado", "parceiro_id", "dono_id", "dono_nome"}  já é de outro gerente (dono avisado)
--   {"status": "seu"         , "parceiro_id"}  já é do próprio gerente que cadastra
-- Duplicado = WhatsApp OU CRECI iguais (normalizados), entre ativos; se um
-- dos dois faltar, vale o outro. Parceiro repetido NUNCA entra na roleta,
-- exceto se o dono estiver desativado (ou sem dono): aí entra.
create or replace function private.parceiro_entrar(
  p_id uuid, p_nome text, p_empresa text, p_whatsapp text, p_creci text,
  p_email text, p_regiao text, p_entrada text, p_autor uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_w text := private.parceiro_norm_whatsapp(p_whatsapp);
  v_c text := private.parceiro_norm_creci(p_creci);
  v_nome text := left(btrim(coalesce(p_nome, '')), 120);
  v_email text := left(btrim(coalesce(p_email, '')), 160);
  v_dup record;
  v_dono_ativo boolean;
  v_dono_nome text;
  v_novo uuid;
  v_gerente uuid;
  v_evento bigint;
  v_agora timestamptz := now();
begin
  if v_nome = '' or (v_w is null and v_c is null) then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    v_email := null;
  end if;

  -- A trava vem sozinha, antes de qualquer consulta que dependa dela.
  perform pg_advisory_xact_lock(7305001);

  -- Repetição do mesmo envio (id gerado no aparelho): já gravado, sem nada de novo.
  if p_id is not null and exists (select 1 from public.parceiros p where p.id = p_id) then
    return jsonb_build_object('status', 'criado', 'parceiro_id', p_id);
  end if;

  select p.id, p.gerente_id into v_dup
  from public.parceiros p
  where p.ativo
    and ((v_w is not null and p.whatsapp_norm = v_w) or (v_c is not null and p.creci_norm = v_c))
  order by p.criado_em, p.id
  limit 1;

  if found then
    select (g.ativo), g.nome into v_dono_ativo, v_dono_nome
    from public.profiles g where g.id = v_dup.gerente_id;

    if coalesce(v_dono_ativo, false) then
      if v_dup.gerente_id = p_autor then
        return jsonb_build_object('status', 'seu', 'parceiro_id', v_dup.id);
      end if;
      -- Reentrada: o dono só recebe o aviso; o parceiro NÃO entra na roleta.
      insert into public.parceiro_eventos (parceiro_id, tipo, para_gerente_id, detalhe)
      values (v_dup.id, 'reentrada_aviso', v_dup.gerente_id, p_entrada)
      returning id into v_evento;
      perform private.parceiro_aviso(v_dup.gerente_id, v_dup.id, 'reentrada', 'reentrada:' || v_dup.id || ':' || v_evento);
      return jsonb_build_object('status', 'ja_cadastrado', 'parceiro_id', v_dup.id,
                                'dono_id', v_dup.gerente_id, 'dono_nome', v_dono_nome);
    end if;

    -- Sem dono ou dono desativado: entra na roleta agora (nunca para o dono antigo).
    v_gerente := private.parceiro_atribuir(v_dup.id, v_agora, 'roleta', v_dup.gerente_id);
    if v_gerente is not null then
      insert into public.parceiro_eventos (parceiro_id, tipo, de_gerente_id, para_gerente_id, detalhe)
      values (v_dup.id, 'sem_gerente', v_dup.gerente_id, v_gerente, 'reentrada');
      if v_gerente is distinct from p_autor then
        perform private.parceiro_aviso(v_gerente, v_dup.id, 'recebido',
          'recebido:' || v_dup.id || ':' || extract(epoch from v_agora)::bigint);
      end if;
      select g.nome into v_dono_nome from public.profiles g where g.id = v_gerente;
      if v_gerente = p_autor then
        return jsonb_build_object('status', 'seu', 'parceiro_id', v_dup.id);
      end if;
    else
      v_dono_nome := null;
    end if;
    return jsonb_build_object('status', 'ja_cadastrado', 'parceiro_id', v_dup.id,
                              'dono_id', v_gerente, 'dono_nome', v_dono_nome);
  end if;

  -- Parceiro novo.
  v_novo := coalesce(p_id, gen_random_uuid());
  insert into public.parceiros (id, nome, empresa, whatsapp, creci, email, regiao, entrada, criado_por, atribuido_em)
  values (v_novo, v_nome, left(nullif(btrim(coalesce(p_empresa, '')), ''), 160),
          left(nullif(btrim(coalesce(p_whatsapp, '')), ''), 40),
          left(nullif(btrim(coalesce(p_creci, '')), ''), 40),
          v_email, left(nullif(btrim(coalesce(p_regiao, '')), ''), 160),
          p_entrada, p_autor, v_agora)
  on conflict (id) do nothing;

  insert into public.parceiro_eventos (parceiro_id, tipo, detalhe) values (v_novo, 'cadastrado', p_entrada);

  -- [TROCA a] para o cadastro manual do gerente também ir para a roleta, apague
  -- este bloco "if" e deixe só o "else".
  if p_autor is not null and exists (select 1 from public.profiles g
                                     where g.id = p_autor and g.ativo and g.perfil = 'gerente') then
    v_gerente := private.parceiro_atribuir(v_novo, v_agora, 'manual', null, p_autor);
  else
    v_gerente := private.parceiro_atribuir(v_novo, v_agora, 'roleta');
    if v_gerente is not null then
      perform private.parceiro_aviso(v_gerente, v_novo, 'recebido',
        'recebido:' || v_novo || ':' || extract(epoch from v_agora)::bigint);
    end if;
  end if;

  return jsonb_build_object('status', 'criado', 'parceiro_id', v_novo, 'gerente_id', v_gerente);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Funções públicas
-- ---------------------------------------------------------------------

-- LINK PÚBLICO (anon). Devolve SEMPRE o texto 'recebido': parceiro novo,
-- repetido, descartado pela isca ou pelo limite. Assim ninguém descobre quem
-- já é parceiro. Só dado inválido (sem nome ou sem WhatsApp/CRECI válido)
-- devolve erro 'dados_invalidos', que não revela nada sobre outros parceiros.
-- Limites (constantes abaixo): 3 envios por contato por hora e 300 por hora no total.
-- p_isca: campo escondido no formulário; se vier preenchido é robô e é descartado.
create or replace function public.parceiro_enviar(
  p_nome text, p_empresa text, p_whatsapp text, p_creci text,
  p_email text, p_regiao text, p_isca text default null, p_id uuid default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_por_contato constant integer := 3;
  c_total constant integer := 300;
  v_w text := private.parceiro_norm_whatsapp(p_whatsapp);
  v_c text := private.parceiro_norm_creci(p_creci);
  v_chaves text[];
  v_n integer;
begin
  if nullif(btrim(coalesce(p_isca, '')), '') is not null then
    return 'recebido';
  end if;
  if length(btrim(coalesce(p_nome, ''))) = 0 or (v_w is null and v_c is null) then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(7305001);

  v_chaves := array_remove(array[
    case when v_w is not null then md5('w:' || v_w) end,
    case when v_c is not null then md5('c:' || v_c) end], null);

  select coalesce(max(x.n), 0) into v_n
  from (select count(*) as n from public.parceiro_link_tentativas t
        where t.chave = any (v_chaves) and t.criado_em > now() - interval '1 hour'
        group by t.chave) x;
  if v_n >= c_por_contato then
    return 'recebido';
  end if;

  select count(*) into v_n from public.parceiro_link_tentativas t where t.criado_em > now() - interval '1 hour';
  if v_n >= c_total then
    return 'recebido';
  end if;

  insert into public.parceiro_link_tentativas (chave) select unnest(v_chaves);

  perform private.parceiro_entrar(p_id, p_nome, p_empresa, p_whatsapp, p_creci, p_email, p_regiao, 'link', null);
  return 'recebido';
end;
$$;

-- CADASTRO MANUAL (gerente). Devolve jsonb (veja private.parceiro_entrar):
-- status "criado", "ja_cadastrado" (com dono_nome: "já é parceiro de <nome>"; o
-- dono é avisado) ou "seu" (já é parceiro do próprio gerente).
create or replace function public.parceiro_cadastrar(
  p_id uuid, p_nome text, p_empresa text, p_whatsapp text, p_creci text, p_email text, p_regiao text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_permission('parceiros.cadastrar') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return private.parceiro_entrar(p_id, p_nome, p_empresa, p_whatsapp, p_creci, p_email, p_regiao, 'manual', auth.uid());
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Rotina diária
-- ---------------------------------------------------------------------

-- Parceiro que passou de 90 dias sem interação do dono, ou cujo dono foi
-- desativado (ou não existe), vai para o próximo da roleta, nunca para quem
-- acabou de perder (se for o único gerente ativo, fica com ele). Registra
-- perdido_90_dias (ou sem_gerente) e atribuido. p_agora existe para os testes.
create or replace function private.parceiros_redistribuir(p_agora timestamptz default now())
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r record;
  v_p record;
  v_dono_ativo boolean;
  v_para uuid;
  v_n integer := 0;
begin
  perform pg_advisory_xact_lock(7305001);

  for r in
    select p.id from public.parceiros p
    left join public.profiles g on g.id = p.gerente_id
    where p.ativo
      and (not coalesce(g.ativo, false) or p.prazo_desde <= p_agora - interval '90 days')
    order by p.prazo_desde, p.id
  loop
    -- Trava a linha e confere de novo: uma interação gravada agora pode ter reiniciado o prazo.
    select p.id, p.gerente_id, p.prazo_desde into v_p
    from public.parceiros p where p.id = r.id and p.ativo for update;
    if not found then
      continue;
    end if;
    select coalesce(g.ativo, false) into v_dono_ativo from public.profiles g where g.id = v_p.gerente_id;
    v_dono_ativo := coalesce(v_dono_ativo, false);
    if v_dono_ativo and v_p.prazo_desde > p_agora - interval '90 days' then
      continue;
    end if;

    v_para := private.parceiro_proximo_gerente(v_p.gerente_id);
    if v_para is null then
      continue; -- nenhum gerente ativo: fica como está, tenta amanhã
    end if;

    insert into public.parceiro_eventos (parceiro_id, tipo, de_gerente_id, detalhe, criado_em)
    values (v_p.id,
            case when v_dono_ativo then 'perdido_90_dias' else 'sem_gerente' end,
            v_p.gerente_id,
            case when v_dono_ativo then 'sem interação desde ' || to_char(v_p.prazo_desde at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')
                 else 'gerente desativado ou sem gerente' end,
            p_agora);

    perform private.parceiro_atribuir(v_p.id, p_agora, 'redistribuicao', v_p.gerente_id, v_para);
    if v_para is distinct from v_p.gerente_id then
      perform private.parceiro_aviso(v_para, v_p.id, 'recebido',
        'recebido:' || v_p.id || ':' || extract(epoch from p_agora)::bigint);
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Avisos do dia: faltam 10 dias (80 a 89 dias sem interação) e próximo contato
-- chegado. A data do contato é comparada em America/Sao_Paulo. Devolve quantos
-- avisos novos entraram. A chave impede repetir.
create or replace function private.parceiros_gerar_avisos(p_agora timestamptz default now())
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_n integer := 0;
  v_k integer;
begin
  insert into public.parceiro_avisos (gerente_id, parceiro_id, tipo, chave)
  select p.gerente_id, p.id, 'prazo_80', 'prazo80:' || p.id || ':' || extract(epoch from p.prazo_desde)::bigint
  from public.parceiros p
  join public.profiles g on g.id = p.gerente_id and g.ativo
  where p.ativo
    and p.prazo_desde <= p_agora - interval '80 days'
    and p.prazo_desde > p_agora - interval '90 days'
  on conflict (gerente_id, chave) do nothing;
  get diagnostics v_k = row_count;
  v_n := v_n + v_k;

  -- Vale a última interação do gerente atual, desde que ele recebeu o parceiro.
  insert into public.parceiro_avisos (gerente_id, parceiro_id, tipo, chave)
  select p.gerente_id, p.id, 'proximo_contato', 'proximo:' || u.id
  from public.parceiros p
  join public.profiles g on g.id = p.gerente_id and g.ativo
  join lateral (
    select i.id, i.proximo_contato from public.parceiro_interacoes i
    where i.parceiro_id = p.id and i.criado_por = p.gerente_id and i.criado_em >= p.atribuido_em
    order by i.criado_em desc, i.id desc limit 1
  ) u on true
  where p.ativo
    and u.proximo_contato is not null
    and u.proximo_contato <= (p_agora at time zone 'America/Sao_Paulo')::date
  on conflict (gerente_id, chave) do nothing;
  get diagnostics v_k = row_count;
  v_n := v_n + v_k;

  return v_n;
end;
$$;

-- O que o job diário chama. Devolve um resumo em jsonb (aparece no histórico do cron).
create or replace function private.parceiros_rotina(p_agora timestamptz default now())
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_red integer;
  v_av integer;
begin
  v_red := private.parceiros_redistribuir(p_agora);
  v_av := private.parceiros_gerar_avisos(p_agora);
  delete from public.parceiro_avisos where enviado_em < p_agora - interval '30 days';
  delete from public.parceiro_link_tentativas where criado_em < p_agora - interval '2 days';
  return jsonb_build_object('redistribuidos', v_red, 'avisos', v_av);
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Avisos pendentes para a Edge Function "avisos" (só service_role)
-- ---------------------------------------------------------------------
-- A Edge Function (etapa 4) lê parceiros_avisos_pendentes(), monta o push e
-- chama parceiros_avisos_marcar(ids). Só entram avisos de gerente ativo.
-- ATENÇÃO: push_assinaturas.tipos aceita só {contato,visita,atribuido,prazo,resumo}
-- (check no schema.sql, que é da outra frente). Para o aviso de parceiro ser
-- assinável com tipo próprio, o check precisa ser ampliado; senão, a função
-- reaproveita um tipo existente (sugestão: "atribuido" e "contato").
create or replace function public.parceiros_avisos_pendentes()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'gerente_id', a.gerente_id, 'tipo', a.tipo, 'criado_em', a.criado_em,
           'parceiro_id', p.id, 'nome', p.nome, 'empresa', p.empresa,
           'dias_sem_interacao', floor(extract(epoch from (now() - p.prazo_desde)) / 86400)::int
         ) order by a.id), '[]'::jsonb)
  from public.parceiro_avisos a
  join public.parceiros p on p.id = a.parceiro_id
  join public.profiles g on g.id = a.gerente_id and g.ativo
  where a.enviado_em is null;
$$;

create or replace function public.parceiros_avisos_marcar(p_ids bigint[])
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  update public.parceiro_avisos set enviado_em = now()
  where id = any (coalesce(p_ids, '{}')) and enviado_em is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Segurança: RLS, grants e revokes
-- ---------------------------------------------------------------------

alter table public.parceiros enable row level security;
alter table public.parceiro_interacoes enable row level security;
alter table public.parceiro_eventos enable row level security;
alter table public.parceiro_avisos enable row level security;
alter table public.parceiro_link_tentativas enable row level security;

-- No Supabase, tabela nova em public já nasce com permissão para anon e
-- authenticated: tira tudo e devolve só o necessário.
revoke all on public.parceiros, public.parceiro_interacoes, public.parceiro_eventos,
  public.parceiro_avisos, public.parceiro_link_tentativas from public, anon, authenticated;
revoke all on sequence public.parceiro_eventos_id_seq, public.parceiro_avisos_id_seq,
  public.parceiro_link_tentativas_id_seq from public, anon, authenticated;

grant select on public.parceiros, public.parceiro_interacoes, public.parceiro_eventos to authenticated;
-- O gerente edita só o cadastro (e pode arquivar). Quem é o dono, a atribuição
-- e os 90 dias só mudam pelas funções. Cadastrar é pela função parceiro_cadastrar.
grant update (nome, empresa, whatsapp, creci, email, regiao, ativo) on public.parceiros to authenticated;
grant insert (id, parceiro_id, tipo, resumo, proximo_contato) on public.parceiro_interacoes to authenticated;

-- Parceiros: cada gerente vê só os seus; quem tem parceiros.ver_todos vê todos.
drop policy if exists "ver parceiros" on public.parceiros;
create policy "ver parceiros" on public.parceiros
  for select to authenticated using (
    public.has_permission('parceiros.ver_todos')
    or (gerente_id = auth.uid() and public.has_permission('parceiros.cadastrar'))
  );

drop policy if exists "editar parceiros" on public.parceiros;
create policy "editar parceiros" on public.parceiros
  for update to authenticated
  using (gerente_id = auth.uid() and public.has_permission('parceiros.cadastrar'))
  with check (gerente_id = auth.uid() and public.has_permission('parceiros.cadastrar'));

-- Interações e histórico: quem vê o parceiro vê (herdam a regra acima).
drop policy if exists "ver interacoes de parceiros" on public.parceiro_interacoes;
create policy "ver interacoes de parceiros" on public.parceiro_interacoes
  for select to authenticated using (
    exists (select 1 from public.parceiros p where p.id = parceiro_id)
  );

-- Só o dono atual registra, em nome dele, e só em parceiro ativo. Não há
-- edição nem exclusão: o histórico fica como foi escrito.
drop policy if exists "registrar interacao de parceiro" on public.parceiro_interacoes;
create policy "registrar interacao de parceiro" on public.parceiro_interacoes
  for insert to authenticated with check (
    criado_por = auth.uid()
    and public.has_permission('parceiros.cadastrar')
    and exists (select 1 from public.parceiros p
                where p.id = parceiro_id and p.gerente_id = auth.uid() and p.ativo)
  );

drop policy if exists "ver eventos de parceiros" on public.parceiro_eventos;
create policy "ver eventos de parceiros" on public.parceiro_eventos
  for select to authenticated using (
    exists (select 1 from public.parceiros p where p.id = parceiro_id)
  );

-- parceiro_avisos e parceiro_link_tentativas: RLS ligado, sem policy e sem grant.
-- Só as funções (security definer) e o service_role mexem.

do $$
declare
  f text;
begin
  -- Nada executável por anon nem pelo público, exceto o link e o cadastro manual abaixo.
  foreach f in array array[
    'private.parceiro_norm_whatsapp(text)', 'private.parceiro_norm_creci(text)',
    'private.parceiros_normaliza()', 'private.parceiro_interacao_carimba()',
    'private.parceiro_proximo_gerente(uuid)',
    'private.parceiro_atribuir(uuid, timestamptz, text, uuid, uuid)',
    'private.parceiro_aviso(uuid, uuid, text, text)',
    'private.parceiro_entrar(uuid, text, text, text, text, text, text, text, uuid)',
    'private.parceiros_redistribuir(timestamptz)', 'private.parceiros_gerar_avisos(timestamptz)',
    'private.parceiros_rotina(timestamptz)',
    'public.parceiros_avisos_pendentes()', 'public.parceiros_avisos_marcar(bigint[])',
    'public.parceiro_enviar(text, text, text, text, text, text, text, uuid)',
    'public.parceiro_cadastrar(uuid, text, text, text, text, text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;

-- O link público: anon (e authenticated) executa SÓ esta função.
grant execute on function public.parceiro_enviar(text, text, text, text, text, text, text, uuid) to anon, authenticated;
-- O cadastro manual: só quem está logado (a função confere parceiros.cadastrar).
grant execute on function public.parceiro_cadastrar(uuid, text, text, text, text, text, text) to authenticated;
