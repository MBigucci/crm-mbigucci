# Empreendimentos: dados coletados para o catálogo e o Radar de Match

> Coleta feita em 29/10/2026 para os itens 13 (empreendimentos e tipologias) e 14 (Radar de Match) de `docs/referencia-crm-bruna.md`. Decisões do Felipe aplicadas no mesmo dia. Os dados estão em `docs/empreendimentos-dados.json`. Nada em `crm/` foi alterado: a lista fixa de `crm/src/lib/empreendimentos.ts` continua valendo até a tabela existir.

## Sumário
1. Resumo
2. Decisões do Felipe (29/10/2026)
3. Fontes e método
4. Os 39 empreendimentos
5. Cruzamento com a lista atual e o tabelão
6. Lacunas
7. Pendências
8. Lista para o marketing
9. Proposta de esquema: `empreendimentos` e `tipologias`
10. Como o Radar de Match usa esses dados
11. Da Bruna: o que veio, o que foi adaptado e o que ficou de fora

## 1. Resumo

- **39 empreendimentos** e **88 tipologias** no JSON. São 37 com página no site oficial e 2 que seguem à venda sem página (Royal Palace e Terra Nostra Parma).
- **Por status:** 2 em breve lançamento (Elleva, Dom), 2 em lançamento (Marco Zero One, Mundi), 6 em obras e 29 prontos.
- **Entram no catálogo:** apartamentos e salas comerciais. Casas, lotes, Classic, UP e Cortina D'Ampezzo ficam de fora.
- **Novos em relação à lista atual:** Marco Zero One, Elleva e Dom. O Marco Zero Mix Work vira item próprio.
- **Preço:** sempre das tabelas do Linktree, nunca do site. O JSON ainda não tem preço (`preco_a_partir_de` vazio): as tabelas não foram lidas. O "a partir de" do site ficou em `preco_site`, só como referência.

## 2. Decisões do Felipe (29/10/2026)

| Tema | Decisão | Efeito no JSON e na próxima etapa |
| --- | --- | --- |
| Royal Palace e Terra Nostra Parma | Seguem à venda, sem página própria. O Parma usa o material do Modena. | Entraram com os dados do tabelão de set/2026. O Parma usa os links do Modena. |
| Classic, UP e Cortina D'Ampezzo | Não entram. | Saíram do JSON. A próxima etapa tira o Cortina D'Ampezzo da lista do Cadastro Mágico. |
| Casas, lotes e salas | Casas e lotes não; salas sim. | Saíram a Mansão Jardim Acapulco e o Village da Serra. Wynn Tower, Marco Zero Tower e Marco Zero Mix Work ficam, com `tipo: comercial`. A próxima etapa tira o Village da Serra da lista do Cadastro Mágico. |
| Torres e fases | Igual à Bruna. | Cada item tem `condominio` e `torres_conhecidas`. Na tabela, um registro por torre quando a tabela mensal separar (seção 9). |
| Preço | Sempre das tabelas do Linktree (PDF, atualizadas todo mês). Os empreendimentos sem preço no site também têm preço nas tabelas. | `preco_a_partir_de` fica vazio até ler as tabelas; o preço do site foi para `preco_site`, só como referência. Cada item aponta a sua tabela: 8 têm tabela própria (Marco Zero One, Mundi, Modena, Joy, Easy Jaçanã, Infinite, Palatium, Terrazzo); os outros apontam a tabela geral do mês ("Tabela mês de aniversário" em outubro, "Tabela promocional" em novembro), com `tabela_geral: true`. A importação mensal vira parte da etapa do catálogo (seção 11). |
| Endereço | Vale o do Linktree. | Conferido nas fichas técnicas: Life nº 230, Easy Jaçanã nº 180/184, Marco Zero Mix nº 1.230, Domani "Princesa Maria Amélia", Infinite nº 968 (bairro Barcelona) e Olimpic na Saúde. |
| Entrega do Terrazzo | Vale o site. | Mar/2028. |
| Link para o cliente | A apresentação, mas o ideal é um link oficial da MBigucci, não o Drive. | Por ora, `links.apresentacao` (Drive). O pedido de hospedar as apresentações no site está na lista para o marketing (seção 8). |

