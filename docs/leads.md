# Módulo de leads

> Primeiro corte, construído em 29/10/2026 a partir das decisões aprovadas em `docs/pesquisa-resultados.md` (seção 3). No mesmo dia entraram o histórico automático, o follow-up com tentativas, o Cadastro Mágico e o prazo do primeiro contato (itens 1 a 3 e 9 de `docs/referencia-crm-bruna.md`, seção 14). Depois vieram as mensagens prontas, o duplicado entre corretores, o repasse do lead da empresa e os ajustes de lista e quadro (itens 4 a 7). As regras de perfis e de origem dos leads estão em `docs/acessos-perfis.md`, e a estrutura técnica em `docs/crm-arquitetura.md`.

## Sumário
1. O que entrou e o que ficou de fora
2. Regras do lead
3. Lista do dia
4. Prazo do primeiro contato
5. Follow-up e tentativas
6. Histórico automático
7. Cadastro Mágico
8. Mensagens prontas e Ligar
9. Duplicado entre corretores
10. Repasse do lead da empresa
11. Busca, filtros, ordem e Desfazer
12. Quem vê e quem faz
13. Telas
14. Como ajustar origens, etapas, motivos, empreendimentos, horário, mensagens e permissões
15. Testes
16. Radar de Match e catálogo na ficha

## 1. O que entrou e o que ficou de fora

- **Entrou:** cadastro rápido, Cadastro Mágico, lista do dia, prazo de 15 min para o primeiro contato, ficha com interações e histórico automático, follow-up com tentativas, quadro por etapas, leads da equipe e atribuição de lead da empresa pelo gerente. Também mensagens prontas no WhatsApp, Ligar, aviso de duplicado entre carteiras, aviso ao corretor no WhatsApp, busca tolerante, filtros por origem e empreendimento, ordem por tempo sem contato e Desfazer.
- **Ficou de fora:** registrar sozinho no histórico que o WhatsApp foi aberto, áudio, lembrete push, fila de leads da empresa sem corretor, pontuação e qualquer tema do programa sigiloso.
- **Depois (29/10/2026):** o catálogo de empreendimentos e o Radar de Match (itens 13 e 14) cruzam o perfil do lead com as tipologias e põem o endereço, a apresentação e o "a partir de" nas mensagens. Regras em `docs/empreendimentos.md`, seção 12, e o resumo na seção 16 abaixo.

## 2. Regras do lead

- **Obrigatórios no cadastro:** só nome, WhatsApp e origem. Temperatura, empreendimento e próximo contato são opcionais na hora. Sem dia marcado, o lead fica sem próximo contato. O lead da empresa, atribuído pelo gerente, vai para o topo da lista do dia de quem recebe pelo prazo do primeiro contato (seção 4). O lead que o corretor cadastra ele mesmo não tem prazo: sem dia marcado, cai em "Sem próximo contato". O perfil (valor, dormitórios, região, finalidade) fica para a ficha.
- **WhatsApp:** é guardado só com dígitos e com o 55 na frente (`5511987654321`). Celular antigo de 8 dígitos (começa com 6 a 9) ganha o 9º dígito; fixo (começa com 2 a 5) fica como está. O botão abre o diálogo de mensagem (seção 8). O cadastro avisa quando o número já está num lead ativo, mas deixa cadastrar (seção 9).
- **Origem:** plantão, indicação, carteira, empresa (gerente), redes sociais próprias, anúncio próprio e outros. A origem é 1 toque e já vem com a última usada naquele aparelho.
  - **Anúncio próprio** mostra o campo campanha. A campanha é só um dado de origem.
  - **Empresa** é restrita: só quem tem `leads.atribuir` cadastra um lead com essa origem, ou muda a origem de/para ela.
