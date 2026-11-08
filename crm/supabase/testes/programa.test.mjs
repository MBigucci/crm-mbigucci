// Teste do schema, do RLS e dos gatilhos do programa de pontuação num Postgres
// local (PGlite), perfil a perfil. Desde 04/11/2026 não há chave: quem vê o quê
// sai só das permissões e do usuário ativo. Simula o que o Supabase tem: auth.users, auth.uid() e os papéis anon
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
const hoje = `(now() at time zone 'America/Sao_Paulo')::date`;
const periodo = (corretor, turno = "manha", dia = hoje, extra = "") =>
  `insert into public.lancamentos_pontos (corretor_id, criterio, data, periodo${extra ? ", saida_visita, comprovante" : ""})
   values ('${id(corretor)}', 'periodo', ${dia}, '${turno}'${extra})`;
const video = (corretor, qtd = 1) =>
  `insert into public.lancamentos_pontos (corretor_id, criterio, data, quantidade, tipo_acao, comprovante) values ('${id(corretor)}', 'video', ${hoje}, ${qtd}, 'video', 'https://example.invalid/video')`;
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

test("permissões: padrões só na criação", async () => {
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

  const criterios = await linhas(`select slug, pontos, limite_mes, maximo from public.criterios_pontos order by ordem`);
  assert.deepEqual(criterios, [
    { slug: "periodo", pontos: 5, limite_mes: 24, maximo: 120 },
    { slug: "video", pontos: 5, limite_mes: 12, maximo: 60 },
    { slug: "visita", pontos: 10, limite_mes: 12, maximo: 120 },
  ]);
});

test("sem chave: cada perfil ativo vê o programa pela permissão; desativado e anônimo, nada", async () => {
  // Corretor (nem para si), desativado e anônimo não lançam.
  for (const n of [CA, DES, 0]) await falha(n, periodo(CA), n ? "row-level security" : "permission denied");
  await como(GG, () => db.exec(periodo(CA) + ";" + video(CA, 2) + ";" + periodo(CB, "tarde")));
  await como(GG, () => db.exec(`update public.lancamentos_pontos set status = 'aprovado' where corretor_id = '${id(CA)}'`));
  await como(GG, () => db.exec(`insert into public.fechamentos_verba (mes, corretor_id, pontos, pontos_validos, vendas, vgv, verba, premio)
                               values (date_trunc('month', ${hoje})::date, '${id(CA)}', 15, 15, 0, 0, 0, 0)`));
  // A visita realizada entra como pendente.
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

  // A tabela perfil × tela aprovada em 04/11/2026: critérios e ranking para todo
  // ativo; plantão para quem registra; fechamento só o próprio; auditoria só do GG.
  const esperado = {
    [GA]:  { criterios: 3, lancamentos: 3, historico: 0, fechamentos: 0, ranking: 3, plantao: 2 },
    [GB]:  { criterios: 3, lancamentos: 1, historico: 0, fechamentos: 0, ranking: 3, plantao: 1 },
    [CA]:  { criterios: 3, lancamentos: 2, historico: 0, fechamentos: 1, ranking: 3, plantao: 0 },
    [CA2]: { criterios: 3, lancamentos: 0, historico: 0, fechamentos: 0, ranking: 3, plantao: 0 },
    [CB]:  { criterios: 3, lancamentos: 0, historico: 0, fechamentos: 0, ranking: 3, plantao: 0 },
    [REC]: { criterios: 3, lancamentos: 2, historico: 0, fechamentos: 0, ranking: 3, plantao: 3 },
    [OP]:  { criterios: 3, lancamentos: 2, historico: 0, fechamentos: 0, ranking: 3, plantao: 3 },
    [DES]: { criterios: 0, lancamentos: 0, historico: 0, fechamentos: 0, ranking: 0, plantao: 0 },
  };
  for (const n of NAO_GG) assert.deepEqual(await contagens(n), esperado[n], `perfil ${n}`);
  await falha(0, `select * from public.lancamentos_pontos`, "permission denied");
  await falha(0, `select * from public.ranking_pontos(current_date)`, "permission denied");
  // Ninguém além do gerente geral lê as chaves (app_settings).
  assert.equal((await como(CA, () => linhas(`select * from public.app_settings`))).length, 0);
});

