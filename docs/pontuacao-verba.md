# Pontuação, verba de leads, premiação e roleta

> Fontes: `docs/fontes/regras-comerciais-2026-10.md` (o documento original do Felipe) e a conversa de 28/10/2026.
>
> **Sumário:** Contexto · Pontuação → verba · Lançamentos · Prêmio dos gerentes · Premiação por VGV · Roleta · Como ficou (08/11/2026): telas, banco, decisões, o que cada perfil vê, SQL, testes e o que veio da Bruna.
>
> **Sem sigilo desde 04/11/2026:** o Felipe acabou com o sigilo e com a chave "Programa de verba ativo", porque o CRM só vai ao ar depois do anúncio das regras novas. Verba por corretor, pontos, ranking e o fim dos leads do Google aparecem para quem tem permissão. A publicação no WordPress continua sendo decisão do Felipe. As Faixas de VGV continuam só do gerente geral. O que era o sigilo está em `docs/historico.md`.

## Contexto

A MBigucci sai do tráfego pago centralizado (roleta de leads do Meta; as regras de outubro dizem "Google", corrigido pelo Felipe em 05/11/2026) e passa a dar uma verba mensal a cada corretor, que impulsiona os próprios anúncios. A verba vem dos pontos.

**Conciliação do fim do mês (decisão do Felipe em 04/11/2026):** o **marketing** confere os leads das campanhas de cada corretor contra os leads cadastrados no CRM. Diferença **não desconta** nada sozinha: vira conversa e um **alerta para o gerente** da equipe. Ainda não implementada (entra com os relatórios, `docs/estudo-relatorios.md`).

**Faixas de VGV (D11 de `docs/estudo-relatorios.md`, 04/11/2026):** o gerente passará a ver as faixas da própria equipe; só o gerente geral altera as regras. Ainda não implementado: hoje continuam só do gerente geral.

## Pontuação → verba de leads (mensal)

| Critério | Pontos | Limite no mês | Máximo |
| --- | --- | --- | --- |
| Período integral cumprido (9h–14h ou 14h–19h) | 5 | 24 períodos | 120 |
| Vídeo ou blitz | 5 | 12 ações entre os dois tipos | 60 |
| Visita **realizada** | 10 | 12 visitas | 120 |
| **Total possível** | | | **300** |

Regras:
- **1 ponto = R$ 10** de verba.
- A verba e a premiação calculadas em um mês são **liberadas no mês seguinte**.
- A venda conta no **mês da assinatura**. A MBigucci não fecha o mês sem assinar a venda.
- **Mínimo:** 130 pontos. Abaixo disso, a verba é R$ 0.
- **Sem trava em 200:** até 300 pontos viram verba, mesmo sem venda. O teto acompanha a soma dos máximos dos critérios, editáveis pelo gerente geral.
- **Cada venda** assinada e paga soma **R$ 1.000** de verba extra, mas só para quem atingiu os 130 pontos. A venda não substitui os demais critérios.
- Só contam visitas **realizadas**.
- **Sem regra de primeiro mês** (decisão do Felipe, 29/10/2026): o documento original previa R$ 1.000 fixos no primeiro mês, mas o que o corretor faz no primeiro mês já conta para a verba do segundo. O CRM não tem essa regra em lugar nenhum.

Cálculo em `programa.ts`, testado com os sete exemplos atualizados:

```
pontos = min(períodos,24)*5 + min(vídeos + blitz,12)*5 + min(visitas_realizadas,12)*10
se pontos < 130            → verba = 0
senão                      → verba = pontos*10 + vendas_mes*1000
```

Exemplos revisados com Felipe em 08/11/2026 (ações podem ser divididas entre vídeo e blitz):

