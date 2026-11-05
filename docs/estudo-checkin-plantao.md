# Estudo: check-in por localização no plantão

> Estudo de 04/11/2026, a pedido do Felipe. **Só pesquisa e desenho: nada foi implementado, nenhum arquivo existente foi alterado.** Corretores e gerentes farão check-in pela localização, dizendo que estão em um plantão. Para o corretor, controla os períodos (meio dia, valem pontos e roleta). Para o gerente, controla a visita dele aos plantões.
>
> **Nota de 04/11/2026:** o sigilo do programa de verba e a chave "Programa de verba ativo" acabaram (`docs/historico.md`). Onde este estudo diz "atrás da chave", "só com a chave ligada" ou "texto neutro por sigilo", leia "pela permissão": o programa aparece sempre, para quem tem permissão.
>
> **Sumário:** 0. Resposta curta · 1. Viabilidade técnica · 2. Validar a presença · 3. Privacidade e LGPD · 4. Desenho para o corretor · 5. Desenho para o gerente · 6. Modelo de dados, permissões, telas e avisos · 7. Alternativas e recomendação · 8. Riscos, esforço e decisões do Felipe · 9. O que foi conferido e o que não foi · Fontes

## 0. Resposta curta

- **Dá para fazer** no nosso stack, sem servidor novo: o navegador (PWA ou aberto) pega a posição **quando a pessoa toca no botão**, manda para uma função SQL no Supabase, e **o banco** calcula a distância até o plantão e carimba a hora do servidor.
- **Limite que não some:** o banco não consegue saber se o GPS do celular é verdadeiro. A localização barra o esquecimento e o "marquei de casa sem querer"; **não barra** quem quer fraudar (app de GPS falso, ou chamar a função direto com coordenadas inventadas). Isso é aceitável se houver um segundo olhar humano (a recepção) e um plano B barato (código rotativo no tablet da recepção, seção 7).
- **Não dá para acompanhar trajeto** nem conferir a presença em segundo plano: uma página da web só lê a posição com ela aberta. Isso casa bem com a LGPD: check-in e check-out são dois pontos no tempo.
- **Recomendação:** etapa 1 = check-in e check-out por localização, **como evidência** na tela Plantão atual (a recepção continua marcando o período com 1 toque, vendo a presença), com confirmação manual da recepção quando a localização falhar. Marcar o período automaticamente fica para a etapa 2, depois de um piloto de 2 semanas. Gerente usa o mesmo mecanismo, sem gerar pontos.
- **Ponto jurídico antes de começar:** controle de presença com horário e local, para quem é corretor autônomo ou PJ, pode ser lido como subordinação. Decisão 1 da seção 8, para o Felipe levar ao jurídico.

## 1. Viabilidade técnica no nosso stack

O CRM é exportação estática (`output: "export"`), roda tudo no navegador e fala com o Supabase (`docs/crm-arquitetura.md`). Check-in cabe nisso: o navegador lê a posição e chama uma função do Supabase; o cálculo vive no banco.

### O que a API faz

- `navigator.geolocation.getCurrentPosition(ok, erro, opções)` lê a posição uma vez. `watchPosition` acompanha, **e não vamos usá-la**. ([MDN, Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API))
- **Só em contexto seguro (HTTPS).** O site do CRM precisa estar em `https://` (o `mbigucci.com.br` está; confirmar na pasta do CRM). ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API))
- A chamada **pede permissão** ao usuário, a menos que já esteja concedida ou negada. Quanto tempo a permissão dura depende do navegador. ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API))
- `coords.accuracy` é a precisão em **metros, com 95% de confiança**: é um raio provável, não um limite garantido. ([MDN, accuracy](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy))
- Erros: `1` permissão negada, `2` posição indisponível, `3` tempo esgotado. A mensagem do erro é para depuração, **não** para mostrar na tela. ([MDN, GeolocationPositionError](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError))
- Opções que vamos usar: `enableHighAccuracy: true`, `timeout: 15000`, `maximumAge: 0` (nunca aceitar posição velha em cache).
- **Política de permissões do site:** o cabeçalho `Permissions-Policy: geolocation=()` bloqueia a API. Alguns plugins de segurança e hospedagens do WordPress mandam esse cabeçalho. Conferir os cabeçalhos da pasta do CRM antes do piloto. ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API))

### Boas práticas de permissão

