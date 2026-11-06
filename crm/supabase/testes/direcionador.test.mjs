// Direcionador de leads (Base360 Marketing), etapa 1: o banco.
// Roda o schema.sql e o direcionador.sql (três vezes) no PGlite e confere:
// só o gerente geral lê e grava; os outros perfis recebem zero linhas e erro
// ao gravar; o endereço sai só mascarado; a divisão é exata; o limite do dia;
// o registro dos envios só com a chave ligada. A concorrência de verdade
// (dois leads ao mesmo tempo) roda num Postgres local (embedded-postgres),
// numa pasta temporária, e é pulada se ele não subir.
// Todos os nomes, e-mails e telefones daqui são fictícios.
// Rode com: node --test supabase/testes/direcionador.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
// A regra pura do Marketing: o mesmo caso tem de dar o mesmo resultado aqui e no banco.
import { escolherNaRegra, momentoSP, somar } from "../../../marketing/src/lib/direcionador.ts";

const ler = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const id = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const GG = 1, GG_OFF = 2, GER = 3, COR = 4, OPE = 5, REC = 6, ESP = 7;

// O que o Supabase tem e os testes precisam: papéis, auth e um Vault de mentira
// com as mesmas assinaturas (vault.secrets, decrypted_secrets, create/update_secret).
const AMBIENTE = `
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  create schema vault;
  create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, description text, secret text);
  create view vault.decrypted_secrets as select id, name, description, secret, secret as decrypted_secret from vault.secrets;
  create function vault.create_secret(new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null)
    returns uuid language sql as $$ insert into vault.secrets (name, description, secret) values (new_name, new_description, new_secret) returning id $$;
  create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null,
    new_description text default null, new_key_id uuid default null)
    returns void language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret),
      name = coalesce(new_name, name), description = coalesce(new_description, description) where id = secret_id $$;
  revoke all on schema vault from public;
`;

const db = new PGlite();
const linhas = async (sql, p) => (await db.query(sql, p)).rows;

/** Roda fn como o usuário n (authenticated), como anon ("anon") ou como a chave de serviço ("servico"). */
async function como(n, fn) {
  const papel = n === "anon" ? "anon" : n === "servico" ? "service_role" : "authenticated";
  const sub = typeof n === "number" ? id(n) : "";
  await db.exec(`set role ${papel}; select set_config('request.jwt.claim.sub', '${sub}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const q = (n, sql, p) => como(n, async () => (await db.query(sql, p)).rows);
const um = async (n, sql, p) => (await q(n, sql, p))[0]?.r;

let VENDAS;

test("prepara: schema.sql e direcionador.sql três vezes, sem erro", async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;`);
  await db.exec(AMBIENTE);
  await db.exec(ler("schema.sql"));
  for (let i = 0; i < 3; i++) await db.exec(ler("direcionador.sql"));

  for (const [n, nome] of [[GG, "Gerente Geral"], [GG_OFF, "Geral Desativado"], [GER, "Gerente Um"], [COR, "Corretor Um"],
                           [OPE, "Operacional Um"], [REC, "Recepção Um"], [ESP, "Especialista Um"]])
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `u${n}@exemplo.test`, { nome }]);
  await db.exec(`
    update public.profiles set perfil = 'gerente_geral', ativo = true where id in ('${id(GG)}', '${id(GG_OFF)}');
    update public.profiles set ativo = false where id = '${id(GG_OFF)}';
    update public.profiles set perfil = 'gerente', ativo = true where id = '${id(GER)}';
    insert into public.teams (nome, gerente_id) values ('Equipe Um', '${id(GER)}');
    update public.profiles set ativo = true, equipe_id = (select id from public.teams) where id = '${id(COR)}';
    update public.profiles set perfil = 'operacional', ativo = true where id = '${id(OPE)}';
    update public.profiles set perfil = 'recepcao', ativo = true where id = '${id(REC)}';
    update public.profiles set perfil = 'especialista', ativo = true where id = '${id(ESP)}';
    -- O operacional com todas as permissões do catálogo: o acesso não sai daí.
    insert into public.role_permissions (perfil, permissao) select 'operacional', slug from public.permissions on conflict do nothing;
  `);
  [{ id: VENDAS }] = await linhas(`select id from interno.direcionador_destinos where tipo = 'vendas'`);
});

test("seed: só o Base360 Vendas, a chave geral desligada e as fontes", async () => {
  const d = await linhas(`select tipo, nome from interno.direcionador_destinos`);
  assert.deepEqual(d, [{ tipo: "vendas", nome: "Base360 Vendas" }]);
  assert.equal((await linhas(`select ativo from interno.direcionador_config`))[0].ativo, false);
  assert.equal((await linhas(`select count(*)::int n from interno.direcionador_regras`))[0].n, 0);
  const f = await linhas(`select slug from interno.lead_fontes order by ordem`);
  assert.deepEqual(f.map((x) => x.slug), ["site", "zap", "vivareal", "olx", "imovelweb", "chavesnamao"]);
});