## 3. Fontes e método

| Fonte | O que traz | Como foi lida |
| --- | --- | --- |
| Linktree `linktr.ee/construtoraMBigucci` | Índice por cidade e bairro, com o status entre parênteses. Cada empreendimento tem um Linktree próprio com apresentação, ficha técnica, memorial, fotos, vídeos e tour virtual (quase tudo no Google Drive). | As 56 páginas, todas visitadas. |
| Site oficial `mbigucci.com.br/empreendimentos/` | O bloco "Detalhes do imóvel" de cada empreendimento: área, dormitórios, suítes, vagas, fase da obra, previsão de entrega, "A partir de", plantas, lazer, endereço e mapa. | As 37 páginas, todas abertas. Cada uma diz "Informações atualizadas em …" (entre 8 e 29/10/2026). |
| Fichas técnicas (PDF no Drive, pelo Linktree) | Endereço, unidades, tipologias, entrega. | Abertas só no visualizador, sem baixar, para conferir os endereços divergentes: Life, Terrazzo, Infinite, Easy Jaçanã, Marco Zero Mix, Domani, Olimpic e Maximus. |
| Tabelão de set/2026 (`ref/`) | Unidades à venda com preço, por torre. | Usado só para Royal Palace e Terra Nostra Parma, que não têm página. |
| Tabelas de preço (PDF no Drive) | Preço por unidade, de outubro e de novembro. | **Não abertas.** Os links estão no JSON (`tabela_outubro`, `tabela_novembro`). |

Regras seguidas:
- Campo vazio (`null`) quer dizer "não publicado". Nada foi deduzido.
- Cada empreendimento tem `fonte` (URLs visitadas), `fontes` (de onde veio cada grupo de campos) e `avisos` (divergências e erros).
- O link do Google Maps é montado com o endereço que vale (o do Linktree, ou o do mapa do site quando não houve divergência).
- Ficaram de fora: locação (galpões, terrenos e imóveis comerciais), terrenos e lotes à venda, documentos e institucional.

## 4. Os 39 empreendimentos

Entrega como está no site em 29/10/2026. A coluna de preço é o "a partir de" do **site**, só como referência: o preço que vale é o das tabelas do Linktree. O ! marca preço publicado com formato errado.

