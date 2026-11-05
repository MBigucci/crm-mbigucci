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
--   2. Tabelas, regiões (lista fechada) e migração do que já existe
--   3. Normalização (WhatsApp, CRECI, regiões) e gatilhos
--   4. Roleta: a fila (ordem única) e a atribuição
--   5. Entrada do parceiro (link, estande e cadastro manual), duplicado e reentrada
--   6. Funções para o app: link (anon), cadastro manual, fila visível e evento em lote
--   7. Rotina diária: 90 dias, avisos e limpeza
--   8. Avisos pendentes para a Edge Function (só service_role)
--   9. Leitura para a ficha e a lista: linha do tempo e situação (estágio e prazo)
--  10. Segurança: RLS, grants e revokes
--
-- DECISÕES DE PRODUTO QUE O BRIEF NÃO FECHA (cada uma é uma linha só; veja os
-- trechos marcados com [TROCA]):
--   a) Parceiro NOVO cadastrado à mão por um gerente fica COM ELE (não entra
--      na roleta). Quem não é gerente (gerente geral) cadastrando à mão manda
--      o parceiro para a roleta.
--   b) Esse cadastro manual NÃO conta como "vez" na roleta (só contam as
--      entradas pela roleta: link, estande e redistribuição).
--   c) O gerente geral NÃO entra na fila: só perfil "gerente" ativo.
--   d) Tag da fila (04/11/2026: 'estande', 'link' ou '90_dias'). O cadastro
--      manual do gerente geral, que vai para a roleta, aparece como 'estande'.
--      A troca por gerente desativado aparece como '90_dias' (é redistribuição).
--   e) Estágio: quem só teve ligação, WhatsApp ou envio de material fica
--      'contatado' (nem 'novo', que é sem interação, nem 'apresentado').
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
  -- Regiões de atuação: códigos de parceiro_regioes (lista fechada, várias
  -- escolhas). "Outra" é o texto livre de regiao_outra.
  regioes              text[] not null default '{}',
  regiao_outra         text,
  atribuido_em        timestamptz not null default now(),
  -- Só a interação do gerente dono reinicia os 90 dias (gatilho abaixo).
  -- Nulo desde que o parceiro foi atribuído até a primeira interação.
  ultima_interacao_em  timestamptz,
  ultimo_gerente_id    uuid references public.profiles (id) on delete set null,
  ativo                boolean not null default true,
  -- 'estande': entrada pela recepção (a função dela ainda não existe; o valor já vale).
  entrada              text not null default 'manual',
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
  -- Tipos (check na migração abaixo): ligacao, whatsapp, reuniao, visita,
  -- envio_material e evento. Todos reiniciam os 90 dias quando é o dono que
  -- registra (decisão de 04/11/2026, opção c da rodada 1).
  tipo             text not null,
  resumo           text not null check (length(btrim(resumo)) between 1 and 2000),
  -- Dia do próximo contato (aparece na lista do dia do gerente). Pode ficar vazio.
  proximo_contato  date,
  -- Só no evento em lote: o dia do evento (o prazo conta do registro, criado_em).
  data_evento      date,
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
  -- 'procurado': na recepção, o parceiro procurou um gerente (não é vez na roleta).
  como             text,
  -- Só em "atribuido": a tag que a fila mostra. 'link', 'estande', '90_dias'
  -- (vez na roleta) ou 'manual' (cadastro do próprio gerente, não é vez).
  origem           text,
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

-- Regiões de atuação em lista fechada (04/11/2026). Cidade inteira ou bairro
-- (nome = bairro, cidade = a cidade dele). Na cidade inteira, nome = cidade.
-- "Outra" não é código: é o texto de parceiros.regiao_outra.
-- Desativar (ativo = false) tira da escolha, mas não apaga de quem já tem.
create table if not exists public.parceiro_regioes (
  codigo  text primary key check (codigo ~ '^[a-z0-9_]{2,40}$'),
  nome    text not null check (length(btrim(nome)) between 1 and 80),
  cidade  text not null check (length(btrim(cidade)) between 1 and 80),
  ordem   integer not null default 0,
  ativo   boolean not null default true
);