test("gerente geral lê pela função; ninguém lê as tabelas do esquema interno direto", async () => {
  const [r] = await q(GG, `select public.cfg_ler() r`);
  assert.equal(r.r.ativo, false);
  assert.equal(r.r.destinos.length, 1);
  assert.equal(r.r.destinos[0].tipo, "vendas");
  assert.equal(r.r.fontes.length, 6);
  for (const n of [GG, COR, "servico", "anon"])
    await assert.rejects(q(n, `select * from interno.direcionador_destinos`), /permission denied/, `papel ${n}`);
});

// Para os testes de perfil precisa haver o que esconder: um destino com
// endereço, uma regra e um contato registrado.
let EXT, REG, PARC, RE;
test("gerente geral grava: chave geral, destinos, endereço e regra", async () => {
  EXT = await um(GG, `select public.cfg_item_salvar($1) r`, [{ nome: "Externo sem registro", modo: "email", registrar_envios: false }]);
  REG = await um(GG, `select public.cfg_item_salvar($1) r`, [{ nome: "Parceiro Fictício", modo: "email", registrar_envios: true }]);
  PARC = await um(GG, `select public.cfg_item_salvar($1) r`, [{ nome: "Porta Fictícia", modo: "porta", limite_dia: 2 }]);
  await um(GG, `select public.cfg_item_endereco_salvar($1, $2) r`, [EXT, { email: "contato.teste@exemplo-ficticio.com.br" }]);
  RE = await um(GG, `select public.cfg_regra_salvar($1) r`, [{
    nome: "Regra de teste", produtos: [], fontes: ["zap"], dias: [0, 6], hora_inicio: "00:00", hora_fim: "00:00",
    partes: [{ destino_id: EXT, porcentagem: 70 }, { destino_id: VENDAS, porcentagem: 30 }],
  }]);
  assert.equal(await um(GG, `select public.cfg_salvar(true) r`), true);
  const [r] = await q(GG, `select public.cfg_ler() r`);
  assert.equal(r.r.ativo, true);
  assert.equal(r.r.destinos.length, 4);
  assert.equal(r.r.regras.length, 1);
  assert.deepEqual(r.r.regras[0].partes.map((p) => p.porcentagem), [70, 30]);
  assert.equal(await um("servico", `select public.mkt_registrar_envio($1) r`, [{
    destino_id: REG, nome: "Cliente Fictício", telefone: "(11) 90000-0001", email: "cliente@exemplo.test",
    fonte: "zap", quando: "2026-11-05T15:00:00Z", entrada_id: "<m1@exemplo.test>",
  }]) !== null, true);
});

const ESCRITAS = [
  [`select public.cfg_salvar(false)`, []],
  [`select public.cfg_item_salvar($1)`, [{ nome: "Outro", modo: "email" }]],
  [`select public.cfg_item_excluir($1)`, () => [EXT]],
  [`select public.cfg_item_endereco_salvar($1, $2)`, () => [EXT, { email: "x@exemplo.test" }]],
  [`select public.cfg_regra_salvar($1)`, () => [{ nome: "X", partes: [{ destino_id: VENDAS, porcentagem: 100 }] }]],
  [`select public.cfg_regra_ligar($1, false)`, () => [RE]],
  [`select public.cfg_regra_ordem($1)`, () => [[RE]]],
  [`select public.cfg_regra_excluir($1)`, () => [RE]],
];

for (const [nome, n] of [["corretor", COR], ["gerente", GER], ["operacional com todas as permissões", OPE],
                         ["recepção", REC], ["especialista", ESP], ["gerente geral desativado", GG_OFF]]) {
  test(`${nome}: zero linhas ao ler e erro ao gravar`, async () => {
    assert.equal((await q(n, `select public.cfg_ler()`)).length, 0);
    assert.equal((await q(n, `select public.cfg_item_endereco($1)`, [EXT])).length, 0);
    assert.equal((await q(n, `select * from public.mkt_contatos`)).length, 0);
    assert.equal((await q(n, `select * from public.mkt_contato_eventos`)).length, 0);
    for (const [sql, p] of ESCRITAS)
      await assert.rejects(q(n, sql, typeof p === "function" ? p() : p), /Sem acesso/, sql);
    for (const sql of [`select public.cfg_motor()`, `select public.cfg_escolher($1, now())`, `select public.cfg_item_entrega($1)`])
      await assert.rejects(q(n, sql, sql.includes("$1") ? [sql.includes("escolher") ? RE : EXT] : []), /permission denied/, sql);
  });
}

test("anônimo: nada executa e nada lê", async () => {
  await assert.rejects(q("anon", `select public.cfg_ler()`), /permission denied/);
  await assert.rejects(q("anon", `select public.cfg_item_endereco($1)`, [EXT]), /permission denied/);
  await assert.rejects(q("anon", `select public.cfg_salvar(false)`), /permission denied/);
  await assert.rejects(q("anon", `select * from public.mkt_contatos`), /permission denied/);
  await assert.rejects(q("anon", `select public.mkt_registrar_envio('{}')`), /permission denied/);
});

