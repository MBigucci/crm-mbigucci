# ImportacaoComPrevia

Trazer dados de fora em três passos — **enviar, conferir, aplicar** — com nada gravado antes do fim. Uma peça só para o Cadastro Mágico do Vendas (colar a mensagem do WhatsApp ou do portal), a importação da tabela de preços e a planilha do Repasse.

**Estrutura:** um `Cartao` com `Etapas --compacta` (Enviar o arquivo · Conferir a prévia · Aplicar; a atual diz “nada foi gravado ainda”), um `Aviso` com o resumo (“96 unidades lidas · 94 prontas · 2 para conferir”) e a prévia:
- **Tabela** (planilha, tabela de preços): `TabelaCompleta --densa`, uma linha por item, com o `Selo` da leitura: `--sucesso` “Pronta”, `--alerta` “Conferir · motivo”, `--erro` “Não entra · motivo”. As linhas a conferir ficam marcadas e no topo.
- **Campos** (colar mensagem): os campos encontrados, com selo **só no que pede atenção** — “! Conferir” (`--alerta`) e “✕ Não encontrado” (neutro). O que foi lido sem dúvida fica sem selo: o título já diz “4 de 4 campos encontrados”, e quatro selos verdes iguais não dizem nada — e as pílulas de perfil de várias escolhas, que só valem quando tocadas.

**Aplicar:** a ação final diz quanto entra (“Aplicar 94 unidades…”) e, como não volta atrás, abre o `Dialogo` com o efeito escrito (“As 94 unidades passam a valer a tabela de novembro. A tabela anterior fica no histórico.”). Depois, o `Toast` de sucesso e o registro no histórico.

**Faça**
- Mostrar o que muda em relação ao que já existe (“subiu 31%”).
- Deixar voltar ao passo anterior sem perder o arquivo.

**Não faça**
- Gravar enquanto lê.
- Esconder as linhas que não entram.