-- Seed. "on conflict do nothing": rodar de novo não reativa nem renomeia o que
-- foi ajustado à mão. Para corrigir um nome, use update.
insert into public.parceiro_regioes (codigo, nome, cidade, ordem) values
  -- ABC: as 7 cidades
  ('santo_andre',          'Santo André',              'Santo André',              100),
  ('sao_bernardo',         'São Bernardo do Campo',    'São Bernardo do Campo',    200),
  ('sao_caetano',          'São Caetano do Sul',       'São Caetano do Sul',       300),
  ('diadema',              'Diadema',                  'Diadema',                  400),
  ('maua',                 'Mauá',                     'Mauá',                     500),
  ('ribeirao_pires',       'Ribeirão Pires',           'Ribeirão Pires',           600),
  ('rio_grande_da_serra',  'Rio Grande da Serra',      'Rio Grande da Serra',      700),
  -- Bairros de São Bernardo do Campo -- conferir com o Felipe (quais bairros e quantos)
  ('sbc_centro',           'Centro',                   'São Bernardo do Campo',    201),
  ('sbc_rudge_ramos',      'Rudge Ramos',              'São Bernardo do Campo',    202),
  ('sbc_baeta_neves',      'Baeta Neves',              'São Bernardo do Campo',    203),
  ('sbc_nova_petropolis',  'Nova Petrópolis',          'São Bernardo do Campo',    204),
  ('sbc_jardim_do_mar',    'Jardim do Mar',            'São Bernardo do Campo',    205),
  ('sbc_anchieta',         'Anchieta',                 'São Bernardo do Campo',    206),
  ('sbc_assuncao',         'Assunção',                 'São Bernardo do Campo',    207),
  ('sbc_planalto',         'Planalto',                 'São Bernardo do Campo',    208),
  ('sbc_demarchi',         'Demarchi',                 'São Bernardo do Campo',    209),
  ('sbc_ferrazopolis',     'Ferrazópolis',             'São Bernardo do Campo',    210),
  -- Bairros de Santo André -- conferir com o Felipe (quais bairros e quantos)
  ('sa_centro',            'Centro',                   'Santo André',              101),
  ('sa_jardim',            'Jardim',                   'Santo André',              102),
  ('sa_vila_assuncao',     'Vila Assunção',            'Santo André',              103),
  ('sa_campestre',         'Campestre',                'Santo André',              104),
  ('sa_vila_bastos',       'Vila Bastos',              'Santo André',              105),
  ('sa_utinga',            'Utinga',                   'Santo André',              106),
  ('sa_parque_das_nacoes', 'Parque das Nações',        'Santo André',              107),
  ('sa_vila_luzita',       'Vila Luzita',              'Santo André',              108),
  -- São Paulo por zonas (sem a cidade inteira) -- conferir com o Felipe
  ('sp_centro',            'Centro',                   'São Paulo',                800),
  ('sp_zona_sul',          'Zona Sul',                 'São Paulo',                810),
  ('sp_zona_leste',        'Zona Leste',               'São Paulo',                820),
  ('sp_zona_norte',        'Zona Norte',               'São Paulo',                830),
  ('sp_zona_oeste',        'Zona Oeste',               'São Paulo',                840)
on conflict (codigo) do nothing;

-- ---------- Migração do que já foi criado por versões anteriores ----------
-- Idempotente: numa base nova não faz nada; numa base antiga, ajusta.

-- Região: o texto livre antigo (regiao) vai para regiao_outra e a coluna sai.
alter table public.parceiros add column if not exists regioes text[] not null default '{}';
alter table public.parceiros add column if not exists regiao_outra text;
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'parceiros' and column_name = 'regiao') then
    execute $m$
      update public.parceiros
      set regiao_outra = left(btrim(regiao), 160)
      where regiao_outra is null and nullif(btrim(regiao), '') is not null $m$;
    alter table public.parceiros drop column regiao;
  end if;
end;
$$;
alter table public.parceiros drop constraint if exists parceiros_regiao_outra_check;
alter table public.parceiros add constraint parceiros_regiao_outra_check
  check (regiao_outra is null or length(regiao_outra) <= 160);
alter table public.parceiros drop constraint if exists parceiros_entrada_check;
alter table public.parceiros add constraint parceiros_entrada_check
  check (entrada in ('link', 'manual', 'estande'));

-- Tipos de interação: envio de material e evento (04/11/2026).
alter table public.parceiro_interacoes add column if not exists data_evento date;
alter table public.parceiro_interacoes drop constraint if exists parceiro_interacoes_tipo_check;
alter table public.parceiro_interacoes add constraint parceiro_interacoes_tipo_check
  check (tipo in ('ligacao', 'whatsapp', 'reuniao', 'visita', 'envio_material', 'evento'));

-- Tag da fila no evento "atribuido". O que já existia ganha a tag pelo "como"
-- (a roleta antiga só tinha o link; o cadastro do gerente geral vira 'estande', [TROCA d]).
alter table public.parceiro_eventos add column if not exists origem text;
alter table public.parceiro_eventos drop constraint if exists parceiro_eventos_como_check;
alter table public.parceiro_eventos add constraint parceiro_eventos_como_check
  check (como is null or como in ('roleta', 'redistribuicao', 'manual', 'procurado'));
alter table public.parceiro_eventos drop constraint if exists parceiro_eventos_origem_check;
alter table public.parceiro_eventos add constraint parceiro_eventos_origem_check
  check (origem is null or origem in ('link', 'estande', '90_dias', 'manual'));
update public.parceiro_eventos e
set origem = case e.como
               when 'redistribuicao' then '90_dias'
               when 'manual' then 'manual'
               else case when p.entrada = 'link' then 'link' else 'estande' end
             end
from public.parceiros p
where p.id = e.parceiro_id and e.tipo = 'atribuido' and e.origem is null;

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

-- Regiões recebidas do app: tira espaço, vazio e repetição; devolve em ordem.
create or replace function private.parceiro_limpa_regioes(p_regioes text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct btrim(x) order by btrim(x)), '{}'::text[])
  from unnest(coalesce(p_regioes, '{}'::text[])) x
  where nullif(btrim(x), '') is not null;
