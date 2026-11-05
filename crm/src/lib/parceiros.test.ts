import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agruparRegioes,
  camposDoParceiro,
  chaveRascunhoInteracaoParceiro,
  contatosDoDia,
  contarPorEstagio,
  criarBuscaParceiro,
  diaLocal,
  erroDeParceiro,
  estadoProximoContato,
  filtrarParceiros,
  formatarDia,
  formatarWhatsapp,
  juntarSituacao,
  lerFila,
  limitesDataEvento,
  linkWhatsapp,
  maisUrgente,
  normCreci,
  normWhatsapp,
  ordenarParceiros,
  proximoContatoValido,
  reentradasPendentes,
  resumoCarteira,
  somarDias,
  textoRegioes,
  updateDoParceiro,
  validarParceiro,
  CAMPOS_VAZIOS,
  type Parceiro,
  type ParceiroComSituacao,
  type Regiao,
  type Situacao,
} from "./parceiros.ts";
import { PREFIXO_RASCUNHO } from "./rascunho.ts";

// 23h30 em São Paulo: em UTC já é amanhã. As datas não podem pular o dia.
const NOITE = new Date(2026, 10, 4, 23, 30);

const parceiro = (id: string, extra: Partial<Parceiro> = {}): Parceiro => ({
  id,
  gerente_id: "g1",
  nome: `Parceiro ${id}`,
  empresa: null,
  whatsapp: null,
  whatsapp_norm: null,
  creci: null,
  creci_norm: null,
  email: null,
  regioes: [],
  regiao_outra: null,
  atribuido_em: "2026-10-01T12:00:00Z",
  ultima_interacao_em: null,
  ativo: true,
  entrada: "manual",
  criado_em: "2026-10-01T12:00:00Z",
  ...extra,
});

const com = (id: string, extra: Partial<ParceiroComSituacao> = {}): ParceiroComSituacao => ({
  ...parceiro(id),
  estagio: "novo",
  dias_prazo: 10,
  dias_restantes: 80,
  faixa: "ok",
  proximo_contato: null,
  reentrada_em: null,
  ...extra,
});

test("normWhatsapp segue o banco: 55, zeros, 9 do celular e tamanho", () => {
  assert.equal(normWhatsapp("(11) 98888-1234"), "11988881234");
  assert.equal(normWhatsapp("+55 11 98888-1234"), "11988881234");
  assert.equal(normWhatsapp("011 98888-1234"), "11988881234");
  assert.equal(normWhatsapp("11 8888-1234"), "11988881234"); // celular sem o 9
  assert.equal(normWhatsapp("11 4444-1234"), "1144441234"); // fixo fica com 10
  assert.equal(normWhatsapp("98888-1234"), null);
  assert.equal(normWhatsapp(""), null);
  assert.equal(normWhatsapp(null), null);
});

test("normCreci tira a palavra CRECI e a pontuação", () => {
  assert.equal(normCreci("CRECI 12.345-J"), "12345J");
  assert.equal(normCreci("creci/sp 98765-f"), "SP98765F");
  assert.equal(normCreci("1-2"), null);
  assert.equal(normCreci(undefined), null);
});

test("formatarWhatsapp e linkWhatsapp", () => {
  assert.equal(formatarWhatsapp("11988881234"), "(11) 98888-1234");
  assert.equal(formatarWhatsapp("1144441234"), "(11) 4444-1234");
  assert.equal(formatarWhatsapp(null), "");
  assert.equal(linkWhatsapp("11988881234"), "https://wa.me/5511988881234");
  assert.equal(linkWhatsapp("11988881234", "Olá, Ana"), "https://wa.me/5511988881234?text=Ol%C3%A1%2C%20Ana");
  assert.equal(linkWhatsapp(null), null);
});

