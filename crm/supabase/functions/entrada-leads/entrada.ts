// Edge Function "entrada-leads": lê os e-mails de lead da caixa de entrada
// (Microsoft Graph), decide pelas regras do direcionador e entrega.
// Regras em docs/direcionador/direcionador.md (seções 4, 7 e 11) e a porta de
// entrada em docs/direcionador/porta-de-entrada-leads.md.
//
// ESTE É O ARQUIVO-FONTE. O index.ts (o que vai para o Supabase) é gerado por
// gerar.mjs, juntando este arquivo com as cópias de marketing/src/lib
// (leitor de e-mail e regra pura). Não edite o index.ts à mão: edite aqui ou
// no marketing/ e rode `node supabase/functions/entrada-leads/gerar.mjs`.
//
// Quem chama: o agendador do banco (pg_cron, a cada minuto), com o cabeçalho
// x-entrada-segredo (o segredo fica no Vault e o banco confere), em
// supabase/agendar-entrada.sql.
//
// Secrets (Edge Functions > Secrets): GRAPH_TENANT_ID, GRAPH_CLIENT_ID,
// GRAPH_CLIENT_SECRET, CAIXA_ENTRADA (o endereço da caixa compartilhada) e
// MODO ("producao" para valer; qualquer outro valor, ou sem MODO, é "teste").
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY o Supabase já põe sozinho.
//
// Sigilo: nenhum nome de destino aqui. Os logs levam só o id do lead (um
// UUID tirado do id da mensagem), a hora e um código. Erros de chamada levam
// só o nome da chamada e o status HTTP, nunca o corpo da resposta.

import { acharRegra, depoisDaEntrega, escolherNaRegra, momentoSP, type Config, type Escolha, type Motivo } from "../../../../marketing/src/lib/direcionador.ts";
import { lerEmailDeLead, type EmailRecebido, type Fonte, type LeadDoEmail } from "../../../../marketing/src/lib/leitor-email.ts";
import type { Empreendimento } from "../../../../marketing/src/lib/catalogo.ts";

// ====================================================================
// Partes puras (testadas com node --test, sem rede)
// ====================================================================

/** O que cfg_motor devolve: a config da regra pura e as fontes com os padrões. */
export type Motor = Config & { fontes: Fonte[] };

/** Uma mensagem como a Graph lista. */
export type MensagemGraph = {
  id: string;
  internetMessageId: string;
  subject: string | null;
  from?: { emailAddress?: { address?: string; name?: string } } | null;
  body?: { contentType?: string; content?: string } | null;
  receivedDateTime: string;
};

/** O endereço guardado no Vault, como cfg_item_entrega devolve. */
export type Endereco = { modo: "email"; email: string } | { modo: "porta"; url: string; chave: string };

export function paraEmailRecebido(m: MensagemGraph): EmailRecebido {
  const de = m.from?.emailAddress;
  return {
    id: m.internetMessageId || m.id,
    de: de?.address ? `${de.name ?? ""} <${de.address}>` : "",
    assunto: m.subject ?? "",
    corpo: m.body?.content ?? "",
    corpo_tipo: (m.body?.contentType ?? "").toLowerCase() === "html" ? "html" : "text",
    recebido_em: m.receivedDateTime,
  };
}

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

/**
 * O id do lead (UUID) tirado do id da mensagem: o mesmo e-mail lido de novo dá
 * o mesmo id, e o receptor reconhece a repetição. Vai no POST, na linha "Id:"
 * do e-mail e nos logs (no lugar do id da mensagem, que pode ter o domínio de
 * quem mandou).
 */
export async function idDoLead(entradaId: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`entrada-leads:${entradaId}`)));
  h[6] = (h[6] & 0x0f) | 0x80; // versão 8 (formato livre)
  h[8] = (h[8] & 0x3f) | 0x80; // variante RFC 4122
  const s = hex(h.slice(0, 16));
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

const FORMATO_DATA_SP = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "05/11/2026 14:32", em São Paulo. */
export const dataSP = (iso: string) => FORMATO_DATA_SP.format(new Date(iso)).replace(",", "");

