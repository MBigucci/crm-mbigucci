# Acessos e perfis do CRM

> Fonte: conversa com o Felipe em 28/10/2026. O sigilo do programa de verba está em `docs/pontuacao-verba.md`.

Os acessos são **perfis com permissões configuráveis**, não regras fixas no código. Operacional e Especialista ainda serão definidos.

| Perfil | Vê | Faz |
| --- | --- | --- |
| **Gerente geral** (Felipe) | Tudo | Cadastra usuários, equipes, critérios de pontuação e metas. **Aprova todo lançamento de pontos.** Fecha o mês (verba e premiação). Liga e desliga o ranking e o programa de verba. |
| **Operacional** | _a definir_. Proposta: dados operacionais de todas as equipes, sem bônus em dinheiro | Lança pontos (períodos, vídeos, visitas), que ficam **pendentes de aprovação**. Proposta: cadastrar empreendimentos e conferir a conciliação de campanhas |
| **Gerente** | Leads, atendimento, agendamentos e visitas **da própria equipe**, com o histórico de cada lead | Acompanha os leads da equipe, distribui os leads da empresa entre os corretores dela e lança pontos (pendentes de aprovação). **Não vende e não pontua.** |
| **Corretor** | Os próprios leads, a agenda, os pontos, a verba, a meta e o ranking | Cadastra e trabalha os próprios leads e cria metas próprias |
| **Recepção** | Escala de períodos do dia e quem está no plantão | Registra os períodos cumpridos (manhã e tarde) e recebe a foto que comprova a saída para visita. Os lançamentos ficam pendentes de aprovação, como os demais. |

## Programa de pontuação (construído em 29/10/2026)

Tudo atrás da chave `programa_verba_ativo`. Com ela desligada, só o gerente geral vê as telas e recebe dados; o banco devolve zero linhas aos outros perfis. Detalhes e a tabela completa por perfil em `docs/pontuacao-verba.md`, seção "Como ficou".

- **Gerente geral:** sempre vê tudo. **Só ele aprova, recusa e volta para pendente** (regra fixa no banco, não é permissão do catálogo). Fecha o mês, edita os critérios e define o primeiro mês do programa.
- **Recepção:** permissão `plantao.registrar`. Na tela Plantão, marca os períodos e a saída para visita (com o link da foto) de **qualquer** corretor ativo e vê a roleta. Só períodos: não lança vídeo.
- **Gerente:** permissão `lancamentos.registrar`. Lança períodos e vídeos **da equipe** e vê os lançamentos e a roleta da equipe.
- **Operacional:** as duas permissões no padrão. Períodos de todos; vídeos só de quem ele vê (dê `dados.ver_todos` para todos).
- **Corretor:** vê só os próprios pontos **aprovados**, a verba prevista e o ranking. Não lança nada, nem para si.
- Quem lançou cancela o próprio lançamento pendente (é o Desfazer da recepção). O lançamento nunca é excluído, e cada mudança fica na auditoria.
- As visitas realizadas entram sozinhas como pendentes, pela baixa da visita (`docs/visitas.md`).
| **Especialista** | _a definir_ | _a definir_ |

## Equipes

Cada corretor pertence a **um único gerente** (equipe).

## Origem dos leads

- Os leads da empresa deixam de vir da roleta do Google e passam a ser **distribuídos pelo gerente**.
- O CRM precisa da ação "atribuir lead a um corretor da minha equipe".
- A origem do lead fica registrada como **Empresa (gerente)** ou **Próprio (campanha do corretor)**.
- Todo lead das campanhas do corretor é cadastrado **à mão** no CRM. Não há integração nem webhook de leads externos.
- No fim do mês, o número de leads das plataformas de anúncio precisa bater com o de leads próprios cadastrados no CRM: é a conciliação da verba. Os leads da empresa não entram nessa conta.