test("busca por nome sem acento, empresa, WhatsApp e CRECI", () => {
  const p = parceiro("a", {
    nome: "Ana Souza",
    empresa: "Imobiliária Vila Nova",
    whatsapp_norm: "11988881234",
    creci_norm: "12345J",
  });
  assert.ok(criarBuscaParceiro("")(p));
  assert.ok(criarBuscaParceiro("ana")(p));
  assert.ok(criarBuscaParceiro("IMOBILIARIA")(p));
  assert.ok(criarBuscaParceiro("98888")(p));
  assert.ok(criarBuscaParceiro("+55 11 98888-1234")(p));
  assert.ok(criarBuscaParceiro("creci 12345")(p));
  assert.ok(criarBuscaParceiro("12.345-j")(p));
  assert.ok(!criarBuscaParceiro("Marcos")(p));
  // Poucos dígitos não procuram no telefone (evita casar tudo).
  assert.ok(!criarBuscaParceiro("98")(p));
});

test("juntarSituacao junta pela id, tira inativos e sem situação, e marca a reentrada", () => {
  const ps = [parceiro("a"), parceiro("b", { ativo: false }), parceiro("c")];
  const ss: Situacao[] = [
    { parceiro_id: "a", estagio: "contatado", dias_prazo: 40, dias_restantes: 50, faixa: "atencao", proximo_contato: "2026-11-10" },
    { parceiro_id: "b", estagio: "novo", dias_prazo: 0, dias_restantes: 90, faixa: "ok", proximo_contato: null },
  ];
  const r = juntarSituacao(ps, ss, new Map([["a", "2026-11-03T10:00:00Z"]]));
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "a");
  assert.equal(r[0].faixa, "atencao");
  assert.equal(r[0].reentrada_em, "2026-11-03T10:00:00Z");
});

test("reentradasPendentes: só a reentrada depois da última interação", () => {
  const eventos = [
    { parceiro_id: "a", criado_em: "2026-10-01T10:00:00Z" },
    { parceiro_id: "a", criado_em: "2026-11-03T10:00:00Z" },
    { parceiro_id: "b", criado_em: "2026-10-01T10:00:00Z" },
    { parceiro_id: "c", criado_em: "2026-10-01T10:00:00Z" },
  ];
  const atribuido_em = "2026-09-01T10:00:00Z";
  const r = reentradasPendentes(eventos, [
    { id: "a", atribuido_em, ultima_interacao_em: "2026-10-20T10:00:00Z" }, // reentrada mais nova: pendente
    { id: "b", atribuido_em, ultima_interacao_em: "2026-10-20T10:00:00Z" }, // já respondeu
    { id: "c", atribuido_em, ultima_interacao_em: null }, // nunca interagiu: pendente
    { id: "d", atribuido_em, ultima_interacao_em: null }, // sem reentrada
  ]);
  assert.deepEqual([...r.keys()].sort(), ["a", "c"]);
  assert.equal(r.get("a"), "2026-11-03T10:00:00Z");
});

test("reentradasPendentes: a reentrada de antes da troca de gerente não vai para o novo dono", () => {
  // Trocou de gerente em 15/10 (a atribuição zera ultima_interacao_em); a reentrada é de 01/10.
  const r = reentradasPendentes(
    [{ parceiro_id: "c", criado_em: "2026-10-01T10:00:00Z" }],
    [{ id: "c", atribuido_em: "2026-10-15T10:00:00Z", ultima_interacao_em: null }],
  );
  assert.equal(r.size, 0);
});

test("datas: dia local às 23h30, soma de dias e dd/mm/aaaa", () => {
  assert.equal(diaLocal(NOITE), "2026-11-04");
  assert.equal(somarDias("2026-11-04", 7), "2026-11-11");
  assert.equal(somarDias("2026-11-04", 30), "2026-12-04");
  assert.equal(somarDias("2026-12-28", 15), "2027-01-12");
  assert.equal(somarDias("2026-03-01", -1), "2026-02-28");
  assert.equal(formatarDia("2026-11-10"), "10/11/2026");
  assert.equal(formatarDia(null), "");
});

test("estado do próximo contato pelo dia local", () => {
  assert.equal(estadoProximoContato("2026-11-03", NOITE), "vencido");
  assert.equal(estadoProximoContato("2026-11-04", NOITE), "hoje");
  assert.equal(estadoProximoContato("2026-11-05", NOITE), "futuro");
  assert.equal(estadoProximoContato(null, NOITE), null);
});

