# Brief de implementação · Tema MBigucci no CRM

Felipe aprovou a proposta em 05/11/2026. **Esta etapa implementa somente o CRM.** O objetivo é que as equipes reconheçam a marca, os botões e a navegação ao alternar entre os sistemas, com acabamento profissional e os fluxos que já aprenderam. A implementação no Base360 fica para outra sessão.

## Referências e precedência

1. Leia `CLAUDE.md`, [design system](design-system.md) e `.claude/skills/tela-ds-mbigucci/SKILL.md`. Confira o estado da árvore antes de editar. Há trabalho prévio em estilos, documentação e revisão da ficha.
2. Abra o [mockup aprovado](mockups/tema-crm-aprovado.html) no navegador. Em **Telas**, escolha **CRM e Repasse**. Alterne dispositivo, tema e estado da barra. As outras opções explicam a referência visual do Base360 com dados fictícios. O HTML é uma amostra para inspeção, sem dependência de servidor ou login.
3. O [estudo comparativo](estudo-design.md) explica a origem dos tokens. As escolhas finais estão neste brief. A apresentação **Tema MBigucci para CRM e Base360** é material de reunião, dispensável para implementar.
4. **A aplicação atual e as decisões funcionais aprovadas prevalecem sobre os dados e controles ilustrativos do mockup.** Exemplo concreto: o mockup ainda desenha “Sem resposta (+1)” no card. O [brief da ficha](codex-ajustes-ficha.md) transferiu essa ação para “Como foi” e acrescentou “Detalhe o contato”. Preserve o comportamento vigente, inclusive as condições em que cada ação aparece. Confira também [Leads](leads.md) e [Revisão visual](revisao-visual.md).

## Navegação aprovada

