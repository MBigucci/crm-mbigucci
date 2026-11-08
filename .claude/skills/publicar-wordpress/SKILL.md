---
name: publicar-wordpress
description: Gera o build estático de discovery/ ou crm/ com o BASE_PATH certo e prepara a pasta para o Felipe subir no WordPress da MBigucci, depois confere o site publicado. Use quando pedirem para publicar, subir, atualizar o site ou gerar o pacote de deploy.
---

# Publicar no WordPress

Os apps são exportação estática (`output: "export"`). O Felipe envia a pasta `out/` por FTP para uma pasta na raiz do WordPress. Você **não** tem acesso ao FTP: gere o pacote, diga onde ele está e confira depois que ele publicar.

## 1. Confirmar o destino
| App | Pasta no site | BASE_PATH |
| --- | --- | --- |
| `discovery/` (pesquisa) | mbigucci.com.br/pesquisa-crm | `/pesquisa-crm` |
| `crm/` (módulo de Vendas do Base360) | **base360.mbigucci.com.br/vendas**, pasta `vendas/` do site próprio do Base360 | `/vendas` |
| `portal/` (portal e app do site todo) | **base360.mbigucci.com.br**, raiz do mesmo site (`index.html`, `.htaccess`, `repasse/`, `sw.js`, `manifest.webmanifest`, `icons/`, `fonts/` e `mbigucci-logotipo.png`) | não tem: gerado por `node portal/gerar.mjs` |
| `crm-redirecionamento/` | mbigucci.com.br/crm | não tem: `.htaccess` e `index.html` que levam `/crm/...` para `https://base360.mbigucci.com.br/vendas/...` |

Se a pasta for outra, pergunte antes. Um `BASE_PATH` errado quebra todos os arquivos `/_next/`. O arquivo de ambiente local do `crm/` pode ter um `BASE_PATH` antigo: passe o valor na linha do comando, que vence o arquivo.

Na troca de `/crm` para o Base360 (só depois do ok da diretoria e da busca no INPI): o TI cria na Locaweb o registro DNS de `base360`, que é **um site estático próprio** na Hostinger (fora do WordPress), com SSL. Na `public_html` dele vão o portal (`portal/index.html`, `portal/.htaccess` e `portal/repasse/`) e, na pasta `vendas/`, o build do `crm/` com o `mbigucci-logo.png`. O conteúdo de `crm-redirecionamento/` (com o `.htaccess`) substitui os arquivos antigos de `/crm/` no site institucional. A Hostinger não aceita dois níveis de subdomínio (`vendas.base360…`), e juntar o Repasse no mesmo app sai caro (Felipe, 05/11/2026).

## 2. Conferir o ambiente sem expor segredos
- Confirme que o `.env.local` do app existe e tem as variáveis do `.env.example`. Leia só os **nomes** das variáveis e nunca repita os valores no chat.
- No CRM, as variáveis são só as `NEXT_PUBLIC_` com a chave **anon**. Se aparecer `service_role`, pare e avise.

## 3. Gerar o build
Antes do build do Vendas, na raiz do repositório rode `node portal/gerar.mjs`. O gerador usa o Alicerce em modo de leitura, copia fontes/ícones/logo e gera o SW e manifest da raiz. As cópias em `crm/public/sw.js` e `crm/public/manifest.webmanifest` vêm das mesmas fontes (`portal/sw.fonte.js` e `portal/manifest.fonte.webmanifest`): não editar à mão. O layout embute o runtime compartilhado `portal/app.fonte.js` durante o build executado em `crm/`.

Se outra frente estiver ativa no CRM (limite do item 50), não executar build, `npm test`, visual-preview nem usar 4173: apenas `node --test crm/src/lib/portal-app.test.mjs` e `node portal/conferir-mockup.mjs` na raiz (4180, um Chrome com perfil `crm/local/perfil-portal`). Essa prévia usa o build anterior com runtime novo injetado só na resposta local e HTTPS bloqueado; não substitui a revisão do build final pela sessão master.

Rode no diretório do app (ex.: `discovery/`). No Git Bash, defina a variável na mesma linha do comando:
```bash
BASE_PATH=/pesquisa-crm npm run build
```
No `crm/`: `BASE_PATH=/vendas npm run build`. Aí o `out/index.html` referencia `/vendas/_next/...`.
Antes de entregar, confira:
- O typecheck e o build terminaram sem erro.
- `out/index.html` referencia `/<BASE_PATH>/_next/...`.
- Não há nenhum `.env*` dentro de `out/`. O hook do projeto bloqueia isso.
- O manifest do Vendas aponta para `/manifest.webmanifest`, com `id`, `start_url` e `scope` iguais a `/`; `/sw.js` registra em `/`, e os caminhos de push continuam em `/vendas/`.

## 4. Entregar ao Felipe
Diga:
- O caminho completo da pasta `out/`.
- Que ele deve enviar **o conteúdo** de `out/` para dentro da pasta do site, substituindo os arquivos antigos.
- Que o `mbigucci-logo.png` deve continuar na pasta. Ele não vem do build.

No Base360, publicar raiz e Vendas juntos: enviar os arquivos gerados `portal/index.html`, `portal/.htaccess`, `portal/repasse/`, `portal/sw.js`, `portal/manifest.webmanifest`, `portal/icons/`, `portal/fonts/` e `portal/mbigucci-logotipo.png` para a raiz; o conteúdo de `crm/out/` para `vendas/`. Não enviar `*.fonte.*`, `gerar.mjs`, `conferir-mockup.mjs`, planos ou capturas. As fontes são ignoradas pelo Git, então executar o gerador antes de montar o pacote. O SW é só de push, sem cache de páginas/dados.

O Felipe é o único com instalação antiga por `/vendas/`: seguir `docs/notificacoes.md`, seção 12, para remover o ícone antigo e reinstalar pela raiz no Safari. A confirmação do aviso real no iPhone em 07/11/2026 (commits `55a1b3e`, `f7d0a87`) é anterior à migração: repetir teste e clique após a reinstalação.

## 5. Conferir depois da publicação
Quando ele avisar que publicou, confira:
- O HTML do site referencia `/<BASE_PATH>/_next/static/...`.
- Um arquivo CSS de `/_next/` responde 200.
- `/<BASE_PATH>/mbigucci-logo.png` responde 200.
- No Base360: `/sw.js` responde como JavaScript e `/manifest.webmanifest` como manifest, sem redirecionar para HTML. Conferir no navegador o escopo `/` controlando portal e Vendas, o antigo `/vendas/` removido, apenas um ícone e o aviso de teste no iPhone. A raiz no navegador normal mostra portal; no app instalado abre o último módulo; logo retorna ao portal com `?portal=1`.

Use o `curl -s`. Relate o que conferiu e o que não deu para conferir.