- **E-mail:** opcional, guardado em minúsculas. Vem do Cadastro Mágico ou do perfil na ficha.
- **Etapas:** novo, em contato, visita agendada, visita realizada, proposta, venda e aguardando lançamento. A primeira conversa (WhatsApp, ligação, e-mail ou visita) tira o lead de "novo" sozinha. A etapa nunca volta sozinha, com uma exceção: cancelar a única venda do lead o devolve a Proposta. A etapa **Venda** só vem do registro da venda (`docs/vendas-metas.md`): escolher Venda na ficha abre o registro.
- **Temperatura:** quente, morno ou frio, sempre com sinal + palavra + cor: `! Quente` (vermelho), `○ Morno` (âmbar), `– Frio` (cinza). Os sinais foram escolhidos pelo Felipe em 29/10/2026. Pode ficar vazia.
- **Interação:** tem um tipo (WhatsApp, ligação, e-mail, visita ou anotação, em 1 toque) e sempre termina com o próximo contato (dia e hora). Ela atualiza no lead a última interação e o próximo contato. O histórico não é editado nem apagado.
  - Dois tipos têm fluxo próprio: "Sem resposta" (seção 5) e "Mensagem original" (seção 7), a única sem próximo contato.
  - Anotação, Sem resposta e Mensagem original não contam como conversa: não tiram o lead de "novo".
- **Descarte:** 1 toque no motivo (sem interesse, fora do perfil, fora da região, contato inválido, duplicado, sem retorno), com Desfazer no rodapé (seção 11). O lead continua no banco e pode ser reativado. Não há exclusão física.
- **Carteira:** não expira, e não há justificativa obrigatória.

## 3. Lista do dia

É a tela inicial de quem tem `leads.cadastrar` e não tem `leads.atribuir` (o corretor, no padrão). A regra fica em `crm/src/lib/leads.ts`, com testes.

Acima dos grupos ficam as **Visitas de hoje** e as que estão **Aguardando baixa** (`docs/visitas.md`, seção 6).

1. **Aguardando primeiro contato:** lead da empresa ativo em "novo", com ou sem dia marcado, pelo fim do prazo (seção 4). Os estourados vêm primeiro.
2. **Atrasados:** o próximo contato já passou, inclusive hoje mais cedo.
3. **Hoje:** o próximo contato é até o fim do dia, pela hora do aparelho.
4. **Sem próximo contato:** os outros leads sem data marcada, inclusive o lead novo que o próprio corretor cadastrou.

- Nos grupos 2 a 4, a ordem é quentes, mornos, frios e sem temperatura.
- Na mesma temperatura, nos atrasados e de hoje vem antes o contato mais antigo; nos sem data, o cadastro mais novo.
- Leads com contato para depois de hoje e leads descartados ficam fora. Eles aparecem em Leads e no Quadro.
- O card mostra o nome, a temperatura, o prazo do primeiro contato (lead da empresa em "novo") ou o próximo contato e os dias sem contato (seção 5), a última interação, a etapa e os botões Sem resposta (+1), Abrir e WhatsApp (que abre a mensagem pronta).
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
- **Lead perdido:** com o prazo estourado, a ficha mostra ao gerente o botão "Lead perdido: passar para outro corretor", que reatribui dentro da equipe, recomeça o prazo e grava no histórico quem perdeu. Regras em `docs/painel.md`, seção 1.

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
- A troca de dono feita pelo botão Lead perdido sai com o motivo "perdido": "! Lead perdido por Carla. Passado para Diego".
- É a base do painel da equipe, com o funil por período (`docs/painel.md`).

## 7. Cadastro Mágico

É uma porta extra do cadastro rápido, que continua igual. O botão "+ Colar mensagem" abre um campo para colar a conversa do WhatsApp ou o e-mail do lead. A leitura é `lerMensagem` em `crm/src/lib/cadastro-magico.ts`, adaptada do parser da Bruna, e roda no navegador.

