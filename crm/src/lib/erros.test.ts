import { test } from "node:test";
import assert from "node:assert/strict";
import { jaEstavaSalvo, mensagemErro } from "./erros.ts";

test("reenvio: só a chave primária repetida conta como já salvo", () => {
  assert.equal(jaEstavaSalvo({ code: "23505", message: 'duplicate key value violates unique constraint "leads_pkey"' }), true);
  assert.equal(jaEstavaSalvo({ code: "23505", message: 'duplicate key value violates unique constraint "lead_interacoes_pkey"' }), true);
  // Outra unicidade (período já marcado, meta repetida) é erro de verdade.
  assert.equal(jaEstavaSalvo({ code: "23505", message: 'duplicate key value violates unique constraint "lancamentos_periodo_unico"' }), false);
  assert.equal(jaEstavaSalvo({ code: "42501", message: "leads_pkey" }), false);
  assert.equal(jaEstavaSalvo(null), false);
});

test("sessão expirada e sem conexão viram frases para a tela", () => {
  assert.match(mensagemErro({ message: "JWT expired" }), /sessão expirou/);
  assert.match(mensagemErro({ message: "TypeError: Failed to fetch" }), /Sem conexão/);
});
