// Testes do catálogo: normalização de nomes, lista do Cadastro Mágico a partir
// do catálogo (com os dados reais de docs/empreendimentos-dados.json), filtros
// e as variáveis das mensagens prontas. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acharNoCatalogo,
  bairrosDoCatalogo,
  filtrarCatalogo,
  FILTROS_VAZIOS,
  linkComoChegar,
  linkParaCliente,
  listaDoMagico,
  normalizarNome,
  resumoArea,
  resumoDormitorios,
  slugDoNome,
  tabelaAntiga,
  textoEntrega,
  variaveisDoEmpreendimento,
} from "./catalogo.ts";
import { EMPREENDIMENTOS } from "./empreendimentos.ts";
import { lerMensagem } from "./cadastro-magico.ts";
import { preencherModelo } from "./mensagens.ts";
import { CATALOGO, doSlug } from "./catalogo-teste.ts";


test("normalizarNome: sem acento, pontuação, maiúscula e a marca", () => {
  assert.equal(normalizarNome("Life MBigucci"), "life");
  assert.equal(normalizarNome("Mundi - Lucca"), "mundi lucca");
  assert.equal(normalizarNome("  América  "), "america");
  assert.equal(normalizarNome("Easy Jaçanã"), "easy jacana");
  assert.equal(normalizarNome("Marco Zero Premier & Prime"), "marco zero premier prime");
  assert.equal(normalizarNome(null), "");
  assert.equal(slugDoNome("Mundi - Lucca"), "mundi-lucca");
  assert.equal(slugDoNome("Terra Nostra Modena"), "terra-nostra-modena");
});

test("acharNoCatalogo: nome, variação e condomínio, com os nomes antigos dos leads", () => {
  const achar = (n: string) => acharNoCatalogo(n, CATALOGO)?.slug ?? null;
  assert.equal(achar("Life"), "life");
  assert.equal(achar("life mbigucci"), "life");
  assert.equal(achar("Mundi Lucca"), "mundi-lucca");
  assert.equal(achar("Mundi - Vitor"), "mundi-vitor");
  assert.equal(achar("Mundi"), "mundi-thiago"); // a primeira torre do condomínio
  assert.equal(achar("América"), "america-california");
  assert.equal(achar("Terra Nostra"), "modena");
  assert.equal(achar("Palatium"), "palatium");
  assert.equal(achar("Marco Zero One"), "marco-zero-one");
  assert.equal(achar("Wish"), "wish");
  assert.equal(achar("Cortina D'Ampezzo"), null);
  assert.equal(achar(""), null);
  // O inativo só vem quando não há ativo com o mesmo nome.
  const cat = CATALOGO.map((e) => (e.slug === "mundi-thiago" ? { ...e, ativo: false } : e));
  assert.equal(acharNoCatalogo("Mundi", cat)?.slug, "mundi-lucca");
  assert.equal(acharNoCatalogo("Mundi - Thiago", cat)?.slug, "mundi-thiago");
});

test("listaDoMagico: catálogo vazio usa a lista fixa", () => {
  assert.equal(listaDoMagico([]), EMPREENDIMENTOS);
  assert.equal(listaDoMagico(null), EMPREENDIMENTOS);
  assert.equal(listaDoMagico(CATALOGO.map((e) => ({ ...e, ativo: false }))), EMPREENDIMENTOS);
  const nomes = EMPREENDIMENTOS.map((e) => e.nome);
  for (const n of ["Marco Zero One", "Elleva", "Dom"]) assert.ok(nomes.includes(n), n);
  for (const n of ["Cortina D'Ampezzo", "Village da Serra"]) assert.ok(!nomes.includes(n), n);
});

