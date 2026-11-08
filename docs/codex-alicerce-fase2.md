# Brief: fase 2 do Alicerce no Vendas (item 48), bloco a bloco

## Leia antes
- `CLAUDE.md` (raiz).
- `docs/codex-alicerce-vendas.md`: as decisões do Felipe, as regras de cada passo e o que valeu na fase 1.
- `docs/cobertura-alicerce.md`: a peça de cada rota (seções 1 a 3), a separação de Parcerias (seção 4) e as decisões de 06/11/2026 (seção 7).
- `docs/design-system.md`, seção 2: como as telas já migradas ficaram.
- O guia do Alicerce: `crm/src/alicerce/guia/README.md` e o guia de cada peça em `crm/src/alicerce/guia/componentes/`. **Leia o guia da peça antes de usá-la.**
- A skill `.claude/skills/tela-ds-mbigucci/SKILL.md`, o checklist de tela.
- As peças prontas em `crm/src/components/alicerce/` e o ajuste local em `crm/src/app/alicerce-local.css`.
- O doc de domínio de cada bloco, conforme o índice do `CLAUDE.md` (`docs/parceiros*`, `docs/painel.md`, `docs/metas-ranking.md`, `docs/recepcao.md` etc.).

## O que o usuário pediu (Felipe, 08/11/2026)
1. A fase 2 começa agora, executada pelo Codex, **um bloco por vez**: ele faz o bloco, para no print, o Felipe aprova, e a sessão master revisa e commita.
2. **A ordem dos blocos:**
   1. **Parcerias:** a separação do módulo pela `Casca` e as 4 telas, conforme a seção 4 de `docs/cobertura-alicerce.md`.
   2. **Início do gerente e Vendas.**
   3. **Painel, Metas e Ranking.**
   4. **Quadro e Empreendimentos** (lista e ver).
   5. **Pontos e Aprovar lançamentos**, e Empreendimentos (editar e importar).
   6. **Administração:** Configurações, Usuários, Equipes, Faixas, Distribuição e Distribuição do corretor.
   7. **Marketing:** moldura, Direcionador, Início, Minha conta, Entrar e 404.
   8. **Por último, Recepção e Plantão.** O Felipe pediu para **avaliar se não dá para ser a mesma área**. Nesse bloco, antes de migrar, entregue uma proposta curta: o que cada tela faz hoje, quem usa, o que juntar e o que fica separado. Pare para o Felipe decidir.

   Os blocos 4 a 7 estão numa ordem proposta pela master; o Felipe pode trocar.
3. Meus pontos e as telas do programa de pontos acabaram de ser feitos no Alicerce (item 51, `2e21a93`). No bloco 5, confira e ajuste só o que faltar.

## Decisões técnicas
- **Mesmas regras da fase 1:**
  - as classes `.mb-*` vêm só do Alicerce, e classe do app nunca começa com `mb-`;
  - ajuste local vai no `alicerce-local.css`, com o porquê;
  - nunca edite `crm/src/alicerce/` nem `crm/public/alicerce/`: se faltar algo no Alicerce, diga na entrega e a master leva ao Felipe;
  - marque `migrada` na `Casca` de cada tela migrada.
- **Textos** seguem o `Vocabulario` do guia: frases curtas, imperativo, caixa de frase, sem exclamação.
- **No fim da fase 2**, com a última tela migrada, saem as cores antigas do `tailwind.config.ts`, o `data-tema` antigo e as classes `*-antigo`. Isso é um bloco à parte, depois do 8.
- **Conferência visual** no preview isolado: `node scripts/visual-preview.mjs`, depois `npx next build` em `.visual-preview` e `--serve` na porta 4173, com `scripts/conferir-alicerce.mjs`. Crie um modo novo por bloco quando precisar.

## Etapas de cada bloco
1. **Print primeiro, e pare.** Migre o bloco e tire as capturas em 375px e desktop, nos temas papel e grafite, em `crm/local/alicerce-fase2/<bloco>/`. Em cada peça, cite a linha do guia que justifica o uso. Pare para o Felipe ver.
2. Depois do ok, faça os ajustes pedidos, rode `npm test` e `npx tsc --noEmit` e entregue.
3. Atualize a seção 2 de `docs/design-system.md` com a linha do bloco.

## Arquivos permitidos
- As rotas e os componentes do bloco em andamento (`crm/src/app/<rotas do bloco>/` e `crm/src/components/<área do bloco>/`).
- `crm/src/components/casca.tsx` e `crm/src/components/alicerce/menu*.ts`, só no que o bloco pedir (a separação de Parcerias, por exemplo), com `menu.test.ts`.
- `crm/src/app/alicerce-local.css`, `scripts/conferir-alicerce.mjs` e `docs/design-system.md`.
- **Não toque:** `crm/src/alicerce/` e `crm/public/alicerce/`, `ref/`, `crm/.env.local`, `crm/supabase/` (sem mudança de banco; se o bloco pedir, pare e diga), `portal/`, e os arquivos soltos de outras frentes em `docs/`.

## Pronto quando (cada bloco)
- As telas do bloco usam só peças do Alicerce, com a `Casca` marcada `migrada`.
- Há capturas em 375px e desktop nos dois temas, sem rolagem lateral.
- `npm test` e `npx tsc --noEmit` passam, e a conferência do bloco no `conferir-alicerce.mjs` passa.
- A linha do bloco está na seção 2 de `docs/design-system.md`.

## Limites
- Use os testes isolados e o preview isolado. Nunca use o Supabase real nem credenciais reais.
- Não instale nada, não reinicie serviço, não publique.
- **Sem commit.**
- Use um Chrome headless por vez e uma conferência por vez, para não travar o PC do Felipe.