test("limites do evento em lote e próximo contato válido", () => {
  assert.deepEqual(limitesDataEvento(NOITE), { min: "2026-10-05", max: "2026-11-04" });
  assert.ok(proximoContatoValido("", NOITE));
  assert.ok(proximoContatoValido("2026-11-04", NOITE));
  assert.ok(!proximoContatoValido("2026-11-03", NOITE));
  assert.ok(!proximoContatoValido("10/11/2026", NOITE));
});

test("resumo da carteira por faixa, novos, vencidos e reentradas", () => {
  const lista = [
    com("a", { faixa: "ok", estagio: "novo" }),
    com("b", { faixa: "atencao", estagio: "contatado", proximo_contato: "2026-11-01" }),
    com("c", { faixa: "risco", estagio: "apresentado", reentrada_em: "2026-11-03T10:00:00Z" }),
    com("d", { faixa: "risco", estagio: "apresentado", proximo_contato: "2026-11-04" }),
  ];
  assert.deepEqual(resumoCarteira(lista, NOITE), {
    total: 4,
    ok: 1,
    atencao: 1,
    risco: 2,
    novos: 1,
    vencidos: 1,
    reentradas: 1,
  });
  assert.deepEqual(contarPorEstagio(lista), { novo: 1, contatado: 1, apresentado: 2, indicou: 0, vendeu: 0 });
});

test("filtros por faixa, estágio, gerente e busca", () => {
  const lista = [
    com("a", { faixa: "ok", estagio: "novo", nome: "Ana" }),
    com("b", { faixa: "risco", estagio: "contatado", gerente_id: "g2", nome: "Bruno" }),
  ];
  const vazio = { faixa: null, estagio: null, gerente: null, busca: "" };
  assert.equal(filtrarParceiros(lista, vazio).length, 2);
  assert.deepEqual(filtrarParceiros(lista, { ...vazio, faixa: "risco" }).map((p) => p.id), ["b"]);
  assert.deepEqual(filtrarParceiros(lista, { ...vazio, estagio: "novo" }).map((p) => p.id), ["a"]);
  assert.deepEqual(filtrarParceiros(lista, { ...vazio, gerente: "g2" }).map((p) => p.id), ["b"]);
  assert.deepEqual(filtrarParceiros(lista, { ...vazio, busca: "ana" }).map((p) => p.id), ["a"]);
});

test("ordem: reentrada, contato vencido (o mais antigo antes), mais dias sem interação", () => {
  const lista = [
    com("calmo", { dias_prazo: 5 }),
    com("velho", { dias_prazo: 70 }),
    com("venc2", { proximo_contato: "2026-11-02", dias_prazo: 1 }),
    com("venc1", { proximo_contato: "2026-10-30", dias_prazo: 1 }),
    com("voltou", { reentrada_em: "2026-11-03T10:00:00Z" }),
  ];
  assert.deepEqual(ordenarParceiros(lista, NOITE).map((p) => p.id), ["voltou", "venc1", "venc2", "velho", "calmo"]);
  assert.equal(maisUrgente(lista, NOITE), "voltou");
  assert.equal(maisUrgente([com("x")], NOITE), null);
  assert.equal(maisUrgente([com("x", { faixa: "risco" })], NOITE), "x");
});

test("contatos do dia: só os do próprio gerente, de hoje e vencidos", () => {
  const lista = [
    com("hoje", { proximo_contato: "2026-11-04" }),
    com("ontem", { proximo_contato: "2026-11-03" }),
    com("amanha", { proximo_contato: "2026-11-05" }),
    com("outro", { proximo_contato: "2026-11-01", gerente_id: "g2" }),
    com("sem", {}),
  ];
  assert.deepEqual(contatosDoDia(lista, "g1", NOITE).map((p) => p.id), ["ontem", "hoje"]);
});

