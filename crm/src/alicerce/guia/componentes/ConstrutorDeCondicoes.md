# ConstrutorDeCondicoes

Montar uma regra sem fórmula: os relatórios salvos do Repasse (“contratos parados no banco há mais de 15 dias”), as regras do Direcionador do Marketing (“lead do site do Residencial Exemplo vai para o plantão”), filtros avançados e alertas. Uma peça para os dois módulos, que hoje fazem isso de jeitos diferentes.

**Estrutura** (`.mb-condicoes`)
- **Modo:** “Mostrar contratos que atendem [todas ▾] as condições” — `todas` liga as linhas com “e”, `qualquer uma` com “ou”. Um nível só: sem grupos dentro de grupos.
- **Cada linha** (`.mb-condicao`): o conector à esquerda (“Onde”/“Se” na primeira, depois “e” ou “ou”), **campo**, **comparação** e **valor** — o valor muda com o campo (lista para Banco e Etapa, número para Dias, data para datas) — e o ✕ para remover (some quando só há uma linha).
- “+ Adicionar condição” (`--secundario --p`).
- **A regra por extenso** (`.mb-condicoes__frase`, com o fio à esquerda): “Contratos em que *banco* é *Caixa* e *etapa* não é *Assinado* e *dias na etapa* maior que *15*.” É o que a pessoa confere; é também o que aparece na lista de relatórios e regras salvas.
- **Resultado antes de salvar:** “38 contratos atendem agora” ou, no Direcionador, “Nos últimos 30 dias, 212 leads teriam entrado nesta regra”, com “Ver prévia” (a `TabelaCompleta` no `PainelLateral --larga`).

**Direcionador:** dois blocos (`.mb-condicoes__bloco`, fundo `superficie-sutil`): **Se o lead chegar com** (as condições) e **Então** (para quem distribuir e em que ordem). A frase junta os dois. Regras são avaliadas de cima para baixo; a primeira que servir leva o lead. Desligar uma regra que está distribuindo pede o `Dialogo` (não volta: os leads seguintes vão para outra regra).

**Simular (Direcionador):** testar um lead que não existe contra as regras, sem gravar nada. Monte com peças que já existem: um `Cartao` “Simular um lead”, os campos das condições (`Campo`, `Seletor`, `DataHora` para dia e hora) e, embaixo, o resultado em `Lista` — qual regra pegaria o lead e para quem ele iria, ou “Nenhuma regra pega este lead; ele vai para a distribuição padrão.”

**Celular:** cada condição vira uma subseção (fundo `superficie-sutil`, sem borda) com os campos empilhados e o ✕ no canto.

**Código:** `MB.condicoes.ligar(raiz)` adiciona e remove linhas (de `<template data-mb-condicao>`), troca os conectores e reescreve a frase; dispara `mb-condicoes` com as regras.

**Não faça**
- Campo de texto livre para fórmula (“banco = 'caixa' AND …”).
- Salvar sem mostrar quantos registros a regra pega.
