# Brief: direcionador de leads, código (Base360 Marketing)

Sumário: Leia antes · O que o Felipe pediu · Decisões técnicas · Etapas · Arquivos permitidos · Pronto quando · Limites.

## Leia antes
- `CLAUDE.md`, `docs/design-system.md` e a skill `.claude/skills/tela-ds-mbigucci/SKILL.md`.
- **`docs/direcionador/direcionador.md`**, a fonte deste brief. As decisões estão no topo, em rodadas (a quarta vale sobre a terceira, que vale sobre a segunda e a primeira). As seções 4 a 9 têm o fluxo, as regras, o banco e o que fica registrado.
- `docs/direcionador/porta-de-entrada-leads.md`: o contrato da entrega por POST.
- `docs/estudo-roleta-leads.md`, seção 8: a função do Vendas que recebe o lead da empresa (`lead_empresa_entrada`). **É de outro brief**, da sessão principal do Vendas.
- O protótipo aprovado: `docs/mockups/direcionador.html` (Artifact https://claude.ai/artifact/H5nuk9PradEcy6MgFHfXjJ).
- Modelos no código:
  - `crm/supabase/functions/avisos/index.ts`: Edge Function num arquivo só, regras puras testadas no `npm test`, segredos só nos Secrets;
  - `crm/supabase/agendar-avisos.sql`: `pg_cron` com `pg_net` e o segredo no Vault;
  - `crm/supabase/parcerias.sql` e `crm/supabase/testes/`: SQL idempotente num arquivo próprio e testes no PGlite;
  - `crm/src/lib/cadastro-magico.ts` e `catalogo.ts` (`acharNoCatalogo`): o leitor de e-mail de portal e o reconhecimento do produto.

## O que o Felipe pediu (05/11/2026)
- **Direcionador:** regras por produto, fonte, dia e horário, cada uma com chave liga/desliga, e uma chave geral. A primeira regra ligada que casar decide. Sem regra, ou com a chave geral desligada, o lead vai para o Base360 Vendas.
- **Decide antes de gravar:** o lead chega, as regras são aplicadas em memória, e só depois ele é gravado ou entregue.
- **Destinos:** além do Vendas, quantos destinos o Felipe quiser, cadastrados na tela: nome, entrega (e-mail ou porta de entrada), endereço e limite por dia. Exemplo: uma imobiliária parceira do stand, com CRM próprio, que não acessa o Base360.
- **Sigilo:** um dos destinos se chama "Distribuição manual". O destino real **nunca é nomeado** em código, banco, docs, commits ou mensagens. O nome é um dado que o Felipe digita na tela; não vai em seed nem em código. Só o gerente geral vê o direcionador, por regra fixa no banco.
- **Registro por destino ("Registrar os envios"):**
  - ligado (parceiros): o lead entra na base de contatos do Marketing, com o evento "Enviado ao parceiro <nome>" no histórico;
  - desligado (Distribuição manual): nada fica.
- **Divisão:** a regra pode dividir entre destinos em porcentagem (soma 100%), com contador para a divisão ser exata. O contador guarda só números e só o gerente geral lê.
- **Limite por dia:** cada destino pode ter um teto. Passou do teto, o resto do dia vai para o Vendas.
- **Falha:** uma tentativa só. Se a entrega falhar, o lead vai na hora para o Vendas.
- **Entrada:** por e-mail. Uma regra do Outlook do Felipe redireciona os leads do site e dos portais para uma caixa compartilhada interna e apaga o original. Um app lê essa caixa pela Microsoft Graph. Webhooks ficam para depois.
- **Repetido:** as regras sempre decidem, mesmo com lead ativo no Vendas. Produto não reconhecido não casa com regra de produto específico.
- **Sem histórico de mudanças das regras.**
- **Onde:** tela do Marketing, `base360.mbigucci.com.br/marketing`, só com o login do Base360. O menu Direcionador aparece só para o gerente geral.
- **Vai ao ar junto com a distribuição automática do Vendas** (decisão 4).

## Decisões técnicas
- **App do Marketing novo:** pasta `marketing/` no repositório, Next.js 15 estático como o `crm/`, `BASE_PATH=/marketing`. A casca (cabeçalho, lateral, tema, login) é a do Vendas, pelos tokens de `marca/tokens/`, com o logo "Base360 · Marketing". Copie o necessário de `crm/src/components/` e `crm/src/lib/` sem alterar o `crm/`. Nesta etapa o app tem só o login e a tela Direcionador.
- **Mesmo Supabase do Vendas.** O SQL fica em `crm/supabase/direcionador.sql`, idempotente, porque o banco é um só e os testes de banco já moram em `crm/supabase/testes/`. Ele roda depois do `schema.sql` e do SQL da distribuição automática.
- **Banco:**
  - Tabelas num esquema que **não** está em "Exposed schemas" (proposta: `interno`):
    - `direcionador_config` (uma linha: `ativo`);
    - `direcionador_destinos` (`tipo` vendas/externo, `nome`, `modo` email/porta, `registrar_envios`, `limite_dia`, `ativo`);
    - `direcionador_regras` (nome, ativa, ordem, produtos, fontes, dias, `hora_inicio`, `hora_fim`);
    - `direcionador_regra_partes` (regra, destino, porcentagem);
    - `direcionador_contadores` (regra, destino, enviados);
    - `direcionador_contagem_dia` (destino, dia, total);
    - `lead_fontes` (catálogo das fontes e como reconhecê-las).
  - A tela usa só funções RPC em `public`, todas com `is_gerente_geral()` e **nomes neutros** (`cfg_ler`, `cfg_salvar`…), sem "direcionador", "destino" ou "distribuição".
  - Endereços (e-mail, URL e chave da porta) **só no Vault**, um por destino. Duas funções: uma grava; outra devolve só a versão mascarada.
  - O seed cria só a linha do Base360 Vendas e a config desligada.
- **Base de contatos mínima do Marketing**, só para o registro dos parceiros: `mkt_contatos` (nome, telefone normalizado, e-mail) e `mkt_contato_eventos` (contato, tipo `enviado_parceiro`, destino, produto, fonte, quando). Leitura só do gerente geral nesta etapa. A tela de contatos fica para a etapa 2 do roteiro do Marketing; aqui o histórico é gravado e testado.
- **Regra pura** `marketing/src/lib/direcionador.ts`, com testes no `node --test`. Faz quatro coisas:
  - casar a regra (produto, fonte, dias, horário em `America/Sao_Paulo`, intervalo que vira a meia-noite, fim exclusivo, 0h–0h = dia inteiro);
  - escolher o destino pela divisão (menor `enviados / porcentagem`; empate, a ordem da regra);
  - conferir o limite do dia;
  - dar o motivo de cada regra pulada, para o simulador.

  A tela e a Edge Function usam a mesma regra: a Edge Function leva uma cópia num arquivo só, como a `avisos`, e um teste confere que a cópia bate com o original.
- **Escolha com trava:** a escolha do destino e o incremento dos contadores ficam numa função do banco (`security definer`, só `service_role`), com `pg_advisory_xact_lock` próprio, para dois leads ao mesmo tempo não lerem o mesmo contador.
- **Leitor de e-mail:** `marketing/src/lib/leitor-email.ts`, puro e testado. Reconhece a fonte pelo remetente e pelo assunto (tabela `lead_fontes`), extrai nome, telefone (com `normalizarWhatsapp`), e-mail, mensagem e produto (`acharNoCatalogo`), reaproveitando a lógica do Cadastro Mágico. **Os testes usam os e-mails de exemplo do Felipe com os dados do cliente trocados.** Até eles chegarem, use exemplos fictícios marcados como tal.
- **Edge Function `entrada-leads`** (`crm/supabase/functions/entrada-leads/index.ts`):
  - chamada a cada 1 min pelo `pg_cron` (`crm/supabase/agendar-entrada.sql`), com segredo no cabeçalho, como a `avisos`;
  - token da Graph por client credentials; o id do locatário, o id do app e o segredo ficam só nos Secrets;
  - lê os e-mails não lidos da caixa de entrada, normaliza, decide e entrega:
    - **Vendas:** chama `lead_empresa_entrada(...)` do brief da distribuição automática, idempotente pelo `entrada_id` (o `internetMessageId`);
    - **externo por e-mail:** `sendMail` com `saveToSentItems: false` e assunto fixo "Novo contato". O corpo leva só os dados do contato, o produto, a fonte, a data e o `Id:`; nunca nome de regra, de destino ou qualquer coisa interna;
    - **externo por porta:** POST conforme `porta-de-entrada-leads.md`, timeout de 10 s;
  - limite do dia passou ou entrega falhou: vai para o Vendas na mesma passada;
  - parceiro com `registrar_envios`: grava o contato e o evento no Marketing;
  - depois de entregar ou gravar, apaga o e-mail (`permanentDelete`). Se a gravação no Vendas falhar, o e-mail fica e volta na passada seguinte;
  - **logs sem dado de cliente:** só o id, a hora e o código. A entrega é feita pelo `fetch` da própria função, nunca pelo `pg_net`.
- **Até o Vendas ter a `lead_empresa_entrada`:** a função tem um modo de teste (Secret `MODO=teste`) que decide e registra só o resultado no log, sem dados do cliente, sem entregar e sem apagar.

## Etapas
O mockup já foi aprovado (Artifact acima). Pare ao fim de cada etapa e entregue os arquivos, o resultado dos testes e as pendências.

1. **Banco:** `crm/supabase/direcionador.sql` e `crm/supabase/testes/direcionador.test.mjs`. O teste entra no `test:banco`, combinado com a sessão principal do Vendas, porque mexe no `crm/package.json`. **Parar.**
2. **Regras puras:** `direcionador.ts` e `leitor-email.ts`, com testes (casar a regra, meia-noite, divisão exata em 10 leads 70/30, limite do dia, produto não reconhecido, leitor das 5 fontes). **Parar.**
3. **Edge Function e agendamento,** com testes das partes puras e da montagem do e-mail e do POST (sem rede). **Parar.**
4. **App do Marketing e tela Direcionador:** chave geral, regras (criar, editar, ligar, ordem), destinos (criar, editar, endereço mascarado, limite, registrar), simulador e os contadores. Mobile primeiro, nos dois temas. **Parar** para o Felipe ver.
5. **Docs:** a seção "Como ficou" em `docs/direcionador/direcionador.md`, o passo a passo de instalação para o Felipe e o TI (caixa compartilhada, app no Entra, RBAC, Secrets, SQL, deploy, regra do Outlook) e o índice do `CLAUDE.md`.

## Arquivos permitidos
- **Criar:**
  - `marketing/` inteiro;
  - `crm/supabase/direcionador.sql`, `crm/supabase/agendar-entrada.sql` e `crm/supabase/testes/direcionador.test.mjs`;
  - `crm/supabase/functions/entrada-leads/`.
- **Alterar:** `docs/direcionador/direcionador.md`, `CLAUDE.md` (índice) e, combinado com a sessão principal do Vendas, `crm/package.json` (só o script `test:banco`).
- **Não tocar:**
  - o resto do `crm/`, inclusive `schema.sql`, a função `lead_empresa_entrada` e as telas do Vendas (são da distribuição automática);
  - `portal/`, `discovery/` e `ref/`;
  - `marca/`: só leitura dos tokens.

## Pronto quando
- O SQL roda três vezes sem erro no PGlite, e os testes por perfil passam:
  - só o gerente geral lê e grava o direcionador;
  - corretor, gerente, operacional, recepção, desativado e anônimo recebem zero linhas e erro ao gravar;
  - a função de endereço nunca devolve o valor inteiro;
  - dois leads ao mesmo tempo não repetem o contador.
- Os testes puros passam: os casos de horário da seção 5 do estudo, a divisão exata, o limite do dia, a falha indo para o Vendas e o leitor das 5 fontes.
- A tela abre em 375px e no computador, nos dois temas, e o simulador responde às regras como o protótipo.
- **Sigilo:**
  - busca no `out/` do Marketing, no SQL, na Edge Function e nos commits sem nenhum nome de destino;
  - o seed não cria nenhum destino externo;
  - os logs não têm dados de cliente.
- O relatório separa o que foi conferido em teste isolado do que só o Felipe e o TI podem conferir (caixa real, Graph, deploy).

## Limites
- Nenhuma credencial real nem recurso externo: nada de caixa, app no Entra, Secrets, deploy ou SQL no Supabase real. Isso é do Felipe, com o passo a passo da etapa 5.
- Nenhum dado real de cliente. Os e-mails de exemplo chegam com os dados trocados.
- Sem instalar pacote novo sem ok. Para o `marketing/`, use as mesmas versões do `crm/package.json`, e peça antes de rodar `npm install`.
- Testes isolados, sem rodar a suíte ao mesmo tempo que outra frente. Sem commit: a sessão principal do Marketing revisa e commita.
- **Sigilo:** nunca nomear, procurar ou citar o destino real, em nenhum arquivo, commit, mensagem ou relatório.
