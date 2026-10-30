// Testes da importação da tabela de preços por IA externa (item 16), com o
// catálogo real (docs/empreendimentos-dados.json). Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CATALOGO, doSlug } from "./catalogo-teste.ts";
import {
  contarPlano,
  FORMATO,
  instrucoesImportacao,
  lerImportacao,
  lerMes,
  lerNumero,
  planejarImportacao,
  resumoDoItem,
  type Importacao,
} from "./importar-tabela.ts";

const JSON_REAL = readFileSync(new URL("../../../docs/empreendimentos-dados.json", import.meta.url), "utf8");
const ler = (texto: string): Importacao => {
  const r = lerImportacao(texto);
  if (!r.ok) throw new Error(r.erros.join("; "));
  return r.dados;
};
const resposta = (empreendimentos: unknown[], extra: object = {}) =>
  "Aqui está o JSON:\n```json\n" + JSON.stringify({ formato: FORMATO, tabela_mes: "2026-12", empreendimentos, ...extra }) + "\n```\nQualquer dúvida, me avise.";

test("números e meses como as IAs escrevem", () => {
  assert.equal(lerNumero("R$ 520.000,00"), 520000);
  assert.equal(lerNumero("520 mil"), 520000);
  assert.equal(lerNumero("1,2 milhão"), 1200000);
  assert.equal(lerNumero("68,5 m²"), 68.5);
  assert.equal(lerNumero("450.000"), 450000);
  assert.equal(lerNumero(344800), 344800);
  assert.equal(lerNumero("sob consulta"), null);
  assert.equal(lerMes("Ago/2030"), "2030-08-01");
  assert.equal(lerMes("dezembro de 2028"), "2028-12-01");
  assert.equal(lerMes("12/2028"), "2028-12-01");
  assert.equal(lerMes("2026-11"), "2026-11-01");
  assert.equal(lerMes("36 meses após a assinatura"), null);
});

test("o próprio docs/empreendimentos-dados.json é uma resposta válida, e não muda nada no catálogo", () => {
  const dados = ler(JSON_REAL);
  assert.equal(dados.empreendimentos.length, CATALOGO.length);
  const plano = planejarImportacao(dados, CATALOGO);
  assert.deepEqual(contarPlano(plano), { atualiza: 0, novos: 0, iguais: CATALOGO.length, erros: 0 });
});

test("validação: resposta vazia, sem JSON, sem empreendimento e campo inválido dizem onde está o erro", () => {
  assert.deepEqual(lerImportacao("  "), { ok: false, erros: ["Cole a resposta da IA ou escolha o arquivo .json."] });
  assert.match((lerImportacao("Não consegui ler o PDF.") as { erros: string[] }).erros[0], /Não consegui ler o JSON/);
  assert.match((lerImportacao(`{"empreendimentos": []}`) as { erros: string[] }).erros[0], /nenhum empreendimento/);
  const r = lerImportacao(resposta([{ nome: "Life", tipologias: [{ rotulo: "2 dorms", tipo: "nave espacial" }] }]));
  assert.equal(r.ok, false);
  assert.match((r as { erros: string[] }).erros[0], /^Empreendimento 1 \(Life\), tipologia 1, tipo: valor fora da lista/);
  const preco = lerImportacao(resposta([{ nome: "Life", tipologias: [{ rotulo: "2 dorms", preco_a_partir_de: 50 }] }]));
  assert.match((preco as { erros: string[] }).erros[0], /preco_a_partir_de: valor baixo demais/);
  const semNome = lerImportacao(resposta([{ tipologias: [] }]));
  assert.match((semNome as { erros: string[] }).erros[0], /Empreendimento 1, nome/);
});

test("tolerância: texto em volta, vários blocos, aspas tortas, vírgula sobrando, tipo e fase por extenso", () => {
  const texto =
    "Parte 1\n```json\n{ “formato”: “" + FORMATO + "”, \"empreendimentos\": [{ \"nome\": \"Life\", \"tipologias\": [{ \"rotulo\": \"2 dorms\", \"tipo\": \"Apto\", \"preco_a_partir_de\": \"R$ 400.000,00\", }] }] }\n```\n" +
    "Parte 2\n```json\n{ \"empreendimentos\": [{ \"nome\": \"Wynn Tower\", \"status\": \"Em obras\", \"tipologias\": [{ \"rotulo\": \"Sala 40 m²\", \"tipo\": \"Sala\", \"area_m2\": \"40,5\", \"esgotada\": \"sim\" }] }], \"avisos\": [\"Página 2 cortada\"] }\n```";
  const r = lerImportacao(texto);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.dados.empreendimentos.length, 2);
  assert.deepEqual(
    { tipo: r.dados.empreendimentos[0].tipologias[0].tipo, preco: r.dados.empreendimentos[0].tipologias[0].preco_a_partir_de },
    { tipo: "apartamento", preco: 400000 },
  );
  const sala = r.dados.empreendimentos[1].tipologias[0];
  assert.deepEqual({ tipo: sala.tipo, area: sala.area_m2, esgotada: sala.esgotada }, { tipo: "sala_comercial", area: 40.5, esgotada: true });
  assert.equal(r.dados.empreendimentos[1].status, "em_obras");
  assert.deepEqual(r.avisos, ["Página 2 cortada"]);
});

