-- =====================================================================
-- Base360 Vendas: agendamento da distribuição automática (pg_cron)
--
-- Rode UMA VEZ, depois do distribuicao.sql (e do agendar-avisos.sql, que leva
-- os avisos ao celular). SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo: o cron.schedule com o mesmo nome substitui o anterior.
-- Se der erro na primeira linha: Database > Extensions > ative pg_cron.
-- As rotinas são SQL dentro do banco (sem pg_net e sem segredo). Cada uma
-- confere a hora de São Paulo e as chaves de Configurações > Distribuição
-- automática antes de agir. Regras em docs/distribuicao-automatica.md, seção 8.
-- O pg_cron roda em UTC: São Paulo é UTC-3.
-- =====================================================================

create extension if not exists pg_cron;

-- A cada minuto: prazo estourado e passagem adiante, represados, fim do
-- plantão, ausências (sem sinal, fora do raio) e os avisos de prazo.
select cron.schedule('crm-distribuicao', '* * * * *', $job$ select private.distribuicao_rotina(); $job$);

-- 19h30 em São Paulo (22h30 UTC): fecha os check-ins abertos como "sem saída".
select cron.schedule('crm-distribuicao-fecha', '30 22 * * *', $job$ select private.distribuicao_fechar_presencas(); $job$);

-- 23h50 em São Paulo (2h50 UTC): a foto do follow-up de cada corretor.
select cron.schedule('crm-distribuicao-followup', '50 2 * * *', $job$ select private.distribuicao_followup_foto(); $job$);

-- Segunda, 6h em São Paulo (9h UTC): recalcula as faixas de desempenho.
select cron.schedule('crm-distribuicao-desempenho', '0 9 * * 1', $job$ select private.distribuicao_desempenho_calcular(); $job$);

-- Todo dia, 3h em São Paulo (6h UTC): limpa tentativas de check-in (30 dias),
-- avisos (30 dias) e decisões (13 meses).
select cron.schedule('crm-distribuicao-limpa', '0 6 * * *', $job$ select private.distribuicao_limpar(); $job$);

-- Conferência: devem aparecer as cinco, ativas.
select jobname, schedule, active from cron.job where jobname like 'crm-distribuicao%' order by jobname;

-- Para desligar tudo (volta ao manual), rode:
-- select cron.unschedule(jobname) from cron.job where jobname like 'crm-distribuicao%';
