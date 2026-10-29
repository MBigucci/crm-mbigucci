-- Verificação de RLS: o que cada usuário de teste enxerga.
-- Rode no SQL Editor do Supabase. É só leitura: não altera nenhum dado.
-- Para cada e-mail da lista, a função assume o papel "authenticated" com o id
-- daquele usuário (como o app faz) e conta o que as policies deixam ver.

create or replace function pg_temp.ver_como(p_email text)
returns table (email text, perfil text, ativo boolean, perfis_visiveis bigint,
               equipes_visiveis bigint, chaves_visiveis bigint, quem_ve text)
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
           (select string_agg(x.nome, ', ' order by x.nome) from public.profiles x);

  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

select r.*
from public.profiles p
cross join lateral pg_temp.ver_como(p.email) r
order by case r.perfil when 'gerente_geral' then 0 when 'gerente' then 1 else 2 end, r.email;
