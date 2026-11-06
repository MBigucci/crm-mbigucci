# Brief: distribuição automática do lead da empresa (Base360 Vendas)

## Leia antes
- `CLAUDE.md` e **`docs/estudo-roleta-leads.md` inteiro**. As decisões do Felipe estão no topo, nas rodadas 1 a 4 (R4-14 a R4-16 incluídas). **Onde o texto do estudo diverge das decisões, valem as decisões.** A seção 8 é o esboço de banco e RLS, e a 12 traz produto, stand, transparência, check-in e check-out.
- `docs/leads.md`: lead da empresa, prazo de 15 min (`prazo.ts`, `fim_do_prazo`, `atribuido_em`), Lead perdido, lead repetido, `leads_guard` e `lead_eventos`.
- `docs/acessos-perfis.md` (perfis, `pode_atribuir_a`, `pode_ver_dados_de`, permissões no catálogo) e `docs/pontuacao-verba.md` (períodos, lançamentos, aprovação, roleta do fim de semana).
- `docs/estudo-checkin-plantao.md` (raio de 200 m, stands, decisões do check-in) e `docs/recepcao.md` (a vez do stand e a hora em que ela fecha, `recepcao.sql`).
- `docs/codex-parcerias.md` e o SQL das parcerias: a roleta de parceiros (fila visível, `pg_advisory_xact_lock` 7305001) é o modelo de transparência e de trava.
- `docs/notificacoes.md`, `crm/supabase/agendar-avisos.sql` e a Edge Function `avisos`: como os avisos saem. O carimbo de `atribuido_em` é o que dispara o push.
- `docs/direcionador/direcionador.md`: a entrada automática do Marketing, que grava o lead da empresa e chama a distribuição. A distribuição não precisa saber nada dos destinos do direcionador.
- Memória do projeto: "Não confundir os corretores". O desempenho da distribuição nunca pode parecer pontos ou verba.

## O que o Felipe pediu (05/11/2026)
Tudo o que está nas decisões do estudo. O essencial:
- **Três modos**, escolhidos pelo gerente geral:
  - **equipe e depois corretor**, o padrão: rodízio igual entre gerentes e, dentro da equipe, o corretor sozinho;
  - **direto ao corretor**, num rodízio entre todos os aptos;
  - **só gerentes**: o lead fica na fila da equipe, sem dono, e o gerente tem 15 min para repassar, senão o Felipe é avisado.

  Há ainda a chave geral **ligada/desligada**.
- **Quem participa:** todos os corretores ativos da equipe, menos quem o gerente tirou e quem desligou o recebimento.
- **Na fila agora:**
  - no horário, só quem fez **check-in no stand** e está com **"Recebendo leads"** ligado;
  - fora do horário, quem está com "Recebendo leads" ligado, o plantão, que desliga sozinho após 30 min sem usar o app;
  - sem ninguém de plantão, o lead fica **represado** e é liberado às 9h.
- **Peso por desempenho:**
  - duas notas com 50% cada: a **Nota do CRM** (prazo de 15 min com 2/3 e follow-up em dia com 1/3) e a **Nota do plantão** (pontos aprovados);
  - 30 dias de janela, recalculado toda segunda;
  - faixas "Acima da média", "Na média" e "Abaixo da média", com pesos 3, 2 e 1, comparadas com a média da empresa (±10%); quem é novo fica "na média";
  - o rodízio é **por créditos**;
  - uma chave desliga os pesos e volta ao rodízio igual.
- **Produtos que o corretor atende:** marcados pelo gerente da equipe, pelo gerente geral e pelo operacional, com a permissão `distribuicao.produtos`. O padrão é atender todos. Se ninguém da equipe atende o produto, o lead pula a equipe sem ela perder a vez.
- **Pulos e posição:**
  - só o **prazo estourado** manda o corretor ao fim da fila, e só aí ele recebe aviso no celular;
  - ausência, visita, produto e "já teve o lead" pulam o corretor, que mantém a posição;
  - botão desligado, pausa e "fora pelo gerente" tiram da fila sem penalidade e sem acumular créditos.