test("cada perfil vê só o que é dele", async () => {
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

  // Critérios e ranking para todo ativo; auditoria só do gerente geral; fechamento só o próprio.
  const ca = await contagens(CA);
  assert.deepEqual([ca.criterios, ca.historico, ca.fechamentos, ca.ranking, ca.plantao], [3, 0, 1, 3, 0]);
  assert.equal((await contagens(CA2)).fechamentos, 0);
  assert.equal((await contagens(REC)).plantao, 3);
  assert.equal((await contagens(GA)).plantao, 2);
  assert.equal((await contagens(GA)).historico, 0);
  const ranking = await como(CB, () => linhas(`select nome, pontos from public.ranking_pontos(${hoje})`));
  assert.deepEqual(ranking[0], { nome: "Corretor A", pontos: 15 });
});

test("lançar: regras de quem lança o quê, sempre pendente e sem duplicar o período", async () => {
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
  await falha(GA, `insert into public.lancamentos_pontos (corretor_id, criterio, data, quantidade, periodo, tipo_acao, comprovante) values ('${id(CA)}', 'video', ${hoje}, 2, 'manha', 'video', 'https://example.invalid/video')`, "lancamentos_periodo_certo");
  await falha(REC, periodo(CA2, "manha", hoje, `, true, null`), "lancamentos_saida_com_foto");

  // Saída para visita com a foto: o período não se perde.
  await como(REC, () => db.exec(periodo(CA2, "manha", hoje, `, true, 'https://fotos.exemplo/saida.jpg'`)));
  const l = (await doCorretor(CA2)).find((x) => x.saida_visita);
  assert.deepEqual([l.status, l.lancado_por, l.comprovante, l.decidido_em], ["pendente", id(REC), "https://fotos.exemplo/saida.jpg", null]);
  // O operacional registra o plantão de qualquer equipe.
  await como(OP, () => db.exec(periodo(CB, "manha")));
});

test("aprovar: só o gerente geral, com carimbo, motivo na recusa, Desfazer e auditoria", async () => {
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
  await como(REC, () => db.exec(periodo(CA, "tarde")));
  const l = (await doCorretor(CA)).find((x) => x.criterio === "periodo" && x.periodo === "tarde");
  await como(REC, () => db.exec(`update public.lancamentos_pontos set status = 'cancelado' where id = '${l.id}'`));
  assert.equal((await doCorretor(CA)).find((x) => x.id === l.id).status, "cancelado");
  await como(REC, () => db.exec(`update public.lancamentos_pontos set status = 'pendente' where id = '${l.id}'`));
  await falha(REC, `update public.lancamentos_pontos set status = 'aprovado' where id = '${l.id}'`, "Só o gerente geral");
  await como(GG, () => db.exec(`update public.lancamentos_pontos set status = 'aprovado' where id = '${l.id}'`));
  await falha(REC, `update public.lancamentos_pontos set status = 'cancelado' where id = '${l.id}'`, "Só o gerente geral");
  // Desativado, nem o próprio lançador altera.
  await db.exec(`update public.profiles set ativo = false where id = '${id(REC)}'`);
  const antes = (await doCorretor(CA2)).find((x) => x.saida_visita);
  await como(REC, () => db.exec(`update public.lancamentos_pontos set status = 'cancelado' where id = '${antes.id}'`));
  assert.equal((await doCorretor(CA2)).find((x) => x.id === antes.id).status, "pendente");
  await db.exec(`update public.profiles set ativo = true where id = '${id(REC)}'`);
});

