# Brief: venda com mais de um vendedor (divisão por porcentagem) e registro pelo gerente

## Leia antes
- `CLAUDE.md`, **`docs/vendas-metas.md` inteiro** (registro, correção auditável, cancelar e reativar, as duas visões do VGV, meta anual, metas próprias, conversão e Faixas de VGV), `docs/painel.md` e `docs/metas-ranking.md`.
- `docs/pontuacao-verba.md`: o bônus da verba por VGV e as Faixas de VGV, que são só do gerente geral por regra fixa no banco (`is_gerente_geral()`).
- `docs/acessos-perfis.md`: perfis e permissões no catálogo (`role_permissions`), `pode_ver_dados_de` e `vendas.corrigir_equipe`.
- `crm/supabase/schema.sql`: as tabelas `vendas`, `leads_venda_guard`, as funções de painel, ranking e meta, e a tela `crm/src/components/vendas/vendas.tsx`.
- `docs/codex-parcerias.md`, item 18: a venda de parceiro, que é da frente de Parcerias e se encaixa nesta estrutura.

## O que o Felipe pediu (05/11/2026)
- **Venda com mais de um vendedor ("fifty", "thirty" ou mais):**
  - a divisão é **por porcentagem em cada venda**, por exemplo 50/30/20, e a soma tem de dar 100%;
  - **o VGV e o bônus da verba seguem as partes**;
  - **no número de vendas também vale a porcentagem**: uma venda 50/50 conta 0,5 para cada um, e a soma da empresa continua batendo;
  - os corretores podem ser **de equipes diferentes**, e cada parte conta para a equipe do próprio corretor no painel e na meta da equipe.
- **Quem registra:**
  - **só o gerente e o operacional** (e o gerente geral) registram vendas, para todas as vendas. **O corretor deixa de registrar.** Isso muda a regra de hoje, em que o corretor dono do lead registra pela ficha;
  - **marcar como paga** também passa a ser só do gerente e do operacional;
  - **no futuro**, conferir a ligação com o Base360 Repasse, que controla o repasse. Isso fica fora desta frente.
- **Venda de parceiro:** a frente de Parcerias, no item 18, define que ela registra **o parceiro e o gerente, sem corretor da casa**, e fica fora do ranking de corretores. Ela entra nesta mesma estrutura de participantes.

## Decisões técnicas (a confirmar no desenho)
- **Participantes da venda:** uma tabela com uma linha por participante. Cada linha tem a venda, o tipo (`corretor`, `gerente` ou `parceiro`), o perfil ou o `parceiro_id` e a porcentagem, com duas casas.
  - A soma de 100% é garantida pelo banco, com um gatilho de restrição adiado até o fim da transação.
  - Não pode haver participante repetido.
  - Corretores de qualquer equipe entram; o gerente e o parceiro, só no tipo deles.
  - O desenho decide o que acontece com `vendas.corretor_id`: virar "registrado para" ou sair, com a migração.
- **Migração:** cada venda existente vira um participante, o `corretor_id`, com 100%. Os relatórios dão o mesmo resultado antes e depois, e isso tem teste.
- **Contas:**
  - VGV de cada um = VGV da venda × a porcentagem dele;
  - quantidade = a porcentagem;
  - a equipe da parte é a equipe do corretor;
  - valem no painel, no ranking, na meta anual, nas metas próprias, na conversão por origem e campanha, no ticket e no ciclo médio, nas Faixas de VGV e no bônus da verba;
  - o ticket médio da empresa continua com VGV ÷ vendas inteiras.

  Liste cada função e cada tela afetada no desenho.
- **Permissões no catálogo:** `vendas.registrar` e `vendas.pagar`, dadas ao gerente, ao operacional e ao gerente geral, sem `if (role === ...)`.
  - O gerente registra nos leads que vê: os da equipe dele.
  - O operacional, com `dados.ver_todos`, registra em todos.
  - O corretor perde o registro e o "marcar como paga".
- **Fluxo do corretor:** na ficha, escolher a etapa "Venda" ou tocar em "+ Registrar venda" vira **"Pedir registro da venda"**. Isso avisa o gerente da equipe, no celular e no painel, sem mudar a etapa. A etapa Venda continua vindo só da venda registrada (`leads_venda_guard`).
- **Correção:** mudar participantes ou porcentagens é uma correção, com motivo e com o antes e o depois no histórico, como já acontece hoje. Cancelar e reativar continuam iguais.
- **Quem vê:** todos os participantes veem a venda e a própria parte. O gerente vê as vendas em que há alguém da equipe dele.
- **Faixas de VGV:** continuam só do gerente geral, calculadas com as partes.

## Etapas
1. **Desenho (pare para o Felipe ver):** `docs/vendas-participantes.md`, com:
   - tabelas, migração, RLS e permissões;
   - cada função e cada tela que muda;
   - o fluxo do "Pedir registro da venda";
   - exemplos numéricos: uma venda 50/30/20 de R$ 600.000 no painel, no ranking, na meta e nas faixas;
   - os riscos e as perguntas.

   Junto vai o mockup `docs/mockups/vendas-participantes.html` (registrar com divisão, a ficha do corretor com "Pedir registro" e a lista de vendas), publicado como Artifact privado.
2. **Banco e testes:** `npm run test:banco`, com:
   - soma diferente de 100 recusada;
   - migração sem mudar os números;
   - partes em equipes diferentes;
   - o corretor sem registrar nem marcar como paga;
   - o gerente só nos leads da equipe;
   - o operacional em todos;
   - a correção auditável da divisão;
   - painel, ranking, meta e faixas com as partes.
3. **Telas:** o registro com a lista de participantes e as porcentagens (o padrão é o dono do lead com 100%), a ficha, `/vendas/`, o painel, o ranking e as metas. Prévia isolada e capturas em 375px e no computador, nos dois temas.
4. **Conferência:** a suíte completa e o build isolado. O relatório traz o que o Felipe precisa rodar (o SQL e as permissões).

## Arquivos permitidos
- `crm/supabase/schema.sql` só na parte de vendas, metas, painel, ranking e faixas; um SQL novo, se o desenho preferir; testes em `supabase/testes/`.
- `crm/src/` nas telas e libs de vendas, metas, painel e ranking e na ficha do lead (só o card Venda e a etapa Venda).
- `docs/` (`vendas-participantes.md`, o mockup e as atualizações de `vendas-metas.md`, `painel.md`, `metas-ranking.md`, `pontuacao-verba.md` e `acessos-perfis.md`).
- **Não tocar:**
  - `leads_guard`, `pode_atribuir_a` e as policies de `leads` (são da frente da distribuição automática);
  - o SQL e as telas de Parcerias;
  - o direcionador e o Marketing, `portal/`, `marca/`, `discovery/`, `ref/` e `C:\Projects\base360-repo`.

## Pronto quando
- O desenho foi aprovado pelo Felipe, e a sessão de Parcerias confirmou que a venda de parceiro cabe na estrutura.
- Uma venda 50/30/20 aparece certa em todos os lugares do exemplo do desenho, e as vendas antigas dão os mesmos números de antes.
- O corretor não registra nem marca como paga; o gerente e o operacional registram, com a divisão.
- A suíte completa passa e o build isolado também.

## Limites
- Sem credenciais reais, sem dados reais e sem criar recursos externos.
- Sem instalar pacotes.
- **Sem commit**: a sessão master revisa e commita.
- Não rode a suíte nem o build ao mesmo tempo que outra frente: a distribuição automática e Parcerias estão ativas.