Pedir só depois de um toque do usuário, explicar o motivo antes, tratar a negação como definitiva (não insistir) e deixar uma alternativa. Pedidos sem gesto foram aceitos em 12% dos casos contra 30% depois de uma interação. ([web.dev, permissões](https://web.dev/articles/permissions-best-practices)) Para nós: o botão "Registrar chegada" é o gesto; antes do primeiro uso, um card explica o que será coletado (seção 3); se negado, o card ensina a liberar e oferece o plano B.

### iPhone

O que as fontes mostram (relatos de desenvolvedores e um bug do WebKit; **não é documentação oficial da Apple**):

- **PWA instalado (`display: standalone`):** um relato (iPhone 13 mini, iOS 15.1.1, sem resposta da Apple) diz que o aviso de localização não aparece e a chamada nunca expira; em `browser` ou `minimal-ui` funciona. Trocando para o Safari, o aviso aparece lá. ([Apple Developer Forums, 694999](https://developer.apple.com/forums/thread/694999)) É de 2021–2023; **não sei se ainda vale** nas versões atuais do iOS. Testar.
- **Permissão lembrada por pouco tempo:** o bug 275479 do WebKit (Safari 17/iOS 17) descreve que, depois de aceitar o aviso duas vezes em pouco tempo, o Safari devolve a posição por 24 horas sem perguntar. Outro relato, de um PWA dentro de um app Xcode (WebView, **não** é o nosso caso), diz que a escolha é lembrada por cerca de 24 horas. Já o mesmo relato diz que, para o PWA instalado direto na tela inicial, o aviso apareceu só uma vez. ([WebKit 275479](https://bugs.webkit.org/show_bug.cgi?id=275479); [Apple Developer Forums, 775716](https://developer.apple.com/forums/thread/775716)) **Conclusão prudente:** o aviso de permissão pode reaparecer de tempos em tempos; a tela precisa tratar isso sem susto.
- **Permissions API:** `navigator.permissions.query` devolve `prompt` no Safari mesmo com a permissão negada; só "Permitir" com "Lembrar por um dia" resulta em `granted`. Vários relatos de usuários, sem resposta da Apple ([Apple Developer Forums, 751189](https://developer.apple.com/forums/thread/751189)). O WebKit confirmou como erro e o bug foi marcado duplicado do 293089, que, segundo a página, já foi corrigido ("só reporta o estado verdadeiro depois que a API foi usada desde o carregamento da página"). **Consequência:** não depender dela; o sinal confiável é o erro 1 do `getCurrentPosition`.
- "Localização aproximada" (iOS 14+): a busca só achou material sobre apps nativos. **Não achei fonte que diga se o Safari/PWA entrega posição reduzida.** Tratamos assim: se vier reduzida, o `accuracy` vem grande, e a regra da seção 2 devolve "impreciso". Testar em aparelho real.

### Android

Chrome pede permissão como em qualquer site, e o PWA instalado usa a permissão do site. **Não verifiquei em fonte** o comportamento da "localização aproximada" do Android 12+ no Chrome; mesma proteção: olhar o `accuracy`.

### O que falha (e a mensagem de cada caso)

| Situação | Sinal | O que a tela faz |
| --- | --- | --- |
| Permissão negada | erro 1 | Passo a passo para liberar; plano B (pedir confirmação à recepção) |
| GPS desligado ou sem sinal | erro 2 | "Ligue a localização do celular e tente de novo" |
| Dentro do prédio, sem sinal | erro 3 ou `accuracy` alta | "Vá até a porta ou o estande e tente de novo" |
| Localização aproximada | `accuracy` grande | Igual ao caso anterior; plano B depois de 2 tentativas |
| Sem internet | falha na chamada | Guardar a tentativa no aparelho **não** vale: o carimbo de hora é do servidor. Pedir para tentar quando voltar o sinal |
| Aparelho com data errada | irrelevante | A hora é do servidor, não do aparelho |

### Navegador aberto x app instalado

- **Dá nos dois**, porque a leitura é pontual. O PWA instalado é mais cômodo (ícone, avisos de push que já existem em `docs/notificacoes.md`), mas é onde o iPhone mais dá problema de permissão. Orientar: "se o aviso de localização não aparecer no app, abra o CRM no Safari".
- **Não dá, em nenhum dos dois:** ler a posição com a tela apagada ou o app fechado. Não há como conferir presença sozinho ao longo do dia; só no toque. (Limitação conhecida da plataforma web; não achei fonte específica para citar.)
- Para o check-out esquecido, usamos o aviso push do horário (seção 4), que **lembra a pessoa de tocar**, sem ler a posição.

## 2. Como validar a presença

### Cerco geográfico

Cada plantão tem **centro (latitude, longitude) e raio em metros**. O check-in vale se a distância do ponto lido até o centro cabe no raio.

- **Onde guardar:** tabela nova `plantoes` (seção 6). Hoje `empreendimentos` só tem `endereco` em texto, **sem coordenadas** (conferido no `schema.sql`: nenhuma coluna de latitude). Plantão não é obrigatoriamente um empreendimento: há plantões em endereço diferente do da obra (`docs/empreendimentos.md`, seção de endereços: Infinite e Terrazzo têm o número do plantão diferente do da tabela). Por isso `plantoes` tem ligação **opcional** com `empreendimentos`.
- **Como cadastrar sem serviço externo:** na tela de cadastro, o botão "Usar minha localização aqui" (o gerente geral, no plantão, toca e o CRM grava o ponto). Alternativa: colar latitude e longitude do Google Maps. Sem geocodificador externo, sem custo, sem chave.
- **Quem edita:** o gerente geral sempre; o operacional com a permissão `plantoes.gerenciar` (padrão de quem já edita empreendimentos). Os outros só leem a lista.
- **Raio padrão: 150 m**, editável por plantão. É um palpite. GPS em rua aberta costuma errar poucas dezenas de metros; dentro de prédio ou entre torres pode errar bem mais. **Calibrar no piloto** (ver o `accuracy` real dentro de cada estande) e ajustar o raio por plantão.

### Cálculo no banco

Função `plantao_checkin` com `security definer` (modelo das funções do programa: `plantao_corretores`, `ve_programa`). Recebe `plantao_id`, latitude, longitude, precisão e a ação (`entrada` ou `saida`). **O cliente não manda "dentro" nem "fora": manda só o ponto.** A função:

1. Valida a pessoa (`auth.uid()`, ativa, perfil e permissão `plantao.checkin`) e a chave do programa quando for corretor.
2. Valida faixa (latitude -90 a 90, longitude -180 a 180, precisão > 0).
3. Calcula a distância pela fórmula de Haversine em SQL puro. **Não precisa do PostGIS** para distância ponto a ponto; é conta simples e testável com pontos conhecidos.
4. Classifica:
   - **dentro:** distância ≤ raio **e** precisão ≤ 100 m;
   - **fora:** distância - precisão > raio (mesmo com a margem de erro, está longe);
   - **incerto:** o resto (precisão ruim ou borda do raio). A tela pede nova tentativa ou o plano B.
5. Grava a presença com a **hora do servidor** (`now()`), a distância arredondada, a precisão e o método. **Não grava latitude nem longitude** (seção 3).
6. Limita a taxa: no máximo 1 tentativa a cada 20 s por pessoa, para o aparelho não "martelar" a função até cair dentro do raio.

### Limites de confiança (o que dá e o que não dá para mitigar)

| Ameaça | O que o desenho faz | Resta |
| --- | --- | --- |
| Check-in esquecido ou de longe, sem querer | Raio e precisão barram | Nada |
| Corretor marca por outro (pega o celular do colega) | Sessão do Supabase é por pessoa; cada pessoa só registra a própria presença | Colega com o celular **e** a senha. Raro; o piloto mostra |
| App de GPS falso, ou "sensor" do DevTools | **Nada no navegador impede.** O banco só vê números | Mitigação cabível: a recepção confere visualmente (a tela Plantão já existe) e há relatório de distâncias suspeitas (sempre exatamente no mesmo ponto, distância 0 m) |
| Chamar a função direto com coordenadas inventadas | Idem: é a mesma entrada | Mesma mitigação. Só o **código rotativo** da seção 7 fecha isso de verdade |
| Check-in remoto "só para registrar" e sair | Check-out exige nova leitura no raio; duração mínima por período (decisão do Felipe) | Quem fica 2 min no raio e vai embora: a tela do gerente mostra a duração, e o gerente vê |

**Sem exagero:** não vamos fazer foto de rosto, biometria, leitura de rede Wi-Fi nem checagem de aparelho. Custo e atrito altos para um risco que a recepção e o relatório já cobrem.

## 3. Privacidade e LGPD

**Localização é dado pessoal** (identifica onde a pessoa está, quando). A LGPD (Lei 13.709/2018) exige finalidade, necessidade (coletar o mínimo) e transparência. O texto da lei **não foi lido neste estudo** (só fontes secundárias, abaixo); isto é orientação técnica, **não parecer jurídico**.

Desenho para ser o mais enxuto possível:

- **Coleta pontual:** só no toque em "Registrar chegada" ou "Registrar saída". Nunca `watchPosition`, nunca em segundo plano, nunca ao abrir o app.
- **Guardar o mínimo:** hora (servidor), **distância até o plantão arredondada em metros**, precisão e o resultado (dentro, fora, incerto). **Não guardar o ponto no mapa.** O ponto trafega do aparelho ao Supabase por HTTPS e é descartado depois do cálculo. Ressalva: o ponto aparece nos parâmetros da chamada; **verificar** se o log da API do Supabase, no plano contratado, retém o corpo da requisição (não verificado; a conferir no painel do Supabase antes do piloto).
- **Retenção (proposta, a decidir):** tentativas fora ou incertas, **30 dias**; presenças que sustentaram um lançamento, **12 meses** (acompanha a janela de fechamento e dúvida). Depois, o job do `pg_cron` apaga distância e precisão e mantém só entrada, saída e plantão.
- **Quem vê:** a própria pessoa; o gerente, a equipe dele; a recepção, só o que precisa para marcar o período; o gerente geral, tudo. Nunca fora do CRM.
- **Aviso claro, antes do primeiro uso** (card, com "Entendi" que grava o aceite com data): ver textos na seção 6.
- **Base legal:** consentimento em relação de trabalho é frágil, porque o poder é desigual (as fontes secundárias batem nisso). O caminho provável é execução de contrato ou legítimo interesse, com finalidade específica e limitada à jornada. **Decisão do jurídico**, não minha.
- **Alternativa sempre disponível:** quem não quiser ou não puder usar a localização pede confirmação à recepção (plano B). Sem isso, o "aceite" não é livre.
- **Sigilo do programa:** nenhum texto que o corretor lê cita verba, pontos que viram verba, ranking ou o programa. O corretor lê "Plantão", "Presença", "Registrar chegada". O vínculo com os lançamentos de pontos fica **no banco e nas telas da recepção e do gerente geral**, atrás de `private.ve_programa()`. Ver seção 4.

## 4. Desenho para o corretor

### Situação atual (conferida em `crm/src/app/plantao/page.tsx`)

- O corretor **não tem tela de plantão**. A recepção marca "Cumpriu o período" (manhã 9h–14h, tarde 14h–19h) ou "Saiu para visita" (com o link da foto), e isso gera lançamento **pendente** que só o gerente geral aprova (`docs/pontuacao-verba.md`).
- Regra de hoje: **ninguém lança para si**. A política de insert de `lancamentos_pontos` exige `corretor_id <> auth.uid()`. O check-in muda a origem (a própria pessoa afirma a presença), então **não pode** reaproveitar essa política. Ver "Ligação com o lançamento".

### Fluxo

1. O corretor abre o CRM e toca em **Registrar chegada** (tela nova **Meu plantão**, ou card na tela inicial no horário do plantão).
2. O CRM lê a posição, a função calcula e responde: ✓ no plantão, ! longe do plantão ou ! sem precisão.
3. Ao sair, toca em **Registrar saída**. Mesma validação.
4. A presença (entrada, saída, duração) aparece na tela Plantão da recepção e do gerente geral **ao lado do corretor**.

### Ligação com o lançamento e a aprovação

**Etapa 1 (recomendada):** a presença é **evidência**, não lançamento. A recepção vê "Chegou 9:04 · saiu 13:58 · dentro do raio" e toca em "Cumpriu o período", como hoje. Nenhuma mudança na aprovação, na roleta ou no sigilo. Vantagem: zero risco para pontos e dinheiro enquanto calibramos o raio.

**Etapa 2 (depois do piloto):** a função de saída cria o lançamento **pendente** do período quando a presença cobre a janela (regra abaixo), por uma rota própria `security definer` (`lancado_por` = a própria pessoa, sinalizado com `origem = 'checkin'`). O gerente geral continua sendo o único que aprova. A recepção vira a conferência. Isso exige ajustar a política de insert **apenas** para essa função, nunca liberar o insert direto ao corretor.

### Regra de cobertura do período (a decidir)

Sugestão: o período vale se a pessoa estava presente em pelo menos **80%** da janela (manhã 9h–14h = 5 h, mínimo 4 h; tarde 14h–19h, idem), com tolerância de **30 min** na chegada. Percentual e tolerância em `app_settings`, editáveis pelo gerente geral, sem mudar código.

### Casos de borda

| Caso | Tratamento |
| --- | --- |
| **Fora do raio** | "! Você está a 480 m do plantão. Chegue mais perto e tente de novo." Não registra presença; registra a tentativa (30 dias). Depois de 2 falhas, oferece **Pedir confirmação à recepção** |
| **Esquecimento de saída** | Aviso push às 18h50 (ou 13h50, se só manhã) "Registre sua saída do plantão". Às 19h30, job do `pg_cron` fecha a presença como **sem saída**: o período **não** é cumprido sozinho; a recepção decide e corrige, e o motivo fica na auditoria |
| **Dois períodos no mesmo dia** | Uma presença contínua das 9h às 19h cobre manhã **e** tarde: o cálculo é por janela, sobre a mesma entrada e saída. Quem sai às 14h e volta tem duas presenças. O índice único (um período por corretor, dia e turno) continua valendo |
| **Saiu para visita** | Segue como hoje: a recepção marca com a foto. A presença **não fecha**; a saída para visita é um evento dentro dela (etapa 2: botão "Saí para visita" com o link da foto) |
| **Chegou atrasado ou saiu cedo** | Mostra a duração; a regra de cobertura decide; a recepção pode forçar com observação |
| **Dois plantões no mesmo dia** | Uma presença aberta por vez por pessoa (índice único parcial); para trocar, registrar saída antes |
| **Celular sem localização** | Plano B: a recepção toca em "Confirmar presença" (método `confirmado_recepcao`, quem confirmou na auditoria) |
| **Fuso e dia** | Janelas em horário de São Paulo, como já faz `docs/notificacoes.md` (seção 4) |

## 5. Desenho para o gerente

> **Nome:** "visita" já é tabela (`visitas`, do cliente no estande, `docs/visitas.md`), critério de pontos e gatilho (`visita_lanca_pontos`). Na tela, mantém-se a palavra do Felipe ("visita do gerente ao plantão"). **No banco, em permissão e em chave de aviso, usar "passagem" ou "presença do gerente"**, nunca "visita": por isso a permissão abaixo se chama `plantao.passagens_ver`.

- **Mesmo mecanismo, tabela única** (`plantao_presencas` com `papel = 'gerente'`), por simplicidade: mesma função, mesma tela, mesmo aviso. O que muda: **gerente não gera lançamento de pontos** (a regra do projeto é que o gerente "não vende e não pontua", `docs/acessos-perfis.md`) e **não entra** no controle de períodos nem na roleta.
- **Registro de visita:** quem, em qual plantão, entrada, saída, duração. Check-in e check-out iguais aos do corretor, com a mesma privacidade.
- **Quem vê:** o gerente vê as próprias visitas; o gerente geral vê todas.
- **Relatório do gerente geral** (nova seção na tela Plantão ou tela **Visitas aos plantões**, só do gerente geral):
  - por plantão: última visita, visitas na semana e no mês, duração média;
  - por gerente: visitas na semana por plantão, e os **plantões sem visita há N dias** (limiar em `app_settings`);
  - lista do dia: quem está no plantão agora (gerentes e, se permitido, corretores da equipe).
- **O gerente também pode ver "quem está no plantão agora" da equipe dele** (a mesma regra de visibilidade dos lançamentos, `pode_ver_dados_de`), útil para cobrar sem ligar.
- Aviso opcional ao gerente geral: "Plantão X sem visita de gerente há 7 dias" (tipo novo de aviso).

## 6. Modelo de dados, permissões, telas, textos e avisos

### Tabelas (proposta, a implementar na etapa própria)

```text
plantoes
  id uuid pk, nome text, endereco text,
  empreendimento_id uuid null references empreendimentos,
  lat numeric(9,6), lng numeric(9,6), raio_m int default 150 check (raio_m between 30 and 1000),
  ativo boolean default true, criado_por, created_at, updated_at

plantao_presencas
  id uuid pk, plantao_id references plantoes, pessoa_id references profiles,
  papel text check in ('corretor','gerente'),
  dia date,                       -- dia de São Paulo da entrada
  entrada_em timestamptz default now(), entrada_dist_m int, entrada_precisao_m int,
  entrada_metodo text check in ('gps','confirmado_recepcao'),
  saida_em timestamptz null, saida_dist_m int null, saida_precisao_m int null,
  saida_metodo text null check in ('gps','confirmado_recepcao','automatica','corrigida'),
  status text check in ('aberta','fechada','sem_saida'),
  confirmado_por uuid null references profiles, observacao text null
  -- índice único parcial: uma presença aberta por pessoa (where status = 'aberta').
  -- NÃO usar saida_em is null: presença fechada como sem_saida fica com saida_em nulo e travaria o check-in seguinte.

plantao_tentativas   -- diagnóstico, 30 dias
  id, pessoa_id, plantao_id, quando, acao, resultado, dist_m, precisao_m

plantao_presencas_historico   -- auditoria (modelo de lancamentos_pontos_historico), só o gatilho escreve
```

Aceite do aviso de privacidade: coluna `checkin_aceite_em` em `profiles` ou linha própria (decidir na etapa).

### Funções

`plantao_checkin(plantao_id, lat, lng, precisao, acao)` (seção 2), `plantao_confirmar(presenca_id, ...)` (recepção, plano B), `plantao_presencas_do_dia(dia)` (para a tela), `plantao_fechar_esquecidas()` (job).

### RLS por perfil

Sem `insert`/`update` direto para ninguém: **toda escrita passa pelas funções.**

| Perfil | Lê `plantao_presencas` |
| --- | --- |
| Corretor | As próprias. **Só com a chave do programa ligada** (o check-in do corretor nasce atrás de `private.ve_programa()`) |
| Gerente | As próprias e as da equipe (`pode_ver_dados_de`) |
| Recepção, operacional (`plantao.registrar`) | Só presenças de **corretor**, do dia e da semana, para marcar períodos |
| Gerente geral | Todas, e a auditoria |

`plantoes`: leitura para todo usuário ativo que tenha `plantao.checkin`; escrita só `plantoes.gerenciar`.

### Permissões em `role_permissions` (descrições neutras, o catálogo é lido por todos)

| Slug | Descrição | Padrão |
| --- | --- | --- |
| `plantao.checkin` | Registrar a própria chegada e saída em um plantão | corretor, gerente |
| `plantao.confirmar` | Confirmar a presença de uma pessoa no plantão | recepção, operacional (já têm `plantao.registrar`; pode reaproveitar) |
| `plantoes.gerenciar` | Cadastrar e editar os locais de plantão | operacional (o gerente geral tem todas sempre) |
| `plantao.passagens_ver` | Ver as passagens de gerentes pelos plantões | só o gerente geral (sem linha: ele tem todas) |

Como em `docs/pontuacao-verba.md`, o padrão entra só na criação da permissão.

### Telas (Design System: card com barra de 4px, uma ação vermelha por grupo, sem sombra, sem ícone nem emoji, glifos ✓ ! ✕)

**Mockup primeiro, parar para o Felipe ver**, conforme a regra do projeto. Telas:

1. **Meu plantão** (corretor e gerente, 375px): um card com barra `brand` e o botão vermelho **Registrar chegada**; depois da chegada vira card com a hora e o botão **Registrar saída**. Estados: carregando, dentro, longe, sem precisão, permissão negada (com passo a passo), sem plantão cadastrado.
2. **Card de aviso de privacidade** (1ª vez).
3. **Plantão (recepção e gerente geral), mudança:** em cada corretor, uma linha "Chegou 9h04 · saiu 13h58 · ✓ no plantão" e o botão **Confirmar presença** para o plano B.
4. **Visitas aos plantões** (gerente geral): cards por plantão e por gerente, com "sem visita há N dias".
5. **Locais de plantão** (gerente geral e operacional): lista, edição, botão "Usar minha localização aqui", raio.

### Textos (pt-BR, frases curtas, imperativo, sem exclamação, sem citar verba, ranking nem programa)

| Onde | Texto |
| --- | --- |
| Aviso de privacidade | "O CRM usa sua localização só quando você toca em Registrar chegada ou Registrar saída. Não acompanha seu trajeto. Guardamos a hora e a distância até o plantão, não o ponto no mapa. Se preferir, peça à recepção para confirmar sua presença." Botão: "Entendi" |
| Botões | "Registrar chegada" · "Registrar saída" · "Pedir confirmação à recepção" |
| Sucesso | "✓ Chegada registrada no plantão Infinite às 9h04." |
| Longe | "! Você está a 480 m do plantão. Chegue mais perto e tente de novo." |
| Imprecisão | "! Não foi possível confirmar onde você está. Vá para um lugar aberto e tente de novo." |
| Negada | "! O CRM não pode usar sua localização. Libere nas configurações do navegador e tente de novo." (+ passo a passo por aparelho) |
| Lembrete de saída (push) | "Registre sua saída do plantão." |
| Sem saída | "! Saída não registrada. A recepção vai conferir." |

### Avisos

Tipos novos em `TIPOS_AVISO` (função `avisos`, `crm/src/lib/avisos.ts`, check `push_assinaturas_tipos` e `v_todos` de `push_assinar`, conforme `docs/notificacoes.md`, seção 9): **lembrete de saída** (corretor e gerente), **sem visita há N dias** (gerente geral). Chave de não repetir, por exemplo `saida:<presença>:<dia>`. Textos neutros para o corretor, sem citar pontos.

## 7. Alternativas mais simples e baratas

| Alternativa | Prós | Contras |
| --- | --- | --- |
| **A. Só confirmação da recepção** (já existe; o "Cumpriu o período" de hoje) | Custo zero. Sem LGPD de localização | Não há controle do gerente; depende da recepção estar presente; a visita do gerente fica sem registro |
| **B. QR code fixo do plantão** (imprime e cola) | Barato, sem permissão de localização | Qualquer um fotografa o QR e marca de casa. **Pior que o GPS.** Só serve com foto junto |
| **C. Código rotativo no tablet da recepção** (6 dígitos que mudam a cada ~60 s, gerados e validados no banco, com segredo por plantão) | **Prova que a pessoa estava diante do tablet**; fecha a fraude de GPS falso; sem permissão de localização, sem LGPD de posição | Depende do tablet e de a recepção estar lá. Digitar 6 números. Plantão sem tablet não serve. O tablet existe hoje (`/plantao/` roda "no celular ou no tablet da recepção") |
| **D. Check-in manual com foto** (selfie ou foto do estande, link como o da saída para visita) | Evidência humana, simples | Trabalho de conferir foto; foto tem rosto (também dado pessoal); fácil de reaproveitar |
| **E. Confirmação do gerente** (o gerente toca "corretor presente") | Reforça o controle humano | O gerente não está sempre no plantão; vira trabalho para ele |
| **F. GPS** (o que o Felipe pediu) | Atrito baixo, automático, dá a visita do gerente também | Falsificável; falha dentro de prédio e em alguns iPhones; exige aviso de privacidade |

### Recomendação

**Seguir o pedido do Felipe (F), com A como plano B, e deixar C pronto como reforço se o relatório mostrar fraude.**

1. **Etapa 1:** F como evidência + plano B (recepção confirma) + visita do gerente. Nada de pontos automáticos.
2. **Piloto de 2 semanas** em 1 ou 2 plantões, medindo: taxa de falha de localização por aparelho, `accuracy` real dentro dos estandes, distâncias suspeitas.
3. **Etapa 2:** criar o lançamento pendente na saída (seção 4) e, se houver fraude, somar o código rotativo C.

Por quê: o GPS é o que o Felipe pediu e cobre o corretor e o gerente com o mesmo mecanismo; o plano B resolve as falhas (que serão comuns no iPhone em PWA); o código rotativo é a única defesa real contra GPS falso e só vale a pena se o problema existir.

## 8. Riscos, esforço e decisões

### Riscos

| Risco | Gravidade | Mitigação |
| --- | --- | --- |
| Vínculo trabalhista (controle de local e horário de autônomo/PJ) | Alta, depende do jurídico | Decisão 1; limitar à finalidade, não rastrear |
| Fraude de GPS | Média | Recepção confere, relatório de suspeitas, código rotativo se preciso |
| PWA no iPhone não pede permissão | Média | Orientar a abrir no Safari; plano B |
| Raio mal calibrado barra gente que está lá | Média | Piloto; raio editável por plantão; "incerto" não vira "fora" |
| Pontos e dinheiro dependem do GPS | Alta | Etapa 1 só evidência; a aprovação do gerente geral continua |
| Quebra de sigilo antes de novembro (texto no código) | Alta | Textos do corretor neutros; check-in do corretor atrás de `ve_programa()`; revisar o código publicado |
| Log do Supabase guardar o ponto | Média, a conferir | Verificar no painel antes do piloto |
| Cabeçalho `Permissions-Policy` do WordPress bloquear | Baixa, fácil de checar | Conferir antes |
| Choque de arquivos com a lista de melhorias e Parcerias (`schema.sql`, telas) | Baixa | Etapa só começa com os outros itens entregues |

### Esforço por etapa (estimativa em dias de trabalho, sem teste no aparelho do Felipe; chute, não medição)

| Etapa | Dias |
| --- | --- |
| 0. Mockup das telas (para o Felipe aprovar) | 0,5 |
| 1. Banco: `plantoes`, `plantao_presencas`, funções, RLS, auditoria, testes de banco (distância com pontos conhecidos, perfil a perfil) | 2 |
| 2. Tela Meu plantão + cartão de privacidade + estados de erro | 1,5 |
| 3. Cadastro de plantões + mudança na tela Plantão da recepção (evidência e confirmar) | 1,5 |
| 4. Visitas do gerente e relatório do gerente geral | 1,5 |
| 5. Avisos (lembrete de saída, sem visita) + fechamento automático | 1 |
| 6. Piloto e calibração em 2 plantões, em iPhone e Android reais | 1 (mais 2 semanas de calendário) |
| **Total etapa 1** | **cerca de 8 dias** |
| 7. Etapa 2: lançamento automático pendente + saída para visita no check-in | 2 |
| 8. Reforço opcional: código rotativo (C) | 2 |

### Decisões que só o Felipe toma

1. **Natureza do vínculo.** Os corretores são CLT, PJ ou autônomos? Controlar presença por localização pode pesar na análise de subordinação, e o jurídico precisa ver antes.
   - (recomendada) Levar o desenho ao jurídico antes da etapa 1;
   - Seguir sem consultar;
   - Limitar o check-in só ao gerente, por enquanto.
2. **Escopo da etapa 1.**
   - (recomendada) Evidência na tela da recepção, sem criar lançamento sozinho;
   - Já criar o lançamento pendente na saída;
   - Só a visita do gerente.
3. **Regra de cobertura do período.**
   - (recomendada) 80% da janela e 30 min de tolerância, editável em configurações;
   - Presença em qualquer momento da janela já vale;
   - Janela inteira, sem tolerância.
4. **Retenção.**
   - (recomendada) Tentativas 30 dias; presenças 12 meses, depois só entrada e saída;
   - 6 meses para tudo;
   - Guardar sem prazo.
5. **Esquecimento de saída.**
   - (recomendada) Fecha como "sem saída" às 19h30, a recepção decide;
   - Fecha com o horário do fim da janela, valendo o período;
   - Não fecha sozinho.
6. **Falha de localização.**
   - (recomendada) Plano B: a recepção confirma a presença;
   - Sem plano B: se não deu, não vale;
   - Plano B com selfie.
7. **Gerente no controle.**
   - (recomendada) Fluxo separado: registra a visita, não entra em períodos nem roleta;
   - Gerente entra na lista de presença do plantão como os corretores;
   - Só relatório para o gerente geral, sem tela para o gerente.
8. **Plantões a cadastrar e raio.**
   - (recomendada) Gerente geral cadastra os locais no plantão, com o botão da localização, raio inicial 150 m e ajuste no piloto;
   - Operacional também cadastra;
   - Um raio único para todos.
9. **Quem faz o piloto.**
   - (recomendada) 1 ou 2 plantões, 2 semanas, com a recepção cobrando;
   - Todos de uma vez;
   - Só gerentes, depois corretores.
10. **Sigilo no check-in do corretor.** O botão do corretor existe só com a chave "Programa de verba ativo" ligada (depois da reunião de novembro)?
    - (recomendada) Sim, atrás da chave;
    - Não, o check-in é só de presença e vale já (os textos continuam neutros, mas o código fica publicado antes da reunião);
    - Liberar só para gerentes até a reunião.

### Respostas do Felipe (04/11/2026)

| # | Decisão |
| --- | --- |
| 1 e 2 | **Etapa 1 = só o check-in do gerente.** O corretor terá check-in **depois**, numa etapa futura, com o jurídico consultado antes |
| 7 | O gerente **só marca "passei no estande"**: um check-in, sem saída nem duração. Não entra em períodos nem roleta |
| Corretor hoje | A presença do corretor é a da recepção: **a entrada é estar na roleta do dia**, e **a saída e a volta são marcadas pela recepção**, como já faz na planilha (aba `ROLETA`, ver `docs/estudo-recepcao.md`) |
| 3 | Para o período do corretor (quando o check-in dele existir, e para a presença marcada pela recepção): **80% do período, com 30 min de tolerância**, editáveis em Configurações |
| 5 | Sem saída: **fecha como "sem saída" às 19h30 e a recepção decide** |
| 8 | Cadastram os plantões: **gerente geral e operacional**. **Raio de 200 m**, porque os plantões são grandes |
| 6 | Falha de localização: **plano B com selfie** |
| 4 | Retenção: **selfie 30 dias**; a visita do gerente fica **12 meses sem coordenadas** (quem, onde e quando) |
| 9 | **Todos os gerentes de uma vez**, sem piloto |
| 10 | Perdeu o sentido: o sigilo acabou em 04/11/2026 (`docs/codex-fim-do-sigilo.md`) |

## 9. O que foi conferido e o que não foi

**Conferido (lido nesta sessão):** `CLAUDE.md`; `docs/pontuacao-verba.md`, `docs/acessos-perfis.md`; trechos de `docs/empreendimentos.md` (endereços do plantão), `docs/notificacoes.md` (cron, tipos, não repetir), `docs/design-system.md` (tokens) e `docs/visitas.md` (só o começo, até a seção 3); `crm/src/app/plantao/page.tsx` inteiro (turnos, quem marca, "ninguém lança para si"); `crm/supabase/schema.sql` nos trechos de `permissions`, `role_permissions`, `visitas`, `lancamentos_pontos`, `empreendimentos`, `plantao_corretores` e políticas de `lancamentos_pontos` (e que não há coordenadas no schema); MDN (Geolocation API, `accuracy`, `GeolocationPositionError`); web.dev (permissões); as quatro páginas do fórum da Apple e do WebKit citadas na seção 1 (abertas, mas são relatos de usuários, não documentação da Apple).

**Não conferido:**
- **Nenhum teste em aparelho real** (iPhone, Android, PWA instalado). Tudo sobre iOS vem de relatos de desenvolvedores, não da Apple.
- Localização aproximada no Safari/PWA e no Chrome Android 12+.
- Comportamento exato de `accuracy` dentro dos estandes e o raio de 150 m (palpite).
- Que o site do CRM está em HTTPS e sem `Permissions-Policy` bloqueando; que o log do Supabase não retém o ponto.
- O texto da LGPD e qualquer posição da ANPD. As fontes de LGPD (Migalhas, Conjur e outras) vieram só como **resumo de busca, não abertas**; não é parecer jurídico.
- **Nenhuma fonte do Chrome/Google** sobre geolocalização aproximada no Android; não busquei documentação do developer.chrome.com.
- Que o padrão `security definer` com `private.*` proposto bate com `docs/crm-arquitetura.md` (não li a seção de RLS e funções; a base é o que vi no `schema.sql`: `private.ve_programa()`, `has_permission`, `pode_ver_dados_de`).
- O restante de `docs/visitas.md` (seções 4 em diante).
- Que "não há leitura em segundo plano na web" (limitação conhecida; sem fonte citada aqui).
- `docs/leads.md`, `docs/crm-arquitetura.md` e `docs/teste-carga.md` foram lidos só por busca de termos, não integrais.
- Se o plantão corresponde 1 a 1 a um empreendimento (o desenho assume que não).
- As estimativas de esforço são chute.

## Fontes

- [MDN, Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [MDN, GeolocationCoordinates.accuracy](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy)
- [MDN, GeolocationPositionError](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError)
- [web.dev, Permissões: boas práticas](https://web.dev/articles/permissions-best-practices)
- [Apple Developer Forums: alerta de localização não abre em PWA](https://developer.apple.com/forums/thread/694999)
- [Apple Developer Forums: permissão lembrada por 24 horas](https://developer.apple.com/forums/thread/775716)
- [Apple Developer Forums: Geolocation não funciona em alguns iOS](https://developer.apple.com/forums/thread/751189)
- [WebKit bug 275479](https://bugs.webkit.org/show_bug.cgi?id=275479)
- LGPD e geolocalização no trabalho (fontes secundárias, **só vistas em resumo de busca, não abertas**): [Migalhas](https://www.migalhas.com.br/depeso/372828/a-geolocalizacao-como-fonte-de-prova-no-processo-do-trabalho), [Conjur](https://www.conjur.com.br/2023-mai-04/prestes-ferreira-utilizacao-prova-geolocalizacao//?print=1)
