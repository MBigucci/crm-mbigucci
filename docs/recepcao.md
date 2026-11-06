# Recepção do stand (`/recepcao/`)

> Construído de 04 a 05/11/2026 a partir de `docs/estudo-recepcao.md` (o porquê e as decisões do Felipe) e do brief `docs/codex-recepcao.md` (as decisões do mockup, 1 a 12). Substitui a planilha da recepção: o livro de visitas e a vez.
>
> **Sumário:** 1. Telas · 2. A vez · 3. O cliente por tipo · 4. Banco e permissões · 5. Painel e relatórios · 6. Antes da troca · 7. Roteiro de treino (uma página) · 8. Plano de volta · 9. Testes · 10. Pendências

## 1. Telas

| Tela | Quem | O que faz |
| --- | --- | --- |
| `/recepcao/` | `plantao.atendimentos` (recepção, operacional; o gerente geral sempre) | O stand do aparelho, a vez, o cadastro do cliente, o card Anuncie e os clientes de hoje |
| `/recepcao/stands/` | `plantoes.gerenciar` (operacional; o gerente geral) | Stands (novo, renomear, desativar, tem especialista), especialistas e a lista "Como conheceu" |
| `/recepcao/relatorio/` | `plantao.atendimentos_ver` (gerente; o gerente geral) | Clientes do período por tipo, como conheceu, empreendimento, corretor, especialista e parceiro |

- **PC primeiro** (a partir de 900px): duas colunas, a vez à esquerda e o cadastro à direita. **Celular** (reserva): abas "No stand" e "Clientes", com "+ Cliente" fixo no rodapé, que abre o cadastro em tela cheia.
- **O stand** é escolhido na primeira vez e o aparelho lembra (`localStorage`, chave `mbigucci-recepcao-stand`). "Trocar stand" fica no topo.
- **Teclado:**
  - Tab avança e Enter registra.
  - Na busca de pessoas, as setas escolhem e Enter confirma.
  - No tipo, as teclas N, C, P e R (ou as setas) trocam.
  - Na tela inteira: Alt+N, C, P e R escolhem o tipo; Alt+V vai para "Pôr na vez"; Alt+K, para o nome do cliente.
- A tela lê de novo a vez e os clientes a cada 15 s e quando a janela volta ao foco (duas telas no mesmo stand).

## 2. A vez

- **A ordem é a roleta feita no stand.** A recepção põe as pessoas na vez nessa ordem, e o CRM só segue em círculo, pulando quem saiu ou não está mais.
- **"Pôr na vez" só abre das 8h45 às 9h15 e das 13h45 às 14h15** (hora de São Paulo), para corretores e especialistas. Quem chega depois fica fora da vez daquele turno, mas recebe indicação e retorno normalmente.
- **Turno que vale:** a tarde a partir das 13h45, assim que já tem alguém na vez dela; antes disso, a manhã.
- **Ações na linha:** Saiu, Voltou, Passar a vez (só para quem é da vez) e Mais → Não está mais. Cada uma tem Desfazer por 8 s (o banco aceita até 30 min, e só o último movimento).
- **✓** = cliente novo recebido. Quem recebe ou passa a vez vai para o fim do círculo.
- **Antes das 8h45** a vez da manhã ainda não existe: a recepção escolhe quem atende o cliente novo (e o especialista, se houver), marcado "Antes da vez". Nada gira.
- **Stand sem especialista:** some a vez dos especialistas, o campo Especialista e o especialista do Anuncie.

## 3. O cliente por tipo

| Tipo | Vez dos corretores | Vez dos especialistas | Para onde vai |
| --- | --- | --- | --- |
| Novo | Gira | Gira | Lead do corretor da vez, origem Plantão |
| Indicação de corretor | Não gira | Gira | O lead de quem indicou (achado pelo telefone, depois pelo nome) ou um lead novo com a origem Indicação |
| Indicação de parceiro | Não gira | Gira | O cliente fica com o gerente dono do parceiro na hora (gravado; não muda depois) |
| Retorno | Não gira | Não gira | O lead (ou o cliente de parceiro) do atendimento escolhido na busca |

- **Lead criado pela recepção:** o dono é o corretor e o "criado por" é a recepcionista. A interação "No stand" (`plantao`: "Atendido no plantão" ou "Voltou ao plantão") conta como conversa e tira o lead de "novo". O próximo contato fica o do lead, ou amanhã às 10h se estiver vazio. O prazo de 15 min e o aviso "atribuído" só valem para a origem `empresa` e não disparam.
- **Indicação com quem indicou fora do stand:**
  - Na vez como Saiu ou Não está mais, conta como fora do stand.
  - Fora da vez, a recepção responde se ele está no stand.
  - Se está fora, a tela pergunta se o gerente dele está no stand: se sim, anuncia o gerente; se não, o corretor da equipe que está mais atrás na vez.
  - O lead fica com quem indicou.
