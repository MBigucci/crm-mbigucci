// Testes da busca, da ordem e dos filtros de /leads/. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  criarBusca,
  dobrar,
  noEmpreendimento,
  opcoesEmpreendimento,
  ordenarLeads,
  SEM_EMPREENDIMENTO,
  variacoesTelefone,
} from "./busca.ts";
import { normalizarWhatsapp } from "./leads.ts";

const lead = (nome: string, extra: Record<string, unknown> = {}) => ({
  nome,
  whatsapp: "5511987654321",
  email: null as string | null,
  empreendimento: null as string | null,
  campanha: null as string | null,
  regiao: null as string | null,
  proximo_contato: null as string | null,
  ultima_interacao_em: null as string | null,
  created_at: "2026-10-01T12:00:00-03:00",
  ...extra,
});
const achados = (consulta: string, leads: ReturnType<typeof lead>[]) => leads.filter(criarBusca(consulta)).map((l) => l.nome);

test("busca: ignora acento e maiúscula, e cada termo precisa aparecer", () => {
  assert.equal(dobrar("São Bernardo ÁGUA"), "sao bernardo agua");
  const leads = [
    lead("João Araújo", { empreendimento: "Residencial Life" }),
    lead("Ana Paula", { empreendimento: "Marco Zero One", email: "ana@gmail.com" }),
    lead("Ânderson", { regiao: "Rudge Ramos", campanha: "Feirão" }),
  ];
  assert.deepEqual(achados("joao", leads), ["João Araújo"]);
  assert.deepEqual(achados("ARAUJO", leads), ["João Araújo"]);
  assert.deepEqual(achados("anderson", leads), ["Ânderson"]);
  assert.deepEqual(achados("ana marco", leads), ["Ana Paula"]);
  assert.deepEqual(achados("ana life", leads), []);
  assert.deepEqual(achados("rudge feirao", leads), ["Ânderson"]);
  assert.deepEqual(achados("gmail", leads), ["Ana Paula"]);
  assert.deepEqual(achados("   ", leads).length, 3);
});

test("busca: telefone em qualquer formato", () => {
  const leads = [lead("Ana"), lead("Bia", { whatsapp: "551141234567" })];
  for (const q of [
    "(11) 98765-4321",
    "11987654321",
    "+55 11 98765-4321",
    "5511987654321",
    "011 98765-4321",
    "98765-4321",
    "8765-4321", // celular antigo sem o 9
    "(11) 8765-4321", // com DDD e sem o 9: a normalização põe o 9
    "4321",
  ])
    assert.deepEqual(achados(q, leads), ["Ana"], q);
  assert.deepEqual(achados("4123-4567", leads), ["Bia"]);
  assert.deepEqual(achados("ana 98765", leads), ["Ana"]); // termo de texto e termo de número juntos
  assert.deepEqual(achados("12", leads), []); // menos de 3 dígitos não busca telefone
  assert.deepEqual(variacoesTelefone("+55 (11) 8765-4321").sort(), ["1187654321", "551187654321", "5511987654321"].sort());
});

test("WhatsApp: o 9º dígito evita o mesmo cliente com e sem o 9", () => {
  assert.equal(normalizarWhatsapp("+55 (11) 8765-4321"), normalizarWhatsapp("11 98765-4321"));
  assert.equal(normalizarWhatsapp("(19) 6123-4567"), "5519961234567");
  assert.equal(normalizarWhatsapp("(19) 3123-4567"), "551931234567"); // fixo fica como está
  assert.equal(normalizarWhatsapp("(00) 98765-4321"), null);
});

test("ordem: próximo contato, mais tempo sem contato e nome", () => {
  const leads = [
    lead("Bia", { proximo_contato: "2026-10-30T10:00:00-03:00", ultima_interacao_em: "2026-10-28T10:00:00-03:00" }),
    lead("ana", { proximo_contato: null, created_at: "2026-10-25T10:00:00-03:00" }), // nunca contatada
    lead("Ágata", { proximo_contato: "2026-10-27T10:00:00-03:00", ultima_interacao_em: "2026-10-20T10:00:00-03:00" }),
    lead("Caio", { proximo_contato: null, created_at: "2026-10-28T10:00:00-03:00" }),
  ];
  const nomes = (o: Parameters<typeof ordenarLeads>[1]) => ordenarLeads(leads, o).map((l) => l.nome);
  assert.deepEqual(nomes("proximo_contato"), ["Ágata", "Bia", "Caio", "ana"]);
  assert.deepEqual(nomes("sem_contato"), ["Ágata", "ana", "Bia", "Caio"]);
  assert.deepEqual(nomes("nome"), ["Ágata", "ana", "Bia", "Caio"]);
});

test("filtro de empreendimento: grafias parecidas viram uma opção", () => {
  const leads = [
    lead("A", { empreendimento: "Marco Zero One" }),
    lead("B", { empreendimento: "marco zero  one " }),
    lead("C", { empreendimento: "Marco Zero One" }),
    lead("D", { empreendimento: "Life" }),
    lead("E"),
  ];
  assert.deepEqual(opcoesEmpreendimento(leads), [
    { chave: "life", nome: "Life", total: 1 },
    { chave: "marco zero one", nome: "Marco Zero One", total: 3 },
  ]);
  assert.deepEqual(leads.filter((l) => noEmpreendimento(l, "marco zero one")).map((l) => l.nome), ["A", "B", "C"]);
  assert.deepEqual(leads.filter((l) => noEmpreendimento(l, SEM_EMPREENDIMENTO)).map((l) => l.nome), ["E"]);
  assert.equal(leads.filter((l) => noEmpreendimento(l, "")).length, 5);
});
