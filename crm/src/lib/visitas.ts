// Visitas e agenda (puras, testadas com `node --test`). Adaptado de
// ref/CRM Bruna/src/components/agenda/ (steps.ts, week-agenda.tsx,
// visit-actions.tsx). Na MBigucci a baixa é auditável e as regras valem no
// banco (gatilho visitas_guard); aqui ficam só a ordem, os estados e os
// textos. Regras em docs/visitas.md.

import { fimDoDia } from "./leads.ts";

export type StatusVisita = "agendada" | "confirmada" | "realizada" | "nao_compareceu" | "cancelada";

export type Visita = {
  id: string;
  lead_id: string;
  corretor_id: string;
  empreendimento: string;
  inicio: string;
  local: string | null;
  status: StatusVisita;
  observacao: string | null;
  /** Quem deu a baixa (realizada ou não compareceu) e quando: carimbados pelo banco. */
  baixa_por: string | null;
  baixa_em: string | null;
  comprovante: string | null;
  created_at: string;
};
export const COLUNAS_VISITA =
  "id, lead_id, corretor_id, empreendimento, inicio, local, status, observacao, baixa_por, baixa_em, comprovante, created_at";

/** Abertas: ainda sem baixa nem cancelamento. */
export const STATUS_ABERTOS: StatusVisita[] = ["agendada", "confirmada"];
/** Com baixa ou cancelada: só mudam pela correção, com o motivo. */
export const STATUS_FINAIS: StatusVisita[] = ["realizada", "nao_compareceu", "cancelada"];
export const estaAberta = (v: Pick<Visita, "status">) => STATUS_ABERTOS.includes(v.status);

/** O que a tela mostra: a visita aberta cujo horário passou vira "aguardando baixa". */
export type EstadoVisita = StatusVisita | "aguardando_baixa";

type VisitaDoEstado = Pick<Visita, "status" | "inicio">;

export function estadoDaVisita(v: VisitaDoEstado, agora: Date): EstadoVisita {
  if (estaAberta(v) && new Date(v.inicio).getTime() <= agora.getTime()) return "aguardando_baixa";
  return v.status;
}

/** A baixa (realizada ou não compareceu) só depois do horário da visita, como no banco. */
export const podeDarBaixa = (v: VisitaDoEstado, agora: Date) => estadoDaVisita(v, agora) === "aguardando_baixa";

/** Remarcar, confirmar e cancelar: só a visita aberta. */
export const podeRemarcar = (v: Pick<Visita, "status">) => estaAberta(v);

/** Sinal + palavra + cor: o estado nunca depende só da cor. */
export const SELOS_VISITA: Record<EstadoVisita, { sinal: string; texto: string; cor: string }> = {
  agendada: { sinal: "→", texto: "Agendada", cor: "text-ink" },
  confirmada: { sinal: "✓", texto: "Confirmada", cor: "text-ink" },
  aguardando_baixa: { sinal: "!", texto: "Aguardando baixa", cor: "text-wa" },
  realizada: { sinal: "✓", texto: "Realizada", cor: "text-ok" },
  nao_compareceu: { sinal: "✕", texto: "Não compareceu", cor: "text-brand" },
  cancelada: { sinal: "✕", texto: "Cancelada", cor: "text-ink-soft" },
};
export const NOMES_STATUS: Record<StatusVisita, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  nao_compareceu: "Não compareceu",
  cancelada: "Cancelada",
};

const porInicio = <T extends VisitaDoEstado>(a: T, b: T) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime();

/**
 * Topo da lista do dia: as visitas de hoje que ainda vão acontecer, pelo
 * horário, e as que já passaram sem baixa (de hoje ou de antes), da mais
 * antiga para a mais nova. Canceladas e com baixa ficam fora.
 */
