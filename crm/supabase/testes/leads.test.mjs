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

  await falha(CA, `insert into public.lead_interacoes (lead_id, texto) values ('${leadId}', 'sem próximo')`, "lead_interacoes_pede_proximo_contato");
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

// ---------- Histórico automático, tentativas e Cadastro Mágico ----------

const idDe = async (nome) => (await linhas(`select id from public.leads where nome = $1`, [nome]))[0].id;
const interacao = (leadId, tipo, proximo = "'2026-11-05 10:00-03'") =>
  `insert into public.lead_interacoes (lead_id, tipo, texto, proximo_contato) values ('${leadId}', '${tipo}', 'x', ${proximo})`;
const eventos = async (leadId) =>
  linhas(`select tipo, de, para, detalhe, automatico, autor_id from public.lead_eventos where lead_id = $1 order by criado_em, tipo`, [leadId]);

test("eventos: cadastro, etapa, temperatura, descarte e atribuição, com o autor", async () => {
  await como(CA, () => db.exec(lead(CA, "Histórico 1")));
  const h1 = await idDe("Histórico 1");
  await como(CA, () => db.exec(`update public.leads set temperatura = 'quente', etapa = 'proposta' where id = '${h1}'`));
  await como(CA, () => db.exec(`update public.leads set status = 'descartado', motivo_descarte = 'sem_retorno' where id = '${h1}'`));
  await como(CA, () => db.exec(`update public.leads set status = 'ativo', motivo_descarte = null where id = '${h1}'`));
  await como(GA, () => db.exec(`update public.leads set dono_id = '${id(CA2)}' where id = '${h1}'`));
  const ev = (await eventos(h1)).map(({ tipo, de, para, detalhe, autor_id }) => [tipo, de, para, detalhe, autor_id]);
  assert.deepEqual(ev, [
    ["criado", null, id(CA), null, id(CA)],
    ["etapa", "novo", "proposta", null, id(CA)],
    ["temperatura", null, "quente", null, id(CA)],
    ["status", "ativo", "descartado", "sem_retorno", id(CA)],
    ["status", "descartado", "ativo", null, id(CA)],
    ["dono", id(CA), id(CA2), null, id(GA)],
  ]);
  // Lead que já existia ganhou o "criado" uma vez, mesmo rodando o schema de novo.
  await db.exec(schema);
  const criados = await linhas(`select count(*)::int n from public.lead_eventos where tipo = 'criado' group by lead_id having count(*) > 1`);
  assert.equal(criados.length, 0);
  assert.equal((await linhas(`select count(*)::int n from public.leads l where not exists
    (select 1 from public.lead_eventos e where e.lead_id = l.id and e.tipo = 'criado')`))[0].n, 0);
});

test("eventos: RLS igual à das interações, e ninguém escreve direto", async () => {
  const h1 = await idDe("Histórico 1"); // agora do Corretor A2, equipe A
  const conta = async (n) =>
    (await como(n, () => linhas(`select count(*)::int n from public.lead_eventos where lead_id = '${h1}'`)))[0].n;
  assert.equal(await conta(CA2), 6);
  assert.equal(await conta(GA), 6);
  assert.equal(await conta(GG), 6);
  assert.equal(await conta(CA), 0); // não é mais dono
  assert.equal(await conta(CB), 0);
  assert.equal(await conta(GB), 0);
  assert.equal(await conta(REC), 0);
  assert.equal(await conta(DES), 0);
  await falha(0, `select * from public.lead_eventos`, "permission denied");
  for (const n of [CA2, GA, GG]) {
    await falha(n, `insert into public.lead_eventos (lead_id, tipo) values ('${h1}', 'etapa')`, "permission denied");
    await falha(n, `update public.lead_eventos set para = 'venda'`, "permission denied");
    await falha(n, `delete from public.lead_eventos`, "permission denied");
  }
});

