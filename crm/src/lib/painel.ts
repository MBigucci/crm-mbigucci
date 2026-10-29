// Painel da equipe: números por corretor num dia, semana ou mês, calculados
// do histórico automático (lead_eventos). Funções puras, testadas com
// `node --test`. Adaptado do conversionReport da Bruna (ref/CRM Bruna/src/lib/
// performance.ts), sem campanha, verba, pontos nem ranking (sigilo).
// Regras em docs/painel.md.

import type { Evento, MotivoDescarte } from "./leads.ts";

// ---------- Período ----------

export type TipoPeriodo = "dia" | "semana" | "mes";
export const TIPOS_PERIODO: { slug: TipoPeriodo; nome: string }[] = [
  { slug: "dia", nome: "Dia" },
  { slug: "semana", nome: "Semana" },
  { slug: "mes", nome: "Mês" },
];

/** [ini, fim): o fim é o início do período seguinte. Na hora do aparelho (São Paulo). */
export type Periodo = { tipo: TipoPeriodo; ini: Date; fim: Date };

/** O dia, a semana (segunda a domingo) ou o mês que contém `ref`. */
export function periodo(tipo: TipoPeriodo, ref: Date): Periodo {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (tipo === "dia") return { tipo, ini: d, fim: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) };
  if (tipo === "semana") {
    const ini = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    return { tipo, ini, fim: new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 7) };
  }
  return { tipo, ini: new Date(d.getFullYear(), d.getMonth(), 1), fim: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
}

/** O período anterior (-1) ou o seguinte (+1). */
export function deslocar(p: Periodo, passos: number): Periodo {
  const { ini } = p;
  if (p.tipo === "dia") return periodo("dia", new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + passos));
  if (p.tipo === "semana") return periodo("semana", new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 7 * passos));
  return periodo("mes", new Date(ini.getFullYear(), ini.getMonth() + passos, 1));
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const dd = (n: number) => String(n).padStart(2, "0");
const dataCurta = (d: Date) => `${dd(d.getDate())}/${dd(d.getMonth() + 1)}`;
const dataLonga = (d: Date) => `${dataCurta(d)}/${d.getFullYear()}`;

/** "Quinta, 29/10/2026", "26/10 a 01/11/2026" ou "Outubro de 2026". */
export function rotuloPeriodo(p: Periodo): string {
  if (p.tipo === "dia") {
    const s = SEMANA[p.ini.getDay()];
    return `${s[0].toUpperCase()}${s.slice(1)}, ${dataLonga(p.ini)}`;
  }
  if (p.tipo === "semana") {
    const ultimo = new Date(p.fim.getFullYear(), p.fim.getMonth(), p.fim.getDate() - 1);
    return `${dataCurta(p.ini)} a ${dataLonga(ultimo)}`;
  }
  const m = MESES[p.ini.getMonth()];
  return `${m[0].toUpperCase()}${m.slice(1)} de ${p.ini.getFullYear()}`;
}

