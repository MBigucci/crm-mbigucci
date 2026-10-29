// Prazo de 15 min para o primeiro contato (puro, testado com `node --test`).
// Adaptado do CRM da Bruna (ref/CRM Bruna/src/lib/performance.ts, slaDeadline e
// businessMinutes; lib/followup.ts, rótulos). Na MBigucci o prazo vale só para
// o lead da empresa (vem do gerente) em "novo" e termina na primeira conversa,
// que tira o lead de "novo". Conta só no horário de atendimento, na hora do
// aparelho (São Paulo).
// Regras em docs/leads.md.

import type { Lead } from "./leads";

/** Dias (0 = domingo … 6 = sábado) e a janela "HH:MM"–"HH:MM". Fica na tabela horario_atendimento. */
export type HorarioAtendimento = { dias: number[]; inicio: string; fim: string };

/** O plantão MBigucci: 9h às 19h, todos os dias (há plantão no fim de semana). */
export const HORARIO_PADRAO: HorarioAtendimento = { dias: [0, 1, 2, 3, 4, 5, 6], inicio: "09:00", fim: "19:00" };
export const PRAZO_MINUTOS = 15;

const MIN = 60_000;

/** "09:00" ou "09:00:00" (como o Postgres devolve o time) → minutos do dia. */
export function minutosDoDia(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Horário sem dia nenhum ou com o fim antes do início não vale: o prazo corre direto. */
export const horarioValido = (h: HorarioAtendimento) =>
  h.dias.length > 0 && minutosDoDia(h.inicio) < minutosDoDia(h.fim);

const naHora = (d: Date, minutos: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setMinutes(minutos);
  return x;
};
const diaSeguinte = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

export function estaAberto(t: Date, h: HorarioAtendimento = HORARIO_PADRAO): boolean {
  if (!horarioValido(h)) return true;
  const m = t.getHours() * 60 + t.getMinutes();
  return h.dias.includes(t.getDay()) && m >= minutosDoDia(h.inicio) && m < minutosDoDia(h.fim);
}

/**
 * Fim do prazo: `minutos` de horário de atendimento depois da chegada.
 * Com atendimento das 9h às 19h, o lead que chega às 22h vence às 9h15 do dia seguinte.
 */
export function fimDoPrazo(chegada: Date, h: HorarioAtendimento = HORARIO_PADRAO, minutos = PRAZO_MINUTOS): Date {
  if (!horarioValido(h)) return new Date(chegada.getTime() + minutos * MIN);
  const abre = minutosDoDia(h.inicio);
  const fecha = minutosDoDia(h.fim);
  let resta = minutos;
  let t = new Date(chegada);
  for (let i = 0; i < 14; i++) {
    const fechaEm = naHora(t, fecha);
    if (h.dias.includes(t.getDay()) && t < fechaEm) {
      const abreEm = naHora(t, abre);
      const de = t < abreEm ? abreEm : t;
      const livre = (fechaEm.getTime() - de.getTime()) / MIN;
      if (livre >= resta) return new Date(de.getTime() + resta * MIN);
      resta -= livre;
    }
    t = diaSeguinte(t);
  }
  return new Date(chegada.getTime() + minutos * MIN);
}

/** Minutos de horário de atendimento entre dois instantes. */
export function minutosUteis(de: Date, ate: Date, h: HorarioAtendimento = HORARIO_PADRAO): number {
  if (ate <= de) return 0;
  if (!horarioValido(h)) return (ate.getTime() - de.getTime()) / MIN;
  const abre = minutosDoDia(h.inicio);
  const fecha = minutosDoDia(h.fim);
  let total = 0;
  let t = new Date(de);
  for (let i = 0; i < 400 && t < ate; i++) {
    if (h.dias.includes(t.getDay())) {
      const a = Math.max(t.getTime(), naHora(t, abre).getTime());
      const b = Math.min(ate.getTime(), naHora(t, fecha).getTime());
      if (b > a) total += (b - a) / MIN;
    }
    t = diaSeguinte(t);
  }
  return total;
}

/**
 * Só o lead que vem do gerente (origem "empresa") tem prazo. O lead que o
 * corretor cadastra ele mesmo segue o próximo contato que ele marcar.
 */
export const ORIGEM_COM_PRAZO = "empresa";

type LeadPrazo = Pick<Lead, "status" | "etapa" | "created_at"> & Partial<Pick<Lead, "atribuido_em" | "origem">>;

/** Lead da empresa, ativo e em "novo": espera o primeiro contato. */
export const aguardaPrimeiroContato = (l: LeadPrazo) =>
  l.status === "ativo" && l.etapa === "novo" && l.origem === ORIGEM_COM_PRAZO;

/** O prazo conta do cadastro ou, se o gerente reatribuiu depois, da atribuição. */
export function inicioDoPrazo(l: Pick<LeadPrazo, "created_at" | "atribuido_em">): Date {
  const c = new Date(l.created_at).getTime();
  const a = l.atribuido_em ? new Date(l.atribuido_em).getTime() : 0;
  return new Date(Math.max(c, a));
}

export type Prazo = {
  estado: "no_prazo" | "estourado";
  /** Quando o prazo vence. */
  fim: Date;
  /** No prazo: minutos até vencer. Estourado: minutos desde que venceu. */
  minutos: number;
  /** No prazo: true se já está correndo; false se só começa na próxima abertura. */
  correndo: boolean;
};

/** Prazo do lead da empresa que espera o primeiro contato, ou null. */
export function prazoDoLead(l: LeadPrazo, agora: Date, h: HorarioAtendimento = HORARIO_PADRAO): Prazo | null {
  if (!aguardaPrimeiroContato(l)) return null;
  const inicio = inicioDoPrazo(l);
  const fim = fimDoPrazo(inicio, h);
  if (agora.getTime() > fim.getTime()) {
    return { estado: "estourado", fim, minutos: Math.max(1, Math.round((agora.getTime() - fim.getTime()) / MIN)), correndo: true };
  }
  // Correndo: faltam no máximo 15 min (contando do cadastro, se o relógio do aparelho estiver atrasado).
  const desde = Math.max(agora.getTime(), inicio.getTime());
  const correndo = fim.getTime() - desde <= PRAZO_MINUTOS * MIN;
  return { estado: "no_prazo", fim, minutos: Math.max(0, Math.ceil((fim.getTime() - agora.getTime()) / MIN)), correndo };
}

/** "12 min", "1h20", "5h", "3 dias". */
export function duracao(minutos: number): string {
  const m = Math.max(1, Math.round(minutos));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}h${String(m % 60).padStart(2, "0")}` : `${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 dia" : `${d} dias`;
}

/** "9h15" ou "9h". */
const relogio = (d: Date) => (d.getMinutes() ? `${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}` : `${d.getHours()}h`);
const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Quando vence um prazo que cai mais adiante: "9h15", "amanhã, 9h15", "segunda, 9h15". */
export function quandoVence(fim: Date, agora: Date): string {
  const dias = Math.round((inicioDoDia(fim).getTime() - inicioDoDia(agora).getTime()) / 86_400_000);
  if (dias <= 0) return relogio(fim);
  if (dias === 1) return `amanhã, ${relogio(fim)}`;
  return `${SEMANA[fim.getDay()]}, ${relogio(fim)}`;
}

export type SeloPrazo = { sinal: string; texto: string; nivel: "correndo" | "aguardando" | "estourado" };

/**
 * "! Responder em 12 min" (âmbar), "→ Responder até amanhã, 9h15" (quando o lead
 * chegou fora do horário) ou "! Prazo estourado há 40 min" (vermelho).
 */
export function seloPrazo(p: Prazo, agora: Date): SeloPrazo {
  if (p.estado === "estourado") return { sinal: "!", texto: `Prazo estourado há ${duracao(p.minutos)}`, nivel: "estourado" };
  if (p.correndo) {
    return { sinal: "!", texto: `Responder em ${Math.min(PRAZO_MINUTOS, Math.max(1, p.minutos))} min`, nivel: "correndo" };
  }
  return { sinal: "→", texto: `Responder até ${quandoVence(p.fim, agora)}`, nivel: "aguardando" };
}
