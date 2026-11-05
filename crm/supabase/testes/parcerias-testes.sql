-- =====================================================================
-- Testes do módulo de parcerias (parcerias.sql). Não deixa nada no banco.
--
-- Como usar: SQL Editor > New query > cole tudo > Run. É UM bloco só que cria
-- usuários e parceiros de teste, confere tudo e termina de propósito com um
-- erro, que desfaz TUDO (nenhum dado de teste fica). O resultado é a
-- mensagem de erro:
--   "TESTES_OK: N verificacoes ..."  = tudo passou;
--   "FALHOU: <o que>"                = a verificação que falhou.
-- Dentro da transação os gerentes reais ficam desativados e os parceiros que já
-- existem ficam inativos (só para o teste, e desfeito no fim), para a roleta
-- e a data simulada não tocarem em dados reais.
-- Concorrência de verdade (duas conexões ao mesmo tempo) NÃO dá para testar
-- aqui dentro; veja o relatório da etapa 2.
-- Rode DEPOIS do parcerias.sql. Pode rodar quantas vezes quiser.
-- =====================================================================

create or replace function pg_temp.ck(p_ok boolean, p_nome text) returns void
language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FALHOU: %', p_nome;
  end if;
  create temp table if not exists _ptest (n serial, nome text);
  insert into _ptest (nome) values (p_nome);
end;
$$;

do $teste$
declare
  g1 uuid := gen_random_uuid();
  g2 uuid := gen_random_uuid();
  g3 uuid := gen_random_uuid();
  gg uuid := gen_random_uuid();
  op uuid := gen_random_uuid();
  rc uuid := gen_random_uuid();
  fr uuid[];
  fr2 uuid[];
  nm1 text; nm2 text; nm3 text;
  base timestamptz := now();
  r text;
  j jsonb;
  n int;
  n2 int;
  n3 int;
  b boolean;
  est text;
  f record;
  rec record;
  id_a uuid; id_b uuid; id_c uuid; id_d uuid;
  x uuid; y uuid; z uuid; w uuid; v uuid; u uuid;
  dono_x uuid; novo uuid; ant uuid;
  recebeu uuid[];
  prox_antes uuid; prox_depois uuid;
  total int;
  total2 int;
  e1 text; e2 text; e3 text; e4 text; e5 text;
  fila uuid[];
  fila2 uuid[];
  recebidos uuid[];
  lote uuid;
  pf uuid;
  ts timestamptz;
