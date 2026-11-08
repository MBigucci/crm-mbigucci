# Brief: o portal do Base360 no Alicerce e como app do site todo (item 50)

## Leia antes
- `CLAUDE.md` (raiz) e `.claude/skills/publicar-wordpress/SKILL.md`: como o portal e o Vendas são publicados (o portal na raiz de `base360.mbigucci.com.br`, o Vendas em `/vendas/`).
- `portal/gerar.mjs` e `portal/fonte.html`: o portal hoje (gerado; não edite `index.html` à mão).
- `docs/notificacoes.md` inteiro: os avisos (push), o `sw.js`, a Edge Function `avisos`, o teste do aviso e o que já foi confirmado no iPhone em 07/11/2026.
- Os arquivos do Vendas: `crm/public/sw.js`, `crm/public/manifest.webmanifest`, `crm/src/lib/push.ts`, `crm/src/components/avisos-aparelho.tsx` e `crm/src/app/layout.tsx`.
- Alicerce: `crm/src/alicerce/guia/README.md` e os guias das peças que usar (`guia/componentes/`: Cartao, Botao, MarcaBase360, Aparencia). O CSS é `crm/src/alicerce/bundle.css` e `tokens.css`, e as fontes estão em `crm/src/alicerce/fonts/`.

## O que o usuário pediu (Felipe, 08/11/2026)
1. **Portal no Alicerce:** a tela de escolha do módulo (Vendas e Repasse) sai do DS antigo (`marca/tokens`) e passa para o Alicerce, com o lockup Base360 e os dois temas.
2. **App do site todo:** o Base360 é instalado pela raiz (`base360.mbigucci.com.br`), com um só ícone. Os avisos do Vendas chegam nesse app, inclusive no iPhone.
3. **Abre no último módulo usado:** se o último foi o Vendas, abre direto nele. O portal fica a um toque, pelo logo. Na primeira vez, ou sem registro, abre no portal.
4. **Quem instalou pelo `/vendas/`:** só o Felipe. Ele reinstala, então não precisa manter a instalação antiga.

## Decisões técnicas
- **Um service worker só, na raiz:** o `sw.js` fica em `/sw.js`, com escopo `/`, e é publicado com o portal.
  - O Vendas registra `/sw.js` com escopo `/`, não mais `/vendas/sw.js`.
  - O `manifest.webmanifest` passa à raiz, com `start_url` e `scope` em `/`.
  - Leve para a raiz o que o `sw.js` do Vendas faz hoje: o push e o clique no aviso, que abre a URL certa dentro de `/vendas/`.
  - O SW antigo de `/vendas/` precisa ser desregistrado quando o app novo abrir, para não sobrar uma assinatura dupla.
- **De onde vem o arquivo:** o `sw.js` e o manifest da raiz são gerados por `portal/gerar.mjs` a partir de uma fonte única. Não deixe duas cópias divergentes. Se o Vendas precisar de uma cópia em `crm/public/` para o desenvolvimento local, gere a partir da mesma fonte e diga como.
- **Último módulo:** o Vendas grava `base360:ultimo-modulo` (no `localStorage` do mesmo domínio) ao abrir. A raiz, quando aberta como app (`display-mode: standalone`), lê esse valor e redireciona. No navegador normal mostra sempre o portal. Use `try/catch`: sem storage, mostra o portal.
- **Alicerce no portal:** o `gerar.mjs` embute o `tokens.css` e o `bundle.css` copiados de `crm/src/alicerce/`, sem editar nada lá, e copia as fontes para `portal/fonts/`, que fica fora do Git (`.gitignore`). Não carregue nada de fora.
- **Ícones:** os ícones do app na raiz são os mesmos do Vendas (`crm/public/icons/`), copiados pelo gerador.
- **Publicação:** o pacote da raiz passa a ter `index.html`, `.htaccess`, `repasse/`, `sw.js`, `manifest.webmanifest`, `icons/` e `fonts/`. Atualize a skill `publicar-wordpress` e o `docs/notificacoes.md` com o caminho novo.

## Etapas
1. **Mockup primeiro, e pare.** Gere o portal novo e capture a tela em 375px e desktop, nos temas papel e grafite. Guarde em `crm/local/mockup-portal/` e pare para o Felipe ver. Mostre também o plano do SW, numa lista curta: o que muda em cada arquivo.
2. Depois do ok: o SW na raiz, o manifest, o registro no Vendas, o último módulo, a limpeza do SW antigo e os testes.
3. Docs: `docs/notificacoes.md`, a skill `publicar-wordpress` e o roteiro de reinstalação do Felipe no iPhone (passo a passo curto).

## Arquivos permitidos
- `portal/` inteiro e `.gitignore` (só para `portal/fonts/`).
- `crm/public/sw.js`, `crm/public/manifest.webmanifest`, `crm/src/lib/push.ts`, `crm/src/components/avisos-aparelho.tsx`, `crm/src/app/layout.tsx` e testes novos em `crm/src/lib/` só para o SW, o último módulo ou o push.
- `docs/notificacoes.md` e `.claude/skills/publicar-wordpress/SKILL.md`.
- **Não toque:** o programa de pontos, em que outra frente do Codex está trabalhando agora (`crm/src/app/meus-pontos/`, `programa/`, `plantao/`, `checkin-gerente/`, `crm/src/components/programa/`, `crm/src/lib/programa*`, `crm/src/components/alicerce/menu.ts`, `crm/supabase/`). Também não toque em `crm/src/alicerce/` e `crm/public/alicerce/` (vêm do artifact), em `ref/`, em `crm/.env.local`, nem nos arquivos soltos de outras frentes em `docs/`.

## Pronto quando
- `node portal/gerar.mjs` gera o pacote sem erro e o `index.html` não carrega nada de fora.
- O teste novo (`node --test`) cobre:
  - a escolha do último módulo: com Vendas, sem registro e sem storage;
  - o clique no aviso abrindo a URL de `/vendas/`;
  - o manifest com o escopo `/`.
- No preview isolado, um servidor local serve a raiz com o portal e o `/vendas/` com o build. Lá ficam conferidos:
  - o SW registrado em `/` controla `/` e `/vendas/`;
  - o SW antigo some.

  O push de verdade no iPhone fica pendente para o Felipe e entra no roteiro de reinstalação.
- Há capturas em 375px e desktop em `crm/local/mockup-portal/`.
- Os docs e a skill estão atualizados.

## Limites
- **Outra frente do Codex está rodando agora no `crm/`.** Não rode `npm test`, `npm run build`, `npx next build` nem o `scripts/visual-preview.mjs` do `crm/` enquanto ela estiver ativa, e não use a porta 4173. Use só `node --test` nos seus arquivos de teste e um servidor estático próprio, numa porta livre (por exemplo 4180). A suíte completa e o build, a sessão master roda na revisão.
- Use um Chrome headless por vez, com perfil próprio em `crm/local/perfil-portal`.
- Nunca use o Supabase real nem credenciais reais. Não instale pacotes e não publique nada.
- **Sem commit.** Entregue a lista de arquivos mudados, a saída dos testes e as pendências.
