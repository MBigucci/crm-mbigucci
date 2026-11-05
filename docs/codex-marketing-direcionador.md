# Brief: módulo de Marketing do Base360, etapa 1: direcionador de leads (estudo e protótipo)

## Leia antes
- `CLAUDE.md`, `docs/acessos-perfis.md` (perfis, RLS, `is_gerente_geral()`, Faixas de VGV como regra fixa no banco) e `docs/historico.md`, no trecho sobre o sigilo do programa de verba e como ele foi feito.
- `docs/leads.md`: "Lead da empresa", origens, duplicados e prazo de 15 min. O lead que o direcionador manda ao Vendas entra como lead da empresa sem dono, e o gerente distribui **como hoje**: não há roleta automática nesta etapa.
- `docs/crm-arquitetura.md`:
  - cada módulo do Base360 é um site próprio em subdomínio;
  - o app é estático;
  - o que precisa de servidor vai em Edge Function do Supabase.
- `crm/supabase/functions/avisos/`: o modelo de Edge Function, com segredos só nos Secrets e deploy feito pelo Felipe.
- A página pública `/corretores/` das parcerias (`docs/codex-parcerias.md`, `crm/wordpress/corretores/`): é o padrão de formulário do site que grava no Supabase.
- `docs/design-system.md` e a skill `.claude/skills/tela-ds-mbigucci/SKILL.md`, para o mockup.

## O que o Felipe pediu (05/11/2026)
- **Problema de hoje:**
  - os leads do site da MBigucci e dos portais (ZAP/Viva Real, OLX, Imovelweb, Chaves na Mão) chegam **todos no e-mail do Felipe**, que é Microsoft 365/Outlook;
  - ele separa à mão para onde cada um vai;
  - por um acordo com a diretoria, alguns leads vão para um **destino externo**, que é outro CRM.
- **Solução:** um **módulo de Marketing do Base360**. Com o tempo ele substitui o RD Station, cobrindo:
  - formulários e landing pages;
  - e-mail marketing;
  - automações e nutrição;
  - relatórios de origem e campanha.

  **Esta etapa é só a primeira função:** o **direcionador de leads**.
- **Regras do direcionador:**
  - cada regra decide por **produto/empreendimento**, **fonte** e **dia e horário**, e manda o lead para o **Base360 Vendas** ou para o **destino externo**;
  - cada regra tem uma **chave liga/desliga fácil**;
  - o que não cair em nenhuma regra vai para o **Base360 Vendas**.
- **Quem controla:** **só o gerente geral**.
- **Sigilo:**
  - o destino externo **nunca é nomeado**: nem em telas, código, banco, documentação, commits ou mensagens. Na tela aparece como **"Destino externo"**, com um apelido que o Felipe define;
  - os leads que vão para o destino externo **não ficam registrados em lugar nenhum** do Base360;
  - o motivo: o acordo é da diretoria e pode gerar tumulto com outros funcionários.
- **Banco:** o **mesmo Supabase do Vendas**, para o lead entrar direto e o login ser o mesmo. O site do módulo é separado: `marketing.base360.mbigucci.com.br`.
- **Entrega no destino externo: direto no CRM dele.** Esse CRM ainda não tem porta de entrada de leads. **A gente escreve a especificação da porta e o dono daquele sistema implementa.** Até lá, o direcionador encaminha por e-mail para um endereço que o Felipe configura na tela, sem nome no código.
- **Pronto nesta etapa:** **estudo + protótipo**, para o Felipe aprovar antes do código.

## Decisões técnicas (a confirmar no estudo)
- **O direcionador vem antes de qualquer gravação** (Felipe, 05/11/2026): o lead chega, as regras são aplicadas sem gravar nada, e só depois:
  - o que vai ao destino externo é entregue sem nunca entrar em banco do Base360;
  - o que fica é gravado: como lead da empresa no Vendas e, no futuro, como contato na base de Marketing (substituto do RD).

  Por isso, os leads externos não aparecem em e-mail marketing, automações nem relatórios. Contar os envios externos, mesmo sem dados pessoais, fica para uma decisão futura do Felipe.
- **Sigilo por regra fixa no banco:**
  - as tabelas do direcionador (regras, destinos e configuração) só são lidas e escritas por quem passa em `is_gerente_geral()`, como as Faixas de VGV. Nunca por permissão do catálogo;
  - nenhuma tela, menu ou aviso de outro perfil revela que o direcionador existe;
  - o menu "Marketing" só aparece para o gerente geral.
