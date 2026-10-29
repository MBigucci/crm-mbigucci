// Testes do follow-up e do histórico. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diasCorridos,
  seloSemContato,
  sugereDescarte,
  sugerirProximaTentativa,
} from "./followup.ts";
import { descreverEvento, montarHistorico } from "./historico.ts";
import type { Evento, Interacao } from "./leads.ts";

process.env.TZ = "America/Sao_Paulo";
const agora = new Date("2026-10-29T10:00:00-03:00");

const lead = (ultima: string | null, extra: Partial<{ status: "ativo" | "descartado"; tentativas: number }> = {}) => ({
  status: "ativo" as const,
  ultima_interacao_em: ultima,
  created_at: "2026-10-20T12:00:00-03:00",
  tentativas: 0,
  ...extra,
});

test("dias corridos contam o calendário, não as 24 horas", () => {
  assert.equal(diasCorridos("2026-10-28T23:00:00-03:00", agora), 1);
  assert.equal(diasCorridos("2026-10-29T08:00:00-03:00", agora), 0);
  assert.equal(diasCorridos("2026-10-26T10:00:00-03:00", agora), 3);
});

test("Sem contato há N dias: nada até 1 dia, âmbar com 2, vermelho com 3 ou mais", () => {
  assert.equal(seloSemContato(lead("2026-10-28T09:00:00-03:00"), agora), null);
  assert.deepEqual(seloSemContato(lead("2026-10-27T09:00:00-03:00"), agora), {
    texto: "Sem contato há 2 dias",
    nivel: "atencao",
  });
  assert.deepEqual(seloSemContato(lead("2026-10-24T09:00:00-03:00", { tentativas: 2 }), agora), {
    texto: "Sem contato há 5 dias · 2 tentativas",
    nivel: "alerta",
  });
  // Sem nenhuma interação, conta desde o cadastro.
  assert.equal(seloSemContato(lead(null, { tentativas: 1 }), agora)?.texto, "Sem contato há 9 dias · 1 tentativa");
  assert.equal(seloSemContato(lead(null, { status: "descartado" }), agora), null);
});

test("Sem resposta sugere daqui a 2 dias, na hora cheia", () => {
  const d = sugerirProximaTentativa(new Date("2026-10-29T14:37:00-03:00"));
  assert.equal(d.toISOString(), new Date("2026-10-31T14:00:00-03:00").toISOString());
});

test("descarte sugerido na 3ª tentativa, só para lead ativo", () => {
  assert.equal(sugereDescarte({ status: "ativo", tentativas: 2 }), false);
  assert.equal(sugereDescarte({ status: "ativo", tentativas: 3 }), true);
  assert.equal(sugereDescarte({ status: "descartado", tentativas: 4 }), false);
});

const ev = (tipo: Evento["tipo"], de: string | null, para: string | null, quando: string, extra: Partial<Evento> = {}) =>
  ({ id: quando, lead_id: "L", tipo, de, para, detalhe: null, automatico: false, autor_id: "u1", criado_em: quando, ...extra }) as Evento;
const int = (quando: string): Interacao => ({
  id: quando,
  lead_id: "L",
  autor_id: "u1",
  criado_em: quando,
  tipo: "whatsapp",
  texto: "Conversou",
  proximo_contato: null,
});

test("histórico junta interações e eventos, do mais novo ao mais antigo", () => {
  const h = montarHistorico(
    [int("2026-10-29T10:00:00Z"), int("2026-10-27T10:00:00Z")],
    [ev("criado", null, "u1", "2026-10-26T10:00:00Z"), ev("etapa", "novo", "em_contato", "2026-10-29T10:00:01Z")],
  );
  assert.deepEqual(
    h.map((x) => x.tipo + " " + x.quando.slice(8, 10)),
    ["evento 29", "interacao 29", "interacao 27", "evento 26"],
  );
});

test("texto dos eventos", () => {
  const etapa = (s: string) => ({ novo: "Novo", em_contato: "Em contato" })[s] ?? s;
  const pessoa = (id: string) => ({ u1: "Ana", u2: "Carla" })[id];
  const t = (e: Evento) => descreverEvento(e, etapa, pessoa);
  assert.equal(t(ev("criado", null, "u1", "x")), "Lead cadastrado");
  assert.equal(t(ev("criado", null, "u2", "x")), "Lead cadastrado para Carla");
  assert.equal(t(ev("etapa", "novo", "em_contato", "x")), "Etapa: Novo → Em contato");
  assert.equal(t(ev("temperatura", null, "quente", "x")), "Temperatura: sem temperatura → ! Quente");
  assert.equal(t(ev("status", "ativo", "descartado", "x", { detalhe: "sem_retorno" })), "Descartado: Sem retorno");
  assert.equal(t(ev("status", "descartado", "ativo", "x")), "Reativado");
  assert.equal(t(ev("dono", "u1", "u2", "x")), "Atribuído a Carla");
  assert.equal(t(ev("dono", "u1", "u9", "x")), "Atribuído a outro corretor");
  assert.equal(t(ev("dono", "u2", "u1", "x", { detalhe: "perdido" })), "! Lead perdido por Carla. Passado para Ana");
});
