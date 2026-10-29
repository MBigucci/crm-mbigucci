// Teste do schema, do RLS e dos gatilhos de vendas e metas num Postgres local (PGlite).
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
const hoje = `(now() at time zone 'America/Sao_Paulo')::date`;
const venda = (leadId, vgv = 480000, extra = "") =>
  `insert into public.vendas (lead_id, empreendimento, unidade, vgv, assinada_em${extra ? ", pagamento, pago_em" : ""})
   values ('${leadId}', 'Marco Zero One', 'Apto 52', ${vgv}, ${hoje}${extra})`;
const vendaDe = async (leadId) =>
  (await linhas(`select * from public.vendas where lead_id = $1 order by created_at desc, id desc limit 1`, [leadId]))[0];
const etapa = async (leadId) => (await linhas(`select etapa from public.leads where id = $1`, [leadId]))[0].etapa;
const eventos = (leadId) =>
  linhas(`select tipo, de, para, detalhe, autor_id, automatico, venda_id from public.lead_eventos
          where lead_id = $1 and tipo like 'venda%' order by criado_em, id`, [leadId]);
const corrigir = (vendaId, campos, motivo) =>
  `select public.corrigir_venda('${vendaId}', '${JSON.stringify(campos)}'::jsonb, ${motivo === null ? "null" : `'${motivo}'`})`;

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

test("permissões: padrões só na criação, e nada sigiloso no catálogo que todos leem", async () => {
  const rp = await linhas(`select perfil, permissao from public.role_permissions
                           where permissao in ('vendas.corrigir_equipe', 'metas.definir_vgv', 'painel.campanha') order by 2`);
  assert.deepEqual(rp, [
    { perfil: "corretor", permissao: "painel.campanha" },
    { perfil: "gerente", permissao: "vendas.corrigir_equipe" },
  ]);
  await db.exec(`delete from public.role_permissions where permissao = 'vendas.corrigir_equipe'`);
  await db.exec(schema);
  assert.equal((await linhas(`select count(*)::int n from public.role_permissions where permissao = 'vendas.corrigir_equipe'`))[0].n, 0);
  await db.exec(`insert into public.role_permissions values ('gerente', 'vendas.corrigir_equipe')`);

  const catalogo = (await como(CA, () => linhas(`select slug || ' ' || descricao t from public.permissions`))).map((r) => r.t).join(" ");
  assert.doesNotMatch(catalogo, /verba|premia|prêmio|pontu|ranking/i);
});

test("registrar: o dono do lead registra, o lead vai para venda e o histórico grava", async () => {
  const ana = await idLead("Ana");
  await como(CA, () => db.exec(venda(ana)));
  const v = await vendaDe(ana);
  assert.equal(v.corretor_id, id(CA));
  assert.equal(v.registrada_por, id(CA));
  assert.equal(v.status, "ativa");
  assert.equal(v.pagamento, "pendente");
  assert.equal(Number(v.vgv), 480000);
  assert.equal(await etapa(ana), "venda");
  const [et] = await linhas(`select de, para, automatico, autor_id from public.lead_eventos where lead_id = $1 and tipo = 'etapa'`, [ana]);
  assert.deepEqual(et, { de: "novo", para: "venda", automatico: true, autor_id: id(CA) });
  assert.deepEqual(await eventos(ana), [
    { tipo: "venda", de: null, para: "ativa", detalhe: null, autor_id: id(CA), automatico: false, venda_id: v.id },
  ]);
});

