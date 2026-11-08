# Historico

A linha do tempo de um registro (lead, contrato, parceiro): o que aconteceu, quando e quem fez. É também o lugar das observações e das correções.

**Estrutura:** `<ol class="mb-historico">` do mais novo para o mais antigo, com `.mb-historico__item`:
- `.mb-historico__cabeca`: o tipo em `strong` (“WhatsApp”, “Etapa”, “Documento”, “Correção”), quando (“Hoje, 10:42”, “04/11/2026, 16:20”) e quem (“Marina Exemplo”, “Tiago Exemplo · gerente” ou **“automático”**);
- `.mb-historico__texto`: o que aconteceu; mudanças como “antes → depois”;
- `.mb-historico__depois`: o que ficou combinado (“→ Próximo contato: sábado, 09:00”) ou o motivo de uma correção.

O que o sistema fez sozinho leva `.mb-historico__item--auto` (ponto e texto mais claros).

**Filtro:** um `Seletor` de várias escolhas `--p` acima da lista — **Interações, Mudanças, Documentos, Automáticos** (decisão do Felipe, 06/11/2026). Os automáticos começam desligados.

**Regras:** nada do histórico se apaga; remover um documento vira um item (“Documento removido”). Correções sempre com motivo. Datas relativas para hoje e ontem.

**Não faça**
- Histórico em tabela.
- Esconder quem fez a mudança.
