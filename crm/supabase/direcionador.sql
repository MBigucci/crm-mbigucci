-- =====================================================================
-- Base360 Marketing — direcionador de leads (etapa 1: banco)
-- Brief: docs/codex-direcionador.md. Estudo: docs/direcionador/direcionador.md.
-- Rode DEPOIS do schema.sql (usa is_gerente_geral, set_updated_at e
-- empreendimentos) e do SQL da distribuição automática do Vendas.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo: é idempotente e não desfaz o que o gerente geral ajustou.
-- Testes: supabase/testes/direcionador.test.mjs.
--
-- Sumário
--   1. Esquema interno (fora de "Exposed schemas")
--   2. Tabelas: chave geral, destinos, fontes, regras, partes e contadores
--   3. Seed: só a linha do Base360 Vendas e a chave geral desligada
--   4. Base de contatos mínima do Marketing (registro dos envios a parceiros)
--   5. Funções auxiliares (máscara do endereço, acesso)
--   6. Funções da tela (só o gerente geral)
--   7. Funções da Edge Function entrada-leads (só service_role)
--   8. Segurança: RLS, grants e revokes
--
-- SIGILO
--   - Nenhum nome de destino externo é escrito aqui. Os nomes são dados que o
--     gerente geral digita na tela. O seed cria só o Base360 Vendas.
--   - As tabelas ficam no esquema "interno", que o PostgREST não publica. A
--     tela usa só as funções cfg_* do esquema public, com nomes e parâmetros
--     neutros (eles aparecem na lista da API).
--   - Endereços (e-mail, URL e chave da porta) ficam só no Vault, um segredo
--     por destino, com nome neutro (cfg_end_<id>). A tela recebe só a versão
--     mascarada; o valor inteiro só sai para a service_role.
--   - Os contadores guardam só números. Nenhuma tabela daqui guarda dado de
--     cliente, exceto mkt_contatos, que só recebe os envios a destinos com
--     "Registrar os envios" ligado.
--
-- DECISÕES QUE O BRIEF NÃO FECHA (a sessão principal confirma):
--   a) A escolha (cfg_escolher) soma 1 ao contador da regra e ao total do dia
--      do destino na hora em que escolhe. Se a entrega falhar, a Edge Function
--      chama cfg_desfazer, que tira esse 1 dos dois, e o lead vai para o
--      Vendas (que então não ganha contador: a falha não é parte da divisão).
--   b) Destino acima do limite do dia: o lead vai para o Vendas e NADA é
--      somado (nem ao destino nem ao Vendas), para a divisão não "dever"
--      leads ao destino no dia seguinte.
--   c) O total do dia é guardado para todo destino, inclusive o Vendas (só um
--      número), mas o limite só vale para destino externo.
--   d) Parte de regra com destino desligado é pulada na divisão; sem nenhuma
--      parte ligada, o lead vai para o Vendas.
--   e) O contador zera quando a regra é salva (cfg_regra_salvar). Ligar,
--      desligar e mudar a ordem não zeram.
--   f) lead_fontes nasce com as fontes conhecidas (site e portais), sem os
--      padrões de reconhecimento: eles entram quando os e-mails de exemplo do
--      Felipe chegarem (etapa 2). Rodar de novo não sobrescreve o que mudou.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Esquema interno
-- ---------------------------------------------------------------------
-- Ninguém além do dono (e das funções security definer) entra neste esquema.
-- Não acrescente "interno" em Settings > API > Exposed schemas.
create schema if not exists interno;
revoke all on schema interno from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------

-- A chave geral: uma linha só.
create table if not exists interno.direcionador_config (
  id              boolean primary key default true check (id),
  ativo           boolean not null default false,
  atualizado_por  uuid references public.profiles (id) on delete set null,
  updated_at      timestamptz not null default now()
);

-- Destinos: o Base360 Vendas (uma linha, tipo vendas) e os externos que o
-- gerente geral cadastra. Os endereços NÃO ficam aqui (estão no Vault).
create table if not exists interno.direcionador_destinos (
  id                uuid primary key default gen_random_uuid(),
  tipo              text not null check (tipo in ('vendas', 'externo')),
  nome              text not null check (length(btrim(nome)) between 1 and 80),
  modo              text check (modo in ('email', 'porta')),
  registrar_envios  boolean not null default false,
  limite_dia        integer check (limite_dia is null or limite_dia > 0),
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint direcionador_destinos_por_tipo check (
    (tipo = 'vendas' and modo is null and limite_dia is null and not registrar_envios)
    or (tipo = 'externo' and modo is not null)
  )
);

create unique index if not exists direcionador_destinos_um_vendas
  on interno.direcionador_destinos (tipo) where tipo = 'vendas';
create unique index if not exists direcionador_destinos_nome_unico
  on interno.direcionador_destinos (lower(btrim(nome)));

-- O Base360 Vendas não se apaga, não muda de tipo e fica sempre ligado.
create or replace function interno.direcionador_destinos_guarda()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.tipo = 'vendas' then
      raise exception 'O Base360 Vendas não pode ser excluído.';
    end if;
    return old;
  end if;
  if old.tipo = 'vendas' then
    new.tipo := 'vendas';
    new.ativo := true;
  elsif new.tipo = 'vendas' then
    raise exception 'Só existe um Base360 Vendas.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists direcionador_destinos_guarda on interno.direcionador_destinos;
