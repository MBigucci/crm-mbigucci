// Testes da Edge Function entrada-leads, sem rede: o index.ts gerado bate com
// as fontes (e leva a regra pura igual à do Marketing), a montagem do e-mail e
// do POST, a passada inteira com Graph, banco e porta falsos, e os logs sem
// nenhum dado de cliente. Todos os dados aqui são FICTÍCIOS.
// Rode da pasta crm/: node --test supabase/functions/entrada-leads/entrada.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  argsVendas,
  dataSP,
  idDoLead,
  isoSP,
  montarEmailDestino,
  montarPost,
  passada,
  resultadoDoPost,
  ErroDeChamada,
  type Dependencias,
  type Endereco,
  type MensagemGraph,
  type Motor,
} from "./entrada.ts";
import { escolherNaRegra, somar, type Contadores, type Regra } from "../../../../marketing/src/lib/direcionador.ts";
import type { LeadDoEmail } from "../../../../marketing/src/lib/leitor-email.ts";
// @ts-expect-error módulo .mjs sem tipos
import { gerar } from "./gerar.mjs";

const ler = (u: URL) => readFileSync(u, "utf8").replace(/\r/g, "");

// ---------- O arquivo gerado ----------

test("index.ts está em dia com entrada.ts e as cópias do Marketing", () => {
  assert.equal(ler(new URL("./index.ts", import.meta.url)), gerar(), "rode: node supabase/functions/entrada-leads/gerar.mjs");
});

test("a regra pura dentro do index.ts é igual a marketing/src/lib/direcionador.ts", () => {
  const original = ler(new URL("../../../../marketing/src/lib/direcionador.ts", import.meta.url)).trimEnd();
  const index = ler(new URL("./index.ts", import.meta.url));
  assert.ok(index.includes(`namespace M_direcionador {\n${original}\n}\n`), "a cópia é o arquivo inteiro, sem mudança");
});

// ---------- Partes puras ----------

const LEAD: LeadDoEmail = {
  entrada_id: "<ficticio-1@exemplo.test>",
  recebido_em: "2026-11-07T13:30:05Z",
  fonte: "zap",
  nome: "Renata Fictícia Prado",
  telefone: "5511900000909",
  email: "renata.ficticia@exemplo.test",
  mensagem: "Quero visitar o decorado no sábado.",
  produto_id: "e-prime",
  produto_nome: "Marco Zero Prime",
};
const FONTES = [{ slug: "zap", nome: "ZAP Imóveis", remetentes: [], assunto_contem: [] }];

test("id do lead: UUID fixo para a mesma mensagem", async () => {
  const a = await idDoLead(LEAD.entrada_id);
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(await idDoLead(LEAD.entrada_id), a);
  assert.notEqual(await idDoLead("<outro@exemplo.test>"), a);
});

test("datas em São Paulo", () => {
  assert.equal(dataSP("2026-11-07T13:30:05Z"), "07/11/2026 10:30");
  assert.equal(isoSP("2026-11-07T13:30:05Z"), "2026-11-07T10:30:05-03:00");
  assert.equal(isoSP("2026-11-06T02:59:59Z"), "2026-11-05T23:59:59-03:00");
});

test("e-mail ao destino: assunto fixo, sem cópia em Enviados, só os dados do contato e o Id", async () => {
  const id = await idDoLead(LEAD.entrada_id);
  const p = montarEmailDestino(LEAD, id, "recebe@exemplo.test", FONTES);
  assert.equal(p.saveToSentItems, false);
  assert.equal(p.message.subject, "Novo contato");
  assert.deepEqual(p.message.toRecipients, [{ emailAddress: { address: "recebe@exemplo.test" } }]);
  assert.equal(p.message.body.contentType, "Text");
  assert.equal(
    p.message.body.content,
    [
      "Nome: Renata Fictícia Prado",
      "Telefone: +5511900000909",
      "E-mail: renata.ficticia@exemplo.test",
      "Produto: Marco Zero Prime",
      "Fonte: ZAP Imóveis",
      "Data: 07/11/2026 10:30",
      "Mensagem:",
      "Quero visitar o decorado no sábado.",
      "",
      `Id: ${id}`,
    ].join("\n"),
  );
  assert.deepEqual(Object.keys(p).sort(), ["message", "saveToSentItems"]);
  assert.deepEqual(Object.keys(p.message).sort(), ["body", "subject", "toRecipients"]);
});

