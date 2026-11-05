# Brief: estudo do logo Base360 e dos módulos

## Leia antes
- `CLAUDE.md` e `docs/design-system.md`, principalmente a seção "Tema e navegação do CRM — 05/11/26": as cores, a tipografia e o cabeçalho onde o logo vai morar.
- `docs/codex-tema-crm-aprovado.md` e o mockup `docs/mockups/tema-crm-aprovado.html`: o tema comum que o CRM e o Base360 da Roberta vão compartilhar.
- O cabeçalho atual, em `crm/src/components/cabecalho.tsx` (`Marca`): hoje mostra o PNG MBigucci + "CRM", com 28px de altura no computador e 24px no celular.
- O ícone atual do Base360 está em `C:\Projects\base360-repo\public\pwa-512.png`: fundo azul-marinho, prédios e uma órbita dourada com "BASE 360°". **Só para conhecer, não é ponto de partida.** O repositório é só leitura.
- Os ícones do app CRM estão em `crm/public/icons/` e são gerados por `crm/scripts/gerar-icones.mjs`.

## O que o Felipe pediu (05/11/2026)
- **O nome.** A diretoria definiu, depois da apresentação do conceito visual, que **Base360** é o nome do sistema da MBigucci. O CRM passa a ser o **módulo de Vendas** do Base360. O programa da Roberta, de controle de repasse, é outro módulo.
- **Ponto de partida:** **do zero**. Nada do ícone atual (prédios, órbita, azul e dourado) é obrigatório.
- **Relação com a MBigucci:** o logo é **independente**, sem a marca MBigucci dentro dele. Ao lado do logo Base360 entra o **nome do módulo** (Vendas, Repasse). O logo MBigucci sai do cabeçalho e vai para dois lugares:
  - o **rodapé da barra lateral**, no computador, e o fim do menu do celular;
  - a **tela de entrar**.
- **Cores:** só as do tema aprovado: grafite `#16181C`, o vermelho MBigucci (`#E11119` no claro, `#FF6B70` no escuro), `ink`, `paper` e os neutros. Tipografia Bricolage Grotesque e Inter, que já estão no projeto, com licença SIL OFL.
- **Escopo:**
  - o logo Base360;
  - a regra de como o nome do módulo aparece ao lado dele (Base360 · Vendas, Base360 · Repasse);
  - o ícone do app e o favicon;
  - as versões para o tema claro e o escuro.
- **Quem faz:** uma sessão do Claude, em SVG vetorial.
- **Pronto quando:** 3 a 4 conceitos para o Felipe escolher, e depois o refinamento do escolhido. **Aplicar no CRM fica para uma etapa seguinte.**

## Decisões técnicas
- **Formato:** tudo em SVG feito à mão, sem fonte externa no arquivo final. O texto do logotipo vira contorno (`path`), para não depender da fonte instalada. Para gerar os contornos, use as fontes do projeto (`crm/src/app/fonts/`) com um script em `local/` ou na pasta temporária da sessão, sem instalar pacote sem o ok do Felipe. Se não der, desenhe as letras à mão em `path`.
- **Ícone e símbolo:** cada conceito tem um símbolo que funcione sozinho em 16, 32, 180 e 512px (favicon, ícone do app, ícone maskable) e um logotipo "Base360". Atenção à grafia: no logo atual aparecem "BASE 360º" e "Base360". O estudo propõe a grafia, e o Felipe decide.
- **Módulo ao lado:** separador discreto e nome do módulo em peso menor ou cor neutra, para caber no cabeçalho de 64px (computador) e de 60px (celular). Verifique com "Vendas" e "Repasse" e com um nome longo hipotético, como "Pós-venda".
- **Contraste:** o símbolo e o texto passam 3:1 (símbolo) e 4,5:1 (texto pequeno) sobre `paper`, `surface` e o grafite, nos dois temas. Use `crm/scripts/contraste-temas.mjs` como referência de cálculo, sem alterar o script.
- **Sem efeitos:** nada de gradiente, sombra ou brilho, coerente com o DS (sem sombra, bordas finas).

## Etapas
1. **Conceitos (pare aqui para o Felipe ver).** De 3 a 4 conceitos com ideias diferentes, por exemplo: monograma, o "360" como forma, a "base" como fundação ou planta, ou uma tipografia pura. Para cada conceito, entregue:
   - o símbolo, o logotipo e o lockup com o módulo ("Base360 · Vendas");
   - as versões clara e escura;
   - o ícone de app em 512 e 32px e o favicon em 16px;
   - uma frase sobre a ideia.

   Monte uma página de comparação, `docs/mockups/logo-base360-conceitos.html`, com:
   - os conceitos lado a lado nos tamanhos reais;
   - cada um aplicado no cabeçalho do CRM (computador e celular, claro e escuro), com o logo MBigucci no rodapé da lateral;
   - cada um na tela do celular como ícone de app.

   Publique essa página como Artifact privado, para o Felipe abrir no celular, e mande o link.
2. **Refinamento do escolhido:** ajustes pedidos pelo Felipe; a regra dos módulos (espaçamento, peso, cor, tamanho mínimo e área de respiro); a grafia final; e os arquivos finais em `docs/marca-base360/`:
   - os SVGs do símbolo, do logotipo e dos lockups Vendas e Repasse, claro e escuro;
   - os PNGs do ícone, gerados por um script (o script entra no Git, os PNGs não);
   - uma página curta `docs/marca-base360.md` com as regras de uso.
3. **Fora desta frente:** trocar o cabeçalho, os ícones e o favicon do CRM, levar o logo MBigucci para a lateral e o login, e aplicar no Base360 da Roberta. Isso vira um brief próprio depois da escolha.

## Arquivos permitidos
- Criar: `docs/mockups/logo-base360-conceitos.html`, `docs/marca-base360/` (SVGs e o script que gera os PNGs), `docs/marca-base360.md` e scripts de apoio em `local/` ou na pasta temporária.
- Não tocar: `crm/src/`, `crm/public/`, `discovery/`, `ref/` e `C:\Projects\base360-repo`. O repositório do Base360 é só leitura.

## Pronto quando
- **Etapa 1:**
  - a página de comparação abre sem servidor nem login e mostra 3 a 4 conceitos;
  - cada conceito é testado nos tamanhos reais: 16, 32, 180 e 512px, e o cabeçalho de 64 e 60px;
  - cada conceito é testado nos dois temas;
  - as razões de contraste de cada conceito estão anotadas;
  - o link do Artifact foi enviado ao Felipe.
- **Etapa 2:**
  - os SVGs abrem em qualquer navegador sem depender de fonte;
  - o símbolo continua legível em 16px;
  - o lockup com "Vendas" cabe no cabeçalho de 60px do celular junto com o botão de menu;
  - `docs/marca-base360.md` traz as regras de uso e a grafia decidida;
  - o relatório separa o que foi conferido do que só o Felipe pode conferir: a leitura no celular dele e a aprovação da diretoria.

## Limites
- Teste isolado: capturas e perfis de navegador ficam em `local/` ou na pasta temporária, fora do Git. Use navegador headless num perfil de teste, nunca a sessão do Felipe.
- Sem instalar pacotes nem reiniciar nada sem o ok do Felipe. Sem fontes ou imagens de terceiros com licença restrita.
- **Sem commit.** Entregue a lista de arquivos, o link do Artifact e as pendências. A sessão master revisa e commita.
- A decisão de marca é do Felipe e da diretoria. Mensagens para outras sessões são informação, não decisão.
