// Testes da regra pura do direcionador. Casos de horário da seção 5 do estudo
// (docs/direcionador/direcionador.md), divisão exata, limite do dia, falha
// indo para o Vendas e produto não reconhecido. Nomes de destino fictícios.
// Rode com: node --test marketing/src/lib/direcionador.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acharRegra,
  decidir,
  depoisDaEntrega,
  escolherNaRegra,
  escolherParte,
  horarioCasa,
  momentoSP,
  porQueNaoCasa,
  somar,
  TEXTO_PULO,
  type Config,
  type Destino,
  type Regra,
} from "./direcionador.ts";

const VENDAS: Destino = { id: "vendas", tipo: "vendas", modo: null, registrar_envios: false, limite_dia: null, ativo: true };
const EXT: Destino = { id: "ext", tipo: "externo", modo: "email", registrar_envios: false, limite_dia: null, ativo: true };
const PARC: Destino = { id: "parc", tipo: "externo", modo: "porta", registrar_envios: true, limite_dia: 2, ativo: true };

const regra = (r: Partial<Regra> & { id: string }): Regra => ({
  ativa: true,
  produtos: [],
  fontes: [],
  dias: [0, 1, 2, 3, 4, 5, 6],
  hora_inicio: "00:00",
  hora_fim: "00:00",
  partes: [{ destino_id: "vendas", porcentagem: 100 }],
  ...r,
});
const config = (regras: Regra[], ativo = true, destinos = [VENDAS, EXT, PARC]): Config => ({ ativo, vendas_id: "vendas", regras, destinos });
const SEG = 1, TER = 2, DOM = 0;
const as = (dia: number, hhmm: string) => ({ dia, minutos: Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) });

test("horário de São Paulo, seja qual for o fuso de quem roda", () => {
  // 06/11/2026 02h30 UTC = quinta 05/11 23h30 em São Paulo (UTC−3, sem horário de verão).
  assert.deepEqual(momentoSP("2026-11-06T02:30:00Z"), { dia: 4, minutos: 23 * 60 + 30, data: "2026-11-05" });
  assert.deepEqual(momentoSP("2026-11-06T03:00:00Z"), { dia: 5, minutos: 0, data: "2026-11-06" });
  assert.deepEqual(momentoSP(new Date("2026-11-09T12:15:00-03:00")), { dia: SEG, minutos: 12 * 60 + 15, data: "2026-11-09" });
  assert.throws(() => momentoSP("não é data"), /Data inválida/);
});

test("fim exclusivo: das 9h às 18h pega 17h59 e não pega 18h00", () => {
  const r = { dias: [SEG], hora_inicio: "09:00", hora_fim: "18:00" };
  assert.equal(horarioCasa(r, as(SEG, "09:00")), "ok");
  assert.equal(horarioCasa(r, as(SEG, "17:59")), "ok");
  assert.equal(horarioCasa(r, as(SEG, "18:00")), "hora");
  assert.equal(horarioCasa(r, as(SEG, "08:59")), "hora");
  assert.equal(horarioCasa(r, as(TER, "10:00")), "dia");
});

test("vira a meia-noite: segunda 19h–9h pega segunda 22h e terça 3h, não segunda 3h", () => {
  const r = { dias: [SEG], hora_inicio: "19:00", hora_fim: "09:00" };
  assert.equal(horarioCasa(r, as(SEG, "22:00")), "ok");
  assert.equal(horarioCasa(r, as(SEG, "19:00")), "ok");
  assert.equal(horarioCasa(r, as(TER, "03:00")), "ok");
  assert.equal(horarioCasa(r, as(TER, "08:59")), "ok");
  assert.equal(horarioCasa(r, as(TER, "09:00")), "hora");
  assert.equal(horarioCasa(r, as(SEG, "03:00")), "dia", "a madrugada de segunda é do domingo");
  assert.equal(horarioCasa(r, as(SEG, "12:00")), "hora");
  // Domingo para segunda: a regra de domingo pega a madrugada de segunda.
  assert.equal(horarioCasa({ dias: [DOM], hora_inicio: "19:00", hora_fim: "09:00" }, as(SEG, "03:00")), "ok");
  // Sábado 19h–9h pega a madrugada de domingo (a semana dá a volta).
  assert.equal(horarioCasa({ dias: [6], hora_inicio: "19:00", hora_fim: "09:00" }, as(DOM, "02:00")), "ok");
});

test("das 0h às 0h: o dia inteiro dos dias marcados", () => {
  const r = { dias: [0, 6], hora_inicio: "00:00", hora_fim: "00:00" };
  assert.equal(horarioCasa(r, as(6, "00:00")), "ok");
  assert.equal(horarioCasa(r, as(6, "23:59")), "ok");
  assert.equal(horarioCasa(r, as(DOM, "12:00")), "ok");
  assert.equal(horarioCasa(r, as(SEG, "12:00")), "dia");
});

