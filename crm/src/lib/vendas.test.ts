// Testes das vendas, da meta anual, das metas próprias e das faixas de VGV. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assinadasEntre,
  descreverEventoVenda,
  formatarDia,
  formatarReais,
  lerReais,
  mesDaVenda,
  seloVenda,
  somarVendas,
  ticketECiclo,
  totaisPorCorretor,
  type Venda,
} from "./vendas.ts";
import {
  formatarPct,
  intervaloDaMeta,
  META_VGV_PADRAO,
  metaAnualDe,
  metaRepetida,
  nomeDaMeta,
  progressoAnual,
  progressoMeta,
  textoMetaRepetida,
  textoRitmo,
  valorDaMetrica,
  type DadosMetas,
  type Meta,
  type MetaVgv,
} from "./metas.ts";
import { faixaAtingida, faixasDoMes, mesSeguinte } from "./faixas.ts";

process.env.TZ = "America/Sao_Paulo";

const agora = new Date("2026-10-29T15:00:00-03:00");
const CARLA = "carla", DIEGO = "diego";
let n = 0;
const venda = (assinada_em: string, vgv: number, x: Partial<Venda> = {}): Venda => ({
  id: `v${++n}`,
  lead_id: `l${n}`,
  corretor_id: CARLA,
  empreendimento: "Marco Zero One",
  unidade: null,
  vgv,
  assinada_em,
  pagamento: "pendente",
  pago_em: null,
  observacao: null,
  status: "ativa",
  motivo_cancelamento: null,
  cancelada_por: null,
  cancelada_em: null,
  registrada_por: CARLA,
  created_at: "2026-10-29T12:00:00Z",
  ...x,
});
const paga = (assinada_em: string, vgv: number, x: Partial<Venda> = {}) =>
  venda(assinada_em, vgv, { pagamento: "pago", pago_em: assinada_em, ...x });

// ---------- Vendas ----------

test("vendas: o VGV assinado e o assinado e pago; cancelada fica fora", () => {
  const xs = [
    paga("2026-10-02", 480000),
    venda("2026-10-10", 300000),
    paga("2026-10-12", 900000, { status: "cancelada", motivo_cancelamento: "Desistiu" }),
    paga("2026-10-20", 250000.5, { corretor_id: DIEGO }),
  ];
  assert.deepEqual(somarVendas(xs), { assinadas: 3, vgvAssinado: 1030000.5, pagas: 2, vgvValido: 730000.5 });
  const pc = totaisPorCorretor(xs);
  assert.deepEqual(pc.get(CARLA), { assinadas: 2, vgvAssinado: 780000, pagas: 1, vgvValido: 480000 });
  assert.deepEqual(pc.get(DIEGO), { assinadas: 1, vgvAssinado: 250000.5, pagas: 1, vgvValido: 250000.5 });
});

test("vendas: conta no mês da assinatura, mesmo paga no mês seguinte", () => {
  const v = venda("2026-10-31", 600000, { pagamento: "pago", pago_em: "2026-11-05" });
  assert.equal(mesDaVenda(v), "2026-10");
  assert.deepEqual(assinadasEntre([v], "2026-10-01", "2026-11-01"), [v]);
  assert.deepEqual(assinadasEntre([v], "2026-11-01", "2026-12-01"), []);
  const out = valorDaMetrica("vgv", CARLA, intervaloDaMeta({ periodo: "mes", inicio: null, meses: null }, agora), { eventos: [], visitas: [], vendas: [v] });
  assert.deepEqual(out, { valor: 600000, assinado: 600000 });
  const nov = intervaloDaMeta({ periodo: "mes", inicio: null, meses: null }, new Date("2026-11-10T12:00:00-03:00"));
  assert.deepEqual(valorDaMetrica("vgv", CARLA, nov, { eventos: [], visitas: [], vendas: [v] }), { valor: 0, assinado: 0 });
});

test("vendas: formatos de dinheiro, data e selo", () => {
  assert.equal(formatarReais(3398300), "R$\u00a03.398.300");
  assert.equal(formatarReais(480000.5), "R$\u00a0480.000,50");
  assert.equal(lerReais("480.000"), 480000);
  assert.equal(lerReais("R$\u00a0480.000,50"), 480000.5);
  assert.equal(lerReais("480000"), 480000);
  assert.equal(lerReais("48.00"), null);
  assert.equal(lerReais("0"), null);
  assert.equal(lerReais("abc"), null);
  assert.equal(formatarDia("2026-10-29"), "29/10/2026");
  assert.equal(formatarDia(null), "–");
  assert.deepEqual(seloVenda(venda("2026-10-01", 1)), { sinal: "!", texto: "Pagamento pendente", cor: "text-wa" });
  assert.equal(seloVenda(paga("2026-10-01", 1)).texto, "Paga em 01/10/2026");
  assert.equal(seloVenda(paga("2026-10-01", 1, { status: "cancelada" })).texto, "Cancelada");
});

