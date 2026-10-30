// Testes do perfil ampliado do cliente (item 16): aniversário, resumo,
// renda × restrição e regras dos documentos. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aniversariantesDeHoje,
  caminhoDoDocumento,
  dadosPessoais,
  diaDoAniversario,
  diasParaAniversario,
  erroDoArquivo,
  fazAniversarioHoje,
  formatarTamanho,
  limiteDeRenda,
  LIMITE_DOCUMENTO,
  nomeDoArquivo,
  PERFIL_VAZIO,
  rendaNoLimite,
  resumoDoPerfil,
  textoAniversario,
  tipoDoArquivo,
} from "./perfil.ts";

const dia = (a: number, m: number, d: number, h = 10) => new Date(a, m - 1, d, h);

test("aniversário: hoje, amanhã e a contagem até o próximo", () => {
  assert.equal(fazAniversarioHoje("1990-10-29", dia(2026, 10, 29)), true);
  assert.equal(fazAniversarioHoje("1990-10-29", dia(2026, 10, 29, 23)), true);
  assert.equal(fazAniversarioHoje("1990-10-30", dia(2026, 10, 29)), false);
  assert.equal(diasParaAniversario("1990-10-30", dia(2026, 10, 29)), 1);
  assert.equal(diasParaAniversario("1990-10-28", dia(2026, 10, 29)), 364); // passou ontem: só no ano que vem
  assert.equal(diasParaAniversario(null, dia(2026, 10, 29)), null);
  assert.equal(diasParaAniversario("29/10/1990", dia(2026, 10, 29)), null);
});

test("aniversário: virada de ano", () => {
  assert.equal(diasParaAniversario("1980-01-01", dia(2026, 12, 31)), 1);
  assert.equal(diasParaAniversario("1980-12-31", dia(2027, 1, 1)), 364);
  assert.equal(fazAniversarioHoje("1980-01-01", dia(2027, 1, 1)), true);
  assert.equal(textoAniversario("1980-01-03", dia(2026, 12, 30)), "Faz aniversário em 4 dias (03/01)");
});

test("aniversário: quem nasceu em 29/02 comemora em 28/02 fora do ano bissexto", () => {
  assert.equal(fazAniversarioHoje("2000-02-29", dia(2027, 2, 28)), true);
  assert.equal(fazAniversarioHoje("2000-02-29", dia(2027, 3, 1)), false);
  assert.equal(fazAniversarioHoje("2000-02-29", dia(2028, 2, 29)), true);
  assert.equal(fazAniversarioHoje("2000-02-29", dia(2028, 2, 28)), false);
  assert.equal(diasParaAniversario("2000-02-29", dia(2027, 2, 27)), 1);
  assert.equal(diasParaAniversario("2000-02-29", dia(2027, 3, 1)), 365); // 29/02/2028
  assert.equal(diasParaAniversario("2000-02-29", dia(2100, 2, 27)), 1); // 2100 não é bissexto
  assert.equal(diaDoAniversario("2000-02-29"), "29/02");
});

test("aniversário: sem o ano, e o aviso da ficha só na semana", () => {
  assert.equal(diaDoAniversario("1990-03-05"), "05/03");
  assert.equal(textoAniversario("1990-10-29", dia(2026, 10, 29)), "Faz aniversário hoje");
  assert.equal(textoAniversario("1990-10-30", dia(2026, 10, 29)), "Faz aniversário amanhã");
  assert.equal(textoAniversario("1990-11-05", dia(2026, 10, 29)), "Faz aniversário em 7 dias (05/11)");
  assert.equal(textoAniversario("1990-11-06", dia(2026, 10, 29)), null);
  for (const t of [textoAniversario("1990-10-30", dia(2026, 10, 29)), textoAniversario("1990-11-05", dia(2026, 10, 29))])
    assert.doesNotMatch(t!, /1990/);
});

test("aniversariantes de hoje: só ativos, por nome", () => {
  const l = (nome: string, nascimento: string | null, status: "ativo" | "descartado" = "ativo") => ({ nome, nascimento, status });
  const hoje = aniversariantesDeHoje(
    [l("Bruno", "1985-10-29"), l("Ana", "1990-10-29"), l("Caio", "1990-10-29", "descartado"), l("Dora", null), l("Eva", "1990-10-30")],
    dia(2026, 10, 29),
  );
  assert.deepEqual(hoje.map((x) => x.nome), ["Ana", "Bruno"]);
});