- **Transparência:** em **"Minhas vezes"** o corretor vê a posição, a situação de todos e o motivo detalhado só dos pulos dele. A página **"Como é calculado"** mostra os números dele, com o texto da R4-12. O gerente vê tudo da equipe. O texto deixa claro que o cálculo **não muda pontos nem verba**.
- **Prazo estourado:** o lead passa sozinho a outro corretor **da mesma equipe**, até 2 vezes, nunca ao mesmo. Só sai da equipe se ninguém estiver apto. O gerente é avisado de toda perda.
- **Lead repetido:**
  - com lead ativo, vai ao dono atual com um prazo novo de 15 min, sem gastar vez;
  - com lead descartado, reativa o lead e manda pela roleta.
- **Atribuição à mão conta como vez:** quem recebe vai para o fim da fila.
- **"A distribuir":** a fila do gerente geral e de quem tiver a permissão `leads.distribuir`.
- **Pausa:** o corretor e o gerente pausam, com data de volta opcional, e cada pausa fica registrada.
- **Presença:**
  - o check-in e o check-out são do próprio corretor, por localização, em todos os stands. A recepção não aprova, só vê;
  - com o CRM aberto, o app manda um sinal com a posição. Fora do raio, pergunta "Você saiu do stand?";
  - sem sinal há 30 min, o corretor fica "sem sinal": é pulado mantendo a posição e recebe um aviso;
  - não há check-out automático. A presença sem saída fecha às 19h30 como "sem saída";
  - o corretor pode ficar até 1h15 fora por período, e a visita conta como presença;
  - a regra do período é "chegue até 9h15 (ou 14h15) e fique até 1h15 fora". Quem chega depois da vez fica **o mesmo tempo do atraso a mais**, sem entrar na vez dos clientes do stand, até 2 vezes por semana.
- **Nome:** "Distribuição automática" na tela; `distribuicao` no banco e nas permissões.
- **O jurídico deu ok** para o check-in ligado aos leads **e para a contagem dos períodos**. O check-in não é controle de horário. Não grave nada além do que a distribuição e os períodos precisam.

## Tudo com chave (Felipe, 05/11/2026)
"Tudo isso pode ser desligado ou ligado com opções": cada mecanismo tem a sua chave em **Configurações > Distribuição automática**, só do gerente geral. Cada chave é independente, vale na hora e tem um comportamento definido quando está desligada. Não pode haver mecanismo sem chave, nem dependência escondida entre as chaves.

| Chave | Ligada (padrão das decisões) | Desligada |
| --- | --- | --- |
| Distribuição automática | A roleta escolhe sozinha | O lead da empresa vai para "A distribuir" e é atribuído à mão, como hoje |
| Modo | Equipe e depois corretor / direto ao corretor / só gerentes | (é uma escolha entre três, não liga/desliga) |
| Peso por desempenho | Créditos 3, 2 e 1 pelas duas notas | Rodízio igual |
| Exigir check-in no horário | Na fila só quem fez check-in e está com "Recebendo leads" | **Vale só o botão "Recebendo leads"**, e o check-in some das telas |
| Sinal de localização | "Você saiu do stand?" e "sem sinal" após 30 min | Sem sinal nem pergunta; vale o check-in e o check-out manuais |
| Plantão fora do horário | Recebe quem está com "Recebendo leads" ligado | Fora do horário, todo lead fica represado até as 9h |
| Represar à noite | Sem ninguém de plantão, o lead espera as 9h | Distribui na hora entre os aptos, e o prazo começa na abertura (regra atual do `prazo.ts`) |
| Produtos que o corretor atende | Filtra por produto | Todos atendem todos |
| Redistribuição pelo prazo estourado | Passa sozinho a outro da equipe, até 2 vezes | O gerente é avisado e usa o Lead perdido à mão, como hoje |
| Prazo estourado manda ao fim da fila | Vai ao fim, com aviso | Só pula, mantendo a posição |
| Lead repetido vai ao dono | Mensagem no lead ativo, com prazo novo | Cria lead novo e passa pela roleta |
| Atribuição à mão conta como vez | Quem recebe à mão vai ao fim da fila | Não mexe na fila |
| Transparência ("Minhas vezes") | O corretor vê a posição e os motivos | A tela some para o corretor; o gerente continua vendo |
| **Períodos pelo check-in** (Etapa 2) | O check-in gera o lançamento pendente sozinho | **Os períodos voltam a ser registrados à mão** pela recepção e pelo gerente, como hoje, e o check-in serve só à distribuição (se ligado) |
| Aprovação pelo gerente da equipe (Etapa 2) | Aprovam o gerente da equipe e o gerente geral | Só o gerente geral aprova, como em 29/10 |