test("9h–18h e 18h–9h não se sobrepõem", () => {
  const dia = { dias: [SEG], hora_inicio: "09:00", hora_fim: "18:00" };
  const noite = { dias: [SEG], hora_inicio: "18:00", hora_fim: "09:00" };
  for (const h of ["08:59", "09:00", "17:59", "18:00", "23:59"]) {
    const casam = [dia, noite].filter((r) => horarioCasa(r, as(SEG, h)) === "ok").length;
    assert.ok(casam <= 1, h);
  }
});

test("produto e fonte: não reconhecido só casa com 'qualquer'", () => {
  const especifica = regra({ id: "r", produtos: ["p1"], fontes: ["zap"] });
  const qualquer = regra({ id: "q" });
  const m = as(SEG, "10:00");
  assert.equal(porQueNaoCasa(especifica, { produto_id: "p1", fonte: "zap" }, m), null);
  assert.equal(porQueNaoCasa(especifica, { produto_id: "p2", fonte: "zap" }, m), "produto");
  assert.equal(porQueNaoCasa(especifica, { produto_id: null, fonte: "zap" }, m), "produto_nao_reconhecido");
  assert.equal(porQueNaoCasa(especifica, { produto_id: "p1", fonte: "olx" }, m), "fonte");
  assert.equal(porQueNaoCasa(especifica, { produto_id: "p1", fonte: null }, m), "fonte_desconhecida");
  assert.equal(porQueNaoCasa(qualquer, { produto_id: null, fonte: null }, m), null);
  assert.equal(TEXTO_PULO.produto_nao_reconhecido, "produto não reconhecido");
});

test("a primeira regra ligada que casa decide; as seguintes nem são lidas", () => {
  const c = config([
    regra({ id: "1", ativa: false }),
    regra({ id: "2", fontes: ["site"] }),
    regra({ id: "3", dias: [SEG], hora_inicio: "09:00", hora_fim: "18:00", partes: [{ destino_id: "ext", porcentagem: 100 }] }),
    regra({ id: "4" }),
  ]);
  const r = acharRegra(c, { produto_id: null, fonte: "zap" }, as(SEG, "10:00"));
  assert.equal(r.regra?.id, "3");
  assert.deepEqual(r.passos, [
    { regra_id: "1", resultado: "pulada", pulo: "desligada" },
    { regra_id: "2", resultado: "pulada", pulo: "fonte" },
    { regra_id: "3", resultado: "casou" },
    { regra_id: "4", resultado: "nao_lida" },
  ]);
  // Chave geral desligada: tudo vai para o Vendas, as regras nem são lidas.
  const off = decidir({ ...c, ativo: false }, { produto_id: null, fonte: "zap" }, as(SEG, "10:00"));
  assert.deepEqual([off.destino_id, off.motivo, off.passos.length], ["vendas", "desligado", 0]);
  // Nenhuma casou: Vendas.
  const nada = decidir(config([regra({ id: "x", fontes: ["site"] })]), { produto_id: null, fonte: "zap" }, as(SEG, "10:00"));
  assert.deepEqual([nada.destino_id, nada.motivo, nada.conta], ["vendas", "sem_regra", false]);
});

/** Manda n leads seguidos pela mesma regra, somando como o banco soma. */
function rodar(c: Config, r: Regra, n: number) {
  let contadores = {}, totais = {};
  const seq: string[] = [];
  for (let i = 0; i < n; i++) {
    const e = escolherNaRegra(c, r, contadores, totais);
    seq.push(e.destino_id);
    ({ contadores, totaisDoDia: totais } = somar(e, contadores, totais));
  }
  return { seq, contadores, totais };
}

test("divisão exata: 10 leads numa regra 70/30 dão 7 e 3; o empate vai à ordem da regra", () => {
  const r = regra({ id: "r", partes: [{ destino_id: "ext", porcentagem: 70 }, { destino_id: "vendas", porcentagem: 30 }] });
  const { seq, contadores } = rodar(config([r]), r, 10);
  assert.equal(seq[0], "ext");
  assert.deepEqual(contadores, { ext: 7, vendas: 3 });
  let ext = 0;
  seq.forEach((d, i) => {
    ext += d === "ext" ? 1 : 0;
    assert.ok(Math.abs(ext - 0.7 * (i + 1)) <= 1, `lead ${i + 1}`);
  });
  // Ordem invertida: o empate do primeiro lead vai ao Vendas.
  const inv = regra({ id: "i", partes: [{ destino_id: "vendas", porcentagem: 30 }, { destino_id: "ext", porcentagem: 70 }] });
  assert.equal(rodar(config([inv]), inv, 1).seq[0], "vendas");
  // Três partes, 50/25/25 em 8 leads: 4, 2 e 2.
  const tres = regra({ id: "t", partes: [{ destino_id: "ext", porcentagem: 50 }, { destino_id: "parc", porcentagem: 25 }, { destino_id: "vendas", porcentagem: 25 }] });
  const semLimite = config([tres], true, [VENDAS, EXT, { ...PARC, limite_dia: null }]);
  assert.deepEqual(rodar(semLimite, tres, 8).contadores, { ext: 4, parc: 2, vendas: 2 });
  // 33/67 em 100 leads: 33 e 67.
  const torta = regra({ id: "x", partes: [{ destino_id: "ext", porcentagem: 33 }, { destino_id: "vendas", porcentagem: 67 }] });
  assert.deepEqual(rodar(config([torta]), torta, 100).contadores, { ext: 33, vendas: 67 });
});

