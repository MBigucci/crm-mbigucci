# Avisos no celular (notificações push)

> Construído em 29/10/2026 a partir do item 15 de `docs/referencia-crm-bruna.md` (seção 11), adaptando o Web Push do CRM da Bruna (`ref/CRM Bruna/src/lib/push.ts`, `push-server.ts`, `app/api/push/*`, `public/sw.js`, `supabase/agendar-notificacoes.sql`). O passo a passo de instalação está em `crm/README.md`, seção 8. As regras dos leads estão em `docs/leads.md` e as das visitas em `docs/visitas.md`.

## Sumário
1. O que entrou e o que ficou de fora
2. Como funciona
3. Os avisos e quando saem
4. Horário de São Paulo e horário de atendimento
5. Não repetir
6. Aparelhos e escolha dos tipos
7. Segurança e segredos
8. Tela
9. Como ajustar
10. Testes
11. Da Bruna: o que veio, o que foi adaptado e o que ficou de fora
12. App do site todo e reinstalação no iPhone (08/11/2026)

## 1. O que entrou e o que ficou de fora

- **Entrou:** service worker só para avisos (`portal/sw.fonte.js` → `portal/sw.js`, escopo `/` em `base360.mbigucci.com.br`, sem cache; até 08/11/2026 era `/vendas/`, antes de 05/11 era `/crm/`), card "Avisos neste aparelho" em Minha conta (ligar, desligar, tipos, enviar teste), tabelas `push_assinaturas` e `push_log` com RLS, a Edge Function `avisos` (montagem, envio e criptografia sem dependências), o agendador a cada 5 min e o gatilho de lead atribuído (`crm/supabase/agendar-avisos.sql`).
- **Avisos:** próximo contato, visita 1 hora antes, visitas aguardando baixa no fim do dia, lead da empresa atribuído, prazo de 15 min (faltando 5 e estourado) e resumo do dia.
- **Depois (04/11/2026, item 28):** o tipo **Equipe**, para o gerente: o prazo de 15 min estourado num lead da empresa da equipe, na hora, e no fim do dia as visitas da equipe aguardando baixa.
- **Ficou de fora:** lista dos aparelhos para remover um celular perdido (cada um só vê os próprios; o aparelho sai sozinho em 60 dias sem abrir o CRM), religar sozinho ao entrar de novo na mesma conta (a Bruna faz; aqui a pessoa liga de novo em Minha conta) e qualquer aviso do programa de pontuação.
- **Programa de pontuação:** os avisos não tratam de pontos, verba nem ranking. Até 04/11/2026 era regra de sigilo, com teste; o sigilo acabou e o teste saiu, mas os textos ficaram como estavam.

## 2. Como funciona

1. **Ligar:** o portal e o Vendas registram `/sw.js` com escopo `/` ao abrir, sem pedir permissão. Em Minha conta, a pessoa toca em "Ligar avisos": o navegador pede a permissão e assina o serviço de push com a chave pública VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) nesse registro raiz, após sua ativação e a limpeza do registro antigo. A assinatura vai para o banco pela função `push_assinar`.
2. **Rodada:** a cada 5 min, o `pg_cron` chama a Edge Function `avisos` pelo `pg_net`, com o cabeçalho `x-avisos-segredo`. A função pergunta ao banco se o segredo confere (`avisos_segredo_ok`) e roda:
   - `avisos_limpar()`: tira o log com mais de 30 dias e os aparelhos sem abrir o CRM há 60;
   - `avisos_dados()`: devolve o horário de atendimento, as assinaturas, os leads e as visitas abertas de quem tem aparelho e conta ativa, com o fim do prazo já calculado por `private.fim_do_prazo` (a mesma conta do painel);
   - `montarAvisos()` (TypeScript puro, na própria função): decide o que vale agora;
   - `avisos_registrar()`: grava no `push_log` e devolve só o que ainda não tinha saído;
   - envia para cada aparelho, cifrando com aes128gcm e assinando com o VAPID;
   - `push_esquecer()`: apaga os aparelhos que o serviço disse que não existem mais (404 ou 410);
   - `avisos_desmarcar()`: devolve ao log o aviso que falhou em todos os aparelhos, para a próxima rodada.
