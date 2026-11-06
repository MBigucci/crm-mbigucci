// Testes dos avisos no celular: montagem de cada aviso, horário de São Paulo e
// de atendimento, não repetir, preferências por aparelho e a criptografia do
// Web Push (cifra e decifra, e a assinatura do VAPID). Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  atendimentoAberto,
  cabecalhoVapid,
  cifrar,
  comDestino,
  deBase64Url,
  ehAniversarioHoje,
  emSP,
  enderecoDePush,
  horaSP,
  itensDoLog,
  juntarContatos,
  listaDeNomes,
  montarAvisos,
  paraBase64Url,
  paraTentarDeNovo,
  parceirosParaDescartar,
  parceirosParaMarcar,
  soNovos,
  TIPOS_AVISO as TIPOS_DA_FUNCAO,
  type Assinatura,
  type DadosAvisos,
  type LeadAviso,
  type ParceiroAviso,
  type VisitaAviso,
} from "../../supabase/functions/avisos/index.ts";
import { TIPOS_AVISO, tiposDoAparelho } from "./avisos.ts";
import { fazAniversarioHoje } from "./perfil.ts";

const CORRETOR = "c1";
const GERENTE = "g1";
/** Horário de São Paulo, sem depender do fuso de quem roda o teste. */
const sp = (s: string) => new Date(`${s}-03:00`);
const iso = (s: string) => sp(s).toISOString();

const lead = (o: Partial<LeadAviso> = {}): LeadAviso => ({
  id: "l1",
  dono_id: CORRETOR,
  nome: "Ana Souza",
  origem: "plantao",
  etapa: "em_contato",
  empreendimento: "Marco Zero One",
  proximo_contato: null,
  atribuido_em: null,
  atribuido_por: null,
  fim_prazo: null,
  ...o,
});
const visita = (o: Partial<VisitaAviso> = {}): VisitaAviso => ({
  id: "v1",
  corretor_id: CORRETOR,
  lead_id: "l1",
  lead_nome: "Ana Souza",
  empreendimento: "Marco Zero One",
  inicio: iso("2026-11-03T15:00"),
  local: "Stand de vendas",
  ...o,
});
const dados = (o: Partial<DadosAvisos> = {}): DadosAvisos => ({
  horario: { dias: [0, 1, 2, 3, 4, 5, 6], inicio: "09:00", fim: "19:00" },
  assinaturas: [],
  leads: [],
  visitas: [],
  ...o,
});
/** Lead da empresa que o gerente passou ao corretor, aguardando o primeiro contato. */
const daEmpresa = (atribuido: string, fim: string, o: Partial<LeadAviso> = {}) =>
  lead({ origem: "empresa", etapa: "novo", atribuido_em: iso(atribuido), atribuido_por: GERENTE, fim_prazo: iso(fim), ...o });

test("hora de São Paulo: data, dia da semana e hora, em qualquer fuso", () => {
  assert.deepEqual(emSP(new Date("2026-11-03T12:05:00Z")), { data: "2026-11-03", dia: 2, hora: 9, minuto: 5, minutos: 545 });
  // 1h da manhã em UTC ainda é o dia anterior em São Paulo
  assert.deepEqual(emSP(new Date("2026-11-04T01:00:00Z")).data, "2026-11-03");
  assert.equal(horaSP(iso("2026-11-03T10:00")), "10h");
  assert.equal(horaSP(iso("2026-11-03T15:30")), "15h30");
});

test("horário de atendimento: aberto, fechado, dia sem atendimento e horário inválido", () => {
  const h = { dias: [1, 2, 3, 4, 5], inicio: "09:00", fim: "19:00" };
  assert.equal(atendimentoAberto(sp("2026-11-03T09:00"), h), true);
  assert.equal(atendimentoAberto(sp("2026-11-03T08:59"), h), false);
  assert.equal(atendimentoAberto(sp("2026-11-03T19:00"), h), false);
  assert.equal(atendimentoAberto(sp("2026-11-08T10:00"), h), false); // domingo
  assert.equal(atendimentoAberto(sp("2026-11-08T03:00"), { dias: [], inicio: "09:00", fim: "19:00" }), true);
});

test("próximo contato: avisa na hora marcada e por até 30 min, inclusive fora do horário", () => {
  const l = lead({ proximo_contato: iso("2026-11-03T14:00") });
  assert.equal(montarAvisos(dados({ leads: [l] }), sp("2026-11-03T13:59")).length, 0);
  const [a] = montarAvisos(dados({ leads: [l] }), sp("2026-11-03T14:02"));
  assert.equal(a.tipo, "contato");
  assert.equal(a.usuario_id, CORRETOR);
  assert.equal(a.titulo, "Hora do contato");
  assert.equal(a.corpo, "Ana Souza · Marco Zero One. Marcado para 14h.");
  assert.equal(a.url, "leads/ficha/?id=l1");
  assert.deepEqual(a.chaves, [`contato:l1:${sp("2026-11-03T14:00").getTime() / 1000}`]);
  assert.equal(montarAvisos(dados({ leads: [l] }), sp("2026-11-03T14:31")).length, 0);
  // o corretor marcou 21h: o aviso sai às 21h
  const noite = lead({ proximo_contato: iso("2026-11-03T21:00") });
  assert.equal(montarAvisos(dados({ leads: [noite] }), sp("2026-11-03T21:00")).length, 1);
});

