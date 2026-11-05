# Brief: aplicar o logo Base360 no CRM (módulo de Vendas) e no DS

## Leia antes
- `CLAUDE.md`, `docs/design-system.md` (seção "Tema e navegação do CRM — 05/11/26") e a skill `.claude/skills/tela-ds-mbigucci/SKILL.md`.
- `docs/marca-base360.md`: as regras de uso do logo (cores, tamanho mínimo, respiro, nome do módulo, ícone, favicon, o que não fazer). Os arquivos estão em `docs/marca-base360/`, com o script `gerar-png.mjs`.
- `docs/codex-logo-base360.md` e a memória do projeto sobre o logo escolhido, o Quadrante.
- O código que muda:
  - `crm/src/components/cabecalho.tsx` (`Marca`, `BarraLateral`, menu do celular);
  - `crm/src/app/layout.tsx` (título, nome do app, ícones);
  - `crm/src/app/entrar/page.tsx`;
  - `crm/public/manifest.webmanifest` e `crm/public/icons/`;
  - `crm/scripts/gerar-icones.mjs`;
  - `crm/public/sw.js` e a Edge Function `avisos` (`crm/supabase/functions/avisos/`), onde aparece o nome nos avisos.
- O artifact MBigucci Design System, `https://claude.ai/artifact/QesJh8EPBkLqV5jjbpNFEi`, seção `project/base360.md` com o espaço do logo reservado. Siga as instruções do tipo Design System que vêm com a ação `read`: leia antes, publique só o que mudou e mande o índice por último.

## O que o Felipe pediu (05/11/2026)
- **Agora:** implementar e testar. **Publicar no site só depois** do ok da diretoria e da busca no INPI. Nesta frente não se gera nem se sobe pacote.
- **Nome do app para o corretor: "Base360".** Vale para o nome embaixo do ícone no celular (`short_name` e `name` do manifest, `appleWebApp.title`), para o título da aba e para a tela de entrar. O cabeçalho mostra o lockup **"Base360 · Vendas"**.
- **Textos de interface que dizem "CRM" passam a "Base360 Vendas":**
  - as instruções de instalar o app em Minha conta;
  - os avisos de Avisos neste aparelho;
  - "não está ativa no CRM";
  - "o CRM preenche os campos";
  - "não tem WhatsApp no CRM";
  - "Desativado, não entra no CRM";
  - "Ele sai do CRM";
  - o "MBigucci · CRM" impresso no painel e no relatório do stand;
  - e o que mais a busca achar.

  **Ficam como estão:** a pasta `crm/` do repositório, os nomes internos no código, os comentários e as referências ao "CRM da Bruna", que é outro produto.
- **Logo MBigucci:** sai do cabeçalho e vai para o **rodapé da barra lateral** (computador), para o **fim do menu do celular**, depois da conta, e para a **tela de entrar**.
- **Design system:** o logo entra no espaço reservado da seção Base360 do artifact, com as regras de `docs/marca-base360.md`.
- **Endereço novo (ajuste do Felipe):**
  - o módulo de Vendas sai de `mbigucci.com.br/crm` e vai para **`mbigucci.com.br/base360/vendas`**;
  - em **`mbigucci.com.br/base360`** fica uma **tela de escolha do módulo**, com o logo Base360 e dois cartões: **Vendas**, que leva a `/base360/vendas/`, e **Repasse**, que leva ao endereço atual do sistema da Roberta;
  - **`/crm` redireciona** para `/base360/vendas`, preservando o resto do caminho (`/crm/leads/` → `/base360/vendas/leads/`), para links salvos e ícones já instalados.

## Decisões técnicas
- **Cabeçalho:** o `Marca` passa a usar o lockup "Base360 · Vendas" em SVG inline, a partir de `docs/marca-base360/lockup-vendas-*.svg`, com cores por token (`currentColor` ou variáveis), sem duas imagens por tema. Mantenha o link para `/` e um nome acessível ("Base360 Vendas, início"). Respeite o tamanho mínimo e o respiro de `docs/marca-base360.md`.
- **Altura:** o lockup cabe no cabeçalho de 60px do celular junto com o botão sanduíche de 44px, em 320 e 375px, e no de 64px do computador ao lado dos atalhos.
- **Logo MBigucci:** o PNG `mbigucci-logo.png` continua servido pela pasta do site (não vem no build) e mantém o fallback em texto. No rodapé da lateral ele não compete com os destinos: fica pequeno e, com a lateral recolhida, some ou vira um selo compacto. No menu do celular entra depois da conta. Na tela de entrar, abaixo do formulário.
- **Ícones do app:**
  - `crm/scripts/gerar-icones.mjs` passa a gerar `icon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` e `maskable-512.png` a partir de `docs/marca-base360/icone*.svg` e `favicon.svg`;
  - os PNGs em `crm/public/icons/` hoje entram no build. Mantenha o mesmo esquema que o projeto já usa e diga se eles são versionados ou gerados;
  - `theme-color` e as cores do manifest seguem os tokens.