3. **Na hora:** quando o gerente atribui um lead da empresa (no cadastro, na troca de dono ou no Lead perdido), um gatilho em `leads` chama a mesma função na hora. É a mesma rodada: o gatilho só adianta.
4. **No aparelho:** o `sw.js` mostra o aviso e, no toque, abre a tela certa dentro de `/vendas/` (a ficha do lead, a Agenda ou a lista do dia). Se o app já está aberto, ele vai para a tela nessa janela.

Por que assim: o site é exportação estática no WordPress, sem servidor. Na Bruna o envio roda em rotas de API da Vercel; aqui ele roda numa Edge Function do Supabase, e o agendamento no `pg_cron`.

## 3. Os avisos e quando saem

| Tipo (slug) | Quando | Título e texto | Abre |
| --- | --- | --- | --- |
| Próximo contato (`contato`) | Na hora marcada, até 30 min depois. Mais de 3 na mesma rodada viram um aviso só. | "Hora do contato" · "Ana Souza · Marco Zero One. Marcado para 14h." / "5 contatos para agora" · "Ana, Bruno, Caio e mais 2. Veja a lista do dia." | Ficha do lead / lista do dia |
| Visita (`visita`) | Até 65 min antes (chega entre 60 e 65 min antes) | "Visita às 15h" · "Ana Souza · Marco Zero One · Stand de vendas" | Ficha do lead |
| Visita (`visita`) | No fim do atendimento (19h no padrão), até 1 h depois, se houver visita aberta que já passou | "2 visitas aguardando baixa" · "Bruno e Ana. Registre como foi." | Agenda |
| Lead da empresa (`atribuido`) | Na hora, dentro do horário de atendimento; fora dele, na abertura. Só se o prazo ainda não venceu. | "Lead novo para você" · "Ana Souza · Marco Zero One. Responda em até 15 min." | Ficha do lead |
| Prazo de 15 min (`prazo`) | Faltando de 1 a 6 min | "Faltam 5 min para responder" · "Ana Souza · Marco Zero One aguarda o primeiro contato." | Ficha do lead |
| Prazo de 15 min (`prazo`) | Quando estoura, até 30 min depois | "Prazo de 15 min estourado" · "Ana Souza · Marco Zero One ainda está sem primeiro contato. Fale agora." | Ficha do lead |
| Equipe (`equipe`), só para o gerente | Prazo de 15 min estourado num lead da empresa de um corretor da equipe, na hora, até 30 min depois. Mais de 3 na mesma rodada viram um aviso só. | "Prazo de 15 min estourado na equipe" · "Ana Souza · Marco Zero One, com Bruno Lima, está sem primeiro contato. Veja o Lead perdido." / "4 prazos estourados na equipe" · "Bruno, Caio e Dani. Veja o painel." | Ficha do lead (onde está o Lead perdido) / Painel |
| Equipe (`equipe`), só para o gerente | No fim do atendimento (19h no padrão), até 1 h depois, se houver visita da equipe aberta que já passou | "3 visitas da equipe aguardando baixa" · "Bruno (2) e Caio (1). Cobre a baixa." | Agenda |
| Resumo do dia (`resumo`) | Na abertura do atendimento (9h no padrão), até 1 h depois, nos dias de atendimento. Dia sem pendências não manda nada; dia só com aniversário manda. | "Seu dia no Base360" · "1 aguardando primeiro contato · 2 atrasados · 1 contato para hoje · 2 visitas (10h, 15h30) · aniversário de Ana Souza" | Lista do dia |

