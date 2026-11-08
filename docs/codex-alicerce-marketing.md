# Brief: fase 2 do Alicerce, bloco 7: o app do Marketing

Sumário: Leia antes · O que o Felipe pediu · Decisões técnicas · Etapas · Arquivos permitidos · Pronto quando · Limites.

## Leia antes
- `CLAUDE.md` (raiz), seções Convenções e Armadilhas: o prefixo `mb-` é do Alicerce, e classe do app nunca começa com `mb-`.
- `docs/codex-alicerce-fase2.md`: as regras da fase 2, que valem aqui também.
- `docs/cobertura-alicerce.md`, seções 1 (tabela do Marketing), 3 (Marketing) e 7 (decisões de 06/11/2026, itens 1 a 4).
- `docs/design-system.md`, seção 2: como as telas do Vendas já migradas ficaram.
- O guia do Alicerce em `crm/src/alicerce/guia/`: o `README.md` e o guia de **cada** peça antes de usá-la, principalmente `MenuLateral`, `BarraSuperior`, `MenuCelular`, `MenuDaConta`, `ConstrutorDeCondicoes`, `Interruptor`, `Dialogo`, `PainelLateral`, `Lista`, `Cartao`, `Campo`, `Seletor`, `DataHora`, `Toast`, `EstadosDePagina`, `MinhaConta`, `Entrar`, `Aparencia` e `Vocabulario`.
- `crm/src/alicerce/LEIAME.md`: versão `1794126571-2f68` e os hashes.
- Como o Vendas monta o Alicerce:
  - `crm/src/app/layout.tsx` (`tokens.css`, `bundle.css`, `alicerce-local.css` e o `bundle.js`);
  - `crm/src/components/alicerce/`, as peças em React;
  - `crm/src/components/casca.tsx`, a moldura.
- O app de hoje: `marketing/` e, para a regra de negócio do Direcionador, `docs/direcionador/direcionador.md` (seção 16, "Como ficou").
- O padrão de cópia conferida que o repositório já usa: `marketing/src/lib/copias.test.ts` e `crm/supabase/functions/entrada-leads/gerar.mjs`.

## O que o Felipe pediu
- **06/11/2026** (`docs/cobertura-alicerce.md`, seção 7):
  - O Marketing vai para o Alicerce com a sua sessão master.
  - **Componentes, opção A:** cópia gerada a partir do Vendas e conferida pelo `npm test`.
  - **Direcionador, as duas mudanças aceitas:**
    - ao desligar uma regra que está distribuindo, abre o `Dialogo` com o efeito escrito;
    - o simulador é montado com `Cartao`, `Campo`/`Seletor`/`DataHora` e `Lista`.

    O "resultado antes de salvar" fica fora (item 49).
  - **Trocar de módulo:** o item Módulos no rodapé do `MenuLateral`, acima de "Recolher menu", só com os módulos que a pessoa pode abrir e o atual com ✓. No celular, é o grupo Módulos na folha. Quem só tem um módulo não vê.
  - **404 em português** com `EstadosDePagina`, e o `error.tsx` com "Erro de carga" e "Tentar de novo".
- **08/11/2026:** a fase 2 anda **sem consultar o Felipe a cada bloco**. Ele vê o relatório da fase inteira no fim. Quem aprova as capturas deste bloco é a sessão principal do Marketing.

## Decisões técnicas
- **Escopo:** moldura, Direcionador, Início, Minha conta, Entrar, 404 e erro do app `marketing/`. Mesma lógica e mesmos dados: só a apresentação muda, mais as duas mudanças aceitas no Direcionador.
- **Cópia gerada (opção A):**
  - um script `marketing/scripts/copiar-alicerce.mjs` copia para o `marketing/` o que o app usa de `crm/src/alicerce/` (tokens, bundle.css, fontes, guia não precisa), de `crm/public/alicerce/` (bundle.js e logotipo) e de `crm/src/components/alicerce/` (só as peças usadas);
  - cada arquivo copiado ganha no topo o aviso "Cópia gerada de crm/…, não edite aqui; rode node scripts/copiar-alicerce.mjs";
  - um teste (`marketing/src/lib/alicerce-copia.test.ts` ou no padrão de `copias.test.ts`) falha quando a cópia difere da fonte;
  - ajuste nos imports das peças (`@/…`) é feito pelo script, nunca à mão.
- **Peça que só existe como classe:** se o guia descreve uma peça (por exemplo `ConstrutorDeCondicoes` ou `Dialogo`) e não há componente React em `crm/src/components/alicerce/`, monte no `marketing/` um componente local com as classes `.mb-*` do `bundle.css`, como o guia mostra. Classe própria do app nunca começa com `mb-`.
- **Faltou algo no Alicerce:** **não edite** a cópia nem a fonte. Anote na entrega com o que falta e por quê; a sessão principal do Marketing leva o pedido à sessão do Alicerce.
- **Ajuste local** vai num `marketing/src/app/alicerce-local.css`, com o porquê de cada regra.
- **Moldura:** `MenuLateral`, `BarraSuperior` e `MenuCelular` com `data-mb-marca="Marketing"`, como no Vendas.
  - **Menu:** só Direcionador, para o gerente geral.
  - **Botão +:** o "+ Nova regra" vira o + do módulo no topo.
  - **Lockup:** "Base360 · Marketing" cabe em 320px.
  - **Módulos:** Vendas e Marketing. O Repasse aparece se a moldura do Vendas já o mostra; siga o que o Vendas faz.
