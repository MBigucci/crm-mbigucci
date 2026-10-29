// Teste do schema e do RLS de leads num Postgres local (PGlite, Postgres em WASM).
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
const lead = (dono, nome) =>
  `insert into public.leads (dono_id, nome, whatsapp, origem) values ('${id(dono)}', '${nome}', '5511987654321', 'plantao')`;

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
    update public.profiles set ativo = false where id = '${id(DES)}';
  `);
});

test("permissões padrão entram uma vez e o ajuste do gerente geral sobrevive", async () => {
  const rp = await linhas(`select perfil, permissao from public.role_permissions where permissao like 'leads.%' order by 1`);
  assert.deepEqual(rp, [
    { perfil: "corretor", permissao: "leads.cadastrar" },
    { perfil: "gerente", permissao: "leads.atribuir" },
  ]);
  await db.exec(`delete from public.role_permissions where permissao = 'leads.atribuir'`);
  await db.exec(schema);
  const n = await linhas(`select count(*)::int n from public.role_permissions where permissao = 'leads.atribuir'`);
  assert.equal(n[0].n, 0);
  await db.exec(`insert into public.role_permissions values ('gerente', 'leads.atribuir')`);
});

test("catálogos: 7 origens e 7 etapas, legíveis só por usuário ativo", async () => {
  assert.equal((await como(CA, () => linhas(`select slug from public.lead_origens`))).length, 7);
  assert.equal((await como(CA, () => linhas(`select slug from public.lead_etapas`))).length, 7);
  assert.equal((await como(DES, () => linhas(`select slug from public.lead_origens`))).length, 0);
  await falha(0, `select * from public.lead_origens`, "permission denied");
});

test("corretor cadastra o próprio lead e não cadastra para outro", async () => {
  await como(CA, () => db.exec(lead(CA, "Cliente A1")));
  await como(CA, () => db.exec(`insert into public.leads (nome, whatsapp, origem, campanha) values ('Cliente A2', '5511912345678', 'anuncio_proprio', '  Feirão  ')`));
  const [l] = await linhas(`select dono_id, criado_por, campanha, etapa, status from public.leads where nome = 'Cliente A2'`);
  assert.deepEqual(l, { dono_id: id(CA), criado_por: id(CA), campanha: "Feirão", etapa: "novo", status: "ativo" });
  await falha(CA, lead(CA2, "Para o colega"), "row-level security");
  await falha(CA, lead(CA, "Da empresa").replace("'plantao'", "'empresa'"), "row-level security");
  await como(CB, () => db.exec(lead(CB, "Cliente B1")));
  await como(CA2, () => db.exec(lead(CA2, "Cliente A2-1")));
});

test("WhatsApp precisa ter só dígitos com 55; descarte exige motivo", async () => {
  await falha(CA, `insert into public.leads (nome, whatsapp, origem) values ('X', '(11) 98765-4321', 'plantao')`, "leads_whatsapp_check");
  await falha(CA, `update public.leads set status = 'descartado' where nome = 'Cliente A1'`, "leads_descarte_tem_motivo");
});

test("leitura: corretor vê os dele, gerente a equipe, gerente geral tudo", async () => {
  const nomes = async (n) => (await como(n, () => linhas(`select nome from public.leads order by nome`))).map((r) => r.nome);
  assert.deepEqual(await nomes(CA), ["Cliente A1", "Cliente A2"]);
  assert.deepEqual(await nomes(CB), ["Cliente B1"]);
  assert.deepEqual(await nomes(GA), ["Cliente A1", "Cliente A2", "Cliente A2-1"]);
  assert.deepEqual(await nomes(GB), ["Cliente B1"]);
  assert.equal((await nomes(GG)).length, 4);
  assert.deepEqual(await nomes(REC), []);
  assert.deepEqual(await nomes(DES), []);
  await falha(0, `select * from public.leads`, "permission denied");
});

test("corretor edita o próprio lead e não o do colega", async () => {
  await como(CA, () => db.exec(`update public.leads set temperatura = 'quente', etapa = 'em_contato' where nome = 'Cliente A1'`));
  const r = await como(CA, () => db.query(`update public.leads set temperatura = 'frio' where nome = 'Cliente A2-1'`));
  assert.equal(r.affectedRows, 0);
  await falha(CA, `update public.leads set dono_id = '${id(CA2)}' where nome = 'Cliente A1'`, "atribuir leads");
  await falha(CA, `update public.leads set origem = 'empresa' where nome = 'Cliente A1'`, "gerente muda a origem");
  await falha(CA, `update public.leads set criado_por = '${id(CB)}' where nome = 'Cliente A1'`, "permission denied");
});

test("descarte: sem exclusão física, com data e motivo", async () => {
  await como(CA, () => db.exec(`update public.leads set status = 'descartado', motivo_descarte = 'fora_da_regiao' where nome = 'Cliente A2'`));
  const [l] = await linhas(`select status, descartado_em is not null as tem_data from public.leads where nome = 'Cliente A2'`);
  assert.deepEqual(l, { status: "descartado", tem_data: true });
  await falha(CA, `delete from public.leads where nome = 'Cliente A2'`, "permission denied");
  await como(CA, () => db.exec(`update public.leads set status = 'ativo', motivo_descarte = null where nome = 'Cliente A2'`));
  const [r] = await linhas(`select descartado_em from public.leads where nome = 'Cliente A2'`);
  assert.equal(r.descartado_em, null);
});

test("gerente cadastra lead da empresa e atribui só dentro da equipe", async () => {
  await como(GA, () => db.exec(lead(CA, "Empresa 1").replace("'plantao'", "'empresa'")));
  const [l] = await linhas(`select dono_id, atribuido_por, criado_por from public.leads where nome = 'Empresa 1'`);
  assert.deepEqual(l, { dono_id: id(CA), atribuido_por: id(GA), criado_por: id(GA) });
  await falha(GA, lead(CB, "Fora da equipe"), "row-level security");
  await falha(GA, lead(GA, "Para si mesmo"), "row-level security");
  await falha(GA, lead(DES, "Para desativado"), "row-level security");

  await como(GA, () => db.exec(`update public.leads set dono_id = '${id(CA2)}' where nome = 'Empresa 1'`));
  assert.equal((await linhas(`select dono_id from public.leads where nome = 'Empresa 1'`))[0].dono_id, id(CA2));
  await falha(GA, `update public.leads set dono_id = '${id(CB)}' where nome = 'Empresa 1'`, "atribuir leads");
  await falha(GA, `update public.leads set temperatura = 'quente' where nome = 'Empresa 1'`, "Só o corretor dono");
  const r = await como(GB, () => db.query(`update public.leads set dono_id = '${id(CB)}' where nome = 'Empresa 1'`));
  assert.equal(r.affectedRows, 0);
  // O corretor que recebeu trabalha o lead, mas não muda a origem.
  await como(CA2, () => db.exec(`update public.leads set temperatura = 'morno' where nome = 'Empresa 1'`));
  await falha(CA2, `update public.leads set origem = 'plantao' where nome = 'Empresa 1'`, "gerente muda a origem");
});

test("gerente geral atribui para qualquer equipe", async () => {
  await como(GG, () => db.exec(`update public.leads set dono_id = '${id(CB)}' where nome = 'Empresa 1'`));
  assert.equal((await linhas(`select dono_id from public.leads where nome = 'Empresa 1'`))[0].dono_id, id(CB));
});

test("sem a permissão no perfil, o corretor não cadastra", async () => {
  await db.exec(`delete from public.role_permissions where permissao = 'leads.cadastrar'`);
  await falha(CA, lead(CA, "Sem permissão"), "row-level security");
  await db.exec(`insert into public.role_permissions values ('corretor', 'leads.cadastrar')`);
});

test("interações: o dono registra, e o lead ganha última interação e próximo contato", async () => {
  const [{ id: leadId }] = await linhas(`select id from public.leads where nome = 'Cliente A1'`);
  await como(CA, () =>
    db.exec(`insert into public.lead_interacoes (lead_id, texto, proximo_contato)
             values ('${leadId}', '  Mandou mensagem, quer visitar sábado ', '2026-11-01 10:00-03')`));
  const [l] = await linhas(`select ultima_interacao_texto, proximo_contato, ultima_interacao_em is not null as tem from public.leads where id = '${leadId}'`);
  assert.equal(l.ultima_interacao_texto, "Mandou mensagem, quer visitar sábado");
  assert.equal(new Date(l.proximo_contato).toISOString(), "2026-11-01T13:00:00.000Z");
  assert.equal(l.tem, true);
  const [i] = await linhas(`select autor_id from public.lead_interacoes where lead_id = '${leadId}'`);
  assert.equal(i.autor_id, id(CA));

  await falha(CA, `insert into public.lead_interacoes (lead_id, texto) values ('${leadId}', 'sem próximo')`, "not-null");
  await falha(CA2, `insert into public.lead_interacoes (lead_id, texto, proximo_contato) values ('${leadId}', 'x', now())`, "row-level security");
  await falha(GA, `insert into public.lead_interacoes (lead_id, texto, proximo_contato) values ('${leadId}', 'x', now())`, "row-level security");
  await falha(CA, `update public.lead_interacoes set texto = 'mudei'`, "permission denied");
  await falha(CA, `delete from public.lead_interacoes`, "permission denied");
  await falha(CA, `update public.leads set ultima_interacao_texto = 'x' where id = '${leadId}'`, "permission denied");
});

test("histórico: quem vê o lead vê as interações", async () => {
  const conta = async (n) => (await como(n, () => linhas(`select count(*)::int n from public.lead_interacoes`)))[0].n;
  assert.equal(await conta(CA), 1);
  assert.equal(await conta(GA), 1);
  assert.equal(await conta(GG), 1);
  assert.equal(await conta(CA2), 0);
  assert.equal(await conta(GB), 0);
  assert.equal(await conta(DES), 0);
});

test("corretor desativado perde o acesso aos próprios leads", async () => {
  await db.exec(`update public.leads set dono_id = '${id(DES)}' where nome = 'Cliente A2-1'`);
  assert.equal((await como(DES, () => linhas(`select * from public.leads`))).length, 0);
  // E o gerente da equipe ainda vê e pode reatribuir.
  await como(GA, () => db.exec(`update public.leads set dono_id = '${id(CA2)}' where nome = 'Cliente A2-1'`));
});
