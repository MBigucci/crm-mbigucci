// Teste do schema, do RLS e da carga inicial do catálogo de empreendimentos num Postgres local (PGlite).
// Simula o que o Supabase tem: auth.users, auth.uid() e os papéis anon e authenticated.
// Rode com: npm run test:banco
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const seed = readFileSync(new URL("../empreendimentos-seed.sql", import.meta.url), "utf8");
const dados = JSON.parse(readFileSync(new URL("../../../docs/empreendimentos-dados.json", import.meta.url), "utf8"));
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const GG = 1, GA = 2, CA = 3, OP = 4, REC = 5, DES = 6;

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
const emp = async (slug) => (await linhas(`select * from public.empreendimentos where slug = $1`, [slug]))[0];
const preco = async (slug) => Number((await emp(slug)).preco_a_partir_de) || null;

test("prepara o banco: schema três vezes e a carga inicial duas", async () => {
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
  await db.exec(seed);
  await db.exec(seed); // idempotente

  const pessoas = [[GG, "Felipe"], [GA, "Gerente A"], [CA, "Corretor A"], [OP, "Operacional"], [REC, "Recepção"], [DES, "Desativado"]];
  for (const [n, nome] of pessoas)
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `u${n}@x.com`, { nome }]);
  await db.exec(`
    update public.profiles set perfil = 'gerente_geral', ativo = true where id = '${id(GG)}';
    update public.profiles set perfil = 'gerente', ativo = true where id = '${id(GA)}';
    update public.profiles set perfil = 'operacional', ativo = true where id = '${id(OP)}';
    update public.profiles set perfil = 'recepcao', ativo = true where id = '${id(REC)}';
    insert into public.teams (nome, gerente_id) values ('A', '${id(GA)}');
    update public.profiles set ativo = true, equipe_id = (select id from public.teams where nome = 'A') where id in ('${id(CA)}', '${id(DES)}');
    update public.profiles set ativo = false where id = '${id(DES)}';
  `);
});

test("carga inicial: os 46 itens do JSON, as tipologias e o \"a partir de\" pelo gatilho", async () => {
  const [{ e, t }] = await linhas(`select (select count(*)::int from public.empreendimentos) e, (select count(*)::int from public.tipologias) t`);
  assert.equal(e, dados.empreendimentos.length);
  // As 114 da tabela e a planta do site do Elleva, sem preço.
  assert.equal(t, dados.empreendimentos.reduce((s, x) => s + (x.tipologias.length || (x.plantas_site ?? []).length), 0));

  for (const x of dados.empreendimentos) assert.equal(await preco(x.id), x.preco_a_partir_de, x.id);
  const mzo = await emp("marco-zero-one");
  assert.equal(mzo.status, "lancamento");
  assert.equal(mzo.tabela_mes.toISOString().slice(0, 10), "2026-11-01");
  assert.equal(mzo.entrega_prevista.toISOString().slice(0, 10), "2030-08-01");
  const elleva = await emp("elleva");
  assert.equal(elleva.preco_a_partir_de, null);
  assert.deepEqual(await linhas(`select dormitorios, preco_a_partir_de from public.tipologias where empreendimento_id = $1`, [elleva.id]),
    [{ dormitorios: 2, preco_a_partir_de: null }]);
  assert.equal((await emp("dom")).pede_contexto, true);
  assert.match((await emp("station")).restricao_renda, /10 salários/);
});

test("rodar a carga de novo não desfaz o que foi ajustado no app", async () => {
  const life = await emp("life");
  await como(GG, () => db.exec(`
    update public.empreendimentos set chamada = 'Ajustada' where slug = 'life';
    delete from public.tipologias where empreendimento_id = '${life.id}' and ordem > 1;
  `));
  await db.exec(seed);
  assert.equal((await emp("life")).chamada, "Ajustada");
  assert.equal((await linhas(`select count(*)::int n from public.tipologias where empreendimento_id = $1`, [life.id]))[0].n, 1);
  assert.equal((await linhas(`select count(*)::int n from public.empreendimentos`))[0].n, dados.empreendimentos.length);
});

test("permissão: padrão só para o operacional e só na criação", async () => {
  assert.deepEqual(await linhas(`select perfil from public.role_permissions where permissao = 'empreendimentos.gerenciar'`),
    [{ perfil: "operacional" }]);
  await db.exec(`delete from public.role_permissions where permissao = 'empreendimentos.gerenciar'`);
  await db.exec(schema);
  assert.equal((await linhas(`select count(*)::int n from public.role_permissions where permissao = 'empreendimentos.gerenciar'`))[0].n, 0);
  await db.exec(`insert into public.role_permissions values ('operacional', 'empreendimentos.gerenciar')`);
});

