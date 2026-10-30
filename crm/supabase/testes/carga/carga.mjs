// Teste de carga e de integridade do CRM, num Postgres local (veja banco.mjs).
//
//   node supabase/testes/carga/carga.mjs --usuarios 40 --minutos 10 --cliente corrigido
//
// Cada usuário virtual faz o que o app faz no navegador, com as mesmas
// consultas, como uma requisição do PostgREST: uma transação com o papel
// authenticated e o JWT da pessoa (auth.uid()). O RLS, os gatilhos e as regras
// do banco valem como no Supabase. O pool de conexões imita o do PostgREST.
//
// --cliente atual     imita o app de antes das correções (update sem conferir,
//                     reenvio cria outra linha, toque duplo no Sem resposta).
// --cliente corrigido imita o app corrigido (id gerado no aparelho, conferência
//                     de linhas alteradas, trava de toque duplo).
//
// No fim, a conferência (conferir.mjs) compara o que o app mostrou como salvo
// com o que está no banco, e o resultado vai para resultados/.
import pg from "pg";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { BANCO, MAX_CONEXOES, conexao, recriarBanco, subir } from "./banco.mjs";
import { semear } from "./seed.mjs";
import { conferir } from "./conferir.mjs";

// ---------- Parâmetros ----------
const arg = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i > 0 ? process.argv[i + 1] : padrao;
};
const USUARIOS = Number(arg("usuarios", 40));
const MINUTOS = Number(arg("minutos", 10));
const CLIENTE = arg("cliente", "corrigido");
const POOL = Number(arg("pool", 15)); // conexões do PostgREST (estimativa para o MICRO)
const PAUSA = [Number(arg("pausa-min", 1500)), Number(arg("pausa-max", 6000))]; // ms entre ações de um usuário
const CORRIGIDO = CLIENTE === "corrigido";
if (!["atual", "corrigido"].includes(CLIENTE)) throw new Error("--cliente atual | corrigido");

// ---------- Utilidades ----------
const sorteio = (xs) => xs[Math.floor(Math.random() * xs.length)];
const chance = (p) => Math.random() < p;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const token = () => randomUUID().slice(0, 13);
const iso = (ms) => new Date(Date.now() + ms).toISOString();

// ---------- Banco ----------
const servidor = await subir();
if (!process.argv.includes("--sem-reset")) {
  await recriarBanco();
  await semear();
}
const seed = JSON.parse((await import("node:fs")).readFileSync(new URL("./seed-local.json", import.meta.url), "utf8"));
if (CORRIGIDO) {
  // O SQL da correção (mesmo trecho do schema.sql) já entrou com o schema; confere.
  const c = new pg.Client(conexao());
  await c.connect();
  const r = await c.query(`select has_column_privilege('authenticated', 'public.leads', 'id', 'INSERT') ok`);
  await c.end();
  if (!r.rows[0].ok) throw new Error("--cliente corrigido pede o grant de insert (id) do schema.sql corrigido.");
}

const pool = new pg.Pool({ ...conexao(), max: POOL, connectionTimeoutMillis: 30_000 });
const monitor = new pg.Client(conexao());
await monitor.connect();

