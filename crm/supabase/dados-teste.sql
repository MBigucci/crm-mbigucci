-- Dados de teste para conferir o RLS: 2 gerentes, 2 equipes, 2 corretores.
-- Rode no SQL Editor. Pode rodar de novo, porque não duplica nada.
-- As contas NÃO têm senha, então ninguém consegue entrar com elas. Servem só para
-- simular o que cada perfil vê (veja verificar-rls.sql). Para apagar, use limpar-dados-teste.sql.

-- 1. Contas no Auth. O gatilho handle_new_user cria o perfil, desativado e como corretor.
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
                        email_confirmed_at, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       t.email, '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nome', t.nome),
       now(), now(), now()
from (values
  ('felipe+gerentea@mbigucci.com.br',  'Gerente A (teste)'),
  ('felipe+gerenteb@mbigucci.com.br',  'Gerente B (teste)'),
  ('felipe+corretora@mbigucci.com.br', 'Corretor A (teste)'),
  ('felipe+corretorb@mbigucci.com.br', 'Corretor B (teste)')
) as t (email, nome)
where not exists (select 1 from auth.users u where u.email = t.email);

-- 2. Gerentes
update public.profiles set perfil = 'gerente', ativo = true
where email in ('felipe+gerentea@mbigucci.com.br', 'felipe+gerenteb@mbigucci.com.br');

-- 3. Equipes
insert into public.teams (nome, gerente_id)
select t.nome, p.id
from (values ('Equipe A (teste)', 'felipe+gerentea@mbigucci.com.br'),
             ('Equipe B (teste)', 'felipe+gerenteb@mbigucci.com.br')) as t (nome, email)
join public.profiles p on p.email = t.email
on conflict do nothing;

-- 4. Corretores, cada um na sua equipe
update public.profiles p set perfil = 'corretor', ativo = true, equipe_id = t.id
from public.teams t
where (p.email, t.nome) in (('felipe+corretora@mbigucci.com.br', 'Equipe A (teste)'),
                            ('felipe+corretorb@mbigucci.com.br', 'Equipe B (teste)'));

-- 5. Conferência
select nome, email, perfil, ativo, (select nome from public.teams where id = equipe_id) as equipe
from public.profiles order by perfil, nome;

-- 6. Leads de teste: 2 por corretor, e 1 interação no primeiro de cada um.
--    Rodando pelo SQL Editor não há usuário logado, então criado_por fica vazio.
insert into public.leads (dono_id, nome, whatsapp, origem, temperatura, proximo_contato)
select p.id, t.nome, t.whatsapp, t.origem, t.temperatura, now() + t.quando
from (values
  ('felipe+corretora@mbigucci.com.br', 'Cliente A1 (teste)', '5511900000001', 'plantao',         'quente', interval '-1 day'),
  ('felipe+corretora@mbigucci.com.br', 'Cliente A2 (teste)', '5511900000002', 'anuncio_proprio', 'frio',   interval '2 hours'),
  ('felipe+corretorb@mbigucci.com.br', 'Cliente B1 (teste)', '5511900000003', 'indicacao',       'morno',  interval '1 day'),
  ('felipe+corretorb@mbigucci.com.br', 'Cliente B2 (teste)', '5511900000004', 'empresa',         null,     interval '3 hours')
) as t (email, nome, whatsapp, origem, temperatura, quando)
join public.profiles p on p.email = t.email
where not exists (select 1 from public.leads l where l.nome = t.nome);

insert into public.lead_interacoes (lead_id, texto, proximo_contato)
select l.id, 'Primeiro contato (teste)', now() + interval '1 day'
from public.leads l
where l.nome in ('Cliente A1 (teste)', 'Cliente B1 (teste)')
  and not exists (select 1 from public.lead_interacoes i where i.lead_id = l.id);

select l.nome, p.nome as corretor, l.origem, l.temperatura, l.proximo_contato
from public.leads l join public.profiles p on p.id = l.dono_id
where l.nome like '% (teste)' order by l.nome;