| Nome | Condomínio | Status | Bairro, cidade | Dorms | Área | Site (referência) | Entrega |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marco Zero One | | Lançamento | Jardim do Mar, São Bernardo do Campo | 3 e 4 | 152–357 m² | — | — |
| Mundi MBigucci | Mundi | Lançamento | Pauliceia, São Bernardo do Campo | 2 e 3 | 43–53 m² | R$ 344.000 | — |
| Elleva MBigucci | | Breve lançamento | Centro, São Bernardo do Campo | 2 | 67 m² | A combinar | — |
| Dom MBigucci | | Breve lançamento | Campestre, Santo André | 2 | 70 m² | A combinar | — |
| Terra Nostra Modena | Terra Nostra | Em obras | Jardim Diogo, Guarulhos | 2 | 44 m² | R$ 343.700 | Mai/2027 |
| MBigucci Joy | | Em obras | Vila Prudente, São Paulo | 2 | 35–40 m² | R$ 318.400 | Out/2028 |
| Easy Jaçanã | | Em obras | Jaçanã, São Paulo | 1 e 2 | 25–45 m² | R$ 239.100 | 36 meses após a CEF |
| Infinite São Caetano | | Em obras | Barcelona, São Caetano do Sul | 3 | 81 m² | R$ 1.086.700 | Abr/2028 |
| Palatium Ipiranga | | Em obras | Ipiranga, São Paulo | 2 a 3 | 56–85 m² | R$ 729.600 | Mar/2027 |
| Terrazzo MBigucci | | Em obras | Vila Carrão, São Paulo | 2 a 3 | 66–82 m² | R$ 857.400 | Mar/2028 |
| Alameda MBigucci | | Pronto | Campestre, Santo André | 2 | 56–61 m² | ! R$ 570.00,00 | Entregue |
| Exuberance MBigucci | Exuberance | Pronto | Rudge Ramos, São Bernardo do Campo | 3 | 70 m² | R$ 615.000 | Entregue |
| Imperium MBigucci | | Pronto | Ipiranga, São Paulo | 3 | 103 m² | R$ 1.261.500 | Entregue |
| Life MBigucci | | Pronto | Centro, São Bernardo do Campo | Studio | 20–48 m² | R$ 368.900 | Entregue |
| New Park MBigucci | | Pronto | Aclimação, São Paulo | 1 | 35–99 m² | R$ 637.500 | Entregue |
| Sonata MBigucci | Sonata | Pronto | Santa Teresinha, Santo André | 1 e 2 | 37–50 m² | ! R$ 365.00,00 | Entregue |
| Station MBigucci | | Pronto | Jabaquara, São Paulo | 1 ou 2 | 37–48 m² | R$ 417.400 | Entregue |
| Unique MBigucci | | Pronto | Rudge Ramos, São Bernardo do Campo | Loft e 2 | 36–54 m² | R$ 457.000 | Entregue |
| Vert MBigucci | | Pronto | Aclimação, São Paulo | 2 | 56–63 m² | R$ 711.100 | Entregue |
| Essenza MBigucci | Essenza | Pronto | Vila Gonçalves, São Bernardo do Campo | 2 | 58 m² | R$ 530.000 | Entregue |
| Impactus MBigucci | | Pronto | Parque Jaçatuba, Santo André | 2 e 3 | 50–61 m² | R$ 420.000 | Entregue |
| America MBigucci | America | Pronto | Cooperativa, São Bernardo do Campo | 2 | 43–44 m² | R$ 299.000 | Entregue |
| Stylo MBigucci | | Pronto | Rudge Ramos, São Bernardo do Campo | 2 a 3 | 71–82 m² | R$ 776.700 | Entregue |
| Alvorada MBigucci | | Pronto | Itaquera, São Paulo | 2 | 37 m² | R$ 270.000 | Entregue |
| Domani MBigucci | | Pronto | Nova Petrópolis, São Bernardo do Campo | 2 suítes | 67 m² | R$ 659.400 | Entregue |
| Maximus MBigucci | | Pronto | Jardim das Américas, São Bernardo do Campo | 3 suítes | 132 m² | R$ 1.200.000 | Entregue |
| Wynn Tower MBigucci | | Pronto | Rudge Ramos, São Bernardo do Campo | sala comercial | 32–36 m² | R$ 365.600 | Entregue |
| First Class MBigucci | First Class | Pronto | Morumbi, São Paulo | 2 suítes | 64 m² | R$ 571.900 | Entregue |
| Olimpic MBigucci | Olimpic | Pronto | Saúde, São Paulo | 2 e 3 | 56–71 m² | R$ 350.000 | Entregue |
| Wish Residence MBigucci | | Pronto | Ipiranga, São Paulo | 2 | 68 m² | R$ 760.000 | Entregue |
| Piemonte MBigucci | | Pronto | Água Funda, São Paulo | 3 | 58 m² | R$ 522.100 | Entregue |
| Marco Zero Mix Residence | Marco Zero Mix | Pronto | Jardim do Mar, São Bernardo do Campo | Loft | 36–73 m² (Mix todo) | R$ 369.700 (Mix todo) | Entregue |
| Marco Zero Mix Work | Marco Zero Mix | Pronto | Jardim do Mar, São Bernardo do Campo | sala comercial | 36–73 m² (Mix todo) | R$ 369.700 (Mix todo) | Entregue |
| Marco Zero Tower | | Pronto | Jardim do Mar, São Bernardo do Campo | sala comercial | 46–77 m² | R$ 435.000 | Entregue |
| Marco Zero Premier & Prime | Marco Zero Premier & Prime | Pronto | Jardim do Mar, São Bernardo do Campo | 2 e 3 | 65–83 m² | R$ 680.000 | — |
| Marco Zero Home | | Pronto | Jardim do Mar, São Bernardo do Campo | Loft e 2 | 42–50 m² | R$ 420.000 | Entregue |
| Easy São Vicente | | Pronto | Centro, São Vicente | 2 | 38–53 m² | R$ 276.700 | Entregue |
| Royal Palace | | Pronto | Vila Monumento, São Paulo | 3 | 71,65 m² | — (tabelão set/2026: R$ 773.700) | Entregue |
| Terra Nostra Parma | Terra Nostra | Pronto | Jardim Diogo, Guarulhos | 2 | 43,77 m² | — (tabelão set/2026: R$ 363.000) | Entregue |

