# Teste de carga e de integridade

> Feito em 30/10/2026, antes de abrir o CRM para os ~40 usuários. A pergunta era: **algum lead se perde ou se duplica com todo mundo usando ao mesmo tempo?** O script está em `crm/supabase/testes/carga/`, e o roteiro para repetir está na seção 8.

## Sumário
1. Resumo para o Felipe
2. Como foi testado
3. Números
4. Conferência: perdas e duplicados
5. Problemas achados e o que foi corrigido
6. Pendentes e propostas
7. Plano e compute: 40 pessoas cabem?
8. Como repetir o teste
9. SQL para rodar no Supabase

## 1. Resumo para o Felipe

- **Com as correções, nenhum lead se perdeu nem se duplicou**, com 40 e com 100 pessoas usando ao mesmo tempo por 10 minutos, um ritmo cerca de 10 vezes mais intenso que o uso real.
- **Sem as correções, o CRM duplicava e "perdia em silêncio".** Em 10 minutos com 40 pessoas, foram 35 leads duplicados, 25 interações, 19 visitas e 8 vendas em dobro. Também apareceram 37 "Sem resposta" contados duas vezes e 4 alterações que a tela mostrou como salvas sem que nada fosse gravado (o gerente tinha reatribuído o lead no meio).
- **O painel do gerente demorava 2 a 9 segundos** e travava a fila de todo mundo. Agora leva cerca de 0,2 segundo.
- **40 pessoas cabem com folga no plano Pro com compute MICRO.** O teste usou no máximo 17 das 60 conexões. Não precisa mudar de plano.
- **Falta você rodar o SQL da seção 9** no SQL Editor do Supabase e publicar o site de novo. Sem o SQL, o cadastro novo dá erro, porque o app passou a mandar o id do lead.

## 2. Como foi testado

**Ambiente.** Um Postgres 17 local (pacote `embedded-postgres`, só em localhost), com o mesmo `schema.sql` e o SQL do Storage. O teste também simula o que o Supabase põe em volta:
- os papéis `anon`, `authenticated` e `service_role`;
- o `auth.uid()` lido do JWT;
- o limite de 60 conexões do MICRO.

Cada requisição do app vira uma transação com o papel e o JWT da pessoa, como o PostgREST faz. Assim o RLS, os gatilhos e as regras do banco valem como no Supabase. O pool tem 15 conexões, uma estimativa para o PostgREST no MICRO. Nada tocou o Supabase de produção.

**Seed.** 1 gerente geral, 3 gerentes com 3 equipes, 40 corretores, a recepção e 2.000 leads com etapas, temperaturas e próximos contatos variados. Cada corretor tem 8 visitas, 6 já passadas para dar baixa, e cada pessoa tem um aparelho de aviso cadastrado.

**Usuários virtuais.** Uma ação a cada 1,5 a 6 segundos, por pessoa:

| Quem | O que faz |
| --- | --- |
| Corretor | Lista do dia, ficha, cadastro (30% pelo Colar mensagem), interação, Sem resposta, etapa, temperatura, perfil, agendar e dar baixa em visita, venda |
| Gerente | Painel da equipe, lead da empresa atribuído, reatribuição, baixa de visita da equipe |
| Gerente geral | Painel com todos os leads |
| Recepção | Lista do plantão e marcar manhã ou tarde |
| Função `avisos` | Rodada a cada 20 s, em vez de 5 min |

Na rodada de 100, as sessões passam do número de pessoas: cada corretor fica com 2 ou 3 aparelhos (celular e computador), e há 6 sessões de gerente e 2 de recepção.

**Corridas de propósito**, a cada 10 s:
- a mesma pessoa em dois aparelhos no mesmo lead;
- o gerente reatribuindo enquanto o corretor salva etapa, interação, perfil e Sem resposta;
- toque duplo no Sem resposta;
- **resposta perdida**: o banco grava, o celular não fica sabendo e a pessoa toca de novo, em 3% a 4% dos cadastros, interações, visitas e vendas;
- baixa dupla na mesma visita (corretor e gerente juntos);
- duas rodadas da função `avisos` ao mesmo tempo.