test("visita: a baixa vira lançamento pendente uma vez, a correção cancela e reativa", async () => {
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

test("critérios e fechamento: só o gerente geral altera", async () => {
  await como(CA, () => db.exec(`update public.criterios_pontos set pontos = 50`));
  assert.equal((await linhas(`select pontos from public.criterios_pontos where slug = 'video'`))[0].pontos, 5);
  await como(GG, () => db.exec(`update public.criterios_pontos set limite_mes = 10 where slug = 'video'`));
  const c = (await linhas(`select maximo, atualizado_por from public.criterios_pontos where slug = 'video'`))[0];
  assert.deepEqual(c, { maximo: 50, atualizado_por: id(GG) });
  await como(GG, () => db.exec(`update public.criterios_pontos set limite_mes = 12 where slug = 'video'`));
  await falha(GG, `insert into public.criterios_pontos (slug, nome, pontos, limite_mes) values ('extra', 'X', 1, 1)`, "permission denied");

  const fechar = `insert into public.fechamentos_verba (mes, corretor_id, pontos, pontos_validos, vendas, vgv, verba, premio)
                  values (date_trunc('month', ${hoje})::date, '${id(CA2)}', 140, 140, 0, 0, 1400, 0)`;
  for (const n of [CA2, GA, REC, OP]) await falha(n, fechar, "row-level security");
  await como(GG, () => db.exec(fechar + ` on conflict (mes, corretor_id) do update set verba = excluded.verba`));
  const f = await como(CA2, () => linhas(`select verba, fechado_por from public.fechamentos_verba`));
  assert.deepEqual(f.map((x) => [Number(x.verba), x.fechado_por]), [[1400, id(GG)]]);

  // Sem regra de primeiro mês: a chave da versão anterior não existe.
  assert.equal((await linhas(`select count(*)::int n from public.app_settings where chave = 'programa_verba_inicio'`))[0].n, 0);
});

test("fim da chave: um banco com a versão anterior perde a chave e as três funções", async () => {
  // Simula o que um banco que rodou o schema antes de 04/11/2026 tem: a linha da
  // chave, as funções e uma policy que dependia de ve_programa().
  await db.exec(`
    insert into public.app_settings (chave, valor, rotulo) values ('programa_verba_ativo', 'true', 'Programa de verba ativo');
    create function private.programa_verba_ativo() returns boolean language sql stable as $$ select true $$;
    create function private.ve_programa() returns boolean language sql stable as $$ select private.programa_verba_ativo() $$;
    create function public.programa_estado() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    drop policy "ver criterios" on public.criterios_pontos;
    create policy "ver criterios" on public.criterios_pontos for select to authenticated using (private.ve_programa());
  `);
  await db.exec(schema);
  assert.equal((await linhas(`select count(*)::int n from public.app_settings where chave = 'programa_verba_ativo'`))[0].n, 0);
  const funcoes = await linhas(`select n.nspname || '.' || p.proname f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                where p.proname in ('programa_verba_ativo', 've_programa', 'programa_estado')`);
  assert.deepEqual(funcoes, []);
  assert.equal((await contagens(CB)).criterios, 3);
});

test("ações próprias: vídeo e blitz, comprovantes privados, pendentes e Desfazer", async () => {
  // Estrutura mínima da API de Storage; policies reais do arquivo de instalação.
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;`);
  const storage = readFileSync(new URL('../storage-comprovantes.sql', import.meta.url), 'utf8');
  await db.exec(storage); await db.exec(storage);
  const caminho = `${id(CA)}/${id(80)}.jpg`;
  await como(CA, () => db.query(`insert into storage.objects(bucket_id,name) values('comprovantes',$1)`, [caminho]));
  for (const n of [GA, GB, CB, DES]) assert.equal((await como(n, () => linhas(`select * from storage.objects`))).length, 0);
  assert.equal((await como(GG, () => linhas(`select * from storage.objects`))).length, 1);
  await falha(CB, `insert into storage.objects(bucket_id,name) values('comprovantes','${caminho.replace(id(80),id(81))}')`, 'row-level security');
  await falha(CA, `update storage.objects set name='outro'`, 'permission denied');
  await falha(CA, `insert into public.lancamentos_pontos(corretor_id,criterio,data,tipo_acao) values('${id(CA)}','video',${hoje},'blitz')`, 'foto da blitz');
  await falha(CA, `insert into public.lancamentos_pontos(corretor_id,criterio,data,tipo_acao,comprovante) values('${id(CA)}','video',${hoje},'blitz','https://example.invalid/foto.jpg')`, 'foto da blitz');
  await falha(CA, `insert into public.lancamentos_pontos(corretor_id,criterio,data,tipo_acao,comprovante_arquivo) values('${id(CA)}','video',${hoje},'blitz','${id(CA)}/${id(99)}.jpg')`, 'Envie a imagem');
  await como(CA, () => db.exec(video(CA)));
  await como(CA, () => db.query(`insert into public.lancamentos_pontos(corretor_id,criterio,data,tipo_acao,comprovante_arquivo) values($1,'video',${hoje},'blitz',$2)`, [id(CA),caminho]));
  const proprias = await como(CA, () => linhas(`select * from public.lancamentos_pontos where lancado_por=auth.uid() and status='pendente'`));
  assert.equal(proprias.length,2); assert.ok(proprias.every(l => l.corretor_id===id(CA)));
  await falha(CA, video(CB), 'row-level security');
  await falha(CA, periodo(CA), 'row-level security');
  await falha(CA, `insert into public.lancamentos_pontos(corretor_id,criterio,data) values('${id(CA)}','visita',${hoje})`, 'sozinhas');
  await falha(CA, video(CA,2), 'uma ação por vez');
  const acao = proprias.find(l => l.tipo_acao==='blitz');
  await como(CA, () => db.exec(`select public.cancelar_acao('${acao.id}')`));
  assert.equal((await como(CA, () => linhas(`select * from public.lancamentos_pontos where id='${acao.id}'`))).length,0);
  await como(CA, () => db.exec(`select public.cancelar_acao('${acao.id}',true)`));
  assert.equal((await como(CA, () => linhas(`select status from public.lancamentos_pontos where id='${acao.id}'`)))[0].status,'pendente');
  await como(CA, () => db.exec(`delete from storage.objects where name='${caminho}'`));
  assert.equal((await linhas(`select * from storage.objects where name=$1`,[caminho])).length,1); // referenciado, não apaga
  await falha(CA, `update public.lancamentos_pontos set status='aprovado' where id='${acao.id}'`, 'Só o gerente geral');
  await como(GG, () => db.exec(`update public.lancamentos_pontos set status='aprovado' where id='${acao.id}'`));
  await falha(CA, `select public.cancelar_acao('${acao.id}')`, 'já foi conferida');
  await falha(CB, `select public.cancelar_acao('${acao.id}')`, 'já foi conferida');
  await db.exec(`update public.profiles set ativo=false where id='${id(CA)}'`);
  assert.equal((await como(CA, () => linhas(`select * from storage.objects`))).length,0);
  await falha(CA, video(CA), 'corretores ativos');
  await db.exec(`update public.profiles set ativo=true where id='${id(CA)}'`);
});

test("13 ações aprovadas só somam o limite compartilhado de 12; reserva pode ser enviada", async () => {
  await db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,'reserva@example.invalid','{"nome":"Reserva"}')`,[id(10)]);
  await db.exec(`update public.profiles set ativo=true, equipe_id=(select id from public.teams where nome='A') where id='${id(10)}'`);
  for(let i=0;i<13;i++) await como(10, () => db.exec(video(10)));
  await como(GG, () => db.exec(`update public.lancamentos_pontos set status='aprovado' where corretor_id='${id(10)}'`));
  const ranking = await como(10, () => linhas(`select pontos from public.ranking_pontos(${hoje}) where corretor_id='${id(10)}'`));
  assert.equal(ranking[0].pontos,60);
});

test("gerentes: vigência, só gerente geral define, GPS recalculado e sem gravação direta", async () => {
  await db.exec(`create table public.plantoes(id uuid primary key,nome text,ativo boolean,lat numeric,lng numeric,raio_m integer);
    insert into public.plantoes values('${id(70)}','Life',true,-23.7,-46.5,200),('${id(71)}','Prime',true,-23.7,-46.5,200);`);
  for(const n of [GA,GB,CA,REC,OP,DES,0]) await falha(n, `select public.definir_stand_gerente('${id(GA)}','${id(70)}',true)`, n ? 'Só o gerente geral' : 'permission denied');
  await como(GG, () => db.exec(`select public.definir_stand_gerente('${id(GA)}','${id(70)}',true)`));
  const segunda = `(date_trunc('week',now() at time zone 'America/Sao_Paulo'))::date`;
  const [v] = await linhas(`select * from public.gerente_stands where gerente_id='${id(GA)}'`);
  assert.equal((await linhas(`select inicio_semana = ${segunda}+7 ok from public.gerente_stands where id='${v.id}'`))[0].ok,true);
  await falha(GA, `select public.checkin_gerente('${id(70)}',-23.7,-46.5,10)`, 'não está definido');
  // Histórico já em vigor, sem passar pela RPC de inclusão.
  await db.exec(`update public.gerente_stands set inicio_semana=${segunda} where id='${v.id}'`);
  await falha(GB, `select public.checkin_gerente('${id(70)}',-23.7,-46.5,10)`, 'não está definido');
  await falha(CA, `select public.checkin_gerente('${id(70)}',-23.7,-46.5,10)`, 'permissão');
  await falha(GA, `select public.checkin_gerente('${id(71)}',-23.7,-46.5,10)`, 'não está definido');
  await falha(GA, `select public.checkin_gerente('${id(70)}',-24,-46.5,10)`, 'fora do raio');
  await falha(GA, `select public.checkin_gerente('${id(70)}',null,-46.5,10)`, 'imprecisa');
  await falha(GA, `select public.checkin_gerente('${id(70)}',-23.7,-46.5,101)`, 'imprecisa');
  await falha(GA, `insert into public.checkins_gerente(gerente_id) values('${id(GA)}')`, 'permission denied');
  await falha(GG, `update public.gerente_stands set inicio_semana=${segunda}`, 'permission denied');
  assert.equal((await linhas(`select count(*)::int n from public.checkins_gerente`))[0].n,0);
  await como(GA, () => db.exec(`select public.checkin_gerente('${id(70)}',-23.7,-46.5,10)`));
  await como(GA, () => db.exec(`select public.checkin_gerente('${id(70)}',-23.7,-46.5,10)`));
  assert.equal((await linhas(`select count(*)::int n from public.checkins_gerente`))[0].n,1);
  assert.equal(Number((await linhas(`select distancia_m from public.checkins_gerente`))[0].distancia_m),0);
  for(const n of [GB,CA,REC,DES]) assert.equal((await como(n, () => linhas(`select * from public.checkins_gerente`))).length,0);
  await como(GG, () => db.exec(`select public.definir_stand_gerente('${id(GA)}','${id(70)}',false)`));
  assert.equal((await linhas(`select fim_semana=${segunda}+7 ok from public.gerente_stands where id='${v.id}'`))[0].ok,true);
  await como(GA, () => db.exec(`select public.checkin_gerente('${id(70)}',-23.7,-46.5,10)`)); // ainda vale nesta semana
  await falha(0, `select public.pontos_gerente(${hoje})`, 'permission denied');
  await falha(GB, `select public.pontos_gerente(${hoje},'${id(GA)}')`, 'permissão');
});

test("parceiros: só novos cadastros manuais do gerente; fechamento conjunto recalcula o prêmio", async () => {
  await db.exec(`create table public.parceiros(id uuid primary key default gen_random_uuid(),criado_por uuid,entrada text,criado_em timestamptz);
    insert into public.parceiros(criado_por,entrada,criado_em) select '${id(GA)}','manual',now() from generate_series(1,20);
    insert into public.parceiros(criado_por,entrada,criado_em) values('${id(GA)}','manual',now()-interval '2 months'),
      ('${id(GA)}','link',now()),('${id(GB)}','manual',now());`);
  const mes = (await linhas(`select date_trunc('month',${hoje})::date::text mes`))[0].mes;
  const [dados] = await como(GA, () => linhas(`select public.pontos_gerente('${mes}') r`));
  assert.equal(dados.r.parceiros,20);
  await falha(GA, `select public.fechar_programa_mes('${mes}','[]')`, 'Só o gerente geral');
  await como(GG, () => db.exec(`select public.fechar_programa_mes('${mes}','[]')`));
  const [fechado] = await como(GA, () => linhas(`select * from public.fechamentos_premio_gerente`));
  assert.equal(Number(fechado.premio),2000); // 20 parceiros + único check-in exigido pelo vínculo de uma semana
  assert.equal((await como(CA, () => linhas(`select * from public.fechamentos_premio_gerente`))).length,0);
  await db.exec(`delete from public.checkins_gerente`);
  await como(GG, () => db.exec(`select public.fechar_programa_mes('${mes}','[]')`));
  assert.equal(Number((await como(GA, () => linhas(`select premio from public.fechamentos_premio_gerente`)))[0].premio),1000);
  // Banco reexecutado não restaura uma permissão que o Felipe retirou.
  await db.exec(`delete from public.role_permissions where perfil='gerente' and permissao='pontos_gerente.participar'`);
  await db.exec(schema);
  await falha(GA, `select public.checkin_gerente('${id(70)}',-23.7,-46.5,10)`, 'permissão');
});

test("migração: vídeos antigos sem comprovante continuam aprováveis, sem reabrir a exceção para novos", async () => {
  // Simula o gatilho e a linha do banco anterior à introdução de tipo_acao.
  await db.exec(`alter table public.lancamentos_pontos drop constraint lancamentos_tipo_acao;
    create or replace function public.lancamentos_pontos_guard() returns trigger language plpgsql as $$ begin return new; end $$;
    insert into public.lancamentos_pontos(id,corretor_id,criterio,data,lancado_por)
    values('${id(95)}','${id(CA)}','video',${hoje},'${id(GG)}');`);
  await db.exec(schema);
  const [legado] = await linhas(`select tipo_acao,acao_legada from public.lancamentos_pontos where id='${id(95)}'`);
  assert.deepEqual(legado,{tipo_acao:'video',acao_legada:true});
  await como(GG, () => db.exec(`update public.lancamentos_pontos set status='aprovado' where id='${id(95)}'`));
  await falha(CA, `insert into public.lancamentos_pontos(corretor_id,criterio,data,tipo_acao) values('${id(CA)}','video',${hoje},'video')`, 'print ou o link');
  await falha(CA, `insert into public.lancamentos_pontos(corretor_id,criterio,data,tipo_acao,acao_legada) values('${id(CA)}','video',${hoje},'video',true)`, 'permission denied');
});
