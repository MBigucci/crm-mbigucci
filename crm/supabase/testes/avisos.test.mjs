// Teste do schema, do RLS e das funções dos avisos no celular num Postgres local
// (PGlite). Simula o que o Supabase tem: auth.users, auth.uid(), os papéis anon,
// authenticated e service_role, e um Vault e um pg_net falsos para o gatilho
// de atribuição (supabase/agendar-avisos.sql). Rode com: npm run test:banco
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const agendar = readFileSync(new URL("../agendar-avisos.sql", import.meta.url), "utf8");
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const GG = 1, GA = 2, CA = 4, CA2 = 5, DES = 7;
const FCM = (s) => `https://fcm.googleapis.com/fcm/send/${s}`;

const linhas = async (sql, p) => (await db.query(sql, p)).rows;

/** Roda fn como o usuário n (papel authenticated), anônimo com n = 0, ou a chave de serviço com n = "servico". */
async function como(n, fn) {
  const papel = n === "servico" ? "service_role" : n ? "authenticated" : "anon";
  const sub = typeof n === "number" && n ? id(n) : "";
  await db.exec(`set role ${papel}; select set_config('request.jwt.claim.sub', '${sub}', false);`);
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
const assinar = (endpoint, tipos = "null") =>
  `select public.push_assinar('${endpoint}', 'BPk3', 'a1b2', ${tipos}, 'Android · Chrome')`;

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

  const pessoas = [[GG, "Felipe"], [GA, "Gerente A"], [CA, "Corretor A"], [CA2, "Corretor A2"], [DES, "Desativado"]];
  for (const [n, nome] of pessoas)
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `u${n}@x.com`, { nome }]);
  await db.exec(`
    update public.profiles set perfil = 'gerente_geral', ativo = true where id = '${id(GG)}';
    update public.profiles set perfil = 'gerente', ativo = true where id = '${id(GA)}';
    insert into public.teams (nome, gerente_id) values ('A', '${id(GA)}');
    update public.profiles set ativo = true, equipe_id = (select id from public.teams where nome = 'A') where id in ('${id(CA)}', '${id(CA2)}', '${id(DES)}');
    update public.profiles set ativo = false where id = '${id(DES)}';
  `);
});

test("assinar: cada um grava o próprio aparelho, com os tipos padrão ou escolhidos", async () => {
  await como(CA, () => db.exec(assinar(FCM("ca-celular"))));
  await como(CA, () => db.exec(assinar(FCM("ca-tablet"), "'{visita,resumo}'")));
  await como(CA2, () => db.exec(assinar("https://web.push.apple.com/ca2")));
  const r = await linhas(`select endpoint, usuario_id, tipos, aparelho from public.push_assinaturas order by endpoint`);
  assert.deepEqual(r.map((x) => [x.endpoint, x.usuario_id, x.tipos]), [
    [FCM("ca-celular"), id(CA), ["contato", "visita", "atribuido", "prazo", "resumo"]],
    [FCM("ca-tablet"), id(CA), ["visita", "resumo"]],
    ["https://web.push.apple.com/ca2", id(CA2), ["contato", "visita", "atribuido", "prazo", "resumo"]],
  ]);
  // assinar de novo sem tipos (o app abrindo) mantém os tipos escolhidos
  await como(CA, () => db.exec(assinar(FCM("ca-tablet"))));
  assert.deepEqual((await linhas(`select tipos from public.push_assinaturas where endpoint = $1`, [FCM("ca-tablet")]))[0].tipos, ["visita", "resumo"]);
});

test("RLS: cada um vê e remove só os próprios aparelhos", async () => {
  const ve = async (n) => (await como(n, () => linhas(`select endpoint from public.push_assinaturas order by endpoint`))).map((x) => x.endpoint);
  assert.deepEqual(await ve(CA), [FCM("ca-celular"), FCM("ca-tablet")]);
  assert.deepEqual(await ve(CA2), ["https://web.push.apple.com/ca2"]);
  assert.deepEqual(await ve(GA), []); // o gerente não vê os aparelhos da equipe
  assert.deepEqual(await ve(GG), []);
  await falha(0, `select * from public.push_assinaturas`, "permission denied");

  // apagar o do colega não apaga nada
  await como(CA, () => db.exec(`delete from public.push_assinaturas where endpoint = 'https://web.push.apple.com/ca2'`));
  assert.equal((await linhas(`select count(*)::int n from public.push_assinaturas`))[0].n, 3);
  // gravar e alterar direto, sem a função, não pode
  await falha(CA, `insert into public.push_assinaturas (endpoint, usuario_id, p256dh, auth) values ('${FCM("x")}', '${id(CA)}', 'k', 'a')`, "permission denied");
  await falha(CA, `update public.push_assinaturas set tipos = '{}' where usuario_id = '${id(CA)}'`, "permission denied");
  // o próprio pode remover (é o "Desligar neste aparelho")
  await como(CA, () => db.exec(`delete from public.push_assinaturas where endpoint = '${FCM("ca-tablet")}'`));
  assert.equal((await linhas(`select count(*)::int n from public.push_assinaturas`))[0].n, 2);
});

