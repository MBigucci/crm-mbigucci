// Testes do painel da equipe. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deDataIso,
  deslocar,
  montarPainel,
  periodo,
  rotuloPeriodo,
  somar,
  taxa,
  type LeadPainel,
  type Perdido,
} from "./painel.ts";
import type { Evento } from "./leads.ts";

process.env.TZ = "America/Sao_Paulo";

const ref = new Date("2026-10-29T15:00:00-03:00"); // quinta
const iso = (d: Date) => d.toISOString();

test("período: dia, semana de segunda a domingo e mês", () => {
  const d = periodo("dia", ref);
  assert.equal(iso(d.ini), "2026-10-29T03:00:00.000Z");
  assert.equal(iso(d.fim), "2026-10-30T03:00:00.000Z");
  const s = periodo("semana", ref);
  assert.equal(iso(s.ini), "2026-10-26T03:00:00.000Z");
  assert.equal(iso(s.fim), "2026-11-02T03:00:00.000Z");
  // Domingo ainda é da semana que começou na segunda anterior.
  assert.equal(iso(periodo("semana", new Date("2026-11-01T20:00:00-03:00")).ini), "2026-10-26T03:00:00.000Z");
  const m = periodo("mes", ref);
  assert.equal(iso(m.ini), "2026-10-01T03:00:00.000Z");
  assert.equal(iso(m.fim), "2026-11-01T03:00:00.000Z");
});

test("período: rótulos, anterior e seguinte", () => {
  assert.equal(rotuloPeriodo(periodo("dia", ref)), "Quinta, 29/10/2026");
  assert.equal(rotuloPeriodo(periodo("semana", ref)), "26/10 a 01/11/2026");
  assert.equal(rotuloPeriodo(periodo("mes", ref)), "Outubro de 2026");
  assert.equal(rotuloPeriodo(deslocar(periodo("dia", ref), 1)), "Sexta, 30/10/2026");
  assert.equal(rotuloPeriodo(deslocar(periodo("semana", ref), -1)), "19/10 a 25/10/2026");
  assert.equal(rotuloPeriodo(deslocar(periodo("mes", ref), 3)), "Janeiro de 2027");
  assert.equal(deDataIso("2026-10-29")?.getDate(), 29);
  assert.equal(deDataIso("29/10/2026"), null);
});

// ---------- Números ----------

const GER = "gerente", CARLA = "carla", DIEGO = "diego";
let n = 0;
const ev = (lead_id: string, quando: string, tipo: Evento["tipo"], x: Partial<Evento> = {}): Evento => ({
  id: String(++n),
  lead_id,
  tipo,
  de: null,
  para: null,
  detalhe: null,
  automatico: false,
  autor_id: null,
  criado_em: new Date(`2026-10-${quando}-03:00`).toISOString(),
  ...x,
});
const lead = (id: string, dono_id: string, origem: string, etapa = "novo", status = "ativo"): LeadPainel => ({
  id,
  nome: id,
  dono_id,
  origem,
  etapa,
  status,
  motivo_descarte: null,
  empreendimento: null,
});

const leads = new Map(
  [
    lead("emp1", DIEGO, "empresa"), // perdido pela Carla, foi para o Diego
    lead("emp2", CARLA, "empresa", "visita_agendada"),
    lead("pl1", CARLA, "plantao", "venda"),
    lead("ind1", CARLA, "indicacao", "em_contato", "descartado"),
    lead("ind2", CARLA, "indicacao", "em_contato"),
    lead("velho", CARLA, "carteira", "proposta"),
  ].map((l) => [l.id, l]),
);
const eventos: Evento[] = [
  ev("emp1", "29T09:00:00", "criado", { para: CARLA, autor_id: GER }),
  ev("emp1", "29T10:00:00", "dono", { de: CARLA, para: DIEGO, detalhe: "perdido", autor_id: GER }),
  ev("emp2", "29T09:30:00", "criado", { para: CARLA, autor_id: GER }),
  ev("emp2", "29T09:40:00", "etapa", { de: "novo", para: "em_contato", automatico: true, autor_id: CARLA }),
  ev("emp2", "30T11:00:00", "etapa", { de: "em_contato", para: "visita_agendada", autor_id: CARLA }), // depois do dia: conta no funil
  ev("pl1", "29T11:00:00", "criado", { para: CARLA, autor_id: CARLA }),
  ev("pl1", "29T12:00:00", "etapa", { de: "novo", para: "proposta", autor_id: CARLA }),
  ev("pl1", "29T13:00:00", "etapa", { de: "proposta", para: "venda", autor_id: CARLA }),
  ev("ind1", "29T11:10:00", "criado", { para: CARLA, autor_id: CARLA }),
  ev("ind1", "29T11:20:00", "status", { de: "ativo", para: "descartado", detalhe: "fora_do_perfil", autor_id: CARLA }),
  // Descartou e desfez: não conta.
  ev("ind2", "29T11:30:00", "criado", { para: CARLA, autor_id: CARLA }),
  ev("ind2", "29T11:31:00", "status", { de: "ativo", para: "descartado", detalhe: "duplicado", autor_id: CARLA }),
  ev("ind2", "29T11:32:00", "status", { de: "descartado", para: "ativo", autor_id: CARLA }),
  // Lead antigo: só a mudança de etapa cai no período; não entra no funil, nem em cadastrados.
  ev("velho", "29T14:00:00", "etapa", { de: "visita_realizada", para: "proposta", autor_id: CARLA }),
];
const perdidos: Perdido[] = [
  { lead_id: "emp1", nome: "emp1", corretor_id: CARLA, recebeu_id: DIEGO, criado_em: "2026-10-29T13:00:00Z", recebido_em: "2026-10-29T12:00:00Z" },
];

