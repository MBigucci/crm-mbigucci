# Brief: CRM de parcerias (gerentes cadastram parceiros e interações, com roleta)

Sumário: Leia antes · O que o Felipe pediu · Decisões técnicas · Etapas · Arquivos permitidos · Pronto quando · Limites.

## Leia antes
- `CLAUDE.md` e `docs/design-system.md` (e a skill `tela-ds-mbigucci`).
- `docs/acessos-perfis.md` (perfis, RLS, `pode_ver_dados_de`, permissões em `role_permissions`).
- `docs/leads.md` (interações, follow-up, histórico por gatilho, id gerado no aparelho, rascunho).
- `docs/notificacoes.md` (push, Edge Function `avisos`) e `docs/teste-carga.md` (gravações idempotentes).
- `docs/gerentes-necessidades.md` linhas 17, 29 e 48: parceiros estavam previstos como etapa futura, no mesmo app.
- O CRM da Bruna (`ref/`, só leitura) **não tem módulo de parceiros**: não há o que copiar. Reaproveite a interação do lead.

## O que o Felipe pediu (04/11/2026)
1. Um segundo módulo no mesmo app: o gerente de vendas cadastra **os parceiros dele** e registra **cada interação** com eles.
2. **Parceiro** = corretor autônomo ou imobiliária que indica clientes.
3. **Acesso:** cada gerente vê só os seus; o gerente geral vê todos.
4. **Roleta de parceiros para os gerentes.** O parceiro chega por **link público** ou por **cadastro manual** do gerente.
   - Se já está cadastrado com algum gerente, **não entra na roleta**: o gerente dono só recebe um **aviso** (lembrete: o parceiro está procurando de novo).
   - **90 dias sem interação registrada pelo gerente** → ele perde o parceiro, que é roletado de novo.
   - Ao perder, o parceiro **não volta ao mesmo gerente**; vai para outro da fila (se só houver um gerente, fica com ele).
   - Editar o cadastro **não** zera os 90 dias. Só interação registrada.
5. **Duplicado:** compara WhatsApp **ou** CRECI (normalizados). Se um deles faltar, vale o outro.
6. **Fila:** todos os gerentes ativos, em rodízio igual, **sem pausa**.
7. **Link público** pede: nome, empresa, WhatsApp, CRECI, e-mail, região de atuação.
8. **Interação:** tipo (ligação, WhatsApp, reunião, visita), resumo e próximo contato (o próximo contato aparece na lista do dia do gerente).
9. **Indicações:** o lead ganha a origem "Parceiro" com o parceiro vinculado, para ver quanto cada parceiro indicou e vendeu.
10. **Em paralelo** com a lista de melhorias do Felipe, em sessão separada: por isso os arquivos abaixo são separados.

11. **Faixas do prazo (04/11/2026, mockup aprovado):** ✓ no 1º mês (até 30 dias), ! no 2º (31 a 60), ✕ no 3º (61 a 90). Suposições abaixo e aviso aos 80 dias aprovados ("de resto aprovado").

12. **Cadastro manual do gerente (04/11/2026):** parceiro novo cadastrado à mão por um gerente **fica com ele**, sem roleta (como no `[TROCA a]` padrão de `parcerias.sql`). Coerente com o estudo da recepção: "procurou um gerente, fica com ele".
14. **Fila da roleta visível (04/11/2026):** todos os gerentes veem a ordem (próximo da vez) e o último a receber, só com gerente, data e tag (Estande, Link, 90 dias). Nome do parceiro só para o dono e o gerente geral. Exige função no banco que devolve a fila sem dados do parceiro.
13. **A decidir (estudo da recepção, `docs/estudo-recepcao.md` 1.5 e 3.1):** entrada pela recepção (gerente procurado ou roleta), tela "Clientes de parceiros" do gerente (`parceiro_clientes`, ficam com o gerente antigo na troca de 90 dias) e importação da aba `NOVAS PARCERIAS`.

Suposições (aprovadas pelo Felipe em 04/11/2026): gerente que cadastra à mão um parceiro que já é de outro gerente vê "já é parceiro de <nome>" e o dono recebe o aviso; parceiro cujo gerente foi desativado é tratado como sem dono e entra na roleta.