test("nada mudou depois das tentativas dos outros perfis", async () => {
  const [r] = await q(GG, `select public.cfg_ler() r`);
  assert.equal(r.r.ativo, true);
  assert.equal(r.r.destinos.length, 4);
  assert.equal(r.r.regras.length, 1);
  assert.equal(r.r.regras[0].ativa, true);
});

test("gerente geral não chama as funções da Edge Function; ele lê os contatos", async () => {
  for (const sql of [`select public.cfg_motor()`, `select public.cfg_escolher($1, now())`, `select public.cfg_item_entrega($1)`,
                     `select public.cfg_desfazer($1, $1, now())`, `select public.mkt_registrar_envio('{}')`])
    await assert.rejects(q(GG, sql, sql.includes("$1") ? [EXT] : []), /permission denied/, sql);
  assert.equal((await q(GG, `select * from public.mkt_contatos`)).length, 1);
  assert.equal((await q(GG, `select * from public.mkt_contato_eventos`)).length, 1);
});

test("endereço: a tela recebe só a versão mascarada, nunca o valor inteiro", async () => {
  const cheio = "contato.teste@exemplo-ficticio.com.br";
  const m = await um(GG, `select public.cfg_item_endereco($1) r`, [EXT]);
  assert.deepEqual(m, { email: "c••••@e••••.com.br" });
  const tela = JSON.stringify((await q(GG, `select public.cfg_ler() r`))[0].r);
  for (const pedaco of [cheio, "contato.teste", "exemplo-ficticio"]) {
    assert.ok(!JSON.stringify(m).includes(pedaco));
    assert.ok(!tela.includes(pedaco), `a tela não pode ter "${pedaco}"`);
  }

  // Endereço curto também sai mascarado.
  const curto = await um(GG, `select public.cfg_item_endereco_salvar($1, $2) r`, [REG, { email: "a@b.co" }]);
  assert.equal(curto.email, "a••••@b••••.co");
  assert.ok(!JSON.stringify(curto).includes("a@b.co"));

  // Porta: a chave nunca volta, nem mascarada.
  const chave = "chave-de-teste-" + randomBytes(8).toString("hex");
  const p = await um(GG, `select public.cfg_item_endereco_salvar($1, $2) r`,
    [PARC, { url: "https://leads.sistema-ficticio.com.br/entrada", chave }]);
  assert.deepEqual(p, { url: "https://l••••.com.br/••••", chave_definida: true });
  // Sem chave nova, mantém a guardada.
  await um(GG, `select public.cfg_item_endereco_salvar($1, $2) r`, [PARC, { url: "https://outro.sistema-ficticio.com.br/x" }]);
  const tudo = JSON.stringify(await q(GG, `select public.cfg_ler() r`)) + JSON.stringify(await q(GG, `select public.cfg_item_endereco($1) r`, [PARC]));
  assert.ok(!tudo.includes(chave) && !tudo.includes("sistema-ficticio"));

  // Só a chave de serviço recebe o valor inteiro, para a entrega.
  assert.deepEqual(await um("servico", `select public.cfg_item_entrega($1) r`, [EXT]), { email: cheio, modo: "email" });
  assert.deepEqual(await um("servico", `select public.cfg_item_entrega($1) r`, [PARC]),
    { url: "https://outro.sistema-ficticio.com.br/x", chave, modo: "porta" });
  assert.equal(await um("servico", `select public.cfg_item_entrega($1) r`, [VENDAS]), null);

  // O segredo tem nome neutro e um por destino.
  const nomes = (await linhas(`select name, description from vault.secrets order by name`));
  assert.equal(nomes.length, 3);
  for (const s of nomes) {
    assert.match(s.name, /^cfg_end_[0-9a-f]{32}$/);
    assert.equal(s.description, "cfg");
  }

  // Validação.
  await assert.rejects(q(GG, `select public.cfg_item_endereco_salvar($1, $2)`, [EXT, { email: "sem-arroba" }]), /e-mail válido/);
  await assert.rejects(q(GG, `select public.cfg_item_endereco_salvar($1, $2)`, [PARC, { url: "http://inseguro.test/x", chave }]), /https/);
  await assert.rejects(q(GG, `select public.cfg_item_endereco_salvar($1, $2)`, [VENDAS, { email: "a@b.co" }]), /Não encontrado/);
});

test("trocar o modo do destino apaga o endereço guardado", async () => {
  const x = await um(GG, `select public.cfg_item_salvar($1) r`, [{ nome: "Troca de modo", modo: "email" }]);
  await um(GG, `select public.cfg_item_endereco_salvar($1, $2) r`, [x, { email: "troca@exemplo.test" }]);
  await um(GG, `select public.cfg_item_salvar($1) r`, [{ id: x, nome: "Troca de modo", modo: "porta" }]);
  assert.equal((await q(GG, `select public.cfg_item_endereco($1)`, [x])).length, 0);
  await um(GG, `select public.cfg_item_excluir($1) r`, [x]);
  assert.equal((await linhas(`select count(*)::int n from vault.secrets`))[0].n, 3);
});

