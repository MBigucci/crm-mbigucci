// Testes das visitas: estados, regras de baixa, ordem da lista do dia, semana,
// textos e números do painel. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agendaDaSemana,
  comprovanteValido,
  contarVisitas,
  dataHoraVisita,
  descreverEventoVisita,
  erroAgendamento,
  estadoDaVisita,
  inicioDaSemana,
  podeDarBaixa,
  podeRemarcar,
  quandoVisita,
  somarVisitas,
  sugerirHorarioVisita,
  textoDaVisita,
  visitasDoDia,
  type StatusVisita,
} from "./visitas.ts";
import { preencherModelo, VARIAVEIS, variaveisDesconhecidas } from "./mensagens.ts";
import { descreverEvento } from "./historico.ts";
import type { Evento } from "./leads.ts";

process.env.TZ = "America/Sao_Paulo";

const agora = new Date("2026-10-29T15:00:00-03:00"); // quinta, 15h
const v = (id: string, inicio: string, status: StatusVisita = "agendada", corretor_id = "c1") => ({
  id,
  inicio: new Date(inicio).toISOString(),
  status,
  corretor_id,
});

test("estados: a visita aberta que passou do horário aguarda baixa", () => {
  assert.equal(estadoDaVisita(v("a", "2026-10-29T16:00:00-03:00"), agora), "agendada");
  assert.equal(estadoDaVisita(v("a", "2026-10-29T16:00:00-03:00", "confirmada"), agora), "confirmada");
  assert.equal(estadoDaVisita(v("a", "2026-10-29T15:00:00-03:00"), agora), "aguardando_baixa");
  assert.equal(estadoDaVisita(v("a", "2026-10-28T10:00:00-03:00", "confirmada"), agora), "aguardando_baixa");
  assert.equal(estadoDaVisita(v("a", "2026-10-28T10:00:00-03:00", "realizada"), agora), "realizada");
  assert.equal(estadoDaVisita(v("a", "2026-10-28T10:00:00-03:00", "cancelada"), agora), "cancelada");
  assert.equal(estadoDaVisita(v("a", "2026-10-30T10:00:00-03:00", "nao_compareceu"), agora), "nao_compareceu");
});

test("regras de baixa: só depois do horário e só na visita aberta; remarcar só a aberta", () => {
  assert.equal(podeDarBaixa(v("a", "2026-10-29T15:01:00-03:00"), agora), false);
  assert.equal(podeDarBaixa(v("a", "2026-10-29T14:59:00-03:00"), agora), true);
  assert.equal(podeDarBaixa(v("a", "2026-10-29T14:59:00-03:00", "confirmada"), agora), true);
  for (const s of ["realizada", "nao_compareceu", "cancelada"] as const) {
    assert.equal(podeDarBaixa(v("a", "2026-10-28T10:00:00-03:00", s), agora), false);
    assert.equal(podeRemarcar({ status: s }), false);
  }
  assert.equal(podeRemarcar({ status: "agendada" }), true);
  assert.equal(podeRemarcar({ status: "confirmada" }), true);
});

test("lista do dia: as de hoje pelo horário, e as sem baixa da mais antiga para a mais nova", () => {
  const visitas = [
    v("amanha", "2026-10-30T09:00:00-03:00"),
    v("hoje18", "2026-10-29T18:00:00-03:00"),
    v("hoje16", "2026-10-29T16:00:00-03:00", "confirmada"),
    v("hoje10", "2026-10-29T10:00:00-03:00"),
    v("ontem", "2026-10-28T11:00:00-03:00", "confirmada"),
    v("feita", "2026-10-29T09:00:00-03:00", "realizada"),
    v("cancelada", "2026-10-29T17:00:00-03:00", "cancelada"),
    v("faltou", "2026-10-27T17:00:00-03:00", "nao_compareceu"),
  ];
  const { hoje, aguardandoBaixa } = visitasDoDia(visitas, agora);
  assert.deepEqual(hoje.map((x) => x.id), ["hoje16", "hoje18"]);
  assert.deepEqual(aguardandoBaixa.map((x) => x.id), ["ontem", "hoje10"]);
  // Vira o dia: a de amanhã entra em hoje, e as de ontem continuam esperando baixa.
  const r = visitasDoDia(visitas, new Date("2026-10-30T08:00:00-03:00"));
  assert.deepEqual(r.hoje.map((x) => x.id), ["amanha"]);
  assert.deepEqual(r.aguardandoBaixa.map((x) => x.id), ["ontem", "hoje10", "hoje16", "hoje18"]);
});