test("próximo contato remarcado vira outra chave, então avisa de novo", () => {
  const antes = montarAvisos(dados({ leads: [lead({ proximo_contato: iso("2026-11-03T14:00") })] }), sp("2026-11-03T14:00"));
  const depois = montarAvisos(dados({ leads: [lead({ proximo_contato: iso("2026-11-03T16:00") })] }), sp("2026-11-03T16:00"));
  assert.notDeepEqual(antes[0].chaves, depois[0].chaves);
});

test("visita: cerca de 1 hora antes, uma vez por horário", () => {
  const v = visita();
  assert.equal(montarAvisos(dados({ visitas: [v] }), sp("2026-11-03T13:50")).length, 0);
  const [a] = montarAvisos(dados({ visitas: [v] }), sp("2026-11-03T13:56"));
  assert.equal(a.tipo, "visita");
  assert.equal(a.titulo, "Visita às 15h");
  assert.equal(a.corpo, "Ana Souza · Marco Zero One · Stand de vendas");
  assert.equal(a.url, "leads/ficha/?id=l1");
  const [b] = montarAvisos(dados({ visitas: [v] }), sp("2026-11-03T14:01"));
  assert.deepEqual(a.chaves, b.chaves); // a rodada seguinte gera a mesma chave: o banco não repete
  assert.equal(montarAvisos(dados({ visitas: [v] }), sp("2026-11-03T15:00")).filter((x) => x.tag.startsWith("visita-")).length, 0);
});

test("visita: aguardando baixa no fim do atendimento, um aviso por corretor e por dia", () => {
  const vs = [
    visita({ id: "v1", inicio: iso("2026-11-03T15:00"), lead_nome: "Ana Souza" }),
    visita({ id: "v2", inicio: iso("2026-11-03T10:00"), lead_nome: "Bruno Lima" }),
    visita({ id: "v3", inicio: iso("2026-11-03T20:00"), lead_nome: "Caio Reis" }), // ainda não aconteceu
  ];
  assert.equal(montarAvisos(dados({ visitas: vs }), sp("2026-11-03T18:55")).filter((a) => a.tag === "baixa").length, 0);
  const baixa = montarAvisos(dados({ visitas: vs }), sp("2026-11-03T19:00")).filter((a) => a.tag === "baixa");
  assert.equal(baixa.length, 1);
  assert.equal(baixa[0].titulo, "2 visitas aguardando baixa");
  assert.equal(baixa[0].corpo, "Bruno e Ana. Registre como foi.");
  assert.equal(baixa[0].url, "agenda/");
  assert.deepEqual(baixa[0].chaves, ["baixa:c1:2026-11-03"]);
  // fim do atendimento às 18h em Configurações: o aviso sai às 18h
  const h18 = { dias: [0, 1, 2, 3, 4, 5, 6], inicio: "09:00", fim: "18:00" };
  const cedo = montarAvisos(dados({ visitas: vs, horario: h18 }), sp("2026-11-03T18:05")).filter((a) => a.tag === "baixa");
  assert.equal(cedo.length, 1);
  const uma = montarAvisos(dados({ visitas: [vs[1]] }), sp("2026-11-03T19:00")).filter((a) => a.tag === "baixa");
  assert.equal(uma[0].titulo, "1 visita aguardando baixa");
});

test("lead da empresa atribuído: avisa na hora, dentro do horário", () => {
  const l = daEmpresa("2026-11-03T10:00", "2026-11-03T10:15");
  const [a] = montarAvisos(dados({ leads: [l] }), sp("2026-11-03T10:00"));
  assert.equal(a.tipo, "atribuido");
  assert.equal(a.usuario_id, CORRETOR);
  assert.equal(a.titulo, "Lead novo para você");
  assert.equal(a.corpo, "Ana Souza · Marco Zero One. Responda em até 15 min.");
  assert.equal(a.tag, "lead-l1");
});

test("lead da empresa atribuído fora do horário: o aviso espera a abertura", () => {
  const l = daEmpresa("2026-11-03T22:00", "2026-11-04T09:15");
  assert.equal(montarAvisos(dados({ leads: [l] }), sp("2026-11-03T22:00")).length, 0);
  const abertura = montarAvisos(dados({ leads: [l] }), sp("2026-11-04T09:00"));
  const atribuido = abertura.find((a) => a.tipo === "atribuido");
  assert.ok(atribuido);
  assert.equal(atribuido.corpo, "Ana Souza · Marco Zero One. Responda em até 15 min.");
});

test("lead da empresa: sem aviso de atribuição quando o gerente é o dono, ou já passou do prazo", () => {
  const proprio = daEmpresa("2026-11-03T10:00", "2026-11-03T10:15", { atribuido_por: CORRETOR });
  assert.equal(montarAvisos(dados({ leads: [proprio] }), sp("2026-11-03T10:00")).length, 0);
  const vencido = daEmpresa("2026-11-03T10:00", "2026-11-03T10:15");
  assert.equal(montarAvisos(dados({ leads: [vencido] }), sp("2026-11-03T10:20")).filter((a) => a.tipo === "atribuido").length, 0);
});

