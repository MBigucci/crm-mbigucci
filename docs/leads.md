# Módulo de leads

> Primeiro corte, construído em 29/10/2026 a partir das decisões aprovadas em `docs/pesquisa-resultados.md` (seção 3). As regras de perfis e de origem dos leads estão em `docs/acessos-perfis.md`, e a estrutura técnica em `docs/crm-arquitetura.md`.

## Sumário
1. O que entrou e o que ficou de fora
2. Regras do lead
3. Lista do dia
4. Quem vê e quem faz
5. Telas
6. Como ajustar origens, etapas e permissões
7. Testes

## 1. O que entrou e o que ficou de fora

- **Entrou:** cadastro rápido, lista do dia, ficha com interações, quadro por etapas, leads da equipe e atribuição de lead da empresa pelo gerente.
- **Ficou de fora:** áudio, lembrete push, cruzar clientes com imóveis, links de apresentação, fila de leads da empresa sem corretor, pontuação e qualquer tema do programa sigiloso.

## 2. Regras do lead

- **Obrigatórios no cadastro:** só nome, WhatsApp e origem. Temperatura, empreendimento e próximo contato são opcionais na hora, e o perfil (valor, dormitórios, região, finalidade) fica para a ficha.
- **WhatsApp:** é guardado só com dígitos e com o 55 na frente (`5511987654321`). O botão abre `https://wa.me/<número>`. O cadastro avisa quando já existe um lead ativo com o mesmo número, mas deixa cadastrar.
- **Origem:** plantão, indicação, carteira, empresa (gerente), redes sociais próprias, anúncio próprio e outros. A origem é 1 toque e já vem com a última usada naquele aparelho.
  - **Anúncio próprio** mostra o campo campanha. A campanha é só um dado de origem.
  - **Empresa** é restrita: só quem tem `leads.atribuir` cadastra um lead com essa origem, ou muda a origem de/para ela.
- **Etapas:** novo, em contato, visita agendada, visita realizada, proposta, venda e aguardando lançamento.
- **Temperatura:** quente, morno ou frio, sempre com sinal + palavra + cor: `! Quente` (vermelho), `○ Morno` (âmbar), `– Frio` (cinza). Os sinais foram escolhidos pelo Felipe em 29/10/2026. Pode ficar vazia.
- **Interação:** sempre termina com o próximo contato (dia e hora). Ela atualiza no lead a última interação e o próximo contato. O histórico não é editado nem apagado.
- **Descarte:** 1 toque no motivo (sem interesse, fora do perfil, fora da região, contato inválido, duplicado). O lead continua no banco e pode ser reativado. Não há exclusão física.
- **Carteira:** não expira, e não há justificativa obrigatória.

## 3. Lista do dia

É a tela inicial de quem tem `leads.cadastrar` e não tem `leads.atribuir` (o corretor, no padrão). A regra fica em `crm/src/lib/leads.ts`, com testes.

1. **Atrasados:** o próximo contato já passou, inclusive hoje mais cedo.
2. **Hoje:** o próximo contato é até o fim do dia, pela hora do aparelho.
3. **Sem próximo contato:** leads novos ou sem data marcada.

- Dentro de cada grupo, a ordem é quentes, mornos, frios e sem temperatura.
- Na mesma temperatura, nos atrasados e de hoje vem antes o contato mais antigo; nos sem data, o cadastro mais novo.
- Leads com contato para depois de hoje e leads descartados ficam fora. Eles aparecem em Leads e no Quadro.
- O card mostra o nome, a temperatura, o próximo contato, a última interação, a etapa e o botão WhatsApp.

## 4. Quem vê e quem faz

| Quem | Vê | Faz |
| --- | --- | --- |
| Corretor (`leads.cadastrar`) | Os próprios leads e o histórico deles | Cadastra, registra interação, muda etapa e temperatura, descarta e reativa |
| Gerente (`leads.atribuir` + `dados.ver_equipe`) | Os leads da equipe e o histórico | Cadastra lead da empresa já para um corretor ativo da equipe e reatribui dentro da equipe. Não altera os outros dados do lead. |
| Gerente geral | Tudo | Atribui para qualquer corretor ativo |
| Corretor desativado, recepção e visitante | Nada | Nada |

- A visibilidade usa `pode_ver_dados_de(dono_id)`, a mesma regra da base.
- A atribuição usa `pode_atribuir_a(corretor)`: tem `leads.atribuir`, o destino é corretor ativo e é da equipe do gerente (ou quem atribui vê todas as equipes).
- O gatilho `leads_guard` completa as policies: quem não é o dono só troca o dono, só o gerente mexe na origem restrita, e `criado_por`, `atribuido_por` e as datas são carimbados pelo banco.

## 5. Telas

| Endereço | Tela |
| --- | --- |
| `/` | Lista do dia (corretor) ou painel com atalho para Leads (gerente e gerente geral) |
| `/leads/` | Todos os leads visíveis, com busca, filtro por corretor e situação, e o resumo por corretor (ativos, atrasados, sem contato) para o gerente |
| `/leads/novo/` | Cadastro rápido. Para quem atribui, vira "Lead da empresa", com a escolha do corretor. |
| `/leads/ficha/?id=` | Ficha: interação, andamento, perfil do cliente, descarte, atribuição e histórico |
| `/leads/quadro/` | Quadro por etapas, com rolagem lateral no celular |

A ficha usa `?id=` porque a exportação estática não tem rotas dinâmicas.

## 6. Como ajustar origens, etapas e permissões

- **Origens e etapas:** ficam nas tabelas `lead_origens` e `lead_etapas`. Para renomear, reordenar, desligar (`ativo = false`) ou criar uma opção, edite as linhas no Table Editor do Supabase. O app lê as tabelas, e rodar o `schema.sql` de novo não sobrescreve o que foi ajustado.
- **Motivos de descarte:** ficam num check da tabela `leads` e em `MOTIVOS_DESCARTE` (`crm/src/lib/leads.ts`). Para mudar, altere os dois.
- **Permissões:** `leads.cadastrar` (padrão: corretor) e `leads.atribuir` (padrão: gerente) aparecem em Configurações > Permissões por perfil. O padrão só entra na primeira vez.

## 7. Testes

- `npm test` (em `crm/`): ordenação da lista do dia, WhatsApp e datas.
- `npm run test:banco`: roda o `schema.sql` três vezes no PGlite e confere o RLS de leads e interações por perfil.
- No Supabase real: `supabase/dados-teste.sql` cria 2 leads por corretor de teste, e `supabase/verificar-rls.sql` mostra o que cada perfil vê e a quem pode atribuir.
