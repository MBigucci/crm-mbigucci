# Necessidades dos gerentes

> Fonte: áudios dos gerentes de equipe ao Felipe, transcritos e analisados em 29/10/2026. A análise com nomes e citações fica fora do git, em `insumos/audios-gerentes/analise.md`. O papel do gerente está em `docs/acessos-perfis.md`, e a ordem das etapas em `docs/referencia-crm-bruna.md` (seção 14).

## O que pediram

| Pedido | Gerente 1 | Gerente 2 | No CRM hoje |
| --- | --- | --- | --- |
| Relatório por corretor: recebidos, descartados com motivo, "perdidos", por período | ✓ | ✓ | ! Resumo em `/leads/` só com a foto do momento (ativos, prazo estourado, atrasados, sem contato) |
| Separar lead da empresa do lead captado pelo próprio corretor | ✓ | | ! A origem é gravada, mas não há filtro nem conta separada |
| Origem e empreendimento de cada lead | | ✓ | ! Os campos existem, sem visão agrupada |
| Relatório fácil de imprimir, para mostrar ao corretor | | ✓ | ✕ |
| Ler como o corretor conversa com o cliente | | ✓ | ! Só as interações anotadas e a mensagem original |
| Ver quem está "online" | | ✓ | ✕ |
| Cadastro de parceiros por link, simples, sem CPF nem RG | ✓ | | ✕ |
| Enviar material aos parceiros em massa ou por região | ✓ | | ✕ |
| Tudo simples, poucos campos | ✓ | ✓ | ✓ Decisão da pesquisa |

**Consenso:** um painel da equipe por corretor e por período, com origem e motivos de descarte. É o mesmo pedido dos corretores nos números da pesquisa (`docs/pesquisa-resultados.md`).

## Decisões e cuidados

- **Empresa x captado** aparece para o gerente só como **origem do lead**. Nunca como verba, campanha paga ou conciliação, e o campo campanha fica fora do painel do gerente enquanto a chave "Programa de verba ativo" estiver desligada (`docs/pontuacao-verba.md`).
- **"Online"** vem da roleta atual, cujo fim é sigiloso. Não construir agora. Depois de novembro, resolver com a escala da recepção ("no plantão hoje").
- **Conversas do WhatsApp** não entram no CRM, porque não há integração nem servidor. A padronização da abordagem vem pelas mensagens prontas.
- **Envio em massa automático** não existe com exportação estática. O primeiro passo é uma lista exportável ou a cópia oculta por e-mail.
- **Cadastro público de parceiros** precisa de uma decisão de segurança do Felipe: um formulário que só grava (como a pesquisa) ou uma tabela com inserção anônima e nenhuma leitura.
- O relatório do gerente não mostra pontos, verba nem ranking.

## Onde entra

| # | O que | Etapa | Lista da Bruna |
| --- | --- | --- | --- |
| 1 | Painel da equipe com período: recebidos da empresa, captados pelo corretor, descartados por motivo, funil até a venda, com clique para os leads | metas | Item 11, sobe de prioridade |
| 2 | Filtro por origem e por empreendimento em `/leads/` | leads | Item 7 |
| 3 | Imprimir o relatório de um corretor | metas | Junto do item 11 |
| 4 | Mensagens prontas para padronizar o atendimento | leads | Item 4 |
| 5 | Disponibilidade do corretor ("no plantão hoje") | pontuação/recepção | Depois de novembro |
| 6 | Parceiros: cadastro por link, lista por região, exportação | parceiros (nova) | Item novo, depois do 13 |

## Pendências com os gerentes

Antes do item 11, o Felipe confirma com eles:
- Gerente 1: o que é "perdido" além do descarte, qual período olha, quem são os parceiros, que material manda e por onde, e se o parceiro também indica clientes.
- Gerente 2: o que é "online" e para que usa, o que é "responder direitinho", três números do relatório e com que frequência imprime.