create trigger direcionador_destinos_guarda before update or delete on interno.direcionador_destinos
  for each row execute function interno.direcionador_destinos_guarda();

-- Catálogo das fontes e como reconhecê-las no e-mail (remetente e assunto).
-- O leitor (marketing/src/lib/leitor-email.ts) usa estes padrões.
create table if not exists interno.lead_fontes (
  slug            text primary key check (slug ~ '^[a-z0-9_]+$'),
  nome            text not null check (length(btrim(nome)) between 1 and 60),
  remetentes      text[] not null default '{}',
  assunto_contem  text[] not null default '{}',
  ordem           integer not null default 0,
  ativa           boolean not null default true
);

-- Regras. Vazio em produtos ou fontes = qualquer. dias: 0 = domingo … 6.
-- hora_inicio = hora_fim: o dia inteiro. Fim exclusivo. Início maior que o fim
-- vira a meia-noite (vale até a hora de fim do dia seguinte).
create table if not exists interno.direcionador_regras (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (length(btrim(nome)) between 1 and 80),
  ativa        boolean not null default true,
  ordem        integer not null default 0,
  produtos     uuid[] not null default '{}',
  fontes       text[] not null default '{}',
  dias         smallint[] not null default '{0,1,2,3,4,5,6}'
               check (cardinality(dias) between 1 and 7 and dias <@ '{0,1,2,3,4,5,6}'::smallint[]),
  hora_inicio  time not null default '00:00',
  hora_fim     time not null default '00:00',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists direcionador_regras_ordem on interno.direcionador_regras (ordem);

drop trigger if exists direcionador_regras_updated_at on interno.direcionador_regras;
create trigger direcionador_regras_updated_at before update on interno.direcionador_regras
  for each row execute function public.set_updated_at();

-- "Mandar para": as partes da regra. A soma de 100% é conferida em
-- cfg_regra_salvar, que troca as partes de uma vez.
create table if not exists interno.direcionador_regra_partes (
  regra_id     uuid not null references interno.direcionador_regras (id) on delete cascade,
  destino_id   uuid not null references interno.direcionador_destinos (id) on delete restrict,
  porcentagem  integer not null check (porcentagem between 1 and 100),
  ordem        integer not null default 0,
  primary key (regra_id, destino_id)
);

create index if not exists direcionador_regra_partes_destino on interno.direcionador_regra_partes (destino_id);

-- Só números: quantos leads cada regra mandou a cada destino desde que foi salva.
create table if not exists interno.direcionador_contadores (
  regra_id    uuid not null references interno.direcionador_regras (id) on delete cascade,
  destino_id  uuid not null references interno.direcionador_destinos (id) on delete cascade,
  enviados    integer not null default 0 check (enviados >= 0),
  primary key (regra_id, destino_id)
);

-- Só números: quantos leads cada destino recebeu no dia (de São Paulo).
create table if not exists interno.direcionador_contagem_dia (
  destino_id  uuid not null references interno.direcionador_destinos (id) on delete cascade,
  dia         date not null,
  total       integer not null default 0 check (total >= 0),
  primary key (destino_id, dia)
);

-- ---------------------------------------------------------------------
-- 3. Seed
-- ---------------------------------------------------------------------
insert into interno.direcionador_config (id, ativo) values (true, false)
on conflict (id) do nothing;

insert into interno.direcionador_destinos (tipo, nome)
select 'vendas', 'Base360 Vendas'
where not exists (select 1 from interno.direcionador_destinos where tipo = 'vendas');

-- As fontes conhecidas (site e portais). Padrões vazios até os e-mails de
-- exemplo chegarem. Não sobrescreve o que já estiver lá.
insert into interno.lead_fontes (slug, nome, ordem) values
  ('site',        'Site MBigucci', 1),
  ('zap',         'ZAP Imóveis',   2),
  ('vivareal',    'Viva Real',     3),
  ('olx',         'OLX',           4),
  ('imovelweb',   'Imovelweb',     5),
  ('chavesnamao', 'Chaves na Mão', 6)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 4. Base de contatos mínima do Marketing
-- ---------------------------------------------------------------------
-- Só recebe o lead enviado a um destino com "Registrar os envios" ligado
-- (parceiros). Destino com a chave desligada não deixa nada aqui.
-- A tela de contatos é da etapa 2 do roteiro do Marketing.
create table if not exists public.mkt_contatos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null default '',
  telefone    text check (telefone is null or telefone ~ '^[0-9]{8,15}$'),
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists mkt_contatos_telefone_unico on public.mkt_contatos (telefone) where telefone is not null;
create index if not exists mkt_contatos_email on public.mkt_contatos (lower(email)) where email is not null;

drop trigger if exists mkt_contatos_updated_at on public.mkt_contatos;
create trigger mkt_contatos_updated_at before update on public.mkt_contatos
  for each row execute function public.set_updated_at();

-- parceiro_id é o id de um destino de interno.direcionador_destinos (só
-- destinos com registro ligado). De propósito SEM chave estrangeira: uma
-- tabela do esquema exposto não pode apontar para o esquema interno, porque a
-- descrição da API mostraria o nome da tabela de destino. cfg_item_excluir
-- limpa o id. entrada_id é o id da mensagem de origem: a mesma entrada lida
-- duas vezes não gera dois eventos.
create table if not exists public.mkt_contato_eventos (
  id           uuid primary key default gen_random_uuid(),
  contato_id   uuid not null references public.mkt_contatos (id) on delete cascade,
  tipo         text not null check (tipo in ('enviado_parceiro')),
  parceiro_id  uuid,
  produto_id   uuid references public.empreendimentos (id) on delete set null,
  fonte        text,
  quando       timestamptz not null,
  entrada_id   text,
  created_at   timestamptz not null default now()
);

alter table public.mkt_contato_eventos drop constraint if exists mkt_contato_eventos_parceiro_id_fkey;

create index if not exists mkt_contato_eventos_contato on public.mkt_contato_eventos (contato_id, quando desc);
create unique index if not exists mkt_contato_eventos_entrada on public.mkt_contato_eventos (tipo, entrada_id)
  where entrada_id is not null;

-- ---------------------------------------------------------------------
-- 5. Funções auxiliares (no esquema interno, fora da API)
-- ---------------------------------------------------------------------

-- Só o gerente geral, por regra fixa no banco (nunca pelo catálogo).
create or replace function interno.cfg_exigir()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not coalesce(public.is_gerente_geral(), false) then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;
end;
$$;

-- Nome neutro do segredo no Vault, um por destino.
create or replace function interno.cfg_segredo_nome(p_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$ select 'cfg_end_' || replace(p_id::text, '-', '') $$;

-- Domínio mascarado: "exemplo.com.br" vira "e••••.com.br". Fica só o
-- primeiro caractere e o fim (.com, .com.br).
create or replace function interno.cfg_mascarar_dominio(p_dominio text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  partes text[] := string_to_array(lower(coalesce(p_dominio, '')), '.');
  n integer := coalesce(array_length(partes, 1), 0);
  fim text;
begin
  if n < 2 then
    return left(coalesce(p_dominio, ''), 1) || '••••';
  end if;
  if n >= 3 and length(partes[n]) = 2 then
    fim := partes[n - 1] || '.' || partes[n];
  else
    fim := partes[n];
  end if;
  return left(partes[1], 1) || '••••.' || fim;
end;
$$;

-- O endereço mascarado, a partir do segredo guardado. Nunca devolve o valor
-- inteiro, nem para endereço curto, e nunca devolve a chave da porta.
create or replace function interno.cfg_mascarar(p_valor jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_email text := p_valor ->> 'email';
  v_url text := p_valor ->> 'url';
  v_host text;
  v_resto text;
begin
  if p_valor is null then
    return null;
  end if;
  if v_email is not null then
    return jsonb_build_object('email',
      left(split_part(v_email, '@', 1), 1) || '••••@' || interno.cfg_mascarar_dominio(split_part(v_email, '@', 2)));
  end if;
  if v_url is not null then
    v_host := split_part(regexp_replace(v_url, '^[a-zA-Z]+://', ''), '/', 1);
    v_resto := substr(regexp_replace(v_url, '^[a-zA-Z]+://', ''), length(v_host) + 1);
    return jsonb_build_object(
      'url', 'https://' || interno.cfg_mascarar_dominio(split_part(v_host, ':', 1))
             || case when length(v_resto) > 1 then '/••••' else '' end,
      'chave_definida', coalesce(length(p_valor ->> 'chave'), 0) > 0);
  end if;
  return null;
end;
$$;

-- Lê o segredo do destino no Vault (valor inteiro). Só para as funções daqui.
create or replace function interno.cfg_segredo_ler(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v text;
begin
  select s.decrypted_secret into v from vault.decrypted_secrets s where s.name = interno.cfg_segredo_nome(p_id);
  return case when v is null then null else v::jsonb end;
end;
$$;

create or replace function interno.cfg_segredo_apagar(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where name = interno.cfg_segredo_nome(p_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Funções da tela (só o gerente geral)
-- ---------------------------------------------------------------------
-- Leitura: quem não é o gerente geral recebe zero linhas, sem erro.
-- Gravação: quem não é o gerente geral recebe erro 42501.

-- Tudo o que a tela mostra: chave geral, destinos (endereço mascarado e total
-- de hoje), regras com as partes e os contadores, e as fontes.
create or replace function public.cfg_ler()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not coalesce(public.is_gerente_geral(), false) then
    return;
  end if;
  return next jsonb_build_object(
    'ativo', (select c.ativo from interno.direcionador_config c),
    'hoje', v_hoje,
    'destinos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'tipo', d.tipo, 'nome', d.nome, 'modo', d.modo,
               'registrar_envios', d.registrar_envios, 'limite_dia', d.limite_dia, 'ativo', d.ativo,
               'hoje', coalesce((select x.total from interno.direcionador_contagem_dia x
                                 where x.destino_id = d.id and x.dia = v_hoje), 0),
               'endereco', case when d.tipo = 'externo' then interno.cfg_mascarar(interno.cfg_segredo_ler(d.id)) end)
             order by (d.tipo = 'vendas') desc, lower(d.nome))
      from interno.direcionador_destinos d), '[]'::jsonb),
    'regras', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'nome', r.nome, 'ativa', r.ativa, 'ordem', r.ordem,
               'produtos', to_jsonb(r.produtos), 'fontes', to_jsonb(r.fontes), 'dias', to_jsonb(r.dias),
               'hora_inicio', to_char(r.hora_inicio, 'HH24:MI'), 'hora_fim', to_char(r.hora_fim, 'HH24:MI'),
               'partes', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'destino_id', p.destino_id, 'porcentagem', p.porcentagem,
                          'enviados', coalesce(k.enviados, 0)) order by p.ordem)
                 from interno.direcionador_regra_partes p
                 left join interno.direcionador_contadores k on k.regra_id = p.regra_id and k.destino_id = p.destino_id
                 where p.regra_id = r.id), '[]'::jsonb))
             order by r.ordem, r.created_at)
      from interno.direcionador_regras r), '[]'::jsonb),
    'fontes', coalesce((
      select jsonb_agg(jsonb_build_object('slug', f.slug, 'nome', f.nome, 'ativa', f.ativa) order by f.ordem, f.nome)
      from interno.lead_fontes f), '[]'::jsonb)
  );