test("leitura: todo usuário ativo lê; desativado não vê nada; anônimo não tem acesso", async () => {
  for (const n of [GG, GA, CA, OP, REC]) {
    const [{ e, t }] = await como(n, () => linhas(`select (select count(*)::int from public.empreendimentos) e, (select count(*)::int from public.tipologias) t`));
    assert.equal(e, dados.empreendimentos.length, `usuário ${n}`);
    assert.ok(t > 100, `usuário ${n}`);
  }
  const [{ e }] = await como(DES, () => linhas(`select count(*)::int e from public.empreendimentos`));
  assert.equal(e, 0);
  await falha(0, `select * from public.empreendimentos`, "permission denied");
  await falha(0, `select * from public.tipologias`, "permission denied");
});

test("escrita: só o gerente geral e quem tem empreendimentos.gerenciar", async () => {
  const novo = (slug) => `insert into public.empreendimentos (slug, nome, status) values ('${slug}', 'Teste ${slug}', 'breve_lancamento')`;
  for (const n of [GA, CA, REC, DES]) await falha(n, novo(`x${n}`), "row-level security");
  await como(OP, () => db.exec(novo("novo-op")));
  await como(GG, () => db.exec(novo("novo-gg")));
  assert.equal((await emp("novo-op")).atualizado_por, id(OP));

  // Quem não gerencia não altera (o RLS esconde a linha da escrita).
  for (const n of [GA, CA, REC]) await como(n, () => db.exec(`update public.empreendimentos set nome = 'Mudou' where slug = 'novo-op'`));
  assert.equal((await emp("novo-op")).nome, "Teste novo-op");
  await como(OP, () => db.exec(`update public.empreendimentos set ativo = false, bairro = 'Centro' where slug = 'novo-op'`));
  assert.equal((await emp("novo-op")).ativo, false);

  // Sem exclusão, nem para o gerente geral; o "a partir de" e o slug não são do app.
  await falha(GG, `delete from public.empreendimentos where slug = 'novo-op'`, "permission denied");
  await falha(OP, `update public.empreendimentos set preco_a_partir_de = 1 where slug = 'novo-op'`, "permission denied");
  await falha(OP, `update public.empreendimentos set slug = 'outro' where slug = 'novo-op'`, "permission denied");
  // Nome repetido (sem diferença de maiúscula) e link que não é http.
  await falha(OP, `insert into public.empreendimentos (slug, nome, status) values ('rep', 'teste NOVO-OP', 'pronto')`, "empreendimentos_nome_unico");
  await falha(OP, `update public.empreendimentos set link_apresentacao = 'javascript:alert(1)' where slug = 'novo-op'`, "empreendimentos_links_check");
  await falha(OP, `insert into public.empreendimentos (slug, nome, status) values ('Com Espaço', 'X', 'pronto')`, "check");
});

test("tipologias: quem gerencia altera, e o \"a partir de\" acompanha (sem as esgotadas)", async () => {
  const e = await emp("novo-op");
  const tip = (rotulo, preco) =>
    `insert into public.tipologias (empreendimento_id, rotulo, dormitorios, preco_a_partir_de) values ('${e.id}', '${rotulo}', 2, ${preco})`;
  await falha(CA, tip("A", 500000), "row-level security");
  await como(OP, () => db.exec(`${tip("A", 500000)}; ${tip("B", 450000)}`));
  assert.equal(await preco("novo-op"), 450000);

  await como(OP, () => db.exec(`update public.tipologias set esgotada = true where rotulo = 'B' and empreendimento_id = '${e.id}'`));
  assert.equal(await preco("novo-op"), 500000);

  // Corretor não altera nem retira (0 linhas).
  await como(CA, () => db.exec(`update public.tipologias set preco_a_partir_de = 1 where empreendimento_id = '${e.id}';
                                delete from public.tipologias where empreendimento_id = '${e.id}'`));
  assert.equal((await linhas(`select count(*)::int n from public.tipologias where empreendimento_id = $1`, [e.id]))[0].n, 2);

  await como(OP, () => db.exec(`delete from public.tipologias where rotulo = 'A' and empreendimento_id = '${e.id}'`));
  assert.equal(await preco("novo-op"), null);
  await falha(OP, `update public.tipologias set vagas_min = 2, vagas_max = 1 where empreendimento_id = '${e.id}'`, "vagas");
  await falha(OP, `update public.tipologias set tipo = 'casa' where empreendimento_id = '${e.id}'`, "check");
});

test("mensagem pronta nova e nada sigiloso no catálogo", async () => {
  const [m] = await como(CA, () => linhas(`select texto, ativo from public.mensagens_modelo where slug = 'apresentar_empreendimento'`));
  assert.ok(m.ativo);
  for (const v of ["{endereco}", "{apresentacao}", "{a_partir_de}"]) assert.ok(m.texto.includes(v), v);
  const catalogo = (await como(CA, () => linhas(`select slug || ' ' || descricao t from public.permissions`))).map((r) => r.t).join(" ");
  assert.doesNotMatch(catalogo, /verba|premia|prêmio|pontu|ranking/i);
});
