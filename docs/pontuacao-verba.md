# Pontuação, verba de leads, premiação e roleta

> Fontes: `docs/fontes/regras-comerciais-2026-10.md` (o documento original do Felipe) e a conversa de 28/10/2026.
> **Sigilo:** a verba por corretor, os pontos que viram verba e o corte dos leads do Google só serão anunciados na reunião de novembro de 2026. Até lá, nada disso aparece para corretores, gerentes ou especialistas. As telas ficam atrás da chave "Programa de verba ativo", que só o gerente geral liga.

## Contexto

A MBigucci sai do tráfego pago centralizado (roleta de leads do Google) e passa a dar uma verba mensal a cada corretor, que impulsiona os próprios anúncios. A verba vem dos pontos.

## Pontuação → verba de leads (mensal)

| Critério | Pontos | Limite no mês | Máximo |
| --- | --- | --- | --- |
| Período integral cumprido (9h–14h ou 14h–19h) | 5 | 24 períodos | 120 |
| Vídeo com a marca MBigucci | 5 | 8 vídeos | 40 |
| Visita **realizada** | 10 | 12 visitas | 120 |
| **Total possível** | | | **280** |

Regras:
- **1 ponto = R$ 10** de verba.
- A verba e a premiação calculadas em um mês são **liberadas no mês seguinte**.
- A venda conta no **mês da assinatura**. A MBigucci não fecha o mês sem assinar a venda.
- **Mínimo:** 130 pontos. Abaixo disso, a verba é R$ 0.
- **Teto sem venda:** 200 pontos (R$ 2.000).
- A **1ª venda assinada e paga do mês** destrava os pontos de 201 a 280 (até R$ 2.800).
- **Cada venda** assinada e paga soma **R$ 1.000** de verba extra, mas só para quem atingiu os 130 pontos. A venda não substitui os demais critérios.
- Só contam visitas **realizadas**.
- **Primeiro mês do programa:** R$ 1.000 fixos para todos, sem pontuação.

Cálculo, que vai virar uma função testada com todos os exemplos do documento original:

```
pontos = min(períodos,24)*5 + min(vídeos,8)*5 + min(visitas_realizadas,12)*10
se pontos < 130            → verba = 0
senão se vendas_mes = 0    → verba = min(pontos,200)*10
senão                      → verba = min(pontos,280)*10 + vendas_mes*1000
```

Exemplos do documento original, que precisam bater:

| Perfil | Pontos | Verba |
| --- | --- | --- |
| Só frequência completa | 120 | Nada |
| Frequência completa + 2 vídeos | 130 | R$ 1.300 |
| Frequência completa + 8 vídeos + 4 visitas | 200 | R$ 2.000 |
| Sem frequência: 8 vídeos + 9 visitas | 130 | R$ 1.300 |
| Sem frequência: 8 vídeos + 12 visitas | 160 | R$ 1.600 |
| Tudo completo, sem venda | 280 (limitado a 200) | R$ 2.000 |
| Tudo completo + 1 venda | 280 | R$ 2.800 + R$ 1.000 = R$ 3.800 |

## Lançamentos de pontos

- O gerente geral, o operacional, o gerente e a recepção lançam pontos. **Só contam depois que o gerente geral aprova.**
- Cada lançamento guarda: o corretor, o critério, a data, a quantidade, quem lançou, o comprovante (foto ou link), o status e quem aprovou.
- Como o lançamento vira dinheiro, cada alteração fica registrada: quem fez, quando e o que mudou.

## Premiação mensal por VGV (dinheiro)

| VGV no mês | Prêmio |
| --- | --- |
| R$ 1.000.000 | R$ 2.000 |
| R$ 1.500.000 | R$ 3.000 |
| R$ 2.000.000 | R$ 5.000 |
| R$ 3.000.000 ou mais | R$ 10.000 |

Vale só a faixa mais alta atingida (não acumula), e só contam vendas **assinadas e pagas**. A premiação também é liberada no mês seguinte.

**Construído em 29/10/2026** (`docs/vendas-metas.md`, seção 6): a tabela de faixas é configurável e o cálculo por corretor e mês fica na tela Faixas de VGV, só do gerente geral. Os textos da tela vêm de `app_settings`, e o código do site não cita a premiação.

## Roleta do fim de semana

- Entra na roleta quem cumpriu **6 períodos completos na semana**. Os períodos são 9h–14h (manhã) e 14h–19h (tarde).
- Quem não cumpriu os 6 períodos pode ir ao plantão se tiver **visita agendada**, mas fica fora da roleta.
- A saída para fazer visita durante o período é comprovada com foto para a recepcionista, para o corretor não perder o período.
- Os períodos lançados para a pontuação já dão ao CRM o que ele precisa para mostrar quem está apto.
- Quem registra os períodos no dia a dia ainda não está decidido. A proposta é a **Recepção** (ver `docs/acessos-perfis.md`).
