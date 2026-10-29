// Teste do schema, do RLS e dos gatilhos do programa de pontuação num Postgres
// local (PGlite), perfil a perfil, com a chave programa_verba_ativo desligada e
// ligada. Simula o que o Supabase tem: auth.users, auth.uid() e os papéis anon
// e authenticated. Rode com: npm run test:banco
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const GG = 1, GA = 2, GB = 3, CA = 4, CA2 = 5, CB = 6, DES = 7, REC = 8, OP = 9;
const NAO_GG = [GA, GB, CA, CA2, CB, DES, REC, OP];

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
const chave = (ligada) => db.exec(`update public.app_settings set valor = '${ligada}'::jsonb where chave = 'programa_verba_ativo'`);
const hoje = `(now() at time zone 'America/Sao_Paulo')::date`;
const periodo = (corretor, turno = "manha", dia = hoje, extra = "") =>
  `insert into public.lancamentos_pontos (corretor_id, criterio, data, periodo${extra ? ", saida_visita, comprovante" : ""})
   values ('${id(corretor)}', 'periodo', ${dia}, '${turno}'${extra})`;
const video = (corretor, qtd = 1) =>
  `insert into public.lancamentos_pontos (corretor_id, criterio, data, quantidade) values ('${id(corretor)}', 'video', ${hoje}, ${qtd})`;
const doCorretor = (n) => linhas(`select * from public.lancamentos_pontos where corretor_id = $1 order by lancado_em, id`, [id(n)]);
/** Quantas linhas de cada tabela do programa o usuário n recebe. */
const contagens = (n) =>
  como(n, async () => ({
    criterios: (await linhas(`select count(*)::int n from public.criterios_pontos`))[0].n,
    lancamentos: (await linhas(`select count(*)::int n from public.lancamentos_pontos`))[0].n,
    historico: (await linhas(`select count(*)::int n from public.lancamentos_pontos_historico`))[0].n,
    fechamentos: (await linhas(`select count(*)::int n from public.fechamentos_verba`))[0].n,
    ranking: (await linhas(`select count(*)::int n from public.ranking_pontos(${hoje})`))[0].n,
    plantao: (await linhas(`select count(*)::int n from public.plantao_corretores()`))[0].n,
    estado: (await linhas(`select public.programa_estado() e`))[0].e,
  }));

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

  const pessoas = [[GG, "Felipe"], [GA, "Gerente A"], [GB, "Gerente B"], [CA, "Corretor A"], [CA2, "Corretor A2"],
                   [CB, "Corretor B"], [DES, "Desativado"], [REC, "Recepção"], [OP, "Operacional"]];
  for (const [n, nome] of pessoas)
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `u${n}@x.com`, { nome }]);
  await db.exec(`
    update public.profiles set perfil = 'gerente_geral', ativo = true where id = '${id(GG)}';
    update public.profiles set perfil = 'gerente', ativo = true where id in ('${id(GA)}', '${id(GB)}');
    update public.profiles set perfil = 'recepcao', ativo = true where id = '${id(REC)}';
    update public.profiles set perfil = 'operacional', ativo = true where id = '${id(OP)}';
    insert into public.teams (nome, gerente_id) values ('A', '${id(GA)}'), ('B', '${id(GB)}');
    update public.profiles set ativo = true, equipe_id = (select id from public.teams where nome = 'A') where id in ('${id(CA)}', '${id(CA2)}', '${id(DES)}');
    update public.profiles set ativo = true, equipe_id = (select id from public.teams where nome = 'B') where id = '${id(CB)}';
  `);
  for (const [n, nome] of [[CA, "Ana"], [CB, "Edu"]])
    await como(n, () => db.exec(`insert into public.leads (nome, whatsapp, origem) values ('${nome}', '5511987654321', 'plantao')`));
  await db.exec(`update public.profiles set ativo = false where id = '${id(DES)}'`);
});

