# Icones

A biblioteca de ícones da **interface** do Base360 (não é a identidade da marca: logo e símbolo ficam em `MarcaBase360` e nos grupos Logos e Base360). Um desenho por sentido, o mesmo em todos os módulos, para ninguém copiar SVG de outra biblioteca a cada tela.

**Desenho:** contorno no estilo Lucide, grade de 20, traço de 1,75 (vem da classe `.mb-icone`), pontas e cantos arredondados, sem preenchimento, em `currentColor` — a cor vem do texto ao lado ou do tom do aviso. Tamanhos: 16px no padrão, 18px na folha do celular, 20px em avisos, 24px nos estados de página, 28px nos estados vazios.

**Uso no código:** `MB.icone('busca')` devolve o `<svg class="mb-icone" …>` decorativo (`aria-hidden`); `MB.icone('fechar', 'Fechar')` devolve com `role="img"` e o rótulo, para quando o ícone está sozinho. `MB.icones` tem todos os desenhos. Os previews do Alicerce usam esta mesma fonte.

**Regras**
- Ícone acompanha texto; sozinho, só em botão `--icone` com `aria-label`.
- Um sentido, um ícone: “remover” é sempre a lixeira, “abre fora” é sempre a seta para fora com “↗” no texto.
- O balão de conversa é do WhatsApp e só aparece no `BotaoExterno`.
- Ícone novo entra aqui primeiro, com o nome em português e o uso.

| Nome | Grupo | Uso |
|---|---|---|
| `lista-do-dia` | Navegação | Lista do dia |
| `leads` | Navegação | Leads, clientes, equipe |
| `pessoa` | Navegação | Uma pessoa, Minha conta |
| `agenda` | Navegação | Agenda, data |
| `painel` | Navegação | Painel, gráficos |
| `metas` | Navegação | Metas |
| `ranking` | Navegação | Ranking |
| `quadro` | Navegação | Quadro por etapas |
| `modulos` | Navegação | Portal, todos os módulos |
| `empreendimento` | Navegação | Empreendimentos |
| `espelho` | Navegação | Espelho de unidades |
| `contrato` | Navegação | Contratos, propostas |
| `tabela` | Navegação | Tabelas de vendas |
| `comissao` | Navegação | Comissões, recibos |
| `financeiro` | Navegação | Financeiro, recebíveis |
| `banco` | Navegação | Banco, repasse |
| `fila` | Navegação | Fila de leads, a vez |
| `recepcao` | Navegação | Recepção do stand |
| `parceiros` | Navegação | Parceiros, parcerias |
| `pontos` | Navegação | Pontos e verba do programa |
| `plantao` | Navegação | Plantão, stand de vendas |
| `vendas` | Navegação | Vendas registradas |
| `usuarios` | Navegação | Usuários e acessos |
| `equipes` | Navegação | Equipes |
| `oportunidade` | Navegação | Oportunidades |
| `direcionador` | Navegação | Direcionador de leads (roteador: uma entrada, vários destinos) |
| `busca` | Ações | Buscar |
| `novo` | Ações | Criar, adicionar |
| `editar` | Ações | Editar, corrigir |
| `remover` | Ações | Remover da lista |
| `exportar` | Ações | Exportar, baixar |
| `enviar-arquivo` | Ações | Enviar arquivo, importar |
| `imprimir` | Ações | Imprimir |
| `link` | Ações | Copiar link |
| `compartilhar` | Ações | Compartilhar |
| `conversa` | Ações | WhatsApp (só no BotaoExterno) |
| `externo` | Ações | Abre fora do sistema ↗ |
| `filtro` | Ações | Filtros (no celular) |
| `atualizar` | Ações | Tentar de novo, atualizar |
| `alca` | Ações | Arrastar para ordenar |
| `pausar` | Ações | Pausar (modo telão) |
| `continuar` | Ações | Continuar (modo telão) |
| `tela-cheia` | Ações | Tela cheia, modo foco |
| `sair` | Ações | Sair |
| `fechar` | Ações | Fechar |
| `recolher` | Ações | Recolher o menu |
| `seta-baixo` | Direção | Abre menu, ordena |
| `seta-esquerda` | Direção | Anterior (período) |
| `seta-direita` | Direção | Próximo (período) |
| `subir` | Direção | Subir na lista, variação alta |
| `descer` | Direção | Descer na lista, variação baixa |
| `info` | Estado | Informação |
| `sucesso` | Estado | Deu certo |
| `alerta` | Estado | Atenção |
| `erro` | Estado | Erro, pede ação |
| `encerrado` | Estado | Terminou mal (cancelado, recusado) |
| `cadeado` | Estado | Bloqueado, sem permissão |
| `sem-conexao` | Estado | Sem conexão |
| `caixa-vazia` | Estado | Nada aqui (estado vazio) |
| `obra` | Estado | Em construção (página) |
| `sino` | Sistema | Notificações |
| `lua` | Sistema | Tema grafite |
| `teclado` | Sistema | Atalhos de teclado |
| `chave` | Sistema | Senha |
| `celular` | Sistema | Instalar o app, aparelho |
| `ajustes` | Sistema | Ajustes, permissões |
| `documento` | Sistema | Arquivo enviado |