- **Parceiro:** a recepção digita o parceiro e escolhe o gerente: o que o parceiro procura, ou o da roleta de parceiros. Na roleta, a pergunta é "ele está no stand?", e "Não está" passa ao próximo, sem que o pulado perca a vez. Parceiro já cadastrado fica com o gerente dele (`recepcao_parceiro_entrar`, em `parcerias.sql`).
- **Avisos que pedem confirmação:** telefone já registrado hoje no stand; telefone que é lead ativo de outro corretor (sem dizer de quem; "Trocar para Retorno" ou "Registrar mesmo assim", que fica anotado no lead); "a vez mudou" (outra tela registrou antes).
- **Retorno:** a busca (telefone ou 3+ letras do nome) mostra só o primeiro nome, o final do telefone, o vínculo (inclui o corretor dono: decisão 12), o último atendimento e o especialista dele. A tela mostra também o especialista da vez, para a cortesia, que não é registrada.
- **Sem telefone:** pode. O lead nasce sem WhatsApp, e o dono digita o número depois, na ficha.
- **Anuncie:** "Corretor(a) X e especialista Y" (ou Gerente, ou Parceiro), a linha do tipo e Desfazer por 8 s. O lead criado e intocado some; um lead que já existia ganha uma anotação.
- **Corrigir:** como conheceu, nome, telefone, e-mail, acompanhante, empreendimento e observação. Sem motivo até 30 min, depois com motivo. Depois do dia, só o gerente geral (ou quem tem `dados.ver_todos`). Para trocar o tipo ou quem atendeu, use Desfazer e registre de novo. O lead não muda, porque é do corretor.

## 4. Banco e permissões

- **Arquivo:** `crm/supabase/recepcao.sql`. A ordem é `schema.sql`, depois `parcerias.sql`, depois `recepcao.sql`. É idempotente. O Felipe rodou os três no Supabase em 05/11/2026.
- **Tabelas:**
  - `plantoes` (stands);
  - `especialistas`;
  - `plantao_presencas` e `plantao_presenca_eventos` (a vez);
  - `plantao_midias` ("Como conheceu");
  - `plantao_atendimentos` e `plantao_atendimentos_historico` (o histórico só o gatilho escreve);
  - `profiles.apelido` e `creci`.
- **Escrita só pelas funções** (security definer): `recepcao_por_na_vez`, `recepcao_evento`, `recepcao_desfazer_evento`, `recepcao_registrar_cliente`, `recepcao_desfazer_cliente`, `recepcao_corrigir`. **Leitura:** `recepcao_dia`, `recepcao_pessoas`, `recepcao_clientes_hoje` e `recepcao_procurar_retorno`, mais as policies das tabelas.
- **Quem lê:**
  - a recepção, só o dia de hoje (os dias anteriores, só pela busca do retorno);
  - o corretor, os atendimentos dele (vínculo ou anunciado);
  - o gerente, os da equipe (com `plantao.atendimentos_ver`) e os dos parceiros dele;
  - o gerente geral, tudo, inclusive a auditoria.
- **Permissões novas:** `plantao.confirmar` e `plantao.atendimentos` (recepção, operacional), `plantao.atendimentos_ver` (gerente e operacional), `plantoes.gerenciar` (operacional). Quem tem `plantao.atendimentos_ver` e `plantoes.gerenciar` (o operacional) lê todos os atendimentos, de qualquer dia (Felipe, 05/11/2026).
- **Apelido obrigatório** para corretor ativo, único entre os ativos. O banco cobra ao ativar, e `/usuarios` tem os campos Apelido e CRECI.
- **Id gerado no aparelho:** repetir o mesmo envio devolve a mesma resposta, sem duplicar. Duas telas no mesmo stand esperam uma pela outra (trava por stand, dia, turno e papel).

### Distribuição automática (06/11/2026)

- **A vez conta como presença** para receber leads da empresa (Felipe, 16.8): o corretor posto na vez do turno atual, com estado "presente", está no stand. "Saiu" o deixa fora do stand (mantém a posição na fila de leads); "Não está mais" o tira. A recepção não aprova o check-in do corretor; `recepcao_checkins(stand)` mostra quem fez check-in. Regras em `docs/distribuicao-automatica.md`, seção 6.1.1.
- **Para o treino:** marcar "Saiu" e "Não está mais" agora também tira o corretor dos leads da empresa.

## 5. Painel e relatórios

- **Painel da equipe** (`/painel/`): a tabela "Clientes no stand, por corretor · pela recepção", com clientes, novos da vez, indicações, retornos e atendeu por colega. O cliente conta para o corretor do vínculo; o de parceiro fica com o gerente. Tem link para o relatório do stand.
- **Relatório do corretor** (`/painel/?c=`): os mesmos números em cartões.
- **Relatório do stand** (`/recepcao/relatorio/`): dia, semana ou mês, um stand ou todos, e Imprimir.
- **Fica para a sessão própria de relatórios** (`docs/estudo-relatorios.md`): a exportação CSV e os relatórios para o Felipe e o marketing.