- **Notebook e desktop.** Barra lateral escura, aberta por padrão, com ícone e rótulo por destino. Largura de **180 px aberta e 64 px recolhida**. Recolher mantém os ícones, o destaque da página atual e um nome acessível por destino. Identifique o destino também ao passar o mouse ou focar pelo teclado. O controle de recolher e expandir fica no topo da própria lateral.
- **Celular.** Mesmo padrão visual aprovado para o Repasse: logo + CRM e botão **Menu**. Ao abrir, o botão passa a **Fechar** e os destinos aparecem em uma lista escura com ícones, rótulos e indicação do item ativo. O menu começa fechado, cabe na altura disponível, permite rolar até o último destino e fecha ao navegar. Ao fechar pelo botão ou por Escape, o foco volta ao acionador.
- **Conteúdo do menu.** Consumir os itens, rótulos, URLs, ordem e condições montados em `crm/src/components/casca.tsx`. O menu reduzido do mockup é ilustrativo. Manter Minha conta, Sair, link externo do Simulador e os destinos restritos aos perfis autorizados. Conferir corretor e gerente geral. Manter o aviso offline e o comportamento das telas sem sessão.
- **Exceção à regra de ícones do CRM:** ícones de navegação aprovados na lateral e no menu mobile. Os estados dos cards continuam com glifo, palavra e cor. Ações de trabalho como Novo lead ficam nas posições atuais da tela.
- **Marca.** Usar a arte oficial seguida de “CRM”, conservando proporções e fallback textual. O cabeçalho já espera `mbigucci-logo.png` sob o basePath. Usar asset local na exportação estática. [Original usado no site](https://mbigucci.com.br/wp-content/uploads/2026/10/logo.png)

### Decisão final de Felipe · cabeçalho, atalhos e conta

- **Atalhos do desktop.** Após o logo MBigucci + CRM, à esquerda, usar um divisor discreto e três links nesta ordem: **Simulador ↗**, **Site MBigucci ↗**, **Linktree ↗**. Usar capitalização normal e o mesmo tamanho de fonte dos itens do menu lateral, em cor neutra. Abrir em nova aba. Usar o endereço oficial do Linktree validado pela equipe.
- **Conta.** No canto superior direito, mostrar o apelido cadastrado ou o primeiro nome, em caixa normal. Ao abrir, mostrar nome completo, Minha conta e, por último, Sair.
- **Cabeçalho.** Para reproduzir o efeito do site, usar o fundo `paper` do tema a 85% de opacidade, com desfoque de fundo de 12 px e borda inferior fina. O site aplica o tratamento continuamente: o efeito se torna perceptível quando o conteúdo passa atrás da barra fixa. Usar CSS, com fundo sólido de reserva. Manter o painel do menu mobile opaco. Conferir a leitura do logo e do botão quando a faixa preta passar por trás, nos dois temas.
- **Desktop.** Como refinamento ao mockup, colocar um único controle no topo da própria lateral esquerda, antes dos destinos. Manter o ícone na mesma coluna nos dois estados. Aberta: ícone de painel e rótulo “Recolher barra”. Recolhida: ícone de expandir, nome acessível “Expandir barra” e dica ao focar ou passar o mouse. Preservar o foco e o estado expandido anunciado ao alternar. Esse controle fica disponível mesmo se a lista de destinos rolar.
- **Celular.** Conservar “Menu” / “Fechar” à direita do cabeçalho. Ele atua sobre o painel de largura total que abre logo abaixo. Mostrar apenas o controle correspondente ao tamanho da tela. No menu, exibir primeiro os destinos do CRM. Ao final da navegação, colocar Simulador ↗, Site MBigucci ↗ e Linktree ↗, nessa ordem e com o mesmo tamanho de fonte dos demais itens. Logo abaixo, encerrar com o bloco da conta: nome do usuário, Minha conta e Sair. Esta decisão atualiza o cabeçalho ilustrado no mockup.

## Tema e controles

| Elemento | Especificação aprovada |
|---|---|
| Botões de ação e Menu/Fechar | **Raio de 2 px**, como no site. Primário preenchido, secundário com fundo neutro e contorno legível, sem sombra. Uma ação vermelha por grupo. Referência de altura: 36 px no desktop e alvo mínimo de 44 px no celular. Manter rótulos, ordem, condições, estados desabilitados e ações de cada tela. |
| Pares do primário, claro / escuro | Fundo `#E11119 / #FF6B70`, texto `#FFFFFF / #151619`, hover `#B90D14 / #FF9296`. Preservar foco visível de 2 px com afastamento de 2 px. |
| Botão secundário | No mockup, fundo `#EFEEEA / #303138` e borda `#817D74 / #878995` (claro / escuro). Para campos, manter o token acessível `control` do CRM. |
| Faixa de destaque | **Escura nos dois temas**, fundo `#0D0E11`, texto branco e barra vermelha de 4 px. “Contatos que precisam de atenção” mantém todos os grupos, links e contadores aplicáveis. |
| Cards e texto | Preservar estrutura, hierarquia e barras existentes. Inter no corpo, Bricolage Grotesque nos títulos e números, com algarismos tabulares onde já usados. Preservar os temas Automático/Claro/Escuro e as regras de impressão do CRM. |

## Onde implementar

Começar por `crm/src/components/cabecalho.tsx` e `casca.tsx` para a navegação, e por `crm/src/app/globals.css` e `crm/tailwind.config.ts` para os controles compartilhados. O raio de 2 px, as fontes, a paleta e a faixa escura já existem em grande parte: conferir o CSS computado antes de mudar. Usar a tabela de tokens do CRM nesta fase. O pacote compartilhado entre repositórios fica para decisão posterior.

Na Lista do dia, usar `crm/src/components/leads/lista-do-dia.tsx` e `partes.tsx` como referência funcional. Preservar os cards e a grade, a ordem de prioridades, os atalhos, a ficha, os rodapés de ação e as regras de gravação. Aplicar o tema pelos componentes compartilhados, sem reconstruir as telas a partir do HTML demonstrativo. Documentar no DS a exceção de ícones e o padrão de botões.

## Aceite e entrega

- Capturar a mesma Lista do dia antes e depois, com dados fictícios, em **1366 × 768** e **375 × 812**, nos temas claro e escuro. Comparar lateral aberta/recolhida e menu mobile fechado/aberto.
- Em 1366 px, a área principal de referência mede **1186 / 1302 px** com a barra aberta/recolhida. A Lista do dia chega a **1140 px úteis** nas duas situações (contêiner de 1180 px com 20 px de cada lado). Verificar a largura real dos cards e a visibilidade das ações, inclusive em uma largura intermediária.
- Conferir raio computado de 2 px nos botões e 44 px de alvo de toque no celular. Testar navegação por teclado, foco, item atual, nomes dos ícones recolhidos e acesso a todos os itens com o menu mais longo. A impressão do relatório deve ocupar a página sem espaço reservado à lateral.
- Percorrer Lista do dia → ficha → retorno, testar os atalhos existentes com fixtures e conferir painel, formulário, estado de erro e relatório impresso. Não inserir dados fictícios na aplicação de produção.
- Em `crm/`, executar `npm run typecheck`, `npm test` e `node scripts/contraste-temas.mjs`. Fazer build isolado ou após parar o dev do mesmo app, seguindo `CLAUDE.md`. Entregar arquivos alterados, capturas, verificações e eventuais pendências.
- **Limites:** sem mudanças em regras de negócio, banco, permissões, `discovery/`, `ref/` ou Base360. Sem login real, publicação ou commit nesta etapa.