test("semana: de segunda a domingo, pelo horário, canceladas no fim e fora do total", () => {
  const seg = inicioDaSemana(agora);
  assert.equal(seg.toISOString(), "2026-10-26T03:00:00.000Z");
  assert.equal(inicioDaSemana(new Date("2026-11-01T20:00:00-03:00")).toISOString(), seg.toISOString());
  const dias = agendaDaSemana(
    [
      v("q2", "2026-10-29T16:00:00-03:00"),
      v("q1", "2026-10-29T09:00:00-03:00", "cancelada"),
      v("q3", "2026-10-29T10:00:00-03:00", "realizada"),
      v("dom", "2026-11-01T11:00:00-03:00"),
      v("fora", "2026-11-02T09:00:00-03:00"),
    ],
    seg,
  );
  assert.equal(dias.length, 7);
  assert.deepEqual(dias.map((d) => d.total), [0, 0, 0, 2, 0, 0, 1]);
  assert.deepEqual(dias[3].visitas.map((x) => x.id), ["q3", "q2", "q1"]);
});

test("textos: quando é a visita, o {visita} da mensagem e a data curta", () => {
  assert.equal(quandoVisita("2026-10-29T18:00:00-03:00", agora), "hoje, às 18h");
  assert.equal(quandoVisita("2026-10-30T15:30:00-03:00", agora), "amanhã, às 15h30");
  assert.equal(quandoVisita("2026-11-05T10:00:00-03:00", agora), "na quinta-feira, 05/11, às 10h");
  assert.equal(quandoVisita("2026-11-07T09:00:00-03:00", agora), "no sábado, 07/11, às 9h");
  assert.equal(
    textoDaVisita({ inicio: "2026-10-30T10:00:00-03:00", local: " Stand de vendas " }, agora),
    "amanhã, às 10h, em Stand de vendas",
  );
  assert.equal(textoDaVisita({ inicio: "2026-10-30T10:00:00-03:00", local: null }, agora), "amanhã, às 10h");
  assert.equal(dataHoraVisita("2026-11-05T10:00:00-03:00"), "Qui, 05/11, 10:00");
  assert.equal(sugerirHorarioVisita(agora).toISOString(), "2026-10-30T13:00:00.000Z");
});

test("mensagem Confirmar visita: {visita} com a data, e um texto que serve sem visita", () => {
  const modelo = "Oi, {primeiro_nome}. Confirmando a visita a {empreendimento}, {visita}. {corretor}";
  const lead = { nome: "ana souza", empreendimento: "Marco Zero One" };
  assert.equal(
    preencherModelo(modelo, lead, "Carla", "amanhã, às 10h, em Stand de vendas"),
    "Oi, Ana. Confirmando a visita a Marco Zero One, amanhã, às 10h, em Stand de vendas. Carla",
  );
  assert.equal(preencherModelo(modelo, lead, "Carla"), "Oi, Ana. Confirmando a visita a Marco Zero One, no dia combinado. Carla");
  assert.ok(VARIAVEIS.some((x) => x.chave === "visita"));
  assert.deepEqual(variaveisDesconhecidas(modelo), []);
});

test("agendar: empreendimento, dia e hora a partir de agora (com 10 min de folga)", () => {
  const iso = (s: string) => new Date(s).toISOString();
  assert.equal(erroAgendamento({ inicio: iso("2026-10-30T10:00:00-03:00"), empreendimento: " " }, agora), "Escolha o empreendimento.");
  assert.equal(erroAgendamento({ inicio: null, empreendimento: "Life" }, agora), "Marque o dia e a hora da visita.");
  assert.equal(
    erroAgendamento({ inicio: iso("2026-10-29T14:00:00-03:00"), empreendimento: "Life" }, agora),
    "Escolha um dia e hora a partir de agora.",
  );
  assert.equal(erroAgendamento({ inicio: iso("2026-10-29T14:55:00-03:00"), empreendimento: "Life" }, agora), null);
  assert.equal(erroAgendamento({ inicio: iso("2026-10-30T10:00:00-03:00"), empreendimento: "Life" }, agora), null);
  assert.equal(comprovanteValido(""), true);
  assert.equal(comprovanteValido(" https://drive.google.com/x "), true);
  assert.equal(comprovanteValido("foto.jpg"), false);
});