test("POST da porta de entrada: cabeçalhos e corpo da especificação 1.0, dados só no corpo", async () => {
  const id = await idDoLead(LEAD.entrada_id);
  const { url, init } = montarPost(LEAD, id, { url: "https://receptor.exemplo.test/leads", chave: "c".repeat(40) }, new Date("2026-11-07T13:30:09Z"));
  assert.equal(url, "https://receptor.exemplo.test/leads");
  assert.equal(init.method, "POST");
  assert.equal(init.redirect, "manual", "3xx conta como erro");
  assert.deepEqual(init.headers, {
    "Content-Type": "application/json; charset=utf-8",
    Authorization: `Bearer ${"c".repeat(40)}`,
    "Idempotency-Key": id,
    "User-Agent": "entrada-leads/1.0",
  });
  assert.deepEqual(JSON.parse(init.body), {
    versao: "1.0",
    id,
    recebido_em: "2026-11-07T10:30:05-03:00",
    enviado_em: "2026-11-07T10:30:09-03:00",
    contato: { nome: "Renata Fictícia Prado", telefone: "+5511900000909", email: "renata.ficticia@exemplo.test", mensagem: "Quero visitar o decorado no sábado." },
    interesse: { produto: "Marco Zero Prime", produto_codigo: null, anuncio_codigo: null },
    origem: { fonte: "zap", campanha: null },
    consentimento: { aceito: null, texto: null },
  });
  // Fonte desconhecida vira "outra"; mensagem até 5.000 caracteres.
  const outro = JSON.parse(montarPost({ ...LEAD, fonte: null, mensagem: "x".repeat(6000) }, id, { url, chave: "k" }, new Date()).init.body);
  assert.equal(outro.origem.fonte, "outra");
  assert.equal(outro.contato.mensagem.length, 5000);
  assert.ok(!url.includes("Renata") && !url.includes("900000909"));
});

test("respostas da porta: 2xx e 409 entregam; 400/401/403/422 são configuração; o resto não entrega", () => {
  for (const s of [200, 201, 202, 409]) assert.equal(resultadoDoPost(s), "entregue", String(s));
  for (const s of [400, 401, 403, 422]) assert.equal(resultadoDoPost(s), "configuracao", String(s));
  for (const s of [301, 302, 404, 408, 429, 500, 503, "tempo", "rede"] as const) assert.equal(resultadoDoPost(s), "nao_entregue", String(s));
});

test("Vendas: a assinatura fechada, com o receivedDateTime e o id do catálogo", () => {
  assert.deepEqual(argsVendas(LEAD), {
    p_entrada_id: "<ficticio-1@exemplo.test>",
    p_recebido_em: "2026-11-07T13:30:05Z",
    p_nome: "Renata Fictícia Prado",
    p_telefone: "5511900000909",
    p_email: "renata.ficticia@exemplo.test",
    p_mensagem: "Quero visitar o decorado no sábado.",
    p_fonte: "zap",
    p_produto: "Marco Zero Prime",
    p_empreendimento_id: "e-prime",
    p_campanha: null,
  });
  assert.equal(argsVendas({ ...LEAD, produto_id: null, produto_nome: null }).p_empreendimento_id, null);
});

// ---------- A passada inteira, com tudo falso ----------