test("permissões: padrões só na criação, e o catálogo que todos leem não cita o programa", async () => {
  const rp = await linhas(`select perfil, permissao from public.role_permissions
                           where permissao in ('plantao.registrar', 'lancamentos.registrar') order by 2, 1`);
  assert.deepEqual(rp, [
    { perfil: "gerente", permissao: "lancamentos.registrar" },
    { perfil: "operacional", permissao: "lancamentos.registrar" },
    { perfil: "operacional", permissao: "plantao.registrar" },
    { perfil: "recepcao", permissao: "plantao.registrar" },
  ]);
  await db.exec(`delete from public.role_permissions where perfil = 'operacional' and permissao = 'lancamentos.registrar'`);
  await db.exec(schema); // idempotente: não devolve o que o gerente geral tirou
  assert.equal((await linhas(`select count(*)::int n from public.role_permissions where perfil = 'operacional' and permissao = 'lancamentos.registrar'`))[0].n, 0);

  const catalogo = (await como(CA, () => linhas(`select slug || ' ' || descricao t from public.permissions`))).map((r) => r.t).join(" ");
  assert.doesNotMatch(catalogo, /verba|premia|prêmio|pontu|ponto|ranking/i);
  const criterios = await linhas(`select slug, pontos, limite_mes, maximo from public.criterios_pontos order by ordem`);
  assert.deepEqual(criterios, [
    { slug: "periodo", pontos: 5, limite_mes: 24, maximo: 120 },
    { slug: "video", pontos: 5, limite_mes: 8, maximo: 40 },
    { slug: "visita", pontos: 10, limite_mes: 12, maximo: 120 },
  ]);
});

test("chave desligada: só o gerente geral lança, e o banco não entrega nada aos outros perfis", async () => {
  await chave(false);
  for (const n of [REC, GA, OP, CA, 0]) await falha(n, periodo(CA), n ? "row-level security" : "permission denied");
  await como(GG, () => db.exec(periodo(CA) + ";" + video(CA, 2) + ";" + periodo(CB, "tarde")));
  await como(GG, () => db.exec(`update public.lancamentos_pontos set status = 'aprovado' where corretor_id = '${id(CA)}'`));
  await como(GG, () => db.exec(`insert into public.fechamentos_verba (mes, corretor_id, pontos, pontos_validos, vendas, vgv, verba, premio)
                               values (date_trunc('month', ${hoje})::date, '${id(CA)}', 15, 15, 0, 0, 0, 0)`));
  // A visita realizada entra como pendente mesmo com a chave desligada.
  const ana = (await linhas(`select id from public.leads where nome = 'Ana'`))[0].id;
  await db.exec(`insert into public.visitas (lead_id, corretor_id, empreendimento, inicio, status, baixa_por)
                 values ('${ana}', '${id(CA)}', 'Marco Zero One', now() - interval '1 day', 'realizada', '${id(CA)}')`);

  const gg = await contagens(GG);
  assert.equal(gg.criterios, 3);
  assert.equal(gg.lancamentos, 4);
  assert.ok(gg.historico >= 4);
  assert.equal(gg.fechamentos, 1);
  assert.equal(gg.ranking, 3);
  assert.equal(gg.plantao, 3);
  assert.deepEqual(gg.estado, { ativo: false });

  for (const n of NAO_GG) {
    const c = await contagens(n);
    assert.deepEqual({ ...c, estado: undefined }, { criterios: 0, lancamentos: 0, historico: 0, fechamentos: 0, ranking: 0, plantao: 0, estado: undefined }, `perfil ${n}`);
    assert.deepEqual(c.estado, n === DES ? null : { ativo: false }, `estado do perfil ${n}`);
  }
  await falha(0, `select * from public.lancamentos_pontos`, "permission denied");
  await falha(0, `select public.programa_estado()`, "permission denied");
  await falha(0, `select * from public.ranking_pontos(current_date)`, "permission denied");
  // Ninguém além do gerente geral lê as chaves (app_settings).
  assert.equal((await como(CA, () => linhas(`select * from public.app_settings`))).length, 0);
});