test("vendas: o histórico descreve registro, pagamento, correção e cancelamento", () => {
  const v = { empreendimento: "Marco Zero One", unidade: "Apto 52", vgv: 480000 };
  const e = (tipo: "venda" | "venda_pagamento" | "venda_correcao", de: string | null, para: string | null, detalhe: string | null = null) => ({ tipo, de, para, detalhe });
  assert.equal(descreverEventoVenda(e("venda", null, "ativa"), v), "✓ Venda registrada: Marco Zero One, Apto 52 · R$\u00a0480.000");
  assert.equal(descreverEventoVenda(e("venda", null, "ativa"), undefined), "✓ Venda registrada");
  assert.equal(descreverEventoVenda(e("venda_pagamento", "pendente", "pago"), v), "✓ Venda paga");
  assert.equal(
    descreverEventoVenda(e("venda_pagamento", "pago", "pendente", "Boleto devolvido"), v),
    "! Pagamento da venda voltou para pendente. Motivo: Boleto devolvido",
  );
  assert.equal(
    descreverEventoVenda(e("venda_correcao", '{"vgv": 480000, "unidade": "Apto 52"}', '{"vgv": 500000, "unidade": "Apto 53"}', "Valor do contrato"), v),
    "Venda corrigida: VGV R$\u00a0480.000 → R$\u00a0500.000; Unidade Apto 52 → Apto 53. Motivo: Valor do contrato",
  );
  assert.equal(
    descreverEventoVenda(e("venda_correcao", '{"assinada_em": "2026-10-02"}', '{"assinada_em": "2026-10-01"}', "Data"), v),
    "Venda corrigida: Assinatura 02/10/2026 → 01/10/2026. Motivo: Data",
  );
  assert.equal(descreverEventoVenda(e("venda", "ativa", "cancelada", "Desistiu"), v), "✕ Venda cancelada. Motivo: Desistiu");
  assert.equal(descreverEventoVenda(e("venda", "cancelada", "ativa", "Voltou"), v), "Venda reativada. Motivo: Voltou");
});

// ---------- Meta anual de VGV ----------

test("meta anual: a do corretor, senão a geral do ano, senão R$ 10.000.000", () => {
  const linhas: MetaVgv[] = [
    { id: "1", ano: 2026, corretor_id: null, valor: 12000000, updated_at: "" },
    { id: "2", ano: 2026, corretor_id: CARLA, valor: 8000000, updated_at: "" },
    { id: "3", ano: 2027, corretor_id: DIEGO, valor: 1, updated_at: "" },
  ];
  assert.equal(META_VGV_PADRAO, 10000000);
  assert.deepEqual(metaAnualDe(CARLA, 2026, linhas), { valor: 8000000, origem: "corretor" });
  assert.deepEqual(metaAnualDe(DIEGO, 2026, linhas), { valor: 12000000, origem: "geral" });
  assert.deepEqual(metaAnualDe(DIEGO, 2025, linhas), { valor: 10000000, origem: "padrao" });
  assert.deepEqual(metaAnualDe(CARLA, 2027, []), { valor: 10000000, origem: "padrao" });
});

const doAno = [
  paga("2026-03-10", 2000000),
  paga("2026-09-30", 1500000, { pago_em: "2026-10-05" }),
  venda("2026-10-20", 1000000),
  paga("2026-05-02", 500000, { status: "cancelada" }),
  paga("2025-12-31", 3000000),
];

test("meta anual: acumulado pago, assinado, falta, % e ritmo por mês até dezembro", () => {
  const p = progressoAnual(10000000, doAno, 2026, agora);
  assert.equal(p.acumulado, 3500000);
  assert.equal(p.assinado, 4500000);
  assert.equal(p.falta, 6500000);
  assert.equal(formatarPct(p.razao), "35,00%");
  assert.equal(p.mesesRestantes, 3); // outubro ainda conta: a venda conta no mês da assinatura
  assert.equal(Math.round(p.ritmoMensal!), 2166667);
  assert.equal(p.batida, false);
  assert.equal(p.encerrado, false);
});

