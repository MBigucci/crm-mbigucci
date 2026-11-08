# FichaDoLead

Tela de referência do Base360 Vendas no computador: tudo sobre um lead e o registro da próxima interação. No celular as duas colunas viram uma.

**Estrutura:**
1. `.mb-app` com `data-acao="marca"` (a preferência botão vermelho; no sistema, no `<html>`), `MenuLateral` (item “Leads” atual, recolher e Atalhos), `BarraSuperior` (status “✓ Recebendo · 3º na fila” e “+ Novo lead”) e, no celular, `MenuCelular`.
2. Link “← Voltar para a lista”, o título da tela e, logo abaixo, o `Aviso --alerta` do atraso (“Contato atrasado desde ontem, 10:00”), quando houver.
3. `.mb-painel__linha` com duas colunas (8 + 4; empilham abaixo de 1024px):
   - à esquerda, o cartão do lead (nome em 24px, telefone, temperatura, `.mb-pares` com próximo e último contato, origem, empreendimento e cadastro, e “WhatsApp →” + “Ligar”); o cartão “Registrar interação” (`Aviso` informativo quando o corretor acabou de abrir o WhatsApp, `Seletor` “Como foi”, campo de texto, `DataHora` com atalhos e o primário “Registrar interação”, do tamanho do texto e à direita no computador, de largura inteira no celular); a visita como `Compromisso` (Remarcar + WhatsApp →; Remarcar abre dentro do card; Cliente confirmou e Cancelar ficam na visita aberta);
   - à direita, um cartão com `Abas` no topo: Andamento (temperatura em `Seletor` desmarcável e etapa em `select`), Documentos (`Envio`) e Histórico.

**A etapa do lead aparece só no `select` de Andamento** (decisão do Felipe, 06/11/2026): nem sobrelinha nem selo no cartão do lead. Na lista, ela é o `Selo` de etapa do `CardLead`.

**Regras que a tela demonstra:**
- Uma ação principal: “Registrar interação” — vermelha quando a pessoa usa o botão principal vermelho, e então o único vermelho da tela além do logo e do menu. WhatsApp é externo e verde, e não compete com ela.
- Temperatura em pílula colorida no cartão do lead; a etapa fica só no `select` de Andamento.
- Sobrelinhas, links e o resto ficam como sem o modificador.
- Seleção em tinta: “WhatsApp”, “Amanhã” e “! Quente” marcados ficam pretos (claros no grafite), nunca vermelhos.
- O que pede atenção vira `Aviso` no ponto em que importa; nos `.mb-pares` os dados ficam em palavras (“Ontem, 10:00 · atrasado”).

**O consumidor fornece:** os dados do lead, o histórico em ordem do mais novo, a visita agendada (se houver) e os documentos já enviados.
