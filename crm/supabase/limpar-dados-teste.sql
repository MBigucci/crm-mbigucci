-- Apaga os dados criados por dados-teste.sql. Rode no SQL Editor.
-- Os leads não têm exclusão pelo app; aqui, pelo SQL Editor, os de teste saem.
delete from public.lead_interacoes where lead_id in (
  select l.id from public.leads l join public.profiles p on p.id = l.dono_id
  where p.email in ('felipe+corretora@mbigucci.com.br', 'felipe+corretorb@mbigucci.com.br')
);
delete from public.leads where dono_id in (
  select id from public.profiles
  where email in ('felipe+corretora@mbigucci.com.br', 'felipe+corretorb@mbigucci.com.br')
);

update public.profiles set ativo = false, equipe_id = null
where email in ('felipe+corretora@mbigucci.com.br', 'felipe+corretorb@mbigucci.com.br');

delete from public.teams where nome in ('Equipe A (teste)', 'Equipe B (teste)');

delete from auth.users where email in (
  'felipe+gerentea@mbigucci.com.br', 'felipe+gerenteb@mbigucci.com.br',
  'felipe+corretora@mbigucci.com.br', 'felipe+corretorb@mbigucci.com.br'
);

select count(*) as contas_restantes from public.profiles;
