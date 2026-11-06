// Testes do leitor de e-mail de lead.
//
// ATENÇÃO: TODOS OS E-MAILS DAQUI SÃO FICTÍCIOS, montados pelo formato provável
// de cada fonte. Os remetentes usam os domínios públicos dos portais e os
// clientes são inventados (telefones 90000-xxxx, e-mails em exemplo.test).
// Quando os e-mails reais do Felipe chegarem, com os dados do cliente trocados,
// substitua cada exemplo pelo real e ajuste o leitor.
//
// Rode com: node --test marketing/src/lib/leitor-email.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enderecoDe,
  lerEmailDeLead,
  lerMensagemDoCliente,
  reconhecerFonte,
  remetenteCasa,
  textoDoHtml,
  type EmailRecebido,
  type Fonte,
} from "./leitor-email.ts";
import type { Empreendimento } from "./catalogo.ts";

/** Como o seed de lead_fontes nasce: sem padrões (vale REMETENTES_SUGERIDOS). */
const FONTES: Fonte[] = [
  ["site", "Site MBigucci"],
  ["zap", "ZAP Imóveis"],
  ["vivareal", "Viva Real"],
  ["olx", "OLX"],
  ["imovelweb", "Imovelweb"],
  ["chavesnamao", "Chaves na Mão"],
].map(([slug, nome]) => ({ slug, nome, remetentes: [], assunto_contem: [] }));

const emp = (id: string, nome: string, extra: Partial<Empreendimento> = {}): Empreendimento => ({
  id, nome, condominio: null, variacoes: [], pede_contexto: false, ativo: true, bairro: null, cidade: null, ordem: 0, ...extra,
});
const CATALOGO: Empreendimento[] = [
  emp("e-prime", "Marco Zero Prime", { ordem: 1 }),
  emp("e-one", "Marco Zero One", { ordem: 2 }),
  emp("e-life", "Life MBigucci", { pede_contexto: true, ordem: 3 }),
  emp("e-lucca", "Mundi Lucca", { condominio: "Mundi", variacoes: ["Mundi"], ordem: 4 }),
  emp("e-thiago", "Mundi Thiago", { condominio: "Mundi", variacoes: ["Mundi"], ordem: 5 }),
];

const email = (e: Partial<EmailRecebido> & Pick<EmailRecebido, "de" | "assunto" | "corpo">): EmailRecebido => ({
  id: `<ficticio-${Math.random().toString(36).slice(2)}@exemplo.test>`,
  recebido_em: "2026-11-07T13:30:00Z",
  ...e,
});

test("remetente: domínio, subdomínio e endereço inteiro", () => {
  assert.equal(enderecoDe('"ZAP Imóveis" <No-Reply@Mail.ZapImoveis.com.br>'), "no-reply@mail.zapimoveis.com.br");
  assert.equal(enderecoDe("contato@exemplo.test"), "contato@exemplo.test");
  assert.ok(remetenteCasa("x@zapimoveis.com.br", "@zapimoveis.com.br"));
  assert.ok(remetenteCasa("x@mail.zapimoveis.com.br", "@zapimoveis.com.br"));
  assert.ok(!remetenteCasa("x@falsozapimoveis.com.br", "@zapimoveis.com.br"), "não pega domínio que só termina igual");
  assert.ok(remetenteCasa("leads@portal.test", "Leads@Portal.test"));
  assert.ok(!remetenteCasa("outro@portal.test", "leads@portal.test"));
});

test("fonte: o banco vale sobre a sugestão; o assunto separa fontes do mesmo remetente", () => {
  assert.equal(reconhecerFonte("no-reply@olx.com.br", "Novo contato", FONTES), "olx");
  assert.equal(reconhecerFonte("alguem@desconhecido.test", "Novo contato", FONTES), null);
  // ZAP e Viva Real mandando do mesmo remetente (hipótese): o assunto decide.
  const mesmo: Fonte[] = [
    { slug: "zap", nome: "ZAP Imóveis", remetentes: ["@grupo.test"], assunto_contem: ["ZAP"] },
    { slug: "vivareal", nome: "Viva Real", remetentes: ["@grupo.test"], assunto_contem: ["Viva Real"] },
  ];
  assert.equal(reconhecerFonte("leads@grupo.test", "Novo lead pelo ZAP Imóveis", mesmo), "zap");
  assert.equal(reconhecerFonte("leads@grupo.test", "Contato pelo VIVA REAL", mesmo), "vivareal");
  assert.equal(reconhecerFonte("leads@grupo.test", "Outro assunto", mesmo), null);
  // Preenchido no banco, a sugestão não vale mais para aquela fonte.
  const trocado = FONTES.map((f) => (f.slug === "olx" ? { ...f, remetentes: ["leads@olx.test"] } : f));
  assert.equal(reconhecerFonte("no-reply@olx.com.br", "Novo contato", trocado), null);
  assert.equal(reconhecerFonte("leads@olx.test", "Novo contato", trocado), "olx");
});