test("chave ligada: cada perfil vê só o que é dele", async () => {
  await chave(true);
  await como(REC, () => db.exec(periodo(CA2, "tarde")));
  await como(GA, () => db.exec(video(CA2, 3)));
  await como(GB, () => db.exec(video(CB, 1)));

  const ver = async (n) => (await como(n, () => linhas(`select corretor_id, criterio, status from public.lancamentos_pontos order by criterio, corretor_id`)));
  // Gerente geral: todos (4 de antes + 3 novos).
  assert.equal((await ver(GG)).length, 7);
  // Recepção: os períodos de todos (o que lançou e os do gerente geral), nada de vídeo ou visita.
  assert.deepEqual((await ver(REC)).map((l) => l.criterio), ["periodo", "periodo", "periodo"]);
  // Gerente A: a equipe A (CA e CA2), não a B.
  const ga = await ver(GA);
  assert.ok(ga.length === 5 && ga.every((l) => [id(CA), id(CA2)].includes(l.corretor_id)));
  // Gerente B: só o que é da equipe B.
  assert.ok((await ver(GB)).every((l) => l.corretor_id === id(CB)));
  // Corretor A: só os próprios aprovados (o período e os vídeos), não a visita pendente.
  assert.deepEqual((await ver(CA)).map((l) => [l.criterio, l.status]), [["periodo", "aprovado"], ["video", "aprovado"]]);
  // Corretor A2: nada aprovado ainda.
  assert.equal((await ver(CA2)).length, 0);
  // Desativado e anônimo: nada.
  assert.equal((await ver(DES)).length, 0);
  await falha(0, `select * from public.lancamentos_pontos`, "permission denied");

  // Critérios, ranking e estado para todo ativo; auditoria só do gerente geral; fechamento só o próprio.
  const ca = await contagens(CA);
  assert.deepEqual([ca.criterios, ca.historico, ca.fechamentos, ca.ranking, ca.plantao], [3, 0, 1, 3, 0]);
  assert.deepEqual(ca.estado, { ativo: true });
  assert.equal((await contagens(CA2)).fechamentos, 0);
  assert.equal((await contagens(REC)).plantao, 3);
  assert.equal((await contagens(GA)).plantao, 2);
  assert.equal((await contagens(GA)).historico, 0);
  const ranking = await como(CB, () => linhas(`select nome, pontos from public.ranking_pontos(${hoje})`));
  assert.deepEqual(ranking[0], { nome: "Corretor A", pontos: 15 });
});

test("lançar: regras de quem lança o quê, sempre pendente e sem duplicar o período", async () => {
  await chave(true);
  await falha(CA, periodo(CA2), "row-level security"); // corretor não lança
  await falha(CA, periodo(CA), "row-level security"); // nem para si
  await falha(GA, periodo(CB), "row-level security"); // gerente só a equipe
  await falha(REC, video(CA), "row-level security"); // recepção só períodos
  await falha(GA, `insert into public.lancamentos_pontos (corretor_id, criterio, data) values ('${id(CA)}', 'visita', ${hoje})`, "sozinhas");
  await falha(REC, periodo(CA, "manha", `${hoje} + 1`), "depois de hoje");
  await falha(REC, periodo(DES), "corretores ativos");
  await falha(REC, periodo(CA2, "tarde"), "lancamentos_periodo_unico"); // já lançado
  await falha(REC, periodo(CA2, "noite"), "lancamentos_pontos_periodo_check");
  await falha(GA, `insert into public.lancamentos_pontos (corretor_id, criterio, data, status) values ('${id(CA)}', 'video', ${hoje}, 'aprovado')`, "permission denied");
  await falha(GA, `insert into public.lancamentos_pontos (corretor_id, criterio, data, quantidade, periodo) values ('${id(CA)}', 'video', ${hoje}, 2, 'manha')`, "lancamentos_periodo_certo");
  await falha(REC, periodo(CA2, "manha", hoje, `, true, null`), "lancamentos_saida_com_foto");

  // Saída para visita com a foto: o período não se perde.
  await como(REC, () => db.exec(periodo(CA2, "manha", hoje, `, true, 'https://fotos.exemplo/saida.jpg'`)));
  const l = (await doCorretor(CA2)).find((x) => x.saida_visita);
  assert.deepEqual([l.status, l.lancado_por, l.comprovante, l.decidido_em], ["pendente", id(REC), "https://fotos.exemplo/saida.jpg", null]);
  // O operacional registra o plantão de qualquer equipe.
  await como(OP, () => db.exec(periodo(CB, "manha")));
});

