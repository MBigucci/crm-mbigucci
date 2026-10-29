// Testes das mensagens prontas. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  linkLigar,
  linkWhatsappComTexto,
  mensagemRepasse,
  preencherModelo,
  primeiroNome,
  sugerirModelo,
  variaveisDesconhecidas,
  type ModeloMensagem,
} from "./mensagens.ts";

process.env.TZ = "America/Sao_Paulo";
const agora = new Date("2026-10-29T10:00:00-03:00");

const m = (slug: string, etapas: string[], extra: Partial<ModeloMensagem> = {}): ModeloMensagem => ({
  slug,
  titulo: slug,
  texto: slug,
  etapas,
  sem_contato: false,
  ordem: 0,
  ativo: true,
  ...extra,
});
// Os modelos que o schema.sql cria.
const modelos = [
  m("primeiro_contato", ["novo"], { ordem: 1 }),
  m("retomar_contato", ["em_contato"], { ordem: 2, sem_contato: true }),
  m("convite_visita", [], { ordem: 3 }),
  m("confirmar_visita", ["visita_agendada"], { ordem: 4 }),
  m("depois_da_visita", ["visita_realizada", "proposta"], { ordem: 5 }),
  m("lancamento", ["aguardando_lancamento"], { ordem: 6 }),
];
const lead = (etapa: string, extra: Record<string, unknown> = {}) => ({
  etapa,
  status: "ativo" as const,
  ultima_interacao_em: "2026-10-29T09:00:00-03:00",
  created_at: "2026-10-20T09:00:00-03:00",
  tentativas: 0,
  ...extra,
});
const sugerido = (l: ReturnType<typeof lead>, lista = modelos) => sugerirModelo(lista, l, agora)?.slug;

test("modelos: primeiro nome, variáveis e empreendimento vazio", () => {
  assert.equal(primeiroNome("  ANA paula Souza "), "Ana");
  assert.equal(primeiroNome("joão"), "João");
  assert.equal(primeiroNome(""), "");
  const texto = "Oi, {primeiro_nome}. Aqui é {corretor}, sobre {empreendimento}. {nome} {desconhecida}";
  assert.equal(
    preencherModelo(texto, { nome: "maria das dores", empreendimento: " Marco Zero One " }, "Carla Souza"),
    "Oi, Maria. Aqui é Carla Souza, sobre Marco Zero One. maria das dores {desconhecida}",
  );
  assert.equal(
    preencherModelo("Sobre {empreendimento}.", { nome: "Ana", empreendimento: null }, "Carla"),
    "Sobre nossos empreendimentos.",
  );
  assert.deepEqual(variaveisDesconhecidas("{primeiro_nome} {telefone} {telefone} {corretor}"), ["telefone"]);
});

test("modelos: a sugestão segue a etapa e o tempo sem contato", () => {
  assert.equal(sugerido(lead("novo")), "primeiro_contato");
  // Lead novo esquecido continua no primeiro contato: ele ainda não foi atendido.
  assert.equal(sugerido(lead("novo", { ultima_interacao_em: null })), "primeiro_contato");
  assert.equal(sugerido(lead("em_contato")), "retomar_contato");
  assert.equal(sugerido(lead("visita_agendada")), "confirmar_visita");
  assert.equal(sugerido(lead("proposta")), "depois_da_visita");
  assert.equal(sugerido(lead("aguardando_lancamento")), "lancamento");
  // 2 dias sem contato ou tentativa sem resposta: retomar, em qualquer etapa depois de "novo".
  assert.equal(sugerido(lead("visita_agendada", { ultima_interacao_em: "2026-10-27T18:00:00-03:00" })), "retomar_contato");
  assert.equal(sugerido(lead("proposta", { tentativas: 1 })), "retomar_contato");
  // 1 dia ainda não conta.
  assert.equal(sugerido(lead("proposta", { ultima_interacao_em: "2026-10-28T18:00:00-03:00" })), "depois_da_visita");
  // Etapa sem modelo: o primeiro da lista.
  assert.equal(sugerido(lead("venda")), "primeiro_contato");
});

test("modelos: desligado não é sugerido, e a ordem decide o empate", () => {
  const lista = modelos.map((x) => (x.slug === "confirmar_visita" ? { ...x, ativo: false } : x));
  assert.equal(sugerido(lead("visita_agendada"), lista), "primeiro_contato");
  const dois = [...modelos, m("outra_confirmacao", ["visita_agendada"], { ordem: 0 })];
  assert.equal(sugerido(lead("visita_agendada"), dois), "outra_confirmacao");
  assert.equal(sugerirModelo([], lead("novo"), agora), null);
});

test("links: WhatsApp com texto e Ligar", () => {
  assert.equal(linkWhatsappComTexto("5511987654321", "Oi, Ana.\nTudo bem?"), "https://wa.me/5511987654321?text=Oi%2C%20Ana.%0ATudo%20bem%3F");
  assert.equal(linkWhatsappComTexto("5511987654321", "  "), "https://wa.me/5511987654321");
  assert.equal(linkLigar("5511987654321"), "tel:+5511987654321");
});

test("repasse: nome, WhatsApp, empreendimento, prazo e link da ficha", () => {
  const link = "https://www.mbigucci.com.br/crm/leads/ficha/?id=1";
  assert.equal(
    mensagemRepasse({
      corretor: "Carla Souza",
      cliente: "Ana Paula",
      whatsapp: "5511987654321",
      empreendimento: "Marco Zero One",
      prazo: "responder em 15 min",
      link,
    }),
    [
      "Oi, Carla. Você recebeu um lead da empresa no CRM.",
      "",
      "*Ana Paula*",
      "WhatsApp: (11) 98765-4321",
      "Empreendimento: Marco Zero One",
      "",
      "Prazo do primeiro contato: responder em 15 min.",
      "",
      `Abra a ficha: ${link}`,
    ].join("\n"),
  );
  const semExtras = mensagemRepasse({
    corretor: "Carla",
    cliente: "Ana",
    whatsapp: "5511987654321",
    empreendimento: null,
    prazo: null,
    link,
  });
  assert.ok(!semExtras.includes("Empreendimento"));
  assert.ok(!semExtras.includes("Prazo"));
});
