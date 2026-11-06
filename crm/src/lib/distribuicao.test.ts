import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NAO_MUDA,
  SEM_DESEMPENHO,
  botaoDoEstado,
  chaveInativa,
  chavePrimeiraVez,
  deveMandarSinal,
  distancia,
  hora,
  inicioDoDiaSP,
  linhaDecisao,
  linhaDoStand,
  linhaVez,
  linhaVoce,
  mostraBotao,
  mostraPrimeiraVez,
  motivoCurto,
  nomeCurtoLead,
  recortarFila,
  relativo,
  resultadoDoErroGeo,
  resumoFila,
  resumoProdutos,
  situacaoLonga,
  textoCheckin,
  textoComoCalculado,
  textoEscopo,
  textoMudanca,
  textoPosicao,
  usaSinal,
  type ComoCalculado,
  type ConfigDistribuicao,
  type MeuEstado,
} from "./distribuicao.ts";

const chaves = { exigir_checkin: true, sinal: true, plantao: true, pesos: true, transparencia: true };
const base: MeuEstado = {
  recebe: true,
  ligada: true,
  modo: "equipe",
  chaves,
  no_horario: true,
  participa: true,
  recebendo: true,
  pausado_ate: null,
  situacao: "apto",
  na_fila: true,
  desde: null,
  presenca: { origem: "checkin", estado: "presente", plantao: "Marco Zero", desde: "2026-11-06T12:04:00Z", checkin_aberto: true },
  perguntar_saida: false,
  posicao: 3,
  total: 6,
  escopo: "equipe",
  equipe_nome: "Equipe Norte",
  faixa: "media",
};

test("hora e dia em São Paulo", () => {
  assert.equal(hora("2026-11-06T12:04:00Z"), "9h04");
  assert.equal(hora("2026-11-06T13:00:00Z"), "10h");
  assert.equal(hora(null), "");
  assert.equal(inicioDoDiaSP(new Date("2026-11-07T01:30:00Z")), "2026-11-06T03:00:00.000Z");
  assert.equal(chavePrimeiraVez(new Date("2026-11-07T01:30:00Z")), "mbigucci-distribuicao-dia-2026-11-06");
});

test("distância e nome curto", () => {
  assert.equal(distancia(480.4), "480 m");
  assert.equal(distancia(1234), "1,2 km");
  assert.equal(nomeCurtoLead("Lucas Ferreira da Silva"), "Lucas S.");
  assert.equal(nomeCurtoLead("Ana"), "Ana");
});

test("o botão aparece só com a distribuição ligada, quem recebe e fora do modo só gerentes", () => {
  assert.equal(mostraBotao(base), true);
  assert.equal(mostraBotao({ ...base, ligada: false }), false);
  assert.equal(mostraBotao({ ...base, modo: "gerentes" }), false);
  assert.equal(mostraBotao({ recebe: false, ligada: true, modo: "equipe" }), false);
  assert.equal(mostraBotao(null), false);
});

test("estados do cabeçalho (tabela 13.1)", () => {
  assert.deepEqual(
    [botaoDoEstado({ ...base, situacao: "desligado" }).rotulo, botaoDoEstado({ ...base, situacao: "desligado" }).tom],
    ["Receber leads", "red"],
  );
  assert.deepEqual(botaoDoEstado({ ...base, situacao: "desligado" }).acoes, ["checkin", "ligar"]);
  assert.equal(botaoDoEstado({ ...base, situacao: "sem_checkin" }).rotulo, "! Faça check-in");
  const rec = botaoDoEstado(base);
  assert.equal(rec.rotulo, "✓ Recebendo");
  assert.deepEqual(rec.acoes, ["visita_sair", "checkout", "pausar", "desligar"]);
  assert.equal(botaoDoEstado({ ...base, presenca: { ...base.presenca!, origem: "recepcao", checkin_aberto: false } }).rotulo, "✓ Na vez do stand");
  assert.equal(botaoDoEstado({ ...base, no_horario: false }).rotulo, "✓ De plantão");
  assert.equal(botaoDoEstado({ ...base, situacao: "fora_do_stand" }).rotulo, "! Fora do stand");
  assert.deepEqual(botaoDoEstado({ ...base, situacao: "fora_do_stand" }).acoes[0], "visita_voltar");
  // Saída marcada pela recepção: sem check-in para voltar, oferece o check-in.
  assert.deepEqual(
    botaoDoEstado({ ...base, situacao: "fora_do_stand", presenca: { ...base.presenca!, origem: "recepcao", checkin_aberto: false } }).acoes[0],
    "checkin",
  );
  assert.equal(botaoDoEstado({ ...base, situacao: "visita" }).rotulo, "→ Em visita");
  assert.equal(botaoDoEstado({ ...base, situacao: "sem_sinal" }).linha, "Abra o Vendas no stand para voltar a receber.");
  assert.equal(botaoDoEstado({ ...base, situacao: "pausa", pausado_ate: "2026-11-12T15:00:00Z" }).rotulo, "– Pausa até 12/11");
  assert.equal(botaoDoEstado({ ...base, situacao: "pausa", pausado_ate: "sem_data" }).rotulo, "– Pausa");
  assert.equal(botaoDoEstado({ ...base, situacao: "fora_gerente" }).linha, "Seu gerente tirou você da distribuição.");
  assert.deepEqual(botaoDoEstado({ ...base, situacao: "fora_gerente" }).acoes, []);
});