test("listaDoMagico: torres, condomínios e variações repartidas", () => {
  const lista = listaDoMagico(CATALOGO);
  const item = (nome: string) => lista.find((e) => e.nome === nome);
  // Uma entrada por torre ativa, mais os condomínios com variação comum.
  assert.ok(item("Mundi - Lucca"));
  assert.ok(item("Mundi"));
  assert.ok(item("Terra Nostra"));
  assert.ok(item("America")?.pedeContexto);
  assert.ok(item("Marco Zero Mix"));
  assert.ok(!item("Exuberance"), "Exuberance tem uma torre só: a variação fica com ela");
  assert.ok(item("Exuberance - Bellatrix")?.chaves?.includes("exuberance"));
  // "MBigucci Joy" é condomínio da loja e nome da torre residencial: fica com a torre.
  assert.ok(!lista.some((e) => e.nome === "MBigucci Joy" && e !== item("MBigucci Joy")));
  assert.ok(item("MBigucci Joy")?.chaves?.includes("joy"));
  // Nenhuma chave em dois itens.
  const todas = lista.flatMap((e) => [...new Set([normalizarNome(e.nome), ...(e.chaves ?? [])])]);
  assert.deepEqual(todas.filter((k, i) => todas.indexOf(k) !== i), []);
});

test("Cadastro Mágico com o catálogo: torre, condomínio, contexto e bairro novo", () => {
  const listas = { empreendimentos: listaDoMagico(CATALOGO), bairros: bairrosDoCatalogo(CATALOGO) };
  const emp = (t: string) => lerMensagem(t, [], listas).empreendimento;
  assert.deepEqual(emp("Oi, quero saber do Mundi Lucca, tem de 2 dorms?"), { valor: "Mundi - Lucca", selo: "detectado" });
  assert.deepEqual(emp("Vi o anúncio do Mundi no Instagram"), { valor: "Mundi", selo: "detectado" });
  assert.deepEqual(emp("Tenho interesse no Marco Zero One"), { valor: "Marco Zero One", selo: "detectado" });
  assert.deepEqual(emp("Quero conhecer o Residencial Life"), { valor: "Life MBigucci", selo: "detectado" });
  assert.deepEqual(emp("Quero conhecer o Life MBigucci"), { valor: "Life MBigucci", selo: "detectado" });
  assert.equal(emp("Life is good, me liga").valor, null);
  assert.equal(emp("Dom eu posso ir no domingo").valor, null);
  assert.deepEqual(emp("Empreendimento: Dom"), { valor: "Dom MBigucci", selo: "detectado" });
  assert.deepEqual(emp("Quero o Modena em Guarulhos"), { valor: "Terra Nostra Modena", selo: "detectado" });
  // Bairro que só está no catálogo vira sugestão; "Centro" não.
  const b = lerMensagem("Procuro algo na Vila Carrão ou no Centro", [], listas).sugestoes.bairros;
  assert.ok(b.includes("Vila Carrão"));
  assert.ok(!b.includes("Centro"));
});

test("links do card: apresentação, book ou página, e o Maps pelo endereço", () => {
  assert.match(linkParaCliente(doSlug("life"))!, /drive\.google/);
  assert.equal(linkParaCliente(doSlug("marco-zero-one")), doSlug("marco-zero-one").link_book);
  assert.equal(linkParaCliente({ link_apresentacao: null, link_book: null, link_pagina: null }), null);
  assert.equal(linkComoChegar({ link_maps: null, endereco: "Rua A, 1" }), "https://www.google.com/maps/search/?api=1&query=Rua%20A%2C%201");
  assert.equal(linkComoChegar({ link_maps: null, endereco: null }), null);
});

test("resumos do card: dormitórios, área, entrega e tabela antiga", () => {
  assert.equal(resumoDormitorios(doSlug("life")), "Studio, 2 dorms");
  assert.equal(resumoDormitorios(doSlug("marco-zero-one")), "3 e 4 dorms");
  assert.equal(resumoDormitorios(doSlug("wynn-tower")), "Sala comercial");
  assert.equal(resumoDormitorios(doSlug("dom")), null);
  assert.equal(resumoArea(doSlug("unique")), "35,72 m²");
  assert.equal(textoEntrega(doSlug("mundi-lucca")), "Entrega em dez/2029");
  assert.equal(textoEntrega(doSlug("life")), "Pronto para morar");
  assert.equal(textoEntrega(doSlug("elleva")), null);
  assert.equal(tabelaAntiga(doSlug("life"), new Date(2026, 10, 15)), false);
  assert.equal(tabelaAntiga(doSlug("life"), new Date(2026, 11, 1)), true);
  assert.equal(tabelaAntiga(doSlug("elleva"), new Date(2027, 0, 1)), false);
});

