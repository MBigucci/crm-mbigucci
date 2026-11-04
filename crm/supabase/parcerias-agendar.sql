-- =====================================================================
-- CRM MBigucci — job diário das parcerias (90 dias, avisos e limpeza)
--
-- Rode UMA VEZ, depois do parcerias.sql (e, para o aviso na hora, depois do
-- agendar-avisos.sql):
--   SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo: não duplica nada (o job tem nome fixo).
-- Se der erro na primeira linha: Database > Extensions > ative pg_cron.
-- O que o job faz e as regras: docs/parcerias.md (etapa 6) e docs/codex-parcerias.md.
-- =====================================================================

create extension if not exists pg_cron;

-- Todo dia às 10:00 UTC = 07:00 em São Paulo (o pg_cron do Supabase roda em UTC).
-- Chama private.parceiros_rotina(), que:
--   1. passa para o próximo da roleta o parceiro com 90 dias sem interação do
--      dono (nunca para o mesmo) ou cujo dono foi desativado, e grava o histórico;
--   2. cria os avisos de 80 dias e de próximo contato chegado;
--   3. apaga avisos enviados há mais de 30 dias e tentativas do link com mais de 2 dias.
select cron.schedule('crm-parcerias', '0 10 * * *', $job$ select private.parceiros_rotina(); $job$);

-- Aviso na hora: quando entra um aviso novo (parceiro recebido pela roleta ou
-- reentrada), chama a Edge Function "avisos", sem esperar a rodada de 5 min.
-- Só existe se o agendar-avisos.sql já foi rodado (ele cria private.chamar_avisos);
-- sem ele, os avisos saem na rodada normal. Nunca falha: um erro aqui não pode
-- impedir um parceiro de se cadastrar.
create or replace function private.parceiros_avisar_agora()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_regprocedure('private.chamar_avisos(jsonb)') is not null then
    perform private.chamar_avisos(jsonb_build_object('origem', 'parceiros'));
  end if;
  return null;
exception when others then
  raise warning 'parcerias: não foi possível chamar os avisos (%)', sqlerrm;
  return null;
end;
$$;
revoke all on function private.parceiros_avisar_agora() from public, anon, authenticated;

drop trigger if exists parceiro_avisos_agora on public.parceiro_avisos;
create trigger parceiro_avisos_agora after insert on public.parceiro_avisos
  for each statement execute function private.parceiros_avisar_agora();

-- Conferência: deve aparecer "crm-parcerias" ativa.
select jobname, schedule, active from cron.job where jobname = 'crm-parcerias';

-- Para rodar a rotina uma vez agora, à mão (tire os "--"). Devolve o resumo:
-- select private.parceiros_rotina();

-- Para ver se o job rodou bem (depois do primeiro dia): status "succeeded".
-- select status, return_message, start_time from cron.job_run_details
--   where command like '%parceiros_rotina%' order by start_time desc limit 5;
