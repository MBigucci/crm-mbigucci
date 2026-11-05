# Brief: recepção no CRM (`/recepcao/`), no lugar da planilha

## Leia antes
- `CLAUDE.md`, `docs/design-system.md` e a skill `tela-ds-mbigucci`.
- **`docs/estudo-recepcao.md` inteiro: é a fonte deste brief.** Seções 3 e 3.1 (tela e regra por tipo de cliente), 6 (permissões e RLS), 7 (modelo de dados) e 8 (decisões do Felipe e o que elas mudam no desenho).
  - Onde o estudo fala em sigilo ou chave "Programa de verba ativo", leia "pela permissão": o sigilo acabou em 04/11/2026 (`docs/historico.md`).
- `docs/estudo-checkin-plantao.md` seção 8 (respostas do Felipe), `docs/acessos-perfis.md`, `docs/leads.md`, `docs/pontuacao-verba.md` (períodos, plantão, roleta do fim de semana), `docs/teste-carga.md` (id gerado no aparelho, gravações idempotentes).
- `docs/codex-parcerias.md` e `crm/supabase/parcerias.sql` (a roleta e a entrada de parceiros que a recepção usa).
- Telas atuais: `crm/src/app/plantao/page.tsx` e `crm/src/app/leads/novo/page.tsx`.

## O que o Felipe pediu (04/11/2026)
Trazer para o CRM o trabalho que a recepção faz hoje na planilha, **mudando o mínimo a forma de trabalhar**. Todas as decisões estão no estudo, seção 8. As principais:
1. **Uma tela, `/recepcao/`, feita para o PC da loja** (o celular é reserva). A loja é escolhida na tela e o aparelho lembra.
2. **A vez é a roleta deles, feita na loja.** A recepção põe corretores e especialistas na ordem do dia; o CRM só segue em círculo, pula quem saiu e mostra o próximo. Saída e volta são marcadas pela recepção.
3. **Cadastro por tipo de cliente** (estudo, 3.1):
   - **Novo:** gira a vez de corretores e especialistas; vira lead do corretor da vez, origem Plantão.
   - **Indicação de corretor:** gira só a dos especialistas; acha o lead na carteira do corretor (telefone, depois nome) ou cria com origem Indicação.
   - **Indicação de parceiro:** gira só a dos especialistas; o cliente vai para "Clientes de parceiros" do gerente dono do parceiro. Parceiro sem gerente entra pela roleta de parceiros; se ele procura um gerente, vai para esse.
   - **Retorno:** não gira nada; a recepção procura e registra o retorno no lead ou no cliente de parceiro, sem aprovação. A tela mostra o especialista do último atendimento e o último da vez (sem registrar a cortesia).
   - Ao registrar, a tela mostra **quem anunciar: o corretor e o especialista**, com Desfazer.
4. Lead criado pela recepção entra na lista do dia com "Atendido no plantão" e próximo contato no dia seguinte às 10h. Telefone de outro corretor: avisa sem dizer de quem, a recepção decide, fica no histórico.
5. Especialista não é usuário: é um nome numa lista mantida no CRM. Acompanhante com nome obrigatório ou "Veio sozinho". "Como conheceu" com a lista única do estudo, escolha múltipla (aprovar no mockup).
6. A recepção vê **só os clientes de hoje**; os anteriores, só pela busca do retorno. Correção depois do dia, só gerente geral e operacional.
7. **Apelido obrigatório** para corretor ativo; CRECI opcional.
8. **Sem importar o histórico; troca em todas as lojas de uma vez, sem piloto.** A planilha em branco fica como plano de volta.
9. Para o programa, **só a primeira visita do cliente de indicação de corretor** gera a visita realizada pendente; o cliente novo da vez e os retornos não.
10. As visitas da recepção entram no painel da equipe e no relatório do corretor. Os relatórios para o Felipe e o marketing são outra frente (`docs/estudo-relatorios.md`).
11. Corretor não faz check-in por localização agora (decisão do check-in); a presença dele é a da recepção.

