# Brief (Codex): revisão visual antes de subir o CRM (roadmap 17)

## Leia antes
- `CLAUDE.md`, `docs/design-system.md` e a skill `.claude/skills/tela-ds-mbigucci/SKILL.md`.
- `docs/revisao-visual.md`: a revisão anterior (29 e 30/10/2026), o método, as prioridades por tela e os scripts da cópia isolada (`node scripts/visual-preview.mjs`, `npm --prefix .visual-preview run build`, `node scripts/visual-preview.mjs --serve`, fixtures em `crm/scripts/visual-fixtures.ts`). Use o mesmo método e a mesma cópia isolada, sem credenciais e com escritas bloqueadas.
- O que mudou depois daquela revisão: `docs/codex-ajustes-ficha.md`, `docs/recepcao.md`, `docs/codex-parcerias.md`, `docs/codex-pacote-rapido.md` e `docs/historico.md` (fim do sigilo).

## O que o Felipe pediu (05/11/2026)
O CRM sobe para `mbigucci.com.br/crm` quando a recepção e esta revisão visual estiverem prontas. A revisão é **independente**: o Codex **aponta** os problemas; uma sessão do Claude corrige depois, com o ok do Felipe. O pedido original do item 17: hierarquia e destaque em cada tela ("as coisas ficam todas iguais"): qual é a ação principal, o que precisa saltar (atrasado, prazo estourado, visita de hoje, Detalhe o contato), o que está apagado demais e o contraste em 375px.

## Escopo
1. **Telas novas ou mudadas desde 30/10/2026 (prioridade):**
   - Ficha do lead em duas colunas no computador e uma no celular; "Como foi" com Sem resposta; lead sem telefone ("– Sem telefone", campo para digitar o WhatsApp).
   - Lista do dia com o grupo "Detalhe o contato".
   - Recepção: `/recepcao/` (PC ≥ 900px em duas colunas; abas no celular), `/recepcao/stands/`, `/recepcao/relatorio/` (também a impressão), o card "Anuncie" e os avisos na linha.
   - Parcerias: lista de parceiros, ficha com linha do tempo, cadastro manual, interação, contatos do dia no Início, e a página pública de cadastro de parceiro (`crm/wordpress/corretores/`, se já estiver pronta).
   - Agenda com "Agendar visita" e os retornos; Usuários com Apelido e CRECI; Avisos neste aparelho (tipos novos); painel da equipe com "Clientes no stand"; relatório do corretor com o card do stand.
   - Menu com Recepção, Parceiros e "Simulador →" (link externo).
   - Telas do programa sem a chave: Meus pontos, Ranking, Pontos, Plantão (o texto "Só você vê" e "Ligue a chave" não podem mais aparecer).
2. **Varredura rápida de todas as rotas** em 375 × 812 e 1440 × 900, claro e escuro, para regressões.

## O que entregar
- Uma seção nova no fim de `docs/revisao-visual.md`, "Revisão de 05/11/2026 (antes de subir)", com:
  - uma tabela por tela: problema, severidade (Alta, Média, Baixa), onde (rota, componente e arquivo), proposta de ajuste no Design System;
  - o que bloqueia subir (Alta) separado do que pode vir depois;
  - a auditoria de contraste nos cenários capturados, como na revisão anterior;
  - o que não foi possível conferir.
- As capturas em `docs/revisao-visual/2026-11-05/` (fora do Git pela regra global: só o script que gera entra).

## Limites
- **Não altere código nem SQL.** Só a seção do relatório em `docs/revisao-visual.md` e, se precisar, os fixtures e scripts da cópia isolada (`crm/scripts/visual-*`), dizendo o que mudou.
- Sem credenciais reais, sem Supabase real, sem rodar `npm run build` com `npm run dev` ligado.
- Dados de cliente só inventados.
- Não commite; entregue o relatório e a lista de arquivos.