## 6. Antes da troca (todas as lojas no mesmo dia)

1. **Corretores:** todos os ativos com usuário, **apelido** (como a recepção chama) e equipe, em `/usuarios`. Conferir com a lista oficial (82 na planilha).
2. **Stands:** os 4 já existem (Marco Zero, Home Store, Easy, Elleva). Em `/recepcao/stands/`, marcar quais têm especialista.
3. **Especialistas:** cadastrar todos os nomes em `/recepcao/stands/`.
4. **"Como conheceu":** conferir a lista (14 itens), renomear ou desativar.
5. **Parceiros frequentes:** cadastrados no módulo de Parcerias (os demais entram pela recepção).
6. **Contas:** uma conta de recepção por recepcionista (perfil Recepção, ativa), e não uma conta por loja.
7. **PC de cada loja:** o CRM aberto em `/recepcao/`, com o stand escolhido.
8. **Treino:** cada recepcionista registra um cliente de cada tipo com o roteiro abaixo, de preferência em menos de 30 s cada.
9. **Plano de volta:** a planilha em branco impressa ou salva no PC (seção 8).

## 7. Roteiro de treino (uma página)

**Ao abrir (8h45 às 9h15):** em "Pôr na vez", digite o apelido do primeiro da roleta e tecle Enter. Repita, na ordem da roleta. Faça o mesmo com os especialistas. Às 13h45, na aba Tarde.

**Chegou um cliente:**
1. Escolha o tipo: N (novo), C (indicação de corretor), P (indicação de parceiro) ou R (retorno).
2. Marque como ele conheceu (pode marcar mais de um).
3. Digite o nome, o telefone (se ele der) e o e-mail (se der).
4. Digite o acompanhante, ou toque em "Veio sozinho".
5. Por tipo:
   - **Novo:** o corretor e o especialista já vêm da vez.
   - **Indicação de corretor:** digite o apelido de quem indicou. Se aparecer uma pergunta ("está no stand?", "o gerente está?"), pergunte e responda.
   - **Indicação de parceiro:** digite o nome do parceiro, a imobiliária e o telefone. Se ele procura um gerente, escolha. Senão, pergunte se o gerente indicado pela roleta está no stand; se não estiver, toque em "Não está, passar ao próximo".
   - **Retorno:** digite o telefone (ou o nome) e toque em Procurar. Escolha o cliente na lista.
6. Tecle Enter (ou "Registrar cliente").
7. **Anuncie quem o card mostrar.** Errou? Toque em Desfazer em até 8 s.

**Durante o dia:**
- O corretor saiu para visita: Saiu. Voltou: Voltou.
- Ele está atendendo e não pode pegar a vez: Passar a vez.
- Foi embora: Mais → Não está mais.
- Antes das 8h45: o cadastro pede "Quem atende".

**Corrigir:** em "Clientes de hoje", Corrigir. Depois de 30 min, escreva o motivo.

## 8. Plano de volta

Se o CRM cair, a recepção anota numa planilha em branco com as mesmas colunas: hora, tipo, como conheceu, cliente, telefone, e-mail, acompanhante, corretor (ou parceiro e imobiliária), especialista, empreendimento e observação. A vez fica no papel, na ordem da roleta. Quando o CRM voltar, ela registra os clientes do dia (o horário fica o do registro; anote o real na observação). A planilha modelo é um arquivo da loja e fica **fora do Git**.

## 9. Testes

- **Banco** (`npm run test:banco`): `supabase/testes/recepcao.test.mjs` (a vez, a janela, a leitura por perfil, os quatro tipos, os avisos, o retorno, corrigir e desfazer) e `recepcao-parceiros.test.mjs` (de ponta a ponta com o `parcerias.sql` real). A hora é controlada (`private.recepcao_agora`).
- **App** (`npm test`): `src/lib/recepcao.test.ts` (janela, turno, estado da linha, textos do Anuncie, erros, busca por apelido, números do painel e do relatório).
- **Telas:** conferidas no navegador com um Supabase de mentira que roda o banco real (PGlite), fora do Git.

## 10. Pendências

- `crm/supabase/verificar-rls.sql` ainda não lista as tabelas da recepção (o RLS delas está coberto nos testes por perfil).
- Visita realizada pendente da primeira visita de indicação de corretor (decisão 14 do estudo): precisa de uma linha em `visitas` ou mudar o schema de `lancamentos_pontos`.
- ✓ Resolvido em 05/11/2026: o operacional vê os dias anteriores e o relatório do stand (decisão do Felipe).
- Exportação CSV e relatórios para o Felipe e o marketing: sessão própria.
- Aviso no celular para quem é anunciado: depois (decisão 21 do estudo).
