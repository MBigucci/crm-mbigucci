// Testes dos textos, da validação do editor e do simulador da tela Direcionador.
// Nomes de destino fictícios. Rode com: node --test marketing/src/lib/telas.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agoraSP,
  avisoHorario,
  diasTxt,
  distTxt,
  enderecoTxt,
  horaTxt,
  partesDoForm,
  simular,
  validarRegra,
  type ConfigTela,
  type DestinoTela,
} from "./telas.ts";

const destino = (d: Partial<DestinoTela> & Pick<DestinoTela, "id" | "nome">): DestinoTela => ({
  tipo: "externo", modo: "email", registrar_envios: false, limite_dia: null, ativo: true, hoje: 0, endereco: null, ...d,
});
const DESTINOS = [
  destino({ id: "v", nome: "Base360 Vendas", tipo: "vendas", modo: null }),
  destino({ id: "a", nome: "Destino A (fictício)", limite_dia: 20 }),
  destino({ id: "b", nome: "Parceiro B (fictício)", modo: "porta", registrar_envios: true }),
];
const CONFIG: ConfigTela = {
  ativo: true,
  hoje: "2026-11-07",
  destinos: DESTINOS,
  fontes: [{ slug: "zap", nome: "ZAP Imóveis", ativa: true }, { slug: "site", nome: "Site MBigucci", ativa: true }],
  regras: [
    { id: "r1", nome: "Site, horário comercial", ativa: true, ordem: 1, produtos: ["p1"], fontes: ["site"], dias: [1, 2, 3, 4, 5], hora_inicio: "09:00", hora_fim: "18:00",
      partes: [{ destino_id: "v", porcentagem: 100, enviados: 0 }] },
    { id: "r2", nome: "Fim de semana, portais", ativa: true, ordem: 2, produtos: [], fontes: ["zap"], dias: [0, 6], hora_inicio: "00:00", hora_fim: "00:00",
      partes: [{ destino_id: "a", porcentagem: 70, enviados: 7 }, { destino_id: "v", porcentagem: 30, enviados: 2 }] },
    { id: "r3", nome: "Noite", ativa: false, ordem: 3, produtos: [], fontes: [], dias: [1, 2, 3, 4, 5], hora_inicio: "19:00", hora_fim: "09:00",
      partes: [{ destino_id: "b", porcentagem: 100, enviados: 0 }] },
  ],
};
const PRODUTOS = [{ id: "p1", nome: "Marco Zero Prime" }];

test("textos das regras", () => {
  assert.equal(diasTxt([0, 1, 2, 3, 4, 5, 6]), "Todos os dias");
  assert.equal(diasTxt([5, 1, 2, 3, 4]), "Seg a sex");
  assert.equal(diasTxt([6, 0]), "Sáb e dom");
  assert.equal(diasTxt([1, 3]), "Seg, Qua");
  assert.equal(horaTxt({ hora_inicio: "00:00", hora_fim: "00:00" }), "Dia inteiro");
  assert.equal(horaTxt({ hora_inicio: "09:00", hora_fim: "18:30" }), "9h às 18h30");
  assert.equal(horaTxt({ hora_inicio: "19:00", hora_fim: "09:00" }), "19h às 9h do dia seguinte");
  assert.equal(distTxt([{ destino_id: "v", porcentagem: 100 }], DESTINOS), "→ Base360 Vendas");
  assert.equal(distTxt(CONFIG.regras[1].partes, DESTINOS), "→ 70% Destino A (fictício) · 30% Base360 Vendas");
  assert.equal(distTxt([{ destino_id: "sumiu", porcentagem: 100 }], DESTINOS), "→ Destino excluído");
});

test("endereço: só o mascarado que o banco devolve", () => {
  assert.equal(enderecoTxt({ modo: "email", endereco: null }), "Sem endereço. Edite para preencher");
  assert.equal(enderecoTxt({ modo: "email", endereco: { email: "c••••@e••••.com.br" } }), "c••••@e••••.com.br");
  assert.equal(enderecoTxt({ modo: "porta", endereco: { url: "https://l••••.com.br/••••", chave_definida: true } }), "https://l••••.com.br/•••• · chave guardada");
});