## 5. Cruzamento com a lista atual e o tabelão

Comparado com `crm/src/lib/empreendimentos.ts` (37 nomes) e `ref/CRM Bruna/importacoes/mbigucci-tabelao-2026-09-24.json` (48 itens, por torre).

### O que muda na lista do Cadastro Mágico (para a próxima etapa)
| Ação | Nomes |
| --- | --- |
| Incluir | Marco Zero One, Elleva, Dom |
| Tirar | Cortina D'Ampezzo, Village da Serra |
| Incluir como chave | Modena (de Terra Nostra), Mundi Marcela (4ª torre do Mundi), Marco Zero Mix Work e Residence (já são chaves) |
| Manter | Os outros 35, incluindo Royal Palace e Terra Nostra, que seguem à venda |

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

### Torres que o tabelão cita
Mundi (Thiago pronta; Lucca e Vitor em lançamento; Marcela só no texto do site), Olimpic (Athenas, Rio de Janeiro, Londres), Sonata (Beethoven, Mozart), America (California, Flórida), First Class (Premium, Vip), Exuberance (Bellatrix), Essenza (Thiago), Marco Zero (Premier nº 2087, Prime nº 2099) e Terra Nostra (Modena, Parma). O site não separa as plantas por torre; a tabela mensal deve separar.

### Endereços: o que vale (Linktree) e onde os outros erram
| Empreendimento | Vale (ficha do Linktree) | Site | Tabelão |
| --- | --- | --- | --- |
| Life | Rua Príncipe Humberto, 230 | nº 168 | nº 230 |
| Easy Jaçanã | Rua José Buono, 180/184 | nº 178 | nº 180/184 |
| Marco Zero Mix | Av. Kennedy, 1.230 | nº 1200 (o mesmo do Marco Zero One) | nº 1230 |
| Domani | Rua Princesa Maria Amélia, 500 | igual | "Rua Princesa Amélia" |
| Infinite | Rua Alegre, 968 (plantão), Barcelona | nº 968, sem bairro | nº 988, Santa Paula |
| Terrazzo | Rua Biguaçu, 91 (plantão), Tatuapé; o índice do Linktree diz Vila Carrão | nº 91 | nº 92 |
| Olimpic | Rua Manoel Salgado, 381, Saúde; o índice do Linktree diz Jd. Caraguatá | Jd. Santa Cruz | Jardim Santa Cruz |
| Maximus | Av. Redenção, 423, Jd. das Américas; o índice do Linktree diz Centro | igual à ficha | igual à ficha |

Na Infinite e no Terrazzo a ficha só traz o endereço do plantão e do decorado. O JSON usa esse endereço, com aviso.

## 6. Lacunas

| Campo | Faltam (de 39) | Quais |
| --- | --- | --- |
| Preço (empreendimento e tipologia) | Todos | Vem das tabelas do Linktree, que não foram lidas. |
| Previsão de entrega (dos 10 em lançamento ou obras) | 5 | Marco Zero One, Mundi, Elleva, Dom ("Consulte") e Easy Jaçanã (só o texto da CEF). |
| Tour virtual | 17 | Normal: nem todos têm decorado virtual. |
| Apresentação | 6 | Marco Zero One, Mundi (têm book), Elleva, Dom, First Class e Royal Palace. |
| Memorial descritivo | 5 | Elleva, Dom, Marco Zero Premier & Prime, Marco Zero Home e Royal Palace. |
| Página oficial | 2 | Royal Palace e Terra Nostra Parma. |
| Tipologias | 1 | Dom (o site não publica planta). |
| Taxa de condomínio | 39 | O site não publica. Só o tabelão traz. |

