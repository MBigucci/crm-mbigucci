// Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  abaInicial,
  antesDaVez,
  buscarPessoas,
  erroRecepcao,
  estadoDaLinha,
  janelaAberta,
  textoAnuncie,
  textoConfirmar,
  turnoAtual,
  type Pessoa,
} from "./recepcao.ts";

process.env.TZ = "America/Sao_Paulo";
const as = (hhmm: string) => new Date(`2026-11-05T${hhmm}:00-03:00`);

test("janela do Pôr na vez: 8h45–9h15 e 13h45–14h15", () => {
  assert.equal(janelaAberta("manha", as("08:44")), false);
  assert.equal(janelaAberta("manha", as("08:45")), true);
  assert.equal(janelaAberta("manha", as("09:14")), true);
  assert.equal(janelaAberta("manha", as("09:15")), false);
  assert.equal(janelaAberta("tarde", as("13:45")), true);
  assert.equal(janelaAberta("tarde", as("14:15")), false);
  assert.equal(janelaAberta("tarde", as("09:00")), false);
});

test("antes da vez, turno atual e aba que abre", () => {
  assert.equal(antesDaVez(as("08:44")), true);
  assert.equal(antesDaVez(as("08:45")), false);
  const soManha = [{ turno: "manha" as const, papel: "corretor" as const }];
  const comTarde = [...soManha, { turno: "tarde" as const, papel: "corretor" as const }];
  assert.equal(turnoAtual(as("13:50"), soManha), "manha", "a tarde ainda sem ninguém");
  assert.equal(turnoAtual(as("13:50"), comTarde), "tarde");
  assert.equal(turnoAtual(as("13:40"), comTarde), "manha");
  assert.equal(abaInicial(as("13:45")), "tarde");
  assert.equal(abaInicial(as("10:00")), "manha");
});

test("estado da linha: sinal + palavra", () => {
  const base = { estado: "presente" as const, estado_em: null, da_vez: false, nos_dois_turnos: false, entrada_em: "2026-11-05T09:40:00-03:00" };
  assert.deepEqual(estadoDaLinha({ ...base, da_vez: true }), { texto: "→ Da vez", tom: "vez" });
  assert.deepEqual(estadoDaLinha({ ...base, estado: "saiu", estado_em: "2026-11-05T10:15:00-03:00" }), { texto: "! Saiu 10h15", tom: "atencao" });
  assert.deepEqual(estadoDaLinha({ ...base, estado_em: "2026-11-05T11:02:00-03:00" }), { texto: "Voltou 11h02", tom: "neutro" });
  assert.deepEqual(estadoDaLinha({ ...base, estado: "encerrou", estado_em: "2026-11-05T11:10:00-03:00" }), { texto: "– Não está mais 11h10", tom: "fora" });
  assert.deepEqual(estadoDaLinha({ ...base, nos_dois_turnos: true }), { texto: "Manhã e tarde", tom: "neutro" });
  assert.deepEqual(estadoDaLinha(base), { texto: "Chegou 9h40", tom: "neutro" });
});

test("Anuncie: o papel explícito de cada um e a linha por tipo", () => {
  const novo = textoAnuncie({ status: "ok", atendimento_id: "a", tipo: "novo", anunciar: { papel: "corretor", nome: "Japa" }, especialista: "Paula" });
  assert.deepEqual(novo.quem, [{ papel: "Corretor(a)", nome: "Japa" }, { papel: "especialista", nome: "Paula" }]);
  assert.equal(novo.linha, "Cliente novo · vez dos corretores e dos especialistas");

  const antes = textoAnuncie({ status: "ok", atendimento_id: "a", tipo: "novo", anunciar: { papel: "corretor", nome: "Beto" }, antes_da_vez: true });
  assert.equal(antes.linha, "Cliente novo · antes da vez · a vez não girou");

  const ger = textoAnuncie(
    { status: "ok", atendimento_id: "a", tipo: "indicacao_corretor", anunciar: { papel: "gerente", nome: "Lima" }, especialista: "Paula", encontrado_na_carteira: true },
    "Duda",
  );
  assert.deepEqual(ger.quem[0], { papel: "Gerente", nome: "Lima" });
  assert.equal(ger.linha, "Indicação de Duda · quem indicou não está no stand · já estava na carteira");
  assert.equal(ger.aviso, null);

  const criado = textoAnuncie({ status: "ok", atendimento_id: "a", tipo: "indicacao_corretor", anunciar: { papel: "corretor", nome: "Duda" }, encontrado_na_carteira: false });
  assert.match(criado.aviso ?? "", /Não estava na carteira/);

  const ninguem = textoAnuncie({ status: "ok", atendimento_id: "a", tipo: "indicacao_corretor", encontrado_na_carteira: true, aviso: "ninguem_da_equipe" });
  assert.deepEqual(ninguem.quem, []);
  assert.match(ninguem.aviso ?? "", /Ninguém da equipe/);

  const parc = textoAnuncie({ status: "ok", atendimento_id: "a", tipo: "indicacao_parceiro", anunciar: { papel: "parceiro", nome: "Ana Silva" }, gerente: "Rocha", especialista: "Paula" });
  assert.deepEqual(parc.quem[0], { papel: "Parceiro", nome: "Ana Silva" });
  assert.equal(parc.linha, "Indicação de parceiro · cliente enviado ao gerente Rocha");

  const ret = textoAnuncie({ status: "ok", atendimento_id: "a", tipo: "retorno", anunciar: { papel: "corretor", nome: "Tavinho" }, ultimo_especialista: "Sueli", especialista_da_vez: "Marina" });
  assert.equal(ret.quem.length, 1, "no retorno o especialista não gira");
  assert.equal(ret.linha, "Retorno · especialista do último atendimento: Sueli · último da vez: Marina");
});

