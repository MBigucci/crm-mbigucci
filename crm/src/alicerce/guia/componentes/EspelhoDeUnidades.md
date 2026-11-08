# EspelhoDeUnidades

O prédio desenhado por torre e andar, com o estado de cada unidade: a peça que o corretor abre para saber o que pode vender, o Repasse para achar a unidade do contrato e a gerência para ver o estoque. Entra pelo `CardEmpreendimento` (a lista de empreendimentos com as contagens) ou pela unidade de um contrato.

**Estrutura** (`.mb-espelho`)
- `Abas` por torre, com o total; com uma torre só, sem abas.
- `.mb-espelho__resumo`: “14 disponíveis de 40 · Torre A” e o `DadosAoVivo` (o espelho muda enquanto a pessoa olha).
- O filtro de estados: `Seletor --multipla --p`, cada pílula com a amostra do estado (`.mb-amostra`), a palavra e a contagem. Marcar **apaga** as outras unidades (`.mb-espelho__unidade--apagada`), não esconde: o desenho do prédio fica igual.
- `.mb-espelho__quadro` com `.mb-espelho__grade` (`--mb-finais` = unidades por andar): na primeira coluna, o andar (fixa ao rolar de lado); no topo, os finais; **o andar mais alto em cima**, como o prédio.
- Cada unidade é um botão `.mb-espelho__unidade--<estado>`: o número em Geist Mono e **o estado escrito** embaixo. A cor reforça, nunca decide:

| Estado | Fundo e texto | Por quê |
|---|---|---|
| Disponível | `sucesso-fundo` / `sucesso-texto` | o que se pode vender (verde, como no Repasse e no Dashboard) |
| Reservada | `info-fundo` / `info-texto` | segura por um prazo, inclusive com proposta em andamento (azul) |
| Alugada · à venda | `alerta-fundo` / `alerta-texto` | tem inquilino, mas está à venda (âmbar) |
| Vendida | `espelho-vendida-fundo` / `espelho-vendida-texto` | rosa, como nas referências — e nunca o vermelho de erro ou de marca |
| Fora de venda | hachura em `linha` | permuta, decorado, diretoria (o “Outros” do Repasse, em cinza) |

As cores seguem o espelho do Repasse e o do Dashboard (decisão do Felipe, 06/11/2026), para quem já usa os dois ler igual. Não há estado “Em proposta”: a unidade com proposta em andamento fica Reservada, como nas referências.

**Tocar numa unidade** marca com o contorno em tinta e abre o `PainelLateral` da unidade (`data-mb-painel` no espelho; `MB.painel.abrir(caixa, unidade)` devolve o foco para ela): `Selo` do estado, tipologia, área, vagas, posição, o preço da tabela vigente e a última mudança. As ações dependem do estado e do perfil: disponível ou alugada à venda → **Fazer proposta** e **Simulador ↗** (na alugada, o painel diz até quando vai o contrato de locação); reservada por você → Fazer proposta; de outro corretor → só leitura, com até quando vale a reserva.

**Celular:** a grade rola de lado dentro do quadro com o andar fixo; cada unidade tem 44px de altura. O painel vira a folha que sobe.

**Não faça**
- Unidade só com cor, sem a palavra (verde e rosa são o par que quem tem daltonismo vermelho-verde confunde; a palavra resolve).
- Vermelho de erro ou de marca para vendida: vendida é o rosa `espelho-vendida`.
- Esconder as unidades filtradas: o corretor perde a posição no prédio.
