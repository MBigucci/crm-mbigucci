// Testes do prazo de 15 min para o primeiro contato. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  duracao,
  estaAberto,
  fimDoPrazo,
  HORARIO_PADRAO,
  minutosUteis,
  prazoDoLead,
  quandoVence,
  seloPrazo,
  type HorarioAtendimento,
} from "./prazo.ts";
import { grupoDoLead, montarListaDoDia } from "./leads.ts";

process.env.TZ = "America/Sao_Paulo";

// 29/10/2026 é uma quinta. 31/10 é sábado e 02/11 é segunda.
const sp = (diaHora: string) => new Date(`2026-${diaHora}:00-03:00`);
const iso = (d: Date) => d.toISOString();
const DIAS_UTEIS: HorarioAtendimento = { dias: [1, 2, 3, 4, 5], inicio: "09:00", fim: "19:00" };

test("horário padrão: plantão das 9h às 19h, todos os dias", () => {
  assert.deepEqual(HORARIO_PADRAO, { dias: [0, 1, 2, 3, 4, 5, 6], inicio: "09:00", fim: "19:00" });
  assert.equal(estaAberto(sp("10-31T09:00")), true); // sábado
  assert.equal(estaAberto(sp("10-29T18:59")), true);
  assert.equal(estaAberto(sp("10-29T19:00")), false);
  assert.equal(estaAberto(sp("10-29T08:59")), false);
});

test("fim do prazo: dentro do horário são 15 min corridos", () => {
  assert.equal(iso(fimDoPrazo(sp("10-29T10:00"))), iso(sp("10-29T10:15")));
  assert.equal(iso(fimDoPrazo(sp("10-29T18:45"))), iso(sp("10-29T19:00")));
});

test("fim do prazo: perto do fechamento, o resto passa para a abertura do dia seguinte", () => {
  assert.equal(iso(fimDoPrazo(sp("10-29T18:50"))), iso(sp("10-30T09:05")));
});

test("fim do prazo: chegada fora do horário começa a contar na abertura", () => {
  assert.equal(iso(fimDoPrazo(sp("10-29T22:00"))), iso(sp("10-30T09:15")));
  assert.equal(iso(fimDoPrazo(sp("10-29T07:00"))), iso(sp("10-29T09:15")));
  assert.equal(iso(fimDoPrazo(sp("10-29T00:30"))), iso(sp("10-29T09:15")));
});

test("fim do prazo: fim de semana conta no plantão e pula fora dele", () => {
  assert.equal(iso(fimDoPrazo(sp("10-31T10:00"))), iso(sp("10-31T10:15")));
  assert.equal(iso(fimDoPrazo(sp("10-30T18:55"), DIAS_UTEIS)), iso(sp("11-02T09:10")));
  assert.equal(iso(fimDoPrazo(sp("10-31T11:00"), DIAS_UTEIS)), iso(sp("11-02T09:15")));
});

test("fim do prazo: horário inválido corre direto", () => {
  const vazio = { dias: [], inicio: "09:00", fim: "19:00" };
  assert.equal(iso(fimDoPrazo(sp("10-29T22:00"), vazio)), iso(sp("10-29T22:15")));
  assert.equal(iso(fimDoPrazo(sp("10-29T22:00"), { ...HORARIO_PADRAO, inicio: "19:00", fim: "09:00" })), iso(sp("10-29T22:15")));
});

test("o horário aceita o formato do Postgres (HH:MM:SS)", () => {
  assert.equal(iso(fimDoPrazo(sp("10-29T22:00"), { dias: HORARIO_PADRAO.dias, inicio: "09:00:00", fim: "19:00:00" })), iso(sp("10-30T09:15")));
});

test("minutos úteis: mesmo dia, virada de dia e fim de semana", () => {
  assert.equal(minutosUteis(sp("10-29T10:00"), sp("10-29T10:30")), 30);
  assert.equal(minutosUteis(sp("10-29T18:00"), sp("10-30T10:00")), 120);
  assert.equal(minutosUteis(sp("10-29T20:00"), sp("10-30T08:00")), 0);
  assert.equal(minutosUteis(sp("10-30T18:00"), sp("11-02T10:00"), DIAS_UTEIS), 120);
  assert.equal(minutosUteis(sp("10-30T18:00"), sp("11-02T10:00")), 120 + 600 + 600);
  assert.equal(minutosUteis(sp("10-29T10:30"), sp("10-29T10:00")), 0);
});

const lead = (created_at: string, extra: Partial<{ etapa: string; status: "ativo" | "descartado"; atribuido_em: string | null; origem: string }> = {}) => ({
  status: "ativo" as const,
  etapa: "novo",
  origem: "empresa",
  created_at,
  atribuido_em: null,
  ...extra,
});

test("prazo do lead: no prazo, correndo", () => {
  const p = prazoDoLead(lead(iso(sp("10-29T10:00"))), sp("10-29T10:03"))!;
  assert.equal(p.estado, "no_prazo");
  assert.equal(p.correndo, true);
  assert.equal(seloPrazo(p, sp("10-29T10:03")).texto, "Responder em 12 min");
  assert.equal(seloPrazo(p, sp("10-29T10:03")).nivel, "correndo");
});

test("prazo do lead: chegou à noite, responde até amanhã, 9h15", () => {
  const agora = sp("10-29T22:05");
  const p = prazoDoLead(lead(iso(sp("10-29T22:00"))), agora)!;
  assert.equal(p.correndo, false);
  assert.deepEqual(seloPrazo(p, agora), { sinal: "→", texto: "Responder até amanhã, 9h15", nivel: "aguardando" });
  // De madrugada, o prazo é no mesmo dia.
  const madrugada = sp("10-30T06:00");
  assert.equal(seloPrazo(prazoDoLead(lead(iso(sp("10-29T22:00"))), madrugada)!, madrugada).texto, "Responder até 9h15");
  // Às 9h05 já está correndo.
  const abertura = sp("10-30T09:05");
  assert.equal(seloPrazo(prazoDoLead(lead(iso(sp("10-29T22:00"))), abertura)!, abertura).texto, "Responder em 10 min");
});