test("tentativas: Sem resposta soma, conversa zera, e o cliente não mexe no contador", async () => {
  await como(CA, () => db.exec(lead(CA, "Tentativas 1")));
  const t1 = await idDe("Tentativas 1");
  for (let i = 0; i < 3; i++) await como(CA, () => db.exec(interacao(t1, "tentativa")));
  let [l] = await linhas(`select tentativas, etapa from public.leads where id = '${t1}'`);
  assert.deepEqual(l, { tentativas: 3, etapa: "novo" }); // tentativa não é conversa
  await como(CA, () => db.exec(interacao(t1, "nota")));
  assert.equal((await linhas(`select tentativas from public.leads where id = '${t1}'`))[0].tentativas, 3);
  await como(CA, () => db.exec(`update public.leads set status = 'descartado', motivo_descarte = 'sem_retorno' where id = '${t1}'`));
  await como(CA, () => db.exec(`update public.leads set status = 'ativo', motivo_descarte = null where id = '${t1}'`));
  assert.equal((await linhas(`select tentativas from public.leads where id = '${t1}'`))[0].tentativas, 0);
  await como(CA, () => db.exec(interacao(t1, "tentativa")));
  await como(CA, () => db.exec(interacao(t1, "ligacao")));
  [l] = await linhas(`select tentativas from public.leads where id = '${t1}'`);
  assert.equal(l.tentativas, 0);
  await falha(CA, `update public.leads set tentativas = 0 where id = '${t1}'`, "permission denied");
  await falha(CA, interacao(t1, "sms"), "lead_interacoes_tipo_check");
  await falha(CA, `update public.leads set status = 'descartado', motivo_descarte = 'sumiu' where id = '${t1}'`, "leads_motivo_descarte_check");
});

test("avanço automático: a primeira conversa tira o lead de novo, e a etapa nunca volta", async () => {
  await como(CA, () => db.exec(lead(CA, "Avanço 1")));
  const a1 = await idDe("Avanço 1");
  await como(CA, () => db.exec(interacao(a1, "nota")));
  assert.equal((await linhas(`select etapa from public.leads where id = '${a1}'`))[0].etapa, "novo");
  await como(CA, () => db.exec(interacao(a1, "whatsapp")));
  assert.equal((await linhas(`select etapa from public.leads where id = '${a1}'`))[0].etapa, "em_contato");
  const [ev] = (await eventos(a1)).filter((e) => e.tipo === "etapa");
  assert.deepEqual(ev, { tipo: "etapa", de: "novo", para: "em_contato", detalhe: null, automatico: true, autor_id: id(CA) });
  await como(CA, () => db.exec(`update public.leads set etapa = 'proposta' where id = '${a1}'`));
  await como(CA, () => db.exec(interacao(a1, "ligacao")));
  assert.equal((await linhas(`select etapa from public.leads where id = '${a1}'`))[0].etapa, "proposta");
});

test("mensagem original: sem próximo contato; o gerente só guarda a do lead que cadastrou", async () => {
  await como(CA, () => db.exec(lead(CA, "Mágico 1")));
  const m1 = await idDe("Mágico 1");
  await como(CA, () => db.exec(interacao(m1, "mensagem", "null")));
  let [l] = await linhas(`select etapa, proximo_contato, ultima_interacao_texto from public.leads where id = '${m1}'`);
  assert.deepEqual(l, { etapa: "novo", proximo_contato: null, ultima_interacao_texto: "x" });

  await como(GA, () => db.exec(lead(CA, "Mágico empresa").replace("'plantao'", "'empresa'")));
  const m2 = await idDe("Mágico empresa");
  await como(GA, () => db.exec(interacao(m2, "mensagem", "null")));
  [l] = await linhas(`select ultima_interacao_texto, dono_id from public.leads where id = '${m2}'`);
  assert.deepEqual(l, { ultima_interacao_texto: "x", dono_id: id(CA) });
  await falha(GA, interacao(m2, "nota"), "row-level security");
  await falha(GA, interacao(m1, "mensagem", "null"), "row-level security"); // não foi ele quem cadastrou
  await falha(GB, interacao(m2, "mensagem", "null"), "row-level security");
});

test("e-mail do lead: guardado em minúsculas e validado", async () => {
  await como(CA, () => db.exec(`update public.leads set email = '  Ana.Paula@Gmail.com ' where nome = 'Mágico 1'`));
  assert.equal((await linhas(`select email from public.leads where nome = 'Mágico 1'`))[0].email, "ana.paula@gmail.com");
  await falha(CA, `update public.leads set email = 'sem arroba' where nome = 'Mágico 1'`, "leads_email_check");
});

