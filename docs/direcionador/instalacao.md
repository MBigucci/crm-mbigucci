# Direcionador de leads: instalação (Felipe e TI)

> Passo a passo de 06/11/2026, na ordem certa. Cada passo diz quem faz, como conferir e como desfazer. O que foi construído está em `docs/direcionador/direcionador.md`, seção 16. **Nenhum passo deste arquivo foi feito ainda:** tudo foi testado só em teste isolado, sem caixa, app, Secrets nem Supabase reais.
>
> **Sigilo:** nenhum passo pede o nome do destino real. O nome de cada destino é digitado só na tela, no passo 9.

## Sumário
0. Antes de começar
1. Caixa compartilhada (TI)
2. App no Entra ID (TI)
3. Permissão só para a caixa: RBAC para aplicativos (TI)
4. Secrets da função e "Verify JWT" desligado (Felipe)
5. SQL no Supabase (Felipe)
6. Deploy da função e agendador (Felipe)
7. Build e publicação do Marketing (Felipe)
8. Regra do Outlook: redirecionar, ainda sem apagar (Felipe)
9. Sair do modo de teste (Felipe, só com a distribuição automática no ar)
10. Rotina e manutenção

---

## 0. Antes de começar

- **A ordem importa.** O direcionador só vai ao ar junto com a distribuição automática do Vendas (decisão 4), porque o lead que vai para o Vendas cai na `lead_empresa_entrada`, que é dela. Até lá, a função roda no **modo de teste**: decide e escreve só um código no log, sem entregar, gravar, apagar ou marcar como lido.
- **O que você vai anotar** (num lugar seguro, nunca no Git nem em e-mail comum):
  - o endereço da caixa compartilhada;
  - o id do locatário (tenant), o id do app (client id) e o segredo do app, com a data em que ele vence.
- **Dados de cliente:** nenhum log, resposta ou tabela do direcionador guarda dados de cliente. A exceção é a base de contatos do Marketing, que recebe só os envios a destinos com "Registrar os envios" ligado.

## 1. Caixa compartilhada (TI)

1. No Exchange admin center: Recipients > Mailboxes > **Add a shared mailbox**. Nome sugerido: `Entrada de leads`. Endereço sugerido: `entrada-leads@mbigucci.com.br`.
2. Caixa compartilhada não pede licença. Dar acesso (Full Access) **só ao Felipe**, para ele poder olhar a caixa se precisar.
3. Conferir a retenção que vale para ela e contar ao Felipe:
   - Itens Recuperáveis (14 dias no padrão);
   - políticas de retenção;
   - bloqueio legal.
   É o que sobra do e-mail depois que a função apaga (seção 7 do estudo).

**Conferir:** mandar um e-mail de teste para a caixa e ver que chegou.
**Desfazer:** apagar a caixa compartilhada (Remove-Mailbox). Antes, conferir que ela está vazia: o que estiver lá some junto.

## 2. App no Entra ID (TI)

1. Entra admin center > App registrations > **New registration**. Nome: `Base360 Entrada`. Contas: só deste diretório. Sem endereço de retorno.
2. Certificates & secrets > **New client secret**, com validade de no máximo 24 meses. Anotar o valor na hora, porque ele não aparece de novo.
3. **Não** dar `Mail.ReadWrite` nem `Mail.Send` em API permissions. No Entra, essas permissões valem para **todas** as caixas da empresa. A permissão vem no passo 3, só para a caixa de entrada.
4. Mandar ao Felipe, por canal seguro:
   - o **id do locatário** (Directory/tenant ID);
   - o **id do app** (Application/client ID);
   - o **segredo**;
   - o **id do objeto da aplicação empresarial**: Enterprise applications > Base360 Entrada > Object ID, que o passo 3 usa.

**Conferir:** o app aparece em App registrations, sem nenhuma permissão de Mail na aba API permissions.
**Desfazer:** apagar o segredo (Certificates & secrets) ou o app inteiro. A função para de ler a caixa na passada seguinte.

## 3. Permissão só para a caixa: RBAC para aplicativos (TI)