test("prazo de 15 min: faltando 5 min e quando estoura, cada um uma vez", () => {
  const l = daEmpresa("2026-11-03T10:00", "2026-11-03T10:15");
  const aos9 = montarAvisos(dados({ leads: [l] }), sp("2026-11-03T10:09")).filter((a) => a.tipo === "prazo");
  assert.equal(aos9.length, 1);
  assert.equal(aos9[0].titulo, "Faltam 6 min para responder");
  const aos10 = montarAvisos(dados({ leads: [l] }), sp("2026-11-03T10:10")).filter((a) => a.tipo === "prazo");
  assert.equal(aos10[0].titulo, "Faltam 5 min para responder");
  assert.deepEqual(aos9[0].chaves, aos10[0].chaves);
  const estourou = montarAvisos(dados({ leads: [l] }), sp("2026-11-03T10:15")).filter((a) => a.tipo === "prazo");
  assert.equal(estourou[0].titulo, "Prazo de 15 min estourado");
  assert.equal(estourou[0].corpo, "Ana Souza · Marco Zero One ainda está sem primeiro contato. Fale agora.");
  assert.notDeepEqual(estourou[0].chaves, aos9[0].chaves);
  assert.equal(montarAvisos(dados({ leads: [l] }), sp("2026-11-03T10:46")).length, 0);
});

test("lead da empresa aguardando não recebe o aviso de próximo contato (o prazo cuida dele)", () => {
  const l = daEmpresa("2026-11-03T10:00", "2026-11-03T10:15", { proximo_contato: iso("2026-11-03T12:00") });
  assert.equal(montarAvisos(dados({ leads: [l] }), sp("2026-11-03T12:00")).filter((a) => a.tipo === "contato").length, 0);
});

test("resumo do dia: na abertura, com atrasados, hoje, visitas e aguardando primeiro contato", () => {
  const d = dados({
    leads: [
      lead({ id: "a", proximo_contato: iso("2026-11-02T15:00") }),
      lead({ id: "b", proximo_contato: iso("2026-11-03T08:00") }),
      lead({ id: "c", proximo_contato: iso("2026-11-03T16:00") }),
      lead({ id: "d", proximo_contato: iso("2026-11-04T10:00") }), // amanhã: fora
      daEmpresa("2026-11-02T22:00", "2026-11-03T09:15", { id: "e" }),
    ],
    visitas: [visita({ inicio: iso("2026-11-03T10:00") }), visita({ id: "v2", inicio: iso("2026-11-03T15:30") })],
  });
  assert.equal(montarAvisos(d, sp("2026-11-03T08:55")).filter((a) => a.tipo === "resumo").length, 0);
  const [r] = montarAvisos(d, sp("2026-11-03T09:00")).filter((a) => a.tipo === "resumo");
  assert.equal(r.titulo, "Seu dia no Base360");
  assert.equal(r.corpo, "1 aguardando primeiro contato · 2 atrasados · 1 contato para hoje · 2 visitas (10h, 15h30)");
  assert.equal(r.url, "");
  assert.deepEqual(r.chaves, ["resumo:c1:2026-11-03"]);
  // a rodada seguinte, ainda na janela, gera a mesma chave
  assert.deepEqual(montarAvisos(d, sp("2026-11-03T09:05")).find((a) => a.tipo === "resumo")?.chaves, r.chaves);
  assert.equal(montarAvisos(d, sp("2026-11-03T10:00")).filter((a) => a.tipo === "resumo").length, 0);
});

test("resumo do dia: dia sem pendências não manda nada, e dia sem atendimento também não", () => {
  const vazio = dados({ leads: [lead({ proximo_contato: iso("2026-11-05T10:00") })] });
  assert.equal(montarAvisos(vazio, sp("2026-11-03T09:00")).length, 0);
  const comAtraso = dados({
    leads: [lead({ proximo_contato: iso("2026-11-02T10:00") })],
    horario: { dias: [1, 2, 3, 4, 5], inicio: "09:00", fim: "19:00" },
  });
  assert.equal(montarAvisos(comAtraso, sp("2026-11-08T09:00")).length, 0); // domingo
  assert.equal(montarAvisos(comAtraso, sp("2026-11-09T09:00")).length, 1); // segunda
});

test("resumo do dia: aniversários de hoje, sem o ano, inclusive o 29/02 no dia 28", () => {
  const niver = (lead_id: string, nome: string, dia_mes: string, dono_id = CORRETOR) => ({ lead_id, nome, dia_mes, dono_id });
  const d = dados({
    leads: [lead({ id: "a", proximo_contato: iso("2026-11-02T15:00") })],
    aniversarios: [niver("x", "Bruno Lima", "11-03"), niver("y", "Ana Souza", "11-03"), niver("z", "Caio", "11-04")],
  });
  const [r] = montarAvisos(d, sp("2026-11-03T09:00")).filter((a) => a.tipo === "resumo");
  assert.equal(r.corpo, "1 atrasado · aniversários de Ana e Bruno");
  assert.doesNotMatch(r.corpo, /d{4}/);
  // Só o aniversário já manda o resumo, para dar tempo de mandar os parabéns.
  const so = dados({ leads: [], aniversarios: [niver("y", "Ana Souza", "02-29")] });
  assert.equal(montarAvisos(so, sp("2027-02-28T09:00")).find((a) => a.tipo === "resumo")?.corpo, "aniversário de Ana Souza");
  assert.equal(montarAvisos(so, sp("2028-02-28T09:00")).filter((a) => a.tipo === "resumo").length, 0);
  assert.equal(montarAvisos(so, sp("2028-02-29T09:00")).find((a) => a.tipo === "resumo")?.corpo, "aniversário de Ana Souza");
  // Sem o SQL do item 16, o resumo continua como antes.
  assert.equal(montarAvisos(dados({ leads: [lead({ proximo_contato: iso("2026-11-02T15:00") })] }), sp("2026-11-03T09:00"))[0].corpo, "1 atrasado");
});