export function visitasDoDia<T extends VisitaDoEstado>(visitas: T[], agora: Date): { hoje: T[]; aguardandoBaixa: T[] } {
  const fim = fimDoDia(agora).getTime();
  const abertas = visitas.filter(estaAberta);
  return {
    hoje: abertas.filter((v) => estadoDaVisita(v, agora) !== "aguardando_baixa" && new Date(v.inicio).getTime() <= fim).sort(porInicio),
    aguardandoBaixa: abertas.filter((v) => estadoDaVisita(v, agora) === "aguardando_baixa").sort(porInicio),
  };
}

// ---------- Semana ----------

/** Segunda-feira 0h da semana de `ref` (semana de segunda a domingo, como no painel). */
export function inicioDaSemana(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ((ref.getDay() + 6) % 7));
}

const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export type DiaDaAgenda<T> = { dia: Date; visitas: T[]; total: number };

/**
 * Os 7 dias da semana que começa em `segunda`, com as visitas de cada dia pelo
 * horário (as canceladas no fim). O total do dia não conta as canceladas.
 */
export function agendaDaSemana<T extends VisitaDoEstado>(visitas: T[], segunda: Date): DiaDaAgenda<T>[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + i);
    const doDia = visitas
      .filter((v) => mesmoDia(new Date(v.inicio), dia))
      .sort((a, b) => Number(a.status === "cancelada") - Number(b.status === "cancelada") || porInicio(a, b));
    return { dia, visitas: doDia, total: doDia.filter((v) => v.status !== "cancelada").length };
  });
}

// ---------- Datas e textos ----------

const dd = (n: number) => String(n).padStart(2, "0");
const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** "10h" ou "10h30". */
export const horaCurta = (d: Date) => `${d.getHours()}h${d.getMinutes() ? dd(d.getMinutes()) : ""}`;

/**
 * Quando é a visita, para a mensagem ao cliente: "hoje, às 10h", "amanhã, às
 * 15h30", "na quinta-feira, 05/11, às 10h" ou "no sábado, 07/11, às 9h".
 */
export function quandoVisita(iso: string, agora: Date): string {
  const d = new Date(iso);
  const as = `às ${horaCurta(d)}`;
  const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  if (mesmoDia(d, agora)) return `hoje, ${as}`;
  if (mesmoDia(d, amanha)) return `amanhã, ${as}`;
  const dia = DIAS[d.getDay()];
  const artigo = d.getDay() === 0 || d.getDay() === 6 ? "no" : "na";
  return `${artigo} ${dia}, ${dd(d.getDate())}/${dd(d.getMonth() + 1)}, ${as}`;
}

/** A variável {visita} da mensagem "Confirmar visita": quando e, se houver, onde. */
export function textoDaVisita(v: Pick<Visita, "inicio" | "local">, agora: Date): string {
  const local = v.local?.trim();
  return local ? `${quandoVisita(v.inicio, agora)}, em ${local}` : quandoVisita(v.inicio, agora);
}

/** "Qui, 05/11, 10:00": a data da visita nas listas e no histórico. */
export function dataHoraVisita(iso: string): string {
  const d = new Date(iso);
  return `${DIAS_CURTOS[d.getDay()]}, ${dd(d.getDate())}/${dd(d.getMonth() + 1)}, ${dd(d.getHours())}:${dd(d.getMinutes())}`;
}

/** Horário sugerido ao agendar: amanhã às 10h, como na Bruna. */
export function sugerirHorarioVisita(agora: Date): Date {
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 10, 0);
}

/** Folga do banco para "agora" ao agendar e remarcar (visitas_guard). */
export const FOLGA_MINUTOS = 10;

/** Confere o agendamento antes de mandar ao banco (que confere de novo). */
export function erroAgendamento(d: { inicio: string | null; empreendimento: string }, agora: Date): string | null {
  if (!d.empreendimento.trim()) return "Escolha o empreendimento.";
  if (!d.inicio) return "Marque o dia e a hora da visita.";
  if (new Date(d.inicio).getTime() < agora.getTime() - FOLGA_MINUTOS * 60_000) return "Escolha um dia e hora a partir de agora.";
  return null;
}