- **Aniversários (item 16, `docs/leads.md`, seção 17):** `avisos_dados` manda só o dia e o mês (`dia_mes`, "MM-DD") dos leads ativos de quem tem aparelho, nunca o ano. A função decide com `ehAniversarioHoje`, a mesma regra da ficha: quem nasceu em 29/02 aparece em 28/02 nos anos que não são bissextos. Sem o SQL do item 16, o resumo sai como antes. Depois de mudar o `index.ts`, publique a função de novo (`crm/README.md`, seção 9).
- **Quem recebe:** o dono do lead e o corretor da visita. O lead da empresa só avisa quando quem atribuiu não é o próprio dono.
- **Equipe (item 28, Felipe, 04/11/2026):** vai para quem tem `dados.ver_equipe` em `role_permissions` (no padrão, o gerente) e é gerente de uma equipe (`teams.gerente_id`), sobre os corretores ativos dela, mesmo os que não têm aparelho. O gerente geral não recebe: ele vê todas as equipes e não é gerente de nenhuma. `avisos_dados` manda a lista `equipes` (gerente e corretores) só de quem tem o tipo Equipe ligado. O corretor continua recebendo o aviso dele do prazo, com outra chave. Sem o SQL do item 28, a função funciona como antes.
- **Lead da empresa em "novo":** fica só com os avisos do prazo e de atribuição. O de próximo contato não vale para ele, como na lista do dia.
- **Mesmo lead, vários avisos:** usam a mesma `tag` (`lead-<id>`), então o mais novo substitui o anterior na bandeja do celular.
- **Validade no serviço de push:** 1 h (30 min para o prazo e 4 h para o resumo). Celular desligado por mais tempo não recebe aviso velho.
- **A rodada é a cada 5 min:** o "faltam 5 min" pode chegar com 1 a 6 min, e o "hora do contato" até 5 min depois da hora. O lead atribuído não espera, por causa do gatilho.

- **Distribuição automática (06/11/2026):** os avisos vêm de `distribuicao_avisos_pendentes()` (`crm/supabase/distribuicao.sql`), com os textos de `textoDaDistribuicao` na Edge Function. Usam os tipos que já existem: "Lead da empresa" (lead novo, de plantão, mensagem nova, recebimento desligado), "Prazo" (fim da fila, sem sinal, mensagem sem resposta) e "Equipe" (perda, fila da equipe, repasse atrasado, A distribuir). Os de plantão e de sinal saem a qualquer hora; os outros, no horário. Pendente com mais de 24 h só é marcado. Tabela completa em `docs/distribuicao-automatica.md`, seção 10.

## 4. Horário de São Paulo e horário de atendimento

- **Fuso:** a função roda em UTC. Toda conta de dia e hora usa `America/Sao_Paulo` pelo `Intl`, sem depender do fuso do servidor. Os testes rodam no fuso local e em UTC.
- **Horário de atendimento** (`horario_atendimento`, em Configurações):
  - **resumo do dia:** na hora de abertura, só nos dias de atendimento;
  - **aguardando baixa:** na hora de fechamento, todos os dias (visita pode acontecer em dia sem plantão);
  - **lead atribuído:** só dentro do horário; fora dele, sai na abertura, quando o prazo começa a correr;
  - **prazo:** o fim já vem calculado só com minutos de atendimento.
- **Próximo contato e lembrete de visita não esperam o horário:** foi o corretor quem marcou a hora.
- **Horário inválido** (sem dia ou fim antes do início): vale o padrão, 9h às 19h todos os dias.

## 5. Não repetir

- Cada aviso tem uma chave por pessoa no `push_log`: `contato:<lead>:<hora marcada>`, `visita:<visita>:<início>`, `baixa:<corretor>:<dia>`, `atribuido:<lead>:<atribuído em>`, `prazo5:<lead>:<fim do prazo>`, `prazo:<lead>:<fim do prazo>`, `resumo:<pessoa>:<dia>` e, para o gerente, `equipe_prazo:<lead>:<fim do prazo>` e `equipe_baixa:<gerente>:<dia>`. O Lead perdido muda o fim do prazo (o prazo recomeça para quem recebeu), então o gerente é avisado de novo se o novo corretor também estourar.
- `avisos_registrar` grava com `on conflict do nothing` e devolve só as linhas novas. Duas chamadas ao mesmo tempo (o gatilho e o agendador) não mandam em dobro.
- **Remarcar muda a chave:** o contato remarcado, a visita remarcada e o lead reatribuído voltam a avisar.
- **Falha:** se o aviso não chegou a nenhum aparelho por falha do serviço (não por aparelho removido), ele sai do log e volta na próxima rodada. A janela de 30 min limita as tentativas.