- **Formatos:** conversa copiada do WhatsApp (iPhone e Android), e-mail de portal com rótulos ou em tabela, Facebook Lead Ads (`full_name`, `phone_number`) e RD Station.
- **Campos:** nome, WhatsApp (com o 9º dígito), e-mail e empreendimento, cada um com um selo: ✓ Detectado (veio de um rótulo ou de um padrão seguro), ! Conferir (palpite, como o nome salvo no contato ou tirado do e-mail) ou ✕ Não encontrado.
- **Perfil:** orçamento, dormitórios e bairros aparecem como sugestões que só valem depois de tocadas.
- **O que não é cliente:** o nome de quem usa o CRM (o corretor que aparece na conversa), e-mails de sistema e da própria MBigucci, e o código de anúncio de portal.
- **Empreendimentos e bairros:** vêm do catálogo (tabela `empreendimentos`, `listaDoMagico` e `bairrosDoCatalogo` em `crm/src/lib/catalogo.ts`): cada torre, o condomínio quando a variação é de várias torres ("Mundi") e os bairros e cidades do catálogo. Com o catálogo vazio ou fora do ar, vale a lista fixa de `crm/src/lib/empreendimentos.ts`. Chave de uma palavra que também é palavra comum (Life, Alameda, Wish, Dom) só vale com contexto, como "Residencial Life" ou "Empreendimento: Dom"; "Life MBigucci" vale sozinho. Um nome com começo comum a vários, que não está na lista ("Marco Zero Plaza"), vem para conferir como foi escrito.
- **Confirmação:** "Usar estes dados" volta ao cadastro rápido preenchido. O corretor confere, escolhe a origem e toca em Cadastrar. Os obrigatórios continuam nome, WhatsApp e origem.
- **Mensagem original:** o texto colado vira a primeira interação do lead, sem próximo contato. O gerente que cadastra um lead da empresa também guarda a mensagem, mesmo não sendo o dono.

## 8. Mensagens prontas e Ligar

Adaptado de `templates.ts` e `message-dialog.tsx` da Bruna. As regras ficam em `crm/src/lib/mensagens.ts`, com testes.

- **Diálogo:** o botão WhatsApp (lista do dia, Leads e ficha) abre o diálogo com a mensagem sugerida já preenchida. O corretor troca o modelo em 1 toque, edita o texto e toca em "Abrir no WhatsApp", que abre `wa.me` com o texto. "Copiar" copia o texto. Sem modelos (tabela vazia ou fora do ar), o diálogo abre com o campo vazio.
- **Modelos:** tabela `mensagens_modelo`. Os 6 iniciais são primeiro contato, retomar contato, convite para visita, confirmar visita, depois da visita e novidades do lançamento. Nenhum cita verba nem campanha paga.
- **Variáveis:** `{primeiro_nome}` (do cliente, com a primeira letra maiúscula), `{nome}`, `{empreendimento}` (vazio vira "nossos empreendimentos"), `{corretor}` (o nome de quem envia, como está em Usuários) e `{visita}` (na confirmação). Do catálogo, pelo empreendimento do lead: `{endereco}`, `{apresentacao}` (link da apresentação, do book ou da página) e `{a_partir_de}`. **A linha com uma variável do catálogo vazia sai da mensagem** (empreendimento fora do catálogo ou sem preço). Variável desconhecida fica como está, e o editor avisa.
- **Apresentar empreendimento:** o 7º modelo, usado pelo "Mandar →" do Radar, dos clientes compatíveis e do catálogo. No catálogo não há cliente: "Oi, {primeiro_nome}, tudo bem?" vira "Oi, tudo bem?", e o WhatsApp abre para escolher o contato.
- **Sugestão**, entre as mensagens ligadas, na ordem:
  1. lead em "novo": a marcada para a etapa Novo (primeiro contato);
  2. lead há 2 dias ou mais sem contato, ou com tentativa sem resposta: a marcada "sem contato" (retomar contato);
  3. a marcada para a etapa do lead;
  4. a primeira da lista.
- **Quem edita:** só o gerente geral, em Configurações > Mensagens prontas do WhatsApp. Ele muda nome, texto, etapas, "sem contato", ordem, e liga ou desliga. Não há exclusão. A mudança vale no próximo carregamento do CRM.
- **Ligar:** a ficha tem o botão Ligar (`tel:+55…`), ao lado do WhatsApp.
- **Histórico:** abrir o WhatsApp não grava nada. O corretor registra a conversa como sempre, porque toda interação pede o próximo contato.

