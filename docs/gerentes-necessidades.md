# Necessidades dos gerentes

> Fonte: áudios dos gerentes de equipe ao Felipe, transcritos e analisados em 29/10/2026, com as dúvidas respondidas pelo próprio Felipe no mesmo dia. A análise com nomes e citações fica fora do git, em `insumos/audios-gerentes/analise.md`. O papel do gerente está em `docs/acessos-perfis.md`, e a ordem das etapas em `docs/referencia-crm-bruna.md` (seção 14).

**Os gerentes não são consultados de novo.** Dúvidas sobre os pedidos deles vão ao Felipe. Eles também não sabem do fim dos leads do Google.

## O que pediram

| Pedido | Gerente 1 | Gerente 2 | No CRM hoje |
| --- | --- | --- | --- |
| Relatório por corretor: recebidos, descartados com motivo, perdidos, por período | ✓ | ✓ | ✓ Painel da equipe por dia, semana e mês (`docs/painel.md`) |
| Separar lead da empresa do lead captado pelo próprio corretor | ✓ | | ✓ Recebidos da empresa e cadastrados pelo corretor, por origem, no painel |
| Origem e empreendimento de cada lead | | ✓ | ! Filtro por origem e por empreendimento em `/leads/` e no Quadro; origem agrupada no painel; empreendimento ainda sem visão agrupada |
| Relatório fácil de imprimir, para mostrar ao corretor | | ✓ | ✓ Imprimir no painel e no relatório do corretor |
| Ver como o corretor conversa com o cliente | | ✓ | ! As interações anotadas e a mensagem original |
| Ver quem está "online" | | ✓ | ✕ Fica de fora |
| Cadastro de parceiros por link e envio de material por região | ✓ | | ✕ Etapa futura |
| Tudo simples, poucos campos | ✓ | ✓ | ✓ Decisão da pesquisa |

**Consenso:** um painel da equipe por corretor e por período, com origem e motivos de descarte. É o mesmo pedido dos corretores nos números da pesquisa (`docs/pesquisa-resultados.md`).

## Decisões do Felipe (29/10/2026)

- **Lead perdido** é o lead da empresa que o corretor não atendeu. No sistema antigo, ele era roletado para outro. Aqui vira um **botão do gerente**, porque os leads da empresa serão poucos. Ele aparece no lead com "Prazo estourado" (`docs/leads.md`, seção 4), reatribui o lead e grava no histórico o motivo "perdido". O painel conta os perdidos por corretor.
- **Continua havendo lead da empresa** para o gerente distribuir: os que chegam pelo site, direto no WhatsApp, por indicação etc.
- **Relatório:** períodos **diário, semanal e mensal**, e **versão para imprimir**, porque o papel ainda ajuda os gerentes.
- **Atendimento do corretor:** as interações anotadas na ficha e as mensagens prontas bastam. As conversas do WhatsApp não entram.
- **"Online"** é a roleta atual e **fica de fora**.
- **Parceiros** são outra etapa do projeto, **no mesmo app**, para o gerente trabalhar num ambiente só. Não entram agora. Antes de começar, falta decidir a segurança do cadastro público: um formulário que só grava (como a pesquisa) ou uma tabela com inserção anônima e nenhuma leitura.
- Nada do sistema atual precisa ser mantido além disso.

## Cuidados com o sigilo

- **Empresa x captado** aparece para o gerente só como **origem do lead**. Nunca como verba, campanha paga ou conciliação, e o campo campanha fica fora do painel do gerente enquanto a chave "Programa de verba ativo" estiver desligada (`docs/pontuacao-verba.md`). Desde 29/10/2026 a conversão por campanha existe atrás da permissão `painel.campanha`, que o gerente não tem no padrão (`docs/vendas-metas.md`, seção 5).
- O painel do gerente não mostra pontos, verba nem ranking.

## Onde entra

Os itens 1 a 3 estão descritos em `docs/painel.md`.

| # | O que | Etapa | Lista da Bruna |
| --- | --- | --- | --- |
| 1 ✓ | **Feito.** Lead perdido: botão do gerente no lead da empresa com prazo estourado, que reatribui e grava o motivo | leads | Complementa o item 9 (prazo, já feito). P |
| 2 ✓ | **Feito.** Painel da equipe com dia, semana e mês: recebidos da empresa, perdidos, captados pelo corretor, descartados por motivo e funil até a venda, com clique para os leads | metas | Item 11, sobe de prioridade |
| 3 ✓ | **Feito.** Imprimir o painel e o relatório de um corretor: letra grande, sem cor de fundo | metas | Junto do item 11. P |
| 4 ✓ | **Feito.** Filtro por origem e por empreendimento em `/leads/` (e no Quadro) | leads | Item 7 |
| 5 ✓ | **Feito.** Mensagens prontas para padronizar o atendimento, editadas pelo gerente geral | leads | Item 4 |
| 6 | Parceiros: cadastro por link, lista por região e exportação para envio | parceiros (futura) | Fora da lista |
