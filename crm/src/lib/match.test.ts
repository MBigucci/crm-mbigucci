// Testes do Radar de Match, com o catálogo real (docs/empreendimentos-dados.json).
// Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGO, doSlug } from "./catalogo-teste.ts";
import { clientesCompativeis, NOTA_MINIMA, pontuarEmpreendimento, radar, regioesDoLead, temPerfil, type LeadDoRadar } from "./match.ts";

const AGORA = new Date(2026, 10, 10, 12);
const perfil = (x: Partial<LeadDoRadar>) => ({ valor: null, dormitorios: null, regiao: null, finalidade: null, ...x });
const lead = (nome: string, x: Partial<LeadDoRadar>): LeadDoRadar => ({
  id: nome, nome, etapa: "em_contato", status: "ativo", motivo_descarte: null, dono_id: "carla", ...perfil(x),
});

test("regiões do lead: separa, normaliza e entende os apelidos", () => {
  assert.deepEqual(regioesDoLead("Rudge Ramos, Centro / SBC"), ["rudge ramos", "centro", "sao bernardo do campo"]);
  assert.deepEqual(regioesDoLead("Paulicéia ou Santo André"), ["pauliceia", "santo andre"]);
  assert.ok(regioesDoLead("ABC").includes("sao caetano do sul"));
  assert.deepEqual(regioesDoLead(""), []);
  assert.deepEqual(regioesDoLead(null), []);
});

test("perfil vazio não entra no Radar", () => {
  assert.equal(temPerfil(perfil({})), false);
  assert.equal(pontuarEmpreendimento(perfil({}), doSlug("life"), AGORA), null);
  assert.deepEqual(radar(perfil({}), CATALOGO, AGORA), []);
});

test("perfil completo: nota 100 com os motivos ✓, e a melhor tipologia", () => {
  const r = pontuarEmpreendimento(perfil({ valor: 360000, dormitorios: 2, regiao: "Pauliceia", finalidade: "morar" }), doSlug("mundi-lucca"), AGORA)!;
  assert.equal(r.nota, 100);
  assert.equal(r.tipologia?.preco_a_partir_de, 344800);
  assert.deepEqual(r.motivos.map((m) => m.sinal), ["✓", "✓", "✓", "✓"]);
  assert.match(r.motivos[0].texto, /Dentro do orçamento/);
  assert.equal(r.motivos[1].texto, "Região: Pauliceia");
});

test("orçamento: 10% de tolerância, como na Bruna", () => {
  const nota = (valor: number) => pontuarEmpreendimento(perfil({ valor }), doSlug("mundi-lucca"), AGORA)!;
  assert.equal(nota(344800).nota, 100);
  const pouco = nota(320000); // 344.800 ≤ 352.000
  assert.equal(pouco.nota, 60);
  assert.match(pouco.motivos[0].texto, /Um pouco acima/);
  assert.equal(nota(200000).nota, 0);
});

test("região: bairro vale tudo, cidade vale 70%, fora vale 15%", () => {
  const nota = (regiao: string) => pontuarEmpreendimento(perfil({ regiao }), doSlug("stylo"), AGORA)!.nota;
  assert.equal(nota("Rudge Ramos"), 100);
  assert.equal(nota("SBC"), 70);
  assert.equal(nota("Santo André"), 15);
  // Com a cidade citada, o bairro só vale nela.
  const centro = (e: string) => pontuarEmpreendimento(perfil({ regiao: "Centro, SBC" }), doSlug(e), AGORA)!.nota;
  assert.equal(centro("life"), 100);
  assert.equal(centro("easy-sao-vicente"), 15);
  assert.equal(pontuarEmpreendimento(perfil({ regiao: "Centro" }), doSlug("easy-sao-vicente"), AGORA)!.nota, 100);
});

test("dormitórios: studio conta 1; um a menos vale 40%", () => {
  const life = (dormitorios: number) => pontuarEmpreendimento(perfil({ dormitorios }), doSlug("life"), AGORA)!;
  assert.equal(life(1).nota, 100);
  assert.equal(life(1).tipologia?.tipo, "studio"); // o mais barato com a mesma nota
  assert.equal(life(2).nota, 100);
  assert.equal(life(3).nota, 40);
  assert.match(life(3).motivos[0].texto, /Só 2 dorms/);
});