test("meta anual: projeção no ritmo atual, só depois de 1/4 do ano", () => {
  const p = progressoAnual(10000000, doAno, 2026, agora);
  const ini = new Date(2026, 0, 1).getTime();
  const decorrido = (agora.getTime() - ini) / (new Date(2027, 0, 1).getTime() - ini);
  assert.equal(p.projecao, 3500000 / decorrido);
  assert.ok(p.projecao! > 4200000 && p.projecao! < 4300000);
  const fev = progressoAnual(10000000, [paga("2026-01-15", 1000000)], 2026, new Date("2026-02-01T12:00:00-03:00"));
  assert.equal(fev.projecao, null);
  assert.equal(fev.mesesRestantes, 11);
  assert.equal(fev.ritmoMensal, 9000000 / 11);
  assert.equal(progressoAnual(10000000, [venda("2026-01-15", 1000000)], 2026, agora).projecao, null); // nada pago ainda
});

test("meta anual: batida, ano encerrado e ano que não começou", () => {
  const b = progressoAnual(3000000, doAno, 2026, agora);
  assert.equal(b.batida, true);
  assert.equal(b.falta, 0);
  assert.equal(b.ritmoMensal, null);
  assert.equal(formatarPct(b.razao), "116,66%");
  const passado = progressoAnual(10000000, doAno, 2025, agora);
  assert.deepEqual([passado.acumulado, passado.encerrado, passado.mesesRestantes, passado.ritmoMensal, passado.projecao], [3000000, true, 0, null, 3000000]);
  const futuro = progressoAnual(10000000, [], 2027, agora);
  assert.deepEqual([futuro.mesesRestantes, futuro.ritmoMensal, futuro.projecao], [12, 10000000 / 12, null]);
  assert.equal(formatarPct(0.606), "60,60%");
  assert.equal(formatarPct(0.99999), "99,99%");
  assert.equal(formatarPct(1 / 3), "33,33%");
});

// ---------- Metas próprias ----------

test("metas: mês, trimestre, ano e personalizado", () => {
  const mes = intervaloDaMeta({ periodo: "mes", inicio: null, meses: null }, agora);
  assert.equal(mes.rotulo, "Outubro de 2026");
  assert.equal(mes.ini.toISOString(), "2026-10-01T03:00:00.000Z");
  assert.equal(mes.fim.toISOString(), "2026-11-01T03:00:00.000Z");
  const tri = intervaloDaMeta({ periodo: "trimestre", inicio: null, meses: null }, agora);
  assert.equal(tri.rotulo, "4º trimestre de 2026");
  assert.equal(tri.ini.getMonth(), 9);
  assert.equal(tri.fim.getFullYear(), 2027);
  assert.equal(intervaloDaMeta({ periodo: "ano", inicio: null, meses: null }, agora).rotulo, "2026");
  const p = intervaloDaMeta({ periodo: "personalizado", inicio: "2026-11-01", meses: 3 }, agora);
  assert.equal(p.rotulo, "Novembro de 2026 a janeiro de 2027");
  assert.equal(p.futuro, true);
  assert.equal(p.decorrido, 0);
  assert.equal(intervaloDaMeta({ periodo: "personalizado", inicio: "2026-11-01", meses: 1 }, agora).rotulo, "Novembro de 2026");
  assert.equal(intervaloDaMeta({ periodo: "personalizado", inicio: "2026-01-01", meses: 3 }, agora).encerrado, true);
});

const ev = (lead_id: string, quando: string, tipo: "criado" | "etapa", x: { de?: string; para?: string; autor_id?: string }) => ({
  lead_id,
  tipo,
  de: x.de ?? null,
  para: x.para ?? null,
  autor_id: x.autor_id ?? null,
  criado_em: new Date(quando).toISOString(),
});
const dados: DadosMetas = {
  eventos: [
    ev("a", "2026-10-02T10:00:00-03:00", "criado", { para: CARLA, autor_id: CARLA }),
    ev("a", "2026-10-02T11:00:00-03:00", "etapa", { de: "novo", para: "em_contato", autor_id: CARLA }),
    ev("b", "2026-10-03T10:00:00-03:00", "criado", { para: CARLA, autor_id: "gerente" }), // da empresa: não conta como cadastrado
    ev("b", "2026-10-03T10:05:00-03:00", "etapa", { de: "novo", para: "visita_agendada", autor_id: CARLA }),
    ev("c", "2026-09-30T10:00:00-03:00", "criado", { para: CARLA, autor_id: CARLA }), // fora do mês
    ev("a", "2026-10-05T10:00:00-03:00", "etapa", { de: "em_contato", para: "proposta", autor_id: CARLA }),
  ],
  visitas: [
    { corretor_id: CARLA, status: "realizada", inicio: "2026-10-10T13:00:00Z" },
    { corretor_id: CARLA, status: "nao_compareceu", inicio: "2026-10-11T13:00:00Z" },
    { corretor_id: DIEGO, status: "realizada", inicio: "2026-10-11T13:00:00Z" },
  ],
  vendas: [paga("2026-10-02", 480000), venda("2026-10-20", 300000), paga("2026-10-21", 900000, { corretor_id: DIEGO })],
};
const meta = (x: Partial<Meta>): Meta => ({
  id: "m",
  dono_id: CARLA,
  metrica: "vendas",
  periodo: "mes",
  inicio: null,
  meses: null,
  valor: 2,
  no_painel: true,
  created_at: "",
  ...x,
});