## Decisões técnicas
- **SQL em arquivo novo** `crm/supabase/parcerias.sql`, idempotente, que o Felipe roda no SQL Editor. Não edite `schema.sql` (a outra frente mexe nele).
- **Tabelas:** `parceiros` (id gerado no aparelho, `gerente_id`, nome, empresa, whatsapp, creci, e-mail, região, `atribuido_em`, `ultima_interacao_em`, `ultimo_gerente_id`, ativo), `parceiro_interacoes` (tipo, resumo, `proximo_contato`), `parceiro_eventos` (histórico por gatilho: cadastrado, atribuído, aviso de reentrada, perdido por 90 dias).
- **Permissões** em `role_permissions` (`parceiros.cadastrar`, `parceiros.ver_todos`), nunca `perfil ===`. RLS: gerente vê e grava só os seus; gerente geral vê todos.
- **Link público:** página estática fora do login (`/parceiro/`). O anônimo **só grava, nunca lê**: uma função `security definer` recebe os campos, normaliza, compara, e devolve só "recebido". Devolver o mesmo texto para parceiro novo ou já cadastrado, para não revelar quem é parceiro. Proteção contra robô (campo isca e limite por contato) e `NEXT_PUBLIC_*` só com a chave pública.
- **Roleta:** a função escolhe o gerente ativo que **recebeu parceiro há mais tempo** (rodízio igual, sem cursor frágil), excluindo `ultimo_gerente_id` na redistribuição. Travar a escolha para duas entradas simultâneas não darem o mesmo gerente.
- **90 dias:** job diário no `pg_cron`, como o de avisos (ver `agendar-avisos.sql`), em `parcerias-agendar.sql`.
- **Avisos** pelo push já existente (Edge Function `avisos`): reentrada do parceiro, parceiro recebido pela roleta, próximo contato vencido, e **aviso aos 80 dias** de que o parceiro vai ser perdido (confirmar com o Felipe antes de ligar).
- Gravações idempotentes e rascunho de formulário, como no restante do app.
- Origem "Parceiro" no lead (etapa 4) mexe no cadastro de leads e no `schema.sql`: **só depois** de a outra frente liberar esses arquivos.

## Etapas
1. **Mockup** das telas (lista de parceiros, ficha com interações, cadastro manual, link público) no Design System, mobile primeiro. **Parar para o Felipe ver.**
2. **Banco:** `parcerias.sql` com tabelas, RLS, permissões, função do link, roleta e testes em `crm/supabase/` no padrão de `verificar-rls.sql`. Parar para o Felipe rodar.
3. **Telas do gerente:** lista, ficha, cadastro manual, registrar interação, próximo contato na lista do dia.
4. **Link público** e avisos (reentrada, roleta, 90 dias).
5. **Origem "Parceiro"** no lead e relatório de indicações e vendas por parceiro.
6. Documentação em `docs/parcerias.md` e índice no `CLAUDE.md`.

## Arquivos permitidos
- Novos: `crm/src/app/parceiros/**`, `crm/src/app/parceiro/**` (link público), `crm/src/components/parceiros/**`, `crm/src/lib/parceiros*.ts` e testes, `crm/supabase/parcerias*.sql`, `docs/parcerias.md`.
- Editar só o mínimo: `crm/src/components/casca.tsx` (item de menu "Parceiros"), `crm/package.json` (script de teste), a Edge Function `avisos` (novos tipos) e o índice de `CLAUDE.md`.
- **Não tocar:** `schema.sql`, telas de leads, vendas, painel, ranking e pontos (outra frente), `ref/`. A etapa 5 só começa com ok do Felipe.

## Pronto quando
- Gerente cadastra parceiro, registra interação e vê só os seus; gerente geral vê todos (verificado com `verificar-rls`).
- Link público grava sem login, não lê nada, e parceiro repetido gera aviso ao dono sem entrar na roleta.
- Roleta dá rodízio igual entre gerentes ativos; duas entradas ao mesmo tempo vão para gerentes diferentes (teste).
- Parceiro a 90 dias sem interação muda de gerente (nunca para o mesmo) e fica registrado no histórico (teste com datas simuladas).
- Duplicado por WhatsApp ou CRECI, com um dos dois vazio (testes).
- Typecheck, suíte e build passam; nenhum texto de verba, pontos ou ranking aparece nas telas novas.

## Limites
- Testes isolados, dados de teste fora do Git, sem usar credenciais reais.
- Não instalar, não reiniciar serviço, não criar recurso externo nem rodar SQL no Supabase sem ok do Felipe.
- Não publicar no WordPress (sigilo até a reunião de novembro de 2026).
- Não commitar: entregar arquivos mudados, resultado dos testes e pendências.