test("horário de atendimento: todo usuário ativo lê, só o gerente geral altera, e o ajuste sobrevive", async () => {
  const horario = `select dias, inicio::text, fim::text from public.horario_atendimento`;
  assert.deepEqual(await como(CA, () => linhas(horario)), [{ dias: [0, 1, 2, 3, 4, 5, 6], inicio: "09:00:00", fim: "19:00:00" }]);
  assert.equal((await como(REC, () => linhas(horario))).length, 1);
  assert.equal((await como(DES, () => linhas(horario))).length, 0);
  await falha(0, horario, "permission denied");

  for (const n of [CA, GA]) {
    const r = await como(n, () => db.query(`update public.horario_atendimento set fim = '22:00'`));
    assert.equal(r.affectedRows, 0);
  }
  await falha(GG, `insert into public.horario_atendimento (id) values (false)`, "permission denied");
  await falha(GG, `delete from public.horario_atendimento`, "permission denied");
  await falha(GG, `update public.horario_atendimento set fim = '08:00'`, "horario_atendimento_janela");
  await falha(GG, `update public.horario_atendimento set dias = '{}'`, "horario_atendimento_dias");
  await falha(GG, `update public.horario_atendimento set dias = '{1,7}'`, "horario_atendimento_dias");

  await como(GG, () => db.exec(`update public.horario_atendimento set dias = '{1,2,3,4,5,6}', inicio = '08:30'`));
  const [h] = await linhas(`select dias, inicio::text, updated_by from public.horario_atendimento`);
  assert.deepEqual(h, { dias: [1, 2, 3, 4, 5, 6], inicio: "08:30:00", updated_by: id(GG) });
  await db.exec(schema);
  assert.deepEqual((await linhas(horario))[0], { dias: [1, 2, 3, 4, 5, 6], inicio: "08:30:00", fim: "19:00:00" });
});

test("lead lê atribuido_em: o prazo conta da atribuição", async () => {
  const [l] = await como(GG, () => linhas(`select atribuido_em is not null as tem from public.leads where nome = 'Empresa 1'`));
  assert.equal(l.tem, true);
});

test("duplicado: a função diz só se o número está ativo numa carteira que a pessoa não vê", async () => {
  const numero = "5511955550000";
  await como(CB, () => db.exec(lead(CB, "Duplicado B").replace("'5511987654321'", `'${numero}'`)));
  const emUso = async (n, w = numero) =>
    (await como(n, () => linhas(`select public.whatsapp_em_outra_carteira($1) as r`, [w])))[0].r;
  assert.equal(await emUso(CA), true); // outra equipe
  assert.equal(await emUso(GA), true); // gerente de outra equipe
  assert.equal(await emUso(CB), false); // é dele: o cadastro já mostra pelo RLS
  assert.equal(await emUso(GB), false); // é da equipe dele: o cadastro já mostra
  assert.equal(await emUso(GG), false); // vê tudo
  assert.equal(await emUso(CA, "5511900000000"), false);
  await falha(REC, `select public.whatsapp_em_outra_carteira('${numero}')`, "não cadastra");
  await falha(DES, `select public.whatsapp_em_outra_carteira('${numero}')`, "não cadastra");
  await falha(0, `select public.whatsapp_em_outra_carteira('${numero}')`, "permission denied");

  await como(CB, () => db.exec(`update public.leads set status = 'descartado', motivo_descarte = 'duplicado' where nome = 'Duplicado B'`));
  assert.equal(await emUso(CA), false); // descartado não conta
});

test("WhatsApp do usuário: cada um grava o próprio, quem gerencia usuários grava de todos", async () => {
  const whatsDe = async (n) => (await linhas(`select whatsapp from public.profiles where id = $1`, [id(n)]))[0].whatsapp;
  await como(CA, () => db.exec(`select public.salvar_meu_whatsapp('5511911112222')`));
  assert.equal(await whatsDe(CA), "5511911112222");
  await falha(CA, `select public.salvar_meu_whatsapp('11 91111-2222')`, "profiles_whatsapp_check");
  const r = await como(CA, () => db.query(`update public.profiles set whatsapp = '5511933334444' where id = '${id(CA)}'`));
  assert.equal(r.affectedRows, 0); // sem usuarios.gerenciar, só pela função
  await como(CA, () => db.exec(`select public.salvar_meu_whatsapp('  ')`));
  assert.equal(await whatsDe(CA), null);
  await falha(DES, `select public.salvar_meu_whatsapp('5511911112222')`, "usuário ativo");
  await falha(0, `select public.salvar_meu_whatsapp('5511911112222')`, "permission denied");

  await como(GG, () => db.exec(`update public.profiles set whatsapp = '5511922223333' where id = '${id(CA)}'`));
  assert.equal(await whatsDe(CA), "5511922223333");
  await como(GG, () => db.exec(`select public.salvar_meu_whatsapp('5511900001111')`));
  assert.equal(await whatsDe(GG), "5511900001111");
  const ve = async (n) => (await como(n, () => linhas(`select whatsapp from public.profiles where id = '${id(CA)}'`)));
  assert.deepEqual(await ve(GA), [{ whatsapp: "5511922223333" }]); // gerente da equipe
  assert.deepEqual(await ve(CB), []);
});