- **Sem registro dos leads externos:**
  - o lead que vai ao destino externo passa por uma fila de entrega temporária, só para tentar de novo se a entrega falhar, e é apagado assim que entregue;
  - se não for entregue em X horas, ele também é apagado, e o gerente geral recebe um aviso sem os dados do cliente;
  - os logs das funções não podem gravar os dados do cliente. Proponha X.
- **Entrada dos leads:** uma Edge Function de entrada única normaliza (nome, telefone, e-mail, mensagem, produto, fonte), aplica as regras e entrega. Do e-mail do Felipe, o estudo compara:
  - **(a)** uma regra do Outlook que encaminha os e-mails dos portais e do site para um endereço de entrada (um serviço de e-mail de entrada que chama a função);
  - **(b)** a leitura da caixa pela Microsoft Graph, com um app registrado pelo TI;
  - **(c)** webhooks dos portais que tiverem e o formulário do site mandando direto.

  O estudo recomenda a combinação mais simples e segura e diz o que o Felipe e o TI precisam fazer.
- **Regra:**
  - campos: produto (lista do catálogo de empreendimentos), fonte, dias da semana, hora de início e de fim, destino, ativa sim/não e prioridade;
  - a primeira regra ativa que casar decide;
  - sem regra, o destino é o Vendas;
  - fora do horário de uma regra, ela não vale;
  - deve haver também uma chave geral que desliga o direcionador inteiro, e aí tudo vai para o Vendas.
- **Especificação da porta de entrada do destino externo:** um documento neutro, que serve para qualquer CRM, com:
  - o endereço (POST JSON);
  - a autenticação (chave no cabeçalho);
  - os campos;
  - as respostas e a tentativa de novo;
  - a idempotência (id do lead).

  Ele fica em `docs/marketing/porta-de-entrada-leads.md` e **não cita o destino**.
- **Site do módulo:** estático, igual ao Vendas, em `marketing.base360.mbigucci.com.br`, com a mesma casca (cabeçalho, lateral, tema). O estudo diz se nesta fase vale uma pasta `marketing/` própria no repositório ou se o Marketing começa como telas dentro do app do Vendas, só para o gerente geral, e o que muda depois.

## Etapas
1. **Estudo** (`docs/marketing/direcionador.md`, com sumário):
   - para cada portal, o que ele oferece (webhook ou só e-mail) e o formato do e-mail, com as fontes e as datas da pesquisa;
   - as opções de entrada (a, b e c), com a recomendada e os passos do Felipe e do TI;
   - o desenho do banco e o RLS do sigilo;
   - o fluxo de ponta a ponta, num diagrama;
   - a especificação da porta de entrada;
   - as perguntas ao Felipe, com opções e a recomendada primeiro, incluindo o X da fila temporária e o tratamento de leads repetidos;
   - o esboço do roadmap do Marketing como substituto do RD Station (formulários e landing pages, e-mail marketing, automações e relatórios), sem implementar.
2. **Protótipo** (`docs/mockups/marketing-direcionador.html`, autossuficiente, com dados fictícios e sem nenhum nome real de destino):
   - a lista de regras com chaves liga/desliga e a chave geral;
   - criar e editar uma regra;
   - um simulador do tipo "um lead do produto X, da fonte Y, agora, vai para...";
   - computador e celular, temas claro e escuro, no DS e na casca do Base360.

   Publique como Artifact privado e mande o link.
3. **Pare** para o Felipe aprovar. O código vem num brief seguinte.

## Arquivos permitidos
- Criar: `docs/marketing/` (o estudo e a especificação da porta) e `docs/mockups/marketing-direcionador.html`, e scripts de apoio em `local/` ou na pasta temporária.
- Não tocar: o código (`crm/`, `portal/`, `marca/`), `discovery/`, `ref/` e `C:\Projects\base360-repo`.

## Pronto quando
- O estudo cobre os 4 portais e o site, as 3 opções de entrada com a recomendada, o desenho do banco e do sigilo, o fluxo, a especificação da porta e as perguntas.
- O protótipo abre sem servidor, nos dois temas e nas duas larguras, e o simulador responde às regras de exemplo.
- **Nenhum arquivo, commit ou mensagem cita o destino externo pelo nome.** Faça uma busca antes de entregar e anexe o resultado.
- O relatório separa o que foi pesquisado (com as fontes) do que é suposição, e diz o que o Felipe e o TI precisam fazer.

## Limites
- Nunca use credenciais reais nem crie recursos externos: contas, caixas de e-mail, apps no Microsoft 365, webhooks ou deploy. Nenhum dado real de cliente.
- Sem instalar pacotes e sem commit. A sessão master revisa e commita.
- O sigilo vale para tudo que você escrever, inclusive o relatório final e mensagens para outras sessões.