end;
$$;

-- A chave geral.
create or replace function public.cfg_salvar(p_ativo boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform interno.cfg_exigir();
  update interno.direcionador_config
     set ativo = coalesce(p_ativo, false), atualizado_por = auth.uid(), updated_at = now()
   where id;
  return coalesce(p_ativo, false);
end;
$$;

-- Cria ou edita um destino externo. p: {id?, nome, modo, registrar_envios,
-- limite_dia, ativo}. O Base360 Vendas não se edita por aqui.
-- Trocar o modo apaga o endereço guardado (ele precisa ser digitado de novo).
create or replace function public.cfg_item_salvar(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_nome text := btrim(coalesce(p ->> 'nome', ''));
  v_modo text := coalesce(p ->> 'modo', 'email');
  v_limite integer := nullif(p ->> 'limite_dia', '')::integer;
  v_antes interno.direcionador_destinos;
begin
  perform interno.cfg_exigir();
  if v_nome = '' then
    raise exception 'Digite o nome.' using errcode = '22023';
  end if;
  if v_modo not in ('email', 'porta') then
    raise exception 'Escolha a entrega: e-mail ou porta de entrada.' using errcode = '22023';
  end if;
  if v_limite is not null and v_limite <= 0 then
    raise exception 'O limite por dia precisa ser maior que zero.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into interno.direcionador_destinos (tipo, nome, modo, registrar_envios, limite_dia, ativo)
    values ('externo', v_nome, v_modo, coalesce((p ->> 'registrar_envios')::boolean, false), v_limite,
            coalesce((p ->> 'ativo')::boolean, true))
    returning id into v_id;
    return v_id;
  end if;

  select * into v_antes from interno.direcionador_destinos where id = v_id for update;
  if not found then
    raise exception 'Não encontrado.' using errcode = 'P0002';
  end if;
  if v_antes.tipo = 'vendas' then
    raise exception 'O Base360 Vendas não se edita.' using errcode = '22023';
  end if;
  update interno.direcionador_destinos
     set nome = v_nome, modo = v_modo,
         registrar_envios = coalesce((p ->> 'registrar_envios')::boolean, registrar_envios),
         limite_dia = v_limite,
         ativo = coalesce((p ->> 'ativo')::boolean, ativo)
   where id = v_id;
  if v_antes.modo is distinct from v_modo then
    perform interno.cfg_segredo_apagar(v_id);
  end if;
  return v_id;
end;
$$;

-- Exclui um destino externo que não está em nenhuma regra, com o endereço.
create or replace function public.cfg_item_excluir(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo text;
begin
  perform interno.cfg_exigir();
  select tipo into v_tipo from interno.direcionador_destinos where id = p_id for update;
  if not found then
    return;
  end if;
  if v_tipo = 'vendas' then
    raise exception 'O Base360 Vendas não pode ser excluído.' using errcode = '22023';
  end if;
  if exists (select 1 from interno.direcionador_regra_partes where destino_id = p_id) then
    raise exception 'Tire este destino das regras antes de excluir.' using errcode = '23503';
  end if;
  perform interno.cfg_segredo_apagar(p_id);
  update public.mkt_contato_eventos set parceiro_id = null where parceiro_id = p_id;
  delete from interno.direcionador_destinos where id = p_id;
end;
$$;

-- Grava o endereço de um destino externo no Vault e devolve a versão
-- mascarada. Modo e-mail: {"email": "..."}. Modo porta: {"url": "https://...",
-- "chave": "..."}; sem "chave", mantém a que já estava guardada.
create or replace function public.cfg_item_endereco_salvar(p_id uuid, p_valor jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_modo text;
  v_novo jsonb;
  v_antes jsonb;
  v_email text := lower(btrim(coalesce(p_valor ->> 'email', '')));
  v_url text := btrim(coalesce(p_valor ->> 'url', ''));
  v_chave text := btrim(coalesce(p_valor ->> 'chave', ''));
  v_segredo uuid;
begin
  perform interno.cfg_exigir();
  select modo into v_modo from interno.direcionador_destinos where id = p_id and tipo = 'externo';
  if not found then
    raise exception 'Não encontrado.' using errcode = 'P0002';
  end if;

  if v_modo = 'email' then
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Digite um e-mail válido.' using errcode = '22023';
    end if;
    v_novo := jsonb_build_object('email', v_email);
  else
    if v_url !~ '^https://[^/\s]+\.[^/\s]+(/\S*)?$' then
      raise exception 'Digite um endereço que comece com https://.' using errcode = '22023';
    end if;
    if v_chave = '' then
      v_antes := interno.cfg_segredo_ler(p_id);
      v_chave := coalesce(v_antes ->> 'chave', '');
    end if;
    if length(v_chave) < 16 then
      raise exception 'Digite a chave da porta de entrada (16 caracteres ou mais).' using errcode = '22023';
    end if;
    v_novo := jsonb_build_object('url', v_url, 'chave', v_chave);
  end if;

  select id into v_segredo from vault.secrets where name = interno.cfg_segredo_nome(p_id);
  if v_segredo is null then
    perform vault.create_secret(v_novo::text, interno.cfg_segredo_nome(p_id), 'cfg');
  else
    perform vault.update_secret(v_segredo, v_novo::text);
  end if;
  return interno.cfg_mascarar(v_novo);
end;
$$;

-- O endereço mascarado de um destino. Zero linhas para quem não é o gerente
-- geral ou quando não há endereço.
create or replace function public.cfg_item_endereco(p_id uuid)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not coalesce(public.is_gerente_geral(), false) then
    return;
  end if;
  v := interno.cfg_mascarar(interno.cfg_segredo_ler(p_id));
  if v is not null then
    return next v;
  end if;
end;
$$;

-- Cria ou edita uma regra e troca as partes de uma vez. Zera os contadores
-- da regra (decisão e). p: {id?, nome, ativa, produtos, fontes, dias,
-- hora_inicio, hora_fim, partes: [{destino_id, porcentagem}]}.
create or replace function public.cfg_regra_salvar(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_partes jsonb := coalesce(p -> 'partes', '[]'::jsonb);
  v_soma integer;
  v_qtd integer;
  v_distintos integer;
  v_validos integer;
begin
  perform interno.cfg_exigir();
  if btrim(coalesce(p ->> 'nome', '')) = '' then
    raise exception 'Digite o nome da regra.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_partes) <> 'array' or jsonb_array_length(v_partes) = 0 then
    raise exception 'Escolha para onde a regra manda.' using errcode = '22023';
  end if;

  select coalesce(sum((x ->> 'porcentagem')::integer), 0), count(*),
         count(distinct (x ->> 'destino_id')::uuid)
    into v_soma, v_qtd, v_distintos
    from jsonb_array_elements(v_partes) x;
  if exists (select 1 from jsonb_array_elements(v_partes) x
             where coalesce((x ->> 'porcentagem')::integer, 0) not between 1 and 100) then
    raise exception 'Cada parte precisa ter de 1%% a 100%%.' using errcode = '22023';
  end if;
  if v_soma <> 100 then
    raise exception 'As partes precisam somar 100%% (hoje: %).', v_soma || '%' using errcode = '22023';
  end if;
  if v_distintos <> v_qtd then
    raise exception 'Cada destino entra uma vez só na regra.' using errcode = '22023';
  end if;
  select count(*) into v_validos
    from jsonb_array_elements(v_partes) x
    join interno.direcionador_destinos d on d.id = (x ->> 'destino_id')::uuid;
  if v_validos <> v_qtd then
    raise exception 'Destino não encontrado.' using errcode = 'P0002';
  end if;

  if v_id is null then
    insert into interno.direcionador_regras (nome, ativa, ordem, produtos, fontes, dias, hora_inicio, hora_fim)
    values (
      btrim(p ->> 'nome'),
      coalesce((p ->> 'ativa')::boolean, true),
      coalesce((select max(ordem) + 1 from interno.direcionador_regras), 1),
      coalesce(array(select jsonb_array_elements_text(p -> 'produtos'))::uuid[], '{}'),
      coalesce(array(select jsonb_array_elements_text(p -> 'fontes')), '{}'),
      coalesce(nullif(array(select jsonb_array_elements_text(p -> 'dias'))::smallint[], '{}'), '{0,1,2,3,4,5,6}'),
      coalesce(nullif(p ->> 'hora_inicio', '')::time, '00:00'),
      coalesce(nullif(p ->> 'hora_fim', '')::time, '00:00'))
    returning id into v_id;
  else
    update interno.direcionador_regras
       set nome = btrim(p ->> 'nome'),
           ativa = coalesce((p ->> 'ativa')::boolean, ativa),
           produtos = coalesce(array(select jsonb_array_elements_text(p -> 'produtos'))::uuid[], '{}'),
           fontes = coalesce(array(select jsonb_array_elements_text(p -> 'fontes')), '{}'),
           dias = coalesce(nullif(array(select jsonb_array_elements_text(p -> 'dias'))::smallint[], '{}'), '{0,1,2,3,4,5,6}'),
           hora_inicio = coalesce(nullif(p ->> 'hora_inicio', '')::time, '00:00'),
           hora_fim = coalesce(nullif(p ->> 'hora_fim', '')::time, '00:00')
     where id = v_id;
    if not found then
      raise exception 'Regra não encontrada.' using errcode = 'P0002';
    end if;
  end if;

  -- A trava da escolha também protege a troca das partes e o zero dos contadores.
  perform pg_advisory_xact_lock(hashtext('interno.cfg_escolher'));
  delete from interno.direcionador_regra_partes where regra_id = v_id;
  insert into interno.direcionador_regra_partes (regra_id, destino_id, porcentagem, ordem)
  select v_id, (x ->> 'destino_id')::uuid, (x ->> 'porcentagem')::integer, i::integer
    from jsonb_array_elements(v_partes) with ordinality as t (x, i);
  delete from interno.direcionador_contadores where regra_id = v_id;
  return v_id;
end;
$$;

-- Liga ou desliga uma regra (não zera os contadores).
create or replace function public.cfg_regra_ligar(p_id uuid, p_ativa boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform interno.cfg_exigir();
  update interno.direcionador_regras set ativa = coalesce(p_ativa, false) where id = p_id;
  if not found then
    raise exception 'Regra não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

-- Nova ordem: a lista completa das regras, da primeira à última.
create or replace function public.cfg_regra_ordem(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform interno.cfg_exigir();
  if (select count(distinct x) from unnest(coalesce(p_ids, '{}')) x) <> coalesce(cardinality(p_ids), 0)
     or (select count(*) from interno.direcionador_regras) <> coalesce(cardinality(p_ids), 0)
     or exists (select 1 from interno.direcionador_regras r where r.id <> all (p_ids)) then
    raise exception 'A lista precisa ter todas as regras, uma vez cada.' using errcode = '22023';
  end if;
  update interno.direcionador_regras r set ordem = t.i
    from unnest(p_ids) with ordinality as t (id, i)
   where r.id = t.id and r.ordem is distinct from t.i;
end;
$$;

create or replace function public.cfg_regra_excluir(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform interno.cfg_exigir();
  delete from interno.direcionador_regras where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Funções da Edge Function entrada-leads (só service_role)
-- ---------------------------------------------------------------------
-- Ponto de encaixe com o Vendas: a Edge Function chama, ela mesma, a
-- lead_empresa_entrada(...) da distribuição automática quando o destino é o
-- Base360 Vendas. Nada aqui chama essa função. Contrato fechado com a frente
-- do Vendas (05/11/2026):
--   public.lead_empresa_entrada(p_entrada_id text, p_recebido_em timestamptz,
--     p_nome text, p_telefone text, p_email text, p_mensagem text,
--     p_fonte text, p_produto text, p_empreendimento_id uuid default null,
--     p_campanha jsonb default null)
--   returns table (lead_id uuid, situacao text)
--   - situacao: criado | anexado | reativado | a_distribuir | repetido; todas
--     contam como gravado. Só um erro lançado mantém o e-mail na caixa para a
--     próxima passada; dado ruim (nome vazio, telefone fora do formato,
--     produto desconhecido) é tratado dentro da função.
--   - p_entrada_id: o internetMessageId (idempotência). p_recebido_em: o
--     receivedDateTime do e-mail, nunca a hora da leitura (o prazo conta de
--     greatest(p_recebido_em, now() - 5 min)).
--   - p_fonte: slug de interno.lead_fontes. p_produto e p_empreendimento_id:
--     o nome e o id que o acharNoCatalogo devolve, nulos quando não reconheceu.
--   - Nada nos argumentos diz que o lead passou por aqui, qual regra casou ou
--     que outra entrega falhou.

-- O que a regra pura precisa para decidir: a chave geral, as regras ligadas
-- (sem nome), as partes, os destinos (sem endereço) e as fontes com os padrões.
create or replace function public.cfg_motor()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ativo', (select c.ativo from interno.direcionador_config c),
    'vendas_id', (select d.id from interno.direcionador_destinos d where d.tipo = 'vendas'),
    'destinos', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'tipo', d.tipo, 'modo', d.modo,
               'registrar_envios', d.registrar_envios, 'limite_dia', d.limite_dia, 'ativo', d.ativo))
      from interno.direcionador_destinos d), '[]'::jsonb),
    'regras', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'ordem', r.ordem,
               'produtos', to_jsonb(r.produtos), 'fontes', to_jsonb(r.fontes), 'dias', to_jsonb(r.dias),
               'hora_inicio', to_char(r.hora_inicio, 'HH24:MI'), 'hora_fim', to_char(r.hora_fim, 'HH24:MI'),
               'partes', coalesce((
                 select jsonb_agg(jsonb_build_object('destino_id', p.destino_id, 'porcentagem', p.porcentagem) order by p.ordem)
                 from interno.direcionador_regra_partes p where p.regra_id = r.id), '[]'::jsonb))
             order by r.ordem, r.created_at)
      from interno.direcionador_regras r where r.ativa), '[]'::jsonb),
    'fontes', coalesce((
      select jsonb_agg(jsonb_build_object('slug', f.slug, 'nome', f.nome,
               'remetentes', to_jsonb(f.remetentes), 'assunto_contem', to_jsonb(f.assunto_contem)) order by f.ordem)
      from interno.lead_fontes f where f.ativa), '[]'::jsonb)
  );