## 6. Aparelhos e escolha dos tipos

- **Uma linha por aparelho** em `push_assinaturas` (endpoint, dono, chaves, `tipos`, nome do aparelho, `visto_em`). A escolha dos tipos é **por aparelho**, porque o card é "neste aparelho".
- **Ligar e mudar os tipos:** só pela função `push_assinar`, porque um aparelho pode trocar de dono (sair e entrar com outra conta). Ela recusa conta desativada, endereço que não é de serviço de push (FCM, Mozilla, Apple, Windows) e tipo desconhecido.
- **Desligar:** apaga a linha (RLS: só a própria) e cancela a assinatura no navegador.
- **Sair da conta:** o CRM apaga a linha deste aparelho antes do `signOut`.
- **Abrir o CRM:** renova o `visto_em`. Se as chaves VAPID mudaram, a assinatura antiga é cortada e a pessoa liga de novo.
- **iPhone:** só funciona com o Base360 instalado pela raiz (`https://base360.mbigucci.com.br/`) na Tela de Início, no iOS 16.4 ou mais novo. Pelo Safari comum o card explica como instalar e não mostra o botão. A instalação antiga pelo Vendas deve ser removida; roteiro na seção 12.

## 7. Segurança e segredos

- **Chave pública VAPID:** vai no build (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`). É pública por natureza.
- **Chave privada VAPID e chave de serviço:** só nos Secrets da Edge Function (`VAPID_PRIVATE_KEY`; a `SUPABASE_SERVICE_ROLE_KEY` o Supabase já põe). Nunca no `.env.local` do site nem no git.
- **Segredo do agendador:** gerado pelo próprio `agendar-avisos.sql` no Vault (`avisos_segredo`). Ninguém copia. A função pergunta ao banco se confere.
- **"Verify JWT" desligado na função:** o agendador chama sem login. A função confere o segredo e, no "Enviar teste", confere o login de quem chama no Auth e só manda para um aparelho dessa pessoa.
- **Funções `avisos_*`, `push_esquecer`, `push_log`:** fechadas para `anon` e `authenticated`. Só a chave de serviço chama.
- **Sem SSRF:** a função só faz POST para endereços dos serviços de push (a mesma lista do banco).

## 8. Tela

Minha conta (`/conta/`), card **Avisos neste aparelho**, entre "Seu WhatsApp" e "Trocar senha":

- texto curto e a explicação do iPhone (Tela de Início, iOS 16.4);
- estado com sinal: "✓ Ligados neste aparelho" ou "– Desligados neste aparelho";
- "O que avisar": os 5 tipos, com nome e explicação, marcados por padrão. Quem tem `dados.ver_equipe` vê também o sexto, **Equipe** ("Quando um lead da empresa estoura o prazo de 15 min e, no fim do dia, as visitas da equipe que aguardam baixa."), pelo campo `exige` de `TIPOS_AVISO` (`tiposDoAparelho`). Quem não vê nunca grava esse tipo. Com os avisos ligados, desmarcar grava na hora;
- desligado: "Ligar avisos" (a ação vermelha do card). Ligado: "Enviar teste" e "Desligar neste aparelho";
- bloqueado: o passo a passo para permitir, no iPhone, no Android ou no computador;
- sem a chave no build: "! Os avisos ainda não foram configurados no CRM."

Conferido em 375px em 29/10/2026 com o Supabase falso (`sqltest/fake-supabase-avisos-v9.mjs`, na pasta de notas): ligar, mudar tipo, enviar teste e desligar, sem rolagem horizontal. O navegador embutido bloqueia notificações, então o estado "ligado" foi visto com a assinatura simulada na aba.

## 9. Como ajustar

- **Intervalo da rodada:** em `agendar-avisos.sql`, `'*/5 * * * *'`. Rode o arquivo de novo.
- **Janelas e textos:** constantes no topo de `crm/supabase/functions/avisos/index.ts` (`VISITA_ANTES_MIN`, `PRAZO_AVISO_MIN`, `ATRASO_MAX_MIN`, `CONTATOS_JUNTOS`). Depois, cole o arquivo de novo no editor da função e faça o deploy.
- **Tipo novo:** some em `TIPOS_AVISO` da função e de `crm/src/lib/avisos.ts`, no check `push_assinaturas_tipos` e no `v_aceitos` de `push_assinar` (a última versão, no trecho do item 28 no fim do `schema.sql`). O teste compara as listas.
- **Ordem para ligar o item 28:** primeiro o `schema.sql` (aceita o tipo Equipe e manda as equipes), depois a função `avisos` de novo (`crm/README.md`, seção 9), depois o site. Com o site novo e o banco velho, o gerente que tentar ligar o tipo Equipe recebe "Tipo de aviso inválido"; o corretor não é afetado. O `agendar-avisos.sql` não muda.
- **Horários:** vêm de Configurações (horário de atendimento). Nada para mudar no código.

## 10. Testes

- **`npm test`** (`crm/src/lib/avisos.test.ts`, 28 testes): do item 28, o prazo estourado na equipe (na hora, uma vez, ficha; só corretores da equipe e lead da empresa em novo; Lead perdido gera chave nova; mais de 3 viram um aviso que abre o painel), a baixa da equipe às 19h (contagem por corretor, uma por dia, nada sem visita), só para o aparelho com o tipo Equipe, e o tipo Equipe só na tela de quem vê a equipe. Antes: cada aviso e suas janelas, remarcar gera chave nova, lead da empresa fora do horário, prazo de 5 min e estourado, resumo com as 4 contagens, dia sem pendências e dia sem atendimento, não repetir (`soNovos`), preferências por aparelho, juntar contatos, tentar de novo só na falha, tipos iguais na tela e na função, endereços de push, cifra que o aparelho decifra (RFC 8291) e o JWT do VAPID verificado com a chave pública.
- **`npm run test:banco`** (`crm/supabase/testes/avisos.test.mjs`, 13 testes no PGlite): do item 28, `avisos_dados` com a equipe do gerente que ligou o tipo Equipe (corretores ativos, leads e visitas do corretor sem aparelho), sem o corretor que marcou Equipe e sem o gerente que perdeu `dados.ver_equipe` no catálogo, o tipo aceito e o padrão sem ele. Antes: `push_assinar` com tipos padrão e escolhidos, RLS (cada um vê e apaga só os próprios; gerente e gerente geral não veem os da equipe; sem gravar direto), recusas (endereço, tipo, anônimo, desativado), aparelho que troca de conta, funções fechadas para o app, `avisos_dados` só de quem tem aparelho e conta ativa e com o fim do prazo, `avisos_registrar` sem repetir, `avisos_desmarcar`, `push_esquecer`, `avisos_limpar`, segredo no Vault e o gatilho de atribuição com um `pg_net` falso (chama só para o lead da empresa atribuído e não quebra o cadastro sem `pg_net`).
- **Criptografia:** além do teste, conferida uma vez contra a biblioteca `http_ece` (a que o `web-push` usa): ela decifrou a mensagem da função.
- **Confirmado no iPhone em 07/11/2026 pelo Felipe:** aviso real recebido pelo botão "Enviar um aviso de teste" em Avisos neste aparelho, após o `grant` de `service_role` (commits `55a1b3e` e `f7d0a87`). Essa confirmação é anterior à migração do SW para a raiz; não implica teste de todos os avisos nem do clique na rota.
- **Ainda não validado:** avisos do gerente/Equipe num celular real, Android, toque real na rota e reinstalação/push no iPhone após a migração de 08/11. A validação atual é local, sem Supabase real; seção 12.

## 11. Da Bruna: o que veio, o que foi adaptado e o que ficou de fora

Lido por inteiro em 29/10/2026: `ref/CRM Bruna/public/sw.js`, `src/lib/push.ts`, `src/lib/push-server.ts`, `src/app/api/push/cron/route.ts`, `src/components/account-dialog.tsx` (PushSettings), `supabase/schema.sql` (`push_subscriptions`, `push_log`, `push_subscribe`, `push_due`) e `supabase/agendar-notificacoes.sql`.

| Recurso da Bruna | Como ficou | Por quê |
| --- | --- | --- |
| `public/sw.js` só com push, sem cache | ✓ Trazido, com caminhos relativos ao escopo (`/vendas/`) e navegação na janela aberta | O `basePath` muda tudo de lugar; o `postMessage` da Bruna dependia de um ouvinte no app |
| Envio em rota de API da Vercel com `web-push` | ! Edge Function `avisos`, com Web Push em WebCrypto e sem dependências | Exportação estática não tem servidor; um arquivo só para colar no editor do Supabase |
| `pg_cron` a cada 10 min chamando o app, segredo no Vault | ! A cada 5 min chamando a função; o segredo no Vault, conferido pelo banco | O prazo de 15 min pede rodada mais curta |
| `push_due`: a lógica de quem recebe o quê em SQL, para todos | ! Em TypeScript puro na função, por dono, com os dados de `avisos_dados` | Testável no `npm test`; cada corretor só recebe o que é dele |
| Lead novo para o outro usuário, na hora, disparado pelo aparelho que cadastrou | ! Lead da empresa atribuído, para o corretor que recebeu, por gatilho no banco | Vale para qualquer forma de atribuir (cadastro, troca, Lead perdido) e não depende do aparelho do gerente |
| Prazo do aviso calculado no aparelho (servidor em UTC) | ! Calculado no banco com `private.fim_do_prazo` e o horário de Configurações; hora em `America/Sao_Paulo` | Seção 4 |
| Lembrete de visita ~1 h antes | ✓ Trazido | |
| Resumo do dia entre 9h e 12h, para todos | ! Na abertura do atendimento, por pessoa, até 1 h depois | Cada corretor vê só os próprios números |
| — | + Próximo contato na hora marcada | É o T1 da pesquisa, que a Bruna não tem |
| — | + Prazo de 15 min faltando 5 e estourado | Regra do lead da empresa (`docs/leads.md`, seção 4) |
| — | + Visitas aguardando baixa no fim do dia | A baixa auditável é da MBigucci (`docs/visitas.md`) |
| Tipos por aparelho (`kinds`), ligar e desligar, enviar teste | ✓ Trazido | |
| Lista de aparelhos da equipe para remover celular perdido | ✕ Fora | Cada um só vê os próprios; o aparelho sai sozinho em 60 dias sem uso |
| Aparelho inativo há 45 dias sai | ! 60 dias | Corretor de férias não perde os avisos |
| Religar sozinho ao entrar de novo na mesma conta (`localStorage`) | ✕ Fora | Ao sair, a linha é apagada; a pessoa liga de novo em Minha conta |
| Tentar de novo quando nada saiu (`push_unmark`) | ✓ Trazido (`avisos_desmarcar`) | |
| Apagar aparelho que respondeu 404/410 (`push_forget`) | ✓ Trazido (`push_esquecer`) | |
| Só endereços de serviços de push | ✓ Trazido, no banco e na função | |
| Explicação do iPhone instalado e do desbloqueio | ✓ Trazido, com os caminhos em pt-BR do DS | |
| Ícones com Lucide no card | ✕ Fora | O MBigucci DS não usa ícones; sinais ✓ – ! |

## 12. App do site todo e reinstalação no iPhone (08/11/2026)

Portal aprovado pelo Felipe em 08/11, no Alicerce. Um app Base360 instalado pela raiz, manifest com `id`, `start_url` e `scope` em `/`; o Vendas continua em `/vendas/`. Repasse continua em outro subdomínio e não compartilha SW nem storage.

- **Fontes únicas:** `portal/sw.fonte.js`, `portal/manifest.fonte.webmanifest` e `portal/app.fonte.js`. `node portal/gerar.mjs` gera o pacote raiz e as cópias `crm/public/sw.js` e `crm/public/manifest.webmanifest` para desenvolvimento. Nunca editar essas cópias à mão nem registrar `/vendas/sw.js`. Não há cache de páginas, dados ou interceptação de requisições.
- **Inicialização:** o gerador embute `app.fonte.js` no portal. `crm/src/app/layout.tsx` lê a mesma fonte durante o build (executado em `crm/`) e a embute no Vendas. O runtime registra `/sw.js`, aguarda sua ativação e desregistra somente o escopo exato `/vendas/`, cancelando antes a assinatura antiga. Se o cancelamento falhar, mantém o registro e permite nova tentativa; não cria assinatura nova nessa tentativa.
- **Linha antiga no banco:** o endpoint cancelado fica em `base360:push-antigos`, no aparelho. Ao abrir o Vendas autenticado, `sincronizarAvisos` apaga a linha com as regras existentes de RLS. Falha de rede conserva a pendência para nova tentativa; storage bloqueado não impede cancelar o push antigo. Nenhuma permissão push é pedida automaticamente.
- **Último módulo:** o Vendas grava `base360:ultimo-modulo=vendas` ao abrir, com `try/catch`. A raiz só redireciona no modo instalado (`display-mode: standalone` ou `navigator.standalone` no iPhone). Primeiro acesso, valor desconhecido, storage bloqueado e navegador normal mostram portal. O logo do Vendas retorna a `/?portal=1`; esse retorno explícito vence o redirecionamento e evita um ciclo. Nenhum arquivo do programa de pontos foi alterado para isso.
- **Avisos:** o worker resolve caminhos relativos da Edge Function dentro de `/vendas/`, com fallback `/vendas/` e rejeição de origem externa; o ícone vem de `/icons/`. O toque prioriza uma janela do Vendas, depois uma do portal; navega e foca, ou abre outra se necessário.
- **Pacote raiz:** conteúdo de `portal/` gerado para publicação: `index.html`, `.htaccess`, `repasse/`, `sw.js`, `manifest.webmanifest`, `icons/`, `fonts/` e `mbigucci-logotipo.png`. Fontes locais copiadas do Alicerce, fora do Git; não há dependências de CDN. Não publicar fontes de desenvolvimento (`*.fonte.*`), scripts de QA nem relatórios. O build do Vendas vai separadamente em `vendas/`.

**Conferência local de 08/11:** `node --test crm/src/lib/portal-app.test.mjs`: 15 testes passaram. `node portal/conferir-mockup.mjs` serviu portal e o build já existente em `crm/out/` pela porta 4180, com o runtime novo injetado somente na resposta HTML local. HTTPS foi bloqueado antes da navegação: sem autenticação, Supabase real, instalação de dependências ou novo build. Conferidos SW raiz controlando `/` e `/vendas/`, instalação/remoção de um SW antigo simulado no escopo `/vendas/`, último módulo e retorno pelo logo com modo instalado simulado. O cancelamento da assinatura e a limpeza da linha foram testados com objetos falsos. Evidências e quatro capturas (375/1440, papel/grafite) em `crm/local/mockup-portal/`. A integração no build novo, typecheck completo e suíte geral ficam para a sessão master; isso não valida push real após a migração.

**Roteiro do Felipe no iPhone, depois da publicação conjunta da raiz e do Vendas:**
1. Se possível, abra a instalação antiga: Minha conta → Avisos neste aparelho → Desligar neste aparelho. Remova o ícone antigo instalado pelo Vendas.
2. No Safari, abra **https://base360.mbigucci.com.br/**, sem `/vendas/` no endereço. Compartilhar → Adicionar à Tela de Início → Adicionar, com o nome Base360.
3. Abra pelo novo ícone, escolha Vendas e entre na conta. Minha conta → Avisos neste aparelho → Ligar avisos neste aparelho; permita notificações e escolha os tipos.
4. Toque em Enviar um aviso de teste, deixe o app em segundo plano e confirme o recebimento. Toque no aviso e confira a tela de destino no Vendas.
5. Feche e reabra pelo ícone: deve entrar no Vendas. Toque no logo: deve mostrar o portal sem voltar sozinho. Pelo Safari normal, a raiz deve mostrar o portal.
6. Confirme que há apenas um ícone Base360 e nenhum aviso duplicado. Se não receber, confira Ajustes → Notificações → Base360 → Permitir Notificações e tente o teste novamente.