test("Base360 Vendas: não se edita, não se exclui e não se duplica", async () => {
  await assert.rejects(q(GG, `select public.cfg_item_salvar($1)`, [{ id: VENDAS, nome: "Outro nome", modo: "email" }]), /não se edita/);
  await assert.rejects(q(GG, `select public.cfg_item_excluir($1)`, [VENDAS]), /não pode ser excluído/);
  await assert.rejects(linhas(`delete from interno.direcionador_destinos where id = $1`, [VENDAS]), /não pode ser excluído/);
  await assert.rejects(linhas(`insert into interno.direcionador_destinos (tipo, nome) values ('vendas', 'Segundo')`), /duplicate key|unique/);
  await assert.rejects(q(GG, `select public.cfg_item_excluir($1)`, [EXT]), /Tire este destino das regras/);
});

test("regra: as partes precisam somar 100%, sem destino repetido", async () => {
  const base = { nome: "Inválida", partes: [] };
  await assert.rejects(q(GG, `select public.cfg_regra_salvar($1)`, [{ ...base, partes: [{ destino_id: EXT, porcentagem: 70 }, { destino_id: VENDAS, porcentagem: 20 }] }]), /somar 100% \(hoje: 90%\)/);
  await assert.rejects(q(GG, `select public.cfg_regra_salvar($1)`, [{ ...base, partes: [{ destino_id: EXT, porcentagem: 50 }, { destino_id: EXT, porcentagem: 50 }] }]), /uma vez só/);
  await assert.rejects(q(GG, `select public.cfg_regra_salvar($1)`, [base]), /para onde a regra manda/);
  await assert.rejects(q(GG, `select public.cfg_regra_salvar($1)`, [{ ...base, partes: [{ destino_id: EXT, porcentagem: 0 }, { destino_id: VENDAS, porcentagem: 100 }] }]), /de 1% a 100%/);
  await assert.rejects(q(GG, `select public.cfg_regra_salvar($1)`, [{ ...base, dias: [7], partes: [{ destino_id: VENDAS, porcentagem: 100 }] }]), /check constraint/);
  assert.equal((await linhas(`select count(*)::int n from interno.direcionador_regras`))[0].n, 1);
});

const escolher = (regra, quando) => um("servico", `select public.cfg_escolher($1, $2) r`, [regra, quando]);
const contadores = async (regra) =>
  Object.fromEntries((await linhas(`select destino_id, enviados from interno.direcionador_contadores where regra_id = $1`, [regra]))
    .map((x) => [x.destino_id, x.enviados]));

test("divisão exata: 10 leads numa regra 70/30 dão 7 e 3, e o empate vai à ordem da regra", async () => {
  const seq = [];
  for (let i = 0; i < 10; i++) {
    const r = await escolher(RE, "2026-11-07T13:00:00Z");
    assert.equal(r.motivo, "divisao");
    seq.push(r.destino_id === EXT ? "E" : "V");
  }
  assert.equal(seq[0], "E", "empate no zero: a primeira parte");
  assert.equal(seq.filter((s) => s === "E").length, 7);
  // Em nenhum momento a divisão se afasta mais de um lead da parte certa.
  seq.reduce((e, s, i) => {
    const ext = e + (s === "E" ? 1 : 0);
    assert.ok(Math.abs(ext - 0.7 * (i + 1)) <= 1, `lead ${i + 1}`);
    return ext;
  }, 0);
  const c = await contadores(RE);
  assert.equal(c[EXT], 7);
  assert.equal(c[VENDAS], 3);
  const dia = await linhas(`select destino_id, dia::text, total from interno.direcionador_contagem_dia order by total desc`);
  assert.deepEqual(dia, [{ destino_id: EXT, dia: "2026-11-07", total: 7 }, { destino_id: VENDAS, dia: "2026-11-07", total: 3 }]);
});

test("a tela mostra os contadores; ligar e mudar a ordem não zeram; salvar a regra zera", async () => {
  const partes = (await q(GG, `select public.cfg_ler() r`))[0].r.regras[0].partes;
  assert.deepEqual(partes.map((p) => p.enviados), [7, 3]);
  await um(GG, `select public.cfg_regra_ligar($1, false) r`, [RE]);
  await um(GG, `select public.cfg_regra_ligar($1, true) r`, [RE]);
  await um(GG, `select public.cfg_regra_ordem($1) r`, [[RE]]);
  assert.equal((await contadores(RE))[EXT], 7);
  await um(GG, `select public.cfg_regra_salvar($1) r`, [{
    id: RE, nome: "Regra de teste", fontes: ["zap"], dias: [0, 6],
    partes: [{ destino_id: EXT, porcentagem: 70 }, { destino_id: VENDAS, porcentagem: 30 }],
  }]);
  assert.deepEqual(await contadores(RE), {});
});