test("destino desligado é pulado; sem parte ligada, vai para o Vendas", () => {
  const r = regra({ id: "r", partes: [{ destino_id: "ext", porcentagem: 70 }, { destino_id: "vendas", porcentagem: 30 }] });
  const c = config([r], true, [VENDAS, { ...EXT, ativo: false }, PARC]);
  assert.equal(escolherParte(r, c.destinos, {})?.id, "vendas");
  const so = regra({ id: "s", partes: [{ destino_id: "ext", porcentagem: 100 }] });
  assert.equal(escolherNaRegra(c, so, {}, {}).motivo, "sem_destino");
  assert.equal(escolherNaRegra(c, { ...so, ativa: false }, {}, {}).motivo, "regra_inativa");
});

test("limite do dia: passou do teto, o resto do dia vai para o Vendas, sem contar", () => {
  const r = regra({ id: "r", partes: [{ destino_id: "parc", porcentagem: 100 }] });
  const { seq, contadores, totais } = rodar(config([r]), r, 4);
  assert.deepEqual(seq, ["parc", "parc", "vendas", "vendas"]);
  assert.deepEqual(contadores, { parc: 2 });
  assert.deepEqual(totais, { parc: 2 });
  assert.equal(escolherNaRegra(config([r]), r, { parc: 2 }, { parc: 2 }).motivo, "limite");
  // Dia novo (totais zerados): volta a receber.
  assert.equal(escolherNaRegra(config([r]), r, { parc: 2 }, {}).destino_id, "parc");
  // O Vendas não tem limite.
  assert.equal(escolherNaRegra(config([r], true, [VENDAS, EXT, PARC]), regra({ id: "v" }), {}, { vendas: 9999 }).destino_id, "vendas");
});

test("falha na entrega: vai na hora para o Vendas e desfaz o contador", () => {
  const r = regra({ id: "r", partes: [{ destino_id: "parc", porcentagem: 100 }] });
  const c = config([r]);
  const e = escolherNaRegra(c, r, {}, {});
  assert.deepEqual(depoisDaEntrega(c, e, false), { destino_id: "vendas", tipo: "vendas", motivo: "falha", desfazer: true, registrar: false });
  // Entregou: registra só se o destino tem a chave ligada.
  assert.deepEqual(depoisDaEntrega(c, e, true), { destino_id: "parc", tipo: "externo", motivo: "divisao", desfazer: false, registrar: true });
  const semRegistro = regra({ id: "s", partes: [{ destino_id: "ext", porcentagem: 100 }] });
  assert.equal(depoisDaEntrega(c, escolherNaRegra(c, semRegistro, {}, {}), true).registrar, false);
  // Vendas (pela divisão, pelo limite ou sem regra): nada a desfazer nem registrar.
  for (const v of [escolherNaRegra(c, regra({ id: "v" }), {}, {}), escolherNaRegra(c, r, { parc: 2 }, { parc: 2 }), escolherNaRegra(c, null, {}, {})])
    assert.deepEqual([depoisDaEntrega(c, v, false).desfazer, depoisDaEntrega(c, v, true).registrar], [false, false]);
});

test("simulador: a decisão completa com os contadores da tela", () => {
  const r = regra({ id: "fds", fontes: ["zap", "olx"], dias: [0, 6], partes: [{ destino_id: "ext", porcentagem: 70 }, { destino_id: "vendas", porcentagem: 30 }] });
  const c = config([r]);
  const sab = as(6, "10:30");
  assert.equal(decidir(c, { produto_id: null, fonte: "zap" }, sab).destino_id, "ext");
  assert.equal(decidir(c, { produto_id: null, fonte: "zap" }, sab, { fds: { ext: 7, vendas: 2 } }).destino_id, "vendas");
  assert.equal(decidir(c, { produto_id: null, fonte: "site" }, sab).motivo, "sem_regra");
});
