// Testes das regras puras de leads. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deCampos,
  formatarQuando,
  formatarWhatsapp,
  grupoDoLead,
  montarListaDoDia,
  normalizarWhatsapp,
  ordenarListaDoDia,
  type Temperatura,
} from "./leads.ts";

process.env.TZ = "America/Sao_Paulo";

// 29/10/2026, 10:00 em São Paulo (UTC-3).
const agora = new Date("2026-10-29T10:00:00-03:00");

type L = {
  nome: string;
  status: "ativo" | "descartado";
  temperatura: Temperatura | null;
  proximo_contato: string | null;
  created_at: string;
};
const l = (
  nome: string,
  temperatura: Temperatura | null,
  proximo_contato: string | null,
  extra: Partial<L> = {},
): L => ({
  nome,
  temperatura,
  proximo_contato,
  status: "ativo",
  created_at: "2026-10-01T12:00:00-03:00",
  ...extra,
});
const nomes = (xs: L[]) => xs.map((x) => x.nome);

test("ordem: atrasados, hoje quentes, mornos, frios, sem data", () => {
  const leads = [
    l("hoje frio", "frio", "2026-10-29T11:00:00-03:00"),
    l("sem data", "quente", null),
    l("hoje morno", "morno", "2026-10-29T15:00:00-03:00"),
    l("atrasado frio", "frio", "2026-10-27T09:00:00-03:00"),
    l("hoje quente", "quente", "2026-10-29T18:00:00-03:00"),
    l("atrasado quente", "quente", "2026-10-28T09:00:00-03:00"),
  ];
  assert.deepEqual(nomes(ordenarListaDoDia(leads, agora)), [
    "atrasado quente",
    "atrasado frio",
    "hoje quente",
    "hoje morno",
    "hoje frio",
    "sem data",
  ]);
});

test("contato de hoje cuja hora já passou conta como atrasado", () => {
  assert.equal(grupoDoLead(l("x", "morno", "2026-10-29T08:00:00-03:00"), agora), "atrasados");
  assert.equal(grupoDoLead(l("x", "morno", "2026-10-29T10:00:00-03:00"), agora), "hoje");
  assert.equal(grupoDoLead(l("x", "morno", "2026-10-29T23:59:00-03:00"), agora), "hoje");
});

test("contato de amanhã e lead descartado ficam fora da lista do dia", () => {
  assert.equal(grupoDoLead(l("x", "quente", "2026-10-30T00:00:00-03:00"), agora), null);
  assert.equal(grupoDoLead(l("x", "quente", "2026-10-28T09:00:00-03:00", { status: "descartado" }), agora), null);
  assert.deepEqual(montarListaDoDia([l("amanhã", "quente", "2026-10-30T09:00:00-03:00")], agora), []);
});

test("meia-noite em UTC não empurra o lead para o dia seguinte", () => {
  // 29/10 às 22:00 em São Paulo já é 30/10 em UTC, mas ainda é hoje para o corretor.
  assert.equal(grupoDoLead(l("x", "quente", "2026-10-30T01:00:00Z"), agora), "hoje");
});

test("na mesma temperatura, o contato mais antigo vem antes", () => {
  const leads = [
    l("hoje 16h", "quente", "2026-10-29T16:00:00-03:00"),
    l("hoje 11h", "quente", "2026-10-29T11:00:00-03:00"),
    l("atrasado 2 dias", "morno", "2026-10-27T09:00:00-03:00"),
    l("atrasado 5 dias", "morno", "2026-10-24T09:00:00-03:00"),
  ];
  assert.deepEqual(nomes(ordenarListaDoDia(leads, agora)), [
    "atrasado 5 dias",
    "atrasado 2 dias",
    "hoje 11h",
    "hoje 16h",
  ]);
});

test("sem temperatura fica depois dos frios", () => {
  const leads = [l("sem temp", null, "2026-10-29T11:00:00-03:00"), l("frio", "frio", "2026-10-29T17:00:00-03:00")];
  assert.deepEqual(nomes(ordenarListaDoDia(leads, agora)), ["frio", "sem temp"]);
});

test("sem próximo contato: por temperatura e, depois, o cadastro mais novo primeiro", () => {
  const leads = [
    l("antigo", null, null, { created_at: "2026-10-01T09:00:00-03:00" }),
    l("novo", null, null, { created_at: "2026-10-29T09:00:00-03:00" }),
    l("morno antigo", "morno", null, { created_at: "2026-09-01T09:00:00-03:00" }),
  ];
  assert.deepEqual(nomes(ordenarListaDoDia(leads, agora)), ["morno antigo", "novo", "antigo"]);
});

test("os grupos vêm nomeados e sem grupo vazio", () => {
  const g = montarListaDoDia([l("a", "quente", null), l("b", "frio", "2026-10-28T09:00:00-03:00")], agora);
  assert.deepEqual(
    g.map((x) => [x.grupo, x.leads.length]),
    [
      ["atrasados", 1],
      ["sem_data", 1],
    ],
  );
});

test("a ordenação não altera a lista original", () => {
  const leads = [l("b", "frio", null), l("a", "quente", null)];
  ordenarListaDoDia(leads, agora);
  assert.deepEqual(nomes(leads), ["b", "a"]);
});

test("WhatsApp: guarda só dígitos com 55 e recusa número curto", () => {
  assert.equal(normalizarWhatsapp("(11) 98765-4321"), "5511987654321");
  assert.equal(normalizarWhatsapp("+55 11 98765 4321"), "5511987654321");
  assert.equal(normalizarWhatsapp("011 4123-4567"), "551141234567");
  assert.equal(normalizarWhatsapp("98765-4321"), null);
  assert.equal(formatarWhatsapp("5511987654321"), "(11) 98765-4321");
  assert.equal(formatarWhatsapp("551141234567"), "(11) 4123-4567");
});

test("datas: hoje, amanhã, ontem e dd/mm/aaaa", () => {
  assert.equal(formatarQuando("2026-10-29T14:05:00-03:00", agora), "Hoje, 14:05");
  assert.equal(formatarQuando("2026-10-30T09:00:00-03:00", agora), "Amanhã, 09:00");
  assert.equal(formatarQuando("2026-10-28T09:00:00-03:00", agora), "Ontem, 09:00");
  assert.equal(formatarQuando("2026-10-02T09:00:00-03:00", agora), "02/10/2026, 09:00");
  assert.equal(deCampos("2026-10-30", "09:00"), "2026-10-30T12:00:00.000Z");
  assert.equal(deCampos("", "09:00"), null);
});