test("assinar: recusa endereço que não é de serviço de push, tipo inválido, anônimo e conta desativada", async () => {
  await falha(CA, assinar("https://exemplo.com/push"), "inválida");
  await falha(CA, assinar("http://fcm.googleapis.com/fcm/send/x"), "inválida");
  await falha(CA, assinar(FCM("y"), "'{contato,pontos}'"), "Tipo de aviso inválido");
  await falha(0, assinar(FCM("anon")), "permission denied");
  await falha(DES, assinar(FCM("des")), "conta ativa");
});

test("assinar: o aparelho que troca de conta passa para quem entrou, com os tipos padrão", async () => {
  await como(CA, () => db.exec(`select public.push_assinar('${FCM("compartilhado")}', 'k', 'a', '{resumo}', null)`));
  await como(CA2, () => db.exec(assinar(FCM("compartilhado"))));
  const [r] = await linhas(`select usuario_id, tipos from public.push_assinaturas where endpoint = $1`, [FCM("compartilhado")]);
  assert.equal(r.usuario_id, id(CA2));
  assert.deepEqual(r.tipos, ["contato", "visita", "atribuido", "prazo", "resumo"]);
  assert.equal((await como(CA, () => linhas(`select 1 from public.push_assinaturas where endpoint = $1`, [FCM("compartilhado")]))).length, 0);
});

test("push_log e funções da Edge Function: fechados para o app, abertos só para a chave de serviço", async () => {
  for (const n of [0, CA, GG]) {
    await falha(n, `select * from public.push_log`, "permission denied");
    await falha(n, `select public.avisos_dados()`, "permission denied");
    await falha(n, `select public.avisos_registrar('[]')`, "permission denied");
    await falha(n, `select public.avisos_desmarcar('[]')`, "permission denied");
    await falha(n, `select public.push_esquecer('{}')`, "permission denied");
    await falha(n, `select public.avisos_limpar()`, "permission denied");
    await falha(n, `select public.avisos_segredo_ok('x')`, "permission denied");
  }
  await como("servico", () => db.exec(`select public.avisos_limpar()`));
});

test("avisos_dados: só quem tem aparelho e conta ativa, com o fim do prazo do lead da empresa", async () => {
  // lead da empresa que o gerente passou ao corretor A, e um lead do corretor A com contato para agora
  await como(GA, () =>
    db.exec(`insert into public.leads (nome, whatsapp, origem, dono_id) values ('Ana Souza', '5511987654321', 'empresa', '${id(CA)}')`));
  await como(CA, () =>
    db.exec(`insert into public.leads (nome, whatsapp, origem, proximo_contato) values ('Bruno Lima', '5511987654322', 'plantao', now())`));
  // corretor A2 tem lead, mas o aparelho dele é o compartilhado; o lead daqui a 3 dias fica fora
  await como(CA2, () =>
    db.exec(`insert into public.leads (nome, whatsapp, origem, proximo_contato) values ('Caio Reis', '5511987654323', 'plantao', now() + interval '3 days')`));
  // a assinatura de quem foi desativado não conta
  await db.exec(`insert into public.push_assinaturas (endpoint, usuario_id, p256dh, auth) values ('${FCM("des")}', '${id(DES)}', 'k', 'a')`);

  const [{ d }] = await como("servico", () => linhas(`select public.avisos_dados() d`));
  assert.ok(d.agora);
  assert.deepEqual(d.horario, { dias: [0, 1, 2, 3, 4, 5, 6], inicio: "09:00", fim: "19:00" });
  assert.ok(!d.assinaturas.some((a) => a.usuario_id === id(DES)));
  assert.deepEqual(d.leads.map((l) => l.nome).sort(), ["Ana Souza", "Bruno Lima"]);
  const ana = d.leads.find((l) => l.nome === "Ana Souza");
  assert.equal(ana.atribuido_por, id(GA));
  assert.ok(ana.fim_prazo, "lead da empresa em novo tem fim do prazo");
  assert.equal(d.leads.find((l) => l.nome === "Bruno Lima").fim_prazo, null);
});

test("não repetir: avisos_registrar só devolve o que ainda não saiu, e desmarcar libera de novo", async () => {
  const itens = JSON.stringify([
    { usuario_id: id(CA), chave: "contato:l1:100" },
    { usuario_id: id(CA), chave: "resumo:c:2026-11-03" },
  ]);
  const reg = async (x) => (await como("servico", () => linhas(`select public.avisos_registrar($1::jsonb) r`, [x])))[0].r;
  assert.equal((await reg(itens)).length, 2);
  assert.equal((await reg(itens)).length, 0); // segunda rodada: nada novo
  // a mesma chave para outra pessoa é outro aviso
  assert.equal((await reg(JSON.stringify([{ usuario_id: id(CA2), chave: "contato:l1:100" }]))).length, 1);
  await como("servico", () => db.query(`select public.avisos_desmarcar($1::jsonb)`, [JSON.stringify([{ usuario_id: id(CA), chave: "contato:l1:100" }])]));
  assert.deepEqual(await reg(itens), [{ usuario_id: id(CA), chave: "contato:l1:100" }]);
});

