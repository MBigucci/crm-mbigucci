-- Verificação de RLS: o que cada usuário de teste enxerga, inclusive os leads.
-- Rode no SQL Editor do Supabase. É só leitura: não altera nenhum dado.
-- Para cada e-mail da lista, a função assume o papel "authenticated" com o id
-- daquele usuário (como o app faz) e conta o que as policies deixam ver.
-- Esperado com dados-teste.sql: cada corretor vê 2 leads (os dele) e 1 interação;
-- cada gerente vê os 2 leads da equipe e atribui só ao corretor dela; o gerente
-- geral vê os 4 e atribui a todos. Os demais não veem lead nenhum.

create or replace function pg_temp.ver_como(p_email text)
returns table (email text, perfil text, ativo boolean, perfis_visiveis bigint,
               equipes_visiveis bigint, chaves_visiveis bigint, quem_ve text,
               leads_visiveis bigint, interacoes_visiveis bigint, leads_de text, atribui_a text)
language plpgsql as $$
declare
  v_id uuid;
  v_perfil text;
  v_ativo boolean;
begin
  select u.id into v_id from auth.users u where u.email = p_email;
  select p.perfil, p.ativo into v_perfil, v_ativo from public.profiles p where p.id = v_id;

  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  return query
    select p_email, v_perfil, v_ativo,
           (select count(*) from public.profiles),
           (select count(*) from public.teams),
           (select count(*) from public.app_settings),
           (select string_agg(x.nome, ', ' order by x.nome) from public.profiles x),
           (select count(*) from public.leads),
           (select count(*) from public.lead_interacoes),
           (select string_agg(distinct x.nome, ', ') from public.leads l join public.profiles x on x.id = l.dono_id),
           (select string_agg(x.nome, ', ' order by x.nome) from public.profiles x where public.pode_atribuir_a(x.id));

  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

select r.*
from public.profiles p
cross join lateral pg_temp.ver_como(p.email) r
order by case r.perfil when 'gerente_geral' then 0 when 'gerente' then 1 else 2 end, r.email;
