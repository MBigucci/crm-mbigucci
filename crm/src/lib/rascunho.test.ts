import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chaveRascunhoInteracao,
  chaveRascunhoNovaVenda,
  chaveRascunhoNovoLead,
  chaveRascunhoPerfil,
  chaveRascunhoVenda,
  lerRascunho,
  limparRascunho,
  limparTodosRascunhos,
  salvarRascunho,
  type StorageSimples,
} from "./rascunho.ts";

function criarStorageMock(inicial: Record<string, string> = {}): StorageSimples & { dados: Record<string, string> } {
  const dados = { ...inicial };
  return {
    dados,
    getItem(k: string) {
      return Object.prototype.hasOwnProperty.call(dados, k) ? dados[k] : null;
    },
    setItem(k: string, v: string) {
      dados[k] = v;
    },
    removeItem(k: string) {
      delete dados[k];
    },
  };
}

test("chaves de rascunho seguem padrão isolado por usuário ou lead", () => {
  assert.equal(chaveRascunhoNovoLead("usr-123"), "mbigucci-crm:rascunho:novo-lead:usr-123");
  assert.equal(chaveRascunhoInteracao("lead-456"), "mbigucci-crm:rascunho:interacao:lead-456");
  assert.equal(chaveRascunhoPerfil("lead-789"), "mbigucci-crm:rascunho:perfil:lead-789");
  assert.equal(chaveRascunhoVenda("lead-abc"), "mbigucci-crm:rascunho:venda:lead-abc");
  assert.equal(chaveRascunhoNovaVenda("corretor-xyz"), "mbigucci-crm:rascunho:nova-venda:corretor-xyz");
});

test("salvar e ler rascunho de objeto estruturado", () => {
  const mock = criarStorageMock();
  const chave = chaveRascunhoNovoLead("usr-1");
  const dados = {
    nome: "Cliente Silva",
    whatsapp: "(11) 98765-4321",
    contato: { data: "2026-11-04", hora: "14:00" },
  };

  const ok = salvarRascunho(chave, dados, mock);
  assert.equal(ok, true);

  const lido = lerRascunho<typeof dados>(chave, mock);
  assert.deepEqual(lido, dados);
});

test("limparTodosRascunhos apaga só as chaves de rascunho e conta quantas", () => {
  const base = criarStorageMock({
    [chaveRascunhoNovoLead("u1")]: "{}",
    [chaveRascunhoInteracao("l1")]: "{}",
    [chaveRascunhoVenda("l2")]: "{}",
    "mbigucci-crm:tema": "escuro",
    "sb-token": "x",
  });
  const storage = {
    ...base,
    get length() {
      return Object.keys(base.dados).length;
    },
    key: (i: number) => Object.keys(base.dados)[i] ?? null,
  };
  assert.equal(limparTodosRascunhos(storage), 3);
  assert.deepEqual(Object.keys(base.dados).sort(), ["mbigucci-crm:tema", "sb-token"]);
  assert.equal(limparTodosRascunhos(storage), 0);
});

test("limparTodosRascunhos não quebra sem storage nem com storage que lança", () => {
  assert.equal(limparTodosRascunhos(null), 0);
  const quebrado = {
    length: 1,
    key: () => {
      throw new Error("SecurityError");
    },
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  assert.equal(limparTodosRascunhos(quebrado), 0);
});

test("ler rascunho inexistente retorna null", () => {
  const mock = criarStorageMock();
  const lido = lerRascunho("chave-inexistente", mock);
  assert.equal(lido, null);
});

test("JSON corrompido no storage retorna null sem lançar exceção", () => {
  const chave = "corrompida";
  const mock = criarStorageMock({ [chave]: "{ json invalido sem fechar" });

  const lido = lerRascunho(chave, mock);
  assert.equal(lido, null);
});

test("limpar rascunho remove a chave", () => {
  const chave = chaveRascunhoInteracao("lead-1");
  const mock = criarStorageMock();
  salvarRascunho(chave, { texto: "Conversa no WhatsApp" }, mock);
  assert.notEqual(mock.getItem(chave), null);

  const limpo = limparRascunho(chave, mock);
  assert.equal(limpo, true);
  assert.equal(mock.getItem(chave), null);
  assert.equal(lerRascunho(chave, mock), null);
});

test("storage lançando exceção (QuotaExceededError / SecurityError) não quebra o app", () => {
  const storageQueLanca: StorageSimples = {
    getItem() {
      throw new Error("SecurityError: The operation is insecure.");
    },
    setItem() {
      throw new Error("QuotaExceededError: Storage quota exceeded.");
    },
    removeItem() {
      throw new Error("Error: Operation not permitted");
    },
  };

  assert.doesNotThrow(() => {
    const lido = lerRascunho("qualquer", storageQueLanca);
    assert.equal(lido, null);
  });

  assert.doesNotThrow(() => {
    const ok = salvarRascunho("qualquer", { valor: 123 }, storageQueLanca);
    assert.equal(ok, false);
  });

  assert.doesNotThrow(() => {
    const ok = limparRascunho("qualquer", storageQueLanca);
    assert.equal(ok, false);
  });
});

test("quando o storage for nulo ou indefinido (ex: SSR), não quebra e retorna seguro", () => {
  assert.equal(lerRascunho("chave", null), null);
  assert.equal(lerRascunho("chave", undefined), null);
  assert.equal(salvarRascunho("chave", { a: 1 }, null), false);
  assert.equal(salvarRascunho("chave", { a: 1 }, undefined), false);
  assert.equal(limparRascunho("chave", null), false);
  assert.equal(limparRascunho("chave", undefined), false);
});