test("finalidade: sala e loja só para quem investe", () => {
  assert.equal(pontuarEmpreendimento(perfil({ regiao: "Rudge Ramos" }), doSlug("wynn-tower"), AGORA), null);
  assert.equal(pontuarEmpreendimento(perfil({ regiao: "Rudge Ramos", finalidade: "morar" }), doSlug("wynn-tower"), AGORA), null);
  const inv = pontuarEmpreendimento(perfil({ regiao: "Rudge Ramos", finalidade: "investir" }), doSlug("wynn-tower"), AGORA)!;
  assert.equal(inv.nota, 100);
  assert.ok(inv.motivos.some((m) => m.texto === "Perfil de investimento"));
  const grande = pontuarEmpreendimento(perfil({ finalidade: "investir" }), doSlug("maximus"), AGORA)!;
  assert.equal(grande.nota, 50);
});

test("sem preço (Elleva e Dom): entra só pelo que dá para comparar, com o aviso", () => {
  const elleva = pontuarEmpreendimento(perfil({ valor: 600000, dormitorios: 2, regiao: "Centro, SBC" }), doSlug("elleva"), AGORA)!;
  assert.equal(elleva.nota, 100);
  assert.ok(elleva.motivos.some((m) => m.sinal === "!" && m.texto === "Sem preço na tabela"));
  const dom = pontuarEmpreendimento(perfil({ valor: 600000, regiao: "Campestre" }), doSlug("dom"), AGORA)!;
  assert.equal(dom.nota, 100);
  assert.ok(dom.motivos.some((m) => m.texto === "Sem tipologias no catálogo"));
});

test("avisos: restrição de renda e tabela de um mês anterior", () => {
  const r = pontuarEmpreendimento(perfil({ valor: 450000 }), doSlug("station"), new Date(2026, 11, 5))!;
  assert.ok(r.motivos.some((m) => m.texto === "Preço da tabela de nov/2026"));
  assert.ok(r.motivos.some((m) => /10 salários mínimos/.test(m.texto)));
});

test("radar: só a partir de 50%, da maior nota para a menor, sem inativo nem esgotada", () => {
  const p = perfil({ valor: 350000, dormitorios: 2, regiao: "São Bernardo do Campo", finalidade: "morar" });
  const lista = radar(p, CATALOGO, AGORA);
  assert.ok(lista.length > 0);
  assert.ok(lista.every((r) => r.nota >= NOTA_MINIMA));
  assert.deepEqual(lista.map((r) => r.nota), [...lista.map((r) => r.nota)].sort((a, b) => b - a));
  assert.equal(lista[0].empreendimento.slug, "america-california"); // R$ 303.700, 2 dorms, SBC
  const sem = CATALOGO.map((e) => (e.slug === "america-california" ? { ...e, ativo: false } : e));
  assert.ok(!radar(p, sem, AGORA).some((r) => r.empreendimento.slug === "america-california"));
  const esgotado = CATALOGO.map((e) =>
    e.slug === "america-california" ? { ...e, tipologias: e.tipologias.map((t) => ({ ...t, esgotada: true })) } : e,
  );
  assert.ok(!radar(p, esgotado, AGORA).some((r) => r.empreendimento.slug === "america-california"));
});

test("clientes compatíveis: nota ≥ 70, aguardando lançamento em destaque, descartado fora do perfil entra", () => {
  const leads = [
    lead("Ana", { valor: 400000, dormitorios: 2, regiao: "Pauliceia" }),
    lead("Bia", { valor: 400000, dormitorios: 2, regiao: "SBC", etapa: "aguardando_lancamento" }),
    lead("Caio", { valor: 200000, dormitorios: 3, regiao: "Guarulhos" }),
    lead("Duda", { valor: 400000, dormitorios: 2, status: "descartado", motivo_descarte: "fora_do_perfil" }),
    lead("Edu", { valor: 400000, dormitorios: 2, status: "descartado", motivo_descarte: "sem_interesse" }),
    lead("Fábio", { valor: 400000, dormitorios: 2, etapa: "venda" }),
    lead("Gil", {}),
  ];
  const c = clientesCompativeis(doSlug("mundi-lucca"), leads, AGORA);
  assert.deepEqual(c.map((x) => [x.lead.nome, x.destaque]), [["Bia", true], ["Ana", false], ["Duda", false]]);
  // Empreendimento pronto: ninguém em destaque.
  const pronto = clientesCompativeis(doSlug("mundi-thiago"), [lead("Bia", { valor: 500000, regiao: "Pauliceia", etapa: "aguardando_lancamento" })], AGORA);
  assert.deepEqual(pronto.map((x) => x.destaque), [false]);
});