test("aniversário: a função e a ficha dão a mesma resposta, inclusive na virada do ano e no 29/02", () => {
  for (const [nasc, hoje] of [["1990-02-29", "2027-02-28"], ["1990-02-29", "2028-02-28"], ["1990-02-29", "2028-02-29"], ["1990-02-29", "2100-02-28"],
                              ["1990-12-31", "2026-12-31"], ["1990-01-01", "2027-01-01"], ["1990-01-01", "2026-12-31"], ["1990-03-01", "2027-02-28"]]) {
    const [a, m, d] = hoje.split("-").map(Number);
    assert.equal(ehAniversarioHoje(nasc.slice(5), hoje), fazAniversarioHoje(nasc, new Date(a, m - 1, d, 12)), `${nasc} em ${hoje}`);
  }
});

test("não repetir: só sai o que o banco acabou de registrar", () => {
  const d = dados({ leads: [lead({ id: "a", proximo_contato: iso("2026-11-03T14:00") }), lead({ id: "b", proximo_contato: iso("2026-11-03T14:00") })] });
  const avisos = montarAvisos(d, sp("2026-11-03T14:00"));
  assert.equal(avisos.length, 2);
  const itens = itensDoLog(avisos);
  assert.equal(itens.length, 2);
  // primeira rodada: o banco registrou os dois
  assert.equal(soNovos(avisos, itens).length, 2);
  // rodada seguinte: o banco não registra nada novo (já estavam no push_log)
  assert.equal(soNovos(montarAvisos(d, sp("2026-11-03T14:05")), []).length, 0);
  // só um era novo
  assert.deepEqual(soNovos(avisos, [itens[1]]).map((a) => a.chaves), [[itens[1].chave]]);
});

test("preferências: só vai para quem tem aparelho com aquele tipo ligado", () => {
  const ass = (usuario_id: string, tipos: string[]): Assinatura => ({ endpoint: `https://fcm.googleapis.com/${usuario_id}`, usuario_id, p256dh: "", auth: "", tipos });
  const avisos = montarAvisos(
    dados({ leads: [lead({ proximo_contato: iso("2026-11-03T14:00") })], visitas: [visita()] }),
    sp("2026-11-03T14:00"),
  );
  assert.deepEqual(avisos.map((a) => a.tipo).sort(), ["contato", "visita"]);
  assert.deepEqual(comDestino(avisos, [ass(CORRETOR, ["visita"])]).map((a) => a.tipo), ["visita"]);
  assert.deepEqual(comDestino(avisos, [ass(CORRETOR, ["visita"]), ass(CORRETOR, ["contato"])]).length, 2);
  assert.equal(comDestino(avisos, [ass("outra", ["contato", "visita"])]).length, 0);
});

test("muitos contatos na mesma rodada viram um aviso só, com todas as chaves", () => {
  const nomes = ["Ana Souza", "Bruno Lima", "Caio Reis", "Duda Melo", "Edu Paz"];
  const leads = nomes.map((nome, i) => lead({ id: `l${i}`, nome, proximo_contato: iso("2026-11-03T14:00") }));
  const juntos = juntarContatos(montarAvisos(dados({ leads }), sp("2026-11-03T14:00")));
  assert.equal(juntos.length, 1);
  assert.equal(juntos[0].titulo, "5 contatos para agora");
  assert.equal(juntos[0].corpo, "Ana, Bruno, Caio e mais 2. Veja a lista do dia.");
  assert.equal(juntos[0].chaves.length, 5);
  assert.equal(juntarContatos(montarAvisos(dados({ leads: leads.slice(0, 3) }), sp("2026-11-03T14:00"))).length, 3);
  assert.equal(listaDeNomes(["Ana Souza", "Bruno Lima"]), "Ana e Bruno");
});

// ---------- Item 28: avisos ao gerente (tipo "equipe") ----------

const equipe = (membros: [string, string][] = [[CORRETOR, "Bruno Lima"]]) => [
  { gerente_id: GERENTE, membros: membros.map(([id, nome]) => ({ id, nome })) },
];
const daEquipe = (avisos: ReturnType<typeof montarAvisos>) => avisos.filter((a) => a.tipo === "equipe");

test("equipe: prazo estourado avisa o gerente na hora, uma vez por lead, e abre a ficha", () => {
  const l = daEmpresa("2026-11-03T14:00", "2026-11-03T14:15", { nome: "Ana Souza" });
  const d = dados({ leads: [l], equipes: equipe() });
  assert.equal(daEquipe(montarAvisos(d, sp("2026-11-03T14:14"))).length, 0); // ainda no prazo
  const [a] = daEquipe(montarAvisos(d, sp("2026-11-03T14:15")));
  assert.equal(a.usuario_id, GERENTE);
  assert.equal(a.titulo, "Prazo de 15 min estourado na equipe");
  assert.equal(a.corpo, "Ana Souza · Marco Zero One, com Bruno Lima, está sem primeiro contato. Veja o Lead perdido.");
  assert.equal(a.url, "leads/ficha/?id=l1");
  // a rodada seguinte gera a mesma chave (o banco não repete); 30 min depois, nada
  const [b] = daEquipe(montarAvisos(d, sp("2026-11-03T14:40")));
  assert.deepEqual(b.chaves, a.chaves);
  assert.equal(daEquipe(montarAvisos(d, sp("2026-11-03T14:45"))).length, 0);
  // o corretor continua recebendo o dele, com outra chave
  const doCorretor = montarAvisos(d, sp("2026-11-03T14:15")).filter((x) => x.tipo === "prazo");
  assert.equal(doCorretor[0].usuario_id, CORRETOR);
  assert.notDeepEqual(doCorretor[0].chaves, a.chaves);
});

