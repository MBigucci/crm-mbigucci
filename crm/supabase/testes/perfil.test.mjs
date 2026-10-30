// Teste do perfil ampliado do cliente (item 16) num Postgres local (PGlite):
// colunas novas do lead, documentos (tabela, histórico e as policies do Storage
// sobre uma imitação de storage.objects), a mensagem "Parabéns" e os
// aniversários do resumo do dia. Simula o que o Supabase tem: auth.users,
// auth.uid(), os papéis anon e authenticated e o schema storage.
// O que só dá para testar no Supabase real está em docs/leads.md, seção 17.
// Rode com: npm run test:banco
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const storage = readFileSync(new URL("../storage-documentos.sql", import.meta.url), "utf8");
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
const novoLead = async (dono, nome) =>
  (await como(dono, () => linhas(
    `insert into public.leads (dono_id, nome, whatsapp, origem) values ($1, $2, '5511987654321', 'plantao') returning id`,
    [id(dono), nome],
  )))[0].id;
const caminho = (lead, ext = "pdf") => `${lead}/${randomUUID()}.${ext}`;

let leadA, leadB;

test("prepara o banco: schema três vezes e o SQL do Storage duas", async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;

    -- Imitação do que o Supabase Storage tem: o bucket e os objetos, com RLS.
    create schema storage;
    create table storage.buckets (id text primary key, name text not null, public boolean default false,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
      name text not null, owner uuid default auth.uid(), created_at timestamptz default now(), unique (bucket_id, name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated, service_role;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `);
  await db.exec(schema);
  await db.exec(schema);
  await db.exec(schema); // idempotente
  await db.exec(storage);
  await db.exec(storage); // idempotente

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
  leadA = await novoLead(CA, "Ana Souza");
  leadB = await novoLead(CB, "Bruno Lima");
  await db.exec(`update public.profiles set ativo = false where id = '${id(DES)}'`);

  const [b] = await linhas(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'lead-documentos'`);
  assert.deepEqual(b, {
    public: false,
    file_size_limit: 10485760,
    allowed_mime_types: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  });
});

test("perfil ampliado: o dono grava, os textos são limpos e os checks valem", async () => {
  await como(CA, () => db.exec(`
    update public.leads set prazo_compra = '6_meses', forma_pagamento = 'financiamento', usa_fgts = true,
      renda_faixa = '6_a_10', entrada = 80000, pronto_planta = 'planta', motivo_compra = 'sair_do_aluguel',
      nascimento = '1990-02-28', profissao = '  Enfermeira ', estado_civil = 'casado', cidade_mora = ' São Bernardo do Campo ',
      bairro_mora = '', telefone2 = '5511912345678'
    where id = '${leadA}'`));
  const [l] = await linhas(`select profissao, cidade_mora, bairro_mora, renda_faixa, usa_fgts, nascimento::text from public.leads where id = $1`, [leadA]);
  assert.deepEqual(l, { profissao: "Enfermeira", cidade_mora: "São Bernardo do Campo", bairro_mora: null, renda_faixa: "6_a_10", usa_fgts: true, nascimento: "1990-02-28" });

  for (const [col, valor] of [["prazo_compra", "'amanha'"], ["forma_pagamento", "'cheque'"], ["renda_faixa", "'muita'"],
                              ["entrada", "-1"], ["pronto_planta", "'usado'"], ["motivo_compra", "'x'"],
                              ["estado_civil", "'noivo'"], ["telefone2", "'11912345678'"], ["nascimento", "'1899-12-31'"]])
    await falha(CA, `update public.leads set ${col} = ${valor} where id = '${leadA}'`, "leads_perfil_ampliado_check");
  await falha(CA, `update public.leads set nascimento = current_date + 1 where id = '${leadA}'`, "não pode ser no futuro");
  await falha(CA, `update public.leads set profissao = repeat('x', 121) where id = '${leadA}'`, "leads_perfil_ampliado_check");
  // Cadastrar já com o perfil também vale (o Cadastro Mágico pode trazer o e-mail).
  await como(CA2, () => db.exec(`insert into public.leads (dono_id, nome, whatsapp, origem, renda_faixa, nascimento)
    values ('${id(CA2)}', 'Caio', '5511900000000', 'plantao', 'ate_3', '2000-02-29')`));
});

