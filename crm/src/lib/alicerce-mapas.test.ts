// Testes do mapa do dado para o tom das peças do Alicerce (item 48, passo c). Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { chipDaTemperatura, nivelDoPrazo, nivelDoSemContato, tomDaEtapa, tomDaVisita } from "../components/alicerce/mapas.ts";

test("temperatura: Quente laranja, Morno, Frio e Sem temperatura", () => {
  assert.deepEqual(chipDaTemperatura("quente"), { nivel: "alto", sinal: "!", texto: "Quente" });
  assert.deepEqual(chipDaTemperatura("morno"), { nivel: "medio", sinal: "○", texto: "Morno" });
  assert.deepEqual(chipDaTemperatura("frio"), { nivel: "baixo", sinal: "–", texto: "Frio" });
  assert.deepEqual(chipDaTemperatura(null), { nivel: "sem", sinal: "–", texto: "Sem temperatura" });
});

test("etapa: família do funil, Venda em verde e etapa desconhecida sem tom", () => {
  assert.equal(tomDaEtapa("novo"), "etapa-vendas-novo");
  assert.equal(tomDaEtapa("proposta"), "etapa-vendas-proposta");
  assert.equal(tomDaEtapa("venda"), "etapa-concluida");
  assert.equal(tomDaEtapa("outra"), null);
});

test("visita: agendada e confirmada na mesma cor; aguardando baixa em alerta", () => {
  assert.equal(tomDaVisita("agendada"), tomDaVisita("confirmada"));
  assert.equal(tomDaVisita("aguardando_baixa"), "alerta");
  assert.equal(tomDaVisita("nao_compareceu"), "etapa-perdido");
  assert.equal(tomDaVisita("cancelada"), "etapa-descartado");
});

test("prazo: estourado vermelho, correndo e sem contato de 2 dias em âmbar", () => {
  assert.equal(nivelDoPrazo("estourado"), "estourado");
  assert.equal(nivelDoPrazo("correndo"), "atencao");
  assert.equal(nivelDoPrazo("aguardando"), "normal");
  assert.equal(nivelDoSemContato("atencao"), "atencao");
  assert.equal(nivelDoSemContato("alerta"), "estourado");
});