test("equipe: só leads de corretores da equipe, só da empresa em novo; reatribuído vira outra chave", () => {
  const fora = daEmpresa("2026-11-03T14:00", "2026-11-03T14:15", { id: "l2", dono_id: "outro" });
  const comContato = daEmpresa("2026-11-03T14:00", "2026-11-03T14:15", { id: "l3", etapa: "em_contato" });
  const plantao = lead({ id: "l4", proximo_contato: iso("2026-11-03T14:15") });
  const d = dados({ leads: [fora, comContato, plantao], equipes: equipe() });
  assert.equal(daEquipe(montarAvisos(d, sp("2026-11-03T14:20"))).length, 0);
  // sem o SQL do item 28 (sem equipes), nada para o gerente
  const l = daEmpresa("2026-11-03T14:00", "2026-11-03T14:15");
  assert.equal(daEquipe(montarAvisos(dados({ leads: [l] }), sp("2026-11-03T14:20"))).length, 0);
  // Lead perdido: o prazo recomeça para quem recebeu, e o aviso volta a valer
  const antes = daEquipe(montarAvisos(dados({ leads: [l], equipes: equipe() }), sp("2026-11-03T14:20")))[0];
  const novo = daEmpresa("2026-11-03T14:25", "2026-11-03T14:40");
  const depois = daEquipe(montarAvisos(dados({ leads: [novo], equipes: equipe() }), sp("2026-11-03T14:41")))[0];
  assert.notDeepEqual(depois.chaves, antes.chaves);
});

test("equipe: mais de 3 prazos estourados na mesma rodada viram um aviso só, que abre o painel", () => {
  const membros: [string, string][] = [["c1", "Bruno Lima"], ["c2", "Caio Reis"], ["c3", "Dani Melo"]];
  const leads = ["c1", "c2", "c3", "c1"].map((dono, i) =>
    daEmpresa("2026-11-03T14:00", "2026-11-03T14:15", { id: `l${i}`, dono_id: dono }),
  );
  const juntos = juntarContatos(montarAvisos(dados({ leads, equipes: equipe(membros) }), sp("2026-11-03T14:16")));
  const doGerente = juntos.filter((a) => a.usuario_id === GERENTE);
  assert.equal(doGerente.length, 1);
  assert.equal(doGerente[0].titulo, "4 prazos estourados na equipe");
  assert.equal(doGerente[0].corpo, "Bruno, Caio e Dani. Veja o painel.");
  assert.equal(doGerente[0].url, "painel/");
  assert.equal(doGerente[0].chaves.length, 4);
  // os avisos dos corretores não se misturam com o do gerente
  assert.equal(juntos.filter((a) => a.tipo === "prazo").length, 4);
  // 3 ou menos continuam separados
  const tres = juntarContatos(montarAvisos(dados({ leads: leads.slice(0, 3), equipes: equipe(membros) }), sp("2026-11-03T14:16")));
  assert.equal(tres.filter((a) => a.usuario_id === GERENTE).length, 3);
});

test("equipe: às 19h, as visitas da equipe aguardando baixa, um resumo por gerente e por dia", () => {
  const membros: [string, string][] = [["c1", "Bruno Lima"], ["c2", "Caio Reis"]];
  const vs = [
    visita({ id: "v1", corretor_id: "c2", inicio: iso("2026-11-03T10:00") }),
    visita({ id: "v2", corretor_id: "c1", inicio: iso("2026-11-03T11:00") }),
    visita({ id: "v3", corretor_id: "c1", inicio: iso("2026-11-02T15:00") }), // de ontem, ainda sem baixa
    visita({ id: "v4", corretor_id: "c1", inicio: iso("2026-11-03T20:00") }), // ainda não aconteceu
    visita({ id: "v5", corretor_id: "outro", inicio: iso("2026-11-03T10:00") }), // de outra equipe
  ];
  const d = dados({ visitas: vs, equipes: equipe(membros) });
  assert.equal(daEquipe(montarAvisos(d, sp("2026-11-03T18:55"))).length, 0);
  const [a] = daEquipe(montarAvisos(d, sp("2026-11-03T19:00")));
  assert.equal(a.usuario_id, GERENTE);
  assert.equal(a.titulo, "3 visitas da equipe aguardando baixa");
  assert.equal(a.corpo, "Bruno (2) e Caio (1). Cobre a baixa.");
  assert.equal(a.url, "agenda/");
  assert.deepEqual(a.chaves, ["equipe_baixa:g1:2026-11-03"]);
  assert.deepEqual(daEquipe(montarAvisos(d, sp("2026-11-03T19:55")))[0].chaves, a.chaves); // mesma chave: sai uma vez
  assert.equal(daEquipe(montarAvisos(d, sp("2026-11-03T20:00"))).length, 0);
  const uma = daEquipe(montarAvisos(dados({ visitas: [vs[0]], equipes: equipe(membros) }), sp("2026-11-03T19:00")));
  assert.equal(uma[0].titulo, "1 visita da equipe aguardando baixa");
  assert.equal(uma[0].corpo, "Caio (1). Cobre a baixa.");
  // sem visita aguardando, não manda nada
  assert.equal(daEquipe(montarAvisos(dados({ visitas: [vs[3]], equipes: equipe(membros) }), sp("2026-11-03T19:00"))).length, 0);
});

