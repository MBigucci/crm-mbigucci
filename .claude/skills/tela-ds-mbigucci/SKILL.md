---
name: tela-ds-mbigucci
description: Checklist para criar, migrar ou revisar qualquer tela do crm/ no Alicerce MBigucci (e de discovery/ no DS antigo), mobile-first. Use antes de escrever um componente ou página nova, ao migrar uma tela para o Alicerce e para revisar uma tela pronta.
---

# Tela no Alicerce MBigucci

Leia `docs/design-system.md` (seção 1) e o brief `docs/codex-alicerce-vendas.md`. A fonte da verdade é o artifact do Alicerce citado lá.

- Tela de `discovery/` ou do `crm/` ainda não migrada: siga a seção 3 do `design-system.md` (DS antigo).
- O que faltar no Alicerce vai para a lista "Falta no Alicerce". Não invente peça, cor ou medida.

## Antes de escrever
- [ ] Leia o `README.md` e o `preview.html` de cada peça que a tela usa e a tela de referência mais parecida (`ListaDoDia`, `FichaDoLead`, `PainelCentral`).
- [ ] Já existe o componente fino em `crm/src/components/alicerce/`? Reaproveite. Se não existir, crie um que gere o mesmo HTML, as mesmas classes `.mb-*` e os mesmos `aria-*` do preview.
- [ ] Qual é a **única** ação `--primario` da tela? A segunda é `--secundario`. O "+ Novo lead" do topo é do módulo e não conta.
- [ ] Onde abre cada tarefa:
  - até dois campos: dentro do card;
  - mais de dois: `PainelLateral`;
  - `Dialogo` só para o irreversível;
  - o que volta atrás mostra Desfazer (`Toast`, 8 s).

## Estrutura e estilo
- [ ] Use cor, raio, sombra, espaço e movimento das classes do Alicerce ou de `var(--…)`. Tailwind só para layout (grid, flex, larguras, quebras). Nada de `#hex`, `rounded-*`, `shadow-*` ou `duration-*` escrito à mão.
- [ ] Ajuste local só em `crm/src/app/alicerce-local.css`, com o porquê. Os arquivos de `crm/src/alicerce/` não se editam.
- [ ] Card sem barra lateral. Card de item usa `CardDeItem` ou `CardLead`: o card inteiro abre o registro, com no máximo duas ações e sem ⋯.
- [ ] Classe nova do app nunca começa com `mb-`.
- [ ] `MB.*` só onde não há estado React equivalente (`preferencias`, `formatar`). Nunca `MB.*.ligar` em DOM do React.

## Texto e números
- [ ] Botão com verbo + objeto. "Todos" e "Todas" sempre com o substantivo. Erros com as palavras do `Vocabulario`, nada técnico na tela.
- [ ] Sinais com sentido fixo: ! pede ação, ✕ terminou mal, ✓ deu certo, → leva adiante ou para fora, ○ médio, – baixo ou vazio, ↗ abre em outra aba. A cor nunca carrega o sentido sozinha.
- [ ] Temperatura é `Chip`, etapa e status são `Selo`, prazo é `Prazo`.
- [ ] Números que se comparam em Inter tabular, alinhados à direita. Formatos `R$ 1.348.700,00`, `06/11/2026`, `15:08`.

## Estado e acessibilidade
- [ ] Carregando é o esqueleto parado de `Carregando`. Vazio é `EstadoVazio`. Erro de carga é `EstadosDePagina`, com "Tentar de novo", nunca uma lista vazia.
- [ ] Foco visível em tudo. Todo campo tem rótulo visível.
- [ ] Ícone sempre com texto; sozinho, só em botão com `aria-label`.
- [ ] Movimento reduzido desliga animação, transição e elevação.

## Conferir
Em 375px e 1280px, nos temas papel e grafite:
- [ ] sem rolagem lateral (`scrollWidth <= clientWidth`);
- [ ] alvos de pelo menos 44px no celular;
- [ ] foco visível ao navegar com Tab;
- [ ] nenhum erro no console.

Use navegador headless com dados fictícios, e guarde os prints em `crm/local/` (fora do Git). Volte o viewport ao normal no fim.