Nas 88 tipologias, 44 não dizem quantas suítes e 22 não dizem vagas. A tabela mensal deve completar.

## 7. Pendências

- **Ler as tabelas do Linktree.** Todo preço vem delas, inclusive o de Marco Zero One, Elleva e Dom, que o site não publica (dúvida 9, resolvida pelo Felipe). A divisão por torre também. Primeira tarefa da etapa do catálogo. A tabela do Marco Zero One, por exemplo, traz por unidade a área, o ato, as mensais e o preço de venda.
- **Link oficial da apresentação.** Depende do marketing (seção 8).

## 8. Lista para o marketing

Pronta para enviar.

**Site mbigucci.com.br**
1. Alameda: o preço "A partir de" está como "R$ 570.00,00".
2. Sonata: o preço está como "R$ 365.00,00".
3. Marco Zero Tower: no topo e na ficha, o campo "Área privativa" mostra "Jardim do Mar, SBC".
4. Marco Zero Premier & Prime: o campo "Previsão de entrega" mostra "Jardim do Mar, SBC".
5. Olimpic, Wish e Marco Zero Tower: a lista "Diferenciais e lazer" é a mesma nos três, palavra por palavra (inclui "pet care" e "car wash").
6. Sonata: aparece na categoria São Bernardo do Campo, mas fica em Santo André.
7. Life: o endereço está como Rua Príncipe Humberto, 168. A ficha técnica diz 230.
8. Easy Jaçanã: o endereço está como Rua José Buono, 178. A ficha técnica diz 180/184.
9. Marco Zero Mix: o endereço está como Av. Kennedy, 1200 (o mesmo do Marco Zero One). A ficha técnica diz 1.230.
10. Infinite: a página não diz o bairro.
11. Piemonte: a ficha diz 58 m² e 3 dormitórios, mas as plantas vão de 43 a 58 m², com 2 e 3 dormitórios.
12. New Park: a ficha diz 35 a 99 m², mas só há a planta de 40 m².
13. Imperium: a primeira planta diz "103m³".
14. Erros de digitação: "Saão de Festas" (Domani), "Psicina" (Unique), "Fitnss" (Station), "dormitíorios" (Vert), "Pizzza" (Piemonte), "Comunicação entre Andres" (Wynn Tower), "50m" sem o ² (Marco Zero Home).
15. Royal Palace e Terra Nostra Parma: seguem à venda, mas não têm página.

**Linktree**
16. Índice de São Paulo: o Olimpic está em "Jd. Caraguatá", mas a ficha diz Saúde e o site diz Jardim Santa Cruz.
17. Índice de São Bernardo: o Maximus está em "Centro", mas fica no Jardim das Américas.
18. "Easy Jaçana" e "New.Park" no índice: grafia diferente da do site.
19. Os links "Easy Jaçanã · Tabela de preços" e "Tabela mês de aniversário" têm a URL repetida duas vezes.

**Pedido**
20. Hospedar as apresentações num link oficial da MBigucci (por exemplo, na página de cada empreendimento no site), para os corretores enviarem ao cliente sem passar pelo Google Drive.

## 9. Proposta de esquema: `empreendimentos` e `tipologias`

Para a próxima etapa. Base: o formato de importação da Bruna (`crm-imoveis/1`, em `ref/CRM Bruna/src/lib/import-schema.ts`), com um registro por torre, como na Bruna.

