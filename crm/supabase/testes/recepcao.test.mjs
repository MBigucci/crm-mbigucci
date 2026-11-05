// Teste da recepção do stand, parte 1 (recepcao.sql): stands, especialistas,
// apelido, a vez do dia (pôr na vez, saiu, voltou, passar a vez, não está mais,
// desfazer), a janela das 8h45–9h15 e 13h45–14h15 e quem lê o quê.
// Postgres local (PGlite), com auth.users, auth.uid() e os papéis do Supabase.
// A hora é controlada: private.recepcao_agora() lê a configuração teste.agora.
// Rode com: node --test supabase/testes/recepcao.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const recepcao = readFileSync(new URL("../recepcao.sql", import.meta.url), "utf8");
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const GG = 1, GA = 2, GB = 3, CA = 4, CA2 = 5, CB = 6, CB2 = 7, REC = 8, OP = 9, SEMAP = 10;

const linhas = async (sql, p) => (await db.query(sql, p)).rows;

/** Hora de São Paulo do "agora" do banco, no dia 04/11/2026 (ou outro). */
async function hora(hhmm, dia = "2026-11-04") {
  await db.query(`select set_config('teste.agora', $1, false)`, [`${dia} ${hhmm}:00-03`]);
}
const RELOGIO = `
  create or replace function private.recepcao_agora() returns timestamptz language sql stable set search_path = ''
  as $$ select coalesce(nullif(current_setting('teste.agora', true), '')::timestamptz, now()) $$;`;