test("perfil ampliado: quem vê o lead lê; só o dono altera", async () => {
  const ve = async (n) => (await como(n, () => linhas(`select renda_faixa, nascimento::text from public.leads where id = '${leadA}'`)));
  for (const n of [CA, GA, GG]) assert.deepEqual(await ve(n), [{ renda_faixa: "6_a_10", nascimento: "1990-02-28" }], `vê: ${n}`);
  for (const n of [CA2, GB, CB, REC, DES]) assert.deepEqual(await ve(n), [], `não vê: ${n}`);
  await falha(0, `select renda_faixa from public.leads`, "permission denied");

  // O gerente da equipe e o gerente geral veem, mas não alteram (o leads_guard só deixa trocar o dono).
  for (const n of [GA, GG]) await falha(n, `update public.leads set renda_faixa = 'ate_3' where id = '${leadA}'`, "Só o corretor dono");
  for (const n of [CA2, CB, REC, DES]) {
    const r = await como(n, () => db.query(`update public.leads set renda_faixa = 'ate_3' where id = '${leadA}'`));
    assert.equal(r.affectedRows, 0, `não altera: ${n}`);
  }
  assert.equal((await linhas(`select renda_faixa from public.leads where id = $1`, [leadA]))[0].renda_faixa, "6_a_10");
});

/** Envia como o app: o arquivo no Storage e depois a linha. */
async function anexar(n, lead, categoria = "identidade", ext = "pdf") {
  const c = caminho(lead, ext);
  await como(n, () => db.exec(`
    insert into storage.objects (bucket_id, name) values ('lead-documentos', '${c}');
    insert into public.lead_documentos (lead_id, categoria, nome, caminho, tipo, tamanho)
      values ('${lead}', '${categoria}', '  RG frente.${ext}  ', '${c}', '${ext === "pdf" ? "application/pdf" : "image/jpeg"}', 120000);
  `));
  return c;
}

test("documentos: o dono anexa, o histórico registra só a categoria", async () => {
  const c = await anexar(CA, leadA);
  const [d] = await linhas(`select nome, enviado_por from public.lead_documentos where caminho = $1`, [c]);
  assert.deepEqual(d, { nome: "RG frente.pdf", enviado_por: id(CA) });
  const [e] = await linhas(`select tipo, de, para, autor_id from public.lead_eventos where lead_id = $1 and tipo like 'documento%'`, [leadA]);
  assert.deepEqual(e, { tipo: "documento", de: null, para: "identidade", autor_id: id(CA) });
});

test("documentos: quem vê o lead lê a lista e o arquivo; os outros, nada", async () => {
  const lista = (n) => como(n, () => linhas(`select caminho from public.lead_documentos where lead_id = '${leadA}'`));
  const arquivos = (n) => como(n, () => linhas(`select name from storage.objects where bucket_id = 'lead-documentos' and name like '${leadA}/%'`));
  for (const n of [CA, GA, GG]) {
    assert.equal((await lista(n)).length, 1, `lista: ${n}`);
    assert.equal((await arquivos(n)).length, 1, `arquivo: ${n}`);
  }
  for (const n of [CA2, GB, CB, REC, DES]) {
    assert.equal((await lista(n)).length, 0, `lista: ${n}`);
    assert.equal((await arquivos(n)).length, 0, `arquivo: ${n}`);
  }
  await falha(0, `select * from public.lead_documentos`, "permission denied");
  assert.equal((await como(0, () => linhas(`select name from storage.objects`))).length, 0);
});

