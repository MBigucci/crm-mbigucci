# Porta de entrada de leads: especificação para o sistema que recebe

> Versão 1.0, de 05/11/2026. Documento neutro: serve para qualquer CRM ou sistema que vá receber leads da MBigucci. O remetente é chamado aqui de **"o remetente"**, e o sistema que recebe, de **"o receptor"**.

## Sumário
1. Visão geral
2. Endereço e transporte
3. Autenticação
4. Corpo da chamada
5. Respostas e o que o remetente faz com cada uma
6. Novas tentativas e idempotência
7. Limites
8. Segurança e LGPD
9. Exemplo
10. Como testar e entrar em produção
11. Versões

## 1. Visão geral

- O receptor publica **um endereço HTTPS** que aceita `POST` com corpo JSON.
- O remetente faz **uma chamada por lead**, assim que o lead chega a ele.
- Cada lead tem um **`id` único**. O mesmo `id` pode chegar mais de uma vez (nova tentativa), e o receptor deve tratá-lo como o mesmo lead.
- O receptor responde só com o código HTTP. O corpo da resposta é opcional e o remetente não depende dele.

## 2. Endereço e transporte

- `POST https://<endereço do receptor>`. O caminho é livre (por exemplo `/leads/entrada`).
- Só HTTPS, com TLS 1.2 ou superior e certificado válido. Sem redirecionamento: uma resposta 3xx conta como erro.
- Cabeçalhos enviados:
  - `Content-Type: application/json; charset=utf-8`
  - `Authorization: Bearer <chave>`
  - `Idempotency-Key: <id do lead>` (o mesmo valor do campo `id`)
  - `User-Agent: entrada-leads/1.0`
- Os dados vão **só no corpo**. Nenhum dado de contato vai na URL ou em parâmetros de consulta.

## 3. Autenticação

- O receptor gera uma **chave secreta** (pelo menos 32 caracteres aleatórios) e a entrega ao remetente por um canal seguro, nunca por e-mail comum junto com o endereço.
- Chave ausente ou errada: o receptor responde **401**, sem detalhes.
- **Troca da chave:** o receptor aceita a chave antiga e a nova ao mesmo tempo durante a troca (por exemplo, 7 dias). O remetente troca e avisa; depois o receptor desliga a antiga.
- O endereço IP do remetente **não é fixo**. Não use lista de IPs como única proteção.
- **Opcional (versão 1.1):** assinatura HMAC-SHA256 do corpo no cabeçalho `X-Assinatura: sha256=<hex>`, com `X-Enviado-Em` (ISO 8601) dentro da assinatura, para recusar chamadas repetidas com mais de 5 minutos. Combine antes de usar.

## 4. Corpo da chamada

JSON em UTF-8. Campos **obrigatórios** marcados com ✓. Campos sem valor vêm como `null` ou ficam fora. O receptor deve **ignorar campos que não conhece**, para versões novas não quebrarem a integração.

