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
begin
  -- ---------- Preparação (como o dono do banco) ----------
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
                          email_confirmed_at, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', t.id, 'authenticated', 'authenticated', t.email,
         '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nome', t.nome), now(), now(), now()
  from (values (g1, 'parc-g1@teste.invalid', 'T-Gerente 1'), (g2, 'parc-g2@teste.invalid', 'T-Gerente 2'),
               (g3, 'parc-g3@teste.invalid', 'T-Gerente 3'), (gg, 'parc-gg@teste.invalid', 'T-Geral'),
               (op, 'parc-op@teste.invalid', 'T-Operacional')) as t (id, email, nome);

  update public.profiles p set perfil = t.perfil, ativo = true
  from (values (g1, 'gerente'), (g2, 'gerente'), (g3, 'gerente'), (gg, 'gerente_geral'), (op, 'operacional')) as t (id, perfil)
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
    where s.nspname in ('public', 'private') and p.proname like 'parceiro%' and p.prokind = 'f'
  loop
    perform pg_temp.ck(has_function_privilege('anon', f.oid, 'execute') = (f.proname = 'parceiro_enviar'),
                       'anon executa só parceiro_enviar: ' || f.assinatura);
    perform pg_temp.ck(has_function_privilege('authenticated', f.oid, 'execute') = (f.proname in ('parceiro_enviar', 'parceiro_cadastrar')),
                       'authenticated executa só link e cadastro manual: ' || f.assinatura);
  end loop;
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

  -- ---------- 3. Link público: roleta em rodízio ----------
  set local role anon;
  r := public.parceiro_enviar('T-Ana', 'Imob A', '(11) 95550-0001', 'CRECI 11.111-F', 'ana@x.com', 'Santo André');
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
  r := public.parceiro_enviar('T-Robo', null, '11 95550-0099', null, null, null, 'sou um robo');
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
  j := public.parceiro_cadastrar(gen_random_uuid(), 'T-Manual G1', 'Imob M', '(11) 95550-0101', 'MG-10101', 'm@x.com', 'ABC');
  reset role;
  prox_depois := private.parceiro_proximo_gerente(null);
  perform pg_temp.ck(j ->> 'status' = 'criado' and (j ->> 'gerente_id')::uuid = g1, 'cadastro manual: fica com quem cadastrou');
  perform pg_temp.ck(prox_antes = prox_depois, 'cadastro manual não conta como vez na roleta');
  perform pg_temp.ck((select count(*) from public.parceiro_eventos where parceiro_id = (j ->> 'parceiro_id')::uuid and tipo = 'atribuido' and como = 'manual') = 1,
                     'cadastro manual: evento atribuido "manual"');

  -- mesmo id de novo (reenvio): não duplica
  set local role authenticated;
  j := public.parceiro_cadastrar((j ->> 'parceiro_id')::uuid, 'T-Manual G1', 'Imob M', '(11) 95550-0101', 'MG-10101', 'm@x.com', 'ABC');
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

  -- A interação de Y foi gravada agora (ultima_interacao_em = agora). Os testes de
  -- prazo abaixo precisam de datas controladas: refaz com datas escolhidas.
  update public.parceiros set ultima_interacao_em = null where id = y;
  delete from public.parceiro_interacoes where parceiro_id = y;

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
  update public.parceiros set nome = 'T-Z editado', regiao = 'Outra região' where id = z;
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
