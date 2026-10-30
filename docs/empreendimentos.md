# Empreendimentos: dados coletados para o catálogo e o Radar de Match

> Coleta feita em 29/10/2026 para os itens 13 (empreendimentos e tipologias) e 14 (Radar de Match) de `docs/referencia-crm-bruna.md`. Decisões do Felipe aplicadas no mesmo dia. Os dados estão em `docs/empreendimentos-dados.json`. **O catálogo e o Radar foram construídos no mesmo dia: veja a seção 12, "Como ficou".** As seções 9 e 10 são a proposta original; onde a construção mudou algo, vale a seção 12.

## Sumário
1. Resumo
2. Decisões do Felipe (29/10/2026)
3. Fontes e método
4. Os 46 itens
5. Cruzamento com a lista atual e o tabelão
6. Lacunas
7. Pendências
8. Lista para o marketing
9. Proposta de esquema: `empreendimentos` e `tipologias`
10. Como o Radar de Match usa esses dados
11. Da Bruna: o que veio, o que foi adaptado e o que ficou de fora
12. Como ficou (catálogo, Radar e integrações)

## 1. Resumo

- **46 itens** no JSON, um por torre que tem unidade à venda (como na Bruna), com **114 tipologias**.
- **Por status:** 2 em breve lançamento (Elleva, Dom), 3 em lançamento (Marco Zero One, Mundi Lucca e Vitor), 7 em obras e 34 prontos.
- **Preço:** das tabelas do Linktree de novembro/2026, lidas em 29/10/2026. São a Tabela Promocional (Tabela 26.11.01, o tabelão em PDF) e a tabela do Marco Zero One. 44 itens têm preço; Elleva e Dom não estão em nenhuma tabela.
- **Entram no catálogo:** apartamentos, salas comerciais e a loja do MBigucci Joy. Casas, lotes, Classic, UP e Cortina D'Ampezzo ficam de fora.
- **Novos em relação à lista atual:** Marco Zero One, Elleva e Dom. O Marco Zero Mix Work vira item próprio.

## 2. Decisões do Felipe (29/10/2026)

| Tema | Decisão | Efeito no JSON e na próxima etapa |
| --- | --- | --- |
| Royal Palace e Terra Nostra Parma | Seguem à venda, sem página própria. O Parma usa o material do Modena. | Entraram com os dados da tabela de novembro. O Parma usa os links do Modena. |
| Classic, UP e Cortina D'Ampezzo | Não entram. | Saíram do JSON. A próxima etapa tira o Cortina D'Ampezzo da lista do Cadastro Mágico. |
| Casas, lotes e salas | Casas e lotes não; salas sim. | Saíram a Mansão Jardim Acapulco e o Village da Serra. Wynn Tower, Marco Zero Tower e Marco Zero Mix Work ficam, com `tipo: comercial`. A próxima etapa tira o Village da Serra da lista do Cadastro Mágico. |
| Torres e fases | Igual à Bruna. | Cada item tem `condominio` e `torres_conhecidas`. Na tabela, um registro por torre quando a tabela mensal separar (seção 9). |
| Preço | Sempre das tabelas do Linktree (PDF, atualizadas todo mês). Os empreendimentos sem preço no site também têm preço nas tabelas. | Lidas as tabelas de novembro (seção 3). `preco_a_partir_de` é o menor preço vigente; o "a partir de" do site ficou em `preco_site`, só como referência. `links.tabela_precos_usada` diz de qual tabela veio. A importação mensal vira parte da etapa do catálogo (seção 11). |
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
| Tabelas de preço de novembro/2026 (PDF no Drive, em `linktr.ee/TABELAS_FUTURAS`) | **Tabela Promocional** (Tabela 26.11.01): todos os prontos por unidade, com preço de tabela, preço promocional, condomínio e IPTU, e os em obras com "a partir de" e entrega. **Tabela do Marco Zero One** (26.11): preço por unidade e entrega. | Lidas em 29/10/2026 pelo texto que o visualizador do Drive expõe, sem baixar os arquivos. As tabelas próprias dos outros 7 em obras não foram lidas: o "a partir de" deles veio da Tabela Promocional. |