test("aprovar: só o gerente geral, com carimbo, motivo na recusa, Desfazer e auditoria", async () => {
  await chave(true);
  const [l] = (await doCorretor(CA2)).filter((x) => x.criterio === "periodo" && x.periodo === "tarde");
  await falha(REC, `update public.lancamentos_pontos set status = 'aprovado' where id = '${l.id}'`, "Só o gerente geral");
  // Quem não lançou não altera nada (o RLS esconde a linha), nem o próprio corretor.
  for (const n of [GA, OP, CA2, CA])
    for (const s of ["aprovado", "cancelado"]) await como(n, () => db.exec(`update public.lancamentos_pontos set status = '${s}' where id = '${l.id}'`));
  assert.equal((await doCorretor(CA2)).find((x) => x.id === l.id).status, "pendente");

  await falha(GG, `update public.lancamentos_pontos set status = 'recusado' where id = '${l.id}'`, "lancamentos_recusa_tem_motivo");
  await como(GG, () => db.exec(`update public.lancamentos_pontos set status = 'aprovado' where id = '${l.id}'`));
  let x = (await doCorretor(CA2)).find((y) => y.id === l.id);
  assert.deepEqual([x.status, x.decidido_por], ["aprovado", id(GG)]);
  assert.ok(x.decidido_em);
  // Desfazer: volta a pendente e limpa o carimbo.
  await como(GG, () => db.exec(`update public.lancamentos_pontos set status = 'pendente' where id = '${l.id}'`));
  x = (await doCorretor(CA2)).find((y) => y.id === l.id);
  assert.deepEqual([x.status, x.decidido_por, x.decidido_em], ["pendente", null, null]);
  await como(GG, () => db.exec(`update public.lancamentos_pontos set status = 'recusado', motivo_recusa = ' Saiu às 12h ' where id = '${l.id}'`));
  x = (await doCorretor(CA2)).find((y) => y.id === l.id);
  assert.deepEqual([x.status, x.motivo_recusa], ["recusado", "Saiu às 12h"]);
  // A identidade do lançamento não muda (nem pelo gerente geral, sem GRANT).
  await falha(GG, `update public.lancamentos_pontos set corretor_id = '${id(CA)}' where id = '${l.id}'`, "permission denied");
  await falha(GG, `delete from public.lancamentos_pontos where id = '${l.id}'`, "permission denied");

  const hist = await como(GG, () => linhas(`select acao, de, para, autor_id from public.lancamentos_pontos_historico where lancamento_id = $1 order by id`, [l.id]));
  assert.deepEqual(hist.map((h) => [h.acao, h.para.status, h.autor_id]), [
    ["criado", "pendente", id(REC)], ["alterado", "aprovado", id(GG)], ["alterado", "pendente", id(GG)], ["alterado", "recusado", id(GG)],
  ]);
  assert.equal(hist[3].para.motivo_recusa, "Saiu às 12h");
  await falha(GG, `insert into public.lancamentos_pontos_historico (lancamento_id, acao, para) values ('${l.id}', 'criado', '{}')`, "permission denied");
});

test("quem lançou cancela o próprio pendente e desfaz, mas não mexe no aprovado", async () => {
  await chave(true);
  await como(REC, () => db.exec(periodo(CA, "tarde")));
  const l = (await doCorretor(CA)).find((x) => x.criterio === "periodo" && x.periodo === "tarde");
  await como(REC, () => db.exec(`update public.lancamentos_pontos set status = 'cancelado' where id = '${l.id}'`));
  assert.equal((await doCorretor(CA)).find((x) => x.id === l.id).status, "cancelado");
  await como(REC, () => db.exec(`update public.lancamentos_pontos set status = 'pendente' where id = '${l.id}'`));
  await falha(REC, `update public.lancamentos_pontos set status = 'aprovado' where id = '${l.id}'`, "Só o gerente geral");
  await como(GG, () => db.exec(`update public.lancamentos_pontos set status = 'aprovado' where id = '${l.id}'`));
  await falha(REC, `update public.lancamentos_pontos set status = 'cancelado' where id = '${l.id}'`, "Só o gerente geral");
  // Com a chave desligada, nem o próprio lançador altera.
  await chave(false);
  const antes = (await doCorretor(CA2)).find((x) => x.saida_visita);
  await como(REC, () => db.exec(`update public.lancamentos_pontos set status = 'cancelado' where id = '${antes.id}'`));
  assert.equal((await doCorretor(CA2)).find((x) => x.id === antes.id).status, "pendente");
});