test("documentos: só o dono do lead ativo envia, e o caminho precisa ser do lead", async () => {
  // Gerente da equipe, gerente geral, colega, outra equipe, recepção e desativado não enviam.
  for (const n of [GA, GG, CA2, CB, REC, DES]) {
    await falha(n, `insert into storage.objects (bucket_id, name) values ('lead-documentos', '${caminho(leadA)}')`, "row-level security");
    await falha(n, `insert into public.lead_documentos (lead_id, categoria, nome, caminho, tipo, tamanho)
      values ('${leadA}', 'cpf', 'x.pdf', '${caminho(leadA)}', 'application/pdf', 10)`, "");
  }
  // Caminho de outro lead, fora do padrão, com o nome do arquivo ou fora do bucket.
  await falha(CA, `insert into storage.objects (bucket_id, name) values ('lead-documentos', '${caminho(leadB)}')`, "row-level security");
  await falha(CA, `insert into storage.objects (bucket_id, name) values ('lead-documentos', 'Ana Souza/rg.pdf')`, "row-level security");
  await falha(CA, `insert into storage.objects (bucket_id, name) values ('outro', '${caminho(leadA)}')`, "");
  await falha(CA, `insert into public.lead_documentos (lead_id, categoria, nome, caminho, tipo, tamanho)
    values ('${leadA}', 'cpf', 'x.pdf', '${leadA}/rg-ana-souza.pdf', 'application/pdf', 10)`, "lead_documentos_caminho_check");
  await falha(CA, `insert into public.lead_documentos (lead_id, categoria, nome, caminho, tipo, tamanho)
    values ('${leadA}', 'cpf', 'x.pdf', '${caminho(leadB)}', 'application/pdf', 10)`, "row-level security");
  // Tipo, tamanho e categoria.
  await falha(CA, `insert into public.lead_documentos (lead_id, categoria, nome, caminho, tipo, tamanho)
    values ('${leadA}', 'cpf', 'x.exe', '${caminho(leadA)}', 'application/x-msdownload', 10)`, "lead_documentos_tipo_check");
  await falha(CA, `insert into public.lead_documentos (lead_id, categoria, nome, caminho, tipo, tamanho)
    values ('${leadA}', 'cpf', 'x.pdf', '${caminho(leadA)}', 'application/pdf', 10485761)`, "lead_documentos_tamanho_check");
  await falha(CA, `insert into public.lead_documentos (lead_id, categoria, nome, caminho, tipo, tamanho)
    values ('${leadA}', 'selfie', 'x.pdf', '${caminho(leadA)}', 'application/pdf', 10)`, "lead_documentos_categoria_check");
  // Autor e data são do banco.
  await falha(CA, `insert into public.lead_documentos (lead_id, categoria, nome, caminho, tipo, tamanho, enviado_em)
    values ('${leadA}', 'renda', 'h.jpg', '${caminho(leadA, "jpg")}', 'image/jpeg', 10, '2020-01-01')`, "permission denied");
  // Lead descartado: não recebe documento novo.
  await como(CA, () => db.exec(`update public.leads set status = 'descartado', motivo_descarte = 'sem_interesse' where id = '${leadA}'`));
  await falha(CA, `insert into storage.objects (bucket_id, name) values ('lead-documentos', '${caminho(leadA)}')`, "row-level security");
  await como(CA, () => db.exec(`update public.leads set status = 'ativo', motivo_descarte = null where id = '${leadA}'`));
});