Regras seguidas:
- Campo vazio (`null`) quer dizer "não publicado". Nada foi deduzido.
- Cada empreendimento tem `fonte` (URLs visitadas), `fontes` (de onde veio cada grupo de campos) e `avisos` (divergências e erros).
- O link do Google Maps é montado com o endereço que vale (o do Linktree, ou o do mapa do site quando não houve divergência).
- Ficaram de fora: locação (galpões, terrenos e imóveis comerciais), terrenos e lotes à venda, documentos e institucional.

## 4. Os 46 itens

Um item por torre com unidade à venda. Preço e área vêm das tabelas de novembro/2026 do Linktree: o preço é o menor preço vigente (o promocional, quando a tabela traz os dois). A coluna "Site" é o "a partir de" do site, só para comparar. Entrega: a das tabelas, salvo o Terrazzo (vale o site, Mar/2028) e o Easy Jaçanã (o site diz "36 meses após a assinatura com a CEF"; a tabela, Mar/2029).

| Nome | Condomínio | Status | Bairro, cidade | Dorms | Área | A partir de | Site | Entrega |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Marco Zero One |  | Lançamento | Jardim do Mar, São Bernardo do Campo | 3, 4 | 152–357 m² | R$ 2.436.300 | — | Ago/2030 |
| Mundi - Thiago | Mundi | Pronto | Pauliceia, São Bernardo do Campo | 3 | 53,54 m² | R$ 459.900 | R$ 344.000 | Entregue |
| Mundi - Lucca | Mundi | Lançamento | Pauliceia, São Bernardo do Campo | 2 | 44–48 m² | R$ 344.800 | R$ 344.000 | Dez/2029 |
| Mundi - Vitor | Mundi | Lançamento | Pauliceia, São Bernardo do Campo | 2, 3 | 43,77–53,54 m² | R$ 344.800 | R$ 344.000 | Dez/2029 |
| Elleva MBigucci |  | Breve lançamento | Centro, São Bernardo do Campo | — | — | — | — | — |
| Dom MBigucci |  | Breve lançamento | Campestre, Santo André | — | — | — | — | — |
| Terra Nostra Modena | Terra Nostra | Em obras | Jardim Diogo, Guarulhos | 2 | 43,77–44,36 m² | R$ 344.500 | R$ 343.700 | Mai/2027 |
| MBigucci Joy - Loja | MBigucci Joy | Em obras | Vila Prudente, São Paulo | loja | 90,92 m² | R$ 1.179.400 | R$ 318.400 | Out/2028 |
| MBigucci Joy |  | Em obras | Vila Prudente, São Paulo | 2 | 35,63–70,24 m² | R$ 319.100 | R$ 318.400 | Out/2028 |
| Easy Jaçanã |  | Em obras | Jaçanã, São Paulo | 1, 2 | 25,5–45,92 m² | R$ 239.600 | R$ 239.100 | Mar/2029 |
| Infinite São Caetano |  | Em obras | Santa Paula, São Caetano do Sul | 3 | 81,82 m² | R$ 1.089.100 | R$ 1.086.700 | Abr/2028 |
| Palatium Ipiranga |  | Em obras | Ipiranga, São Paulo | 2, 3 | 57–85 m² | R$ 731.200 | R$ 729.600 | Mar/2027 |
| Terrazzo MBigucci |  | Em obras | Vila Carrão, São Paulo | 2, 3 | 66,81–82,02 m² | R$ 859.300 | R$ 857.400 | Mar/2028 |
| Alameda MBigucci |  | Pronto | Campestre, Santo André | 2 | 56,79–61,06 m² | R$ 609.400 | — | Entregue |
| Exuberance - Bellatrix | Exuberance | Pronto | Rudge Ramos, São Bernardo do Campo | 3 | 70,37 m² | R$ 657.600 | R$ 615.000 | Entregue |
| Imperium MBigucci |  | Pronto | Ipiranga, São Paulo | 3 | 103,69 m² | R$ 1.348.700 | R$ 1.261.500 | Entregue |
| Life MBigucci |  | Pronto | Centro, São Bernardo do Campo | 2, studio | 25–48,24 m² | R$ 394.400 | R$ 368.900 | Entregue |
| New Park MBigucci |  | Pronto | Aclimação, São Paulo | 1 | 38,45–99,27 m² | R$ 681.600 | R$ 637.500 | Entregue |
| Sonata - Beethoven | Sonata | Pronto | Santa Teresinha, Santo André | 1, 2 | 37,71–50,18 m² | R$ 370.700 | — | Entregue |
| Sonata - Mozart | Sonata | Pronto | Santa Teresinha, Santo André | 2 | 48,95–50,18 m² | R$ 457.100 | — | Entregue |
| Station MBigucci |  | Pronto | Jabaquara, São Paulo | 1, 2 | 37,29–48,2 m² | R$ 424.000 | R$ 417.400 | Entregue |
| Unique MBigucci |  | Pronto | Rudge Ramos, São Bernardo do Campo | 1 | 35,72 m² | R$ 488.700 | R$ 457.000 | Entregue |
| Vert MBigucci |  | Pronto | Aclimação, São Paulo | 2 | 57,35–69,98 m² | R$ 760.300 | R$ 711.100 | Entregue |
| Essenza - Thiago | Essenza | Pronto | Vila Gonçalves, São Bernardo do Campo | 2 | 58,24 m² | R$ 566.700 | R$ 530.000 | Entregue |
| Impactus MBigucci |  | Pronto | Parque Jaçatuba, Santo André | 2, 3 | 50,6–61,37 m² | R$ 426.600 | R$ 420.000 | Entregue |
| America - California | America | Pronto | Cooperativa, São Bernardo do Campo | 2 | 43,6 m² | R$ 303.700 | R$ 299.000 | Entregue |
| America - Flórida | America | Pronto | Cooperativa, São Bernardo do Campo | 2 | 43,6–44,86 m² | R$ 303.700 | R$ 299.000 | Entregue |
| Stylo MBigucci |  | Pronto | Rudge Ramos, São Bernardo do Campo | 2, 3 | 71,28–81,98 m² | R$ 830.400 | R$ 776.700 | Entregue |
| Alvorada MBigucci |  | Pronto | Itaquera, São Paulo | 2 | 37,88–39,58 m² | R$ 274.200 | R$ 270.000 | Entregue |
| Domani MBigucci |  | Pronto | Nova Petrópolis, São Bernardo do Campo | 2 | 67,81 m² | R$ 705.000 | R$ 659.400 | Entregue |
| Maximus MBigucci |  | Pronto | Jardim das Américas, São Bernardo do Campo | 3 | 132 m² | R$ 1.283.000 | R$ 1.200.000 | Entregue |
| Wynn Tower MBigucci |  | Pronto | Rudge Ramos, São Bernardo do Campo | sala | 32,09–35,81 m² | R$ 390.800 | R$ 365.600 | Entregue |
| First Class - Premium | First Class | Pronto | Morumbi, São Paulo | 2 | 64,14 m² | R$ 611.500 | R$ 571.900 | Entregue |
| First Class - Vip | First Class | Pronto | Morumbi, São Paulo | 2 | 64,14 m² | R$ 633.800 | R$ 571.900 | Entregue |
| Olimpic - Rio de Janeiro | Olimpic | Pronto | Jardim Santa Cruz, São Paulo | 2, 3 | 64,82–71,38 m² | R$ 457.100 | R$ 350.000 | Entregue |
| Wish Residence MBigucci |  | Pronto | Ipiranga, São Paulo | 2, 3 | 68,55–120,69 m² | R$ 812.600 | R$ 760.000 | Entregue |
| Piemonte MBigucci |  | Pronto | Água Funda, São Paulo | 3 | 58,75 m² | R$ 530.300 | R$ 522.100 | Entregue |
| Marco Zero Mix Residence | Marco Zero Mix | Pronto | Jardim do Mar, São Bernardo do Campo | 1 | 40,4–73,5 m² | R$ 449.000 | R$ 369.700 | Entregue |
| Marco Zero Mix Work | Marco Zero Mix | Pronto | Jardim do Mar, São Bernardo do Campo | sala | 32,66–36,32 m² | R$ 395.300 | R$ 369.700 | Entregue |
| Marco Zero Tower |  | Pronto | Jardim do Mar, São Bernardo do Campo | sala | 42,68–46,09 m² | R$ 465.100 | R$ 435.000 | Entregue |
| Marco Zero Premier | Marco Zero Premier & Prime | Pronto | Jardim do Mar, São Bernardo do Campo | 2, 3 | 65,3–83,92 m² | R$ 727.000 | R$ 680.000 | Entregue |
| Marco Zero Prime | Marco Zero Premier & Prime | Pronto | Rudge Ramos, São Bernardo do Campo | 2, 3 | 65,3–83,92 m² | R$ 727.000 | R$ 680.000 | Entregue |
| Marco Zero Home |  | Pronto | Jardim do Mar, São Bernardo do Campo | loft | 42,9–50,7 m² | R$ 449.000 | R$ 420.000 | Entregue |
| Easy São Vicente |  | Pronto | Centro, São Vicente | 2 | 38,71–53,54 m² | R$ 295.900 | R$ 276.700 | Entregue |
| Royal Palace |  | Pronto | Vila Monumento, São Paulo | 3 | 71,65 m² | R$ 785.800 | — | Entregue |
| Terra Nostra Parma | Terra Nostra | Pronto | Jardim Diogo, Guarulhos | 2 | 43,77 m² | R$ 350.300 | — | Entregue |

