# Módulo de leads

> Primeiro corte, construído em 29/10/2026 a partir das decisões aprovadas em `docs/pesquisa-resultados.md` (seção 3). No mesmo dia entraram o histórico automático, o follow-up com tentativas, o Cadastro Mágico e o prazo do primeiro contato (itens 1 a 3 e 9 de `docs/referencia-crm-bruna.md`, seção 14). As regras de perfis e de origem dos leads estão em `docs/acessos-perfis.md`, e a estrutura técnica em `docs/crm-arquitetura.md`.

## Sumário
1. O que entrou e o que ficou de fora
2. Regras do lead
3. Lista do dia
4. Prazo do primeiro contato
5. Follow-up e tentativas
6. Histórico automático
7. Cadastro Mágico
8. Quem vê e quem faz
9. Telas
10. Como ajustar origens, etapas, motivos, empreendimentos, horário e permissões
11. Testes

## 1. O que entrou e o que ficou de fora

- **Entrou:** cadastro rápido, Cadastro Mágico, lista do dia, prazo de 15 min para o primeiro contato, ficha com interações e histórico automático, follow-up com tentativas, quadro por etapas, leads da equipe e atribuição de lead da empresa pelo gerente.
- **Ficou de fora:** áudio, lembrete push, cruzar clientes com imóveis, links de apresentação, fila de leads da empresa sem corretor, pontuação e qualquer tema do programa sigiloso.

## 2. Regras do lead

- **Obrigatórios no cadastro:** só nome, WhatsApp e origem. Temperatura, empreendimento e próximo contato são opcionais na hora. Sem dia marcado, o lead fica sem próximo contato. O lead da empresa, atribuído pelo gerente, vai para o topo da lista do dia de quem recebe pelo prazo do primeiro contato (seção 4). O lead que o corretor cadastra ele mesmo não tem prazo: sem dia marcado, cai em "Sem próximo contato". O perfil (valor, dormitórios, região, finalidade) fica para a ficha.
- **WhatsApp:** é guardado só com dígitos e com o 55 na frente (`5511987654321`). Celular antigo de 8 dígitos (começa com 6 a 9) ganha o 9º dígito; fixo (começa com 2 a 5) fica como está. O botão abre `https://wa.me/<número>`. O cadastro avisa quando já existe um lead ativo com o mesmo número, mas deixa cadastrar.
- **Origem:** plantão, indicação, carteira, empresa (gerente), redes sociais próprias, anúncio próprio e outros. A origem é 1 toque e já vem com a última usada naquele aparelho.
  - **Anúncio próprio** mostra o campo campanha. A campanha é só um dado de origem.
  - **Empresa** é restrita: só quem tem `leads.atribuir` cadastra um lead com essa origem, ou muda a origem de/para ela.
- **E-mail:** opcional, guardado em minúsculas. Vem do Cadastro Mágico ou do perfil na ficha.
- **Etapas:** novo, em contato, visita agendada, visita realizada, proposta, venda e aguardando lançamento. A primeira conversa (WhatsApp, ligação, e-mail ou visita) tira o lead de "novo" sozinha. A etapa nunca volta sozinha.
- **Temperatura:** quente, morno ou frio, sempre com sinal + palavra + cor: `! Quente` (vermelho), `○ Morno` (âmbar), `– Frio` (cinza). Os sinais foram escolhidos pelo Felipe em 29/10/2026. Pode ficar vazia.
- **Interação:** tem um tipo (WhatsApp, ligação, e-mail, visita ou anotação, em 1 toque) e sempre termina com o próximo contato (dia e hora). Ela atualiza no lead a última interação e o próximo contato. O histórico não é editado nem apagado.
  - Dois tipos têm fluxo próprio: "Sem resposta" (seção 5) e "Mensagem original" (seção 7), a única sem próximo contato.
  - Anotação, Sem resposta e Mensagem original não contam como conversa: não tiram o lead de "novo".
- **Descarte:** 1 toque no motivo (sem interesse, fora do perfil, fora da região, contato inválido, duplicado, sem retorno). O lead continua no banco e pode ser reativado. Não há exclusão física.
- **Carteira:** não expira, e não há justificativa obrigatória.

## 3. Lista do dia

