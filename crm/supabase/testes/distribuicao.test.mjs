// Distribuição automática do lead da empresa (docs/distribuicao-automatica.md),
// com os arquivos reais: schema.sql, parcerias.sql, recepcao.sql e
// distribuicao.sql, nessa ordem. O relógio é trocado por uma hora fixa.
// Rode com: node --test supabase/testes/distribuicao.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ler = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const GG = 1, G1 = 2, G2 = 3, REC = 5, OP = 6;
const A1 = 11, A2 = 12, A3 = 13, B1 = 21, B2 = 22;   // corretores: equipe A (G1) e B (G2)
const TODOS = [A1, A2, A3, B1, B2];
const linhas = async (sql, p) => (await db.query(sql, p)).rows;
const um = async (sql, p) => (await db.query(sql, p)).rows[0];

async function como(n, fn) {
  const papel = n === "servico" ? "service_role" : n === "anon" ? "anon" : "authenticated";
  const sub = typeof n === "number" ? id(n) : "";
  await db.exec(`set role ${papel}; select set_config('request.jwt.claim.sub', '${sub}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const rpc = (n, sql, p) => como(n, async () => (await db.query(sql, p)).rows);
const r1 = async (n, sql, p) => (await rpc(n, sql, p))[0]?.r;

// Relógio: São Paulo (-03:00). Terça, 10/11/2026.
const relogio = (hhmm, dia = "2026-11-10") => db.query(`update teste.relogio set t = $1`, [`${dia}T${hhmm}:00-03:00`]);
const avancar = (min) => db.query(`update teste.relogio set t = t + make_interval(mins => $1)`, [min]);

let tel = 0;
const novoTel = () => `55119${String(10000000 + ++tel)}`;
async function entrada(extra = {}) {
  const e = { id: randomUUID(), nome: "Cliente Fictício", tel: novoTel(), email: null, msg: "Quero saber o preço.",
              fonte: "site", produto: null, prod_id: null, recebido: null, ...extra };
  const [r] = await rpc("servico", `select * from public.lead_empresa_entrada($1, coalesce($2::timestamptz, (select t from teste.relogio)), $3, $4, $5, $6, $7, $8, $9, null)`,
    [e.id, e.recebido, e.nome, e.tel, e.email, e.msg, e.fonte, e.produto, e.prod_id]);
  const l = await um(`select * from public.leads where id = $1`, [r.lead_id]);
  return { ...r, lead: l, entrada_id: e.id, tel: e.tel };
}
const dono = async (lead) => (await um(`select dono_id from public.leads where id = $1`, [lead])).dono_id;
const quem = (uuid) => (uuid ? Number(uuid.slice(-2)) : null);

let MZ, EASY, EQ_A, EQ_B;

// Estado de cada um: botão e check-in direto no banco, para os testes de regra.
async function liga(ns, { checkin = true } = {}) {
  for (const n of ns) {
    await db.query(`insert into public.distribuicao_corretores (corretor_id, recebendo, ultimo_app_em)
                    values ($1, true, (select t from teste.relogio))
                    on conflict (corretor_id) do update set recebendo = true, ultimo_app_em = (select t from teste.relogio)`, [id(n)]);
    if (checkin) {
      await db.query(`insert into public.distribuicao_presencas (id, corretor_id, plantao_id, dia, entrada_em)
                      select $1, $2, $3, ((select t from teste.relogio) at time zone 'America/Sao_Paulo')::date, (select t from teste.relogio)
                      where not exists (select 1 from public.distribuicao_presencas where corretor_id = $2 and status = 'aberta')`,
        [randomUUID(), id(n), MZ]);
      await db.query(`insert into public.distribuicao_sinais (corretor_id, quando, dentro) values ($1, (select t from teste.relogio), true)
                      on conflict (corretor_id) do update set quando = excluded.quando, dentro = true, fora_desde = null`, [id(n)]);
    }
  }
}
// Zera a conta entre os testes: créditos, decisões, presenças, estados e os
// leads em aberto (vão para "em contato", para não contarem prazo estourado).
async function zera(cfg = {}) {
  await db.exec(`
    update public.leads set etapa = 'em_contato' where etapa = 'novo';
    update public.leads set distribuicao_estado = null, dono_id = '${id(A1)}' where dono_id is null;
    delete from public.distribuicao_decisoes; delete from public.distribuicao_estouros; delete from public.distribuicao_avisos;
    delete from public.distribuicao_ausencias; delete from public.distribuicao_presencas; delete from public.distribuicao_sinais;
    delete from public.distribuicao_desempenho; delete from public.distribuicao_produtos; delete from public.distribuicao_checkin_tentativas; delete from public.distribuicao_pausas;
    delete from public.plantao_presenca_eventos; delete from public.plantao_presencas;
    update public.distribuicao_corretores set creditos = 0, recebendo = false, pausado_ate = null, participa = true, ultimo_app_em = null;
    update public.distribuicao_config set ligada = true, modo = 'equipe', pesos = true, exigir_checkin = true, sinal = true,
      plantao = true, represar = true, produtos = true, redistribuir = true, fim_da_fila = true, repetido_ao_dono = true,
      manual_conta = true, transparencia = true;
  `);
  for (const [k, v] of Object.entries(cfg)) await db.query(`update public.distribuicao_config set ${k} = $1`, [v]);
  await relogio("10:00");
}
const cfg = (o) => r1(GG, `select public.distribuicao_config_salvar($1) r`, [o]);

test("prepara: schema, parcerias, recepção e distribuição (duas vezes)", async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  for (const f of ["schema.sql", "parcerias.sql", "recepcao.sql", "distribuicao.sql"]) {
    await db.exec(ler(f));
    await db.exec(ler(f));
  }
  // Relógio fixo para a distribuição e a recepção.
  await db.exec(`
    create schema teste; create table teste.relogio (t timestamptz not null); insert into teste.relogio values (now());
    grant usage on schema teste to authenticated, service_role; grant select on teste.relogio to authenticated, service_role;
    create or replace function private.distribuicao_agora() returns timestamptz language sql stable set search_path = '' as $$ select t from teste.relogio $$;
    create or replace function private.recepcao_agora() returns timestamptz language sql stable set search_path = '' as $$ select t from teste.relogio $$;
  `);
  const pessoas = [[GG, "Felipe"], [G1, "Gerente A"], [G2, "Gerente B"], [REC, "Recepção"], [OP, "Operacional"],
                   [A1, "Ana Um"], [A2, "Beto Dois"], [A3, "Caio Três"], [B1, "Dani Um"], [B2, "Eva Dois"]];
  for (const [n, nome] of pessoas)
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `u${n}@x.test`, { nome }]);
  await db.exec(`
    update public.profiles set perfil = 'gerente_geral', ativo = true where id = '${id(GG)}';
    update public.profiles set perfil = 'gerente', ativo = true where id in ('${id(G1)}', '${id(G2)}');
    update public.profiles set perfil = 'recepcao', ativo = true where id = '${id(REC)}';
    update public.profiles set perfil = 'operacional', ativo = true where id = '${id(OP)}';
    insert into public.teams (nome, gerente_id) values ('Equipe A', '${id(G1)}'), ('Equipe B', '${id(G2)}');
    update public.profiles set ativo = true, apelido = split_part(nome, ' ', 1), equipe_id = (select id from public.teams where nome = 'Equipe A')
      where id in ('${id(A1)}', '${id(A2)}', '${id(A3)}');
    update public.profiles set ativo = true, apelido = split_part(nome, ' ', 1), equipe_id = (select id from public.teams where nome = 'Equipe B')
      where id in ('${id(B1)}', '${id(B2)}');
    update public.profiles set created_at = now() - interval '90 days';
    insert into public.role_permissions (perfil, permissao) values ('gerente', 'leads.atribuir') on conflict do nothing;
    update public.plantoes set lat = -23.700000, lng = -46.550000, raio_m = 200 where nome = 'Marco Zero';
    insert into public.empreendimentos (slug, nome, status) values ('easy', 'Easy', 'lancamento'), ('marco-zero-one', 'Marco Zero One', 'lancamento')
      on conflict do nothing;
  `);
  ({ id: MZ } = await um(`select id from public.plantoes where nome = 'Marco Zero'`));
  ({ id: EASY } = await um(`select id from public.empreendimentos where slug = 'easy'`));
  ({ id: EQ_A } = await um(`select id from public.teams where nome = 'Equipe A'`));
  ({ id: EQ_B } = await um(`select id from public.teams where nome = 'Equipe B'`));
  const c = await um(`select ligada from public.distribuicao_config`);
  assert.equal(c.ligada, false, "nasce desligada: o Felipe liga no dia");
});

test("1. a entrada sem usuário carimba atribuido_em (prazo e push) e registra a decisão", async () => {
  await zera();
  await liga([A1]);
  await relogio("10:00");
  const e = await entrada({ recebido: "2026-11-10T09:58:00-03:00" });
  assert.equal(e.situacao, "criado");
  assert.equal(quem(e.lead.dono_id), A1);
  assert.ok(e.lead.atribuido_em, "sem o carimbo o prazo e o push quebram");
  assert.equal(new Date(e.lead.atribuido_em).toISOString(), new Date("2026-11-10T09:58:00-03:00").toISOString(),
    "até 5 min de atraso, o prazo conta da chegada");
  assert.equal(e.lead.origem, "empresa");
  assert.equal(e.lead.etapa, "novo");
  assert.equal(e.lead.criado_por, null);
  const ev = await um(`select detalhe, para from public.lead_eventos where lead_id = $1 and tipo = 'dono'`, [e.lead_id]);
  assert.equal(ev.detalhe, "distribuicao");
  const d = await um(`select resultado, recebeu_id from public.distribuicao_decisoes where lead_id = $1`, [e.lead_id]);
  assert.equal(d.resultado, "recebeu");

  // Chegada atrasada (e-mail lido 1 h depois): o prazo conta da entrega menos 5 min.
  const e2 = await entrada({ recebido: "2026-11-10T09:00:00-03:00" });
  assert.equal(new Date(e2.lead.atribuido_em).toISOString(), new Date("2026-11-10T09:55:00-03:00").toISOString());
  // Nada do direcionador fica: a entrada guarda só id, datas, fonte e situação.
  const cols = (await linhas(`select column_name from information_schema.columns where table_name = 'distribuicao_entradas'`)).map((c) => c.column_name);
  assert.ok(!cols.some((c) => /regra|destino|direcionador|nome|telefone|email|mensagem/.test(c)), cols.join());
});

test("2. modo equipe: as equipes se revezam e a equipe sem ninguém é pulada sem perder a vez", async () => {
  await zera();
  await liga([A1, A2, B1]);
  const v = [];
  for (let i = 0; i < 4; i++) v.push(quem((await entrada()).lead.dono_id));
  const eqA = v.filter((x) => [A1, A2].includes(x)).length;
  assert.equal(eqA, 2, `duas para cada equipe: ${v}`);
  // Equipe B sem ninguém recebendo: pulada (fica registrado); quando volta, é a vez dela.
  await db.query(`update public.distribuicao_corretores set recebendo = false where corretor_id = $1`, [id(B1)]);
  const xs = [await entrada(), await entrada()];
  for (const x of xs) assert.ok([A1, A2].includes(quem(x.lead.dono_id)));
  const pulos = (await linhas(`select equipes from public.distribuicao_decisoes where lead_id = any($1)`, [xs.map((x) => x.lead_id)]))
    .flatMap((d) => d.equipes);
  assert.ok(pulos.some((p) => p.equipe_id === EQ_B && p.motivo === "ninguem_apto"), JSON.stringify(pulos));
  await liga([B1]);
  assert.equal(quem((await entrada()).lead.dono_id), B1, "a equipe pulada não perdeu a vez");
});

test("3. modo direto: uma fila só, de todas as equipes", async () => {
  await zera({ modo: "direto" });
  await liga([A1, B1, B2]);
  const v = [];
  for (let i = 0; i < 3; i++) v.push(quem((await entrada()).lead.dono_id));
  assert.deepEqual([...v].sort(), [A1, B1, B2].sort(), "cada um recebe um, sem olhar a equipe");
});

test("4. modo só gerentes: o lead fica na fila da equipe, sem dono; o gerente repassa e isso conta como vez", async () => {
  await zera({ modo: "gerentes" });
  const e = await entrada();
  assert.equal(e.lead.dono_id, null);
  assert.equal(e.lead.distribuicao_estado, "fila_equipe");
  const g = e.lead.equipe_id === EQ_A ? G1 : G2;
  const outro = g === G1 ? G2 : G1;
  const corretor = g === G1 ? A2 : B2;
  // Só o gerente da equipe vê o lead da fila; o corretor e o outro gerente, não.
  assert.equal((await rpc(g, `select id from public.leads where id = $1`, [e.lead_id])).length, 1);
  assert.equal((await rpc(outro, `select id from public.leads where id = $1`, [e.lead_id])).length, 0);
  assert.equal((await rpc(corretor, `select id from public.leads where id = $1`, [e.lead_id])).length, 0);
  // O outro gerente não consegue atribuir.
  await assert.rejects(rpc(outro, `select public.distribuicao_atribuir($1, $2)`, [e.lead_id, id(corretor)]), /não atribui/);
  await rpc(g, `select public.distribuicao_atribuir($1, $2)`, [e.lead_id, id(corretor)]);
  const l = await um(`select dono_id, distribuicao_estado, atribuido_em, atribuido_por from public.leads where id = $1`, [e.lead_id]);
  assert.equal(quem(l.dono_id), corretor);
  assert.equal(l.distribuicao_estado, null);
  assert.ok(l.atribuido_em, "os 15 min do corretor começam no repasse");
  assert.equal(quem(l.atribuido_por), g);
  const man = await um(`select motivo_entrada from public.distribuicao_decisoes where lead_id = $1 and recebeu_id = $2`, [e.lead_id, id(corretor)]);
  assert.equal(man.motivo_entrada, "manual");
  // O repasse atrasado avisa o gerente geral (15 min no horário).
  const e2 = await entrada();
  await avancar(16);
  await db.query(`select private.distribuicao_rotina()`);
  const av = await um(`select tipo from public.distribuicao_avisos where lead_id = $1 and tipo = 'repasse_atrasado'`, [e2.lead_id]);
  assert.equal(av?.tipo, "repasse_atrasado");
});

test("5. produtos: quem não atende é pulado mantendo a posição; equipe sem ninguém que atenda é pulada", async () => {
  await zera();
  await liga([A1, A2, B1]);
  await db.query(`insert into public.distribuicao_produtos values ($1, $2), ($3, $2)`, [id(B1), EASY, id(A1)]);
  const e1 = await entrada({ produto: "Easy" });
  assert.equal(quem(e1.lead.dono_id), A2, "B não atende Easy (pulada) e A1 também não");
  const d = await um(`select equipes, candidatos from public.distribuicao_decisoes where lead_id = $1`, [e1.lead_id]);
  const pulado = d.candidatos.find((c) => quem(c.corretor_id) === A1);
  assert.equal(pulado.motivo, "nao_atende");
  // Lead sem produto do catálogo: todos atendem.
  const e2 = await entrada({ produto: "Prédio que não existe" });
  assert.ok(e2.lead.dono_id);
  assert.equal(e2.lead.empreendimento, "Prédio que não existe");
  // Com o id do catálogo, vale o id.
  const e3 = await entrada({ produto: "Outro nome", prod_id: EASY });
  assert.equal(e3.lead.empreendimento, "Easy");
  // Chave de produtos desligada: todos atendem todos.
  await cfg({ produtos: false });
  const v = [];
  for (let i = 0; i < 4; i++) v.push(quem((await entrada({ produto: "Easy" })).lead.dono_id));
  assert.ok(v.includes(B1) && v.includes(A1), `${v}`);
});

test("6. pesos 3, 2 e 1: em 12 leads, 6, 4 e 2; sem os pesos, 4, 4 e 4", async () => {
  await zera({ modo: "direto" });
  await liga([A1, A2, A3]);
  await db.query(`insert into public.distribuicao_desempenho (corretor_id, semana, faixa, peso) values
    ($1, '2026-11-09', 'acima', 3), ($2, '2026-11-09', 'media', 2), ($3, '2026-11-09', 'abaixo', 1)`, [id(A1), id(A2), id(A3)]);
  const conta = async () => {
    const c = { [A1]: 0, [A2]: 0, [A3]: 0 };
    for (let i = 0; i < 12; i++) c[quem((await entrada()).lead.dono_id)]++;
    await db.exec(`update public.leads set etapa = 'em_contato' where etapa = 'novo'`);
    return c;
  };
  assert.deepEqual(await conta(), { [A1]: 6, [A2]: 4, [A3]: 2 });
  await cfg({ pesos: false });
  await db.exec(`update public.distribuicao_corretores set creditos = 0`);
  assert.deepEqual(await conta(), { [A1]: 4, [A2]: 4, [A3]: 4 });
});

test("7. teto dos créditos: quem volta da ausência recebe um lead, sem rajada", async () => {
  await zera({ modo: "direto" });
  await liga([A1, A2, A3]);
  const pr = (await um(`select id from public.distribuicao_presencas where corretor_id = $1`, [id(A3)])).id;
  await db.query(`insert into public.distribuicao_ausencias (presenca_id, inicio, motivo) values ($1, (select t from teste.relogio), 'saiu')`, [pr]);
  for (let i = 0; i < 8; i++) {
    const e = await entrada();
    assert.notEqual(quem(e.lead.dono_id), A3);
    if (i === 0) {
      const c = (await um(`select candidatos from public.distribuicao_decisoes where lead_id = $1`, [e.lead_id])).candidatos;
      if (c[0] && quem(c[0].corretor_id) === A3) assert.equal(c[0].motivo, "fora_do_stand");
    }
  }
  await db.query(`update public.distribuicao_ausencias set fim = (select t from teste.relogio) where presenca_id = $1`, [pr]);
  const v = [];
  for (let i = 0; i < 3; i++) v.push(quem((await entrada()).lead.dono_id));
  assert.equal(v.filter((x) => x === A3).length, 1, `uma vez só: ${v}`);
  assert.equal(v[0], A3, "volta na frente");
});

test("8. fora do horário: plantão com prazo na hora, fim do plantão, represados e a abertura", async () => {
  await zera({ modo: "direto" });
  await relogio("22:00");
  await liga([A1], { checkin: false });
  // A2 deixou o botão ligado durante o dia e não abriu o app à noite: desliga sem aviso.
  await db.query(`insert into public.distribuicao_corretores (corretor_id, recebendo, ultimo_app_em) values ($1, true, '2026-11-10T18:00:00-03:00')
                  on conflict (corretor_id) do update set recebendo = true, ultimo_app_em = excluded.ultimo_app_em`, [id(A2)]);
  const e = await entrada();
  assert.equal(quem(e.lead.dono_id), A1);
  assert.equal(e.lead.prazo_imediato, true, "quem está de plantão tem os 15 min na hora");
  // 31 min sem usar o app: o botão desliga sozinho.
  await avancar(31);
  await db.query(`select private.distribuicao_rotina()`);
  assert.equal((await um(`select recebendo from public.distribuicao_corretores where corretor_id = $1`, [id(A1)])).recebendo, false);
  const fins = await linhas(`select para_id from public.distribuicao_avisos where tipo = 'plantao_fim'`);
  assert.deepEqual(fins.map((x) => quem(x.para_id)), [A1], "só quem estava de plantão recebe o aviso");
  // Sem ninguém de plantão: represado.
  const r1_ = await entrada({ recebido: "2026-11-10T22:40:00-03:00" });
  const r2 = await entrada({ recebido: "2026-11-10T22:45:00-03:00" });
  const r3 = await entrada({ recebido: "2026-11-10T22:50:00-03:00" });
  for (const x of [r1_, r2, r3]) assert.equal(x.lead.distribuicao_estado, "represado");
  // 16.5 e 16.13: alguém liga o botão à noite e recebe um represado por vez.
  await liga([B1], { checkin: false });
  await db.query(`select private.distribuicao_rotina()`);
  assert.equal(quem(await dono(r1_.lead_id)), B1, "o mais antigo primeiro");
  assert.equal(await dono(r2.lead_id), null, "o próximo só sai quando ele atender");
  // Lead novo da entrada não espera o teto.
  const n = await entrada();
  assert.equal(quem(n.lead.dono_id), B1);
  // Anotação não libera; o toque no WhatsApp libera.
  await rpc(B1, `insert into public.lead_interacoes (lead_id, texto, tipo, proximo_contato) values ($1, 'anotação', 'nota', now() + interval '1 day')`, [r1_.lead_id]);
  await db.query(`select private.distribuicao_rotina()`);
  assert.equal(await dono(r2.lead_id), null);
  await rpc(B1, `insert into public.lead_interacoes (lead_id, texto, tipo) values ($1, 'Abriu o WhatsApp', 'toque_whatsapp')`, [r1_.lead_id]);
  await db.query(`select private.distribuicao_rotina()`);
  assert.equal(quem(await dono(r2.lead_id)), B1);
  // Outro corretor liga o botão: recebe o próximo.
  await liga([B2], { checkin: false });
  await db.query(`select private.distribuicao_rotina()`);
  assert.equal(quem(await dono(r3.lead_id)), B2);
  // Abertura (9h): o represado restante sai no horário, um por vez pela roleta.
  await db.exec(`update public.distribuicao_corretores set recebendo = false`);
  const r4 = await entrada();
  assert.equal(r4.lead.distribuicao_estado, "represado");
  await relogio("09:01", "2026-11-11");
  await liga([A2]);
  await db.query(`select private.distribuicao_rotina()`);
  const l4 = await um(`select dono_id, prazo_imediato from public.leads where id = $1`, [r4.lead_id]);
  assert.equal(quem(l4.dono_id), A2);
  assert.equal(l4.prazo_imediato, false);
});

test("9. as quatro combinações de plantão e represar à noite", async () => {
  for (const [plantao, represar, comBotao, espera] of [
    [true, true, true, "plantao"], [true, true, false, "represado"],
    [true, false, false, "todos"], [false, true, true, "represado"], [false, false, true, "todos"]]) {
    await zera({ modo: "direto", plantao, represar });
    await relogio("23:00");
    if (comBotao) await liga([A1], { checkin: false });
    const e = await entrada();
    const rotulo = `plantao=${plantao} represar=${represar} botao=${comBotao}`;
    if (espera === "represado") assert.equal(e.lead.distribuicao_estado, "represado", rotulo);
    else assert.ok(e.lead.dono_id, rotulo);
    if (espera === "plantao") assert.equal(e.lead.prazo_imediato, true, rotulo);
    if (espera === "todos") assert.equal(e.lead.prazo_imediato, false, `${rotulo}: prazo na abertura`);
  }
  // Represar desligado com represados guardados: saem na hora.
  await zera({ modo: "direto" });
  await relogio("23:00");
  const e = await entrada();
  assert.equal(e.lead.distribuicao_estado, "represado");
  await cfg({ represar: false });
  await db.query(`select private.distribuicao_rotina()`);
  assert.ok(await dono(e.lead_id), "saiu para todos os que participam");
});

test("10. sinal: fora do raio pergunta; sem resposta em 5 min fica ausente; sem sinal há 30 min é pulado mantendo a posição", async () => {
  await zera({ modo: "direto" });
  await liga([A1, A2]);
  await relogio("10:00");
  // Fora do raio (uns 2 km): pergunta.
  const s = await r1(A1, `select public.distribuicao_sinal(-23.718, -46.55, 10) r`);
  assert.equal(s.resultado, "fora");
  assert.equal(s.perguntar, true);
  await avancar(6);
  await db.query(`select private.distribuicao_rotina()`);
  const e = await entrada();
  assert.equal(quem(e.lead.dono_id), A2);
  const c = (await um(`select candidatos from public.distribuicao_decisoes where lead_id = $1`, [e.lead_id])).candidatos;
  assert.equal(c.find((x) => quem(x.corretor_id) === A1)?.motivo, "fora_do_stand");
  // Voltou ao raio: volta a receber.
  await rpc(A1, `select public.distribuicao_sinal(-23.7, -46.55, 10)`);
  assert.equal((await r1(A1, `select public.distribuicao_meu_estado() r`)).situacao, "apto");
  // "Estou no stand": não pergunta de novo nos próximos sinais.
  await r1(A1, `select public.distribuicao_sinal(-23.718, -46.55, 10) r`);
  await rpc(A1, `select public.distribuicao_responder_saida(false)`);
  assert.equal((await r1(A1, `select public.distribuicao_sinal(-23.718, -46.55, 10) r`)).perguntar, false);
  await rpc(A1, `select public.distribuicao_sinal(-23.7, -46.55, 10)`);
  // Sem sinal há 31 min: pulado mantendo a posição e com aviso.
  await avancar(31);
  await rpc(A2, `select public.distribuicao_sinal(-23.7, -46.55, 10)`);
  await db.query(`select private.distribuicao_rotina()`);
  assert.equal((await r1(A1, `select public.distribuicao_meu_estado() r`)).situacao, "sem_sinal");
  assert.equal((await um(`select count(*)::int n from public.distribuicao_avisos where tipo = 'sem_sinal' and para_id = $1`, [id(A1)])).n, 1);
  const credAntes = (await um(`select creditos from public.distribuicao_corretores where corretor_id = $1`, [id(A1)])).creditos;
  await entrada();
  const credDepois = (await um(`select creditos from public.distribuicao_corretores where corretor_id = $1`, [id(A1)])).creditos;
  assert.ok(Number(credDepois) >= Number(credAntes), "mantém a posição (ganha créditos, não perde)");
});

test("11. check-in pela localização: dentro, longe, impreciso; checkout sem GPS", async () => {
  await zera();
  await relogio("10:00");
  await rpc(A1, `select public.distribuicao_receber(true)`);
  const longe = await r1(A1, `select public.distribuicao_checkin($1, -23.71, -46.55, 10) r`, [randomUUID()]);
  assert.equal(longe.resultado, "fora");
  assert.ok(longe.dist_m > 1000);
  await avancar(1);
  assert.equal((await r1(A1, `select public.distribuicao_checkin($1, -23.7, -46.55, 300) r`, [randomUUID()])).resultado, "incerto");
  assert.equal((await r1(A1, `select public.distribuicao_checkin($1, -23.7, -46.55, 10) r`, [randomUUID()])).resultado, "aguarde",
    "uma tentativa a cada 20 s");
  await avancar(1);
  const ok = await r1(A1, `select public.distribuicao_checkin($1, -23.7001, -46.5501, 15) r`, [randomUUID()]);
  assert.equal(ok.resultado, "dentro");
  assert.equal(ok.plantao, "Marco Zero");
  const cols = (await linhas(`select column_name from information_schema.columns where table_name in ('distribuicao_presencas', 'distribuicao_sinais')`))
    .map((c) => c.column_name);
  assert.ok(!cols.includes("lat") && !cols.includes("lng"), "sem coordenadas guardadas");
  const est = await r1(A1, `select public.distribuicao_meu_estado() r`);
  assert.equal(est.situacao, "apto");
  assert.equal(est.presenca.origem, "checkin");
  assert.equal((await r1(A1, `select public.distribuicao_checkout() r`)).fechou, true);
  assert.equal((await r1(A1, `select public.distribuicao_meu_estado() r`)).situacao, "sem_checkin");
});

test("12. a vez da recepção vale como presença (16.8); 'Saiu' pula mantendo a posição", async () => {
  await zera({ modo: "direto" });
  await relogio("10:00");
  await liga([A1], { checkin: false });
  assert.equal((await r1(A1, `select public.distribuicao_meu_estado() r`)).situacao, "sem_checkin");
  const pid = randomUUID();
  await db.query(`insert into public.plantao_presencas (id, plantao_id, dia, turno, papel, pessoa_id, ordem, entrada_em)
                  values ($1, $2, '2026-11-10', 'manha', 'corretor', $3, 1, '2026-11-10T08:52:00-03:00')`, [pid, MZ, id(A1)]);
  const est = await r1(A1, `select public.distribuicao_meu_estado() r`);
  assert.equal(est.situacao, "apto");
  assert.equal(est.presenca.origem, "recepcao");
  assert.equal(quem((await entrada()).lead.dono_id), A1);
  await db.query(`insert into public.plantao_presenca_eventos (id, presenca_id, tipo, em) values ($1, $2, 'saida', (select t from teste.relogio))`, [randomUUID(), pid]);
  assert.equal((await r1(A1, `select public.distribuicao_meu_estado() r`)).situacao, "fora_do_stand");
  // Check-in desligado: nenhuma das duas fontes conta; vale o botão.
  await cfg({ exigir_checkin: false });
  assert.equal((await r1(A1, `select public.distribuicao_meu_estado() r`)).situacao, "apto");
});

test("13. prazo estourado: fim da fila, aviso, passa adiante na equipe, nunca ao mesmo; ninguém sobrando vai para A distribuir", async () => {
  await zera();
  await liga([A1, A2, B1]);
  const e = await entrada();
  const eq = e.lead.equipe_id;
  const primeiro = quem(e.lead.dono_id);
  await avancar(16);
  await db.query(`select private.distribuicao_rotina()`);
  const l1 = await um(`select dono_id, redistribuicoes from public.leads where id = $1`, [e.lead_id]);
  assert.notEqual(quem(l1.dono_id), primeiro, "nunca ao mesmo");
  assert.equal(l1.redistribuicoes, 1);
  if (eq === EQ_A) assert.ok([A1, A2].includes(quem(l1.dono_id)), "primeiro na mesma equipe");
  const avisos = await linhas(`select tipo, para_id from public.distribuicao_avisos where lead_id = $1 order by id`, [e.lead_id]);
  assert.ok(avisos.some((a) => a.tipo === "fim_da_fila" && quem(a.para_id) === primeiro));
  assert.ok(avisos.some((a) => a.tipo === "perda"));
  const ev = await um(`select detalhe from public.lead_eventos where lead_id = $1 and tipo = 'dono' order by criado_em desc limit 1`, [e.lead_id]);
  assert.equal(ev.detalhe, "redistribuido");
  // Conta como perdido no painel (16.3).
  const perd = await rpc(GG, `select corretor_id from public.leads_perdidos(now() - interval '1 day', now() + interval '1 day') where lead_id = $1`, [e.lead_id]);
  assert.equal(quem(perd[0]?.corretor_id), primeiro, "a passagem automática conta como perdido");
  // Passa até acabar: depois de todos, A distribuir com aviso ao gerente geral.
  for (let i = 0; i < 4; i++) {
    await avancar(16);
    await liga([A1, A2, B1]);   // o app aberto manda o sinal (senão, "sem sinal" depois de 30 min)
    await db.query(`select private.distribuicao_rotina()`);
  }
  const fim = await um(`select dono_id, distribuicao_estado from public.leads where id = $1`, [e.lead_id]);
  assert.equal(fim.dono_id, null);
  assert.equal(fim.distribuicao_estado, "a_distribuir");
  assert.ok(await um(`select 1 from public.distribuicao_avisos where tipo = 'a_distribuir' and lead_id = $1`, [e.lead_id]));
  const donos = await linhas(`select distinct para from public.lead_eventos where lead_id = $1 and tipo = 'dono' and para is not null`, [e.lead_id]);
  assert.equal(donos.length, 3, "passou pelos três, um vez cada");
  // O gerente geral vê e atribui.
  const lista = await r1(GG, `select public.distribuicao_a_distribuir() r`);
  assert.ok(lista.some((x) => x.lead_id === e.lead_id && x.motivo === "ninguem_sobrando"));
  await rpc(GG, `select public.distribuicao_atribuir($1, $2)`, [e.lead_id, id(A1)]);
  assert.equal(quem(await dono(e.lead_id)), A1);
});

test("14. chaves do prazo: sem redistribuir, o lead fica e o gerente é avisado; sem fim da fila, só pula", async () => {
  await zera({ redistribuir: false, fim_da_fila: false });
  await liga([A1, A2]);
  const e = await entrada();
  const d0 = e.lead.dono_id;
  const cred = (await um(`select creditos from public.distribuicao_corretores where corretor_id = $1`, [d0])).creditos;
  await avancar(16);
  await db.query(`select private.distribuicao_rotina()`);
  assert.equal(await dono(e.lead_id), d0, "nada se move");
  assert.ok(await um(`select 1 from public.distribuicao_avisos where tipo = 'perda' and lead_id = $1`, [e.lead_id]));
  assert.equal((await um(`select creditos from public.distribuicao_corretores where corretor_id = $1`, [d0])).creditos, cred);
  // Com o lead estourado na carteira, é pulado (decisão 4), mantendo a posição.
  const x = await entrada();
  assert.notEqual(x.lead.dono_id, d0);
  const c = (await um(`select candidatos from public.distribuicao_decisoes where lead_id = $1`, [x.lead_id])).candidatos;
  assert.equal(c.find((k) => k.corretor_id === d0)?.motivo, "prazo_estourado");
});

test("15. atribuição à mão conta como vez (e a chave)", async () => {
  await zera({ modo: "direto" });
  await liga([A1, A2]);
  await db.exec(`update public.distribuicao_corretores set creditos = 5 where corretor_id = '${id(A1)}'`);
  // Lead da empresa cadastrado pelo gerente para A1.
  await rpc(G1, `insert into public.leads (nome, origem, dono_id) values ('Manual', 'empresa', $1)`, [id(A1)]);
  const c = await um(`select creditos from public.distribuicao_corretores where corretor_id = $1`, [id(A1)]);
  assert.ok(Number(c.creditos) < 0, "o cadastro pelo gerente já para o corretor conta como vez (decisão 10)");
  const [{ id: lid }] = await linhas(`select id from public.leads where nome = 'Manual'`);
  await db.exec(`update public.distribuicao_corretores set creditos = 5 where corretor_id = '${id(A2)}'`);
  await rpc(G1, `update public.leads set dono_id = $1 where id = $2`, [id(A2), lid]);
  const depois = await um(`select creditos from public.distribuicao_corretores where corretor_id = $1`, [id(A2)]);
  assert.ok(Number(depois.creditos) < 0, "a troca de dono também");
  await cfg({ manual_conta: false });
  await db.exec(`update public.distribuicao_corretores set creditos = 5 where corretor_id = '${id(A2)}'`);
  await rpc(G1, `update public.leads set dono_id = $1 where id = $2`, [id(A2), lid]);
  assert.equal(Number((await um(`select creditos from public.distribuicao_corretores where corretor_id = $1`, [id(A2)])).creditos), 5);
});

test("16. lead repetido: ativo vai ao dono sem gastar vez; descartado reativa; dono desativado vai pela roleta; a chave", async () => {
  await zera({ modo: "direto" });
  await liga([A1, A2]);
  const e = await entrada();
  const d0 = e.lead.dono_id;
  await rpc(quem(d0), `insert into public.lead_interacoes (lead_id, texto, tipo, proximo_contato) values ($1, 'Falei', 'whatsapp', now() + interval '2 days')`, [e.lead_id]);
  const antes = await um(`select ultima_interacao_em, etapa from public.leads where id = $1`, [e.lead_id]);
  assert.equal(antes.etapa, "em_contato");
  const nDec = (await um(`select count(*)::int n from public.distribuicao_decisoes`)).n;
  const r = await entrada({ tel: e.tel, msg: "Voltei a procurar" });
  assert.equal(r.situacao, "anexado");
  assert.equal(r.lead_id, e.lead_id);
  assert.equal((await um(`select count(*)::int n from public.distribuicao_decisoes`)).n, nDec, "não gasta vez");
  const depois = await um(`select ultima_interacao_em, resposta_ate from public.leads where id = $1`, [e.lead_id]);
  assert.equal(String(depois.ultima_interacao_em), String(antes.ultima_interacao_em), "o último contato fica intacto");
  assert.ok(depois.resposta_ate, "prazo novo de 15 min");
  assert.ok(await um(`select 1 from public.distribuicao_avisos where tipo = 'mensagem_nova' and para_id = $1`, [d0]));
  // 15 min sem resposta: avisa o corretor e o gerente (16.7); não tira da vez.
  await avancar(16);
  await db.query(`select private.distribuicao_rotina()`);
  const t = (await linhas(`select tipo from public.distribuicao_avisos where lead_id = $1`, [e.lead_id])).map((x) => x.tipo);
  assert.ok(t.includes("mensagem_sem_resposta") && t.includes("mensagem_sem_resposta_equipe"), t.join());
  // A conversa limpa o prazo da mensagem.
  await rpc(quem(d0), `insert into public.lead_interacoes (lead_id, texto, tipo) values ($1, 'Liguei', 'toque_ligacao')`, [e.lead_id]);
  assert.equal((await um(`select resposta_ate from public.leads where id = $1`, [e.lead_id])).resposta_ate, null);

  // Descartado: reativa o mesmo lead e manda pela roleta.
  await rpc(quem(d0), `update public.leads set status = 'descartado', motivo_descarte = 'sem_retorno' where id = $1`, [e.lead_id]);
  const re = await entrada({ tel: e.tel });
  assert.equal(re.situacao, "reativado");
  assert.equal(re.lead_id, e.lead_id);
  assert.equal(re.lead.status, "ativo");
  assert.ok(re.lead.dono_id);

  // Lead de parceiro ativo com o mesmo telefone: a mensagem vai ao dono dele, sem roleta.
  const tp = novoTel();
  await rpc(G1, `insert into public.leads (nome, origem, whatsapp, dono_id) values ('Do anúncio', 'anuncio_proprio', $1, $2)`, [tp, id(A1)]).catch(() => null);
  await db.query(`insert into public.leads (nome, origem, whatsapp, dono_id) values ('Do anúncio', 'outros', $1, $2)`, [tp, id(A1)]);
  const ao = await entrada({ tel: tp });
  assert.equal(ao.situacao, "anexado");

  // Mensagem de quem já está em A distribuir: só anexa, o lead fica onde está.
  await cfg({ ligada: false });
  const sd = await entrada();
  assert.equal(sd.lead.distribuicao_estado, "a_distribuir");
  await cfg({ ligada: true });
  const sd2 = await entrada({ tel: sd.tel });
  assert.equal(sd2.situacao, "anexado");
  const sdl = await um(`select dono_id, distribuicao_estado from public.leads where id = $1`, [sd.lead_id]);
  assert.equal(sdl.dono_id, null);
  assert.equal(sdl.distribuicao_estado, "a_distribuir");

  // Chave desligada: cria lead novo.
  await cfg({ repetido_ao_dono: false });
  const nv = await entrada({ tel: e.tel });
  assert.equal(nv.situacao, "criado");
  assert.notEqual(nv.lead_id, e.lead_id);
});

test("17. a entrada: repetida devolve o mesmo lead; dado ruim grava sem erro; o erro não leva dado do cliente", async () => {
  await zera();
  await liga([A1]);
  const id1 = randomUUID();
  const [a] = await rpc("servico", `select * from public.lead_empresa_entrada($1, now(), 'Fulano', '5511999990000', null, 'oi', 'zap', null)`, [id1]);
  const [b] = await rpc("servico", `select * from public.lead_empresa_entrada($1, now(), 'Fulano', '5511999990000', null, 'oi', 'zap', null)`, [id1]);
  assert.equal(b.situacao, "repetido");
  assert.equal(b.lead_id, a.lead_id);
  const [c] = await rpc("servico", `select * from public.lead_empresa_entrada($1, now(), '', '123', 'nao-e-email', null, 'site', null)`, [randomUUID()]);
  const l = await um(`select nome, whatsapp, email from public.leads where id = $1`, [c.lead_id]);
  assert.equal(l.nome, "Sem nome");
  assert.equal(l.whatsapp, null);
  assert.equal(l.email, null);
  await assert.rejects(
    rpc("servico", `select * from public.lead_empresa_entrada('', now(), 'Maria Secreta', '5511988887777', 'maria@x.test', null, 'site', null)`),
    (err) => !/Maria|5511988887777|maria@/.test(err.message));
  // Só o servidor chama a entrada.
  await assert.rejects(rpc(A1, `select * from public.lead_empresa_entrada('x', now(), 'n', null, 'a@b.co', null, 'site', null)`), /permission denied/);
  await assert.rejects(rpc(GG, `select * from public.lead_empresa_entrada('x', now(), 'n', null, 'a@b.co', null, 'site', null)`), /permission denied/);
});

test("18. a chave geral desligada: o lead vai para A distribuir; ligar não devolve à roleta sozinho", async () => {
  await zera({ ligada: false });
  await liga([A1]);
  const e = await entrada();
  assert.equal(e.situacao, "a_distribuir");
  assert.equal(e.lead.dono_id, null);
  assert.equal(e.lead.distribuicao_estado, "a_distribuir");
  await cfg({ ligada: true });
  await db.query(`select private.distribuicao_rotina()`);
  assert.equal(await dono(e.lead_id), null, "não volta sozinho");
  assert.equal(await r1(GG, `select public.distribuicao_mandar_todos() r`), 1);
  assert.equal(quem(await dono(e.lead_id)), A1);
  // Desligar no meio do dia com gente na fila e represados: nada some.
  await relogio("23:00");
  await db.exec(`update public.distribuicao_corretores set recebendo = false`);
  const rep = await entrada();
  assert.equal(rep.lead.distribuicao_estado, "represado");
  await cfg({ ligada: false });
  await relogio("09:30", "2026-11-11");
  await liga([A1]);
  await db.query(`select private.distribuicao_rotina()`);
  const l = await um(`select dono_id, distribuicao_estado from public.leads where id = $1`, [rep.lead_id]);
  assert.equal(l.dono_id, null);
  assert.equal(l.distribuicao_estado, "represado", "fica guardado e aparece em A distribuir");
  assert.ok((await r1(GG, `select public.distribuicao_a_distribuir() r`)).some((x) => x.lead_id === rep.lead_id));
  // O histórico das chaves registra quem, de e para.
  const h = await r1(GG, `select public.distribuicao_config_historico() r`);
  assert.ok(h.some((x) => x.chave === "ligada" && x.para === "false"));
});

test("19. desligar o check-in fecha as presenças abertas; desligar o sinal apaga os sinais", async () => {
  await zera();
  await liga([A1, A2]);
  await cfg({ sinal: false });
  assert.equal((await um(`select count(*)::int n from public.distribuicao_sinais`)).n, 0);
  await cfg({ exigir_checkin: false });
  assert.equal((await um(`select count(*)::int n from public.distribuicao_presencas where status = 'aberta'`)).n, 0);
  const p = await um(`select saida_metodo from public.distribuicao_presencas limit 1`);
  assert.equal(p.saida_metodo, "chave_desligada");
  await assert.rejects(rpc(A1, `select public.distribuicao_checkin($1, -23.7, -46.55, 10)`, [randomUUID()]), /desligado/);
});

test("20. fila de leads: escopo por modo, o corretor não vê créditos; transparência desligada some", async () => {
  await zera();
  await liga([A1, A2, B1]);
  const f = await r1(A1, `select public.distribuicao_fila() r`);
  assert.equal(f.escopo, "equipe");
  assert.equal(f.equipe_nome, "Equipe A");
  assert.ok(f.itens.every((x) => x.creditos === null && x.equipe_nome === "Equipe A"));
  assert.ok(f.itens.some((x) => x.eu));
  const g = await r1(G1, `select public.distribuicao_fila() r`);
  assert.ok(g.itens.every((x) => x.creditos !== null));
  await cfg({ modo: "direto" });
  const d = await r1(A1, `select public.distribuicao_fila() r`);
  assert.equal(d.escopo, "empresa");
  assert.ok(d.itens.some((x) => x.equipe_nome === "Equipe B"));
  const gd = await r1(G1, `select public.distribuicao_fila() r`);
  assert.ok(gd.itens.filter((x) => x.equipe_nome === "Equipe B").every((x) => x.creditos === null), "detalhe só da equipe dele");
  const est = await r1(A1, `select public.distribuicao_meu_estado() r`);
  assert.ok(est.posicao >= 1);
  assert.equal(est.escopo, "empresa");
  await cfg({ transparencia: false });
  await assert.rejects(rpc(A1, `select public.distribuicao_fila()`), /não está visível/);
  assert.equal((await r1(A1, `select public.distribuicao_meu_estado() r`)).posicao, null);
  assert.ok((await r1(G1, `select public.distribuicao_fila() r`)).itens.length > 0, "o gerente continua vendo");
});

test("21. pausa, participação e produtos por perfil", async () => {
  await zera();
  await liga([A1, A2]);
  await rpc(A1, `select public.distribuicao_pausar($1, null)`, [id(A1)]);
  assert.equal((await r1(A1, `select public.distribuicao_meu_estado() r`)).situacao, "pausa");
  await assert.rejects(rpc(A1, `select public.distribuicao_pausar($1, null)`, [id(A2)]), /não pode/);
  await assert.rejects(rpc(G2, `select public.distribuicao_pausar($1, null)`, [id(A2)]), /não pode/);
  await rpc(G1, `select public.distribuicao_voltar($1)`, [id(A1)]);
  await rpc(G1, `select public.distribuicao_participa($1, false)`, [id(A2)]);
  await assert.rejects(rpc(A1, `select public.distribuicao_participa($1, true)`, [id(A1)]), /Só o gerente/);
  assert.equal((await r1(A2, `select public.distribuicao_meu_estado() r`)).situacao, "fora_gerente");
  const reg = await linhas(`select tipo, quem from public.distribuicao_pausas where corretor_id in ($1, $2) order by id`, [id(A1), id(A2)]);
  assert.deepEqual(reg.filter((x) => x.tipo !== "liga").map((x) => x.tipo), ["pausa", "volta", "fora"]);
  // Produtos: gerente da equipe e operacional marcam; outro gerente e o corretor, não.
  await rpc(G1, `select public.distribuicao_produtos_salvar($1, $2)`, [id(A1), [EASY]]);
  await rpc(OP, `select public.distribuicao_produtos_salvar($1, $2)`, [id(B1), [EASY]]);
  assert.equal((await um(`select count(*)::int n from public.distribuicao_produtos where corretor_id = $1`, [id(B1)])).n, 1, "o operacional marca qualquer corretor");
  await assert.rejects(rpc(G2, `select public.distribuicao_produtos_salvar($1, $2)`, [id(A1), []]), /não marca/);
  await assert.rejects(rpc(A1, `select public.distribuicao_produtos_salvar($1, $2)`, [id(A1), []]), /não marca/);
  const p = await r1(A1, `select public.distribuicao_produtos($1) r`, [id(A1)]);
  assert.equal(p.find((x) => x.nome === "Easy").atende, false);
});

test("22. RLS: A distribuir, config, entrada e tabelas por perfil", async () => {
  await zera({ ligada: false });
  const e = await entrada();
  for (const n of [A1, G1, REC, OP]) {
    assert.equal((await rpc(n, `select id from public.leads where id = $1`, [e.lead_id])).length, 0, `perfil ${n} não vê`);
    await assert.rejects(rpc(n, `select public.distribuicao_a_distribuir()`), /não vê/);
  }
  assert.equal((await rpc(GG, `select id from public.leads where id = $1`, [e.lead_id])).length, 1);
  // leads.distribuir dado ao operacional: passa a ver e atribuir.
  await db.query(`insert into public.role_permissions values ('operacional', 'leads.distribuir')`);
  assert.equal((await rpc(OP, `select id from public.leads where id = $1`, [e.lead_id])).length, 1);
  await rpc(OP, `select public.distribuicao_atribuir($1, $2)`, [e.lead_id, id(B1)]);
  assert.equal(quem(await dono(e.lead_id)), B1);
  await db.query(`delete from public.role_permissions where perfil = 'operacional' and permissao = 'leads.distribuir'`);
  for (const n of [A1, G1, OP, REC])
    await assert.rejects(rpc(n, `select public.distribuicao_config_salvar('{"ligada": true}')`), /Só o gerente geral/);
  for (const t of ["distribuicao_decisoes", "distribuicao_corretores", "distribuicao_presencas", "distribuicao_entradas", "distribuicao_avisos"])
    await assert.rejects(rpc(A1, `select * from public.${t}`), /permission denied/, t);
  assert.equal((await rpc(A1, `select ligada from public.distribuicao_config`)).length, 1, "a config é lida pelas telas");
  await assert.rejects(rpc(A1, `update public.distribuicao_config set ligada = true`), /permission denied/);
  await assert.rejects(rpc("anon", `select public.distribuicao_meu_estado()`), /permission denied/);
  await assert.rejects(rpc(A1, `select public.distribuicao_avisos_pendentes()`), /permission denied/);
});

test("23. outra origem nunca entra na roleta, mesmo estourada", async () => {
  await zera();
  await liga([A1, A2]);
  await db.query(`insert into public.leads (nome, origem, dono_id, distribuido) values ('Plantão', 'plantao', $1, true)`, [id(A1)]);
  const [{ id: lid }] = await linhas(`select id from public.leads where nome = 'Plantão'`);
  assert.equal((await um(`select private.distribuir_lead($1, 'nova') r`, [lid])).r, null);
  await avancar(60);
  await db.query(`select private.distribuicao_rotina()`);
  assert.equal(quem(await dono(lid)), A1);
  assert.equal((await um(`select count(*)::int n from public.distribuicao_decisoes where lead_id = $1`, [lid])).n, 0);
  await assert.rejects(db.query(`insert into public.leads (nome, origem, dono_id, distribuicao_estado) values ('x', 'plantao', null, 'a_distribuir')`),
    /leads_sem_dono_so_empresa/);
});

test("24. um gerente, uma equipe: o banco recusa a segunda", async () => {
  await assert.rejects(db.query(`insert into public.teams (nome, gerente_id) values ('Equipe A2', $1)`, [id(G1)]), /teams_gerente_unico|duplicate key/);
});

test("25. desempenho: duas notas, faixas pela média da empresa; quem é novo fica na média; texto sem pontos", async () => {
  await zera({ modo: "direto" });
  await liga([A1, A2, A3]);
  for (let i = 0; i < 6; i++) await entrada();
  // A1 responde tudo na hora; os outros, nada.
  for (const l of await linhas(`select id from public.leads where dono_id = $1 and etapa = 'novo'`, [id(A1)]))
    await rpc(A1, `insert into public.lead_interacoes (lead_id, texto, tipo) values ($1, 'Oi', 'toque_whatsapp')`, [l.id]);
  // Os eventos de etapa saem com a hora real; o cálculo usa o relógio de teste.
  await db.exec(`update public.lead_eventos set criado_em = (select t from teste.relogio) + interval '1 minute' where tipo = 'etapa'`);
  await db.query(`update public.profiles set created_at = now() where id = $1`, [id(A3)]);
  await relogio("10:00", "2026-11-16");
  assert.ok((await um(`select private.distribuicao_desempenho_calcular() n`)).n >= 3);
  const f = Object.fromEntries((await linhas(`select corretor_id, faixa, peso, novo from public.distribuicao_desempenho`))
    .map((x) => [quem(x.corretor_id), x]));
  assert.equal(f[A1].faixa, "acima");
  assert.equal(f[A1].peso, 3);
  assert.equal(f[A3].faixa, "media", "quem é novo fica na média");
  const c = await r1(A1, `select public.distribuicao_como_calculado() r`);
  assert.equal(c.faixa, "acima");
  assert.ok(!JSON.stringify(c).match(/ponto|verba/i), "nada de pontos ou verba na resposta da tela");
  await assert.rejects(rpc(A2, `select public.distribuicao_como_calculado($1)`, [id(A1)]), /não vê/);
  assert.equal((await r1(G1, `select public.distribuicao_como_calculado($1) r`, [id(A1)])).faixa, "acima");
});

test("26. fechamento das 19h30 e as vezes do corretor", async () => {
  await zera({ modo: "direto" });
  await liga([A1, A2]);
  await entrada();
  const v = await r1(A1, `select public.distribuicao_minha_fila(now() - interval '30 days', now() + interval '30 days') r`);
  assert.ok(Array.isArray(v));
  await relogio("19:30");
  assert.equal((await um(`select private.distribuicao_fechar_presencas() n`)).n, 2);
  assert.equal((await um(`select count(*)::int n from public.distribuicao_presencas where status = 'sem_saida'`)).n, 2);
});

// ---------------------------------------------------------------------
// Dois leads ao mesmo tempo: Postgres de verdade (embedded-postgres), com a
// trava 7305002. Pula se o Postgres local não subir.
// ---------------------------------------------------------------------
let servidor, pasta;
after(async () => {
  await servidor?.stop().catch(() => {});
  if (pasta) rmSync(pasta, { recursive: true, force: true });
});

test("27. nove entradas ao mesmo tempo: cada corretor recebe três, sem repetir decisão", async (t) => {
  let EmbeddedPostgres, pg;
  try {
    EmbeddedPostgres = (await import("embedded-postgres")).default;
    pg = (await import("pg")).default;
  } catch {
    t.skip("embedded-postgres não instalado");
    return;
  }
  const porta = Number(process.env.DISTRIBUICAO_PG_PORTA ?? 54341);
  const senha = randomBytes(18).toString("base64url");
  pasta = mkdtempSync(join(tmpdir(), "distribuicao-pg-"));
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
  await admin.query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;`);
  for (const f of ["schema.sql", "parcerias.sql", "recepcao.sql", "distribuicao.sql"]) await admin.query(ler(f));
  for (const [n, nome] of [[G1, "Gerente"], [A1, "Ana"], [A2, "Beto"], [A3, "Caio"]])
    await admin.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `c${n}@x.test`, { nome }]);
  await admin.query(`
    update public.profiles set perfil = 'gerente', ativo = true where id = '${id(G1)}';
    insert into public.teams (nome, gerente_id) values ('A', '${id(G1)}');
    update public.profiles set ativo = true, apelido = split_part(nome, ' ', 1), equipe_id = (select id from public.teams)
      where id in ('${id(A1)}', '${id(A2)}', '${id(A3)}');
    update public.horario_atendimento set inicio = '00:00', fim = '23:59';
    update public.distribuicao_config set ligada = true, modo = 'direto', exigir_checkin = false;
    insert into public.distribuicao_corretores (corretor_id, recebendo, ultimo_app_em)
      select id, true, now() from public.profiles where equipe_id is not null;`);
  const pool = new pg.Pool({ ...conexao, max: 20 });
  try {
    const rs = await Promise.all(Array.from({ length: 9 }, async (_, i) => {
      const c = await pool.connect();
      try {
        await c.query("begin; set local role service_role");
        const r = (await c.query(`select * from public.lead_empresa_entrada($1, now(), $2, null, $3, null, 'site', null)`,
          [randomUUID(), `Cliente ${i}`, `c${i}@x.test`])).rows[0];
        await c.query("select pg_sleep(0.02)");
        await c.query("commit");
        return r;
      } finally {
        c.release();
      }
    }));
    assert.equal(rs.filter((r) => r.situacao === "criado").length, 9);
    const por = (await admin.query(`select dono_id, count(*)::int n from public.leads group by 1`)).rows;
    assert.deepEqual(por.map((x) => x.n).sort(), [3, 3, 3], JSON.stringify(por));
    assert.equal((await admin.query(`select count(*)::int n from public.distribuicao_decisoes`)).rows[0].n, 9);
  } finally {
    await pool.end();
    await admin.end();
  }
});

test("28. ordem de carga: o direcionador.sql depois da distribuição não troca a entrada", async () => {
  const outro = new PGlite();
  await outro.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    create schema vault;
    create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, description text, secret text);
    create view vault.decrypted_secrets as select id, name, description, secret, secret as decrypted_secret from vault.secrets;
    create function vault.create_secret(new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null)
      returns uuid language sql as $$ insert into vault.secrets (name, description, secret) values (new_name, new_description, new_secret) returning id $$;
    create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null,
      new_description text default null, new_key_id uuid default null)
      returns void language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret) where id = secret_id $$;
  `);
  for (let i = 0; i < 2; i++)
    for (const f of ["schema.sql", "parcerias.sql", "recepcao.sql", "distribuicao.sql", "direcionador.sql"]) await outro.exec(ler(f));
  await outro.exec(`update public.distribuicao_config set ligada = false`);
  await outro.exec(`set role service_role`);
  const [r] = (await outro.query(`select * from public.lead_empresa_entrada('ordem-1', now(), 'Teste', null, 't@x.test', null, 'site', null)`)).rows;
  await outro.exec(`reset role`);
  assert.equal(r.situacao, "a_distribuir");
  await outro.close();
});