test("editor de regra: os erros do protótipo, um de cada vez", () => {
  const ok = { nome: "X", dias: [1], diaInteiro: false, hora_inicio: "09:00", hora_fim: "18:00", pcts: { a: 70, v: 30 } };
  assert.equal(validarRegra(ok), null);
  assert.match(validarRegra({ ...ok, nome: " " })!, /^✕ Dê um nome/);
  assert.match(validarRegra({ ...ok, dias: [] })!, /pelo menos um dia/);
  assert.match(validarRegra({ ...ok, hora_fim: "" })!, /duas horas/);
  assert.match(validarRegra({ ...ok, hora_fim: "09:00" })!, /Início e fim iguais/);
  assert.equal(validarRegra({ ...ok, hora_fim: "09:00", diaInteiro: true }), null);
  assert.equal(validarRegra({ ...ok, pcts: { a: 70, v: 20 } }), "✕ As partes de Mandar para precisam somar 100% (hoje somam 90%).");
  assert.match(validarRegra({ ...ok, pcts: { a: 70.5, v: 29.5 } })!, /sem casas decimais/);
  assert.equal(avisoHorario({ diaInteiro: false, hora_inicio: "19:00", hora_fim: "09:00" }), "Vira a meia-noite: vale das 19h do dia marcado até as 9h do dia seguinte.");
  assert.deepEqual(partesDoForm({ v: 30, a: 70, b: 0 }, DESTINOS), [{ destino_id: "v", porcentagem: 30 }, { destino_id: "a", porcentagem: 70 }]);
  // Editar não muda a ordem das partes (ela decide o empate): A continua antes do Vendas, e a nova vem no fim.
  assert.deepEqual(partesDoForm({ v: 20, a: 70, b: 10 }, DESTINOS, ["a", "v"]).map((p) => p.destino_id), ["a", "v", "b"]);
});

test("simulador: responde às regras como o protótipo, com os contadores do banco", () => {
  const sab = simular(CONFIG, PRODUTOS, { produto_id: "p1", fonte: "zap", dia: 6, hora: "10:30" });
  assert.equal(sab.quem, "Um lead do Marco Zero Prime, de ZAP Imóveis, sábado, 10h30, vai para");
  assert.equal(sab.destino, "→ 70% Destino A (fictício) · 30% Base360 Vendas");
  assert.equal(sab.externo, true);
  // 7/70 = 0,1 contra 2/30 = 0,067: o próximo vai para o Vendas.
  assert.match(sab.por, /^Pela regra 2, Fim de semana, portais\. Pelo contador de agora, o próximo vai para Base360 Vendas\./);
  assert.match(sab.por, /Passou de 20 leads no dia em Destino A/);
  assert.deepEqual(sab.passos, [
    { casou: false, texto: "1. Site, horário comercial: outra fonte." },
    { casou: true, texto: "2. Fim de semana, portais: casou e decidiu." },
    { casou: false, texto: "3. Noite: não lida." },
  ]);
  const seg = simular(CONFIG, PRODUTOS, { produto_id: null, fonte: "site", dia: 1, hora: "22:00" });
  assert.equal(seg.destino, "→ Base360 Vendas");
  assert.equal(seg.por, "Nenhuma regra ligada casou.");
  assert.deepEqual(seg.passos.map((p) => p.texto), [
    "1. Site, horário comercial: produto não reconhecido.",
    "2. Fim de semana, portais: outra fonte.",
    "3. Noite: desligada.",
  ]);
  const off = simular({ ...CONFIG, ativo: false }, PRODUTOS, { produto_id: "p1", fonte: "zap", dia: 6, hora: "10:30" });
  assert.deepEqual([off.destino, off.por, off.passos.length], ["→ Base360 Vendas", "A chave geral está desligada.", 0]);
  // Destino no limite de hoje.
  const cheio = { ...CONFIG, destinos: DESTINOS.map((d) => (d.id === "a" ? { ...d, hoje: 20 } : d)), regras: CONFIG.regras.map((r) => r.id === "r2" ? { ...r, partes: r.partes.map((p) => ({ ...p, enviados: 0 })) } : r) };
  assert.match(simular(cheio, PRODUTOS, { produto_id: null, fonte: "zap", dia: 0, hora: "08:00" }).por, /passou do limite de hoje/);
});

test("usar agora: dia e hora de São Paulo", () => {
  assert.deepEqual(agoraSP(new Date("2026-11-07T13:30:00Z")), { dia: 6, hora: "10:30" });
});
