import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularVerba,
  CRITERIOS_PADRAO,
  filtrarLancamentos,
  mesDeLiberacao,
  periodoDoDia,
  pontosDoMes,
  posicoes,
  resumoDoMes,
  roletaDaSemana,
  segundaDaSemana,
  type Criterio,
  type Lancamento,
} from "./programa.ts";

/** Os 7 exemplos do documento original (docs/pontuacao-verba.md). */
const EXEMPLOS: { perfil: string; periodo: number; video: number; visita: number; vendas: number; pontos: number; verba: number }[] = [
  { perfil: "Só frequência completa", periodo: 24, video: 0, visita: 0, vendas: 0, pontos: 120, verba: 0 },
  { perfil: "Frequência completa + 2 vídeos", periodo: 24, video: 2, visita: 0, vendas: 0, pontos: 130, verba: 1300 },
  { perfil: "Frequência completa + 8 vídeos + 4 visitas", periodo: 24, video: 8, visita: 4, vendas: 0, pontos: 200, verba: 2000 },
  { perfil: "Sem frequência: 8 vídeos + 9 visitas", periodo: 0, video: 8, visita: 9, vendas: 0, pontos: 130, verba: 1300 },
  { perfil: "Sem frequência: 8 vídeos + 12 visitas", periodo: 0, video: 8, visita: 12, vendas: 0, pontos: 160, verba: 1600 },
  { perfil: "Tudo completo, sem venda", periodo: 24, video: 8, visita: 12, vendas: 0, pontos: 280, verba: 2000 },
  { perfil: "Tudo completo + 1 venda", periodo: 24, video: 8, visita: 12, vendas: 1, pontos: 280, verba: 3800 },
];

for (const e of EXEMPLOS) {
  test(`exemplo do documento: ${e.perfil}`, () => {
    const { total } = pontosDoMes({ periodo: e.periodo, video: e.video, visita: e.visita });
    assert.equal(total, e.pontos);
    assert.equal(calcularVerba(total, e.vendas).verba, e.verba);
  });
}

test("limites: o que passa do limite do mês não conta", () => {
  const { total, linhas } = pontosDoMes({ periodo: 30, video: 10, visita: 20 });
  assert.equal(total, 280);
  assert.deepEqual(linhas.map((l) => [l.criterio.slug, l.considerada, l.acimaDoLimite]), [["periodo", 24, 6], ["video", 8, 2], ["visita", 12, 8]]);
  assert.equal(pontosDoMes({}).total, 0);
});

test("limites e pontos editados pelo gerente geral entram na conta", () => {
  const criterios: Criterio[] = CRITERIOS_PADRAO.map((c) => (c.slug === "video" ? { ...c, pontos: 10, limite_mes: 4 } : c));
  assert.equal(pontosDoMes({ video: 6 }, criterios).total, 40);
});

test("teto, mínimo e vendas", () => {
  assert.deepEqual(calcularVerba(129, 3), { situacao: "abaixo_do_minimo", pontosValidos: 0, daPontuacao: 0, dasVendas: 0, verba: 0, faltamParaMinimo: 1 });
  assert.equal(calcularVerba(250, 0).verba, 2000); // teto sem venda
  assert.equal(calcularVerba(250, 1).verba, 3500); // a venda destrava até 280 e soma R$ 1.000
  assert.equal(calcularVerba(280, 2).verba, 4800); // cada venda soma R$ 1.000
  assert.equal(calcularVerba(150, 1).verba, 2500);
  assert.equal(calcularVerba(0, 0).faltamParaMinimo, 130);
});

test("liberação no mês seguinte, com a virada do ano", () => {
  assert.deepEqual(mesDeLiberacao(2026, 10), { ano: 2026, mes: 11 });
  assert.deepEqual(mesDeLiberacao(2026, 11), { ano: 2027, mes: 0 });
});

const l = (x: Partial<Lancamento>): Lancamento => ({
  id: Math.random().toString(36),
  corretor_id: "a",
  criterio: "periodo",
  data: "2026-11-02",
  periodo: "manha",
  quantidade: 1,
  comprovante: null,
  saida_visita: false,
  observacao: null,
  visita_id: null,
  status: "aprovado",
  motivo_recusa: null,
  lancado_por: "r",
  lancado_em: "2026-11-02T12:00:00Z",
  decidido_por: null,
  decidido_em: null,
  ...x,
});

