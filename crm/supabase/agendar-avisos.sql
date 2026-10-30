-- =====================================================================
-- CRM MBigucci — agendador dos avisos no celular (item 15)
--
-- Rode UMA VEZ, depois do schema.sql e do deploy da Edge Function "avisos":
--   1. troque o endereço na linha marcada abaixo pela Project URL do seu
--      projeto (Project Settings > API Keys > Project URL);
--   2. SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo (para trocar o endereço, por exemplo): não duplica nada.
-- Se der erro nas duas primeiras linhas: Database > Extensions > ative
-- pg_cron e pg_net, e rode de novo.
-- Regras em docs/notificacoes.md.
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

  -- Endereço da função
  select id into v_id from vault.secrets where name = 'avisos_url';
  if v_id is null then
    perform vault.create_secret(rtrim(v_url, '/') || '/functions/v1/avisos', 'avisos_url', 'Endereço da Edge Function avisos');
  else
    perform vault.update_secret(v_id, rtrim(v_url, '/') || '/functions/v1/avisos');
  end if;

  -- Segredo que só o banco conhece: vai no cabeçalho, e a função pergunta ao
  -- banco (avisos_segredo_ok) se confere. Ninguém precisa copiar.
  if not exists (select 1 from vault.secrets where name = 'avisos_segredo') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'avisos_segredo',
      'Segredo do agendador dos avisos do CRM');
  end if;
end;
$$;

-- Chama a função. Nunca falha: um erro aqui não pode impedir de salvar um lead.
create or replace function private.chamar_avisos(p_corpo jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_url'),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-avisos-segredo', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_segredo')),
    body := p_corpo,
    timeout_milliseconds := 30000);
exception when others then
  raise warning 'avisos: não foi possível chamar a função (%)', sqlerrm;
end;
$$;
revoke all on function private.chamar_avisos(jsonb) from public;

-- [gatilho de atribuição]
-- Lead da empresa atribuído (no cadastro pelo gerente, na troca de dono ou no
-- "Lead perdido"): chama a função na hora, sem esperar a rodada de 5 min. O
-- pg_net só manda depois que a gravação é confirmada. Fora do horário de
-- atendimento a função não avisa; o aviso sai na abertura, pela rodada.
create or replace function private.avisar_atribuicao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.chamar_avisos(jsonb_build_object('origem', 'atribuicao', 'lead_id', new.id));
  return null;
end;
$$;

drop trigger if exists leads_avisa_atribuicao_ins on public.leads;
create trigger leads_avisa_atribuicao_ins after insert on public.leads
  for each row
  when (new.atribuido_em is not null and new.origem = 'empresa' and new.status = 'ativo' and new.etapa = 'novo')
  execute function private.avisar_atribuicao();

drop trigger if exists leads_avisa_atribuicao_upd on public.leads;
create trigger leads_avisa_atribuicao_upd after update on public.leads
  for each row
  when (new.atribuido_em is distinct from old.atribuido_em and new.atribuido_em is not null
        and new.origem = 'empresa' and new.status = 'ativo' and new.etapa = 'novo')
  execute function private.avisar_atribuicao();
-- [/gatilho de atribuição]

-- A cada 5 minutos o banco chama a função, que envia o que estiver na hora.
select cron.schedule('crm-avisos', '*/5 * * * *', $job$ select private.chamar_avisos('{"origem": "agendador"}'::jsonb); $job$);

-- O histórico do agendador cresce: guarda só 7 dias.
select cron.schedule('crm-avisos-limpa-historico', '17 4 * * *', $limpa$
  delete from cron.job_run_details where end_time < now() - interval '7 days';
$limpa$);

-- Primeira chamada agora, para conferir o caminho banco > função.
select private.chamar_avisos('{"origem": "conferencia"}'::jsonb);

-- Conferência: deve aparecer "crm-avisos" ativa.
select jobname, schedule, active from cron.job where jobname like 'crm-avisos%';

-- Uns 10 segundos depois, rode só a linha abaixo (tire os "--"). O esperado é
-- status_code 200 e, em content, {"ok":true,...}. Se vier 401 com "Invalid JWT",
-- desligue "Verify JWT" na função (veja o README, seção 8, passo 4).
-- select status_code, content::text, error_msg from net._http_response order by created desc limit 3;