test("prévia: atualiza o preço da tipologia certa, cria a nova e avisa das que não vieram", () => {
  const mzo = doSlug("marco-zero-one");
  const [t1, t2] = mzo.tipologias;
  const dados = ler(
    resposta([
      {
        id: "marco-zero-one",
        nome: "Marco Zero One",
        status: "lancamento",
        tipologias: [
          { rotulo: t1.rotulo, tipo: "apartamento", dormitorios: 3, area_m2: 152, preco_a_partir_de: 2500000, preco_nota: "a partir de · tabela dez/2026" },
          // Rótulo diferente, mas mesmo tipo, dormitórios e área: é a mesma planta.
          { rotulo: "Final 3 · 152 m² · 4 dorms", tipo: "apartamento", dormitorios: t2.dormitorios, area_m2: 152, preco_a_partir_de: t2.preco_a_partir_de },
          { rotulo: "Garden 180 m²", tipo: "garden", dormitorios: 3, area_m2: 180, preco_a_partir_de: 2900000 },
        ],
      },
    ]),
  );
  const [p] = planejarImportacao(dados, CATALOGO);
  assert.equal(p.acao, "atualiza");
  if (p.acao !== "atualiza") return;
  assert.deepEqual(p.campos, { tabela_mes: "2026-12-01" });
  assert.equal(p.alteradas.length, 1);
  assert.equal(p.alteradas[0].id, t1.id);
  assert.deepEqual(p.alteradas[0].campos, { preco_a_partir_de: 2500000, preco_nota: "a partir de · tabela dez/2026" });
  assert.deepEqual(p.alteradas[0].resumo, ["R$ 2.436.300 → R$ 2.500.000"]);
  assert.equal(p.novas.length, 1);
  assert.equal(p.novas[0].rotulo, "Garden 180 m²");
  assert.equal(p.naoVieram.length, mzo.tipologias.length - 2);
  assert.equal(resumoDoItem(p), "→ Atualiza Marco Zero One: 1 preço muda, 1 tipologia nova, tabela de dez/2026");
});

test("prévia: acha pelo nome e pelas variações, nunca pelo condomínio; novo precisa da fase; repetido é erro", () => {
  const life = doSlug("life");
  const dados = ler(
    resposta([
      { nome: "LIFE MBigucci", tipologias: [] },
      { nome: "Mundi", status: "lancamento", tipologias: [] }, // condomínio de várias torres: não é nenhuma delas
      { nome: "Residencial Novo", status: "breve_lancamento", bairro: "Centro", cidade: "Santo André", tipologias: [{ rotulo: "2 dorms 55 m²", dormitorios: 2, area_m2: 55, preco_a_partir_de: 390000 }] },
      { nome: "Sem Fase", tipologias: [] },
      { id: "life", nome: "Life", tipologias: [] },
    ]),
  );
  const p = planejarImportacao(dados, CATALOGO);
  assert.equal(p[0].acao, "atualiza"); // achou o Life pelo nome sem a marca; muda o mês da tabela
  assert.equal(p[0].acao === "atualiza" && p[0].empreendimento.id, life.id);
  assert.equal(p[1].acao, "erro");
  assert.match(resumoDoItem(p[1]), /mais de um empreendimento \(Mundi - Thiago, Mundi - Lucca, Mundi - Vitor\)/);
  assert.equal(p[2].acao, "novo");
  if (p[2].acao === "novo") {
    assert.equal(p[2].campos.slug, "residencial-novo");
    assert.equal(p[2].campos.tabela_mes, "2026-12-01");
    assert.equal(p[2].novas[0].tipo, "apartamento");
    assert.equal(resumoDoItem(p[2]), "+ Novo: Residencial Novo, 1 tipologia");
  }
  assert.equal(p[3].acao, "erro");
  assert.match(resumoDoItem(p[3]), /sem a fase/);
  assert.equal(p[4].acao, "erro");
  assert.match(resumoDoItem(p[4]), /aparece duas vezes/);
});

test("prévia: esgotar, voltar à venda e campo vazio que não apaga o catálogo", () => {
  const st = doSlug("stylo");
  const t = st.tipologias[0];
  const [p] = planejarImportacao(
    ler(resposta([{ id: "stylo", nome: st.nome, tabela_mes: st.tabela_mes?.slice(0, 7), tipologias: [{ rotulo: t.rotulo, tipo: t.tipo, preco_a_partir_de: t.preco_a_partir_de, esgotada: true }] }])),
    CATALOGO,
  );
  assert.equal(p.acao, "atualiza");
  if (p.acao !== "atualiza") return;
  // A IA não mandou a área nem as vagas: o catálogo continua com elas.
  assert.deepEqual(p.alteradas[0].campos, { esgotada: true });
  assert.deepEqual(p.alteradas[0].resumo, ["esgotada"]);
});

test("instruções: o formato, as regras e o catálogo atual com ids e rótulos", () => {
  const md = instrucoesImportacao(CATALOGO, new Date(2026, 11, 3));
  assert.match(md, /"formato": "mbigucci-empreendimentos\/1"/);
  assert.match(md, /"tabela_mes": "2026-12"/);
  assert.match(md, /`marco-zero-one` · Marco Zero One \(Lançamento\) · tipologias: "Final 3/);
  assert.match(md, /Nunca invente preço/);
  assert.match(md, new RegExp(`Catálogo atual \\(${CATALOGO.length} empreendimentos\\)`));
  // O exemplo do próprio texto é uma resposta válida.
  const exemplo = md.match(/```json\n([\s\S]*?)```/)![1];
  assert.equal(lerImportacao(exemplo).ok, true);
});