test("resumo do mês: só aprovados do mês, vendas assinadas e pagas pelo mês da assinatura", () => {
  const lancs = [
    ...Array.from({ length: 24 }, (_, i) => l({ data: `2026-11-${String((i % 28) + 1).padStart(2, "0")}`, periodo: i % 2 ? "tarde" : "manha" })),
    l({ criterio: "video", periodo: null, quantidade: 2 }),
    l({ criterio: "video", periodo: null, quantidade: 5, status: "pendente" }),
    l({ criterio: "video", periodo: null, quantidade: 5, status: "recusado" }),
    l({ criterio: "video", periodo: null, quantidade: 5, data: "2026-10-31" }), // outro mês
    l({ corretor_id: "b", criterio: "visita", periodo: null }),
  ];
  const vendas = [
    { corretor_id: "a", assinada_em: "2026-11-10", status: "ativa" as const, pagamento: "pago" as const, vgv: 500000 },
    { corretor_id: "a", assinada_em: "2026-11-11", status: "ativa" as const, pagamento: "pendente" as const, vgv: 500000 },
    { corretor_id: "a", assinada_em: "2026-11-12", status: "cancelada" as const, pagamento: "pago" as const, vgv: 500000 },
    { corretor_id: "a", assinada_em: "2026-12-01", status: "ativa" as const, pagamento: "pago" as const, vgv: 500000 },
  ];
  const [a, b, c] = resumoDoMes(["a", "b", "c"], lancs, vendas, CRITERIOS_PADRAO, 2026, 10);
  assert.deepEqual([a.pontos, a.pendentes, a.vendas, a.vgv, a.verba.verba], [130, 1, 1, 500000, 2300]);
  assert.deepEqual([b.pontos, b.verba.verba, b.verba.faltamParaMinimo], [10, 0, 120]);
  assert.deepEqual([c.pontos, c.verba.verba], [0, 0]);
});

test("roleta: 6 períodos aprovados de segunda a sexta deixam apto", () => {
  assert.equal(segundaDaSemana("2026-10-29"), "2026-10-26"); // quinta
  assert.equal(segundaDaSemana("2026-11-01"), "2026-10-26"); // domingo
  assert.equal(segundaDaSemana("2026-10-26"), "2026-10-26");
  const dias = ["2026-10-26", "2026-10-27", "2026-10-28"];
  const lancs = [
    ...dias.flatMap((d) => [l({ data: d, periodo: "manha" }), l({ data: d, periodo: "tarde" })]),
    ...dias.flatMap((d) => [l({ corretor_id: "b", data: d, periodo: "manha" }), l({ corretor_id: "b", data: d, periodo: "tarde", status: d === dias[2] ? "pendente" : "aprovado" })]),
    l({ corretor_id: "c", data: "2026-10-31" }), // sábado não conta
    l({ corretor_id: "c", data: "2026-10-25" }), // semana anterior
    l({ corretor_id: "c", criterio: "video", periodo: null, data: "2026-10-27", quantidade: 6 }),
  ];
  const [a, b, c] = roletaDaSemana(["a", "b", "c"], lancs, "2026-10-26");
  assert.deepEqual([a.aprovados, a.apto], [6, true]);
  assert.deepEqual([b.aprovados, b.pendentes, b.apto, b.faltam], [5, 1, false, 1]);
  assert.deepEqual([c.aprovados, c.apto, c.faltam], [0, false, 6]);
});

test("período do dia: o que vale é o pendente ou aprovado; senão o último", () => {
  const xs = [
    l({ status: "cancelado", lancado_em: "2026-11-02T10:00:00Z" }),
    l({ status: "pendente", lancado_em: "2026-11-02T11:00:00Z" }),
    l({ status: "recusado", lancado_em: "2026-11-02T13:00:00Z", periodo: "tarde" }),
  ];
  assert.equal(periodoDoDia(xs, "a", "2026-11-02", "manha")?.status, "pendente");
  assert.equal(periodoDoDia(xs, "a", "2026-11-02", "tarde")?.status, "recusado");
  assert.equal(periodoDoDia(xs, "b", "2026-11-02", "manha"), null);
});

test("filtros da fila: corretor, critério, semana e status", () => {
  const xs = [l({ status: "pendente" }), l({ corretor_id: "b", status: "pendente" }), l({ criterio: "video", periodo: null, status: "pendente" }), l({ data: "2026-11-09", status: "pendente" }), l({})];
  assert.equal(filtrarLancamentos(xs, { status: "pendente" }).length, 4);
  assert.equal(filtrarLancamentos(xs, { status: "pendente", corretor: "a", criterio: "periodo" }).length, 2);
  assert.equal(filtrarLancamentos(xs, { status: "pendente", semana: "2026-11-02" }).length, 3);
});

test("ranking: empate fica na mesma posição", () => {
  assert.deepEqual(posicoes([200, 150, 150, 90, 0, 0]), [1, 2, 2, 4, 5, 5]);
  assert.deepEqual(posicoes([]), []);
});