## 9. Duplicado entre corretores

- **Entre os leads que a pessoa vê:** o cadastro mostra o nome do lead ativo com o mesmo WhatsApp. Para o gerente, mostra também o corretor ("na carteira de Carla"), porque ele já enxerga a equipe pelo RLS.
- **Fora disso:** a função `whatsapp_em_outra_carteira(numero)` (`security definer`) diz só se existe lead ativo com o número numa carteira que a pessoa não vê. Não diz de quem é nem devolve dados. O corretor vê "já está num lead ativo de outro corretor. Confira com seu gerente"; o gerente vê "de outra equipe". Decisão desta etapa: o gerente só sabe de quem é dentro da própria equipe.
- **Sempre deixa seguir:** o segundo toque em Cadastrar cadastra assim mesmo. Lead descartado não conta.
- **Quem chama:** só quem tem `leads.cadastrar` ou `leads.atribuir`. Recepção, desativado e anônimo recebem erro.
- **9º dígito:** `normalizarWhatsapp` já põe o 9 no celular antigo de 8 dígitos (começa com 6 a 9), então "(11) 8765-4321" e "(11) 98765-4321" são o mesmo número.

## 10. Repasse do lead da empresa

- **WhatsApp do usuário:** coluna `profiles.whatsapp` (só dígitos, com 55). Quem tem `usuarios.gerenciar` edita em Usuários. Cada um edita o próprio em Minha conta, pela função `salvar_meu_whatsapp`, a única coisa que ele altera no próprio perfil.
- **Avisar no WhatsApp:** depois que o gerente cadastra um lead da empresa, a tela mostra "✓ Lead cadastrado" e o botão "Avisar Carla no WhatsApp". Na ficha, o mesmo botão aparece depois de atribuir ou reatribuir.
- **Mensagem:** "Oi, Carla. Você recebeu um lead da empresa no CRM.", o nome do cliente em negrito, o WhatsApp, o empreendimento (se houver), o prazo ("Prazo do primeiro contato: responder em 15 min", só para o lead da empresa em "novo") e o link da ficha.
- **Sem WhatsApp do corretor:** aparece "! Diego Lima não tem WhatsApp no CRM. Peça para preencher em Minha conta."

## 11. Busca, filtros, ordem e Desfazer

As regras ficam em `crm/src/lib/busca.ts`, com testes. A busca vem do `search-dialog.tsx` da Bruna.

- **Busca em Leads:** ignora acento e maiúscula ("joao" acha "João"). Cada termo precisa aparecer no nome, e-mail, empreendimento, campanha ou região ("ana marco" acha a Ana do Marco Zero One). O telefone vale em qualquer formato: com ou sem +55, 0 de operadora, pontuação, só o final ("4321") ou sem o 9º dígito.
- **Filtros em Leads e no Quadro:** origem e empreendimento, além de corretor (gerente) e situação. O empreendimento é texto livre, então as grafias que só mudam em acento, maiúscula ou espaço viram uma opção só, com o total. Há também "Sem empreendimento". Com filtro de origem ou empreendimento, o resumo por corretor some, para não confundir os números.
- **Ordem em Leads:** próximo contato (padrão: atrasados primeiro, sem data no fim), mais tempo sem contato (o mais esquecido primeiro, pela última interação ou pelo cadastro) ou nome. A escolha fica guardada no aparelho.
- **Quadro:** em cada coluna, o mais esquecido fica no topo, e o cartão mostra "Sem contato há N dias".
- **Desfazer:** mudar a etapa e descartar (inclusive "Descartar: sem retorno") não pedem confirmação. Aparece no rodapé "✓ Etapa: Proposta" ou "✓ Descartado: Fora do perfil" com Desfazer, por 8 segundos. Desfazer grava de volta o valor anterior, então o histórico mostra as duas mudanças. Desfazer um descarte é uma reativação, e por isso zera as tentativas.

## 12. Quem vê e quem faz