Restrição de renda, como a tabela traz: Piemonte e Station, renda familiar até 10 salários mínimos; Alvorada, do 1º ao 12º andar, até 10; America, até 6. Está em `restricao_renda`.

## 5. Cruzamento com a lista atual e o tabelão

Comparado com `crm/src/lib/empreendimentos.ts` (37 nomes) e `ref/CRM Bruna/importacoes/mbigucci-tabelao-2026-09-24.json` (48 itens, por torre).

### O que muda na lista do Cadastro Mágico (para a próxima etapa)
| Ação | Nomes |
| --- | --- |
| Incluir | Marco Zero One, Elleva, Dom |
| Tirar | Cortina D'Ampezzo, Village da Serra |
| Incluir como chave | Modena (de Terra Nostra), as torres da tabela ("Mundi Lucca", "Sonata Mozart" etc.) e Marco Zero Mix Work e Residence (já são chaves) |
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

### Torres na tabela de novembro
Viraram item próprio: Mundi (Thiago pronta; Lucca e Vitor em lançamento), Olimpic (só Rio de Janeiro tem unidade), Sonata (Beethoven, Mozart), America (California, Flórida), First Class (Premium, Vip), Exuberance (Bellatrix), Essenza (Thiago), Marco Zero Premier (nº 2087) e Prime (nº 2099), Terra Nostra (Modena, Parma) e MBigucci Joy (a loja à parte). Olimpic Athenas e Londres e Mundi Marcela não têm unidade na tabela.

