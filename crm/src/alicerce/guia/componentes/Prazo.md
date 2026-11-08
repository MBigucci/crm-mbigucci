# Prazo

Quanto tempo falta, ou quanto passou, em qualquer módulo: o prazo de 15 min do primeiro contato, os dias sem contato, os 90 dias do parceiro, o SLA em dias úteis e o prazo legal do Repasse. É **texto colorido com sinal**, não chip e não selo (decisão do Felipe, 06/11/2026).

**Classes:** `<span class="mb-prazo">` dentro de uma linha (`.mb-item__linha`, célula de tabela, `.mb-lista__meta`):

| Nível | Classe | Sinal e texto | Cor |
|---|---|---|---|
| Correndo | `.mb-prazo` | “→ Responder até 9h15”, “Vence em 5 dias úteis” | `texto-suave` |
| Atenção | `--atencao` | “! Responder em 9 min”, “! Vence em 2 dias úteis” | `alerta-texto` |
| Estourado | `--estourado` | “! Prazo estourado há 12 min”, “! Vencido há 3 dias úteis” | `erro-texto`, peso 700 |

**Regra dos sinais:** “!” pede ação; “→” diz o que vem; “✕” só para o que terminou mal (“✕ Parceiro perdido”). A cor nunca está sozinha: o sinal e a palavra dizem o nível também em preto e branco.

**Durações:** “12 min”, “1h20”, “5h”, “3 dias”; dias úteis sempre escritos (“2 dias úteis”). Datas relativas para hoje, amanhã e ontem; o resto em `dd/mm`.

**O consumidor fornece:** o texto já calculado e o nível (as regras de cada prazo ficam no módulo; os limites estão no Vocabulário).

**Faça**
- Um prazo por linha; se houver dois, o mais urgente primeiro.
- Nos cards, o prazo estourado vai na primeira linha, logo abaixo do título.

**O que está em dia não é prazo:** “✓ Apto”, “✓ Em dia” vão em texto normal com o sinal ✓, sem cor. Verde é para o que acabou de dar certo (`Toast`, `Selo --sucesso`), não para o estado normal.

**Não faça**
- Prazo em pílula ou com fundo colorido.
- Barra vermelha no card para dizer que o prazo estourou.
