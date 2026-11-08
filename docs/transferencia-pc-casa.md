# Transferência para o PC de casa (08/11/2026)

## Antes de abrir o Claude no PC de casa
1. Clone ou atualize o repositório `MBigucci/crm-mbigucci` (branch `main`).
2. Copie à mão o que não está no Git:
   - os arquivos de ambiente, `crm/.env.local` e `marketing/.env.local`, se existir (só chaves públicas; nunca envie por chat);
   - a pasta de memória do Claude, `C:\Users\felip\.claude\projects\C--Projects-CRM-MBigucci\memory\`. O nome da pasta no PC de casa segue o caminho do projeto. Se o projeto ficar em outro lugar, abra o Claude uma vez nele e copie os arquivos para a pasta que ele criar.
3. Rode `npm install` em `crm/` e em `marketing/`.
4. Opcional: copie `crm/local/` se quiser as capturas e os pacotes de publicação. Está fora do Git e não é necessário.

## O prompt para colar na primeira sessão (master)

```text
Você é a sessão master do Base360 (CRM MBigucci). Estou retomando no PC de casa o trabalho
que vinha no PC do escritório. Leia primeiro o CLAUDE.md e docs/levar-o-trabalho.md.

Estado em 08/11/2026:
- main (186c0da) tem tudo até agora: itens 50 (portal e app da raiz, publicado e
  confirmado no iPhone) e 51 (pontos dos gerentes e ação híbrida, instalados no Supabase;
  falta eu definir os stands dos gerentes e conferir câmera e GPS); fase 2 do Alicerce,
  blocos 1 a 8 commitados (Parcerias, Início e Vendas, Painel/Metas/Ranking,
  Quadro/Empreendimentos, Pontos, Administração, Marketing em c5c9bbf, Stand em 0bb8b60);
  Alicerce no repositório na versão 1794140630-3f87.
- O branch wip/limpeza-ds-antigo (53e172f) tem a limpeza do DS antigo, INTERROMPIDA na troca
  de PC: tira as cores antigas do tailwind.config.ts, o data-tema, as classes *-antigo e o
  CSS antigo do globals.css, e reescreve a seção 3 do docs/design-system.md. npm test tem 1
  falha (scripts/contraste-temas.mjs ainda lê a paleta antiga do globals.css). Também traz a
  cópia do Alicerce no marketing/, que a sessão do Marketing esperava a limpeza para
  commitar.

O que falta, em ordem (sem me consultar a cada bloco, como decidi em 08/11):
1. Revisar o branch wip/limpeza-ds-antigo: conferir se nada visual mudou (capturas antes e
   depois de uma tela por bloco, 375px e desktop, papel e grafite), consertar o
   contraste-temas.mjs para ler os tokens do Alicerce, rodar npm test, npx tsc --noEmit e o
   build isolado, e levar para o main.
2. Trocar os botões grandes da navegação do Stand pela peça NavegacaoDaArea
   (crm/src/alicerce/guia/componentes/NavegacaoDaArea.md), em
   crm/src/components/recepcao/area-stand.tsx.
3. Criar em crm/src/components/alicerce/ o componente Dialogo e dar ao Aparencia o nome do
   módulo por prop (padrão "Base360 Vendas"). O Marketing usa os dois pela cópia gerada.
4. Pedir à sessão do Marketing (ou fazer, se não houver) o commit da cópia do Alicerce:
   rodar marketing/scripts/copiar-alicerce.mjs, trocar o Dialogo local e tirar os ajustes
   locais equivalentes.
5. Montar para mim o relatório da fase 2 inteira: o que mudou, onde está (hashes), o que
   falta conferir na tela real e a próxima decisão minha. Pendências de domínio já estão no
   item 52 do roadmap.

Como trabalhar:
- O Codex faz a implementação a partir de briefs (gpt-6.1-sol, esforço high). Você revisa,
  roda os testes e commita.
- As mudanças no Alicerce vão para uma sessão própria do Alicerce, que edita o artifact
  https://claude.ai/artifact/52QJiDD4fLNu14iE3hce37 pelo SKILL.md dele. Você copia a versão
  nova para crm/src/alicerce/, conforme o LEIAME.md.
- As sessões do Alicerce e do Marketing Main ficaram no PC do escritório. Abra novas aqui
  quando precisar, com brief.

Brief da fase 2: docs/codex-alicerce-fase2.md. Estudo e decisão do Stand:
docs/estudo-recepcao-plantao.md. Roadmap: docs/referencia-crm-bruna.md.
```

## O que fica só no PC do escritório
- As conversas do Codex, em `~/.codex`. Em casa, o Codex começa uma conversa nova pelo brief.
- As sessões do Claude desktop: a master, a do Alicerce e a do Marketing Main.
- Os arquivos soltos de outras frentes em `docs/`, que nunca foram commitados: `estudo-visual-diretoria.md`, `mockups/*`, `vendas-participantes.md`, `estudo-design.md`, `relatorio-alicerce-lacunas.md`, `capturar-estudo-design.cjs` e `revisao-visual/*`. Se quiser levar, copie à mão.
