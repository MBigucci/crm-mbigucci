# Mapa · Alicerce no Base360 Vendas

**06/11/2026 · aprovado pelo Felipe no mesmo dia, com ajustes.** O que vale agora está no brief `docs/codex-alicerce-vendas.md`. Os ajustes:
- o tema automático entrou no Alicerce;
- o Alicerce cuida do menu recolhido antes da primeira pintura;
- o card de empreendimento sem estoque mostra fase, nome, local e total;
- o menu do gerente geral ganha grupos e um item só, Configurações;
- a fase 1 passa a incluir as telas do corretor, e o Vendas é publicado ao fim dela;
- o passo a fica com a sessão master.

Este arquivo é o retrato do mapa como foi apresentado.

- **Fonte:** o design system Alicerce MBigucci (artifact `52QJiDD4fLNu14iE3hce37`, versão `1794016284-4f25`).
- **Código:** a pasta `C:\Projects\CRM MBigucci - Vendas` não existe. O código do Vendas é `crm/`, neste repositório.
- **Estado:** nada foi alterado no código nem no design system.

## 1. Cada tela e as peças do Alicerce que ela usa

| Tela | Peças |
|---|---|
| Moldura de todas as telas | `MenuLateral` (recolhível), `BarraSuperior`, `MenuCelular`, `MarcaBase360`, `MenuDaConta`. O botão de recebimento de leads vira o status do módulo (`.mb-status`), no topo e na faixa do celular |
| Lista do dia (`/`) | `ResumoDePendencias` (hoje já mostra 3 grupos, o limite do Alicerce), seções com contagem, `CardLead`, `Prazo`, `Chip`, `Selo`, Registrar no `PainelLateral`. As visitas viram `Compromisso`, o aniversário vira `CardDeItem`, "Nada para hoje" vira `EstadoVazio`, e as metas viram `Meta` |
| Leads, Quadro | `BarraDeFiltros` com `CardLead`; `Quadro` |
| Ficha do lead | Segue a tela de referência `FichaDoLead`: `Aviso`, `Cartao` com dados em pares, `BotaoExterno`, `Seletor`, `DataHora`, `Abas` (Andamento · Documentos · Histórico), `Envio`, `Historico`, `MensagemPronta`, `Dialogo` |
| Novo lead | `FormularioDenso`, `Duplicado`, `BuscaComSugestoes`, `BarraDeAcoes --unica` |
| Agenda | `Compromisso`, `NavegadorDePeriodo` |
| Painel e relatório | Segue a tela de referência `PainelCentral`: `Indicador`, `Tabela`, `TabelaNoCelular`, `Funil`, `RelatorioDoNumero`, `Exportar` |
| Vendas, Metas, Ranking, Meus pontos | `TabelaCompleta`, `Meta`, `Ranking`, `Indicador` |
| Empreendimentos | `CardEmpreendimento`, `FormularioDenso`, `ImportacaoComPrevia` |
| Parceiros, Recepção, Plantão, Programa | `CardDeItem`, `Lista`, `ConfirmarNaLinha`, `BuscaComSugestoes`, `Tabela` |
| Fila, Distribuição, Configurações, Usuários, Equipes, Faixas | `Interruptor`, `ListaDeOpcoes`, `ConstrutorDeCondicoes`, `MatrizDePermissoes`, `PainelLateral` |
| Minha conta, Entrar | `MinhaConta` com `Aparencia`; `Entrar` |
| Carregando, erro de carga, sem permissão, sem internet | `Carregando`, `EstadosDePagina`, `AvisoConexao`, `Toast` |

## 2. O que não tem peça ou não encaixa

1. **Tema automático.** Hoje o app tem a opção "automático" (segue o celular), e ela é o padrão. O Alicerce só tem Papel e Grafite.
2. **Aparência salva na conta.** Para valer em todos os aparelhos precisa de uma coluna nova no banco, e o pedido é não mexer em dados. Por enquanto a escolha fica guardada só no aparelho.
3. **Menu recolhido antes da primeira pintura.** A classe do Alicerce vai num elemento montado pelo React, então a tela piscaria aberta antes de recolher. Precisa de uma regra local a partir de um atributo no `<html>`, como o app faz hoje.
4. **Sino de notificações.** O Vendas não tem central de notificações, só os avisos no celular. Sem uma fonte de dados, o sino ficaria vazio.
5. **Busca no topo.** A busca de Leads não fica no endereço da página. Ligar a busca do topo a ela seria comportamento novo.
6. **Tamanho do menu.** O gerente geral chega a cerca de 20 itens, e o Alicerce diz no máximo 9 por módulo. Dá para resolver com grupos de menu, sem mudar rotas.
7. **Estoque do empreendimento.** A barra de estoque do `CardEmpreendimento` pede contagem de unidades, que o Vendas não tem.
8. **Duas classes com o mesmo nome.** `.selo` (21 usos) e `.titulo-secao` (27 usos) existem no app e no Alicerce. As do app serão renomeadas na Fundação.