test("esquecer e limpar: aparelho inválido sai; log antigo e aparelho sem abrir há 60 dias saem", async () => {
  const [{ n }] = await como("servico", () => linhas(`select public.push_esquecer($1) n`, [[FCM("ca-celular"), FCM("nao-existe")]]));
  assert.equal(n, 1);
  await db.exec(`update public.push_assinaturas set visto_em = now() - interval '61 days' where endpoint = '${FCM("compartilhado")}'`);
  await db.exec(`update public.push_log set enviado_em = now() - interval '31 days' where chave = 'resumo:c:2026-11-03'`);
  await como("servico", () => db.exec(`select public.avisos_limpar()`));
  assert.equal((await linhas(`select 1 from public.push_assinaturas where endpoint = $1`, [FCM("compartilhado")])).length, 0);
  assert.deepEqual((await linhas(`select chave from public.push_log order by chave`)).map((x) => x.chave), ["contato:l1:100", "contato:l1:100"]);
});

test("segredo do agendador: confere com o Vault", async () => {
  const servico = (s) => como("servico", () => linhas(`select public.avisos_segredo_ok($1) ok`, [s]));
  assert.equal((await servico("x".repeat(64)))[0].ok, false); // sem Vault: recusa
  await db.exec(`
    create schema vault;
    create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
    insert into vault.decrypted_secrets values ('avisos_segredo', '${"s".repeat(64)}'), ('avisos_url', 'https://x.supabase.co/functions/v1/avisos');
  `);
  assert.equal((await servico("s".repeat(64)))[0].ok, true);
  assert.equal((await servico("t".repeat(64)))[0].ok, false);
  assert.equal((await servico(null))[0].ok, false);
  assert.equal((await servico("s".repeat(10)))[0].ok, false);
});

test("gatilho de atribuição: chama a função na hora só para o lead da empresa atribuído", async () => {
  // pg_net falso: guarda as chamadas
  await db.exec(`
    create schema net;
    create table net.chamadas (url text, headers jsonb, body jsonb);
    create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer)
      returns bigint language sql as $$ insert into net.chamadas values (url, headers, body); select 1::bigint $$;
  `);
  const ini = agendar.indexOf("create or replace function private.chamar_avisos");
  const fim = agendar.indexOf("-- [/gatilho de atribuição]");
  assert.ok(ini > 0 && fim > ini);
  await db.exec(agendar.slice(ini, fim));
  await db.exec(agendar.slice(ini, fim)); // pode rodar de novo
  const chamadas = () => linhas(`select url, headers, body from net.chamadas`);

  // lead que o corretor cadastra para si: nada
  await como(CA, () => db.exec(`insert into public.leads (nome, whatsapp, origem) values ('Duda Melo', '5511987654324', 'plantao')`));
  assert.equal((await chamadas()).length, 0);
  // lead da empresa que o gerente passa ao corretor: uma chamada, com o segredo
  await como(GA, () =>
    db.exec(`insert into public.leads (nome, whatsapp, origem, dono_id) values ('Edu Paz', '5511987654325', 'empresa', '${id(CA)}')`));
  let c = await chamadas();
  assert.equal(c.length, 1);
  assert.equal(c[0].url, "https://x.supabase.co/functions/v1/avisos");
  assert.equal(c[0].headers["x-avisos-segredo"], "s".repeat(64));
  assert.equal(c[0].body.origem, "atribuicao");
  const edu = (await linhas(`select id from public.leads where nome = 'Edu Paz'`))[0].id;
  assert.equal(c[0].body.lead_id, edu);
  // o corretor mexe no lead (temperatura): nada
  await como(CA, () => db.exec(`update public.leads set temperatura = 'quente' where id = '${edu}'`));
  assert.equal((await chamadas()).length, 1);
  // o gerente passa para outro corretor: chama de novo
  await como(GA, () => db.exec(`update public.leads set dono_id = '${id(CA2)}' where id = '${edu}'`));
  c = await chamadas();
  assert.equal(c.length, 2);

  // sem pg_net, salvar o lead continua funcionando
  await db.exec(`drop function net.http_post(text, jsonb, jsonb, integer)`);
  await como(GA, () =>
    db.exec(`insert into public.leads (nome, whatsapp, origem, dono_id) values ('Fábio Luz', '5511987654326', 'empresa', '${id(CA)}')`));
  assert.equal((await linhas(`select count(*)::int n from public.leads where nome = 'Fábio Luz'`))[0].n, 1);
});

test("schema roda de novo com assinaturas e log gravados", async () => {
  await db.exec(schema);
  assert.ok((await linhas(`select count(*)::int n from public.push_log`))[0].n > 0);
});