No PowerShell do Exchange Online (`Connect-ExchangeOnline`), com os ids do passo 2:

```powershell
New-ServicePrincipal -AppId <id do app> -ObjectId <id do objeto da aplicação empresarial> -DisplayName "Base360 Entrada"
New-ManagementScope -Name "Base360 Entrada - caixa" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'entrada-leads@mbigucci.com.br'"
New-ManagementRoleAssignment -App <id do app> -Role "Application Mail.ReadWrite" -CustomResourceScope "Base360 Entrada - caixa"
New-ManagementRoleAssignment -App <id do app> -Role "Application Mail.Send" -CustomResourceScope "Base360 Entrada - caixa"
```

**Conferir** (o mais importante deste arquivo):

```powershell
Test-ServicePrincipalAuthorization -Identity <id do app> -Resource entrada-leads@mbigucci.com.br
Test-ServicePrincipalAuthorization -Identity <id do app> -Resource <outra caixa da empresa, por exemplo a do Felipe>
```

A primeira tem de responder `InScope = True` nas duas funções. A segunda, e qualquer outra caixa, tem de responder `InScope = False`. Se der `True` para outra caixa, **pare**: o app está enxergando mais do que devia (em geral, sobrou permissão de Mail no Entra, passo 2.3).

**Desfazer:**

```powershell
Get-ManagementRoleAssignment -RoleAssignee <id do app> | Remove-ManagementRoleAssignment
Remove-ManagementScope "Base360 Entrada - caixa"
Remove-ServicePrincipal -Identity <id do app>
```

## 4. Secrets da função e "Verify JWT" desligado (Felipe)

No painel do Supabase: Edge Functions > **Secrets** (valem para todas as funções do projeto):

| Secret | Valor |
| --- | --- |
| `GRAPH_TENANT_ID` | id do locatário (passo 2) |
| `GRAPH_CLIENT_ID` | id do app (passo 2) |
| `GRAPH_CLIENT_SECRET` | segredo do app (passo 2) |
| `CAIXA_ENTRADA` | endereço da caixa compartilhada (passo 1) |
| `MODO` | **não criar agora.** Sem `MODO`, a função fica no modo de teste. Ele entra só no passo 9 |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` o Supabase já põe sozinho.

**"Verify JWT" desligado:** fica na tela da função, depois do deploy (passo 6), como na `avisos`. Quem chama é o agendador do banco, com um segredo próprio no cabeçalho, e não com o login de alguém.

**Conferir:** os 4 nomes aparecem na lista de Secrets. O valor não aparece, e é assim mesmo.
**Desfazer:** apagar os Secrets. A função responde 500 (`faltam_secrets`) e não lê nada.

## 5. SQL no Supabase (Felipe)

SQL Editor > New query > cole o arquivo inteiro > Run. Todos podem rodar de novo sem estragar nada (são idempotentes). Nesta ordem:

1. `crm/supabase/schema.sql`: já está no ar. Rode de novo só se houver versão nova.
2. `crm/supabase/distribuicao.sql`: o SQL da distribuição automática do Vendas, que traz a `lead_empresa_entrada`. **Ainda não existe**; até ele existir, a função fica no modo de teste (passo 9).
3. `crm/supabase/direcionador.sql`: cria o esquema `interno`, as funções `cfg_*`, a trava e os contatos do Marketing, com a chave geral **desligada** e só o Base360 Vendas como destino.
4. `crm/supabase/agendar-entrada.sql`: **no passo 6**, depois do deploy da função. Rodado antes, o agendador chamaria uma função que ainda não existe a cada minuto.

**Conferir:**
- Settings > API > **Exposed schemas**: **não** acrescente `interno`. Tem de continuar só `public` (e o que já estava).
- Abra o Marketing logado com uma conta de corretor: o menu Direcionador não aparece. Com o login do Felipe, aparece (passo 7).
- Com um usuário logado, veja o que `https://<projeto>.supabase.co/rest/v1/` lista: nenhum nome com "direcionador" deve aparecer. As funções `cfg_*` aparecem, e por isso têm nome neutro.

