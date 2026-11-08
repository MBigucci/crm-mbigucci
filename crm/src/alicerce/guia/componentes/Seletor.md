# Seletor

Uma peça só para escolher entre poucas opções com um toque. Antes, cada módulo desenhava a sua (temperatura, tipo de interação, origem, atalhos de dia, modelos de mensagem, tipo de cliente, filtros, período…); agora todos usam esta.

**Pílulas (`.mb-opcao`):** `<div class="mb-opcoes" role="group" aria-labelledby="…">` com `<button type="button" class="mb-opcao" aria-pressed="true|false">`.
- Grade: duas colunas no celular; `--3` (três sempre), `--4` e `--6` (a partir de 768px). `--linha`: cada pílula no tamanho do texto, quebrando linha (perfil, origens, regiões).
- Tamanhos: padrão `controle-m` (40px; 44px no celular) nos formulários; `--p` (28px) nos filtros acima de listas e tabelas, com `.mb-opcao__contagem`. `.mb-filtro` continua valendo como apelido do `--p`.

**Três jeitos de escolher:**
- **Uma escolha** (padrão): marcar uma desmarca as outras. `role="group"` + `aria-pressed`.
- **Desmarcável** (`data-mb-desmarcavel`): tocar de novo na marcada limpa a escolha. Para campos opcionais, como a temperatura no cadastro.
- **Várias** (`.mb-opcoes--multipla`): cada pílula liga e desliga sozinha; o sinal “+” vira “✓”, então o estado não depende da cor.

**Colado (`.mb-segmentado`):** botões colados, separados por um fio, para alternar visões do mesmo dado (“Dia · Semana · Mês”, “Canais · On e off”). `--p` para cima de gráficos.

**Marcado = tinta:** fundo `texto` e letra `superficie`, nos dois temas e também com o modificador de marca. Seleção nunca é vermelha nem verde.

**Comportamento:** `MB.opcoes.ligar(grupo)` cuida dos três jeitos e dispara `mb-opcao` com `detail.valor` (uma escolha; `null` quando desmarcou) ou `detail.valores` (várias).

**Escreva “Todos” e “Todas” com o substantivo:** “Todas as situações”, “Todos os corretores”, nunca só “Todos”.

**Faça**
- Até seis opções; mais que isso, `select` em `Campo` ou `BuscaComSugestoes`.
- Atalhos de data (“Hoje”, “Amanhã”, “Em 3 dias”, “Em 1 semana”) acima dos campos de `DataHora`.

**Não faça**
- Usar como abas (troca de tela): isso é `Abas`.
- Opção marcada em `acao` ou `marca`.
- Desenhar outro botão de escolha no módulo.