**Dois modos do app:**
- `--cliente atual` imita o app antes das correções;
- `--cliente corrigido` imita o app de agora.

## 3. Números

Três rodadas de 10 minutos. Latências em milissegundos, medidas no banco local (sem a internet entre o celular e o Supabase, que soma uns 30 a 80 ms).

| Rodada | Operações | Por segundo | Conexões (máx. / média) |
| --- | --- | --- | --- |
| 40 pessoas, app e banco de antes | 7.689 | 12,7 | 16 / 10,3 |
| 40 pessoas, corrigido | 7.827 | 12,9 | 16 / 9,2 |
| 100 sessões, corrigido | 18.699 | 30,9 | 17 / 12,0 |

| Operação | Antes, 40 (p50 / p95 / p99) | Corrigido, 40 | Corrigido, 100 |
| --- | --- | --- | --- |
| Lista do dia | 13 / 45 / 486 | 9 / 18 / 275 | 8 / 18 / 867 |
| Abrir ficha | 3 / 11 / 181 | 7 / 19 / 238 | 6 / 12 / 132 |
| Cadastrar lead | 4 / 13 / 22 | 9 / 22 / 66 | 8 / 17 / 33 |
| Registrar interação | 5 / 15 / 23 | 14 / 33 / 53 | 11 / 24 / 47 |
| Sem resposta | 5 / 16 / 60 | 14 / 30 / 62 | 11 / 23 / 42 |
| Mudar etapa | 5 / 13 / 34 | 12 / 42 / 69 | 10 / 21 / 61 |
| Agendar visita | 5 / 15 / 54 | 13 / 36 / 58 | 10 / 19 / 32 |
| Dar baixa | 7 / 18 / 27 | 15 / 31 / 89 | 15 / 34 / 48 |
| Registrar venda | 7 / 20 / 24 | 15 / 44 / 77 | 13 / 26 / 93 |
| Marcar período (recepção) | 6 / 17 / 24 | 11 / 29 / 53 | 9 / 23 / 47 |
| **Painel da equipe (gerente)** | **2.060 / 7.028 / 8.797** | **240 / 428 / 594** | **228 / 487 / 743** |
| **Gerente escolhe lead** | **838 / 1.825 / 2.653** | **103 / 148 / 206** | **82 / 163 / 219** |
| Rodada da função avisos | 60 / 135 / 795 | 112 / 171 / 459 | 94 / 308 / 1.237 |

- As gravações ficaram 5 a 10 ms mais lentas com as correções, entre a trava do lead na interação e a variação desta máquina. Para quem toca na tela, não muda nada.
- O p99 da lista do dia é a fila do pool nos momentos em que vários gerentes abrem o painel juntos.
- **Erros:** os únicos foram os esperados.
  - "Esse período já está marcado" (código 23505): a recepção tocou num turno já marcado.
  - Até 8 erros de permissão: o lead tinha acabado de ser reatribuído.
  - 1 "Esta visita já tem baixa", na baixa dupla.
  - Nenhum erro de RLS indevido em nenhuma rodada.

## 4. Conferência: perdas e duplicados

No fim de cada rodada, `conferir.mjs` compara o que o app mostrou como salvo com o banco. Cada cadastro, interação, visita e venda leva uma marca única no texto. As linhas abaixo são das rodadas de 40 pessoas (antes e corrigido) e da de 100 sessões (corrigido).

