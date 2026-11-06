# Estudo visual para a diretoria · Base360 Vendas

**06/11/2026 · brief `docs/codex-visual-diretoria.md`.** A diretoria não aprovou o visual (agressivo: cantos retos, sem sombra, sem movimento). Layout e fluxos continuam aprovados. Página interativa: `docs/mockups/visual-diretoria.html` (fonte `.src.html`, tokens em `visual-diretoria.tokens.json`, gerados por `crm/scripts/gerar-visual-diretoria.mjs`).

**Sumário** · [Recomendação](#recomendação) · [As quatro direções](#as-quatro-direções) · [Decisões do Felipe sobre a M](#decisões-do-felipe-sobre-a-m) · [Custo no Vendas](#custo-no-vendas) · [O que muda para o Repasse](#o-que-muda-para-o-repasse) · [Medidas](#medidas) · [Pendências](#pendências)

## Recomendação
**M, Repasse + MBigucci.** É a base do Repasse (raios, sombra, densidade, componentes) com a marca (vermelho, Bricolage nos títulos, papel quente). Resolve o que a diretoria apontou sem perder a identidade, e é a que o Felipe escolheu. B, A e C ficam na página, só na Lista do dia, como alternativas.

## As quatro direções
| Direção | O que muda | Observação |
| --- | --- | --- |
| **B** MBigucci suavizada | Cards de 10px, sombra leve, faixa neutra quente, vermelho só na ação e no destaque | Menor mudança; ainda parece o DS de hoje |
| **A** Repasse | shadcn como está, vinho `#A50013`, fonte do sistema | No escuro o Repasse é **azul**; mostrado fiel. Cinco pares do Repasse falham no AA e foram ajustados |
| **M** Repasse + MBigucci | Ver decisões abaixo | **Recomendada**, 3 telas completas |
| **C** Clara e leve | Lateral clara, sem faixa escura, vermelho só na ação | A mais arejada; perde o foco da faixa |

## Decisões do Felipe sobre a M
Tomadas em conversa direta em 06/11/2026.
- **Faixa "Contatos que precisam de atenção":** volta escura, no grafite **quente** `#2A1B19` (escuro: `#1B1413`), cantos de 12px. Peso e foco da informação eram o que faltava na versão clara. A lateral usa o mesmo grafite. O grafite do site (`#16181C`) foi comparado e fica como variante na página.
- **Card em destaque:** barra vermelha de 4px que segue o raio, mais fundo rosado, sem anel. Cards comuns: barra neutra de 3px.
- **Lateral:** item atual em grafite mais claro com barra vermelha de 3px (um só vermelho forte por tela).
- **WhatsApp:** botão verde `#1F7A45` (escuro `#68CE92`) no card em destaque da Lista. O vermelho fica para as outras ações principais. Secundário branco com borda de controle, sem vermelho.
- **Raio dos botões:** 7px, o do logo MBigucci do site (cerca de 16% da altura). Cards de 12px.
- **Selo "! Quente":** neutro, com borda, como na revisão de conforto.
- **Tipografia:** Bricolage 700 nos títulos e nos números da faixa; texto corrido e linhas do card como hoje (Inter 14px, nome 17px).
- **Movimento:** entrada dos cards sobe 6px em 220ms, cascata de 40ms; hover e toque como estão (botão vermelho sobe 1px, card 1px, toque encolhe 3%), 140ms. Tudo respeita `prefers-reduced-motion`.
- **Opinião registrada** (06/11/2026): o DS atual ficou pesado por análise incompleta; o site já usa sombra e movimento (`docs/estudo-site-mbigucci.md`).

### Extensões minhas, a confirmar com o Felipe
Escolhas feitas ao montar a ficha, o painel e o menu, **não decididas por ele**:
- Verde também no botão WhatsApp do topo da ficha e em "Confirmar no WhatsApp" (ele escolheu só o do card em destaque da Lista).
- Foco de campo com borda vermelha e anel de 3px (um dos três ajustes do estudo do site; a pergunta continua sem resposta).
- Primeira coluna fixa nas tabelas do painel, no celular.
- Lateral do notebook no estado de hover e de foco (tela Menu); itens "Simulador, Site MBigucci, Linktree" e bloco da conta no Menu do celular.

## Custo no Vendas
P = token ou primitiva isolada · M = várias primitivas e amostra de telas · G = revisão de fluxos e regressão.

| Item da M | Custo | O que mexe |
| --- | --- | --- |
| Tokens (cores, raios, sombras, movimento) em `globals.css`, `tailwind.config` e `marca/tokens` | **M** | Conferir `conferir.mjs`; hoje a regra "sem sombra" está no DS e no CLAUDE.md |
| Faixa escura com cantos suaves | **P** | `.veredito`: raio e sombra |
| Barra do card (3px neutra, 4px vermelha) e fundo do destaque | **P** | `.card`, `.bar-brand` |
| Lateral e menu do celular (item atual com barra) | **M** | `casca.tsx`, ícones já existem |
| Botões: raio 7px, secundário branco, WhatsApp verde | **M** | `.btn-*` e todas as telas com WhatsApp (Lista, ficha, visitas, parabéns) |
| Campos: foco com borda vermelha e anel (**pendente**, extensão minha) | **P** | `.campo` |
| Tabelas do painel (raio, sombra, primeira coluna fixa) | **P** | Já têm rolagem lateral |
| Movimento: entrada, hover, folhas, tema sem piscar | **M** | Componente de entrada, `prefers-reduced-motion`, teste de movimento reduzido |
| Atualizar `docs/design-system.md`, `CLAUDE.md` e os testes de contraste | **M** | Regras "sem sombra" e "uma ação vermelha por grupo" mudam |
| **Total** | **M a G** | Sem mudar layout nem fluxo; regressão visual das telas existentes |

## O que muda para o Repasse
A M parte do Repasse, então o custo lá é de **token, não de componente**:
- `--primary` de `#A50013` para `#E11119` (escuro `#FF6B70`). **O tema escuro deixa de ser azul inteiro:** fundo `#040A11`, card `#0B1723`, lateral `#07121E`, muted e bordas também são azul-marinho e passam a grafite quente (`#151619`, `#202126`, `#1B1413`). É a maior mudança visível.
- Fontes: Bricolage nos títulos e Inter no corpo, no lugar da pilha do sistema.
- Fundo quente `#F7F6F2` no lugar de `#F8FAFC`; raio de botão de 6 para 7px; cards de 12px e sombras ficam.
- Borda de campo e secundário escurecidas para 3:1 (hoje 1,27:1).
- Sidebar: no claro já é quente (passa a `#2A1B19`); no escuro muda de azul para quente.
- Custo: **M** (era P a M por causa do escuro) (variáveis shadcn em `styles.css` e fontes; revisar o escuro e os badges de pendências). Quem valida é a Roberta.

## Medidas
Captura isolada em Chrome headless (perfil em `crm/local/`), pelos scripts `contraste-visual-diretoria.mjs` e `capturar-visual-diretoria.mjs`.
- **Contraste AA da M:** 0 falhas nas telas (a ficha, o painel e o menu usam os mesmos tokens da Lista), nos dois temas (78 pares, inclui botão WhatsApp, opção marcada, placeholder, foco da navegação). As outras três direções também fecham em 0 (na A, depois dos ajustes do Repasse).
- **Alvos:** menor alvo medido nas 12 capturas das telas novas (ficha, painel, menu × celular, notebook × claro, escuro): **44px no celular e 36px no notebook**, sem exceção.
- **Sem rolagem horizontal da página** no celular; as tabelas do painel rolam dentro do próprio quadro.
- **Movimento, na M, nas 4 telas:** modo normal `sobe 0.22s` (atraso de 40ms entre cards: o token da M chegou ao CSS); Movimento reduzido e `prefers-reduced-motion` emulado: animação `none` e transições de 0s (inclui folha do Menu e botões). Entrada e cascata agora são tokens (`enter-y`, `stagger`): 6px e 40ms na M, 8px e 50ms nas outras.

## Pendências
- **Só o Felipe vê na tela dele:** sensação do movimento, toque em celular real, fonte do sistema de A no aparelho, cores.
- **Não decidido:** aplicar na M a sombra do site (`0 18px 50px -24px`) e hover de 2 a 4px (`docs/estudo-site-mbigucci.md`).
- **Cabeçalho do desktop omitido** (desde a etapa 1): o do app tem 64px, com logo, atalhos, "✓ Recebendo", "3º na fila" e "Mari ▾"; o menu da conta abre ali. A página mostra só a lateral. Falta desenhar esse cabeçalho se a diretoria o quiser na amostra. O menu do celular termina, no app, com o logo MBigucci (o PNG não está no repositório); aqui termina na conta.
- **Ficha:** segue a estrutura do app (card do lead, Registrar interação, Visitas, e à direita Andamento, Radar e Histórico). Ficam de fora Venda, Perfil do cliente, Documentos e Descartar. O painel mostra só 4 das 9 seções do app, e a lateral do painel mostra "Início" com conta de gerente, como no app.
- Palpites do conteúdo: "Abriu o WhatsApp hoje, 9h" e "3 dias atrás" não vieram do formatador do app; os números são fictícios.
- Medidas de movimento e alvos são em captura isolada (Chrome headless). A tela real do Felipe pode diferir.
- Nada foi aplicado em `crm/src`, `globals.css` nem `marca/tokens`.