test("ordem das regras: a lista precisa ter todas, uma vez cada", async () => {
  const R2 = await um(GG, `select public.cfg_regra_salvar($1) r`, [{ nome: "Segunda", partes: [{ destino_id: VENDAS, porcentagem: 100 }] }]);
  await assert.rejects(q(GG, `select public.cfg_regra_ordem($1)`, [[RE]]), /todas as regras/);
  await assert.rejects(q(GG, `select public.cfg_regra_ordem($1)`, [[RE, RE]]), /todas as regras/);
  await um(GG, `select public.cfg_regra_ordem($1) r`, [[R2, RE]]);
  const regras = (await q(GG, `select public.cfg_ler() r`))[0].r.regras;
  assert.deepEqual(regras.map((r) => r.id), [R2, RE]);
  // O motor recebe só as regras ligadas, na ordem, sem o nome.
  await um(GG, `select public.cfg_regra_ligar($1, false) r`, [R2]);
  const motor = await um("servico", `select public.cfg_motor() r`);
  assert.deepEqual(motor.regras.map((r) => r.id), [RE]);
  assert.equal(motor.regras[0].nome, undefined);
  assert.equal(motor.vendas_id, VENDAS);
  assert.ok(!JSON.stringify(motor).includes("contato.teste"), "o motor não leva endereço");
  assert.equal(motor.fontes.length, 6);
  await um(GG, `select public.cfg_regra_excluir($1) r`, [R2]);
});

test("chave geral desligada, regra desligada e destino desligado vão para o Vendas, sem contar", async () => {
  await um(GG, `select public.cfg_salvar(false) r`);
  assert.deepEqual(await escolher(RE, "2026-11-08T13:00:00Z"),
    { destino_id: VENDAS, tipo: "vendas", modo: null, registrar_envios: false, motivo: "desligado", dia: "2026-11-08" });
  await um(GG, `select public.cfg_salvar(true) r`);
  await um(GG, `select public.cfg_regra_ligar($1, false) r`, [RE]);
  assert.equal((await escolher(RE, "2026-11-08T13:00:00Z")).motivo, "regra_inativa");
  await um(GG, `select public.cfg_regra_ligar($1, true) r`, [RE]);
  assert.deepEqual(await contadores(RE), {});

  // Destino externo desligado: a parte é pulada, sobra o Vendas pela divisão.
  await um(GG, `select public.cfg_item_salvar($1) r`, [{ id: EXT, nome: "Externo sem registro", modo: "email", ativo: false }]);
  const r = await escolher(RE, "2026-11-08T13:00:00Z");
  assert.equal(r.destino_id, VENDAS);
  assert.equal(r.motivo, "divisao");
  await um(GG, `select public.cfg_item_salvar($1) r`, [{ id: EXT, nome: "Externo sem registro", modo: "email", ativo: true }]);
  // O endereço continua lá (o modo não mudou).
  assert.equal((await q(GG, `select public.cfg_item_endereco($1)`, [EXT])).length, 1);
});

test("limite do dia: passou do teto, o resto do dia vai para o Vendas; o dia é o de São Paulo", async () => {
  const RL = await um(GG, `select public.cfg_regra_salvar($1) r`, [{ nome: "Limite", partes: [{ destino_id: PARC, porcentagem: 100 }] }]);
  // 05/11 10h e 05/11 23h30 em São Paulo (06/11 02h30 em UTC) são o mesmo dia.
  assert.equal((await escolher(RL, "2026-11-05T13:00:00Z")).destino_id, PARC);
  const segundo = await escolher(RL, "2026-11-06T02:30:00Z");
  assert.equal(segundo.destino_id, PARC);
  assert.equal(segundo.dia, "2026-11-05");
  const terceiro = await escolher(RL, "2026-11-06T02:40:00Z");
  assert.deepEqual([terceiro.destino_id, terceiro.motivo], [VENDAS, "limite"]);
  assert.equal((await contadores(RL))[PARC], 2, "o lead do limite não conta");
  // 06/11 em São Paulo: um dia novo.
  const novo = await escolher(RL, "2026-11-06T03:00:00Z");
  assert.deepEqual([novo.destino_id, novo.dia], [PARC, "2026-11-06"]);

  // A entrega falhou: desfazer tira o 1 do contador e do dia.
  await um("servico", `select public.cfg_desfazer($1, $2, $3) r`, [RL, PARC, "2026-11-06T03:00:00Z"]);
  assert.equal((await contadores(RL))[PARC], 2);
  const dia = await linhas(`select total from interno.direcionador_contagem_dia where destino_id = $1 and dia = '2026-11-06'`, [PARC]);
  assert.equal(dia[0].total, 0);
  // Desfazer de novo não fica negativo.
  await um("servico", `select public.cfg_desfazer($1, $2, $3) r`, [RL, PARC, "2026-11-06T03:00:00Z"]);
  assert.equal((await linhas(`select total from interno.direcionador_contagem_dia where destino_id = $1 and dia = '2026-11-06'`, [PARC]))[0].total, 0);
  // A tela mostra o total de hoje de cada destino (hoje = agora, sem envios).
  const d = (await q(GG, `select public.cfg_ler() r`))[0].r.destinos.find((x) => x.id === PARC);
  assert.equal(d.limite_dia, 2);
  await um(GG, `select public.cfg_regra_excluir($1) r`, [RL]);
});