test("check-in desligado: direto de Receber leads a Recebendo, sem Opções de stand", () => {
  const sem = { ...base, chaves: { ...chaves, exigir_checkin: false }, presenca: { ...base.presenca!, checkin_aberto: false } };
  assert.deepEqual(botaoDoEstado({ ...sem, situacao: "desligado" }).acoes, ["ligar"]);
  assert.deepEqual(botaoDoEstado(sem).acoes, ["pausar", "desligar"]);
  assert.equal(linhaDoStand(sem), null);
  assert.equal(linhaDoStand(base), "Marco Zero · check-in 9h04");
});

test("posição some sem transparência", () => {
  assert.equal(textoPosicao(base), "3º na fila");
  assert.equal(textoPosicao(base, true), "3º");
  assert.equal(textoPosicao({ ...base, chaves: { ...chaves, transparencia: false } }), null);
  assert.equal(textoPosicao({ ...base, posicao: null }), null);
});

test("primeira vez do dia: só uma vez, só desligado ou sem check-in", () => {
  assert.equal(mostraPrimeiraVez({ ...base, situacao: "desligado" }, false), true);
  assert.equal(mostraPrimeiraVez({ ...base, situacao: "desligado" }, true), false);
  assert.equal(mostraPrimeiraVez({ ...base, situacao: "sem_checkin" }, false), true);
  assert.equal(mostraPrimeiraVez(base, false), false);
  assert.equal(mostraPrimeiraVez({ ...base, situacao: "desligado", modo: "gerentes" }, false), false);
});

test("sinal: só com check-in aberto e as duas chaves; a cada 10 min", () => {
  assert.equal(usaSinal(base), true);
  assert.equal(usaSinal({ ...base, chaves: { ...chaves, sinal: false } }), false);
  assert.equal(usaSinal({ ...base, chaves: { ...chaves, exigir_checkin: false } }), false);
  assert.equal(usaSinal({ ...base, presenca: { ...base.presenca!, checkin_aberto: false } }), false);
  assert.equal(deveMandarSinal(null, 0, false), true);
  assert.equal(deveMandarSinal(0, 9 * 60_000, false), false);
  assert.equal(deveMandarSinal(0, 10 * 60_000, false), true);
  assert.equal(deveMandarSinal(0, 61_000, true), true);
  assert.equal(deveMandarSinal(0, 30_000, true), false);
});

test("mensagens do check-in", () => {
  assert.equal(textoCheckin({ resultado: "dentro", plantao: "Marco Zero", hora: "2026-11-06T12:04:00Z" }).texto, "✓ Check-in no Marco Zero, 9h04");
  assert.equal(textoCheckin({ resultado: "fora", dist_m: 480 }).texto, "! A 480 m do stand. Chegue mais perto.");
  assert.equal(textoCheckin({ resultado: "incerto" }).texto, "! Localização imprecisa. Tente num lugar aberto.");
  assert.equal(textoCheckin(resultadoDoErroGeo(1)).texto, "! Localização bloqueada. Libere no navegador.");
  assert.equal(resultadoDoErroGeo(3).resultado, "incerto");
  assert.equal(textoCheckin({ resultado: "aguarde" }).ok, false);
});

test("escopo, faixa e linha do corretor", () => {
  assert.equal(textoEscopo("equipe", "Equipe Norte"), "Sua equipe · Equipe Norte");
  assert.equal(textoEscopo("empresa", "Equipe Norte"), "Empresa toda");
  assert.equal(textoEscopo("equipe", "Equipe Sul", false), "Equipe Sul");
  assert.equal(linhaVoce(base, true), "Você: 3º · na média");
  assert.equal(linhaVoce(base, false), "Você: 3º");
  assert.equal(linhaVoce({ ...base, escopo: "empresa", posicao: 12, total: 38 }, true), "Você: 12º de 38 · na média");
});

test("motivos de pulo e linhas do Hoje", () => {
  for (const m of ["nao_atende", "prazo_estourado", "ja_teve", "fora_do_stand", "sem_sinal", "visita", "represado_pendente"])
    assert.ok(!motivoCurto(m).includes("_"), m);
  assert.equal(linhaVez({ tipo: "recebeu", quando: "", lead_id: "1", lead_nome: "Ana Souza", manual: false }).texto, "✓ Recebeu Ana Souza");
  const p = linhaVez({ tipo: "pulado", quando: "", motivo: "fora_do_stand", mantem_posicao: true });
  assert.equal(p.texto, "→ Pulado: fora do stand");
  assert.match(p.detalhe, /manteve a posição/);
  assert.equal(linhaVez({ tipo: "fim_da_fila", quando: "", lead_nome: null }).texto, "! Fim da fila: prazo");
});

