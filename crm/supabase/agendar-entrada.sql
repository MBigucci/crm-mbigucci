-- =====================================================================
-- Base360 Marketing — agendador da entrada de leads (direcionador)
--
-- Rode UMA VEZ, depois do schema.sql, do direcionador.sql e do deploy da Edge
-- Function "entrada-leads" (com "Verify JWT" desligado, como a avisos):
--   1. troque o endereço na linha marcada abaixo pela Project URL do projeto
--      (Project Settings > API Keys > Project URL);
--   2. SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo (para trocar o endereço, por exemplo): não duplica nada.
-- Se der erro nas duas primeiras linhas: Database > Extensions > ative
-- pg_cron e pg_net, e rode de novo.
--
-- O pg_net só chama a função, com corpo vazio: nenhum dado de lead passa por
-- ele (a resposta, guardada em net._http_response, tem só contagens).
-- Enquanto a função estiver com MODO=teste, ela decide e registra só o
-- código no log, sem entregar nem apagar.
-- Regras em docs/direcionador/direcionador.md.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_url constant text := 'https://SEU-PROJETO.supabase.co'; -- ← Project URL (confira)
  v_id uuid;
begin
  if v_url like '%SEU-PROJETO%' or v_url !~* '^https://[a-z0-9-]+\.supabase\.co/?$' then
    raise exception 'Troque o endereço pela Project URL do projeto, por ex. https://abcdefghijkl.supabase.co';
  end if;

  select id into v_id from vault.secrets where name = 'entrada_url';
  if v_id is null then
    perform vault.create_secret(rtrim(v_url, '/') || '/functions/v1/entrada-leads', 'entrada_url', 'Endereço da Edge Function entrada-leads');
  else
    perform vault.update_secret(v_id, rtrim(v_url, '/') || '/functions/v1/entrada-leads');
  end if;

  -- Segredo que só o banco conhece: vai no cabeçalho, e a função pergunta ao
  -- banco (entrada_segredo_ok) se confere. Ninguém precisa copiar.
  if not exists (select 1 from vault.secrets where name = 'entrada_segredo') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'entrada_segredo',
      'Segredo do agendador da entrada de leads');
  end if;
end;
$$;

-- A função confere o segredo do cabeçalho com public.entrada_segredo_ok, que
-- fica no direcionador.sql (testado lá).

-- Chama a função. Nunca falha.
create or replace function private.chamar_entrada()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'entrada_url'),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-entrada-segredo', (select decrypted_secret from vault.decrypted_secrets where name = 'entrada_segredo')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
exception when others then
  raise warning 'entrada: não foi possível chamar a função (%)', sqlerrm;
end;
$$;
revoke all on function private.chamar_entrada() from public, anon, authenticated;

-- A cada minuto. (O histórico do pg_cron já é limpo pelo agendar-avisos.sql.)
select cron.schedule('base360-entrada-leads', '* * * * *', $job$ select private.chamar_entrada(); $job$);

-- Primeira chamada agora, para conferir o caminho banco > função.
select private.chamar_entrada();

-- Conferência: deve aparecer "base360-entrada-leads" ativa.
select jobname, schedule, active from cron.job where jobname like 'base360-entrada%';

-- Uns 10 segundos depois, rode só a linha abaixo (tire os "--"). O esperado é
-- status_code 200 e, em content, {"ok":true,"modo":"teste",...}. Se vier 401
-- com "Invalid JWT", desligue "Verify JWT" na função.
-- select status_code, content::text, error_msg from net._http_response order by created desc limit 3;

-- Para parar a entrada (por exemplo, para voltar ao processo manual):
-- select cron.unschedule('base360-entrada-leads');
