# Empreendimentos: dados coletados para o catálogo e o Radar de Match

> Coleta feita em 29/10/2026 para os itens 13 (empreendimentos e tipologias) e 14 (Radar de Match) de `docs/referencia-crm-bruna.md`. Os dados estão em `docs/empreendimentos-dados.json`. Nada em `crm/` foi alterado: a lista fixa de `crm/src/lib/empreendimentos.ts` continua valendo até a tabela existir.

## Sumário
1. Resumo
2. Fontes e método
3. Os 42 empreendimentos
4. Cruzamento com a lista atual e o tabelão
5. Lacunas
6. Dúvidas para o Felipe
7. Proposta de esquema: `empreendimentos` e `tipologias`
8. Como o Radar de Match usa esses dados
9. Da Bruna: o que veio, o que foi adaptado e o que ficou de fora

## 1. Resumo

- **42 empreendimentos** no JSON: 38 com página no site oficial e 4 só no Linktree (Classic, UP, Cortina D'Ampezzo e Village da Serra).
- **Por status:** 2 em breve lançamento (Elleva, Dom), 2 em lançamento (Marco Zero One, Mundi), 6 em obras, 31 prontos e 1 sem status (Village da Serra, um lote).
- **91 tipologias**, quase todas tiradas das "Plantas disponíveis" do site.
- **Novos em relação à lista atual:** Marco Zero One, Elleva, Dom, Classic, UP e a Mansão Jardim Acapulco.
- **Fora do ar:** Royal Palace e Terra Nostra Parma estão na lista atual e no tabelão, mas não aparecem no Linktree nem no site.
- **Maior lacuna:** preço por tipologia. O site só publica o "a partir de" do empreendimento, e as tabelas por unidade são PDFs no Drive, que não foram abertos.

## 2. Fontes e método

| Fonte | O que traz | Como foi lida |
| --- | --- | --- |
| Linktree `linktr.ee/construtoraMBigucci` | Índice por cidade e bairro, com o status entre parênteses ("Pronto", "Construção", "breve lançamento"). Cada empreendimento tem um Linktree próprio com apresentação, ficha técnica, memorial, fotos, vídeos e tour virtual (quase tudo no Google Drive). | As 56 páginas do Linktree, todas visitadas (índice, cidades, empreendimentos, tabelas, documentos, locação, marketing, institucional, galpões, imóveis comerciais e plantas do Easy Jaçanã). |
| Site oficial `mbigucci.com.br/empreendimentos/` | Uma página por empreendimento com o bloco "Detalhes do imóvel": área, dormitórios, suítes, vagas, fase da obra, previsão de entrega, "A partir de", plantas, lazer, endereço e mapa. | As 37 páginas, todas abertas. Cada uma diz "Informações atualizadas em …" (entre 8 e 29/10/2026). O site não está no Linktree, mas é a fonte em texto mais completa. |
| Fichas técnicas (PDF no Drive) | Endereço, número de unidades, tipologias, entrega. | Abertas só no visualizador, sem baixar, para os que não têm página no site: Classic e UP. |
| Tabelas de preço (PDF no Drive) | Preço por unidade, de outubro e de novembro. | **Não abertas.** Os links estão no JSON (`tabela_outubro`, `tabela_novembro`). |

Regras seguidas:
- Campo vazio (`null`) quer dizer "não publicado". Nada foi deduzido.
- Cada empreendimento tem `fonte` (as URLs visitadas), `fontes` (de onde veio cada grupo de campos) e `avisos` (divergências e erros encontrados).
- O link do Google Maps é montado com o mesmo endereço do mapa incorporado na página do site.
- Ficaram de fora do catálogo, por não serem lançamentos à venda: locação (galpões, terrenos e imóveis comerciais), terrenos à venda, lotes no Guarujá, documentos e institucional.

## 3. Os 42 empreendimentos

Preço "a partir de" e entrega como estão no site em 29/10/2026.

| Nome oficial | Status | Bairro, cidade | Dorms | Área | A partir de | Entrega | Fonte |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marco Zero One | Lançamento | Jardim do Mar, São Bernardo do Campo | 3 e 4 | 152–357 m² | — | — | site + Linktree |
| Mundi MBigucci | Lançamento | Pauliceia, São Bernardo do Campo | 2 e 3 | 43–53 m² | R$ 344.000 | — | site + Linktree |
| Elleva MBigucci | Breve lançamento | Centro, São Bernardo do Campo | 2 | 67 m² | — | — | site + Linktree |
| Dom MBigucci | Breve lançamento | Campestre, Santo André | 2 | 70 m² | — | — | site + Linktree |
| Modena MBigucci | Em obras | Jardim Diogo, Guarulhos | 2 | 44 m² | R$ 343.700 | Mai/2027 | site + Linktree |
| MBigucci Joy | Em obras | Vila Prudente, São Paulo | 2 | 35–40 m² | R$ 318.400 | Out/2028 | site + Linktree |
| Easy Jaçanã | Em obras | Jaçanã, São Paulo | 1 e 2 | 25–45 m² | R$ 239.100 | 36 meses após a assinatura com a CEF | site + Linktree |
| Infinite São Caetano | Em obras | —, São Caetano do Sul | 3 | 81 m² | R$ 1.086.700 | Abr/2028 | site + Linktree |
| Palatium Ipiranga | Em obras | Ipiranga, São Paulo | 2 a 3 | 56–85 m² | R$ 729.600 | Mar/2027 | site + Linktree |
| Terrazzo MBigucci | Em obras | Vila Carrão, São Paulo | 2 a 3 | 66–82 m² | R$ 857.400 | Mar/2028 | site + Linktree |
| Alameda MBigucci | Pronto | Campestre, Santo André | 2 | 56–61 m² | ! erro no site | Entregue | site + Linktree |
| Exuberance MBigucci | Pronto | Rudge Ramos, São Bernardo do Campo | 3 | 70 m² | R$ 615.000 | Entregue | site + Linktree |
| Imperium MBigucci | Pronto | Ipiranga, São Paulo | 3 | 103 m² | R$ 1.261.500 | Entregue | site + Linktree |
| Life MBigucci | Pronto | Centro, São Bernardo do Campo | Studio | 20–48 m² | R$ 368.900 | Entregue | site + Linktree |
| New Park MBigucci | Pronto | Aclimação, São Paulo | 1 | 35–99 m² | R$ 637.500 | Entregue | site + Linktree |
| Sonata MBigucci | Pronto | Santa Teresinha, Santo André | 1 e 2 | 37–50 m² | ! erro no site | Entregue | site + Linktree |
| Station MBigucci | Pronto | Jabaquara, São Paulo | 1 ou 2 | 37–48 m² | R$ 417.400 | Entregue | site + Linktree |
| Unique MBigucci | Pronto | Rudge Ramos, São Bernardo do Campo | Loft e 2 | 36–54 m² | R$ 457.000 | Entregue | site + Linktree |
| Vert MBigucci | Pronto | Aclimação, São Paulo | 2 | 56–63 m² | R$ 711.100 | Entregue | site + Linktree |
| Essenza MBigucci | Pronto | Vila Gonçalves, São Bernardo do Campo | 2 | 58 m² | R$ 530.000 | Entregue | site + Linktree |
| Impactus MBigucci | Pronto | Parque Jaçatuba, Santo André | 2 e 3 | 50–61 m² | R$ 420.000 | Entregue | site + Linktree |
| America MBigucci | Pronto | Cooperativa, São Bernardo do Campo | 2 | 43–44 m² | R$ 299.000 | Entregue | site + Linktree |
| Stylo MBigucci | Pronto | Rudge Ramos, São Bernardo do Campo | 2 a 3 | 71–82 m² | R$ 776.700 | Entregue | site + Linktree |
| Alvorada MBigucci | Pronto | Itaquera, São Paulo | 2 | 37–39 m² | R$ 270.000 | Entregue | site + Linktree |
| Domani MBigucci | Pronto | Nova Petrópolis, São Bernardo do Campo | 2 suítes | 67 m² | R$ 659.400 | Entregue | site + Linktree |
| Maximus MBigucci | Pronto | Jardim das Américas, São Bernardo do Campo | 3 suítes | 132 m² | R$ 1.200.000 | Entregue | site + Linktree |
| Wynn Tower MBigucci | Pronto | Rudge Ramos, São Bernardo do Campo | sala comercial | 32–36 m² | R$ 365.600 | Entregue | site + Linktree |
| First Class MBigucci | Pronto | Morumbi, São Paulo | 2 suítes | 64 m² | R$ 571.900 | Entregue | site + Linktree |
| Olimpic MBigucci | Pronto | Jardim Santa Cruz, São Paulo | 2 e 3 | 56–71 m² | R$ 350.000 | Entregue | site + Linktree |
| Wish Residence MBigucci | Pronto | Ipiranga, São Paulo | 2 | 68 m² | R$ 760.000 | Entregue | site + Linktree |
| Piemonte MBigucci | Pronto | Água Funda, São Paulo | 2 e 3 | 43–58 m² | R$ 522.100 | Entregue | site + Linktree |
| Marco Zero Mix Residence | Pronto | Jardim do Mar, São Bernardo do Campo | Loft | 36–73 m² (Mix todo) | R$ 369.700 (Mix todo) | Entregue | site + Linktree |
| Marco Zero Mix Work | Pronto | Jardim do Mar, São Bernardo do Campo | sala comercial | 36–73 m² (Mix todo) | R$ 369.700 (Mix todo) | Entregue | site + Linktree |
| Marco Zero Tower | Pronto | Jardim do Mar, São Bernardo do Campo | sala comercial | 46–77 m² | R$ 435.000 | Entregue | site + Linktree |
| Marco Zero Premier & Prime | Pronto | Jardim do Mar, São Bernardo do Campo | 2 e 3 | 65–83 m² | R$ 680.000 | — | site + Linktree |
| Marco Zero Home | Pronto | Jardim do Mar, São Bernardo do Campo | Loft | 42–50 m² | R$ 420.000 | Entregue | site + Linktree |
| Easy São Vicente | Pronto | Centro, São Vicente | 2 | 38–53 m² | R$ 276.700 | Entregue | site + Linktree |
| Mansão Guarujá – Jardim Acapulco II | Pronto | Jardim Acapulco, Guarujá | casa, 7 dorms | 628 m² | a combinar | Entregue | só site |
| Classic MBigucci | Pronto | Rudge Ramos, São Bernardo do Campo | 3 | 77–80 m² | — | Entregue (2014) | Linktree + ficha |
| UP MBigucci | Pronto | Centro, São Bernardo do Campo | 2 e 3 | — | — | Entregue (2014) | Linktree + ficha |
| Cortina D'Ampezzo | Pronto | Jardim da Saúde, São Paulo | — | — | — | — | Linktree (só fotos) |
| Village da Serra | — | Tremembé | lote | — | — | — | Linktree (só tabela) |

## 4. Cruzamento com a lista atual e o tabelão

Comparado com `crm/src/lib/empreendimentos.ts` (37 nomes) e `ref/CRM Bruna/importacoes/mbigucci-tabelao-2026-09-24.json` (48 itens, por torre).

### Nos dois (lista atual e Linktree ou site)
Marco Zero Prime, Marco Zero Premier, Marco Zero Home, Marco Zero Tower, Marco Zero Mix, Wynn Tower, Unique, Stylo, Exuberance, Maximus, Domani, Essenza, Life, Mundi, América, Sonata, Alameda, Impactus, Infinite, Olimpic, Wish, Cortina D'Ampezzo, Imperium, New Park, Vert, First Class, Piemonte, Station, Alvorada, Terra Nostra (como Modena), Palatium, Terrazzo, MBigucci Joy, Easy São Vicente, Easy Jaçanã e Village da Serra. São 35 dos 37.

### Só no Linktree ou no site (novos)
| Empreendimento | Onde aparece | Observação |
| --- | --- | --- |
| Marco Zero One | site (landing própria) e Linktree | Pré-lançamento, 104 apartamentos de 152 a 357 m². Está nas tabelas de outubro e novembro. |
| Elleva MBigucci | site e Linktree | Breve lançamento, Centro de SBC. |
| Dom MBigucci | site e Linktree | Breve lançamento, Campestre, Santo André. |
| Classic MBigucci | só Linktree | Pronto desde 2014. Fora do tabelão. |
| UP MBigucci | só Linktree | Pronto desde 2014. Linktree com "Fotos Apto 14", talvez uma unidade só. |
| Mansão Jardim Acapulco II | só site | O tabelão tem duas casas no Jardim Acapulco (Guarujá). Fora da lista atual. |
| Marco Zero Mix Work | site e Linktree | Já estava na lista como chave do Marco Zero Mix. Aqui vira item próprio por ser comercial. |

### Só na lista atual (encerrados ou fora do ar?)
| Nome | No tabelão de set/2026 | Situação em 29/10/2026 |
| --- | --- | --- |
| Royal Palace | Pronto, Vila Monumento (SP), 3 dorms, 71,65 m², R$ 773.700 | Fora do Linktree e do site. |
| Terra Nostra Parma | Pronto, Guarulhos, 2 dorms, 43,77 m², R$ 363.000 | Fora do Linktree e do site. Só a fase Modena aparece. |
| Exuberance Bellatrix | Torre do Exuberance | O site não cita torres. |
| Olimpic Athenas, Rio de Janeiro e Londres; Sonata Beethoven e Mozart; América California e Flórida; First Class Premium e Vip; Mundi Thiago, Lucca e Vitor | Torres do mesmo condomínio | O site trata cada condomínio como um item só. O Mundi tem uma 4ª torre, Marcela, que não está na lista. |

### Nomes que divergem
| Lista atual | Nome no site | Nome no Linktree |
| --- | --- | --- |
| Terra Nostra | Modena MBigucci | MODENA, "Modena (Construção)" |
| Infinite | Infinite São Caetano | Infinite MBigucci |
| Palatium | Palatium Ipiranga | PALATIUM MBIGUCCI |
| Wish | Wish Residence MBigucci | @WishMBigucci |
| América | America MBigucci (sem acento) | America MBigucci |
| New Park | New Park MBigucci | New.Park |
| MBigucci Joy | MBigucci Joy | Joy Mbigucci |
| Marco Zero Prime e Marco Zero Premier | Marco Zero Premier & Prime (uma página) | Marco Zero Prime / Premier (uma página) |
| Marco Zero Mix | Marco Zero Mix (uma página) | Marco Zero Mix Residence e Marco Zero Mix Work |
| Easy Jaçanã | Easy Jaçanã | "Easy Jaçana" no índice |

### Dados que divergem entre site e tabelão
| Empreendimento | Site (29/10/2026) | Tabelão (set/2026) |
| --- | --- | --- |
| Terrazzo | Rua Biguaçu, 91; entrega Mar/2028 | nº 92; entrega Jun/2026 |
| Easy Jaçanã | Rua José Buono, 178; entrega 36 meses após a CEF | nº 180/184; Mar/2029 |
| Mundi | Entrega "Consulte" | Lucca e Vitor em Dez/2029; Thiago pronto |
| Life | Rua Príncipe Humberto, 168 | nº 230 |
| Infinite | R. Alegre, 968 | nº 988; bairro Santa Paula (o Linktree diz Barcelona) |
| Marco Zero Mix | Av. Kennedy, 1200 (o mesmo número do Marco Zero One) | Av. Kennedy, 1230 |
| Marco Zero Prime | Jardim do Mar | Rudge Ramos |
| Domani | Rua Princesa Maria Amélia, 500 | Rua Princesa Amélia, 500 |
| Olimpic | Jardim Santa Cruz | Jardim Santa Cruz (o Linktree diz Jd. Caraguatá) |
| Maximus | Jardim das Américas | Jardim das Américas (o Linktree põe em Centro) |

## 5. Lacunas

### Por campo (dos 42)
| Campo | Faltam | Quais |
| --- | --- | --- |
| Preço por tipologia | 91 de 91 | Todas. Está só nas tabelas em PDF. |
| Book para o cliente | 39 | Só Marco Zero One, Mundi e Easy Jaçanã têm "Book". Os outros têm "Apresentação", que serve para o mesmo fim. |
| Previsão de entrega (dos 10 em lançamento ou obras) | 5 | Marco Zero One, Mundi, Elleva, Dom (o site diz "Consulte") e Easy Jaçanã (só o texto da CEF). |
| Tour virtual | 21 | Normal: nem todos têm decorado virtual. |
| Preço "a partir de" | 10 | Marco Zero One, Elleva, Dom e Jardim Acapulco ("A combinar"), Alameda e Sonata (formato errado no site: "R$ 570.00,00" e "R$ 365.00,00"), Classic, UP, Cortina e Village da Serra. |
| Apresentação | 9 | Marco Zero One, Mundi e Easy Jaçanã (têm book), Elleva, Dom, First Class, Jardim Acapulco, UP, Cortina e Village da Serra. |
| Memorial descritivo | 8 | Elleva, Dom, Marco Zero Premier & Prime, Marco Zero Home, Jardim Acapulco, UP, Cortina e Village da Serra. |
| Página oficial e Google Maps | 4 | Classic, UP, Cortina e Village da Serra. |
| Tipologias | 3 | Dom (o site não publica planta), Cortina e Village da Serra. |
| Endereço | 2 | Cortina e Village da Serra (só no tabelão). |
| Bairro | 2 | Infinite (divergente) e Village da Serra. |
| Condomínio (taxa) | 42 | O site não publica. Só o tabelão traz. |

Nas 91 tipologias, 45 não dizem quantas suítes, 24 não dizem vagas e 2 não têm área (UP).

### Erros no site que vale avisar ao marketing
- Preços com formato errado: Alameda ("R$ 570.00,00") e Sonata ("R$ 365.00,00").
- Marco Zero Tower: o campo de área mostra o bairro.
- Marco Zero Premier & Prime: o campo de entrega mostra o bairro.
- Olimpic, Wish e Marco Zero Tower têm a mesma lista de lazer, palavra por palavra. Parece texto de modelo.
- Sonata está na categoria São Bernardo do Campo, mas fica em Santo André.
- Piemonte e New Park: a ficha não bate com as plantas publicadas.
- Imperium: "103m³" na planta.

## 6. Dúvidas para o Felipe

1. **Royal Palace e Terra Nostra Parma** saíram do Linktree e do site. Estão vendidos ou encerrados? Saem da lista do Cadastro Mágico?
2. **Classic, UP e Cortina D'Ampezzo** só aparecem no Linktree, sem preço. Ainda têm unidade à venda? Entram no catálogo?
3. **Casas, lotes e salas comerciais** (Jardim Acapulco, Village da Serra, Wynn Tower, Marco Zero Tower e Mix Work) entram no catálogo e no Radar de Match, ou o catálogo é só de apartamentos?
4. **Torres e fases:** um item por condomínio, com a torre na tipologia (proposta da seção 7), ou um item por torre, como faz a Bruna? Afeta Mundi, Olimpic, Sonata, América, First Class, Marco Zero Mix e Marco Zero Premier & Prime.
5. **Preço oficial:** o "a partir de" do site basta para o Radar, ou o preço deve vir da tabela mensal (PDF)? Quem atualiza todo mês? Hoje há duas tabelas: outubro ("mês de aniversário") e novembro ("promocional").
6. **Endereços divergentes** entre site e tabelão (seção 4): qual vale? Life, Terrazzo, Infinite, Easy Jaçanã, Marco Zero Mix e Domani.
7. **Entrega do Terrazzo:** Mar/2028 (site) ou Jun/2026 (tabelão)? E o Mundi 2ª fase: Dez/2029?
8. **Link para o cliente:** nas mensagens prontas, usar a página do site (`mbigucci.com.br/<nome>/`) ou a apresentação no Drive? O Linktree também tem material interno (ex.: "Book Técnico Corretores" do Marco Zero One), que não deve ir para o cliente.
9. **Marco Zero One, Elleva e Dom:** sem preço. Os leads desses ficam em "aguardando lançamento" até a tabela sair?
10. **Erros do site** (seção 5): quer que eu escreva a lista para o marketing?

## 7. Proposta de esquema: `empreendimentos` e `tipologias`

Para a próxima sessão. Base: o formato de importação da Bruna (`crm-imoveis/1`, em `ref/CRM Bruna/src/lib/import-schema.ts`), adaptado para uma construtora que vende só o que é dela.

### `empreendimentos`
| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | |
| `slug` | text único | O `id` do JSON (`mundi`, `marco-zero-one`). |
| `nome` | text | Nome oficial do site. |
| `variacoes` | text[] | Chaves do Cadastro Mágico (hoje `chaves` em `empreendimentos.ts`). |
| `pede_contexto` | boolean | Nome que é palavra comum ("Life", "Unique"). Hoje em `empreendimentos.ts`. |
| `marca` | text | `MBigucci` ou `Easy MBigucci`. |
| `tipo` | text check | `residencial`, `comercial`, `casa`, `lote`. |
| `status` | text check | `breve_lancamento`, `lancamento`, `em_obras`, `pronto`. |
| `ativo` | boolean | Sai das listas sem apagar. Leads e vendas antigos continuam apontando. |
| `endereco`, `bairro`, `cidade`, `uf` | text | `bairro` e `cidade` alimentam a região do Radar. |
| `entrega_prevista` | date | Primeiro dia do mês. Null quando pronto ou não publicado. |
| `entrega_texto` | text | Para casos como "36 meses após a assinatura com a CEF". |
| `preco_a_partir_de` | numeric(14,2) | O "a partir de" do empreendimento. |
| `preco_conferido_em` | date | Quando o preço foi conferido. O Radar avisa se estiver velho. |
| `chamada` | text | Frase curta do site. |
| `lazer` | text[] | |
| `link_pagina`, `link_apresentacao`, `link_book`, `link_ficha`, `link_memorial`, `link_tour`, `link_fotos`, `link_maps`, `link_tabela` | text | Os que vão para o cliente: página, apresentação, book, tour e maps. Os outros são internos. |
| `observacao` | text | |
| `atualizado_em`, `atualizado_por` | | |

### `tipologias`
| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | |
| `empreendimento_id` | uuid → `empreendimentos` | |
| `rotulo` | text | Como está no material ("Final 3 · 152 m² · 3 suítes"). |
| `torre` | text | Null quando não há. Resolve Mundi, Olimpic, Sonata etc. sem multiplicar empreendimentos. |
| `tipo` | text check | `apartamento`, `studio`, `loft`, `cobertura`, `garden`, `sala_comercial`, `casa`, `lote`. |
| `dormitorios`, `suites` | smallint | Null em studio, loft, sala e lote. A Bruna usa studio = 1. Aqui o tipo diz o que é, e o Radar trata studio e loft como 1. |
| `vagas_min`, `vagas_max` | smallint | O site publica "1 ou 2". |
| `area_m2` | numeric(8,2) | Área privativa. |
| `deposito` | boolean | |
| `preco_a_partir_de` | numeric(14,2) | Da tabela mensal, quando houver. Senão, o Radar usa o do empreendimento. |
| `preco_nota` | text | "unidade 84 · tabela R$ 515.000", como o `priceNote` da Bruna. |
| `esgotada` | boolean | Ex.: coberturas do Marco Zero One. |
| `ordem` | smallint | |

### Acesso (RLS)
- Leitura: qualquer usuário ativo.
- Cadastro e edição: permissão nova `empreendimentos.editar` na tabela `permissions`, dada ao gerente geral e, na proposta de `docs/acessos-perfis.md`, ao operacional. Sem `if (role === ...)`.
- Sem exclusão: `ativo = false`.

### Ligação com o que já existe
- `leads.empreendimento`, `vendas` e `visitas` guardam o nome em texto. Proposta: coluna nova `empreendimento_id` (nula), preenchida pelo nome ou pelas variações. O texto fica para o histórico.
- O Cadastro Mágico passa a ler nomes e variações da tabela. `empreendimentos.ts` vira só o fallback offline.
- As mensagens prontas ganham `{endereco}` e `{apresentacao}` (já previstas em `docs/referencia-crm-bruna.md`, item 13).

### Carga inicial
O `docs/empreendimentos-dados.json` vira a carga, com os campos com o mesmo nome. Correspondência com o formato da Bruna:

| Bruna (`crm-imoveis/1`) | Aqui |
| --- | --- |
| `name`, `condominium` | `nome`; torre vai para `tipologias.torre` |
| `type` (`planta`, `pronto`, `usado`) | `status` com 4 valores. Não há usado. |
| `neighborhood`, `city`, `address` | `bairro`, `cidade`, `endereco` |
| `deliveryDate` ("Dez/2028") | `entrega_prevista` (data) + `entrega_texto` |
| `condoFee` | Não entra: o site não publica. Pode vir depois. |
| `highlights` | `chamada` + `lazer` |
| `photosUrl` | `link_fotos`; e mais oito links |
| `units[]` (`bedrooms`, `suites`, `parking`, `area`, `price`, `priceNote`) | `tipologias` (`dormitorios`, `suites`, `vagas_min`/`vagas_max`, `area_m2`, `preco_a_partir_de`, `preco_nota`) |
| `warnings` | `avisos`, por empreendimento |

## 8. Como o Radar de Match usa esses dados

O lead já guarda `valor`, `dormitorios`, `regiao` e `finalidade` (`crm/supabase/schema.sql`, tabela `leads`). Proposta de pesos, adaptada da Bruna (`ref/CRM Bruna/src/lib/match.ts`):

| Critério | Peso na Bruna | Proposta | Dado usado |
| --- | --- | --- | --- |
| Orçamento | 35, com 10% de tolerância | 40, com 10% | `leads.valor` × preço da tipologia ou "a partir de" |
| Região | 20 | 25 | `leads.regiao` × `bairro` e `cidade` |
| Dormitórios | 15 | 20 | `leads.dormitorios` × `tipologias.dormitorios` (studio e loft = 1) |
| Tipo | 20 | 10 | Residencial × comercial. Finalidade "investir" aceita studio, loft e sala. |
| Vagas e área | 5 + 5 | 5 | O lead ainda não guarda vagas nem área. |

- Mostra a partir de 50%, com motivos ✓ e ✕, como na Bruna.
- Esconde empreendimento inativo e tipologia esgotada.
- Breve lançamento entra só como "aguardando lançamento", sem preço.

## 9. Da Bruna: o que veio, o que foi adaptado e o que ficou de fora

Lido em 29/10/2026: `ref/CRM Bruna/src/lib/import-schema.ts`, `src/lib/import-types.ts`, `public/importar-imoveis.md`, `importacoes/mbigucci-tabelao-2026-09-24.json` e a seção 9 de `docs/referencia-crm-bruna.md`.

| Recurso da Bruna | Como ficou | Por quê |
| --- | --- | --- |
| **Trazido como está** | | |
| Um empreendimento com várias tipologias; tipologia = combinação de dormitórios e metragem | Igual | Mesmo modelo para o catálogo e o Radar |
| "Use só o que está no material; o que faltar fica `null` e vai para os avisos" | Igual, com `avisos` por empreendimento | Premissa da coleta |
| Preço como número, área privativa em m², entrega "Mmm/AAAA" | Igual no JSON; no banco, entrega vira data | |
| Ler o Linktree e abrir books, tabelas, fichas e páginas | Igual, mais o site oficial, que tem os dados em texto | |
| **Adaptado** | | |
| `condominium` + um item por torre | Um item por condomínio, com `torre` na tipologia | A MBigucci fala do condomínio; as torres viram detalhe (dúvida 4) |
| `type`: planta, pronto, usado | `status`: breve lançamento, lançamento, em obras, pronto | Não há usado; o "aguardando lançamento" precisa separar breve lançamento |
| `photosUrl` (um link) | Nove links, separando o que vai para o cliente do que é interno | O Linktree da MBigucci tem material interno |
| `highlights` em 200 caracteres | `chamada` + lista de `lazer` | O site já separa |
| Studio = 1 dormitório | `tipo` = studio e dormitórios nulo; o Radar conta 1 | Não inventar dado na coleta |
| Código BR-n do imóvel | `slug` legível (`marco-zero-one`) | Catálogo pequeno |
| **Ficou de fora** | | |
| `developer` (construtora) | Não entra | Tudo é MBigucci; `marca` separa a linha Easy |
| `condoFee` | Não entra agora | O site não publica |
| Tipo `usado` e imóveis de terceiros | Não entra | A MBigucci vende os próprios |
| Importação "Ler aqui com IA" (rota de API) | Não entra | Exportação estática, sem servidor (já decidido na seção 9) |