begin
  -- ---------- Preparação (como o dono do banco) ----------
  -- A permissão da recepção nasce no recepcao.sql (outra frente). Aqui ela é
  -- garantida só dentro do teste (desfeito no fim): só o perfil recepcao a tem.
  insert into public.roles (slug, nome, ordem) values ('recepcao', 'Recepção', 5) on conflict do nothing;
  insert into public.permissions (slug, descricao, ordem)
  values ('plantao.atendimentos', 'Registrar os clientes que chegam ao stand', 31) on conflict do nothing;
  delete from public.role_permissions where permissao = 'plantao.atendimentos';
  insert into public.role_permissions (perfil, permissao) values ('recepcao', 'plantao.atendimentos');
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
                          email_confirmed_at, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', t.id, 'authenticated', 'authenticated', t.email,
         '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nome', t.nome), now(), now(), now()
  from (values (g1, 'parc-g1@teste.invalid', 'T-Gerente 1'), (g2, 'parc-g2@teste.invalid', 'T-Gerente 2'),
               (g3, 'parc-g3@teste.invalid', 'T-Gerente 3'), (gg, 'parc-gg@teste.invalid', 'T-Geral'),
               (op, 'parc-op@teste.invalid', 'T-Operacional'), (rc, 'parc-rc@teste.invalid', 'T-Recepcao')) as t (id, email, nome);

  update public.profiles p set perfil = t.perfil, ativo = true
  from (values (g1, 'gerente'), (g2, 'gerente'), (g3, 'gerente'), (gg, 'gerente_geral'), (op, 'operacional'), (rc, 'recepcao')) as t (id, perfil)
  where p.id = t.id;

  update public.profiles set ativo = false where perfil = 'gerente' and email not like 'parc-%@teste.invalid';
  update public.parceiros set ativo = false;

  -- ---------- 1. Normalização ----------
  perform pg_temp.ck(private.parceiro_norm_whatsapp('(11) 98765-4321') = '11987654321', 'whatsapp com máscara');
  perform pg_temp.ck(private.parceiro_norm_whatsapp('+55 11 98765-4321') = '11987654321', 'whatsapp com +55');
  perform pg_temp.ck(private.parceiro_norm_whatsapp('5511987654321') = '11987654321', 'whatsapp com 55 colado');
  perform pg_temp.ck(private.parceiro_norm_whatsapp('011 98765 4321') = '11987654321', 'whatsapp com zero à esquerda');
  perform pg_temp.ck(private.parceiro_norm_whatsapp('11 8765-4321') = '11987654321', 'whatsapp sem o 9 do celular');
  perform pg_temp.ck(private.parceiro_norm_whatsapp('12345') is null, 'whatsapp curto vira nulo');
  perform pg_temp.ck(private.parceiro_norm_whatsapp(null) is null, 'whatsapp nulo');
  perform pg_temp.ck(private.parceiro_norm_creci('CRECI 12.345-f') = '12345F', 'creci com pontuação e caixa');
  perform pg_temp.ck(private.parceiro_norm_creci(' sp-12345 f ') = 'SP12345F', 'creci com espaços');
  perform pg_temp.ck(private.parceiro_norm_creci('12') is null, 'creci curto vira nulo');

  -- ---------- 2. Privilégios: anon só chama a função do link ----------
  for f in
    select p.oid, p.oid::regprocedure::text as assinatura, p.proname
    from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname in ('public', 'private') and p.prokind = 'f'
      and (p.proname like 'parceiro%' or p.proname like 'recepcao%parceiro%')
  loop
    perform pg_temp.ck(has_function_privilege('anon', f.oid, 'execute') = (f.proname = 'parceiro_enviar'),
                       'anon executa só parceiro_enviar: ' || f.assinatura);
    perform pg_temp.ck(has_function_privilege('authenticated', f.oid, 'execute')
                         = (f.proname in ('parceiro_enviar', 'parceiro_cadastrar', 'parceiros_fila',
                                          'parceiro_evento_lote', 'parceiro_linha_do_tempo',
                                          'recepcao_parceiro_entrar', 'recepcao_fila_parceiros')),
                       'authenticated executa só link, cadastro, fila, evento em lote, linha do tempo e recepção: ' || f.assinatura);
  end loop;
  -- Uma versão só de cada função (troca de assinatura não pode deixar a antiga com grant)
  for f in
    select p.proname, count(*) as n
    from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname in ('public', 'private') and (p.proname like 'parceiro%' or p.proname like 'recepcao%parceiro%')
    group by p.proname
  loop
    perform pg_temp.ck(f.n = 1, 'sem sobrecarga: ' || f.proname);
  end loop;
  perform pg_temp.ck(to_regprocedure('public.parceiro_enviar(text, text, text, text, text, text, text, uuid)') is null
                     and to_regprocedure('public.parceiro_cadastrar(uuid, text, text, text, text, text, text)') is null,
                     'as assinaturas antigas (região em texto) não existem mais');
  perform pg_temp.ck(not has_table_privilege('anon', 'public.parceiro_regioes', 'select,insert,update,delete'), 'anon sem acesso às regiões');
  perform pg_temp.ck(has_table_privilege('authenticated', 'public.parceiro_regioes', 'select')
                     and not has_table_privilege('authenticated', 'public.parceiro_regioes', 'insert,update,delete'),
                     'authenticated só lê as regiões');
  perform pg_temp.ck(not has_table_privilege('anon', 'public.parceiros_situacao', 'select,insert,update,delete'), 'anon sem acesso à situação');
  perform pg_temp.ck(has_table_privilege('authenticated', 'public.parceiros_situacao', 'select')
                     and not has_table_privilege('authenticated', 'public.parceiros_situacao', 'insert,update,delete'),
                     'authenticated só lê a situação');
  perform pg_temp.ck((select c.reloptions @> array['security_invoker=true'] from pg_class c
                      where c.oid = 'public.parceiros_situacao'::regclass), 'a view de situação usa security_invoker');
  perform pg_temp.ck(not has_column_privilege('authenticated', 'public.parceiro_interacoes', 'criado_em', 'insert')
                     and not has_column_privilege('authenticated', 'public.parceiro_interacoes', 'criado_por', 'insert'),
                     'gerente não escolhe a data nem o autor da interação');
  -- A fila não devolve nada do parceiro: só estas colunas
  perform pg_temp.ck((select array_agg(a.n order by a.o)
                      from pg_proc p, unnest(p.proargnames, p.proargmodes) with ordinality a (n, m, o)
                      where p.oid = 'public.parceiros_fila()'::regprocedure and a.m = 't')
                     = array['posicao', 'gerente_id', 'gerente_nome', 'ultima_vez_em', 'ultima_origem'],
                     'a fila devolve só posição, gerente, data e tag (nada do parceiro)');

  -- Regiões: seed das cidades do ABC e das zonas de São Paulo
  perform pg_temp.ck((select count(*) from public.parceiro_regioes where codigo in
                      ('santo_andre', 'sao_bernardo', 'sao_caetano', 'diadema', 'maua', 'ribeirao_pires', 'rio_grande_da_serra')
                      and codigo = codigo and nome = cidade) = 7, 'as 7 cidades do ABC estão na lista');
  perform pg_temp.ck((select count(*) from public.parceiro_regioes where cidade = 'São Paulo') = 5, 'São Paulo em 5 zonas');
  perform pg_temp.ck((select count(*) from public.parceiro_regioes where cidade = 'São Bernardo do Campo' and nome <> cidade) > 0
                     and (select count(*) from public.parceiro_regioes where cidade = 'Santo André' and nome <> cidade) > 0,
                     'bairros de São Bernardo e Santo André');
  perform pg_temp.ck(not has_table_privilege('anon', 'public.parceiros', 'select,insert,update,delete'), 'anon sem acesso a parceiros');
  perform pg_temp.ck(not has_table_privilege('anon', 'public.parceiro_interacoes', 'select,insert,update,delete'), 'anon sem acesso a interações');
  perform pg_temp.ck(not has_table_privilege('anon', 'public.parceiro_eventos', 'select,insert,update,delete'), 'anon sem acesso a eventos');
  perform pg_temp.ck(not has_table_privilege('anon', 'public.parceiro_avisos', 'select,insert,update,delete'), 'anon sem acesso a avisos');
  perform pg_temp.ck(not has_table_privilege('anon', 'public.parceiro_link_tentativas', 'select,insert,update,delete'), 'anon sem acesso às tentativas');
  perform pg_temp.ck(not has_table_privilege('authenticated', 'public.parceiros', 'insert,delete'), 'gerente não insere nem apaga parceiro direto');
  perform pg_temp.ck(not has_table_privilege('authenticated', 'public.parceiro_avisos', 'select,insert,update,delete'), 'gerente sem acesso direto aos avisos');
  perform pg_temp.ck(not has_column_privilege('authenticated', 'public.parceiros', 'gerente_id', 'update'), 'gerente não muda o dono');
  perform pg_temp.ck(not has_column_privilege('authenticated', 'public.parceiros', 'ultima_interacao_em', 'update'), 'gerente não mexe nos 90 dias');

  -- anon na prática: não lê nada, não chama o resto
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    perform count(*) from public.parceiros;
    b := false;
  exception when insufficient_privilege then b := true;
  end;
  reset role;
  perform pg_temp.ck(b, 'anon não lê parceiros');

  set local role anon;
  begin
    perform private.parceiros_rotina();
    b := false;
  exception when insufficient_privilege then b := true;
  end;
  reset role;
  perform pg_temp.ck(b, 'anon não chama a rotina');

  set local role anon;
  begin
    perform public.parceiro_cadastrar(null, 'x', null, '11955500000', null, null, null);
    b := false;
  exception when insufficient_privilege then b := true;
  end;
  reset role;
  perform pg_temp.ck(b, 'anon não chama o cadastro manual');

  set local role anon;
  begin
    perform * from public.parceiros_fila();
    b := false;
  exception when insufficient_privilege then b := true;
  end;
  reset role;
  perform pg_temp.ck(b, 'anon não vê a fila');

  -- ---------- 3. Link público: roleta em rodízio ----------
  -- A fila vista por um gerente ANTES das entradas: a roleta tem de seguir esta ordem.
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select array_agg(q.gerente_id order by q.posicao), count(*) filter (where q.ultima_vez_em is null)
    into fila, n from public.parceiros_fila() q;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform pg_temp.ck(cardinality(fila) = 3 and fila <@ array[g1, g2, g3] and n = 3,
                     'fila: os 3 gerentes ativos, nenhum recebeu ainda');
  perform pg_temp.ck(fila[1] = private.parceiro_proximo_gerente(null), 'fila: a posição 1 é o próximo da roleta');

  set local role anon;
  r := public.parceiro_enviar('T-Ana', 'Imob A', '(11) 95550-0001', 'CRECI 11.111-F', 'ana@x.com',
                              array['sbc_centro', ' santo_andre ', 'sbc_centro', ''], '  Ribeirão  ');
  est := public.parceiro_enviar('T-Bruno', null, '11 95550-0002', null, null, null);
  est := est || '|' || public.parceiro_enviar('T-Caio', null, '11 95550-0003', null, null, null);
  est := est || '|' || public.parceiro_enviar('T-Davi', null, '11 95550-0004', null, null, null);
  reset role;
  perform pg_temp.ck(r = 'recebido' and est = 'recebido|recebido|recebido', 'link devolve recebido para parceiro novo');

  select p.id into id_a from public.parceiros p where p.whatsapp_norm = '11955500001';
  select p.id into id_b from public.parceiros p where p.whatsapp_norm = '11955500002';
  select p.id into id_c from public.parceiros p where p.whatsapp_norm = '11955500003';
  select p.id into id_d from public.parceiros p where p.whatsapp_norm = '11955500004';
  perform pg_temp.ck(id_a is not null and id_b is not null and id_c is not null and id_d is not null, 'os 4 parceiros do link existem');
  perform pg_temp.ck((select count(distinct gerente_id) from public.parceiros where id in (id_a, id_b, id_c)) = 3
                     and (select gerente_id from public.parceiros where id = id_a) in (g1, g2, g3)
                     and (select gerente_id from public.parceiros where id = id_b) in (g1, g2, g3)
                     and (select gerente_id from public.parceiros where id = id_c) in (g1, g2, g3),
                     'roleta: as 3 primeiras entradas vão para 3 gerentes diferentes');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = id_d) = (select gerente_id from public.parceiros where id = id_a),
                     'roleta: a 4ª entrada volta a quem recebeu há mais tempo');
  select array[(select gerente_id from public.parceiros where id = id_a), (select gerente_id from public.parceiros where id = id_b),
               (select gerente_id from public.parceiros where id = id_c), (select gerente_id from public.parceiros where id = id_d)]
    into recebidos;
  perform pg_temp.ck(recebidos = array[fila[1], fila[2], fila[3], fila[1]],
                     'a roleta seguiu exatamente a ordem que a fila mostrava (1, 2, 3, 1)');
  -- Depois: quem recebeu por último está no fim, com data e tag
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select array_agg(q.gerente_id order by q.posicao) into fila2 from public.parceiros_fila() q;
  select q.ultima_origem, q.ultima_vez_em into e1, ts from public.parceiros_fila() q where q.posicao = 3;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform pg_temp.ck(fila2 = array[fila[2], fila[3], fila[1]], 'fila depois de 4 entradas: 2, 3 e 1 (quem recebeu por último no fim)');
  perform pg_temp.ck(fila2[1] = private.parceiro_proximo_gerente(null), 'fila depois das entradas: a posição 1 continua sendo o próximo');
  perform pg_temp.ck(e1 = 'link' and ts = (select e.criado_em from public.parceiro_eventos e where e.parceiro_id = id_d and e.tipo = 'atribuido'),
                     'fila: tag "link" e a data da última vez');
  -- Regiões gravadas sem repetição nem vazio, e o "Outra" aparado
  perform pg_temp.ck((select regioes from public.parceiros where id = id_a) = array['santo_andre', 'sbc_centro']
                     and (select regiao_outra from public.parceiros where id = id_a) = 'Ribeirão',
                     'link: regiões sem repetição, em ordem, e "Outra" sem espaços');
  perform pg_temp.ck((select regioes from public.parceiros where id = id_b) = '{}' and (select regiao_outra from public.parceiros where id = id_b) is null,
                     'link sem região: lista vazia');
  set local role anon;
  begin
    perform public.parceiro_enviar('T-Regiao ruim', null, '11 95550-0097', null, null, array['marte']);
    est := 'sem erro';
  exception when others then est := sqlstate || ':' || sqlerrm;
  end;
  reset role;
  perform pg_temp.ck(est = '22023:regiao_invalida', 'link com código de região desconhecido é recusado');
  perform pg_temp.ck(not exists (select 1 from public.parceiros where whatsapp_norm = '11955500097'), 'região inválida não grava');

  -- Estande (recepção): o valor de entrada e a tag já valem
  select private.parceiro_proximo_gerente(null) into prox_antes;
  j := private.parceiro_entrar(gen_random_uuid(), 'T-Estande', null, '11 95550-0060', null, null, array['diadema'], null, 'estande', null);
  perform pg_temp.ck(j ->> 'status' = 'criado' and (j ->> 'gerente_id')::uuid = prox_antes, 'estande: entra pela roleta, para o próximo da fila');
  perform pg_temp.ck((select entrada from public.parceiros where id = (j ->> 'parceiro_id')::uuid) = 'estande', 'estande: entrada = estande');
  perform set_config('request.jwt.claims', json_build_object('sub', g3, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select q.ultima_origem into e1 from public.parceiros_fila() q where q.gerente_id = prox_antes;
  select count(*) into n from public.parceiros_fila() q where q.posicao = 3 and q.gerente_id = prox_antes;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform pg_temp.ck(e1 = 'estande' and n = 1, 'fila: tag "estande" e o gerente vai para o fim');
  begin
    perform private.parceiro_entrar(gen_random_uuid(), 'T-X', null, '11 95550-0061', null, null, null, null, 'outro', null);
    est := 'sem erro';
  exception when others then est := sqlstate;
  end;
  perform pg_temp.ck(est = '22023', 'entrada desconhecida é recusada');
  perform pg_temp.ck((select count(*) from pg_locks where locktype = 'advisory' and pid = pg_backend_pid() and granted) >= 1,
                     'a entrada pegou a trava (advisory lock) da roleta');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = id_a and tipo = 'cadastrado') = 1
                     and (select count(*) from public.parceiro_eventos where parceiro_id = id_a and tipo = 'atribuido' and como = 'roleta') = 1,
                     'histórico: cadastrado e atribuido pela roleta');
  perform pg_temp.ck((select count(*) from public.parceiro_avisos where parceiro_id = id_a and tipo = 'recebido'
                      and gerente_id = (select gerente_id from public.parceiros where id = id_a)) = 1,
                     'o gerente que recebeu pela roleta tem um aviso "recebido"');

  -- Isca, dado inválido e o texto igual para tudo
  select count(*) into n from public.parceiros;
  set local role anon;
  r := public.parceiro_enviar('T-Robo', null, '11 95550-0099', null, null, null, p_isca => 'sou um robo');
  reset role;
  perform pg_temp.ck(r = 'recebido', 'isca devolve o mesmo texto');
  perform pg_temp.ck((select count(*) from public.parceiros) = n, 'isca preenchida não grava');
  set local role anon;
  begin
    perform public.parceiro_enviar('   ', null, '11 95550-0098', null, null, null);
    est := 'sem erro';
  exception when others then est := sqlstate;
  end;
  reset role;
  perform pg_temp.ck(est = '22023', 'link sem nome é recusado como dados_invalidos');
  set local role anon;
  begin
    perform public.parceiro_enviar('T-Sem contato', null, '123', 'ab', null, null);
    est := 'sem erro';
  exception when others then est := sqlstate;
  end;
  reset role;
  perform pg_temp.ck(est = '22023', 'link sem WhatsApp nem CRECI válidos é recusado');

  -- ---------- 4. Reentrada: aviso ao dono, sem roleta ----------
  select gerente_id into dono_x from public.parceiros where id = id_a;
  select count(*) into n from public.parceiros;
  select count(*) into n2 from public.parceiro_eventos where parceiro_id = id_a and tipo = 'atribuido';
  set local role anon;
  r := public.parceiro_enviar('Ana Silva', 'Outra', '+55 11 95550-0001', null, null, null);
  reset role;
  perform pg_temp.ck(r = 'recebido', 'reentrada devolve o mesmo texto do parceiro novo');
  perform pg_temp.ck((select count(*) from public.parceiros) = n, 'reentrada por WhatsApp não cria parceiro');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = id_a and tipo = 'atribuido') = n2,
                     'reentrada não entra na roleta (nenhum atribuido novo)');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = id_a and tipo = 'reentrada_aviso' and para_gerente_id = dono_x) = 1,
                     'reentrada grava o evento para o dono');
  perform pg_temp.ck((select count(*) from public.parceiro_avisos where parceiro_id = id_a and tipo = 'reentrada' and gerente_id = dono_x) = 1,
                     'reentrada gera o aviso pendente para o dono');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = id_a) = dono_x and (select nome from public.parceiros where id = id_a) = 'T-Ana',
                     'reentrada não muda dono nem sobrescreve o cadastro');
  -- mesmo CRECI, WhatsApp diferente
  set local role anon;
  r := public.parceiro_enviar('Ana', null, '11 95550-7777', 'crecI 11111f', null, null);
  reset role;
  perform pg_temp.ck((select count(*) from public.parceiros) = n, 'duplicado por CRECI (WhatsApp diferente)');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = id_a and tipo = 'reentrada_aviso') = 2,
                     'segunda reentrada registrada');

  -- Duplicado com um dos dois vazio: vale o que existir
  set local role anon;
  perform public.parceiro_enviar('T-So creci', null, '123', 'SP-22222', null, null);
  reset role;
  select p.id into x from public.parceiros p where p.creci_norm = 'SP22222';
  perform pg_temp.ck(x is not null and (select whatsapp_norm from public.parceiros where id = x) is null, 'parceiro só com CRECI foi criado');
  select count(*) into n from public.parceiros;
  set local role anon;
  perform public.parceiro_enviar('Mesmo', null, '11 95550-0022', 'sp 22222', null, null);
  reset role;
  perform pg_temp.ck((select count(*) from public.parceiros) = n, 'duplicado por CRECI quando o cadastro não tem WhatsApp');

  set local role anon;
  perform public.parceiro_enviar('T-So whatsapp', null, '11 95550-0033', null, null, null);
  reset role;
  select count(*) into n from public.parceiros;
  set local role anon;
  perform public.parceiro_enviar('Mesmo', null, '+5511955500033', 'ZZ-33333', null, null);
  reset role;
  perform pg_temp.ck((select count(*) from public.parceiros) = n, 'duplicado por WhatsApp quando o cadastro não tem CRECI');
  set local role anon;
  perform public.parceiro_enviar('Outro com CRECI', null, '11 95550-0044', 'ZZ-33333', null, null);
  reset role;
  perform pg_temp.ck((select count(*) from public.parceiros) = n + 1, 'CRECI novo com WhatsApp diferente é parceiro novo');
  set local role anon;
  perform public.parceiro_enviar('Sem WhatsApp', null, null, 'RJ-44444', null, null);
  perform public.parceiro_enviar('Sem WhatsApp', null, '', 'rj 44444', null, null);
  reset role;
  perform pg_temp.ck((select count(*) from public.parceiros where creci_norm = 'RJ44444') = 1, 'só CRECI repetido: um parceiro só');

  -- Limite por contato: no máximo 3 envios por hora
  set local role anon;
  perform public.parceiro_enviar('T-Limite', null, '11 95550-0055', null, null, null);
  for n in 1..5 loop
    r := public.parceiro_enviar('Limite', null, '11 95550-0055', null, null, null);
  end loop;
  reset role;
  perform pg_temp.ck(r = 'recebido', 'envio acima do limite devolve o mesmo texto');
  select p.id into y from public.parceiros p where p.whatsapp_norm = '11955500055';
  perform pg_temp.ck((select count(*) from public.parceiros where whatsapp_norm = '11955500055') = 1, 'limite: um parceiro só');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = y and tipo = 'reentrada_aviso') = 2,
                     'limite: 3 envios por contato por hora (1 novo + 2 reentradas; o resto é descartado)');

  -- ---------- 5. Cadastro manual ----------
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  prox_antes := private.parceiro_proximo_gerente(null);
  set local role authenticated;
  select array_agg(q.gerente_id order by q.posicao) into fila from public.parceiros_fila() q;
  select array_agg(q.ultima_vez_em order by q.posicao)::text into e1 from public.parceiros_fila() q;
  j := public.parceiro_cadastrar(gen_random_uuid(), 'T-Manual G1', 'Imob M', '(11) 95550-0101', 'MG-10101', 'm@x.com', array['sao_bernardo'], 'ABC paulista');
  select array_agg(q.gerente_id order by q.posicao) into fila2 from public.parceiros_fila() q;
  select array_agg(q.ultima_vez_em order by q.posicao)::text into e2 from public.parceiros_fila() q;
  reset role;
  prox_depois := private.parceiro_proximo_gerente(null);
  perform pg_temp.ck(fila = fila2 and e1 = e2, 'cadastro manual do gerente não mexe na fila (nem ordem nem data)');
  perform pg_temp.ck(fila2[1] = prox_depois, 'depois do cadastro manual, a posição 1 da fila é o próximo da roleta');
  perform pg_temp.ck((select regioes from public.parceiros where id = (j ->> 'parceiro_id')::uuid) = array['sao_bernardo']
                     and (select regiao_outra from public.parceiros where id = (j ->> 'parceiro_id')::uuid) = 'ABC paulista',
                     'cadastro manual grava as regiões e o "Outra"');
  set local role authenticated;
  begin
    perform public.parceiro_cadastrar(gen_random_uuid(), 'T-Regiao ruim', null, '11 95550-0096', null, null, array['santo_andre', 'xx_nao_existe']);
    est := 'sem erro';
  exception when others then est := sqlstate || ':' || sqlerrm;
  end;
  reset role;
  perform pg_temp.ck(est = '22023:regiao_invalida', 'cadastro manual com região desconhecida é recusado');
  perform pg_temp.ck(j ->> 'status' = 'criado' and (j ->> 'gerente_id')::uuid = g1, 'cadastro manual: fica com quem cadastrou');
  perform pg_temp.ck(prox_antes = prox_depois, 'cadastro manual não conta como vez na roleta');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = (j ->> 'parceiro_id')::uuid and tipo = 'atribuido' and como = 'manual') = 1,
                     'cadastro manual: evento atribuido "manual"');

  -- mesmo id de novo (reenvio): não duplica
  set local role authenticated;
  j := public.parceiro_cadastrar((j ->> 'parceiro_id')::uuid, 'T-Manual G1', 'Imob M', '(11) 95550-0101', 'MG-10101', 'm@x.com', array['sao_bernardo'], 'ABC paulista');
  reset role;
  perform pg_temp.ck(j ->> 'status' = 'criado' and (select count(*) from public.parceiros where whatsapp_norm = '11955500101') = 1,
                     'cadastro manual com o mesmo id é idempotente');

  -- G2 tenta cadastrar o mesmo WhatsApp: "já é parceiro de T-Gerente 1" e G1 é avisado
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := public.parceiro_cadastrar(gen_random_uuid(), 'Outro nome', null, '11 95550-0101', null, null, null);
  reset role;
  perform pg_temp.ck(j ->> 'status' = 'ja_cadastrado' and j ->> 'dono_nome' = 'T-Gerente 1', 'cadastro manual duplicado diz de quem já é');
  perform pg_temp.ck((select count(*) from public.parceiros where whatsapp_norm = '11955500101') = 1, 'cadastro manual duplicado não cria outro');
  perform pg_temp.ck((select count(*) from public.parceiro_avisos where gerente_id = g1 and tipo = 'reentrada'
                      and parceiro_id = (select id from public.parceiros where whatsapp_norm = '11955500101')) = 1,
                     'o dono recebe o aviso do cadastro manual duplicado');
  -- G1 cadastra o próprio de novo: "seu", sem aviso
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := public.parceiro_cadastrar(gen_random_uuid(), 'T-Manual G1', null, null, 'mg 10101', null, null);
  reset role;
  perform pg_temp.ck(j ->> 'status' = 'seu', 'cadastro manual do próprio parceiro devolve "seu"');
  -- sem permissão
  perform set_config('request.jwt.claims', json_build_object('sub', op, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.parceiro_cadastrar(gen_random_uuid(), 'T-Op', null, '11 95550-0777', null, null, null);
    est := 'sem erro';
  exception when others then est := sqlstate;
  end;
  reset role;
  perform pg_temp.ck(est = '42501', 'quem não tem parceiros.cadastrar não cadastra');
  -- gerente geral cadastra: vai para a roleta (não é da fila)
  perform set_config('request.jwt.claims', json_build_object('sub', gg, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := public.parceiro_cadastrar(gen_random_uuid(), 'T-Do geral', null, '11 95550-0888', null, null, null);
  reset role;
  perform pg_temp.ck(j ->> 'status' = 'criado' and (j ->> 'gerente_id')::uuid in (g1, g2, g3), 'cadastro manual do gerente geral vai para a roleta');
  perform pg_temp.ck((select origem from public.parceiro_eventos where parceiro_id = (j ->> 'parceiro_id')::uuid and tipo = 'atribuido') = 'estande',
                     'cadastro do gerente geral entra na fila com a tag "estande" [TROCA d]');
  -- o gerente geral também vê a fila (ver_todos); quem não tem permissão, não
  perform set_config('request.jwt.claims', json_build_object('sub', gg, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.parceiros_fila();
  reset role;
  perform pg_temp.ck(n = 3, 'gerente geral vê a fila (só os gerentes ativos)');
  perform set_config('request.jwt.claims', json_build_object('sub', op, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform * from public.parceiros_fila();
    est := 'sem erro';
  exception when others then est := sqlstate;
  end;
  reset role;
  perform pg_temp.ck(est = '42501', 'perfil sem permissão de parceiros não vê a fila');

  -- ---------- 5b. Recepção: entrada no estande ----------
  -- Quem não tem plantao.atendimentos (um gerente) não chama nenhuma das duas
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform * from public.recepcao_fila_parceiros();
    e1 := 'sem erro';
  exception when others then e1 := sqlstate;
  end;
  begin
    perform public.recepcao_parceiro_entrar(gen_random_uuid(), 'T-Rec X', null, '11 95550-0500', null, null);
    e2 := 'sem erro';
  exception when others then e2 := sqlstate;
  end;
  reset role;
  perform pg_temp.ck(e1 = '42501' and e2 = '42501', 'sem plantao.atendimentos: a fila e a entrada da recepção dão 42501');
  perform pg_temp.ck(not exists (select 1 from public.parceiros where whatsapp_norm = '11955500500'), 'a entrada recusada não grava');
  perform pg_temp.ck((select array_agg(a.n order by a.o)
                      from pg_proc p, unnest(p.proargnames, p.proargmodes) with ordinality a (n, m, o)
                      where p.oid = 'public.recepcao_fila_parceiros()'::regprocedure and a.m = 't')
                     = array['posicao', 'gerente_id', 'gerente_nome'],
                     'a fila da recepção devolve só posição e gerente');

  -- A fila da recepção é a mesma da roleta e da fila dos gerentes
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select array_agg(q.gerente_id order by q.posicao) into fila from public.parceiros_fila() q;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', rc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select array_agg(q.gerente_id order by q.posicao) into fr from public.recepcao_fila_parceiros() q;
  select count(*) into n from public.parceiros;
  reset role;
  perform pg_temp.ck(fr = fila and fr[1] = private.parceiro_proximo_gerente(null) and cardinality(fr) = 3,
                     'fila da recepção: mesma ordem da roleta e da fila dos gerentes');
  perform pg_temp.ck(n = 0, 'a recepção não lê parceiros');
  select g.nome into nm1 from public.profiles g where g.id = fr[1];
  select g.nome into nm2 from public.profiles g where g.id = fr[2];
  select g.nome into nm3 from public.profiles g where g.id = fr[3];

  -- Procurado: vai para o gerente certo (o último da fila) e a fila não muda
  select array_agg(e.criado_em order by e.id)::text into e1 from public.parceiro_eventos e where e.origem is not null;
  set local role authenticated;
  j := public.recepcao_parceiro_entrar(gen_random_uuid(), 'T-Rec Procurou', null, '11 95550-0501', null, null,
                                       array['sao_bernardo'], null, p_procurado => fr[3]);
  select array_agg(q.gerente_id order by q.posicao) into fr2 from public.recepcao_fila_parceiros() q;
  reset role;
  pf := (j ->> 'parceiro_id')::uuid;
  perform pg_temp.ck(j - 'parceiro_id' = jsonb_build_object('status', 'criado', 'gerente_nome', nm3),
                     'procurado: devolve "criado" e o nome do gerente procurado, nada mais');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = pf) = fr[3]
                     and (select entrada from public.parceiros where id = pf) = 'estande'
                     and (select criado_por from public.parceiros where id = pf) = rc,
                     'procurado: o parceiro fica com o gerente procurado (entrada estande, criado pela recepção)');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = pf and tipo = 'atribuido'
                      and como = 'procurado' and origem = 'estande' and para_gerente_id = fr[3]) = 1,
                     'procurado: evento atribuido com como "procurado"');
  perform pg_temp.ck(fr2 = fr, 'procurado não conta como vez: a fila fica igual');
  perform pg_temp.ck((select count(*) from public.parceiro_avisos where parceiro_id = pf and gerente_id = fr[3] and tipo = 'recebido') = 1,
                     'procurado: o gerente recebe o aviso "recebido"');

  -- Pulo: o 1º não está no stand; a recepção escolhe o 2º. O pulado continua em 1º.
  set local role authenticated;
  j := public.recepcao_parceiro_entrar(gen_random_uuid(), 'T-Rec Pulo', null, '11 95550-0502', null, null,
                                       p_escolhido => fr[2]);
  select array_agg(q.gerente_id order by q.posicao) into fr2 from public.recepcao_fila_parceiros() q;
  reset role;
  pf := (j ->> 'parceiro_id')::uuid;
  perform pg_temp.ck(j ->> 'status' = 'criado' and j ->> 'gerente_nome' = nm2
                     and (select gerente_id from public.parceiros where id = pf) = fr[2],
                     'pulo: o parceiro vai para o escolhido da fila');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = pf and tipo = 'atribuido'
                      and como = 'roleta' and origem = 'estande') = 1, 'pulo: conta como vez (roleta, tag estande)');
  perform pg_temp.ck(fr2 = array[fr[1], fr[3], fr[2]], 'pulo: o pulado continua em 1º e o escolhido vai para o fim');
  -- Sem escolha: o próximo da vez (o pulado) recebe
  set local role authenticated;
  j := public.recepcao_parceiro_entrar(gen_random_uuid(), 'T-Rec Roleta', null, '11 95550-0503', null, null);
  select array_agg(q.gerente_id order by q.posicao) into fr2 from public.recepcao_fila_parceiros() q;
  reset role;
  perform pg_temp.ck(j ->> 'gerente_nome' = nm1 and (select gerente_id from public.parceiros where id = (j ->> 'parceiro_id')::uuid) = fr[1],
                     'sem escolha: vai para o 1º da fila (o pulado)');
  perform pg_temp.ck(fr2 = array[fr[3], fr[2], fr[1]], 'depois da vez dele, o pulado vai para o fim');
  -- Reenvio do mesmo id: mesma resposta, sem duplicar
  set local role authenticated;
  j := public.recepcao_parceiro_entrar((j ->> 'parceiro_id')::uuid, 'T-Rec Roleta', null, '11 95550-0503', null, null);
  select array_agg(q.gerente_id order by q.posicao) into fila2 from public.recepcao_fila_parceiros() q;
  reset role;
  perform pg_temp.ck(j ->> 'status' = 'criado' and j ->> 'gerente_nome' = nm1 and fila2 = fr2
                     and (select count(*) from public.parceiros where whatsapp_norm = '11955500503') = 1,
                     'recepção: reenvio do mesmo id é idempotente');

  -- Gerente fora da fila, inativo ou que não é gerente: recusado, sem gravar
  update public.profiles set ativo = false where id = g3;
  set local role authenticated;
  est := '';
  foreach x in array array[gg, op, g3, gen_random_uuid()] loop
    begin
      perform public.recepcao_parceiro_entrar(gen_random_uuid(), 'T-Rec Ruim', null, '11 95550-0504', null, null, p_escolhido => x);
      est := est || 'sem erro ';
    exception when others then est := est || sqlstate || ':' || sqlerrm || ' ';
    end;
    begin
      perform public.recepcao_parceiro_entrar(gen_random_uuid(), 'T-Rec Ruim', null, '11 95550-0504', null, null, p_procurado => x);
      est := est || 'sem erro ';
    exception when others then est := est || sqlstate || ':' || sqlerrm || ' ';
    end;
  end loop;
  begin
    perform public.recepcao_parceiro_entrar(gen_random_uuid(), 'T-Rec Ruim', null, '11 95550-0504', null, null,
                                            p_procurado => g1, p_escolhido => g2);
    e1 := 'sem erro';
  exception when others then e1 := sqlstate;
  end;
  reset role;
  update public.profiles set ativo = true where id = g3;
  perform pg_temp.ck(est = repeat('22023:gerente_invalido ', 8),
                     'recepção: gerente geral, não gerente, inativo ou inexistente é recusado (escolhido e procurado)');
  perform pg_temp.ck(e1 = '22023', 'recepção: procurado e escolhido juntos é recusado');
  perform pg_temp.ck(not exists (select 1 from public.parceiros where whatsapp_norm = '11955500504'), 'escolha recusada não grava');

  -- Duplicado pela recepção: não entra, o dono é avisado e a recepção sabe de quem é
  select p.id into x from public.parceiros p where p.whatsapp_norm = '11955500101';
  select count(*) into n from public.parceiro_avisos where gerente_id = g1 and parceiro_id = x and tipo = 'reentrada';
  select count(*) into n2 from public.parceiros;
  set local role authenticated;
  j := public.recepcao_parceiro_entrar(gen_random_uuid(), 'Mesmo do G1', null, '+55 11 95550-0101', null, null, p_escolhido => fr[1]);
  select array_agg(q.gerente_id order by q.posicao) into fila2 from public.recepcao_fila_parceiros() q;
  reset role;
  perform pg_temp.ck(j = jsonb_build_object('status', 'ja_cadastrado', 'parceiro_id', x, 'gerente_nome', 'T-Gerente 1'),
                     'duplicado pela recepção: "já é parceiro de T-Gerente 1", sem outro dado');
  perform pg_temp.ck((select count(*) from public.parceiros) = n2 and fila2 = fr2, 'duplicado pela recepção não cria parceiro nem mexe na fila');
  perform pg_temp.ck((select count(*) from public.parceiro_avisos where gerente_id = g1 and parceiro_id = x and tipo = 'reentrada') = n + 1
                     and (select count(*) from public.parceiro_eventos where parceiro_id = x and tipo = 'reentrada_aviso' and detalhe = 'estande') = 1,
                     'duplicado pela recepção avisa o dono (reentrada pelo estande)');
  -- Linha do tempo do procurado
  perform set_config('request.jwt.claims', json_build_object('sub', fr[3], 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.parceiro_linha_do_tempo((select p.id from public.parceiros p where p.whatsapp_norm = '11955500501')) t
    where t.titulo = 'Procurou o gerente no estande' and t.resumo = 'Pelo estande';
  reset role;
  perform pg_temp.ck(n = 1, 'linha do tempo: "Procurou o gerente no estande"');

  -- ---------- 6. Quem vê o quê (RLS) ----------
  -- Parceiros extras para os testes de prazo
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  y := (public.parceiro_cadastrar(gen_random_uuid(), 'T-Y de G1', null, '11 95550-0201', null, null, null) ->> 'parceiro_id')::uuid;
  v := (public.parceiro_cadastrar(gen_random_uuid(), 'T-V de G1', null, '11 95550-0202', null, null, null) ->> 'parceiro_id')::uuid;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  z := (public.parceiro_cadastrar(gen_random_uuid(), 'T-Z de G2', null, '11 95550-0203', null, null, null) ->> 'parceiro_id')::uuid;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', g3, 'role', 'authenticated')::text, true);
  set local role authenticated;
  w := (public.parceiro_cadastrar(gen_random_uuid(), 'T-W de G3', null, '11 95550-0204', null, null, null) ->> 'parceiro_id')::uuid;
  u := (public.parceiro_cadastrar(gen_random_uuid(), 'T-U de G3', null, '11 95550-0205', null, null, null) ->> 'parceiro_id')::uuid;
  reset role;

  select count(*) into total from public.parceiros;

  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*), count(*) filter (where gerente_id = g1) into n, n2 from public.parceiros;
  reset role;
  perform pg_temp.ck(n > 0 and n = n2 and n = (select count(*) from public.parceiros where gerente_id = g1),
                     'gerente vê só os parceiros dele');
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*), count(*) filter (where gerente_id = g2) into n, n2 from public.parceiros;
  reset role;
  perform pg_temp.ck(n > 0 and n = n2, 'outro gerente também vê só os dele');
  perform set_config('request.jwt.claims', json_build_object('sub', gg, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.parceiros;
  select count(*) into n2 from public.parceiro_eventos;
  reset role;
  perform pg_temp.ck(n = total, 'gerente geral vê todos os parceiros');
  perform pg_temp.ck(n2 = (select count(*) from public.parceiro_eventos), 'gerente geral vê todo o histórico');
  perform set_config('request.jwt.claims', json_build_object('sub', op, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.parceiros;
  reset role;
  perform pg_temp.ck(n = 0, 'perfil sem permissão não vê parceiros');

  -- ver_todos concedida a um perfil: o gerente passa a ver todos; depois some de novo
  insert into public.role_permissions (perfil, permissao) values ('gerente', 'parceiros.ver_todos') on conflict do nothing;
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.parceiros;
  reset role;
  perform pg_temp.ck(n = total, 'permissão parceiros.ver_todos dá a visão de todos (configurável, sem if de perfil)');
  delete from public.role_permissions where perfil = 'gerente' and permissao = 'parceiros.ver_todos';

  -- escritas do gerente (resultados guardados; as verificações vêm depois do reset role)
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.parceiros (nome, whatsapp) values ('T-direto', '11 95550-0999');
    e1 := 'sem erro';
  exception when others then e1 := sqlstate;
  end;
  begin
    update public.parceiros set gerente_id = g1 where id = z;
    e2 := 'sem erro';
  exception when others then e2 := sqlstate;
  end;
  update public.parceiros set nome = 'T-Z invadido' where id = z;
  get diagnostics n = row_count;
  update public.parceiros set empresa = 'Nova empresa' where id = y;
  get diagnostics n2 = row_count;
  begin
    delete from public.parceiros where id = y;
    e3 := 'sem erro';
  exception when others then e3 := sqlstate;
  end;
  insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo, proximo_contato)
  values (gen_random_uuid(), y, 'ligacao', 'Conversa inicial', current_date + 7);
  begin
    insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo) values (gen_random_uuid(), z, 'whatsapp', 'Invadindo');
    e4 := 'sem erro';
  exception when others then e4 := sqlstate;
  end;
  begin
    insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo, criado_por)
    values (gen_random_uuid(), y, 'whatsapp', 'Em nome de outro', g2);
    e5 := 'sem erro';
  exception when others then e5 := sqlstate;
  end;
  select count(*) into n3 from public.parceiro_interacoes;
  select count(*) into total2 from public.parceiro_eventos where parceiro_id = z;
  reset role;
  perform pg_temp.ck(e1 = '42501', 'gerente não insere parceiro direto na tabela');
  perform pg_temp.ck(e2 = '42501', 'gerente não troca o dono');
  perform pg_temp.ck(n = 0, 'gerente não edita parceiro de outro');
  perform pg_temp.ck(n2 = 1, 'gerente edita o cadastro do próprio parceiro');
  perform pg_temp.ck(e3 = '42501', 'gerente não apaga parceiro');
  perform pg_temp.ck(e4 = '42501', 'gerente não registra interação em parceiro de outro');
  perform pg_temp.ck(e5 = '42501', 'gerente não registra interação em nome de outro');
  perform pg_temp.ck(n3 = 1, 'gerente vê só as interações dos parceiros dele');
  perform pg_temp.ck(total2 = 0, 'gerente não vê o histórico de parceiro de outro');
  perform pg_temp.ck((select ultima_interacao_em from public.parceiros where id = y) is not null, 'registrar interação carimba ultima_interacao_em');

  perform set_config('request.jwt.claims', json_build_object('sub', gg, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo) values (gen_random_uuid(), y, 'reuniao', 'Geral só lê');
    e1 := 'sem erro';
  exception when others then e1 := sqlstate;
  end;
  select count(*) into n from public.parceiro_interacoes;
  reset role;
  perform pg_temp.ck(e1 = '42501', 'gerente geral vê mas não registra interação de outro gerente');
  perform pg_temp.ck(n = (select count(*) from public.parceiro_interacoes), 'gerente geral vê todas as interações');

  -- ---------- 6b. Histórico: o dono lê (RLS de parceiro_eventos) ----------
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.parceiro_eventos where parceiro_id = y;
  reset role;
  perform pg_temp.ck(n > 0 and n = (select count(*) from public.parceiro_eventos where parceiro_id = y),
                     'o dono lê todo o histórico do parceiro dele');

  -- ---------- 6c. Tipos novos: envio de material reinicia os 90 dias ----------
  perform pg_temp.ck((select ultima_interacao_em from public.parceiros where id = v) is null, 'V ainda sem interação');
  set local role authenticated;
  insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo) values (gen_random_uuid(), v, 'envio_material', 'Tabela do lançamento');
  reset role;
  perform pg_temp.ck((select ultima_interacao_em from public.parceiros where id = v) is not null, 'envio de material carimba os 90 dias');
  begin
    insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo, criado_por) values (gen_random_uuid(), v, 'email', 'x', g1);
    est := 'sem erro';
  exception when others then est := sqlstate;
  end;
  perform pg_temp.ck(est = '23514', 'tipo de interação fora da lista é recusado');

  -- ---------- 6d. Evento em lote ----------
  update public.parceiros set ultima_interacao_em = null where id = v;
  delete from public.parceiro_interacoes where parceiro_id = v;
  lote := gen_random_uuid();
  set local role authenticated;
  j := public.parceiro_evento_lote(lote, '  Café no decorado  ', (now() at time zone 'America/Sao_Paulo')::date - 2,
                                   array[y, v, z, gen_random_uuid(), y]);
  reset role;
  perform pg_temp.ck(j = '{"registrados": 2}'::jsonb, 'evento em lote: só os 2 parceiros do gerente (o de outro e o inexistente somem)');
  perform pg_temp.ck((select count(*) from public.parceiro_interacoes where parceiro_id in (y, v) and tipo = 'evento'
                      and resumo = 'Café no decorado' and criado_por = g1
                      and data_evento = (now() at time zone 'America/Sao_Paulo')::date - 2) = 2,
                     'evento em lote: uma interação "evento" para cada um, com o dia do evento');
  perform pg_temp.ck((select count(*) from public.parceiro_interacoes where parceiro_id = z) = 0
                     and (select ultima_interacao_em from public.parceiros where id = z) is null,
                     'evento em lote não toca no parceiro de outro gerente');
  perform pg_temp.ck((select ultima_interacao_em from public.parceiros where id = v) = now(), 'evento em lote reinicia os 90 dias (conta do registro)');
  set local role authenticated;
  j := public.parceiro_evento_lote(lote, 'Café no decorado', (now() at time zone 'America/Sao_Paulo')::date - 2, array[y, v, z]);
  reset role;
  perform pg_temp.ck(j = '{"registrados": 2}'::jsonb and (select count(*) from public.parceiro_interacoes where tipo = 'evento' and parceiro_id in (y, v)) = 2,
                     'evento em lote reenviado (mesmo id) não duplica e devolve o mesmo');
  set local role authenticated;
  begin
    perform public.parceiro_evento_lote(gen_random_uuid(), 'Amanhã', (now() at time zone 'America/Sao_Paulo')::date + 1, array[y]);
    e1 := 'sem erro';
  exception when others then e1 := sqlstate;
  end;
  begin
    perform public.parceiro_evento_lote(gen_random_uuid(), 'Antigo', (now() at time zone 'America/Sao_Paulo')::date - 31, array[y]);
    e2 := 'sem erro';
  exception when others then e2 := sqlstate;
  end;
  begin
    perform public.parceiro_evento_lote(gen_random_uuid(), '  ', (now() at time zone 'America/Sao_Paulo')::date, array[y]);
    e3 := 'sem erro';
  exception when others then e3 := sqlstate;
  end;
  reset role;
  perform pg_temp.ck(e1 = '22023' and e2 = '22023' and e3 = '22023', 'evento em lote recusa data futura, data antiga demais e resumo vazio');
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := public.parceiro_evento_lote(gen_random_uuid(), 'Evento do G2', (now() at time zone 'America/Sao_Paulo')::date, array[y, v]);
  reset role;
  perform pg_temp.ck(j = '{"registrados": 0}'::jsonb and (select count(*) from public.parceiro_interacoes where criado_por = g2) = 0,
                     'evento em lote com parceiros só de outro gerente: zero, sem gravar');
  perform set_config('request.jwt.claims', json_build_object('sub', op, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.parceiro_evento_lote(gen_random_uuid(), 'X', (now() at time zone 'America/Sao_Paulo')::date, array[y]);
    est := 'sem erro';
  exception when others then est := sqlstate;
  end;
  reset role;
  perform pg_temp.ck(est = '42501', 'quem não tem parceiros.cadastrar não registra evento em lote');

  -- ---------- 6e. Linha do tempo da ficha ----------
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.parceiro_linha_do_tempo(y);
  select count(*) into n2 from public.parceiro_linha_do_tempo(y) t
    where t.fonte = 'interacao' and t.tipo = 'evento' and t.titulo = 'Evento' and t.autor_nome = 'T-Gerente 1' and t.data_evento is not null;
  select count(*) into n3 from public.parceiro_linha_do_tempo(y) t
    where t.fonte = 'historico' and ((t.tipo = 'cadastrado' and t.titulo = 'Cadastrado à mão')
                                     or (t.tipo = 'atribuido' and t.titulo = 'Ficou com quem cadastrou' and t.para_gerente_nome = 'T-Gerente 1'));
  select bool_and(t.titulo is not null) into b from public.parceiro_linha_do_tempo(y) t;
  reset role;
  perform pg_temp.ck(n = (select count(*) from public.parceiro_interacoes where parceiro_id = y) + (select count(*) from public.parceiro_eventos where parceiro_id = y),
                     'linha do tempo: interações e histórico juntos');
  perform pg_temp.ck(n2 = 1 and n3 = 2 and b, 'linha do tempo: textos prontos e nomes dos gerentes');
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n2 from public.parceiro_linha_do_tempo(y);
  reset role;
  perform pg_temp.ck(n2 = 0, 'linha do tempo: outro gerente não vê nada do parceiro');
  perform set_config('request.jwt.claims', json_build_object('sub', gg, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n2 from public.parceiro_linha_do_tempo(y);
  select count(*) into n3 from public.parceiro_linha_do_tempo(gen_random_uuid());
  reset role;
  perform pg_temp.ck(n2 = n and n3 = 0, 'linha do tempo: o gerente geral vê tudo; id inexistente, nada');
  perform set_config('request.jwt.claims', json_build_object('sub', op, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n2 from public.parceiro_linha_do_tempo(y);
  reset role;
  perform pg_temp.ck(n2 = 0, 'linha do tempo: perfil sem permissão não vê nada');

  -- ---------- 6f. Situação: estágio e faixa do prazo ----------
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  pf := (public.parceiro_cadastrar(gen_random_uuid(), 'T-Faixa de G1', null, '11 95550-0206', null, null) ->> 'parceiro_id')::uuid;
  select count(*), count(*) filter (where gerente_id = g1) into n, n2 from public.parceiros_situacao;
  select estagio into e1 from public.parceiros_situacao where parceiro_id = pf;
  select estagio into e2 from public.parceiros_situacao where parceiro_id = y;
  reset role;
  perform pg_temp.ck(n = n2 and n = (select count(*) from public.parceiros where gerente_id = g1), 'situação: o gerente vê só os dele (security_invoker)');
  perform pg_temp.ck(e1 = 'novo', 'estágio "novo": sem interação');
  perform pg_temp.ck(e2 = 'apresentado', 'estágio "apresentado": teve evento');
  -- só ligação = contatado; com reunião = apresentado
  insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo, criado_por) values (gen_random_uuid(), pf, 'ligacao', 'Oi', g1);
  perform pg_temp.ck((select estagio from public.parceiros_situacao where parceiro_id = pf) = 'contatado', 'estágio "contatado": só ligação [TROCA e]');
  insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo, criado_por) values (gen_random_uuid(), pf, 'reuniao', 'Reunião', g1);
  perform pg_temp.ck((select estagio from public.parceiros_situacao where parceiro_id = pf) = 'apresentado'
                     and (select indicados from public.parceiros_situacao where parceiro_id = pf) is null
                     and (select vendidos from public.parceiros_situacao where parceiro_id = pf) is null,
                     'estágio "apresentado" com reunião; indicados e vendidos nulos até a etapa 5');
  -- faixas pela contagem desde prazo_desde
  delete from public.parceiro_interacoes where parceiro_id = pf;
  update public.parceiros set ultima_interacao_em = null where id = pf;
  est := '';
  foreach n in array array[0, 30, 31, 60, 61, 95] loop
    update public.parceiros set atribuido_em = now() - n * interval '24 hours' where id = pf;
    perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select est || s.dias_prazo || ':' || s.faixa || ':' || s.dias_restantes || ' ' into est
    from public.parceiros_situacao s where s.parceiro_id = pf;
    reset role;
  end loop;
  perform pg_temp.ck(est = '0:ok:90 30:ok:60 31:atencao:59 60:atencao:30 61:risco:29 95:risco:0 ',
                     'faixas: ok até 30, atenção de 31 a 60, risco de 61 em diante (' || est || ')');
  update public.parceiros set atribuido_em = now() - interval '10 days', ultima_interacao_em = now() - interval '45 days' where id = pf;
  perform pg_temp.ck((select faixa from public.parceiros_situacao where parceiro_id = pf) = 'atencao', 'a faixa conta da última interação quando ela existe');
  insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo, proximo_contato, criado_por)
  values (gen_random_uuid(), pf, 'whatsapp', 'Retorno', current_date + 3, g1);
  perform pg_temp.ck((select proximo_contato from public.parceiros_situacao where parceiro_id = pf) = current_date + 3
                     and (select faixa from public.parceiros_situacao where parceiro_id = pf) = 'ok',
                     'situação: próximo contato do dono e a faixa volta a "ok" com a interação');
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.parceiros_situacao where parceiro_id = pf;
  reset role;
  perform pg_temp.ck(n = 0, 'situação: outro gerente não vê o parceiro');
  perform set_config('request.jwt.claims', json_build_object('sub', gg, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.parceiros_situacao;
  reset role;
  perform pg_temp.ck(n = (select count(*) from public.parceiros), 'situação: o gerente geral vê todos');
  -- pf sai de cena (não interfere na roleta nem no prazo dos testes seguintes)
  update public.parceiros set ativo = false where id = pf;

  -- ---------- 6g. Região editada direto pelo gerente passa pelo gatilho ----------
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.parceiros set regioes = array['nao_existe'] where id = y;
    e1 := 'sem erro';
  exception when others then e1 := sqlstate || ':' || sqlerrm;
  end;
  update public.parceiros set regioes = array['sp_zona_sul', 'sp_zona_sul', 'sa_centro'], regiao_outra = '  ' where id = y;
  reset role;
  perform pg_temp.ck(e1 = '22023:regiao_invalida', 'edição direta com região inválida é recusada');
  perform pg_temp.ck((select regioes from public.parceiros where id = y) = array['sa_centro', 'sp_zona_sul']
                     and (select regiao_outra from public.parceiros where id = y) is null, 'edição direta: regiões limpas e "Outra" vazio vira nulo');
  update public.parceiro_regioes set ativo = false where codigo = 'sp_zona_sul';
  set local role authenticated;
  update public.parceiros set nome = 'T-Y de G1' where id = y;
  get diagnostics n = row_count;
  begin
    update public.parceiros set regioes = array['sp_zona_sul'] where id = v;
    e2 := 'sem erro';
  exception when others then e2 := sqlstate;
  end;
  reset role;
  perform pg_temp.ck(n = 1 and e2 = '22023', 'região desativada fica em quem já tinha, mas não entra em ninguém novo');
  update public.parceiro_regioes set ativo = true where codigo = 'sp_zona_sul';

  -- As interações de Y e V foram gravadas agora (ultima_interacao_em = agora). Os testes de
  -- prazo abaixo precisam de datas controladas: refaz com datas escolhidas.
  update public.parceiros set ultima_interacao_em = null where id in (y, v);
  delete from public.parceiro_interacoes where parceiro_id in (y, v);

  -- ---------- 7. Avisos: próximo contato e 80 dias ----------
  -- W (de G3): interação de hoje com próximo contato daqui a 10 dias
  insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo, proximo_contato, criado_por, criado_em)
  values (gen_random_uuid(), w, 'visita', 'Visitou o stand', (base at time zone 'America/Sao_Paulo')::date + 10, g3, base);
  perform private.parceiros_rotina(base + interval '5 days');
  perform pg_temp.ck((select count(*) from public.parceiro_avisos where parceiro_id = w and tipo = 'proximo_contato') = 0,
                     'próximo contato ainda não chegou: sem aviso');
  perform private.parceiros_rotina(base + interval '11 days');
  perform private.parceiros_rotina(base + interval '11 days');
  perform pg_temp.ck((select count(*) from public.parceiro_avisos where parceiro_id = w and tipo = 'proximo_contato' and gerente_id = g3) = 1,
                     'próximo contato chegou: um aviso só, mesmo rodando duas vezes');

  -- Y: interação datada de 50 dias à frente reinicia a contagem
  insert into public.parceiro_interacoes (id, parceiro_id, tipo, resumo, criado_por, criado_em)
  values (gen_random_uuid(), y, 'ligacao', 'Retorno', g1, base + interval '50 days');
  perform pg_temp.ck((select ultima_interacao_em from public.parceiros where id = y) = base + interval '50 days', 'interação datada reinicia a contagem do parceiro');

  -- X = parceiro id_a (do link); 80 a 89 dias sem interação gera o aviso, uma vez
  select gerente_id into dono_x from public.parceiros where id = id_a;
  perform private.parceiros_rotina(base + interval '85 days');
  perform private.parceiros_rotina(base + interval '85 days');
  perform pg_temp.ck((select count(*) from public.parceiro_avisos where parceiro_id = id_a and tipo = 'prazo_80' and gerente_id = dono_x) = 1,
                     'aviso de 80 dias: um só');
  perform pg_temp.ck((select count(*) from public.parceiro_avisos where parceiro_id = y and tipo = 'prazo_80') = 0,
                     'sem aviso de 80 dias para quem teve interação recente');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos e join public.parceiros p on p.id = e.parceiro_id where e.tipo = 'perdido_90_dias' and p.criado_em >= base) = 0, 'aos 85 dias ninguém foi perdido');

  -- ---------- 8. 90 dias: muda de gerente, nunca para o mesmo ----------
  -- Z: editar o cadastro NÃO reinicia os 90 dias
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.parceiros set nome = 'T-Z editado', regioes = array['maua'], regiao_outra = 'Outra região' where id = z;
  reset role;
  perform pg_temp.ck((select ultima_interacao_em from public.parceiros where id = z) is null, 'editar o cadastro não mexe em ultima_interacao_em');

  perform private.parceiros_rotina(base + interval '89 days');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = id_a) = dono_x, 'aos 89 dias o parceiro continua com o dono');

  n := private.parceiros_redistribuir(base + interval '91 days');
  perform pg_temp.ck(n > 0, 'aos 91 dias há parceiros redistribuídos');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = id_a) <> dono_x, 'aos 91 dias o parceiro X mudou de gerente');
  perform pg_temp.ck((select ultimo_gerente_id from public.parceiros where id = id_a) = dono_x, 'o dono antigo fica em ultimo_gerente_id');
  perform pg_temp.ck((select ultima_interacao_em from public.parceiros where id = id_a) is null
                     and (select atribuido_em from public.parceiros where id = id_a) = base + interval '91 days', 'a contagem recomeça para o novo dono');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = id_a and tipo = 'perdido_90_dias' and de_gerente_id = dono_x) = 1
                     and (select count(*) from public.parceiro_eventos where parceiro_id = id_a and tipo = 'atribuido' and como = 'redistribuicao'
                          and de_gerente_id = dono_x and para_gerente_id <> dono_x) = 1,
                     'histórico: perdido_90_dias e atribuido (de/para) registrados');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = z) <> g2, 'Z (só editado) foi perdido aos 91 dias');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = y) = g1, 'Y (com interação aos 50 dias) continua com G1 aos 91 dias');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = w) <> g3, 'W (sem interação posterior) foi redistribuído');
  select count(*) into n from public.parceiro_avisos where parceiro_id = id_a and tipo = 'recebido' and gerente_id = (select gerente_id from public.parceiros where id = id_a);
  perform pg_temp.ck(n = 1, 'o novo dono recebe o aviso "recebido"');
  perform pg_temp.ck((select origem from public.parceiro_eventos where parceiro_id = id_a and tipo = 'atribuido' and como = 'redistribuicao') = '90_dias',
                     'a troca de 90 dias grava a tag "90_dias"');
  novo := (select gerente_id from public.parceiros where id = id_a);
  -- Os nomes são lidos antes, como dono do banco: a RLS de profiles esconde o
  -- nome do outro gerente, e é justamente isso que a linha do tempo resolve.
  e1 := (select g.nome from public.profiles g where g.id = dono_x);
  e2 := (select g.nome from public.profiles g where g.id = novo);
  perform set_config('request.jwt.claims', json_build_object('sub', novo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select array_agg(q.gerente_id order by q.posicao) into fila from public.parceiros_fila() q;
  select count(*) into n from public.parceiros_fila() q where q.ultima_origem = '90_dias';
  select count(*) into n2 from public.parceiro_linha_do_tempo(id_a) t
    where t.tipo = 'perdido_90_dias' and t.de_gerente_nome = e1 and t.resumo like 'Sem interação desde %';
  select count(*) into n3 from public.parceiro_linha_do_tempo(id_a) t
    where t.tipo = 'atribuido' and t.titulo = 'Mudou de gerente' and t.resumo = 'Troca de gerente'
      and t.de_gerente_nome = e1 and t.para_gerente_nome = e2;
  select count(*) into total2 from public.profiles g where g.id = dono_x;
  reset role;
  perform pg_temp.ck(fila[1] = private.parceiro_proximo_gerente(null), 'depois da redistribuição, a posição 1 da fila é o próximo da roleta');
  perform pg_temp.ck(n >= 1, 'fila: tag "90_dias" para quem recebeu na troca');
  perform pg_temp.ck(total2 = 0, '(premissa) a RLS de profiles esconde o dono anterior do novo dono');
  perform pg_temp.ck(n2 = 1 and n3 = 1, 'linha do tempo do novo dono: saída por 90 dias com o nome do dono anterior');

  -- Y perde aos 141 dias (50 + 90 + 1h)
  perform private.parceiros_redistribuir(base + interval '141 days 1 hour');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = y) <> g1, 'Y foi perdido 90 dias depois da interação');

  -- Rodadas seguintes: nunca para o mesmo gerente
  ant := (select gerente_id from public.parceiros where id = id_a);
  perform private.parceiros_redistribuir(base + interval '182 days');
  novo := (select gerente_id from public.parceiros where id = id_a);
  perform pg_temp.ck(novo <> ant, 'segunda perda: não volta para quem acabou de perder');
  ant := novo;
  perform private.parceiros_redistribuir(base + interval '273 days');
  novo := (select gerente_id from public.parceiros where id = id_a);
  perform pg_temp.ck(novo <> ant, 'terceira perda: não volta para quem acabou de perder');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos e join public.parceiros p on p.id = e.parceiro_id where e.tipo = 'atribuido' and e.como = 'redistribuicao' and e.de_gerente_id = e.para_gerente_id and p.criado_em >= base) = 0,
                     'nenhuma redistribuição devolveu o parceiro ao mesmo gerente (com 3 gerentes ativos)');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = id_a and tipo = 'perdido_90_dias') = 3, 'X foi perdido 3 vezes e está no histórico');

  -- Roleta em rodízio igual: entre os 3, quem recebeu há mais tempo é o próximo
  select array_agg(x.id order by x.ult) into recebeu
  from (select g.id, coalesce((select max(e.id) from public.parceiro_eventos e
                               where e.tipo = 'atribuido' and e.para_gerente_id = g.id and e.como in ('roleta', 'redistribuicao')), 0) as ult
        from public.profiles g where g.id in (g1, g2, g3)) x;
  perform pg_temp.ck(private.parceiro_proximo_gerente(null) = recebeu[1], 'o próximo da roleta é quem recebeu há mais tempo');
  -- Duas entradas em sequência vão para gerentes diferentes
  set local role anon;
  perform public.parceiro_enviar('T-Seq 1', null, '11 95550-0301', null, null, null);
  perform public.parceiro_enviar('T-Seq 2', null, '11 95550-0302', null, null, null);
  reset role;
  perform pg_temp.ck((select gerente_id from public.parceiros where whatsapp_norm = '11955500301')
                     <> (select gerente_id from public.parceiros where whatsapp_norm = '11955500302'),
                     'duas entradas seguidas vão para gerentes diferentes');
  -- (a simultaneidade real, com duas conexões, foi testada fora daqui)

  -- ---------- 9. Gerente desativado, gerente único, ninguém ativo ----------
  -- U é de G3. Desativa G2 e G3: só G1 fica ativo.
  delete from public.parceiro_avisos where parceiro_id = u;
  update public.parceiros set gerente_id = g3 where id = u;
  update public.parceiros set gerente_id = g1, atribuido_em = now(), ultima_interacao_em = null, ultimo_gerente_id = null where id = v;
  update public.profiles set ativo = false where id in (g2, g3);
  perform set_config('request.jwt.claims', json_build_object('sub', gg, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select array_agg(q.gerente_id order by q.posicao) into fila from public.parceiros_fila() q;
  reset role;
  perform pg_temp.ck(fila = array[g1], 'gerente desativado sai da fila');
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  r := public.parceiro_enviar('Repetido de U', null, '11 95550-0205', null, null, null);
  reset role;
  perform pg_temp.ck(r = 'recebido', 'reentrada de parceiro com dono desativado devolve o mesmo texto');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = u) = g1, 'parceiro de gerente desativado entra na roleta');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = u and tipo = 'sem_gerente') = 1
                     and (select count(*) from public.parceiro_avisos where parceiro_id = u and tipo = 'reentrada') = 0
                     and (select count(*) from public.parceiro_avisos where parceiro_id = u and tipo = 'recebido' and gerente_id = g1) = 1,
                     'dono desativado: sem aviso de reentrada; o novo dono recebe "recebido"');

  -- Único gerente ativo: perde por 90 dias e fica com ele mesmo
  update public.parceiros set gerente_id = g1, atribuido_em = base + interval '300 days', ultima_interacao_em = null where id = v;
  select max(id) into total2 from public.parceiro_eventos;
  perform private.parceiros_redistribuir(base + interval '400 days');
  perform pg_temp.ck((select gerente_id from public.parceiros where id = v) = g1, 'único gerente ativo: o parceiro fica com ele');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = v and tipo = 'perdido_90_dias' and id > total2) = 1
                     and (select count(*) from public.parceiro_eventos where parceiro_id = v and id > total2 and tipo = 'atribuido' and como = 'redistribuicao'
                          and de_gerente_id = g1 and para_gerente_id = g1) = 1,
                     'único gerente ativo: perda e atribuição registradas');

  -- Ninguém ativo: o parceiro nasce sem dono e o job pega quando houver gerente
  update public.profiles set ativo = false where id = g1;
  set local role anon;
  perform public.parceiro_enviar('T-Sem dono', null, '11 95550-0401', null, null, null);
  reset role;
  perform pg_temp.ck((select gerente_id from public.parceiros where whatsapp_norm = '11955500401') is null,
                     'sem gerente ativo: parceiro entra sem dono');
  perform pg_temp.ck(private.parceiros_redistribuir(base + interval '500 days') = 0, 'sem gerente ativo: nada é redistribuído');
  update public.profiles set ativo = true where id = g1;
  perform private.parceiros_redistribuir(base + interval '500 days');
  perform pg_temp.ck((select gerente_id from public.parceiros where whatsapp_norm = '11955500401') = g1,
                     'parceiro sem dono recebe gerente na próxima rodada');

  -- ---------- 10. Avisos pendentes para a Edge Function ----------
  j := public.parceiros_avisos_pendentes();
  perform pg_temp.ck(jsonb_typeof(j) = 'array' and jsonb_array_length(j) > 0, 'avisos pendentes listados para a Edge Function');
  n := public.parceiros_avisos_marcar(array(select (e ->> 'id')::bigint from jsonb_array_elements(j) e));
  perform pg_temp.ck(n = jsonb_array_length(j), 'avisos marcados como enviados');
  perform pg_temp.ck(jsonb_array_length(public.parceiros_avisos_pendentes()) = 0, 'sem pendentes depois de marcar');

  -- Resultado: o erro abaixo desfaz tudo de propósito.
  select count(*) into n from _ptest;
  raise exception 'TESTES_OK: % verificacoes passaram (tudo desfeito, nenhum dado ficou)', n;
end;
$teste$;