test("equipe: só vai para o aparelho do gerente com o tipo Equipe ligado", () => {
  const ass = (tipos: string[]): Assinatura => ({ endpoint: "https://fcm.googleapis.com/g", usuario_id: GERENTE, p256dh: "", auth: "", tipos });
  const l = daEmpresa("2026-11-03T14:00", "2026-11-03T14:15");
  const avisos = montarAvisos(dados({ leads: [l], equipes: equipe() }), sp("2026-11-03T14:15"));
  assert.equal(comDestino(avisos, [ass(["contato", "visita", "atribuido", "prazo", "resumo"])]).length, 0);
  assert.deepEqual(comDestino(avisos, [ass(["equipe"])]).map((a) => a.tipo), ["equipe"]);
});

test("falha em todos os aparelhos volta para a próxima rodada; aparelho removido não", () => {
  const [a, b, c] = montarAvisos(
    dados({ leads: ["a", "b", "c"].map((id) => lead({ id, proximo_contato: iso("2026-11-03T14:00") })) }),
    sp("2026-11-03T14:00"),
  );
  const de = paraTentarDeNovo([
    { aviso: a, resultado: "falhou" },
    { aviso: a, resultado: "enviado" },
    { aviso: b, resultado: "falhou" },
    { aviso: c, resultado: "removido" },
  ]);
  assert.deepEqual(de, [b]);
});

test("os tipos de Minha conta são os mesmos da função", () => {
  assert.deepEqual(TIPOS_AVISO.map((t) => t.slug).sort(), [...TIPOS_DA_FUNCAO].sort());
  // "Equipe" só aparece para quem vê a equipe
  assert.equal(tiposDoAparelho(() => false).some((t) => t.slug === "equipe"), false);
  assert.equal(tiposDoAparelho((p) => p === "dados.ver_equipe").some((t) => t.slug === "equipe"), true);
  // "Parceiros" só para quem cadastra parceiros (o corretor não vê)
  assert.equal(tiposDoAparelho(() => false).some((t) => t.slug === "parceiros"), false);
  assert.equal(tiposDoAparelho((p) => p === "dados.ver_equipe").some((t) => t.slug === "parceiros"), false);
  assert.equal(tiposDoAparelho((p) => p === "parceiros.cadastrar").some((t) => t.slug === "parceiros"), true);
});

// ---------- Parcerias (05/11/2026): tipo "parceiros" ----------

const pend = (o: Partial<ParceiroAviso> = {}): ParceiroAviso => ({
  id: 1,
  gerente_id: GERENTE,
  tipo: "recebido",
  criado_em: iso("2026-11-03T07:00"),
  parceiro_id: "p1",
  do_gerente: true,
  nome: "Rita Lopes",
  empresa: "Lopes Imóveis",
  dias_sem_interacao: 0,
  proximo_contato: null,
  ...o,
});
const deParceiros = (avisos: ReturnType<typeof montarAvisos>) => avisos.filter((a) => a.tipo === "parceiros");

test("parceiros: cada tipo com o texto curto, só para o gerente dono, abrindo a ficha do parceiro", () => {
  const d = dados({
    parceiros: [
      pend({ id: 1, tipo: "recebido" }),
      pend({ id: 2, tipo: "reentrada", parceiro_id: "p2", nome: "Caio Dias", empresa: null }),
      pend({ id: 3, tipo: "prazo_80", parceiro_id: "p3", nome: "Edu Paz", empresa: "Paz", dias_sem_interacao: 80 }),
      pend({ id: 4, tipo: "proximo_contato", parceiro_id: "p4", nome: "Lia Reis", empresa: "", proximo_contato: "2026-11-03" }),
      pend({ id: 5, tipo: "proximo_contato", parceiro_id: "p5", nome: "Teo Luz", empresa: "Teo Luz", proximo_contato: "2026-11-01" }),
    ],
  });
  const av = deParceiros(montarAvisos(d, sp("2026-11-03T09:05")));
  assert.deepEqual(
    av.map((a) => [a.usuario_id, a.titulo, a.corpo, a.url, a.chaves, a.parceiroAvisos]),
    [
      [GERENTE, "Parceiro novo para você", "Rita Lopes · Lopes Imóveis. Faça o primeiro contato.", "parceiros/ficha/?id=p1", ["parceiro:1"], [1]],
      [GERENTE, "Parceiro procurou de novo", "Caio Dias procurou a MBigucci de novo. Retome o contato.", "parceiros/ficha/?id=p2", ["parceiro:2"], [2]],
      [GERENTE, "Faltam 10 dias para perder o parceiro", "Edu Paz · Paz. 80 dias sem interação. Registre um contato.", "parceiros/ficha/?id=p3", ["parceiro:3"], [3]],
      [GERENTE, "Contato com parceiro hoje", "Lia Reis. Combinado para hoje.", "parceiros/ficha/?id=p4", ["parceiro:4"], [4]],
      [GERENTE, "Contato com parceiro vencido", "Teo Luz. Combinado para 01/11.", "parceiros/ficha/?id=p5", ["parceiro:5"], [5]],
    ],
  );
  // a rodada seguinte gera as mesmas chaves; o banco não registra de novo, então nada sai
  const seguinte = deParceiros(montarAvisos(d, sp("2026-11-03T09:10")));
  assert.deepEqual(seguinte.map((a) => a.chaves), av.map((a) => a.chaves));
  assert.equal(soNovos(seguinte, []).length, 0);
});

test("parceiros: o aviso espera o horário de atendimento e não sai mais depois de 72 h", () => {
  const d = dados({ parceiros: [pend({ criado_em: iso("2026-11-03T02:00") })] });
  assert.equal(deParceiros(montarAvisos(d, sp("2026-11-03T07:00"))).length, 0); // a rotina roda às 7h
  assert.equal(parceirosParaDescartar(d, sp("2026-11-03T07:00")).length, 0); // espera, não descarta
  assert.equal(deParceiros(montarAvisos(d, sp("2026-11-03T09:00"))).length, 1);
  assert.equal(deParceiros(montarAvisos(d, sp("2026-11-06T09:00"))).length, 0);
  assert.deepEqual(parceirosParaDescartar(d, sp("2026-11-06T09:00")), [1]);
});