### Endereços: o que vale (Linktree) e onde os outros erram
Entre os documentos do Linktree, vale a tabela do mês, que é o mais recente. A ficha técnica de alguns traz só o endereço do plantão.

| Empreendimento | Vale | Site | Outros |
| --- | --- | --- | --- |
| Life | Rua Príncipe Humberto, 230 (ficha e tabela) | nº 168 | |
| Easy Jaçanã | Rua José Buono, 180/184 (ficha e tabela) | nº 178 | |
| Marco Zero Mix e Marco Zero One | Av. Kennedy, 1.230 (fichas e tabelas) | nº 1200 | |
| Infinite | Rua Alegre, 988, Santa Paula (tabela) | nº 968, sem bairro | ficha: nº 968 é o plantão; índice do Linktree: Barcelona |
| Terrazzo | Rua Biguaçu, 92, Vila Carrão (tabela) | nº 91 | ficha: nº 91 é o plantão, no Tatuapé |
| Olimpic | Rua Manoel Salgado, 381, Jardim Santa Cruz (tabela e site) | igual | ficha: Saúde; índice do Linktree: Jd. Caraguatá |
| Marco Zero Prime | Av. Senador Vergueiro, 2099, Rudge Ramos (tabela) | Jardim do Mar | |
| Domani | Rua Princesa Maria Amélia, 500 (ficha) | igual | tabela: "Rua Princesa Amelia" |
| Maximus | Av. Redenção, 423, Jd. das Américas (ficha, tabela e site) | igual | índice do Linktree: Centro |

