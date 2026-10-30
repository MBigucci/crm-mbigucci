// Testes do Cadastro Mágico. Os casos seguem os formatos que o parser do CRM da
// Bruna trata (e-mail de portal com rótulos, tabela de e-mail HTML, WhatsApp
// encaminhado, nome em caixa alta, nome tirado do e-mail, "Marco Zero One" que
// não é o Prime) e os que a MBigucci recebe (Facebook Lead Ads, RD Station).
// Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { camposEncontrados, lerMensagem, type LeadLido } from "./cadastro-magico.ts";

/** Resumo para comparar: valor e selo de cada campo. */
const resumo = (l: LeadLido) => ({
  nome: [l.nome.valor, l.nome.selo],
  whatsapp: [l.whatsapp.valor, l.whatsapp.selo],
  email: [l.email.valor, l.email.selo],
  empreendimento: [l.empreendimento.valor, l.empreendimento.selo],
});

test("e-mail de portal com rótulos: Zap Imóveis", () => {
  const l = lerMensagem(`De: Zap Imóveis <no-reply@zapimoveis.com.br>
Assunto: Novo contato para o seu anúncio

Você recebeu um novo contato!
Nome: Roberto Carlos Mendes
Telefone: (11) 8765-4321
E-mail: roberto.mendes@gmail.com
Código do anúncio: 2589741
Mensagem: Olá, tenho interesse no imóvel. Procuro 3 dormitórios até R$ 650.000.`);
  assert.deepEqual(resumo(l), {
    nome: ["Roberto Carlos Mendes", "detectado"],
    whatsapp: ["5511987654321", "detectado"], // celular antigo ganha o 9º dígito
    email: ["roberto.mendes@gmail.com", "detectado"],
    empreendimento: [null, "faltando"], // código de portal não é empreendimento MBigucci
  });
  assert.deepEqual(l.sugestoes, { valor: 650_000, dormitorios: 3, bairros: [] });
});

test("e-mail em tabela (rótulo numa linha, valor na outra): VivaReal", () => {
  const l = lerMensagem(`VivaReal - novo lead
Nome
MARIA APARECIDA DOS SANTOS
Telefone
+55 11 91234-5678
E-mail
cida.santos@hotmail.com
Mensagem
Gostaria de visitar o apartamento do Rudge Ramos.`);
  assert.deepEqual(resumo(l), {
    nome: ["Maria Aparecida dos Santos", "detectado"], // caixa alta vira nome próprio
    whatsapp: ["5511912345678", "detectado"],
    email: ["cida.santos@hotmail.com", "detectado"],
    empreendimento: [null, "faltando"],
  });
  assert.deepEqual(l.sugestoes.bairros, ["Rudge Ramos"]);
});

test("WhatsApp encaminhado: número no remetente e nome na apresentação", () => {
  const l = lerMensagem(
    `[10:32, 29/10/2026] +55 11 98765-4321: Oi, boa tarde! Meu nome é Ana Paula Ribeiro, vi o anúncio do Marco Zero Prime
[10:33, 29/10/2026] +55 11 98765-4321: Procuro 2 dorms até 450 mil, de preferência no Rudge Ramos ou em São Bernardo do Campo`,
  );
  assert.deepEqual(resumo(l), {
    nome: ["Ana Paula Ribeiro", "detectado"],
    whatsapp: ["5511987654321", "detectado"],
    email: [null, "faltando"],
    empreendimento: ["Marco Zero Prime", "detectado"],
  });
  assert.deepEqual(l.sugestoes, { valor: 450_000, dormitorios: 2, bairros: ["Rudge Ramos", "São Bernardo do Campo"] });
  assert.equal(camposEncontrados(l), 3);
});

test("WhatsApp do Android: o nome do contato vem para conferir, e o corretor é ignorado", () => {
  const l = lerMensagem(
    `29/10/2026 09:15 - Carla Mendes: Bom dia, tudo bem? Aqui é da MBigucci
29/10/2026 09:20 - Joana Prado: Oi Carla! Quero saber do Residencial Life, tem de dois quartos?
29/10/2026 09:21 - Joana Prado: Meu número é 11 97777-1234`,
    ["Carla Mendes"],
  );
  assert.deepEqual(resumo(l), {
    nome: ["Joana Prado", "conferir"],
    whatsapp: ["5511977771234", "detectado"],
    email: [null, "faltando"],
    empreendimento: ["Life", "detectado"],
  });
  assert.equal(l.sugestoes.dormitorios, 2);
});

