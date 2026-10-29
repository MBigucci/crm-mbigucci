// Teste do schema, do RLS e dos gatilhos das visitas num Postgres local (PGlite).
// Simula o que o Supabase tem: auth.users, auth.uid() e os papéis anon e authenticated.
// Rode com: npm run test:banco
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const GG = 1, GA = 2, GB = 3, CA = 4, CA2 = 5, CB = 6, DES = 7, REC = 8;

const linhas = async (sql, p) => (await db.query(sql, p)).rows;

/** Roda fn como o usuário n (papel authenticated), ou anônimo com n = 0. */
async function como(n, fn) {
  await db.exec(`set role ${n ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${n ? id(n) : ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
async function falha(n, sql, trecho) {
  await assert.rejects(como(n, () => db.exec(sql)), (e) => {
    if (trecho && !String(e.message).includes(trecho)) throw new Error(`erro inesperado: ${e.message}`);
    return true;
  });
}
const idLead = async (nome) => (await linhas(`select id from public.leads where nome = $1`, [nome]))[0].id;
const visita = (leadId, quando = "now() + interval '1 day'", emp = "Marco Zero One") =>
  `insert into public.visitas (lead_id, empreendimento, inicio, local) values ('${leadId}', '${emp}', ${quando}, 'Stand de vendas')`;
const ultimaVisita = async (leadId) =>
  (await linhas(`select * from public.visitas where lead_id = $1 order by created_at desc, id desc limit 1`, [leadId]))[0];
/** O horário da visita já passou (pelo SQL Editor, sem usuário logado). */
const passar = (visitaId) => db.exec(`update public.visitas set inicio = now() - interval '2 hours' where id = '${visitaId}'`);
const eventos = (leadId, tipos = "('visita', 'visita_horario', 'visita_comprovante')") =>
  linhas(`select tipo, de, para, detalhe, autor_id, automatico, visita_id from public.lead_eventos
          where lead_id = $1 and tipo in ${tipos} order by criado_em, id`, [leadId]);

test("prepara o banco", async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  await db.exec(schema);
  await db.exec(schema);
  await db.exec(schema); // idempotente

  const pessoas = [[GG, "Felipe"], [GA, "Gerente A"], [GB, "Gerente B"], [CA, "Corretor A"], [CA2, "Corretor A2"],
                   [CB, "Corretor B"], [DES, "Desativado"], [REC, "Recepção"]];
  for (const [n, nome] of pessoas)
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `u${n}@x.com`, { nome }]);
  await db.exec(`
    update public.profiles set perfil = 'gerente_geral', ativo = true where id = '${id(GG)}';
    update public.profiles set perfil = 'gerente', ativo = true where id in ('${id(GA)}', '${id(GB)}');
    update public.profiles set perfil = 'recepcao', ativo = true where id = '${id(REC)}';
    insert into public.teams (nome, gerente_id) values ('A', '${id(GA)}'), ('B', '${id(GB)}');
    update public.profiles set ativo = true, equipe_id = (select id from public.teams where nome = 'A') where id in ('${id(CA)}', '${id(CA2)}', '${id(DES)}');
    update public.profiles set ativo = true, equipe_id = (select id from public.teams where nome = 'B') where id = '${id(CB)}';
  `);
  for (const [n, nome] of [[CA, "Ana"], [CA, "Bruno"], [CA, "Caio"], [CA2, "Duda"], [CB, "Edu"], [DES, "Fábio"]])
    await como(n, () => db.exec(`insert into public.leads (nome, whatsapp, origem) values ('${nome}', '5511987654321', 'plantao')`));
  await db.exec(`update public.profiles set ativo = false where id = '${id(DES)}'`);
});

test("permissão: o gerente dá baixa na equipe por padrão, e o ajuste do gerente geral sobrevive", async () => {
  const rp = await linhas(`select perfil from public.role_permissions where permissao = 'visitas.baixa_equipe'`);
  assert.deepEqual(rp, [{ perfil: "gerente" }]);
  await db.exec(`delete from public.role_permissions where permissao = 'visitas.baixa_equipe'`);
  await db.exec(schema);
  assert.equal((await linhas(`select count(*)::int n from public.role_permissions where permissao = 'visitas.baixa_equipe'`))[0].n, 0);
  await db.exec(`insert into public.role_permissions values ('gerente', 'visitas.baixa_equipe')`);
});

test("agendar: o dono do lead agenda, e o lead vai para visita agendada pelo gatilho", async () => {
  const ana = await idLead("Ana");
  await como(CA, () => db.exec(visita(ana)));
  const v = await ultimaVisita(ana);
  assert.equal(v.corretor_id, id(CA));
  assert.equal(v.criado_por, id(CA));
  assert.equal(v.status, "agendada");
  assert.equal(v.local, "Stand de vendas");
  assert.equal(v.baixa_em, null);
  const [l] = await linhas(`select etapa from public.leads where id = $1`, [ana]);
  assert.equal(l.etapa, "visita_agendada");
  const [etapa] = await linhas(`select de, para, automatico from public.lead_eventos where lead_id = $1 and tipo = 'etapa'`, [ana]);
  assert.deepEqual(etapa, { de: "novo", para: "visita_agendada", automatico: true });
  assert.deepEqual(await eventos(ana), [
    { tipo: "visita", de: null, para: "agendada", detalhe: null, autor_id: id(CA), automatico: false, visita_id: v.id },
  ]);
});

test("agendar: não para o lead de outro, não no passado, não em lead descartado, nem quem não cadastra leads", async () => {
  await falha(CA, visita(await idLead("Duda")), "row-level security");
  await falha(CA2, `insert into public.visitas (lead_id, corretor_id, empreendimento, inicio) values ('${await idLead("Bruno")}', '${id(CA2)}', 'X', now() + interval '1 day')`, "permission denied");
  await falha(CA, visita(await idLead("Bruno"), "now() - interval '1 hour'"), "a partir de agora");
  await falha(CA, `insert into public.visitas (lead_id, empreendimento, inicio) values ('${await idLead("Bruno")}', '  ', now() + interval '1 day')`, "visitas_empreendimento_check");
  await falha(GA, visita(await idLead("Bruno")), "row-level security");
  await falha(REC, visita(await idLead("Bruno")), "row-level security");
  await falha(0, visita(await idLead("Bruno")), "permission denied");

  const caio = await idLead("Caio");
  await como(CA, () => db.exec(`update public.leads set status = 'descartado', motivo_descarte = 'sem_interesse' where id = '${caio}'`));
  await falha(CA, visita(caio), "lead ativo");
  await como(CA, () => db.exec(`update public.leads set status = 'ativo', motivo_descarte = null where id = '${caio}'`));

  // O status, a baixa e o comprovante não vêm do app no agendamento.
  await falha(CA, `insert into public.visitas (lead_id, empreendimento, inicio, status) values ('${caio}', 'X', now() + interval '1 day', 'realizada')`, "permission denied");
  await falha(CA, `insert into public.visitas (lead_id, empreendimento, inicio, baixa_por) values ('${caio}', 'X', now() + interval '1 day', '${id(CA)}')`, "permission denied");
});

test("leitura: o corretor vê as dele, o gerente as da equipe, o gerente geral todas", async () => {
  await como(CA2, async () => db.exec(visita(await idLead("Duda"), "now() + interval '2 days'", "Life")));
  await como(CB, async () => db.exec(visita(await idLead("Edu"), "now() + interval '3 days'", "Wish")));
  const emps = async (n) =>
    (await como(n, () => linhas(`select empreendimento from public.visitas order by empreendimento`))).map((r) => r.empreendimento);
  assert.deepEqual(await emps(CA), ["Marco Zero One"]);
  assert.deepEqual(await emps(CA2), ["Life"]);
  assert.deepEqual(await emps(CB), ["Wish"]);
  assert.deepEqual(await emps(GA), ["Life", "Marco Zero One"]);
  assert.deepEqual(await emps(GB), ["Wish"]);
  assert.deepEqual(await emps(GG), ["Life", "Marco Zero One", "Wish"]);
  assert.deepEqual(await emps(REC), []);
  assert.deepEqual(await emps(DES), []);
  await falha(0, `select * from public.visitas`, "permission denied");
  // O gerente vê o histórico da visita junto com o lead.
  assert.equal((await como(GA, () => linhas(`select 1 from public.lead_eventos where tipo = 'visita'`))).length, 2);
  assert.equal((await como(GB, () => linhas(`select 1 from public.lead_eventos where tipo = 'visita'`))).length, 1);
});

test("confirmar e remarcar: remarcar volta para agendada e grava o horário antigo e o novo", async () => {
  const ana = await idLead("Ana");
  const v = await ultimaVisita(ana);
  await como(CA, () => db.exec(`update public.visitas set status = 'confirmada' where id = '${v.id}'`));
  assert.equal((await ultimaVisita(ana)).status, "confirmada");
  await como(CA, () => db.exec(`update public.visitas set inicio = inicio + interval '1 day' where id = '${v.id}'`));
  const r = await ultimaVisita(ana);
  assert.equal(r.status, "agendada");
  assert.equal(new Date(r.inicio).getTime() - new Date(v.inicio).getTime(), 24 * 3600 * 1000);
  const evs = await eventos(ana);
  assert.deepEqual(evs.map((e) => [e.tipo, e.de, e.para].join(":")).slice(1, 2), ["visita:agendada:confirmada"]);
  const horario = evs.find((e) => e.tipo === "visita_horario");
  assert.equal(new Date(horario.de).getTime(), new Date(v.inicio).getTime());
  assert.equal(new Date(horario.para).getTime(), new Date(r.inicio).getTime());
  assert.ok(evs.some((e) => e.tipo === "visita" && e.de === "confirmada" && e.para === "agendada")); // pela remarcação
  await falha(CA, `update public.visitas set inicio = now() - interval '1 day' where id = '${v.id}'`, "a partir de agora");
});

test("baixa: só depois do horário, com quem deu e quando carimbados pelo banco", async () => {
  const ana = await idLead("Ana");
  const v = await ultimaVisita(ana);
  await falha(CA, `update public.visitas set status = 'realizada' where id = '${v.id}'`, "depois do horário");
  await falha(CA, `update public.visitas set baixa_por = '${id(CA2)}' where id = '${v.id}'`, "permission denied");
  await falha(CA, `update public.visitas set baixa_em = now() where id = '${v.id}'`, "permission denied");

  await db.exec(`update public.leads set tentativas = 2 where id = '${ana}'`);
  await passar(v.id);
  await como(CA, () => db.exec(`update public.visitas set status = 'realizada', observacao = '  Gostou da planta de 2 dorms  ' where id = '${v.id}'`));
  const r = await ultimaVisita(ana);
  assert.equal(r.status, "realizada");
  assert.equal(r.baixa_por, id(CA));
  assert.ok(Math.abs(new Date(r.baixa_em).getTime() - Date.now()) < 60_000);
  assert.equal(r.observacao, "Gostou da planta de 2 dorms");

  const [l] = await linhas(`select etapa, tentativas, ultima_interacao_texto, ultima_interacao_em from public.leads where id = $1`, [ana]);
  assert.equal(l.etapa, "visita_realizada");
  assert.equal(l.tentativas, 0);
  assert.equal(l.ultima_interacao_texto, "Visita realizada: Marco Zero One");
  assert.equal(new Date(l.ultima_interacao_em).getTime(), new Date(r.baixa_em).getTime());
  const ev = (await eventos(ana)).at(-1);
  assert.deepEqual([ev.tipo, ev.de, ev.para, ev.autor_id], ["visita", "agendada", "realizada", id(CA)]);

  // A anotação depois da baixa não muda quem deu nem quando.
  await como(CA, () => db.exec(`update public.visitas set observacao = 'Volta com a esposa' where id = '${v.id}'`));
  const a = await ultimaVisita(ana);
  assert.equal(a.baixa_por, id(CA));
  assert.equal(new Date(a.baixa_em).getTime(), new Date(r.baixa_em).getTime());
});

test("status final não volta sem registro: só pela correção, com o motivo no histórico", async () => {
  const ana = await idLead("Ana");
  const v = await ultimaVisita(ana);
  await falha(CA, `update public.visitas set status = 'nao_compareceu' where id = '${v.id}'`, "use Corrigir");
  await falha(CA, `update public.visitas set status = 'agendada' where id = '${v.id}'`, "use Corrigir");
  await falha(CA, `update public.visitas set inicio = now() + interval '1 day' where id = '${v.id}'`, "Só a visita agendada pode ser remarcada");
  await falha(CA, `select public.corrigir_visita('${v.id}', 'nao_compareceu', '  ')`, "motivo");
  await falha(0, `select public.corrigir_visita('${v.id}', 'nao_compareceu', 'Engano')`, "permission denied");

  await como(CA, () => db.exec(`select public.corrigir_visita('${v.id}', 'nao_compareceu', 'Toquei no botão errado')`));
  const r = await ultimaVisita(ana);
  assert.equal(r.status, "nao_compareceu");
  assert.equal(r.baixa_por, id(CA));
  const ev = (await eventos(ana)).at(-1);
  assert.deepEqual([ev.de, ev.para, ev.detalhe, ev.autor_id], ["realizada", "nao_compareceu", "Toquei no botão errado", id(CA)]);
  // A etapa do lead nunca volta.
  assert.equal((await linhas(`select etapa from public.leads where id = $1`, [ana]))[0].etapa, "visita_realizada");
  // O motivo não fica valendo para a próxima mudança.
  await falha(CA, `update public.visitas set status = 'realizada' where id = '${v.id}'`, "use Corrigir");

  await como(CA, () => db.exec(`select public.corrigir_visita('${v.id}', 'realizada', 'O cliente veio, confirmei com a recepção')`));
  assert.equal((await ultimaVisita(ana)).status, "realizada");
});

test("gerente: dá baixa e corrige na equipe, mas não agenda, remarca nem cancela", async () => {
  const duda = await idLead("Duda");
  const v = await ultimaVisita(duda);
  await falha(GA, `update public.visitas set status = 'cancelada' where id = '${v.id}'`, "Só o corretor da visita");
  await falha(GA, `update public.visitas set inicio = inicio + interval '1 hour' where id = '${v.id}'`, "Só o corretor da visita");
  await falha(GA, `update public.visitas set status = 'realizada' where id = '${v.id}'`, "depois do horário");
  await passar(v.id);
  const outra = await como(GB, () => db.query(`update public.visitas set status = 'realizada' where id = '${v.id}'`));
  assert.equal(outra.affectedRows, 0);
  const colega = await como(CA, () => db.query(`update public.visitas set status = 'realizada' where id = '${v.id}'`));
  assert.equal(colega.affectedRows, 0);

  await como(GA, () => db.exec(`update public.visitas set status = 'nao_compareceu', observacao = 'Cliente não apareceu no stand' where id = '${v.id}'`));
  const r = await ultimaVisita(duda);
  assert.equal(r.baixa_por, id(GA));
  assert.equal(r.status, "nao_compareceu");
  // Não compareceu não move a etapa nem conta como conversa.
  assert.equal((await linhas(`select etapa from public.leads where id = $1`, [duda]))[0].etapa, "visita_agendada");
  await como(GA, () => db.exec(`select public.corrigir_visita('${v.id}', 'realizada', 'O corretor mandou a foto depois')`));
  const c = await ultimaVisita(duda);
  assert.equal(c.baixa_por, id(GA));
  assert.equal((await linhas(`select etapa from public.leads where id = $1`, [duda]))[0].etapa, "visita_realizada");

  // Sem a permissão no perfil, o gerente só vê.
  await db.exec(`delete from public.role_permissions where permissao = 'visitas.baixa_equipe'`);
  const sem = await como(GA, () => db.query(`update public.visitas set observacao = 'x' where id = '${v.id}'`));
  assert.equal(sem.affectedRows, 0);
  await db.exec(`insert into public.role_permissions values ('gerente', 'visitas.baixa_equipe')`);

  // O gerente geral dá baixa em qualquer equipe.
  const edu = await idLead("Edu");
  const ve = await ultimaVisita(edu);
  await passar(ve.id);
  await como(GG, () => db.exec(`update public.visitas set status = 'realizada' where id = '${ve.id}'`));
  assert.equal((await ultimaVisita(edu)).baixa_por, id(GG));
});

test("cancelar e desfazer: o Desfazer passa pela correção e fica registrado", async () => {
  const bruno = await idLead("Bruno");
  await como(CA, () => db.exec(visita(bruno)));
  const v = await ultimaVisita(bruno);
  await como(CA, () => db.exec(`update public.visitas set status = 'cancelada' where id = '${v.id}'`));
  assert.equal((await ultimaVisita(bruno)).baixa_em, null);
  await falha(CA, `update public.visitas set status = 'agendada' where id = '${v.id}'`, "use Corrigir");
  await como(CA, () => db.exec(`select public.corrigir_visita('${v.id}', 'agendada', 'Cancelamento desfeito')`));
  assert.equal((await ultimaVisita(bruno)).status, "agendada");
  assert.deepEqual((await eventos(bruno)).map((e) => `${e.de}>${e.para}:${e.detalhe}`), [
    "null>agendada:null",
    "agendada>cancelada:null",
    "cancelada>agendada:Cancelamento desfeito",
  ]);
  // Cancelar não volta a etapa do lead.
  assert.equal((await linhas(`select etapa from public.leads where id = $1`, [bruno]))[0].etapa, "visita_agendada");
});

test("comprovante: link opcional, só na visita realizada, e cada troca vai para o histórico", async () => {
  const ana = await idLead("Ana");
  const v = await ultimaVisita(ana);
  await falha(CA, `update public.visitas set comprovante = 'foto.jpg' where id = '${v.id}'`, "visitas_comprovante_check");
  await como(CA, () => db.exec(`update public.visitas set comprovante = ' https://drive.google.com/x ' where id = '${v.id}'`));
  assert.equal((await ultimaVisita(ana)).comprovante, "https://drive.google.com/x");
  const ev = (await eventos(ana)).at(-1);
  assert.deepEqual([ev.tipo, ev.de, ev.para, ev.autor_id], ["visita_comprovante", null, "https://drive.google.com/x", id(CA)]);

  const bruno = await idLead("Bruno");
  const vb = await ultimaVisita(bruno);
  await falha(CA, `update public.visitas set comprovante = 'https://x.com/a' where id = '${vb.id}'`, "só para a visita realizada");
});

test("sem exclusão, e ninguém escreve o histórico da visita direto", async () => {
  const v = await ultimaVisita(await idLead("Ana"));
  await falha(CA, `delete from public.visitas where id = '${v.id}'`, "permission denied");
  await falha(GG, `delete from public.visitas where id = '${v.id}'`, "permission denied");
  await falha(CA, `insert into public.lead_eventos (lead_id, visita_id, tipo, para) values ('${v.lead_id}', '${v.id}', 'visita', 'realizada')`, "permission denied");
  await falha(CA, `update public.visitas set lead_id = '${await idLead("Bruno")}' where id = '${v.id}'`, "permission denied");
  await falha(CA, `update public.visitas set corretor_id = '${id(CA2)}' where id = '${v.id}'`, "permission denied");
});

test("mensagem Confirmar visita: ganha {visita}, e o texto ajustado pelo gerente geral fica", async () => {
  const [m] = await linhas(`select texto from public.mensagens_modelo where slug = 'confirmar_visita'`);
  assert.match(m.texto, /\{empreendimento\}, \{visita\}\./);
  await db.exec(`update public.mensagens_modelo set texto = 'Oi, {primeiro_nome}. Até {visita}.' where slug = 'confirmar_visita'`);
  await db.exec(schema);
  const [r] = await linhas(`select texto from public.mensagens_modelo where slug = 'confirmar_visita'`);
  assert.equal(r.texto, "Oi, {primeiro_nome}. Até {visita}.");
});