- **Avisos no celular:** o título e o nome que aparecem na notificação, em `sw.js` e na Edge Function `avisos`, passam a dizer "Base360". Mudar a Edge Function exige que o Felipe faça o deploy dela; deixe isso na lista de pendências.
- **Sem mudança de regra de negócio, banco ou permissões.** Os e-mails de acesso do Supabase (modelos do Auth) ficam fora do código: liste o texto sugerido para o Felipe trocar no painel.
- **Endereço `/base360/vendas`:**
  - `BASE_PATH=/base360/vendas` no build. O `next.config.mjs` já lê o `BASE_PATH`; troque o padrão de `/crm` para `/base360/vendas` e confira tudo que monta caminho com o basePath: fontes, logo, manifest, `sw.js` e o escopo dele, ícones, `start_url` e `scope`;
  - procure `/crm` escrito fixo no código e troque. Hoje existem, por exemplo, o `VAPID_SUBJECT` padrão em `crm/supabase/functions/avisos/index.ts` e o comentário de `crm/public/sw.js`. Os links de avisos e da página pública `crm/wordpress/corretores/` também entram;
  - atualize a skill `.claude/skills/publicar-wordpress/SKILL.md` (tabela de destino e `BASE_PATH`), o `CLAUDE.md` (comando de build) e `docs/crm-arquitetura.md`. A pasta do repositório continua `crm/`.
- **Tela de escolha do módulo (`/base360/`):**
  - uma página estática à parte, sem login e sem Next, em `portal/` na raiz do repositório: `portal/index.html` e o que ela precisar;
  - usa o CSS de `marca/tokens/` (gerado por `gerar.mjs` e embutido na página), o lockup Base360 e os temas claro e escuro pelo sistema;
  - os cartões seguem o DS: barra de 4px, sem sombra e uma ação vermelha. A página tem título "Base360" e o mesmo ícone e favicon;
  - o endereço do Repasse é uma constante no topo do arquivo. **O Felipe ainda vai informar esse endereço.** Até lá o cartão aparece como "Repasse · em breve", sem link.
- **Redirecionamento de `/crm`:** um `crm-redirecionamento/.htaccess` (Apache do WordPress) com redirecionamento 301 de `/crm/(.*)` para `/base360/vendas/$1`, mais um `index.html` de reserva com redirecionamento por `meta refresh` e link, caso o servidor ignore o `.htaccess`. Escreva no relatório o roteiro do FTP: o que vai em `/base360/`, em `/base360/vendas/` e em `/crm/`, e que os arquivos antigos de `/crm/` saem.
- **Consequências que o relatório explica ao Felipe:**
  - quem já instalou o ícone abre pelo redirecionamento, mas o app instalado continua apontando para `/crm`. A orientação é reinstalar pelo endereço novo;
  - os avisos no celular param e precisam ser ligados de novo em Avisos neste aparelho, porque o service worker muda de escopo;
  - o login e as preferências (tema, lateral) continuam, porque o site é o mesmo;
  - no Supabase, Authentication > URL Configuration precisa do endereço novo em Site URL e Redirect URLs;
  - a Edge Function `avisos` precisa de deploy de novo.
- **DS:** publique o logo no artifact como assets (grupo "Logo Base360") e atualize `project/base360.md` e o componente `CabecalhoSistema` com o lockup. Depois, `node marca/tokens/conferir.mjs` continua passando.

## Etapas
1. **Prévia (pare para o Felipe ver).** Na cópia isolada (`node scripts/visual-preview.mjs`, `visual-pre-subida.mjs`, build da `.visual-preview`), capture a Lista do dia e a tela de entrar:
   - 1366 × 768: lateral aberta e recolhida;
   - 375 × 812: menu fechado e aberto;
   - temas claro e escuro;
   - o ícone na tela do celular e o favicon na aba.

   Entregue as capturas antes de seguir.