test("registrar: não no lead de outro, não no futuro, não em lead descartado, nem o gerente", async () => {
  const bruno = await idLead("Bruno");
  await falha(CA, venda(await idLead("Duda")), "row-level security");
  await falha(GA, venda(bruno), "row-level security");
  await falha(GG, venda(bruno), "row-level security");
  await falha(REC, venda(bruno), "row-level security");
  await falha(0, venda(bruno), "permission denied");
  await falha(CA, `insert into public.vendas (lead_id, empreendimento, vgv, assinada_em) values ('${bruno}', 'X', 1, ${hoje} + 1)`, "depois de hoje");
  await falha(CA, `insert into public.vendas (lead_id, empreendimento, vgv, assinada_em) values ('${bruno}', 'X', 0, ${hoje})`, "vendas_vgv_check");
  await falha(CA, venda(bruno, 1, `, 'pago', null`), "vendas_pagamento_tem_data");
  await falha(CA, `insert into public.vendas (lead_id, empreendimento, vgv, assinada_em, status) values ('${bruno}', 'X', 1, ${hoje}, 'cancelada')`, "permission denied");
  await falha(CA, `insert into public.vendas (lead_id, corretor_id, empreendimento, vgv, assinada_em) values ('${bruno}', '${id(CA2)}', 'X', 1, ${hoje})`, "permission denied");

  const caio = await idLead("Caio");
  await como(CA, () => db.exec(`update public.leads set status = 'descartado', motivo_descarte = 'sem_interesse' where id = '${caio}'`));
  await falha(CA, venda(caio), "lead ativo");
  await como(CA, () => db.exec(`update public.leads set status = 'ativo', motivo_descarte = null where id = '${caio}'`));
});

test("etapa venda: só pelo registro da venda, nunca à mão", async () => {
  await falha(CA, `update public.leads set etapa = 'venda' where nome = 'Bruno'`, "Registre a venda");
  assert.equal(await etapa(await idLead("Bruno")), "novo");
  // Pelo SQL Editor, sem usuário logado, a correção continua possível.
  await db.exec(`update public.leads set etapa = 'venda' where nome = 'Fábio'`);
  assert.equal(await etapa(await idLead("Fábio")), "venda");
});

test("leitura: o corretor vê as dele, o gerente as da equipe, o gerente geral todas", async () => {
  await como(CA2, async () => db.exec(venda(await idLead("Duda"), 300000, `, 'pago', ${hoje}`)));
  await como(CB, async () => db.exec(venda(await idLead("Edu"), 900000)));
  const vgvs = async (n) =>
    (await como(n, () => linhas(`select vgv::int v from public.vendas order by vgv`))).map((r) => r.v);
  assert.deepEqual(await vgvs(CA), [480000]);
  assert.deepEqual(await vgvs(CA2), [300000]);
  assert.deepEqual(await vgvs(CB), [900000]);
  assert.deepEqual(await vgvs(GA), [300000, 480000]);
  assert.deepEqual(await vgvs(GB), [900000]);
  assert.deepEqual(await vgvs(GG), [300000, 480000, 900000]);
  assert.deepEqual(await vgvs(REC), []);
  assert.deepEqual(await vgvs(DES), []);
  await falha(0, `select * from public.vendas`, "permission denied");
});

test("pagamento: o corretor marca como paga sem motivo; o resto, não", async () => {
  const ana = await idLead("Ana");
  const v = await vendaDe(ana);
  await falha(CA, `update public.vendas set pagamento = 'pago' where id = '${v.id}'`, "vendas_pagamento_tem_data");
  await falha(CA, `update public.vendas set pagamento = 'pago', pago_em = ${hoje} + 1 where id = '${v.id}'`, "depois de hoje");
  await como(CA, () => db.exec(`update public.vendas set pagamento = 'pago', pago_em = ${hoje} where id = '${v.id}'`));
  assert.equal((await vendaDe(ana)).pagamento, "pago");
  const ev = (await eventos(ana)).at(-1);
  assert.deepEqual([ev.tipo, ev.de, ev.para, ev.detalhe, ev.autor_id], ["venda_pagamento", "pendente", "pago", null, id(CA)]);

  // Voltar para pendente, mudar o VGV ou a observação: só a correção, com motivo, e só o gerente.
  await falha(CA, `update public.vendas set pagamento = 'pendente', pago_em = null where id = '${v.id}'`, "use Corrigir");
  await falha(CA, `update public.vendas set vgv = 1 where id = '${v.id}'`, "use Corrigir");
  await falha(CA, `update public.vendas set observacao = 'x' where id = '${v.id}'`, "use Corrigir");
  await falha(CA, corrigir(v.id, { vgv: 1 }, "Digitei errado"), "Só o gerente");
  await falha(CA, `update public.vendas set corretor_id = '${id(CA2)}' where id = '${v.id}'`, "permission denied");
  await falha(CA, `update public.vendas set registrada_por = '${id(CA2)}' where id = '${v.id}'`, "permission denied");
  await falha(CA, `update public.vendas set motivo_cancelamento = 'x' where id = '${v.id}'`, "permission denied");
  await falha(CA, `delete from public.vendas where id = '${v.id}'`, "permission denied");
  await falha(CA, `update public.lead_eventos set detalhe = 'x' where venda_id = '${v.id}'`, "permission denied");
  assert.equal(Number((await vendaDe(ana)).vgv), 480000);
});