test("filtros: busca, status, cidade e bairro, dormitórios, faixa de preço e inativos", () => {
  const f = (x: Partial<typeof FILTROS_VAZIOS>) => filtrarCatalogo(CATALOGO, { ...FILTROS_VAZIOS, ...x }).map((e) => e.slug);
  assert.equal(f({}).length, CATALOGO.length);
  assert.deepEqual(f({}).slice(0, 2), ["elleva", "dom"]); // lançamentos primeiro
  assert.deepEqual(f({ busca: "jacana" }), ["easy-jacana"]);
  assert.deepEqual(f({ busca: "mundi lucca" }), ["mundi-lucca"]);
  assert.deepEqual(f({ status: "lancamento" }), ["marco-zero-one", "mundi-lucca", "mundi-vitor"]);
  assert.ok(f({ local: "Santo André" }).every((s) => doSlug(s).cidade === "Santo André"));
  assert.deepEqual(f({ local: "São Paulo|Aclimação" }), ["new-park", "vert"]);
  assert.ok(f({ dormitorios: "4" }).includes("marco-zero-one"));
  assert.ok(!f({ dormitorios: "4" }).includes("life"));
  assert.ok(f({ dormitorios: "1" }).includes("life"), "studio conta como 1");
  const ate300 = f({ faixa: "ate-300" });
  assert.ok(ate300.includes("easy-jacana") && ate300.includes("alvorada"));
  assert.ok(!ate300.includes("marco-zero-one"));
  assert.ok(!f({ faixa: "ate-300" }).includes("elleva"), "sem preço não entra na faixa");
  const cat = CATALOGO.map((e) => (e.slug === "life" ? { ...e, ativo: false } : e));
  assert.ok(!filtrarCatalogo(cat, FILTROS_VAZIOS).some((e) => e.slug === "life"));
  assert.ok(filtrarCatalogo(cat, { ...FILTROS_VAZIOS, inativos: true }).some((e) => e.slug === "life"));
});

test("mensagens: variáveis do empreendimento e linha que some sem o dado", () => {
  const modelo = "Oi, {primeiro_nome}, tudo bem?\n\nSeparei: {empreendimento}.\nEndereço: {endereco}\nA partir de {a_partir_de}\nApresentação: {apresentacao}\n\n{corretor}";
  const lead = { nome: "ana souza", empreendimento: "Mundi - Lucca" };
  const v = variaveisDoEmpreendimento(doSlug("mundi-lucca"));
  assert.equal(
    preencherModelo(modelo, lead, "Carla", undefined, v),
    `Oi, Ana, tudo bem?\n\nSeparei: Mundi - Lucca.\nEndereço: ${doSlug("mundi-lucca").endereco}\nA partir de R$ 344.800\nApresentação: ${linkParaCliente(doSlug("mundi-lucca"))}\n\nCarla`,
  );
  // Elleva: sem preço; fora do catálogo: sem nada.
  assert.ok(!preencherModelo(modelo, lead, "Carla", undefined, variaveisDoEmpreendimento(doSlug("elleva"))).includes("A partir de"));
  assert.equal(preencherModelo(modelo, lead, "Carla"), "Oi, Ana, tudo bem?\n\nSeparei: Mundi - Lucca.\n\nCarla");
  // Sem cliente (envio pelo card do catálogo).
  assert.match(preencherModelo(modelo, { nome: "", empreendimento: "Mundi - Lucca" }, "Carla", undefined, v), /^Oi, tudo bem\?/);
});