test("empreendimento: vence o nome mais completo, e o parecido fica para conferir", () => {
  assert.deepEqual(resumo(lerMensagem("Tenho interesse no Marco Zero Mix Residence")).empreendimento, [
    "Marco Zero Mix",
    "detectado",
  ]);
  assert.deepEqual(resumo(lerMensagem("Quero informações do Marco Zero One em São Bernardo")).empreendimento, [
    "Marco Zero One",
    "detectado",
  ]);
  // Começo comum a vários, mas o nome inteiro não está na lista: vem como foi escrito.
  assert.deepEqual(resumo(lerMensagem("Quero informações do Marco Zero Plaza em São Bernardo")).empreendimento, [
    "Marco Zero Plaza",
    "conferir",
  ]);
  // Nome que é palavra comum só vale com contexto.
  assert.deepEqual(resumo(lerMensagem("Moro na Alameda Santos e quero uma life melhor")).empreendimento, [
    null,
    "faltando",
  ]);
  assert.deepEqual(resumo(lerMensagem("Empreendimento: Alameda")).empreendimento, ["Alameda", "detectado"]);
});

test("Facebook Lead Ads: rótulos em inglês e com sublinhado", () => {
  const l = lerMensagem(`Novo lead do Facebook
full_name: Beatriz Lima
phone_number: +5511976543210
email: bia.lima@gmail.com
qual_empreendimento_de_interesse?: Domani
created_time: 2026-10-29T10:15:00-0300`);
  assert.deepEqual(resumo(l), {
    nome: ["Beatriz Lima", "detectado"],
    whatsapp: ["5511976543210", "detectado"],
    email: ["bia.lima@gmail.com", "detectado"],
    empreendimento: ["Domani", "detectado"],
  });
});

test("RD Station: e-mail da MBigucci não é o do cliente", () => {
  const l = lerMensagem(`De: RD Station <notificacoes@rdstation.com.br>
Para: felipe@mbigucci.com.br
Assunto: Nova conversão: Landing page Essenza

Nome: Paulo Henrique Souza
Email: PHSOUZA@UOL.COM.BR
Celular: (11) 99876-5432
Identificador: lp-essenza-2026
Faixa de valor: até 1,2 milhão`);
  assert.deepEqual(resumo(l), {
    nome: ["Paulo Henrique Souza", "detectado"],
    whatsapp: ["5511998765432", "detectado"],
    email: ["phsouza@uol.com.br", "detectado"],
    empreendimento: ["Essenza", "detectado"],
  });
  assert.equal(l.sugestoes.valor, 1_200_000);
});

test("nome pela assinatura e pelo e-mail ficam para conferir", () => {
  const assinatura = lerMensagem(`Boa tarde, vi o lançamento em Santo André e queria mais informações.
Obrigado
Fernando Albuquerque`);
  assert.deepEqual(assinatura.nome, { valor: "Fernando Albuquerque", selo: "conferir" });
  assert.deepEqual(assinatura.sugestoes.bairros, ["Santo André"]);

  const porEmail = lerMensagem("Quero saber valores. carlos.pereira84@hotmail.com");
  assert.deepEqual(porEmail.nome, { valor: "Carlos Pereira", selo: "conferir" });
});

test("nome antes do telefone, como no contato encaminhado", () => {
  const l = lerMensagem("Lucas Oliveira Prado 11 94567-8901 interessado no Stylo");
  assert.deepEqual(resumo(l), {
    nome: ["Lucas Oliveira Prado", "conferir"],
    whatsapp: ["5511945678901", "detectado"],
    email: [null, "faltando"],
    empreendimento: ["Stylo", "detectado"],
  });
});

test("orçamento e dormitórios em vários formatos", () => {
  assert.equal(lerMensagem("orçamento de 500k").sugestoes.valor, 500_000);
  assert.equal(lerMensagem("valor de R$ 1.200.000,00").sugestoes.valor, 1_200_000);
  assert.equal(lerMensagem("até 380.000").sugestoes.valor, 380_000);
  assert.equal(lerMensagem("tenho 50 mil de entrada").sugestoes.valor, null); // sem palavra de orçamento
  assert.equal(lerMensagem("apto de três quartos").sugestoes.dormitorios, 3);
  assert.equal(lerMensagem("Procuro 4 dormitórios").sugestoes.dormitorios, 4);
});

test("texto sem nada reconhecível: todos os campos faltando", () => {
  const l = lerMensagem("ok, obrigado");
  assert.deepEqual(resumo(l), {
    nome: [null, "faltando"],
    whatsapp: [null, "faltando"],
    email: [null, "faltando"],
    empreendimento: [null, "faltando"],
  });
  assert.deepEqual(l.sugestoes, { valor: null, dormitorios: null, bairros: [] });
  assert.equal(camposEncontrados(l), 0);
});