test("correção: o gerente corrige a venda da equipe com o motivo, e o histórico guarda o antes e o depois", async () => {
  const ana = await idLead("Ana");
  const v = await vendaDe(ana);
  await falha(GA, `update public.vendas set vgv = 500000 where id = '${v.id}'`, "use Corrigir");
  await falha(GA, corrigir(v.id, { vgv: 500000 }, "ok"), "motivo");
  await falha(GA, corrigir(v.id, { vgv: 500000 }, null), "motivo");
  await falha(GB, corrigir(v.id, { vgv: 500000 }, "Valor do contrato"), "não encontrada");
  await falha(REC, corrigir(v.id, { vgv: 500000 }, "Valor do contrato"), "não encontrada");
  await falha(0, corrigir(v.id, { vgv: 500000 }, "Valor do contrato"), "permission denied");

  await como(GA, () => db.exec(corrigir(v.id, { vgv: 500000, unidade: "Apto 53" }, "Valor do contrato")));
  const c = await vendaDe(ana);
  assert.equal(Number(c.vgv), 500000);
  assert.equal(c.unidade, "Apto 53");
  assert.equal(c.registrada_por, id(CA));
  const ev = (await eventos(ana)).at(-1);
  assert.equal(ev.tipo, "venda_correcao");
  assert.equal(ev.detalhe, "Valor do contrato");
  assert.equal(ev.autor_id, id(GA));
  assert.deepEqual(JSON.parse(ev.de), { vgv: 480000, unidade: "Apto 52" });
  assert.deepEqual(JSON.parse(ev.para), { vgv: 500000, unidade: "Apto 53" });

  // Voltar para pendente é correção: o pagamento sai com o motivo.
  await como(GA, () => db.exec(corrigir(v.id, { pagamento: "pendente", pago_em: null }, "Boleto devolvido")));
  const p = (await eventos(ana)).at(-1);
  assert.deepEqual([p.tipo, p.de, p.para, p.detalhe], ["venda_pagamento", "pago", "pendente", "Boleto devolvido"]);
  // O gerente também marca como paga, sem motivo (o andamento normal).
  await como(GA, () => db.exec(`update public.vendas set pagamento = 'pago', pago_em = ${hoje} where id = '${v.id}'`));
  // O gerente geral corrige em qualquer equipe.
  const edu = await vendaDe(await idLead("Edu"));
  await como(GG, () => db.exec(corrigir(edu.id, { assinada_em: "2026-10-01" }, "Data do contrato")));
  assert.equal((await vendaDe(await idLead("Edu"))).assinada_em.toISOString().slice(0, 10), "2026-10-01");
  await falha(GG, corrigir(edu.id, { assinada_em: "2099-01-01" }, "Data do contrato"), "depois de hoje");
});