/** ISO 8601 com o fuso de São Paulo: "2026-11-05T14:32:10-03:00". */
export function isoSP(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const m = momentoSP(d);
  const [ano, mes, dia] = m.data.split("-").map(Number);
  const hora = Math.floor(m.minutos / 60);
  const seg = d.getUTCSeconds();
  // Offset de São Paulo naquele instante (hoje −03:00; sem horário de verão desde 2019).
  const offset = Math.round((Date.UTC(ano, mes - 1, dia, hora, m.minutos % 60, seg) - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  const dois = (n: number) => String(n).padStart(2, "0");
  const abs = Math.abs(offset);
  return `${m.data}T${dois(hora)}:${dois(m.minutos % 60)}:${dois(seg)}${offset < 0 ? "-" : "+"}${dois(Math.floor(abs / 60))}:${dois(abs % 60)}`;
}

const e164 = (tel: string | null) => (tel ? `+${tel}` : null);
const nomeDaFonte = (slug: string | null, fontes: Fonte[]) => (slug ? (fontes.find((f) => f.slug === slug)?.nome ?? slug) : "Não identificada");

/**
 * O e-mail ao destino: assunto fixo "Novo contato", sem cópia em Itens
 * Enviados, e no corpo só os dados do contato, o produto, a fonte, a data e o
 * Id. Nunca nome de regra, de destino ou qualquer coisa interna.
 */
export function montarEmailDestino(lead: LeadDoEmail, id: string, para: string, fontes: Fonte[]) {
  const linhas = [
    `Nome: ${lead.nome ?? ""}`,
    `Telefone: ${e164(lead.telefone) ?? ""}`,
    `E-mail: ${lead.email ?? ""}`,
    `Produto: ${lead.produto_nome ?? ""}`,
    `Fonte: ${nomeDaFonte(lead.fonte, fontes)}`,
    `Data: ${dataSP(lead.recebido_em)}`,
    "Mensagem:",
    lead.mensagem.slice(0, 5000),
    "",
    `Id: ${id}`,
  ];
  return {
    message: {
      subject: "Novo contato",
      body: { contentType: "Text", content: linhas.join("\n") },
      toRecipients: [{ emailAddress: { address: para } }],
    },
    saveToSentItems: false,
  };
}

const FONTES_DA_PORTA = new Set(["site", "zap", "vivareal", "olx", "imovelweb", "chavesnamao"]);

/** A chamada à porta de entrada (especificação 1.0). Os dados vão só no corpo. */
export function montarPost(lead: LeadDoEmail, id: string, end: { url: string; chave: string }, agora: Date) {
  const corpo = {
    versao: "1.0",
    id,
    recebido_em: isoSP(lead.recebido_em),
    enviado_em: isoSP(agora),
    contato: {
      nome: lead.nome ?? "",
      telefone: e164(lead.telefone),
      email: lead.email,
      mensagem: lead.mensagem.slice(0, 5000),
    },
    interesse: { produto: lead.produto_nome, produto_codigo: null, anuncio_codigo: null },
    origem: { fonte: lead.fonte && FONTES_DA_PORTA.has(lead.fonte) ? lead.fonte : "outra", campanha: null },
    consentimento: { aceito: null, texto: null },
  };
  return {
    url: end.url,
    init: {
      method: "POST",
      redirect: "manual" as const,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${end.chave}`,
        "Idempotency-Key": id,
        "User-Agent": "entrada-leads/1.0",
      },
      body: JSON.stringify(corpo),
    },
  };
}

/** Resposta da porta: 2xx e 409 entregam; 400, 401, 403 e 422 indicam configuração quebrada. */
export function resultadoDoPost(r: number | "tempo" | "rede"): "entregue" | "nao_entregue" | "configuracao" {
  if (typeof r !== "number") return "nao_entregue";
  if ((r >= 200 && r < 300) || r === 409) return "entregue";
  if ([400, 401, 403, 422].includes(r)) return "configuracao";
  return "nao_entregue";
}

/** Os argumentos de lead_empresa_entrada (Vendas). Nada diz que o lead passou por aqui. */
export const argsVendas = (lead: LeadDoEmail) => ({
  p_entrada_id: lead.entrada_id,
  p_recebido_em: lead.recebido_em,
  p_nome: lead.nome ?? "",
  p_telefone: lead.telefone,
  p_email: lead.email,
  p_mensagem: lead.mensagem,
  p_fonte: lead.fonte,
  p_produto: lead.produto_nome,
  p_empreendimento_id: lead.produto_id,
  p_campanha: null,
});

/** Os argumentos de mkt_registrar_envio (só destino com registro ligado). */
export const argsRegistro = (lead: LeadDoEmail, destinoId: string) => ({
  p: {
    destino_id: destinoId,
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    produto_id: lead.produto_id,
    fonte: lead.fonte,
    quando: lead.recebido_em,
    entrada_id: lead.entrada_id,
  },
});

/** Uma linha de log: só o id do lead, a hora e o código. */
export const linhaDeLog = (id: string, hora: Date, codigo: string) => `[entrada-leads] ${hora.toISOString()} ${id} ${codigo}`;

// ====================================================================
// A passada (as dependências entram de fora: os testes usam falsas)
// ====================================================================

/** Erro de chamada sem o corpo da resposta (que pode ter dado de cliente). */
export class ErroDeChamada extends Error {
  readonly chamada: string;
  readonly status: number | string;
  constructor(chamada: string, status: number | string) {
    super(`${chamada}:${status}`);
    this.chamada = chamada;
    this.status = status;
  }
}

export type Dependencias = {
  modo: "teste" | "producao";
  rpc: <T>(nome: string, args?: Record<string, unknown>) => Promise<T>;
  graph: {
    listar: () => Promise<MensagemGraph[]>;
    apagar: (id: string) => Promise<void>;
    enviarEmail: (payload: unknown) => Promise<void>;
  };
  /** Id desta passada, para o turno (crypto.randomUUID). */
  turno: () => string;
  /** POST com tempo de 10 s: o status, "tempo" (sem resposta) ou "rede" (falha de conexão). */
  post: (url: string, init: ReturnType<typeof montarPost>["init"]) => Promise<number | "tempo" | "rede">;
  catalogo: () => Promise<Empreendimento[]>;
  log: (linha: string) => void;
  agora: () => Date;
};

export type Resumo = { ocupado: boolean; lidos: number; vendas: number; externos: number; falhas: number; erros: number; teste: number };

/**
 * Uma passada: pega o turno (só uma passada por vez, para o mesmo lead nunca
 * ir para dois lugares), lê os não lidos, decide e entrega um por um, do mais
 * antigo ao mais novo, e devolve o turno. Sem o turno, sai sem fazer nada.
 */
export async function passada(d: Dependencias): Promise<Resumo> {
  const resumo: Resumo = { ocupado: false, lidos: 0, vendas: 0, externos: 0, falhas: 0, erros: 0, teste: 0 };
  const dono = d.turno();
  if (!(await d.rpc<boolean>("entrada_turno_pegar", { p_dono: dono }))) {
    d.log(linhaDeLog("-", d.agora(), "ocupado"));
    return { ...resumo, ocupado: true };
  }
  try {
    await lerEEntregar(d, resumo);
  } finally {
    // Se a devolução falhar, o turno vence sozinho (2 min).
    await d.rpc("entrada_turno_devolver", { p_dono: dono }).catch(() => {});
  }
  return resumo;
}

async function lerEEntregar(d: Dependencias, resumo: Resumo) {
  const motor = await d.rpc<Motor>("cfg_motor");
  const catalogo = await d.catalogo();
  const mensagens = [...(await d.graph.listar())].sort((a, b) => a.receivedDateTime.localeCompare(b.receivedDateTime));
  for (const m of mensagens) {
    resumo.lidos++;
    let id = "sem-id";
    try {
      const lead = lerEmailDeLead(paraEmailRecebido(m), motor.fontes, catalogo);
      id = await idDoLead(lead.entrada_id);
      const codigo = await processar(m.id, lead, id, motor, d);
      d.log(linhaDeLog(id, d.agora(), codigo));
      if (codigo.startsWith("teste:")) resumo.teste++;
      else if (codigo.startsWith("externo:")) resumo.externos++;
      else if (codigo.startsWith("vendas:")) resumo.vendas++;
      if (codigo.includes(":falha")) resumo.falhas++;
      if (codigo.includes("erro")) resumo.erros++;
    } catch (e) {
      resumo.erros++;
      d.log(linhaDeLog(id, d.agora(), `erro:${e instanceof ErroDeChamada ? e.message : "inesperado"}`));
    }
  }
}

/** Para onde vai e entrega. Devolve o código do log. */
async function processar(mensagemId: string, lead: LeadDoEmail, id: string, motor: Motor, d: Dependencias): Promise<string> {
  const { regra } = acharRegra(motor, lead, momentoSP(lead.recebido_em));

  if (d.modo !== "producao") {
    // Modo de teste: decide (sem somar contador) e registra só o código. Não
    // entrega, não grava, não apaga e não marca como lido: a caixa fica como
    // está, e o mesmo e-mail volta a aparecer no log a cada passada.
    const e = escolherNaRegra(motor, regra, {}, {});
    return `teste:${e.tipo}:${e.motivo}${lead.fonte ? "" : ":fonte_desconhecida"}`;
  }

  let escolha: Escolha;
  if (!motor.ativo || !regra) {
    escolha = escolherNaRegra(motor, regra, {}, {});
  } else {
    const r = await d.rpc<{ destino_id: string; tipo: "vendas" | "externo"; motivo: Motivo }>("cfg_escolher", {
      p_regra: regra.id,
      p_quando: lead.recebido_em,
    });
    escolha = { destino_id: r.destino_id, tipo: r.tipo, motivo: r.motivo, regra_id: regra.id, conta: r.motivo === "divisao" };
  }

  let motivoVendas: string = escolha.motivo;
  let extra = "";
  if (escolha.tipo === "externo") {
    const entrega = await entregar(lead, id, escolha.destino_id, motor, d);
    const final = depoisDaEntrega(motor, escolha, entrega === "entregue");
    if (final.desfazer && escolha.regra_id)
      await d.rpc("cfg_desfazer", { p_regra: escolha.regra_id, p_item: escolha.destino_id, p_quando: lead.recebido_em });
    if (final.tipo === "externo") {
      if (final.registrar) {
        try {
          await d.rpc("mkt_registrar_envio", argsRegistro(lead, escolha.destino_id));
        } catch {
          extra = ":erro_registro"; // entregue: segue e apaga, para não entregar de novo
        }
      }
      await apagar(mensagemId, d);
      return `externo:entregue${extra}`;
    }
    motivoVendas = entrega === "configuracao" ? "falha_configuracao" : "falha";
  }

  // Vendas. Erro aqui deixa o e-mail na caixa para a próxima passada.
  let situacao = "gravado";
  try {
    const linhas = await d.rpc<{ lead_id: string; situacao: string }[]>("lead_empresa_entrada", argsVendas(lead));
    situacao = linhas?.[0]?.situacao ?? situacao;
  } catch (e) {
    return `erro:vendas:${e instanceof ErroDeChamada ? e.status : "inesperado"}:${motivoVendas}`;
  }
  await apagar(mensagemId, d);
  return `vendas:${motivoVendas}:${situacao}`;
}

/** Uma tentativa só, pelo modo do destino. */
async function entregar(lead: LeadDoEmail, id: string, destinoId: string, motor: Motor, d: Dependencias): Promise<"entregue" | "nao_entregue" | "configuracao"> {
  if (!lead.telefone && !lead.email) return "nao_entregue"; // a porta exige um dos dois
  let end: Endereco | null;
  try {
    end = await d.rpc<Endereco | null>("cfg_item_entrega", { p_id: destinoId });
  } catch {
    return "nao_entregue";
  }
  if (!end) return "configuracao";
  if (end.modo === "email") {
    try {
      await d.graph.enviarEmail(montarEmailDestino(lead, id, end.email, motor.fontes));
      return "entregue";
    } catch {
      return "nao_entregue";
    }
  }
  const { url, init } = montarPost(lead, id, end, d.agora());
  return resultadoDoPost(await d.post(url, init));
}

async function apagar(mensagemId: string, d: Dependencias) {
  try {
    await d.graph.apagar(mensagemId);
  } catch {
    // Fica na caixa e volta na próxima passada: o Vendas é idempotente pelo
    // entrada_id e a porta pelo id. O contador conta de novo (desvio aceito).
  }
}

// ====================================================================
// Servidor (só roda no Supabase)
// ====================================================================

type Ambiente = { url: string; servico: string; tenant: string; cliente: string; segredo: string; caixa: string; modo: "teste" | "producao" };

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

function rpcDe(amb: Ambiente) {
  return async <T>(nome: string, args: Record<string, unknown> = {}): Promise<T> => {
    const r = await fetch(`${amb.url}/rest/v1/rpc/${nome}`, {
      method: "POST",
      headers: { apikey: amb.servico, Authorization: `Bearer ${amb.servico}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const texto = await r.text();
    if (!r.ok) throw new ErroDeChamada(nome, r.status);
    return (texto ? JSON.parse(texto) : null) as T;
  };
}

async function tokenGraph(amb: Ambiente): Promise<string> {
  const r = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(amb.tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: amb.cliente,
      client_secret: amb.segredo,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!r.ok) throw new ErroDeChamada("graph_token", r.status);
  return ((await r.json()) as { access_token: string }).access_token;
}

function graphDe(amb: Ambiente, token: string): Dependencias["graph"] {
  const base = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(amb.caixa)}`;
  const chamar = async (nome: string, caminho: string, init: RequestInit = {}) => {
    const r = await fetch(`${base}${caminho}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    if (!r.ok) throw new ErroDeChamada(nome, r.status);
    return r;
  };
  return {
    listar: async () => {
      const campos = "id,internetMessageId,subject,from,body,receivedDateTime";
      // Até 5 por passada: com 10 s de tempo na porta, uma passada leva menos
      // de 1 min e não se sobrepõe à seguinte (o agendador chama a cada minuto).
      const r = await chamar("graph_listar", `/mailFolders/inbox/messages?$filter=isRead eq false&$top=5&$select=${campos}`);
      return ((await r.json()) as { value: MensagemGraph[] }).value ?? [];
    },
    apagar: async (id) => void (await chamar("graph_apagar", `/messages/${encodeURIComponent(id)}/permanentDelete`, { method: "POST" })),
    enviarEmail: async (payload) => void (await chamar("graph_enviar", "/sendMail", { method: "POST", body: JSON.stringify(payload) })),
  };
}

async function postComTempo(url: string, init: ReturnType<typeof montarPost>["init"]): Promise<number | "tempo" | "rede"> {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    await r.body?.cancel().catch(() => {});
    return r.status;
  } catch (e) {
    return e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError") ? "tempo" : "rede";
  }
}