2. **Textos:** a lista do que mudou de "CRM" para "Base360 Vendas" (arquivo e linha), e o que ficou e por quê.
3. **DS:** publique o logo no artifact.
4. **Conferência:**
   - `npm run typecheck`, `npm test`, `npm run test:banco`, `node scripts/contraste-temas.mjs` e `node marca/tokens/conferir.mjs`;
   - o build isolado, sem `npm run dev` ligado;
   - teclado no cabeçalho, na lateral e no menu;
   - leitor de tela: o nome acessível do logo;
   - impressão do painel e do relatório do stand.

## Arquivos permitidos
- `crm/src/components/cabecalho.tsx`, `crm/src/app/layout.tsx`, `crm/src/app/entrar/page.tsx`, `crm/src/app/globals.css` (só classes do logo e do rodapé da lateral).
- Os arquivos de texto da lista acima (só as frases visíveis), `crm/public/manifest.webmanifest`, `crm/public/icons/`, `crm/public/sw.js` (só o nome), `crm/scripts/gerar-icones.mjs` e `crm/supabase/functions/avisos/` (só o nome).
- `docs/design-system.md` (seção do tema: o logo e o rodapé da lateral) e `docs/marca-base360.md` (seção de aplicação).
- Para o endereço novo: `crm/next.config.mjs` (só o padrão do `BASE_PATH`), arquivos com `/crm` fixo, `crm/wordpress/corretores/` (só o link), a skill `publicar-wordpress`, `CLAUDE.md` (comando de build), `docs/crm-arquitetura.md` e `docs/notificacoes.md` (escopo do `sw.js`). Também criar `portal/` e `crm-redirecionamento/`.
- O artifact do DS: só `project/` e os assets do grupo do logo.
- Não tocar: `discovery/`, `ref/`, `C:\Projects\base360-repo`, `marca/tokens/tokens.json` (salvo se faltar um token, e então com o `conferir.mjs` passando) e `docs/marca-base360/*.svg`. Se um SVG precisar de ajuste, proponha e não altere.

## Pronto quando
- O cabeçalho mostra "Base360 · Vendas" nos dois temas e nas três larguras (320, 375 e 1366px) sem cortar nem rolar para os lados, e o botão sanduíche continua com 44px.
- O logo MBigucci aparece no rodapé da lateral (aberta), no fim do menu do celular e na tela de entrar, e o fallback em texto funciona sem o PNG.
- O manifest, os ícones, o favicon e o título da aba dizem "Base360", e o ícone novo aparece na prévia do celular e da aba.
- Nenhum texto visível ao corretor diz "CRM". A busca está anexada ao relatório.
- A suíte passa: typecheck, `npm test`, `test:banco`, contraste e o `conferir.mjs` dos tokens. O build isolado também passa.
- O logo está no artifact do DS, no espaço reservado.
- O build com `BASE_PATH=/base360/vendas` referencia `/base360/vendas/_next/...`, e manifest, `sw.js`, ícones e fontes respondem nesse caminho na prévia servida sob `/base360/vendas/`. Não sobra `/crm` fixo: a busca está anexada.
- A tela `/base360/` abre sem servidor, nos dois temas, em 375 e 1366px, com o cartão Vendas funcionando e o Repasse em "em breve" enquanto não houver endereço.
- O redirecionamento foi testado num servidor local que imita a pasta: `/crm/leads/?id=x` vai para `/base360/vendas/leads/?id=x`, pela regra e pelo `index.html` de reserva.
- O relatório separa o que foi conferido na prévia do que só o Felipe confere: o celular real, o deploy da Edge Function, os e-mails do Supabase e a publicação depois da diretoria.

## Limites
- Teste isolado: a cópia `.visual-preview` com dados fictícios, num navegador headless com perfil em `local/` ou na pasta temporária, nunca na sessão do Felipe. As capturas ficam fora do Git.
- Sem instalar pacotes nem reiniciar serviços, sem login real e sem credenciais.
- **Sem gerar pacote, sem publicar o site e sem commit.** Entregue a lista de arquivos, as capturas, a saída da suíte e as pendências. A sessão master revisa e commita.
- Não rode `npm run build` com `npm run dev` ligado, nem a suíte ao mesmo tempo que outra frente.