test("prazo do lead: fora do plantão de dias úteis, responde até segunda", () => {
  const agora = sp("10-30T19:30");
  const p = prazoDoLead(lead(iso(sp("10-30T19:10"))), agora, DIAS_UTEIS)!;
  assert.equal(seloPrazo(p, agora).texto, "Responder até segunda, 9h15");
});

test("prazo do lead: estourado, com a duração", () => {
  const agora = sp("10-29T10:55");
  const p = prazoDoLead(lead(iso(sp("10-29T10:00"))), agora)!;
  assert.equal(p.estado, "estourado");
  assert.deepEqual(seloPrazo(p, agora), { sinal: "!", texto: "Prazo estourado há 40 min", nivel: "estourado" });
  assert.equal(seloPrazo(prazoDoLead(lead(iso(sp("10-29T10:00"))), sp("10-29T11:35"))!, agora).texto, "Prazo estourado há 1h20");
});

test("prazo do lead: nunca estoura logo depois do cadastro", () => {
  const agora = sp("10-29T10:00");
  const p = prazoDoLead(lead(iso(new Date(agora.getTime() - 5_000))), agora)!;
  assert.equal(p.estado, "no_prazo");
  assert.equal(seloPrazo(p, agora).texto, "Responder em 15 min");
});

test("prazo do lead: conta da atribuição quando o gerente reatribuiu depois", () => {
  const l = lead(iso(sp("10-28T10:00")), { atribuido_em: iso(sp("10-29T10:00")) });
  assert.equal(prazoDoLead(l, sp("10-29T10:05"))!.estado, "no_prazo");
});

test("prazo do lead: só vale para lead da empresa, ativo e em novo", () => {
  assert.equal(prazoDoLead(lead(iso(sp("10-29T10:00")), { origem: "plantao" }), sp("10-29T12:00")), null);
  assert.equal(prazoDoLead(lead(iso(sp("10-29T10:00")), { origem: "indicacao" }), sp("10-29T12:00")), null);
  assert.equal(prazoDoLead(lead(iso(sp("10-29T10:00")), { etapa: "em_contato" }), sp("10-29T12:00")), null);
  assert.equal(prazoDoLead(lead(iso(sp("10-29T10:00")), { status: "descartado" }), sp("10-29T12:00")), null);
});

test("duração: minutos, horas e dias", () => {
  assert.equal(duracao(0.2), "1 min");
  assert.equal(duracao(59), "59 min");
  assert.equal(duracao(60), "1h");
  assert.equal(duracao(125), "2h05");
  assert.equal(duracao(60 * 24), "1 dia");
  assert.equal(duracao(60 * 24 * 3 + 30), "3 dias");
});

test("quando vence: hoje, amanhã ou dia da semana", () => {
  const agora = sp("10-30T20:00");
  assert.equal(quandoVence(sp("10-30T21:00"), agora), "21h");
  assert.equal(quandoVence(sp("10-31T09:15"), agora), "amanhã, 9h15");
  assert.equal(quandoVence(sp("11-02T09:15"), agora), "segunda, 9h15");
});

test("lista do dia: os que aguardam o primeiro contato vêm no topo, pelo prazo", () => {
  const agora = sp("10-29T10:30");
  const l = (nome: string, created_at: string, extra: Record<string, unknown> = {}) => ({
    nome,
    status: "ativo" as const,
    etapa: "novo",
    origem: "empresa",
    temperatura: null,
    proximo_contato: null as string | null,
    created_at,
    atribuido_em: null,
    ...extra,
  });
  const leads = [
    l("atrasado", iso(sp("10-01T10:00")), { etapa: "em_contato", proximo_contato: iso(sp("10-28T09:00")), temperatura: "quente" }),
    l("no prazo", iso(sp("10-29T10:25"))),
    l("estourado ontem", iso(sp("10-28T15:00"))),
    l("estourado agora", iso(sp("10-29T10:00")), { temperatura: "quente" }),
    l("novo com dia marcado", iso(sp("10-29T10:20")), { proximo_contato: iso(sp("10-31T09:00")) }),
    l("sem data", iso(sp("10-01T10:00")), { etapa: "em_contato" }),
    // O corretor organiza o prazo dos leads que ele mesmo cadastra.
    l("próprio sem dia", iso(sp("10-29T09:00")), { origem: "plantao" }),
    l("próprio hoje", iso(sp("10-29T09:00")), { origem: "indicacao", proximo_contato: iso(sp("10-29T15:00")) }),
    l("próprio amanhã", iso(sp("10-29T09:00")), { origem: "carteira", proximo_contato: iso(sp("10-30T09:00")) }),
  ];
  const g = montarListaDoDia(leads, agora);
  assert.deepEqual(
    g.map((x) => [x.grupo, x.leads.map((y) => y.nome)]),
    [
      ["primeiro_contato", ["estourado ontem", "estourado agora", "novo com dia marcado", "no prazo"]],
      ["atrasados", ["atrasado"]],
      ["hoje", ["próprio hoje"]],
      ["sem_data", ["próprio sem dia", "sem data"]],
    ],
  );
  assert.equal(grupoDoLead(leads[1], agora), "primeiro_contato");
  assert.equal(grupoDoLead(leads[6], agora), "sem_data");
});