test("visita: a baixa vira lançamento pendente uma vez, a correção cancela e reativa", async () => {
  await chave(true);
  const edu = (await linhas(`select id from public.leads where nome = 'Edu'`))[0].id;
  await como(CB, () => db.exec(`insert into public.visitas (lead_id, empreendimento, inicio) values ('${edu}', 'Marco Zero One', now() + interval '1 hour')`));
  const v = (await linhas(`select id from public.visitas where lead_id = $1`, [edu]))[0];
  await db.exec(`update public.visitas set inicio = now() - interval '1 hour' where id = '${v.id}'`);
  await como(GB, () => db.exec(`update public.visitas set status = 'realizada', comprovante = 'https://x.com/f.jpg' where id = '${v.id}'`));
  const vis = () => linhas(`select * from public.lancamentos_pontos where visita_id = $1`, [v.id]);
  let [l] = await vis();
  assert.deepEqual([l.corretor_id, l.criterio, l.status, l.lancado_por, l.quantidade], [id(CB), "visita", "pendente", id(GB), 1]);

  await como(GB, () => db.exec(`select public.corrigir_visita('${v.id}', 'nao_compareceu', 'Engano')`));
  [l] = await vis();
  assert.equal(l.status, "cancelado");
  await como(GB, () => db.exec(`select public.corrigir_visita('${v.id}', 'realizada', 'Veio sim')`));
  const todos = await vis();
  assert.equal(todos.length, 1);
  assert.equal(todos[0].status, "pendente");
  // Rodar o schema de novo não duplica (backfill com on conflict).
  await db.exec(schema);
  assert.equal((await linhas(`select count(*)::int n from public.lancamentos_pontos where criterio = 'visita'`))[0].n, 2);
});

test("critérios, fechamento e a chave: só o gerente geral altera", async () => {
  await chave(true);
  await como(CA, () => db.exec(`update public.criterios_pontos set pontos = 50`));
  assert.equal((await linhas(`select pontos from public.criterios_pontos where slug = 'video'`))[0].pontos, 5);
  await como(GG, () => db.exec(`update public.criterios_pontos set limite_mes = 10 where slug = 'video'`));
  const c = (await linhas(`select maximo, atualizado_por from public.criterios_pontos where slug = 'video'`))[0];
  assert.deepEqual(c, { maximo: 50, atualizado_por: id(GG) });
  await como(GG, () => db.exec(`update public.criterios_pontos set limite_mes = 8 where slug = 'video'`));
  await falha(GG, `insert into public.criterios_pontos (slug, nome, pontos, limite_mes) values ('extra', 'X', 1, 1)`, "permission denied");

  const fechar = `insert into public.fechamentos_verba (mes, corretor_id, pontos, pontos_validos, vendas, vgv, verba, premio)
                  values (date_trunc('month', ${hoje})::date, '${id(CA2)}', 140, 140, 0, 0, 1400, 0)`;
  for (const n of [CA2, GA, REC, OP]) await falha(n, fechar, "row-level security");
  await como(GG, () => db.exec(fechar + ` on conflict (mes, corretor_id) do update set verba = excluded.verba`));
  const f = await como(CA2, () => linhas(`select verba, fechado_por from public.fechamentos_verba`));
  assert.deepEqual(f.map((x) => [Number(x.verba), x.fechado_por]), [[1400, id(GG)]]);

  // Sem regra de primeiro mês: a chave da versão anterior não existe.
  assert.equal((await linhas(`select count(*)::int n from public.app_settings where chave = 'programa_verba_inicio'`))[0].n, 0);
  // A chave em si, só o gerente geral liga.
  await como(GA, () => db.exec(`update public.app_settings set valor = 'false' where chave = 'programa_verba_ativo'`));
  assert.deepEqual((await contagens(GA)).estado, { ativo: true });
});