async function catalogoDe(amb: Ambiente): Promise<Empreendimento[]> {
  const r = await fetch(`${amb.url}/rest/v1/empreendimentos?select=id,nome,condominio,variacoes,pede_contexto,ativo,bairro,cidade,ordem`, {
    headers: { apikey: amb.servico, Authorization: `Bearer ${amb.servico}` },
  });
  if (!r.ok) throw new ErroDeChamada("catalogo", r.status);
  return (await r.json()) as Empreendimento[];
}

type DenoLike = { serve: (h: (req: Request) => Promise<Response>) => unknown; env: { get: (k: string) => string | undefined } };
const deno = (globalThis as { Deno?: DenoLike }).Deno;

if (deno?.serve) {
  deno.serve(async (req) => {
    if (req.method !== "POST") return resposta(405, { erro: "metodo" });
    const amb: Ambiente = {
      url: deno.env.get("SUPABASE_URL") ?? "",
      servico: deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      tenant: deno.env.get("GRAPH_TENANT_ID") ?? "",
      cliente: deno.env.get("GRAPH_CLIENT_ID") ?? "",
      segredo: deno.env.get("GRAPH_CLIENT_SECRET") ?? "",
      caixa: deno.env.get("CAIXA_ENTRADA") ?? "",
      modo: deno.env.get("MODO") === "producao" ? "producao" : "teste",
    };
    const rpc = rpcDe(amb);
    try {
      const segredo = req.headers.get("x-entrada-segredo") ?? "";
      if (!segredo || !(await rpc<boolean>("entrada_segredo_ok", { p_segredo: segredo }))) return resposta(401, { erro: "segredo" });
      if (!amb.tenant || !amb.cliente || !amb.segredo || !amb.caixa) return resposta(500, { erro: "faltam_secrets" });
      const token = await tokenGraph(amb);
      const resumo = await passada({
        modo: amb.modo,
        rpc,
        graph: graphDe(amb, token),
        post: postComTempo,
        catalogo: () => catalogoDe(amb),
        log: (linha) => console.log(linha),
        agora: () => new Date(),
        turno: () => crypto.randomUUID(),
      });
      // A resposta fica em net._http_response: só quantos foram lidos. O
      // detalhe (para onde foi cada um) fica só no log da função.
      return resposta(200, { ok: true, modo: amb.modo, ocupado: resumo.ocupado, lidos: resumo.lidos });
    } catch (e) {
      const codigo = e instanceof ErroDeChamada ? e.message : "inesperado";
      console.error(linhaDeLog("-", new Date(), `erro:${codigo}`));
      return resposta(500, { erro: codigo });
    }
  });
}
