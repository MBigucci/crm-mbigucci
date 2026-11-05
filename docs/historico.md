# Histórico: o que foi tentado e deixado de lado

Registro do que existiu no projeto e saiu, com a data e o motivo. O que falta fazer fica no `ROADMAP.md`.

## Sigilo do programa de verba e a chave "Programa de verba ativo" (28/10 a 04/11/2026)

**O que era.** Até a reunião de novembro de 2026, a verba de leads por corretor, os pontos que viram verba, o ranking e o fim dos leads do Google não podiam aparecer para corretores nem gerentes. Para isso:

- **Banco:** a chave `programa_verba_ativo` em `app_settings`, desligada, só o gerente geral lia e mudava. As funções `private.programa_verba_ativo()`, `private.ve_programa()` (gerente geral, ou chave ligada e usuário ativo) e `public.programa_estado()` (o app só sabia se estava ligada) controlavam as policies de `criterios_pontos`, `lancamentos_pontos` e `fechamentos_verba` e as funções `plantao_corretores` e `ranking_pontos`. Com a chave desligada, só o gerente geral recebia alguma linha.
- **Front:** a `Casca` tinha a prop `programa` e o menu usava `useEstadoPrograma` (`lib/programa-dados.ts`). A tela Pontos dizia "Só você vê estas telas". Configurações tinha a seção Chaves para ligar e desligar.
- **Textos e conferências:** os textos para corretores evitavam esses temas, as descrições de permissões eram neutras (o catálogo é lido por todos), os testes conferiam que o catálogo e os avisos no celular não citavam verba, pontos nem ranking, e a skill `tela-ds-mbigucci` tinha um item sobre isso. O plano era um `grep` no `out/` antes de publicar.
- **Faixas de VGV:** a tela ficou só do gerente geral por regra fixa no banco, com os textos em `app_settings`, pelo mesmo motivo.

**Por que acabou.** Em 04/11/2026 o Felipe decidiu acabar com o sigilo e com a chave. O CRM só vai ao ar depois que todos souberem das regras novas, então esconder não protegia mais nada, e o marketing já sabia. O registro da decisão está em `docs/estudo-relatorios.md`, D1, e o brief em `docs/codex-fim-do-sigilo.md`.

**Como ficou.**

- Quem vê o programa sai só das permissões (`role_permissions`) e do usuário ativo. A tabela perfil × tela aprovada pelo Felipe é a de antes com a chave ligada (`docs/pontuacao-verba.md`, "O que cada perfil recebe").
- O `schema.sql` apaga a linha da chave e as três funções num banco que rodou a versão anterior.
- **Não mudou:**
  - as Faixas de VGV continuam só do gerente geral;
  - a permissão `painel.campanha` continua fora do gerente no padrão;
  - os textos da pesquisa (`discovery/`) já publicados ficam como estão;
  - os textos dos avisos no celular ficaram como estavam;
  - a publicação no WordPress continua sendo decisão do Felipe.