test("resumo do topo da ficha: só o que está preenchido", () => {
  const base = { valor: null, dormitorios: null, regiao: null, finalidade: null };
  assert.deepEqual(resumoDoPerfil({ ...base, ...PERFIL_VAZIO }), []);
  assert.deepEqual(
    resumoDoPerfil({
      ...base,
      ...PERFIL_VAZIO,
      valor: 450000,
      dormitorios: 2,
      regiao: "Rudge Ramos",
      finalidade: "morar",
      forma_pagamento: "financiamento",
      usa_fgts: true,
      entrada: 80000,
      renda_faixa: "6_a_10",
      pronto_planta: "planta",
      prazo_compra: "6_meses",
    }),
    ["Até R$\u00a0450.000", "2 dorms", "Rudge Ramos", "Para morar", "Financiamento + FGTS", "Entrada R$\u00a080.000", "Renda 6 a 10 SM", "Na planta", "Compra em até 6 meses"],
  );
  assert.deepEqual(resumoDoPerfil({ ...base, usa_fgts: true, pronto_planta: "tanto_faz", prazo_compra: "imediato", renda_faixa: "ate_3" }), [
    "FGTS",
    "Renda até 3 SM",
    "Compra: imediato",
  ]);
});

test("dados pessoais para quem só lê: aniversário sem o ano, só o preenchido", () => {
  const d = dadosPessoais({ ...PERFIL_VAZIO, nascimento: "1990-03-05", bairro_mora: "Centro", cidade_mora: "Santo André", telefone2: "5511912345678" });
  assert.deepEqual(d, [
    { rotulo: "Aniversário", valor: "05/03" },
    { rotulo: "Mora em", valor: "Centro, Santo André" },
  ]);
});

test("restrição de renda do catálogo em salários mínimos", () => {
  assert.deepEqual(limiteDeRenda("Somente clientes com renda até 6 salários mínimos."), { limite: 6, parcial: false });
  assert.deepEqual(limiteDeRenda("Somente clientes com renda familiar até 10 salários mínimos."), { limite: 10, parcial: false });
  assert.deepEqual(limiteDeRenda("Do 1º ao 12º andar, somente clientes com renda até 10 salários mínimos."), { limite: 10, parcial: true });
  assert.equal(limiteDeRenda("Consulte as condições"), null);
  assert.equal(limiteDeRenda(null), null);
  assert.equal(rendaNoLimite("3_a_6", 6), "dentro");
  assert.equal(rendaNoLimite("6_a_10", 6), "acima");
  assert.equal(rendaNoLimite("acima_20", 10), "acima");
  assert.equal(rendaNoLimite("3_a_6", 5), "talvez");
});

test("documentos: tipo, tamanho e caminho sem o nome do cliente", () => {
  assert.equal(erroDoArquivo({ name: "rg.pdf", type: "application/pdf", size: 1000 }), null);
  assert.equal(erroDoArquivo({ name: "foto.heic", type: "", size: 1000 }), null); // Android sem o tipo
  assert.match(erroDoArquivo({ name: "planilha.xlsx", type: "application/vnd.ms-excel", size: 1000 })!, /PDF ou uma foto/);
  assert.match(erroDoArquivo({ name: "rg.pdf", type: "application/pdf", size: LIMITE_DOCUMENTO + 1 })!, /limite é 10 MB/);
  assert.equal(erroDoArquivo({ name: "rg.pdf", type: "application/pdf", size: LIMITE_DOCUMENTO }), null);
  assert.match(erroDoArquivo({ name: "rg.pdf", type: "application/pdf", size: 0 })!, /vazio/);
  assert.equal(tipoDoArquivo({ name: "IMG_1.JPEG", type: "" }), "image/jpeg");
  const lead = "3f2b8c1e-0000-4000-8000-000000000001";
  const c = caminhoDoDocumento(lead, "9a1b2c3d-0000-4000-8000-000000000002", "image/jpeg");
  assert.equal(c, `${lead}/9a1b2c3d-0000-4000-8000-000000000002.jpg`);
  assert.equal(nomeDoArquivo("C:\\fakepath\\RG Ana.pdf"), "RG Ana.pdf");
  assert.equal(formatarTamanho(850 * 1024), "850 KB");
  assert.equal(formatarTamanho(2.4 * 1024 * 1024), "2,4 MB");
});