| Perfil | Pontos | Verba |
| --- | --- | --- |
| Só frequência completa | 120 | R$ 0 |
| Frequência completa + 2 ações | 130 | R$ 1.300 |
| Frequência completa + 12 ações + 2 visitas | 200 | R$ 2.000 |
| Sem frequência: 12 ações + 7 visitas | 130 | R$ 1.300 |
| Sem frequência: 12 ações + 12 visitas | 180 | R$ 1.800 |
| Tudo completo, sem venda | 300 | R$ 3.000 |
| Tudo completo + 1 venda | 300 | R$ 3.000 + R$ 1.000 = R$ 4.000 |

## Lançamentos de pontos

- O gerente geral, o operacional, o gerente e a recepção lançam pontos. **Só contam depois que o gerente geral aprova.**
- Cada lançamento guarda: o corretor, o critério, a data, a quantidade, quem lançou, o comprovante (foto ou link), o status e quem aprovou.
- Como o lançamento vira dinheiro, cada alteração fica registrada: quem fez, quando e o que mudou.
- **O próprio corretor envia vídeo ou blitz para si** (`acoes.registrar`), uma ação por envio, sempre pendente. Vídeo exige print ou link HTTPS; blitz exige foto. Não pode enviar período nem visita para si ou ação para outro corretor.
- Vê os próprios aprovados e as próprias ações aguardando aprovação. Pode Desfazer o próprio pendente; cancelados não aparecem. A baixa da própria visita continua invisível enquanto pendente.
- Ao atingir 12 lançadas válidas/aguardando, o app avisa e continua aceitando reservas. Só 12 aprovadas pontuam. Recusadas e canceladas deixam de ocupar essa contagem.
- Foto e print são convertidos em JPEG e reduzidos no aparelho com canvas para até cerca de 1 MB antes do upload. Sem pacote, serviço externo ou limite de tamanho para o corretor calcular. Se o aparelho não consegue abrir a imagem, o arquivo não é enviado e a tela pede outra foto/print.
- Bucket privado `comprovantes`, caminho `autor/uuid.jpg`: dono e gerente geral leem; autor com permissão envia; sem sobrescrita. URLs assinadas duram 120 segundos. Arquivos referenciados não podem ser removidos; só órfãos do próprio autor.
- Vídeos antigos recebem `tipo_acao='video'` e a marca interna de legado, sem perder aprovações ou exigir comprovante retroativo.

## Prêmio mensal dos gerentes (dinheiro de uso livre)

| Critério | Regra | Máximo |
| --- | --- | --- |
| Parceiros novos | 5 pontos por parceiro cadastrado pelo próprio gerente no mês, até 20 | 100 pontos |
| Check-ins nos stands | 1 por stand e semana; só recebe se cumprir todas as obrigações do mês | 100 pontos |
| Total | R$ 10 por ponto, **sem mínimo** | 200 pontos / R$ 2.000 |

- Parceiros contam automaticamente, sem aprovação. Reativar um parceiro ou recebê-lo pela roleta não cria pontos: conta o cadastro original manual e o seu autor, pelo mês de criação em São Paulo.
- A semana pertence ao mês da segunda-feira. Exemplo: 30/11 a 06/12 pertence a novembro. O fechamento de novembro deve considerar também essa semana.
- O gerente geral define os stands em Pontos → Conferir gerente. Inclusões começam na segunda-feira seguinte. Retiradas encerram a obrigação na segunda-feira seguinte, preservando a semana atual e as anteriores. As vigências ficam guardadas; nenhum vínculo é apagado.
- Sem obrigações de stand no mês: **zero** pontos de check-in. Uma falta em qualquer stand/semana perde os 100 pontos. O painel das semanas avisa essa perda no topo e deixa de sugerir “A cumprir” nas semanas restantes.
- Check-in usa a localização do celular e o mesmo raio do corretor. Só o próprio participante registra, dentro de um stand de sua vigência. O servidor carimba semana/hora, recalcula Haversine e rejeita fora do raio, posição ausente ou precisão maior que 100 m. Não há digitação manual, backdate nem exceção pela recepção.
- Pontos garantidos e R$ 1.000 condicionados aos check-ins ficam separados até concluir todas as semanas.
- Prêmio liberado no mês seguinte, após o fechamento manual pelo gerente geral. 20 parceiros + todos os check-ins = R$ 2.000; uma falta = R$ 1.000; 3 parceiros sem check-in = R$ 150.