| Campo | Tipo | | Descrição |
| --- | --- | --- | --- |
| `versao` | texto | ✓ | Versão desta especificação, `"1.0"` |
| `id` | texto (UUID) | ✓ | Id único do lead. Chave de idempotência |
| `recebido_em` | texto (ISO 8601 com fuso) | ✓ | Quando o lead chegou ao remetente, por exemplo `2026-11-05T14:32:10-03:00` |
| `enviado_em` | texto (ISO 8601 com fuso) | ✓ | Quando esta chamada foi feita. Muda a cada tentativa |
| `contato.nome` | texto | ✓ | Nome como o cliente escreveu. Pode vir vazio só se não houver nenhum |
| `contato.telefone` | texto (E.164) | | Telefone com país e DDD, só `+` e dígitos, por exemplo `+5511987654321` |
| `contato.email` | texto | | E-mail em minúsculas |
| `contato.mensagem` | texto | | A mensagem do cliente, sem formatação. Até 5.000 caracteres |
| `interesse.produto` | texto | | Nome do empreendimento de interesse, como o remetente o chama |
| `interesse.produto_codigo` | texto | | Código do empreendimento no remetente, quando houver |
| `interesse.anuncio_codigo` | texto | | Código do anúncio no portal, quando houver |
| `origem.fonte` | texto | ✓ | De onde o lead veio: `site`, `zap`, `vivareal`, `olx`, `imovelweb`, `chavesnamao` ou `outra` |
| `origem.campanha` | objeto | | Parâmetros de campanha, quando houver: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` |
| `consentimento.aceito` | booleano | | Se o cliente aceitou o contato no formulário. `null` quando a fonte não informa |
| `consentimento.texto` | texto | | O texto que o cliente aceitou, quando houver |

Pelo menos um entre `contato.telefone` e `contato.email` sempre vem preenchido.

## 5. Respostas e o que o remetente faz com cada uma

| Resposta do receptor | Significado | O que o remetente faz |
| --- | --- | --- |
| `200`, `201` ou `202` | Recebido | Dá o lead como entregue |
| `409` | Esse `id` já foi recebido | Dá o lead como entregue (não é erro) |
| `400` ou `422` | Corpo inválido | Não entregue. Avisa o responsável no remetente para corrigir |
| `401` ou `403` | Chave errada ou sem permissão | Não entregue. Avisa o responsável no remetente |
| `408`, `429`, `5xx` | Tempo esgotado, muitas chamadas ou erro do receptor | Não entregue |
| Sem resposta em **10 segundos**, ou falha de conexão | — | Não entregue |
| Qualquer outro código | — | Não entregue |

Em todo caso "não entregue", o remetente **não tenta de novo** (seção 6).

O corpo da resposta é opcional. Se vier, pode trazer `{"id_receptor": "..."}`, mas o remetente não depende dele.

## 6. Uma tentativa só, e idempotência

- **Uma tentativa por lead.** Se a chamada não for aceita (qualquer resposta fora de `2xx` e `409`, ou sem resposta em 10 segundos), o remetente **não tenta de novo**: o lead segue por outro caminho do remetente e não é reenviado. Por isso, a disponibilidade do endereço importa: fora do ar, o receptor perde os leads daquele período.
- **Idempotência:** mesmo sem novas tentativas, o mesmo `id` pode chegar duas vezes (por exemplo, por e-mail e pela chamada, durante a troca de um modo para o outro). O receptor guarda o `id` de cada lead recebido e, se ele chegar de novo, **não cria outro lead**: responde `200` ou `409`.
- **Tempo esgotado:** se o receptor gravar o lead mas responder depois de 10 segundos, o remetente considera que falhou. Responda `202` logo e processe depois (seção 7).
- Quando a entrega é por e-mail, o e-mail traz o mesmo `id` no corpo (linha `Id: <id>`).
- A ordem de chegada não é garantida. Use `recebido_em` para ordenar.

## 7. Limites

- Um lead por chamada. Corpo de até **64 KB**.
- Até **60 chamadas por minuto**. Acima disso, o receptor pode responder `429` com `Retry-After`.
- O receptor deve responder em até 10 segundos. Se o processamento for demorado, responda `202` e processe depois.

## 8. Segurança e LGPD

- Os campos de contato são **dados pessoais**. Ao receber, o receptor passa a responder por eles nos termos da LGPD: guardar só o necessário, proteger o acesso e atender a pedidos de exclusão do titular.
- **Não grave a chave nem o corpo das chamadas em logs.** Para depurar, registre só o `id`, a hora e o código de resposta.
- Guarde a chave num cofre de segredos, nunca no código.
- O remetente não guarda cópia do que foi entregue. Pedidos de exclusão de um titular depois da entrega são com o receptor.

## 9. Exemplo

Dados fictícios. O endereço e a chave são de exemplo.

```http
POST /leads/entrada HTTP/1.1
Host: receptor.example.com
Content-Type: application/json; charset=utf-8
Authorization: Bearer chave-de-exemplo-nao-use
Idempotency-Key: 8f14e45f-ceea-467f-a8d6-1c3b2a9e0b11
User-Agent: entrada-leads/1.0

{
  "versao": "1.0",
  "id": "8f14e45f-ceea-467f-a8d6-1c3b2a9e0b11",
  "recebido_em": "2026-11-05T14:32:10-03:00",
  "enviado_em": "2026-11-05T14:32:12-03:00",
  "contato": {
    "nome": "Cliente de Exemplo",
    "telefone": "+5511900000000",
    "email": "cliente@example.com",
    "mensagem": "Gostaria de saber o valor do apartamento de 2 dormitórios."
  },
  "interesse": {
    "produto": "Residencial Exemplo",
    "produto_codigo": null,
    "anuncio_codigo": "ANUNCIO-0001"
  },
  "origem": {
    "fonte": "zap",
    "campanha": null
  },
  "consentimento": {
    "aceito": null,
    "texto": null
  }
}
```

Resposta esperada:

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"id_receptor": "12345"}
```

Mesma chamada repetida:

```http
HTTP/1.1 409 Conflict
```

## 10. Como testar e entrar em produção

1. O receptor publica um **endereço de teste** e uma **chave de teste**, separados dos de produção.
2. O remetente manda leads fictícios com `contato.nome` começando por `TESTE` e telefone `+5511900000000`.
3. Os dois conferem juntos: lead criado, segundo envio do mesmo `id` sem duplicar, resposta `401` com chave errada, `400` com corpo inválido, e o comportamento quando o receptor responde `503`.
4. O receptor entrega o endereço e a chave de produção por canal seguro.
5. O remetente liga o envio e acompanha as primeiras chamadas.

## 11. Versões

| Versão | Data | O que mudou |
| --- | --- | --- |
| 1.0 | 05/11/2026 | Primeira versão |