## 3. Stack atual e como o Alicerce encaixa

- **Stack:** Next 15, React 19, Tailwind 3, exportação estática, sem shadcn. O Tailwind lê cores de variáveis próprias do app.
- **Arquivos do Alicerce:**
  - ficam em `crm/src/alicerce/` sem edição, com a versão do artifact e o sha256 de cada um anotados;
  - o `bundle.js` vai para `crm/public/alicerce/`, porque precisa ser servido ao navegador;
  - o `tokens.css` é gerado com `--fontes=./fonts/` (caminho relativo, como pede o `BASE_PATH`), e o `npm test` acusa se ele ficar desatualizado em relação ao `tokens.json`.
- **Ordem de carga:** a base do Tailwind, depois `tokens.css`, `bundle.css` e por fim o CSS do app. O ajuste local fica num arquivo à parte, documentado.
- **Página:** o `<html>` sai com `data-theme="papel" data-menu="claro" data-acao="grafite"`. O `bundle.js` carrega no topo da página e chama `MB.preferencias.restaurar()` antes de desenhar a tela.
- **Transição das telas antigas:**
  - a escolha salva hoje migra uma vez: quem tinha escuro passa a Grafite;
  - o atributo antigo de tema acompanha o novo enquanto houver tela no visual antigo;
  - até a fase 2 o app fica com dois visuais misturados, então não deve ser publicado entre as fases.
- **React:**
  - componentes finos em `src/components/alicerce/`, que geram o mesmo HTML e as mesmas classes `.mb-*` dos previews;
  - painel, toast, menu do celular, popup e recolher ficam no estado do React;
  - o `MB.*` só entra em `preferencias` e `formatar`;
  - os desenhos dos ícones e do logo saem do `bundle.js` por um script que gera o arquivo.
- **Tailwind:** só para layout. Cor, raio, sombra, espaço e movimento vêm de `var(--…)`.
- **Segurança:** o `bundle.js` foi conferido. Ele só faz uma chamada de rede (a da versão nova, que não vamos ligar) e monta o link do WhatsApp. O CSS não importa nada de fora.

## 4. Ordem proposta

0. Escrever o brief `docs/codex-alicerce-vendas.md`, criar o item 48 no roadmap e atualizar `CLAUDE.md`, `docs/design-system.md` e a skill `tela-ds-mbigucci`. Hoje os três mandam usar barra de 4px, sem sombra e sem ícones, o que o Alicerce inverte.
1. Fazer os passos da fase 1, com um commit e prints em 375 e 1280, papel e grafite, a cada passo:
   - a) Fundação: tokens, fontes, bundle, atributos no `<html>` e Aparência em Minha conta;
   - b) Moldura: menu lateral, barra do topo e menu do celular;
   - c) Lista do dia;
   - d) Mensagens: `Aviso`, `Toast`, `AvisoConexao`, `Carregando`, `EstadoVazio`, `EstadosDePagina`.
2. Fase 2: ficha, tabelas, formulários, quadro e o resto.

## 5. Decisões, com a recomendação

1. **Quem implementa:** uma sessão Sonnet a partir do brief, com o Opus como advisor. A sessão master revisa cada passo, roda os testes e faz o commit.
2. **O Alicerce substitui a direção M (item 47):** sim. Ele já traz o que foi aprovado na M: cantos suaves, sombra do site, movimento leve, WhatsApp verde e o vermelho como opção.
3. **"! Quente":** usar o laranja do Alicerce. Isso desfaz o "Quente neutro" decidido em 06/11/2026, mas o laranja não é o vermelho da marca.
4. **Largura do menu:** 248px, a do Alicerce. Isso desfaz os 180px decididos em 06/11/2026.
5. **Tema automático:** fica de fora e entra como lacuna para o Alicerce. Quem tinha escuro passa a Grafite; os demais abrem no Papel.
6. **Menu do gerente geral:** separar em grupos (Rotina, Gestão, Programa, Administração), sem mudar nenhuma rota.
7. **Visitas da Lista do dia:** o `Compromisso` entra junto no passo c, para a lista não ficar meio no visual antigo.
8. **Sino e busca do topo:** ficam fora da fase 1 e entram na lista de lacunas.