## 6. Lacunas

| Campo | Faltam (de 46) | Quais |
| --- | --- | --- |
| Preço e tipologias | 2 | Elleva e Dom: ainda não têm tabela. |
| Previsão de entrega (dos 12 em lançamento ou obras) | 2 | Elleva e Dom. |
| Taxa de condomínio | 10 (+ Elleva e Dom) | Os em obras e o Marco Zero One: a tabela não traz. |
| Tour virtual | 19 | Normal: nem todos têm decorado virtual. |
| Apresentação | 9 | Marco Zero One e as torres do Mundi (têm book), Elleva, Dom, as torres do First Class e Royal Palace. |
| Memorial descritivo | 6 | Elleva, Dom, Marco Zero Premier, Marco Zero Prime, Marco Zero Home e Royal Palace. |
| Página oficial | 2 | Royal Palace e Terra Nostra Parma. |

As tipologias da tabela trazem dormitórios, suítes, vagas, área, preço, condomínio e IPTU. As do Marco Zero One vêm do site (planta) com o preço da tabela; a de 304 m² do site não está na tabela e ficou de fora.

## 7. Pendências

- **Elleva e Dom sem preço.** Ainda não têm tabela (Felipe, 29/10/2026). Entram no catálogo como breve lançamento, sem preço e sem tipologias, e os leads ficam em "aguardando lançamento". Quando a tabela sair no Linktree, a importação mensal preenche.
- **Cortina D'Ampezzo está na Tabela Promocional** (cobertura 152, 230 m², R$ 2.644.400, locada até maio/2027). Ficou de fora por decisão do Felipe. Confirmar.
- **O que quer dizer o \* no preço promocional?** Aparece em Olimpic, Piemonte, Station, Alvorada, Terra Nostra Parma, America, Sonata e Impactus. Em quatro deles a tabela diz que há limite de renda; nos outros, não diz. Ficou registrado na `preco_nota`.
- **Tabelas próprias dos em obras.** Mundi, Modena, MBigucci Joy, Easy Jaçanã, Infinite, Palatium e Terrazzo têm tabela própria, com preço por unidade. Não foram lidas: o "a partir de" deles veio da Tabela Promocional. A etapa do catálogo pode ler as próprias.
- **Terrazzo:** a tabela de novembro ainda diz entrega em 01/06/2026. Vale o site (Mar/2028), por decisão do Felipe; vale avisar quem faz a tabela.
- **Marco Zero One:** o site marca as coberturas como esgotadas, mas a tabela ainda lista as unidades 261 a 264.
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
9. Marco Zero Mix e Marco Zero One: o endereço está como Av. Kennedy, 1200. A ficha técnica e as tabelas dizem 1.230.
10. Infinite: a página diz R. Alegre, 968 e não diz o bairro. A tabela diz Rua Alegre, 988, Santa Paula (o 968 é o plantão).
11. Terrazzo: a página diz Rua Biguaçu, 91 (o plantão); a tabela diz 92.
12. Marco Zero One: a página marca as coberturas como esgotadas, mas a tabela de novembro ainda lista as unidades 261 a 264.
13. Marco Zero Premier & Prime: a página põe os dois no Jardim do Mar; a tabela põe o Prime (nº 2099) em Rudge Ramos.
14. Piemonte: a ficha diz 58 m² e 3 dormitórios, mas as plantas vão de 43 a 58 m², com 2 e 3 dormitórios.
15. New Park: a ficha diz 35 a 99 m², mas só há a planta de 40 m².
16. Imperium: a primeira planta diz "103m³".
17. Erros de digitação: "Saão de Festas" (Domani), "Psicina" (Unique), "Fitnss" (Station), "dormitíorios" (Vert), "Pizzza" (Piemonte), "Comunicação entre Andres" (Wynn Tower), "50m" sem o ² (Marco Zero Home).
18. Royal Palace e Terra Nostra Parma: seguem à venda, mas não têm página.