## Premiação mensal por VGV (dinheiro)

| VGV no mês | Prêmio |
| --- | --- |
| R$ 1.000.000 | R$ 2.000 |
| R$ 1.500.000 | R$ 3.000 |
| R$ 2.000.000 | R$ 5.000 |
| R$ 3.000.000 ou mais | R$ 10.000 |

Vale só a faixa mais alta atingida (não acumula), e só contam vendas **assinadas e pagas**. A premiação também é liberada no mês seguinte.

**Construído em 29/10/2026** (`docs/vendas-metas.md`, seção 6): a tabela de faixas é configurável e o cálculo por corretor e mês fica na tela Faixas de VGV, só do gerente geral. Os textos da tela vêm de `app_settings`, e o código do site não cita a premiação.

## Roleta do fim de semana

- Entra na roleta quem cumpriu **6 períodos completos na semana**. Os períodos são 9h–14h (manhã) e 14h–19h (tarde).
- Quem não cumpriu os 6 períodos pode ir ao plantão se tiver **visita agendada**, mas fica fora da roleta.
- A saída para fazer visita durante o período é comprovada com foto para a recepcionista, para o corretor não perder o período.
- Os períodos lançados para a pontuação já dão ao CRM o que ele precisa para mostrar quem está apto.
- Quem registra os períodos no dia a dia é a **Recepção**, na tela Plantão (ver `docs/acessos-perfis.md` e a seção abaixo).

## Como ficou (08/11/2026)

Construído em 29/10/2026 atrás da chave `programa_verba_ativo`. **Atualizado em 04/11/2026:** a chave acabou, e quem vê cada tela sai só das permissões (tabela abaixo).

### Telas

| Tela | Quem vê | O que faz |
| --- | --- | --- |
| **Pontos** (`/programa/`) | Só o gerente geral | Resumo por corretor e por gerente; critérios editáveis; atribuição e retirada de stands com vigência; conferência das semanas; fechamento conjunto dos dois programas numa transação. |
| **Aprovar lançamentos** (`/programa/aprovacao/`) | Só o gerente geral | Fila com filtros por situação, corretor, critério e semana. Aprovar e recusar um a um ou em lote (a recusa pede motivo), com Desfazer, e "Voltar para pendente". |
| **Plantão** (`/plantao/`) | Quem tem `plantao.registrar` (recepção, operacional) ou `lancamentos.registrar` (gerente, operacional), e o gerente geral | O dia, no celular ou no tablet: cada corretor com manhã (9h–14h) e tarde (14h–19h). "Cumpriu o período" e "Saiu para visita" (com o link da foto) geram lançamentos pendentes, com Desfazer. Roleta da semana. Lançar vídeos (com `lancamentos.registrar`). |
| **Meus pontos** (`/meus-pontos/`) | Corretor por `leads.cadastrar`/`acoes.registrar`; gerente por `pontos_gerente.participar` | Corretor: verba, mínimo, pontos aprovados, próprias ações aguardando e envio de vídeo/blitz. Gerente: prêmio garantido/condicionado, parceiros, semanas por stand e prêmio liberado do mês anterior. |
| **Check-in nos plantões** (`/checkin-gerente/`) | `pontos_gerente.participar` | Stand da semana, localização e confirmação. Semana/hora e raio são conferidos no servidor. |
| **Ranking** (`/ranking/`) | Todo usuário ativo | Pontos aprovados no mês, com os limites, do maior para o menor. Empate fica na mesma posição. |