test("renda (item 16): casa com a restrição do empreendimento, em salários mínimos", () => {
  const r = (renda_faixa: LeadDoRadar["renda_faixa"], slug = "america-california") =>
    pontuarEmpreendimento(perfil({ renda_faixa }), doSlug(slug), AGORA)!;
  // America California: "Somente clientes com renda até 6 salários mínimos."
  assert.equal(r("3_a_6").nota, 100);
  assert.ok(r("3_a_6").motivos.some((m) => m.sinal === "✓" && m.texto === "Renda dentro do limite (até 6 SM)"));
  assert.equal(r("6_a_10").nota, 0);
  assert.ok(r("6_a_10").motivos.some((m) => m.sinal === "✕" && /Renda acima do limite/.test(m.texto)));
  // Alvorada: a restrição vale só do 1º ao 12º andar → aviso, fora da nota.
  const alv = pontuarEmpreendimento(perfil({ renda_faixa: "10_a_20", regiao: "SBC" }), doSlug("alvorada"), AGORA)!;
  assert.ok(alv.motivos.some((m) => m.sinal === "!" && /confira as unidades \(Do 1º ao 12º andar/.test(m.texto)));
  assert.ok(!alv.motivos.some((m) => /Renda acima/.test(m.texto)));
  // Sem renda no lead, a restrição continua como aviso; sem restrição, a renda não conta.
  assert.ok(pontuarEmpreendimento(perfil({ valor: 450000 }), doSlug("station"), AGORA)!.motivos.some((m) => m.sinal === "!" && /10 salários/.test(m.texto)));
  const semRestricao = pontuarEmpreendimento(perfil({ valor: 360000, renda_faixa: "acima_20" }), doSlug("mundi-lucca"), AGORA)!;
  assert.equal(semRestricao.nota, 100);
  assert.ok(!semRestricao.motivos.some((m) => /Renda/.test(m.texto)));
  // Só a renda preenchida já põe o lead no Radar; quem passa do limite sai (nota abaixo de 50).
  assert.equal(temPerfil(perfil({ renda_faixa: "ate_3" })), true);
  const rad = radar(perfil({ renda_faixa: "10_a_20", regiao: "Santo André" }), CATALOGO, AGORA).map((x) => x.empreendimento.slug);
  assert.ok(!rad.includes("america-california") && !rad.includes("piemonte"));
});

test("pronto ou na planta (item 16): casa com a fase; tanto faz não conta", () => {
  const nota = (pronto_planta: LeadDoRadar["pronto_planta"], slug: string) =>
    pontuarEmpreendimento(perfil({ pronto_planta, regiao: "Pauliceia" }), doSlug(slug), AGORA)!.nota;
  // Mundi Lucca é lançamento na Pauliceia; Mundi Thiago, pronto no mesmo bairro.
  assert.equal(nota("planta", "mundi-lucca"), 100);
  assert.equal(nota("pronto", "mundi-thiago"), 100);
  assert.equal(nota("pronto", "mundi-lucca"), Math.round((25 / 35) * 100));
  assert.equal(nota("planta", "mundi-thiago"), Math.round((30 / 35) * 100));
  assert.equal(nota("tanto_faz", "mundi-lucca"), 100);
  assert.equal(temPerfil(perfil({ pronto_planta: "tanto_faz" })), false);
});

test("FGTS em sala comercial vira aviso", () => {
  const r = pontuarEmpreendimento(perfil({ finalidade: "investir", usa_fgts: true }), doSlug("marco-zero-mix-work"), AGORA)!;
  assert.ok(r.tipologia && ["sala_comercial", "loja"].includes(r.tipologia.tipo));
    assert.ok(r.motivos.some((m) => m.sinal === "!" && /FGTS não vale/.test(m.texto)));
  const casa = pontuarEmpreendimento(perfil({ finalidade: "morar", usa_fgts: true }), doSlug("mundi-lucca"), AGORA)!;
  assert.ok(!casa.motivos.some((m) => /FGTS/.test(m.texto)));
});
