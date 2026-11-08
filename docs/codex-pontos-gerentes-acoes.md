# Brief: pontos dos gerentes e ação híbrida (vídeo ou blitz) dos corretores

## Leia antes
- `CLAUDE.md` (raiz) e `docs/pontuacao-verba.md` inteiro: o programa de hoje, o banco, as telas e quem vê o quê.
- `docs/acessos-perfis.md`: permissões configuráveis (nunca `if (role === ...)`).
- `docs/design-system.md` e a skill `.claude/skills/tela-ds-mbigucci`: as telas novas usam o Alicerce (`.mb-*`, `Icones`).
- **`crm/src/alicerce/guia/README.md` e o guia de cada peça que usar em `crm/src/alicerce/guia/componentes/`** (Selo, Chip, Meta, Prazo, Cartao, Envio, Campo, PainelLateral, Vocabulario). Selo é só status ou etapa, com o vocabulário fixo; número não vai em selo; o mínimo de pontos usa a marca de mínimo da `Meta`.
- `docs/distribuicao-automatica.md` e `crm/src/components/distribuicao/local-stands.tsx`: o check-in do corretor no stand pela localização, que o check-in do gerente reaproveita.
- `crm/supabase/parcerias.sql` e `crm/src/app/parceiros/`: o cadastro de parceiros do gerente.
- `crm/supabase/storage-documentos.sql`: o modelo para o bucket de comprovantes.
- Código: `crm/src/lib/programa.ts` (`calcularVerba`), `programa.test.ts`, `programa-dados.ts`, `crm/src/app/meus-pontos/`, `crm/src/app/programa/`, `crm/src/app/plantao/`, `crm/supabase/schema.sql` (seção "Programa de pontuação e verba") e `crm/supabase/testes/programa.test.mjs`.

## O que o usuário pediu (Felipe, 07/11/2026)

### Corretores
1. **Vídeo vira categoria híbrida:** até **12 ações no mês**, cada uma de **5 pontos** (máximo 60), divididas como o corretor quiser entre **vídeo** e **blitz** (ação de rua).
2. Total possível passa a **300** (períodos 120 + ações 60 + visitas 120).
3. **A trava de 200 acaba.** Verba = pontos × R$ 10 até 300. O **mínimo de 130 continua** (abaixo, verba R$ 0). **Cada venda assinada e paga continua somando R$ 1.000** para quem atingiu os 130.
4. **Quem lança a ação é o próprio corretor:**
   - o vídeo vai com print ou link;
   - a blitz vai com foto (obrigatória).

   O gerente geral aprova, como os outros lançamentos.

### Gerentes (prêmio, não verba)
5. Mesmo funcionamento do programa dos corretores, mas os pontos viram um **prêmio em dinheiro de uso livre**, não verba de anúncio. **1 ponto = R$ 10. Sem mínimo.**
6. **Parceiros novos:** cada parceiro **cadastrado pelo gerente no CRM de parcerias dentro do mês** vale 5 pontos, até 20 (máximo 100). Conta sozinho, sem aprovação.
7. **Check-in nos plantões:**
   - o gerente faz check-in **no app, pela localização do celular**, com o mesmo raio do check-in do corretor; fora do raio não grava;
   - a regra é 1 check-in por semana em **cada stand dele**, e os stands de cada gerente são definidos pelo gerente geral;
   - cumprir todas as semanas do mês vale **100 pontos**; se faltar uma vez, em qualquer stand e semana, perde os 100 (é tudo ou nada);
   - a semana pertence ao mês da sua **segunda-feira**.
8. Máximo do gerente: 200 pontos, ou R$ 2.000.
9. **Tela "Meus pontos" para o gerente**, como a do corretor: parceiros (x/20), check-ins por stand e semana (feito, falta, perdido) e o prêmio previsto. O gerente geral vê todos os gerentes na tela Pontos (`/programa/`) e fecha o mês junto.

## Decisões técnicas
- **Critério:** o critério "vídeo" vira **"Vídeo ou blitz"** (limite 12, 5 pontos).
  - O lançamento ganha `tipo_acao` (`video` | `blitz`).
  - O banco exige comprovante, e a blitz exige foto.
  - Os lançamentos de vídeo antigos viram `tipo_acao = 'video'`.
  - Pontos e limite continuam editáveis pelo gerente geral.
- **`calcularVerba`:** sem o teto sem venda e sem o "destrava 201–280". O teto vem da soma dos máximos dos critérios (300). Atualize os 7 exemplos de `docs/pontuacao-verba.md` para a regra nova e mostre a tabela nova na entrega.
- **Lançamento pelo próprio corretor:**
  - a policy hoje proíbe lançar para si; libere **só** para `tipo_acao` de vídeo ou blitz e **só** para o próprio corretor;
  - nasce pendente;
  - ele cancela o próprio pendente (Desfazer);
  - continua vendo só os aprovados, mais os próprios pendentes de ação, marcados como "aguardando".
