# ListaDoDia

Tela de referência do corretor no Base360 Vendas, desenhada para o celular (375px) e conferida no computador: a rotina inteira numa tela só, do que pede ação agora ao que pode esperar.

**De cima para baixo:**
1. `.mb-app` com `data-acao="marca"` (quem escolheu o botão principal vermelho em `Aparencia`; num sistema de verdade o atributo vai no `<html>`, com `MB.preferencias.restaurar()`). No computador, `MenuLateral` (com recolher e o grupo Atalhos) e `BarraSuperior` (título, busca, status com cor “✓ Recebendo · 3º na fila”, “+ Novo lead” na cor de destaque, notificações e conta).
2. No celular, o `MenuCelular`: o lockup à esquerda; à direita o **+** (Novo lead, sempre na cor de destaque) e o ícone de menu do site, na ponta; embaixo, a faixa de status com cor e “Opções”. Não há mais rodapé fixo: o + do cabeçalho cria, e o rodapé fica só para telas de preenchimento.
3. A data por extenso.
4. `ResumoDePendencias` com as três contagens, cada uma levando ao seu grupo, e a linha das visitas de hoje.
5. A rotina numa lista só, sem abas: seções com título e contagem (“Atrasados · 2”), nesta ordem — aguardando primeiro contato, detalhe o contato, atrasados, visitas de hoje.
6. Cada lead é um `CardDeItem` (receita `CardLead`): o card inteiro abre a ficha; o `Prazo` com sinal e cor na primeira linha; `Chip` de temperatura à direita (com “Sem temperatura” quando vazia); `Selo` da etapa; e a faixa (o mesmo rodapé do `Cartao`) com **Registrar · WhatsApp →** (Agendar visita, Compartilhar e Descartar lead ficam na ficha). No grupo “Detalhe o contato”, a principal vira “Detalhar”, à direita.
7. **Registrar** abre o `PainelLateral` (no celular, a folha que sobe), com Como foi, O que aconteceu e Próximo contato. A lista fica parada atrás.
8. A visita de hoje é um `Compromisso`; **Remarcar** abre dentro do próprio card (dois campos).
9. O rodapé da lista (“2 leads têm contato marcado para os próximos dias. Ver todos”) e a `Meta`.

**Os vermelhos da tela** são o **+ Novo lead** do cabeçalho (sempre na cor de destaque) e o botão principal dentro do painel e da edição no card, mais o quadradinho do menu e o logo. Prazos estourados são texto em `erro-texto` com “!”, não blocos.

**Atualização:** a lista recalcula os prazos a cada minuto sem mexer na rolagem; o que foi registrado sai do grupo com o `Toast` de sucesso e, quando volta atrás, com Desfazer.
