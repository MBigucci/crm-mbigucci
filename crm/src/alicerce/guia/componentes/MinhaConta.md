# MinhaConta

A página da pessoa, a mesma em todos os módulos (abre pelo `MenuDaConta`, no topo à direita; no celular, no fim da folha do menu). Junta o que é dela: dados, aparência, avisos, atalhos, senha e o app.

**Estrutura** (`.mb-ajustes`): no computador, o índice à esquerda (`.mb-ajustes__indice`, fixo ao rolar, com a seção visível marcada por `MB.indice.ligar`) e as seções em `Cartao` numa coluna de até 720px; abaixo de 1024px, só a coluna. No cabeçalho, nome, perfil e equipe, e “Sair”.

**Seções**
1. **Dados:** nome e WhatsApp editáveis (com `MB.mascara`); e-mail, perfil e equipe **bloqueados** (`.mb-campo--bloqueado`, com o cadeado e quem muda: “Para trocar, fale com seu gerente.”). A única ação cheia da página: **Salvar dados**, com `.mb-salvo` ao lado.
2. **Aparência:** a peça `Aparencia` (tema, menu, botão principal, movimento). Salva ao tocar, vale em todos os módulos e aparelhos.
3. **Avisos neste aparelho:** os avisos do sistema (push) são **por aparelho**; a descrição diz em qual (“Chrome no Windows”). Um `Interruptor` por tipo, “Enviar um aviso de teste” e “Desligar neste aparelho”. Se o navegador bloqueou: `Aviso --alerta` “O navegador bloqueou os avisos. Libere em Configurações do site → Notificações.”; se ainda não pediu, “Ligar avisos neste aparelho” (o pedido do navegador só aparece depois desse toque).
4. **Atalhos de teclado:** liga e desliga os de uma letra (`MB.atalhos.ativos`) e “Ver atalhos”.
5. **Senha e acesso:** “Trocar senha” abre o `PainelLateral` (senha atual, nova, requisitos de `Entrar`); “Sair dos outros aparelhos” age na hora e confirma com `Toast` (dá para entrar de novo, então não pergunta antes).
6. **Instalar o app:** “Instalar o Base360” quando o navegador permite; no iPhone, os três passos do Safari. No rodapé, a versão (“Base360 · versão 2026.11.06”) — o único lugar onde ela aparece.

**Não faça**
- Botão Salvar em seção que já salva ao tocar.
- Campo editável que a pessoa não pode mudar: bloqueie e diga quem muda.
