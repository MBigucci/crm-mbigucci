// O .htaccess do pacote aponta a página não encontrada para a pasta do módulo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { htaccess } from "./htaccess.mjs";

test("htaccess: 404 do Vendas na pasta do BASE_PATH", () => {
  assert.match(htaccess("/vendas"), /^ErrorDocument 404 \/vendas\/404\.html$/m);
  assert.match(htaccess("/vendas/"), /^ErrorDocument 404 \/vendas\/404\.html$/m);
});

test("htaccess: sem BASE_PATH, a raiz do site", () => {
  assert.match(htaccess(""), /^ErrorDocument 404 \/404\.html$/m);
});

test("htaccess: recusa caminho estranho", () => {
  assert.throws(() => htaccess("/vendas x"));
  assert.throws(() => htaccess("vendas"));
});