/** Link do comprovante: vazio vale; senão precisa começar com http:// ou https://. */
export const comprovanteValido = (s: string) => !s.trim() || /^https?:\/\/\S+$/i.test(s.trim());

// ---------- Painel ----------

export type NumerosVisita = {
  /** Visitas marcadas para o período (a data da visita), menos as canceladas. */
  agendadas: number;
  realizadas: number;
  naoCompareceu: number;
  /** Marcadas para o período, já passaram e estão sem baixa. */
  aguardandoBaixa: number;
};
export const visitasZeradas = (): NumerosVisita => ({ agendadas: 0, realizadas: 0, naoCompareceu: 0, aguardandoBaixa: 0 });

/** Números de visitas por corretor, pela data da visita dentro de [ini, fim). */
export function contarVisitas(
  visitas: Pick<Visita, "corretor_id" | "status" | "inicio">[],
  p: { ini: Date; fim: Date },
  agora: Date,
): Map<string, NumerosVisita> {
  const r = new Map<string, NumerosVisita>();
  for (const v of visitas) {
    const t = new Date(v.inicio).getTime();
    if (t < p.ini.getTime() || t >= p.fim.getTime() || v.status === "cancelada") continue;
    const n = r.get(v.corretor_id) ?? visitasZeradas();
    n.agendadas++;
    if (v.status === "realizada") n.realizadas++;
    else if (v.status === "nao_compareceu") n.naoCompareceu++;
    else if (estadoDaVisita(v, agora) === "aguardando_baixa") n.aguardandoBaixa++;
    r.set(v.corretor_id, n);
  }
  return r;
}

export function somarVisitas(xs: NumerosVisita[]): NumerosVisita {
  return xs.reduce(
    (s, x) => ({
      agendadas: s.agendadas + x.agendadas,
      realizadas: s.realizadas + x.realizadas,
      naoCompareceu: s.naoCompareceu + x.naoCompareceu,
      aguardandoBaixa: s.aguardandoBaixa + x.aguardandoBaixa,
    }),
    visitasZeradas(),
  );
}

// ---------- Histórico ----------

/**
 * Texto do evento de visita no histórico da ficha: "Visita agendada: Marco Zero
 * One · Qui, 05/11, 10:00", "Visita corrigida: Realizada → Não compareceu.
 * Motivo: …", "Visita remarcada: Qui, 05/11, 10:00 → Sex, 06/11, 15:00".
 */
export function descreverEventoVisita(
  e: { tipo: string; de: string | null; para: string | null; detalhe: string | null },
  v: Pick<Visita, "empreendimento" | "inicio"> | undefined,
): string {
  const qual = v ? `: ${v.empreendimento} · ${dataHoraVisita(v.inicio)}` : "";
  if (e.tipo === "visita_horario")
    return `Visita remarcada: ${e.de ? dataHoraVisita(e.de) : "–"} → ${e.para ? dataHoraVisita(e.para) : "–"}`;
  if (e.tipo === "visita_comprovante") return e.para ? "Comprovante da visita anexado" : "Comprovante da visita removido";
  const de = e.de as StatusVisita | null;
  const para = e.para as StatusVisita;
  if (e.detalhe && de) return `Visita corrigida: ${NOMES_STATUS[de] ?? de} → ${NOMES_STATUS[para] ?? para}. Motivo: ${e.detalhe}`;
  switch (para) {
    case "agendada":
      return de === "confirmada" ? `Visita aguardando nova confirmação${qual}` : `Visita agendada${qual}`;
    case "confirmada":
      return `Visita confirmada${qual}`;
    case "realizada":
      return `✓ Visita realizada${qual}`;
    case "nao_compareceu":
      return `✕ Não compareceu à visita${qual}`;
    case "cancelada":
      return `Visita cancelada${qual}`;
    default:
      return `Visita${qual}`;
  }
}