test("fila: quem está na vez e o último a receber", () => {
  const fila = [
    { posicao: 2, gerente_id: "g2", gerente_nome: "Bruno", ultima_vez_em: "2026-10-01T10:00:00Z", ultima_origem: "link" as const },
    { posicao: 1, gerente_id: "g1", gerente_nome: "Ana", ultima_vez_em: null, ultima_origem: null },
    { posicao: 3, gerente_id: "g3", gerente_nome: "Carla", ultima_vez_em: "2026-11-03T10:00:00Z", ultima_origem: "estande" as const },
  ];
  const r = lerFila(fila, "g1");
  assert.ok(r.souProximo);
  assert.deepEqual(r.ordem.map((l) => l.gerente_id), ["g1", "g2", "g3"]);
  assert.equal(r.ultimo?.gerente_id, "g3");
  assert.ok(!lerFila(fila, "g2").souProximo);
  assert.ok(!lerFila([], "g1").souProximo);
});

test("regiões: agrupa por cidade, a cidade inteira primeiro, e escreve o texto", () => {
  const cat: Regiao[] = [
    { codigo: "sbc_centro", nome: "Centro", cidade: "São Bernardo do Campo", ordem: 201, ativo: true },
    { codigo: "santo_andre", nome: "Santo André", cidade: "Santo André", ordem: 100, ativo: true },
    { codigo: "sao_bernardo", nome: "São Bernardo do Campo", cidade: "São Bernardo do Campo", ordem: 200, ativo: true },
    { codigo: "sa_centro", nome: "Centro", cidade: "Santo André", ordem: 101, ativo: true },
    { codigo: "velha", nome: "Velha", cidade: "Mauá", ordem: 500, ativo: false },
  ];
  const g = agruparRegioes(cat);
  assert.deepEqual(g.map((x) => x.cidade), ["Santo André", "São Bernardo do Campo"]);
  assert.deepEqual(g[1].itens.map((r) => r.codigo), ["sao_bernardo", "sbc_centro"]);
  assert.equal(
    textoRegioes(["santo_andre", "sbc_centro"], cat, " Pauliceia "),
    "Santo André, Centro (São Bernardo do Campo), Pauliceia",
  );
  assert.equal(textoRegioes([], cat, null), "");
});

test("validação do cadastro", () => {
  const ok = { ...CAMPOS_VAZIOS, nome: "Carla", whatsapp: "(11) 97777-5566" };
  assert.equal(validarParceiro(ok), null);
  assert.equal(validarParceiro({ ...ok, nome: " " }), "Preencha o nome.");
  assert.equal(validarParceiro({ ...ok, whatsapp: "" }), "Preencha o WhatsApp ou o CRECI.");
  assert.equal(validarParceiro({ ...ok, whatsapp: "", creci: "12345-F" }), null);
  assert.match(validarParceiro({ ...ok, whatsapp: "9777" })!, /WhatsApp/);
  assert.match(validarParceiro({ ...ok, creci: "1" })!, /CRECI/);
  assert.match(validarParceiro({ ...ok, email: "carla@" })!, /e-mail/);
  assert.match(validarParceiro({ ...ok, outra: true })!, /outra região/);
});

test("edição: campos de ida e volta, sem colunas do prazo", () => {
  const p = parceiro("a", {
    nome: "Ana",
    whatsapp: "11988881234",
    whatsapp_norm: "11988881234",
    regioes: ["santo_andre"],
    regiao_outra: "Pauliceia",
  });
  const c = camposDoParceiro(p);
  assert.equal(c.whatsapp, "(11) 98888-1234");
  assert.ok(c.outra);
  const u = updateDoParceiro({ ...c, outra: false });
  assert.deepEqual(Object.keys(u).sort(), ["creci", "email", "empresa", "nome", "regiao_outra", "regioes", "whatsapp"]);
  assert.equal(u.regiao_outra, null);
  assert.equal(u.empresa, null);
});

test("erros do banco em frase de tela", () => {
  assert.match(erroDeParceiro("regiao_invalida")!, /regiões/);
  assert.match(erroDeParceiro('duplicate key value violates unique constraint "parceiros_whatsapp_norm_uq"')!, /WhatsApp/);
  assert.match(erroDeParceiro('duplicate key value violates unique constraint "parceiros_creci_norm_uq"')!, /CRECI/);
  assert.equal(erroDeParceiro("outra coisa"), null);
});

test("rascunhos usam o prefixo que o Sair apaga", () => {
  assert.ok(chaveRascunhoInteracaoParceiro("p1").startsWith(PREFIXO_RASCUNHO));
});
