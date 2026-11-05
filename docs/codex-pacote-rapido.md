# Brief: pacote rápido (roadmap 28, 29 e 34)

## Leia antes
- `CLAUDE.md`, `docs/design-system.md` e a skill `tela-ds-mbigucci`.
- `docs/crm-referencias.md`, propostas 3 e 5 e as respostas do Felipe (seção 6).
- `docs/notificacoes.md` (Edge Function `avisos`, `agendar-avisos.sql`, tipos, não repetir, Avisos neste aparelho) para o item 28.
- `docs/visitas.md` (agendar, "ficou de fora": agendar pela Agenda com o `lead-picker`) para o item 29.
- `docs/painel.md` (botão Lead perdido, prazo estourado) e `docs/leads.md` seção 4 (prazo de 15 min).

## O que o Felipe pediu (04/11/2026)
- **28. Avisos no celular para o gerente:** o **prazo de 15 min estourado na equipe, na hora** (é a hora do botão Lead perdido) e, **às 19h, as visitas da equipe aguardando baixa**. Só para quem tem a permissão de ver a equipe; o gerente escolhe em Avisos neste aparelho, como os outros avisos.
- **29. Agendar visita pela Agenda:** em `/agenda/`, "Agendar visita" pede o cliente com a busca tolerante (acento e telefone) e abre o mesmo formulário da ficha. Partir do `lead-picker` do CRM da Bruna (`ref/`, só leitura).
- **34. Simulador no menu:** um item "Simulador" que abre `https://mbigucci.com.br/ferramentas` em outra aba (`target="_blank"`, `rel="noopener"`), para todos os perfis.

## Decisões técnicas
- Avisos: novos tipos na Edge Function `avisos` e no agendamento, com o não repetir que já existe (um aviso por lead estourado; um resumo das 19h por gerente e dia). Texto em pt-BR, sem exclamação. Permissões por `role_permissions`, nunca `perfil ===`. Se mudar `schema.sql` (tipos aceitos em `avisos_aparelho` ou similar), mudança idempotente e com teste.
- Agenda: reaproveitar o formulário de visita da ficha, sem duplicar regra.
- Menu: uma linha em `casca.tsx`, link externo marcado com "→" como os outros links que saem do app.

## Etapas
1. Mostrar ao Felipe só os textos dos dois avisos e onde o "Agendar visita" e o "Simulador" aparecem (sem mockup completo). Parar para ele ver.
2. Implementar os três, com testes.
3. Docs (`docs/notificacoes.md`, `docs/visitas.md`) e o ✓ dos itens 28, 29 e 34 em `docs/referencia-crm-bruna.md`.

## Arquivos permitidos
`crm/supabase/functions/avisos/**`, `crm/supabase/agendar-avisos.sql`, os trechos de avisos em `crm/supabase/schema.sql`, `crm/src/app/agenda/**`, componentes de visita que a Agenda precisar reaproveitar, `crm/src/app/conta/**` (escolha dos avisos), `crm/src/components/casca.tsx` (uma linha), os testes desses arquivos e os docs citados.

**Cuidado com outras frentes:** a Recepção mexe em `schema.sql` (tipo de interação e lead sem telefone) e em `casca.tsx`; Parcerias mexe em `casca.tsx` e depois vai mexer na Edge Function `avisos`. Antes de editar `schema.sql` ou `casca.tsx`, confira `git status` e mude só o seu trecho. Não toque em `crm/src/app/recepcao/**`, `crm/supabase/recepcao*.sql`, `crm/src/app/parceiros/**`, `crm/supabase/parcerias*.sql`, `ref/` nem `discovery/`.

## Pronto quando
- O gerente que ligou o aviso recebe o prazo estourado de um lead da equipe uma vez só, e às 19h o resumo das visitas aguardando baixa (testes da função com datas simuladas).
- Na Agenda, dá para agendar visita escolhendo o cliente pela busca, com o mesmo formulário e as mesmas regras da ficha.
- O menu tem "Simulador", que abre o site em outra aba.
- Typecheck, `npm test`, `npm run test:banco` e build passam.

## Limites
- Testes isolados, sem credenciais reais, sem rodar SQL nem implantar a Edge Function no Supabase sem ok do Felipe.
- Não rodar `npm run build` com o `npm run dev` ligado, nem a suíte ao mesmo tempo que outra frente.
- Não publicar e não commitar: entregar arquivos mudados, resultado dos testes e pendências.