### Banco (`crm/supabase/schema.sql`, seção "Programa de pontuação e verba")

- **`criterios_pontos`:** período, vídeo e visita, com pontos, limite no mês e máximo (pontos × limite, calculado). O gerente geral edita nome, pontos e limite.
- **`lancamentos_pontos`:** corretor, critério, data, turno, quantidade, `tipo_acao` (video/blitz), comprovante (link) ou `comprovante_arquivo` (caminho privado), saída para visita, observação, visita de origem, status, recusa e carimbos. A ação própria tem quantidade 1; lotes antigos e os lançamentos da equipe preservam a compatibilidade.
  - Um período por corretor, dia e turno (`lancamentos_periodo_unico`, sem contar recusados e cancelados).
  - A visita realizada com baixa entra sozinha como pendente (gatilho `visita_lanca_pontos`), uma vez por visita. A correção que tira a visita de realizada cancela o lançamento; a que volta reativa. As visitas realizadas antes do SQL entram uma vez.
  - **Auditoria:** `lancamentos_pontos_historico` grava a criação e cada mudança de status, motivo, comprovante e decisão, com o autor. Só o gatilho escreve; só o gerente geral lê.
- **`fechamentos_verba`:** a foto do mês por corretor (pontos, pontos válidos, vendas, VGV, verba, prêmio), gravada pelo gerente geral. Fechar de novo substitui a foto.
- **Funções:** `plantao_corretores()` e `ranking_pontos(mes)`. As policies e as funções exigem usuário ativo (`current_perfil()` não nulo) e a permissão de cada caso. `programa_estado()`, `private.ve_programa()` e `private.programa_verba_ativo()` saíram em 04/11/2026; o schema as remove com `drop function if exists`.
- **Tabelas novas:** `gerente_stands` guarda as vigências em segundas-feiras; `checkins_gerente` guarda autor, stand, vínculo, semana, hora, posição, precisão e distância. Escrita só pelas RPCs, sem GRANT de gravação direta. O stand é validado contra o cadastro de plantões pela função, pois o módulo é instalado à parte.
- **`fechamentos_premio_gerente`:** tabela irmã de fechamento, para distinguir dinheiro de uso livre da verba e do prêmio por VGV. `fechar_programa_mes` grava as duas fotos numa transação; o prêmio dos gerentes é recalculado no servidor.
- **Permissões novas:** `acoes.registrar` (corretor) e `pontos_gerente.participar` (gerente). Mantidas `plantao.registrar` (recepção e operacional) e `lancamentos.registrar` (gerente e operacional). Padrões só na criação, sem restaurar permissões retiradas pelo gerente geral.

### Regras decididas na construção

- **Cálculo:** `calcularVerba` usa o mínimo de 130 e o máximo derivado dos critérios, sem trava. `calcularPremioGerente` recebe as vigências e check-ins, sem mínimo, com testes de mês/semana, entrada, retirada, falta, sem stands e limites dos parceiros.
- **Primeiro mês:** sem regra própria. Os pontos dele viram a verba liberada no segundo mês, como em qualquer outro.
- **Liberação:** a verba e o prêmio de um mês aparecem como liberados no mês seguinte. O fechamento é manual, pelo gerente geral.
- **Roleta:** 6 períodos **aprovados** de segunda a sexta. Cada período é meio dia (segunda manhã, segunda tarde e assim por diante), então são até 10 na semana e 6 equivalem a 3 dias inteiros, em qualquer combinação. A tela mostra também os pendentes, para a recepção cobrar a aprovação antes do fim de semana.
- **Quem lança:** equipe e recepção mantêm os acessos existentes. A exceção nova é o corretor com `acoes.registrar`, apenas vídeo/blitz para si. Tudo nasce pendente; cancelamento e Desfazer preservam auditoria.
- **Corretor:** só os próprios aprovados, mais as próprias ações de vídeo/blitz aguardando. A própria visita pendente continua fora da leitura.

