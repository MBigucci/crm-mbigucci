// Recepção + Parcerias de ponta a ponta, com os arquivos reais: schema.sql,
// parcerias.sql e recepcao.sql, nessa ordem. A recepção vê a fila dos gerentes,
// pula quem não está no stand, cadastra o parceiro e registra o cliente dele;
// o cliente fica com o gerente escolhido (congelado) e o pulado mantém a vez.
// Rode com: node --test supabase/testes/recepcao-parceiros.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const ler = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const GG = 1, G1 = 2, G2 = 3, C1 = 4, REC = 5;
const linhas = async (sql, p) => (await db.query(sql, p)).rows;
async function como(n, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${id(n)}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const rpc = (n, sql, p) => como(n, async () => (await db.query(sql, p)).rows);

let MZ;

test("prepara: schema, parcerias e recepção (duas vezes cada um)", async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  for (const f of ["schema.sql", "parcerias.sql", "recepcao.sql"]) {
    await db.exec(ler(f));
    await db.exec(ler(f));
  }
  for (const [n, nome] of [[GG, "Felipe"], [G1, "Gerente Um"], [G2, "Gerente Dois"], [C1, "Corretor Um"], [REC, "Carla"]])
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `u${n}@x.com`, { nome }]);
  await db.exec(`
    update public.profiles set perfil = 'gerente_geral', ativo = true where id = '${id(GG)}';
    update public.profiles set perfil = 'gerente', ativo = true where id in ('${id(G1)}', '${id(G2)}');
    update public.profiles set perfil = 'recepcao', ativo = true where id = '${id(REC)}';
    insert into public.teams (nome, gerente_id) values ('Um', '${id(G1)}');
    update public.profiles set apelido = 'Um', ativo = true, equipe_id = (select id from public.teams) where id = '${id(C1)}';
    insert into public.especialistas (nome) values ('Marina');
  `);
  [{ id: MZ }] = await linhas(`select id from public.plantoes where nome = 'Marco Zero'`);
});

test("parceiro novo no stand: pula o 1º da fila, o escolhido fica com o cliente, o pulado mantém a vez", async () => {
  const fila = await rpc(REC, `select * from public.recepcao_fila_parceiros()`);
  assert.equal(fila.length, 2);
  const [primeiro, segundo] = fila;

  // O primeiro não está no stand: a recepção escolhe o segundo.
  const [{ r: entrada }] = await rpc(REC, `select public.recepcao_parceiro_entrar($1, 'Marcos Fictício', 'Lar Exemplo', '11 98888-7777', null, null, '{}', null, null, $2) r`,
    [randomUUID(), segundo.gerente_id]);
  assert.equal(entrada.status, "criado");
  assert.equal(entrada.gerente_nome, segundo.gerente_nome);

  const r = (await rpc(REC, `select public.recepcao_registrar_cliente($1) r`, [{
    id: randomUUID(), plantao_id: MZ, tipo: "indicacao_parceiro", parceiro_id: entrada.parceiro_id,
    nome: "Cliente do Marcos", veio_sozinho: true, midias: ["passagem"], vez_especialista: null,
  }]))[0].r;
  assert.equal(r.status, "ok");
  assert.deepEqual(r.anunciar, { papel: "parceiro", nome: "Marcos Fictício" });
  assert.equal(r.gerente, segundo.gerente_nome);
  const [a] = await linhas(`select gerente_id, parceiro_id from public.plantao_atendimentos where id = $1`, [r.atendimento_id]);
  assert.equal(a.gerente_id, segundo.gerente_id);

  const depois = await rpc(REC, `select * from public.recepcao_fila_parceiros()`);
  assert.equal(depois[0].gerente_id, primeiro.gerente_id, "o pulado continua o primeiro");

  // O gerente dono vê o cliente do parceiro; o outro, não.
  const ve = async (n) => (await rpc(n, `select count(*)::int n from public.plantao_atendimentos where parceiro_id is not null`))[0].n;
  assert.equal(await ve(Number(segundo.gerente_id.slice(-2))), 1);
  assert.equal(await ve(Number(primeiro.gerente_id.slice(-2))), 0);

  // Parceiro que volta: já cadastrado, mesmo id de parceiro e mesmo gerente.
  const [{ r: de_novo }] = await rpc(REC, `select public.recepcao_parceiro_entrar($1, 'Marcos F.', null, '(11) 98888-7777', null, null) r`, [randomUUID()]);
  assert.equal(de_novo.status, "ja_cadastrado");
  assert.equal(de_novo.parceiro_id, entrada.parceiro_id);
});
