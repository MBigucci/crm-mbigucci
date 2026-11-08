# NavegadorDePeriodo

Andar pelo tempo num painel ou numa agenda: “← Anterior · Outubro de 2026 · Seguinte →” e “Voltar para hoje”. Uma peça só no lugar das cópias do painel, das vendas, das metas, das faixas, do ranking, dos pontos e do plantão. Inclui a **semana com 7 dias** da Agenda.

**Período:** `<nav class="mb-periodo" aria-label="Período">` com dois botões `--secundario --p` (sempre com a palavra: “← Anterior”, “Seguinte →”, nunca só a seta), o `.mb-periodo__rotulo` no meio (`aria-live="polite"`) e `.mb-periodo__hoje` (`--discreto`), que só aparece quando o período não é o atual. No celular, setas e rótulo numa linha e “Voltar para hoje” embaixo, centralizado.

**Rótulos:** dia “Sexta, 06/11/2026”; semana “02/11 a 08/11/2026”; mês “Outubro de 2026”; ano “2026”.

**Semana com 7 dias:** `.mb-semana` (7 colunas, também no celular) com `button.mb-semana__dia[aria-pressed]`: nome curto (`.mb-semana__nome`), número (`.mb-semana__numero`) e quantos compromissos (`.mb-semana__contagem`, “–” quando não há). O dia escolhido é tinta (`aria-pressed="true"`, `MB.opcoes.ligar`). **Hoje** leva `.mb-semana__dia--hoje`: contorno e um traço embaixo, em tinta, sem vermelho. O `aria-label` de cada dia diz a data e a contagem por extenso.

**Estado na URL:** o período e o dia escolhidos ficam no endereço (`?mes=2026-10`, `?d=2026-11-06`), para o link compartilhado abrir igual e o Voltar do navegador funcionar.

**Faça**
- Use links (`<a>`) quando cada período tem endereço próprio.
- Junte com o `Seletor` colado (“Dia · Semana · Mês”) quando a tela troca a granularidade.

**Não faça**
- Só “←” e “→” sem palavra.
- Marcar hoje em vermelho.
