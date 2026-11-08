# AtalhosDeTeclado

Poucos atalhos, **as mesmas teclas em todos os módulos**, para quem passa o dia no computador (gerência, Repasse, cadastro). Ninguém precisa saber que existem: tudo continua a um clique.

| Tecla | Faz | Onde |
|---|---|---|
| `/` | Buscar (põe o foco na busca do topo) | qualquer tela |
| `n` | Criar: o + Novo do módulo | qualquer tela |
| `?` | Ver os atalhos (esta janela) | qualquer tela |
| `Esc` | Fechar painel, menu, popup ou janela | qualquer tela |
| `[` | Recolher ou expandir o menu lateral | qualquer tela |
| `g` depois `l` / `d` / `a` / `p` | Ir para Lista do dia, Leads, Agenda, Painel (cada módulo define as suas letras, sempre a inicial) | qualquer tela |
| `j` / `k` | Próximo / anterior | listas, tabelas, quadro |
| `Enter` | Abrir o item | listas, tabelas, quadro |
| `Espaço` | Pegar e soltar um card | `Quadro` |

**Regras**
- Atalho de uma letra **nunca** dispara dentro de campo, nem com Ctrl, ⌘ ou Alt (não briga com o navegador).
- A pessoa pode desligar os de uma letra em **Minha conta → Atalhos de teclado** (`MB.atalhos.ativos(false)`, lembrado no aparelho). `Esc` e as setas continuam.
- A busca do topo mostra a tecla `/` dentro do campo (`.mb-tecla`); nenhum outro lugar mostra atalho na tela.
- Sem atalhos para ações que gravam (aprovar, enviar, excluir).

**Janela:** `Dialogo --largo` com os grupos em `dl` (`.mb-atalhos__linha`: o que faz à esquerda, as teclas em `.mb-tecla` à direita) e a nota de como desligar.

**Código:** `MB.atalhos.ligar({ '/': buscar, n: novo, '?': mostrar, 'g l': irParaLista })`.