const VENDAS = { id: "d-vendas", tipo: "vendas" as const, modo: null, registrar_envios: false, limite_dia: null, ativo: true };
const POR_EMAIL = { id: "d-email", tipo: "externo" as const, modo: "email" as const, registrar_envios: false, limite_dia: null, ativo: true };
const PORTA = { id: "d-porta", tipo: "externo" as const, modo: "porta" as const, registrar_envios: true, limite_dia: 1, ativo: true };
const ENDERECOS: Record<string, Endereco> = {
  "d-email": { modo: "email", email: "destino.secreto@exemplo.test" },
  "d-porta": { modo: "porta", url: "https://porta.exemplo.test/entrada", chave: "chave-secreta-de-teste-0123456789" },
};
const regra = (id: string, fontes: string[], partes: Regra["partes"]): Regra => ({
  id, ativa: true, produtos: [], fontes, dias: [0, 1, 2, 3, 4, 5, 6], hora_inicio: "00:00", hora_fim: "00:00", partes,
});
const MOTOR: Motor = {
  ativo: true,
  vendas_id: "d-vendas",
  destinos: [VENDAS, POR_EMAIL, PORTA],
  regras: [
    regra("r-olx", ["olx"], [{ destino_id: "d-email", porcentagem: 100 }]),
    regra("r-zap", ["zap"], [{ destino_id: "d-porta", porcentagem: 100 }]),
  ],
  fontes: [
    { slug: "zap", nome: "ZAP Imóveis", remetentes: [], assunto_contem: [] },
    { slug: "olx", nome: "OLX", remetentes: [], assunto_contem: [] },
    { slug: "site", nome: "Site MBigucci", remetentes: [], assunto_contem: [] },
  ],
};

/** Clientes fictícios: nada deles pode aparecer nos logs. */
const CLIENTES = [
  { nome: "Otávio Fictício Ramos", tel: "(11) 90000-1111", tel_norm: "5511900001111", email: "otavio.ficticio@exemplo.test", msg: "Tem varanda gourmet?", de: "no-reply@olx.com.br" },
  { nome: "Sílvia Fictícia Moura", tel: "(11) 90000-2222", tel_norm: "5511900002222", email: "silvia.ficticia@exemplo.test", msg: "Qual o valor da entrada?", de: "no-reply@zapimoveis.com.br" },
  { nome: "Bruno Fictício Teles", tel: "(11) 90000-3333", tel_norm: "5511900003333", email: "bruno.ficticio@exemplo.test", msg: "Aceita permuta?", de: "no-reply@zapimoveis.com.br" },
  { nome: "Lúcia Fictícia Rocha", tel: "(11) 90000-4444", tel_norm: "5511900004444", email: "lucia.ficticia@exemplo.test", msg: "Quero agendar visita.", de: "wordpress@mbigucci.com.br" },
];
const mensagem = (c: (typeof CLIENTES)[number], i: number): MensagemGraph => ({
  id: `graph-${i}`,
  internetMessageId: `<ficticio-${i}@exemplo.test>`,
  subject: "Novo contato",
  from: { emailAddress: { address: c.de, name: "Portal" } },
  body: { contentType: "text", content: `Nome: ${c.nome}\nTelefone: ${c.tel}\nE-mail: ${c.email}\nMensagem: ${c.msg}` },
  receivedDateTime: `2026-11-07T13:3${i}:00Z`,
});