test("registro dos envios: só com a chave ligada; sem ela, nada fica", async () => {
  const antes = async () => (await linhas(`select (select count(*) from public.mkt_contatos)::int c, (select count(*) from public.mkt_contato_eventos)::int e`))[0];
  const inicio = await antes();
  const lead = { nome: "Outra Pessoa Fictícia", telefone: "11 90000-0002", email: "outra@exemplo.test", fonte: "olx",
                 quando: "2026-11-05T16:00:00Z", entrada_id: "<m2@exemplo.test>" };
  for (const destino_id of [EXT, VENDAS, PARC, null])
    assert.equal(await um("servico", `select public.mkt_registrar_envio($1) r`, [{ ...lead, destino_id }]), null);
  assert.deepEqual(await antes(), inicio, "destino sem registro não deixa contato nem evento");

  // Ligado: a mesma entrada não duplica; a mesma pessoa vira um contato só.
  const e1 = await um("servico", `select public.mkt_registrar_envio($1) r`, [{ ...lead, destino_id: REG }]);
  const e1b = await um("servico", `select public.mkt_registrar_envio($1) r`, [{ ...lead, destino_id: REG }]);
  assert.equal(e1, e1b);
  await um("servico", `select public.mkt_registrar_envio($1) r`, [{ ...lead, telefone: "(11) 90000-0002", entrada_id: "<m3@exemplo.test>", destino_id: REG }]);
  const fim = await antes();
  assert.equal(fim.c, inicio.c + 1);
  assert.equal(fim.e, inicio.e + 2);
  const [c] = await q(GG, `select nome, telefone, email from public.mkt_contatos where telefone = '11900000002'`);
  assert.deepEqual(c, { nome: lead.nome, telefone: "11900000002", email: lead.email });
  const ev = await q(GG, `select tipo, parceiro_id, fonte from public.mkt_contato_eventos where entrada_id = '<m2@exemplo.test>'`);
  assert.deepEqual(ev, [{ tipo: "enviado_parceiro", parceiro_id: REG, fonte: "olx" }]);
});

test("segredo do agendador da entrada: só a chave de serviço confere, e só o segredo certo", async () => {
  const certo = "e".repeat(64);
  await db.query(`insert into vault.secrets (name, description, secret) values ('entrada_segredo', 'x', $1)`, [certo]);
  assert.equal(await um("servico", `select public.entrada_segredo_ok($1) r`, [certo]), true);
  for (const errado of ["e".repeat(63) + "f", "e".repeat(31), "", null])
    assert.equal(await um("servico", `select public.entrada_segredo_ok($1) r`, [errado]), false, String(errado));
  for (const n of [GG, COR, "anon"])
    await assert.rejects(q(n, `select public.entrada_segredo_ok($1)`, [certo]), /permission denied/, String(n));
  await db.query(`delete from vault.secrets where name = 'entrada_segredo'`);
});

test("turno da entrada: uma passada por vez; só o dono devolve; vence sozinho", async () => {
  const A = "00000000-0000-0000-0000-0000000000a1", B = "00000000-0000-0000-0000-0000000000b2";
  const pegar = (dono) => um("servico", `select public.entrada_turno_pegar($1) r`, [dono]);
  const devolver = (dono) => um("servico", `select public.entrada_turno_devolver($1) r`, [dono]);
  assert.equal(await pegar(A), true);
  assert.equal(await pegar(B), false, "outra passada no meio não pega");
  assert.equal(await pegar(A), false, "nem a mesma pega duas vezes");
  assert.equal(await devolver(B), false, "só o dono devolve");
  assert.equal(await devolver(A), true);
  assert.equal(await pegar(B), true);
  // A passada B caiu sem devolver: o turno vence sozinho.
  await db.exec(`update interno.entrada_turno set ate = clock_timestamp() - interval '1 second'`);
  assert.equal(await pegar(A), true);
  assert.equal(await devolver(A), true);
  assert.equal(await pegar(null), false);
  for (const n of [GG, COR, "anon"]) {
    await assert.rejects(q(n, `select public.entrada_turno_pegar($1)`, [A]), /permission denied/, String(n));
    await assert.rejects(q(n, `select public.entrada_turno_devolver($1)`, [A]), /permission denied/, String(n));
  }
});