| Quem | Vê | Faz |
| --- | --- | --- |
| Corretor (`leads.cadastrar`) | Os próprios leads e o histórico deles | Cadastra, registra interação e Sem resposta, muda etapa e temperatura, descarta e reativa |
| Gerente (`leads.atribuir` + `dados.ver_equipe`) | Os leads da equipe e o histórico | Cadastra lead da empresa já para um corretor ativo da equipe (com a mensagem original, se colou) e reatribui dentro da equipe. Não altera os outros dados do lead. |
| Gerente geral | Tudo | Atribui para qualquer corretor ativo |
| Corretor desativado, recepção e visitante | Nada | Nada |

- **Mensagens prontas:** todo usuário ativo lê e usa; só o gerente geral cria, altera e desliga.
- **WhatsApp do usuário:** quem vê o perfil (ele mesmo, o gerente da equipe, quem gerencia usuários) vê o número.

- A visibilidade usa `pode_ver_dados_de(dono_id)`, a mesma regra da base. Interações e eventos seguem o lead.
- A atribuição usa `pode_atribuir_a(corretor)`: tem `leads.atribuir`, o destino é corretor ativo e é da equipe do gerente (ou quem atribui vê todas as equipes).
- O gatilho `leads_guard` completa as policies: quem não é o dono só troca o dono, só o gerente mexe na origem restrita, e `criado_por`, `atribuido_por` e as datas são carimbados pelo banco.

## 13. Telas

| Endereço | Tela |
| --- | --- |
| `/` | Lista do dia (corretor) ou painel com atalho para Leads (gerente e gerente geral) |
| `/leads/` | Todos os leads visíveis, com busca, filtros (corretor, origem, empreendimento e situação), ordem e o resumo por corretor (ativos, prazo estourado, atrasados, sem contato) para o gerente |
| `/leads/novo/` | Cadastro rápido, com o "+ Colar mensagem" do Cadastro Mágico. Para quem atribui, vira "Lead da empresa", com a escolha do corretor e, depois de cadastrar, o "Avisar no WhatsApp". |
| `/leads/ficha/?id=` | Ficha: WhatsApp com mensagem pronta, Ligar, prazo do primeiro contato (lead da empresa em "novo"), Sem resposta, sugestão de descarte, interação por tipo, andamento e descarte com Desfazer, perfil do cliente (com e-mail), atribuição com o aviso ao corretor (e o Lead perdido, com o prazo estourado), Radar de Match (empreendimentos que combinam) e histórico com os eventos |
| `/empreendimentos/` | Catálogo de empreendimentos, com o detalhe em `/empreendimentos/ver/?slug=` (com os clientes compatíveis) e a edição em `/empreendimentos/editar/` (`docs/empreendimentos.md`, seção 12) |
| `/painel/` | Painel da equipe (gerente) ou Meu painel (corretor), por dia, semana ou mês, com o relatório do corretor e a versão para imprimir (`docs/painel.md`) |
| `/leads/quadro/` | Quadro por etapas, com rolagem lateral no celular, filtros e o mais esquecido no topo |
| `/agenda/` | Agenda: as visitas da semana, as que aguardam baixa e, para o gerente, o filtro por corretor (`docs/visitas.md`) |
| `/conta/` | Minha conta: o próprio WhatsApp, troca de senha e instalação no celular |
| `/configuracoes/` | Gerente geral: chaves, horário de atendimento, mensagens prontas e permissões |

A ficha usa `?id=` porque a exportação estática não tem rotas dinâmicas.

## 14. Como ajustar origens, etapas, motivos, empreendimentos, horário, mensagens e permissões

