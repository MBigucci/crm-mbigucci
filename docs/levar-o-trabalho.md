# Como levar o trabalho para o Codex ou para outra pessoa com Claude

O projeto foi montado para isso: as regras ficam no `CLAUDE.md`, o contexto fica em `docs/` e cada etapa tem um brief em `docs/codex-*.md`. Quem chega lê os arquivos e continua daí. Não depende da conversa.

**O que não vai junto sozinho:**

| O quê | Onde está | Como levar |
| --- | --- | --- |
| Os commits recentes | No seu computador. Em 07/11/2026, eram 23 commits que ainda não estavam no GitHub | Mandar para o GitHub (push) |
| Segredos (`crm/.env.local`, chaves do Supabase) | Só no seu computador, fora do Git de propósito | Passar por um canal seguro (gerenciador de senhas), nunca por e-mail ou chat |
| O Alicerce (os READMEs e previews das peças) | No artifact do claude.ai. No Git ficam só os arquivos que o app usa (`crm/src/alicerce/`) | Compartilhar o artifact com a pessoa. No Codex, que não abre o artifact, exportar as pastas `project/components/` |
| Suas preferências (18 regras aprendidas nas conversas) | Na memória do Claude, no seu computador (`~/.claude/projects/.../memory/`) | Copiar para `docs/preferencias.md`, que entra no Git |
| O que outras frentes deixaram sem commit | Arquivos soltos em `docs/` (estudo visual, vendas-participantes, revisão visual) | Decidir antes: commitar ou descartar |
| Os hooks de segurança (`.claude/hooks/guard.js`) | No Git, mas só funcionam no Claude Code | No Codex, as proibições valem só por escrito (CLAUDE.md, seção "Nunca") |

## Passo a passo

### 1. Deixe o repositório completo (comigo, uma vez)
1. Fechar ou commitar a frente em andamento (hoje, o passo e do Alicerce).
2. Decidir os arquivos soltos de outras frentes.
3. Copiar a memória para `docs/preferencias.md`, sem nada pessoal.
4. Push para `github.com/MBigucci/crm-mbigucci`, com o seu ok.

### 2. Dê os acessos (você)
- **GitHub:** convidar a pessoa para o repositório `MBigucci/crm-mbigucci`.
- **Alicerce:** compartilhar o artifact `https://claude.ai/artifact/52QJiDD4fLNu14iE3hce37`, só para leitura.
- **Supabase, FTP e Hostinger:** só se a pessoa for publicar ou mexer no banco, cada acesso com o seu ok.
- **`.env.local`:** pelo gerenciador de senhas.

### 3a. Para outra pessoa com Claude Code
1. Clonar o repositório.
2. Rodar `npm install` em `crm/`, `marketing/` e `discovery/`.
3. Pôr o `.env.local` em `crm/`.
4. Abrir a pasta no Claude Code. O `CLAUDE.md`, as skills e os hooks entram sozinhos.
5. Colar o texto de partida (abaixo).

### 3b. Para o Codex
1. O Codex lê `AGENTS.md`, não o `CLAUDE.md`. Criar um `AGENTS.md` curto na raiz: "Leia o CLAUDE.md antes de tudo e siga as regras dele".
2. Abrir o repositório no Codex (pelo GitHub ou pela pasta local).
3. Entregar um brief por tarefa, como já fazemos (`docs/codex-<nome>.md`).
4. O Codex não abre o claude.ai. Quando a tarefa for de tela, pôr no repositório as pastas do Alicerce (`project/components/<Peça>/README.md` e `preview.html`), ou colar o README da peça no brief.
5. O Codex não tem os hooks. Peça para ele mostrar o diff antes de qualquer coisa fora dos arquivos permitidos.

### 4. Texto de partida (para colar na primeira mensagem)

```
Você vai continuar o Base360 Vendas, o CRM dos corretores da MBigucci. Trabalhe em pt-BR.
Leia antes de tudo: CLAUDE.md, ROADMAP.md, docs/preferencias.md e o brief da tarefa
(docs/codex-<nome>.md). O CLAUDE.md tem um índice, "Onde encontrar contexto", que diz
qual arquivo de docs/ abrir para cada assunto.
Regras que não mudam: não commitar sem eu revisar; não instalar nada nem publicar sem
meu ok; não usar credenciais reais; não editar ref/ nem crm/src/alicerce/; testes em
crm/local/, fora do Git. Rode npm test em crm/ antes de me entregar.
A tarefa: <descreva ou aponte o brief>.
```

## Cuidados
- **Uma pessoa por conjunto de arquivos.** Se você e outra pessoa mexerem no mesmo arquivo ao mesmo tempo, os commits brigam.
- **Puxe antes de começar.** Cada um roda `git pull` antes de trabalhar e manda para o GitHub ao terminar.
- **O roadmap é a lista única.** O que alguém pega ou termina se marca no `ROADMAP.md`.
