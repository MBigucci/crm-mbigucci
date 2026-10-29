# Fase 1: pesquisa "Seu CRM ideal"

> O código está em `discovery/` e o passo a passo técnico em `discovery/README.md`.

## Objetivo

Antes de construir o CRM, ouvir os corretores sobre o que é primordial no dia a dia: garantir que eles adotem a ferramenta e descobrir como deixar o cadastro manual o mais rápido possível.

## Tom: escutar sem revelar

- A primeira versão citava a verba e as campanhas próprias. O Felipe vetou: isso só será revelado na reunião de novembro.
- Na cabeça dos corretores, é "o novo CRM da empresa", mas na verdade é **o CRM deles**. Eles não vão apontar o cadastro rápido como essencial porque acham que os leads chegariam sozinhos.
- Por isso as perguntas são abertas e o tema aparece de forma indireta: de onde vêm os clientes, como sabem se uma divulgação deu resultado, que números querem ver sobre o próprio trabalho. Cada tela tem um campo opcional para eles argumentarem.

## As 7 telas

1. Boas-vindas e nome.
2. Como organiza clientes e retornos hoje (múltipla escolha) + o que funciona e o que irrita.
3. De onde vêm os clientes (múltipla, inclui "anúncios que eu faço" e "minhas redes") + como sabe se a divulgação deu resultado.
4. Cliente novo: o que anota na hora (texto), o jeito mais fácil de registrar (múltipla) e o tempo aceitável.
5. Tela preferida: quadro por etapas, lista do dia ou nenhuma das duas + por quê.
6. Números que quer acompanhar (múltipla) + outros.
7. O que faz desistir de um CRM + a única função que pediria.

As opções e os rótulos ficam em `discovery/src/lib/perguntas.ts`. A lista `PERGUNTAS` em `discovery/apps-script/Code.gs` repete esses rótulos e precisa ficar igual a eles.

## Publicação e dados

- Site estático em **mbigucci.com.br/pesquisa-crm** (pasta no WordPress, build com `BASE_PATH=/pesquisa-crm`).
- As respostas vão direto do navegador para a Google Planilha, via app da web do Apps Script. O token do site só permite gravar.
- Os resultados ficam na própria planilha: aba **Respostas** (uma linha por corretor) e aba **Painel** (contagens e gráficos, criada pelo menu Pesquisa > Criar painel).
- O link foi enviado ao grupo de corretores em 28/10/2026, com prazo até **29/10/2026 às 19h**.
- O primeiro projeto tinha `/admin/resultados` e API em Next.js. Saiu quando o deploy passou a ser no WordPress, que não roda Node.

## Próximo passo

Analisar a planilha exportada e levar os padrões para as decisões do CRM: campos do cadastro rápido, tela inicial e números do painel.