### `empreendimentos` (um registro por torre ou fase com nome próprio)
| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | |
| `slug` | text único | `olimpic-athenas`, `marco-zero-one`. |
| `nome` | text | "Olimpic - Athenas", como na Bruna. |
| `condominio` | text | "Olimpic". Null quando a torre é única. As telas agrupam por ele, com "a partir de". |
| `variacoes` | text[] | Chaves do Cadastro Mágico (hoje `chaves` em `empreendimentos.ts`). |
| `pede_contexto` | boolean | Nome que é palavra comum ("Life", "Unique"). |
| `marca` | text | `MBigucci` ou `Easy MBigucci`. |
| `tipo` | text check | `residencial` ou `comercial`. |
| `status` | text check | `breve_lancamento`, `lancamento`, `em_obras`, `pronto`. |
| `ativo` | boolean | Sai das listas sem apagar. Leads e vendas antigos continuam apontando. |
| `endereco`, `bairro`, `cidade`, `uf` | text | Endereço do Linktree. `bairro` e `cidade` alimentam a região do Radar. |
| `entrega_prevista` | date | Primeiro dia do mês. Null quando pronto ou não publicado. |
| `entrega_texto` | text | Para casos como "36 meses após a assinatura com a CEF". |
| `chamada` | text | Frase curta do site. |
| `lazer` | text[] | |
| `link_apresentacao` | text | O link que vai para o cliente. Hoje é o Drive; troca quando o marketing hospedar no site. |
| `link_pagina`, `link_book`, `link_tour`, `link_maps` | text | Também podem ir para o cliente. |
| `link_ficha`, `link_memorial`, `link_fotos`, `link_tabela` | text | Uso interno. |
| `tabela_mes` | date | Mês da tabela da qual vieram os preços. |
| `observacao` | text | |
| `atualizado_em`, `atualizado_por` | | |

### `tipologias`
| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | |
| `empreendimento_id` | uuid → `empreendimentos` | |
| `rotulo` | text | Como está na tabela ou no site ("Final 3 · 152 m² · 3 suítes"). |
| `tipo` | text check | `apartamento`, `studio`, `loft`, `cobertura`, `garden`, `sala_comercial`. |
| `dormitorios`, `suites` | smallint | Null em studio, loft e sala. O Radar conta studio e loft como 1. |
| `vagas_min`, `vagas_max` | smallint | O site publica "1 ou 2". |
| `area_m2` | numeric(8,2) | Área privativa. |
| `deposito` | boolean | |
| `preco_a_partir_de` | numeric(14,2) | Menor preço da tipologia na tabela do Linktree. Nunca o preço do site. |
| `preco_nota` | text | "unid. 84 · tabela R$ 515.000", como o `priceNote` da Bruna. |
| `condominio_valor` | numeric(10,2) | Quando a tabela trouxer. |
| `esgotada` | boolean | Ex.: coberturas do Marco Zero One. |
| `ordem` | smallint | |

### Acesso (RLS)
- Leitura: qualquer usuário ativo.
- Cadastro, edição e importação da tabela: permissão nova `empreendimentos.editar` na tabela `permissions`, dada ao gerente geral e, na proposta de `docs/acessos-perfis.md`, ao operacional. Sem `if (role === ...)`.
- Sem exclusão: `ativo = false`.

### Ligação com o que já existe
- `leads.empreendimento`, `vendas` e `visitas` guardam o nome em texto. Proposta: coluna nova `empreendimento_id` (nula), preenchida pelo nome ou pelas variações. O texto fica para o histórico.
- O Cadastro Mágico passa a ler nomes e variações da tabela. `empreendimentos.ts` vira só o fallback offline.
- As mensagens prontas ganham `{endereco}` e `{apresentacao}` (já previstas no item 13 de `docs/referencia-crm-bruna.md`).

### Carga inicial
`docs/empreendimentos-dados.json` dá os empreendimentos, endereços, links, lazer e plantas. A tabela mensal dá o preço por tipologia e a divisão por torre. Correspondência com o formato da Bruna:

| Bruna (`crm-imoveis/1`) | Aqui |
| --- | --- |
| `name`, `condominium` | `nome`, `condominio` |
| `type` (`planta`, `pronto`, `usado`) | `status` com 4 valores. Não há usado. |
| `neighborhood`, `city`, `address` | `bairro`, `cidade`, `endereco` |
| `deliveryDate` ("Dez/2028") | `entrega_prevista` (data) + `entrega_texto` |
| `condoFee` | `tipologias.condominio_valor`, quando a tabela trouxer |
| `highlights` | `chamada` + `lazer` |
| `photosUrl` | `link_fotos`, e mais oito links |
| `units[]` (`bedrooms`, `suites`, `parking`, `area`, `price`, `priceNote`) | `tipologias` (`dormitorios`, `suites`, `vagas_min`/`vagas_max`, `area_m2`, `preco_a_partir_de`, `preco_nota`) |
| `warnings` | `avisos`, por empreendimento |

