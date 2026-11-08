# DataHora

Data e hora do próximo contato ou da visita: atalhos de um toque e, embaixo, os campos nativos de dia e hora.

**Estrutura:** um `Seletor` (`.mb-opcoes .mb-opcoes--4`) com “Hoje”, “Amanhã”, “Em 3 dias”, “Em 1 semana”, e `.mb-campo__par` (duas colunas, também no celular) com dois `Campo`: `<input class="mb-campo__entrada" type="date">` (“Dia”) e `<input class="mb-campo__entrada" type="time" step="900">` (“Hora”, de 15 em 15 minutos).

**Por que nativo:** no celular o `type="date"` e o `type="time"` abrem o seletor do aparelho, no formato do usuário (dd/mm/aaaa, 24 horas). O valor que o sistema lê é ISO (`2026-11-07`, `15:00`); para mostrar, use `MB.formatar.data`. No grafite o ícone do calendário é invertido para ficar claro.

**Atalhos:** tocar num atalho preenche o dia (e marca a opção); mexer no dia desmarca o atalho. Hora sem atalho: o corretor escolhe.

**Aparência e toque:** os mesmos de `Campo` — 40px no computador; 44px e texto de 16px no celular.

**O consumidor fornece:** o cálculo dos atalhos a partir de hoje, os limites (`min` = hoje para próximo contato) e a validação (“Escolha um horário entre 8h e 20h”).

**Faça**
- Rótulos curtos e visíveis (“Dia”, “Hora”), nunca só placeholder.
- Mostre a data escolhida por extenso na confirmação (“Próximo contato: sábado, 07/11, 15:00”).

**Não faça**
- Seletor de data próprio em JavaScript: o nativo é mais rápido no celular.
- Três campos separados para dia, mês e ano.