**Desfazer** (apaga regras, destinos, endereços e os contatos registrados do Marketing; rode só se for desistir do direcionador):

```sql
select cron.unschedule('base360-entrada-leads');           -- se o passo 6 já rodou
delete from vault.secrets where name like 'cfg_end_%' or name in ('entrada_url', 'entrada_segredo');
drop table if exists public.mkt_contato_eventos, public.mkt_contatos;
drop schema if exists interno cascade;
drop function if exists public.cfg_ler(), public.cfg_salvar(boolean), public.cfg_item_salvar(jsonb),
  public.cfg_item_excluir(uuid), public.cfg_item_endereco_salvar(uuid, jsonb), public.cfg_item_endereco(uuid),
  public.cfg_regra_salvar(jsonb), public.cfg_regra_ligar(uuid, boolean), public.cfg_regra_ordem(uuid[]),
  public.cfg_regra_excluir(uuid), public.cfg_motor(), public.cfg_escolher(uuid, timestamptz),
  public.cfg_desfazer(uuid, uuid, timestamptz), public.cfg_item_entrega(uuid), public.mkt_registrar_envio(jsonb),
  public.entrada_segredo_ok(text), public.entrada_turno_pegar(uuid, integer), public.entrada_turno_devolver(uuid);
drop function if exists private.chamar_entrada();
```

## 6. Deploy da função e agendador (Felipe)

1. Gere o arquivo da função (ele já vem gerado no Git; rode só se alguém mudou `entrada.ts` ou `marketing/src/lib`). Na pasta `crm/`:
   ```bash
   node supabase/functions/entrada-leads/gerar.mjs
   ```
2. No painel do Supabase: Edge Functions > **Deploy a new function** > pelo editor. Nome: `entrada-leads`. Cole o conteúdo de `crm/supabase/functions/entrada-leads/index.ts` inteiro e publique. Com a CLI, o equivalente é `supabase functions deploy entrada-leads --no-verify-jwt`.
3. Na tela da função: desligue **Verify JWT** (passo 4).
4. Agora rode o `crm/supabase/agendar-entrada.sql`: troque a linha marcada pela Project URL e dê Run. Ele guarda o endereço e um segredo no Vault, agenda a chamada a cada minuto e faz uma primeira chamada.

**Conferir:**
- uns 10 s depois, rode a linha comentada no fim do `agendar-entrada.sql`. O esperado é `status_code` 200 e `{"ok":true,"modo":"teste",...}`. Se vier 401 com "Invalid JWT", o Verify JWT ainda está ligado;
- em Edge Functions > entrada-leads > Logs: linhas só com hora, id e código, por exemplo `teste:vendas:desligado`, nunca nome, telefone ou e-mail;
- o deploy aceitou o arquivo. Ele usa `namespace` do TypeScript, que foi testado só no Node. Se o deploy recusar, avise: o gerador muda para outro formato.

**Desfazer:** primeiro pare o agendador, depois apague a função.

```sql
select cron.unschedule('base360-entrada-leads');
```

## 7. Build e publicação do Marketing (Felipe)

O Marketing usa o mesmo Supabase e o mesmo login do Vendas, e fica em `base360.mbigucci.com.br/marketing`, ao lado de `/vendas`.

1. Copie o arquivo de variáveis do `crm/` para o `marketing/`: são as mesmas duas variáveis públicas, URL e chave anon.
2. Na pasta `marketing/`:
   ```bash
   BASE_PATH=/marketing npm run build
   ```
3. Envie o conteúdo de `marketing/out/` para a pasta `marketing/` do site do Base360, do mesmo jeito que o `out/` do Vendas vai para `vendas/`. Não envie o arquivo de variáveis nem o `local/`.

**Conferir:**
- abra `base360.mbigucci.com.br/marketing/`:
  - com o login do Felipe, vai direto ao Direcionador;
  - com um corretor, nada aparece;
  - nos dois temas e no celular;
- os caminhos `/marketing/_next/` carregam (sem 404 no console);
- busca de sigilo no `out/` antes de enviar: nenhum nome de destino. Os nomes só existem no banco.