- **Comprovante com arquivo:** use um bucket privado `comprovantes` com RLS no mesmo modelo de `storage-documentos.sql`. O dono e o gerente geral leem, e o dono grava. Para o vídeo, o link continua aceito no lugar do print.
- **Gerentes:**
  - criar `gerente_stands` (gerente, stand), editada só pelo gerente geral;
  - criar `checkins_gerente` (gerente, stand, quando, lat/lng, distância), em que só o próprio gerente grava e só dentro do raio, conferido no banco por função `security definer` que recalcula a distância;
  - criar a função pura `calcularPremioGerente` em `programa.ts`, com testes (semana que vira o mês, stand novo no meio do mês, mês sem stands, 0 e 20+ parceiros);
  - guardar o fechamento do gerente em `fechamentos_verba` ou numa tabela irmã, você decide e justifica.
- **Permissões:** use permissões novas no catálogo (por exemplo `pontos_gerente.participar`), dadas ao perfil Gerente por padrão. Nada de checar papel no código.
- **Visual:** use o Alicerce e as peças que já existem em `crm/src/components/alicerce/`. Telas enxutas, com detalhe em popup.

## Etapas
1. **Mockup primeiro, e pare.** Monte, no preview isolado (`node scripts/visual-preview.mjs`), a tela Meus pontos do gerente, o check-in do gerente, o lançamento de ação pelo corretor (vídeo e blitz) e Meus pontos do corretor com a ação híbrida. Tire capturas em 375px e desktop, guarde em `crm/local/`, e pare para o Felipe ver.
2. Banco: `schema.sql` (idempotente), bucket, policies e `programa.test.mjs` com cada perfil.
3. Cálculo (`programa.ts` e testes) e as telas.
4. Docs: atualize `docs/pontuacao-verba.md` (tabelas, regras, "Como ficou", o que cada perfil vê) e `docs/acessos-perfis.md` se mudar permissão.

## Arquivos permitidos
- `crm/supabase/schema.sql`, `crm/supabase/storage-comprovantes.sql` (novo) e `crm/supabase/testes/programa.test.mjs`.
- `crm/src/lib/programa.ts`, `programa.test.ts` e `programa-dados.ts`.
- `crm/src/app/meus-pontos/`, `crm/src/app/programa/`, `crm/src/app/plantao/` e uma rota nova para o check-in do gerente, se precisar.
- `crm/src/components/programa/` (novo ou existente) e `crm/src/components/alicerce/menu.ts`, só para o item do menu, com `menu.test.ts`.
- `docs/pontuacao-verba.md` e `docs/acessos-perfis.md`.
- **Não toque:** `crm/src/alicerce/` e `crm/public/alicerce/` (vêm do artifact), `ref/`, `crm/.env.local`, `marketing/`, e os arquivos soltos de outras frentes em `docs/` (`estudo-visual-diretoria.md`, `mockups/*`, `vendas-participantes.md`, `estudo-design.md`, `relatorio-alicerce-lacunas.md`, `revisao-visual/*`).

## Pronto quando
- `npm test` e `npm run test:banco` passam, e o `npx tsc --noEmit` também.
- A tabela de exemplos nova bate: tudo completo, sem venda, dá 300 pontos e R$ 3.000; com 1 venda, dá R$ 4.000; 120 pontos dá R$ 0.
- `programa.test.mjs` prova os seguintes casos:
  - o corretor lança vídeo e blitz para si e não lança período nem visita;
  - a blitz sem foto é recusada pelo banco;
  - o 13º lançamento não soma pontos;
  - o gerente não grava check-in fora do raio nem em stand que não é dele;
  - só o gerente geral define os stands.
- `calcularPremioGerente` tem testes: 20 parceiros com todos os check-ins dá R$ 2.000; uma falta dá R$ 1.000; 3 parceiros sem check-in dá R$ 150.
- Há capturas das telas em 375px e desktop em `crm/local/` (fora do Git).
- Os docs estão atualizados.

## Limites
- Rode os testes isolados: o banco de teste local e o preview isolado. Nunca use o Supabase real nem credenciais reais.
- Não instale pacote, não reinicie serviço e não rode SQL no Supabase. O Felipe roda o `schema.sql` depois.
- **Sem commit.** Entregue a lista de arquivos mudados, a saída dos testes e as pendências.
- Use um Chrome headless por vez e uma conferência por vez, para não travar o PC do Felipe.