É a tela inicial de quem tem `leads.cadastrar` e não tem `leads.atribuir` (o corretor, no padrão). A regra fica em `crm/src/lib/leads.ts`, com testes.

1. **Aguardando primeiro contato:** lead da empresa ativo em "novo", com ou sem dia marcado, pelo fim do prazo (seção 4). Os estourados vêm primeiro.
2. **Atrasados:** o próximo contato já passou, inclusive hoje mais cedo.
3. **Hoje:** o próximo contato é até o fim do dia, pela hora do aparelho.
4. **Sem próximo contato:** os outros leads sem data marcada, inclusive o lead novo que o próprio corretor cadastrou.

- Nos grupos 2 a 4, a ordem é quentes, mornos, frios e sem temperatura.
- Na mesma temperatura, nos atrasados e de hoje vem antes o contato mais antigo; nos sem data, o cadastro mais novo.
- Leads com contato para depois de hoje e leads descartados ficam fora. Eles aparecem em Leads e no Quadro.
- O card mostra o nome, a temperatura, o prazo do primeiro contato (lead da empresa em "novo") ou o próximo contato e os dias sem contato (seção 5), a última interação, a etapa e os botões Sem resposta (+1), Abrir e WhatsApp.
- Sem nenhum lead, o início mostra um card de boas-vindas que explica o Colar mensagem.

## 4. Prazo do primeiro contato

Adaptado do CRM da Bruna (`performance.ts` e `followup.ts`). Lá o prazo vale para todo lead e só até o primeiro registro; aqui vale só para o lead da empresa em "novo" e termina na primeira conversa. As regras ficam em `crm/src/lib/prazo.ts`, com testes.

- **Para quem:** só o lead que vem do gerente, com origem "empresa" (`ORIGEM_COM_PRAZO`), inclusive quando o gerente ou o gerente geral reatribui. O lead que o corretor cadastra (plantão, indicação, carteira, redes, anúncio, outros) não tem prazo: o corretor organiza o tempo dele pelo próximo contato.
- **Prazo:** 15 min (`PRAZO_MINUTOS`) a partir do cadastro ou, se o gerente reatribuiu depois, da atribuição (`atribuido_em`). Conta só dentro do horário de atendimento.
- **Fora do horário:** o prazo começa na abertura seguinte. Com o padrão, o lead que chega às 22h vence às 9h15 do dia seguinte, e o que chega às 18h50 vence às 9h05.
- **Fim:** o prazo acaba quando o lead sai de "novo", ou seja, na primeira conversa (WhatsApp, ligação, e-mail ou visita) ou quando o corretor muda a etapa. Anotação, Sem resposta e Mensagem original não encerram o prazo. Lead descartado sai do prazo.
- **Estados no card e na ficha**, sempre com sinal + palavra + cor:
  - `! Responder em 12 min` (âmbar): o prazo está correndo.
  - `→ Responder até amanhã, 9h15` (tinta): o lead chegou fora do horário e o prazo ainda não começou. Também "até 9h15" e "até segunda, 9h15".
  - `! Prazo estourado há 40 min` (vermelho, com a barra vermelha no card): o tempo é de relógio desde o fim do prazo ("1h20", "3 dias").
  - Logo depois do cadastro o card mostra "Responder em 15 min", nunca "Atrasado".
- **Horário de atendimento:** tabela `horario_atendimento`, uma linha só, com os dias (0 = domingo … 6 = sábado), a abertura e o fechamento. O padrão é o do plantão MBigucci (`docs/pontuacao-verba.md`): **9h às 19h, todos os dias**, porque há plantão no fim de semana. Todo usuário ativo lê; só o gerente geral altera, em Configurações > Horário de atendimento. Fica fora de `app_settings` porque essa tabela é só do gerente geral (sigilo). O app guarda o horário por sessão do navegador, então a mudança vale no próximo acesso de cada corretor. Se a leitura falhar, vale o padrão.
- **Fuso:** a conta usa a hora do aparelho (São Paulo), como a lista do dia.
- **Resumo do gerente:** a tabela "Por corretor" em Leads tem a coluna "Prazo estourado", e os corretores com mais prazos estourados vêm primeiro.

## 5. Follow-up e tentativas

