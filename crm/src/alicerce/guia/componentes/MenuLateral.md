# MenuLateral

Navegação principal de cada módulo do Base360 no computador: o lockup do módulo, os itens, os atalhos externos, o Recolher menu e, no rodapé, o logo MBigucci. **A conta não fica no menu:** ela tem um lugar só, no topo à direita (`BarraSuperior` → `MenuDaConta`).

**Estrutura:** `<nav class="mb-menu">` com:
- `.mb-menu__marca`: o lockup do módulo (`data-mb-marca="Vendas"` e `MB.marca.montar()`). O lockup ocupa a largura do topo sozinho; o botão de recolher fica no rodapé.
- itens `.mb-menu__item` (ícone + `.mb-menu__rotulo` + `.mb-menu__contagem` opcional) e títulos de grupo `.mb-menu__grupo`;
- o grupo **Atalhos**, por último entre os itens: Simulador, Site MBigucci, Linktree — links externos com `target="_blank"`, `↗` (`.mb-menu__externo`) e “(abre em outra aba)” para o leitor de tela. Saem do cabeçalho (decisão de 06/11/2026: o cabeçalho fica para + Novo, status, notificações e conta);
- `.mb-menu__rodape` com **Módulos** e **Recolher menu**. **Módulos** (`button.mb-menu__item.mb-menu__modulos`, ícone `modulos`) é como se troca de módulo, no mesmo lugar em todos: abre ao lado do menu um popup (`.mb-popup--lado`, `MB.popup.ligar`) com “Módulos do Base360” e só os módulos que a pessoa pode abrir, o atual marcado com ✓ (`aria-current="true"`); todos abrem na mesma aba, inclusive o Repasse, que está em outro endereço — é o mesmo sistema. Quem só tem um módulo não vê o item. Como o menu rola por dentro, o popup abre em posição fixa, para não ser cortado (veja **Fixo**). **Recolher menu** é `button.mb-menu__item.mb-menu__recolher`, com o desenho do ícone de menu do site: três traços, o do meio menor;
- `.mb-menu__mbigucci`: o logo MBigucci, com divisória em cima.

Vai dentro de `.mb-app` como primeira coluna (`menu-largura`, 248px). Abaixo de 768px o menu some e entra o `MenuCelular`.

**Fixo:** dentro de `.mb-app`, o menu acompanha a rolagem da página (preso no topo, da altura da tela) e rola por dentro quando tem mais itens do que cabe; o rodapé (Módulos, Recolher menu) fica sempre à vista, preso embaixo. Como o menu rola, o que sai dele não pode ser posicionado dentro dele: a dica do recolhido usa posição fixa (`MB.menuLateral.dicas(menu)`, já chamado por `ligar`; em React, chame com a ref do menu ou desenhe a dica num portal) e o popup de Módulos abre em posição fixa (`MB.popup` faz isso para `.mb-popup--lado`). O menu fica na camada dos popups (`--camada-popup`): por ser preso, ele cria uma camada própria, e sem ela os cards do conteúdo cobririam o popup e a dica. Painel lateral, diálogo e avisos continuam por cima. O item ativo é o da seção: telas internas marcam o item de onde vieram (a Ficha marca Leads; as telas de administração marcam Configurações).

**Recolher:** `.mb-app--recolhido` (ou `data-menu-recolhido="sim"` no `<html>`, que `MB.preferencias.restaurar()` põe antes da primeira pintura — use este em React, para o menu já nascer recolhido sem piscar) reduz a coluna a `menu-recolhido` (64px): só os ícones e o símbolo. O rótulo de cada item vira **dica** à direita no hover e no foco (continua no texto, então o leitor de tela lê igual). `MB.menuLateral.ligar(botao)` alterna, troca o texto do item (“Recolher menu” / “Expandir menu”, que vira a dica quando recolhido) e **lembra a escolha no aparelho** (`mb_menu_recolhido`).

**O vermelho:** o item ativo ganha um fundo mais forte e um quadradinho de 6px em `marca` — o mesmo nas duas variantes, no menu recolhido e na folha do celular.

**Menu grafite (preferência da pessoa):** com `data-menu="escuro"` no `<html>` (Minha conta → `Aparencia`) ou `.mb-menu--escuro`, o menu troca **só o fundo** para `menu-escuro`. Estrutura, tamanhos e marcador são os do menu claro.

**O consumidor fornece:** o nome do módulo, `aria-current="page"` no item da tela atual, os links, as contagens que pedem ação e os atalhos externos do módulo.

**Faça**
- Itens com nome de área, no plural: Propostas, Contratos, Leads.
- Até 9 itens de área. Grupos com título (`.mb-menu__grupo`) quando o perfil vê mais de um tipo de área, por exemplo **Rotina**, **Gestão**, **Programa** e **Administração** (só Configurações). Perfis que veem mais (gerente geral, administração): agrupe com `.mb-menu__grupo` (por exemplo Rotina, Gestão, Programa) e junte tudo o que é configuração (usuários, equipes, faixas, distribuição, catálogos) num item só, **Configurações**, que abre uma página com índice ao lado (o mesmo `.mb-ajustes` de `MinhaConta`). As rotas não mudam; muda só o que aparece no menu.

**Não faça**
- Atalhos externos no meio dos itens do módulo ou sem `↗`.
- Marcar o item ativo de outro jeito (barra lateral, sublinhado, cor no texto).
- Submenus que abrem ao passar o mouse.