type Chamada = { nome: string; args?: unknown };
function falsos(opcoes: { modo?: "teste" | "producao"; post?: number | "tempo" | "rede"; vendasFalha?: boolean; apagarFalha?: boolean; emailFalha?: boolean; turnoOcupado?: boolean; motorFalha?: boolean } = {}) {
  const chamadas: Chamada[] = [];
  const logs: string[] = [];
  const apagadas: string[] = [];
  const emails: unknown[] = [];
  const posts: { url: string; body: string }[] = [];
  // O banco falso escolhe com a regra pura (a paridade com cfg_escolher está no teste do banco).
  const cont: Record<string, Contadores> = {};
  let totais: Record<string, number> = {};
  const d: Dependencias = {
    modo: opcoes.modo ?? "producao",
    agora: () => new Date("2026-11-07T13:40:00Z"),
    turno: () => "turno-1",
    catalogo: async () => [],
    log: (l) => logs.push(l),
    post: async (url, init) => (posts.push({ url, body: init.body }), opcoes.post ?? 201),
    graph: {
      listar: async () => CLIENTES.map(mensagem),
      apagar: async (id) => {
        if (opcoes.apagarFalha) throw new ErroDeChamada("graph_apagar", 503);
        apagadas.push(id);
      },
      enviarEmail: async (p) => {
        if (opcoes.emailFalha) throw new ErroDeChamada("graph_enviar", 500);
        emails.push(p);
      },
    },
    rpc: async <T,>(nome: string, args?: Record<string, unknown>): Promise<T> => {
      chamadas.push({ nome, args });
      switch (nome) {
        case "entrada_turno_pegar":
          return !opcoes.turnoOcupado as T;
        case "entrada_turno_devolver":
          return true as T;
        case "cfg_motor":
          if (opcoes.motorFalha) throw new ErroDeChamada("cfg_motor", 503);
          return MOTOR as T;
        case "cfg_escolher": {
          const r = MOTOR.regras.find((x) => x.id === args!.p_regra)!;
          const e = escolherNaRegra(MOTOR, r, cont[r.id] ?? {}, totais);
          const s = somar(e, cont[r.id] ?? {}, totais);
          cont[r.id] = s.contadores;
          totais = s.totaisDoDia;
          return { destino_id: e.destino_id, tipo: e.tipo, motivo: e.motivo } as T;
        }
        case "cfg_item_entrega":
          return (ENDERECOS[args!.p_id as string] ?? null) as T;
        case "lead_empresa_entrada":
          if (opcoes.vendasFalha) throw new ErroDeChamada("lead_empresa_entrada", 500);
          return [{ lead_id: "l-1", situacao: "criado" }] as T;
        default:
          return null as T;
      }
    },
  };
  return { d, chamadas, logs, apagadas, emails, posts, nomes: () => chamadas.map((c) => c.nome) };
}

test("produção: OLX por e-mail ao destino, ZAP pela porta até o limite, o resto no Vendas", async () => {
  const f = falsos();
  const r = await passada(f.d);
  assert.deepEqual(r, { ocupado: false, lidos: 4, vendas: 2, externos: 2, falhas: 0, erros: 0, teste: 0 });
  const codigos = f.logs.map((l) => l.split(" ").slice(3).join(" "));
  assert.deepEqual(codigos, ["externo:entregue", "externo:entregue", "vendas:limite:criado", "vendas:sem_regra:criado"]);
  // OLX: e-mail para o endereço do Vault, sem registro (chave desligada).
  assert.equal(f.emails.length, 1);
  assert.equal((f.emails[0] as { message: { toRecipients: { emailAddress: { address: string } }[] } }).message.toRecipients[0].emailAddress.address, "destino.secreto@exemplo.test");
  // ZAP: um POST (limite 1 por dia), com registro no Marketing.
  assert.equal(f.posts.length, 1);
  assert.equal(f.chamadas.filter((c) => c.nome === "mkt_registrar_envio").length, 1);
  assert.equal((f.chamadas.find((c) => c.nome === "mkt_registrar_envio")!.args as { p: { destino_id: string } }).p.destino_id, "d-porta");
  // Vendas: o limite e o sem regra, com o receivedDateTime.
  const vendas = f.chamadas.filter((c) => c.nome === "lead_empresa_entrada").map((c) => c.args as ReturnType<typeof argsVendas>);
  assert.deepEqual(vendas.map((v) => [v.p_nome, v.p_recebido_em, v.p_fonte]),
    [["Bruno Fictício Teles", "2026-11-07T13:32:00Z", "zap"], ["Lúcia Fictícia Rocha", "2026-11-07T13:33:00Z", "site"]]);
  assert.ok(!f.nomes().includes("cfg_desfazer"), "limite não desfaz");
  assert.deepEqual(f.apagadas, ["graph-0", "graph-1", "graph-2", "graph-3"]);
  // O turno: pego antes de tudo, devolvido no fim, com o mesmo dono.
  assert.deepEqual(f.chamadas[0], { nome: "entrada_turno_pegar", args: { p_dono: "turno-1" } });
  assert.deepEqual(f.chamadas.at(-1), { nome: "entrada_turno_devolver", args: { p_dono: "turno-1" } });
});