| Conferência | Antes, 40 | Corrigido, 40 | Corrigido, 100 |
| --- | --- | --- | --- |
| Leads cadastrados | ✕ 35 duplicados de 578 | ✓ 594, 0 perdidos, 0 duplicados | ✓ 1.401, 0, 0 |
| Mensagem colada | ✓ | ✓ 192 | ✓ 386 |
| Interações | ✕ 25 duplicadas | ✓ 660 | ✓ 1.812 |
| Visitas agendadas | ✕ 19 duplicadas | ✓ 321 | ✓ 930 |
| Vendas | ✕ 8 duplicadas | ✓ 80 | ✓ 201 |
| Sem resposta | ✕ 37 a mais | ✓ 502 = 502 | ✓ 1.220 = 1.220 |
| Alterações "salvas" que não gravaram | ✕ 4 | ✓ 0 (2 viraram erro na tela) | ✓ 0 (7 viraram erro na tela) |
| Lead sem corretor ativo | ✓ 0 | ✓ 0 | ✓ 0 |
| Histórico de etapa encadeado | ✕ 26 elos fora de ordem | ✓ 0 | ✓ 0 |
| Histórico de temperatura, dono e status | ✕ 3 fora de ordem | ✓ 0 | ✓ 0 |
| Reatribuição com evento "dono" | ✓ 94 | ✓ 112 | ✓ 235 |
| Contador de tentativas = interações | ✕ 7 leads | ✓ 0 | ✓ 0 |
| Último contato = interação mais recente | ✕ 18 leads | ✓ 0 | ✓ 0 |
| Baixas de visita gravadas | ✓ | ✓ 246 | ✓ 244 |
| 1 lançamento de pontos por visita realizada | ✓ 204 | ✓ 201 | ✓ 205 |
| Período da recepção sem turno duplicado | ✓ | ✓ 95 | ✓ 140 |
| Auditoria dos lançamentos | ✓ | ✓ | ✓ |
| Aviso enviado uma vez só (rodadas simultâneas) | ✓ 1.054 | ✓ 1.066 | ✓ 1.086 |

O que já estava certo antes: as visitas e os pontos (a baixa dupla gera um lançamento só, porque `visita_id` é único), o turno da recepção (índice único), a função `avisos` (`push_log` com chave) e o evento de cada reatribuição.

## 5. Problemas achados e o que foi corrigido

A auditoria do código veio antes da carga, e a carga confirmou cada caso. Os números de linha são do código de hoje.

| # | Problema | Onde | Correção | Commit |
| --- | --- | --- | --- | --- |
| 1 | **Perda silenciosa.** O update da ficha não conferia se gravou. Com o lead reatribuído no meio, o RLS não dá erro, só não altera nada, e a tela mostrava salvo. Valia para etapa, temperatura, perfil, Desfazer, Atribuir e próximo contato | `crm/src/app/leads/ficha/page.tsx:154`, `:170`, `:185` | `alterarLead` (`crm/src/lib/leads-dados.ts:94`) pede a linha de volta e, sem ela, mostra "Não foi salvo: este lead mudou de dono…" | `ec45c74` |
| 2 | **Lead duplicado no reenvio.** A resposta se perde no 4G, a pessoa toca em Cadastrar de novo e o banco cria outro lead. Se a mensagem colada falhava, o novo toque também criava outro lead | `crm/src/app/leads/novo/page.tsx:132` | O id nasce no aparelho e fica até o fim. No novo toque, o banco recusa a cópia (`leads_pkey`) e o app entende que já estava salvo (`jaEstavaSalvo`, `crm/src/lib/erros.ts`) | `97a240b` (SQL), `ec45c74` |
| 3 | Interação, visita e venda duplicadas no reenvio | ficha `:609`, `crm/src/components/visitas/visitas.tsx:525`, `crm/src/components/vendas/vendas.tsx:79` | O mesmo id gerado no aparelho | `97a240b`, `ec45c74` |
| 4 | **Sem resposta (+1) sem trava.** O toque duplo contava 2 tentativas | `crm/src/lib/leads-dados.ts:72` (ficha e lista do dia) | O segundo toque, com o primeiro ainda gravando, é ignorado | `ec45c74` |
| 5 | "Mudar o dia" do próximo contato e "Atribuir" mostravam ✓ mesmo quando falhavam | ficha `:563`, `:733` | Só mostram ✓ quando gravou | `ec45c74` |
| 6 | **Perfil sobrescrevia tudo** (last-write-wins): salvava todos os campos, inclusive os que outro aparelho tinha mudado | ficha `:170`, `crm/src/components/leads/perfil.tsx:199` | Vão só os campos diferentes do que a ficha mostra | `ec45c74` |
| 7 | **O Desfazer passava por cima** do que mudou depois | ficha `:185` | Só desfaz se o lead ainda estiver como ficou | `ec45c74` |
| 8 | Contador de tentativas e "último contato" errados com duas interações juntas no mesmo lead | `lead_interacao_carimbo` no `schema.sql` | O gatilho trava o lead e usa `clock_timestamp()` | `97a240b` |
| 9 | Histórico fora de ordem com duas mudanças juntas: `now()` é a hora do início da transação | `lead_eventos.criado_em` | `default clock_timestamp()` | `505eabe` |
| 10 | **Painel do gerente lento** (2 a 9 s). `pode_ver_dados_de` roda linha a linha no RLS e fazia 6 consultas aninhadas, ~3 ms por linha | `schema.sql`, `pode_ver_dados_de` | Mesma regra numa consulta só: 2,3 s caiu para 94 ms. O teste de equivalência compara com a regra antiga em vários perfis | `9790760` |
| 11 | Sessão expirada e limite de entradas do Auth apareciam em inglês | `crm/src/lib/erros.ts` | Viram frases em pt-BR | `ec45c74`, `38686b7` |

