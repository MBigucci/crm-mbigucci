# Recolhivel

Uma seção que abre e fecha, para o que é **opcional ou longo**: o perfil do cliente no cadastro, as vendas canceladas, as opções avançadas, o valor por corretor nas metas. Uma peça só no lugar das cinco versões de `<details>` e dos botões “Ver as canceladas” feitos à mão.

**Estrutura:** `<details class="mb-recolhivel">` com `<summary>` (título + `.mb-recolhivel__contagem`: “· opcional”, “· 3”) e `.mb-recolhivel__corpo`. O chevron gira 90° ao abrir. Dentro de um `Cartao`, seções seguidas ganham um fio entre elas. É nativo: teclado, leitor de tela e `Esc` funcionam sem JavaScript.

**Ver todos:** para listas longas, mostre os primeiros itens e um botão `--discreto --p` com `aria-expanded`: “Ver todos os 12” / “Ver menos”. O número diz quanto falta.

**O consumidor fornece:** o título, a contagem e se começa aberta (aberta quando já tem dado preenchido).

**Faça**
- Fechado por padrão o que é opcional; aberto o que já tem conteúdo.
- Contagem no título quando a seção esconde uma lista.

**Não faça**
- Esconder campo obrigatório numa seção fechada.
- Recolhível dentro de recolhível.
- Usar no lugar de `Abas` para trocar entre visões do mesmo registro.