test("mensagens prontas: todo usuário ativo lê, só o gerente geral cria e altera, e o ajuste sobrevive", async () => {
  const modelos = `select slug from public.mensagens_modelo where ativo order by ordem`;
  const padrao = ["primeiro_contato", "retomar_contato", "convite_visita", "confirmar_visita", "depois_da_visita", "lancamento", "apresentar_empreendimento"];
  assert.deepEqual((await como(CA, () => linhas(modelos))).map((m) => m.slug), padrao);
  assert.equal((await como(REC, () => linhas(modelos))).length, 7);
  assert.equal((await como(DES, () => linhas(modelos))).length, 0);
  await falha(0, modelos, "permission denied");

  await falha(CA, `insert into public.mensagens_modelo (titulo, texto) values ('X', 'Y')`, "row-level security");
  await falha(GA, `insert into public.mensagens_modelo (titulo, texto) values ('X', 'Y')`, "row-level security");
  for (const n of [CA, GA]) {
    const r = await como(n, () => db.query(`update public.mensagens_modelo set texto = 'Z' where slug = 'primeiro_contato'`));
    assert.equal(r.affectedRows, 0);
  }
  await falha(GG, `delete from public.mensagens_modelo where slug = 'lancamento'`, "permission denied");
  await falha(GG, `update public.mensagens_modelo set texto = '   ' where slug = 'lancamento'`, "mensagens_modelo_texto_check");

  await como(GG, () => db.exec(`
    update public.mensagens_modelo set texto = '  Oi, {primeiro_nome}.  ' where slug = 'primeiro_contato';
    update public.mensagens_modelo set ativo = false where slug = 'lancamento';
    insert into public.mensagens_modelo (titulo, texto, etapas, ordem) values ('Tabela nova', 'Oi, {primeiro_nome}.', '{proposta}', 9);
  `));
  const [m] = await linhas(`select texto, updated_by from public.mensagens_modelo where slug = 'primeiro_contato'`);
  assert.deepEqual(m, { texto: "Oi, {primeiro_nome}.", updated_by: id(GG) });
  await db.exec(schema);
  const depois = await linhas(`select slug, texto from public.mensagens_modelo where ativo order by ordem`);
  assert.equal(depois.length, 7); // 6 padrão ativos + o novo
  assert.equal(depois[0].texto, "Oi, {primeiro_nome}.");
});

test("fim do prazo no banco: mesma conta do app, na hora de São Paulo", async () => {
  await db.exec(`update public.horario_atendimento set dias = '{0,1,2,3,4,5,6}', inicio = '09:00', fim = '19:00'`);
  const fim = async (chegada) =>
    (await linhas(`select to_char(private.fim_do_prazo($1::timestamptz) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') f`, [chegada]))[0].f;
  assert.equal(await fim("2026-10-29 10:00-03"), "2026-10-29 10:15");
  assert.equal(await fim("2026-10-29 22:00-03"), "2026-10-30 09:15");
  assert.equal(await fim("2026-10-29 18:50-03"), "2026-10-30 09:05");
  await db.exec(`update public.horario_atendimento set dias = '{1,2,3,4,5}'`);
  assert.equal(await fim("2026-10-30 18:55-03"), "2026-11-02 09:10"); // sexta → segunda
  await db.exec(`update public.horario_atendimento set dias = '{0,1,2,3,4,5,6}'`);
});

/** Volta o cadastro e a atribuição do lead no tempo, para o prazo estourar. */
const envelhecer = (nome, dias = 3) => db.exec(`
  alter table public.leads disable trigger leads_guard;
  update public.leads set created_at = now() - interval '${dias} days', atribuido_em = now() - interval '${dias} days' where nome = '${nome}';
  alter table public.leads enable trigger leads_guard;
`);
const perdido = (leadId, corretor) => `select public.lead_perdido('${leadId}', '${id(corretor)}')`;