test("cancelar e reativar: com motivo, sem apagar, e o lead volta para proposta", async () => {
  const ana = await idLead("Ana");
  const v = await vendaDe(ana);
  await falha(CA, corrigir(v.id, { status: "cancelada" }, "Cliente desistiu"), "Só o gerente");
  await falha(GA, `update public.vendas set status = 'cancelada' where id = '${v.id}'`, "use Corrigir");
  await como(GA, () => db.exec(corrigir(v.id, { status: "cancelada" }, "Cliente desistiu")));
  const c = await vendaDe(ana);
  assert.equal(c.status, "cancelada");
  assert.equal(c.motivo_cancelamento, "Cliente desistiu");
  assert.equal(c.cancelada_por, id(GA));
  assert.ok(c.cancelada_em);
  assert.equal(await etapa(ana), "proposta");
  const ev = (await eventos(ana)).at(-1);
  assert.deepEqual([ev.tipo, ev.de, ev.para, ev.detalhe, ev.autor_id], ["venda", "ativa", "cancelada", "Cliente desistiu", id(GA)]);
  await falha(GA, corrigir(v.id, { vgv: 1 }, "Ajuste"), "Reative");

  await como(GA, () => db.exec(corrigir(v.id, { status: "ativa" }, "Cliente voltou")));
  const r = await vendaDe(ana);
  assert.equal(r.status, "ativa");
  assert.equal(r.motivo_cancelamento, null);
  assert.equal(r.cancelada_por, null);
  assert.equal(await etapa(ana), "venda");
  assert.equal((await linhas(`select count(*)::int n from public.vendas`))[0].n, 3);
});

test("meta anual de VGV: o gerente geral define o geral e por corretor; cada um vê o que pode", async () => {
  await como(GG, () => db.exec(`insert into public.metas_vgv (ano, valor) values (2026, 12000000)`));
  await como(GG, () => db.exec(`insert into public.metas_vgv (ano, corretor_id, valor) values (2026, '${id(CA)}', 8000000), (2026, '${id(CB)}', 9000000)`));
  await falha(GG, `insert into public.metas_vgv (ano, valor) values (2026, 1)`, "metas_vgv_unica");
  await falha(GG, `insert into public.metas_vgv (ano, corretor_id, valor) values (2026, '${id(GA)}', 1)`, "só para corretores");
  await falha(GA, `insert into public.metas_vgv (ano, corretor_id, valor) values (2027, '${id(CA)}', 1)`, "row-level security");
  await falha(CA, `insert into public.metas_vgv (ano, valor) values (2027, 1)`, "row-level security");
  await como(CA, () => db.exec(`update public.metas_vgv set valor = 1`));
  await como(GA, () => db.exec(`delete from public.metas_vgv`));
  assert.equal((await linhas(`select count(*)::int n from public.metas_vgv`))[0].n, 3);

  const ve = async (n) =>
    (await como(n, () => linhas(`select coalesce(corretor_id::text, 'geral') c from public.metas_vgv order by valor`))).map((r) => r.c);
  assert.deepEqual(await ve(CA), [id(CA), "geral"]);
  assert.deepEqual(await ve(CA2), ["geral"]);
  assert.deepEqual(await ve(GA), [id(CA), "geral"]);
  assert.deepEqual(await ve(GB), [id(CB), "geral"]);
  assert.deepEqual(await ve(GG), [id(CA), id(CB), "geral"]);
  assert.deepEqual(await ve(DES), []);

  await como(GG, () => db.exec(`update public.metas_vgv set valor = 7500000 where corretor_id = '${id(CA)}'`));
  const [m] = await linhas(`select valor::int v, atualizado_por from public.metas_vgv where corretor_id = $1`, [id(CA)]);
  assert.deepEqual(m, { v: 7500000, atualizado_por: id(GG) });
});

