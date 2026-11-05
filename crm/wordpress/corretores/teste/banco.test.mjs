// O cadastro da página /corretores/ contra o banco de verdade (schema.sql +
// parcerias.sql no PGlite), como o anônimo do site: grava pela parceiro_enviar
// com os mesmos parâmetros que a página monta, e não lê nada.
// Rode com: npm run test:banco (em crm/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { PGlite } from "@electric-sql/pglite";

const ler = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const R = vm.runInNewContext(ler("../src/regras.js") + "\n;MBP_REGRAS");
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const linhas = async (sql, p) => (await db.query(sql, p)).rows;

async function anonimo(fn) {
  await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
}

/** O POST da página, em SQL: os parâmetros nomeados de R.parametros, um a um. */
async function enviar(campos, idAparelho) {
  const p = JSON.parse(JSON.stringify(R.parametros(campos, idAparelho)));
  const nomes = Object.keys(p);
  const args = nomes.map((n, i) => `${n} => $${i + 1}${n === "p_regioes" ? "::text[]" : n === "p_id" ? "::uuid" : "::text"}`).join(", ");
  return anonimo(async () => (await db.query(`select public.parceiro_enviar(${args}) r`, nomes.map((n) => p[n]))).rows[0].r);
}
const campos = (o = {}) => ({ nome: "Rita Lopes", empresa: "Lopes Imóveis", whatsapp: "(11) 98888-7777", creci: "123456-F", email: "rita@x.com",
  regioes: ["diadema", "sbc_centro"], outra: true, regiaoOutra: "Mogi", isca: "", ...o });

test("prepara: schema e parcerias, com dois gerentes", async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  await db.exec(ler("../../../supabase/schema.sql"));
  await db.exec(ler("../../../supabase/parcerias.sql"));
  for (const [n, nome] of [[1, "Gerente Um"], [2, "Gerente Dois"]])
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `u${n}@x.com`, { nome }]);
  await db.exec(`update public.profiles set perfil = 'gerente', ativo = true where id in ('${id(1)}', '${id(2)}')`);
});

test("anônimo grava: o cadastro da página entra, com as regiões e o id do aparelho, e a resposta é 'recebido'", async () => {
  const idA = "11111111-1111-4111-8111-111111111111";
  assert.equal(await enviar(campos(), idA), "recebido");
  const [p] = await linhas(`select id, nome, empresa, whatsapp_norm, creci_norm, regioes, regiao_outra, entrada, gerente_id from public.parceiros`);
  assert.equal(p.id, idA);
  assert.equal(p.whatsapp_norm, "11988887777");
  assert.equal(p.creci_norm, "123456F");
  assert.deepEqual(p.regioes, ["diadema", "sbc_centro"]);
  assert.equal(p.regiao_outra, "Mogi");
  assert.equal(p.entrada, "link");
  assert.ok(p.gerente_id, "a roleta deu um gerente");
  // reenviar o mesmo cadastro (mesmo id do aparelho) não grava de novo
  assert.equal(await enviar(campos(), idA), "recebido");
  assert.equal((await linhas(`select count(*)::int n from public.parceiros`))[0].n, 1);
});

test("a resposta é a mesma para parceiro repetido e para o robô (campo isca), e nada novo é criado", async () => {
  assert.equal(await enviar(campos({ nome: "Rita L.", creci: "" }), "22222222-2222-4222-8222-222222222222"), "recebido");
  assert.equal(await enviar(campos({ nome: "Robô", whatsapp: "11977776666", creci: "", isca: "https://spam" }), "33333333-3333-4333-8333-333333333333"), "recebido");
  assert.equal((await linhas(`select count(*)::int n from public.parceiros`))[0].n, 1);
  // o repetido virou aviso ao dono, não parceiro novo
  assert.equal((await linhas(`select count(*)::int n from public.parceiro_avisos where tipo = 'reentrada'`))[0].n, 1);
});

test("dado inválido devolve o erro que a página traduz, sem revelar nada", async () => {
  await assert.rejects(enviar(campos({ nome: " ", whatsapp: "12", creci: "" }), "44444444-4444-4444-8444-444444444444"), (e) => {
    assert.equal(e.code, "22023");
    assert.equal(R.resposta(400, { code: e.code, message: e.message }).texto, "Confira o nome e o WhatsApp e envie de novo.");
    return true;
  });
  await assert.rejects(enviar(campos({ whatsapp: "11966665555", creci: "", regioes: ["marte"] }), "55555555-5555-4555-8555-555555555555"), /regiao_invalida/);
});

test("anônimo não lê nada: nem parceiros, nem regiões, nem avisos, histórico ou tentativas", async () => {
  for (const t of ["parceiros", "parceiro_regioes", "parceiro_avisos", "parceiro_eventos", "parceiro_interacoes", "parceiro_link_tentativas", "parceiros_situacao", "profiles", "push_assinaturas"]) {
    await assert.rejects(anonimo(() => db.query(`select * from public.${t} limit 1`)), /permission denied/, t);
  }
  for (const [t, col] of [["parceiros", "nome"], ["parceiro_avisos", "tipo"]]) {
    await assert.rejects(anonimo(() => db.query(`update public.${t} set ${col} = ${col}`)), /permission denied/, `update ${t}`);
    await assert.rejects(anonimo(() => db.query(`delete from public.${t}`)), /permission denied/, `delete ${t}`);
  }
});

test("anônimo só executa a parceiro_enviar: as outras funções de parceiros e de avisos são fechadas", async () => {
  const fechadas = [
    `select public.parceiros_avisos_pendentes()`,
    `select public.parceiros_avisos_marcar('{1}')`,
    `select public.parceiros_fila()`,
    `select public.parceiro_cadastrar(gen_random_uuid(), 'X', null, '11955554444', null, null, '{}', null)`,
    `select public.parceiro_linha_do_tempo(gen_random_uuid())`,
    `select public.recepcao_fila_parceiros()`,
    `select public.avisos_dados()`,
  ];
  for (const sql of fechadas) await assert.rejects(anonimo(() => db.query(sql)), /permission denied/, sql);
  // e não há outra função de parceiro aberta ao anônimo além dela
  const abertas = await linhas(`
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.proname like '%parceir%' and has_function_privilege('anon', p.oid, 'execute')`);
  assert.deepEqual(abertas.map((r) => r.proname), ["parceiro_enviar"]);
});