/** Uma requisição do PostgREST: transação com o papel e o JWT de quem chama. */
async function req(uid, sql, params = [], papel = "authenticated") {
  const c = await pool.connect();
  try {
    await c.query(
      `begin; set local role ${papel}; select set_config('request.jwt.claims', '${JSON.stringify({ sub: uid, role: papel })}', true)`,
    );
    const r = await c.query(sql, params);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

// ---------- Medidas ----------
const stats = new Map(); // op -> { lat: [], erros: Map(codigo -> n) }
const ocorrencias = new Map(); // nome -> n (perdas silenciosas, duplicados no cliente, etc.)
const erros403 = []; // erros de permissão a classificar (esperado x indevido)
const conta = (nome, n = 1) => ocorrencias.set(nome, (ocorrencias.get(nome) ?? 0) + n);
const confirmados = []; // o que o app mostrou como salvo
let pararEm = 0;

async function medir(op, fn) {
  const s = stats.get(op) ?? { lat: [], erros: new Map() };
  stats.set(op, s);
  const t = performance.now();
  try {
    const r = await fn();
    s.lat.push(performance.now() - t);
    return r;
  } catch (e) {
    s.lat.push(performance.now() - t);
    const codigo = e.code ?? "rede";
    s.erros.set(codigo, (s.erros.get(codigo) ?? 0) + 1);
    if (process.env.CARGA_DEBUG) console.error(op, codigo, e.message);
    return { erro: e };
  }
}
const ehPermissao = (e) => e?.code === "42501";

// ---------- O que o app faz ----------
const COLUNAS_LEAD =
  "id, dono_id, nome, whatsapp, email, origem, campanha, empreendimento, temperatura, etapa, proximo_contato, " +
  "status, motivo_descarte, valor, dormitorios, regiao, finalidade, ultima_interacao_em, ultima_interacao_texto, " +
  "tentativas, atribuido_por, atribuido_em, created_at";
const COLUNAS_VISITA =
  "id, lead_id, corretor_id, empreendimento, inicio, local, status, observacao, baixa_por, baixa_em, comprovante, created_at";

async function listaDoDia(u) {
  return medir("lista do dia", async () => {
    const [l] = await Promise.all([
      req(u.id, `select ${COLUNAS_LEAD} from public.leads where dono_id = $1 and status = 'ativo'`, [u.id]),
      req(u.id,
        `select v.${COLUNAS_VISITA.split(", ").join(", v.")}, (select to_jsonb(x) from (select id, nome, whatsapp, empreendimento, etapa, status,
           ultima_interacao_em, created_at, tentativas from public.leads where id = v.lead_id) x) lead
         from public.visitas v where corretor_id = $1 and status in ('agendada', 'confirmada') and inicio <= $2 order by inicio`,
        [u.id, iso(12 * 3600e3)]),
      req(u.id, `select id, nome, nascimento from public.leads where dono_id = $1 and status = 'ativo' and nascimento is not null`, [u.id]),
    ]);
    u.leads = l.rows;
  });
}

async function abrirFicha(u, leadId) {
  return medir("abrir ficha", () =>
    Promise.all([
      req(u.id, `select ${COLUNAS_LEAD} from public.leads where id = $1`, [leadId]),
      req(u.id, `select id, lead_id, autor_id, criado_em, tipo, texto, proximo_contato from public.lead_interacoes where lead_id = $1 order by criado_em desc`, [leadId]),
      req(u.id, `select * from public.lead_eventos where lead_id = $1 order by criado_em desc`, [leadId]),
      req(u.id, `select ${COLUNAS_VISITA} from public.visitas where lead_id = $1 order by inicio desc`, [leadId]),
      req(u.id, `select * from public.vendas where lead_id = $1 order by assinada_em desc`, [leadId]),
    ]),
  );
}

/** Insert com reenvio: "resposta perdida" grava no banco, mas o aparelho não fica sabendo e o usuário toca de novo. */
async function inserir(u, op, sql, params, { perdida = false, idCliente = null } = {}) {
  return medir(op, async () => {
    const r = await req(u.id, sql, params);
    if (!perdida) return r.rows[0];
    conta(`${op}: resposta perdida, novo toque`);
    if (!CORRIGIDO) return (await req(u.id, sql, params.map((p) => (p === idCliente ? randomUUID() : p)))).rows[0];
    try {
      return (await req(u.id, sql, params)).rows[0];
    } catch (e) {
      if (e.code === "23505" && /_pkey/.test(e.constraint ?? e.message)) {
        conta(`${op}: reenvio reconhecido pelo id`);
        return { id: idCliente };
      }
      throw e;
    }
  });
}

async function cadastrar(u, { dono = u.id, origem = null, perdida = chance(0.04) } = {}) {
  const t = token();
  const numero = `5511${String(Math.floor(9e8 + Math.random() * 9.9e7))}`;
  const colar = chance(0.3);
  // Aviso de duplicado (antes do insert), como no app.
  await medir("cadastrar: aviso de duplicado", () =>
    Promise.all([
      req(u.id, `select nome, dono_id from public.leads where whatsapp = $1 and status = 'ativo' limit 1`, [numero]),
      req(u.id, `select public.whatsapp_em_outra_carteira($1) x`, [numero]),
    ]),
  );
  const id = randomUUID();
  const cols = ["dono_id", "nome", "whatsapp", "origem", "temperatura", "proximo_contato", ...(CORRIGIDO ? ["id"] : [])];
  const vals = [dono, `Carga ${t}`, numero, origem ?? sorteio(["plantao", "indicacao", "carteira", "redes_sociais"]), sorteio(["quente", "morno", null]), iso(86400e3), ...(CORRIGIDO ? [id] : [])];
  const r = await inserir(u, "cadastrar lead",
    `insert into public.leads (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning ${COLUNAS_LEAD}`,
    vals, { perdida, idCliente: id });
  if (r?.erro) return;
  confirmados.push({ tipo: "lead", token: t });
  if (colar) {
    const idMsg = randomUUID();
    const m = await inserir(u, "cadastrar: mensagem colada",
      `insert into public.lead_interacoes (lead_id, tipo, texto${CORRIGIDO ? ", id" : ""}) values ($1, 'mensagem', $2${CORRIGIDO ? ", $3" : ""}) returning id`,
      [r.id, `Msg ${t} Olá, tenho interesse no Elleva, 2 dormitórios, até 450 mil.`, ...(CORRIGIDO ? [idMsg] : [])],
      { idCliente: idMsg });
    if (!m?.erro) confirmados.push({ tipo: "mensagem", token: t });
  }
  return r;
}

async function interacao(u, lead, { perdida = chance(0.03) } = {}) {
  const t = token();
  const id = randomUUID();
  const r = await inserir(u, "registrar interação",
    `insert into public.lead_interacoes (lead_id, tipo, texto, proximo_contato${CORRIGIDO ? ", id" : ""}) values ($1, $2, $3, $4${CORRIGIDO ? ", $5" : ""}) returning id`,
    [lead.id, sorteio(["whatsapp", "ligacao", "nota", "email"]), `Int ${t} conversou sobre a visita`, iso(2 * 86400e3), ...(CORRIGIDO ? [id] : [])],
    { perdida, idCliente: id });
  if (r?.erro) return void (ehPermissao(r.erro) && erros403.push({ op: "registrar interação", lead: lead.id, uid: u.id }));
  confirmados.push({ tipo: "interacao", token: t });
}

async function semResposta(u, lead, { duplo = chance(0.05) } = {}) {
  const uma = () =>
    medir("sem resposta", () =>
      req(u.id, `insert into public.lead_interacoes (lead_id, tipo, texto, proximo_contato) values ($1, 'tentativa', 'Sem resposta', $2) returning id`,
        [lead.id, iso(2 * 86400e3)]));
  // O app de antes não trava o botão: o segundo toque grava outra tentativa.
  const toques = duplo && !CORRIGIDO ? 2 : 1;
  if (duplo) conta("sem resposta: toque duplo");
  const rs = await Promise.all(Array.from({ length: toques }, uma));
  for (const r of rs) if (r?.erro && ehPermissao(r.erro)) erros403.push({ op: "sem resposta", lead: lead.id, uid: u.id });
  const gravados = rs.filter((r) => !r?.erro).length;
  if (gravados) confirmados.push({ tipo: "tentativa", lead: lead.id, gravados });
}

/** Update do lead como a ficha faz: só as colunas mudadas. */
async function alterarLead(u, op, lead, campos) {
  const ks = Object.keys(campos);
  const r = await medir(op, () =>
    req(u.id, `update public.leads set ${ks.map((k, i) => `${k} = $${i + 2}`).join(", ")} where id = $1 returning id`, [lead.id, ...ks.map((k) => campos[k])]));
  if (r?.erro) {
    if (ehPermissao(r.erro)) erros403.push({ op, lead: lead.id, uid: u.id });
    return false;
  }
  if (r.rowCount === 0) {
    // O RLS não dá erro: só não altera. O app de antes mostrava como salvo.
    if (CORRIGIDO) conta(`${op}: 0 linhas, erro mostrado`);
    else conta(`${op}: PERDA SILENCIOSA (0 linhas, app mostrou salvo)`);
    return false;
  }
  return true;
}

const etapa = (u, lead) => alterarLead(u, "mudar etapa", lead, { etapa: sorteio(["em_contato", "proposta", "aguardando_lancamento", "visita_agendada"]) });
const temperatura = (u, lead) => alterarLead(u, "mudar temperatura", lead, { temperatura: sorteio(["quente", "morno", "frio"]) });
const salvarPerfil = (u, lead) =>
  alterarLead(u, "salvar perfil", lead, {
    email: null, empreendimento: sorteio(["Elleva", "Dom", "Vivace"]), campanha: null, valor: 400000 + Math.floor(Math.random() * 300) * 1000,
    dormitorios: sorteio([1, 2, 3]), regiao: sorteio(["Centro", "Rudge Ramos", null]), finalidade: sorteio(["morar", "investir", null]),
  });

async function agendarVisita(u, lead, { perdida = chance(0.03) } = {}) {
  const t = token();
  const id = randomUUID();
  const r = await inserir(u, "agendar visita",
    `insert into public.visitas (lead_id, empreendimento, inicio, observacao${CORRIGIDO ? ", id" : ""}) values ($1, 'Elleva', $2, $3${CORRIGIDO ? ", $4" : ""}) returning id`,
    [lead.id, iso((1 + Math.random() * 72) * 3600e3), `Vis ${t}`, ...(CORRIGIDO ? [id] : [])], { perdida, idCliente: id });
  if (r?.erro) return void (ehPermissao(r.erro) && erros403.push({ op: "agendar visita", lead: lead.id, uid: u.id }));
  confirmados.push({ tipo: "visita", token: t });
}

async function darBaixa(u, op, visita, status) {
  const r = await medir(op, () =>
    req(u.id, `update public.visitas set status = $2 where id = $1 returning id`, [visita.id, status]));
  if (r?.erro) {
    if (ehPermissao(r.erro)) erros403.push({ op, visita: visita.id, uid: u.id });
    else if (/já tem baixa/.test(r.erro.message)) conta(`${op}: já tinha baixa (erro mostrado)`);
    return false;
  }
  if (r.rowCount === 0) conta(`${op}: 0 linhas (erro mostrado: sem permissão)`);
  else confirmados.push({ tipo: "baixa", visita: visita.id, status });
  return r.rowCount > 0;
}

async function baixaMinha(u) {
  const r = await medir("visitas para baixa", () =>
    req(u.id, `select ${COLUNAS_VISITA} from public.visitas where corretor_id = $1 and status in ('agendada', 'confirmada') and inicio <= now() order by inicio limit 5`, [u.id]));
  if (r?.erro || !r.rows.length) return;
  await darBaixa(u, "dar baixa", sorteio(r.rows), chance(0.8) ? "realizada" : "nao_compareceu");
}

async function venda(u, lead, { perdida = chance(0.03) } = {}) {
  const t = token();
  const id = randomUUID();
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const r = await inserir(u, "registrar venda",
    `insert into public.vendas (lead_id, empreendimento, vgv, assinada_em, pagamento, observacao${CORRIGIDO ? ", id" : ""})
     values ($1, 'Elleva', $2, $3, 'pendente', $4${CORRIGIDO ? ", $5" : ""}) returning id`,
    [lead.id, 450000, hoje, `Ven ${t}`, ...(CORRIGIDO ? [id] : [])], { perdida, idCliente: id });
  if (r?.erro) return void (ehPermissao(r.erro) && erros403.push({ op: "registrar venda", lead: lead.id, uid: u.id }));
  confirmados.push({ tipo: "venda", token: t });
}

// ---------- Gerente, gerente geral e recepção ----------
const corretoresDa = (gerente) => seed.corretores.filter((_, i) => seed.gerenteDoCorretor[i] === gerente);

async function painel(u) {
  return medir("painel da equipe", () =>
    Promise.all([
      req(u.id, `select id, dono_id, etapa, status, temperatura, origem, created_at, ultima_interacao_em, proximo_contato, tentativas from public.leads where status = 'ativo'`),
      req(u.id, `select ${COLUNAS_VISITA} from public.visitas where inicio >= now() - interval '30 days'`),
      req(u.id, `select id, corretor_id, vgv, assinada_em, pagamento, status from public.vendas where assinada_em >= date_trunc('year', now())`),
    ]),
  );
}

async function reatribuir(u, leadId = null) {
  const time = corretoresDa(u.id);
  let lead = leadId && { id: leadId };
  if (!lead) {
    const r = await medir("gerente: escolher lead", () =>
      req(u.id, `select id, dono_id from public.leads where status = 'ativo' and dono_id = any($1) order by random() limit 1`, [time]));
    if (r?.erro || !r.rows.length) return;
    lead = r.rows[0];
  }
  const cur = (await monitor.query(`select dono_id from public.leads where id = $1`, [lead.id])).rows[0];
  const para = sorteio(time.filter((c) => c !== cur.dono_id));
  const r = await medir("gerente: reatribuir", () =>
    req(u.id, `update public.leads set dono_id = $2 where id = $1 returning id`, [lead.id, para]));
  if (r?.erro) {
    if (ehPermissao(r.erro)) erros403.push({ op: "gerente: reatribuir", lead: lead.id, uid: u.id });
    return;
  }
  if (r.rowCount) confirmados.push({ tipo: "dono", lead: lead.id, para });
}

async function atribuirNovo(u) {
  const dono = sorteio(corretoresDa(u.id));
  return cadastrar(u, { dono, origem: "empresa" });
}

async function baixaEquipe(u, visita = null) {
  if (!visita) {
    const r = await medir("gerente: visitas da equipe", () =>
      req(u.id, `select ${COLUNAS_VISITA} from public.visitas where status in ('agendada', 'confirmada') and inicio <= now() order by random() limit 1`));
    if (r?.erro || !r.rows.length) return;
    visita = r.rows[0];
  }
  return darBaixa(u, "gerente: dar baixa", visita, "realizada");
}

async function marcarPeriodo(u) {
  const corretor = sorteio(seed.corretores);
  const dia = new Date(Date.now() - (chance(0.5) ? 0 : 86400e3)).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const periodo = sorteio(["manha", "tarde"]);
  await medir("recepção: lista do plantão", () => req(u.id, `select * from public.plantao_corretores()`));
  const r = await medir("recepção: marcar período", () =>
    req(u.id, `insert into public.lancamentos_pontos (corretor_id, criterio, data, periodo, saida_visita, comprovante) values ($1, 'periodo', $2, $3, false, null) returning id`,
      [corretor, dia, periodo]));
  if (r?.erro) {
    if (r.erro.code === "23505") conta("recepção: período já marcado (erro mostrado)");
    else if (ehPermissao(r.erro)) erros403.push({ op: "recepção: marcar período", uid: u.id });
    return;
  }
  confirmados.push({ tipo: "periodo", id: r.rows[0].id });
}

// ---------- Função avisos (pg_cron a cada 5 min; aqui, a cada 20 s) ----------
const avisosEnviados = new Map(); // usuario|chave -> vezes
async function rodadaAvisos() {
  await medir("avisos: rodada", async () => {
    const svc = "00000000-0000-0000-0000-000000000000";
    await req(svc, `select public.avisos_limpar()`, [], "service_role");
    const { rows } = await req(svc, `select public.avisos_dados() d`, [], "service_role");
    const d = rows[0].d;
    const agora = new Date(d.agora);
    const itens = d.leads
      .filter((l) => l.proximo_contato && new Date(l.proximo_contato) <= agora)
      .map((l) => ({ usuario_id: l.dono_id, chave: `contato:${l.id}:${l.proximo_contato}` }));
    if (!itens.length) return;
    const reg = await req(svc, `select public.avisos_registrar($1::jsonb) r`, [JSON.stringify(itens)], "service_role");
    for (const i of reg.rows[0].r) {
      const k = `${i.usuario_id}|${i.chave}`;
      avisosEnviados.set(k, (avisosEnviados.get(k) ?? 0) + 1);
    }
  });
}

// ---------- Corridas de propósito ----------
async function corrida() {
  const i = Math.floor(Math.random() * seed.corretores.length);
  const corretor = { id: seed.corretores[i] };
  const gerente = { id: seed.gerenteDoCorretor[i] };
  const meus = (await monitor.query(`select id from public.leads where dono_id = $1 and status = 'ativo' order by random() limit 1`, [corretor.id])).rows;
  if (!meus.length) return;
  const lead = meus[0];
  const qual = sorteio(["mesmo lead", "reatribui enquanto salva", "toque duplo", "baixa dupla", "avisos juntos"]);
  conta(`corrida: ${qual}`);
  if (qual === "mesmo lead") {
    // A mesma pessoa no celular e no computador, no mesmo lead.
    await Promise.all([etapa(corretor, lead), temperatura(corretor, lead), salvarPerfil(corretor, lead), interacao(corretor, lead), semResposta(corretor, lead)]);
  } else if (qual === "reatribui enquanto salva") {
    await Promise.all([reatribuir(gerente, lead.id), etapa(corretor, lead), interacao(corretor, lead), salvarPerfil(corretor, lead), semResposta(corretor, lead)]);
  } else if (qual === "toque duplo") {
    await Promise.all([cadastrar(corretor, { perdida: true }), semResposta(corretor, lead, { duplo: true }), agendarVisita(corretor, lead, { perdida: true })]);
  } else if (qual === "baixa dupla") {
    const v = (await monitor.query(`select id from public.visitas where corretor_id = $1 and status in ('agendada', 'confirmada') and inicio <= now() limit 1`, [corretor.id])).rows[0];
    if (v) await Promise.all([darBaixa(corretor, "dar baixa", v, "realizada"), baixaEquipe(gerente, v)]);
  } else {
    await Promise.all([rodadaAvisos(), rodadaAvisos()]);
  }
}

// ---------- Usuários virtuais ----------
async function corretorVU(u) {
  await listaDoDia(u);
  while (Date.now() < pararEm) {
    await esperar(PAUSA[0] + Math.random() * (PAUSA[1] - PAUSA[0]));
    const lead = u.leads?.length ? sorteio(u.leads) : null;
    const x = Math.random();
    if (x < 0.25 || !lead) await listaDoDia(u);
    else if (x < 0.38) await abrirFicha(u, lead.id);
    else if (x < 0.46) await cadastrar(u);
    else if (x < 0.58) await interacao(u, lead);
    else if (x < 0.66) await semResposta(u, lead);
    else if (x < 0.73) await etapa(u, lead);
    else if (x < 0.80) await temperatura(u, lead);
    else if (x < 0.84) await salvarPerfil(u, lead);
    else if (x < 0.90) await agendarVisita(u, lead);
    else if (x < 0.96) await baixaMinha(u);
    else if (x < 0.975) await venda(u, lead);
    else await abrirFicha(u, lead.id);
  }
}
async function gerenteVU(u) {
  while (Date.now() < pararEm) {
    await esperar(PAUSA[0] + Math.random() * (PAUSA[1] - PAUSA[0]));
    const x = Math.random();
    if (x < 0.35) await painel(u);
    else if (x < 0.6) await atribuirNovo(u);
    else if (x < 0.85) await reatribuir(u);
    else await baixaEquipe(u);
  }
}
async function ggVU(u) {
  while (Date.now() < pararEm) {
    await esperar(PAUSA[0] * 2 + Math.random() * PAUSA[1] * 2);
    await painel(u);
  }
}
async function recepcaoVU(u) {
  while (Date.now() < pararEm) {
    await esperar(PAUSA[0] + Math.random() * (PAUSA[1] - PAUSA[0]));
    await marcarPeriodo(u);
  }
}
async function avisosLoop() {
  while (Date.now() < pararEm) {
    await rodadaAvisos();
    await esperar(20_000);
  }
}
async function corridasLoop() {
  while (Date.now() < pararEm) {
    await esperar(10_000);
    await corrida();
  }
}

// ---------- Conexões ----------
let maxConexoes = 0;
let maxEspera = 0;
const amostras = [];
async function amostrarConexoes() {
  while (Date.now() < pararEm) {
    const r = await monitor.query(`select count(*)::int n from pg_stat_activity where datname = $1`, [BANCO]);
    maxConexoes = Math.max(maxConexoes, r.rows[0].n);
    maxEspera = Math.max(maxEspera, pool.waitingCount);
    amostras.push(r.rows[0].n);
    await esperar(1000);
  }
}

// ---------- Execução ----------
const staff = USUARIOS >= 80 ? { gerentes: 6, recepcao: 2, gg: 1 } : { gerentes: 3, recepcao: 1, gg: 1 };
const nCorretores = USUARIOS - staff.gerentes - staff.recepcao - staff.gg;
const inicio = new Date();
pararEm = Date.now() + MINUTOS * 60_000;
console.log(`Carga: ${USUARIOS} usuários (${nCorretores} sessões de corretor, ${staff.gerentes} de gerente, ${staff.recepcao} de recepção, 1 gerente geral), ` +
  `${MINUTOS} min, cliente ${CLIENTE}, pool ${POOL}, max_connections ${MAX_CONEXOES}.`);
const vus = [
  ...Array.from({ length: nCorretores }, (_, i) => corretorVU({ id: seed.corretores[i % seed.corretores.length] })),
  ...Array.from({ length: staff.gerentes }, (_, i) => gerenteVU({ id: seed.gerentes[i % 3] })),
  ...Array.from({ length: staff.recepcao }, () => recepcaoVU({ id: seed.recepcao })),
  ggVU({ id: seed.gg }),
  avisosLoop(),
  corridasLoop(),
  amostrarConexoes(),
];
const progresso = setInterval(() => {
  const total = [...stats.values()].reduce((s, x) => s + x.lat.length, 0);
  console.log(`  ${Math.round((Date.now() - inicio) / 1000)} s · ${total} operações · conexões ${amostras.at(-1) ?? 0} (máx. ${maxConexoes})`);
}, 60_000);
await Promise.all(vus);
clearInterval(progresso);
const duracao = (Date.now() - inicio) / 1000;

// Erros de permissão: esperado quando o lead (ou a visita) já não era da pessoa.
let rlsEsperado = 0;
let rlsIndevido = 0;
const indevidos = [];
for (const e of erros403) {
  if (e.lead) {
    const d = (await monitor.query(`select dono_id from public.leads where id = $1`, [e.lead])).rows[0];
    const ev = (await monitor.query(`select count(*)::int n from public.lead_eventos where lead_id = $1 and tipo = 'dono' and criado_em >= $2`, [e.lead, inicio])).rows[0].n;
    if (d.dono_id !== e.uid || ev > 0) rlsEsperado++;
    else (rlsIndevido++, indevidos.push(e));
  } else (rlsIndevido++, indevidos.push(e));
}

const conferencia = await conferir(monitor, { inicio, confirmados, avisosEnviados });
await pool.end();
await monitor.end();
await servidor.stop();

// ---------- Relatório ----------
const pct = (xs, p) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const ops = [...stats.entries()].map(([op, s]) => ({
  op,
  n: s.lat.length,
  p50: Math.round(pct(s.lat, 50)),
  p95: Math.round(pct(s.lat, 95)),
  p99: Math.round(pct(s.lat, 99)),
  erros: Object.fromEntries(s.erros),
}));
const total = ops.reduce((s, o) => s + o.n, 0);
const resultado = {
  data: inicio.toISOString(), usuarios: USUARIOS, minutos: MINUTOS, cliente: CLIENTE, pool: POOL, max_connections: MAX_CONEXOES,
  duracao_s: Math.round(duracao), operacoes: total, por_segundo: +(total / duracao).toFixed(1),
  conexoes: { maximo: maxConexoes, media: +(amostras.reduce((a, b) => a + b, 0) / (amostras.length || 1)).toFixed(1), fila_max_no_pool: maxEspera },
  ops, ocorrencias: Object.fromEntries([...ocorrencias].sort()), rls: { esperado: rlsEsperado, indevido: rlsIndevido, exemplos: indevidos.slice(0, 5) },
  conferencia,
};
mkdirSync(new URL("./resultados/", import.meta.url), { recursive: true });
const arq = new URL(`./resultados/${inicio.toISOString().replace(/[:.]/g, "-")}-${USUARIOS}u-${CLIENTE}.json`, import.meta.url);
writeFileSync(arq, JSON.stringify(resultado, null, 2));

console.log(`\n${total} operações em ${Math.round(duracao)} s (${resultado.por_segundo}/s). Conexões: máx. ${maxConexoes}, média ${resultado.conexoes.media}; fila no pool: ${maxEspera}.`);
console.table(ops.map((o) => ({ ...o, erros: Object.entries(o.erros).map(([k, v]) => `${k}:${v}`).join(" ") })));
console.log("Ocorrências:", resultado.ocorrencias);
console.log("RLS:", { esperado: rlsEsperado, indevido: rlsIndevido });
console.log("Conferência:");
for (const c of conferencia) console.log(`  ${c.ok ? "✓" : "✕"} ${c.nome}: ${c.detalhe}`);
console.log(`\nResultado em ${decodeURIComponent(arq.pathname)}`);
process.exit(conferencia.every((c) => c.ok) && rlsIndevido === 0 ? 0 : 1);