test("falha na porta: uma tentativa, desfaz o contador e vai para o Vendas na mesma passada", async () => {
  for (const [post, codigo] of [[503, "vendas:falha:criado"], ["tempo", "vendas:falha:criado"], [401, "vendas:falha_configuracao:criado"]] as const) {
    const f = falsos({ post });
    await passada(f.d);
    const zap = f.logs[1].split(" ").slice(3).join(" ");
    assert.equal(zap, codigo, String(post));
    assert.equal(f.posts.length, 1, "uma tentativa só");
    const desfez = f.chamadas.filter((c) => c.nome === "cfg_desfazer");
    assert.deepEqual(desfez.map((c) => c.args), [{ p_regra: "r-zap", p_item: "d-porta", p_quando: "2026-11-07T13:31:00Z" }]);
    assert.ok(!f.nomes().includes("mkt_registrar_envio"), "sem entrega, sem registro");
    // Desfeito o contador, o lead seguinte do ZAP volta a tentar a porta... e o limite não foi gasto.
    assert.equal(f.apagadas.length, 4);
  }
});

test("falha no e-mail ao destino também vai para o Vendas", async () => {
  const f = falsos({ emailFalha: true });
  await passada(f.d);
  assert.equal(f.logs[0].split(" ").slice(3).join(" "), "vendas:falha:criado");
  assert.ok(f.nomes().includes("cfg_desfazer"));
});

test("erro no Vendas: o e-mail fica na caixa para a próxima passada; erro ao apagar não para a passada", async () => {
  const f = falsos({ vendasFalha: true });
  const r = await passada(f.d);
  assert.deepEqual(f.apagadas, ["graph-0", "graph-1"], "só os entregues fora saem da caixa");
  assert.equal(r.erros, 2);
  assert.ok(f.logs[3].endsWith("erro:vendas:500:sem_regra"));
  const g = falsos({ apagarFalha: true });
  assert.equal((await passada(g.d)).lidos, 4);
});

test("modo de teste: decide e registra só o código; não entrega, não grava, não apaga nem marca como lido", async () => {
  const f = falsos({ modo: "teste" });
  const r = await passada(f.d);
  assert.deepEqual(r, { ocupado: false, lidos: 4, vendas: 0, externos: 0, falhas: 0, erros: 0, teste: 4 });
  assert.deepEqual(f.nomes(), ["entrada_turno_pegar", "cfg_motor", "entrada_turno_devolver"], "só lê a configuração");
  assert.deepEqual([f.emails.length, f.posts.length, f.apagadas.length], [0, 0, 0]);
  assert.ok(!("marcarLida" in f.d.graph), "a função nem tem como marcar como lido");
  assert.deepEqual(f.logs.map((l) => l.split(" ").slice(3).join(" ")),
    ["teste:externo:divisao", "teste:externo:divisao", "teste:externo:divisao", "teste:vendas:sem_regra"]);
});

test("turno: sem ele, a passada sai sem ler nada; com erro no meio, devolve mesmo assim", async () => {
  const f = falsos({ turnoOcupado: true });
  assert.deepEqual(await passada(f.d), { ocupado: true, lidos: 0, vendas: 0, externos: 0, falhas: 0, erros: 0, teste: 0 });
  assert.deepEqual(f.nomes(), ["entrada_turno_pegar"]);
  assert.match(f.logs[0], / - ocupado$/);
  const g = falsos({ motorFalha: true });
  await assert.rejects(passada(g.d), /cfg_motor:503/);
  assert.equal(g.nomes().at(-1), "entrada_turno_devolver");
});