**Requisitos:**
- **Onde ficam as chaves:** colunas de `distribuicao_config`, que só o gerente geral altera (`is_gerente_geral()`). Cada mudança fica registrada (quem, quando, de e para).
- **Leitura no banco:** as funções leem as chaves a cada decisão, nunca do app.
- **Telas:** o que está desligado some das telas, sem botão morto.
- **Testes:** cada chave desligada tem teste em `npm run test:banco`, inclusive desligar no meio do dia, com gente na fila e leads represados.
- **Documentação:** `docs/distribuicao-automatica.md` traz esta tabela, com o que acontece com os dados já gravados quando cada chave muda. Por exemplo: ao desligar o check-in, as presenças abertas fecham; ao desligar a redistribuição, as rotinas param sem perder leads.

## Decisões técnicas
- **Arquivo SQL próprio e idempotente**, `crm/supabase/distribuicao.sql`, como o `parcerias.sql`. Os nomes reais são os de `schema.sql`. Siga a seção 8 do estudo, ajustada pelas decisões: modos, equipe primeiro, créditos, produtos, presença e represados.
- **A escolha acontece no banco**, numa função `security definer` com `pg_advisory_xact_lock` de chave **própria** (diferente da 7305001) e `for update` no lead. Ela grava o motivo em `crm.motivo_dono`, e o gatilho `leads_guard` **carimba `atribuido_em`** nas trocas sem usuário logado. É o primeiro teste: sem o carimbo, o prazo e o push quebram (estudo, seção 9).
- **Registro de cada decisão** (estudo, seção 12.6): para cada lead, quem foi considerado, o resultado e o motivo de cada pulo. É a base de "Minhas vezes" e dos avisos, e cada um só lê o que pode ver.
- **Rotinas no `pg_cron`:**
  - redistribuição dos estourados, a cada minuto, com `skip locked`;
  - liberação dos represados às 9h;
  - recálculo das faixas, toda segunda;
  - fim do plantão por inatividade;
  - fechamento das presenças às 19h30.
- **Presença no app:**
  - check-in e check-out pela localização no raio do stand (estudo do check-in);
  - sinal periódico só com o app aberto;
  - nada em segundo plano e nenhum histórico de posição além do último sinal e do que a regra exige.

  Proponha a frequência do sinal.
- **Entrada automática (contrato com o Marketing):**
  - `public.lead_empresa_entrada(...)`, chamada só pela Edge Function do direcionador, nunca pelo front. É idempotente pelo `entrada_id` e faz numa transação a checagem de lead repetido, a gravação e a distribuição;
  - o lead cuja entrega a um destino do direcionador falha também entra por ela;
  - **proponha a assinatura no desenho (Etapa 1.1).** A sessão master fecha com a sessão principal do Marketing antes do código.
- **Permissões no catálogo**, sem `if (role === ...)`: `distribuicao.produtos`, `leads.distribuir` e, se precisar, `distribuicao.pausar_equipe`. A configuração da distribuição é só do gerente geral, por regra fixa (`is_gerente_geral()`), como o horário de atendimento.
- **Telas, celular primeiro, no DS (skill `tela-ds-mbigucci`):**
  - o botão "Recebendo leads" e o check-in/check-out na Lista do dia e no cabeçalho do celular;
  - "Minhas vezes" e "Como é calculado";
  - para o gerente: a fila da equipe, pausas, quem participa e produtos;
  - para o gerente geral: Configurações > Distribuição automática (modo, chave geral, pesos) e "A distribuir".

  Os textos seguem as propostas da R4-8 e da R4-12.

## Etapas
### Etapa 1: presença e distribuição
1. **Desenho (pare para o Felipe ver):** `docs/distribuicao-automatica.md`, com sumário, contendo:
   - as tabelas, as funções, o RLS e as rotinas;
   - a assinatura proposta de `lead_empresa_entrada`;
   - o fluxo de ponta a ponta;
   - os textos de cada tela;
   - os riscos;
   - as perguntas ainda abertas, com a recomendada primeiro.

   Junto vai o mockup `docs/mockups/distribuicao-automatica.html` (corretor, gerente e gerente geral; celular e computador; claro e escuro), publicado como Artifact privado com o link.