test("regra pura (marketing/src/lib/direcionador.ts) e cfg_escolher dão o mesmo resultado nos mesmos casos", async () => {
  // Três regras com divisões diferentes (uma com o Vendas primeiro) e o destino
  // com limite de 2 por dia; 80 leads em dois dias de São Paulo, com horários
  // perto da meia-noite, regra e destino desligados no meio.
  const parte = (destino_id, porcentagem) => ({ destino_id, porcentagem });
  const ids = [];
  for (const partes of [
    [parte(EXT, 70), parte(VENDAS, 30)],
    [parte(EXT, 50), parte(PARC, 25), parte(VENDAS, 25)],
    [parte(VENDAS, 33), parte(EXT, 67)],
  ]) ids.push(await um(GG, `select public.cfg_regra_salvar($1) r`, [{ nome: `Paridade ${ids.length + 1}`, partes }]));

  const quandos = ["2026-12-01T12:00:00Z", "2026-12-02T02:59:00Z", "2026-12-02T03:00:00Z", "2026-12-02T20:00:00Z"];
  let semente = 7;
  const sorteio = (n) => ((semente = (semente * 1103515245 + 12345) % 2147483648), semente % n);
  const cont = {}, totais = {}, motivos = new Set();
  for (let i = 0; i < 80; i++) {
    const regraId = ids[sorteio(3)];
    const quando = quandos[Math.min(3, Math.floor(i / 20))];
    if (i === 30) await um(GG, `select public.cfg_regra_ligar($1, false) r`, [ids[0]]);
    if (i === 36) await um(GG, `select public.cfg_regra_ligar($1, true) r`, [ids[0]]);
    if (i === 50) await um(GG, `select public.cfg_item_salvar($1) r`, [{ id: EXT, nome: "Externo sem registro", modo: "email", ativo: false }]);
    if (i === 60) await um(GG, `select public.cfg_item_salvar($1) r`, [{ id: EXT, nome: "Externo sem registro", modo: "email", ativo: true }]);

    // O que a regra pura recebe: os destinos de cfg_motor e a regra como a tela lê.
    const motor = await um("servico", `select public.cfg_motor() r`);
    const regra = (await q(GG, `select public.cfg_ler() r`))[0].r.regras.find((r) => r.id === regraId);
    const dia = momentoSP(quando).data;
    const pura = escolherNaRegra(motor, regra, cont[regraId] ?? {}, totais[dia] ?? {});
    const banco = await escolher(regraId, quando);
    assert.deepEqual([pura.destino_id, pura.motivo], [banco.destino_id, banco.motivo], `lead ${i + 1}`);
    assert.equal(dia, banco.dia, `dia do lead ${i + 1}`);
    motivos.add(banco.motivo);
    const s = somar(pura, cont[regraId] ?? {}, totais[dia] ?? {});
    cont[regraId] = s.contadores;
    totais[dia] = s.totaisDoDia;
  }
  // No fim, os contadores somados pela regra pura são os do banco.
  for (const regraId of ids) assert.deepEqual(cont[regraId] ?? {}, await contadores(regraId), regraId);
  assert.deepEqual([...motivos].sort(), ["divisao", "limite", "regra_inativa"], "os casos passaram por todos os caminhos");
  for (const r of ids) await um(GG, `select public.cfg_regra_excluir($1) r`, [r]);
});
test("rodar o SQL de novo não desfaz o que o gerente geral ajustou", async () => {
  await db.exec(`update interno.lead_fontes set remetentes = '{leads@portal.test}' where slug = 'zap'`);
  await db.exec(ler("direcionador.sql"));
  const [r] = await q(GG, `select public.cfg_ler() r`);
  assert.equal(r.r.ativo, true);
  assert.equal(r.r.destinos.length, 4);
  assert.equal(r.r.destinos.filter((d) => d.tipo === "vendas").length, 1);
  assert.equal(r.r.regras.length, 1);
  assert.equal((await q(GG, `select public.cfg_item_endereco($1)`, [EXT])).length, 1);
  assert.deepEqual((await linhas(`select remetentes from interno.lead_fontes where slug = 'zap'`))[0].remetentes, ["leads@portal.test"]);
});

test("sigilo: o SQL e este teste não têm nome de destino nem seed de destino externo", async () => {
  const proibidos = [/distribui[çc][ãa]o\s+manual/i];
  for (const arq of ["direcionador.sql", "testes/direcionador.test.mjs"]) {
    const texto = ler(arq);
    for (const p of proibidos) assert.ok(!p.test(texto), `${arq} cita ${p}`);
  }
  const sql = ler("direcionador.sql");
  // Nenhuma chave estrangeira do esquema exposto aponta para o esquema interno.
  const fks = await linhas(`select conname from pg_constraint where contype = 'f'
    and connamespace = 'public'::regnamespace and confrelid::regclass::text like 'interno.%'`);
  assert.deepEqual(fks, []);
  // Fora dos corpos de função ($$ … $$), nenhum insert cria destino externo.
  const foraDasFuncoes = sql.replace(/\$\$[\s\S]*?\$\$/g, "");
  assert.ok(/insert into interno\.direcionador_destinos/i.test(foraDasFuncoes), "o seed do Vendas está lá");
  assert.ok(!/insert into interno\.direcionador_destinos[^;]*'externo'/i.test(foraDasFuncoes), "o seed não cria destino externo");
  // Nomes e parâmetros das funções públicas são neutros (aparecem na API).
  const publicas = [...sql.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)/g)];
  assert.ok(publicas.length >= 10);
  for (const [, nome, params] of publicas)
    assert.ok(!/direcionador|destino|distribui/i.test(nome + params), `${nome}(${params})`);
});

// ---------------------------------------------------------------------
// Concorrência de verdade: vários leads ao mesmo tempo, cada um na sua
// conexão, como a Edge Function no Supabase. Postgres local numa pasta
// temporária, numa porta própria; pulado se não subir.
// ---------------------------------------------------------------------
let servidor, pasta;
after(async () => {
  await servidor?.stop().catch(() => {});
  if (pasta) rmSync(pasta, { recursive: true, force: true });
});