test("metas: o progresso sai dos dados (leads, primeiros contatos, visitas, vendas e VGV)", () => {
  const mes = intervaloDaMeta({ periodo: "mes", inicio: null, meses: null }, agora);
  assert.deepEqual(valorDaMetrica("leads", CARLA, mes, dados), { valor: 1 });
  assert.deepEqual(valorDaMetrica("contatos", CARLA, mes, dados), { valor: 2 });
  assert.deepEqual(valorDaMetrica("visitas", CARLA, mes, dados), { valor: 1 });
  assert.deepEqual(valorDaMetrica("vendas", CARLA, mes, dados), { valor: 1, assinado: 2 });
  assert.deepEqual(valorDaMetrica("vgv", CARLA, mes, dados), { valor: 480000, assinado: 780000 });
  assert.deepEqual(valorDaMetrica("vgv", DIEGO, mes, dados), { valor: 900000, assinado: 900000 });
});

test("metas: frases de ritmo, como as da Bruna", () => {
  const t = (m: Partial<Meta>, d = dados, quando = agora) => textoRitmo(progressoMeta(meta(m), CARLA, d, quando));
  // A projeção (1) não diz nada novo depois de 1 venda: fica de fora.
  assert.deepEqual(t({}), { principal: "Falta 1 venda.", detalhe: undefined });
  assert.deepEqual(t({ valor: 1 }), { principal: "Meta batida.", detalhe: undefined });
  assert.deepEqual(t({ metrica: "visitas", valor: 1 }), { principal: "Meta batida.", detalhe: undefined });
  assert.equal(t({ metrica: "contatos", valor: 1 }).principal, "Meta batida, com 1 primeiro contato a mais.");
  const vgv = t({ metrica: "vgv", periodo: "ano", valor: 1500000 });
  assert.equal(vgv.principal, "Faltam R$\u00a01.020.000.");
  assert.match(vgv.detalhe!, /^No ritmo atual você fecha o ano com R\$\s[\d.]+\. Cerca de R\$\s[\d.]+ por semana até o fim\.$/);
  assert.deepEqual(t({ periodo: "personalizado", inicio: "2026-11-01", meses: 3 }), {
    principal: "Começa em novembro de 2026.",
    detalhe: "Alvo: 2 vendas.",
  });
  assert.deepEqual(t({ periodo: "personalizado", inicio: "2026-01-01", meses: 3 }), { principal: "Período encerrado: ficou em 0 vendas." });
  // Sem projeção no começo do período: uma venda no dia 2 não vira "fecha o mês com 15".
  const cedo = progressoMeta(meta({}), CARLA, dados, new Date("2026-10-03T12:00:00-03:00"));
  assert.equal(cedo.projecao, null);
  assert.equal(textoRitmo(cedo).principal, "Falta 1 venda.");
});

test("metas: não repete métrica e período", () => {
  const lista = [meta({ id: "1" }), meta({ id: "2", metrica: "visitas", periodo: "personalizado", inicio: "2026-11-01", meses: 3 })];
  assert.equal(metaRepetida(lista, { metrica: "vendas", periodo: "mes", inicio: null, meses: null }), true);
  assert.equal(metaRepetida(lista, { id: "1", metrica: "vendas", periodo: "mes", inicio: null, meses: null }), false);
  assert.equal(metaRepetida(lista, { metrica: "vendas", periodo: "ano", inicio: null, meses: null }), false);
  assert.equal(metaRepetida(lista, { metrica: "visitas", periodo: "personalizado", inicio: "2026-11-01", meses: 3 }), true);
  assert.equal(metaRepetida(lista, { metrica: "visitas", periodo: "personalizado", inicio: "2026-11-01", meses: 6 }), false);
});

// ---------- Faixas de VGV do mês ----------