test("painel: agendadas, realizadas, não compareceu e sem baixa, pela data da visita no período", () => {
  const p = { ini: new Date("2026-10-26T00:00:00-03:00"), fim: new Date("2026-11-02T00:00:00-03:00") };
  const n = contarVisitas(
    [
      v("1", "2026-10-27T10:00:00-03:00", "realizada"),
      v("2", "2026-10-28T10:00:00-03:00", "nao_compareceu"),
      v("3", "2026-10-28T11:00:00-03:00", "agendada"), // passou sem baixa
      v("4", "2026-10-30T11:00:00-03:00", "confirmada"),
      v("5", "2026-10-30T12:00:00-03:00", "cancelada"),
      v("6", "2026-10-25T12:00:00-03:00", "realizada"), // fora do período
      v("7", "2026-10-29T10:00:00-03:00", "realizada", "c2"),
    ],
    p,
    agora,
  );
  assert.deepEqual(n.get("c1"), { agendadas: 4, realizadas: 1, naoCompareceu: 1, aguardandoBaixa: 1 });
  assert.deepEqual(n.get("c2"), { agendadas: 1, realizadas: 1, naoCompareceu: 0, aguardandoBaixa: 0 });
  assert.deepEqual(somarVisitas([...n.values()]), { agendadas: 5, realizadas: 2, naoCompareceu: 1, aguardandoBaixa: 1 });
});

test("histórico: agendada, confirmada, baixa, correção com motivo, remarcação e comprovante", () => {
  const visita = { empreendimento: "Marco Zero One", inicio: "2026-11-05T10:00:00-03:00" };
  const ev = (tipo: Evento["tipo"], de: string | null, para: string | null, detalhe: string | null = null) =>
    ({ id: "e", lead_id: "L", visita_id: "V", tipo, de, para, detalhe, automatico: false, autor_id: "u", criado_em: "" }) as Evento;
  const d = (e: Evento) => descreverEvento(e, (s) => s, () => undefined, (id) => (id === "V" ? visita : undefined));
  assert.equal(d(ev("visita", null, "agendada")), "Visita agendada: Marco Zero One · Qui, 05/11, 10:00");
  assert.equal(d(ev("visita", "agendada", "confirmada")), "Visita confirmada: Marco Zero One · Qui, 05/11, 10:00");
  assert.equal(d(ev("visita", "confirmada", "agendada")), "Visita aguardando nova confirmação: Marco Zero One · Qui, 05/11, 10:00");
  assert.equal(d(ev("visita", "agendada", "realizada")), "✓ Visita realizada: Marco Zero One · Qui, 05/11, 10:00");
  assert.equal(d(ev("visita", "agendada", "nao_compareceu")), "✕ Não compareceu à visita: Marco Zero One · Qui, 05/11, 10:00");
  assert.equal(d(ev("visita", "agendada", "cancelada")), "Visita cancelada: Marco Zero One · Qui, 05/11, 10:00");
  assert.equal(
    d(ev("visita", "realizada", "nao_compareceu", "Toquei errado")),
    "Visita corrigida: Realizada → Não compareceu. Motivo: Toquei errado",
  );
  assert.equal(
    d(ev("visita_horario", "2026-11-05T13:00:00.000Z", "2026-11-06T18:00:00.000Z")),
    "Visita remarcada: Qui, 05/11, 10:00 → Sex, 06/11, 15:00",
  );
  assert.equal(d(ev("visita_comprovante", null, "https://x")), "Comprovante da visita anexado");
  assert.equal(d(ev("visita_comprovante", "https://x", null)), "Comprovante da visita removido");
  // Sem a visita carregada (outro corretor, por exemplo), o texto continua legível.
  assert.equal(descreverEvento(ev("visita", null, "agendada"), (s) => s, () => undefined), "Visita agendada");
});