/** "2026-10-29": a data no endereço da página. */
export const dataIso = (d: Date) => `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
export function deDataIso(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

// ---------- Números ----------

/** O que o painel precisa do lead (só as colunas lidas). */
export type LeadPainel = {
  id: string;
  nome: string;
  dono_id: string;
  origem: string;
  etapa: string;
  status: string;
  motivo_descarte: MotivoDescarte | null;
  empreendimento: string | null;
};
export const COLUNAS_LEAD_PAINEL = "id, nome, dono_id, origem, etapa, status, motivo_descarte, empreendimento";

/** Linha de leads_perdidos (função do banco): o corretor que perdeu e quem recebeu. */
export type Perdido = {
  lead_id: string;
  nome: string;
  corretor_id: string;
  recebeu_id: string;
  criado_em: string;
  /** Quando quem perdeu tinha recebido o lead. O corretor não vê mais o histórico do lead que perdeu. */
  recebido_em: string | null;
};

/** As etapas do funil até a venda. "Aguardando lançamento" conta como em contato. */
export const FUNIL = ["em_contato", "visita_agendada", "visita_realizada", "proposta", "venda"] as const;
export type EtapaFunil = (typeof FUNIL)[number];
const ALCANCE: Record<string, number> = {
  novo: 0,
  em_contato: 1,
  aguardando_lancamento: 1,
  visita_agendada: 2,
  visita_realizada: 3,
  proposta: 4,
  venda: 5,
};

/** Cada número guarda os ids dos leads, para abrir a lista. */
export type NumerosCorretor = {
  corretor: string;
  /** Leads da empresa que ele recebeu no período (cadastro do gerente ou reatribuição). */
  recebidosEmpresa: string[];
  /** Leads da empresa que ele perdeu no período (botão do gerente). */
  perdidos: string[];
  /** Leads que ele mesmo cadastrou no período, por origem. */
  cadastrados: string[];
  cadastradosPorOrigem: Record<string, string[]>;
  /** Descartados no período, por motivo (o último status do lead no período). */
  descartados: string[];
  descartadosPorMotivo: Partial<Record<MotivoDescarte, string[]>>;
  /** Funil: leads que entraram na carteira no período e até onde chegaram com ele, até hoje. */
  entraram: string[];
  funil: Record<EtapaFunil, string[]>;
  /** Leads que chegaram a "venda" no período, qualquer que seja a data de entrada. */
  vendas: string[];
};

export type ChaveNumero = "recebidosEmpresa" | "perdidos" | "cadastrados" | "descartados" | "entraram" | "vendas";

function vazio(corretor: string): NumerosCorretor {
  return {
    corretor,
    recebidosEmpresa: [],
    perdidos: [],
    cadastrados: [],
    cadastradosPorOrigem: {},
    descartados: [],
    descartadosPorMotivo: {},
    entraram: [],
    funil: { em_contato: [], visita_agendada: [], visita_realizada: [], proposta: [], venda: [] },
    vendas: [],
  };
}

const junta = (xs: string[], id: string) => {
  if (!xs.includes(id)) xs.push(id);
};
const quando = (e: { criado_em: string }) => new Date(e.criado_em).getTime();

/**
 * Números por corretor no período.
 * - `eventos`: lead_eventos de `p.ini` até agora (todos os tipos), dos leads que a pessoa vê.
 * - `leads`: os leads citados nos eventos.
 * - `perdidos`: a função leads_perdidos do período.
 * O corretor de cada número é quem tinha o lead no momento: o "para" do cadastro
 * ou da troca de dono e, nas mudanças de etapa e status, o autor (só o dono muda).
 */
export function montarPainel(
  eventos: Evento[],
  leads: Map<string, LeadPainel>,
  perdidos: Perdido[],
  p: Periodo,
): Map<string, NumerosCorretor> {
  const ini = p.ini.getTime();
  const fim = p.fim.getTime();
  const no = (e: Evento) => quando(e) >= ini && quando(e) < fim;
  const r = new Map<string, NumerosCorretor>();
  const de = (corretor: string) => {
    let x = r.get(corretor);
    if (!x) r.set(corretor, (x = vazio(corretor)));
    return x;
  };
  const ordenados = [...eventos].sort((a, b) => quando(a) - quando(b));
  const porLead = new Map<string, Evento[]>();
  for (const e of ordenados) {
    const xs = porLead.get(e.lead_id) ?? [];
    xs.push(e);
    porLead.set(e.lead_id, xs);
  }

  for (const [leadId, evs] of porLead) {
    const lead = leads.get(leadId);
    const daEmpresa = lead?.origem === "empresa";

    // Entradas na carteira: cadastro ou troca de dono, no período.
    for (const e of evs) {
      if (!no(e) || !e.para || (e.tipo !== "criado" && e.tipo !== "dono")) continue;
      const x = de(e.para);
      if (daEmpresa) junta(x.recebidosEmpresa, leadId);
      if (e.tipo === "criado" && e.autor_id === e.para && !daEmpresa) {
        junta(x.cadastrados, leadId);
        const origem = lead?.origem ?? "outros";
        junta((x.cadastradosPorOrigem[origem] ??= []), leadId);
      }
      if (!x.entraram.includes(leadId)) {
        x.entraram.push(leadId);
        const alcance = alcanceCom(evs, e, lead);
        FUNIL.forEach((etapa, i) => {
          if (alcance >= i + 1) x.funil[etapa].push(leadId);
        });
      }
    }

    // Descarte: vale o último status do lead no período.
    const status = evs.filter((e) => e.tipo === "status" && no(e)).at(-1);
    if (status?.para === "descartado") {
      const dono = status.autor_id ?? lead?.dono_id;
      if (dono) {
        const x = de(dono);
        junta(x.descartados, leadId);
        const motivo = (status.detalhe ?? "sem_retorno") as MotivoDescarte;
        junta((x.descartadosPorMotivo[motivo] ??= []), leadId);
      }
    }

    // Venda: a última etapa do lead no período é "venda".
    const etapa = evs.filter((e) => e.tipo === "etapa" && no(e)).at(-1);
    if (etapa?.para === "venda") {
      const dono = etapa.autor_id ?? lead?.dono_id;
      if (dono) junta(de(dono).vendas, leadId);
    }
  }

  // O lead perdido já é de outro: para o corretor que perdeu, o RLS esconde os
  // eventos dele. A função do banco diz quando ele tinha recebido o lead.
  for (const x of perdidos) {
    const c = de(x.corretor_id);
    junta(c.perdidos, x.lead_id);
    const t = x.recebido_em ? new Date(x.recebido_em).getTime() : NaN;
    if (t >= ini && t < fim) {
      junta(c.recebidosEmpresa, x.lead_id);
      junta(c.entraram, x.lead_id);
    }
  }
  return r;
}

/**
 * Até onde o lead chegou na carteira de quem o recebeu em `entrada`: a maior
 * etapa entre a entrada e a saída (a próxima troca de dono). Conta a etapa em
 * que ele já estava e, se ainda é do mesmo corretor, a etapa de hoje.
 */
function alcanceCom(evs: Evento[], entrada: Evento, lead: LeadPainel | undefined): number {
  const t0 = quando(entrada);
  const saida = evs.find((e) => e.tipo === "dono" && quando(e) > t0 && e.de === entrada.para);
  const t1 = saida ? quando(saida) : Infinity;
  const etapas = evs.filter((e) => e.tipo === "etapa" && quando(e) >= t0 && quando(e) < t1);
  let alcance = 0;
  const conta = (slug: string | null | undefined) => {
    alcance = Math.max(alcance, ALCANCE[slug ?? ""] ?? 0);
  };
  if (etapas.length) conta(etapas[0].de);
  for (const e of etapas) conta(e.para);
  if (!saida && lead && lead.dono_id === entrada.para) conta(lead.etapa);
  return alcance;
}

/** Soma da equipe: a união dos leads de cada número. */
export function somar(linhas: NumerosCorretor[]): NumerosCorretor {
  const t = vazio("");
  for (const x of linhas) {
    for (const k of ["recebidosEmpresa", "perdidos", "cadastrados", "descartados", "entraram", "vendas"] as const)
      x[k].forEach((id) => junta(t[k], id));
    for (const e of FUNIL) x.funil[e].forEach((id) => junta(t.funil[e], id));
    for (const [o, ids] of Object.entries(x.cadastradosPorOrigem)) ids.forEach((id) => junta((t.cadastradosPorOrigem[o] ??= []), id));
    for (const [m, ids] of Object.entries(x.descartadosPorMotivo))
      ids.forEach((id) => junta((t.descartadosPorMotivo[m as MotivoDescarte] ??= []), id));
  }
  return t;
}

/** "60%" ou "–": quanto de `base` chegou a `parte`. */
export function taxa(parte: number, base: number): string {
  if (!base) return "–";
  return `${Math.round((parte / base) * 100)}%`;
}