test("metas próprias: o corretor cria, sem duplicar métrica e período; o gerente só vê", async () => {
  const meta = (x) => `insert into public.metas (metrica, periodo, inicio, meses, valor) values (${x})`;
  await como(CA, () => db.exec(meta(`'vendas', 'mes', null, null, 2`)));
  await como(CA, () => db.exec(meta(`'vgv', 'ano', null, null, 1500000.50`)));
  await como(CA, () => db.exec(meta(`'visitas', 'personalizado', '2026-11-01', 3, 12`)));
  await como(CA, () => db.exec(meta(`'visitas', 'personalizado', '2026-11-01', 6, 20`)));
  await falha(CA, meta(`'vendas', 'mes', null, null, 3`), "metas_sem_duplicar");
  await falha(CA, meta(`'visitas', 'personalizado', '2026-11-01', 3, 5`), "metas_sem_duplicar");
  await falha(CA, meta(`'visitas', 'personalizado', '2026-11-15', 3, 5`), "metas_inicio_no_dia_1");
  await falha(CA, meta(`'visitas', 'personalizado', null, null, 5`), "metas_personalizado");
  await falha(CA, meta(`'leads', 'mes', null, null, 2.5`), "metas_contagem_inteira");
  await falha(CA, meta(`'comissao', 'mes', null, null, 2`), "metas_metrica_check");
  await como(CA2, () => db.exec(meta(`'vendas', 'mes', null, null, 1`)));
  await falha(GA, meta(`'vendas', 'mes', null, null, 1`), "row-level security");
  await falha(CA, `insert into public.metas (dono_id, metrica, periodo, valor) values ('${id(CA2)}', 'leads', 'mes', 1)`, "permission denied");

  const conta = async (n) => (await como(n, () => linhas(`select count(*)::int n from public.metas`)))[0].n;
  assert.equal(await conta(CA), 4);
  assert.equal(await conta(CA2), 1);
  assert.equal(await conta(GA), 5);
  assert.equal(await conta(GB), 0);
  assert.equal(await conta(GG), 5);
  assert.equal(await conta(REC), 0);

  await como(GA, () => db.exec(`update public.metas set valor = 99; delete from public.metas`));
  await como(CA2, () => db.exec(`delete from public.metas where dono_id = '${id(CA)}'`));
  assert.equal(await conta(GG), 5);
  await como(CA, () => db.exec(`update public.metas set no_painel = false where metrica = 'vendas'`));
  await como(CA, () => db.exec(`delete from public.metas where metrica = 'visitas' and meses = 6`));
  assert.equal(await conta(CA), 3);
});

test("faixas de VGV: só o gerente geral lê e altera; o padrão entra uma vez", async () => {
  const faixas = async (n) => (await como(n, () => linhas(`select vgv_minimo::int m, valor::int v from public.faixas_vgv order by 1`)));
  assert.deepEqual(await faixas(GG), [
    { m: 1000000, v: 2000 }, { m: 1500000, v: 3000 }, { m: 2000000, v: 5000 }, { m: 3000000, v: 10000 },
  ]);
  for (const n of [GA, CA, REC, DES]) assert.deepEqual(await faixas(n), []);
  await falha(0, `select * from public.faixas_vgv`, "permission denied");
  await falha(GA, `insert into public.faixas_vgv (vgv_minimo, valor) values (5000000, 1)`, "row-level security");
  await falha(CA, `insert into public.faixas_vgv (vgv_minimo, valor) values (5000000, 1)`, "row-level security");

  await como(GG, () => db.exec(`update public.faixas_vgv set valor = 2500 where vgv_minimo = 1000000; delete from public.faixas_vgv where vgv_minimo = 3000000`));
  await db.exec(schema);
  assert.deepEqual((await faixas(GG)).map((f) => f.v), [2500, 3000, 5000]);
  const [a] = await linhas(`select atualizado_por from public.faixas_vgv where vgv_minimo = 1000000`);
  assert.equal(a.atualizado_por, id(GG));

  // Os textos da tela ficam em app_settings: só o gerente geral lê.
  assert.equal((await como(GG, () => linhas(`select 1 from public.app_settings where chave = 'faixas_vgv'`))).length, 1);
  assert.equal((await como(GA, () => linhas(`select 1 from public.app_settings where chave = 'faixas_vgv'`))).length, 0);
  assert.equal((await como(CA, () => linhas(`select 1 from public.app_settings where chave = 'faixas_vgv'`))).length, 0);
});