async function como(n, fn) {
  await db.exec(`set role ${n ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${n ? id(n) : ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const rpc = (n, sql, p) => como(n, async () => (await db.query(sql, p)).rows);
async function falha(n, sql, trecho, p) {
  await assert.rejects(como(n, () => db.query(sql, p)), (e) => {
    if (trecho && !String(e.message).includes(trecho)) throw new Error(`erro inesperado: ${e.message}`);
    return true;
  });
}

let MZ, EASY, ESP1, ESP2;
const porNaVez = (n, plantao, turno, papel, pessoa, esp, pid = randomUUID()) =>
  rpc(n, `select public.recepcao_por_na_vez($1, $2, $3, $4, $5, $6) as r`, [pid, plantao, turno, papel, pessoa, esp])
    .then((r) => r[0].r);
const evento = (n, presenca, tipo, eid = randomUUID()) =>
  rpc(n, `select public.recepcao_evento($1, $2, $3) as r`, [eid, presenca, tipo]).then((r) => ({ ...r[0].r, eid }));
const dia = (n, plantao) => rpc(n, `select * from public.recepcao_dia($1)`, [plantao]);
const daVez = async (n, plantao, turno = "manha", papel = "corretor") =>
  (await dia(n, plantao)).find((x) => x.turno === turno && x.papel === papel && x.da_vez)?.apelido ?? null;

test("prepara o banco: schema e recepcao.sql três vezes (idempotente)", async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  await db.exec(schema);
  for (let i = 0; i < 3; i++) await db.exec(recepcao);
  await db.exec(RELOGIO);

  const pessoas = [[GG, "Felipe"], [GA, "Gerente A"], [GB, "Gerente B"], [CA, "Otávio Souza"], [CA2, "Eduarda Lima"],
                   [CB, "Roberto Reis"], [CB2, "Renata Dias"], [REC, "Carla"], [OP, "Operacional"], [SEMAP, "Sem Apelido"]];
  for (const [n, nome] of pessoas)
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `u${n}@x.com`, { nome }]);
  await db.exec(`
    update public.profiles set perfil = 'gerente_geral', ativo = true where id = '${id(GG)}';
    update public.profiles set perfil = 'gerente', ativo = true where id in ('${id(GA)}', '${id(GB)}');
    update public.profiles set perfil = 'recepcao', ativo = true where id = '${id(REC)}';
    update public.profiles set perfil = 'operacional', ativo = true where id = '${id(OP)}';
    insert into public.teams (nome, gerente_id) values ('A', '${id(GA)}'), ('B', '${id(GB)}');
    update public.profiles set apelido = 'Tavinho' where id = '${id(CA)}';
    update public.profiles set apelido = 'Duda' where id = '${id(CA2)}';
    update public.profiles set apelido = 'Beto', creci = ' 123456-F ' where id = '${id(CB)}';
    update public.profiles set apelido = 'Rê' where id = '${id(CB2)}';
    update public.profiles set ativo = true, equipe_id = (select id from public.teams where nome = 'A') where id in ('${id(CA)}', '${id(CA2)}');
    update public.profiles set ativo = true, equipe_id = (select id from public.teams where nome = 'B') where id in ('${id(CB)}', '${id(CB2)}');
    insert into public.especialistas (nome) values ('Marina'), ('Paula');
    update public.plantoes set tem_especialista = false where nome = 'Easy';
  `);
  [MZ, EASY] = (await linhas(`select id from public.plantoes where nome in ('Marco Zero', 'Easy') order by ordem`)).map((r) => r.id);
  [ESP1, ESP2] = (await linhas(`select id from public.especialistas order by nome`)).map((r) => r.id);

  assert.equal((await linhas(`select count(*)::int n from public.plantoes`))[0].n, 4, "os 4 stands, sem duplicar");
  const perms = await linhas(`select perfil, permissao from public.role_permissions where permissao like 'plant%' and permissao <> 'plantao.registrar' order by 1, 2`);
  assert.deepEqual(perms.map((r) => `${r.perfil}:${r.permissao}`), [
    "gerente:plantao.atendimentos_ver", "operacional:plantao.atendimentos", "operacional:plantao.atendimentos_ver",
    "operacional:plantao.confirmar",
    "operacional:plantoes.gerenciar", "recepcao:plantao.atendimentos", "recepcao:plantao.confirmar"]);
});

test("apelido: obrigatório para ativar corretor, único entre os ativos, CRECI limpo", async () => {
  await assert.rejects(
    db.exec(`update public.profiles set ativo = true, equipe_id = (select id from public.teams where nome = 'A') where id = '${id(SEMAP)}'`),
    /precisa de apelido/);
  await assert.rejects(db.exec(`update public.profiles set apelido = 'duda' where id = '${id(SEMAP)}'; update public.profiles set ativo = true, equipe_id = (select id from public.teams where nome = 'A') where id = '${id(SEMAP)}'`),
    /profiles_apelido_ativo_unico/);
  await assert.rejects(db.exec(`update public.profiles set apelido = '  ' where id = '${id(CA)}'`), /precisa de apelido/);
  const [b] = await linhas(`select creci from public.profiles where id = $1`, [id(CB)]);
  assert.equal(b.creci, "123456-F");
  // O gerente geral edita o apelido pelo app (grant da coluna).
  await como(GG, () => db.exec(`update public.profiles set apelido = 'Tavinho' where id = '${id(CA)}'`));
});

test("pôr na vez: só na janela, na ordem, sem repetir e sem dois stands", async () => {
  await hora("08:40");
  await falha(REC, `select public.recepcao_por_na_vez($1, $2, 'manha', 'corretor', $3, null)`, "fora_do_horario", [randomUUID(), MZ, id(CA)]);
  await hora("09:15");
  await falha(REC, `select public.recepcao_por_na_vez($1, $2, 'manha', 'corretor', $3, null)`, "fora_do_horario", [randomUUID(), MZ, id(CA)]);
  await hora("08:45");
  // A tarde ainda está fechada de manhã.
  await falha(REC, `select public.recepcao_por_na_vez($1, $2, 'tarde', 'corretor', $3, null)`, "fora_do_horario", [randomUUID(), MZ, id(CA)]);

  const pid = randomUUID();
  assert.deepEqual(await porNaVez(REC, MZ, "manha", "corretor", id(CA), null, pid), { status: "ok", presenca_id: pid, ordem: 1 });
  assert.deepEqual(await porNaVez(REC, MZ, "manha", "corretor", id(CA), null, pid), { status: "ok", presenca_id: pid, ordem: 1 }, "mesmo envio");
  assert.equal((await porNaVez(REC, MZ, "manha", "corretor", id(CA), null)).status, "ja_na_vez");
  assert.equal((await porNaVez(REC, MZ, "manha", "corretor", id(CA2), null)).ordem, 2);
  await hora("09:14");
  assert.equal((await porNaVez(OP, MZ, "manha", "corretor", id(CB), null)).ordem, 3, "o operacional também põe");
  assert.equal((await porNaVez(REC, EASY, "manha", "corretor", id(CA), null)).status, "em_outro_stand");
  assert.equal((await porNaVez(REC, EASY, "manha", "corretor", id(CB2), null)).ordem, 1);

  // Especialistas: só no stand que tem.
  assert.equal((await porNaVez(REC, MZ, "manha", "especialista", null, ESP1)).ordem, 1);
  assert.equal((await porNaVez(REC, MZ, "manha", "especialista", null, ESP2)).ordem, 2);
  await falha(REC, `select public.recepcao_por_na_vez($1, $2, 'manha', 'especialista', null, $3)`, "sem_especialista", [randomUUID(), EASY, ESP1]);

  // Quem não pode, ou pessoa errada.
  for (const n of [CA, GA, 0])
    await falha(n, `select public.recepcao_por_na_vez($1, $2, 'manha', 'corretor', $3, null)`, n ? "sem_permissao" : "permission denied", [randomUUID(), MZ, id(CB2)]);
  await falha(REC, `select public.recepcao_por_na_vez($1, $2, 'manha', 'corretor', $3, null)`, "pessoa_invalida", [randomUUID(), MZ, id(GA)]);
  await falha(REC, `select public.recepcao_por_na_vez($1, $2, 'manha', 'corretor', $3, null)`, "pessoa_invalida", [randomUUID(), MZ, id(SEMAP)]);
  // Nada de escrever direto na tabela.
  await falha(REC, `insert into public.plantao_presencas (id, plantao_id, dia, turno, papel, pessoa_id, ordem)
    values (gen_random_uuid(), '${MZ}', '2026-11-04', 'manha', 'corretor', '${id(CB2)}', 9)`, "permission denied");
});

test("a vez: segue a ordem em círculo, pula quem saiu, passar a vez e recebeu", async () => {
  await hora("10:00");
  const d = await dia(REC, MZ);
  const pres = Object.fromEntries(d.filter((x) => x.papel === "corretor").map((x) => [x.apelido, x.presenca_id]));
  assert.equal(await daVez(REC, MZ), "Tavinho", "o primeiro da roleta");
  assert.equal(await daVez(REC, MZ, "manha", "especialista"), null, "especialista não tem apelido");
  assert.equal(d.find((x) => x.papel === "especialista" && x.da_vez).nome, "Marina");

  await falha(REC, `select public.recepcao_evento($1, $2, 'passou_vez')`, "vez_mudou", [randomUUID(), pres.Duda]);
  const pv = await evento(REC, pres.Tavinho, "passou_vez");
  assert.equal(await daVez(REC, MZ), "Duda");
  const saiu = await evento(REC, pres.Duda, "saida");
  assert.equal(await daVez(REC, MZ), "Beto", "Duda saiu: pula");
  await falha(REC, `select public.recepcao_evento($1, $2, 'saida')`, "estado_invalido", [randomUUID(), pres.Duda]);
  await falha(REC, `select public.recepcao_evento($1, $2, 'volta')`, "estado_invalido", [randomUUID(), pres.Beto]);

  // Beto recebe um cliente da vez (a parte 2 grava este evento no cadastro).
  await db.query(`insert into public.plantao_presenca_eventos (id, presenca_id, tipo) values ($1, $2, 'recebeu')`, [randomUUID(), pres.Beto]);
  assert.equal(await daVez(REC, MZ), "Tavinho", "em círculo, pulando Duda");
  await evento(REC, pres.Duda, "volta");
  assert.equal(await daVez(REC, MZ), "Tavinho", "voltar não fura a fila");
  await db.query(`insert into public.plantao_presenca_eventos (id, presenca_id, tipo) values ($1, $2, 'recebeu')`, [randomUUID(), pres.Tavinho]);
  assert.equal(await daVez(REC, MZ), "Duda");

  const linhaBeto = (await dia(REC, MZ)).find((x) => x.apelido === "Beto");
  assert.equal(linhaBeto.rodadas, 1);
  assert.equal(linhaBeto.estado, "presente");
  const linhaDuda = (await dia(REC, MZ)).find((x) => x.apelido === "Duda");
  assert.equal(linhaDuda.estado, "presente");
  assert.ok(linhaDuda.estado_em, "hora do Voltou");

  // Não está mais: sai da vez de vez.
  const enc = await evento(REC, pres.Duda, "encerrou");
  assert.equal(await daVez(REC, MZ), "Beto");
  await falha(REC, `select public.recepcao_evento($1, $2, 'volta')`, "estado_invalido", [randomUUID(), pres.Duda]);

  // Desfazer: só o último, e até 30 min.
  await falha(REC, `select public.recepcao_desfazer_evento($1)`, "nao_e_o_ultimo", [saiu.eid]);
  await falha(REC, `select public.recepcao_desfazer_evento($1)`, "nao_e_o_ultimo", [pv.eid]);
  await rpc(REC, `select public.recepcao_desfazer_evento($1)`, [enc.eid]);
  assert.equal(await daVez(REC, MZ), "Duda", "desfeito o Não está mais, Duda volta a ser da vez");
  await rpc(REC, `select public.recepcao_desfazer_evento($1)`, [enc.eid]); // repetir não quebra
  const s2 = await evento(REC, pres.Beto, "saida");
  await hora("10:31");
  await falha(REC, `select public.recepcao_desfazer_evento($1)`, "prazo_encerrado", [s2.eid]);
  await evento(REC, pres.Beto, "volta");

  // Repetir o mesmo evento (id do aparelho) não grava de novo.
  const e1 = await evento(REC, pres.Duda, "saida");
  await evento(REC, pres.Duda, "saida", e1.eid);
  assert.equal((await linhas(`select count(*)::int n from public.plantao_presenca_eventos where id = $1`, [e1.eid]))[0].n, 1);

  // Ninguém presente: nulo.
  const easy = (await dia(REC, EASY)).find((x) => x.apelido === "Rê");
  await evento(REC, easy.presenca_id, "saida");
  assert.equal(await daVez(REC, EASY), null);
});

test("tarde: janela das 13h45, turno atual e manhã e tarde", async () => {
  await hora("13:44");
  await falha(REC, `select public.recepcao_por_na_vez($1, $2, 'tarde', 'corretor', $3, null)`, "fora_do_horario", [randomUUID(), MZ, id(CA)]);
  await hora("13:50");
  const [t0] = await linhas(`select private.recepcao_turno_atual($1, 'corretor') t`, [MZ]);
  assert.equal(t0.t, "manha", "sem ninguém na tarde, vale a manhã");
  assert.equal((await porNaVez(REC, MZ, "tarde", "corretor", id(CA), null)).ordem, 1);
  const [t1] = await linhas(`select private.recepcao_turno_atual($1, 'corretor') t`, [MZ]);
  assert.equal(t1.t, "tarde");
  const tav = (await dia(REC, MZ)).filter((x) => x.apelido === "Tavinho");
  assert.equal(tav.length, 2);
  assert.ok(tav.every((x) => x.nos_dois_turnos), "Manhã e tarde");
  assert.equal(await daVez(REC, MZ, "tarde"), "Tavinho");
});

test("quem lê: recepção só hoje, corretor a própria, gerente a equipe, ninguém de fora", async () => {
  // Um dia anterior, gravado pelo SQL Editor.
  await db.query(`insert into public.plantao_presencas (id, plantao_id, dia, turno, papel, pessoa_id, ordem)
    values ($1, $2, '2026-11-03', 'manha', 'corretor', $3, 1)`, [randomUUID(), MZ, id(CB)]);
  const conta = async (n) => (await rpc(n, `select count(*)::int n from public.plantao_presencas`))[0].n;
  await hora("15:00");
  const hoje = (await linhas(`select count(*)::int n from public.plantao_presencas where dia = '2026-11-04'`))[0].n;
  assert.equal(await conta(REC), hoje, "recepção: só hoje");
  assert.equal(await conta(OP), hoje);
  assert.equal(await conta(GG), hoje + 1, "gerente geral: todos os dias");
  assert.equal(await conta(CA), 2, "corretor: as próprias (manhã e tarde)");
  assert.equal(await conta(GB), 3, "gerente B: Beto (hoje e ontem) e Rê");
  await falha(0, `select count(*) from public.plantao_presencas`, "permission denied");

  // No dia seguinte a recepção não vê mais nada de ontem.
  await hora("09:00", "2026-11-05");
  assert.equal(await conta(REC), 0);
  assert.deepEqual(await dia(REC, MZ), []);
  // E não registra evento em presença de outro dia.
  const [velha] = await linhas(`select id from public.plantao_presencas where dia = '2026-11-04' limit 1`);
  await falha(REC, `select public.recepcao_evento($1, $2, 'saida')`, "presenca_invalida", [randomUUID(), velha.id]);

  for (const n of [CA, GA]) {
    await falha(n, `select * from public.recepcao_dia($1)`, "sem_permissao", [MZ]);
    await falha(n, `select * from public.recepcao_pessoas()`, "sem_permissao");
  }
});

test("pessoas, stands e especialistas: leitura e configuração", async () => {
  const p = await rpc(REC, `select papel, nome, apelido, equipe from public.recepcao_pessoas()`);
  assert.deepEqual(p.filter((x) => x.papel === "corretor").map((x) => x.apelido).sort(), ["Beto", "Duda", "Rê", "Tavinho"]);
  assert.deepEqual(p.filter((x) => x.papel === "especialista").map((x) => x.nome), ["Marina", "Paula"]);
  assert.ok(!p.some((x) => x.nome === "Sem Apelido"), "inativo fora");

  // Operacional e gerente geral configuram; recepção e gerente não.
  await como(OP, () => db.exec(`update public.plantoes set tem_especialista = true where id = '${EASY}'`));
  assert.equal((await linhas(`select tem_especialista from public.plantoes where id = $1`, [EASY]))[0].tem_especialista, true);
  for (const n of [REC, GA]) {
    const r = await como(n, () => db.query(`update public.plantoes set tem_especialista = false where id = '${EASY}'`));
    assert.equal(r.affectedRows, 0, `não configura: ${n}`);
  }
  await como(GG, () => db.exec(`insert into public.especialistas (nome) values ('  Sueli ')`));
  assert.equal((await linhas(`select nome from public.especialistas where nome = 'Sueli'`)).length, 1, "nome limpo");
  await falha(REC, `insert into public.especialistas (nome) values ('Outra')`, "row-level security");
  await assert.rejects(db.exec(`insert into public.especialistas (nome) values ('marina')`), /especialistas_nome_ativo_unico/);
  assert.equal((await rpc(CA, `select count(*)::int n from public.especialistas`))[0].n, 0, "corretor não lê a lista");
  assert.equal((await rpc(CA, `select count(*)::int n from public.plantoes`))[0].n, 4, "todo ativo lê os stands");
});

// ---------------------------------------------------------------------
// Parte 2: o cliente do stand. Dia novo (06/11/2026), para começar limpo.
// ---------------------------------------------------------------------
const reg = (n, campos) => rpc(n, `select public.recepcao_registrar_cliente($1) as r`,
  [{ id: randomUUID(), plantao_id: MZ, midias: ["passagem"], veio_sozinho: true, ...campos }]).then((r) => r[0].r);
const DIA = "2026-11-06";
const presDe = async (apelido, papel = "corretor") =>
  (await dia(REC, MZ)).find((x) => x.papel === papel && (x.apelido === apelido || x.nome === apelido)).presenca_id;
const vezAgora = async () => {
  const d = await dia(REC, MZ);
  return {
    c: d.find((x) => x.turno === "manha" && x.papel === "corretor" && x.da_vez)?.presenca_id ?? null,
    e: d.find((x) => x.turno === "manha" && x.papel === "especialista" && x.da_vez)?.presenca_id ?? null,
  };
};
const lead = async (leadId) =>
  (await linhas(`select dono_id, origem, whatsapp, etapa, proximo_contato, criado_por from public.leads where id = $1`, [leadId]))[0];
const atend = async (aid) => (await linhas(`select * from public.plantao_atendimentos where id = $1`, [aid]))[0];
const falhaReg = (n, campos, trecho) =>
  falha(n, `select public.recepcao_registrar_cliente($1)`, trecho,
    [{ id: randomUUID(), plantao_id: MZ, midias: ["passagem"], veio_sozinho: true, nome: "X", ...campos }]);
let PARC, PARC_SEM;

test("parte 2 prepara: recepcao.sql de novo (idempotente) e um parceiro de mentira", async () => {
  await db.exec(recepcao);
  await db.exec(recepcao);
  await db.exec(RELOGIO);
  // Só as colunas que a recepção usa de parcerias.sql.
  await db.exec(`create table if not exists public.parceiros (id uuid primary key default gen_random_uuid(), nome text, gerente_id uuid, ativo boolean default true)`);
  [PARC, PARC_SEM] = (await linhas(`insert into public.parceiros (nome, gerente_id) values ('Ana Silva', '${id(GA)}'), ('Sem Dono', null) returning id`)).map((r) => r.id);
  assert.equal((await linhas(`select count(*)::int n from public.plantao_midias where ativo`))[0].n, 14);
});

test("novo antes das 8h45: a recepção escolhe quem atende, nada gira, lead com amanhã 10h", async () => {
  await hora("08:30", DIA);
  const r = await reg(REC, { tipo: "novo", antes_da_vez: true, corretor_id: id(CA), nome: "Lucas Exemplo", whatsapp: "5511900001111", especialista_id: ESP2 });
  assert.equal(r.status, "ok");
  assert.deepEqual(r.anunciar, { papel: "corretor", nome: "Tavinho" });
  assert.equal(r.especialista, "Paula");
  assert.equal(r.lead_criado, true);
  assert.equal(r.antes_da_vez, true);
  const a = await atend(r.atendimento_id);
  const l = await lead(a.lead_id);
  assert.equal(l.dono_id, id(CA));
  assert.equal(l.origem, "plantao");
  assert.equal(l.etapa, "em_contato", "saiu de novo: sem prazo de 15 min");
  assert.equal(l.criado_por, id(REC));
  assert.equal(new Date(l.proximo_contato).toISOString(), "2026-11-07T13:00:00.000Z", "amanhã às 10h de São Paulo");
  const [i] = await linhas(`select tipo, texto from public.lead_interacoes where lead_id = $1`, [a.lead_id]);
  assert.equal(i.tipo, "plantao");
  assert.match(i.texto, /^Atendido no plantão · Marco Zero · antes da vez · especialista Paula/);
  await hora("08:45", DIA);
  await falhaReg(REC, { tipo: "novo", antes_da_vez: true, corretor_id: id(CA) }, "vez_aberta");
});

test("novo da vez: anuncia o da vez, gira as duas vezes, vez_mudou e reenvio", async () => {
  await hora("08:50", DIA);
  for (const c of [CA, CA2, CB]) await porNaVez(REC, MZ, "manha", "corretor", id(c), null);
  for (const e of [ESP1, ESP2]) await porNaVez(REC, MZ, "manha", "especialista", null, e);
  await hora("10:00", DIA);
  // Sem dizer a vez que a tela via: vez_mudou, nada gravado.
  assert.deepEqual(await reg(REC, { tipo: "novo", nome: "Rodrigo Exemplo" }), { status: "vez_mudou", especialista: "Marina" });
  const v = await vezAgora();
  const pid = randomUUID();
  const campos = { id: pid, tipo: "novo", nome: "Rodrigo Exemplo", whatsapp: "5511900002222", vez_corretor: v.c, vez_especialista: v.e, midias: ["passagem", "instagram"] };
  const r = await reg(REC, campos);
  assert.deepEqual(r.anunciar, { papel: "corretor", nome: "Tavinho" });
  assert.equal(r.especialista, "Marina");
  assert.deepEqual(await reg(REC, campos), r, "reenvio: a mesma resposta");
  assert.equal((await linhas(`select count(*)::int n from public.plantao_atendimentos where id = $1`, [pid]))[0].n, 1);
  assert.equal(await daVez(REC, MZ), "Duda");
  assert.equal((await dia(REC, MZ)).find((x) => x.nome === "Paula").da_vez, true);
  assert.equal((await reg(REC, { tipo: "novo", nome: "Y", vez_corretor: v.c, vez_especialista: v.e })).status, "vez_mudou");
  await falhaReg(REC, { tipo: "novo", midias: [] }, "midia_invalida");
  await falhaReg(REC, { tipo: "novo", veio_sozinho: false }, "dados_invalidos"); // sem acompanhante nem Veio sozinho
  await falhaReg(REC, { tipo: "novo", whatsapp: "11999990000" }, "dados_invalidos");
});

test("avisos: telefone já registrado hoje e telefone de outra carteira (sem dizer de quem)", async () => {
  const v = await vezAgora();
  const base = { tipo: "novo", nome: "Rodrigo de Novo", whatsapp: "5511900002222", vez_corretor: v.c, vez_especialista: v.e };
  assert.deepEqual(await reg(REC, base), { status: "confirmar", aviso: "repetido_hoje", hora: "10h00" });
  assert.deepEqual(await reg(REC, { ...base, confirmar: ["repetido_hoje"] }), { status: "confirmar", aviso: "outra_carteira" },
    "é lead do Tavinho; a vez é da Duda");
  const r3 = await reg(REC, { ...base, confirmar: ["repetido_hoje", "outra_carteira"], veio_sozinho: false, acompanhante: "Marcos" });
  assert.deepEqual(r3.anunciar, { papel: "corretor", nome: "Duda" });
  const a = await atend(r3.atendimento_id);
  assert.equal(a.outra_carteira, true);
  assert.equal(a.acompanhante, "Marcos");
  assert.match((await linhas(`select texto from public.lead_interacoes where lead_id = $1`, [a.lead_id]))[0].texto, /outra carteira/);
});

test("novo sem telefone: o lead nasce sem número", async () => {
  const v = await vezAgora();
  const r = await reg(REC, { tipo: "novo", nome: "Sem Fone", vez_corretor: v.c, vez_especialista: v.e });
  assert.deepEqual(r.anunciar, { papel: "corretor", nome: "Beto" });
  assert.equal((await lead((await atend(r.atendimento_id)).lead_id)).whatsapp, null);
});

test("indicação de corretor no stand: acha pelo telefone (mantém o próximo contato) ou cria com Indicação", async () => {
  // Beto já tem o cliente na carteira, com próximo contato marcado.
  const [x] = await como(CB, () => linhas(`insert into public.leads (dono_id, nome, whatsapp, origem, proximo_contato)
    values ('${id(CB)}', 'Beltrano Exemplo', '5511900003333', 'indicacao', '2026-11-20 15:00-03') returning id`));
  let v = await vezAgora();
  const daVezAntes = await daVez(REC, MZ);
  const r = await reg(REC, { tipo: "indicacao_corretor", corretor_id: id(CB), nome: "Beltrano", whatsapp: "5511900003333", vez_especialista: v.e });
  assert.deepEqual(r.anunciar, { papel: "corretor", nome: "Beto" });
  assert.equal(r.encontrado_na_carteira, true);
  assert.equal(r.lead_criado, undefined);
  assert.equal((await atend(r.atendimento_id)).lead_id, x.id);
  assert.equal(new Date((await lead(x.id)).proximo_contato).toISOString(), "2026-11-20T18:00:00.000Z", "o próximo contato do corretor fica");
  assert.equal(await daVez(REC, MZ), daVezAntes, "a vez dos corretores não gira");
  assert.ok(r.especialista, "a dos especialistas gira");

  v = await vezAgora();
  const r2 = await reg(REC, { tipo: "indicacao_corretor", corretor_id: id(CB), nome: "Cliente Novo do Beto", vez_especialista: v.e });
  assert.equal(r2.encontrado_na_carteira, false);
  assert.equal(r2.lead_criado, true);
  const l2 = await lead((await atend(r2.atendimento_id)).lead_id);
  assert.equal(l2.origem, "indicacao");
  assert.equal(l2.dono_id, id(CB));

  // Pelo nome, sem acento e sem telefone.
  v = await vezAgora();
  const r3 = await reg(REC, { tipo: "indicacao_corretor", corretor_id: id(CB), nome: "  beltrano   EXEMPLO ", vez_especialista: v.e });
  assert.equal(r3.encontrado_na_carteira, true);
});

test("indicação com quem indicou fora do stand: pergunta do gerente, gerente, colega mais atrás", async () => {
  let v = await vezAgora();
  const semResposta = { tipo: "indicacao_corretor", corretor_id: id(CB2), nome: "Cliente da Rê", vez_especialista: v.e };
  // Rê não está na vez: primeiro a recepção diz se ela está no stand (chegou depois da janela).
  assert.deepEqual(await reg(REC, semResposta), { status: "pergunta", pergunta: "corretor_no_stand", corretor: "Rê" });
  const base = { ...semResposta, corretor_no_stand: false };
  assert.deepEqual(await reg(REC, base), { status: "pergunta", pergunta: "gerente_no_stand", corretor: "Rê", gerente: "Gerente B" });
  const r1 = await reg(REC, { ...base, gerente_no_stand: true });
  assert.deepEqual(r1.anunciar, { papel: "gerente", nome: "Gerente B" });
  assert.equal((await lead((await atend(r1.atendimento_id)).lead_id)).dono_id, id(CB2), "o lead fica com quem indicou");

  v = await vezAgora();
  const r2 = await reg(REC, { ...base, nome: "Cliente da Rê 2", vez_especialista: v.e, gerente_no_stand: false });
  assert.deepEqual(r2.anunciar, { papel: "colega", nome: "Beto" }, "o único da equipe B na vez");
  assert.match((await linhas(`select texto from public.lead_interacoes where lead_id = $1`, [(await atend(r2.atendimento_id)).lead_id]))[0].texto,
    /atendido por Beto/);

  // Beto saiu: ninguém da equipe.
  await evento(REC, await presDe("Beto"), "saida");
  v = await vezAgora();
  const r3 = await reg(REC, { ...base, nome: "Cliente da Rê 3", vez_especialista: v.e, gerente_no_stand: false });
  assert.equal(r3.anunciar, undefined);
  assert.equal(r3.aviso, "ninguem_da_equipe");
  await evento(REC, await presDe("Beto"), "volta");

  // Rê chegou depois da janela e está no stand: é ela quem atende.
  v = await vezAgora();
  const r4 = await reg(REC, { ...semResposta, nome: "Cliente da Rê 4", vez_especialista: v.e, corretor_no_stand: true });
  assert.deepEqual(r4.anunciar, { papel: "corretor", nome: "Rê" });
  // Beto está na vez como Saiu: fora do stand, sem perguntar dele.
  await evento(REC, await presDe("Beto"), "saida");
  v = await vezAgora();
  assert.equal((await reg(REC, { tipo: "indicacao_corretor", corretor_id: id(CB), nome: "Cliente do Beto fora", vez_especialista: v.e })).pergunta,
    "gerente_no_stand");
  await evento(REC, await presDe("Beto"), "volta");
});

test("colega mais atrás: o último a ser chamado no círculo a partir de quem é da vez", async () => {
  const d = (await dia(REC, MZ)).filter((x) => x.turno === "manha" && x.papel === "corretor");
  const daVezOrdem = d.find((x) => x.da_vez).ordem;
  const [r] = await linhas(
    `select private.recepcao_apelido(private.recepcao_colega_mais_atras($1, $2, 'manha', (select id from public.teams where nome = 'A'), $3)) a`,
    [MZ, DIA, id(SEMAP)]);
  const equipeA = d.filter((x) => ["Tavinho", "Duda"].includes(x.apelido));
  const antes = equipeA.filter((x) => x.ordem < daVezOrdem).sort((a, b) => b.ordem - a.ordem);
  const esperado = (antes[0] ?? [...equipeA].sort((a, b) => b.ordem - a.ordem)[0]).apelido;
  assert.equal(r.a, esperado);
});

test("indicação de parceiro: anuncia o parceiro, gerente congelado, gira só a dos especialistas", async () => {
  const v = await vezAgora();
  const daVezAntes = await daVez(REC, MZ);
  const r = await reg(REC, { tipo: "indicacao_parceiro", parceiro_id: PARC, nome: "Fulana de Tal", whatsapp: "5511900004444", vez_especialista: v.e });
  assert.deepEqual(r.anunciar, { papel: "parceiro", nome: "Ana Silva" });
  assert.equal(r.gerente, "Gerente A");
  assert.ok(r.especialista);
  assert.equal(await daVez(REC, MZ), daVezAntes);
  const a = await atend(r.atendimento_id);
  assert.equal(a.gerente_id, id(GA));
  assert.equal(a.lead_id, null, "cliente de parceiro não vira lead");
  // O parceiro troca de gerente: o atendimento fica com o antigo (decisão 20).
  await db.exec(`update public.parceiros set gerente_id = '${id(GB)}' where id = '${PARC}'`);
  assert.equal((await atend(r.atendimento_id)).gerente_id, id(GA));
  await db.exec(`update public.parceiros set gerente_id = '${id(GA)}' where id = '${PARC}'`);

  const v2 = await vezAgora();
  await falhaReg(REC, { tipo: "indicacao_parceiro", parceiro_id: PARC_SEM, vez_especialista: v2.e }, "parceiro_sem_gerente");
  await falhaReg(REC, { tipo: "indicacao_parceiro", parceiro_id: randomUUID(), vez_especialista: v2.e }, "parceiro_invalido");
});

test("retorno: busca mostra só o mínimo; registrar não gira e traz os especialistas", async () => {
  await hora("11:00", DIA);
  const achados = await rpc(REC, `select * from public.recepcao_procurar_retorno('(11) 90000-2222')`);
  assert.ok(achados.length >= 1);
  assert.deepEqual(Object.keys(achados[0]).sort(),
    ["final_telefone", "primeiro_nome", "ref_id", "ref_tipo", "ultimo_em", "ultimo_especialista", "ultimo_stand", "vinculo"]);
  const a = achados.find((x) => x.vinculo === "Corretor(a) Tavinho");
  assert.equal(a.primeiro_nome, "Rodrigo");
  assert.equal(a.final_telefone, "2222");
  assert.equal(a.ultimo_stand, "Marco Zero");
  assert.equal(a.ultimo_especialista, "Marina");

  const pelaCarteira = await rpc(REC, `select * from public.recepcao_procurar_retorno('11900003333')`);
  assert.ok(pelaCarteira.some((x) => x.vinculo === "Corretor(a) Beto"));
  const peloNome = await rpc(REC, `select * from public.recepcao_procurar_retorno('fulana')`);
  assert.deepEqual(peloNome.map((x) => x.vinculo), ["Parceiro Ana Silva · gerente Gerente A"]);
  assert.deepEqual(await rpc(REC, `select * from public.recepcao_procurar_retorno('fu')`), [], "curto demais");

  const antes = await vezAgora();
  const r = await reg(REC, { tipo: "retorno", retorno_atendimento: a.ref_id, nome: "Rodrigo Exemplo", midias: [] });
  assert.deepEqual(r.anunciar, { papel: "corretor", nome: "Tavinho" });
  assert.equal(r.ultimo_especialista, "Marina");
  assert.ok(r.especialista_da_vez);
  assert.equal(r.especialista, undefined);
  assert.deepEqual(await vezAgora(), antes, "retorno não gira nada");
  const at = await atend(r.atendimento_id);
  assert.equal(at.retorno_de, a.ref_id);
  const [i] = await linhas(`select texto from public.lead_interacoes where lead_id = $1 order by criado_em desc limit 1`, [at.lead_id]);
  assert.match(i.texto, /^Voltou ao plantão · Marco Zero/);

  // Retorno de cliente de parceiro: anuncia o parceiro, gerente de antes.
  const rp = await reg(REC, { tipo: "retorno", retorno_atendimento: peloNome[0].ref_id, nome: "Fulana", midias: [] });
  assert.deepEqual(rp.anunciar, { papel: "parceiro", nome: "Ana Silva" });
  assert.equal((await atend(rp.atendimento_id)).gerente_id, id(GA));
  await falhaReg(REC, { tipo: "retorno", retorno_lead: randomUUID() }, "retorno_invalido");
});

test("clientes de hoje e quem lê os atendimentos", async () => {
  const hoje = await rpc(REC, `select * from public.recepcao_clientes_hoje($1)`, [MZ]);
  assert.ok(hoje.length >= 10);
  assert.ok(hoje.every((x) => !("cliente_whatsapp" in x)), "só o final do telefone");
  const conta = async (n) => (await rpc(n, `select count(*)::int n from public.plantao_atendimentos where dia = '${DIA}'`))[0].n;
  const total = (await linhas(`select count(*)::int n from public.plantao_atendimentos where dia = '${DIA}'`))[0].n;
  assert.equal(await conta(REC), total);
  assert.equal(await conta(GG), total);
  assert.equal(await conta(OP), total, "operacional: todos os atendimentos (Felipe, 05/11/2026)");
  const doCA = (await linhas(`select count(*)::int n from public.plantao_atendimentos where dia = '${DIA}' and '${id(CA)}' in (corretor_id, anunciado_id)`))[0].n;
  assert.equal(await conta(CA), doCA);
  assert.ok((await conta(GA)) > doCA, "gerente A: a equipe A e os clientes do parceiro dele");
  assert.equal((await rpc(GA, `select count(*)::int n from public.plantao_atendimentos where parceiro_id is not null`))[0].n, 2);
  assert.equal((await rpc(GB, `select count(*)::int n from public.plantao_atendimentos where parceiro_id is not null`))[0].n, 0);
  for (const n of [CA, GA]) {
    await falha(n, `select public.recepcao_registrar_cliente('{}')`, "sem_permissao");
    await falha(n, `select * from public.recepcao_procurar_retorno('rodrigo')`, "sem_permissao");
  }
  await falha(REC, `insert into public.plantao_atendimentos (id, plantao_id, dia, turno, tipo, cliente_nome)
    values (gen_random_uuid(), '${MZ}', '${DIA}', 'manha', 'novo', 'x')`, "permission denied");
  // No dia seguinte, a recepção não vê mais; a busca do retorno acha.
  await hora("09:00", "2026-11-07");
  assert.equal(await conta(REC), 0);
  assert.equal(await conta(OP), total, "operacional: também os dias anteriores");
  assert.deepEqual(await rpc(REC, `select * from public.recepcao_clientes_hoje($1)`, [MZ]), []);
  assert.ok((await rpc(REC, `select * from public.recepcao_procurar_retorno('rodrigo')`)).length >= 1);
});

test("desfazer: lead criado some e a vez volta; lead que já existia ganha anotação; só até 30 min", async () => {
  await hora("11:10", DIA);
  const v = await vezAgora();
  const r = await reg(REC, { tipo: "novo", nome: "Desfeito", whatsapp: "5511900005555", vez_corretor: v.c, vez_especialista: v.e });
  const a = await atend(r.atendimento_id);
  assert.notDeepEqual(await vezAgora(), v);
  assert.deepEqual((await rpc(REC, `select public.recepcao_desfazer_cliente($1) r`, [a.id]))[0].r, { status: "ok", lead_removido: true });
  assert.deepEqual(await vezAgora(), v, "a vez voltou");
  assert.equal((await linhas(`select count(*)::int n from public.leads where id = $1`, [a.lead_id]))[0].n, 0);
  assert.equal((await atend(a.id)).status, "cancelado");
  assert.deepEqual((await rpc(REC, `select public.recepcao_desfazer_cliente($1) r`, [a.id]))[0].r, { status: "ok" }, "repetir não quebra");

  // Indicação achada na carteira: o lead fica, com a anotação.
  const v2 = await vezAgora();
  const r2 = await reg(REC, { tipo: "indicacao_corretor", corretor_id: id(CB), nome: "Beltrano", whatsapp: "5511900003333",
    vez_especialista: v2.e, confirmar: ["repetido_hoje"] });
  const a2 = await atend(r2.atendimento_id);
  assert.deepEqual((await rpc(REC, `select public.recepcao_desfazer_cliente($1) r`, [a2.id]))[0].r, { status: "ok", lead_removido: false });
  const [n] = await linhas(`select tipo, texto from public.lead_interacoes where lead_id = $1 order by criado_em desc limit 1`, [a2.lead_id]);
  assert.equal(n.tipo, "nota");
  assert.match(n.texto, /desfez o registro do plantão/);

  const v3 = await vezAgora();
  const r3 = await reg(REC, { tipo: "novo", nome: "Tarde Demais", vez_corretor: v3.c, vez_especialista: v3.e });
  await hora("11:41", DIA);
  await falha(REC, `select public.recepcao_desfazer_cliente($1)`, "prazo_encerrado", [r3.atendimento_id]);
});

test("corrigir: sem motivo até 30 min, depois com motivo; auditoria só do gerente geral", async () => {
  await hora("12:00", DIA);
  const v = await vezAgora();
  const r = await reg(REC, { tipo: "novo", nome: "Corrige Eu", vez_corretor: v.c, vez_especialista: v.e });
  await rpc(REC, `select public.recepcao_corrigir($1, $2)`, [r.atendimento_id, { midias: ["outdoor"], veio_sozinho: false, acompanhante: "Joana", email: "A@B.COM" }]);
  let a = await atend(r.atendimento_id);
  assert.deepEqual(a.midias, ["outdoor"]);
  assert.equal(a.acompanhante, "Joana");
  assert.equal(a.cliente_email, "a@b.com");
  await hora("12:31", DIA);
  await falha(REC, `select public.recepcao_corrigir($1, $2)`, "motivo_obrigatorio", [r.atendimento_id, { observacao: "x" }]);
  await rpc(REC, `select public.recepcao_corrigir($1, $2, 'Digitou errado')`, [r.atendimento_id, { observacao: "Quer 2 dormitórios" }]);
  await falha(REC, `select public.recepcao_corrigir($1, $2, 'x')`, "dados_invalidos", [r.atendimento_id, { veio_sozinho: false, acompanhante: "" }]);
  const h = await rpc(GG, `select acao, motivo from public.plantao_atendimentos_historico where atendimento_id = $1 order by id`, [r.atendimento_id]);
  assert.deepEqual(h, [{ acao: "corrigido", motivo: null }, { acao: "corrigido", motivo: "Digitou errado" }]);
  assert.deepEqual(await rpc(REC, `select * from public.plantao_atendimentos_historico`), [], "recepção não lê a auditoria");
  // Depois do dia: a recepção não corrige; o gerente geral corrige com motivo.
  await hora("09:00", "2026-11-07");
  await falha(REC, `select public.recepcao_corrigir($1, $2, 'x')`, "prazo_encerrado", [r.atendimento_id, { observacao: "y" }]);
  await falha(GG, `select public.recepcao_corrigir($1, $2)`, "motivo_obrigatorio", [r.atendimento_id, { observacao: "y" }]);
  await rpc(GG, `select public.recepcao_corrigir($1, $2, 'Ajuste do dia anterior')`, [r.atendimento_id, { observacao: "y" }]);
  a = await atend(r.atendimento_id);
  assert.equal(a.observacao, "y");
});