test("HTML em texto: tabela vira rótulo e valor em linhas; entidades decodificadas", () => {
  const t = textoDoHtml(`<html><head><style>td{color:red}</style></head><body>
    <p>Voc&ecirc; recebeu um contato&nbsp;novo</p>
    <table><tr><td>Nome</td><td>Jo&atilde;o &amp; Maria</td></tr><tr><td>Telefone</td><td>(11) 90000-0001</td></tr></table>
    Linha<br>quebrada &#233; &#xE9;</body></html>`);
  assert.equal(t, "Você recebeu um contato novo\n\nNome\nJoão & Maria\n\nTelefone\n(11) 90000-0001\n\nLinha\nquebrada é é");
  assert.equal(textoDoHtml("&Ccedil;&Atilde;O &amp;x; &desconhecida;"), "ÇÃO &x; &desconhecida;");
});

test("mensagem do cliente: o campo, em várias linhas, até o próximo rótulo", () => {
  assert.equal(lerMensagemDoCliente("Nome: Ana\nMensagem: Quero visitar\nno sábado.\nTelefone: 11 90000-0001"), "Quero visitar\nno sábado.");
  assert.equal(lerMensagemDoCliente("Nome: Ana\nMensagem:\nTenho interesse.\n\nEnviado pelo site"), "Tenho interesse.");
  assert.equal(lerMensagemDoCliente("Comentário: Ligar depois das 18h"), "Ligar depois das 18h");
  assert.equal(lerMensagemDoCliente("Olá, quero saber o preço."), "Olá, quero saber o preço.", "sem campo: o corpo inteiro");
});

// ---------- As 5 fontes (site e 4 portais), com e-mails FICTÍCIOS ----------

test("FICTÍCIO · site MBigucci (Contact Form 7, rótulos fixos que nós controlamos)", () => {
  const l = lerEmailDeLead(email({
    de: "Site MBigucci <wordpress@mbigucci.com.br>",
    assunto: "Novo contato pelo site: Marco Zero Prime",
    corpo: `Nome: Carla Fictícia Souza
Telefone: (11) 90000-0101
E-mail: carla.ficticia@exemplo.test
Produto: Marco Zero Prime
Mensagem: Gostaria de agendar uma visita ao decorado.

--
Este e-mail foi enviado de um formulário de contato em mbigucci.com.br`,
  }), FONTES, CATALOGO);
  assert.deepEqual(
    { fonte: l.fonte, nome: l.nome, telefone: l.telefone, email: l.email, produto_id: l.produto_id, mensagem: l.mensagem },
    { fonte: "site", nome: "Carla Fictícia Souza", telefone: "5511900000101", email: "carla.ficticia@exemplo.test",
      produto_id: "e-prime", mensagem: "Gostaria de agendar uma visita ao decorado." },
  );
});

test("FICTÍCIO · ZAP Imóveis (HTML em tabela, telefone sem o 9)", () => {
  const l = lerEmailDeLead(email({
    de: '"ZAP Imóveis" <no-reply@zapimoveis.com.br>',
    assunto: "Você recebeu um novo contato",
    corpo_tipo: "html",
    corpo: `<table>
      <tr><td>Nome</td><td>RENATO FICTÍCIO DA SILVA</td></tr>
      <tr><td>Telefone</td><td>(11) 9000-0202</td></tr>
      <tr><td>E-mail</td><td>renato.ficticio@exemplo.test</td></tr>
      <tr><td>Anúncio</td><td>Mundi Lucca - Apartamento 2 dormitórios</td></tr>
      <tr><td>Mensagem</td><td>Olá, tenho interesse neste imóvel.</td></tr>
    </table><p>Equipe ZAP Imóveis</p>`,
  }), FONTES, CATALOGO);
  assert.equal(l.fonte, "zap");
  assert.equal(l.nome, "Renato Fictício da Silva");
  assert.equal(l.telefone, "5511990000202", "celular antigo de 8 dígitos ganha o 9º dígito");
  assert.equal(l.email, "renato.ficticio@exemplo.test");
  assert.equal(l.produto_id, "e-lucca");
  assert.equal(l.mensagem, "Olá, tenho interesse neste imóvel.");
});

