# EscolherVarios

Marcar vários itens de uma lista longa: quem foi ao evento de parceiros, os corretores de uma equipe, os produtos da distribuição de um corretor, os destinatários de um aviso. Até seis opções curtas, use o `Seletor --multipla` (pílulas); um item só numa lista longa, `BuscaComSugestoes`; marcar linhas de uma tabela para uma ação em lote, `TabelaCompleta`.

**Estrutura** (`.mb-varios`, dentro de um `Campo` com rótulo, `role="group"`)
- `.mb-varios__topo`: a busca (`.mb-busca` com `input[type=search]`, “Buscar por nome ou imobiliária”) e a contagem à direita (`.mb-varios__contagem`, `aria-live`): “3 marcados de 9” ou “Nenhum marcado”.
- `.mb-varios__quadro` (o mesmo material do campo: `campo`, borda `linha-forte`, `sombra-campo`):
  - `.mb-varios__todos` no topo, em `superficie-sutil`: “Marcar todos (9)”; com a busca filtrando, “Marcar os 3 encontrados”. Fica indeterminado (–) quando parte dos que aparecem está marcada;
  - `.mb-varios__lista` (até 288px, rola por dentro; no celular, metade da tela): uma linha por item, com `Marcador`, o nome e um detalhe à direita (a imobiliária, a equipe). A linha marcada fica em `areia-suave`;
  - `.mb-varios__vazio` quando a busca não acha nada: “Nada encontrado com “xyz”.”.

**Comportamento:** `MB.varios.ligar(raiz)` filtra ignorando acento e caixa, aplica “Marcar todos” só aos que aparecem, mantém marcado o que a busca escondeu, atualiza a contagem e dispara `mb-varios` com os valores marcados. No celular, cada linha e o “Marcar todos” têm 44px.

**Não faça**
- `select multiple` do navegador.
- Esconder o que já está marcado sem dizer quantos são.
- “Marcar todos” que marca também o que a busca escondeu.
