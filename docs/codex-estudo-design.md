# Brief (Codex): o design do CRM, o site da MBigucci e o Base360

## Leia antes
- `CLAUDE.md` e `docs/design-system.md` (o MBigucci Design System aplicado aqui: tokens claro e escuro, regras, contrastes).
- Os tokens em código: `crm/tailwind.config.*`, o CSS global de `crm/src/app/` e `discovery/` (paleta original da pesquisa). A fonte da verdade do DS é um artifact do claude.ai que o Codex não abre; os tokens versionados no repositório bastam.
- `.claude/skills/tela-ds-mbigucci/SKILL.md` (como as telas aplicam o DS).
- **Site da empresa:** https://mbigucci.com.br (páginas públicas: início, empreendimentos, um empreendimento, ferramentas, contato).
- **Base360:** `C:\Projects\base360-repo`, o sistema de gestão (controle de repasse) feito pela Roberta, mãe do Felipe. React + Vite + Tailwind + shadcn/ui (estilo new-york, base slate). Comece por `src/styles.css`, `components.json`, `src/components/ui/` e as telas em `src/routes/`. **Só leitura: nunca edite, rode build ou commite nesse repositório.**

## O que o Felipe pediu (05/11/2026)
1. Conferir se o **MBigucci Design System** (o do CRM e da pesquisa) está de acordo com o **site da empresa**.
2. Ver o quanto ele é **diferente do Base360**, para **chegar a um consenso de design** entre os sistemas internos da MBigucci.

## O que comparar
- **Cor:** a marca (vermelho, tons, neutros), uso do vermelho (ação, alerta, destaque), fundos e bordas, modo escuro. Valores hex lado a lado.
- **Tipografia:** famílias, pesos, tamanhos, números (o CRM usa Bricolage Grotesque com algarismos tabulares e Inter no corpo).
- **Forma:** raios de borda, sombras, espessura de borda, espaçamento, densidade (tabelas e formulários).
- **Componentes:** botão principal e secundário, campo, card (o CRM usa barra de 4px à esquerda, sem sombra), tabela, abas, aviso de erro, estados (o CRM usa glifo + palavra + cor, sem ícones nem emoji), menu.
- **Logo e uso da marca:** versão, tamanho, área de respiro.
- **Tom dos textos de interface:** pt-BR, imperativo, caixa de frase, sem exclamação.

## O que entregar
`docs/estudo-design.md` (com sumário no topo):
1. Tabela de comparação **site × DS do CRM × Base360**, por item acima, com valores e capturas (capturas fora do Git, em `docs/estudo-design/`; só o script que gera entra).
2. **Onde o DS do CRM diverge do site** e se a divergência é proposital (legibilidade em celular, contraste) ou erro.
3. **Onde o Base360 diverge** e o custo de aproximar cada lado (P, M, G), lembrando que o Base360 usa shadcn/ui e o CRM não.
4. **Proposta de consenso**: o que vira comum aos sistemas (tokens de cor, tipografia, botão, campo, estados) e o que pode continuar diferente por contexto (o CRM é celular primeiro; o Base360 é gestão em computador). Em forma de tokens propostos.
5. **Perguntas ao Felipe**, cada uma com opções e a recomendada primeiro (por exemplo: qual lado manda em cada token; se o consenso vira um pacote de tokens compartilhado; se a Roberta participa da decisão).
6. O que foi conferido e o que não foi.

## Limites
- Só leitura no `base360-repo` e no site. Não altere código no CRM; só crie `docs/estudo-design.md` (e o script de capturas, se fizer).
- Sem credenciais: não entre no Base360 com login; analise o código e, se precisar ver telas, rode localmente só o que não pedir banco ou chaves, ou use as capturas que o repositório já tiver.
- Decisão de design é do Felipe. Não commite; entregue o documento e a lista de arquivos.