- **Direcionador:**
  - **Regras:** `ConstrutorDeCondicoes` no modo Direcionador ("Se o lead chegar com" / "Então"), com produto, fonte, dias, horário e a divisão em porcentagem para os destinos.
  - **Chaves:** `Interruptor` na chave geral e em cada regra. Desligar uma regra que distribuiu leads (contador maior que zero) abre o `Dialogo` dizendo o efeito, por exemplo "Os leads que esta regra mandaria passam para a próxima regra ou para o Base360 Vendas".
  - **Destinos:** `Lista` com o editor no `PainelLateral`, com endereço mascarado, limite do dia e "Registrar os envios".
  - **Simulador:** `Cartao` com `Seletor`, `DataHora` e `Lista` dos passos (casou, pulada e por quê).
  - **Avisos:** `Toast`.
- **Sigilo, como sempre:** nenhum nome de destino no código, nos textos fixos, nas capturas de teste ou nos commits. Os nomes vêm só do banco. Nas capturas, use os dados fictícios do Supabase falso (`marketing/local/supabase-falso.mjs`).
- **Testes que já existem continuam passando:** `npm test` do `marketing/` (32 hoje) e `copias.test.ts`. A regra pura `direcionador.ts` não muda.

## Etapas
1. **Cópia gerada e moldura:** o script, o teste da cópia, o layout com tokens, bundle e o `bundle.js`, e a casca com menu, topo, celular e Módulos. Capturas da moldura vazia em 375px e desktop, nos temas papel e grafite.
2. **Telas:** Direcionador (com as duas mudanças), Início, Minha conta, Entrar, 404 e erro.
   - Capturas de cada tela em 375px e desktop, nos dois temas, mais 320px para o lockup e o Direcionador.
   - O caso "corretor sem acesso".
   - O `Dialogo` de desligar uma regra que distribui.
   - Guarde em `marketing/local/alicerce/`.
   - Em cada peça, cite a linha do guia que justifica o uso.
   - **Pare** e entregue à sessão principal do Marketing.
3. **Ajustes da revisão**, depois `npm test`, `npx tsc --noEmit` e `next build` (com `BASE_PATH=/marketing` e variáveis falsas, num `out/` que você apaga depois). Atualize a seção 2 de `docs/design-system.md` com a linha do bloco 7 e a seção 3 de `docs/cobertura-alicerce.md` com "como ficou".

## Arquivos permitidos
- **Criar e alterar:** tudo em `marketing/`, menos `marketing/node_modules`; mais a linha do bloco 7 em `docs/design-system.md` e a seção 3 de `docs/cobertura-alicerce.md`.
- **Não tocar:**
  - `crm/` inteiro: só leitura, porque a fase 2 do Vendas está em andamento lá;
  - `crm/src/alicerce/` e `crm/public/alicerce/`: só leitura, como fonte da cópia;
  - `ref/`, `portal/`, `discovery/`, `marca/`;
  - os arquivos soltos de outras frentes em `docs/`.

## Pronto quando
- As telas do bloco usam só peças e classes do Alicerce. A cópia gerada bate com a fonte, e o teste da cópia falha se alguém mudar um lado.
- O Direcionador faz tudo o que fazia (`docs/direcionador/direcionador.md`, seção 16) e:
  - o `Dialogo` aparece ao desligar uma regra que distribuiu;
  - o simulador responde como antes.
- Há capturas em 375px e desktop nos dois temas, em 320px no lockup, sem rolagem lateral, e o corretor continua sem acesso.
- `npm test` do `marketing/`, `npx tsc --noEmit` e `next build` passam.
- A busca de sigilo no `out/` de teste, no código e nos textos não acha nenhum nome de destino.
- As linhas de `docs/design-system.md` e `docs/cobertura-alicerce.md` estão atualizadas.

## Limites
- **Execução:**
  - testes isolados e o Supabase falso, nunca o real nem credenciais reais;
  - não instale pacote novo: o `marketing/` já tem os mesmos do `crm/`. Se faltar algum, pare e peça;
  - um Chrome headless por vez e uma conferência por vez, para não travar o PC do Felipe;
  - não rode a suíte nem o build do `crm/`.
- **Sem commit:** a sessão principal do Marketing revisa e commita.
- **Modelo:** você roda no Sonnet, com o Opus como advisor. Consulte o advisor antes de decidir a abordagem (o script de cópia e o `ConstrutorDeCondicoes`) e antes de declarar pronto. Subagentes Sonnet ou Haiku podem ajudar, com o Haiku para busca e leitura mecânica.
- **Sigilo:** nunca nomear, procurar ou citar o destino real, em nenhum arquivo, commit, mensagem ou relatório.
