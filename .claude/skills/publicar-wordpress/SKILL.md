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
| `crm/` | a confirmar com o Felipe (padrão `/crm`) | `/crm` |

Se a pasta for outra, pergunte antes. Um `BASE_PATH` errado quebra todos os arquivos `/_next/`.

## 2. Conferir o ambiente sem expor segredos
- Confirme que o `.env.local` do app existe e tem as variáveis do `.env.example`. Leia só os **nomes** das variáveis e nunca repita os valores no chat.
- No CRM, as variáveis são só as `NEXT_PUBLIC_` com a chave **anon**. Se aparecer `service_role`, pare e avise.

## 3. Gerar o build
Rode no diretório do app (ex.: `discovery/`). No Git Bash, defina a variável na mesma linha do comando:
```bash
BASE_PATH=/pesquisa-crm npm run build
```
Antes de entregar, confira:
- O typecheck e o build terminaram sem erro.
- `out/index.html` referencia `/<BASE_PATH>/_next/...`.
- Não há nenhum `.env*` dentro de `out/`. O hook do projeto bloqueia isso.

## 4. Entregar ao Felipe
Diga:
- O caminho completo da pasta `out/`.
- Que ele deve enviar **o conteúdo** de `out/` para dentro da pasta do site, substituindo os arquivos antigos.
- Que o `mbigucci-logo.png` deve continuar na pasta. Ele não vem do build.

## 5. Conferir depois da publicação
Quando ele avisar que publicou, confira:
- O HTML do site referencia `/<BASE_PATH>/_next/static/...`.
- Um arquivo CSS de `/_next/` responde 200.
- `/<BASE_PATH>/mbigucci-logo.png` responde 200.

Use o `curl -s`. Relate o que conferiu e o que não deu para conferir.