**Desfazer:** apague a pasta `marketing/` do site. O banco e a função continuam como estão.

## 8. Regra do Outlook: redirecionar, ainda sem apagar (Felipe)

Na caixa do Felipe: Regras > Nova regra.
- **Condição:** remetente é um dos portais ou o site, os mesmos de onde chegam os leads hoje.
- **Ação:** **Redirecionar para** `entrada-leads@mbigucci.com.br`. Redirecionar mantém o remetente original, que é por onde o leitor reconhece a fonte.
- **Ainda sem "Excluir a mensagem".** Enquanto a função está no modo de teste, os leads continuam sendo tratados à mão a partir da caixa do Felipe, como hoje. A caixa compartilhada só recebe a cópia, e a função só escreve no log o que faria.

**Conferir:**
- um lead novo chega nas duas caixas;
- no log da função aparece um código `teste:...` com o id dele. Com a chave geral ligada na tela, o código mostra a regra que valeria, por exemplo `teste:externo:divisao`;
- mande para a sessão do Marketing **um e-mail de cada fonte com nome, telefone e e-mail do cliente trocados**, para os testes do leitor deixarem de ser fictícios e os remetentes entrarem em `lead_fontes`.

**Desfazer:** desligue ou apague a regra. Nada mais muda.

## 9. Sair do modo de teste (Felipe, só com a distribuição automática no ar)

Só faça este passo quando a `lead_empresa_entrada` existir no banco (o `distribuicao.sql` do passo 5.2 rodado) e a distribuição automática do Vendas estiver no ar.

1. **Esvazie a caixa compartilhada.** No modo de teste nada foi apagado nem marcado como lido. Se ficar lá, a primeira passada de verdade processa de novo todos os leads de teste, que já foram tratados à mão. Apague tudo (ou mova para uma pasta fora da Caixa de Entrada).
2. **Cadastre os destinos e as regras** na tela, com a chave geral ainda **desligada**:
   - **Destinos:** nome, entrega, endereço, limite e "Registrar os envios". O nome é o que só você vê.
   - **Regras:** confira cada uma no simulador.
3. Crie o Secret **`MODO`** com o valor **`producao`** (passo 4). A função passa a valer na passada seguinte. Com a chave geral desligada, tudo vai para o Vendas.
4. **Ligue a chave geral** na tela. As regras passam a decidir.
5. **Na regra do Outlook, acrescente "Excluir a mensagem"** (decisão 6). Antes disso, confira no log da função alguns códigos `vendas:...` e `externo:entregue` reais.

**Conferir:**
- o lead aparece no Vendas, na distribuição automática;
- o destino externo recebeu, e só com o assunto "Novo contato";
- a caixa compartilhada esvazia sozinha, a cada minuto.

**Desfazer, do mais leve ao mais forte:**
- desligar a chave geral na tela: tudo vai para o Vendas;
- apagar o Secret `MODO`: volta ao modo de teste e nada é entregue nem apagado. Tire também o "Excluir a mensagem" da regra do Outlook, senão os leads ficam só na caixa compartilhada;
- parar o agendador (passo 6).

## 10. Rotina e manutenção

- **Segredo do app:** vence em até 24 meses (passo 2). Marque na agenda um mês antes. Vencido, a função para de ler a caixa, e os leads se acumulam lá sem ninguém ver: renove e troque o Secret `GRAPH_CLIENT_SECRET`.
- **Log da função:** `erro:vendas:...` repetido quer dizer que o Vendas recusou e o e-mail ficou na caixa. `vendas:falha_configuracao:...` quer dizer que a porta de um destino respondeu 400, 401, 403 ou 422 (chave ou endereço errado). Ainda não há aviso automático ao gerente geral (pendência 1 da seção 16 do estudo).
- **Turno:** se o log mostrar `ocupado` a cada minuto por mais de 2 minutos, uma passada travou. O turno vence sozinho em 2 minutos.
- **Arquivo da função:** depois de mudar `entrada.ts` ou `marketing/src/lib`, rode o `gerar.mjs` e repita o passo 6.2. O `npm test` do `crm/` falha se o `index.ts` estiver desatualizado.