const faixas = [
  { vgv_minimo: 1000000, valor: 2000 },
  { vgv_minimo: 1500000, valor: 3000 },
  { vgv_minimo: 2000000, valor: 5000 },
  { vgv_minimo: 3000000, valor: 10000 },
];

test("faixas: vale só a mais alta atingida, sem acumular", () => {
  assert.equal(faixaAtingida(999999, faixas), null);
  assert.equal(faixaAtingida(1000000, faixas)?.valor, 2000);
  assert.equal(faixaAtingida(1700000, faixas)?.valor, 3000);
  assert.equal(faixaAtingida(2999999.99, faixas)?.valor, 5000);
  assert.equal(faixaAtingida(8000000, faixas)?.valor, 10000);
  assert.equal(faixaAtingida(8000000, [...faixas].reverse())?.valor, 10000);
  assert.equal(faixaAtingida(8000000, []), null);
});

test("faixas: no mês da assinatura, só com as vendas assinadas e pagas, liberado no mês seguinte", () => {
  const vs = [
    paga("2026-10-02", 900000),
    venda("2026-10-20", 700000), // pendente: não conta
    paga("2026-10-31", 200000, { pago_em: "2026-11-03" }), // assinada em outubro, paga em novembro: conta em outubro
    paga("2026-10-15", 5000000, { status: "cancelada" }),
    paga("2026-11-01", 3000000),
    paga("2026-10-05", 1600000, { corretor_id: DIEGO }),
  ];
  const out = faixasDoMes(vs, faixas, 2026, 9);
  assert.deepEqual(out.get(CARLA), { corretor: CARLA, vgvValido: 1100000, vgvAssinado: 1800000, faixa: { vgv_minimo: 1000000, valor: 2000 } });
  assert.equal(out.get(DIEGO)!.faixa!.valor, 3000);
  assert.equal(faixasDoMes(vs, faixas, 2026, 10).get(CARLA)!.faixa!.valor, 10000);
  assert.equal(faixasDoMes(vs, faixas, 2026, 8).size, 0);
  assert.deepEqual(mesSeguinte(2026, 9), { ano: 2026, mes: 10 });
  assert.deepEqual(mesSeguinte(2026, 11), { ano: 2027, mes: 0 });
});

// ---------- Como na Bruna ----------

test("vendas: ticket e ciclo médio do período, como no conversionReport da Bruna", () => {
  const lead = (d: string) => ({ created_at: new Date(d).toISOString() });
  const out = ticketECiclo([
    { ...venda("2026-10-20", 600000), lead: lead("2026-10-10T15:00:00-03:00") },
    { ...venda("2026-10-25", 400000), lead: lead("2026-09-25T09:00:00-03:00") },
    { ...venda("2026-10-26", 999000, { status: "cancelada" }), lead: lead("2026-10-01T09:00:00-03:00") },
    { ...venda("2026-10-27", 500000), lead: null },
  ]);
  assert.deepEqual(out, { vendas: 3, vgv: 1500000, ticket: 500000, cicloDias: 20 });
  assert.deepEqual(ticketECiclo([]), { vendas: 0, vgv: 0, ticket: null, cicloDias: null });
});

test("metas: semestre, nome da meta e o texto da meta repetida da Bruna", () => {
  const s1 = intervaloDaMeta({ periodo: "semestre", inicio: null, meses: null }, agora);
  assert.equal(s1.rotulo, "2º semestre de 2026");
  assert.equal(s1.ini.getMonth(), 6);
  assert.equal(s1.fim.getFullYear(), 2027);
  assert.equal(intervaloDaMeta({ periodo: "semestre", inicio: null, meses: null }, new Date(2026, 2, 1)).rotulo, "1º semestre de 2026");
  assert.equal(textoMetaRepetida("vendas", "mes"), "Já existe uma meta mensal de Vendas. Edite a que está na lista.");
  assert.equal(textoMetaRepetida("vgv", "personalizado"), "Já existe uma meta de VGV para esse período. Edite a que está na lista.");
  assert.equal(nomeDaMeta({ metrica: "vendas", periodo: "semestre", inicio: null, meses: null }, agora), "Vendas (semestral)");
  assert.equal(nomeDaMeta({ metrica: "vgv", periodo: "personalizado", inicio: "2026-11-01", meses: 3 }, agora), "VGV (Novembro de 2026 a janeiro de 2027)");
  const p = progressoMeta(meta({ periodo: "semestre", valor: 3 }), CARLA, dados, agora);
  assert.equal(textoRitmo(p).principal, "Faltam 2 vendas.");
  assert.match(textoRitmo(p).detalhe ?? "", /fecha o semestre com/);
});