Testes que reproduzem cada caso:
- `crm/src/lib/erros.test.ts`: reconhecimento do reenvio e frases de erro.
- `crm/supabase/testes/leads.test.mjs`: reenvio com o mesmo id nas quatro tabelas, ordem das interações, ordem dos eventos e equivalência do RLS.
- A carga em si, com `--cliente atual` e `--cliente corrigido`.

## 6. Pendentes e propostas

| # | O quê | Risco | Proposta |
| --- | --- | --- | --- |
| P1 | **Sem rascunho.** Se o app fecha, o celular descarrega ou a sessão cai (a casca manda para `/entrar`), perde-se o que foi digitado no cadastro, na interação, no perfil e na venda | Médio: o lead que o corretor estava digitando some | Guardar o formulário no aparelho (`sessionStorage`) a cada mudança e limpar ao salvar. Não muda o visual. Vale fazer logo depois da revisão visual, para não conflitar com ela |
| P2 | **Sem fila offline.** Sem internet, cada salvar dá "Sem conexão" e o texto fica na tela. A faixa "Sem internet" avisa (`crm/src/components/aviso-offline.tsx`) | Baixo com P1 feito | Fila no aparelho que reenvia sozinha ao voltar a internet, segura graças ao id gerado no aparelho. É mudança grande; fica para depois do uso real |
| P3 | Telas do gerente geral (Configurações, Equipes, Usuários, Faixas, Metas, Programa) fazem update sem conferir linhas | Baixo: o gerente geral tem todas as permissões | Usar o mesmo padrão de `alterarLead` quando mexer nessas telas |
| P4 | Salvar as tipologias de um empreendimento leva várias requisições sem transação. Uma falha no meio deixa parte salva (`crm/src/lib/catalogo-dados.ts:105`) | Baixo: só o operacional mexe, e salvar de novo corrige | Mover para uma função no banco (uma transação) |
| P5 | Baixa "realizada" grava o último contato com `now()` | Muito baixo: a conferência passou | Trocar por `clock_timestamp()` se aparecer |

## 7. Plano e compute: 40 pessoas cabem?

