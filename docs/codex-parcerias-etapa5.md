# Desenho: Parcerias etapa 5 (carteira do gerente, origem Parceiro e indicações)

Sumário: Leia antes · O que o Felipe decidiu · Desenho do banco · Telas · Ordem e dependências · Fora desta etapa · Dúvidas.

Situação: **desenho para conciliar com a sessão principal do Vendas antes do código** (05/11/2026). Ainda não é o brief da frente.

## Leia antes
- `docs/codex-parcerias.md`, itens 14 a 18.
- `docs/leads.md`, `docs/recepcao.md` (tipo `indicacao_parceiro`) e `docs/vendas-metas.md`.
- `crm/supabase/schema.sql`: `leads`, `lead_origens`, `leads_guard`, `pode_atribuir_a`, `origem_restrita` e as policies de `leads`.
- `crm/supabase/recepcao.sql`: `plantao_atendimentos` e o ramo `indicacao_parceiro`.

## O que o Felipe decidiu (05/11/2026)
1. **De parceiros:** o cliente de parceiro vira **lead do gerente** (`dono_id` = gerente), com a origem `parceiro` e o `parceiro_id`. O cliente pode vir do estande ou ser indicado ao gerente. Tem ficha, follow-up e visita como qualquer lead.
2. **Acompanhando:** o gerente **não tira lead do corretor**. Ele marca para acompanhar os casos quentes da equipe, e o lead continua do corretor.
3. A tela separa as duas coisas com clareza: "De parceiros" e "Acompanhando".
4. **Prazo:** a origem `parceiro` **não tem prazo de perda** (fica fora dos 15 min e de qualquer redistribuição).
5. **Repasse:** o gerente pode passar um lead "De parceiros" para um corretor da equipe.
6. **Venda:** o gerente nunca vende sozinho. A venda de parceiro tem como **participantes o parceiro e o gerente, sem corretor da casa**. A divisão é por porcentagem em cada venda (estrutura de participantes desenhada pela sessão principal).
7. As vendas com parceiros contam para a **meta do gerente**, num desenho posterior.

## Desenho do banco
- **Origem:** `lead_origens` ganha `('parceiro', 'Parceiro', restrita = true)`. Só entra pelas funções abaixo, nunca pelo cadastro do corretor.
- **`leads.parceiro_id uuid null references public.parceiros`**, com o check `(origem = 'parceiro') = (parceiro_id is not null)`.
  - A coluna é criada em `parcerias.sql`, porque depende de `parceiros`, por `alter table ... add column if not exists`.
- **Lead do gerente, por funções novas `security definer`** em `parcerias-carteira.sql`. Elas **não reescrevem** `leads_guard` nem `pode_atribuir_a`.
  - `parceiro_lead_criar(p_id, p_parceiro, nome, whatsapp, ...)`: cria o lead com o dono igual ao gerente atual do parceiro. Exige ser o dono do parceiro ou ter `parceiros.ver_todos`. Lead com o mesmo WhatsApp já ativo devolve "já atendido na MBigucci", sem o nome do corretor.
  - **Recepção:** o ramo `indicacao_parceiro` de `plantao_atendimentos` chama `private.parceiro_lead_do_estande(...)`. Ela cria ou atualiza o lead do gerente congelado e liga `plantao_atendimentos.lead_id`.
  - **Ponto a conciliar:** `leads_guard` e as policies podem barrar `dono_id` de gerente nas edições comuns (ficha, follow-up, interação). Se barrarem, é preciso uma exceção mínima: "dono pode editar o próprio lead com origem `parceiro`, seja qual for o perfil". Ela entra **depois** do banco da distribuição automática, combinada com a sessão principal.
- **Repasse:** `parceiro_lead_repassar(p_lead, p_corretor)` passa o lead do gerente para um corretor da equipe. O lead mantém a origem e o `parceiro_id`, para continuar contando como indicação do parceiro. Grava em `lead_eventos`.
- **Acompanhar:** tabela `lead_acompanhamentos (lead_id, gerente_id, criado_em, primary key (lead_id, gerente_id))`.
  - RLS: o gerente só marca e lê leads que já vê por `pode_ver_dados_de(dono_id)`. Marcar não muda o dono nem aparece para o corretor.
  - Fica em `parcerias-carteira.sql` e não toca em `leads`.
- **Prazo:** o prazo de 15 min e a redistribuição valem só para a origem `empresa`. É preciso confirmar no banco da distribuição que `parceiro` fica de fora, e escrever um teste para isso.
- **Indicações por parceiro:** a view `parceiros_indicacoes` (`security_invoker`) traz, por parceiro, os leads com aquele `parceiro_id` (indicados), as visitas e as vendas em que o parceiro participa. A view `parceiros_situacao` passa a preencher `indicados`, `vendidos` e os estágios Indicou e Vendeu.
- **Venda de parceiro:** nenhuma estrutura própria. Ela usa a lista de participantes da sessão principal, com o parceiro e o gerente, e as porcentagens que somam 100%.

## Telas
- **"Minha carteira"** do gerente, no menu perto de Parceiros, com duas abas bem distintas:
  - **De parceiros:** os leads do gerente com origem Parceiro e o selo "Parceiro · <nome>". Tem as ações da ficha de lead e "Passar para corretor".
  - **Acompanhando:** os leads marcados, com o selo "Do corretor <nome>". Só leitura e atalho para a ficha. Tem a ação "Parar de acompanhar".
- **Ficha do lead:** botão "Acompanhar" para quem tem `dados.ver_equipe`. No lead de parceiro, aparece a linha "Indicado por <parceiro>".
- **Ficha do parceiro:** o card "Indicações" (indicados, vendidos, a última indicação) e "Clientes indicados" (primeiro nome, empreendimento, etapa e data). Os estágios Indicou e Vendeu passam a funcionar.
- **Início do gerente:** a carteira entra na lista do dia dele (próximos contatos dos leads "De parceiros").

## Ordem e dependências
1. Este desenho vai à sessão principal e é conciliado.
2. O SQL que não toca no núcleo (origem, `parceiro_id`, acompanhamentos, views e funções novas) pode ser feito já.
3. A exceção no `leads_guard` e nas policies, se precisar, só entra depois do banco da distribuição automática.
4. A venda de parceiro e o "Vendeu" ficam esperando a estrutura de participantes da sessão principal.
5. Telas.

## Fora desta etapa
- A meta do gerente com vendas de parceiros, num desenho posterior.
- O fifty e a divisão por porcentagem, que são da sessão principal.
- O link de indicação do parceiro (proposta 9 do estudo de referências).

## Dúvidas para o Felipe (depois da conciliação)
1. Lead de parceiro com o WhatsApp de um lead que já é de um corretor: fica com o corretor (recomendado, mesma lógica do duplicado de parceiro) ou vai para o gerente?
2. Quando o parceiro muda de gerente nos 90 dias, os leads "De parceiros" ficam com o gerente antigo (como os clientes do estande, decisão 20 da recepção) ou vão junto?