**Linktree**
19. Índice de São Paulo: o Olimpic está em "Jd. Caraguatá", mas a ficha diz Saúde e o site diz Jardim Santa Cruz.
20. Índice de São Bernardo: o Maximus está em "Centro", mas fica no Jardim das Américas.
21. "Easy Jaçana" e "New.Park" no índice: grafia diferente da do site.
22. Os links "Easy Jaçanã · Tabela de preços" e "Tabela mês de aniversário" têm a URL repetida duas vezes.
23. Tabela Promocional de novembro: o Terrazzo ainda está com entrega em 01/06/2026 (o site diz Mar/2028); o Domani está como "Rua Princesa Amelia" (a ficha diz "Princesa Maria Amélia").
24. Fichas técnicas: Olimpic diz bairro Saúde; tabela e site dizem Jardim Santa Cruz.

**Pedido**
25. Hospedar as apresentações num link oficial da MBigucci (por exemplo, na página de cada empreendimento no site), para os corretores enviarem ao cliente sem passar pelo Google Drive.

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

## 12. Como ficou (catálogo, Radar e integrações)

Construído em 29/10/2026. Commits locais; o SQL ainda precisa rodar no Supabase.

### Banco
- **Tabelas `empreendimentos` e `tipologias`**, no fim de `crm/supabase/schema.sql`, com o esquema da seção 9 e mais: `preco_a_partir_de` no empreendimento (o banco grava o menor preço das tipologias não esgotadas, por gatilho), `restricao_renda`, `avisos`, `ordem` e, na tipologia, `iptu_valor`. Tipos de tipologia: apartamento, studio, loft, cobertura, garden, duplex, sala comercial e loja (a coleta trouxe duplex e loja).
- **Sem exclusão de empreendimento:** `ativo = false` tira das listas. A tipologia pode ser retirada (é linha da tabela de preços, não registro de auditoria).
- **Checks:** slug em minúsculas com hífen, nome único sem diferença de maiúscula, links só `http(s)://`, `tabela_mes` no dia 1, vagas máx. ≥ mín.
- **Permissão nova `empreendimentos.gerenciar`** (a seção 9 dizia `empreendimentos.editar`). Padrão: operacional, só na criação. O gerente geral sempre pode. Todo usuário ativo lê; o desativado e o anônimo não.
- **Carga inicial:** `crm/supabase/empreendimentos-seed.sql`, gerado por `crm/scripts/gerar-seed-empreendimentos.mjs` a partir do JSON. São 46 empreendimentos e 115 tipologias (as 114 da tabela e a planta do site do Elleva, sem preço). Idempotente: o empreendimento que já existe (pelo slug ou pelo nome) fica como está, e as tipologias só entram no empreendimento sem nenhuma. Rodar de novo não desfaz o que foi editado no app. Pedem contexto no Cadastro Mágico: Life, Unique, Alameda, Infinite, Wish, Vert, Station, Alvorada, America, Dom e MBigucci Joy.
- **Mensagem pronta nova** "Apresentar empreendimento" (`apresentar_empreendimento`), com `{endereco}`, `{a_partir_de}` e `{apresentacao}`.
- **Sem `empreendimento_id`** em leads, visitas e vendas (a seção 9 propunha): o nome em texto continua, e o app acha o empreendimento no catálogo pelo nome, pelas variações ou pelo condomínio (`acharNoCatalogo`). Assim nenhum dado antigo precisa de migração.

### Telas
| Endereço | Tela |
| --- | --- |
| `/empreendimentos/` | Catálogo, no menu de todo usuário. Busca (nome, bairro, cidade, endereço), filtros de fase, cidade e bairro, dormitórios (studio e loft contam 1; "4 ou mais") e faixa de preço (pelas tipologias não esgotadas). Lançamentos primeiro. Card com fase, bairro e cidade, entrega, dormitórios e área, "a partir de" (com "! Tabela de out/2026" quando a tabela é de um mês anterior), restrição de renda e os botões Apresentação (ou Book, ou Página no site), Tabela, Como chegar e Mandar ao cliente. No lançamento, "! 2 clientes aguardando lançamento combinam", com a barra vermelha. Quem gerencia vê "Mostrar os fora de venda" e "+ Novo empreendimento". |
| `/empreendimentos/ver/?slug=` | O empreendimento: endereço, entrega, preço, botões, **Clientes compatíveis**, tipologias com preço e nota da tabela, lazer e o material (página, book, tour, fotos, ficha, memorial). Os avisos da coleta só para quem gerencia. |
| `/empreendimentos/editar/?slug=` (sem slug: novo) | Só com `empreendimentos.gerenciar`. Dados, endereço e entrega (mês), os 9 links, mês da tabela, restrição de renda, tipologias (criar, alterar, retirar, marcar esgotada), variações e "pede contexto" do Cadastro Mágico e observação interna. O slug sai do nome na criação e não muda depois. |