test("painel: recebidos da empresa, perdidos, cadastrados por origem e descartados por motivo", () => {
  const p = montarPainel(eventos, leads, perdidos, periodo("dia", ref));
  const c = p.get(CARLA)!;
  assert.deepEqual(c.recebidosEmpresa, ["emp1", "emp2"]);
  assert.deepEqual(c.perdidos, ["emp1"]);
  assert.deepEqual(c.cadastrados, ["pl1", "ind1", "ind2"]);
  assert.deepEqual(c.cadastradosPorOrigem, { plantao: ["pl1"], indicacao: ["ind1", "ind2"] });
  assert.deepEqual(c.descartados, ["ind1"]);
  assert.deepEqual(c.descartadosPorMotivo, { fora_do_perfil: ["ind1"] });
  assert.deepEqual(c.vendas, ["pl1"]);
  const d = p.get(DIEGO)!;
  assert.deepEqual(d.recebidosEmpresa, ["emp1"]);
  assert.deepEqual(d.perdidos, []);
  assert.deepEqual(d.cadastrados, []);
});

test("painel: funil dos leads que entraram no período, até onde chegaram com o corretor", () => {
  const c = montarPainel(eventos, leads, perdidos, periodo("dia", ref)).get(CARLA)!;
  assert.deepEqual(c.entraram, ["emp1", "emp2", "pl1", "ind1", "ind2"]);
  // emp1 saiu da Carla em "novo"; emp2 chegou a visita agendada no dia seguinte; pl1 pulou direto para proposta e venda.
  assert.deepEqual(c.funil.em_contato, ["emp2", "pl1", "ind1", "ind2"]);
  assert.deepEqual(c.funil.visita_agendada, ["emp2", "pl1"]);
  assert.deepEqual(c.funil.visita_realizada, ["pl1"]);
  assert.deepEqual(c.funil.proposta, ["pl1"]);
  assert.deepEqual(c.funil.venda, ["pl1"]);
});

test("painel: o corretor que perdeu o lead não vê mais o histórico, e ele conta como recebido", () => {
  const semEmp1 = eventos.filter((e) => e.lead_id !== "emp1");
  const c = montarPainel(semEmp1, leads, perdidos, periodo("dia", ref)).get(CARLA)!;
  assert.deepEqual(c.recebidosEmpresa, ["emp2", "emp1"]);
  assert.deepEqual(c.perdidos, ["emp1"]);
  assert.ok(c.entraram.includes("emp1"));
  assert.ok(!c.funil.em_contato.includes("emp1"));
  // Recebido antes do período: só conta como perdido.
  const antes = [{ ...perdidos[0], recebido_em: "2026-10-20T12:00:00Z" }];
  assert.deepEqual(montarPainel(semEmp1, leads, antes, periodo("dia", ref)).get(CARLA)!.recebidosEmpresa, ["emp2"]);
});

test("painel: lead da empresa nunca conta como cadastrado pelo corretor", () => {
  const ev2 = [ev("emp3", "29T09:00:00", "criado", { para: CARLA, autor_id: CARLA })];
  const l2 = new Map([["emp3", lead("emp3", CARLA, "empresa")]]);
  const c = montarPainel(ev2, l2, [], periodo("dia", ref)).get(CARLA)!;
  assert.deepEqual(c.cadastrados, []);
  assert.deepEqual(c.recebidosEmpresa, ["emp3"]);
});

test("painel: fora do período não conta, e a soma da equipe une os leads", () => {
  const ontem = montarPainel(eventos, leads, [], deslocar(periodo("dia", ref), -1));
  assert.equal(ontem.size, 0);
  const amanha = montarPainel(eventos, leads, [], deslocar(periodo("dia", ref), 1));
  assert.equal(amanha.get(CARLA), undefined); // a etapa de emp2 no dia 30 não é entrada
  const p = montarPainel(eventos, leads, perdidos, periodo("semana", ref));
  const t = somar([...p.values()]);
  assert.deepEqual(t.recebidosEmpresa, ["emp1", "emp2"]); // emp1 conta uma vez na equipe
  assert.deepEqual(t.perdidos, ["emp1"]);
  assert.equal(taxa(1, 4), "25%");
  assert.equal(taxa(0, 0), "–");
});