**Sim, com folga, no Pro com compute MICRO** (1 GB, CPU compartilhada). Os limites são da [documentação do Supabase](https://supabase.com/docs/guides/platform/compute-and-disk).

| Limite do MICRO | Valor | Usado no teste |
| --- | --- | --- |
| Conexões diretas ao Postgres | 60 | 17 no máximo (15 do pool do PostgREST e 2 do monitor), com 100 sessões |
| Clientes no pooler (Supavisor) | 200 | O app não usa: tudo passa pelo PostgREST |
| Auth: entrar e renovar token, por IP | 150 a cada 5 min, rajada de 30 ([doc](https://supabase.com/docs/guides/auth/rate-limits)) | Não testado localmente. Veja abaixo |

**Carga.** O teste fez 13 operações por segundo com 40 pessoas e 31 com 100. No uso real, 40 corretores devem fazer 1 a 2 por segundo. Mesmo que o MICRO seja 3 ou 4 vezes mais lento que esta máquina, o banco fica bem abaixo do limite, porque as operações levam 10 a 20 ms. O que pesava era o painel (2 a 9 s antes); com a correção, ele não prende mais a fila.

**Auth.** O limite é por IP. Com todo o plantão no mesmo Wi-Fi, se mais de 30 pessoas entrarem no mesmo minuto (às 9h, por exemplo), algumas veem "Muita gente entrando ao mesmo tempo. Espere um minuto e tente de novo." Na prática é raro, porque a sessão fica salva no aparelho e a renovação do token acontece 1 vez por hora por pessoa. Se acontecer, aumente o limite em Authentication > Rate Limits.

**Quando subir para o SMALL** (2 GB, 90 conexões): se o relatório de banco do Supabase (Reports > Database) mostrar CPU acima de 70% por vários minutos, ou se o painel passar de 1 s com uso normal. O teste não indica isso para 40 pessoas.

## 8. Como repetir o teste

Na primeira vez, `npm install` baixa o Postgres local (~100 MB, só em localhost). Ele cria a pasta `crm/supabase/testes/carga/.local/`, fora do git. Não pede senha nem conta, e cada rodada recria o banco do zero.

1. Pare o `npm run dev` se estiver ligado (só para não disputar CPU).
2. No `crm/`, rode a carga de 40 e a de 100:
   ```bash
   npm run test:carga -- --usuarios 40 --minutos 10
   ```
   ```bash
   npm run test:carga -- --usuarios 100 --minutos 10
   ```
3. No fim aparecem a tabela de latências, as ocorrências e a conferência, com ✓ ou ✕ por item. O detalhe vai para `crm/supabase/testes/carga/resultados/`. O comando termina com erro se alguma conferência falhar.
4. Opções:
   - `--cliente atual` imita o app de antes;
   - `--pool 20` muda o pool;
   - `--pausa-min` e `--pausa-max` (ms) mudam o ritmo.
5. Para comparar com um schema antigo: `CARGA_SCHEMA=<arquivo.sql> npm run test:carga -- --cliente atual`.

Rode de novo depois de mudanças grandes em RLS, gatilhos ou telas de cadastro.

## 9. SQL para rodar no Supabase

Rode no SQL Editor **antes** de publicar o site novo. O `schema.sql` inteiro também serve, porque pode ser rodado de novo. O trecho abaixo é só o que mudou:

```sql
-- 1. Visibilidade numa consulta só (mesma regra, 24x mais rápida).
create or replace function public.pode_ver_dados_de(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles eu
    where eu.id = auth.uid() and eu.ativo
      and (p_user = eu.id
           or eu.perfil = 'gerente_geral'
           or exists (select 1 from public.role_permissions rp where rp.perfil = eu.perfil and rp.permissao = 'dados.ver_todos')
           or (eu.perfil = 'gerente'
               and exists (select 1 from public.role_permissions rp where rp.perfil = eu.perfil and rp.permissao = 'dados.ver_equipe')
               and exists (select 1 from public.profiles m join public.teams t on t.id = m.equipe_id
                           where m.id = p_user and t.gerente_id = eu.id)))
  );
$$;

-- 2. O app manda o id gerado no aparelho (o reenvio não duplica).
grant insert (id) on public.leads to authenticated;
grant insert (id) on public.lead_interacoes to authenticated;
grant insert (id) on public.visitas to authenticated;
grant insert (id) on public.vendas to authenticated;

-- 3. Interações na ordem em que foram gravadas.
create or replace function public.lead_interacao_carimbo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.texto := btrim(new.texto);
  if auth.uid() is not null then
    perform 1 from public.leads where id = new.lead_id for no key update;
    new.autor_id := auth.uid();
    new.criado_em := clock_timestamp();
  end if;
  return new;
end;
$$;

-- 4. Histórico do lead na ordem real das mudanças.
alter table public.lead_eventos alter column criado_em set default clock_timestamp();
```

Para conferir, rode o comando abaixo. Ele deve devolver `true`:

```sql
select has_column_privilege('authenticated', 'public.leads', 'id', 'INSERT');
```