test("avisos e erros em texto de tela", () => {
  assert.equal(textoConfirmar({ status: "confirmar", aviso: "repetido_hoje", hora: "10h02" }), "! Esse telefone já foi registrado hoje às 10h02. Registrar de novo?");
  assert.equal(textoConfirmar({ status: "confirmar", aviso: "outra_carteira" }), "! Esse cliente já é de outro corretor. Confirme se é retorno.");
  assert.equal(erroRecepcao({ message: "fora_do_horario" }), "Pôr na vez só abre das 8h45 às 9h15 e das 13h45 às 14h15.");
  assert.equal(erroRecepcao({ message: "outra coisa" }), null);
});

test("busca de pessoas: apelido primeiro, sem acento, só do papel", () => {
  const p = (apelido: string | null, nome: string, papel: "corretor" | "especialista" = "corretor"): Pessoa => ({
    papel,
    id: nome,
    nome,
    apelido,
    equipe: null,
    gerente_id: null,
  });
  const pessoas = [p("Duda", "Eduarda Lima"), p("Dudu", "Eduardo Reis"), p("Rê", "Renata Dias"), p(null, "Marina", "especialista")];
  assert.deepEqual(buscarPessoas(pessoas, "du", "corretor").map((x) => x.apelido), ["Duda", "Dudu"]);
  assert.deepEqual(buscarPessoas(pessoas, "re", "corretor").map((x) => x.apelido), ["Rê", "Dudu"]);
  assert.deepEqual(buscarPessoas(pessoas, "lima", "corretor").map((x) => x.apelido), ["Duda"]);
  assert.deepEqual(buscarPessoas(pessoas, "mar", "corretor"), []);
  assert.deepEqual(buscarPessoas(pessoas, "mar", "especialista").map((x) => x.nome), ["Marina"]);
  assert.deepEqual(buscarPessoas(pessoas, "  ", "corretor"), []);
});

test("painel: clientes do stand por corretor do vínculo, sem os desfeitos e fora do período", async () => {
  const { contarStand, somarStand } = await import("./recepcao.ts");
  const a = (corretor: string | null, tipo: "novo" | "indicacao_corretor" | "indicacao_parceiro" | "retorno", hhmm = "10:00", extra = {}) => ({
    corretor_id: corretor, anunciado_id: corretor, anunciado_papel: "corretor" as const, tipo, status: "ativo" as const,
    registrado_em: `2026-11-05T${hhmm}:00-03:00`, ...extra,
  });
  const r = contarStand(
    [
      a("beto", "novo"), a("beto", "indicacao_corretor"), a("beto", "retorno"), a(null, "indicacao_parceiro"),
      a("beto", "novo", "11:00", { status: "cancelado" }), a("beto", "novo", "23:59"), a("beto", "novo", "08:00"),
      a("duda", "indicacao_corretor", "10:00", { anunciado_id: "beto", anunciado_papel: "colega" }),
    ],
    { ini: new Date("2026-11-05T09:00:00-03:00"), fim: new Date("2026-11-05T23:00:00-03:00") },
  );
  assert.deepEqual(r.get("beto"), { clientes: 3, novos: 1, indicacoes: 1, retornos: 1, atendeuDeOutro: 1 });
  assert.deepEqual(r.get("duda"), { clientes: 1, novos: 0, indicacoes: 1, retornos: 0, atendeuDeOutro: 0 });
  assert.equal(somarStand([...r.values()]).clientes, 4);
});

test("relatório do stand: por tipo, como conheceu, empreendimento e pessoas, filtrando o stand", async () => {
  const { resumoStand } = await import("./recepcao.ts");
  const a = (stand: string, tipo: "novo" | "indicacao_corretor" | "indicacao_parceiro" | "retorno", extra = {}) => ({
    plantao_id: stand, tipo, antes_da_vez: false, midias: ["passagem"], empreendimento: "Life", corretor_id: "beto",
    especialista_id: "marina", parceiro_id: null, gerente_id: null, status: "ativo" as const, registrado_em: "2026-11-05T10:00:00-03:00", ...extra,
  });
  const xs = [
    a("mz", "novo", { midias: ["passagem", "instagram"] }),
    a("mz", "novo", { antes_da_vez: true, empreendimento: null }),
    a("mz", "indicacao_parceiro", { corretor_id: null, parceiro_id: "ana", midias: [] }),
    a("mz", "retorno", { status: "cancelado" }),
    a("easy", "novo", { corretor_id: "duda" }),
  ];
  const per = { ini: new Date("2026-11-05T00:00:00-03:00"), fim: new Date("2026-11-06T00:00:00-03:00") };
  const mz = resumoStand(xs, per, "mz");
  assert.equal(mz.total, 3);
  assert.deepEqual(mz.tipos.map((t) => t.n), [2, 0, 1, 0]);
  assert.equal(mz.antesDaVez, 1);
  assert.equal(mz.semMidia, 1);
  assert.deepEqual(mz.midias, [{ chave: "passagem", n: 2 }, { chave: "instagram", n: 1 }]);
  assert.deepEqual(mz.empreendimentos, [{ chave: "Life", n: 2 }, { chave: "–", n: 1 }]);
  assert.deepEqual(mz.corretores, [{ chave: "beto", n: 2 }]);
  assert.deepEqual(mz.parceiros, [{ chave: "ana", n: 1 }]);
  assert.equal(resumoStand(xs, per).total, 4, "todos os stands");
});
