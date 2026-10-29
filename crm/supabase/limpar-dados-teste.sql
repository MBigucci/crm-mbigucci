-- Apaga os dados criados por dados-teste.sql. Rode no SQL Editor.
update public.profiles set ativo = false, equipe_id = null
where email in ('felipe+corretora@mbigucci.com.br', 'felipe+corretorb@mbigucci.com.br');

delete from public.teams where nome in ('Equipe A (teste)', 'Equipe B (teste)');

delete from auth.users where email in (
  'felipe+gerentea@mbigucci.com.br', 'felipe+gerenteb@mbigucci.com.br',
  'felipe+corretora@mbigucci.com.br', 'felipe+corretorb@mbigucci.com.br'
);

select count(*) as contas_restantes from public.profiles;