- **Origens e etapas:** ficam nas tabelas `lead_origens` e `lead_etapas`. Para renomear, reordenar, desligar (`ativo = false`) ou criar uma opção, edite as linhas no Table Editor do Supabase. O app lê as tabelas, e rodar o `schema.sql` de novo não sobrescreve o que foi ajustado.
- **Motivos de descarte:** ficam no check `leads_motivo_descarte_check` da tabela `leads` e em `MOTIVOS_DESCARTE` (`crm/src/lib/leads.ts`). Para mudar, altere os dois.
- **Empreendimentos e bairros do Cadastro Mágico:** pela tela `/empreendimentos/` (quem tem `empreendimentos.gerenciar`): nome, condomínio, variações e "pede contexto". A lista fixa de `crm/src/lib/empreendimentos.ts` só vale com o catálogo vazio ou fora do ar.
- **Dias do follow-up:** `DIAS_FOLLOW_UP`, `LIMITE_TENTATIVAS` e `DIAS_ENTRE_TENTATIVAS` em `crm/src/lib/followup.ts`.
- **Horário de atendimento:** o gerente geral muda em Configurações. Rodar o `schema.sql` de novo não sobrescreve o horário salvo. Os 15 min são `PRAZO_MINUTOS` em `crm/src/lib/prazo.ts`.
- **Mensagens prontas:** o gerente geral edita em Configurações. Rodar o `schema.sql` de novo não sobrescreve o que foi ajustado nem religa a mensagem desligada. Os 2 dias do "sem contato" são `DIAS_FOLLOW_UP` em `crm/src/lib/followup.ts`.
- **Permissões:** `leads.cadastrar` (padrão: corretor) e `leads.atribuir` (padrão: gerente) aparecem em Configurações > Permissões por perfil. O padrão só entra na primeira vez.

## 15. Testes

- `npm test` (em `crm/`): ordenação da lista do dia (com o grupo do primeiro contato), prazo do primeiro contato (só lead da empresa, virada de dia, chegada fora do horário, fim de semana, reatribuição e rótulos), WhatsApp (com o 9º dígito), datas, follow-up, histórico e o parser do Cadastro Mágico (portal, tabela de e-mail, WhatsApp do iPhone e do Android, Facebook, RD Station, nome por assinatura e por e-mail, orçamento e dormitórios), mensagens prontas (variáveis, sugestão pela etapa e pelo tempo sem contato, links e o aviso de repasse) e busca (acento, termos, telefone em qualquer formato, ordem e filtro de empreendimento).
- `npm run test:banco`: roda o `schema.sql` três vezes no PGlite e confere o RLS de leads, interações e eventos por perfil, o Lead perdido e os perdidos por perfil (`docs/painel.md`), as tentativas, o avanço de etapa, a mensagem original, o horário de atendimento (quem lê, quem altera e os checks), a função de duplicado por perfil, o WhatsApp do usuário e o RLS das mensagens prontas.
- Catálogo e Radar: `catalogo.test.ts` e `match.test.ts` no `npm test`, `empreendimentos.test.mjs` no `npm run test:banco` (`docs/empreendimentos.md`, seção 12).

## 16. Radar de Match e catálogo na ficha

Regras completas em `docs/empreendimentos.md`, seção 12.

- **Perfil do lead:** valor (orçamento máximo), dormitórios, região (texto livre: "Rudge Ramos, Centro / SBC"; entende SBC, São Bernardo, São Caetano, SP e ABC) e finalidade. Sem nada preenchido, o Radar pede o perfil.
- **Radar na ficha** (dono do lead ativo): os empreendimentos ativos com nota de 50% ou mais, com os motivos ✓ ✕ ! e o "Mandar →", que abre a mensagem "Apresentar empreendimento" daquele empreendimento. Sala e loja só para quem quer investir.
- **Empreendimento do lead:** vira link para o catálogo quando é achado lá (pelo nome, pelas variações ou pelo condomínio). O campo do perfil sugere os nomes do catálogo e avisa quando o nome não está nele, mas continua texto livre.
- **Aguardando lançamento:** na página do empreendimento em breve lançamento ou lançamento, os clientes nessa etapa que combinam (nota de 70% ou mais) vêm primeiro, com a barra vermelha. No catálogo, o card do lançamento mostra quantos são.
- No Supabase real: `supabase/dados-teste.sql` cria 2 leads por corretor de teste, e `supabase/verificar-rls.sql` mostra o que cada perfil vê e a quem pode atribuir.