test("parceiros: parceiro que já não é do gerente não vira aviso, só é marcado (sem dado de outro gerente)", () => {
  const d = dados({ parceiros: [pend({ id: 7, do_gerente: false, nome: null, empresa: null, dias_sem_interacao: null })] });
  assert.equal(deParceiros(montarAvisos(d, sp("2026-11-03T10:00"))).length, 0);
  assert.deepEqual(parceirosParaDescartar(d, sp("2026-11-03T10:00")), [7]);
});

test("parceiros: contato registrado entre a rotina e o envio tira o aviso (80 dias e próximo contato), sem texto errado", () => {
  const d = dados({
    parceiros: [
      pend({ id: 1, tipo: "prazo_80", dias_sem_interacao: 0 }), // registrou contato às 8h; o prazo recomeçou
      pend({ id: 2, tipo: "proximo_contato", parceiro_id: "p2", proximo_contato: null }), // a interação já não é a última
      pend({ id: 3, tipo: "prazo_80", parceiro_id: "p3", dias_sem_interacao: 81 }),
    ],
  });
  const av = deParceiros(montarAvisos(d, sp("2026-11-03T09:00")));
  assert.deepEqual(av.map((a) => a.titulo), ["Faltam 9 dias para perder o parceiro"]);
  assert.deepEqual(parceirosParaDescartar(d, sp("2026-11-03T09:00")), [1, 2]);
});

test("parceiros: só vai para o aparelho com a chave Parceiros; mais de 3 viram um aviso só", () => {
  const ass = (tipos: string[], usuario = GERENTE): Assinatura => ({ endpoint: `https://fcm.googleapis.com/${usuario}`, usuario_id: usuario, p256dh: "", auth: "", tipos });
  const nomes = ["Ana Lima", "Bia Rocha", "Caio Dias", "Davi Reis"];
  const d = dados({ parceiros: nomes.map((nome, i) => pend({ id: i + 1, parceiro_id: `p${i}`, nome })) });
  const av = montarAvisos(d, sp("2026-11-03T09:00"));
  assert.equal(comDestino(av, [ass(["contato", "visita", "atribuido", "prazo", "resumo", "equipe"])]).length, 0);
  assert.equal(comDestino(av, [ass(["parceiros"], "outro")]).length, 0);
  const [j] = juntarContatos(comDestino(av, [ass(["parceiros"])]));
  assert.equal(j.titulo, "4 avisos de parceiros");
  assert.equal(j.corpo, "Ana, Bia, Caio e mais 1. Veja seus parceiros.");
  assert.equal(j.url, "parceiros/");
  assert.deepEqual(j.parceiroAvisos, [1, 2, 3, 4]);
  assert.equal(j.chaves.length, 4);
});

test("parceiros: marca só o que saiu; o que falhou em todos os aparelhos volta na próxima rodada", () => {
  const d = dados({ parceiros: [pend({ id: 1 }), pend({ id: 2, parceiro_id: "p2" }), pend({ id: 3, parceiro_id: "p3" })] });
  const [a, b, c] = deParceiros(montarAvisos(d, sp("2026-11-03T09:00")));
  const deNovo = paraTentarDeNovo([
    { aviso: a, resultado: "enviado" },
    { aviso: b, resultado: "falhou" },
    { aviso: c, resultado: "removido" },
  ]);
  assert.deepEqual(parceirosParaMarcar([a, b, c], deNovo), [1, 3]);
});

test("só endereços de serviços de push de verdade", () => {
  assert.equal(enderecoDePush("https://fcm.googleapis.com/fcm/send/abc"), true);
  assert.equal(enderecoDePush("https://web.push.apple.com/QGx"), true);
  assert.equal(enderecoDePush("https://wns2-bl2p.notify.windows.com/w/?token=x"), true);
  assert.equal(enderecoDePush("http://fcm.googleapis.com/fcm/send/abc"), false);
  assert.equal(enderecoDePush("https://fcm.googleapis.com:8443/x"), false);
  assert.equal(enderecoDePush("https://exemplo.com/fcm.googleapis.com"), false);
});

// ---------- Criptografia ----------

const subtle = globalThis.crypto.subtle;
type Bytes = Uint8Array<ArrayBuffer>;
const juntar = (...p: Uint8Array[]): Bytes => {
  const out = new Uint8Array(new ArrayBuffer(p.reduce((n, x) => n + x.length, 0)));
  let i = 0;
  for (const x of p) {
    out.set(x, i);
    i += x.length;
  }
  return out;
};
const utf8 = (s: string) => juntar(new TextEncoder().encode(s));
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, n: number) {
  const k = await subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, n * 8));
}