2. **Banco e testes** (`npm run test:banco`, PGlite). No mínimo, os testes da seção 8 do estudo, mais:
   - os três modos;
   - equipe que não atende o produto;
   - créditos com pesos 3, 2 e 1, e a chave dos pesos;
   - fora do horário, com plantão e com represados até as 9h;
   - sem sinal, mantendo a posição;
   - prazo estourado indo ao fim da fila;
   - atribuição à mão contando como vez;
   - dois leads ao mesmo tempo;
   - a RLS de cada tela por perfil.
3. **Telas**, com a prévia isolada (`scripts/visual-preview.mjs`) e capturas nos dois temas e nas duas larguras.
4. **Conferência:**
   - typecheck, `npm test`, `test:banco`, `contraste-temas.mjs` e `marca/tokens/conferir.mjs`;
   - o build isolado;
   - o roteiro do Felipe: SQL a rodar, cron, permissões a dar, stands a conferir.

### Etapa 2: períodos pelo check-in (depois da Etapa 1 commitada)
- **Lançamento automático:** o período cumprido pelo check-in vira **lançamento pendente**, sem a recepção marcar. A regra de cumprimento é a R4-5 e a R4-14: chegada até a vez, até 1h15 fora, visita contando e o atraso compensado com o mesmo tempo, até 2 vezes por semana.
- **Quem aprova:** o gerente da equipe e o gerente geral. **Isso muda a regra fixa de 29/10** ("só o gerente geral aprova"). Faça a mudança no banco com a função de aprovação aceitando o gerente da equipe do corretor, e atualize `docs/acessos-perfis.md` e `docs/pontuacao-verba.md`.
- **Plantão:** ajuste a tela Plantão e `recepcao.sql` para mostrar a presença vinda do check-in. A recepção continua podendo marcar onde não houver check-in.
- **Testes:** os casos de cumprimento e de não cumprimento, a aprovação por perfil e a roleta do fim de semana contando os 6 períodos.

## Arquivos permitidos
- `crm/supabase/` (o `distribuicao.sql` novo; `schema.sql`, `recepcao.sql` e `agendar-avisos.sql` só no que a distribuição e os períodos exigem; testes em `supabase/testes/`), `crm/src/` (telas e libs da distribuição, da presença e do plantão), `crm/scripts/visual-*` (fixtures da prévia) e `docs/` (`distribuicao-automatica.md`, o mockup e as atualizações de `leads.md`, `acessos-perfis.md`, `pontuacao-verba.md`, `recepcao.md` e `notificacoes.md`).
- Não tocar: o direcionador e o Marketing (`docs/direcionador/`, `docs/marketing/` e o código deles), `portal/`, `marca/`, `discovery/`, `ref/` e `C:\Projects\base360-repo`.

## Pronto quando
- O desenho foi aprovado pelo Felipe, e a assinatura de `lead_empresa_entrada` foi fechada com o Marketing pela sessão master.
- Um lead fictício pela entrada vai ao corretor certo em cada modo, com o prazo correndo e o push disparado pelo carimbo de `atribuido_em`.
- Os pulos e as posições seguem a R4-9, e "Minhas vezes" mostra a posição e os motivos certos para cada perfil.
- A redistribuição, os represados, o lead repetido, a pausa e "A distribuir" se comportam como nas decisões, com testes gravados.
- Os textos de desempenho não citam pontos nem verba como algo que muda.
- Todas as chaves da tabela "Tudo com chave" existem, funcionam desligadas como descrito, têm teste e somem das telas quando desligadas.
- A suíte completa passa e o build isolado também.
- O relatório separa o que foi testado com dados fictícios do que só o Felipe faz: rodar o SQL, ligar o cron, dar permissões, conferir no celular real e o primeiro lead de verdade.

## Limites
- Sem credenciais reais, sem dados reais de clientes e sem criar recursos externos.
- Sem instalar pacotes nem reiniciar nada sem o ok do Felipe.
- **Sem commit**: a sessão master revisa, roda a suíte e commita.
- Não rode a suíte nem o build ao mesmo tempo que outra frente.
- O desenho de banco que toca a entrada automática passa pela sessão master antes do código.