test("documentos: ninguém sobrescreve; só o dono remove, mesmo com o lead descartado, e o histórico registra", async () => {
  const c = await anexar(CA, leadA, "renda", "jpg");
  // Sem policy de update: o arquivo nunca é trocado.
  const u = await como(CA, () => db.query(`update storage.objects set name = name where name = '${c}'`));
  assert.equal(u.affectedRows, 0);
  await falha(CA, `update public.lead_documentos set categoria = 'cpf' where caminho = '${c}'`, "permission denied");

  for (const n of [GA, GG, CA2, CB, REC, DES]) {
    const a = await como(n, () => db.query(`delete from storage.objects where name = '${c}'`));
    const b = await como(n, () => db.query(`delete from public.lead_documentos where caminho = '${c}'`));
    assert.equal(a.affectedRows + b.affectedRows, 0, `não remove: ${n}`);
  }
  await como(CA, () => db.exec(`update public.leads set status = 'descartado', motivo_descarte = 'sem_interesse' where id = '${leadA}'`));
  const a = await como(CA, () => db.query(`delete from storage.objects where name = '${c}'`));
  const b = await como(CA, () => db.query(`delete from public.lead_documentos where caminho = '${c}'`));
  assert.equal(a.affectedRows + b.affectedRows, 2);
  await como(CA, () => db.exec(`update public.leads set status = 'ativo', motivo_descarte = null where id = '${leadA}'`));
  const ev = await linhas(`select tipo, de, autor_id from public.lead_eventos where lead_id = $1 and tipo = 'documento_removido'`, [leadA]);
  assert.deepEqual(ev, [{ tipo: "documento_removido", de: "renda", autor_id: id(CA) }]);
  // O histórico continua sem escrita pelo app.
  await falha(CA, `insert into public.lead_eventos (lead_id, tipo) values ('${leadA}', 'documento')`, "permission denied");
});

test("as funções das policies: caminho fora do padrão não quebra e não libera nada", async () => {
  const r = await como(CA, () => linhas(`select public.lead_do_caminho('x/y.pdf') a, public.pode_ver_documento('../${leadA}/a.pdf') b,
    public.pode_ver_documento('${leadA}/a.pdf') c, public.pode_ver_documento(null) d`));
  assert.deepEqual(r, [{ a: null, b: false, c: true, d: false }]);
  await falha(0, `select public.pode_ver_documento('${leadA}/a.pdf')`, "permission denied");
});

test("mensagem Parabéns: entra uma vez e o ajuste sobrevive", async () => {
  const [m] = await linhas(`select titulo, texto, etapas from public.mensagens_modelo where slug = 'parabens'`);
  assert.equal(m.titulo, "Parabéns");
  assert.match(m.texto, /feliz aniversário/);
  assert.doesNotMatch(m.texto, /!/);
  assert.deepEqual(m.etapas, []);
  await como(GG, () => db.exec(`update public.mensagens_modelo set texto = 'Parabéns, {primeiro_nome}.' where slug = 'parabens'`));
  await db.exec(schema);
  assert.equal((await linhas(`select texto from public.mensagens_modelo where slug = 'parabens'`))[0].texto, "Parabéns, {primeiro_nome}.");
});

test("avisos: aniversários de hoje (e o 29/02) só com dia e mês, só de quem tem aparelho", async () => {
  const hoje = (await linhas(`select to_char(now() at time zone 'America/Sao_Paulo', 'MM-DD') d`))[0].d;
  await db.exec(`
    update public.leads set nascimento = ('1985-' || '${hoje}')::date where id = '${leadA}';
    update public.leads set nascimento = '1990-01-01' where id = '${leadB}' and '${hoje}' <> '01-01';
    insert into public.push_assinaturas (endpoint, usuario_id, p256dh, auth) values ('https://fcm.googleapis.com/fcm/send/a', '${id(CA)}', 'k', 'a');
  `);
  const d = (await linhas(`select public.avisos_dados() d`))[0].d;
  const ana = d.aniversarios.filter((x) => x.lead_id === leadA);
  assert.deepEqual(ana, [{ lead_id: leadA, dono_id: id(CA), nome: "Ana Souza", dia_mes: hoje }]);
  assert.ok(!JSON.stringify(d.aniversarios).includes("1985"), "não leva o ano");
  // Bruno não tem aparelho: fica de fora.
  assert.ok(!d.aniversarios.some((x) => x.lead_id === leadB));
  await falha(CA, `select public.avisos_dados()`, "permission denied");
});