test("situação, resumo e recorte da fila", () => {
  assert.equal(situacaoLonga("apto").texto, "✓ Apto");
  assert.equal(situacaoLonga("fora_do_stand", "2026-11-06T13:40:00Z").texto, "! Fora do stand 10h40");
  assert.equal(resumoFila([{ situacao: "apto" }, { situacao: "apto" }, { situacao: "fora_do_stand" }, { situacao: "pausa" }]), "2 aptos · 1 fora · 1 pausa");
  const fila = Array.from({ length: 20 }, (_, i) => ({ posicao: i + 1, eu: i === 11 }));
  const r = recortarFila(fila);
  assert.deepEqual(
    r.map((x) => ("pulo" in x ? `…${x.pulo}` : x.posicao)),
    [1, 2, "…8", 11, 12, 13],
  );
  assert.equal(recortarFila(fila.slice(0, 5).map((x, i) => ({ ...x, eu: i === 2 }))).length, 5);
});

test("última decisão", () => {
  const d = linhaDecisao({
    quando: "",
    lead_id: "1",
    lead_nome: "Lucas Ferreira",
    empreendimento: "Easy",
    motivo_entrada: "nova",
    resultado: "recebeu",
    recebeu: "Felipa",
    pulados: [{ apelido: "Diego", motivo: "fora_do_stand" }],
  });
  assert.equal(d.titulo, "Lucas F. · Easy → ✓ Felipa");
  assert.equal(d.pulados, "Pulados: Diego (fora do stand)");
});

const calc: ComoCalculado = {
  pesos: true,
  calculado: true,
  semana: "2026-11-02",
  respondidos: 18,
  total: 23,
  followup_pct: 0.85,
  plantao_rel: 1.12,
  crm_rel: 1.04,
  total_rel: 1.08,
  faixa: "media",
  novo: false,
};

test("como é calculado: o texto aprovado com os números", () => {
  const t = textoComoCalculado(calc);
  assert.equal(
    t[0],
    "Nota do CRM: nos últimos 30 dias você respondeu 18 de 23 leads da empresa em até 15 min (78%) e, em média, 85% da sua carteira ficou com o follow-up em dia.",
  );
  assert.equal(t[1], "Nota do plantão: sua atividade no plantão foi 12% acima da média da empresa.");
  assert.equal(
    t[2],
    "Cada nota vale metade. No total você ficou 8% acima da média, então está na média (até 10% acima ou abaixo é na média). Recalculado toda segunda.",
  );
  assert.equal(t.at(-1), NAO_MUDA);
  assert.equal(NAO_MUDA, "Este cálculo não muda seus pontos nem sua verba.");
});

test("como é calculado: casos de borda", () => {
  assert.deepEqual(textoComoCalculado({ ...calc, pesos: false }), [SEM_DESEMPENHO, NAO_MUDA]);
  assert.match(textoComoCalculado({ ...calc, calculado: false })[0], /fica na média/);
  assert.match(textoComoCalculado({ ...calc, novo: true })[0], /menos de 30 dias/);
  assert.match(textoComoCalculado({ ...calc, total: 0, respondidos: 0 })[0], /não recebeu leads da empresa/);
  assert.ok(!textoComoCalculado({ ...calc, followup_pct: null })[0].includes("follow-up"));
  assert.match(textoComoCalculado({ ...calc, plantao_rel: 1 })[1], /ficou igual à média da empresa/);
  assert.match(textoComoCalculado({ ...calc, total_rel: 0.85, faixa: "abaixo" })[2], /15% abaixo da média, então está abaixo da média/);
  const g = textoComoCalculado(calc, "Carla");
  assert.match(g[0], /Carla respondeu 18 de 23/);
  assert.match(g[0], /da carteira de Carla/);
  assert.match(g[1], /a atividade de Carla/);
  assert.equal(relativo(0.999), "igual à média");
  // Nunca diz que muda pontos ou verba.
  for (const linha of [...textoComoCalculado(calc), ...textoComoCalculado(calc, "Carla")])
    assert.ok(!/muda (seus )?pontos|muda.*verba/.test(linha) || linha === NAO_MUDA, linha);
});

test("chaves, histórico e produtos", () => {
  const cfg = { exigir_checkin: false } as ConfigDistribuicao;
  assert.equal(chaveInativa(cfg, "sinal"), "Só vale com o check-in ligado");
  assert.equal(chaveInativa({ ...cfg, exigir_checkin: true }, "sinal"), null);
  assert.equal(textoMudanca({ quando: "", chave: "pesos", de: "true", para: "false", quem: null }), "Peso por desempenho: ligada → desligada");
  assert.equal(textoMudanca({ quando: "", chave: "modo", de: "equipe", para: "direto", quem: null }), "Modo: Equipe e depois corretor → Direto ao corretor");
  assert.equal(
    resumoProdutos([
      { id: "1", nome: "A", atende: true },
      { id: "2", nome: "B", atende: false },
    ]),
    "Todos menos 1",
  );
  assert.equal(resumoProdutos([{ id: "1", nome: "A", atende: true }]), "Todos");
});