test("lead perdido: só o gerente, só lead da empresa com prazo estourado, e o motivo vem do gatilho", async () => {
  await como(GA, () => db.exec(lead(CA, "Perdido 1").replace("'plantao'", "'empresa'")));
  const p1 = await idDe("Perdido 1");
  await falha(GA, perdido(p1, CA2), "prazo estourado"); // acabou de chegar
  await envelhecer("Perdido 1");

  await falha(CA, perdido(p1, CA2), "Só o gerente");
  await falha(GB, perdido(p1, CB), "não encontrado");
  await falha(GA, perdido(p1, CB), "atribuir leads"); // fora da equipe
  await falha(GA, perdido(p1, CA), "outro corretor");
  await falha(0, perdido(p1, CA2), "permission denied");

  await como(GA, () => db.exec(perdido(p1, CA2)));
  const [l] = await linhas(`select dono_id, atribuido_por, atribuido_em > now() - interval '1 minute' as agora from public.leads where id = $1`, [p1]);
  assert.deepEqual(l, { dono_id: id(CA2), atribuido_por: id(GA), agora: true });
  const ev = (await eventos(p1)).filter((e) => e.tipo === "dono");
  assert.deepEqual(ev.map(({ de, para, detalhe, autor_id }) => [de, para, detalhe, autor_id]), [[id(CA), id(CA2), "perdido", id(GA)]]);
  // O prazo recomeça para quem recebeu.
  await falha(GA, perdido(p1, CA), "prazo estourado");

  // A troca comum continua sem motivo, e o motivo não vaza para a próxima troca.
  await como(GA, () => db.exec(`update public.leads set dono_id = '${id(CA)}' where id = '${p1}'`));
  assert.equal((await eventos(p1)).filter((e) => e.tipo === "dono").at(-1).detalhe, null);

  // Lead do próprio corretor, descartado ou que já saiu de "novo" não é perdido.
  await como(CA, () => db.exec(lead(CA, "Perdido plantão")));
  await envelhecer("Perdido plantão");
  await falha(GA, perdido(await idDe("Perdido plantão"), CA2), "prazo estourado");
  await como(GA, () => db.exec(lead(CA, "Perdido descartado").replace("'plantao'", "'empresa'")));
  await envelhecer("Perdido descartado");
  await como(CA, () => db.exec(`update public.leads set status = 'descartado', motivo_descarte = 'duplicado' where nome = 'Perdido descartado'`));
  await falha(GA, perdido(await idDe("Perdido descartado"), CA2), "prazo estourado");

  // O gerente geral marca em qualquer equipe.
  await como(GG, () => db.exec(lead(CB, "Perdido B").replace("'plantao'", "'empresa'")));
  await envelhecer("Perdido B");
  const pb = await idDe("Perdido B");
  await como(GG, () => db.exec(perdido(pb, CA)));
});

test("leads perdidos no período: cada um vê os que ele perdeu, o gerente os da equipe", async () => {
  const lista = (n, de = "now() - interval '1 day'", ate = "now() + interval '1 day'") =>
    como(n, () => linhas(`select nome, corretor_id, recebeu_id from public.leads_perdidos(${de}, ${ate}) order by nome`));
  assert.deepEqual(await lista(CA), [{ nome: "Perdido 1", corretor_id: id(CA), recebeu_id: id(CA2) }]);
  assert.deepEqual(await lista(CB), [{ nome: "Perdido B", corretor_id: id(CB), recebeu_id: id(CA) }]);
  assert.deepEqual(await lista(CA2), []);
  const [r] = await como(CA, () => linhas(
    "select recebido_em is not null and recebido_em <= criado_em as ok from public.leads_perdidos(now() - interval '1 day', now() + interval '1 day')"));
  assert.equal(r.ok, true);
  assert.deepEqual((await lista(GA)).map((r) => r.nome), ["Perdido 1"]);
  assert.deepEqual((await lista(GB)).map((r) => r.nome), ["Perdido B"]);
  assert.equal((await lista(GG)).length, 2);
  assert.deepEqual(await lista(REC), []);
  assert.deepEqual(await lista(CA, "now() + interval '1 hour'"), []);
  await falha(0, `select * from public.leads_perdidos(now() - interval '1 day', now())`, "permission denied");
});