- **Mandar ao cliente** (card e página): abre o diálogo de mensagem com o modelo "Apresentar empreendimento", sem cliente ("Oi, tudo bem?"); o WhatsApp abre para escolher o contato.
- **Ficha do lead:** o empreendimento vira link para o catálogo; o campo do perfil sugere os nomes do catálogo e avisa "! Não está no catálogo"; o card **Radar** fica abaixo do perfil (só para o dono do lead ativo).

### Integrações
- **Cadastro Mágico:** lê a lista do catálogo (`listaDoMagico`). Cada torre ativa reconhece o nome e as variações só dela. A variação de várias torres do mesmo condomínio vira um item com o nome do condomínio ("Mundi", "Terra Nostra", "America", "Marco Zero Mix"); a do condomínio que é também nome de torre fica com a torre ("MBigucci Joy"). O nome sem a marca também vale ("Life MBigucci" → "life"). Só a chave de uma palavra pede contexto. Os bairros e cidades do catálogo viram sugestão de região, menos "Centro". **Catálogo vazio ou fora do ar: vale a lista fixa** de `empreendimentos.ts`, já atualizada (entram Marco Zero One, Elleva, Dom e a chave "modena"; saem Cortina D'Ampezzo e Village da Serra).
- **Mensagens prontas:** variáveis `{endereco}`, `{apresentacao}` (apresentação, book ou página) e `{a_partir_de}`, do empreendimento do lead achado no catálogo. **A linha com uma delas vazia sai da mensagem.** Sem cliente, "Oi, {primeiro_nome}, tudo bem?" vira "Oi, tudo bem?".
- **Visita, venda e lead:** os campos de empreendimento sugerem os ativos do catálogo (ou a lista fixa) e avisam quando o nome digitado não está nele. Continuam texto livre, para não travar o registro.

### Radar de Match (`crm/src/lib/match.ts`)
| Critério | Peso | Regra |
| --- | --- | --- |
| Orçamento | 40 | Preço da tipologia ≤ valor: tudo. Até 10% acima: 60% ("Um pouco acima"). Mais: nada. Sem preço: só o aviso "! Sem preço na tabela", fora da nota. |
| Região | 25 | Bairro: tudo. Mesma cidade: 70%. Fora: 15%. A região do lead é separada por vírgula, barra, "e" e "ou", com apelidos (SBC, São Bernardo, São Caetano, SP, ABC). Se o lead cita uma cidade, o bairro só vale nela ("Centro, SBC" não é o Centro de São Vicente). |
| Dormitórios | 20 | Igual ou mais: tudo. Um a menos: 40%. Studio e loft contam 1. |
| Finalidade | 10 | Morar: tudo. Investir: studio, loft, 1 dorm, sala e loja valem tudo; o resto, metade. Sala e loja só entram para quem investe. |

- A nota do empreendimento é a da melhor tipologia (no empate, a mais barata). Critério vazio não conta. Lead sem perfil não entra.
- **Ficha:** a partir de 50%, da maior nota para a menor, os 4 primeiros e "Ver todos". Cada um com fase, bairro, a tipologia, os motivos ✓ ✕ ! e "Mandar →" (mensagem "Apresentar empreendimento" com esse empreendimento).
- **Clientes compatíveis** (página do empreendimento): a partir de 70%, entre os leads que quem vê enxerga pelo RLS (o corretor, os dele; o gerente, os da equipe). Entram os ativos fora da etapa Venda e os descartados por "fora do perfil". **Os que estão em "aguardando lançamento" vêm primeiro, com a barra vermelha, quando o empreendimento é breve lançamento ou lançamento.**
- Avisos que não mudam a nota: preço de tabela de mês anterior, restrição de renda, empreendimento sem tipologias.

### Testes
- `npm test`: `catalogo.test.ts` (normalização de nomes, `acharNoCatalogo`, lista do Cadastro Mágico com os dados reais, filtros, resumos e as variáveis das mensagens) e `match.test.ts` (pesos, tolerância, região com apelidos e cidade, studio, finalidade, sem preço, avisos, Radar e clientes compatíveis). Os dois usam o JSON real por `catalogo-teste.ts`.
- `npm run test:banco`: `empreendimentos.test.mjs` roda o schema três vezes e a carga duas no PGlite e confere os 46 itens, o "a partir de" de cada um pelo gatilho, que a carga não desfaz edição, o padrão da permissão, a leitura por perfil, a escrita só de quem gerencia, a falta de exclusão, as colunas que o app não grava, os checks e o "a partir de" quando a tipologia muda, esgota ou sai.
- Telas conferidas em 375px com o Supabase falso v8 (pasta de notas das sessões): catálogo, empreendimento com clientes compatíveis, diálogo de mensagem, ficha com o Radar, Cadastro Mágico e edição com salvamento.

### Pendências de dados (com o Felipe)
- **Elleva e Dom sem preço:** ainda não têm tabela (Felipe, 29/10/2026). Entram no catálogo e no Radar sem a nota de orçamento, e os leads deles ficam em "aguardando lançamento", que é justamente o destaque dos clientes compatíveis. Quando a tabela sair, o preço entra pela tela de edição. O Dom não tem tipologia (o site não publica planta); o Elleva tem a planta de 67 m² do site.
- **Cortina D'Ampezzo:** fora do catálogo e da lista fixa. Se voltar, cadastre pela tela.
- **O asterisco do preço promocional:** continua só na nota da tipologia (`preco_nota`). Se for limite de renda, vale preencher a restrição de renda do empreendimento.
- **Tabelas próprias dos 7 em obras:** o "a partir de" segue o da Tabela Promocional.

### Ficou de fora
- Importar a tabela mensal colando o JSON de outra IA (a "Resposta de outra IA" da Bruna). Por ora o preço muda pela tela de edição.
- `empreendimento_id` em leads, visitas e vendas, e o filtro de Leads agrupado pelo catálogo ("Life" e "Life MBigucci" ainda são opções separadas).
- Radar na ficha para o gerente (a página do empreendimento já mostra os clientes da equipe).
- Vagas e área no perfil do lead (o lead não guarda).

### Da Bruna (itens 13 e 14)
| Recurso da Bruna | Como ficou | Por quê |
| --- | --- | --- |
| Catálogo de imóveis com filtros (`app/imoveis/page.tsx`) | Catálogo por torre, com busca e filtros de fase, cidade e bairro, dormitórios e faixa de preço | Um registro por torre, como lá; os filtros são os pedidos da etapa |
| Plantas do mesmo condomínio agrupadas com "a partir de" | Um card por torre com o condomínio no topo, e o "a partir de" calculado pelo banco | O card por torre mostra a fase e a entrega certas (Mundi Thiago pronta, Lucca em lançamento) |
| Importação "Resposta de outra IA" | Não veio; edição pela tela | Com a carga inicial pronta, a importação mensal fica para depois |
| `scoreProperty` (`lib/match.ts`): pesos, 10% de tolerância, motivos ✓/✕, ≥ 50% | Mesma ideia, com pesos 40/25/20/10, sobre a melhor tipologia, com "!" para aviso | O lead não guarda vagas nem área; o tipo virou finalidade |
| `regionMatches` por bairro ou cidade | Bairro, depois cidade (70%), com apelidos e a cidade citada mandando no bairro | "Centro" existe em várias cidades |
| Leads compatíveis por imóvel (≥ 70) | Clientes compatíveis (≥ 70), com "aguardando lançamento" em destaque e os descartados por fora do perfil | É o pedido do lançamento (T8) |
| Botão "Enviar" no Radar (`profile-tab.tsx`) | "Mandar →", com a mensagem pronta e o link da apresentação | Usa os modelos que o gerente geral edita |
| Studio = 1 dorm | Igual no Radar e no filtro | |
| `deleteProperty` | Não veio: `ativo = false` | A MBigucci não apaga |