$$;

-- Escolhe o destino da regra que casou e soma 1 aos contadores, com trava:
-- dois leads ao mesmo tempo não leem o mesmo contador. O dia é o de São Paulo
-- no momento em que o lead chegou (p_quando), não a hora em que a função roda.
-- Ordem: chave geral e regra ligadas; divisão (menor enviados / porcentagem;
-- empate, a ordem da regra; destino desligado é pulado); limite do dia.
-- Devolve {destino_id, tipo, modo, registrar_envios, motivo, dia}. motivo:
-- divisao | desligado | regra_inativa | sem_destino | limite.
create or replace function public.cfg_escolher(p_regra uuid, p_quando timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dia date := (coalesce(p_quando, now()) at time zone 'America/Sao_Paulo')::date;
  v_vendas interno.direcionador_destinos;
  v_alvo interno.direcionador_destinos;
  v_motivo text;
  v_total integer;
begin
  perform pg_advisory_xact_lock(hashtext('interno.cfg_escolher'));
  select * into v_vendas from interno.direcionador_destinos where tipo = 'vendas';

  if not coalesce((select c.ativo from interno.direcionador_config c), false) then
    v_motivo := 'desligado';
  elsif not exists (select 1 from interno.direcionador_regras r where r.id = p_regra and r.ativa) then
    v_motivo := 'regra_inativa';
  else
    select d.* into v_alvo
      from interno.direcionador_regra_partes p
      join interno.direcionador_destinos d on d.id = p.destino_id and d.ativo
      left join interno.direcionador_contadores k on k.regra_id = p.regra_id and k.destino_id = p.destino_id
     where p.regra_id = p_regra
     order by coalesce(k.enviados, 0)::numeric / p.porcentagem, p.ordem
     limit 1;
    if v_alvo.id is null then
      v_motivo := 'sem_destino';
    elsif v_alvo.tipo = 'externo' and v_alvo.limite_dia is not null then
      select x.total into v_total from interno.direcionador_contagem_dia x
       where x.destino_id = v_alvo.id and x.dia = v_dia;
      if coalesce(v_total, 0) >= v_alvo.limite_dia then
        v_motivo := 'limite';
      end if;
    end if;
  end if;

  if v_motivo is not null then
    return jsonb_build_object('destino_id', v_vendas.id, 'tipo', 'vendas', 'modo', null,
                              'registrar_envios', false, 'motivo', v_motivo, 'dia', v_dia);
  end if;

  insert into interno.direcionador_contadores (regra_id, destino_id, enviados) values (p_regra, v_alvo.id, 1)
  on conflict (regra_id, destino_id) do update set enviados = interno.direcionador_contadores.enviados + 1;
  insert into interno.direcionador_contagem_dia (destino_id, dia, total) values (v_alvo.id, v_dia, 1)
  on conflict (destino_id, dia) do update set total = interno.direcionador_contagem_dia.total + 1;

  return jsonb_build_object('destino_id', v_alvo.id, 'tipo', v_alvo.tipo, 'modo', v_alvo.modo,
                            'registrar_envios', v_alvo.registrar_envios, 'motivo', 'divisao', 'dia', v_dia);
end;
$$;

-- A entrega falhou: tira o 1 que cfg_escolher somou (decisão a). O lead vai
-- para o Vendas pela Edge Function, sem nova escolha.
create or replace function public.cfg_desfazer(p_regra uuid, p_item uuid, p_quando timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dia date := (coalesce(p_quando, now()) at time zone 'America/Sao_Paulo')::date;
begin
  perform pg_advisory_xact_lock(hashtext('interno.cfg_escolher'));
  update interno.direcionador_contadores set enviados = enviados - 1
   where regra_id = p_regra and destino_id = p_item and enviados > 0;
  update interno.direcionador_contagem_dia set total = total - 1
   where destino_id = p_item and dia = v_dia and total > 0;
end;
$$;

-- Confere o segredo do agendador (cabeçalho x-entrada-segredo), guardado no
-- Vault por agendar-entrada.sql. Só a service_role.
create or replace function public.entrada_segredo_ok(p_segredo text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return coalesce(length(p_segredo), 0) >= 32 and exists (
    select 1 from vault.decrypted_secrets where name = 'entrada_segredo' and decrypted_secret = p_segredo);
exception when undefined_table or invalid_schema_name then
  return false;
end;
$$;

-- O endereço inteiro de um destino, para a entrega. Só a service_role.
create or replace function public.cfg_item_entrega(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_modo text;
  v jsonb;
begin
  select modo into v_modo from interno.direcionador_destinos where id = p_id and tipo = 'externo';
  if not found then
    return null;
  end if;
  v := interno.cfg_segredo_ler(p_id);
  return case when v is null then null else v || jsonb_build_object('modo', v_modo) end;
end;
$$;

-- Registra o envio a um parceiro na base de contatos do Marketing. Só grava
-- quando o destino tem "Registrar os envios" ligado; com a chave desligada não
-- grava nada e devolve null. p: {destino_id, nome, telefone, email,
-- produto_id, fonte, quando, entrada_id}. A mesma entrada_id não gera dois
-- eventos. Devolve o id do evento.
create or replace function public.mkt_registrar_envio(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_destino uuid := nullif(p ->> 'destino_id', '')::uuid;
  v_nome text := btrim(coalesce(p ->> 'nome', ''));
  v_tel text := nullif(regexp_replace(coalesce(p ->> 'telefone', ''), '[^0-9]', '', 'g'), '');
  v_email text := nullif(lower(btrim(coalesce(p ->> 'email', ''))), '');
  v_produto uuid := nullif(p ->> 'produto_id', '')::uuid;
  v_entrada text := nullif(btrim(coalesce(p ->> 'entrada_id', '')), '');
  v_contato uuid;
  v_evento uuid;
begin
  if not exists (select 1 from interno.direcionador_destinos d
                 where d.id = v_destino and d.tipo = 'externo' and d.registrar_envios) then
    return null;
  end if;
  if v_tel is not null and v_tel !~ '^[0-9]{8,15}$' then
    v_tel := null;
  end if;
  if v_tel is null and v_email is null and v_nome = '' then
    return null;
  end if;
  if v_produto is not null and not exists (select 1 from public.empreendimentos e where e.id = v_produto) then
    v_produto := null;
  end if;

  if v_entrada is not null then
    select id into v_evento from public.mkt_contato_eventos where tipo = 'enviado_parceiro' and entrada_id = v_entrada;
    if found then
      return v_evento;
    end if;
  end if;

  if v_tel is not null then
    select id into v_contato from public.mkt_contatos where telefone = v_tel;
  end if;
  if v_contato is null and v_email is not null then
    select id into v_contato from public.mkt_contatos where lower(email) = v_email order by created_at limit 1;
  end if;
  if v_contato is null then
    insert into public.mkt_contatos (nome, telefone, email) values (v_nome, v_tel, v_email)
    on conflict (telefone) where telefone is not null do update set updated_at = now()
    returning id into v_contato;
  end if;
  update public.mkt_contatos c
     set nome = case when c.nome = '' then v_nome else c.nome end,
         telefone = coalesce(c.telefone, v_tel),
         email = coalesce(c.email, v_email)
   where c.id = v_contato
     and ((c.nome = '' and v_nome <> '') or (c.telefone is null and v_tel is not null
          and not exists (select 1 from public.mkt_contatos o where o.telefone = v_tel))
          or (c.email is null and v_email is not null));

  insert into public.mkt_contato_eventos (contato_id, tipo, parceiro_id, produto_id, fonte, quando, entrada_id)
  values (v_contato, 'enviado_parceiro', v_destino, v_produto, nullif(p ->> 'fonte', ''),
          coalesce(nullif(p ->> 'quando', '')::timestamptz, now()), v_entrada)
  returning id into v_evento;
  return v_evento;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Segurança
-- ---------------------------------------------------------------------
-- As tabelas do esquema interno: sem grant para ninguém (nem o gerente geral
-- lê direto; tudo passa pelas funções). O RLS fica ligado como segunda camada.
do $$
declare
  t text;
begin
  foreach t in array array[
    'interno.direcionador_config', 'interno.direcionador_destinos', 'interno.lead_fontes',
    'interno.direcionador_regras', 'interno.direcionador_regra_partes',
    'interno.direcionador_contadores', 'interno.direcionador_contagem_dia'
  ] loop
    execute format('alter table %s enable row level security', t);
    execute format('revoke all on %s from public, anon, authenticated, service_role', t);
    execute format('drop policy if exists "so o gerente geral" on %s', t);
    execute format('create policy "so o gerente geral" on %s for all to authenticated '
                   'using (public.is_gerente_geral()) with check (public.is_gerente_geral())', t);
  end loop;
end;
$$;

-- Contatos do Marketing: só o gerente geral lê nesta etapa; só a função grava.
alter table public.mkt_contatos enable row level security;
alter table public.mkt_contato_eventos enable row level security;
revoke all on public.mkt_contatos, public.mkt_contato_eventos from public, anon, authenticated;
grant select on public.mkt_contatos, public.mkt_contato_eventos to authenticated;

drop policy if exists "gerente geral le contatos" on public.mkt_contatos;
create policy "gerente geral le contatos" on public.mkt_contatos
  for select to authenticated using (public.is_gerente_geral());
drop policy if exists "gerente geral le eventos de contatos" on public.mkt_contato_eventos;
create policy "gerente geral le eventos de contatos" on public.mkt_contato_eventos
  for select to authenticated using (public.is_gerente_geral());

do $$
declare
  f text;
begin
  -- Nada executável pelo público por padrão.
  foreach f in array array[
    'interno.direcionador_destinos_guarda()', 'interno.cfg_exigir()', 'interno.cfg_segredo_nome(uuid)',
    'interno.cfg_mascarar_dominio(text)', 'interno.cfg_mascarar(jsonb)', 'interno.cfg_segredo_ler(uuid)',
    'interno.cfg_segredo_apagar(uuid)',
    'public.cfg_ler()', 'public.cfg_salvar(boolean)', 'public.cfg_item_salvar(jsonb)',
    'public.cfg_item_excluir(uuid)', 'public.cfg_item_endereco_salvar(uuid, jsonb)',
    'public.cfg_item_endereco(uuid)', 'public.cfg_regra_salvar(jsonb)',
    'public.cfg_regra_ligar(uuid, boolean)', 'public.cfg_regra_ordem(uuid[])', 'public.cfg_regra_excluir(uuid)',
    'public.cfg_motor()', 'public.cfg_escolher(uuid, timestamptz)',
    'public.cfg_desfazer(uuid, uuid, timestamptz)', 'public.cfg_item_entrega(uuid)',
    'public.mkt_registrar_envio(jsonb)', 'public.entrada_segredo_ok(text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
  end loop;
end;
$$;

-- A tela: só quem está logado; cada função confere is_gerente_geral().
grant execute on function
  public.cfg_ler(), public.cfg_salvar(boolean), public.cfg_item_salvar(jsonb),
  public.cfg_item_excluir(uuid), public.cfg_item_endereco_salvar(uuid, jsonb),
  public.cfg_item_endereco(uuid), public.cfg_regra_salvar(jsonb),
  public.cfg_regra_ligar(uuid, boolean), public.cfg_regra_ordem(uuid[]), public.cfg_regra_excluir(uuid)
  to authenticated;

-- A Edge Function: só a chave de serviço.
grant execute on function
  public.cfg_motor(), public.cfg_escolher(uuid, timestamptz),
  public.cfg_desfazer(uuid, uuid, timestamptz), public.cfg_item_entrega(uuid),
  public.mkt_registrar_envio(jsonb), public.entrada_segredo_ok(text)
  to service_role;