/** O que o aparelho faz ao receber (RFC 8291): decifra com a chave privada dele. */
async function decifrar(corpo: Bytes, aparelho: CryptoKeyPair, auth: Bytes) {
  const sal = corpo.slice(0, 16);
  const tam = corpo[20];
  const chaveServidor = corpo.slice(21, 21 + tam);
  const cifrado = corpo.slice(21 + tam);
  const pubAparelho = new Uint8Array(await subtle.exportKey("raw", aparelho.publicKey));
  const pubServidor = await subtle.importKey("raw", chaveServidor, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const segredo = new Uint8Array(await subtle.deriveBits({ name: "ECDH", public: pubServidor } as EcdhKeyDeriveParams, aparelho.privateKey, 256));
  const ikm = await hkdf(auth, segredo, juntar(utf8("WebPush: info\0"), pubAparelho, chaveServidor), 32);
  const cek = await hkdf(sal, ikm, utf8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(sal, ikm, utf8("Content-Encoding: nonce\0"), 12);
  const k = await subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const claro = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: nonce }, k, cifrado));
  assert.equal(claro[claro.length - 1], 2);
  return { texto: new TextDecoder().decode(claro.slice(0, -1)), rs: new DataView(corpo.buffer).getUint32(16) };
}

test("Web Push: o aparelho decifra a mensagem (aes128gcm)", async () => {
  const aparelho = (await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const auth = globalThis.crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const p256dh = paraBase64Url(new Uint8Array(await subtle.exportKey("raw", aparelho.publicKey)));
  const msg = JSON.stringify({ titulo: "Visita às 15h", corpo: "Ana Souza · Marco Zero One ✓" });
  const corpo = await cifrar(msg, p256dh, paraBase64Url(auth));
  const { texto, rs } = await decifrar(corpo, aparelho, auth);
  assert.equal(texto, msg);
  assert.equal(rs, 4096);
});

test("VAPID: JWT ES256 com o serviço de push como público, assinado pela chave privada", async () => {
  const par = (await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const publica = paraBase64Url(new Uint8Array(await subtle.exportKey("raw", par.publicKey)));
  const privada = (await subtle.exportKey("jwk", par.privateKey)).d!;
  const agora = new Date("2026-11-03T12:00:00Z");
  const h = await cabecalhoVapid("https://fcm.googleapis.com/fcm/send/abc", publica, privada, "https://base360.mbigucci.com.br/vendas/", agora);
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h);
  assert.ok(m);
  assert.equal(m[4], publica);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(deBase64Url(m[1]))), { typ: "JWT", alg: "ES256" });
  assert.deepEqual(JSON.parse(new TextDecoder().decode(deBase64Url(m[2]))), {
    aud: "https://fcm.googleapis.com",
    exp: agora.getTime() / 1000 + 12 * 3600,
    sub: "https://base360.mbigucci.com.br/vendas/",
  });
  const ok = await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, par.publicKey, deBase64Url(m[3]), utf8(`${m[1]}.${m[2]}`));
  assert.equal(ok, true);
});

// ---------------------------------------------------------------------
// Distribuição automática (06/11/2026): os pendentes de distribuicao_avisos.
// ---------------------------------------------------------------------
import { textoDaDistribuicao, distribuicaoParaDescartar, distribuicaoParaMarcar } from "../../supabase/functions/avisos/index.ts";

const distAviso = (tipo: string, extra: Record<string, unknown> = {}) => ({
  id: 1, para_id: "u1", tipo, lead_id: "l1", criado_em: "2026-11-10T13:00:00Z", lead_nome: "Ana Souza", empreendimento: "Easy", dados: {}, ...extra,
});
const dadosDist = (avisos: ReturnType<typeof distAviso>[]) =>
  ({ horario: { dias: [0, 1, 2, 3, 4, 5, 6], inicio: "09:00", fim: "19:00" }, assinaturas: [], leads: [], visitas: [], distribuicao: avisos });

test("distribuição: textos sem pontos nem verba, e cada tipo no tipo de aviso certo", () => {
  for (const tipo of ["lead_novo", "lead_plantao", "mensagem_nova", "mensagem_sem_resposta", "fim_da_fila", "sem_sinal", "plantao_fim",
                      "perda", "mensagem_sem_resposta_equipe", "fila_equipe", "a_distribuir", "repasse_atrasado", "represado_parado"]) {
    const t = textoDaDistribuicao(distAviso(tipo));
    assert.ok(t, tipo);
    assert.doesNotMatch(`${t.titulo} ${t.corpo}`, /ponto|verba/i, tipo);
  }
  assert.equal(textoDaDistribuicao(distAviso("lead_novo"))!.corpo, "Ana Souza · Easy. Responda em até 15 min.");
  assert.equal(textoDaDistribuicao(distAviso("perda"))!.tipo, "equipe");
  assert.equal(textoDaDistribuicao(distAviso("inventado")), null);
});

test("distribuição: o lead de plantão sai à noite; o lead novo espera o horário; o velho só é marcado", () => {
  const noite = new Date("2026-11-11T01:00:00Z"); // 22h em São Paulo
  const d = dadosDist([distAviso("lead_plantao", { id: 1, criado_em: "2026-11-11T00:59:00Z" }),
                       distAviso("lead_novo", { id: 2, criado_em: "2026-11-11T00:59:00Z" }),
                       distAviso("fim_da_fila", { id: 3, criado_em: "2026-11-09T00:00:00Z" })]);
  const avisos = montarAvisos(d as never, noite);
  assert.deepEqual(avisos.map((a) => a.chaves[0]), ["distribuicao:1"]);
  assert.deepEqual(distribuicaoParaDescartar(d as never, noite), [3]);
  const dia = montarAvisos(dadosDist([distAviso("lead_novo", { id: 2, criado_em: "2026-11-11T12:00:00Z" })]) as never,
                           new Date("2026-11-11T12:30:00Z"));
  assert.equal(dia.length, 1);
  assert.deepEqual(distribuicaoParaMarcar(dia, []), [2]);
  assert.deepEqual(distribuicaoParaMarcar(dia, dia), []);
});