test("FICTÍCIO · Viva Real (produto pelo condomínio: vale a primeira torre)", () => {
  const l = lerEmailDeLead(email({
    de: "Viva Real <leads@vivareal.com.br>",
    assunto: "Novo interessado no seu anúncio",
    corpo: `Olá, MBigucci

Um interessado entrou em contato:
Nome do interessado: Paula Fictícia
Celular: +55 11 90000-0303
Email: paula.ficticia@exemplo.test
Imóvel: Mundi
Mensagem do interessado: Aceita financiamento?`,
  }), FONTES, CATALOGO);
  assert.deepEqual([l.fonte, l.nome, l.telefone, l.email, l.produto_id, l.mensagem],
    ["vivareal", "Paula Fictícia", "5511900000303", "paula.ficticia@exemplo.test", "e-lucca", "Aceita financiamento?"]);
});

test("FICTÍCIO · OLX (produto não reconhecido fica nulo)", () => {
  const l = lerEmailDeLead(email({
    de: "OLX <naoresponda@olx.com.br>",
    assunto: "Nova mensagem sobre o seu anúncio",
    corpo: `Anúncio: Apartamento 3 dormitórios no Rudge Ramos
Nome: Marcos Fictício
Telefone: 11 90000-0404
Mensagem: Ainda está disponível?`,
  }), FONTES, CATALOGO);
  assert.equal(l.fonte, "olx");
  assert.equal(l.nome, "Marcos Fictício");
  assert.equal(l.telefone, "5511900000404");
  assert.equal(l.email, null, "o e-mail do portal não é o do cliente");
  assert.equal(l.produto_id, null);
  assert.equal(l.mensagem, "Ainda está disponível?");
});

test("FICTÍCIO · Imovelweb (rótulo e valor em linhas separadas)", () => {
  const l = lerEmailDeLead(email({
    de: "Imovelweb <contato@imovelweb.com.br>",
    assunto: "Contato recebido - Life MBigucci",
    corpo: `Dados do contato
Nome:
Juliana Fictícia Lima
Telefone:
(11) 90000-0505
E-mail:
juliana.ficticia@exemplo.test
Mensagem:
Quero saber o valor do condomínio.`,
  }), FONTES, CATALOGO);
  assert.deepEqual([l.fonte, l.nome, l.telefone, l.email, l.produto_id, l.mensagem],
    ["imovelweb", "Juliana Fictícia Lima", "5511900000505", "juliana.ficticia@exemplo.test", "e-life", "Quero saber o valor do condomínio."]);
});

test("FICTÍCIO · Chaves na Mão (sem campo de mensagem: vai o corpo inteiro)", () => {
  const corpo = `Novo lead recebido
Nome: Pedro Fictício Alves
Telefone: (11) 90000-0606
E-mail: pedro.ficticio@exemplo.test
Empreendimento: Marco Zero One`;
  const l = lerEmailDeLead(email({ de: "Chaves na Mão <leads@chavesnamao.com.br>", assunto: "Novo lead", corpo }), FONTES, CATALOGO);
  assert.deepEqual([l.fonte, l.nome, l.telefone, l.email, l.produto_id, l.mensagem],
    ["chavesnamao", "Pedro Fictício Alves", "5511900000606", "pedro.ficticio@exemplo.test", "e-one", corpo]);
});

test("fonte desconhecida e catálogo vazio: o lead segue com fonte e produto nulos", () => {
  const l = lerEmailDeLead(email({
    de: "alguem@desconhecido.test",
    assunto: "Interesse",
    corpo: "Nome: Teresa Fictícia\nTelefone: 11 90000-0707\nEmpreendimento: Marco Zero Prime",
  }), FONTES, []);
  assert.deepEqual([l.fonte, l.produto_id, l.produto_nome, l.telefone], [null, null, null, "5511900000707"]);
  assert.match(l.entrada_id, /^<ficticio-/);
  assert.equal(l.recebido_em, "2026-11-07T13:30:00Z");
});