test("logs: só id, hora e código; nenhum dado de cliente, endereço ou chave", async () => {
  const saidas: string[] = [];
  for (const op of [{}, { post: 503 as const }, { modo: "teste" as const }, { vendasFalha: true }, { emailFalha: true }]) {
    const f = falsos(op);
    await passada(f.d);
    saidas.push(...f.logs);
  }
  assert.ok(saidas.length >= 20);
  for (const l of saidas) assert.match(l, /^\[entrada-leads\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z ([0-9a-f-]{36}|-) [a-z_:0-9]+$/, l);
  const tudo = saidas.join("\n").toLowerCase();
  const proibidos = CLIENTES.flatMap((c) => [
    c.nome, ...c.nome.split(" "), c.tel, c.tel_norm, c.tel_norm.slice(4), c.email, c.email.split("@")[0], c.msg, c.de, c.de.split("@")[1],
  ]).concat([
    "destino.secreto", "porta.exemplo.test", "chave-secreta", "ficticio-", "exemplo.test", "graph-", "olx.com", "zapimoveis",
  ]);
  for (const p of proibidos) assert.ok(!tudo.includes(p.toLowerCase()), `o log tem "${p}"`);
});

// ---------- O index.ts gerado roda de verdade (Deno, Graph e banco falsos) ----------

test("index.ts gerado: roda com Deno falso e devolve só contagens", () => {
  const script = `
    const respostas = [];
    let handler;
    globalThis.Deno = { serve: (h) => (handler = h), env: { get: (k) => ({
      SUPABASE_URL: "https://banco.exemplo.test", SUPABASE_SERVICE_ROLE_KEY: "s", GRAPH_TENANT_ID: "t",
      GRAPH_CLIENT_ID: "c", GRAPH_CLIENT_SECRET: "x", CAIXA_ENTRADA: "caixa@exemplo.test", MODO: "teste" })[k] } };
    const motor = { ativo: false, vendas_id: "v", destinos: [], regras: [], fontes: [] };
    globalThis.fetch = async (url, init = {}) => {
      const u = String(url);
      const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
      if (u.endsWith("/rpc/entrada_segredo_ok")) return json(JSON.parse(init.body).p_segredo === "${"s".repeat(64)}");
      if (u.endsWith("/rpc/cfg_motor")) return json(motor);
      if (u.endsWith("/rpc/entrada_turno_pegar")) return json(true);
      if (u.endsWith("/rpc/entrada_turno_devolver")) return json(true);
      if (u.includes("/rest/v1/empreendimentos")) return json([]);
      if (u.includes("/oauth2/v2.0/token")) return json({ access_token: "tok" });
      if (u.includes("/mailFolders/inbox/messages")) return json({ value: [{ id: "g1", internetMessageId: "<m@x.test>", subject: "Oi",
        from: { emailAddress: { address: "a@olx.com.br" } }, body: { contentType: "text", content: "Nome: Teste Fictício" }, receivedDateTime: "2026-11-07T13:00:00Z" }] });
      if (u.includes("/messages/g1")) return new Response(null, { status: 200 });
      return json({}, 404);
    };
    const logs = [];
    console.log = (l) => logs.push(String(l));
    await import(${JSON.stringify(new URL("./index.ts", import.meta.url).href)});
    const chamar = async (segredo) => {
      const r = await handler(new Request("https://f.test", { method: "POST", headers: segredo ? { "x-entrada-segredo": segredo } : {} }));
      return { status: r.status, corpo: await r.json() };
    };
    process.stdout.write(JSON.stringify({ sem: await chamar(""), com: await chamar("${"s".repeat(64)}"), logs }));
  `;
  const r = spawnSync(process.execPath, ["--experimental-transform-types", "--no-warnings", "--input-type=module", "-e", script], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const saida = JSON.parse(r.stdout);
  assert.equal(saida.sem.status, 401);
  assert.deepEqual(saida.com, { status: 200, corpo: { ok: true, modo: "teste", ocupado: false, lidos: 1 } }, "a resposta (guardada pelo pg_net) só tem contagem");
  assert.equal(saida.logs.length, 1);
  assert.match(saida.logs[0], / teste:vendas:desligado:fonte_desconhecida$/);
  assert.ok(!saida.logs[0].includes("Fictício"));
});