Adaptado da regra de ouro do CRM da Bruna (`followup.ts`). Lá, 2 dias sem interação já viram follow-up atrasado. Aqui o próximo contato marcado continua mandando na lista do dia (é o pedido T1), e os dias sem contato aparecem no card para o lead não sumir quando a data ficou longe. As regras ficam em `crm/src/lib/followup.ts`, com testes.

- **"Sem contato há N dias":** conta os dias de calendário desde a última interação ou, sem nenhuma, desde o cadastro. Com 2 dias aparece em âmbar, com 3 ou mais em vermelho, sempre com o sinal !. Até 1 dia não aparece. Só vale para lead ativo.
- **"Sem resposta (+1)":** 1 toque no card da lista do dia ou na ficha. Grava uma interação do tipo tentativa com o texto "Tentei contato, sem retorno." e o próximo contato daqui a 2 dias, na hora cheia. Na ficha, "Mudar o dia" troca esse próximo contato.
- **Contador:** `leads.tentativas` fica no banco e só o gatilho mexe nele. Cada Sem resposta soma 1. Uma conversa de verdade zera. Anotação não muda. Reativar um lead descartado também zera.
- **3ª tentativa:** a ficha mostra "! 3 tentativas sem resposta" e o botão "Descartar: sem retorno". Nunca descarta sozinha, porque a carteira não expira.

## 6. Histórico automático

- A tabela `lead_eventos` guarda o cadastro e cada mudança de etapa, temperatura, status (descarte, com o motivo, e reativação) e dono, com quem fez e quando.
- Quem grava é o gatilho do banco, nunca o app. O que o banco fez sozinho, como tirar o lead de "novo", sai marcado como automático.
- Na ficha, o histórico junta interações e eventos, do mais novo ao mais antigo. Os eventos aparecem esmaecidos: "Etapa: Novo → Em contato · automático", "Descartado: Sem retorno", "Atribuído a Carla".
- Os leads que existiam antes da tabela ganharam só o evento "Lead cadastrado". As mudanças anteriores não foram registradas.
- É a base da conversão por origem e do funil por período (item 11 da lista da Bruna).

## 7. Cadastro Mágico

É uma porta extra do cadastro rápido, que continua igual. O botão "+ Colar mensagem" abre um campo para colar a conversa do WhatsApp ou o e-mail do lead. A leitura é `lerMensagem` em `crm/src/lib/cadastro-magico.ts`, adaptada do parser da Bruna, e roda no navegador.

- **Formatos:** conversa copiada do WhatsApp (iPhone e Android), e-mail de portal com rótulos ou em tabela, Facebook Lead Ads (`full_name`, `phone_number`) e RD Station.
- **Campos:** nome, WhatsApp (com o 9º dígito), e-mail e empreendimento, cada um com um selo: ✓ Detectado (veio de um rótulo ou de um padrão seguro), ! Conferir (palpite, como o nome salvo no contato ou tirado do e-mail) ou ✕ Não encontrado.
- **Perfil:** orçamento, dormitórios e bairros aparecem como sugestões que só valem depois de tocadas.
- **O que não é cliente:** o nome de quem usa o CRM (o corretor que aparece na conversa), e-mails de sistema e da própria MBigucci, e o código de anúncio de portal.
- **Empreendimentos e bairros:** lista fixa em `crm/src/lib/empreendimentos.ts`, até existir a tabela de empreendimentos. Nome que também é palavra comum (Life, Alameda, Wish) só vale com contexto, como "Residencial Life" ou "Empreendimento: Life". Um nome parecido com vários, como "Marco Zero One", vem para conferir como foi escrito.
- **Confirmação:** "Usar estes dados" volta ao cadastro rápido preenchido. O corretor confere, escolhe a origem e toca em Cadastrar. Os obrigatórios continuam nome, WhatsApp e origem.
- **Mensagem original:** o texto colado vira a primeira interação do lead, sem próximo contato. O gerente que cadastra um lead da empresa também guarda a mensagem, mesmo não sendo o dono.

## 8. Quem vê e quem faz