$$;

create or replace function private.parceiros_normaliza()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antigas text[] := '{}';
begin
  new.nome := btrim(new.nome);
  new.whatsapp_norm := private.parceiro_norm_whatsapp(new.whatsapp);
  new.creci_norm := private.parceiro_norm_creci(new.creci);

  -- Regiões: sem repetição nem vazio, em ordem. Vale também para a edição
  -- direta do gerente (que tem grant de update nessas colunas).
  new.regioes := private.parceiro_limpa_regioes(new.regioes);
  new.regiao_outra := left(nullif(btrim(coalesce(new.regiao_outra, '')), ''), 160);
  if tg_op = 'UPDATE' then
    v_antigas := coalesce(old.regioes, '{}');
  end if;
  -- Código novo tem de existir e estar ativo; o que já estava no parceiro fica
  -- mesmo que a região tenha sido desativada depois.
  if cardinality(new.regioes) > 30 or exists (
       select 1 from unnest(new.regioes) x
       where not (x = any (v_antigas))
         and not exists (select 1 from public.parceiro_regioes r where r.codigo = x and r.ativo)) then
    raise exception 'regiao_invalida' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists parceiros_normaliza on public.parceiros;
create trigger parceiros_normaliza before insert or update on public.parceiros
  for each row execute function private.parceiros_normaliza();

-- Só a interação do gerente dono reinicia os 90 dias, de qualquer tipo
-- (inclusive envio de material e evento em lote). Editar o cadastro não.
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

-- A FILA: a ordem única da roleta. A roleta (parceiro_proximo_gerente) pega a
-- posição 1 e a fila visível (public.parceiros_fila) mostra esta mesma lista:
-- nunca escreva outra ordenação em outro lugar.
-- Ordem: gerente ativo que recebeu parceiro (pela roleta) há mais tempo. Quem
-- nunca recebeu vem primeiro; empate: o perfil mais antigo, depois o id.
-- ultimo_evento: o "atribuido" da última vez dele (nulo se nunca recebeu).
-- p_excluir: o gerente que acabou de perder o parceiro (fica fora da lista).
-- [TROCA c] para o gerente geral entrar na fila: troque p.perfil = 'gerente'.
-- [TROCA b] para o cadastro manual contar como vez: inclua 'manual' na lista de "como".
create or replace function private.parceiro_fila(p_excluir uuid default null)
returns table (posicao integer, gerente_id uuid, ultimo_evento bigint)
language sql
volatile
security definer
set search_path = ''
as $$
  select (row_number() over (order by x.ult, x.created_at, x.id))::integer, x.id, nullif(x.ult, 0)
  from (
    select p.id, p.created_at,
           coalesce((select max(e.id) from public.parceiro_eventos e
                     where e.tipo = 'atribuido' and e.para_gerente_id = p.id
                       and e.como in ('roleta', 'redistribuicao')), 0) as ult
    from public.profiles p
    where p.perfil = 'gerente' and p.ativo and p.id is distinct from p_excluir
  ) x
  order by 1;
$$;

-- O próximo da roleta = posição 1 da fila. Se o excluído for o único gerente
-- ativo, fica com ele. Sem gerente ativo, devolve nulo.
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
  select f.gerente_id into v from private.parceiro_fila(p_excluir) f where f.posicao = 1;

  if v is null and p_excluir is not null then
    select p.id into v from public.profiles p where p.id = p_excluir and p.perfil = 'gerente' and p.ativo;
  end if;
  return v;
end;
$$;