### O que cada perfil recebe

Tabela aprovada pelo Felipe em 04/11/2026 (é o que valia com a chave ligada). Conferida em `programa.test.mjs`.

| Perfil | Recebe |
| --- | --- |
| Gerente geral | Todos os lançamentos, auditoria, programas dos corretores e gerentes, stands por gerente e fechamento conjunto. Também as Faixas de VGV, só dele |
| Gerente | Programa próprio de prêmio, check-in nos próprios stands; Plantão, roleta, períodos e vídeos da equipe, ranking |
| Recepção | Plantão de todos os corretores, roleta, os períodos de todos, ranking |
| Operacional | Plantão de todos (`plantao.registrar`); vídeos só de quem vê (precisa de `dados.ver_todos` para todos); ranking |
| Corretor | Meus pontos, verba prevista e fechada, envio próprio de vídeo/blitz e os próprios pendentes de ação, ranking |
| Desativado e visitante | Nada |

### SQL para o Felipe

Rode o `crm/supabase/schema.sql` inteiro no SQL Editor (é idempotente). Ele cria as tabelas e permissões acima e lança como pendentes as visitas já realizadas. Desde 04/11/2026 ele também apaga a chave `programa_verba_ativo` e as funções dela. Depois de rodar, os nomes das tabelas aparecem no catálogo da API para quem tem a chave anon (os dados, não).

Depois rode **`crm/supabase/storage-comprovantes.sql`**, que cria/ajusta o bucket privado e as policies. Em instalação nova, os módulos `recepcao.sql`, `parcerias.sql` e `distribuicao.sql` também precisam estar instalados para stands, coordenadas/raios e cadastros de parceiros. O schema do programa é instalável sozinho e informa quando esses cadastros não estão disponíveis; ele não recria os módulos.

Depois de instalar, Felipe define os stands em Pontos → Conferir gerente. A primeira obrigação começa na segunda-feira seguinte; o SQL não retroage obrigações. Confira o fim de todas as semanas pertencentes ao mês antes do fechamento.

### Testes

- `npm test`: `programa.test.ts` com os 7 exemplos, os limites, os critérios editados, o teto e o mínimo, a liberação, o resumo do mês, a roleta, o período do dia, os filtros da fila e o empate do ranking.
- `npm run test:banco`: `programa.test.mjs`, perfil a perfil (a tabela acima, desativado e visitante sem nada), a limpeza da chave num banco antigo, lançamento, aprovação só pelo gerente geral, Desfazer, auditoria, visita automática sem duplicar e fechamento.
- Capturas e conferência das telas de produção no preview isolado em `crm/local/pontos-gerentes/`, em 375px e desktop, Papel/Grafite. O mockup aprovado em `crm/local/mockup-pontos-gerentes/` não é importado pela aplicação.

### O que veio do CRM da Bruna

| Da Bruna | Como ficou aqui |
| --- | --- |
| Sequência de dias (`computeStreak`, `StreakCard` em `components/performance/cards.tsx`) | **Adaptado** na roleta: em vez da sequência de dias de atendimento, a contagem de períodos aprovados na semana, com "faltam N". |
| Configurações da equipe em `app_settings` (`lib/app-settings.ts`) | **Adaptado:** `app_settings` (só o gerente geral lê) guarda os textos das Faixas de VGV. A chave do programa ficou lá até 04/11/2026. Os critérios ficam numa tabela, porque o corretor precisa lê-los. |
| Página Desempenho (`app/desempenho`) com cards de número grande | **Adaptado** em Meus pontos: número grande da verba, barra até o mínimo e um card por critério. |
| Desfazer em vez de confirmar | **Igual** ao que o CRM já usa (`AvisoDesfazer`): marcar período, aprovar e recusar. |
| Pontos, aprovação, fechamento, ranking | **Não existe na Bruna** (2 usuários, sem equipes). Construído do zero. |