## 10. Como o Radar de Match usa esses dados

O lead já guarda `valor`, `dormitorios`, `regiao` e `finalidade` (`crm/supabase/schema.sql`, tabela `leads`). Proposta de pesos, adaptada da Bruna (`ref/CRM Bruna/src/lib/match.ts`):

| Critério | Peso na Bruna | Proposta | Dado usado |
| --- | --- | --- | --- |
| Orçamento | 35, com 10% de tolerância | 40, com 10% | `leads.valor` × `tipologias.preco_a_partir_de` |
| Região | 20 | 25 | `leads.regiao` × `bairro` e `cidade` |
| Dormitórios | 15 | 20 | `leads.dormitorios` × `tipologias.dormitorios` (studio e loft = 1) |
| Tipo | 20 | 10 | Residencial × comercial. Finalidade "investir" aceita studio, loft e sala. |
| Vagas e área | 5 + 5 | 5 | O lead ainda não guarda vagas nem área. |

- Mostra a partir de 50%, com motivos ✓ e ✕, como na Bruna.
- Esconde empreendimento inativo e tipologia esgotada.
- Preço só da tabela do Linktree. Sem tabela lida, o empreendimento entra no Radar sem a nota de orçamento.
- Avisa quando a tabela do empreendimento for de um mês anterior (`tabela_mes`).

## 11. Da Bruna: o que veio, o que foi adaptado e o que ficou de fora

Lido em 29/10/2026: `ref/CRM Bruna/src/lib/import-schema.ts`, `src/lib/import-types.ts`, `public/importar-imoveis.md`, `importacoes/mbigucci-tabelao-2026-09-24.json` e a seção 9 de `docs/referencia-crm-bruna.md`.

| Recurso da Bruna | Como ficou | Por quê |
| --- | --- | --- |
| **Trazido como está** | | |
| Um empreendimento com várias tipologias; tipologia = combinação de dormitórios e metragem | Igual | Mesmo modelo para o catálogo e o Radar |
| `condominium` + um item por torre ou fase com nome próprio | Igual (`condominio`) | Decisão do Felipe |
| "Use só o que está no material; o que faltar fica `null` e vai para os avisos" | Igual, com `avisos` por empreendimento | Premissa da coleta |
| Preço como número, menor preço da tipologia como "a partir de", com nota | Igual (`preco_a_partir_de`, `preco_nota`) | |
| Ler o Linktree e abrir books, tabelas, fichas e páginas | Igual, mais o site oficial, que tem os dados em texto | |
| **Adaptado** | | |
| Importação "Resposta de outra IA" (colar o JSON que a IA devolve a partir do PDF) | Passa a ser o caminho da **tabela mensal**, e não um "depois" | O preço oficial é a tabela em PDF, trocada todo mês no Linktree |
| `type`: planta, pronto, usado | `status`: breve lançamento, lançamento, em obras, pronto | Não há usado; o "aguardando lançamento" precisa separar breve lançamento |
| `photosUrl` (um link) | Nove links, separando o que vai para o cliente do que é interno | O Linktree da MBigucci tem material interno |
| `highlights` em 200 caracteres | `chamada` + lista de `lazer` | O site já separa |
| Studio = 1 dormitório | `tipo` = studio e dormitórios nulo; o Radar conta 1 | Não inventar dado na coleta |
| Código BR-n do imóvel | `slug` legível | Catálogo pequeno |
| **Ficou de fora** | | |
| `developer` (construtora) | Não entra | Tudo é MBigucci; `marca` separa a linha Easy |
| Tipo `usado`, casas, lotes e imóveis de terceiros | Não entram | Decisão do Felipe: só apartamentos e salas |
| Importação "Ler aqui com IA" (rota de API) | Não entra | Exportação estática, sem servidor |