## Decisões técnicas
- **SQL em arquivo novo** `crm/supabase/recepcao.sql`, idempotente, que o Felipe roda. Tabelas e funções do estudo, seção 7 (com os ajustes da seção 8): presença ampliada e eventos (saiu, voltou, passou a vez, encerrou), `especialistas`, atendimentos do plantão, como conheceu, apelido e CRECI em `profiles`.
- **Toda escrita da recepção por funções `security definer`** (`recepcao_registrar_cliente`, `recepcao_chegada`, `recepcao_saida`, `recepcao_passar_vez`, `recepcao_corrigir`), sem insert ou update direto. Permissões novas em `role_permissions`, nunca `perfil ===`. A recepção não lê leads: a busca do retorno devolve só o mínimo (primeiro nome, final do telefone, a quem está vinculado, data e especialista do último atendimento).
- Id gerado no aparelho e gravações idempotentes, como no resto do app (teste de carga).
- **Conflitos com outras frentes:**
  - A frente **Ajustes da ficha** está mudando `lead_interacoes_tipo_check`, o gatilho de conversa e `followup.ts`. Qualquer tipo novo de interação ("Voltou ao plantão", "Atendido no plantão") **só depois da entrega dela**: combine com a sessão principal antes de tocar em `schema.sql` ou nesses arquivos.
  - A **entrada do parceiro pela recepção** usa a função e a roleta de `parcerias.sql`, da frente Parcerias. A tela "Clientes de parceiros" (`parceiro_clientes`) é etapa do módulo de Parcerias: aqui só a gravação pela recepção, combinada com a sessão Parcerias pela sessão principal.

## Etapas
1. **Mockup** da tela `/recepcao/` no computador e em 375px: "Na loja agora" (vez de corretores e especialistas), "Clientes de hoje" com a linha de digitação, o card "Anuncie" e a busca do retorno. Incluir a lista de "Como conheceu". **Parar para o Felipe ver.**
2. Banco (`recepcao.sql`) com testes de banco por perfil. Parar para o Felipe rodar.
3. Tela, vez, digitação por teclado (Tab, Enter, atalhos), correção e estados vazios e de erro.
4. Cadastro por tipo: criar ou achar o lead, vez dos especialistas, retorno, card "Anuncie", aviso de telefone de outro corretor.
5. Visitas da recepção no painel da equipe e no relatório do corretor; relatório da loja.
6. Preparação da troca: lista do que cadastrar antes (usuários e apelidos, especialistas, contas das recepcionistas), roteiro de treino de uma página e a planilha em branco de reserva (fora do Git). Docs em `docs/recepcao.md` e índice no `CLAUDE.md`.

## Arquivos permitidos
- Novos: `crm/src/app/recepcao/**`, `crm/src/components/recepcao/**`, `crm/src/lib/recepcao*.ts` e testes, `crm/supabase/recepcao*.sql`, `crm/supabase/testes/recepcao*.mjs`, `docs/recepcao.md`.
- Editar só o mínimo: `crm/src/components/casca.tsx` (item "Recepção"), `crm/package.json` (scripts de teste), o painel e o relatório do corretor na etapa 5, o índice do `CLAUDE.md`.
- **Não tocar sem combinar com a sessão principal:** `crm/supabase/schema.sql`, `crm/src/app/leads/**`, `crm/src/lib/followup.ts`, `crm/src/lib/leads-dados.ts` (frente Ajustes da ficha) e `crm/src/app/parceiros/**`, `crm/supabase/parcerias*.sql` (frente Parcerias). Nunca `ref/` nem `discovery/`.

## Pronto quando
- A recepção registra os quatro tipos de cliente e vê quem anunciar, e cada tipo vai para o lugar certo (testes de banco por tipo).
- A vez segue a ordem digitada, em círculo, pulando quem saiu; "Passar a vez" fica registrado.
- A recepção não consegue ler leads nem clientes de dias anteriores fora da busca do retorno (`verificar-rls` e testes por perfil).
- Digitar um cliente só com teclado funciona no PC; a tela funciona em 375px (capturas).
- Visitas da recepção aparecem no painel da equipe e no relatório do corretor.
- Typecheck, `npm test`, `npm run test:banco` e build passam.

## Limites
- Testes isolados, sem credenciais reais, sem dados de clientes da planilha (use valores inventados), sem rodar SQL no Supabase, instalar ou reiniciar nada sem ok do Felipe.
- Não rodar `npm run build` com o `npm run dev` ligado.
- Não publicar e não commitar: entregar arquivos mudados, resultado dos testes e pendências.