test("concorrência: 20 leads ao mesmo tempo não repetem o contador nem passam do limite", async (t) => {
  let EmbeddedPostgres, pg;
  try {
    EmbeddedPostgres = (await import("embedded-postgres")).default;
    pg = (await import("pg")).default;
  } catch {
    t.skip("embedded-postgres não instalado");
    return;
  }
  const porta = Number(process.env.DIRECIONADOR_PG_PORTA ?? 54339);
  const senha = randomBytes(18).toString("base64url");
  pasta = mkdtempSync(join(tmpdir(), "direcionador-pg-"));
  servidor = new EmbeddedPostgres({
    databaseDir: join(pasta, "pg"), user: "postgres", password: senha, port: porta, persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"], onLog: () => {}, onError: () => {},
    postgresFlags: ["-c", "listen_addresses=127.0.0.1", "-c", "max_connections=40"],
  });
  try {
    await servidor.initialise();
    await servidor.start();
  } catch (e) {
    servidor = null;
    t.skip(`Postgres local não subiu: ${e.message ?? e}`);
    return;
  }
  const conexao = { host: "127.0.0.1", port: porta, user: "postgres", password: senha, database: "postgres" };
  const admin = new pg.Client(conexao);
  await admin.connect();
  await admin.query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;`);
  await admin.query(AMBIENTE);
  await admin.query(ler("schema.sql"));
  await admin.query(ler("direcionador.sql"));
  await admin.query(`insert into auth.users (id, email) values ('${id(GG)}', 'gg@exemplo.test')`);
  await admin.query(`update public.profiles set perfil = 'gerente_geral', ativo = true where id = '${id(GG)}'`);

  const comoGG = async (sql, p) => {
    await admin.query(`begin; set local role authenticated; select set_config('request.jwt.claim.sub', '${id(GG)}', true)`);
    try {
      const r = (await admin.query(sql, p)).rows[0]?.r;
      await admin.query("commit");
      return r;
    } catch (e) {
      await admin.query("rollback");
      throw e;
    }
  };
  const vendas = (await admin.query(`select id from interno.direcionador_destinos where tipo = 'vendas'`)).rows[0].id;
  const a = await comoGG(`select public.cfg_item_salvar($1) r`, [JSON.stringify({ nome: "Concorrência A", modo: "email" })]);
  const b = await comoGG(`select public.cfg_item_salvar($1) r`, [JSON.stringify({ nome: "Concorrência B", modo: "email", limite_dia: 5 })]);
  const r7030 = await comoGG(`select public.cfg_regra_salvar($1) r`, [JSON.stringify({ nome: "70/30", partes: [{ destino_id: a, porcentagem: 70 }, { destino_id: vendas, porcentagem: 30 }] })]);
  const rLim = await comoGG(`select public.cfg_regra_salvar($1) r`, [JSON.stringify({ nome: "Limite 5", partes: [{ destino_id: b, porcentagem: 100 }] })]);
  await comoGG(`select public.cfg_salvar(true) r`);

  const pool = new pg.Pool({ ...conexao, max: 20 });
  const escolherJunto = (regra, n) => Promise.all(Array.from({ length: n }, async () => {
    const c = await pool.connect();
    try {
      await c.query(`begin; set local role service_role`);
      // Segura a transação um pouco depois da escolha, para as outras esperarem a trava.
      const r = (await c.query(`select public.cfg_escolher($1, '2026-11-07T13:00:00Z') r`, [regra])).rows[0].r;
      await c.query(`select pg_sleep(0.02)`);
      await c.query("commit");
      return r;
    } finally {
      c.release();
    }
  }));
  try {
    const div = await escolherJunto(r7030, 20);
    assert.equal(div.filter((r) => r.destino_id === a).length, 14);
    assert.equal(div.filter((r) => r.destino_id === vendas).length, 6);
    const cont = (await admin.query(`select destino_id, enviados from interno.direcionador_contadores where regra_id = $1`, [r7030])).rows;
    assert.equal(cont.find((x) => x.destino_id === a).enviados, 14);
    assert.equal(cont.find((x) => x.destino_id === vendas).enviados, 6);

    const lim = await escolherJunto(rLim, 20);
    assert.equal(lim.filter((r) => r.destino_id === b).length, 5);
    assert.equal(lim.filter((r) => r.motivo === "limite").length, 15);
    const dia = (await admin.query(`select total from interno.direcionador_contagem_dia where destino_id = $1`, [b])).rows[0].total;
    assert.equal(dia, 5);

    // Turno: 10 passadas ao mesmo tempo, só uma pega.
    const turnos = await Promise.all(Array.from({ length: 10 }, async (_, i) => {
      const c = await pool.connect();
      try {
        await c.query(`begin; set local role service_role`);
        const r = (await c.query(`select public.entrada_turno_pegar($1) r`, [randomUUID()])).rows[0].r;
        await c.query(`select pg_sleep(0.02)`);
        await c.query("commit");
        return r;
      } finally {
        c.release();
      }
    }));
    assert.equal(turnos.filter(Boolean).length, 1);
  } finally {
    await pool.end();
    await admin.end();
  }
});
