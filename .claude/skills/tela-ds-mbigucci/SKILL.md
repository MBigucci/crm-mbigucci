---
name: tela-ds-mbigucci
description: Checklist para criar ou alterar qualquer tela de discovery/ ou crm/ no MBigucci Design System, mobile-first. Use antes de escrever um componente ou página nova, e para revisar uma tela pronta.
---

# Tela no MBigucci Design System

Leia `docs/design-system.md` primeiro. A fonte da verdade é o artifact citado lá. Reaproveite as classes de `globals.css` e os tokens do `tailwind.config.ts`. Não invente cores, raios nem sombras.

## Antes de escrever
- [ ] Já existe um componente parecido no app? Reaproveite: `Cabecalho`, `OpcaoCard`, `.card`, `.btn`, `.input`, `.field-label`.
- [ ] Qual é a **única** ação principal da tela? Só ela é `btn-red`. As demais são `btn-ghost`.
- [ ] A tela vai ser usada no celular? Então as ações ficam no rodapé fixo, os campos têm 16px e todo botão ou controle de escolha tem 44px de alvo (`.btn` ou `.opcao`).

## Estrutura
- [ ] O fundo é `paper` e os blocos são `.card`, com a barra à esquerda em `ink`. Use `.bar-brand` só no destaque, e uma vez por área de tela.
- [ ] Cada título tem um eyebrow acima (`.eyebrow`) e o título vem em `.titulo-pagina` ou `.titulo-card`.
- [ ] Use bordas finas `line` e nenhum `shadow-*`. Os raios são `rounded-sm`, `rounded-md` ou `rounded-lg` (2, 3 ou 4px).

## Texto e números
- [ ] Português do Brasil, frases curtas, imperativo, caixa de frase em títulos e botões, sem exclamação. O eyebrow fica em caixa alta pelo CSS.
- [ ] Todo número vem com `.num` (tabular) e no formato `R$ 1.300`, `60,60%` ou `dd/mm/aaaa`. No CRM, `.num` é Inter na leitura (cards, tabelas, campos) e Bricolage só em título, na faixa ou com 17px ou mais.
- [ ] Vermelho só na ação principal e na urgência real. Temperatura não é urgência. Na lista, uma barra vermelha por tela.
- [ ] No card, negrito só no nome e na linha mais urgente; linhas de trabalho em 14px, apoio em 13px.
- [ ] O erro diz o que houve e o que fazer, começa com ✕ e tem a barra `brand`. O estado vazio diz o próximo passo.

## Estado e acessibilidade
- [ ] Sem ícones nem emoji: use os sinais ✓ ! ✕ – → +. O estado é sempre **sinal + palavra + cor**. Única exceção no CRM: os ícones da navegação (lateral e menu do celular), em `crm/src/components/icones-menu.tsx`.
- [ ] `concrete` só em texto auxiliar. O que o usuário precisa ler para decidir vai em `ink` ou `ink-soft`.
- [ ] O foco usa `.focus-ring` (2px `brand`). Todo campo tem um `label for`.
- [ ] A transição respeita `prefers-reduced-motion`.

## Conferir
Abra a tela no navegador em 375px (preset mobile) e tire um screenshot. Volte o viewport ao normal no fim do teste.
