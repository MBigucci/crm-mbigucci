import { test } from "node:test";
import assert from "node:assert/strict";
import { precisaChecarDuplicado } from "./duplicado.ts";

const n = "5511999990010";
const base = { numero: n, jaTemId: false, assimMesmo: false, avisoAtual: null };

test("sem WhatsApp não há o que conferir", () => {
  assert.equal(precisaChecarDuplicado({ ...base, numero: null }), false);
});

test("primeiro Cadastrar confere o duplicado", () => {
  assert.equal(precisaChecarDuplicado(base), true);
});

test("com o aviso na tela, o Cadastrar principal confere de novo (não grava no segundo toque)", () => {
  assert.equal(precisaChecarDuplicado({ ...base, avisoAtual: { numero: n, forma: "visivel" } }), true);
  assert.equal(precisaChecarDuplicado({ ...base, avisoAtual: { numero: n, forma: "outra-carteira" } }), true);
});

test("Cadastrar assim mesmo segue só sobre o aviso visível do mesmo número", () => {
  assert.equal(precisaChecarDuplicado({ ...base, assimMesmo: true, avisoAtual: { numero: n, forma: "visivel" } }), false);
});

test("outra carteira nunca é liberada, nem com o assim mesmo", () => {
  assert.equal(precisaChecarDuplicado({ ...base, assimMesmo: true, avisoAtual: { numero: n, forma: "outra-carteira" } }), true);
});

test("assim mesmo sobre o aviso de outro número confere de novo", () => {
  assert.equal(precisaChecarDuplicado({ ...base, assimMesmo: true, avisoAtual: { numero: "5511988880000", forma: "visivel" } }), true);
});

test("com o id já gerado (reenvio) não confere: o duplicado pode ser o próprio lead", () => {
  assert.equal(precisaChecarDuplicado({ ...base, jaTemId: true }), false);
});