-- Dá o parceiro a um gerente (p_para) ou ao próximo da roleta (p_para nulo,
-- excluindo p_excluir), reinicia os 90 dias e grava o evento com a tag da
-- fila (p_origem). Devolve o novo gerente, ou nulo se não há gerente ativo
-- (o parceiro fica como está).
-- A versão anterior (sem p_origem) sai, para não sobrar uma sobrecarga.
drop function if exists private.parceiro_atribuir(uuid, timestamptz, text, uuid, uuid);
create or replace function private.parceiro_atribuir(
  p_parceiro uuid, p_agora timestamptz, p_como text, p_origem text,
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

  insert into public.parceiro_eventos (parceiro_id, tipo, de_gerente_id, para_gerente_id, como, origem, criado_em)
  values (p_parceiro, 'atribuido', v_de, v_para, p_como, p_origem, p_agora);

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

-- Lógica única do link, do estande e do cadastro manual. p_entrada: 'link',
-- 'estande' (recepção, public.recepcao_parceiro_entrar) ou 'manual';
-- p_autor: quem cadastra (nulo no link; na recepção, o usuário da recepção).
-- p_para e p_como: só no estande. p_como 'procurado' = o parceiro procurou
-- esse gerente (gerente ativo; não é vez na roleta); p_como 'roleta' = a
-- recepção pulou quem não está no stand e escolheu outro da fila (tem de
-- estar na fila; conta como vez e ele vai para o fim). Gerente que não
-- cumpre isso devolve o erro 'gerente_invalido' (22023).
-- p_regioes: códigos de parceiro_regioes (ativos); código desconhecido ou
-- inativo devolve o erro 'regiao_invalida' (22023). Devolve jsonb:
--   {"status": "criado"      , "parceiro_id", "gerente_id"}  parceiro novo
--   {"status": "ja_cadastrado", "parceiro_id", "dono_id", "dono_nome"}  já é de outro gerente (dono avisado)
--   {"status": "seu"         , "parceiro_id"}  já é do próprio gerente que cadastra
-- Duplicado = WhatsApp OU CRECI iguais (normalizados), entre ativos; se um
-- dos dois faltar, vale o outro. Parceiro repetido NUNCA entra na roleta,
-- exceto se o dono estiver desativado (ou sem dono): aí entra.
-- Versões anteriores saem, para não sobrar sobrecarga.
drop function if exists private.parceiro_entrar(uuid, text, text, text, text, text, text, text, uuid);
drop function if exists private.parceiro_entrar(uuid, text, text, text, text, text, text[], text, text, uuid);
create or replace function private.parceiro_entrar(
  p_id uuid, p_nome text, p_empresa text, p_whatsapp text, p_creci text,
  p_email text, p_regioes text[], p_regiao_outra text, p_entrada text, p_autor uuid,
  p_para uuid default null, p_como text default null)
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
  v_regioes text[] := private.parceiro_limpa_regioes(p_regioes);
  -- Tag da vez na roleta. [TROCA d] o cadastro manual do gerente geral (que
  -- vai para a roleta) aparece como 'estande'.
  v_origem text := case when p_entrada = 'link' then 'link' else 'estande' end;
  v_dup record;
  v_dono_ativo boolean;
  v_dono_nome text;
  v_novo uuid;
  v_gerente uuid;
  v_evento bigint;
  v_agora timestamptz := now();
begin
  if p_entrada is null or p_entrada not in ('link', 'estande', 'manual') then
    raise exception 'entrada_invalida' using errcode = '22023';
  end if;
  if v_nome = '' or (v_w is null and v_c is null) then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;
  if cardinality(v_regioes) > 30 or exists (
       select 1 from unnest(v_regioes) x
       where not exists (select 1 from public.parceiro_regioes r where r.codigo = x and r.ativo)) then
    raise exception 'regiao_invalida' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    v_email := null;
  end if;
  if (p_para is null) <> (p_como is null) or (p_para is not null and
      (p_entrada <> 'estande' or p_como not in ('procurado', 'roleta'))) then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  -- A trava vem sozinha, antes de qualquer consulta que dependa dela.
  perform pg_advisory_xact_lock(7305001);

  -- O gerente escolhido é conferido já com a trava (a fila não muda no meio).
  if p_como = 'procurado' and not exists (
       select 1 from public.profiles g where g.id = p_para and g.ativo and g.perfil = 'gerente') then
    raise exception 'gerente_invalido' using errcode = '22023';
  end if;
  if p_como = 'roleta' and not exists (
       select 1 from private.parceiro_fila(null) f where f.gerente_id = p_para) then
    raise exception 'gerente_invalido' using errcode = '22023';
  end if;

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

    -- Sem dono ou dono desativado: entra na roleta agora (nunca para o dono
    -- antigo), ou vai para o gerente escolhido na recepção.
    v_gerente := private.parceiro_atribuir(v_dup.id, v_agora, coalesce(p_como, 'roleta'), v_origem,
                                           v_dup.gerente_id, p_para);
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
  insert into public.parceiros (id, nome, empresa, whatsapp, creci, email, regioes, regiao_outra,
                                entrada, criado_por, atribuido_em)
  values (v_novo, v_nome, left(nullif(btrim(coalesce(p_empresa, '')), ''), 160),
          left(nullif(btrim(coalesce(p_whatsapp, '')), ''), 40),
          left(nullif(btrim(coalesce(p_creci, '')), ''), 40),
          v_email, v_regioes, left(nullif(btrim(coalesce(p_regiao_outra, '')), ''), 160),
          p_entrada, p_autor, v_agora)
  on conflict (id) do nothing;

  insert into public.parceiro_eventos (parceiro_id, tipo, detalhe) values (v_novo, 'cadastrado', p_entrada);

  -- [TROCA a] para o cadastro manual do gerente também ir para a roleta, apague
  -- este bloco "if" e deixe só o "else".
  if p_entrada = 'manual' and p_autor is not null
     and exists (select 1 from public.profiles g where g.id = p_autor and g.ativo and g.perfil = 'gerente') then
    v_gerente := private.parceiro_atribuir(v_novo, v_agora, 'manual', 'manual', null, p_autor);
  else
    -- p_para nulo: o próximo da roleta. Preenchido: o procurado ou o escolhido da fila.
    v_gerente := private.parceiro_atribuir(v_novo, v_agora, coalesce(p_como, 'roleta'), v_origem, null, p_para);
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
-- já é parceiro. Só dado inválido devolve erro, que não revela nada sobre
-- outros parceiros: 'dados_invalidos' (sem nome ou sem WhatsApp/CRECI válido)
-- ou 'regiao_invalida' (código fora da lista ativa), ambos 22023.
-- Limites (constantes abaixo): 3 envios por contato por hora e 300 por hora no total.
-- p_isca: campo escondido no formulário; se vier preenchido é robô e é descartado.
-- p_regioes: códigos de parceiro_regioes. O anon não lê essa tabela: a página
-- do link leva a lista pronta no próprio código (etapa 4).
drop function if exists public.parceiro_enviar(text, text, text, text, text, text, text, uuid);
create or replace function public.parceiro_enviar(
  p_nome text, p_empresa text, p_whatsapp text, p_creci text,
  p_email text, p_regioes text[] default '{}', p_regiao_outra text default null,
  p_isca text default null, p_id uuid default null)
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
  -- Antes do limite: o mesmo envio ruim dá sempre o mesmo erro.
  if cardinality(private.parceiro_limpa_regioes(p_regioes)) > 30 or exists (
       select 1 from unnest(private.parceiro_limpa_regioes(p_regioes)) x
       where not exists (select 1 from public.parceiro_regioes r where r.codigo = x and r.ativo)) then
    raise exception 'regiao_invalida' using errcode = '22023';
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

  perform private.parceiro_entrar(p_id, p_nome, p_empresa, p_whatsapp, p_creci, p_email,
                                  p_regioes, p_regiao_outra, 'link', null);
  return 'recebido';
end;
$$;

-- CADASTRO MANUAL (gerente). Devolve jsonb (veja private.parceiro_entrar):
-- status "criado", "ja_cadastrado" (com dono_nome: "já é parceiro de <nome>"; o
-- dono é avisado) ou "seu" (já é parceiro do próprio gerente).
drop function if exists public.parceiro_cadastrar(uuid, text, text, text, text, text, text);
create or replace function public.parceiro_cadastrar(
  p_id uuid, p_nome text, p_empresa text, p_whatsapp text, p_creci text, p_email text,
  p_regioes text[] default '{}', p_regiao_outra text default null)
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
  return private.parceiro_entrar(p_id, p_nome, p_empresa, p_whatsapp, p_creci, p_email,
                                 p_regioes, p_regiao_outra, 'manual', auth.uid());
end;
$$;

-- FILA DA ROLETA VISÍVEL (04/11/2026). Para quem tem parceiros.cadastrar ou
-- parceiros.ver_todos: os gerentes ativos na ordem da roleta (posição 1 = o
-- próximo da vez; a última = quem recebeu mais recentemente) e, de cada um, a
-- data e a tag da última vez recebida ('estande', 'link' ou '90_dias'; nulo se
-- nunca recebeu). NENHUM dado do parceiro sai daqui. O cadastro manual do
-- gerente não é vez e não aparece. A ordem vem de private.parceiro_fila, a
-- mesma que a roleta usa.
create or replace function public.parceiros_fila()
returns table (posicao integer, gerente_id uuid, gerente_nome text, ultima_vez_em timestamptz, ultima_origem text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or not (public.has_permission('parceiros.cadastrar') or public.has_permission('parceiros.ver_todos')) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
    select f.posicao, f.gerente_id, g.nome, e.criado_em, e.origem
    from private.parceiro_fila(null) f
    join public.profiles g on g.id = f.gerente_id
    left join public.parceiro_eventos e on e.id = f.ultimo_evento
    order by f.posicao;
end;
$$;

-- RECEPÇÃO: ENTRADA DO PARCEIRO NO ESTANDE (04/11/2026, frente Recepção).
-- Só para quem tem plantao.atendimentos (a permissão é criada pelo
-- recepcao.sql; sem ela, só o gerente geral passa). Vale só para esta entrada:
-- não dá acesso a parceiros nem a interações.
--   p_procurado: o parceiro procurou este gerente (ativo). Fica com ele e NÃO
--     conta como vez: a fila não muda.
--   p_escolhido: a recepção pulou o gerente da vez (não está no stand) e
--     escolheu outro DA FILA. Conta como vez ('roleta'): o escolhido vai para o
--     fim e o pulado continua em 1º (a ordem é por última vez recebida).
--   os dois nulos: o próximo da roleta. Os dois preenchidos: 'dados_invalidos'.
-- Duplicado: não entra, o dono é avisado (como no link). Devolve só:
--   {"status": "criado" | "ja_cadastrado", "parceiro_id", "gerente_nome"}
-- gerente_nome é quem ficou com o parceiro, ou o dono ("já é parceiro de
-- <gerente>"); nulo se não há gerente ativo. O nome do gerente já é público
-- dentro do app (está na fila); nada de outro parceiro sai daqui. O
-- parceiro_id é o do próprio parceiro digitado, para ligar o atendimento a ele.
create or replace function public.recepcao_parceiro_entrar(
  p_id uuid, p_nome text, p_empresa text, p_whatsapp text, p_creci text, p_email text,
  p_regioes text[] default '{}', p_regiao_outra text default null,
  p_procurado uuid default null, p_escolhido uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  j jsonb;
  v_parceiro uuid;
  v_gerente uuid;
begin
  if v_eu is null or not public.has_permission('plantao.atendimentos') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if p_procurado is not null and p_escolhido is not null then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  j := private.parceiro_entrar(p_id, p_nome, p_empresa, p_whatsapp, p_creci, p_email,
                               p_regioes, p_regiao_outra, 'estande', v_eu,
                               coalesce(p_procurado, p_escolhido),
                               case when p_procurado is not null then 'procurado'
                                    when p_escolhido is not null then 'roleta' end);
  v_parceiro := (j ->> 'parceiro_id')::uuid;

  if j ->> 'status' = 'criado' then
    v_gerente := (j ->> 'gerente_id')::uuid;
    if v_gerente is null then
      -- Reenvio do mesmo id: só devolve o gerente se foi esta pessoa que cadastrou.
      select p.gerente_id into v_gerente from public.parceiros p
      where p.id = v_parceiro and p.criado_por = v_eu and p.entrada = 'estande';
    end if;
    return jsonb_build_object('status', 'criado', 'parceiro_id', v_parceiro,
                              'gerente_nome', (select g.nome from public.profiles g where g.id = v_gerente));
  end if;

  -- 'ja_cadastrado' (ou 'seu', se quem está na recepção é o próprio dono).
  v_gerente := coalesce((j ->> 'dono_id')::uuid,
                        case when j ->> 'status' = 'seu' then v_eu end);
  return jsonb_build_object('status', 'ja_cadastrado', 'parceiro_id', v_parceiro,
                            'gerente_nome', (select g.nome from public.profiles g where g.id = v_gerente));
end;
$$;

-- RECEPÇÃO: A FILA DOS GERENTES para escolher no estande. Só a posição e o
-- gerente (o id é o que vai em p_escolhido ou p_procurado), na mesma ordem
-- de private.parceiro_fila. Nenhum dado de parceiro.
create or replace function public.recepcao_fila_parceiros()
returns table (posicao integer, gerente_id uuid, gerente_nome text)
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
    select f.posicao, f.gerente_id, g.nome
    from private.parceiro_fila(null) f
    join public.profiles g on g.id = f.gerente_id
    order by f.posicao;
end;
$$;

-- EVENTO EM LOTE (04/11/2026). O gerente registra um evento (café, lançamento,
-- treinamento) e os parceiros presentes; cada parceiro ATIVO e DELE ganha uma
-- interação 'evento', que reinicia os 90 dias como as outras. Os outros ids
-- (de outro gerente, inativos ou que não existem) são ignorados em silêncio:
-- a resposta é só {"registrados": n}, igual para todos os casos.
-- Idempotente: o id de cada interação é md5(lote:parceiro), então reenviar o
-- mesmo lote não duplica e devolve o mesmo número.
-- p_data: o dia do evento, de hoje até 30 dias atrás (São Paulo). O prazo conta
-- do registro (criado_em = agora), nunca de uma data escolhida no aparelho.
create or replace function public.parceiro_evento_lote(
  p_lote uuid, p_resumo text, p_data date, p_parceiros uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  v_resumo text := btrim(coalesce(p_resumo, ''));
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_n integer;
begin
  if v_eu is null or not public.has_permission('parceiros.cadastrar') then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if p_lote is null or length(v_resumo) not between 1 and 2000
     or p_data is null or p_data > v_hoje or p_data < v_hoje - 30
     or coalesce(cardinality(p_parceiros), 0) not between 1 and 500 then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo, data_evento, criado_por)
  select md5(p_lote::text || ':' || p.id::text)::uuid, p.id, 'evento', v_resumo, p_data, v_eu
  from public.parceiros p
  where p.id = any (p_parceiros) and p.gerente_id = v_eu and p.ativo
  on conflict (id) do nothing;

  select count(*) into v_n
  from public.parceiro_interacoes i
  where i.id in (select md5(p_lote::text || ':' || x::text)::uuid from unnest(p_parceiros) x)
    and i.criado_por = v_eu and i.tipo = 'evento';
  return jsonb_build_object('registrados', v_n);
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

    -- [TROCA d] também a troca por gerente desativado sai com a tag '90_dias'.
    perform private.parceiro_atribuir(v_p.id, p_agora, 'redistribuicao', '90_dias', v_p.gerente_id, v_para);
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
-- 9. Leitura para a ficha e a lista
-- ---------------------------------------------------------------------

-- LINHA DO TEMPO DA FICHA (proposta 6): as interações e o histórico automático
-- juntos, do mais recente ao mais antigo, com o texto pronto e o nome dos
-- gerentes envolvidos. A RLS de parceiro_eventos já deixa o dono e quem tem
-- ver_todos lerem as linhas cruas, mas a de profiles esconde o nome de outro
-- gerente (o dono anterior, por exemplo). Por isso esta função é security
-- definer e repete EXATAMENTE a regra da policy "ver parceiros": parceiro que
-- a pessoa não vê devolve zero linhas, igual a um id que não existe.
-- fonte: 'interacao' (tipo = o tipo da interação) ou 'historico' (tipo = o de
-- parceiro_eventos). O aviso dos 80 dias não entra (os avisos são apagados 30
-- dias depois de enviados).
create or replace function public.parceiro_linha_do_tempo(p_parceiro uuid)
returns table (quando timestamptz, fonte text, tipo text, titulo text, resumo text,
               data_evento date, proximo_contato date,
               autor_nome text, de_gerente_nome text, para_gerente_nome text)
language sql
stable
security definer
set search_path = ''
as $$
  with visivel as (
    select p.id from public.parceiros p
    where p.id = p_parceiro and auth.uid() is not null
      and (public.has_permission('parceiros.ver_todos')
           or (p.gerente_id = auth.uid() and public.has_permission('parceiros.cadastrar')))
  )
  select t.quando, t.fonte, t.tipo, t.titulo, t.resumo, t.data_evento, t.proximo_contato,
         t.autor_nome, t.de_nome, t.para_nome
  from (
    select i.criado_em as quando, 'interacao'::text as fonte, i.tipo,
           case i.tipo when 'ligacao' then 'Ligação' when 'whatsapp' then 'WhatsApp'
                       when 'reuniao' then 'Reunião' when 'visita' then 'Visita'
                       when 'envio_material' then 'Envio de material' when 'evento' then 'Evento'
                       else i.tipo end as titulo,
           i.resumo, i.data_evento, i.proximo_contato,
           a.nome as autor_nome, null::text as de_nome, null::text as para_nome,
           0 as ordem_fonte, 0::bigint as ordem_id
    from visivel v
    join public.parceiro_interacoes i on i.parceiro_id = v.id
    left join public.profiles a on a.id = i.criado_por
    union all
    select e.criado_em, 'historico', e.tipo,
           case e.tipo
             when 'cadastrado' then case e.detalhe when 'link' then 'Cadastrou-se pelo link'
                                                   when 'estande' then 'Cadastrado no estande'
                                                   else 'Cadastrado à mão' end
             when 'atribuido' then case e.como when 'manual' then 'Ficou com quem cadastrou'
                                               when 'procurado' then 'Procurou o gerente no estande'
                                               when 'redistribuicao' then 'Mudou de gerente'
                                               else 'Recebido pela roleta' end
             when 'reentrada_aviso' then case e.detalhe when 'manual' then 'Outro gerente tentou cadastrar'
                                                        else 'Procurou a empresa de novo' end
             when 'perdido_90_dias' then 'Saiu do gerente por 90 dias sem interação'
             when 'sem_gerente' then 'Gerente desativado: foi para outro gerente'
             else e.tipo end,
           case e.tipo
             when 'atribuido' then case e.origem when 'link' then 'Pelo link' when 'estande' then 'Pelo estande'
                                                 when '90_dias' then 'Troca de gerente' end
             when 'reentrada_aviso' then case e.detalhe when 'link' then 'Pelo link' when 'estande' then 'Pelo estande' end
             when 'perdido_90_dias' then upper(left(e.detalhe, 1)) || substr(e.detalhe, 2)
           end,
           null::date, null::date,
           null::text, d.nome, pa.nome,
           1, e.id
    from visivel v
    join public.parceiro_eventos e on e.parceiro_id = v.id
    left join public.profiles d on d.id = e.de_gerente_id
    left join public.profiles pa on pa.id = e.para_gerente_id
  ) t
  order by t.quando desc, t.ordem_fonte desc, t.ordem_id desc;
$$;

-- SITUAÇÃO DE CADA PARCEIRO VISÍVEL (proposta 1): estágio calculado e prazo.
-- security_invoker: quem consulta só vê as linhas que a RLS de parceiros e de
-- parceiro_interacoes já deixa ver.
--   estagio: 'novo' (nenhuma interação), 'apresentado' (teve reunião, visita
--     ou evento), 'contatado' (só ligação, WhatsApp ou envio de material,
--     [TROCA e]). Conta as interações de qualquer gerente: o estágio é da
--     relação do parceiro com a empresa, não só com o dono atual.
--     'indicou' e 'vendeu' ainda não saem daqui: dependem da etapa 5 (origem
--     "Parceiro" no lead). Até lá indicados e vendidos ficam nulos.
--   dias_prazo: dias inteiros desde prazo_desde (a mesma conta da rotina dos 90
--     dias); faixa: 'ok' de 0 a 30, 'atencao' de 31 a 60, 'risco' de 61 em
--     diante (passou de 90 e o job ainda não rodou: continua 'risco').
--   proximo_contato: o da última interação do dono atual desde que o recebeu.
create or replace view public.parceiros_situacao with (security_invoker = true) as
select p.id as parceiro_id,
       p.gerente_id,
       p.ativo,
       case
         when not exists (select 1 from public.parceiro_interacoes i where i.parceiro_id = p.id) then 'novo'
         when exists (select 1 from public.parceiro_interacoes i
                      where i.parceiro_id = p.id and i.tipo in ('reuniao', 'visita', 'evento')) then 'apresentado'
         else 'contatado'
       end as estagio,
       null::integer as indicados,  -- etapa 5
       null::integer as vendidos,   -- etapa 5
       p.prazo_desde,
       d.dias as dias_prazo,
       greatest(0, 90 - d.dias) as dias_restantes,
       case when d.dias <= 30 then 'ok' when d.dias <= 60 then 'atencao' else 'risco' end as faixa,
       u.proximo_contato
from public.parceiros p
cross join lateral (
  select greatest(0, floor(extract(epoch from (now() - p.prazo_desde)) / 86400))::integer as dias
) d
left join lateral (
  select i.proximo_contato from public.parceiro_interacoes i
  where i.parceiro_id = p.id and i.criado_por = p.gerente_id and i.criado_em >= p.atribuido_em
  order by i.criado_em desc, i.id desc limit 1
) u on true;

-- ---------------------------------------------------------------------
-- 10. Segurança: RLS, grants e revokes
-- ---------------------------------------------------------------------

alter table public.parceiros enable row level security;
alter table public.parceiro_interacoes enable row level security;
alter table public.parceiro_eventos enable row level security;
alter table public.parceiro_avisos enable row level security;
alter table public.parceiro_link_tentativas enable row level security;
alter table public.parceiro_regioes enable row level security;

-- No Supabase, tabela nova em public já nasce com permissão para anon e
-- authenticated: tira tudo e devolve só o necessário.
revoke all on public.parceiros, public.parceiro_interacoes, public.parceiro_eventos,
  public.parceiro_avisos, public.parceiro_link_tentativas, public.parceiro_regioes,
  public.parceiros_situacao from public, anon, authenticated;
revoke all on sequence public.parceiro_eventos_id_seq, public.parceiro_avisos_id_seq,
  public.parceiro_link_tentativas_id_seq from public, anon, authenticated;

grant select on public.parceiros, public.parceiro_interacoes, public.parceiro_eventos,
  public.parceiro_regioes, public.parceiros_situacao to authenticated;
-- O gerente edita só o cadastro (e pode arquivar). Quem é o dono, a atribuição
-- e os 90 dias só mudam pelas funções. Cadastrar é pela função parceiro_cadastrar.
-- As regiões passam pelo gatilho parceiros_normaliza (código tem de existir).
grant update (nome, empresa, whatsapp, creci, email, regioes, regiao_outra, ativo) on public.parceiros to authenticated;
grant insert (id, parceiro_id, tipo, resumo, proximo_contato) on public.parceiro_interacoes to authenticated;

-- Regiões: catálogo, qualquer usuário logado lê. Ninguém grava pelo app.
drop policy if exists "ler regioes de parceiros" on public.parceiro_regioes;
create policy "ler regioes de parceiros" on public.parceiro_regioes
  for select to authenticated using (true);

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
  -- Nada executável por anon nem pelo público, exceto o que tem grant abaixo.
  foreach f in array array[
    'private.parceiro_norm_whatsapp(text)', 'private.parceiro_norm_creci(text)',
    'private.parceiro_limpa_regioes(text[])',
    'private.parceiros_normaliza()', 'private.parceiro_interacao_carimba()',
    'private.parceiro_fila(uuid)', 'private.parceiro_proximo_gerente(uuid)',
    'private.parceiro_atribuir(uuid, timestamptz, text, text, uuid, uuid)',
    'private.parceiro_aviso(uuid, uuid, text, text)',
    'private.parceiro_entrar(uuid, text, text, text, text, text, text[], text, text, uuid, uuid, text)',
    'private.parceiros_redistribuir(timestamptz)', 'private.parceiros_gerar_avisos(timestamptz)',
    'private.parceiros_rotina(timestamptz)',
    'public.parceiros_avisos_pendentes()', 'public.parceiros_avisos_marcar(bigint[])',
    'public.parceiro_enviar(text, text, text, text, text, text[], text, text, uuid)',
    'public.parceiro_cadastrar(uuid, text, text, text, text, text, text[], text)',
    'public.parceiros_fila()',
    'public.parceiro_evento_lote(uuid, text, date, uuid[])',
    'public.parceiro_linha_do_tempo(uuid)',
    'public.recepcao_parceiro_entrar(uuid, text, text, text, text, text, text[], text, uuid, uuid)',
    'public.recepcao_fila_parceiros()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;

-- O link público: anon (e authenticated) executa SÓ esta função.
grant execute on function public.parceiro_enviar(text, text, text, text, text, text[], text, text, uuid) to anon, authenticated;
-- Só quem está logado; cada função confere a permissão dela.
grant execute on function public.parceiro_cadastrar(uuid, text, text, text, text, text, text[], text) to authenticated;
grant execute on function public.parceiros_fila() to authenticated;
grant execute on function public.parceiro_evento_lote(uuid, text, date, uuid[]) to authenticated;
grant execute on function public.parceiro_linha_do_tempo(uuid) to authenticated;
grant execute on function public.recepcao_parceiro_entrar(uuid, text, text, text, text, text, text[], text, uuid, uuid) to authenticated;
grant execute on function public.recepcao_fila_parceiros() to authenticated;