| Quem | Vê | Faz |
| --- | --- | --- |
| Corretor (`leads.cadastrar`) | Os próprios leads e o histórico deles | Cadastra, registra interação e Sem resposta, muda etapa e temperatura, descarta e reativa |
| Gerente (`leads.atribuir` + `dados.ver_equipe`) | Os leads da equipe e o histórico | Cadastra lead da empresa já para um corretor ativo da equipe (com a mensagem original, se colou) e reatribui dentro da equipe. Não altera os outros dados do lead. |
| Gerente geral | Tudo | Atribui para qualquer corretor ativo |
| Corretor desativado, recepção e visitante | Nada | Nada |

- A visibilidade usa `pode_ver_dados_de(dono_id)`, a mesma regra da base. Interações e eventos seguem o lead.
- A atribuição usa `pode_atribuir_a(corretor)`: tem `leads.atribuir`, o destino é corretor ativo e é da equipe do gerente (ou quem atribui vê todas as equipes).
- O gatilho `leads_guard` completa as policies: quem não é o dono só troca o dono, só o gerente mexe na origem restrita, e `criado_por`, `atribuido_por` e as datas são carimbados pelo banco.

## 9. Telas

| Endereço | Tela |
| --- | --- |
| `/` | Lista do dia (corretor) ou painel com atalho para Leads (gerente e gerente geral) |
| `/leads/` | Todos os leads visíveis, com busca, filtro por corretor e situação, e o resumo por corretor (ativos, prazo estourado, atrasados, sem contato) para o gerente |
| `/leads/novo/` | Cadastro rápido, com o "+ Colar mensagem" do Cadastro Mágico. Para quem atribui, vira "Lead da empresa", com a escolha do corretor. |
| `/leads/ficha/?id=` | Ficha: prazo do primeiro contato (lead da empresa em "novo"), Sem resposta, sugestão de descarte, interação por tipo, andamento, perfil do cliente (com e-mail), descarte, atribuição e histórico com os eventos |
| `/leads/quadro/` | Quadro por etapas, com rolagem lateral no celular |

A ficha usa `?id=` porque a exportação estática não tem rotas dinâmicas.

## 10. Como ajustar origens, etapas, motivos, empreendimentos, horário e permissões

- **Origens e etapas:** ficam nas tabelas `lead_origens` e `lead_etapas`. Para renomear, reordenar, desligar (`ativo = false`) ou criar uma opção, edite as linhas no Table Editor do Supabase. O app lê as tabelas, e rodar o `schema.sql` de novo não sobrescreve o que foi ajustado.
- **Motivos de descarte:** ficam no check `leads_motivo_descarte_check` da tabela `leads` e em `MOTIVOS_DESCARTE` (`crm/src/lib/leads.ts`). Para mudar, altere os dois.
- **Empreendimentos e bairros do Cadastro Mágico:** em `crm/src/lib/empreendimentos.ts`. Para incluir um, some uma linha e publique de novo.
- **Dias do follow-up:** `DIAS_FOLLOW_UP`, `LIMITE_TENTATIVAS` e `DIAS_ENTRE_TENTATIVAS` em `crm/src/lib/followup.ts`.
- **Horário de atendimento:** o gerente geral muda em Configurações. Rodar o `schema.sql` de novo não sobrescreve o horário salvo. Os 15 min são `PRAZO_MINUTOS` em `crm/src/lib/prazo.ts`.
- **Permissões:** `leads.cadastrar` (padrão: corretor) e `leads.atribuir` (padrão: gerente) aparecem em Configurações > Permissões por perfil. O padrão só entra na primeira vez.

## 11. Testes

- `npm test` (em `crm/`): ordenação da lista do dia (com o grupo do primeiro contato), prazo do primeiro contato (só lead da empresa, virada de dia, chegada fora do horário, fim de semana, reatribuição e rótulos), WhatsApp (com o 9º dígito), datas, follow-up, histórico e o parser do Cadastro Mágico (portal, tabela de e-mail, WhatsApp do iPhone e do Android, Facebook, RD Station, nome por assinatura e por e-mail, orçamento e dormitórios).
- `npm run test:banco`: roda o `schema.sql` três vezes no PGlite e confere o RLS de leads, interações e eventos por perfil, as tentativas, o avanço de etapa, a mensagem original e o horário de atendimento (quem lê, quem altera e os checks).
- No Supabase real: `supabase/dados-teste.sql` cria 2 leads por corretor de teste, e `supabase/verificar-rls.sql` mostra o que cada perfil vê e a quem pode atribuir.
