# Brief: ajustes da ficha do lead (coluna no computador, Sem resposta, toque em WhatsApp e Ligar)

## Leia antes
- `CLAUDE.md`, `docs/design-system.md` e a skill `tela-ds-mbigucci`.
- `docs/leads.md`, seções 4 (prazo de 15 min), 5 (Sem resposta e tentativas), 8 (mensagens prontas e Ligar) e a tela da ficha.
- `docs/revisao-visual.md` (capturas em 375px e desktop) e `docs/teste-carga.md` (gravações idempotentes, id gerado no aparelho).
- Arquivos: `crm/src/app/leads/ficha/page.tsx`, `crm/src/components/leads/partes.tsx`, `crm/src/lib/followup.ts`, `crm/src/lib/leads-dados.ts`, a Lista do dia (`crm/src/app/page.tsx` e o que ela usa) e `crm/supabase/schema.sql` (`lead_interacoes`, `lead_interacoes_tipo_check`, o gatilho com `v_conversa`, o check do `proximo_contato`).

## O que o Felipe pediu (04/11/2026)
1. **Ficha no computador:** a direita fica vazia. Duas colunas a partir do desktop: à esquerda o que se faz (cabeçalho com WhatsApp e Ligar, Registrar interação, visitas, vendas, perfil, documentos, descarte); à direita, nesta ordem, **temperatura e etapa**, o **Radar de Match** e o **histórico**. No celular continua uma coluna só, na ordem de hoje.
   - O Felipe pediu tudo fixo ao rolar. Como a coluna inteira passa da altura da tela, a proposta é **fixar só o bloco de temperatura e etapa** e deixar o Radar e o histórico rolarem normalmente. Confirmar no mockup.
2. **"Sem resposta (+1)":**
   - sai do topo da ficha e vira **uma opção em "Como foi"**, ao lado de WhatsApp, Ligação, E-mail, Visita e Anotação;
   - **só aparece se a última interação tiver mais de 1 dia**;
   - escolhê-la grava a tentativa como hoje (texto padrão, próximo contato em 2 dias, contador);
   - **sai do card da Lista do dia.**
3. **Toque em WhatsApp ou Ligar grava um registro automático** ("Abriu o WhatsApp" / "Ligou") **sem pedir nada**. O corretor detalha depois, e cobrar isso fica com o gerente.
   - **Conta como primeiro contato:** encerra o prazo de 15 min do lead da empresa e tira o lead de "Novo".
   - **Não muda o próximo contato.** O lead **continua na Lista do dia pedindo para detalhar** o contato, até o corretor registrar a interação detalhada.
   - **Um registro por tipo por dia** (no horário de São Paulo).
   - Na ficha, depois do toque, Registrar interação já vem com o tipo marcado.

Suposições a confirmar com o Felipe no mockup:
- O toque **não zera as tentativas** de Sem resposta; só a interação detalhada zera.
- Na Lista do dia, o grupo se chama "Detalhe o contato" e fica logo abaixo do prazo de 15 min.
- O WhatsApp da mensagem pronta (no card da Lista do dia e na ficha) também grava o toque.

## Decisões técnicas
- **Tipos novos** em `lead_interacoes`: `toque_whatsapp` e `toque_ligacao` (nomes a seu critério, documentados). Ampliar `lead_interacoes_tipo_check` e o check do `proximo_contato` (o toque não tem). No gatilho, o toque conta como conversa para o prazo e para sair de "Novo", mas não zera `tentativas` nem mexe em `proximo_contato`.
- **Um por tipo por dia:** índice único parcial (lead, tipo, dia em São Paulo) só para os tipos de toque, com insert que ignora conflito. Id gerado no aparelho, como no resto.
- **"A detalhar"** é derivado: último registro do lead é um toque sem interação detalhada depois. Calcular onde a Lista do dia já calcula os grupos (`followup.ts`), com teste.
- **Sem resposta com 1 dia:** a regra fica numa função pura com teste (`followup.ts`), usada pela ficha. Manter a gravação atual da tentativa.
- O toque não pode atrasar a abertura do WhatsApp ou do discador: gravar sem esperar a resposta, sem quebrar se estiver sem internet.
- Atualizar `docs/leads.md` (seções 4, 5 e 8 e a tela da ficha) e o `CLAUDE.md` só se o índice mudar.

## Etapas
1. **Mockup** da ficha no computador e no celular, de "Como foi" com e sem Sem resposta e do grupo "Detalhe o contato" na Lista do dia. **Parar para o Felipe ver** e confirmar as suposições.
2. Banco e testes de banco.
3. Ficha, Lista do dia e testes.
4. Capturas antes e depois em 375px e desktop (claro e escuro) e docs.

## Arquivos permitidos
Os listados em "Leia antes" e os testes deles. **Não tocar:** `crm/src/app/parceiros/**`, `crm/src/app/parceiro/**`, `crm/supabase/parcerias*.sql`, `ref/`, `discovery/`.

## Pronto quando
- No desktop, a ficha tem a coluna da direita com temperatura e etapa (fixas ao rolar, se o Felipe confirmar), Radar de Match e histórico; no celular nada piorou (capturas).
- Sem resposta só aparece em "Como foi" com mais de 1 dia da última interação, e não aparece na Lista do dia.
- Tocar em WhatsApp ou Ligar grava um registro por tipo por dia, encerra o prazo de 15 min, tira de "Novo", não muda o próximo contato, e o lead aparece em "Detalhe o contato" até a interação detalhada.
- Typecheck, `npm test`, `npm run test:banco` e build passam.

## Limites
- Testes isolados, sem credenciais reais, sem rodar SQL no Supabase, instalar ou reiniciar nada sem ok do Felipe.
- Não rodar `npm run build` com o `npm run dev` ligado.
- Não publicar e não commitar: entregar arquivos mudados, resultado dos testes e pendências.
