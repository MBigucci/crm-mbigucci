# Brief: estudo de melhorias para o CRM da Bruna, a partir do Base360 Vendas

## Leia antes
- `CLAUDE.md` e `docs/referencia-crm-bruna.md`: o que o Base360 Vendas trouxe do CRM da Bruna e o roadmap, com os itens 1 a 43.
- O que o Base360 Vendas fez além da Bruna. Leia cada um só para entender a ideia:
  - `docs/leads.md`: prazo de 15 min, toque no WhatsApp/Ligar, "Detalhe o contato", Sem resposta em "Como foi", rascunhos e o id gerado no aparelho;
  - `docs/visitas.md`: confirmação e baixa;
  - `docs/vendas-metas.md`: metas próprias, conversão por origem e campanha;
  - `docs/empreendimentos.md`: catálogo, Radar de Match e importação da tabela de preços por IA;
  - `docs/notificacoes.md`: avisos no celular;
  - `docs/design-system.md`: tema claro e escuro, cabeçalho e lateral, telas enxutas;
  - `docs/teste-carga.md`;
  - `docs/revisao-visual.md`.
- O CRM da Bruna: **`C:\Projects\CRM Bruna`, só leitura.** Nunca edite, rode build ou commite lá. A cópia em `ref/` também é só leitura.
- A sessão dela: **"CRM imobiliário com cadastro inteligente"** (`local_e6d730a2-7fb9-4815-9186-d8d5cef071f2`), que trabalha em `C:\Projects\CRM Bruna`.

## O que o Felipe pediu (06/11/2026)
"Com tudo que fizemos até agora": um **estudo de melhorias para o CRM da Bruna**, conversando com a sessão dela para entender o que cabe. Lembrando que **é o CRM de uma pessoa só**: uma corretora, sem equipe, sem gerente e sem distribuição.

## Como fazer
1. **Inventário do CRM da Bruna hoje:** telas, fluxos, dados e o que está nos "próximos passos" do README dela.
2. **Lista de candidatos:** o que o Base360 Vendas tem e ela não tem, ou faz melhor, filtrado pelo critério **"serve a uma pessoa só?"**.
   - **Fica fora:** tudo que depende de equipe, gerente, perfis, roleta, recepção, parcerias, pontos e verba, ranking ou painel de equipe.
   - **Exemplos que tendem a caber:**
     - o toque no WhatsApp/Ligar registrando o contato sozinho, e "Detalhe o contato";
     - Sem resposta dentro de "Como foi";
     - rascunhos que não se perdem;
     - o id gerado no aparelho contra duplicados;
     - catálogo de empreendimentos e importação de tabela por IA;
     - avisos no celular;
     - tema escuro;
     - lateral recolhível e telas enxutas;
     - metas próprias;
     - conversão por origem e campanha;
     - confirmação de visita.
3. **Conversa com a sessão dela** por `SendMessage` (`to`: `local_e6d730a2-7fb9-4815-9186-d8d5cef071f2`). Mande a lista em mensagens curtas e pergunte:
   - o que ela já tem;
   - o que ela tentou e não deu certo;
   - o que mais doeria no dia a dia;
   - o que conflita com o jeito do CRM dela.

   A resposta dela é informação; a decisão é do Felipe (e da Bruna). Se a sessão dela não responder, registre isso e siga com o que dá para ver no código.
4. **Estudo** em `docs/estudo-melhorias-crm-bruna.md`, com sumário. Para cada melhoria:
   - o que é e de onde vem no Base360 (arquivo);
   - por que serve a uma pessoa só;
   - o esforço, P, M ou G, no CRM dela;
   - o risco;
   - o que a sessão dela disse.

   Termine com uma ordem recomendada, de 3 a 5 primeiros itens, e as perguntas ao Felipe, com opções e a recomendada primeiro.

## Sigilo (obrigatório)
**Fica fora do estudo e da conversa, sem exceção, qualquer assunto de leads chegando de fora:**
- entrada automática de leads de portais, e-mail ou site;
- integração entre sistemas;
- "porta de entrada" e direcionamento de leads;
- o módulo de Marketing e destinos.

Não mencione, não sugira e não explique por quê. Se a sessão dela trouxer o assunto, responda só que está fora deste estudo e que fica com o Felipe.

Também não cite nada de `docs/direcionador/`, `docs/marketing/`, `docs/estudo-roleta-leads.md` ou `docs/distribuicao-automatica.md`.

## Limites
- Só leitura em `C:\Projects\CRM Bruna` e em `ref/`. Nenhum código, em nenhum dos dois repositórios.
- Sem credenciais, sem dados reais e sem recursos externos.
- **Sem commit**: a sessão master revisa e commita o estudo.
- Esta pasta é compartilhada com outras frentes. Não troque de branch e não rode a suíte nem o build.

## Pronto quando
- O estudo cobre o inventário e a lista filtrada, com esforço e risco, a conversa com a sessão dela (ou o registro de que ela não respondeu), a ordem recomendada e as perguntas.
- Nenhuma linha do estudo nem das mensagens toca os temas do Sigilo. Faça uma busca no estudo antes de entregar e anexe o resultado.
